// ============================================================
// CASCADE - Authentication Module
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  signOut 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  addDoc,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// ============================================================
// Firebase Configuration
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDdV8dc3X5AKYMAkh6nQILYQUBpmJDGwf0",
  authDomain: "joelsnotesapp.firebaseapp.com",
  projectId: "joelsnotesapp",
  storageBucket: "joelsnotesapp.appspot.com",
  messagingSenderId: "1043222135072",
  appId: "1:1043222135072:web:b0ec2fe65119dc38c2d745",
  measurementId: "G-JVW0G994B5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// ============================================================
// State Management
// ============================================================

let isSigningIn = false;

// ============================================================
// UI Elements
// ============================================================

const getSigninBtn = () => document.getElementById('google-signin-btn') || document.querySelector('.js-signin-btn');
const getLoadingSpinner = () => document.querySelector('.signin-loading');
const getErrorMessage = () => document.querySelector('.signin-error');

// ============================================================
// Authentication Functions
// ============================================================

/**
 * Main Google Sign-In Handler
 */
async function authenticateWithGoogle() {
  if (isSigningIn) return;
  
  isSigningIn = true;
  updateSigninUI(true);
  
  try {
    // Sign in with Google
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    if (!user) {
      throw new Error('No user returned from authentication');
    }
    
    console.log('User authenticated:', user.email);
    
    // Create/update user profile in Firestore
    await createUserProfile(user);
    
    // Process any pending invitations
    await processPendingInvitations(user);
    
    // Redirect to main app
    redirectToApp();
    
  } catch (error) {
    console.error('Authentication failed:', error);
    handleAuthError(error);
  } finally {
    isSigningIn = false;
    updateSigninUI(false);
  }
}

/**
 * Create or update user profile in Firestore
 */
async function createUserProfile(user) {
  try {
    const userRef = doc(db, 'users', user.uid);
    
    // Check if user already exists
    const userSnap = await getDoc(userRef);
    const existingData = userSnap.exists() ? userSnap.data() : {};
    
    // Prepare user data
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL || null,
      createdAt: existingData.createdAt || serverTimestamp(),
      lastLogin: serverTimestamp(),
      isActive: true
    };
    
    // Save user profile
    await setDoc(userRef, userData, { merge: true });
    
    console.log('User profile created/updated:', user.email);
    
  } catch (error) {
    console.error('Failed to create user profile:', error);
    throw new Error('Failed to save user information');
  }
}

/**
 * Process pending board invitations for the user
 */
async function processPendingInvitations(user) {
  try {
    const pendingRef = collection(db, 'pendingInvites');
    const inviteQuery = query(pendingRef, where('email', '==', user.email.toLowerCase()));
    const inviteSnap = await getDocs(inviteQuery);
    
    if (inviteSnap.empty) {
      console.log('No pending invitations found');
      return;
    }
    
    console.log(`Processing ${inviteSnap.size} pending invitation(s)...`);
    
    // Use batch for atomic operations
    const batch = writeBatch(db);
    const processedInvites = [];
    
    for (const inviteDoc of inviteSnap.docs) {
      const invite = inviteDoc.data();
      const { boardId, role = 'viewer', invitedBy } = invite;
      
      try {
        // Add board to user's boards collection
        const userBoardRef = doc(db, 'users', user.uid, 'boards', boardId);
        batch.set(userBoardRef, {
          boardId,
          role,
          sharedBy: invitedBy,
          linkedAt: serverTimestamp()
        });
        
        // Add user to board's collaborators
        const boardCollabRef = doc(db, 'boards', boardId, 'collaborators', user.uid);
        batch.set(boardCollabRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || null,
          role,
          addedBy: invitedBy,
          addedAt: serverTimestamp()
        });
        
        // Add to board's users collection (for legacy compatibility)
        const boardUserRef = doc(db, 'boards', boardId, 'users', user.uid);
        batch.set(boardUserRef, {
          userId: user.uid,
          role,
          addedAt: serverTimestamp()
        });
        
        // Mark board as shared
        const boardRef = doc(db, 'boards', boardId);
        batch.update(boardRef, {
          type: 'shared'
        });
        
        // Delete the processed invite
        batch.delete(doc(db, 'pendingInvites', inviteDoc.id));
        
        processedInvites.push({ boardId, role });
        
      } catch (error) {
        console.error(`Failed to process invite for board ${boardId}:`, error);
      }
    }
    
    // Commit all operations
    if (processedInvites.length > 0) {
      await batch.commit();
      console.log(`Successfully processed ${processedInvites.length} invitation(s)`);
    }
    
  } catch (error) {
    console.error('Failed to process pending invitations:', error);
    // Don't throw here - let the user sign in even if invite processing fails
  }
}

/**
 * Handle authentication errors
 */
function handleAuthError(error) {
  let message = 'Sign-in failed. Please try again.';
  
  switch (error.code) {
    case 'auth/popup-blocked':
      message = 'Popup was blocked. Please allow popups and try again.';
      break;
    case 'auth/popup-closed-by-user':
      message = 'Sign-in was cancelled. Please try again.';
      break;
    case 'auth/network-request-failed':
      message = 'Network error. Please check your connection and try again.';
      break;
    case 'auth/too-many-requests':
      message = 'Too many attempts. Please wait a moment and try again.';
      break;
    default:
      if (error.message) {
        message = error.message;
      }
      break;
  }
  
  showError(message);
}

/**
 * Update sign-in UI state
 */
function updateSigninUI(isLoading) {
  const btn = getSigninBtn();
  const spinner = getLoadingSpinner();
  
  if (btn) {
    btn.disabled = isLoading;
    btn.textContent = isLoading ? 'Signing in...' : 'Continue with Google';
  }
  
  if (spinner) {
    spinner.style.display = isLoading ? 'block' : 'none';
  }
}

/**
 * Show error message to user
 */
function showError(message) {
  const errorEl = getErrorMessage();
  
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  } else {
    // Fallback to alert
    alert(message);
  }
}

/**
 * Redirect to main application
 */
function redirectToApp() {
  // Small delay to ensure Firestore operations complete
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 500);
}

// ============================================================
// Event Listeners & Initialization
// ============================================================

/**
 * Initialize the sign-in page
 */
function initializeSignin() {
  console.log('Initializing sign-in page...');
  
  // Bind sign-in button
  const signinBtn = getSigninBtn();
  if (signinBtn) {
    signinBtn.addEventListener('click', authenticateWithGoogle);
    console.log('Sign-in button found and bound');
  } else {
    console.warn('Sign-in button not found');
  }
  
  // Clear any existing error messages
  const errorEl = getErrorMessage();
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}

/**
 * Handle auth state changes
 */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('User already signed in:', user.email);
    
    // Only redirect if we're on the sign-in page
    if (window.location.pathname.includes('signin.html')) {
      redirectToApp();
    }
  } else {
    console.log('No user signed in');
    
    // If we're not on sign-in page and no user, redirect to sign-in
    if (!window.location.pathname.includes('signin.html')) {
      window.location.href = 'signin.html';
    }
  }
});

// ============================================================
// Page Load Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', initializeSignin);

// ============================================================
// Development Utilities
// ============================================================

// Expose functions for testing in development
if (typeof window !== 'undefined') {
  window.debugAuth = {
    signOut: () => signOut(auth),
    getCurrentUser: () => auth.currentUser,
    testSignIn: authenticateWithGoogle
  };
}
