import { bets } from './bets.js';
import { userBets, userData, toCashout, save } from "./userData.js";

export let cashoutBtn = {
    value: toCashout,
    element: document.querySelector('.cashout'),
    displayElem: document.getElementById('cashout-value'),
};

cashoutBtn.displayElem.innerHTML = '$' + cashoutBtn.value;

cashoutBtn.element.addEventListener('click', () => { 
    if (userData[0]) {
        userData[0].value += cashoutBtn.value;
        cashoutBtn.value = 0;
        toCashout = 0;
        cashoutBtn.displayElem.innerHTML = '$' + cashoutBtn.value;
        save();
    }
});

let multi = 1;
const betsDiv = document.querySelector('.bets');

function betSection(multi, cash, against, time, bet, betStatus, result, id, typeBet, status) {
    status = status || '';
    let endClass = '';
    let buttonSecHtml = `
        <button class="green-btn btn">Over</button>
        <button class="red-btn btn">Under</button>
    `;

    if (betStatus === 'over') {
        buttonSecHtml = `
            <button class="green-btn btn disabled">Over</button>
            <button class="red-btn btn collapse">Under</button>
        `;
    } else if (betStatus === 'under') {
        buttonSecHtml = `
            <button class="green-btn btn collapse">Over</button>
            <button class="red-btn btn disabled">Under</button>
        `;
    }

    if (result === 'over') {
        buttonSecHtml = `
            <button class="green-btn btn disabled">Was Over</button>
        `;
        endClass = 'ended';
    }

    if (result === 'under') {
        buttonSecHtml = `
            <button class="red-btn btn disabled">Was Under</button>
        `;
        endClass = 'ended';
    }

    return `
        <div class="bet ${endClass || ''}" data-betId='${id}'>
            <span class="multi it">${multi}x</span>
            <span class="multi it r">$${cash}</span>
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
            <div class="button-sec">${buttonSecHtml}</div>
            <div class="date fl-c fl-ai">
                <span>${formatDate(time)}</span>
                <span class="bold">${status === 'o' ? 'Ongoing...' : ''}</span>
            </div>
        </div>
    `;
}

const valueElem = document.getElementById('userData-value');
valueElem.innerHTML = userData[0] ? '$' + userData[0].value : '$0';

function changeBetStatus(betId, status) {
    const userBet = userBets.find(b => b.id === betId);
    if (userBet) {
        userBet.betStatus = status;
    } else {
        userBets.push({ id: betId, betStatus: status });
    }

    bets.forEach(bet => {
        bet.details.forEach(detail => {
            if (detail.idl === betId) {
                detail.status = status;
                detail.betStatus = status;
            }
        });
    });

    save();
    updateUI(betId, status);
}

function updateUI(betId, betStatus) {
    const betElement = document.querySelector(`.bet[data-betId='${betId}']`);
    const overBtn = betElement.querySelector('.green-btn');
    const underBtn = betElement.querySelector('.red-btn');

    if (betStatus === 'over') {
        overBtn.classList.add('disabled');
        underBtn.classList.add('collapse');
    } else if (betStatus === 'under') {
        underBtn.classList.add('disabled');
        overBtn.classList.add('colslapse');  
    }

    const realbet = bets.details.find(bet => bet.idl === betId);}

let betsHtml = '';
bets.forEach(bet => {
    if (bet.sport === 'soccer') {
        bet.details.forEach(detail => {
            betsHtml += betSection(
                multi,
                detail.cash,
                detail.against,
                detail.time,
                detail.bet,
                detail.betStatus,
                detail.result,
                detail.idl,
                detail.typeBet,
                detail.status,
            );
        });
    }
});
betsDiv.innerHTML = betsHtml;

bets.forEach(bet => {
    if (bet.sport === 'soccer') {
        bet.details.forEach(detail => {
            const overBtn = document.querySelector(`.bet[data-betId='${detail.idl}'] .green-btn`);
            const underBtn = document.querySelector(`.bet[data-betId='${detail.idl}'] .red-btn`);

            overBtn.addEventListener('click', () => {
                changeBetStatus(detail.idl, 'over');
                save();
            });

            underBtn.addEventListener('click', () => {
                changeBetStatus(detail.idl, 'under');
                save();
            });

            // Ensure the correct buttons are displayed based on the saved betStatus
            updateUI(detail.idl, detail.betStatus);
        });
    }
});

save();

function parseCustomDate(dateStr) {
    const [datePart, timePart] = dateStr.split(' ');
    const [month, day, year] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
}

function checkOngoing() {
    bets.forEach(bet => {
        if (bet.sport === 'soccer') {
            bet.details.forEach(detail => {
                const currentTime = new Date();
                const betTime = parseCustomDate(detail.time);
                const endTime = new Date(betTime);
                endTime.setHours(endTime.getHours() + 1);
                endTime.setMinutes(endTime.getMinutes() + 30);

                if (currentTime > betTime && currentTime <= endTime) {
                    detail.status = 'o'; // The event is ongoing
                } else if (currentTime > endTime) {
                    detail.status = ''; // The event is over, set status to empty
                }
            });
        }
    });
    save();
}

setInterval(checkOngoing, 600);
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
