document.addEventListener('DOMContentLoaded', () => {
    const accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    const businessData = {
        'lemonade': { cost: 500, interval: 800, profit: 7, maxEmployees: 1, upgradeCost: 502, upgradeMultiplier: 1.65, typeShop: 'lem-shop' },
        'corner shop': { cost: 10000, interval: 800, profit: 32, maxEmployees: 5, upgradeCost: 1802, upgradeMultiplier: 1.25, typeShop: 'corner-shop' },
        shop2: { cost: 110000, interval: 390, profit: 62, maxEmployees: 8, upgradeCost: 20500, upgradeMultiplier: 1.75, typeShop: 'shoe-shop' },
        shop3: { cost: 230000, interval: 390, profit: 132, maxEmployees: 10, upgradeCost: 45000, upgradeMultiplier: 1.75, typeShop: 'res-shop' }
    };

    // Function to format numbers with commas
    function formatNumberWithCommas(number) {
        return number.toLocaleString();
    }



    function saveAccounts() {
        localStorage.setItem('accounts', JSON.stringify(accounts)); 
    }

    function renderAccounts() {
        const accountsDiv = document.getElementById('accounts');
        accountsDiv.innerHTML = '';
        accounts.forEach(account => {
            const accountDiv = document.createElement('div');
            accountDiv.className = 'account';
            accountDiv.innerHTML = `
                <span class="top">${account.name}</span>
                <div class='ac-cont'>
                    <div class='bal'>
                        <span>$${formatNumberWithCommas(account.balance)}</span>
                        <span>Available Balance</span>
                    </div>
                    <h4>Transaction History</h4>
                </div>
            `;
            accountsDiv.appendChild(accountDiv);
        });
    }

    updateAccountSelects()
    

    function updateAccountSelects() {
        const businessAccountSelect = document.getElementById('businessAccountSelect');
        businessAccountSelect.innerHTML = '';
        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.text = account.name;
            businessAccountSelect.appendChild(option);
        });
    }

    function buyBusiness(accountId, businessType) {
        const account = accounts.find(acc => acc.id === parseInt(accountId));
        const business = businessData[businessType];
    
        if (account && business && account.balance >= business.cost) {
            account.balance -= business.cost;
            account.history.push(`Bought ${businessType} for $${business.cost.toFixed(2)}`);
            account.businesses = account.businesses || [];
            account.businesses.push({
                type: businessType,
                profit: business.profit,
                interval: business.interval,
                employees: business.maxEmployees,
                currentEmployees: business.maxEmployees,
                upgradeCost: business.upgradeCost,
                upgradeMultiplier: business.upgradeMultiplier,
                typeShop: business.typeShop,
                totalEarnings: 0 // Initialize total earnings
            });

            console.log(business.typeShop)
            saveAccounts();
            renderAccounts();
            renderBusinesses(account);
            startBusiness(account, account.businesses.length - 1);
        } else {
            alert('Insufficient funds to buy this business.');
        }
    }

    function startBusiness(account, businessIndex) {
        const business = account.businesses[businessIndex];
        setInterval(() => {
            business.totalEarnings = (business.totalEarnings || 0) + business.profit;
            account.balance += business.profit;
            saveAccounts();
            renderAccounts();
            renderBusinesses(account);
        }, business.interval);
    }


   
    function renderBusinesses(account) {
        const shopsDiv = document.getElementById('shops');
        shopsDiv.innerHTML = '';
        account.businesses.forEach((business, index) => {
            const businessDiv = document.createElement('div');
            businessDiv.className = `shop bui ${business.typeShop}`;
            businessDiv.innerHTML = `
                <span class="multi">${business.upgradeMultiplier}x</span>
                <div class="shop-top fl-c">
                    <span class="name">${business.type} #${index + 1}</span>
                    <span class="sub">Type: ${business.type}</span>
                    <span class="stat">Income: +$${formatNumberWithCommas(business.profit)}</span>
                    <span>Employees: ${business.currentEmployees}/${business.employees}</span>
                </div>
                <div class="shop-top">
                    <button class="red" onclick="fireEmployee(${account.id}, ${index})">FIRE -1</button>
                    <button class="stat-bg stand_er" onclick="hireEmployee(${account.id}, ${index})" ${business.currentEmployees >= business.employees ? 'disabled' : ''}>HIRE</button>
                </div>
                <div class="shop-top">
                    <button class="" onclick="upgradeBusiness(${account.id}, ${index})">UPGRADE ($${formatNumberWithCommas(business.upgradeCost)})</button>
                </div>
                <div class="shop-top">($${formatNumberWithCommas(business.totalEarnings)})</div>
            `;
            shopsDiv.appendChild(businessDiv);
        });
    }


    
    window.hireEmployee = function(accountId, businessIndex) {
        const account = accounts.find(acc => acc.id === parseInt(accountId));
        const business = account.businesses[businessIndex];
        if (business.currentEmployees < business.employees) {
            business.currentEmployees++;
            business.profit *= 1.10;
            saveAccounts();
            renderBusinesses(account);
        }
    }

    window.fireEmployee = function(accountId, businessIndex) {
        const account = accounts.find(acc => acc.id === parseInt(accountId));
        const business = account.businesses[businessIndex];
        if (business.currentEmployees > 0) {
            business.currentEmployees--;
            business.profit *= 0.90;
            saveAccounts();
            renderBusinesses(account);
        }
    }

    window.upgradeBusiness = function(accountId, businessIndex) {
        const account = accounts.find(acc => acc.id === parseInt(accountId));
        const business = account.businesses[businessIndex];
        if (account.balance >= business.upgradeCost) {
            account.balance -= business.upgradeCost;
            business.upgradeCost *= business.upgradeMultiplier;
            business.profit *= 1.44;
            business.employees = Math.floor(business.employees * 1.75);
            business.currentEmployees = business.employees;
            saveAccounts();
            renderBusinesses(account);
        } else {
            alert('Insufficient funds to upgrade this business.');
        }
    }

    document.getElementById('buyShop-lemon').addEventListener('click', () => {
        const accountId = document.getElementById('businessAccountSelect').value;
        buyBusiness(accountId, 'lemonade');
    });

    document.getElementById('buyShop1').addEventListener('click', () => {
        const accountId = document.getElementById('businessAccountSelect').value;
        buyBusiness(accountId, 'corner shop');
    });

    document.getElementById('buyShop2').addEventListener('click', () => {
        const accountId = document.getElementById('businessAccountSelect').value;
        buyBusiness(accountId, 'shop2');
    });

    document.getElementById('buyShop3').addEventListener('click', () => {
        const accountId = document.getElementById('businessAccountSelect').value;
        buyBusiness(accountId, 'shop3');
    });

    accounts.forEach(account => {
        if (account.businesses) {
            account.businesses.forEach((_, index) => startBusiness(account, index));
            renderBusinesses(account);
        }
    });

    // Initial rendering and updating selects
    renderAccounts();
    updateAccountSelects();
});

// localStorage.clear();