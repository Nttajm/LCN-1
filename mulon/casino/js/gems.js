// ========================================
// GEMS/MINES GAME - STAKE STYLE
// ========================================

// Game Configuration
const config = {
  betAmount: 10,
  minesCount: 3,
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
  
  const totalTiles = 35;
  const safeTiles = totalTiles - mines;
  
  // House edge of ~1%
  let multiplier = 0.99;
  
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
    const fmt = window.FormatUtils;
    const winAmount = config.betAmount * threeGemsMult;
    threeGemsWinEl.textContent = fmt ? fmt.formatBalance(winAmount) : '$' + winAmount.toFixed(2);
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
    const fmt = window.FormatUtils;
    cashoutBtn.textContent = `Cashout ${fmt ? fmt.formatBalance(parseFloat(potentialWin)) : '$' + potentialWin}`;
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
  
  // Disable bet adjustment buttons
  document.querySelectorAll('.bet-adj').forEach(btn => btn.disabled = true);
  
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
  await window.CasinoDB.recordWin(winAmount, config.betAmount);
  
  // Record game result in session
  if (window.CasinoDB && window.CasinoDB.recordGameResult) {
    await window.CasinoDB.recordGameResult('gems', config.betAmount, winAmount);
  }
  
  // Award xps for ANY win - streak grows exponentially
  try {
    const xpResult = await window.CasinoDB.awardXPs('gems', config.currentMultiplier, config.betAmount);
    console.log('Gems xp result:', xpResult);
    if (xpResult && xpResult.success && xpResult.xpsEarned > 0) {
      updateXPsDisplay();
      showXPGain(xpResult.xpsEarned, xpResult.streak, xpResult.streakMultiplier);
    }
  } catch (err) {
    console.error('Error awarding xps:', err);
  }
  
  config.sessionProfit += profit;
  
  // Update profit graph
  if (window.ProfitGraph) {
    window.ProfitGraph.addPoint(profit);
  }
  
  if (profit > config.bestWin) {
    config.bestWin = profit;
    const fmt = window.FormatUtils;
    document.getElementById('bestWin').textContent = fmt ? fmt.formatBalance(config.bestWin) : '$' + config.bestWin.toFixed(2);
  }
  
  // Share to live chat if found 5+ gems
  if (config.gemsFound >= 5 && window.shareCasinoWin) {
    window.shareCasinoWin('gems', config.currentMultiplier, profit);
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
  
  const fmt = window.FormatUtils;
  if (won) {
    title.textContent = '🎉 You Won!';
    title.className = 'game-over-title win';
    amountEl.textContent = fmt ? fmt.formatProfit(amount) : '+$' + amount.toFixed(2);
  } else {
    title.textContent = '💥 Boom!';
    title.className = 'game-over-title lose';
    amountEl.textContent = (fmt ? fmt.formatProfit(-config.betAmount) : '-$' + config.betAmount.toFixed(2)) + ' & -1 🔑';
    config.sessionProfit -= config.betAmount;
    
    // Update profit graph
    if (window.ProfitGraph) {
      window.ProfitGraph.addPoint(-config.betAmount);
    }
    
    // Record loss - deducts 1 key and resets streak
    await window.CasinoDB.recordLoss('gems');
    await window.CasinoDB.resetStreak();
    updateKeysDisplay();
    
    // Record game result in session
    if (window.CasinoDB && window.CasinoDB.recordGameResult) {
      await window.CasinoDB.recordGameResult('gems', config.betAmount, 0);
    }
    
    updateProfitDisplay();
  }
  
  overlay.classList.add('show');
  
  // Reset buttons
  document.getElementById('betBtn').style.display = 'block';
  document.getElementById('cashoutBtn').classList.remove('show');
  document.getElementById('betAmount').disabled = false;
  document.getElementById('minesSelect').disabled = false;
  
  // Re-enable bet adjustment buttons
  document.querySelectorAll('.bet-adj').forEach(btn => btn.disabled = false);
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

function updateXPsDisplay() {
  const xps = window.CasinoAuth?.getXPs() ?? 0;
  const xpsEl = document.getElementById('userXPs');
  if (xpsEl) {
    xpsEl.textContent = '⚡ ' + xps;
  }
}

function showXPGain(xps, streak, streakMult) {
  const popup = document.createElement('div');
  popup.className = 'xp-popup';
  
  // Position next to xps box
  const xpsBox = document.querySelector('.xps-box');
  if (xpsBox) {
    const rect = xpsBox.getBoundingClientRect();
    popup.style.top = (rect.bottom + 5) + 'px';
    popup.style.right = (window.innerWidth - rect.right) + 'px';
  }
  
  const streakText = streak > 1 && streakMult ? ` <span class="xp-streak">🔥${streak}</span>` : '';
  popup.innerHTML = `<span class="xp-amount">⚡+${xps}${streakText}</span>`;
  document.body.appendChild(popup);
  
  setTimeout(() => {
    popup.classList.add('hide');
    setTimeout(() => popup.remove(), 100);
  }, 700);
}

function updateProfitDisplay() {
  const profitEl = document.getElementById('sessionProfit');
  const fmt = window.FormatUtils;
  profitEl.textContent = fmt ? fmt.formatProfit(config.sessionProfit) : ((config.sessionProfit >= 0 ? '+' : '') + '$' + config.sessionProfit.toFixed(2));
  profitEl.className = 'stat-value ' + (config.sessionProfit >= 0 ? 'profit' : 'loss');
}

function adjustBet(mult) {
  if (config.isPlaying) return; // Don't allow changes while playing
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
    updateXPsDisplay();
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

// ========================================
// SESSION TRACKING - End session on page leave
// ========================================
window.addEventListener('beforeunload', () => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    // End the active gems session
    window.CasinoDB.endGameSession('user_left');
  }
});

// Session keepalive (update activity every 2 minutes)
setInterval(() => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    window.CasinoDB.updateSessionActivity();
  }
}, 2 * 60 * 1000);

// Also run immediately in case DOM is already loaded
if (document.readyState !== 'loading') {
  initGrid();
}
