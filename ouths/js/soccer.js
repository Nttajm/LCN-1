import { bets } from './bets.js';
import { userBets, userData } from "./userData.js";
import { toCashout } from "./userData.js";


export let cashoutBtn = {
    value: 0,
    element: document.querySelector('.cashout'),
    displayElem : document.getElementById('cashout-value'),
};

cashoutBtn.value = toCashout;
cashoutBtn.displayElem.innerHTML = '$' + cashoutBtn.value;

cashoutBtn.element.addEventListener('click', () => { 
    userData[0].value = userData[0].value + cashoutBtn.value;
    cashoutBtn.value = 0;
    cashoutBtn.displayElem.innerHTML = '$' + cashoutBtn.value;
    valueElem.innerHTML = '$' + userData[0].value;
    save();
});

let multi = 1;
const betsDiv = document.querySelector('.bets');
betsDiv.innerHTML = '';

function betSection(multi, cash, against, time, bet, betStatus, result, id, typeBet, status) {
    status = status || '';
    let endClass = '';

    let buttonSecHtml = `
        <button class="green-btn btn">Over</button>
        <button class="red-btn btn">Under</button>
    `;
    let addition = '';

    if (betStatus === undefined && result === undefined) {
        buttonSecHtml = `
            <button class="green-btn btn">Over</button>
            <button class="red-btn btn collapse">Under</button>
        `;
    } else if (betStatus === 'over' && result === undefined) {
        buttonSecHtml = `
            <button class="green-btn btn">Over</button>
            <button class="red-btn btn disabled collapse">Under</button>
        `;
    } else if (betStatus === 'under' && result === undefined) {
        buttonSecHtml = `
            <button class="green-btn btn disabled collapse">Over</button>
            <button class="red-btn btn">Under</button>
        `;
    } else if ((betStatus === 'over' || betStatus === undefined) && result === 'over') {
        buttonSecHtml = `
            <button class="green-btn btn disabled">Was Over</button>
        `;
        endClass = 'ended';
    } else if ((betStatus === 'under' || betStatus === undefined) && result === 'under') {
        buttonSecHtml = `
            <button class="red-btn btn disabled">Was Under</button>
        `;
        endClass = 'ended';
    } else if (status === "o") {
        addition = 'Ongoing...';
        buttonSecHtml = `
            <button class="green-btn btn" disabled>Over</button>
            <button class="red-btn btn" disabled>Under</button>
        `;
        endClass = 'ended';
    }

    return `
        <div class="bet ${endClass || ''}" data-betId='${id}'>
            <span class="multi it">
                ${multi}x
            </span>
            <span class="multi it r">
                $${cash}
            </span>
            <div class="game">
                <img src="bp/EE/assets/ouths/soccerball.png" class="game-img" alt="">
                <div class="name">
                    <span class="bold">Tech High</span>
                    <span>vs ${against}</span>
                </div>
            </div>
            <div class="for">
                <span>${bet}</span>
                <span>${typeBet}</span>
            </div>
            <div class="button-sec">
                ${buttonSecHtml}
            </div>
            <div class="date fl-c fl-ai">
                <span>${formatDate(time)}</span>
                <span class="bold">${addition}</span>
            </div>
        </div>
    `;
}

console.log( typeof userData[0].value)

const value = userData[0].value;
const valueElem = document.getElementById('userData-value');

valueElem.innerHTML = '$' + value;

function changeBetStatus(betId, status) {
    let bet = bets.find(bet => bet.id === betId);
    bet.details.forEach(detail => {
        detail.status = status;
    });
}

bets.forEach(bet => {
    if (bet.sport === 'soccer') {
        bet.details.forEach((detail) => {
            // Append the bet section to the betsDiv
            betsDiv.innerHTML += betSection(
                multi,
                detail.cash,
                detail.against,
                detail.time,
                detail.bet,
                detail.betStatus,
                detail.result,
                detail.idl,      // Passing the betId correctly
                detail.typeBet , // Passing the typeBet correctly
                detail.status,
            );
        });
    }
});

// Attach event listeners after the DOM is updated
bets.forEach(bet => {
    if (bet.sport === 'soccer') {
        bet.details.forEach((detail) => {
            const idl = '1s'
            const overBtn = document.querySelector(`.bet[data-betId='${idl}'] .green-btn`);
            const underBtn = document.querySelector(`.bet[data-betId='${idl}'] .red-btn`);
            console.log(detail.idl)
                overBtn.addEventListener('click', () => {
                    changeBetStatus(detail.id, 'over');
                    overBtn.classList.add('disabled');
                    underBtn.classList.add('collapse');
                    console.log('Bet status changed to over');
                    userBets.push({
                        id: detail.id,
                        betStatus: 'over',
                    });
                    save();
                });

                underBtn.addEventListener('click', () => {
                    changeBetStatus(detail.id, 'under');
                    underBtn.classList.add('disabled');
                    overBtn.classList.add('collapse');
                    console.log('Bet status changed to under');
                    userBets.push({
                        id: detail.id,
                        betStatus: 'under',
                    });
                    save();
                });

        });
    }
});

function save() {
    localStorage.setItem('userDatas', JSON.stringify(userData));
    localStorage.setItem('bets', JSON.stringify(bets));
    localStorage.setItem('userBets', JSON.stringify(userBets));
    localStorage.setItem('toCash', cashoutBtn.value);
}

// Function to parse the custom date format

function parseCustomDate(dateStr) {
    // Split the date and time
    const [datePart, timePart] = dateStr.split(' ');

    // Split the date part into month, day, year
    const [month, day, year] = datePart.split('-').map(Number);

    // Split the time part into hours and minutes
    const [hours, minutes] = timePart.split(':').map(Number);

    // Create a new Date object with the parsed values
    return new Date(year, month - 1, day, hours, minutes);
}

function checkOngoing() {
    bets.forEach(bet => {
        if (bet.sport === 'soccer') {
            bet.details.forEach((detail) => {
                console.log(detail)
                const currentTime = new Date();
                const betTime = parseCustomDate(detail.time);

                // Calculate end time (1 hour 30 minutes after the event time)
                const endTime = new Date(betTime);
                endTime.setHours(endTime.getHours() + 1);
                endTime.setMinutes(endTime.getMinutes() + 30);

                if (currentTime > betTime && currentTime <= endTime) {
                    detail.status = 'o'; // The event is ongoing
                } else if (currentTime > endTime) {
                    detail.status = ''; // The event is over, set status to empty
                }
                // No action needed if currentTime <= betTime
            });
        }
    });

    // Optionally, update the DOM or perform other actions here
}

// Run the checkOngoing function every 1 minute (60000 milliseconds)
setInterval(checkOngoing, 60000);

// Optionally, run the function immediately on page load
checkOngoing();



function formatDate(input) {
    let date = new Date(input);
    let options = {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    return date.toLocaleDateString('en-US', options);
}
