const boardSize = 5;
let mineCount = 8;
let board = [];
let gameOver = false;
let clicked = 0;
const playmessage = $('.caniplay');
let betAmount = 10;

import {
    checkBetsAndUpdateBalance,
    saveData,
    gameSave,
    displayUserInfo,
    userData,
    updateBalanceUI,
    balanceAdder,
    updateBalanceAdder,
    uiAndBalance,
    gameData,
    heartReturner,
    aWin,
} from './global.js';



checkBetsAndUpdateBalance();
displayUserInfo();

if (!gameData.gems) {
    gameData.gems = {
        lives: 5,
    }
    localStorage.setItem('gameData', JSON.stringify(gameData));
}

let currentGameLives = gameData.gems.lives;

const gameBoardElement = document.getElementById('game-board');
const statusMessageElement = document.getElementById('status-message');
const resetButton = document.getElementById('reset-button');

function createBoard() {
    board = [];
    for (let i = 0; i < boardSize; i++) {
        let row = [];
        for (let j = 0; j < boardSize; j++) {
            row.push({
                mine: false,
                revealed: false
            });
        }
        board.push(row);
    }

    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < mineCount) {
        const x = Math.floor(Math.random() * boardSize);
        const y = Math.floor(Math.random() * boardSize);
        if (!board[x][y].mine) {
            board[x][y].mine = true;
            minesPlaced++;
        }
    }

    renderBoard();
}

function renderBoard() {
    gameBoardElement.innerHTML = '';
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            const tileElement = document.createElement('div');
            tileElement.classList.add('tile');
            if (board[i][j].revealed) {
                tileElement.classList.add('revealed');
                if (board[i][j].mine) {
                    tileElement.innerHTML = '💣';
                } else {
                    tileElement.innerHTML = `
                        <img src="/bp/EE/assets/ouths/g.png" alt="mine" class="icon-x"/>
                    `;
                }
            }

            tileElement.addEventListener('click', () => {
                if (!board[i][j].revealed) {
                    revealTile(i, j);
                    addMulti();
                    if (clicked >= 3) {
                        cashOutBtn.classList.remove('disabled');
                    }
                    clicked++;
                    console.log(clicked);
                }
            });

            gameBoardElement.appendChild(tileElement);
        }
    }
}

function revealTile(x, y) {
    if (gameOver || board[x][y].revealed) return;

    board[x][y].revealed = true;
    if (board[x][y].mine) {
        gameOver = true;
        statusMessageElement.textContent = `Game Over! You hit a mine!`;
        loose();
        revealAllTiles();
        playmessage.addClass('fallDown');
        playmessage.removeClass('goUp');
        playmessage.html(`
            <div class="card">
      <div class="title">
        You hit a mine!
      </div>
      <div class="stats-i">
        <div class="stat fl-ai">
          <span></span>
          <img src="/bp/EE/assets/ouths/key.png" alt="" class="icon">
        </div>
        <span class="stat">left</span>
      </div>
      <div class="obj">

      </div>
      <button class="icon-xl" id="playAgin">Play Again</button>
    </div>
            `);

        
    } else {
        statusMessageElement.textContent = "You're safe!";
        renderBoard();
    }
}

function revealAllTiles() {
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            board[i][j].revealed = true;
        }
    }
    renderBoard();
}

resetButton.addEventListener('click', () => {
    gameOver = false;
    statusMessageElement.textContent = '';
    createBoard();
});

createBoard();

let multi = 1; 
const timers = document.getElementById('timers');

const cashOutBtn = document.getElementById('cashout');

function addMulti() {
    if (mineCount === 5)  {
        multi += 0.1;
    } else if (mineCount === 8) {
        multi += 0.15;
    }
    multi = parseFloat(multi.toFixed(2)); // Ensure one decimal place
    // Add new multiplier span
    const newSpan = document.createElement('span');
    newSpan.classList.add('timer');
    newSpan.textContent = `${multi}x`;
    timers.appendChild(newSpan);
    const finalMultiplier = Array.from(timers.children).reduce((acc, span) => acc * parseFloat(span.textContent), 1);

    cashOutBtn.innerHTML = `Cash Out (4 gems) ($${(finalMultiplier * betAmount).toFixed(2)})`;

    // Remove excess spans if more than 4
    while (timers.children.length > 4) {
        timers.removeChild(timers.firstChild);
    }

    // Remove 'selected' class from all spans
    Array.from(timers.children).forEach(span => span.classList.remove('selected'));

    // Add 'selected' class to the latest span
    newSpan.classList.add('selected');
}

function resetMulti() {
    multi = 1;
    timers.innerHTML = '';
    cashOutBtn.innerHTML = `Cash Out (4 gems) ($${(multi * betAmount).toFixed(2)})`;
}

function calculateFinalMultiplier() {
    return multi;
}

function cashOut() {
    const finalMultiplier = calculateFinalMultiplier();
    statusMessageElement.textContent = `You cashed out at ${finalMultiplier * betAmount}!`;
    revealAllTiles();
    cashOutBtn.classList.add('disabled');
    playAgain();

    uiAndBalance(finalMultiplier * betAmount);

}

function play() {
    playmessage.removeClass('fallDown');
    playmessage.addClass('goUp');
}

function playAgain() {
    createBoard();
    playmessage.removeClass('fallDown');
    playmessage.addClass('goUp');
    clicked = 0;
    multi = 1;
    timers.innerHTML = '';
    cashOutBtn.classList.add('disabled');
    gameOver = false;
    statusMessageElement.textContent = '';
}

cashOutBtn.addEventListener('click', cashOut);


const playAgainBtn = document.getElementById('playAgin');

document.addEventListener('click', (event) => {
    if (event.target && event.target.id === 'playAgin') {
        playAgain();
    }
});
const playBtn = document.getElementById('play');
playBtn.addEventListener('click', play);

playmessage.addClass('fallDown');

const changeBetBtn = document.getElementById('changeBetBtn');
changeBetBtn.addEventListener('click', () => {
    const betInput = document.getElementById('betAmountInput');
    const newBetAmount = parseFloat(betInput.value);
    if (!isNaN(newBetAmount) && newBetAmount > 0) {
        betAmount = newBetAmount;
        betInput.classList.remove('stat-error-border');
        refresh();
        createBoard();
    } else {
        betInput.classList.add('stat-error-border');
    }
});

function refresh() {
    const finalMultiplier = calculateFinalMultiplier();
    cashOutBtn.innerHTML = `Cash Out (4 gems) ($${(finalMultiplier * betAmount).toFixed(2)})`;
}

function currentAmount() {
    const finalMultiplier = calculateFinalMultiplier();
    return finalMultiplier * betAmount;
}

const riskSelect = document.getElementById('risk-select');
riskSelect.addEventListener('change', (event) => {
    mineCount = parseInt(event.target.value, 10);
    createBoard();
    resetMulti();
});

function loose() {
    gameData.gems.lives--;
    currentGameLives = gameData.gems.lives;
    saveData();
    displayHearts();
    if (gameData.gems.lives > 0) {
        if (!userData.keysAdder) {
            userData.keysAdder = 0;
        } else {
            userData.keysAdder--;
            saveData();
            console.log('no keys adder');
            if (userData.keysAdder > 0) {
                gameData.gems.lives = 5;
                saveData();
            }
        }
    }
}



function displayHearts() {
    const heartsSpan = document.getElementById('hearts');
    heartsSpan.textContent = currentGameLives > 0 ? heartReturner(currentGameLives) : '💔💔💔💔💔';
}

displayHearts();
