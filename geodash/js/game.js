/**
 * ==================== GEOMETRY DASH CLONE ====================
 * Main game controller - ties everything together
 * Handles initialization, game loop, UI, and input
 */

// ==================== GLOBAL STATE ====================

let game = null;
let renderer = null;
let currentScreen = 'menu'; // menu, levelSelect, game, practice, settings
let selectedLevel = 0;
let practiceMode = false;
let settingsData = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  showFPS: false,
  lowDetail: false,
  autoRetry: true
};

// ==================== DOM ELEMENTS ====================

const elements = {
  // Screens
  menuScreen: null,
  levelSelectScreen: null,
  gameContainer: null,
  settingsScreen: null,
  pauseScreen: null,
  gameOverScreen: null,
  victoryScreen: null,
  
  // Canvas
  canvas: null,
  
  // UI elements
  progressBar: null,
  progressText: null,
  attemptCounter: null,
  fpsCounter: null,
  
  // Level grid
  levelGrid: null
};

// ==================== INITIALIZATION ====================

function initGame() {
  // Get DOM elements
  cacheElements();
  
  // Initialize game engine
  initEngine();
  
  // Create level cards
  createLevelCards();
  
  // Load saved settings
  loadSettings();
  
  // Setup event listeners
  setupEventListeners();
  
  // Start on menu
  showScreen('menu');
  
  // Start game loop
  requestAnimationFrame(gameLoop);
  
  console.log('🎮 Geometry Dash Clone initialized!');
}

function cacheElements() {
  elements.menuScreen = document.getElementById('menuScreen');
  elements.levelSelectScreen = document.getElementById('levelSelectScreen');
  elements.gameContainer = document.getElementById('gameContainer');
  elements.settingsScreen = document.getElementById('settingsScreen');
  elements.pauseScreen = document.getElementById('pauseScreen');
  elements.gameOverScreen = document.getElementById('gameOverScreen');
  elements.victoryScreen = document.getElementById('victoryScreen');
  
  elements.canvas = document.getElementById('gameCanvas');
  
  elements.progressBar = document.getElementById('progressBar');
  elements.progressText = document.getElementById('progressText');
  elements.attemptCounter = document.getElementById('attemptCounter');
  elements.fpsCounter = document.getElementById('fpsCounter');
  
  elements.levelGrid = document.getElementById('levelGrid');
}

function initEngine() {
  const canvas = elements.canvas;
  
  // Resize canvas to window size
  resizeCanvas();
  
  // Create game engine
  game = new GameEngine(canvas);
  
  // Create renderer
  renderer = new GameRenderer(game);
  
  // Apply low detail mode if set
  if (settingsData.lowDetail) {
    renderer.settings.showParticles = false;
    renderer.settings.showGlow = false;
    renderer.settings.showTrails = false;
  }
}

function resizeCanvas() {
  const canvas = elements.canvas;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  if (game) {
    game.resize(canvas.width, canvas.height);
  }
}

// ==================== SCREEN MANAGEMENT ====================

function showScreen(screen) {
  // Hide all screens
  elements.menuScreen.classList.remove('active');
  elements.levelSelectScreen.classList.remove('active');
  elements.gameContainer.classList.remove('active');
  elements.settingsScreen.classList.remove('active');
  elements.pauseScreen.classList.remove('active');
  elements.gameOverScreen.classList.remove('active');
  elements.victoryScreen.classList.remove('active');
  
  currentScreen = screen;
  
  switch (screen) {
    case 'menu':
      elements.menuScreen.classList.add('active');
      break;
    case 'levelSelect':
      elements.levelSelectScreen.classList.add('active');
      updateLevelCards();
      break;
    case 'game':
      elements.gameContainer.classList.add('active');
      break;
    case 'settings':
      elements.settingsScreen.classList.add('active');
      updateSettingsUI();
      break;
    case 'pause':
      elements.pauseScreen.classList.add('active');
      break;
    case 'gameOver':
      elements.gameOverScreen.classList.add('active');
      break;
    case 'victory':
      elements.victoryScreen.classList.add('active');
      break;
  }
}

// ==================== LEVEL CARDS ====================

function createLevelCards() {
  const grid = elements.levelGrid;
  if (!grid) return;
  
  grid.innerHTML = '';
  
  LEVELS.forEach((level, index) => {
    const card = document.createElement('div');
    card.className = 'level-card';
    card.dataset.index = index;
    
    card.innerHTML = `
      <div class="level-card-bg" style="background: linear-gradient(135deg, ${level.color}40, ${level.color}20);"></div>
      <div class="level-card-content">
        <div class="level-number">${index + 1}</div>
        <div class="level-name">${level.name}</div>
        <div class="level-difficulty">
          <span class="difficulty-label">${level.difficulty}</span>
          <div class="difficulty-stars">
            ${generateStars(getDifficultyStars(level.difficulty))}
          </div>
        </div>
        <div class="level-progress">
          <div class="level-progress-bar" style="width: 0%"></div>
        </div>
        <div class="level-info">
          <span class="level-length">${level.length}</span>
          <span class="level-coins">
            <span class="coin-icon">🪙</span>
            <span class="coin-count">0/3</span>
          </span>
        </div>
        <div class="level-buttons">
          <button class="level-play-btn" onclick="startLevel(${index})">
            <span class="play-icon">▶</span>
          </button>
          <button class="level-practice-btn" onclick="startPractice(${index})">
            <span class="practice-icon">🔧</span>
          </button>
        </div>
        <div class="level-locked" style="display: none;">
          <span class="lock-icon">🔒</span>
        </div>
      </div>
    `;
    
    grid.appendChild(card);
  });
}

function generateStars(count) {
  let stars = '';
  for (let i = 0; i < 10; i++) {
    if (i < count) {
      stars += '<span class="star filled">★</span>';
    } else {
      stars += '<span class="star">☆</span>';
    }
  }
  return stars;
}

function getDifficultyStars(difficulty) {
  const starMap = {
    'Easy': 1,
    'Normal': 2,
    'Hard': 4,
    'Harder': 5,
    'Insane': 7,
    'Easy Demon': 8,
    'Medium Demon': 9,
    'Hard Demon': 10
  };
  return starMap[difficulty] || 3;
}

function updateLevelCards() {
  const progress = game.loadProgress();
  const cards = document.querySelectorAll('.level-card');
  
  cards.forEach((card, index) => {
    const levelProgress = progress.levels && progress.levels[index] 
      ? progress.levels[index] 
      : { completed: false, attempts: 0, progress: 0, coins: [] };
    
    // Update progress bar
    const progressBar = card.querySelector('.level-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${levelProgress.progress || 0}%`;
    }
    
    // Update coin count
    const coinCount = card.querySelector('.coin-count');
    if (coinCount) {
      const collected = levelProgress.coins ? levelProgress.coins.length : 0;
      coinCount.textContent = `${collected}/3`;
    }
    
    // Show completion indicator
    if (levelProgress.completed) {
      card.classList.add('completed');
    }
    
    // Check if locked (must complete previous level)
    const isLocked = index > 0 && (!progress.levels || !progress.levels[index - 1]?.completed);
    const lockOverlay = card.querySelector('.level-locked');
    const playBtn = card.querySelector('.level-play-btn');
    const practiceBtn = card.querySelector('.level-practice-btn');
    
    if (isLocked && index > 2) { // First 3 levels always unlocked
      lockOverlay.style.display = 'flex';
      playBtn.disabled = true;
      practiceBtn.disabled = true;
    } else {
      lockOverlay.style.display = 'none';
      playBtn.disabled = false;
      practiceBtn.disabled = false;
    }
  });
}

// ==================== GAME CONTROL ====================

function startLevel(levelIndex) {
  selectedLevel = levelIndex;
  practiceMode = false;
  
  game.loadLevel(levelIndex);
  showScreen('game');
  
  updateGameUI();
}

function startPractice(levelIndex) {
  selectedLevel = levelIndex;
  practiceMode = true;
  
  game.loadLevel(levelIndex);
  game.state.practiceMode = true;
  showScreen('game');
  
  updateGameUI();
}

function pauseGame() {
  if (currentScreen !== 'game') return;
  
  game.state.isPaused = true;
  showScreen('pause');
}

function resumeGame() {
  game.state.isPaused = false;
  showScreen('game');
}

function restartLevel() {
  game.resetLevel();
  showScreen('game');
  updateGameUI();
}

function exitToMenu() {
  game.state.isRunning = false;
  showScreen('menu');
}

function exitToLevelSelect() {
  game.state.isRunning = false;
  showScreen('levelSelect');
}

function nextLevel() {
  if (selectedLevel < LEVELS.length - 1) {
    startLevel(selectedLevel + 1);
  } else {
    exitToLevelSelect();
  }
}

// ==================== GAME LOOP ====================

let lastTime = 0;
let fps = 0;
let frameCount = 0;
let fpsTime = 0;

function gameLoop(currentTime) {
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  
  // FPS calculation
  frameCount++;
  fpsTime += deltaTime;
  if (fpsTime >= 1) {
    fps = Math.round(frameCount / fpsTime);
    frameCount = 0;
    fpsTime = 0;
    
    if (settingsData.showFPS && elements.fpsCounter) {
      elements.fpsCounter.textContent = `FPS: ${fps}`;
      elements.fpsCounter.style.display = 'block';
    }
  }
  
  // Only update game when in game screen
  if (currentScreen === 'game' && game && game.state.isRunning && !game.state.isPaused) {
    // Update game logic
    game.update();
    
    // Update UI
    updateGameUI();
    
    // Check for game over
    if (game.state.player.isDead) {
      handleGameOver();
    }
    
    // Check for victory
    if (game.state.isComplete) {
      handleVictory();
    }
    
    // Render
    if (renderer) {
      renderer.render();
    }
    
    // Render UI overlay
    renderUIOverlay();
  } else if (currentScreen === 'game' && renderer) {
    // Still render when paused
    renderer.render();
    renderUIOverlay();
  }
  
  requestAnimationFrame(gameLoop);
}

function updateGameUI() {
  if (!game) return;
  
  // Update progress bar
  const progress = game.state.progress;
  if (elements.progressBar) {
    elements.progressBar.style.width = `${progress}%`;
  }
  if (elements.progressText) {
    elements.progressText.textContent = `${Math.floor(progress)}%`;
  }
  
  // Update attempts
  if (elements.attemptCounter) {
    elements.attemptCounter.textContent = `Attempt ${game.state.attempts}`;
  }
}

function renderUIOverlay() {
  const ctx = game.ctx;
  const state = game.state;
  
  // Practice mode checkpoints
  if (practiceMode && state.checkpoints.length > 0) {
    ctx.fillStyle = 'rgba(46, 204, 113, 0.8)';
    ctx.font = '14px Arial';
    ctx.fillText(`Checkpoints: ${state.checkpoints.length}`, 10, 60);
  }
  
  // Coins collected
  const coinsCollected = state.obstacles.filter(o => 
    (o.type === 'coin' || o.type === 'secret_coin') && o.collected
  ).length;
  
  ctx.fillStyle = '#f1c40f';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`🪙 ${coinsCollected}`, game.canvas.width - 20, 40);
  ctx.textAlign = 'left';
}

// ==================== GAME EVENTS ====================

function handleGameOver() {
  // Auto retry if enabled
  if (settingsData.autoRetry && !practiceMode) {
    setTimeout(() => {
      if (currentScreen === 'game') {
        restartLevel();
      }
    }, 1000);
    return;
  }
  
  // Update game over screen
  const percentText = document.getElementById('gameOverPercent');
  if (percentText) {
    percentText.textContent = `${Math.floor(game.state.progress)}%`;
  }
  
  showScreen('gameOver');
}

function handleVictory() {
  // Update victory screen
  const victoryLevelName = document.getElementById('victoryLevelName');
  const victoryAttempts = document.getElementById('victoryAttempts');
  const victoryCoins = document.getElementById('victoryCoins');
  
  if (victoryLevelName) {
    victoryLevelName.textContent = game.state.currentLevel.name;
  }
  if (victoryAttempts) {
    victoryAttempts.textContent = game.state.attempts;
  }
  if (victoryCoins) {
    const coins = game.state.obstacles.filter(o => 
      (o.type === 'coin' || o.type === 'secret_coin') && o.collected
    ).length;
    victoryCoins.textContent = coins;
  }
  
  showScreen('victory');
}

// ==================== INPUT HANDLING ====================

function setupEventListeners() {
  // Window resize
  window.addEventListener('resize', resizeCanvas);
  
  // Keyboard input
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  
  // Mouse/Touch input for game
  if (elements.canvas) {
    elements.canvas.addEventListener('mousedown', handleGameInput);
    elements.canvas.addEventListener('mouseup', handleGameInputEnd);
    elements.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    elements.canvas.addEventListener('touchend', handleTouchEnd);
  }
  
  // Prevent context menu
  document.addEventListener('contextmenu', e => {
    if (currentScreen === 'game') e.preventDefault();
  });
}

function handleKeyDown(e) {
  // Game controls
  if (currentScreen === 'game' && game && game.state.isRunning) {
    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        e.preventDefault();
        game.handleInput(true);
        break;
      case 'Escape':
      case 'KeyP':
        e.preventDefault();
        pauseGame();
        break;
      case 'KeyR':
        e.preventDefault();
        restartLevel();
        break;
    }
  }
  
  // Menu navigation
  if (currentScreen === 'pause') {
    switch (e.code) {
      case 'Escape':
        e.preventDefault();
        resumeGame();
        break;
    }
  }
  
  // Game over
  if (currentScreen === 'gameOver') {
    switch (e.code) {
      case 'Space':
      case 'Enter':
        e.preventDefault();
        restartLevel();
        break;
      case 'Escape':
        e.preventDefault();
        exitToLevelSelect();
        break;
    }
  }
  
  // Victory
  if (currentScreen === 'victory') {
    switch (e.code) {
      case 'Space':
      case 'Enter':
        e.preventDefault();
        nextLevel();
        break;
      case 'Escape':
        e.preventDefault();
        exitToLevelSelect();
        break;
    }
  }
}

function handleKeyUp(e) {
  if (currentScreen === 'game' && game && game.state.isRunning) {
    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        game.handleInput(false);
        break;
    }
  }
}

function handleGameInput(e) {
  if (game && game.state.isRunning && !game.state.isPaused) {
    game.handleInput(true);
  }
}

function handleGameInputEnd(e) {
  if (game && game.state.isRunning) {
    game.handleInput(false);
  }
}

function handleTouchStart(e) {
  e.preventDefault();
  handleGameInput(e);
}

function handleTouchEnd(e) {
  handleGameInputEnd(e);
}

// ==================== SETTINGS ====================

function loadSettings() {
  try {
    const saved = localStorage.getItem('gdCloneSettings');
    if (saved) {
      settingsData = { ...settingsData, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

function saveSettings() {
  try {
    localStorage.setItem('gdCloneSettings', JSON.stringify(settingsData));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function updateSettingsUI() {
  const musicSlider = document.getElementById('musicVolume');
  const sfxSlider = document.getElementById('sfxVolume');
  const fpsToggle = document.getElementById('showFPS');
  const lowDetailToggle = document.getElementById('lowDetail');
  const autoRetryToggle = document.getElementById('autoRetry');
  
  if (musicSlider) musicSlider.value = settingsData.musicVolume * 100;
  if (sfxSlider) sfxSlider.value = settingsData.sfxVolume * 100;
  if (fpsToggle) fpsToggle.checked = settingsData.showFPS;
  if (lowDetailToggle) lowDetailToggle.checked = settingsData.lowDetail;
  if (autoRetryToggle) autoRetryToggle.checked = settingsData.autoRetry;
}

function updateSetting(key, value) {
  settingsData[key] = value;
  saveSettings();
  
  // Apply settings
  if (key === 'lowDetail' && renderer) {
    renderer.settings.showParticles = !value;
    renderer.settings.showGlow = !value;
    renderer.settings.showTrails = !value;
  }
  
  if (key === 'showFPS' && elements.fpsCounter) {
    elements.fpsCounter.style.display = value ? 'block' : 'none';
  }
}

// ==================== AUDIO (Placeholder) ====================

const audio = {
  music: null,
  sounds: {},
  
  init() {
    // Audio will be implemented when sound files are added
    console.log('Audio system ready (no audio files loaded)');
  },
  
  playMusic(track) {
    // Placeholder
  },
  
  stopMusic() {
    // Placeholder
  },
  
  playSound(name) {
    // Placeholder
  },
  
  setMusicVolume(vol) {
    // Placeholder
  },
  
  setSFXVolume(vol) {
    // Placeholder
  }
};

// ==================== UTILITY FUNCTIONS ====================

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ==================== INITIALIZE ON LOAD ====================

document.addEventListener('DOMContentLoaded', initGame);

// Also try to init if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initGame, 1);
}

// ==================== EXPOSE TO GLOBAL SCOPE ====================

window.startLevel = startLevel;
window.startPractice = startPractice;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
window.restartLevel = restartLevel;
window.exitToMenu = exitToMenu;
window.exitToLevelSelect = exitToLevelSelect;
window.nextLevel = nextLevel;
window.showScreen = showScreen;
window.updateSetting = updateSetting;
