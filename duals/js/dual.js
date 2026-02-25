import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

// Use existing Firebase app or initialize
const firebaseConfig = {
  apiKey: "AIzaSyAGcg43F94bWqUuyLH-AjghrAfduEVQ8ZM",
  authDomain: "overunder-ths.firebaseapp.com",
  projectId: "overunder-ths",
  storageBucket: "overunder-ths.firebasestorage.app",
  messagingSenderId: "690530120785",
  appId: "1:690530120785:web:36dc297cb517ac76cb7470"
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// DOM Elements
const onboardingOverlay = document.getElementById('onboardingOverlay');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const usernameInput = document.getElementById('usernameInput');
const usernameError = document.getElementById('usernameError');
const submitUsernameBtn = document.getElementById('submitUsernameBtn');
const mainApp = document.getElementById('mainApp');
const welcomeMessage = document.getElementById('welcomeMessage');

// Segments
const segments = document.querySelectorAll('.onboarding-segment');

let currentUser = null;
let selectedGame = null;

// Modal functionality
function showDuelModal(userElement) {
  const modal = document.getElementById('duelModal');
  const userName = userElement.querySelector('.user-name').textContent;
  const userStatus = userElement.querySelector('.user-status').textContent;
  const userAvatar = userElement.querySelector('.user-avatar');
  
  // Update modal content
  document.getElementById('challengedName').textContent = userName;
  document.getElementById('challengedStatus').textContent = userStatus;
  document.getElementById('challengedStatus').className = `challenged-status ${userStatus.toLowerCase() === 'online' ? 'online' : ''}`;
  
  // Copy avatar styles
  const modalAvatar = document.getElementById('challengedAvatar');
  modalAvatar.style.background = userAvatar.style.background;
  modalAvatar.textContent = userAvatar.textContent;
  
  // Reset game selection
  selectedGame = null;
  document.querySelectorAll('.game-option').forEach(option => {
    option.classList.remove('selected');
  });
  document.getElementById('sendChallengeBtn').disabled = true;
  
  // Show modal
  modal.classList.add('show');
}

function hideDuelModal() {
  document.getElementById('duelModal').classList.remove('show');
}

function selectGame(gameType) {
  selectedGame = gameType;
  document.querySelectorAll('.game-option').forEach(option => {
    option.classList.remove('selected');
  });
  document.querySelector(`[data-game="${gameType}"]`).classList.add('selected');
  document.getElementById('sendChallengeBtn').disabled = false;
}

// Switch to a specific segment
function goToSegment(segmentNumber) {
  segments.forEach(seg => {
    const segNum = parseInt(seg.dataset.segment);
    if (segNum === segmentNumber) {
      seg.classList.remove('exit');
      seg.classList.add('active');
    } else if (seg.classList.contains('active')) {
      seg.classList.remove('active');
      seg.classList.add('exit');
    }
  });
}

// Show main app
function showMainApp(username) {
  onboardingOverlay.classList.add('hidden');
  mainApp.classList.add('active');
  welcomeMessage.textContent = `Welcome, ${username}!`;
}

// Check if user exists in Dual users collection
async function checkUserExists(uid) {
  const userRef = doc(db, 'dualUsers', uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
}

// Create new Dual user
async function createDualUser(uid, email, username) {
  const userRef = doc(db, 'dualUsers', uid);
  await setDoc(userRef, {
    uid: uid,
    email: email,
    username: username,
    createdAt: new Date().toISOString(),
    wins: 0,
    losses: 0,
    totalGames: 0
  });
}

// Google Sign In
googleSignInBtn.addEventListener('click', async () => {
  try {
    googleSignInBtn.disabled = true;
    googleSignInBtn.innerHTML = '<span class="loading-spinner"></span> Signing in...';
    
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    
    // Check if user already exists in dualUsers
    const existingUser = await checkUserExists(currentUser.uid);
    
    if (existingUser) {
      // User exists, go directly to main app
      showMainApp(existingUser.username);
    } else {
      // New user, show username segment
      goToSegment(2);
    }
  } catch (error) {
    console.error('Sign in error:', error);
    googleSignInBtn.disabled = false;
    googleSignInBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span>Continue with Google</span>
    `;
  }
});

// Username submission
submitUsernameBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  
  if (!username) {
    usernameError.textContent = 'Username is required';
    usernameError.classList.add('show');
    return;
  }
  
  if (username.length < 3) {
    usernameError.textContent = 'Username must be at least 3 characters';
    usernameError.classList.add('show');
    return;
  }
  
  usernameError.classList.remove('show');
  
  try {
    submitUsernameBtn.disabled = true;
    submitUsernameBtn.innerHTML = '<span class="loading-spinner"></span> Creating account...';
    
    // Create the user in dualUsers collection
    await createDualUser(currentUser.uid, currentUser.email, username);
    
    // Show main app
    showMainApp(username);
  } catch (error) {
    console.error('Error creating user:', error);
    usernameError.textContent = 'Error creating account. Please try again.';
    usernameError.classList.add('show');
    submitUsernameBtn.disabled = false;
    submitUsernameBtn.textContent = 'Continue';
  }
});

// Handle Enter key on username input
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitUsernameBtn.click();
  }
});

// Clear error on input
usernameInput.addEventListener('input', () => {
  usernameError.classList.remove('show');
});

// Check auth state on load
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const existingUser = await checkUserExists(user.uid);
    
    if (existingUser) {
      // User exists, go directly to main app
      showMainApp(existingUser.username);
    }
    // If user is signed in but not in dualUsers, they'll need to complete onboarding
  }
});