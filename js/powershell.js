const inputElement = document.getElementById("input");
const commandElement = document.getElementById("command");
const outputElement = document.getElementById("output");

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
};

inputElement.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        const command = inputElement.value;
        inputElement.value = "";

        // Store the command in history
        commandHistory.push(command);
        if (commandHistory.length > 10) {
            commandHistory.shift();
        }

        // Display the entered command
        commandElement.textContent = command;
        commandElement.style.color = "#00FF00";

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

            // Update "timex" every second
            updateTimex();
            setInterval(updateTimex, 1000);
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
        } else {
            response = "Command not recognized";
        }

        // Store the response in history
        responseHistory.push(response);
        if (responseHistory.length > 10) {
            responseHistory.shift();
        }

        // Display the response
        outputElement.innerHTML += `<br> ${response}`;
    }
});
