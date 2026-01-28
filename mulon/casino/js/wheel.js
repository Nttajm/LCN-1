// ========================================
// WHEEL GAME - Stake-style Wheel of Fortune
// ========================================

// Wheel configurations for different risk levels and segments
// Low = alternating 0x pattern (50% chance of 0x)
// Medium = double 0x (66% chance of 0x)
// High = many 0x (80% chance of 0x)
const WHEEL_CONFIGS = {
  low: {
    10: [
      { multiplier: 0, color: '#1a1a2e', weight: 5 },      // 50% - alternating
      { multiplier: 1.4, color: '#22c55e', weight: 2 },
      { multiplier: 1.2, color: '#6366f1', weight: 2 },
      { multiplier: 1.8, color: '#f59e0b', weight: 1 }
    ],
    20: [
      { multiplier: 0, color: '#1a1a2e', weight: 10 },     // 50% - alternating
      { multiplier: 1.4, color: '#22c55e', weight: 4 },
      { multiplier: 1.2, color: '#6366f1', weight: 4 },
      { multiplier: 1.8, color: '#f59e0b', weight: 2 }
    ],
    30: [
      { multiplier: 0, color: '#1a1a2e', weight: 15 },     // 50%
      { multiplier: 1.4, color: '#22c55e', weight: 6 },
      { multiplier: 1.2, color: '#6366f1', weight: 6 },
      { multiplier: 1.8, color: '#f59e0b', weight: 3 }
    ],
    40: [
      { multiplier: 0, color: '#1a1a2e', weight: 20 },     // 50%
      { multiplier: 1.4, color: '#22c55e', weight: 8 },
      { multiplier: 1.2, color: '#6366f1', weight: 8 },
      { multiplier: 1.8, color: '#f59e0b', weight: 4 }
    ],
    50: [
      { multiplier: 0, color: '#1a1a2e', weight: 25 },     // 50%
      { multiplier: 1.4, color: '#22c55e', weight: 10 },
      { multiplier: 1.2, color: '#6366f1', weight: 10 },
      { multiplier: 1.8, color: '#f59e0b', weight: 5 }
    ]
  },
  medium: {
    10: [
      { multiplier: 0, color: '#1a1a2e', weight: 7 },      // ~66% - double 0x
      { multiplier: 2, color: '#22c55e', weight: 1 },
      { multiplier: 1.5, color: '#6366f1', weight: 1 },
      { multiplier: 3, color: '#f59e0b', weight: 1 }
    ],
    20: [
      { multiplier: 0, color: '#1a1a2e', weight: 14 },     // ~66%
      { multiplier: 2, color: '#22c55e', weight: 2 },
      { multiplier: 1.5, color: '#6366f1', weight: 2 },
      { multiplier: 3, color: '#f59e0b', weight: 2 }
    ],
    30: [
      { multiplier: 0, color: '#1a1a2e', weight: 20 },     // ~66%
      { multiplier: 2, color: '#22c55e', weight: 4 },
      { multiplier: 1.5, color: '#6366f1', weight: 3 },
      { multiplier: 3, color: '#f59e0b', weight: 3 }
    ],
    40: [
      { multiplier: 0, color: '#1a1a2e', weight: 28 },     // ~66%
      { multiplier: 2, color: '#22c55e', weight: 4 },
      { multiplier: 1.5, color: '#6366f1', weight: 4 },
      { multiplier: 3, color: '#f59e0b', weight: 4 }
    ],
    50: [
      { multiplier: 0, color: '#1a1a2e', weight: 34 },     // ~66%
      { multiplier: 2, color: '#22c55e', weight: 6 },
      { multiplier: 1.5, color: '#6366f1', weight: 5 },
      { multiplier: 3, color: '#f59e0b', weight: 5 }
    ]
  },
  high: {
    10: [
      { multiplier: 0, color: '#1a1a2e', weight: 8 },      // 80% - many 0x
      { multiplier: 5, color: '#22c55e', weight: 1 },
      { multiplier: 10, color: '#f59e0b', weight: 1 }
    ],
    20: [
      { multiplier: 0, color: '#1a1a2e', weight: 16 },     // 80%
      { multiplier: 5, color: '#22c55e', weight: 2 },
      { multiplier: 10, color: '#f59e0b', weight: 1 },
      { multiplier: 3, color: '#6366f1', weight: 1 }
    ],
    30: [
      { multiplier: 0, color: '#1a1a2e', weight: 24 },     // 80%
      { multiplier: 5, color: '#22c55e', weight: 2 },
      { multiplier: 10, color: '#f59e0b', weight: 2 },
      { multiplier: 3, color: '#6366f1', weight: 2 }
    ],
    40: [
      { multiplier: 0, color: '#1a1a2e', weight: 32 },     // 80%
      { multiplier: 5, color: '#22c55e', weight: 3 },
      { multiplier: 10, color: '#f59e0b', weight: 2 },
      { multiplier: 3, color: '#6366f1', weight: 3 }
    ],
    50: [
      { multiplier: 0, color: '#1a1a2e', weight: 40 },     // 80%
      { multiplier: 5, color: '#22c55e', weight: 4 },
      { multiplier: 10, color: '#f59e0b', weight: 3 },
      { multiplier: 3, color: '#6366f1', weight: 3 }
    ]
  }
};

// Game State
const gameState = {
  risk: 'low',
  segments: 20,
  betAmount: 10,
  isSpinning: false,
  currentRotation: 0,
  isSignedIn: false,
  
  // Stats
  totalSpins: 0,
  sessionProfit: 0,
  bestWin: 0,
  
  // Auto mode
  isAutoMode: false,
  autoRunning: false,
  autoSpinsRemaining: 0,
  autoInfinite: false,
  baseBet: 10,
  onWinReset: true,
  onWinIncreasePercent: 0,
  onLossReset: true,
  onLossIncreasePercent: 0,
  stopProfit: 0,
  stopLoss: 0,
  
  // History
  spinHistory: [],
  profitHistory: [0]
};

// DOM Elements
let elements = {};
let wheelCanvas, wheelCtx;
let profitCanvas, profitCtx;
let currentSegments = [];

// Wait for CasinoAuth to be ready
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
  if (!hasAccess) return;
  
  initWheelGame();
});

function initWheelGame() {
  cacheElements();
  setupCanvas();
  setupEventListeners();
  buildWheel();
  updateLegend();
  updateStats();
  initCasinoAuth();
  
  // Initialize profit graph
  if (window.ProfitGraph) {
    window.ProfitGraph.init();
  }
  
  console.log('Wheel game initialized!');
}

function cacheElements() {
  elements = {
    // Tabs
    manualTab: document.getElementById('manualTab'),
    autoTab: document.getElementById('autoTab'),
    autoControls: document.getElementById('autoControls'),
    
    // Bet controls
    betAmount: document.getElementById('betAmount'),
    halfBtn: document.getElementById('halfBtn'),
    doubleBtn: document.getElementById('doubleBtn'),
    spinBtn: document.getElementById('spinBtn'),
    
    // Selectors
    riskSelect: document.getElementById('riskSelect'),
    segmentsSelect: document.getElementById('segmentsSelect'),
    
    // Wheel
    wheel: document.getElementById('wheel'),
    wheelCanvas: document.getElementById('wheelCanvas'),
    wheelMultiplier: document.getElementById('wheelMultiplier'),
    
    // Results
    resultMultiplier: document.getElementById('resultMultiplier'),
    payoutAmount: document.getElementById('payoutAmount'),
    spinHistory: document.getElementById('spinHistory'),
    
    // Stats
    totalSpins: document.getElementById('totalSpins'),
    sessionProfit: document.getElementById('sessionProfit'),
    bestWin: document.getElementById('bestWin'),
    
    // Legend
    legendGrid: document.getElementById('legendGrid'),
    
    // Profit graph
    profitGraphCanvas: document.getElementById('profitGraphCanvas'),
    profitGraphValue: document.getElementById('profitGraphValue'),
    
    // Auto mode
    autoSpins: document.getElementById('autoSpins'),
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
}

// Initialize casino auth and balance
function initCasinoAuth() {
  if (window.CasinoAuth) {
    gameState.isSignedIn = window.CasinoAuth.isSignedIn();
    updateBalanceDisplay();
    
    // Listen for auth state changes
    window.CasinoAuth.onAuthStateChange((user, userData) => {
      gameState.isSignedIn = !!user;
      updateBalanceDisplay();
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
    
    if (balanceEl) balanceEl.textContent = '$' + balance.toFixed(2);
    if (keysEl) keysEl.innerHTML = '<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ' + keys;
    if (xpsEl) xpsEl.textContent = '⚡ ' + xps;
  }
}

function setupCanvas() {
  wheelCanvas = elements.wheelCanvas;
  if (!wheelCanvas) return;
  
  wheelCtx = wheelCanvas.getContext('2d');
  
  // Set canvas size for high DPI
  const size = 400;
  const dpr = window.devicePixelRatio || 1;
  wheelCanvas.width = size * dpr;
  wheelCanvas.height = size * dpr;
  wheelCtx.scale(dpr, dpr);
}

function setupEventListeners() {
  // Tabs
  if (elements.manualTab) {
    elements.manualTab.addEventListener('click', () => switchTab('manual'));
  }
  if (elements.autoTab) {
    elements.autoTab.addEventListener('click', () => switchTab('auto'));
  }
  
  // Bet controls
  if (elements.halfBtn) {
    elements.halfBtn.addEventListener('click', () => adjustBet(0.5));
  }
  if (elements.doubleBtn) {
    elements.doubleBtn.addEventListener('click', () => adjustBet(2));
  }
  if (elements.betAmount) {
    elements.betAmount.addEventListener('input', () => {
      gameState.betAmount = parseFloat(elements.betAmount.value) || 0;
    });
  }
  
  // Spin button
  if (elements.spinBtn) {
    elements.spinBtn.addEventListener('click', handleSpin);
  }
  
  // Risk select
  if (elements.riskSelect) {
    elements.riskSelect.addEventListener('change', () => {
      gameState.risk = elements.riskSelect.value;
      buildWheel();
      updateLegend();
    });
  }
  
  // Segments select
  if (elements.segmentsSelect) {
    elements.segmentsSelect.addEventListener('change', () => {
      gameState.segments = parseInt(elements.segmentsSelect.value);
      buildWheel();
      updateLegend();
    });
  }
  
  // Auto mode
  if (elements.infinityBtn) {
    elements.infinityBtn.addEventListener('click', () => {
      gameState.autoInfinite = !gameState.autoInfinite;
      elements.infinityBtn.classList.toggle('active', gameState.autoInfinite);
      if (elements.autoSpins) {
        elements.autoSpins.disabled = gameState.autoInfinite;
      }
    });
  }
  
  // On win/loss toggles
  setupAutoToggles();
}

function setupAutoToggles() {
  if (elements.onWinReset) {
    elements.onWinReset.addEventListener('click', () => {
      gameState.onWinReset = true;
      elements.onWinReset.classList.add('active');
      if (elements.onWinIncrease) elements.onWinIncrease.classList.remove('active');
    });
  }
  
  if (elements.onWinIncrease) {
    elements.onWinIncrease.addEventListener('click', () => {
      gameState.onWinReset = false;
      elements.onWinIncrease.classList.add('active');
      if (elements.onWinReset) elements.onWinReset.classList.remove('active');
    });
  }
  
  if (elements.onLossReset) {
    elements.onLossReset.addEventListener('click', () => {
      gameState.onLossReset = true;
      elements.onLossReset.classList.add('active');
      if (elements.onLossIncrease) elements.onLossIncrease.classList.remove('active');
    });
  }
  
  if (elements.onLossIncrease) {
    elements.onLossIncrease.addEventListener('click', () => {
      gameState.onLossReset = false;
      elements.onLossIncrease.classList.add('active');
      if (elements.onLossReset) elements.onLossReset.classList.remove('active');
    });
  }
}

function switchTab(tab) {
  if (tab === 'manual') {
    if (elements.manualTab) elements.manualTab.classList.add('active');
    if (elements.autoTab) elements.autoTab.classList.remove('active');
    if (elements.autoControls) elements.autoControls.style.display = 'none';
    gameState.isAutoMode = false;
    gameState.autoRunning = false;
    if (elements.spinBtn) elements.spinBtn.textContent = 'Spin';
  } else {
    if (elements.autoTab) elements.autoTab.classList.add('active');
    if (elements.manualTab) elements.manualTab.classList.remove('active');
    if (elements.autoControls) elements.autoControls.style.display = 'block';
    gameState.isAutoMode = true;
  }
}

function adjustBet(multiplier) {
  gameState.betAmount = Math.max(1, Math.round(gameState.betAmount * multiplier * 100) / 100);
  if (elements.betAmount) {
    elements.betAmount.value = gameState.betAmount;
  }
}

function buildWheel() {
  const config = WHEEL_CONFIGS[gameState.risk][gameState.segments];
  currentSegments = [];
  
  // Build segments array based on weights
  config.forEach(item => {
    for (let i = 0; i < item.weight; i++) {
      currentSegments.push({
        multiplier: item.multiplier,
        color: item.color
      });
    }
  });
  
  // Shuffle segments
  for (let i = currentSegments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [currentSegments[i], currentSegments[j]] = [currentSegments[j], currentSegments[i]];
  }
  
  drawWheel();
}

function drawWheel() {
  if (!wheelCtx) return;
  
  const size = 400;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 5;
  const segmentAngle = (2 * Math.PI) / currentSegments.length;
  
  wheelCtx.clearRect(0, 0, size, size);
  
  currentSegments.forEach((segment, i) => {
    const startAngle = i * segmentAngle - Math.PI / 2;
    const endAngle = startAngle + segmentAngle;
    
    // Draw segment
    wheelCtx.beginPath();
    wheelCtx.moveTo(centerX, centerY);
    wheelCtx.arc(centerX, centerY, radius, startAngle, endAngle);
    wheelCtx.closePath();
    wheelCtx.fillStyle = segment.color;
    wheelCtx.fill();
    
    // Draw segment border
    wheelCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    wheelCtx.lineWidth = 1;
    wheelCtx.stroke();
    
    // Draw multiplier text
    wheelCtx.save();
    wheelCtx.translate(centerX, centerY);
    wheelCtx.rotate(startAngle + segmentAngle / 2);
    wheelCtx.textAlign = 'right';
    wheelCtx.fillStyle = '#fff';
    wheelCtx.font = 'bold 11px Inter, sans-serif';
    wheelCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    wheelCtx.shadowBlur = 2;
    wheelCtx.fillText(`${segment.multiplier}x`, radius - 15, 4);
    wheelCtx.restore();
  });
}

function updateLegend() {
  if (!elements.legendGrid) return;
  
  const config = WHEEL_CONFIGS[gameState.risk][gameState.segments];
  const totalWeight = config.reduce((sum, item) => sum + item.weight, 0);
  
  elements.legendGrid.innerHTML = config
    .sort((a, b) => b.multiplier - a.multiplier)
    .map(item => {
      const chance = ((item.weight / totalWeight) * 100).toFixed(1);
      return `
        <div class="legend-item">
          <div class="legend-color" style="background: ${item.color}"></div>
          <span class="legend-multiplier">${item.multiplier}x</span>
          <span class="legend-chance">${chance}%</span>
        </div>
      `;
    })
    .join('');
}

async function handleSpin() {
  if (gameState.isSpinning) return;
  
  // Check connection
  if (window.ConnectionMonitor && !window.ConnectionMonitor.canPlay()) {
    showNotification('Connection lost! Please wait...', 'error');
    return;
  }
  
  if (gameState.isAutoMode && gameState.autoRunning) {
    // Stop auto mode
    gameState.autoRunning = false;
    if (elements.spinBtn) elements.spinBtn.textContent = 'Start Auto';
    return;
  }
  
  if (gameState.isAutoMode) {
    // Start auto mode
    gameState.autoRunning = true;
    gameState.baseBet = gameState.betAmount;
    gameState.autoSpinsRemaining = gameState.autoInfinite ? Infinity : parseInt(elements.autoSpins?.value) || 10;
    if (elements.spinBtn) elements.spinBtn.textContent = 'Stop';
    runAutoSpin();
  } else {
    await spin();
  }
}

async function runAutoSpin() {
  while (gameState.autoRunning && gameState.autoSpinsRemaining > 0) {
    // Check stop conditions
    const stopProfit = parseFloat(elements.stopProfit?.value) || 0;
    const stopLoss = parseFloat(elements.stopLoss?.value) || 0;
    
    if (stopProfit > 0 && gameState.sessionProfit >= stopProfit) {
      gameState.autoRunning = false;
      break;
    }
    if (stopLoss > 0 && gameState.sessionProfit <= -stopLoss) {
      gameState.autoRunning = false;
      break;
    }
    
    await spin();
    gameState.autoSpinsRemaining--;
    
    // Wait between spins
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  gameState.autoRunning = false;
  if (elements.spinBtn) elements.spinBtn.textContent = 'Start Auto';
}

async function spin() {
  if (gameState.isSpinning) return;
  
  const betAmount = parseFloat(elements.betAmount?.value) || 0;
  
  // Check balance
  if (!window.CasinoAuth) {
    showNotification('Auth not ready!', 'error');
    return;
  }
  
  const balance = window.CasinoAuth.getBalance();
  if (betAmount > balance) {
    showNotification('Insufficient balance!', 'error');
    return;
  }
  
  if (betAmount < 1) {
    showNotification('Minimum bet is $1', 'error');
    return;
  }
  
  gameState.isSpinning = true;
  if (elements.spinBtn) {
    elements.spinBtn.disabled = true;
    elements.spinBtn.classList.add('spinning');
  }
  
  // Place bet using CasinoDB
  const betResult = await window.CasinoDB.placeBet(betAmount, 'wheel');
  if (!betResult.success) {
    showNotification(betResult.error || 'Failed to place bet', 'error');
    gameState.isSpinning = false;
    if (elements.spinBtn) {
      elements.spinBtn.disabled = false;
      elements.spinBtn.classList.remove('spinning');
    }
    return;
  }
  updateBalanceDisplay();
  
  // Calculate rotation - spin randomly
  const segmentAngle = 360 / currentSegments.length;
  const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
  const randomAngle = Math.random() * 360; // Random final position
  const totalRotation = fullSpins * 360 + randomAngle;
  
  // Apply rotation
  gameState.currentRotation += totalRotation;
  if (elements.wheel) {
    elements.wheel.style.transform = `rotate(${gameState.currentRotation}deg)`;
  }
  
  // Update center display during spin
  if (elements.wheelMultiplier) {
    elements.wheelMultiplier.textContent = '?';
    elements.wheelMultiplier.style.color = '#fff';
  }
  
  // Wait for spin to complete
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  // Calculate which segment is under the arrow (at the top)
  // The arrow is at the top (0 degrees). We need to find which segment is there.
  // Normalize the rotation to 0-360
  const normalizedRotation = ((gameState.currentRotation % 360) + 360) % 360;
  // The wheel rotates clockwise, so the segment under the arrow is the one
  // that has been rotated TO the top position
  // Segment 0 starts at top, so we need to find which segment is now at top
  // Added offset to shift calculation slightly left (counterclockwise)
  const offset = segmentAngle * 0.25; // Shift left by 25% of a segment
  const winningIndex = Math.floor(((360 - normalizedRotation + segmentAngle / 2 + offset) % 360) / segmentAngle) % currentSegments.length;
  const winningSegment = currentSegments[winningIndex];
  
  // Calculate payout
  const payout = betAmount * winningSegment.multiplier;
  const profit = payout - betAmount;
  
  // Update balance with winnings
  if (payout > 0) {
    await window.CasinoDB.updateBalance(payout);
  }
  updateBalanceDisplay();
  
  // Update game state
  gameState.totalSpins++;
  gameState.sessionProfit += profit;
  gameState.profitHistory.push(gameState.sessionProfit);
  
  if (profit > 0) {
    if (profit > gameState.bestWin) {
      gameState.bestWin = profit;
    }
    
    // Auto mode - on win
    if (gameState.isAutoMode) {
      if (gameState.onWinReset) {
        if (elements.betAmount) elements.betAmount.value = gameState.baseBet;
        gameState.betAmount = gameState.baseBet;
      } else {
        const increase = gameState.betAmount * (parseFloat(elements.onWinPercent?.value) / 100);
        gameState.betAmount += increase;
        if (elements.betAmount) elements.betAmount.value = gameState.betAmount.toFixed(2);
      }
    }
  } else {
    // Auto mode - on loss
    if (gameState.isAutoMode) {
      if (gameState.onLossReset) {
        if (elements.betAmount) elements.betAmount.value = gameState.baseBet;
        gameState.betAmount = gameState.baseBet;
      } else {
        const increase = gameState.betAmount * (parseFloat(elements.onLossPercent?.value) / 100);
        gameState.betAmount += increase;
        if (elements.betAmount) elements.betAmount.value = gameState.betAmount.toFixed(2);
      }
    }
  }
  
  // Update center display
  if (elements.wheelMultiplier) {
    elements.wheelMultiplier.textContent = `${winningSegment.multiplier}x`;
    elements.wheelMultiplier.style.color = winningSegment.color;
  }
  
  // Update result display
  if (elements.resultMultiplier) {
    elements.resultMultiplier.textContent = `${winningSegment.multiplier}x`;
    elements.resultMultiplier.style.color = winningSegment.color;
  }
  if (elements.payoutAmount) {
    elements.payoutAmount.textContent = `$${payout.toFixed(2)}`;
    elements.payoutAmount.classList.toggle('loss', profit < 0);
  }
  
  // Add to history
  addToHistory(winningSegment);
  
  // Update stats
  updateStats();
  
  // Update profit graph
  if (window.ProfitGraph && window.ProfitGraph.addPoint) {
    window.ProfitGraph.addPoint(gameState.sessionProfit);
  }
  
  // Award XP
  if (window.CasinoDB && window.CasinoDB.awardXPs) {
    await window.CasinoDB.awardXPs('wheel', winningSegment.multiplier, betAmount);
  }
  
  gameState.isSpinning = false;
  if (elements.spinBtn) {
    elements.spinBtn.disabled = false;
    elements.spinBtn.classList.remove('spinning');
  }
}

function addToHistory(segment) {
  gameState.spinHistory.unshift(segment);
  if (gameState.spinHistory.length > 15) {
    gameState.spinHistory.pop();
  }
  
  if (elements.spinHistory) {
    if (gameState.spinHistory.length > 0) {
      elements.spinHistory.innerHTML = gameState.spinHistory
        .map(s => `
          <div class="history-item" style="background: ${s.color}">
            ${s.multiplier}x
          </div>
        `)
        .join('');
    }
  }
}

function updateStats() {
  if (elements.totalSpins) {
    elements.totalSpins.textContent = gameState.totalSpins;
  }
  
  if (elements.sessionProfit) {
    const profitText = gameState.sessionProfit >= 0 
      ? `$${gameState.sessionProfit.toFixed(2)}` 
      : `-$${Math.abs(gameState.sessionProfit).toFixed(2)}`;
    elements.sessionProfit.textContent = profitText;
    elements.sessionProfit.classList.toggle('negative', gameState.sessionProfit < 0);
  }
  
  if (elements.bestWin) {
    elements.bestWin.textContent = `$${gameState.bestWin.toFixed(2)}`;
  }
  
  // Update profit graph value
  if (elements.profitGraphValue) {
    const profitText = gameState.sessionProfit >= 0 
      ? `$${gameState.sessionProfit.toFixed(2)}` 
      : `-$${Math.abs(gameState.sessionProfit).toFixed(2)}`;
    elements.profitGraphValue.textContent = profitText;
    elements.profitGraphValue.classList.toggle('negative', gameState.sessionProfit < 0);
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    background: ${type === 'error' ? '#ef4444' : '#22c55e'};
    color: white;
    font-weight: 600;
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Add CSS for notification animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateX(-50%) translateY(0); opacity: 1; }
    to { transform: translateX(-50%) translateY(-20px); opacity: 0; }
  }
`;
document.head.appendChild(style);
