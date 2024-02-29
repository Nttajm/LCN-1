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

function toggleDiv(option) {
    // Get the div element
    var div = document.getElementById(option);
  
    // If the div is currently hidden, show it; otherwise, hide it
    if (div.style.display === "none") {
      div.style.display = "block";
    } else {
      div.style.display = "none";
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    var elements = document.querySelectorAll("#label div");
    var hiddenDiv = document.getElementById("hiddenDiv");
  
    elements.forEach(function(element) {
      if (element.textContent.includes("error")) {
        hiddenDiv.style.display = "block";
      }
    });
  });;

const altSpecific4 = document.getElementById('js-get-output');
altSpecific4.textContent = 'pass.200';
altSpecific4.classList.add('stat');