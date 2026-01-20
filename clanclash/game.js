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
        name: 'Mini P.E.K.K.A',
        emoji: '🤖',
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
        this.towers = this.initTowers();
        
        // Card system
        this.deck = ['knight', 'archer', 'giant', 'hogrider', 'minipekka', 'wizard', 'fireball', 'arrows'];
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
        const headerHeight = header ? header.offsetHeight : 70;
        const deckHeight = cardDeck ? cardDeck.offsetHeight : 200;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - headerHeight - deckHeight;
        
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
    
    shuffleDeck() {
        // Initialize hand with 4 cards
        const shuffled = [...this.deck].sort(() => Math.random() - 0.5);
        this.hand = shuffled.slice(0, 4);
        this.nextCard = shuffled[4];
        this.deckIndex = 5;
    }
    
    drawCard() {
        if (this.deckIndex >= this.deck.length) {
            this.deckIndex = 0;
        }
        const card = this.nextCard;
        this.nextCard = this.deck[this.deckIndex];
        this.deckIndex++;
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
                cardEl.querySelector('.card-cost').textContent = template.cost || 4;
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
            
            // Only allow deployment on player's side (left half + a bit)
            if (x < config.bridge.x + 50) {
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
            
            this.deploymentPreview = { x, y, valid: x < config.bridge.x + 50 };
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
        const unit = {
            ...template,
            x,
            y,
            team,
            maxHp: template.hp,
            currentHp: template.hp,
            target: null,
            lastAttack: 0,
            size: 30,
            id: Math.random()
        };
        this.units.push(unit);
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
            radius: 200,
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
        // Damage units
        this.units.forEach(unit => {
            if (unit.team === targetTeam) {
                const dist = Math.hypot(unit.x - x, unit.y - y);
                if (dist < radius) {
                    unit.currentHp -= damage;
                    this.stats.damageDealt += Math.min(damage, unit.currentHp);
                    this.particleSystem.emit(unit.x, unit.y, 5, { color: 'rgb(255, 0, 0)', speed: 2 });
                }
            }
        });
        
        // Damage towers
        this.towers.forEach(tower => {
            if (tower.team === targetTeam && !tower.destroyed) {
                const dist = Math.hypot((tower.x + tower.width/2) - x, (tower.y + tower.height/2) - y);
                if (dist < radius) {
                    tower.hp -= damage;
                    this.stats.damageDealt += Math.min(damage, tower.hp);
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
        
        // Generate elixir
        this.elixirTimer += deltaTime;
        if (this.elixirTimer >= this.elixirRegenRate) {
            this.elixirTimer = 0;
            if (this.playerElixir < config.elixir.max) {
                this.playerElixir++;
            }
            if (this.enemyElixir < config.elixir.max) {
                this.enemyElixir++;
            }
        }
        
        // Update systems
        this.updateUnits(deltaTime);
        this.updateTowers(now);
        this.updateProjectiles(deltaTime);
        this.updateEffects(now);
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
        this.units = this.units.filter(unit => unit.currentHp > 0);
        
        this.units.forEach(unit => {
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
                    // Check if we need to cross the river via bridge
                    const moveData = this.calculateMovement(unit, unit.target.x, unit.target.y);
                    unit.x += moveData.dx * unit.speed;
                    unit.y += moveData.dy * unit.speed;
                } else {
                    // Attack
                    const now = Date.now();
                    if (now - unit.lastAttack >= unit.attackSpeed) {
                        unit.lastAttack = now;
                        this.attack(unit, unit.target);
                    }
                }
            } else {
                // Move towards enemy side - but use bridge pathfinding
                const targetX = unit.team === 'player' ? config.canvas.width : 0;
                if (Math.abs(unit.x - targetX) > 10) {
                    const moveData = this.calculateMovement(unit, targetX, unit.y);
                    unit.x += moveData.dx * unit.speed;
                    unit.y += moveData.dy * unit.speed;
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
            
            if (attacker.team === 'player') {
                this.stats.damageDealt += actualDamage;
            }
            
            this.particleSystem.emit(target.x, target.y, 5, { 
                color: 'rgb(255, 50, 50)', 
                speed: 2 
            });
        }
        
        // Splash damage
        if (attacker.splashRadius) {
            this.units.forEach(unit => {
                if (unit.team !== attacker.team && unit !== target) {
                    const dist = Math.hypot(unit.x - target.x, unit.y - target.y);
                    if (dist < attacker.splashRadius) {
                        unit.currentHp -= attacker.damage * 0.5;
                        this.particleSystem.emit(unit.x, unit.y, 3, { color: 'rgb(255, 100, 0)' });
                    }
                }
            });
        }
        
        // Create projectile for ranged units
        if (attacker.isRanged) {
            this.projectiles.push({
                x: attacker.x,
                y: attacker.y,
                targetX: target.x,
                targetY: target.y,
                speed: 8,
                color: attacker.emoji === '🧙' ? '#8b5cf6' : '#fbbf24'
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
        
        if (this.enemyAITimer < this.enemyAICooldown) return;
        this.enemyAITimer = 0;
        
        // Smart AI: Counter player units and pressure lanes
        const playerUnits = this.units.filter(u => u.team === 'player' && u.x > config.bridge.x - 200);
        
        if (playerUnits.length > 2 && this.enemyElixir >= 4) {
            // Defend with spell
            const targetUnit = playerUnits[0];
            const spells = ['fireball', 'arrows'];
            const spell = spells[Math.floor(Math.random() * spells.length)];
            
            if (spell === 'fireball' && this.enemyElixir >= 4) {
                this.enemyElixir -= 4;
                this.damageInRadius(targetUnit.x, targetUnit.y, 150, 500, 'player');
                this.effects.push({
                    type: 'explosion',
                    x: targetUnit.x,
                    y: targetUnit.y,
                    radius: 150,
                    lifetime: 500,
                    createdAt: Date.now()
                });
                this.particleSystem.emit(targetUnit.x, targetUnit.y, 30, { 
                    color: 'rgb(255, 100, 0)', 
                    speed: 5, 
                    lifetime: 60,
                    size: 5 
                });
                return;
            }
        }
        
        // Deploy units
        if (this.enemyElixir >= 4) {
            const availableUnits = Object.keys(unitTemplates).filter(
                key => unitTemplates[key].cost <= this.enemyElixir
            );
            
            if (availableUnits.length > 0) {
                const unitType = availableUnits[Math.floor(Math.random() * availableUnits.length)];
                const template = unitTemplates[unitType];
                
                if (this.enemyElixir >= template.cost) {
                    this.enemyElixir -= template.cost;
                    
                    // Choose lane (top or bottom) - spawn near bridge lanes
                    const bridgeIndex = Math.random() > 0.5 ? 0 : 1;
                    const targetBridge = this.bridges[bridgeIndex];
                    const x = config.canvas.width - 120;
                    const y = targetBridge.centerY + (Math.random() - 0.5) * 30;
                    
                    this.createUnit(template, x, y, 'enemy');
                    this.soundSystem.play('deploy');
                    this.particleSystem.emit(x, y, 10, { color: 'rgb(239, 68, 68)', speed: 3 });
                }
            }
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
            // Unit shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(unit.x + 2, unit.y + unit.size / 2 + 2, unit.size / 2, unit.size / 4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Unit body
            ctx.fillStyle = unit.team === 'player' ? '#60a5fa' : '#f87171';
            ctx.beginPath();
            ctx.arc(unit.x, unit.y, unit.size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Unit border
            ctx.strokeStyle = unit.team === 'player' ? '#1e40af' : '#991b1b';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Unit emoji
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(unit.emoji, unit.x, unit.y);
            
            // Health bar
            const healthPercent = unit.currentHp / unit.maxHp;
            const barWidth = 40;
            const barHeight = 5;
            const barX = unit.x - barWidth / 2;
            const barY = unit.y - unit.size / 2 - 10;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            ctx.fillStyle = healthPercent > 0.6 ? '#4ade80' : healthPercent > 0.3 ? '#fbbf24' : '#ef4444';
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        });
        
        // Draw projectiles
        this.projectiles.forEach(proj => {
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
    
    updateUI() {
        // Player elixir
        const elixirPercent = (this.playerElixir / config.elixir.max) * 100;
        document.getElementById('elixirFill').style.width = elixirPercent + '%';
        document.getElementById('elixirCount').textContent = Math.floor(this.playerElixir);
        
        // Enemy elixir
        const enemyElixirPercent = (this.enemyElixir / config.elixir.max) * 100;
        document.getElementById('enemyElixirFill').style.width = enemyElixirPercent + '%';
        document.getElementById('enemyElixirCount').textContent = Math.floor(this.enemyElixir);
        
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
