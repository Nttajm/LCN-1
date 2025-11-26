// Check if user is first time visitor
function checkFirstTimeUser() {
  const hasVisited = localStorage.getItem('hasVisited');
  const applicantName = localStorage.getItem('applicantName');
  
  if (!hasVisited || !applicantName) {
    showSetupModal();
  }
}

// Show initial setup modal
function showSetupModal() {
  const modal = document.getElementById('setupModal');
  modal.style.display = 'flex';
}

// Hide setup modal
function hideSetupModal() {
  const modal = document.getElementById('setupModal');
  modal.style.display = 'none';
}

// Show profile modal
function showProfileModal() {
  const modal = document.getElementById('profileModal');
  
  // Populate current values
  document.getElementById('profileName').value = localStorage.getItem('applicantName') || '';
  document.getElementById('profileYear').value = localStorage.getItem('applicantClass') || '';
  document.getElementById('profileLucky').value = localStorage.getItem('luckyNumber') || '';
  
  modal.style.display = 'flex';
}

// Hide profile modal
function hideProfileModal() {
  const modal = document.getElementById('profileModal');
  modal.style.display = 'none';
}

// Save user settings
function saveUserSettings(name, gradYear, luckyNumber) {
  localStorage.setItem('applicantName', name);
  localStorage.setItem('applicantClass', gradYear);
  localStorage.setItem('luckyNumber', luckyNumber);
  localStorage.setItem('hasVisited', 'true');
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  // Check if first time user
  checkFirstTimeUser();
  
  // Setup form submission
  const setupForm = document.getElementById('setupForm');
  setupForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const gradYear = document.getElementById('gradYear').value;
    const luckyNumber = document.getElementById('luckyNumber').value;
    
    saveUserSettings(fullName, gradYear, luckyNumber);
    hideSetupModal();
    
    // Update any name inserts on the page
    if (typeof replaceNameInserts === 'function') {
      replaceNameInserts();
    }
  });
  
  // Profile form submission
  const profileForm = document.getElementById('profileForm');
  profileForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('profileName').value;
    const gradYear = document.getElementById('profileYear').value;
    const luckyNumber = document.getElementById('profileLucky').value;
    
    saveUserSettings(fullName, gradYear, luckyNumber);
    hideProfileModal();
    
    // Update any name inserts on the page
    if (typeof replaceNameInserts === 'function') {
      replaceNameInserts();
    }
  });
  
  // Profile button click
  const profileBtn = document.getElementById('profileBtn');
  profileBtn.addEventListener('click', showProfileModal);
  
  // Close profile modal
  const closeProfile = document.getElementById('closeProfile');
  closeProfile.addEventListener('click', hideProfileModal);
  
  // Close modals when clicking outside
  window.addEventListener('click', function(e) {
    const setupModal = document.getElementById('setupModal');
    const profileModal = document.getElementById('profileModal');
    
    if (e.target === setupModal) {
      hideSetupModal();
    }
    if (e.target === profileModal) {
      hideProfileModal();
    }
  });
});