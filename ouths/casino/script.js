const boardSize = 5;
const mineCount = 6;
let board = [];
let gameOver = false;

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
                revealTile(i, j);
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
        statusMessageElement.textContent = "Game Over! You hit a mine!";
        revealAllTiles();
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
