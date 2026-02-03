// ========================================
// HORSE RACING GAME - MULON CASINO
// Straight 100m Track with Trails
// ========================================

// Game Configuration
const config = {
  betAmount: 10,
  laneCount: 4,
  selectedHorse: null,
  sessionProfit: 0,
  racesPlayed: 0,
  bestWin: 0,
  isRacing: false,
  isSignedIn: false,
  skipRequested: false,
  raceDuration: 20000 // 20 seconds
};

// Multipliers based on lane count (more lanes = higher risk = higher multiplier)
const laneMultipliers = {
  4: 2.8,
  6: 4.2,
  8: 5.6,
  10: 7.0
};

// Horse colors
const horseColors = [
  { name: 'Crimson Thunder', color: '#ef4444' },
  { name: 'Blue Lightning', color: '#3b82f6' },
  { name: 'Green Fury', color: '#22c55e' },
  { name: 'Golden Storm', color: '#f59e0b' },
  { name: 'Purple Blaze', color: '#a855f7' },
  { name: 'Pink Phantom', color: '#ec4899' },
  { name: 'Teal Tornado', color: '#14b8a6' },
  { name: 'Orange Comet', color: '#f97316' },
  { name: 'Indigo Spirit', color: '#6366f1' },
  { name: 'Lime Rocket', color: '#84cc16' }
];

// Horse stats (randomized each race)
let horses = [];
let raceAnimationId = null;

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

// Generate horses with random stats
function generateHorses() {
  horses = [];
  for (let i = 0; i < config.laneCount; i++) {
    horses.push({
      id: i,
      name: horseColors[i].name,
      color: horseColors[i].color,
      speed: 70 + Math.random() * 30, // 70-100
      stamina: 70 + Math.random() * 30, // 70-100
      luck: 50 + Math.random() * 50, // 50-100
      position: 0, // Progress 0-100%
      finished: false
    });
  }
  renderHorseList();
  renderTrack();
  updateTimer(0);
}

// Render horse selection list
function renderHorseList() {
  const listEl = document.getElementById('horseList');
  listEl.innerHTML = '';

  horses.forEach((horse, index) => {
    const item = document.createElement('div');
    item.className = 'horse-item' + (config.selectedHorse === index ? ' selected' : '');
    item.dataset.index = index;

    item.innerHTML = `
      <div class="horse-dot horse-color-${index}"></div>
      <div class="horse-info">
        <div class="horse-name">${horse.name}</div>
        <div class="horse-stats">
          <span class="horse-stat">SPD: <span>${Math.round(horse.speed)}</span></span>
          <span class="horse-stat">STA: <span>${Math.round(horse.stamina)}</span></span>
          <span class="horse-stat">LCK: <span>${Math.round(horse.luck)}</span></span>
        </div>
      </div>
    `;

    item.addEventListener('click', () => selectHorse(index));
    listEl.appendChild(item);
  });
}

// Select a horse
function selectHorse(index) {
  if (config.isRacing) return;
  
  config.selectedHorse = index;
  
  // Update UI
  document.querySelectorAll('.horse-item').forEach((item, i) => {
    item.classList.toggle('selected', i === index);
  });
  
  updatePotentialWin();
}

// Render the straight track with lanes
function renderTrack() {
  const lanesEl = document.getElementById('trackLanes');
  lanesEl.innerHTML = '';

  horses.forEach((horse, index) => {
    // Create lane
    const lane = document.createElement('div');
    lane.className = 'track-lane';
    lane.id = `lane-${index}`;

    // Lane number
    const laneNum = document.createElement('div');
    laneNum.className = 'lane-number';
    laneNum.style.background = horse.color;
    laneNum.textContent = index + 1;
    lane.appendChild(laneNum);

    // Lane markings (10 marks for 10m intervals)
    const markings = document.createElement('div');
    markings.className = 'lane-markings';
    for (let i = 0; i < 11; i++) {
      const mark = document.createElement('div');
      mark.className = 'lane-mark';
      markings.appendChild(mark);
    }
    lane.appendChild(markings);

    // Horse trail
    const trail = document.createElement('div');
    trail.className = `horse-trail trail-color-${index}`;
    trail.id = `trail-${index}`;
    trail.style.width = '0px';
    lane.appendChild(trail);

    // Horse dot
    const horseEl = document.createElement('div');
    horseEl.className = `track-horse horse-color-${index}`;
    horseEl.id = `horse-${index}`;
    lane.appendChild(horseEl);

    lanesEl.appendChild(lane);
  });
}

// Update horse position on straight track
function updateHorsePosition(horseIndex, progress) {
  const lane = document.getElementById(`lane-${horseIndex}`);
  const horseEl = document.getElementById(`horse-${horseIndex}`);
  const trailEl = document.getElementById(`trail-${horseIndex}`);
  
  if (!lane || !horseEl || !trailEl) return;
  
  // Track dimensions (50px padding on each side for start/finish)
  const laneWidth = lane.offsetWidth;
  const trackStart = 50;
  const trackEnd = laneWidth - 74; // Account for finish line width
  const trackLength = trackEnd - trackStart;
  
  // Calculate pixel position
  const pixelPos = trackStart + (progress / 100) * trackLength;
  
  // Update horse position
  horseEl.style.left = `${pixelPos}px`;
  
  // Update trail width
  trailEl.style.width = `${Math.max(0, pixelPos - trackStart)}px`;
}

// Update timer display
function updateTimer(elapsed) {
  const timerEl = document.getElementById('raceTimer');
  const seconds = (elapsed / 1000).toFixed(2);
  timerEl.textContent = `${seconds}s`;
}
// Update potential win display
function updatePotentialWin() {
  const multiplier = laneMultipliers[config.laneCount];
  const potentialWin = config.betAmount * multiplier;
  
  document.getElementById('potentialWin').textContent = '$' + potentialWin.toFixed(2);
  document.getElementById('potentialMult').textContent = multiplier + 'x multiplier';
  document.getElementById('betBtnAmount').textContent = config.betAmount;
}

// Start race
async function startRace() {
  // Check if signed in
  if (!config.isSignedIn) {
    alert('Please sign in to play!');
    return;
  }
  
  // Check if horse selected
  if (config.selectedHorse === null) {
    alert('Please select a horse to bet on!');
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
  const result = await window.CasinoDB.placeBet(config.betAmount, 'horses');
  if (!result.success) {
    alert(result.error || 'Failed to place bet');
    return;
  }
  
  updateBalanceDisplay();
  
  config.isRacing = true;
  config.skipRequested = false;
  config.racesPlayed++;
  document.getElementById('racesPlayed').textContent = config.racesPlayed;
  
  // Add warning for refreshing during race
  window.onbeforeunload = function(e) {
    const message = 'Race in progress! Leaving now will result in loss of your bet.';
    e.returnValue = message;
    return message;
  };
  
  // Disable controls
  document.getElementById('betBtn').disabled = true;
  document.querySelectorAll('.lane-btn').forEach(btn => btn.disabled = true);
  document.querySelectorAll('.bet-adj').forEach(btn => btn.disabled = true);
  document.getElementById('betAmount').disabled = true;
  
  // Show skip button
  document.getElementById('skipBtn').style.display = 'flex';
  
  // Update status and show warning
  const statusEl = document.getElementById('raceStatus');
  statusEl.querySelector('.status-text').textContent = '🏇 And they\'re off!';
  statusEl.querySelector('.status-text').className = 'status-text racing';
  document.getElementById('raceWarning').classList.add('show');
  
  // Hide game over overlay
  document.getElementById('gameOverOverlay').classList.remove('show');
  
  // Reset timer
  updateTimer(0);
  
  // Run the race
  await runRace();
}

// Run the race animation
async function runRace() {
  // Reset positions and trails
  horses.forEach((horse, index) => {
    horse.position = 0;
    horse.finished = false;
    horse.currentSpeed = 1.0;
    // Generate random speed phases for comebacks (surge at different points)
    horse.surgePoint = 0.4 + Math.random() * 0.4; // Surge between 40-80% of race
    horse.surgeStrength = 0.8 + Math.random() * 0.4; // 0.8-1.2x speed modifier
    horse.fatiguePoint = 0.2 + Math.random() * 0.3; // Fatigue between 20-50%
    updateHorsePosition(index, 0);
  });
  
  // Determine winner and finish times based on stats
  const finishOrder = calculateFinishOrder();
  let winner = finishOrder[0].index;
  
  // Base race duration is 10 seconds
  const baseDuration = config.raceDuration;
  const skipDuration = 800; // Skip to 0.8 seconds
  
  const startTime = Date.now();
  let lastFrameTime = startTime;
  
  return new Promise((resolve) => {
    function animateFrame() {
      const now = Date.now();
      let elapsed = now - startTime;
      
      // If skip requested, fast forward
      if (config.skipRequested) {
        elapsed = baseDuration;
      }
      
      const duration = config.skipRequested ? skipDuration : baseDuration;
      let progress = Math.min(elapsed / duration, 1);
      
      // Update timer
      updateTimer(Math.min(elapsed, baseDuration));
      
      // Update each horse position with individual timing
      horses.forEach((horse, index) => {
        const horseFinishData = finishOrder.find(f => f.index === index);
        const finishTime = horseFinishData.finishTime;
        
        // Each horse has their own race time based on stats
        let horseProgress;
        const horseElapsed = elapsed / finishTime;
        const racePhase = elapsed / baseDuration; // 0-1 representing race progress
        
        // Calculate dynamic speed modifier for comebacks
        let speedMod = 1.0;
        
        // Fatigue phase - horse slows down (allows others to catch up)
        if (racePhase > horse.fatiguePoint && racePhase < horse.surgePoint) {
          speedMod = 0.85 + (horse.stamina / 100) * 0.15; // Stamina reduces fatigue
        }
        
        // Surge phase - horse speeds up (comeback potential)
        if (racePhase >= horse.surgePoint && racePhase < horse.surgePoint + 0.2) {
          speedMod = horse.surgeStrength + (horse.luck / 100) * 0.2; // Luck boosts surge
        }
        
        if (horseElapsed >= 1) {
          horseProgress = 100;
          horse.finished = true;
        } else {
          // Smooth forward progress with easing and speed modifier
          const baseProgress = easeInOutQuad(horseElapsed) * 100;
          // Apply speed modifier smoothly
          horseProgress = baseProgress * (0.7 + speedMod * 0.3);
          horseProgress = Math.min(100, horseProgress);
        }
        
        // Ensure horse never moves backward - only forward
        if (horseProgress < horse.position) {
          horseProgress = horse.position;
        }
        
        horse.position = horseProgress;
        updateHorsePosition(index, horseProgress);
      });
      
      // Check if any horse has crossed the finish line
      const finishedHorses = horses.filter(h => h.position >= 100);
      const anyFinished = finishedHorses.length > 0;
      
      if (anyFinished || config.skipRequested) {
        // Find horses that are very close (within 1% for tie detection)
        const tieThreshold = 1.5; // 1.5% difference counts as a tie
        const maxPosition = Math.max(...horses.map(h => h.position));
        const tiedHorses = horses.filter(h => maxPosition - h.position <= tieThreshold);
        
        // Determine actual winner(s) - the horse(s) with highest position
        let actualWinners = [];
        if (tiedHorses.length > 1 && Math.random() < 0.15) {
          // 15% chance for a tie when horses are close
          actualWinners = tiedHorses.map(h => horses.indexOf(h));
        } else {
          // Find the horse with highest position (actual leader)
          const leadingHorse = horses.reduce((max, h) => h.position > max.position ? h : max, horses[0]);
          actualWinners = [horses.indexOf(leadingHorse)];
        }
        
        // Cancel animation
        if (raceAnimationId) {
          cancelAnimationFrame(raceAnimationId);
        }
        
        // Finish race with current elapsed time
        updateTimer(elapsed);
        finishRace(actualWinners);
        resolve();
      } else {
        raceAnimationId = requestAnimationFrame(animateFrame);
      }
    }
    
    raceAnimationId = requestAnimationFrame(animateFrame);
  });
}

// Calculate finish order based on stats
function calculateFinishOrder() {
  // Base finish time is ~20 seconds
  // Better stats = faster time, but differences are small for close finishes
  const baseDuration = config.raceDuration;
  
  const finishData = horses.map((horse, index) => {
    // Calculate performance score (0-100)
    const performanceScore = horse.speed * 0.5 + horse.stamina * 0.3 + horse.luck * 0.2;
    
    // Reduced randomness (±5% variation) for closer finishes
    const randomFactor = 0.95 + Math.random() * 0.10;
    
    // Higher score = faster finish time
    // Reduced stat impact: Score of 100 = baseDuration * 0.94, Score of 70 = baseDuration * 1.0
    // This creates a max ~6% spread between best and worst horses
    const timeFactor = 1.06 - (performanceScore / 100) * 0.12;
    const finishTime = baseDuration * timeFactor * randomFactor;
    
    return { index, finishTime, score: performanceScore };
  });
  
  // Sort by finish time (fastest first)
  finishData.sort((a, b) => a.finishTime - b.finishTime);
  
  return finishData;
}

// Easing functions
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

// Finish race - winners can be an array for ties
async function finishRace(winners) {
  // Normalize to array
  if (!Array.isArray(winners)) {
    winners = [winners];
  }
  
  const isTie = winners.length > 1;
  
  config.isRacing = false;
  
  // Remove beforeunload warning since race is complete
  window.onbeforeunload = null;
  
  // Hide warning banner
  document.getElementById('raceWarning').classList.remove('show');
  
  // Add winner class to winning horse(s)
  winners.forEach(winnerIndex => {
    const winnerEl = document.getElementById(`horse-${winnerIndex}`);
    if (winnerEl) {
      winnerEl.classList.add('winner');
    }
  });
  
  // Hide skip button
  document.getElementById('skipBtn').style.display = 'none';
  
  // Check if player won (or tied)
  const playerWon = winners.includes(config.selectedHorse);
  const multiplier = laneMultipliers[config.laneCount];
  
  if (playerWon) {
    // Calculate winnings
    const winAmount = Math.round(config.betAmount * multiplier * 100) / 100;
    const profit = Math.round((winAmount - config.betAmount) * 100) / 100;
    
    // Record win in database
    await window.CasinoDB.recordWin(winAmount, config.betAmount);
    
    // Record game result in session
    if (window.CasinoDB && window.CasinoDB.recordGameResult) {
      await window.CasinoDB.recordGameResult('horses', config.betAmount, winAmount);
    }
    
    // Award XPs
    try {
      const xpResult = await window.CasinoDB.awardXPs('horses', multiplier, config.betAmount);
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
      document.getElementById('bestWin').textContent = '$' + config.bestWin.toFixed(2);
    }
    
    // Show win overlay
    showGameOver(true, winAmount, winners, isTie);
  } else {
    // Player lost
    config.sessionProfit -= config.betAmount;
    
    // Update profit graph
    if (window.ProfitGraph) {
      window.ProfitGraph.addPoint(-config.betAmount);
    }
    
    // Record loss - deducts 1 key and resets streak
    await window.CasinoDB.recordLoss('horses');
    await window.CasinoDB.resetStreak();
    updateKeysDisplay();
    
    // Record game result in session
    if (window.CasinoDB && window.CasinoDB.recordGameResult) {
      await window.CasinoDB.recordGameResult('horses', config.betAmount, 0);
    }
    
    // Show lose overlay
    showGameOver(false, config.betAmount, winners, isTie);
  }
  
  updateBalanceDisplay();
  updateProfitDisplay();
  
  // Update status
  const statusEl = document.getElementById('raceStatus');
  if (isTie) {
    const tiedNames = winners.map(i => horses[i].name).join(' & ');
    statusEl.querySelector('.status-text').textContent = `🏆 TIE! ${tiedNames}!`;
  } else {
    statusEl.querySelector('.status-text').textContent = `🏆 ${horses[winners[0]].name} wins!`;
  }
  statusEl.querySelector('.status-text').className = 'status-text finished';
}

// Show game over overlay
function showGameOver(won, amount, winners, isTie) {
  const overlay = document.getElementById('gameOverOverlay');
  const title = document.getElementById('gameOverTitle');
  const amountEl = document.getElementById('gameOverAmount');
  const details = document.getElementById('gameOverDetails');
  
  if (won) {
    if (isTie) {
      title.textContent = '🤝 Tie - You Won!';
      details.textContent = `Your horse ${horses[config.selectedHorse].name} tied for first!`;
    } else {
      title.textContent = '🎉 You Won!';
      details.textContent = `Your horse ${horses[config.selectedHorse].name} finished first!`;
    }
    title.className = 'game-over-title win';
    amountEl.textContent = '+$' + amount.toFixed(2);
    amountEl.style.color = '#22c55e';
  } else {
    title.textContent = '😢 You Lost';
    title.className = 'game-over-title lose';
    amountEl.textContent = '-$' + amount.toFixed(2) + ' & -1 🔑';
    amountEl.style.color = '#ef4444';
    if (isTie) {
      const tiedNames = winners.map(i => horses[i].name).join(' & ');
      details.textContent = `${tiedNames} tied for the win.`;
    } else {
      details.textContent = `${horses[winners[0]].name} won the race.`;
    }
  }
  
  overlay.classList.add('show');
}

// Reset for new race
function resetGame() {
  document.getElementById('gameOverOverlay').classList.remove('show');
  
  // Cancel any ongoing animation
  if (raceAnimationId) {
    cancelAnimationFrame(raceAnimationId);
    raceAnimationId = null;
  }
  
  // Re-enable controls
  document.getElementById('betBtn').disabled = false;
  document.querySelectorAll('.lane-btn').forEach(btn => btn.disabled = false);
  document.querySelectorAll('.bet-adj').forEach(btn => btn.disabled = false);
  document.getElementById('betAmount').disabled = false;
  
  // Generate new horses (this also resets the track)
  generateHorses();
  
  // Reset selected horse
  config.selectedHorse = null;
  
  // Reset timer
  updateTimer(0);
  
  // Update status
  const statusEl = document.getElementById('raceStatus');
  statusEl.querySelector('.status-text').textContent = 'Select a horse and place your bet!';
  statusEl.querySelector('.status-text').className = 'status-text';
}

// Skip animation
function skipAnimation() {
  config.skipRequested = true;
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
  if (config.isRacing) return;
  const input = document.getElementById('betAmount');
  config.betAmount = Math.max(1, Math.min(1000, Math.round(config.betAmount * mult)));
  input.value = config.betAmount;
  updatePotentialWin();
}

// Event listeners
document.getElementById('betBtn').addEventListener('click', startRace);
document.getElementById('playAgainBtn').addEventListener('click', resetGame);
document.getElementById('skipBtn').addEventListener('click', skipAnimation);

document.getElementById('betAmount').addEventListener('change', (e) => {
  config.betAmount = Math.max(1, Math.min(1000, parseFloat(e.target.value) || 10));
  e.target.value = config.betAmount;
  updatePotentialWin();
});

document.getElementById('betAmount').addEventListener('keyup', (e) => {
  config.betAmount = Math.max(1, Math.min(1000, parseFloat(e.target.value) || 10));
  updatePotentialWin();
});

// Lane selection buttons
document.querySelectorAll('.lane-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (config.isRacing) return;
    
    const lanes = parseInt(btn.dataset.lanes);
    config.laneCount = lanes;
    config.selectedHorse = null;
    
    document.querySelectorAll('.lane-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    generateHorses();
    updatePotentialWin();
  });
});

// Initialize display
document.addEventListener('DOMContentLoaded', async () => {
  generateHorses();
  updatePotentialWin();
  
  // Wait for auth module to load
  await waitForAuth();
  
  // Initialize auth with maintenance check
  const hasAccess = await window.CasinoAuth.initWithMaintenanceCheck();
  if (!hasAccess) return;
  
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

// Session tracking
window.addEventListener('beforeunload', () => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    window.CasinoDB.endGameSession('user_left');
  }
});

// Also run immediately in case DOM is already loaded
if (document.readyState !== 'loading') {
  generateHorses();
  updatePotentialWin();
}
