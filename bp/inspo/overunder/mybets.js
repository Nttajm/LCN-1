import { soccerBets } from "./bets.js";
import { basketballBets } from "./bets.js";
import { volleyballBets } from "./bets.js";
import { formatDateTime } from "./global.js";

const allBets = [...soccerBets, ...basketballBets, ...volleyballBets];
const userBets = JSON.parse(localStorage.getItem('userBets')) || [];

let balance = 0;

function getWinLosses() {
    balance = 0;

    const balanceOutput = document.querySelector('.balance');
    const winsOutput = document.querySelector('.wins');
    const lossesOutput = document.querySelector('.losses');
    const winAmountOutput = document.querySelector('.win-amount');
    const lossAmountOutput = document.querySelector('.loss-amount');

    let wins = 0;
    let losses = 0;

    let winAmount = 0;
    let lossAmount = 0;
  
    userBets.forEach(userBet => {
      const matchingBet = allBets.find(bet => bet.id === userBet.matchingBet);
      if (matchingBet) {
        if (matchingBet.result === userBet.option) {
            wins++;
            winAmount += matchingBet.price;
        } else if (matchingBet.result !== userBet.option && (matchingBet.result === 'over' || matchingBet.result === 'under')) {
            losses++;
            lossAmount += matchingBet.price;
        }
      }

    });
  
    winsOutput.innerHTML = `${wins}`;
    lossesOutput.innerHTML = `<span>${losses}`;
    winAmountOutput.innerHTML = `$${winAmount}`;
    lossAmountOutput.innerHTML = `-$${lossAmount}`;

  }
  
getWinLosses();

const selectedBetElem = document.querySelector('.sport-option.selected');

const options = document.querySelectorAll('.sport-option');

function clearSelection() {
    options.forEach(div => div.classList.remove('selected'));
}

options.forEach(div => {
    div.addEventListener('click', function() {
        clearSelection(); // Clear previous selection
        this.classList.add('selected'); // Add 'selected' class to clicked div
        loadMybets(); // Re-filter bets based on the selected option
    });
});

let selectedSport = selectedBetElem ? selectedBetElem.textContent.toLowerCase() : '';

  function loadMybets() {
    const myBetsElem = document.querySelector('.sec-payouts');
    myBetsElem.innerHTML = '';
    userBets.forEach(userBet => {
      const matchingBet = allBets.find(bet => bet.id === userBet.matchingBet);
      if (matchingBet) {

        let imgType = 'https://via.placeholder.com/50';

        if (matchingBet.sport === 'soccer') { 
        imgType = '/bp/EE/assets/ouths/soccerball.png';
        } else if (matchingBet.sport === 'basketball') {
        imgType = '/bp/EE/assets/ouths/basketball.webp';
        }  else if (matchingBet.sport === 'volleyball') {
        imgType = '/bp/EE/assets/ouths/volleyball.png';
        }

        let yourBet = '<span class="yourBet">You lose</span>';

        if (matchingBet.result === 'over' && userBet.option === 'over') {
             yourBet = `<span class="yourBet win">You won over @ +$${matchingBet.price}</span>`;
        } else if (matchingBet.result === 'under' && userBet.option === 'under') {
                yourBet = `<span class="yourBet win">You won under @ +$${matchingBet.price}</span>`;
        } else if (matchingBet.result === 'over' && userBet.option === 'under') {
                yourBet = `<span class="yourBet lose">You lost under @ -$${matchingBet.price}</span>`;
        } else if (matchingBet.result === 'under' && userBet.option === 'over') {
                yourBet = `<span class="yourBet lose">You lost over @ -$${matchingBet.price}</span>`;
        }

        myBetsElem.insertAdjacentHTML('beforeend', `
            <div class="card" id="Mybets">
            <img src="${imgType}" alt="" class="game-img-mybets">
            <div class="seprater" ></div>
            <div class="bet-info">
                <span>${matchingBet.techTeam} vs ${matchingBet.against}</span>
                ${yourBet}
                <span>${formatDateTime(matchingBet.date)}</span>
            </div>
            <div class="bet-status" id="over">
                <span >${matchingBet.amount}</span>
                <span id="typebet">${matchingBet.typeBet}</span>
                <div class="arrow dn ${userBet.option}-l"></div>
            </div>
        </div>
                `
            );
      } else if (!userBets.length) {
        myBetsElem.innerHTML = '<span>No bets</span>';
      }
    });
  }

  loadMybets();

  const balanceElem = document.querySelector('.balance');

  const balanceOutput = document.querySelector('.balance');

  function checkBetsAndUpdateBalance() {
    balance = 0; // No 'let' here, update the global variable
    userBets.forEach(userBet => {
      const matchingBet = allBets.find(bet => bet.id === userBet.matchingBet);
      if (matchingBet) {
        // Check if the user's option matches the bet result
        if (matchingBet.result === userBet.option) {
          balance += matchingBet.price;
        } else if (matchingBet.result !== userBet.option && (matchingBet.result === 'over' || matchingBet.result === 'under')) {
          balance -= matchingBet.price;
        }
        // No need to check for an empty result because it doesn't change the balance
      }
    });
    // Update the UI with the new balance
    balanceOutput.innerHTML = `<span>$${balance}</span>`;
  }
  checkBetsAndUpdateBalance();

  if (balance < 0) {
    balanceElem.classList.add('negative');
  } else {
    balanceElem.classList.remove('negative');
  }