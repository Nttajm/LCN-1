import { soccerBets, basketballBets, volleyballBets, schoolBets } from './bets.js';
import {
    checkBetsAndUpdateBalance,
    message,
    saveData,
    displayUserInfo,
    userData,
    updateBalanceUI,
    balanceAdder,
    updateBalanceAdder,
    openSite
} from './global.js';

import { checkIfisBanned, antiC } from "./firebaseconfig.js";
import { stockManual, indexes, globalSto } from './stocks-array.js';


checkIfisBanned();
antiC();    
openSite()

// userData.userStocks = []
// saveData();


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


import { updateFb, getFb } from './firebaseconfig.js';
import { onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

if (userData.ban) {
    window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
}

getFb();

let currentSelectedStock;


function _(id) {
    return document.getElementById(id);
}

function cl(classelem) {
    return document.getElementsByClassName(classelem);
} 

const usrnamediv = _('username');
if (usrnamediv) {
    usrnamediv.innerHTML = userData.username || '???';
}

checkBetsAndUpdateBalance();
getFb();



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



let chartInstance = null;  // Global variable to store the chart instance

function writeStock(typeBet) {
    setTimeout(() => {
        displayShareAmount();
        displayTopShareHolders();
    }, 100);

    currentSelectedStock = typeBet;
    const chartElement = document.getElementById('myLineChart');
    if (!chartElement) {
        return;
    }
    const ctx = chartElement.getContext('2d');

    // Check if it's manual stock data (array of numbers)
    if (Array.isArray(typeBet) && typeof typeBet[0] === 'number') {
        typeBet.reverse(); // Reverse the order of the array

    
        const candleData = [];
        for (let i = 0; i < typeBet.length; i += 2) {
            const prices = typeBet.slice(i, i + 2);
            if (prices.length < 2) break;

            const open = prices[0];
            const close = prices[1];
            const high = Math.max(open, close) * 1.2;
            const low = Math.min(open, close) * 0.8;

            candleData.push({
            x: (i / 2) + 1,
            o: open,
            h: high,
            l: low,
            c: close
            });
        }

        // Display stock information
        let stock = stockManual.find(stock => stock.data === typeBet);
        let index = indexes.find(stock => stock.data === typeBet);
        let basedOn = (stock && stock.basedOn) || (index && index.basedOn) || 'Unknown';
        _('js-symbol').innerHTML = (stock && stock.id) || (index && index.id) || '???';
        _('js-name').innerHTML = (stock ? stock.name : (index ? index.name : '???'));
        _('js-based').innerHTML = basedOn;

        const lastPrice = typeBet[typeBet.length - 1];
        const firstPrice = typeBet[typeBet.length - 7] || typeBet[0];
        const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
        _('js-up').innerHTML = (percentChange >= 0 ? '+' : '') + percentChange.toFixed(2) + '%';
        _('js-money').innerHTML = '$' + (lastPrice - firstPrice).toFixed(2);

        if (percentChange >= 0) {
            _('js-up').classList.add('weup');
            _('js-up').classList.remove('wedown');
        } else {
            _('js-up').classList.add('wedown');
            _('js-up').classList.remove('weup');
        }

        const priceHtml = _('js-price');
        displayShareAmount().then(shareAmount => {
            const priceWshares = (lastPrice * shareAmount * globalSto).toFixed(2);
            priceHtml.innerHTML = '$' + priceWshares;
        });

        const studentSpan = document.querySelector('.studentOwned');
        studentSpan.style.display = stock?.isStudentOwned ? 'block' : 'none';

        // Destroy previous chart if it exists
        if (chartInstance !== null) {
            chartInstance.destroy();
        }

        // Create candlestick chart
        chartInstance = new Chart(ctx, {
            type: 'candlestick',
            data: {
                datasets: [{
                    label: 'Manual Stock Prices',
                    data: candleData,
                }]
            },
            options: {
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time (Index)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Price'
                        }
                    }
                }
            }
        });
    } else {
        // Handle sports bet data
        // (Keep this part of the original function unchanged.)
        if (typeBet === volleyballBets) {
            _('js-symbol').innerHTML = 'VLB';
            _('js-name').innerHTML = 'Volleyball';
            _('js-based').innerHTML = 'Overs and Unders';
        } else if (typeBet === basketballBets) {
            _('js-symbol').innerHTML = 'BKB';
            _('js-name').innerHTML = 'Basketball';
            _('js-based').innerHTML = 'Overs and Unders';
        } else if (typeBet === soccerBets) {
            _('js-symbol').innerHTML = 'SCR';
            _('js-name').innerHTML = 'Soccer';
            _('js-based').innerHTML = 'Overs and Unders';
        } else if (typeBet === schoolBets) {
            _('js-symbol').innerHTML = 'SCH';
            _('js-name').innerHTML = 'School';
            _('js-based').innerHTML = 'Overs and Unders';
        }

        const priceHtml = _('js-price');
        priceHtml.innerHTML = '$' + calcStock(typeBet)[calcStock(typeBet).length - 1];

        const percent = _('js-up');
        const lastPrice = calcStock(typeBet)[calcStock(typeBet).length - 1];
        const firstPrice = calcStock(typeBet)[0];
        const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
        percent.innerHTML = (percentChange >= 0 ? '+' : '') + percentChange.toFixed(2) + '%';

        const byMoney = _('js-money');
        byMoney.innerHTML = '$' + (lastPrice - firstPrice).toFixed(2);

        if (percentChange >= 0) {
            percent.classList.add('weup');
            percent.classList.remove('wedown');
        } else {
            percent.classList.add('wedown');
            percent.classList.remove('weup');
        }

        // Destroy previous chart if it exists
        if (chartInstance !== null) {
            chartInstance.destroy();
        }

        const data = {
            labels: typeBet.map(bet => bet.against.length > 8 ? bet.against.substring(0, 8) + '...' : bet.against),
            datasets: [{
                label: 'Overs and Unders',
                data: calcStock(typeBet),
                fill: false,
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
            }]
        };

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Bets Over Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Sales'
                        }
                    }
                }
            }
        });
    }
}



writeStock(soccerBets);


const optionals = document.querySelectorAll('.sport-option');

function clearSelection() {
    // Re-select all current .sport-option elements
    const allOptionals = document.querySelectorAll('.sport-option');
    allOptionals.forEach(div => div.classList.remove('selected'));
}

function attachEventListeners() {
    const newOptionals = document.querySelectorAll('.sport-option');
    
    newOptionals.forEach(div => {
        div.addEventListener('click', function () {
            displayShareAmount();
            const writeType = div.dataset.write;
            clearSelection(); // Clear previous selection for all .sport-option elements
            div.classList.add('selected'); // Add 'selected' class to clicked div
            const sportsBets = {
                soccer: soccerBets,
                basketball: basketballBets,
                volleyball: volleyballBets,
                school: schoolBets
            };

            if (sportsBets[writeType]) {
                writeStock(sportsBets[writeType]);
            } else if (indexes.some(index => index.id === writeType)) {
                const stock = indexes.find(stock => stock.name === writeType);
                if (stock) {
                    writeStock(stock.data);
                }
            } else {
                const stock = stockManual.find(stock => stock.id === writeType);
                if (stock) {
                    writeStock(stock.data);
                }
            }

        });
    });
}

// Call the function to attach listeners initially
attachEventListeners();

const pickers = _('sports-pickers');
const mainPicks = document.querySelectorAll('.sport-option-2');

function clearSelection2() {
    mainPicks.forEach(div => div.classList.remove('selected'));
}

mainPicks.forEach(div => {
    div.addEventListener('click', function () {
        const showtype = div.dataset.see;
        clearSelection2();
        div.classList.add('selected'); // Add 'selected' class to clicked div
        pickers.innerHTML = ``;

        if (showtype === 'sports') {
            pickers.innerHTML = `
                <span class="selected sport-option" data-write="soccer">(SCR)Soccer</span>
                <span class="sport-option" data-write="volleyball">(VOL)Volleyball</span>
                <span class="sport-option" data-write="basketball">(BKB) Basketball</span>

            `;
        } else if (showtype === 'teachers') {
            stockManual.forEach(stock => {
                pickers.innerHTML += `
                    <span class="sport-option" data-write="${stock.id}">${stock.sub}</span>
                `;
            });
        } else if (showtype === 'indexes') {
            indexes.forEach(stock => {
                pickers.innerHTML += `
                    <span class="sport-option" data-write="${stock.id}">${stock.name}</span>
                `;
            });
        }
            

        // Re-attach event listeners for new .sport-option elements
        attachEventListeners();
    });
});

const buyAmountSeletes = document.querySelectorAll('.times span');

function clearSelection3() {
    buyAmountSeletes.forEach(span => span.classList.remove('selected'));
}



let buyAmount = 1;

buyAmountSeletes.forEach(span => {
    span.addEventListener('click', function () {
        clearSelection3();
        span.classList.add('selected');
        buyAmount = span.dataset.amount;
    });
});

buyAmountSeletes.forEach(span => {
    if (span.classList.contains('selected')) {
       buyAmount = span.dataset.amount;
    }
});


userData.userStocks = localStorage.getItem('userStocks') ? JSON.parse(localStorage.getItem('userStocks')) : [];
function loadUserData() {
    const savedData = localStorage.getItem('userData');
    if (savedData) {
        userData.userStocks = JSON.parse(savedData).userStocks || [];
    }
}

loadUserData();

// Save userData to localStorage
function saveUserData() {
    localStorage.setItem('userData', JSON.stringify(userData));
}

// Display stocks
const stockDiv = document.getElementById('js-stock');
const portfolioDiv = document.getElementById('portfolio');

async function displayUserStocks() {
    stockDiv.innerHTML = ''; // Clear the stockDiv before adding stocks

    if (userData.userStocks.length === 0) {
        stockDiv.innerHTML += '<span>You do not have any stocks</span>';
        return;
    }

    try {
        const querySnapshot = await getDocs(usersCollectionRef);
        const users = querySnapshot.docs.map(doc => doc.data());

        userData.userStocks.forEach(stock => {
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
                stockDiv.innerHTML += `
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

        // Call displayPortfolio after the loop
        displayPortfolio();
    } catch (error) {
        console.error("Error fetching user stocks:", error);
        stockDiv.innerHTML = 'Error fetching data';
    }
}


function displayPortfolio() {
    portfolioDiv.innerHTML = '';
    let portfolioValue = 0;
    userData.userStocks.forEach(stock => {
        let lastPrice;
        let manualStock = stockManual.find(s => s.name === stock.name);
        let indexStock = indexes.find(index => index.name === stock.name);
        if (manualStock) {
            lastPrice = manualStock.data[manualStock.data.length - 1];
        } else if (indexStock) {
            lastPrice = indexStock.data[indexStock.data.length - 1];
        } else {
            lastPrice = getLastPrice(stock.name);
        }

        // Get total shares for the stock
        let totalShares = 0;
        userData.userStocks.forEach(s => {
            if (s.name === stock.name) {
                totalShares += s.amount;
            }
        });

        let shareSub = (lastPrice * totalShares * globalSto).toFixed(2);
        let priceWshares = (lastPrice + parseFloat(shareSub)).toFixed(2);
        portfolioValue += stock.amount * priceWshares;
    });
    portfolioDiv.innerHTML = `$${portfolioValue}`;
}


displayUserStocks();

const usernameDiv = document.getElementById('username');
if (usernameDiv) {
    usernameDiv.innerHTML = userData.username || '???';
}
const livesharesCollectionRef = collection(db, 'liveshares');
let lastDisplayedTimestamp = Date.now();

async function postliveshare(name, amount, type) {
    try {
        const newShare = {
            name: name,
            amount: amount,
            type: type,
            date: new Date(),
            username: userData.username.length > 9 ? userData.username.substring(0, 9) + '...' : userData.username
        };
        await addDoc(livesharesCollectionRef, newShare);
        console.log('Live share posted successfully');
    } catch (error) {
        console.error('Error posting live share:', error);
    }
}

function displayliveshares() {
    const livesharesDiv = document.getElementById('liveshares');

    onSnapshot(livesharesCollectionRef, (snapshot) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === "added") {
                const share = change.doc.data();
                const shareDate = share.date.seconds * 1000;
                const now = Date.now();

                // Display only if this share was created in the last 10 seconds
                // and it hasn't been displayed yet based on last displayed timestamp
                if (shareDate >= now - 10000 && shareDate > lastDisplayedTimestamp) {
                    lastDisplayedTimestamp = shareDate; // Update last displayed timestamp

                    // Create a new div for the share and add animations
                    const shareDiv = document.createElement('div');
                    shareDiv.classList.add('liver', 'fade-in'); // Initial fade-in animation
                    shareDiv.innerHTML = `
                        <span class="name">${share.username}</span>
                        <div class="liver-info ${share.type}">${share.amount} - ${share.name}</div>
                    `;

                    // Prepend the new share div to the container (for reverse order)
                    livesharesDiv.prepend(shareDiv);

                    // After 10 seconds, start fading out and remove the share div
                    setTimeout(() => {
                        shareDiv.classList.add('fade-out'); // Start fade-out animation
                        setTimeout(() => {
                            shareDiv.remove(); // Remove element after fade-out completes
                        }, 1000); // Adjust to match fade-out animation duration
                    }, 10000); // Display duration of 10 seconds
                }
            }
        });
    });
}

displayliveshares();

function buy() {
    updatePriceWsharesElem();
    displayShareAmount()
    writeStock(currentSelectedStock);
    let currentPrice = parseFloat(_('js-price').textContent.replace(/[^0-9.-]+/g, ''));

    let currentMoney = checkBetsAndUpdateBalance();
    let stockName = _('js-name').textContent;

    console.log("Buying:", currentPrice, currentMoney, stockName);

    let totalCost = currentPrice * buyAmount;
    if (currentMoney >= totalCost) {
        displayliveshares();
        updatePriceWsharesElem();
        displayShareAmount()
        writeStock(currentSelectedStock);
        message(`You bought ${buyAmount} shares of ${stockName} for $${totalCost.toFixed(2)}!`, '');
        antiC(`stock buy`, ` ${stockName} ${buyAmount} shares for $${totalCost.toFixed(2)}`);
        // Update balance and data
        updateBalanceUI(currentMoney - totalCost);
        updateBalanceAdder(balanceAdder - totalCost);

        let stock = userData.userStocks.find(s => s.name === stockName);
        if (stock) {
            stock.amount += parseInt(buyAmount);
        } else {
            userData.userStocks.push({ name: stockName, amount: parseInt(buyAmount) });
        }

        postliveshare(stockName, buyAmount, 'buy');
        saveUserData();
        displayUserStocks();
        displayPortfolio();
        updateFb();
    } else {
        message('Insufficient funds to complete purchase', 'error');
    }
}

function sell() {

    let stockName = _('js-name').textContent;
    let currentPrice = parseFloat(_('js-price').textContent.replace(/[^0-9.-]+/g, ''));

    let stock = userData.userStocks.find(s => s.name === stockName);
    if (stock && stock.amount >= buyAmount) {
        displayliveshares();
        updatePriceWsharesElem();
        displayShareAmount()
        writeStock(currentSelectedStock);
        let totalRevenue = currentPrice * buyAmount;
        console.log(currentPrice)



        message(`Sold ${buyAmount} shares of ${stockName} for $${totalRevenue.toFixed(2)}`, '');
        antiC(`stock sell`, ` ${stockName} ${buyAmount} shares for $${totalRevenue.toFixed(2)}`);
        // Update balance and data
        updateBalanceUI(checkBetsAndUpdateBalance() + totalRevenue);
        updateBalanceAdder(balanceAdder + totalRevenue);

        stock.amount -= parseInt(buyAmount);
        if (stock.amount === 0) {
            // Remove stock if amount is zero
            userData.userStocks = userData.userStocks.filter(s => s.name !== stockName);
        }

        postliveshare(stockName, buyAmount, 'sell');
        saveUserData();
        displayUserStocks();
        displayPortfolio();
        updateFb();
    } else {
        message('Insufficient shares to complete sale', 'error');
    }
}


function buyMax() {
    let currentPrice = parseFloat(_('js-price').textContent.replace(/[^0-9.-]+/g, ''));
    let currentMoney = checkBetsAndUpdateBalance();
    let stockName = _('js-name').textContent;

    let maxBuyAmount = Math.floor(currentMoney / currentPrice);
    if (maxBuyAmount > 0) {
        let originalBuyAmount = buyAmount;
        buyAmount = maxBuyAmount;
        buy();
        buyAmount = originalBuyAmount;
    } else {
        message('Insufficient funds to complete purchase', 'error');
    }
}

function sellMax() {
    updatePriceWsharesElem();
    displayShareAmount();
    writeStock(currentSelectedStock);
    let stockName = _('js-name').textContent;
    let stock = userData.userStocks.find(s => s.name === stockName);
    if (stock && stock.amount > 0) {
        let originalBuyAmount = buyAmount;
        buyAmount = stock.amount;
        sell();
        buyAmount = originalBuyAmount;
    } else {
        message('Insufficient shares to complete sale', 'error');
    }
}

_('buy-max').addEventListener('click', buyMax);
_('sell-max').addEventListener('click', sellMax);
_('buy').addEventListener('click', buy);
_('sell').addEventListener('click', sell);



renderLeaders();
let showMore = false;

async function renderLeaders() {
    const leaderElem = document.querySelector('.leaders-sec');

    leaderElem.innerHTML = ''; // Clear current leaders

    try {
        // Get all documents in the 'users' collection
        const querySnapshot = await getDocs(usersCollectionRef);
        const leaders = querySnapshot.docs.map(doc => doc.data());

        // Sort leaders by portfolio value in descending order
        leaders.sort((a, b) => {
            let portfolioValueA = 0;
            let portfolioValueB = 0;

            if (Array.isArray(a.userStocks)) {
                a.userStocks.forEach(stock => {
                    let lastPrice;
                    let manualStock = stockManual.find(s => s.name === stock.name);
                    let indexStock = indexes.find(index => index.name === stock.name);
                    if (manualStock) {
                        lastPrice = manualStock.data[manualStock.data.length - 1];
                    } else if (indexStock) {
                        lastPrice = indexStock.data[indexStock.data.length - 1];
                    } else {
                        lastPrice = getLastPrice(stock.name);
                    }
                    portfolioValueA += stock.amount * lastPrice;
                });
            }

            if (Array.isArray(b.userStocks)) {
                b.userStocks.forEach(stock => {
                    let lastPrice;
                    let manualStock = stockManual.find(s => s.name === stock.name);
                    let indexStock = indexes.find(index => index.name === stock.name);
                    if (manualStock) {
                        lastPrice = manualStock.data[manualStock.data.length - 1];
                    } else if (indexStock) {
                        lastPrice = indexStock.data[indexStock.data.length - 1];
                    } else {
                        lastPrice = getLastPrice(stock.name);
                    }
                    portfolioValueB += stock.amount * lastPrice;
                });
            }

            return portfolioValueB - portfolioValueA;
        });

        // Render each leader after sorting
        const leadersToShow = showMore ? leaders.slice(0, 23) : leaders.slice(0, 14);
        leadersToShow.forEach((leader, index) => {
            if (Array.isArray(leader.userStocks)) {
                let portfolioValue = 0;

                leader.userStocks.forEach(stock => {
                    let lastPrice;
                    let manualStock = stockManual.find(s => s.name === stock.name);
                    let indexStock = indexes.find(index => index.name === stock.name);
                    if (manualStock) {
                        lastPrice = manualStock.data[manualStock.data.length - 1];
                    } else if (indexStock) {
                        lastPrice = indexStock.data[indexStock.data.length - 1];
                    } else {
                        lastPrice = getLastPrice(stock.name);
                    }
                    portfolioValue += stock.amount * lastPrice;
                });

                const leaderDiv = document.createElement('div');
                leaderDiv.classList.add('leader');
                if (leader.leaderStyle) {
                    const styles = leader.leaderStyle.split(' ').filter(style => style.trim() !== '');
                    styles.forEach(style => {
                        leaderDiv.classList.add(style);
                    });
                }
                leaderDiv.innerHTML = `
                    <span class="leader-rank">${index + 1}</span>
                    <span class="leader-name">${(leader.username || leader.name).length > 9 ? (leader.username || leader.name).substring(0, 9) + '...' : (leader.username || leader.name)}</span>
                    <span class="leader-balance">${portfolioValue.toFixed(2)}</span>
                `;
                leaderElem.appendChild(leaderDiv);
            }
        });

        // Add "See More" button
        const seeMoreButton = document.createElement('button');
        seeMoreButton.textContent = showMore ? 'See Less' : 'See More';
        seeMoreButton.addEventListener('click', () => {
            showMore = !showMore;
            renderLeaders();
        });
        leaderElem.appendChild(seeMoreButton);

    } catch (error) {
        console.error("Error fetching leaderboard data:", error);
    }
}

async function updatePriceWsharesElem() {
    const priceWsharesElem = _('js-price');
    const lastPrice = parseFloat(priceWsharesElem.textContent.replace(/[^0-9.-]+/g, ''));
    try {
        const shareAmount = await displayShareAmount();
        const shareSub = (lastPrice * shareAmount * globalSto).toFixed(2);
        const newPrice = lastPrice + parseFloat(shareSub);
        priceWsharesElem.innerHTML = '$' + newPrice.toFixed(2);
    } catch (error) {
        console.error("Error updating price with shares:", error);
    }
}

async function displayShareAmount() { 
    let stockName = _('js-name').textContent;
    let totalShares = 0;
    const sharesSpan = _('js-shares');
    sharesSpan.innerHTML = '';
    

    try {
        const querySnapshot = await getDocs(usersCollectionRef);
        const leaders = querySnapshot.docs.map(doc => doc.data());

        leaders.forEach(leader => {
            if (Array.isArray(leader.userStocks)) {
                leader.userStocks.forEach(stock => {
                    if (stock.name === stockName) {
                        totalShares += stock.amount;
                    }
                });
            }
        });

        sharesSpan.innerHTML = totalShares;
        return totalShares;
    } catch (error) {
        console.error("Error fetching share amounts:", error);
        spanspan.innerHTML = '';
    }
}
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const debouncedDisplayUserStocks = debounce(displayUserStocks, 2300);
const debouncedDisplayPortfolio = debounce(displayPortfolio, 2300);
const debouncedDisplayLargestStocks = debounce(displayLargestStocks, 2300);
const debouncedDisplayTopShareHolders = debounce(displayTopShareHolders, 2300);
const debouncedRenderLeaders = debounce(renderLeaders, 2300);
const debouncedWriteStock = debounce(writeStock, 2300);
const debouncegetCurrentOnlineUsers = debounce(getCurrentOnlineUsers, 2300);
const debounceddisplayliveshares = debounce(displayliveshares, 2300);
const debounceddisplayWinners = debounce(displayWinners, 100);
const debounceddisplayLosers = debounce(displayLosers, 100);



function subscribeToUserStocks() {
    onSnapshot(usersCollectionRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified" || change.type === "removed") {
                debouncedDisplayUserStocks();
                debouncedDisplayPortfolio();
                debouncedDisplayLargestStocks();
                debouncedDisplayTopShareHolders();
                debouncedRenderLeaders();
                debouncedWriteStock(currentSelectedStock);
                debouncegetCurrentOnlineUsers();
                debounceddisplayliveshares();
                debounceddisplayWinners();
                debounceddisplayLosers();
            }
        });
    });
}

subscribeToUserStocks();

async function displayLargestStocks() {
    const mostshared = document.getElementById('most-shared');
    mostshared.innerHTML = '';

    try {
        const querySnapshot = await getDocs(usersCollectionRef);
        const leaders = querySnapshot.docs.map(doc => doc.data());

        const stockCounts = {};

        leaders.forEach(leader => {
            if (Array.isArray(leader.userStocks)) {
                leader.userStocks.forEach(stock => {
                    if (!stockCounts[stock.name]) {
                        stockCounts[stock.name] = 0;
                    }
                    stockCounts[stock.name] += stock.amount;
                });
            }
        });

        const sortedStocks = Object.entries(stockCounts).sort((a, b) => b[1] - a[1]);

        sortedStocks.slice(0, 4).forEach(([stockName, totalShares]) => {
            const stockDiv = document.createElement('div');
            stockDiv.classList.add('coin');
            stockDiv.innerHTML = `
                    <div class="prices">
                        <div class="">
                            <img src="/bp/EE/assets/ouths/shares.png" alt="" class="icono-2">
                            <span id="js-sharesd">${totalShares}</span>
                        </div>
                    </div>
                    <div class="symbol">
                        <span>${stockName.substring(0, 3).toUpperCase()}</span>
                    </div>
            `;
            mostshared.appendChild(stockDiv);
        });
    } catch (error) {
        console.error("Error fetching share amounts:", error);
        mostshared.innerHTML = 'Error fetching data';
    }
}


displayLargestStocks();
async function displayTopShareHolders() {
    const topShareHoldersDiv = document.getElementById('top-shareholders');
    if (topShareHoldersDiv) {
        topShareHoldersDiv.innerHTML = '';
    }

    let stockName = _('js-name').textContent;
    let totalShares = 0;
    const shareHolders = [];

    try {
        const querySnapshot = await getDocs(usersCollectionRef);
        const leaders = querySnapshot.docs.map(doc => doc.data());

        leaders.forEach(leader => {
            if (Array.isArray(leader.userStocks)) {
                leader.userStocks.forEach(stock => {
                    if (stock.name === stockName) {
                        totalShares += stock.amount;
                        shareHolders.push({ username: leader.username || leader.name, amount: stock.amount, leaderStyle: leader.leaderStyle });
                    }
                });
            }
        });

        shareHolders.forEach(holder => {
            holder.percentage = ((holder.amount / totalShares) * 100).toFixed(2);
        });

        // Sort shareHolders by percentage in descending order
        shareHolders.sort((a, b) => b.percentage - a.percentage);

        shareHolders.slice(0, 3).forEach((holder, index) => {
            const holderDiv = document.createElement('div');
            holderDiv.classList.add('leader');

            if (holder.leaderStyle) {
                const styles = holder.leaderStyle.split(' ').filter(style => style.trim() !== '');
                styles.forEach(style => {
                    holderDiv.classList.add(style);
                });
            }

        


            holderDiv.innerHTML = `
            
            <span class="leader-rank">${index + 1}</span>
            <span class="leader-name">${holder.username.length > 12 ? holder.username.substring(0, 12) + '...' : holder.username}</span>
            <span class="leader-percentage">${holder.percentage}%</span>
            `;
            topShareHoldersDiv.appendChild(holderDiv);

            let totalPeople = shareHolders.length;
            _('js-people').innerHTML = totalPeople;
        });
    } catch (error) {
        console.error("Error fetching share amounts:", error);
        topShareHoldersDiv.innerHTML = 'Error fetching data';
    }
}


    async function getCurrentOnlineUsers() {
        const onlineUsersElem = document.getElementById('js-online');
        let onlineTotal = 0;

        try {
            const querySnapshot = await getDocs(usersCollectionRef);
            const users = querySnapshot.docs.map(doc => doc.data());

            const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

            users.forEach(user => {
                if (user.createdAt && new Date(user.createdAt.toDate()) >= twentyMinutesAgo) {
                    onlineTotal++;
                }
            });

            onlineUsersElem.innerHTML = onlineTotal;
        } catch (error) {
            console.error("Error fetching online users:", error);
            onlineUsersElem.innerHTML = 'Error fetching data';
        }
    }

    getCurrentOnlineUsers();


    const allToggles = document.querySelectorAll('#js-toggle');

    allToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const target = document.getElementById(this.dataset.target);
            if (target) target.classList.toggle('dn');
        });
    });


    function checkRefund() {
        const refundDiv = document.getElementById('js-refund');
        refundDiv.style.display = 'none';
        const refundList = [
            {
                name: ' jacob khoury',
                for: 1.97,
            }
        ];

        if (userData.userStocks.some(stock => refundList.some(refund => refund.name.toLowerCase() === stock.name.toLowerCase()))) {
            refundDiv.style.display = 'block';
        }
    }

    checkRefund();

    const refundButton = document.getElementById('refund');
    refundButton.addEventListener('click', function() {
        const refundDiv = document.getElementById('js-refund');
        refundDiv.style.display = 'none';

        const refundList = [
            {
                name: ' jacob khoury',
                for: 1.97,
            }
        ];

        let totalRefund = 0;

        userData.userStocks.forEach(stock => {
            const refund = refundList.find(refund => refund.name.toLowerCase() === stock.name.toLowerCase());
            if (refund) {
                totalRefund += refund.for * stock.amount;
            }
        });

        if (totalRefund > 0) {
            updateBalanceUI(checkBetsAndUpdateBalance() + totalRefund);
            updateBalanceAdder(balanceAdder + totalRefund);
            message(`Refund processed successfully. You received $${totalRefund.toFixed(2)}`, '');
            saveUserData();
            updateFb();
            
        } else {
            message('No refund available', 'error');
        }
    });

    let winloseam = 3;

    const seeMoreButton = document.getElementById('see-more-winlos');
    seeMoreButton.addEventListener('click', () => {
        winloseam = winloseam === 3 ? 6 : 3;
        seeMoreButton.textContent = winloseam === 3 ? 'See More' : 'See Less';
        displayWinners();
        displayLosers();
    });
    

        async function displayWinners() {
            const winnersDiv = document.getElementById('js-winners');
            winnersDiv.innerHTML = '';

            try {
                const querySnapshot = await getDocs(usersCollectionRef);
                const users = querySnapshot.docs.map(doc => doc.data());

                const stockData = stockManual.map(stock => {
                    const lastPrice = stock.data[stock.data.length - 1];
                    const firstPrice = stock.data[stock.data.length - 3];
                    const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;

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

                    const marketCap = (lastPrice * totalShares).toFixed(2);

                    return {
                        name: stock.name,
                        percentChange: percentChange.toFixed(2),
                        lastPrice: lastPrice.toFixed(2),
                        totalShares: totalShares,
                        marketCap: marketCap
                    };
                });

                stockData.sort((a, b) => b.percentChange - a.percentChange);

                stockData.slice(0, winloseam).forEach(stock => {
                    const winnerDiv = document.createElement('div');
                    winnerDiv.classList.add('winner');
                    let shareSub = (stock.lastPrice * stock.totalShares * globalSto).toFixed(2);
                    let priceWshares = (parseFloat(stock.lastPrice) + parseFloat(shareSub)).toFixed(2);

                    winnerDiv.innerHTML = `
                        <div class="stock-info">
                            <span class="stock-name ${stock.percentChange >= 0 ? 'buy' : 'sell'}">${stock.name.substring(0, 3).toUpperCase()}</span>
                            <span class="stock-percent ${stock.percentChange >= 0 ? 'buy' : 'sell'}">${stock.percentChange >= 0 ? '+' : ''}${stock.percentChange}%</span>
                        </div>
                        <div class="stats-cont">
                            <div class="statsAlt">
                                <span>mkt cap: $${(stock.marketCap / 1000).toFixed(1)}k</span>
                                <span>shares: ${stock.totalShares}</span>
                            </div>
                            <div class="statsAlt">
                                <span class="stock-price">$${priceWshares}</span>
                            </div>
                        </div>
                    `;
                    winnersDiv.appendChild(winnerDiv);
                });
            } catch (error) {
                console.error("Error fetching winners data:", error);
                winnersDiv.innerHTML = 'Error fetching data';
            }
        }

        displayWinners();
    


    async function displayLosers() {
        const losersDiv = document.getElementById('js-losers');
        losersDiv.innerHTML = '';

        try {
            const querySnapshot = await getDocs(usersCollectionRef);
            const users = querySnapshot.docs.map(doc => doc.data());

            const stockData = stockManual.map(stock => {
                const lastPrice = stock.data[stock.data.length - 1];
                const firstPrice = stock.data[stock.data.length - 3];
                const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;

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

                const marketCap = (lastPrice * totalShares).toFixed(2);

                return {
                    name: stock.name,
                    percentChange: percentChange.toFixed(2),
                    lastPrice: lastPrice.toFixed(2),
                    totalShares: totalShares,
                    marketCap: marketCap
                };
            });

            stockData.sort((a, b) => a.percentChange - b.percentChange);

            stockData.slice(0, winloseam).forEach(stock => {
                const loserDiv = document.createElement('div');
                loserDiv.classList.add('looser');
                let shareSub = (stock.lastPrice * stock.totalShares * globalSto).toFixed(2);
                let priceWshares = (parseFloat(stock.lastPrice) + parseFloat(shareSub)).toFixed(2);

                loserDiv.innerHTML = `
                    <div class="stock-info">
                        <span class="stock-name ${stock.percentChange >= 0 ? 'buy' : 'sell'}">${stock.name.substring(0, 3).toUpperCase()}</span>
                        <span class="stock-percent ${stock.percentChange >= 0 ? 'buy' : 'sell'}">${stock.percentChange >= 0 ? '+' : ''}${stock.percentChange}%</span>
                    </div>
                    <div class="stats-cont">
                        <div class="statsAlt">
                            <span>mkt cap: $${(stock.marketCap / 1000).toFixed(1)}k</span>
                            <span>shares: ${stock.totalShares}</span>
                        </div>
                        <div class="statsAlt">
                            <span class="stock-price">$${priceWshares}</span>
                        </div>
                    </div>
                `;
                losersDiv.appendChild(loserDiv);
            });
        } catch (error) {
            console.error("Error fetching losers data:", error);
            losersDiv.innerHTML = 'Error fetching data';
        }
    }


    // function displayWinners() {
    //     async function displayWinners() {
    //         const winnersDiv = document.getElementById('js-winners');
    //         winnersDiv.innerHTML = '';

    //         try {
    //             const querySnapshot = await getDocs(usersCollectionRef);
    //             const users = querySnapshot.docs.map(doc => doc.data());

    //             const stockData = indexes.concat(stockManual).map(stock => {
    //                 const lastPrice = stock.data[stock.data.length - 1];
    //                 const firstPrice = stock.data[stock.data.length - 3];
    //                 const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;

    //                 let totalShares = 0;
    //                 users.forEach(user => {
    //                     if (Array.isArray(user.userStocks)) {
    //                         user.userStocks.forEach(userStock => {
    //                             if (userStock.name === stock.name) {
    //                                 totalShares += userStock.amount;
    //                             }
    //                         });
    //                     }
    //                 });

    //                 const marketCap = (lastPrice * totalShares).toFixed(2);

    //                 return {
    //                     name: stock.name,
    //                     percentChange: percentChange.toFixed(2),
    //                     lastPrice: lastPrice.toFixed(2),
    //                     totalShares: totalShares,
    //                     marketCap: marketCap
    //                 };
    //             });

    //             stockData.sort((a, b) => b.percentChange - a.percentChange);

    //             stockData.slice(0, winloseam).forEach(stock => {
    //                 const winnerDiv = document.createElement('div');
    //                 winnerDiv.classList.add('winner');
    //                 winnerDiv.innerHTML = `
    //                     <div class="stock-info">
    //                         <span class="stock-name ${stock.percentChange >= 0 ? 'buy' : 'sell'}">${stock.name.substring(0, 3).toUpperCase()}</span>
    //                         <span class="stock-percent ${stock.percentChange >= 0 ? 'buy' : 'sell'}">${stock.percentChange >= 0 ? '+' : ''}${stock.percentChange}%</span>
    //                     </div>
    //                     <div class="stats-cont">
    //                         <div class="statsAlt">
    //                             <span>mkt cap: $${(stock.marketCap / 1000).toFixed(1)}k</span>
    //                             <span>shares: ${stock.totalShares}</span>
    //                         </div>
    //                         <div class="statsAlt">
    //                             <span class="stock-price">$${stock.lastPrice}</span>
    //                         </div>
    //                     </div>
    //                 `;
    //                 winnersDiv.appendChild(winnerDiv);
    //             });
    //         } catch (error) {
    //             console.error("Error fetching winners data:", error);
    //             winnersDiv.innerHTML = 'Error fetching data';
    //         }
    //     }

    //     displayWinners();
    // }

    // displayWinners();

    //     async function displayLosers() {
    //         const losersDiv = document.getElementById('js-losers');
    //         losersDiv.innerHTML = '';
    
    //         try {
    //             const querySnapshot = await getDocs(usersCollectionRef);
    //             const users = querySnapshot.docs.map(doc => doc.data());
    
    //             const stockData = indexes.concat(stockManual).map(stock => {
    //                 const lastPrice = stock.data[stock.data.length - 1];
    //                 const firstPrice = stock.data[stock.data.length - 3];
    //                 const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    //                 let totalShares = 0;
    //                 users.forEach(user => {
    //                     if (Array.isArray(user.userStocks)) {
    //                         user.userStocks.forEach(userStock => {
    //                             if (userStock.name === stock.name) {
    //                                 totalShares += userStock.amount;
    //                             }
    //                         });
    //                     }
    //                 });
    
    //                 const marketCap = (lastPrice * totalShares).toFixed(2);
    
    //                 return {
    //                     name: stock.name,
    //                     percentChange: percentChange.toFixed(2),
    //                     lastPrice: lastPrice.toFixed(2),
    //                     totalShares: totalShares,
    //                     marketCap: marketCap
    //                 };
    //             });
    
    //             stockData.sort((a, b) => a.percentChange - b.percentChange);
    
    //             stockData.slice(0, winloseam).forEach(stock => {
    //                 const loserDiv = document.createElement('div');
    //                 loserDiv.classList.add('looser');
    //                 loserDiv.innerHTML = `
    //                     <div class="stock-info">
    //                         <span class="stock-name ${stock.percentChange >= 0 ? 'buy' : 'sell'}">${stock.name.substring(0, 3).toUpperCase()}</span>
    //                         <span class="stock-percent ${stock.percentChange >= 0 ? 'buy' : 'sell'}">${stock.percentChange >= 0 ? '+' : ''}${stock.percentChange}%</span>
    //                     </div>
    //                     <div class="stats-cont">
    //                         <div class="statsAlt">
    //                             <span>mkt cap: $${(stock.marketCap / 1000).toFixed(1)}k</span>
    //                             <span>shares: ${stock.totalShares}</span>
    //                         </div>
    //                         <div class="statsAlt">
    //                             <span class="stock-price">$${stock.lastPrice}</span>
    //                         </div>
    //                     </div>
    //                 `;
    //                 losersDiv.appendChild(loserDiv);
    //             });
    //         } catch (error) {
    //             console.error("Error fetching losers data:", error);
    //             losersDiv.innerHTML = 'Error fetching data';
    //         }
    //     }

/*!
 * @license
 * chartjs-chart-financial
 * http://chartjs.org/
 * Version: 0.2.0
 *
 * Copyright 2024 Chart.js Contributors
 * Released under the MIT license
 * https://github.com/chartjs/chartjs-chart-financial/blob/master/LICENSE.md
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('chart.js'), require('chart.js/helpers')) :
    typeof define === 'function' && define.amd ? define(['chart.js', 'chart.js/helpers'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Chart, global.Chart.helpers));
    })(this, (function (chart_js, helpers) { 'use strict';
    
    /**
     * This class is based off controller.bar.js from the upstream Chart.js library
     */
    class FinancialController extends chart_js.BarController {
    
      static overrides = {
        label: '',
    
        parsing: false,
    
        hover: {
          mode: 'label'
        },
        animations: {
          numbers: {
            type: 'number',
            properties: ['x', 'y', 'base', 'width', 'open', 'high', 'low', 'close']
          }
        },
    
        scales: {
          x: {
            type: 'timeseries',
            offset: true,
            ticks: {
              major: {
                enabled: true,
              },
              source: 'data',
              maxRotation: 0,
              autoSkip: true,
              autoSkipPadding: 75,
              sampleSize: 100
            },
          },
          y: {
            type: 'linear'
          }
        },
    
        plugins: {
          tooltip: {
            intersect: false,
            mode: 'index',
            callbacks: {
              label(ctx) {
                const point = ctx.parsed;
    
                if (!helpers.isNullOrUndef(point.y)) {
                  return chart_js.defaults.plugins.tooltip.callbacks.label(ctx);
                }
    
                const {o, h, l, c} = point;
    
                return `O: ${o}  H: ${h}  L: ${l}  C: ${c}`;
              }
            }
          }
        }
      };
    
      getLabelAndValue(index) {
        const me = this;
        const parsed = me.getParsed(index);
        const axis = me._cachedMeta.iScale.axis;
    
        const {o, h, l, c} = parsed;
        const value = `O: ${o}  H: ${h}  L: ${l}  C: ${c}`;
    
        return {
          label: `${me._cachedMeta.iScale.getLabelForValue(parsed[axis])}`,
          value
        };
      }
    
      getUserBounds(scale) {
        const {min, max, minDefined, maxDefined} = scale.getUserBounds();
        return {
          min: minDefined ? min : Number.NEGATIVE_INFINITY,
          max: maxDefined ? max : Number.POSITIVE_INFINITY
        };
      }
    
      /**
         * Implement this ourselves since it doesn't handle high and low values
         * https://github.com/chartjs/Chart.js/issues/7328
         * @protected
         */
      getMinMax(scale) {
        const meta = this._cachedMeta;
        const _parsed = meta._parsed;
        const axis = meta.iScale.axis;
        const otherScale = this._getOtherScale(scale);
        const {min: otherMin, max: otherMax} = this.getUserBounds(otherScale);
    
        if (_parsed.length < 2) {
          return {min: 0, max: 1};
        }
    
        if (scale === meta.iScale) {
          return {min: _parsed[0][axis], max: _parsed[_parsed.length - 1][axis]};
        }
    
        const newParsedData = _parsed.filter(({x}) => x >= otherMin && x < otherMax);
    
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < newParsedData.length; i++) {
          const data = newParsedData[i];
          min = Math.min(min, data.l);
          max = Math.max(max, data.h);
        }
        return {min, max};
      }
    
      /**
         * @protected
         */
      calculateElementProperties(index, ruler, reset, options) {
        const me = this;
        const vscale = me._cachedMeta.vScale;
        const base = vscale.getBasePixel();
        const ipixels = me._calculateBarIndexPixels(index, ruler, options);
        const data = me.chart.data.datasets[me.index].data[index];
        const open = vscale.getPixelForValue(data.o);
        const high = vscale.getPixelForValue(data.h);
        const low = vscale.getPixelForValue(data.l);
        const close = vscale.getPixelForValue(data.c);
    
        return {
          base: reset ? base : low,
          x: ipixels.center,
          y: (low + high) / 2,
          width: ipixels.size,
          open,
          high,
          low,
          close
        };
      }
    
      draw() {
        const me = this;
        const chart = me.chart;
        const rects = me._cachedMeta.data;
        helpers.clipArea(chart.ctx, chart.chartArea);
        for (let i = 0; i < rects.length; ++i) {
          rects[i].draw(me._ctx);
        }
        helpers.unclipArea(chart.ctx);
      }
    
    }
    
    /**
     * Helper function to get the bounds of the bar regardless of the orientation
     * @param {Rectangle} bar the bar
     * @param {boolean} [useFinalPosition]
     * @return {object} bounds of the bar
     * @private
     */
    function getBarBounds(bar, useFinalPosition) {
      const {x, y, base, width, height} = bar.getProps(['x', 'low', 'high', 'width', 'height'], useFinalPosition);
    
      let left, right, top, bottom, half;
    
      if (bar.horizontal) {
        half = height / 2;
        left = Math.min(x, base);
        right = Math.max(x, base);
        top = y - half;
        bottom = y + half;
      } else {
        half = width / 2;
        left = x - half;
        right = x + half;
        top = Math.min(y, base); // use min because 0 pixel at top of screen
        bottom = Math.max(y, base);
      }
    
      return {left, top, right, bottom};
    }
    
    function inRange(bar, x, y, useFinalPosition) {
      const skipX = x === null;
      const skipY = y === null;
      const bounds = !bar || (skipX && skipY) ? false : getBarBounds(bar, useFinalPosition);
    
      return bounds
            && (skipX || x >= bounds.left && x <= bounds.right)
            && (skipY || y >= bounds.top && y <= bounds.bottom);
    }
    
    class FinancialElement extends chart_js.BarElement {
    
      static defaults = {
        backgroundColors: {
          up: 'rgba(75, 192, 192, 0.5)',
          down: 'rgba(255, 99, 132, 0.5)',
          unchanged: 'rgba(201, 203, 207, 0.5)',
        },
        borderColors: {
          up: 'rgb(75, 192, 192)',
          down: 'rgb(255, 99, 132)',
          unchanged: 'rgb(201, 203, 207)',
        }
      };
    
      height() {
        return this.base - this.y;
      }
    
      inRange(mouseX, mouseY, useFinalPosition) {
        return inRange(this, mouseX, mouseY, useFinalPosition);
      }
    
      inXRange(mouseX, useFinalPosition) {
        return inRange(this, mouseX, null, useFinalPosition);
      }
    
      inYRange(mouseY, useFinalPosition) {
        return inRange(this, null, mouseY, useFinalPosition);
      }
    
      getRange(axis) {
        return axis === 'x' ? this.width / 2 : this.height / 2;
      }
    
      getCenterPoint(useFinalPosition) {
        const {x, low, high} = this.getProps(['x', 'low', 'high'], useFinalPosition);
        return {
          x,
          y: (high + low) / 2
        };
      }
    
      tooltipPosition(useFinalPosition) {
        const {x, open, close} = this.getProps(['x', 'open', 'close'], useFinalPosition);
        return {
          x,
          y: (open + close) / 2
        };
      }
    }
    
    class CandlestickElement extends FinancialElement {
      static id = 'candlestick';
    
      static defaults = {
        ...FinancialElement.defaults,
        borderWidth: 1,
      };
    
      draw(ctx) {
        const me = this;
    
        const {x, open, high, low, close} = me;
    
        let borderColors = me.options.borderColors;
        if (typeof borderColors === 'string') {
          borderColors = {
            up: borderColors,
            down: borderColors,
            unchanged: borderColors
          };
        }
    
        let borderColor;
        if (close < open) {
          borderColor = helpers.valueOrDefault(borderColors ? borderColors.up : undefined, chart_js.defaults.elements.candlestick.borderColors.up);
          ctx.fillStyle = helpers.valueOrDefault(me.options.backgroundColors ? me.options.backgroundColors.up : undefined, chart_js.defaults.elements.candlestick.backgroundColors.up);
        } else if (close > open) {
          borderColor = helpers.valueOrDefault(borderColors ? borderColors.down : undefined, chart_js.defaults.elements.candlestick.borderColors.down);
          ctx.fillStyle = helpers.valueOrDefault(me.options.backgroundColors ? me.options.backgroundColors.down : undefined, chart_js.defaults.elements.candlestick.backgroundColors.down);
        } else {
          borderColor = helpers.valueOrDefault(borderColors ? borderColors.unchanged : undefined, chart_js.defaults.elements.candlestick.borderColors.unchanged);
          ctx.fillStyle = helpers.valueOrDefault(me.backgroundColors ? me.backgroundColors.unchanged : undefined, chart_js.defaults.elements.candlestick.backgroundColors.unchanged);
        }
    
        ctx.lineWidth = helpers.valueOrDefault(me.options.borderWidth, chart_js.defaults.elements.candlestick.borderWidth);
        ctx.strokeStyle = borderColor;
    
        ctx.beginPath();
        ctx.moveTo(x, high);
        ctx.lineTo(x, Math.min(open, close));
        ctx.moveTo(x, low);
        ctx.lineTo(x, Math.max(open, close));
        ctx.stroke();
        ctx.fillRect(x - me.width / 2, close, me.width, open - close);
        ctx.strokeRect(x - me.width / 2, close, me.width, open - close);
        ctx.closePath();
      }
    }
    
    class CandlestickController extends FinancialController {
    
      static id = 'candlestick';
    
      static defaults = {
        ...FinancialController.defaults,
        dataElementType: CandlestickElement.id
      };
    
      static defaultRoutes = chart_js.BarController.defaultRoutes;
    
      updateElements(elements, start, count, mode) {
        const reset = mode === 'reset';
        const ruler = this._getRuler();
        const {sharedOptions, includeOptions} = this._getSharedOptions(start, mode);
    
        for (let i = start; i < start + count; i++) {
          const options = sharedOptions || this.resolveDataElementOptions(i, mode);
    
          const baseProperties = this.calculateElementProperties(i, ruler, reset, options);
    
          if (includeOptions) {
            baseProperties.options = options;
          }
          this.updateElement(elements[i], i, baseProperties, mode);
        }
      }
    
    }
    
    const defaults = chart_js.Chart.defaults;
    
    class OhlcElement extends FinancialElement {
      static id = 'ohlc';
    
      static defaults = {
        ...FinancialElement.defaults,
        lineWidth: 2,
        armLength: null,
        armLengthRatio: 0.8
      };
    
      draw(ctx) {
        const me = this;
    
        const {x, open, high, low, close} = me;
    
        const armLengthRatio = helpers.valueOrDefault(me.armLengthRatio, defaults.elements.ohlc.armLengthRatio);
        let armLength = helpers.valueOrDefault(me.armLength, defaults.elements.ohlc.armLength);
        if (armLength === null) {
          // The width of an ohlc is affected by barPercentage and categoryPercentage
          // This behavior is caused by extending controller.financial, which extends controller.bar
          // barPercentage and categoryPercentage are now set to 1.0 (see controller.ohlc)
          // and armLengthRatio is multipled by 0.5,
          // so that when armLengthRatio=1.0, the arms from neighbour ohcl touch,
          // and when armLengthRatio=0.0, ohcl are just vertical lines.
          armLength = me.width * armLengthRatio * 0.5;
        }
    
        if (close < open) {
          ctx.strokeStyle = helpers.valueOrDefault(me.options.borderColors ? me.options.borderColors.up : undefined, defaults.elements.ohlc.borderColors.up);
        } else if (close > open) {
          ctx.strokeStyle = helpers.valueOrDefault(me.options.borderColors ? me.options.borderColors.down : undefined, defaults.elements.ohlc.borderColors.down);
        } else {
          ctx.strokeStyle = helpers.valueOrDefault(me.options.borderColors ? me.options.borderColors.unchanged : undefined, defaults.elements.ohlc.borderColors.unchanged);
        }
        ctx.lineWidth = helpers.valueOrDefault(me.lineWidth, defaults.elements.ohlc.lineWidth);
    
        ctx.beginPath();
        ctx.moveTo(x, high);
        ctx.lineTo(x, low);
        ctx.moveTo(x - armLength, open);
        ctx.lineTo(x, open);
        ctx.moveTo(x + armLength, close);
        ctx.lineTo(x, close);
        ctx.stroke();
      }
    }
    
    class OhlcController extends FinancialController {
      static id = 'ohlc';
    
      static defaults = {
        ...FinancialController.defaults,
        dataElementType: OhlcElement.id,
        datasets: {
          barPercentage: 1.0,
          categoryPercentage: 1.0
        }
      };
    
      updateElements(elements, start, count, mode) {
        const reset = mode === 'reset';
        const ruler = this._getRuler();
        const {sharedOptions, includeOptions} = this._getSharedOptions(start, mode);
    
        for (let i = start; i < start + count; i++) {
          const options = sharedOptions || this.resolveDataElementOptions(i, mode);
    
          const baseProperties = this.calculateElementProperties(i, ruler, reset, options);
    
          if (includeOptions) {
            baseProperties.options = options;
          }
          this.updateElement(elements[i], i, baseProperties, mode);
        }
      }
    
    }
    
    chart_js.Chart.register(CandlestickController, OhlcController, CandlestickElement, OhlcElement);
    
    }));