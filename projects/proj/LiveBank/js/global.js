document.addEventListener('DOMContentLoaded', () => {
    const accounts = localStorage.getItem('accounts') ? JSON.parse(localStorage.getItem('accounts')) : [];
    const accountSelecters = document.querySelectorAll('#accountSelecter');

    accountSelecters.forEach(selecter => {
        selecter.innerHTML = '<option selected disabled>Select an account</option>';
        accounts.forEach(account => {
            selecter.innerHTML += `<option value="${account.id}">${account.name}</option>`;
        });
        selecter.addEventListener('change', updateAccountDisplay);
    });

    if (accounts.length > 0) {
        accountSelecters.forEach(selecter => {
            selecter.value = accounts[0].id;
        });
        updateAccountDisplay();
    }

    function updateAccountDisplay() {
        const selectedAccountId = parseInt(accountSelecters[0].value); // Assuming all selectors have the same value
        const account = accounts.find(acc => acc.id === selectedAccountId);
        const moneyDisplays = document.querySelectorAll('.js-moneyDisplay');
        const portfolioDisplays = document.querySelectorAll('.js-portfolioDisplay');

        moneyDisplays.forEach(display => {
            display.innerHTML = "";
            if (account.balance < 0) {
                display.innerHTML = `<span class="stat-err">-$${fwc(account.balance)}</span>`;
            } else {
                display.innerHTML = `<span>$${fwc(account.balance)}</span>`;
            }
        });

        portfolioDisplays.forEach(display => {
            display.innerHTML = "";
            if (account.portfolio < 0) {
                display.innerHTML = `-$${fwc(account.portfolio)}`;
            } else {
                display.innerHTML = `$${fwc(account.portfolio)}`;
            }
        });
    }
});

function fwc(number) {
    return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
