// ========================================
// MULON LEADERBOARD
// ========================================

import { MulonData, Auth, UserData, db } from './data.js';
import { calculateLevel, createLevelBadgeHTML } from './level-utils.js';
import {
    doc,
    getDoc,
    getDocs,
    collection,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firestore references
const usersRef = collection(db, 'mulon_users');
const marketsRef = collection(db, 'mulon');
const ouUsersRef = collection(db, 'users');
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
    const user = Auth.getUser();
    const deviceFingerprint = generateDeviceFingerprint();
    
    // Check device ban first
    const deviceDoc = await getDoc(doc(bannedDevicesRef, deviceFingerprint));
    if (deviceDoc.exists()) {
      console.log('Device is banned, redirecting...');
      window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
      return true;
    }
    
    // If user is signed in, check email ban and user ban
    if (user && !user.isGuest) {
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

// State
let currentFilter = 'profit';
let leaderboardData = [];
let currentUserId = null;
let allMarkets = {};

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Format number with commas (e.g., 1000 -> 1,000)
// Use shared FormatUtils if available, otherwise local implementation
function formatWithCommas(num) {
    if (window.FormatUtils?.formatWithCommas) return window.FormatUtils.formatWithCommas(num);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatCurrency(amount) {
    if (window.FormatUtils?.formatCurrency) return window.FormatUtils.formatCurrency(amount);
    const value = parseFloat(amount) || 0;
    const absValue = Math.abs(value);
    const [whole, decimal] = absValue.toFixed(2).split('.');
    const formatted = formatWithCommas(whole) + '.' + decimal;
    return value >= 0 ? `+$${formatted}` : `-$${formatted}`;
}

function formatBalance(amount) {
    if (window.FormatUtils?.formatBalance) return window.FormatUtils.formatBalance(amount);
    const value = parseFloat(amount) || 0;
    const [whole, decimal] = value.toFixed(2).split('.');
    return `$${formatWithCommas(whole)}.${decimal}`;
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ========================================
// DATA LOADING
// ========================================
async function loadMarkets() {
    try {
        const snapshot = await getDocs(marketsRef);
        snapshot.forEach(doc => {
            allMarkets[doc.id] = doc.data();
        });
    } catch (error) {
        console.error('Error loading markets:', error);
    }
}

async function calculatePortfolioValue(positions) {
    if (!positions || positions.length === 0) return 0;
    
    let totalValue = 0;
    
    for (const position of positions) {
        const market = allMarkets[position.marketId];
        if (!market) continue;
        
        const currentPrice = position.choice === 'yes' 
            ? (market.yesPrice || 50) / 100 
            : (market.noPrice || 50) / 100;
        
        totalValue += position.shares * currentPrice;
    }
    
    return totalValue;
}

async function calculateProfit(userData) {
    // Profit = Current Balance + Portfolio Value - Starting Balance (500)
    const startingBalance = 500;
    const currentBalance = userData.balance || 500;
    const portfolioValue = await calculatePortfolioValue(userData.positions || []);
    
    // Also add realized gains from cashouts
    const cashOuts = userData.cashOuts || [];
    let realizedGains = 0;
    cashOuts.forEach(cashout => {
        if (cashout.result === 'won') {
            realizedGains += (cashout.payout || 0) - (cashout.costBasis || 0);
        } else if (cashout.result === 'lost') {
            realizedGains -= (cashout.costBasis || 0);
        }
    });
    
    return (currentBalance + portfolioValue) - startingBalance;
}

async function loadLeaderboardData() {
    showLoading(true);
    
    try {
        // Load markets and users in parallel
        const [, usersSnapshot, ouUsersSnapshot] = await Promise.all([
            loadMarkets(),
            getDocs(usersRef),
            getDocs(ouUsersRef) // Fetch all OU users at once instead of per-user queries
        ]);
        
        // Build a map of email -> OU user data for fast lookup
        const ouUsersByEmail = new Map();
        ouUsersSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.email) {
                ouUsersByEmail.set(data.email, data);
            }
        });
        
        // Process all users in parallel (skip banned users)
        const userPromises = usersSnapshot.docs
            .filter(docSnap => {
                const userData = docSnap.data();
                return userData.banned !== true; // Skip banned users
            })
            .map(async (docSnap) => {
            const userData = docSnap.data();
            
            // Calculate portfolio value and profit (these are sync now that markets are loaded)
            const portfolioValue = calculatePortfolioValueSync(userData.positions || []);
            const profit = calculateProfitSync(userData, portfolioValue);
            
            // Get Over Under username and leaderStyle from pre-fetched map
            let displayName = userData.displayName || 'Anonymous';
            let leaderStyle = '';
            
            if (userData.email && ouUsersByEmail.has(userData.email)) {
                const ouUserData = ouUsersByEmail.get(userData.email);
                if (ouUserData.username) {
                    displayName = ouUserData.username;
                }
                if (ouUserData.leaderStyle && ouUserData.leaderStyle.trim() !== '') {
                    leaderStyle = ouUserData.leaderStyle;
                }
            }
            
            // Ensure numeric values are actually numbers
            const safeBalance = (typeof userData.balance === 'number' && !isNaN(userData.balance)) ? userData.balance : 500;
            const safePortfolioValue = (typeof portfolioValue === 'number' && !isNaN(portfolioValue)) ? portfolioValue : 0;
            const safeProfit = (typeof profit === 'number' && !isNaN(profit)) ? profit : 0;
            const safeXps = (typeof userData.xps === 'number' && !isNaN(userData.xps)) ? userData.xps : 0;
            
            return {
                id: docSnap.id,
                displayName: displayName,
                photoURL: userData.photoURL || null,
                avatarStyle: userData.avatarStyle || 'default',
                balance: safeBalance,
                portfolioValue: safePortfolioValue,
                profit: safeProfit,
                positionsCount: (userData.positions || []).length,
                createdAt: userData.createdAt,
                leaderStyle: leaderStyle,
                xps: safeXps
            };
        });
        
        leaderboardData = await Promise.all(userPromises);
        renderLeaderboard();
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showEmpty();
    } finally {
        showLoading(false);
    }
}

// Synchronous version - markets must be loaded first
function calculatePortfolioValueSync(positions) {
    if (!positions || positions.length === 0) return 0;
    
    let totalValue = 0;
    
    for (const position of positions) {
        const market = allMarkets[position.marketId];
        if (!market) continue;
        
        const currentPrice = position.choice === 'yes' 
            ? (market.yesPrice || 50) / 100 
            : (market.noPrice || 50) / 100;
        
        totalValue += position.shares * currentPrice;
    }
    
    return totalValue;
}

// Synchronous version
function calculateProfitSync(userData, portfolioValue) {
    const startingBalance = 500;
    const currentBalance = userData.balance || 500;
    
    // Add realized gains from cashouts
    const cashOuts = userData.cashOuts || [];
    let realizedGains = 0;
    for (const cashout of cashOuts) {
        if (cashout.result === 'won') {
            realizedGains += (cashout.payout || 0) - (cashout.costBasis || 0);
        } else if (cashout.result === 'lost') {
            realizedGains -= (cashout.costBasis || 0);
        }
    }
    
    return (currentBalance + portfolioValue) - startingBalance;
}

// ========================================
// RENDERING
// ========================================
// Helper to safely get numeric value (returns 0 for non-numbers/strings)
function safeNumber(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof val === 'number' && !isNaN(val)) return val;
    return 0;
}

function getSortedData() {
    const sorted = [...leaderboardData].sort((a, b) => {
        switch (currentFilter) {
            case 'profit':
                return safeNumber(b.profit) - safeNumber(a.profit);
            case 'balance':
                return safeNumber(b.balance) - safeNumber(a.balance);
            case 'portfolio':
                return safeNumber(b.portfolioValue) - safeNumber(a.portfolioValue);
            default:
                return safeNumber(b.profit) - safeNumber(a.profit);
        }
    });
    return sorted;
}

function renderTable(sortedData) {
    const rowsEl = document.getElementById('leaderboardRows');
    const tableEl = document.getElementById('leaderboardTable');
    
    if (sortedData.length === 0) {
        tableEl.style.display = 'none';
        return;
    }
    
    tableEl.style.display = 'block';
    
    // Update header active states
    document.querySelectorAll('.table-header-cell.sortable').forEach(cell => {
        cell.classList.remove('active');
        if (cell.dataset.sort === currentFilter) {
            cell.classList.add('active');
        }
    });
    
    const getRankEmoji = (rank) => {
        switch(rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return rank;
        }
    };
    
    const getRankClass = (rank) => {
        switch(rank) {
            case 1: return 'rank-1';
            case 2: return 'rank-2';
            case 3: return 'rank-3';
            default: return '';
        }
    };
    
    const getRankBadgeClass = (rank) => {
        switch(rank) {
            case 1: return 'gold';
            case 2: return 'silver';
            case 3: return 'bronze';
            default: return '';
        }
    };
    
    const getAvatarGradient = (style) => {
        const gradients = {
            'gradient1': 'linear-gradient(135deg, #667eea, #764ba2)',
            'gradient2': 'linear-gradient(135deg, #11998e, #38ef7d)',
            'gradient3': 'linear-gradient(135deg, #fc4a1a, #f7b733)',
            'gradient4': 'linear-gradient(135deg, #141e30, #243b55)',
            'gradient5': 'linear-gradient(135deg, #ff9a9e, #fecfef)',
            'gradient6': 'linear-gradient(135deg, #00c853, #00e676)',
            'gradient7': 'linear-gradient(135deg, #232526, #414345)'
        };
        return gradients[style] || '';
    };
    
    rowsEl.innerHTML = sortedData.map((user, index) => {
        const rank = index + 1;
        const isCurrentUser = user.id === currentUserId;
        const rankClass = getRankClass(rank);
        const rankBadgeClass = getRankBadgeClass(rank);
        
        // Get leaderStyle classes if user has them from Over Under
        const leaderStyleClasses = user.leaderStyle ? user.leaderStyle.split(' ').filter(s => s.trim() !== '').join(' ') : '';
        
        // Calculate user level from XP
        const levelData = calculateLevel(user.xps || 0);
        const levelBadgeHTML = createLevelBadgeHTML(levelData.level, 'small');
        
        // Handle avatar with gradient support
        let avatarContent;
        let avatarStyle = '';
        if (user.avatarStyle && user.avatarStyle.startsWith('gradient')) {
            avatarStyle = `style="background: ${getAvatarGradient(user.avatarStyle)};"`;
            avatarContent = `<span class="user-cell-avatar-initials">${getInitials(user.displayName)}</span>`;
        } else if (user.photoURL) {
            avatarContent = `<img src="${user.photoURL}" alt="${user.displayName}">`;
        } else {
            avatarContent = `<span class="user-cell-avatar-initials">${getInitials(user.displayName)}</span>`;
        }
        
        const profitClass = user.profit >= 0 ? 'positive' : 'negative';
        const mainStatClass = currentFilter === 'profit' ? 'main-stat ' + profitClass : 'main-stat neutral';
        
        const rankDisplay = rank <= 3 ? getRankEmoji(rank) : rank;
        
        return `
            <div class="leaderboard-row ${rankClass} ${leaderStyleClasses} ${isCurrentUser ? 'current-user' : ''}" onclick="window.location.href='profile.html?id=${user.id}'" style="cursor: pointer;">
                <div class="rank-cell">
                    <span class="rank-badge ${rankBadgeClass}">${rankDisplay}</span>
                </div>
                <div class="user-cell">
                    <div class="user-cell-avatar" ${avatarStyle}>
                        ${avatarContent}
                        ${levelBadgeHTML}
                    </div>
                    <div class="user-cell-info">
                        <div class="user-cell-name">${user.displayName}</div>
                    </div>
                </div>
                <div class="stat-cell ${currentFilter === 'profit' ? mainStatClass : profitClass}">
                    ${formatCurrency(user.profit)}
                </div>
                <div class="stat-cell ${currentFilter === 'balance' ? 'main-stat neutral' : 'neutral'}">
                    ${formatBalance(user.balance)}
                </div>
                <div class="stat-cell ${currentFilter === 'portfolio' ? 'main-stat neutral' : 'neutral'}">
                    ${formatBalance(user.portfolioValue)}
                </div>
                <div class="view-profile-cell">
                    <span class="view-profile-btn">View →</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderLeaderboard() {
    const sortedData = getSortedData();
    
    if (sortedData.length === 0) {
        showEmpty();
        return;
    }
    
    document.getElementById('emptyState').style.display = 'none';
    renderTable(sortedData);
}

function showLoading(show) {
    document.getElementById('loadingState').style.display = show ? 'flex' : 'none';
    document.getElementById('leaderboardTable').style.display = show ? 'none' : 'block';
}

function showEmpty() {
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('leaderboardTable').style.display = 'none';
}

// ========================================
// EVENT HANDLERS
// ========================================
function setupFilterTabs() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderLeaderboard();
        });
    });
}

function setupSortableHeaders() {
    document.querySelectorAll('.table-header-cell.sortable').forEach(cell => {
        cell.addEventListener('click', () => {
            const filter = cell.dataset.sort;
            if (filter) {
                currentFilter = filter;
                document.querySelectorAll('.filter-tab').forEach(t => {
                    t.classList.toggle('active', t.dataset.filter === filter);
                });
                renderLeaderboard();
            }
        });
    });
}

// ========================================
// AUTH UI
// ========================================
function setupAuth() {
    const userMenu = document.getElementById('userMenu');
    const userDropdown = document.getElementById('userDropdown');
    const userAvatar = document.getElementById('userAvatar');
    const userInitials = document.getElementById('userInitials');
    const userPhoto = document.getElementById('userPhoto');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const signOutBtn = document.getElementById('signOutBtn');
    const headerSignInBtn = document.getElementById('headerSignInBtn');
    const userBalance = document.getElementById('userBalance');
    const portfolioValue = document.getElementById('portfolioValue');
    const userKeys = document.getElementById('userKeys');
    
    // Setup keys tooltip
    setupKeysTooltip();
    
    // Toggle dropdown
    if (userAvatar) {
        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            if (userDropdown) userDropdown.classList.toggle('active');
        });
    }
    
    document.addEventListener('click', () => {
        if (userDropdown) userDropdown.classList.remove('active');
    });
    
    // Sign in using Auth from data.js
    if (headerSignInBtn) {
        headerSignInBtn.addEventListener('click', async () => {
            const result = await Auth.signInWithGoogle();
            if (!result.success) {
                console.error('Sign in error:', result.error);
            }
        });
    }
    
    // Sign out using Auth from data.js
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            await Auth.signOut();
        });
    }
    
    // Auth state listener using Auth from data.js
    Auth.onAuthStateChange(async (user) => {
        await updateAuthUI(user, {
            userInitials, userPhoto, userName, userEmail,
            signOutBtn, headerSignInBtn, userBalance, portfolioValue, userKeys
        });
    });
}

// Update auth UI based on user state
async function updateAuthUI(user, elements) {
    const { userInitials, userPhoto, userName, userEmail, signOutBtn, headerSignInBtn, userBalance, portfolioValue, userKeys } = elements;
    
    if (user && !user.isGuest) {
        currentUserId = user.uid;
        
        // Update avatar
        if (userPhoto) {
            userPhoto.src = user.photoURL || '';
            userPhoto.style.display = user.photoURL ? 'block' : 'none';
        }
        if (userInitials) {
            userInitials.style.display = user.photoURL ? 'none' : 'block';
            userInitials.textContent = getInitials(user.displayName);
        }
        
        // Update user info
        if (userName) userName.textContent = user.displayName || 'User';
        if (userEmail) userEmail.textContent = user.email || '';
        if (signOutBtn) signOutBtn.style.display = 'flex';
        if (headerSignInBtn) headerSignInBtn.style.display = 'none';
        
        // Load user data for balance display
        try {
            const balance = UserData.getBalance();
            const keys = UserData.getKeys();
            
            if (userBalance) userBalance.textContent = formatBalance(balance);
            if (userKeys) {
                userKeys.innerHTML = '<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ' + keys;
            }
            
            // Get portfolio value
            const userDoc = await getDoc(doc(usersRef, user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const pv = await calculatePortfolioValue(userData.positions || []);
                if (portfolioValue) portfolioValue.textContent = formatBalance(pv);
            } else {
                if (portfolioValue) portfolioValue.textContent = formatBalance(0);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
        
        // Re-render to highlight current user
        renderLeaderboard();
        
    } else {
        currentUserId = null;
        if (userInitials) {
            userInitials.style.display = 'block';
            userInitials.textContent = '?';
        }
        if (userPhoto) userPhoto.style.display = 'none';
        if (userName) userName.textContent = 'Guest';
        if (userEmail) userEmail.textContent = 'Not signed in';
        if (signOutBtn) signOutBtn.style.display = 'none';
        if (headerSignInBtn) headerSignInBtn.style.display = 'flex';
        if (userBalance) userBalance.textContent = '--';
        if (portfolioValue) portfolioValue.textContent = '--';
        if (userKeys) {
            userKeys.innerHTML = '<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> --';
        }
        
        renderLeaderboard();
    }
}

// Keys tooltip setup
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
// SEARCH
// ========================================
function setupSearch() {
    const searchInput = document.querySelector('.search-box input');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            renderLeaderboard();
            return;
        }
        
        const filtered = leaderboardData.filter(user => 
            user.displayName.toLowerCase().includes(query)
        );
        
        // Temporarily replace data for rendering
        const originalData = leaderboardData;
        leaderboardData = filtered;
        renderLeaderboard();
        leaderboardData = originalData;
    });
}

// ========================================
// INIT
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Auth first
    Auth.init();
    
    // Initialize MulonData
    await MulonData.init();
    
    // Check ban status on page load
    if (typeof window.checkBanStatus === 'function') {
      const isBanned = await window.checkBanStatus();
      if (isBanned) return; // Stop if banned
    }
    
    setupFilterTabs();
    setupSortableHeaders();
    setupAuth();
    setupSearch();
    loadLeaderboardData();
});
