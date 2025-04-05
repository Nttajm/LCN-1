 
 
 const ps_use = 'main-ps';
 const db_info = {
        name: 'ps1.3.1',
        desc: 'base_com',
        use: ps_use,
 }

 const db_ui = {
    input: document.getElementById('input'),
    inputVal: document.getElementById('input').value,
    output: document.getElementById('output'),
}
 

if (db_ui.input && db_ui.output) {
    _print(
        `
        <div>Path: ${db_info.name}/${db_info.desc}/${db_info.use}</div>
        <div>Desc: ${db_info.desc}</div>

        <br> > v 1.3.1
        <br> > Base
        `
    )
} else {
    _print('pre-x UI not available');
}


function _print(value) {
    const val_html = `<div>${value}</div>`;
    if (db_ui.input.value) {
        db_ui.input.value += val_html;
    }
    db_ui.output.innerHTML += val_html;

    return value;
}


function _command(cmd) {

    const cmd_split = cmd.split(' ');
    const second = cmd_split[1];
    const parths = cmd.match(/\(([^)]+)\)/);
    let args = [];
    if (parths) {
        args = parths[1].split(',').map(arg => arg.trim());
        if (cmd_split[0] === 'example' && args.length === 2) {
            _print(`Example command executed with values: ${args[0]}, ${args[1]}`);
        }
    }
    if (cmd_split[0] === 'multi' && parths && args.length === 2) {
        const result = parseFloat(args[0]) * parseFloat(args[1]);
        _print(`Multiplication result: ${result}`);
    }
    if (cmd === 'x') {
        db_ui.output.innerHTML = '';
    } else if (cmd === 'time') {
        _print(new Date().toLocaleTimeString());
    } else if (cmd.toLowerCase().startsWith('time')) {
        if (second === 'full') {
            _print(new Date().toLocaleString());
        }
        
    } else {
        _print(`
            <br> base_com(${ ps_use }):
            <br> Command not found: ${cmd}
            `);
    }
}

db_ui.input.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        const command = db_ui.input.value;
        _command(command);
        db_ui.input.value = '';
    }
});