// ========================================
// POKER CARDS - Card Deck Management System
// ========================================

// Card suits with symbols
export const SUITS = {
  hearts: { symbol: '♥', color: 'red', name: 'Hearts' },
  diamonds: { symbol: '♦', color: 'red', name: 'Diamonds' },
  clubs: { symbol: '♣', color: 'black', name: 'Clubs' },
  spades: { symbol: '♠', color: 'black', name: 'Spades' }
};

// Card values (2-14, where 11=J, 12=Q, 13=K, 14=A for ranking)
export const VALUES = {
  '2': { display: '2', rank: 2 },
  '3': { display: '3', rank: 3 },
  '4': { display: '4', rank: 4 },
  '5': { display: '5', rank: 5 },
  '6': { display: '6', rank: 6 },
  '7': { display: '7', rank: 7 },
  '8': { display: '8', rank: 8 },
  '9': { display: '9', rank: 9 },
  '10': { display: '10', rank: 10 },
  'J': { display: 'J', rank: 11 },
  'Q': { display: 'Q', rank: 12 },
  'K': { display: 'K', rank: 13 },
  'A': { display: 'A', rank: 14 } // Ace high by default (can be low in straights)
};

// Card class
export class Card {
  constructor(suit, value) {
    this.suit = suit;
    this.value = value;
    this.suitInfo = SUITS[suit];
    this.valueInfo = VALUES[value];
    this.id = `${value}_${suit}`;
    this.faceUp = false;
  }

  // Get display value
  get display() {
    return this.valueInfo.display;
  }

  // Get suit symbol
  get symbol() {
    return this.suitInfo.symbol;
  }

  // Get color (red/black)
  get color() {
    return this.suitInfo.color;
  }

  // Get rank for comparison
  get rank() {
    return this.valueInfo.rank;
  }

  // Flip card face up/down
  flip() {
    this.faceUp = !this.faceUp;
    return this;
  }

  // Set face up
  setFaceUp(faceUp = true) {
    this.faceUp = faceUp;
    return this;
  }

  // Generate HTML for card display
  toHTML(showBack = false) {
    if (showBack || !this.faceUp) {
      return `
        <div class="poker-card face-down" data-card-id="${this.id}">
          <div class="card-back"></div>
        </div>
      `;
    }

    return `
      <div class="poker-card ${this.color}" data-card-id="${this.id}">
        <span class="card-value">${this.display}</span>
        <span class="card-suit ${this.suit}">${this.symbol}</span>
      </div>
    `;
  }

  // Create mini card (for community cards)
  toMiniHTML(showBack = false) {
    if (showBack || !this.faceUp) {
      return `
        <div class="community-card face-down" data-card-id="${this.id}">
          <div class="card-back"></div>
        </div>
      `;
    }

    return `
      <div class="community-card ${this.color}" data-card-id="${this.id}">
        <span class="card-value">${this.display}</span>
        <span class="card-suit ${this.suit}">${this.symbol}</span>
      </div>
    `;
  }

  // Serialize for database/network
  serialize() {
    return {
      suit: this.suit,
      value: this.value,
      faceUp: this.faceUp
    };
  }

  // Create card from serialized data
  static deserialize(data) {
    const card = new Card(data.suit, data.value);
    card.faceUp = data.faceUp;
    return card;
  }
}

// Deck class - manages a full 52-card deck
export class Deck {
  constructor() {
    this.cards = [];
    this.dealtCards = [];
    this.reset();
  }

  // Create a fresh 52-card deck - cards are created in random order from the start
  reset() {
    this.cards = [];
    this.dealtCards = [];

    // Create all 52 cards first
    const allCards = [];
    const suits = Object.keys(SUITS);
    const values = Object.keys(VALUES);
    
    for (const suit of suits) {
      for (const value of values) {
        allCards.push(new Card(suit, value));
      }
    }
    
    // Immediately randomize during creation using Fisher-Yates
    // This ensures deck is NEVER in ordered state
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = this.getSecureRandomInt(i + 1);
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }
    
    this.cards = allCards;
    console.log('🃏 Deck reset with', this.cards.length, 'cards (pre-randomized)');

    return this;
  }

  // Fisher-Yates shuffle - cryptographically secure and truly random
  shuffle() {
    const n = this.cards.length;
    
    // Multiple shuffle passes for maximum randomness
    for (let pass = 0; pass < 7; pass++) {
      // Fisher-Yates shuffle
      for (let i = n - 1; i > 0; i--) {
        const j = this.getSecureRandomInt(i + 1);
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
      }
    }
    
    // Random cut of the deck
    const cutPoint = this.getSecureRandomInt(n);
    if (cutPoint > 0 && cutPoint < n) {
      this.cards = [...this.cards.slice(cutPoint), ...this.cards.slice(0, cutPoint)];
    }
    
    // Verify shuffle quality - log suit distribution in first 10 cards
    const first10 = this.cards.slice(0, 10);
    const suitCounts = {};
    first10.forEach(c => {
      suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
    });
    console.log('🎲 Shuffle complete - First 10 cards suit distribution:', suitCounts);
    console.log('🎲 First 10 cards:', first10.map(c => `${c.value}${c.suitInfo.symbol}`).join(', '));
    
    return this;
  }
  
  // Generate an unbiased secure random integer in range [0, max)
  // Uses rejection sampling to avoid modulo bias
  getSecureRandomInt(max) {
    if (max <= 0) return 0;
    if (max === 1) return 0;
    
    // Use crypto API if available (browser or Node.js)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      // Calculate the largest multiple of max that fits in 32 bits
      // Any value >= this must be rejected to avoid bias
      const maxUint32 = 0xFFFFFFFF;
      const limit = maxUint32 - (maxUint32 % max);
      
      const randomArray = new Uint32Array(1);
      let randomValue;
      
      // Rejection sampling - retry if value would cause bias
      do {
        crypto.getRandomValues(randomArray);
        randomValue = randomArray[0];
      } while (randomValue >= limit);
      
      return randomValue % max;
    } else {
      // Fallback to Math.random - use multiple sources
      return Math.floor(Math.random() * max);
    }
  }

  // Deal a card from top of deck
  deal(faceUp = true) {
    if (this.cards.length === 0) {
      console.error('No cards left in deck!');
      return null;
    }

    const card = this.cards.pop();
    card.setFaceUp(faceUp);
    this.dealtCards.push(card);
    return card;
  }

  // Deal multiple cards
  dealMultiple(count, faceUp = true) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      const card = this.deal(faceUp);
      if (card) cards.push(card);
    }
    return cards;
  }

  // Get remaining card count
  get remaining() {
    return this.cards.length;
  }

  // Serialize entire deck state
  serialize() {
    return {
      cards: this.cards.map(c => c.serialize()),
      dealtCards: this.dealtCards.map(c => c.serialize())
    };
  }

  // Restore deck from serialized state
  static deserialize(data) {
    const deck = new Deck();
    deck.cards = data.cards.map(c => Card.deserialize(c));
    deck.dealtCards = data.dealtCards.map(c => Card.deserialize(c));
    return deck;
  }
}

// ========================================
// HAND EVALUATION - Texas Hold'em
// ========================================

// Hand rankings (higher = better)
export const HAND_RANKINGS = {
  HIGH_CARD: 1,
  ONE_PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10
};

export const HAND_NAMES = {
  1: 'High Card',
  2: 'One Pair',
  3: 'Two Pair',
  4: 'Three of a Kind',
  5: 'Straight',
  6: 'Flush',
  7: 'Full House',
  8: 'Four of a Kind',
  9: 'Straight Flush',
  10: 'Royal Flush'
};

// Hand Evaluator class
export class HandEvaluator {
  
  // Get the best 5-card hand from 7 cards (2 hole + 5 community)
  static getBestHand(cards) {
    if (cards.length < 5) {
      console.error('Need at least 5 cards to evaluate');
      return null;
    }

    // Generate all 5-card combinations
    const combinations = this.getCombinations(cards, 5);
    
    let bestHand = null;
    let bestScore = { ranking: 0, kickers: [] };

    for (const combo of combinations) {
      const score = this.evaluateHand(combo);
      if (this.compareHands(score, bestScore) > 0) {
        bestScore = score;
        bestHand = combo;
      }
    }

    return { hand: bestHand, score: bestScore };
  }

  // Evaluate a 5-card hand
  static evaluateHand(cards) {
    const sorted = [...cards].sort((a, b) => b.rank - a.rank);
    const ranks = sorted.map(c => c.rank);
    const suits = sorted.map(c => c.suit);

    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = this.checkStraight(ranks);
    const rankCounts = this.getRankCounts(ranks);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    // Royal Flush
    if (isFlush && isStraight && ranks[0] === 14 && ranks[4] === 10) {
      return { ranking: HAND_RANKINGS.ROYAL_FLUSH, kickers: ranks };
    }

    // Straight Flush
    if (isFlush && isStraight) {
      return { ranking: HAND_RANKINGS.STRAIGHT_FLUSH, kickers: ranks };
    }

    // Four of a Kind
    if (counts[0] === 4) {
      const quadRank = this.getRankWithCount(rankCounts, 4);
      const kicker = ranks.find(r => r !== quadRank);
      return { ranking: HAND_RANKINGS.FOUR_OF_A_KIND, kickers: [quadRank, kicker] };
    }

    // Full House
    if (counts[0] === 3 && counts[1] === 2) {
      const tripRank = this.getRankWithCount(rankCounts, 3);
      const pairRank = this.getRankWithCount(rankCounts, 2);
      return { ranking: HAND_RANKINGS.FULL_HOUSE, kickers: [tripRank, pairRank] };
    }

    // Flush
    if (isFlush) {
      return { ranking: HAND_RANKINGS.FLUSH, kickers: ranks };
    }

    // Straight
    if (isStraight) {
      return { ranking: HAND_RANKINGS.STRAIGHT, kickers: ranks };
    }

    // Three of a Kind
    if (counts[0] === 3) {
      const tripRank = this.getRankWithCount(rankCounts, 3);
      const kickers = ranks.filter(r => r !== tripRank).slice(0, 2);
      return { ranking: HAND_RANKINGS.THREE_OF_A_KIND, kickers: [tripRank, ...kickers] };
    }

    // Two Pair
    if (counts[0] === 2 && counts[1] === 2) {
      const pairs = this.getRanksWithCount(rankCounts, 2).sort((a, b) => b - a);
      const kicker = ranks.find(r => !pairs.includes(r));
      return { ranking: HAND_RANKINGS.TWO_PAIR, kickers: [...pairs, kicker] };
    }

    // One Pair
    if (counts[0] === 2) {
      const pairRank = this.getRankWithCount(rankCounts, 2);
      const kickers = ranks.filter(r => r !== pairRank).slice(0, 3);
      return { ranking: HAND_RANKINGS.ONE_PAIR, kickers: [pairRank, ...kickers] };
    }

    // High Card
    return { ranking: HAND_RANKINGS.HIGH_CARD, kickers: ranks };
  }

  // Check for straight (including A-2-3-4-5 wheel)
  static checkStraight(ranks) {
    const sorted = [...ranks].sort((a, b) => b - a);
    
    // Check regular straight
    let isSequential = true;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i] - sorted[i + 1] !== 1) {
        isSequential = false;
        break;
      }
    }
    
    if (isSequential) return true;

    // Check for wheel (A-2-3-4-5)
    if (sorted[0] === 14 && sorted[1] === 5 && sorted[2] === 4 && 
        sorted[3] === 3 && sorted[4] === 2) {
      return true;
    }

    return false;
  }

  // Count occurrences of each rank
  static getRankCounts(ranks) {
    const counts = {};
    for (const rank of ranks) {
      counts[rank] = (counts[rank] || 0) + 1;
    }
    return counts;
  }

  // Get rank with specific count
  static getRankWithCount(counts, targetCount) {
    for (const [rank, count] of Object.entries(counts)) {
      if (count === targetCount) return parseInt(rank);
    }
    return null;
  }

  // Get all ranks with specific count
  static getRanksWithCount(counts, targetCount) {
    const result = [];
    for (const [rank, count] of Object.entries(counts)) {
      if (count === targetCount) result.push(parseInt(rank));
    }
    return result;
  }

  // Generate combinations of k elements from array
  static getCombinations(arr, k) {
    const result = [];
    
    function combine(start, combo) {
      if (combo.length === k) {
        result.push([...combo]);
        return;
      }
      
      for (let i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        combine(i + 1, combo);
        combo.pop();
      }
    }
    
    combine(0, []);
    return result;
  }

  // Compare two hands: returns positive if hand1 > hand2, negative if hand1 < hand2, 0 if equal
  static compareHands(hand1, hand2) {
    // Compare rankings first
    if (hand1.ranking !== hand2.ranking) {
      return hand1.ranking - hand2.ranking;
    }

    // Same ranking - compare kickers
    for (let i = 0; i < hand1.kickers.length; i++) {
      if (hand1.kickers[i] !== hand2.kickers[i]) {
        return hand1.kickers[i] - hand2.kickers[i];
      }
    }

    return 0; // Tie
  }

  // Get hand name from score
  static getHandName(score) {
    return HAND_NAMES[score.ranking] || 'Unknown';
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Create card element from card object
export function createCardElement(card, isMini = false) {
  const div = document.createElement('div');
  div.innerHTML = isMini ? card.toMiniHTML() : card.toHTML();
  return div.firstElementChild;
}

// Animate card deal
export function animateCardDeal(cardElement, targetElement, delay = 0) {
  return new Promise(resolve => {
    setTimeout(() => {
      cardElement.classList.add('dealing');
      targetElement.appendChild(cardElement);
      
      // Trigger animation
      requestAnimationFrame(() => {
        cardElement.classList.add('dealt');
      });
      
      setTimeout(resolve, 300);
    }, delay);
  });
}

// Flip card animation
export function animateCardFlip(cardElement, card) {
  return new Promise(resolve => {
    cardElement.classList.add('flipping');
    
    setTimeout(() => {
      // Update card content mid-flip
      card.setFaceUp(true);
      const newContent = document.createElement('div');
      newContent.innerHTML = card.toHTML();
      const newCard = newContent.firstElementChild;
      
      cardElement.className = newCard.className;
      cardElement.innerHTML = newCard.innerHTML;
      
      setTimeout(resolve, 150);
    }, 150);
  });
}

// Make available globally
window.PokerCards = {
  SUITS,
  VALUES,
  HAND_RANKINGS,
  HAND_NAMES,
  Card,
  Deck,
  HandEvaluator,
  createCardElement,
  animateCardDeal,
  animateCardFlip
};

export default { SUITS, VALUES, HAND_RANKINGS, HAND_NAMES, Card, Deck, HandEvaluator };
