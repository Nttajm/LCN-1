// ========================================
// KENO GAME - Stake-style Keno
// 40 numbers, pick 1-10, 10 drawn
// ========================================

// ---- Payout Tables (Stake-style, indexed by [picks][hits]) ----
const PAYOUT_TABLES = {
  low: {
    1:  [0, 2.85],
    2:  [0, 1.40, 5.00],
    3:  [0, 1.10, 1.40, 26.00],
    4:  [0, 0, 2.00, 6.00, 80.00],
    5:  [0, 0, 1.50, 2.00, 15.00, 300.00],
    6:  [0, 0, 1.00, 1.60, 4.00, 26.00, 1000.00],
    7:  [0, 0, 1.00, 1.60, 2.00, 7.00, 100.00, 500.00],
    8:  [0, 0, 0, 1.60, 2.00, 4.00, 7.00, 26.00, 1000.00],
    9:  [0, 0, 0, 1.60, 2.00, 4.00, 7.00, 26.00, 100.00, 500.00],
    10: [0, 0, 0, 1.60, 2.00, 4.00, 7.00, 26.00, 100.00, 500.00, 1000.00]
  },
  medium: {
    1:  [0, 3.80],
    2:  [0, 1.80, 8.00],
    3:  [0, 1.20, 2.00, 50.00],
    4:  [0, 0, 2.50, 10.00, 150.00],
    5:  [0, 0, 1.80, 3.50, 30.00, 500.00],
    6:  [0, 0, 1.40, 2.50, 8.00, 50.00, 1500.00],
    7:  [0, 0, 1.20, 2.00, 4.00, 15.00, 200.00, 1000.00],
    8:  [0, 0, 0, 2.00, 3.00, 8.00, 15.00, 50.00, 1500.00],
    9:  [0, 0, 0, 2.00, 3.00, 8.00, 15.00, 50.00, 200.00, 1000.00],
    10: [0, 0, 0, 2.00, 3.00, 8.00, 15.00, 50.00, 200.00, 1000.00, 2000.00]
  },
  high: {
    1:  [0, 5.60],
    2:  [0, 2.50, 15.00],
    3:  [0, 1.50, 4.00, 100.00],
    4:  [0, 0, 4.00, 20.00, 350.00],
    5:  [0, 0, 2.50, 8.00, 60.00, 1000.00],
    6:  [0, 0, 2.00, 4.00, 16.00, 100.00, 3000.00],
    7:  [0, 0, 1.50, 3.00, 8.00, 30.00, 400.00, 2000.00],
    8:  [0, 0, 0, 3.00, 5.00, 15.00, 30.00, 100.00, 3000.00],
    9:  [0, 0, 0, 3.00, 5.00, 15.00, 30.00, 100.00, 400.00, 2000.00],
    10: [0, 0, 0, 3.00, 5.00, 15.00, 30.00, 100.00, 400.00, 2000.00, 5000.00]
  }
};

// ---- Game State ----
const state = {
  selectedNumbers: new Set(),
  drawnNumbers: [],
  betAmount: 1,
  risk: 'low',
  isPlaying: false,
  isSignedIn: false,
  sessionProfit: 0,
  gamesPlayed: 0,
  bestWin: 0,
  maxPicks: 10,
  totalNumbers: 40,
  drawCount: 10,

  // Auto mode
  isAutoMode: false,
  autoRunning: false,
  autoBetsRemaining: 0,
  autoInfinite: false,
  baseBet: 1,
  onWinReset: true,
  onWinIncreasePercent: 2,
  onLossReset: true,
  onLossIncreasePercent: 17,
  stopProfit: 0,
  stopLoss: 0,
  stopProfitEnabled: false,
  stopLossEnabled: false,
  autoSessionProfit: 0
};

// ---- Wait for Auth ----
function waitForAuth() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.CasinoAuth) resolve();
      else setTimeout(check, 50);
    };
    check();
  });
}

// ---- DOM Init ----
document.addEventListener('DOMContentLoaded', async () => {
  await waitForAuth();
  const hasAccess = await window.CasinoAuth.initWithMaintenanceCheck();
  if (!hasAccess) return;

  initKenoGame();
});

function initKenoGame() {
  renderBoard();
  renderMultipliers();
  renderHitsRow();
  initEventListeners();
  initCasinoAuth();

  if (window.ProfitGraph) window.ProfitGraph.init();
}

// ==============================
// RENDER: Board (40 tiles, 8x5)
// ==============================
function renderBoard() {
  const board = document.getElementById('kenoBoard');
  board.innerHTML = '';
  for (let i = 1; i <= state.totalNumbers; i++) {
    const tile = document.createElement('div');
    tile.className = 'keno-tile';
    tile.dataset.number = i;
    tile.textContent = i;
    tile.addEventListener('click', () => toggleNumber(i));
    board.appendChild(tile);
  }
}

// ==============================
// RENDER: Multiplier chips row
// ==============================
function renderMultipliers() {
  const row = document.getElementById('kenoMultipliers');
  row.innerHTML = '';
  const picks = state.selectedNumbers.size;
  if (picks === 0) {
    row.innerHTML = '<span style="color:#6b7280;font-size:0.85rem;">Select numbers to see multipliers</span>';
    return;
  }
  const table = PAYOUT_TABLES[state.risk][picks];
  if (!table) return;
  for (let hits = 0; hits < table.length; hits++) {
    const chip = document.createElement('div');
    const mult = table[hits];
    chip.className = 'multiplier-chip';
    chip.textContent = mult.toFixed(mult >= 100 ? 0 : mult >= 10 ? 1 : 2) + '×';

    // Classify chip
    if (mult === 0) chip.classList.add('zero');
    else if (mult < 2) chip.classList.add('zero');
    else if (mult < 5) chip.classList.add('low');
    else if (mult < 50) chip.classList.add('mid');
    else if (mult < 500) chip.classList.add('high');
    else chip.classList.add('mega');

    chip.dataset.hits = hits;
    row.appendChild(chip);
  }
}

// ==============================
// RENDER: Hits quick-pick chips
// ==============================
function renderHitsRow() {
  const row = document.getElementById('kenoHitsRow');
  row.innerHTML = '';
  for (let h = 0; h <= 10; h++) {
    const chip = document.createElement('div');
    chip.className = 'hits-chip';
    chip.innerHTML = `${h}× <span class="chip-gem"></span>`;
    chip.dataset.hitCount = h;
    chip.addEventListener('click', () => quickPickHitCount(h));
    row.appendChild(chip);
  }
  updateHitsRowActive();
}

function updateHitsRowActive() {
  const picks = state.selectedNumbers.size;
  document.querySelectorAll('.hits-chip').forEach(chip => {
    const h = parseInt(chip.dataset.hitCount);
    chip.classList.toggle('active', h === picks);
  });
}

function quickPickHitCount(count) {
  if (state.isPlaying) return;
  clearSelection();
  if (count === 0) return;

  // Randomly pick 'count' unique numbers from 1-40
  const pool = [];
  for (let i = 1; i <= state.totalNumbers; i++) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picks = pool.slice(0, Math.min(count, state.maxPicks));
  picks.forEach(n => {
    state.selectedNumbers.add(n);
    const tile = document.querySelector(`.keno-tile[data-number="${n}"]`);
    if (tile) tile.classList.add('selected');
  });
  updateSelectionUI();
}

// ==============================
// TOGGLE NUMBER SELECTION
// ==============================
function toggleNumber(num) {
  if (state.isPlaying) return;

  if (state.selectedNumbers.has(num)) {
    state.selectedNumbers.delete(num);
    const tile = document.querySelector(`.keno-tile[data-number="${num}"]`);
    if (tile) tile.classList.remove('selected');
  } else {
    if (state.selectedNumbers.size >= state.maxPicks) {
      // Flash the selected count
      const countEl = document.getElementById('selectedCount');
      countEl.style.color = '#ef4444';
      setTimeout(() => { countEl.style.color = ''; }, 400);
      return;
    }
    state.selectedNumbers.add(num);
    const tile = document.querySelector(`.keno-tile[data-number="${num}"]`);
    if (tile) tile.classList.add('selected');
  }
  updateSelectionUI();
}

function clearSelection() {
  if (state.isPlaying) return;
  state.selectedNumbers.clear();
  document.querySelectorAll('.keno-tile').forEach(t => {
    t.classList.remove('selected', 'hit', 'drawn', 'miss', 'locked', 'draw-reveal');
  });
  updateSelectionUI();
}

function updateSelectionUI() {
  const count = state.selectedNumbers.size;
  document.getElementById('selectedCount').textContent = `${count} / ${state.maxPicks}`;

  if (count === 0) {
    document.getElementById('potentialWin').textContent = 'Pick 1-10 numbers';
  } else {
    const table = PAYOUT_TABLES[state.risk][count];
    if (table) {
      const maxMult = Math.max(...table);
      const fmt = window.FormatUtils;
      const maxWin = state.betAmount * maxMult;
      document.getElementById('potentialWin').innerHTML = `Max win: <span>${fmt ? fmt.formatBalance(maxWin) : '$' + maxWin.toFixed(2)}</span>`;
    }
  }

  renderMultipliers();
  updateHitsRowActive();
}

// ==============================
// BET / PLAY ROUND
// ==============================
async function playRound() {
  const picks = state.selectedNumbers.size;
  if (picks === 0) {
    showError('Select at least 1 number!');
    return;
  }

  if (!state.isSignedIn) {
    showError('Please sign in to play!');
    return;
  }

  const currentKeys = window.CasinoAuth.getKeys();
  if (currentKeys <= 0) {
    showError('You need keys to play! Come back tomorrow for free keys.');
    return;
  }

  const currentBalance = window.CasinoAuth.getBalance();
  if (state.betAmount > currentBalance) {
    showBetWarning();
    return;
  }

  if (state.betAmount <= 0) {
    showError('Bet must be greater than 0');
    return;
  }

  // ---- Place Bet ----
  const betResult = await window.CasinoDB.placeBet(state.betAmount, 'keno');
  if (!betResult.success) {
    showError(betResult.error || 'Failed to place bet');
    return;
  }

  state.isPlaying = true;
  state.gamesPlayed++;
  document.getElementById('gamesPlayed').textContent = state.gamesPlayed;
  updateBalanceDisplay();

  // Lock UI
  lockBoard(true);
  document.getElementById('betBtn').disabled = true;
  document.getElementById('betBtn').textContent = 'Drawing...';
  document.getElementById('betBtn').classList.add('rolling');
  document.getElementById('clearBtn').style.display = 'none';
  document.getElementById('betAmount').disabled = true;
  document.getElementById('riskSelect').disabled = true;
  document.querySelectorAll('.bet-adj').forEach(b => b.disabled = true);

  // Hide previous result
  document.getElementById('resultOverlay').classList.remove('show');

  // ---- Draw 10 numbers ----
  state.drawnNumbers = drawNumbers(state.drawCount);

  // ---- Animate draws ----
  await animateDraws();

  // ---- Evaluate result ----
  const hits = countHits();
  const table = PAYOUT_TABLES[state.risk][picks];
  const multiplier = (table && table[hits] !== undefined) ? table[hits] : 0;
  const payout = Math.round(state.betAmount * multiplier * 100) / 100;
  const profit = Math.round((payout - state.betAmount) * 100) / 100;

  // Mark misses
  state.selectedNumbers.forEach(num => {
    if (!state.drawnNumbers.includes(num)) {
      const tile = document.querySelector(`.keno-tile[data-number="${num}"]`);
      if (tile) tile.classList.add('miss');
    }
  });

  // Highlight active multiplier chip
  document.querySelectorAll('.multiplier-chip').forEach(chip => {
    const h = parseInt(chip.dataset.hits);
    chip.classList.toggle('active', h === hits);
  });

  // ---- Process Win/Loss ----
  if (payout > 0) {
    await window.CasinoDB.recordWin(payout, state.betAmount);
    if (window.CasinoDB.recordGameResult) {
      await window.CasinoDB.recordGameResult('keno', state.betAmount, payout);
    }

    // Award XPs
    try {
      const xpResult = await window.CasinoDB.awardXPs('keno', multiplier, state.betAmount);
      if (xpResult && xpResult.success && xpResult.xpsEarned > 0) {
        updateXPsDisplay();
        showXPGain(xpResult.xpsEarned, xpResult.streak, xpResult.streakMultiplier);
      }
    } catch (e) { console.error('XP error:', e); }

    state.sessionProfit += profit;
    if (profit > state.bestWin) state.bestWin = profit;

    if (window.ProfitGraph) window.ProfitGraph.addPoint(profit);
    if (multiplier >= 5 && window.shareCasinoWin) {
      window.shareCasinoWin('keno', multiplier, profit);
    }

    showResult(true, payout, hits, picks);
  } else {
    // Loss
    state.sessionProfit -= state.betAmount;
    await window.CasinoDB.recordLoss('keno');
    await window.CasinoDB.resetStreak();
    updateKeysDisplay();

    if (window.CasinoDB.recordGameResult) {
      await window.CasinoDB.recordGameResult('keno', state.betAmount, 0);
    }
    if (window.ProfitGraph) window.ProfitGraph.addPoint(-state.betAmount);

    showResult(false, 0, hits, picks);
  }

  updateBalanceDisplay();
  updateProfitDisplay();
  updateBestWinDisplay();

  // Unlock UI
  state.isPlaying = false;
  document.getElementById('betBtn').disabled = false;
  document.getElementById('betBtn').textContent = 'Bet';
  document.getElementById('betBtn').classList.remove('rolling');
  document.getElementById('clearBtn').style.display = '';
  document.getElementById('betAmount').disabled = false;
  document.getElementById('riskSelect').disabled = false;
  document.querySelectorAll('.bet-adj').forEach(b => b.disabled = false);

  return { won: payout > 0, profit, multiplier };
}

// ==============================
// DRAW NUMBERS
// ==============================
function drawNumbers(count) {
  const pool = [];
  for (let i = 1; i <= state.totalNumbers; i++) pool.push(i);
  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// ==============================
// ANIMATE DRAWS
// ==============================
async function animateDraws() {
  const tiles = document.querySelectorAll('.keno-tile');
  for (const num of state.drawnNumbers) {
    const target = document.querySelector(`.keno-tile[data-number="${num}"]`);
    if (!target) continue;
    // Tease: flash 3 random tiles
    for (let t = 0; t < 3; t++) {
      const pool = [...tiles].filter(el => !el.classList.contains('drawn') && !el.classList.contains('hit'));
      if (!pool.length) break;
      const r = pool[Math.floor(Math.random() * pool.length)];
      r.classList.add('tease');
      await sleep(35);
      r.classList.remove('tease');
    }
    target.classList.add('draw-reveal');
    if (state.selectedNumbers.has(num)) { target.classList.remove('selected'); target.classList.add('hit'); }
    else target.classList.add('drawn');
  }
  await sleep(250);
}

function countHits() {
  let hits = 0;
  state.drawnNumbers.forEach(n => {
    if (state.selectedNumbers.has(n)) hits++;
  });
  return hits;
}

// ==============================
// SHOW RESULT OVERLAY
// ==============================
function showResult(won, amount, hits, picks) {
  const overlay = document.getElementById('resultOverlay');
  const title = document.getElementById('resultTitle');
  const amountEl = document.getElementById('resultAmount');
  const hitsEl = document.getElementById('resultHits');
  const fmt = window.FormatUtils;

  if (won) {
    const profit = amount - state.betAmount;
    title.textContent = '🎉 You Won!';
    title.className = 'result-title win';
    amountEl.textContent = fmt ? fmt.formatProfit(profit) : '+$' + profit.toFixed(2);
    amountEl.style.color = '#22c55e';
  } else {
    title.textContent = '💔 No Luck';
    title.className = 'result-title lose';
    amountEl.textContent = fmt ? fmt.formatProfit(-state.betAmount) : '-$' + state.betAmount.toFixed(2);
    amountEl.style.color = '#ef4444';
  }
  hitsEl.textContent = `Hits: ${hits} / ${picks}`;
  overlay.classList.add('show');

  // Auto-hide after 2.5s (or when next round starts)
  setTimeout(() => {
    overlay.classList.remove('show');
    resetBoardVisuals();
  }, 2500);
}

function resetBoardVisuals() {
  document.querySelectorAll('.keno-tile').forEach(tile => {
    tile.classList.remove('hit', 'drawn', 'miss', 'locked', 'draw-reveal');
  });
  // Reapply current selection
  state.selectedNumbers.forEach(num => {
    const tile = document.querySelector(`.keno-tile[data-number="${num}"]`);
    if (tile) tile.classList.add('selected');
  });
  lockBoard(false);
  // Reset multiplier highlights
  document.querySelectorAll('.multiplier-chip').forEach(c => c.classList.remove('active'));
}

function lockBoard(locked) {
  document.querySelectorAll('.keno-tile').forEach(t => {
    if (locked) t.classList.add('locked');
    else t.classList.remove('locked');
  });
}

// ==============================
// AUTO BET
// ==============================
async function startAutoPlay() {
  if (state.selectedNumbers.size === 0) {
    showError('Select at least 1 number!');
    return;
  }

  state.autoRunning = true;
  state.autoSessionProfit = 0;
  state.baseBet = state.betAmount;

  const autoBetsInput = document.getElementById('autoBetsCount');
  const betsCount = state.autoInfinite ? Infinity : (parseInt(autoBetsInput.value) || 0);
  if (!state.autoInfinite && betsCount <= 0) {
    showError('Set number of bets or use ∞');
    state.autoRunning = false;
    return;
  }
  state.autoBetsRemaining = betsCount;

  const btn = document.getElementById('autoBetBtn');
  btn.textContent = 'Stop Autobet';
  btn.classList.add('running');

  // Disable selection
  document.getElementById('autoBetAmount').disabled = true;
  document.getElementById('autoRiskSelect').disabled = true;

  while (state.autoRunning && state.autoBetsRemaining > 0) {
    // Check balance
    const balance = window.CasinoAuth.getBalance();
    if (state.betAmount > balance) {
      showError('Insufficient balance - stopping autobet');
      break;
    }

    // Check keys
    const keys = window.CasinoAuth.getKeys();
    if (keys <= 0) {
      showError('No keys remaining - stopping autobet');
      break;
    }

    const result = await playRound();
    if (!result) break;

    state.autoSessionProfit += result.profit;

    if (!state.autoInfinite) state.autoBetsRemaining--;

    // Adjust bet based on win/loss
    if (result.won) {
      if (state.onWinReset) {
        state.betAmount = state.baseBet;
      } else {
        state.betAmount = Math.round(state.betAmount * (1 + state.onWinIncreasePercent / 100) * 100) / 100;
      }
    } else {
      if (state.onLossReset) {
        state.betAmount = state.baseBet;
      } else {
        state.betAmount = Math.round(state.betAmount * (1 + state.onLossIncreasePercent / 100) * 100) / 100;
      }
    }

    // Update bet input display
    document.getElementById('autoBetAmount').value = state.betAmount.toFixed(2);

    // Stop conditions
    if (state.stopProfitEnabled && state.stopProfit > 0 && state.autoSessionProfit >= state.stopProfit) {
      break;
    }
    if (state.stopLossEnabled && state.stopLoss > 0 && state.autoSessionProfit <= -state.stopLoss) {
      break;
    }

    // Delay between rounds
    await sleep(800);
  }

  stopAutoPlay();
}

function stopAutoPlay() {
  state.autoRunning = false;
  const btn = document.getElementById('autoBetBtn');
  btn.textContent = 'Start Autobet';
  btn.classList.remove('running');
  document.getElementById('autoBetAmount').disabled = false;
  document.getElementById('autoRiskSelect').disabled = false;
}

// ==============================
// EVENT LISTENERS
// ==============================
function initEventListeners() {
  // Bet button
  document.getElementById('betBtn').addEventListener('click', () => {
    if (!state.isPlaying) playRound();
  });

  // Clear button
  document.getElementById('clearBtn').addEventListener('click', clearSelection);

  // Bet amount input
  const betInput = document.getElementById('betAmount');
  betInput.addEventListener('input', () => {
    state.betAmount = Math.max(0.10, parseFloat(betInput.value) || 0.10);
    hideBetWarning();
    updateSelectionUI();
  });

  // Half / Double
  document.getElementById('halfBtn').addEventListener('click', () => {
    if (state.isPlaying) return;
    state.betAmount = Math.max(0.10, Math.round(state.betAmount * 0.5 * 100) / 100);
    betInput.value = state.betAmount;
    updateSelectionUI();
  });
  document.getElementById('doubleBtn').addEventListener('click', () => {
    if (state.isPlaying) return;
    const balance = window.CasinoAuth ? window.CasinoAuth.getBalance() : 10000;
    state.betAmount = Math.min(balance, Math.round(state.betAmount * 2 * 100) / 100);
    betInput.value = state.betAmount;
    updateSelectionUI();
  });

  // Risk select
  document.getElementById('riskSelect').addEventListener('change', (e) => {
    state.risk = e.target.value;
    renderMultipliers();
    updateSelectionUI();
  });

  // ---- Tab switching ----
  document.getElementById('tabManual').addEventListener('click', () => {
    state.isAutoMode = false;
    document.getElementById('tabManual').classList.add('active');
    document.getElementById('tabAuto').classList.remove('active');
    document.getElementById('manualControls').style.display = '';
    document.getElementById('autoControls').style.display = 'none';
    if (state.autoRunning) stopAutoPlay();
  });

  document.getElementById('tabAuto').addEventListener('click', () => {
    state.isAutoMode = true;
    document.getElementById('tabAuto').classList.add('active');
    document.getElementById('tabManual').classList.remove('active');
    document.getElementById('manualControls').style.display = 'none';
    document.getElementById('autoControls').style.display = '';
    // Sync bet and risk
    document.getElementById('autoBetAmount').value = state.betAmount;
    document.getElementById('autoRiskSelect').value = state.risk;
  });

  // ---- Auto controls ----
  const autoBetInput = document.getElementById('autoBetAmount');
  autoBetInput.addEventListener('input', () => {
    state.betAmount = Math.max(0.10, parseFloat(autoBetInput.value) || 0.10);
  });

  document.getElementById('autoHalfBtn').addEventListener('click', () => {
    state.betAmount = Math.max(0.10, Math.round(state.betAmount * 0.5 * 100) / 100);
    autoBetInput.value = state.betAmount;
  });
  document.getElementById('autoDoubleBtn').addEventListener('click', () => {
    const balance = window.CasinoAuth ? window.CasinoAuth.getBalance() : 10000;
    state.betAmount = Math.min(balance, Math.round(state.betAmount * 2 * 100) / 100);
    autoBetInput.value = state.betAmount;
  });

  document.getElementById('autoRiskSelect').addEventListener('change', (e) => {
    state.risk = e.target.value;
    document.getElementById('riskSelect').value = state.risk;
    renderMultipliers();
    updateSelectionUI();
  });

  // Infinity toggle
  document.getElementById('infinityBtn').addEventListener('click', () => {
    state.autoInfinite = !state.autoInfinite;
    document.getElementById('infinityBtn').classList.toggle('active', state.autoInfinite);
    const input = document.getElementById('autoBetsCount');
    input.disabled = state.autoInfinite;
    if (state.autoInfinite) input.value = '∞';
    else input.value = '10';
  });

  // On Win
  document.getElementById('onWinReset').addEventListener('click', () => {
    state.onWinReset = true;
    document.getElementById('onWinReset').classList.add('active');
    document.getElementById('onWinIncrease').classList.remove('active');
  });
  document.getElementById('onWinIncrease').addEventListener('click', () => {
    state.onWinReset = false;
    document.getElementById('onWinIncrease').classList.add('active');
    document.getElementById('onWinReset').classList.remove('active');
  });
  document.getElementById('onWinPercent').addEventListener('change', (e) => {
    state.onWinIncreasePercent = parseFloat(e.target.value) || 0;
  });

  // On Loss
  document.getElementById('onLossReset').addEventListener('click', () => {
    state.onLossReset = true;
    document.getElementById('onLossReset').classList.add('active');
    document.getElementById('onLossIncrease').classList.remove('active');
  });
  document.getElementById('onLossIncrease').addEventListener('click', () => {
    state.onLossReset = false;
    document.getElementById('onLossIncrease').classList.add('active');
    document.getElementById('onLossReset').classList.remove('active');
  });
  document.getElementById('onLossPercent').addEventListener('change', (e) => {
    state.onLossIncreasePercent = parseFloat(e.target.value) || 0;
  });

  // Stop profit/loss
  document.getElementById('stopProfit').addEventListener('change', (e) => {
    state.stopProfit = parseFloat(e.target.value) || 0;
  });
  document.getElementById('stopLoss').addEventListener('change', (e) => {
    state.stopLoss = parseFloat(e.target.value) || 0;
  });
  document.getElementById('stopProfitToggle').addEventListener('click', () => {
    state.stopProfitEnabled = !state.stopProfitEnabled;
    const btn = document.getElementById('stopProfitToggle');
    btn.classList.toggle('active', state.stopProfitEnabled);
  });
  document.getElementById('stopLossToggle').addEventListener('click', () => {
    state.stopLossEnabled = !state.stopLossEnabled;
    const btn = document.getElementById('stopLossToggle');
    btn.classList.toggle('active', state.stopLossEnabled);
  });

  // Autobet button
  document.getElementById('autoBetBtn').addEventListener('click', () => {
    if (state.autoRunning) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }
  });
}

// ==============================
// AUTH INTEGRATION
// ==============================
function initCasinoAuth() {
  if (!window.CasinoAuth) return;

  state.isSignedIn = window.CasinoAuth.isSignedIn();
  updateBalanceDisplay();
  updateKeysDisplay();
  updateXPsDisplay();
  setupAuthUI();

  window.CasinoAuth.onAuthStateChange((user) => {
    state.isSignedIn = !!user;
    updateBalanceDisplay();
    updateKeysDisplay();
    updateXPsDisplay();
    updateAuthUI(user);
  });
}

function setupAuthUI() {
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  if (signInBtn) signInBtn.addEventListener('click', () => window.CasinoAuth.signIn());
  if (signOutBtn) signOutBtn.addEventListener('click', () => window.CasinoAuth.signOut());
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

// ==============================
// DISPLAY HELPERS
// ==============================
function updateBalanceDisplay() {
  const balance = window.CasinoAuth?.getBalance() ?? 0;
  const fmt = window.FormatUtils;
  const el = document.getElementById('userBalance');
  if (el) el.textContent = fmt ? fmt.formatBalance(balance) : '$' + balance.toFixed(2);
}

function updateKeysDisplay() {
  const keys = window.CasinoAuth?.getKeys() ?? 0;
  const el = document.getElementById('userKeys');
  if (el) el.innerHTML = '<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ' + keys;
}

function updateXPsDisplay() {
  const xps = window.CasinoAuth?.getXPs() ?? 0;
  const el = document.getElementById('userXPs');
  if (el) el.textContent = '⚡ ' + xps;
}

function updateProfitDisplay() {
  const el = document.getElementById('sessionProfit');
  const fmt = window.FormatUtils;
  if (el) {
    el.textContent = fmt ? fmt.formatProfit(state.sessionProfit) : ((state.sessionProfit >= 0 ? '+' : '') + '$' + state.sessionProfit.toFixed(2));
    el.className = 'stat-value ' + (state.sessionProfit >= 0 ? 'profit' : 'loss');
  }
}

function updateBestWinDisplay() {
  const el = document.getElementById('bestWin');
  const fmt = window.FormatUtils;
  if (el) el.textContent = fmt ? fmt.formatBalance(state.bestWin) : '$' + state.bestWin.toFixed(2);
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

function showError(msg) {
  alert(msg);
}

function showBetWarning() {
  const warn = document.getElementById('betWarning');
  if (warn) {
    warn.style.display = 'block';
    setTimeout(() => { warn.style.display = 'none'; }, 3000);
  }
}

function hideBetWarning() {
  const warn = document.getElementById('betWarning');
  if (warn) warn.style.display = 'none';
}

// ==============================
// UTILITY
// ==============================
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ==============================
// SESSION TRACKING
// ==============================
window.addEventListener('beforeunload', () => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    window.CasinoDB.endGameSession('user_left');
  }
});

setInterval(() => {
  if (window.CasinoDB && window.CasinoDB.activeSessionId) {
    window.CasinoDB.updateSessionActivity();
  }
}, 2 * 60 * 1000);
