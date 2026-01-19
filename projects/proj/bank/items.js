const accounts = JSON.parse(localStorage.getItem('accounts')) || [];
const cardData = JSON.parse(localStorage.getItem('cards')) || [
    {
        imgSrc: '/images/card-shop-2.png',
        title: 'SHOP+ BUSINESS',
        type: 'business',
        maxLoan: 6500,
        compoundInterval: 30, // seconds
        maxTerm: 8 * 60, // max 8 minutes
        interestRange: [8, 12], // interest range as percentage
        defaultTermOptions: [3, 5, 8] // min terms in minutes
    },
    {
        imgSrc: '/images/card-banking.png',
        title: 'INVEST+ BUSINESS',
        type: 'invest',
        maxLoan: 14500,
        compoundInterval: 10, // seconds
        maxTerm: 14 * 60, // max 8 minutes
        interestRange: [19, 28], // interest range as percentage
        defaultTermOptions: [3, 5, 8] // min terms in minutes
    }
    // Add more card types here
];

renderAccountSelect();

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
        renderCardDetails();
    }
}

function renderCardDetails() {
    const cardSec = document.getElementById('cardSection');
    cardSec.innerHTML = '';
    cardData.forEach((card, index) => {
        if (card.account) {
            cardSec.innerHTML += `
                <div class="card-info ${index} ${card.type}">
                    <img src="${card.imgSrc}" alt="card">
                    <span class="card-title">${card.title}</span>
                    <ul>
                        <li>Loan Amount: <input type="number" id="loanAmount-${index}" placeholder="Enter amount (max: $${card.maxLoan})"></li>
                        <li>Loan Term: 
                            <select id="loanTerm-${index}">
                                ${card.defaultTermOptions.map(option => `<option value="${option}">${option} min</option>`).join('')}
                            </select>
                        </li>
                        <li>Interest Rate: <span id="loanInterestRate-${index}">8-12%</span></li>
                    </ul>
                    <button id="buyLoanButton-${index}" data-buyLoan-btn-${card.account}>Buy Loan</button>
                </div>
            `;
        } else {
            cardSec.innerHTML += `
                <div class="card-info ${index} ${card.type}">
                    <img src="${card.imgSrc}" alt="card">
                    <span class="card-title">${card.title}</span>
                    <ul>
                        <li>Borrow up to <span class="stat bl">$${formatNumberWithCommas(card.maxLoan)}</span></li>
                        <li>Compounds every <span class="bl">${card.compoundInterval} sec</span></li>
                        <li>Interest Rate: <span id="card-interest">${card.interestRange[0]}-${card.interestRange[1]}%</span></li>
                        <li>Max Term: <span class="bl">${card.maxTerm / 60} min</span></li>
                    </ul>
                    <button id="applyLoanButton-${index}" data-card-title="${card.type}" class='apply-btn'>Apply Now</button>
                </div>
            `;
        }
    });
}

renderCardDetails();

function saveCards() {
    localStorage.setItem('cards', JSON.stringify(cardData));
}


const applyLoanButtons = document.querySelectorAll('.apply-btn');
applyLoanButtons.forEach(button => { 
    button.addEventListener('click', () => {
        const DivParentName = button.getAttribute('data-card-title');
        const DivParent = document.querySelector(`.${DivParentName}`);
        const card = cardData.find(card => card.type === DivParentName);
        card.account = accounts.find(account => account.id === parseInt(document.getElementById('accountSelect').value));

        console.log(card.account);
        DivParent.innerHTML = ` 
            <img src="${card.imgSrc}" alt="card">
            <span class="card-title">${card.title}</span>
            <ul>
                <li>Loan Amount: <input type="number" id="loanAmount-${DivParentName}" placeholder="Enter amount (max: $${card.maxLoan})"></li>
                <li>Loan Term: 
                    <select id="loanTerm-${DivParentName}">
                        ${card.defaultTermOptions.map(option => `<option value="${option}">${option} min</option>`).join('')}
                    </select>
                </li>
                <li>Interest Rate: <span id="loanInterestRate-${DivParentName}">8-12%</span></li>
            </ul>
            <button id="buyLoanButton-${DivParentName}" data-buyLoan-btn-${card.account} class="buyLoan-btn" >Buy Loan</button>
        `;
        saveCards();

    });
});

buyloanButtons = document.querySelectorAll('.buyLoan-btn');
buyloanButtons.forEach(button => {
    button.addEventListener('click', () => {
        const DivParentName = button.getAttribute('data-buyLoan-btn');
        const DivParent = document.querySelector(`.${DivParentName}`);
        const card = cardData.find(card => card.type === DivParentName);

        const loanAmount = parseFloat(document.getElementById(`loanAmount-${DivParentName}`).value);
        const termMinutes = parseInt(document.getElementById(`loanTerm-${DivParentName}`).value) || 0;

        if (isNaN(loanAmount) || loanAmount <= 0 || loanAmount > card.maxLoan) {
            alert('Invalid loan amount.');
            return;
        }

        if (isNaN(termMinutes) || termMinutes <= 0 || termMinutes * 60 > card.maxTerm) {
            alert('Invalid term.');
            return;
        }

        const termSeconds = termMinutes * 60;
        const totalCompounds = termSeconds / card.compoundInterval;
        const interestRate = card.interestRange[0] + Math.random() * (card.interestRange[1] - card.interestRange[0]);
        const totalInterest = interestRate / 100;
        const totalCost = loanAmount * (1 + totalInterest * totalCompounds);
        const deductionPerInterval = (loanAmount * totalInterest) / totalCompounds;

        DivParent.innerHTML = ` 
                    <img src="${cardData['shop-plus'].imgSrc}" alt="card">
                    <span class="card-title">${cardData['shop-plus'].title}</span>
                    <ul>
                        <li>Loan Amount: $${formatNumberWithCommas(account.loan.amount.toFixed(2))}</li>
                        <li>Remaining Debt: <span class="stat-er bl">$${formatNumberWithCommas(account.loan.remainingDebt.toFixed(2))}</span></li>
                        <li>Interest Rate: ${account.loan.interestRate.toFixed(2)}%</li>
                        <li>Deduction per interval: <span id="deductionPerInterval">$${formatNumberWithCommas(deductionPerInterval.toFixed(2))}</span></li>
                    </ul>
                    <button id="payOffLoanButton">Pay Off ($${formatNumberWithCommas(account.loan.remainingDebt.toFixed(2))})</button>`

        console.log(card.account.balance)
        card.account.balance += loanAmount;
        saveAccounts();
        updateCardForLoan(card.account, deductionPerInterval);
    });
});

function formatNumberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

//     function applyLoan(account, cardKey) {
//         const card = cardData[cardKey];
//         const loanAmount = parseFloat(prompt('Enter loan amount:'));
//         const termMinutes = parseInt(prompt('Enter loan term in minutes:')) || 0;

//         if (isNaN(loanAmount) || loanAmount <= 0 || loanAmount > card.maxLoan) {
//             alert('Invalid loan amount.');
//             return;
//         }

//         if (isNaN(termMinutes) || termMinutes <= 0 || termMinutes * 60 > card.maxTerm) {
//             alert('Invalid term.');
//             return;
//         }

//         const termSeconds = termMinutes * 60;
//         const totalCompounds = termSeconds / card.compoundInterval;
//         const interestRate = card.interestRange[0] + Math.random() * (card.interestRange[1] - card.interestRange[0]);
//         const totalInterest = interestRate / 100;
//         const totalCost = loanAmount * (1 + totalInterest * totalCompounds);
//         const deductionPerInterval = (loanAmount * totalInterest) / totalCompounds;

//         account.loan = {
//             amount: loanAmount,
//             term: `${termMinutes} min`,
//             interestRate: interestRate.toFixed(2),
//             totalCost: totalCost.toFixed(2),
//             remainingDebt: totalCost.toFixed(2),
//             payments: (totalCost / totalCompounds).toFixed(2),
//             compoundInterval: card.compoundInterval,
//             cardTitle: card.title
//         };

//         account.balance += loanAmount;
//         saveAccounts();
//         updateCardForLoan(account, deductionPerInterval);
//     }

//     function updateCardForLoan(account, deductionPerInterval) {
//         const cardDetailsContainer = document.getElementById('cardDetails');
//         if (account.loan) {
//             const card = cardData[Object.keys(cardData).find(key => cardData[key].title === account.loan.cardTitle)];
//             cardDetailsContainer.innerHTML = `
//             <div class="card-info">
//                 <img src="${card.imgSrc}" alt="card">
//                 <span class="card-title">${card.title}</span>
//                 <ul>
//                     <li>Loan Amount: $${formatNumberWithCommas(account.loan.amount)}</li>
//                     <li>Remaining Debt: <span class="stat-er bl">$${formatNumberWithCommas(account.loan.remainingDebt)}</span></li>
//                     <li>Interest Rate: ${account.loan.interestRate}%</li>
//                     <li>Deduction per interval: <span id="deductionPerInterval">$${formatNumberWithCommas(deductionPerInterval)}</span></li>
//                 </ul>
//             </div>
//             <button id="payOffLoanButton">Pay Off ($${formatNumberWithCommas(account.loan.remainingDebt)})</button>
//         `;
//         document.getElementById('payOffLoanButton').addEventListener('click', () => payOffLoan(account));
//     }
// }

// window.payOffLoan = function(account) {
//     if (account.loan) {
//         if (account.balance >= account.loan.remainingDebt) {
//             account.balance -= parseFloat(account.loan.remainingDebt);
//             account.loan = null; // Clear the loan after paying off
//             saveAccounts();
//             handleAccountChange({ target: { value: account.id } });
//         } else {
//             alert('Insufficient funds to pay off loan.');
//         }
//     }
// }

// function saveAccounts() {
//     localStorage.setItem('accounts', JSON.stringify(accounts));
// }



// // Initialize
// renderAccountSelect();
// if (accounts.length > 0) {
//     const firstAccount = accounts[0];
//     document.getElementById('accountSelect').value = firstAccount.id;
//     document.getElementById('accountHoldings').textContent = `HOLDINGS FOR ${firstAccount.name}`;
//     renderCardDetails(firstAccount);
// }
