// ========================================
// MULON - Main Site JavaScript
// ========================================

import { MulonData, OrderBook, Auth, UserData, OnboardingState, OverUnderSync } from './data.js';

localStorage.setItem('lol', 'nice try, but i learnt from last time.');
// Track pending Over Under sync data
let pendingOUSyncData = null;

document.addEventListener('DOMContentLoaded', async function() {
  // Initialize Firebase Auth
  Auth.init();
  
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
  
  // Listen for auth state changes
  Auth.onAuthStateChange((user) => {
    updateAuthUI(user);
    updateUserUI();
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
}

function updateAuthUI(user) {
  const userInitials = document.getElementById('userInitials');
  const userPhoto = document.getElementById('userPhoto');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const signOutBtn = document.getElementById('signOutBtn');
  const headerSignInBtn = document.getElementById('headerSignInBtn');
  
  if (user && !user.isGuest) {
    // Signed in
    if (userPhoto && user.photoURL) {
      userPhoto.src = user.photoURL;
      userPhoto.style.display = 'block';
      if (userInitials) userInitials.style.display = 'none';
    } else if (userInitials) {
      const initials = user.displayName 
        ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';
      userInitials.textContent = initials;
      userInitials.style.display = 'flex';
      if (userPhoto) userPhoto.style.display = 'none';
    }
    
    if (userName) userName.textContent = user.displayName || 'User';
    if (userEmail) userEmail.textContent = user.email || '';
    if (signOutBtn) signOutBtn.style.display = 'flex';
    if (headerSignInBtn) headerSignInBtn.style.display = 'none';
  } else {
    // Guest or signed out
    if (userInitials) {
      userInitials.textContent = user?.isGuest ? 'G' : '?';
      userInitials.style.display = 'flex';
    }
    if (userPhoto) userPhoto.style.display = 'none';
    if (userName) userName.textContent = user?.isGuest ? 'Guest' : 'Not signed in';
    if (userEmail) userEmail.textContent = user?.isGuest ? 'Browsing only' : 'Sign in to trade';
    if (signOutBtn) signOutBtn.style.display = 'none';
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

function renderMarkets() {
  const currentCat = getCurrentCategory();
  let markets = MulonData.getActiveMarkets();
  
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
  
  // Status display
  let statusBadge = '';
  if (isResolved) {
    const outcome = market.resolvedOutcome === 'yes' ? '✓ YES Won' : '✗ NO Won';
    statusBadge = `<span class="market-result ${market.resolvedOutcome}">${outcome}</span>`;
  } else if (isPending) {
    statusBadge = `<span class="market-result pending">⏳ Awaiting Result</span>`;
  }
  
  return `
    <div class="featured-slide ${index === 0 ? 'active' : ''}" data-slide-index="${index}">
      <div class="featured-card ${isResolved ? 'resolved' : ''} ${isPending ? 'pending' : ''}" data-market-id="${market.id}">
        <div class="card-header">
          <div class="card-category">
            <span class="category-tag ${market.category}">${category.icon} ${category.label}</span>
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
        
        <div class="probability-bar">
          <div class="prob-fill" style="width: ${market.yesPrice}%;"></div>
        </div>
        <div class="prob-labels">
          <span class="prob-yes">${market.yesPrice}% Yes</span>
          <span class="prob-no">${market.noPrice}% No</span>
        </div>

        ${canBet ? `
          <div class="bet-buttons">
            <button class="bet-btn yes" data-market-id="${market.id}" data-choice="yes">
              <div class="bet-label">Yes</div>
              <div class="bet-price">${market.yesPrice}¢</div>
            </button>
            <button class="bet-btn no" data-market-id="${market.id}" data-choice="no">
              <div class="bet-label">No</div>
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
              <span class="position-label">You picked ${userPosition.choice.toUpperCase()}</span>
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
  
  // Status badge
  let statusBadge = '';
  if (isResolved) {
    const outcome = market.resolvedOutcome === 'yes' ? '✓ YES' : '✗ NO';
    statusBadge = `<span class="card-status resolved ${market.resolvedOutcome}">${outcome}</span>`;
  } else if (isPending) {
    statusBadge = `<span class="card-status pending">⏳ Pending</span>`;
  }
  
  return `
    <div class="market-card ${isResolved ? 'resolved' : ''} ${isPending ? 'pending' : ''}" data-market-id="${market.id}">
      <div class="card-category">
        <span class="category-tag ${market.category}">${category.icon} ${category.label}</span>
        ${statusBadge}
      </div>
      <h4 class="card-title">${market.title}</h4>
      <div class="card-time small">
        <span>Ends ${MulonData.formatDate(market.endDate)}${market.endTime ? ' @ ' + market.endTime : ''}</span>
      </div>
      <div class="probability-bar small">
        <div class="prob-fill" style="width: ${market.yesPrice}%;"></div>
      </div>
      ${canBet ? `
        <div class="bet-buttons compact">
          <button class="bet-btn yes compact" data-market-id="${market.id}" data-choice="yes">
            <span>Yes</span>
            <span class="price">${market.yesPrice}¢</span>
          </button>
          <button class="bet-btn no compact" data-market-id="${market.id}" data-choice="no">
            <span>No</span>
            <span class="price">${market.noPrice}¢</span>
          </button>
        </div>
      ` : hasBet ? `
        <div class="user-position-compact ${userPosition.choice}">
          <span class="position-icon">${userPosition.choice === 'yes' ? '✓' : '✗'}</span>
          <span>You picked ${userPosition.choice.toUpperCase()}</span>
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

  // Tab switching (Buy/Sell)
  modalTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      modalTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      const tabType = this.dataset.tab;
      if (tabType === 'sell') {
        buyBtn.textContent = 'Sell';
        buyBtn.classList.add('sell-mode');
      } else {
        buyBtn.textContent = 'Buy';
        buyBtn.classList.remove('sell-mode');
      }
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
      const isSelling = this.classList.contains('sell-mode');
      
      if (!isSelling && amount > balance) {
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
        // Execute order through the order book (with user ID)
        const userId = Auth.getUser()?.uid || 'anonymous';
        const result = await OrderBook.executeMarketOrder(
          currentMarketId,
          isSelling ? 'sell' : 'buy',
          currentChoice,
          amount,
          userId
        );
        
        if (!result.filled) {
          showNotification(result.error || 'Order could not be filled', 'error');
          return;
        }
        
        if (isSelling) {
          // Add proceeds to balance
          await UserData.updateBalance(amount);
          showNotification(
            `Sold ${result.shares} ${currentChoice.toUpperCase()} @ ${result.avgPrice}¢ for $${amount.toFixed(2)}! Price moved to ${result.newPrice}¢`, 
            'success'
          );
        } else {
          // Deduct from balance and add position
          await UserData.updateBalance(-amount);
          await UserData.addPosition(
            currentMarketId,
            market.title,
            currentChoice,
            result.shares,
            amount,
            result.avgPrice
          );
          
          // Show price impact
          const priceChangeText = result.priceChange !== 0 
            ? ` (${result.priceChange > 0 ? '+' : ''}${result.priceChange}¢)` 
            : '';
          
          showNotification(
            `Bought ${result.shares} ${currentChoice.toUpperCase()} @ ${result.avgPrice}¢${priceChangeText} → Now ${result.newPrice}¢`, 
            'success'
          );
        }
        
        // Update UI with new prices
        updateUserUI();
        renderMarkets(); // Re-render to show new prices
        closeModal();
        
      } catch (error) {
        console.error('Order execution error:', error);
        showNotification('Order failed. Please try again.', 'error');
      } finally {
        buyBtn.disabled = false;
        buyBtn.textContent = isSelling ? 'Sell' : 'Buy';
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
      currentYesPrice = market.yesPrice;
      currentNoPrice = market.noPrice;
      currentChoice = choice;
      
      // Update modal content
      const category = MulonData.getCategory(market.category);
      
      if (modalTitle) modalTitle.textContent = market.title;
      document.querySelector('.modal-market-icon').textContent = category.icon;
      if (yesPrice) yesPrice.textContent = market.yesPrice + '¢';
      if (noPrice) noPrice.textContent = market.noPrice + '¢';
      
      updateModalChoice();
      updatePayout();
      
      // Show modal
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  // Make market cards clickable
  const marketCards = document.querySelectorAll('.market-card');
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

function updateModalChoice() {
  if (currentChoice === 'yes') {
    if (priceYesBtn) priceYesBtn.classList.add('active');
    if (priceNoBtn) priceNoBtn.classList.remove('active');
    if (modalChoice) {
      modalChoice.textContent = 'Yes';
      modalChoice.className = 'choice-yes';
    }
    if (oddsValue) oddsValue.textContent = currentYesPrice + '¢';
  } else {
    if (priceNoBtn) priceNoBtn.classList.add('active');
    if (priceYesBtn) priceYesBtn.classList.remove('active');
    if (modalChoice) {
      modalChoice.textContent = 'No';
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
  payoutValue.textContent = '$' + payout;
  
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
      
      const title = document.getElementById('suggestTitle').value.trim();
      const category = document.getElementById('suggestCategory').value;
      const reason = document.getElementById('suggestReason').value.trim();
      
      if (!title) {
        showNotification('Please enter a market question', 'error');
        return;
      }
      
      // Get user info if logged in
      const user = Auth.getCurrentUser();
      const userId = user ? user.uid : null;
      const userEmail = user ? user.email : null;
      const userName = user ? user.displayName : null;
      
      const result = await MulonData.submitSuggestion(title, category, reason, userId, userEmail, userName);
      
      if (result.success) {
        showNotification('Thanks! Your suggestion has been submitted.', 'success');
        suggestForm.reset();
        closeSuggestionModal();
      } else {
        showNotification('Error submitting suggestion. Please try again.', 'error');
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
  updatePortfolioDisplay();
  updateWatchlistDisplay();
  updateCashoutsDisplay();
}

function updateBalanceDisplay() {
  const balanceEl = document.getElementById('userBalance');
  const balance = UserData.getBalance();
  
  if (balanceEl) {
    balanceEl.textContent = '$' + balance.toFixed(2);
  }
  
  // Update max amount in modal
  if (amountInput) {
    amountInput.max = balance;
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
    portfolioValue.textContent = '$' + portfolioTotal.toFixed(2);
  }
  
  if (totalValue) {
    totalValue.textContent = '$' + (balance + portfolioTotal).toFixed(2);
  }
  
  if (totalPnl) {
    const pnlSign = pnl >= 0 ? '+' : '';
    totalPnl.textContent = pnlSign + '$' + pnl.toFixed(2);
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
      
      return `
        <div class="position-item" data-market-id="${pos.marketId}">
          <div class="position-market">${pos.marketTitle}</div>
          <div class="position-details">
            <div class="position-info">
              <span class="position-badge ${pos.choice}">${pos.choice.toUpperCase()}</span>
              <span class="position-shares">${pos.shares.toFixed(2)} shares @ ${pos.avgPrice}¢</span>
            </div>
            <div class="position-value">
              <div class="position-current">$${currentValue.toFixed(2)}</div>
              <div class="position-pnl ${posPnl >= 0 ? 'positive' : 'negative'}">
                ${posPnl >= 0 ? '+' : ''}$${posPnl.toFixed(2)} (${pnlPercent}%)
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
      
      return `
        <div class="watchlist-item" data-market-id="${marketId}">
          <div class="watchlist-icon">${category.icon}</div>
          <div class="watchlist-info">
            <div class="watchlist-title">${market.title}</div>
            <div class="watchlist-price">
              <span style="color: var(--green-primary)">Yes ${market.yesPrice}¢</span> · 
              <span style="color: var(--red-primary)">No ${market.noPrice}¢</span>
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
