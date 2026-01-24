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

import { Auth, UserData } from '../../js/data.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();


// ========================================
// CASINO DATABASE
// ========================================
export const CasinoData = {
  // Update balance (positive = add, negative = subtract)
  async updateBalance(amount) {
    if (!Auth.currentUser) {
      console.warn('Cannot update balance: Not signed in');
      return null;
    }
    
    try {
      const userId = Auth.currentUser.uid;
      const newBalance = Math.max(0, Math.round((UserData.getBalance() + amount) * 100) / 100);
      
      await updateDoc(doc(db, 'mulon_users', userId), {
        balance: newBalance
      });
      
      UserData.data.balance = newBalance;
      return newBalance;
    } catch (error) {
      console.error('Error updating balance:', error);
      return null;
    }
  },

  getKeys() {
    return UserData.data.keys ?? 40;
  },
  
  // Get plinko balls remaining
  getPlinkoBalls() {
    return UserData.data.plinkoBalls ?? 45;
  },
  
  // Place a bet
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
      
      UserData.data.balance = newBalance;
      
      return { success: true, newBalance };
    } catch (error) {
      console.error('Error placing bet:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Record a win
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
      
      UserData.data.balance = newBalance;
      
      return { success: true, newBalance };
    } catch (error) {
      console.error('Error recording win:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Record a loss (deducts 1 key)
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
  
  // Use a plinko ball (deducts 1 ball, or 1 key if out of balls)
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
  
  // Get current balance (synced from DB)
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
  
  // Track pending plinko balls (for refresh penalty)
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
  
  // Get pending plinko balls count
  getPendingPlinkoBalls() {
    return UserData.data?.pendingPlinkoBalls ?? 0;
  },
  
  // Check and apply refresh penalty (called on page load)
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
          
          UserData.data.balance = newBalance;
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
