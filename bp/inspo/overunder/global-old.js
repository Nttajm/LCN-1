import { allBets, userBets } from './bets.js';


const divLinkers = document.querySelectorAll('div[data-linker]');
divLinkers.forEach(div => {
    div.addEventListener('click', function() {
        window.location.href = this ? this.getAttribute('data-linker') : '';
    });
}
);

const userData = JSON.parse(localStorage.getItem('userData')) || {};
 export function formatDateTime(dateTimeStr) {
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

  const allrevels = document.querySelectorAll('[data-revel]');

  if (allrevels) {
    allrevels.forEach(revel => {
        revel.addEventListener('click', function() {
            const target = document.getElementById(this.getAttribute('data-revel'));
            target.classList.toggle('dn');
        }
        );
    }
    );    
  }

  const clearAllBtn = document.getElementById('clearAllBtn');

  if (clearAllBtn) {
clearAllBtn.addEventListener('click', function() {
    localStorage.clear();
    window.location.reload();    
  }
    );
    }


    export function checkBetsAndUpdateBalance() {
        let balance = 0; // No 'let' here, update the global variable
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
      }
      checkBetsAndUpdateBalance();

    
    const userInfoElem = document.getElementById('userInfo');


    export function displayUserInfo() {
        if (!userData.username) {
            if (userInfoElem) {
                userInfoElem.innerHTML = `
                    <div class="log g-10 userForm">
                    <span>Enter your name so your data can be saved!</span>
                    <div class="userForm-i g-10">
                    <input type="text" placeholder="username" id="user">
                    <button class="multi-title" id="enterUser">
                        Enter
                    </button>
                    </div>
                    </div>
                `;
                const enterUserBtn = document.getElementById('enterUser');
                enterUserBtn.addEventListener('click', function() {
                    const username = document.getElementById('user').value;
                    userData.username = username;
                    saveData();
                    displayUserInfo();
                });
            }
      
          const username = document.getElementById('username');
          username.innerHTML = '???';
      
          // Set the event listener after rendering the butto
        } else {
          if (userInfoElem) {
            userInfoElem.classList.add('dn');
          }
          const username = document.getElementById('username');
          username.innerHTML = userData.username
        }
        const statsDiv = document.getElementById('js-stats');
          statsDiv.innerHTML = `
            <div class="stat fl-ai">
                <span>${userData.keys}</span>
                <img src="/bp/EE/assets/ouths/key.png" alt="" class="icon">
              </div>
              <div class="stat fl-ai">
                <span class="rank-1">${userData.rank}</span>
                <img src="/bp/EE/assets/ouths/rank-1.png" alt="" class="icon">
              </div>
              <span class="balance money">$${balance}</span>
          `;

      }
      
      
      console.log(userData);
      displayUserInfo();