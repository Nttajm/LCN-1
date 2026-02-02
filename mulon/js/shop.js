// Shop.js - Shop page functionality

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

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
const overUnderUsersRef = collection(db, 'users'); // OverUnder users collection for leaderStyle
const purchasesRef = collection(db, 'mulon_purchases');
const bannedDevicesRef = collection(db, 'mulon_banned_devices');
const bannedEmailsRef = collection(db, 'mulon_banned_emails');

// Map of shop item IDs to leaderboard CSS class names
const leaderStyleClassMap = {
  'backwards-name': 'backwards-name',
  'gold-name': 'gold-name',
  'rainbow-name': 'rainbow-name',
  'glitch-name': 'glitch-name',
  'fire-prefix': 'fire-prefix',
  'crown-prefix': 'crown-prefix',
  'neon-glow': 'neon-glow',
  'diamond-prefix': 'diamond-prefix',
  'shadow-text': 'shadow-text',
  'im-rich-tag': 'im-rich-tag',
  'upside-down': 'upside-down',
  'banner-flames': 'banner-flames',
  'frame-gold': 'frame-gold'
};

// ========================================
// BAN CHECK SYSTEM
// ========================================
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

async function checkBanStatus() {
  try {
    const user = auth.currentUser;
    const deviceFingerprint = generateDeviceFingerprint();
    
    const deviceDoc = await getDoc(doc(bannedDevicesRef, deviceFingerprint));
    if (deviceDoc.exists()) {
      window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
      return true;
    }
    
    if (user) {
      if (user.email) {
        const emailKey = user.email.toLowerCase().replace(/[.#$[\]]/g, '_');
        const emailDoc = await getDoc(doc(bannedEmailsRef, emailKey));
        if (emailDoc.exists()) {
          window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
          return true;
        }
      }
      
      const userDoc = await getDoc(doc(usersRef, user.uid));
      if (userDoc.exists() && userDoc.data().banned === true) {
        window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking ban status:', error);
    return false;
  }
}

window.checkBanStatus = checkBanStatus;

// User state
let currentUser = null;
let userBalance = 0;
let userKeys = 0;
let userCustomizations = {}; // Items the user has purchased
let userActiveStyles = []; // Styles currently equipped/active
let userBannerStatus = null; // 'pending', true (approved), or null

// Current purchase info
let currentPurchase = null;

// ========================================
// CUSTOMIZATION ITEMS DATA
// ========================================
const leaderboardItems = [
  {
    id: 'backwards-name',
    name: 'Backwards Name',
    description: 'Your name appears reversed on the leaderboard. Confuse your enemies!',
    previewClass: 'backwards',
    previewText: 'emaNeruoY',
    currency: 'keys',
    price: 50
  },
  {
    id: 'gold-name',
    name: 'Gold Name',
    description: 'Your name shines in luxurious gold on the leaderboard.',
    previewClass: 'gold-text',
    previewText: 'YourName',
    currency: 'money',
    price: 5000
  },
  {
    id: 'rainbow-name',
    name: 'Rainbow Name',
    description: 'The ultimate flex! Your name cycles through all colors.',
    previewClass: 'rainbow-text',
    previewText: 'YourName',
    currency: 'money',
    price: 15000,
    badge: '🔥 POPULAR',
    featured: true
  },
  {
    id: 'glitch-name',
    name: 'Glitch Effect',
    description: 'Your name glitches like a broken screen. Very mysterious.',
    previewClass: 'glitch-text',
    previewText: 'YourName',
    currency: 'money',
    price: 8000
  },
  {
    id: 'fire-prefix',
    name: 'Fire Prefix',
    description: 'Add a fire emoji before your name. You\'re on fire!',
    previewClass: '',
    previewText: '🔥 YourName',
    currency: 'money',
    price: 2500
  },
  {
    id: 'crown-prefix',
    name: 'Crown Prefix',
    description: 'Show everyone who\'s the king/queen of Mulon.',
    previewClass: '',
    previewText: '👑 YourName',
    currency: 'money',
    price: 10000
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    description: 'Your name glows with a bright neon effect. Stand out!',
    previewClass: 'neon-glow',
    previewText: 'YourName',
    currency: 'money',
    price: 12000
  },
  {
    id: 'diamond-prefix',
    name: 'Diamond Prefix',
    description: 'Add a diamond emoji. Pure luxury status.',
    previewClass: '',
    previewText: '💎 YourName',
    currency: 'money',
    price: 20000
  },
  {
    id: 'shadow-text',
    name: 'Shadow Effect',
    description: 'Your name casts a mysterious shadow. Spooky vibes.',
    previewClass: 'shadow-text',
    previewText: 'YourName',
    currency: 'keys',
    price: 100
  },
  {
    id: 'im-rich-tag',
    name: '"I\'m Rich" Tag',
    description: 'Flex your wealth with a tag that says "I\'m rich lol" after your name. Ultimate flex.',
    previewClass: 'im-rich-tag',
    previewText: 'YourName',
    currency: 'money',
    price: 150000,
    badge: '💰 WHALE',
    featured: true
  },
  {
    id: 'upside-down',
    name: 'Upside Down',
    description: 'Flip your entire row upside down on the leaderboard. Total chaos energy!',
    previewClass: 'upside-down-preview',
    previewText: 'YourName',
    currency: 'money',
    price: 67000,
    badge: '🙃 WEIRD',
    featured: true
  }
];

const profileDecorations = [
  {
    id: 'banner-flames',
    name: 'Flames Effect',
    description: 'Add animated flames around your leaderboard entry. Hot streak vibes!',
    image: 'images/shop/banner-flames.png',
    currency: 'keys',
    price: 100,
    isLeaderStyle: true
  },
  {
    id: 'frame-gold',
    name: 'Gold Border',
    description: 'Add a golden glowing border around your leaderboard row. Pure luxury.',
    image: 'images/shop/frame-gold.png',
    currency: 'money',
    price: 5000,
    isLeaderStyle: true
  },
  {
    id: 'og-leader-style',
    name: 'OG Leader Style',
    description: 'The legendary style from the original OverUnderTHS. Reserved for true OGs only.',
    image: 'images/shop/og.png',
    currency: 'exclusive',
    price: 0,
    badge: '🏆 EXCLUSIVE',
    exclusive: true
  },
  {
    id: 'custom-profile-banner',
    name: 'Custom Profile Banner',
    description: 'Upload your own image or GIF as your profile banner! Subject to admin approval.',
    image: 'images/shop/banner.png',
    currency: 'keys',
    price: 150,
    badge: '🖼️ CUSTOM',
    customBanner: true
  }
];

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof window.checkBanStatus === 'function') {
    const isBanned = await window.checkBanStatus();
    if (isBanned) return;
  }
  
  // Render customization items dynamically
  renderCustomizationItems();
  
  setupEventListeners();
  
  onAuthStateChanged(auth, async (user) => {
    if (typeof window.checkBanStatus === 'function') {
      const isBanned = await window.checkBanStatus();
      if (isBanned) return;
    }
    
    if (user) {
      currentUser = user;
      await loadUserData();
      updateHeaderUI();
    } else {
      currentUser = null;
      updateHeaderUI();
    }
  });
});

// ========================================
// RENDER CUSTOMIZATION ITEMS
// ========================================
function renderCustomizationItems() {
  const grid = document.getElementById('customizeGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  // Leaderboard Styles Section
  grid.innerHTML += `
    <div class="section-divider">
      <span class="divider-text">🏆 Leaderboard Styles</span>
    </div>
  `;
  
  leaderboardItems.forEach(item => {
    grid.innerHTML += renderLeaderboardItem(item);
  });
  
  // Profile Decorations Section
  grid.innerHTML += `
    <div class="section-divider">
      <span class="divider-text">🎨 Profile Decorations</span>
    </div>
  `;
  
  profileDecorations.forEach(item => {
    grid.innerHTML += renderImageItem(item);
  });
}

function renderLeaderboardItem(item) {
  const featuredClass = item.featured ? 'featured' : '';
  const isPurchased = userCustomizations[item.id] === true;
  const purchasedClass = isPurchased ? 'purchased' : '';
  const badge = isPurchased ? `<div class="item-badge purchased-badge">✓ OWNED</div>` 
    : (item.badge ? `<div class="item-badge">${item.badge}</div>` : '');
  
  const priceHTML = item.currency === 'keys' 
    ? `<div class="item-price keys-price">
        <img src="/bp/EE/assets/ouths/key.png" alt="Keys" class="price-icon">
        <span>${item.price} Keys</span>
      </div>`
    : `<div class="item-price money-price">
        <span class="price-emoji">💵</span>
        <span>$${item.price}</span>
      </div>`;
  
  const buttonHTML = isPurchased 
    ? `<button class="customize-buy-btn purchased-btn" disabled>✓ Purchased</button>`
    : `<button class="customize-buy-btn" data-item="${item.id}" data-currency="${item.currency}" data-price="${item.price}">Purchase</button>`;
  
  return `
    <div class="customize-item ${featuredClass} ${purchasedClass}">
      ${badge}
      <div class="item-preview">
        <div class="preview-leaderboard">
          <span class="preview-rank">#1</span>
          <span class="preview-name ${item.previewClass}">${item.previewText}</span>
          <span class="preview-score">$2,450</span>
        </div>
      </div>
      <div class="item-info">
        <h3 class="item-name">${item.name}</h3>
        <p class="item-description">${item.description}</p>
      </div>
      ${priceHTML}
      ${buttonHTML}
    </div>
  `;
}

function renderImageItem(item) {
  const featuredClass = item.featured ? 'featured' : '';
  const exclusiveClass = item.exclusive ? 'exclusive locked' : '';
  const customBannerClass = item.customBanner ? 'custom-banner-item' : '';
  
  // Check purchase status
  const customizationStatus = userCustomizations[item.id];
  const isPurchased = customizationStatus === true;
  const isPending = customizationStatus === 'pending';
  const purchasedClass = (isPurchased || isPending) ? 'purchased' : '';
  
  // Determine badge
  let badge = '';
  if (isPurchased) {
    badge = `<div class="item-badge purchased-badge">✓ OWNED</div>`;
  } else if (isPending) {
    badge = `<div class="item-badge pending-badge">⏳ PENDING</div>`;
  } else if (item.badge) {
    const badgeClass = item.exclusive ? 'exclusive-badge' : (item.customBanner ? 'custom-badge' : '');
    badge = `<div class="item-badge ${badgeClass}">${item.badge}</div>`;
  }
  
  let priceHTML;
  let buttonHTML;
  
  if (isPurchased) {
    priceHTML = `<div class="item-price keys-price">
      <img src="/bp/EE/assets/ouths/key.png" alt="Keys" class="price-icon">
      <span>${item.price} Keys</span>
    </div>`;
    buttonHTML = `<button class="customize-buy-btn purchased-btn" disabled>✓ Purchased</button>`;
  } else if (isPending) {
    priceHTML = `<div class="item-price keys-price">
      <img src="/bp/EE/assets/ouths/key.png" alt="Keys" class="price-icon">
      <span>${item.price} Keys</span>
    </div>`;
    buttonHTML = `<button class="customize-buy-btn pending-btn" disabled>⏳ Awaiting Approval</button>`;
  } else if (item.exclusive) {
    priceHTML = `<div class="item-price exclusive-price">
      <span class="exclusive-text">NOT FOR SALE</span>
    </div>`;
    buttonHTML = `<button class="customize-buy-btn exclusive-btn" disabled>
      Only OverUnderTHS OG's
    </button>`;
  } else if (item.customBanner) {
    priceHTML = `<div class="item-price keys-price">
      <img src="/bp/EE/assets/ouths/key.png" alt="Keys" class="price-icon">
      <span>${item.price} Keys</span>
    </div>`;
    buttonHTML = `<button class="customize-buy-btn custom-banner-btn" data-item="${item.id}" data-currency="${item.currency}" data-price="${item.price}">
      🖼️ Upload & Purchase
    </button>`;
  } else if (item.currency === 'keys') {
    priceHTML = `<div class="item-price keys-price">
      <img src="/bp/EE/assets/ouths/key.png" alt="Keys" class="price-icon">
      <span>${item.price} Keys</span>
    </div>`;
    buttonHTML = `<button class="customize-buy-btn" data-item="${item.id}" data-currency="${item.currency}" data-price="${item.price}">
      Purchase
    </button>`;
  } else {
    priceHTML = `<div class="item-price money-price">
      <span class="price-emoji">💵</span>
      <span>$${item.price}</span>
    </div>`;
    buttonHTML = `<button class="customize-buy-btn" data-item="${item.id}" data-currency="${item.currency}" data-price="${item.price}">
      Purchase
    </button>`;
  }
  
  return `
    <div class="customize-item image-item ${featuredClass} ${exclusiveClass} ${customBannerClass} ${purchasedClass}">
      ${badge}
      <div class="item-preview image-preview">
        <img src="${item.image}" alt="${item.name}" class="preview-image" onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=\\'placeholder-text\\'>${item.customBanner ? '🖼️' : '🖼️'}</span>';">
      </div>
      <div class="item-info">
        <h3 class="item-name">${item.name}</h3>
        <p class="item-description">${item.description}</p>
      </div>
      ${priceHTML}
      ${buttonHTML}
    </div>
  `;
}

// ========================================
// WARDROBE SECTION
// ========================================
function renderWardrobe() {
  const wardrobeGrid = document.getElementById('wardrobeGrid');
  if (!wardrobeGrid) return;
  
  // Get all purchased customizations (leaderboard styles + profile decorations)
  const ownedItems = [];
  
  leaderboardItems.forEach(item => {
    if (userCustomizations[item.id] === true) {
      ownedItems.push({
        ...item,
        type: 'leaderboard'
      });
    }
  });
  
  profileDecorations.forEach(item => {
    if (userCustomizations[item.id] === true && !item.exclusive) {
      ownedItems.push({
        ...item,
        type: item.isLeaderStyle ? 'leaderboard' : 'decoration'
      });
    }
  });
  
  if (ownedItems.length === 0) {
    wardrobeGrid.innerHTML = `
      <div class="wardrobe-empty">
        <span class="empty-icon">👕</span>
        <p>Your wardrobe is empty!</p>
        <p class="empty-hint">Purchase customizations above to add them here.</p>
      </div>
    `;
    return;
  }
  
  wardrobeGrid.innerHTML = ownedItems.map(item => {
    const isActive = userActiveStyles.includes(item.id);
    const activeClass = isActive ? 'active' : '';
    
    let previewHTML;
    if (item.type === 'leaderboard') {
      // For leaderboard items, show a preview with the effect
      const previewClass = item.previewClass || '';
      const previewText = item.previewText || 'YourName';
      previewHTML = `
        <div class="preview-leaderboard mini">
          <span class="preview-name ${previewClass}">${previewText}</span>
        </div>
      `;
    } else {
      previewHTML = `
        <img src="${item.image}" alt="${item.name}" class="wardrobe-image" onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=\\'placeholder-text\\'>🖼️</span>';">
      `;
    }
    
    return `
      <div class="wardrobe-item ${activeClass}" data-item-id="${item.id}">
        <div class="wardrobe-checkbox">
          <input type="checkbox" id="wardrobe-${item.id}" ${isActive ? 'checked' : ''}>
          <label for="wardrobe-${item.id}"></label>
        </div>
        <div class="wardrobe-preview">
          ${previewHTML}
        </div>
        <div class="wardrobe-name">${item.name}</div>
      </div>
    `;
  }).join('');
  
  // Add event listeners to wardrobe checkboxes
  wardrobeGrid.querySelectorAll('.wardrobe-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Prevent double-firing if clicking directly on checkbox
      if (e.target.type === 'checkbox') return;
      
      const checkbox = item.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
      toggleActiveStyle(item.dataset.itemId, checkbox.checked);
    });
    
    const checkbox = item.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', (e) => {
      toggleActiveStyle(item.dataset.itemId, e.target.checked);
    });
  });
}

async function toggleActiveStyle(itemId, isActive) {
  if (!currentUser) return;
  
  const wardrobeItem = document.querySelector(`.wardrobe-item[data-item-id="${itemId}"]`);
  
  if (isActive) {
    if (!userActiveStyles.includes(itemId)) {
      userActiveStyles.push(itemId);
    }
    wardrobeItem?.classList.add('active');
  } else {
    userActiveStyles = userActiveStyles.filter(id => id !== itemId);
    wardrobeItem?.classList.remove('active');
  }
  
  // Save to Firebase
  try {
    const userRef = doc(usersRef, currentUser.uid);
    await updateDoc(userRef, {
      activeStyles: userActiveStyles
    });
    
    // Also update leaderStyle in OverUnder users collection if it's a leaderboard style
    const leaderStyleClass = leaderStyleClassMap[itemId];
    if (leaderStyleClass) {
      await syncLeaderStyle();
    }
  } catch (error) {
    console.error('Error saving active styles:', error);
  }
}

async function syncLeaderStyle() {
  if (!currentUser || !currentUser.email) return;
  
  // Build combined style string from all active leaderboard styles
  const activeLeaderStyles = userActiveStyles
    .map(styleId => leaderStyleClassMap[styleId])
    .filter(style => style);
  
  const combinedStyle = activeLeaderStyles.join(' ');
  
  try {
    // Find the OverUnder user by email
    const q = query(overUnderUsersRef, where('email', '==', currentUser.email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        leaderStyle: combinedStyle
      });
      console.log(`Synced leaderStyle to: ${combinedStyle}`);
    }
  } catch (error) {
    console.error('Error syncing leaderStyle:', error);
  }
}

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
  // Real money pack purchases
  document.querySelectorAll('.pack-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!currentUser) {
        alert('Please sign in to make purchases.');
        return;
      }
      
      const pack = btn.dataset.pack;
      const price = parseFloat(btn.dataset.price);
      openPurchaseModal('pack', pack, price);
    });
  });
  
  // Customization purchases - use event delegation since items are rendered dynamically
  document.getElementById('customizeGrid')?.addEventListener('click', (e) => {
    // Check for custom banner button first
    const bannerBtn = e.target.closest('.custom-banner-btn');
    if (bannerBtn) {
      if (!currentUser) {
        alert('Please sign in to make purchases.');
        return;
      }
      openBannerModal();
      return;
    }
    
    const btn = e.target.closest('.customize-buy-btn:not(.exclusive-btn):not(.custom-banner-btn)');
    if (!btn) return;
    
    if (!currentUser) {
      alert('Please sign in to make purchases.');
      return;
    }
    
    const item = btn.dataset.item;
    const currency = btn.dataset.currency;
    const price = parseFloat(btn.dataset.price);
    openPurchaseModal('customize', item, price, currency);
  });
  
  // Modal close buttons
  document.getElementById('closePurchaseModal')?.addEventListener('click', closePurchaseModal);
  document.getElementById('cancelPurchaseBtn')?.addEventListener('click', closePurchaseModal);
  document.getElementById('closeSuccessBtn')?.addEventListener('click', closeSuccessModal);
  
  // Banner modal close buttons
  document.getElementById('closeBannerModal')?.addEventListener('click', closeBannerModal);
  document.getElementById('cancelBannerBtn')?.addEventListener('click', closeBannerModal);
  document.getElementById('confirmBannerBtn')?.addEventListener('click', confirmBannerPurchase);
  
  // Banner URL input preview
  document.getElementById('bannerUrlInput')?.addEventListener('input', updateBannerPreview);
  
  // Banner payment confirmation checkbox
  document.getElementById('confirmBannerPayment')?.addEventListener('change', updateBannerPreview);
  
  // Real money checkbox
  document.getElementById('confirmRealMoney')?.addEventListener('change', (e) => {
    const confirmBtn = document.getElementById('confirmPurchaseBtn');
    if (confirmBtn) {
      confirmBtn.disabled = !e.target.checked;
    }
  });
  
  // Confirm purchase
  document.getElementById('confirmPurchaseBtn')?.addEventListener('click', confirmPurchase);
  
  // User menu
  setupUserMenu();
  setupKeysTooltip();
}

// ========================================
// USER DATA
// ========================================
async function loadUserData() {
  if (!currentUser) return;
  
  try {
    const userDocRef = doc(usersRef, currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      userBalance = data.balance || 500;
      userKeys = data.keys || 0;
      userCustomizations = data.customizations || {};
      userActiveStyles = data.activeStyles || [];
      
      // Check banner status
      if (userCustomizations['custom-profile-banner'] === 'pending') {
        userBannerStatus = 'pending';
      } else if (userCustomizations['custom-profile-banner'] === true || data.customBannerUrl) {
        userBannerStatus = 'approved';
      } else {
        userBannerStatus = null;
      }
      
      document.getElementById('userBalance').textContent = `$${userBalance.toFixed(2)}`;
      document.getElementById('userKeys').innerHTML = `<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ${userKeys}`;
      
      // Re-render items to show purchased status
      renderCustomizationItems();
      renderWardrobe();
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// ========================================
// PURCHASE MODAL
// ========================================
const packInfo = {
  starter: {
    name: 'Starter Pack',
    description: 'Get $20,000 balance, 150 keys, and "Supporter" badge!',
    icon: '🎁'
  },
  pro: {
    name: 'Pro Pack',
    description: 'Get $50,000 balance, 330 keys, and "Pro Trader" badge!',
    icon: '💎'
  }
};

const customizeInfo = {
  'backwards-name': { name: 'Backwards Name', description: 'Your name appears reversed on the leaderboard.' },
  'gold-name': { name: 'Gold Name', description: 'Your name shines in luxurious gold.' },
  'rainbow-name': { name: 'Rainbow Name', description: 'Your name cycles through all colors.' },
  'glitch-name': { name: 'Glitch Effect', description: 'Your name glitches mysteriously.' },
  'fire-prefix': { name: 'Fire Prefix', description: 'Add 🔥 before your name.' },
  'crown-prefix': { name: 'Crown Prefix', description: 'Add 👑 before your name.' },
  'neon-glow': { name: 'Neon Glow', description: 'Your name glows with neon effect.' },
  'diamond-prefix': { name: 'Diamond Prefix', description: 'Add 💎 before your name.' },
  'shadow-text': { name: 'Shadow Effect', description: 'Your name casts a mysterious shadow.' },
  'im-rich-tag': { name: '"I\'m Rich" Tag', description: 'Shows "I\'m rich lol" after your name.' },
  'upside-down': { name: 'Upside Down', description: 'Flips your leaderboard row upside down.' },
  'custom-profile-banner': { name: 'Custom Profile Banner', description: 'Your custom profile banner (pending approval).' },
  'banner-flames': { name: 'Flames Effect', description: 'Animated flames around your leaderboard entry.' },
  'frame-gold': { name: 'Gold Border', description: 'Golden glowing border around your row.' }
};

function openPurchaseModal(type, item, price, currency = 'usd') {
  currentPurchase = { type, item, price, currency };
  
  const modal = document.getElementById('purchaseModal');
  const itemName = document.getElementById('purchaseItemName');
  const itemDesc = document.getElementById('purchaseItemDesc');
  const priceEl = document.getElementById('purchasePrice');
  const realMoneyConfirm = document.getElementById('realMoneyConfirm');
  const confirmAmount = document.getElementById('confirmAmount');
  const confirmBtn = document.getElementById('confirmPurchaseBtn');
  const checkbox = document.getElementById('confirmRealMoney');
  
  if (type === 'pack') {
    const info = packInfo[item];
    itemName.textContent = info.name;
    itemDesc.textContent = info.description;
    priceEl.textContent = `$${price.toFixed(2)} USD (REAL MONEY)`;
    priceEl.style.color = '#ff6b6b';
    realMoneyConfirm.style.display = 'block';
    confirmAmount.textContent = price.toFixed(2);
    checkbox.checked = false;
    confirmBtn.disabled = true;
  } else {
    const info = customizeInfo[item];
    itemName.textContent = info.name;
    itemDesc.textContent = info.description;
    
    if (currency === 'keys') {
      priceEl.innerHTML = `<img src="/bp/EE/assets/ouths/key.png" alt="" style="width:20px;height:20px;vertical-align:middle;"> ${price} Keys`;
      priceEl.style.color = 'var(--text-primary)';
    } else {
      priceEl.textContent = `$${price.toFixed(2)} (In-Game Balance)`;
      priceEl.style.color = 'var(--green-primary)';
    }
    
    realMoneyConfirm.style.display = 'none';
    confirmBtn.disabled = false;
  }
  
  modal.classList.add('active');
}

function closePurchaseModal() {
  document.getElementById('purchaseModal').classList.remove('active');
  currentPurchase = null;
}

// ========================================
// UPDATE LEADER STYLE IN OVERUNDER USERS
// ========================================
async function updateLeaderStyle(itemId) {
  if (!currentUser || !currentUser.email) return;
  
  const styleClass = leaderStyleClassMap[itemId];
  if (!styleClass) return;
  
  try {
    // Find the OverUnder user by email
    const q = query(overUnderUsersRef, where('email', '==', currentUser.email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      const currentStyle = userData.leaderStyle || '';
      
      // Check if style already exists
      const existingStyles = currentStyle.split(' ').filter(s => s.trim() !== '');
      if (!existingStyles.includes(styleClass)) {
        // Add the new style to existing styles
        const newStyle = currentStyle ? `${currentStyle} ${styleClass}` : styleClass;
        await updateDoc(doc(db, 'users', userDoc.id), {
          leaderStyle: newStyle
        });
        console.log(`Updated leaderStyle to: ${newStyle}`);
      }
    } else {
      console.log('No OverUnder user found for email:', currentUser.email);
    }
  } catch (error) {
    console.error('Error updating leaderStyle:', error);
  }
}

// ========================================
// CONFIRM PURCHASE
// ========================================
async function confirmPurchase() {
  if (!currentPurchase || !currentUser) return;
  
  const { type, item, price, currency } = currentPurchase;
  
  try {
    if (type === 'pack') {
      // Real money purchase - save to purchases collection for admin
      await addDoc(purchasesRef, {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        username: currentUser.displayName || currentUser.email?.split('@')[0] || 'Unknown',
        type: 'pack',
        packId: item,
        packName: packInfo[item].name,
        amount: price,
        currency: 'USD',
        status: 'pending',
        timestamp: serverTimestamp()
      });
      
      closePurchaseModal();
      showSuccessModal(true, packInfo[item].name);
      
    } else {
      // In-game currency purchase
      const userDocRef = doc(usersRef, currentUser.uid);
      
      if (currency === 'keys') {
        if (userKeys < price) {
          alert(`Not enough keys! You need ${price} keys but only have ${userKeys}.`);
          return;
        }
        
        // Deduct keys and add customization
        const newKeys = userKeys - price;
        await updateDoc(userDocRef, {
          keys: newKeys,
          [`customizations.${item}`]: true
        });
        
        userKeys = newKeys;
        userCustomizations[item] = true; // Update local state
        document.getElementById('userKeys').innerHTML = `<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ${userKeys}`;
        
      } else {
        if (userBalance < price) {
          alert(`Not enough balance! You need $${price.toFixed(2)} but only have $${userBalance.toFixed(2)}.`);
          return;
        }
        
        // Deduct balance and add customization
        const newBalance = userBalance - price;
        await updateDoc(userDocRef, {
          balance: newBalance,
          [`customizations.${item}`]: true
        });
        
        userBalance = newBalance;
        userCustomizations[item] = true; // Update local state
        document.getElementById('userBalance').textContent = `$${userBalance.toFixed(2)}`;
      }
      
      closePurchaseModal();
      showSuccessModal(false, customizeInfo[item].name);
      
      // Re-render UI to show purchased status
      renderCustomizationItems();
      renderWardrobe();
      
      // If this is a leaderboard style (or profile decoration that is a leader style), also update the OverUnder users collection
      if (leaderStyleClassMap[item]) {
        await updateLeaderStyle(item);
        
        // Auto-activate the purchased style
        if (!userActiveStyles.includes(item)) {
          userActiveStyles.push(item);
          const userRef = doc(usersRef, currentUser.uid);
          await updateDoc(userRef, {
            activeStyles: userActiveStyles
          });
          await syncLeaderStyle();
        }
      }
    }
    
  } catch (error) {
    console.error('Error processing purchase:', error);
    alert('Failed to process purchase. Please try again.');
  }
}

// ========================================
// SUCCESS MODAL
// ========================================
function showSuccessModal(isRealMoney, itemName) {
  const modal = document.getElementById('successModal');
  const message = document.getElementById('successMessage');
  const joelNotice = document.getElementById('seeJoelNotice');
  
  if (isRealMoney) {
    message.textContent = `Your purchase of ${itemName} has been recorded!`;
    joelNotice.style.display = 'block';
  } else {
    message.textContent = `${itemName} has been added to your account!`;
    joelNotice.style.display = 'none';
  }
  
  modal.classList.add('active');
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.remove('active');
}

// ========================================
// CUSTOM BANNER MODAL
// ========================================
const BANNER_PRICE = 150; // keys

function openBannerModal() {
  const modal = document.getElementById('bannerModal');
  const urlInput = document.getElementById('bannerUrlInput');
  const preview = document.getElementById('bannerPreviewImage');
  const confirmBtn = document.getElementById('confirmBannerBtn');
  const keysDisplay = document.getElementById('bannerKeysRequired');
  
  // Reset state
  if (urlInput) urlInput.value = '';
  if (preview) {
    preview.style.backgroundImage = 'none';
    preview.classList.remove('has-image');
  }
  if (confirmBtn) confirmBtn.disabled = true;
  if (keysDisplay) keysDisplay.textContent = BANNER_PRICE;
  
  // Show current user keys
  const currentKeysEl = document.getElementById('bannerCurrentKeys');
  if (currentKeysEl) currentKeysEl.textContent = userKeys;
  
  modal?.classList.add('active');
}

function closeBannerModal() {
  document.getElementById('bannerModal')?.classList.remove('active');
}

function updateBannerPreview() {
  const urlInput = document.getElementById('bannerUrlInput');
  const preview = document.getElementById('bannerPreviewImage');
  const confirmBtn = document.getElementById('confirmBannerBtn');
  const errorMsg = document.getElementById('bannerUrlError');
  const paymentCheckbox = document.getElementById('confirmBannerPayment');
  
  const url = urlInput?.value.trim();
  const isPaymentConfirmed = paymentCheckbox?.checked || false;
  
  if (!url) {
    if (preview) {
      preview.style.backgroundImage = 'none';
      preview.classList.remove('has-image');
    }
    if (confirmBtn) confirmBtn.disabled = true;
    if (errorMsg) errorMsg.style.display = 'none';
    return;
  }
  
  // Validate URL format
  const isValidUrl = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url) || 
                     /^https?:\/\/.+/i.test(url); // Allow any https URL for flexibility
  
  if (!isValidUrl) {
    if (errorMsg) {
      errorMsg.textContent = 'Please enter a valid image URL (http/https)';
      errorMsg.style.display = 'block';
    }
    if (confirmBtn) confirmBtn.disabled = true;
    return;
  }
  
  // Test if image loads
  const testImg = new Image();
  testImg.onload = () => {
    if (preview) {
      preview.style.backgroundImage = `url('${url}')`;
      preview.classList.add('has-image');
    }
    // Button enabled only if: valid image, enough keys, AND payment confirmed
    if (confirmBtn) confirmBtn.disabled = userKeys < BANNER_PRICE || !isPaymentConfirmed;
    if (errorMsg) errorMsg.style.display = 'none';
  };
  testImg.onerror = () => {
    if (errorMsg) {
      errorMsg.textContent = 'Could not load image from this URL';
      errorMsg.style.display = 'block';
    }
    if (preview) {
      preview.style.backgroundImage = 'none';
      preview.classList.remove('has-image');
    }
    if (confirmBtn) confirmBtn.disabled = true;
  };
  testImg.src = url;
}

async function confirmBannerPurchase() {
  if (!currentUser) {
    alert('Please sign in to make purchases.');
    return;
  }
  
  const urlInput = document.getElementById('bannerUrlInput');
  const bannerUrl = urlInput?.value.trim();
  
  if (!bannerUrl) {
    alert('Please enter a banner image URL.');
    return;
  }
  
  if (userKeys < BANNER_PRICE) {
    alert(`Not enough keys! You need ${BANNER_PRICE} keys but only have ${userKeys}.`);
    return;
  }
  
  try {
    const userDocRef = doc(usersRef, currentUser.uid);
    
    // Deduct keys
    const newKeys = userKeys - BANNER_PRICE;
    await updateDoc(userDocRef, {
      keys: newKeys,
      'customizations.custom-profile-banner': 'pending'
    });
    
    // Save banner request to purchases for admin approval
    await addDoc(purchasesRef, {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      username: currentUser.displayName || currentUser.email?.split('@')[0] || 'Unknown',
      type: 'custom-banner',
      bannerUrl: bannerUrl,
      amount: BANNER_PRICE,
      currency: 'keys',
      status: 'pending',
      timestamp: serverTimestamp()
    });
    
    // Update local state
    userKeys = newKeys;
    document.getElementById('userKeys').innerHTML = `<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ${userKeys}`;
    
    closeBannerModal();
    showBannerSuccessModal();
    
  } catch (error) {
    console.error('Error processing banner purchase:', error);
    alert('Failed to process purchase. Please try again.');
  }
}

function showBannerSuccessModal() {
  const modal = document.getElementById('successModal');
  const message = document.getElementById('successMessage');
  const joelNotice = document.getElementById('seeJoelNotice');
  
  message.textContent = 'Your custom banner has been submitted for approval!';
  joelNotice.style.display = 'block';
  
  modal.classList.add('active');
}

// ========================================
// HEADER UI
// ========================================
function updateHeaderUI() {
  const userAvatar = document.getElementById('userAvatar');
  const userInitials = document.getElementById('userInitials');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const signOutBtn = document.getElementById('signOutBtn');
  const headerSignInBtn = document.getElementById('headerSignInBtn');
  
  if (currentUser) {
    const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    const initials = name.substring(0, 2).toUpperCase();
    
    userInitials.textContent = initials;
    userName.textContent = name;
    userEmail.textContent = currentUser.email || '';
    
    if (signOutBtn) signOutBtn.style.display = 'flex';
    if (headerSignInBtn) headerSignInBtn.style.display = 'none';
  } else {
    userInitials.textContent = '?';
    userName.textContent = 'Guest';
    userEmail.textContent = 'Not signed in';
    
    if (signOutBtn) signOutBtn.style.display = 'none';
    if (headerSignInBtn) headerSignInBtn.style.display = 'flex';
  }
}

function setupUserMenu() {
  const userMenu = document.getElementById('userMenu');
  const userDropdown = document.getElementById('userDropdown');
  
  if (userMenu && userDropdown) {
    userMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('active');
    });
    
    document.addEventListener('click', () => {
      userDropdown.classList.remove('active');
    });
  }
  
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      try {
        await auth.signOut();
        window.location.reload();
      } catch (error) {
        console.error('Sign out error:', error);
      }
    });
  }
  
  const headerSignInBtn = document.getElementById('headerSignInBtn');
  if (headerSignInBtn) {
    headerSignInBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
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
