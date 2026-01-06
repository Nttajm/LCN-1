// ============================================================
// CASCADE - Firebase Backend Module
// ============================================================

// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp, 
  query, 
  where, 
  addDoc,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import { TEMPLATES } from './templates.js';
import { serializeBoard, deserializeBoard } from './serializer.js';
import { 
  initCollaboration, 
  cleanupCollaboration,
  subscribeToPresence, 
  subscribeToBoardChanges,
  subscribeToCollaborators,
  saveWithConflictResolution,
  shareBoard as collabShareBoard,
  getCollaborators,
  updateCollaboratorRole,
  removeCollaborator as collabRemoveCollaborator,
  showToast,
  setCurrentBoard,
  markLocalChange,
  isRemoteSyncing
} from './collaboration.js';

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyDdV8dc3X5AKYMAkh6nQILYQUBpmJDGwf0",
  authDomain: "joelsnotesapp.firebaseapp.com",
  projectId: "joelsnotesapp",
  storageBucket: "joelsnotesapp.appspot.com",
  messagingSenderId: "1043222135072",
  appId: "1:1043222135072:web:b0ec2fe65119dc38c2d745",
  measurementId: "G-JVW0G994B5"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- State ---
let currentUser = null;
let currentBoardId = null;
let isSaving = false;
let pendingRemoteUpdate = null; // Stores remote changes while user is editing
let saveDebounceTimer = null;
const SAVE_DEBOUNCE_MS = 1000; // Debounce saves to 1 second

// --- DOM References ---
const getBoard = () => document.querySelector('#board');
const getBoardItems = () => document.getElementById('boardItems');
const getBoardsList = () => document.getElementById('boardsList');

// ============================================================
// Authentication
// ============================================================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    cleanupCollaboration();
    window.location.href = "signin.html";
    return;
  }
  
  currentUser = user;
  updateUserDisplay(user);
  
  // Initialize collaboration module
  initCollaboration(db, user);
  
  await ensureBoardExists();
  await loadBoardList();
  await loadMostRecentBoard();
});

function updateUserDisplay(user) {
  // Update display name elements
  document.querySelectorAll('.js-auth-displayname').forEach(el => {
    el.textContent = user.displayName || "User";
  });
  
  // Update avatar letter
  const letterEl = document.querySelector('.js-auth-letter');
  if (letterEl) {
    letterEl.textContent = (user.displayName?.[0] || "U").toUpperCase();
  }
}

// ============================================================
// Board Management
// ============================================================

/**
 * Ensure user has at least one board
 */
async function ensureBoardExists() {
  const boardsRef = collection(db, "users", currentUser.uid, "boards");
  const snap = await getDocs(boardsRef);
  
  if (!snap.empty) return;
  
  // Create initial board with structured format
  const id = crypto.randomUUID().slice(0, 8);
  const newBoard = {
    owner: currentUser.uid,
    title: "Untitled",
    blocks: TEMPLATES.newBoardData, // Use structured data instead of HTML
    updatedAt: new Date(),
    type: 'board'
  };
  
  // Create the board in boards collection
  await setDoc(doc(db, "boards", id), newBoard);
  
  // Create reference in user's boards collection (metadata only)
  await setDoc(doc(db, "users", currentUser.uid, "boards", id), {
    boardId: id,
    role: 'owner',
    linkedAt: serverTimestamp()
  });
  
  currentBoardId = id;
}

/**
 * Load and render the boards sidebar
 */
async function loadBoardList() {
  if (!currentUser) return;
  
  const container = getBoardsList();
  if (!container) return;
  
  // Add loading state
  container.classList.add('loading');
  
  try {
    // Fetch board references from user collection
    const boardRefsRef = collection(db, "users", currentUser.uid, "boards");
    const refsSnap = await getDocs(boardRefsRef);
    
    // Fetch actual board data from boards collection
    const boards = [];
    for (const refDoc of refsSnap.docs) {
      const ref = refDoc.data();
      const boardSnap = await getDoc(doc(db, "boards", refDoc.id));
      if (boardSnap.exists()) {
        boards.push({
          id: refDoc.id,
          ...boardSnap.data(),
          role: ref.role, // Keep user's role
          linkedAt: ref.linkedAt
        });
      }
    }
    
    // Sort by most recent
    boards.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() || 0;
      const bTime = b.updatedAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    
    // Render boards
    container.innerHTML = boards.map(board => {
      const isSelected = board.id === currentBoardId;
      const title = (board.title || "Untitled").slice(0, 20);
      const isShared = board.type === 'shared' || board.role;
      
      // Get board icon - prefer emoji/image icon, fallback to document icon
      const boardIcon = board.blocks?.icon;
      let iconHtml = '';
      if (boardIcon?.type === 'emoji' && boardIcon?.value) {
        iconHtml = `<span class="nav-item__emoji">${boardIcon.value}</span>`;
      } else if (boardIcon?.type === 'image' && boardIcon?.value) {
        iconHtml = `<img src="${boardIcon.value}" alt="" class="nav-item__icon-img">`;
      } else {
        iconHtml = `<img src="icons/${isShared ? 'shared' : 'document'}.png" alt="" onerror="this.src='icons/add.png'">`;
      }
      
      return `
        <div class="nav-item board-item ${isSelected ? 'is-active' : ''}" data-board-id="${board.id}">
          <div class="nav-item__icon">
            ${iconHtml}
          </div>
          <span class="nav-item__label board-title">${title}</span>
          <button class="btn-icon btn-icon--sm delete-board-btn js-delete-board" data-board-id="${board.id}" aria-label="Delete board" title="Delete">
            ×
          </button>
        </div>
      `;
    }).join('');
    
    // Show empty state if no boards
    if (boards.length === 0) {
      container.innerHTML = '<p class="sidebar__empty">No boards yet</p>';
    }
    
    // Bind click events for board selection
    container.querySelectorAll('.board-item').forEach(el => {
      el.addEventListener('click', (e) => {
        // Don't trigger if clicking delete button
        if (e.target.closest('.delete-board-btn')) return;
        
        // Update selection state
        container.querySelectorAll('.board-item').forEach(x => x.classList.remove('is-active'));
        el.classList.add('is-active');
        
        // Load the board
        loadBoard(el.dataset.boardId);
      });
    });
    
    // Bind delete events
    container.querySelectorAll('.delete-board-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const boardId = el.dataset.boardId;
        confirmDeleteBoard(boardId);
      });
    });
    
  } catch (error) {
    console.error('Error loading boards:', error);
    container.innerHTML = '<p class="sidebar__error">Failed to load boards</p>';
  } finally {
    container.classList.remove('loading');
  }
}

/**
 * Confirm and delete a board
 */
async function confirmDeleteBoard(boardId) {
  // Simple confirmation
  const confirmed = confirm('Are you sure you want to delete this board? This cannot be undone.');
  if (!confirmed) return;
  
  await deleteBoard(boardId);
}

/**
 * Load the most recently updated board
 */
async function loadMostRecentBoard() {
  const boardRefsRef = collection(db, "users", currentUser.uid, "boards");
  const refsSnap = await getDocs(boardRefsRef);
  
  if (refsSnap.empty) return;
  
  // Fetch actual board data to sort by updatedAt
  const boards = [];
  for (const refDoc of refsSnap.docs) {
    const boardSnap = await getDoc(doc(db, "boards", refDoc.id));
    if (boardSnap.exists()) {
      boards.push({ id: refDoc.id, ...boardSnap.data() });
    }
  }
  
  if (boards.length === 0) return;
  
  boards.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
  
  currentBoardId = boards[0].id;
  await loadBoard(currentBoardId);
}

/**
 * Load a specific board by ID
 */
async function loadBoard(boardId = currentBoardId) {
  if (!boardId || !currentUser) return;
  
  const boardItems = document.getElementById('boardItems');
  if (!boardItems) return;
  
  console.log(`[Backend] Loading board: ${boardId}`);
  
  const snap = await getDoc(doc(db, "boards", boardId));
  
  if (!snap.exists()) {
    boardItems.innerHTML = '<p class="tx-secondary p-4">Board not found.</p>';
    return;
  }
  
  const data = snap.data();
  currentBoardId = boardId;
  
  // Set the current board for collaboration (presence, sharing, etc.)
  setCurrentBoard(boardId);
  
  // Subscribe to real-time board changes for collaborative editing
  // This replaces any previous subscription automatically
  subscribeToBoardChanges(boardId, (remoteBlocks, boardData) => {
    console.log('[Backend] Received remote update, applying...');
    
    // Always apply remote changes - the collaboration module handles echo detection
    // Save cursor position if user is editing
    const activeElement = document.activeElement;
    const wasEditing = activeElement?.closest('[contenteditable="true"]');
    let cursorInfo = null;
    
    if (wasEditing) {
      // Try to save cursor position
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const blockId = wasEditing.dataset?.blockId;
        cursorInfo = {
          blockId,
          offset: range.startOffset
        };
      }
    }
    
    // Apply the update
    deserializeBoard(remoteBlocks);
    
    // Try to restore cursor position
    if (cursorInfo?.blockId) {
      requestAnimationFrame(() => {
        const block = document.querySelector(`[data-block-id="${cursorInfo.blockId}"] [contenteditable]`);
        if (block) {
          block.focus();
          try {
            const selection = window.getSelection();
            const range = document.createRange();
            const textNode = block.firstChild;
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
              const offset = Math.min(cursorInfo.offset, textNode.length);
              range.setStart(textNode, offset);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          } catch (e) {
            // Cursor restoration failed, that's okay
          }
        }
      });
    }
  });
  
  // Check if content is new JSON format or legacy HTML
  if (data.blocks && typeof data.blocks === 'object') {
    // New structured format - deserialize with event listeners
    deserializeBoard(data.blocks);
  } else if (data.content) {
    // Legacy HTML format - try to use it directly (will lose event listeners)
    // Consider migrating this data on save
    const boardEl = document.querySelector('.board-content');
    if (boardEl) {
      boardEl.innerHTML = data.content;
    }
  } else {
    // Empty board
    deserializeBoard(TEMPLATES.emptyBoardData);
  }
  
  // Dispatch event for app to reattach any additional listeners
  document.dispatchEvent(new CustomEvent('board-loaded', { 
    detail: { boardId, data } 
  }));
}

/**
 * Create a new board
 */
async function createNewBoard() {
  if (!currentUser) return;
  
  const id = crypto.randomUUID().slice(0, 8);
  const data = {
    owner: currentUser.uid,
    title: "Untitled",
    blocks: TEMPLATES.newBoardData, // Use structured data instead of HTML
    updatedAt: serverTimestamp(),
    type: 'board'
  };
  
  // Create the board in boards collection (single source of truth)
  await setDoc(doc(db, "boards", id), data);
  
  // Create reference in user's boards collection (metadata only)
  await setDoc(doc(db, "users", currentUser.uid, "boards", id), {
    boardId: id,
    role: 'owner',
    linkedAt: serverTimestamp()
  });
  
  // Add owner to board users subcollection
  await setDoc(doc(db, "boards", id, "users", currentUser.uid), {
    userId: currentUser.uid,
    role: "owner",
    addedAt: serverTimestamp()
  });
  
  currentBoardId = id;
  await loadBoardList();
  await loadBoard(id);
}

/**
 * Delete a board
 */
async function deleteBoard(boardId) {
  if (!boardId || !currentUser) return;
  
  try {
    // Check if user is owner before deleting the board itself
    const boardSnap = await getDoc(doc(db, "boards", boardId));
    const isOwner = boardSnap.exists() && boardSnap.data().owner === currentUser.uid;
    
    // Always remove from user's boards collection
    await deleteDoc(doc(db, "users", currentUser.uid, "boards", boardId));
    
    // If owner, delete the board and all its subcollections
    if (isOwner) {
      // Delete board's users subcollection
      const usersRef = collection(db, "boards", boardId, "users");
      const usersSnap = await getDocs(usersRef);
      for (const userDoc of usersSnap.docs) {
        await deleteDoc(userDoc.ref);
      }
      
      // Delete the board document itself
      await deleteDoc(doc(db, "boards", boardId));
    }
    
    // Check if we deleted the current board
    const wasCurrentBoard = boardId === currentBoardId;
    
    // Load remaining board references
    const boardRefsRef = collection(db, "users", currentUser.uid, "boards");
    const refsSnap = await getDocs(boardRefsRef);
    
    if (refsSnap.empty) {
      // No boards left - clear everything
      currentBoardId = null;
      const boardItems = getBoardItems();
      if (boardItems) {
        boardItems.innerHTML = '';
      }
      
      // Clear cover and icon
      const cover = document.getElementById('boardCover');
      if (cover) {
        cover.style.backgroundImage = '';
        cover.classList.remove('cover--has-image');
      }
      const iconDisplay = document.getElementById('iconDisplay');
      if (iconDisplay) {
        iconDisplay.textContent = '';
        iconDisplay.style.backgroundImage = '';
      }
      
      await loadBoardList();
      return;
    }
    
    // Get sorted boards from actual board data
    const boards = [];
    for (const refDoc of refsSnap.docs) {
      const boardSnap = await getDoc(doc(db, "boards", refDoc.id));
      if (boardSnap.exists()) {
        boards.push({ id: refDoc.id, ...boardSnap.data() });
      }
    }
    boards.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
    
    // Update board list
    await loadBoardList();
    
    // If we deleted the current board, load the most recent one
    if (wasCurrentBoard && boards.length > 0) {
      currentBoardId = boards[0].id;
      await loadBoard(currentBoardId);
    }
    
  } catch (error) {
    console.error('Error deleting board:', error);
    alert('Failed to delete board. Please try again.');
  }
}

/**
 * Save current board content with conflict resolution
 * Uses optimistic concurrency control for real-time collaboration
 */
async function saveNotes(boardId = currentBoardId) {
  if (!boardId || !currentUser || isSaving) return;
  
  const boardItems = document.getElementById('boardItems');
  if (!boardItems) return;
  
  // Don't save if we're receiving remote changes
  if (isRemoteSyncing()) {
    console.log('[Backend] Skipping save during remote sync');
    return;
  }
  
  // Mark that we're making a local change (so we don't react to our own save)
  markLocalChange();
  
  isSaving = true;
  
  try {
    // Serialize the board to structured JSON
    const blocks = serializeBoard();
    
    // Use conflict-aware save from collaboration module
    const result = await saveWithConflictResolution(boardId, blocks, currentUser.uid);
    
    if (result.conflict) {
      // There was a conflict - the server has newer data
      // For now, we'll silently update to server version
      // A more advanced implementation could show a merge dialog
      console.log('[Backend] Conflict detected - server has newer version');
      deserializeBoard(result.serverData);
      showToast('Board was updated by another user', 'info');
    } else if (!result.success && result.error) {
      console.error('[Backend] Save failed:', result.error);
    }
    
  } catch (error) {
    console.error('Error saving board:', error);
  } finally {
    isSaving = false;
  }
}

/**
 * Debounced save - call this for frequent changes like typing
 */
function debouncedSave() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    saveNotes();
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Apply any pending remote updates (call when user stops editing)
 */
function applyPendingRemoteUpdates() {
  if (pendingRemoteUpdate) {
    deserializeBoard(pendingRemoteUpdate);
    pendingRemoteUpdate = null;
  }
}

// ============================================================
// Collaboration
// ============================================================

/**
 * Check if a user exists by email
 */
async function findUserByEmail(email) {
  const q = query(
    collection(db, "users"),
    where("email", "==", email)
  );
  
  const snap = await getDocs(q);
  
  if (snap.empty) return null;
  
  return {
    id: snap.docs[0].id,
    data: snap.docs[0].data()
  };
}

/**
 * Share a board with users
 */
async function shareBoard(users, boardId = currentBoardId) {
  if (!boardId) return;
  
  // Mark board as shared
  await setDoc(
    doc(db, "boards", boardId),
    { type: "shared" },
    { merge: true }
  );
  
  for (const user of users) {
    const existingUser = await findUserByEmail(user.email);
    
    if (existingUser) {
      const uid = existingUser.id;
      
      // Add user to board's users subcollection
      await setDoc(
        doc(db, "boards", boardId, "users", uid),
        {
          userId: uid,
          role: user.role,
          addedAt: serverTimestamp()
        },
        { merge: true }
      );
      
      // Add board reference to user's boards collection (reference only, no data duplication)
      await setDoc(
        doc(db, "users", uid, "boards", boardId),
        {
          boardId,
          role: user.role,
          linkedAt: serverTimestamp()
        },
        { merge: true }
      );
    } else {
      // User doesn't exist - create pending invite
      await addDoc(collection(db, "pendingInvites"), {
        email: user.email,
        role: user.role,
        boardId,
        timestamp: serverTimestamp()
      });
    }
  }
}

// ============================================================
// Auto-save
// ============================================================

let lastEdit = Date.now();

/**
 * Initialize auto-save functionality
 */
function initAutoSave() {
  const boardItems = getBoardItems();
  if (!boardItems) return;
  
  // Auto-save every 2 seconds if there were recent edits
  setInterval(async () => {
    if (Date.now() - lastEdit < 5000 && currentBoardId && !isSaving) {
      isSaving = true;
      try {
        await saveNotes();
      } catch (e) {
        console.error('Auto-save failed:', e);
      } finally {
        isSaving = false;
      }
    }
  }, 2000);
  
  // Track edits on the board
  ['input', 'keydown', 'mousedown', 'touchstart'].forEach(evt => {
    boardItems.addEventListener(evt, () => {
      lastEdit = Date.now();
    });
  });
  
  // Also track edits on cover and icon areas
  const cover = document.getElementById('boardCover');
  const iconDisplay = document.getElementById('iconDisplay');
  
  if (cover) {
    cover.addEventListener('click', () => lastEdit = Date.now());
  }
  if (iconDisplay) {
    iconDisplay.addEventListener('input', () => lastEdit = Date.now());
  }
}

// Refresh board list periodically (every 30 seconds)
setInterval(loadBoardList, 30000);

// ============================================================
// Navigation Handlers
// ============================================================

/**
 * Handle home navigation - show recent boards overview
 */
function handleHomeClick() {
  // Deselect all boards
  const container = getBoardsList();
  if (container) {
    container.querySelectorAll('.board-item').forEach(el => el.classList.remove('is-active'));
  }
  
  // Mark home as active
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('is-active'));
  document.querySelector('.js-nav-home')?.classList.add('is-active');
  
  // Show home view (could show recent activity, all boards grid, etc.)
  showHomeView();
}

/**
 * Show the home/dashboard view
 */
async function showHomeView() {
  const boardItems = getBoardItems();
  if (!boardItems) return;
  
  // Clear current board
  currentBoardId = null;
  
  // Fetch board references from user collection
  const boardRefsRef = collection(db, "users", currentUser.uid, "boards");
  const refsSnap = await getDocs(boardRefsRef);
  
  // Fetch actual board data from boards collection
  const boards = [];
  for (const refDoc of refsSnap.docs) {
    const boardSnap = await getDoc(doc(db, "boards", refDoc.id));
    if (boardSnap.exists()) {
      boards.push({ id: refDoc.id, ...boardSnap.data() });
    }
  }
  boards.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
  
  // Render a home view with board cards
  boardItems.innerHTML = `
    <div class="home-view">
      <h1 class="home-view__title">Welcome back${currentUser?.displayName ? ', ' + currentUser.displayName.split(' ')[0] : ''}!</h1>
      <p class="home-view__subtitle">Your recent boards</p>
      
      <div class="home-view__grid">
        ${boards.slice(0, 6).map(board => `
          <div class="board-card" data-board-id="${board.id}">
            <div class="board-card__icon">${board.blocks?.icon?.value || '📝'}</div>
            <div class="board-card__title">${(board.title || 'Untitled').slice(0, 25)}</div>
            <div class="board-card__date">${formatDate(board.updatedAt)}</div>
          </div>
        `).join('')}
        
        <div class="board-card board-card--new js-create-board">
          <div class="board-card__icon">➕</div>
          <div class="board-card__title">Create Board</div>
        </div>
      </div>
    </div>
  `;
  
  // Bind events for board cards
  boardItems.querySelectorAll('.board-card[data-board-id]').forEach(card => {
    card.addEventListener('click', () => {
      loadBoard(card.dataset.boardId);
      // Update sidebar selection
      const container = getBoardsList();
      if (container) {
        container.querySelectorAll('.board-item').forEach(el => {
          el.classList.toggle('is-active', el.dataset.boardId === card.dataset.boardId);
        });
      }
      // Remove home active state
      document.querySelector('.js-nav-home')?.classList.remove('is-active');
    });
  });
  
  // New board button in home view
  boardItems.querySelector('.js-create-board')?.addEventListener('click', createNewBoard);
}

/**
 * Format a date for display
 */
function formatDate(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Less than a minute
  if (diff < 60000) return 'Just now';
  // Less than an hour
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  // Less than a day
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  // Less than a week
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  // Otherwise show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================
// Shared Boards
// ============================================================

/**
 * Load boards shared with the current user
 */
async function loadSharedBoards() {
  if (!currentUser) return [];
  
  const boardRefsRef = collection(db, "users", currentUser.uid, "boards");
  const refsSnap = await getDocs(boardRefsRef);
  
  const sharedBoards = [];
  for (const refDoc of refsSnap.docs) {
    const ref = refDoc.data();
    // If user has a role and is not owner, it's shared with them
    if (ref.role && ref.role !== 'owner') {
      const boardSnap = await getDoc(doc(db, "boards", refDoc.id));
      if (boardSnap.exists()) {
        sharedBoards.push({
          id: refDoc.id,
          ...boardSnap.data(),
          role: ref.role
        });
      }
    }
  }
  
  return sharedBoards;
}

/**
 * Get collaborators for a board
 */
async function getBoardCollaborators(boardId) {
  if (!boardId) return [];
  
  try {
    const usersRef = collection(db, "boards", boardId, "users");
    const snap = await getDocs(usersRef);
    
    const collaborators = [];
    snap.forEach(d => {
      collaborators.push({ id: d.id, ...d.data() });
    });
    
    return collaborators;
  } catch (e) {
    console.error('Error getting collaborators:', e);
    return [];
  }
}

/**
 * Remove a collaborator from a board
 */
async function removeCollaborator(boardId, userId) {
  if (!boardId || !userId) return;
  
  try {
    // Remove from board's users
    await deleteDoc(doc(db, "boards", boardId, "users", userId));
    // Remove from user's boards
    await deleteDoc(doc(db, "users", userId, "boards", boardId));
  } catch (e) {
    console.error('Error removing collaborator:', e);
  }
}

// ============================================================
// Event Bindings
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize auto-save
  initAutoSave();
  
  // New board button
  const newBoardBtn = document.querySelector('.js-new-board-btn');
  if (newBoardBtn) {
    newBoardBtn.addEventListener('click', createNewBoard);
  }
  
  // Home navigation
  const homeBtn = document.querySelector('.js-nav-home');
  if (homeBtn) {
    homeBtn.addEventListener('click', handleHomeClick);
  }
  
  // Profile click (could show settings/logout)
  const profileBtn = document.querySelector('[data-action="profile"]');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      // TODO: Show profile dropdown with logout option
      if (confirm('Sign out?')) {
        auth.signOut().then(() => {
          window.location.href = 'signin.html';
        });
      }
    });
  }
});

// ============================================================
// Exports
// ============================================================

export { 
  db, 
  auth, 
  currentBoardId,
  loadBoardList,
  loadBoard,
  saveNotes,
  debouncedSave,
  applyPendingRemoteUpdates,
  createNewBoard,
  deleteBoard,
  shareBoard,
  getBoardCollaborators,
  removeCollaborator,
  loadSharedBoards
};
