import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";

[
    "public/base-modules/resources/css/registry.css",
    
].forEach
        (href => {  
            document.head.appendChild(Object.assign(document.createElement("link"), {  
                rel: "stylesheet",  
                href  
            }));  
        });



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
        function: viteInstall, // reference to the function
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
        `);
    };

    db_ui.input.addEventListener('keydown', inputListener);
    renderStep();
}




const reg_errors = {
    1:
    `
    The module you are trying to install is not found in the registry.
    <br> 
    <br> + check online for the latest modules @ <span class='link u'>dbnm.lcnjoel.com/modules</span>
    <br> + check the module name and try again.
    $
    `
    }
    

function find_module(name) {
    return example_database.find(module => module.name === name);
}


 // if (active_server) {
    //     const firebaseConfig = {
    //         apiKey: "AIzaSyBoMh1L1bbPm-DzsB8DU1fWc1_z8MsFfj4",
    //         authDomain: "lcntests.firebaseapp.com",
    //         databaseURL: "https://lcntests-default-rtdb.firebaseio.com",
    //         projectId: "lcntests",
    //         storageBucket: "lcntests.firebasestorage.app",
    //         messagingSenderId: "665856876392",
    //         appId: "1:665856876392:web:aaaf2142819be3896400dd",
    //         measurementId: "G-C8ZKK443D3"
    //       };

          
    //     const app = initializeApp(firebaseConfig);
    //     const analytics = getAnalytics(app);
    // }
