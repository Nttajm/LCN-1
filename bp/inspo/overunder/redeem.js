import { checkBetsAndUpdateBalance, getKeys, uiAndBalance } from "./global.js";
import { getRank } from "./firebaseconfig.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, addDoc, collection } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { updateFb, getFb, checkLoans } from "./firebaseconfig.js";
let taken = false;

const userData = JSON.parse(localStorage.getItem('userData') || '{}');

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


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore(app);


function checkCode() {
    const codeInput = document.getElementById('code-input');
    const code = codeInput.value;
    const display = document.getElementById('code-display');
    const codeRef = doc(db, 'codes', code);

    getDoc(codeRef).then((doc) => {
        if (doc.exists()) {
            const data = doc.data();
            if (data.used) {
                display.innerText = 'Code has already been used';
            } else {
                uiAndBalance(data.amount);
                display.innerText = `Code redeemed for $${data.amount}!`;
                setDoc(codeRef, { 
                    used: true,
                    username: userData.username,
                 }, { merge: true });
            }
        } else {

            display.innerText = 'Invalid code';
        }
    });
}

const codeButton = document.getElementById('code-button');
codeButton.addEventListener('click', checkCode);