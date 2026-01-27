// ========================================
// MULON WAITLIST - Secure Access Control
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    getDocs,
    collection,
    query,
    where,
    orderBy,
    serverTimestamp
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// References
const waitlistRef = collection(db, 'mulon_waitlist');
const usersRef = collection(db, 'mulon_users');

// Admin emails that bypass waitlist
const ADMIN_EMAILS = Object.freeze(['joelmulonde81@gmail.com', 'jordan.herrera@crpusd.org', 'kaidenchatigny@gmail.com']);

// ========================================
// WAITLIST CHECK (Exported for other modules)
// ========================================
export async function checkWaitlistStatus(userId, email) {
    // Admins always bypass
    if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
        return { status: 'approved', isAdmin: true };
    }
    
    try {
        // First check if user already exists in mulon_users (existing user)
        const userDoc = await getDoc(doc(usersRef, userId));
        if (userDoc.exists()) {
            // User is already a registered user, they're approved
            return { status: 'approved', isExistingUser: true };
        }
        
        // Check waitlist document
        const waitlistDoc = await getDoc(doc(waitlistRef, userId));
        
        if (!waitlistDoc.exists()) {
            return { status: 'not_on_list' };
        }
        
        const data = waitlistDoc.data();
        return {
            status: data.status || 'pending', // pending, approved, rejected
            joinedAt: data.joinedAt,
            approvedAt: data.approvedAt,
            position: data.position
        };
    } catch (error) {
        console.error('Error checking waitlist:', error);
        return { status: 'error', error: error.message };
    }
}

// Get waitlist position
async function getWaitlistPosition(userId) {
    try {
        const q = query(waitlistRef, where('status', '==', 'pending'), orderBy('joinedAt', 'asc'));
        const snapshot = await getDocs(q);
        
        let position = 0;
        for (const docSnap of snapshot.docs) {
            position++;
            if (docSnap.id === userId) {
                return position;
            }
        }
        return position + 1; // If not found, they're at the end
    } catch (error) {
        console.error('Error getting position:', error);
        return null;
    }
}

// Add to waitlist
async function addToWaitlist(user) {
    try {
        const waitlistData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            status: 'pending',
            joinedAt: serverTimestamp(),
            deviceFingerprint: generateDeviceFingerprint()
        };
        
        await setDoc(doc(waitlistRef, user.uid), waitlistData);
        
        return { success: true };
    } catch (error) {
        console.error('Error adding to waitlist:', error);
        return { success: false, error: error.message };
    }
}

// Generate device fingerprint for tracking
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

// Format date
function formatDate(timestamp) {
    if (!timestamp) return '--';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ========================================
// UI MANAGEMENT
// ========================================
function showState(stateId) {
    document.querySelectorAll('.waitlist-state').forEach(el => {
        el.classList.add('hidden');
    });
    const state = document.getElementById(stateId);
    if (state) {
        state.classList.remove('hidden');
    }
}

async function handleAuthState(user) {
    if (!user) {
        showState('stateInitial');
        return;
    }
    
    // Check waitlist status
    const status = await checkWaitlistStatus(user.uid, user.email);
    
    switch (status.status) {
        case 'approved':
            showState('stateApproved');
            // Redirect to main site after brief delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            break;
            
        case 'pending':
            showState('statePending');
            // Update position display
            const position = await getWaitlistPosition(user.uid);
            document.getElementById('waitlistPosition').textContent = position ? `#${position + 23}` : '16';
            document.getElementById('waitlistJoined').textContent = formatDate(status.joinedAt);
            break;
            
        case 'rejected':
            showState('stateRejected');
            break;
            
        case 'not_on_list':
            // Add to waitlist
            const result = await addToWaitlist(user);
            if (result.success) {
                showState('statePending');
                const pos = await getWaitlistPosition(user.uid);
                document.getElementById('waitlistPosition').textContent = pos ? `#${pos}` : '#1';
                document.getElementById('waitlistJoined').textContent = 'Just now';
            } else {
                alert('Error joining waitlist. Please try again.');
                showState('stateInitial');
            }
            break;
            
        default:
            showState('stateInitial');
    }
}

// ========================================
// EVENT HANDLERS
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Join waitlist button
    const joinBtn = document.getElementById('joinWaitlistBtn');
    if (joinBtn) {
        joinBtn.addEventListener('click', async () => {
            try {
                joinBtn.disabled = true;
                joinBtn.querySelector('span').textContent = 'Signing in...';
                
                await signInWithPopup(auth, googleProvider);
            } catch (error) {
                console.error('Sign in error:', error);
                joinBtn.disabled = false;
                joinBtn.querySelector('span').textContent = 'Sign in with Google to Join';
            }
        });
    }
    
    // Sign out buttons
    ['signOutBtn', 'signOutBtnRejected'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', async () => {
                await signOut(auth);
            });
        }
    });
    
    // Auth state listener
    onAuthStateChanged(auth, handleAuthState);
});

// Make available globally for other modules
window.checkWaitlistStatus = checkWaitlistStatus;
