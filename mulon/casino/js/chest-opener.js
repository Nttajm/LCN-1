// ========================================
// CHEST OPENER - EXACT FROM CARDS.HTML
// ========================================

import { cardsData, rarityWeights, uncommonPlusWeights, legendaryWeights, getCardsByRarity } from './cards-data.js';
import { CasinoDB } from './casino-auth.js';

// Constants - EXACT from cards.html
const CARD_WIDTH = 280;
const CARD_GAP = 20;
const SPIN_DURATION = 6000;

let isSpinning = false;
let currentWinningCard = null;
let overlayElement = null;

// Create card HTML - Clean technical layout
function createCardHTML(card, index) {
  // Generate linked source based on card type
  const linkedSources = ['Apple Stock', 'Tesla Stock', 'Gold Index', 'Crypto BTC', 'S&P 500', 'Trade Value'];
  const linkedSource = linkedSources[Math.floor(Math.random() * linkedSources.length)];
  
  return `
    <div class="card-wrapper">
      <div class="card ${card.rarity}" data-index="${index}">
        <div class="card-front">
          <div class="card-inner">
            <!-- Top header bar -->
            <div class="card-header-bar">
              <div class="card-id">${card.cardNumber}</div>
              <div class="rarity-tag">${card.rarity.toUpperCase()}</div>
            </div>
            
            <!-- Card image area -->
            <div class="card-image ${card.element}-bg ${card.productImage ? 'has-product-image' : ''}">
              <div class="card-image-frame">
                ${card.productImage 
                  ? `<img src="${card.productImage}" alt="${card.name}" class="card-product-image">` 
                  : `<span class="card-emoji">${card.emoji}</span>`
                }
              </div>
              <div class="card-image-glow"></div>
            </div>
            
            <!-- Card info section -->
            <div class="card-content">
              <h3 class="card-name float-3d">${card.name}</h3>
              <span class="card-type">${card.type}</span>
              
              <!-- Simplified Stats Section -->
              <div class="card-stats-panel float-3d">
                <div class="stats-row">
                  <div class="stat-item value-box">
                    <span class="stat-label">MARKET VALUE</span>
                    <span class="stat-value highlight">$${card.stats.resellValue}</span>
                  </div>
                  <div class="stat-item link-box">
                    <span class="stat-label">LINKED WITH</span>
                    <span class="stat-value linked">${linkedSource}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Bottom bar -->
            <div class="card-footer-bar">
              <div class="card-serial">MULON-${card.cardNumber.replace('#', '')}</div>
              <div class="verified-badge">✓ VERIFIED</div>
            </div>
          </div>
        </div>
        <div class="card-back">
          <div class="card-back-pattern"></div>
          <div class="card-back-grid"></div>
          <div class="card-back-center">
            <div class="card-back-logo">🎴</div>
            <div class="card-back-rings">
              <div class="ring ring-1"></div>
              <div class="ring ring-2"></div>
              <div class="ring ring-3"></div>
            </div>
          </div>
          <div class="card-back-corners">
            <span class="corner tl"></span>
            <span class="corner tr"></span>
            <span class="corner bl"></span>
            <span class="corner br"></span>
          </div>
          <div class="card-back-text">MULON CARDS</div>
          <div class="card-back-code">EST. 2024</div>
        </div>
      </div>
    </div>
  `;
}

// Create reel card HTML - Clean layout
function createReelCardHTML(card) {
  const linkedSources = ['Apple Stock', 'Tesla Stock', 'Gold Index', 'Crypto BTC', 'S&P 500', 'Trade Value'];
  const linkedSource = linkedSources[Math.floor(Math.random() * linkedSources.length)];
  
  return `
    <div class="reel-card">
      <div class="card ${card.rarity}">
        <div class="card-inner">
          <!-- Top header bar -->
          <div class="card-header-bar">
            <div class="card-id">${card.cardNumber}</div>
            <div class="rarity-tag">${card.rarity.toUpperCase()}</div>
          </div>
          
          <div class="card-image ${card.element}-bg">
            <div class="card-image-frame">
              <span class="card-emoji">${card.emoji}</span>
            </div>
            <div class="card-image-glow"></div>
          </div>
          
          <div class="card-content">
            <h3 class="card-name float-3d">${card.name}</h3>
            <span class="card-type">${card.type}</span>
            
            <div class="card-stats-panel float-3d">
              <div class="stats-row">
                <div class="stat-item value-box">
                  <span class="stat-label">VALUE</span>
                  <span class="stat-value highlight">$${card.stats.resellValue}</span>
                </div>
                <div class="stat-item link-box">
                  <span class="stat-label">LINKED</span>
                  <span class="stat-value linked">${linkedSource}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card-footer-bar">
            <div class="card-serial">MULON-${card.cardNumber.replace('#', '')}</div>
            <div class="verified-badge">✓</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

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

// Generate reel cards - EXACT from cards.html
function generateReelCards(winningCard, totalCards = 60) {
  const reelCards = [];
  const winningPosition = Math.floor(totalCards * 0.75); // Win at 75% through
  
  // Place some special spots for higher rarities
  const legendarySpots = [15, 25, 35, 45];
  const epicSpots = [10, 20, 30, 40, 50];
  
  for (let i = 0; i < totalCards; i++) {
    if (i === winningPosition) {
      reelCards.push(winningCard);
    } else if (legendarySpots.includes(i)) {
      const legendaryCards = getCardsByRarity('legendary');
      reelCards.push(legendaryCards[Math.floor(Math.random() * legendaryCards.length)] || cardsData[0]);
    } else if (epicSpots.includes(i)) {
      const epicCards = getCardsByRarity('epic');
      reelCards.push(epicCards[Math.floor(Math.random() * epicCards.length)] || cardsData[0]);
    } else {
      // Random card
      reelCards.push(cardsData[Math.floor(Math.random() * cardsData.length)]);
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
  const cardTotalWidth = CARD_WIDTH + CARD_GAP;
  const viewportCenter = window.innerWidth / 2;
  const targetOffset = -(winningPosition * cardTotalWidth) + viewportCenter - (CARD_WIDTH / 2);
  
  const startTime = performance.now();
  const startPosition = 0;
  
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }
  
  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / SPIN_DURATION, 1);
    const eased = easeOutQuart(progress);
    
    const currentPosition = startPosition + (targetOffset - startPosition) * eased;
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

// Highlight center card - Enhanced with 3D effects and glow
function highlightCenterCard(reelTrack, currentPosition) {
  const cardTotalWidth = CARD_WIDTH + CARD_GAP;
  const viewportCenter = window.innerWidth / 2;
  const centerIndex = Math.round((-currentPosition + viewportCenter - CARD_WIDTH / 2) / cardTotalWidth);
  
  const reelCards = reelTrack.querySelectorAll('.reel-card');
  reelCards.forEach((card, index) => {
    const distance = Math.abs(index - centerIndex);
    const cardElement = card.querySelector('.card');
    
    if (distance === 0) {
      // Center card - full highlight with 3D pop
      card.style.opacity = '1';
      card.style.transform = 'scale(1.12) translateZ(50px)';
      card.style.filter = 'brightness(1.2) saturate(1.2)';
      card.classList.add('center-highlight');
      if (cardElement) {
        cardElement.style.boxShadow = '0 0 40px rgba(255, 255, 255, 0.4), 0 0 80px currentColor';
      }
    } else if (distance === 1) {
      // Adjacent cards - slight visibility
      card.style.opacity = '0.6';
      card.style.transform = 'scale(0.95) translateZ(0)';
      card.style.filter = 'brightness(0.8) blur(1px)';
      card.classList.remove('center-highlight');
      if (cardElement) cardElement.style.boxShadow = '';
    } else {
      // Far cards - dimmed
      card.style.opacity = '0.3';
      card.style.transform = 'scale(0.9) translateZ(0)';
      card.style.filter = 'brightness(0.5) blur(2px)';
      card.classList.remove('center-highlight');
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
  const saveResult = await CasinoDB.saveCard(winningCard.cardNumber);
  if (saveResult.success) {
    console.log(`Card ${winningCard.cardNumber} added! Collection size: ${saveResult.totalCards}`);
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
  if (isSpinning && currentWinningCard) {
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

// 3D Mouse tracking for cards
function setup3DCardTracking(container) {
  const cardWrappers = container.querySelectorAll('.card-wrapper');
  
  cardWrappers.forEach(wrapper => {
    const card = wrapper.querySelector('.card');
    if (!card) return;
    
    wrapper.addEventListener('mousemove', (e) => {
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -15;
      const rotateY = ((x - centerX) / centerX) * 15;
      
      card.style.setProperty('--rotateX', `${rotateX}deg`);
      card.style.setProperty('--rotateY', `${rotateY}deg`);
    });
    
    wrapper.addEventListener('mouseleave', () => {
      card.style.setProperty('--rotateX', '0deg');
      card.style.setProperty('--rotateY', '0deg');
    });
  });
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
export function openChest(chestType = 'normal') {
  if (isSpinning) return;
  
  // Initialize if needed
  if (!overlayElement) {
    initChestOpener();
  }
  
  // Select weights based on chest type
  let weights;
  switch (chestType) {
    case 'xp':
      weights = rarityWeights; // Normal weights for XP chest
      break;
    case 'uncommon':
      weights = uncommonPlusWeights; // Uncommon+ for $250 chest
      break;
    case 'legendary':
      weights = legendaryWeights; // Legendary+ for $1000 chest
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
}
