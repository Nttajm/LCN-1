import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBoMh1L1bbPm-DzsB8DU1fWc1_z8MsFfj4",
  authDomain: "lcntests.firebaseapp.com",
  databaseURL: "https://lcntests-default-rtdb.firebaseio.com",
  projectId: "lcntests",
  storageBucket: "lcntests.firebasestorage.app",
  messagingSenderId: "665856876392",
  appId: "1:665856876392:web:23fe74667972a8db6400dd",
  measurementId: "G-JJM3816RHH"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore(app);

// DOM elements
const newBtn = document.querySelector('.options button:nth-child(1)');
const deleteBtn = document.querySelector('.options button:nth-child(2)');
const noteContent = document.querySelector('.note-content');
const tabs = document.querySelector('.tabs');
const titleEl = noteContent.querySelector('h1');
const contentEl = noteContent.querySelector('.note-body');
const folderCreator = document.querySelector('.folder-creator');
let lastFocusedEl = null;
titleEl.addEventListener('focus', () => lastFocusedEl = titleEl);
contentEl.addEventListener('focus', () => lastFocusedEl = contentEl);

// Application state
let notes = {};
let userData = { folders: [] };
let currentNoteId = null;
let syncTimeout = null;
let isInitialLoad = true;
let firebaseUnsubscribe = null;

// ========== DATA MANAGEMENT ==========

// Load data from localStorage
function loadFromLocalStorage() {
  const storedNotes = localStorage.getItem('notes');
  const storedUserData = localStorage.getItem('livenote-UD');
  
  if (storedNotes) {
    notes = JSON.parse(storedNotes);
  }
  
  if (storedUserData) {
    userData = JSON.parse(storedUserData);
  } else {
    userData = { folders: [] };
  }
}

// Save data to localStorage
function saveToLocalStorage() {
  localStorage.setItem('notes', JSON.stringify(notes));
  localStorage.setItem('livenote-UD', JSON.stringify(userData));
}

// Initialize Firebase data listener
function initializeFirebaseListener(userId) {
  if (firebaseUnsubscribe) {
    firebaseUnsubscribe();
  }
  
  const userRef = doc(db, 'noteUsers', userId);
  
  // Set up real-time listener for changes
  firebaseUnsubscribe = onSnapshot(userRef, (doc) => {
    if (doc.exists() && !isInitialLoad) {
      const firebaseData = doc.data();
      
      // Only update if the data is different to avoid loops
      if (firebaseData.notes && JSON.stringify(firebaseData.notes) !== JSON.stringify(notes)) {
        notes = firebaseData.notes;
        saveToLocalStorage();
        renderTabs();
        
        // If current note exists in the new data, load it
        if (currentNoteId && notes[currentNoteId]) {
          loadNote(currentNoteId);
        } else if (Object.keys(notes).length > 0) {
          // Otherwise load most recent note
          const firstId = getMostRecentNoteId();
          loadNote(firstId);
        }
      }
    }
    
    isInitialLoad = false;
  });
}

// Sync data to Firebase with debounce
function syncToFirebase() {
  if (!auth.currentUser) return;
  
  // Clear existing timeout if any
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  
  syncTimeout = setTimeout(async () => {
    try {
      const userRef = doc(db, 'noteUsers', auth.currentUser.uid);
      await setDoc(userRef, { notes, lastUpdated: Date.now() }, { merge: true });
    } catch (error) {
      console.error("Error syncing to Firebase:", error);
    }
  }, 1000);
}

// Initial data load from Firebase
async function loadInitialData() {
  if (!auth.currentUser) return;
  
  try {
    const userRef = doc(db, 'noteUsers', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const firebaseData = userSnap.data();
      
      // Merge with local data, prioritizing Firebase data
      if (firebaseData.notes) {
        notes = firebaseData.notes;
        saveToLocalStorage();
      }
    } else {
      // First time user, create document with current data
      await setDoc(userRef, { notes, lastUpdated: Date.now() });
    }
    
    renderTabs();
    
    // Load a note if available
    if (Object.keys(notes).length > 0) {
      loadNote(getMostRecentNoteId());
    } else {
      createNote();
    }
  } catch (error) {
    console.error("Error loading initial data:", error);
    
    // Fallback to local data
    loadFromLocalStorage();
    renderTabs();
    
    if (Object.keys(notes).length > 0) {
      loadNote(getMostRecentNoteId());
    } else {
      createNote();
    }
  }
}

// ========== NOTE OPERATIONS ==========

// Create new note
function createNote() {
  const id = Date.now().toString();
  notes[id] = {
    title: 'New Note',
    content: 'Start typing...',
    createdAt: id,
  };
  currentNoteId = id;
  saveToLocalStorage();
  syncToFirebase();
  renderTabs();
  loadNote(id);
}

// Update note content
function updateNote() {
  if (!currentNoteId) return;
  
  notes[currentNoteId] = {
    title: titleEl.innerText,
    content: contentEl.innerText,
    lastType: Date.now().toString(),
    createdAt: notes[currentNoteId].createdAt || Date.now().toString(),
  };
  
  saveToLocalStorage();
  syncToFirebase();
  renderTabs();
  updateDate();
}

// Load note into editor
function loadNote(id) {
  const note = notes[id];
  if (!note) return;

  // Save caret positions
  const titleCaret = saveCaretPosition(titleEl);
  const contentCaret = saveCaretPosition(contentEl);

  // Update DOM
  titleEl.contentEditable = true;
  contentEl.contentEditable = true;
  titleEl.innerText = note.title;
  contentEl.innerText = note.content;
  currentNoteId = id;
  updateDate();

  // Restore caret positions
  if (document.activeElement === contentEl) {
    restoreCaretPosition(contentEl, contentCaret);
  } else if (document.activeElement === titleEl) {
    restoreCaretPosition(titleEl, titleCaret);
  }

  // Highlight active tab
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active-tab'));
  const tabElement = document.querySelector(`.tab[data-id="${id}"]`);
  if (tabElement) {
    tabElement.classList.add('active-tab');
  }
}


// Focus on the note editor
let lastFocus = null;
function remainFocus(el) {
  if (!lastFocus) {
    lastFocus = el;
  }
  el.focus();
}


// Delete current note
function deleteNote() {
  if (!currentNoteId) return;
  
  delete notes[currentNoteId];
  
  
  const remainingIds = Object.keys(notes);
  if (remainingIds.length > 0) {
    loadNote(getMostRecentNoteId());
  } else {
    titleEl.innerText = '';
    contentEl.innerText = '';
    currentNoteId = null;
  }
  
  renderTabs();
  saveToLocalStorage();
  syncToFirebase();
}

// ========== UI RENDERING ==========

// Render all note tabs
function renderTabs() {
  tabs.innerHTML = '';

  // Early return if no notes
  if (Object.keys(notes).length === 0) return;

  // Prepare date references
  const todayDate = new Date();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(todayDate.getDate() - 1);
  const lastWeekDate = new Date();
  lastWeekDate.setDate(todayDate.getDate() - 7);
  const thirtyDaysDate = new Date();
  thirtyDaysDate.setDate(todayDate.getDate() - 30);

  // Group notes by time period
  const groups = {
    'Today': [],
    'Yesterday': [],
    'Last week': [],
    '30 Days': [],
    'Older': []
  };

  // Sort and categorize notes
  Object.entries(notes).forEach(([id, note]) => {
    const lastType = note.lastType || note.createdAt;
    const noteDate = new Date(Number(lastType));

    if (noteDate.toDateString() === todayDate.toDateString()) {
      groups['Today'].push([id, note]);
    } else if (noteDate.toDateString() === yesterdayDate.toDateString()) {
      groups['Yesterday'].push([id, note]);
    } else if (noteDate >= lastWeekDate) {
      groups['Last week'].push([id, note]);
    } else if (noteDate >= thirtyDaysDate) {
      groups['30 Days'].push([id, note]);
    } else {
      groups['Older'].push([id, note]);
    }
  });

  // Sort notes within each group by most recent first
  Object.values(groups).forEach(group => {
    group.sort(([, noteA], [, noteB]) => {
      const timeA = noteA.lastType || noteA.createdAt;
      const timeB = noteB.lastType || noteB.createdAt;
      return Number(timeB) - Number(timeA);
    });
  });

  // Render each group
  Object.entries(groups).forEach(([title, group]) => {
    if (group.length === 0) return;

    const section = document.createElement('div');
    section.className = 'tab-group';
    section.innerHTML = `<h2 class='tab-time'>${title}</h2>`;

    group.forEach(([id, note]) => {
      const tab = document.createElement('div');
      tab.className = 'tab';
      tab.dataset.id = id;
      
      if (id === currentNoteId) {
        tab.classList.add('active-tab');
      }

      const shortTitle = note.title.length > 17 ? note.title.slice(0, 17) + '...' : note.title;
      const shortContent = note.content.length > 30 ? note.content.slice(0, 30) + '...' : note.content;
      const lastType = note.lastType || note.createdAt;

      tab.innerHTML = `
        <h4>${shortTitle}</h4>
        <div class="info">
          <span>${shortContent}</span>
          <span class="date">${formatNowDate(lastType)}</span>
        </div>
        ${renderFolders(id)}
      `;

      tab.onclick = () => loadNote(id);
      section.appendChild(tab);
    });

    tabs.appendChild(section);
  });
}

// Render folders dropdown
function renderFolders(id) {
  if (!Array.isArray(userData.folders)) {
    userData.folders = [];
  }

  const options = ['notes', ...userData.folders].map(folder => {
    return `<option value="${folder}" ${folder === 'notes' ? 'selected' : ''}>${folder}</option>`;
  }).join('');

  return `<select data-select-id='${id}'>${options}</select>`;
}

// Update last saved date display
function updateDate() {
  if (!currentNoteId || !notes[currentNoteId]) return;
  
  const dateEl = noteContent.querySelector('.date');
  const lastType = notes[currentNoteId].lastType || notes[currentNoteId].createdAt;
  dateEl.innerText = `Last saved: ${formatNowDate(lastType)}`;
}

// ========== UTILITY FUNCTIONS ==========

// Format date for display
function formatNowDate(timestamp) {
  const now = new Date();
  const date = new Date(Number(timestamp));

  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);

  if (date > oneWeekAgo) {
    let str = date.toLocaleString('en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase().replace(',', '');

    return str.charAt(0).toUpperCase() + str.slice(1); // Capitalize first letter
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    });
  }
}

// Get most recent note ID
function getMostRecentNoteId() {
  return Object.entries(notes)
    .sort(([, a], [, b]) => {
      const dateA = a.lastType || a.createdAt;
      const dateB = b.lastType || b.createdAt;
      return Number(dateB) - Number(dateA); // descending order
    })
    .map(([id]) => id)[0];
}

// Position cursor at end of element
function placeCaretAtEnd(el) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

// ========== EVENT HANDLERS ==========

// Handle bullet points and special formatting
// Enhanced bullet point system
function initBulletPointSystem() {
  const BULLET_SYMBOL = '• ';
  const BULLET_TRIGGERS = ['-', '*'];

  contentEl.addEventListener('keydown', (e) => {
    // Handle bullet creation with dash/asterisk + space
    if (e.key === ' ') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const currentLine = getLineElement(range.startContainer);
      
      if (!currentLine) return;
      
      const lineText = currentLine.textContent.trim();
      
      // Create bullet point when typing trigger character + space
      if (BULLET_TRIGGERS.includes(lineText)) {
        e.preventDefault();
        replaceLine(currentLine, BULLET_SYMBOL);
        return;
      }
      
      // Exit bullet mode when bullet + space
      if (lineText === BULLET_SYMBOL.trim()) {
        e.preventDefault();
        replaceLine(currentLine, '');
        return;
      }
    }
    
    // Continue bullet list on Enter
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const currentLine = getLineElement(range.startContainer);
      
      if (!currentLine) return;
      
      const lineText = currentLine.textContent;
      
      // If line starts with bullet, continue bullet list
      if (lineText.trim().startsWith(BULLET_SYMBOL.trim())) {
        e.preventDefault();
        
        // If line only contains bullet, exit bullet mode
        if (lineText.trim() === BULLET_SYMBOL.trim()) {
          replaceLine(currentLine, '');
          return;
        }
        
        // Create new bullet point below
        const newLine = document.createElement('div');
        newLine.textContent = BULLET_SYMBOL;
        currentLine.after(newLine);
        
        // Place cursor in new line
        placeCaretAt(newLine, BULLET_SYMBOL.length);
        updateNote();
      }
    }
    
    // Delete bullet with backspace at start of line
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      if (range.collapsed && range.startOffset === BULLET_SYMBOL.length) {
        const currentLine = getLineElement(range.startContainer);
        if (currentLine && currentLine.textContent.startsWith(BULLET_SYMBOL)) {
          e.preventDefault();
          replaceLine(currentLine, '');
        }
      }
    }
    
    // Handle tab key for indentation
    if (e.key === 'Tab') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const currentLine = getLineElement(range.startContainer);
      
      if (currentLine && currentLine.textContent.startsWith(BULLET_SYMBOL)) {
        e.preventDefault();
        
        if (e.shiftKey) {
          // Decrease indentation with Shift+Tab
          currentLine.style.marginLeft = Math.max(0, (parseInt(currentLine.style.marginLeft || '0') - 20)) + 'px';
        } else {
          // Increase indentation with Tab
          currentLine.style.marginLeft = (parseInt(currentLine.style.marginLeft || '0') + 20) + 'px';
        }
        
        updateNote();
      }
    }
  });

  // Helper: Get the parent block-level element of a node
  function getLineElement(node) {
    // If text node, get its parent
    if (node.nodeType === 3) {
      node = node.parentNode;
    }
    
    // Find the block-level parent (div, p, etc.)
    while (node && node !== contentEl) {
      if (node.nodeType === 1) {
        const display = window.getComputedStyle(node).display;
        if (display === 'block' || display === 'list-item') {
          return node;
        }
      }
      node = node.parentNode;
    }
    
    // If no block element is found, create a new div to wrap the content
    return createWrapperDiv();
  }
  
  // Helper: Create a wrapper div if needed
  function createWrapperDiv() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    const fragment = range.extractContents();
    
    const div = document.createElement('div');
    div.appendChild(fragment);
    
    range.insertNode(div);
    placeCaretAt(div, 0);
    
    return div;
  }
  
  // Helper: Replace content of line element
  function replaceLine(lineElement, newContent) {
    lineElement.textContent = newContent;
    placeCaretAt(lineElement, newContent.length);
    updateNote();
  }
  
  // Helper: Place caret at specific position in element
  function placeCaretAt(element, offset) {
    const range = document.createRange();
    const selection = window.getSelection();
    
    // Find the first text node or create one
    let textNode = null;
    for (let i = 0; i < element.childNodes.length; i++) {
      if (element.childNodes[i].nodeType === 3) {
        textNode = element.childNodes[i];
        break;
      }
    }
    
    if (!textNode) {
      textNode = document.createTextNode(element.textContent);
      element.textContent = '';
      element.appendChild(textNode);
    }
    
    // Position the caret
    range.setStart(textNode, Math.min(offset, textNode.length));
    range.collapse(true);
    
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

// Initialize the bullet system
initBulletPointSystem();

// Folder creator event handlers
folderCreator.addEventListener('click', () => {
  const folderInput = document.querySelector('#js-new-folder');
  folderInput.classList.toggle('hidden');
  
  folderCreator.innerHTML = folderInput.classList.contains('hidden') 
    ? 'New Folder' 
    : 'Close';
});

document.querySelector('#js-new-folder').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const folderInput = e.target;
    const folderName = folderInput.value.trim();
    
    if (folderName && !userData.folders.includes(folderName)) {
      userData.folders.push(folderName);
      saveToLocalStorage();
      renderTabs();
    }
    
    folderInput.value = '';
    folderInput.classList.add('hidden');
    folderCreator.innerHTML = 'New Folder';
  }
});

// Update note on content change
titleEl.addEventListener('input', updateNote);
contentEl.addEventListener('input', updateNote);

// Button click handlers
newBtn.addEventListener('click', createNote);
deleteBtn.addEventListener('click', deleteNote);

// Handle folder selection changes
tabs.addEventListener('change', (e) => {
  if (e.target.tagName === 'SELECT') {
    const noteId = e.target.getAttribute('data-select-id');
    const folder = e.target.value;
    
    if (noteId && notes[noteId]) {
      notes[noteId].folder = folder;
      saveToLocalStorage();
      syncToFirebase();
    }
  }
});


function getCaretCharacterOffsetWithin(element) {
  const selection = window.getSelection();
  let caretOffset = 0;
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretOffset = preCaretRange.toString().length;
  }
  return caretOffset;
}

function setCaretPosition(element, offset) {
  const selection = window.getSelection();
  const range = document.createRange();
  let currentOffset = 0;
  let found = false;

  function traverse(node) {
    if (node.nodeType === 3) { // Text node
      const length = node.textContent.length;
      if (!found && currentOffset + length >= offset) {
        range.setStart(node, offset - currentOffset);
        range.setEnd(node, offset - currentOffset);
        found = true;
      }
      currentOffset += length;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
        if (found) break;
      }
    }
  }

  traverse(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

function saveCaretPosition(el) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(el);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
}

function restoreCaretPosition(el, offset) {
  const nodeStack = [el];
  let charIndex = 0;
  let node, foundNode = null, foundOffset = 0;

  while ((node = nodeStack.pop())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const nextCharIndex = charIndex + node.length;

      if (offset <= nextCharIndex) {
        foundNode = node;
        foundOffset = offset - charIndex;
        break;
      }

      charIndex = nextCharIndex;
    } else {
      let i = node.childNodes.length;
      while (i--) nodeStack.push(node.childNodes[i]);
    }
  }

  if (foundNode) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(foundNode, foundOffset);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}



// ========== INITIALIZATION ==========

// Handle authentication state changes
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Not logged in, redirect to login page
    window.location.href = 'login.html';
    return;
  }
  
  // Load initial data from localStorage
  loadFromLocalStorage();
  
  // Set up Firebase listener
  initializeFirebaseListener(user.uid);
  
  // Load data from Firebase
  loadInitialData();
});

