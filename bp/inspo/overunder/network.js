import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, addDoc, collection } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { soccerBets, basketballBets, volleyballBets, schoolBets } from './bets.js';

import { openSite } from "./global.js";
import { updateFb } from "./firebaseconfig.js";
import { allBets } from "./bets.js";
import { query, where, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
openSite();

import { mstock } from "../../../ouadmin/js/stocks.js";
import { indexes, globalSto } from "./stocks-array.js";
const stockManual = mstock;


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

onAuthStateChanged(auth, (user) => {
  if (user) {
    updateFb();
  } else {
    console.log("No user is signed in.");
  }
});
const onlineUsersDiv = document.getElementById("js-online-users");
const offlineUsersDiv = document.getElementById("js-offline-users");

const usersCollection = collection(db, "users");

const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

const q = query(usersCollection, where("createdAt", ">=", fifteenMinutesAgo));

onSnapshot(q, (snapshot) => {
    onlineUsersDiv.innerHTML = ""; // Clear the div before adding new users
    snapshot.forEach(async (doc) => {
        const user = doc.data();
        const userDiv = document.createElement("div");
        userDiv.className = "user";
        userDiv.innerHTML = `
            <div class="user-top fl-r fl-jsp-b fl-ai">
                <span class="username-title">${user.username}</span>
                <div class="button-sec-1">
                    <button class="view-profile-btn">view profile</button>
                </div>
            </div>
            <div class="user-bottom">
                <span>Online</span>
            </div>
            <div class="user-profile fl-c" style="display: none;">
                <div class='sepa'></div>
                <h3>Bets</h3>
                <div class='bets fl-r g-5 fl-wr multi-tag' id="js-bets">
                ${ user.tripleABets && user.tripleABets.length > 0 ? displayBets(user.tripleABets) : "No bets" }
                </div>
                <h3>Stocks</h3>
                <div class='bought fl-r' id="js-stock">
                ${ await displayUserStocks(user.userStocks, snapshot.docs.map(doc => doc.data()))}
                </div>
            </div>
        `;

        const viewProfileBtn = userDiv.querySelector(".view-profile-btn");
        const userProfileDiv = userDiv.querySelector(".user-profile");
        viewProfileBtn.addEventListener("click", () => {
            userProfileDiv.style.display = userProfileDiv.style.display === "none" ? "block" : "none";
        });

        onlineUsersDiv.appendChild(userDiv);
    });
});

const offlineQuery = query(usersCollection, where("createdAt", "<", fifteenMinutesAgo));
// Global variables to manage pagination
let usersDisplayed = 0;
const usersPerPage = 30;
let allOfflineUsers = []; // Store sorted offline users globally

onSnapshot(offlineQuery, (snapshot) => {
    offlineUsersDiv.innerHTML = ""; // Clear the div before adding new users
    allOfflineUsers = []; // Reset global array

    // Populate allOfflineUsers array
    snapshot.forEach((doc) => {
        const user = doc.data();
        // Ensure createdAt is a valid timestamp
        if (user.createdAt && user.createdAt.seconds) {
            allOfflineUsers.push({
                ...user,
                lastSeen: user.createdAt.seconds * 1000 // Convert Firestore timestamp to milliseconds
            });
        }
    });

    // Sort offline users by the most recent last seen time
    allOfflineUsers.sort((a, b) => b.lastSeen - a.lastSeen);

    // Display the first batch of users
    displayUsers();
});
function displayUsers() {
    // Determine the slice of users to display
    const usersToDisplay = allOfflineUsers.slice(usersDisplayed, usersDisplayed + usersPerPage);

    // Iterate over and display users
    usersToDisplay.forEach(async (user) => {
        const lastSeen = user.lastSeen; // Timestamp in milliseconds
        const now = Date.now();
        const elapsed = now - lastSeen;

        // Calculate time difference
        let timeAgo;
        const minutes = Math.floor(elapsed / 60000);
        const hours = Math.floor(elapsed / 3600000);
        const days = Math.floor(elapsed / (3600000 * 24));
        const weeks = Math.floor(elapsed / (3600000 * 24 * 7));

        if (minutes < 60) {
            timeAgo = `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
        } else if (hours < 24) {
            timeAgo = `${hours} hour${hours !== 1 ? "s" : ""} ago`;
        } else if (days < 7) {
            timeAgo = `${days} day${days !== 1 ? "s" : ""} ago`;
        } else {
            timeAgo = `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
        }

        const displayName = (user.username || user.name || 'Unknown').length > 12 
        ? (user.username || user.name || 'Unknown').substring(0, 17) + '...' 
        : (user.username || user.name || 'Unknown');

        // Create user element
        const userDiv = document.createElement("div");
        userDiv.className = "user";
        userDiv.dataset.uid = user.uid;
        userDiv.innerHTML = `
            <div class="user-top fl-r fl-jsp-b fl-ai">
                <span class="username-title">${displayName}</span>
                <div class="button-sec-1">
                    <button class="view-profile-btn">view profile</button>
                </div>
            </div>
            <div class="user-bottom">
                <span>Offline - ${timeAgo}</span>
            </div>
            <div class="user-profile fl-c" style="display: none;">
                <div class='sepa'></div>
                <h3>Bets</h3>
                <div class='bets fl-r g-5 fl-wr multi-tag' id="js-bets">
                ${ user.tripleABets && user.tripleABets.length > 0 ? displayBets(user.tripleABets) : "No bets" }
                </div>
                <h3>Stocks</h3>
                <div class='bought fl-r' id="js-stock">
                ${ await displayUserStocks(user.userStocks, allOfflineUsers)}
                </div>
            </div>
        `;

        const viewProfileBtn = userDiv.querySelector(".view-profile-btn");
        const userProfileDiv = userDiv.querySelector(".user-profile");
        viewProfileBtn.addEventListener("click", () => {
            userProfileDiv.style.display = userProfileDiv.style.display === "none" ? "block" : "none";
        });

        offlineUsersDiv.appendChild(userDiv);
    });

    usersDisplayed += usersPerPage; // Update the count of displayed users

    // Always append the "Load More" button at the very end
    addLoadMoreButton();
}

function addLoadMoreButton() {
    // Remove existing "Load More" button if any
    const existingButton = document.getElementById("loadMoreButton");
    if (existingButton) existingButton.remove();

    // Add button only if there are more users to load
    if (usersDisplayed < allOfflineUsers.length) {
        const loadMoreButton = document.createElement("button");
        loadMoreButton.id = "loadMoreButton";
        loadMoreButton.textContent = "Load More";
        loadMoreButton.className = "load-more-btn";

        loadMoreButton.addEventListener("click", () => {
            displayUsers(); // Display the next batch of users
        });

        // Add "Load More" button to the offline users HTML
        setTimeout(() => {
            offlineUsersDiv.appendChild(loadMoreButton);
        }, 1000);

    }
}

function displayBets(bets) {
    let outHtml = '';
    bets.forEach(bet => {
        const matchingBet = allBets.find(b => b.id === bet.matchingBet);
        let betStatus = 'pending';
        if (matchingBet) {
            if (matchingBet.result === bet.option) {
            betStatus = 'won';
            } else if (matchingBet.result !== bet.option && (matchingBet.result === 'over' || matchingBet.result === 'under')) {
            betStatus = 'lost';
            }
        }

        let infoBet = `
            <span>${matchingBet.techTeam}</span>  
            <span>${('vs ' + matchingBet.against)}</span>
        `

        if (!matchingBet.techTeam || !matchingBet.against) {
            infoBet = `
            <span>${matchingBet.name}</span>  
            <span>${(' - ' + matchingBet.typeBet)}</span>
            `;
        }

        outHtml += `
            <div class="bet-profile who fl-c ${betStatus}">
            <div data-jsid="${matchingBet.id}">
                ${infoBet}
            </div>
            <span>"${betStatus}"</span>
            </div>
        `;
    });
    return outHtml;
}

async function displayUserStocks(stocks, users) {
     // Clear the stockDiv before adding stocks
    let outHtml = '';

    if (stocks) {
        

    stocks.forEach(stock => {
        if (stock.amount > 0) {
            let lastPrice;

            // Check if the stock is a manual stock
            let manualStock = stockManual.find(s => s.name === stock.name);
            if (manualStock) {
                lastPrice = manualStock.data[manualStock.data.length - 1];
            } else {
                let indexStock = indexes.find(index => index.name === stock.name);
                if (indexStock) {
                    lastPrice = indexStock.data[indexStock.data.length - 1];
                } else {
                    lastPrice = getLastPrice(stock.name);
                }
            }

            // Calculate the total shares for the stock across all users
            let totalShares = 0;
            users.forEach(user => {
                if (Array.isArray(user.userStocks)) {
                    user.userStocks.forEach(userStock => {
                        if (userStock.name === stock.name) {
                            totalShares += userStock.amount;
                        }
                    });
                }
            });

            // Calculate the price with shares influence
            let shareSub = (lastPrice * totalShares * globalSto).toFixed(2);
            let priceWshares = (parseFloat(lastPrice) + parseFloat(shareSub)).toFixed(2);

            // Display the stock information
            outHtml += `
                <div class="coin">
                    <div class="symbol">
                        <span>${stock.name.substring(0, 3).toUpperCase()}</span>
                    </div>
                    <div class="prices">
                        <span class="price">$${priceWshares}</span>
                        <span>${stock.amount} ${(stock.amount > 1 ? 'shares' : 'share')}</span>
                    </div>
                </div>
            `;
        }
    }); // Close the forEach loop 
    } else {
        return 'No stocks';
    }

        return outHtml;
}

export function getLastPrice(stockName) {
    switch (stockName) {
        case 'Soccer':
            return calcStock(soccerBets)[calcStock(soccerBets).length - 1];
        case 'Volleyball':
            return calcStock(volleyballBets)[calcStock(volleyballBets).length - 1];
        case 'anotherStockName':
            return calcStock(anotherBets);
        default:
            return 0;
    }
}


function getAveragePrice(bets) {
    let total = 0;
    for (let i = 0; i < bets.length; i++) {
        total += bets[i].price;
    }
    return (total / bets.length).toFixed(2);
}


export function calcStock(typeBet) {
    let stockAdder = getAveragePrice(typeBet) * 0.2;
    let stockSubtracter = getAveragePrice(typeBet) * -0.1;
    let averagePrice = parseFloat(getAveragePrice(typeBet)); // Convert string to number
    let stock = 0;
    let output = []; // Assuming you have an output array somewhere

    typeBet.forEach(bet => {
        if (bet.result === 'over') {
            stock += stockAdder;
            output.push(Math.round((stock + averagePrice) * 100) / 100); // Keep it a number
        } else if (bet.result === 'under') {
            stock += stockSubtracter;
            output.push(Math.round((stock + averagePrice) * 100) / 100); // Keep it a number
        }
    });

    return output; // Return the output array
}