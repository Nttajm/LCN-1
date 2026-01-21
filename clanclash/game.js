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
    },
    grid: {
        cellSize: 50, // Size of each grid cell for building placement
        showOnHover: true // Show grid when hovering with a building selected
    }
};

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

// Shared templates (loaded via `shared-data.js`)
const unitTemplates = (window.ClanClashData && window.ClanClashData.unitTemplates) ? window.ClanClashData.unitTemplates : {};

// ===== ADVANCED ENEMY AI CONTROLLER =====
// Inspired by Clash Royale pro-level gameplay:
// - Proper elixir management and counting
// - Deck cycling with strategic card rotation
// - Push building and counter-push mechanics
// - Lane pressure and punishment plays
// - Defensive positioning and kiting
// - Spell value timing

class EnemyAIController {
    constructor(game) {
        this.game = game;
        
        // AI Deck (curated balanced deck)
        this.deck = this.createDeck();
        this.hand = [];
        this.nextCard = null;
        this.playedCards = [];
        this.availableCards = [];
        
        // Initialize hand
        this.initializeHand();
        
        // AI State Machine
        this.state = 'neutral'; // 'neutral', 'defending', 'pushing', 'counter-pushing', 'waiting'
        this.stateTimer = 0;
        
        // Decision timing (prevents spam)
        this.lastDecisionTime = 0;
        this.minDecisionInterval = 800; // Min ms between decisions
        this.thinkingTime = 0;
        this.reactionDelay = 300; // Simulate human reaction time
        
        // Elixir tracking
        this.estimatedPlayerElixir = 5;
        this.lastPlayerElixirUpdate = Date.now();
        this.elixirLeakThreshold = 9.5;
        
        // Push tracking
        this.currentPush = null;
        this.pushLane = null;
        this.pushStartTime = 0;
        
        // Memory and learning
        this.playerPatterns = {
            favoredLane: null,
            avgPushSize: 0,
            usesSpells: false,
            playStyle: 'unknown', // 'aggressive', 'defensive', 'balanced'
            lastCards: []
        };
        
        // Strategic constants
        this.SAFE_ELIXIR_THRESHOLD = 4;
        this.PUSH_ELIXIR_THRESHOLD = 7;
        this.PUNISH_WINDOW = 1500; // ms to punish after player deploys expensive card
        this.lastPlayerDeploy = { time: 0, cost: 0, lane: null };
    }
    
    createDeck() {
        // Create a balanced Clash Royale style deck
        // Structure: Win Condition, Tank/Mini-Tank, Splash, Air Defense, Swarm, Spell, Cycle, Flex
        const deckOptions = [
            // Hog Cycle style
            ['hogrider', 'knight', 'musketeer', 'valkyrie', 'skeleton', 'fireball', 'arrows', 'archer'],
            // Giant Beatdown
            ['giant', 'wizard', 'minipekka', 'musketeer', 'skeleton', 'fireball', 'arrows', 'knight'],
            // Golem Beatdown (late game)
            ['golem', 'witch', 'minipekka', 'dragon', 'skeleton', 'fireball', 'arrows', 'knight'],
            // PEKKA Bridge Spam
            ['pekka', 'hogrider', 'wizard', 'minipekka', 'skeleton', 'fireball', 'arrows', 'archer'],
            // Balanced Control
            ['knight', 'musketeer', 'valkyrie', 'dragon', 'barbarian', 'fireball', 'arrows', 'skeleton']
        ];
        
        // Pick a random deck archetype
        const selectedDeck = deckOptions[Math.floor(Math.random() * deckOptions.length)];
        
        // Validate all cards exist
        return selectedDeck.filter(card => unitTemplates[card] || card === 'fireball' || card === 'arrows');
    }
    
    initializeHand() {
        const shuffled = [...this.deck].sort(() => Math.random() - 0.5);
        this.hand = shuffled.slice(0, 4);
        this.nextCard = shuffled[4];
        this.availableCards = shuffled.slice(5);
        this.playedCards = [];
    }
    
    cycleCard(playedCardId) {
        // Add played card to the cycle queue
        this.playedCards.push(playedCardId);
        
        // Remove from hand
        const index = this.hand.indexOf(playedCardId);
        if (index > -1) {
            // Replace with next card
            this.hand[index] = this.nextCard;
            
            // Find new next card
            if (this.availableCards.length > 0) {
                this.nextCard = this.availableCards.shift();
            } else if (this.playedCards.length > 0) {
                this.nextCard = this.playedCards.shift();
            }
        }
    }
    
    getAffordableCards() {
        return this.hand.filter(cardId => {
            const template = unitTemplates[cardId];
            return template && template.cost <= this.game.enemyElixir;
        });
    }
    
    getCardByRole(role) {
        return this.hand.find(cardId => {
            const template = unitTemplates[cardId];
            return template && template.role === role && template.cost <= this.game.enemyElixir;
        });
    }
    
    getCheapestCard() {
        let cheapest = null;
        let cheapestCost = Infinity;
        
        for (const cardId of this.hand) {
            const template = unitTemplates[cardId];
            if (template && template.cost < cheapestCost && template.cost <= this.game.enemyElixir) {
                cheapest = cardId;
                cheapestCost = template.cost;
            }
        }
        return cheapest;
    }
    
    // Main AI update - called every frame
    update(deltaTime) {
        const now = Date.now();
        
        // Update estimated player elixir (simulate elixir counting)
        this.updatePlayerElixirEstimate(deltaTime);
        
        // Add thinking time (prevents instant reactions)
        this.thinkingTime += deltaTime;
        
        // Minimum decision interval to prevent spam
        if (now - this.lastDecisionTime < this.minDecisionInterval) {
            return;
        }
        
        // State machine update
        this.updateState();
        
        // Analyze current situation
        const situation = this.analyzeSituation();
        
        // Make decision based on state and situation
        const decision = this.makeDecision(situation);
        
        if (decision && this.thinkingTime >= this.reactionDelay) {
            this.executeDecision(decision, situation);
            this.lastDecisionTime = now;
            this.thinkingTime = 0;
        }
    }
    
    updatePlayerElixirEstimate(deltaTime) {
        // Estimate player's current elixir
        const elixirPerSecond = this.game.gameTime <= 60 ? 2.8 : 1.4; // Double elixir in last minute
        const secondsPassed = deltaTime / 1000;
        
        this.estimatedPlayerElixir = Math.min(10, this.estimatedPlayerElixir + elixirPerSecond * secondsPassed);
    }
    
    trackPlayerDeploy(unit) {
        // Called when player deploys a unit
        const cost = unit.cost || 3;
        this.estimatedPlayerElixir = Math.max(0, this.estimatedPlayerElixir - cost);
        
        this.lastPlayerDeploy = {
            time: Date.now(),
            cost: cost,
            lane: unit.y < config.canvas.height / 2 ? 'top' : 'bottom'
        };
        
        this.playerPatterns.lastCards.push(unit.type);
        if (this.playerPatterns.lastCards.length > 8) {
            this.playerPatterns.lastCards.shift();
        }
        
        // Update play style detection
        if (cost >= 5) {
            this.playerPatterns.playStyle = 'heavy';
        }
    }
    
    updateState() {
        const situation = this.analyzeSituation();
        
        // State transitions
        switch(this.state) {
            case 'neutral':
                if (situation.underHeavyAttack) {
                    this.state = 'defending';
                } else if (this.game.enemyElixir >= this.PUSH_ELIXIR_THRESHOLD && !situation.underAttack) {
                    this.state = 'pushing';
                    this.pushLane = situation.weakerPlayerLane;
                }
                break;
                
            case 'defending':
                if (!situation.underAttack && situation.hasDefendersAlive) {
                    this.state = 'counter-pushing';
                } else if (!situation.underAttack) {
                    this.state = 'neutral';
                }
                break;
                
            case 'pushing':
                if (situation.underHeavyAttack) {
                    this.state = 'defending';
                    this.currentPush = null;
                } else if (situation.pushComplete) {
                    this.state = 'neutral';
                    this.currentPush = null;
                }
                break;
                
            case 'counter-pushing':
                if (situation.underHeavyAttack) {
                    this.state = 'defending';
                } else if (!situation.hasDefendersAlive) {
                    this.state = 'neutral';
                }
                break;
                
            case 'waiting':
                // Wait for elixir
                if (this.game.enemyElixir >= this.SAFE_ELIXIR_THRESHOLD) {
                    this.state = 'neutral';
                }
                break;
        }
    }
    
    analyzeSituation() {
        const game = this.game;
        const playerUnits = game.units.filter(u => u.team === 'player');
        const enemyUnits = game.units.filter(u => u.team === 'enemy');
        
        // River is in the middle
        const riverX = config.bridge.x;
        
        // Units threatening enemy territory
        const threateningUnits = playerUnits.filter(u => u.x > riverX - 100);
        const unitsNearTowers = playerUnits.filter(u => u.x > riverX + 100);
        
        // Lane analysis
        const canvasHeight = config.canvas.height;
        const topLane = threateningUnits.filter(u => u.y < canvasHeight * 0.4);
        const bottomLane = threateningUnits.filter(u => u.y > canvasHeight * 0.6);
        
        // Tower analysis
        const enemyTowers = game.towers.filter(t => t.team === 'enemy' && !t.destroyed);
        const playerTowers = game.towers.filter(t => t.team === 'player' && !t.destroyed);
        
        // Find weakest player tower (our target)
        const weakestPlayerTower = playerTowers
            .filter(t => !t.id.includes('king'))
            .reduce((w, t) => (!w || t.hp < w.hp) ? t : w, null);
        
        // Surviving defenders that can counter-push
        const defenders = enemyUnits.filter(u => 
            u.x > riverX && 
            u.currentHp > u.hp * 0.4 &&
            !u.targetBuildings
        );
        
        // Calculate threat levels
        const topThreat = this.calculateThreatLevel(topLane);
        const bottomThreat = this.calculateThreatLevel(bottomLane);
        const totalThreat = topThreat + bottomThreat;
        
        // Cluster analysis for spells
        const spellableCluster = this.findBestSpellTarget(playerUnits);
        
        // Check for punish opportunity
        const now = Date.now();
        const punishWindow = now - this.lastPlayerDeploy.time < this.PUNISH_WINDOW;
        const canPunish = punishWindow && 
                         this.lastPlayerDeploy.cost >= 4 && 
                         this.game.enemyElixir >= 4;
        
        return {
            playerUnits,
            enemyUnits,
            threateningUnits,
            unitsNearTowers,
            topLane,
            bottomLane,
            topThreat,
            bottomThreat,
            totalThreat,
            mostDangerousLane: topThreat > bottomThreat ? 'top' : 'bottom',
            weakerPlayerLane: weakestPlayerTower?.id.includes('top') ? 'top' : 'bottom',
            underAttack: threateningUnits.length > 0,
            underHeavyAttack: totalThreat > 800 || threateningUnits.length >= 3,
            towerEmergency: unitsNearTowers.length > 0 && enemyTowers.some(t => t.hp < 800),
            hasDefendersAlive: defenders.length > 0,
            defenders,
            spellableCluster,
            canPunish,
            punishLane: this.lastPlayerDeploy.lane === 'top' ? 'bottom' : 'top',
            elixirAdvantage: this.game.enemyElixir - this.estimatedPlayerElixir,
            pushComplete: this.currentPush && enemyUnits.filter(u => u.x < riverX).length === 0,
            shouldWait: this.game.enemyElixir < 3
        };
    }
    
    calculateThreatLevel(units) {
        return units.reduce((total, unit) => {
            let threat = (unit.damage || 100) * ((unit.currentHp || unit.hp) / (unit.hp || 1));
            if (unit.targetBuildings) threat *= 2; // Building targeters are most dangerous
            if (unit.fast) threat *= 1.5;
            if (unit.isAir) threat *= 1.3;
            if (unit.splashRadius) threat *= 0.8; // Splash less threatening single target
            return total + threat;
        }, 0);
    }
    
    findBestSpellTarget(units) {
        if (units.length < 2) return null;
        
        const clusterRadius = 120;
        let bestCluster = null;
        let bestValue = 0;
        
        for (const unit of units) {
            const nearby = units.filter(u => 
                u !== unit && Math.hypot(u.x - unit.x, u.y - unit.y) < clusterRadius
            );
            
            if (nearby.length >= 1) {
                const allUnits = [unit, ...nearby];
                const totalValue = allUnits.reduce((sum, u) => sum + (u.cost || 3), 0);
                
                // Extra value if any unit would die to fireball
                const wouldKill = allUnits.filter(u => (u.currentHp || u.hp) <= 500).length;
                const adjustedValue = totalValue + wouldKill * 2;
                
                if (adjustedValue > bestValue) {
                    bestValue = adjustedValue;
                    bestCluster = {
                        units: allUnits,
                        value: adjustedValue,
                        centerX: allUnits.reduce((s, u) => s + u.x, 0) / allUnits.length,
                        centerY: allUnits.reduce((s, u) => s + u.y, 0) / allUnits.length,
                        wouldKill
                    };
                }
            }
        }
        
        return bestCluster;
    }
    
    makeDecision(situation) {
        // Priority-based decision making (like real CR)
        
        // PRIORITY 1: Emergency defense - tower about to die
        if (situation.towerEmergency) {
            return { type: 'emergency_defense', priority: 10 };
        }
        
        // PRIORITY 2: Elixir leak prevention
        if (this.game.enemyElixir >= this.elixirLeakThreshold && !situation.underAttack) {
            return { type: 'prevent_leak', priority: 9 };
        }
        
        // PRIORITY 3: High value spell opportunity
        if (situation.spellableCluster && situation.spellableCluster.value >= 5) {
            return { type: 'spell_value', priority: 8 };
        }
        
        // PRIORITY 4: Counter push (most efficient way to attack)
        if (this.state === 'counter-pushing' && situation.hasDefendersAlive) {
            return { type: 'counter_push', priority: 7 };
        }
        
        // PRIORITY 5: Defend
        if (situation.underAttack && this.game.enemyElixir >= 2) {
            return { type: 'defend', priority: 6 };
        }
        
        // PRIORITY 6: Punish opposite lane
        if (situation.canPunish && !situation.underAttack) {
            return { type: 'punish', priority: 5 };
        }
        
        // PRIORITY 7: Build push from back
        if (this.state === 'pushing' || 
            (this.game.enemyElixir >= this.PUSH_ELIXIR_THRESHOLD && !situation.underAttack)) {
            return { type: 'build_push', priority: 4 };
        }
        
        // PRIORITY 8: Light pressure
        if (this.game.enemyElixir >= 5 && !situation.underAttack && 
            situation.elixirAdvantage >= 2) {
            return { type: 'pressure', priority: 3 };
        }
        
        // PRIORITY 9: Wait and save elixir
        return { type: 'wait', priority: 0 };
    }
    
    executeDecision(decision, situation) {
        switch (decision.type) {
            case 'emergency_defense':
                this.executeEmergencyDefense(situation);
                break;
            case 'prevent_leak':
                this.executePreventLeak(situation);
                break;
            case 'spell_value':
                this.executeSpellValue(situation);
                break;
            case 'counter_push':
                this.executeCounterPush(situation);
                break;
            case 'defend':
                this.executeDefend(situation);
                break;
            case 'punish':
                this.executePunish(situation);
                break;
            case 'build_push':
                this.executeBuildPush(situation);
                break;
            case 'pressure':
                this.executePressure(situation);
                break;
            case 'wait':
                // Do nothing - save elixir
                break;
        }
    }
    
    executeEmergencyDefense(situation) {
        const lane = situation.mostDangerousLane;
        const threats = lane === 'top' ? situation.topLane : situation.bottomLane;
        
        if (threats.length === 0) return;
        
        // Find best counter in hand
        const COUNTER_MAP = window.ClanClashData?.COUNTER_MAP || {};
        const mainThreat = threats[0];
        
        // Try counters first
        if (mainThreat?.type && COUNTER_MAP[mainThreat.type]) {
            for (const counter of COUNTER_MAP[mainThreat.type]) {
                if (this.hand.includes(counter)) {
                    const template = unitTemplates[counter];
                    if (template && template.cost <= this.game.enemyElixir) {
                        this.deployCard(counter, lane, 'defense');
                        return;
                    }
                }
            }
        }
        
        // Fallback to cheapest defensive option
        const cheapest = this.getCheapestCard();
        if (cheapest) {
            this.deployCard(cheapest, lane, 'defense');
        }
    }
    
    executePreventLeak(situation) {
        // Deploy something useful to not leak elixir
        // Prefer starting a push from the back
        const tanks = this.hand.filter(c => {
            const t = unitTemplates[c];
            return t && (t.role === 'tank' || t.hp > 2000) && t.cost <= this.game.enemyElixir;
        });
        
        if (tanks.length > 0) {
            this.deployCard(tanks[0], situation.weakerPlayerLane, 'back');
            this.state = 'pushing';
            this.pushLane = situation.weakerPlayerLane;
        } else {
            // Deploy any available card at the bridge for pressure
            const available = this.getAffordableCards();
            if (available.length > 0) {
                this.deployCard(available[0], situation.weakerPlayerLane, 'bridge');
            }
        }
    }
    
    executeSpellValue(situation) {
        const cluster = situation.spellableCluster;
        if (!cluster) return;
        
        const fireball = unitTemplates.fireball;
        const arrows = unitTemplates.arrows;
        
        // Try fireball first for high value
        if (cluster.value >= 5 && this.hand.includes('fireball') && 
            this.game.enemyElixir >= (fireball?.cost || 4)) {
            this.castSpell('fireball', cluster.centerX, cluster.centerY);
            return;
        }
        
        // Use arrows for swarms
        if (cluster.units.some(u => u.spawnsMultiple || u.hp < 300) && 
            this.hand.includes('arrows') && 
            this.game.enemyElixir >= (arrows?.cost || 3)) {
            this.castSpell('arrows', cluster.centerX, cluster.centerY);
        }
    }
    
    executeCounterPush(situation) {
        if (situation.defenders.length === 0) return;
        
        // Determine lane based on defenders
        const avgY = situation.defenders.reduce((s, d) => s + d.y, 0) / situation.defenders.length;
        const lane = avgY < config.canvas.height / 2 ? 'top' : 'bottom';
        
        // Check what we need
        const hasTank = situation.defenders.some(d => d.role === 'tank' || d.hp > 1500);
        const hasSplash = situation.defenders.some(d => d.splashRadius);
        const hasRanged = situation.defenders.some(d => d.isRanged);
        
        // Add what's missing
        let cardToPlay = null;
        
        if (!hasTank) {
            // Add tank in front
            cardToPlay = this.hand.find(c => {
                const t = unitTemplates[c];
                return t && (t.role === 'tank' || t.role === 'miniTank') && t.cost <= this.game.enemyElixir;
            });
        } else if (!hasRanged) {
            // Add ranged DPS behind
            cardToPlay = this.hand.find(c => {
                const t = unitTemplates[c];
                return t && t.isRanged && t.cost <= this.game.enemyElixir;
            });
        } else if (!hasSplash) {
            // Add splash
            cardToPlay = this.hand.find(c => {
                const t = unitTemplates[c];
                return t && t.splashRadius && t.cost <= this.game.enemyElixir;
            });
        }
        
        if (cardToPlay) {
            this.deployCard(cardToPlay, lane, 'support');
        }
    }
    
    executeDefend(situation) {
        const lane = situation.mostDangerousLane;
        const threats = lane === 'top' ? situation.topLane : situation.bottomLane;
        
        if (threats.length === 0) return;
        
        // Analyze threat composition
        const hasAir = threats.some(t => t.isAir);
        const hasTank = threats.some(t => t.hp > 2000);
        const hasSwarm = threats.some(t => t.spawnsMultiple) || threats.length >= 3;
        const hasBuildingTargeter = threats.some(t => t.targetBuildings);
        
        // Select appropriate counter
        let cardToPlay = null;
        
        if (hasBuildingTargeter && hasTank) {
            // High DPS for building-targeting tanks
            cardToPlay = this.hand.find(c => {
                const t = unitTemplates[c];
                return t && (c === 'minipekka' || c === 'pekka' || t.damage > 300) && 
                       t.cost <= this.game.enemyElixir;
            });
        } else if (hasSwarm) {
            // Splash damage
            cardToPlay = this.hand.find(c => {
                const t = unitTemplates[c];
                return t && t.splashRadius && t.cost <= this.game.enemyElixir;
            });
            // Or use arrows spell
            if (!cardToPlay && this.hand.includes('arrows') && this.game.enemyElixir >= 3) {
                const avgX = threats.reduce((s, t) => s + t.x, 0) / threats.length;
                const avgY = threats.reduce((s, t) => s + t.y, 0) / threats.length;
                this.castSpell('arrows', avgX, avgY);
                return;
            }
        } else if (hasAir) {
            // Air targeting
            cardToPlay = this.hand.find(c => {
                const t = unitTemplates[c];
                return t && t.canTargetAir && t.cost <= this.game.enemyElixir;
            });
        } else if (hasTank) {
            // Swarm or high DPS for tanks
            cardToPlay = this.hand.find(c => {
                const t = unitTemplates[c];
                return t && (t.spawnsMultiple || t.damage > 300) && t.cost <= this.game.enemyElixir;
            });
        }
        
        // Fallback to best available defensive card
        if (!cardToPlay) {
            cardToPlay = this.hand.find(c => {
                const t = unitTemplates[c];
                return t && !t.targetBuildings && !t.isSpell && t.cost <= this.game.enemyElixir;
            });
        }
        
        if (cardToPlay) {
            this.deployCard(cardToPlay, lane, 'defense');
        }
    }
    
    executePunish(situation) {
        // Punish opposite lane with fast win condition
        const lane = situation.punishLane;
        
        const punishCards = ['hogrider', 'balloon', 'miner', 'minipekka', 'prince'];
        const cardToPlay = this.hand.find(c => 
            punishCards.includes(c) && 
            unitTemplates[c]?.cost <= this.game.enemyElixir
        );
        
        if (cardToPlay) {
            this.deployCard(cardToPlay, lane, 'attack');
        }
    }
    
    executeBuildPush(situation) {
        const lane = this.pushLane || situation.weakerPlayerLane;
        
        // Check if we already have units building
        const backUnits = this.game.units.filter(u => 
            u.team === 'enemy' && u.x > config.canvas.width - 150
        );
        
        if (backUnits.length === 0) {
            // Start with tank from back
            const tanks = ['golem', 'giant', 'pekka'].filter(c => 
                this.hand.includes(c) && unitTemplates[c]?.cost <= this.game.enemyElixir
            );
            
            if (tanks.length > 0) {
                // Golem only at 10 elixir
                const tank = (this.game.enemyElixir >= 10 && tanks.includes('golem')) 
                    ? 'golem' 
                    : tanks.find(t => t !== 'golem') || tanks[0];
                
                if (tank) {
                    this.deployCard(tank, lane, 'back');
                    this.currentPush = { tank, lane };
                    this.pushStartTime = Date.now();
                }
            }
        } else {
            // Add support behind tank
            const supports = ['wizard', 'witch', 'musketeer', 'dragon', 'archer'].filter(c =>
                this.hand.includes(c) && unitTemplates[c]?.cost <= this.game.enemyElixir
            );
            
            if (supports.length > 0) {
                this.deployCard(supports[0], lane, 'support');
            }
        }
    }
    
    executePressure(situation) {
        // Light pressure with win condition or cheap units
        const lane = Math.random() > 0.5 ? 'top' : 'bottom';
        
        const pressureCards = ['hogrider', 'miner', 'knight', 'minipekka'];
        const cardToPlay = this.hand.find(c => 
            pressureCards.includes(c) && 
            unitTemplates[c]?.cost <= this.game.enemyElixir
        );
        
        if (cardToPlay) {
            this.deployCard(cardToPlay, lane, 'attack');
        }
    }
    
    deployCard(cardId, lane, deployType) {
        const template = unitTemplates[cardId];
        if (!template || template.cost > this.game.enemyElixir) return false;
        
        // Spend elixir
        this.game.enemyElixir -= template.cost;
        
        // Calculate position
        const bridgeIndex = lane === 'top' ? 0 : 1;
        const targetBridge = this.game.bridges[bridgeIndex];
        
        let x, y;
        
        switch(deployType) {
            case 'defense':
                // Close to tower for defense
                x = config.canvas.width - 80;
                y = targetBridge.centerY + (Math.random() - 0.5) * 50;
                break;
            case 'back':
                // Behind king tower for big pushes
                x = config.canvas.width - 40;
                y = targetBridge.centerY;
                break;
            case 'support':
                // Behind existing units
                const allyUnits = this.game.units.filter(u => u.team === 'enemy');
                if (allyUnits.length > 0) {
                    const frontUnit = allyUnits.reduce((f, u) => u.x < f.x ? u : f, allyUnits[0]);
                    x = Math.min(frontUnit.x + 60, config.canvas.width - 80);
                    y = frontUnit.y + (Math.random() - 0.5) * 30;
                } else {
                    x = config.canvas.width - 100;
                    y = targetBridge.centerY;
                }
                break;
            case 'bridge':
                // At the bridge for immediate attack
                x = targetBridge.centerX + 60;
                y = targetBridge.centerY + (Math.random() - 0.5) * 40;
                break;
            case 'attack':
            default:
                // Slightly behind bridge
                x = config.canvas.width - 100;
                y = targetBridge.centerY + (Math.random() - 0.5) * 30;
                break;
        }
        
        // Create the unit
        this.game.createUnit(template, x, y, 'enemy');
        
        // Cycle the card
        this.cycleCard(cardId);
        
        // Effects
        this.game.particleSystem.emit(x, y, 8, { color: 'rgb(239, 68, 68)', speed: 2 });
        
        return true;
    }
    
    castSpell(spellId, x, y) {
        const template = unitTemplates[spellId];
        if (!template || template.cost > this.game.enemyElixir) return false;
        if (!this.hand.includes(spellId)) return false;
        
        this.game.enemyElixir -= template.cost;
        
        // Apply spell damage
        const radius = template.radius || (spellId === 'fireball' ? 150 : 200);
        const damage = template.damage || (spellId === 'fireball' ? 572 : 303);
        
        this.game.damageInRadius(x, y, radius, damage, 'player');
        this.game.createSpellEffect(spellId, x, y);
        
        // Cycle the card
        this.cycleCard(spellId);
        
        return true;
    }
}

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
        
        // Card system - load deck from localStorage or use default
        this.allCards = (window.ClanClashData && window.ClanClashData.cardIds)
            ? [...window.ClanClashData.cardIds]
            : ['knight', 'archer', 'giant', 'hogrider', 'minipekka', 'wizard', 'fireball', 'arrows'];
        
        // Placed buildings array
        this.buildings = [];
        this.deck = this.loadDeckFromStorage(); // Load player's saved deck
        this.hand = [];
        this.nextCard = null;
        this.shuffleDeck();
        
        // Card selection
        this.selectedCard = null;
        this.deploymentPreview = null;
        
        // Elixir generation
        this.elixirTimer = 0;
        this.elixirRegenRate = config.elixir.regenRate;
        
        // Advanced Enemy AI System
        this.enemyAI = new EnemyAIController(this);
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
    
    // Load deck from localStorage or use default/random
    loadDeckFromStorage() {
        const saved = localStorage.getItem('clanclash_deck');
        if (saved) {
            try {
                const deck = JSON.parse(saved);
                // Validate deck - must be array of 8 valid cards
                if (Array.isArray(deck) && deck.length === 8 && 
                    deck.every(c => unitTemplates[c] || c === 'fireball' || c === 'arrows')) {
                    console.log('Loaded deck from storage:', deck);
                    return deck;
                }
            } catch (e) {
                console.error('Error loading deck:', e);
            }
        }
        // Fall back to random deck if no valid saved deck
        return this.selectRandomDeck(8);
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
        // Track cards that have been played and are waiting to cycle back
        this.playedCards = [];
    }
    
    drawCard() {
        // The card that will replace the played card in hand
        const newHandCard = this.nextCard;
        
        // Find the next card to queue up (must not be in hand or the card we're adding)
        // First check available cards
        let foundNext = false;
        
        if (this.availableCards.length > 0) {
            // Find a card from available that's not in the current hand
            for (let i = 0; i < this.availableCards.length; i++) {
                const candidate = this.availableCards[i];
                // Make sure this card won't create a duplicate
                if (!this.hand.includes(candidate) && candidate !== newHandCard) {
                    this.nextCard = candidate;
                    this.availableCards.splice(i, 1);
                    foundNext = true;
                    break;
                }
            }
        }
        
        // If no valid card found in available, pull from played cards (cycle)
        if (!foundNext && this.playedCards.length > 0) {
            for (let i = 0; i < this.playedCards.length; i++) {
                const candidate = this.playedCards[i];
                if (!this.hand.includes(candidate) && candidate !== newHandCard) {
                    this.nextCard = candidate;
                    this.playedCards.splice(i, 1);
                    foundNext = true;
                    break;
                }
            }
        }
        
        // Fallback: if still no card found, just take any from played
        if (!foundNext && this.playedCards.length > 0) {
            this.nextCard = this.playedCards.shift();
        }
        
        return newHandCard;
    }
    
    // Called when a card is actually played - adds it to the cycle queue
    onCardPlayed(cardId) {
        this.playedCards.push(cardId);
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
            let x = ((e.clientX - rect.left) / rect.width) * config.canvas.width;
            let y = ((e.clientY - rect.top) / rect.height) * config.canvas.height;
            
            const template = unitTemplates[this.selectedCard.type];
            const isBuilding = template && template.isBuilding;
            const isSpell = template && template.isSpell;
            
            // Snap to grid for buildings
            if (isBuilding) {
                const snapped = this.snapToGrid(x, y);
                x = snapped.x;
                y = snapped.y;
            }
            
            // Miners can be deployed anywhere (they tunnel), other units only on player's side
            const isMiner = this.selectedCard.type === 'miner';
            let isValidPosition = isMiner || isSpell || x < config.bridge.x + 50;
            
            // Additional check for buildings - can't overlap other buildings
            if (isBuilding && isValidPosition) {
                isValidPosition = !this.isBuildingOverlap(x, y);
            }
            
            if (isValidPosition) {
                this.deployUnit(this.selectedCard.type, x, y, 'player');
                
                // Add played card to the cycle queue, then draw replacement
                const playedCardId = this.hand[this.selectedCard.index];
                this.onCardPlayed(playedCardId);
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
            let x = ((e.clientX - rect.left) / rect.width) * config.canvas.width;
            let y = ((e.clientY - rect.top) / rect.height) * config.canvas.height;
            
            const template = unitTemplates[this.selectedCard.type];
            const isBuilding = template && template.isBuilding;
            const isSpell = template && template.isSpell;
            
            // Snap to grid for buildings
            if (isBuilding) {
                const snapped = this.snapToGrid(x, y);
                x = snapped.x;
                y = snapped.y;
            }
            
            // Miners can be deployed anywhere (they tunnel to enemy territory)
            const isMiner = this.selectedCard && this.selectedCard.type === 'miner';
            let valid = isMiner || isSpell || x < config.bridge.x + 50;
            
            // Additional check for buildings - can't overlap other buildings
            if (isBuilding && valid) {
                valid = !this.isBuildingOverlap(x, y);
            }
            
            this.deploymentPreview = { x, y, valid, isBuilding };
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
            return;
        }
        
        if (unitType === 'arrows') {
            this.castArrows(x, y);
            return;
        }
        
        const template = unitTemplates[unitType];
        if (!template) return;
        
        // Handle building deployment
        if (template.isBuilding) {
            if (team === 'player' && this.playerElixir >= template.cost) {
                this.playerElixir -= template.cost;
                this.createBuilding(template, x, y, team);
                this.particleSystem.emit(x, y, 15, { color: 'rgb(150, 100, 50)', speed: 4 });
            }
            return;
        }
        
        if (team === 'player' && this.playerElixir >= template.cost) {
            this.playerElixir -= template.cost;
            this.createUnit(template, x, y, team);
            this.particleSystem.emit(x, y, 10, { color: 'rgb(102, 126, 234)', speed: 3 });
        }
    }
    
    // Snap position to grid for building placement
    snapToGrid(x, y) {
        const cellSize = config.grid.cellSize;
        const snappedX = Math.round(x / cellSize) * cellSize;
        const snappedY = Math.round(y / cellSize) * cellSize;
        return { x: snappedX, y: snappedY };
    }
    
    // Check if building would overlap with existing buildings
    isBuildingOverlap(x, y) {
        const minDistance = config.grid.cellSize * 1.2; // Minimum distance between buildings
        for (const building of this.buildings) {
            const dist = Math.hypot(building.x - x, building.y - y);
            if (dist < minDistance) {
                return true;
            }
        }
        return false;
    }
    
    // Create a placed building
    createBuilding(template, x, y, team) {
        const building = {
            ...template,
            x,
            y,
            team,
            maxHp: template.hp,
            currentHp: template.hp,
            target: null,
            lastAttack: 0,
            lastSpawn: Date.now(),
            size: 55,
            id: Math.random(),
            createdAt: Date.now(),
            lifetime: template.lifetime || 30000,
            hidden: template.hidden || false,
            isHiding: false,
            infernoTarget: null,
            infernoDamageStack: 0
        };
        this.buildings.push(building);
    }
    
    // Update placed buildings (lifetime, attacks, spawns)
    updateBuildings(now, deltaTime) {
        // Remove expired or destroyed buildings
        this.buildings = this.buildings.filter(building => {
            const age = now - building.createdAt;
            
            // Check lifetime expiration
            if (age >= building.lifetime) {
                this.onBuildingDestroyed(building, 'expired');
                return false;
            }
            
            // Check HP
            if (building.currentHp <= 0) {
                this.onBuildingDestroyed(building, 'destroyed');
                return false;
            }
            
            return true;
        });
        
        // Update each building
        this.buildings.forEach(building => {
            // Spawner buildings (Tombstone, Goblin Hut)
            if (building.spawnsSkeletons || building.spawnsGoblins) {
                if (now - building.lastSpawn >= building.attackSpeed) {
                    building.lastSpawn = now;
                    this.spawnFromBuilding(building);
                }
            }
            
            // Attack buildings (Cannon, Tesla, Inferno Tower, Bomb Tower)
            if (building.damage > 0) {
                // Tesla hiding logic
                if (building.hidden) {
                    const hasTarget = this.findBuildingTarget(building);
                    building.isHiding = !hasTarget;
                }
                
                // Find and attack targets
                if (!building.isHiding) {
                    const target = this.findBuildingTarget(building);
                    if (target && now - building.lastAttack >= building.attackSpeed) {
                        building.lastAttack = now;
                        this.buildingAttack(building, target);
                    }
                }
            }
        });
    }
    
    // Find target for a building
    findBuildingTarget(building) {
        let closestTarget = null;
        let closestDistance = building.range;
        
        this.units.forEach(unit => {
            if (unit.team !== building.team) {
                // Check if building can target this unit type
                if (unit.isAir && !building.targetAir) return;
                
                const dist = Math.hypot(unit.x - building.x, unit.y - building.y);
                if (dist < closestDistance) {
                    closestDistance = dist;
                    closestTarget = unit;
                }
            }
        });
        
        return closestTarget;
    }
    
    // Building attacks a target
    buildingAttack(building, target) {
        
        let damage = building.damage;
        
        // Inferno Tower ramping damage
        if (building.infernoDamage) {
            if (building.infernoTarget === target.id) {
                building.infernoDamageStack = Math.min(building.infernoDamageStack + 1, 20);
                damage = building.damage * (1 + building.infernoDamageStack * 0.5);
            } else {
                building.infernoTarget = target.id;
                building.infernoDamageStack = 0;
            }
        }
        
        const actualDamage = Math.min(damage, target.currentHp);
        target.currentHp -= damage;
        
        if (building.team === 'player') {
            this.stats.damageDealt += actualDamage;
        }
        
        // Show damage number
        this.createDamageNumber(target.x, target.y, actualDamage, building.team);
        
        // Splash damage (Bomb Tower)
        if (building.splashRadius) {
            this.units.forEach(unit => {
                if (unit.team !== building.team && unit !== target) {
                    const dist = Math.hypot(unit.x - target.x, unit.y - target.y);
                    if (dist < building.splashRadius) {
                        const splashDamage = Math.min(damage * 0.5, unit.currentHp);
                        unit.currentHp -= splashDamage;
                        this.createDamageNumber(unit.x, unit.y, splashDamage, building.team);
                    }
                }
            });
        }
        
        // Create projectile visual
        this.projectiles.push({
            x: building.x,
            y: building.y,
            targetX: target.x,
            targetY: target.y,
            speed: 10,
            color: building.infernoDamage ? '#FF4500' : building.splashRadius ? '#8B4513' : building.hidden ? '#FFD700' : '#808080'
        });
        
        this.particleSystem.emit(target.x, target.y, 5, {
            color: building.infernoDamage ? 'rgb(255, 69, 0)' : 'rgb(255, 150, 50)',
            speed: 2
        });
    }
    
    // Spawn units from spawner buildings
    spawnFromBuilding(building) {
        if (building.spawnsSkeletons) {
            const skeletonTemplate = unitTemplates.skeleton;
            const spawnX = building.x + (Math.random() - 0.5) * 40;
            const spawnY = building.y + 40;
            
            // Create a single skeleton
            const skeleton = {
                ...skeletonTemplate,
                type: 'skeleton',
                x: spawnX,
                y: spawnY,
                team: building.team,
                maxHp: skeletonTemplate.hp,
                currentHp: skeletonTemplate.hp,
                target: null,
                lastAttack: 0,
                size: 28,
                id: Math.random(),
                hitCount: 1,
                role: skeletonTemplate.role || 'swarm',
                aggroPriority: skeletonTemplate.aggroPriority || 0
            };
            this.units.push(skeleton);
            this.particleSystem.emit(spawnX, spawnY, 5, { color: 'rgb(200, 200, 200)', speed: 2 });
        }
        
        if (building.spawnsGoblins) {
            // Create a spear goblin-like unit
            const spawnX = building.x + (Math.random() - 0.5) * 40;
            const spawnY = building.y + 40;
            
            const goblin = {
                name: 'Spear Goblin',
                emoji: '🦝',
                type: 'speargoblin',
                hp: 100,
                damage: 50,
                speed: 1.8,
                range: 180,
                attackSpeed: 1000,
                isRanged: true,
                isGround: true,
                targetBuildings: false,
                x: spawnX,
                y: spawnY,
                team: building.team,
                maxHp: 100,
                currentHp: 100,
                target: null,
                lastAttack: 0,
                size: 30,
                id: Math.random(),
                hitCount: 1,
                role: 'swarm',
                aggroPriority: 0,
                canTargetAir: true
            };
            this.units.push(goblin);
            this.particleSystem.emit(spawnX, spawnY, 5, { color: 'rgb(100, 200, 100)', speed: 2 });
        }
    }
    
    // Handle building destruction
    onBuildingDestroyed(building, reason) {
        this.particleSystem.emit(building.x, building.y, 20, {
            color: 'rgb(150, 100, 50)',
            speed: 4,
            lifetime: 40
        });
        
        // Death effects
        if (building.deathDamage) {
            // Bomb Tower explosion
            this.damageInRadius(building.x, building.y, 150, building.deathDamage, 
                building.team === 'player' ? 'enemy' : 'player');
        }
        
        if (building.spawnsSkeletons && building.skeletonSpawnCount) {
            // Tombstone spawns skeletons on death
            for (let i = 0; i < building.skeletonSpawnCount; i++) {
                const skeletonTemplate = unitTemplates.skeleton;
                const angle = (Math.PI * 2 * i) / building.skeletonSpawnCount;
                const spawnX = building.x + Math.cos(angle) * 30;
                const spawnY = building.y + Math.sin(angle) * 30;
                
                const skeleton = {
                    ...skeletonTemplate,
                    x: spawnX,
                    y: spawnY,
                    team: building.team,
                    maxHp: skeletonTemplate.hp,
                    currentHp: skeletonTemplate.hp,
                    target: null,
                    lastAttack: 0,
                    size: 28,
                    id: Math.random(),
                    hitCount: 1
                };
                this.units.push(skeleton);
            }
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
        const template = unitTemplates.fireball;
        const cost = template?.cost ?? 4;
        const damage = template?.damage ?? 572;
        const radius = template?.radius ?? 150;

        if (this.playerElixir < cost) return;
        this.playerElixir -= cost;
        
        // Create explosion effect
        this.effects.push({
            type: 'explosion',
            x, y,
            radius,
            damage,
            lifetime: 500,
            createdAt: Date.now()
        });
        
        this.particleSystem.emit(x, y, 30, { 
            color: 'rgb(255, 100, 0)', 
            speed: 5, 
            lifetime: 60,
            size: 5 
        });
        
        this.damageInRadius(x, y, radius, damage, 'enemy');
    }
    
    castArrows(x, y) {
        const template = unitTemplates.arrows;
        const cost = template?.cost ?? 3;
        const damage = template?.damage ?? 303;
        const radius = template?.radius ?? 200;

        if (this.playerElixir < cost) return;
        this.playerElixir -= cost;
        
        // Create arrow storm effect
        this.effects.push({
            type: 'arrows',
            x, y,
            radius,
            damage,
            lifetime: 600,
            createdAt: Date.now()
        });
        
        this.particleSystem.emit(x, y, 20, { 
            color: 'rgb(150, 150, 150)', 
            speed: 4, 
            lifetime: 50,
            size: 3 
        });
        
        this.damageInRadius(x, y, radius, damage, 'enemy');
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
        
        // Damage placed buildings (Cannon, Tesla, etc.)
        this.buildings.forEach(building => {
            if (building.team === targetTeam) {
                const dist = Math.hypot(building.x - x, building.y - y);
                if (dist < radius) {
                    const actualDamage = Math.min(damage, building.currentHp);
                    building.currentHp -= damage;
                    this.stats.damageDealt += actualDamage;
                    // Show damage number
                    this.createDamageNumber(building.x, building.y, actualDamage, attackerTeam);
                    this.particleSystem.emit(building.x, building.y, 8, { 
                        color: 'rgb(150, 100, 50)', 
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
        this.updateBuildings(now, deltaTime);
        this.updateTowers(now);
        this.updateProjectiles(deltaTime);
        this.updateEffects(now);
        this.updateDamageNumbers(deltaTime);
        this.particleSystem.update(deltaTime);
        
        // Advanced Enemy AI
        this.enemyAI.update(deltaTime);
        
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
                        targetBuildings: true, // Golemites also target buildings like Golem
                        hitCount: 1,
                        x: golemiteX,
                        y: golemiteY,
                        team: unit.team,
                        maxHp: 800,
                        currentHp: 800,
                        target: null,
                        lastAttack: 0,
                        size: 25,
                        id: Math.random(),
                        deathDamage: 100, // Golemites also do death damage
                        role: 'tank',
                        aggroPriority: 3
                    };
                    this.units.push(golemite);
                    this.particleSystem.emit(golemiteX, golemiteY, 10, { 
                        color: 'rgb(128, 128, 128)', 
                        speed: 2 
                    });
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
    
    // Clash Royale authentic targeting system
    // Key mechanics:
    // 1. Building-targeting units (Giant, Golem, Hog, Balloon, Miner) COMPLETELY IGNORE troops
    // 2. Units target the closest enemy (with air-targeting checks)
    // 3. Tanks have higher aggroPriority, so they get targeted first when in range
    // 4. Ground-only units cannot target air units
    // 5. Retargeting happens when current target dies or moves out of range
    
    findTarget(unit) {
        let bestTarget = null;
        let bestScore = Infinity;
        
        const canAttackTarget = (attacker, target) => {
            // Check air targeting
            if (target.isAir && !attacker.canTargetAir && !attacker.isAir) {
                // Ground units that can't target air skip air targets
                // Unless it's a spell-like unit or has canTargetAir
                const template = unitTemplates[attacker.type];
                if (template && !template.canTargetAir && !attacker.isRanged) {
                    return false;
                }
                // Ranged units typically can target air (archer, musketeer, wizard)
                if (!attacker.isRanged) return false;
            }
            return true;
        };
        
        // ===== BUILDING-TARGETING UNITS =====
        // These units COMPLETELY ignore enemy troops - go straight for buildings/towers
        if (unit.targetBuildings) {
            // First check player-placed buildings (Tesla, Cannon, etc.) - they pull aggro!
            this.buildings.forEach(building => {
                if (building.team !== unit.team) {
                    const dist = Math.hypot(building.x - unit.x, building.y - unit.y);
                    // Buildings have highest priority for building-targeters
                    if (dist < bestScore) {
                        bestScore = dist;
                        bestTarget = {
                            x: building.x,
                            y: building.y,
                            currentHp: building.currentHp,
                            isPlacedBuilding: true,
                            buildingRef: building
                        };
                    }
                }
            });
            
            // Then check towers if no building is closer
            this.towers.forEach(tower => {
                if (tower.team !== unit.team && !tower.destroyed) {
                    const towerCenterX = tower.x + tower.width / 2;
                    const towerCenterY = tower.y + tower.height / 2;
                    const dist = Math.hypot(towerCenterX - unit.x, towerCenterY - unit.y);
                    
                    if (dist < bestScore) {
                        bestScore = dist;
                        bestTarget = {
                            x: towerCenterX,
                            y: towerCenterY,
                            currentHp: tower.hp,
                            isTower: true,
                            towerRef: tower
                        };
                    }
                }
            });
            
            return bestTarget;
        }
        
        // ===== NORMAL UNITS (target troops, then buildings, then towers) =====
        
        // Priority 1: Enemy troops (with aggro priority consideration)
        this.units.forEach(other => {
            if (other.team !== unit.team && other.currentHp > 0) {
                // Check if this unit can attack the target
                if (!canAttackTarget(unit, other)) return;
                
                const dist = Math.hypot(other.x - unit.x, other.y - unit.y);
                
                // Only consider targets within aggro range (range + detection radius)
                if (dist > unit.range + 300) return;
                
                // Score based on distance, but tanks (higher aggroPriority) attract more attention
                // Lower score = higher priority target
                const aggroPriority = other.aggroPriority || 1;
                // Tanks are preferred targets (subtract their priority from score)
                const score = dist - (aggroPriority * 20);
                
                if (score < bestScore) {
                    bestScore = score;
                    bestTarget = other;
                }
            }
        });
        
        // If we found a troop target, return it
        if (bestTarget) return bestTarget;
        
        // Priority 2: Placed buildings (if no troops in range)
        this.buildings.forEach(building => {
            if (building.team !== unit.team) {
                const dist = Math.hypot(building.x - unit.x, building.y - unit.y);
                if (dist < bestScore) {
                    bestScore = dist;
                    bestTarget = {
                        x: building.x,
                        y: building.y,
                        currentHp: building.currentHp,
                        isPlacedBuilding: true,
                        buildingRef: building
                    };
                }
            }
        });
        
        // Priority 3: Towers (if no troops or buildings)
        this.towers.forEach(tower => {
            if (tower.team !== unit.team && !tower.destroyed) {
                const towerCenterX = tower.x + tower.width / 2;
                const towerCenterY = tower.y + tower.height / 2;
                const dist = Math.hypot(towerCenterX - unit.x, towerCenterY - unit.y);
                
                if (dist < bestScore) {
                    bestScore = dist;
                    bestTarget = {
                        x: towerCenterX,
                        y: towerCenterY,
                        currentHp: tower.hp,
                        isTower: true,
                        towerRef: tower
                    };
                }
            }
        });
        
        return bestTarget;
    }
    
    attack(attacker, target) {
        
        // Apply reduced tower damage for certain units (like Miner in real CR)
        let damage = attacker.damage;
        if (target.isTower && attacker.reducedTowerDamage) {
            damage = Math.floor(damage * attacker.reducedTowerDamage);
        }
        
        // Inferno tower ramping damage
        if (attacker.infernoDamage && attacker.infernoTarget === target) {
            attacker.infernoDamageLevel = Math.min((attacker.infernoDamageLevel || 1) * 1.15, 16);
            damage = Math.floor(attacker.damage * attacker.infernoDamageLevel);
        } else if (attacker.infernoDamage) {
            // Reset inferno on new target
            attacker.infernoTarget = target;
            attacker.infernoDamageLevel = 1;
        }
        
        if (target.isTower) {
            target.towerRef.hp -= damage;
            this.stats.damageDealt += damage;
            
            // Show damage number
            this.createDamageNumber(target.x, target.y, damage, attacker.team);
            
            if (target.towerRef.hp <= 0) {
                target.towerRef.destroyed = true;
                this.onTowerDestroyed(target.towerRef);
            }
            
            this.particleSystem.emit(target.x, target.y, 8, { 
                color: 'rgb(255, 150, 0)', 
                speed: 3 
            });
        } else if (target.isPlacedBuilding) {
            // Attacking a placed building (Cannon, Tesla, etc.)
            const actualDamage = Math.min(attacker.damage, target.buildingRef.currentHp);
            target.buildingRef.currentHp -= attacker.damage;
            
            // Show damage number
            this.createDamageNumber(target.x, target.y, actualDamage, attacker.team);
            
            if (attacker.team === 'player') {
                this.stats.damageDealt += actualDamage;
            }
            
            this.particleSystem.emit(target.x, target.y, 8, { 
                color: 'rgb(150, 100, 50)', 
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
        // Player side (left - soft green floor)
        const gradient1 = ctx.createLinearGradient(0, 0, this.riverX - this.riverWidth/2, 0);
        gradient1.addColorStop(0, '#4a7a5a');
        gradient1.addColorStop(0.5, '#5a8a6a');
        gradient1.addColorStop(1, '#6a9a7a');
        ctx.fillStyle = gradient1;
        ctx.fillRect(0, 0, this.riverX - this.riverWidth/2, config.canvas.height);
        
        // Enemy side (right - soft warm floor)
        const gradient2 = ctx.createLinearGradient(this.riverX + this.riverWidth/2, 0, config.canvas.width, 0);
        gradient2.addColorStop(0, '#7a6a5a');
        gradient2.addColorStop(0.5, '#8a7560');
        gradient2.addColorStop(1, '#9a8570');
        ctx.fillStyle = gradient2;
        ctx.fillRect(this.riverX + this.riverWidth/2, 0, config.canvas.width / 2, config.canvas.height);
        
        // Draw checkered floor pattern (matches grid)
        this.drawCheckeredFloor(ctx, 0, 0, this.riverX - this.riverWidth/2, config.canvas.height, 'player');
        this.drawCheckeredFloor(ctx, this.riverX + this.riverWidth/2, 0, config.canvas.width / 2, config.canvas.height, 'enemy');
        
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
        
        // Draw placed buildings
        this.buildings.forEach(building => {
            this.drawBuilding(ctx, building);
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
            const isBuilding = this.deploymentPreview.isBuilding;
            
            // Draw grid overlay for building placement
            if (isBuilding) {
                this.drawPlacementGrid(ctx);
            }
            
            // Draw placement indicator
            if (isBuilding) {
                // Square indicator for buildings
                const size = config.grid.cellSize;
                ctx.strokeStyle = this.deploymentPreview.valid ? '#4ade80' : '#ef4444';
                ctx.lineWidth = 4;
                ctx.setLineDash([8, 8]);
                ctx.strokeRect(
                    this.deploymentPreview.x - size/2,
                    this.deploymentPreview.y - size/2,
                    size, size
                );
                ctx.setLineDash([]);
                
                // Building base preview
                ctx.fillStyle = this.deploymentPreview.valid ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)';
                ctx.fillRect(
                    this.deploymentPreview.x - size/2,
                    this.deploymentPreview.y - size/2,
                    size, size
                );
            } else {
                // Circle indicator for units
                ctx.strokeStyle = this.deploymentPreview.valid ? '#4ade80' : '#ef4444';
                ctx.lineWidth = 4;
                ctx.setLineDash([8, 8]);
                ctx.beginPath();
                ctx.arc(this.deploymentPreview.x, this.deploymentPreview.y, 35, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            
            // Range indicator
            if (this.selectedCard && unitTemplates[this.selectedCard.type]) {
                const template = unitTemplates[this.selectedCard.type];
                if (template.range > 0) {
                    ctx.strokeStyle = `rgba(102, 126, 234, 0.3)`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(this.deploymentPreview.x, this.deploymentPreview.y, template.range, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    // Fill range area lightly
                    ctx.fillStyle = `rgba(102, 126, 234, 0.1)`;
                    ctx.fill();
                }
            }
        }
    }
    
    // Draw grid overlay for building placement
    drawPlacementGrid(ctx) {
        const cellSize = config.grid.cellSize;
        const maxX = config.bridge.x + 50; // Player's side only
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = cellSize; x < maxX; x += cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, config.canvas.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = cellSize; y < config.canvas.height; y += cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(maxX, y);
            ctx.stroke();
        }
        
        // Highlight grid cells near existing buildings
        ctx.fillStyle = 'rgba(255, 100, 100, 0.2)';
        this.buildings.forEach(building => {
            if (building.team === 'player') {
                const cellX = Math.round(building.x / cellSize) * cellSize - cellSize/2;
                const cellY = Math.round(building.y / cellSize) * cellSize - cellSize/2;
                ctx.fillRect(cellX, cellY, cellSize, cellSize);
            }
        });
    }
    
    // Draw a placed building
    drawBuilding(ctx, building) {
        const size = building.size || 55;
        const now = Date.now();
        const age = now - building.createdAt;
        const remainingLife = building.lifetime - age;
        const lifePercent = remainingLife / building.lifetime;
        
        ctx.save();
        
        // Tesla hiding effect
        if (building.isHiding) {
            ctx.globalAlpha = 0.4;
        }
        
        // Building base shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(building.x + 3, building.y + size/2, size/2, size/4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Building base platform
        const baseGradient = ctx.createLinearGradient(building.x - size/2, building.y, building.x + size/2, building.y);
        baseGradient.addColorStop(0, '#5D4037');
        baseGradient.addColorStop(0.5, '#8D6E63');
        baseGradient.addColorStop(1, '#5D4037');
        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.ellipse(building.x, building.y + size/3, size/2, size/4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Building body
        const bodyGradient = ctx.createRadialGradient(
            building.x - size/6, building.y - size/4, 0,
            building.x, building.y, size/2
        );
        
        // Color based on building type
        let mainColor, highlightColor, shadowColor;
        if (building.infernoDamage) {
            mainColor = '#C62828';
            highlightColor = '#FF5252';
            shadowColor = '#7F0000';
        } else if (building.hidden) {
            mainColor = '#FFC107';
            highlightColor = '#FFE082';
            shadowColor = '#FF8F00';
        } else if (building.spawnsSkeletons) {
            mainColor = '#616161';
            highlightColor = '#9E9E9E';
            shadowColor = '#212121';
        } else if (building.spawnsGoblins) {
            mainColor = '#2E7D32';
            highlightColor = '#66BB6A';
            shadowColor = '#1B5E20';
        } else if (building.splashRadius) {
            mainColor = '#5D4037';
            highlightColor = '#8D6E63';
            shadowColor = '#3E2723';
        } else {
            mainColor = '#455A64';
            highlightColor = '#78909C';
            shadowColor = '#263238';
        }
        
        bodyGradient.addColorStop(0, highlightColor);
        bodyGradient.addColorStop(0.5, mainColor);
        bodyGradient.addColorStop(1, shadowColor);
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(building.x, building.y - 5, size/2.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Team indicator ring
        ctx.strokeStyle = building.team === 'player' ? '#3B82F6' : '#EF4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(building.x, building.y - 5, size/2.2 + 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // Building emoji
        ctx.font = `${size * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillText(building.emoji, building.x + 1, building.y - 3);
        ctx.fillStyle = '#FFF';
        ctx.fillText(building.emoji, building.x, building.y - 5);
        
        ctx.globalAlpha = 1.0;
        
        // Health bar
        const healthPercent = building.currentHp / building.maxHp;
        const barWidth = size * 1.2;
        const barHeight = 6;
        const barX = building.x - barWidth/2;
        const barY = building.y - size/2 - 20;
        
        // Health bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.roundRect(ctx, barX - 1, barY - 1, barWidth + 2, barHeight + 2, 3);
        ctx.fill();
        
        // Health bar fill
        const healthColor = healthPercent > 0.6 ? '#22C55E' : healthPercent > 0.3 ? '#EAB308' : '#EF4444';
        ctx.fillStyle = healthColor;
        if (healthPercent > 0) {
            this.roundRect(ctx, barX, barY, barWidth * healthPercent, barHeight, 3);
            ctx.fill();
        }
        
        // Health bar border
        ctx.strokeStyle = building.team === 'player' ? '#1E40AF' : '#991B1B';
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, barX, barY, barWidth, barHeight, 3);
        ctx.stroke();
        
        // Lifetime timer bar (below health)
        const timerBarY = barY + barHeight + 3;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, timerBarY, barWidth, 3);
        ctx.fillStyle = lifePercent > 0.3 ? '#60A5FA' : '#F87171';
        ctx.fillRect(barX, timerBarY, barWidth * lifePercent, 3);
        
        // Inferno beam effect when attacking
        if (building.infernoDamage && building.infernoDamageStack > 0) {
            const target = this.units.find(u => u.id === building.infernoTarget);
            if (target) {
                const beamWidth = 2 + building.infernoDamageStack * 0.5;
                const gradient = ctx.createLinearGradient(building.x, building.y, target.x, target.y);
                gradient.addColorStop(0, '#FF4500');
                gradient.addColorStop(0.5, '#FF6347');
                gradient.addColorStop(1, '#FFD700');
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = beamWidth;
                ctx.beginPath();
                ctx.moveTo(building.x, building.y - 5);
                ctx.lineTo(target.x, target.y);
                ctx.stroke();
                
                // Glow effect
                ctx.strokeStyle = 'rgba(255, 100, 0, 0.3)';
                ctx.lineWidth = beamWidth + 4;
                ctx.beginPath();
                ctx.moveTo(building.x, building.y - 5);
                ctx.lineTo(target.x, target.y);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
    
    // Draw checkered floor pattern that matches the grid
    drawCheckeredFloor(ctx, startX, startY, width, height, team) {
        const cellSize = config.grid.cellSize;
        
        // Light and slightly lighter colors for checkered pattern
        let color1, color2;
        if (team === 'player') {
            // Soft green tones for player side
            color1 = 'rgba(85, 140, 95, 0.4)';
            color2 = 'rgba(100, 160, 110, 0.4)';
        } else {
            // Soft warm tones for enemy side
            color1 = 'rgba(140, 100, 85, 0.4)';
            color2 = 'rgba(160, 115, 95, 0.4)';
        }
        
        const cols = Math.ceil(width / cellSize) + 1;
        const rows = Math.ceil(height / cellSize) + 1;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = startX + col * cellSize;
                const y = startY + row * cellSize;
                
                // Alternate colors in a checkered pattern
                const isLight = (row + col) % 2 === 0;
                ctx.fillStyle = isLight ? color1 : color2;
                
                // Draw the cell
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
        
        // Add subtle grid lines
        ctx.strokeStyle = team === 'player' ? 'rgba(70, 120, 80, 0.25)' : 'rgba(120, 85, 70, 0.25)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let col = 0; col <= cols; col++) {
            const x = startX + col * cellSize;
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, startY + height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let row = 0; row <= rows; row++) {
            const y = startY + row * cellSize;
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(startX + width, y);
            ctx.stroke();
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
        const size = unit.size || 45;
        
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
        const size = unit.size || 45;
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
