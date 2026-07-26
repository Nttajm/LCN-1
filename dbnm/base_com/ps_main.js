let ps_use = 'main'; // use in case using a different os.
let last_selected = null;
let timeLiveInterval = null;

const commandHandlers = {};
const pkgContentsMap = {};
let awaiting = false;
let awaiting_cmd = null;
let directory = null;
let versionII = '1.4.2';
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
    ],
    vars: {},
    databases: null,
    pakeger: {
        keys: [],
        clipPref: 'ask'
    },
    textos: {
        deviceId: null,
        deviceName: null,
        boundDbId: null,
        seeThroughKey: null,
        activeRoomId: null,
        setupShown: false
    }
};

if (typeof userData.suggestions === 'undefined') userData.suggestions = suggestionsEnabled;

function ensureUserDataShape() {
    if (!userData.vars || typeof userData.vars !== 'object') userData.vars = {};
    if (!userData.pakeger || typeof userData.pakeger !== 'object') {
        userData.pakeger = { keys: [], clipPref: 'ask' };
    }
    if (!Array.isArray(userData.pakeger.keys)) userData.pakeger.keys = [];
    if (!userData.pakeger.clipPref) userData.pakeger.clipPref = 'ask';
    if (!userData.textos || typeof userData.textos !== 'object') {
        userData.textos = {
            deviceId: null,
            deviceName: null,
            boundDbId: null,
            seeThroughKey: null,
            activeRoomId: null,
            setupShown: false
        };
    }
}

function migrateLegacyStorage() {
    let changed = false;
    const legacyVars = localStorage.getItem('dbnm_vars');
    const legacyDb = localStorage.getItem('dbnm_databases');
    const legacyPak = localStorage.getItem('dbnm_pakeger_keys');
    const legacyClip = localStorage.getItem('dbnm_pakeger_clip_pref');

    if (legacyVars) {
        try {
            const parsed = JSON.parse(legacyVars);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                userData.vars = { ...parsed, ...userData.vars };
            }
        } catch (_) { /* ignore */ }
        localStorage.removeItem('dbnm_vars');
        changed = true;
    }
    if (legacyDb) {
        try {
            const parsed = JSON.parse(legacyDb);
            if (parsed && typeof parsed === 'object') userData.databases = parsed;
        } catch (_) { /* ignore */ }
        localStorage.removeItem('dbnm_databases');
        changed = true;
    }
    if (legacyPak) {
        try {
            const parsed = JSON.parse(legacyPak);
            if (Array.isArray(parsed) && !userData.pakeger.keys.length) {
                userData.pakeger.keys = parsed;
            }
        } catch (_) { /* ignore */ }
        localStorage.removeItem('dbnm_pakeger_keys');
        changed = true;
    }
    if (legacyClip) {
        userData.pakeger.clipPref = legacyClip;
        localStorage.removeItem('dbnm_pakeger_clip_pref');
        changed = true;
    }
    return changed;
}

function saveData() {
    userData.suggestions = !!suggestionsEnabled;
    localStorage.setItem('dbnm_userData', JSON.stringify(userData));
}

ensureUserDataShape();
if (migrateLegacyStorage()) saveData();

window.userData = userData;
window.saveData = saveData;

let dbnm_vars = userData.vars;
window.dbnm_vars = dbnm_vars;

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

let gloabl_vars = {
};

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

function getPromptText() {
    const name = (userData.username || '').trim();
    const userPart = name || 'user';
    if (directory) {
        return `(${directory}): ${userPart} $`;
    }
    return name ? `${name} $` : '> $';
}

function setDirectory(name) {
    const key = String(name || '').trim();
    if (!key) {
        directory = null;
        updatePromptDisplay();
        return true;
    }
    if (!commandHandlers[key.toLowerCase()]) {
        return false;
    }
    directory = key;
    updatePromptDisplay();
    return true;
}

function clearDirectory() {
    directory = null;
    updatePromptDisplay();
}

window.setDirectory = setDirectory;
window.clearDirectory = clearDirectory;

function updatePromptDisplay() {
    const promptElem = document.querySelector('.prompt');
    if (promptElem) promptElem.textContent = getPromptText();
}

function scrollOutputToBottom() {
    requestAnimationFrame(() => {
        if (db_ui.input) {
            db_ui.input.scrollIntoView({ block: 'end', behavior: 'auto' });
            return;
        }
        const root = document.documentElement;
        window.scrollTo({ top: root.scrollHeight, behavior: 'auto' });
    });
}

function appendOutput(html) {
    if (!db_ui.output) return;
    db_ui.output.innerHTML += html;
    scrollOutputToBottom();
}

window.scrollOutputToBottom = scrollOutputToBottom;
window.appendOutput = appendOutput;

// Initialize UI
function initializeUI() {
    if (db_ui.input && db_ui.output) {
        renderInitialInfo();
        serverInit();
        updatePromptDisplay();
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
    ensureUtilIndices();
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
    scrollOutputToBottom();
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
    appendOutput(val_html);
    return value;
}

function warning(value) {
    const val_html = `<div class=" g-3">[<span class='red b'>!</span>] </code>${value}</code>`;
    appendOutput(val_html);
    return value;
}

function g_print(value) {
    const val_html = `<div class=" g-3 green"><span> ${value}</span></div>`;
    appendOutput(val_html);
    return value;
}

function e_print(value) {
    const val_html = `<div class=" g-3 red"><span> ${value}</span></div>`;
    appendOutput(val_html);
    return value;
}

function y_print(value) {
    const val_html = `<div class=" g-3 yellow"><span> ${value}</span></div>`;
    appendOutput(val_html);
    return value;
}

function c_print(value , custom) {
    const val_html = `<div class=" g-3"><span>${custom}</span> ${value}</div>`;
    appendOutput(val_html);
    return value;
}

function u_print(value) {
    const val_html = `<div class=" g-3"><span class="prompt">${getPromptText()}</span> ${value}</div>`;
    appendOutput(val_html);
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
    appendOutput(val_html);
    return value;
}

function tip_print(value) {
    const val_html = `<div class="g-3 tip-print">${value}</div>`;
    appendOutput(val_html);
    return value;
}

// Parse Commands
let unawaitTimer = null;

function _await(value) {
    if (unawaitTimer) {
        clearTimeout(unawaitTimer);
        unawaitTimer = null;
    }
    awaiting = true;
    awaiting_cmd = value || null;
}

function unawait() {
    if (unawaitTimer) clearTimeout(unawaitTimer);
    unawaitTimer = setTimeout(() => {
        awaiting = false;
        awaiting_cmd = null;
        unawaitTimer = null;
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
    if (cmd === 'cd..') clearDirectory();

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
    if (timeLiveInterval) {
        clearInterval(timeLiveInterval);
        timeLiveInterval = null;
    }
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
    g_print('hello!');
    tip_print('more help → <a href="https://lcnjoel.com/dbnm/docs" target="_blank" rel="noopener noreferrer" class="light-blue u">lcnjoel.com/dbnm/docs</a>');
});

_reg('cd', (_, cmd_split) => {
    if (cmd_split[1] === '') {
        print('specify a directory to change to.');
    } else if (!setDirectory(cmd_split[1])) {
        e_print(`Cannot change to directory '${cmd_split[1]}': it's not a command`);
    }
});

_reg('cd..', () => {
    clearDirectory();
});

_reg('x dir', () => {
    userData.cmdUtil = [];
    saveData();
});

_reg('r', () => {
    window.location.reload();
});

function timeLive() {
    if (timeLiveInterval) {
        clearInterval(timeLiveInterval);
        timeLiveInterval = null;
    }

    const clockId = 'time-live-' + Date.now();
    const dir_space = directory ? directory : 'db';
    const val_html = `<div class="g-3" id="${clockId}"><span class="print_out">${dir_space}$</span> <span class="time-live-display">${new Date().toLocaleTimeString()}</span></div>`;
    appendOutput(val_html);

    const display = document.querySelector(`#${clockId} .time-live-display`);
    if (display) {
        timeLiveInterval = setInterval(() => {
            display.textContent = new Date().toLocaleTimeString();
        }, 1000);
    }
}

_reg('time', (_, cmd_split) => {
    if (cmd_split[1] === 'full') {
        print(new Date().toLocaleString());
    } else if (cmd_split[1] === 'live') {
        timeLive();
    } else {
        print(new Date().toLocaleTimeString());
    }
});

_reg('time.live', () => {
    timeLive();
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

/* ── database manager ───────────────────────────────────────── */
(function loadDatabaseStyles() {
    if (document.getElementById('dbmgr-style')) return;
    const style = document.createElement('style');
    style.id = 'dbmgr-style';
    style.textContent = `
        .db-dim { color: #7a7a7a; }
        .db-panel {
            border: 1px solid #333;
            border-radius: 2px;
            padding: 0.5rem 0.65rem;
            margin: 0.35rem 0;
            background: rgba(255,255,255,0.02);
        }
        .db-choices .choice { cursor: pointer; }
        .db-ok { color: rgb(91, 202, 91); }
    `;
    document.head.appendChild(style);
})();

const DB_EXTERNAL_PROVIDERS = {
    firebase: {
        type: 'firebase',
        label: 'Firebase',
        configKey: 'firebaseConfig',
        keys: ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId', 'databaseURL'],
        hint: 'Firebase console → project settings',
        placeholder: '{ apiKey: "…", projectId: "…" }',
        parseFail: 'expected apiKey, authDomain, projectId, …',
        color: 'yellow',
        flavor: 'Google BaaS · paste config snippet',
        aliases: ['firebase', 'fb', 'paste', 'config']
    },
    supabase: {
        type: 'supabase',
        label: 'Supabase',
        configKey: 'supabaseConfig',
        keys: ['url', 'anonKey', 'supabaseUrl', 'supabaseKey', 'serviceRoleKey', 'projectUrl'],
        hint: 'Supabase → Project Settings → API · URL + anon key',
        placeholder: '{ url: "https://xxx.supabase.co", anonKey: "…" }',
        parseFail: 'expected url (or supabaseUrl) and anonKey',
        color: 'green',
        flavor: 'Postgres BaaS · paste API keys',
        aliases: ['supabase', 'sb']
    },
    mongodb: {
        type: 'mongodb',
        label: 'MongoDB Atlas',
        configKey: 'mongodbConfig',
        keys: ['connectionString', 'uri', 'mongodbUri', 'database', 'dbName'],
        hint: 'Atlas → Connect → copy connection string',
        placeholder: 'mongodb+srv://user:pass@cluster.mongodb.net/mydb',
        parseFail: 'expected mongodb:// or mongodb+srv:// URI',
        color: 'muted-teal',
        flavor: 'document DB · paste connection URI',
        aliases: ['mongodb', 'mongo', 'atlas']
    },
    appwrite: {
        type: 'appwrite',
        label: 'Appwrite',
        configKey: 'appwriteConfig',
        keys: ['endpoint', 'projectId', 'project', 'project_id', 'apiKey'],
        hint: 'Appwrite console → project · endpoint + project ID',
        placeholder: '{ endpoint: "https://cloud.appwrite.io/v1", projectId: "…" }',
        parseFail: 'expected endpoint and projectId',
        color: 'coral',
        flavor: 'open-source BaaS · paste project config',
        aliases: ['appwrite', 'aw']
    }
};
const DB_EXTERNAL_BY_TYPE = Object.fromEntries(
    Object.values(DB_EXTERNAL_PROVIDERS).map(p => [p.type, p])
);
const DB_DEFAULT_SERVER = {
    type: 'foundation',
    label: 'LCN Foundation Server',
    desc: 'free to use · foundationServer.js'
};

function emptyServerBinding() {
    return { type: 'none', label: 'Not connected' };
}

function isServerConnected(entry) {
    return !!(entry?.server && entry.server.type && entry.server.type !== 'none');
}

let dbSession = null;

function dbEscape(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function defaultDatabasesState() {
    const id = 'default';
    return {
        active: id,
        items: {
            [id]: {
                id,
                name: 'default',
                createdAt: Date.now(),
                server: emptyServerBinding(),
                vars: {}
            }
        }
    };
}

function loadDatabases() {
    try {
        const raw = userData.databases;
        if (raw && raw.items && typeof raw.items === 'object') {
            if (!raw.active || !raw.items[raw.active]) {
                const first = Object.keys(raw.items)[0];
                raw.active = first || null;
            }
            return raw;
        }
    } catch (_) { /* fall through */ }
    const def = defaultDatabasesState();
    userData.databases = def;
    return def;
}

let databases = loadDatabases();
window.databases = databases;
syncServerVars();

function syncServerVars() {
    const active = getActiveDatabase();
    if (!active) {
        window.server_vars = {};
        return;
    }
    const out = { ...(active.vars || {}) };
    if (active.server?.type === 'global_vars' && out.varKey) {
        const globalStore = window.dbnm_vars || {};
        const linked = globalStore[out.varKey];
        out.linkedVar = out.varKey;
        out.linkedValue = linked;
        if (linked !== undefined && linked !== null && typeof linked === 'object' && !Array.isArray(linked)) {
            out.firebaseConfig = linked;
        }
    }
    window.server_vars = out;
}

function saveDatabases() {
    userData.databases = databases;
    window.databases = databases;
    syncServerVars();
    saveData();
}

function getActiveDatabase() {
    if (!databases.active || !databases.items[databases.active]) return null;
    return databases.items[databases.active];
}

function listDatabaseEntries() {
    return Object.values(databases.items || {}).sort((a, b) =>
        (a.createdAt || 0) - (b.createdAt || 0)
    );
}

function resolveDatabaseRef(ref) {
    if (ref === undefined || ref === null || ref === '') return null;
    const raw = String(ref).trim();
    if (!isNaN(raw) && raw !== '') {
        const idx = parseInt(raw, 10);
        const list = listDatabaseEntries();
        return list[idx] || null;
    }
    const key = raw.toLowerCase();
    return listDatabaseEntries().find(d =>
        d.id === raw || d.name.toLowerCase() === key
    ) || null;
}

function slugDatabaseName(name) {
    const base = String(name || 'db')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'db';
    let id = base;
    let n = 2;
    while (databases.items[id]) {
        id = `${base}-${n++}`;
    }
    return id;
}

function formatVarValue(value) {
    if (value !== null && typeof value === 'object') {
        return `<span class="muted-teal">{object}</span> ${dbEscape(JSON.stringify(value))}`;
    }
    return dbEscape(String(value));
}

function dbBanner(subtitle) {
    print('<br><span class="muted-teal b">database</span> <span class="db-dim">manager</span>');
    if (subtitle) print(`<span class="db-dim">${subtitle}</span>`);
    print('<span class="db-dim">────────────────────────────────</span>');
}

function dbHelp() {
    dbBanner('global databases · server binding');
    print('<span class="db-dim">select</span>');
    print('  <span class="light-blue">database list</span>                 list databases');
    print('  <span class="light-blue">database create &lt;name&gt;</span>         create and select');
    print('  <span class="light-blue">database select &lt;name|index&gt;</span>   set active database');
    print('  <span class="light-blue">database use &lt;name|index&gt;</span>      alias for select');
    print('  <span class="light-blue">database status</span>               active database summary');
    print('  <span class="light-blue">database rm &lt;name|index&gt;</span>       remove a database');
    print('<span class="db-dim">server</span>');
    print('  <span class="light-blue">database server</span>               choose server type');
    print('  <span class="light-blue">database server info</span>          show bound server');
    print('  <span class="light-blue">database server firebase</span>      paste Firebase config');
    print('  <span class="light-blue">database server supabase</span>      paste Supabase URL + anon key');
    print('  <span class="light-blue">database server mongodb</span>       paste MongoDB Atlas URI');
    print('  <span class="light-blue">database server appwrite</span>      paste Appwrite endpoint + project');
    print('  <span class="light-blue">database server global &lt;key&gt;</span>   link a dbnm var as server config');
    print('  <span class="light-blue">database server default</span>       connect LCN foundation server · free');
    print('  <span class="light-blue">database server foundation</span>    alias for default');
    print('<span class="db-dim">server vars</span>');
    print('  <span class="light-blue">database var</span>                  read linked server var');
    print('  <span class="light-blue">database var &lt;key&gt; &lt;value&gt;</span>    set linked var (via var key)');
    print('  <span class="light-blue">database var &lt;key&gt; delete</span>     remove linked var');
    print('  <span class="db-dim">object values allowed (e.g. firebaseConfig)</span>');
    tip_print('aliases: db · dbmgr');
}

function dbStatus() {
    const active = getActiveDatabase();
    const count = listDatabaseEntries().length;
    dbBanner('status');
    if (!active) {
        print('<span class="db-dim">no active database</span>');
        tip_print('database create &lt;name&gt;');
        return;
    }
    const serverLabel = isServerConnected(active)
        ? (active.server.label || active.server.type)
        : 'not connected';
    const rows = [
        `<span class="muted-teal">│</span> <span class="db-dim">active</span>  <span class="light-blue b">${dbEscape(active.name)}</span>`,
        `<span class="muted-teal">│</span> <span class="db-dim">id</span>      <span class="db-dim">${dbEscape(active.id)}</span>`,
        `<span class="muted-teal">│</span> <span class="db-dim">server</span>  <span class="${isServerConnected(active) ? 'yellow' : 'db-dim'}">${dbEscape(serverLabel)}</span>`,
        ...(isServerConnected(active) && active.server?.desc ? [`<span class="muted-teal">│</span> <span class="db-dim">note</span>    <span class="db-dim">${dbEscape(active.server.desc)}</span>`] : []),
        `<span class="muted-teal">│</span> <span class="db-dim">vars</span>    <span class="muted-teal">${Object.keys(active.vars || {}).length}</span>`,
        `<span class="muted-teal">│</span> <span class="db-dim">total</span>   <span class="muted-teal">${count} database${count === 1 ? '' : 's'}</span>`
    ];
    print(`<div class="db-panel"><div><span class="muted-teal">┌</span> session</div>${rows.map(r => `<div>${r}</div>`).join('')}<div><span class="muted-teal">└</span></div></div>`);
    tip_print(isServerConnected(active) ? 'database server  ·  database var' : 'database server  — connect a server source');
}

function dbList() {
    const list = listDatabaseEntries();
    if (!list.length) {
        print('No databases.');
        tip_print('database create &lt;name&gt;');
        return;
    }
    const pad = Math.max(...list.map(d => d.name.length));
    let out = `<br><span class="muted-teal">${list.length} database${list.length === 1 ? '' : 's'}</span>`;
    list.forEach((d, i) => {
        const mark = d.id === databases.active
            ? ' <span class="db-ok">●</span>'
            : ' <span class="db-dim">○</span>';
        const srv = isServerConnected(d)
            ? (d.server.label || d.server.type)
            : 'not connected';
        out += `<br><span class="muted-teal">${i}.</span> <span class="light-blue">${dbEscape(d.name.padEnd(pad))}</span>${mark} <span class="db-dim">${dbEscape(srv)}</span>`;
    });
    print(out);
    tip_print('database select &lt;name|index&gt;');
}

function dbCreate(name) {
    if (!name) {
        e_print('Usage: database create <name>');
        return;
    }
    const id = slugDatabaseName(name);
    databases.items[id] = {
        id,
        name: String(name).trim(),
        createdAt: Date.now(),
        server: emptyServerBinding(),
        vars: {}
    };
    databases.active = id;
    saveDatabases();
    g_print(`created <span class="light-blue">${dbEscape(databases.items[id].name)}</span> <span class="db-dim">· selected</span>`);
}

function dbSelect(ref) {
    const entry = resolveDatabaseRef(ref);
    if (!entry) {
        e_print(`Database not found: ${ref}`);
        return;
    }
    databases.active = entry.id;
    saveDatabases();
    g_print(`selected <span class="light-blue">${dbEscape(entry.name)}</span>`);
}

function dbRemove(ref) {
    const entry = resolveDatabaseRef(ref);
    if (!entry) {
        e_print(`Database not found: ${ref}`);
        return;
    }
    if (Object.keys(databases.items).length === 1) {
        e_print('Cannot remove the last database.');
        return;
    }
    delete databases.items[entry.id];
    if (databases.active === entry.id) {
        databases.active = Object.keys(databases.items)[0];
    }
    saveDatabases();
    y_print(`removed <span class="light-blue">${dbEscape(entry.name)}</span>`);
    if (databases.active) {
        tip_print(`active → ${databases.items[databases.active].name}`);
    }
}

function resolveExternalProviderId(ref) {
    const key = String(ref || '').toLowerCase();
    if (DB_EXTERNAL_PROVIDERS[key]) return key;
    for (const [id, def] of Object.entries(DB_EXTERNAL_PROVIDERS)) {
        if (def.aliases.includes(key)) return id;
    }
    return null;
}

function pickConfigFields(obj, keys) {
    const out = {};
    keys.forEach((k) => {
        if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
            out[k] = String(obj[k]);
        }
    });
    return out;
}

function parseConfigPairs(text, keys) {
    const cfg = {};
    const pairRe = /(?:["']?)([a-zA-Z][a-zA-Z0-9_]*)(?:["']?)\s*[:=]\s*(?:["']([^"']*)["']|([^\s,;}\n]+))/g;
    let m;
    while ((m = pairRe.exec(text)) !== null) {
        const key = m[1];
        const val = m[2] !== undefined ? m[2] : m[3];
        if (keys.includes(key)) cfg[key] = val;
    }
    return cfg;
}

function normalizeExternalConfig(providerId, raw, text) {
    const picked = pickConfigFields(raw, DB_EXTERNAL_PROVIDERS[providerId].keys);
    if (providerId === 'firebase') {
        return Object.keys(picked).length ? picked : null;
    }
    if (providerId === 'supabase') {
        const url = picked.url || picked.supabaseUrl || picked.projectUrl || raw.url || raw.supabaseUrl;
        const anonKey = picked.anonKey || picked.supabaseKey || raw.anonKey || raw.supabaseKey;
        const out = {};
        if (url) out.url = String(url);
        if (anonKey) out.anonKey = String(anonKey);
        if (picked.serviceRoleKey) out.serviceRoleKey = picked.serviceRoleKey;
        return (out.url && out.anonKey) ? out : null;
    }
    if (providerId === 'mongodb') {
        const trimmed = String(text || '').trim();
        if (trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://')) {
            return { connectionString: trimmed };
        }
        const cs = picked.connectionString || picked.uri || picked.mongodbUri || raw.connectionString || raw.uri;
        if (!cs) return null;
        const out = { connectionString: String(cs) };
        const db = picked.database || picked.dbName || raw.database || raw.dbName;
        if (db) out.database = String(db);
        return out;
    }
    if (providerId === 'appwrite') {
        const endpoint = picked.endpoint || raw.endpoint || raw.host;
        const projectId = picked.projectId || picked.project || picked.project_id || raw.projectId || raw.project;
        const out = {};
        if (endpoint) out.endpoint = String(endpoint);
        if (projectId) out.projectId = String(projectId);
        if (picked.apiKey || raw.apiKey) out.apiKey = String(picked.apiKey || raw.apiKey);
        return (out.endpoint && out.projectId) ? out : null;
    }
    return Object.keys(picked).length ? picked : null;
}

function parseExternalConfigText(raw, providerId) {
    const def = DB_EXTERNAL_PROVIDERS[providerId];
    if (!def) return null;
    const text = String(raw || '').trim();
    if (!text) return null;

    if (providerId === 'mongodb' && (text.startsWith('mongodb://') || text.startsWith('mongodb+srv://'))) {
        return normalizeExternalConfig(providerId, {}, text);
    }

    try {
        const asJson = JSON.parse(text);
        if (asJson && typeof asJson === 'object' && !Array.isArray(asJson)) {
            const normalized = normalizeExternalConfig(providerId, asJson, text);
            if (normalized) return normalized;
        }
    } catch (_) { /* continue */ }

    const pairs = parseConfigPairs(text, def.keys);
    return normalizeExternalConfig(providerId, pairs, text);
}

function printConfigTree(label, config) {
    print(`<span class="db-dim">${dbEscape(label)}</span>`);
    Object.keys(config).forEach((k, i, arr) => {
        const branch = i === arr.length - 1 ? '└─' : '├─';
        print(`<span class="yellow">${branch}</span> <span class="light-blue">${k}</span> <span class="db-dim">${dbEscape(config[k])}</span>`);
    });
}

function setServerExternal(providerId, config) {
    const def = DB_EXTERNAL_PROVIDERS[providerId];
    if (!def) return;
    if (!config || !Object.keys(config).length) {
        e_print(`${def.label} requires a config. Use: database server ${providerId}`);
        return;
    }
    applyServerBinding(def.type, def.label, {
        provider: def.type,
        [def.configKey]: config
    });
    const active = getActiveDatabase();
    if (active) {
        active.server.desc = def.hint;
        saveDatabases();
    }
    printConfigTree(def.configKey, config);
}

function parseFirebaseConfigText(raw) {
    return parseExternalConfigText(raw, 'firebase');
}

function endDbSession() {
    if (dbSession?.onKey) {
        db_ui.input.removeEventListener('keydown', dbSession.onKey);
    }
    if (dbSession?.onChoice) {
        document.removeEventListener('keydown', dbSession.onChoice);
    }
    dbSession = null;
    c_placeholder('');
    unawait();
}

function applyServerBinding(type, label, extraVars) {
    const active = getActiveDatabase();
    if (!active) {
        e_print('No active database. Create one first.');
        return false;
    }
    active.server = { type, label };
    if (type === DB_DEFAULT_SERVER.type) {
        active.server.desc = DB_DEFAULT_SERVER.desc;
    } else if (type === 'global_vars' && extraVars?.varKey) {
        active.server.desc = `dbnm_vars.${extraVars.varKey}`;
    } else if (type !== 'none') {
        delete active.server.desc;
    }
    active.vars = active.vars || {};
    if (extraVars && typeof extraVars === 'object') {
        Object.keys(extraVars).forEach((k) => {
            active.vars[k] = extraVars[k];
        });
    }
    active.vars.__serverType = type;
    saveDatabases();
    g_print(`server → <span class="yellow">${dbEscape(label)}</span> <span class="db-dim">on</span> <span class="light-blue">${dbEscape(active.name)}</span>`);
    return true;
}

function setServerFirebase(config) {
    setServerExternal('firebase', config);
}

function setServerGlobalVars(varKey) {
    const key = String(varKey || '').trim();
    if (!key) {
        e_print('Usage: database server global <varKey>');
        return false;
    }
    applyServerBinding('global_vars', `Global vars · ${key}`, {
        provider: 'global_vars',
        link: 'dbnm_vars',
        varKey: key
    });
    const linked = (window.dbnm_vars || {})[key];
    if (linked !== undefined) {
        print(`<span class="db-dim">linked</span>  <span class="light-blue">${dbEscape(key)}</span> ${formatVarValue(linked)}`);
    } else {
        tip_print(`var ${key} &lt;value&gt;  — create the linked var`);
    }
    return true;
}

function startGlobalVarPick() {
    endDbSession();
    _await('database');
    dbSession = { step: 'globalVar' };
    dbBanner('global vars · pick var key');
    const keys = Object.keys(window.dbnm_vars || {});
    if (keys.length) {
        print(`<span class="db-dim">existing:</span> ${keys.map(k => `<span class="light-blue">${dbEscape(k)}</span>`).join(' · ')}`);
    } else {
        print('<span class="db-dim">no dbnm vars yet — name one to create when you set a value</span>');
    }
    print('<span class="db-dim">Enter var name · empty line cancels</span>');
    qestion('var key');
    c_placeholder('firebaseConfig');

    const onKey = (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const value = (db_ui.input?.value || '').trim();
        db_ui.input.value = '';
        if (!value) {
            y_print('cancelled');
            endDbSession();
            return;
        }
        setServerGlobalVars(value);
        endDbSession();
    };
    dbSession.onKey = onKey;
    db_ui.input.addEventListener('keydown', onKey);
    if (db_ui.input) db_ui.input.focus();
}

async function loadFoundationServerFile() {
    if (window.foundationServer) return window.foundationServer;
    return new Promise((resolve) => {
        const tag = document.createElement('script');
        tag.src = 'foundation/foundationServer.js?v=' + Date.now();
        tag.async = true;
        tag.onload = () => resolve(window.foundationServer || null);
        tag.onerror = () => resolve(null);
        document.body.appendChild(tag);
    });
}

async function applyFoundationServerBinding(bindingType, label) {
    const fs = await loadFoundationServerFile();
    if (!fs || !fs.server) {
        e_print('LCN foundation server unavailable (foundation/foundationServer.js)');
        return false;
    }
    const vars = { ...(fs.server.vars || {}) };
    vars.provider = 'foundation';
    vars.source = 'foundation/foundationServer.js';
    vars.tier = 'free';
    applyServerBinding(bindingType, label, vars);
    const keys = Object.keys(vars);
    print(`<span class="db-dim">${keys.length} server var${keys.length === 1 ? '' : 's'} written</span>`);
    keys.forEach((k, i) => {
        const branch = i === keys.length - 1 ? '└─' : '├─';
        print(`<span class="yellow">${branch}</span> <span class="light-blue">${dbEscape(k)}</span> ${formatVarValue(vars[k])}`);
    });
    return true;
}

async function setServerDefault() {
    y_print('loading LCN foundation server…');
    const ok = await applyFoundationServerBinding(DB_DEFAULT_SERVER.type, DB_DEFAULT_SERVER.label);
    if (ok) {
        print(`<span class="db-dim">${DB_DEFAULT_SERVER.desc}</span>`);
        tip_print('shared LCN foundation server · no setup required');
    }
}

async function setServerFoundation() {
    await setServerDefault();
}

function renderDbChoices(choices) {
    const listId = `db-choices-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const html = choices.map((c, i) => {
        return `<div class="choice ${c.color || 'muted-teal'}" data-db-choice="${i}"> &gt; ${dbEscape(c.name)} <span class="db-dim">${dbEscape(c.flavor || '')}</span></div>`;
    }).join('');
    appendOutput(`<div class="choices db-choices" id="${listId}">${html}</div>`);

    let selected = 0;
    const root = () => document.getElementById(listId);
    const paint = () => {
        const el = root();
        if (!el) return;
        el.querySelectorAll('.choice').forEach((node, i) => {
            node.classList.toggle('selected', i === selected);
        });
    };
    paint();

    return new Promise((resolve) => {
        const onChoice = (e) => {
            const el = root();
            if (!el) return;
            const els = el.querySelectorAll('.choice');
            if (!els.length) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selected = (selected + 1) % els.length;
                paint();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selected = (selected - 1 + els.length) % els.length;
                paint();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                document.removeEventListener('keydown', onChoice);
                if (dbSession) dbSession.onChoice = null;
                resolve(choices[selected]);
            } else if (e.key === 'Escape' || e.key === 'Backspace') {
                e.preventDefault();
                document.removeEventListener('keydown', onChoice);
                if (dbSession) dbSession.onChoice = null;
                resolve(null);
            }
        };
        if (dbSession) dbSession.onChoice = onChoice;
        document.addEventListener('keydown', onChoice);
        if (db_ui.input) db_ui.input.blur();
        warning('↑↓ move · Enter pick · Backspace/Esc bail');
    });
}

async function dbServerWizard() {
    if (!getActiveDatabase()) {
        e_print('No active database. Create one first.');
        tip_print('database create &lt;name&gt;');
        return;
    }
    endDbSession();
    _await('database');
    dbSession = { step: 'pick' };

    dbBanner('set server');
    print('<span class="db-dim">bind the active database to a server source</span>');
    if (!isServerConnected(getActiveDatabase())) {
        print('<span class="db-dim">current state: not connected</span>');
    }

    const pick = await renderDbChoices([
        { id: 'default', name: 'LCN Foundation Server', flavor: 'free to use · foundationServer.js', color: 'green' },
        { id: 'firebase', name: DB_EXTERNAL_PROVIDERS.firebase.label, flavor: DB_EXTERNAL_PROVIDERS.firebase.flavor, color: DB_EXTERNAL_PROVIDERS.firebase.color },
        { id: 'supabase', name: DB_EXTERNAL_PROVIDERS.supabase.label, flavor: DB_EXTERNAL_PROVIDERS.supabase.flavor, color: DB_EXTERNAL_PROVIDERS.supabase.color },
        { id: 'mongodb', name: DB_EXTERNAL_PROVIDERS.mongodb.label, flavor: DB_EXTERNAL_PROVIDERS.mongodb.flavor, color: DB_EXTERNAL_PROVIDERS.mongodb.color },
        { id: 'appwrite', name: DB_EXTERNAL_PROVIDERS.appwrite.label, flavor: DB_EXTERNAL_PROVIDERS.appwrite.flavor, color: DB_EXTERNAL_PROVIDERS.appwrite.color },
        { id: 'global_vars', name: 'Global vars', flavor: 'pick a dbnm var key', color: 'light-blue' }
    ]);

    if (!pick) {
        y_print('cancelled');
        endDbSession();
        return;
    }

    c_print(`<span class="green b">${dbEscape(pick.name)}</span> <span class="db-dim">${dbEscape(pick.flavor || '')}</span>`, '✓');

    if (pick.id === 'firebase' || pick.id === 'supabase' || pick.id === 'mongodb' || pick.id === 'appwrite') {
        startExternalPaste(pick.id);
        return;
    }
    if (pick.id === 'global_vars') {
        startGlobalVarPick();
        return;
    }
    if (pick.id === 'default') {
        await setServerDefault();
        endDbSession();
        return;
    }
    if (pick.id === 'foundation') {
        await setServerFoundation();
        endDbSession();
        return;
    }
    endDbSession();
}

function startExternalPaste(providerId) {
    const def = DB_EXTERNAL_PROVIDERS[providerId];
    if (!def) return;
    endDbSession();
    _await('database');
    dbSession = { step: 'paste', providerId };
    dbBanner(def.label.toLowerCase());
    print(`<span class="db-dim">${dbEscape(def.hint)}</span>`);
    print('<span class="db-dim">Enter to save · empty line cancels</span>');
    qestion(`${def.label.toLowerCase()} config`);
    c_placeholder(def.placeholder);

    const onKey = (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const text = (db_ui.input?.value || '').trim();
        db_ui.input.value = '';
        if (!text) {
            y_print('cancelled');
            endDbSession();
            return;
        }
        const cfg = parseExternalConfigText(text, providerId);
        if (!cfg || !Object.keys(cfg).length) {
            e_print(`Could not parse ${def.label} config from input.`);
            tip_print(def.parseFail);
            endDbSession();
            return;
        }
        setServerExternal(providerId, cfg);
        endDbSession();
    };
    dbSession.onKey = onKey;
    db_ui.input.addEventListener('keydown', onKey);
    if (db_ui.input) db_ui.input.focus();
}

function startFirebasePaste() {
    startExternalPaste('firebase');
}

function dbServerInfo() {
    const active = getActiveDatabase();
    if (!active) {
        e_print('No active database.');
        return;
    }
    dbBanner('server');
    print(`<span class="db-dim">database</span>  <span class="light-blue">${dbEscape(active.name)}</span>`);
    print(`<span class="db-dim">type</span>      <span class="yellow">${dbEscape(active.server?.type || 'none')}</span>`);
    print(`<span class="db-dim">label</span>     <span class="muted-teal">${dbEscape(active.server?.label || 'Not connected')}</span>`);
    if (!isServerConnected(active)) {
        tip_print('database server  — connect a server source');
        return;
    }
    if (active.server?.desc) {
        print(`<span class="db-dim">note</span>      <span class="db-dim">${dbEscape(active.server.desc)}</span>`);
    }
    if (active.server?.type === 'global_vars' && active.vars?.varKey) {
        const linked = (window.dbnm_vars || {})[active.vars.varKey];
        print(`<span class="db-dim">var</span>       <span class="light-blue">${dbEscape(active.vars.varKey)}</span>`);
        if (linked !== undefined) {
            print(`<span class="db-dim">value</span>     ${formatVarValue(linked)}`);
        } else {
            print('<span class="db-dim">value</span>     <span class="red">not set</span>');
            tip_print(`var ${active.vars.varKey} &lt;value&gt;`);
        }
        return;
    }
    const ext = DB_EXTERNAL_BY_TYPE[active.server?.type];
    if (ext) {
        const cfg = active.vars?.[ext.configKey];
        if (cfg && typeof cfg === 'object') {
            printConfigTree(ext.configKey, cfg);
        }
        return;
    }
    const cfg = active.vars?.firebaseConfig;
    if (cfg && typeof cfg === 'object') {
        print('<span class="db-dim">firebaseConfig</span>');
        Object.keys(cfg).forEach((k, i, arr) => {
            const branch = i === arr.length - 1 ? '└─' : '├─';
            print(`<span class="yellow">${branch}</span> <span class="light-blue">${k}</span> <span class="db-dim">${dbEscape(cfg[k])}</span>`);
        });
    }
}

function dbVarCommand(cmd_split) {
    const active = getActiveDatabase();
    if (!active) {
        e_print('No active database.');
        tip_print('database create &lt;name&gt;');
        return;
    }
    active.vars = active.vars || {};

    const useGlobal = active.server?.type === 'global_vars';
    const linkedKey = active.vars?.varKey;

    if (useGlobal) {
        if (!linkedKey) {
            e_print('No var linked. Use: database server global <varKey>');
            return;
        }
        const store = window.dbnm_vars || dbnm_vars;
        const key = cmd_split[2];
        const action = cmd_split[3];
        const value = cmd_split.slice(3).join(' ');

        if (!key) {
            const linked = store[linkedKey];
            print(`<span class="db-dim">linked var</span>  <span class="light-blue">${dbEscape(linkedKey)}</span>`);
            if (linked !== undefined) {
                print(`${formatVarValue(linked)}`);
            } else {
                print('<span class="db-dim">not set</span>');
            }
            tip_print(`var ${linkedKey} &lt;value&gt;  ·  database var ${linkedKey} &lt;value&gt;`);
            return;
        }

        if (key !== linkedKey) {
            e_print(`Linked var is <span class="light-blue">${dbEscape(linkedKey)}</span> — use var ${linkedKey} … for other keys`);
            return;
        }

        if (action === 'delete') {
            if (!(linkedKey in store)) {
                e_print(`Var not found: ${linkedKey}`);
                return;
            }
            delete store[linkedKey];
            saveVars();
            y_print(`deleted <span class="light-blue">${dbEscape(linkedKey)}</span>`);
            return;
        }

        if (!value) {
            if (linkedKey in store) {
                print(`<span class="light-blue">${dbEscape(linkedKey)}</span><span class="muted-teal"> = </span>${formatVarValue(store[linkedKey])}`);
            } else {
                e_print(`Var not found: ${linkedKey}`);
            }
            return;
        }

        let stored = value;
        if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
            try {
                stored = JSON.parse(value);
            } catch (_) {
                stored = value;
            }
        }
        store[linkedKey] = stored;
        saveVars();
        g_print(`<span class="light-blue">${dbEscape(linkedKey)}</span><span class="muted-teal"> = </span>${formatVarValue(stored)}`);
        return;
    }

    const store = active.vars;
    const persist = () => saveDatabases();

    const key = cmd_split[2];
    const action = cmd_split[3];
    const value = cmd_split.slice(3).join(' ');
    const keys = Object.keys(store);

    if (!key) {
        if (!keys.length) {
            print('No server vars.');
            tip_print('database var &lt;key&gt; &lt;value&gt;');
            return;
        }
        const pad = Math.max(...keys.map(k => k.length));
        let out = `<br><span class="muted-teal">${keys.length} server var${keys.length === 1 ? '' : 's'}</span> <span class="db-dim">· ${dbEscape(active.name)}</span>`;
        keys.forEach((k, i) => {
            out += `<br><span class="muted-teal">${i}.</span> <span class="light-blue">${dbEscape(k.padEnd(pad))}</span> <span class="muted-teal">=</span> ${formatVarValue(store[k])}`;
        });
        print(out);
        tip_print('database var &lt;key&gt; delete');
        return;
    }

    if (action === 'delete') {
        if (!(key in store)) {
            e_print(`Var not found: ${key}`);
            return;
        }
        delete store[key];
        persist();
        y_print(`deleted <span class="light-blue">${dbEscape(key)}</span>`);
        return;
    }

    if (!value) {
        if (key in store) {
            print(`<span class="light-blue">${dbEscape(key)}</span><span class="muted-teal"> = </span>${formatVarValue(store[key])}`);
        } else {
            e_print(`Var not found: ${key}`);
        }
        return;
    }

    let stored = value;
    if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
        try {
            stored = JSON.parse(value);
        } catch (_) {
            stored = value;
        }
    }
    store[key] = stored;
    persist();
    g_print(`<span class="light-blue">${dbEscape(key)}</span><span class="muted-teal"> = </span>${formatVarValue(stored)}`);
}

async function handleDatabase(_, cmd_split) {
    const action = (cmd_split[1] || '').toLowerCase();

    if (!action || action === 'help' || action === '?') {
        dbHelp();
        return;
    }
    if (action === 'list' || action === 'ls') {
        dbList();
        return;
    }
    if (action === 'status' || action === 'info') {
        dbStatus();
        return;
    }
    if (action === 'create' || action === 'new' || action === 'add') {
        dbCreate(cmd_split.slice(2).join(' '));
        return;
    }
    if (action === 'select' || action === 'use' || action === 'set') {
        if (!cmd_split[2]) {
            e_print('Usage: database select <name|index>');
            return;
        }
        dbSelect(cmd_split[2]);
        return;
    }
    if (action === 'rm' || action === 'remove' || action === 'delete') {
        if (!cmd_split[2]) {
            e_print('Usage: database rm <name|index>');
            return;
        }
        dbRemove(cmd_split[2]);
        return;
    }
    if (action === 'var' || action === 'vars') {
        dbVarCommand(cmd_split);
        return;
    }
    if (action === 'server' || action === 'svr') {
        const sub = (cmd_split[2] || '').toLowerCase();
        if (!sub) {
            await dbServerWizard();
            return;
        }
        if (sub === 'info') {
            dbServerInfo();
            return;
        }
        const providerId = resolveExternalProviderId(sub);
        if (providerId) {
            startExternalPaste(providerId);
            return;
        }
        if (sub === 'global' || sub === 'global_vars' || sub === 'vars') {
            const varKey = cmd_split.slice(3).join(' ');
            if (varKey) setServerGlobalVars(varKey);
            else startGlobalVarPick();
            return;
        }
        if (sub === 'default') {
            await setServerDefault();
            return;
        }
        if (sub === 'foundation' || sub === 'f' || sub === 'foundationconfig') {
            await setServerFoundation();
            return;
        }
        e_print('Usage: database server [info|firebase|supabase|mongodb|appwrite|global <key>|default|foundation]');
        return;
    }

    e_print('Unknown database command.');
    tip_print('database help');
}

_reg('database', handleDatabase);
_reg('db', handleDatabase);
_reg('dbmgr', handleDatabase);

_reg('local', (_, cmd_split) => {
    if (cmd_split[1] === 'username') {
        userData.username = cmd_split[2];
        saveData();
        updatePromptDisplay();
        print(`Username set to: ${cmd_split[2]}`);
    } else if (cmd_split[1] === 'u') {
        const username = userData.username;
        print(`Username: ${username || 'user'}`);
    }
});

function saveVars() {
    userData.vars = dbnm_vars;
    window.dbnm_vars = dbnm_vars;
    syncServerVars();
    saveData();
}

_reg('var', (_, cmd_split) => {
    const key = cmd_split[1];
    const action = cmd_split[2];
    const value = cmd_split.slice(2).join(' ');
    const keys = Object.keys(dbnm_vars);

    if (key === 'vars') {
        if (!keys.length) {
            print('No vars set.');
            tip_print('var &lt;key&gt; &lt;value&gt; to add one');
            return;
        }
        const pad = Math.max(...keys.map(k => k.length));
        let out = `<br><span class="muted-teal">${keys.length} var${keys.length === 1 ? '' : 's'}</span>`;
        keys.forEach((k, i) => {
            out += `<br><span class="muted-teal">${i}.</span> <span class="light-blue">${k.padEnd(pad)}</span> <span class="muted-teal">=</span> ${dbnm_vars[k]}`;
        });
        print(out);
        tip_print('var &lt;index&gt; update &lt;value&gt;  ·  var &lt;index&gt; delete');
        return;
    }

    if (!isNaN(key) && (action === 'update' || action === 'delete')) {
        const idx = parseInt(key, 10);
        const name = keys[idx];
        if (!name) {
            e_print(`Var not found at index ${idx}`);
            return;
        }
        if (action === 'delete') {
            delete dbnm_vars[name];
            saveVars();
            y_print(`deleted <span class="light-blue">${name}</span>`);
            return;
        }
        const newValue = cmd_split.slice(3).join(' ');
        if (!newValue) {
            e_print('Usage: var <index> update <value>');
            return;
        }
        dbnm_vars[name] = newValue;
        saveVars();
        g_print(`<span class="light-blue">${name}</span><span class="muted-teal"> = </span>${newValue}`);
        return;
    }

    if (!key) {
        e_print('Usage: var <key> <value> | var <key> | var vars | var <index> update <value> | var <index> delete');
        return;
    }
    if (!value) {
        if (key in dbnm_vars) {
            print(`<span class="light-blue">${key}</span><span class="muted-teal"> = </span>${dbnm_vars[key]}`);
        } else {
            e_print(`Var not found: ${key}`);
        }
        return;
    }
    dbnm_vars[key] = value;
    saveVars();
    g_print(`<span class="light-blue">${key}</span><span class="muted-teal"> = </span>${value}`);
});

_reg('clear', () => {
    localStorage.removeItem('dbnm_userData');
    localStorage.removeItem('dbnm_vars');
    localStorage.removeItem('dbnm_databases');
    localStorage.removeItem('dbnm_pakeger_keys');
    localStorage.removeItem('dbnm_pakeger_clip_pref');
    print('Local storage cleared.');
    setTimeout(() => window.location.reload(), 300);
});

_reg('/', async (_, cmd_split) => {
    if (cmd_split[1] === 'i') {
        if (cmd_split[2] === 'love') {
            print('you!');
        } else if (cmd_split[2] === 'burl') {
            const url = cmd_split.slice(3).join(' ');
            if (!url) {
                e_print('Usage: / i burl <url>');
                tip_print('/ i burl example.com/test.js');
                return;
            }
            await impBurl(url);
        } else if (cmd_split[2]) {
            imp(cmd_split[2], cmd_split[3]);
            print(`Imported: ${cmd_split[3]}`);
        } else {
            error(1);
        }
    } else if (cmd_split[1] === 'dir') {
        if (cmd_split[2] === 'info') {
            const indexArg = cmd_split[3];
            if (indexArg === undefined) {
                e_print('Usage: / dir info <index>');
                return;
            }
            const util = resolveUtilByIndex(indexArg);
            if (!util) {
                e_print(`No package at index ${indexArg}`);
                return;
            }
            printPkgContents(util);
            return;
        }

        if (userData.cmdUtil.length === 0) {
            print('No modules/files available.');
        } else {
            ensureUtilIndices();
            let output = '<br> Loaded packages:';
            userData.cmdUtil.forEach((util) => {
                output += `<br> <span class=${util.loaded ? '' : 'red'}> ${util.index}. ${util.link} </span>`;
            });
            output += '<br><span class="muted-teal">/ dir info &lt;index&gt; to view contents</span>';
            print(output);
        }
    } else if (cmd_split[1] === 'user') {
        if (cmd_split[2] === 'set') {
            const fullText = cmd_split.slice(3).join(' ');
            userData.username = fullText;
            saveData();
            updatePromptDisplay();
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

function registerPkgContents(name, manifest) {
    pkgContentsMap[name.toLowerCase()] = manifest;
}
window.registerPkgContents = registerPkgContents;

function getUtilBasePath(util) {
    if (util.linkClass === '**' || util.linkClass === 'base') return 'public/base-modules/';
    if (util.linkClass === 'f' || util.linkClass === 'foundation') return 'foundation/';
    if (util.linkClass === '**svr') return 'servers/';
    if (util.linkClass === 'reg' || util.linkClass === 'burl') return null;
    return null;
}

function normalizeBurl(raw) {
    let url = String(raw || '').trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
        return new URL(url).href;
    } catch {
        return null;
    }
}

function linkNameFromBurl(url) {
    try {
        const base = new URL(url).pathname.split('/').pop() || 'remote';
        const name = base.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '');
        return name || 'remote';
    } catch {
        return 'remote';
    }
}

async function impBurl(urlRaw) {
    const url = normalizeBurl(urlRaw);
    if (!url) {
        e_print('Usage: / i burl <url>');
        tip_print('/ i burl example.com/test.js');
        return;
    }
    const link = linkNameFromBurl(url);
    const newUtil = {
        linkClass: 'burl',
        link,
        downloadUrl: url,
        index: nextUtilIndex()
    };
    userData.cmdUtil.push(newUtil);
    saveData();
    y_print(`fetching <span class="light-blue">${link}</span> <span class="db-dim">${url}</span>`);
    await renderUtils();
    const util = userData.cmdUtil.find(u => u.index === newUtil.index);
    if (util?.loaded) {
        g_print(`Imported: <span class="light-blue">${link}</span>`);
    } else {
        e_print(`Failed to load: ${url}`);
        tip_print('remote host must allow CORS for script loads');
    }
}

async function loadScriptFromUrl(url, util) {
    return new Promise((resolve) => {
        const scriptTag = document.createElement('script');
        const bust = url.includes('?') ? '&' : '?';
        scriptTag.src = url.includes('v=') ? url : (url + bust + 'v=' + Date.now());
        scriptTag.async = true;
        scriptTag.onload = () => {
            util.loaded = true;
            saveData();
            resolve(true);
        };
        scriptTag.onerror = () => {
            util.loaded = false;
            saveData();
            resolve(false);
        };
        document.body.appendChild(scriptTag);
    });
}

function ensureUtilIndices() {
    let maxIndex = -1;
    userData.cmdUtil.forEach((util) => {
        if (typeof util.index === 'number') {
            maxIndex = Math.max(maxIndex, util.index);
        }
    });
    if (typeof userData.nextUtilIndex !== 'number') {
        userData.nextUtilIndex = maxIndex + 1;
    }
    let changed = false;
    userData.cmdUtil.forEach((util) => {
        if (typeof util.index !== 'number') {
            util.index = userData.nextUtilIndex++;
            changed = true;
        }
    });
    if (changed) saveData();
}

function nextUtilIndex() {
    ensureUtilIndices();
    return userData.nextUtilIndex++;
}

function resolveUtilByIndex(indexStr) {
    const idx = parseInt(indexStr, 10);
    if (isNaN(idx)) return null;
    ensureUtilIndices();
    return userData.cmdUtil.find(u => u.index === idx) || null;
}

function printPkgContents(util) {
    const manifest = pkgContentsMap[util.link.toLowerCase()];
    if (!manifest) {
        if (util.linkClass === 'burl' && util.downloadUrl) {
            print(`<br><span class="green b">${util.link}</span> <span class="db-dim">burl</span>`);
            print(`<br><span class="light-blue">${util.downloadUrl}</span>`);
            print(`<br><span class="muted-teal">loaded: ${util.loaded ? 'yes' : 'no'}</span>`);
            return;
        }
        e_print(`No contents registered for '${util.link}'.`);
        return;
    }

    const base = getUtilBasePath(util);
    const version = manifest.version || '?';
    let output = `<br><span class="green b">${util.link}@${version}</span>`;

    if (manifest.desc) {
        output += `<br><span class="muted-teal">${manifest.desc}</span>`;
    }
    if (base) {
        output += `<br><span class="light-blue">${base}${util.link}/</span>`;
    } else if (util.linkClass === 'reg') {
        output += `<br><span class="light-blue">reg://${util.link}</span>`;
        if (util.storagePath) {
            output += `<br><span class="muted-teal">${util.storagePath}</span>`;
        }
    }

    const files = manifest.files || [];
    if (!files.length) {
        output += '<br><span class="muted-teal">(empty package)</span>';
        print(output);
        return;
    }

    files.forEach((entry, i) => {
        const path = typeof entry === 'string' ? entry : entry.path;
        const type = typeof entry === 'string' ? '' : entry.type;
        const branch = i === files.length - 1 ? '└──' : '├──';
        const typeLabel = type ? ` <span class="muted-teal">${type}</span>` : '';
        output += `<br><span class="yellow">${branch}</span> ${path}${typeLabel}`;
    });

    print(output);
}

function imp(linkClass, link) {
    const newUtil = { linkClass, link, index: nextUtilIndex() };
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
        return new Promise(async resolve => {
            if (util.linkClass === 'burl') {
                if (!util.downloadUrl) {
                    resolve(null);
                    return;
                }
                const ok = await loadScriptFromUrl(util.downloadUrl, util);
                if (ok) filesLoaded++;
                else filesFailed++;
                resolve(ok);
                return;
            }
            if (util.linkClass === 'reg') {
                if (!util.downloadUrl) {
                    resolve(null);
                    return;
                }
                if (typeof window.__dbnmLoadRemoteUtil === 'function') {
                    try {
                        const ok = await window.__dbnmLoadRemoteUtil(util.link, util.downloadUrl);
                        if (ok) filesLoaded++;
                        else filesFailed++;
                        resolve(ok);
                    } catch {
                        filesFailed++;
                        resolve(false);
                    }
                    return;
                }
                const ok = await loadScriptFromUrl(util.downloadUrl, util);
                if (ok) filesLoaded++;
                else filesFailed++;
                resolve(ok);
                return;
            }

            let adder = getUtilBasePath(util);
            if (util.linkClass === '**svr') {
                if (!serverMaintain) {
                    resolve(null);
                    return;
                }
                serverMaintain = false;
            }
            if (!adder) {
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
                scrollOutputToBottom();
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
