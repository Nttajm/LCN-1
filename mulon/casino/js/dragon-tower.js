// ========================================
// DRAGON TOWER GAME - STAKE STYLE
// ========================================

// Game Configuration
const config = {
  betAmount: 10,
  difficulty: 'medium',
  sessionProfit: 0,
  gamesPlayed: 0,
  bestWin: 0,
  isPlaying: false,
  currentLevel: 0,
  maxLevels: 9,
  currentMultiplier: 1,
  tower: [], // Array of rows, each row has tiles
  isSignedIn: false
};

// Difficulty settings: eggs = safe tiles, traps = dangerous tiles
const difficultySettings = {
  easy: { eggs: 3, traps: 1, tilesPerRow: 4, baseMultiplier: 1.31, info: '75% chance per row' },
  medium: { eggs: 2, traps: 2, tilesPerRow: 4, baseMultiplier: 1.94, info: '50% chance per row' },
  hard: { eggs: 1, traps: 3, tilesPerRow: 4, baseMultiplier: 3.88, info: '25% chance per row' },
  expert: { eggs: 1, traps: 2, tilesPerRow: 3, baseMultiplier: 2.94, info: '33% chance per row' },
  master: { eggs: 1, traps: 1, tilesPerRow: 2, baseMultiplier: 1.96, info: '50% chance per row' }
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

// Calculate multiplier for a given level
function calculateMultiplier(level) {
  if (level === 0) return 1;
  
  const settings = difficultySettings[config.difficulty];
  // Compound multiplier based on difficulty
  return Math.pow(settings.baseMultiplier, level);
}

// Initialize the tower
function initTower() {
  config.tower = [];
  config.currentLevel = 0;
  config.currentMultiplier = 1;
  
  const settings = difficultySettings[config.difficulty];
  
  // Create rows from bottom to top (index 0 = bottom)
  for (let row = 0; row < config.maxLevels; row++) {
    const tiles = [];
    
    // Create all tiles as eggs first
    for (let i = 0; i < settings.tilesPerRow; i++) {
      tiles.push({ type: 'egg', revealed: false });
    }
    
    // Randomly place traps
    let trapsPlaced = 0;
    while (trapsPlaced < settings.traps) {
      const randomIndex = Math.floor(Math.random() * settings.tilesPerRow);
      if (tiles[randomIndex].type !== 'trap') {
        tiles[randomIndex].type = 'trap';
        trapsPlaced++;
      }
    }
    
    config.tower.push({ tiles, multiplier: calculateMultiplier(row + 1) });
  }
  
  renderTower();
  updateDisplays();
}

// Render the tower
function renderTower() {
  const container = document.getElementById('towerContainer');
  container.innerHTML = '';
  
  // Render from top to bottom (reverse order for visual)
  for (let rowIndex = config.maxLevels - 1; rowIndex >= 0; rowIndex--) {
    const row = config.tower[rowIndex];
    const rowEl = document.createElement('div');
    rowEl.className = 'tower-row';
    rowEl.dataset.row = rowIndex;
    
    // Set row state
    if (rowIndex === config.currentLevel && config.isPlaying) {
      rowEl.classList.add('active');
    } else if (rowIndex < config.currentLevel) {
      rowEl.classList.add('completed');
    } else {
      rowEl.classList.add('future');
    }
    
    // Create tiles
    row.tiles.forEach((tile, tileIndex) => {
      const tileEl = document.createElement('div');
      tileEl.className = 'tower-tile';
      tileEl.dataset.row = rowIndex;
      tileEl.dataset.tile = tileIndex;
      
      if (!config.isPlaying || rowIndex !== config.currentLevel) {
        tileEl.classList.add('disabled');
      }
      
      if (tile.revealed) {
        tileEl.classList.add('revealed');
        tileEl.classList.add(tile.type);
        tileEl.innerHTML = `<span class="tile-content">${tile.type === 'egg' ? '🥚' : '💀'}</span>`;
      }
      
      tileEl.addEventListener('click', () => revealTile(rowIndex, tileIndex));
      rowEl.appendChild(tileEl);
    });
    
    // Add multiplier tag
    const multTag = document.createElement('div');
    multTag.className = 'row-multiplier';
    multTag.textContent = row.multiplier.toFixed(2) + 'x';
    rowEl.appendChild(multTag);
    
    container.appendChild(rowEl);
  }
}

// Reveal a tile
function revealTile(rowIndex, tileIndex) {
  if (!config.isPlaying) return;
  if (rowIndex !== config.currentLevel) return;
  
  const tile = config.tower[rowIndex].tiles[tileIndex];
  if (tile.revealed) return;
  
  tile.revealed = true;
  
  const tileEl = document.querySelector(`.tower-tile[data-row="${rowIndex}"][data-tile="${tileIndex}"]`);
  tileEl.classList.add('revealed');
  tileEl.classList.add(tile.type);
  tileEl.innerHTML = `<span class="tile-content">${tile.type === 'egg' ? '🥚' : '💀'}</span>`;
  
  if (tile.type === 'trap') {
    // Game over - hit a trap
    gameOver(false);
  } else {
    // Successfully climbed!
    config.currentLevel++;
    config.currentMultiplier = calculateMultiplier(config.currentLevel);
    
    updateDisplays();
    
    // Check if reached the top (all levels completed)
    if (config.currentLevel >= config.maxLevels) {
      cashout();
    } else {
      // Update tower to show new active row
      renderTower();
      updateCashoutButton();
    }
  }
}

// Update all displays
function updateDisplays() {
  // Current level
  document.getElementById('currentLevel').textContent = `${config.currentLevel} / ${config.maxLevels}`;
  
  // Current multiplier
  document.getElementById('currentMultiplier').textContent = config.currentMultiplier.toFixed(2) + 'x';
  
  // Potential win
  const potentialWin = (config.betAmount * config.currentMultiplier).toFixed(2);
  document.getElementById('potentialWin').innerHTML = `Win: <span>$${potentialWin}</span>`;
  
  // Next level preview
  const nextMult = calculateMultiplier(config.currentLevel + 1);
  document.getElementById('nextMultiplier').textContent = nextMult.toFixed(2) + 'x';
  document.getElementById('nextWin').textContent = '$' + (config.betAmount * nextMult).toFixed(2);
  
  // Difficulty info
  const settings = difficultySettings[config.difficulty];
  document.getElementById('difficultyInfo').textContent = settings.info;
  
  updateCashoutButton();
}

// Update cashout button
function updateCashoutButton() {
  const cashoutBtn = document.getElementById('cashoutBtn');
  const potentialWin = (config.betAmount * config.currentMultiplier).toFixed(2);
  
  if (config.currentLevel < 1) {
    cashoutBtn.classList.add('disabled');
    cashoutBtn.textContent = 'Climb 1 level first';
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
  
  // Check if user has keys
  const currentKeys = window.CasinoAuth.getKeys();
  if (currentKeys <= 0) {
    alert('You need keys to play! Come back tomorrow for free keys.');
    return;
  }
  
  const currentBalance = window.CasinoAuth.getBalance();
  if (currentBalance < config.betAmount) {
    alert('Insufficient balance!');
    return;
  }
  
  // Place bet
  const result = await window.CasinoDB.placeBet(config.betAmount, 'dragon-tower');
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
  document.getElementById('difficultySelect').disabled = true;
  
  // Hide game over overlay
  document.getElementById('gameOverOverlay').classList.remove('show');
  
  initTower();
}

// Cashout
async function cashout() {
  if (!config.isPlaying) return;
  if (config.currentLevel < 1) return;
  
  // Calculate winnings
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
  
  // Reveal all traps in remaining rows
  config.tower.forEach((row, rowIndex) => {
    row.tiles.forEach((tile, tileIndex) => {
      if (tile.type === 'trap' && !tile.revealed) {
        const tileEl = document.querySelector(`.tower-tile[data-row="${rowIndex}"][data-tile="${tileIndex}"]`);
        if (tileEl) {
          tileEl.classList.add('revealed', 'trap-show');
          tileEl.innerHTML = `<span class="tile-content">💀</span>`;
        }
      }
    });
  });
  
  // Disable all tiles
  document.querySelectorAll('.tower-tile').forEach(tile => {
    tile.classList.add('disabled');
  });
  
  // Show game over overlay
  const overlay = document.getElementById('gameOverOverlay');
  const title = document.getElementById('gameOverTitle');
  const amountEl = document.getElementById('gameOverAmount');
  
  if (won) {
    title.textContent = '🐉 Victory!';
    title.className = 'game-over-title win';
    amountEl.textContent = '+$' + amount.toFixed(2);
    amountEl.style.color = '#22c55e';
  } else {
    title.textContent = '💀 Fallen!';
    title.className = 'game-over-title lose';
    amountEl.textContent = '-$' + config.betAmount.toFixed(2) + ' & -1 🔑';
    amountEl.style.color = '#ef4444';
    config.sessionProfit -= config.betAmount;
    
    // Update profit graph
    if (window.ProfitGraph) {
      window.ProfitGraph.addPoint(-config.betAmount);
    }
    
    // Record loss - deducts 1 key
    await window.CasinoDB.recordLoss('dragon-tower');
    updateKeysDisplay();
    
    updateProfitDisplay();
  }
  
  overlay.classList.add('show');
  
  // Reset buttons
  document.getElementById('betBtn').style.display = 'block';
  document.getElementById('cashoutBtn').classList.remove('show');
  document.getElementById('betAmount').disabled = false;
  document.getElementById('difficultySelect').disabled = false;
}

// Reset for new game
function resetGame() {
  document.getElementById('gameOverOverlay').classList.remove('show');
  
  // Reset tower
  config.tower = [];
  config.currentLevel = 0;
  config.currentMultiplier = 1;
  
  initTower();
  updateDisplays();
}

// Update displays
function updateBalanceDisplay() {
  const balance = window.CasinoAuth?.getBalance() ?? 0;
  const fmt = window.FormatUtils;
  document.getElementById('userBalance').textContent = fmt ? fmt.formatBalance(balance) : '$' + balance.toFixed(2);
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
  const fmt = window.FormatUtils;
  profitEl.textContent = fmt ? fmt.formatProfit(config.sessionProfit) : ((config.sessionProfit >= 0 ? '+' : '') + '$' + config.sessionProfit.toFixed(2));
  profitEl.className = 'stat-value ' + (config.sessionProfit >= 0 ? 'profit' : 'loss');
}

function adjustBet(mult) {
  const input = document.getElementById('betAmount');
  config.betAmount = Math.max(1, Math.min(1000, Math.round(config.betAmount * mult)));
  input.value = config.betAmount;
  updateDisplays();
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
document.getElementById('cashoutBtn').addEventListener('click', () => {
  if (!document.getElementById('cashoutBtn').classList.contains('disabled')) {
    cashout();
  }
});
document.getElementById('playAgainBtn').addEventListener('click', resetGame);

document.getElementById('betAmount').addEventListener('change', (e) => {
  config.betAmount = Math.max(1, Math.min(1000, parseFloat(e.target.value) || 10));
  e.target.value = config.betAmount;
  updateDisplays();
  updateBetButtonAmount();
});

document.getElementById('betAmount').addEventListener('keyup', (e) => {
  config.betAmount = Math.max(1, Math.min(1000, parseFloat(e.target.value) || 10));
  updateDisplays();
  updateBetButtonAmount();
});

document.getElementById('difficultySelect').addEventListener('change', (e) => {
  config.difficulty = e.target.value;
  updateDisplays();
  
  // Re-init tower preview if not playing
  if (!config.isPlaying) {
    initTower();
  }
});

// Initialize display
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize tower preview
  initTower();
  
  // Wait for auth module to load
  await waitForAuth();
  
  // Initialize auth with maintenance check
  const hasAccess = await window.CasinoAuth.initWithMaintenanceCheck();
  if (!hasAccess) return; // Stop if redirecting to maintenance
  
  // Setup auth UI handlers
  setupAuthUI();
  
  // Listen for auth state changes
  window.CasinoAuth.onAuthStateChange((user, userData) => {
    config.isSignedIn = !!user;
    updateAuthUI(user);
    updateBalanceDisplay();
    updateKeysDisplay();
  });
  
  // Initialize profit graph
  if (window.ProfitGraph) {
    window.ProfitGraph.init();
  }
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
  initTower();
}
