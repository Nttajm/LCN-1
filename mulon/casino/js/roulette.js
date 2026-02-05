// ========================================
// ROULETTE GAME - STAKE STYLE
// With Physics Chips & Spinning Wheel
// ========================================

// Roulette wheel numbers in order (American style with 00)
const WHEEL_NUMBERS = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
  '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
];

// Red numbers
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

// Game Configuration
const config = {
  selectedChipValue: 10,
  bets: {}, // { betId: { amount, type, numbers } }
  betHistory: [], // For undo
  totalBet: 0,
  sessionProfit: 0,
  spinsCount: 0,
  bestWin: 0,
  isSpinning: false,
  lastResults: [],
  isSignedIn: false,
  lastBets: null // Store last bet configuration for repeat
};

// Physics chips for animations
const physicsChips = [];

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
  drawWheel();
  setupChipSelector();
  setupBettingBoard();
  setupButtons();
  updateTotalBet();
  
  // Initialize profit graph
  if (window.ProfitGraph) {
    ProfitGraph.init();
  }
  
  // Wait for auth module to load
  await waitForAuth();
  
  // Initialize auth with maintenance check
  const hasAccess = await window.CasinoAuth.initWithMaintenanceCheck();
  if (!hasAccess) return; // Stop if redirecting to maintenance
  
  // Setup auth UI handlers
  setupAuthUI();
  
  // Listen for auth state changes
  window.CasinoAuth.onAuthStateChange(async (user, userData) => {
    config.isSignedIn = !!user;
    updateAuthUI(user);
    
    if (user) {
      // Check for refresh penalty (spinning when user refreshed)
      const penaltyResult = await window.CasinoDB.checkRouletteRefreshPenalty();
      if (penaltyResult && penaltyResult.penalty > 0) {
        showRefreshPenalty(penaltyResult.penalty);
      }
      
      // Load last bets from localStorage
      loadLastBets();
      
      // Start session tracking
      if (window.SessionTracker && userData) {
        const db = window.CasinoDB.getDB ? window.CasinoDB.getDB() : null;
        if (db) {
          await window.SessionTracker.init(
            db,
            user.uid,
            'roulette',
            userData.balance || 0,
            userData.keys || 0
          );
        }
      }
    } else {
      // User logged out - clear saved bets
      clearSavedBets();
      clearBets();
    }
    
    updateBalanceDisplay();
    updateKeysDisplay();
    updateXPsDisplay();
  });
}

// Draw the roulette wheel
function drawWheel(rotation = 0) {
  const canvas = document.getElementById('rouletteWheel');
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const center = size / 2;
  const radius = size / 2 - 10;
  
  ctx.clearRect(0, 0, size, size);
  
  const numSlots = WHEEL_NUMBERS.length;
  const slotAngle = (2 * Math.PI) / numSlots;
  
  // Draw slots
  for (let i = 0; i < numSlots; i++) {
    const num = WHEEL_NUMBERS[i];
    const startAngle = rotation + i * slotAngle - Math.PI / 2;
    const endAngle = startAngle + slotAngle;
    
    // Slot color
    let color;
    if (num === 0 || num === '00') {
      color = '#16a34a';
    } else if (RED_NUMBERS.includes(num)) {
      color = '#dc2626';
    } else {
      color = '#1f2937';
    }
    
    // Draw slot
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#0f1419';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw number
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(startAngle + slotAngle / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText(num.toString(), radius - 20, 0);
    ctx.restore();
  }
  
  // Draw center circle
  ctx.beginPath();
  ctx.arc(center, center, 40, 0, 2 * Math.PI);
  ctx.fillStyle = '#1a1f26';
  ctx.fill();
  ctx.strokeStyle = '#f7b733';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Draw inner decoration
  ctx.beginPath();
  ctx.arc(center, center, 30, 0, 2 * Math.PI);
  ctx.fillStyle = '#0f1419';
  ctx.fill();
  
  // Draw center spindle
  ctx.beginPath();
  ctx.arc(center, center, 8, 0, 2 * Math.PI);
  ctx.fillStyle = '#f7b733';
  ctx.fill();
}

// Setup chip selector
function setupChipSelector() {
  const chips = document.querySelectorAll('.chips-row .chip');
  
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      
      const value = chip.dataset.value;
      config.selectedChipValue = value === '1K' ? 1000 : parseInt(value);
    });
  });
}

// Setup betting board
function setupBettingBoard() {
  const cells = document.querySelectorAll('.bet-cell');
  
  cells.forEach(cell => {
    cell.addEventListener('click', (e) => {
      if (config.isSpinning) return;
      
      const betId = cell.dataset.bet;
      const betType = cell.dataset.type;
      
      placeBet(betId, betType, cell, e);
    });
  });
}

// Place a bet
function placeBet(betId, betType, cell, event) {
  const amount = config.selectedChipValue;
  
  // Check if signed in
  if (!config.isSignedIn) {
    showToast('Please sign in to play!');
    return;
  }
  
  // Check balance
  const balance = window.CasinoAuth?.getBalance() ?? 0;
  if (config.totalBet + amount > balance) {
    showToast('Insufficient balance!');
    return;
  }
  
  // Save to history for undo
  config.betHistory.push({
    betId,
    amount,
    previousTotal: config.bets[betId]?.amount || 0
  });
  
  // Add to bets
  if (!config.bets[betId]) {
    config.bets[betId] = {
      amount: 0,
      type: betType,
      numbers: getBetNumbers(betId, betType)
    };
  }
  config.bets[betId].amount += amount;
  
  // Update total
  config.totalBet += amount;
  updateTotalBet();
  
  // Place chip visually
  placeChipOnCell(cell, config.bets[betId].amount);
  
  // Create physics chip animation
  createPhysicsChip(event.clientX, event.clientY, amount);
}

// Get numbers covered by a bet
function getBetNumbers(betId, betType) {
  switch (betType) {
    case 'number':
      return betId === '00' ? ['00'] : [parseInt(betId)];
    case 'row':
      if (betId === 'row1') return [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
      if (betId === 'row2') return [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
      if (betId === 'row3') return [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
      break;
    case 'dozen':
      if (betId === '1to12') return Array.from({length: 12}, (_, i) => i + 1);
      if (betId === '13to24') return Array.from({length: 12}, (_, i) => i + 13);
      if (betId === '25to36') return Array.from({length: 12}, (_, i) => i + 25);
      break;
    case 'outside':
      if (betId === '1to18') return Array.from({length: 18}, (_, i) => i + 1);
      if (betId === '19to36') return Array.from({length: 18}, (_, i) => i + 19);
      if (betId === 'even') return Array.from({length: 36}, (_, i) => i + 1).filter(n => n % 2 === 0);
      if (betId === 'odd') return Array.from({length: 36}, (_, i) => i + 1).filter(n => n % 2 !== 0);
      break;
    case 'color':
      if (betId === 'red') return RED_NUMBERS;
      if (betId === 'black') return Array.from({length: 36}, (_, i) => i + 1).filter(n => !RED_NUMBERS.includes(n));
      break;
  }
  return [];
}

// Get payout multiplier for bet type
function getPayoutMultiplier(betType) {
  switch (betType) {
    case 'number': return 35;
    case 'row': return 2;
    case 'dozen': return 2;
    case 'outside': return 1;
    case 'color': return 1;
    default: return 0;
  }
}

// Place chip visually on cell - shows stacked chips (max 8 visible)
// Chips consolidate: 10x$1 = 1x$10, 10x$10 = 1x$100, etc.
function placeChipOnCell(cell, totalAmount) {
  // Remove existing chip stack
  cell.querySelectorAll('.placed-chip').forEach(c => c.remove());
  
  // Determine the best chip denomination to display based on total amount
  // This consolidates chips: if you have $100, show chips as $100 denomination
  let displayChipValue, chipClass;
  
  if (totalAmount >= 1000) {
    displayChipValue = 1000;
    chipClass = 'value-1000';
  } else if (totalAmount >= 500) {
    displayChipValue = 500;
    chipClass = 'value-500';
  } else if (totalAmount >= 100) {
    displayChipValue = 100;
    chipClass = 'value-100';
  } else if (totalAmount >= 10) {
    displayChipValue = 10;
    chipClass = 'value-10';
  } else {
    displayChipValue = 1;
    chipClass = 'value-1';
  }
  
  // Calculate how many chips of this denomination to show
  const chipCount = Math.floor(totalAmount / displayChipValue);
  const visibleChipCount = Math.min(chipCount, 8);
  
  // Format the display text for the top chip
  let chipText;
  if (totalAmount >= 1000) {
    chipText = (totalAmount / 1000).toFixed(totalAmount % 1000 === 0 ? 0 : 1) + 'K';
  } else {
    chipText = totalAmount.toString();
  }
  
  cell.style.position = 'relative';
  
  // Create stacked chips - each offset slightly upward
  const stackOffset = 2; // pixels between each chip in stack
  
  for (let i = 0; i < visibleChipCount; i++) {
    const chip = document.createElement('div');
    chip.className = 'placed-chip ' + chipClass;
    
    // Only show text on top chip
    if (i === visibleChipCount - 1) {
      chip.textContent = chipText;
    }
    
    // Position - stack upward
    chip.style.left = '50%';
    chip.style.top = `calc(50% - ${i * stackOffset}px)`;
    chip.style.zIndex = i + 1;
    
    // Add slight shadow for depth on lower chips
    if (i < visibleChipCount - 1) {
      chip.style.filter = `brightness(${0.85 + (i * 0.02)})`;
    }
    
    cell.appendChild(chip);
  }
}

// Create physics chip animation - just a quick pop effect, no drop
function createPhysicsChip(x, y, value) {
  // Removed the falling/bouncing physics - chips now just stack on the cell
  // This function is kept for compatibility but does nothing heavy
}

// Update total bet display
function updateTotalBet() {
  const el = document.getElementById('totalBetAmount');
  el.value = config.totalBet;
}

// Setup buttons
function setupButtons() {
  document.getElementById('spinBtn').addEventListener('click', spin);
  document.getElementById('undoBtn').addEventListener('click', undoBet);
  document.getElementById('clearBtn').addEventListener('click', clearBets);
}

// Undo last bet
function undoBet() {
  if (config.betHistory.length === 0 || config.isSpinning) return;
  
  const lastAction = config.betHistory.pop();
  const betId = lastAction.betId;
  
  if (lastAction.previousTotal === 0) {
    // Remove bet entirely
    delete config.bets[betId];
    const cell = document.querySelector(`[data-bet="${betId}"]`);
    const chip = cell?.querySelector('.placed-chip');
    if (chip) chip.remove();
  } else {
    // Restore previous amount
    config.bets[betId].amount = lastAction.previousTotal;
    const cell = document.querySelector(`[data-bet="${betId}"]`);
    placeChipOnCell(cell, lastAction.previousTotal);
  }
  
  config.totalBet -= lastAction.amount;
  updateTotalBet();
}

// Clear all bets
function clearBets() {
  if (config.isSpinning) return;
  
  config.bets = {};
  config.betHistory = [];
  config.totalBet = 0;
  updateTotalBet();
  
  // Remove all placed chips
  document.querySelectorAll('.placed-chip').forEach(c => c.remove());
  
  // Remove saved bets from localStorage
  localStorage.removeItem('roulette_lastBets');
}

// Spin the wheel
async function spin() {
  if (config.isSpinning) return;
  if (config.totalBet === 0) {
    showToast('Place a bet first!');
    return;
  }
  
  // Check if signed in
  if (!config.isSignedIn) {
    showToast('Please sign in to play!');
    return;
  }
  
  // Check if user has keys
  const currentKeys = window.CasinoAuth.getKeys();
  if (currentKeys <= 0) {
    showToast('You need keys to play!');
    return;
  }
  
  // Check balance
  const currentBalance = window.CasinoAuth.getBalance();
  if (config.totalBet > currentBalance) {
    showToast('Insufficient balance!');
    return;
  }
  
  // Place bet via CasinoDB
  const result = await window.CasinoDB.placeBet(config.totalBet, 'roulette');
  if (!result.success) {
    showToast(result.error || 'Failed to place bet');
    return;
  }
  
  // Save current bets for repeat functionality
  saveLastBets();
  
  // Track pending spin for refresh penalty
  await window.CasinoDB.setPendingRouletteSpin(config.totalBet);
  
  updateBalanceDisplay();
  
  config.isSpinning = true;
  const spinBtn = document.getElementById('spinBtn');
  spinBtn.disabled = true;
  spinBtn.classList.add('spinning');
  spinBtn.querySelector('.btn-text').textContent = 'Spinning...';
  
  // Get ball and wheel container
  const ball = document.getElementById('wheelBall');
  const wheelContainer = document.querySelector('.wheel-container');
  const containerRect = wheelContainer.getBoundingClientRect();
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;
  
  // Show ball
  ball.classList.add('active');
  
  // Animation parameters
  const totalDuration = 5000; // 5 seconds total
  const wheelSpins = 3 + Math.random() * 2; // Wheel spins 3-5 times
  const totalWheelAngle = wheelSpins * 2 * Math.PI;
  
  // Ball physics
  const outerRadius = 125; // Starting radius (outer rim)
  const innerRadius = 100; // Final radius (in the slots)
  const numSlots = WHEEL_NUMBERS.length;
  const slotAngle = (2 * Math.PI) / numSlots;
  
  // Ball starts at random position and spins
  const startTime = Date.now();
  const startBallAngle = Math.random() * Math.PI * 2;
  const ballTotalSpins = 5 + Math.random() * 3; // Ball spins this many times (opposite direction)
  
  // The ball will land at a random final angle
  // We add some randomness to where the ball finally stops
  const finalBallAngle = Math.random() * Math.PI * 2;
  
  let finalWheelAngle = 0; // Will store the final wheel angle
  
  const animateSpin = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / totalDuration, 1);
    
    // Wheel rotation - eases out (cubic)
    const wheelEase = 1 - Math.pow(1 - progress, 3);
    const wheelAngle = totalWheelAngle * wheelEase;
    finalWheelAngle = wheelAngle; // Track for final calculation
    
    // Draw wheel
    drawWheel(-wheelAngle);
    
    // Ball spins in OPPOSITE direction to wheel, faster at start
    // Ball eases out more aggressively (quartic)
    const ballEase = 1 - Math.pow(1 - progress, 4);
    
    // Ball's angle - starts spinning fast, ends at final position
    const ballSpinAngle = ballTotalSpins * 2 * Math.PI * (1 - ballEase);
    const ballAngleOnWheel = startBallAngle + ballSpinAngle + (finalBallAngle - startBallAngle - ballTotalSpins * 2 * Math.PI) * ballEase;
    
    // Ball radius - starts outer, falls to inner
    let currentRadius;
    if (progress < 0.5) {
      // Phase 1: Spinning on outer rim
      currentRadius = outerRadius;
    } else if (progress < 0.8) {
      // Phase 2: Falling inward with bounces
      const fallProgress = (progress - 0.5) / 0.3;
      const fallEase = fallProgress * fallProgress; // Accelerating fall
      
      // Add bouncing effect
      const bounceCount = 4;
      const bounce = Math.abs(Math.sin(fallProgress * Math.PI * bounceCount));
      const bounceDecay = 1 - fallProgress;
      const bounceAmount = bounce * bounceDecay * 15;
      
      currentRadius = outerRadius - (outerRadius - innerRadius) * fallEase + bounceAmount;
    } else {
      // Phase 3: Settled in slot with tiny wobble
      const settleProgress = (progress - 0.8) / 0.2;
      const wobble = Math.sin(settleProgress * Math.PI * 3) * (1 - settleProgress) * 3;
      currentRadius = innerRadius + wobble;
    }
    
    // Convert ball position to screen coordinates
    // The ball angle on wheel needs to be combined with wheel rotation for display
    const displayAngle = ballAngleOnWheel + wheelAngle - Math.PI / 2;
    const ballX = centerX + Math.cos(displayAngle) * currentRadius;
    const ballY = centerY + Math.sin(displayAngle) * currentRadius;
    
    ball.style.left = ballX + 'px';
    ball.style.top = ballY + 'px';
    
    if (progress < 1) {
      requestAnimationFrame(animateSpin);
    } else {
      // Spin complete - determine winning number from where the ball DIV ended up.
      // We compute the ball's final angle (from center) using its DOM position,
      // then map that angle to the wheel sectors drawn in drawWheel().

      const ballRect = ball.getBoundingClientRect();
      const contRect = wheelContainer.getBoundingClientRect();
      const ballCenterX = (ballRect.left - contRect.left) + (ballRect.width / 2);
      const ballCenterY = (ballRect.top - contRect.top) + (ballRect.height / 2);

      const dx = ballCenterX - centerX;
      const dy = ballCenterY - centerY;
      const ballAngleScreen = Math.atan2(dy, dx); // -PI..PI, 0 = right

      // drawWheel uses: startAngle = rotation + i*slotAngle - PI/2
      // rotation at end is (-finalWheelAngle)
      const rotation = -finalWheelAngle;
      let slotPosition = (ballAngleScreen + Math.PI / 2 - rotation) / slotAngle;

      slotPosition = slotPosition % numSlots;
      if (slotPosition < 0) slotPosition += numSlots;

      const winningIndex = Math.floor(slotPosition) % numSlots;
      showResult(WHEEL_NUMBERS[winningIndex]);
    }
  };
  
  requestAnimationFrame(animateSpin);
}

// Show result
async function showResult(winningNumber) {
  // Keep ball visible - don't hide it
  
  // Show winning number in center
  const winningEl = document.getElementById('winningNumber');
  winningEl.textContent = winningNumber;
  winningEl.classList.add('show');
  
  // Add to last results
  addToLastResults(winningNumber);
  
  // Calculate winnings
  let totalWin = 0;
  
  Object.entries(config.bets).forEach(([betId, bet]) => {
    if (bet.numbers.includes(winningNumber)) {
      const multiplier = getPayoutMultiplier(bet.type);
      totalWin += bet.amount + (bet.amount * multiplier);
      
      // Highlight winning cell
      const cell = document.querySelector(`[data-bet="${betId}"]`);
      if (cell) cell.classList.add('winning');
    }
  });
  
  // Update balance via CasinoDB
  if (totalWin > 0) {
    await window.CasinoDB.recordWin(totalWin, config.totalBet);
  } else {
    // Lost - deduct a key
    await window.CasinoDB.recordLoss('roulette');
    updateKeysDisplay();
  }
  
  // Record game result in session
  if (window.CasinoDB && window.CasinoDB.recordGameResult) {
    await window.CasinoDB.recordGameResult('roulette', config.totalBet, totalWin);
  }
  
  // Clear pending spin (spin completed successfully)
  await window.CasinoDB.setPendingRouletteSpin(0);
  
  updateBalanceDisplay();
  
  // Track balance change in session
  if (window.SessionTracker) {
    const userData = window.CasinoAuth.userData;
    if (userData) {
      window.SessionTracker.trackBalanceChange(userData.balance || 0, userData.keys || 0);
    }
  }
  
  // Calculate profit
  const profit = totalWin - config.totalBet;
  config.sessionProfit += profit;
  config.spinsCount++;
  
  if (profit > config.bestWin) {
    config.bestWin = profit;
  }
  
  // Update profit graph
  if (window.ProfitGraph) {
    ProfitGraph.addPoint(profit);
  }
  
  // Share to live chat if effective multiplier is 3x or higher
  if (totalWin > 0 && config.totalBet > 0) {
    const effectiveMultiplier = totalWin / config.totalBet;
    if (effectiveMultiplier >= 3 && window.shareCasinoWin) {
      window.shareCasinoWin('roulette', effectiveMultiplier, profit);
    }
  }
  
  // Show result in box
  showResultBox(winningNumber, profit);
  
  // Update stats
  updateStats();
  
  // Reset after delay
  setTimeout(() => {
    config.isSpinning = false;
    const spinBtn = document.getElementById('spinBtn');
    spinBtn.disabled = false;
    spinBtn.classList.remove('spinning');
    spinBtn.querySelector('.btn-text').textContent = 'Play';
    
    winningEl.classList.remove('show');
    document.querySelectorAll('.bet-cell.winning').forEach(c => c.classList.remove('winning'));
    
    // Hide ball for next spin
    const ball = document.getElementById('wheelBall');
    ball.classList.remove('active');
    
    // Keep bets on table - don't clear them
    // Just reset bet history so undo starts fresh
    config.betHistory = [];
  }, 500);
}

// Add to last results
function addToLastResults(number) {
  config.lastResults.unshift(number);
  if (config.lastResults.length > 8) {
    config.lastResults.pop();
  }
  
  const container = document.getElementById('lastResults');
  container.innerHTML = '';
  
  config.lastResults.forEach(num => {
    const el = document.createElement('div');
    el.className = 'last-result';
    el.textContent = num;
    
    if (num === 0 || num === '00') {
      el.classList.add('green');
    } else if (RED_NUMBERS.includes(num)) {
      el.classList.add('red');
    } else {
      el.classList.add('black');
    }
    
    container.appendChild(el);
  });
}

// Show result in the result box
function showResultBox(number, profit) {
  const resultBox = document.getElementById('resultBox');
  const resultNum = document.getElementById('resultNumber');
  const resultAmount = document.getElementById('resultAmount');
  
  if (!resultBox) return;
  
  // Set number with color
  resultNum.textContent = number;
  resultNum.className = 'result-num';
  
  if (number === 0 || number === '00') {
    resultNum.classList.add('green');
  } else if (RED_NUMBERS.includes(number)) {
    resultNum.classList.add('red');
  } else {
    resultNum.classList.add('black');
  }
  
  // Set win/loss amount
  if (profit >= 0) {
    resultAmount.textContent = '+$' + profit.toFixed(2);
    resultAmount.className = 'result-amount win';
    resultBox.className = 'result-box win';
  } else {
    resultAmount.textContent = '-$' + Math.abs(profit).toFixed(2);
    resultAmount.className = 'result-amount loss';
    resultBox.className = 'result-box loss';
  }
  
  resultBox.classList.add('show');
}

// Update stats display
function updateStats() {
  const profitEl = document.getElementById('sessionProfit');
  const spinsEl = document.getElementById('spinsCount');
  const bestEl = document.getElementById('bestWin');
  
  if (config.sessionProfit >= 0) {
    profitEl.textContent = '+$' + config.sessionProfit.toFixed(2);
    profitEl.className = 'stat-value profit';
  } else {
    profitEl.textContent = '-$' + Math.abs(config.sessionProfit).toFixed(2);
    profitEl.className = 'stat-value loss';
  }
  
  spinsEl.textContent = config.spinsCount;
  bestEl.textContent = '$' + config.bestWin.toFixed(2);
}

// Update balance display
function updateBalanceDisplay() {
  const balance = window.CasinoAuth?.getBalance() ?? 0;
  const fmt = window.FormatUtils;
  const balanceEl = document.getElementById('userBalance');
  if (balanceEl) {
    balanceEl.textContent = fmt ? fmt.formatBalance(balance) : '$' + balance.toFixed(2);
  }
}

// Update keys display
function updateKeysDisplay() {
  const keys = window.CasinoAuth?.getKeys() ?? 0;
  const keysEl = document.getElementById('userKeys');
  if (keysEl) {
    keysEl.innerHTML = '<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ' + keys;
  }
}

// Update XPs display
function updateXPsDisplay() {
  const xps = window.CasinoAuth?.getXPs() ?? 0;
  const xpsEl = document.getElementById('userXPs');
  if (xpsEl) {
    xpsEl.textContent = '⚡ ' + xps;
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

// Show toast message
function showToast(message) {
  // Create toast if doesn't exist
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #ef4444;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 1000;
      transition: transform 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.style.transform = 'translateX(-50%) translateY(0)';
  
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
  }, 2000);
}

// Adjust total bet (half or double)
function adjustTotalBet(multiplier) {
  if (config.isSpinning || Object.keys(config.bets).length === 0) return;
  
  const newBets = {};
  let newTotal = 0;
  
  Object.entries(config.bets).forEach(([betId, bet]) => {
    // Ensure amount never goes below 1 (minimum bet)
    const newAmount = Math.max(1, Math.round(bet.amount * multiplier));
    
    // Only add to newBets if amount is valid (positive)
    if (newAmount >= 1) {
      newBets[betId] = { ...bet, amount: newAmount };
      newTotal += newAmount;
      
      // Update chip on cell
      const cell = document.querySelector(`[data-bet="${betId}"]`);
      if (cell) placeChipOnCell(cell, newAmount);
    }
  });
  
  // Only update if we still have valid bets
  if (newTotal > 0) {
    config.bets = newBets;
    config.totalBet = newTotal;
    updateTotalBet();
  }
}

// ========================================
// SAVED BETS PERSISTENCE
// ========================================

// Save current bets to localStorage (for page refresh)
function saveLastBets() {
  if (Object.keys(config.bets).length === 0) return;
  
  // Only save if user is signed in
  if (!config.isSignedIn) return;
  
  // Save to localStorage for persistence across page loads
  try {
    localStorage.setItem('roulette_lastBets', JSON.stringify(config.bets));
    localStorage.setItem('roulette_lastTotalBet', config.totalBet.toString());
  } catch (e) {
    console.warn('Could not save bets to localStorage:', e);
  }
}

// Clear saved bets from localStorage
function clearSavedBets() {
  try {
    localStorage.removeItem('roulette_lastBets');
    localStorage.removeItem('roulette_lastTotalBet');
  } catch (e) {
    console.warn('Could not clear saved bets:', e);
  }
}

// Load last bets from localStorage (restore after page load)
function loadLastBets() {
  // Only load if user is signed in
  if (!config.isSignedIn) return;
  
  try {
    const savedBets = localStorage.getItem('roulette_lastBets');
    const savedTotal = localStorage.getItem('roulette_lastTotalBet');
    
    if (savedBets && savedTotal) {
      const bets = JSON.parse(savedBets);
      const total = parseFloat(savedTotal);
      
      // Check if user has enough balance to restore bets
      const balance = window.CasinoAuth?.getBalance() ?? 0;
      
      // Only restore if total is reasonable (not more than balance and not absurdly high)
      if (total <= balance && total > 0 && total <= 100000) {
        // Restore bets
        config.bets = bets;
        config.totalBet = total;
        
        // Place chips visually
        Object.entries(config.bets).forEach(([betId, bet]) => {
          const cell = document.querySelector(`[data-bet="${betId}"]`);
          if (cell) {
            placeChipOnCell(cell, bet.amount);
          }
        });
        
        updateTotalBet();
      } else {
        // Invalid saved bets - clear them
        clearSavedBets();
      }
    }
  } catch (e) {
    console.warn('Could not load bets from localStorage:', e);
    clearSavedBets();
  }
}

// ========================================
// REFRESH PENALTY
// ========================================

// Show refresh penalty notification
function showRefreshPenalty(amount) {
  const penaltyEl = document.getElementById('refreshPenaltyNotice');
  if (penaltyEl) {
    penaltyEl.textContent = `⚠️ Refresh penalty: -$${amount.toFixed(2)} (bet lost while spinning)`;
    penaltyEl.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      penaltyEl.style.display = 'none';
    }, 5000);
  }
}

// Make adjustTotalBet available globally
window.adjustTotalBet = adjustTotalBet;

// ========================================
// SESSION TRACKING - End session on page leave
// ========================================
window.addEventListener('beforeunload', () => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    // End the active roulette session
    window.CasinoDB.endGameSession('user_left');
  }
});

// Session keepalive (update activity every 2 minutes)
setInterval(() => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    window.CasinoDB.updateSessionActivity();
  }
}, 2 * 60 * 1000);

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
