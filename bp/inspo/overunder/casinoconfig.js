
// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc,getDocs, addDoc, collection } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { openSite, saveData, updateBalanceAdder, uiAndBalance, updateStatsUI, getKeys } from "./global.js";
import { checkIfisBanned, rank, addKeys, fKeysAdder, initKeys, rankUi, antiC } from "./firebaseconfig.js";
openSite();
checkIfisBanned();
initKeys();

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

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore(app);
const authGlobal = onAuthStateChanged(auth, (user) => { return user; });


// Retrieve user data from localStorage or set default values
const userData = JSON.parse(localStorage.getItem('userData') || '{}');

export async function initGame(game)  {
    const user = userData;
    if (!user) {
        console.log(`cant init game -- ${game}`);
        return;
    }

    const gameref = doc(db, "users", user.uid, "games", game);  

    const docSnap = await getDoc(gameref);

    if(!docSnap.exists()) {
        await setDoc(gameref, 
        {
            lives: 5,
        }
        );
    } else {
        console.log(`game already initialized -- ${game}`);
        return
    }
}

export async function getGameLives(game) {
    const user = userData;
    if (!user) {
        console.log(`cant get game lives -- ${game}`);
        return;
    }

    const gameref = doc(db, "users", user.uid, "games", game);  

    const docSnap = await getDoc(gameref);

    if(docSnap.exists()) {
        return docSnap.data().lives;
    } else {
        console.log(`no game found -- ${game}`);
        return
    }
}

export async function looseLife(game) {
    const user = userData;
    if (!user) {
        console.log(`cant loose life -- ${game}`);  
        return;
    }

    antiC(game, `lost a life`);
    rankUi(5);

    const gameref = doc(db, "users", user.uid, "games", game);
    const userKeysRef = doc(db, 'users', userData.uid, 'altData', 'userKeys');
    const docSnap = await getDoc(gameref);
    if(docSnap.exists()) {
        const currentLives = docSnap.data().lives;
        const currentKeys = (await getDoc(userKeysRef)).data().keys;
        console.log(currentKeys + ` -- keys`);
        if(currentLives > 1) {
            await setDoc(gameref, {lives: currentLives - 1});
        } else {
            addKeys(currentKeys - 1)
            await setDoc(gameref, {lives: 5});
        }

    } else {
        return
    }

}