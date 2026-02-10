// ========================================
// MULON - Main Site JavaScript
// ========================================

import { MulonData, OrderBook, Auth, UserData, OnboardingState, OverUnderSync } from './data.js';
import { checkMaintenanceAccess, MAINTENANCE_MODE } from './maintenance.js';

localStorage.setItem('lol', 'nice try, but i learnt from last time.');

// Track pending Over Under sync data
let pendingOUSyncData = null;

// Format number with commas (e.g., 1000 -> 1,000)
function formatWithCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format a balance with $ and commas (e.g., 1000.50 -> $1,000.50)
function formatBalance(amount) {
  const value = parseFloat(amount) || 0;
  const [whole, decimal] = value.toFixed(2).split('.');
  return `$${formatWithCommas(whole)}.${decimal}`;
}

// Format currency with +/- prefix (e.g., 100 -> +$100.00, -50 -> -$50.00)
function formatCurrency(amount) {
  const value = parseFloat(amount) || 0;
  const absValue = Math.abs(value);
  const [whole, decimal] = absValue.toFixed(2).split('.');
  const formatted = formatWithCommas(whole) + '.' + decimal;
  return value >= 0 ? `+$${formatted}` : `-$${formatted}`;
}

// Format profit/loss display
function formatProfit(amount) {
  const value = parseFloat(amount) || 0;
  const [whole, decimal] = Math.abs(value).toFixed(2).split('.');
  const formatted = formatWithCommas(whole) + '.' + decimal;
  return (value >= 0 ? '+' : '-') + '$' + formatted;
}

// Export to window for use in other files
window.FormatUtils = { formatWithCommas, formatBalance, formatCurrency, formatProfit };


document.addEventListener('DOMContentLoaded', async function() {
  // Initialize Firebase Auth
  Auth.init();
  
  // Check for device ban immediately (before anything else)
  if (typeof window.checkBanStatus === 'function') {
    const isBanned = await window.checkBanStatus();
    if (isBanned) return; // Stop execution if banned and redirecting
  }
  
  // Check maintenance mode - wait for auth to load before deciding
  if (MAINTENANCE_MODE) {
    const hasAccess = await checkMaintenanceAccess({
      getUser: () => Auth.getUser(),
      redirectUrl: 'maintenance.html'
    });
    if (!hasAccess) return; // Stop execution if redirecting
  }
  
  // Check if onboarding is needed
  if (!OnboardingState.hasCompletedOnboarding()) {
    showOnboarding();
  } else {
    hideOnboarding();
  }
  
  // Setup onboarding handlers
  setupOnboarding();
  
  // Setup auth UI
  setupAuthUI();
  
  // Show loading state
  showLoading();
  
  // Initialize data from Firebase
  await MulonData.init();
  
  // Render nav categories
  renderNavCategories();
  
  // Render markets
  renderMarkets();
  
  // Setup modal
  setupModal();
  
  // Setup sidebar
  setupSidebar();
  
  // Setup suggestion modal
  setupSuggestionModal();
  
  // Setup keys tooltip
  setupKeysTooltip();
  
  // Setup daily key claim
  setupDailyKeyClaim();
  
  // Listen for auth state changes
  Auth.onAuthStateChange(async (user) => {
    // Check ban status on every auth state change
    if (typeof window.checkBanStatus === 'function') {
      const isBanned = await window.checkBanStatus();
      if (isBanned) return; // Stop if banned
    }
    
    updateAuthUI(user);
    updateUserUI();
    updateDailyKeyUI();
    
    // Check for unseen wins when user logs in
    if (user) {
      // Small delay to ensure user data is loaded
      setTimeout(() => {
        checkForUnseenWins();
        // Check for updates after wins (with delay so they don't overlap)
        setTimeout(() => {
          checkForUpdates();
        }, 500);
      }, 500);
    }
  });
});

// ========================================
// ONBOARDING
// ========================================
let currentSegment = 0;

function showOnboarding() {
  const overlay = document.getElementById('onboardingOverlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    // Auto-advance from intro (segment 0) after animation completes
    setTimeout(() => {
      if (currentSegment === 0) {
        goToSegment(1);
      }
    }, 2000); // 3.5 seconds for intro animation
  }
}

function hideOnboarding() {
  const overlay = document.getElementById('onboardingOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

function goToSegment(segmentNum) {
  const segments = document.querySelectorAll('.onboarding-segment');
  const dots = document.querySelectorAll('.progress-dot');
  const progressBar = document.getElementById('onboardingProgress');
  
  segments.forEach(seg => {
    const num = parseInt(seg.dataset.segment);
    if (num === currentSegment) {
      seg.classList.add('exit');
      seg.classList.remove('active');
    } else if (num === segmentNum) {
      setTimeout(() => {
        seg.classList.add('active');
        seg.classList.remove('exit');
      }, 100);
    } else {
      seg.classList.remove('active', 'exit');
    }
  });
  
  // Hide progress dots during intro (segment 0)
  if (progressBar) {
    progressBar.style.opacity = segmentNum === 0 ? '0' : '1';
  }
  
  // Progress dots start at segment 1 (intro has no dot)
  dots.forEach(dot => {
    const num = parseInt(dot.dataset.segment);
    dot.classList.toggle('active', num === segmentNum);
    dot.classList.toggle('completed', num < segmentNum && num >= 1);
  });
  
  currentSegment = segmentNum;
}

function setupOnboarding() {
  // Google Sign In button
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
      const result = await Auth.signInWithGoogle();
      if (result.success) {
        // Show beta modal for first-time users
        showBetaModal();
        
        // Check for Over Under account
        const userEmail = result.user?.email;
        if (userEmail) {
          const ouAccount = await OverUnderSync.checkForOverUnderAccount(userEmail);
          if (ouAccount.found && ouAccount.username) {
            // Show sync modal
            showOUSyncModal(ouAccount, result.user.uid);
            return; // Don't advance yet, wait for user decision
          }
        }
        goToSegment(2);
      } else {
        showNotification('Sign in failed. Please try again.', 'error');
      }
    });
  }
  
  // Skip/Guest button
  const skipSignInBtn = document.getElementById('skipSignInBtn');
  if (skipSignInBtn) {
    skipSignInBtn.addEventListener('click', () => {
      Auth.setGuestMode();
      goToSegment(2);
    });
  }
  
  // Over Under Sync modal buttons
  setupOUSyncModal();
  
  // Next buttons
  const nextBtns = document.querySelectorAll('.next-btn');
  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const nextSeg = parseInt(btn.dataset.next);
      goToSegment(nextSeg);
    });
  });
  
  // Start trading button
  const startTradingBtn = document.getElementById('startTradingBtn');
  if (startTradingBtn) {
    startTradingBtn.addEventListener('click', () => {
      OnboardingState.setCompleted();
      hideOnboarding();
    });
  }
  
  // Progress dots (clickable for navigation)
  const dots = document.querySelectorAll('.progress-dot');
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const segNum = parseInt(dot.dataset.segment);
      // Only allow going to completed segments or next one
      if (segNum <= currentSegment || segNum === currentSegment + 1) {
        goToSegment(segNum);
      }
    });
  });
}

// ========================================
// AUTHENTICATION UI
// ========================================
function setupAuthUI() {
  // User menu toggle
  const userMenu = document.getElementById('userMenu');
  const userAvatar = document.getElementById('userAvatar');
  
  if (userAvatar && userMenu) {
    userAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenu.classList.toggle('open');
    });
    
    // Close on outside click
    document.addEventListener('click', () => {
      userMenu.classList.remove('open');
    });
  }
  
  // Header sign in button
  const headerSignInBtn = document.getElementById('headerSignInBtn');
  if (headerSignInBtn) {
    headerSignInBtn.addEventListener('click', async () => {
      const result = await Auth.signInWithGoogle();
      if (result.success) {
        showNotification('Signed in successfully!', 'success');
      }
    });
  }
  
  // Sign out button
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await Auth.signOut();
      showNotification('Signed out', 'success');
    });
  }
  
  // Modal sign in button
  const modalSignInBtn = document.getElementById('modalSignInBtn');
  if (modalSignInBtn) {
    modalSignInBtn.addEventListener('click', async () => {
      const result = await Auth.signInWithGoogle();
      if (result.success) {
        hideSignInModal();
        showNotification('Signed in! You can now trade.', 'success');
      }
    });
  }
  
  // Cancel sign in modal
  const cancelSignInBtn = document.getElementById('cancelSignInBtn');
  if (cancelSignInBtn) {
    cancelSignInBtn.addEventListener('click', hideSignInModal);
  }
  
  // Setup profile modal
  setupProfileModal();
}

function updateAuthUI(user) {
  const userInitials = document.getElementById('userInitials');
  const userPhoto = document.getElementById('userPhoto');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const signOutBtn = document.getElementById('signOutBtn');
  const headerSignInBtn = document.getElementById('headerSignInBtn');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const userAvatar = document.getElementById('userAvatar');
  
  if (user && !user.isGuest) {
    // Get avatar style from user data
    const avatarStyle = UserData.getAvatarStyle();
    const displayName = UserData.getDisplayName();
    
    // Apply avatar style
    if (avatarStyle === 'default' && user.photoURL) {
      if (userPhoto) {
        userPhoto.src = user.photoURL;
        userPhoto.style.display = 'block';
      }
      if (userInitials) userInitials.style.display = 'none';
      if (userAvatar) userAvatar.style.background = '';
    } else if (avatarStyle && avatarStyle.startsWith('gradient')) {
      // Use gradient avatar
      if (userPhoto) userPhoto.style.display = 'none';
      if (userInitials) {
        const initials = displayName
          ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          : '?';
        userInitials.textContent = initials;
        userInitials.style.display = 'flex';
      }
      // Apply gradient background
      const gradients = {
        'gradient1': 'linear-gradient(135deg, #667eea, #764ba2)',
        'gradient2': 'linear-gradient(135deg, #11998e, #38ef7d)',
        'gradient3': 'linear-gradient(135deg, #fc4a1a, #f7b733)',
        'gradient4': 'linear-gradient(135deg, #141e30, #243b55)',
        'gradient5': 'linear-gradient(135deg, #ff9a9e, #fecfef)',
        'gradient6': 'linear-gradient(135deg, #00c853, #00e676)',
        'gradient7': 'linear-gradient(135deg, #232526, #414345)'
      };
      if (userAvatar) userAvatar.style.background = gradients[avatarStyle] || '';
    } else {
      // Default with photo
      if (userPhoto && user.photoURL) {
        userPhoto.src = user.photoURL;
        userPhoto.style.display = 'block';
        if (userInitials) userInitials.style.display = 'none';
      } else if (userInitials) {
        const initials = displayName
          ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          : '?';
        userInitials.textContent = initials;
        userInitials.style.display = 'flex';
        if (userPhoto) userPhoto.style.display = 'none';
      }
      if (userAvatar) userAvatar.style.background = '';
    }
    
    if (userName) userName.textContent = displayName || 'User';
    if (userEmail) userEmail.textContent = user.email || '';
    if (signOutBtn) signOutBtn.style.display = 'flex';
    if (editProfileBtn) editProfileBtn.style.display = 'flex';
    if (headerSignInBtn) headerSignInBtn.style.display = 'none';
  } else {
    // Guest or signed out
    if (userInitials) {
      userInitials.textContent = user?.isGuest ? 'G' : '?';
      userInitials.style.display = 'flex';
    }
    if (userPhoto) userPhoto.style.display = 'none';
    if (userAvatar) userAvatar.style.background = '';
    if (userName) userName.textContent = user?.isGuest ? 'Guest' : 'Not signed in';
    if (userEmail) userEmail.textContent = user?.isGuest ? 'Browsing only' : 'Sign in to trade';
    if (signOutBtn) signOutBtn.style.display = 'none';
    if (editProfileBtn) editProfileBtn.style.display = 'none';
    if (headerSignInBtn) headerSignInBtn.style.display = 'flex';
  }
}

function showSignInModal() {
  const modal = document.getElementById('signinRequiredModal');
  if (modal) modal.classList.add('active');
}

function hideSignInModal() {
  const modal = document.getElementById('signinRequiredModal');
  if (modal) modal.classList.remove('active');
}

// ========================================
// BETA NOTICE MODAL
// ========================================
function showBetaModal() {
  const modal = document.getElementById('betaModal');
  if (modal) {
    modal.classList.add('active');
    
    // Setup dismiss button
    const dismissBtn = document.getElementById('dismissBetaBtn');
    if (dismissBtn) {
      dismissBtn.onclick = () => {
        modal.classList.remove('active');
      };
    }
    
    // Close on overlay click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    };
  }
}

// ========================================
// UPDATE NOTIFICATIONS
// ========================================
const UPDATES = [
  {
    version: '1.1.7',
    date: '2026-02-05',
    changes: [
      'cards work now',
      'stock market comming next week.',
      'happy friday',
    ]
  },
  // Add more updates here:
  // {
  //   version: '1.0.2',
  //   date: '2026-01-27',
  //   changes: ['New feature 1', 'Bug fix 2']
  // }
];

const LAST_SEEN_UPDATE_KEY = 'mulon_last_seen_update';

function getLastSeenUpdate() {
  return localStorage.getItem(LAST_SEEN_UPDATE_KEY) || '0.0.0';
}

function setLastSeenUpdate(version) {
  localStorage.setItem(LAST_SEEN_UPDATE_KEY, version);
}

function getUnseenUpdates() {
  const lastSeen = getLastSeenUpdate();
  return UPDATES.filter(update => compareVersions(update.version, lastSeen) > 0);
}

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

function checkForUpdates() {
  const unseenUpdates = getUnseenUpdates();
  if (unseenUpdates.length > 0) {
    showUpdateModal(unseenUpdates);
  }
}

function showUpdateModal(updates) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('updateModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'updateModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal update-modal">
        <div class="modal-header">
          <h2>🎉 What's New</h2>
          <button class="modal-close" id="closeUpdateModal">&times;</button>
        </div>
        <div class="modal-body" id="updateModalBody">
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="dismissUpdateBtn">Got it!</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Add styles if not already present
    if (!document.getElementById('updateModalStyles')) {
      const style = document.createElement('style');
      style.id = 'updateModalStyles';
      style.textContent = `
        .update-modal {
          max-width: 420px;
          width: 90%;
        }
        .update-modal .modal-body {
          padding: 1.5rem;
          max-height: 400px;
          overflow-y: auto;
        }
        .update-version {
          margin-bottom: 1.25rem;
        }
        .update-version:last-child {
          margin-bottom: 0;
        }
        .update-version-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .update-version-tag {
          background: var(--green-primary);
          color: white;
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .update-version-date {
          color: var(--text-muted);
          font-size: 0.8rem;
        }
        .update-changes {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .update-changes li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.4rem 0;
          color: var(--text-primary);
          font-size: 0.9rem;
        }
        .update-changes li::before {
          content: '✨';
          flex-shrink: 0;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Populate updates
  const body = document.getElementById('updateModalBody');
  body.innerHTML = updates.map(update => `
    <div class="update-version">
      <div class="update-version-header">
        <span class="update-version-tag">v${update.version}</span>
        <span class="update-version-date">${update.date}</span>
      </div>
      <ul class="update-changes">
        ${update.changes.map(change => `<li>${change}</li>`).join('')}
      </ul>
    </div>
  `).join('');
  
  // Show modal
  modal.classList.add('active');
  
  // Handle dismiss
  const dismissBtn = document.getElementById('dismissUpdateBtn');
  const closeBtn = document.getElementById('closeUpdateModal');
  
  const closeModal = () => {
    modal.classList.remove('active');
    // Mark latest update as seen
    const latestVersion = updates[0].version;
    setLastSeenUpdate(latestVersion);
  };
  
  dismissBtn.onclick = closeModal;
  closeBtn.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
}

// ========================================
// PROFILE MODAL
// ========================================
let selectedAvatarStyle = 'default';

function setupProfileModal() {
  const editProfileBtn = document.getElementById('editProfileBtn');
  const profileModal = document.getElementById('profileModal');
  const closeProfileModal = document.getElementById('closeProfileModal');
  const cancelProfileBtn = document.getElementById('cancelProfileBtn');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const avatarOptions = document.querySelectorAll('.avatar-option');
  const profileUsername = document.getElementById('profileUsername');
  
  // Open modal
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      openProfileModal();
    });
  }
  
  // Close modal
  if (closeProfileModal) {
    closeProfileModal.addEventListener('click', closeProfileModalFn);
  }
  if (cancelProfileBtn) {
    cancelProfileBtn.addEventListener('click', closeProfileModalFn);
  }
  
  // Close on overlay click
  if (profileModal) {
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) {
        closeProfileModalFn();
      }
    });
  }
  
  // Avatar option selection
  avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
      avatarOptions.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      selectedAvatarStyle = option.dataset.avatar;
      updateProfilePreview();
    });
  });
  
  // Update preview as user types
  if (profileUsername) {
    profileUsername.addEventListener('input', updateProfilePreview);
  }
  
  // Save profile
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
      const newUsername = profileUsername.value.trim();
      
      if (newUsername.length === 0) {
        showNotification('Please enter a display name', 'error');
        return;
      }
      
      if (newUsername.length > 20) {
        showNotification('Display name must be 20 characters or less', 'error');
        return;
      }
      
      saveProfileBtn.disabled = true;
      saveProfileBtn.textContent = 'Saving...';
      
      const result = await UserData.updateProfile(newUsername, selectedAvatarStyle);
      
      if (result.success) {
        showNotification('Profile updated!', 'success');
        closeProfileModalFn();
        // Refresh UI
        updateAuthUI(Auth.getUser());
      } else {
        showNotification('Failed to update profile', 'error');
      }
      
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = 'Save Changes';
    });
  }
}

function openProfileModal() {
  const profileModal = document.getElementById('profileModal');
  const profileUsername = document.getElementById('profileUsername');
  const avatarOptions = document.querySelectorAll('.avatar-option');
  
  if (!profileModal) return;
  
  // Load current values
  const currentName = UserData.getDisplayName();
  const currentAvatar = UserData.getAvatarStyle();
  
  if (profileUsername) {
    profileUsername.value = currentName || '';
  }
  
  // Select current avatar
  selectedAvatarStyle = currentAvatar || 'default';
  avatarOptions.forEach(option => {
    option.classList.toggle('selected', option.dataset.avatar === selectedAvatarStyle);
  });
  
  updateProfilePreview();
  profileModal.classList.add('active');
}

function closeProfileModalFn() {
  const profileModal = document.getElementById('profileModal');
  if (profileModal) {
    profileModal.classList.remove('active');
  }
}

function updateProfilePreview() {
  const previewInitials = document.getElementById('profilePreviewInitials');
  const previewPhoto = document.getElementById('profilePreviewPhoto');
  const previewContainer = document.getElementById('profileAvatarPreview');
  const profileUsername = document.getElementById('profileUsername');
  
  const user = Auth.getUser();
  const displayName = profileUsername?.value || UserData.getDisplayName() || 'User';
  
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  
  const gradients = {
    'gradient1': 'linear-gradient(135deg, #667eea, #764ba2)',
    'gradient2': 'linear-gradient(135deg, #11998e, #38ef7d)',
    'gradient3': 'linear-gradient(135deg, #fc4a1a, #f7b733)',
    'gradient4': 'linear-gradient(135deg, #141e30, #243b55)',
    'gradient5': 'linear-gradient(135deg, #ff9a9e, #fecfef)',
    'gradient6': 'linear-gradient(135deg, #00c853, #00e676)',
    'gradient7': 'linear-gradient(135deg, #232526, #414345)'
  };
  
  if (selectedAvatarStyle === 'default' && user?.photoURL) {
    if (previewPhoto) {
      previewPhoto.src = user.photoURL;
      previewPhoto.style.display = 'block';
    }
    if (previewInitials) previewInitials.style.display = 'none';
    if (previewContainer) previewContainer.style.background = '';
  } else if (selectedAvatarStyle.startsWith('gradient')) {
    if (previewPhoto) previewPhoto.style.display = 'none';
    if (previewInitials) {
      previewInitials.textContent = initials;
      previewInitials.style.display = 'flex';
    }
    if (previewContainer) previewContainer.style.background = gradients[selectedAvatarStyle] || '';
  } else {
    if (previewPhoto) previewPhoto.style.display = 'none';
    if (previewInitials) {
      previewInitials.textContent = initials;
      previewInitials.style.display = 'flex';
    }
    if (previewContainer) previewContainer.style.background = '';
  }
}

// ========================================
// OVER UNDER SYNC
// ========================================
function showOUSyncModal(ouAccount, mulonUserId) {
  const modal = document.getElementById('ouSyncModal');
  const usernameEl = document.getElementById('ouSyncUsername');
  
  if (modal && usernameEl) {
    // Display the username from Over Under
    usernameEl.textContent = ouAccount.username;
    
    // Store data for when user clicks yes
    pendingOUSyncData = {
      mulonUserId: mulonUserId,
      username: ouAccount.username,
      name: ouAccount.name
    };
    
    modal.classList.add('active');
  }
}

function hideOUSyncModal() {
  const modal = document.getElementById('ouSyncModal');
  if (modal) modal.classList.remove('active');
  pendingOUSyncData = null;
}

function setupOUSyncModal() {
  const syncYesBtn = document.getElementById('ouSyncYes');
  const syncNoBtn = document.getElementById('ouSyncNo');
  
  if (syncYesBtn) {
    syncYesBtn.addEventListener('click', async () => {
      if (pendingOUSyncData) {
        // Sync the username
        const result = await OverUnderSync.syncUsername(
          pendingOUSyncData.mulonUserId,
          pendingOUSyncData.username
        );
        
        if (result.success) {
          showNotification(`Welcome back, ${pendingOUSyncData.username}!`, 'success');
        }
      }
      hideOUSyncModal();
      goToSegment(2);
    });
  }
  
  if (syncNoBtn) {
    syncNoBtn.addEventListener('click', () => {
      hideOUSyncModal();
      goToSegment(2);
    });
  }
}

// Check if user can trade (must be signed in, not guest)
function canTrade() {
  return Auth.isSignedIn();
}

function showLoading() {
  const featuredContainer = document.getElementById('featuredContainer');
  const marketGrid = document.getElementById('marketGrid');
  
  if (featuredContainer) {
    featuredContainer.innerHTML = '<div class="loading">Loading markets...</div>';
  }
  if (marketGrid) {
    marketGrid.innerHTML = '';
  }
}

// ========================================
// RENDER NAV CATEGORIES
// ========================================
function renderNavCategories() {
  const navCategories = document.getElementById('navCategories');
  if (!navCategories) return;
  
  const categories = MulonData.getCategories();
  const currentCat = getCurrentCategory();
  
  // Inject dynamic CSS for categories
  injectCategoryStyles(categories);
  
  navCategories.innerHTML = Object.entries(categories).map(([id, cat]) => `
    <li><a href="index.html?cat=${id}" class="cat-pill ${id} ${currentCat === id ? 'active' : ''}">${cat.icon} ${cat.label}</a></li>
  `).join('');
  
  // Update nav links active state
  updateNavLinksActive();
}

// Get current category from URL
function getCurrentCategory() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('cat') || null;
}

// Update nav links active state based on URL
function updateNavLinksActive() {
  const currentCat = getCurrentCategory();
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-links .nav-link');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    
    // Check if we're on leaderboard page
    if (currentPath.includes('leaderbaord') && href.includes('leaderbaord')) {
      link.classList.add('active');
    }
    // Home page with no category filter
    else if (!currentCat && !currentPath.includes('leaderbaord') && href === 'index.html') {
      link.classList.add('active');
    }
    // All Markets selected
    else if (currentCat === 'all' && href === 'index.html?cat=all') {
      link.classList.add('active');
    }
  });
}

// Inject dynamic CSS for categories that don't have predefined styles
function injectCategoryStyles(categories) {
  // Check if style element already exists
  let styleEl = document.getElementById('dynamicCategoryStyles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamicCategoryStyles';
    document.head.appendChild(styleEl);
  }
  
  // Generate colors for categories
  const colors = [
    { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' },   // Indigo
    { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },   // Amber
    { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' },   // Purple
    { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },   // Emerald
    { bg: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' },   // Pink
    { bg: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' },   // Sky
    { bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' },   // Orange
    { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },    // Green
  ];
  
  let css = '';
  let colorIndex = 0;
  
  Object.entries(categories).forEach(([id, cat]) => {
    const colorSet = colors[colorIndex % colors.length];
    css += `
      .category-tag.${id} { background: ${colorSet.bg}; color: ${colorSet.color}; }
      .cat-pill.${id} { background: ${colorSet.bg}; color: ${colorSet.color}; }
      .cat-pill.${id}:hover { background: ${colorSet.bg.replace('0.1', '0.2')}; }
    `;
    colorIndex++;
  });
  
  styleEl.textContent = css;
}

// ========================================
// RENDER MARKETS
// ========================================
let currentSlide = 0;
let featuredMarketsData = [];

// Sort markets: active/recent first, done (resolved/expired) at the bottom
function sortMarketsForDisplay(markets) {
  return markets.sort((a, b) => {
    const now = new Date();
    const aExpired = now > new Date(`${a.endDate}T${a.endTime || '23:59'}`);
    const bExpired = now > new Date(`${b.endDate}T${b.endTime || '23:59'}`);
    const aResolved = a.resolved === true;
    const bResolved = b.resolved === true;

    // Resolved markets go to the very bottom
    if (aResolved || bResolved) {
      if (aResolved && bResolved) return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (aResolved) return 1;
      if (bResolved) return -1;
      return 0;
    }

    // Expired (pending result) markets go below active ones
    if (aExpired || bExpired) {
      if (aExpired && bExpired) return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (aExpired) return 1;
      if (bExpired) return -1;
      return 0;
    }

    // Active markets: most recent first
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

function renderMarkets() {
  const currentCat = getCurrentCategory();
  let markets = MulonData.getActiveMarkets();
  
  // Sort: active/recent first, done bets at the bottom
  markets = sortMarketsForDisplay(markets);
  
  // Filter by category if specified
  const isFiltered = currentCat && currentCat !== 'all';
  if (isFiltered) {
    markets = markets.filter(m => m.category === currentCat);
  }
  
  // Update section titles based on filter
  updateSectionTitles(currentCat);
  
  const featuredSection = document.querySelector('.section:first-of-type');
  const featuredContainer = document.getElementById('featuredContainer');
  const marketGrid = document.getElementById('marketGrid');
  
  // When viewing a category OR "all markets", hide featured slider and show all in grid
  if (isFiltered || currentCat === 'all') {
    // Hide featured section
    if (featuredSection) {
      featuredSection.style.display = 'none';
    }
    
    // Show all markets in grid
    if (marketGrid) {
      if (markets.length > 0) {
        marketGrid.innerHTML = markets.map(market => renderMarketCard(market)).join('');
      } else {
        marketGrid.innerHTML = '<div class="empty-state">No markets in this category.</div>';
      }
    }
  } else {
    // Home page - show featured section
    if (featuredSection) {
      featuredSection.style.display = 'block';
    }
    
    const featuredMarkets = markets.filter(m => m.featured);
    const allMarkets = markets.filter(m => !m.featured);
    
    // Store featured markets for slider
    featuredMarketsData = featuredMarkets.length > 0 ? featuredMarkets : (markets.length > 0 ? [markets[0]] : []);
    
    // Render featured slider
    if (featuredContainer) {
      if (featuredMarketsData.length > 0) {
        featuredContainer.innerHTML = renderFeaturedSlider(featuredMarketsData);
        setupSlider();
        // Load price graphs for featured markets (desktop only)
        if (window.innerWidth >= 900) {
          loadAndRenderPriceGraphs();
        }
      } else {
        featuredContainer.innerHTML = '<div class="empty-state">No markets available yet.</div>';
      }
    }
    
    // Render market grid
    if (marketGrid) {
      const gridMarkets = featuredMarkets.length > 0 ? allMarkets : markets.slice(1);
      if (gridMarkets.length > 0) {
        marketGrid.innerHTML = gridMarkets.map(market => renderMarketCard(market)).join('');
      } else {
        marketGrid.innerHTML = '';
      }
    }
  }
  
  // Re-attach event listeners
  attachBetButtonListeners();
}

// Update section titles based on current filter
function updateSectionTitles(currentCat) {
  const trendingTitle = document.querySelector('.section-title');
  const gridTitle = document.querySelectorAll('.section-title')[1];
  
  if (currentCat && currentCat !== 'all') {
    // Category filter - only grid title matters (featured is hidden)
    const category = MulonData.getCategory(currentCat);
    if (gridTitle) {
      gridTitle.textContent = `${category.icon} ${category.label} Markets`;
    }
  } else if (currentCat === 'all') {
    if (trendingTitle) {
      trendingTitle.textContent = '📊 Featured Markets';
    }
    if (gridTitle) {
      gridTitle.textContent = 'All Markets';
    }
  } else {
    // Home page
    if (trendingTitle) {
      trendingTitle.textContent = '🔥 Trending Markets';
    }
    if (gridTitle) {
      gridTitle.textContent = '📊 All Markets';
    }
  }
}

function renderFeaturedSlider(markets) {
  const slides = markets.map((market, index) => renderFeaturedSlide(market, index)).join('');
  const dots = markets.length > 1 ? `
    <div class="slider-dots">
      ${markets.map((_, index) => `<button class="slider-dot ${index === 0 ? 'active' : ''}" data-slide="${index}"></button>`).join('')}
    </div>
  ` : '';
  
  return `
    <div class="featured-slider">
      ${markets.length > 1 ? `
        <button class="slider-arrow slider-prev" aria-label="Previous">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      ` : ''}
      <div class="slider-track">
        ${slides}
      </div>
      ${markets.length > 1 ? `
        <button class="slider-arrow slider-next" aria-label="Next">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      ` : ''}
      ${dots}
    </div>
  `;
}

function renderFeaturedSlide(market, index) {
  const category = MulonData.getCategory(market.category);
  
  // Check market status
  const now = new Date();
  const endDateTime = new Date(`${market.endDate}T${market.endTime || '23:59'}`);
  const isExpired = now > endDateTime;
  const isResolved = market.resolved === true;
  const isPending = isExpired && !isResolved;
  
  // Check if user already has a position in this market
  const positions = UserData.getPositions();
  const userPosition = positions.find(p => p.marketId === market.id);
  const hasBet = !!userPosition;
  const canBet = !isResolved && !isPending && !hasBet;
  
  // Check if multi-option market
  const isMulti = market.marketType === 'multi' && market.options && market.options.length > 0;
  
  // Status display
  let statusBadge = '';
  if (isResolved) {
    const outcome = market.resolvedOutcome === 'yes' ? '✓ YES Won' : '✗ NO Won';
    statusBadge = `<span class="market-result ${market.resolvedOutcome}">${outcome}</span>`;
  } else if (isPending) {
    statusBadge = `<span class="market-result pending">⏳ Awaiting Result</span>`;
  }
  
  // Build probability display based on market type
  let probDisplay;
  if (isMulti) {
    probDisplay = `
      <div class="multi-prob-bars">
        ${market.options.map(opt => `
          <div class="multi-prob-row">
            <div class="multi-prob-info">
              <span class="multi-prob-label">${opt.label}</span>
              <span class="multi-prob-percent" style="color: ${opt.color}">${opt.price}%</span>
            </div>
            <div class="multi-prob-bar">
              <div class="multi-prob-fill" style="width: ${opt.price}%; background: ${opt.color};"></div>
            </div>
            ${canBet ? `
              <div class="multi-prob-actions">
                <button class="multi-bet-btn yes" data-market-id="${market.id}" data-option-id="${opt.id}" data-choice="yes">
                  Yes <span class="price">${opt.price}¢</span>
                </button>
                <button class="multi-bet-btn no" data-market-id="${market.id}" data-option-id="${opt.id}" data-choice="no">
                  No <span class="price">${100 - opt.price}¢</span>
                </button>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  } else {
    probDisplay = `
      <div class="probability-bar">
        <div class="prob-fill" style="width: ${market.yesPrice}%;"></div>
      </div>
      <div class="prob-labels">
        <span class="prob-yes">${market.yesPrice}% Yes</span>
        <span class="prob-no">${market.noPrice}% No</span>
      </div>
    `;
  }
  
  return `
    <div class="featured-slide ${index === 0 ? 'active' : ''}" data-slide-index="${index}">
      <div class="featured-card ${isResolved ? 'resolved' : ''} ${isPending ? 'pending' : ''} ${isMulti ? 'multi-option' : ''}" data-market-id="${market.id}">
        <div class="featured-card-main">
          <div class="featured-card-info">
            <div class="card-header">
              <div class="card-category">
                <span class="category-tag ${market.category}">${category.icon} ${category.label}</span>
                ${isMulti ? '<span class="multi-badge">📊 Multi</span>' : ''}
                <span class="volume">${MulonData.formatVolume(market.volume)}</span>
              </div>
              <div class="card-time">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>${MulonData.getDaysUntil(market.endDate)}${market.endTime ? ' @ ' + market.endTime : ''}</span>
              </div>
            </div>
            <h3 class="card-title">${market.title}</h3>
            <p class="card-subtitle">${market.subtitle || ''}</p>
            ${statusBadge}
            
            ${probDisplay}
          </div>
          
          ${!isMulti ? `
          <div class="featured-card-graph" data-market-id="${market.id}">
            <div class="graph-header">
              <span class="graph-price">${market.yesPrice}%</span>
              <span class="graph-label">probability</span>
            </div>
            <div class="graph-container">
              <svg class="price-graph" data-market-id="${market.id}" viewBox="0 0 200 80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="graphGradient-${market.id}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="var(--green-primary)" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="var(--green-primary)" stop-opacity="0.02"/>
                  </linearGradient>
                </defs>
                <path class="graph-area" fill="url(#graphGradient-${market.id})" d=""></path>
                <path class="graph-line" fill="none" stroke="var(--green-primary)" stroke-width="2" d=""></path>
              </svg>
              <div class="graph-loading">Loading...</div>
            </div>
            <div class="graph-dates">
              <span class="graph-date-start"></span>
              <span class="graph-date-end">Now</span>
            </div>
          </div>
          ` : ''}
        </div>

        ${canBet && !isMulti ? `
          <div class="bet-buttons">
            <button class="bet-btn yes" data-market-id="${market.id}" data-choice="yes">
              <div class="bet-label">${market.customLabels && market.yesLabel ? market.yesLabel : 'Yes'}</div>
              <div class="bet-price">${market.yesPrice}¢</div>
            </button>
            <button class="bet-btn no" data-market-id="${market.id}" data-choice="no">
              <div class="bet-label">${market.customLabels && market.noLabel ? market.noLabel : 'No'}</div>
              <div class="bet-price">${market.noPrice}¢</div>
            </button>
          </div>
          <div class="payout-info">
            <span class="payout yes-payout">$100 → $${Math.round(100 / (market.yesPrice / 100))}</span>
            <span class="payout no-payout">$100 → $${Math.round(100 / (market.noPrice / 100))}</span>
          </div>
        ` : hasBet ? `
          <div class="user-position-display ${userPosition.choice}">
            <div class="position-badge ${userPosition.choice}">
              <span class="position-icon">${userPosition.choice === 'yes' ? '✓' : '✗'}</span>
              <span class="position-label">You picked ${market.customLabels ? (userPosition.choice === 'yes' ? (market.yesLabel || 'YES') : (market.noLabel || 'NO')) : userPosition.choice.toUpperCase()}</span>
            </div>
            <div class="position-details">
              <span>${userPosition.shares} shares @ ${userPosition.avgPrice}¢</span>
            </div>
          </div>
        ` : `
          <div class="market-closed-notice">
            ${isResolved ? 'Market Resolved' : 'Betting Closed'}
          </div>
        `}
      </div>
    </div>
  `;
}

// ========================================
// PRICE GRAPH RENDERING
// ========================================
async function loadAndRenderPriceGraphs() {
  const graphContainers = document.querySelectorAll('.featured-card-graph');
  
  for (const container of graphContainers) {
    const marketId = container.dataset.marketId;
    if (!marketId) continue;
    
    try {
      // Get ALL trades for this market (all-time graph)
      const trades = await OrderBook.getRecentTrades(marketId, 0);
      const market = MulonData.getMarket(marketId);
      
      renderPriceGraph(container, trades, market);
    } catch (error) {
      console.warn('Error loading price graph for market', marketId, error);
      container.querySelector('.graph-loading').textContent = 'No data';
    }
  }
}

function renderPriceGraph(container, trades, market) {
  const svg = container.querySelector('.price-graph');
  const loadingEl = container.querySelector('.graph-loading');
  const dateStartEl = container.querySelector('.graph-date-start');
  const graphLine = svg.querySelector('.graph-line');
  const graphArea = svg.querySelector('.graph-area');
  
  if (!svg || !market) return;
  
  // Build price history from trades (oldest to newest)
  let priceHistory = [];
  
  // Get market creation date for the starting point
  const createdDate = market.createdAt ? new Date(market.createdAt) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Always start with initial price of 50%
  priceHistory.push({
    timestamp: createdDate,
    price: 50
  });
  
  if (trades.length > 0) {
    // Sort trades oldest first
    const sortedTrades = [...trades].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    sortedTrades.forEach(trade => {
      // Use priceAfter which represents the YES price after the trade
      // priceAfter is stored based on the choice, so we need to normalize to YES price
      let yesPrice;
      if (trade.priceAfter !== undefined) {
        // priceAfter is the price of whatever was traded
        if (trade.choice === 'yes') {
          yesPrice = trade.priceAfter;
        } else {
          // If NO was traded, priceAfter is NO price, so YES = 100 - NO
          yesPrice = 100 - trade.priceAfter;
        }
      } else {
        // Fallback: use the trade price
        yesPrice = trade.choice === 'yes' ? trade.price : (100 - trade.price);
      }
      
      priceHistory.push({
        timestamp: new Date(trade.timestamp),
        price: yesPrice
      });
    });
  }
  
  // Add current price as the last point
  priceHistory.push({
    timestamp: new Date(),
    price: market.yesPrice
  });
  
  // Update start date
  if (priceHistory.length > 0 && dateStartEl) {
    const startDate = priceHistory[0].timestamp;
    dateStartEl.textContent = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  // Generate SVG path
  const width = 200;
  const height = 80;
  const padding = 2;
  
  // Normalize data points
  const minPrice = 0;
  const maxPrice = 100;
  const priceRange = maxPrice - minPrice;
  
  const timeStart = priceHistory[0].timestamp.getTime();
  const timeEnd = priceHistory[priceHistory.length - 1].timestamp.getTime();
  const timeRange = timeEnd - timeStart || 1;
  
  const points = priceHistory.map(point => {
    const x = padding + ((point.timestamp.getTime() - timeStart) / timeRange) * (width - 2 * padding);
    const y = height - padding - ((point.price - minPrice) / priceRange) * (height - 2 * padding);
    return { x, y };
  });
  
  // Create smooth line path
  let linePath = '';
  let areaPath = '';
  
  if (points.length > 1) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
    }
    
    // Area path (closed for fill)
    areaPath = linePath + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  }
  
  graphLine.setAttribute('d', linePath);
  graphArea.setAttribute('d', areaPath);
  
  // Hide loading
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
}

function setupSlider() {
  const prevBtn = document.querySelector('.slider-prev');
  const nextBtn = document.querySelector('.slider-next');
  const dots = document.querySelectorAll('.slider-dot');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));
  }
  
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goToSlide(parseInt(dot.dataset.slide));
    });
  });
  
  // Touch/swipe support
  const track = document.querySelector('.slider-track');
  if (track) {
    let startX = 0;
    let isDragging = false;
    
    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
    });
    
    track.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          goToSlide(currentSlide + 1);
        } else {
          goToSlide(currentSlide - 1);
        }
      }
      isDragging = false;
    });
  }
}

function goToSlide(index) {
  const slides = document.querySelectorAll('.featured-slide');
  const dots = document.querySelectorAll('.slider-dot');
  
  if (slides.length === 0) return;
  
  // Wrap around
  if (index < 0) index = slides.length - 1;
  if (index >= slides.length) index = 0;
  
  currentSlide = index;
  
  // Update slides
  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === index);
  });
  
  // Update dots
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
}

function renderMarketCard(market) {
  const category = MulonData.getCategory(market.category);
  
  // Check market status
  const now = new Date();
  const endDateTime = new Date(`${market.endDate}T${market.endTime || '23:59'}`);
  const isExpired = now > endDateTime;
  const isResolved = market.resolved === true;
  const isPending = isExpired && !isResolved;
  
  // Check if user already has a position in this market
  const positions = UserData.getPositions();
  const userPosition = positions.find(p => p.marketId === market.id);
  const hasBet = !!userPosition;
  const canBet = !isResolved && !isPending && !hasBet;
  
  // Check if multi-option market
  const isMulti = market.marketType === 'multi' && market.options && market.options.length > 0;
  
  // Status badge
  let statusBadge = '';
  if (isResolved) {
    const outcome = market.resolvedOutcome === 'yes' ? '✓ YES' : '✗ NO';
    statusBadge = `<span class="card-status resolved ${market.resolvedOutcome}">${outcome}</span>`;
  } else if (isPending) {
    statusBadge = `<span class="card-status pending">⏳ Pending</span>`;
  }
  
  // Multi-option content
  if (isMulti) {
    const topOptions = market.options.slice(0, 3); // Show top 3 options in card
    return `
      <div class="market-card multi-option ${isResolved ? 'resolved' : ''} ${isPending ? 'pending' : ''}" data-market-id="${market.id}">
        <div class="card-category">
          <span class="category-tag ${market.category}">${category.icon} ${category.label}</span>
          <span class="multi-badge">📊 Multi</span>
          ${statusBadge}
        </div>
        <h4 class="card-title">${market.title}</h4>
        ${market.subtitle ? `<p class="card-description">${market.subtitle}</p>` : ''}
        <div class="card-meta">
          <span class="card-volume">${MulonData.formatVolume(market.volume)}</span>
          <span class="card-time-text">Ends ${MulonData.formatDate(market.endDate)}</span>
        </div>
        <div class="multi-options-preview">
          ${topOptions.map(opt => `
            <div class="multi-option-preview-row">
              <span class="option-dot" style="background: ${opt.color};"></span>
              <span class="option-label">${opt.label}</span>
              <span class="option-price" style="color: ${opt.color};">${opt.price}%</span>
            </div>
          `).join('')}
          ${market.options.length > 3 ? `<div class="more-options">+${market.options.length - 3} more</div>` : ''}
        </div>
        ${canBet ? `
          <button class="view-multi-btn" data-market-id="${market.id}">View Options</button>
        ` : `
          <div class="market-closed-compact">
            ${isResolved ? 'Resolved' : 'Closed'}
          </div>
        `}
      </div>
    `;
  }
  
  return `
    <div class="market-card ${isResolved ? 'resolved' : ''} ${isPending ? 'pending' : ''}" data-market-id="${market.id}">
      <div class="card-category">
        <span class="category-tag ${market.category}">${category.icon} ${category.label}</span>
        ${statusBadge}
      </div>
      <h4 class="card-title">${market.title}</h4>
      ${market.subtitle ? `<p class="card-description">${market.subtitle}</p>` : ''}
      <div class="card-meta">
        <span class="card-volume">${MulonData.formatVolume(market.volume)}</span>
        <span class="card-time-text">Ends ${MulonData.formatDate(market.endDate)}${market.endTime ? ' @ ' + market.endTime : ''}</span>
      </div>
      <div class="probability-bar small">
        <div class="prob-fill" style="width: ${market.yesPrice}%;"></div>
      </div>
      ${canBet ? `
        <div class="bet-buttons compact">
          <button class="bet-btn yes compact" data-market-id="${market.id}" data-choice="yes">
            <span>${market.customLabels && market.yesLabel ? market.yesLabel : 'Yes'}</span>
            <span class="price">${market.yesPrice}¢</span>
          </button>
          <button class="bet-btn no compact" data-market-id="${market.id}" data-choice="no">
            <span>${market.customLabels && market.noLabel ? market.noLabel : 'No'}</span>
            <span class="price">${market.noPrice}¢</span>
          </button>
        </div>
      ` : hasBet ? `
        <div class="user-position-compact ${userPosition.choice}">
          <span class="position-icon">${userPosition.choice === 'yes' ? '✓' : '✗'}</span>
          <span>You picked ${market.customLabels ? (userPosition.choice === 'yes' ? (market.yesLabel || 'YES') : (market.noLabel || 'NO')) : userPosition.choice.toUpperCase()}</span>
        </div>
      ` : `
        <div class="market-closed-compact">
          ${isResolved ? 'Resolved' : 'Closed'}
        </div>
      `}
    </div>
  `;
}

// ========================================
// MODAL FUNCTIONALITY
// ========================================
let modal, closeBtn, modalTitle, modalChoice, yesPrice, noPrice;
let priceYesBtn, priceNoBtn, amountInput, oddsValue, payoutValue, buyBtn, modalTabs;
let currentChoice = 'yes';
let currentYesPrice = 69;
let currentNoPrice = 31;
let currentMarketId = null;
let currentMarket = null;
let currentOptionId = null;

function setupModal() {
  modal = document.getElementById('betModal');
  closeBtn = document.getElementById('closeModal');
  modalTitle = document.getElementById('modalTitle');
  modalChoice = document.getElementById('modalChoice');
  yesPrice = document.getElementById('yesPrice');
  noPrice = document.getElementById('noPrice');
  priceYesBtn = document.getElementById('priceYes');
  priceNoBtn = document.getElementById('priceNo');
  amountInput = document.getElementById('amountInput');
  oddsValue = document.getElementById('oddsValue');
  payoutValue = document.getElementById('payoutValue');
  buyBtn = document.getElementById('buyBtn');
  modalTabs = document.querySelectorAll('.modal-tab');

  // Close modal events
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Price button toggle
  if (priceYesBtn) {
    priceYesBtn.addEventListener('click', function() {
      currentChoice = 'yes';
      updateModalChoice();
      updatePayout();
    });
  }

  if (priceNoBtn) {
    priceNoBtn.addEventListener('click', function() {
      currentChoice = 'no';
      updateModalChoice();
      updatePayout();
    });
  }

  // Amount input change
  if (amountInput) {
    amountInput.addEventListener('input', updatePayout);
  }

  // Tab switching (Buy only - sell removed, cash out only)
  modalTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      modalTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      updatePayout();
    });
  });

  // Buy button click - uses order book for price discovery
  if (buyBtn) {
    buyBtn.addEventListener('click', async function() {
      // Check if user is signed in
      if (!canTrade()) {
        showSignInModal();
        return;
      }
      
      const amount = parseFloat(amountInput.value) || 0;
      if (amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
      }
      
      if (amount < 0.10) {
        showNotification('Minimum order is $0.10', 'error');
        return;
      }
      
      const balance = UserData.getBalance();
      
      if (amount > balance) {
        showNotification('Insufficient balance!', 'error');
        return;
      }
      
      const market = MulonData.getMarket(currentMarketId);
      if (!market) {
        showNotification('Market not found', 'error');
        return;
      }
      
      // Disable button while processing
      buyBtn.disabled = true;
      buyBtn.textContent = 'Processing...';
      
      try {
        // Determine if this is a multi-option market
        const isMulti = market.marketType === 'multi' && currentOptionId;
        let optionLabel = '';
        
        if (isMulti) {
          const option = market.options.find(o => o.id === currentOptionId);
          optionLabel = option ? option.label : '';
        }
        
        // Execute order through the order book (with user ID)
        const userId = Auth.getUser()?.uid || 'anonymous';
        const result = await OrderBook.executeMarketOrder(
          currentMarketId,
          'buy',
          currentChoice,
          amount,
          userId,
          currentOptionId // Pass option ID for multi-option markets
        );
        
        if (!result.filled) {
          showNotification(result.error || 'Order could not be filled', 'error');
          return;
        }
        
        // Deduct from balance and add position
        await UserData.updateBalance(-amount);
        
        // Create position title
        const positionTitle = isMulti 
          ? `${market.title}: ${optionLabel}` 
          : market.title;
        
        await UserData.addPosition(
          currentMarketId,
          positionTitle,
          currentChoice,
          result.shares,
          amount,
          result.avgPrice,
          currentOptionId // Pass option ID
        );
        
        // Show price impact
        const priceChangeText = result.priceChange !== 0 
          ? ` (${result.priceChange > 0 ? '+' : ''}${result.priceChange}¢)` 
          : '';
        
        showNotification(
          `Bought ${result.shares} ${currentChoice.toUpperCase()} @ ${result.avgPrice}¢${priceChangeText} → Now ${result.newPrice}¢`, 
          'success'
        );
        
        // Update UI with new prices
        updateUserUI();
        renderMarkets(); // Re-render to show new prices
        closeModal();
        
        // Reset option ID
        currentOptionId = null;
        
      } catch (error) {
        console.error('Order execution error:', error);
        showNotification('Order failed. Please try again.', 'error');
      } finally {
        buyBtn.disabled = false;
        buyBtn.textContent = 'Buy';
      }
    });
  }
}

function attachBetButtonListeners() {
  const betButtons = document.querySelectorAll('.bet-btn');
  
  betButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      
      const marketId = this.dataset.marketId;
      const choice = this.dataset.choice;
      const market = MulonData.getMarket(marketId);
      
      if (!market) return;
      
      currentMarketId = marketId;
      currentMarket = market;
      currentYesPrice = market.yesPrice;
      currentNoPrice = market.noPrice;
      currentChoice = choice;
      
      // Update modal content
      const category = MulonData.getCategory(market.category);
      
      if (modalTitle) modalTitle.textContent = market.title;
      document.querySelector('.modal-market-icon').textContent = category.icon;
      if (yesPrice) yesPrice.textContent = market.yesPrice + '¢';
      if (noPrice) noPrice.textContent = market.noPrice + '¢';
      
      // Update button labels (custom or default)
      const yesLabel = market.customLabels && market.yesLabel ? market.yesLabel : 'Yes';
      const noLabel = market.customLabels && market.noLabel ? market.noLabel : 'No';
      if (priceYesBtn) priceYesBtn.querySelector('span').textContent = yesLabel;
      if (priceNoBtn) priceNoBtn.querySelector('span').textContent = noLabel;
      
      updateModalChoice();
      updatePayout();
      
      // Show modal
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  // Multi-option bet buttons
  const multiBetButtons = document.querySelectorAll('.multi-bet-btn');
  multiBetButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      
      const marketId = this.dataset.marketId;
      const optionId = this.dataset.optionId;
      const choice = this.dataset.choice;
      const market = MulonData.getMarket(marketId);
      
      if (!market || !market.options) return;
      
      const option = market.options.find(o => o.id === optionId);
      if (!option) return;
      
      currentMarketId = marketId;
      currentMarket = market;
      currentOptionId = optionId;
      currentYesPrice = option.price;
      currentNoPrice = 100 - option.price;
      currentChoice = choice;
      
      // Update modal content for multi-option
      const category = MulonData.getCategory(market.category);
      
      if (modalTitle) modalTitle.textContent = `${market.title}: ${option.label}`;
      document.querySelector('.modal-market-icon').textContent = category.icon;
      if (yesPrice) yesPrice.textContent = option.price + '¢';
      if (noPrice) noPrice.textContent = (100 - option.price) + '¢';
      
      // Update button labels for multi-option
      if (priceYesBtn) priceYesBtn.querySelector('span').textContent = 'Yes';
      if (priceNoBtn) priceNoBtn.querySelector('span').textContent = 'No';
      
      updateModalChoice();
      updatePayout();
      
      // Show modal
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  // View multi-option button handler
  const viewMultiBtns = document.querySelectorAll('.view-multi-btn');
  viewMultiBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const marketId = this.dataset.marketId;
      openMultiOptionsModal(marketId);
    });
  });

  // Make market cards clickable (only non-multi cards)
  const marketCards = document.querySelectorAll('.market-card:not(.multi-option)');
  marketCards.forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.closest('.bet-btn')) return;
      const yesBtn = this.querySelector('.bet-btn.yes');
      if (yesBtn) yesBtn.click();
    });
  });
}

function closeModal() {
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Multi-option modal
function openMultiOptionsModal(marketId) {
  const market = MulonData.getMarket(marketId);
  if (!market || !market.options) return;
  
  const category = MulonData.getCategory(market.category);
  
  // Create or get modal
  let multiModal = document.getElementById('multiOptionsModal');
  if (!multiModal) {
    multiModal = document.createElement('div');
    multiModal.id = 'multiOptionsModal';
    multiModal.className = 'modal-overlay';
    document.body.appendChild(multiModal);
  }
  
  multiModal.innerHTML = `
    <div class="modal multi-options-modal">
      <button class="modal-close" onclick="closeMultiOptionsModal()">×</button>
      <div class="modal-header">
        <span class="modal-market-icon">${category.icon}</span>
        <h3>${market.title}</h3>
        ${market.subtitle ? `<p class="modal-subtitle">${market.subtitle}</p>` : ''}
      </div>
      <div class="multi-options-list">
        ${market.options.map(opt => `
          <div class="multi-option-row">
            <div class="option-info">
              <span class="option-color" style="background: ${opt.color};"></span>
              <span class="option-name">${opt.label}</span>
            </div>
            <div class="option-prob" style="color: ${opt.color};">${opt.price}%</div>
            <div class="option-actions">
              <button class="multi-bet-btn yes" data-market-id="${market.id}" data-option-id="${opt.id}" data-choice="yes">
                Yes <span class="price">${opt.price}¢</span>
              </button>
              <button class="multi-bet-btn no" data-market-id="${market.id}" data-option-id="${opt.id}" data-choice="no">
                No <span class="price">${100 - opt.price}¢</span>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  multiModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Attach event listeners to buttons
  multiModal.querySelectorAll('.multi-bet-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      closeMultiOptionsModal();
      
      const optionId = this.dataset.optionId;
      const choice = this.dataset.choice;
      const option = market.options.find(o => o.id === optionId);
      
      if (!option) return;
      
      currentMarketId = marketId;
      currentMarket = market;
      currentOptionId = optionId;
      currentYesPrice = option.price;
      currentNoPrice = 100 - option.price;
      currentChoice = choice;
      
      if (modalTitle) modalTitle.textContent = `${market.title}: ${option.label}`;
      document.querySelector('.modal-market-icon').textContent = category.icon;
      if (yesPrice) yesPrice.textContent = option.price + '¢';
      if (noPrice) noPrice.textContent = (100 - option.price) + '¢';
      if (priceYesBtn) priceYesBtn.querySelector('span').textContent = 'Yes';
      if (priceNoBtn) priceNoBtn.querySelector('span').textContent = 'No';
      
      updateModalChoice();
      updatePayout();
      
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });
  
  // Close on overlay click
  multiModal.addEventListener('click', function(e) {
    if (e.target === multiModal) {
      closeMultiOptionsModal();
    }
  });
}

function closeMultiOptionsModal() {
  const multiModal = document.getElementById('multiOptionsModal');
  if (multiModal) {
    multiModal.classList.remove('active');
    document.body.style.overflow = '';
  }
}
window.closeMultiOptionsModal = closeMultiOptionsModal;

function updateModalChoice() {
  // Get custom labels if available
  const yesLabel = currentMarket && currentMarket.customLabels && currentMarket.yesLabel ? currentMarket.yesLabel : 'Yes';
  const noLabel = currentMarket && currentMarket.customLabels && currentMarket.noLabel ? currentMarket.noLabel : 'No';
  
  if (currentChoice === 'yes') {
    if (priceYesBtn) priceYesBtn.classList.add('active');
    if (priceNoBtn) priceNoBtn.classList.remove('active');
    if (modalChoice) {
      modalChoice.textContent = yesLabel;
      modalChoice.className = 'choice-yes';
    }
    if (oddsValue) oddsValue.textContent = currentYesPrice + '¢';
  } else {
    if (priceNoBtn) priceNoBtn.classList.add('active');
    if (priceYesBtn) priceYesBtn.classList.remove('active');
    if (modalChoice) {
      modalChoice.textContent = noLabel;
      modalChoice.className = 'choice-no';
    }
    if (oddsValue) oddsValue.textContent = currentNoPrice + '¢';
  }
}

function updatePayout() {
  if (!amountInput || !payoutValue) return;
  
  const amount = parseFloat(amountInput.value) || 0;
  const price = currentChoice === 'yes' ? currentYesPrice : currentNoPrice;
  const pricePerShare = price / 100;
  const shares = amount / pricePerShare;
  const payout = Math.round(shares); // Each share pays $1 if correct
  
  // Update shares display
  const sharesValue = document.getElementById('sharesValue');
  if (sharesValue) {
    sharesValue.textContent = shares.toFixed(2);
  }
  
  // Update current price display
  if (oddsValue) {
    oddsValue.textContent = price + '¢';
  }
  
  // Calculate estimated price after trade (price impact preview)
  const market = MulonData.getMarket(currentMarketId);
  const priceAfterValue = document.getElementById('priceAfterValue');
  const priceImpactNotice = document.getElementById('priceImpactNotice');
  
  if (market && priceAfterValue) {
    const liquidity = market.volume || 1000;
    const impactFactor = Math.min(amount / liquidity, 0.15);
    let newPrice;
    
    const isSelling = buyBtn && buyBtn.classList.contains('sell-mode');
    
    if (isSelling) {
      newPrice = Math.max(1, Math.round(price - (impactFactor * 100)));
    } else {
      newPrice = Math.min(99, Math.round(price + (impactFactor * 100)));
    }
    
    const priceChange = newPrice - price;
    
    if (priceChange !== 0) {
      priceAfterValue.textContent = `${newPrice}¢ (${priceChange > 0 ? '+' : ''}${priceChange})`;
      priceAfterValue.style.color = priceChange > 0 ? 'var(--green-primary)' : 'var(--red-primary)';
    } else {
      priceAfterValue.textContent = price + '¢';
      priceAfterValue.style.color = 'var(--text-primary)';
    }
    
    // Show/hide price impact warning for large orders
    if (priceImpactNotice) {
      if (Math.abs(priceChange) >= 5) {
        priceImpactNotice.style.display = 'flex';
        priceImpactNotice.classList.toggle('large-impact', Math.abs(priceChange) >= 10);
      } else {
        priceImpactNotice.style.display = 'none';
      }
    }
  }
  
  // Update payout
  payoutValue.textContent = formatBalance(parseFloat(payout));
  
  if (currentChoice === 'yes') {
    payoutValue.style.color = 'var(--green-primary)';
  } else {
    payoutValue.style.color = 'var(--red-primary)';
  }
}

// ========================================
// SUGGESTION MODAL
// ========================================
function setupSuggestionModal() {
  const suggestBtn = document.getElementById('suggestBtn');
  const suggestModal = document.getElementById('suggestModal');
  const closeSuggestModal = document.getElementById('closeSuggestModal');
  const suggestForm = document.getElementById('suggestForm');
  const suggestCategory = document.getElementById('suggestCategory');
  
  // Populate category dropdown
  if (suggestCategory) {
    const categories = MulonData.getCategories();
    Object.entries(categories).forEach(([id, cat]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = `${cat.icon} ${cat.label}`;
      suggestCategory.appendChild(option);
    });
  }
  
  // Open modal
  if (suggestBtn) {
    suggestBtn.addEventListener('click', () => {
      if (suggestModal) {
        suggestModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  }
  
  // Close modal
  if (closeSuggestModal) {
    closeSuggestModal.addEventListener('click', closeSuggestionModal);
  }
  
  if (suggestModal) {
    suggestModal.addEventListener('click', (e) => {
      if (e.target === suggestModal) {
        closeSuggestionModal();
      }
    });
  }
  
  // Form submission
  if (suggestForm) {
    suggestForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Check if user is banned before allowing submission
      if (typeof window.checkBanStatus === 'function') {
        const isBanned = await window.checkBanStatus();
        if (isBanned) return; // Banned user will be redirected
      }
      
      const title = document.getElementById('suggestTitle').value.trim();
      const category = document.getElementById('suggestCategory').value;
      const reason = document.getElementById('suggestReason').value.trim();
      
      if (!title) {
        showNotification('Please enter a market question', 'error');
        return;
      }
      
      // Get user info if logged in
      const user = Auth.currentUser;
      const userId = user ? user.uid : null;
      const userEmail = user ? user.email : null;
      const userName = user ? user.displayName : null;
      
      const result = await MulonData.submitSuggestion(title, category, reason, userId, userEmail, userName);
      
      if (result.success) {
        showNotification('Thanks! Your suggestion has been submitted.', 'success');
        suggestForm.reset();
        closeSuggestionModal();
      } else {
        showNotification(result.error || 'Error submitting suggestion. Please try again.', 'error');
      }
    });
  }
}

function closeSuggestionModal() {
  const suggestModal = document.getElementById('suggestModal');
  if (suggestModal) {
    suggestModal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ========================================
// SIDEBAR
// ========================================
function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');
  const sidebarTabs = document.querySelectorAll('.sidebar-tab');
  
  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
      document.body.classList.toggle('sidebar-open');
    });
  }
  
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
      document.body.classList.remove('sidebar-open');
    });
  }
  
  sidebarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sidebarTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      document.querySelectorAll('.sidebar-panel').forEach(panel => {
        panel.classList.remove('active');
      });
      document.getElementById(tabName + 'Panel').classList.add('active');
    });
  });
}

// ========================================
// USER UI UPDATES
// ========================================
function updateUserUI() {
  updateBalanceDisplay();
  updateKeysDisplay();
  updatePortfolioDisplay();
  updateWatchlistDisplay();
  updateCashoutsDisplay();
}

function updateBalanceDisplay() {
  const balanceEl = document.getElementById('userBalance');
  const balance = UserData.getBalance();
  
  if (balanceEl) {
    balanceEl.textContent = formatBalance(balance);
  }
  
  // Update max amount in modal
  if (amountInput) {
    amountInput.max = balance;
  }
}

function updateKeysDisplay() {
  const keysEl = document.getElementById('userKeys');
  const keys = UserData.getKeys();
  
  if (keysEl) {
    keysEl.innerHTML = '<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ' + keys;
  }
}

function setupKeysTooltip() {
  const keysInfoBtn = document.getElementById('keysInfoBtn');
  const keysTooltip = document.getElementById('keysTooltip');
  
  if (keysInfoBtn && keysTooltip) {
    keysInfoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      keysTooltip.classList.toggle('active');
    });
    
    document.addEventListener('click', () => {
      keysTooltip.classList.remove('active');
    });
  }
}

// ========================================
// DAILY KEY CLAIM
// ========================================
let dailyKeyTimerInterval = null;

function setupDailyKeyClaim() {
  const claimBtn = document.getElementById('claimDailyKeyBtn');
  
  if (claimBtn) {
    claimBtn.addEventListener('click', async () => {
      if (!Auth.getUser()) {
        // Show sign in modal
        document.getElementById('signinRequiredModal').classList.add('active');
        return;
      }
      
      const result = await UserData.claimDailyKey();
      if (result.success) {
        updateKeysDisplay();
        updateBalanceDisplay();
        updateDailyKeyUI();
        
        // Show reward notification
        showNotification(
          `🔥 Day ${result.streak} Streak! +${result.keysReward} Keys & +$${result.balanceReward} (${result.multiplier}x)`, 
          'success'
        );
        
        // Animate the button
        claimBtn.classList.add('claimed');
        claimBtn.querySelector('.claim-text').textContent = 'Claimed!';
        setTimeout(() => {
          claimBtn.classList.remove('claimed');
        }, 1000);
      }
    });
  }
}

function updateDailyKeyUI() {
  const dailyKeyBox = document.getElementById('dailyKeyBox');
  const claimBtn = document.getElementById('claimDailyKeyBtn');
  const timerDiv = document.getElementById('dailyKeyTimer');
  const timerValue = document.getElementById('timerValue');
  const dailyKeyDesc = document.getElementById('dailyKeyDesc');
  const streakFlame = document.getElementById('streakFlame');
  const streakCount = document.getElementById('streakCount');
  const previewKeys = document.getElementById('previewKeys');
  const previewBalance = document.getElementById('previewBalance');
  const rewardMultiplier = document.getElementById('rewardMultiplier');
  const rewardPreview = document.getElementById('rewardPreview');
  
  // Only show for signed in users
  if (!Auth.getUser()) {
    if (dailyKeyBox) dailyKeyBox.style.display = 'none';
    return;
  }
  
  if (dailyKeyBox) dailyKeyBox.style.display = 'block';
  
  const canClaim = UserData.canClaimDailyKey();
  const rewardInfo = UserData.getStreakRewardInfo();
  
  // Update streak display
  if (streakCount) streakCount.textContent = rewardInfo.currentStreak;
  if (streakFlame) {
    // Show fire emoji based on streak level
    if (rewardInfo.currentStreak >= 7) {
      streakFlame.textContent = '🔥';
      streakFlame.style.fontSize = '2rem';
    } else if (rewardInfo.currentStreak >= 3) {
      streakFlame.textContent = '🔥';
      streakFlame.style.fontSize = '1.5rem';
    } else {
      streakFlame.textContent = '✨';
      streakFlame.style.fontSize = '1.2rem';
    }
  }
  
  // Update reward preview
  if (previewKeys) previewKeys.textContent = rewardInfo.keysReward;
  if (previewBalance) previewBalance.textContent = rewardInfo.balanceReward;
  if (rewardMultiplier) rewardMultiplier.textContent = rewardInfo.multiplier + 'x';
  
  if (canClaim) {
    // User can claim
    if (claimBtn) {
      claimBtn.style.display = 'flex';
      claimBtn.disabled = false;
      claimBtn.querySelector('.claim-text').textContent = 'Claim Rewards';
    }
    if (timerDiv) timerDiv.style.display = 'none';
    if (rewardPreview) rewardPreview.style.display = 'flex';
    
    if (dailyKeyDesc) {
      if (rewardInfo.currentStreak > 0) {
        dailyKeyDesc.textContent = `Day ${rewardInfo.nextStreak} reward ready!`;
      } else {
        dailyKeyDesc.textContent = 'Start your streak!';
      }
    }
    
    // Clear timer if running
    if (dailyKeyTimerInterval) {
      clearInterval(dailyKeyTimerInterval);
      dailyKeyTimerInterval = null;
    }
  } else {
    // User already claimed, show timer
    if (claimBtn) claimBtn.style.display = 'none';
    if (timerDiv) timerDiv.style.display = 'flex';
    if (rewardPreview) rewardPreview.style.opacity = '0.5';
    
    if (dailyKeyDesc) {
      dailyKeyDesc.textContent = `🔥 ${rewardInfo.currentStreak} day streak!`;
    }
    
    // Start timer update
    updateDailyKeyTimer();
    if (!dailyKeyTimerInterval) {
      dailyKeyTimerInterval = setInterval(updateDailyKeyTimer, 1000);
    }
  }
}

function updateDailyKeyTimer() {
  const timerValue = document.getElementById('timerValue');
  const timeLeft = UserData.getTimeUntilNextClaim();
  
  if (timeLeft <= 0) {
    // Timer done, can claim now
    updateDailyKeyUI();
    return;
  }
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
  if (timerValue) {
    timerValue.textContent = 
      String(hours).padStart(2, '0') + ':' + 
      String(minutes).padStart(2, '0') + ':' + 
      String(seconds).padStart(2, '0');
  }
}

function updatePortfolioDisplay() {
  const positions = UserData.getPositions();
  const positionsList = document.getElementById('positionsList');
  const emptyPortfolio = document.getElementById('emptyPortfolio');
  const positionCount = document.getElementById('positionCount');
  const portfolioValue = document.getElementById('portfolioValue');
  const totalValue = document.getElementById('totalValue');
  const totalPnl = document.getElementById('totalPnl');
  
  if (positionCount) {
    positionCount.textContent = positions.length;
  }
  
  // Calculate portfolio value
  let portfolioTotal = 0;
  let totalCost = 0;
  
  positions.forEach(pos => {
    const market = MulonData.getMarket(pos.marketId);
    if (market) {
      const currentPrice = pos.choice === 'yes' ? market.yesPrice : market.noPrice;
      portfolioTotal += (pos.shares * currentPrice) / 100;
      totalCost += pos.costBasis;
    }
  });
  
  const pnl = portfolioTotal - totalCost;
  const balance = UserData.getBalance();
  
  if (portfolioValue) {
    portfolioValue.textContent = formatBalance(portfolioTotal);
  }
  
  if (totalValue) {
    totalValue.textContent = formatBalance(balance + portfolioTotal);
  }
  
  if (totalPnl) {
    totalPnl.textContent = formatProfit(pnl);
    totalPnl.className = 'stat-value ' + (pnl >= 0 ? 'pnl-positive' : 'pnl-negative');
  }
  
  if (positions.length === 0) {
    if (emptyPortfolio) emptyPortfolio.style.display = 'flex';
    if (positionsList) positionsList.innerHTML = '';
    return;
  }
  
  if (emptyPortfolio) emptyPortfolio.style.display = 'none';
  
  if (positionsList) {
    positionsList.innerHTML = positions.map(pos => {
      const market = MulonData.getMarket(pos.marketId);
      const currentPrice = market ? (pos.choice === 'yes' ? market.yesPrice : market.noPrice) : pos.avgPrice;
      const currentValue = (pos.shares * currentPrice) / 100;
      const posPnl = currentValue - pos.costBasis;
      const pnlPercent = ((currentValue / pos.costBasis - 1) * 100).toFixed(1);
      const isResolved = market?.resolved === true;
      
      // Get custom label or default
      const choiceLabel = market && market.customLabels 
        ? (pos.choice === 'yes' ? (market.yesLabel || 'YES') : (market.noLabel || 'NO'))
        : pos.choice.toUpperCase();
      
      return `
        <div class="position-item" data-market-id="${pos.marketId}">
          <div class="position-header">
            <div class="position-market">${pos.marketTitle}</div>
            ${isResolved ? '<span class="position-resolved-badge">Resolved</span>' : ''}
          </div>
          <div class="position-details">
            <div class="position-info">
              <span class="position-badge ${pos.choice}">${choiceLabel}</span>
              <span class="position-shares">${pos.shares.toFixed(2)} shares @ ${pos.avgPrice}¢</span>
            </div>
            <div class="position-value">
              <div class="position-current">${formatBalance(currentValue)}</div>
              <div class="position-pnl ${posPnl >= 0 ? 'positive' : 'negative'}">
                ${formatProfit(posPnl)} (${pnlPercent}%)
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function updateWatchlistDisplay() {
  const watchlist = UserData.getWatchlist();
  const watchlistItems = document.getElementById('watchlistItems');
  const emptyWatchlist = document.getElementById('emptyWatchlist');
  
  if (watchlist.length === 0) {
    if (emptyWatchlist) emptyWatchlist.style.display = 'flex';
    if (watchlistItems) watchlistItems.innerHTML = '';
    return;
  }
  
  if (emptyWatchlist) emptyWatchlist.style.display = 'none';
  
  if (watchlistItems) {
    watchlistItems.innerHTML = watchlist.map(marketId => {
      const market = MulonData.getMarket(marketId);
      if (!market) return '';
      
      const category = MulonData.getCategory(market.category);
      const yesLabel = market.customLabels && market.yesLabel ? market.yesLabel : 'Yes';
      const noLabel = market.customLabels && market.noLabel ? market.noLabel : 'No';
      
      return `
        <div class="watchlist-item" data-market-id="${marketId}">
          <div class="watchlist-icon">${category.icon}</div>
          <div class="watchlist-info">
            <div class="watchlist-title">${market.title}</div>
            <div class="watchlist-price">
              <span style="color: var(--green-primary)">${yesLabel} ${market.yesPrice}¢</span> · 
              <span style="color: var(--red-primary)">${noLabel} ${market.noPrice}¢</span>
            </div>
          </div>
          <button class="watchlist-remove" data-market-id="${marketId}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;
    }).join('');
    
    // Attach remove listeners
    watchlistItems.querySelectorAll('.watchlist-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await UserData.removeFromWatchlist(btn.dataset.marketId);
        updateWatchlistDisplay();
      });
    });
    
    // Click to open market
    watchlistItems.querySelectorAll('.watchlist-item').forEach(item => {
      item.addEventListener('click', () => {
        const marketId = item.dataset.marketId;
        const market = MulonData.getMarket(marketId);
        if (market) {
          currentMarketId = marketId;
          currentYesPrice = market.yesPrice;
          currentNoPrice = market.noPrice;
          currentChoice = 'yes';
          
          const category = MulonData.getCategory(market.category);
          if (modalTitle) modalTitle.textContent = market.title;
          document.querySelector('.modal-market-icon').textContent = category.icon;
          if (yesPrice) yesPrice.textContent = market.yesPrice + '¢';
          if (noPrice) noPrice.textContent = market.noPrice + '¢';
          
          updateModalChoice();
          updatePayout();
          
          if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
          }
        }
      });
    });
  }
}

function updateCashoutsDisplay() {
  const cashouts = UserData.getCashOuts();
  const cashoutsList = document.getElementById('cashoutsList');
  const emptyCashouts = document.getElementById('emptyCashouts');
  const totalWonEl = document.getElementById('totalWon');
  const totalLostEl = document.getElementById('totalLost');
  const cashoutCount = document.getElementById('cashoutCount');
  
  // Calculate totals
  let totalWon = 0;
  let totalLost = 0;
  
  cashouts.forEach(co => {
    if (co.won) {
      totalWon += co.payout;
    } else {
      totalLost += co.cost;
    }
  });
  
  if (totalWonEl) totalWonEl.textContent = '$' + totalWon.toFixed(2);
  if (totalLostEl) totalLostEl.textContent = '$' + totalLost.toFixed(2);
  if (cashoutCount) cashoutCount.textContent = cashouts.length;
  
  if (cashouts.length === 0) {
    if (emptyCashouts) emptyCashouts.style.display = 'flex';
    if (cashoutsList) cashoutsList.innerHTML = '';
    return;
  }
  
  if (emptyCashouts) emptyCashouts.style.display = 'none';
  
  if (cashoutsList) {
    // Sort by timestamp, most recent first
    const sortedCashouts = [...cashouts].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    cashoutsList.innerHTML = sortedCashouts.map(co => {
      const market = MulonData.getMarket(co.marketId);
      const marketTitle = market ? market.title : co.marketTitle || 'Unknown Market';
      const resultText = co.won ? 'WON' : 'LOST';
      const payoutText = co.won ? '+$' + co.payout.toFixed(2) : '-$' + co.cost.toFixed(2);
      
      return `
        <div class="cashout-item">
          <div class="cashout-icon ${co.won ? 'won' : 'lost'}">
            ${co.won ? '✓' : '✗'}
          </div>
          <div class="cashout-details">
            <div class="cashout-market">${marketTitle}</div>
            <div class="cashout-position">${co.shares} ${co.position.toUpperCase()} shares @ ${co.avgPrice}¢</div>
          </div>
          <div class="cashout-amount">
            <div class="cashout-payout ${co.won ? 'won' : 'lost'}">${payoutText}</div>
            <div class="cashout-result ${co.won ? 'won' : 'lost'}">${resultText}</div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ========================================
// NOTIFICATIONS
// ========================================
function showNotification(message, type = 'success') {
  // Remove existing notification
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification-close">×</button>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Close button
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  });
  
  // Auto remove
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// ========================================
// WIN CELEBRATION
// ========================================
function checkForUnseenWins() {
  const unseenWins = UserData.getUnseenWins();
  
  if (unseenWins.length > 0) {
    showWinCelebration(unseenWins);
  }
}

function showWinCelebration(wins) {
  const overlay = document.getElementById('winCelebrationOverlay');
  const body = document.getElementById('winModalBody');
  const okBtn = document.getElementById('winModalOkBtn');
  const confettiContainer = document.getElementById('confettiContainer');
  
  if (!overlay || !body) return;
  
  // Generate confetti (only once, even for multiple wins)
  createConfetti(confettiContainer);
  
  // Build win items HTML
  body.innerHTML = wins.map(win => {
    return `
      <div class="win-item">
        <div class="win-item-icon">🎉</div>
        <div class="win-item-details">
          <div class="win-item-market">${win.marketTitle || 'Market'}</div>
          <div class="win-item-info">${win.shares} ${win.position.toUpperCase()} shares</div>
        </div>
        <div class="win-item-payout">+$${win.payout.toFixed(2)}</div>
      </div>
    `;
  }).join('');
  
  // Calculate total
  const totalWon = wins.reduce((sum, w) => sum + w.payout, 0);
  if (wins.length > 1) {
    body.innerHTML += `
      <div class="win-item" style="background: linear-gradient(135deg, rgba(0, 200, 83, 0.1), rgba(0, 200, 83, 0.05)); border-left-color: gold;">
        <div class="win-item-icon">💰</div>
        <div class="win-item-details">
          <div class="win-item-market">Total Winnings</div>
          <div class="win-item-info">${wins.length} winning positions</div>
        </div>
        <div class="win-item-payout" style="color: gold;">+$${totalWon.toFixed(2)}</div>
      </div>
    `;
  }
  
  // Show overlay
  overlay.classList.add('active');
  
  // Handle OK button
  okBtn.onclick = async () => {
    // Mark all as seen
    const cashoutIds = wins.map(w => w.marketId + '_' + w.timestamp);
    await UserData.markCashoutsAsSeen(cashoutIds);
    
    // Hide overlay
    overlay.classList.remove('active');
    
    // Clear confetti
    confettiContainer.innerHTML = '';
  };
}

function createConfetti(container) {
  if (!container) return;
  
  const colors = ['#00c853', '#ffd700', '#ff4757', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
  const shapes = ['square', 'circle'];
  
  for (let i = 0; i < 150; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const size = Math.random() * 8 + 6;
    const duration = Math.random() * 2 + 2;
    
    confetti.style.cssText = `
      left: ${left}%;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${shape === 'circle' ? '50%' : '2px'};
      animation-delay: ${delay}s;
      animation-duration: ${duration}s;
    `;
    
    container.appendChild(confetti);
  }
}
