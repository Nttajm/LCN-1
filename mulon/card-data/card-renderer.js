// ========================================
// CARD RENDERER - Shared Card HTML Generation
// Exportable functions for creating card HTML
// ========================================

// Create full card HTML with front and back
export function createCardHTML(card, index = 0, options = {}) {
  const {
    showBack = true,
    size = 'normal', // 'small', 'normal', 'large'
    interactive = true
  } = options;

  // Generate linked source based on card type
  const linkedSources = ['Apple Stock', 'Tesla Stock', 'Gold Index', 'Crypto BTC', 'S&P 500', 'Trade Value'];
  const linkedSource = linkedSources[Math.floor(Math.random() * linkedSources.length)];
  
  const sizeClass = size !== 'normal' ? `card-${size}` : '';
  const interactiveClass = interactive ? 'card-interactive' : '';
  
  const frontHTML = `
    <div class="card-front">
      <div class="card-inner">
        <!-- Top header bar -->
        <div class="card-header-bar">
          <div class="card-id">${card.cardNumber || '#000'}</div>
          <div class="rarity-tag">${(card.rarity || 'common').toUpperCase()}</div>
        </div>
        
        <!-- Card image area -->
        <div class="card-image ${card.element || 'neutral'}-bg ${card.productImage ? 'has-product-image' : ''}">
          <div class="card-image-frame">
            ${card.productImage 
              ? `<img src="${card.productImage}" alt="${card.name}" class="card-product-image">` 
              : `<span class="card-emoji">${card.emoji || '🎴'}</span>`
            }
          </div>
          <div class="card-image-glow"></div>
        </div>
        
        <!-- Card info section -->
        <div class="card-content">
          <h3 class="card-name float-3d">${card.name}</h3>
          <span class="card-type">${card.type || ''}</span>
          
          <!-- Stats Section -->
          <div class="card-stats-panel float-3d">
            <div class="stats-row">
              <div class="stat-item value-box">
                <span class="stat-label">MARKET VALUE</span>
                <span class="stat-value highlight">$${card.stats?.resellValue || card.resellValue || 0}</span>
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
          <div class="card-serial">MULON-${(card.cardNumber || '#000').replace('#', '')}</div>
          <div class="verified-badge">✓ VERIFIED</div>
        </div>
      </div>
    </div>
  `;

  const backHTML = showBack ? `
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
  ` : '';
  
  return `
    <div class="card-wrapper ${sizeClass} ${interactiveClass}">
      <div class="card ${card.rarity || 'common'}" data-index="${index}" data-card-id="${card.id || card.cardNumber || index}">
        ${frontHTML}
        ${backHTML}
      </div>
    </div>
  `;
}

// Create simplified card for reel/spinner
export function createReelCardHTML(card) {
  const linkedSources = ['Apple Stock', 'Tesla Stock', 'Gold Index', 'Crypto BTC', 'S&P 500', 'Trade Value'];
  const linkedSource = linkedSources[Math.floor(Math.random() * linkedSources.length)];
  
  return `
    <div class="reel-card">
      <div class="card ${card.rarity || 'common'}">
        <div class="card-inner">
          <!-- Top header bar -->
          <div class="card-header-bar">
            <div class="card-id">${card.cardNumber || '#000'}</div>
            <div class="rarity-tag">${(card.rarity || 'common').toUpperCase()}</div>
          </div>
          
          <div class="card-image ${card.element || 'neutral'}-bg ${card.productImage ? 'has-product-image' : ''}">
            <div class="card-image-frame">
              ${card.productImage 
                ? `<img src="${card.productImage}" alt="${card.name}" class="card-product-image">` 
                : `<span class="card-emoji">${card.emoji || '🎴'}</span>`
              }
            </div>
            <div class="card-image-glow"></div>
          </div>
          
          <div class="card-content">
            <h3 class="card-name float-3d">${card.name}</h3>
            <span class="card-type">${card.type || ''}</span>
            
            <div class="card-stats-panel float-3d">
              <div class="stats-row">
                <div class="stat-item value-box">
                  <span class="stat-label">VALUE</span>
                  <span class="stat-value highlight">$${card.stats?.resellValue || card.resellValue || 0}</span>
                </div>
                <div class="stat-item link-box">
                  <span class="stat-label">LINKED</span>
                  <span class="stat-value linked">${linkedSource}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card-footer-bar">
            <div class="card-serial">MULON-${(card.cardNumber || '#000').replace('#', '')}</div>
            <div class="verified-badge">✓</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Create mini card for galleries/selection (simplified view)
export function createMiniCardHTML(card, options = {}) {
  const { selected = false, disabled = false } = options;
  
  return `
    <div class="gallery-card ${card.rarity || 'common'} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}" 
         data-id="${card.id || card.cardNumber}" 
         data-rarity="${card.rarity || 'common'}">
      <div class="gallery-card-emoji">${card.emoji || '🎴'}</div>
      <div class="gallery-card-name">${card.name}</div>
      <div class="gallery-card-rarity ${card.rarity || 'common'}">${card.rarity || 'common'}</div>
    </div>
  `;
}

// Create card chip (for selected items display)
// docId is optional - used for cards from user's subcollection
export function createCardChipHTML(card, docId = null) {
  return `
    <div class="selected-card-chip" data-id="${card.id || card.cardNumber}" data-card-number="${card.cardNumber}" data-doc-id="${docId || ''}">
      <span class="chip-emoji">${card.emoji || '🎴'}</span>
      <span class="chip-name">${card.name}</span>
      <button class="chip-remove" data-id="${card.id || card.cardNumber}" data-card-number="${card.cardNumber}" data-doc-id="${docId || ''}">&times;</button>
    </div>
  `;
}

// Setup 3D mouse tracking for cards
export function setup3DCardTracking(container) {
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

// Get rarity color
export function getRarityColor(rarity) {
  const colors = {
    mythic: '#ff0055',
    legendary: '#ffcc00',
    epic: '#c084fc',
    rare: '#3b82f6',
    uncommon: '#22c55e',
    common: '#9ca3af'
  };
  return colors[rarity] || colors.common;
}

// Get rarity gradient
export function getRarityGradient(rarity) {
  const gradients = {
    mythic: 'linear-gradient(135deg, #ff0080, #7928ca, #00d4ff)',
    legendary: 'linear-gradient(135deg, #ffcc00, #ff6b35)',
    epic: 'linear-gradient(135deg, #a855f7, #8b5cf6)',
    rare: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    uncommon: 'linear-gradient(135deg, #10b981, #34d399)',
    common: 'linear-gradient(135deg, #6b7280, #9ca3af)'
  };
  return gradients[rarity] || gradients.common;
}
