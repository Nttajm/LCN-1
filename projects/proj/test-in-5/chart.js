// Define global variables to be used in the file
let stockPrices = JSON.parse(localStorage.getItem('stockPrices')) || generateStockPrices();
let stockPricesHistory = JSON.parse(localStorage.getItem('stockPricesHistory')) || {};

function generateStockPrices() {
    return {
        "Stock A": 10,
        "Stock B": 100,
        "Stock C": 500,
        "Stock D": 1000,
        "Stock E": 2000,
        "Stock F": 3000,
        "Stock G": 4000,
        "Stock H": 5000,
        "Stock I": 6000,
        "Stock J": 7000,
        "Stock K": 8000,
        "Stock L": 9000,
        "Stock M": 10000,
        "Stock N": 11000,
        "Stock O": 12000,
        "Stock P": 13000,
        "Stock Q": 14000,
        "Stock R": 15000,
        "Stock S": 16000,
        "Stock T": 17000,
        "Stock U": 18000,
        "Stock V": 19000,
        "Stock W": 20000,
        "Stock X": 25000,
        "Stock Y": 29000,
    };
}

function updateStockPrices() {
    for (const stock in stockPrices) {
        const currentPrice = stockPrices[stock];
        // Simulate realistic stock price change
        const percentChange = (Math.random() - 0.5) * 0.05; // Between -2.5% and 2.5%
        const changeAmount = currentPrice * percentChange;
        stockPrices[stock] = Math.max(currentPrice + changeAmount, 0.01); // Ensure price doesn't drop below $0.01
    }
    renderStocks();
    saveStockPrices();
    updateStockChart(); // Update chart with new prices
}

function updateStockChart(stock) {
    if (!stock) return;
    const ctx = document.getElementById('stockChart').getContext('2d');
    const data = stockPricesHistory[stock] || { labels: [], data: [] };

    // Add new data point
    const now = new Date().toLocaleTimeString();
    data.labels.push(now);
    data.data.push(stockPrices[stock]);

    // Update chart data
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: `Price of ${stock}`,
                data: data.data,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute'
                    },
                    title: {
                        display: true,
                        text: 'Time'
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

    stockPricesHistory[stock] = data; // Save updated history
    saveStockPricesHistory();
}

function saveStockPricesHistory() {
    localStorage.setItem('stockPricesHistory', JSON.stringify(stockPricesHistory));
}

function renderStocks() {
    const stockListDiv = document.getElementById('stockList');
    stockListDiv.innerHTML = '';
    for (const stock in stocks) {
        const stockDiv = document.createElement('div');
        stockDiv.className = 'stock';
        stockDiv.innerHTML = `
            <strong>${stock}:</strong> ${stocks[stock].shares} shares
            <br>Current Price: $${stockPrices[stock].toFixed(2)}
            <h4>Stock History:</h4>
            <ul>${stocks[stock].history.map(item => `<li>${item}</li>`).join('')}</ul>
        `;
        stockListDiv.appendChild(stockDiv);
    }
}

function saveStockPrices() {
    localStorage.setItem('stockPrices', JSON.stringify(stockPrices));
}

// Update stock prices periodically
setInterval(updateStockPrices, 30000); // Update every 30 seconds
