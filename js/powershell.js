const inputElement = document.getElementById("input");
const commandElement = document.getElementById("command");
const outputElement = document.getElementById("output");

let timexInterval;  // Store the interval ID for the "timex" command

let timerInterval; // Store the interval ID for the timer

const commandHistory = [];
const responseHistory = [];

const availableCommands = {
    "time": "Display the current time",
    "calc": "Perform basic arithmetic calculations",
    "help": "Display a list of available commands and their descriptions",
    "bk": "Display the last command",
    "rec": "Display the last response",
    "timex": "Display the current date and time with live seconds",
    "lcn": "Visit lcnjoel.com",
    "reset": "Clear the session and start over",
    "rand": "Generate a random number between the specified range (e.g., 'rand(x-y)'",
    "timer": "Start a timer (e.g., 'timer(01:00:23)')",
    "timeu": "Interactively view the time in different time zones and regions",
};

const timeZones = [
    { id: "gmt", name: "Greenwich Mean Time (GMT)", offset: 0 },
    { id: "pst", name: "Pacific Standard Time (PST)", offset: -8 },
    { id: "mst", name: "Mountain Standard Time (MST)", offset: -7 },
    { id: "cst", name: "Central Standard Time (CST)", offset: -6 },
    { id: "est", name: "Eastern Standard Time (EST)", offset: -5 },
    { id: "aest", name: "Australian Eastern Standard Time (AEST)", offset: 10 },
    // Add more time zones as needed
];

function getTimeInTimeZone(offset) {
    const currentTime = new Date();
    const offsetMilliseconds = offset * 60 * 60 * 1000;
    const targetTime = new Date(currentTime.getTime() + offsetMilliseconds);
    return targetTime;
}

function formatTime(time, name) {
    const hours = time.getUTCHours().toString().padStart(2, '0');
    const minutes = time.getUTCMinutes().toString().padStart(2, '0');
    return `Time in ${name}: ${hours}:${minutes}`;
}

inputElement.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        const command = inputElement.value;
        inputElement.value = "";

        // Clear the "timex" interval when a new command is entered
        if (timexInterval) {
            clearInterval(timexInterval);
        }

        // Clear the "timer" interval when a new command is entered
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        // Process the command and provide a response
        let response;
        if (command.toLowerCase() === "hello") {
            response = "Hello, Welcome to the DB&M PowerShell. For help, simply type 'help'.";
        } else if (command.toLowerCase() === "time") {
            const currentTime = new Date();
            const hours = currentTime.getHours().toString().padStart(2, '0');
            const minutes = currentTime.getMinutes().toString().padStart(2, '0');
            const meridian = currentTime.getHours() >= 12 ? "pm" : "am";
            response = `${hours}:${minutes}${meridian}`;
        } else if (command.toLowerCase() === "timex") {
            const updateTimex = () => {
                const currentTime = new Date();
                const hours = currentTime.getHours().toString().padStart(2, '0');
                const minutes = currentTime.getMinutes().toString().padStart(2, '0');
                const seconds = currentTime.getSeconds().toString().padStart(2, '0');
                const day = currentTime.getDate().toString().padStart(2, '0');
                const month = (currentTime.getMonth() + 1).toString().padStart(2, '0');
                const year = currentTime.getFullYear();
                response = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                outputElement.lastChild.textContent = response;
            };

            // Update "timex" every second and store the interval ID
            updateTimex();
            timexInterval = setInterval(updateTimex, 1000);
        } else if (command.toLowerCase() === "lcn") {
            window.location.href = "https://lcnjoel.com";
        } else if (command.toLowerCase().startsWith("calc")) {
            const expression = command.substring(5).trim();
            try {
                response = eval(expression);
            } catch (error) {
                response = "Error: " + error.message;
            }
        } else if (command.toLowerCase() === "help") {
            response = "Available Commands:";
            for (const cmd in availableCommands) {
                response += `<br> ${cmd} - ${availableCommands[cmd]}`;
            }
        } else if (command.toLowerCase() === "bk") {
            if (commandHistory.length > 1) {
                response = "Last command: " + commandHistory[commandHistory.length - 2];
            } else {
                response = "No previous command";
            }
        } else if (command.toLowerCase() === "rec") {
            if (responseHistory.length > 0) {
                response = "Last response: " + responseHistory[responseHistory.length - 1];
            } else {
                response = "No previous response";
            }
        } else if (command.toLowerCase() === "reset") {
            // Clear the entire session
            outputElement.innerHTML = "";
            commandHistory.length = 0;
            responseHistory.length = 0;
            response = "Session has been reset.";
        } else if (command.toLowerCase().startsWith("rand")) {
            // Generate a random number between the specified range
            const match = command.match(/\((\d+)-(\d+)\)/);
            if (match) {
                const min = parseInt(match[1]);
                const max = parseInt(match[2]);
                response = `Random number between ${min} and ${max}: ${Math.floor(Math.random() * (max - min + 1)) + min}`;
            } else {
                response = "Invalid 'rand' command format. Use 'rand(x-y)' to specify the range.";
            }
        } else if (command.toLowerCase().startsWith("timer")) {
            // Start a timer with the specified time (e.g., 'timer(01:00:23)')
            const match = command.match(/\((\d{2}:\d{2}:\d{2})\)/);
            if (match) {
                const timeString = match[1];
                const [hours, minutes, seconds] = timeString.split(":").map(Number);
                const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                let remainingSeconds = totalSeconds;
                const updateTimer = () => {
                    const displayHours = String(Math.floor(remainingSeconds / 3600)).padStart(2, '0');
                    const displayMinutes = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, '0');
                    const displaySeconds = String(remainingSeconds % 60).padStart(2, '0');
                    response = `Timer: ${displayHours}:${displayMinutes}:${displaySeconds}`;
                    outputElement.lastChild.textContent = response;
                    if (remainingSeconds <= 0) {
                        clearInterval(timerInterval);
                    } else {
                        remainingSeconds--;
                    }
                };

                // Start the timer and store the interval ID
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
            // Handle time zone selection
            const timeZoneIndex = parseInt(command.split(" ")[1]) - 1;
            if (timeZoneIndex >= 0 && timeZoneIndex < timeZones.length) {
                const selectedTimeZone = timeZones[timeZoneIndex];
                const targetTime = getTimeInTimeZone(selectedTimeZone.offset);
                response = formatTime(targetTime, selectedTimeZone.name);
            } else {
                response = "Invalid selection. Enter a valid number.";
            }
        } else {
            response = "Command not recognized";
        }

        // Store the command in history
        commandHistory.push(command);
        if (commandHistory.length > 10) {
            commandHistory.shift();
        }

        // Store the response in history
        responseHistory.push(response);
        if (responseHistory.length > 10) {
            responseHistory.shift();
        }

        // Display the entered command and the response
        outputElement.innerHTML += `<div>db$ ${command}</div>`;
        outputElement.innerHTML += `<div>${response}</div>`;
    }
});
