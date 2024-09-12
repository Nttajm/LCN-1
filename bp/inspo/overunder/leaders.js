import { soccerBets } from "./bets.js";
import { basketballBets } from "./bets.js";
import { volleyballBets } from "./bets.js";

let userData = JSON.parse(localStorage.getItem('userData')) || {};


const allBets = [...soccerBets, ...basketballBets, ...volleyballBets];
const userBets = JSON.parse(localStorage.getItem('userBets')) || [];

let balance = 0;

const balanceElem = document.querySelector('.balance');

function checkBetsAndUpdateBalance() {
    balance = 0;
    userBets.forEach(userBet => {
        const matchingBet = allBets.find(bet => bet.id === userBet.matchingBet);
        if (matchingBet) {
            if (matchingBet.result === userBet.option) {
                balance += matchingBet.price;
            } else if (matchingBet.result !== userBet.option && (matchingBet.result === 'over' || matchingBet.result === 'under')) {
                balance -= matchingBet.price;
            }
        }
    });
    balanceElem.innerHTML = `<span>$${balance}</span>`;
}

checkBetsAndUpdateBalance();

if (balance < 0) {
    balanceElem.classList.add('negative');
} else {
    balanceElem.classList.remove('negative');
}

function encryptNumbers(input) {
    const digitToCode = [
        'ILY', '1-MAG-1GU', 'WTG', 'AIG', 'ERX-82', 'IOITRN', '29-10', 'sigma', '13-14', 'JKSON',
        'ILY', '1-MAG-1GU', 'WTG', 'AIG', 'ERX-82', 'IOITRN', '29-10', 'sigma', '13-14', 'JKSON',
    ];

    let shift = Math.floor(Math.random() * 9) + 1;


    let encrypted = '';

    for (let i = 0; i < input.length; i++) {
        let char = input[i];
        let index = char.charCodeAt(0) - '0'.charCodeAt(0);

        if (char >= '0' && char <= '9') {
            // Encrypt the number using a Caesar cipher approach
            let shiftedIndex = (index + shift) % 10;
            encrypted += digitToCode[shiftedIndex];
        } else {
            encrypted += char; // Keep non-number characters unchanged
        }
    }
    
    // Reverse the encrypted string
    return encrypted.split('').reverse().join('') + '*' + shift;
}

function decryptNumbers(encrypted) {
    const digitToCode = [
        'ILY', '1-MAG-1GU', 'WTG', 'AIG', 'ERX-82', 'IOITRN', '29-10', 'sigma', '13-14', 'JKSON',
        'ILY', '1-MAG-1GU', 'WTG', 'AIG', 'ERX-82', 'IOITRN', '29-10', 'sigma', '13-14', 'JKSON',
    ];

    // Extract the shift value and encrypted string
    let [reversedEncrypted, shift] = encrypted.split('*');
    shift = parseInt(shift, 10);

    // Reverse the encrypted string
    let encryptedString = reversedEncrypted.split('').reverse().join('');

    let decrypted = '';

    let i = 0;
    while (i < encryptedString.length) {
        let matchFound = false;
        for (let j = 0; j < digitToCode.length; j++) {
            let code = digitToCode[j];
            if (encryptedString.startsWith(code, i)) {
                let index = j;
                // Decrypt the number using the reverse of the Caesar cipher approach
                let originalIndex = (index - shift + 10) % 10;
                decrypted += String.fromCharCode('0'.charCodeAt(0) + originalIndex);
                i += code.length;
                matchFound = true;
                break;
            }
        }
        if (!matchFound) {
            decrypted += encryptedString[i];
            i++;
        }
    }

    return decrypted;
}

const requestLeaderBtn = document.getElementById('reqest-leader');
requestLeaderBtn.addEventListener('click', postLeader);

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


const gameCodeElem = document.querySelector('.js-gameCode');

if (gameCodeElem) {
    gameCodeElem.value = encryptNumbers(balance.toString());
}
      
const upstat = document.getElementById('upstat');     
upstat.innerHTML = `<span>9/11 11:59PM</span>`;                

let showTop7 = true;
const leadersAmount = 5;

const leadersBefore = [
    {
        name: 'KINGranchy__',
        balance: 595,
    },
    {
        name: 'Evan',
        balance: 145,
    },
    {
        name: 'notdavid',
        balance: 200,
    },
    {
        name: 'tearsinmycutelatinaeyes1',
        gameCode: 'NOSKJ*9',
    },
    {
        name: 'Joshhhyyy',
        gameCode: 'GIA*3',
    },
    {
        name: 'Batman',
        gameCode: '28-XREUG1-GAM-101-92*4',
    },
    {
        name: 'T-dubbies',
        balance: 90,
    },
    {
        name: 'coolMathGames',
        balance: 110,
    },
    {
        name: 'nosirraH Matticola',
        balance: -60,
    },
    {
        name: 'JoelM',
        balance: -260,
    },
    {
        name: '0ping Joel',
        balance: -110,
    },
    {
        name: 'nathan',
        balance: -200,
    },
    {
        name: 'joel_alt-2',
        balance: -150,
    },
    {
        name: 'Neeraj',
        gameCode: '41-3101-92*8',
    },
    {
        name: 'joshyy',
        balance: -15,
    },
    {
        name: 'day1oroneday_ah_joel!',
        balance: 90,
    },
    {
        name: '707ty',
        balance: -30,
    },
    {
        name: 'RiceRanger',
        balance: 90,
    },
    {
        name: 'Jordan_',
        balance: 10,
    },
    
        name: 'Cassiopeia'
        balance: -60,
    },
];

const leadersSorted = leadersBefore.sort((a, b) => getBalance(b) - getBalance(a));

// Helper function to get the balance (same as before)
function getBalance(leader) {
    if (leader.balance !== undefined) {
        return leader.balance;
    } else if (leader.gameCode) {
        const decryptedCode = decryptNumbers(leader.gameCode);
        return parseInt(decryptedCode, 10) || 0; // Default to 0 if decryption fails
    }
    return 0; // Default if neither is available
}

// Function to render the leaders in the DOM
function renderLeaders(leaders) {
    const leaderElem = document.getElementById('js-leaders');
    leaderElem.innerHTML = ''; // Clear the current leaders

    leaders.forEach((leader, index) => {
        const leaderDiv = document.createElement('div');
        leaderDiv.classList.add('leader');
        leaderDiv.innerHTML = `
            <span class="leader-rank">${index + 1}</span>
            <span class="leader-name">${leader.name}</span>
            <span class="leader-balance">$${getBalance(leader)}</span>
        `;
        leaderElem.appendChild(leaderDiv);
    });
}

// Function to toggle between top 7 and all leaders
function toggleLeaders() {
    if (showTop7) {
        // Show all leaders
        renderLeaders(leadersSorted);
        toggleBtn.textContent = `show top ${leadersAmount}`;
    } else {
        // Show top 5 leaders
        renderLeaders(leadersSorted.slice(0, leadersAmount));
        toggleBtn.textContent = "Show All Leaders";
    }
    // Toggle the state
    showTop7 = !showTop7;
}

// Initial render (show top 5 by default)
renderLeaders(leadersSorted.slice(0, leadersAmount));

// Add event listener to toggle button
const toggleBtn = document.getElementById('toggleLeadersBtn');
toggleBtn.addEventListener('click', toggleLeaders);

