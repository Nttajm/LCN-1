// Constants
const ps_use = 'main-ps';
let cmdUtil = JSON.parse(localStorage.getItem('cmdUtil')) || [];

const db_info = {
    name: 'ps1.3.1',
    desc: 'base_com',
    use: ps_use,
};

let system = {
    err: {
        1: 'invalid command or arguments provided'
    }
}

// UI Elements
const db_ui = {
    input: document.getElementById('input'),
    output: document.getElementById('output'),
};

// Command Handlers Registry
const commandHandlers = {};

// Register Command Handler
function _reg(command, handler) {
    commandHandlers[command.toLowerCase()] = handler;
}

// Initialize UI
function initializeUI() {
    if (db_ui.input && db_ui.output) {
        renderInitialInfo();
    } else {
        print('pre-x UI not available');
    }
}

// Render Initial Information
function renderInitialInfo() {
    const infoHTML = `
        <div>Path: ${db_info.name}/${db_info.desc}/${db_info.use}</div>
        <div>Desc: ${db_info.desc}</div>
        ${typeof serverMainConfig === 'undefined'? '<div>Server: Connected</div>' : '<div>Server: Disconnected</div>' }
        <br> > v 1.3.1
        <br> > Base
    `;
    print(infoHTML);
}

renderInitialInfo()

// Print to UI
function print(value) {
    const val_html = `<div><span>db$</span> ${value}</div>`;
    if (db_ui.input && db_ui.input.value) {
        db_ui.input.value += val_html;
    }
    if (db_ui.output) {
        db_ui.output.innerHTML += val_html;
    }
    return value;
}

// Parse Command
function parseCommand(cmd) {
    const cmd_split = cmd.split(' ');
    const second = cmd_split[1];
    const bracketOne = cmd.match(/\(([^)]+)\)/);
    let args = [];

    if (bracketOne) {
        args = bracketOne[1].split(',').map(arg => arg.trim());
    }

    return { cmd_split, second, args };
}

// Handle Commands
function handleCommand(cmd) {
    const { cmd_split, args } = parseCommand(cmd);
    const command = cmd_split[0].toLowerCase();

    if (commandHandlers[command]) {
        commandHandlers[command](args, cmd_split);
    } else {
        print(`
            <br> base_com(${ps_use}):
            <br> Command not found: ${cmd}
        `);
    }
}

// Register Built-in Handlers
_reg('example', (args) => {
    if (args.length === 2) {
        print(`Example command executed with values: ${args[0]}, ${args[1]}`);
    } else {
        print('Example command requires exactly 2 arguments.');
    }
});

_reg('multi', (args) => {
    if (args.length === 2) {
        const result = parseFloat(args[0]) * parseFloat(args[1]);
        print(`Multiplication result: ${result}`);
    } else {
        print('Multiplication command requires exactly 2 numeric arguments.');
    }
});

_reg('x', () => {
    if (db_ui.output) {
        db_ui.output.innerHTML = '';
    }
});

_reg('--t', () => {
    localStorage.removeItem('cmdUtil');
});

_reg('r', () => {
    window.location.reload();
});

_reg('time', (_, cmd_split) => {
    if (cmd_split[1] === 'full') {
        print(new Date().toLocaleString());
    } else {
        print(new Date().toLocaleTimeString());
    }
});




_reg('url', (_, cmd_split) => {
    window.open(cmd_split[1]);
});


_reg('server', (_, cmd_split) => {
    if (cmd_split[1] === 'info') {
        if (typeof serverMainConfig !== 'undefined' && serverMainConfig) {
            print(`
                <br> Server Info:
                <br> Name: ${serverMainConfig.info.name}
                <br> Desc: ${serverMainConfig.info.desc}
                <br> Use: ${serverMainConfig.info.use}
            `);
        } else {
            print('Server info not available. Please connect to a server.');
        }
    } else {
        print('Invalid server command provided.');
    }
});

_reg('local', (_, cmd_split) => {
    if (cmd_split[1] === 'username') {
        localStorage.setItem('username', cmd_split[2]);
        print(`Username set to: ${cmd_split[2]}`);
    } else if (cmd_split[1] === 'u') {
        const username = localStorage.getItem('username');
        print(`Username: ${username}`);
    }
});

_reg('/', (_, cmd_split) => {
    if (cmd_split[1] === 'i') {
        if (cmd_split[2] === 'love') {
            print('I love you too!');
        } else if (cmd_split[2].startsWith('--')) {
            imp(cmd_split[2],cmd_split[3]);
            print(`Imported: ${cmd_split[3]}`);
        } else {
            error(1);
        }
    } else if (cmd_split[1] === 'dir') {
        cmdUtil.forEach((util, index) => {
            print(`
                <br> ${index + 1} ${util.linkClass}  ${util.link}
            `);
        });
    } else {
        error(1);
    }
});

function imp(linkClass, link) {
    const newUtil = {linkClass, link};
    cmdUtil.push(newUtil);
    saveUtils();

    renderUtils();
}

function renderUtils() {
    if (cmdUtil.length === 0) {
        print('No Modules available.');
    } 

    let serverMaintain = true

    cmdUtil.forEach(util => {
        let adder = '';
        if (util.linkClass === '--') {
            adder = 'public/base-class/';
            const scriptTag = document.createElement('script');
            scriptTag.src = adder + util.link + '.js';
            document.body.appendChild(scriptTag);
            scriptTag.type = 'module';

            scriptTag.onload = () => print(`Script loaded: ${scriptTag.src}`);
        } else if (util.linkClass === '--sv' && serverMaintain) {
            adder = 'servers/';
            const scriptTag = document.createElement('script');
            scriptTag.src = adder + util.link + '.js';
            scriptTag.type = 'module';
            document.body.appendChild(scriptTag);
            scriptTag.onload = () => print(`Script loaded: ${scriptTag.src}`);


            serverMaintain = false;
        }
    });
}

renderUtils();


function saveUtils() {
    const util = JSON.stringify(cmdUtil);
    localStorage.setItem('cmdUtil', util);
}

// Event Listener for Commands
function setupInputListener() {
    if (db_ui.input) {
        db_ui.input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                const command = db_ui.input.value;
                handleCommand(command);
                db_ui.input.value = '';
            }
        });
    }
}

// Initialize Application
function initialize_db() {
    initializeUI();
    setupInputListener();
}

function error(code) {
    print(`
        <br> ${system.err[code]}
        sys.err: ${code}
    `);
}

initialize_db();



function reverseAndReplaceVowels(input) {
    // Helper function to get the alphabetical index of a character
    function getAlphabetIndex(char) {
        return char.toLowerCase().charCodeAt(0) - 96; // ASCII-based index for 'a' = 1
    }

    const vowels = "aeiouAEIOU";
    let vowelCount = 0;
    let chars = input.split("");  // Convert input into an array of characters
    let transformedText = [];
    let movedChars = [];          // To store the characters that will move to the end

    // Reverse the input text
    const reversed = chars.reverse();

    // Iterate through the reversed text
    for (let i = 0; i < reversed.length; i++) {
        if ((i + 1) % 5 === 0) {
            // If it's the 5th letter, push it to movedChars
            movedChars.push(reversed[i]);
        } else {
            transformedText.push(reversed[i]);
        }

        // Replace vowels with the correct transformed value
        if (vowels.includes(reversed[i])) {
            vowelCount++;
            if (vowelCount % 3 === 0) {
                const alphabetIndex = getAlphabetIndex(reversed[i]);
                transformedText[transformedText.length - 1] = (alphabetIndex + 3).toString(); // 3rd vowel
            } else if (vowelCount % 1 === 0) {
                const alphabetIndex = getAlphabetIndex(reversed[i]);
                transformedText[transformedText.length - 1] = (alphabetIndex + 6).toString(); // 1st vowel
            }
        }
    }

    // Concatenate the transformed part and the moved characters at the back
    const finalString = transformedText.concat(movedChars).join("");

    // Swap every pair of two characters in the final string
    let swappedString = "";
    for (let i = 0; i < finalString.length; i += 2) {
        if (i + 1 < finalString.length) {
            // Swap pairs of characters
            swappedString += finalString[i + 1] + finalString[i];
        } else {
            // Leave the last character unchanged if the length is odd
            swappedString += finalString[i];
        }
    }

    return swappedString;
}

// Example API key usage:
const apiKey = "AIzaSyAGcg43F94bWqUuyLH-AjghrAfduEVQ8ZM";
const transformedKey = reverseAndReplaceVowels(apiKey);
console.log(apiKey)
console.log(transformedKey);
// Example Output: "MZ8QVEdufArhgAj-AHLyuWb49Fc34gcGASyAzI3"

