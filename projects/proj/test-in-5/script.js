document.addEventListener('DOMContentLoaded', () => {
    let accountCounter = 0;
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
        "Stock T": 17000,
        "Stock U": 18000,
        "Stock V": 19000,
        "Stock W": 20000,
        "Stock X": 25000,
        "Stock Y": 29000,
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
        for (const stock in stockPrices) {
            const currentPrice = stockPrices[stock];
            const trend = 0.0001; // Gradual increase
            let percentChange = (Math.random() - 0.5) * 0.05; // Between -2.5% and 2.5%
            percentChange = Math.min(Math.max(percentChange, -0.02), 0.02); // Limit the range
            const changeAmount = currentPrice * percentChange + trend; // Gradual increase
            stockPrices[stock] = Math.max(currentPrice + changeAmount, 0.01); // Ensure price doesn't drop below $0.01
        }
        renderStocks();
        saveStockPrices();
        updatePortfolioTotal();
    }

    setInterval(updateStockPrices, 2290);

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

    function saveAccounts() {
        localStorage.setItem('accounts', JSON.stringify(accounts));
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
});
