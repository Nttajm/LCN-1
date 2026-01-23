// ========================================
// GEMS/MINES GAME - STAKE STYLE
// ========================================

// Game Configuration
const config = {
  betAmount: 10,
  minesCount: 5,
  sessionProfit: 0,
  gamesPlayed: 0,
  bestWin: 0,
  isPlaying: false,
  gemsFound: 0,
  currentMultiplier: 1,
  grid: [], // 25 tiles (5x5)
  revealedTiles: [],
  isSignedIn: false
};

// Wait for auth to be ready
function waitForAuth() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.CasinoAuth) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

// Multiplier calculation based on mines and gems found
function calculateMultiplier(mines, gemsFound) {
  if (gemsFound === 0) return 1;
  
  const totalTiles = 25;
  const safeTiles = totalTiles - mines;
  
  // House edge of ~1%
  let multiplier = 0.87;
  
  for (let i = 0; i < gemsFound; i++) {
    multiplier *= (totalTiles - i) / (safeTiles - i);
  }
  
  return Math.max(1, multiplier);
}

// Initialize the game grid
function initGrid() {
  config.grid = [];
  config.revealedTiles = [];
  config.gemsFound = 0;
  config.currentMultiplier = 1;
  
  // Create 25 tiles (all gems initially)
  for (let i = 0; i < 25; i++) {
    config.grid.push({ type: 'gem', revealed: false });
  }
  
  // Place mines randomly
  let minesPlaced = 0;
  while (minesPlaced < config.minesCount) {
    const randomIndex = Math.floor(Math.random() * 25);
    if (config.grid[randomIndex].type !== 'mine') {
      config.grid[randomIndex].type = 'mine';
      minesPlaced++;
    }
  }
  
  renderGrid();
  updateMultiplierDisplay();
}

// Render the grid
function renderGrid() {
  const gridEl = document.getElementById('gemsGrid');
  gridEl.innerHTML = '';
  
  config.grid.forEach((tile, index) => {
    const tileEl = document.createElement('div');
    tileEl.className = 'gem-tile';
    tileEl.dataset.index = index;
    
    if (!config.isPlaying) {
      tileEl.classList.add('disabled');
    }
    
    if (tile.revealed) {
      tileEl.classList.add('revealed');
      tileEl.classList.add(tile.type);
      tileEl.innerHTML = `<span class="tile-content">${tile.type === 'gem' ? '💎' : '💣'}</span>`;
    }
    
    tileEl.addEventListener('click', () => revealTile(index));
    gridEl.appendChild(tileEl);
  });
}

// Reveal a tile
function revealTile(index) {
  if (!config.isPlaying) return;
  if (config.grid[index].revealed) return;
  
  const tile = config.grid[index];
  tile.revealed = true;
  config.revealedTiles.push(index);
  
  const tileEl = document.querySelector(`.gem-tile[data-index="${index}"]`);
  tileEl.classList.add('revealed');
  tileEl.classList.add(tile.type);
  tileEl.innerHTML = `<span class="tile-content">${tile.type === 'gem' ? '💎' : '💣'}</span>`;
  
  if (tile.type === 'mine') {
    // Game over - hit a mine
    gameOver(false);
  } else {
    // Found a gem
    config.gemsFound++;
    config.currentMultiplier = calculateMultiplier(config.minesCount, config.gemsFound);
    updateMultiplierDisplay();
    
    // Check if all gems found (auto cashout)
    const totalGems = 25 - config.minesCount;
    if (config.gemsFound >= totalGems) {
      cashout();
    }
  }
}

// Update multiplier display
function updateMultiplierDisplay() {
  const multiplierEl = document.getElementById('currentMultiplier');
  const potentialWinEl = document.getElementById('potentialWin');
  
  multiplierEl.textContent = config.currentMultiplier.toFixed(2) + 'x';
  
  // Show potential win based on bet amount and multiplier
  const potentialWin = (config.betAmount * config.currentMultiplier).toFixed(2);
  potentialWinEl.innerHTML = `Win: <span>$${potentialWin}</span>`;
  
  // Update 3 gems preview
  const threeGemsMult = calculateMultiplier(config.minesCount, 3);
  const threeGemsMultEl = document.getElementById('threeGemsMultiplier');
  const threeGemsWinEl = document.getElementById('threeGemsWin');
  
  if (threeGemsMultEl) {
    threeGemsMultEl.textContent = threeGemsMult.toFixed(2) + 'x';
  }
  if (threeGemsWinEl) {
    threeGemsWinEl.textContent = '$' + (config.betAmount * threeGemsMult).toFixed(2);
  }
  
  // Update cashout button state
  updateCashoutButton();
}

// Update cashout button state
function updateCashoutButton() {
  const cashoutBtn = document.getElementById('cashoutBtn');
  const gemsNeeded = 2 - config.gemsFound;
  const potentialWin = (config.betAmount * config.currentMultiplier).toFixed(2);
  
  if (config.gemsFound < 2) {
    cashoutBtn.classList.add('disabled');
    if (gemsNeeded === 2) {
      cashoutBtn.textContent = 'Need 2 gems to cashout';
    } else {
      cashoutBtn.textContent = `Need ${gemsNeeded} more gem`;
    }
  } else {
    cashoutBtn.classList.remove('disabled');
    cashoutBtn.textContent = `Cashout $${potentialWin}`;
  }
}

// Start a new game
async function startGame() {
  // Check if signed in
  if (!config.isSignedIn) {
    alert('Please sign in to play!');
    return;
  }
  
  const currentBalance = window.CasinoAuth.getBalance();
  if (currentBalance < config.betAmount) {
    alert('Insufficient balance!');
    return;
  }
  
  // Place bet
  const result = await window.CasinoDB.placeBet(config.betAmount, 'gems');
  if (!result.success) {
    alert(result.error || 'Failed to place bet');
    return;
  }
  
  updateBalanceDisplay();
  
  config.isPlaying = true;
  config.gamesPlayed++;
  document.getElementById('gamesPlayed').textContent = config.gamesPlayed;
  
  // Update UI
  document.getElementById('betBtn').style.display = 'none';
  document.getElementById('cashoutBtn').classList.add('show');
  document.getElementById('betAmount').disabled = true;
  document.getElementById('minesSelect').disabled = true;
  
  // Hide game over overlay
  document.getElementById('gameOverOverlay').classList.remove('show');
  
  initGrid();
}

// Cashout
async function cashout() {
  if (!config.isPlaying) return;
  if (config.gemsFound < 2) return; // Need at least 2 gems to cashout
  
  // Calculate winnings based on bet amount and multiplier
  const winAmount = Math.round(config.betAmount * config.currentMultiplier * 100) / 100;
  const profit = Math.round((winAmount - config.betAmount) * 100) / 100;
  
  // Record win in database
  await window.CasinoDB.recordWin(winAmount);
  
  config.sessionProfit += profit;
  
  // Update profit graph
  if (window.ProfitGraph) {
    window.ProfitGraph.addPoint(profit);
  }
  
  if (profit > config.bestWin) {
    config.bestWin = profit;
    document.getElementById('bestWin').textContent = '$' + config.bestWin.toFixed(2);
  }
  
  updateBalanceDisplay();
  updateProfitDisplay();
  
  gameOver(true, winAmount);
}

// Game over
async function gameOver(won, amount = 0) {
  config.isPlaying = false;
  
  // Reveal all mines
  config.grid.forEach((tile, index) => {
    if (tile.type === 'mine' && !tile.revealed) {
      const tileEl = document.querySelector(`.gem-tile[data-index="${index}"]`);
      tileEl.classList.add('revealed', 'mine-revealed');
      tileEl.innerHTML = `<span class="tile-content">💣</span>`;
    }
  });
  
  // Disable all tiles
  document.querySelectorAll('.gem-tile').forEach(tile => {
    tile.classList.add('disabled');
  });
  
  // Show game over overlay
  const overlay = document.getElementById('gameOverOverlay');
  const title = document.getElementById('gameOverTitle');
  const amountEl = document.getElementById('gameOverAmount');
  
  if (won) {
    title.textContent = '🎉 You Won!';
    title.className = 'game-over-title win';
    amountEl.textContent = '+$' + amount.toFixed(2);
  } else {
    title.textContent = '💥 Boom!';
    title.className = 'game-over-title lose';
    amountEl.textContent = '-$' + config.betAmount.toFixed(2) + ' & -1 🔑';
    config.sessionProfit -= config.betAmount;
    
    // Update profit graph
    if (window.ProfitGraph) {
      window.ProfitGraph.addPoint(-config.betAmount);
    }
    
    // Record loss - deducts 1 key
    await window.CasinoDB.recordLoss('gems');
    updateKeysDisplay();
    
    updateProfitDisplay();
  }
  
  overlay.classList.add('show');
  
  // Reset buttons
  document.getElementById('betBtn').style.display = 'block';
  document.getElementById('cashoutBtn').classList.remove('show');
  document.getElementById('betAmount').disabled = false;
  document.getElementById('minesSelect').disabled = false;
}

// Reset for new game
function resetGame() {
  document.getElementById('gameOverOverlay').classList.remove('show');
  
  // Reset grid to empty state
  config.grid = [];
  config.revealedTiles = [];
  config.gemsFound = 0;
  config.currentMultiplier = 1;
  
  for (let i = 0; i < 25; i++) {
    config.grid.push({ type: 'gem', revealed: false });
  }
  
  renderGrid();
  updateMultiplierDisplay();
}

// Update displays
function updateBalanceDisplay() {
  const balance = window.CasinoAuth?.getBalance() ?? 0;
  document.getElementById('userBalance').textContent = '$' + balance.toFixed(2);
}

function updateKeysDisplay() {
  const keys = window.CasinoAuth?.getKeys() ?? 0;
  const keysEl = document.getElementById('userKeys');
  if (keysEl) {
    keysEl.innerHTML = '<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ' + keys;
  }
}

function updateProfitDisplay() {
  const profitEl = document.getElementById('sessionProfit');
  profitEl.textContent = (config.sessionProfit >= 0 ? '+' : '') + '$' + config.sessionProfit.toFixed(2);
  profitEl.className = 'stat-value ' + (config.sessionProfit >= 0 ? 'profit' : 'loss');
}

function adjustBet(mult) {
  const input = document.getElementById('betAmount');
  config.betAmount = Math.max(1, Math.min(1000, Math.round(config.betAmount * mult)));
  input.value = config.betAmount;
  updateMultiplierDisplay();
  updateBetButtonAmount();
}

function updateBetButtonAmount() {
  const betBtnAmount = document.getElementById('betBtnAmount');
  if (betBtnAmount) {
    betBtnAmount.textContent = config.betAmount;
  }
}

// Event listeners
document.getElementById('betBtn').addEventListener('click', startGame);
document.getElementById('cashoutBtn').addEventListener('click', cashout);
document.getElementById('playAgainBtn').addEventListener('click', resetGame);

document.getElementById('betAmount').addEventListener('change', (e) => {
  config.betAmount = Math.max(1, Math.min(1000, parseFloat(e.target.value) || 10));
  e.target.value = config.betAmount;
  updateMultiplierDisplay();
  updateBetButtonAmount();
});

document.getElementById('betAmount').addEventListener('keyup', (e) => {
  config.betAmount = Math.max(1, Math.min(1000, parseFloat(e.target.value) || 10));
  updateMultiplierDisplay();
  updateBetButtonAmount();
});

document.getElementById('minesSelect').addEventListener('change', (e) => {
  config.minesCount = parseInt(e.target.value);
  updateMultiplierDisplay();
});

// Initialize display
document.addEventListener('DOMContentLoaded', async () => {
  initGrid();
  
  // Wait for auth module to load
  await waitForAuth();
  
  // Initialize auth
  await window.CasinoAuth.init();
  
  // Setup auth UI handlers
  setupAuthUI();
  
  // Listen for auth state changes
  window.CasinoAuth.onAuthStateChange((user, userData) => {
    config.isSignedIn = !!user;
    updateAuthUI(user);
    updateBalanceDisplay();
    updateKeysDisplay();
  });
});

// Setup auth UI event handlers
function setupAuthUI() {
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  
  if (signInBtn) {
    signInBtn.addEventListener('click', async () => {
      await window.CasinoAuth.signIn();
    });
  }
  
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await window.CasinoAuth.signOut();
    });
  }
}

// Update auth UI based on user state
function updateAuthUI(user) {
  const signInBtn = document.getElementById('signInBtn');
  const userInfo = document.getElementById('userInfo');
  const userName = document.getElementById('userName');
  
  if (user) {
    if (signInBtn) signInBtn.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    if (userName) userName.textContent = user.displayName || user.email;
  } else {
    if (signInBtn) signInBtn.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';
  }
}

// Also run immediately in case DOM is already loaded
if (document.readyState !== 'loading') {
  initGrid();
}
