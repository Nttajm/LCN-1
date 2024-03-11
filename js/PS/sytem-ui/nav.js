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

        let minutes = Math.floor(elapsedTime / (1000 * 60));
        let seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);

        // Add leading zeros if necessary
        let formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
        let formattedSeconds = seconds < 10 ? '0' + seconds : seconds;

        timerElement.textContent = formattedMinutes + ':' + formattedSeconds;
    }

    // Update the timer every second
    setInterval(updateTimer, 1000);
};
