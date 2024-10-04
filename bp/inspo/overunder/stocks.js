import { soccerBets, basketballBets, volleyballBets, schoolBets } from './bets.js';
import {
    checkBetsAndUpdateBalance,
    message,
    saveData,
    gameSave,
    displayUserInfo,
    userData,
    updateBalanceUI,
    balanceAdder,
    updateBalanceAdder,
} from './global.js';

function _(id) {
    return document.getElementById(id);
}

function cl(classelem) {
    return document.getElementsByClassName(classelem);
}

checkBetsAndUpdateBalance();

const stockManual = [
    {
        id: 'TRR',
        sub: 'TorreCoin',
        name: 'Torre',
        basedOn: 'Test Scores and Moods',
        data: [
            30, 23, 2, 4, 5, 10, 15, 3, 34, 12, 2, 98,
        ],
    },
    {
        id: 'MYY',
        sub: 'myCoin',
        name: 'Mylander',
        basedOn: 'Overall',
        data: [
            20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 123,
        ],
    },
    {
        id: 'WVR',
        sub: 'WeaverCoin',
        name: 'Weaver',
        basedOn: 'Crash outs',
        data: [
             8, 7, 5, 6, 8, 9, 10, 12, 14, 56, 70, 121,8, 7, 5, 6, 8, 9, 10, 12, 14, 56, 70, 121,
        ],
    },
    {
        id: 'BRKS',
        sub: 'SuckerCoin',
        name: 'Burks',
        basedOn: 'Yapping',
        data: [
            12, 15, 10, 8, 7, 5, 6, 8, 9, 10, 12, 14, 56, 70,
        ],
    },
    {
        id: 'DKLV',
        sub: 'DeklevaCoin',
        name: 'Dekleva',
        basedOn: 'Overall',
        data: [
            2, 1, 5, 10, 8, 7, 5, 6, 8, 9, 10, 12, 14, 56, 50,
        ],
    },
    {
        id: 'EGG',
        sub: 'EggeringCoin',
        name: 'Eggering',
        basedOn: 'Wrong Notes',
        data: [
            40, 30, 20, 10, 8, 7, 5, 6, 8, 9, 10, 12, 14, 56, 70,
        ],
    },
];


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
    const ctx = document.getElementById('myLineChart').getContext('2d');

    // Check if it's manual stock data (array of numbers) or sports bet data (array of objects)
    if (Array.isArray(typeBet) && typeof typeBet[0] === 'number') {
        const lastPrice = typeBet[typeBet.length - 1];

        // It's manual stock data
        let stock = stockManual.find(stock => stock.data === typeBet);
        let basedOn = stock.basedOn;
        _('js-symbol').innerHTML = stock.id;
        _('js-name').innerHTML = stock.name;

        const priceHtml = _('js-price');
        // const averagePrice = (typeBet.reduce((sum, price) => sum + price, 0) / typeBet.length).toFixed(2);
        priceHtml.innerHTML = lastPrice.toFixed(2);

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
            data: data,
            options: {
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Days'
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
            const writeType = div.dataset.write;
            clearSelection(); // Clear previous selection for all .sport-option elements
            div.classList.add('selected'); // Add 'selected' class to clicked div
            if (writeType === 'soccer') {
                writeStock(soccerBets);
            } else if (writeType === 'basketball') {
                writeStock(basketballBets);
            } else if (writeType === 'volleyball') {
                writeStock(volleyballBets);
            } else if (writeType === 'school') {
                writeStock(schoolBets);
            } else if (writeType === 'TRR') {
                writeStock(stockManual[0].data);
            } else if (writeType === 'MYY') {
                writeStock(stockManual[1].data);
            } else if (writeType === 'WVR') {
                writeStock(stockManual[2].data);
            } else if (writeType === 'BRKS') {
                writeStock(stockManual[3].data);
            } else if (writeType === 'DKLV') {
                writeStock(stockManual[4].data);
            } else if (writeType === 'EGG') {
                writeStock(stockManual[5].data);
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
                <span class="sport-option">(XC) Cross Country</span>
            `;
        } else if (showtype === 'teachers') {
            stockManual.forEach(stock => {
                pickers.innerHTML += `
                    <span class="sport-option" data-write="${stock.id}">${stock.sub}</span>
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

function displayUserStocks() {
    stockDiv.innerHTML = ''; // Clear the stockDiv before adding stocks

    userData.userStocks.forEach(stock => {
        if (stock.amount > 0) {
            let lastPrice;

            // Check if the stock is a manual stock
            let manualStock = stockManual.find(s => s.name === stock.name);
            if (manualStock) {
                lastPrice = manualStock.data[manualStock.data.length - 1];
            } else {
                // Handle stocks from calcStock
                switch (stock.name) {
                    case 'Soccer':
                        lastPrice = calcStock(soccerBets)[calcStock(soccerBets).length - 1]; // Example function call for soccer stocks
                        break;
                    case 'Volleyball':
                        lastPrice = calcStock(volleyballBets)[calcStock(volleyballBets).length - 1]; // Example function call for volleyball stocks
                        break;
                    case 'anotherStockName':
                        lastPrice = calcStock(anotherBets); // Replace with your actual function and variable
                        break;
                    // Add more cases for other stocks
                    default:
                        lastPrice = 0; // Default if no matching case
                }
            }

            // Display the stock information
            stockDiv.innerHTML += `
                <div class="coin">
                    <div class="symbol">
                        <span>${stock.name.substring(0, 3).toUpperCase()}</span>
                    </div>
                    <div class="prices">
                        <span class="price">$${lastPrice}</span>
                        <span>${stock.amount} ${(stock.amount > 1 ? 'shares' : 'share')}</span>
                    </div>
                </div>
            `;
        }
        // <span>${stock.amount} @ $${(lastPrice / stock.amount).toFixed(2)}</span>

    });
}


displayUserStocks();

// Update displayUserStocks whenever user buys or sells
function buy() {
    let currentPrice = parseFloat(_('js-price').textContent.slice(1));
    let currentMoney = checkBetsAndUpdateBalance();
    let stockName = _('js-name').textContent;

    if (currentMoney >= currentPrice * buyAmount) {
        let newMoney = currentPrice * buyAmount;
        message(`You bought ${buyAmount} stocks for $${newMoney.toFixed(2)} of ${stockName}`, '');
        gameSave('stock', `User bought ${buyAmount} stocks for $${newMoney.toFixed(2)} of ${stockName}`);

        // Update balance and balanceAdder
        updateBalanceUI(currentMoney - newMoney);
        updateBalanceAdder(balanceAdder - newMoney);

        // Update user stocks
        let stock = userData.userStocks.find(s => s.name === stockName);
        if (stock) {
            stock.amount += parseInt(buyAmount);
        } else {
            userData.userStocks.push({ name: stockName, amount: parseInt(buyAmount) });
        }

        // Save updated data
        saveUserData();

        // Update stock display
        displayUserStocks();
    } else {
        message('You do not have enough money to buy this stock', 'error');
    }
}

function sell() {
    let currentPrice = parseFloat(_('js-price').textContent.slice(1));
    let currentMoney = checkBetsAndUpdateBalance();
    let stockName = _('js-name').textContent;

    let stock = userData.userStocks.find(s => s.name === stockName);
    if (stock) {
        if (stock.amount >= buyAmount) {
            let newMoney = currentPrice * buyAmount;
            message(`You sold ${buyAmount} stocks for $${newMoney.toFixed(2)} of ${stockName}`, '');
            gameSave('stock', `User sold ${buyAmount} stocks for $${newMoney.toFixed(2)} of ${stockName}`);

            // Update balance and balanceAdder
            updateBalanceUI(currentMoney + newMoney);
            updateBalanceAdder(balanceAdder + newMoney);

            stock.amount -= parseInt(buyAmount);
            if (stock.amount === 0) {
                userData.userStocks = userData.userStocks.filter(s => s.name !== stockName);
            }

            // Save updated data
            saveUserData();

            // Update stock display
            displayUserStocks();
        } else {
            message(`You do not have enough ${stockName} stocks to sell`, 'error');
        }
    } else {
        message(`You do not have any ${stockName} stocks to sell`, 'error');
    }
}

// Attach event listeners
_('buy').addEventListener('click', buy);
_('sell').addEventListener('click', sell);