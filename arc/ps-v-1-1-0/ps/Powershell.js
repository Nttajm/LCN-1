const inputElement = document.getElementById("input");
const outputElement = document.getElementById("output");

let timexInterval;
let timerInterval;

let stopwatchInterval;
let stopwatchSeconds = 0;

const commandHistory = [];
let lastCommandIndex = -1;
const responseHistory = [];
let logEntries = [];

const rN = Math.random();

const element = document.getElementById('js-get-powerShell'); // let main know that file is active
element.textContent = 'pass.200';
element.classList.add('stat');

export let userData = {}; // Object to store user configuration data


console.log('200.pass')

const availableCommands = {
    "time": "Display the current time",
    "calc": "Perform basic arithmetic calculations",
    "help": "Display a list of available commands and their descriptions",
    "bk": "Execute the last command",
    "rec": "Execute the last response",
    "timex": "Display the current date and time with live seconds",
    "lcn": "Visit lcnjoel.com",
    "reset": "Clear the session and start over",
    "rand": "Generate a random number between the specified range (e.g., 'rand(x-y)'",
    "timer": "Start a timer (e.g., 'timer(01:00:23)')",
    "timeu": "Interactively view the time in different time zones and regions",
    "timeus": "Show time zones in the United States",
    "flip coin": "Flip a coin and output 'heads' or 'tails'",
    "config log": "Configure logging options",
    "show log": "Display the current user configuration data and log entries",
    "log": "Save a log entry",
    "run js/": "Run JavaScript code and display the output",
    "system-ready": "system status",
    "change-theme": "Change the background color of the page",
    "stwatch": "Start a stop watch",
};

const timeZones = [
    { id: "gmt", name: "Greenwich Mean Time (GMT)", offset: 0 },
    { id: "pst", name: "Pacific Standard Time (PST)", offset: -8 },
    { id: "mst", name: "Mountain Standard Time (MST)", offset: -7 },
    { id: "cst", name: "Central Standard Time (CST)", offset: -6 },
    { id: "est", name: "Eastern Standard Time (EST)", offset: -5 },
    { id: "aest", name: "Australian Eastern Standard Time (AEST)", offset: 10 },
];

const usTimeZones = [
    { id: "et", name: "Eastern Time (ET)", offset: -5 },
    { id: "ct", name: "Central Time (CT)", offset: -6 },
    { id: "mt", name: "Mountain Time (MT)", offset: -7 },
    { id: "pt", name: "Pacific Time (PT)", offset: -8 },
    { id: "akst", name: "Alaska Standard Time (AKST)", offset: -9 },
    { id: "hst", name: "Hawaii-Aleutian Standard Time (HST)", offset: -10 },
];

// Load user data from localStorage
const loadUserData = () => {
    const storedData = localStorage.getItem("userData");
    if (storedData) {
        userData = JSON.parse(storedData);
    }

    const savedTheme = userData.theme;
    if (savedTheme) {
        document.body.style.backgroundColor = savedTheme;
    }

    const savedLog = localStorage.getItem("logEntries");
    if (savedLog) {
        logEntries = JSON.parse(savedLog);
    }
};



// Save user data to localStorage
function saveUserData() {
    localStorage.setItem("userData", JSON.stringify(userData));
    localStorage.setItem("logEntries", JSON.stringify(logEntries));
}

// Load user data on page load
loadUserData();
// imports 
import { systemInfo, cred } from './systeminfo/systeminfo.js';
import { network } from './netstat.js';
import { sessionId } from './sessionid.js';
import { serverId } from './systeminfo/serlist.js';
import { psCmsJarg } from './commands/jarg.js';
// exports, execept for user data lol.
export let currentServer = serverId.CA1;
// games
function compMHT() {
    let comp = '';
    if (rN > 0.5) {
        comp = 'heads'
    } else {
        comp = 'tails'
    }

    return comp;
}

export function validFun(rNvalue, validTrue, validFalse) {
    let validation
    if (rN > rNvalue) {
         validation = `<span class="g">${validTrue}</span>`
    } else {
        validation = `<span class="r">${validFalse}</span>`
    }

    return validation;
}

const headsTails = compMHT();


inputElement.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        const fullCommand = inputElement.value;
        inputElement.value = "";

        // v number -- dev-php devs!
        let variable = 'i(0)';
        let variableDefiner = '';
        const ioName = 'PS-DBnM';
        // v number -- dev-php devs!

        if (variable === 'i(0)') {
            variableDefiner = 'intial';
        } else {
            variableDefiner = 'not-set';
        }

        function delay(phrase, time) {
            setTimeout(() => {
                outputElement.innerHTML += `<div>${phrase}</div>`;
            }, time);
        }

        function delaySpan(phrase, time) {
            setTimeout(() => {
                outputElement.innerHTML += `<span>${phrase}</span>`;
            }, time);
        }


        function validFun2(rNvalue, validTrue, validFalse) {
            let validation
            if (rN < rNvalue) {
                 validation = `<span class="g">${validTrue}</span>`
            } else {
                validation = `<span class="r">${validFalse}</span>`
            }

            return validation;
        }

        // light up variables 
        let valid = validFun2(0.3, 'valid', 'not valid');
        let validBias = validFun(0.6, 'valid', 'not valid');
        let valid2 = validFun2(0.2, 'working', 'temporarily not valid')
        let validOnline = validFun(0.1, 'Online', 'error')


        const commands = fullCommand.split(")(");

        commands.forEach((command, index) => {
            if (!command.trim()) return;

            if (timexInterval) {
                clearInterval(timexInterval);
            }

            if (timerInterval) {
                clearInterval(timerInterval);
            }

            if (stopwatchInterval) {
                clearInterval(stopwatchInterval);
                stopwatchInterval = null;
            }

            if (command.toLowerCase() === "dis log") {
                userData = {};
                logEntries.length = 0;
                saveUserData();
                response = "Log and all saved data cleared.";
                outputElement.innerHTML = "system-reset, true!"; // Clear the output
                return;
            }

            let response;

            if (command.toLowerCase() === "hello") {
                response = userData.name
                    ? `Hello, ${userData.name}!`
                    : `Hello! This is the DB&M PowerShell. For help, simply type 'help' or <a href="projects/wiki/index.html" class="uh">see references</a>.`;
            } else if (command.toLowerCase() === "time") {
                const currentTime = new Date();
                const hours = currentTime.getHours().toString().padStart(2, "0");
                const minutes = currentTime.getMinutes().toString().padStart(2, "0");
                const meridian = currentTime.getHours() >= 12 ? "pm" : "am";
                response = `${hours}:${minutes}${meridian}`;
            } else if (command.toLowerCase() === "timex") {
                const updateTimex = () => {
                    const currentTime = new Date();
                    const hours = currentTime.getHours().toString().padStart(2, "0");
                    const minutes = currentTime.getMinutes().toString().padStart(2, "0");
                    const seconds = currentTime.getSeconds().toString().padStart(2, "0");
                    const day = currentTime.getDate().toString().padStart(2, "0");
                    const month = (currentTime.getMonth() + 1).toString().padStart(2, "0");
                    const year = currentTime.getFullYear();
                    response = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                    outputElement.lastChild.textContent = response;
                };

                updateTimex();
                timexInterval = setInterval(updateTimex, 1000);
            } else if (command.toLowerCase().startsWith("calc")) {
                const expression = command.substring(5).trim();
                try {
                    response = eval(expression);
                } catch (error) {
                    response = "Error: " + error.message;
                }
            } else if (command.toLowerCase() === "lcn") {
                window.location.href = "https://lcnjoel.com";
            } else if (command.toLowerCase() === "help") {
                response = "Available Commands:";
                for (const cmd in availableCommands) {
                    response += `<br> ${cmd} - ${availableCommands[cmd]}`;
                }
            } else if (command.toLowerCase() === "bk") {
                if (lastCommandIndex >= 0) {
                    command = commandHistory[lastCommandIndex];
                } else {
                    response = "No previous command";
                }
            } else if (command.toLowerCase() === "rec") {
                if (responseHistory.length > 0) {
                    command = responseHistory[responseHistory.length - 1];
                } else {
                    response = "No previous response";
                }
            } else if (command.toLowerCase() === "reset") {
                outputElement.innerHTML = "";
                commandHistory.length = 0;
                lastCommandIndex = -1;
                responseHistory.length = 0;
                response = "Session has been reset.";
            } else if (command.toLowerCase() === "test") {
                outputElement.innerHTML = "hi";
            } else if (command.toLowerCase().startsWith("rand")) {
                const match = command.match(/\((\d+)-(\d+)\)/);
                if (match) {
                    const min = parseInt(match[1]);
                    const max = parseInt(match[2]);
                    response = `Random number between ${min} and ${max}: ${Math.floor(
                        Math.random() * (max - min + 1)
                    ) + min}`;
                } else {
                    response = "Invalid 'rand' command format. Use 'rand(x-y)' to specify the range.";
                }
            } else if (command.toLowerCase().startsWith("timer")) {
                const match = command.match(/\((\d{2}:\d{2}:\d{2})\)/);
                if (match) {
                    const timeString = match[1];
                    const [hours, minutes, seconds] = timeString.split(":").map(Number);
                    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                    let remainingSeconds = totalSeconds;
                    const updateTimer = () => {
                        const displayHours = String(Math.floor(remainingSeconds / 3600)).padStart(2, "0");
                        const displayMinutes = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, "0");
                        const displaySeconds = String(remainingSeconds % 60).padStart(2, "0");
                        response = `Timer: ${displayHours}:${displayMinutes}:${displaySeconds}`;
                        outputElement.lastChild.textContent = response;
                        if (remainingSeconds <= 0) {
                            clearInterval(timerInterval);
                        } else {
                            remainingSeconds--;
                        }
                    };

                    updateTimer();
                    timerInterval = setInterval(updateTimer, 1000);
                } else {
                    response = "Invalid 'timer' command format. Use 'timer(HH:MM:SS)' to specify the time.";
                }
            } else if (command.toLowerCase() === "timeu") {
                response = "Time Zones and Regions:";
                timeZones.forEach((zone, index) => {
                    response += `<br> ${index + 1}. ${zone.name} (${zone.id})`;
                });
                response += "<br>Enter the number of the time zone you want to view:";
                //
                /*
            } else if ( inval) {
                const gameParts = command.split(" ");
                if (gameParts[2] === "heads") {
                    if (gameParts[2] === headsTails) {
                        response = `You won yippe`
                    } else {
                        response = `you loose, hahahahha `
                    }
                } else if (gameParts[2] === "tails") {
                    if (gameParts[2] === headsTails) {
                        response = 'You won yippe'
                    } else {
                        response = 'you loose, hahahahhag'
                    }
                }
                */
            } else if (command.toLowerCase() === "system-ready") {
                response += `<div>current system info</div>`;
                response += `<br> system version: ${systemInfo.version}`
                response += `<br> validation: ${variableDefiner}`
                response += `netwrok status: <span class="g"> ${network} </span>`
                response += `<hr>`
                setTimeout(() => {
                    response +=  delay('', 400);
                    response +=  delay(`DATA href cmd&wiki/refrence: " ${command} " <br>TTLS response:  ${valid}`, 700);
                    response +=  delay(`Directory validation: ${validBias}`, 1200);
                    response +=  delay(`Operation ('git') & current routing status <br class="ind">+ Timex routing: ${validOnline}<br>`, 3000);
                    response +=  delay(`+ hoult routing: ${validOnline}<br>`, 3100);
                    response +=  delay(`+ server('XHO-CA') routing: ${validOnline}<br>`, 3150);
                    response +=  `hi` + delay(`+ FecthN data protcal : ${validOnline}<br>`, 3250);
                    response +=  delay(`+ request response: ${validBias}<br>`, 3300);
                    response +=  delay(`Mass path included: II/Inter?Inter/XHO_CA?lock?user20%${userData.name} = ${valid2} `, 3900);
                    response +=  delay(`Done :)`, 4000);
                }, 900);
            } else if (command.toLowerCase() === "system-valid") {
                let validClaer = validFun(0.2, 'clear', 'stail off');
                let validOPtion = validFun(0.4,'yes', 'no');
                let validOPtion2 = validFun(0.9, "yes", "no");

                response += `<br> system version: ${systemInfo.version}`
                response += `<br> validation: ${variableDefiner}`
                response += `netwrok status: <span class="g"> ${network} </span>`
                response += `<hr>`
                    setTimeout(() => {
                        response +=  delay('Run', 400);
                        response +=  delay(`DATA href cmd&wiki/refrence: " ${command} " <br>TTLS response:  ${validOPtion}`, 700);
                        response +=  delay(`Directory validation: ${validBias}`, 1200);
                        response +=  delay(`Operation ('git') & current routing status <br class="ind">+ Timex routing: ${validOnline}<br>`, 3000);
                        response +=  delay(`+ hoult routing: ${validOnline}<br>`, 3100);
                        response +=  delay(`+ server('XHO-CA') routing: ${validOnline}<br>`, 3150);
                        response +=  delay(`MSB- k1 validation: ${valid2}`, 3155);
                        response +=  delay(`sec-sercc opperation: ${validClaer}`,3158);
                        response +=  delay(`sec-0023 opperation: ${validOPtion}`,3248);
                        response +=  delay(`sec-0041 opperation: ${validOPtion2}`,3358);
                        response +=  delay(`sec-0042 opperation: ${validOPtion}`,3768);
                        response +=  delay(`git?-0001 opperation: ${validOPtion2}`,3271);
                        response +=  delay(`git?-con, git HTTP @typescript-est/java/"${command}"/explicit : ${validOPtion2}  `, 4122)
                        response +=  delay(`git?-con, git HTTP @typescript-est/java/"${command}"/explicit : ${validOPtion}`, 4231)
                        response +=  delay(`git?-con, git HTTP @typescript-est/HTML/"${command}"/explicit : ${validOPtion2}`, 4432)
                        response +=  delay(`sec-sercc opperation: ${validClaer}`,5158);
                        response +=  delay(`sec-0023 opperation: ${validOPtion}`,5148);
                        response +=  delay(`sec-0041 opperation: ${validOPtion}`,5158);
                        response +=  delay(`sec-0042 opperation: ${validOPtion}`,5468);
                        response +=  delay(`git?-0001 opperation: ${validOPtion}`,5771);
                        response +=  delay(`output.DOM.any.Query: ${validOPtion}`, 5890);
                        response +=  delay(`Mass path included: II/Inter?--${command}--/XHO_CA?lock?user20%${userData.name} = ${valid2} `, 5900);
                        response +=  delay(`Done :)`, 6000);
                            }, 700);
            } else if (command.toLowerCase() === "system-info" || command.toLowerCase() === "system info") {
                response += `DATA href cmd&wiki/refrence: " ${command} "`
                response += `<div>current system info</div>`;
                response += `<hr>`
                response += `<br> system version: ${systemInfo.version}`;
                response += `<br> validation: ${variableDefiner}`;
                response += `<br> current system opperation and i/o name: ${ioName}`;
                response += `<br> current system server: ${currentServer}`
                response += `<br> user of current session: ${userData.name}`
                response += `<br> netwrok status: <span class="g"> ${network} </span>`
                response += `<hr>`
            } else if (command.toLowerCase() === "spam") {
                for (let i = 0; i < 70; i++) {
                    response += `<div>Lorem ipsum dolor sit amet consectet</div>\n`;
                }
            } else if (/^timeu \d+$/.test(command)) {
                const timeZoneIndex = parseInt(command.split(" ")[1]) - 1;
                if (timeZoneIndex >= 0 && timeZoneIndex < timeZones.length) {
                    const selectedTimeZone = timeZones[timeZoneIndex];
                    const targetTime = getTimeInTimeZone(selectedTimeZone.offset);
                    response = formatTime(targetTime, selectedTimeZone.name);
                } else {
                    response = "Invalid selection. Enter a valid number.";
                }
            } else if (command.toLowerCase() === "timeus") {
                response = "Time Zones in the United States:";
                usTimeZones.forEach((zone, index) => {
                    response += `<br> ${index + 1}. ${zone.name} (${zone.id})`;
                });
                response += "<br>Enter the number of the US time zone you want to view:";
            } else if (/^timeus \d+$/.test(command)) {
                const timeZoneIndex = parseInt(command.split(" ")[1]) - 1;
                if (timeZoneIndex >= 0 && timeZoneIndex < usTimeZones.length) {
                    const selectedTimeZone = usTimeZones[timeZoneIndex];
                    const targetTime = getTimeInTimeZone(selectedTimeZone.offset);
                    response = formatTime(targetTime, selectedTimeZone.name);
                } else {
                    response = "Invalid selection. Enter a valid number.";
                }
            } else if (command.toLowerCase().startsWith("flip coin")) {
                const match = command.match(/\*\)(\d+)/);
                const repetitions = match ? parseInt(match[1]) : 1;
                let flips = [];
                for (let i = 0; i < repetitions; i++) {
                    flips.push(Math.random() < 0.5 ? "Heads" : "Tails");
                }
                response = flips.join(", ");
            } else if (command.toLowerCase().startsWith("config log")) {
                const configParts = command.split(" ");
                if (configParts.length === 4 && configParts[2] === "user.name") {
                    userData.name = configParts[3];
                    response = `User name set to: ${userData.name}`;
                    saveUserData(); // Save the updated user data
                } else if (configParts.length === 4 && configParts[2] === "test.variable") {
                    variable = configParts[3];
                    response = `variable set to: ${variable}`;
                } else if (configParts.length === 4 && configParts[2] === "test.variable.show") {
                    response = `variable (${variableDefiner}): ${variable}`
                } else {
                    response = "Invalid 'config log' command format.";
                    response += "<br> note: Config.log uses the 'dot-notaion rules'"
                }
            } else if (command.toLowerCase() === "show log") {
                response = "Current User Configuration:";
                response += `<br> Version: ${systemInfo.version}`
                response += `<br> status: ${systemInfo.status}`
                response += `<br> User Name: ${userData.name || "Not set"}`;
                response += "<br><br> Log Entries:";
                logEntries.forEach((logEntry, index) => {
                    response += `<br> ${index + 1}. ${logEntry}`;
                });
            } else if (command.toLowerCase().startsWith("cred")) {
                response += `credits ${cred.name}`
            } else if (command.toLowerCase().startsWith("log")) {
                const logEntry = command.substring(3).trim();
                logEntries.push(logEntry);
                response = `Log entry saved:" ${logEntry} "`;
                saveUserData(); // Save the updated user data
            } else if (command.toLowerCase().startsWith("run js/")) {
                const code = command.substring(7).trim();
                try {
                    response = eval(code);
                } catch (error) {
                    response = "Error: " + error.message;
                }
            } else if (command.toLowerCase() === "stwatch") {
                if (stopwatchInterval) {
                    response = "Stopwatch is already running. Use 'stwatch stop' to stop it.";
                } else {
                    stopwatchSeconds = 0;
                    response = "Stopwatch started. Use 'stwatch stop' to stop.";
                    stopwatchInterval = setInterval(() => {
                        stopwatchSeconds++;
                        const displayMinutes = String(Math.floor(stopwatchSeconds / 60)).padStart(2, "0");
                        const displaySeconds = String(stopwatchSeconds % 60).padStart(2, "0");
                        response = `Stopwatch: ${displayMinutes}:${displaySeconds}`;
                        outputElement.lastChild.textContent = response;
                    }, 1000);
                }
            } else if (command.toLowerCase() === "stwatch stop") {
                if (stopwatchInterval) {
                    clearInterval(stopwatchInterval);
                    stopwatchInterval = null;
                    const displayMinutes = String(Math.floor(stopwatchSeconds / 60)).padStart(2, "0");
                    const displaySeconds = String(stopwatchSeconds % 60).padStart(2, "0");
                    response = `Stopwatch stopped. Elapsed time: ${displayMinutes}:${displaySeconds}`;
                } else {
                    response = "Stopwatch is not running.";
                }
            } else if (command.toLowerCase().startsWith("change-theme")) {
                const themeParts = command.split(" ");
                if (themeParts.length === 2) {
                    const color = themeParts[1];
                    document.body.style.backgroundColor = color;
                    userData.theme = color; // Save the theme color
                    saveUserData(); // Save the updated user data
                    response = `Theme changed to ${color}. reset theme with " reset-theme "`;
                } else {
                    response = "Invalid 'change-theme' command format. Use 'change-theme <color>' to change the theme color.";
                }
            } else if (command.toLowerCase() === "reset-theme") {
                document.body.style.backgroundColor = ""; // Reset to default
                delete userData.theme; // Remove saved theme color
                saveUserData(); // Save the updated user data
                response = "Theme color reset to default.";
            }  else {
                response = "Command not recognized"; 
            }

            commandHistory.push(command);
            lastCommandIndex = commandHistory.length - 1;
            if (commandHistory.length > 10) {
                commandHistory.shift();
            }

            responseHistory.push(response);
            if (responseHistory.length > 10) {
                responseHistory.shift();
            }

            if (!userData.name) {
                userData.name = "";
            }
            
            


            outputElement.innerHTML += `<div>user ${userData.name}$ ${command}</div>`;
            outputElement.innerHTML += `<div>db$${response}</div>`;
        });
    }
});

// alternitive ui  










