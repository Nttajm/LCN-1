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
  
  // Initialize auth
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
          casinoStats: {
            totalWagered: 0,
            totalWon: 0,
            gamesPlayed: 0
          },
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'mulon_users', userId), this.userData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.userData = { balance: 500.00 };
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
    return this.userData?.keys ?? 30;
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
  
  // Get current balance (synced from DB)
  async refreshBalance() {
    if (!CasinoAuth.currentUser) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'mulon_users', CasinoAuth.currentUser.uid));
      if (userDoc.exists()) {
        CasinoAuth.userData.balance = userDoc.data().balance;
        return CasinoAuth.userData.balance;
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
    return null;
  }
};

// Make available globally for non-module scripts
window.CasinoAuth = CasinoAuth;
window.CasinoDB = CasinoDB;
