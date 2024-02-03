function updateNetworkStatus() {
  const statusElement = document.getElementById('status');

  if (navigator.onLine) {
    statusElement.textContent = 'Online';
  } else {
    statusElement.textContent = 'Offline';
  }
}

// Delay the initial check for 5 seconds
setTimeout(updateNetworkStatus, 1400);

// Add event listener for online/offline events
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);


console.log('202.pass')