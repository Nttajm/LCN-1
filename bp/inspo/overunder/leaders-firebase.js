import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { soccerBets } from './bets.js';
import { basketballBets } from './bets.js';
import { volleyballBets } from './bets.js';
import { schoolBets } from "./bets.js";
let allBets = [...soccerBets, ...basketballBets, ...volleyballBets, ...schoolBets];


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

// Function to calculate balance based on bets
function getBalance(bets) {
    let balance = 0;
    bets.forEach(bet => {
        const matchingBet = allBets.find(b => b.id === bet.matchingBet);
        if (matchingBet) {
            if (matchingBet.result === bet.option) {
                balance += matchingBet.price;
            } else if (matchingBet.result !== bet.option && (matchingBet.result === 'over' || matchingBet.result === 'under')) {
                balance -= matchingBet.price;
            }
        }
    });
    return balance;
}

// Reference to the 'users' collection in Firestore
const usersCollectionRef = collection(db, 'users');

console.log(usersCollectionRef)

// Fetch and render leaderboard data
async function renderLeaders() {
    const leaderElem = document.getElementById('js-leaders');
    leaderElem.innerHTML = ''; // Clear current leaders

    try {
        // Get all documents in the 'users' collection
        const querySnapshot = await getDocs(usersCollectionRef);
        const leaders = querySnapshot.docs.map(doc => doc.data());

        // Sort leaders by balance (including balanceAdder) in descending order
        leaders.sort((a, b) => {
            const balanceA = getBalance(a.tripleABets || []) + (a.balanceAdder || 0);
            const balanceB = getBalance(b.tripleABets || []) + (b.balanceAdder || 0);
            return balanceB - balanceA; // Sort in descending order
        });

        // Render each leader after sorting
        leaders.forEach((leader, index) => {
            const leaderDiv = document.createElement('div');
            leaderDiv.classList.add('leader');
            if (leader.leaderStyle === 'lebron') {
                leaderDiv.classList.add('lebron');
            } else if (leader.leaderStyle === 'messi') {
                leaderDiv.classList.add('messi');
            }
            leaderDiv.innerHTML = `
                <span class="leader-rank">${index + 1}</span>
                <span class="leader-name">${leader.username || 'Unknown'}</span>
                <span class="leader-balance">$${getBalance(leader.tripleABets || []) + (leader.balanceAdder || 0)}</span>
            `;
            leaderElem.appendChild(leaderDiv);

        });
    } catch (error) {
        console.error("Error fetching leaderboard data:", error);
    }
}


// Call renderLeaders to populate leaderboard on page load
renderLeaders();