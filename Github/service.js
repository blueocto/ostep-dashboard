/* **********************************************************
// OSTEP Dashboard Github API
// service.cpp
// Date Created: 2018/09/22
// Author: Yiran Zhu, Lewis Kim and Josue Quilon Barrios
// Email: yzhu132@myseneca.ca
// Description: Github API that gets all the sorted recent 
// commits from an organization/user
********************************************************** */

const r = require('request');

const { key } = require('../config-files/github-token');
const { repos: whitelist } = require('../config-files/github-whitelist');
const cdotUrl = 'https://api.github.com';
const request = r.defaults({
  headers: { 'User-Agent': 'request' },
  baseUrl: cdotUrl,
  qs: { per_page: 100, access_token: key },
});

const today = new Date();
const day = 24 * 60 * 60 * 1000;

module.exports.getRepos = recency => {
  return new Promise((resolve, reject) => {
    request.get(
      {
        url: '/orgs/Seneca-CDOT/repos',
      },
      (err, res, data) => {
        if (res.statusCode !== 200) {
          console.log('Error:', res.statusMessage);
          reject(res.Error);
        } else {
          const reposNames = JSON.parse(data)
            .filter(rep => {
              return (whitelist.includes(rep.name) && today - new Date(rep.pushed_at) < recency);
            })
            .map(repo => {
              return {
                name: repo.name,
                language: repo.language,
              };
            });
          resolve(reposNames);
        }
      },
    );
  });
};

const getCommits = branch => {
  return new Promise((resolve, reject) => {
    request.get(
      {
        url: `/repos/Seneca-CDOT/${branch.repo}/commits`,
        qs: { sha: `${branch.br.sha}` },
      },
      (err, res, data) => {
        if (res.statusCode !== 200) {
          console.log('Error:', res.statusMessage);
          reject(new Error('Unable to get commits.'));
        } else {
          const commitsPerBranch = JSON.parse(data)
            .filter(singleCommit => {
              const {
                commit: { author },
              } = singleCommit;
              return today - new Date(author.date) < day;
            })
            .map(singleCommit => {
              const {
                commit: { author },
              } = singleCommit;
              const time = new Date(author.date);
              return {
                author: {
                  name: author.name,
                  date: time.toLocaleString('en-US', {
                    timeZone: 'America/Toronto',
                  }),
                },
                message: singleCommit.commit.message,
                repoName: branch.repo,
                branchName: branch.br.name,
              };
            });
          resolve(commitsPerBranch);
        }
      },
    );
  });
};

const getBranches = repo => {
  return new Promise((resolve, reject) => {
    request.get(
      {
        url: `/repos/Seneca-CDOT/${repo.name}/branches`,
      },
      (err, res, data) => {
        if (res.statusCode !== 200) {
          console.log('Error:', res.statusMessage);
          reject(new Error('Unable to get branches.'));
        } else {
          const listOfBranches = {
            repo: repo.name,
            branches: [],
          };
          listOfBranches.branches = JSON.parse(data).map(branch => {
            return {
              name: branch.name,
              sha: branch.commit.sha,
            };
          });
          resolve(listOfBranches);
        }
      },
    );
  });
};

module.exports.getAllCommitsTogether = branches => {
  return new Promise((resolve, reject) => {
    let promises = branches.map(branch => {
      return getBranches(branch);
    });
    Promise.all(promises)
      .then(branchesPerRepo => {
        promises = [];
        branchesPerRepo.forEach(rep => {
          rep.branches.forEach(branch => {
            promises.push(getCommits({ repo: rep.repo, br: branch }));
          });
        });
        Promise.all(promises)
          .then(arraysOfCommits => {
            const arrayToSendBack = arraysOfCommits.flat();
            arrayToSendBack.sort((firstCommit, secondCommit) => {
              return (
                new Date(secondCommit.author.date) -
                new Date(firstCommit.author.date)
              );
            });
            resolve(arrayToSendBack);
          })
          .catch(err => {
            console.log(err);
            reject(err);
          });
      })
      .catch(err => {
        console.log(`Error: ${err}`);
        reject(err);
      });
  });
};

const getIssuesFromRepo = repo => {
  return new Promise((resolve, reject) => {
    request.get(
      {
        url: `/repos/Seneca-CDOT/${repo.name}/issues`,
      },
      (err, res, data) => {
        if (res.statusCode !== 200) {
          console.log('Error:', res.statusMessage);
          reject(new Error('Unable to get repos.'));
        } else {
          const filteredIssues = JSON.parse(data).map(issue => {
            let assigs = [];

            helpWantedRegExp = /help( |-)?wanted/i;
            hasHelpWanted = (label) => {
              return helpWantedRegExp.test(label.name);
            }

            if (issue.labels.some(hasHelpWanted)) {
              if (issue.assignees.length !== 0) {
                assigs = issue.assignees.map(assignee => {
                  return {
                    name: assignee.login,
                    avatar: assignee.avatar_url,
                  };
                });
              }
              const labelsInIssue = issue.labels.map(label => label.name);
  
              return {
                ra: issue.user.login,
                repository: issue.repository_url.slice(
                  issue.repository_url.lastIndexOf('/') + 1,
                  issue.repository_url.length,
                ),
                number: issue.number,
                title: issue.title,
                description: issue.body,
                language: repo.language,
                labels: labelsInIssue,
                state: issue.state,
                assignees: assigs,
                milestone: issue.milestone,
                created: new Date(issue.created_at).toLocaleString('en-US', {
                  timeZone: 'America/Toronto',
                }),
                updated: new Date(issue.updated_at).toLocaleString('en-US', {
                  timeZone: 'America/Toronto',
                }),
              };
  
            }
          });
          resolve(filteredIssues.filter(issue => (issue !== undefined && issue !== null)));
        }
      },
    );
  });
};

module.exports.getIssues = repos => {
  return new Promise((resolve, reject) => {
    const promises = repos.map(repo => {
      return getIssuesFromRepo(repo);
    });
    Promise.all(promises)
      .then(arraysOfIssues => {
        const issues = arraysOfIssues.flat();
        issues.sort((firstItem, secondItem) => {
          return new Date(secondItem.created) - new Date(firstItem.created);
        });
        resolve(issues);
      })
      .catch(err => {
        console.log(err);
        reject(err);
      });
  });
};

const getPullRequestsPerRepo = repo => {
  let pullRequestData = {};
  const pullRequestsPerBranch = [];
  return new Promise((resolve, reject) => {
    request.get(
      {
        url: `/repos/Seneca-CDOT/${repo}/pulls`,
      },
      (err, res, data) => {
        if (res.statusCode !== 200) {
          console.log('Error:', res.statusMessage);
          reject(new Error('Unable to get pull requests.'));
        } else {
          JSON.parse(data).forEach(pullRequest => {
            pullRequestData = {
              title: pullRequest.title,
              author: {
                name: pullRequest.user.login,
                avatar: pullRequest.user.avatar_url,
              },
              created: new Date(pullRequest.created_at).toLocaleString(
                'en-US',
                {
                  timeZone: 'America/Toronto',
                },
              ),
              reviewers: pullRequest.requested_reviewers.map(reviewer => {
                return {
                  name: reviewer.login,
                  avatar: reviewer.avatar_url,
                };
              }),
              description: pullRequest.body,
              repoName: repo,
              url: pullRequest.html_url,
              labels: pullRequest.labels.map(label => {
                return {
                  name: label.name,
                  color: label.color,
                };
              }),
              number: pullRequest.number,
            };
            priorityRegEx = /priority/i;
            hasPriority = (label) => {
              return priorityRegEx.test(label.name);
            }

            if (!pullRequestData.labels.some(hasPriority))
              pullRequestData.labels.push({name: "priority: medium", color: "e4fc5a"})

            pullRequestsPerBranch.push(pullRequestData);
          });
          resolve(pullRequestsPerBranch);
        }
      },
    );
  });
};

module.exports.getAllPullRequests = repos => {
  return new Promise((resolve, reject) => {
    const promises = [];
    repos.forEach(repo => {
      promises.push(getPullRequestsPerRepo(repo.name));
    });
    Promise.all(promises)
      .then(arraysOfPullRequests => {
        const pullRequests = arraysOfPullRequests.flat();
        pullRequests.sort((firstItem, secondItem) => {
          return new Date(secondItem.created) - new Date(firstItem.created);
        });
        resolve(pullRequests);
      })
      .catch(err => {
        console.log(err);
        reject(err);
      });
  });
};
