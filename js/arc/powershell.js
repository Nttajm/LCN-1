// main.js

const inputElement = document.getElementById("input");
const commandElement = document.getElementById("command");
const outputElement = document.getElementById("output");


let timexInterval;
let timerInterval;

const commandHistory = [];
let lastCommandIndex = -1;
const responseHistory = [];
const logEntries = []; // Array to store log entries

let userData = {}; // Object to store user configuration data

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
    "ping": "Check network connectivity to a specified URL",
    "run js/": "Run JavaScript code and display the output",
    "gl get": "Interactive command to get resources from GitLab",
};

const gitLabResources = [
    "npm lit start",
    "npm lit nav",
    "db config API",
    "access key alt v.12",
    "BB-5",
];

let gitLabDownloadInProgress = false;

function simulateDownload() {
    gitLabDownloadInProgress = true;
    let progress = 0;

    const downloadInterval = setInterval(() => {
        if (progress < 100) {
            outputElement.lastChild.textContent = `Downloading ${progress}%...`;
            progress += 17;
        } else {
            clearInterval(downloadInterval);
            outputElement.lastChild.textContent = "Done.";
            gitLabDownloadInProgress = false;
        }
    }, 1000);
}


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
};

// Save user data to localStorage
const saveUserData = () => {
    localStorage.setItem("userData", JSON.stringify(userData));
};

// Load user data on page load
loadUserData();

inputElement.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        const fullCommand = inputElement.value;
        inputElement.value = "";

        const commands = fullCommand.split(")(");

        commands.forEach((command, index) => {
            if (!command.trim()) return;

            if (timexInterval) {
                clearInterval(timexInterval);
            }

            if (timerInterval) {
                clearInterval(timerInterval);
            }

            let response;
            if (command.toLowerCase() === "hello") {
                response = userData.name
                    ? `Hello, ${userData.name}!`
                    : "Hello! Welcome to the DB&M PowerShell. For help, simply type 'help'.";
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
                } else {
                    response = "Invalid 'config log' command format. Use 'config log user.name <name>' to set the user name.";
                }
            } else if (command.toLowerCase() === "show log") {
                response = "Current User Configuration:";
                response += `<br> User Name: ${userData.name || "Not set"}`;
                response += "<br><br> Log Entries:";
                logEntries.forEach((logEntry, index) => {
                    response += `<br> ${index + 1}. ${logEntry}`;
                });
            } else if (command.toLowerCase().startsWith("log")) {
                const logEntry = command.substring(3).trim();
                logEntries.push(logEntry);
                response = `Log entry saved: ${logEntry}`;
            } else if (command.toLowerCase().startsWith("ping")) {
                const match = command.match(/\(([^)]+)\)/);
                if (match) {
                    const url = match[1];
                    ping(url);
                    response = `Pinging ${url}...`;
                } else {
                    response = "Invalid 'ping' command format. Use 'ping(<url>)' to check network connectivity.";
                }
            } else if (command.toLowerCase().startsWith("run js/")) {
                const code = command.substring(7).trim();
                try {
                    response = eval(code);
                } catch (error) {
                    response = "Error: " + error.message;
                }
            } else if (command.toLowerCase() === "gl get" || /^gl get \d+$/.test(command)) {
                response = handleGlGetCommand(command, outputElement);
            } else {
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

            outputElement.innerHTML += `<div>db$ ${command}</div>`;
            outputElement.innerHTML += `<div>${response}</div>`;
        });
    }
});

console.log('200.pass')

function ping(url) {
    navigator.sendBeacon(url, "");
}
