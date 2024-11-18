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

checkIfisBanned();
antiC();    
openSite()

// userData.userStocks = []
// saveData();

const indexes = [
    {
        name: 'MTMY',
        data: combineStocksAverage('Matt Ortiz', 'Mylander'),
        sub: 'MATMYL',
        id: 'MTMY',
        basedOn: `Matt Ortiz and Mylander`,
    },
    {
        name: 'RPTR',
        data: combineStocksAverage('Raphael', 'Torre'),
        sub: 'RPTR',
        id: 'RPTR',
        basedOn: `Raphael and Torre`,
    },
    {
        name: 'FRZE',
        data: combineStocksAverage('FreeBairn', 'Zwing Coin'),
        sub: 'FRZE',
        id: 'FRZE',
        basedOn: `Story tellers`,
    },
    {
        name: 'BRZE',
        data: combineStocksAverage('Burks', 'Zwing Coin'),
        sub: 'BRZE',
        id: 'BRZE',
        basedOn: `Yapfest`,
    },

];


const globalSto = 0.0003;

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

import { stockManual } from './stocks-array.js';

import { updateFb, getFb } from './firebaseconfig.js';
import { onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

if (userData.ban) {
    window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
}

getFb();

let currentSelectedStock;



function combineStocksAverage(stock1, stock2) {
    const stock1Data = stockManual.find(stock => stock.name === stock1);
    const stock2Data = stockManual.find(stock => stock.name === stock2);
    if (stock1Data && stock2Data) {
        const combinedData = stock1Data.data.map((value, index) => {
            return (value + stock2Data.data[index]) / 2;
        });
        return combinedData;
    } else {
        throw new Error('One or both stocks not found');
    }
}


function _(id) {
    return document.getElementById(id);
}

function cl(classelem) {
    return document.getElementsByClassName(classelem);
} 

const usrnamediv = _('username');
usrnamediv.innerHTML = userData.username || '???';

checkBetsAndUpdateBalance();
getFb();



function getLastPrice(stockName) {
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


function calcStock(typeBet) {
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
    const ctx = document.getElementById('myLineChart').getContext('2d');
    typeBet = typeBet.reverse()
    // Check if it's manual stock data (array of numbers) or sports bet data (array of objects)
    if (Array.isArray(typeBet) && typeof typeBet[0] === 'number') {
        typeBet.reverse(); // Reverse the order of the array

        var lastPrice = typeBet[typeBet.length - 1];
        var priceWshares;

        // It's manual stock data
        let stockI = stockManual.find(stock => stock.data === typeBet);
        let indexI = indexes.find(stock => stock.data === typeBet);

        let index = indexI;
        let stock = stockI;
        let basedOn = (stock && stock.basedOn) || (index && index.basedOn) || 'Unknown';
        _('js-symbol').innerHTML = (stock && stock.id) || (index && index.id) || '???';
        _('js-name').innerHTML = (stock ? stock.name : (index ? index.name : '???'));

        const priceHtml = _('js-price');
        // const averagePrice = (typeBet.reduce((sum, price) => sum + price, 0) / typeBet.length).toFixed(2);
        displayShareAmount().then(shareAmount => {
            let shareSub;
            shareSub = (lastPrice * shareAmount * globalSto).toFixed(2);
            priceWshares = (lastPrice + parseFloat(shareSub)).toFixed(2);
            priceHtml.innerHTML = '$' + priceWshares;
        });


        _('js-based').innerHTML = basedOn;

        const firstPrice = typeBet[0];

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

        // Destroy previous chart if it exists
        if (chartInstance !== null) {
            chartInstance.destroy();
        }

        // Create chart with manual stock data
        displayShareAmount().then(shareAmount => {
            let shareSub;
            shareSub = (lastPrice * shareAmount * globalSto).toFixed(2);
            priceWshares = (lastPrice + parseFloat(shareSub)).toFixed(2);

            const data = {
                labels: typeBet.map((_, index) => `${index + 1}`),
                datasets: [{
                label: 'Manual Stock Prices',
                data: typeBet,
                fill: false,
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
                }]
            };

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                ...data,
                datasets: [{
                    ...data.datasets[0],
                    data: [...data.datasets[0].data.slice(0, -1), priceWshares]
                }]
                },
                options: {
                scales: {
                    x: {
                    title: {
                        display: true,
                        text: ''
                    }
                    },
                    y: {
                    title: {
                        display: true,
                        text: 'Stock Price'
                    }
                    }
                }
                }
            });
        });

    } else {
        // It's sports bet data
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
        console.log(buyAmount);
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

function displayUserStocks() {
    stockDiv.innerHTML = ''; // Clear the stockDiv before adding stocks

    if (userData.userStocks.length === 0) {
        stockDiv.innerHTML += '<span>You do not have any stocks</span>';
        return;
    } 

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

            // Calculate the price with shares influence
            let shareSub = (lastPrice * stock.amount * globalSto).toFixed(2);
            let priceWshares = (lastPrice + parseFloat(shareSub)).toFixed(2);

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
        portfolioValue += stock.amount * lastPrice;
    });
    portfolioDiv.innerHTML = `$${portfolioValue.toFixed(2)}`;
}


displayUserStocks();

const usernameDiv = document.getElementById('username');
usernameDiv.innerHTML = userData.username || '???';



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

        saveUserData();
        displayUserStocks();
        displayPortfolio();
        updateFb();
    } else {
        message('Insufficient funds to complete purchase', 'error');
    }
}

function sell() {
    updatePriceWsharesElem();
    displayShareAmount()
    writeStock(currentSelectedStock);
    let stockName = _('js-name').textContent;
    let currentPrice = parseFloat(_('js-price').textContent.replace(/[^0-9.-]+/g, ''));

    let stock = userData.userStocks.find(s => s.name === stockName);
    if (stock && stock.amount >= buyAmount) {
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

        saveUserData();
        displayUserStocks();
        displayPortfolio();
        updateFb();
    } else {
        message('Insufficient shares to complete sale', 'error');
    }
}

// Attach event listeners
_('buy').addEventListener('click', buy);
_('sell').addEventListener('click', sell);



renderLeaders();
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
        leaders.slice(0, 12).forEach((leader, index) => {
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
                    const styles = leader.leaderStyle.split(' ');
                    styles.forEach(style => {
                        leaderDiv.classList.add(style);
                    });
                }
                leaderDiv.innerHTML = `
                    <span class="leader-rank">${index + 1}</span>
                    <span class="leader-name">${leader.username || leader.name}</span>
                    <span class="leader-balance">${portfolioValue.toFixed(2)}</span>
                `;
                leaderElem.appendChild(leaderDiv);
            }
        });
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

const debouncedDisplayUserStocks = debounce(displayUserStocks, 300);
const debouncedDisplayPortfolio = debounce(displayPortfolio, 300);
const debouncedDisplayLargestStocks = debounce(displayLargestStocks, 300);
const debouncedDisplayTopShareHolders = debounce(displayTopShareHolders, 300);
const debouncedRenderLeaders = debounce(renderLeaders, 300);
const debouncedWriteStock = debounce(writeStock, 300);
const debouncegetCurrentOnlineUsers = debounce(getCurrentOnlineUsers, 2300);

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
    topShareHoldersDiv.innerHTML = '';

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
                const styles = holder.leaderStyle.split(' ');
                styles.forEach(style => {
                    holderDiv.classList.add(style);
                });
            }


            holderDiv.innerHTML = `
            <span class="leader-rank">${index + 1}</span>
            <span class="leader-name">${holder.username}</span>
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

            const twentyMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

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


