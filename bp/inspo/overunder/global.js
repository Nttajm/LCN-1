import { allBets, userBets } from './bets.js';
import { updateFb } from './firebaseconfig.js';

export let balanceAdder = parseFloat(localStorage.getItem('balanceAdder')) || 0;

export function uiAndBalance(newCash) {
    let currentMoney = checkBetsAndUpdateBalance();
    currentMoney += newCash;

    updateBalanceAdder(currentMoney);
    updateBalanceUI(currentMoney);
}

export function getKeys() {
    let keys = 3;
    let keysAdder = userData.keysAdder || 0; 
    userBets.forEach(userBet => {
        const matchingBet = allBets.find(bet => bet.id === userBet.matchingBet);
        if (matchingBet) {
            keys += (matchingBet.result === userBet.option) ? 1 : 0;
        }
    });
    return keys + keysAdder;
}

export function aWin() {
    userBets.push({
        matchingBet: '3v',
        option: 'over',
    })
}

export function matchingBetData(bet, from) {
    return from.find(b => b.id === bet);
}

export function message(message, type) {
    type = type || '';
    const statusMessageElement = document.querySelector('.message-cont');
    if (statusMessageElement) {
        statusMessageElement.style.display = 'block';
        statusMessageElement.innerHTML = `
        <div class="message ${type}">
            <span>${message}</span>
        </div>
        `;
        if (type === 'error') {
            statusMessageElement.classList.add('error');
        }
        setTimeout(() => {
            statusMessageElement.style.display = 'none';
            statusMessageElement.classList.remove('error');
        }, 6000); // Hide message after 3 seconds
    }
}


export function gameSave(name, detail) {
    let gameData = JSON.parse(localStorage.getItem('gameInt')) || {}; 
    let time = new Date().toLocaleString(); // Format the time as a readable string
    gameData.push({name, detail, time});
    // localStorage.setItem('gameData', JSON.stringify(gameData));
}



const divLinkers = document.querySelectorAll('div[data-linker]');
divLinkers.forEach(div => {
    div.addEventListener('click', function() {
        const link = this.getAttribute('data-linker');
        if (link) window.location.href = link;
    });
});

export const userData = JSON.parse(localStorage.getItem('userData')) || {};
export const gameData = JSON.parse(localStorage.getItem('gameData')) || {};


// Function to format date and time
export function formatDateTime(dateTimeStr) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const [datePart, timePart] = dateTimeStr.split(" ");
    const [month, day] = datePart.split("-");
    let [hours, minutes] = timePart.split(":");

    // Convert to 12-hour format
    let period = "am";
    hours = parseInt(hours, 10);
    if (hours >= 12) {
        period = "pm";
        if (hours > 12) hours -= 12;
    } else if (hours === 0) {
        hours = 12;
    }

    // Determine day suffix
    const dayInt = parseInt(day, 10);
    const daySuffix = (dayInt === 1 || dayInt === 21 || dayInt === 31) ? 'st' :
                      (dayInt === 2 || dayInt === 22) ? 'nd' :
                      (dayInt === 3 || dayInt === 23) ? 'rd' : 'th';

    return `${months[month - 1]} ${dayInt}${daySuffix} ${hours}:${minutes}${period}`;
}

// Toggle elements with revel attribute
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-revel]')) {
        const target = document.getElementById(e.target.getAttribute('data-revel'));
        if (target) target.classList.toggle('dn');
    }
});

// Clear all data and reload the page
const clearAllBtn = document.getElementById('clearAllBtn');
if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.reload();
    });
}

export function updateBalanceAdder(newBalanceAdder) {
    balanceAdder = newBalanceAdder;
    localStorage.setItem('balanceAdder', balanceAdder);
}



// Check bets and update balance
export function checkBetsAndUpdateBalance() {
    let balance = 0;
    userBets.forEach(userBet => {
        const matchingBet = allBets.find(bet => bet.id === userBet.matchingBet);
        if (matchingBet) {
            balance += (matchingBet.result === userBet.option) ? matchingBet.price : 
                       (['over', 'under'].includes(matchingBet.result)) ? -matchingBet.price : 0;
        }
    });
    // updateBalanceUI(balance + balanceAdder);
    updateBalanceUI(balance + balanceAdder);
    return balance + balanceAdder;
}

// Update the balance in the UI
export function updateBalanceUI(balance) {
    const balanceElem = document.querySelector('.balance.money');
    if (balanceElem) balanceElem.textContent = `$${balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    saveData();
}

// Display user info
export function displayUserInfo() {
    const userInfoElem = document.getElementById('userInfo');
    const usernameElem = document.getElementById('username');

    if (!userData.username) {
        if (userInfoElem) {
            userInfoElem.innerHTML = `
                <div class="log g-10 userForm">
                    <span>Enter your name so your data can be saved!</span>
                    <div class="userForm-i g-10">
                        <input type="text" placeholder="username" id="user">
                        <button class="multi-title" id="enterUser">Enter</button>
                    </div>
                </div>
            `;
            document.getElementById('enterUser').addEventListener('click', () => {
                const username = document.getElementById('user').value;
                if (username) {
                    userData.username = username;
                    saveData();
                    displayUserInfo();
                    updateFb();
                }
            });
        }
        if (usernameElem) usernameElem.textContent = '???';
    } else {
        if (userInfoElem) userInfoElem.classList.add('dn');
        if (usernameElem) usernameElem.textContent = userData.username;
    }

    updateStatsUI();
}

// Update user stats UI
function updateStatsUI() {
    const statsDiv = document.getElementById('js-stats');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <div class="stat fl-ai">
                <span>${getKeys() || 0}</span>
                <img src="/bp/EE/assets/ouths/key.png" alt="" class="icon">
            </div>
            <div class="stat fl-ai">
                <span class="rank-1">${userData.rank || ''}</span>
                <img src="/bp/EE/assets/ouths/rank-1.png" alt="" class="icon">
            </div>
            <span class="balance money">$${checkBetsAndUpdateBalance()}</span>
        `;
    }
}

export function saveData() {
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('balanceAdder', balanceAdder);
    localStorage.setItem('userBets', JSON.stringify(userBets));
    localStorage.setItem('gameData', JSON.stringify(gameData));
    let time = new Date().toLocaleString();
    updateFb();
    // gameSave('user', {time, checkBetsAndUpdateBalance});
}

// export function gameSave(name, detail) {
//     let gameData = JSON.parse(localStorage.getItem('gameInt')) || {}; 
//     let time = new Date().toLocaleString(); // Format the time as a readable string
//     gameData.push({name, detail, time});
//     // localStorage.setItem('gameData', JSON.stringify(gameData));
// }



console.log(userData);

// alll something else from here.......


export function initializeGame(gameName) {
    let gameData = JSON.parse(localStorage.getItem('gameData')) || {};
    if (!gameData) {
        gameData = [];
        saveData();
    }
}


export function heartReturner(option) {
    if (option < 1 || option > 5) {
        throw new Error("Option must be between 1 and 5");
    }

    let hearts = '';
    for (let i = 0; i < 5; i++) {
        hearts += i < option ? '❤️' : '💔';
    }
    return hearts;
}

if (userData.ban) {
    window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
  }
  
  const betatesters = ['joelm', 'lizzy', 'WildS', 'Tking'];
  
  if (!(userData.username && betatesters.includes(userData.username))) {
      window.location.href = 'https://lcnjoel.com/ouths/info.html';
  }