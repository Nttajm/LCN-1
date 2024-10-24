import { soccerBets } from './bets.js';
import { basketballBets } from './bets.js';
import { volleyballBets } from './bets.js';
import { schoolBets } from "./bets.js";
import { checkBetsAndUpdateBalance, displayUserInfo } from './global.js';

let userData = JSON.parse(localStorage.getItem('userData')) || {};

let balance = 0;
const balanceOutput = document.querySelector('.balance');
let container = document.querySelector('.sec'); 
const multi = 1;


const balanceElem = document.querySelector('.balance');



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
export const userBets = JSON.parse(localStorage.getItem('userBets')) || [];

export let allBets = [...soccerBets, ...basketballBets, ...volleyballBets, ...schoolBets];
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


if (balance < 0) {
  balanceElem.classList.add('negative');
} else {
  balanceElem.classList.remove('negative');
}

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
    }  else if (bet.sport === 'volleyball') {
      imgType = '/bp/EE/assets/ouths/volleyball.png';
    }

    const userBet = userBets.find(uBet => uBet.matchingBet === bet.id);

    if (bet.status === 'ended' || bet.result) {
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

    const statsImg = `<div class="team-stats" data-teamStat='${bet.teamStat ? bet.teamStat : '' }'><img src="/bp/EE/assets/ouths/stats.png" alt="" class="icon op-5"></div>`;
    


    if (bet.sport != 'school') {
      container.insertAdjacentHTML('beforeend', `
      <div class="bet ${betClass} card ">
           <span class="multi it dn ${bet.info ? 'bet-info-i' : ''} ">${bet.info ? bet.info : '' }</span>
            <span class="multi it r">$${bet.price}</span>
                    ${!bet.result ? statsImg : ''}
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
        <span class="">${ bet.date ? formatDateTime(bet.date) : '' }</span>
        <span class="bold">${additionalText}</span>
      </div>
    `);
    } else if (bet.sport === 'school') {
      container.insertAdjacentHTML('beforeend', `
      <div class="bet ${betClass} card">
      <span class="multi it ${bet.info ? 'bet-info-i' : ''} ">${bet.info ? bet.info : '' }</span>
            <span class="multi it r">$${bet.price}</span>
            <div class="game">
                <div class="name">
                    <span>${bet.against}</span>
                </div>
            </div>
          <div class="for">
            <span>${bet.amount}</span>
             <span>${bet.typeBet}</span>
          </div>
        <div class="button-sec" id="btn-${bet.id}">
          ${buttonsHtml}
        </div>
        <span class="bold">${additionalText}</span>
      </div>
    `);
    }

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


function generateRandomString() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const length = 8;

  for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
  }

  return result;
}


let playerId = localStorage.getItem('playerId') || '';
const randomString = generateRandomString();
const playerIdElem = document.querySelector('.player-id');

if (!playerId) {
  playerId = randomString;
  localStorage.setItem('playerId', playerId);
}

playerIdElem.innerHTML = playerId;


// function checkDailyReward() {
//   const now = new Date().getTime(); // Get the current time in milliseconds
//   const claimInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
//   // If userData.lastClaim doesn't exist or it's been more than 24 hours since the last claim
//   if (!userData.lastClaim || (now - userData.lastClaim >= claimInterval)) {
//       document.getElementById('.dailyReward').style.display = 'block'; // Show the reward
//   }
// }

// function claimReward() {
//   const now = new Date().getTime(); // Current time
  
//   // Update userData with the last claim time
//   userData.lastClaim = now;
  
//   // Save to localStorage
//   localStorage.setItem('userData', JSON.stringify(userData));
  
//   // Hide the reward div after claiming
//   document.getElementById('dailyReward').style.display = 'none';

//   userBets.push({
//     matchingBet: '1mm',
//     option: 'over'
//   });
//   }

// // Event listener for the "Claim" button
// document.getElementById('claimBtn').addEventListener('click', claimReward);

// // Check for the daily reward on page load
// checkDailyReward();



function pushUserbet() {
  const matchingBetInput = document.getElementById('matchingBet-input');
  const optionInput = document.getElementById('option-input');

  const matchingBet = matchingBetInput.value;
  const option = optionInput.value;

  if (!matchingBet || !option) {
      alert('Please fill out both fields');
      return;
  } else {
      userBets.push({
          matchingBet,
          option
      });

      localStorage.setItem('userBets', JSON.stringify(userBets));
      renderBets();
  }

  matchingBetInput.value = '';
  optionInput.value = '';
  
  console.log(userBets);

  checkBetsAndUpdateBalance();
}

const pushUserbetBtn = document.getElementById('pushUserbetBtn');
pushUserbetBtn.addEventListener('click', pushUserbet);


export function saveData() {
  localStorage.setItem('userData', JSON.stringify(userData));
}

displayUserInfo();


function postLeader() {
  const username = userData.username; // Replace this with your actual username
const gameCode = balance; // Replace this with your actual game code

// Data to send
const formData = {
    username: username,
    gameCode: gameCode,
};

// Sending the POST request
fetch('https://formspree.io/f/mnnarzjk', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
})
.then(response => {
    if (response.ok) {
        console.log('Form submitted successfully!');
        // Handle success
    } else {
        console.error('Error submitting the form.');
        // Handle failure
    }
})
.catch(error => {
    console.error('There was a problem with the fetch operation:', error);
});
window.location.href = 'https://bp/inspo/overunder/leaders.html';

}

// function userBetsToString() {
//   return userBets.map(userBet => `**${userBet.matchingBet} - ${userBet.option}`).join('');
// }

// console.log(userBetsToString());

// const stringBets = userBetsToString();

// function stringToUserBets(text) {
//   return text.split('**').filter(Boolean).map(line => {
//       const [matchingBet, option] = line.split(' - ').map(str => str.trim());
//       return { matchingBet, option };
//   });
// }

// const restoredUserBets = stringToUserBets(stringBets);
// console.log(restoredUserBets);

const targetDate = new Date('October 11, 2024 12:30:00').getTime();

    // Update the countdown every second
    const countdown = setInterval(() => {
        const now = new Date().getTime(); // Get the current time
        const timeRemaining = targetDate - now; // Calculate the time difference

        if (timeRemaining > 0) {
            // Calculate days, hours, minutes, and seconds
            const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

            // Display the countdown
            document.getElementById("countdown").innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        } else {
            clearInterval(countdown); // Stop the countdown when the target date is reached
            document.getElementById("countdown").innerHTML = "Countdown over!";
        }
    }, 1000);

    const parlayButtons = $('.mode');

    parlayButtons.on('click', function() {
        parlayButtons.removeClass('on');
        $(this).addClass('on');
    } );



