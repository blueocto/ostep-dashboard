/***********************************************************
// OSTEP Dashboard Github API
// service.cpp
// Date Created: 2018/09/22
// Author: Yiran Zhu, Lewis Kim and Josue Quilon Barrios
// Email: yzhu132@myseneca.ca
// Description: Github API that gets all the sorted recent 
// commits from an organization/user
***********************************************************/


var request = require("request");
var key = process.env.GITHUB_TOKEN;
var repoUrl = 'https://api.github.com/orgs/Seneca-CDOT/repos?per_page=100&access_token=' + key;
console.log(key);
let branchUrls = []
let recentCommits = [];

let today = new Date();
const recency = 24 * 60 * 60 * 1000;

module.exports.getRepos = () => {
    repoUrls = [];
    branchUrls = [];
    recentCommits = [];

    return new Promise((resolve, reject) => {
        request.get({
            url: repoUrl,
            headers: { 'User-Agent': 'request' },
        }, (err, res, data) => {
            if (err) {
                console.log('Error:', err);
                reject("Unable to get repos.");
            } else {
                let reposX = JSON.parse(data);
                reposX.forEach(repo => {
                    if (new Date(today - new Date(repo.pushed_at)) < new Date(recency)) {
                        branchUrls.push({
                            'name': repo.name,
                            'url': repo.branches_url.slice(0, repo.branches_url.length - 9) + '?per_page=100&access_token=' + key
                        });
                    }
                });
                resolve();
            }
        });
    });
}

const getCommits = (commitObject) => {
    return new Promise((resolve, reject) => {
        request.get({
            url: 'https://api.github.com/repos/Seneca-CDOT/' + commitObject.repo + '/commits?sha=' + commitObject.br.sha + '&per_page=100&access_token=' + key,
            headers: { 'User-Agent': 'request' },
        }, (err, res, data) => {
            if (err) {
                console.log('Error:', err);
                reject(err);
            } else {
                JSON.parse(data).forEach(singleCommit => {
                    if (new Date(today - new Date(singleCommit.commit.author.date)) < new Date(recency)) {
                        // To make it work with Dashboard/src/components/Github.js
                        const time = new Date(singleCommit.commit.author.date);
                        singleCommit.author.date = time.toLocaleString("en-US", {timeZone : "America/Toronto"});
                        singleCommit.author.name = singleCommit.commit.author.name;
                        singleCommit.message = singleCommit.commit.message;
                        singleCommit.repoName = commitObject.repo;
                        singleCommit.branchName = commitObject.br.name;
                        recentCommits.push(singleCommit);
                    }
                });
                resolve();
            }
        });
    });
};

const getBranches = (branchObject) => {
    return new Promise((resolve, reject) => {
        request.get({
            url: branchObject.url,
            headers: { 'User-Agent': 'request' },
        }, (err, res, data) => {
            if (err) {
                console.log('Error:', err);
                reject(err);
            } else {
                let listOfBranches = {
                    repo: branchObject.name,
                    branches: []
                };
                JSON.parse(data).forEach(singleBranch => {
                    singleBranch.repo = branchObject.name;
                    listOfBranches.branches.push({name: singleBranch.name, sha: singleBranch.commit.sha});
                });
                resolve(listOfBranches);
            }
        });
    });
};

module.exports.getAllCommitsTogether = () => {
    return new Promise((resolve, reject) => {
        let promises = [];
        branchUrls.forEach((branchUrl) => {
            promises.push(getBranches(branchUrl));
        });
        Promise.all(promises)
            .then((branchesPerRepo) => {
                promises = [];
                branchesPerRepo.forEach(rep =>{
                    rep.branches.forEach(branch =>{
                        promises.push(getCommits({repo: rep.repo, br: branch}));
                    });
                });
                Promise.all(promises)
                .then(()=>{
                    recentCommits.sort((a, b) => {
                        let c = new Date(a.commit.author.date);
                        let d = new Date(b.commit.author.date);
                        return d - c;
                    });
                    resolve(recentCommits);
    
                }).catch((err)=>{
                    console.log(err);
                    reject(err);
                });
            })
            .catch((err) => {
                console.log(`Error: ${err}`);
                reject(err);
            });
    });
};
