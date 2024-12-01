import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
  import { getAnalytics,  } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
  import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
   apiKey: "AIzaSyDkPsE0uD-1_V5_QfM-RhtaIviQlINW2DA",
   authDomain: "lcntests.firebaseapp.com",
   databaseURL: "https://lcntests-default-rtdb.firebaseio.com",
   projectId: "lcntests",
   storageBucket: "lcntests.firebasestorage.app",
   messagingSenderId: "665856876392",
   appId: "1:665856876392:web:c6274b52a9e90c3d6400dd",
   measurementId: "G-1D5Z4GYNMT"
 };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
   const db = getDatabase(app)

    // Elements
    // Select necessary DOM elements
const character = document.querySelector('.character');
const dpadButtons = document.querySelectorAll('.dpad-button');
const gameArea = document.querySelector('.game-area');

// Directions and corresponding deltas for movement
const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
};

// State to manage all players
const players = {
    player1: { x: 0, y: 0, facing: 'down', walking: false },
    player2: { x: 3, y: 3, facing: 'down', walking: false },
    // Add more players as needed
};

// Function to create player elements in the DOM
function createPlayerElement(playerId) {
    const player = document.createElement('div');
    player.classList.add('character');
    player.setAttribute('id', playerId);
    gameArea.appendChild(player);
}

// Function to update all player positions
function updatePlayers() {
    for (const playerId in players) {
        const playerData = players[playerId];
        const playerElement = document.querySelector(`#${playerId}`);

        // Update attributes and position
        playerElement.setAttribute('facing', playerData.facing);
        playerElement.setAttribute('walking', playerData.walking ? 'true' : 'false');
        playerElement.style.transform = `translate(${playerData.x * 32}px, ${playerData.y * 32}px)`;
    }
}

// Function to move a specific player
function movePlayer(playerId, direction) {
    const playerData = players[playerId];
    const delta = directions[direction];

    if (!delta) return; // Ignore invalid directions

    // Update player position and state
    playerData.x += delta.x;
    playerData.y += delta.y;
    playerData.facing = direction;
    playerData.walking = true;

    updatePlayers();

    // Stop walking animation after a short delay
    setTimeout(() => {
        playerData.walking = false;
        updatePlayers();
    }, 200);
}

// Add keyboard controls for player1 (example setup)
document.addEventListener('keydown', (event) => {
    const keyMap = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
    };
    const direction = keyMap[event.key];
    if (direction) movePlayer('player1', direction);
});

// Add keyboard controls for player2 (example WASD setup)
document.addEventListener('keydown', (event) => {
    const keyMap = {
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
    };
    const direction = keyMap[event.key.toLowerCase()];
    if (direction) movePlayer('player2', direction);
});

// Initialize players
Object.keys(players).forEach(createPlayerElement);
updatePlayers();