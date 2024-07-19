document.addEventListener('DOMContentLoaded', () => {
  let accountCounter = 0;
  const accounts = [];

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
          balance: 0,
          history: []
      };
      accounts.push(account);
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
              account.history.push(`Bought ${item} for $${itemPrice.toFixed(2)}`);
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
              <strong>${account.name}:</strong> $${account.balance.toFixed(2)}
              <h4>Transaction History:</h4>
              <ul>${account.history.map(item => `<li>${item}</li>`).join('')}</ul>
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
});
