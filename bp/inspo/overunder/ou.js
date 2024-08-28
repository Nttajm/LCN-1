import { soccerBets } from './bets.js';
import { basketballBets } from './bets.js';
import { volleyballBets } from './bets.js';

let balance = 0;
const balanceOutput = document.querySelector('.balance');
let container = document.querySelector('.sec'); 
const multi = 1;

const options = document.querySelectorAll('.sport-option');

// Function to remove 'selected' class from all divs
function clearSelection() {
    options.forEach(div => div.classList.remove('selected'));
}

// Add event listeners to each div
options.forEach(div => {
    div.addEventListener('click', function() {
        clearSelection(); // Clear previous selection
        this.classList.add('selected'); // Add 'selected' class to clicked div
        filterBets(); // Re-filter bets based on the selected option
        renderBets(); // Re-render bets after filtering
    });
});

// const choosebetElement = document.querySelector('.choosebet');
// let choosebet = 

// localStorage.removeItem('userBets');

balanceOutput.innerHTML = '';
balanceOutput.insertAdjacentHTML('beforeend', `<span>$${balance}</span>`);
const userBets = JSON.parse(localStorage.getItem('userBets')) || [];

let allBets = [...soccerBets, ...basketballBets, ...volleyballBets];
let bets = filterBets();
let reward = [];

function filterBets() {
  const selectedBetElem = document.querySelector('.sport-option.selected'); // Get the currently selected sport
  const selectedSport = selectedBetElem ? selectedBetElem.textContent.toLowerCase() : '';
  return allBets.filter(bet => bet.sport === selectedSport);
}


document.addEventListener('DOMContentLoaded', () => {
  updateButtons();
  renderBets();
});

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

function renderBets() {
  bets = filterBets(); // Re-filter bets based on the currently selected option

  checkBetsAndUpdateBalance();
  container.innerHTML = '';

  bets.forEach(bet => {
    let buttonsHtml = `<button class="over">over</button>
    <button class="under">under</button>`;
    let betClass = '';
    let imgType = 'https://via.placeholder.com/50';
    let additionalText = '';

    if (bet.sport === 'soccer') { 
      imgType = '/bp/EE/assets/ouths/soccerball.png';
    } else if (bet.sport === 'basketball') {
      imgType = '/bp/EE/assets/ouths/basketball.webp';
    } 

    const userBet = userBets.find(uBet => uBet.matchingBet === bet.id);

    if (bet.status === 'ended') {
      betClass = 'ended';
    } else if (bet.status === 'ongoing') { 
      betClass = 'ongoing';
      additionalText = 'Ongoing'; 
    }

    if (bet.option) {
      if (bet.option === 'over') {
        buttonsHtml = `<button class="over">over</button>
        <button class="under collapse">under</button>`;
      } else if (bet.option === 'under') {
        buttonsHtml = `<button class="over collapse">over</button>
        <button class="under">under</button>`;
      }
    }

    if (bet.result) {
      if (bet.result === 'over') {
        buttonsHtml = `<button class="over" disabled> Was over</button>`;
      } else if (bet.result === 'under') {
        buttonsHtml = `<button class="under" disabled>Was under</button>`;
      }
    }

    container.insertAdjacentHTML('beforeend', `
      <div class="bet ${betClass}">
            <span class="multi it">${multi}x</span>
            <span class="multi it r">$${bet.price}</span>
            <div class="game">
                <img src="${imgType}" class="game-img" alt="">
                <div class="name">
                    <span class="bold">${bet.techTeam}</span>
                    <span>vs ${bet.against}</span>
                </div>
            </div>
          <div class="for">
            <span>${bet.amount}</span>
             <span>${bet.typeBet}</span>
          </div>
        <div class="button-sec" id="btn-${bet.id}">
          ${buttonsHtml}
        </div>
        <span class="">${formatDateTime(bet.date)}</span>
        <span class="bold">${additionalText}</span>
      </div>
    `);

    // Select the buttons within the current context
    const overBtn = container.querySelector(`#btn-${bet.id} .over`);
    const underBtn = container.querySelector(`#btn-${bet.id} .under`);

    // Add event listeners to the buttons
    if (overBtn && !overBtn.disabled) {
      overBtn.addEventListener('click', () => {
        console.log('Over button clicked');
        updateUserBet(bet.id, 'over');
      });
    }
    
    if (underBtn && !underBtn.disabled) {
      underBtn.addEventListener('click', () => {
        console.log('Under button clicked');
        updateUserBet(bet.id, 'under');
      });
    }
  });

  // Ensure updateButtons is called after rendering
  setTimeout(updateButtons, 0);
}

function updateButtons() {
  userBets.forEach(userBet => { 
    const overBtn = document.querySelector(`#btn-${userBet.matchingBet} .over`);
    const underBtn = document.querySelector(`#btn-${userBet.matchingBet} .under`);

    if (overBtn && underBtn) {
      if (userBet.option === 'over') {
        underBtn.classList.add('collapse');
      } else if (userBet.option === 'under') {
        overBtn.classList.add('collapse');
      }
    }
  });
}

function updateUserBet(betId, option) {
  // Find the existing user bet
  const existingBet = userBets.find(uBet => uBet.matchingBet === betId);

  if (existingBet) {
    // Update the existing bet
    existingBet.option = option;
  } else {
    // Add a new bet to userBets
    userBets.push({ matchingBet: betId, option: option });
  }

  // Save userBets to localStorage
  localStorage.setItem('userBets', JSON.stringify(userBets));

  // Update the corresponding bet in the bets array
  const matchingBet = bets.find(bet => bet.id === betId);
  if (matchingBet) {
    matchingBet.option = option;
  }

  // Re-render the bets
  renderBets();
}

function formatDateTime(dateTimeStr) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Split the input date string into date and time
  let [datePart, timePart] = dateTimeStr.split(" ");
  
  // Split the date and time into components
  let [month, day] = datePart.split("-");
  let [hours, minutes] = timePart.split(":");
  
  // Convert to 12-hour format
  let period = "am";
  hours = parseInt(hours, 10);
  if (hours >= 12) {
      period = "pm";
      if (hours > 12) {
          hours -= 12;
      }
  } else if (hours === 0) {
      hours = 12;
  }
  
  // Handle the "th", "st", "nd", "rd" suffix for the day
  let daySuffix;
  if (day === "1" || day === "21" || day === "31") {
      daySuffix = "st";
  } else if (day === "2" || day === "22") {
      daySuffix = "nd";
  } else if (day === "3" || day === "23") {
      daySuffix = "rd";
  } else {
      daySuffix = "th";
  }
  
  // Format the final string
  let formattedDateTime = `${months[month - 1]} ${parseInt(day, 10)}${daySuffix} ${hours}:${minutes}${period}`;
  
  return formattedDateTime;
}

// Initial rendering of bets
renderBets();
console.log(userBets);
console.log(bets);
