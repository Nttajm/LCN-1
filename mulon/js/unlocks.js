// Unlocks.js - Card-based reward unlock system

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  arrayUnion,
  increment,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

// Import shared card data
import { cardsData, getCardByNumber } from '../card-data/cards-data.js';

// Import level utilities
import { calculateLevel } from './level-utils.js';

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
const bannedDevicesRef = collection(db, 'mulon_banned_devices');
const bannedEmailsRef = collection(db, 'mulon_banned_emails');

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
      window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
      return true;
    }
    
    // If user is signed in, check email ban and user ban
    if (user) {
      // Check if email is in banned emails list
      if (user.email) {
        const emailKey = user.email.toLowerCase().replace(/[.#$[\]]/g, '_');
        const emailDoc = await getDoc(doc(bannedEmailsRef, emailKey));
        if (emailDoc.exists()) {
          console.log('Email is banned, redirecting...');
          window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
          return true;
        }
      }
      
      const userDoc = await getDoc(doc(usersRef, user.uid));
      if (userDoc.exists() && userDoc.data().banned === true) {
        console.log('User is banned, redirecting...');
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

// Make available globally
window.checkBanStatus = checkBanStatus;

// User state
let currentUser = null;
let userBalance = 0;
let userKeys = 0;
let userLevel = 1;
let userOwnedCards = []; // Array of card objects { docId, cardNumber, hasCard, ... }
let userCompletedUnlocks = []; // Array of unlock IDs that user has completed

// Current filter
let currentFilter = 'all';

// Selected unlock for modal
let selectedUnlock = null;

// ========================================
// UNLOCKS DATA
// Each unlock has availability conditions
// ========================================
const unlocksData = [
  {
    id: 'triple-t-keys',
    name: '50 Keys Reward',
    description: 'Trade in 3 Triple T cards for a sweet 50 keys bonus!',
    icon: '🔑',
    reward: {
      type: 'keys',
      amount: 50
    },
    requirements: {
      cards: [
        { cardNumber: '#018', quantity: 3 }
      ]
    },
    availability: {
      type: 'always',
    },
    repeatable: false
  },
  {
    id: 'pet-lover-cash',
    name: 'Pet Lover Bonus',
    description: 'Show off your love for animals! Trade a Puppy and a Cat for cold hard cash.',
    icon: '💵',
    reward: {
      type: 'cash',
      amount: 500
    },
    requirements: {
      cards: [
        { cardNumber: '#028', quantity: 1 },
        { cardNumber: '#030', quantity: 1 }
      ]
    },
    availability: {
      type: 'always',
    },
    repeatable: false
  },
  {
    id: 'tech-collector',
    name: 'Tech Collector',
    description: 'Combine your AirPods and Apple Watch for a big keys payout!',
    icon: '🎧',
    reward: {
      type: 'keys',
      amount: 100
    },
    requirements: {
      cards: [
        { cardNumber: '#009', quantity: 1 },
        { cardNumber: '#029', quantity: 1 }
      ]
    },
    availability: {
      type: 'always',
    },
    repeatable: false
  },
  {
    id: 'gamer-paradise',
    name: 'Gamer Paradise',
    description: 'Trade in your Xbox and GTA 6 for a massive cash reward!',
    icon: '🎮',
    reward: {
      type: 'cash',
      amount: 2500
    },
    requirements: {
      cards: [
        { cardNumber: '#020', quantity: 1 },
        { cardNumber: '#013', quantity: 1 }
      ]
    },
    availability: {
      type: 'always',
    },
    repeatable: false
  },
  {
    id: 'meme-lord',
    name: 'Meme Lord',
    description: 'Combine Tralalelo and MrLeast to prove your meme expertise!',
    icon: '🎭',
    reward: {
      type: 'keys',
      amount: 75
    },
    requirements: {
      cards: [
        { cardNumber: '#019', quantity: 1 },
        { cardNumber: '#032', quantity: 2 }
      ]
    },
    availability: {
      type: 'always',
    },
    repeatable: true
  },
  {
    id: 'weekend-special',
    name: 'Weekend Jackpot',
    description: 'Special weekend-only reward! Trade any Epic card for bonus cash.',
    icon: '🎉',
    reward: {
      type: 'cash',
      amount: 1000
    },
    requirements: {
      cards: [
        { cardNumber: '#017', quantity: 1 }
      ]
    },
    availability: {
      type: 'day',
      days: [0, 6] // Saturday and Sunday
    },
    repeatable: true
  },
  {
    id: 'lunch-rush',
    name: 'Lunch Rush Keys',
    description: 'Available 11am-2pm only! Trade a Taco Bell card for keys.',
    icon: '🌮',
    reward: {
      type: 'keys',
      amount: 200
    },
    requirements: {
      cards: [
        { cardNumber: '#004', quantity: 1 }
      ]
    },
    availability: {
      type: 'time',
      startHour: 11,
      endHour: 14
    },
    repeatable: false
  },
  {
    id: 'elite-trader',
    name: 'Elite Trader Bonus',
    description: 'For Level 3+ traders only! Trade 2 puppies for a premium cash reward.',
    icon: '👑',
    reward: {
      type: 'cash',
      amount: 750
    },
    requirements: {
      cards: [
        { cardNumber: '#021', quantity: 1 },
        { cardNumber: '#028', quantity: 1 }
      ]
    },
    availability: {
      type: 'level',
      minLevel: 3
    },
    repeatable: false
  },
  {
    id: 'travel-dreams',
    name: 'Travel Dreams',
    description: 'Trade your Trip to Japan and Agarthan Passport for mega keys!',
    icon: '✈️',
    reward: {
      type: 'keys',
      amount: 300
    },
    requirements: {
      cards: [
        { cardNumber: '#025', quantity: 1 },
        { cardNumber: '#014', quantity: 1 }
      ]
    },
    availability: {
      type: 'always',
    },
    repeatable: false
  },
  {
    id: 'celebrity-meetup',
    name: 'Celebrity Meetup',
    description: 'The ultimate flex! Trade Danny DeVito for a massive cash payout!',
    icon: '🌟',
    reward: {
      type: 'cash',
      amount: 50000
    },
    requirements: {
      cards: [
        { cardNumber: '#001', quantity: 1 }
      ]
    },
    availability: {
      type: 'always',
    },
    repeatable: false
  },
  {
    id: 'common-collector',
    name: 'Common Collector',
    description: 'Trade 5 iPhone 6 cards for some quick keys. Easy money!',
    icon: '📱',
    reward: {
      type: 'keys',
      amount: 25
    },
    requirements: {
      cards: [
        { cardNumber: '#034', quantity: 5 }
      ]
    },
    availability: {
      type: 'always',
    },
    repeatable: true
  },
  // ========================================
  // LEVEL-LOCKED UNLOCKS
  // ========================================
  {
    id: 'rising-star',
    name: 'Rising Star',
    description: 'Level 5 reward! Trade your Foam Runners for a nice cash bonus.',
    icon: '⭐',
    reward: {
      type: 'cash',
      amount: 200
    },
    requirements: {
      cards: [
        { cardNumber: '#033', quantity: 2 }
      ]
    },
    availability: {
      type: 'level',
      minLevel: 5
    },
    repeatable: false
  },
  {
    id: 'document-forger',
    name: 'Document Forger',
    description: 'Level 7 exclusive! Trade a Fake ID and SSN for serious keys.',
    icon: '🪪',
    reward: {
      type: 'keys',
      amount: 150
    },
    requirements: {
      cards: [
        { cardNumber: '#031', quantity: 1 },
        { cardNumber: '#012', quantity: 1 }
      ]
    },
    availability: {
      type: 'level',
      minLevel: 7
    },
    repeatable: false
  },
  {
    id: 'fuel-mogul',
    name: 'Fuel Mogul',
    description: 'Level 10 VIP! Trade 3 gas tanks for a fat cash reward.',
    icon: '⛽',
    reward: {
      type: 'cash',
      amount: 1500
    },
    requirements: {
      cards: [
        { cardNumber: '#036', quantity: 2 },
        { cardNumber: '#038', quantity: 3 }
      ]
    },
    availability: {
      type: 'level',
      minLevel: 10
    },
    repeatable: false
  },
  {
    id: 'subscription-king',
    name: 'Subscription King',
    description: 'Level 12 elite! Trade Xbox Game Pass + Netflix for mega keys.',
    icon: '👑',
    reward: {
      type: 'keys',
      amount: 500
    },
    requirements: {
      cards: [
        { cardNumber: '#010', quantity: 1 },
        { cardNumber: '#011', quantity: 1 }
      ]
    },
    availability: {
      type: 'level',
      minLevel: 12
    },
    repeatable: false
  },
  {
    id: 'car-dealer',
    name: 'Car Dealer',
    description: 'Level 15 prestige! Trade a Prius and Mercedes C-Class for huge cash.',
    icon: '🚗',
    reward: {
      type: 'cash',
      amount: 25000
    },
    requirements: {
      cards: [
        { cardNumber: '#007', quantity: 1 },
        { cardNumber: '#016', quantity: 1 }
      ]
    },
    availability: {
      type: 'level',
      minLevel: 15
    },
    repeatable: false
  },
  {
    id: 'influencer-deal',
    name: 'Influencer Deal',
    description: 'Level 18 legend! Trade MrBeast collab + LeBron jersey for insane keys.',
    icon: '📸',
    reward: {
      type: 'keys',
      amount: 1000
    },
    requirements: {
      cards: [
        { cardNumber: '#026', quantity: 1 },
        { cardNumber: '#008', quantity: 1 }
      ]
    },
    availability: {
      type: 'level',
      minLevel: 18
    },
    repeatable: false
  },
  {
    id: 'luxury-fleet',
    name: 'Luxury Fleet',
    description: 'Level 22 master! Trade Tesla Plaid + Mercedes Benz for massive cash.',
    icon: '🏎️',
    reward: {
      type: 'cash',
      amount: 75000
    },
    requirements: {
      cards: [
        { cardNumber: '#002', quantity: 1 },
        { cardNumber: '#006', quantity: 1 }
      ]
    },
    availability: {
      type: 'level',
      minLevel: 22
    },
    repeatable: false
  },
  {
    id: 'ultimate-flex',
    name: 'Ultimate Flex',
    description: 'Level 25 god! Trade Bragging Card + Rich Millionaire for legendary keys.',
    icon: '💎',
    reward: {
      type: 'keys',
      amount: 2500
    },
    requirements: {
      cards: [
        { cardNumber: '#003', quantity: 1 },
        { cardNumber: '#024', quantity: 1 }
      ]
    },
    availability: {
      type: 'level',
      minLevel: 25
    },
    repeatable: false
  },
  {
    id: 'developer-bribe',
    name: 'Developer Bribe',
    description: 'Level 30 MAXIMUM! Trade "Ask Joel to Make Feature" for the ultimate payout.',
    icon: '🔮',
    reward: {
      type: 'cash',
      amount: 150000
    },
    requirements: {
      cards: [
        { cardNumber: '#005', quantity: 1 }
      ]
    },
    availability: {
      type: 'level',
      minLevel: 30
    },
    repeatable: false
  },
  // ========================================
  // SCHOOL HOURS UNLOCKS (8am-3pm)
  // ========================================
  {
    id: 'study-break',
    name: 'Study Break',
    description: 'School hours only! Trade 2 Torre Exams for quick keys.',
    icon: '📚',
    reward: {
      type: 'keys',
      amount: 40
    },
    requirements: {
      cards: [
        { cardNumber: '#027', quantity: 1 },
        { cardNumber: '#037', quantity: 2 }
      ]
    },
    availability: {
      type: 'time',
      startHour: 8,
      endHour: 15
    },
    repeatable: true
  },
  {
    id: 'cafeteria-hustle',
    name: 'Cafeteria Hustle',
    description: 'School hours! Trade Taco Bell + Starbucks + Smoken Bowls for cash.',
    icon: '🍽️',
    reward: {
      type: 'cash',
      amount: 100
    },
    requirements: {
      cards: [
        { cardNumber: '#042', quantity: 1 },
        { cardNumber: '#043', quantity: 1 },
        { cardNumber: '#044', quantity: 1 }
      ]
    },
    availability: {
      type: 'time',
      startHour: 8,
      endHour: 15
    },
    repeatable: true
  },
  {
    id: 'school-supplies',
    name: 'School Supplies Swap',
    description: 'School hours only! Trade 10 pencils and 5 paper clips for keys.',
    icon: '✏️',
    reward: {
      type: 'keys',
      amount: 15
    },
    requirements: {
      cards: [
        { cardNumber: '#040', quantity: 10 },
        { cardNumber: '#041', quantity: 5 }
      ]
    },
    availability: {
      type: 'time',
      startHour: 8,
      endHour: 15
    },
    repeatable: true
  },
  // ========================================
  // MORE CREATIVE UNLOCKS
  // ========================================
  {
    id: 'monopoly-man',
    name: 'Monopoly Man',
    description: 'Get out of jail AND get rich! Trade your cards for cash.',
    icon: '🎩',
    reward: {
      type: 'cash',
      amount: 888
    },
    requirements: {
      cards: [
        { cardNumber: '#023', quantity: 1 },
        { cardNumber: '#039', quantity: 3 }
      ]
    },
    availability: {
      type: 'always',
    },
    repeatable: false
  },
  {
    id: 'drip-check',
    name: 'Drip Check',
    description: 'Show off your style! Trade footwear collection for keys.',
    icon: '👟',
    reward: {
      type: 'keys',
      amount: 60
    },
    requirements: {
      cards: [
        { cardNumber: '#033', quantity: 1 },
        { cardNumber: '#035', quantity: 2 }
      ]
    },
    availability: {
      type: 'always',
    },
    repeatable: true
  },
  // More unlocks can be added here with different availability conditions
  // Example: Time-limited unlock (12pm-2pm)
  // {
  //   id: 'lunch-special',
  //   name: 'Lunch Special',
  //   description: 'Available only during lunch hours!',
  //   icon: '🍔',
  //   reward: { type: 'keys', amount: 25 },
  //   requirements: {
  //     cards: [{ cardNumber: '#025', name: 'Burger', emoji: '🍔', quantity: 1 }]
  //   },
  //   availability: {
  //     type: 'time',
  //     startHour: 12,
  //     endHour: 14
  //   },
  //   repeatable: true
  // },
  // Example: Day-limited unlock (Sunday only)
  // {
  //   id: 'sunday-funday',
  //   name: 'Sunday Funday',
  //   description: 'Exclusive Sunday reward!',
  //   icon: '☀️',
  //   reward: { type: 'keys', amount: 30 },
  //   requirements: {
  //     cards: [{ cardNumber: '#030', name: 'Sun', emoji: '☀️', quantity: 2 }]
  //   },
  //   availability: {
  //     type: 'day',
  //     days: [0] // 0 = Sunday
  //   },
  //   repeatable: true
  // },
  // Example: Level-locked unlock
  // {
  //   id: 'elite-reward',
  //   name: 'Elite Reward',
  //   description: 'Requires Level 3 or higher!',
  //   icon: '👑',
  //   reward: { type: 'keys', amount: 100 },
  //   requirements: {
  //     cards: [{ cardNumber: '#001', name: 'Danny DeVito', emoji: '🎬', quantity: 1 }]
  //   },
  //   availability: {
  //     type: 'level',
  //     minLevel: 3
  //   },
  //   repeatable: false
  // }
];

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  // Check ban status on page load
  if (typeof window.checkBanStatus === 'function') {
    const isBanned = await window.checkBanStatus();
    if (isBanned) return; // Stop if banned
  }
  
  initializeUI();
  setupEventListeners();
  
  // Listen for auth changes
  onAuthStateChanged(auth, async (user) => {
    // Check ban status on every auth state change
    if (typeof window.checkBanStatus === 'function') {
      const isBanned = await window.checkBanStatus();
      if (isBanned) return; // Stop if banned
    }
    
    if (user) {
      currentUser = user;
      await loadUserData();
      updateHeaderUI();
      renderUnlocks();
    } else {
      currentUser = null;
      userOwnedCards = [];
      userCompletedUnlocks = [];
      updateHeaderUI();
      renderUnlocks();
    }
  });
});

// ========================================
// UI INITIALIZATION
// ========================================
function initializeUI() {
  // Set initial counts
  document.getElementById('userCardsCount').textContent = '0';
  document.getElementById('unlocksCompletedCount').textContent = '0';
  const allCardsCount = document.getElementById('allCardsCount');
  if (allCardsCount) allCardsCount.textContent = cardsData.length.toString();
}

function setupEventListeners() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderUnlocks();
    });
  });
  
  // Modal close buttons
  document.getElementById('closeUnlockModal')?.addEventListener('click', closeUnlockModal);
  document.getElementById('cancelUnlockBtn')?.addEventListener('click', closeUnlockModal);
  document.getElementById('confirmUnlockBtn')?.addEventListener('click', confirmUnlock);
  document.getElementById('closeSuccessBtn')?.addEventListener('click', closeSuccessModal);
  
  // User menu
  setupUserMenu();
  setupKeysTooltip();
}

// ========================================
// USER DATA LOADING
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
      
      // Calculate level from XP
      const levelData = calculateLevel(data.xps || 0);
      userLevel = levelData.level;
      console.log(`User level: ${userLevel} (from ${data.xps || 0} XP)`);
      
      userCompletedUnlocks = data.completedUnlocks || [];
      
      // Load cards from subcollection (same as marketplace)
      try {
        const cardsCollectionRef = collection(db, 'mulon_users', currentUser.uid, 'card_inventory');
        const cardsQuery = query(cardsCollectionRef, where('hasCard', '==', true));
        const cardsSnapshot = await getDocs(cardsQuery);
        userOwnedCards = [];
        cardsSnapshot.forEach((cardDoc) => {
          userOwnedCards.push({ docId: cardDoc.id, ...cardDoc.data() });
        });
        console.log(`Unlocks: Loaded ${userOwnedCards.length} cards from subcollection`);
      } catch (cardError) {
        console.error('Error loading cards from subcollection:', cardError);
        // Fallback to ownedCards array if subcollection fails
        userOwnedCards = data.ownedCards || [];
      }
      
      // Update header displays
      document.getElementById('userBalance').textContent = `$${userBalance.toFixed(2)}`;
      document.getElementById('userKeys').innerHTML = `<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ${userKeys}`;
      
      // Update stats
      document.getElementById('userCardsCount').textContent = userOwnedCards.length.toString();
      document.getElementById('unlocksCompletedCount').textContent = userCompletedUnlocks.length.toString();
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// ========================================
// AVAILABILITY CHECKING
// ========================================
function checkAvailability(unlock) {
  const availability = unlock.availability;
  const now = new Date();
  
  switch (availability.type) {
    case 'always':
      return { available: true, reason: 'Available anytime' };
      
    case 'time':
      const currentHour = now.getHours();
      if (currentHour >= availability.startHour && currentHour < availability.endHour) {
        return { available: true, reason: `Available ${availability.startHour}:00 - ${availability.endHour}:00` };
      }
      return { 
        available: false, 
        reason: `Only available ${availability.startHour}:00 - ${availability.endHour}:00`,
        type: 'time-limited'
      };
      
    case 'day':
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = now.getDay();
      if (availability.days.includes(currentDay)) {
        return { available: true, reason: `Available on ${dayNames[currentDay]}` };
      }
      const availableDays = availability.days.map(d => dayNames[d]).join(', ');
      return { 
        available: false, 
        reason: `Only available on ${availableDays}`,
        type: 'day-limited'
      };
      
    case 'level':
      if (userLevel >= availability.minLevel) {
        return { available: true, reason: `Level ${availability.minLevel}+ required` };
      }
      return { 
        available: false, 
        reason: `Requires Level ${availability.minLevel}+`,
        type: 'level-locked'
      };
      
    default:
      return { available: true, reason: '' };
  }
}

function checkCardRequirements(unlock) {
  const results = [];
  
  for (const req of unlock.requirements.cards) {
    // Get card data from cards-data.js
    const cardData = getCardByNumber(req.cardNumber);
    const cardName = cardData?.name || 'Unknown Card';
    const cardEmoji = cardData?.emoji || '🎴';
    
    // Count how many of this card the user owns
    const ownedCount = userOwnedCards.filter(card => card.cardNumber === req.cardNumber).length;
    
    results.push({
      cardNumber: req.cardNumber,
      name: cardName,
      emoji: cardEmoji,
      quantity: req.quantity,
      owned: ownedCount,
      sufficient: ownedCount >= req.quantity
    });
  }
  
  return results;
}

function canUnlock(unlock) {
  // Check if already completed (and not repeatable)
  if (!unlock.repeatable && userCompletedUnlocks.includes(unlock.id)) {
    return { can: false, reason: 'Already claimed' };
  }
  
  // Check availability
  const availStatus = checkAvailability(unlock);
  if (!availStatus.available) {
    return { can: false, reason: availStatus.reason };
  }
  
  // Check card requirements
  const cardReqs = checkCardRequirements(unlock);
  const allCardsMet = cardReqs.every(r => r.sufficient);
  
  if (!allCardsMet) {
    return { can: false, reason: 'Missing required cards' };
  }
  
  return { can: true, reason: '' };
}

// ========================================
// RENDER UNLOCKS
// ========================================
function renderUnlocks() {
  const grid = document.getElementById('unlocksGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (!grid) return;
  
  // Filter unlocks based on current filter
  let filteredUnlocks = unlocksData;
  
  if (currentFilter !== 'all') {
    filteredUnlocks = unlocksData.filter(unlock => {
      const availStatus = checkAvailability(unlock);
      
      switch (currentFilter) {
        case 'available':
          return availStatus.available && canUnlock(unlock).can;
        case 'time-limited':
          return unlock.availability.type === 'time' || unlock.availability.type === 'day';
        case 'level-locked':
          return unlock.availability.type === 'level';
        default:
          return true;
      }
    });
  }
  
  if (filteredUnlocks.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  grid.innerHTML = filteredUnlocks.map(unlock => createUnlockCardHTML(unlock)).join('');
  
  // Add click listeners to unlock buttons
  grid.querySelectorAll('.unlock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const unlockId = btn.dataset.unlockId;
      openUnlockModal(unlockId);
    });
  });
}

function createUnlockCardHTML(unlock) {
  const availStatus = checkAvailability(unlock);
  const cardReqs = checkCardRequirements(unlock);
  const unlockStatus = canUnlock(unlock);
  const isCompleted = !unlock.repeatable && userCompletedUnlocks.includes(unlock.id);
  
  // Determine badge
  let badgeHTML = '';
  if (isCompleted) {
    badgeHTML = `<div class="availability-badge available"><span class="badge-icon">✓</span> Claimed</div>`;
  } else if (availStatus.available) {
    badgeHTML = `<div class="availability-badge available"><span class="badge-icon">✓</span> Available</div>`;
  } else {
    const badgeType = availStatus.type || 'locked';
    const badgeIcon = badgeType === 'time-limited' ? '⏰' : badgeType === 'day-limited' ? '📅' : '🔒';
    badgeHTML = `<div class="availability-badge ${badgeType}"><span class="badge-icon">${badgeIcon}</span> ${availStatus.reason}</div>`;
  }
  
  // Card requirements
  const cardsHTML = cardReqs.map(req => {
    const statusClass = req.sufficient ? 'owned' : 'not-owned';
    const indicator = req.sufficient ? '✓' : '✗';
    return `
      <div class="required-card-chip ${statusClass}">
        <span class="card-chip-emoji">${req.emoji}</span>
        <span class="card-chip-name">${req.name}</span>
        <span class="card-chip-count">×${req.quantity}</span>
        <span class="owned-indicator">${indicator} ${req.owned}/${req.quantity}</span>
      </div>
    `;
  }).join('');
  
  // Reward display
  let rewardHTML = '';
  if (unlock.reward.type === 'keys') {
    rewardHTML = `
      <div class="reward-preview">
        <img src="/bp/EE/assets/ouths/key.png" alt="Keys" class="key-icon-med">
        <span class="reward-amount">+${unlock.reward.amount}</span>
        <span class="reward-label">Keys</span>
      </div>
    `;
  } else if (unlock.reward.type === 'cash') {
    rewardHTML = `
      <div class="reward-preview cash-reward">
        <span class="cash-icon">💵</span>
        <span class="reward-amount">+$${unlock.reward.amount.toLocaleString()}</span>
        <span class="reward-label">Cash</span>
      </div>
    `;
  }
  
  // Button state
  const btnDisabled = !unlockStatus.can || isCompleted;
  const btnText = isCompleted ? 'Claimed' : (unlockStatus.can ? 'Unlock Reward' : unlockStatus.reason);
  const btnIcon = isCompleted ? '✓' : '🔓';
  
  return `
    <div class="unlock-card ${!availStatus.available || isCompleted ? 'locked' : ''}">
      ${badgeHTML}
      
      <div class="unlock-card-header">
        <span class="reward-icon-large">${unlock.icon}</span>
        <h3 class="reward-title">${unlock.name}</h3>
        <p class="reward-description">${unlock.description}</p>
      </div>
      
      <div class="unlock-card-body">
        <div class="requirements-section">
          <div class="requirements-label">
            <span>🎴</span> Required Cards
          </div>
          <div class="required-cards-list">
            ${cardsHTML}
          </div>
        </div>
        
        ${rewardHTML}
        
        ${!availStatus.available ? `
          <div class="availability-info">
            <span class="info-icon">ℹ️</span>
            ${availStatus.reason}
          </div>
        ` : ''}
      </div>
      
      <div class="unlock-card-footer">
        <button class="unlock-btn" data-unlock-id="${unlock.id}" ${btnDisabled ? 'disabled' : ''}>
          <span class="btn-icon">${btnIcon}</span>
          ${btnText}
        </button>
      </div>
    </div>
  `;
}

// ========================================
// UNLOCK MODAL
// ========================================
function openUnlockModal(unlockId) {
  selectedUnlock = unlocksData.find(u => u.id === unlockId);
  if (!selectedUnlock) return;
  
  const cardReqs = checkCardRequirements(selectedUnlock);
  
  // Update modal content
  document.getElementById('modalRewardIcon').textContent = selectedUnlock.icon;
  document.getElementById('modalRewardName').textContent = selectedUnlock.name;
  document.getElementById('modalRewardDescription').textContent = selectedUnlock.description;
  
  // Required cards
  const cardsContainer = document.getElementById('modalRequiredCards');
  cardsContainer.innerHTML = cardReqs.map(req => {
    const statusClass = req.sufficient ? 'owned' : 'not-owned';
    return `
      <div class="required-card-chip ${statusClass}">
        <span class="card-chip-emoji">${req.emoji}</span>
        <span class="card-chip-name">${req.name}</span>
        <span class="card-chip-count">×${req.quantity}</span>
        <span class="owned-indicator">${req.owned}/${req.quantity}</span>
      </div>
    `;
  }).join('');
  
  // Reward display in modal
  const keysRewardEl = document.getElementById('modalKeysReward');
  if (selectedUnlock.reward.type === 'keys') {
    keysRewardEl.textContent = `+${selectedUnlock.reward.amount}`;
  } else if (selectedUnlock.reward.type === 'cash') {
    keysRewardEl.textContent = `+$${selectedUnlock.reward.amount.toLocaleString()}`;
  }
  
  // Show modal
  document.getElementById('unlockModal').classList.add('active');
}

function closeUnlockModal() {
  document.getElementById('unlockModal').classList.remove('active');
  selectedUnlock = null;
}

// ========================================
// CONFIRM UNLOCK
// ========================================
async function confirmUnlock() {
  if (!selectedUnlock || !currentUser) return;
  
  const unlockStatus = canUnlock(selectedUnlock);
  if (!unlockStatus.can) {
    alert('Cannot complete this unlock: ' + unlockStatus.reason);
    return;
  }
  
  try {
    const userDocRef = doc(usersRef, currentUser.uid);
    
    // Remove required cards from user's collection
    let updatedCards = [...userOwnedCards];
    for (const req of selectedUnlock.requirements.cards) {
      let toRemove = req.quantity;
      updatedCards = updatedCards.filter(card => {
        if (card.cardNumber === req.cardNumber && toRemove > 0) {
          toRemove--;
          return false; // Remove this card
        }
        return true;
      });
    }
    
    // Add reward
    let newKeys = userKeys;
    let newBalance = userBalance;
    if (selectedUnlock.reward.type === 'keys') {
      newKeys += selectedUnlock.reward.amount;
    } else if (selectedUnlock.reward.type === 'cash') {
      newBalance += selectedUnlock.reward.amount;
    }
    
    // Update Firestore
    const updateData = {
      ownedCards: updatedCards,
      completedUnlocks: arrayUnion(selectedUnlock.id)
    };
    if (selectedUnlock.reward.type === 'keys') {
      updateData.keys = newKeys;
    } else if (selectedUnlock.reward.type === 'cash') {
      updateData.balance = newBalance;
    }
    await updateDoc(userDocRef, updateData);
    
    // Update local state
    userKeys = newKeys;
    userBalance = newBalance;
    userOwnedCards = updatedCards;
    userCompletedUnlocks.push(selectedUnlock.id);
    
    // Update UI
    document.getElementById('userKeys').innerHTML = `<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ${userKeys}`;
    document.getElementById('userBalance').textContent = `$${userBalance.toFixed(2)}`;
    document.getElementById('userCardsCount').textContent = userOwnedCards.length.toString();
    document.getElementById('unlocksCompletedCount').textContent = userCompletedUnlocks.length.toString();
    
    // Save reward info before closing modal (closeUnlockModal sets selectedUnlock to null)
    const rewardAmount = selectedUnlock.reward.amount;
    const rewardType = selectedUnlock.reward.type;
    
    // Close unlock modal and show success
    closeUnlockModal();
    showSuccessModal(rewardAmount, rewardType);
    
    // Re-render unlocks
    renderUnlocks();
    
  } catch (error) {
    console.error('Error completing unlock:', error);
    alert('Failed to complete unlock. Please try again.');
  }
}

// ========================================
// SUCCESS MODAL
// ========================================
function showSuccessModal(amount, rewardType = 'keys') {
  if (rewardType === 'cash') {
    document.getElementById('successMessage').textContent = `You received $${amount.toLocaleString()}!`;
    document.getElementById('keysEarned').textContent = `+$${amount.toLocaleString()}`;
  } else {
    document.getElementById('successMessage').textContent = `You received ${amount} keys!`;
    document.getElementById('keysEarned').textContent = `+${amount}`;
  }
  document.getElementById('successModal').classList.add('active');
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.remove('active');
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
  
  // Sign out
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
  
  // Sign in redirect
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
