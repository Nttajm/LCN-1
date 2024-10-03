import { allBets, userBets } from './bets.js';

export let balanceAdder = parseFloat(localStorage.getItem('balanceAdder')) || 0;

export function balanceAdderFun(adder, add) {
  if (add === 'add') {
    balanceAdder += adder;
  } else if (add === 'sub') {
    balanceAdder -= adder;
  }
  localStorage.setItem('balanceAdder', balanceAdder);
}


export function message(message, type) {
  type = type || '';
    const statusMessageElement = document.querySelector('.message');
    if (statusMessageElement) {
      statusMessageElement.style.display = 'block';
      statusMessageElement.innerHTML = `<span>${message}</span>`;
    }

    if (type === 'error') {
        statusMessageElement.classList.add('error');
    }

}


const divLinkers = document.querySelectorAll('div[data-linker]');
divLinkers.forEach(div => {
    div.addEventListener('click', function() {
        const link = this.getAttribute('data-linker');
        if (link) window.location.href = link;
    });
});

export const userData = JSON.parse(localStorage.getItem('userData')) || {};

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
    updateBalanceUI(balance);
}
checkBetsAndUpdateBalance();

export function checkBetsAndUpdateBalanceReturner() {
  let balance = 0;
  userBets.forEach(userBet => {
      const matchingBet = allBets.find(bet => bet.id === userBet.matchingBet);
      if (matchingBet) {
          balance += (matchingBet.result === userBet.option) ? matchingBet.price : 
                     (['over', 'under'].includes(matchingBet.result)) ? -matchingBet.price : 0;
      }
  });
//   return balance + balanceAdder;
  return balance + balanceAdder;

}

// Update the balance in the UI
export function updateBalanceUI(balance) {
    const balanceElem = document.querySelector('.balance.money');
    if (balanceElem) balanceElem.textContent = `$${balance}`;
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
                <span>${userData.keys || 0}</span>
                <img src="/bp/EE/assets/ouths/key.png" alt="" class="icon">
            </div>
            <div class="stat fl-ai">
                <span class="rank-1">${userData.rank || ''}</span>
                <img src="/bp/EE/assets/ouths/rank-1.png" alt="" class="icon">
            </div>
            <span class="balance money">$${checkBetsAndUpdateBalanceReturner()}</span>
        `;
    }
}

// Save user data to local storage
export function saveData() {
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('balanceAdder', balanceAdder);
    gameSave('user', userData);
}

export function gameSave(name, detail) {
    let gameData = JSON.parse(localStorage.getItem('gameData')) || []; 
    let time = new Date().getTime();
    gameData.push({name, detail, time});
}



console.log(userData);
displayUserInfo();
