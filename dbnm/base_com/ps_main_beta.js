// Constants
const ps_use = 'main';
export let cmdUtil = JSON.parse(localStorage.getItem('cmdUtil')) || [];
export {
    initializeUI,
    renderInitialInfo,
    print,
    u_print,
    parseCommand,
    _reg,
    handleCommand,
    imp,
    renderUtils,
    saveUtils,
    setupInputListener,
    initialize_db,
    error
};

export const module_meta = [
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
        <div>Desc: ${db_info.desc}</div>
        <br> > v ${db_info.v}
    `;
    print(infoHTML);
}

//  
// Print to UI
function print(value) {
    const val_html = `<div class=" g-3"><span>db$</span> ${value}</div>`;
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

// Command Handlers Registry
const commandHandlers = {};

// Register Command Handler
function _reg(command, handler) {
    commandHandlers[command.toLowerCase()] = handler;
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

_reg('hello', () => {
    if (db_ui.output) {
        print('hello!')
    }
});

_reg('**t', () => {
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

function renderUtils() {
    if (cmdUtil.length === 0) {
        print('No Modules available.');
    } 

    let serverMaintain = true

    cmdUtil.forEach(util => {
        let adder = '';
        if (util.linkClass === '**') {
            adder = 'public/base-class/';
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

// - joel mulonde 2025







