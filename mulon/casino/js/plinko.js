// ========================================
// PLINKO GAME - STAKE STYLE
// ========================================

const { Engine, Render, Runner, Bodies, Body, Composite, Events } = Matter;

// Config
const config = {
  rows: 16,
  risk: 'low',
  betAmount: 10,
  sessionProfit: 0,
  ballsDropped: 0,
  bestWin: 0,
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

// Multiplier tables (Stake style - hard center)
// Stake percentages: Low 50%, Medium 30%, High 20%
const multiplierTables = {
  low: {
    16: [16, 9, 4, 2, 1.7, 1.4, 0.6, 0.1, 0.1, 0.1, 0.6, 1.4, 1.7, 2, 4, 9, 16],
    stake: 0.50 // 50% of stake
  },
  medium: {
    16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    stake: 0.30 // 30% of stake
  },
  high: {
    16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
    stake: 0.20 // 20% of stake
  }
};

// Canvas setup
const canvas = document.getElementById('plinkoCanvas');
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

// Physics engine
const engine = Engine.create();
const world = engine.world;
engine.gravity.y = 0.6;

// Renderer
const render = Render.create({
  canvas: canvas,
  engine: engine,
  options: {
    width: canvasWidth,
    height: canvasHeight,
    wireframes: false,
    background: 'transparent'
  }
});

let pegs = [];
let bucketWalls = [];
let balls = [];
let buckets = [];
let hitBuckets = {}; // Track hit animation state per bucket index

const ballColor = '#fbbf24';

// Rate limiting for ball drops (max 4 balls per second)
let lastDropTime = 0;
const MIN_DROP_INTERVAL = 250; // 250ms = 4 balls per second max

function setBetControlsLocked(locked) {
  const betInput = document.getElementById('betAmount');
  if (betInput) betInput.disabled = locked;

  document.querySelectorAll('.bet-adj').forEach(btn => {
    btn.disabled = locked;
  });
}

function hasBallsInPlay() {
  return balls.length > 0;
}

// Initialize board
function initBoard() {
  Composite.clear(world);
  pegs = [];
  bucketWalls = [];
  buckets = [];

  const rows = config.rows;
  const pegRadius = 3;
  const startY = 60;
  const endY = canvasHeight - 70;
  const rowHeight = (endY - startY) / rows;
  
  const boardWidth = canvasWidth - 100;
  const pegSpacingX = boardWidth / (rows + 1);

  // Create pegs
  for (let row = 0; row < rows; row++) {
    const pegsInRow = row + 3;
    const rowWidth = (pegsInRow - 1) * pegSpacingX;
    const rowStartX = (canvasWidth - rowWidth) / 2;
    const y = startY + row * rowHeight;

    for (let col = 0; col < pegsInRow; col++) {
      const x = rowStartX + col * pegSpacingX;
      const peg = Bodies.circle(x, y, pegRadius, {
        isStatic: true,
        render: {
          fillStyle: '#6366f1',
          strokeStyle: '#818cf8',
          lineWidth: 1
        },
        restitution: 0.5,
        friction: 0.1,
        label: 'peg'
      });
      pegs.push(peg);
    }
  }

  // Create buckets
  const bucketY = canvasHeight - 35;
  const bucketHeight = 55;
  const multipliers = multiplierTables[config.risk][config.rows];
  const numBuckets = multipliers.length;
  const bucketWidth = boardWidth / numBuckets;
  const bucketsStartX = (canvasWidth - (bucketWidth * numBuckets)) / 2;

  for (let i = 0; i <= numBuckets; i++) {
    const x = bucketsStartX + i * bucketWidth;
    const wall = Bodies.rectangle(x, bucketY, 3, bucketHeight, {
      isStatic: true,
      render: { fillStyle: '#374151' },
      chamfer: { radius: 2 },
      label: 'bucketWall'
    });
    bucketWalls.push(wall);
  }

  for (let i = 0; i < numBuckets; i++) {
    buckets.push({
      x: bucketsStartX + i * bucketWidth + bucketWidth / 2,
      width: bucketWidth,
      multiplier: multipliers[i],
      index: i
    });
  }

  // Walls
  const leftWall = Bodies.rectangle(40, canvasHeight / 2, 10, canvasHeight, {
    isStatic: true, render: { fillStyle: '#374151' }, label: 'wall'
  });
  const rightWall = Bodies.rectangle(canvasWidth - 40, canvasHeight / 2, 10, canvasHeight, {
    isStatic: true, render: { fillStyle: '#374151' }, label: 'wall'
  });
  const floor = Bodies.rectangle(canvasWidth / 2, canvasHeight - 5, canvasWidth, 10, {
    isStatic: true, render: { fillStyle: '#374151' }, label: 'floor'
  });

  Composite.add(world, [...pegs, ...bucketWalls, leftWall, rightWall, floor]);
}

// Draw multipliers on canvas (called every frame via custom afterRender)
function drawMultipliers() {
  const ctx = canvas.getContext('2d');
  const multipliers = multiplierTables[config.risk][config.rows];
  const numBuckets = multipliers.length;
  const boardWidth = canvasWidth - 100;
  const bucketWidth = boardWidth / numBuckets;
  const bucketsStartX = (canvasWidth - (bucketWidth * numBuckets)) / 2;
  const bucketY = canvasHeight - 35;

  multipliers.forEach((mult, i) => {
    const x = bucketsStartX + i * bucketWidth + bucketWidth / 2;
    const w = bucketWidth - 4;
    const h = 22;
    const y = bucketY + 12;

    // Gradient fill
    const grad = ctx.createLinearGradient(x - w / 2, y - h / 2, x - w / 2, y + h / 2);
    const colors = getMultGradientColors(mult);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);

    ctx.fillStyle = grad;

    // Scale up if hit
    let scale = 1;
    if (hitBuckets[i]) {
      scale = 1.18;
      ctx.shadowColor = colors[0];
      ctx.shadowBlur = 16;
    } else {
      ctx.shadowBlur = 0;
    }

    const sw = w * scale;
    const sh = h * scale;

    // Rounded rect
    const r = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(x - sw / 2 + r, y - sh / 2);
    ctx.lineTo(x + sw / 2 - r, y - sh / 2);
    ctx.quadraticCurveTo(x + sw / 2, y - sh / 2, x + sw / 2, y - sh / 2 + r);
    ctx.lineTo(x + sw / 2, y + sh / 2 - r);
    ctx.quadraticCurveTo(x + sw / 2, y + sh / 2, x + sw / 2 - r, y + sh / 2);
    ctx.lineTo(x - sw / 2 + r, y + sh / 2);
    ctx.quadraticCurveTo(x - sw / 2, y + sh / 2, x - sw / 2, y + sh / 2 - r);
    ctx.lineTo(x - sw / 2, y - sh / 2 + r);
    ctx.quadraticCurveTo(x - sw / 2, y - sh / 2, x - sw / 2 + r, y - sh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(10 * scale)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mult + 'x', x, y + 1);
  });
}

function getMultGradientColors(mult) {
  if (mult >= 100) return ['#dc2626', '#991b1b'];
  if (mult >= 20) return ['#ea580c', '#c2410c'];
  if (mult >= 5) return ['#f59e0b', '#d97706'];
  if (mult >= 2) return ['#eab308', '#ca8a04'];
  if (mult >= 1) return ['#22c55e', '#16a34a'];
  if (mult >= 0.5) return ['#3b82f6', '#2563eb'];
  return ['#6b7280', '#4b5563'];
}

function getMultColor(mult) {
  if (mult >= 100) return 'linear-gradient(180deg, #dc2626, #991b1b)';
  if (mult >= 20) return 'linear-gradient(180deg, #ea580c, #c2410c)';
  if (mult >= 5) return 'linear-gradient(180deg, #f59e0b, #d97706)';
  if (mult >= 2) return 'linear-gradient(180deg, #eab308, #ca8a04)';
  if (mult >= 1) return 'linear-gradient(180deg, #22c55e, #16a34a)';
  if (mult >= 0.5) return 'linear-gradient(180deg, #3b82f6, #2563eb)';
  return 'linear-gradient(180deg, #6b7280, #4b5563)';
}

// Drop ball
async function dropBall() {
  // Rate limit: max 4 balls per second (250ms between drops)
  const now = Date.now();
  if (now - lastDropTime < MIN_DROP_INTERVAL) {
    return; // Ignore spam clicks
  }
  lastDropTime = now;
  
  // Check if signed in
  if (!config.isSignedIn) {
    alert('Please sign in to play!');
    return;
  }
  
  // Check if user has balls/keys using the quota system
  const ballResult = await window.CasinoDB.usePlinkoBall();
  if (!ballResult.success) {
    alert(ballResult.error || 'You need keys to play! Come back tomorrow for free keys.');
    return;
  }
  
  // Update keys and balls display
  updateKeysDisplay();
  updateBallsDisplay();
  
  const currentBalance = window.CasinoAuth.getBalance();
  if (currentBalance < config.betAmount) {
    alert('Insufficient balance!');
    return;
  }

  // Place bet
  const result = await window.CasinoDB.placeBet(config.betAmount, 'plinko');
  if (!result.success) {
    alert(result.error || 'Failed to place bet');
    return;
  }
  
  updateBalanceDisplay();

  // Gaussian offset for rigging
  const r1 = Math.random(), r2 = Math.random();
  const gaussianOffset = ((r1 + r2) / 2 - 0.5) * 20;
  
  const ball = Bodies.circle(canvasWidth / 2 + gaussianOffset, 35, 7, {
    restitution: 0.6,
    friction: 0.05,
    frictionAir: 0.01,
    density: 0.001,
    render: {
      fillStyle: ballColor,
      strokeStyle: '#fff',
      lineWidth: 1.5
    },
    label: 'ball',
    betAmount: config.betAmount
  });

  Body.setVelocity(ball, { x: (Math.random() - 0.5) * 1, y: 2 });
  balls.push(ball);
  Composite.add(world, ball);

  // Track pending balls in database (for refresh penalty)
  await window.CasinoDB.setPendingPlinkoBalls(balls.length);

  // Lock bet sizing controls while balls are moving
  setBetControlsLocked(true);
  
  config.ballsDropped++;
  document.getElementById('ballsDropped').textContent = config.ballsDropped;

  // Button animation
  const btn = document.getElementById('dropBtn');
  btn.style.transform = 'scale(0.95)';
  setTimeout(() => btn.style.transform = '', 100);
}

// Check ball landing
function checkBallLanding(ball) {
  // Initialize drop time if not set (for timeout-based fallback)
  if (!ball.dropTime) {
    ball.dropTime = Date.now();
  }
  
  const isNearBottom = ball.position.y > canvasHeight - 50;
  const isSlowEnough = Math.abs(ball.velocity.y) < 2 && Math.abs(ball.velocity.x) < 2;
  const isVeryNearBottom = ball.position.y > canvasHeight - 35; // In bucket zone
  const hasTimedOut = (Date.now() - ball.dropTime) > 15000; // 15 second max
  
  // Land if: (near bottom AND slow) OR (very near bottom) OR (timed out)
  if ((isNearBottom && isSlowEnough) || isVeryNearBottom || hasTimedOut) {
    const ballX = ball.position.x;
    let landedBucket = null;

    for (const bucket of buckets) {
      if (ballX >= bucket.x - bucket.width / 2 && ballX < bucket.x + bucket.width / 2) {
        landedBucket = bucket;
        break;
      }
    }

    if (landedBucket) {
      // Use the bet amount stored on the ball when it was dropped (not current config)
      const ballBetAmount = ball.betAmount || config.betAmount;
      // Calculate winnings based on multiplier and bet amount
      const winAmount = Math.round(ballBetAmount * landedBucket.multiplier * 100) / 100;
      const profit = Math.round((winAmount - ballBetAmount) * 100) / 100;
      
      // Record game result in session
      if (window.CasinoDB && window.CasinoDB.recordGameResult) {
        window.CasinoDB.recordGameResult('plinko', ballBetAmount, winAmount)
          .catch(err => console.error('Error recording game result:', err));
      }
      
      // Record win in database if won anything
      if (winAmount > 0) {
        window.CasinoDB.recordWin(winAmount, ballBetAmount)
          .then(() => updateBalanceDisplay())
          .catch(() => {});
        
        // Award xps only for 2x+ multiplier wins
        if (landedBucket.multiplier >= 2) {
          window.CasinoDB.awardXPs('plinko', landedBucket.multiplier, ballBetAmount)
            .then(result => {
              console.log('Plinko xp result:', result);
              if (result && result.success && result.xpsEarned > 0) {
                updateXPsDisplay();
                showXPGain(result.xpsEarned, result.streak, result.streakMultiplier);
              }
            })
            .catch(err => console.error('Error awarding xps:', err));
        } else {
          // Reset streak on sub-2x win
          window.CasinoDB.resetStreak();
        }
      }
      
      config.sessionProfit += profit;
      
      // Update profit graph
      if (window.ProfitGraph) {
        window.ProfitGraph.addPoint(profit);
      }
      
      if (profit > config.bestWin) {
        config.bestWin = profit;
        document.getElementById('bestWin').textContent = '$' + config.bestWin.toFixed(2);
      }

      // Balance already updated for the bet; update again here so losses display immediately.
      // Wins update the balance once the async DB write completes (see recordWin above).
      updateBalanceDisplay();
      updateProfitDisplay();
      addResult(landedBucket.multiplier, profit);
      animateBucket(landedBucket.index);
      
      if (landedBucket.multiplier >= 10) {
        showBigWin(winAmount, landedBucket.multiplier);
      }
    }

    Composite.remove(world, ball);
    balls = balls.filter(b => b !== ball);

    // Update pending balls count in database
    window.CasinoDB.setPendingPlinkoBalls(balls.length);

    // Re-enable bet sizing once all balls are cleared
    if (!hasBallsInPlay()) {
      setBetControlsLocked(false);
    }
  }
}

function animateBucket(index) {
  hitBuckets[index] = true;
  setTimeout(() => { delete hitBuckets[index]; }, 400);
}

function showBigWin(amount, mult) {
  const popup = document.createElement('div');
  popup.className = 'win-popup';
  popup.innerHTML = `
    <h3>🎉 BIG WIN!</h3>
    <div class="win-amount">+$${amount.toFixed(2)}</div>
    <div class="win-mult">${mult}x Multiplier</div>
  `;
  document.body.appendChild(popup);
  
  setTimeout(() => {
    popup.classList.add('hide');
    setTimeout(() => popup.remove(), 300);
  }, 2000);
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

function addResult(mult, profit) {
  const history = document.getElementById('resultsHistory');
  const noResults = history.querySelector('div[style]');
  if (noResults) noResults.remove();

  const isWin = profit >= 0;
  const isBigWin = mult >= 5;
  
  const item = document.createElement('div');
  item.className = `result-item ${isWin ? (isBigWin ? 'big-win' : 'win') : 'loss'}`;
  item.innerHTML = `
    <span style="color: ${getMultTextColor(mult)}">${mult}x</span>
    <span style="color: ${isWin ? '#22c55e' : '#ef4444'}">${isWin ? '+' : ''}$${profit.toFixed(2)}</span>
  `;
  
  history.insertBefore(item, history.firstChild);
  while (history.children.length > 12) history.removeChild(history.lastChild);
}

function getMultTextColor(mult) {
  if (mult >= 100) return '#ef4444';
  if (mult >= 20) return '#f97316';
  if (mult >= 5) return '#fbbf24';
  if (mult >= 2) return '#facc15';
  if (mult >= 1) return '#22c55e';
  return '#6b7280';
}

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

function updateBallsDisplay() {
  const balls = window.CasinoAuth?.getPlinkoBalls() ?? 45;
  const ballsEl = document.getElementById('ballsRemaining');
  if (ballsEl) {
    ballsEl.textContent = balls;
  }
}

function updateProfitDisplay() {
  const el = document.getElementById('sessionProfit');
  const fmt = window.FormatUtils;
  el.textContent = fmt ? fmt.formatProfit(config.sessionProfit) : ((config.sessionProfit >= 0 ? '+' : '') + '$' + config.sessionProfit.toFixed(2));
  el.className = 'stat-value ' + (config.sessionProfit >= 0 ? 'profit' : 'loss');
}

function adjustBet(mult) {
  if (hasBallsInPlay()) return;
  const input = document.getElementById('betAmount');
  config.betAmount = Math.max(1, Math.min(1000, Math.round(config.betAmount * mult)));
  input.value = config.betAmount;
}

// ========================================
// AUTO MODE
// ========================================
const autoConfig = {
  isRunning: false,
  intervalId: null,
  dropsPerSecond: 3,
  totalDrops: 50,
  dropsRemaining: 0,
  stopOnProfit: 100,
  stopOnLoss: 50,
  autoProfit: 0,
  startingBalance: 0
};

function switchTab(tab) {
  const manualTab = document.getElementById('tabManual');
  const autoTab = document.getElementById('tabAuto');
  const manualControls = document.getElementById('manualControls');
  const autoControls = document.getElementById('autoControls');
  
  if (tab === 'manual') {
    manualTab.classList.add('active');
    autoTab.classList.remove('active');
    manualControls.style.display = 'block';
    autoControls.style.display = 'none';
  } else {
    manualTab.classList.remove('active');
    autoTab.classList.add('active');
    manualControls.style.display = 'none';
    autoControls.style.display = 'block';
    
    // Sync bet amount from manual to auto
    document.getElementById('autoBetAmount').value = config.betAmount;
  }
}

function adjustAutoBet(mult) {
  if (autoConfig.isRunning) return;
  const input = document.getElementById('autoBetAmount');
  let currentBet = parseFloat(input.value) || 10;
  currentBet = Math.max(1, Math.min(1000, Math.round(currentBet * mult)));
  input.value = currentBet;
  config.betAmount = currentBet;
}

function startAuto() {
  if (!config.isSignedIn) {
    alert('Please sign in to play!');
    return;
  }
  
  // Get auto settings
  config.betAmount = parseFloat(document.getElementById('autoBetAmount').value) || 10;
  // Cap auto speed at 4 balls per second max
  autoConfig.dropsPerSecond = Math.min(4, parseInt(document.getElementById('autoSpeedSelect').value) || 3);
  autoConfig.totalDrops = parseInt(document.getElementById('autoDropCount').value) || 50;
  autoConfig.stopOnProfit = parseFloat(document.getElementById('autoStopProfit').value) || 0;
  autoConfig.stopOnLoss = parseFloat(document.getElementById('autoStopLoss').value) || 0;
  
  autoConfig.dropsRemaining = autoConfig.totalDrops;
  autoConfig.autoProfit = 0;
  autoConfig.startingBalance = window.CasinoAuth.getBalance();
  autoConfig.isRunning = true;
  
  // Update UI
  document.getElementById('autoStartBtn').style.display = 'none';
  document.getElementById('autoStopBtn').style.display = 'block';
  document.getElementById('autoBetAmount').disabled = true;
  document.getElementById('autoSpeedSelect').disabled = true;
  document.getElementById('autoDropCount').disabled = true;
  document.getElementById('autoStopProfit').disabled = true;
  document.getElementById('autoStopLoss').disabled = true;
  
  updateAutoDisplay();
  
  // Calculate interval in ms (minimum 250ms = max 4 balls per second)
  const intervalMs = Math.max(MIN_DROP_INTERVAL, 1000 / autoConfig.dropsPerSecond);
  
  // Start auto dropping
  autoConfig.intervalId = setInterval(autoDropBall, intervalMs);
}

function stopAuto() {
  autoConfig.isRunning = false;
  
  if (autoConfig.intervalId) {
    clearInterval(autoConfig.intervalId);
    autoConfig.intervalId = null;
  }
  
  // Update UI
  document.getElementById('autoStartBtn').style.display = 'block';
  document.getElementById('autoStopBtn').style.display = 'none';
  document.getElementById('autoBetAmount').disabled = false;
  document.getElementById('autoSpeedSelect').disabled = false;
  document.getElementById('autoDropCount').disabled = false;
  document.getElementById('autoStopProfit').disabled = false;
  document.getElementById('autoStopLoss').disabled = false;
}

async function autoDropBall() {
  if (!autoConfig.isRunning) return;
  
  // Check if we should stop (totalDrops < 0 means unlimited)
  if (autoConfig.totalDrops >= 0 && autoConfig.dropsRemaining <= 0) {
    stopAuto();
    return;
  }
  
  // Check stop conditions
  const currentBalance = window.CasinoAuth.getBalance();
  const profitSinceStart = currentBalance - autoConfig.startingBalance;
  
  if (autoConfig.stopOnProfit > 0 && profitSinceStart >= autoConfig.stopOnProfit) {
    stopAuto();
    alert(`Auto stopped: Profit target of $${autoConfig.stopOnProfit} reached!`);
    return;
  }
  
  if (autoConfig.stopOnLoss > 0 && profitSinceStart <= -autoConfig.stopOnLoss) {
    stopAuto();
    alert(`Auto stopped: Loss limit of $${autoConfig.stopOnLoss} reached!`);
    return;
  }
  
  // Check balance
  if (currentBalance < config.betAmount) {
    stopAuto();
    alert('Auto stopped: Insufficient balance!');
    return;
  }
  
  // Drop the ball (similar to dropBall but without some checks)
  const ballResult = await window.CasinoDB.usePlinkoBall();
  if (!ballResult.success) {
    stopAuto();
    alert('Auto stopped: No more balls/keys available!');
    return;
  }
  
  updateKeysDisplay();
  updateBallsDisplay();
  
  const result = await window.CasinoDB.placeBet(config.betAmount, 'plinko');
  if (!result.success) {
    stopAuto();
    alert('Auto stopped: Failed to place bet');
    return;
  }
  
  updateBalanceDisplay();
  
  // Random offset for natural variation
  const randomOffset = (Math.random() - 0.5) * 30;
  
  const ball = Bodies.circle(canvasWidth / 2 + randomOffset, 35, 7, {
    restitution: 0.6,
    friction: 0.05,
    frictionAir: 0.01,
    density: 0.001,
    render: {
      fillStyle: ballColor,
      strokeStyle: '#fff',
      lineWidth: 1.5
    },
    label: 'ball',
    betAmount: config.betAmount
  });
  
  Body.setVelocity(ball, { x: (Math.random() - 0.5) * 1, y: 2 });
  balls.push(ball);
  Composite.add(world, ball);
  
  await window.CasinoDB.setPendingPlinkoBalls(balls.length);
  
  config.ballsDropped++;
  document.getElementById('ballsDropped').textContent = config.ballsDropped;
  
  // Decrement drops remaining (only if not unlimited, i.e., totalDrops >= 0)
  if (autoConfig.totalDrops >= 0) {
    autoConfig.dropsRemaining--;
  }
  
  updateAutoDisplay();
}

function updateAutoDisplay() {
  const dropsLeftEl = document.getElementById('autoDropsLeft');
  const autoProfitEl = document.getElementById('autoProfit');
  
  if (dropsLeftEl) {
    dropsLeftEl.textContent = autoConfig.totalDrops < 0 ? '∞' : autoConfig.dropsRemaining;
  }
  
  if (autoProfitEl) {
    const currentBalance = window.CasinoAuth?.getBalance() || 0;
    const profit = currentBalance - autoConfig.startingBalance;
    autoProfitEl.textContent = (profit >= 0 ? '+' : '') + '$' + profit.toFixed(2);
    autoProfitEl.className = 'stat-value ' + (profit >= 0 ? 'profit' : 'loss');
  }
}

// Make functions globally available
window.switchTab = switchTab;
window.adjustAutoBet = adjustAutoBet;

// Event listeners
document.getElementById('dropBtn').addEventListener('click', dropBall);

// Auto mode event listeners
document.getElementById('autoStartBtn').addEventListener('click', startAuto);
document.getElementById('autoStopBtn').addEventListener('click', stopAuto);

document.getElementById('autoBetAmount').addEventListener('change', (e) => {
  // Prevent changes while auto is running OR while balls are in play
  if (autoConfig.isRunning || hasBallsInPlay()) {
    e.target.value = config.betAmount;
    return;
  }
  config.betAmount = Math.max(1, Math.min(1000, parseFloat(e.target.value) || 10));
  e.target.value = config.betAmount;
  // Sync to manual input as well
  document.getElementById('betAmount').value = config.betAmount;
});

document.getElementById('betAmount').addEventListener('change', (e) => {
  if (hasBallsInPlay()) {
    e.target.value = config.betAmount;
    return;
  }
  config.betAmount = Math.max(1, Math.min(1000, parseFloat(e.target.value) || 10));
  e.target.value = config.betAmount;
});

document.getElementById('riskSelect').addEventListener('change', (e) => {
  config.risk = e.target.value;
  initBoard();
});

// Spacebar to drop
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
    e.preventDefault();
    dropBall();
  }
});

// Peg glow on hit
Events.on(engine, 'collisionStart', (event) => {
  event.pairs.forEach(pair => {
    if (pair.bodyA.label === 'peg' || pair.bodyB.label === 'peg') {
      const peg = pair.bodyA.label === 'peg' ? pair.bodyA : pair.bodyB;
      const orig = peg.render.fillStyle;
      peg.render.fillStyle = '#a855f7';
      setTimeout(() => peg.render.fillStyle = orig, 100);
      
      // Create expanding glow effect
      createPegGlow(peg.position.x, peg.position.y);
    }
  });
});

// Expanding glow effect for peg hits
function createPegGlow(x, y) {
  const ctx = canvas.getContext('2d');
  let radius = 2;
  let opacity = 0.8;
  
  function animate() {
    if (opacity <= 0) return;
    
    // Draw glow circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.shadowColor = '#cc9cff59';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.restore();
    
    radius += 1.5;
    opacity -= 0.05;
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

// Check balls + subtle center bias
Events.on(engine, 'afterUpdate', () => {
  balls.forEach(ball => {
    const centerX = canvasWidth / 2;
    const distFromCenter = ball.position.x - centerX;
    
    if (Math.abs(ball.velocity.x) > 0.5) {
      if ((distFromCenter > 0 && ball.velocity.x > 0) || (distFromCenter < 0 && ball.velocity.x < 0)) {
        Body.setVelocity(ball, { x: ball.velocity.x * 0.99, y: ball.velocity.y });
      }
    }
    
    checkBallLanding(ball);
  });
});

// Initialize
initBoard();
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Draw multipliers on top after each render frame
Events.on(render, 'afterRender', () => {
  drawMultipliers();
});

// Auth initialization
(async function initAuth() {
  await waitForAuth();
  
  // Initialize auth with maintenance check
  const hasAccess = await window.CasinoAuth.initWithMaintenanceCheck();
  if (!hasAccess) return; // Stop if redirecting to maintenance
  
  setupAuthUI();
  
  window.CasinoAuth.onAuthStateChange(async (user, userData) => {
    config.isSignedIn = !!user;
    updateAuthUI(user);
    
    if (user) {
      // Check for refresh penalty (balls in play when user refreshed)
      const penaltyResult = await window.CasinoDB.checkRefreshPenalty();
      if (penaltyResult.penalty > 0) {
        showRefreshPenalty(penaltyResult.penalty, penaltyResult.ballsLost);
      }
    }
    
    updateBalanceDisplay();
    updateKeysDisplay();
    updateBallsDisplay();
    updateXPsDisplay();
  });
})();

// Show refresh penalty notification
function showRefreshPenalty(amount, ballsLost) {
  const penaltyEl = document.getElementById('refreshPenaltyNotice');
  if (penaltyEl) {
    penaltyEl.textContent = `⚠️ Refresh penalty: -$${amount.toFixed(2)} (${ballsLost} ball${ballsLost > 1 ? 's' : ''} lost)`;
    penaltyEl.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      penaltyEl.style.display = 'none';
    }, 5000);
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

// ========================================
// SESSION TRACKING - End session on page leave
// ========================================
window.addEventListener('beforeunload', () => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    // End the active plinko session
    window.CasinoDB.endGameSession('user_left');
  }
});

// Session keepalive (update activity every 2 minutes)
setInterval(() => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    window.CasinoDB.updateSessionActivity();
  }
}, 2 * 60 * 1000);
