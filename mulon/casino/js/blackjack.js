// ========================================
// BLACKJACK GAME - Stake-style mechanics
// ========================================

// Safety: Lock bet amount during game to prevent cheating
let betLocked = false;
let lockedBetValue = 0;

// Card suits and values
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_COLORS = {
  '♠': 'black',
  '♣': 'black',
  '♥': 'red',
  '♦': 'red'
};

// Game State
const gameState = {
  deck: [],
  playerHand: [],
  dealerHand: [],
  splitHand: [],
  betAmount: 0,
  insuranceBet: 0,
  isPlaying: false,
  isPlayerTurn: false,
  isDealerTurn: false,
  hasSplit: false,
  hasDoubled: false,
  activeSplitHand: false, // false = main hand, true = split hand
  sessionProfit: 0,
  handsPlayed: 0,
  bestWin: 0,
  isSignedIn: false
};

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
  if (!hasAccess) return;
  
  initBlackjackGame();
});

function initBlackjackGame() {
  // Cache DOM elements
  elements = {
    // Bet controls
    betAmount: document.getElementById('betAmount'),
    halfBtn: document.getElementById('halfBtn'),
    doubleBtn: document.getElementById('doubleBtn'),
    balanceBtn: document.getElementById('balanceBtn'),
    playBtn: document.getElementById('playBtn'),
    
    // Action buttons
    hitBtn: document.getElementById('hitBtn'),
    standBtn: document.getElementById('standBtn'),
    splitBtn: document.getElementById('splitBtn'),
    doubleDownBtn: document.getElementById('doubleDownBtn'),
    
    // Insurance
    insurancePanel: document.getElementById('insurancePanel'),
    insuranceYes: document.getElementById('insuranceYes'),
    insuranceNo: document.getElementById('insuranceNo'),
    
    // Card areas
    dealerCards: document.getElementById('dealerCards'),
    playerCards: document.getElementById('playerCards'),
    splitCards: document.getElementById('splitCards'),
    splitArea: document.getElementById('splitArea'),
    
    // Scores
    dealerScore: document.getElementById('dealerScore'),
    playerScore: document.getElementById('playerScore'),
    splitScore: document.getElementById('splitScore'),
    
    // Result
    resultOverlay: document.getElementById('resultOverlay'),
    resultText: document.getElementById('resultText'),
    resultAmount: document.getElementById('resultAmount'),
    
    // Stats
    sessionProfit: document.getElementById('sessionProfit'),
    handsPlayed: document.getElementById('handsPlayed'),
    bestWin: document.getElementById('bestWin')
  };

  // Initialize event listeners
  initEventListeners();
  
  // Initialize casino auth integration
  initCasinoAuth();
  
  // Initialize profit graph
  if (window.ProfitGraph) {
    window.ProfitGraph.init();
  }
  
  console.log('Blackjack game initialized!');
}

// ========================================
// AUTH INTEGRATION
// ========================================

async function initCasinoAuth() {
  if (window.CasinoAuth) {
    gameState.isSignedIn = window.CasinoAuth.isSignedIn();
    updateBalanceDisplay();
    updateUIState();
    setupAuthUI();
    
    window.CasinoAuth.onAuthStateChange((user, userData) => {
      gameState.isSignedIn = !!user;
      updateBalanceDisplay();
      updateUIState();
    });
  }
}

function setupAuthUI() {
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  
  if (signInBtn) {
    signInBtn.addEventListener('click', async () => {
      await window.CasinoAuth.signInWithGoogle();
    });
  }
  
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await window.CasinoAuth.signOut();
    });
  }
}

function updateBalanceDisplay() {
  if (!window.CasinoAuth) return;
  
  const balance = window.CasinoAuth.getBalance();
  const keys = window.CasinoAuth.getKeys ? window.CasinoAuth.getKeys() : 0;
  const xps = window.CasinoAuth.getXPs ? window.CasinoAuth.getXPs() : 0;
  
  const balanceEl = document.getElementById('userBalance');
  const keysEl = document.getElementById('userKeys');
  const xpsEl = document.getElementById('userXPs');
  
  if (balanceEl) balanceEl.textContent = '$' + balance.toFixed(2);
  if (keysEl) keysEl.innerHTML = `<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ${keys}`;
  if (xpsEl) xpsEl.textContent = '⚡ ' + xps;
  
  // Update user info display
  const user = window.CasinoAuth.currentUser;
  const userInfo = document.getElementById('userInfo');
  const userName = document.getElementById('userName');
  const signInBtn = document.getElementById('signInBtn');
  
  if (user && userInfo && userName && signInBtn) {
    userInfo.style.display = 'flex';
    signInBtn.style.display = 'none';
    userName.textContent = user.displayName || user.email || 'User';
  } else if (userInfo && signInBtn) {
    userInfo.style.display = 'none';
    signInBtn.style.display = 'flex';
  }
}

function updateUIState() {
  // Enable/disable play button based on sign-in status
  if (elements.playBtn) {
    elements.playBtn.disabled = !gameState.isSignedIn || gameState.isPlaying;
    if (!gameState.isSignedIn) {
      elements.playBtn.textContent = 'Sign In to Play';
    } else if (gameState.isPlaying) {
      elements.playBtn.textContent = 'Playing...';
    } else {
      elements.playBtn.textContent = 'Play';
    }
  }
}

// ========================================
// BET LOCKING - Anti-cheat
// ========================================

function lockBetControls(locked) {
  if (elements.betAmount) {
    elements.betAmount.disabled = locked;
    elements.betAmount.style.opacity = locked ? '0.5' : '1';
    elements.betAmount.style.pointerEvents = locked ? 'none' : 'auto';
  }
  if (elements.halfBtn) {
    elements.halfBtn.disabled = locked;
    elements.halfBtn.style.opacity = locked ? '0.5' : '1';
  }
  if (elements.doubleBtn) {
    elements.doubleBtn.disabled = locked;
    elements.doubleBtn.style.opacity = locked ? '0.5' : '1';
  }
  if (elements.balanceBtn) {
    elements.balanceBtn.disabled = locked;
    elements.balanceBtn.style.opacity = locked ? '0.5' : '1';
  }
}

function adjustBet(multiplier) {
  // Prevent bet changes while game is in progress (anti-cheat)
  if (betLocked || gameState.isPlaying) {
    showToast('Cannot change bet during game');
    return;
  }
  const current = parseFloat(elements.betAmount.value) || 0;
  const newValue = current * multiplier;
  const maxBet = window.CasinoAuth ? window.CasinoAuth.getBalance() : 1000;
  elements.betAmount.value = Math.min(Math.max(0, newValue), maxBet).toFixed(2);
}

// ========================================
// EVENT LISTENERS
// ========================================

function initEventListeners() {
  // Bet controls - with lock check
  elements.halfBtn?.addEventListener('click', () => adjustBet(0.5));
  elements.doubleBtn?.addEventListener('click', () => adjustBet(2));
  elements.balanceBtn?.addEventListener('click', () => {
    if (betLocked || gameState.isPlaying) {
      showToast('Cannot change bet during game');
      return;
    }
    if (window.CasinoAuth) {
      elements.betAmount.value = window.CasinoAuth.getBalance().toFixed(2);
    }
  });
  
  // Prevent manual bet input during game
  elements.betAmount?.addEventListener('focus', (e) => {
    if (betLocked || gameState.isPlaying) {
      e.target.blur();
      showToast('Cannot change bet during game');
    }
  });
  
  // Play button
  elements.playBtn?.addEventListener('click', startGame);
  
  // Action buttons
  elements.hitBtn?.addEventListener('click', hit);
  elements.standBtn?.addEventListener('click', stand);
  elements.splitBtn?.addEventListener('click', split);
  elements.doubleDownBtn?.addEventListener('click', doubleDown);
  
  // Insurance
  elements.insuranceYes?.addEventListener('click', () => handleInsurance(true));
  elements.insuranceNo?.addEventListener('click', () => handleInsurance(false));
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e) {
  if (!gameState.isPlayerTurn) return;
  
  switch(e.key.toLowerCase()) {
    case 'h':
      if (!elements.hitBtn.disabled) hit();
      break;
    case 's':
      if (!elements.standBtn.disabled) stand();
      break;
    case 'd':
      if (!elements.doubleDownBtn.disabled) doubleDown();
      break;
    case 'p':
      if (!elements.splitBtn.disabled) split();
      break;
  }
}

// ========================================
// DECK FUNCTIONS
// ========================================

function createDeck() {
  const deck = [];
  // Use 6 decks like real casinos
  for (let d = 0; d < 6; d++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push({ suit, value });
      }
    }
  }
  return shuffleDeck(deck);
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function drawCard() {
  if (gameState.deck.length < 20) {
    gameState.deck = createDeck();
  }
  return gameState.deck.pop();
}

// ========================================
// CARD RENDERING
// ========================================

// Create a card element - if hidden, don't show real value (anti-cheat)
function createCardElement(card, hidden = false) {
  const cardEl = document.createElement('div');
  const color = hidden ? 'black' : SUIT_COLORS[card.suit];
  // All cards start face-down for the deal animation
  cardEl.className = `card ${color} face-down dealing`;
  
  // If hidden, use dummy values (anti-inspect element cheat)
  const displayValue = hidden ? '?' : card.value;
  const displaySuit = hidden ? '?' : card.suit;
  
  cardEl.innerHTML = `
    <div class="card-front">
      <div class="card-corner top">
        <span class="card-value">${displayValue}</span>
        <span class="card-suit">${displaySuit}</span>
      </div>
      <span class="card-center">${displaySuit}</span>
      <div class="card-corner bottom">
        <span class="card-value">${displayValue}</span>
        <span class="card-suit">${displaySuit}</span>
      </div>
    </div>
    <div class="card-back"></div>
  `;
  
  // Only store real data if not hidden (anti-cheat)
  if (!hidden) {
    cardEl.dataset.value = card.value;
    cardEl.dataset.suit = card.suit;
  } else {
    cardEl.dataset.value = 'hidden';
    cardEl.dataset.suit = 'hidden';
  }
  
  return cardEl;
}

// Reveal a hidden card's true value
function revealCardValue(cardEl, card) {
  const color = SUIT_COLORS[card.suit];
  cardEl.classList.remove('black');
  cardEl.classList.add(color);
  
  // Update the card front with real values
  const cardFront = cardEl.querySelector('.card-front');
  cardFront.innerHTML = `
    <div class="card-corner top">
      <span class="card-value">${card.value}</span>
      <span class="card-suit">${card.suit}</span>
    </div>
    <span class="card-center">${card.suit}</span>
    <div class="card-corner bottom">
      <span class="card-value">${card.value}</span>
      <span class="card-suit">${card.suit}</span>
    </div>
  `;
  
  // Update data attributes
  cardEl.dataset.value = card.value;
  cardEl.dataset.suit = card.suit;
}

// Deal a card - always deals face-down first, then flips to reveal (unless keepHidden)
async function dealCardTo(hand, container, keepHidden = false, delay = 0) {
  return new Promise(resolve => {
    setTimeout(async () => {
      const card = drawCard();
      hand.push({ ...card, faceDown: keepHidden, pending: !keepHidden });
      
      // Create card element - hidden cards show dummy values
      const cardEl = createCardElement(card, keepHidden);
      container.appendChild(cardEl);
      
      // Play deal sound
      playSound('deal');
      
      // Wait for deal animation
      await new Promise(r => setTimeout(r, 400));
      cardEl.classList.remove('dealing');
      
      if (!keepHidden) {
        // Reveal the card value and flip it
        await new Promise(r => setTimeout(r, 100));
        revealCardValue(cardEl, card);
        await flipCardUp(cardEl);
        hand[hand.length - 1].pending = false;
      }
      
      resolve(card);
    }, delay);
  });
}

// Flip a card from face-down to face-up
function flipCardUp(cardEl) {
  return new Promise(resolve => {
    cardEl.classList.add('flipping');
    cardEl.classList.remove('face-down');
    playSound('flip');
    
    setTimeout(() => {
      cardEl.classList.remove('flipping');
      resolve();
    }, 400);
  });
}

function flipCard(cardEl) {
  return new Promise(resolve => {
    cardEl.classList.add('flipping');
    cardEl.classList.remove('face-down');
    playSound('flip');
    
    setTimeout(() => {
      cardEl.classList.remove('flipping');
      resolve();
    }, 600);
  });
}

// ========================================
// SCORE CALCULATION
// ========================================

function calculateScore(hand) {
  let score = 0;
  let aces = 0;
  
  for (const card of hand) {
    if (card.faceDown) continue;
    
    if (card.value === 'A') {
      aces++;
      score += 11;
    } else if (['K', 'Q', 'J'].includes(card.value)) {
      score += 10;
    } else {
      score += parseInt(card.value);
    }
  }
  
  // Adjust for aces
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  
  return score;
}

function updateScores() {
  const playerScore = calculateScore(gameState.playerHand);
  const dealerScore = calculateScore(gameState.dealerHand);
  
  elements.playerScore.textContent = playerScore;
  elements.dealerScore.textContent = dealerScore;
  
  // Update score badge styles
  elements.playerScore.classList.toggle('bust', playerScore > 21);
  elements.playerScore.classList.toggle('blackjack', playerScore === 21 && gameState.playerHand.length === 2);
  
  elements.dealerScore.classList.toggle('bust', dealerScore > 21);
  
  if (gameState.hasSplit) {
    const splitScore = calculateScore(gameState.splitHand);
    elements.splitScore.textContent = splitScore;
    elements.splitScore.classList.toggle('bust', splitScore > 21);
  }
  
  return { playerScore, dealerScore };
}

// ========================================
// GAME FLOW
// ========================================

async function startGame() {
  // Check connection before starting
  if (window.ConnectionMonitor && !window.ConnectionMonitor.canPlay()) {
    showToast('Connection lost. Please wait...');
    return;
  }
  
  const betAmount = parseFloat(elements.betAmount.value) || 0;
  
  if (betAmount <= 0) {
    showToast('Please enter a bet amount');
    return;
  }
  
  if (!window.CasinoAuth || !window.CasinoAuth.isSignedIn()) {
    showToast('Please sign in to play');
    return;
  }
  
  const balance = window.CasinoAuth.getBalance();
  if (betAmount > balance) {
    showToast('Insufficient balance');
    return;
  }
  
  // LOCK BET - prevent changing bet during game (anti-cheat)
  betLocked = true;
  lockedBetValue = betAmount;
  lockBetControls(true);
  
  // Place bet using CasinoDB with session tracking
  const betResult = await window.CasinoDB.placeBet(betAmount, 'blackjack');
  if (!betResult.success) {
    showToast(betResult.error || 'Failed to place bet');
    betLocked = false;
    lockBetControls(false);
    return;
  }
  updateBalanceDisplay();
  
  // Reset game state
  gameState.betAmount = betAmount;
  gameState.playerHand = [];
  gameState.dealerHand = [];
  gameState.splitHand = [];
  gameState.isPlaying = true;
  gameState.isPlayerTurn = false;
  gameState.isDealerTurn = false;
  gameState.hasSplit = false;
  gameState.hasDoubled = false;
  gameState.activeSplitHand = false;
  gameState.insuranceBet = 0;
  
  // Create new deck if needed
  if (gameState.deck.length < 52) {
    gameState.deck = createDeck();
  }
  
  // Clear UI
  elements.dealerCards.innerHTML = '';
  elements.playerCards.innerHTML = '';
  elements.splitCards.innerHTML = '';
  elements.splitArea.style.display = 'none';
  elements.resultOverlay.classList.remove('show');
  elements.insurancePanel.style.display = 'none';
  
  // Reset scores display
  elements.playerScore.textContent = '0';
  elements.dealerScore.textContent = '0';
  elements.playerScore.classList.remove('bust', 'blackjack');
  elements.dealerScore.classList.remove('bust');
  if (elements.splitScore) {
    elements.splitScore.textContent = '0';
    elements.splitScore.classList.remove('bust');
  }
  
  // Update button states
  disableActionButtons();
  elements.playBtn.disabled = true;
  elements.playBtn.textContent = 'Playing...';
  
  // Deal cards with animation delays
  await dealCardTo(gameState.playerHand, elements.playerCards, false, 0);
  await dealCardTo(gameState.dealerHand, elements.dealerCards, false, 300);
  await dealCardTo(gameState.playerHand, elements.playerCards, false, 600);
  await dealCardTo(gameState.dealerHand, elements.dealerCards, true, 900); // Face down
  
  updateScores();
  
  // Check for dealer ace (insurance)
  if (gameState.dealerHand[0].value === 'A') {
    elements.insurancePanel.style.display = 'block';
    return;
  }
  
  // Check for blackjack
  const { playerScore, dealerScore } = updateScores();
  
  if (playerScore === 21) {
    await checkBlackjack();
    return;
  }
  
  // Start player turn
  startPlayerTurn();
}

async function checkBlackjack() {
  const playerScore = calculateScore(gameState.playerHand);
  
  // Reveal dealer's hole card
  await revealDealerCard();
  const dealerScore = calculateScore(gameState.dealerHand);
  
  if (playerScore === 21 && gameState.playerHand.length === 2) {
    if (dealerScore === 21 && gameState.dealerHand.length === 2) {
      // Both blackjack - push
      await endGame('push', 0);
    } else {
      // Player blackjack - pays 3:2
      const winnings = gameState.betAmount * 2.5;
      await endGame('blackjack', winnings);
    }
    return true;
  }
  
  return false;
}

function startPlayerTurn() {
  gameState.isPlayerTurn = true;
  updateActionButtons();
}

function updateActionButtons() {
  const playerScore = calculateScore(gameState.playerHand);
  const balance = window.CasinoAuth ? window.CasinoAuth.getBalance() : 0;
  
  // Hit/Stand always available during player turn
  elements.hitBtn.disabled = !gameState.isPlayerTurn || playerScore >= 21;
  elements.standBtn.disabled = !gameState.isPlayerTurn;
  
  // Split available if first two cards match value and have enough balance
  const canSplit = gameState.isPlayerTurn && 
    gameState.playerHand.length === 2 && 
    !gameState.hasSplit &&
    getCardValue(gameState.playerHand[0]) === getCardValue(gameState.playerHand[1]) &&
    balance >= gameState.betAmount;
  elements.splitBtn.disabled = !canSplit;
  
  // Double available only on first action with enough balance
  const canDouble = gameState.isPlayerTurn && 
    gameState.playerHand.length === 2 && 
    !gameState.hasDoubled &&
    balance >= gameState.betAmount;
  elements.doubleDownBtn.disabled = !canDouble;
}

function disableActionButtons() {
  elements.hitBtn.disabled = true;
  elements.standBtn.disabled = true;
  elements.splitBtn.disabled = true;
  elements.doubleDownBtn.disabled = true;
}

function getCardValue(card) {
  if (['K', 'Q', 'J'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value);
}

// ========================================
// PLAYER ACTIONS
// ========================================

async function hit() {
  if (!gameState.isPlayerTurn) return;
  
  // Connection check
  if (window.ConnectionMonitor && !window.ConnectionMonitor.canPlay()) {
    showToast('Connection lost. Please wait...');
    return;
  }
  
  const targetHand = gameState.activeSplitHand ? gameState.splitHand : gameState.playerHand;
  const targetContainer = gameState.activeSplitHand ? elements.splitCards : elements.playerCards;
  
  await dealCardTo(targetHand, targetContainer, false, 0);
  updateScores();
  
  const score = calculateScore(targetHand);
  
  if (score > 21) {
    // Bust
    targetContainer.classList.add('bust');
    playSound('bust');
    
    setTimeout(() => {
      targetContainer.classList.remove('bust');
    }, 500);
    
    if (gameState.hasSplit && !gameState.activeSplitHand) {
      // Move to split hand
      gameState.activeSplitHand = true;
      updateActionButtons();
    } else {
      // End turn
      await dealerTurn();
    }
  } else if (score === 21) {
    // Auto stand on 21
    await stand();
  } else {
    // Continue
    updateActionButtons();
  }
}

async function stand() {
  if (!gameState.isPlayerTurn) return;
  
  if (gameState.hasSplit && !gameState.activeSplitHand) {
    // Move to split hand
    gameState.activeSplitHand = true;
    updateActionButtons();
    return;
  }
  
  // End player turn
  gameState.isPlayerTurn = false;
  disableActionButtons();
  
  await dealerTurn();
}

async function split() {
  if (!gameState.isPlayerTurn || gameState.hasSplit) return;
  
  // Connection check
  if (window.ConnectionMonitor && !window.ConnectionMonitor.canPlay()) {
    showToast('Connection lost. Please wait...');
    return;
  }
  
  // Deduct additional bet
  await window.CasinoDB.updateBalance(-gameState.betAmount);
  updateBalanceDisplay();
  
  gameState.hasSplit = true;
  
  // Move second card to split hand
  const secondCard = gameState.playerHand.pop();
  gameState.splitHand.push(secondCard);
  
  // Update UI
  elements.splitArea.style.display = 'flex';
  
  // Move card element
  const cardEl = elements.playerCards.lastElementChild;
  elements.splitCards.appendChild(cardEl);
  
  // Deal one card to each hand
  await dealCardTo(gameState.playerHand, elements.playerCards, false, 300);
  await dealCardTo(gameState.splitHand, elements.splitCards, false, 600);
  
  updateScores();
  updateActionButtons();
}

async function doubleDown() {
  if (!gameState.isPlayerTurn || gameState.hasDoubled) return;
  
  // Connection check
  if (window.ConnectionMonitor && !window.ConnectionMonitor.canPlay()) {
    showToast('Connection lost. Please wait...');
    return;
  }
  
  // Deduct additional bet
  await window.CasinoDB.updateBalance(-gameState.betAmount);
  gameState.betAmount *= 2;
  gameState.hasDoubled = true;
  updateBalanceDisplay();
  
  // Deal one more card and stand
  await dealCardTo(gameState.playerHand, elements.playerCards, false, 0);
  updateScores();
  
  const score = calculateScore(gameState.playerHand);
  
  if (score > 21) {
    elements.playerCards.classList.add('bust');
    playSound('bust');
    setTimeout(() => {
      elements.playerCards.classList.remove('bust');
    }, 500);
  }
  
  // Automatically stand after double
  gameState.isPlayerTurn = false;
  disableActionButtons();
  await dealerTurn();
}

// ========================================
// INSURANCE
// ========================================

async function handleInsurance(accepted) {
  elements.insurancePanel.style.display = 'none';
  
  if (accepted) {
    const insuranceAmount = gameState.betAmount / 2;
    const balance = window.CasinoAuth ? window.CasinoAuth.getBalance() : 0;
    
    if (balance >= insuranceAmount) {
      await window.CasinoDB.updateBalance(-insuranceAmount);
      gameState.insuranceBet = insuranceAmount;
      updateBalanceDisplay();
    }
  }
  
  // Check for player blackjack first
  const playerScore = calculateScore(gameState.playerHand);
  if (playerScore === 21) {
    await checkBlackjack();
    return;
  }
  
  // Reveal dealer card and check for blackjack
  await revealDealerCard();
  const dealerScore = calculateScore(gameState.dealerHand);
  
  if (dealerScore === 21) {
    // Dealer blackjack
    if (gameState.insuranceBet > 0) {
      // Insurance pays 2:1
      const insuranceWin = gameState.insuranceBet * 3;
      await window.CasinoDB.updateBalance(insuranceWin);
      showToast(`Insurance paid $${insuranceWin.toFixed(2)}`);
    }
    await endGame('lose', 0);
  } else {
    // No dealer blackjack, continue game
    // Re-hide dealer card with dummy values (anti-cheat)
    const dealerCards = elements.dealerCards.children;
    if (dealerCards.length > 1) {
      const holeCardEl = dealerCards[1];
      holeCardEl.classList.add('face-down');
      // Hide the real values again
      const cardFront = holeCardEl.querySelector('.card-front');
      cardFront.innerHTML = `
        <div class="card-corner top">
          <span class="card-value">?</span>
          <span class="card-suit">?</span>
        </div>
        <span class="card-center">?</span>
        <div class="card-corner bottom">
          <span class="card-value">?</span>
          <span class="card-suit">?</span>
        </div>
      `;
      holeCardEl.dataset.value = 'hidden';
      holeCardEl.dataset.suit = 'hidden';
      gameState.dealerHand[1].faceDown = true;
      updateScores();
    }
    startPlayerTurn();
  }
}

// ========================================
// DEALER TURN (AI)
// ========================================

async function revealDealerCard() {
  const holeCard = elements.dealerCards.children[1];
  if (holeCard && holeCard.classList.contains('face-down')) {
    // Reveal the actual card value first (anti-cheat: value wasn't in DOM)
    const actualCard = gameState.dealerHand[1];
    revealCardValue(holeCard, actualCard);
    gameState.dealerHand[1].faceDown = false;
    await flipCardUp(holeCard);
    updateScores();
  }
}

async function dealerTurn() {
  gameState.isDealerTurn = true;
  
  // Check if all player hands busted
  const playerScore = calculateScore(gameState.playerHand);
  const splitScore = gameState.hasSplit ? calculateScore(gameState.splitHand) : 0;
  
  if (playerScore > 21 && (!gameState.hasSplit || splitScore > 21)) {
    // All hands busted
    await revealDealerCard();
    await endGame('lose', 0);
    return;
  }
  
  // Reveal hole card
  await revealDealerCard();
  
  // Dealer hits on soft 17 and below
  let dealerScore = calculateScore(gameState.dealerHand);
  
  while (dealerScore < 17 || (dealerScore === 17 && hasAce(gameState.dealerHand) && gameState.dealerHand.length === 2)) {
    await new Promise(resolve => setTimeout(resolve, 800));
    await dealCardTo(gameState.dealerHand, elements.dealerCards, false, 0);
    dealerScore = calculateScore(gameState.dealerHand);
    updateScores();
  }
  
  // Determine winner
  await determineWinner();
}

function hasAce(hand) {
  return hand.some(card => card.value === 'A');
}

async function determineWinner() {
  const dealerScore = calculateScore(gameState.dealerHand);
  let totalWinnings = 0;
  let resultType = 'lose';
  
  // Check main hand
  const playerScore = calculateScore(gameState.playerHand);
  const mainHandResult = compareHands(playerScore, dealerScore);
  
  if (mainHandResult === 'win') {
    totalWinnings += gameState.betAmount * 2 / (gameState.hasSplit ? 2 : 1);
    resultType = 'win';
    // Mark winning cards
    markCards(elements.playerCards, 'winning');
    markCards(elements.dealerCards, 'losing');
  } else if (mainHandResult === 'push') {
    totalWinnings += gameState.betAmount / (gameState.hasSplit ? 2 : 1);
    resultType = 'push';
  } else {
    markCards(elements.playerCards, 'losing');
    markCards(elements.dealerCards, 'winning');
  }
  
  // Check split hand
  if (gameState.hasSplit) {
    const splitScore = calculateScore(gameState.splitHand);
    const splitResult = compareHands(splitScore, dealerScore);
    
    if (splitResult === 'win') {
      totalWinnings += gameState.betAmount;
      if (resultType !== 'win') resultType = 'win';
      markCards(elements.splitCards, 'winning');
    } else if (splitResult === 'push') {
      totalWinnings += gameState.betAmount / 2;
      if (resultType === 'lose') resultType = 'push';
    } else {
      markCards(elements.splitCards, 'losing');
    }
  }
  
  await endGame(resultType, totalWinnings);
}

function compareHands(playerScore, dealerScore) {
  if (playerScore > 21) return 'lose';
  if (dealerScore > 21) return 'win';
  if (playerScore > dealerScore) return 'win';
  if (playerScore < dealerScore) return 'lose';
  return 'push';
}

function markCards(container, className) {
  Array.from(container.children).forEach(card => {
    card.classList.add(className);
  });
}

// ========================================
// GAME END
// ========================================

async function endGame(result, winnings) {
  gameState.isPlaying = false;
  gameState.isPlayerTurn = false;
  gameState.isDealerTurn = false;
  
  // Calculate profit
  const profit = winnings - gameState.betAmount - (gameState.hasSplit ? gameState.betAmount / 2 : 0);
  
  // End game session in database
  if (window.CasinoDB && window.CasinoDB.endGameSession) {
    await window.CasinoDB.endGameSession(result === 'win' || result === 'blackjack', profit);
  }
  
  // Update balance
  if (winnings > 0) {
    await window.CasinoDB.updateBalance(winnings);
  }
  updateBalanceDisplay();
  
  // Update stats
  gameState.sessionProfit += profit;
  gameState.handsPlayed++;
  if (profit > gameState.bestWin) {
    gameState.bestWin = profit;
  }
  updateStats();
  
  // Award XP
  if (window.CasinoDB && window.CasinoDB.awardXP) {
    const xpAmount = Math.max(1, Math.floor(gameState.betAmount / 10));
    await window.CasinoDB.awardXP(xpAmount);
    updateBalanceDisplay();
  }
  
  // Show result
  showResult(result, profit);
  
  // Play sound
  if (result === 'win' || result === 'blackjack') {
    playSound('win');
  } else if (result === 'lose') {
    playSound('lose');
  } else {
    playSound('push');
  }
  
  // Update profit graph
  if (window.ProfitGraph) {
    window.ProfitGraph.addPoint(profit);
  }
  
  // UNLOCK BET - allow changing bet again
  betLocked = false;
  lockBetControls(false);
  
  // Re-enable play button after delay
  setTimeout(() => {
    elements.playBtn.disabled = false;
    elements.playBtn.textContent = 'Play';
    
    // Clear winning/losing classes
    document.querySelectorAll('.card.winning, .card.losing').forEach(card => {
      card.classList.remove('winning', 'losing');
    });
  }, 2000);
}

function showResult(result, profit) {
  const resultText = {
    'win': 'YOU WIN',
    'lose': 'YOU LOSE',
    'push': 'PUSH',
    'blackjack': 'BLACKJACK!'
  };
  
  elements.resultText.textContent = resultText[result];
  elements.resultText.className = 'result-text ' + result;
  
  if (profit >= 0) {
    elements.resultAmount.textContent = '+$' + profit.toFixed(2);
    elements.resultAmount.className = 'result-amount positive';
  } else {
    elements.resultAmount.textContent = '-$' + Math.abs(profit).toFixed(2);
    elements.resultAmount.className = 'result-amount negative';
  }
  
  elements.resultOverlay.classList.add('show');
  
  // Hide after delay
  setTimeout(() => {
    elements.resultOverlay.classList.remove('show');
  }, 2500);
}

function updateStats() {
  if (elements.sessionProfit) {
    const profitValue = gameState.sessionProfit.toFixed(2);
    elements.sessionProfit.textContent = (gameState.sessionProfit >= 0 ? '+$' : '-$') + Math.abs(profitValue);
    elements.sessionProfit.classList.toggle('positive', gameState.sessionProfit >= 0);
    elements.sessionProfit.classList.toggle('negative', gameState.sessionProfit < 0);
  }
  
  if (elements.handsPlayed) {
    elements.handsPlayed.textContent = gameState.handsPlayed;
  }
  
  if (elements.bestWin) {
    elements.bestWin.textContent = '$' + gameState.bestWin.toFixed(2);
    elements.bestWin.classList.toggle('positive', gameState.bestWin > 0);
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function playSound(type) {
  // Sound effects can be added here
  // For now, just console log
  console.log('Sound:', type);
}

function showToast(message) {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1f26;
    color: #fff;
    padding: 12px 24px;
    border-radius: 8px;
    border: 1px solid #2a3441;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Add CSS for toast animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes fadeOut {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to { opacity: 0; transform: translateX(-50%) translateY(20px); }
  }
`;
document.head.appendChild(style);

// Export for debugging
window.BlackjackGame = {
  gameState,
  startGame,
  hit,
  stand,
  split,
  doubleDown
};
