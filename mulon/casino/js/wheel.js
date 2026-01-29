// ========================================
// WHEEL GAME - Stake-style Ring Wheel
// ========================================

// Stake-style wheel colors (matching screenshot)
const WHEEL_COLORS = {
  gray: '#3a4451',      // 0.00x - Gray/dark
  green: '#22c55e',     // 1.50x - Green  
  blue: '#6366f1',      // 1.70x - Blue/indigo
  purple: '#8b5cf6',    // 2.00x - Purple
  yellow: '#eab308',    // 3.00x - Yellow
  orange: '#f97316'     // 4.00x - Orange
};

// Wheel configurations for different risk levels and segments
const WHEEL_CONFIGS = {
  low: {
    10: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 5 },
      { multiplier: 1.5, color: WHEEL_COLORS.green, weight: 2 },
      { multiplier: 1.7, color: WHEEL_COLORS.blue, weight: 2 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 1 }
    ],
    20: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 10 },
      { multiplier: 1.5, color: WHEEL_COLORS.green, weight: 4 },
      { multiplier: 1.7, color: WHEEL_COLORS.blue, weight: 3 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 2 },
      { multiplier: 3, color: WHEEL_COLORS.yellow, weight: 1 }
    ],
    30: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 15 },
      { multiplier: 1.5, color: WHEEL_COLORS.green, weight: 6 },
      { multiplier: 1.7, color: WHEEL_COLORS.blue, weight: 4 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 3 },
      { multiplier: 3, color: WHEEL_COLORS.yellow, weight: 2 }
    ],
    40: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 20 },
      { multiplier: 1.5, color: WHEEL_COLORS.green, weight: 8 },
      { multiplier: 1.7, color: WHEEL_COLORS.blue, weight: 5 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 4 },
      { multiplier: 3, color: WHEEL_COLORS.yellow, weight: 3 }
    ],
    50: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 25 },
      { multiplier: 1.5, color: WHEEL_COLORS.green, weight: 10 },
      { multiplier: 1.7, color: WHEEL_COLORS.blue, weight: 6 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 5 },
      { multiplier: 3, color: WHEEL_COLORS.yellow, weight: 4 }
    ]
  },
  medium: {
    10: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 6 },
      { multiplier: 1.5, color: WHEEL_COLORS.green, weight: 1 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 1 },
      { multiplier: 3, color: WHEEL_COLORS.yellow, weight: 1 },
      { multiplier: 4, color: WHEEL_COLORS.orange, weight: 1 }
    ],
    20: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 12 },
      { multiplier: 1.5, color: WHEEL_COLORS.green, weight: 2 },
      { multiplier: 1.7, color: WHEEL_COLORS.blue, weight: 2 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 2 },
      { multiplier: 3, color: WHEEL_COLORS.yellow, weight: 1 },
      { multiplier: 4, color: WHEEL_COLORS.orange, weight: 1 }
    ],
    30: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 18 },
      { multiplier: 1.5, color: WHEEL_COLORS.green, weight: 4 },
      { multiplier: 1.7, color: WHEEL_COLORS.blue, weight: 3 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 2 },
      { multiplier: 3, color: WHEEL_COLORS.yellow, weight: 2 },
      { multiplier: 4, color: WHEEL_COLORS.orange, weight: 1 }
    ],
    40: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 24 },
      { multiplier: 1.5, color: WHEEL_COLORS.green, weight: 5 },
      { multiplier: 1.7, color: WHEEL_COLORS.blue, weight: 4 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 3 },
      { multiplier: 3, color: WHEEL_COLORS.yellow, weight: 2 },
      { multiplier: 4, color: WHEEL_COLORS.orange, weight: 2 }
    ],
    50: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 30 },
      { multiplier: 1.5, color: WHEEL_COLORS.green, weight: 6 },
      { multiplier: 1.7, color: WHEEL_COLORS.blue, weight: 5 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 4 },
      { multiplier: 3, color: WHEEL_COLORS.yellow, weight: 3 },
      { multiplier: 4, color: WHEEL_COLORS.orange, weight: 2 }
    ]
  },
  high: {
    10: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 7 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 1 },
      { multiplier: 4, color: WHEEL_COLORS.orange, weight: 1 },
      { multiplier: 10, color: '#ef4444', weight: 1 }
    ],
    20: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 14 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 2 },
      { multiplier: 4, color: WHEEL_COLORS.orange, weight: 2 },
      { multiplier: 10, color: '#ef4444', weight: 1 },
      { multiplier: 20, color: '#ec4899', weight: 1 }
    ],
    30: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 21 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 3 },
      { multiplier: 4, color: WHEEL_COLORS.orange, weight: 3 },
      { multiplier: 10, color: '#ef4444', weight: 2 },
      { multiplier: 20, color: '#ec4899', weight: 1 }
    ],
    40: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 28 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 4 },
      { multiplier: 4, color: WHEEL_COLORS.orange, weight: 4 },
      { multiplier: 10, color: '#ef4444', weight: 2 },
      { multiplier: 20, color: '#ec4899', weight: 2 }
    ],
    50: [
      { multiplier: 0, color: WHEEL_COLORS.gray, weight: 35 },
      { multiplier: 2, color: WHEEL_COLORS.purple, weight: 5 },
      { multiplier: 4, color: WHEEL_COLORS.orange, weight: 5 },
      { multiplier: 10, color: '#ef4444', weight: 3 },
      { multiplier: 20, color: '#ec4899', weight: 2 }
    ]
  }
};

// Game State
const gameState = {
  risk: 'medium',
  segments: 30,
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
  
  // Set default values
  if (elements.riskSelect) elements.riskSelect.value = 'medium';
  if (elements.segmentsSelect) elements.segmentsSelect.value = '30';
  
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
    if (elements.spinBtn) elements.spinBtn.textContent = 'Bet';
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
  
  // Shuffle segments for visual variety
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
  const outerRadius = size / 2 - 5;
  const innerRadius = outerRadius * 0.55; // Ring thickness - 45% of radius
  const segmentAngle = (2 * Math.PI) / currentSegments.length;
  
  wheelCtx.clearRect(0, 0, size, size);
  
  // Draw ring segments
  currentSegments.forEach((segment, i) => {
    const startAngle = i * segmentAngle - Math.PI / 2;
    const endAngle = startAngle + segmentAngle;
    
    // Draw outer arc segment (ring style)
    wheelCtx.beginPath();
    wheelCtx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
    wheelCtx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    wheelCtx.closePath();
    wheelCtx.fillStyle = segment.color;
    wheelCtx.fill();
    
    // Draw segment border
    wheelCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    wheelCtx.lineWidth = 1;
    wheelCtx.stroke();
  });
  
  // Draw inner circle (background color)
  wheelCtx.beginPath();
  wheelCtx.arc(centerX, centerY, innerRadius - 2, 0, Math.PI * 2);
  wheelCtx.fillStyle = '#1a1f26';
  wheelCtx.fill();
  wheelCtx.strokeStyle = '#2a3441';
  wheelCtx.lineWidth = 3;
  wheelCtx.stroke();
}

function updateLegend() {
  if (!elements.legendGrid) return;
  
  const config = WHEEL_CONFIGS[gameState.risk][gameState.segments];
  
  // Sort by multiplier ascending (like the screenshot)
  const sortedConfig = [...config].sort((a, b) => a.multiplier - b.multiplier);
  
  elements.legendGrid.innerHTML = sortedConfig
    .map(item => {
      const multiplierText = item.multiplier === 0 ? '0.00x' : 
                            item.multiplier < 10 ? item.multiplier.toFixed(2) + 'x' : 
                            item.multiplier.toFixed(1) + 'x';
      return `
        <div class="legend-item" data-multiplier="${item.multiplier}">
          <div class="legend-color" style="background: ${item.color}"></div>
          <span class="legend-multiplier">${multiplierText}</span>
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
    elements.spinBtn.textContent = 'Spinning...';
  }
  
  // Place bet using CasinoDB
  const betResult = await window.CasinoDB.placeBet(betAmount, 'wheel');
  if (!betResult.success) {
    showNotification(betResult.error || 'Failed to place bet', 'error');
    gameState.isSpinning = false;
    if (elements.spinBtn) {
      elements.spinBtn.disabled = false;
      elements.spinBtn.classList.remove('spinning');
      elements.spinBtn.textContent = gameState.isAutoMode ? 'Start Auto' : 'Bet';
    }
    return;
  }
  updateBalanceDisplay();
  
  // Update center display during spin
  if (elements.wheelMultiplier) {
    elements.wheelMultiplier.textContent = '?';
    elements.wheelMultiplier.style.color = '#fff';
  }
  
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
  
  // Wait for spin to complete
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  // Calculate which segment is under the pointer (at the top)
  const normalizedRotation = ((gameState.currentRotation % 360) + 360) % 360;
  const offset = segmentAngle * 0.25;
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
  
  // Update center display with result
  if (elements.wheelMultiplier) {
    const multiplierText = winningSegment.multiplier === 0 ? '0.00x' : 
                          winningSegment.multiplier.toFixed(2) + 'x';
    elements.wheelMultiplier.textContent = multiplierText;
    elements.wheelMultiplier.style.color = winningSegment.color;
  }
  
  // Highlight winning legend item
  highlightWinningLegend(winningSegment.multiplier);
  
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
    elements.spinBtn.textContent = gameState.isAutoMode ? (gameState.autoRunning ? 'Stop' : 'Start Auto') : 'Bet';
  }
}

function highlightWinningLegend(multiplier) {
  // Remove previous highlights
  document.querySelectorAll('.legend-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Add highlight to winning multiplier
  const winningItem = document.querySelector(`.legend-item[data-multiplier="${multiplier}"]`);
  if (winningItem) {
    winningItem.classList.add('active');
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
        .map(s => {
          const multiplierText = s.multiplier === 0 ? '0x' : 
                                s.multiplier < 10 ? s.multiplier.toFixed(1) + 'x' : 
                                s.multiplier + 'x';
          return `
            <div class="history-item" style="background: ${s.color}">
              ${multiplierText}
            </div>
          `;
        })
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
