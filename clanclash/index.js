// Shared card data (loaded via `shared-data.js`)
const allCards = (window.ClanClashData && window.ClanClashData.cards) ? window.ClanClashData.cards : {};

// Rarity colors matching Clash Royale exactly
const rarityColors = {
    common: '#a0a0a0',
    rare: '#ff9f00',
    epic: '#c800ff',
    legendary: '#fff000'
};

const rarityGradients = {
    common: 'linear-gradient(180deg, #7a7a7a 0%, #4a4a4a 100%)',
    rare: 'linear-gradient(180deg, #ff8c00 0%, #cc6600 100%)',
    epic: 'linear-gradient(180deg, #b000e0 0%, #7a00a0 100%)',
    legendary: 'linear-gradient(180deg, #fff000 0%, #ffaa00 100%)'
};

// Default deck
const DEFAULT_DECK = (window.ClanClashData && window.ClanClashData.DEFAULT_DECK)
    ? [...window.ClanClashData.DEFAULT_DECK]
    : ['knight', 'archer', 'giant', 'hogrider', 'minipekka', 'wizard', 'fireball', 'arrows'];

// Deck Manager Class - Clash Royale Style
class DeckManager {
    constructor() {
        this.currentDeck = this.loadDeck();
        this.isCardsViewOpen = false;
        this.selectedSlot = null;
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.setupNavigation();
    }

    loadDeck() {
        const saved = localStorage.getItem('clanclash_deck');
        if (saved) {
            try {
                const deck = JSON.parse(saved);
                if (Array.isArray(deck) && deck.length === 8 && deck.every(c => allCards[c])) {
                    return deck;
                }
            } catch (e) {
                console.error('Error loading deck:', e);
            }
        }
        return [...DEFAULT_DECK];
    }

    saveDeck() {
        localStorage.setItem('clanclash_deck', JSON.stringify(this.currentDeck));
    }

    setupNavigation() {
        const navElements = document.querySelectorAll('.nav-el');
        navElements.forEach((el, index) => {
            el.addEventListener('click', () => {
                if (index === 1) {
                    this.openCardsView();
                }
                navElements.forEach(n => n.classList.remove('sel'));
                el.classList.add('sel');
            });
        });
    }

    // Open Clash Royale style deck editor
    openCardsView() {
        if (this.isCardsViewOpen) return;
        this.isCardsViewOpen = true;

        const overlay = document.createElement('div');
        overlay.className = 'cards-overlay';
        overlay.innerHTML = `
            <div class="cr-deck-editor">
                <!-- Header -->
                <div class="cr-header">
                    <button class="cr-back-btn">✕</button>
                    <div class="cr-title">
                        <span class="cr-title-text">Battle Deck</span>
                        <div class="cr-elixir-cost">
                            <span class="elixir-icon">💧</span>
                            <span class="elixir-value">${this.calculateAvgElixir().toFixed(1)}</span>
                        </div>
                    </div>
                    <button class="cr-copy-btn">📋</button>
                </div>
                
                <!-- Deck Slots - 8 cards in 2 rows -->
                <div class="cr-deck-section">
                    <div class="cr-deck-tabs">
                        <div class="cr-deck-tab active">Deck 1</div>
                        <div class="cr-deck-tab">Deck 2</div>
                        <div class="cr-deck-tab">Deck 3</div>
                    </div>
                    <div class="cr-deck-grid">
                        ${this.currentDeck.map((cardId, index) => this.createDeckSlotHTML(cardId, index)).join('')}
                    </div>
                </div>
                
                <!-- Card Filters -->
                <div class="cr-filter-bar">
                    <button class="cr-filter-btn active" data-filter="all">All</button>
                    <button class="cr-filter-btn" data-filter="Troop">Troops</button>
                    <button class="cr-filter-btn" data-filter="Spell">Spells</button>
                    <button class="cr-filter-btn" data-filter="Building">Buildings</button>
                    <button class="cr-filter-btn" data-filter="winCondition">Win Con</button>
                </div>
                
                <!-- Cards Collection with Categories -->
                <div class="cr-collection">
                    ${this.createCollectionHTML()}
                </div>
                
                <!-- Card Info Popup (hidden by default) -->
                <div class="cr-card-info" id="cardInfoPopup">
                    <div class="cr-card-info-content"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.setupCardsViewListeners(overlay);
        
        requestAnimationFrame(() => {
            overlay.classList.add('open');
        });
    }

    // Create deck slot with Clash Royale styling
    createDeckSlotHTML(cardId, index) {
        const card = allCards[cardId];
        const isSelected = this.selectedSlot === index;
        const isWinCon = card.isWinCondition;
        
        return `
            <div class="cr-deck-slot ${isSelected ? 'selected' : ''}" data-index="${index}" data-card="${cardId}">
                <div class="cr-card-frame" style="border-color: ${rarityColors[card.rarity]}">
                    <div class="cr-card-bg" style="background: ${rarityGradients[card.rarity]}"></div>
                    <span class="cr-card-emoji">${card.emoji}</span>
                    <div class="cr-card-cost">
                        <span>💧</span>
                        <span>${card.cost}</span>
                    </div>
                    ${isWinCon ? '<div class="cr-wincon-badge">⭐</div>' : ''}
                    <div class="cr-card-level">Lvl 14</div>
                </div>
                <span class="cr-card-name">${card.name}</span>
            </div>
        `;
    }

    // Create collection HTML with categorized cards
    createCollectionHTML() {
        const cardIds = window.ClanClashData?.cardIds || Object.keys(allCards);
        
        // Group by type
        const troops = cardIds.filter(id => allCards[id]?.type === 'Troop');
        const spells = cardIds.filter(id => allCards[id]?.type === 'Spell');
        const buildings = cardIds.filter(id => allCards[id]?.type === 'Building');
        
        return `
            <div class="cr-collection-section" data-type="Troop">
                <div class="cr-section-header">
                    <span class="cr-section-icon">⚔️</span>
                    <span class="cr-section-title">Troops</span>
                    <span class="cr-section-count">${troops.length}</span>
                </div>
                <div class="cr-card-grid">
                    ${troops.map(id => this.createCollectionCardHTML(id)).join('')}
                </div>
            </div>
            
            <div class="cr-collection-section" data-type="Spell">
                <div class="cr-section-header">
                    <span class="cr-section-icon">✨</span>
                    <span class="cr-section-title">Spells</span>
                    <span class="cr-section-count">${spells.length}</span>
                </div>
                <div class="cr-card-grid">
                    ${spells.map(id => this.createCollectionCardHTML(id)).join('')}
                </div>
            </div>
            
            <div class="cr-collection-section" data-type="Building">
                <div class="cr-section-header">
                    <span class="cr-section-icon">🏰</span>
                    <span class="cr-section-title">Buildings</span>
                    <span class="cr-section-count">${buildings.length}</span>
                </div>
                <div class="cr-card-grid">
                    ${buildings.map(id => this.createCollectionCardHTML(id)).join('')}
                </div>
            </div>
        `;
    }

    // Create collection card with all info
    createCollectionCardHTML(cardId) {
        const card = allCards[cardId];
        const inDeck = this.currentDeck.includes(cardId);
        const isWinCon = card.isWinCondition;
        const isAirTarget = card.targetAir;
        const isMultiple = card.spawnsMultiple;
        
        return `
            <div class="cr-collection-card ${inDeck ? 'in-deck' : ''}" 
                 data-card="${cardId}" 
                 data-type="${card.type}"
                 data-wincon="${isWinCon || false}">
                <div class="cr-card-frame" style="border-color: ${rarityColors[card.rarity]}">
                    <div class="cr-card-bg" style="background: ${rarityGradients[card.rarity]}"></div>
                    <span class="cr-card-emoji">${card.emoji}</span>
                    <div class="cr-card-cost">
                        <span>💧</span>
                        <span>${card.cost}</span>
                    </div>
                    ${isWinCon ? '<div class="cr-wincon-badge" title="Win Condition">⭐</div>' : ''}
                    ${isAirTarget ? '<div class="cr-air-badge" title="Targets Air">🎯</div>' : ''}
                    <div class="cr-card-level">14</div>
                </div>
                <span class="cr-card-name">${card.name}</span>
                <div class="cr-card-role">${card.role || ''}</div>
                ${inDeck ? '<div class="cr-in-deck-overlay"><span>IN DECK</span></div>' : ''}
            </div>
        `;
    }

    // Show card info popup
    showCardInfo(cardId, x, y) {
        const card = allCards[cardId];
        const template = window.ClanClashData?.unitTemplates?.[cardId];
        const popup = document.getElementById('cardInfoPopup');
        
        if (!popup) return;
        
        const stats = template ? `
            <div class="cr-stats-grid">
                ${template.hp ? `<div class="cr-stat"><span class="cr-stat-icon">❤️</span><span>${template.hp}</span></div>` : ''}
                ${template.damage ? `<div class="cr-stat"><span class="cr-stat-icon">⚔️</span><span>${template.damage}</span></div>` : ''}
                ${template.hitCount > 1 ? `<div class="cr-stat"><span class="cr-stat-icon">👥</span><span>×${template.hitCount}</span></div>` : ''}
                ${template.range > 50 ? `<div class="cr-stat"><span class="cr-stat-icon">🎯</span><span>${template.range}</span></div>` : ''}
            </div>
        ` : '';
        
        popup.innerHTML = `
            <div class="cr-card-info-content" style="border-color: ${rarityColors[card.rarity]}">
                <div class="cr-info-header" style="background: ${rarityGradients[card.rarity]}">
                    <span class="cr-info-emoji">${card.emoji}</span>
                    <div class="cr-info-title">
                        <span class="cr-info-name">${card.name}</span>
                        <span class="cr-info-rarity">${card.rarity.toUpperCase()}</span>
                    </div>
                    <div class="cr-info-cost">
                        <span>💧</span>
                        <span>${card.cost}</span>
                    </div>
                </div>
                <div class="cr-info-body">
                    <div class="cr-info-tags">
                        <span class="cr-tag cr-tag-type">${card.type}</span>
                        <span class="cr-tag cr-tag-role">${card.role}</span>
                        ${card.isWinCondition ? '<span class="cr-tag cr-tag-wincon">⭐ Win Condition</span>' : ''}
                        ${card.targetAir ? '<span class="cr-tag cr-tag-air">Targets Air</span>' : ''}
                        ${card.category === 'air' ? '<span class="cr-tag cr-tag-flying">Flying</span>' : ''}
                    </div>
                    <p class="cr-info-desc">${card.description}</p>
                    ${stats}
                </div>
            </div>
        `;
        
        popup.classList.add('visible');
    }

    hideCardInfo() {
        const popup = document.getElementById('cardInfoPopup');
        if (popup) popup.classList.remove('visible');
    }

    calculateAvgElixir() {
        const total = this.currentDeck.reduce((sum, cardId) => sum + allCards[cardId].cost, 0);
        return total / this.currentDeck.length;
    }

    setupCardsViewListeners(overlay) {
        // Back button
        overlay.querySelector('.cr-back-btn').addEventListener('click', () => this.closeCardsView(overlay));
        
        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeCardsView(overlay);
        });

        // Deck slots
        overlay.querySelectorAll('.cr-deck-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                this.selectDeckSlot(parseInt(slot.dataset.index), overlay);
            });
        });

        // Collection cards - click to swap, long press for info
        overlay.querySelectorAll('.cr-collection-card').forEach(card => {
            let pressTimer;
            
            card.addEventListener('click', () => {
                this.handleCollectionCardClick(card.dataset.card, overlay);
            });
            
            card.addEventListener('mouseenter', () => {
                pressTimer = setTimeout(() => {
                    const rect = card.getBoundingClientRect();
                    this.showCardInfo(card.dataset.card, rect.left, rect.top);
                }, 500);
            });
            
            card.addEventListener('mouseleave', () => {
                clearTimeout(pressTimer);
                this.hideCardInfo();
            });
        });

        // Filter buttons
        overlay.querySelectorAll('.cr-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.querySelectorAll('.cr-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterCards(btn.dataset.filter, overlay);
            });
        });

        // Escape to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeCardsView(overlay);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    filterCards(filter, overlay) {
        this.currentFilter = filter;
        const sections = overlay.querySelectorAll('.cr-collection-section');
        const cards = overlay.querySelectorAll('.cr-collection-card');
        
        if (filter === 'all') {
            sections.forEach(s => s.style.display = 'block');
            cards.forEach(c => c.style.display = 'flex');
        } else if (filter === 'winCondition') {
            sections.forEach(s => s.style.display = 'block');
            cards.forEach(c => {
                c.style.display = c.dataset.wincon === 'true' ? 'flex' : 'none';
            });
        } else {
            sections.forEach(s => {
                s.style.display = s.dataset.type === filter ? 'block' : 'none';
            });
            cards.forEach(c => c.style.display = 'flex');
        }
    }

    selectDeckSlot(index, overlay) {
        if (this.selectedSlot === index) {
            this.selectedSlot = null;
        } else {
            this.selectedSlot = index;
        }
        this.refreshDeckSlots(overlay);
    }

    handleCollectionCardClick(cardId, overlay) {
        if (this.selectedSlot !== null) {
            const currentCard = this.currentDeck[this.selectedSlot];
            
            if (currentCard === cardId) {
                this.selectedSlot = null;
                this.refreshDeckSlots(overlay);
                return;
            }

            const existingIndex = this.currentDeck.indexOf(cardId);
            if (existingIndex !== -1) {
                this.currentDeck[existingIndex] = currentCard;
            }
            
            this.currentDeck[this.selectedSlot] = cardId;
            this.selectedSlot = null;
            this.saveDeck();
            this.refreshCardsView(overlay);
            this.showNotification('✅ Card swapped!');
        } else {
            const deckIndex = this.currentDeck.indexOf(cardId);
            if (deckIndex !== -1) {
                this.selectedSlot = deckIndex;
                this.refreshDeckSlots(overlay);
            } else {
                this.showNotification('👆 Select a deck slot first');
            }
        }
    }

    showNotification(message) {
        const existing = document.querySelector('.cr-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'cr-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 1500);
    }

    refreshDeckSlots(overlay) {
        const container = overlay.querySelector('.cr-deck-grid');
        container.innerHTML = this.currentDeck.map((cardId, index) => 
            this.createDeckSlotHTML(cardId, index)
        ).join('');

        container.querySelectorAll('.cr-deck-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                this.selectDeckSlot(parseInt(slot.dataset.index), overlay);
            });
        });
    }

    refreshCardsView(overlay) {
        overlay.querySelector('.elixir-value').textContent = this.calculateAvgElixir().toFixed(1);
        this.refreshDeckSlots(overlay);
        
        overlay.querySelector('.cr-collection').innerHTML = this.createCollectionHTML();
        
        overlay.querySelectorAll('.cr-collection-card').forEach(card => {
            let pressTimer;
            card.addEventListener('click', () => {
                this.handleCollectionCardClick(card.dataset.card, overlay);
            });
            card.addEventListener('mouseenter', () => {
                pressTimer = setTimeout(() => {
                    this.showCardInfo(card.dataset.card);
                }, 500);
            });
            card.addEventListener('mouseleave', () => {
                clearTimeout(pressTimer);
                this.hideCardInfo();
            });
        });
        
        // Reapply filter
        this.filterCards(this.currentFilter, overlay);
    }

    closeCardsView(overlay) {
        overlay.classList.remove('open');
        setTimeout(() => {
            overlay.remove();
            this.isCardsViewOpen = false;
            this.selectedSlot = null;
            
            const navElements = document.querySelectorAll('.nav-el');
            navElements.forEach(n => n.classList.remove('sel'));
            navElements[2].classList.add('sel');
        }, 300);
    }
}

// Add CSS for Clash Royale style cards view
function injectCardsViewStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* ====== CLASH ROYALE DECK EDITOR ====== */
        .cards-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(180deg, #1a2a3a 0%, #0a1520 100%);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            overflow-y: auto;
            overflow-x: hidden;
        }

        .cards-overlay.open {
            opacity: 1;
        }

        .cr-deck-editor {
            max-width: 900px;
            margin: 0 auto;
            padding: 10px;
            min-height: 100vh;
        }

        /* Header */
        .cr-header {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            background: linear-gradient(180deg, #3a4a5a 0%, #2a3a4a 100%);
            border-radius: 15px;
            margin-bottom: 15px;
            border: 2px solid #5a6a7a;
        }

        .cr-back-btn {
            width: 40px;
            height: 40px;
            background: linear-gradient(180deg, #e74c3c 0%, #c0392b 100%);
            border: 2px solid #ff6b5b;
            border-radius: 50%;
            color: white;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }

        .cr-back-btn:hover {
            transform: scale(1.1);
        }

        .cr-title {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .cr-title-text {
            color: #fff;
            font-family: 'Luckiest Guy', cursive;
            font-size: 24px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        .cr-elixir-cost {
            display: flex;
            align-items: center;
            gap: 5px;
            background: linear-gradient(180deg, #9b59b6 0%, #8e44ad 100%);
            padding: 6px 12px;
            border-radius: 20px;
            border: 2px solid #d2b4de;
        }

        .elixir-icon {
            font-size: 16px;
        }

        .elixir-value {
            color: #fff;
            font-weight: bold;
            font-size: 16px;
        }

        .cr-copy-btn {
            width: 40px;
            height: 40px;
            background: linear-gradient(180deg, #3498db 0%, #2980b9 100%);
            border: 2px solid #5dade2;
            border-radius: 10px;
            font-size: 18px;
            cursor: pointer;
        }

        /* Deck Section */
        .cr-deck-section {
            background: linear-gradient(180deg, #2c3e50 0%, #1a252f 100%);
            border-radius: 15px;
            padding: 15px;
            margin-bottom: 15px;
            border: 3px solid #4a6a8a;
            box-shadow: inset 0 2px 10px rgba(0,0,0,0.3);
        }

        .cr-deck-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 15px;
        }

        .cr-deck-tab {
            padding: 8px 16px;
            background: linear-gradient(180deg, #34495e 0%, #2c3e50 100%);
            border: 2px solid #4a5a6a;
            border-radius: 8px;
            color: #8a9aaa;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
        }

        .cr-deck-tab.active {
            background: linear-gradient(180deg, #3498db 0%, #2980b9 100%);
            border-color: #5dade2;
            color: #fff;
            box-shadow: 0 0 10px rgba(52, 152, 219, 0.5);
        }

        .cr-deck-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
        }

        @media (max-width: 500px) {
            .cr-deck-grid { gap: 6px; }
        }

        /* Deck Slot */
        .cr-deck-slot {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            cursor: pointer;
            padding: 8px;
            border-radius: 10px;
            transition: all 0.2s;
        }

        .cr-deck-slot:hover {
            background: rgba(255,255,255,0.1);
            transform: translateY(-3px);
        }

        .cr-deck-slot.selected {
            background: rgba(255, 215, 0, 0.3);
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }

        .cr-deck-slot.selected .cr-card-frame {
            animation: cardPulse 0.6s infinite alternate;
        }

        @keyframes cardPulse {
            from { transform: scale(1); box-shadow: 0 4px 8px rgba(0,0,0,0.5); }
            to { transform: scale(1.05); box-shadow: 0 6px 15px rgba(255, 215, 0, 0.5); }
        }

        /* Card Frame - CR Style */
        .cr-card-frame {
            width: 70px;
            height: 85px;
            border-radius: 8px;
            border: 3px solid;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .cr-card-bg {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0.3;
        }

        .cr-card-emoji {
            font-size: 32px;
            z-index: 1;
            filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));
        }

        .cr-card-cost {
            position: absolute;
            top: -2px;
            left: -2px;
            background: linear-gradient(180deg, #9b59b6 0%, #8e44ad 100%);
            padding: 3px 6px;
            border-radius: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 2px;
            font-size: 12px;
            font-weight: bold;
            color: #fff;
            border: 1px solid #d2b4de;
            z-index: 2;
        }

        .cr-card-cost span:first-child {
            font-size: 10px;
        }

        .cr-card-level {
            position: absolute;
            bottom: 2px;
            right: 2px;
            background: rgba(0,0,0,0.7);
            color: #ffd700;
            font-size: 9px;
            padding: 2px 4px;
            border-radius: 3px;
            z-index: 2;
        }

        .cr-wincon-badge {
            position: absolute;
            top: -2px;
            right: -2px;
            font-size: 14px;
            z-index: 3;
            filter: drop-shadow(0 0 3px rgba(255, 215, 0, 0.8));
        }

        .cr-air-badge {
            position: absolute;
            bottom: 2px;
            left: 2px;
            font-size: 10px;
            z-index: 3;
        }

        .cr-card-name {
            color: #fff;
            font-size: 10px;
            text-align: center;
            max-width: 80px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Filter Bar */
        .cr-filter-bar {
            display: flex;
            gap: 8px;
            padding: 10px;
            background: linear-gradient(180deg, #2c3e50 0%, #1a252f 100%);
            border-radius: 10px;
            margin-bottom: 15px;
            overflow-x: auto;
            border: 2px solid #3a4a5a;
        }

        .cr-filter-btn {
            padding: 8px 16px;
            background: linear-gradient(180deg, #3a4a5a 0%, #2a3a4a 100%);
            border: 2px solid #4a5a6a;
            border-radius: 20px;
            color: #8a9aaa;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
        }

        .cr-filter-btn:hover {
            background: linear-gradient(180deg, #4a5a6a 0%, #3a4a5a 100%);
        }

        .cr-filter-btn.active {
            background: linear-gradient(180deg, #27ae60 0%, #1e8449 100%);
            border-color: #2ecc71;
            color: #fff;
        }

        /* Collection */
        .cr-collection {
            padding: 10px;
        }

        .cr-collection-section {
            margin-bottom: 20px;
        }

        .cr-section-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: linear-gradient(180deg, #34495e 0%, #2c3e50 100%);
            border-radius: 10px;
            margin-bottom: 12px;
            border: 2px solid #4a5a6a;
        }

        .cr-section-icon {
            font-size: 20px;
        }

        .cr-section-title {
            color: #fff;
            font-size: 16px;
            font-weight: bold;
            flex: 1;
        }

        .cr-section-count {
            background: rgba(0,0,0,0.3);
            color: #8a9aaa;
            padding: 3px 10px;
            border-radius: 10px;
            font-size: 12px;
        }

        .cr-card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
            gap: 10px;
        }

        /* Collection Card */
        .cr-collection-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            padding: 8px;
            background: rgba(255,255,255,0.03);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }

        .cr-collection-card:hover {
            background: rgba(255,255,255,0.08);
            transform: translateY(-3px);
        }

        .cr-collection-card .cr-card-frame {
            width: 65px;
            height: 80px;
        }

        .cr-collection-card .cr-card-emoji {
            font-size: 28px;
        }

        .cr-card-role {
            color: #7a8a9a;
            font-size: 9px;
            text-align: center;
        }

        .cr-collection-card.in-deck {
            opacity: 0.5;
        }

        .cr-collection-card.in-deck:hover {
            opacity: 0.8;
        }

        .cr-in-deck-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.6);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .cr-in-deck-overlay span {
            background: #27ae60;
            color: #fff;
            padding: 4px 8px;
            border-radius: 5px;
            font-size: 10px;
            font-weight: bold;
        }

        /* Card Info Popup */
        .cr-card-info {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            z-index: 1100;
            opacity: 0;
            pointer-events: none;
            transition: all 0.2s;
        }

        .cr-card-info.visible {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            pointer-events: auto;
        }

        .cr-card-info-content {
            width: 300px;
            background: linear-gradient(180deg, #2c3e50 0%, #1a252f 100%);
            border-radius: 15px;
            border: 3px solid;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        }

        .cr-info-header {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
        }

        .cr-info-emoji {
            font-size: 48px;
            filter: drop-shadow(0 3px 5px rgba(0,0,0,0.5));
        }

        .cr-info-title {
            flex: 1;
        }

        .cr-info-name {
            display: block;
            color: #fff;
            font-size: 18px;
            font-weight: bold;
        }

        .cr-info-rarity {
            color: rgba(255,255,255,0.7);
            font-size: 12px;
        }

        .cr-info-cost {
            background: linear-gradient(180deg, #9b59b6 0%, #8e44ad 100%);
            padding: 8px 12px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 18px;
            color: #fff;
            font-weight: bold;
        }

        .cr-info-body {
            padding: 15px;
            background: rgba(0,0,0,0.2);
        }

        .cr-info-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 10px;
        }

        .cr-tag {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }

        .cr-tag-type {
            background: #3498db;
            color: #fff;
        }

        .cr-tag-role {
            background: #2c3e50;
            color: #bdc3c7;
            border: 1px solid #4a5a6a;
        }

        .cr-tag-wincon {
            background: linear-gradient(90deg, #f1c40f 0%, #f39c12 100%);
            color: #000;
        }

        .cr-tag-air {
            background: #1abc9c;
            color: #fff;
        }

        .cr-tag-flying {
            background: #9b59b6;
            color: #fff;
        }

        .cr-info-desc {
            color: #bdc3c7;
            font-size: 13px;
            line-height: 1.4;
            margin-bottom: 10px;
        }

        .cr-stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }

        .cr-stat {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0,0,0,0.2);
            padding: 8px;
            border-radius: 8px;
        }

        .cr-stat-icon {
            font-size: 16px;
        }

        .cr-stat span:last-child {
            color: #fff;
            font-weight: bold;
        }

        /* Notification */
        .cr-notification {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: linear-gradient(180deg, #2c3e50 0%, #1a252f 100%);
            color: #fff;
            padding: 12px 25px;
            border-radius: 25px;
            border: 2px solid #4a5a6a;
            font-size: 14px;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 1200;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
        }

        .cr-notification.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    `;
    document.head.appendChild(style);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    injectCardsViewStyles();
    window.deckManager = new DeckManager();
});
