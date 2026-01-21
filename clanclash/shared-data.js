// Shared data for ClanClash (used by both index.js and game.js)
// Exposes `window.ClanClashData` (no bundler required).
// Includes Clash Royale authentic unit roles, targeting priorities, and strategic properties.

(() => {
    if (window.ClanClashData) return;

    // Unit role definitions for strategic AI
    // - tank: High HP, draws aggro, protects support units
    // - winCondition: Primary tower damage dealer
    // - support: Ranged DPS, stays behind tanks
    // - swarm: Low cost, high count, surrounds enemies
    // - spell: Direct damage, area control
    // - building: Defensive structure, draws building-targeting units
    // - splasher: Counters swarms with area damage
    // - miniTank: Medium HP, can absorb some damage
    // - glassCannon: High damage, low HP

    const unitTemplates = {
        // ===== TROOPS =====
        // Stats based on Clash Royale Tournament Standard (Level 11)
        
        // Mini-Tank / Versatile Defender
        knight: {
            name: 'Knight',
            emoji: '⚔️',
            hp: 1452,         // CR: 1452
            damage: 167,      // CR: 167
            speed: 1.0,       // Medium
            range: 40,        // Melee: Medium
            attackSpeed: 1100, // CR: 1.1 sec
            cost: 3,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            // Strategy properties
            role: 'miniTank',
            aggroPriority: 3,
            canTargetAir: false,
            counterTo: ['skeleton', 'minipekka'],
            counteredBy: ['pekka', 'valkyrie', 'wizard']
        },
        
        // Ranged Support DPS
        archer: {
            name: 'Archer',
            emoji: '🏹',
            hp: 304,          // CR: 304 each
            damage: 107,      // CR: 107
            speed: 1.0,       // Medium
            range: 200,       // CR: 5 tiles = 200px
            attackSpeed: 1200, // CR: 1.2 sec
            cost: 3,
            isGround: true,
            targetBuildings: false,
            hitCount: 2,      // Spawns 2 archers
            spawnsMultiple: true,
            isRanged: true,
            role: 'support',
            aggroPriority: 1,
            canTargetAir: true,
            counterTo: ['balloon', 'skeleton'],
            counteredBy: ['valkyrie', 'wizard', 'arrows']
        },
        
        // Tank / Win Condition (Building Targeter)
        giant: {
            name: 'Giant',
            emoji: '🗿',
            hp: 3344,         // CR: 3344
            damage: 211,      // CR: 211
            speed: 0.6,       // Slow
            range: 40,        // Melee: Long
            attackSpeed: 1500, // CR: 1.5 sec
            cost: 5,
            isGround: true,
            targetBuildings: true,
            hitCount: 1,
            role: 'tank',
            aggroPriority: 5,
            canTargetAir: false,
            counterTo: [],
            counteredBy: ['minipekka', 'pekka', 'infernotower', 'skeleton']
        },
        
        // Fast Win Condition (Building Targeter)
        hogrider: {
            name: 'Hog Rider',
            emoji: '🐷',
            hp: 1696,         // CR: 1696
            damage: 264,      // CR: 264
            speed: 2.5,       // Very Fast
            range: 40,        // Melee: Long
            attackSpeed: 1600, // CR: 1.6 sec
            cost: 4,
            isGround: true,
            targetBuildings: true,
            hitCount: 1,
            fast: true,
            role: 'winCondition',
            aggroPriority: 4,
            canTargetAir: false,
            jumpsRiver: true,
            counterTo: [],
            counteredBy: ['cannon', 'tesla', 'tombstone', 'skeleton', 'barbarian']
        },
        
        // Glass Cannon / Tank Killer
        minipekka: {
            name: 'Mini P.E.K.K.A',
            emoji: '🥷',
            hp: 1129,         // CR: 1129
            damage: 598,      // CR: 598
            speed: 1.5,       // Fast
            range: 40,        // Melee: Medium
            attackSpeed: 1800, // CR: 1.8 sec
            cost: 4,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            heavyHitter: true,
            role: 'glassCannon',
            aggroPriority: 2,
            canTargetAir: false,
            counterTo: ['giant', 'golem', 'hogrider', 'knight'],
            counteredBy: ['skeleton', 'barbarian', 'witch']
        },
        
        // Support Splash (Ground + Air)
        wizard: {
            name: 'Wizard',
            emoji: '🧙',
            hp: 598,          // CR: 598
            damage: 234,      // CR: 234 (area)
            speed: 1.0,       // Medium
            range: 220,       // CR: 5.5 tiles
            attackSpeed: 1400, // CR: 1.4 sec
            cost: 5,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            isRanged: true,
            splashRadius: 60, // CR: 1.5 tiles
            role: 'splasher',
            aggroPriority: 1,
            canTargetAir: true,
            counterTo: ['barbarian', 'skeleton', 'witch', 'archer'],
            counteredBy: ['fireball', 'minipekka', 'miner']
        },
        
        // Flying Splash Support
        dragon: {
            name: 'Baby Dragon',
            emoji: '🐉',
            hp: 1152,         // CR: 1152
            damage: 160,      // CR: 160 (area)
            speed: 1.5,       // Fast
            range: 140,       // CR: 3.5 tiles
            attackSpeed: 1600, // CR: 1.6 sec
            cost: 4,
            isGround: false,
            isAir: true,
            targetBuildings: false,
            hitCount: 1,
            isRanged: true,
            splashRadius: 60,
            role: 'splasher',
            aggroPriority: 2,
            canTargetAir: true,
            counterTo: ['barbarian', 'skeleton', 'witch'],
            counteredBy: ['musketeer', 'tesla', 'wizard']
        },
        
        // Swarm / Tank Counter
        barbarian: {
            name: 'Barbarians',
            emoji: '🪓',
            hp: 670,          // CR: 670 each
            damage: 150,      // CR: 150
            speed: 1.0,       // Medium
            range: 40,        // Melee: Medium
            attackSpeed: 1400, // CR: 1.4 sec
            cost: 5,
            isGround: true,
            targetBuildings: false,
            hitCount: 4,      // 4 barbarians
            spawnsMultiple: true,
            role: 'swarm',
            aggroPriority: 1,
            canTargetAir: false,
            counterTo: ['giant', 'golem', 'pekka', 'hogrider'],
            counteredBy: ['wizard', 'valkyrie', 'fireball', 'dragon']
        },
        
        // Cheap Swarm / Cycle / Distraction
        skeleton: {
            name: 'Skeletons',
            emoji: '💀',
            hp: 81,           // CR: 81 each
            damage: 81,       // CR: 81
            speed: 1.5,       // Fast
            range: 40,        // Melee: Short
            attackSpeed: 1000, // CR: 1.0 sec
            cost: 1,
            isGround: true,
            targetBuildings: false,
            hitCount: 3,      // 3 skeletons
            spawnsMultiple: true,
            fast: true,
            role: 'swarm',
            aggroPriority: 0,
            canTargetAir: false,
            counterTo: ['minipekka', 'pekka', 'giant', 'hogrider'],
            counteredBy: ['valkyrie', 'wizard', 'arrows', 'dragon']
        },
        
        // High DPS Ranged Support
        musketeer: {
            name: 'Musketeer',
            emoji: '🔫',
            hp: 598,          // CR: 598
            damage: 181,      // CR: 181
            speed: 1.0,       // Medium
            range: 260,       // CR: 6.5 tiles (long range!)
            attackSpeed: 1100, // CR: 1.1 sec
            cost: 4,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            isRanged: true,
            role: 'support',
            aggroPriority: 1,
            canTargetAir: true,
            counterTo: ['balloon', 'dragon', 'giant'],
            counteredBy: ['fireball', 'minipekka', 'miner', 'knight']
        },
        
        // Heavy Tank Killer
        pekka: {
            name: 'P.E.K.K.A',
            emoji: '🛡️',
            hp: 3458,         // CR: 3458
            damage: 678,      // CR: 678
            speed: 0.6,       // Slow
            range: 50,        // Melee: Long
            attackSpeed: 1800, // CR: 1.8 sec
            cost: 7,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            heavyHitter: true,
            role: 'tank',
            aggroPriority: 5,
            canTargetAir: false,
            counterTo: ['giant', 'golem', 'knight', 'valkyrie'],
            counteredBy: ['skeleton', 'witch', 'barbarian']
        },
        
        // Massive Tank / Win Condition
        golem: {
            name: 'Golem',
            emoji: '🏔️',
            hp: 4256,         // CR: 4256
            damage: 259,      // CR: 259
            speed: 0.4,       // Slow
            range: 40,        // Melee: Medium
            attackSpeed: 2500, // CR: 2.5 sec
            cost: 8,
            isGround: true,
            targetBuildings: true,
            hitCount: 1,
            spawnsOnDeath: true,
            deathDamage: 259,  // CR: Same as attack
            role: 'tank',
            aggroPriority: 6,
            canTargetAir: false,
            counterTo: [],
            counteredBy: ['infernotower', 'minipekka', 'pekka', 'skeleton']
        },
        
        // Chip Damage / Tower Sniper
        miner: {
            name: 'Miner',
            emoji: '⛏️',
            hp: 1000,         // CR: 1000
            damage: 133,      // CR: 133
            speed: 1.5,       // Fast
            range: 40,        // Melee: Medium
            attackSpeed: 1200, // CR: 1.2 sec
            cost: 3,
            isGround: true,
            targetBuildings: true,
            hitCount: 1,
            tunneling: true,
            role: 'winCondition',
            aggroPriority: 3,
            canTargetAir: false,
            reducedTowerDamage: 0.35, // CR: 35% damage to towers
            counterTo: ['wizard', 'musketeer', 'witch'],
            counteredBy: ['knight', 'valkyrie', 'skeleton']
        },
        
        // Flying Win Condition
        balloon: {
            name: 'Balloon',
            emoji: '🎈',
            hp: 1396,         // CR: 1396
            damage: 798,      // CR: 798
            speed: 1.0,       // Medium
            range: 40,        // Melee: Close
            attackSpeed: 3000, // CR: 3.0 sec
            cost: 5,
            isGround: false,
            isAir: true,
            targetBuildings: true,
            hitCount: 1,
            deathDamage: 272,  // CR: 272
            role: 'winCondition',
            aggroPriority: 4,
            canTargetAir: false,
            counterTo: [],
            counteredBy: ['musketeer', 'wizard', 'tesla', 'archer']
        },
        
        // Spawner Support
        witch: {
            name: 'Witch',
            emoji: '🧪',
            hp: 696,          // CR: 696
            damage: 69,       // CR: 69 (single target)
            speed: 1.0,       // Medium
            range: 220,       // CR: 5.5 tiles
            attackSpeed: 1000, // CR: 1.0 sec
            cost: 5,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            isRanged: true,
            spawnsSkeleton: true,
            skeletonSpawnInterval: 7000, // CR: 7 sec
            role: 'support',
            aggroPriority: 1,
            canTargetAir: true, // CR: Witch CAN target air
            counterTo: ['pekka', 'minipekka', 'giant'],
            counteredBy: ['fireball', 'valkyrie', 'wizard', 'knight']
        },
        
        // Splash Mini-Tank
        valkyrie: {
            name: 'Valkyrie',
            emoji: '💃',
            hp: 1654,         // CR: 1654
            damage: 221,      // CR: 221 (area)
            speed: 1.0,       // Medium
            range: 50,        // Melee: Medium
            attackSpeed: 1500, // CR: 1.5 sec
            cost: 4,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            splashRadius: 80, // CR: 2 tiles
            threeSixtyAttack: true,
            role: 'miniTank',
            aggroPriority: 3,
            canTargetAir: false,
            counterTo: ['skeleton', 'barbarian', 'witch', 'archer'],
            counteredBy: ['minipekka', 'pekka', 'musketeer']
        },
        
        // ===== NEW UNITS =====
        // Stats based on Clash Royale Tournament Standard (Level 11)
        
        // Prince - Fast charge, high damage
        prince: {
            name: 'Prince',
            emoji: '🤴',
            hp: 1547,         // CR: 1547
            damage: 392,      // CR: 392
            speed: 1.5,       // Fast
            range: 40,        // Melee: Long
            attackSpeed: 1400, // CR: 1.4 sec
            cost: 5,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            role: 'glassCannon',
            aggroPriority: 2,
            canTargetAir: false,
            chargeAttack: true,
            chargeDamage: 784, // CR: 2x damage
            counterTo: ['giant', 'golem', 'knight'],
            counteredBy: ['skeleton', 'barbarian', 'tombstone']
        },
        
        // Dark Prince - Splash charging unit
        darkprince: {
            name: 'Dark Prince',
            emoji: '🦹',
            hp: 910,          // CR: 910
            damage: 194,      // CR: 194 (area)
            speed: 1.5,       // Fast
            range: 40,        // Melee: Medium
            attackSpeed: 1300, // CR: 1.3 sec
            cost: 4,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            splashRadius: 60,
            role: 'miniTank',
            aggroPriority: 3,
            canTargetAir: false,
            chargeAttack: true,
            hasShield: true,
            shieldHp: 227,    // CR: 227
            counterTo: ['skeleton', 'barbarian', 'archer'],
            counteredBy: ['minipekka', 'pekka']
        },
        
        // Electro Wizard - Stun + Chain lightning
        electrowizard: {
            name: 'Electro Wizard',
            emoji: '⚡',
            hp: 590,          // CR: 590
            damage: 182,      // CR: 182 (each bolt)
            speed: 1.0,       // Medium
            range: 220,       // CR: 5.5 tiles
            attackSpeed: 1700, // CR: 1.7 sec
            cost: 4,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            isRanged: true,
            role: 'support',
            aggroPriority: 1,
            canTargetAir: true,
            stunEffect: true,
            chainLightning: 2, // Hits 2 targets
            spawnDamage: 159, // Zap effect on spawn
            counterTo: ['infernotower', 'sparky', 'balloon'],
            counteredBy: ['fireball', 'knight', 'valkyrie']
        },
        
        // Ice Spirit - Cheap cycle + freeze
        icespirit: {
            name: 'Ice Spirit',
            emoji: '❄️',
            hp: 190,          // CR: 190
            damage: 91,       // CR: 91
            speed: 2.5,       // Very Fast
            range: 100,       // CR: 2.5 tiles jump
            attackSpeed: 1000,
            cost: 1,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            role: 'swarm',
            aggroPriority: 0,
            canTargetAir: true,
            freezeEffect: 1000, // 1 sec freeze
            jumpsToTarget: true,
            diesOnAttack: true,
            counterTo: ['minipekka', 'hogrider'],
            counteredBy: ['arrows', 'wizard']
        },
        
        // Fire Spirit - Cheap splash
        firespirit: {
            name: 'Fire Spirit',
            emoji: '🔥',
            hp: 190,          // CR: 190
            damage: 178,      // CR: 178 (area)
            speed: 2.5,       // Very Fast
            range: 100,       // Jump range
            attackSpeed: 1000,
            cost: 1,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            splashRadius: 80, // CR: 2 tiles
            role: 'swarm',
            aggroPriority: 0,
            canTargetAir: true,
            jumpsToTarget: true,
            diesOnAttack: true,
            counterTo: ['skeleton', 'barbarian'],
            counteredBy: ['knight', 'valkyrie']
        },
        
        // Minions - Flying swarm
        minions: {
            name: 'Minions',
            emoji: '👿',
            hp: 252,          // CR: 252 each
            damage: 84,       // CR: 84
            speed: 2.0,       // Fast
            range: 80,        // CR: 2 tiles
            attackSpeed: 1000, // CR: 1.0 sec
            cost: 3,
            isGround: false,
            isAir: true,
            targetBuildings: false,
            hitCount: 3,      // 3 minions
            spawnsMultiple: true,
            role: 'swarm',
            aggroPriority: 0,
            canTargetAir: true,
            counterTo: ['giant', 'golem', 'valkyrie'],
            counteredBy: ['arrows', 'wizard', 'musketeer']
        },
        
        // Mega Minion - Tanky flying unit
        megaminion: {
            name: 'Mega Minion',
            emoji: '😈',
            hp: 695,          // CR: 695
            damage: 258,      // CR: 258
            speed: 1.5,       // Fast
            range: 80,        // CR: 2 tiles
            attackSpeed: 1400, // CR: 1.4 sec
            cost: 3,
            isGround: false,
            isAir: true,
            targetBuildings: false,
            hitCount: 1,
            role: 'support',
            aggroPriority: 2,
            canTargetAir: true,
            counterTo: ['balloon', 'giant', 'golem'],
            counteredBy: ['musketeer', 'wizard', 'electrowizard']
        },
        
        // Goblin Gang - Mixed swarm
        goblingang: {
            name: 'Goblin Gang',
            emoji: '👺',
            hp: 202,          // CR: 202 (melee), 167 (spear)
            damage: 120,      // CR: 120 (melee), 81 (spear)
            speed: 2.0,       // Fast
            range: 40,
            attackSpeed: 1100, // CR: 1.1 sec
            cost: 3,
            isGround: true,
            targetBuildings: false,
            hitCount: 5,      // 3 stab + 2 spear
            spawnsMultiple: true,
            role: 'swarm',
            aggroPriority: 0,
            canTargetAir: false,
            counterTo: ['giant', 'hogrider', 'pekka'],
            counteredBy: ['arrows', 'valkyrie', 'wizard']
        },
        
        // Lumberjack - Fast rage dropper
        lumberjack: {
            name: 'Lumberjack',
            emoji: '🪓',
            hp: 1060,         // CR: 1060
            damage: 200,      // CR: 200
            speed: 2.0,       // Very Fast
            range: 40,        // Melee: Medium
            attackSpeed: 700,  // CR: 0.7 sec (very fast!)
            cost: 4,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            role: 'glassCannon',
            aggroPriority: 2,
            canTargetAir: false,
            dropsRageOnDeath: true,
            counterTo: ['giant', 'golem', 'balloon'],
            counteredBy: ['skeleton', 'witch', 'barbarian']
        },
        
        // Bandit - Dash attack, immune while dashing
        bandit: {
            name: 'Bandit',
            emoji: '🥷',
            hp: 780,          // CR: 780
            damage: 160,      // CR: 160 (320 dash)
            speed: 1.5,       // Fast
            range: 40,        // Melee: Medium
            attackSpeed: 1000, // CR: 1.0 sec
            cost: 3,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            role: 'glassCannon',
            aggroPriority: 2,
            canTargetAir: false,
            dashAttack: true,
            dashDamage: 320, // CR: 2x normal damage
            counterTo: ['musketeer', 'wizard', 'princess'],
            counteredBy: ['skeleton', 'knight', 'barbarian']
        },
        
        // Royal Giant - Ranged building targeter
        royalgiant: {
            name: 'Royal Giant',
            emoji: '🔫',
            hp: 3104,         // CR: 3104
            damage: 201,      // CR: 201
            speed: 0.6,       // Slow
            range: 220,       // CR: 5.5 tiles
            attackSpeed: 1700, // CR: 1.7 sec
            cost: 6,
            isGround: true,
            targetBuildings: true,
            hitCount: 1,
            isRanged: true,
            role: 'winCondition',
            aggroPriority: 5,
            canTargetAir: false,
            counterTo: [],
            counteredBy: ['minipekka', 'pekka', 'barbarian', 'infernotower']
        },
        
        // Elite Barbarians - Fast heavy hitters
        elitebarbarians: {
            name: 'Elite Barbarians',
            emoji: '⚔️',
            hp: 1010,         // CR: 1010 each
            damage: 254,      // CR: 254
            speed: 2.0,       // Very Fast
            range: 40,        // Melee: Medium
            attackSpeed: 1400, // CR: 1.4 sec
            cost: 6,
            isGround: true,
            targetBuildings: false,
            hitCount: 2,      // 2 elite barbs
            spawnsMultiple: true,
            role: 'winCondition',
            aggroPriority: 3,
            canTargetAir: false,
            counterTo: ['giant', 'golem', 'hogrider'],
            counteredBy: ['skeleton', 'barbarian', 'valkyrie']
        },

        // ===== SPELLS =====
        // Stats based on Clash Royale Tournament Standard (Level 11)
        
        // Zap spell
        zap: {
            name: 'Zap',
            emoji: '⚡',
            cost: 2,
            damage: 192,      // CR: 192
            radius: 100,      // CR: 2.5 tiles
            isSpell: true,
            role: 'spell',
            stunEffect: 500,  // CR: 0.5 sec stun
            towerDamage: 67,  // CR: 35% to towers
            valueThreshold: 2
        },
        
        // Log spell
        log: {
            name: 'The Log',
            emoji: '🪵',
            cost: 2,
            damage: 240,      // CR: 240
            radius: 160,      // CR: 4 tiles wide, 11 tiles long
            isSpell: true,
            role: 'spell',
            knockback: true,
            groundOnly: true,
            towerDamage: 84,  // CR: 35% to towers
            valueThreshold: 2
        },
        
        // Poison spell
        poison: {
            name: 'Poison',
            emoji: '☠️',
            cost: 4,
            damage: 90,       // CR: 90 per sec (720 total)
            duration: 8000,   // CR: 8 sec
            radius: 150,      // CR: 3.5 tiles
            isSpell: true,
            role: 'spell',
            slowEffect: 0.85, // No slow in current CR
            towerDamage: 32,  // Per sec to towers
            valueThreshold: 4
        },
        
        // Freeze spell
        freeze: {
            name: 'Freeze',
            emoji: '🧊',
            cost: 4,
            damage: 95,       // CR: 95
            duration: 4000,   // CR: 4 sec freeze
            radius: 120,      // CR: 3 tiles
            isSpell: true,
            role: 'spell',
            freezeEffect: true,
            towerDamage: 33,  // CR: 35% to towers
            valueThreshold: 4
        },
        
        // Rage spell
        rage: {
            name: 'Rage',
            emoji: '😤',
            cost: 2,
            damage: 0,
            duration: 7500,   // CR: 7.5 sec
            radius: 200,      // CR: 5 tiles
            isSpell: true,
            role: 'spell',
            speedBoost: 1.35, // CR: +35% speed
            attackBoost: 1.35, // CR: +35% attack speed
            valueThreshold: 0
        },

        // Fireball
        fireball: {
            name: 'Fireball',
            emoji: '🔥',
            cost: 4,
            damage: 572,      // CR: 572
            radius: 100,      // CR: 2.5 tiles
            isSpell: true,
            role: 'spell',
            towerDamage: 200, // CR: 35% to towers
            valueThreshold: 4
        },
        
        // Arrows
        arrows: {
            name: 'Arrows',
            emoji: '🏹',
            cost: 3,
            damage: 303,      // CR: 303
            radius: 160,      // CR: 4 tiles
            isSpell: true,
            role: 'spell',
            towerDamage: 106, // CR: 35% to towers
            valueThreshold: 3
        },

        // ===== BUILDINGS =====
        // Stats based on Clash Royale Tournament Standard (Level 11)
        
        // Ground-only Defense
        cannon: {
            name: 'Cannon',
            emoji: '🔩',
            hp: 742,          // CR: 742
            damage: 175,      // CR: 175
            speed: 0,
            range: 220,       // CR: 5.5 tiles
            attackSpeed: 800,  // CR: 0.8 sec
            cost: 3,
            isBuilding: true,
            isGround: true,
            targetAir: false,
            targetBuildings: false,
            hitCount: 1,
            lifetime: 30000,  // CR: 30 sec
            role: 'building',
            aggroPriority: 4,
            counterTo: ['hogrider', 'giant'],
            counteredBy: ['balloon', 'miner']
        },
        
        // Air+Ground Defense (Hidden until triggered)
        tesla: {
            name: 'Tesla',
            emoji: '⚡',
            hp: 954,          // CR: 954
            damage: 182,      // CR: 182
            speed: 0,
            range: 220,       // CR: 5.5 tiles
            attackSpeed: 1100, // CR: 1.1 sec
            cost: 4,
            isBuilding: true,
            isGround: true,
            targetAir: true,
            targetBuildings: false,
            hitCount: 1,
            lifetime: 35000,  // CR: 35 sec
            hidden: true,
            role: 'building',
            aggroPriority: 4,
            counterTo: ['hogrider', 'balloon', 'giant'],
            counteredBy: ['miner', 'golem']
        },
        
        // Tank Killer Defense
        infernotower: {
            name: 'Inferno Tower',
            emoji: '🔥',
            hp: 1452,         // CR: 1452
            damage: 43,       // CR: 43 starting (ramps to 430)
            speed: 0,
            range: 240,       // CR: 6 tiles
            attackSpeed: 400,  // CR: 0.4 sec per tick
            cost: 5,
            isBuilding: true,
            isGround: true,
            targetAir: true,
            targetBuildings: false,
            hitCount: 1,
            lifetime: 40000,  // CR: 40 sec
            infernoDamage: true,
            maxInfernoDamage: 430, // CR: 430 at max
            role: 'building',
            aggroPriority: 4,
            counterTo: ['golem', 'giant', 'pekka', 'balloon'],
            counteredBy: ['skeleton', 'barbarian']
        },
        
        // Splash Defense (Ground only)
        bombtower: {
            name: 'Bomb Tower',
            emoji: '💣',
            hp: 1126,         // CR: 1126
            damage: 184,      // CR: 184 (area)
            speed: 0,
            range: 240,       // CR: 6 tiles
            attackSpeed: 1600, // CR: 1.6 sec
            cost: 4,
            isBuilding: true,
            isGround: true,
            targetAir: false,
            targetBuildings: false,
            hitCount: 1,
            lifetime: 35000,  // CR: 35 sec
            splashRadius: 60, // CR: 1.5 tiles
            deathDamage: 184, // CR: Same as attack
            role: 'building',
            aggroPriority: 4,
            counterTo: ['barbarian', 'skeleton', 'knight'],
            counteredBy: ['balloon', 'dragon', 'miner']
        },
        
        // Spawner / Aggro Puller
        tombstone: {
            name: 'Tombstone',
            emoji: '🪦',
            hp: 511,          // CR: 511
            damage: 0,
            speed: 0,
            range: 0,
            attackSpeed: 2900, // CR: 2.9 sec spawn
            cost: 3,
            isBuilding: true,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            lifetime: 40000,  // CR: 40 sec
            spawnsSkeletons: true,
            skeletonSpawnCount: 4, // On death
            role: 'building',
            aggroPriority: 4,
            counterTo: ['giant', 'hogrider', 'pekka'],
            counteredBy: ['valkyrie', 'wizard', 'dragon']
        },
        
        // Spawner Building
        goblinhut: {
            name: 'Goblin Hut',
            emoji: '🛖',
            hp: 877,          // CR: 877
            damage: 0,
            speed: 0,
            range: 0,
            attackSpeed: 4900, // CR: 4.9 sec spawn
            cost: 5,
            isBuilding: true,
            isGround: true,
            targetBuildings: false,
            hitCount: 1,
            lifetime: 46000,  // CR: 46 sec (spawns ~9 goblins)
            spawnsGoblins: true,
            role: 'building',
            aggroPriority: 4,
            counterTo: [],
            counteredBy: ['fireball', 'miner', 'valkyrie']
        }
    };

    // Cards shown in the deck editor - includes role, type, and win condition info
    const cards = {
        // ===== TROOPS =====
        knight: { name: 'Knight', emoji: '⚔️', cost: 3, rarity: 'common', description: 'A tough melee fighter', type: 'Troop', role: 'Mini Tank', category: 'ground' },
        archer: { name: 'Archer', emoji: '🏹', cost: 3, rarity: 'common', description: 'Ranged attacker', type: 'Troop', role: 'Support', category: 'ground', spawnsMultiple: true },
        giant: { name: 'Giant', emoji: '🗿', cost: 5, rarity: 'rare', description: 'Targets buildings only', type: 'Troop', role: 'Tank', category: 'ground', isWinCondition: true },
        hogrider: { name: 'Hog Rider', emoji: '🐷', cost: 4, rarity: 'rare', description: 'Fast building targeter', type: 'Troop', role: 'Win Condition', category: 'ground', isWinCondition: true },
        minipekka: { name: 'Mini P.E.K.K.A', emoji: '🥷', cost: 4, rarity: 'rare', description: 'Heavy single-target damage', type: 'Troop', role: 'Glass Cannon', category: 'ground' },
        wizard: { name: 'Wizard', emoji: '🧙', cost: 5, rarity: 'epic', description: 'Splash damage dealer', type: 'Troop', role: 'Splasher', category: 'ground', targetAir: true },
        dragon: { name: 'Baby Dragon', emoji: '🐉', cost: 4, rarity: 'epic', description: 'Flying splash attacker', type: 'Troop', role: 'Splasher', category: 'air', targetAir: true },
        barbarian: { name: 'Barbarians', emoji: '🪓', cost: 5, rarity: 'common', description: 'Spawns 4 barbarians', type: 'Troop', role: 'Swarm', category: 'ground', spawnsMultiple: true },
        skeleton: { name: 'Skeletons', emoji: '💀', cost: 1, rarity: 'common', description: 'Cheap swarm unit', type: 'Troop', role: 'Cycle', category: 'ground', spawnsMultiple: true },
        musketeer: { name: 'Musketeer', emoji: '🔫', cost: 4, rarity: 'rare', description: 'Long-range shooter', type: 'Troop', role: 'Support', category: 'ground', targetAir: true },
        pekka: { name: 'P.E.K.K.A', emoji: '🛡️', cost: 7, rarity: 'epic', description: 'Heavy tank and damage', type: 'Troop', role: 'Tank Killer', category: 'ground' },
        golem: { name: 'Golem', emoji: '🏔️', cost: 8, rarity: 'epic', description: 'Massive tank', type: 'Troop', role: 'Tank', category: 'ground', isWinCondition: true },
        miner: { name: 'Miner', emoji: '⛏️', cost: 3, rarity: 'legendary', description: 'Tunnels anywhere', type: 'Troop', role: 'Win Condition', category: 'ground', isWinCondition: true },
        balloon: { name: 'Balloon', emoji: '🎈', cost: 5, rarity: 'epic', description: 'Flying building bomber', type: 'Troop', role: 'Win Condition', category: 'air', isWinCondition: true },
        witch: { name: 'Witch', emoji: '🧪', cost: 5, rarity: 'epic', description: 'Spawns skeletons', type: 'Troop', role: 'Support', category: 'ground' },
        valkyrie: { name: 'Valkyrie', emoji: '💃', cost: 4, rarity: 'rare', description: '360° splash attack', type: 'Troop', role: 'Mini Tank', category: 'ground' },
        
        // New troops
        prince: { name: 'Prince', emoji: '🤴', cost: 5, rarity: 'epic', description: 'Charge attack doubles damage', type: 'Troop', role: 'Glass Cannon', category: 'ground', isWinCondition: true },
        darkprince: { name: 'Dark Prince', emoji: '🦹', cost: 4, rarity: 'epic', description: 'Splash + shield + charge', type: 'Troop', role: 'Mini Tank', category: 'ground' },
        electrowizard: { name: 'Electro Wizard', emoji: '⚡', cost: 4, rarity: 'legendary', description: 'Stuns + spawn zap', type: 'Troop', role: 'Support', category: 'ground', targetAir: true },
        icespirit: { name: 'Ice Spirit', emoji: '❄️', cost: 1, rarity: 'common', description: 'Freezes on contact', type: 'Troop', role: 'Cycle', category: 'ground' },
        firespirit: { name: 'Fire Spirit', emoji: '🔥', cost: 1, rarity: 'common', description: 'Splash on contact', type: 'Troop', role: 'Cycle', category: 'ground' },
        minions: { name: 'Minions', emoji: '👿', cost: 3, rarity: 'common', description: '3 fast flying attackers', type: 'Troop', role: 'Swarm', category: 'air', spawnsMultiple: true, targetAir: true },
        megaminion: { name: 'Mega Minion', emoji: '😈', cost: 3, rarity: 'rare', description: 'Tanky flying attacker', type: 'Troop', role: 'Support', category: 'air', targetAir: true },
        goblingang: { name: 'Goblin Gang', emoji: '👺', cost: 3, rarity: 'common', description: 'Mix of melee and ranged', type: 'Troop', role: 'Swarm', category: 'ground', spawnsMultiple: true },
        lumberjack: { name: 'Lumberjack', emoji: '🪓', cost: 4, rarity: 'legendary', description: 'Drops rage on death', type: 'Troop', role: 'Glass Cannon', category: 'ground' },
        bandit: { name: 'Bandit', emoji: '🥷', cost: 3, rarity: 'legendary', description: 'Dash attack + immune', type: 'Troop', role: 'Glass Cannon', category: 'ground' },
        royalgiant: { name: 'Royal Giant', emoji: '🔫', cost: 6, rarity: 'common', description: 'Ranged building targeter', type: 'Troop', role: 'Win Condition', category: 'ground', isWinCondition: true },
        elitebarbarians: { name: 'Elite Barbarians', emoji: '⚔️', cost: 6, rarity: 'common', description: 'Fast heavy hitters', type: 'Troop', role: 'Win Condition', category: 'ground', isWinCondition: true, spawnsMultiple: true },
        
        // ===== SPELLS =====
        fireball: { name: 'Fireball', emoji: '🔥', cost: 4, rarity: 'rare', description: 'Area damage spell', type: 'Spell', role: 'Damage', isSpell: true },
        arrows: { name: 'Arrows', emoji: '🏹', cost: 3, rarity: 'common', description: 'Wide area light damage', type: 'Spell', role: 'Swarm Clear', isSpell: true },
        zap: { name: 'Zap', emoji: '⚡', cost: 2, rarity: 'common', description: 'Stun + light damage', type: 'Spell', role: 'Utility', isSpell: true },
        log: { name: 'The Log', emoji: '🪵', cost: 2, rarity: 'legendary', description: 'Knockback ground units', type: 'Spell', role: 'Utility', isSpell: true },
        poison: { name: 'Poison', emoji: '☠️', cost: 4, rarity: 'epic', description: 'Damage over time + slow', type: 'Spell', role: 'Control', isSpell: true },
        freeze: { name: 'Freeze', emoji: '🧊', cost: 4, rarity: 'epic', description: 'Freezes all units', type: 'Spell', role: 'Control', isSpell: true },
        rage: { name: 'Rage', emoji: '😤', cost: 2, rarity: 'epic', description: 'Speed + attack boost', type: 'Spell', role: 'Utility', isSpell: true },
        
        // ===== BUILDINGS =====
        cannon: { name: 'Cannon', emoji: '🔩', cost: 3, rarity: 'common', description: 'Defensive building (ground)', type: 'Building', role: 'Defense', isBuilding: true },
        tesla: { name: 'Tesla', emoji: '⚡', cost: 4, rarity: 'rare', description: 'Hidden, targets air+ground', type: 'Building', role: 'Defense', isBuilding: true, targetAir: true },
        infernotower: { name: 'Inferno Tower', emoji: '🔥', cost: 5, rarity: 'epic', description: 'Ramping damage - melts tanks', type: 'Building', role: 'Tank Killer', isBuilding: true, targetAir: true },
        bombtower: { name: 'Bomb Tower', emoji: '💣', cost: 4, rarity: 'rare', description: 'Splash + death bomb', type: 'Building', role: 'Defense', isBuilding: true },
        tombstone: { name: 'Tombstone', emoji: '🪦', cost: 3, rarity: 'rare', description: 'Spawns skeletons', type: 'Building', role: 'Spawner', isBuilding: true },
        goblinhut: { name: 'Goblin Hut', emoji: '🛖', cost: 5, rarity: 'rare', description: 'Spawns spear goblins', type: 'Building', role: 'Spawner', isBuilding: true }
    };

    const cardIds = [
        // Troops
        'knight', 'archer', 'giant', 'hogrider', 'minipekka', 'wizard', 'dragon', 'barbarian',
        'skeleton', 'musketeer', 'pekka', 'golem', 'miner', 'balloon', 'witch', 'valkyrie',
        'prince', 'darkprince', 'electrowizard', 'icespirit', 'firespirit', 'minions', 'megaminion',
        'goblingang', 'lumberjack', 'bandit', 'royalgiant', 'elitebarbarians',
        // Spells
        'fireball', 'arrows', 'zap', 'log', 'poison', 'freeze', 'rage',
        // Buildings
        'cannon', 'tesla', 'infernotower', 'bombtower', 'tombstone', 'goblinhut'
    ];

    const DEFAULT_DECK = ['knight', 'archer', 'giant', 'hogrider', 'minipekka', 'wizard', 'fireball', 'arrows'];

    // ===== CLASH ROYALE STRATEGY CONSTANTS =====
    
    // Push composition strategies (like real CR)
    const PUSH_COMBOS = {
        // Tank + Support combos
        giantPush: { tank: 'giant', supports: ['musketeer', 'wizard', 'archer'] },
        golemPush: { tank: 'golem', supports: ['wizard', 'witch', 'dragon'] },
        pekkaPush: { tank: 'pekka', supports: ['wizard', 'archer', 'witch'] },
        lavaLoon: { tank: 'balloon', supports: ['dragon'] }, // Balloon + air support
        hogCycle: { winCondition: 'hogrider', supports: ['knight', 'musketeer', 'fireball'] },
        minerControl: { winCondition: 'miner', supports: ['musketeer', 'archer', 'valkyrie'] }
    };

    // Counter card lookup for quick AI decisions
    const COUNTER_MAP = {
        // Building-targeters -> Use buildings or high DPS
        giant: ['infernotower', 'minipekka', 'pekka', 'skeleton', 'barbarian'],
        golem: ['infernotower', 'minipekka', 'pekka', 'skeleton'],
        hogrider: ['cannon', 'tesla', 'tombstone', 'skeleton', 'barbarian'],
        balloon: ['tesla', 'musketeer', 'wizard', 'archer'],
        miner: ['knight', 'valkyrie', 'skeleton', 'barbarian'],
        
        // Heavy hitters -> Use swarms
        pekka: ['skeleton', 'barbarian', 'witch', 'tombstone'],
        minipekka: ['skeleton', 'knight', 'barbarian'],
        
        // Swarms -> Use splash
        skeleton: ['valkyrie', 'wizard', 'dragon', 'arrows'],
        barbarian: ['fireball', 'valkyrie', 'wizard', 'dragon'],
        archer: ['arrows', 'valkyrie', 'wizard'],
        
        // Splash units -> Use high DPS single target
        wizard: ['fireball', 'minipekka', 'miner'],
        witch: ['fireball', 'valkyrie', 'knight'],
        valkyrie: ['minipekka', 'pekka', 'musketeer'],
        
        // Support units -> Use spells or mini tanks
        musketeer: ['fireball', 'knight', 'miner'],
        dragon: ['musketeer', 'wizard', 'tesla'],
        
        // Tanks/Mini-tanks -> Use high DPS
        knight: ['minipekka', 'pekka', 'valkyrie']
    };

    // Role categories for strategic decisions
    const ROLE_CATEGORIES = {
        tanks: ['giant', 'golem', 'pekka', 'royalgiant'],
        miniTanks: ['knight', 'valkyrie', 'darkprince', 'megaminion'],
        winConditions: ['giant', 'golem', 'hogrider', 'balloon', 'miner', 'royalgiant', 'elitebarbarians', 'prince'],
        support: ['musketeer', 'wizard', 'witch', 'archer', 'dragon', 'electrowizard', 'megaminion'],
        swarms: ['skeleton', 'barbarian', 'minions', 'goblingang'],
        splashers: ['wizard', 'valkyrie', 'dragon', 'bombtower', 'darkprince'],
        buildings: ['cannon', 'tesla', 'infernotower', 'bombtower', 'tombstone', 'goblinhut'],
        spells: ['fireball', 'arrows', 'zap', 'log', 'poison', 'freeze', 'rage'],
        airTargeters: ['archer', 'musketeer', 'wizard', 'dragon', 'tesla', 'electrowizard', 'minions', 'megaminion'],
        buildingTargeters: ['giant', 'golem', 'hogrider', 'balloon', 'miner', 'royalgiant'],
        cycleCards: ['skeleton', 'icespirit', 'firespirit', 'zap', 'log'],
        glassCanons: ['minipekka', 'prince', 'lumberjack', 'bandit']
    };

    // Elixir trade thresholds (positive trade = value)
    const ELIXIR_TRADE = {
        // Spell value: spell cost vs units killed total cost
        fireballValue: 4, // Fireball is good if kills 4+ elixir
        arrowsValue: 3,   // Arrows is good if kills 3+ elixir (minions, archers, etc.)
        
        // Defense efficiency
        minPositiveTrade: 1, // At minimum, trade +1 elixir 
        maxNegativeTrade: -2, // Accept -2 trade only if tower HP is threatened
    };

    window.ClanClashData = {
        unitTemplates,
        cards,
        cardIds,
        DEFAULT_DECK,
        // Strategy data
        PUSH_COMBOS,
        COUNTER_MAP,
        ROLE_CATEGORIES,
        ELIXIR_TRADE
    };
})();
