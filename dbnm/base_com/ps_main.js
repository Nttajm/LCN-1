let ps_use = 'main'; // use in case using a different os.
let last_selected = null;

const commandHandlers = {};
let awaiting = false;
let awaiting_cmd = null;
let directory = null;
let versionII = '1.3.2';

// Single object for all user-related data
let userData = JSON.parse(localStorage.getItem('dbnm_userData')) || {
    username: null,
    cmdUtil: [],
    sessionId: null
};

let module_meta = [
    {
        name: 'dbnm',
        desc: 'base_com',
        use: ps_use,
        version: versionII,
        type: 'system',
        systemFileName: 'Main directoy'
    }
];

const db_info = {
    v: versionII,
    desc: 'vinnila dbnm',
    license: 'MIT',
    use: ps_use,
    author: 'LCN'
};

let system = {
    err: {
        0: 'Command not found',
        1: 'invalid command or arguments provided'
    }
};

let vertiualFiles = [
    {
        directoryName: module_meta.systemFileName,
        id: 'tld-001',
        desc: 'Top level directory',
        path: 'root'
    }
];

// UI Elements
const db_ui = {
    input: document.getElementById('input'),
    output: document.getElementById('output'),
};

// Initialize UI
function initializeUI() {
    if (db_ui.input && db_ui.output) {
        renderInitialInfo();
        serverInit();
    } else {
        print('pre-x UI not available');
        return false;
    }
}

// Render Initial Information
function renderInitialInfo() {
    const infoHTML = `
        ${db_info.v}/${db_info.use}
    `;
    print(infoHTML);
}

function generateSessionId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function initSystemMeta() {
    if (!userData.sessionId) {
        userData.sessionId = generateSessionId();
        saveData();
    }
}

// Print functions
function print(value) {
    let dir_space = directory ? directory : 'db';
    const val_html = `<div class="g-3"><span class="print_out">${dir_space}$</span> <span>${value}</span>`;
    if (db_ui.output) db_ui.output.innerHTML += val_html;
    return value;
}

function warning(value) {
    const val_html = `<div class=" g-3">[<span class='red b'>!</span>] </code>${value}</code>`;
    if (db_ui.output) db_ui.output.innerHTML += val_html;
    return value;
}

function g_print(value) {
    const val_html = `<div class=" g-3 green"><span> ${value}</span></div>`;
    if (db_ui.output) db_ui.output.innerHTML += val_html;
    return value;
}

function e_print(value) {
    const val_html = `<div class=" g-3 red"><span> ${value}</span></div>`;
    if (db_ui.output) db_ui.output.innerHTML += val_html;
    return value;
}

function y_print(value) {
    const val_html = `<div class=" g-3 yellow"><span> ${value}</span></div>`;
    if (db_ui.output) db_ui.output.innerHTML += val_html;
    return value;
}

function c_print(value , custom) {
    const val_html = `<div class=" g-3"><span>${custom}</span> ${value}</div>`;
    if (db_ui.output) db_ui.output.innerHTML += val_html;
    return value;
}

function u_print(value) {
    const val_html = `<div class=" g-3"><span class="prompt">${userData.username || ''} ~ $</span> ${value}</div>`;
    if (db_ui.output) db_ui.output.innerHTML += val_html;
    return value;
}

function c_placeholder(value) {
    if (db_ui.input) {
        db_ui.input.setAttribute('placeholder', value);
        db_ui.input.focus();
        return value;
    } else {
        print('Input element not found.');
        return '';
    }
}

function qestion(value) {
    const val_html = `<div class=" g-3">[<span class='light-blue b'>?</span>] </code>${value}</code>`;
    if (db_ui.output) db_ui.output.innerHTML += val_html;
    return value;
}

// Parse Commands
function _await(value) {
    awaiting = true;
    awaiting_cmd = value || null;
}

function unawait() {
    setTimeout(() => {
        awaiting = false;
        awaiting_cmd = null;
    }, 300);
}

// Register Command Handler
function _reg(command, handler, options = {}) {
    commandHandlers[command.toLowerCase()] = handler;
}

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
    if (cmd === 'cd..') directory = null;

    if (directory && (cmd !== 'cd..' || cmd !== '/' || cmd !== 'r')) {
        cmd = directory + ` ` + cmd;
    }

    let { cmd_split, args } = parseCommand(cmd);
    const command = cmd_split[0].toLowerCase().trim();

    if (!awaiting) {
        if (commandHandlers[command]) {
            commandHandlers[command](args, cmd_split);
        } else if (command === '' && cmd === '') {
            print(' ');
        } else {
            e_print(`
                (${directory ? directory : 'main'}):
                <br> ${system.err[0]}: ${cmd}
            `);
        }
    }
}

// Command registry
_reg('help', () => {
    let output = '<br> Available Commands:';
    Object.keys(commandHandlers).forEach(command => {
        output += `<br> - ${command}`;
    });
    print(output);
});

_reg('example', (args) => {
    if (args.length === 2) {
        print(`Example command executed with values: ${args[0]}, ${args[1]}`);
    } else {
        print('Hello World!');
    }
});

_reg('print', (_, cmd_split) => {
    const output = cmd_split.slice(1).join(' ');
    print(output);
});

_reg('calc', (_, cmd_split) => {
    try {
        const expression = cmd_split.slice(1).join(' ');
        const result = eval(expression);
        print(`Result: ${result}`);
    } catch {
        print('Invalid mathematical expression.');
    }
});

_reg('x', () => {
    if (db_ui.output) db_ui.output.innerHTML = '';
});

_reg('await', () => {
    if (db_ui.input) _await();
});

_reg('exit', () => {
    setTimeout(() => {
        awaiting = false;
        awaiting_cmd = null;
    }, 300);
});

_reg('hello', () => {
    if (db_ui.output) print('hello!');
});

_reg('cd', (_, cmd_split) => {
    if (cmd_split[1] === '') {
        print('specify a directory to change to.');
    } else {
        if (!commandHandlers[cmd_split[1].toLowerCase()]) {
            e_print(`Cannot change to directory '${cmd_split[1]}': it's not a command`);
        } else {
            directory = cmd_split[1];
        }
    }
});

_reg('cd..', () => {
    directory = null;
});

_reg('x dir', () => {
    userData.cmdUtil = [];
    saveData();
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

_reg('svr', (_, cmd_split) => {
    if (cmd_split[1] === 'info') {
        if (typeof serverMainConfig !== 'undefined' && serverMainConfig) {
            print(`
                <br> Server Info:
                <br> Name: ${serverMainConfig.info.v}
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
        userData.username = cmd_split[2];
        saveData();
        print(`Username set to: ${cmd_split[2]}`);
    } else if (cmd_split[1] === 'u') {
        const username = userData.username;
        print(`Username: ${username || 'user'}`);
    }
});

_reg('clear', () => {
    localStorage.removeItem('dbnm_userData');
    print('Local storage cleared.');
    setTimeout(() => window.location.reload(), 300);
});

_reg('/', (_, cmd_split) => {
    if (cmd_split[1] === 'i') {
        if (cmd_split[2] === 'love') {
            print('you!');
        } else if (cmd_split[2]) {
            imp(cmd_split[2], cmd_split[3]);
            print(`Imported: ${cmd_split[3]}`);
        } else {
            error(1);
        }
    } else if (cmd_split[1] === 'dir') {
        if (userData.cmdUtil.length === 0) {
            print('No modules/files available.');
        } else {
            let output = '';
            userData.cmdUtil.forEach((util, index) => {
                output += `<br> <span class=${util.loaded ? '' : 'red'}> ${index + 1}. ${util.link} </span>`;
            });
            print(output);
        }
    } else if (cmd_split[1] === 'user') {
        if (cmd_split[2] === 'set') {
            const fullText = cmd_split.slice(3).join(' ');
            userData.username = fullText;
            saveData();
            print(`Username set to: ${fullText}`);
        } else if (cmd_split[2] === 'get') {
            const username = userData.username;
            print(`Username: ${username || 'user'}`);
        } else {
            print('Invalid user command.');
        }
    } else if (cmd_split[1] === 'rm') {
        const cmd_2 = cmd_split[2];
        removeDir(cmd_2);
        y_print(`File: ${cmd_2} has been removed`);
    } else if (cmd_split[1] === 'info') {
        print(` 
            Version: ${db_info.v}<br>
            Description: ${db_info.desc}<br>
            Author(s): ${db_info.author}<br>
            <hr>
            <br> User : ${userData.username || 'user::' + (userData.sessionId || 'N/A')}
            <br> Session Id: ${userData.sessionId || 'N/A'}
        `);
    } else {
        error(1);
    }
});

_reg('rand', (_, cmd_split) => {
    const from = parseInt(cmd_split[1], 10);
    const to = parseInt(cmd_split[2], 10);
    if (isNaN(from) || isNaN(to)) {
        print('Usage: rand <from> <to>');
        return;
    }
    if (from > to) {
        print('The start value must be less than or equal to the end value.');
        return;
    }
    const random = Math.floor(Math.random() * (to - from + 1)) + from;
    print(`${random}`);
});

// Util handling
function removeDir(dirName) {
    const cmdUtil = userData.cmdUtil;
    if (!isNaN(dirName)) {
        const idx = parseInt(dirName, 10) - 1;
        if (idx >= 0 && idx < cmdUtil.length) {
            cmdUtil.splice(idx, 1);
        }
    } else {
        for (let i = cmdUtil.length - 1; i >= 0; i--) {
            if (cmdUtil[i].link === dirName) {
                cmdUtil.splice(i, 1);
            }
        }
    }
    saveData();
}

function imp(linkClass, link) {
    const newUtil = { linkClass, link };
    userData.cmdUtil.push(newUtil);
    saveData();
    renderUtils();
}

async function renderUtils() {
    if (userData.cmdUtil.length === 0) {
        print('No modules/files available.');
        return;
    }

    let serverMaintain = true;
    let filesLoaded = 0;
    let filesFailed = 0;

    const loadPromises = userData.cmdUtil.map(util => {
        return new Promise(resolve => {
            let adder = '';
            if (util.linkClass === '**' || util.linkClass === 'base') {
                adder = 'public/base-modules/';
            } else if (util.linkClass === '**svr' && serverMaintain) {
                adder = 'servers/';
                serverMaintain = false;
            } else {
                resolve(null);
                return;
            }

            const scriptTag = document.createElement('script');
            scriptTag.src = adder + util.link + '.js';
            scriptTag.type = 'module';

            scriptTag.onload = () => {
                filesLoaded++;
                resolve(true);
                util.loaded = true;
                saveData();
            };

            scriptTag.onerror = () => {
                filesFailed++;
                util.loaded = false;
                resolve(false);
                saveData();
            };

            document.body.appendChild(scriptTag);
        });
    });

    await Promise.all(loadPromises);
    if (filesLoaded > 0) y_print(`Files loaded: (${filesLoaded})`);
    if (filesFailed > 0) e_print(`Files failed to load: (${filesFailed})`);
}

function saveData() {
    localStorage.setItem('dbnm_userData', JSON.stringify(userData));
}

function serverInit() {}

// Event Listener for Commands
function setupInputListener() {
    if (db_ui.input) {
        db_ui.input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                const command = db_ui.input.value;
                u_print(command);
                handleCommand(command);
                db_ui.input.value = '';
                db_ui.input.focus();
                db_ui.input.scrollIntoView();
            }
        });
    }
}

// Initialize Application
function initialize_db() {
    initializeUI();
    setupInputListener();
    initSystemMeta();
    renderUtils();
}

function error(code) {
    print(`
        <br> ${system.err[code]}
        sys.err: ${code}
    `);
}

initialize_db();

const params = new URLSearchParams(window.location.search);
for (const [key, value] of params.entries()) {
    if (key.startsWith("cmd")) handleCommand(value.trim());
}

// - joel mulonde 2025
