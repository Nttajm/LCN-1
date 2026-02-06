// ========================================
// CHEST OPENER - EXACT FROM CARDS.HTML
// ========================================

import { cardsData, rarityWeights, uncommonPlusWeights, epicPlusWeights, getCardsByRarity } from '../../card-data/cards-data.js';
import { CasinoDB, CasinoAuth } from './casino-auth.js';
import { createCardHTML, createReelCardHTML, setup3DCardTracking } from '../../card-data/card-renderer.js';

// Constants - EXACT from cards.html
const CARD_WIDTH = 280;
const CARD_GAP = 20;
const TOTAL_CARD_WIDTH = CARD_WIDTH + CARD_GAP;
const SPIN_DURATION = 6000;

let isSpinning = false;
let animationSkipped = false; // Track if animation was skipped
let currentWinningCard = null;
let overlayElement = null;

// Select winning card based on weights - EXACT from cards.html
function selectWinningCard(weights = rarityWeights) {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (const [rarity, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      const cardsOfRarity = getCardsByRarity(rarity);
      if (cardsOfRarity.length > 0) {
        return cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)];
      }
    }
  }
  
  return cardsData[Math.floor(Math.random() * cardsData.length)];
}

// Generate reel cards - Uses weighted distribution to feel realistic
// Lots of commons/uncommons with occasional legendaries for excitement
function generateReelCards(winningCard, totalCards = 120) {
  const reelCards = [];
  const winningPosition = Math.floor(totalCards * 0.6); // Win at 60% through
  
  // Weighted selection for realistic feel - matches actual drop rates
  function getRandomCardByWeight() {
    const reelWeights = {
      common: 45,
      uncommon: 30,
      rare: 15,
      epic: 6,
      legendary: 2,
      mythic: 1
    };
    
    const totalWeight = Object.values(reelWeights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (const [rarity, weight] of Object.entries(reelWeights)) {
      random -= weight;
      if (random <= 0) {
        const cardsOfRarity = getCardsByRarity(rarity);
        if (cardsOfRarity.length > 0) {
          return cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)];
        }
      }
    }
    // Fallback to common
    const commons = getCardsByRarity('common');
    return commons.length > 0 ? commons[0] : cardsData[0];
  }
  
  // Sprinkle in some guaranteed legendaries at specific spots for excitement ("near miss" moments)
  const legendarySpots = [8, 20, 35, 50, 65, 85, 100, 110]; // Positions where a legendary will appear
  const epicSpots = [12, 28, 42, 58, 75, 92, 105]; // Positions where an epic will appear
  
  for (let i = 0; i < totalCards; i++) {
    if (i === winningPosition) {
      reelCards.push(winningCard);
    } else if (legendarySpots.includes(i)) {
      // Force a legendary or mythic for excitement
      const legendaries = getCardsByRarity('legendary');
      const mythics = getCardsByRarity('mythic');
      const highTier = [...legendaries, ...mythics];
      if (highTier.length > 0) {
        reelCards.push(highTier[Math.floor(Math.random() * highTier.length)]);
      } else {
        reelCards.push(getRandomCardByWeight());
      }
    } else if (epicSpots.includes(i)) {
      // Force an epic
      const epics = getCardsByRarity('epic');
      if (epics.length > 0) {
        reelCards.push(epics[Math.floor(Math.random() * epics.length)]);
      } else {
        reelCards.push(getRandomCardByWeight());
      }
    } else {
      // Use weighted random (mostly commons/uncommons)
      reelCards.push(getRandomCardByWeight());
    }
  }
  
  return { cards: reelCards, winningPosition };
}

// Create particles - EXACT from cards.html
function createParticles(container) {
  const particlesContainer = document.createElement('div');
  particlesContainer.className = 'chest-particles';
  
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.className = 'chest-particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
    particle.style.animationDelay = Math.random() * 10 + 's';
    particle.style.width = (Math.random() * 4 + 2) + 'px';
    particle.style.height = particle.style.width;
    particlesContainer.appendChild(particle);
  }
  
  container.appendChild(particlesContainer);
}

// Create burst particles on reveal - EXACT from cards.html
function createBurstParticles(container, rarity) {
  const colors = {
    mythic: ['#ff0080', '#7928ca', '#00d4ff'],
    legendary: ['#ffcc00', '#ff6b35', '#f7931e'],
    epic: ['#a855f7', '#8b5cf6', '#c084fc'],
    rare: ['#3b82f6', '#60a5fa', '#93c5fd'],
    uncommon: ['#10b981', '#34d399', '#6ee7b7'],
    common: ['#6b7280', '#9ca3af', '#d1d5db']
  };
  
  const burstContainer = document.createElement('div');
  burstContainer.className = 'burst-particles';
  
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'burst-particle';
    const angle = (i / 30) * Math.PI * 2;
    const distance = 150 + Math.random() * 200;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    particle.style.setProperty('--tx', tx + 'px');
    particle.style.setProperty('--ty', ty + 'px');
    particle.style.background = colors[rarity][Math.floor(Math.random() * colors[rarity].length)];
    particle.style.animationDelay = (Math.random() * 0.3) + 's';
    burstContainer.appendChild(particle);
  }
  
  container.appendChild(burstContainer);
  setTimeout(() => burstContainer.remove(), 1500);
}

// Start spin animation - EXACT from cards.html
function startSpinAnimation(reelTrack, winningPosition, callback) {
  const reelFrame = reelTrack.closest('.reel-frame');
  const frameWidth = reelFrame.offsetWidth;
  const centerOffset = (frameWidth / 2) - (CARD_WIDTH / 2);
  
  // Start position: cards start from right side (positive offset to show beginning)
  const startOffset = centerOffset;
  const targetPosition = (winningPosition * TOTAL_CARD_WIDTH) - centerOffset;
  
  // Add slight random offset for natural feel
  const randomOffset = (Math.random() - 0.5) * 20;
  const finalPosition = -(targetPosition) + randomOffset;
  
  // Set initial position
  reelTrack.style.transform = `translateY(-50%) translateX(${startOffset}px)`;

  const startTime = performance.now();
  
  // Reset skip flag at start of animation
  animationSkipped = false;
  
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }
  
  const totalDistance = finalPosition - startOffset;
  
  function animate(currentTime) {
    // If animation was skipped, stop the loop
    if (animationSkipped) {
      return;
    }
    
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / SPIN_DURATION, 1);
    const eased = easeOutQuart(progress);
    
    const currentPosition = startOffset + (totalDistance * eased);
    reelTrack.style.transform = `translateY(-50%) translateX(${currentPosition}px)`;
    
    // Highlight center card during spin
    highlightCenterCard(reelTrack, currentPosition);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      callback();
    }
  }
  
  requestAnimationFrame(animate);
}

// Highlight center card - EXACT from cards.html
function highlightCenterCard(track, position) {
  const reelFrame = track.closest('.reel-frame');
  const frameWidth = reelFrame.offsetWidth;
  const centerX = frameWidth / 2;
  const cards = track.querySelectorAll('.reel-card');
  
  cards.forEach((card, index) => {
    const cardCenterX = (index * TOTAL_CARD_WIDTH) + (CARD_WIDTH / 2) + position;
    const distance = Math.abs(cardCenterX - centerX);
    const cardElement = card.querySelector('.card');
    
    if (distance < CARD_WIDTH / 2) {
      card.style.opacity = '1';
      card.style.transform = 'scale(1.05)';
      card.style.filter = 'brightness(1.2) saturate(1.2)';
      if (cardElement) {
        cardElement.style.boxShadow = '0 0 40px rgba(255, 255, 255, 0.4), 0 0 80px currentColor';
      }
    } else if (distance < CARD_WIDTH) {
      card.style.opacity = '0.7';
      card.style.transform = 'scale(0.98)';
      card.style.filter = 'brightness(0.9)';
      if (cardElement) cardElement.style.boxShadow = '';
    } else {
      card.style.opacity = '0.4';
      card.style.transform = 'scale(0.95)';
      card.style.filter = 'brightness(0.6)';
      if (cardElement) cardElement.style.boxShadow = '';
    }
  });
}

// Show reveal - Enhanced with 3D tracking
async function showReveal(winningCard) {
  const revealOverlay = overlayElement.querySelector('.reveal-overlay');
  const revealText = revealOverlay.querySelector('.reveal-text');
  const revealCardContainer = revealOverlay.querySelector('.reveal-card-container');
  const revealGlow = revealOverlay.querySelector('.reveal-glow');
  const soundWaves = revealOverlay.querySelector('.sound-waves');
  
  // Save card to user's collection
  try {
    const saveResult = await CasinoDB.saveCard(winningCard.cardNumber);
    if (saveResult.success) {
      console.log(`Card ${winningCard.cardNumber} saved successfully! Doc ID: ${saveResult.cardDocId}`);
    } else {
      console.error(`Failed to save card ${winningCard.cardNumber}:`, saveResult.error);
      // Show error to user
      alert(`Failed to save card to your collection: ${saveResult.error}. Please make sure you are signed in.`);
    }
  } catch (error) {
    console.error('Error saving card:', error);
    alert('Error saving card to your collection. Please try again.');
  }
  
  // Set rarity classes
  revealText.className = 'reveal-text ' + winningCard.rarity;
  revealText.textContent = winningCard.rarity.toUpperCase() + '!';
  revealGlow.className = 'reveal-glow ' + winningCard.rarity;
  
  // Set sound wave color
  const soundWaveColors = {
    mythic: '#ff0080',
    legendary: '#ffcc00',
    epic: '#a855f7',
    rare: '#3b82f6',
    uncommon: '#10b981',
    common: '#9ca3af'
  };
  soundWaves.querySelectorAll('.sound-wave').forEach(wave => {
    wave.style.color = soundWaveColors[winningCard.rarity];
  });
  
  // Create card HTML
  revealCardContainer.innerHTML = createCardHTML(winningCard, 0);
  
  // Enable 3D mouse tracking on revealed card
  setTimeout(() => {
    setup3DCardTracking(revealCardContainer);
  }, 100);
  
  // Create burst particles
  createBurstParticles(revealOverlay, winningCard.rarity);
  
  // Hide reel and show reveal
  overlayElement.querySelector('.reel-container').classList.remove('active');
  revealOverlay.classList.add('active');
  
  isSpinning = false;
}

// Close reveal - EXACT from cards.html
function closeReveal() {
  const revealOverlay = overlayElement.querySelector('.reveal-overlay');
  revealOverlay.classList.remove('active');
  overlayElement.classList.remove('active');
  
  // Reset
  const reelContainer = overlayElement.querySelector('.reel-container');
  const reelTrack = reelContainer.querySelector('.reel-track');
  reelTrack.innerHTML = '';
  reelTrack.style.transform = 'translateY(-50%)';
  
  isSpinning = false;
  currentWinningCard = null;
}

// Skip animation
function skipAnimation() {
  // Only skip if currently spinning and we have a winning card
  if (isSpinning && currentWinningCard && !animationSkipped) {
    animationSkipped = true; // Set flag to stop the animation loop
    // Immediately show reveal
    showReveal(currentWinningCard);
  }
}

// Create overlay HTML
function createOverlayHTML() {
  return `
    <div class="chest-opener-overlay">
      <!-- Reel Container -->
      <div class="reel-container">
        <div class="reel-frame">
          <div class="reel-indicator"></div>
          <div class="reel-track"></div>
        </div>
        <div class="skip-hint">CLICK TO SKIP</div>
      </div>
      
      <!-- Reveal Overlay -->
      <div class="reveal-overlay">
        <div class="reveal-glow"></div>
        <div class="sound-waves">
          <div class="sound-wave"></div>
          <div class="sound-wave"></div>
          <div class="sound-wave"></div>
        </div>
        <div class="reveal-text">LEGENDARY!</div>
        <div class="reveal-card-container"></div>
        <button class="close-reveal-btn">CLOSE</button>
      </div>
    </div>
  `;
}

// Initialize chest opener
export function initChestOpener() {
  // Create overlay element if not exists
  if (!document.querySelector('.chest-opener-overlay')) {
    const overlayWrapper = document.createElement('div');
    overlayWrapper.innerHTML = createOverlayHTML();
    overlayElement = overlayWrapper.firstElementChild;
    document.body.appendChild(overlayElement);
    
    // Add particles
    createParticles(overlayElement);
    
    // Event listeners
    overlayElement.querySelector('.reel-container').addEventListener('click', skipAnimation);
    overlayElement.querySelector('.close-reveal-btn').addEventListener('click', closeReveal);
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (isSpinning) {
          skipAnimation();
        } else if (overlayElement.querySelector('.reveal-overlay').classList.contains('active')) {
          closeReveal();
        }
      }
    });
  } else {
    overlayElement = document.querySelector('.chest-opener-overlay');
  }
}

// Open chest - MAIN EXPORT FUNCTION
export async function openChest(chestType = 'normal') {
  if (isSpinning) return { success: false, error: 'Already spinning' };
  
  // Check if user is signed in - REQUIRED to save cards
  if (!CasinoAuth.currentUser) {
    alert('Please sign in to open chests and receive cards!');
    return { success: false, error: 'Not signed in' };
  }
  
  // Initialize if needed
  if (!overlayElement) {
    initChestOpener();
  }
  
  // Handle payment based on chest type
  if (chestType === 'uncommon' || chestType === 'epic') {
    // Money chests - deduct balance
    const purchaseResult = await CasinoDB.purchaseChest(chestType);
    if (!purchaseResult.success) {
      alert(purchaseResult.error);
      return { success: false, error: purchaseResult.error };
    }
    console.log(`Purchased ${chestType} chest for $${purchaseResult.cost}. New balance: $${purchaseResult.newBalance}`);
  } else if (chestType === 'xp') {
    // XP chest - claim one available chest
    const claimResult = await CasinoDB.claimXpChest();
    if (!claimResult.success) {
      alert(claimResult.error);
      return { success: false, error: claimResult.error };
    }
    console.log(`Claimed XP chest. Total claimed: ${claimResult.chestsClaimed}, Remaining: ${claimResult.chestsRemaining}`);
  }
  
  // Reset skip flag for new chest
  animationSkipped = false;
  
  // Select weights based on chest type
  let weights;
  switch (chestType) {
    case 'xp':
      weights = rarityWeights; // Normal weights for XP chest
      break;
    case 'uncommon':
      weights = uncommonPlusWeights; // Uncommon+ for $250 chest
      break;
    case 'epic':
      weights = epicPlusWeights; // Epic+ for $1000 chest
      break;
    default:
      weights = rarityWeights;
  }
  
  // Select winning card
  currentWinningCard = selectWinningCard(weights);
  
  // Generate reel
  const { cards, winningPosition } = generateReelCards(currentWinningCard);
  
  // Build reel HTML
  const reelTrack = overlayElement.querySelector('.reel-track');
  reelTrack.innerHTML = cards.map(card => createReelCardHTML(card)).join('');
  
  // Show overlay and reel
  overlayElement.classList.add('active');
  overlayElement.querySelector('.reel-container').classList.add('active');
  
  // Start spinning
  isSpinning = true;
  
  setTimeout(() => {
    startSpinAnimation(reelTrack, winningPosition, () => {
      setTimeout(() => {
        showReveal(currentWinningCard);
      }, 500);
    });
  }, 100);
  
  return { success: true };
}
