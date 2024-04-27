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
let dbArray = [];
let react = [];

function push(name, type, file) {
    dbArray.push({
        name,
        type,
        file
    })
}

push('hi', '2', '');

const rN = Math.random();

const element = document.getElementById('js-get-powerShell'); // let main know that file is active
element.textContent = 'pass.200';
element.classList.add('stat');

export let userData = {}; // Object to store user configuration data

const system = {
    error: {
        syntaxRef: `DATA href cmd&wiki/refrence: " ${command} "<br>`,
        syntax: `Unable to interpret the command due to improper syntax or invalid command`,
        syntaxParts: `The term '${command}' is not recognized as a valid function, script file, or operable within the command.`,
        notLoaded: `The intail DB request for (" ${command} ") can not be excuted becuase it is not loaded.`
    }
}

let npmIObj = {
    error: `the npm part is not recognized as a valid function or command within the command.`,
    name: localStorage.getItem('npm-name') || 'not set',
    savedData: {
        project: 'not saved',
    }
}


let fileArray = [];
const firstFile = fileArray[0];

let npmName = npmIObj.savedData.project;


let npmI = localStorage.getItem("npm") || false;
window.addEventListener('load', displayFile)
function displayFile() {
    if (npmI) {
        createFile(npmIObj.name);
    } 
}

function createFile(option) {
    const fileContainer = document.querySelector('.file-cont');
    fileContainer.classList.add('nav-before');

    // Create fileDiv element
    const fileDiv = document.createElement('div');
    fileDiv.classList.add('file');

    // Create iconSpan element
    const iconSpan = document.createElement('span');
    iconSpan.classList.add('material-symbols-outlined');
    iconSpan.textContent = 'description'; // Set the text content of the span

    // Create fileNameSpan element
    const fileNameSpan = document.createElement('span');
    fileNameSpan.id = 'fileName';
    fileNameSpan.textContent = option; // Set the text content of the span

    // Append iconSpan and fileNameSpan to fileDiv
    fileDiv.appendChild(iconSpan);
    fileDiv.appendChild(fileNameSpan);

    // Append fileDiv to fileContainer
    fileContainer.appendChild(fileDiv);

    if (!firstFile === npmIObj.name) {
        fileArray.push(option)
    }
}

console.log(firstFile)

let npmSavedDifinerColor = '';

    if (!npmName === 'not saved') {
        npmSavedDifinerColor = `<span class="g">saved</span>` 
    } else {
        npmSavedDifinerColor = `<span class="r">not saved</span>`
    }

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

    const dbSaved = localStorage.getItem("dbArray");
    if (dbSaved) {
        dbArray = JSON.parse(dbSaved);
    }

};



function createNotification(text, option, icon, color) {
    option = option || 'System Error';
    icon = icon || 'error';
    color = color || 'stat-error';
    // Create elements
    const notificationDiv = document.createElement('div');
    notificationDiv.classList.add('notification');

    const headDiv = document.createElement('div');
    headDiv.classList.add('n-head', 'fl-ai');

    const errorIconSpan = document.createElement('span');
    errorIconSpan.classList.add('material-symbols-outlined', color, 'eicon');
    errorIconSpan.textContent = icon;

    const systemErrorSpan = document.createElement('span');
    systemErrorSpan.textContent = option;

    const infoSpan = document.createElement('span');
    infoSpan.classList.add('n-info');
    infoSpan.textContent = text;

    // Append elements
    headDiv.appendChild(errorIconSpan);
    headDiv.appendChild(systemErrorSpan);
    notificationDiv.appendChild(headDiv);
    notificationDiv.appendChild(infoSpan);

    // Append notification to the div with class "notification"
    const notificationContainer = document.querySelector('.notification-container'); // Change this selector to match your actual container
    notificationContainer.appendChild(notificationDiv);

    if (option === 'error') {
        sysMessage(text, 'e');
    } else if (text === system.error.syntax) {
        sysMessage(text, 'e');
    } else {
        print(text);
    }


}


// Save user data to localStorage
function saveUserData() {
    localStorage.setItem("userData", JSON.stringify(userData));
    localStorage.setItem("logEntries", JSON.stringify(logEntries));
    localStorage.setItem("dbArray", JSON.stringify(dbArray));
    cloudIcon();
}

function cloudIcon() {
    const icon = document.getElementById('cloud');
    icon.style.color = 'cornflowerblue';
}

function themeColorComps(setColor) {
    setColor = setColor || '';
    document.documentElement.style.setProperty('--theme', setColor);
    localStorage.setItem('theme', setColor);

    const input = document.getElementById('input');
    const container = document.getElementById('output');
    input.style.color = setColor;
    container.style.color = setColor;

} 

function TextColorComps(setColor) {
    setColor = setColor || '';
    const input = document.getElementById('input');
    const container = document.getElementById('output');
    const bottumLeftbtn = document.querySelector('.btn-2')

    input.style.color = setColor;
    container.style.color = setColor
    bottumLeftbtn.style.colr = setColor
    document.documentElement.style.setProperty('--textColor', setColor);
}

function loadTheme() {
    themeColorComps(userData.theme);
    TextColorComps(userData.textColor);
}

function saveNpmData() {
    localStorage.setItem('npm', true);
    localStorage.setItem('npm-name', npmIObj.name);
    npmIObj.savedData.project = 'saved';
    cloudIcon(true);
}

// event listners
window.addEventListener('load', loadTheme);

// Load user data on page load
loadUserData();
// imports 
import { systemInfo, cred } from './systeminfo/systeminfo.js';
import { network } from './netstat.js';
import { sessionId } from './sessionid.js';
import { serverId } from './systeminfo/serlist.js';
import { psCmsJarg } from './commands/jarg.js';
// import { system } from './sytem-ui/messages.js';

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

        function delayfun(fun1, delay1, fun2, delay2) {
            setTimeout(() => {
                response += fun1;
            }, delay1);
            setTimeout(() => {
                fun2
            }, delay2);
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
                dbArray = [];
                logEntries.length = 0;
                localStorage.setItem('theme', '');

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
                    createNotification(system.error.syntax);
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
            } else if (command.toLowerCase().startsWith('npx')) {
                startLoading(220, 10);
            } else if (command.toLowerCase().startsWith('print')) {
                const sec = command.split(" ")
                print(`${sec[1]}`);
                response = 'printed'
                openTab1('tab4');

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
                    createNotification(system.error.syntax);
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
                    createNotification(system.error.syntax);
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
                response += `<br> files stored: ${dbArray.length + 1}`
                response += `<hr>`
            } else if (command.toLowerCase().startsWith('spam')) {
                const spamParts = command.split(" ");
                const spam = 70;
                if (spamParts.length > 2) {
                    spam = parseInt(spamParts[1])
                }
                for (let i = 0; i <spam; i++) {
                    response += `<div>Lorem ipsum dolor sit amet consectet</div>\n`;
                    sysMessage('Lorem ipsum dolor sit amet consectet', 'm');
                }     
            } else if (command.toLowerCase().startsWith("npm i")) {
                npmI = true;
                const npmParts = command.split(" ");
                npmIObj.name = npmParts[2] || 'not set';
                
                const npmValid = localStorage.getItem('npm');
        
                if (npmValid === true) {
                    response += `npm file already declared`
                } else {
                    response += 'npm has been intaitied';
                    response += '<br>download status:';
                    response += '<hr>';
                    setTimeout(() => {
                        response += delay(`DB: configuring project reqest`, 802);
                        response += delay(`npm connection : <span class="g">True</span>`, 1000);
                        response += delay(`DATA href?file?definer: " ${npmName} "; save file with " npi s "`, 1300);
                        response += delay(`DATA href?file?fileName: " ${npmIObj.name} "`, 1550)
                        response += delay('downloaded', 1800);
                    }, 800);
                    setTimeout(() => {
                        createNotification(`npm lit start file "${npmIObj.name}..." has been created`, 'downlaoded', 'check_circle', 'stat')
                    }, 2600);
                }
            } else if (command.toLowerCase().startsWith("npm s")) {
                if (!npmI) {
                    response += system.error.notLoaded;
                } else {
                    if (npmName === 'not saved') {
                        response = `file (" ${npmIObj.name} ") already saved`
                    } else {
                        saveNpmData();
                        createFile(npmIObj.name);
                    }
                }
            } else if (command.toLowerCase() === "npm") {
                var npmIcount = 0;
                if (npmI) {
                    response = `current project: ${npmIObj.name}`;
                    response += `<br> npmI status: <span class="g"> ${network} </span>`;
                    response += `<br> dir = ${npmIcount}</span>`;
                    response += `<br> DATA href?file?definer: ${npmSavedDifinerColor}`
                } else {
                    createNotification('npm lit start has not either been downloaded or ready.')
                    response = system.error.notLoaded;
                }
            } else if (command.toLowerCase() === "npm") {
                const npmD = command.split(" ");
                if (npmD[1] === "i"){
                    response += 'fueo?';
                } else if (npmD[1] === "name") {
                    response += npmIObj.name;
                } else {
                    response += message.npm.error;
                }
            } else if (command.toLowerCase().startsWith("db /")) {
                const comdParts = command.split(" ");
                const secp = comdParts[2];
                const thrdp = comdParts[3];
                const th4 = comdParts[4];
                const th5 = comdParts[5];

                const lastfileIndex = dbArray.length;
                const lastfileNum = dbArray.length + 1;
                var savedDinfiner = 'not saved';
                if (secp === 'i') {
                    startLoading(20, 10);
                    dbArray.push({
                        name: thrdp,
                        type: th4,
                        file: th5
                    });
                    response = `<br>${thrdp} added`;
                    response += '<hr>';
                    setTimeout(() => {
                        response += delay(`DB: configuring project reqest`, 802);
                        response += delay(`git connection : <span class="g">True</span>`, 802);
                        response += delay(`dir = ${lastfileIndex}`, 1302);
                        response += delay(`file number = ${lastfileNum}`, 1302);
                        response += delay(`DATA href?file?fileName: " ${thrdp} "`, 250)
                        response += delay('downloaded', 1800);
                    }, 800);
                    setTimeout(() => {
                        createNotification(`db / start file "${thrdp}..." has been created(not saved)`, 'downlaoded', 'check_circle', 'stat');
                        renderApps();
                    }, 2600);
                } else if (secp === 's') {
                    saveUserData();
                    response = 'saved.'
                } else if (secp === '') {
                    let userName = userData.name
                    if (!userData.name) {
                        userName = 'user'
                    }
                    response += `<br> dir = ` + lastfileIndex;
                    response += `<br> set dir: DB$M/db/${userName}/array(${dbArray.length})`
                    response += `<hr>`;
                    dbArray.forEach((db, index) => {
                        response += `<br> ${index + 1} (${index}). ${db.name}`;
                    });
                } else{
                    createNotification(system.error.syntax)
                    response = system.error.syntaxParts
                }
            } else if (command.toLowerCase() === 'r') {
                location.reload();
            } else if (command.toLowerCase().startsWith('e /')) {
                response = 'test working'
            } else if (/^timeu \d+$/.test(command)) {
                const timeZoneIndex = parseInt(command.split(" ")[1]) - 1;
                if (timeZoneIndex >= 0 && timeZoneIndex < timeZones.length) {
                    const selectedTimeZone = timeZones[timeZoneIndex];
                    const targetTime = getTimeInTimeZone(selectedTimeZone.offset);
                    response = formatTime(targetTime, selectedTimeZone.name);
                } else {
                    response = "Invalid selection. Enter a valid number.";
                    createNotification(system.error.syntax);
                }
            } else if (command.toLowerCase() === userData.name) {
                response = `yes that is you, ${userData.name}.`
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
                    response = system.error.syntaxParts;
                }
            } else if (command.toLowerCase().startsWith("flip coin")) {
                const match = command.match(/\*\)(\d+)/);
                const repetitions = match ? parseInt(match[1]) : 1;
                let flips = [];
                for (let i = 0; i < repetitions; i++) {
                    flips.push(Math.random() < 0.5 ? "Heads" : "Tails");
                }
                response = flips.join(", ");
            } else if (command.toLowerCase() === 'e') {
                 response = "<br>explorer..."

                 const explorCont = document.querySelector(".explorer");
                 explorCont.classList.toggle('dbe');

                 var display = localStorage.getItem('display-e');
                 display = display === false ? true : false;
                 localStorage.setItem('display-e', display);

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
                    response = system.error.syntaxParts;
                    createNotification(system.error.syntax);
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
                    createNotification(system.error.syntax);
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
                    var color = themeParts[1];
                    document.body.style.backgroundColor = color;
                    userData.theme = color; // Save the theme color
                    themeColorComps(color);
                    saveUserData(); // Save the updated user data
                    response = `Theme changed to ${color}. reset theme with " reset-theme "`;
                } else {
                    createNotification(system.error.syntax);
                    response += system.error.syntaxParts;
                    response += "Invalid 'change-theme' command format. Use 'change-theme <color>' to change the theme color.";
                }
            } else if (command.toLowerCase() === "reset-theme") {
                document.body.style.backgroundColor = ""; // Reset to default
                delete userData.theme; // Remove saved theme color
                saveUserData(); // Save the updated user data
                response = "Theme color reset to default.";
            } else if (command.toLowerCase().startsWith("theme")) {
                const themeParts = command.split(" ")
                const c1 = themeParts[1]
                const c2 = themeParts[2]
                theme(c1, c2, command);
                response = `Theme changed to ${c1}, and text text color set to ${c2}"`;
                saveUserData();
                loadTheme()
            } else if (command.toLowerCase().startsWith("th")) {
                const thParts = command.split(" ");
                if (thParts[1] === 'calm') {
                    theme('darkolivegreen', 'orange', command);
                    saveUserData();
                    loadTheme()
                    response = ``;
                } else if (thParts[1] === 'night') {
                    theme('black', 'red', command);
                    saveUserData();
                    loadTheme()
                    response = ``;
                } else {
                    createNotification(system.error.syntax)
                    response = system.error.syntaxParts;
                }
            } else if (command === "devColors"){
                response = `<span class="green">A</span>
                <span class="blue">b</span>
                <span class="highlight">C</span>
                <span class="purple">d</span>
                <span class="stat-error">E</span>
                <span class="stat">f</span>
                <span class="g">1234ABCabc</span>
                <span class="r">1234ABCabc</span>`
            } else if (command.startsWith("t--devlOAD")) {
                const parts = command.split(" ")
                startLoading(parts[1], parts[2])
                response = 'testing...'

            } else if (command.toLowerCase().startsWith("text-color")) {
                const themeParts = command.split(" ");
                if (themeParts.length === 2) {
                    const input = document.getElementById('input');
                    const container = document.getElementById('output');
                    const color = themeParts[1];
                    userData.textColor = color;

                    saveUserData();
                    TextColorComps(color);
                    loadTheme()
                    input.style.color = color;
                    container.style.color = color;
                    response = `Text color changed to ${color}. reset theme with " reset-theme "`;

                } else {
                    createNotification(system.error.syntax);
                    response += system.error.syntaxParts;
                }
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
            
            


            outputElement.innerHTML += `<div>user ${userData.name} $ ${command}</div>`;
            outputElement.innerHTML += `<div>db$ ${response}</div>`;
        });
    }
});


// alternitive ui 

const display = localStorage.getItem('display-e')
const eCont = document.querySelector('.explorer') 


function error() {
    response = system.error.syntax;
    createNotification(system.error.syntax);
}
function renderLogs() {
    const outputHTML = document.getElementById('e-out');
    logEntries.forEach((logEntry, index) => {
         outputHTML.innerHTML += `
         <div class="file fl-ai" id="e-file">
         <span class="material-symbols-outlined">
            format_list_bulleted
        </span>
        <span>
            ${logEntry}
        </span>
        </div>
         `;
    });
}

renderLogs();
renderApps();


function renderApps() {
    const outputHTML = document.getElementById('js-apps');
    outputHTML.innerHTML = '';
    dbArray.forEach((app, index) => {
        let contentsHTML = `
        <div class="contents jse${index + 1}">
            <div class="f-content">
                <img src="js/ps/assets/json_out.png" alt="img" class="pfp">
                <span>package.json</span>
            </div>
        </div>
        `;
        if (app.type === 'Javascript') {
            contentsHTML = `
                <div class="contents jse${index + 1}">
                    <div class="f-content">
                        <img src="js/ps/assets/json_out.png" alt="img" class="pfp">
                        <span>package.json</span>
                    </div>
                    <div class="f-content">
                        <img src="js/ps/assets/json_out.png" alt="img" class="pfp">
                        <span>package-lock.json</span>
                    </div>
                    <div class="f-content">
                        <img src="js/ps/assets/json_out.png" alt="img" class="pfp">
                        <span>db&mAPI.json</span>
                    </div>
                    <div class="f-content">
                        <img src="js/ps/assets/JavaScript-logo.png" alt="img" class="pfp">
                        <span>source.js</span>
                    </div>
                    <div class="f-content">
                        <img src="js/ps/assets/JavaScript-logo.png" alt="img" class="pfp">
                        <span>app.js</span>
                    </div>
                    <div class="f-content">
                        <img src="js/ps/assets/JavaScript-logo.png" alt="img" class="pfp">
                        <span>reportWebVitals.js</span>
                    </div>
                </div>`;
        }

        if (app.type === 'php') {
            contentsHTML = `
            <div class="contents jse${index + 1}">
                ${contents('smskeys.php', 'php')}
                ${contents('APIsm.php', 'php')}
                ${contents('source.php', 'php')}
                ${contents('response.php', 'php')}
            </div>
            `
        }

        if (app.type === 'python') {
            contentsHTML = `
            <div class="contents jse${index + 1}">
                <div class="f-content">
                    <img src="js/ps/assets/py.png" alt="img" class="pfp">
                    <span>package.py</span>
                </div>
                <div class="f-content">
                    <img src="js/ps/assets/py.png" alt="img" class="pfp">
                    <span>smsAPI.py</span>
                </div>
                <div class="f-content">
                    <img src="js/ps/assets/py.png" alt="img" class="pfp">
                    <span>keys.py</span>
                </div>
            </div>
            `
        }

        if (app.type === 'java') {
            contentsHTML = `
            <div class="contents jse${index + 1}">
                <div class="f-content">
                    <img src="js/ps/assets/java_logo.png" alt="img" class="pfp">
                    <span>package.java</span>
                </div>
                <div class="f-content">
                    <img src="js/ps/assets/java_logo.png" alt="img" class="pfp">
                    <span>package_sourceAPI.java</span>
                </div>
                <div class="f-content">
                    <img src="js/ps/assets/java_logo.png" alt="img" class="pfp">
                    <span>genral.java</span>
                </div>
                <div class="f-content">
                        <img src="js/ps/assets/json_out.png" alt="img" class="pfp">
                        <span>db&mAPI.json</span>
                </div>
            </div>
            `
        }

        if (app.type === 'lso') {
            contentsHTML = `
            <div class="contents jse${index + 1}">
            ${contents('package.json', 'json_out')}
            ${contents('erat', 'json_out')}
            ${contents('scon', 'json_out')}
            ${contents('utils.js', 'JavaScript-logo')}
            ${contents('locals.js', 'JavaScript-logo')}
            ${contents('localHost.js', 'JavaScript-logo')}
            ${contents('res.js', 'JavaScript-logo')}
            ${contents('items.js', 'JavaScript-logo')}

            </div>
            `
        }

        if (app.type === 'config') {
            contentsHTML = `
            <div class="contents jse${index + 1}">
            ${contents('package.json', 'json_out')}
            ${contents('app.js', 'JavaScript-logo')}
            ${contents('utils.js', 'JavaScript-logo')}
            ${contents('locals.js', 'JavaScript-logo')}
            </div>
            `
        }

        if (app.type === 'system') {
            contentsHTML = `
            <div class="contents jse${index + 1}">
            ${contents('package.ts', 'json_out')}
            ${contents('app.ts', 'typescript')}
            ${contents('lnoAPI.ts', 'typescript')}
            ${contents('library.ts', 'typescript')}
            ${contents('app.ts', 'typescript')}
            ${contents('Tran.ts', 'typescript')}
            </div>
            `
        }

        let appLogo = `react.webp`
        let appName = `React`

        if (app.file === 'ang') {
            appLogo = `angular.png`
            appName = `Angular`
        }

        if (app.type === 'lso') {
            appLogo = `node.png`
            appName = `node`
        }

        if (app.type === 'node') {
            appLogo = `node.png`
            appName = `node`
        }

        if (app.type === 'system') {
            appLogo = `node.png`
            appName = `TS config`
        }

        if (app.type === 'php') {
            appLogo = `php.png`
            appName = `html, server`
        }

        outputHTML.innerHTML += `
            <div class="file react" id="e-file">
                <div class="react-top">
                    <div class="fl-r fl-ai g-10">
                        <div class="img">
                            <img src="js/ps/assets/${appLogo}" alt="img" class="pfp">
                        </div>
                        <div class="f-sec1">
                            <span>${app.name}</span>
                            <span>${appName} app</span>
                            <span id="${app.type}"> &lt;&sol;&gt; ${app.type}</span>
                        </div>
                    </div>
                    <button class="ps-btn-mini view-btn" onclick="toggleDisplay('jse${index + 1}')">
                        <span class="material-symbols-outlined">
                            more_horiz
                        </span>
                    </button>
                </div>
                ${contentsHTML}
            </div>`;
    });
}

function contents(name, img) {
    const text = `
    <div class="f-content">
        <img src="js/ps/assets/${img}.png" alt="img" class="pfp">
        <span>${name}</span>
    </div>
    `
    return text;
}



function theme(theme, color, command) {
    const input = document.getElementById('input');
    const container = document.getElementById('output');
    input.style.color = color;
    container.style.color = color;

    userData.theme = theme;
    userData.textColor = color;
    document.body.style.backgroundColor = theme;

    themeColorComps(theme);
    TextColorComps(color);
    loadTheme();
    saveUserData();
}





const explarray = []

explarray.push({
    'bluh': 'e22',
    'thisThatg': 'hi mom'
});

console.log(explarray);
console.log(explarray[0].bluh);