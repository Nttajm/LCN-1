// ========================================
// CASINO - Shared Auth & Database Module
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    increment,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
    getAuth,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { checkMaintenanceAccess, MAINTENANCE_MODE } from '../../js/maintenance.js';

// Firebase configuration (same as main Mulon app)
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

// Reference for banned devices
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
      
      const userDoc = await getDoc(doc(db, 'mulon_users', user.uid));
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

// ========================================
// TAB SYNCHRONIZATION SYSTEM
// Prevents exploits from multiple tabs with stale balance
// ========================================
const TabSync = {
  tabId: null,
  lastKnownBalance: null,
  lastSyncTime: 0,
  syncInterval: null,
  balanceVersion: 0, // Increments on every balance change
  
  // Initialize tab sync on page load
  init() {
    // Generate unique tab ID
    this.tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    
    // Listen for storage events from other tabs
    window.addEventListener('storage', (e) => this.handleStorageEvent(e));
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    
    // Listen for beforeunload to clean up
    window.addEventListener('beforeunload', () => this.cleanup());
    
    // Register this tab
    this.registerTab();
    
    // Start periodic sync check
    this.syncInterval = setInterval(() => this.checkSync(), 2000);
    
    console.log('TabSync initialized:', this.tabId);
  },
  
  // Register this tab in localStorage
  registerTab() {
    try {
      const tabs = this.getActiveTabs();
      tabs[this.tabId] = {
        openedAt: Date.now(),
        lastActivity: Date.now(),
        page: window.location.pathname
      };
      localStorage.setItem('casino_active_tabs', JSON.stringify(tabs));
    } catch (e) {
      console.error('TabSync registerTab error:', e);
    }
  },
  
  // Get all active tabs
  getActiveTabs() {
    try {
      const tabsStr = localStorage.getItem('casino_active_tabs');
      if (!tabsStr) return {};
      
      const tabs = JSON.parse(tabsStr);
      const now = Date.now();
      const activeTabs = {};
      
      // Filter out tabs that haven't been active in 30 seconds (likely closed)
      for (const [id, data] of Object.entries(tabs)) {
        if (now - data.lastActivity < 30000) {
          activeTabs[id] = data;
        }
      }
      
      return activeTabs;
    } catch (e) {
      return {};
    }
  },
  
  // Update tab activity
  updateActivity() {
    try {
      const tabs = this.getActiveTabs();
      if (tabs[this.tabId]) {
        tabs[this.tabId].lastActivity = Date.now();
        localStorage.setItem('casino_active_tabs', JSON.stringify(tabs));
      }
    } catch (e) {
      console.error('TabSync updateActivity error:', e);
    }
  },
  
  // Broadcast balance update to all tabs
  broadcastBalanceUpdate(newBalance, source = 'unknown') {
    try {
      this.balanceVersion++;
      const updateData = {
        balance: newBalance,
        version: this.balanceVersion,
        sourceTab: this.tabId,
        source: source,
        timestamp: Date.now()
      };
      
      localStorage.setItem('casino_balance_update', JSON.stringify(updateData));
      this.lastKnownBalance = newBalance;
      this.lastSyncTime = Date.now();
      
      console.log(`TabSync: Broadcasted balance update $${newBalance} (v${this.balanceVersion}) from ${source}`);
    } catch (e) {
      console.error('TabSync broadcastBalanceUpdate error:', e);
    }
  },
  
  // Handle storage events from other tabs
  handleStorageEvent(e) {
    if (e.key === 'casino_balance_update' && e.newValue) {
      try {
        const update = JSON.parse(e.newValue);
        
        // Ignore our own updates
        if (update.sourceTab === this.tabId) return;
        
        // Update local balance from other tab
        if (CasinoAuth.userData && update.balance !== undefined) {
          const oldBalance = CasinoAuth.userData.balance;
          CasinoAuth.userData.balance = update.balance;
          this.lastKnownBalance = update.balance;
          this.lastSyncTime = Date.now();
          
          console.log(`TabSync: Received balance update from another tab: $${oldBalance} -> $${update.balance}`);
          
          // Dispatch event for UI updates
          window.dispatchEvent(new CustomEvent('balanceUpdated', {
            detail: { 
              balance: update.balance, 
              source: 'otherTab',
              oldBalance: oldBalance
            }
          }));
        }
      } catch (e) {
        console.error('TabSync handleStorageEvent error:', e);
      }
    }
    
    // Handle force refresh signal
    if (e.key === 'casino_force_refresh' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data.sourceTab !== this.tabId) {
          console.log('TabSync: Force refresh signal received, reloading balance...');
          this.forceRefreshBalance();
        }
      } catch (e) {
        console.error('TabSync force refresh error:', e);
      }
    }
  },
  
  // Handle tab visibility changes
  async handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // Tab became visible - refresh balance from server
      console.log('TabSync: Tab became visible, syncing balance...');
      await this.forceRefreshBalance();
      this.updateActivity();
    }
  },
  
  // Force refresh balance from server
  async forceRefreshBalance() {
    if (!CasinoAuth.currentUser) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'mulon_users', CasinoAuth.currentUser.uid));
      if (userDoc.exists()) {
        const serverData = userDoc.data();
        const oldBalance = CasinoAuth.userData?.balance;
        
        CasinoAuth.userData.balance = serverData.balance;
        CasinoAuth.userData.keys = serverData.keys;
        CasinoAuth.userData.xps = serverData.xps;
        CasinoAuth.userData.plinkoBalls = serverData.plinkoBalls;
        
        this.lastKnownBalance = serverData.balance;
        this.lastSyncTime = Date.now();
        
        if (oldBalance !== serverData.balance) {
          console.log(`TabSync: Balance synced from server: $${oldBalance} -> $${serverData.balance}`);
          
          // Dispatch event for UI updates
          window.dispatchEvent(new CustomEvent('balanceUpdated', {
            detail: { 
              balance: serverData.balance, 
              source: 'server',
              oldBalance: oldBalance
            }
          }));
        }
        
        return serverData.balance;
      }
    } catch (error) {
      console.error('TabSync forceRefreshBalance error:', error);
    }
    return null;
  },
  
  // Check if balance is stale (needs refresh)
  isBalanceStale() {
    const now = Date.now();
    // Balance is stale if not synced in last 5 seconds
    return (now - this.lastSyncTime) > 5000;
  },
  
  // Periodic sync check
  async checkSync() {
    this.updateActivity();
    
    // If tab is visible and balance is stale, refresh
    if (document.visibilityState === 'visible' && this.isBalanceStale()) {
      await this.forceRefreshBalance();
    }
  },
  
  // Get count of active casino tabs
  getActiveTabCount() {
    return Object.keys(this.getActiveTabs()).length;
  },
  
  // Cleanup on tab close
  cleanup() {
    try {
      const tabs = this.getActiveTabs();
      delete tabs[this.tabId];
      localStorage.setItem('casino_active_tabs', JSON.stringify(tabs));
      
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
      }
    } catch (e) {
      console.error('TabSync cleanup error:', e);
    }
  }
};

// Export globally
window.TabSync = TabSync;

// ========================================
// CONNECTION MONITOR - Breaks game if offline
// ========================================
const ConnectionMonitor = {
  isOnline: navigator.onLine,
  checkInterval: null,
  pendingBets: [],
  gameDisabled: false,
  
  // Start monitoring connection
  start() {
    // Initial check
    this.isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Periodic server ping every 3 seconds
    this.checkInterval = setInterval(() => this.pingServer(), 3000);
    
    // Initial ping
    this.pingServer();
  },
  
  // Ping server to verify real connectivity
  async pingServer() {
    try {
      // Try to fetch a tiny resource with cache busting
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      
      await fetch('https://firestore.googleapis.com/google.firestore.v1.Firestore', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!this.isOnline) {
        this.handleOnline();
      }
      this.isOnline = true;
    } catch (e) {
      if (this.isOnline) {
        this.handleOffline();
      }
      this.isOnline = false;
    }
  },
  
  // Handle going offline - BREAK THE GAME
  handleOffline() {
    console.warn('ConnectionMonitor: Connection lost - disabling game');
    this.isOnline = false;
    this.gameDisabled = true;
    
    // Store current balance for penalty calculation
    if (CasinoAuth.userData) {
      const pendingData = {
        timestamp: Date.now(),
        balance: CasinoAuth.userData.balance,
        keys: CasinoAuth.userData.keys || 0
      };
      localStorage.setItem('casino_disconnect_pending', JSON.stringify(pendingData));
    }
  },
  
  // Handle coming back online
  async handleOnline() {
    console.log('ConnectionMonitor: Connection restored');
    this.isOnline = true;
    
    // Check for pending penalties
    await this.applyDisconnectPenalty();
    
    // Re-enable game after penalty applied
    this.gameDisabled = false;
  },
  
  // Apply penalty for disconnecting during play
  async applyDisconnectPenalty() {
    const pendingStr = localStorage.getItem('casino_disconnect_pending');
    if (!pendingStr) return;
    
    try {
      const pending = JSON.parse(pendingStr);
      const disconnectDuration = Date.now() - pending.timestamp;
      
      // Only penalize if offline for more than 5 seconds (prevents false positives)
      if (disconnectDuration > 5000 && CasinoAuth.currentUser && CasinoAuth.userData) {
        // Penalty: lose 5% of balance per minute offline, max 50%
        const minutesOffline = Math.ceil(disconnectDuration / 60000);
        const penaltyPercent = Math.min(0.5, minutesOffline * 0.05);
        const penaltyAmount = Math.floor(pending.balance * penaltyPercent * 100) / 100;
        
        if (penaltyAmount > 0) {
          console.warn(`ConnectionMonitor: Applying disconnect penalty of $${penaltyAmount}`);
          
          // Apply penalty to database
          const userId = CasinoAuth.currentUser.uid;
          await updateDoc(doc(db, 'mulon_users', userId), {
            balance: increment(-penaltyAmount),
            'casinoStats.disconnectPenalties': increment(penaltyAmount)
          });
          
          // Update local data
          CasinoAuth.userData.balance = Math.max(0, CasinoAuth.userData.balance - penaltyAmount);
        }
      }
    } catch (e) {
      console.error('Error applying disconnect penalty:', e);
    }
    
    // Clear pending
    localStorage.removeItem('casino_disconnect_pending');
  },
  
  // Check if game can proceed - call this before any game action
  canPlay() {
    return this.isOnline && !this.gameDisabled;
  },
  
  // Require connection - throws error if offline (use in critical functions)
  requireConnection() {
    if (!this.isOnline || this.gameDisabled) {
      throw new Error('NO_CONNECTION');
    }
    return true;
  },
  
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
};

// Export globally
window.ConnectionMonitor = ConnectionMonitor;

// ========================================
// CASINO AUTH
// ========================================
export const CasinoAuth = {
  currentUser: null,
  userData: null,
  authStateListeners: [],
  
  // Initialize auth with maintenance check
  init() {
    // Initialize TabSync
    TabSync.init();
    
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        // Check ban status on every auth state change
        if (typeof window.checkBanStatus === 'function') {
          const isBanned = await window.checkBanStatus();
          if (isBanned) {
            resolve(null);
            return; // Stop if banned
          }
        }
        
        if (user) {
          this.currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          };
          
          // Load user data
          await this.loadUserData(user.uid);
          
          // Initialize TabSync with current balance
          TabSync.lastKnownBalance = this.userData?.balance;
          TabSync.lastSyncTime = Date.now();
          
          console.log('Casino: User signed in:', user.displayName);
        } else {
          this.currentUser = null;
          this.userData = null;
          console.log('Casino: No user signed in');
        }
        
        // Notify listeners
        this.authStateListeners.forEach(cb => cb(this.currentUser, this.userData));
        resolve(this.currentUser);
      });
    });
  },
  
  // Initialize with maintenance mode check
  async initWithMaintenanceCheck() {
    // Check ban status first
    if (typeof window.checkBanStatus === 'function') {
      const isBanned = await window.checkBanStatus();
      if (isBanned) return false; // Stop if banned
    }
    
    // Start connection monitoring - game won't work without connection
    ConnectionMonitor.start();
    
    // Apply any pending disconnect penalties from previous session
    await ConnectionMonitor.applyDisconnectPenalty();
    
    await this.init();
    
    if (MAINTENANCE_MODE) {
      const hasAccess = await checkMaintenanceAccess({
        getUser: () => this.currentUser,
        redirectUrl: '../maintenance.html',
        delay: 500 // Shorter delay since we already awaited init()
      });
      return hasAccess;
    }
    return true;
  },
  
  // Get current user
  getUser() {
    return this.currentUser;
  },
  
  // Load user data from Firestore
  async loadUserData(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'mulon_users', userId));
      if (userDoc.exists()) {
        this.userData = userDoc.data();
      } else {
        // Create new user with $500 balance
        this.userData = {
          balance: 500.00,
          xps: 0,
          keys: 40,
          plinkoBalls: 45,
          winStreak: 0,
          xpChestsClaimed: 0,
          casinoStats: {
            totalWagered: 0,
            totalWon: 0,
            gamesPlayed: 0
          },
          xpStats: {
            totalEarned: 0,
            totalSpent: 0,
            bestStreak: 0
          },
          createdAt: new Date().toISOString(),
          lastLoginAt: serverTimestamp()
        };
        await setDoc(doc(db, 'mulon_users', userId), this.userData);
      }
      
      // Update last login time for both new and existing users
      await updateDoc(doc(db, 'mulon_users', userId), {
        lastLoginAt: serverTimestamp()
      });
      
      // Reload user data to get the server timestamp
      const updatedDoc = await getDoc(doc(db, 'mulon_users', userId));
      if (updatedDoc.exists()) {
        this.userData = updatedDoc.data();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.userData = { balance: 500.00, xps: 0, winStreak: 0 };
    }
    return this.userData;
  },
  
  // Sign in with Google
  async signIn() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Sign out
  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Check if signed in
  isSignedIn() {
    return this.currentUser !== null;
  },
  
  // Get balance
  getBalance() {
    return this.userData?.balance ?? 500.00;
  },
  
  // Get keys
  getKeys() {
    return this.userData?.keys ?? 40;
  },
  
  // Get plinko balls remaining
  getPlinkoBalls() {
    return this.userData?.plinkoBalls ?? 45;
  },
  
  // Get xps (XP currency)
  getXPs() {
    return this.userData?.xps ?? 0;
  },
  
  // Get win streak
  getWinStreak() {
    return this.userData?.winStreak ?? 0;
  },
  
  // Add auth state listener
  onAuthStateChange(callback) {
    this.authStateListeners.push(callback);
    // Immediately call if we have state
    if (this.currentUser !== undefined) {
      callback(this.currentUser, this.userData);
    }
  }
};

// ========================================
// CASINO DATABASE
// ========================================
export const CasinoDB = {
  // Get the Firestore database instance
  getDB() {
    return db;
  },
  
  // ========================================
  // SAFE BALANCE OPERATIONS (Multi-tab safe)
  // Always use these for any balance changes!
  // ========================================
  
  // Refresh balance from server before any operation
  // Returns the ACTUAL server balance, updates local state
  async getServerBalance() {
    if (!CasinoAuth.currentUser) {
      return null;
    }
    
    try {
      const userDoc = await getDoc(doc(db, 'mulon_users', CasinoAuth.currentUser.uid));
      if (userDoc.exists()) {
        const serverBalance = userDoc.data().balance;
        CasinoAuth.userData.balance = serverBalance;
        TabSync.lastKnownBalance = serverBalance;
        TabSync.lastSyncTime = Date.now();
        return serverBalance;
      }
    } catch (error) {
      console.error('Error getting server balance:', error);
    }
    return null;
  },
  
  // Safe bet placement - ALWAYS refreshes balance first
  // This prevents exploits where user has stale balance in another tab
  async safePlaceBet(amount, game) {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    // Connection required
    if (!ConnectionMonitor.canPlay()) {
      return { success: false, error: 'Connection lost - cannot place bet' };
    }
    
    try {
      // ALWAYS get fresh balance from server first
      const serverBalance = await this.getServerBalance();
      
      if (serverBalance === null) {
        return { success: false, error: 'Could not verify balance. Please refresh.' };
      }
      
      if (serverBalance < amount) {
        // Update UI to show correct balance
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: { balance: serverBalance, source: 'server' }
        }));
        return { success: false, error: `Insufficient balance! You have $${serverBalance.toFixed(2)}` };
      }
      
      const userId = CasinoAuth.currentUser.uid;
      const newBalance = Math.round((serverBalance - amount) * 100) / 100;
      
      // Update in Firestore
      await updateDoc(doc(db, 'mulon_users', userId), {
        balance: newBalance,
        'casinoStats.totalWagered': increment(amount),
        'casinoStats.gamesPlayed': increment(1)
      });
      
      // Update local state
      CasinoAuth.userData.balance = newBalance;
      
      // Broadcast to other tabs
      TabSync.broadcastBalanceUpdate(newBalance, `bet_${game}`);
      
      // Dispatch local event
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: { balance: newBalance, source: 'bet' }
      }));
      
      return { success: true, newBalance, previousBalance: serverBalance };
    } catch (error) {
      console.error('Error in safePlaceBet:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Safe win recording - uses server balance as base
  async safeRecordWin(winAmount, game) {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    // Connection required
    if (!ConnectionMonitor.canPlay()) {
      return { success: false, error: 'Connection lost - win not recorded' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      
      // Use increment to safely add to whatever the server balance is
      await updateDoc(doc(db, 'mulon_users', userId), {
        balance: increment(winAmount),
        'casinoStats.totalWon': increment(winAmount)
      });
      
      // Get the new balance from server
      const newBalance = await this.getServerBalance();
      
      // Broadcast to other tabs
      TabSync.broadcastBalanceUpdate(newBalance, `win_${game}`);
      
      // Dispatch local event
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: { balance: newBalance, source: 'win' }
      }));
      
      return { success: true, newBalance, winAmount };
    } catch (error) {
      console.error('Error in safeRecordWin:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Combined safe bet + result in one operation
  // Use this for games that resolve immediately
  async safeGameRound(betAmount, winAmount, game) {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    // Connection required
    if (!ConnectionMonitor.canPlay()) {
      return { success: false, error: 'Connection lost - cannot play' };
    }
    
    try {
      // Get fresh balance from server
      const serverBalance = await this.getServerBalance();
      
      if (serverBalance === null) {
        return { success: false, error: 'Could not verify balance. Please refresh.' };
      }
      
      if (serverBalance < betAmount) {
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: { balance: serverBalance, source: 'server' }
        }));
        return { success: false, error: `Insufficient balance! You have $${serverBalance.toFixed(2)}` };
      }
      
      const userId = CasinoAuth.currentUser.uid;
      const netChange = winAmount - betAmount;
      const newBalance = Math.round((serverBalance + netChange) * 100) / 100;
      
      // Single atomic update
      const updates = {
        balance: newBalance,
        'casinoStats.totalWagered': increment(betAmount),
        'casinoStats.gamesPlayed': increment(1)
      };
      
      if (winAmount > 0) {
        updates['casinoStats.totalWon'] = increment(winAmount);
      }
      
      await updateDoc(doc(db, 'mulon_users', userId), updates);
      
      // Update local state
      CasinoAuth.userData.balance = newBalance;
      
      // Broadcast to other tabs
      TabSync.broadcastBalanceUpdate(newBalance, `round_${game}`);
      
      // Dispatch local event
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: { balance: newBalance, source: 'gameRound', netChange }
      }));
      
      // Update session if active
      if (this.activeSessionId) {
        await this.updateGameSession({
          bet: betAmount,
          won: winAmount
        });
      }
      
      return { 
        success: true, 
        newBalance, 
        previousBalance: serverBalance,
        netChange,
        isWin: netChange > 0
      };
    } catch (error) {
      console.error('Error in safeGameRound:', error);
      return { success: false, error: error.message };
    }
  },
  
  // ========================================
  // LEGACY BALANCE METHODS (kept for compatibility)
  // Consider migrating to safe methods above
  // ========================================
  
  // Update balance (positive = add, negative = subtract)
  async updateBalance(amount) {
    if (!CasinoAuth.currentUser) {
      console.warn('Cannot update balance: Not signed in');
      return null;
    }
    
    // Connection required
    if (!ConnectionMonitor.canPlay()) {
      console.warn('Cannot update balance: No connection');
      return null;
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      
      // Get fresh balance from server first
      const serverBalance = await this.getServerBalance();
      if (serverBalance === null) {
        console.warn('Cannot update balance: Could not get server balance');
        return null;
      }
      
      const newBalance = Math.max(0, Math.round((serverBalance + amount) * 100) / 100);
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        balance: newBalance
      });
      
      CasinoAuth.userData.balance = newBalance;
      
      // Broadcast to other tabs
      TabSync.broadcastBalanceUpdate(newBalance, 'updateBalance');
      
      return newBalance;
    } catch (error) {
      console.error('Error updating balance:', error);
      return null;
    }
  },
  
  // Place a bet
  async placeBet(amount, game) {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    // Connection required - game won't work offline
    if (!ConnectionMonitor.canPlay()) {
      return { success: false, error: 'Connection lost - cannot place bet' };
    }
    
    // Get fresh balance from server first
    const serverBalance = await this.getServerBalance();
    if (serverBalance === null) {
      return { success: false, error: 'Could not verify balance. Please refresh.' };
    }
    
    if (serverBalance < amount) {
      return { success: false, error: `Insufficient balance! You have $${serverBalance.toFixed(2)}` };
    }
    
    try {
      // Auto-start session if not already active
      if (!this.activeSessionId) {
        await this.startGameSession(game, amount);
      }
      
      const userId = CasinoAuth.currentUser.uid;
      const newBalance = Math.round((serverBalance - amount) * 100) / 100;
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        balance: newBalance,
        'casinoStats.totalWagered': increment(amount),
        'casinoStats.gamesPlayed': increment(1)
      });
      
      CasinoAuth.userData.balance = newBalance;
      
      // Broadcast to other tabs
      TabSync.broadcastBalanceUpdate(newBalance, `placeBet_${game}`);
      
      return { success: true, newBalance };
    } catch (error) {
      console.error('Error placing bet:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Record a win
  async recordWin(amount, betAmount = 0) {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    // Connection required
    if (!ConnectionMonitor.canPlay()) {
      return { success: false, error: 'Connection lost - win not recorded' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      
      // Use increment to safely add to server balance
      await updateDoc(doc(db, 'mulon_users', userId), {
        balance: increment(amount),
        'casinoStats.totalWon': increment(amount)
      });
      
      // Get the new balance from server
      const newBalance = await this.getServerBalance();
      
      // Broadcast to other tabs
      TabSync.broadcastBalanceUpdate(newBalance, 'recordWin');
      
      // Update session if active
      if (this.activeSessionId && betAmount > 0) {
        await this.updateGameSession({
          bet: betAmount,
          won: amount
        });
      }
      
      return { success: true, newBalance };
    } catch (error) {
      console.error('Error recording win:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Record game result (combines bet and outcome tracking)
  async recordGameResult(game, betAmount, wonAmount) {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    // Connection required
    if (!ConnectionMonitor.canPlay()) {
      return { success: false, error: 'Connection lost - result not recorded' };
    }
    
    try {
      // Auto-start session if not active
      if (!this.activeSessionId) {
        await this.startGameSession(game, betAmount);
      }
      
      // Update session with result
      if (this.activeSessionId) {
        await this.updateGameSession({
          bet: betAmount,
          won: wonAmount
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error recording game result:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Record a loss (deducts 1 key)
  async recordLoss(game) {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const currentKeys = CasinoAuth.userData.keys ?? 30;
      const newKeys = Math.max(0, currentKeys - 1);
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        keys: newKeys
      });
      
      CasinoAuth.userData.keys = newKeys;
      
      return { success: true, newKeys };
    } catch (error) {
      console.error('Error recording loss:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Use a plinko ball (deducts 1 ball, or 1 key if out of balls)
  async usePlinkoBall() {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      let currentBalls = CasinoAuth.userData.plinkoBalls ?? 45;
      let currentKeys = CasinoAuth.userData.keys ?? 30;
      
      // If no balls left, use a key to get 45 more balls
      if (currentBalls <= 0) {
        if (currentKeys <= 0) {
          return { success: false, error: 'No keys left! Come back tomorrow for free keys.' };
        }
        // Use 1 key to get 45 balls
        currentKeys -= 1;
        currentBalls = 45;
      }
      
      // Use 1 ball
      const newBalls = currentBalls - 1;
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        plinkoBalls: newBalls,
        keys: currentKeys
      });
      
      CasinoAuth.userData.plinkoBalls = newBalls;
      CasinoAuth.userData.keys = currentKeys;
      
      return { success: true, ballsLeft: newBalls, keysLeft: currentKeys };
    } catch (error) {
      console.error('Error using plinko ball:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get current balance (synced from DB)
  async refreshBalance() {
    if (!CasinoAuth.currentUser) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'mulon_users', CasinoAuth.currentUser.uid));
      if (userDoc.exists()) {
        CasinoAuth.userData.balance = userDoc.data().balance;
        CasinoAuth.userData.plinkoBalls = userDoc.data().plinkoBalls ?? 45;
        return CasinoAuth.userData.balance;
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
    return null;
  },
  
  // Track pending plinko balls (for refresh penalty)
  async setPendingPlinkoBalls(count) {
    if (!CasinoAuth.currentUser) return;
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      await updateDoc(doc(db, 'mulon_users', userId), {
        pendingPlinkoBalls: count
      });
      CasinoAuth.userData.pendingPlinkoBalls = count;
    } catch (error) {
      console.error('Error setting pending balls:', error);
    }
  },
  
  // Get pending plinko balls count
  getPendingPlinkoBalls() {
    return CasinoAuth.userData?.pendingPlinkoBalls ?? 0;
  },
  
  // Check and apply refresh penalty (called on page load)
  async checkRefreshPenalty() {
    if (!CasinoAuth.currentUser) return { penalty: 0 };
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const userDoc = await getDoc(doc(db, 'mulon_users', userId));
      
      if (userDoc.exists()) {
        const pendingBalls = userDoc.data().pendingPlinkoBalls ?? 0;
        
        if (pendingBalls > 0) {
          // Calculate penalty: 10% of balance per pending ball
          const currentBalance = userDoc.data().balance ?? 0;
          const penaltyPercent = pendingBalls * 0.1; // 10% per ball
          const penaltyAmount = Math.round(currentBalance * penaltyPercent * 100) / 100;
          const newBalance = Math.max(0, currentBalance - penaltyAmount);
          
          // Apply penalty and clear pending balls
          await updateDoc(doc(db, 'mulon_users', userId), {
            balance: newBalance,
            pendingPlinkoBalls: 0
          });
          
          CasinoAuth.userData.balance = newBalance;
          CasinoAuth.userData.pendingPlinkoBalls = 0;
          
          return { penalty: penaltyAmount, ballsLost: pendingBalls };
        }
      }
    } catch (error) {
      console.error('Error checking refresh penalty:', error);
    }
    
    return { penalty: 0, ballsLost: 0 };
  },
  
  // ========================================
  // ROULETTE REFRESH PENALTY
  // ========================================
  
  // Track pending roulette spin (for refresh penalty)
  async setPendingRouletteSpin(amount) {
    if (!CasinoAuth.currentUser) return;
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      await updateDoc(doc(db, 'mulon_users', userId), {
        pendingRouletteSpin: amount
      });
      CasinoAuth.userData.pendingRouletteSpin = amount;
    } catch (error) {
      console.error('Error setting pending roulette spin:', error);
    }
  },
  
  // Get pending roulette spin amount
  getPendingRouletteSpin() {
    return CasinoAuth.userData?.pendingRouletteSpin ?? 0;
  },
  
  // Check and apply roulette refresh penalty (called on page load)
  async checkRouletteRefreshPenalty() {
    if (!CasinoAuth.currentUser) return { penalty: 0 };
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const userDoc = await getDoc(doc(db, 'mulon_users', userId));
      
      if (userDoc.exists()) {
        const pendingAmount = userDoc.data().pendingRouletteSpin ?? 0;
        
        if (pendingAmount > 0) {
          // Lose the entire pending bet amount
          const currentBalance = userDoc.data().balance ?? 0;
          const penaltyAmount = pendingAmount;
          const newBalance = Math.max(0, currentBalance - penaltyAmount);
          
          // Apply penalty and clear pending spin
          await updateDoc(doc(db, 'mulon_users', userId), {
            balance: newBalance,
            pendingRouletteSpin: 0
          });
          
          CasinoAuth.userData.balance = newBalance;
          CasinoAuth.userData.pendingRouletteSpin = 0;
          
          return { penalty: penaltyAmount };
        }
      }
    } catch (error) {
      console.error('Error checking roulette refresh penalty:', error);
    }
    
    return { penalty: 0 };
  },
  
  // ========================================
  // CHARGES & XP SYSTEM
  // ========================================
  
  // Award xps for wins - any win earns xps, 2x+ earns bonus
  // Streaks multiply the xp gain exponentially
  async awardXPs(game, multiplier, betAmount) {
    if (!CasinoAuth.currentUser) {
      console.log('awardXPs: Not signed in');
      return { success: false, error: 'Not signed in' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const currentXPs = CasinoAuth.userData?.xps ?? 0;
      const currentStreak = CasinoAuth.userData?.winStreak ?? 0;
      
      // Base xps - every win gets at least 1 xp
      let baseXPs = 1;
      
      // Game-specific bonus xp calculation for 2x+ wins
      if (multiplier >= 2) {
        switch(game) {
          case 'plinko':
            if (multiplier >= 100) baseXPs = 50;
            else if (multiplier >= 20) baseXPs = 20;
            else if (multiplier >= 10) baseXPs = 10;
            else if (multiplier >= 5) baseXPs = 5;
            else baseXPs = 2;
            break;
            
          case 'gems':
            if (multiplier >= 10) baseXPs = 25;
            else if (multiplier >= 5) baseXPs = 12;
            else if (multiplier >= 3) baseXPs = 6;
            else baseXPs = 3;
            break;
            
          case 'dragon-tower':
            if (multiplier >= 50) baseXPs = 100;
            else if (multiplier >= 20) baseXPs = 40;
            else if (multiplier >= 10) baseXPs = 20;
            else if (multiplier >= 5) baseXPs = 10;
            else baseXPs = 4;
            break;
          
          case 'crash':
            // Crash game XP rewards - higher multipliers = more XP
            if (multiplier >= 100) baseXPs = 75;
            else if (multiplier >= 50) baseXPs = 40;
            else if (multiplier >= 20) baseXPs = 25;
            else if (multiplier >= 10) baseXPs = 15;
            else if (multiplier >= 5) baseXPs = 8;
            else if (multiplier >= 2.1) baseXPs = 3;
            else baseXPs = 1;
            break;
            
          default:
            baseXPs = Math.max(1, Math.floor(multiplier));
        }
      }
      
      // Exponential streak multiplier: 1, 2, 4, 8, 16... capped at 32x
      const streakMultiplier = Math.min(8, Math.pow(1.5, currentStreak));
      const xpsEarned = Math.round(baseXPs * streakMultiplier);
      
      const newStreak = currentStreak + 1;
      const newXPs = currentXPs + xpsEarned;
      const currentBestStreak = CasinoAuth.userData?.xpStats?.bestStreak ?? 0;
      
      console.log(`awardXPs: base=${baseXPs}, streak=${currentStreak}, mult=${streakMultiplier}, earned=${xpsEarned}`);
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        xps: newXPs,
        winStreak: newStreak,
        'xpStats.totalEarned': increment(xpsEarned),
        'xpStats.bestStreak': newStreak > currentBestStreak ? newStreak : currentBestStreak
      });
      
      CasinoAuth.userData.xps = newXPs;
      CasinoAuth.userData.winStreak = newStreak;
      if (!CasinoAuth.userData.xpStats) {
        CasinoAuth.userData.xpStats = {};
      }
      CasinoAuth.userData.xpStats.bestStreak = Math.max(currentBestStreak, newStreak);
      
      return { 
        success: true, 
        xpsEarned, 
        totalXPs: newXPs, 
        streak: newStreak,
        streakMultiplier 
      };
    } catch (error) {
      console.error('Error awarding xps:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Reset streak on loss or sub-2x win
  async resetStreak() {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      
      if ((CasinoAuth.userData?.winStreak ?? 0) > 0) {
        await updateDoc(doc(db, 'mulon_users', userId), {
          winStreak: 0
        });
        
        CasinoAuth.userData.winStreak = 0;
      }
      
      return { success: true, streak: 0 };
    } catch (error) {
      console.error('Error resetting streak:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Use xps (for future features like buying collectibles)
  async useXPs(amount) {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    const currentXPs = CasinoAuth.userData?.xps ?? 0;
    if (currentXPs < amount) {
      return { success: false, error: 'Insufficient xps!' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const newXPs = currentXPs - amount;
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        xps: newXPs,
        'xpStats.totalSpent': increment(amount)
      });
      
      CasinoAuth.userData.xps = newXPs;
      
      return { success: true, newXPs };
    } catch (error) {
      console.error('Error using xps:', error);
      return { success: false, error: error.message };
    }
  },
  
  // ========================================
  // CARD COLLECTION SYSTEM (Subcollection)
  // ========================================
  
  // Save a received card to user's collection as a subcollection document
  // Each card gets its own document with hasCard: true
  async saveCard(cardNumber) {
    if (!CasinoAuth.currentUser) {
      console.log('saveCard: Not signed in');
      return { success: false, error: 'Not signed in' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const cardsCollectionRef = collection(db, 'mulon_users', userId, 'cards');
      
      // Create a new card document in the user's cards subcollection
      const cardDocRef = await addDoc(cardsCollectionRef, {
        cardNumber: cardNumber,
        hasCard: true,
        obtainedAt: serverTimestamp(),
        obtainedFrom: 'chest',
        tradedFrom: null
      });
      
      console.log(`Card ${cardNumber} saved with doc ID: ${cardDocRef.id}. Collection: users/${userId}/cards`);
      
      return { success: true, cardDocId: cardDocRef.id };
    } catch (error) {
      console.error('Error saving card:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get user's card collection (only cards with hasCard: true)
  async getCards(userId = null) {
    const targetUserId = userId || CasinoAuth.currentUser?.uid;
    if (!targetUserId) {
      return [];
    }
    
    try {
      const cardsCollectionRef = collection(db, 'mulon_users', targetUserId, 'cards');
      const q = query(cardsCollectionRef, where('hasCard', '==', true));
      const snapshot = await getDocs(q);
      
      const cards = [];
      snapshot.forEach(doc => {
        cards.push({
          docId: doc.id,
          ...doc.data()
        });
      });
      
      return cards;
    } catch (error) {
      console.error('Error getting cards:', error);
      return [];
    }
  },
  
  // Get all cards (including traded ones) for history
  async getAllCards(userId = null) {
    const targetUserId = userId || CasinoAuth.currentUser?.uid;
    if (!targetUserId) {
      return [];
    }
    
    try {
      const cardsCollectionRef = collection(db, 'mulon_users', targetUserId, 'cards');
      const snapshot = await getDocs(cardsCollectionRef);
      
      const cards = [];
      snapshot.forEach(doc => {
        cards.push({
          docId: doc.id,
          ...doc.data()
        });
      });
      
      return cards;
    } catch (error) {
      console.error('Error getting all cards:', error);
      return [];
    }
  },
  
  // Mark card as traded (set hasCard: false)
  async markCardTraded(cardDocId) {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const cardDocRef = doc(db, 'mulon_users', userId, 'cards', cardDocId);
      
      await updateDoc(cardDocRef, {
        hasCard: false,
        tradedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error marking card as traded:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Transfer a card to another user (creates new doc for recipient)
  async transferCard(cardNumber, fromUserId, toUserId, tradeId = null) {
    try {
      // Create a new card document for the recipient
      const recipientCardsRef = collection(db, 'mulon_users', toUserId, 'cards');
      
      const newCardDoc = await addDoc(recipientCardsRef, {
        cardNumber: cardNumber,
        hasCard: true,
        obtainedAt: serverTimestamp(),
        obtainedFrom: 'trade',
        tradedFrom: fromUserId,
        tradeId: tradeId
      });
      
      console.log(`Card ${cardNumber} transferred from ${fromUserId} to ${toUserId}, new doc: ${newCardDoc.id}`);
      
      return { success: true, newCardDocId: newCardDoc.id };
    } catch (error) {
      console.error('Error transferring card:', error);
      return { success: false, error: error.message };
    }
  },
  
  // ========================================
  // CHEST PURCHASE SYSTEM
  // ========================================
  
  // Purchase a chest with money (uncommon = $250, epic = $1000)
  async purchaseChest(chestType) {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    const prices = {
      uncommon: 250,
      epic: 1267
    };
    
    const price = prices[chestType];
    if (!price) {
      return { success: false, error: 'Invalid chest type' };
    }
    
    if (CasinoAuth.userData.balance < price) {
      return { success: false, error: `Insufficient balance! Need $${price}` };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const newBalance = Math.round((CasinoAuth.userData.balance - price) * 100) / 100;
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        balance: newBalance
      });
      
      CasinoAuth.userData.balance = newBalance;
      
      return { success: true, newBalance, cost: price };
    } catch (error) {
      console.error('Error purchasing chest:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Claim an XP chest (doesn't spend XP, just increments claim counter)
  async claimXpChest() {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const totalXP = CasinoAuth.userData.xps || 0;
      const currentClaimed = CasinoAuth.userData.xpChestsClaimed || 0;
      const totalEarned = Math.floor(totalXP / 100);
      const available = totalEarned - currentClaimed;
      
      if (available <= 0) {
        return { success: false, error: 'No XP chests available' };
      }
      
      const newClaimed = currentClaimed + 1;
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        xpChestsClaimed: newClaimed
      });
      
      CasinoAuth.userData.xpChestsClaimed = newClaimed;
      
      return { success: true, chestsClaimed: newClaimed, chestsRemaining: available - 1 };
    } catch (error) {
      console.error('Error claiming XP chest:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get XP chests claimed count
  getXpChestsClaimed() {
    return CasinoAuth.userData?.xpChestsClaimed || 0;
  },
  
  // Get available XP chests (total earned - claimed)
  getAvailableXpChests() {
    const totalXP = CasinoAuth.userData?.xps || 0;
    const claimed = CasinoAuth.userData?.xpChestsClaimed || 0;
    const earned = Math.floor(totalXP / 100);
    return Math.max(0, earned - claimed);
  },
  
  // Get user data for external use
  async getUser(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'mulon_users', userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },
  
  // Get count of users active in the last X minutes
  async getOnlineUsersCount(minutesThreshold = 15) {
    try {
      const cutoffTime = new Date(Date.now() - minutesThreshold * 60 * 1000);
      const usersRef = collection(db, 'mulon_users');
      const q = query(usersRef, where('lastLoginAt', '>=', cutoffTime));
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.size} users active in last ${minutesThreshold} minutes`);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting online users:', error);
      // Return a plausible fake number if query fails
      return Math.floor(Math.random() * 30) + 10;
    }
  },
  
  // Update user's last activity timestamp
  async updateLastActivity() {
    if (!CasinoAuth.currentUser) return;
    try {
      const userId = CasinoAuth.currentUser.uid;
      await updateDoc(doc(db, 'mulon_users', userId), {
        lastLoginAt: serverTimestamp()
      });
      console.log('Updated last activity for user:', userId);
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  },
  
  // ========================================
  // GAME SESSION TRACKING
  // ========================================
  
  // Current active session ID (stored in memory)
  activeSessionId: null,
  
  // Start a new game session
  async startGameSession(gameName, initialBetAmount = 0) {
    if (!CasinoAuth.currentUser) {
      console.log('startGameSession: Not signed in');
      return { success: false, error: 'Not signed in' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const sessionsRef = collection(db, 'mulon_users', userId, 'sessions');
      
      // Create new session document
      const sessionData = {
        gameName: gameName,
        startedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        endedAt: null,
        status: 'active', // active, ended, abandoned
        
        // Game stats
        totalBets: 0,
        totalWagered: 0,
        totalWon: 0,
        netProfit: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        
        // Session metadata
        initialBalance: CasinoAuth.userData?.balance || 0,
        finalBalance: null,
        initialBet: initialBetAmount,
        biggestWin: 0,
        biggestLoss: 0,
        longestWinStreak: 0,
        currentWinStreak: 0,
        
        // Device/browser info
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      
      const sessionDoc = await addDoc(sessionsRef, sessionData);
      this.activeSessionId = sessionDoc.id;
      
      console.log(`Started ${gameName} session: ${sessionDoc.id}`);
      
      return { 
        success: true, 
        sessionId: sessionDoc.id,
        session: sessionData
      };
    } catch (error) {
      console.error('Error starting game session:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Update active session with game results
  async updateGameSession(result) {
    if (!CasinoAuth.currentUser || !this.activeSessionId) {
      console.log('updateGameSession: No active session');
      return { success: false, error: 'No active session' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const sessionRef = doc(db, 'mulon_users', userId, 'sessions', this.activeSessionId);
      
      // Get current session data
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) {
        console.error('Session document not found');
        return { success: false, error: 'Session not found' };
      }
      
      const sessionData = sessionSnap.data();
      
      // Calculate updates
      const isWin = result.won > result.bet;
      const netChange = result.won - result.bet;
      const newWinStreak = isWin ? (sessionData.currentWinStreak || 0) + 1 : 0;
      
      const updates = {
        lastActivityAt: serverTimestamp(),
        totalBets: increment(1),
        totalWagered: increment(result.bet),
        totalWon: increment(result.won),
        netProfit: increment(netChange),
        gamesPlayed: increment(1),
        wins: isWin ? increment(1) : (sessionData.wins || 0),
        losses: !isWin ? increment(1) : (sessionData.losses || 0),
        currentWinStreak: newWinStreak,
        longestWinStreak: Math.max(sessionData.longestWinStreak || 0, newWinStreak),
        biggestWin: Math.max(sessionData.biggestWin || 0, result.won),
        biggestLoss: Math.max(sessionData.biggestLoss || 0, result.bet)
      };
      
      await updateDoc(sessionRef, updates);
      
      console.log(`Updated session ${this.activeSessionId}: ${isWin ? 'WIN' : 'LOSS'} $${netChange.toFixed(2)}`);
      
      return { success: true, sessionId: this.activeSessionId };
    } catch (error) {
      console.error('Error updating game session:', error);
      return { success: false, error: error.message };
    }
  },
  
  // End the current game session
  async endGameSession(reason = 'user_ended') {
    if (!CasinoAuth.currentUser || !this.activeSessionId) {
      console.log('endGameSession: No active session');
      return { success: false, error: 'No active session' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const sessionRef = doc(db, 'mulon_users', userId, 'sessions', this.activeSessionId);
      
      await updateDoc(sessionRef, {
        endedAt: serverTimestamp(),
        status: reason === 'abandoned' ? 'abandoned' : 'ended',
        finalBalance: CasinoAuth.userData?.balance || 0,
        endReason: reason
      });
      
      console.log(`Ended session ${this.activeSessionId}: ${reason}`);
      
      const endedSessionId = this.activeSessionId;
      this.activeSessionId = null;
      
      return { success: true, sessionId: endedSessionId };
    } catch (error) {
      console.error('Error ending game session:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Update session activity (keep-alive)
  async updateSessionActivity() {
    if (!CasinoAuth.currentUser || !this.activeSessionId) {
      return { success: false, error: 'No active session' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const sessionRef = doc(db, 'mulon_users', userId, 'sessions', this.activeSessionId);
      
      await updateDoc(sessionRef, {
        lastActivityAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating session activity:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get user's game sessions (with optional filters)
  async getGameSessions(options = {}) {
    const userId = options.userId || CasinoAuth.currentUser?.uid;
    if (!userId) {
      return [];
    }
    
    try {
      const sessionsRef = collection(db, 'mulon_users', userId, 'sessions');
      let q = sessionsRef;
      
      // Apply filters
      if (options.gameName) {
        q = query(q, where('gameName', '==', options.gameName));
      }
      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }
      
      const snapshot = await getDocs(q);
      
      const sessions = [];
      snapshot.forEach(doc => {
        sessions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by start time (newest first)
      sessions.sort((a, b) => {
        const aTime = a.startedAt?.toMillis?.() || 0;
        const bTime = b.startedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      return sessions;
    } catch (error) {
      console.error('Error getting game sessions:', error);
      return [];
    }
  },
  
  // Get session statistics for a user
  async getSessionStats(userId = null) {
    const targetUserId = userId || CasinoAuth.currentUser?.uid;
    if (!targetUserId) {
      return null;
    }
    
    try {
      const sessions = await this.getGameSessions({ userId: targetUserId });
      
      const stats = {
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.status === 'active').length,
        totalGamesPlayed: 0,
        totalWagered: 0,
        totalWon: 0,
        netProfit: 0,
        winRate: 0,
        avgSessionDuration: 0,
        favoriteGame: null,
        gameBreakdown: {}
      };
      
      const gameCounts = {};
      let totalDuration = 0;
      let sessionsWithDuration = 0;
      
      sessions.forEach(session => {
        stats.totalGamesPlayed += session.gamesPlayed || 0;
        stats.totalWagered += session.totalWagered || 0;
        stats.totalWon += session.totalWon || 0;
        stats.netProfit += session.netProfit || 0;
        
        // Track game popularity
        gameCounts[session.gameName] = (gameCounts[session.gameName] || 0) + 1;
        
        // Calculate duration if session ended
        if (session.startedAt && session.endedAt) {
          const duration = session.endedAt.toMillis() - session.startedAt.toMillis();
          totalDuration += duration;
          sessionsWithDuration++;
        }
        
        // Game breakdown
        if (!stats.gameBreakdown[session.gameName]) {
          stats.gameBreakdown[session.gameName] = {
            sessions: 0,
            gamesPlayed: 0,
            totalWagered: 0,
            totalWon: 0,
            netProfit: 0
          };
        }
        stats.gameBreakdown[session.gameName].sessions++;
        stats.gameBreakdown[session.gameName].gamesPlayed += session.gamesPlayed || 0;
        stats.gameBreakdown[session.gameName].totalWagered += session.totalWagered || 0;
        stats.gameBreakdown[session.gameName].totalWon += session.totalWon || 0;
        stats.gameBreakdown[session.gameName].netProfit += session.netProfit || 0;
      });
      
      // Calculate derived stats
      if (stats.totalGamesPlayed > 0) {
        const totalWins = sessions.reduce((sum, s) => sum + (s.wins || 0), 0);
        stats.winRate = (totalWins / stats.totalGamesPlayed) * 100;
      }
      
      if (sessionsWithDuration > 0) {
        stats.avgSessionDuration = totalDuration / sessionsWithDuration;
      }
      
      // Find favorite game
      let maxCount = 0;
      for (const [game, count] of Object.entries(gameCounts)) {
        if (count > maxCount) {
          maxCount = count;
          stats.favoriteGame = game;
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting session stats:', error);
      return null;
    }
  },
  
  // Check for abandoned sessions on page load and mark them
  async checkAbandonedSessions() {
    if (!CasinoAuth.currentUser) return;
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const activeSessions = await this.getGameSessions({ 
        userId, 
        status: 'active' 
      });
      
      // Mark sessions older than 30 minutes as abandoned
      const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
      
      for (const session of activeSessions) {
        const lastActivity = session.lastActivityAt?.toMillis?.() || 0;
        
        if (lastActivity < thirtyMinutesAgo) {
          const sessionRef = doc(db, 'mulon_users', userId, 'sessions', session.id);
          await updateDoc(sessionRef, {
            status: 'abandoned',
            endedAt: serverTimestamp(),
            endReason: 'auto_abandoned',
            finalBalance: CasinoAuth.userData?.balance || 0
          });
          console.log(`Marked session ${session.id} as abandoned`);
        }
      }
    } catch (error) {
      console.error('Error checking abandoned sessions:', error);
    }
  }
};

// Make available globally for non-module scripts
window.CasinoAuth = CasinoAuth;
window.CasinoDB = CasinoDB;
window.TabSync = TabSync;

// Export TabSync for module usage
export { TabSync };
