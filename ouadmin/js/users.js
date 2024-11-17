import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
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

// Retrieve user data from localStorage or set default values
const userData = JSON.parse(localStorage.getItem('userData') || '{}');
const balanceAdder = parseFloat(localStorage.getItem('balanceAdder') || '0');
const userBets = JSON.parse(localStorage.getItem('userBets') || '[]');

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore(app);

const usersDiv = document.querySelector('.users-cont');
usersDiv.innerHTML = ``;

const usersRef = collection(db, 'users');
const querySnapshot = await getDocs(usersRef);

querySnapshot.forEach((docI) => {
    const data = docI.data();
    const userDiv = document.createElement('div');
    userDiv.classList.add('user');
    userDiv.dataset.uid = data.uid;
    userDiv.innerHTML = `
        <span class="user-name">${data.username}</span> - <span class="user-realname">${data.name}</span>
        <div class="sepa"></div>
        <div class="info">
            <div class="info-hold">
                <span>Username : </span>
                <input type="text" class="config-1" placeholder="${data.username}">
                <button>Change</button>
            </div>
            <div class="info-hold">
                <span>balance Adder : </span>
                <input type="text" class="config-1" placeholder="${data.balanceAdder}">
                <button>Change</button>
            </div>
            
        </div>
    `;
    usersDiv.appendChild(userDiv);

    const changeButton = userDiv.querySelector('button');
    const inputField = userDiv.querySelector('input');

    changeButton.addEventListener('click', async () => {
        const newUsername = inputField.value;
        if (newUsername) {
            const userDocRef = doc(db, 'users', data.uid);
            await setDoc(userDocRef, { username: newUsername }, { merge: true });
            userDiv.querySelector('.user-name').textContent = newUsername;
        }
    });
});

const balanceChangeButtons = usersDiv.querySelectorAll('.info-hold:nth-child(2) button');
const balanceInputFields = usersDiv.querySelectorAll('.info-hold:nth-child(2) input');

balanceChangeButtons.forEach((button, index) => {
    button.addEventListener('click', async () => {
        const newBalance = parseFloat(balanceInputFields[index].value);
        if (!isNaN(newBalance)) {
            const userDiv = button.closest('.user');
            const uid = userDiv.dataset.uid;
            const userDocRef = doc(db, 'users', uid);
            await setDoc(userDocRef, { balanceAdder: newBalance }, { merge: true });
            userDiv.querySelector('.user-realname').textContent = newBalance;
        }
    });
});