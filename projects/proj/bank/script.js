document.addEventListener('DOMContentLoaded', () => {
    let accountCounter = 0;
    const accounts = JSON.parse(localStorage.getItem('accounts')) || [];

    if (accounts.length > 0) {
        accountCounter = accounts[accounts.length - 1].id + 1;
    }

    const addAccountButton = document.getElementById('addAccount');
    const accountSelect = document.getElementById('accountSelect');
    const fromAccountSelect = document.getElementById('fromAccount');
    const toAccountSelect = document.getElementById('toAccount');
    const buyAccountSelect = document.getElementById('buyAccount');
    const renameAccountSelect = document.getElementById('renameAccountSelect');
    const itemPrices = {
        burger: 10,
        pizza: 20,
        rent: 2500
    };

    addAccountButton.addEventListener('click', () => {
        const account = {
            id: accountCounter++,
            name: `Account #${accountCounter}`,
            balance: 500,
            history: []
        };
        accounts.push(account);
        saveAccounts();
        renderAccounts();
        updateAccountSelects();
    });

    document.getElementById('addMoney').addEventListener('click', () => {
        const accountId = parseInt(accountSelect.value);
        const amount = parseFloat(document.getElementById('amount').value);
        const account = accounts.find(acc => acc.id === accountId);
        if (account) {
            account.balance += amount;
            account.history.push(`Added $${amount.toFixed(2)}`);
            saveAccounts();
            renderAccounts();
        }
    });

    document.getElementById('transferMoney').addEventListener('click', () => {
        const fromAccountId = parseInt(fromAccountSelect.value);
        const toAccountId = parseInt(toAccountSelect.value);
        const amount = parseFloat(document.getElementById('transferAmount').value);
        const fromAccount = accounts.find(acc => acc.id === fromAccountId);
        const toAccount = accounts.find(acc => acc.id === toAccountId);
        if (fromAccount && toAccount && fromAccount.balance >= amount) {
            fromAccount.balance -= amount;
            toAccount.balance += amount;
            fromAccount.history.push(`Transferred $${amount.toFixed(2)} to ${toAccount.name}`);
            toAccount.history.push(`Received $${amount.toFixed(2)} from ${fromAccount.name}`);
            saveAccounts();
            renderAccounts();
        }
    });

    document.getElementById('buyItem').addEventListener('click', () => {
        const item = document.getElementById('itemSelect').value;
        const accountId = parseInt(buyAccountSelect.value);
        const account = accounts.find(acc => acc.id === accountId);
        if (account) {
            const itemPrice = itemPrices[item];
            if (account.balance >= itemPrice) {
                account.balance -= itemPrice;
                account.history.push(`Bought <span class='item'> ${item} </span> for $${itemPrice.toFixed(2)}`);
                saveAccounts();
                renderAccounts();
            } else {
                alert('Insufficient funds to buy this item.');
            }
        }
    });

    document.getElementById('renameAccount').addEventListener('click', () => {
        const accountId = parseInt(renameAccountSelect.value);
        const newAccountName = document.getElementById('newAccountName').value;
        const account = accounts.find(acc => acc.id === accountId);
        if (account && newAccountName.trim()) {
            account.history.push(`Renamed from ${account.name} to ${newAccountName}`);
            account.name = newAccountName;
            saveAccounts();
            renderAccounts();
            updateAccountSelects();
        }
    });

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
                    <span>$${account.balance.toFixed(2)}</span>
                    <span>Available Balance</span>
                 </div>
                <h4>Transaction History</h4>
                <ul>${account.history.map(item => `<li>${item}</li>`).join('')}</ul>
                 </div>
            `;
            accountsDiv.appendChild(accountDiv);
        });
    }

    function updateAccountSelects() {
        const selects = [accountSelect, fromAccountSelect, toAccountSelect, buyAccountSelect, renameAccountSelect];
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

    function saveAccounts() {
        localStorage.setItem('accounts', JSON.stringify(accounts));
    }

    // Initial rendering and updating selects
    renderAccounts();
    updateAccountSelects();
});
