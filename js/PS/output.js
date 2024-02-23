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

function toggleDivOutput() {
    const div = document.getElementById("outputToggle")
    div.style.display = div.style.display === "none" ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", function() {
var findelement = document.querySelectorAll("#label div p");
var dot = document.getElementById("#problem-dot");

elements.forEach(function(element) {
    if (findelement.textContent.includes("error")) {
    dot.style.display = "block";
    }
});
});

const altSpecific4 = document.getElementById('js-get-output');
altSpecific4.textContent = 'pass.200';
altSpecific4.classList.add('stat');