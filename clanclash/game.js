// Game Configuration
const config = {
    canvas: {
        width: window.innerWidth,
        height: window.innerHeight - 200 // Account for header and cards
    },
    elixir: {
        max: 10,
        regenRate: 1400,
        startAmount: 5
    },
    game: {
        duration: 180,
        doubleElixirTime: 60
    },
    bridge: {
        x: window.innerWidth / 2 // middle of the arena (horizontal)
    },
    river: {
        width: 60 // River width
    },
    bridges: {
        width: 80,
        height: 100
    }
};

// Sound System (using Web Audio API for game sounds)
class SoundSystem {
    constructor() {
        this.enabled = true;
        this.sounds = {};
    }
    
    play(type) {
        if (!this.enabled) return;
        
        // Create audio context on first interaction
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Different sounds for different actions
        switch(type) {
            case 'deploy':
                oscillator.frequency.value = 400;
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
                break;
            case 'hit':
                oscillator.frequency.value = 200;
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.05);
                break;
            case 'explosion':
                oscillator.frequency.value = 100;
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.3);
                break;
            case 'tower-destroy':
                oscillator.frequency.value = 150;
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.5);
                break;
            case 'victory':
                this.playMelody([523, 659, 784, 1047], [0, 0.1, 0.2, 0.3]);
                return;
        }
    }
    
    playMelody(frequencies, timings) {
        if (!this.audioContext) return;
        
        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, this.audioContext.currentTime + timings[i]);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + timings[i] + 0.2);
            osc.start(this.audioContext.currentTime + timings[i]);
            osc.stop(this.audioContext.currentTime + timings[i] + 0.2);
        });
    }
}

// Particle System
class Particle {
    constructor(x, y, vx, vy, color, lifetime, size = 3) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.size = size;
        this.gravity = 0.2;
    }
    
    update(deltaTime) {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.lifetime -= deltaTime / 16;
        return this.lifetime > 0;
    }
    
    render(ctx) {
        const alpha = this.lifetime / this.maxLifetime;
        ctx.fillStyle = this.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    emit(x, y, count, config = {}) {
        const color = config.color || 'rgb(255, 255, 255)';
        const speed = config.speed || 2;
        const lifetime = config.lifetime || 30;
        const size = config.size || 3;
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const velocity = speed + Math.random() * speed;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity - 2;
            this.particles.push(new Particle(x, y, vx, vy, color, lifetime, size));
        }
    }
    
    update(deltaTime) {
        this.particles = this.particles.filter(p => p.update(deltaTime));
    }
    
    render(ctx) {
        this.particles.forEach(p => p.render(ctx));
    }
}

// Unit Templates with more variety
const unitTemplates = {
    knight: {
        name: 'Knight',
        emoji: '⚔️',
        hp: 1400,
        damage: 150,
        speed: 1.2,
        range: 40,
        attackSpeed: 1200,
        cost: 3,
        isGround: true,
        targetBuildings: false,
        hitCount: 1
    },
    archer: {
        name: 'Archer',
        emoji: '🏹',
        hp: 300,
        damage: 80,
        speed: 1.0,
        range: 200,
        attackSpeed: 1000,
        cost: 3,
        isGround: true,
        targetBuildings: false,
        hitCount: 1,
        isRanged: true
    },
    giant: {
        name: 'Giant',
        emoji: '🗿',
        hp: 3500,
        damage: 200,
        speed: 0.8,
        range: 40,
        attackSpeed: 1500,
        cost: 5,
        isGround: true,
        targetBuildings: true,
        hitCount: 1
    },
    hogrider: {
        name: 'Hog Rider',
        emoji: '🐷',
        hp: 1500,
        damage: 180,
        speed: 2.5,
        range: 40,
        attackSpeed: 1400,
        cost: 4,
        isGround: true,
        targetBuildings: true,
        hitCount: 1,
        fast: true
    },
    minipekka: {
        name: 'Amani R.',
        emoji: '🥷',
        hp: 1200,
        damage: 400,
        speed: 1.5,
        range: 40,
        attackSpeed: 1700,
        cost: 4,
        isGround: true,
        targetBuildings: false,
        hitCount: 1,
        heavyHitter: true
    },
    wizard: {
        name: 'Wizard',
        emoji: '🧙',
        hp: 600,
        damage: 200,
        speed: 1.0,
        range: 250,
        attackSpeed: 1500,
        cost: 5,
        isGround: true,
        targetBuildings: false,
        hitCount: 1,
        isRanged: true,
        splashRadius: 100
    },
    dragon: {
        name: 'Baby Dragon',
        emoji: '🐉',
        hp: 800,
        damage: 180,
        speed: 1.8,
        range: 150,
        attackSpeed: 1600,
        cost: 4,
        isGround: false,
        isAir: true,
        targetBuildings: false,
        hitCount: 1,
        isRanged: true,
        splashRadius: 80
    },
    barbarian: {
        name: 'Barbarian',
        emoji: '🪓',
        hp: 700,
        damage: 180,
        speed: 1.5,
        range: 40,
        attackSpeed: 1300,
        cost: 5,
        isGround: true,
        targetBuildings: false,
        hitCount: 4, // Spawns 4 barbarians
        spawnsMultiple: true
    },
    skeleton: {
        name: 'Skeletons',
        emoji: '💀',
        hp: 60,
        damage: 70,
        speed: 1.5,
        range: 40,
        attackSpeed: 1000,
        cost: 1,
        isGround: true,
        targetBuildings: false,
        hitCount: 3, // Spawns 3 skeletons
        spawnsMultiple: true,
        fast: true
    },
    musketeer: {
        name: 'Musketeer',
        emoji: '🔫',
        hp: 500,
        damage: 200,
        speed: 1.0,
        range: 300,
        attackSpeed: 1100,
        cost: 4,
        isGround: true,
        targetBuildings: false,
        hitCount: 1,
        isRanged: true
    },
    pekka: {
        name: 'P.E.K.K.A',
        emoji: '🛡️',
        hp: 3500,
        damage: 800,
        speed: 0.7,
        range: 40,
        attackSpeed: 1800,
        cost: 7,
        isGround: true,
        targetBuildings: false,
        hitCount: 1,
        heavyHitter: true
    },
    golem: {
        name: 'Golem',
        emoji: '🏔️',
        hp: 4500,
        damage: 250,
        speed: 0.5,
        range: 40,
        attackSpeed: 2500,
        cost: 8,
        isGround: true,
        targetBuildings: true,
        hitCount: 1,
        spawnsOnDeath: true
    },
    miner: {
        name: 'Miner',
        emoji: '⛏️',
        hp: 1000,
        damage: 160,
        speed: 1.2,
        range: 40,
        attackSpeed: 1200,
        cost: 3,
        isGround: true,
        targetBuildings: true,
        hitCount: 1,
        tunneling: true
    },
    balloon: {
        name: 'Balloon',
        emoji: '🎈',
        hp: 1200,
        damage: 800,
        speed: 1.0,
        range: 40,
        attackSpeed: 3000,
        cost: 5,
        isGround: false,
        isAir: true,
        targetBuildings: true,
        hitCount: 1,
        deathDamage: 400
    },
    witch: {
        name: 'Witch',
        emoji: '🧪',
        hp: 700,
        damage: 80,
        speed: 1.0,
        range: 200,
        attackSpeed: 1400,
        cost: 5,
        isGround: true,
        targetBuildings: false,
        hitCount: 1,
        isRanged: true,
        spawnsSkeleton: true
    },
    valkyrie: {
        name: 'Valkyrie',
        emoji: '⚡',
        hp: 1500,
        damage: 200,
        speed: 1.5,
        range: 50,
        attackSpeed: 1500,
        cost: 4,
        isGround: true,
        targetBuildings: false,
        hitCount: 1,
        splashRadius: 120,
        threeSixtyAttack: true
    }
};

// Game State
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas to full available size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.running = false;
        this.gameTime = config.game.duration;
        this.lastTime = Date.now();
        
        // Systems
        this.soundSystem = new SoundSystem();
        this.particleSystem = new ParticleSystem();
        
        // Player state
        this.playerElixir = config.elixir.startAmount;
        this.enemyElixir = config.elixir.startAmount;
        this.playerCrowns = 0;
        this.enemyCrowns = 0;
        
        // Stats
        this.stats = {
            damageDealt: 0,
            unitsDeployed: 0
        };
        
        // Game objects
        this.units = [];
        this.projectiles = [];
        this.effects = [];
        this.damageNumbers = []; // Floating damage numbers
        this.towers = this.initTowers();
        
        // Card system - player gets 8 random unique cards
        this.allCards = ['knight', 'archer', 'giant', 'hogrider', 'minipekka', 'wizard', 'fireball', 'arrows', 
                     'dragon', 'barbarian', 'skeleton', 'musketeer', 'pekka', 'golem', 'miner', 'balloon', 'witch', 'valkyrie'];
        this.deck = this.selectRandomDeck(8); // Player's 8-card deck
        this.hand = [];
        this.nextCard = null;
        this.shuffleDeck();
        
        // Card selection
        this.selectedCard = null;
        this.deploymentPreview = null;
        
        // Elixir generation
        this.elixirTimer = 0;
        this.elixirRegenRate = config.elixir.regenRate;
        
        // Enemy AI
        this.enemyAITimer = 0;
        this.enemyAICooldown = 3000;
        
        // River and bridge configuration
        this.riverX = config.canvas.width / 2;
        this.riverWidth = config.river.width;
        this.bridges = this.initBridges();
        
        this.init();
    }
    
    initBridges() {
        const canvasHeight = config.canvas.height;
        const bridgeWidth = config.bridges.width;
        const bridgeHeight = config.bridges.height;
        
        return [
            {
                id: 'top-bridge',
                x: this.riverX - bridgeWidth / 2,
                y: canvasHeight * 0.12,
                width: bridgeWidth,
                height: bridgeHeight,
                centerX: this.riverX,
                centerY: canvasHeight * 0.12 + bridgeHeight / 2
            },
            {
                id: 'bottom-bridge',
                x: this.riverX - bridgeWidth / 2,
                y: canvasHeight * 0.68,
                width: bridgeWidth,
                height: bridgeHeight,
                centerX: this.riverX,
                centerY: canvasHeight * 0.68 + bridgeHeight / 2
            }
        ];
    }
    
    resizeCanvas() {
        const header = document.querySelector('.game-header');
        const cardDeck = document.querySelector('.card-deck');
        const elixirTray = document.querySelector('.elixir-tray');
        const headerHeight = header ? header.offsetHeight : 70;
        const deckHeight = cardDeck ? cardDeck.offsetHeight : 160;
        const elixirHeight = elixirTray ? elixirTray.offsetHeight : 40;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - headerHeight - deckHeight - elixirHeight;
        
        // Update config
        config.canvas.width = this.canvas.width;
        config.canvas.height = this.canvas.height;
        config.bridge.x = this.canvas.width / 2;
        
        // Update river position
        this.riverX = this.canvas.width / 2;
        
        // Reposition towers if they exist
        if (this.towers) {
            this.towers = this.initTowers();
        }
        
        // Reposition bridges if they exist
        if (this.bridges) {
            this.bridges = this.initBridges();
        }
    }
    
    // Select random unique cards for the player's deck
    selectRandomDeck(count) {
        const shuffled = [...this.allCards].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }
    
    shuffleDeck() {
        // Initialize hand with 4 unique cards from the deck
        const shuffled = [...this.deck].sort(() => Math.random() - 0.5);
        this.hand = shuffled.slice(0, 4);
        this.nextCard = shuffled[4];
        // Track which cards are available to draw (not in hand or next)
        this.availableCards = shuffled.slice(5);
    }
    
    drawCard() {
        // Get the next card
        const card = this.nextCard;
        
        // If no available cards, recycle the deck (excluding current hand)
        if (this.availableCards.length === 0) {
            // All 8 cards cycle: 4 in hand + 1 next + 3 available
            // When available is empty, the card we just played goes back to available
            this.availableCards = [card]; // Start recycling
        }
        
        // Pick next card from available cards (ensuring no duplicates in hand)
        // Find a card that's not currently in the hand
        let nextCardIndex = 0;
        for (let i = 0; i < this.availableCards.length; i++) {
            if (!this.hand.includes(this.availableCards[i]) && this.availableCards[i] !== card) {
                nextCardIndex = i;
                break;
            }
        }
        
        this.nextCard = this.availableCards[nextCardIndex];
        this.availableCards.splice(nextCardIndex, 1);
        
        // Add the played card back to available pool
        this.availableCards.push(card);
        
        return card;
    }
    
    init() {
        this.setupEventListeners();
        this.updateCardDisplay();
        this.running = true;
        this.gameLoop();
        this.updateUI();
    }
    
    initTowers() {
        const towerWidth = 70;
        const towerHeight = 90;
        const canvasWidth = config.canvas.width;
        const canvasHeight = config.canvas.height;
        
        // Position towers near the bridge lanes
        const topLaneY = canvasHeight * 0.17;  // Aligned with top bridge
        const bottomLaneY = canvasHeight * 0.73; // Aligned with bottom bridge
        const kingY = canvasHeight * 0.45;
        
        return [
            // Player towers (left side)
            {
                id: 'player-top',
                x: 80,
                y: topLaneY,
                width: towerWidth,
                height: towerHeight,
                hp: 2500,
                maxHp: 2500,
                team: 'player',
                damage: 100,
                range: 250,
                attackSpeed: 800,
                lastAttack: 0,
                destroyed: false,
                emoji: '🏰'
            },
            {
                id: 'player-bottom',
                x: 80,
                y: bottomLaneY,
                width: towerWidth,
                height: towerHeight,
                hp: 2500,
                maxHp: 2500,
                team: 'player',
                damage: 100,
                range: 250,
                attackSpeed: 800,
                lastAttack: 0,
                destroyed: false,
                emoji: '🏰'
            },
            {
                id: 'player-king',
                x: 20,
                y: kingY,
                width: towerWidth + 20,
                height: towerHeight + 30,
                hp: 4000,
                maxHp: 4000,
                team: 'player',
                damage: 120,
                range: 200,
                attackSpeed: 1000,
                lastAttack: 0,
                destroyed: false,
                emoji: '👑',
                activated: false
            },
            // Enemy towers (right side)
            {
                id: 'enemy-top',
                x: canvasWidth - 150,
                y: topLaneY,
                width: towerWidth,
                height: towerHeight,
                hp: 2500,
                maxHp: 2500,
                team: 'enemy',
                damage: 100,
                range: 250,
                attackSpeed: 800,
                lastAttack: 0,
                destroyed: false,
                emoji: '🏰'
            },
            {
                id: 'enemy-bottom',
                x: canvasWidth - 150,
                y: bottomLaneY,
                width: towerWidth,
                height: towerHeight,
                hp: 2500,
                maxHp: 2500,
                team: 'enemy',
                damage: 100,
                range: 250,
                attackSpeed: 800,
                lastAttack: 0,
                destroyed: false,
                emoji: '🏰'
            },
            {
                id: 'enemy-king',
                x: canvasWidth - 110,
                y: kingY,
                width: towerWidth + 20,
                height: towerHeight + 30,
                hp: 4000,
                maxHp: 4000,
                team: 'enemy',
                damage: 120,
                range: 200,
                attackSpeed: 1000,
                lastAttack: 0,
                destroyed: false,
                emoji: '👑',
                activated: false
            }
        ];
    }
    
    updateCardDisplay() {
        const cardElements = document.querySelectorAll('.card:not(.mini)');
        cardElements.forEach((cardEl, index) => {
            if (this.hand[index]) {
                const cardType = this.hand[index];
                const template = unitTemplates[cardType] || { emoji: '🔥', cost: 4, name: cardType };
                cardEl.dataset.card = cardType;
                cardEl.dataset.cost = template.cost || 4;
                
                // Set rarity based on cost
                const cost = template.cost || 4;
                let rarity = 'common';
                if (cardType === 'fireball' || cardType === 'arrows') {
                    cardEl.dataset.type = 'spell';
                } else {
                    cardEl.dataset.type = 'troop';
                }
                if (cost >= 7) rarity = 'legendary';
                else if (cost >= 5) rarity = 'epic';
                else if (cost >= 3) rarity = 'rare';
                cardEl.dataset.rarity = rarity;
                
                cardEl.querySelector('.card-cost').textContent = cost;
                cardEl.querySelector('.card-image').textContent = template.emoji || '🔥';
                cardEl.querySelector('.card-name').textContent = template.name || cardType;
            }
        });
        
        // Update next card
        if (this.nextCard) {
            const nextCardEl = document.querySelector('.card.mini');
            const template = unitTemplates[this.nextCard] || { emoji: '🔥' };
            nextCardEl.querySelector('.card-image').textContent = template.emoji || '🔥';
        }
    }
    
    setupEventListeners() {
        // Card selection
        document.querySelectorAll('.card:not(.mini)').forEach((card, index) => {
            card.addEventListener('click', (e) => {
                const cardType = card.dataset.card;
                const cost = parseInt(card.dataset.cost);
                
                if (this.playerElixir >= cost) {
                    if (this.selectedCard?.index === index) {
                        this.selectedCard = null;
                        card.classList.remove('selected');
                    } else {
                        document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
                        this.selectedCard = { type: cardType, cost: cost, index: index };
                        card.classList.add('selected');
                    }
                }
            });
        });
        
        // Canvas deployment
        this.canvas.addEventListener('click', (e) => {
            if (!this.selectedCard) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * config.canvas.width;
            const y = ((e.clientY - rect.top) / rect.height) * config.canvas.height;
            
            // Miners can be deployed anywhere (they tunnel), other units only on player's side
            const isMiner = this.selectedCard.type === 'miner';
            const isValidPosition = isMiner || x < config.bridge.x + 50;
            
            if (isValidPosition) {
                this.deployUnit(this.selectedCard.type, x, y, 'player');
                
                // Replace card in hand
                this.hand[this.selectedCard.index] = this.drawCard();
                this.updateCardDisplay();
                
                this.selectedCard = null;
                document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
                
                this.stats.unitsDeployed++;
            }
        });
        
        // Canvas hover
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.selectedCard) {
                this.deploymentPreview = null;
                return;
            }
            
            const rect = this.canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * config.canvas.width;
            const y = ((e.clientY - rect.top) / rect.height) * config.canvas.height;
            
            // Miners can be deployed anywhere (they tunnel to enemy territory)
            const isMiner = this.selectedCard && this.selectedCard.type === 'miner';
            this.deploymentPreview = { x, y, valid: isMiner || x < config.bridge.x + 50 };
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.deploymentPreview = null;
        });
        
        // Play again
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            location.reload();
        });
    }
    
    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }
    
    deployUnit(unitType, x, y, team) {
        if (unitType === 'fireball') {
            this.castFireball(x, y);
            this.soundSystem.play('explosion');
            return;
        }
        
        if (unitType === 'arrows') {
            this.castArrows(x, y);
            this.soundSystem.play('explosion');
            return;
        }
        
        const template = unitTemplates[unitType];
        if (!template) return;
        
        if (team === 'player' && this.playerElixir >= template.cost) {
            this.playerElixir -= template.cost;
            this.createUnit(template, x, y, team);
            this.soundSystem.play('deploy');
            this.particleSystem.emit(x, y, 10, { color: 'rgb(102, 126, 234)', speed: 3 });
        }
    }
    
    createUnit(template, x, y, team) {
        // Handle multiple spawning units
        if (template.spawnsMultiple) {
            for (let i = 0; i < template.hitCount; i++) {
                const offsetX = (Math.random() - 0.5) * 40;
                const offsetY = (Math.random() - 0.5) * 40;
                const unit = {
                    ...template,
                    x: x + offsetX,
                    y: y + offsetY,
                    team,
                    maxHp: template.hp,
                    currentHp: template.hp,
                    target: null,
                    lastAttack: 0,
                    size: template.name === 'Skeletons' ? 28 : 42,
                    id: Math.random(),
                    hitCount: 1 // Individual units have hitCount of 1
                };
                this.units.push(unit);
            }
        } else {
            const unit = {
                ...template,
                x,
                y,
                team,
                maxHp: template.hp,
                currentHp: template.hp,
                target: null,
                lastAttack: 0,
                size: template.cost >= 7 ? 55 : 42, // Bigger units for expensive cards
                id: Math.random()
            };
            
            // Special spawn behavior for miner
            if (template.tunneling) {
                unit.tunneling = true;
                unit.tunnelTime = 1000; // 1 second underground
                unit.alpha = 0.3;
            }
            
            this.units.push(unit);
        }
    }
    
    castFireball(x, y) {
        if (this.playerElixir < 4) return;
        
        this.playerElixir -= 4;
        
        // Create explosion effect
        this.effects.push({
            type: 'explosion',
            x, y,
            radius: 150,
            damage: 500,
            lifetime: 500,
            createdAt: Date.now()
        });
        
        this.particleSystem.emit(x, y, 30, { 
            color: 'rgb(255, 100, 0)', 
            speed: 5, 
            lifetime: 60,
            size: 5 
        });
        
        this.damageInRadius(x, y, 150, 500, 'enemy');
    }
    
    castArrows(x, y) {
        if (this.playerElixir < 3) return;
        
        this.playerElixir -= 3;
        
        // Create arrow storm effect
        this.effects.push({
            type: 'arrows',
            x, y,
            radius: 250,
            damage: 300,
            lifetime: 600,
            createdAt: Date.now()
        });
        
        this.particleSystem.emit(x, y, 20, { 
            color: 'rgb(150, 150, 150)', 
            speed: 4, 
            lifetime: 50,
            size: 3 
        });
        
        this.damageInRadius(x, y, 200, 300, 'enemy');
    }
    
    damageInRadius(x, y, radius, damage, targetTeam) {
        const attackerTeam = targetTeam === 'enemy' ? 'player' : 'enemy';
        
        // Damage units
        this.units.forEach(unit => {
            if (unit.team === targetTeam) {
                const dist = Math.hypot(unit.x - x, unit.y - y);
                if (dist < radius) {
                    const actualDamage = Math.min(damage, unit.currentHp);
                    unit.currentHp -= damage;
                    this.stats.damageDealt += actualDamage;
                    this.particleSystem.emit(unit.x, unit.y, 5, { color: 'rgb(255, 0, 0)', speed: 2 });
                    // Show damage number
                    this.createDamageNumber(unit.x, unit.y, actualDamage, attackerTeam);
                }
            }
        });
        
        // Damage towers
        this.towers.forEach(tower => {
            if (tower.team === targetTeam && !tower.destroyed) {
                const dist = Math.hypot((tower.x + tower.width/2) - x, (tower.y + tower.height/2) - y);
                if (dist < radius) {
                    const actualDamage = Math.min(damage, tower.hp);
                    tower.hp -= damage;
                    this.stats.damageDealt += actualDamage;
                    // Show damage number
                    this.createDamageNumber(tower.x + tower.width/2, tower.y + tower.height/2, actualDamage, attackerTeam);
                    if (tower.hp <= 0) {
                        tower.destroyed = true;
                        this.onTowerDestroyed(tower);
                    }
                    this.particleSystem.emit(tower.x + tower.width/2, tower.y + tower.height/2, 10, { 
                        color: 'rgb(255, 100, 0)', 
                        speed: 3 
                    });
                }
            }
        });
    }
    
    gameLoop() {
        if (!this.running) return;
        
        const now = Date.now();
        const deltaTime = now - this.lastTime;
        this.lastTime = now;
        
        // Update game time
        this.gameTime -= deltaTime / 1000;
        if (this.gameTime <= 0) {
            this.gameTime = 0;
            this.endGame();
            return;
        }
        
        // Double elixir
        if (this.gameTime <= config.game.doubleElixirTime && this.elixirRegenRate === config.elixir.regenRate) {
            this.elixirRegenRate = config.elixir.regenRate / 2;
            this.showNotification('⚡ DOUBLE ELIXIR! ⚡');
        }
        
        // Generate elixir - smooth incremental fill
        const elixirPerMs = 1 / this.elixirRegenRate; // How much elixir per millisecond
        if (this.playerElixir < config.elixir.max) {
            this.playerElixir += elixirPerMs * deltaTime;
            if (this.playerElixir > config.elixir.max) {
                this.playerElixir = config.elixir.max;
            }
        }
        if (this.enemyElixir < config.elixir.max) {
            this.enemyElixir += elixirPerMs * deltaTime;
            if (this.enemyElixir > config.elixir.max) {
                this.enemyElixir = config.elixir.max;
            }
        }
        
        // Update systems
        this.updateUnits(deltaTime);
        this.updateTowers(now);
        this.updateProjectiles(deltaTime);
        this.updateEffects(now);
        this.updateDamageNumbers(deltaTime);
        this.particleSystem.update(deltaTime);
        
        // Enemy AI
        this.enemyAI(deltaTime);
        
        // Render
        this.render();
        
        // Update UI
        this.updateUI();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateUnits(deltaTime) {
        // Handle unit deaths and special death effects
        const deadUnits = this.units.filter(unit => unit.currentHp <= 0);
        deadUnits.forEach(unit => {
            // Death damage (Balloon)
            if (unit.deathDamage) {
                this.damageInRadius(unit.x, unit.y, 100, unit.deathDamage, unit.team === 'player' ? 'enemy' : 'player');
                this.particleSystem.emit(unit.x, unit.y, 20, { 
                    color: 'rgb(255, 100, 0)', 
                    speed: 4, 
                    lifetime: 40,
                    size: 4
                });
            }
            
            // Spawn units on death (Golem spawns Golemites)
            if (unit.spawnsOnDeath && unit.name === 'Golem') {
                for (let i = 0; i < 2; i++) {
                    const golemiteX = unit.x + (i === 0 ? -30 : 30);
                    const golemiteY = unit.y + (Math.random() - 0.5) * 40;
                    const golemite = {
                        name: 'Golemite',
                        emoji: '🪨',
                        hp: 800,
                        damage: 120,
                        speed: 1.0,
                        range: 40,
                        attackSpeed: 1500,
                        cost: 0,
                        isGround: true,
                        targetBuildings: false,
                        hitCount: 1,
                        x: golemiteX,
                        y: golemiteY,
                        team: unit.team,
                        maxHp: 800,
                        currentHp: 800,
                        target: null,
                        lastAttack: 0,
                        size: 25,
                        id: Math.random()
                    };
                    this.units.push(golemite);
                }
            }
        });
        
        this.units = this.units.filter(unit => unit.currentHp > 0);
        
        this.units.forEach(unit => {
            // Handle miner tunneling
            if (unit.tunneling && unit.tunnelTime > 0) {
                unit.tunnelTime -= deltaTime;
                if (unit.tunnelTime <= 0) {
                    unit.tunneling = false;
                    unit.alpha = 1.0;
                    this.particleSystem.emit(unit.x, unit.y, 15, { 
                        color: 'rgb(139, 69, 19)', 
                        speed: 3 
                    });
                }
            }
            
            // Skip AI for tunneling units
            if (unit.tunneling) return;
            
            // Find target
            if (!unit.target || unit.target.currentHp <= 0 || (unit.target.isTower && unit.target.towerRef.destroyed)) {
                unit.target = this.findTarget(unit);
            }
            
            if (unit.target) {
                const dx = unit.target.x - unit.x;
                const dy = unit.target.y - unit.y;
                const distance = Math.hypot(dx, dy);
                
                // Move towards target
                if (distance > unit.range) {
                    // Check if we need to cross the river via bridge (only for ground units)
                    if (unit.isGround !== false) {
                        const moveData = this.calculateMovement(unit, unit.target.x, unit.target.y);
                        unit.x += moveData.dx * unit.speed;
                        unit.y += moveData.dy * unit.speed;
                    } else {
                        // Air units move directly
                        const angle = Math.atan2(dy, dx);
                        unit.x += Math.cos(angle) * unit.speed;
                        unit.y += Math.sin(angle) * unit.speed;
                    }
                } else {
                    // Attack
                    const now = Date.now();
                    if (now - unit.lastAttack >= unit.attackSpeed) {
                        unit.lastAttack = now;
                        this.attack(unit, unit.target);
                    }
                }
            } else {
                // Move towards enemy side
                if (unit.isGround !== false) {
                    const targetX = unit.team === 'player' ? config.canvas.width : 0;
                    if (Math.abs(unit.x - targetX) > 10) {
                        const moveData = this.calculateMovement(unit, targetX, unit.y);
                        unit.x += moveData.dx * unit.speed;
                        unit.y += moveData.dy * unit.speed;
                    }
                } else {
                    // Air units move directly
                    const targetX = unit.team === 'player' ? config.canvas.width : 0;
                    if (Math.abs(unit.x - targetX) > 10) {
                        unit.x += (targetX > unit.x ? 1 : -1) * unit.speed;
                    }
                }
            }
        });
    }
    
    // Calculate movement considering river and bridges
    calculateMovement(unit, targetX, targetY) {
        const riverLeft = this.riverX - this.riverWidth / 2;
        const riverRight = this.riverX + this.riverWidth / 2;
        
        // Check if unit needs to cross the river
        const unitOnLeft = unit.x < riverLeft;
        const unitOnRight = unit.x > riverRight;
        const targetOnLeft = targetX < riverLeft;
        const targetOnRight = targetX > riverRight;
        
        const needsToCross = (unitOnLeft && targetOnRight) || (unitOnRight && targetOnLeft);
        
        // If we need to cross, check if we're on a bridge
        if (needsToCross) {
            const onBridge = this.isOnBridge(unit.x, unit.y);
            
            if (onBridge) {
                // On bridge - can cross directly
                const angle = Math.atan2(targetY - unit.y, targetX - unit.x);
                return { dx: Math.cos(angle), dy: Math.sin(angle) };
            } else {
                // Need to navigate to closest bridge first
                const closestBridge = this.getClosestBridge(unit.y);
                const bridgeCenterY = closestBridge.centerY;
                
                // Check if we're at the bridge entrance
                const atBridgeY = Math.abs(unit.y - bridgeCenterY) < 30;
                
                if (atBridgeY) {
                    // Move towards the bridge (horizontally)
                    const dirX = targetX > unit.x ? 1 : -1;
                    return { dx: dirX, dy: 0 };
                } else {
                    // Move vertically towards bridge first, then slightly towards center
                    const dirY = bridgeCenterY > unit.y ? 1 : -1;
                    // Also move slightly towards river to reach bridge faster
                    const dirX = (this.riverX - unit.x) / Math.abs(this.riverX - unit.x) * 0.3;
                    return { dx: dirX, dy: dirY * 0.9 };
                }
            }
        } else {
            // No need to cross river - move directly
            const angle = Math.atan2(targetY - unit.y, targetX - unit.x);
            return { dx: Math.cos(angle), dy: Math.sin(angle) };
        }
    }
    
    isOnBridge(x, y) {
        for (const bridge of this.bridges) {
            if (x >= bridge.x && x <= bridge.x + bridge.width &&
                y >= bridge.y && y <= bridge.y + bridge.height) {
                return true;
            }
        }
        return false;
    }
    
    getClosestBridge(y) {
        let closest = this.bridges[0];
        let minDist = Math.abs(y - this.bridges[0].centerY);
        
        for (const bridge of this.bridges) {
            const dist = Math.abs(y - bridge.centerY);
            if (dist < minDist) {
                minDist = dist;
                closest = bridge;
            }
        }
        return closest;
    }
    
    findTarget(unit) {
        let closestTarget = null;
        let closestDistance = Infinity;
        
        // Check units
        if (!unit.targetBuildings) {
            this.units.forEach(other => {
                if (other.team !== unit.team) {
                    const dist = Math.hypot(other.x - unit.x, other.y - unit.y);
                    if (dist < closestDistance && dist <= unit.range + 300) {
                        closestDistance = dist;
                        closestTarget = other;
                    }
                }
            });
        }
        
        // Check towers
        this.towers.forEach(tower => {
            if (tower.team !== unit.team && !tower.destroyed) {
                const towerCenterX = tower.x + tower.width / 2;
                const towerCenterY = tower.y + tower.height / 2;
                const dist = Math.hypot(towerCenterX - unit.x, towerCenterY - unit.y);
                
                if (dist < closestDistance) {
                    closestDistance = dist;
                    closestTarget = {
                        x: towerCenterX,
                        y: towerCenterY,
                        currentHp: tower.hp,
                        isTower: true,
                        towerRef: tower
                    };
                }
            }
        });
        
        return closestTarget;
    }
    
    attack(attacker, target) {
        this.soundSystem.play('hit');
        
        if (target.isTower) {
            target.towerRef.hp -= attacker.damage;
            this.stats.damageDealt += attacker.damage;
            
            // Show damage number
            this.createDamageNumber(target.x, target.y, attacker.damage, attacker.team);
            
            if (target.towerRef.hp <= 0) {
                target.towerRef.destroyed = true;
                this.onTowerDestroyed(target.towerRef);
            }
            
            this.particleSystem.emit(target.x, target.y, 8, { 
                color: 'rgb(255, 150, 0)', 
                speed: 3 
            });
        } else {
            const actualDamage = Math.min(attacker.damage, target.currentHp);
            target.currentHp -= attacker.damage;
            
            // Show damage number
            this.createDamageNumber(target.x, target.y, actualDamage, attacker.team);
            
            if (attacker.team === 'player') {
                this.stats.damageDealt += actualDamage;
            }
            
            this.particleSystem.emit(target.x, target.y, 5, { 
                color: 'rgb(255, 50, 50)', 
                speed: 2 
            });
        }
        
        // Splash damage (Wizard, Dragon, Valkyrie)
        if (attacker.splashRadius) {
            this.units.forEach(unit => {
                if (unit.team !== attacker.team && unit !== target) {
                    const dist = Math.hypot(unit.x - target.x, unit.y - target.y);
                    if (dist < attacker.splashRadius) {
                        const splashDamage = attacker.threeSixtyAttack ? attacker.damage : attacker.damage * 0.5;
                        unit.currentHp -= splashDamage;
                        this.createDamageNumber(unit.x, unit.y, Math.min(splashDamage, unit.currentHp), attacker.team);
                        this.particleSystem.emit(unit.x, unit.y, 3, { color: 'rgb(255, 100, 0)' });
                    }
                }
            });
        }
        
        // Witch spawns skeleton on attack
        if (attacker.spawnsSkeleton && Math.random() < 0.3) {
            const skeletonTemplate = unitTemplates.skeleton;
            const spawnX = attacker.x + (Math.random() - 0.5) * 60;
            const spawnY = attacker.y + (Math.random() - 0.5) * 60;
            this.createUnit(skeletonTemplate, spawnX, spawnY, attacker.team);
        }
        
        // Create projectile for ranged units
        if (attacker.isRanged) {
            this.projectiles.push({
                x: attacker.x,
                y: attacker.y,
                targetX: target.x,
                targetY: target.y,
                speed: 8,
                color: attacker.emoji === '🧙' ? '#8b5cf6' : attacker.emoji === '🐉' ? '#ef4444' : '#fbbf24'
            });
        }
        
        this.effects.push({
            type: 'hit',
            x: target.x,
            y: target.y,
            lifetime: 200,
            createdAt: Date.now()
        });
    }
    
    // Create floating damage number
    createDamageNumber(x, y, damage, attackerTeam) {
        this.damageNumbers.push({
            x: x + (Math.random() - 0.5) * 20, // Slight random offset
            y: y,
            damage: Math.floor(damage),
            createdAt: Date.now(),
            lifetime: 1000, // 1 second
            team: attackerTeam,
            velocityY: -2, // Float upward
            scale: 1
        });
    }
    
    // Update damage numbers
    updateDamageNumbers(deltaTime) {
        const now = Date.now();
        this.damageNumbers = this.damageNumbers.filter(dn => {
            const age = now - dn.createdAt;
            if (age >= dn.lifetime) return false;
            
            // Float upward and slow down
            dn.y += dn.velocityY;
            dn.velocityY *= 0.98;
            
            // Scale effect (pop in then shrink)
            if (age < 100) {
                dn.scale = 1 + (age / 100) * 0.3;
            } else if (age > dn.lifetime - 200) {
                dn.scale = Math.max(0.5, 1 - ((age - (dn.lifetime - 200)) / 200) * 0.5);
            }
            
            return true;
        });
    }
    
    // Render damage numbers
    renderDamageNumbers(ctx) {
        const now = Date.now();
        
        this.damageNumbers.forEach(dn => {
            const age = now - dn.createdAt;
            const alpha = Math.max(0, 1 - (age / dn.lifetime) * 0.5);
            
            ctx.save();
            ctx.translate(dn.x, dn.y);
            ctx.scale(dn.scale, dn.scale);
            
            // Choose color based on attacker team
            const color = dn.team === 'player' ? '#4ADE80' : '#EF4444';
            const shadowColor = dn.team === 'player' ? '#166534' : '#991B1B';
            
            // Draw damage number with outline
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Shadow/outline
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
            ctx.fillText(`-${dn.damage}`, 2, 2);
            
            // Stroke for better visibility
            ctx.strokeStyle = shadowColor;
            ctx.lineWidth = 3;
            ctx.globalAlpha = alpha;
            ctx.strokeText(`-${dn.damage}`, 0, 0);
            
            // Main text
            ctx.fillStyle = color;
            ctx.fillText(`-${dn.damage}`, 0, 0);
            
            ctx.restore();
        });
    }
    
    updateTowers(now) {
        this.towers.forEach(tower => {
            if (tower.destroyed) return;
            
            // Activate king tower if princess tower destroyed
            if (tower.emoji === '👑' && !tower.activated) {
                const princessTowers = this.towers.filter(t => 
                    t.team === tower.team && t.emoji === '🏰'
                );
                if (princessTowers.some(t => t.destroyed)) {
                    tower.activated = true;
                    this.showNotification(`${tower.team === 'player' ? 'Your' : 'Enemy'} King Tower Activated!`);
                }
            }
            
            // Only attack if activated (or not king tower)
            if (tower.emoji === '👑' && !tower.activated) return;
            
            let target = null;
            let closestDistance = tower.range;
            
            this.units.forEach(unit => {
                if (unit.team !== tower.team) {
                    const dist = Math.hypot(unit.x - (tower.x + tower.width/2), unit.y - (tower.y + tower.height/2));
                    if (dist < closestDistance) {
                        closestDistance = dist;
                        target = unit;
                    }
                }
            });
            
            if (target && now - tower.lastAttack >= tower.attackSpeed) {
                tower.lastAttack = now;
                target.currentHp -= tower.damage;
                this.soundSystem.play('hit');
                
                // Show damage number for tower attacks
                this.createDamageNumber(target.x, target.y, tower.damage, tower.team);
                
                this.projectiles.push({
                    x: tower.x + tower.width / 2,
                    y: tower.y + tower.height / 2,
                    targetX: target.x,
                    targetY: target.y,
                    speed: 7,
                    color: tower.team === 'player' ? '#3b82f6' : '#ef4444'
                });
            }
        });
    }
    
    updateProjectiles(deltaTime) {
        this.projectiles = this.projectiles.filter(proj => {
            const dx = proj.targetX - proj.x;
            const dy = proj.targetY - proj.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance < proj.speed) {
                return false;
            }
            
            const angle = Math.atan2(dy, dx);
            proj.x += Math.cos(angle) * proj.speed;
            proj.y += Math.sin(angle) * proj.speed;
            
            return true;
        });
    }
    
    updateEffects(now) {
        this.effects = this.effects.filter(effect => {
            return (now - effect.createdAt) < effect.lifetime;
        });
    }
    
    onTowerDestroyed(tower) {
        this.soundSystem.play('tower-destroy');
        this.particleSystem.emit(
            tower.x + tower.width / 2, 
            tower.y + tower.height / 2, 
            40, 
            { color: 'rgb(255, 150, 0)', speed: 6, lifetime: 80, size: 5 }
        );
        
        if (tower.team === 'player') {
            this.enemyCrowns++;
            this.showNotification('Tower Destroyed! 👑');
            if (tower.id === 'player-king' || this.enemyCrowns >= 3) {
                this.endGame('defeat');
            }
        } else {
            this.playerCrowns++;
            this.showNotification('Tower Destroyed! 👑');
            if (tower.id === 'enemy-king' || this.playerCrowns >= 3) {
                this.endGame('victory');
            }
        }
    }
    
    enemyAI(deltaTime) {
        this.enemyAITimer += deltaTime;
        
        // Variable AI cooldown based on game state (faster reactions when under pressure)
        const baseCooldown = 2000;
        const pressureFactor = this.getEnemyPressureLevel();
        const adaptiveCooldown = baseCooldown * (1 - pressureFactor * 0.5);
        
        if (this.enemyAITimer < adaptiveCooldown) return;
        this.enemyAITimer = 0;
        
        // AI State Analysis
        const gameState = this.analyzeGameState();
        
        // Decision priority based on game state
        if (gameState.underHeavyAttack && this.enemyElixir >= 3) {
            this.aiDefend(gameState);
        } else if (gameState.hasElixirAdvantage && this.enemyElixir >= 6) {
            this.aiPushAttack(gameState);
        } else if (this.enemyElixir >= 4) {
            this.aiBalancedPlay(gameState);
        } else if (this.enemyElixir >= 2 && gameState.underAttack) {
            this.aiCheapDefense(gameState);
        }
        // Otherwise save elixir
    }
    
    // Analyze current game state for AI decision making
    analyzeGameState() {
        const playerUnits = this.units.filter(u => u.team === 'player');
        const enemyUnits = this.units.filter(u => u.team === 'enemy');
        
        // Units threatening enemy side
        const threateningUnits = playerUnits.filter(u => u.x > config.bridge.x - 150);
        const unitsNearTowers = playerUnits.filter(u => u.x > config.bridge.x + 100);
        
        // Lane analysis
        const topLaneY = config.canvas.height * 0.3;
        const bottomLaneY = config.canvas.height * 0.7;
        
        const topLaneThreat = threateningUnits.filter(u => u.y < topLaneY);
        const bottomLaneThreat = threateningUnits.filter(u => u.y > bottomLaneY);
        
        // Tower health analysis
        const enemyTowers = this.towers.filter(t => t.team === 'enemy' && !t.destroyed);
        const playerTowers = this.towers.filter(t => t.team === 'player' && !t.destroyed);
        const lowestEnemyTower = enemyTowers.reduce((lowest, t) => 
            (t.hp / t.maxHp < (lowest?.hp / lowest?.maxHp || 1)) ? t : lowest, null);
        const lowestPlayerTower = playerTowers.reduce((lowest, t) => 
            (t.hp / t.maxHp < (lowest?.hp / lowest?.maxHp || 1)) ? t : lowest, null);
        
        // Calculate threat levels
        const topThreatLevel = this.calculateThreatLevel(topLaneThreat);
        const bottomThreatLevel = this.calculateThreatLevel(bottomLaneThreat);
        const totalThreat = topThreatLevel + bottomThreatLevel;
        
        // Check if there's a big push happening
        const bigPush = threateningUnits.length >= 3 || 
                        threateningUnits.some(u => u.hp > 2000);
        
        return {
            playerUnits,
            enemyUnits,
            threateningUnits,
            unitsNearTowers,
            topLaneThreat,
            bottomLaneThreat,
            topThreatLevel,
            bottomThreatLevel,
            mostDangerousLane: topThreatLevel > bottomThreatLevel ? 'top' : 'bottom',
            underAttack: threateningUnits.length > 0,
            underHeavyAttack: bigPush || totalThreat > 2000,
            hasElixirAdvantage: this.enemyElixir > this.playerElixir + 2,
            lowestEnemyTower,
            lowestPlayerTower,
            canFinishTower: lowestPlayerTower && lowestPlayerTower.hp < 800,
            enemyUnitsOnField: enemyUnits.length,
            playerUnitsOnField: playerUnits.length
        };
    }
    
    // Calculate threat level of units
    calculateThreatLevel(units) {
        return units.reduce((total, unit) => {
            let threat = unit.damage * (unit.currentHp / unit.hp);
            if (unit.targetBuildings) threat *= 1.5; // Building targeters are more dangerous
            if (unit.fast) threat *= 1.3; // Fast units need quick response
            if (unit.isAir) threat *= 1.2; // Air units harder to defend
            return total + threat;
        }, 0);
    }
    
    // Get pressure level (0-1)
    getEnemyPressureLevel() {
        const playerUnits = this.units.filter(u => u.team === 'player');
        const nearRiver = playerUnits.filter(u => u.x > config.bridge.x - 200);
        return Math.min(nearRiver.length / 5, 1);
    }
    
    // Defensive play
    aiDefend(gameState) {
        const lane = gameState.mostDangerousLane;
        const threats = lane === 'top' ? gameState.topLaneThreat : gameState.bottomLaneThreat;
        
        // Check for spell value (multiple units clustered)
        if (threats.length >= 3 && this.enemyElixir >= 4) {
            const centerX = threats.reduce((sum, u) => sum + u.x, 0) / threats.length;
            const centerY = threats.reduce((sum, u) => sum + u.y, 0) / threats.length;
            
            // Use fireball for high HP units, arrows for swarms
            const hasHighHp = threats.some(u => u.currentHp > 500);
            if (hasHighHp && this.enemyElixir >= 4) {
                this.enemyElixir -= 4;
                this.damageInRadius(centerX, centerY, 150, 500, 'player');
                this.createSpellEffect('fireball', centerX, centerY);
                return;
            } else if (this.enemyElixir >= 3) {
                this.enemyElixir -= 3;
                this.damageInRadius(centerX, centerY, 200, 300, 'player');
                this.createSpellEffect('arrows', centerX, centerY);
                return;
            }
        }
        
        // Deploy defensive unit
        const defensiveUnits = this.getDefensiveUnits();
        const bestDefender = this.selectBestCounter(threats, defensiveUnits);
        
        if (bestDefender && this.enemyElixir >= bestDefender.cost) {
            this.deployEnemyUnit(bestDefender, lane, 'defense');
        }
    }
    
    // Cheap defense for low elixir
    aiCheapDefense(gameState) {
        const cheapUnits = Object.entries(unitTemplates)
            .filter(([_, u]) => u.cost <= 3 && u.cost <= this.enemyElixir)
            .map(([key, u]) => ({...u, type: key}));
        
        if (cheapUnits.length > 0) {
            const unit = cheapUnits[Math.floor(Math.random() * cheapUnits.length)];
            this.deployEnemyUnit(unit, gameState.mostDangerousLane, 'defense');
        }
    }
    
    // Aggressive push
    aiPushAttack(gameState) {
        // Choose weaker lane to attack
        const targetLane = gameState.lowestPlayerTower?.id.includes('top') ? 'top' : 'bottom';
        
        // Build a push - start with tank, then support
        const tanks = ['giant', 'golem', 'pekka'].filter(
            t => unitTemplates[t] && unitTemplates[t].cost <= this.enemyElixir
        );
        const supports = ['wizard', 'musketeer', 'witch', 'archer'].filter(
            s => unitTemplates[s] && unitTemplates[s].cost <= this.enemyElixir
        );
        
        // If we have a lot of elixir, deploy tank first
        if (tanks.length > 0 && this.enemyElixir >= 5) {
            const tank = tanks[Math.floor(Math.random() * tanks.length)];
            this.deployEnemyUnit({...unitTemplates[tank], type: tank}, targetLane, 'push');
            return;
        }
        
        // Add support if we already have units pushing
        const pushingUnits = gameState.enemyUnits.filter(u => u.x < config.bridge.x);
        if (pushingUnits.length > 0 && supports.length > 0) {
            const support = supports[Math.floor(Math.random() * supports.length)];
            this.deployEnemyUnit({...unitTemplates[support], type: support}, targetLane, 'support');
            return;
        }
        
        // Win condition cards
        const winConditions = ['hogrider', 'balloon', 'miner'].filter(
            w => unitTemplates[w] && unitTemplates[w].cost <= this.enemyElixir
        );
        
        if (winConditions.length > 0 && gameState.canFinishTower) {
            const winCon = winConditions[Math.floor(Math.random() * winConditions.length)];
            this.deployEnemyUnit({...unitTemplates[winCon], type: winCon}, targetLane, 'attack');
        }
    }
    
    // Balanced play
    aiBalancedPlay(gameState) {
        // Counter-push after defending
        if (gameState.enemyUnitsOnField > 0 && gameState.playerUnitsOnField < 2) {
            const supports = ['archer', 'musketeer', 'wizard', 'minipekka'].filter(
                s => unitTemplates[s] && unitTemplates[s].cost <= this.enemyElixir
            );
            if (supports.length > 0) {
                const support = supports[Math.floor(Math.random() * supports.length)];
                // Deploy behind existing units
                const existingUnit = gameState.enemyUnits[0];
                const lane = existingUnit.y < config.canvas.height / 2 ? 'top' : 'bottom';
                this.deployEnemyUnit({...unitTemplates[support], type: support}, lane, 'support');
                return;
            }
        }
        
        // Pressure opposite lane when player pushes
        if (gameState.underAttack && this.enemyElixir >= 4) {
            const oppositeLane = gameState.mostDangerousLane === 'top' ? 'bottom' : 'top';
            const pressureCards = ['hogrider', 'minipekka', 'knight', 'barbarian'].filter(
                p => unitTemplates[p] && unitTemplates[p].cost <= this.enemyElixir
            );
            if (pressureCards.length > 0) {
                const card = pressureCards[Math.floor(Math.random() * pressureCards.length)];
                this.deployEnemyUnit({...unitTemplates[card], type: card}, oppositeLane, 'attack');
                return;
            }
        }
        
        // Standard play - deploy something
        const available = Object.entries(unitTemplates)
            .filter(([_, u]) => u.cost <= this.enemyElixir && u.cost >= 3)
            .map(([key, u]) => ({...u, type: key}));
        
        if (available.length > 0) {
            const unit = available[Math.floor(Math.random() * available.length)];
            const lane = Math.random() > 0.5 ? 'top' : 'bottom';
            this.deployEnemyUnit(unit, lane, 'attack');
        }
    }
    
    // Get defensive unit options
    getDefensiveUnits() {
        return Object.entries(unitTemplates)
            .filter(([_, u]) => u.cost <= this.enemyElixir)
            .map(([key, u]) => ({...u, type: key}))
            .sort((a, b) => {
                // Prioritize high damage, splash, and ranged units for defense
                let scoreA = a.damage;
                let scoreB = b.damage;
                if (a.splashRadius) scoreA *= 1.5;
                if (b.splashRadius) scoreB *= 1.5;
                if (a.isRanged) scoreA *= 1.3;
                if (b.isRanged) scoreB *= 1.3;
                return scoreB - scoreA;
            });
    }
    
    // Select best counter for threats
    selectBestCounter(threats, availableUnits) {
        if (availableUnits.length === 0) return null;
        
        const hasAirUnits = threats.some(t => t.isAir);
        const hasSwarm = threats.length >= 3 || threats.some(t => t.spawnsMultiple);
        const hasTank = threats.some(t => t.hp > 2000);
        
        // Filter and score units
        return availableUnits.find(unit => {
            // Can target air if needed
            if (hasAirUnits && unit.isRanged) return true;
            // Splash for swarms
            if (hasSwarm && unit.splashRadius) return true;
            // High damage for tanks
            if (hasTank && unit.damage > 300) return true;
            // Default fallback
            return unit.cost <= 4;
        }) || availableUnits[0];
    }
    
    // Deploy enemy unit helper
    deployEnemyUnit(unitData, lane, deployType) {
        const template = unitTemplates[unitData.type] || unitData;
        if (this.enemyElixir < template.cost) return;
        
        this.enemyElixir -= template.cost;
        
        const bridgeIndex = lane === 'top' ? 0 : 1;
        const targetBridge = this.bridges[bridgeIndex];
        
        let x, y;
        
        switch(deployType) {
            case 'defense':
                // Deploy near tower
                x = config.canvas.width - 100;
                y = targetBridge.centerY + (Math.random() - 0.5) * 60;
                break;
            case 'push':
                // Deploy at back
                x = config.canvas.width - 80;
                y = targetBridge.centerY;
                break;
            case 'support':
                // Deploy behind existing units
                const allyUnits = this.units.filter(u => u.team === 'enemy');
                if (allyUnits.length > 0) {
                    const frontUnit = allyUnits.reduce((front, u) => u.x < front.x ? u : front, allyUnits[0]);
                    x = Math.min(frontUnit.x + 80, config.canvas.width - 100);
                    y = frontUnit.y + (Math.random() - 0.5) * 40;
                } else {
                    x = config.canvas.width - 120;
                    y = targetBridge.centerY;
                }
                break;
            case 'attack':
            default:
                // Deploy at bridge
                x = config.canvas.width - 120;
                y = targetBridge.centerY + (Math.random() - 0.5) * 30;
                break;
        }
        
        this.createUnit(template, x, y, 'enemy');
        this.soundSystem.play('deploy');
        this.particleSystem.emit(x, y, 10, { color: 'rgb(239, 68, 68)', speed: 3 });
    }
    
    // Create spell visual effect
    createSpellEffect(type, x, y) {
        if (type === 'fireball') {
            this.effects.push({
                type: 'explosion',
                x, y,
                radius: 150,
                lifetime: 500,
                createdAt: Date.now()
            });
            this.particleSystem.emit(x, y, 30, { 
                color: 'rgb(255, 100, 0)', 
                speed: 5, 
                lifetime: 60,
                size: 5 
            });
        } else if (type === 'arrows') {
            this.effects.push({
                type: 'arrows',
                x, y,
                radius: 200,
                lifetime: 600,
                createdAt: Date.now()
            });
            this.particleSystem.emit(x, y, 20, { 
                color: 'rgb(150, 150, 150)', 
                speed: 4, 
                lifetime: 50,
                size: 3 
            });
        }
    }
    
    endGame(result = null) {
        this.running = false;
        
        if (!result) {
            if (this.playerCrowns > this.enemyCrowns) {
                result = 'victory';
            } else if (this.enemyCrowns > this.playerCrowns) {
                result = 'defeat';
            } else {
                result = 'draw';
            }
        }
        
        if (result === 'victory') {
            this.soundSystem.play('victory');
        }
        
        const gameOverScreen = document.getElementById('gameOverScreen');
        const title = document.getElementById('gameOverTitle');
        const crowns = document.getElementById('crownsEarned');
        
        if (result === 'victory') {
            title.textContent = '🎉 Victory! 🎉';
            title.style.color = '#4ade80';
        } else if (result === 'defeat') {
            title.textContent = '💔 Defeat 💔';
            title.style.color = '#ef4444';
        } else {
            title.textContent = '🤝 Draw 🤝';
            title.style.color = '#fbbf24';
        }
        
        crowns.textContent = this.playerCrowns;
        document.getElementById('damageDealt').textContent = this.stats.damageDealt.toLocaleString();
        document.getElementById('unitsDeployed').textContent = this.stats.unitsDeployed;
        
        gameOverScreen.classList.add('show');
    }
    
    render() {
        const ctx = this.ctx;
        
        // Clear
        ctx.clearRect(0, 0, config.canvas.width, config.canvas.height);
        
        // Draw arena background (two sides separated by river)
        // Player side (left - blue/green grass)
        const gradient1 = ctx.createLinearGradient(0, 0, this.riverX - this.riverWidth/2, 0);
        gradient1.addColorStop(0, '#2d5a3d');
        gradient1.addColorStop(0.5, '#3a6b4a');
        gradient1.addColorStop(1, '#4a7d5a');
        ctx.fillStyle = gradient1;
        ctx.fillRect(0, 0, this.riverX - this.riverWidth/2, config.canvas.height);
        
        // Enemy side (right - red/brown)
        const gradient2 = ctx.createLinearGradient(this.riverX + this.riverWidth/2, 0, config.canvas.width, 0);
        gradient2.addColorStop(0, '#5a4a3a');
        gradient2.addColorStop(0.5, '#6b5040');
        gradient2.addColorStop(1, '#7a5a4a');
        ctx.fillStyle = gradient2;
        ctx.fillRect(this.riverX + this.riverWidth/2, 0, config.canvas.width / 2, config.canvas.height);
        
        // Draw grass texture pattern
        this.drawGrassPattern(ctx, 0, 0, this.riverX - this.riverWidth/2, config.canvas.height, 'player');
        this.drawGrassPattern(ctx, this.riverX + this.riverWidth/2, 0, config.canvas.width / 2, config.canvas.height, 'enemy');
        
        // Draw RIVER
        const riverGradient = ctx.createLinearGradient(this.riverX - this.riverWidth/2, 0, this.riverX + this.riverWidth/2, 0);
        riverGradient.addColorStop(0, '#1a5a8a');
        riverGradient.addColorStop(0.3, '#2a7aaa');
        riverGradient.addColorStop(0.5, '#3a8aba');
        riverGradient.addColorStop(0.7, '#2a7aaa');
        riverGradient.addColorStop(1, '#1a5a8a');
        ctx.fillStyle = riverGradient;
        ctx.fillRect(this.riverX - this.riverWidth/2, 0, this.riverWidth, config.canvas.height);
        
        // River water ripple effect
        this.drawRiverRipples(ctx);
        
        // River banks
        ctx.strokeStyle = '#3d2e1f';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.riverX - this.riverWidth/2, 0);
        ctx.lineTo(this.riverX - this.riverWidth/2, config.canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.riverX + this.riverWidth/2, 0);
        ctx.lineTo(this.riverX + this.riverWidth/2, config.canvas.height);
        ctx.stroke();
        
        // Draw BRIDGES
        this.bridges.forEach(bridge => {
            this.drawBridge(ctx, bridge);
        });
        
        // Draw lane dividers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 10]);
        ctx.beginPath();
        ctx.moveTo(0, config.canvas.height * 0.40);
        ctx.lineTo(config.canvas.width, config.canvas.height * 0.40);
        ctx.moveTo(0, config.canvas.height * 0.60);
        ctx.lineTo(config.canvas.width, config.canvas.height * 0.60);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw towers
        this.towers.forEach(tower => {
            if (!tower.destroyed) {
                // Tower shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(tower.x + 5, tower.y + 5, tower.width, tower.height);
                
                // Tower body
                ctx.fillStyle = tower.team === 'player' ? '#3b82f6' : '#ef4444';
                ctx.fillRect(tower.x, tower.y, tower.width, tower.height);
                
                // Tower border
                ctx.strokeStyle = tower.team === 'player' ? '#1e40af' : '#991b1b';
                ctx.lineWidth = 3;
                ctx.strokeRect(tower.x, tower.y, tower.width, tower.height);
                
                // Tower emoji
                ctx.font = '56px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(tower.emoji, tower.x + tower.width / 2, tower.y + tower.height / 2);
                
                // Health bar
                const healthPercent = tower.hp / tower.maxHp;
                const barWidth = tower.width;
                const barHeight = 8;
                const barX = tower.x;
                const barY = tower.y - 15;
                
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                
                ctx.fillStyle = healthPercent > 0.6 ? '#4ade80' : healthPercent > 0.3 ? '#fbbf24' : '#ef4444';
                ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
                
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeRect(barX, barY, barWidth, barHeight);
                
                // HP text
                ctx.font = '16px Arial';
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.fillText(Math.floor(tower.hp), barX + barWidth / 2, barY - 8);
            }
        });
        
        // Draw units
        this.units.forEach(unit => {
            this.drawUnit(ctx, unit);
        });
        
        // Draw projectiles
        this.projectiles.forEach(proj => {
            // Projectile trail
            ctx.beginPath();
            const trailGradient = ctx.createLinearGradient(
                proj.x - (proj.x - proj.targetX) * 0.1,
                proj.y - (proj.y - proj.targetY) * 0.1,
                proj.x, proj.y
            );
            trailGradient.addColorStop(0, 'transparent');
            trailGradient.addColorStop(1, proj.color);
            ctx.strokeStyle = trailGradient;
            ctx.lineWidth = 4;
            ctx.moveTo(proj.x - (proj.x - proj.targetX) * 0.15, proj.y - (proj.y - proj.targetY) * 0.15);
            ctx.lineTo(proj.x, proj.y);
            ctx.stroke();
            
            // Projectile glow
            const glowGradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 12);
            glowGradient.addColorStop(0, proj.color);
            glowGradient.addColorStop(0.5, proj.color + '80');
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 12, 0, Math.PI * 2);
            ctx.fill();
            
            // Projectile core
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = proj.color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
        
        // Draw effects
        const now = Date.now();
        this.effects.forEach(effect => {
            const age = now - effect.createdAt;
            const progress = age / effect.lifetime;
            const alpha = 1 - progress;
            
            if (effect.type === 'explosion') {
                const currentRadius = effect.radius * progress;
                
                ctx.fillStyle = `rgba(255, 100, 0, ${alpha * 0.6})`;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, currentRadius, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = `rgba(255, 200, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, currentRadius * 0.6, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = `rgba(255, 150, 0, ${alpha})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            } else if (effect.type === 'arrows') {
                const currentRadius = effect.radius * 0.5;
                ctx.fillStyle = `rgba(150, 150, 150, ${alpha * 0.4})`;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, currentRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw arrow symbols
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i) / 8;
                    const x = effect.x + Math.cos(angle) * currentRadius * 0.7;
                    const y = effect.y + Math.sin(angle) * currentRadius * 0.7 - progress * 30;
                    ctx.font = '24px Arial';
                    ctx.fillStyle = `rgba(100, 100, 100, ${alpha})`;
                    ctx.fillText('↓', x, y);
                }
            } else if (effect.type === 'hit') {
                ctx.font = '28px Arial';
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.textAlign = 'center';
                ctx.fillText('💥', effect.x, effect.y - age / 10);
            }
        });
        
        // Draw particles
        this.particleSystem.render(ctx);
        
        // Draw damage numbers
        this.renderDamageNumbers(ctx);
        
        // Draw deployment preview
        if (this.deploymentPreview) {
            ctx.strokeStyle = this.deploymentPreview.valid ? '#4ade80' : '#ef4444';
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.arc(this.deploymentPreview.x, this.deploymentPreview.y, 35, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Range indicator
            if (this.selectedCard && unitTemplates[this.selectedCard.type]) {
                const template = unitTemplates[this.selectedCard.type];
                ctx.strokeStyle = `rgba(102, 126, 234, 0.3)`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.deploymentPreview.x, this.deploymentPreview.y, template.range, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
    
    // Draw grass texture pattern
    drawGrassPattern(ctx, x, y, width, height, team) {
        const grassColor = team === 'player' ? 'rgba(60, 120, 60, 0.3)' : 'rgba(100, 70, 50, 0.3)';
        ctx.fillStyle = grassColor;
        
        // Draw small grass tufts
        for (let i = 0; i < 100; i++) {
            const gx = x + Math.random() * width;
            const gy = y + Math.random() * height;
            ctx.beginPath();
            ctx.arc(gx, gy, 2 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw river water ripples animation
    drawRiverRipples(ctx) {
        const time = Date.now() / 1000;
        ctx.strokeStyle = 'rgba(100, 180, 220, 0.4)';
        ctx.lineWidth = 2;
        
        // Animated wave lines
        for (let y = 0; y < config.canvas.height; y += 30) {
            ctx.beginPath();
            for (let x = this.riverX - this.riverWidth/2; x <= this.riverX + this.riverWidth/2; x += 5) {
                const wave = Math.sin((y + time * 50) * 0.1 + x * 0.05) * 3;
                if (x === this.riverX - this.riverWidth/2) {
                    ctx.moveTo(x, y + wave);
                } else {
                    ctx.lineTo(x, y + wave);
                }
            }
            ctx.stroke();
        }
        
        // Sparkles on water
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 10; i++) {
            const sparkleX = this.riverX + Math.sin(time + i * 0.5) * (this.riverWidth / 3);
            const sparkleY = ((time * 30 + i * 80) % config.canvas.height);
            ctx.beginPath();
            ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw a bridge
    drawBridge(ctx, bridge) {
        // Bridge shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(bridge.x + 4, bridge.y + 4, bridge.width, bridge.height);
        
        // Bridge base (stone/wood look)
        const bridgeGradient = ctx.createLinearGradient(bridge.x, bridge.y, bridge.x, bridge.y + bridge.height);
        bridgeGradient.addColorStop(0, '#8B7355');
        bridgeGradient.addColorStop(0.3, '#A08060');
        bridgeGradient.addColorStop(0.5, '#B09070');
        bridgeGradient.addColorStop(0.7, '#A08060');
        bridgeGradient.addColorStop(1, '#8B7355');
        ctx.fillStyle = bridgeGradient;
        ctx.fillRect(bridge.x, bridge.y, bridge.width, bridge.height);
        
        // Bridge planks (horizontal lines)
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 2;
        for (let y = bridge.y + 10; y < bridge.y + bridge.height; y += 15) {
            ctx.beginPath();
            ctx.moveTo(bridge.x, y);
            ctx.lineTo(bridge.x + bridge.width, y);
            ctx.stroke();
        }
        
        // Bridge borders (railings)
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(bridge.x, bridge.y - 5, bridge.width, 8);
        ctx.fillRect(bridge.x, bridge.y + bridge.height - 3, bridge.width, 8);
        
        // Bridge posts
        ctx.fillStyle = '#4E342E';
        // Top railing posts
        ctx.fillRect(bridge.x - 5, bridge.y - 10, 10, 20);
        ctx.fillRect(bridge.x + bridge.width - 5, bridge.y - 10, 10, 20);
        // Bottom railing posts
        ctx.fillRect(bridge.x - 5, bridge.y + bridge.height - 10, 10, 20);
        ctx.fillRect(bridge.x + bridge.width - 5, bridge.y + bridge.height - 10, 10, 20);
        
        // Highlight on bridge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(bridge.x + 5, bridge.y + 5, bridge.width - 10, bridge.height / 3);
        
        // Bridge border
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 3;
        ctx.strokeRect(bridge.x, bridge.y, bridge.width, bridge.height);
    }
    
    // Draw unit with Clash Royale style
    drawUnit(ctx, unit) {
        const isTunneling = unit.tunneling && unit.tunnelTime > 0;
        const alpha = isTunneling ? 0.4 : 1.0;
        const size = unit.size || 30;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Get unit colors based on type and team
        const colors = this.getUnitColors(unit);
        
        // Air unit floating effect
        let yOffset = 0;
        if (unit.isAir) {
            yOffset = Math.sin(Date.now() / 200 + unit.id * 100) * 3;
            // Air shadow (further down)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(unit.x, unit.y + size / 2 + 15, size / 2.5, size / 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Ground shadow
        if (!unit.isAir) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(unit.x + 2, unit.y + size / 2 + 3, size / 2, size / 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const drawY = unit.y + yOffset;
        
        // Outer glow for team color
        const glowGradient = ctx.createRadialGradient(unit.x, drawY, size / 3, unit.x, drawY, size / 1.5);
        glowGradient.addColorStop(0, 'transparent');
        glowGradient.addColorStop(0.7, colors.glow + '40');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(unit.x, drawY, size / 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Unit base circle with gradient
        const bodyGradient = ctx.createRadialGradient(
            unit.x - size / 6, drawY - size / 6, 0,
            unit.x, drawY, size / 2
        );
        bodyGradient.addColorStop(0, colors.highlight);
        bodyGradient.addColorStop(0.5, colors.main);
        bodyGradient.addColorStop(1, colors.shadow);
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(unit.x, drawY, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner border highlight
        ctx.strokeStyle = colors.highlight + '80';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(unit.x, drawY, size / 2 - 2, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
        
        // Outer border
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(unit.x, drawY, size / 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Team indicator ring
        ctx.strokeStyle = unit.team === 'player' ? '#3B82F6' : '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(unit.x, drawY, size / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // Unit emoji with shadow
        const emojiSize = size * 0.7;
        ctx.font = `${emojiSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Emoji shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillText(unit.emoji, unit.x + 1, drawY + 2);
        
        // Emoji
        ctx.fillStyle = '#FFF';
        ctx.fillText(unit.emoji, unit.x, drawY);
        
        ctx.globalAlpha = 1.0;
        
        // Health bar (Clash Royale style)
        if (!isTunneling) {
            this.drawHealthBar(ctx, unit, drawY);
        }
        
        // Level badge (small circle)
        if (!isTunneling && unit.cost) {
            ctx.fillStyle = unit.team === 'player' ? '#1E40AF' : '#991B1B';
            ctx.beginPath();
            ctx.arc(unit.x + size / 2 - 2, drawY - size / 2 + 2, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 9px Arial';
            ctx.fillText('1', unit.x + size / 2 - 2, drawY - size / 2 + 3);
        }
        
        ctx.restore();
    }
    
    // Get colors for unit based on type and team
    getUnitColors(unit) {
        const isPlayer = unit.team === 'player';
        
        // Default colors
        let colors = {
            main: isPlayer ? '#4A90C2' : '#C24A4A',
            highlight: isPlayer ? '#7AB8E8' : '#E87A7A',
            shadow: isPlayer ? '#2A5A82' : '#822A2A',
            border: isPlayer ? '#1A3A52' : '#521A1A',
            glow: isPlayer ? '#60A5FA' : '#F87171'
        };
        
        // Special colors for unit types
        const unitType = unit.name?.toLowerCase() || '';
        
        if (unit.isAir || unitType.includes('dragon') || unitType.includes('balloon')) {
            colors = {
                main: isPlayer ? '#8B5CF6' : '#EC4899',
                highlight: isPlayer ? '#A78BFA' : '#F472B6',
                shadow: isPlayer ? '#6B3CC6' : '#BE185D',
                border: isPlayer ? '#4C1D95' : '#831843',
                glow: isPlayer ? '#A855F7' : '#F472B6'
            };
        } else if (unitType.includes('pekka') || unitType.includes('golem')) {
            colors = {
                main: isPlayer ? '#475569' : '#6B7280',
                highlight: isPlayer ? '#64748B' : '#9CA3AF',
                shadow: isPlayer ? '#1E293B' : '#374151',
                border: isPlayer ? '#0F172A' : '#1F2937',
                glow: isPlayer ? '#64748B' : '#9CA3AF'
            };
        } else if (unitType.includes('witch')) {
            colors = {
                main: isPlayer ? '#7C3AED' : '#A855F7',
                highlight: isPlayer ? '#A78BFA' : '#C084FC',
                shadow: isPlayer ? '#5B21B6' : '#7C3AED',
                border: isPlayer ? '#4C1D95' : '#6B21A8',
                glow: isPlayer ? '#8B5CF6' : '#C084FC'
            };
        } else if (unitType.includes('skeleton')) {
            colors = {
                main: isPlayer ? '#E5E7EB' : '#F3F4F6',
                highlight: isPlayer ? '#F9FAFB' : '#FFFFFF',
                shadow: isPlayer ? '#9CA3AF' : '#D1D5DB',
                border: isPlayer ? '#4B5563' : '#6B7280',
                glow: isPlayer ? '#60A5FA' : '#F87171'
            };
        } else if (unitType.includes('wizard') || unitType.includes('musketeer')) {
            colors = {
                main: isPlayer ? '#F59E0B' : '#EF4444',
                highlight: isPlayer ? '#FCD34D' : '#FCA5A5',
                shadow: isPlayer ? '#B45309' : '#B91C1C',
                border: isPlayer ? '#78350F' : '#7F1D1D',
                glow: isPlayer ? '#FBBF24' : '#F87171'
            };
        }
        
        return colors;
    }
    
    // Draw Clash Royale style health bar
    drawHealthBar(ctx, unit, drawY) {
        const healthPercent = unit.currentHp / unit.maxHp;
        const size = unit.size || 30;
        const barWidth = size * 1.2;
        const barHeight = 6;
        const barX = unit.x - barWidth / 2;
        const barY = drawY - size / 2 - 14;
        const cornerRadius = 3;
        
        // Bar background with rounded corners
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.roundRect(ctx, barX - 1, barY - 1, barWidth + 2, barHeight + 2, cornerRadius);
        ctx.fill();
        
        // Health fill with gradient
        const healthColor = healthPercent > 0.6 ? '#22C55E' : healthPercent > 0.3 ? '#EAB308' : '#EF4444';
        const healthGradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
        healthGradient.addColorStop(0, this.lightenColor(healthColor, 30));
        healthGradient.addColorStop(0.5, healthColor);
        healthGradient.addColorStop(1, this.darkenColor(healthColor, 20));
        
        ctx.fillStyle = healthGradient;
        const fillWidth = Math.max(0, (barWidth * healthPercent) - 2);
        if (fillWidth > 0) {
            this.roundRect(ctx, barX + 1, barY + 1, fillWidth, barHeight - 2, cornerRadius - 1);
            ctx.fill();
        }
        
        // Shine effect on health bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        if (fillWidth > 0) {
            this.roundRect(ctx, barX + 1, barY + 1, fillWidth, (barHeight - 2) / 2, cornerRadius - 1);
            ctx.fill();
        }
        
        // Border
        ctx.strokeStyle = unit.team === 'player' ? '#1E40AF' : '#991B1B';
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, barX, barY, barWidth, barHeight, cornerRadius);
        ctx.stroke();
    }
    
    // Helper to draw rounded rectangles
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    // Lighten a hex color
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `rgb(${R}, ${G}, ${B})`;
    }
    
    // Darken a hex color
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `rgb(${R}, ${G}, ${B})`;
    }
    
    updateUI() {
        // Player elixir - New slot-based system
        const fullSlots = Math.floor(this.playerElixir);
        const partialFill = (this.playerElixir - fullSlots) * 100;
        
        // Update elixir counter number
        const elixirCurrentEl = document.getElementById('elixirCurrent');
        if (elixirCurrentEl) {
            elixirCurrentEl.textContent = fullSlots;
        }
        
        // Update elixir slots
        const slots = document.querySelectorAll('.elixir-slot');
        slots.forEach((slot, index) => {
            const slotNum = index + 1;
            const liquid = slot.querySelector('.elixir-liquid');
            
            if (slotNum <= fullSlots) {
                // Full slot
                slot.classList.add('full');
                slot.classList.remove('filling');
                if (liquid) liquid.style.height = '100%';
            } else if (slotNum === fullSlots + 1 && partialFill > 0) {
                // Partially filling slot
                slot.classList.remove('full');
                slot.classList.add('filling');
                if (liquid) liquid.style.height = partialFill + '%';
            } else {
                // Empty slot
                slot.classList.remove('full', 'filling');
                if (liquid) liquid.style.height = '0%';
            }
        });
        
        // Update progress bar for partial elixir
        const progressEl = document.getElementById('elixirProgress');
        if (progressEl) {
            progressEl.style.width = partialFill + '%';
        }
        
        // Max elixir effect
        const elixirTray = document.querySelector('.elixir-tray');
        if (elixirTray) {
            if (this.playerElixir >= config.elixir.max) {
                elixirTray.classList.add('max-elixir');
            } else {
                elixirTray.classList.remove('max-elixir');
            }
            
            // Double elixir mode
            if (this.gameTime <= config.game.doubleElixirTime) {
                elixirTray.classList.add('double-elixir');
            } else {
                elixirTray.classList.remove('double-elixir');
            }
        }
        
        // Timer
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Crowns
        document.getElementById('playerCrowns').textContent = this.playerCrowns;
        document.getElementById('enemyCrowns').textContent = this.enemyCrowns;
        
        // Card availability
        document.querySelectorAll('.card:not(.mini)').forEach(card => {
            const cost = parseInt(card.dataset.cost);
            if (this.playerElixir < cost) {
                card.classList.add('disabled');
            } else {
                card.classList.remove('disabled');
            }
        });
    }
}

// Start game
window.addEventListener('load', () => {
    new Game();
});
