let isMade = false;
let accounts = [];

const contentDiv = document.getElementById('content');

function displayInitialContent() {
    contentDiv.innerHTML += `
        <div class="message base-1" id='opener'>
          <span>Welcome to Live Bank. Start Investing, Managing, banking and much more today.</span>
          <input type="text" placeholder="Enter a name" id="nameInput">
          <button id="openAccountBtn">Open an account</button>          
        </div>
    `;

    document.getElementById('openAccountBtn').addEventListener('click', openAccount);
}

// Check the isMade flag to determine what to display
if (!isMade) {
    displayInitialContent();
}

function openAccount() {
    isMade = true;
    const nameInput = document.getElementById('nameInput').value;

    if (!nameInput) {
        notif('Please enter a name', 'n-error');
        return;
    }

    accounts.push({
        name: nameInput,
        balance: 501,
        intFee: 3,
        passiveIncome: 0,
        mulltiplyer: 1,
    });

    // Hide the opener div
    document.getElementById('opener').style.display = 'none';

    displayAccounts();
    notif('Account created successfully, with a extra $500 for ya ;)', 'normal');
}

function displayAccounts() {
    const accountSection = document.createElement('div');
    accountSection.id = 'acc-sec';
    contentDiv.appendChild(accountSection);

    accounts.forEach((account, index) => {
        accountSection.innerHTML += `
            <div class="account">
                <div class="top">
                    <span class="name">${account.name}'s</span>
                    <div>
                        <span class="acc-name">Account</span>
                        <span class="acc-number">...${index + 1}</span>
                    </div>
                </div>
                <div class="acc-details">
                    <div class="balance">
                        <span>Balance</span>
                        <span>$${formatNumberWithCommas(account.balance)}</span>
                    </div>
                    <div class="in-out">
                        <div class="in-out-i">
                            <span>Money in</span>
                            <span>+$456.07</span>
                        </div>
                        <div class="in-out-i">
                            <span>Money out</span>
                            <span>-$16.33</span>
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

function formatNumberWithCommas(number) {
    return number.toLocaleString();
}

function notif(text, type) {
    const notifDiv = document.querySelector('.notif');
    notifDiv.innerHTML = text;
    notifDiv.className = type + ' notif';
    notifDiv.style.display = 'block';
}

console.log(accounts);