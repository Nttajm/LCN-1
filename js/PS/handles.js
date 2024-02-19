document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    // Add a 1-second delay using setTimeout
    setTimeout(function() {
      document.getElementById('save1').textContent = 'saved.';
    }, 1000);
  }
});


console.log('201.pass')

document.addEventListener("DOMContentLoaded", function() {
  var elements = document.querySelectorAll("#label div p");
  var hiddenDiv = document.getElementById("problem-dot");

  elements.forEach(function(element) {
    if (element.textContent.includes("error")) {
      hiddenDiv.style.display = "block";
    }
  });
});

function toggleDivOutput() {
    const div = document.getElementById("outputToggle")
    div.style.display = div.style.display === "none" ? "block" : "none";
  }


 