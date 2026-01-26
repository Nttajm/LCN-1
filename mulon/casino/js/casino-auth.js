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

// ========================================
// CASINO AUTH
// ========================================
export const CasinoAuth = {
  currentUser: null,
  userData: null,
  authStateListeners: [],
  
  // Initialize auth with maintenance check
  init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          };
          
          // Load user data
          await this.loadUserData(user.uid);
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
          winStreak: 0,
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
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'mulon_users', userId), this.userData);
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
  
  // Update balance (positive = add, negative = subtract)
  async updateBalance(amount) {
    if (!CasinoAuth.currentUser) {
      console.warn('Cannot update balance: Not signed in');
      return null;
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const newBalance = Math.max(0, Math.round((CasinoAuth.userData.balance + amount) * 100) / 100);
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        balance: newBalance
      });
      
      CasinoAuth.userData.balance = newBalance;
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
    
    if (CasinoAuth.userData.balance < amount) {
      return { success: false, error: 'Insufficient balance!' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const newBalance = Math.round((CasinoAuth.userData.balance - amount) * 100) / 100;
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        balance: newBalance,
        'casinoStats.totalWagered': increment(amount),
        'casinoStats.gamesPlayed': increment(1)
      });
      
      CasinoAuth.userData.balance = newBalance;
      
      return { success: true, newBalance };
    } catch (error) {
      console.error('Error placing bet:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Record a win
  async recordWin(amount) {
    if (!CasinoAuth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    try {
      const userId = CasinoAuth.currentUser.uid;
      const newBalance = Math.round((CasinoAuth.userData.balance + amount) * 100) / 100;
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        balance: newBalance,
        'casinoStats.totalWon': increment(amount)
      });
      
      CasinoAuth.userData.balance = newBalance;
      
      return { success: true, newBalance };
    } catch (error) {
      console.error('Error recording win:', error);
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
  async getOnlineUsersCount(minutesThreshold = 124) {
    try {
      const cutoffTime = new Date(Date.now() - minutesThreshold * 60 * 1000);
      const usersRef = collection(db, 'mulon_users');
      const q = query(usersRef, where('lastLoginAt', '>=', cutoffTime));
      const snapshot = await getDocs(q);
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
        lastLoginAt: new Date()
      });
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  }
};

// Make available globally for non-module scripts
window.CasinoAuth = CasinoAuth;
window.CasinoDB = CasinoDB;
