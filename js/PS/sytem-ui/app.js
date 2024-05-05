const appProgram = [
    {
        name: 'snake',
        appHTML: `<span id="what">not yet made</span>`,
        id: 391,
    },
    {
        name: 'pong',
        appHTML: `
        <div class="app-head">
                Pong <span class="bold">>_</span>
        </div>
        <div id="gameArea">
        <div id="ball"></div>
        <div id="paddleLeft"></div>
        <div id="paddleRight"></div>
        </div>
        `,
        id: 191,
    },
    {
        name: 'minesweeper',
        appHTML: `
        <div class="app-head">
        minesweeper <span class="bold">>_</span>
            </div>
        <div id="board"></div>
        `,
        id: 291,
    },
    {
      name: 'other',
      appHTML: `
      
      `,
      type: 'wallpaper',
      id: 691,
    },
    {
      name: 'other',
      appHTML: `
      
      `,
      type: 'wallpaper',
      id: 403,
    },
    {
      name: 'other',
      appHTML: `

      `,
      type: 'wallpaper',
      id: 413,
    },
];

function runProgram(proId) {
    const display = document.getElementById('tab3');
    display.innerHTML = ``;
    let found = false;
    appProgram.forEach(app => {
        if (app.type === 'wallpaper') {
          if (proId === app.id && app.type === 'wallpaper') {
            WallpaperCH(proId);
          }
        }
        if (proId === app.id) {
            if (app.name === 'other' ) {
              openTab1('tab2');
            } else {
              openTab1('tab3');
            }
            
            display.innerHTML = app.appHTML;
            found = true;
            if (proId === 191) {
                pongapp(); // Call pongapp() only if Pong is being displayed
            }
            if (proId === 291) {
                minesweeperGame(); 
            }
        }
    });
    if (!found) {
        sysMessage('Unexpected input: The input is either not valid or does not exist.', 'e');
    }
}

function WallpaperCH(number) {
  let changedElems = document.querySelectorAll('.js-app-wallp');
  let blurElems = document.querySelectorAll('.js-blurBackground');
  let wallpaperObjects = {
    'japan': `/js/ps/assets/cherryblossum.webp`,
    'new york': `/js/ps/assets/new_york.jpg`,
    'monte' :  `./projects/proj/inspo-1/assets/wp9197366-dark-hills-wallpapers.jpg`,
  }

  const wpSize = `cover`;
  function wall(img) {
    changedElems.forEach(function(elem) {
      elem.style.backgroundImage = `url(${img})`;
      elem.style.backgroundSize = wpSize;
    });
    blurElems.forEach(function(elem) {
      elem.classList.add('blur')
    });
  }

  if (number === 691) {
    wall(wallpaperObjects.japan)
  }
  
  if (number === 403) {
    wall(wallpaperObjects["new york"])
  }

  if (number === 413) {
    wall(wallpaperObjects["monte"])
  }
}


function pongapp() {
const ball = document.getElementById('ball');
const paddleLeft = document.getElementById('paddleLeft');
const paddleRight = document.getElementById('paddleRight');
const gameArea = document.getElementById('gameArea');

let ballX = 390;
let ballY = 190;
let ballSpeedX = getRandomSpeed();
let ballSpeedY = getRandomSpeed();

let paddleLeftY = 150;
let paddleRightY = 150;

let isPaddleLeftDragging = false;
let isPaddleRightDragging = false;

function getRandomSpeed() {
  return (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 2 + 1);
}

function update() {
  // Update ball position
  ballX += ballSpeedX;
  ballY += ballSpeedY;

  // Check collision with top and bottom walls
  if (ballY <= 0 || ballY >= 380) {
    ballSpeedY = -ballSpeedY;
  }

  // Check collision with left paddle
  if (ballX <= 20 && ballY + 20 >= paddleLeftY && ballY <= paddleLeftY + 100) {
    ballSpeedX = -ballSpeedX;
  }

  // Check collision with right paddle
  if (ballX >= 760 && ballY + 20 >= paddleRightY && ballY <= paddleRightY + 100) {
    ballSpeedX = -ballSpeedX;
  }

  // Check if ball goes out of bounds
  if (ballX <= 0 || ballX >= 780) {
    // Reset ball position and speed
    ballX = 390;
    ballY = 190;
    ballSpeedX = getRandomSpeed();
    ballSpeedY = getRandomSpeed();
  }

  // Update paddleRightY to track the ball
  paddleRightY = ballY - 50;

  // Render elements
  ball.style.left = ballX + 'px';
  ball.style.top = ballY + 'px';
  paddleLeft.style.top = paddleLeftY + 'px';
  paddleRight.style.top = paddleRightY + 'px';
}

// Make paddles draggable
paddleLeft.addEventListener('mousedown', function(event) {
  isPaddleLeftDragging = true;
});

paddleRight.addEventListener('mousedown', function(event) {
  isPaddleRightDragging = true;
});

gameArea.addEventListener('mouseup', function(event) {
  isPaddleLeftDragging = false;
  isPaddleRightDragging = false;
});

gameArea.addEventListener('mousemove', function(event) {
  if (isPaddleLeftDragging) {
    let mouseY = event.clientY - gameArea.offsetTop;
    paddleLeftY = mouseY - 50;
  }
  if (isPaddleRightDragging) {
    let mouseY = event.clientY - gameArea.offsetTop;
    paddleRightY = mouseY - 50;
  }
});

// Game loop
setInterval(update, 1000 / 60);


}

function minesweeperGame() {
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
        isFlagged: false,
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
  if (grid[row][col].isRevealed || grid[row][col].isFlagged) return;
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
  if (event.button === 0) {
    revealCell(row, col);
  } else if (event.button === 2) {
    toggleFlag(row, col);
  }
  event.preventDefault(); // Prevent browser context menu
}

function toggleFlag(row, col) {
  let cell = document.getElementById(`cell-${row}-${col}`);
  if (grid[row][col].isFlagged) {
    grid[row][col].isFlagged = false;
    cell.textContent = '';
  } else {
    grid[row][col].isFlagged = true;
    cell.textContent = '🚩';
  }
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
      cell.addEventListener('contextmenu', handleClick);
      board.appendChild(cell);
    }
    board.appendChild(document.createElement('br'));
  }
}

initGame();

function revealCell(row, col) {
    if (grid[row][col].isRevealed || grid[row][col].isFlagged) return;
    grid[row][col].isRevealed = true;
    let cell = document.getElementById(`cell-${row}-${col}`);
    cell.classList.remove('hidden');
    if (grid[row][col].isMine) {
      cell.classList.add('mine');
    } else {
      let numMines = countNeighborMines(row, col);
      if (numMines > 0) {
        cell.classList.add('num');
        cell.classList.add(numberToClass(numMines));
        cell.textContent = numMines;
      }
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
  
  function numberToClass(number) {
    switch (number) {
      case 1:
        return 'one';
      case 2:
        return 'two';
      case 3:
        return 'three';
      case 4:
        return 'four';
      case 5:
        return 'five';
      case 6:
        return 'six';
      case 7:
        return 'seven';
      case 8:
        return 'eight';
      default:
        return 'num';
    }
  }
  

}