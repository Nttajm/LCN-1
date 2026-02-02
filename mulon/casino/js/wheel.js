// ========================================
// WHEEL GAME - Stake-style Ring Wheel
// ========================================

// Game Configuration
const config = {
  betAmount: 0,
  risk: 'medium',
  segments: 30,
  sessionProfit: 0,
  spinsPlayed: 0,
  bestWin: 0,
  isSpinning: false,
  isSignedIn: false,
  currentRotation: 0
};

// Multiplier configurations based on risk and segments
// Colors match Stake's wheel exactly
const MULTIPLIER_COLORS = {
  0: '#4a5568',      // Gray - 0.00x
  1.5: '#f7b733',    // Yellow - 1.50x
  1.7: '#f5f5f5',    // White/Light - 1.70x
  1.9: '#6b8e7e',    // Teal/Gray-green - 1.90x
  2: '#22c55e',      // Green - 2.00x
  3: '#a855f7',      // Purple - 3.00x
  4: '#f97316',      // Orange - 4.00x
};

// Segment distributions for different risk/segment combinations
// Format: { multiplier: count }
const SEGMENT_CONFIGS = {
  low: {
    10: { 0: 0, 1.5: 1, 1.9: 5, 2: 3, 3: 1 },
    20: { 0: 0, 1.5: 2, 1.9: 10, 2: 6, 3: 2 },
    30: { 0: 0, 1.5: 3, 1.9: 15, 2: 9, 3: 3 },
    40: { 0: 0, 1.5: 4, 1.9: 20, 2: 12, 3: 4 },
    50: { 0: 0, 1.5: 5, 1.9: 25, 2: 15, 3: 5 }
  },
  medium: {
    10: { 0: 1, 1.5: 2, 1.7: 2, 2: 2, 3: 2, 4: 1 },
    20: { 0: 2, 1.5: 4, 1.7: 4, 2: 4, 3: 4, 4: 2 },
    30: { 0: 3, 1.5: 6, 1.7: 6, 2: 6, 3: 6, 4: 3 },
    40: { 0: 4, 1.5: 8, 1.7: 8, 2: 8, 3: 8, 4: 4 },
    50: { 0: 5, 1.5: 10, 1.7: 10, 2: 10, 3: 10, 4: 5 }
  },
  high: {
    10: { 0: 4, 1.5: 1, 1.7: 1, 2: 2, 3: 1, 4: 1 },
    20: { 0: 8, 1.5: 2, 1.7: 2, 2: 4, 3: 2, 4: 2 },
    30: { 0: 12, 1.5: 3, 1.7: 3, 2: 6, 3: 3, 4: 3 },
    40: { 0: 16, 1.5: 4, 1.7: 4, 2: 8, 3: 4, 4: 4 },
    50: { 0: 20, 1.5: 5, 1.7: 5, 2: 10, 3: 5, 4: 5 }
  }
};

// Current wheel segments array
let wheelSegments = [];

// Canvas and context
let canvas, ctx;
const WHEEL_SIZE = 400;
const OUTER_RADIUS = 190;
const INNER_RADIUS = 130;
const CENTER_RADIUS = 80;

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

// Generate wheel segments based on config - EVENLY DISTRIBUTED PATTERN
function generateWheelSegments() {
  const segmentConfig = SEGMENT_CONFIGS[config.risk][config.segments];
  wheelSegments = [];
  
  // Get multipliers sorted by value (highest first for pattern)
  const multiplierEntries = Object.entries(segmentConfig)
    .filter(([mult, count]) => count > 0) // Only include multipliers with count > 0
    .map(([mult, count]) => ({ mult: parseFloat(mult), count }))
    .sort((a, b) => b.mult - a.mult); // Sort highest to lowest
  
  const totalSegments = config.segments;
  
  // Create evenly distributed pattern
  // Strategy: Place each multiplier type evenly around the wheel
  const segmentArray = new Array(totalSegments).fill(null);
  
  for (const { mult, count } of multiplierEntries) {
    if (count === 0) continue;
    
    // Calculate spacing for this multiplier
    const spacing = totalSegments / count;
    
    // Find starting offset that works (try to interleave with existing)
    let startOffset = 0;
    for (let offset = 0; offset < spacing; offset++) {
      let canUseOffset = true;
      for (let i = 0; i < count; i++) {
        const pos = Math.floor(offset + i * spacing) % totalSegments;
        if (segmentArray[pos] !== null) {
          canUseOffset = false;
          break;
        }
      }
      if (canUseOffset) {
        startOffset = offset;
        break;
      }
    }
    
    // Place this multiplier evenly
    for (let i = 0; i < count; i++) {
      let pos = Math.floor(startOffset + i * spacing) % totalSegments;
      // Find next available slot if taken
      while (segmentArray[pos] !== null) {
        pos = (pos + 1) % totalSegments;
      }
      segmentArray[pos] = mult;
    }
  }
  
  // Convert to segment objects with colors
  wheelSegments = segmentArray.map(mult => ({
    multiplier: mult,
    color: MULTIPLIER_COLORS[mult] || '#4a5568'
  }));
  
  return wheelSegments;
}

// Fisher-Yates shuffle
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Draw the wheel (ring style like Stake)
function drawWheel(rotation = 0) {
  if (!ctx) return;
  
  const centerX = WHEEL_SIZE / 2;
  const centerY = WHEEL_SIZE / 2;
  const numSegments = wheelSegments.length;
  const anglePerSegment = (2 * Math.PI) / numSegments;
  
  // Clear canvas
  ctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);
  
  // Draw outer ring background (dark)
  ctx.beginPath();
  ctx.arc(centerX, centerY, OUTER_RADIUS + 5, 0, 2 * Math.PI);
  ctx.fillStyle = '#1a1f26';
  ctx.fill();
  
  // Draw each segment (ring style - only outer ring has color)
  wheelSegments.forEach((segment, i) => {
    const startAngle = rotation + (i * anglePerSegment) - Math.PI / 2;
    const endAngle = startAngle + anglePerSegment;
    
    // Draw segment arc (ring)
    ctx.beginPath();
    ctx.arc(centerX, centerY, OUTER_RADIUS, startAngle, endAngle);
    ctx.arc(centerX, centerY, INNER_RADIUS, endAngle, startAngle, true);
    ctx.closePath();
    
    ctx.fillStyle = segment.color;
    ctx.fill();
    
    // Add subtle border between segments
    ctx.strokeStyle = '#1a1f26';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  
  // Draw inner dark circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, INNER_RADIUS - 2, 0, 2 * Math.PI);
  ctx.fillStyle = '#0f1419';
  ctx.fill();
  
  // Draw center circle (darker)
  ctx.beginPath();
  ctx.arc(centerX, centerY, CENTER_RADIUS, 0, 2 * Math.PI);
  ctx.fillStyle = '#1a1f26';
  ctx.fill();
  ctx.strokeStyle = '#2a3441';
  ctx.lineWidth = 3;
  ctx.stroke();
}

// Update multiplier legend at bottom
function updateLegend() {
  const legendGrid = document.getElementById('legendGrid');
  if (!legendGrid) return;
  
  const segmentConfig = SEGMENT_CONFIGS[config.risk][config.segments];
  // Only show multipliers that have count > 0
  const uniqueMultipliers = Object.entries(segmentConfig)
    .filter(([mult, count]) => count > 0)
    .map(([mult]) => parseFloat(mult))
    .sort((a, b) => a - b);
  
  legendGrid.innerHTML = uniqueMultipliers.map(mult => `
    <div class="legend-item" data-multiplier="${mult}">
      <div class="legend-color" style="background: ${MULTIPLIER_COLORS[mult]}"></div>
      <span class="legend-multiplier">${mult.toFixed(2)}×</span>
    </div>
  `).join('');
}

// Spin the wheel
async function spin() {
  if (config.isSpinning) return;
  
  // Check if signed in
  if (!config.isSignedIn) {
    showToast('Please sign in to play!');
    return;
  }
  
  // Check if user has keys
  const currentKeys = window.CasinoAuth.getKeys();
  if (currentKeys <= 0) {
    showToast('You need keys to play! Come back tomorrow for free keys.');
    return;
  }
  
  const betAmount = parseFloat(document.getElementById('betAmount').value) || 0;
  if (betAmount <= 0) {
    showToast('Please enter a bet amount!');
    return;
  }
  
  const currentBalance = window.CasinoAuth.getBalance();
  if (currentBalance < betAmount) {
    showToast('Insufficient balance!');
    return;
  }
  
  // Lock controls
  config.isSpinning = true;
  config.betAmount = betAmount;
  lockControls(true);
  
  // Place bet
  const result = await window.CasinoDB.placeBet(betAmount, 'wheel');
  if (!result.success) {
    showToast(result.error || 'Failed to place bet');
    config.isSpinning = false;
    lockControls(false);
    return;
  }
  
  updateBalanceDisplay();
  
  // Determine winning segment
  const winningIndex = Math.floor(Math.random() * wheelSegments.length);
  const winningSegment = wheelSegments[winningIndex];
  
  // Calculate rotation
  // We need the winning segment to land at the top (pointer position)
  const anglePerSegment = (2 * Math.PI) / wheelSegments.length;
  const segmentMiddle = (winningIndex * anglePerSegment) + (anglePerSegment / 2);
  
  // Add multiple full rotations + offset to land on winning segment
  const fullRotations = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
  const targetRotation = (fullRotations * 2 * Math.PI) + (2 * Math.PI - segmentMiddle);
  
  // Animate the wheel
  await animateWheel(targetRotation);
  
  // Handle result
  await handleResult(winningSegment);
}

// Animate wheel spin
function animateWheel(targetRotation) {
  return new Promise((resolve) => {
    const startRotation = config.currentRotation % (2 * Math.PI);
    const totalRotation = targetRotation;
    const duration = 4000; // 4 seconds
    const startTime = performance.now();
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: cubic-bezier like (0.17, 0.67, 0.12, 0.99)
      const easeOut = 1 - Math.pow(1 - progress, 4);
      
      const currentRotation = startRotation + (totalRotation * easeOut);
      config.currentRotation = currentRotation;
      
      drawWheel(currentRotation);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        config.currentRotation = currentRotation % (2 * Math.PI);
        resolve();
      }
    }
    
    requestAnimationFrame(animate);
  });
}

// Handle spin result
async function handleResult(segment) {
  const multiplier = segment.multiplier;
  const winAmount = Math.round(config.betAmount * multiplier * 100) / 100;
  const profit = Math.round((winAmount - config.betAmount) * 100) / 100;
  
  config.spinsPlayed++;
  document.getElementById('spinsPlayed').textContent = config.spinsPlayed;
  
  // Highlight winning legend item
  highlightLegendItem(multiplier);
  
  if (multiplier > 0) {
    // Win
    await window.CasinoDB.recordWin(winAmount, config.betAmount);
    
    // Record game result
    if (window.CasinoDB && window.CasinoDB.recordGameResult) {
      await window.CasinoDB.recordGameResult('wheel', config.betAmount, winAmount);
    }
    
    // Award XPs for wins
    if (multiplier >= 1) {
      try {
        const xpResult = await window.CasinoDB.awardXPs('wheel', multiplier, config.betAmount);
        if (xpResult && xpResult.success && xpResult.xpsEarned > 0) {
          updateXPsDisplay();
          showXPGain(xpResult.xpsEarned, xpResult.streak, xpResult.streakMultiplier);
        }
      } catch (err) {
        console.error('Error awarding XPs:', err);
      }
    }
    
    config.sessionProfit += profit;
    
    if (profit > config.bestWin) {
      config.bestWin = profit;
      document.getElementById('bestWin').textContent = '$' + config.bestWin.toFixed(2);
    }
    
    // Update profit graph
    if (window.ProfitGraph) {
      window.ProfitGraph.addPoint(profit);
    }
    
    showToast(`Won $${winAmount.toFixed(2)} (${multiplier}×)`, 'win');
  } else {
    // Loss (0.00x)
    await window.CasinoDB.recordLoss('wheel');
    await window.CasinoDB.resetStreak();
    
    if (window.CasinoDB && window.CasinoDB.recordGameResult) {
      await window.CasinoDB.recordGameResult('wheel', config.betAmount, 0);
    }
    
    config.sessionProfit -= config.betAmount;
    
    // Update profit graph
    if (window.ProfitGraph) {
      window.ProfitGraph.addPoint(-config.betAmount);
    }
    
    updateKeysDisplay();
    showToast(`Lost $${config.betAmount.toFixed(2)} & -1 🔑`, 'loss');
  }
  
  updateBalanceDisplay();
  updateProfitDisplay();
  addResultToHistory(multiplier, segment.color);
  
  // Unlock controls
  config.isSpinning = false;
  lockControls(false);
}

// Highlight winning legend item
function highlightLegendItem(multiplier) {
  // Remove all active classes
  document.querySelectorAll('.legend-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Add active to winning multiplier
  const winningItem = document.querySelector(`.legend-item[data-multiplier="${multiplier}"]`);
  if (winningItem) {
    winningItem.classList.add('active');
    
    // Remove after 2 seconds
    setTimeout(() => {
      winningItem.classList.remove('active');
    }, 2000);
  }
}

// Add result to history
function addResultToHistory(multiplier, color) {
  const history = document.getElementById('resultsHistory');
  if (!history) return;
  
  const item = document.createElement('div');
  item.className = 'history-item';
  item.style.background = color;
  item.textContent = multiplier.toFixed(2) + '×';
  
  // Add to beginning
  history.insertBefore(item, history.firstChild);
  
  // Limit history to 20 items
  while (history.children.length > 20) {
    history.removeChild(history.lastChild);
  }
}

// Lock/unlock controls
function lockControls(locked) {
  const playBtn = document.getElementById('playBtn');
  const betInput = document.getElementById('betAmount');
  const riskSelect = document.getElementById('riskSelect');
  const segmentsSelect = document.getElementById('segmentsSelect');
  const halfBtn = document.getElementById('halfBtn');
  const doubleBtn = document.getElementById('doubleBtn');
  const balanceBtn = document.getElementById('balanceBtn');
  
  if (playBtn) {
    playBtn.disabled = locked;
    playBtn.textContent = locked ? 'Spinning...' : 'Play';
    if (locked) {
      playBtn.classList.add('spinning');
    } else {
      playBtn.classList.remove('spinning');
    }
  }
  
  if (betInput) betInput.disabled = locked;
  if (riskSelect) riskSelect.disabled = locked;
  if (segmentsSelect) segmentsSelect.disabled = locked;
  if (halfBtn) halfBtn.disabled = locked;
  if (doubleBtn) doubleBtn.disabled = locked;
  if (balanceBtn) balanceBtn.disabled = locked;
}

// Show toast notification
function showToast(message, type = 'info') {
  // Remove existing toast
  const existingToast = document.querySelector('.wheel-toast');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `wheel-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Display helpers
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
  if (profitEl) {
    profitEl.textContent = (config.sessionProfit >= 0 ? '+' : '') + '$' + config.sessionProfit.toFixed(2);
    profitEl.className = 'stat-value ' + (config.sessionProfit >= 0 ? 'profit' : 'loss');
  }
}

// Bet adjustment functions
function adjustBet(multiplier) {
  if (config.isSpinning) return;
  const input = document.getElementById('betAmount');
  const current = parseFloat(input.value) || 0;
  const maxBet = window.CasinoAuth ? window.CasinoAuth.getBalance() : 10000;
  input.value = Math.min(Math.max(0, current * multiplier), maxBet).toFixed(2);
}

function setFullBalance() {
  if (config.isSpinning) return;
  if (window.CasinoAuth) {
    document.getElementById('betAmount').value = window.CasinoAuth.getBalance().toFixed(2);
  }
}

// Initialize event listeners
function initEventListeners() {
  // Play button
  document.getElementById('playBtn')?.addEventListener('click', spin);
  
  // Bet controls
  document.getElementById('halfBtn')?.addEventListener('click', () => adjustBet(0.5));
  document.getElementById('doubleBtn')?.addEventListener('click', () => adjustBet(2));
  document.getElementById('balanceBtn')?.addEventListener('click', setFullBalance);
  
  // Risk change
  document.getElementById('riskSelect')?.addEventListener('change', (e) => {
    config.risk = e.target.value;
    generateWheelSegments();
    drawWheel(config.currentRotation);
    updateLegend();
  });
  
  // Segments change
  document.getElementById('segmentsSelect')?.addEventListener('change', (e) => {
    config.segments = parseInt(e.target.value);
    generateWheelSegments();
    drawWheel(config.currentRotation);
    updateLegend();
  });
  
  // Keyboard shortcut - Enter to spin
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !config.isSpinning && config.isSignedIn) {
      spin();
    }
  });
}

// Auth UI setup
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

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Setup canvas
  canvas = document.getElementById('wheelCanvas');
  ctx = canvas.getContext('2d');
  
  // Generate initial wheel
  generateWheelSegments();
  drawWheel(0);
  updateLegend();
  
  // Init event listeners
  initEventListeners();
  
  // Wait for auth
  await waitForAuth();
  
  // Initialize auth with maintenance check
  const hasAccess = await window.CasinoAuth.initWithMaintenanceCheck();
  if (!hasAccess) return;
  
  // Setup auth UI
  setupAuthUI();
  
  // Initialize profit graph
  if (window.ProfitGraph) {
    window.ProfitGraph.init();
  }
  
  // Listen for auth state changes
  window.CasinoAuth.onAuthStateChange((user, userData) => {
    config.isSignedIn = !!user;
    updateAuthUI(user);
    updateBalanceDisplay();
    updateKeysDisplay();
    updateXPsDisplay();
  });
});

// Session tracking
window.addEventListener('beforeunload', () => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    window.CasinoDB.endGameSession('user_left');
  }
});
