// ========================================
// ROCK PAPER SCISSORS - CASINO STYLE
// Multi-hand mode with progressive multipliers
// ========================================

// Base multiplier per hand (1.67x with higher payout for 33.33% win chance)
const BASE_MULTIPLIER = 1.67;

// Multiplier presets for each hands count
const MULTIPLIERS = {
  1: Math.pow(BASE_MULTIPLIER, 1),   // 1.20x
  2: Math.pow(BASE_MULTIPLIER, 2),   // 1.44x
  3: Math.pow(BASE_MULTIPLIER, 3),   // 1.73x
  4: Math.pow(BASE_MULTIPLIER, 4),   // 2.07x
  5: Math.pow(BASE_MULTIPLIER, 5),   // 2.49x
  6: Math.pow(BASE_MULTIPLIER, 6),   // 2.99x
  7: Math.pow(BASE_MULTIPLIER, 7),   // 3.58x
  10: Math.pow(BASE_MULTIPLIER, 10)  // 6.19x
};

// Game Configuration
const config = {
  betAmount: 10,
  handsCount: 1,           // Number of hands to win
  currentRound: 0,         // Current round (0 = not started)
  currentMultiplier: 1,    // Running multiplier during game
  sessionProfit: 0,
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  winStreak: 0,
  roundHistory: [],        // History of rounds in current game
  isPlaying: false,
  isInGame: false,         // True when in multi-hand game
  isSignedIn: false,
  betPlaced: false         // Track if bet was placed for current game
};

const CHOICES = {
  rock: { emoji: '✊', beats: 'scissors', name: 'Rock' },
  paper: { emoji: '✋', beats: 'rock', name: 'Paper' },
  scissors: { emoji: '✌️', beats: 'paper', name: 'Scissors' }
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

// Calculate multiplier for current round
function getMultiplierForRound(round) {
  return Math.pow(BASE_MULTIPLIER, round);
}

// Get final multiplier for hands count
function getFinalMultiplier(handsCount) {
  return MULTIPLIERS[handsCount] || Math.pow(BASE_MULTIPLIER, handsCount);
}

// Determine winner
function getResult(playerChoice, cpuChoice) {
  if (playerChoice === cpuChoice) return 'tie';
  if (CHOICES[playerChoice].beats === cpuChoice) return 'win';
  return 'lose';
}

// Get random CPU choice
function getCPUChoice() {
  const choices = Object.keys(CHOICES);
  return choices[Math.floor(Math.random() * choices.length)];
}

// Update UI displays
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

function updateMultiplierDisplay() {
  const finalMult = getFinalMultiplier(config.handsCount);
  const potentialWin = (config.betAmount * finalMult).toFixed(2);
  
  document.getElementById('multiplierValue').textContent = finalMult.toFixed(2) + 'x';
  document.getElementById('potentialWin').innerHTML = `Potential Win: <span>$${potentialWin}</span>`;
}

function updateProgressDisplay() {
  document.getElementById('currentRound').textContent = `${config.currentRound} / ${config.handsCount}`;
  
  const progressPercent = (config.currentRound / config.handsCount) * 100;
  document.getElementById('progressBarFill').style.width = progressPercent + '%';
}

function updateCurrentMultiplierDisplay() {
  const currentMult = getMultiplierForRound(config.currentRound);
  const currentWin = (config.betAmount * currentMult).toFixed(2);
  
  document.getElementById('currentMultiplier').textContent = currentMult.toFixed(2) + 'x';
  document.getElementById('currentWin').textContent = '$' + currentWin;
  document.getElementById('cashoutAmount').textContent = currentWin;
}

function updateStats() {
  const profitEl = document.getElementById('sessionProfit');
  const fmt = window.FormatUtils;
  profitEl.textContent = fmt ? fmt.formatProfit(config.sessionProfit) : ((config.sessionProfit >= 0 ? '+' : '') + '$' + config.sessionProfit.toFixed(2));
  profitEl.className = 'stat-value ' + (config.sessionProfit >= 0 ? 'profit' : 'loss');
  
  document.getElementById('gamesPlayed').textContent = config.gamesPlayed;
  document.getElementById('wltRecord').textContent = `${config.wins}/${config.losses}/${config.ties}`;
  document.getElementById('winStreak').textContent = config.winStreak;
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

// Update round history display
function updateRoundHistory() {
  const historyEl = document.getElementById('roundHistory');
  historyEl.innerHTML = '';
  
  if (config.roundHistory.length === 0) {
    historyEl.style.display = 'none';
    return;
  }
  
  historyEl.style.display = 'flex';
  
  config.roundHistory.forEach((round, idx) => {
    const roundEl = document.createElement('div');
    roundEl.className = `round-item ${round.result}`;
    roundEl.innerHTML = `
      <span class="round-num">${idx + 1}</span>
      <span class="round-player">${CHOICES[round.player].emoji}</span>
      <span class="round-vs">vs</span>
      <span class="round-cpu">${CHOICES[round.cpu].emoji}</span>
      <span class="round-result-icon">${round.result === 'win' ? '✓' : round.result === 'tie' ? '=' : '✗'}</span>
    `;
    historyEl.appendChild(roundEl);
  });
}

// Show/hide game controls based on state
function updateGameControls() {
  const handsSelect = document.getElementById('handsSelect');
  const betInput = document.getElementById('betAmount');
  const cashoutGroup = document.getElementById('cashoutGroup');
  const currentMultGroup = document.getElementById('currentMultGroup');
  
  if (config.isInGame && config.currentRound > 0) {
    // In game - show cashout, disable bet controls
    handsSelect.disabled = true;
    betInput.disabled = true;
    document.querySelectorAll('.bet-adj').forEach(btn => btn.disabled = true);
    
    // Only show cashout if we've won at least 1 round
    if (config.currentRound >= 1) {
      cashoutGroup.style.display = 'block';
      currentMultGroup.style.display = 'block';
      updateCurrentMultiplierDisplay();
    }
  } else {
    // Not in game - enable bet controls
    handsSelect.disabled = false;
    betInput.disabled = false;
    document.querySelectorAll('.bet-adj').forEach(btn => btn.disabled = false);
    cashoutGroup.style.display = 'none';
    currentMultGroup.style.display = 'none';
  }
}

// Disable/Enable choice buttons
function setButtonsDisabled(disabled) {
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = disabled;
  });
}

// Reset hands to default
function resetHands() {
  const playerHand = document.getElementById('playerHand');
  const cpuHand = document.getElementById('cpuHand');
  
  playerHand.classList.remove('shaking', 'reveal', 'winner', 'loser', 'tie');
  cpuHand.classList.remove('shaking', 'reveal', 'winner', 'loser', 'tie');
  
  playerHand.querySelector('.hand-emoji').textContent = '✊';
  cpuHand.querySelector('.hand-emoji').textContent = '✊';
  
  document.getElementById('playerChoiceLabel').textContent = 'Choose below';
  document.getElementById('cpuChoiceLabel').textContent = 'Waiting...';
  
  document.getElementById('countdown').textContent = '';
  
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
}

// Animate countdown and shake hands
async function animateShoot() {
  const playerHand = document.getElementById('playerHand');
  const cpuHand = document.getElementById('cpuHand');
  const countdown = document.getElementById('countdown');
  
  playerHand.classList.add('shaking');
  cpuHand.classList.add('shaking');
  
  const counts = ['Rock...', 'Paper...', 'Scissors...', 'SHOOT!'];
  
  for (let i = 0; i < counts.length; i++) {
    countdown.textContent = counts[i];
    countdown.classList.remove('animate');
    void countdown.offsetWidth; // Force reflow
    countdown.classList.add('animate');
    await sleep(400);
  }
  
  playerHand.classList.remove('shaking');
  cpuHand.classList.remove('shaking');
}

// Reveal the hands
function revealHands(playerChoice, cpuChoice) {
  const playerHand = document.getElementById('playerHand');
  const cpuHand = document.getElementById('cpuHand');
  
  playerHand.querySelector('.hand-emoji').textContent = CHOICES[playerChoice].emoji;
  cpuHand.querySelector('.hand-emoji').textContent = CHOICES[cpuChoice].emoji;
  
  playerHand.classList.add('reveal');
  cpuHand.classList.add('reveal');
  
  document.getElementById('playerChoiceLabel').textContent = CHOICES[playerChoice].name;
  document.getElementById('cpuChoiceLabel').textContent = CHOICES[cpuChoice].name;
}

// Show result with animation
function showResult(result, amount, isFinal = true) {
  const resultDisplay = document.getElementById('resultDisplay');
  const resultText = document.getElementById('resultText');
  const resultAmount = document.getElementById('resultAmount');
  const playerHand = document.getElementById('playerHand');
  const cpuHand = document.getElementById('cpuHand');
  
  if (result === 'win') {
    if (isFinal) {
      resultText.textContent = '🎉 YOU WIN!';
      resultAmount.textContent = '+$' + amount.toFixed(2);
      resultAmount.className = 'result-amount positive';
    } else {
      resultText.textContent = '✓ Round Won!';
      resultAmount.textContent = `${config.currentRound}/${config.handsCount} - Keep going!`;
      resultAmount.className = 'result-amount';
    }
    resultText.className = 'result-text win';
    playerHand.classList.add('winner');
    cpuHand.classList.add('loser');
  } else if (result === 'lose') {
    resultText.textContent = '💔 YOU LOSE';
    resultText.className = 'result-text lose';
    resultAmount.textContent = '-$' + amount.toFixed(2) + ' & -1 🔑';
    resultAmount.className = 'result-amount negative';
    playerHand.classList.add('loser');
    cpuHand.classList.add('winner');
  } else {
    resultText.textContent = '🤝 TIE - Replay!';
    resultText.className = 'result-text tie';
    resultAmount.textContent = 'This hand doesn\'t count';
    resultAmount.className = 'result-amount';
    playerHand.classList.add('tie');
    cpuHand.classList.add('tie');
  }
  
  resultDisplay.classList.add('show');
  
  if (isFinal) {
    document.getElementById('playAgainBtn').classList.add('show');
  }
}

// Utility sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Cashout during multi-hand game
async function cashout() {
  if (!config.isInGame || config.currentRound < 1) return;
  
  const cashoutMult = getMultiplierForRound(config.currentRound);
  const winAmount = Math.round(config.betAmount * cashoutMult * 100) / 100;
  const profit = Math.round((winAmount - config.betAmount) * 100) / 100;
  
  // Record win in database
  await window.CasinoDB.recordWin(winAmount, config.betAmount);
  
  // Record game result in session
  if (window.CasinoDB && window.CasinoDB.recordGameResult) {
    await window.CasinoDB.recordGameResult('rps', config.betAmount, winAmount);
  }
  
  // Award XPs
  try {
    const xpResult = await window.CasinoDB.awardXPs('rps', cashoutMult, config.betAmount);
    if (xpResult && xpResult.success && xpResult.xpsEarned > 0) {
      updateXPsDisplay();
      showXPGain(xpResult.xpsEarned, xpResult.streak, xpResult.streakMultiplier);
    }
  } catch (err) {
    console.error('Error awarding xps:', err);
  }
  
  config.sessionProfit += profit;
  config.wins++;
  config.winStreak++;
  config.gamesPlayed++;
  
  if (window.ProfitGraph) {
    window.ProfitGraph.addPoint(profit);
  }
  
  // Show cashout result
  const resultDisplay = document.getElementById('resultDisplay');
  const resultText = document.getElementById('resultText');
  const resultAmount = document.getElementById('resultAmount');
  
  resultText.textContent = '💰 CASHED OUT!';
  resultText.className = 'result-text win';
  resultAmount.textContent = '+$' + winAmount.toFixed(2);
  resultAmount.className = 'result-amount positive';
  resultDisplay.classList.add('show');
  document.getElementById('playAgainBtn').classList.add('show');
  
  updateBalanceDisplay();
  updateStats();
  
  // Reset game state
  endGame();
}

// End the current game
function endGame() {
  config.isInGame = false;
  config.isPlaying = false;
  config.currentRound = 0;
  config.roundHistory = [];
  config.betPlaced = false;
  
  updateProgressDisplay();
  updateGameControls();
  updateRoundHistory();
  setButtonsDisabled(false);
}

// Main game function
async function playGame(playerChoice) {
  // Check if signed in
  if (!config.isSignedIn) {
    alert('Please sign in to play!');
    return;
  }
  
  // Prevent double-play during animation
  if (config.isPlaying) return;
  
  // Check if user has keys
  const currentKeys = window.CasinoAuth.getKeys();
  if (currentKeys <= 0) {
    alert('You need keys to play! Come back tomorrow for free keys.');
    return;
  }
  
  // If starting a new game, place bet
  if (!config.isInGame) {
    const currentBalance = window.CasinoAuth.getBalance();
    if (currentBalance < config.betAmount) {
      alert('Insufficient balance!');
      return;
    }
    
    // Place bet
    const result = await window.CasinoDB.placeBet(config.betAmount, 'rps');
    if (!result.success) {
      alert(result.error || 'Failed to place bet');
      return;
    }
    
    config.betPlaced = true;
    config.isInGame = true;
    config.currentRound = 0;
    config.roundHistory = [];
    updateBalanceDisplay();
  }
  
  config.isPlaying = true;
  setButtonsDisabled(true);
  
  // Hide previous result
  document.getElementById('resultDisplay').classList.remove('show');
  document.getElementById('playAgainBtn').classList.remove('show');
  
  // Reset hands for new round
  resetHands();
  await sleep(100);
  
  // Mark selected button
  document.querySelector(`.choice-btn[data-choice="${playerChoice}"]`).classList.add('selected');
  
  updateGameControls();
  
  // Animate
  await animateShoot();
  
  // Get CPU choice and determine result
  const cpuChoice = getCPUChoice();
  const roundResult = getResult(playerChoice, cpuChoice);
  
  // Reveal hands
  revealHands(playerChoice, cpuChoice);
  
  await sleep(300);
  
  // Process result
  if (roundResult === 'win') {
    config.currentRound++;
    config.roundHistory.push({ player: playerChoice, cpu: cpuChoice, result: 'win' });
    updateRoundHistory();
    updateProgressDisplay();
    updateGameControls();
    
    // Check if game is complete
    if (config.currentRound >= config.handsCount) {
      // Won all hands!
      const finalMult = getFinalMultiplier(config.handsCount);
      const winAmount = Math.round(config.betAmount * finalMult * 100) / 100;
      const profit = Math.round((winAmount - config.betAmount) * 100) / 100;
      
      // Record win in database
      await window.CasinoDB.recordWin(winAmount, config.betAmount);
      
      // Record game result in session
      if (window.CasinoDB && window.CasinoDB.recordGameResult) {
        await window.CasinoDB.recordGameResult('rps', config.betAmount, winAmount);
      }
      
      // Award XPs
      try {
        const xpResult = await window.CasinoDB.awardXPs('rps', finalMult, config.betAmount);
        if (xpResult && xpResult.success && xpResult.xpsEarned > 0) {
          updateXPsDisplay();
          showXPGain(xpResult.xpsEarned, xpResult.streak, xpResult.streakMultiplier);
        }
      } catch (err) {
        console.error('Error awarding xps:', err);
      }
      
      config.sessionProfit += profit;
      config.wins++;
      config.winStreak++;
      config.gamesPlayed++;
      
      if (window.ProfitGraph) {
        window.ProfitGraph.addPoint(profit);
      }
      
      showResult('win', winAmount, true);
      updateBalanceDisplay();
      updateStats();
      endGame();
      
    } else {
      // Won this round, but more to go
      showResult('win', 0, false);
      config.isPlaying = false;
      setButtonsDisabled(false);
      
      // Auto-continue after short delay
      await sleep(1000);
      document.getElementById('resultDisplay').classList.remove('show');
      resetHands();
    }
    
  } else if (roundResult === 'lose') {
    // Lost - game over
    config.roundHistory.push({ player: playerChoice, cpu: cpuChoice, result: 'lose' });
    updateRoundHistory();
    
    // Record loss - deducts 1 key and resets streak
    await window.CasinoDB.recordLoss('rps');
    await window.CasinoDB.resetStreak();
    updateKeysDisplay();
    
    // Record game result in session
    if (window.CasinoDB && window.CasinoDB.recordGameResult) {
      await window.CasinoDB.recordGameResult('rps', config.betAmount, 0);
    }
    
    config.sessionProfit -= config.betAmount;
    config.losses++;
    config.winStreak = 0;
    config.gamesPlayed++;
    
    if (window.ProfitGraph) {
      window.ProfitGraph.addPoint(-config.betAmount);
    }
    
    showResult('lose', config.betAmount, true);
    updateBalanceDisplay();
    updateStats();
    endGame();
    
  } else {
    // Tie - replay this hand (doesn't count)
    config.roundHistory.push({ player: playerChoice, cpu: cpuChoice, result: 'tie' });
    updateRoundHistory();
    config.ties++;
    
    showResult('tie', 0, false);
    config.isPlaying = false;
    setButtonsDisabled(false);
    
    // Auto-continue after short delay
    await sleep(1200);
    document.getElementById('resultDisplay').classList.remove('show');
    resetHands();
  }
  
  updateStats();
}

// Reset game for next round
function resetGame() {
  document.getElementById('resultDisplay').classList.remove('show');
  document.getElementById('playAgainBtn').classList.remove('show');
  resetHands();
  endGame();
}

// Adjust bet amount
function adjustBet(mult) {
  if (config.isInGame) return;
  const input = document.getElementById('betAmount');
  config.betAmount = Math.max(1, Math.min(1000, Math.round(config.betAmount * mult)));
  input.value = config.betAmount;
  updateMultiplierDisplay();
}

// Make adjustBet globally accessible
window.adjustBet = adjustBet;

// Event Listeners
document.querySelectorAll('.choice-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const choice = btn.dataset.choice;
    playGame(choice);
  });
});

document.getElementById('playAgainBtn').addEventListener('click', resetGame);

document.getElementById('cashoutBtn').addEventListener('click', cashout);

document.getElementById('betAmount').addEventListener('change', (e) => {
  if (config.isInGame) return;
  config.betAmount = Math.max(1, Math.min(1000, parseFloat(e.target.value) || 10));
  e.target.value = config.betAmount;
  updateMultiplierDisplay();
});

document.getElementById('betAmount').addEventListener('keyup', (e) => {
  if (config.isInGame) return;
  config.betAmount = Math.max(1, Math.min(1000, parseFloat(e.target.value) || 10));
  updateMultiplierDisplay();
});

document.getElementById('handsSelect').addEventListener('change', (e) => {
  if (config.isInGame) return;
  config.handsCount = parseInt(e.target.value);
  updateMultiplierDisplay();
  updateProgressDisplay();
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  updateMultiplierDisplay();
  updateProgressDisplay();
  updateStats();
  updateGameControls();
  
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
  
  // Initialize profit graph
  if (window.ProfitGraph) {
    window.ProfitGraph.init();
  }
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
window.addEventListener('beforeunload', (e) => {
  // If in game, warn user they'll lose their progress
  if (config.isInGame && config.currentRound > 0) {
    e.preventDefault();
    e.returnValue = 'You have an active game! Leaving will forfeit your current progress.';
  }
  
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    window.CasinoDB.endGameSession('user_left');
  }
});

// Session keepalive (update activity every 2 minutes)
setInterval(() => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    window.CasinoDB.updateSessionActivity();
  }
}, 2 * 60 * 1000);
