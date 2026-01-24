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
    increment
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

import { Auth, UserData } from '../../js/data.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ========================================
// CASINO DATABASE
// ========================================
export const CasinoData = {
  /**
   * Get the number of keys a user has.
   * @returns {number} The number of keys
   */
  getKeys() {
    return UserData.data.keys ?? 40;
  },
  
  /**
   * Get the number of Plinko balls a user has.
   * @returns {number} The number of Plinko balls
   */
  getPlinkoBalls() {
    return UserData.data.plinkoBalls ?? 45;
  },
  
  /**
   * Place a bet.
   * @param {number} amount The amount to bet
   * @param {*} game The game to bet on (unused)
   * @returns {*} {success, error}
   */
  async placeBet(amount, game) {
    if (!Auth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    if (UserData.data.balance < amount) {
      return { success: false, error: 'Insufficient balance!' };
    }
    
    try {
      const userId = Auth.currentUser.uid;
      const newBalance = Math.round((UserData.getBalance() - amount) * 100) / 100;
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        balance: newBalance,
        'casinoStats.totalWagered': increment(amount),
        'casinoStats.gamesPlayed': increment(1)
      });
      
      UserData.setBalance(newBalance);
      
      return { success: true, newBalance };
    } catch (error) {
      console.error('Error placing bet:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Record a win.
   * @param {number} amount The amount won
   * @returns {*} {success, error}
   */
  async recordWin(amount) {
    if (!Auth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    try {
      const userId = Auth.currentUser.uid;
      const newBalance = Math.round((UserData.getBalance() + amount) * 100) / 100;
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        balance: newBalance,
        'casinoStats.totalWon': increment(amount)
      });
      
      UserData.setBalance(newBalance);
      
      return { success: true, newBalance };
    } catch (error) {
      console.error('Error recording win:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Record a loss.
   * @param {*} game The game lost (unused)
   * @returns {*} {success, error}
   */
  async recordLoss(game) {
    if (!Auth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    try {
      const userId = Auth.currentUser.uid;
      const currentKeys = UserData.data.keys ?? 30;
      const newKeys = Math.max(0, currentKeys - 1);
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        keys: newKeys
      });
      
      UserData.data.keys = newKeys;
      
      return { success: true, newKeys };
    } catch (error) {
      console.error('Error recording loss:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Use a Plinko ball. If the user doesn't have a Plinko ball, one key will be turned into some Plinko balls.
   * Returns unsuccessful if the user has no more keys.
   * @returns {*} {success, error}
   */
  async usePlinkoBall() {
    if (!Auth.currentUser) {
      return { success: false, error: 'Not signed in' };
    }
    
    try {
      const userId = Auth.currentUser.uid;
      let currentBalls = UserData.data.plinkoBalls ?? 45;
      let currentKeys = UserData.data.keys ?? 30;
      
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
      
      UserData.data.plinkoBalls = newBalls;
      UserData.data.keys = currentKeys;
      
      return { success: true, ballsLeft: newBalls, keysLeft: currentKeys };
    } catch (error) {
      console.error('Error using plinko ball:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Refresh the user's balance and Plinko balls.
   * @returns {number} The user's balance, or null if it could not be refreshed
   */
  async refreshBalance() {
    if (!Auth.currentUser) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'mulon_users', Auth.currentUser.uid));
      if (userDoc.exists()) {
        UserData.data.balance = userDoc.data().balance;
        UserData.data.plinkoBalls = userDoc.data().plinkoBalls ?? 45;
        return UserData.data.balance;
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
    return null;
  },
  
  /**
   * Set the number of pending Plinko balls (Plinko balls actively falling through the pegs).
   * Used for applying a penalty if the user tries to refresh the page to avoid a bad outcome.
   * @param {number} count The number of pending Plinko balls
   * @returns 
   */
  async setPendingPlinkoBalls(count) {
    if (!Auth.currentUser) return;
    
    try {
      const userId = Auth.currentUser.uid;
      await updateDoc(doc(db, 'mulon_users', userId), {
        pendingPlinkoBalls: count
      });
      UserData.data.pendingPlinkoBalls = count;
    } catch (error) {
      console.error('Error setting pending balls:', error);
    }
  },
  
  /**
   * Get the number of pending Plinko balls (Plinko balls actively falling through the pegs).
   * @returns {number} The number of pending Plinko balls
   */
  getPendingPlinkoBalls() {
    return UserData.data?.pendingPlinkoBalls ?? 0;
  },
  
  /**
   * Checks if the user refreshed the page while Plinko balls were falling through the pegs.
   * Applies a penalty if so.
   * @returns {*} {penalty, ballsLost}
   */
  async checkRefreshPenalty() {
    if (!Auth.currentUser) return { penalty: 0 };
    
    try {
      const userId = Auth.currentUser.uid;
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
          
          UserData.setBalance(newBalance);
          UserData.data.pendingPlinkoBalls = 0;
          
          return { penalty: penaltyAmount, ballsLost: pendingBalls };
        }
      }
    } catch (error) {
      console.error('Error checking refresh penalty:', error);
    }
    
    return { penalty: 0, ballsLost: 0 };
  }
};

// Make available globally for non-module scripts
window.CasinoData = CasinoData;
