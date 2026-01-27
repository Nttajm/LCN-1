// Marketplace.js - Full Trading System with Firestore Integration

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

// Import shared card data and renderer
import { cardsData, getCardsByRarity, getCardByNumber, getCardById } from '../card-data/cards-data.js';
import { createMiniCardHTML, createCardChipHTML, getRarityColor, createCardHTML, setup3DCardTracking } from '../card-data/card-renderer.js';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAGcg43F94bWqUuyLH-AjghrAfduEVQ8ZM",
  authDomain: "overunder-ths.firebaseapp.com",
  projectId: "overunder-ths",
  storageBucket: "overunder-ths.firebasestorage.app",
  messagingSenderId: "690530120785",
  appId: "1:690530120785:web:36dc297cb517ac76cb7470"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const usersRef = collection(db, 'mulon_users');
const tradesRef = collection(db, 'mulon_trades');
const bannedDevicesRef = collection(db, 'mulon_banned_devices');

// ========================================
// BAN CHECK SYSTEM
// ========================================

// Generate device fingerprint
function generateDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform
  ];
  
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  let persistentId = localStorage.getItem('mulon_device_id');
  if (!persistentId) {
    persistentId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('mulon_device_id', persistentId);
  }
  
  return persistentId + '_' + Math.abs(hash).toString(36);
}

// Check if user/device is banned
async function checkBanStatus() {
  try {
    const user = auth.currentUser;
    const deviceFingerprint = generateDeviceFingerprint();
    
    // Check device ban first
    const deviceDoc = await getDoc(doc(bannedDevicesRef, deviceFingerprint));
    if (deviceDoc.exists()) {
      console.log('Device is banned, redirecting...');
      window.location.href = 'https://www.google.com';
      return true;
    }
    
    // If user is signed in, check user ban
    if (user) {
      const userDoc = await getDoc(doc(usersRef, user.uid));
      if (userDoc.exists() && userDoc.data().banned === true) {
        console.log('User is banned, redirecting...');
        window.location.href = 'https://www.google.com';
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking ban status:', error);
    return false;
  }
}

// Make available globally
window.checkBanStatus = checkBanStatus;

// User state
let currentUser = null;
let userBalance = 0;
let userKeys = 0;
let userOwnedCards = []; // Array of card objects { docId, cardNumber, hasCard, ... }
let userTradeIds = []; // Trade IDs the user has posted

// Trade modal state
let offerSelectedCards = []; // Array of { docId, cardNumber } for cards being offered
let askSelectedCards = []; // Array of cardNumber strings for cards being asked
let currentGalleryMode = 'offer'; // 'offer' or 'ask'
let tempSelectedCards = [];

// Marketplace trades from Firestore
let marketplaceTrades = [];
let tradesPollingInterval = null;
let historyPollingInterval = null;
const POLLING_INTERVAL_MS = 2000; // Poll every 2 seconds

// Filter state
const filterState = {
  showAll: true,
  keysForCards: false,
  cardsForKeys: false,
  moneyForCards: false,
  cardsForMoney: false,
  cardsForCards: false
};

// All trades (including completed) for history
let allTradesHistory = [];
let currentLiveTab = 'live'; // 'live' or 'history'
let unreadNotifications = []; // Trade IDs with unread notifications

document.addEventListener('DOMContentLoaded', () => {
  // ========================================
  // LIVE TRADES SIDEBAR TABS
  // ========================================
  const liveTabs = document.querySelectorAll('.live-tab');
  const liveTradesList = document.getElementById('liveTradesList');
  const historyTradesList = document.getElementById('historyTradesList');
  
  liveTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabType = tab.dataset.tab;
      currentLiveTab = tabType;
      
      // Update active tab
      liveTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show/hide content
      if (tabType === 'live') {
        if (liveTradesList) liveTradesList.style.display = 'flex';
        if (historyTradesList) historyTradesList.style.display = 'none';
      } else {
        if (liveTradesList) liveTradesList.style.display = 'none';
        if (historyTradesList) historyTradesList.style.display = 'flex';
        renderHistoryTrades();
      }
    });
  });

  // ========================================
  // TRADE FILTER FUNCTIONALITY
  // ========================================
  const tradeFilters = document.querySelectorAll('.trade-filter');
  const switchButtons = document.querySelectorAll('.trade-switch');
  const showAllBtn = document.getElementById('showAllTradesBtn');

  function applyFilters() {
    const sortBy = document.querySelector('.filter-select')?.value || 'newest';
    renderMarketplaceTrades(sortBy);
  }

  function filterTrade(trade) {
    // If show all is active, show everything
    if (filterState.showAll) return true;
    
    const hasOfferKeys = trade.offer.keys > 0;
    const hasOfferMoney = trade.offer.money > 0;
    const hasOfferCards = trade.offer.cards && trade.offer.cards.length > 0;
    const hasAskKeys = trade.ask.keys > 0;
    const hasAskMoney = trade.ask.money > 0;
    const hasAskCards = trade.ask.cards && trade.ask.cards.length > 0;
    
    // Check each active filter
    if (filterState.keysForCards && hasOfferKeys && hasAskCards) return true;
    if (filterState.cardsForKeys && hasOfferCards && hasAskKeys) return true;
    if (filterState.moneyForCards && hasOfferMoney && hasAskCards) return true;
    if (filterState.cardsForMoney && hasOfferCards && hasAskMoney) return true;
    if (filterState.cardsForCards && hasOfferCards && hasAskCards) return true;
    
    // If no specific filters active, show all
    const anyFilterActive = filterState.keysForCards || filterState.cardsForKeys || 
                            filterState.moneyForCards || filterState.cardsForMoney || 
                            filterState.cardsForCards;
    
    return !anyFilterActive;
  }

  // Show All button
  if (showAllBtn) {
    showAllBtn.addEventListener('click', () => {
      filterState.showAll = !filterState.showAll;
      showAllBtn.classList.toggle('active', filterState.showAll);
      
      // Deactivate other filters when show all is on
      if (filterState.showAll) {
        tradeFilters.forEach(f => f.classList.remove('active'));
        filterState.keysForCards = false;
        filterState.cardsForKeys = false;
        filterState.moneyForCards = false;
        filterState.cardsForMoney = false;
        filterState.cardsForCards = false;
      }
      applyFilters();
    });
  }

  tradeFilters.forEach(filter => {
    filter.addEventListener('click', (e) => {
      if (e.target.closest('.trade-switch')) return;
      
      const type = filter.dataset.type;
      const isReversed = filter.classList.contains('reversed');
      
      // Toggle this filter
      filter.classList.toggle('active');
      
      // Update filter state based on type and direction
      if (type === 'keys') {
        if (isReversed) {
          filterState.cardsForKeys = filter.classList.contains('active');
        } else {
          filterState.keysForCards = filter.classList.contains('active');
        }
      } else if (type === 'money') {
        if (isReversed) {
          filterState.cardsForMoney = filter.classList.contains('active');
        } else {
          filterState.moneyForCards = filter.classList.contains('active');
        }
      } else if (type === 'cards') {
        filterState.cardsForCards = filter.classList.contains('active');
      }
      
      // Deactivate show all when specific filter is chosen
      const anyActive = filterState.keysForCards || filterState.cardsForKeys || 
                        filterState.moneyForCards || filterState.cardsForMoney ||
                        filterState.cardsForCards;
      if (anyActive) {
        filterState.showAll = false;
        if (showAllBtn) showAllBtn.classList.remove('active');
      }
      
      applyFilters();
    });
  });

  switchButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = btn.dataset.target;
      const filter = btn.closest('.trade-filter');
      
      if (filter) {
        const wasActive = filter.classList.contains('active');
        const wasReversed = filter.classList.contains('reversed');
        
        filter.classList.toggle('reversed');
        
        // Update hint text
        const hintEl = document.getElementById(`${target}TradeHint`);
        if (hintEl) {
          const isNowReversed = filter.classList.contains('reversed');
          if (target === 'keys') {
            hintEl.innerHTML = isNowReversed 
              ? 'Trading <strong>Cards</strong> for <strong>Keys</strong>'
              : 'Trading <strong>Keys</strong> for <strong>Cards</strong>';
          } else if (target === 'money') {
            hintEl.innerHTML = isNowReversed 
              ? 'Trading <strong>Cards</strong> for <strong>Money</strong>'
              : 'Trading <strong>Money</strong> for <strong>Cards</strong>';
          }
        }
        
        // Update filter state if this filter was active
        if (wasActive) {
          if (target === 'keys') {
            filterState.keysForCards = !wasReversed ? false : true;
            filterState.cardsForKeys = wasReversed ? false : true;
          } else if (target === 'money') {
            filterState.moneyForCards = !wasReversed ? false : true;
            filterState.cardsForMoney = wasReversed ? false : true;
          }
          applyFilters();
        }
      }
    });
  });

  const sortSelect = document.querySelector('.filter-select');
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);

  // ========================================
  // POST TRADE MODAL
  // ========================================
  const postTradeModal = document.getElementById('postTradeModal');
  const cardGalleryModal = document.getElementById('cardGalleryModal');
  const postTradeBtn = document.querySelector('.action-btn');
  const closePostTradeBtn = document.getElementById('closePostTradeModal');
  const cancelTradeBtn = document.getElementById('cancelTradeBtn');
  const submitTradeBtn = document.getElementById('submitTradeBtn');
  
  const selectMyCardsBtn = document.getElementById('selectMyCardsBtn');
  const selectAnyCardsBtn = document.getElementById('selectAnyCardsBtn');
  const closeGalleryBtn = document.getElementById('closeGalleryModal');
  const cancelGalleryBtn = document.getElementById('cancelGalleryBtn');
  const confirmCardsBtn = document.getElementById('confirmCardsBtn');
  
  const offerKeysInput = document.getElementById('offerKeys');
  const offerMoneyInput = document.getElementById('offerMoney');
  const askKeysInput = document.getElementById('askKeys');
  const askMoneyInput = document.getElementById('askMoney');
  const availableKeysEl = document.getElementById('availableKeys');
  const availableMoneyEl = document.getElementById('availableMoney');
  const offerSelectedCardsEl = document.getElementById('offerSelectedCards');
  const askSelectedCardsEl = document.getElementById('askSelectedCards');
  const cardsGalleryEl = document.getElementById('cardsGallery');
  const galleryTitle = document.getElementById('galleryTitle');
  const selectedCountEl = document.getElementById('selectedCount');
  const galleryFilterBtns = document.querySelectorAll('.gallery-filter-btn');
  const maxBtns = document.querySelectorAll('.max-btn');

  // Open post trade modal
  if (postTradeBtn) {
    postTradeBtn.addEventListener('click', () => {
      if (!currentUser) {
        alert('Please sign in to post a trade.');
        return;
      }
      openPostTradeModal();
    });
  }

  function openPostTradeModal() {
    // Reset state
    offerSelectedCards = [];
    askSelectedCards = [];
    
    if (offerKeysInput) offerKeysInput.value = 0;
    if (offerMoneyInput) offerMoneyInput.value = 0;
    if (askKeysInput) askKeysInput.value = 0;
    if (askMoneyInput) askMoneyInput.value = 0;
    
    updateOfferCardsDisplay();
    updateAskCardsDisplay();
    updateBalanceDisplay();
    updateSubmitButton();
    
    postTradeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closePostTradeModal() {
    postTradeModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closePostTradeBtn) closePostTradeBtn.addEventListener('click', closePostTradeModal);
  if (cancelTradeBtn) cancelTradeBtn.addEventListener('click', closePostTradeModal);

  postTradeModal?.addEventListener('click', (e) => {
    if (e.target === postTradeModal) closePostTradeModal();
  });

  // ========================================
  // BALANCE & MAX BUTTON LOGIC
  // ========================================
  async function loadUserData() {
    if (!currentUser) {
      userBalance = 0;
      userKeys = 0;
      userOwnedCards = [];
      userTradeIds = [];
      return;
    }

    try {
      const userDoc = await getDoc(doc(usersRef, currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        userBalance = data.balance || 0;
        userKeys = data.keys || 0;
        userTradeIds = data.tradeIds || [];
        
        // Load unread trade notifications
        const readTradeIds = data.readTradeNotifications || [];
        const completedTradeIds = data.completedTradeIds || [];
        await checkForUnreadNotifications(completedTradeIds, readTradeIds);
      } else {
        // Create user document if doesn't exist
        await setDoc(doc(usersRef, currentUser.uid), {
          balance: 500,
          keys: 15,
          tradeIds: [],
          createdAt: serverTimestamp()
        });
        userBalance = 500;
        userKeys = 15;
        userTradeIds = [];
      }
      
      // Load cards from subcollection (only cards with hasCard: true)
      await loadUserCards();
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    
    updateBalanceDisplay();
    renderMarketplaceTrades();
  }
  
  // ========================================
  // TRADE NOTIFICATIONS SYSTEM
  // ========================================
  
  // Check for unread trade notifications
  async function checkForUnreadNotifications(completedTradeIds, readTradeIds) {
    if (!currentUser || !completedTradeIds || completedTradeIds.length === 0) {
      unreadNotifications = [];
      return;
    }
    
    try {
      // Find trades that are completed but not yet read
      const unreadTradeIds = completedTradeIds.filter(id => !readTradeIds.includes(id));
      
      if (unreadTradeIds.length === 0) {
        unreadNotifications = [];
        updateNotificationBadge();
        return;
      }
      
      // Fetch the actual trade data for unread notifications
      unreadNotifications = [];
      for (const tradeId of unreadTradeIds) {
        try {
          const tradeDoc = await getDoc(doc(tradesRef, tradeId));
          if (tradeDoc.exists()) {
            const trade = { id: tradeDoc.id, ...tradeDoc.data() };
            // Only show if this trade involves the current user
            if (trade.sellerId === currentUser.uid || trade.buyerId === currentUser.uid) {
              unreadNotifications.push(trade);
            }
          }
        } catch (e) {
          console.warn('Error fetching trade for notification:', e);
        }
      }
      
      updateNotificationBadge();
      
      // Show notification toast if there are unread notifications
      if (unreadNotifications.length > 0) {
        showTradeNotifications();
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }
  
  // Update notification badge in UI
  function updateNotificationBadge() {
    let badge = document.getElementById('tradeNotificationBadge');
    
    if (unreadNotifications.length > 0) {
      if (!badge) {
        // Create badge if it doesn't exist
        const header = document.querySelector('.header-right');
        if (header) {
          badge = document.createElement('div');
          badge.id = 'tradeNotificationBadge';
          badge.className = 'notification-badge';
          badge.innerHTML = `
            <span class="badge-icon">🔔</span>
            <span class="badge-count">${unreadNotifications.length}</span>
          `;
          badge.addEventListener('click', showTradeNotifications);
          header.insertBefore(badge, header.firstChild);
        }
      } else {
        badge.querySelector('.badge-count').textContent = unreadNotifications.length;
        badge.style.display = 'flex';
      }
    } else if (badge) {
      badge.style.display = 'none';
    }
  }
  
  // Show trade notifications modal/toast
  function showTradeNotifications() {
    if (unreadNotifications.length === 0) return;
    
    // Create notification modal
    let modal = document.getElementById('tradeNotificationModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'tradeNotificationModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    
    const notificationsList = unreadNotifications.map(trade => {
      const isSeller = trade.sellerId === currentUser.uid;
      const otherParty = isSeller ? trade.buyerName : trade.sellerName;
      const timeAgo = getTimeAgo(trade.completedAt);
      
      // Build what was exchanged
      let youGave = [];
      let youReceived = [];
      
      if (isSeller) {
        // Seller gave offer, received ask
        if (trade.actualOfferKeys > 0 || trade.offer.keys > 0) youGave.push(`${trade.actualOfferKeys ?? trade.offer.keys} keys`);
        if (trade.actualOfferMoney > 0 || trade.offer.money > 0) youGave.push(`$${(trade.actualOfferMoney ?? trade.offer.money).toFixed(2)}`);
        if (trade.offer.cards?.length > 0) youGave.push(`${trade.offer.cards.length} card(s)`);
        
        if (trade.ask.keys > 0) youReceived.push(`${trade.ask.keys} keys`);
        if (trade.ask.money > 0) youReceived.push(`$${trade.ask.money.toFixed(2)}`);
        if (trade.ask.cards?.length > 0) youReceived.push(`${trade.ask.cards.length} card(s)`);
      } else {
        // Buyer gave ask, received offer
        if (trade.ask.keys > 0) youGave.push(`${trade.ask.keys} keys`);
        if (trade.ask.money > 0) youGave.push(`$${trade.ask.money.toFixed(2)}`);
        if (trade.ask.cards?.length > 0) youGave.push(`${trade.ask.cards.length} card(s)`);
        
        if (trade.actualOfferKeys > 0 || trade.offer.keys > 0) youReceived.push(`${trade.actualOfferKeys ?? trade.offer.keys} keys`);
        if (trade.actualOfferMoney > 0 || trade.offer.money > 0) youReceived.push(`$${(trade.actualOfferMoney ?? trade.offer.money).toFixed(2)}`);
        if (trade.offer.cards?.length > 0) youReceived.push(`${trade.offer.cards.length} card(s)`);
      }
      
      return `
        <div class="notification-item" data-trade-id="${trade.id}">
          <div class="notification-icon">✅</div>
          <div class="notification-content">
            <div class="notification-title">Trade Completed!</div>
            <div class="notification-details">
              <span class="notification-party">with <strong>${otherParty || 'Unknown'}</strong></span>
              <span class="notification-time">${timeAgo}</span>
            </div>
            <div class="notification-exchange">
              <span class="gave">You gave: ${youGave.join(', ') || 'Nothing'}</span>
              <span class="received">You received: ${youReceived.join(', ') || 'Nothing'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    modal.innerHTML = `
      <div class="modal notification-modal">
        <div class="modal-header">
          <h2>🔔 Trade Notifications</h2>
          <button class="modal-close" id="closeNotificationModal">&times;</button>
        </div>
        <div class="notification-list">
          ${notificationsList}
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="markAllReadBtn">Mark All as Read</button>
        </div>
      </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Event listeners
    document.getElementById('closeNotificationModal')?.addEventListener('click', closeNotificationModal);
    document.getElementById('markAllReadBtn')?.addEventListener('click', markAllNotificationsRead);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeNotificationModal();
    });
  }
  
  function closeNotificationModal() {
    const modal = document.getElementById('tradeNotificationModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
  
  // Mark all notifications as read
  async function markAllNotificationsRead() {
    if (!currentUser || unreadNotifications.length === 0) return;
    
    try {
      const tradeIds = unreadNotifications.map(t => t.id);
      
      // Update user document with read notification IDs
      await updateDoc(doc(usersRef, currentUser.uid), {
        readTradeNotifications: arrayUnion(...tradeIds)
      });
      
      // Clear local state
      unreadNotifications = [];
      updateNotificationBadge();
      closeNotificationModal();
      
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }
  
  // Load user's cards from the subcollection
  async function loadUserCards() {
    if (!currentUser) {
      userOwnedCards = [];
      return;
    }
    
    try {
      const cardsCollectionRef = collection(db, 'mulon_users', currentUser.uid, 'cards');
      const q = query(cardsCollectionRef, where('hasCard', '==', true));
      const snapshot = await getDocs(q);
      
      userOwnedCards = [];
      snapshot.forEach(docSnap => {
        userOwnedCards.push({
          docId: docSnap.id,
          ...docSnap.data()
        });
      });
      
      console.log(`Loaded ${userOwnedCards.length} cards for user`);
    } catch (error) {
      console.error('Error loading user cards:', error);
      userOwnedCards = [];
    }
  }

  function updateBalanceDisplay() {
    if (availableKeysEl) availableKeysEl.textContent = userKeys;
    if (availableMoneyEl) availableMoneyEl.textContent = `$${userBalance.toFixed(2)}`;
    
    // Update max values for inputs
    if (offerKeysInput) {
      offerKeysInput.max = userKeys;
      offerKeysInput.setAttribute('max', userKeys);
    }
    if (offerMoneyInput) {
      offerMoneyInput.max = userBalance;
      offerMoneyInput.setAttribute('max', userBalance);
    }
    
    // Update header displays
    const headerBalance = document.getElementById('userBalance');
    const headerKeys = document.getElementById('userKeys');
    if (headerBalance) headerBalance.textContent = `$${userBalance.toFixed(2)}`;
    if (headerKeys) headerKeys.innerHTML = `<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ${userKeys}`;
  }

  // Max buttons - Fixed to properly set max values
  maxBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.dataset.target;
      
      if (target === 'offerKeys' && offerKeysInput) {
        offerKeysInput.value = userKeys;
        offerKeysInput.dispatchEvent(new Event('input'));
      } else if (target === 'offerMoney' && offerMoneyInput) {
        offerMoneyInput.value = userBalance.toFixed(2);
        offerMoneyInput.dispatchEvent(new Event('input'));
      }
      updateSubmitButton();
    });
  });

  // Input validation with proper max enforcement
  if (offerKeysInput) {
    offerKeysInput.addEventListener('input', () => {
      let val = parseInt(offerKeysInput.value) || 0;
      if (val > userKeys) {
        val = userKeys;
        offerKeysInput.value = val;
      }
      if (val < 0) {
        val = 0;
        offerKeysInput.value = val;
      }
      updateSubmitButton();
    });
    
    offerKeysInput.addEventListener('blur', () => {
      let val = parseInt(offerKeysInput.value) || 0;
      if (val > userKeys) val = userKeys;
      if (val < 0) val = 0;
      offerKeysInput.value = val;
    });
  }

  if (offerMoneyInput) {
    offerMoneyInput.addEventListener('input', () => {
      let val = parseFloat(offerMoneyInput.value) || 0;
      if (val > userBalance) {
        val = userBalance;
        offerMoneyInput.value = val.toFixed(2);
      }
      if (val < 0) {
        val = 0;
        offerMoneyInput.value = val.toFixed(2);
      }
      updateSubmitButton();
    });
    
    offerMoneyInput.addEventListener('blur', () => {
      let val = parseFloat(offerMoneyInput.value) || 0;
      if (val > userBalance) val = userBalance;
      if (val < 0) val = 0;
      offerMoneyInput.value = val.toFixed(2);
    });
  }

  // Ask input validation (no max limit, but must be positive)
  if (askKeysInput) {
    askKeysInput.addEventListener('input', () => {
      let val = parseInt(askKeysInput.value) || 0;
      if (val < 0) {
        val = 0;
        askKeysInput.value = val;
      }
      updateSubmitButton();
    });
  }

  if (askMoneyInput) {
    askMoneyInput.addEventListener('input', () => {
      let val = parseFloat(askMoneyInput.value) || 0;
      if (val < 0) {
        val = 0;
        askMoneyInput.value = val.toFixed(2);
      }
      updateSubmitButton();
    });
  }

  // ========================================
  // CARD GALLERY
  // ========================================
  function openCardGallery(mode) {
    currentGalleryMode = mode;
    
    if (mode === 'offer') {
      galleryTitle.textContent = 'Select Your Cards';
      tempSelectedCards = [...offerSelectedCards];
    } else {
      galleryTitle.textContent = 'Browse All Cards';
      tempSelectedCards = [...askSelectedCards];
    }
    
    renderGallery('all');
    updateSelectedCount();
    
    cardGalleryModal.classList.add('active');
  }

  function closeCardGallery() {
    cardGalleryModal.classList.remove('active');
    tempSelectedCards = [];
  }

  if (selectMyCardsBtn) {
    selectMyCardsBtn.addEventListener('click', () => openCardGallery('offer'));
  }
  
  if (selectAnyCardsBtn) {
    selectAnyCardsBtn.addEventListener('click', () => openCardGallery('ask'));
  }

  if (closeGalleryBtn) closeGalleryBtn.addEventListener('click', closeCardGallery);
  if (cancelGalleryBtn) cancelGalleryBtn.addEventListener('click', closeCardGallery);

  cardGalleryModal?.addEventListener('click', (e) => {
    if (e.target === cardGalleryModal) closeCardGallery();
  });

  galleryFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      galleryFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGallery(btn.dataset.filter);
    });
  });

  function renderGallery(filter) {
    if (!cardsGalleryEl) return;

    let cardsToShow = [...cardsData];
    if (filter !== 'all') {
      cardsToShow = cardsToShow.filter(card => card.rarity === filter);
    }

    // For offer mode, only show cards user owns (from subcollection)
    // userOwnedCards is now array of { docId, cardNumber, ... }
    // Count duplicates for stacking effect
    let cardCounts = {};
    let cardDocIds = {}; // Store all docIds for each cardNumber
    if (currentGalleryMode === 'offer') {
      userOwnedCards.forEach(c => {
        cardCounts[c.cardNumber] = (cardCounts[c.cardNumber] || 0) + 1;
        if (!cardDocIds[c.cardNumber]) {
          cardDocIds[c.cardNumber] = [];
        }
        cardDocIds[c.cardNumber].push(c.docId);
      });
      const ownedCardNumbers = userOwnedCards.map(c => c.cardNumber);
      cardsToShow = cardsToShow.filter(card => ownedCardNumbers.includes(card.cardNumber));
    }

    if (cardsToShow.length === 0) {
      cardsGalleryEl.innerHTML = `
        <div class="gallery-empty">
          <p>${currentGalleryMode === 'offer' ? 'You don\'t own any cards yet' : 'No cards found'}</p>
        </div>
      `;
      return;
    }

    cardsGalleryEl.innerHTML = cardsToShow.map((card, index) => {
      // For offer mode, check by cardNumber; for ask mode, check by cardNumber
      let isSelected = false;
      let selectedCount = 0;
      if (currentGalleryMode === 'offer') {
        // Count how many of this card are selected
        selectedCount = tempSelectedCards.filter(tc => tc.cardNumber === card.cardNumber).length;
        isSelected = selectedCount > 0;
      } else {
        isSelected = tempSelectedCards.includes(card.cardNumber);
      }
      
      const ownedCardNumbers = userOwnedCards.map(c => c.cardNumber);
      const isDisabled = currentGalleryMode === 'offer' && !ownedCardNumbers.includes(card.cardNumber);
      const cardHTML = createCardHTML(card, index, { showBack: false, size: 'small', interactive: true });
      
      // Get the docIds if this is an owned card (for offer mode)
      let docIdsAttr = '';
      let ownedCount = 1;
      if (currentGalleryMode === 'offer') {
        const docIds = cardDocIds[card.cardNumber] || [];
        docIdsAttr = docIds.join(',');
        ownedCount = cardCounts[card.cardNumber] || 1;
      }
      
      // Create stacked effect for multiple cards
      const stackCount = Math.min(ownedCount, 4); // Max 4 visible stacks
      const stackLayers = stackCount > 1 ? 
        Array(stackCount - 1).fill(0).map((_, i) => 
          `<div class="stack-layer" style="--stack-index: ${i + 1};"></div>`
        ).join('') : '';
      
      return `
        <div class="gallery-card-wrapper ${isSelected ? 'selected' : ''} ${ownedCount > 1 ? 'has-stack' : ''}" 
             data-id="${card.id}" data-card-number="${card.cardNumber}" data-doc-ids="${docIdsAttr}" data-owned-count="${ownedCount}" ${isDisabled ? 'data-disabled="true"' : ''}>
          ${stackLayers}
          ${cardHTML}
          ${currentGalleryMode === 'offer' && ownedCount > 1 ? `<div class="card-count-badge">${selectedCount > 0 ? selectedCount + '/' : ''}${ownedCount}</div>` : ''}
        </div>
      `;
    }).join('');

    setup3DCardTracking(cardsGalleryEl);

    cardsGalleryEl.querySelectorAll('.gallery-card-wrapper:not([data-disabled])').forEach(cardEl => {
      cardEl.addEventListener('click', () => {
        const cardNumber = cardEl.dataset.cardNumber;
        const docIds = cardEl.dataset.docIds ? cardEl.dataset.docIds.split(',') : [];
        const ownedCount = parseInt(cardEl.dataset.ownedCount) || 1;
        toggleCardSelection(cardNumber, docIds, ownedCount, cardEl);
      });
    });
  }

  function toggleCardSelection(cardNumber, docIds, ownedCount, cardEl) {
    if (currentGalleryMode === 'offer') {
      // For offer mode, cycle through: 0 -> 1 -> 2 -> ... -> max -> 0
      const currentlySelected = tempSelectedCards.filter(tc => tc.cardNumber === cardNumber);
      const currentCount = currentlySelected.length;
      
      if (currentCount >= ownedCount) {
        // Remove all of this card type
        tempSelectedCards = tempSelectedCards.filter(tc => tc.cardNumber !== cardNumber);
        cardEl.classList.remove('selected');
      } else {
        // Add one more of this card (use the next available docId)
        const nextDocId = docIds[currentCount];
        if (nextDocId) {
          tempSelectedCards.push({ docId: nextDocId, cardNumber });
        }
        cardEl.classList.add('selected');
      }
      
      // Update the badge to show selected count
      const badge = cardEl.querySelector('.card-count-badge');
      const newSelectedCount = tempSelectedCards.filter(tc => tc.cardNumber === cardNumber).length;
      if (badge && ownedCount > 1) {
        badge.textContent = newSelectedCount > 0 ? `${newSelectedCount}/${ownedCount}` : ownedCount;
      }
      
      // Update selected state
      if (newSelectedCount === 0) {
        cardEl.classList.remove('selected');
      } else {
        cardEl.classList.add('selected');
      }
    } else {
      // For ask mode, just store cardNumber
      const index = tempSelectedCards.indexOf(cardNumber);
      
      if (index > -1) {
        tempSelectedCards.splice(index, 1);
        cardEl.classList.remove('selected');
      } else {
        tempSelectedCards.push(cardNumber);
        cardEl.classList.add('selected');
      }
    }
    
    updateSelectedCount();
  }

  function updateSelectedCount() {
    if (selectedCountEl) {
      selectedCountEl.textContent = tempSelectedCards.length;
    }
  }

  if (confirmCardsBtn) {
    confirmCardsBtn.addEventListener('click', () => {
      if (currentGalleryMode === 'offer') {
        offerSelectedCards = [...tempSelectedCards];
        updateOfferCardsDisplay();
      } else {
        askSelectedCards = [...tempSelectedCards];
        updateAskCardsDisplay();
      }
      
      updateSubmitButton();
      closeCardGallery();
    });
  }

  function updateOfferCardsDisplay() {
    if (!offerSelectedCardsEl) return;
    
    if (offerSelectedCards.length === 0) {
      offerSelectedCardsEl.innerHTML = '<p class="no-cards-text">No cards selected</p>';
      return;
    }

    // offerSelectedCards is now array of { docId, cardNumber }
    offerSelectedCardsEl.innerHTML = offerSelectedCards.map(cardObj => {
      const card = cardsData.find(c => c.cardNumber === cardObj.cardNumber);
      if (!card) return '';
      return createCardChipHTML(card, cardObj.docId);
    }).join('');

    offerSelectedCardsEl.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const docId = btn.dataset.docId;
        offerSelectedCards = offerSelectedCards.filter(c => c.docId !== docId);
        updateOfferCardsDisplay();
        updateSubmitButton();
      });
    });
  }

  function updateAskCardsDisplay() {
    if (!askSelectedCardsEl) return;
    
    if (askSelectedCards.length === 0) {
      askSelectedCardsEl.innerHTML = '<p class="no-cards-text">No cards selected</p>';
      return;
    }

    // askSelectedCards is array of cardNumber strings
    askSelectedCardsEl.innerHTML = askSelectedCards.map(cardNumber => {
      const card = cardsData.find(c => c.cardNumber === cardNumber);
      if (!card) return '';
      return createCardChipHTML(card);
    }).join('');

    askSelectedCardsEl.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardNumber = btn.dataset.cardNumber;
        askSelectedCards = askSelectedCards.filter(cn => cn !== cardNumber);
        updateAskCardsDisplay();
        updateSubmitButton();
      });
    });
  }

  function updateSubmitButton() {
    if (!submitTradeBtn) return;
    
    const offerKeys = parseInt(offerKeysInput?.value) || 0;
    const offerMoney = parseFloat(offerMoneyInput?.value) || 0;
    const askKeys = parseInt(askKeysInput?.value) || 0;
    const askMoney = parseFloat(askMoneyInput?.value) || 0;
    
    const hasOffer = offerKeys > 0 || offerMoney > 0 || offerSelectedCards.length > 0;
    const hasAsk = askKeys > 0 || askMoney > 0 || askSelectedCards.length > 0;
    
    // Also validate that user has enough resources
    const validKeys = offerKeys <= userKeys;
    const validMoney = offerMoney <= userBalance;
    // Validate offered cards - check docIds are in userOwnedCards
    const ownedDocIds = userOwnedCards.map(c => c.docId);
    const validCards = offerSelectedCards.every(cardObj => ownedDocIds.includes(cardObj.docId));
    
    submitTradeBtn.disabled = !(hasOffer && hasAsk && validKeys && validMoney && validCards);
  }

  // ========================================
  // SUBMIT TRADE TO FIRESTORE
  // ========================================
  if (submitTradeBtn) {
    submitTradeBtn.addEventListener('click', async () => {
      if (!currentUser) {
        alert('Please sign in to post a trade.');
        return;
      }

      const offerKeys = parseInt(offerKeysInput?.value) || 0;
      const offerMoney = parseFloat(offerMoneyInput?.value) || 0;
      const askKeys = parseInt(askKeysInput?.value) || 0;
      const askMoney = parseFloat(askMoneyInput?.value) || 0;

      // Validate again before submitting
      if (offerKeys > userKeys) {
        alert('You don\'t have enough keys.');
        return;
      }
      if (offerMoney > userBalance) {
        alert('You don\'t have enough money.');
        return;
      }
      
      // Validate offered cards with new structure
      const ownedDocIds = userOwnedCards.map(c => c.docId);
      if (!offerSelectedCards.every(cardObj => ownedDocIds.includes(cardObj.docId))) {
        alert('You don\'t own all the selected cards.');
        return;
      }

      submitTradeBtn.disabled = true;
      submitTradeBtn.textContent = 'Posting...';

      try {
        // Create trade document in Firestore
        // Store cards with their docId and cardNumber for the trade
        const tradeData = {
          offer: {
            keys: offerKeys,
            money: offerMoney,
            // Store array of { docId, cardNumber } for offered cards
            cards: offerSelectedCards.map(c => ({ docId: c.docId, cardNumber: c.cardNumber }))
          },
          ask: {
            keys: askKeys,
            money: askMoney,
            // Store array of cardNumber strings for asked cards
            cards: [...askSelectedCards]
          },
          sellerId: currentUser.uid,
          sellerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
          sellerEmail: currentUser.email || '',
          status: 'active', // active, completed, cancelled
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Add trade to trades collection
        const tradeDocRef = await addDoc(tradesRef, tradeData);
        const tradeId = tradeDocRef.id;

        // Add trade ID to user's document
        await updateDoc(doc(usersRef, currentUser.uid), {
          tradeIds: arrayUnion(tradeId)
        });

        // Update local state
        userTradeIds.push(tradeId);
        
        // Immediately add the new trade to local state and re-render
        const newTrade = {
          id: tradeId,
          ...tradeData,
          createdAt: { toDate: () => new Date() } // Mock timestamp for immediate display
        };
        marketplaceTrades.unshift(newTrade); // Add to beginning (newest first)
        renderMarketplaceTrades();
        renderLiveTradesSidebar([tradeId]); // Highlight as new

        closePostTradeModal();
        
      } catch (error) {
        console.error('Error posting trade:', error);
        alert('Failed to post trade. Please try again.');
      } finally {
        submitTradeBtn.disabled = false;
        submitTradeBtn.textContent = 'Post Trade';
      }
    });
  }

  // ========================================
  // LOAD & RENDER TRADES FROM FIRESTORE (POLLING)
  // ========================================
  async function loadActiveTrades() {
    try {
      // Query active trades, ordered by creation date
      const tradesQuery = query(
        tradesRef, 
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(tradesQuery);
      const previousTradeIds = marketplaceTrades.map(t => t.id);
      marketplaceTrades = [];
      const newTradeIds = [];
      
      snapshot.forEach(doc => {
        const trade = { id: doc.id, ...doc.data() };
        marketplaceTrades.push(trade);
        // Check if this is a new trade
        if (!previousTradeIds.includes(doc.id)) {
          newTradeIds.push(doc.id);
        }
      });
      
      renderMarketplaceTrades();
      if (newTradeIds.length > 0) {
        renderLiveTradesSidebar(newTradeIds);
      }
    } catch (error) {
      console.error('Error loading trades:', error);
      // Fallback: try to load without ordering (in case index doesn't exist)
      loadTradesFallback();
    }
  }
  
  async function loadAllTradesHistory() {
    try {
      // Get all trades (for history tab) - both active, completed, cancelled
      const allTradesQuery = query(tradesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(allTradesQuery);
      
      allTradesHistory = [];
      snapshot.forEach(doc => {
        allTradesHistory.push({ id: doc.id, ...doc.data() });
      });
      
      // Re-render history if that tab is active
      if (currentLiveTab === 'history') {
        renderHistoryTrades();
      }
    } catch (error) {
      console.error('Error loading all trades:', error);
    }
  }
  
  function startTradesPolling() {
    // Clear any existing intervals
    if (tradesPollingInterval) clearInterval(tradesPollingInterval);
    if (historyPollingInterval) clearInterval(historyPollingInterval);
    
    // Initial load
    loadActiveTrades();
    loadAllTradesHistory();
    
    // Start polling every 2 seconds
    tradesPollingInterval = setInterval(loadActiveTrades, POLLING_INTERVAL_MS);
    historyPollingInterval = setInterval(loadAllTradesHistory, POLLING_INTERVAL_MS);
  }
  
  function subscribeToTrades() {
    // Now just starts polling instead of subscribing
    startTradesPolling();
  }

  async function loadTradesFallback() {
    try {
      const snapshot = await getDocs(query(tradesRef, where('status', '==', 'active')));
      marketplaceTrades = [];
      snapshot.forEach(doc => {
        marketplaceTrades.push({
          id: doc.id,
          ...doc.data()
        });
      });
      // Sort manually
      marketplaceTrades.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB - dateA;
      });
      renderMarketplaceTrades();
      renderLiveTradesSidebar();
    } catch (error) {
      console.error('Error loading trades fallback:', error);
    }
  }

  function renderMarketplaceTrades(sortBy = 'newest') {
    const grid = document.querySelector('.marketplace-grid');
    if (!grid) return;

    // Filter trades based on current filter state
    let filteredTrades = marketplaceTrades.filter(filterTrade);

    // Sort trades
    if (sortBy === 'oldest') {
      filteredTrades.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateA - dateB;
      });
    } else if (sortBy === 'newest') {
      filteredTrades.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
      });
    }

    if (filteredTrades.length === 0) {
      grid.innerHTML = `
        <div class="empty-marketplace">
          <div class="empty-icon">🏪</div>
          <h3>No trades yet</h3>
          <p>Be the first to post a trade!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filteredTrades.map(trade => createTradeCardHTML(trade)).join('');
    
    // Add click handlers for trade actions
    grid.querySelectorAll('.trade-accept-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tradeId = btn.dataset.tradeId;
        handleAcceptTrade(tradeId);
      });
    });

    grid.querySelectorAll('.trade-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tradeId = btn.dataset.tradeId;
        handleDeleteTrade(tradeId);
      });
    });
    
    // Add click handler for viewing trade details
    grid.querySelectorAll('.trade-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking a button
        if (e.target.closest('.trade-accept-btn') || e.target.closest('.trade-delete-btn')) return;
        const tradeId = item.dataset.tradeId;
        openTradeDetailModal(tradeId);
      });
    });
  }

  // ========================================
  // LIVE TRADES SIDEBAR RENDERING
  // ========================================
  function renderLiveTradesSidebar(newTradeIds = []) {
    const liveTradesList = document.getElementById('liveTradesList');
    if (!liveTradesList) return;
    
    if (marketplaceTrades.length === 0) {
      liveTradesList.innerHTML = `
        <div class="live-trades-empty">
          <span class="empty-icon">📡</span>
          <p>Waiting for live trades...</p>
        </div>
      `;
      return;
    }
    
    liveTradesList.innerHTML = marketplaceTrades.map(trade => {
      const isNew = newTradeIds.includes(trade.id);
      return createLiveTradeItemHTML(trade, isNew, 'active');
    }).join('');
    
    // Add click handlers
    liveTradesList.querySelectorAll('.live-trade-item').forEach(item => {
      item.addEventListener('click', () => {
        const tradeId = item.dataset.tradeId;
        openTradeDetailModal(tradeId);
      });
    });
  }
  
  function renderHistoryTrades() {
    const historyTradesList = document.getElementById('historyTradesList');
    if (!historyTradesList) return;
    
    // Filter to show only user's trades (either as seller or buyer)
    const myTrades = allTradesHistory.filter(trade => {
      if (!currentUser) return false;
      return trade.sellerId === currentUser.uid || trade.buyerId === currentUser.uid;
    });
    
    if (myTrades.length === 0) {
      historyTradesList.innerHTML = `
        <div class="live-trades-empty">
          <span class="empty-icon">📜</span>
          <p>${currentUser ? 'No trade history yet' : 'Sign in to see history'}</p>
        </div>
      `;
      return;
    }
    
    historyTradesList.innerHTML = myTrades.map(trade => {
      return createLiveTradeItemHTML(trade, false, trade.status);
    }).join('');
    
    // Add click handlers
    historyTradesList.querySelectorAll('.live-trade-item').forEach(item => {
      item.addEventListener('click', () => {
        const tradeId = item.dataset.tradeId;
        // Find trade in history
        const trade = allTradesHistory.find(t => t.id === tradeId);
        if (trade) {
          openTradeDetailModal(tradeId);
        }
      });
    });
  }
  
  function createLiveTradeItemHTML(trade, isNew, status) {
    const timeAgo = getTimeAgo(trade.createdAt);
    
    // Build offer summary
    let offerParts = [];
    if (trade.offer.keys > 0) offerParts.push(`<span class="live-resource"><img src="/bp/EE/assets/ouths/key.png" alt="">${trade.offer.keys}</span>`);
    if (trade.offer.money > 0) offerParts.push(`<span class="live-resource">💵$${trade.offer.money.toFixed(0)}</span>`);
    if (trade.offer.cards?.length > 0) offerParts.push(`<span class="live-resource">🎴${trade.offer.cards.length}</span>`);
    
    // Build ask summary
    let askParts = [];
    if (trade.ask.keys > 0) askParts.push(`<span class="live-resource"><img src="/bp/EE/assets/ouths/key.png" alt="">${trade.ask.keys}</span>`);
    if (trade.ask.money > 0) askParts.push(`<span class="live-resource">💵$${trade.ask.money.toFixed(0)}</span>`);
    if (trade.ask.cards?.length > 0) askParts.push(`<span class="live-resource">🎴${trade.ask.cards.length}</span>`);
    
    const statusLabel = status === 'active' ? 'Active' : status === 'completed' ? 'Completed' : 'Cancelled';
    
    return `
      <div class="live-trade-item ${isNew ? 'new' : ''}" data-trade-id="${trade.id}">
        <div class="live-trade-header">
          <div class="live-trade-avatar">${trade.sellerName ? trade.sellerName.charAt(0).toUpperCase() : '?'}</div>
          <div class="live-trade-meta">
            <div class="live-trade-name">${trade.sellerName || 'Unknown'}</div>
            <div class="live-trade-time">${timeAgo}</div>
          </div>
          <span class="live-trade-status ${status}">${statusLabel}</span>
        </div>
        <div class="live-trade-summary">
          <div class="live-trade-offer">${offerParts.join('')}</div>
          <span class="live-trade-arrow">→</span>
          <div class="live-trade-ask">${askParts.join('')}</div>
        </div>
      </div>
    `;
  }

  // ========================================
  // TRADE CARD HTML GENERATION (No duplicate code)
  // ========================================
  
  // Helper: Render a resource box (keys, money, or cards)
  function renderResourceSection(data, type) {
    const { keys = 0, money = 0, cards = [] } = data;
    const hasContent = keys > 0 || money > 0 || cards.length > 0;
    
    if (!hasContent) {
      return `<div class="resource-box empty"><span class="empty-text">Nothing</span></div>`;
    }
    
    let html = `<div class="resource-box ${type}">`;
    
    // Keys
    if (keys > 0) {
      html += `
        <div class="resource-row keys-row">
          <img src="/bp/EE/assets/ouths/key.png" alt="Keys" class="resource-key-icon">
          <span class="resource-value">×${keys}</span>
        </div>
      `;
    }
    
    // Money
    if (money > 0) {
      html += `
        <div class="resource-row money-row">
          <span class="money-emoji">💵</span>
          <span class="resource-value">$${money.toFixed(2)}</span>
        </div>
      `;
    }
    
    // Cards - render mini versions
    if (cards.length > 0) {
      html += `<div class="cards-grid-preview">`;
      cards.forEach(cardData => {
        // cardData can be { docId, cardNumber } or just cardNumber string
        const cardNumber = typeof cardData === 'object' ? cardData.cardNumber : cardData;
        const card = cardsData.find(c => c.cardNumber === cardNumber) || 
                     cardsData.find(c => c.id === cardData);
        if (card) {
          html += `
            <div class="mini-trade-card ${card.rarity || 'common'}" data-card-number="${card.cardNumber}">
              <div class="mini-card-emoji">${card.emoji || '🎴'}</div>
              <div class="mini-card-info">
                <span class="mini-card-name">${card.name}</span>
                <span class="mini-card-rarity">${card.rarity || 'common'}</span>
              </div>
            </div>
          `;
        }
      });
      html += `</div>`;
    }
    
    html += `</div>`;
    return html;
  }

  function createTradeCardHTML(trade) {
    const isOwnTrade = currentUser && trade.sellerId === currentUser.uid;
    const timeAgo = getTimeAgo(trade.createdAt);
    const canAcceptTrade = currentUser && !isOwnTrade && canUserAcceptTrade(trade);

    // Determine trade type for data attribute
    const hasOfferKeys = trade.offer.keys > 0;
    const hasOfferMoney = trade.offer.money > 0;
    const hasOfferCards = trade.offer.cards?.length > 0;
    const hasAskCards = trade.ask.cards?.length > 0;
    
    let tradeType = 'mixed';
    if (hasOfferKeys && !hasOfferMoney && !hasOfferCards && hasAskCards) tradeType = 'keys-for-cards';
    else if (hasOfferMoney && !hasOfferKeys && !hasOfferCards && hasAskCards) tradeType = 'money-for-cards';
    else if (hasOfferCards && !hasOfferKeys && !hasOfferMoney && trade.ask.keys > 0) tradeType = 'cards-for-keys';
    else if (hasOfferCards && !hasOfferKeys && !hasOfferMoney && trade.ask.money > 0) tradeType = 'cards-for-money';
    else if (hasOfferCards && hasAskCards) tradeType = 'cards-for-cards';

    // Footer content based on trade ownership and eligibility
    let footerContent = '';
    if (isOwnTrade) {
      footerContent = `<span class="own-trade-label">Your listing</span>`;
    } else if (!currentUser) {
      footerContent = `<span class="login-hint">Sign in to trade</span>`;
    } else if (canAcceptTrade) {
      footerContent = `
        <button class="trade-accept-btn" data-trade-id="${trade.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Accept Trade
        </button>
      `;
    } else {
      footerContent = `<span class="cannot-accept-hint">Insufficient resources</span>`;
    }

    return `
      <div class="trade-item" data-trade-id="${trade.id}" data-trade-type="${tradeType}">
        <div class="trade-item-header">
          <div class="trader-info">
            <div class="trader-avatar">${trade.sellerName ? trade.sellerName.charAt(0).toUpperCase() : '?'}</div>
            <div class="trader-details">
              <span class="trader-name">${trade.sellerName || 'Unknown'}</span>
              <span class="trade-time">${timeAgo}</span>
            </div>
          </div>
          ${isOwnTrade ? `
            <button class="trade-delete-btn" data-trade-id="${trade.id}" title="Cancel trade">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          ` : ''}
        </div>
        
        <div class="trade-item-body">
          <!-- Offering Section (Top) -->
          <div class="trade-section offer-section">
            <div class="section-label offer-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              Offering
            </div>
            ${renderResourceSection(trade.offer, 'offer')}
          </div>
          
          <!-- Divider with arrow -->
          <div class="trade-divider-line">
            <div class="divider-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </div>
          </div>
          
          <!-- Wants Section (Bottom) -->
          <div class="trade-section ask-section">
            <div class="section-label ask-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
              Wants
            </div>
            ${renderResourceSection(trade.ask, 'ask')}
          </div>
        </div>
        
        <div class="trade-item-footer">
          ${footerContent}
        </div>
        
        <div class="trade-click-hint">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          Click for details
        </div>
      </div>
    `;
  }

  // ========================================
  // TRADE DETAIL MODAL
  // ========================================
  function openTradeDetailModal(tradeId) {
    const trade = marketplaceTrades.find(t => t.id === tradeId);
    if (!trade) return;
    
    const isOwnTrade = currentUser && trade.sellerId === currentUser.uid;
    const canAccept = currentUser && !isOwnTrade && canUserAcceptTrade(trade);
    const timeAgo = getTimeAgo(trade.createdAt);
    
    // Create modal if not exists
    let modal = document.getElementById('tradeDetailModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'tradeDetailModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
      <div class="modal trade-detail-modal">
        <div class="modal-header">
          <h2>Trade Details</h2>
          <button class="modal-close" id="closeTradeDetailModal">&times;</button>
        </div>
        
        <div class="trade-detail-content">
          <div class="trade-detail-trader">
            <div class="trader-avatar large">${trade.sellerName ? trade.sellerName.charAt(0).toUpperCase() : '?'}</div>
            <div class="trader-info-detail">
              <span class="trader-name">${trade.sellerName || 'Unknown'}</span>
              <span class="trade-time">${timeAgo}</span>
            </div>
          </div>
          
          <div class="trade-detail-sections">
            <!-- Offering Section -->
            <div class="detail-section offer">
              <h3 class="detail-section-title offer">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
                Offering
              </h3>
              ${renderDetailSection(trade.offer)}
            </div>
            
            <div class="detail-divider">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
              FOR
            </div>
            
            <!-- Wants Section -->
            <div class="detail-section ask">
              <h3 class="detail-section-title ask">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
                Wants
              </h3>
              ${renderDetailSection(trade.ask)}
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          ${isOwnTrade ? `
            <button class="btn btn-danger" id="cancelTradeFromDetail" data-trade-id="${trade.id}">
              Cancel Trade
            </button>
          ` : canAccept ? `
            <button class="btn btn-primary" id="acceptTradeFromDetail" data-trade-id="${trade.id}">
              Accept Trade
            </button>
          ` : !currentUser ? `
            <span class="login-hint">Sign in to trade</span>
          ` : `
            <span class="cannot-accept-hint">Insufficient resources</span>
          `}
          <button class="btn btn-secondary" id="closeTradeDetailBtn">Close</button>
        </div>
      </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Event listeners
    document.getElementById('closeTradeDetailModal')?.addEventListener('click', closeTradeDetailModal);
    document.getElementById('closeTradeDetailBtn')?.addEventListener('click', closeTradeDetailModal);
    document.getElementById('acceptTradeFromDetail')?.addEventListener('click', () => {
      closeTradeDetailModal();
      handleAcceptTrade(tradeId);
    });
    document.getElementById('cancelTradeFromDetail')?.addEventListener('click', () => {
      closeTradeDetailModal();
      handleDeleteTrade(tradeId);
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeTradeDetailModal();
    });
  }
  
  function closeTradeDetailModal() {
    const modal = document.getElementById('tradeDetailModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
  
  // Render detail section with full cards
  function renderDetailSection(data) {
    const { keys = 0, money = 0, cards = [] } = data;
    let html = '<div class="detail-resources">';
    
    if (keys > 0) {
      html += `
        <div class="detail-resource keys">
          <img src="/bp/EE/assets/ouths/key.png" alt="Keys" class="detail-key-icon">
          <span class="detail-value">${keys} Keys</span>
        </div>
      `;
    }
    
    if (money > 0) {
      html += `
        <div class="detail-resource money">
          <span class="detail-money-emoji">💵</span>
          <span class="detail-value">$${money.toFixed(2)}</span>
        </div>
      `;
    }
    
    if (cards.length > 0) {
      html += '<div class="detail-cards-grid">';
      cards.forEach(cardData => {
        const cardNumber = typeof cardData === 'object' ? cardData.cardNumber : cardData;
        const card = cardsData.find(c => c.cardNumber === cardNumber) || 
                     cardsData.find(c => c.id === cardData);
        if (card) {
          html += createCardHTML(card, 0, { showBack: false, size: 'small', interactive: false });
        }
      });
      html += '</div>';
    }
    
    if (keys === 0 && money === 0 && cards.length === 0) {
      html += '<span class="empty-text">Nothing</span>';
    }
    
    html += '</div>';
    return html;
  }

  // Check if user can accept a trade (has required resources)
  function canUserAcceptTrade(trade) {
    if (!currentUser) return false;
    
    // Check if user has enough of what the seller is asking for
    const askKeys = trade.ask.keys || 0;
    const askMoney = trade.ask.money || 0;
    const askCards = trade.ask.cards || []; // Array of cardNumber strings
    
    // Check keys
    if (askKeys > userKeys) return false;
    
    // Check money
    if (askMoney > userBalance) return false;
    
    // Check cards - buyer needs to own cards matching the asked cardNumbers
    const ownedCardNumbers = userOwnedCards.map(c => c.cardNumber);
    for (const cardNumber of askCards) {
      if (!ownedCardNumbers.includes(cardNumber)) return false;
    }
    
    return true;
  }

  // Find a user's card document by cardNumber
  function findUserCardByNumber(cardNumber) {
    return userOwnedCards.find(c => c.cardNumber === cardNumber);
  }

  function getTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  // ========================================
  // ACCEPT TRADE - FULL TRANSACTION WITH CARD SUBCOLLECTIONS
  // ========================================
  async function handleAcceptTrade(tradeId) {
    if (!currentUser) {
      alert('Please sign in to accept trades.');
      return;
    }

    const trade = marketplaceTrades.find(t => t.id === tradeId);
    if (!trade) {
      alert('Trade not found.');
      return;
    }

    // Can't accept own trade
    if (trade.sellerId === currentUser.uid) {
      alert('You cannot accept your own trade.');
      return;
    }

    // Verify user can accept
    if (!canUserAcceptTrade(trade)) {
      alert('You don\'t have enough resources to accept this trade.');
      return;
    }

    const confirmMsg = `Accept this trade?\n\nYou give:\n` +
      (trade.ask.keys > 0 ? `- ${trade.ask.keys} Keys\n` : '') +
      (trade.ask.money > 0 ? `- $${trade.ask.money.toFixed(2)}\n` : '') +
      (trade.ask.cards?.length > 0 ? `- ${trade.ask.cards.length} Card(s)\n` : '') +
      `\nYou receive:\n` +
      (trade.offer.keys > 0 ? `+ ${trade.offer.keys} Keys\n` : '') +
      (trade.offer.money > 0 ? `+ $${trade.offer.money.toFixed(2)}\n` : '') +
      (trade.offer.cards?.length > 0 ? `+ ${trade.offer.cards.length} Card(s)\n` : '');

    if (!confirm(confirmMsg)) return;

    try {
      const buyerId = currentUser.uid;
      const sellerId = trade.sellerId;
      
      // Use Firestore transaction for atomic updates of keys/money
      await runTransaction(db, async (transaction) => {
        // Get fresh data for both users
        const buyerRef = doc(usersRef, buyerId);
        const sellerRef = doc(usersRef, sellerId);
        const tradeRef = doc(tradesRef, tradeId);

        const buyerDoc = await transaction.get(buyerRef);
        const sellerDoc = await transaction.get(sellerRef);
        const tradeDoc = await transaction.get(tradeRef);

        if (!tradeDoc.exists()) {
          throw new Error('Trade no longer exists.');
        }

        if (tradeDoc.data().status !== 'active') {
          throw new Error('Trade is no longer active.');
        }

        if (!buyerDoc.exists() || !sellerDoc.exists()) {
          throw new Error('User data not found.');
        }

        const buyerData = buyerDoc.data();
        const sellerData = sellerDoc.data();

        // Validate buyer has required keys and money
        const askKeys = trade.ask.keys || 0;
        const askMoney = trade.ask.money || 0;

        if ((buyerData.keys || 0) < askKeys) {
          throw new Error('Insufficient keys.');
        }
        if ((buyerData.balance || 0) < askMoney) {
          throw new Error('Insufficient balance.');
        }

        // For seller: take what they have up to what was offered (don't fail, just take available)
        const offerKeys = trade.offer.keys || 0;
        const offerMoney = trade.offer.money || 0;
        
        // Seller gives what they have (up to offered amount)
        const actualSellerKeys = Math.min(offerKeys, sellerData.keys || 0);
        const actualSellerMoney = Math.min(offerMoney, sellerData.balance || 0);

        // Calculate new values for buyer (receives what seller actually has)
        const newBuyerKeys = (buyerData.keys || 0) - askKeys + actualSellerKeys;
        const newBuyerBalance = (buyerData.balance || 0) - askMoney + actualSellerMoney;

        // Calculate new values for seller (goes to 0 if they don't have enough)
        const newSellerKeys = Math.max(0, (sellerData.keys || 0) - actualSellerKeys + askKeys);
        const newSellerBalance = Math.max(0, (sellerData.balance || 0) - actualSellerMoney + askMoney);

        // Update buyer (keys and money only, cards handled separately)
        transaction.update(buyerRef, {
          keys: newBuyerKeys,
          balance: newBuyerBalance,
          completedTradeIds: arrayUnion(tradeId)
        });

        // Update seller (keys and money only, cards handled separately)
        transaction.update(sellerRef, {
          keys: newSellerKeys,
          balance: newSellerBalance,
          completedTradeIds: arrayUnion(tradeId)
        });

        // Update trade status with actual amounts transferred
        transaction.update(tradeRef, {
          status: 'completed',
          buyerId: buyerId,
          buyerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          actualOfferKeys: actualSellerKeys,
          actualOfferMoney: actualSellerMoney,
          sellerNotified: false,
          buyerNotified: false
        });
      });

      // Handle card transfers outside the transaction
      // (Firestore transactions can't create new documents in different collections easily)
      
      // 1. Mark seller's offered cards as hasCard: false and create new docs for buyer
      const offerCards = trade.offer.cards || []; // Array of { docId, cardNumber }
      for (const cardObj of offerCards) {
        // Mark seller's card as traded (hasCard: false)
        const sellerCardRef = doc(db, 'mulon_users', sellerId, 'cards', cardObj.docId);
        await updateDoc(sellerCardRef, {
          hasCard: false,
          tradedAt: serverTimestamp(),
          tradedTo: buyerId,
          tradeId: tradeId
        });
        
        // Create new card document for buyer
        const buyerCardsRef = collection(db, 'mulon_users', buyerId, 'cards');
        await addDoc(buyerCardsRef, {
          cardNumber: cardObj.cardNumber,
          hasCard: true,
          obtainedAt: serverTimestamp(),
          obtainedFrom: 'trade',
          tradedFrom: sellerId,
          tradeId: tradeId
        });
      }
      
      // 2. Handle cards buyer is giving to seller (ask.cards)
      const askCards = trade.ask.cards || []; // Array of cardNumber strings
      for (const cardNumber of askCards) {
        // Find buyer's card document with this cardNumber
        const buyerCard = findUserCardByNumber(cardNumber);
        if (buyerCard) {
          // Mark buyer's card as traded (hasCard: false)
          const buyerCardRef = doc(db, 'mulon_users', buyerId, 'cards', buyerCard.docId);
          await updateDoc(buyerCardRef, {
            hasCard: false,
            tradedAt: serverTimestamp(),
            tradedTo: sellerId,
            tradeId: tradeId
          });
          
          // Create new card document for seller
          const sellerCardsRef = collection(db, 'mulon_users', sellerId, 'cards');
          await addDoc(sellerCardsRef, {
            cardNumber: cardNumber,
            hasCard: true,
            obtainedAt: serverTimestamp(),
            obtainedFrom: 'trade',
            tradedFrom: buyerId,
            tradeId: tradeId
          });
        }
      }

      // Reload user data to reflect changes
      await loadUserData();
      
      alert('Trade completed successfully!');

    } catch (error) {
      console.error('Error accepting trade:', error);
      alert(`Failed to complete trade: ${error.message}`);
    }
  }

  // ========================================
  // DELETE/CANCEL TRADE
  // ========================================
  async function handleDeleteTrade(tradeId) {
    if (!currentUser) return;

    const trade = marketplaceTrades.find(t => t.id === tradeId);
    if (!trade) return;

    // Only owner can delete
    if (trade.sellerId !== currentUser.uid) {
      alert('You can only cancel your own trades.');
      return;
    }

    if (!confirm('Are you sure you want to cancel this trade listing?')) return;

    try {
      // Update trade status to cancelled
      await updateDoc(doc(tradesRef, tradeId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Remove trade ID from user's document
      await updateDoc(doc(usersRef, currentUser.uid), {
        tradeIds: arrayRemove(tradeId)
      });

      // Update local state
      userTradeIds = userTradeIds.filter(id => id !== tradeId);
      
      // Immediately remove from local state and re-render
      marketplaceTrades = marketplaceTrades.filter(t => t.id !== tradeId);
      renderMarketplaceTrades();
      renderLiveTradesSidebar();

    } catch (error) {
      console.error('Error cancelling trade:', error);
      alert('Failed to cancel trade. Please try again.');
    }
  }

  // ========================================
  // VIEW COLLECTION MODAL
  // ========================================
  const viewCollectionModal = document.getElementById('viewCollectionModal');
  const closeCollectionModal = document.getElementById('closeCollectionModal');
  const closeCollectionBtn = document.getElementById('closeCollectionBtn');
  const seeMyCardsBtn = document.querySelector('.see-mycards');
  const collectionTabs = document.querySelectorAll('.collection-tab');
  const collectionFilterBtns = document.querySelectorAll('.collection-filter-btn');
  const collectionGrid = document.getElementById('collectionGrid');
  const collectionEmpty = document.getElementById('collectionEmpty');
  const myCardsCountEl = document.getElementById('myCardsCount');
  const allCardsCountEl = document.getElementById('allCardsCount');
  
  let currentCollectionTab = 'my-cards';
  let currentCollectionFilter = 'all';
  
  // Open collection modal
  if (seeMyCardsBtn) {
    seeMyCardsBtn.addEventListener('click', () => {
      openCollectionModal();
    });
  }
  
  // Close collection modal
  if (closeCollectionModal) {
    closeCollectionModal.addEventListener('click', closeCollectionModalFn);
  }
  if (closeCollectionBtn) {
    closeCollectionBtn.addEventListener('click', closeCollectionModalFn);
  }
  
  function openCollectionModal() {
    if (viewCollectionModal) {
      viewCollectionModal.classList.add('active');
      // Update counts
      if (myCardsCountEl) myCardsCountEl.textContent = userOwnedCards.length;
      if (allCardsCountEl) allCardsCountEl.textContent = cardsData.length;
      renderCollectionCards();
    }
  }
  
  function closeCollectionModalFn() {
    if (viewCollectionModal) {
      viewCollectionModal.classList.remove('active');
    }
  }
  
  // Collection tabs
  collectionTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      currentCollectionTab = tab.dataset.tab;
      collectionTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCollectionCards();
    });
  });
  
  // Collection filters
  collectionFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentCollectionFilter = btn.dataset.filter;
      collectionFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCollectionCards();
    });
  });
  
  function renderCollectionCards() {
    if (!collectionGrid) return;
    
    let cardsToRender = [];
    
    if (currentCollectionTab === 'my-cards') {
      // Get user's owned cards with full card data
      cardsToRender = userOwnedCards.map(ownedCard => {
        const cardData = getCardByNumber(ownedCard.cardNumber);
        return cardData ? { ...cardData, docId: ownedCard.docId } : null;
      }).filter(c => c !== null);
      
      // Show empty state if no cards
      if (cardsToRender.length === 0) {
        collectionGrid.style.display = 'none';
        if (collectionEmpty) collectionEmpty.style.display = 'flex';
        return;
      }
    } else {
      // Show all cards in the game
      cardsToRender = [...cardsData];
    }
    
    // Apply rarity filter
    if (currentCollectionFilter !== 'all') {
      cardsToRender = cardsToRender.filter(card => card.rarity === currentCollectionFilter);
    }
    
    // Show grid, hide empty state
    collectionGrid.style.display = 'grid';
    if (collectionEmpty) collectionEmpty.style.display = 'none';
    
    // Render cards using the same createCardHTML function
    collectionGrid.innerHTML = cardsToRender.map((card, index) => {
      // For "All Cards" tab, check if user owns this card
      let owned = false;
      if (currentCollectionTab === 'all-cards') {
        owned = userOwnedCards.some(oc => oc.cardNumber === card.cardNumber);
      } else {
        owned = true; // My cards tab - all are owned
      }
      
      const ownedClass = owned ? 'card-owned' : 'card-not-owned';
      const ownedBadge = currentCollectionTab === 'all-cards' 
        ? `<div class="ownership-badge ${owned ? 'owned' : 'not-owned'}">${owned ? '✓ Owned' : '✗ Not Owned'}</div>`
        : '';
      
      return `
        <div class="collection-card-wrapper ${ownedClass}">
          ${ownedBadge}
          ${createCardHTML(card, index, { showBack: false, interactive: true })}
        </div>
      `;
    }).join('');
    
    // Setup 3D tracking for all cards
    setup3DCardTracking(collectionGrid);
  }

  // ========================================
  // AUTH STATE & INITIALIZATION
  // ========================================
  onAuthStateChanged(auth, async (user) => {
    // Check ban status on every auth state change
    if (typeof window.checkBanStatus === 'function') {
      const isBanned = await window.checkBanStatus();
      if (isBanned) return; // Stop if banned
    }
    
    currentUser = user;
    await loadUserData();
    
    // Subscribe to trades (will auto-update when trades change)
    subscribeToTrades();
  });

  // Check ban status on page load
  if (typeof window.checkBanStatus === 'function') {
    window.checkBanStatus();
  }

  // Initial subscription for non-logged in users
  subscribeToTrades();
});
