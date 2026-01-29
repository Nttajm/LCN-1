// ========================================
// POKER LOBBY - Multiplayer Lobby System
// Firebase integration for real-time poker lobbies
// ========================================

import { 
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Lobby status types
export const LOBBY_STATUS = {
  OPEN: 'open',           // Accepting new players
  FULL: 'full',           // Max players reached, waiting for ready
  IN_GAME: 'in_game',     // Game in progress
  CLOSED: 'closed'        // Lobby closed
};

// Request status
export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

// ========================================
// POKER LOBBY MANAGER
// ========================================
export class PokerLobbyManager {
  constructor() {
    this.db = null;
    this.currentUser = null;
    this.currentLobby = null;
    this.currentLobbyId = null;
    this.lobbyUnsubscribe = null;
    this.lobbiesUnsubscribe = null;
    this.requestsUnsubscribe = null;
    this.onlineUnsubscribe = null;
    this.refreshInterval = null;
    this.isInitialized = false;
    
    // Inactivity tracking
    this.inactivityTimeout = null;
    this.isInactive = false;
    this.INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    
    // Callbacks
    this.onLobbyUpdate = null;
    this.onLobbiesUpdate = null;
    this.onJoinRequest = null;
    this.onGameStart = null;
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.onOnlinePlayersUpdate = null;
    this.onError = null;
    
    // Bind visibility handler
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleUserActivity = this.handleUserActivity.bind(this);
  }

  // Initialize with Firestore and current user
  async init(db, user) {
    this.db = db;
    this.currentUser = user;

    if (!this.db || !this.currentUser) {
      console.error('PokerLobbyManager: Missing db or user');
      return false;
    }

    // Prevent double initialization
    if (this.isInitialized) {
      console.log('PokerLobbyManager already initialized');
      return true;
    }

    // Set user as online in poker
    await this.setOnlineStatus(true);

    // Check if user was in a lobby before (page refresh)
    await this.rejoinExistingLobby();

    // Listen for online players
    this.startOnlinePlayersListener();

    // Listen for available lobbies
    this.startLobbiesListener();

    // Listen for join requests (if in a lobby)
    this.startJoinRequestsListener();

    // Start periodic refresh for sync
    this.startPeriodicRefresh();

    // Clean up inactive lobbies (older than 5 minutes)
    this.cleanupInactiveLobbies();

    // Start inactivity detection
    this.startInactivityDetection();

    this.isInitialized = true;
    console.log('PokerLobbyManager initialized');
    return true;
  }

  // ========================================
  // INACTIVITY DETECTION
  // ========================================

  // Start listening for user activity and visibility changes
  startInactivityDetection() {
    // Listen for visibility changes (tab switch, minimize)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Listen for user activity
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      document.addEventListener(event, this.handleUserActivity, { passive: true });
    });
    
    // Start inactivity timer
    this.resetInactivityTimer();
  }

  // Stop inactivity detection
  stopInactivityDetection() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      document.removeEventListener(event, this.handleUserActivity);
    });
    
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
  }

  // Handle visibility change (tab switch)
  handleVisibilityChange() {
    if (document.hidden) {
      console.log('🔴 Tab hidden - pausing listeners');
      this.pauseListenersForInactivity();
    } else {
      console.log('🟢 Tab visible - resuming listeners');
      this.resumeListenersFromInactivity();
    }
  }

  // Handle user activity
  handleUserActivity() {
    if (this.isInactive) {
      console.log('🟢 User activity detected - resuming listeners');
      this.resumeListenersFromInactivity();
    }
    this.resetInactivityTimer();
  }

  // Reset the inactivity timer
  resetInactivityTimer() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
    
    this.inactivityTimeout = setTimeout(() => {
      console.log('⏱️ User inactive - pausing listeners to save resources');
      this.pauseListenersForInactivity();
    }, this.INACTIVITY_THRESHOLD);
  }

  // Pause listeners when user is inactive
  pauseListenersForInactivity() {
    if (this.isInactive) return; // Already paused
    
    this.isInactive = true;
    
    // Unsubscribe from real-time listeners (but keep local state)
    if (this.lobbiesUnsubscribe) {
      this.lobbiesUnsubscribe();
      this.lobbiesUnsubscribe = null;
    }
    
    if (this.onlineUnsubscribe) {
      this.onlineUnsubscribe();
      this.onlineUnsubscribe = null;
    }
    
    // Keep lobby listener active if in a game to not miss updates
    if (!this.currentLobby?.status || this.currentLobby.status !== LOBBY_STATUS.IN_GAME) {
      if (this.lobbyUnsubscribe) {
        this.lobbyUnsubscribe();
        this.lobbyUnsubscribe = null;
      }
    }
    
    // Stop periodic refresh
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    console.log('⏸️ Listeners paused for inactivity');
  }

  // Resume listeners when user becomes active
  resumeListenersFromInactivity() {
    if (!this.isInactive) return; // Already active
    
    this.isInactive = false;
    
    // Restart listeners
    this.startOnlinePlayersListener();
    this.startLobbiesListener();
    
    if (this.currentLobbyId && !this.lobbyUnsubscribe) {
      this.startLobbyListener(this.currentLobbyId);
    }
    
    // Restart periodic refresh
    this.startPeriodicRefresh();
    
    // Refresh data immediately
    this.refreshData();
    
    console.log('▶️ Listeners resumed after inactivity');
  }

  // Rejoin existing lobby if user was in one (handles page refresh)
  async rejoinExistingLobby() {
    try {
      const userDoc = await getDoc(doc(this.db, 'mulon_users', this.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.currentPokerLobby) {
          // Check if lobby still exists
          const lobbyDoc = await getDoc(doc(this.db, 'poker_lobbies', userData.currentPokerLobby));
          if (lobbyDoc.exists()) {
            const lobbyData = lobbyDoc.data();
            // Check if user is still in the lobby
            if (lobbyData.players?.some(p => p.id === this.currentUser.uid)) {
              this.currentLobbyId = userData.currentPokerLobby;
              this.startLobbyListener(this.currentLobbyId);
              console.log('Rejoined existing lobby:', this.currentLobbyId);
              return;
            }
          }
          // Lobby doesn't exist or user not in it, clear the reference
          await updateDoc(doc(this.db, 'mulon_users', this.currentUser.uid), {
            currentPokerLobby: null
          });
        }
      }
    } catch (error) {
      console.error('Error checking existing lobby:', error);
    }
  }

  // Start periodic refresh to keep data in sync
  startPeriodicRefresh() {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh every 5 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, 5000);

    // Cleanup inactive lobbies every 2 minutes
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveLobbies();
    }, 2 * 60 * 1000); // 2 minutes
  }

  // Refresh all data
  async refreshData() {
    // Update online status heartbeat
    await this.setOnlineStatus(true);

    // If in a lobby, verify we're still in it
    if (this.currentLobbyId) {
      try {
        const lobbyDoc = await getDoc(doc(this.db, 'poker_lobbies', this.currentLobbyId));
        if (!lobbyDoc.exists()) {
          // Lobby was deleted
          this.currentLobbyId = null;
          this.currentLobby = null;
          if (this.onLobbyUpdate) this.onLobbyUpdate(null);
        } else {
          const lobbyData = lobbyDoc.data();
          // Check if we're still in the lobby
          if (!lobbyData.players?.some(p => p.id === this.currentUser.uid)) {
            this.currentLobbyId = null;
            this.currentLobby = null;
            if (this.onLobbyUpdate) this.onLobbyUpdate(null);
          }
        }
      } catch (error) {
        console.error('Error refreshing lobby:', error);
      }
    } else {
      // Not in a lobby - check if user was added to one (join request accepted)
      try {
        const userDoc = await getDoc(doc(this.db, 'mulon_users', this.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.currentPokerLobby) {
            // Check if lobby exists and user is in it
            const lobbyDoc = await getDoc(doc(this.db, 'poker_lobbies', userData.currentPokerLobby));
            if (lobbyDoc.exists()) {
              const lobbyData = lobbyDoc.data();
              if (lobbyData.players?.some(p => p.id === this.currentUser.uid)) {
                // Join request was accepted! Start listening to this lobby
                this.currentLobbyId = userData.currentPokerLobby;
                this.startLobbyListener(this.currentLobbyId);
                console.log('✅ Join request accepted, now in lobby:', this.currentLobbyId);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking for new lobby:', error);
      }
    }
  }

  // Clean up lobbies that have been inactive for more than 4 minutes
  // Also removes duplicate solo lobbies if user is in another lobby with more players
  async cleanupInactiveLobbies() {
    try {
      const lobbiesRef = collection(this.db, 'poker_lobbies');
      const snapshot = await getDocs(lobbiesRef);
      
      const now = Date.now();
      const fourMinutesAgo = now - (4 * 60 * 1000); // 4 minutes in milliseconds
      
      const deletePromises = [];
      const allLobbies = [];
      
      // First pass: collect all lobbies
      snapshot.forEach(docSnap => {
        allLobbies.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      // Group lobbies by user to find duplicates
      const userLobbies = {};
      allLobbies.forEach(lobby => {
        (lobby.players || []).forEach(player => {
          if (!userLobbies[player.id]) {
            userLobbies[player.id] = [];
          }
          userLobbies[player.id].push(lobby);
        });
      });
      
      // Find duplicate lobbies to delete (solo lobbies when user is in another)
      const duplicatesToDelete = new Set();
      Object.values(userLobbies).forEach(lobbies => {
        if (lobbies.length > 1) {
          // User is in multiple lobbies - keep the one with more players or the active game
          const sorted = [...lobbies].sort((a, b) => {
            // Prefer in-game lobbies
            if (a.status === 'in_game' && b.status !== 'in_game') return -1;
            if (b.status === 'in_game' && a.status !== 'in_game') return 1;
            // Then prefer more players
            return (b.players?.length || 0) - (a.players?.length || 0);
          });
          // Delete all but the best lobby (if they're solo lobbies)
          for (let i = 1; i < sorted.length; i++) {
            if ((sorted[i].players?.length || 0) <= 1) {
              duplicatesToDelete.add(sorted[i].id);
            }
          }
        }
      });
      
      // Second pass: mark for deletion
      allLobbies.forEach(lobby => {
        const updatedAt = lobby.updatedAt?.toMillis?.() || lobby.createdAt?.toMillis?.() || 0;
        const isInactive = updatedAt < fourMinutesAgo;
        const isEmpty = !lobby.players || lobby.players.length === 0;
        const isDuplicate = duplicatesToDelete.has(lobby.id);
        
        if (isEmpty || isInactive || isDuplicate) {
          const reason = isEmpty ? 'empty' : isInactive ? 'inactive' : 'duplicate';
          console.log(`🗑️ Cleaning up ${reason} lobby: ${lobby.id}`);
          deletePromises.push(deleteDoc(doc(this.db, 'poker_lobbies', lobby.id)));
        }
      });
      
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log(`🧹 Cleaned up ${deletePromises.length} lobbies`);
      }
    } catch (error) {
      console.error('Error cleaning up inactive lobbies:', error);
    }
  }

  // ========================================
  // ONLINE STATUS
  // ========================================

  // Set user's poker online status
  async setOnlineStatus(isOnPoker) {
    if (!this.currentUser) return;

    try {
      const userRef = doc(this.db, 'mulon_users', this.currentUser.uid);
      await updateDoc(userRef, {
        isOnPoker: isOnPoker,
        pokerLastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Error setting online status:', error);
    }
  }

  // Start listening for online poker players
  startOnlinePlayersListener() {
    const usersRef = collection(this.db, 'mulon_users');
    const q = query(usersRef, where('isOnPoker', '==', true));

    this.onlineUnsubscribe = onSnapshot(q, (snapshot) => {
      const onlinePlayers = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (docSnap.id !== this.currentUser?.uid) {
          onlinePlayers.push({
            id: docSnap.id,
            displayName: data.displayName || data.email?.split('@')[0] || 'Player',
            photoURL: data.photoURL || null,
            balance: data.balance || 0,
            lobbyId: data.currentPokerLobby || null
          });
        }
      });

      console.log('Online players:', onlinePlayers.length);
      if (this.onOnlinePlayersUpdate) {
        this.onOnlinePlayersUpdate(onlinePlayers);
      }
    }, (error) => {
      console.error('Online players listener error:', error);
    });
  }

  // ========================================
  // LOBBY MANAGEMENT
  // ========================================

  // Update lobby buy-in (host only)
  async updateBuyIn(newBuyIn) {
    if (!this.currentUser || !this.currentLobbyId) {
      return { success: false, error: 'Not in a lobby' };
    }

    if (newBuyIn < 10) {
      return { success: false, error: 'Minimum buy-in is $10' };
    }

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);
      const lobbyDoc = await getDoc(lobbyRef);

      if (!lobbyDoc.exists()) {
        return { success: false, error: 'Lobby not found' };
      }

      const lobbyData = lobbyDoc.data();

      // Only host can update buy-in
      if (lobbyData.hostId !== this.currentUser.uid) {
        return { success: false, error: 'Only the host can change buy-in' };
      }

      // Can't change buy-in during game
      if (lobbyData.status === LOBBY_STATUS.IN_GAME) {
        return { success: false, error: 'Cannot change buy-in during game' };
      }

      // Update buy-in in Firestore
      await updateDoc(lobbyRef, {
        buyIn: newBuyIn,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating buy-in:', error);
      return { success: false, error: error.message };
    }
  }

  // Create a new poker lobby
  async createLobby(buyIn, isPublic = true, maxPlayers = 6) {
    if (!this.currentUser) {
      return { success: false, error: 'Not signed in' };
    }

    // Check if already in a lobby - leave it first to prevent duplicates
    if (this.currentLobbyId) {
      console.log('⚠️ Already in a lobby, leaving before creating new one...');
      await this.leaveLobby();
    }

    // Check if user has enough balance
    const userData = window.CasinoAuth?.userData;
    if (userData && userData.balance < buyIn) {
      return { success: false, error: 'Insufficient balance for buy-in' };
    }

    try {
      // Create lobby document
      const lobbyRef = await addDoc(collection(this.db, 'poker_lobbies'), {
        hostId: this.currentUser.uid,
        hostName: this.currentUser.displayName || 'Host',
        hostPhotoURL: this.currentUser.photoURL || null,
        buyIn: buyIn,
        maxPlayers: maxPlayers,
        isPublic: isPublic,
        status: LOBBY_STATUS.OPEN,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Players array with host
        players: [{
          id: this.currentUser.uid,
          displayName: this.currentUser.displayName || 'Host',
          photoURL: this.currentUser.photoURL || null,
          seatIndex: 0,
          isReady: false,
          isHost: true,
          joinedAt: Date.now()
        }],
        
        // Game state (null until game starts)
        gameState: null
      });

      // Update user's current lobby
      await updateDoc(doc(this.db, 'mulon_users', this.currentUser.uid), {
        currentPokerLobby: lobbyRef.id
      });

      this.currentLobbyId = lobbyRef.id;
      
      // Start listening to this lobby
      this.startLobbyListener(lobbyRef.id);

      return { success: true, lobbyId: lobbyRef.id };
    } catch (error) {
      console.error('Error creating lobby:', error);
      return { success: false, error: error.message };
    }
  }

  // Request to join a lobby
  async requestJoinLobby(lobbyId) {
    if (!this.currentUser) {
      return { success: false, error: 'Not signed in' };
    }

    // Leave current lobby first to prevent duplicates
    if (this.currentLobbyId && this.currentLobbyId !== lobbyId) {
      console.log('⚠️ Leaving current lobby before requesting to join new one...');
      await this.leaveLobby();
    }

    try {
      // Get lobby data first
      const lobbyDoc = await getDoc(doc(this.db, 'poker_lobbies', lobbyId));
      if (!lobbyDoc.exists()) {
        return { success: false, error: 'Lobby not found' };
      }

      const lobbyData = lobbyDoc.data();

      // Check if lobby is full
      if (lobbyData.players.length >= lobbyData.maxPlayers) {
        return { success: false, error: 'Lobby is full' };
      }

      // Check if already in lobby
      if (lobbyData.players.find(p => p.id === this.currentUser.uid)) {
        return { success: false, error: 'Already in this lobby' };
      }

      // Allow joining in-game lobbies (they'll wait for next hand)
      // Only block if lobby is full
      if (lobbyData.players.length >= lobbyData.maxPlayers) {
        return { success: false, error: 'Lobby is full' };
      }

      // Check balance
      const userData = window.CasinoAuth?.userData;
      if (userData && userData.balance < lobbyData.buyIn) {
        return { success: false, error: 'Insufficient balance for buy-in' };
      }

      // Always create a join request - host must approve
      await addDoc(collection(this.db, 'poker_join_requests'), {
        lobbyId: lobbyId,
        hostId: lobbyData.hostId,
        requesterId: this.currentUser.uid,
        requesterName: this.currentUser.displayName || 'Player',
        requesterPhotoURL: this.currentUser.photoURL || null,
        status: REQUEST_STATUS.PENDING,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 30000) // 30 second expiry
      });

      return { success: true, pending: true, message: 'Request sent' };
    } catch (error) {
      console.error('Error requesting to join:', error);
      return { success: false, error: error.message };
    }
  }

  // Join a lobby directly
  async joinLobby(lobbyId) {
    if (!this.currentUser) {
      return { success: false, error: 'Not signed in' };
    }

    // Leave any previous lobby first to prevent duplicates
    if (this.currentLobbyId && this.currentLobbyId !== lobbyId) {
      console.log('⚠️ Leaving current lobby before joining new one...');
      await this.leaveLobby();
    }

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', lobbyId);
      const lobbyDoc = await getDoc(lobbyRef);

      if (!lobbyDoc.exists()) {
        return { success: false, error: 'Lobby not found' };
      }

      const lobbyData = lobbyDoc.data();

      // Find first empty seat
      const takenSeats = lobbyData.players.map(p => p.seatIndex);
      let seatIndex = 0;
      while (takenSeats.includes(seatIndex)) {
        seatIndex++;
      }

      if (seatIndex >= lobbyData.maxPlayers) {
        return { success: false, error: 'Lobby is full' };
      }

      // Add player to lobby
      const newPlayer = {
        id: this.currentUser.uid,
        displayName: this.currentUser.displayName || 'Player',
        photoURL: this.currentUser.photoURL || null,
        seatIndex: seatIndex,
        isReady: false,
        isHost: false,
        joinedAt: Date.now(),
        waitingForNextHand: lobbyData.status === LOBBY_STATUS.IN_GAME // Mark if joining mid-game
      };

      // Determine new status - don't change IN_GAME status when someone joins
      let newStatus = lobbyData.status;
      if (lobbyData.status !== LOBBY_STATUS.IN_GAME) {
        newStatus = lobbyData.players.length + 1 >= lobbyData.maxPlayers ? 
          LOBBY_STATUS.FULL : LOBBY_STATUS.OPEN;
      }

      await updateDoc(lobbyRef, {
        players: arrayUnion(newPlayer),
        updatedAt: serverTimestamp(),
        status: newStatus
      });

      // Update user's current lobby
      await updateDoc(doc(this.db, 'mulon_users', this.currentUser.uid), {
        currentPokerLobby: lobbyId
      });

      this.currentLobbyId = lobbyId;
      this.startLobbyListener(lobbyId);

      return { success: true, lobbyId, seatIndex };
    } catch (error) {
      console.error('Error joining lobby:', error);
      return { success: false, error: error.message };
    }
  }

  // Leave current lobby
  async leaveLobby() {
    // Store lobby ID before clearing (in case of error)
    const lobbyIdToLeave = this.currentLobbyId;
    
    if (!lobbyIdToLeave || !this.currentUser) {
      // Clear local state even if not in a lobby
      this.currentLobbyId = null;
      this.currentLobby = null;
      return { success: true, message: 'Not in a lobby' };
    }

    try {
      // Stop listening first to prevent race conditions
      if (this.lobbyUnsubscribe) {
        this.lobbyUnsubscribe();
        this.lobbyUnsubscribe = null;
      }
      
      const lobbyRef = doc(this.db, 'poker_lobbies', lobbyIdToLeave);
      const lobbyDoc = await getDoc(lobbyRef);

      // Lobby already deleted, just clean up local state
      if (!lobbyDoc.exists()) {
        this.currentLobbyId = null;
        this.currentLobby = null;
        // Update user status silently
        try {
          await updateDoc(doc(this.db, 'mulon_users', this.currentUser.uid), {
            currentPokerLobby: null
          });
        } catch (e) { /* ignore */ }
        return { success: true };
      }

      const lobbyData = lobbyDoc.data();
      const player = lobbyData.players?.find(p => p.id === this.currentUser.uid);

      // Player not in lobby anymore, just clean up local state
      if (!player) {
        this.currentLobbyId = null;
        this.currentLobby = null;
        return { success: true };
      }

      // Filter out the leaving player from the players array
      const remainingPlayers = (lobbyData.players || []).filter(p => p.id !== this.currentUser.uid);

      // If no players remain, delete the lobby entirely
      if (remainingPlayers.length === 0) {
        try {
          await deleteDoc(lobbyRef);
          console.log('🗑️ Lobby deleted - no players remaining');
        } catch (e) {
          console.log('Lobby already deleted or error:', e.message);
        }
      } else {
        // Prepare update object
        const updateData = {
          players: remainingPlayers,
          updatedAt: serverTimestamp()
        };
        
        // Update lobby status based on remaining players
        if (lobbyData.status !== LOBBY_STATUS.IN_GAME) {
          updateData.status = remainingPlayers.length >= lobbyData.maxPlayers ? 
            LOBBY_STATUS.FULL : LOBBY_STATUS.OPEN;
        }
        
        // If host leaves, transfer host to next player
        if (lobbyData.hostId === this.currentUser.uid) {
          const newHost = remainingPlayers[0];
          updateData.hostId = newHost.id;
          updateData.hostName = newHost.displayName;
          updateData.hostPhotoURL = newHost.photoURL;
          
          // Update players array with new host flag
          updateData.players = remainingPlayers.map((p, i) => ({
            ...p,
            isHost: i === 0
          }));
          
          console.log('👑 Host transferred to:', newHost.displayName);
        }
        
        // If game is in progress, also update gameState to remove the player
        if (lobbyData.status === LOBBY_STATUS.IN_GAME && lobbyData.gameState) {
          const gameStatePlayers = lobbyData.gameState.players || [];
          const leavingPlayerSeatIndex = gameStatePlayers.findIndex(
            p => p && p.id === this.currentUser.uid
          );
          
          if (leavingPlayerSeatIndex !== -1) {
            // Set the player's seat to null (they've left)
            const updatedGameStatePlayers = [...gameStatePlayers];
            updatedGameStatePlayers[leavingPlayerSeatIndex] = null;
            
            // Update game state
            updateData.gameState = {
              ...lobbyData.gameState,
              players: updatedGameStatePlayers
            };
            
            // If it was their turn, advance to next player
            if (lobbyData.gameState.currentPlayerIndex === leavingPlayerSeatIndex) {
              let nextIdx = (leavingPlayerSeatIndex + 1) % updatedGameStatePlayers.length;
              // Find next active player
              let attempts = 0;
              while (attempts < updatedGameStatePlayers.length) {
                const nextPlayer = updatedGameStatePlayers[nextIdx];
                if (nextPlayer && !nextPlayer.isFolded && nextPlayer.chips > 0) {
                  break;
                }
                nextIdx = (nextIdx + 1) % updatedGameStatePlayers.length;
                attempts++;
              }
              updateData.gameState.currentPlayerIndex = nextIdx;
            }
            
            console.log('🎮 Updated game state - player removed from seat', leavingPlayerSeatIndex);
          }
        }
        
        // Single atomic update to remove player and update host if needed
        try {
          await updateDoc(lobbyRef, updateData);
          console.log('✅ Player removed from lobby, remaining players:', remainingPlayers.length);
        } catch (e) {
          console.error('Error updating lobby after player leave:', e.message);
        }
      }

      // Update user status
      try {
        await updateDoc(doc(this.db, 'mulon_users', this.currentUser.uid), {
          currentPokerLobby: null
        });
      } catch (e) {
        console.log('Could not update user status:', e.message);
      }

      // Clear local state
      this.currentLobbyId = null;
      this.currentLobby = null;

      // Notify callback that we left
      if (this.onPlayerLeave) {
        this.onPlayerLeave(this.currentUser.uid);
      }

      return { success: true };
    } catch (error) {
      console.error('Error leaving lobby:', error);
      // Still clear local state on error to prevent stuck state
      this.currentLobbyId = null;
      this.currentLobby = null;
      return { success: false, error: error.message };
    }
  }

  // Check if lobby can start game
  canStartGame() {
    if (!this.currentLobby) return false;
    const players = this.currentLobby.players || [];
    return players.length >= 2 && players.every(p => p.isReady);
  }

  // Get player count
  getPlayerCount() {
    return this.currentLobby?.players?.length || 0;
  }

  // Set player ready status
  async setReady(isReady) {
    if (!this.currentLobbyId || !this.currentUser) {
      return { success: false, error: 'Not in a lobby' };
    }

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);
      const lobbyDoc = await getDoc(lobbyRef);

      if (!lobbyDoc.exists()) {
        return { success: false, error: 'Lobby not found' };
      }

      const lobbyData = lobbyDoc.data();
      const updatedPlayers = lobbyData.players.map(p => {
        if (p.id === this.currentUser.uid) {
          return { ...p, isReady };
        }
        return p;
      });

      await updateDoc(lobbyRef, {
        players: updatedPlayers,
        updatedAt: serverTimestamp()
      });

      // Check if all players are ready and we have at least 2 players
      const allReady = updatedPlayers.every(p => p.isReady);
      const canStart = allReady && updatedPlayers.length >= 2;
      
      // Update lobby status
      if (canStart) {
        await updateDoc(lobbyRef, {
          status: LOBBY_STATUS.IN_GAME
        });
        // Signal game start
        if (this.onGameStart) {
          this.onGameStart(this.currentLobbyId);
        }
      }

      return { success: true, canStart };
    } catch (error) {
      console.error('Error setting ready:', error);
      return { success: false, error: error.message };
    }
  }

  // Start game - only host can call this
  async startGameByHost() {
    if (!this.currentLobbyId || !this.currentUser) {
      return { success: false, error: 'Not in a lobby' };
    }

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);
      const lobbyDoc = await getDoc(lobbyRef);

      if (!lobbyDoc.exists()) {
        return { success: false, error: 'Lobby not found' };
      }

      const lobbyData = lobbyDoc.data();

      // Only host can start the game
      if (lobbyData.hostId !== this.currentUser.uid) {
        return { success: false, error: 'Only the host can start the game' };
      }

      // Need at least 2 players
      if (!lobbyData.players || lobbyData.players.length < 2) {
        return { success: false, error: 'Need at least 2 players to start' };
      }

      // Update lobby status to IN_GAME
      await updateDoc(lobbyRef, {
        status: LOBBY_STATUS.IN_GAME,
        gameStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('🎮 Host started the game!');

      // Signal game start
      if (this.onGameStart) {
        this.onGameStart(this.currentLobbyId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error starting game:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if current user is the host
  isHost() {
    if (!this.currentLobby || !this.currentUser) return false;
    return this.currentLobby.hostId === this.currentUser.uid;
  }

  // ========================================
  // JOIN REQUESTS
  // ========================================

  // Handle join request (accept/reject)
  async handleJoinRequest(requestId, accept) {
    try {
      const requestRef = doc(this.db, 'poker_join_requests', requestId);
      const requestDoc = await getDoc(requestRef);

      if (!requestDoc.exists()) {
        return { success: false, error: 'Request not found' };
      }

      const requestData = requestDoc.data();

      // Only host can handle requests
      if (requestData.hostId !== this.currentUser?.uid) {
        return { success: false, error: 'Not authorized' };
      }

      if (accept) {
        // Accept - add player to lobby
        const result = await this.addPlayerToLobby(
          requestData.lobbyId,
          requestData.requesterId,
          requestData.requesterName,
          requestData.requesterPhotoURL
        );

        if (!result.success) {
          await updateDoc(requestRef, { status: REQUEST_STATUS.REJECTED });
          return result;
        }

        await updateDoc(requestRef, { status: REQUEST_STATUS.ACCEPTED });
        return { success: true };
      } else {
        // Reject
        await updateDoc(requestRef, { status: REQUEST_STATUS.REJECTED });
        return { success: true };
      }
    } catch (error) {
      console.error('Error handling join request:', error);
      return { success: false, error: error.message };
    }
  }

  // Add player to lobby (internal)
  async addPlayerToLobby(lobbyId, playerId, playerName, playerPhotoURL) {
    const lobbyRef = doc(this.db, 'poker_lobbies', lobbyId);
    const lobbyDoc = await getDoc(lobbyRef);

    if (!lobbyDoc.exists()) {
      return { success: false, error: 'Lobby not found' };
    }

    const lobbyData = lobbyDoc.data();

    if (lobbyData.players.length >= lobbyData.maxPlayers) {
      return { success: false, error: 'Lobby is full' };
    }

    // Find empty seat
    const takenSeats = lobbyData.players.map(p => p.seatIndex);
    let seatIndex = 0;
    while (takenSeats.includes(seatIndex)) {
      seatIndex++;
    }

    const newPlayer = {
      id: playerId,
      displayName: playerName,
      photoURL: playerPhotoURL,
      seatIndex: seatIndex,
      isReady: false,
      isHost: false,
      joinedAt: Date.now()
    };

    await updateDoc(lobbyRef, {
      players: arrayUnion(newPlayer),
      updatedAt: serverTimestamp(),
      status: lobbyData.players.length + 1 >= lobbyData.maxPlayers ? 
        LOBBY_STATUS.FULL : LOBBY_STATUS.OPEN
    });

    // Update player's current lobby
    await updateDoc(doc(this.db, 'mulon_users', playerId), {
      currentPokerLobby: lobbyId
    });

    return { success: true, seatIndex };
  }

  // ========================================
  // LISTENERS
  // ========================================

  // Start listening to lobbies list
  startLobbiesListener() {
    const lobbiesRef = collection(this.db, 'poker_lobbies');
    // Simple query - filter client-side to avoid composite index requirement
    const q = query(
      lobbiesRef,
      where('isPublic', '==', true),
      limit(50)
    );

    this.lobbiesUnsubscribe = onSnapshot(q, (snapshot) => {
      const lobbies = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        // Include open, full, and in_game lobbies (not closed)
        if (data.status === LOBBY_STATUS.OPEN || 
            data.status === LOBBY_STATUS.FULL || 
            data.status === LOBBY_STATUS.IN_GAME) {
          // Add game phase info for display (use top-level fields or fallback to gameState)
          const lobbyData = { id: docSnap.id, ...data };
          // Prefer top-level fields (set by updateGameState) for faster access
          lobbyData.gamePhase = data.gamePhase || data.gameState?.phase || null;
          lobbyData.currentPlayerIndex = data.currentPlayerIndex ?? data.gameState?.currentPlayerIndex;
          lobbyData.pot = data.pot || data.gameState?.pot || 0;
          lobbies.push(lobbyData);
        }
      });

      // Sort by createdAt descending
      lobbies.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      console.log('Lobbies found:', lobbies.length);
      if (this.onLobbiesUpdate) {
        this.onLobbiesUpdate(lobbies);
      }
    }, (error) => {
      console.error('Lobbies listener error:', error);
    });
  }

  // Start listening to specific lobby
  startLobbyListener(lobbyId) {
    if (this.lobbyUnsubscribe) {
      this.lobbyUnsubscribe();
    }

    const lobbyRef = doc(this.db, 'poker_lobbies', lobbyId);

    this.lobbyUnsubscribe = onSnapshot(lobbyRef, (snapshot) => {
      if (!snapshot.exists()) {
        this.currentLobby = null;
        if (this.onLobbyUpdate) {
          this.onLobbyUpdate(null);
        }
        return;
      }

      const newLobbyData = { id: snapshot.id, ...snapshot.data() };
      
      // Detect player changes for notifications
      if (this.currentLobby && this.currentLobby.players && newLobbyData.players) {
        const oldPlayerIds = new Set(this.currentLobby.players.map(p => p.id));
        const newPlayerIds = new Set(newLobbyData.players.map(p => p.id));
        
        // Find players who left
        for (const oldId of oldPlayerIds) {
          if (!newPlayerIds.has(oldId) && oldId !== this.currentUser?.uid) {
            const leftPlayer = this.currentLobby.players.find(p => p.id === oldId);
            console.log('👋 Player left:', leftPlayer?.displayName || oldId);
            if (this.onPlayerLeave) {
              this.onPlayerLeave(oldId, leftPlayer?.displayName);
            }
          }
        }
        
        // Find players who joined
        for (const newId of newPlayerIds) {
          if (!oldPlayerIds.has(newId) && newId !== this.currentUser?.uid) {
            const joinedPlayer = newLobbyData.players.find(p => p.id === newId);
            console.log('👋 Player joined:', joinedPlayer?.displayName || newId);
            if (this.onPlayerJoin) {
              this.onPlayerJoin(newId, joinedPlayer?.displayName);
            }
          }
        }
      }
      
      this.currentLobby = newLobbyData;

      if (this.onLobbyUpdate) {
        this.onLobbyUpdate(this.currentLobby);
      }

      // Check for game state changes
      if (this.currentLobby.gameState && this.onGameStateUpdate) {
        this.onGameStateUpdate(this.currentLobby.gameState);
      }
    });
  }

  // Start listening for join requests (host only)
  startJoinRequestsListener() {
    if (!this.currentUser) return;

    const requestsRef = collection(this.db, 'poker_join_requests');
    const q = query(
      requestsRef,
      where('hostId', '==', this.currentUser.uid),
      where('status', '==', REQUEST_STATUS.PENDING)
    );

    this.requestsUnsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const request = { id: change.doc.id, ...change.doc.data() };
          
          // Check if expired
          if (request.expiresAt && request.expiresAt.toDate() < new Date()) {
            // Mark as expired
            updateDoc(doc(this.db, 'poker_join_requests', request.id), {
              status: REQUEST_STATUS.EXPIRED
            });
            return;
          }

          if (this.onJoinRequest) {
            this.onJoinRequest(request);
          }
        }
      });
    });
  }

  // ========================================
  // GAME STATE SYNC
  // ========================================

  // Update game state in lobby
  async updateGameState(gameState) {
    if (!this.currentLobbyId) return;

    try {
      await updateDoc(doc(this.db, 'poker_lobbies', this.currentLobbyId), {
        gameState: gameState,
        status: LOBBY_STATUS.IN_GAME,
        // Store key game info at top level for easy access in lobby list
        gamePhase: gameState?.phase || null,
        pot: gameState?.pot || 0,
        currentBet: gameState?.currentBet || 0,
        currentPlayerIndex: gameState?.currentPlayerIndex,
        // Clear play again votes when starting new hand
        playAgainVotes: [],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating game state:', error);
    }
  }

  // Vote for play again
  async votePlayAgain() {
    if (!this.currentLobbyId || !this.currentUser) return { success: false };

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);
      
      // Add this user's vote
      await updateDoc(lobbyRef, {
        playAgainVotes: arrayUnion(this.currentUser.uid),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Voted for play again');
      return { success: true };
    } catch (error) {
      console.error('Error voting play again:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current play again votes count
  getPlayAgainVotes() {
    return this.currentLobby?.playAgainVotes || [];
  }

  // Check if all players have voted
  allPlayersVoted() {
    const votes = this.currentLobby?.playAgainVotes || [];
    const players = this.currentLobby?.players || [];
    return votes.length >= players.length && players.length >= 2;
  }

  // Reset game state in lobby (when game ends and returning to lobby)
  async resetGameState() {
    if (!this.currentLobbyId) return;

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);
      const lobbyDoc = await getDoc(lobbyRef);
      
      if (!lobbyDoc.exists()) return;
      
      const lobbyData = lobbyDoc.data();
      const playerCount = lobbyData.players?.length || 0;
      
      await updateDoc(lobbyRef, {
        gameState: null,
        gamePhase: null,
        pot: null,
        currentBet: null,
        currentPlayerIndex: null,
        status: playerCount >= lobbyData.maxPlayers ? LOBBY_STATUS.FULL : LOBBY_STATUS.OPEN,
        // Reset all players' ready status
        players: (lobbyData.players || []).map(p => ({
          ...p,
          isReady: false,
          isFolded: false,
          chips: lobbyData.buyIn || 0
        })),
        updatedAt: serverTimestamp()
      });
      
      console.log('🔄 Game state reset, lobby returned to open status');
    } catch (error) {
      console.error('Error resetting game state:', error);
    }
  }

  // Award winnings to a player (persists to Firebase)
  async awardWinnings(playerId, amount) {
    if (!playerId || amount <= 0) return { success: false, error: 'Invalid params' };
    
    try {
      await updateDoc(doc(this.db, 'mulon_users', playerId), {
        balance: increment(amount)
      });
      console.log(`✅ Awarded $${amount} to player ${playerId}`);
      return { success: true };
    } catch (error) {
      console.error('Error awarding winnings:', error);
      return { success: false, error: error.message };
    }
  }

  // Start game
  async startGame() {
    if (!this.currentLobby || !this.currentUser) {
      return { success: false, error: 'No lobby' };
    }

    // Only host can start
    if (this.currentLobby.hostId !== this.currentUser.uid) {
      return { success: false, error: 'Only host can start game' };
    }

    // Check if enough players
    if (this.currentLobby.players.length < 2) {
      return { success: false, error: 'Need at least 2 players' };
    }

    // Check if all ready
    if (!this.currentLobby.players.every(p => p.isReady)) {
      return { success: false, error: 'Not all players are ready' };
    }

    try {
      // Note: Buy-in is already deducted when players click Ready
      // No need to deduct again here

      // Update lobby status
      await updateDoc(doc(this.db, 'poker_lobbies', this.currentLobbyId), {
        status: LOBBY_STATUS.IN_GAME,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error starting game:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // CLEANUP
  // ========================================

  async cleanup() {
    // Stop inactivity detection
    this.stopInactivityDetection();

    // Stop periodic refresh
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Unsubscribe from all listeners
    if (this.lobbyUnsubscribe) {
      this.lobbyUnsubscribe();
      this.lobbyUnsubscribe = null;
    }
    if (this.lobbiesUnsubscribe) {
      this.lobbiesUnsubscribe();
      this.lobbiesUnsubscribe = null;
    }
    if (this.requestsUnsubscribe) {
      this.requestsUnsubscribe();
      this.requestsUnsubscribe = null;
    }
    if (this.onlineUnsubscribe) {
      this.onlineUnsubscribe();
      this.onlineUnsubscribe = null;
    }

    // Leave current lobby
    if (this.currentLobbyId) {
      await this.leaveLobby();
    }

    // Set offline status
    await this.setOnlineStatus(false);

    this.isInitialized = false;
    this.isInactive = false;
    console.log('PokerLobbyManager cleaned up');
  }
}

// Singleton instance
let lobbyManagerInstance = null;

// Get or create lobby manager instance
export function getPokerLobbyManager() {
  if (!lobbyManagerInstance) {
    lobbyManagerInstance = new PokerLobbyManager();
  }
  return lobbyManagerInstance;
}

// Make available globally
window.PokerLobby = {
  LOBBY_STATUS,
  REQUEST_STATUS,
  PokerLobbyManager,
  getPokerLobbyManager
};

export default { LOBBY_STATUS, REQUEST_STATUS, PokerLobbyManager, getPokerLobbyManager };
