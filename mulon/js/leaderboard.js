// ========================================
// MULON LEADERBOARD
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
    getAuth,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { calculateLevel, createLevelBadgeHTML } from './level-utils.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAGcg43F94bWqUuyLH-AjghrAfduEVQ8ZM",
    authDomain: "overunder-ths.firebaseapp.com",
    projectId: "overunder-ths",
    storageBucket: "overunder-ths.firebasestorage.app",
    messagingSenderId: "690530120785",
    appId: "1:690530120785:web:36dc297cb517ac76cb7470",
    measurementId: "G-Q30T39R8VY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Firestore references
const usersRef = collection(db, 'mulon_users');
const marketsRef = collection(db, 'mulon');
const ouUsersRef = collection(db, 'users'); // Over Under users collection

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
        // First load all markets
        await loadMarkets();
        
        // Then load all users
        const snapshot = await getDocs(usersRef);
        const users = [];
        
        for (const docSnap of snapshot.docs) {
            const userData = docSnap.data();
            const portfolioValue = await calculatePortfolioValue(userData.positions || []);
            const profit = await calculateProfit(userData);
            
            // Try to get Over Under username and leaderStyle by email
            let displayName = userData.displayName || 'Anonymous';
            let leaderStyle = '';
            
            // XP is stored directly in mulon_users
            const xps = userData.xps || 0;
            
            if (userData.email) {
                try {
                    const ouQuery = query(ouUsersRef, where('email', '==', userData.email));
                    const ouSnapshot = await getDocs(ouQuery);
                    if (!ouSnapshot.empty) {
                        const ouUserData = ouSnapshot.docs[0].data();
                        if (ouUserData.username) {
                            displayName = ouUserData.username;
                        }
                        if (ouUserData.leaderStyle && ouUserData.leaderStyle.trim() !== '') {
                            leaderStyle = ouUserData.leaderStyle;
                        }
                    }
                } catch (e) {
                    // Silently fail, use default displayName
                }
            }
            
            users.push({
                id: docSnap.id,
                displayName: displayName,
                photoURL: userData.photoURL || null,
                avatarStyle: userData.avatarStyle || 'default',
                balance: userData.balance || 500,
                portfolioValue: portfolioValue,
                profit: profit,
                positionsCount: (userData.positions || []).length,
                createdAt: userData.createdAt,
                leaderStyle: leaderStyle,
                xps: xps
            });
        }
        
        leaderboardData = users;
        renderLeaderboard();
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showEmpty();
    } finally {
        showLoading(false);
    }
}

// ========================================
// RENDERING
// ========================================
function getSortedData() {
    const sorted = [...leaderboardData].sort((a, b) => {
        switch (currentFilter) {
            case 'profit':
                return b.profit - a.profit;
            case 'balance':
                return b.balance - a.balance;
            case 'portfolio':
                return b.portfolioValue - a.portfolioValue;
            default:
                return b.profit - a.profit;
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
            <div class="leaderboard-row ${rankClass} ${leaderStyleClasses} ${isCurrentUser ? 'current-user' : ''}">
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
    userAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
    });
    
    document.addEventListener('click', () => {
        userDropdown.classList.remove('active');
    });
    
    // Sign in
    headerSignInBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('Sign in error:', error);
        }
    });
    
    // Sign out
    signOutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Sign out error:', error);
        }
    });
    
    // Auth state listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            userInitials.style.display = 'none';
            userPhoto.style.display = 'block';
            userPhoto.src = user.photoURL || '';
            userName.textContent = user.displayName || 'User';
            userEmail.textContent = user.email || '';
            signOutBtn.style.display = 'flex';
            headerSignInBtn.style.display = 'none';
            
            if (!user.photoURL) {
                userInitials.style.display = 'block';
                userPhoto.style.display = 'none';
                userInitials.textContent = getInitials(user.displayName);
            }
            
            // Load user data for balance display
            try {
                const userDoc = await getDoc(doc(usersRef, user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    userBalance.textContent = formatBalance(userData.balance || 500);
                    const pv = await calculatePortfolioValue(userData.positions || []);
                    portfolioValue.textContent = formatBalance(pv);
                    // Update keys display
                    const keys = userData.keys !== undefined ? userData.keys : 15;
                    if (userKeys) {
                        userKeys.innerHTML = '<img src=\"/bp/EE/assets/ouths/key.png\" alt=\"\" class=\"key-icon\"> ' + keys;
                    }
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
            
            // Re-render to highlight current user
            renderLeaderboard();
            
        } else {
            currentUserId = null;
            userInitials.style.display = 'block';
            userPhoto.style.display = 'none';
            userInitials.textContent = '?';
            userName.textContent = 'Guest';
            userEmail.textContent = 'Not signed in';
            signOutBtn.style.display = 'none';
            headerSignInBtn.style.display = 'flex';
            userBalance.textContent = '$500.00';
            portfolioValue.textContent = '$0.00';
            if (userKeys) {
                userKeys.innerHTML = '<img src=\"/bp/EE/assets/ouths/key.png\" alt=\"\" class=\"key-icon\"> 15';
            }
            
            renderLeaderboard();
        }
    });
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
document.addEventListener('DOMContentLoaded', () => {
    setupFilterTabs();
    setupSortableHeaders();
    setupAuth();
    setupSearch();
    loadLeaderboardData();
});
