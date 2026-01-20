import {userData} from '../Powershell.js'; 
import { sessionId } from '../sessionid.js';
import { serverId } from '../systeminfo/serlist.js';
import { currentServer } from '../Powershell.js';


const outputUsername = document.getElementById('username');
const outputsessionid = document.getElementById('session');

 if (!userData.name) {
    outputUsername.innerHTML = 'not set';
 } else {
    outputUsername.innerHTML = userData.name;
    outputsessionid.innerHTML = sessionId;
 }

 window.onload = function() {
    const serverName = document.getElementById('serverName')
    serverName.innerHTML = currentServer;
    let startTime = new Date().getTime();
    let timerElement = document.getElementById('timer');

    function updateTimer() {
      let currentTime = new Date().getTime();
      let elapsedTime = currentTime - startTime;

      let days = Math.floor(elapsedTime / (1000 * 60 * 60 * 24));
      let hours = Math.floor((elapsedTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      let minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
      let seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);

      let timeString = '';
      if (days > 0) {
          timeString += days + (days === 1 ? ' day ' : ' days ');
      }
      if (hours > 0) {
          timeString += hours + (hours === 1 ? ' hour ' : ' hours ');
      }
      if (minutes < 10) {
          timeString += '0';
      }
      timeString += minutes + ':';
      if (seconds < 10) {
          timeString += '0';
      }
      timeString += seconds;

      timerElement.textContent = timeString;
    }

    // Update the timer every second
    setInterval(updateTimer, 1000);
};

window.onload = function() {
    let startTime = new Date().getTime();
    let timerElement = document.getElementById('timer');

    function updateTimer() {
        let currentTime = new Date().getTime();
        let elapsedTime = currentTime - startTime;

        let days = Math.floor(elapsedTime / (1000 * 60 * 60 * 24));
        let hours = Math.floor((elapsedTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);

        let timeString = '';
        if (days > 0) {
            timeString += days + (days === 1 ? ' day ' : ' days ');
        }
        if (hours > 0) {
            timeString += hours + (hours === 1 ? ' hour ' : ' hours ');
        }
        if (minutes < 10) {
            timeString += '0';
        }
        timeString += minutes + ':';
        if (seconds < 10) {
            timeString += '0';
        }
        timeString += seconds;

        timerElement.textContent = timeString;
    }

    setInterval(updateTimer, 1000);
};
