// ========================================
// MULON - Firebase Data Management with Order Book
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getFirestore,
    doc,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    collection,
    updateDoc,
    query,
    where,
    orderBy,
    arrayUnion,
    increment,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
    getAuth,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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
import { checkMaintenanceAccess, MAINTENANCE_MODE } from './maintenance.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ========================================
// ADMIN SECURITY - Data Layer Protection
// ========================================
const ADMIN_EMAILS = Object.freeze(['joelmulonde81@gmail.com', 'jordan.herrera@crpusd.org', 'j.m@three.com', 'captrojolmao@gmail.com']);

// Verify current user is admin - called before any admin-only operation
function requireAdmin() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('UNAUTHORIZED: No user signed in');
  }
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    throw new Error('UNAUTHORIZED: Admin access required');
  }
  return true;
}

// Firestore references
const marketsRef = collection(db, 'mulon');
const ordersRef = collection(db, 'mulon_orders');
const tradesRef = collection(db, 'mulon_trades');
const positionsRef = collection(db, 'mulon_positions'); // Central positions collection
const usersRef = collection(db, 'mulon_users');
const categoriesRef = collection(db, 'mulon_categories');
const suggestionsRef = collection(db, 'mulon_suggestions');
const ouUsersRef = collection(db, 'users'); // Over Under users collection
const adminEditsRef = collection(db, 'admin_edits'); // Admin action logs

// ========================================
// ADMIN ACTION LOGGING
// ========================================
async function logAdminAction(actionType, details = {}) {
  try {
    const user = auth.currentUser;
    if (!user) return; // No user, no log
    
    const logEntry = {
      adminEmail: user.email,
      adminUid: user.uid,
      actionType,
      timestamp: new Date().toISOString(),
      ...details
    };
    
    await addDoc(adminEditsRef, logEntry);
    console.log('Admin action logged:', actionType);
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw - logging should not break the main operation
  }
}

// ========================================
// OVER UNDER ACCOUNT SYNC
// ========================================
const OverUnderSync = {
  /**
   * Check if the user has an OverUnder account.
   * @param {string} email 
   * @returns {*} {found, uid, username, name, email}
   */
  async checkForOverUnderAccount(email) {
    if (!email) return null;
    
    try {
      const q = query(ouUsersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        return {
          found: true,
          uid: userDoc.id,
          username: userData.username || null,
          name: userData.name || null,
          email: userData.email
        };
      }
      return { found: false };
    } catch (error) {
      console.error('Error checking Over Under account:', error);
      return { found: false, error: error.message };
    }
  },
  
  /**
   * Sync the user's name with their OverUnder username.
   * @param {string} mulonUserId 
   * @param {string} overUnderUsername 
   * @returns {object} {success, error}
   */
  async syncUsername(mulonUserId, overUnderUsername) {
    try {
      await updateDoc(doc(usersRef, mulonUserId), {
        displayName: overUnderUsername,
        overUnderSynced: true
      });
      return { success: true };
    } catch (error) {
      console.error('Error syncing username:', error);
      return { success: false, error: error.message };
    }
  }
};

// Make available globally
window.OverUnderSync = OverUnderSync;

// ========================================
// AUTHENTICATION
// ========================================
const Auth = {
  currentUser: null,
  authStateListeners: [],
  
  /**
   * Initialize the Auth state listener and load the user's data.
   */
  init() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isGuest: false
        };
        
        // Load or create user data from Firestore (pass user info for profile)
        await UserData.loadFromFirebase(user.uid, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
        
        console.log('User signed in:', user.displayName);
      } else {
        this.currentUser = null;
        UserData.data = null;
        UserData.userId = null;
        console.log('User signed out');
      }
      
      // Notify all listeners
      this.authStateListeners.forEach(listener => listener(this.currentUser));
    });
  },

  /**
   * Call Auth.init() and, if the website is in maintenance mode, check if the user is allowed to view the page.
   * @returns {boolean} Whether the user has access or not
   */
  async initWithMaintenanceCheck() {
    this.init();
    
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
  
  /**
   * Sign in with Google
   */
  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Sign the user out.
   */
  async signOut() {
    try {
      await signOut(auth);
      this.currentUser = null;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Check if the user is signed in.
   * @returns {boolean} Whether the user is signed it
   */
  isSignedIn() {
    return this.currentUser !== null && !this.currentUser.isGuest;
  },
  
  /**
   * Get the current user.
   * @returns {object} The user
   */
  getUser() {
    return this.currentUser;
  },
  
  /**
   * Add auth state change listener
   * @param {listener} listener The listener
   */
  onAuthStateChange(listener) {
    this.authStateListeners.push(listener);
    // Immediately call with current state
    if (this.currentUser !== undefined) {
      listener(this.currentUser);
    }
  },
  
  /**
   * Set guest mode, allowing user to continue as a guest.
   */
  setGuestMode() {
    this.currentUser = {
      uid: 'guest_' + Date.now(),
      displayName: 'Guest',
      isGuest: true
    };
    this.authStateListeners.forEach(listener => listener(this.currentUser));
  }
};

// Make Auth globally available
window.Auth = Auth;

// ========================================
// USER DATA (Firebase-backed)
// ========================================
const UserData = {
  data: null,
  userId: null,
  
  /**
   * Get the default user data.
   * @param {object} userProfile The profile of the user (optional)
   * @returns {object} The default user data
   */
  getDefault(userProfile = {}) {
    return {
      // User profile info
      email: userProfile.email || null,
      displayName: userProfile.displayName || null,
      photoURL: userProfile.photoURL || null,
      // Trading data
      balance: 500.00,
      keys: 40, // Keys currency - for casino, collectables, earned from predictions
      positions: [],
      watchlist: [],
      transactions: [],
      cashOuts: [],
      // Metadata
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
  },
  
  /**
   * Loads the user's data from Firebase, creating new user data if necessary.
   * @param {string} userId The ID of the user
   * @param {object} userProfile The profile data of the user (email, displayName, etc.)
   * @returns {object} The user's data, or the default user data if it could not be loaded
   */
  async loadFromFirebase(userId, userProfile = {}) {
    this.userId = userId;
    try {
      const userDoc = await getDoc(doc(usersRef, userId));
      if (userDoc.exists()) {
        this.data = userDoc.data();
        // Update profile info and last login on each sign in
        this.data.email = userProfile.email || this.data.email;
        this.data.displayName = userProfile.displayName || this.data.displayName;
        this.data.photoURL = userProfile.photoURL || this.data.photoURL;
        this.data.lastLoginAt = new Date().toISOString();
        // Migrate existing users: add 40 keys if they don't have keys yet
        if (this.data.keys === undefined) {
          this.data.keys = 40;
        }
        await this.save();
      } else {
        // Create new user document with profile info
        this.data = this.getDefault(userProfile);
        await setDoc(doc(usersRef, userId), this.data);
        console.log('Created new user document for:', userId);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.data = this.getDefault(userProfile);
    }
    return this.data;
  },
  
  /**
   * Save the user's data.
   */
  async save() {
    if (!this.userId || !this.data) return;
    try {
      await setDoc(doc(usersRef, this.userId), this.data);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  },
  
  /**
   * Get the user's data, or the default user data if it could not be gotten
   * @returns {object} User's data
   */
  get() {
    return this.data || this.getDefault();
  },
  
  /**
   * Get the user's balance.
   * @returns {number} The user's balance
   */
  getBalance() {
    return this.get().balance;
  },

  /**
   * Set the user's balance.
   * @param {number} amount The user's balance
   * @returns {number} The user's balance
   */
  async setBalance(amount) {
    if (!this.data) return 0;
    this.data.balance = Math.round(amount * 100) / 100;
    await this.save();
    return this.data.balance;
  },

  /**
   * Add to the user's balance.
   * @param {number} amount The amount to add
   * @returns {number} The user's balance
   */
  async updateBalance(amount) {
    if (!this.data) return 0;
    this.data.balance = Math.round((this.data.balance + amount) * 100) / 100;
    await this.save();
    return this.data.balance;
  },
  
  /**
   * Get the user's number of keys.
   * @returns {number} The number of keys
   */
  getKeys() {
    return this.get().keys || 0;
  },
  
  /**
   * Add to the user's number of keys.
   * @param {number} amount The amount to add
   * @returns 
   */
  async updateKeys(amount) {
    if (!this.data) return 0;
    this.data.keys = Math.max(0, (this.data.keys || 0) + amount);
    await this.save();
    return this.data.keys;
  },
  
  // Daily reward streak system
  // Streak multipliers: Day 1 = 1.0, Day 2 = 1.2, Day 3 = 1.4, Day 4 = 1.7, Day 5 = 2.0, Day 6+ = 2.4, 2.8, 3.2...
  STREAK_MULTIPLIERS: [1.0, 1.2, 1.4, 1.7, 2.0, 2.4, 2.8, 3.2, 3.6, 4.0],
  BASE_KEY_REWARD: 4,
  BASE_BALANCE_REWARD: 150,
  
  /**
   * Get the user's daily streak multiplier.
   * @param {number} streak 
   * @returns 
   */
  getStreakMultiplier(streak) {
    const idx = Math.min(streak - 1, this.STREAK_MULTIPLIERS.length - 1);
    if (idx < 0) return this.STREAK_MULTIPLIERS[0];
    return this.STREAK_MULTIPLIERS[idx];
  },
  
  /**
   * Get the date user's last daily key claim.
   * @returns {string} The date of the last claim, stored in a string; or null, if the user has never claimed their daily key
   */
  getLastDailyKeyClaim() {
    return this.get().lastDailyKeyClaim || null;
  },
  
  /**
   * Get the user's daily streak.
   * @returns {number} The user's daily streak
   */
  getDailyStreak() {
    return this.get().dailyStreak || 0;
  },
  
  /**
   * Check if the user may claim their daily key.
   * @returns {boolean} Whether the user can claim their daily key or not
   */
  canClaimDailyKey() {
    const lastClaim = this.getLastDailyKeyClaim();
    if (!lastClaim) return true;
    
    const lastClaimTime = new Date(lastClaim).getTime();
    const now = Date.now();
    const hoursPassed = (now - lastClaimTime) / (1000 * 60 * 60);
    
    return hoursPassed >= 24;
  },
  
  /**
   * Check if the user's streak is valid or not (last valid claim was within past 48 hours).
   * @returns {boolean} Whether the streak is valid or not
   */
  isStreakValid() {
    const lastClaim = this.getLastDailyKeyClaim();
    if (!lastClaim) return false;
    
    const lastClaimTime = new Date(lastClaim).getTime();
    const now = Date.now();
    const hoursPassed = (now - lastClaimTime) / (1000 * 60 * 60);
    
    // Streak is valid if last claim was within 48 hours
    return hoursPassed < 48;
  },
  
  /**
   * Get the time until the user may make their next daily claim.
   * @returns {number} The time until the next claim (ms)
   */
  getTimeUntilNextClaim() {
    const lastClaim = this.getLastDailyKeyClaim();
    if (!lastClaim) return 0;
    
    const lastClaimTime = new Date(lastClaim).getTime();
    const nextClaimTime = lastClaimTime + (24 * 60 * 60 * 1000);
    const now = Date.now();
    
    return Math.max(0, nextClaimTime - now);
  },
  
  /**
   * Get current streak reward info (for UI display).
   */
  getStreakRewardInfo() {
    let currentStreak = this.getDailyStreak();
    
    // If streak expired, reset to 0
    if (!this.isStreakValid() && currentStreak > 0) {
      currentStreak = 0;
    }
    
    // Next streak will be current + 1 (or 1 if expired)
    const nextStreak = currentStreak + 1;
    const multiplier = this.getStreakMultiplier(nextStreak);
    const keysReward = Math.floor(this.BASE_KEY_REWARD * multiplier);
    const balanceReward = Math.floor(this.BASE_BALANCE_REWARD * multiplier);
    
    return {
      currentStreak,
      nextStreak,
      multiplier,
      keysReward,
      balanceReward
    };
  },
  
  /**
   * Claim the user's daily key.
   */
  async claimDailyKey() {
    if (!this.data) return { success: false, error: 'Not signed in' };
    if (!this.canClaimDailyKey()) return { success: false, error: 'Already claimed today' };
    
    try {
      // Check if streak is still valid
      let newStreak = 1;
      if (this.isStreakValid()) {
        newStreak = (this.data.dailyStreak || 0) + 1;
      }
      
      // Calculate rewards based on streak
      const multiplier = this.getStreakMultiplier(newStreak);
      const keysReward = Math.floor(this.BASE_KEY_REWARD * multiplier);
      const balanceReward = Math.floor(this.BASE_BALANCE_REWARD * multiplier);
      
      // Apply rewards
      this.data.keys = (this.data.keys || 0) + keysReward;
      this.data.balance = Math.round(((this.data.balance || 0) + balanceReward) * 100) / 100;
      this.data.dailyStreak = newStreak;
      this.data.lastDailyKeyClaim = new Date().toISOString();
      
      await this.save();
      
      return { 
        success: true, 
        keys: this.data.keys, 
        balance: this.data.balance,
        keysReward,
        balanceReward,
        streak: newStreak,
        multiplier
      };
    } catch (error) {
      console.error('Error claiming daily reward:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Update the user's profile.
   * @param {string} displayName The user's displayed name
   * @param {string} avatarStyle The user's avatar style
   */
  async updateProfile(displayName, avatarStyle) {
    if (!this.data) return { success: false, error: 'Not signed in' };
    
    try {
      if (displayName !== undefined && displayName.trim() !== '') {
        this.data.displayName = displayName.trim();
        // Save custom username separately (for when user manually edits their name)
        this.data.customUserName = displayName.trim();
      }
      if (avatarStyle !== undefined) {
        this.data.avatarStyle = avatarStyle;
      }
      await this.save();
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Get the user's avatar style.
   * @returns {string} The user's avatar style
   */
  getAvatarStyle() {
    return this.get().avatarStyle || 'default';
  },
  
  /**
   * Get the user's display name.
   * @returns {string} The user's display name
   */
  getDisplayName() {
    return this.get().displayName || 'Anonymous';
  },
  
  /**
   * Add a position.
   * @param {string} marketId The market ID
   * @param {string} marketTitle The market title
   * @param {string} choice The user's choice (yes or no)
   * @param {number} shares The number of shares
   * @param {number} costBasis The cost basis
   * @param {number} price The price
   * @returns 
   */
  async addPosition(marketId, marketTitle, choice, shares, costBasis, price) {
    if (!this.data) return [];
    
    const tradeId = 'trade_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();
    
    const existingIndex = this.data.positions.findIndex(
      p => p.marketId === marketId && p.choice === choice
    );
    
    if (existingIndex !== -1) {
      const existing = this.data.positions[existingIndex];
      existing.shares += shares;
      existing.costBasis += costBasis;
      existing.avgPrice = Math.round((existing.costBasis / existing.shares) * 100) / 100;
      // Track all trade IDs for this position
      existing.tradeIds = existing.tradeIds || [];
      existing.tradeIds.push(tradeId);
    } else {
      this.data.positions.push({
        marketId,
        marketTitle,
        choice,
        shares,
        costBasis,
        avgPrice: price,
        purchaseDate: timestamp,
        tradeIds: [tradeId] // Track trade IDs
      });
    }
    
    // Add transaction record
    this.data.transactions = this.data.transactions || [];
    this.data.transactions.unshift({
      type: 'buy',
      marketId,
      choice,
      shares,
      price,
      cost: costBasis,
      tradeId,
      timestamp
    });
    
    await this.save();
    
    // Save to central positions collection for tracking
    try {
      await setDoc(doc(positionsRef, tradeId), {
        tradeId,
        userId: this.userId,
        marketId,
        marketTitle,
        choice,
        shares,
        costBasis,
        price,
        timestamp,
        status: 'active'
      });
    } catch (error) {
      console.warn('Could not save to central positions collection:', error);
    }
    
    return this.data.positions;
  },
  
  /**
   * Get the user's positions.
   * @returns {object[]} An array of positions
   */
  getPositions() {
    return this.get().positions || [];
  },
  
  /**
   * Sell part or all of a position
   * @param {string} marketId The market ID
   * @param {string} choice The user's choice (yes/no)
   * @param {number} sharesToSell The number of shares being sold
   * @param {number} saleAmount The sale amount
   */
  async sellPosition(marketId, choice, sharesToSell, saleAmount) {
    if (!this.data) return null;
    
    const positionIndex = this.data.positions.findIndex(
      p => p.marketId === marketId && p.choice === choice
    );
    
    if (positionIndex === -1) return null;
    
    const position = this.data.positions[positionIndex];
    
    // Calculate proportional cost basis for the sold shares
    const costBasisPerShare = position.costBasis / position.shares;
    const soldCostBasis = costBasisPerShare * sharesToSell;
    
    if (sharesToSell >= position.shares) {
      // Selling entire position - remove it
      this.data.positions.splice(positionIndex, 1);
    } else {
      // Partial sell - reduce shares and cost basis
      position.shares -= sharesToSell;
      position.costBasis -= soldCostBasis;
    }
    
    // Add transaction record
    this.data.transactions = this.data.transactions || [];
    this.data.transactions.unshift({
      type: 'sell',
      marketId,
      choice,
      shares: sharesToSell,
      price: Math.round((saleAmount / sharesToSell) * 100),
      proceeds: saleAmount,
      profit: saleAmount - soldCostBasis,
      timestamp: new Date().toISOString()
    });
    
    await this.save();
    return { soldCostBasis, profit: saleAmount - soldCostBasis };
  },
  
  // Get a specific position
  getPosition(marketId) {
    return this.getPositions().find(p => p.marketId === marketId) || null;
  },

  getWatchlist() {
    return this.get().watchlist || [];
  },
  
  getCashOuts() {
    return this.get().cashOuts || [];
  },
  
  // Get IDs of cashouts that have been acknowledged/seen
  getSeenCashoutIds() {
    return this.get().seenCashoutIds || [];
  },
  
  // Get unseen winning cashouts (for celebration)
  getUnseenWins() {
    const cashouts = this.getCashOuts();
    const seenIds = this.getSeenCashoutIds();
    return cashouts.filter(co => co.won && !seenIds.includes(co.marketId + '_' + co.timestamp));
  },
  
  // Mark cashouts as seen
  async markCashoutsAsSeen(cashoutIds) {
    if (!this.data) return;
    if (!this.data.seenCashoutIds) this.data.seenCashoutIds = [];
    this.data.seenCashoutIds = [...new Set([...this.data.seenCashoutIds, ...cashoutIds])];
    await this.save();
  },

  async addToWatchlist(marketId) {
    if (!this.data) return [];
    if (!this.data.watchlist.includes(marketId)) {
      this.data.watchlist.push(marketId);
      await this.save();
    }
    return this.data.watchlist;
  },
  
  async removeFromWatchlist(marketId) {
    if (!this.data) return [];
    this.data.watchlist = this.data.watchlist.filter(id => id !== marketId);
    await this.save();
    return this.data.watchlist;
  },
  
  isWatchlisted(marketId) {
    return (this.get().watchlist || []).includes(marketId);
  },
  
  async reset() {
    this.data = this.getDefault();
    await this.save();
  }
};

// Make UserData globally available
window.UserData = UserData;

// ========================================
// ONBOARDING STATE
// ========================================
const OnboardingState = {
  STORAGE_KEY: 'mulon_onboarding',
  
  hasCompletedOnboarding() {
    return localStorage.getItem(this.STORAGE_KEY) === 'completed';
  },
  
  setCompleted() {
    localStorage.setItem(this.STORAGE_KEY, 'completed');
  },
  
  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};

// Make OnboardingState globally available
window.OnboardingState = OnboardingState;

// ========================================
// ORDER BOOK ENGINE
// ========================================
const OrderBook = {
  // Order book cache per market: { marketId: { yes: { bids: [], asks: [] }, no: { bids: [], asks: [] } } }
  books: {},
  
  // Initialize order book for a market from Firebase or create new
  async initBook(marketId) {
    if (!this.books[marketId]) {
      // Try to load from Firebase
      try {
        const orderBookDoc = await getDoc(doc(db, 'mulon_orderbooks', marketId));
        if (orderBookDoc.exists()) {
          this.books[marketId] = orderBookDoc.data();
        } else {
          this.books[marketId] = this.createEmptyBook();
          await this.saveOrderBook(marketId);
        }
      } catch (error) {
        console.warn('Could not load order book from Firebase:', error);
        this.books[marketId] = this.createEmptyBook();
      }
    }
    return this.books[marketId];
  },
  
  // Create empty order book structure
  createEmptyBook() {
    return {
      yes: { 
        bids: [],  // Buy orders: [{ price, quantity, timestamp, oderId }]
        asks: []   // Sell orders
      },
      no: { 
        bids: [], 
        asks: [] 
      },
      lastUpdated: new Date().toISOString(),
      totalOrders: 0,
      matchedOrders: 0
    };
  },
  
  // Save order book to Firebase
  async saveOrderBook(marketId) {
    try {
      const book = this.books[marketId];
      if (book) {
        book.lastUpdated = new Date().toISOString();
        await setDoc(doc(db, 'mulon_orderbooks', marketId), book);
      }
    } catch (error) {
      console.warn('Could not save order book to Firebase:', error);
    }
  },
  
  // Add a limit order to the book
  async addLimitOrder(marketId, side, choice, price, quantity, userId = 'anonymous') {
    const book = await this.initBook(marketId);
    
    const order = {
      orderId: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      price: Math.round(price),
      quantity: Math.round(quantity * 100) / 100,
      side,
      choice,
      userId,
      timestamp: new Date().toISOString(),
      status: 'open',
      filled: 0
    };
    
    // Add to appropriate side of the book
    const bookSide = book[choice];
    if (side === 'buy') {
      bookSide.bids.push(order);
      // Sort bids descending (highest first)
      bookSide.bids.sort((a, b) => b.price - a.price);
    } else {
      bookSide.asks.push(order);
      // Sort asks ascending (lowest first)
      bookSide.asks.sort((a, b) => a.price - b.price);
    }
    
    book.totalOrders++;
    
    // Save order to orders collection
    await this.saveOrder(order);
    
    // Save updated order book
    await this.saveOrderBook(marketId);
    
    // Try to match orders
    await this.matchOrders(marketId, choice);
    
    return order;
  },
  
  // Save individual order to orders collection
  async saveOrder(order) {
    try {
      await setDoc(doc(ordersRef, order.orderId), order);
    } catch (error) {
      console.warn('Could not save order to Firebase:', error);
    }
  },
  
  // Update order status
  async updateOrderStatus(orderId, updates) {
    try {
      await updateDoc(doc(ordersRef, orderId), updates);
    } catch (error) {
      console.warn('Could not update order:', error);
    }
  },
  
  // Match orders in the book
  async matchOrders(marketId, choice) {
    const book = await this.initBook(marketId);
    const bookSide = book[choice];
    
    // Match bids with asks
    while (bookSide.bids.length > 0 && bookSide.asks.length > 0) {
      const bestBid = bookSide.bids[0];
      const bestAsk = bookSide.asks[0];
      
      // Check if there's a match (bid >= ask)
      if (bestBid.price >= bestAsk.price) {
        const matchPrice = Math.round((bestBid.price + bestAsk.price) / 2);
        const matchQuantity = Math.min(
          bestBid.quantity - bestBid.filled,
          bestAsk.quantity - bestAsk.filled
        );
        
        // Record the matched trade
        const trade = {
          id: 'trade_' + Date.now(),
          marketId,
          choice,
          buyOrderId: bestBid.orderId,
          sellOrderId: bestAsk.orderId,
          price: matchPrice,
          quantity: matchQuantity,
          timestamp: new Date().toISOString()
        };
        
        await this.saveTrade(trade);
        
        // Update filled amounts
        bestBid.filled += matchQuantity;
        bestAsk.filled += matchQuantity;
        
        // Remove fully filled orders
        if (bestBid.filled >= bestBid.quantity) {
          bestBid.status = 'filled';
          bookSide.bids.shift();
          await this.updateOrderStatus(bestBid.orderId, { status: 'filled', filled: bestBid.filled });
        }
        if (bestAsk.filled >= bestAsk.quantity) {
          bestAsk.status = 'filled';
          bookSide.asks.shift();
          await this.updateOrderStatus(bestAsk.orderId, { status: 'filled', filled: bestAsk.filled });
        }
        
        book.matchedOrders++;
        
        // Update market price based on last trade
        await this.updateMarketPrice(marketId, choice, matchPrice);
      } else {
        break; // No more matches possible
      }
    }
    
    await this.saveOrderBook(marketId);
  },
  
  // Update market price after a trade
  async updateMarketPrice(marketId, choice, newPrice) {
    const market = MulonData.getMarket(marketId);
    if (!market) return;
    
    let updates;
    if (choice === 'yes') {
      updates = {
        yesPrice: newPrice,
        noPrice: 100 - newPrice
      };
    } else {
      updates = {
        noPrice: newPrice,
        yesPrice: 100 - newPrice
      };
    }
    
    await MulonData.updateMarket(marketId, updates);
  },
  
  // Execute a market order (immediate execution at best available price)
  // Returns: { filled: boolean, avgPrice: number, shares: number, cost: number }
  async executeMarketOrder(marketId, side, choice, dollarAmount, userId = 'anonymous') {
    await this.initBook(marketId);
    const market = MulonData.getMarket(marketId);
    if (!market) return { filled: false, error: 'Market not found' };
    
    // For prediction markets: buying YES is like selling NO and vice versa
    // Price of YES + Price of NO = 100 (always)
    
    const currentPrice = choice === 'yes' ? market.yesPrice : market.noPrice;
    const pricePerShare = currentPrice / 100; // Convert cents to dollars
    const shares = dollarAmount / pricePerShare;
    
    // Calculate price impact based on order size relative to liquidity
    // Larger orders move the price more
    const liquidity = market.volume || 1000;
    const impactFactor = Math.min(dollarAmount / liquidity, 0.15); // Max 15% impact per trade
    
    let newYesPrice, newNoPrice;
    
    if (side === 'buy') {
      if (choice === 'yes') {
        // Buying YES pushes YES price up
        newYesPrice = Math.min(99, Math.round(market.yesPrice + (impactFactor * 100)));
        newNoPrice = 100 - newYesPrice;
      } else {
        // Buying NO pushes NO price up (YES price down)
        newNoPrice = Math.min(99, Math.round(market.noPrice + (impactFactor * 100)));
        newYesPrice = 100 - newNoPrice;
      }
    } else {
      // Selling
      if (choice === 'yes') {
        // Selling YES pushes YES price down
        newYesPrice = Math.max(1, Math.round(market.yesPrice - (impactFactor * 100)));
        newNoPrice = 100 - newYesPrice;
      } else {
        // Selling NO pushes NO price down (YES price up)
        newNoPrice = Math.max(1, Math.round(market.noPrice - (impactFactor * 100)));
        newYesPrice = 100 - newNoPrice;
      }
    }
    
    // Update market with new prices and volume
    const updates = {
      yesPrice: newYesPrice,
      noPrice: newNoPrice,
      volume: (market.volume || 0) + Math.round(dollarAmount)
    };
    
    await MulonData.updateMarket(marketId, updates);
    
    // Record the trade
    const trade = {
      id: 'trade_' + Date.now(),
      marketId,
      side,
      choice,
      shares: Math.round(shares * 100) / 100,
      price: currentPrice,
      cost: dollarAmount,
      priceAfter: choice === 'yes' ? newYesPrice : newNoPrice,
      userId,
      orderType: 'market',
      timestamp: new Date().toISOString()
    };
    
    // Save trade and update order book
    await this.saveTrade(trade);
    await this.updateOrderBookFromTrade(marketId, trade);
    
    return {
      filled: true,
      shares: trade.shares,
      avgPrice: currentPrice,
      cost: dollarAmount,
      newPrice: choice === 'yes' ? newYesPrice : newNoPrice,
      priceChange: (choice === 'yes' ? newYesPrice : newNoPrice) - currentPrice
    };
  },
  
  // Update order book with trade info (for display purposes)
  async updateOrderBookFromTrade(marketId, trade) {
    const book = await this.initBook(marketId);
    
    // Add to recent trades in book
    if (!book.recentTrades) book.recentTrades = [];
    book.recentTrades.unshift({
      price: trade.price,
      shares: trade.shares,
      side: trade.side,
      timestamp: trade.timestamp
    });
    
    // Keep only last 50 trades in book
    if (book.recentTrades.length > 50) {
      book.recentTrades = book.recentTrades.slice(0, 50);
    }
    
    await this.saveOrderBook(marketId);
  },
  
  // Save trade to Firebase
  async saveTrade(trade) {
    try {
      await setDoc(doc(tradesRef, trade.id), trade);
    } catch (error) {
      console.warn('Could not save trade to Firebase:', error);
    }
  },
  
  // Get trades for a market (limit=0 means all trades)
  async getRecentTrades(marketId, limit = 20) {
    try {
      const querySnapshot = await getDocs(tradesRef);
      const trades = [];
      querySnapshot.forEach((doc) => {
        const trade = doc.data();
        if (trade.marketId === marketId) {
          trades.push(trade);
        }
      });
      // Sort by timestamp descending
      trades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      // Return all trades if limit is 0, otherwise slice
      return limit === 0 ? trades : trades.slice(0, limit);
    } catch (error) {
      console.warn('Could not fetch trades:', error);
      return [];
    }
  },
  
  // Get order book for a market
  async getOrderBook(marketId) {
    return await this.initBook(marketId);
  },
  
  // Get all open orders for a market
  async getOpenOrders(marketId) {
    const book = await this.initBook(marketId);
    return {
      yes: {
        bids: book.yes.bids.filter(o => o.status === 'open'),
        asks: book.yes.asks.filter(o => o.status === 'open')
      },
      no: {
        bids: book.no.bids.filter(o => o.status === 'open'),
        asks: book.no.asks.filter(o => o.status === 'open')
      }
    };
  },
  
  // Cancel an order
  async cancelOrder(marketId, orderId) {
    const book = await this.initBook(marketId);
    
    // Find and remove order from all sides
    for (const choice of ['yes', 'no']) {
      for (const side of ['bids', 'asks']) {
        const index = book[choice][side].findIndex(o => o.orderId === orderId);
        if (index !== -1) {
          book[choice][side][index].status = 'cancelled';
          book[choice][side].splice(index, 1);
          await this.updateOrderStatus(orderId, { status: 'cancelled' });
          await this.saveOrderBook(marketId);
          return true;
        }
      }
    }
    return false;
  },
  
  // Calculate implied probability from price
  getProbability(price) {
    return price; // Price in cents = probability in %
  },
  
  // Get best bid/ask spread
  async getSpread(marketId, choice) {
    const book = await this.initBook(marketId);
    const market = MulonData.getMarket(marketId);
    if (!market) return null;
    
    const bookSide = book[choice];
    const bestBid = bookSide.bids[0];
    const bestAsk = bookSide.asks[0];
    
    const currentPrice = choice === 'yes' ? market.yesPrice : market.noPrice;
    
    return {
      bid: bestBid ? bestBid.price : Math.max(1, currentPrice - 1),
      ask: bestAsk ? bestAsk.price : Math.min(99, currentPrice + 1),
      mid: currentPrice,
      bidQuantity: bestBid ? bestBid.quantity - bestBid.filled : 0,
      askQuantity: bestAsk ? bestAsk.quantity - bestAsk.filled : 0
    };
  },
  
  // Get order book depth (for visualization)
  async getDepth(marketId, choice, levels = 5) {
    const book = await this.initBook(marketId);
    const bookSide = book[choice];
    
    // Aggregate orders at each price level
    const aggregateLevels = (orders) => {
      const levels = {};
      orders.forEach(order => {
        if (!levels[order.price]) {
          levels[order.price] = 0;
        }
        levels[order.price] += order.quantity - order.filled;
      });
      return Object.entries(levels).map(([price, quantity]) => ({
        price: parseInt(price),
        quantity
      }));
    };
    
    return {
      bids: aggregateLevels(bookSide.bids).slice(0, levels),
      asks: aggregateLevels(bookSide.asks).slice(0, levels)
    };
  }
};

// Make OrderBook globally available
window.OrderBook = OrderBook;

const MulonData = {
  STORAGE_KEY: 'mulon_markets',
  isInitialized: false,
  cachedMarkets: [],
  
  // Default markets to populate on first load
  defaultMarkets: [
    {
      id: 'market_1',
      title: 'When will Torre grade the next exam?',
      subtitle: 'Will Mr. Torre post grades before February 1st?',
      category: 'grading',
      categoryIcon: '📝',
      categoryLabel: 'Grading',
      yesPrice: 69,
      noPrice: 31,
      volume: 2400,
      startDate: '2026-01-15',
      endDate: '2026-02-01',
      status: 'active',
      featured: true,
      createdAt: '2026-01-15T10:00:00Z',
      totalShares: { yes: 2400, no: 1100 },
      orderBookId: 'market_1'  // Reference to order book collection
    },
    {
      id: 'market_2',
      title: 'Will the basketball team win Friday\'s game?',
      subtitle: 'Tech High vs Central High',
      category: 'sports',
      categoryIcon: '⚽',
      categoryLabel: 'Sports',
      yesPrice: 45,
      noPrice: 55,
      volume: 1200,
      startDate: '2026-01-20',
      endDate: '2026-01-24',
      status: 'active',
      featured: false,
      createdAt: '2026-01-20T09:00:00Z',
      totalShares: { yes: 540, no: 660 },
      orderBookId: 'market_2'
    },
    {
      id: 'market_3',
      title: 'Will the cafeteria serve pizza on Monday?',
      subtitle: 'Weekly menu prediction',
      category: 'school',
      categoryIcon: '🎓',
      categoryLabel: 'Tech High',
      yesPrice: 82,
      noPrice: 18,
      volume: 850,
      startDate: '2026-01-21',
      endDate: '2026-01-27',
      status: 'active',
      featured: false,
      createdAt: '2026-01-21T08:00:00Z',
      totalShares: { yes: 697, no: 153 },
      orderBookId: 'market_3'
    },
    {
      id: 'market_4',
      title: 'Will student council approve the new club?',
      subtitle: 'Gaming Club proposal vote',
      category: 'politics',
      categoryIcon: '🏛️',
      categoryLabel: 'Politics',
      yesPrice: 58,
      noPrice: 42,
      volume: 640,
      startDate: '2026-01-18',
      endDate: '2026-02-01',
      status: 'active',
      featured: false,
      createdAt: '2026-01-18T14:00:00Z',
      totalShares: { yes: 371, no: 269 },
      orderBookId: 'market_4'
    },
    {
      id: 'market_5',
      title: 'Will class average exceed 85% on final?',
      subtitle: 'AP Chemistry final exam',
      category: 'grading',
      categoryIcon: '📝',
      categoryLabel: 'Grading',
      yesPrice: 34,
      noPrice: 66,
      volume: 920,
      startDate: '2026-01-10',
      endDate: '2026-02-15',
      status: 'active',
      featured: false,
      createdAt: '2026-01-10T11:00:00Z',
      totalShares: { yes: 313, no: 607 },
      orderBookId: 'market_5'
    }
  ],

  // Category configuration (loaded from Firebase)
  categories: {},
  
  // Default categories (used if Firebase is empty)
  defaultCategories: {
    school: { icon: '🎓', label: 'Tech High', color: 'school' },
    sports: { icon: '⚽', label: 'Sports', color: 'sports' },
    politics: { icon: '🏛️', label: 'Politics', color: 'politics' },
    grading: { icon: '📝', label: 'Grading', color: 'grading' }
  },
  
  // Fetch categories from Firebase
  async fetchCategories() {
    try {
      const querySnapshot = await getDocs(categoriesRef);
      const categories = {};
      querySnapshot.forEach((doc) => {
        categories[doc.id] = doc.data();
      });
      
      // If no categories in Firebase, initialize with defaults
      if (Object.keys(categories).length === 0) {
        console.log('No categories in Firebase, initializing with defaults...');
        await this.initializeCategoriesWithDefaults();
        this.categories = { ...this.defaultCategories };
      } else {
        this.categories = categories;
      }
      
      return this.categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      this.categories = { ...this.defaultCategories };
      return this.categories;
    }
  },
  
  // Initialize Firebase with default categories
  async initializeCategoriesWithDefaults() {
    try {
      for (const [id, category] of Object.entries(this.defaultCategories)) {
        await setDoc(doc(categoriesRef, id), category);
      }
      console.log('Categories initialized in Firebase');
    } catch (error) {
      console.error('Error initializing categories:', error);
    }
  },
  
  // Add a new category (ADMIN ONLY)
  async addCategory(id, icon, label, color) {
    requireAdmin(); // Security check
    
    try {
      const categoryData = { icon, label, color: color || id };
      await setDoc(doc(categoriesRef, id), categoryData);
      this.categories[id] = categoryData;
      console.log('Category added:', id);
      return { success: true, category: categoryData };
    } catch (error) {
      console.error('Error adding category:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Update a category (ADMIN ONLY)
  async updateCategory(id, updates) {
    requireAdmin(); // Security check
    
    try {
      await updateDoc(doc(categoriesRef, id), updates);
      this.categories[id] = { ...this.categories[id], ...updates };
      console.log('Category updated:', id);
      return { success: true };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Delete a category (ADMIN ONLY)
  async deleteCategory(id) {
    requireAdmin(); // Security check
    
    try {
      await deleteDoc(doc(categoriesRef, id));
      delete this.categories[id];
      console.log('Category deleted:', id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get all categories
  getCategories() {
    return this.categories;
  },
  
  // Get a single category
  getCategory(id) {
    return this.categories[id] || { icon: '📊', label: 'Other', color: 'other' };
  },
  
  // ========================================
  // SUGGESTIONS
  // ========================================
  
  // Submit a market suggestion
  async submitSuggestion(title, category, reason, userId, userEmail, userName) {
    try {
      const suggestionId = 'sug_' + Date.now();
      const suggestion = {
        id: suggestionId,
        title: title,
        category: category || null,
        reason: reason || '',
        userId: userId || null,
        userEmail: userEmail || 'Anonymous',
        userName: userName || 'Anonymous',
        status: 'pending', // pending, approved, rejected
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(suggestionsRef, suggestionId), suggestion);
      console.log('Suggestion submitted:', suggestionId);
      return { success: true, id: suggestionId };
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get all suggestions (for admin)
  async getSuggestions() {
    try {
      const querySnapshot = await getDocs(suggestionsRef);
      const suggestions = [];
      querySnapshot.forEach((doc) => {
        suggestions.push({ id: doc.id, ...doc.data() });
      });
      // Sort by date, newest first
      suggestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return suggestions;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  },
  
  // Update suggestion status (ADMIN ONLY)
  async updateSuggestionStatus(suggestionId, status) {
    requireAdmin(); // Security check
    
    try {
      await updateDoc(doc(suggestionsRef, suggestionId), { status });
      return { success: true };
    } catch (error) {
      console.error('Error updating suggestion:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Delete a suggestion (ADMIN ONLY)
  async deleteSuggestion(suggestionId) {
    requireAdmin(); // Security check
    
    try {
      await deleteDoc(doc(suggestionsRef, suggestionId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      return { success: false, error: error.message };
    }
  },

  // Initialize data - load from Firebase
  async init() {
    if (this.isInitialized) {
      return this.cachedMarkets;
    }
    
    try {
      // Load categories first
      await this.fetchCategories();
      
      const markets = await this.fetchMarketsFromFirebase();
      
      // If no markets in Firebase, initialize with defaults
      if (markets.length === 0) {
        console.log('No markets in Firebase, initializing with defaults...');
        await this.initializeFirebaseWithDefaults();
        this.cachedMarkets = this.defaultMarkets;
      } else {
        this.cachedMarkets = markets;
      }
      
      this.isInitialized = true;
      return this.cachedMarkets;
    } catch (error) {
      console.error('Error initializing MulonData:', error);
      // Fallback to defaults if Firebase fails
      this.cachedMarkets = this.defaultMarkets;
      return this.cachedMarkets;
    }
  },

  // Fetch all markets from Firebase
  async fetchMarketsFromFirebase() {
    try {
      const querySnapshot = await getDocs(marketsRef);
      const markets = [];
      querySnapshot.forEach((doc) => {
        markets.push({ id: doc.id, ...doc.data() });
      });
      return markets;
    } catch (error) {
      console.error('Error fetching markets from Firebase:', error);
      return [];
    }
  },

  // Initialize Firebase with default markets
  async initializeFirebaseWithDefaults() {
    try {
      for (const market of this.defaultMarkets) {
        await setDoc(doc(marketsRef, market.id), market);
      }
      console.log('Firebase initialized with default markets');
    } catch (error) {
      console.error('Error initializing Firebase with defaults:', error);
    }
  },

  // Transfer localStorage data to Firebase (one-time migration)
  async transferFromLocalStorage() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      console.log('No localStorage data to transfer');
      return false;
    }
    
    try {
      const markets = JSON.parse(stored);
      console.log(`Transferring ${markets.length} markets to Firebase...`);
      
      for (const market of markets) {
        await setDoc(doc(marketsRef, market.id), market);
        console.log(`Transferred: ${market.title}`);
      }
      
      console.log('Transfer complete!');
      // Clear localStorage after successful transfer
      // localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error transferring to Firebase:', error);
      return false;
    }
  },

  // Get all markets (from cache, refreshes from Firebase)
  async getMarkets() {
    if (!this.isInitialized) {
      await this.init();
    }
    return this.cachedMarkets;
  },

  // Get markets synchronously (uses cache)
  getMarketsSync() {
    return this.cachedMarkets;
  },

  // Refresh cache from Firebase
  async refreshMarkets() {
    this.cachedMarkets = await this.fetchMarketsFromFirebase();
    return this.cachedMarkets;
  },

  // Add a new market (ADMIN ONLY)
  async addMarket(market) {
    requireAdmin(); // Security check
    
    const newMarket = {
      id: 'market_' + Date.now(),
      ...market,
      createdAt: new Date().toISOString(),
      status: 'active',
      totalShares: { yes: 0, no: 0 },
      orderBookId: 'market_' + Date.now()
    };
    
    try {
      await setDoc(doc(marketsRef, newMarket.id), newMarket);
      
      // Initialize empty order book for this market
      await OrderBook.initBook(newMarket.id);
      
      this.cachedMarkets.push(newMarket);
      console.log('Market added:', newMarket.title);
      return newMarket;
    } catch (error) {
      console.error('Error adding market:', error);
      return null;
    }
  },

  // Update a market (ADMIN ONLY)
  async updateMarket(id, updates) {
    requireAdmin(); // Security check
    
    try {
      const marketRef = doc(marketsRef, id);
      await updateDoc(marketRef, updates);
      
      // Update cache
      const index = this.cachedMarkets.findIndex(m => m.id === id);
      if (index !== -1) {
        this.cachedMarkets[index] = { ...this.cachedMarkets[index], ...updates };
      }
      
      console.log('Market updated:', id);
      return this.cachedMarkets[index];
    } catch (error) {
      console.error('Error updating market:', error);
      return null;
    }
  },

  // Resolve a market and pay out winners (ADMIN ONLY)
  async resolveMarket(marketId, outcome) {
    requireAdmin(); // Security check
    
    try {
      const market = this.getMarket(marketId);
      if (!market) {
        return { success: false, error: 'Market not found' };
      }
      
      if (market.resolved) {
        return { success: false, error: 'Market already resolved' };
      }
      
      // Get all users and find positions in this market
      const usersSnapshot = await getDocs(usersRef);
      let payoutCount = 0;
      const cashOuts = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const positions = userData.positions || [];
        
        // Find positions for this market
        const marketPositions = positions.filter(p => p.marketId === marketId);
        
        if (marketPositions.length > 0) {
          let totalPayout = 0;
          const newPositions = positions.filter(p => p.marketId !== marketId);
          const resolvedPositions = [];
          
          for (const pos of marketPositions) {
            const won = pos.choice === outcome;
            const payout = won ? pos.shares : 0; // Each share pays $1 if correct
            
            resolvedPositions.push({
              marketId: marketId,
              marketTitle: market.title,
              position: pos.choice,
              shares: pos.shares,
              avgPrice: pos.avgPrice || Math.round((pos.costBasis / pos.shares) * 100) / 100,
              cost: pos.costBasis,
              outcome: outcome,
              won: won,
              payout: payout,
              timestamp: new Date().toISOString()
            });
            
            if (won) {
              totalPayout += payout;
              payoutCount++;
            }
          }
          
          // Update user: remove positions, add payout to balance, add to cashOuts
          // Winners also get +10 keys
          const userCashOuts = userData.cashOuts || [];
          const newBalance = (userData.balance || 0) + totalPayout;
          const hasWinningPosition = resolvedPositions.some(p => p.won);
          const currentKeys = userData.keys || 0;
          
          const updateData = {
            positions: newPositions,
            balance: Math.round(newBalance * 100) / 100,
            cashOuts: [...userCashOuts, ...resolvedPositions]
          };
          
          // Add +10 keys if user had any winning positions
          if (hasWinningPosition) {
            updateData.keys = currentKeys + 10;
          }
          
          await updateDoc(doc(usersRef, userDoc.id), updateData);
          
          cashOuts.push(...resolvedPositions);
        }
      }
      
      // Mark market as resolved
      await this.updateMarket(marketId, {
        resolved: true,
        resolvedOutcome: outcome,
        resolvedAt: new Date().toISOString()
      });
      
      console.log(`Market ${marketId} resolved as ${outcome}. ${payoutCount} winning positions paid out.`);
      
      return { 
        success: true, 
        payoutCount: payoutCount,
        cashOuts: cashOuts
      };
    } catch (error) {
      console.error('Error resolving market:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete a market (ADMIN ONLY)
  async deleteMarket(id) {
    requireAdmin(); // Security check
    
    try {
      await deleteDoc(doc(marketsRef, id));
      this.cachedMarkets = this.cachedMarkets.filter(m => m.id !== id);
      console.log('Market deleted:', id);
      return this.cachedMarkets;
    } catch (error) {
      console.error('Error deleting market:', error);
      return this.cachedMarkets;
    }
  },

  // Get market by ID
  getMarket(id) {
    return this.cachedMarkets.find(m => m.id === id);
  },

  // Get market by ID from Firebase
  async getMarketFromFirebase(id) {
    try {
      const marketDoc = await getDoc(doc(marketsRef, id));
      if (marketDoc.exists()) {
        return { id: marketDoc.id, ...marketDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching market:', error);
      return null;
    }
  },

  // Get markets by category
  getMarketsByCategory(category) {
    if (category === 'all') return this.cachedMarkets;
    return this.cachedMarkets.filter(m => m.category === category);
  },

  // Get featured markets
  getFeaturedMarkets() {
    return this.cachedMarkets.filter(m => m.featured);
  },

  // Get active markets
  getActiveMarkets() {
    return this.cachedMarkets.filter(m => m.status === 'active');
  },

  // Format volume for display
  formatVolume(volume) {
    if (volume >= 1000) {
      return '$' + (volume / 1000).toFixed(1) + 'k Vol.';
    }
    return '$' + volume + ' Vol.';
  },

  // Format date for display
  formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  },

  // Calculate days until end
  getDaysUntil(endDate) {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Ended';
    if (diff === 1) return 'Ends tomorrow';
    return `Ends in ${diff} days`;
  },

  // Reset to default markets in Firebase (ADMIN ONLY)
  async resetToDefaults() {
    requireAdmin(); // Security check
    
    try {
      // Delete all existing markets
      const querySnapshot = await getDocs(marketsRef);
      const deletePromises = [];
      querySnapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(marketsRef, document.id)));
      });
      await Promise.all(deletePromises);
      
      // Add default markets
      await this.initializeFirebaseWithDefaults();
      this.cachedMarkets = [...this.defaultMarkets];
      
      console.log('Reset to defaults complete');
      return this.cachedMarkets;
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      return this.cachedMarkets;
    }
  },

  // Get all trades for a market with user information (for admin)
  async getMarketTradesWithUsers(marketId) {
    try {
      // Get all trades for this market
      const tradesSnapshot = await getDocs(tradesRef);
      const trades = [];
      const userIds = new Set();
      
      tradesSnapshot.forEach((document) => {
        const trade = document.data();
        if (trade.marketId === marketId) {
          trades.push(trade);
          if (trade.userId) {
            userIds.add(trade.userId);
          }
        }
      });
      
      // Sort by timestamp descending
      trades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Fetch user info for all unique users
      const usersMap = {};
      for (const userId of userIds) {
        try {
          const userDoc = await getDoc(doc(usersRef, userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            usersMap[userId] = {
              displayName: userData.displayName || 'Anonymous',
              email: userData.email || 'Unknown',
              photoURL: userData.photoURL || null
            };
          } else {
            usersMap[userId] = {
              displayName: 'Unknown User',
              email: 'N/A',
              photoURL: null
            };
          }
        } catch (err) {
          usersMap[userId] = {
            displayName: 'Unknown User',
            email: 'N/A',
            photoURL: null
          };
        }
      }
      
      // Attach user info to each trade
      const tradesWithUsers = trades.map(trade => ({
        ...trade,
        user: usersMap[trade.userId] || { displayName: 'Guest', email: 'N/A', photoURL: null }
      }));
      
      return tradesWithUsers;
    } catch (error) {
      console.error('Error fetching market trades with users:', error);
      return [];
    }
  },

  // Get all positions for a market (who currently holds what)
  async getMarketPositions(marketId) {
    try {
      const usersSnapshot = await getDocs(usersRef);
      const positions = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userPositions = userData.positions || [];
        
        const marketPos = userPositions.find(p => p.marketId === marketId);
        if (marketPos) {
          positions.push({
            userId: userDoc.id,
            displayName: userData.displayName || 'Anonymous',
            email: userData.email || 'Unknown',
            photoURL: userData.photoURL || null,
            ...marketPos
          });
        }
      }
      
      // Sort by shares descending
      positions.sort((a, b) => b.shares - a.shares);
      return positions;
    } catch (error) {
      console.error('Error fetching market positions:', error);
      return [];
    }
  },

  // Get all users (for admin)
  async getAllUsers() {
    try {
      const usersSnapshot = await getDocs(usersRef);
      const users = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        users.push({
          id: userDoc.id,
          displayName: userData.displayName || 'Anonymous',
          avatarStyle: userData.avatarStyle || '',
          leaderStyle: userData.leaderStyle || '',
          overUnderSynced: userData.overUnderSynced || false,
          email: userData.email || 'Unknown',
          photoURL: userData.photoURL || null,
          dailyStreak: userData.dailyStreak || 0,
          lastDailyKeyClaim: userData.lastDailyKeyClaim || '',
          casinoStats: userData.casinoStats || {totalWon: 0, totalWagered: 0, gamesPlayed: 0},
          keys: userData.keys || 0,
          xps: userData.xps || 0,
          xpStats: userData.xpStats || {bestStreak: 0, totalEarned: 0},
          cards: userData.cards || [],
          balance: userData.balance || 0,
          positions: userData.positions || [],
          transactions: userData.transactions || [],
          createdAt: userData.createdAt || null,
          lastLoginAt: userData.lastLoginAt || null,
          plinkoBalls: userData.plinkoBalls || 0
        });
      }
      
      // Sort by balance descending
      users.sort((a, b) => b.balance - a.balance);
      return users;
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  },

  // Update a user's name (for admin)
  async updateUserName(userId, newName) {
    requireAdmin(); // Security check
    
    try {
      await updateDoc(doc(usersRef, userId), {
        displayName: newName
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating username:', error);
      return { success: false, error: error.message };
    }
  },

  // Update a user's avatar style (for admin)
  async updateAvatarStyle(userId, newAvatarStyle) {
    requireAdmin(); // Security check
    
    try {
      await updateDoc(doc(usersRef, userId), {
        avatarStyle: newAvatarStyle
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating avatar style:', error);
      return { success: false, error: error.message };
    }
  },

  async getLeaderboardStyle(user) {
    if (user.leaderStyle) {
      return user.leaderStyle;
    }
    if (user.email) {
      try {
          const ouQuery = query(ouUsersRef, where('email', '==', user.email));
          const ouSnapshot = await getDocs(ouQuery);
          if (!ouSnapshot.empty) {
              const ouUserData = ouSnapshot.docs[0].data();
              if (ouUserData.leaderStyle && ouUserData.leaderStyle.trim() !== '') {
                  return ouUserData.leaderStyle;
              }
          }
      } catch (e) {
          return '';
      }
    }
    return '';
  },

  // Update a user's leaderboard style (for admin)
  async updateLeaderStyle(userId, newLeaderStyle) {
    requireAdmin(); // Security check
    
    try {
      await updateDoc(doc(usersRef, userId), {
        leaderStyle: newLeaderStyle
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating leaderboard style:', error);
      return { success: false, error: error.message };
    }
  },

  // Update a user's balance (ADMIN ONLY)
  async updateUserBalance(userId, newBalance) {
    requireAdmin(); // Security check
    
    try {
      // Get current balance for logging
      const userDoc = await getDoc(doc(usersRef, userId));
      const beforeBalance = userDoc.exists() ? (userDoc.data().balance || 0) : 0;
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      const finalBalance = Math.round(newBalance * 100) / 100;
      await updateDoc(doc(usersRef, userId), {
        balance: finalBalance
      });
      
      // Log admin action
      await logAdminAction('balance_update', {
        targetUserId: userId,
        targetUserEmail: userData.email || null,
        targetUserName: userData.displayName || null,
        beforeValue: beforeBalance,
        afterValue: finalBalance
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user balance:', error);
      return { success: false, error: error.message };
    }
  },

  // Update a user's keys (ADMIN ONLY)
  async updateUserKeys(userId, newKeys) {
    requireAdmin(); // Security check
    
    try {
      // Get current keys for logging
      const userDoc = await getDoc(doc(usersRef, userId));
      const beforeKeys = userDoc.exists() ? (userDoc.data().keys || 0) : 0;
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      const finalKeys = Math.max(0, Math.round(newKeys));
      await updateDoc(doc(usersRef, userId), {
        keys: finalKeys
      });
      
      // Log admin action
      await logAdminAction('keys_update', {
        targetUserId: userId,
        targetUserEmail: userData.email || null,
        targetUserName: userData.displayName || null,
        beforeValue: beforeKeys,
        afterValue: finalKeys
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user keys:', error);
      return { success: false, error: error.message };
    }
  },

  // Update a user's XP (for admin)
  async updateUserXP(userId, newXP) {
    requireAdmin(); // Security check
    
    try {
      await updateDoc(doc(usersRef, userId), {
        xps: Math.max(0, Math.round(newXP))
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating user XP:', error);
      return { success: false, error: error.message };
    }
  },

  async getUserCards(userId) {
    let userOwnedCards = [];
    try {
      const cardsCollectionRef = collection(db, 'mulon_users', userId, 'cards');
      const q = query(cardsCollectionRef, where('hasCard', '==', true));
      const snapshot = await getDocs(q);
      
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

    return userOwnedCards;
  },

  // Add to a user's cards (for admin)
  async addUserCard(userId, newCard) {
    requireAdmin(); // Security check
    
    try {
      const cardsCollectionRef = collection(db, 'mulon_users', userId, 'cards');
      await addDoc(cardsCollectionRef, newCard);
      return { success: true };
    } catch (error) {
      console.error('Error updating user cards:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove a user's card (for admin)
  async removeUserCard(userId, docId) {
    requireAdmin(); // Security check
    
    try {
      const cardsCollectionRef = collection(db, 'mulon_users', userId, 'cards');
      const docRef = doc(db, 'mulon_uesrs', userId, 'cards', docId);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      console.error('Error updating user cards:', error);
      return { success: false, error: error.message };
    }
  },

  // Update a user's Plinko balls (for admin)
  async updateUserPlinkoBalls(userId, newBalls) {
    requireAdmin(); // Security check
    
    try {
      await updateDoc(doc(usersRef, userId), {
        plinkoBalls: newBalls
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating user Plinko balls:', error);
      return { success: false, error: error.message };
    }
  },

  // Bulk update all users' keys (ADMIN ONLY)
  async bulkUpdateKeys(amount, operation = 'add') {
    requireAdmin(); // Security check
    
    try {
      const usersSnapshot = await getDocs(usersRef);
      let updatedCount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const currentKeys = userData.keys || 0;
        
        let newKeys;
        if (operation === 'set') {
          newKeys = amount;
        } else if (operation === 'add') {
          newKeys = currentKeys + amount;
        } else if (operation === 'subtract') {
          newKeys = Math.max(0, currentKeys - amount);
        } else if (operation === 'multiply') {
          newKeys = currentKeys * amount;
        }
        
        newKeys = Math.max(0, Math.round(newKeys));
        
        await updateDoc(doc(usersRef, userDoc.id), {
          keys: newKeys
        });
        updatedCount++;
      }
      
      // Log admin action
      await logAdminAction('bulk_keys_update', {
        operation,
        amount,
        usersAffected: updatedCount
      });
      
      return { success: true, updatedCount };
    } catch (error) {
      console.error('Error bulk updating keys:', error);
      return { success: false, error: error.message };
    }
  },

  // Add/subtract amount from user's balance (ADMIN ONLY)
  async adjustUserBalance(userId, amount) {
    requireAdmin(); // Security check
    
    try {
      const userDoc = await getDoc(doc(usersRef, userId));
      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }
      
      const currentBalance = userDoc.data().balance || 0;
      const newBalance = Math.round((currentBalance + amount) * 100) / 100;
      
      await updateDoc(doc(usersRef, userId), {
        balance: newBalance
      });
      
      return { success: true, newBalance };
    } catch (error) {
      console.error('Error adjusting user balance:', error);
      return { success: false, error: error.message };
    }
  },

  // Bulk update all users' balances (ADMIN ONLY)
  async bulkUpdateBalances(amount, operation = 'add') {
    requireAdmin(); // Security check
    
    try {
      const usersSnapshot = await getDocs(usersRef);
      let updatedCount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const currentBalance = userData.balance || 0;
        
        let newBalance;
        if (operation === 'set') {
          newBalance = amount;
        } else if (operation === 'add') {
          newBalance = currentBalance + amount;
        } else if (operation === 'subtract') {
          newBalance = Math.max(0, currentBalance - amount);
        } else if (operation === 'multiply') {
          newBalance = currentBalance * amount;
        }
        
        newBalance = Math.round(newBalance * 100) / 100;
        
        await updateDoc(doc(usersRef, userDoc.id), {
          balance: newBalance
        });
        updatedCount++;
      }
      
      // Log admin action
      await logAdminAction('bulk_balance_update', {
        operation,
        amount,
        usersAffected: updatedCount
      });
      
      return { success: true, updatedCount };
    } catch (error) {
      console.error('Error bulk updating balances:', error);
      return { success: false, error: error.message };
    }
  },

  // Reset a single user's positions (ADMIN ONLY)
  // Also reduces market volumes and cleans up central positions
  async resetUserPositions(userId) {
    requireAdmin(); // Security check
    
    try {
      const userDoc = await getDoc(doc(usersRef, userId));
      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }
      
      const userData = userDoc.data();
      const positions = userData.positions || [];
      const positionsCount = positions.length;
      
      // Reduce volume for each market and clean up
      for (const position of positions) {
        const volumeToRemove = Math.round(position.costBasis || 0);
        
        // Reduce market volume
        if (volumeToRemove > 0) {
          const market = this.getMarket(position.marketId);
          if (market) {
            const newVolume = Math.max(0, (market.volume || 0) - volumeToRemove);
            await this.updateMarket(position.marketId, { volume: newVolume });
          }
        }
        
        // Delete from central positions collection
        if (position.tradeIds) {
          for (const tradeId of position.tradeIds) {
            try {
              await deleteDoc(doc(positionsRef, tradeId));
              await deleteDoc(doc(tradesRef, tradeId));
            } catch (err) {
              console.warn('Could not delete position/trade:', tradeId);
            }
          }
        }
      }
      
      // Clear user's positions
      await updateDoc(doc(usersRef, userId), {
        positions: []
      });
      
      // Log admin action
      await logAdminAction('user_positions_reset', {
        targetUserId: userId,
        targetUserEmail: userData.email || null,
        targetUserName: userData.displayName || null,
        positionsDeleted: positionsCount
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error resetting user positions:', error);
      return { success: false, error: error.message };
    }
  },

  // Reset ALL users' positions (ADMIN ONLY)
  // Also resets all market volumes and cleans up central collections
  async resetAllUsersPositions() {
    requireAdmin(); // Security check
    
    try {
      const usersSnapshot = await getDocs(usersRef);
      let resetCount = 0;
      
      // Collect all volume changes per market
      const volumeChanges = {};
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const positions = userData.positions || [];
        
        // Sum up volume to remove per market
        for (const position of positions) {
          const volumeToRemove = Math.round(position.costBasis || 0);
          if (volumeToRemove > 0) {
            volumeChanges[position.marketId] = (volumeChanges[position.marketId] || 0) + volumeToRemove;
          }
          
          // Delete from central positions collection
          if (position.tradeIds) {
            for (const tradeId of position.tradeIds) {
              try {
                await deleteDoc(doc(positionsRef, tradeId));
                await deleteDoc(doc(tradesRef, tradeId));
              } catch (err) {
                console.warn('Could not delete position/trade:', tradeId);
              }
            }
          }
        }
        
        await updateDoc(doc(usersRef, userDoc.id), {
          positions: []
        });
        resetCount++;
      }
      
      // Apply volume reductions to markets
      for (const [marketId, volumeToRemove] of Object.entries(volumeChanges)) {
        const market = this.getMarket(marketId);
        if (market) {
          const newVolume = Math.max(0, (market.volume || 0) - volumeToRemove);
          await this.updateMarket(marketId, { volume: newVolume });
        }
      }
      
      return { success: true, resetCount };
    } catch (error) {
      console.error('Error resetting all positions:', error);
      return { success: false, error: error.message };
    }
  },

  // Full user reset - balance and positions (ADMIN ONLY)
  async resetUser(userId, newBalance = 500) {
    requireAdmin(); // Security check
    
    try {
      await updateDoc(doc(usersRef, userId), {
        balance: newBalance,
        positions: []
      });
      return { success: true };
    } catch (error) {
      console.error('Error resetting user:', error);
      return { success: false, error: error.message };
    }
  },

  // Full reset for ALL users - balance and positions (ADMIN ONLY)
  async resetAllUsers(newBalance = 500) {
    requireAdmin(); // Security check
    
    try {
      const usersSnapshot = await getDocs(usersRef);
      let resetCount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        await updateDoc(doc(usersRef, userDoc.id), {
          balance: newBalance,
          positions: []
        });
        resetCount++;
      }
      
      return { success: true, resetCount };
    } catch (error) {
      console.error('Error resetting all users:', error);
      return { success: false, error: error.message };
    }
  },

  // Update a specific position for a user (ADMIN ONLY)
  async updateUserPosition(userId, marketId, updates) {
    requireAdmin(); // Security check
    
    try {
      const userDoc = await getDoc(doc(usersRef, userId));
      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }
      
      const userData = userDoc.data();
      const positions = userData.positions || [];
      const posIndex = positions.findIndex(p => p.marketId === marketId);
      
      if (posIndex === -1) {
        return { success: false, error: 'Position not found' };
      }
      
      // Update the position
      positions[posIndex] = {
        ...positions[posIndex],
        ...updates
      };
      
      await updateDoc(doc(usersRef, userId), { positions });
      return { success: true };
    } catch (error) {
      console.error('Error updating user position:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete a specific position for a user (ADMIN ONLY)
  // Also reduces market volume and removes from central positions collection
  async deleteUserPosition(userId, marketId) {
    requireAdmin(); // Security check
    
    try {
      const userDoc = await getDoc(doc(usersRef, userId));
      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }
      
      const userData = userDoc.data();
      const positions = userData.positions || [];
      const positionToDelete = positions.find(p => p.marketId === marketId);
      
      if (!positionToDelete) {
        return { success: false, error: 'Position not found' };
      }
      
      // Get the cost basis (volume to subtract from market)
      const volumeToRemove = Math.round(positionToDelete.costBasis || 0);
      
      // Remove from user's positions
      const newPositions = positions.filter(p => p.marketId !== marketId);
      await updateDoc(doc(usersRef, userId), { positions: newPositions });
      
      // Reduce market volume
      if (volumeToRemove > 0) {
        const market = this.getMarket(marketId);
        if (market) {
          const newVolume = Math.max(0, (market.volume || 0) - volumeToRemove);
          await this.updateMarket(marketId, { volume: newVolume });
        }
      }
      
      // Delete from central positions collection (by trade IDs)
      if (positionToDelete.tradeIds && positionToDelete.tradeIds.length > 0) {
        for (const tradeId of positionToDelete.tradeIds) {
          try {
            await deleteDoc(doc(positionsRef, tradeId));
            // Also delete from trades collection
            await deleteDoc(doc(tradesRef, tradeId));
          } catch (err) {
            console.warn('Could not delete position/trade:', tradeId, err);
          }
        }
      }
      
      // Also try to find and delete any trades by this user for this market
      try {
        const tradesSnapshot = await getDocs(tradesRef);
        for (const tradeDoc of tradesSnapshot.docs) {
          const trade = tradeDoc.data();
          if (trade.userId === userId && trade.marketId === marketId) {
            await deleteDoc(doc(tradesRef, tradeDoc.id));
          }
        }
      } catch (err) {
        console.warn('Could not clean up related trades:', err);
      }
      
      return { success: true, volumeRemoved: volumeToRemove };
    } catch (error) {
      console.error('Error deleting user position:', error);
      return { success: false, error: error.message };
    }
  },

  // Get fresh user data (for admin - bypasses cache)
  async getUserById(userId) {
    try {
      const userDoc = await getDoc(doc(usersRef, userId));
      if (!userDoc.exists()) {
        return null;
      }
      const userData = userDoc.data();
      return {
        id: userDoc.id,
        displayName: userData.displayName || 'Anonymous',
        email: userData.email || 'Unknown',
        photoURL: userData.photoURL || null,
        balance: userData.balance || 0,
        positions: userData.positions || [],
        createdAt: userData.createdAt || null,
        lastLoginAt: userData.lastLoginAt || null
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }
};

// Make MulonData globally available
window.MulonData = MulonData;
window.Auth = Auth;

// Export for ES modules
export { MulonData, OrderBook, Auth, UserData, OnboardingState, OverUnderSync, db, auth, marketsRef, categoriesRef, suggestionsRef, positionsRef, tradesRef };
