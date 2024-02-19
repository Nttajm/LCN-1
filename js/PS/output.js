function runCode() {
    var code = document.getElementById('editor').value;
    var outputDiv = document.getElementById('jsOutPut');
    try {
        outputDiv.innerHTML = '<strong>dbjs$</strong><br>';
        // Redirect console.log to outputDiv
        var oldLog = console.log;
        console.log = function(message) {
            outputDiv.innerHTML += message + '<br>';
        };
        eval(code);
        // Restore original console.log
        console.log = oldLog;
    } catch (error) {
        outputDiv.innerHTML = '<strong>Error:</strong><br>' + error.message;
    }
}