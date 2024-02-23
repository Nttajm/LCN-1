

function runCode() {
    var code = document.getElementById('editor').value;
    var outputDiv = document.getElementById('jsOutPut');
    try {
        outputDiv.innerHTML = '<strong>console$</strong><br>';
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

function toggleDivOutput() {
    hiddendiv = document.getElementById("outputToggle")
    hiddendiv.style.display = hiddendiv.style.display === "none" ? "block" : "none";
}

const altSpecific3 = document.getElementById('js-get-output');
altSpecific3.textContent = 'pass.200';
altSpecific3.classList.add('stat');

