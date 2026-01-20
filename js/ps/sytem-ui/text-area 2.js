function updateLineNumbers() {
    var codeTextarea = document.getElementById('code');
    var lineNumbersDiv = document.getElementById('line-numbers');
  
    // Split the code into lines
    var lines = codeTextarea.value.split('\n');
  
    // Generate line numbers HTML
    var lineNumbersHtml = '';
    for (var i = 1; i <= lines.length; i++) {
      lineNumbersHtml += i + '<br>';
    }
  
    // Update line numbers div
    lineNumbersDiv.innerHTML = lineNumbersHtml;
  }
  