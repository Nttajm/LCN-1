const board = document.getElementById('board');
const ROWS = 8;
const COLS = 8;
const MINES = 10;

let grid = [];

function createGrid() {
  for (let i = 0; i < ROWS; i++) {
    grid[i] = [];
    for (let j = 0; j < COLS; j++) {
      grid[i][j] = {
        isMine: false,
        isRevealed: false,
        neighbors: 0
      };
    }
  }
}

function plantMines() {
  let minesPlanted = 0;
  while (minesPlanted < MINES) {
    let row = Math.floor(Math.random() * ROWS);
    let col = Math.floor(Math.random() * COLS);
    if (!grid[row][col].isMine) {
      grid[row][col].isMine = true;
      minesPlanted++;
    }
  }
}

function revealCell(row, col) {
  if (grid[row][col].isRevealed) return;
  grid[row][col].isRevealed = true;
  let cell = document.getElementById(`cell-${row}-${col}`);
  cell.classList.remove('hidden');
  if (grid[row][col].isMine) {
    cell.classList.add('mine');
  } else {
    cell.textContent = countNeighborMines(row, col);
  }
  if (countNeighborMines(row, col) === 0) {
    for (let i = row - 1; i <= row + 1; i++) {
      for (let j = col - 1; j <= col + 1; j++) {
        if (i >= 0 && i < ROWS && j >= 0 && j < COLS) {
          revealCell(i, j);
        }
      }
    }
  }
}

function countNeighborMines(row, col) {
  let count = 0;
  for (let i = row - 1; i <= row + 1; i++) {
    for (let j = col - 1; j <= col + 1; j++) {
      if (i >= 0 && i < ROWS && j >= 0 && j < COLS && grid[i][j].isMine) {
        count++;
      }
    }
  }
  return count;
}

function handleClick(event) {
  let cell = event.target;
  let [row, col] = cell.id.split('-').slice(1).map(Number);
  revealCell(row, col);
}

function initGame() {
  createGrid();
  plantMines();

  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      let cell = document.createElement('div');
      cell.id = `cell-${i}-${j}`;
      cell.classList.add('cell', 'hidden');
      cell.addEventListener('click', handleClick);
      board.appendChild(cell);
    }
    board.appendChild(document.createElement('br'));
  }
}

initGame();
