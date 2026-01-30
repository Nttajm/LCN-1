// ========================================
// POKER GAME - Texas Hold'em Game Logic
// ========================================

import { Card, Deck, HandEvaluator, HAND_NAMES } from './poker-cards.js';

// Game phases
export const GAME_PHASES = {
  WAITING: 'waiting',       // Waiting for players to join
  READY_CHECK: 'ready_check', // All players readying up
  PRE_FLOP: 'pre_flop',     // Initial betting round
  FLOP: 'flop',             // First 3 community cards
  TURN: 'turn',             // 4th community card
  RIVER: 'river',           // 5th community card
  SHOWDOWN: 'showdown',     // Revealing hands
  ENDED: 'ended'            // Game over
};

// Player actions
export const PLAYER_ACTIONS = {
  FOLD: 'fold',
  CHECK: 'check',
  CALL: 'call',
  RAISE: 'raise',
  ALL_IN: 'all_in'
};

// Chip colors and values
export const CHIP_VALUES = [
  { value: 1, color: '#ffffff', border: '#cccccc', name: 'White' },
  { value: 5, color: '#ef4444', border: '#dc2626', name: 'Red' },
  { value: 25, color: '#22c55e', border: '#16a34a', name: 'Green' },
  { value: 50, color: '#3b82f6', border: '#2563eb', name: 'Blue' },
  { value: 100, color: '#8b5cf6', border: '#7c3aed', name: 'Purple' },
  { value: 500, color: '#f59e0b', border: '#d97706', name: 'Orange' },
  { value: 1000, color: '#1f2937', border: '#111827', name: 'Black' }
];

// Maximum chips per tower
const MAX_CHIPS_PER_TOWER = 15;

// ========================================
// CHIP STACK UTILITIES
// ========================================

// Calculate chip breakdown by denomination (each denomination gets its own tower)
export function calculateChipTowers(amount) {
  const towers = {}; // { denomination: count }
  let remaining = amount;

  // Go from highest to lowest denomination
  for (let i = CHIP_VALUES.length - 1; i >= 0; i--) {
    const chipType = CHIP_VALUES[i];
    const count = Math.floor(remaining / chipType.value);
    
    if (count > 0) {
      // Limit each tower to MAX_CHIPS_PER_TOWER
      towers[chipType.value] = Math.min(count, MAX_CHIPS_PER_TOWER);
      remaining -= count * chipType.value;
    }
  }

  return towers;
}

// Get chip info by value
export function getChipByValue(value) {
  return CHIP_VALUES.find(c => c.value === value) || CHIP_VALUES[0];
}

// Generate HTML for a single chip
export function createChipHTML(chipValue, stackIndex = 0) {
  const chip = getChipByValue(chipValue);
  const offset = stackIndex * 3; // 3px vertical offset per chip
  
  return `<div class="poker-chip" 
    style="background-color: ${chip.color}; 
           border-color: ${chip.border}; 
           bottom: ${offset}px;
           z-index: ${stackIndex};"
    data-value="${chipValue}"></div>`;
}

// Generate HTML for a chip tower (single denomination)
export function createChipTowerHTML(chipValue, count, towerIndex = 0) {
  const chip = getChipByValue(chipValue);
  const actualCount = Math.min(count, MAX_CHIPS_PER_TOWER);
  
  let chipsHTML = '';
  for (let i = 0; i < actualCount; i++) {
    chipsHTML += createChipHTML(chipValue, i);
  }
  
  return `<div class="chip-tower" data-denomination="${chipValue}" style="--tower-index: ${towerIndex};">
    ${chipsHTML}
  </div>`;
}

// Generate HTML for all chip towers from an amount
export function createChipStackHTML(amount) {
  if (amount <= 0) return '';
  
  const towers = calculateChipTowers(amount);
  let html = '';
  let towerIndex = 0;
  
  // Generate towers from highest to lowest value for display order
  for (let i = CHIP_VALUES.length - 1; i >= 0; i--) {
    const chipValue = CHIP_VALUES[i].value;
    if (towers[chipValue] && towers[chipValue] > 0) {
      html += createChipTowerHTML(chipValue, towers[chipValue], towerIndex);
      towerIndex++;
    }
  }
  
  return html;
}

// Player class
export class Player {
  constructor(userId, displayName, photoURL, seatIndex) {
    this.id = userId;
    this.displayName = displayName;
    this.photoURL = photoURL || null;
    this.seatIndex = seatIndex;
    this.chips = 0;
    this.currentBet = 0;
    this.holeCards = [];
    this.isReady = false;
    this.isFolded = false;
    this.isAllIn = false;
    this.isConnected = true;
    this.isCurrentTurn = false;
    this.lastAction = null;
    this.showCards = false;
  }

  // Reset for new hand
  resetHand() {
    this.holeCards = [];
    this.currentBet = 0;
    this.isFolded = false;
    this.isAllIn = false;
    this.isCurrentTurn = false;
    this.lastAction = null;
    this.showCards = false;
  }

  // Place a bet
  bet(amount) {
    const actualBet = Math.min(amount, this.chips);
    this.chips -= actualBet;
    this.currentBet += actualBet;
    
    if (this.chips === 0) {
      this.isAllIn = true;
    }
    
    return actualBet;
  }

  // Win chips
  winChips(amount) {
    this.chips += amount;
  }

  // Serialize for network
  serialize(hideCards = true) {
    return {
      id: this.id,
      displayName: this.displayName,
      photoURL: this.photoURL,
      seatIndex: this.seatIndex,
      chips: this.chips,
      currentBet: this.currentBet,
      holeCards: hideCards && !this.showCards ? [] : this.holeCards.map(c => c.serialize()),
      isReady: this.isReady,
      isFolded: this.isFolded,
      isAllIn: this.isAllIn,
      isConnected: this.isConnected,
      isCurrentTurn: this.isCurrentTurn,
      lastAction: this.lastAction,
      showCards: this.showCards
    };
  }

  static deserialize(data) {
    const player = new Player(data.id, data.displayName, data.photoURL, data.seatIndex);
    player.chips = data.chips;
    player.currentBet = data.currentBet;
    player.holeCards = data.holeCards.map(c => Card.deserialize(c));
    player.isReady = data.isReady;
    player.isFolded = data.isFolded;
    player.isAllIn = data.isAllIn;
    player.isConnected = data.isConnected;
    player.isCurrentTurn = data.isCurrentTurn;
    player.lastAction = data.lastAction;
    player.showCards = data.showCards || false;
    return player;
  }
}

// Poker Game class
export class PokerGame {
  constructor(lobbyId, hostId, buyIn, maxPlayers = 6) {
    this.lobbyId = lobbyId;
    this.hostId = hostId;
    this.buyIn = buyIn;
    this.maxPlayers = maxPlayers;
    
    // Players
    this.players = new Array(maxPlayers).fill(null);
    this.playerOrder = []; // Order for betting
    
    // Deck and cards
    this.deck = new Deck();
    this.communityCards = [];
    
    // Game state
    this.phase = GAME_PHASES.WAITING;
    this.pot = 0;
    this.sidePots = [];
    this.currentBet = 0;
    this.minRaise = 0;
    this.dealerIndex = 0;
    this.currentPlayerIndex = 0;
    this.turnTimer = null;
    this.turnTimeLimit = 30; // seconds
    
    // Blinds
    this.smallBlind = Math.floor(buyIn / 100) || 1;
    this.bigBlind = this.smallBlind * 2;
    
    // History
    this.handHistory = [];
    this.roundActions = [];
  }

  // ========================================
  // PLAYER MANAGEMENT
  // ========================================

  // Add player to game
  addPlayer(userId, displayName, photoURL) {
    // Find first empty seat
    const emptySeat = this.players.findIndex(p => p === null);
    if (emptySeat === -1) {
      return { success: false, error: 'Game is full' };
    }

    // Check if player already in game
    if (this.players.find(p => p && p.id === userId)) {
      return { success: false, error: 'Already in game' };
    }

    const player = new Player(userId, displayName, photoURL, emptySeat);
    player.chips = this.buyIn;
    this.players[emptySeat] = player;
    
    return { success: true, seatIndex: emptySeat, player };
  }

  // Remove player from game
  removePlayer(userId) {
    const index = this.players.findIndex(p => p && p.id === userId);
    if (index === -1) {
      return { success: false, error: 'Player not found' };
    }

    const player = this.players[index];
    this.players[index] = null;

    // If game is in progress, fold their hand
    if (this.phase !== GAME_PHASES.WAITING && this.phase !== GAME_PHASES.ENDED) {
      player.isFolded = true;
      this.checkRoundComplete();
    }

    return { success: true, player };
  }

  // Get active players (not folded, has chips)
  getActivePlayers() {
    return this.players.filter(p => p && !p.isFolded && p.chips > 0);
  }

  // Get players still in hand
  getPlayersInHand() {
    return this.players.filter(p => p && !p.isFolded);
  }

  // Get ready players
  getReadyPlayers() {
    return this.players.filter(p => p && p.isReady);
  }

  // Get player count
  getPlayerCount() {
    return this.players.filter(p => p !== null).length;
  }

  // Set player ready status
  setPlayerReady(userId, isReady) {
    const player = this.players.find(p => p && p.id === userId);
    if (!player) return false;

    player.isReady = isReady;
    
    // Check if all players are ready to start
    this.checkStartGame();
    
    return true;
  }

  // ========================================
  // GAME FLOW
  // ========================================

  // Check if game can start
  checkStartGame() {
    const players = this.players.filter(p => p !== null);
    const readyPlayers = players.filter(p => p.isReady);
    
    // Need at least 2 ready players
    if (players.length >= 2 && readyPlayers.length === players.length) {
      this.startHand();
      return true;
    }
    
    return false;
  }

  // Start a new hand
  startHand() {
    console.log('═══════════════════════════════════════════');
    console.log('🎰 STARTING NEW HAND');
    console.log('═══════════════════════════════════════════');
    
    // Reset all players for new hand
    this.players.forEach(p => {
      if (p) p.resetHand();
    });

    // Reset game state
    this.communityCards = [];
    this.pot = 0;
    this.sidePots = [];
    this.currentBet = 0;
    this.roundActions = [];

    // Create a completely fresh deck each hand
    console.log('🃏 Creating new deck...');
    this.deck = new Deck();
    
    // Shuffle the deck
    console.log('🎲 Shuffling deck...');
    this.deck.shuffle();
    
    // DIAGNOSTIC: Log entire deck order to verify randomness
    const allCardsSorted = [...this.deck.cards];
    const suitDistribution = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
    allCardsSorted.forEach(c => suitDistribution[c.suit]++);
    
    console.log('📊 Deck suit distribution:', suitDistribution);
    console.log('🃏 Full deck order (first 20):', 
      allCardsSorted.slice(0, 20).map(c => `${c.value}${c.suitInfo.symbol}`).join(' '));
    
    // Check for any patterns - consecutive same suits
    let maxConsecutiveSameSuit = 0;
    let currentConsecutive = 1;
    for (let i = 1; i < allCardsSorted.length; i++) {
      if (allCardsSorted[i].suit === allCardsSorted[i-1].suit) {
        currentConsecutive++;
        maxConsecutiveSameSuit = Math.max(maxConsecutiveSameSuit, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }
    console.log('📊 Max consecutive same suit:', maxConsecutiveSameSuit, '(should be low, like 2-4)');
    
    // Verify deck has 52 unique cards
    const cardSet = new Set(this.deck.cards.map(c => c.id));
    if (cardSet.size !== 52) {
      console.error('❌ Deck integrity error! Expected 52 unique cards, got', cardSet.size);
    } else {
      console.log('✅ Deck integrity verified: 52 unique cards');
    }

    // Initialize dealer to first valid player if not set
    if (!this.players[this.dealerIndex]) {
      const firstPlayer = this.players.findIndex(p => p !== null);
      if (firstPlayer !== -1) {
        this.dealerIndex = firstPlayer;
      }
    }

    // Move dealer button to next valid player
    this.moveDealerButton();

    // Set blinds
    this.postBlinds();

    // Deal hole cards
    this.dealHoleCards();
    
    // DIAGNOSTIC: Check what cards players got
    console.log('═══════════════════════════════════════════');
    console.log('👥 CARDS DEALT TO PLAYERS:');
    this.players.forEach((p, i) => {
      if (p && p.holeCards.length >= 2) {
        const card1 = p.holeCards[0];
        const card2 = p.holeCards[1];
        const sameSuit = card1.suit === card2.suit;
        console.log(`  Seat ${i} (${p.displayName}): ${card1.value}${card1.suitInfo.symbol} ${card2.value}${card2.suitInfo.symbol} ${sameSuit ? '(SUITED)' : '(offsuit)'}`);
      }
    });
    console.log('═══════════════════════════════════════════');

    // Start pre-flop betting
    this.phase = GAME_PHASES.PRE_FLOP;
    this.startBettingRound();

    return true;
  }

  // Move dealer button to next player
  moveDealerButton() {
    const activePlayers = this.players.filter(p => p !== null);
    if (activePlayers.length === 0) return;

    // Find next valid dealer position
    let nextDealer = (this.dealerIndex + 1) % this.maxPlayers;
    let attempts = 0;
    
    while (!this.players[nextDealer] && attempts < this.maxPlayers) {
      nextDealer = (nextDealer + 1) % this.maxPlayers;
      attempts++;
    }
    
    // If we found a valid player, set them as dealer
    if (this.players[nextDealer]) {
      this.dealerIndex = nextDealer;
    } else {
      // Fallback: find first player
      const firstPlayerIndex = this.players.findIndex(p => p !== null);
      if (firstPlayerIndex !== -1) {
        this.dealerIndex = firstPlayerIndex;
      }
    }
  }

  // Post small and big blinds
  postBlinds() {
    const activePlayers = this.players.filter(p => p !== null);
    if (activePlayers.length < 2) return;

    // Find small blind position (left of dealer)
    let sbIndex = this.getNextActivePlayer(this.dealerIndex);
    let bbIndex = this.getNextActivePlayer(sbIndex);

    // Special case: heads up - dealer is small blind
    if (activePlayers.length === 2) {
      sbIndex = this.dealerIndex;
      bbIndex = this.getNextActivePlayer(sbIndex);
    }

    // Post blinds
    const sbPlayer = this.players[sbIndex];
    const bbPlayer = this.players[bbIndex];

    const sbAmount = sbPlayer.bet(this.smallBlind);
    const bbAmount = bbPlayer.bet(this.bigBlind);

    this.pot += sbAmount + bbAmount;
    this.currentBet = this.bigBlind;
    this.minRaise = this.bigBlind;

    // Action starts after big blind
    this.currentPlayerIndex = this.getNextActivePlayer(bbIndex);
  }

  // Deal hole cards to all players
  dealHoleCards() {
    console.log(`🃏 Dealing hole cards from deck (${this.deck.remaining} cards remaining)...`);
    
    // Deal 2 cards to each player (one at a time, going around the table twice - like real poker)
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < this.maxPlayers; i++) {
        const player = this.players[i];
        if (player) {
          const card = this.deck.deal(false); // Face down
          if (card) {
            player.holeCards.push(card);
          } else {
            console.error(`❌ Failed to deal card to ${player.displayName}!`);
          }
        }
      }
    }
    
    console.log(`🃏 Hole cards dealt. Deck now has ${this.deck.remaining} cards remaining.`);
  }

  // Start a betting round
  startBettingRound() {
    // Reset current bets for new round (except pre-flop blinds)
    if (this.phase !== GAME_PHASES.PRE_FLOP) {
      this.players.forEach(p => {
        if (p) p.currentBet = 0;
      });
      this.currentBet = 0;
      
      // Start with player after dealer
      this.currentPlayerIndex = this.getNextActivePlayer(this.dealerIndex);
    } else {
      // Pre-flop: action starts left of big blind
      // Find big blind position first
      let sbIndex = this.getNextActivePlayer(this.dealerIndex);
      let bbIndex = this.getNextActivePlayer(sbIndex);
      
      // Handle heads up
      const activePlayers = this.players.filter(p => p !== null);
      if (activePlayers.length === 2) {
        sbIndex = this.dealerIndex;
        bbIndex = this.getNextActivePlayer(sbIndex);
      }
      
      // Action starts with player after big blind
      this.currentPlayerIndex = this.getNextActivePlayer(bbIndex);
    }

    this.setCurrentPlayer();
  }

  // Set current player's turn
  setCurrentPlayer() {
    // Clear previous current player
    this.players.forEach(p => {
      if (p) p.isCurrentTurn = false;
    });

    // Find a valid player starting from currentPlayerIndex
    let attempts = 0;
    while (attempts < this.maxPlayers) {
      const player = this.players[this.currentPlayerIndex];
      
      // Valid player found - set their turn
      if (player && !player.isFolded && !player.isAllIn) {
        player.isCurrentTurn = true;
        this.startTurnTimer();
        return;
      }
      
      // Skip to next slot
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.maxPlayers;
      attempts++;
    }
    
    // No valid player found - end the betting round
    this.endBettingRound();
  }

  // Get next active player index
  getNextActivePlayer(fromIndex) {
    let next = (fromIndex + 1) % this.maxPlayers;
    let attempts = 0;
    
    while (attempts < this.maxPlayers) {
      const player = this.players[next];
      if (player && !player.isFolded && !player.isAllIn) {
        return next;
      }
      next = (next + 1) % this.maxPlayers;
      attempts++;
    }
    
    return -1; // No active players
  }

  // Advance to next player
  advanceToNextPlayer() {
    // First check if round is complete
    if (this.checkRoundComplete()) {
      this.endBettingRound();
      return;
    }
    
    const nextIndex = this.getNextActivePlayer(this.currentPlayerIndex);
    
    if (nextIndex === -1) {
      this.endBettingRound();
      return;
    }

    this.currentPlayerIndex = nextIndex;
    this.setCurrentPlayer();
  }

  // Check if betting round is complete
  checkRoundComplete() {
    const activePlayers = this.getPlayersInHand().filter(p => !p.isAllIn);
    const playersInHand = this.getPlayersInHand();
    
    // If only one player left, they win by default
    if (playersInHand.length <= 1) {
      // Collect remaining bets into pot
      this.collectBets();
      
      // Award pot to last player standing
      if (playersInHand.length === 1) {
        const winner = playersInHand[0];
        winner.winChips(this.pot);
        this.lastWinners = [{
          player: winner,
          winnings: this.pot,
          hand: null,
          handName: 'Last player standing'
        }];
        this.pot = 0;
      }
      
      this.phase = GAME_PHASES.ENDED;
      return true;
    }

    // Check if all active players have matched the current bet
    const allMatched = activePlayers.every(p => p.currentBet === this.currentBet);
    const allActed = activePlayers.every(p => p.lastAction !== null);

    return allMatched && allActed;
  }

  // End betting round and move to next phase
  endBettingRound() {
    // Collect bets into pot
    this.collectBets();

    // Reset player actions
    this.players.forEach(p => {
      if (p) p.lastAction = null;
    });

    // Move to next phase
    switch (this.phase) {
      case GAME_PHASES.PRE_FLOP:
        this.dealFlop();
        break;
      case GAME_PHASES.FLOP:
        this.dealTurn();
        break;
      case GAME_PHASES.TURN:
        this.dealRiver();
        break;
      case GAME_PHASES.RIVER:
        this.showdown();
        break;
    }
  }

  // Collect bets into pot
  collectBets() {
    this.players.forEach(p => {
      if (p) {
        this.pot += p.currentBet;
        p.currentBet = 0;
      }
    });
    this.currentBet = 0;
  }

  // ========================================
  // COMMUNITY CARDS
  // ========================================

  // Deal the flop (3 cards)
  dealFlop() {
    console.log(`🃏 Dealing flop - deck has ${this.deck.remaining} cards remaining`);
    this.deck.deal(false); // Burn card
    
    const flopCards = [];
    for (let i = 0; i < 3; i++) {
      const card = this.deck.deal(true);
      this.communityCards.push(card);
      flopCards.push(`${card.value}${card.suitInfo.symbol}`);
    }
    console.log(`🃏 Flop dealt:`, flopCards.join(', '));

    this.phase = GAME_PHASES.FLOP;
    this.startBettingRound();
  }

  // Deal the turn (1 card)
  dealTurn() {
    console.log(`🃏 Dealing turn - deck has ${this.deck.remaining} cards remaining`);
    this.deck.deal(false); // Burn card
    const card = this.deck.deal(true);
    this.communityCards.push(card);
    console.log(`🃏 Turn dealt: ${card.value}${card.suitInfo.symbol}`);

    this.phase = GAME_PHASES.TURN;
    this.startBettingRound();
  }

  // Deal the river (1 card)
  dealRiver() {
    console.log(`🃏 Dealing river - deck has ${this.deck.remaining} cards remaining`);
    this.deck.deal(false); // Burn card
    const card = this.deck.deal(true);
    this.communityCards.push(card);
    console.log(`🃏 River dealt: ${card.value}${card.suitInfo.symbol}`);

    this.phase = GAME_PHASES.RIVER;
    this.startBettingRound();
  }

  // ========================================
  // PLAYER ACTIONS
  // ========================================

  // Handle player action
  handleAction(userId, action, amount = 0) {
    const player = this.players.find(p => p && p.id === userId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (!player.isCurrentTurn) {
      return { success: false, error: 'Not your turn' };
    }

    const previousPhase = this.phase;
    let result = { success: false };

    switch (action) {
      case PLAYER_ACTIONS.FOLD:
        result = this.handleFold(player);
        break;
      case PLAYER_ACTIONS.CHECK:
        result = this.handleCheck(player);
        break;
      case PLAYER_ACTIONS.CALL:
        result = this.handleCall(player);
        break;
      case PLAYER_ACTIONS.RAISE:
        result = this.handleRaise(player, amount);
        break;
      case PLAYER_ACTIONS.ALL_IN:
        result = this.handleAllIn(player);
        break;
      default:
        result = { success: false, error: 'Invalid action' };
    }

    if (result.success) {
      player.lastAction = action;
      this.roundActions.push({
        playerId: userId,
        action,
        amount: result.amount || 0,
        timestamp: Date.now()
      });

      this.clearTurnTimer();
      this.advanceToNextPlayer();
      
      // Add game state info to result
      result.phase = this.phase;
      result.previousPhase = previousPhase;
      result.roundEnded = this.phase !== previousPhase;
      result.gameEnded = this.phase === GAME_PHASES.SHOWDOWN || this.phase === GAME_PHASES.ENDED;
      result.pot = this.pot;
      
      // If game ended, include winner info
      if (this.phase === GAME_PHASES.SHOWDOWN || this.phase === GAME_PHASES.ENDED) {
        const winners = this.getWinners();
        if (winners && winners.length > 0) {
          result.winners = winners;
          result.winner = winners[0].player;
          result.potWon = winners[0].winnings;
        }
      }
    }

    return result;
  }

  // Get the current winners (after showdown)
  getWinners() {
    return this.lastWinners || [];
  }

  // Fold
  handleFold(player) {
    player.isFolded = true;
    player.isCurrentTurn = false;
    return { success: true, action: PLAYER_ACTIONS.FOLD };
  }

  // Check (only if no bet to call)
  handleCheck(player) {
    if (player.currentBet < this.currentBet) {
      return { success: false, error: 'Cannot check, must call or raise' };
    }
    return { success: true, action: PLAYER_ACTIONS.CHECK };
  }

  // Call (match current bet)
  handleCall(player) {
    const toCall = this.currentBet - player.currentBet;
    
    if (toCall <= 0) {
      return { success: false, error: 'Nothing to call' };
    }

    const actualBet = player.bet(toCall);
    
    return { success: true, action: PLAYER_ACTIONS.CALL, amount: actualBet };
  }

  // Raise
  handleRaise(player, raiseAmount) {
    const toCall = this.currentBet - player.currentBet;
    const totalBet = toCall + raiseAmount;

    // Allow smaller raises if player can't afford minimum (short stack all-in scenario)
    const canAffordMinRaise = player.chips >= toCall + this.minRaise;
    if (canAffordMinRaise && raiseAmount < this.minRaise) {
      return { success: false, error: `Minimum raise is $${this.minRaise}` };
    }
    
    // Must raise at least $1
    if (raiseAmount < 1) {
      return { success: false, error: 'Raise must be at least $1' };
    }

    if (totalBet > player.chips) {
      return { success: false, error: 'Not enough chips' };
    }

    const actualBet = player.bet(totalBet);
    this.currentBet = player.currentBet;
    // Only update minRaise if this raise meets or exceeds current minRaise
    if (raiseAmount >= this.minRaise) {
      this.minRaise = raiseAmount;
    }

    return { success: true, action: PLAYER_ACTIONS.RAISE, amount: actualBet };
  }

  // All-in
  handleAllIn(player) {
    const allInAmount = player.chips;
    player.bet(allInAmount);
    
    if (player.currentBet > this.currentBet) {
      this.currentBet = player.currentBet;
    }

    return { success: true, action: PLAYER_ACTIONS.ALL_IN, amount: allInAmount };
  }

  // ========================================
  // SHOWDOWN & WINNER DETERMINATION
  // ========================================

  showdown() {
    this.phase = GAME_PHASES.SHOWDOWN;

    // Show all remaining players' cards
    this.getPlayersInHand().forEach(p => {
      p.showCards = true;
      p.holeCards.forEach(c => c.setFaceUp(true));
    });

    // Determine winner(s)
    const winners = this.determineWinners();
    
    // Distribute pot
    this.distributePot(winners);
    
    // Store winners for retrieval
    this.lastWinners = winners;

    // End hand after delay
    setTimeout(() => this.endHand(), 5000);

    return winners;
  }

  // Determine winner(s) of the hand
  determineWinners() {
    const playersInHand = this.getPlayersInHand();
    
    if (playersInHand.length === 1) {
      console.log('🏆 Winner by default (all others folded):', playersInHand[0].displayName);
      return [{ player: playersInHand[0], hand: null, score: null, handName: 'Win by Fold' }];
    }

    console.log('🔍 Evaluating hands for', playersInHand.length, 'players...');
    console.log('📋 Community cards:', this.communityCards.map(c => `${c.value}${c.suitInfo.symbol}`).join(', '));

    // Evaluate each player's best hand
    const evaluations = playersInHand.map(player => {
      const allCards = [...player.holeCards, ...this.communityCards];
      
      console.log(`👤 ${player.displayName} - Hole cards:`, 
        player.holeCards.map(c => `${c.value}${c.suitInfo.symbol}`).join(', '),
        '| All 7 cards:', allCards.map(c => `${c.value}${c.suitInfo.symbol}`).join(', ')
      );
      
      const result = HandEvaluator.getBestHand(allCards);
      const handName = HandEvaluator.getHandName(result.score);
      
      console.log(`   ➜ Best hand: ${handName} (rank ${result.score.ranking})`,
        '| Best 5:', result.hand.map(c => `${c.value}${c.suitInfo.symbol}`).join(', '),
        '| Kickers:', result.score.kickers.join(', ')
      );
      
      return {
        player,
        hand: result.hand,
        score: result.score,
        handName: handName
      };
    });

    // Sort by hand strength (highest first)
    evaluations.sort((a, b) => HandEvaluator.compareHands(b.score, a.score));

    // Find all winners (could be ties)
    const winners = [evaluations[0]];
    for (let i = 1; i < evaluations.length; i++) {
      if (HandEvaluator.compareHands(evaluations[i].score, evaluations[0].score) === 0) {
        winners.push(evaluations[i]);
      } else {
        break;
      }
    }

    console.log('🏆 Winner(s):', winners.map(w => `${w.player.displayName} with ${w.handName}`).join(', '));

    return winners;
  }

  // Distribute pot to winner(s)
  distributePot(winners) {
    const share = Math.floor(this.pot / winners.length);
    const remainder = this.pot % winners.length;

    winners.forEach((winner, index) => {
      const amount = share + (index === 0 ? remainder : 0);
      winner.player.winChips(amount);
      winner.winnings = amount;
    });

    this.pot = 0;
  }

  // End the hand
  endHand() {
    this.phase = GAME_PHASES.ENDED;

    // Reset ready status
    this.players.forEach(p => {
      if (p) {
        p.isReady = false;
        p.resetHand();
      }
    });

    // Remove busted players
    this.players.forEach((p, i) => {
      if (p && p.chips <= 0) {
        this.players[i] = null;
      }
    });

    // Check if game can continue
    if (this.getPlayerCount() >= 2) {
      this.phase = GAME_PHASES.WAITING;
    }
  }

  // ========================================
  // TIMER
  // ========================================

  startTurnTimer() {
    this.clearTurnTimer();
    
    this.turnTimer = setTimeout(() => {
      // Auto-fold on timeout
      const player = this.players[this.currentPlayerIndex];
      if (player && player.isCurrentTurn) {
        this.handleAction(player.id, PLAYER_ACTIONS.FOLD);
      }
    }, this.turnTimeLimit * 1000);
  }

  clearTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  // ========================================
  // UTILITY
  // ========================================

  // Calculate chips for display
  static calculateChipStack(amount) {
    const chips = [];
    let remaining = amount;

    for (let i = CHIP_VALUES.length - 1; i >= 0; i--) {
      const chipValue = CHIP_VALUES[i];
      while (remaining >= chipValue.value && chips.length < 15) {
        chips.push(chipValue);
        remaining -= chipValue.value;
      }
    }

    return chips;
  }

  // Get available actions for player
  getAvailableActions(userId) {
    const player = this.players.find(p => p && p.id === userId);
    if (!player || !player.isCurrentTurn) {
      return [];
    }

    const actions = [PLAYER_ACTIONS.FOLD];
    const toCall = this.currentBet - player.currentBet;

    if (toCall === 0) {
      actions.push(PLAYER_ACTIONS.CHECK);
    } else {
      actions.push(PLAYER_ACTIONS.CALL);
    }

    if (player.chips > toCall + this.minRaise) {
      actions.push(PLAYER_ACTIONS.RAISE);
    }

    actions.push(PLAYER_ACTIONS.ALL_IN);

    return actions;
  }

  // Serialize game state for network
  // forUserId = null means include all cards (for Firebase storage)
  // forUserId = 'user_id' means hide other players' cards (for local display)
  serialize(forUserId = null) {
    return {
      lobbyId: this.lobbyId,
      hostId: this.hostId,
      buyIn: this.buyIn,
      maxPlayers: this.maxPlayers,
      players: this.players.map(p => {
        if (!p) return null;
        // If forUserId is null, include all cards (for Firebase sync)
        // Otherwise hide cards except for the specified user or during showdown
        const hideCards = forUserId !== null && 
                         p.id !== forUserId && 
                         this.phase !== GAME_PHASES.SHOWDOWN;
        return p.serialize(hideCards);
      }),
      communityCards: this.communityCards.map(c => c.serialize()),
      deck: this.deck.serialize(), // Include deck state for proper synchronization
      phase: this.phase,
      pot: this.pot,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      dealerIndex: this.dealerIndex,
      currentPlayerIndex: this.currentPlayerIndex,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      lastWinners: this.lastWinners ? this.lastWinners.map(w => ({
        playerId: w.player.id,
        displayName: w.player.displayName,
        winnings: w.winnings,
        handName: w.handName || null
      })) : []
    };
  }

  // Restore game from serialized state
  static deserialize(data) {
    const game = new PokerGame(data.lobbyId, data.hostId, data.buyIn, data.maxPlayers);
    
    game.players = data.players.map(p => p ? Player.deserialize(p) : null);
    game.communityCards = data.communityCards.map(c => Card.deserialize(c));
    
    // Restore the deck state if available (critical for proper card dealing)
    if (data.deck) {
      game.deck = Deck.deserialize(data.deck);
    } else {
      // Legacy: if no deck data, create fresh shuffled deck
      console.warn('⚠️ No deck data in game state - cards may not be synchronized');
      game.deck = new Deck();
      game.deck.shuffle();
    }
    
    game.phase = data.phase;
    game.pot = data.pot;
    game.currentBet = data.currentBet;
    game.minRaise = data.minRaise;
    game.dealerIndex = data.dealerIndex;
    game.currentPlayerIndex = data.currentPlayerIndex;
    game.smallBlind = data.smallBlind;
    game.bigBlind = data.bigBlind;
    
    // Restore lastWinners (without full player objects)
    if (data.lastWinners && data.lastWinners.length > 0) {
      game.lastWinners = data.lastWinners.map(w => ({
        player: { id: w.playerId, displayName: w.displayName },
        winnings: w.winnings,
        handName: w.handName
      }));
    }

    return game;
  }
}

// Make available globally
window.PokerGame = {
  GAME_PHASES,
  PLAYER_ACTIONS,
  CHIP_VALUES,
  Player,
  PokerGame
};

export default { GAME_PHASES, PLAYER_ACTIONS, CHIP_VALUES, Player, PokerGame };
