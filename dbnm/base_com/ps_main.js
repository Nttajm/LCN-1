let ps_use = 'main'; // use in case using a different os.
let last_selected = null;

const commandHandlers = {};
let awaiting = false;
let awaiting_cmd = null;
let directory = null;
let versionII = '1.3.2';
const storedUserData = JSON.parse(localStorage.getItem('dbnm_userData'));
let suggestionsEnabled = !!storedUserData?.suggestions;


// Single object for all user-related data
let userData = storedUserData || {
    username: null,
    cmdUtil: [],
    sessionId: null,
    suggestions: suggestionsEnabled,
    OS_USE_ARRAY: [
        'dbnm.lcnjoel',
    ]
};

if (typeof userData.suggestions === 'undefined') userData.suggestions = suggestionsEnabled;

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
    author: 'LCN',
    os: 'dbnm'
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

let keyWords = [
    'by',
    'full',
    'as',
    'has',
];


const dbnm_settings = [
    {
        name: 'suggestions',
        func: toggleSuggestions,
        state: suggestionsEnabled
    }
]
// UI Elements
const db_ui = {
    input: document.getElementById('input'),
    output: document.getElementById('output'),
    loaders: [],
};

// Initialize UI
function initializeUI() {
    if (db_ui.input && db_ui.output) {
        renderInitialInfo();
        serverInit()
        const promptElem = document.querySelector('.prompt');
        if (userData.username) {
            promptElem.textContent = `${userData.username || ''} ~ $`;
        }
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

function makeLoader(index) {
    const loaderDiv = document.createElement('div');
    loaderDiv.className = 'loader';
    loaderDiv.innerHTML = `
        <div class="dots">
            <div class="top t_di">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
            <div class="middle t_di">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
            <div class="bottom t_di">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div> 
        </div>
    `;
    db_ui.loaders.push(loaderDiv);
    db_ui.output.appendChild(loaderDiv);
    if (index === 'rm') {
        const loaders = document.querySelectorAll('.loader');
        loaders.forEach(loader => {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        });
        db_ui.loaders = [];
        return;
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

_reg('settings', (args, cmd_split) => {
    const action = cmd_split[0].toLowerCase();
    const name = (cmd_split[1] || '').toLowerCase();
    const value = (cmd_split[2] || '').toLowerCase();

    const renderList = () => {
        if (!dbnm_settings.length) {
            print('No settings available.');
            return;
        }
        let out = '<br> Settings:';
        dbnm_settings.forEach((s, i) => {
            const isOn = s.name === 'suggestions'
                ? !!suggestionsEnabled
                : !!s.state;
            out += `<br> ${i + 1}. ${s.name}: ${isOn ? 'on' : 'off'}`;
        });
        print(out);
    };

    const applySetting = (setting, desiredOn) => {
        if (setting.name === 'suggestions') {
            suggestionsEnabled = desiredOn;
            setting.state = desiredOn;
            userData.suggestions = desiredOn;
            saveData();
            if (typeof toggleSuggestions === 'function') toggleSuggestions();
        } else {
            setting.state = desiredOn;
        }
        print(`Setting '${setting.name}' is now ${desiredOn ? 'on' : 'off'}`);
    };

    // No args => list all settings
    if (!name) {
        renderList();
        return;
    }

    const setting = dbnm_settings.find(s => s.name.toLowerCase() === name);
    if (!setting) {
        e_print(`Unknown setting: ${name}`);
        return;
    }

    // Only name => show that one
    if (!value) {
        const isOn = setting.name === 'suggestions'
            ? !!suggestionsEnabled
            : !!setting.state;
        print(`${setting.name}: ${isOn ? 'on' : 'off'}`);
        return;
    }

    if (value !== 'on' && value !== 'off') {
        e_print(`Usage: ${action} <name> <on|off>`);
        return;
    }

    applySetting(setting, value === 'on');
});

_reg('setting', (args, cmd_split) => {
    commandHandlers['settings'](args, cmd_split);
});

function toggleSuggestions() {
    const input = db_ui.input;
    if (!input) return;

    // Get all available commands for suggestions
    const getCommands = () => Object.keys(commandHandlers);

    // Create or get suggestion container
    let suggestionBox = document.getElementById('suggestion-box');
    if (!suggestionBox) {
        suggestionBox = document.createElement('div');
        suggestionBox.id = 'suggestion-box';
        suggestionBox.style.cssText = `
            display: none;
            background: #252526;
            border: 1px solid #454545;
            font-family: monospace;
            font-size: 0.9rem;
            max-width: 400px;
            margin-top: 2px;
        `;
        input.parentElement.insertAdjacentElement('afterend', suggestionBox);
    }

    // Avoid attaching duplicate listeners if toggleSuggestions is called again.
    if (input.dataset.suggestBound === '1') {
        if (!suggestionsEnabled) suggestionBox.style.display = 'none';
        return;
    }
    input.dataset.suggestBound = '1';

    // Highlight matching text
    const highlightMatch = (text, query) => {
        const idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return text;
        return text.slice(0, idx) + 
            `<span style="color: #569cd6;">${text.slice(idx, idx + query.length)}</span>` + 
            text.slice(idx + query.length);
    };

    const parseCmdSplitLiterals = (handler) => {
        const out = new Map();
        if (typeof handler !== 'function') return out;
        const src = String(handler);

        // Matches: cmd_split[1] === 'i'  OR  cmd_split[2] == "set"
        const re = /cmd_split\[(\d+)\]\s*={2,3}\s*'([^']+)'/g;
        let match;
        while ((match = re.exec(src)) !== null) {
            const idx = parseInt(match[1], 10);
            const value = match[2];
            if (!out.has(idx)) out.set(idx, new Set());
            out.get(idx).add(value);
        }
        // Also match double quotes
        const re2 = /cmd_split\[(\d+)\]\s*={2,3}\s*"([^"]+)"/g;
        while ((match = re2.exec(src)) !== null) {
            const idx = parseInt(match[1], 10);
            const value = match[2];
            if (!out.has(idx)) out.set(idx, new Set());
            out.get(idx).add(value);
        }
        return out;
    };

    const buildSuggestionIndex = () => {
        const index = new Map();
        for (const [cmd, handler] of Object.entries(commandHandlers)) {
            index.set(cmd, parseCmdSplitLiterals(handler));
        }
        return index;
    };

    const scoreAndSort = (items, query) => {
        const q = query.toLowerCase();
        return items
            .map(s => {
                const lower = s.toLowerCase();
                const pos = q ? lower.indexOf(q) : 0;
                return { s, pos: pos === -1 ? 9999 : pos };
            })
            .sort((a, b) => a.pos - b.pos || a.s.localeCompare(b.s))
            .map(x => x.s);
    };

    const applySuggestion = (rawValue, tokenIndex, suggestion) => {
        const hasTrailingSpace = /\s$/.test(rawValue);
        const tokens = rawValue.trim().length ? rawValue.trim().split(/\s+/) : [];

        if (tokenIndex >= tokens.length) {
            tokens.push(suggestion);
        } else {
            tokens[tokenIndex] = suggestion;
        }

        // For subcommands, keep a trailing space to continue typing.
        const addSpace = tokenIndex > 0 || hasTrailingSpace;
        input.value = tokens.join(' ') + (addSpace ? ' ' : '');
        suggestionBox.style.display = 'none';
    };

    // Filter and render suggestions
    const showSuggestions = (rawValue) => {
        if (!suggestionsEnabled) {
            suggestionBox.style.display = 'none';
            return;
        }

        const hasTrailingSpace = /\s$/.test(rawValue);
        const tokens = rawValue.trim().length ? rawValue.trim().split(/\s+/) : [];
        const tokenIndex = hasTrailingSpace ? tokens.length : Math.max(tokens.length - 1, 0);
        const currentToken = hasTrailingSpace ? '' : (tokens[tokenIndex] || '');
        const query = currentToken;

        const suggestionIndex = buildSuggestionIndex();

        let candidates = [];
        let matches = [];

        if (tokenIndex === 0) {
            // Top-level commands: require 3+ chars, filter by relevance
            if (query.length < 3) {
                suggestionBox.style.display = 'none';
                return;
            }
            candidates = getCommands();
            matches = scoreAndSort(
                candidates.filter(s => s.toLowerCase().includes(query.toLowerCase())),
                query
            ).slice(0, 6);
        } else {
            // Subcommands: show all options alphabetically (no query filtering)
            const base = (tokens[0] || '').toLowerCase();
            const byCmd = suggestionIndex.get(base);
            const set = byCmd?.get(tokenIndex);
            candidates = set ? Array.from(set).sort() : [];
            matches = candidates.slice(0, 6);
        }

        if (matches.length === 0) {
            suggestionBox.style.display = 'none';
            return;
        }

        const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        suggestionBox.innerHTML = matches.map((cmd, i) => {
            const isTop = i === 0;
            return `<div style="
                padding: 3px 8px;
                display: flex;
                justify-content: space-between;
                background: ${isTop ? '#04395e' : 'transparent'};
                cursor: pointer;
            " data-cmd="${escapeAttr(cmd)}" data-token-index="${tokenIndex}">
                <span>${highlightMatch(escapeHtml(cmd), query)}</span>
                ${isTop ? '<span style="color: #888; font-size: 0.8rem;">tab</span>' : ''}
            </div>`;
        }).join('');

        suggestionBox.style.display = 'block';
    };

    // Handle tab completion
    const handleTab = (e) => {
        if (!suggestionsEnabled) return;
        if (e.key === 'Tab' && suggestionBox.style.display === 'block') {
            e.preventDefault();
            const topItem = suggestionBox.querySelector('[data-cmd]');
            if (topItem) {
                const tokenIndex = parseInt(topItem.dataset.tokenIndex || '0', 10);
                applySuggestion(input.value, tokenIndex, topItem.dataset.cmd);
            }
        }
        if (e.key === 'Escape') {
            suggestionBox.style.display = 'none';
        }
    };

    // Add event listeners
    input.addEventListener('input', (e) => {
        showSuggestions(e.target.value);
    });

    input.addEventListener('keydown', handleTab);

    // Click to select suggestion
    if (suggestionBox.dataset.suggestBound !== '1') {
        suggestionBox.dataset.suggestBound = '1';
        suggestionBox.addEventListener('click', (e) => {
        const item = e.target.closest('[data-cmd]');
        if (item) {
            const tokenIndex = parseInt(item.dataset.tokenIndex || '0', 10);
            applySuggestion(input.value, tokenIndex, item.dataset.cmd);
            input.focus();
        }
        });
    }

    // Re-setup the enter key listener
    setupInputListener();
}

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
// / i 
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
        if (!containsKeyWord(cmd_split[2])) {
            const cmd_2 = cmd_split[2];
            removeDir(cmd_2);
            y_print(`File: ${cmd_2} has been removed`);
        } else {
            if (cmd_split[2] == 'by') {
                const index = cmd_split[4];
                const success = removeDirByIndex(index);
                if (success) {
                    y_print(`File at index ${index} has been removed`);
                } else {
                    e_print(`Invalid index: ${index}`);
                }
            }
        }
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


function removeDirByIndex(index) {
    // Accept both number and string indices
    const idx = typeof index === 'number' ? index : parseInt(index, 10);

    if (isNaN(idx)) return false;

    const cmdUtil = userData.cmdUtil;

    // Zero-based index bounds check
    if (idx < 0 || idx >= cmdUtil.length) return false;

    cmdUtil.splice(idx, 1);
    saveData();
    return true;
}

function containsKeyWord(input) {
    return keyWords.some(keyword => input.includes(keyword));
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
    userData.suggestions = !!suggestionsEnabled;
    localStorage.setItem('dbnm_userData', JSON.stringify(userData));
}

function serverInit() {}

// Event Listener for Commands
function setupInputListener() {
    if (db_ui.input && !db_ui.input.dataset.listenerBound) {
        db_ui.input.dataset.listenerBound = '1';
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
    if (typeof toggleSuggestions === 'function') toggleSuggestions();
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
