import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    limit,
    orderBy,
    onSnapshot,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: 'AIzaSyCy4lEzurGBcYqc8Pex1SUysXo-KbGBlu0',
    authDomain: 'lcn-apps.firebaseapp.com',
    projectId: 'lcn-apps',
    storageBucket: 'lcn-apps.firebasestorage.app',
    messagingSenderId: '663679231736',
    appId: '1:663679231736:web:61e74f528ace92f4c8fd0d',
    measurementId: 'G-FBYJTEB66R'
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Analytics is optional and can fail on file:// / blocked environments.
let analytics = null;
import('https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js')
    .then(function (mod) {
        if (typeof window !== 'undefined' && /^https?:/.test(window.location.protocol)) {
            analytics = mod.getAnalytics(app);
        }
    })
    .catch(function () {
        analytics = null;
    });

export {
    app,
    auth,
    db,
    analytics,
    firebaseConfig,
    googleProvider,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    limit,
    orderBy,
    onSnapshot,
    serverTimestamp
};
