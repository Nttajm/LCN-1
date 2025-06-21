// import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
//   import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";

function loadStylesheets(stylesheets) {
    stylesheets.forEach(href => {
        document.head.appendChild(Object.assign(document.createElement("link"), {
            rel: "stylesheet",
            href
        }));
    });
}

loadStylesheets([
    "public/addons/resources/registry/registry.css",
]);



function reg_print(value) {
    const val_html = `<div class=""><span class="reg_user">$reg</span> ${value}</span>`;
    if (db_ui.output) {
        db_ui.output.innerHTML += val_html;
    }
    return value;
}
const example_database = [
    {
        name: 'vite',
        function: viteInstall, // reference to the function in the link
    },
    {
        name: 'p',
        function: pakegerInstall, // reference to the function in the link
    }
];

let active_server = false;
_reg('reg', (_, cmd_split) => {
    const module_command = cmd_split[1];
    const module_name = cmd_split[2];
    const module_other = cmd_split[3];

    if (module_command === 'active') {
        reg_print('firebase active');
        active_server = true;
    }

    if (module_command === 'i') {
        const module = find_module(module_name);
        if (module) {
            module.function(); // call the function
        } else {
            ps_use = 'registry';
            reg_print(`(${module_name}) : <div class="reg_error">${reg_errors[1]}</div>`);
        }
    } else {
        reg_print(`(${module_name}) : <div class="reg_error">${reg_errors[1]}</div>`);
    }
});

async function viteInstall() {

    const state = {
        step: 0,
        data: {
            name: '',
            description: ''
        },
        prompts: [
            {
                label: 'What is the name of the app?',
                placeholder: 'my-vite-app',
                key: 'name'
            },
            {
                label: 'Give a short description of the app.',
                placeholder: 'a cool frontend vite app',
                key: 'description'
            }
        ]
    };

    const inputListener = (e) => {
        if (e.key !== 'Enter') return;

        const currentPrompt = state.prompts[state.step];
        state.data[currentPrompt.key] = db_ui.input.value.trim();
        db_ui.input.value = '';
        state.step++;

        if (state.step < state.prompts.length) {
            renderStep();
        } else {
            completeInstall();
            db_ui.input.removeEventListener('keydown', inputListener);
        }
    };

    const renderStep = () => {
        _await('vite');
        const current = state.prompts[state.step];
        print(`
            <div class='info-box'><span class="dot"></span> <span class="reg_user">vite - 2.1.3</span></div>
            <div class='info-box'><span class="dot"></span> <span class="reg_user">lcn registry</span></div>
            <div class='info-box'><span class="dot"></span> <span class="reg_user">${state.step + 1} / ${state.prompts.length} ('x' to cancel)</span></div>
            <div class='info-box'><span class="reg_user">${current.label}</span></div>
        `);
        db_ui.input.setAttribute('placeholder', current.placeholder);
        db_ui.input.focus();
    };

    const completeInstall = () => {
        unawait()
        print(`
            <div class='info-box'><span class="reg_user">✅ Vite app initialized!</span></div>
            <div class='info-box'><span class="reg_user">Name: <b>${state.data.name}</b></span></div>
            <div class='info-box'><span class="reg_user">Description: <b>${state.data.description}</b></span></div>
            <div class='info-box'><span class="reg_user">You can now run <code>cd ${state.data.name} && npm install</code> to install dependencies.</span></div>
        `);
    };

    db_ui.input.addEventListener('keydown', inputListener);
    renderStep();
}


// let last_selected = null; // assumed global or declared here
let stepMode = 'input'; // 'input' or 'choice'


function pakegerInstall() {

    
const allProviders = [
    { name: 'passgen', color: 'light-blue' },
    { name: 'moxy', color: 'light-teal' },
    { name: 'wlan-cons', color: 'red' },
];


let steps = 0;
let package_info = {};

    _await('paKeger');

    c_print(`<span class='b muted-teal'>Installing paKeger...</span>`, '>');
    c_print(`<span class='b muted-teal'>v 0.4.1</span>`, '>');
    e_print(`<hr>`);

    qestion('🎉 What will you call this package? (or type "x" to cancel):');
    c_placeholder('Enter the name of your awesome package...');

    const documentListener = (e) => {
        if (stepMode !== 'input') return;
        if (e.key !== 'Enter') return;
        console.log(steps, stepMode, last_selected, package_info);

        steps++;
        const userInput = db_ui.input.value.trim();
        db_ui.input.value = '';

        if (steps === 1) {
            package_info.title = userInput;
            c_print(`📦 Title: ${package_info.title}`, '>');
            qestion('🔍 Great! Now, pick a provider:');
            c_placeholder('');
            waring('🚨 Press Enter twice to confirm your choice!');

            db_ui.input.blur();
            stepMode = 'choice';
            choices_print(allProviders, '>', '');
        }

        if (steps === 2 && last_selected === 'passgen') {
            qestion('🔑 <span class="muted-teal u">Enter a key</span> for encryption/decryption:');
            c_placeholder('Choose a strong key...');
            package_info.type = last_selected.trim().toLowerCase();
            stepMode = 'input';
        }

        if (steps === 3 && package_info.type === 'passgen') {
            c_print(`📦 Title: ${package_info.title}`, '>');
            c_print(`📦 Type: ${package_info.type}`, '>');
            package_info.key = userInput;
            qestion('🔒 Would you like to encrypt or decrypt? (e/d)');
            c_placeholder('Enter "e" for encryption or "d" for decryption');

            stepMode = 'input';
        }

        if (steps === 4 && package_info.type === 'passgen') {
            package_info.e_type = userInput.trim();
            c_print(`📦 Title: ${package_info.title}`, '>');
            c_print(`📦 Type: ${package_info.type}`, '>');
            qestion('📝 Enter text to encrypt or decrypt:');
            c_placeholder('Type your text here...');

            stepMode = 'input';
        }

        if (steps === 5 && package_info.type === 'passgen') {
            if (package_info.e_type === 'e') {
                const encryptedText = encrypt(userInput, package_info.key);
                c_print(`🔐 Encrypted: ${encryptedText}`, '>');
            } else if (package_info.e_type === 'd') {
                const decryptedText = decrypt(userInput, package_info.key);
                c_print(`🔓 Decrypted: ${decryptedText}`, '>');
                c_print(`press and enter any key to exit`, '>');
            }

            stepMode = 'input';

            unawait();
            document.removeEventListener('keydown', documentListener);
        }
    }

    document.addEventListener('keydown', documentListener);
}


function encrypt(text, key) {
    const shifted = vigenereEncrypt(text, key);
    return shuffleEncrypt(shifted, key);
}

function decrypt(text, key) {
    const unshuffled = shuffleDecrypt(text, key);
    return vigenereDecrypt(unshuffled, key);
}

// --- Layer 1: Vigenère-style full UTF-16 shift ---
function vigenereEncrypt(text, key) {
    const result = new Array(text.length);
    for (let i = 0; i < text.length; i++) {
        const t = text.charCodeAt(i);
        const k = key.charCodeAt(i % key.length);
        result[i] = String.fromCharCode((t + k) % 65535);
    }
    return result.join('');
}

function vigenereDecrypt(text, key) {
    const result = new Array(text.length);
    for (let i = 0; i < text.length; i++) {
        const e = text.charCodeAt(i);
        const k = key.charCodeAt(i % key.length);
        result[i] = String.fromCharCode((e - k + 65535) % 65535);
    }
    return result.join('');
}

// --- Layer 2: Deterministic shuffle ---
function shuffleEncrypt(text, key) {
    const indices = generateShuffleIndices(text.length, key);
    const result = new Array(text.length);
    for (let i = 0; i < text.length; i++) {
        result[indices[i]] = text[i];
    }
    return result.join('');
}

function shuffleDecrypt(text, key) {
    const indices = generateShuffleIndices(text.length, key);
    const result = new Array(text.length);
    for (let i = 0; i < text.length; i++) {
        result[i] = text[indices.indexOf(i)];
    }
    return result.join('');
}

// --- Pseudo-random shuffle index generator ---
function generateShuffleIndices(length, key) {
    const indices = Array.from({ length }, (_, i) => i);
    const seed = hashCode(key);
    let random = seed;
    for (let i = length - 1; i > 0; i--) {
        random = (random * 16807) % 2147483647;
        const j = random % (i + 1);
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
}

// Simple key hash
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash || 1; // never allow 0 seed
}




function choices_print(choices, tager, classer) {
    tager = tager || '>';
    classer = classer || '';
    const choicesHTML = choices.map((choice, index) => {
        return `<div class="choice ${choice.color}" data-selChoices="${index + 1}"> ${tager} ${choice.name}</div>`;
    }).join('');
    db_ui.output.innerHTML += `<div class="choices">${choicesHTML}</div>`;

    let selectedIndex = 0;

    const updateSelection = () => {
        const choiceEls = document.querySelectorAll('.choice');
        choiceEls.forEach((el, i) => {
            el.classList.toggle('selected', i === selectedIndex);
        });
    };

    const handleKeydown = (e) => {
        const choiceEls = document.querySelectorAll('.choice');
        if (e.key === 'ArrowDown') {
            selectedIndex = (selectedIndex + 1) % choiceEls.length;
            updateSelection();
        } else if (e.key === 'ArrowUp') {
            selectedIndex = (selectedIndex - 1 + choiceEls.length) % choiceEls.length;
            updateSelection();
        } else if (e.key === 'Enter') {
            const selectedChoice = choiceEls[selectedIndex];
            if (selectedChoice) {
                const selectedText = selectedChoice.textContent.trim().replace(/^> /, '');
                last_selected = selectedText;
                console.log(`Selected: ${last_selected}`);
                stepMode = 'input';
                document.removeEventListener('keydown', handleKeydown);
            }
        }
    };

    document.addEventListener('keydown', handleKeydown);
    updateSelection();
}

const reg_errors = {
    1: `
    The module you are trying to install is not found in the registry.
    <br> 
    <br> + check online for the latest modules @ <span class='link u'>dbnm.lcnjoel.com/modules</span>
    <br> + check the module name and try again.
    `
};

function find_module(name) {
    return example_database.find(module => module.name === name);
}
