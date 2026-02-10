// ========================================
// DICE GAME - Stake-style mechanics
// ========================================

// Game State
const gameState = {
  rollOver: 37.00,
  rollUnder: false, // false = roll over, true = roll under
  betAmount: 0,
  isRolling: false,
  isAutoMode: false,
  autoRunning: false,
  autoBetsRemaining: 0,
  autoInfinite: false,
  baseBet: 0,
  sessionProfit: 0,
  gamesPlayed: 0,
  bestWin: 0,
  rollsHistory: [],
  isSignedIn: false,
  
  // Auto mode settings
  onWinReset: true,
  onWinIncreasePercent: 0,
  onLossReset: true,
  onLossIncreasePercent: 0,
  stopProfit: 0,
  stopLoss: 0
};

// House edge (1% edge = 99% payout)
const HOUSE_EDGE = 0.99;

// DOM Elements
let elements = {};

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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await waitForAuth();
  
  // Initialize auth with maintenance check
  const hasAccess = await window.CasinoAuth.initWithMaintenanceCheck();
  if (!hasAccess) return; // Stop if redirecting to maintenance
  
  initDiceGame();
});

function initDiceGame() {
  // Cache DOM elements
  elements = {
    // Slider elements
    sliderTrack: document.getElementById('sliderTrack'),
    sliderThumb: document.getElementById('sliderThumb'),
    sliderFillRed: document.getElementById('sliderFillRed'),
    sliderFillGreen: document.getElementById('sliderFillGreen'),
    
    // Input elements
    betAmount: document.getElementById('betAmount'),
    netGain: document.getElementById('netGain'),
    winningsInput: document.getElementById('winningsInput'),
    rollOverInput: document.getElementById('rollOverInput'),
    winChanceInput: document.getElementById('winChanceInput'),
    
    // Buttons
    playBtn: document.getElementById('playBtn'),
    halfBtn: document.getElementById('halfBtn'),
    doubleBtn: document.getElementById('doubleBtn'),
    balanceBtn: document.getElementById('balanceBtn'),
    rollOverSwap: document.getElementById('rollOverSwap'),
    
    // Tabs
    manualTab: document.getElementById('manualTab'),
    autoTab: document.getElementById('autoTab'),
    autoPanel: document.getElementById('autoPanel'),
    
    // Result display
    diceResult: document.getElementById('diceResult'),
    resultNumber: document.getElementById('resultNumber'),
    rollsHistory: document.getElementById('rollsHistory'),
    
    // Stats
    sessionProfit: document.getElementById('sessionProfit'),
    gamesPlayed: document.getElementById('gamesPlayed'),
    bestWin: document.getElementById('bestWin'),
    
    // Auto mode
    autoBets: document.getElementById('autoBets'),
    infinityBtn: document.getElementById('infinityBtn'),
    onWinReset: document.getElementById('onWinReset'),
    onWinIncrease: document.getElementById('onWinIncrease'),
    onWinPercent: document.getElementById('onWinPercent'),
    onLossReset: document.getElementById('onLossReset'),
    onLossIncrease: document.getElementById('onLossIncrease'),
    onLossPercent: document.getElementById('onLossPercent'),
    stopProfit: document.getElementById('stopProfit'),
    stopLoss: document.getElementById('stopLoss')
  };

  // Initialize slider
  initSlider();
  
  // Initialize event listeners
  initEventListeners();
  
  // Initial calculation
  updateFromRollOver(gameState.rollOver);
  
  // Initialize casino auth integration
  initCasinoAuth();
  
  // Initialize profit graph
  if (window.ProfitGraph) {
    window.ProfitGraph.init();
  }
  
  console.log('Dice game initialized!');
}

// Initialize casino auth and balance
async function initCasinoAuth() {
  if (window.CasinoAuth) {
    // Check if user is signed in
    gameState.isSignedIn = window.CasinoAuth.isSignedIn();
    
    // Update balance display
    updateBalanceDisplay();
    updateUIState();
    
    // Setup auth UI handlers
    setupAuthUI();
    
    // Listen for auth state changes
    window.CasinoAuth.onAuthStateChange((user, userData) => {
      gameState.isSignedIn = !!user;
      updateBalanceDisplay();
      updateUIState();
    });
  }
}

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

function updateBalanceDisplay() {
  const balanceEl = document.getElementById('userBalance');
  const keysEl = document.getElementById('userKeys');
  const xpsEl = document.getElementById('userXPs');
  
  if (window.CasinoAuth) {
    const balance = window.CasinoAuth.getBalance();
    const keys = window.CasinoAuth.getKeys();
    const xps = window.CasinoAuth.getXPs ? window.CasinoAuth.getXPs() : 0;
    
    const fmt = window.FormatUtils;
    if (balanceEl) balanceEl.textContent = fmt ? fmt.formatBalance(balance) : '$' + balance.toFixed(2);
    if (keysEl) keysEl.innerHTML = '<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ' + keys;
    if (xpsEl) xpsEl.textContent = '⚡ ' + xps;
  }
}

function updateUIState() {
  // Update sign in UI if needed
  const signInBtn = document.getElementById('signInBtn');
  const userInfo = document.getElementById('userInfo');
  const userName = document.getElementById('userName');
  
  if (gameState.isSignedIn && window.CasinoAuth.currentUser) {
    if (signInBtn) signInBtn.style.display = 'none';
    if (userInfo) {
      userInfo.style.display = 'flex';
      if (userName) userName.textContent = window.CasinoAuth.currentUser.displayName || 'User';
    }
  } else {
    if (signInBtn) signInBtn.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';
  }
}

// ========================================
// SLIDER FUNCTIONALITY
// ========================================

function initSlider() {
  const track = elements.sliderTrack;
  const thumb = elements.sliderThumb;
  
  let isDragging = false;
  
  // Update slider position based on rollOver value
  updateSliderPosition(gameState.rollOver);
  
  // Mouse events
  thumb.addEventListener('mousedown', (e) => {
    isDragging = true;
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging || gameState.isRolling) return;
    updateSliderFromMouse(e);
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  // Touch events
  thumb.addEventListener('touchstart', (e) => {
    isDragging = true;
    e.preventDefault();
  });
  
  document.addEventListener('touchmove', (e) => {
    if (!isDragging || gameState.isRolling) return;
    updateSliderFromTouch(e);
  });
  
  document.addEventListener('touchend', () => {
    isDragging = false;
  });
  
  // Click on track to set position
  track.addEventListener('click', (e) => {
    if (gameState.isRolling) return;
    updateSliderFromMouse(e);
  });
}

function updateSliderFromMouse(e) {
  const track = elements.sliderTrack;
  const rect = track.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let percent = (x / rect.width) * 100;
  
  // Clamp between 1 and 98 (can't have 0% or 100% win chance)
  percent = Math.max(1, Math.min(98, percent));
  
  // Slider position always follows cursor, rollOver value is the position
  updateFromRollOver(parseFloat(percent.toFixed(2)));
}

function updateSliderFromTouch(e) {
  const touch = e.touches[0];
  const track = elements.sliderTrack;
  const rect = track.getBoundingClientRect();
  let x = touch.clientX - rect.left;
  let percent = (x / rect.width) * 100;
  
  // Clamp between 1 and 98
  percent = Math.max(1, Math.min(98, percent));
  
  // Slider position always follows cursor, rollOver value is the position
  updateFromRollOver(parseFloat(percent.toFixed(2)));
}

function updateSliderPosition(rollOver) {
  const thumb = elements.sliderThumb;
  const fillRed = elements.sliderFillRed;
  const fillGreen = elements.sliderFillGreen;
  
  // Thumb always at rollOver position
  thumb.style.left = rollOver + '%';
  
  // Colors swap based on mode
  if (gameState.rollUnder) {
    // Roll Under: green on left (win zone), red on right (lose zone)
    fillGreen.style.width = rollOver + '%';
    fillRed.style.width = (100 - rollOver) + '%';
  } else {
    // Roll Over: red on left (lose zone), green on right (win zone)
    fillRed.style.width = rollOver + '%';
    fillGreen.style.width = (100 - rollOver) + '%';
  }
}

// ========================================
// GAME CALCULATIONS (Stake Formula)
// ========================================

function calculateWinChance(rollOver, isRollUnder) {
  if (isRollUnder) {
    return rollOver; // Win chance = the target value for roll under
  } else {
    return 100 - rollOver; // Win chance = remaining percentage for roll over
  }
}

function calculateMultiplier(winChance) {
  // Stake formula: multiplier = (100 / winChance) * houseEdge
  // House keeps ~1%, so payout is 99%
  return (100 / winChance) * HOUSE_EDGE;
}

function updateFromRollOver(rollOver) {
  gameState.rollOver = rollOver;
  
  const winChance = calculateWinChance(rollOver, gameState.rollUnder);
  const multiplier = calculateMultiplier(winChance);
  
  // Update inputs
  elements.rollOverInput.value = rollOver.toFixed(2);
  elements.winChanceInput.value = winChance.toFixed(4);
  elements.winningsInput.value = multiplier.toFixed(4);
  
  // Update slider position
  updateSliderPosition(rollOver);
  
  // Update net gain
  updateNetGain();
}

function updateFromWinChance(winChance) {
  // Clamp between 2 and 98
  winChance = Math.max(2, Math.min(98, winChance));
  
  let rollOver;
  if (gameState.rollUnder) {
    rollOver = winChance;
  } else {
    rollOver = 100 - winChance;
  }
  
  updateFromRollOver(rollOver);
}

function updateFromMultiplier(multiplier) {
  // Reverse the formula: winChance = (100 * houseEdge) / multiplier
  const winChance = (100 * HOUSE_EDGE) / multiplier;
  updateFromWinChance(winChance);
}

function updateNetGain() {
  const bet = parseFloat(elements.betAmount.value) || 0;
  const winChance = calculateWinChance(gameState.rollOver, gameState.rollUnder);
  const multiplier = calculateMultiplier(winChance);
  
  const netGain = bet * (multiplier - 1);
  elements.netGain.value = netGain.toFixed(2);
  
  // Update profit on win display
  const profitOnWinEl = document.getElementById('profitOnWin');
  if (profitOnWinEl) {
    const totalWin = bet * multiplier;
    const fmt = window.FormatUtils;
    profitOnWinEl.textContent = fmt ? fmt.formatBalance(totalWin) : '$' + totalWin.toFixed(2);
  }
}

// ========================================
// EVENT LISTENERS
// ========================================

function initEventListeners() {
  // Bet amount changes
  elements.betAmount.addEventListener('input', () => {
    gameState.betAmount = parseFloat(elements.betAmount.value) || 0;
    updateNetGain();
  });
  
  // Half button
  elements.halfBtn.addEventListener('click', () => {
    const current = parseFloat(elements.betAmount.value) || 0;
    elements.betAmount.value = (current / 2).toFixed(2);
    gameState.betAmount = current / 2;
    updateNetGain();
  });
  
  // Double button
  elements.doubleBtn.addEventListener('click', () => {
    const current = parseFloat(elements.betAmount.value) || 0;
    const balance = window.CasinoAuth ? window.CasinoAuth.getBalance() : 500.00;
    const newAmount = Math.min(current * 2, balance);
    elements.betAmount.value = newAmount.toFixed(2);
    gameState.betAmount = newAmount;
    updateNetGain();
  });
  
  // Balance button (use full balance)
  elements.balanceBtn.addEventListener('click', () => {
    const balance = window.CasinoAuth ? window.CasinoAuth.getBalance() : 500.00;
    elements.betAmount.value = balance.toFixed(2);
    gameState.betAmount = balance;
    updateNetGain();
  });
  
  // Roll Over input
  elements.rollOverInput.addEventListener('change', () => {
    let value = parseFloat(elements.rollOverInput.value) || 50;
    value = Math.max(1, Math.min(98, value));
    updateFromRollOver(value);
  });
  
  elements.rollOverInput.addEventListener('input', () => {
    let value = parseFloat(elements.rollOverInput.value) || 50;
    value = Math.max(1, Math.min(98, value));
    updateFromRollOver(value);
  });
  
  // Win Chance input
  elements.winChanceInput.addEventListener('change', () => {
    let value = parseFloat(elements.winChanceInput.value) || 50;
    updateFromWinChance(value);
  });
  
  elements.winChanceInput.addEventListener('input', () => {
    let value = parseFloat(elements.winChanceInput.value) || 50;
    updateFromWinChance(value);
  });
  
  // Multiplier input
  elements.winningsInput.addEventListener('change', () => {
    let value = parseFloat(elements.winningsInput.value) || 2;
    value = Math.max(1.01, Math.min(99, value));
    updateFromMultiplier(value);
  });
  
  elements.winningsInput.addEventListener('input', () => {
    let value = parseFloat(elements.winningsInput.value) || 2;
    value = Math.max(1.01, Math.min(99, value));
    updateFromMultiplier(value);
  });
  
  // Roll Over/Under swap
  elements.rollOverSwap.addEventListener('click', () => {
    gameState.rollUnder = !gameState.rollUnder;
    
    // Update label
    const label = elements.rollOverSwap.closest('.dice-stat-box').querySelector('.dice-stat-label');
    label.textContent = gameState.rollUnder ? 'Roll Under' : 'Roll Over';
    
    // Toggle track class for color swap
    elements.sliderTrack.classList.toggle('roll-under', gameState.rollUnder);
    
    // Recalculate
    updateFromRollOver(gameState.rollOver);
  });
  
  // Play button
  elements.playBtn.addEventListener('click', () => {
    if (gameState.isAutoMode && gameState.autoRunning) {
      stopAutoPlay();
    } else if (gameState.isAutoMode) {
      startAutoPlay();
    } else {
      playRound();
    }
  });
  
  // Tab switching
  elements.manualTab.addEventListener('click', () => {
    gameState.isAutoMode = false;
    elements.manualTab.classList.add('active');
    elements.autoTab.classList.remove('active');
    elements.autoPanel.style.display = 'none';
    elements.playBtn.textContent = 'Play';
    elements.playBtn.classList.remove('stop');
  });
  
  elements.autoTab.addEventListener('click', () => {
    gameState.isAutoMode = true;
    elements.autoTab.classList.add('active');
    elements.manualTab.classList.remove('active');
    elements.autoPanel.style.display = 'block';
    elements.playBtn.textContent = 'Start Autoplay';
  });
  
  // Auto mode controls
  initAutoModeListeners();
}

function initAutoModeListeners() {
  // Infinity button
  elements.infinityBtn.addEventListener('click', () => {
    gameState.autoInfinite = !gameState.autoInfinite;
    elements.infinityBtn.classList.toggle('active', gameState.autoInfinite);
    elements.autoBets.disabled = gameState.autoInfinite;
    if (gameState.autoInfinite) {
      elements.autoBets.value = '∞';
    } else {
      elements.autoBets.value = '10';
    }
  });
  
  // On Win buttons
  elements.onWinReset.addEventListener('click', () => {
    gameState.onWinReset = true;
    elements.onWinReset.classList.add('active');
    elements.onWinIncrease.classList.remove('active');
  });
  
  elements.onWinIncrease.addEventListener('click', () => {
    gameState.onWinReset = false;
    elements.onWinIncrease.classList.add('active');
    elements.onWinReset.classList.remove('active');
  });
  
  elements.onWinPercent.addEventListener('change', () => {
    gameState.onWinIncreasePercent = parseFloat(elements.onWinPercent.value) || 0;
  });
  
  // On Loss buttons
  elements.onLossReset.addEventListener('click', () => {
    gameState.onLossReset = true;
    elements.onLossReset.classList.add('active');
    elements.onLossIncrease.classList.remove('active');
  });
  
  elements.onLossIncrease.addEventListener('click', () => {
    gameState.onLossReset = false;
    elements.onLossIncrease.classList.add('active');
    elements.onLossReset.classList.remove('active');
  });
  
  elements.onLossPercent.addEventListener('change', () => {
    gameState.onLossIncreasePercent = parseFloat(elements.onLossPercent.value) || 0;
  });
  
  // Stop conditions
  elements.stopProfit.addEventListener('change', () => {
    gameState.stopProfit = parseFloat(elements.stopProfit.value) || 0;
  });
  
  elements.stopLoss.addEventListener('change', () => {
    gameState.stopLoss = parseFloat(elements.stopLoss.value) || 0;
  });
}

// ========================================
// GAME LOGIC
// ========================================

async function playRound() {
  const bet = parseFloat(elements.betAmount.value) || 0;
  
  // Validate bet
  if (bet <= 0) {
    showError('Please enter a bet amount');
    return;
  }
  
  // Check if signed in
  if (!gameState.isSignedIn) {
    showError('Please sign in to play!');
    return;
  }
  
  // Check balance
  const currentBalance = window.CasinoAuth.getBalance();
  if (bet > currentBalance) {
    showError('Insufficient balance');
    return;
  }
  
  // Disable play button during roll
  gameState.isRolling = true;
  elements.playBtn.disabled = true;
  elements.playBtn.classList.add('rolling');
  elements.playBtn.textContent = 'Rolling...';
  
  // Place bet using CasinoDB
  const betResult = await window.CasinoDB.placeBet(bet, 'dice');
  if (!betResult.success) {
    showError(betResult.error || 'Failed to place bet');
    gameState.isRolling = false;
    elements.playBtn.disabled = false;
    elements.playBtn.classList.remove('rolling');
    elements.playBtn.textContent = gameState.isAutoMode ? 'Start Autoplay' : 'Play';
    return;
  }
  
  // Update balance display immediately
  updateBalanceDisplay();
  
  // Rolling animation
  elements.diceResult.classList.add('rolling');
  await animateRoll();
  
  // Generate result (0.00 to 99.99)
  let result = parseFloat((Math.random() * 100).toFixed(2));
  
  // House advantage: if roll over is below 9 (high win chance), nudge result toward loss
  if (!gameState.rollUnder && gameState.rollOver < 9) {
    // 30% chance to "adjust" the result to land in the red zone
    if (Math.random() < 0.21 && result > gameState.rollOver) {
      // Push result into losing zone (0 to rollOver)
      result = parseFloat((Math.random() * gameState.rollOver).toFixed(2));
    }
  } else if (gameState.rollUnder && gameState.rollOver > 91) {
    // Same for roll under with target above 91
    if (Math.random() < 0.21 && result < gameState.rollOver) {
      // Push result into losing zone (rollOver to 100)
      result = parseFloat((gameState.rollOver + Math.random() * (100 - gameState.rollOver)).toFixed(2));
    }
  }
  
  // Determine win/loss
  let isWin;
  if (gameState.rollUnder) {
    isWin = result < gameState.rollOver;
  } else {
    isWin = result > gameState.rollOver;
  }
  
  // Calculate payout
  const winChance = calculateWinChance(gameState.rollOver, gameState.rollUnder);
  const multiplier = calculateMultiplier(winChance);
  const payout = isWin ? bet * multiplier : 0;
  const profit = payout - bet;
  
  // Update balance if won
  if (isWin && payout > 0) {
    await window.CasinoDB.updateBalance(payout);
    updateBalanceDisplay();
  }
  
  // Update stats
  gameState.sessionProfit += profit;
  gameState.gamesPlayed++;
  if (profit > gameState.bestWin) {
    gameState.bestWin = profit;
  }
  updateStats();
  
  // Show result
  showResult(result, isWin);
  
  // Add to history
  addToHistory(result, isWin);
  
  // Update profit graph
  if (window.ProfitGraph) {
    window.ProfitGraph.addPoint(profit);
  }
  
  // Add XP for playing
  if (isWin && window.CasinoDB.addXP) {
    await window.CasinoDB.addXP(Math.floor(bet / 10) + 1);
  }
  
  // Re-enable play button
  gameState.isRolling = false;
  elements.playBtn.disabled = false;
  elements.playBtn.classList.remove('rolling');
  elements.playBtn.textContent = gameState.isAutoMode ? 
    (gameState.autoRunning ? 'Stop Autoplay' : 'Start Autoplay') : 'Play';
  
  return { isWin, profit };
}

async function animateRoll() {
  const duration = 500; // ms
  const interval = 50;
  const iterations = duration / interval;
  
  for (let i = 0; i < iterations; i++) {
    const randomNum = (Math.random() * 100).toFixed(2);
    elements.resultNumber.textContent = randomNum;
    await sleep(interval);
  }
  
  elements.diceResult.classList.remove('rolling');
}

function showResult(result, isWin) {
  elements.resultNumber.textContent = result.toFixed(2);
  elements.diceResult.classList.remove('win', 'lose');
  elements.diceResult.classList.add(isWin ? 'win' : 'lose');
  
  // Show result marker on slider
  showResultMarker(result, isWin);
}

function showResultMarker(result, isWin) {
  // Remove existing marker
  const existingMarker = document.querySelector('.result-marker');
  if (existingMarker) existingMarker.remove();
  
  // Create marker
  const marker = document.createElement('div');
  marker.className = `result-marker ${isWin ? 'win' : 'lose'}`;
  marker.setAttribute('data-value', result.toFixed(2));
  marker.style.left = result + '%';
  marker.style.color = isWin ? '#22c55e' : '#ef4444';
  
  elements.sliderTrack.appendChild(marker);
  
  // Animate in
  setTimeout(() => marker.classList.add('show'), 50);
  
  // Remove after 3 seconds
  setTimeout(() => {
    marker.classList.remove('show');
    setTimeout(() => marker.remove(), 300);
  }, 3000);
}

function addToHistory(result, isWin) {
  gameState.rollsHistory.unshift({ result, isWin });
  
  // Keep only last 20 rolls
  if (gameState.rollsHistory.length > 20) {
    gameState.rollsHistory.pop();
  }
  
  // Render history
  renderHistory();
}

function renderHistory() {
  elements.rollsHistory.innerHTML = gameState.rollsHistory.map(roll => 
    `<div class="roll-chip ${roll.isWin ? 'win' : 'lose'}">${roll.result.toFixed(2)}</div>`
  ).join('');
}

function updateStats() {
  const fmt = window.FormatUtils;
  elements.sessionProfit.textContent = fmt ? fmt.formatProfit(gameState.sessionProfit) : 
    (gameState.sessionProfit >= 0 ? '+$' : '-$') + Math.abs(gameState.sessionProfit).toFixed(2);
  elements.sessionProfit.className = 'stat-value ' + (gameState.sessionProfit >= 0 ? 'profit' : 'loss');
  
  elements.gamesPlayed.textContent = gameState.gamesPlayed;
  elements.bestWin.textContent = fmt ? fmt.formatBalance(gameState.bestWin) : '$' + gameState.bestWin.toFixed(2);
}

// ========================================
// AUTO PLAY
// ========================================

async function startAutoPlay() {
  gameState.autoRunning = true;
  gameState.baseBet = parseFloat(elements.betAmount.value) || 0;
  gameState.autoBetsRemaining = gameState.autoInfinite ? Infinity : parseInt(elements.autoBets.value) || 10;
  
  elements.playBtn.textContent = 'Stop Autoplay';
  elements.playBtn.classList.add('stop');
  
  let autoProfit = 0;
  
  while (gameState.autoRunning && gameState.autoBetsRemaining > 0) {
    const result = await playRound();
    
    if (!result) {
      // Error occurred (e.g., insufficient balance)
      break;
    }
    
    autoProfit += result.profit;
    gameState.autoBetsRemaining--;
    
    // Adjust bet based on win/loss
    if (result.isWin) {
      if (gameState.onWinReset) {
        elements.betAmount.value = gameState.baseBet.toFixed(2);
      } else {
        const increase = 1 + (gameState.onWinIncreasePercent / 100);
        const newBet = parseFloat(elements.betAmount.value) * increase;
        elements.betAmount.value = newBet.toFixed(2);
      }
    } else {
      if (gameState.onLossReset) {
        elements.betAmount.value = gameState.baseBet.toFixed(2);
      } else {
        const increase = 1 + (gameState.onLossIncreasePercent / 100);
        const newBet = parseFloat(elements.betAmount.value) * increase;
        elements.betAmount.value = newBet.toFixed(2);
      }
    }
    
    // Check stop conditions
    if (gameState.stopProfit > 0 && autoProfit >= gameState.stopProfit) {
      console.log('Stopped: Profit target reached');
      break;
    }
    
    if (gameState.stopLoss > 0 && autoProfit <= -gameState.stopLoss) {
      console.log('Stopped: Loss limit reached');
      break;
    }
    
    // Small delay between rounds
    await sleep(300);
  }
  
  stopAutoPlay();
}

function stopAutoPlay() {
  gameState.autoRunning = false;
  elements.playBtn.textContent = 'Start Autoplay';
  elements.playBtn.classList.remove('stop');
}

// ========================================
// UTILITIES
// ========================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showError(message) {
  // Could implement a toast notification here
  console.error(message);
  alert(message);
}

// ========================================
// KEYBOARD SHORTCUTS
// ========================================

document.addEventListener('keydown', (e) => {
  // Space to play (when not focused on input)
  if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    elements.playBtn.click();
  }
  
  // H to half bet
  if (e.code === 'KeyH' && document.activeElement.tagName !== 'INPUT') {
    elements.halfBtn.click();
  }
  
  // D to double bet
  if (e.code === 'KeyD' && document.activeElement.tagName !== 'INPUT') {
    elements.doubleBtn.click();
  }
});

// ========================================
// SESSION TRACKING - End session on page leave
// ========================================
window.addEventListener('beforeunload', () => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    // End the active dice session
    window.CasinoDB.endGameSession('user_left');
  }
});

// Session keepalive (update activity every 2 minutes)
setInterval(() => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    window.CasinoDB.updateSessionActivity();
  }
}, 2 * 60 * 1000);
