document.addEventListener('DOMContentLoaded', () => {
    let accountCounter = 0;

    let profitLossHistory = JSON.parse(localStorage.getItem('profitLossHistory')) || [];

    const profitLossList = document.getElementById('profitLossList');
    const accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    const stocks = JSON.parse(localStorage.getItem('stocks')) || {};
    const storedStockPrices = JSON.parse(localStorage.getItem('stockPrices')) || {};
    const stockPrices = Object.keys(storedStockPrices).length > 0 ? storedStockPrices : {
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
        "Stock T": 27000,
        "Stock U": 408000,
        "Stock V": 79000,
        "Stock W": 900000,
        "Stock X": 145000,
        "Stock Y": 499000,
    };
    const stockSelect = document.getElementById('stockSelect');
    const sellStockSelect = document.getElementById('sellStockSelect');
    const sellStockSelectTarget = document.getElementById('sellStockSelectTarget');
    const investAccountSelect = document.getElementById('investAccountSelect');
    const sellAccountSelect = document.getElementById('sellAccountSelect');
    const placeSellOrderButton = document.getElementById('placeSellOrder');
    const portfolioTotalElement = document.getElementById('portfolioTotal');

    // Initialize account counter
    if (accounts.length > 0) {
        accountCounter = accounts[accounts.length - 1].id + 1;
    }

    // Initialize stock prices
    initializeStockPrices();

    // Event Listeners
    document.getElementById('addAccount').addEventListener('click', () => {
        const account = {
            id: accountCounter++,
            name: `Account #${accountCounter}`,
            balance: 0,
            history: []
        };
        accounts.push(account);
        saveAccounts();
        renderAccounts();
        updateAccountSelects();
    });

    document.getElementById('buyStock').addEventListener('click', () => {
        const stock = stockSelect.value;
        const shares = parseInt(document.getElementById('shares').value);
        const accountId = parseInt(investAccountSelect.value);
        const account = accounts.find(acc => acc.id === accountId);
        const price = stockPrices[stock];
        if (account && price * shares <= account.balance) {
            account.balance -= price * shares;
            if (!stocks[stock]) {
                stocks[stock] = { shares: 0, history: [], purchases: [] };
            }
            stocks[stock].shares += shares;
            stocks[stock].history.push(` ${shares} @ $${price.toFixed(2)} each`);
            stocks[stock].purchases.push({ shares, price });
            account.history.push(`${shares} of ${stock} @ $${(price * shares).toFixed(2)}`);
            saveAccounts();
            saveStocks();
            saveStockPrices();
            renderAccounts();
            renderStocks();
            updatePortfolioTotal();
            saveProfitLossHistory();

        } else {
            alert('Insufficient funds to buy this stock.');
        }
    });

    document.getElementById('sellStock').addEventListener('click', () => {
        const stock = sellStockSelect.value;
        const shares = parseInt(document.getElementById('sellShares').value);
        const accountId = parseInt(sellAccountSelect.value);
        const account = accounts.find(acc => acc.id === accountId);
        const price = stockPrices[stock];
        if (account && stocks[stock] && stocks[stock].shares >= shares) {
            let totalCost = 0;
            let remainingShares = shares;
            while (remainingShares > 0 && stocks[stock].purchases.length > 0) {
                const purchase = stocks[stock].purchases[0];
                if (purchase.shares <= remainingShares) {
                    totalCost += purchase.shares * purchase.price;
                    remainingShares -= purchase.shares;
                    stocks[stock].purchases.shift();
                } else {
                    totalCost += remainingShares * purchase.price;
                    purchase.shares -= remainingShares;
                    remainingShares = 0;
                }
            }
            const saleAmount = price * shares;
            const profit = saleAmount - totalCost;
            const profitText = profit >= 0 ? `Profit of $${profit.toFixed(2)}` : `Loss of $${Math.abs(profit).toFixed(2)}`;
            account.balance += saleAmount;
            stocks[stock].shares -= shares;
            stocks[stock].history.push(`Sold ${shares} shares at $${price.toFixed(2)} each (${profitText})`);
            account.history.push(`Sold ${shares} shares of ${stock} for $${saleAmount.toFixed(2)} (${profitText})`);
            if (stocks[stock].shares === 0) {
                delete stocks[stock];
            }
            saveAccounts();
            saveStocks();
            saveStockPrices();
            renderAccounts();
            renderStocks();
            updatePortfolioTotal();
            saveProfitLossHistory();

        } else {
            alert('Insufficient shares to sell.');
        }
    });

    placeSellOrderButton.addEventListener('click', () => {
        const stock = sellStockSelectTarget.value;
        const shares = parseInt(document.getElementById('sellSharesTarget').value);
        const targetPrice = parseFloat(document.getElementById('targetPrice').value);
        const accountId = parseInt(sellAccountSelect.value);
        const account = accounts.find(acc => acc.id === accountId);
        const currentPrice = stockPrices[stock];
        if (account && stocks[stock] && stocks[stock].shares >= shares) {
            if (currentPrice >= targetPrice) {
                let totalCost = 0;
                let remainingShares = shares;
                while (remainingShares > 0 && stocks[stock].purchases.length > 0) {
                    const purchase = stocks[stock].purchases[0];
                    if (purchase.shares <= remainingShares) {
                        totalCost += purchase.shares * purchase.price;
                        remainingShares -= purchase.shares;
                        stocks[stock].purchases.shift();
                    } else {
                        totalCost += remainingShares * purchase.price;
                        purchase.shares -= remainingShares;
                        remainingShares = 0;
                    }
                }
                const saleAmount = targetPrice * shares;
                const profit = saleAmount - totalCost;
                const profitText = profit >= 0 ? `Profit of $${profit.toFixed(2)}` : `Loss of $${Math.abs(profit).toFixed(2)}`;
                account.balance += saleAmount;
                stocks[stock].shares -= shares;
                stocks[stock].history.push(`Sold ${shares} shares at $${targetPrice.toFixed(2)} each (${profitText})`);
                account.history.push(`Sold ${shares} shares of ${stock} for $${saleAmount.toFixed(2)} (${profitText})`);
                if (stocks[stock].shares === 0) {
                    delete stocks[stock];
                }
                saveAccounts();
                saveStocks();
                saveStockPrices();
                renderAccounts();
                renderStocks();
                updatePortfolioTotal();
            } else {
                alert('Current stock price is lower than your target price.');
            }
        } else {
            alert('Insufficient shares to sell or invalid stock.');
        }
    });

    function initializeStockPrices() {
        for (const stock in stockPrices) {
            const option = document.createElement('option');
            option.value = stock;
            option.text = `${stock} ($${stockPrices[stock].toFixed(2)})`;
            stockSelect.appendChild(option);
            const sellOption = option.cloneNode(true);
            sellStockSelect.appendChild(sellOption);
            sellStockSelectTarget.appendChild(sellOption.cloneNode(true));
        }
    }

    function updateStockPrices() {
        const minPrice = 0.01;
        const maxPrice = 1000;
    
        // Factors for randomness and trends
        const baseVolatility = 0.02; // Base volatility for general fluctuation
        const longTermTrend = 0.0012; // Long-term upward trend
    
        // Market conditions (news impact)
        const newsImpact = (Math.random() - 0.5) * 0.05; // Periodic news impact
    
        // Seasonal trends (e.g., quarterly earnings)
        const time = new Date();
        const month = time.getMonth();
        const seasonFactor = Math.sin((month / 12) * 2 * Math.PI) * 0.02; // Seasonal effect based on month
    
        for (const stock in stockPrices) {
            const currentPrice = stockPrices[stock];
            const stockVolatility = baseVolatility + (Math.random() * 0.01); // Different volatility per stock
    
            // Simulate random market movement with spikes and trends
            const trendComponent = longTermTrend * currentPrice; // Apply long-term market trend
            let percentChange = (Math.random() - 0.5) * stockVolatility; // Market fluctuation
            percentChange = Math.min(Math.max(percentChange, -stockVolatility), stockVolatility); // Limit volatility range
    
            // Simulate occasional significant spikes or drops
            if (Math.random() < 0.05) { // 5% chance of a significant spike or drop
                percentChange += (Math.random() - 0.5) * 0.1; // Significant change in price
            }
    
            // Apply news impact and seasonal trends
            percentChange += newsImpact;
            percentChange += seasonFactor;
    
            // Calculate change amount and update stock price
            const changeAmount = currentPrice * percentChange + trendComponent;
            const newPrice = Math.max(minPrice, Math.min(currentPrice + changeAmount, maxPrice)); // Ensure price is within bounds
    
            stockPrices[stock] = newPrice;
        }
    
        // Render and save updated stock prices
        renderStocks();
        saveStockPrices();
        updatePortfolioTotal();
    }

    setInterval(updateStockPrices, 490);

    function renderAccounts() {
        const accountsDiv = document.getElementById('accounts');
        accountsDiv.innerHTML = '';
        accounts.forEach(account => {
            const accountDiv = document.createElement('div');
            accountDiv.className = 'account';
            accountDiv.innerHTML = `
                <strong>${account.name}:</strong> $${account.balance.toFixed(2)}
                <h4>Transaction History:</h4>
                <ul>${account.history.map(item => `<li>${item}</li>`).join('')}</ul>
            `;
            accountsDiv.appendChild(accountDiv);
        });
    }

    // localStorage.clear(); 

    function updateAccountSelects() {
        const selects = [investAccountSelect, sellAccountSelect];
        selects.forEach(select => {
            select.innerHTML = '';
            accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.text = account.name;
                select.appendChild(option);
            });
        });
    }


    function renderStocks() {
        const stockListDiv = document.getElementById('stockList');
        stockListDiv.innerHTML = '';
    
        for (const stock in stocks) {
            const currentPrice = stockPrices[stock];
            const stockData = stocks[stock];
            const totalBoughtPrice = stockData.purchases.reduce((total, purchase) => total + purchase.shares * purchase.price, 0);
            const averageBoughtPrice = totalBoughtPrice / stockData.shares;
            const percentChange = ((currentPrice - averageBoughtPrice) / averageBoughtPrice) * 100;
            const percentChangeText = percentChange >= 0 ? `(+${percentChange.toFixed(2)}%)` : `(${percentChange.toFixed(2)}%)`;
    
            // Determine the class based on percent change
            const percentChangeClass = percentChange >= 0 ? 'green' : 'red';
    
            const stockDiv = document.createElement('div');
            stockDiv.className = 'stock';
            stockDiv.innerHTML = `
                <div class="title">
                    <span class="stock-name">${stock}</span> 
                    <div class="percent ${percentChangeClass}">
                        <span class='current-price'>$${currentPrice.toFixed(2)}</span>
                        <span class=''>${percentChangeText}</span>
                    </div>
                </div>
                <span class="shares"> total shares: ${stockData.shares}</span>
                <span class="shares"><ul>${stockData.history.map(item => `<li>${item}</li>`).join('')}</ul></span>
            `;
            stockListDiv.appendChild(stockDiv);
        }
    }

    function updatePortfolioTotal() {
        let totalValue = 0;
        for (const stock in stocks) {
            totalValue += stocks[stock].shares * stockPrices[stock];
        }
        portfolioTotalElement.textContent = `Total Portfolio Value: $${totalValue.toFixed(2)}`;
    }


    sellForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const stock = sellForm.stock.value;
        const shares = parseInt(sellForm.shares.value);
        const sellAccountId = parseInt(sellForm.account.value);
    
        if (stocks[stock] && stocks[stock].shares >= shares) {
            const boughtPrice = stocks[stock].purchases.reduce((total, purchase) => total + purchase.price * purchase.shares, 0) / stocks[stock].shares;
            const soldPrice = stockPrices[stock];
            
            stocks[stock].shares -= shares;
            accounts[sellAccountId].balance += soldPrice * shares;
    
            recordProfitLoss(stock, shares, boughtPrice, soldPrice);
    
            if (stocks[stock].shares === 0) {
                delete stocks[stock];
            }
    
            saveAccounts();
            saveStocks();
            renderAccounts();
            renderStocks();
            saveProfitLossHistory();

        } else {
            alert("Not enough shares to sell or stock does not exist.");
        }
    });

    function recordProfitLoss(stock, shares, boughtPrice, soldPrice) {
        const profitLoss = (soldPrice - boughtPrice) * shares;
        const record = {
            stock,
            shares,
            boughtPrice,
            soldPrice,
            profitLoss,
            date: new Date().toLocaleString()
        };
        console.log('Recording profit/loss:', record); // Debug log
        profitLossHistory.push(record);
        saveProfitLossHistory();
        renderProfitLossHistory();
    }
    renderProfitLossHistory();

    function renderProfitLossHistory() {
        profitLossList.innerHTML = '';
        profitLossHistory.forEach(entry => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `${entry.date}: Sold ${entry.shares} shares of ${entry.stock} bought at $${entry.boughtPrice.toFixed(2)} for $${entry.soldPrice.toFixed(2)} each. Profit/Loss: $${entry.profitLoss.toFixed(2)}`;
            profitLossList.appendChild(listItem);
        });
    }

    function saveAccounts() {
        localStorage.setItem('accounts', JSON.stringify(accounts));
    }

    function saveProfitLossHistory() {
        localStorage.setItem('profitLossHistory', JSON.stringify(profitLossHistory));
    }

    function saveStocks() {
        localStorage.setItem('stocks', JSON.stringify(stocks));
    }

    function saveStockPrices() {
        localStorage.setItem('stockPrices', JSON.stringify(stockPrices));
    }

    // Initial rendering and updating selects
    renderAccounts();
    updateAccountSelects();
    renderStocks();
    renderProfitLossHistory();

});
