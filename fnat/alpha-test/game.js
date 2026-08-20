// FNAF Alpha Test - Game Logic

// Game State
const gameState = {
    night: 1,
    hour: 0, // 0 = 12 AM, 1 = 1 AM, etc.
    power: 100,
    powerUsage: 1,
    gameRunning: false,
    camerasUp: false,
    leftDoor: false, // false = open, true = closed
    rightDoor: false,
    leftLight: false,
    rightLight: false,
    currentCamera: '1A',
    gameOver: false,
    won: false
};

// Animatronic positions and AI
const animatronics = {
    freddy: {
        name: 'Freddy',
        position: '1A', // Start on show stage
        aiLevel: 0,
        color: 'freddy',
        movementPattern: ['1A', '1B', '2A', '2B', '4A', '4B', 'OFFICE']
    },
    bonnie: {
        name: 'Bonnie',
        position: '1A',
        aiLevel: 0,
        color: 'bonnie',
        movementPattern: ['1A', '1B', '3', '2A', '2B', '4A', '4B', 'LEFT_DOOR']
    },
    chica: {
        name: 'Chica',
        position: '1A',
        aiLevel: 0,
        color: 'chica',
        movementPattern: ['1A', '1B', '6', '7', '4A', '4B', 'RIGHT_DOOR']
    },
    foxy: {
        name: 'Foxy',
        position: '1C',
        aiLevel: 0,
        color: 'foxy',
        stage: 0, // 0-3 stages before running
        movementPattern: ['1C', 'LEFT_DOOR']
    }
};

// Camera names
const cameraNames = {
    '1A': 'Show Stage',
    '1B': 'Dining Area',
    '1C': 'Pirate Cove',
    '2A': 'West Hall',
    '2B': 'West Hall Corner',
    '3': 'Supply Closet',
    '4A': 'East Hall',
    '4B': 'East Hall Corner',
    '5': 'Backstage',
    '6': 'Kitchen',
    '7': 'Restrooms'
};

// DOM Elements
const elements = {
    gameTime: document.getElementById('game-time'),
    gameNight: document.getElementById('game-night'),
    powerValue: document.getElementById('power-value'),
    powerFill: document.getElementById('power-fill'),
    usageBars: document.getElementById('usage-bars'),
    ipadContainer: document.getElementById('ipad-container'),
    cameraToggle: document.getElementById('camera-toggle'),
    cameraName: document.getElementById('camera-name'),
    camTimestamp: document.getElementById('cam-timestamp'),
    cameraView: document.getElementById('camera-view'),
    cameraStatic: document.querySelector('.camera-static'),
    camAnimatronic: document.getElementById('cam-animatronic'),
    leftDoor: document.getElementById('left-door'),
    rightDoor: document.getElementById('right-door'),
    leftAnimatronic: document.getElementById('left-animatronic'),
    rightAnimatronic: document.getElementById('right-animatronic'),
    gameOver: document.getElementById('game-over'),
    winScreen: document.getElementById('win-screen')
};

// Initialize game
function initGame() {
    // Set AI levels based on night
    setAILevels();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start game loop
    gameState.gameRunning = true;
    startGameLoop();
    
    // Update initial display
    updateDisplay();
    
    console.log('FNAF Alpha Test initialized!');
}

// Set AI levels based on night
function setAILevels() {
    switch(gameState.night) {
        case 1:
            animatronics.freddy.aiLevel = 0;
            animatronics.bonnie.aiLevel = 3;
            animatronics.chica.aiLevel = 3;
            animatronics.foxy.aiLevel = 2;
            break;
        case 2:
            animatronics.freddy.aiLevel = 0;
            animatronics.bonnie.aiLevel = 5;
            animatronics.chica.aiLevel = 4;
            animatronics.foxy.aiLevel = 3;
            break;
        default:
            animatronics.freddy.aiLevel = gameState.night;
            animatronics.bonnie.aiLevel = Math.min(20, gameState.night * 2);
            animatronics.chica.aiLevel = Math.min(20, gameState.night * 2);
            animatronics.foxy.aiLevel = Math.min(20, gameState.night);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Camera toggle
    elements.cameraToggle.addEventListener('click', toggleCameras);
    
    // Camera buttons
    document.querySelectorAll('.cam-btn').forEach(btn => {
        btn.addEventListener('click', () => switchCamera(btn.dataset.cam));
    });
    
    // Door buttons
    document.querySelectorAll('.door-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleDoor(btn.dataset.door));
    });
    
    // Light buttons
    document.querySelectorAll('.light-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleLight(btn.dataset.light));
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeypress);
}

// Handle keyboard shortcuts
function handleKeypress(e) {
    switch(e.key.toLowerCase()) {
        case ' ': // Space for cameras
            e.preventDefault();
            toggleCameras();
            break;
        case 'q': // Q for left door
            toggleDoor('left');
            break;
        case 'e': // E for right door
            toggleDoor('right');
            break;
        case 'a': // A for left light
            toggleLight('left');
            break;
        case 'd': // D for right light
            toggleLight('right');
            break;
    }
}

// Toggle cameras
function toggleCameras() {
    if (gameState.power <= 0) return;
    
    gameState.camerasUp = !gameState.camerasUp;
    elements.ipadContainer.classList.toggle('active', gameState.camerasUp);
    elements.cameraToggle.classList.toggle('active', gameState.camerasUp);
    
    if (gameState.camerasUp) {
        showStaticEffect();
        updateCameraView();
    }
    
    updatePowerUsage();
}

// Switch camera
function switchCamera(camId) {
    gameState.currentCamera = camId;
    
    // Update active button
    document.querySelectorAll('.cam-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cam === camId);
    });
    
    showStaticEffect();
    updateCameraView();
}

// Update camera view
function updateCameraView() {
    const cam = gameState.currentCamera;
    elements.cameraName.textContent = `CAM ${cam} - ${cameraNames[cam] || 'Unknown'}`;
    
    // Check which animatronic is at this camera
    let animatronicAtCam = null;
    for (const [key, anim] of Object.entries(animatronics)) {
        if (anim.position === cam) {
            animatronicAtCam = anim;
            break;
        }
    }
    
    // Update animatronic display
    if (animatronicAtCam && cam !== 'LEFT_DOOR' && cam !== 'RIGHT_DOOR' && cam !== 'OFFICE') {
        elements.camAnimatronic.style.display = 'block';
        elements.camAnimatronic.className = 'animatronic ' + animatronicAtCam.color;
    } else {
        elements.camAnimatronic.style.display = 'none';
    }
    
    // Update camera buttons to show which have animatronics
    document.querySelectorAll('.cam-btn').forEach(btn => {
        const hasSomeone = Object.values(animatronics).some(a => a.position === btn.dataset.cam);
        btn.classList.toggle('has-animatronic', hasSomeone);
    });
}

// Show static effect
function showStaticEffect() {
    elements.cameraStatic.classList.add('active');
    setTimeout(() => {
        elements.cameraStatic.classList.remove('active');
    }, 200);
}

// Toggle door
function toggleDoor(side) {
    if (gameState.power <= 0) return;
    
    if (side === 'left') {
        gameState.leftDoor = !gameState.leftDoor;
        elements.leftDoor.classList.toggle('closed', gameState.leftDoor);
    } else {
        gameState.rightDoor = !gameState.rightDoor;
        elements.rightDoor.classList.toggle('closed', gameState.rightDoor);
    }
    
    // Update button state
    const btn = document.querySelector(`.door-btn[data-door="${side}"]`);
    btn.classList.toggle('active', side === 'left' ? gameState.leftDoor : gameState.rightDoor);
    
    updatePowerUsage();
}

// Toggle light
function toggleLight(side) {
    if (gameState.power <= 0) return;
    
    if (side === 'left') {
        gameState.leftLight = !gameState.leftLight;
        const hallway = document.querySelector('.door-area.left .hallway');
        hallway.classList.toggle('lit', gameState.leftLight);
        
        // Show animatronic if at door
        if (gameState.leftLight) {
            const atDoor = Object.values(animatronics).some(a => a.position === 'LEFT_DOOR');
            elements.leftAnimatronic.classList.toggle('visible', atDoor);
        } else {
            elements.leftAnimatronic.classList.remove('visible');
        }
    } else {
        gameState.rightLight = !gameState.rightLight;
        const hallway = document.querySelector('.door-area.right .hallway');
        hallway.classList.toggle('lit', gameState.rightLight);
        
        // Show animatronic if at door
        if (gameState.rightLight) {
            const atDoor = Object.values(animatronics).some(a => a.position === 'RIGHT_DOOR');
            elements.rightAnimatronic.classList.toggle('visible', atDoor);
        } else {
            elements.rightAnimatronic.classList.remove('visible');
        }
    }
    
    // Update button state
    const btn = document.querySelector(`.light-btn[data-light="${side}"]`);
    btn.classList.toggle('active', side === 'left' ? gameState.leftLight : gameState.rightLight);
    
    updatePowerUsage();
}

// Update power usage
function updatePowerUsage() {
    let usage = 1; // Base usage
    
    if (gameState.leftDoor) usage++;
    if (gameState.rightDoor) usage++;
    if (gameState.leftLight) usage++;
    if (gameState.rightLight) usage++;
    if (gameState.camerasUp) usage++;
    
    gameState.powerUsage = usage;
    
    // Update usage bars display
    elements.usageBars.textContent = '▮'.repeat(usage);
}

// Update display
function updateDisplay() {
    // Time display
    const hour = gameState.hour === 0 ? 12 : gameState.hour;
    elements.gameTime.textContent = `${hour} AM`;
    elements.gameNight.textContent = `Night ${gameState.night}`;
    elements.camTimestamp.textContent = `${hour}:00 AM`;
    
    // Power display
    const power = Math.max(0, Math.floor(gameState.power));
    elements.powerValue.textContent = `${power}%`;
    elements.powerFill.style.width = `${power}%`;
    
    // Power bar color
    elements.powerFill.classList.remove('low', 'critical');
    if (power < 30) {
        elements.powerFill.classList.add('critical');
    } else if (power < 50) {
        elements.powerFill.classList.add('low');
    }
}

// Game loop variables
let gameLoopInterval;
let movementInterval;
let timeInterval;

// Start game loop
function startGameLoop() {
    // Power drain every second
    gameLoopInterval = setInterval(() => {
        if (!gameState.gameRunning) return;
        
        // Drain power based on usage
        const drain = gameState.powerUsage * 0.1;
        gameState.power -= drain;
        
        // Check power out
        if (gameState.power <= 0) {
            gameState.power = 0;
            powerOut();
        }
        
        updateDisplay();
    }, 1000);
    
    // Animatronic movement every 5 seconds
    movementInterval = setInterval(() => {
        if (!gameState.gameRunning) return;
        
        moveAnimatronics();
        checkAttacks();
        
        if (gameState.camerasUp) {
            updateCameraView();
        }
    }, 5000);
    
    // Time progression (1 hour = 90 seconds for testing, normally would be longer)
    timeInterval = setInterval(() => {
        if (!gameState.gameRunning) return;
        
        gameState.hour++;
        
        // Check win condition (6 AM)
        if (gameState.hour >= 6) {
            winGame();
        }
        
        updateDisplay();
    }, 90000); // 90 seconds per hour (7.5 min nights for testing)
}

// Move animatronics
function moveAnimatronics() {
    for (const [key, anim] of Object.entries(animatronics)) {
        // Roll for movement
        const roll = Math.floor(Math.random() * 20) + 1;
        
        if (roll <= anim.aiLevel) {
            // Foxy has special behavior
            if (key === 'foxy') {
                moveFoxy(anim);
            } else {
                moveRegularAnimatronic(anim);
            }
        }
    }
}

// Move regular animatronic
function moveRegularAnimatronic(anim) {
    const currentIndex = anim.movementPattern.indexOf(anim.position);
    
    if (currentIndex < anim.movementPattern.length - 1) {
        anim.position = anim.movementPattern[currentIndex + 1];
    }
}

// Move Foxy
function moveFoxy(foxy) {
    if (foxy.position === '1C') {
        foxy.stage++;
        
        // If player looks at pirate cove, can slow him down
        if (gameState.camerasUp && gameState.currentCamera === '1C') {
            foxy.stage = Math.max(0, foxy.stage - 1);
        }
        
        // Stage 4 = run to office
        if (foxy.stage >= 4) {
            foxy.position = 'LEFT_DOOR';
            foxy.stage = 0;
        }
    }
}

// Check for attacks
function checkAttacks() {
    for (const anim of Object.values(animatronics)) {
        // Check left door attack
        if (anim.position === 'LEFT_DOOR') {
            if (!gameState.leftDoor && !gameState.camerasUp) {
                // Attack!
                gameOver(anim);
                return;
            }
            // If door closed, send back
            if (gameState.leftDoor) {
                anim.position = anim.movementPattern[0];
            }
        }
        
        // Check right door attack
        if (anim.position === 'RIGHT_DOOR') {
            if (!gameState.rightDoor && !gameState.camerasUp) {
                // Attack!
                gameOver(anim);
                return;
            }
            // If door closed, send back
            if (gameState.rightDoor) {
                anim.position = anim.movementPattern[0];
            }
        }
        
        // Freddy office attack
        if (anim.position === 'OFFICE') {
            gameOver(anim);
            return;
        }
    }
}

// Power out sequence
function powerOut() {
    gameState.gameRunning = false;
    
    // Close everything
    gameState.leftDoor = false;
    gameState.rightDoor = false;
    gameState.leftLight = false;
    gameState.rightLight = false;
    gameState.camerasUp = false;
    
    elements.leftDoor.classList.remove('closed');
    elements.rightDoor.classList.remove('closed');
    elements.ipadContainer.classList.remove('active');
    
    document.querySelector('.game-container').classList.add('power-out');
    
    // Freddy attack after power out (randomized delay)
    setTimeout(() => {
        gameOver(animatronics.freddy);
    }, Math.random() * 20000 + 5000);
}

// Game over
function gameOver(animatronic) {
    gameState.gameRunning = false;
    gameState.gameOver = true;
    
    clearInterval(gameLoopInterval);
    clearInterval(movementInterval);
    clearInterval(timeInterval);
    
    // Set jumpscare animatronic color
    const jsHead = document.querySelector('.js-head');
    const jsBody = document.querySelector('.js-body');
    
    if (animatronic.color === 'bonnie') {
        jsHead.style.background = 'linear-gradient(180deg, #5555aa, #3a3a8b)';
        jsBody.style.background = 'linear-gradient(180deg, #5555aa, #3a3a8b)';
    } else if (animatronic.color === 'chica') {
        jsHead.style.background = 'linear-gradient(180deg, #e6c619, #c9a30a)';
        jsBody.style.background = 'linear-gradient(180deg, #e6c619, #c9a30a)';
    } else if (animatronic.color === 'foxy') {
        jsHead.style.background = 'linear-gradient(180deg, #aa3030, #8b2020)';
        jsBody.style.background = 'linear-gradient(180deg, #aa3030, #8b2020)';
    }
    
    elements.gameOver.classList.add('active');
    
    console.log(`Game Over! ${animatronic.name} got you!`);
}

// Win game
function winGame() {
    gameState.gameRunning = false;
    gameState.won = true;
    
    clearInterval(gameLoopInterval);
    clearInterval(movementInterval);
    clearInterval(timeInterval);
    
    elements.winScreen.classList.add('active');
    
    console.log('You survived the night!');
}

// Start the game when page loads
document.addEventListener('DOMContentLoaded', initGame);
