import React from 'react';
import refresh from './assets/refresh.svg';
import bulbOn from './assets/bulb-on.svg';
import bulbOff from './assets/bulb-off.svg';
import github from './assets/github.svg';
import slack from './assets/Slack_Mark.svg';
import outlet from './assets/outlet.svg';
import clock from './assets/clock.svg';
import user from './assets/user.svg';
import calendar from './assets/calendar.svg';
import clipboard from './assets/clipboard.svg';
import home from './assets/home.svg';
import Service from '../Service.js';
import endpoints from '../config.js';
const service = new Service();

class Panel extends React.Component {
  constructor(props) {
    super(props);
    this.formatGithub = this.formatGithub.bind(this);
    this.formatOutput = this.formatOutput.bind(this);
    this.refreshData = this.refreshData.bind(this);
    this.state = {
      data: null,
    }
  }

  componentWillMount() {
    if (endpoints[this.props.title]) {
      this.fetchData();
    }

    setInterval(() => { this.fetchData(); }, 30 * 1000);
  }

  sortDates() {
    let tempData = this.state.data;

    tempData.rows.sort(function (a, b) {
      a = new Date(a["Date and time"]);
      b = new Date(b["Date and time"]);
      return a < b ? -1 : a > b ? 1 : 0;
    });

    return tempData;
  }

  fetchData() {
    service.getData(this.props.title, (data) => {
      this.setState({ data });
    });
  }

  refreshData() {
    this.setState({ data: null });
    this.fetchData();
  }

  formatOutput(panelType) {

    console.log("data is: ", this.props.title, this.state.data);
    switch (panelType) {
      case "github":
        return this.formatGithub();
      case "infrastructure":
        return this.formatInfrastructure();
      case "presentations":
        return this.formatPresentations();
      case "eods":
        return this.formatEOD();
      case "lamp":
        return this.formatLamp();
      case "db1042":
        const sortedData = this.sortDates();
        return this.formatDB1042(sortedData);
      default:
        throw new Error(`${panelType} is not a valid panel type!`);
    }
  }

  formatGithub() {

    const parseDate = (date) => `${new Date(date).getHours()}:${new Date(date).getMinutes()}`;

    return (
      this.state.data.map((commit, i) => (
        <div key={commit + i} className="github-entry">
          <img className="github-icon" src={github} alt="Github icon" />
          <span className="github-name">{commit.author.name}</span> committed to
          <span className="github-repo"> {commit.repoName}</span> at {parseDate(commit.author.date)}
          <p className="github-message">{commit.message}</p>
        </div>
      ))
    );
  }

  formatInfrastructure() {
    const servers = this.state.data.Servers;
    const workstations = this.state.data.Workstations

    return (
      <div>
        <h3>Workstations</h3>
        <div>
          {workstations.map((server, i) => (
            <div
              key={i}
              className="ip-entry"
            >
              <img className="ip-icon" src={outlet} alt={"IP icon"} />
              <span className="ip-name"> {server.IPAddress} </span>
              is <span className={server.Status === "alive" ? "ip-up" : "ip-down"}>{server.Status}</span>
            </div>
          ))}
        </div>
        <h3>Servers</h3>
        <div>
          {servers.map((server, i) => (
            <div
              key={i}
              className="ip-entry"
            >
              <img className="ip-icon" src={outlet} alt={"IP icon"} />
              <span className="ip-name"> {server.domain} </span>
              value is <span className="ip-up">{server.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  formatEOD() {
    const { data } = this.state;
    let currentEods = {}
    let oldEods = {}

    Object.keys(data).forEach((username) => {
      if (new Date(data[username].time).toDateString() === new Date().toDateString()) {
        currentEods[username] = data[username]
      } else {
        oldEods[username] = data[username]
      }
    });

    return (
      <div>
        {Object.keys(currentEods).length !== 0 && <h3>Today's EODs</h3>}
        {Object.keys(currentEods).map((username) => (
          <div className="github-entry" key={username}>
            <span></span>
            <img className="slack-icon" src={slack} alt={"Slack icon"} />
            <span className="github-name">{username}</span> posted EOD in channel
            <span className="github-repo"> {currentEods[username].channel}</span>:
            <p>{currentEods[username].text}</p>
          </div>
        ))}
        {Object.keys(oldEods).length !== 0 && <h3>Past EODs</h3>}
        {Object.keys(oldEods).map((username) => (
          <div className="github-entry">
            <span></span>
            <img className="slack-icon" src={slack} alt={"Slack icon"} />
            <span className="github-name">{username}</span> posted EOD in channel
              <span className="github-repo"> {oldEods[username].channel}</span>:
              <p>{oldEods[username].text}</p>
          </div>
        ))}
      </div>
    );
  }

  formatLamp() {
    const status = this.state.data.onCampus ? "on" : "off";
    const message = status === "on" ?
      "Chris Tyler is on campus!" : "DB 1036 is dark and full of terrors";
    return (
      <div className="lamp-container">
        <img className="bulb-off" src={status === "on" ? bulbOn : bulbOff} alt={"bulb icon"} />
        <div className="lamp-message">{message}</div>
      </div>
    );
  }

  formatDB1042(sortedData) {
    return (
      <div>
        {!!sortedData && <div>No Meetings Found for Today.</div>}

        {
          !!sortedData.rows.length && sortedData.rows.map((row, i) => (
            <div key={row + i} className="github-entry meeting">
              <span className="meeting-time">
                <img className="meeting-icons" src={clock} alt={"meeting time icon"} />{row["Date and time"].split(' ')[1]}
              </span>
              <span className="meeting-topic">
                <img className="meeting-icons" src={clipboard} alt={"meeting topic icon"} />{row["Purpose"]}
              </span>
              <span className="meeting-organizer">
                <img className="meeting-icons" src={user} alt={"organizer icon"} />{row["Contact person"]}
              </span>
            </div>
          ))
        }

      </div>
    );
  }

  formatPresentations() {
    return (
      this.state.data.rows.map((row, i) => (
        <div key={row + i} className="github-entry">
          {new Date(row.Date) > Date.now() &&
            <div className="presenter-row">
              <span className="github-name presenter-section"><img className="meeting-icons" src={user} alt={"presenter icon"} /> {row.Presenter}</span>
              <span className="github-repo presenter-section"><img className="meeting-icons" src={clipboard} alt={"presentation topic icon"} />  {row.Topic}</span>
              <span className="github-repo presenter-section"> <img className="meeting-icons" src={calendar} alt={"presentation date icon"} />  {row.Date}</span>
              <span className="github-repo presenter-section"> <img className="meeting-icons" src={clock} alt={"presentation time icon"} />  {row.Time}</span>
              {/* <img className="meeting-icons" src={home} /> <span className="github-repo"> {row.Room}</span> */}
            </div>
          }
        </div>
      ))
    );
  }

  loadSpinner() {
    return (
      <div className="spinner-container">
        <div className="lds-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      </div>
    );
  }

  render() {
    return (
      <div className="panel-body">
        <div className="panel-title">
          <h3>
            {this.props.title.toUpperCase()}
          </h3>
          <div className="refresh-container" onClick={this.refreshData}>
            <img className="refresh" src={refresh} alt={"refresh icon"} />
          </div>
        </div>
        <div className="panel-content">
          {(this.state.data && this.formatOutput(this.props.title)) || this.loadSpinner()}
        </div>
      </div>
    );
  }
}

export default Panel;