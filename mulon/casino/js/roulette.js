// ========================================
// ROULETTE GAME - STAKE STYLE
// With Physics Chips & Spinning Wheel
// ========================================

// Roulette wheel numbers in order (European style)
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
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
    if (num === 0) {
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
      return [parseInt(betId)];
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

// Place chip visually on cell
function placeChipOnCell(cell, totalAmount) {
  // Remove existing chip
  const existingChip = cell.querySelector('.placed-chip');
  if (existingChip) existingChip.remove();
  
  // Create chip
  const chip = document.createElement('div');
  chip.className = 'placed-chip';
  
  // Determine chip color based on total
  if (totalAmount >= 1000) {
    chip.classList.add('value-1000');
    chip.textContent = (totalAmount / 1000).toFixed(totalAmount % 1000 === 0 ? 0 : 1) + 'K';
  } else if (totalAmount >= 500) {
    chip.classList.add('value-500');
    chip.textContent = totalAmount;
  } else if (totalAmount >= 100) {
    chip.classList.add('value-100');
    chip.textContent = totalAmount;
  } else if (totalAmount >= 10) {
    chip.classList.add('value-10');
    chip.textContent = totalAmount;
  } else {
    chip.classList.add('value-1');
    chip.textContent = totalAmount;
  }
  
  // Position in center
  chip.style.left = '50%';
  chip.style.top = '50%';
  
  cell.style.position = 'relative';
  cell.appendChild(chip);
}

// Create physics chip animation
function createPhysicsChip(x, y, value) {
  const chipsLayer = document.getElementById('chipsLayer');
  const chip = document.createElement('div');
  chip.className = 'physics-chip';
  
  // Determine color
  if (value >= 1000) {
    chip.style.background = 'linear-gradient(145deg, #f97316, #ea580c)';
    chip.textContent = '1K';
  } else if (value >= 500) {
    chip.style.background = 'linear-gradient(145deg, #a855f7, #9333ea)';
    chip.textContent = '500';
  } else if (value >= 100) {
    chip.style.background = 'linear-gradient(145deg, #22c55e, #16a34a)';
    chip.textContent = '100';
  } else if (value >= 10) {
    chip.style.background = 'linear-gradient(145deg, #3b82f6, #2563eb)';
    chip.textContent = '10';
  } else {
    chip.style.background = 'linear-gradient(145deg, #64748b, #475569)';
    chip.textContent = '1';
  }
  
  // Position at click
  const rect = chipsLayer.getBoundingClientRect();
  chip.style.left = (x - rect.left - 15) + 'px';
  chip.style.top = (y - rect.top - 15) + 'px';
  
  chipsLayer.appendChild(chip);
  
  // Animate fall and bounce
  const gravity = 0.5;
  const bounce = 0.6;
  const friction = 0.98;
  
  let vy = 0;
  let vx = (Math.random() - 0.5) * 4;
  let posY = y - rect.top - 15;
  let posX = x - rect.left - 15;
  let rotation = 0;
  let rotationSpeed = (Math.random() - 0.5) * 20;
  
  const animate = () => {
    vy += gravity;
    posY += vy;
    posX += vx;
    vx *= friction;
    rotation += rotationSpeed;
    rotationSpeed *= 0.95;
    
    const maxY = rect.height - 30;
    if (posY > maxY) {
      posY = maxY;
      vy *= -bounce;
      rotationSpeed = (Math.random() - 0.5) * 10;
    }
    
    chip.style.top = posY + 'px';
    chip.style.left = posX + 'px';
    chip.style.transform = `rotate(${rotation}deg)`;
    
    if (Math.abs(vy) > 0.5 || posY < maxY - 1) {
      requestAnimationFrame(animate);
    } else {
      // Rest
      chip.style.top = maxY + 'px';
      setTimeout(() => {
        chip.style.opacity = '0';
        chip.style.transition = 'opacity 0.5s';
        setTimeout(() => chip.remove(), 500);
      }, 2000);
    }
  };
  
  requestAnimationFrame(animate);
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
      // Spin complete - determine winning number based on where ball landed
      // The pointer is at the top (angle = -PI/2 in screen space)
      // We need to find which slot is at the pointer position
      
      // The wheel has rotated by finalWheelAngle
      // Normalize the angle to find which slot is at the top
      let pointerAngle = finalWheelAngle % (2 * Math.PI);
      if (pointerAngle < 0) pointerAngle += 2 * Math.PI;
      
      // Find which slot index is at the pointer
      // Each slot spans slotAngle radians
      const winningIndex = Math.floor(pointerAngle / slotAngle) % numSlots;
      const winningNumber = WHEEL_NUMBERS[winningIndex];
      
      showResult(winningNumber);
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
    await window.CasinoDB.recordWin(totalWin);
  } else {
    // Lost - deduct a key
    await window.CasinoDB.recordLoss('roulette');
    updateKeysDisplay();
  }
  
  // Clear pending spin (spin completed successfully)
  await window.CasinoDB.setPendingRouletteSpin(0);
  
  updateBalanceDisplay();
  
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
    
    if (num === 0) {
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
  
  if (number === 0) {
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
    const newAmount = Math.max(1, Math.floor(bet.amount * multiplier));
    newBets[betId] = { ...bet, amount: newAmount };
    newTotal += newAmount;
    
    // Update chip on cell
    const cell = document.querySelector(`[data-bet="${betId}"]`);
    if (cell) placeChipOnCell(cell, newAmount);
  });
  
  config.bets = newBets;
  config.totalBet = newTotal;
  updateTotalBet();
}

// ========================================
// SAVED BETS PERSISTENCE
// ========================================

// Save current bets to localStorage (for page refresh)
function saveLastBets() {
  if (Object.keys(config.bets).length === 0) return;
  
  // Save to localStorage for persistence across page loads
  try {
    localStorage.setItem('roulette_lastBets', JSON.stringify(config.bets));
    localStorage.setItem('roulette_lastTotalBet', config.totalBet.toString());
  } catch (e) {
    console.warn('Could not save bets to localStorage:', e);
  }
}

// Load last bets from localStorage (restore after page load)
function loadLastBets() {
  try {
    const savedBets = localStorage.getItem('roulette_lastBets');
    const savedTotal = localStorage.getItem('roulette_lastTotalBet');
    
    if (savedBets && savedTotal) {
      const bets = JSON.parse(savedBets);
      const total = parseFloat(savedTotal);
      
      // Check if user has enough balance to restore bets
      const balance = window.CasinoAuth?.getBalance() ?? 0;
      if (total <= balance) {
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
      }
    }
  } catch (e) {
    console.warn('Could not load bets from localStorage:', e);
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

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
