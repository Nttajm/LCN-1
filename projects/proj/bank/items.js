document.addEventListener('DOMContentLoaded', () => {
    const accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    const cardData = {
        'shop-plus': {
            imgSrc: '/images/card-shop-2.png',
            title: 'SHOP+ BUSINESS',
            maxLoan: 6500,
            compoundInterval: 30, // seconds
            maxTerm: 8 * 60, // max 8 minutes
            interestRange: [8, 12], // interest range as percentage
            defaultTermOptions: [3, 5, 8] // min terms in minutes
        }
        // Add more card types here
    };

    function renderAccountSelect() {
        const accountSelect = document.getElementById('accountSelect');
        accountSelect.innerHTML = accounts.map(account => 
            `<option value="${account.id}">${account.name}</option>`
        ).join('');
        accountSelect.addEventListener('change', handleAccountChange);
    }

    function handleAccountChange(event) {
        const accountId = event.target.value;
        const account = accounts.find(acc => acc.id === parseInt(accountId));
        if (account) {
            document.getElementById('accountHoldings').textContent = `HOLDINGS FOR ${account.name}`;
            renderCardDetails(account);
        }
    }

    function renderCardDetails(account) {
        const card = cardData['shop-plus']; // assuming one card type for simplicity
        document.querySelector('#cardDetails').innerHTML = `
            <div class="card-info">
                <img src="${card.imgSrc}" alt="card">
                <span class="card-title">${card.title}</span>
                <ul>
                    <li>Borrow up to <span class="stat bl">$${formatNumberWithCommas(card.maxLoan)}</span></li>
                    <li>Compounds every <span class="bl">${card.compoundInterval} sec</span></li>
                    <li>Interest Rate: <span id="card-interest">${card.interestRange[0]}-${card.interestRange[1]}%</span></li>
                    <li>Max Term: <span class="bl">${card.maxTerm / 60} min</span></li>
                </ul>
            </div>
        `;
        document.querySelector('#card-actions').innerHTML = `
            <button id="applyLoanButton">Apply Now</button>
        `;
        document.getElementById('applyLoanButton').addEventListener('click', () => applyLoan(account));
    }

    window.applyLoan = function(account) {
        const card = cardData['shop-plus'];
        const loanAmount = parseFloat(document.getElementById('loanAmount').value);
        const termMinutes = parseInt(document.getElementById('loanTerm').value) || 0;
    
        if (isNaN(loanAmount) || loanAmount <= 0 || loanAmount > card.maxLoan) {
            document.querySelector('#cardDetails').innerHTML += `<li class="error">Invalid loan amount.</li>`;
            return;
        }
    
        if (isNaN(termMinutes) || termMinutes <= 0 || termMinutes * 60 > card.maxTerm) {
            document.querySelector('#cardDetails').innerHTML += `<li class="error">Invalid term.</li>`;
            return;
        }
    
        const termSeconds = termMinutes * 60;
        const totalCompounds = termSeconds / card.compoundInterval;
        const interestRate = card.interestRange[0] + Math.random() * (card.interestRange[1] - card.interestRange[0]);
        const totalInterest = interestRate / 100;
        const totalCost = loanAmount * (1 + totalInterest * totalCompounds);
        const deductionPerInterval = (loanAmount * totalInterest) / totalCompounds;
    
        // Update account with new loan details
        account.loan = {
            amount: loanAmount,
            term: termMinutes + ' min',
            interestRate: interestRate,
            totalCost: totalCost,
            remainingDebt: totalCost,
            payments: totalCost / totalCompounds,
            compoundInterval: card.compoundInterval
        };
    
        // Add loan amount to account balance
        account.balance += loanAmount;
    
        saveAccounts();
        updateCardForLoan(account, deductionPerInterval);
    }
    

    function submitLoan(account) {
        const loanAmount = parseFloat(document.getElementById('loanAmount').value);
        const termMinutes = parseInt(document.getElementById('loanTerm').value) || 0;
        const card = cardData['shop-plus'];

        if (isNaN(loanAmount) || loanAmount <= 0 || loanAmount > card.maxLoan) {
            document.querySelector('#cardDetails').innerHTML += `<li class="error">Invalid loan amount.</li>`;
            return;
        }

        if (isNaN(termMinutes) || termMinutes <= 0 || termMinutes * 60 > card.maxTerm) {
            document.querySelector('#cardDetails').innerHTML += `<li class="error">Invalid term.</li>`;
            return;
        }

        const termSeconds = termMinutes * 60;
        const totalCompounds = termSeconds / card.compoundInterval;
        const interestRate = card.interestRange[0] + Math.random() * (card.interestRange[1] - card.interestRange[0]);
        const totalInterest = interestRate / 100;
        const totalCost = loanAmount * (1 + totalInterest * totalCompounds);
        const deductionPerInterval = (loanAmount * totalInterest) / totalCompounds;

        account.loan = {
            amount: loanAmount,
            term: termMinutes + ' min',
            interestRate: interestRate,
            totalCost: totalCost,
            remainingDebt: totalCost,
            payments: totalCost / totalCompounds,
            compoundInterval: card.compoundInterval
        };

        saveAccounts();
        updateCardForLoan(account, deductionPerInterval);
    }

    function updateCardForLoan(account, deductionPerInterval) {
        if (account.loan) {
            document.querySelector('#cardDetails').innerHTML = `
                <div class="card-info">
                    <img src="${cardData['shop-plus'].imgSrc}" alt="card">
                    <span class="card-title">${cardData['shop-plus'].title}</span>
                    <ul>
                        <li>Loan Amount: $${formatNumberWithCommas(account.loan.amount.toFixed(2))}</li>
                        <li>Remaining Debt: <span class="stat-er bl">$${formatNumberWithCommas(account.loan.remainingDebt.toFixed(2))}</span></li>
                        <li>Interest Rate: ${account.loan.interestRate.toFixed(2)}%</li>
                        <li>Deduction per interval: <span id="deductionPerInterval">$${formatNumberWithCommas(deductionPerInterval.toFixed(2))}</span></li>
                    </ul>
                </div>
            `;
            document.querySelector('#card-actions').innerHTML = `
                <button id="payOffLoanButton">Pay Off ($${formatNumberWithCommas(account.loan.remainingDebt.toFixed(2))})</button>
            `;
            document.getElementById('payOffLoanButton').addEventListener('click', () => payOffLoan(account));
        }
    }

    window.payOffLoan = function(account) {
        if (account.loan) {
            if (account.balance >= account.loan.remainingDebt) {
                account.balance -= account.loan.remainingDebt;
                account.loan = null; // Clear the loan after paying off
                saveAccounts();
                handleAccountChange({ target: { value: account.id } });
            } else {
                document.querySelector('#cardDetails').innerHTML += `<li class="error">Insufficient funds to pay off loan.</li>`;
            }
        }
    }

    function saveAccounts() {
        localStorage.setItem('accounts', JSON.stringify(accounts));
    }

    function formatNumberWithCommas(number) {
        return number.toLocaleString();
    }

    // Initialize
    renderAccountSelect();
    if (accounts.length > 0) {
        const firstAccount = accounts[0];
        document.getElementById('accountSelect').value = firstAccount.id;
        document.getElementById('accountHoldings').textContent = `HOLDINGS FOR ${firstAccount.name}`;
        renderCardDetails(firstAccount);
    }
});
