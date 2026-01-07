// ============================================================
// CASCADE - Real-time Collaboration Module
// ============================================================
// Handles presence, real-time sync, conflict resolution, and sharing
// Robust approach: Server is always source of truth, local changes are optimistic

import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  Timestamp,
  addDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// ============================================================
// STATE
// ============================================================

const state = {
  currentUser: null,
  currentBoardId: null,
  db: null,
  
  // Real-time listeners
  unsubscribeBoard: null,
  unsubscribePresence: null,
  unsubscribeCollaborators: null,
  
  // Presence
  activeUsers: new Map(),  // Map of uid -> user data
  presenceInterval: null,
  fastPresenceInterval: null,

  // Collaborators cache (uid -> collaborator data)
  collaborators: new Map(),
  
  // Save state
  pendingSave: null,
  saveInProgress: false,
  
  // Track local operations to avoid echo (much simpler than hash/version)
  lastLocalOperationId: null,
  lastLocalSaveTime: null,
  
  // UI elements cache
  activeUsersContainer: null,
  sharePanel: null,
  
  // Pending collaborators to add (before clicking Done)
  pendingCollaborators: [],
  
  // Board update callback
  onBoardUpdate: null
};

// User colors for presence indicators
const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
];

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize the collaboration module
 */
export function initCollaboration(db, user) {
  state.db = db;
  state.currentUser = user;
  
  // Create presence UI
  createPresenceUI();
  
  // Setup share panel handlers
  setupSharePanelHandlers();
  
  // Setup heartbeat for presence
  startPresenceHeartbeat();
  
  // Clean up on page unload
  window.addEventListener('beforeunload', handleUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Set the current board ID and subscribe to updates
 */
export function setCurrentBoard(boardId) {
  if (!boardId) return;
  
  // If switching boards, clean up old subscriptions
  if (state.currentBoardId && state.currentBoardId !== boardId) {
    if (state.unsubscribeBoard) {
      state.unsubscribeBoard();
      state.unsubscribeBoard = null;
    }
    // Mark offline on old board
    markUserOffline(state.currentBoardId, state.currentUser?.uid);
  }
  
  state.currentBoardId = boardId;
  
  // Reset sync state for new board
  state.lastLocalOperationId = null;
  state.lastLocalSaveTime = null;
  state.saveInProgress = false;
  state.pendingSave = null;

  // Prime collaborators cache (includes owner)
  refreshCollaboratorsCache().catch(() => {});
  
  // Subscribe to presence for this board
  subscribeToPresence(boardId);
  
  // Subscribe to collaborators list
  subscribeToCollaborators(boardId, (collabs) => {
    // Keep a stable map of collaborators; snapshot doesn't include owner
    const nextIds = new Set(collabs.map(c => c.uid));
    // Remove non-owner collaborators that are no longer present
    for (const [uid, data] of state.collaborators.entries()) {
      if (data?.role === 'owner') continue;
      if (!nextIds.has(uid)) state.collaborators.delete(uid);
    }
    // Upsert current snapshot
    collabs.forEach(c => state.collaborators.set(c.uid, c));

    updateHeaderCollaboratorAvatars();
  });
  
  // Update presence immediately
  updatePresence();
}

async function refreshCollaboratorsCache() {
  if (!state.currentBoardId) return;
  const fullList = await getCollaborators(state.currentBoardId);
  state.collaborators.clear();
  fullList.forEach(c => state.collaborators.set(c.uid, c));
  updateHeaderCollaboratorAvatars();
}

/**
 * Clean up collaboration when leaving
 */
export function cleanupCollaboration() {
  console.log('[Collab] Cleaning up...');
  
  // Unsubscribe from all listeners
  if (state.unsubscribeBoard) {
    state.unsubscribeBoard();
    state.unsubscribeBoard = null;
  }
  if (state.unsubscribePresence) {
    state.unsubscribePresence();
    state.unsubscribePresence = null;
  }
  if (state.unsubscribeCollaborators) {
    state.unsubscribeCollaborators();
    state.unsubscribeCollaborators = null;
  }
  
  // Clear presence interval
  if (state.presenceInterval) {
    clearInterval(state.presenceInterval);
    state.presenceInterval = null;
  }
  
  // Mark user as offline
  if (state.currentBoardId && state.currentUser) {
    markUserOffline(state.currentBoardId, state.currentUser.uid);
  }
  
  // Reset state
  state.activeUsers.clear();
  state.collaborators.clear();
  state.lastLocalOperationId = null;
  state.lastLocalSaveTime = null;
  state.pendingSave = null;
  state.saveInProgress = false;
}

// ============================================================
// PRESENCE SYSTEM
// ============================================================

/**
 * Create the active users UI in the header
 */
function createPresenceUI() {
  const header = document.querySelector('.board-header__actions');
  if (!header) return;
  
  // Check if already exists
  if (document.getElementById('activeUsers')) return;
  
  // Create active users container - insert BEFORE share panel
  const container = document.createElement('div');
  container.className = 'active-users';
  container.id = 'activeUsers';
  container.innerHTML = `
    <div class="active-users__avatars" id="activeUsersAvatars"></div>
  `;
  
  // Insert before share button
  const sharePanel = header.querySelector('.share-panel');
  if (sharePanel) {
    header.insertBefore(container, sharePanel);
  } else {
    header.appendChild(container);
  }
  
  state.activeUsersContainer = container;
}

/**
 * Setup share panel event handlers
 */
function setupSharePanelHandlers() {
  // Share button toggle
  const shareBtn = document.querySelector('.js-share-btn');
  const dropdown = document.getElementById('shareDropdown');
  
  if (shareBtn && dropdown) {
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('is-open');
      
      if (dropdown.classList.contains('is-open')) {
        // Clear pending list when opening
        state.pendingCollaborators = [];
        renderPendingCollaborators();
        
        // Load existing collaborators
        loadAndRenderExistingCollaborators();
        
        // Load link sharing state
        loadLinkSharingState();
      }
    });
  }
  
  // Link sharing toggle
  const linkToggle = document.querySelector('.js-link-toggle');
  if (linkToggle) {
    linkToggle.addEventListener('change', handleLinkSharingToggle);
  }
  
  // Copy link button
  const copyBtn = document.querySelector('.js-copy-link');
  if (copyBtn) {
    copyBtn.addEventListener('click', handleCopyLink);
  }
  
  // Add collaborator button (the + button)
  const addBtn = document.querySelector('.js-add-collab');
  if (addBtn) {
    addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleAddCollaboratorClick();
    });
  }
  
  // Done button - actually shares with all pending users
  const doneBtn = document.querySelector('.js-close-share');
  if (doneBtn) {
    doneBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await handleDoneClick();
    });
  }
  
  // Email input - allow Enter key
  const emailInput = document.getElementById('collabInput');
  if (emailInput) {
    emailInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCollaboratorClick();
      }
    });
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('shareDropdown');
    if (dropdown && dropdown.classList.contains('is-open')) {
      if (!e.target.closest('.share-panel')) {
        dropdown.classList.remove('is-open');
      }
    }
  });
}

/**
 * Handle clicking the Add (+) button
 */
function handleAddCollaboratorClick() {
  const input = document.getElementById('collabInput');
  const email = input?.value.trim().toLowerCase();
  
  if (!email || !validateEmail(email)) {
    if (email) showToast('Please enter a valid email address', 'error');
    return;
  }
  
  // Check if already in pending list
  if (state.pendingCollaborators.find(p => p.email === email)) {
    showToast('Email already added', 'error');
    return;
  }
  
  // Check if it's the current user
  if (email === state.currentUser?.email?.toLowerCase()) {
    showToast("You can't add yourself", 'error');
    return;
  }
  
  // Add to pending list
  state.pendingCollaborators.push({ email, role: 'editor' });
  
  // Clear input and render
  input.value = '';
  renderPendingCollaborators();
}

/**
 * Handle clicking Done - share with all pending collaborators
 */
async function handleDoneClick() {
  const dropdown = document.getElementById('shareDropdown');
  
  if (state.pendingCollaborators.length === 0) {
    dropdown?.classList.remove('is-open');
    return;
  }
  
  if (!state.currentBoardId) {
    showToast('No board selected', 'error');
    return;
  }
  
  // Show loading state
  const doneBtn = document.querySelector('.js-close-share');
  const originalText = doneBtn?.textContent;
  if (doneBtn) {
    doneBtn.textContent = 'Sharing...';
    doneBtn.disabled = true;
  }
  
  try {
    // Share with each pending collaborator
    for (const collab of state.pendingCollaborators) {
      const result = await shareBoard(state.currentBoardId, collab.email, collab.role);
      
      if (result.success) {
        if (result.pending) {
          showToast(`Invited ${collab.email} (will see board when they sign up)`);
        } else {
          showToast(`Added ${collab.email}`);
        }
      } else {
        showToast(`Failed to add ${collab.email}: ${result.error}`, 'error');
      }
    }
    
    // Clear pending list
    state.pendingCollaborators = [];
    renderPendingCollaborators();
    
    // Refresh existing collaborators
    loadAndRenderExistingCollaborators();
    
    // Close dropdown
    dropdown?.classList.remove('is-open');
    
  } catch (error) {
    console.error('Error sharing:', error);
    showToast('Error sharing board', 'error');
  } finally {
    if (doneBtn) {
      doneBtn.textContent = originalText;
      doneBtn.disabled = false;
    }
  }
}

/**
 * Render pending collaborators (before clicking Done)
 */
function renderPendingCollaborators() {
  const container = document.getElementById('collabList');
  if (!container) return;
  
  // Get existing collaborators section
  let existingSection = container.querySelector('.collab-existing');
  const existingHTML = existingSection?.outerHTML || '';
  
  // Render pending section
  const pendingHTML = state.pendingCollaborators.length > 0 ? `
    <div class="collab-pending">
      <div class="collab-section-title">Pending (click Done to add)</div>
      ${state.pendingCollaborators.map((p, i) => `
        <div class="collab-person collab-person--pending" data-index="${i}">
          <div class="collab-person__avatar" style="background-color: ${getUserColor(p.email)}">
            ${p.email[0].toUpperCase()}
          </div>
          <div class="collab-person__info">
            <span class="collab-person__email">${p.email}</span>
          </div>
          <select class="collab-person__role js-pending-role" data-index="${i}">
            <option value="editor" ${p.role === 'editor' ? 'selected' : ''}>Can edit</option>
            <option value="viewer" ${p.role === 'viewer' ? 'selected' : ''}>Can view</option>
          </select>
          <button class="collab-person__remove js-remove-pending" data-index="${i}">×</button>
        </div>
      `).join('')}
    </div>
  ` : '';
  
  container.innerHTML = pendingHTML + existingHTML;
  
  // Bind events for pending items
  container.querySelectorAll('.js-pending-role').forEach(select => {
    select.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index);
      if (state.pendingCollaborators[idx]) {
        state.pendingCollaborators[idx].role = e.target.value;
      }
    });
  });
  
  container.querySelectorAll('.js-remove-pending').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index);
      state.pendingCollaborators.splice(idx, 1);
      renderPendingCollaborators();
    });
  });
}

/**
 * Load and render existing collaborators
 */
async function loadAndRenderExistingCollaborators() {
  if (!state.currentBoardId) return;
  
  const collaborators = await getCollaborators(state.currentBoardId);
  const container = document.getElementById('collabList');
  if (!container) return;
  
  // Keep pending section
  let pendingSection = container.querySelector('.collab-pending');
  const pendingHTML = pendingSection?.outerHTML || '';
  
  // Get board data to check owner
  const boardDoc = await getDoc(doc(state.db, 'boards', state.currentBoardId));
  const boardData = boardDoc.exists() ? boardDoc.data() : {};
  const isOwner = boardData.owner === state.currentUser?.uid;
  
  // Render existing section
  const existingHTML = collaborators.length > 0 ? `
    <div class="collab-existing">
      <div class="collab-section-title">People with access</div>
      ${collaborators.map(collab => {
        const isOnline = state.activeUsers.has(collab.uid);
        const isSelf = collab.uid === state.currentUser?.uid;
        const canEdit = isOwner && !isSelf && collab.role !== 'owner';
        const titleText = (collab.displayName || collab.email || '').replace(/"/g, '&quot;');
        
        return `
          <div class="collab-person ${isOnline ? 'collab-person--online' : 'collab-person--offline'}" data-uid="${collab.uid}">
            <div class="collab-person__avatar" style="background-color: ${getUserColor(collab.uid || collab.email)}">
              ${collab.photoURL 
                ? `<img src="${collab.photoURL}" alt="">`
                : (collab.displayName?.[0] || collab.email?.[0] || '?').toUpperCase()
              }
              ${isOnline ? '<span class="collab-person__status"></span>' : ''}
            </div>
            <div class="collab-person__info">
              <span class="collab-person__name" title="${titleText}">${collab.displayName || collab.email}${isSelf ? ' (you)' : ''}</span>
              <span class="collab-person__email-small">${collab.email}</span>
            </div>
            ${canEdit ? `
              <select class="collab-person__role js-existing-role" data-uid="${collab.uid}">
                <option value="editor" ${collab.role === 'editor' ? 'selected' : ''}>Can edit</option>
                <option value="viewer" ${collab.role === 'viewer' ? 'selected' : ''}>Can view</option>
              </select>
              <button class="collab-person__remove js-remove-existing" data-uid="${collab.uid}">×</button>
            ` : `
              <span class="collab-person__role-label">${getRoleLabel(collab.role)}</span>
            `}
          </div>
        `;
      }).join('')}
    </div>
  ` : '';
  
  container.innerHTML = pendingHTML + existingHTML;
  
  // Re-bind pending events
  container.querySelectorAll('.js-pending-role').forEach(select => {
    select.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index);
      if (state.pendingCollaborators[idx]) {
        state.pendingCollaborators[idx].role = e.target.value;
      }
    });
  });
  
  container.querySelectorAll('.js-remove-pending').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index);
      state.pendingCollaborators.splice(idx, 1);
      renderPendingCollaborators();
    });
  });
  
  // Bind existing collaborator events
  if (isOwner) {
    container.querySelectorAll('.js-existing-role').forEach(select => {
      select.addEventListener('change', async (e) => {
        const uid = e.target.dataset.uid;
        const newRole = e.target.value;
        const result = await updateCollaboratorRole(state.currentBoardId, uid, newRole);
        if (result.success) {
          showToast('Role updated');
        } else {
          showToast('Failed to update role', 'error');
        }
      });
    });
    
    container.querySelectorAll('.js-remove-existing').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const uid = e.target.dataset.uid;
        if (!confirm('Remove this collaborator?')) return;
        
        const result = await removeCollaborator(state.currentBoardId, uid);
        if (result.success) {
          showToast('Collaborator removed');
          loadAndRenderExistingCollaborators();
        } else {
          showToast('Failed to remove', 'error');
        }
      });
    });
  }
}

/**
 * Validate email format
 */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Start presence heartbeat
 * Uses a consistent interval - Firestore handles real-time sync
 */
function startPresenceHeartbeat() {
  // Initial update
  updatePresence();
  
  // Heartbeat every 30 seconds (Firestore listeners handle real-time sync)
  state.presenceInterval = setInterval(updatePresence, 30000);
}

/**
 * Enable fast presence updates when collaborators are active
 */
function enableFastPresence() {
  // If already on fast mode, do nothing
  if (state.fastPresenceInterval) return;
  
  // Clear normal interval
  if (state.presenceInterval) {
    clearInterval(state.presenceInterval);
    state.presenceInterval = null;
  }
  
  // Start fast interval (every 10 seconds)
  state.fastPresenceInterval = setInterval(updatePresence, 10000);
}

/**
 * Disable fast presence updates (return to normal)
 */
function disableFastPresence() {
  // Clear fast interval
  if (state.fastPresenceInterval) {
    clearInterval(state.fastPresenceInterval);
    state.fastPresenceInterval = null;
  }
  
  // Restart normal interval if not running
  if (!state.presenceInterval) {
    state.presenceInterval = setInterval(updatePresence, 30000);
  }
}

/**
 * Update user's presence
 */
async function updatePresence() {
  if (!state.currentBoardId || !state.currentUser || !state.db) return;
  
  try {
    const presenceRef = doc(
      state.db, 
      'boards', 
      state.currentBoardId, 
      'presence', 
      state.currentUser.uid
    );
    
    await setDoc(presenceRef, {
      uid: state.currentUser.uid,
      displayName: state.currentUser.displayName || 'Anonymous',
      email: state.currentUser.email,
      photoURL: state.currentUser.photoURL || null,
      lastSeen: serverTimestamp(),
      status: 'online',
      color: getUserColor(state.currentUser.uid)
    }, { merge: true });
  } catch (e) {
    console.error('Error updating presence:', e);
  }
}

/**
 * Mark user as offline
 */
async function markUserOffline(boardId, uid) {
  if (!state.db) return;
  
  try {
    const presenceRef = doc(state.db, 'boards', boardId, 'presence', uid);
    await updateDoc(presenceRef, {
      status: 'offline',
      lastSeen: serverTimestamp()
    });
  } catch (e) {
    // Ignore errors on unload
  }
}

/**
 * Get a consistent color for a user based on their UID or email
 */
function getUserColor(identifier) {
  if (!identifier) return USER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

/**
 * Subscribe to presence updates for a board
 */
export function subscribeToPresence(boardId) {
  if (!state.db || !boardId) return;
  
  // Unsubscribe from previous
  if (state.unsubscribePresence) state.unsubscribePresence();
  
  const presenceRef = collection(state.db, 'boards', boardId, 'presence');
  
  state.unsubscribePresence = onSnapshot(presenceRef, (snapshot) => {
    const now = Date.now();
    const STALE_THRESHOLD = 60000; // 1 minute
    
    state.activeUsers.clear();
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const lastSeen = data.lastSeen?.toMillis?.() || 0;
      
      // Only show users seen in the last minute
      if (now - lastSeen < STALE_THRESHOLD && data.status === 'online') {
        state.activeUsers.set(docSnap.id, {
          uid: docSnap.id,
          ...data
        });
      }
    });

    updateHeaderCollaboratorAvatars();
    
    // Check if we have active collaborators (excluding self)
    const hasActiveCollaborators = Array.from(state.activeUsers.keys()).some(
      uid => uid !== state.currentUser?.uid
    );
    
    // Adaptive presence frequency
    if (hasActiveCollaborators) {
      enableFastPresence();
    } else {
      disableFastPresence();
    }
    
    // Also update the collab list if open
    const collabList = document.getElementById('collabList');
    if (collabList && document.getElementById('shareDropdown')?.classList.contains('is-open')) {
      loadAndRenderExistingCollaborators();
    }
  }, (error) => {
    console.error('Presence subscription error:', error);
  });
  
  // Update own presence immediately
  updatePresence();
}

/**
 * Render collaborator avatars in the header (online + offline)
 */
function updateHeaderCollaboratorAvatars() {
  const avatarsContainer = document.getElementById('activeUsersAvatars');
  if (!avatarsContainer) return;

  // Exclude self
  const all = Array.from(state.collaborators.values()).filter(c => c?.uid && c.uid !== state.currentUser?.uid);

  // Sort: online first, then offline; stable by name/email
  all.sort((a, b) => {
    const aOnline = state.activeUsers.has(a.uid) ? 0 : 1;
    const bOnline = state.activeUsers.has(b.uid) ? 0 : 1;
    if (aOnline !== bOnline) return aOnline - bOnline;
    const aKey = (a.displayName || a.email || '').toLowerCase();
    const bKey = (b.displayName || b.email || '').toLowerCase();
    return aKey.localeCompare(bKey);
  });

  const visible = all.slice(0, 4);
  const remaining = all.length - visible.length;

  let html = visible.map(user => {
    const isOnline = state.activeUsers.has(user.uid);
    const cls = isOnline ? 'active-user-avatar--online' : 'active-user-avatar--offline';
    const label = user.displayName || user.email || 'Unknown';
    const statusText = isOnline ? 'online' : 'offline';
    const color = user.color || getUserColor(user.uid || user.email);
    return `
      <div
        class="active-user-avatar ${cls}"
        style="background-color: ${color}"
        title="${label} (${statusText})"
      >
        ${user.photoURL
          ? `<img src="${user.photoURL}" alt="${label}" class="active-user-avatar__img">`
          : `<span class="active-user-avatar__letter">${(label[0] || '?').toUpperCase()}</span>`
        }
        ${isOnline ? '<span class="active-user-avatar__status"></span>' : ''}
      </div>
    `;
  }).join('');

  if (remaining > 0) {
    html += `<div class="active-user-avatar active-user-avatar--count">+${remaining}</div>`;
  }

  avatarsContainer.innerHTML = html;

  const container = document.getElementById('activeUsers');
  if (container) {
    container.style.display = all.length > 0 ? 'flex' : 'none';
  }
}

// ============================================================
// REAL-TIME SYNC - Simplified & Robust
// ============================================================

/**
 * Subscribe to board changes for real-time sync
 * Uses operation IDs to detect own changes vs remote changes
 */
export function subscribeToBoardChanges(boardId, onBoardUpdate) {
  if (!state.db || !boardId) return;
  
  // Unsubscribe from previous
  if (state.unsubscribeBoard) {
    state.unsubscribeBoard();
    state.unsubscribeBoard = null;
  }
  
  // Store callback
  state.onBoardUpdate = onBoardUpdate;
  
  const boardRef = doc(state.db, 'boards', boardId);
  
  console.log(`[Collab] Subscribing to board: ${boardId}`);
  
  state.unsubscribeBoard = onSnapshot(boardRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.warn('[Collab] Board document does not exist');
      return;
    }
    
    const data = snapshot.data();
    const operationId = data.lastOperationId || '';
    const lastEditedBy = data.lastEditedBy;
    const blocks = data.blocks;
    
    console.log(`[Collab] Received update op: ${operationId.slice(-8)} from ${lastEditedBy?.slice(-6)}`);
    
    // Skip if this is our own operation
    if (operationId === state.lastLocalOperationId) {
      console.log('[Collab] Skipping own operation');
      return;
    }
    
    // Skip if we just saved (within 1 second) and the operation is from us
    if (lastEditedBy === state.currentUser?.uid && 
        state.lastLocalSaveTime && 
        Date.now() - state.lastLocalSaveTime < 1000) {
      console.log('[Collab] Skipping recent own save');
      return;
    }
    
    // Determine if we should apply the update
    const isFromAnotherUser = lastEditedBy !== state.currentUser?.uid;
    const userIsEditing = document.activeElement?.closest('[contenteditable="true"]');
    
    if (isFromAnotherUser && blocks) {
      // Another user made changes
      const editor = state.collaborators.get(lastEditedBy);
      const editorName = editor?.displayName || editor?.email || 'Someone';
      
      if (userIsEditing) {
        showToast(`${editorName} made changes - syncing...`, 'info');
      }
      
      // Flash to indicate update
      flashRemoteUpdate();
      
      // Apply the update
      console.log('[Collab] Applying remote update from', editorName);
      onBoardUpdate?.(blocks, data);
    } else if (blocks && !state.lastLocalOperationId) {
      // Initial load
      console.log('[Collab] Initial board data received');
      onBoardUpdate?.(blocks, data);
    }
    
  }, (error) => {
    console.error('[Collab] Board subscription error:', error);
    // Try to resubscribe after a delay
    setTimeout(() => {
      if (state.currentBoardId === boardId) {
        console.log('[Collab] Attempting to resubscribe...');
        subscribeToBoardChanges(boardId, onBoardUpdate);
      }
    }, 3000);
  });
}

/**
 * Check if we're currently syncing remote changes
 */
export function isRemoteSyncing() {
  return state.saveInProgress;
}

/**
 * Mark that a local change was made (call this before saving)
 * Now just updates the timestamp - the operation ID is set during save
 */
export function markLocalChange() {
  // This is now handled automatically in saveWithConflictResolution
  // Keeping this function for backwards compatibility
}

// ============================================================
// SAVING - Simple and reliable
// ============================================================

/**
 * Save board with operation timestamp for change detection
 * Uses simple atomic writes instead of complex transactions
 */
export async function saveWithConflictResolution(boardId, blocks, userId) {
  if (!state.db || !boardId) {
    return { success: false, error: 'Missing db or boardId' };
  }
  
  // Prevent concurrent saves
  if (state.saveInProgress) {
    console.log('[Collab] Save already in progress, queuing...');
    state.pendingSave = { boardId, blocks, userId };
    return { success: false, queued: true };
  }
  
  state.saveInProgress = true;
  
  // Generate unique operation ID
  const operationId = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  try {
    const boardRef = doc(state.db, 'boards', boardId);
    
    // Extract title from first text block
    let title = 'Untitled';
    if (blocks.rows?.[0]?.blocks?.[0]) {
      const firstBlock = blocks.rows[0].blocks[0];
      if (firstBlock.type === 'text' && firstBlock.content) {
        title = firstBlock.content.slice(0, 50) || 'Untitled';
      }
    }
    
    // Record that this is our operation (to skip our own changes)
    state.lastLocalOperationId = operationId;
    state.lastLocalSaveTime = Date.now();
    
    // Simple atomic update
    await updateDoc(boardRef, {
      blocks,
      title,
      lastEditedBy: userId,
      lastOperationId: operationId,
      lastOperationTime: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`[Collab] Saved successfully, op: ${operationId.slice(-8)}`);
    
    state.saveInProgress = false;
    
    // Process any queued save
    if (state.pendingSave) {
      const pending = state.pendingSave;
      state.pendingSave = null;
      setTimeout(() => {
        saveWithConflictResolution(pending.boardId, pending.blocks, pending.userId);
      }, 300);
    }
    
    return { success: true, operationId };
    
  } catch (error) {
    console.error('[Collab] Save error:', error);
    state.saveInProgress = false;
    
    // Retry once on transient errors
    if (error.code === 'unavailable' || error.code === 'aborted') {
      console.log('[Collab] Retrying save...');
      await new Promise(r => setTimeout(r, 500));
      return saveWithConflictResolution(boardId, blocks, userId);
    }
    
    return { success: false, error: error.message };
  }
}

// ============================================================
// SHARING & COLLABORATION MANAGEMENT
// ============================================================

/**
 * Share board with a user
 */
export async function shareBoard(boardId, email, role = 'editor') {
  if (!state.db || !boardId || !email) {
    return { success: false, error: 'Missing required parameters' };
  }
  
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find user by email
    const usersRef = collection(state.db, 'users');
    const q = query(usersRef, where('email', '==', normalizedEmail));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      // User doesn't exist - create pending invite
      await addDoc(collection(state.db, 'pendingInvites'), {
        email: normalizedEmail,
        boardId,
        role,
        invitedBy: state.currentUser.uid,
        invitedByEmail: state.currentUser.email,
        invitedAt: serverTimestamp(),
        status: 'pending'
      });
      
      return { success: true, pending: true };
    }
    
    const invitedUser = snap.docs[0];
    const invitedUserId = invitedUser.id;
    const invitedUserData = invitedUser.data();
    
    // Add to board's collaborators subcollection
    await setDoc(
      doc(state.db, 'boards', boardId, 'collaborators', invitedUserId),
      {
        uid: invitedUserId,
        email: normalizedEmail,
        displayName: invitedUserData.displayName || normalizedEmail,
        photoURL: invitedUserData.photoURL || null,
        role,
        addedBy: state.currentUser.uid,
        addedAt: serverTimestamp()
      }
    );
    
    // Also add to board's users subcollection (for legacy compatibility)
    await setDoc(
      doc(state.db, 'boards', boardId, 'users', invitedUserId),
      {
        userId: invitedUserId,
        role,
        addedAt: serverTimestamp()
      }
    );
    
    // Add board to user's boards collection
    await setDoc(
      doc(state.db, 'users', invitedUserId, 'boards', boardId),
      {
        boardId,
        role,
        sharedBy: state.currentUser.uid,
        linkedAt: serverTimestamp()
      }
    );
    
    // Mark board as shared
    await updateDoc(doc(state.db, 'boards', boardId), {
      type: 'shared'
    });
    
    return { success: true, user: invitedUserData };
    
  } catch (error) {
    console.error('Share error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update collaborator's role
 */
export async function updateCollaboratorRole(boardId, uid, newRole) {
  if (!state.db || !boardId || !uid) return { success: false };
  
  try {
    // Update in collaborators subcollection
    await updateDoc(
      doc(state.db, 'boards', boardId, 'collaborators', uid),
      { role: newRole }
    );
    
    // Update in users subcollection
    await updateDoc(
      doc(state.db, 'boards', boardId, 'users', uid),
      { role: newRole }
    ).catch(() => {}); // Ignore if doesn't exist
    
    // Update in user's boards
    await updateDoc(
      doc(state.db, 'users', uid, 'boards', boardId),
      { role: newRole }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Update role error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a collaborator
 */
export async function removeCollaborator(boardId, uid) {
  if (!state.db || !boardId || !uid) return { success: false };
  
  try {
    // Remove from board's collaborators
    await deleteDoc(doc(state.db, 'boards', boardId, 'collaborators', uid));
    
    // Remove from board's users
    await deleteDoc(doc(state.db, 'boards', boardId, 'users', uid)).catch(() => {});
    
    // Remove from user's boards
    await deleteDoc(doc(state.db, 'users', uid, 'boards', boardId));
    
    // Remove from presence
    await deleteDoc(doc(state.db, 'boards', boardId, 'presence', uid)).catch(() => {});
    
    return { success: true };
  } catch (error) {
    console.error('Remove collaborator error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all collaborators for a board
 */
export async function getCollaborators(boardId) {
  if (!state.db || !boardId) return [];
  
  try {
    const collabRef = collection(state.db, 'boards', boardId, 'collaborators');
    const snap = await getDocs(collabRef);
    
    const collaborators = [];
    snap.forEach(docSnap => {
      collaborators.push({
        uid: docSnap.id,
        ...docSnap.data()
      });
    });
    
    // Also get the owner from the board document
    const boardDoc = await getDoc(doc(state.db, 'boards', boardId));
    if (boardDoc.exists()) {
      const boardData = boardDoc.data();
      const ownerUid = boardData.owner;
      
      // Check if owner is already in collaborators
      if (ownerUid && !collaborators.find(c => c.uid === ownerUid)) {
        // Get owner's user data
        const ownerDoc = await getDoc(doc(state.db, 'users', ownerUid));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data();
          collaborators.unshift({
            uid: ownerUid,
            email: ownerData.email,
            displayName: ownerData.displayName || ownerData.email,
            photoURL: ownerData.photoURL || null,
            role: 'owner'
          });
        }
      }
    }
    
    // Sort: owners first, then editors, then viewers
    const roleOrder = { owner: 0, editor: 1, viewer: 2 };
    collaborators.sort((a, b) => (roleOrder[a.role] || 3) - (roleOrder[b.role] || 3));
    
    return collaborators;
  } catch (error) {
    console.error('Get collaborators error:', error);
    return [];
  }
}

/**
 * Subscribe to collaborators list changes
 */
export function subscribeToCollaborators(boardId, onUpdate) {
  if (!state.db || !boardId) return;
  
  if (state.unsubscribeCollaborators) state.unsubscribeCollaborators();
  
  const collabRef = collection(state.db, 'boards', boardId, 'collaborators');
  
  state.unsubscribeCollaborators = onSnapshot(collabRef, async (snapshot) => {
    const collaborators = [];
    snapshot.forEach(docSnap => {
      collaborators.push({ uid: docSnap.id, ...docSnap.data() });
    });
    
    if (onUpdate) onUpdate(collaborators);
  });
}

// ============================================================
// SHARE PANEL UI (Simplified - main UI is in the HTML)
// ============================================================

/**
 * Render collaborators in the share panel (existing collaborators section)
 */
function renderCollaboratorsList(collaborators) {
  // This is called by subscribeToCollaborators
  // The main rendering is done by loadAndRenderExistingCollaborators
}

// ============================================================
// LINK SHARING
// ============================================================

/**
 * Generate a unique share code for a board
 * Format: {username_prefix}_{random_code}
 */
function generateShareCode() {
  // Get username prefix (first 4 chars of display name or email, alphanumeric only)
  const displayName = state.currentUser?.displayName || state.currentUser?.email || 'user';
  const prefix = displayName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 4);
  
  // Generate random code (8 alphanumeric characters)
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return `${prefix}_${code}`;
}

/**
 * Load link sharing state when share panel opens
 */
async function loadLinkSharingState() {
  if (!state.currentBoardId || !state.db) return;
  
  try {
    const boardRef = doc(state.db, 'boards', state.currentBoardId);
    const boardSnap = await getDoc(boardRef);
    
    if (!boardSnap.exists()) return;
    
    const data = boardSnap.data();
    const toggle = document.getElementById('linkSharingToggle');
    const content = document.getElementById('linkSharingContent');
    const linkInput = document.getElementById('shareLinkInput');
    
    if (data.publicShareCode && data.publicShareEnabled) {
      // Link sharing is enabled
      if (toggle) toggle.checked = true;
      if (content) content.style.display = 'block';
      if (linkInput) {
        const shareUrl = buildShareUrl(data.publicShareCode);
        linkInput.value = shareUrl;
      }
    } else {
      // Link sharing is disabled
      if (toggle) toggle.checked = false;
      if (content) content.style.display = 'none';
      if (linkInput) linkInput.value = '';
    }
  } catch (error) {
    console.error('Error loading link sharing state:', error);
  }
}

/**
 * Build the share URL for a given share code
 */
function buildShareUrl(shareCode) {
  const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
  return `${baseUrl}view.html?board=${shareCode}`;
}

/**
 * Handle link sharing toggle
 */
async function handleLinkSharingToggle(e) {
  const enabled = e.target.checked;
  const content = document.getElementById('linkSharingContent');
  const linkInput = document.getElementById('shareLinkInput');
  
  if (!state.currentBoardId || !state.db) {
    e.target.checked = false;
    showToast('No board selected', 'error');
    return;
  }
  
  try {
    const boardRef = doc(state.db, 'boards', state.currentBoardId);
    
    if (enabled) {
      // Enable link sharing - generate code if not exists
      const boardSnap = await getDoc(boardRef);
      const data = boardSnap.data();
      
      let shareCode = data?.publicShareCode;
      if (!shareCode) {
        shareCode = generateShareCode();
      }
      
      // Update board with share code
      await updateDoc(boardRef, {
        publicShareCode: shareCode,
        publicShareEnabled: true,
        publicShareEnabledAt: serverTimestamp(),
        publicShareEnabledBy: state.currentUser.uid
      });
      
      // Show the link
      const shareUrl = buildShareUrl(shareCode);
      if (content) content.style.display = 'block';
      if (linkInput) linkInput.value = shareUrl;
      
      showToast('Link sharing enabled');
      
    } else {
      // Disable link sharing (keep the code for later re-enable)
      await updateDoc(boardRef, {
        publicShareEnabled: false
      });
      
      if (content) content.style.display = 'none';
      if (linkInput) linkInput.value = '';
      
      showToast('Link sharing disabled');
    }
  } catch (error) {
    console.error('Error toggling link sharing:', error);
    showToast('Failed to update sharing settings', 'error');
    e.target.checked = !enabled; // Revert toggle
  }
}

/**
 * Handle copy link button click
 */
async function handleCopyLink() {
  const linkInput = document.getElementById('shareLinkInput');
  const link = linkInput?.value;
  
  if (!link) {
    showToast('No link to copy', 'error');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(link);
    showToast('Link copied to clipboard');
  } catch (error) {
    // Fallback for older browsers
    linkInput.select();
    document.execCommand('copy');
    showToast('Link copied to clipboard');
  }
}

/**
 * Get board data by share code (for public viewing)
 */
export async function getBoardByShareCode(shareCode, db) {
  if (!shareCode || !db) return null;
  
  try {
    // Query boards collection for matching share code
    const boardsRef = collection(db, 'boards');
    const q = query(
      boardsRef, 
      where('publicShareCode', '==', shareCode),
      where('publicShareEnabled', '==', true)
    );
    
    const snap = await getDocs(q);
    
    if (snap.empty) {
      return { error: 'Board not found or sharing is disabled' };
    }
    
    const boardDoc = snap.docs[0];
    const boardData = boardDoc.data();
    
    // Get owner info for display
    let ownerInfo = null;
    if (boardData.owner) {
      try {
        const ownerDoc = await getDoc(doc(db, 'users', boardData.owner));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data();
          ownerInfo = {
            displayName: ownerData.displayName,
            photoURL: ownerData.photoURL
          };
        }
      } catch (e) {
        // Ignore owner fetch errors
      }
    }
    
    return {
      id: boardDoc.id,
      title: boardData.title || 'Untitled',
      blocks: boardData.blocks,
      owner: ownerInfo,
      updatedAt: boardData.updatedAt
    };
  } catch (error) {
    console.error('Error fetching board by share code:', error);
    return { error: 'Failed to load board' };
  }
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Flash animation to indicate remote changes were applied
 */
function flashRemoteUpdate() {
  const boardItems = document.getElementById('boardItems');
  if (!boardItems) return;
  
  // Add flash class to all visible items briefly
  const items = boardItems.querySelectorAll('.item');
  items.forEach(item => {
    item.classList.add('item--remote-updated');
    setTimeout(() => {
      item.classList.remove('item--remote-updated');
    }, 600);
  });
}

function getRoleLabel(role) {
  const labels = {
    owner: 'Owner',
    editor: 'Can edit',
    viewer: 'Can view'
  };
  return labels[role] || role;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Event handlers
function handleUnload() {
  if (state.currentBoardId && state.currentUser) {
    // Use sendBeacon for reliable unload tracking
    const presenceUrl = `/api/presence-offline`; // Would need a cloud function
    navigator.sendBeacon?.(presenceUrl, JSON.stringify({
      boardId: state.currentBoardId,
      userId: state.currentUser.uid
    }));
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    // Tab is hidden - mark as away
    if (state.currentBoardId && state.currentUser && state.db) {
      const presenceRef = doc(
        state.db, 
        'boards', 
        state.currentBoardId, 
        'presence', 
        state.currentUser.uid
      );
      updateDoc(presenceRef, { status: 'away' }).catch(() => {});
    }
  } else {
    // Tab is visible - mark as online
    updatePresence();
  }
}

// ============================================================
// EXPORTS
// ============================================================

export {
  state as collaborationState,
  getUserColor,
  loadAndRenderExistingCollaborators
};
