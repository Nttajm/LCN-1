/**
 * ==================== GEOMETRY DASH - RENDERER ====================
 * High-quality rendering engine for all game graphics
 */

class GameRenderer {
  constructor(engine) {
    this.engine = engine;
    this.ctx = engine.ctx;
    this.canvas = engine.canvas;
    
    // Rendering settings
    this.settings = {
      showParticles: true,
      showTrails: true,
      showGlow: true,
      showDecorations: true,
      highQuality: true,
      backgroundParallax: true
    };
    
    // Background layers
    this.bgLayers = [];
    this.initBackgroundLayers();
    
    // Cached gradients
    this.gradients = {};
    
    // Animation time
    this.animTime = 0;
  }
  
  // ==================== INITIALIZATION ====================
  
  initBackgroundLayers() {
    // Create parallax star layers
    for (let layer = 0; layer < 3; layer++) {
      const stars = [];
      const count = 40 - layer * 10;
      
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * 2000,
          y: Math.random() * 600,
          size: 1 + Math.random() * (2 - layer * 0.5),
          twinkleOffset: Math.random() * Math.PI * 2,
          speed: 0.1 + layer * 0.05
        });
      }
      
      this.bgLayers.push({
        type: 'stars',
        depth: 0.1 + layer * 0.1,
        stars: stars
      });
    }
  }
  
  // ==================== MAIN RENDER ====================
  
  render() {
    this.animTime += 0.016; // Approximate 60fps timing
    
    const state = this.engine.state;
    const ctx = this.ctx;
    
    // Apply camera shake
    ctx.save();
    if (state.camera.shakeX || state.camera.shakeY) {
      ctx.translate(state.camera.shakeX || 0, state.camera.shakeY || 0);
    }
    
    // Render layers
    this.renderBackground();
    this.renderBackgroundDecorations();
    this.renderGround();
    this.renderTrails();
    this.renderObstacles();
    this.renderPlayer();
    this.renderParticles();
    this.renderForegroundEffects();
    
    ctx.restore();
  }
  
  // ==================== BACKGROUND ====================
  
  renderBackground() {
    const ctx = this.ctx;
    const state = this.engine.state;
    const level = state.currentLevel;
    
    // Get level colors
    const primaryColor = level ? level.color : '#00d4ff';
    const secondaryColor = level ? level.secondaryColor : '#0099cc';
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    
    // Dynamic background based on level color
    const hue = this.hexToHSL(primaryColor).h;
    
    gradient.addColorStop(0, `hsl(${hue}, 40%, 8%)`);
    gradient.addColorStop(0.3, `hsl(${hue}, 50%, 12%)`);
    gradient.addColorStop(0.6, `hsl(${hue}, 45%, 15%)`);
    gradient.addColorStop(1, `hsl(${hue}, 35%, 10%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render parallax stars
    if (this.settings.backgroundParallax) {
      this.renderStars();
    }
    
    // Render background pulse effect
    this.renderBackgroundPulse(primaryColor);
  }
  
  renderStars() {
    const ctx = this.ctx;
    const state = this.engine.state;
    
    this.bgLayers.forEach(layer => {
      if (layer.type === 'stars') {
        layer.stars.forEach(star => {
          // Parallax movement
          const parallaxX = (state.camera.x * layer.depth) % 2000;
          let screenX = star.x - parallaxX;
          
          // Wrap around
          if (screenX < -10) screenX += 2000;
          if (screenX > this.canvas.width + 10) return;
          
          // Twinkle effect
          const twinkle = 0.5 + Math.sin(this.animTime * 2 + star.twinkleOffset) * 0.5;
          
          ctx.globalAlpha = twinkle * 0.8;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(screenX, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });
    
    ctx.globalAlpha = 1;
  }
  
  renderBackgroundPulse(color) {
    const ctx = this.ctx;
    const pulse = Math.sin(this.animTime * 2) * 0.5 + 0.5;
    
    // Subtle radial pulse from center
    const gradient = ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.6
    );
    
    gradient.addColorStop(0, this.hexToRGBA(color, 0.03 + pulse * 0.02));
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  renderBackgroundDecorations() {
    const ctx = this.ctx;
    const state = this.engine.state;
    
    // Render moving background pillars
    this.renderBackgroundPillars();
    
    // Render moving grid lines
    this.renderBackgroundGrid();
  }
  
  renderBackgroundPillars() {
    const ctx = this.ctx;
    const state = this.engine.state;
    const color = this.engine.getLevelColor();
    
    const pillarCount = 15;
    const spacing = 300;
    const offset = (state.camera.x * 0.2) % spacing;
    
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = color;
    
    for (let i = 0; i < pillarCount; i++) {
      const x = i * spacing - offset;
      if (x < -100 || x > this.canvas.width + 100) continue;
      
      const height = 150 + Math.sin(i * 0.5 + this.animTime) * 50;
      
      ctx.fillRect(x - 20, state.groundY - height, 40, height);
    }
    
    ctx.globalAlpha = 1;
  }
  
  renderBackgroundGrid() {
    const ctx = this.ctx;
    const state = this.engine.state;
    const color = this.engine.getLevelColor();
    
    ctx.strokeStyle = this.hexToRGBA(color, 0.05);
    ctx.lineWidth = 1;
    
    const gridSize = 80;
    const offsetX = (state.camera.x * 0.15) % gridSize;
    const offsetY = 0;
    
    // Vertical lines
    for (let x = -offsetX; x < this.canvas.width + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, state.groundY);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y < state.groundY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }
  }
  
  // ==================== GROUND ====================
  
  renderGround() {
    const ctx = this.ctx;
    const state = this.engine.state;
    const color = this.engine.getLevelColor();
    
    // Ground gradient
    const groundGradient = ctx.createLinearGradient(0, state.groundY, 0, this.canvas.height);
    groundGradient.addColorStop(0, '#2d3436');
    groundGradient.addColorStop(0.3, '#1a1a1a');
    groundGradient.addColorStop(1, '#0d0d0d');
    
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, state.groundY, this.canvas.width, this.engine.config.groundHeight);
    
    // Ground top line with glow
    if (this.settings.showGlow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, state.groundY);
    ctx.lineTo(this.canvas.width, state.groundY);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    
    // Ground pattern
    this.renderGroundPattern();
    
    // Ground highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, state.groundY, this.canvas.width, 3);
  }
  
  renderGroundPattern() {
    const ctx = this.ctx;
    const state = this.engine.state;
    
    const patternSize = 60;
    const offset = (state.camera.x) % patternSize;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    
    for (let x = -offset; x < this.canvas.width + patternSize; x += patternSize) {
      // Diagonal lines in ground
      ctx.beginPath();
      ctx.moveTo(x, state.groundY);
      ctx.lineTo(x + 30, this.canvas.height);
      ctx.stroke();
    }
  }
  
  // ==================== OBSTACLES ====================
  
  renderObstacles() {
    const state = this.engine.state;
    
    state.obstacles.forEach(obs => {
      const x = obs.x - state.camera.x;
      
      // Culling - skip if off screen
      if (x < -150 || x > this.canvas.width + 150) return;
      
      const baseY = state.groundY - (obs.y || 0);
      
      switch (obs.type) {
        case 'spike':
        case 'spike_small':
          this.renderSpike(x, baseY, obs);
          break;
        case 'block':
        case 'block_half':
        case 'block_fade':
          this.renderBlock(x, baseY, obs);
          break;
        case 'coin':
          if (!obs.collected) this.renderCoin(x, baseY, obs);
          break;
        case 'secret_coin':
          if (!obs.collected) this.renderSecretCoin(x, baseY, obs);
          break;
        case 'orb_yellow':
        case 'orb_pink':
        case 'orb_red':
        case 'orb_blue':
        case 'orb_green':
          if (!obs.used) this.renderOrb(x, baseY, obs);
          break;
        case 'pad_yellow':
        case 'pad_pink':
        case 'pad_red':
        case 'pad_blue':
          this.renderPad(x, baseY, obs);
          break;
        case 'portal_gravity':
        case 'portal_gravity_normal':
          this.renderGravityPortal(x, baseY, obs);
          break;
        case 'sawblade':
        case 'sawblade_small':
          this.renderSawblade(x, baseY, obs);
          break;
        case 'end':
          this.renderEndPortal(x);
          break;
      }
    });
  }
  
  renderSpike(x, baseY, obs) {
    const ctx = this.ctx;
    const color = this.engine.getLevelColor();
    const isSmall = obs.type === 'spike_small';
    const height = isSmall ? 28 : 38;
    const width = isSmall ? 32 : 42;
    
    // Spike shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(x + 5, baseY);
    ctx.lineTo(x + width / 2 + 5, baseY - height + 5);
    ctx.lineTo(x + width + 5, baseY);
    ctx.closePath();
    ctx.fill();
    
    // Spike glow
    if (this.settings.showGlow) {
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 12;
    }
    
    // Spike body gradient
    const gradient = ctx.createLinearGradient(x, baseY, x, baseY - height);
    gradient.addColorStop(0, '#c0392b');
    gradient.addColorStop(0.5, '#e74c3c');
    gradient.addColorStop(1, '#ff6b6b');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + width / 2, baseY - height);
    ctx.lineTo(x + width, baseY);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Spike outline
    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + width / 2, baseY - height);
    ctx.lineTo(x + width, baseY);
    ctx.closePath();
    ctx.stroke();
    
    // Spike highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.3, baseY - height * 0.3);
    ctx.lineTo(x + width / 2, baseY - height);
    ctx.stroke();
  }
  
  renderBlock(x, baseY, obs) {
    const ctx = this.ctx;
    const color = this.engine.getLevelColor();
    const width = obs.width || 40;
    const height = obs.height || 40;
    const topY = baseY - height;
    
    // Block shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x + 4, topY + 4, width, height);
    
    // Block body gradient
    const gradient = ctx.createLinearGradient(x, topY, x, baseY);
    gradient.addColorStop(0, '#4a5568');
    gradient.addColorStop(0.3, '#3d4852');
    gradient.addColorStop(1, '#2d3748');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, topY, width, height);
    
    // Block border with level color
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, topY, width, height);
    
    // Block shine (top)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x + 2, topY + 2, width - 4, height * 0.35);
    
    // Block inner pattern
    if (width > 30 && height > 30) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      
      const patternOffset = 10;
      ctx.beginPath();
      ctx.moveTo(x + patternOffset, topY);
      ctx.lineTo(x + patternOffset, baseY);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x + width - patternOffset, topY);
      ctx.lineTo(x + width - patternOffset, baseY);
      ctx.stroke();
    }
    
    // Block bottom edge (darker)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x, baseY - 3, width, 3);
  }
  
  renderCoin(x, baseY, obs) {
    const ctx = this.ctx;
    const time = this.animTime;
    const bounce = Math.sin(time * 4) * 4;
    const y = baseY - 18 + bounce;
    const radius = 16;
    
    // Outer glow
    if (this.settings.showGlow) {
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
      glowGradient.addColorStop(0, 'rgba(241, 196, 15, 0.4)');
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Coin body gradient
    const gradient = ctx.createRadialGradient(x - 4, y - 4, 0, x, y, radius);
    gradient.addColorStop(0, '#fff176');
    gradient.addColorStop(0.5, '#f1c40f');
    gradient.addColorStop(1, '#d4a00a');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Coin border
    ctx.strokeStyle = '#a67c00';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Coin shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(x - 4, y - 5, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    
    // Rotating sparkle
    const sparkleAngle = time * 3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 4; i++) {
      const angle = sparkleAngle + (Math.PI / 2) * i;
      const sparkleX = x + Math.cos(angle) * (radius + 5);
      const sparkleY = y + Math.sin(angle) * (radius + 5);
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  renderSecretCoin(x, baseY, obs) {
    const ctx = this.ctx;
    const time = this.animTime;
    const bounce = Math.sin(time * 3) * 5;
    const y = baseY - 18 + bounce;
    const radius = 18;
    
    // Magical outer glow
    if (this.settings.showGlow) {
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
      glowGradient.addColorStop(0, 'rgba(155, 89, 182, 0.5)');
      glowGradient.addColorStop(0.5, 'rgba(241, 196, 15, 0.3)');
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Coin body with special gradient
    const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, radius);
    gradient.addColorStop(0, '#fff176');
    gradient.addColorStop(0.4, '#f1c40f');
    gradient.addColorStop(0.8, '#9b59b6');
    gradient.addColorStop(1, '#7d3c98');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#6c3483';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Inner star pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    this.drawStar(x, y, 5, radius * 0.5, radius * 0.25);
    ctx.stroke();
  }
  
  renderOrb(x, baseY, obs) {
    const ctx = this.ctx;
    const time = this.animTime;
    const pulse = 1 + Math.sin(time * 5) * 0.12;
    const y = baseY - (obs.y ? 0 : 25);
    const radius = 22 * pulse;
    
    // Get orb color
    const colors = {
      'orb_yellow': { primary: '#f1c40f', secondary: '#f39c12', glow: 'rgba(241, 196, 15, 0.5)' },
      'orb_pink': { primary: '#e91e63', secondary: '#c2185b', glow: 'rgba(233, 30, 99, 0.5)' },
      'orb_red': { primary: '#e74c3c', secondary: '#c0392b', glow: 'rgba(231, 76, 60, 0.5)' },
      'orb_blue': { primary: '#3498db', secondary: '#2980b9', glow: 'rgba(52, 152, 219, 0.5)' },
      'orb_green': { primary: '#2ecc71', secondary: '#27ae60', glow: 'rgba(46, 204, 113, 0.5)' }
    };
    
    const colorSet = colors[obs.type] || colors['orb_yellow'];
    
    // Outer glow
    if (this.settings.showGlow) {
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
      glowGradient.addColorStop(0, colorSet.glow);
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Outer ring
    ctx.strokeStyle = colorSet.secondary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    
    // Main orb gradient
    const gradient = ctx.createRadialGradient(x - 6, y - 6, 0, x, y, radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, colorSet.primary);
    gradient.addColorStop(1, colorSet.secondary);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Orb border
    ctx.strokeStyle = colorSet.secondary;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Inner shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(x - 6, y - 7, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    
    // Rotating particles
    for (let i = 0; i < 3; i++) {
      const angle = time * 3 + (Math.PI * 2 / 3) * i;
      const particleX = x + Math.cos(angle) * (radius + 12);
      const particleY = y + Math.sin(angle) * (radius + 12);
      
      ctx.fillStyle = colorSet.primary;
      ctx.beginPath();
      ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  renderPad(x, baseY, obs) {
    const ctx = this.ctx;
    const time = this.animTime;
    const glow = 0.7 + Math.sin(time * 6) * 0.3;
    
    const colors = {
      'pad_yellow': { primary: '#f1c40f', secondary: '#f39c12' },
      'pad_pink': { primary: '#e91e63', secondary: '#c2185b' },
      'pad_red': { primary: '#e74c3c', secondary: '#c0392b' },
      'pad_blue': { primary: '#3498db', secondary: '#2980b9' }
    };
    
    const colorSet = colors[obs.type] || colors['pad_yellow'];
    
    // Pad glow
    if (this.settings.showGlow) {
      ctx.shadowColor = colorSet.primary;
      ctx.shadowBlur = 15 * glow;
    }
    
    // Pad body
    const padWidth = 55;
    const padHeight = 18;
    
    const gradient = ctx.createLinearGradient(x, baseY, x, baseY - padHeight);
    gradient.addColorStop(0, colorSet.secondary);
    gradient.addColorStop(0.5, colorSet.primary);
    gradient.addColorStop(1, colorSet.secondary);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + padWidth / 2, baseY - padHeight);
    ctx.lineTo(x + padWidth, baseY);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Pad outline
    ctx.strokeStyle = colorSet.secondary;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Arrow indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const arrowY = baseY - padHeight * 0.5;
    ctx.beginPath();
    ctx.moveTo(x + padWidth * 0.4, arrowY);
    ctx.lineTo(x + padWidth * 0.5, arrowY - 6);
    ctx.lineTo(x + padWidth * 0.6, arrowY);
    ctx.closePath();
    ctx.fill();
  }
  
  renderGravityPortal(x, baseY, obs) {
    const ctx = this.ctx;
    const time = this.animTime;
    const height = 150;
    const width = 50;
    const isFlip = obs.type === 'portal_gravity';
    
    // Portal colors
    const color = isFlip ? '#9b59b6' : '#3498db';
    const secondaryColor = isFlip ? '#8e44ad' : '#2980b9';
    
    // Outer glow
    if (this.settings.showGlow) {
      const glowGradient = ctx.createRadialGradient(
        x + width / 2, baseY - height / 2, 0,
        x + width / 2, baseY - height / 2, width * 2
      );
      glowGradient.addColorStop(0, this.hexToRGBA(color, 0.4));
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(x - width, baseY - height - 20, width * 4, height + 40);
    }
    
    // Portal frame
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x + width / 2, baseY - height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner swirl effect
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const offset = time * 2 + i * (Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.ellipse(
        x + width / 2, 
        baseY - height / 2, 
        (width / 2 - 8) * (1 - i * 0.2), 
        (height / 2 - 8) * (1 - i * 0.2), 
        offset, 
        0, 
        Math.PI * 1.5
      );
      ctx.stroke();
    }
    
    // Center glow
    const centerGradient = ctx.createRadialGradient(
      x + width / 2, baseY - height / 2, 0,
      x + width / 2, baseY - height / 2, width / 2
    );
    centerGradient.addColorStop(0, this.hexToRGBA(color, 0.6));
    centerGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.ellipse(x + width / 2, baseY - height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Direction indicator
    ctx.fillStyle = '#ffffff';
    const arrowY = baseY - height / 2;
    const arrowDir = isFlip ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(x + width / 2 - 8, arrowY);
    ctx.lineTo(x + width / 2, arrowY - 15 * arrowDir);
    ctx.lineTo(x + width / 2 + 8, arrowY);
    ctx.closePath();
    ctx.fill();
  }
  
  renderSawblade(x, baseY, obs) {
    const ctx = this.ctx;
    const time = this.animTime;
    const isSmall = obs.type === 'sawblade_small';
    const size = isSmall ? 30 : 50;
    const rotation = time * 5;
    const y = baseY - size / 2;
    
    ctx.save();
    ctx.translate(x + size / 2, y);
    ctx.rotate(rotation);
    
    // Sawblade glow
    if (this.settings.showGlow) {
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 15;
    }
    
    // Sawblade body
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
    gradient.addColorStop(0, '#666');
    gradient.addColorStop(0.5, '#444');
    gradient.addColorStop(1, '#222');
    
    ctx.fillStyle = gradient;
    
    // Draw saw teeth
    const teeth = 8;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const angle = (Math.PI * 2 / teeth) * i;
      const nextAngle = (Math.PI * 2 / teeth) * (i + 0.5);
      
      const outerX = Math.cos(angle) * (size / 2);
      const outerY = Math.sin(angle) * (size / 2);
      const innerX = Math.cos(nextAngle) * (size / 3);
      const innerY = Math.sin(nextAngle) * (size / 3);
      
      if (i === 0) ctx.moveTo(outerX, outerY);
      else ctx.lineTo(outerX, outerY);
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Center
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(0, 0, size / 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  renderEndPortal(x) {
    const ctx = this.ctx;
    const state = this.engine.state;
    const time = this.animTime;
    const height = state.groundY;
    
    // Wide gradient glow
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(46, 204, 113, ${0.12 - i * 0.02})`;
      ctx.fillRect(x - 50 - i * 15, 0, 100 + i * 30, height);
    }
    
    // Portal beams
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 3;
    for (let i = 0; i < 15; i++) {
      const offset = Math.sin(time * 2 + i * 0.6) * 15;
      ctx.globalAlpha = 0.5 + Math.sin(time * 3 + i) * 0.3;
      ctx.beginPath();
      ctx.moveTo(x + offset, i * (height / 15));
      ctx.lineTo(x + offset, (i + 1) * (height / 15));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    
    // Central column
    const columnGradient = ctx.createLinearGradient(x - 20, 0, x + 20, 0);
    columnGradient.addColorStop(0, 'transparent');
    columnGradient.addColorStop(0.5, 'rgba(46, 204, 113, 0.4)');
    columnGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = columnGradient;
    ctx.fillRect(x - 20, 0, 40, height);
    
    // "FINISH" text
    ctx.save();
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2ecc71';
    ctx.shadowColor = '#2ecc71';
    ctx.shadowBlur = 20;
    ctx.fillText('FINISH', x, height / 2);
    ctx.restore();
    
    // Sparkles
    for (let i = 0; i < 8; i++) {
      const sparkleY = (time * 100 + i * (height / 8)) % height;
      const sparkleX = x + Math.sin(time * 2 + i) * 20;
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // ==================== PLAYER ====================
  
  renderTrails() {
    if (!this.settings.showTrails) return;
    
    const ctx = this.ctx;
    const state = this.engine.state;
    const color = this.engine.playerColors.primary;
    
    state.trails.forEach(trail => {
      const alpha = (trail.life / trail.maxLife) * 0.4;
      const size = trail.size * (trail.life / trail.maxLife);
      
      ctx.save();
      ctx.translate(trail.x, trail.y);
      ctx.rotate(trail.rotation * Math.PI / 180);
      ctx.globalAlpha = alpha;
      
      ctx.fillStyle = color;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      
      ctx.restore();
    });
    
    ctx.globalAlpha = 1;
  }
  
  renderPlayer() {
    const ctx = this.ctx;
    const player = this.engine.state.player;
    
    if (player.isDead) return;
    
    const colors = this.engine.playerColors;
    
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.rotation * Math.PI / 180);
    
    // Player glow
    if (this.settings.showGlow) {
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 25;
    }
    
    const halfSize = player.width / 2;
    
    // Player body gradient
    const gradient = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
    gradient.addColorStop(0, this.lightenColor(colors.primary, 30));
    gradient.addColorStop(0.5, colors.primary);
    gradient.addColorStop(1, this.darkenColor(colors.primary, 20));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(-halfSize, -halfSize, player.width, player.height);
    
    ctx.shadowBlur = 0;
    
    // Player border
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 3;
    ctx.strokeRect(-halfSize, -halfSize, player.width, player.height);
    
    // Inner shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(-halfSize + 4, -halfSize + 4, player.width - 8, player.height * 0.4);
    
    // Inner pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-halfSize + 8, -halfSize + 8, player.width - 16, player.height - 16);
    
    // Bottom shadow inside
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(-halfSize + 2, halfSize - player.height * 0.2, player.width - 4, player.height * 0.18);
    
    ctx.restore();
  }
  
  // ==================== PARTICLES ====================
  
  renderParticles() {
    if (!this.settings.showParticles) return;
    
    const ctx = this.ctx;
    const state = this.engine.state;
    
    state.particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      
      ctx.save();
      
      if (p.rotation !== undefined) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.translate(-p.x, -p.y);
      }
      
      switch (p.type) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'square':
          const halfSize = (p.size * alpha) / 2;
          ctx.fillRect(p.x - halfSize, p.y - halfSize, p.size * alpha, p.size * alpha);
          break;
          
        case 'star':
          this.drawStar(p.x, p.y, 5, p.size * alpha, p.size * alpha * 0.4);
          ctx.fill();
          break;
      }
      
      ctx.restore();
    });
    
    ctx.globalAlpha = 1;
  }
  
  renderForegroundEffects() {
    // Vignette
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.3,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.8
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  // ==================== HELPER FUNCTIONS ====================
  
  drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    const ctx = this.ctx;
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }
  
  hexToRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  hexToHSL(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  
  lightenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
  }
  
  darkenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameRenderer };
}
