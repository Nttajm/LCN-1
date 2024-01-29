document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    // Add a 1-second delay using setTimeout
    setTimeout(function() {
      document.getElementById('save1').textContent = 'saved.';
    }, 1000);
  }
});