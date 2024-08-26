let balance = 0;
const balanceOutput = document.querySelector('.balance');
let container = document.querySelector('.sec'); 
const multi = 1;

// localStorage.removeItem('userBets');

balanceOutput.innerHTML = '';
balanceOutput.insertAdjacentHTML('beforeend', `<span>$${balance}</span>`);


const userBets = JSON.parse(localStorage.getItem('userBets')) || [];

const bets = [
  {
    sport: 'soccer',
    techTeam: 'Tech High Soccer (F)',
    against: 'Real Madrid',
    id: '3s',
    amount: .5,
    typeBet: 'Goals',
    status: '',
    option: '',
    result: '',
    price: 20,
  },
  {
    sport: 'soccer',
    techTeam: 'Tech High Soccer (F)',
    against: 'Middle Town',
    id: '2s',
    amount: 1.5,
    typeBet: 'Goals',
    status: 'ended',
    option: '',
    result: 'under',
    price: 20,
  },
  {
    sport: 'soccer',
    techTeam: 'Tech High Soccer (F)',
    against: 'Celtic',
    id: '1s',
    amount: 2.5,
    typeBet: 'Goals',
    status: 'ended',
    option: 'under',
    result: 'under',
    price: 75,
  },
];

document.addEventListener('DOMContentLoaded', () => {
  updateButtons();
  renderBets();
});

function checkBetsAndUpdateBalance() {
  balance = 0; // Reset balance calculation
  bets.forEach(bet => {
    if (bet.result) {
      const userBet = userBets.find(uBet => uBet.matchingBet === bet.id);
      if (userBet && userBet.option === bet.result) {
        balance += bet.price;
      }
    }
  });
}

checkBetsAndUpdateBalance()

function renderBets() {
  container.innerHTML = '';

  bets.forEach(bet => {
    let buttonsHtml = `<button class="over">over</button>
    <button class="under">under</button>`;
    let betClass = '';
    let imgType = 'https://via.placeholder.com/50';
    let additionalText = '';

    if (bet.sport === 'soccer') { 
      imgType = '/bp/EE/assets/ouths/soccerball.png';
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
    console.log(overBtn, underBtn);

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
// Initial rendering of bets
renderBets();
console.log(userBets);
console.log(bets);
