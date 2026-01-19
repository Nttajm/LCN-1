let isMade = JSON.parse(localStorage.getItem('isMade')) || false;
let accounts = localStorage.getItem('accounts') ? JSON.parse(localStorage.getItem('accounts')) : [];
let hiddenStates = localStorage.getItem('hiddenStates') ? JSON.parse(localStorage.getItem('hiddenStates')) : {};

const contentDiv = document.getElementById('content');

let creditScore = 0; 


function saveHiddenStates() {
    localStorage.setItem('hiddenStates', JSON.stringify(hiddenStates));
}

function saveAccounts() {
    localStorage.setItem('accounts', JSON.stringify(accounts));
}

function displayInitialContent() {
    saveAccounts();
    contentDiv.innerHTML += `
        <div class="message base-1" id='opener'>
          <span>Welcome to Live Bank. Start Investing, Managing, banking and much more today.</span>
          <input type="text" placeholder="Enter a name" id="nameInput">
          <button id="openAccountBtn">Open an account</button>          
        </div>
    `;

    document.getElementById('openAccountBtn').addEventListener('click', () => openAccount(false));
}

function displayNewAccountForm() {
    contentDiv.innerHTML += `
        <div id="addNewAccount-sec">
            <input type="text" placeholder="Enter a name" id="nameInput-2">
            <button id="addNewAccount">Add new account</button>
        </div>
    `;
    
    document.getElementById('addNewAccount').addEventListener('click', () => openAccount(true));
}

// Check the isMade flag to determine what to display
document.addEventListener('DOMContentLoaded', () => {
    if (!isMade && accounts.length === 0) {
        displayInitialContent();
    } else {
        displayNewAccountForm();
    }
    displayAccounts();
});

function openAccount(isNewAccount = false) {
    isMade = true;
    localStorage.setItem('isMade', true);
    const nameInputId = isNewAccount ? 'nameInput-2' : 'nameInput';
    const nameInput = document.getElementById(nameInputId).value;

    if (!nameInput) {
        notif('Please enter a name', 'n-error');
        return;
    }

    accounts.push({
        name: nameInput,
        id: accounts.length + 1,
        balance: 13297,
        portfolio: 0,
        intFee: 3,
        fees: 1,
        passiveIncome: 0,
        multiplier: 1,
        transactionHistory: [],
        cards: [
            {
                cardType: 'DEPT1',
                card: 'debit',
                // balance: 0,
            },
        ]
    });

    if (!isNewAccount) {
        document.getElementById('opener').style.display = 'none';
        displayNewAccountForm();
    }

    saveAccounts();
    displayAccounts();
    
    notif('Account created successfully, with an extra $500 for ya ;)', 'normal');
}

function displayAccounts() {
    const otherSections = document.getElementById('other-sections') || document.createElement('div');
    otherSections.id = 'other-sections';
    otherSections.innerHTML = '';

    console.log(otherSections);

    const accountSection = document.getElementById('acc-sec') || document.createElement('div');
    accountSection.id = 'acc-sec';
    accountSection.innerHTML = '';
    contentDiv.appendChild(accountSection);
    contentDiv.appendChild(otherSections);

    accounts.forEach((account, index) => {
        const isHidden = hiddenStates[account.id] || false;
        let cardHtml = '';
        account.cards.forEach(card => {
            if (card.cardType === 'DEPT1') {
                cardHtml += `<img src="/images/card-debit.png" alt="card.png">`;
            } else if (card.cardType === 'CRED1') {
                cardHtml += `<img src="/images/card-shop-2.png" alt="card.png">`;
            }
        });

        accountSection.innerHTML += `
            <div class="account">
                <div class="top fl-jsp-b fl-ai">
                    <div>
                        <span class="name">${account.name}</span>
                        <div class="des">
                            <span class="acc-name">Checking Account</span>
                            <span class="acc-number">...${index + 1}</span>
                        </div>
                    </div>
                    <div class="hide">
                        <button class="uh btn-no-value" id="hide-btn-of-${index + 1}" onclick='hideOf(${account.id})'>${isHidden ? 'Show' : 'Hide'}</button>
                    </div>
                </div>
                <div class="acc-details ${isHidden ? 'dn' : ''}" id="acc-detail-of-${account.id}">
                    <div class="balance">
                        <span>Balance</span>
                        <span>$${fwc(account.balance)}</span>
                    </div>
                    <div class="cards fl-c fl-ai">
                        ${cardHtml}
                        <span class="uh sub-5"><a href='cards.html'>View cards</a></span>
                    </div>
                    <div class="in-out">
                        <div class="in-out-i">
                            <span>Passive Income</span>
                            <span>+$${fwc(account.passiveIncome)}</span>
                        </div>
                        <div class="in-out-i">
                            <span>Fees</span>
                            <span>-$${fwc(account.intFee)}</span>
                        </div>
                    </div>
                </div>
                <div class="transaction-div">
                    <span class="uh">See all transactions ></span>
                </div>
            </div>
        `;
    });
}

function hideOf(accountId) {
    const detailDiv = document.getElementById(`acc-detail-of-${accountId}`);
    const hideButton = document.querySelector(`button[onclick='hideOf(${accountId})']`);
    if (detailDiv) {
        detailDiv.classList.toggle('dn');
        const isHidden = detailDiv.classList.contains('dn');
        hiddenStates[accountId] = isHidden;
        hideButton.textContent = isHidden ? 'Show' : 'Hide';
        saveHiddenStates();
    }
}

function transferMoney() {
    const fromAccount = document.getElementById('fromAccount').value;
    const toAccount = document.getElementById('toAccount').value;
    const amount = parseFloat(document.getElementById('amount').value); // Convert to number

    if (!fromAccount || !toAccount || isNaN(amount) || amount <= 0) {
        notif('Please fill all fields with valid values', 'n-error');
        return;
    }

    const fromAcc = accounts.find(acc => acc.id === parseInt(fromAccount));
    const toAcc = accounts.find(acc => acc.id === parseInt(toAccount));

    if (!fromAcc || !toAcc) {
        notif('Account not found', 'n-error');
        return;
    }

    if (fromAcc.balance < amount) {
        notif('Insufficient funds', 'n-error');
        return;
    }

    fromAcc.balance -= amount;
    toAcc.balance += amount;

    saveAccounts(); // Ensure this function saves accounts to localStorage
    notif('Transfer successful', 'normal');

    // Optionally update the display if needed
    updateAccountDisplay();
}



function fwc(number) {
    return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function notif(text, type) {
    const notifDiv = document.querySelector('.notif');
    if (notifDiv) {
        notifDiv.innerHTML = text;
        notifDiv.className = type + ' notif';
        notifDiv.style.display = 'block';
    } else {
        console.warn('Notification div not found');
    }
}

console.log(accounts);
