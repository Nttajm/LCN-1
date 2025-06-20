// Constants
let ps_use = 'main';
let cmdUtil = JSON.parse(localStorage.getItem('cmdUtil')) || [];
let last_selected = null;

const commandHandlers = {};
let awaiting = false;
let awaiting_cmd = null;
let directory = null;

const module_meta = [
    {
        name: 'dbnm1.3.1',
        desc: 'base_com',
        use: ps_use,
        version: '1.3.1',
    }
]

const db_info = {
    v: '1.3.1',
    desc: 'vinnila dbnm',
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

// db_ui.input.focus();


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
        <div>Path: ${db_info.v}/${db_info.use}</div>
    `;
    print(infoHTML);
}

//  
// Print to UI

function print(value) {
    let dir_space = '';
    if (directory) { 
        dir_space = directory
    } else {
        dir_space = 'db'
    }

    const val_html = `<div class=" g-3"><span>${dir_space}$ ${value}</span>`;
    if (db_ui.output) {
        db_ui.output.innerHTML += val_html;
    }
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
    if (db_ui.output) {
        db_ui.output.innerHTML += val_html;
    }
    return value;
}

function waring(value) {
    const val_html = `<div class=" g-3">[<span class='red b'>!</span>] </code>${value}</code>`;
    if (db_ui.output) {
        db_ui.output.innerHTML += val_html;
    }
    return value;
}


function u_print(value) {
    const val_html = `<div class=" g-3"><span>$</span> ${value}</div>`;
    if (db_ui.output) {
        db_ui.output.innerHTML += val_html;
    }
    return value;
}

function e_print(value) {
    const val_html = `<div class=" g-3"><span></span> ${value}</div>`;
    if (db_ui.output) {
        db_ui.output.innerHTML += val_html;
    }
    return value;
}

function c_print(value , custom) {
    const val_html = `<div class=" g-3"><span>${custom}</span> ${value}</div>`;
    if (db_ui.output) {
        db_ui.output.innerHTML += val_html;
    }
    return value;
}

// Parse Command

// Command Handlers Registry

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
function _reg(command, handler) {

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
    if (cmd === 'cd..') {
        directory = null;
    }
    if (directory && cmd !== 'cd..') {
        cmd = directory + ` ` + cmd
    }
    let { cmd_split, args } = parseCommand(cmd);
    const command = cmd_split[0].toLowerCase().trim();

    if (!awaiting) {
        if (commandHandlers[command]) {
            commandHandlers[command](args, cmd_split);
        } else {
            print(`
                <br> (${directory ? directory : 'main'}):
                <br> Command not Found: ${cmd}
            `);
        }
    }
}

_reg(('help'), () => {
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

_reg('math', (_, cmd_split) => {
    try {
        const expression = cmd_split.slice(1).join(' ');
        const result = eval(expression);
        print(`Result: ${result}`);
    } catch (error) {
        print('Invalid mathematical expression.');
    }
    
});

_reg('x', () => {
    if (db_ui.output) {
        db_ui.output.innerHTML = '';
    }
});

_reg('await', () => {
    if (db_ui.input) {
        _await();
    }
});

_reg('exit', () => {
        setTimeout(() => {
            awaiting = false;
            awaiting_cmd = null;
        }, 300);
});

_reg('hello', () => {
    if (db_ui.output) {
        print('hello!')
    }
});

_reg('cd', (_, cmd_split) => {
    if (cmd_split[1] === '') {
        print('specify a directory to change to.');
    } else {
        directory = cmd_split[1];
    }
});

_reg('cd..', (_, cmd_split) => {
    directory = null;
});

_reg('x dir', () => {
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
        localStorage.setItem('username', cmd_split[2]);
        print(`Username set to: ${cmd_split[2]}`);
    } else if (cmd_split[1] === 'u') {
        const username = localStorage.getItem('username');
        print(`Username: ${username}`);
    }
});

_reg('clear', () => {
    localStorage.clear();
    print('Local storage cleared.');
    setTimeout(() => {
        window.location.reload();
    }, 300);
});

_reg('/', (_, cmd_split) => {
    if (cmd_split[1] === 'i') {
        if (cmd_split[2] === 'love') {
            print('you!');
        } else if (cmd_split[2]) {
            imp(cmd_split[2],cmd_split[3]);
            print(`Imported: ${cmd_split[3]}`);
        } else {
            error(1);
        }
    } else if (cmd_split[1] === 'dir') {
        let output = '';
        if (cmdUtil.length === 0) {
            print('No Modules available.');
        } else {
            cmdUtil.forEach((util, index) => {
                output += `<br> ${index + 1}. ${util.link}`;
            });
            print(output);
        }
    } else {
        error(1);
    }
});


// non-registered commands

function imp(linkClass, link) {
    const newUtil = {linkClass, link};
    cmdUtil.push(newUtil);
    saveUtils();

    renderUtils();
}

console.log(cmdUtil)

function renderUtils() {
    if (cmdUtil.length === 0) {
        print('No Modules available.');
    } 

    let serverMaintain = true

    cmdUtil.forEach(util => {
        let adder = '';
        if (util.linkClass === '**') {
            adder = 'public/base-modules/';
            const scriptTag = document.createElement('script');
            scriptTag.src = adder + util.link + '.js';
            document.body.appendChild(scriptTag);
            scriptTag.type = 'module';

            scriptTag.onload = () => print(`Script loaded: ${scriptTag.src}`);
        } else if (util.linkClass === '**sv' && serverMaintain) {
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
    if (key.startsWith("cmd")) {
        handleCommand(value.trim());
    }
}

// - joel mulonde 2025







