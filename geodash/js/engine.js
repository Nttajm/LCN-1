/**
 * ==================== GEOMETRY DASH - GAME ENGINE ====================
 * Core game mechanics, physics, and rendering engine
 */

class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Game configuration
    this.config = {
      gravity: 0.85,
      jumpForce: -13.5,
      playerSpeed: 9,
      groundHeight: 100,
      playerSize: 44,
      orbitBoost: 1.35,
      padBoost: 1.9,
      pinkPadBoost: 2.2,
      maxVelocity: 25,
      rotationSpeed: 7.2
    };
    
    // Player colors (customizable)
    this.playerColors = {
      primary: '#00d4ff',
      secondary: '#ffffff',
      glow: 'rgba(0, 212, 255, 0.6)'
    };
    
    // Game state
    this.state = {
      screen: 'menu',
      currentLevel: null,
      player: null,
      obstacles: [],
      decorations: [],
      camera: { x: 0, y: 0 },
      attempts: 1,
      jumps: 0,
      coins: 0,
      totalCoins: 0,
      secretCoins: 0,
      totalSecretCoins: 0,
      isPaused: false,
      isGameOver: false,
      levelComplete: false,
      progress: 0,
      levelLength: 0,
      particles: [],
      trails: [],
      groundY: 0,
      time: 0,
      practiceMode: false,
      checkpoints: [],
      lastCheckpoint: null
    };
    
    // Audio context (for future audio implementation)
    this.audioEnabled = true;
    
    // Performance tracking
    this.lastTime = 0;
    this.deltaTime = 0;
    this.fps = 60;
    this.frameCount = 0;
    
    // Initialize
    this.resize();
    this.bindEvents();
  }
  
  // ==================== INITIALIZATION ====================
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.state.groundY = this.canvas.height - this.config.groundHeight;
  }
  
  bindEvents() {
    window.addEventListener('resize', () => this.resize());
  }
  
  // ==================== LEVEL MANAGEMENT ====================
  
  loadLevel(level) {
    this.state.currentLevel = level;
    this.state.attempts = 1;
    
    // Generate level data
    const levelData = level.generator();
    
    // Calculate level length
    const endObstacle = levelData.obstacles.find(o => o.type === 'end');
    this.state.levelLength = endObstacle ? endObstacle.x : 8000;
    
    // Count coins
    this.state.totalCoins = levelData.obstacles.filter(o => o.type === 'coin').length;
    this.state.totalSecretCoins = levelData.obstacles.filter(o => o.type === 'secret_coin').length;
    
    this.initLevel(levelData);
  }
  
  initLevel(levelData) {
    // Initialize player
    this.state.player = {
      x: 180,
      y: this.state.groundY - this.config.playerSize,
      vx: 0,
      vy: 0,
      rotation: 0,
      targetRotation: 0,
      isGrounded: true,
      isDead: false,
      isShip: false,
      isBall: false,
      isUFO: false,
      isWave: false,
      isRobot: false,
      isSpider: false,
      isMini: false,
      gravityFlipped: false,
      width: this.config.playerSize,
      height: this.config.playerSize,
      jumpBuffer: 0,
      coyoteTime: 0,
      invincible: false
    };
    
    // Clone obstacles
    this.state.obstacles = JSON.parse(JSON.stringify(levelData.obstacles || []));
    this.state.decorations = JSON.parse(JSON.stringify(levelData.decorations || []));
    
    // Reset state
    this.state.camera = { x: 0, y: 0 };
    this.state.jumps = 0;
    this.state.coins = 0;
    this.state.secretCoins = 0;
    this.state.isPaused = false;
    this.state.isGameOver = false;
    this.state.levelComplete = false;
    this.state.progress = 0;
    this.state.particles = [];
    this.state.trails = [];
    this.state.time = 0;
    this.state.checkpoints = [];
    this.state.lastCheckpoint = null;
  }
  
  restartLevel() {
    this.state.attempts++;
    const levelData = this.state.currentLevel.generator();
    this.initLevel(levelData);
    
    // Update level attempts in storage
    this.state.currentLevel.attempts++;
    this.saveProgress();
  }
  
  respawnAtCheckpoint() {
    if (this.state.lastCheckpoint) {
      this.state.camera.x = this.state.lastCheckpoint.cameraX;
      this.state.player.x = 180;
      this.state.player.y = this.state.groundY - this.config.playerSize;
      this.state.player.vy = 0;
      this.state.player.rotation = 0;
      this.state.player.isDead = false;
      this.state.player.isGrounded = true;
      this.state.isGameOver = false;
      this.state.particles = [];
    } else {
      this.restartLevel();
    }
  }
  
  // ==================== INPUT HANDLING ====================
  
  handleJump() {
    if (this.state.screen !== 'game' || this.state.isPaused || this.state.isGameOver) return;
    
    const player = this.state.player;
    
    // Set jump buffer for responsive jumping
    player.jumpBuffer = 6;
    
    // Standard cube jump
    if (player.isGrounded || player.coyoteTime > 0) {
      this.performJump();
    }
    
    // Check for orb activation
    this.checkOrbActivation();
  }
  
  performJump() {
    const player = this.state.player;
    
    let jumpForce = this.config.jumpForce;
    if (player.isMini) jumpForce *= 0.85;
    if (player.gravityFlipped) jumpForce *= -1;
    
    player.vy = jumpForce;
    player.isGrounded = false;
    player.coyoteTime = 0;
    player.jumpBuffer = 0;
    this.state.jumps++;
    
    this.createJumpParticles();
    this.playSound('jump');
  }
  
  checkOrbActivation() {
    const player = this.state.player;
    
    this.state.obstacles.forEach(obs => {
      if (!obs.used && this.isOrbType(obs.type)) {
        const obsX = obs.x - this.state.camera.x;
        const obsY = this.state.groundY - (obs.y || 0) - 25;
        
        const dx = (player.x + player.width / 2) - obsX;
        const dy = (player.y + player.height / 2) - obsY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 70) {
          this.activateOrb(obs, obsX, obsY);
        }
      }
    });
  }
  
  isOrbType(type) {
    return type.startsWith('orb_');
  }
  
  activateOrb(orb, x, y) {
    const player = this.state.player;
    orb.used = true;
    
    let boostForce = this.config.jumpForce * this.config.orbitBoost;
    
    switch(orb.type) {
      case 'orb_yellow':
        boostForce = this.config.jumpForce * this.config.orbitBoost;
        break;
      case 'orb_pink':
        boostForce = this.config.jumpForce * 1.1;
        break;
      case 'orb_red':
        boostForce = this.config.jumpForce * 1.5;
        break;
      case 'orb_blue':
        player.gravityFlipped = !player.gravityFlipped;
        boostForce = this.config.jumpForce * 0.8 * (player.gravityFlipped ? -1 : 1);
        break;
      case 'orb_green':
        boostForce = this.config.jumpForce * 1.2;
        // Also flip gravity
        player.gravityFlipped = !player.gravityFlipped;
        break;
    }
    
    if (player.gravityFlipped && orb.type !== 'orb_blue' && orb.type !== 'orb_green') {
      boostForce *= -1;
    }
    
    player.vy = boostForce;
    player.isGrounded = false;
    this.state.jumps++;
    
    this.createOrbParticles(x, y, orb.type);
    this.playSound('orb');
  }
  
  holdJump(isHolding) {
    if (this.state.player && this.state.player.isGrounded && isHolding) {
      this.handleJump();
    }
  }
  
  // ==================== PHYSICS UPDATE ====================
  
  update(deltaTime) {
    if (this.state.isPaused || this.state.isGameOver) return;
    
    this.state.time += deltaTime;
    
    const player = this.state.player;
    
    // Apply gravity
    let gravity = this.config.gravity;
    if (player.isMini) gravity *= 0.9;
    if (player.gravityFlipped) gravity *= -1;
    
    player.vy += gravity;
    
    // Clamp velocity
    player.vy = Math.max(-this.config.maxVelocity, Math.min(this.config.maxVelocity, player.vy));
    
    // Apply velocity
    player.y += player.vy;
    
    // Ground collision
    const groundLevel = player.gravityFlipped ? 
      this.config.groundHeight : 
      this.state.groundY - player.height;
    
    if (!player.gravityFlipped) {
      if (player.y >= groundLevel) {
        player.y = groundLevel;
        player.vy = 0;
        
        if (!player.isGrounded) {
          this.createLandingParticles();
        }
        
        player.isGrounded = true;
        player.coyoteTime = 8;
        
        // Check jump buffer
        if (player.jumpBuffer > 0) {
          this.performJump();
        }
      } else {
        player.isGrounded = false;
        if (player.coyoteTime > 0) player.coyoteTime--;
      }
    } else {
      // Gravity flipped - ceiling is ground
      if (player.y <= this.config.groundHeight) {
        player.y = this.config.groundHeight;
        player.vy = 0;
        player.isGrounded = true;
      } else if (player.y >= this.state.groundY - player.height) {
        // Fell to actual ground while flipped = death
        this.killPlayer();
        return;
      }
    }
    
    // Update rotation
    if (!player.isGrounded) {
      const rotationDirection = player.gravityFlipped ? -1 : 1;
      player.rotation += this.config.rotationSpeed * rotationDirection;
    } else {
      // Snap to nearest 90 degrees
      const targetRotation = Math.round(player.rotation / 90) * 90;
      player.rotation += (targetRotation - player.rotation) * 0.3;
    }
    
    // Move camera
    this.state.camera.x += this.config.playerSpeed;
    
    // Update progress
    this.state.progress = (this.state.camera.x / this.state.levelLength) * 100;
    
    // Update best progress
    if (this.state.progress > this.state.currentLevel.bestProgress) {
      this.state.currentLevel.bestProgress = this.state.progress;
    }
    
    // Decrease jump buffer
    if (player.jumpBuffer > 0) player.jumpBuffer--;
    
    // Check collisions
    this.checkCollisions();
    
    // Update particles
    this.updateParticles();
    
    // Update trails
    this.updateTrails();
    
    // Create trail particles
    if (this.state.frameCount % 2 === 0 && !player.isGrounded) {
      this.createTrailParticle();
    }
    
    this.state.frameCount++;
  }
  
  // ==================== COLLISION DETECTION ====================
  
  checkCollisions() {
    const player = this.state.player;
    
    // Player hitbox (slightly smaller than visual for fairness)
    const hitbox = {
      x: player.x + 6,
      y: player.y + 6,
      width: player.width - 12,
      height: player.height - 12
    };
    
    for (const obs of this.state.obstacles) {
      const obsX = obs.x - this.state.camera.x;
      
      // Skip if too far
      if (obsX < -200 || obsX > this.canvas.width + 200) continue;
      
      const baseY = this.state.groundY - (obs.y || 0);
      
      switch (obs.type) {
        case 'spike':
        case 'spike_small':
        case 'spike_double':
        case 'spike_triple':
          if (this.checkSpikeCollision(hitbox, obsX, obs.y || 0)) {
            this.killPlayer();
            return;
          }
          break;
          
        case 'block':
        case 'block_half':
        case 'block_fade':
          const collision = this.checkBlockCollision(player, hitbox, obsX, obs);
          if (collision === 'top') {
            player.y = baseY - obs.height - player.height;
            player.vy = 0;
            if (!player.isGrounded) {
              this.createLandingParticles();
            }
            player.isGrounded = true;
            player.coyoteTime = 8;
            
            if (player.jumpBuffer > 0) {
              this.performJump();
            }
          } else if (collision === 'side') {
            this.killPlayer();
            return;
          } else if (collision === 'bottom' && player.gravityFlipped) {
            player.y = baseY + 1;
            player.vy = 0;
            player.isGrounded = true;
          }
          break;
          
        case 'coin':
          if (!obs.collected && this.checkCoinCollision(hitbox, obsX, obs.y)) {
            obs.collected = true;
            this.state.coins++;
            this.createCoinParticles(obsX, baseY - 15);
            this.playSound('coin');
          }
          break;
          
        case 'secret_coin':
          if (!obs.collected && this.checkCoinCollision(hitbox, obsX, obs.y)) {
            obs.collected = true;
            this.state.secretCoins++;
            this.state.currentLevel.coinsCollected[this.state.secretCoins - 1] = true;
            this.createSecretCoinParticles(obsX, baseY - 15);
            this.playSound('secret_coin');
          }
          break;
          
        case 'pad_yellow':
        case 'pad_pink':
        case 'pad_red':
        case 'pad_blue':
          if (this.checkPadCollision(hitbox, obsX, baseY)) {
            this.activatePad(obs);
          }
          break;
          
        case 'sawblade':
        case 'sawblade_small':
          if (this.checkSawbladeCollision(hitbox, obsX, baseY, obs)) {
            this.killPlayer();
            return;
          }
          break;
          
        case 'portal_gravity':
          if (!obs.used && this.checkPortalCollision(hitbox, obsX, baseY)) {
            player.gravityFlipped = true;
            obs.used = true;
            this.createPortalParticles(obsX, baseY);
          }
          break;
          
        case 'portal_gravity_normal':
          if (!obs.used && this.checkPortalCollision(hitbox, obsX, baseY)) {
            player.gravityFlipped = false;
            obs.used = true;
            this.createPortalParticles(obsX, baseY);
          }
          break;
          
        case 'end':
          if (obsX < player.x + player.width) {
            this.levelComplete();
            return;
          }
          break;
      }
    }
  }
  
  checkSpikeCollision(hitbox, spikeX, spikeY) {
    const spikeHeight = 38;
    const spikeWidth = 42;
    const spikeTop = this.state.groundY - spikeY - spikeHeight;
    
    // Triangle collision using point-in-triangle test
    const centerX = hitbox.x + hitbox.width / 2;
    const bottomY = hitbox.y + hitbox.height;
    
    // Simplified hitbox check
    if (centerX > spikeX && centerX < spikeX + spikeWidth) {
      if (bottomY > spikeTop + 12 && hitbox.y < this.state.groundY - spikeY) {
        return true;
      }
    }
    
    // Check corners
    const corners = [
      { x: hitbox.x, y: hitbox.y + hitbox.height },
      { x: hitbox.x + hitbox.width, y: hitbox.y + hitbox.height }
    ];
    
    for (const corner of corners) {
      if (this.pointInSpike(corner.x, corner.y, spikeX, spikeY, spikeWidth, spikeHeight)) {
        return true;
      }
    }
    
    return false;
  }
  
  pointInSpike(px, py, spikeX, spikeY, width, height) {
    const baseY = this.state.groundY - spikeY;
    const topY = baseY - height;
    const tipX = spikeX + width / 2;
    
    // Point must be within horizontal bounds
    if (px < spikeX || px > spikeX + width) return false;
    
    // Point must be within vertical bounds
    if (py < topY || py > baseY) return false;
    
    // Calculate the y-threshold at this x position
    const distFromCenter = Math.abs(px - tipX);
    const maxDist = width / 2;
    const threshold = topY + (height * (distFromCenter / maxDist));
    
    return py < threshold + 8;
  }
  
  checkBlockCollision(player, hitbox, blockX, block) {
    const blockY = this.state.groundY - (block.y || 0) - block.height;
    const blockBottom = this.state.groundY - (block.y || 0);
    
    const playerRight = hitbox.x + hitbox.width;
    const playerBottom = hitbox.y + hitbox.height;
    
    // Check if overlapping
    if (playerRight > blockX + 2 && hitbox.x < blockX + block.width - 2) {
      if (playerBottom > blockY + 2 && hitbox.y < blockBottom - 2) {
        // Determine collision side
        const overlapLeft = playerRight - blockX;
        const overlapRight = (blockX + block.width) - hitbox.x;
        const overlapTop = playerBottom - blockY;
        const overlapBottom = blockBottom - hitbox.y;
        
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        
        if (minOverlap === overlapTop && player.vy >= 0 && !player.gravityFlipped) {
          return 'top';
        } else if (minOverlap === overlapBottom && player.vy <= 0 && player.gravityFlipped) {
          return 'bottom';
        } else if (minOverlap === overlapLeft || minOverlap === overlapRight) {
          return 'side';
        }
      }
    }
    
    return null;
  }
  
  checkCoinCollision(hitbox, coinX, coinY) {
    const coinScreenY = this.state.groundY - coinY - 18;
    const dx = (hitbox.x + hitbox.width / 2) - coinX;
    const dy = (hitbox.y + hitbox.height / 2) - coinScreenY;
    return Math.sqrt(dx * dx + dy * dy) < 40;
  }
  
  checkPadCollision(hitbox, padX, padY) {
    return hitbox.x + hitbox.width > padX && 
           hitbox.x < padX + 55 && 
           hitbox.y + hitbox.height > padY - 18 &&
           hitbox.y + hitbox.height < padY + 25;
  }
  
  checkSawbladeCollision(hitbox, sawX, sawY, saw) {
    const size = saw.type === 'sawblade_small' ? 30 : 50;
    const centerX = sawX + size / 2;
    const centerY = sawY - size / 2;
    
    const dx = (hitbox.x + hitbox.width / 2) - centerX;
    const dy = (hitbox.y + hitbox.height / 2) - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    return dist < size / 2 + hitbox.width / 3;
  }
  
  checkPortalCollision(hitbox, portalX, portalY) {
    return hitbox.x + hitbox.width > portalX && 
           hitbox.x < portalX + 50 && 
           hitbox.y < portalY &&
           hitbox.y + hitbox.height > portalY - 150;
  }
  
  activatePad(pad) {
    if (pad.activated) return;
    
    const player = this.state.player;
    let boostForce = this.config.jumpForce * this.config.padBoost;
    
    switch(pad.type) {
      case 'pad_yellow':
        boostForce = this.config.jumpForce * this.config.padBoost;
        break;
      case 'pad_pink':
        boostForce = this.config.jumpForce * this.config.pinkPadBoost;
        break;
      case 'pad_red':
        boostForce = this.config.jumpForce * 2.5;
        break;
      case 'pad_blue':
        player.gravityFlipped = !player.gravityFlipped;
        boostForce = this.config.jumpForce * 1.5 * (player.gravityFlipped ? -1 : 1);
        break;
    }
    
    if (player.gravityFlipped && pad.type !== 'pad_blue') {
      boostForce *= -1;
    }
    
    player.vy = boostForce;
    player.isGrounded = false;
    this.state.jumps++;
    
    pad.activated = true;
    setTimeout(() => { pad.activated = false; }, 100);
    
    this.createPadParticles(pad.x - this.state.camera.x, this.state.groundY);
    this.playSound('pad');
  }
  
  // ==================== GAME EVENTS ====================
  
  killPlayer() {
    if (this.state.player.isDead || this.state.player.invincible) return;
    
    this.state.player.isDead = true;
    this.state.isGameOver = true;
    
    this.createDeathParticles();
    this.playSound('death');
    
    // Screen shake
    this.screenShake(10, 300);
  }
  
  levelComplete() {
    if (this.state.levelComplete) return;
    
    this.state.levelComplete = true;
    this.state.isGameOver = true;
    this.state.progress = 100;
    this.state.currentLevel.bestProgress = 100;
    
    this.createVictoryParticles();
    this.playSound('complete');
    
    this.saveProgress();
  }
  
  screenShake(intensity, duration) {
    const startTime = Date.now();
    const shake = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        const decay = 1 - (elapsed / duration);
        this.state.camera.shakeX = (Math.random() - 0.5) * intensity * decay;
        this.state.camera.shakeY = (Math.random() - 0.5) * intensity * decay;
        requestAnimationFrame(shake);
      } else {
        this.state.camera.shakeX = 0;
        this.state.camera.shakeY = 0;
      }
    };
    shake();
  }
  
  // ==================== PARTICLES ====================
  
  createJumpParticles() {
    const player = this.state.player;
    const baseY = player.gravityFlipped ? player.y : player.y + player.height;
    
    for (let i = 0; i < 10; i++) {
      this.state.particles.push({
        x: player.x + player.width / 2 + (Math.random() - 0.5) * 20,
        y: baseY,
        vx: (Math.random() - 0.5) * 8,
        vy: player.gravityFlipped ? -Math.random() * 4 - 2 : Math.random() * 4 + 2,
        life: 25,
        maxLife: 25,
        color: this.playerColors.primary,
        size: 4 + Math.random() * 3,
        type: 'circle'
      });
    }
  }
  
  createLandingParticles() {
    const player = this.state.player;
    
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        x: player.x + Math.random() * player.width,
        y: player.y + player.height,
        vx: (Math.random() - 0.5) * 10,
        vy: -Math.random() * 2,
        life: 20,
        maxLife: 20,
        color: '#ffffff',
        size: 3 + Math.random() * 2,
        type: 'circle'
      });
    }
  }
  
  createOrbParticles(x, y, type) {
    const colors = {
      'orb_yellow': '#f1c40f',
      'orb_pink': '#e91e63',
      'orb_red': '#e74c3c',
      'orb_blue': '#3498db',
      'orb_green': '#2ecc71'
    };
    const color = colors[type] || '#f1c40f';
    
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 / 15) * i;
      this.state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
        life: 30,
        maxLife: 30,
        color: color,
        size: 5,
        type: 'circle'
      });
    }
  }
  
  createPadParticles(x, y) {
    for (let i = 0; i < 12; i++) {
      this.state.particles.push({
        x: x + 25,
        y: y - 10,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 15 - 5,
        life: 35,
        maxLife: 35,
        color: '#f39c12',
        size: 4 + Math.random() * 3,
        type: 'circle'
      });
    }
  }
  
  createCoinParticles(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i;
      this.state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        life: 25,
        maxLife: 25,
        color: '#f1c40f',
        size: 6,
        type: 'star'
      });
    }
  }
  
  createSecretCoinParticles(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 / 20) * i;
      this.state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
        life: 40,
        maxLife: 40,
        color: i % 2 === 0 ? '#f1c40f' : '#ffffff',
        size: 7,
        type: 'star'
      });
    }
  }
  
  createDeathParticles() {
    const player = this.state.player;
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    
    // Cube fragments
    for (let i = 0; i < 25; i++) {
      const angle = (Math.PI * 2 / 25) * i + Math.random() * 0.5;
      const speed = 8 + Math.random() * 10;
      this.state.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 50,
        maxLife: 50,
        color: this.playerColors.primary,
        size: 6 + Math.random() * 6,
        type: 'square',
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20
      });
    }
    
    // White flash particles
    for (let i = 0; i < 15; i++) {
      this.state.particles.push({
        x: centerX,
        y: centerY,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        life: 20,
        maxLife: 20,
        color: '#ffffff',
        size: 8,
        type: 'circle'
      });
    }
  }
  
  createVictoryParticles() {
    const colors = ['#2ecc71', '#f1c40f', '#3498db', '#e74c3c', '#9b59b6'];
    
    for (let i = 0; i < 50; i++) {
      this.state.particles.push({
        x: this.canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: this.canvas.height + 20,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 15 - 10,
        life: 100,
        maxLife: 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 8,
        type: 'star',
        gravity: 0.2
      });
    }
  }
  
  createPortalParticles(x, y) {
    for (let i = 0; i < 20; i++) {
      this.state.particles.push({
        x: x + 25,
        y: y - 75 + Math.random() * 150,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 30,
        maxLife: 30,
        color: '#9b59b6',
        size: 5 + Math.random() * 4,
        type: 'circle'
      });
    }
  }
  
  createTrailParticle() {
    const player = this.state.player;
    
    this.state.trails.push({
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
      rotation: player.rotation,
      life: 15,
      maxLife: 15,
      size: player.width * 0.8
    });
  }
  
  updateParticles() {
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      
      // Apply gravity if specified
      if (p.gravity) {
        p.vy += p.gravity;
      }
      
      // Apply friction
      p.vx *= 0.98;
      p.vy *= 0.98;
      
      // Update rotation
      if (p.rotationSpeed) {
        p.rotation += p.rotationSpeed;
      }
      
      p.life--;
      return p.life > 0;
    });
  }
  
  updateTrails() {
    this.state.trails = this.state.trails.filter(t => {
      t.life--;
      return t.life > 0;
    });
  }
  
  // ==================== SOUND (Placeholder) ====================
  
  playSound(sound) {
    if (!this.audioEnabled) return;
    // Sound implementation would go here
    // For now, this is a placeholder
  }
  
  // ==================== SAVE/LOAD ====================
  
  saveProgress() {
    try {
      const saveData = {
        levels: LEVELS.map(l => ({
          id: l.id,
          bestProgress: l.bestProgress,
          attempts: l.attempts,
          coinsCollected: l.coinsCollected
        }))
      };
      localStorage.setItem('geodash_progress', JSON.stringify(saveData));
    } catch (e) {
      console.warn('Could not save progress:', e);
    }
  }
  
  loadProgress() {
    try {
      const saveData = JSON.parse(localStorage.getItem('geodash_progress'));
      if (saveData && saveData.levels) {
        saveData.levels.forEach(saved => {
          const level = LEVELS.find(l => l.id === saved.id);
          if (level) {
            level.bestProgress = saved.bestProgress || 0;
            level.attempts = saved.attempts || 0;
            level.coinsCollected = saved.coinsCollected || [false, false, false];
          }
        });
      }
    } catch (e) {
      console.warn('Could not load progress:', e);
    }
  }
  
  // ==================== GETTERS ====================
  
  getProgress() {
    return Math.min(100, Math.max(0, this.state.progress));
  }
  
  getLevelColor() {
    return this.state.currentLevel ? this.state.currentLevel.color : '#00d4ff';
  }
  
  getLevelSecondaryColor() {
    return this.state.currentLevel ? this.state.currentLevel.secondaryColor : '#0099cc';
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameEngine };
}
