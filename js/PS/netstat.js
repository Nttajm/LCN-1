
function updateNetworkStatus() {
  const statusElement = document.getElementById('status');

  if (navigator.onLine) {
    statusElement.textContent = 'Online';
  } else {
    statusElement.textContent = 'Offline';
  }

  return statusElement.textContent;
}

export const network = updateNetworkStatus();


document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
      // Add a 1-second delay using setTimeout
      setTimeout(function() {
      document.getElementById('save1').textContent = 'saved.';
      }, 1000);
  }
  });

// Delay the initial check for 5 seconds
setTimeout(network, 1400);

// Add event listener for online/offline events
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);


console.log('202.pass')

const altSpecific = document.getElementById('js-get-netstat');
altSpecific.textContent = 'pass.200';
altSpecific.classList.add('stat');