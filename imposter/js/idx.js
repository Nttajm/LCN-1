import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, deleteDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { 
  serverTimestamp, arrayUnion, arrayRemove, deleteField 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDkPsE0uD-1_V5_QfM-RhtaIviQlINW2DA",
  authDomain: "lcntests.firebaseapp.com",
  projectId: "lcntests",
  storageBucket: "jmblanks.appspot.com",
  messagingSenderId: "665856876392",
  appId: "1:665856876392:web:c6274b52a9e90c3d6400dd"
}; 

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Game state
let currentUser = null;
let currentParty = null;
let isHost = false;
let gameWords = [];
let unsubscribeParty = null;

// Default word bank
const defaultWordBank = [
  "apple","banana","ocean","mountain","computer","telephone","guitar","pizza",
  "elephant","butterfly","rainbow","thunder","castle","dragon","wizard","robot",
  "spaceship","treasure","island","forest","river","sunset","camera","bicycle",
  "chocolate","diamond","flower","lighthouse","penguin","volcano"
];

// Load saved words
function loadSavedWords() {
  const saved = localStorage.getItem('ameImporterWords');
  if (saved) {
    gameWords = JSON.parse(saved);
    updateWordsPreview();
  }
}

// Save words
function saveWords() {
  localStorage.setItem('ameImporterWords', JSON.stringify(gameWords));
}

// Navigation functions
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

function showMainPage() {
  showPage('mainPage');
  if (unsubscribeParty) {
    unsubscribeParty();
    unsubscribeParty = null;
  }
}

function showCreateParty() {
  if (!validatePlayerName()) return;
  showPage('createPage');
}

function showJoinParty() {
  if (!validatePlayerName()) return;
  showPage('joinPage');
}

function validatePlayerName() {
  const name = document.getElementById('playerName').value.trim();
  if (!name) {
    alert('Please enter your name first!');
    return false;
  }
  currentUser = name;
  return true;
}

// Party functions
function generatePartyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniquePartyCode() {
  let code, exists = true;
  while (exists) {
    code = generatePartyCode();
    const snap = await getDoc(doc(db, "parties", code));
    exists = snap.exists();
  }
  return code;
}

async function createParty() {
  const partyName = document.getElementById('partyName').value.trim();
  if (!partyName) {
    document.getElementById('createError').textContent = 'Please enter a party name';
    return;
  }

  try {
    const partyCode = await generateUniquePartyCode();
    const partyData = {
      name: partyName,
      code: partyCode,
      host: currentUser,
      players: [currentUser],
      words: gameWords,
      gameActive: false,
      createdAt: serverTimestamp()
    };

    await setDoc(doc(db, "parties", partyCode), partyData);

    currentParty = partyCode;
    isHost = true;
    showLobby();
  } catch (error) {
    document.getElementById('createError').textContent = 'Error creating party: ' + error.message;
  }
}

async function joinParty() {
  const partyCode = document.getElementById('partyCode').value.trim().toUpperCase();
  if (!partyCode) {
    document.getElementById('joinError').textContent = 'Please enter a party code';
    return;
  }

  try {
    const partyRef = doc(db, "parties", partyCode);
    const partyDoc = await getDoc(partyRef);

    if (!partyDoc.exists()) {
      document.getElementById('joinError').textContent = 'Party not found';
      return;
    }

    const partyData = partyDoc.data();

    if (partyData.players.includes(currentUser)) {
      document.getElementById('joinError').textContent = 'Name already taken in this party';
      return;
    }

    await updateDoc(partyRef, {
      players: arrayUnion(currentUser)
    });

    currentParty = partyCode;
    isHost = false;
    gameWords = partyData.words || [];
    updateWordsPreview();
    showLobby();
  } catch (error) {
    document.getElementById('joinError').textContent = 'Error joining party: ' + error.message;
  }
}

function showLobby() {
  showPage('lobbyPage');
  document.getElementById('lobbyCode').textContent = `Party Code: ${currentParty}`;

  if (isHost) {
    document.getElementById('hostControls').style.display = 'block';
    document.getElementById('playerControls').style.display = 'none';
  } else {
    document.getElementById('hostControls').style.display = 'none';
    document.getElementById('playerControls').style.display = 'block';
  }

  unsubscribeParty = onSnapshot(doc(db, "parties", currentParty), (docSnap) => {
    if (docSnap.exists()) {
      const partyData = docSnap.data();
      updatePlayersList(partyData.players);

      if (partyData.gameActive && partyData.gameAssignments) {
        showGameScreen(partyData.gameAssignments);
      } else if (!partyData.gameActive && document.getElementById('gamePage').classList.contains('active')) {
        showLobby();
      }
    }
  });
}

function updatePlayersList(players) {
  const playersList = document.getElementById('playersList');
  playersList.innerHTML = '';
  players.forEach(player => {
    const item = document.createElement('div');
    item.className = 'player-item';
    item.textContent = player;
    playersList.appendChild(item);
  });
}

async function leaveParty() {
  if (!currentParty) return;

  try {
    const ref = doc(db, "parties", currentParty);
    if (isHost) {
      await deleteDoc(ref);
    } else {
      await updateDoc(ref, {
        players: arrayRemove(currentUser)
      });
    }

    currentParty = null;
    isHost = false;
    showMainPage();
  } catch (error) {
    console.error('Error leaving party:', error);
  }
}

// Word bank functions
function showWordBankOption(option) {
  document.getElementById('manualWords').style.display = 'none';
  document.getElementById('pasteWords').style.display = 'none';
  document.getElementById('defaultWords').style.display = 'none';
  document.getElementById('clearWords').style.display = 'none';
  document.getElementById(option + 'Words').style.display = 'block';
}

function addWord() {
  const newWord = document.getElementById('newWord').value.trim();
  if (newWord && !gameWords.includes(newWord.toLowerCase())) {
    gameWords.push(newWord.toLowerCase());
    document.getElementById('newWord').value = '';
    updateWordsPreview();
    saveWords();
    updatePartyWords();
  }
}

function addWordsFromList() {
  const wordList = document.getElementById('wordList').value.trim();
  if (!wordList) return;

  const words = wordList.split(/[\n\t,]+/)
    .map(word => word.trim().toLowerCase())
    .filter(word => word && !gameWords.includes(word));
  
  gameWords.push(...words);
  document.getElementById('wordList').value = '';
  updateWordsPreview();
  saveWords();
  updatePartyWords();
}

function useDefaultWords() {
  gameWords = [...defaultWordBank];
  updateWordsPreview();
  saveWords();
  updatePartyWords();
}

function updateWordsPreview() {
  const preview = document.getElementById('wordsPreview');
  if (gameWords.length === 0) {
    preview.textContent = 'No words added yet';
  } else {
    preview.textContent = gameWords.join(', ');
  }
}

async function updatePartyWords() {
  if (currentParty && isHost) {
    try {
      await updateDoc(doc(db, "parties", currentParty), {
        words: gameWords
      });
    } catch (error) {
      console.error('Error updating party words:', error);
    }
  }
}

// Game functions
async function startGame() {
  if (gameWords.length === 0) {
    alert('Please add some words to the word bank first!');
    return;
  }

  try {
    const ref = doc(db, "parties", currentParty);
    const partyDoc = await getDoc(ref);
    const players = partyDoc.data().players;

    if (players.length < 2) {
      alert('You need at least 2 players to start the game!');
      return;
    }

    const randomWord = gameWords[Math.floor(Math.random() * gameWords.length)];
    const impostorIndex = Math.floor(Math.random() * players.length);

    const gameAssignments = {};
    players.forEach((p, i) => {
      gameAssignments[p] = {
        word: randomWord,
        isImpostor: i === impostorIndex
      };
    });

    await updateDoc(ref, {
      gameActive: true,
      gameAssignments: gameAssignments,
      gameWord: randomWord
    });
  } catch (error) {
    console.error('Error starting game:', error);
    alert('Error starting game');
  }
}

function showGameScreen(gameAssignments) {
  showPage('gamePage');
  
  const assignment = gameAssignments[currentUser];
  const roleIndicator = document.getElementById('roleIndicator');
  const gameWord = document.getElementById('gameWord');
  
  if (assignment.isImpostor) {
    roleIndicator.innerHTML = '🕵️ You are the IMPOSTOR!';
    roleIndicator.className = 'role-indicator role-impostor';
    gameWord.textContent = '???';
  } else {
    roleIndicator.innerHTML = '👥 You are a CIVILIAN';
    roleIndicator.className = 'role-indicator role-civilian';
    gameWord.textContent = assignment.word.toUpperCase();
  }
  
  if (isHost) {
    document.getElementById('hostGameControls').style.display = 'block';
    document.getElementById('playerGameControls').style.display = 'none';
  } else {
    document.getElementById('hostGameControls').style.display = 'none';
    document.getElementById('playerGameControls').style.display = 'block';
  }
}

async function endGame() {
  if (!isHost || !currentParty) return;

  try {
    await updateDoc(doc(db, "parties", currentParty), {
      gameActive: false,
      gameAssignments: deleteField()
    });
  } catch (error) {
    console.error('Error ending game:', error);
  }
}

// Event listeners setup
function setupEventListeners() {
  // Main page navigation
  document.getElementById('createPartyPageBtn').addEventListener('click', showCreateParty);
  document.getElementById('joinPartyPageBtn').addEventListener('click', showJoinParty);

  // Create party page
  document.getElementById('createPartyBtn').addEventListener('click', createParty);
  document.getElementById('backFromCreateBtn').addEventListener('click', showMainPage);

  // Join party page
  document.getElementById('joinPartyBtn').addEventListener('click', joinParty);
  document.getElementById('backFromJoinBtn').addEventListener('click', showMainPage);

  // Word bank controls
  document.getElementById('addWordsBtn').addEventListener('click', () => showWordBankOption('manual'));
  document.getElementById('pasteListBtn').addEventListener('click', () => showWordBankOption('paste'));
  document.getElementById('useDefaultBtn').addEventListener('click', () => showWordBankOption('default'));
  
  
  document.getElementById('addWordBtn').addEventListener('click', addWord);
  document.getElementById('addWordsFromListBtn').addEventListener('click', addWordsFromList);
  document.getElementById('useDefaultWordsBtn').addEventListener('click', useDefaultWords);

  document.getElementById('clearWordsBtn').addEventListener('click', () => {
    gameWords = [];
    updateWordsPreview();
    saveWords();
    updatePartyWords();
  });



  // Game controls
  document.getElementById('startGameBtn').addEventListener('click', startGame);
  document.getElementById('hostLeavePartyBtn').addEventListener('click', leaveParty);
  document.getElementById('playerLeavePartyBtn').addEventListener('click', leaveParty);
  document.getElementById('endGameBtn').addEventListener('click', endGame);

  // Enter key handling
  document.getElementById('newWord').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addWord();
  });
  
  document.getElementById('partyCode').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') joinParty();
  });

  document.getElementById('partyName').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') createParty();
  });
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  loadSavedWords();
  setupEventListeners();
});

// Cleanup
window.addEventListener('beforeunload', () => {
  if (unsubscribeParty) unsubscribeParty();
});