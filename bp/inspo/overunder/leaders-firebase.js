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
function getBalance(bets = []) {
        let balance = 0;
        bets.forEach(bet => {
            const matchingBet = allBets.find(b => b.id === bet.matchingBet);
            if (matchingBet) {
                if (matchingBet.result === bet.option) {
                    balance += matchingBet.price;
                } else if (
                    matchingBet.result !== bet.option &&
                    (matchingBet.result === 'over' || matchingBet.result === 'under')
                ) {
                    balance -= matchingBet.price;
                }
            }
        });
        return balance;
    }
    
    // Reference to the 'users' collection in Firestore
    const usersCollectionRef = collection(db, 'users');
    
    // Function to get display name
    function getDisplayName(leader) {
        const name = leader.username || leader.name || 'Unknown';
        return name.length > 17 ? name.substring(0, 17) + '...' : name;
    }
    
    // Fetch and render leaderboard data
    async function renderLeaders() {
        const leaderElem = document.getElementById('js-leaders');
        leaderElem.innerHTML = 'Loading...'; // Show loading message
    
        try {
            // Get all documents in the 'users' collection
            const querySnapshot = await getDocs(usersCollectionRef);
            const leaders = querySnapshot.docs
                .map(doc => doc.data())
                .filter(leader => !leader.FBban && !leader.ban); // Exclude banned users
    
            // Sort leaders by balance (including balanceAdder) in descending order
            leaders.sort((a, b) => {
                const balanceA = getBalance(a.tripleABets || []) + (a.balanceAdder || 0) || 0;
                const balanceB = getBalance(b.tripleABets || []) + (b.balanceAdder || 0) || 0;
                return balanceB - balanceA; // Sort in descending order (largest to smallest)
            });
            
    
            // Clear loading message
            leaderElem.innerHTML = '';
    
            // Render each leader after sorting
            leaders.forEach((leader, index) => {
                const balance = (getBalance(leader.tripleABets || []) + (leader.balanceAdder || 0)) || 0;
                if (isNaN(balance) || balance === null || balance === undefined) {
                    console.error("Invalid balance for leader:", leader);
                    return; // Skip invalid balances
                }
    
                const leaderDiv = document.createElement('div');
                leaderDiv.classList.add('leader');
    
                if (leader.leaderStyle && leader.leaderStyle.trim() !== '') {
                    const styles = leader.leaderStyle.split(' ').filter(style => style.trim() !== '');
                    styles.forEach(style => {
                        leaderDiv.classList.add(style);
                    });
                }
    
                leaderDiv.innerHTML = `
                    <span class="leader-rank">${index + 1}</span>
                    <span class="leader-name">${getDisplayName(leader)}</span>
                    <span class="leader-balance">$${balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                `;
                leaderElem.appendChild(leaderDiv);
            });
        } catch (error) {
            console.error("Error fetching leaderboard data:", error);
            leaderElem.innerHTML = 'Error loading data'; // Show error message
        }
    }
    
    

// Call renderLeaders to populate leaderboard on page load
renderLeaders();
