import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAGcg43F94bWqUuyLH-AjghrAfduEVQ8ZM",
    authDomain: "overunder-ths.firebaseapp.com",
    projectId: "overunder-ths",
    storageBucket: "overunder-ths.firebasestorage.app",
    messagingSenderId: "690530120785",
    appId: "1:690530120785:web:36dc297cb517ac76cb7470",
    measurementId: "G-Q30T39R8VY"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

const usersCollectionRef = collection(db, 'users');
import { checkBetsAndUpdateBalance, userData, saveData, updateBalanceUI, updateBalanceAdder } from "./global.js";

const vote1 = document.getElementById('vote-1');
const vote2 = document.getElementById('vote-2');
const discordBtn = document.getElementById('vote-3');

const regVotes = document.getElementById('reg-votes');
const discordVotes = document.getElementById('disc-sec');

if (userData.uid) {

    vote1.addEventListener('click', async () => {
        await addDoc(collection(db, 'votes'), {
            userId: userData.uid,
            vote: 1
        });
    });
}

function renderVotes() {
    if (!userData.uid) {
        discordVotes.classList.remove('dn');
        regVotes.classList.add('dn');
    }
}

renderVotes();