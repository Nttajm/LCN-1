// ========================================
// COIN FLIP GAME - STAKE STYLE (MULTI-COIN)
// ========================================

// Payout multipliers based on matches (with ~1% house edge)
// For n coins, payouts are based on binomial probability
const PAYOUTS = {
  1: { 1: 1.98 },
  2: { 1: 1.45, 2: 3.92 },
  3: { 1: 1.10, 2: 2.18, 3: 7.84 },
  5: { 1: 0, 2: 1.15, 3: 2.30, 4: 6.20, 5: 31.00 },
  10: { 1: 0, 2: 0, 3: 0, 4: 0.95, 5: 1.50, 6: 2.50, 7: 6.00, 8: 20.00, 9: 80.00, 10: 950.00 }
};

// Game Configuration
const config = {
  betAmount: 10,
  coinCount: 1,
  selectedSide: 'heads',
  sessionProfit: 0,
  flipsPlayed: 0,
  bestWin: 0,
  winStreak: 0,
  currentStreak: 0,
  isFlipping: false,
  results: [],
  headsCount: 0,
  tailsCount: 0,
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

// Initialize the game
async function init() {
  await waitForAuth();
  
  setupEventListeners();
  
  if (window.ProfitGraph) {
    ProfitGraph.init();
  }
  
  updatePayoutTable();
  updateBetDisplay();
  updateStatsDisplay();
}

// Setup event listeners
function setupEventListeners() {
  // Bet amount input
  const betInput = document.getElementById('betAmount');
  betInput.addEventListener('input', () => {
    config.betAmount = Math.max(1, Math.min(10000, parseFloat(betInput.value) || 10));
    updateBetDisplay();
  });
  
  // Coin count selection
  const coinsBtns = document.querySelectorAll('.coins-btn');
  coinsBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (config.isFlipping) return;
      coinsBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      config.coinCount = parseInt(btn.dataset.coins);
      updatePayoutTable();
      updateBetDisplay();
      setupCoinsGrid();
    });
  });
  
  // Side selection
  const headsBtn = document.getElementById('headsBtn');
  const tailsBtn = document.getElementById('tailsBtn');
  
  headsBtn.addEventListener('click', () => selectSide('heads'));
  tailsBtn.addEventListener('click', () => selectSide('tails'));
  
  // Flip button
  const flipBtn = document.getElementById('flipBtn');
  flipBtn.addEventListener('click', flipCoins);
}

// Adjust bet amount
function adjustBet(multiplier) {
  const betInput = document.getElementById('betAmount');
  let newBet = config.betAmount * multiplier;
  newBet = Math.max(1, Math.min(10000, Math.round(newBet * 100) / 100));
  config.betAmount = newBet;
  betInput.value = newBet;
  updateBetDisplay();
}

// Make adjustBet available globally
window.adjustBet = adjustBet;

// Select side
function selectSide(side) {
  if (config.isFlipping) return;
  
  config.selectedSide = side;
  
  const headsBtn = document.getElementById('headsBtn');
  const tailsBtn = document.getElementById('tailsBtn');
  
  headsBtn.classList.toggle('active', side === 'heads');
  tailsBtn.classList.toggle('active', side === 'tails');
}

// Update payout table
function updatePayoutTable() {
  const tableEl = document.getElementById('payoutTable');
  const payouts = PAYOUTS[config.coinCount];
  
  let html = '';
  const keys = Object.keys(payouts).map(Number).sort((a, b) => a - b);
  
  for (const matches of keys) {
    const mult = payouts[matches];
    if (mult > 0) {
      html += `
        <div class="payout-row">
          <span class="payout-match">${matches}/${config.coinCount} match</span>
          <span class="payout-mult">${mult.toFixed(2)}x</span>
        </div>
      `;
    }
  }
  
  tableEl.innerHTML = html;
}

// Update bet display
function updateBetDisplay() {
  const betBtnAmount = document.getElementById('betBtnAmount');
  const potentialWin = document.getElementById('potentialWin');
  const potentialMult = document.getElementById('potentialMult');
  
  betBtnAmount.textContent = config.betAmount.toFixed(2);
  
  // Get max multiplier for current coin count
  const payouts = PAYOUTS[config.coinCount];
  const maxMult = Math.max(...Object.values(payouts));
  
  potentialWin.textContent = '$' + (config.betAmount * maxMult).toFixed(2);
  potentialMult.textContent = `${maxMult.toFixed(2)}x (${config.coinCount}/${config.coinCount} match)`;
}

// Update stats display
function updateStatsDisplay() {
  const profitEl = document.getElementById('sessionProfit');
  const flipsEl = document.getElementById('flipsPlayed');
  const bestWinEl = document.getElementById('bestWin');
  const streakEl = document.getElementById('winStreak');
  const headsCountEl = document.getElementById('headsCount');
  const tailsCountEl = document.getElementById('tailsCount');
  
  // Format profit
  const profitClass = config.sessionProfit >= 0 ? 'profit' : 'loss';
  const profitSign = config.sessionProfit >= 0 ? '+' : '';
  profitEl.textContent = profitSign + '$' + config.sessionProfit.toFixed(2);
  profitEl.className = 'stat-value ' + profitClass;
  
  flipsEl.textContent = config.flipsPlayed;
  bestWinEl.textContent = '$' + config.bestWin.toFixed(2);
  streakEl.textContent = config.winStreak;
  headsCountEl.textContent = 'H: ' + config.headsCount;
  tailsCountEl.textContent = 'T: ' + config.tailsCount;
}

// Setup coins grid based on coin count
function setupCoinsGrid() {
  const singleWrapper = document.getElementById('singleCoinWrapper');
  const coinsGrid = document.getElementById('coinsGrid');
  
  if (config.coinCount === 1) {
    singleWrapper.style.display = 'block';
    coinsGrid.style.display = 'none';
  } else {
    singleWrapper.style.display = 'none';
    coinsGrid.style.display = 'flex';
    coinsGrid.className = `coins-grid coins-${config.coinCount}`;
    
    // Generate coins
    let html = '';
    for (let i = 0; i < config.coinCount; i++) {
      html += `
        <div class="coin-wrapper" data-index="${i}">
          <div class="coin" id="coin-${i}">
            <div class="coin-face coin-heads">
              <div class="coin-inner">
                <span class="coin-emoji">👑</span>
                <span class="coin-label">H</span>
              </div>
            </div>
            <div class="coin-face coin-tails">
              <div class="coin-inner">
                <span class="coin-emoji">🦅</span>
                <span class="coin-label">T</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    coinsGrid.innerHTML = html;
  }
  
  // Hide result summary
  document.getElementById('resultSummary').style.display = 'none';
}

// Flip the coins
async function flipCoins() {
  if (config.isFlipping) return;
  
  // Check balance
  if (window.CasinoAuth && window.CasinoAuth.isSignedIn) {
    const balance = window.CasinoAuth.getBalance();
    if (balance < config.betAmount) {
      showResult('Insufficient balance!', false);
      return;
    }
  }
  
  config.isFlipping = true;
  config.flipsPlayed++;
  
  // Disable buttons
  const flipBtn = document.getElementById('flipBtn');
  const headsBtn = document.getElementById('headsBtn');
  const tailsBtn = document.getElementById('tailsBtn');
  const coinsBtns = document.querySelectorAll('.coins-btn');
  
  flipBtn.disabled = true;
  headsBtn.disabled = true;
  tailsBtn.disabled = true;
  coinsBtns.forEach(b => b.disabled = true);
  
  // Deduct bet
  if (window.CasinoAuth && window.CasinoAuth.isSignedIn) {
    await window.CasinoAuth.updateBalance(-config.betAmount);
  }
  
  // Determine results for each coin
  const coinResults = [];
  let headsHit = 0;
  let tailsHit = 0;
  
  for (let i = 0; i < config.coinCount; i++) {
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    coinResults.push(result);
    if (result === 'heads') headsHit++;
    else tailsHit++;
  }
  
  // Update total counts
  config.headsCount += headsHit;
  config.tailsCount += tailsHit;
  
  // Animate coins
  if (config.coinCount === 1) {
    // Single coin mode
    const coin = document.getElementById('coin');
    coin.classList.remove('flipping', 'flipping-to-tails', 'win-glow', 'lose-glow');
    coin.style.transform = 'rotateX(0deg)';
    void coin.offsetWidth;
    
    if (coinResults[0] === 'tails') {
      coin.classList.add('flipping-to-tails');
    } else {
      coin.classList.add('flipping');
    }
  } else {
    // Multi coin mode
    for (let i = 0; i < config.coinCount; i++) {
      const coin = document.getElementById(`coin-${i}`);
      if (coin) {
        coin.classList.remove('flipping', 'flipping-to-tails', 'win-glow', 'lose-glow');
        coin.style.transform = 'rotateX(0deg)';
        void coin.offsetWidth;
        
        if (coinResults[i] === 'tails') {
          coin.classList.add('flipping-to-tails');
        } else {
          coin.classList.add('flipping');
        }
      }
    }
  }
  
  // Wait for animation (longest delay + animation time)
  const animDuration = config.coinCount === 1 ? 2000 : 2600;
  await new Promise(resolve => setTimeout(resolve, animDuration));
  
  // Calculate winnings
  const matches = config.selectedSide === 'heads' ? headsHit : tailsHit;
  const payouts = PAYOUTS[config.coinCount];
  const multiplier = payouts[matches] || 0;
  const winAmount = config.betAmount * multiplier;
  
  let profit = 0;
  let isWin = multiplier > 0;
  let isPartialWin = isWin && matches < config.coinCount;
  
  // Show result summary for multi coins
  if (config.coinCount > 1) {
    const summaryEl = document.getElementById('resultSummary');
    const headsEl = document.getElementById('resultHeads');
    const tailsEl = document.getElementById('resultTails');
    const payoutEl = document.getElementById('resultPayout');
    
    summaryEl.style.display = 'flex';
    headsEl.textContent = '👑 ' + headsHit;
    tailsEl.textContent = '🦅 ' + tailsHit;
    
    if (isWin) {
      payoutEl.textContent = `${matches}/${config.coinCount} = ${multiplier.toFixed(2)}x → $${winAmount.toFixed(2)}`;
      payoutEl.className = 'result-payout ' + (isPartialWin ? 'partial' : 'win');
    } else {
      payoutEl.textContent = `${matches}/${config.coinCount} = No payout`;
      payoutEl.className = 'result-payout lose';
    }
  }
  
  // Apply glow to coins
  if (config.coinCount === 1) {
    const coin = document.getElementById('coin');
    coin.classList.add(isWin ? 'win-glow' : 'lose-glow');
  } else {
    for (let i = 0; i < config.coinCount; i++) {
      const coin = document.getElementById(`coin-${i}`);
      if (coin) {
        const coinMatches = coinResults[i] === config.selectedSide;
        coin.classList.add(coinMatches ? 'win-glow' : 'lose-glow');
      }
    }
  }
  
  if (isWin) {
    profit = winAmount - config.betAmount;
    config.sessionProfit += profit;
    config.currentStreak++;
    config.winStreak = Math.max(config.winStreak, config.currentStreak);
    config.bestWin = Math.max(config.bestWin, winAmount);
    
    // Add winnings
    if (window.CasinoAuth && window.CasinoAuth.isSignedIn) {
      await window.CasinoAuth.updateBalance(winAmount);
    }
    
    // Show win
    const winText = isPartialWin 
      ? `${matches}/${config.coinCount} - WON $${winAmount.toFixed(2)}!`
      : `PERFECT! WON $${winAmount.toFixed(2)}!`;
    showResult(winText, true);
    
    // Show win popup
    showWinPopup(winAmount);
    
    // Add XP
    if (window.CasinoAuth && window.CasinoAuth.addXP) {
      window.CasinoAuth.addXP(Math.round(profit / 2));
    }
  } else {
    profit = -config.betAmount;
    config.sessionProfit -= config.betAmount;
    config.currentStreak = 0;
    
    showResult(`${matches}/${config.coinCount} - You Lost!`, false);
  }
  
  // Add to profit graph
  if (window.ProfitGraph) {
    ProfitGraph.addPoint(profit);
  }
  
  // Add to history
  addToHistory(matches, config.coinCount, isWin);
  
  // Update stats
  updateStatsDisplay();
  
  // Re-enable buttons
  config.isFlipping = false;
  flipBtn.disabled = false;
  headsBtn.disabled = false;
  tailsBtn.disabled = false;
  coinsBtns.forEach(b => b.disabled = false);
}

// Show result banner
function showResult(text, isWin) {
  const banner = document.getElementById('resultBanner');
  const textEl = document.getElementById('resultText');
  
  banner.classList.remove('win', 'lose');
  banner.classList.add(isWin ? 'win' : 'lose');
  textEl.textContent = text;
}

// Show win popup
function showWinPopup(amount) {
  const gamePanel = document.querySelector('.game-panel');
  const popup = document.createElement('div');
  popup.className = 'win-popup';
  popup.textContent = '+$' + amount.toFixed(2);
  gamePanel.appendChild(popup);
  
  setTimeout(() => {
    popup.remove();
  }, 2000);
}

// Add to flip history
function addToHistory(matches, total, isWin) {
  const historyEl = document.getElementById('flipHistory');
  const item = document.createElement('div');
  item.className = `history-item ${isWin ? 'win' : 'lose'}`;
  
  if (total === 1) {
    item.classList.add(config.selectedSide);
    item.textContent = isWin ? '✓' : '✗';
  } else {
    item.textContent = `${matches}/${total}`;
    item.style.width = 'auto';
    item.style.padding = '6px 12px';
    item.style.borderRadius = '12px';
    item.style.fontSize = '0.85rem';
    item.style.background = isWin ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
  }
  
  // Keep max 10 items
  if (historyEl.children.length >= 10) {
    historyEl.removeChild(historyEl.firstChild);
  }
  
  historyEl.appendChild(item);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
