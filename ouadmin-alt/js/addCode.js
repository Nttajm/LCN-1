import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, addDoc, collection } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";


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


function addCode() {
    const codeInput = document.getElementById('code-input');
    const code = codeInput.value;
    const codeAmount = document.getElementById('amount-input').value;
    const display = document.getElementById('code-display');

    const codeRef = doc(db, 'codes', code);

    getDoc(codeRef).then((doc) => {
        if (doc.exists()) {
            display.innerText = 'Code already exists';
        } else {
            setDoc(codeRef, {
                amount: Number(codeAmount),
                used: false,
            });
            display.innerText = `Code added for $${codeAmount}`;
        }
    });
}

const codeButton = document.getElementById('code-button');

codeButton.addEventListener('click', addCode);