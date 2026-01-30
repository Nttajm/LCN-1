// ========================================
// POKER LOBBY - Multiplayer Lobby System (REWORKED)
// Firebase integration for real-time poker lobbies
// Fixed: duplicates, race conditions, sync issues
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
  increment,
  runTransaction,
  writeBatch
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Lobby status types
export const LOBBY_STATUS = {
  OPEN: 'open',
  FULL: 'full',
  IN_GAME: 'in_game',
  CLOSED: 'closed'
};

// Request status
export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

// ========================================
// POKER LOBBY MANAGER (REWORKED)
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
    this.cleanupInterval = null;
    this.isInitialized = false;
    
    // Operation locks to prevent race conditions
    this._joinLock = false;
    this._leaveLock = false;
    this._createLock = false;
    this._operationQueue = Promise.resolve();
    this._recentlyLeft = false; // Prevent immediate lobby creation after leaving
    this._recentlyLeftTimeout = null;
    
    // Callbacks
    this.onLobbyUpdate = null;
    this.onLobbiesUpdate = null;
    this.onJoinRequest = null;
    this.onGameStart = null;
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.onOnlinePlayersUpdate = null;
    this.onError = null;
    this.onGameStateUpdate = null;
    this.onHostChange = null;
    this.onStatusChange = null;
    
    // Bind handlers
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  // ========================================
  // HELPER FUNCTIONS - Reduce Redundancy
  // ========================================

  // Calculate lobby status based on player count
  _calculateStatus(playerCount, maxPlayers, currentStatus) {
    if (currentStatus === LOBBY_STATUS.IN_GAME) return LOBBY_STATUS.IN_GAME;
    if (currentStatus === LOBBY_STATUS.CLOSED) return LOBBY_STATUS.CLOSED;
    if (playerCount >= maxPlayers) return LOBBY_STATUS.FULL;
    if (playerCount === 0) return LOBBY_STATUS.CLOSED;
    return LOBBY_STATUS.OPEN;
  }

  // Build a player object with consistent structure
  _buildPlayer(user, seatIndex, options = {}) {
    return {
      id: user.uid || user.id,
      displayName: user.displayName || user.email?.split('@')[0] || 'Player',
      photoURL: user.photoURL || null,
      seatIndex: seatIndex,
      isReady: options.isReady ?? false,
      isHost: options.isHost ?? false,
      joinedAt: options.joinedAt ?? Date.now(),
      chips: options.chips ?? 0,
      isFolded: options.isFolded ?? false,
      waitingForNextHand: options.waitingForNextHand ?? false
    };
  }

  // Find first available seat
  _findAvailableSeat(players, maxPlayers) {
    const takenSeats = new Set(players.map(p => p.seatIndex));
    for (let i = 0; i < maxPlayers; i++) {
      if (!takenSeats.has(i)) return i;
    }
    return -1; // No seat available
  }

  // Check if player is in a players array
  _isPlayerInList(players, playerId) {
    return players?.some(p => p.id === playerId) ?? false;
  }

  // Get player from list
  _getPlayerFromList(players, playerId) {
    return players?.find(p => p.id === playerId) ?? null;
  }

  // Update a specific player in the players array
  _updatePlayerInList(players, playerId, updates) {
    return players.map(p => p.id === playerId ? { ...p, ...updates } : p);
  }

  // Remove player from list and return new array
  _removePlayerFromList(players, playerId) {
    return players.filter(p => p.id !== playerId);
  }

  // Transfer host to next available player
  _transferHostInList(players, excludePlayerId) {
    const remaining = this._removePlayerFromList(players, excludePlayerId);
    if (remaining.length === 0) return [];
    
    // First player becomes host
    return remaining.map((p, i) => ({
      ...p,
      isHost: i === 0
    }));
  }

  // Get new host data after transfer
  _getNewHostData(players) {
    const host = players.find(p => p.isHost);
    if (!host) return null;
    return {
      hostId: host.id,
      hostName: host.displayName,
      hostPhotoURL: host.photoURL
    };
  }

  // Queue operations to prevent race conditions
  _queueOperation(operation) {
    this._operationQueue = this._operationQueue
      .then(() => operation())
      .catch(err => {
        console.error('Queued operation failed:', err);
        throw err;
      });
    return this._operationQueue;
  }

  // Emit error to callback
  _emitError(error, context = '') {
    console.error(`PokerLobby Error [${context}]:`, error);
    if (this.onError) {
      this.onError({ message: error.message || error, context });
    }
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  async init(db, user) {
    if (!db || !user) {
      console.error('PokerLobbyManager: Missing db or user');
      return false;
    }

    // Prevent re-init with same user
    if (this.isInitialized && this.currentUser?.uid === user.uid) {
      console.log('PokerLobbyManager already initialized for this user');
      return true;
    }

    // Clean up previous state if re-initializing
    if (this.isInitialized) {
      await this.cleanup();
    }

    this.db = db;
    this.currentUser = user;

    try {
      // STEP 1: Clean up any stale lobby references for this user
      await this._cleanupUserLobbies();

      // STEP 2: Set online status
      await this.setOnlineStatus(true);

      // STEP 3: Start listeners
      this.startLobbiesListener();
      this.startOnlinePlayersListener();
      this.startJoinRequestsListener();

      // STEP 4: Start periodic cleanup
      this._startPeriodicTasks();

      // STEP 5: Visibility change handler
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      this.isInitialized = true;
      console.log('✅ PokerLobbyManager initialized for:', user.displayName || user.uid);
      return true;
    } catch (error) {
      this._emitError(error, 'init');
      return false;
    }
  }

  // Clean up any orphaned lobby references for this user
  async _cleanupUserLobbies() {
    if (!this.currentUser) return;

    try {
      // Get user's claimed lobby
      const userDocRef = doc(this.db, 'mulon_users', this.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const claimedLobbyId = userDoc.exists() ? userDoc.data().currentPokerLobby : null;

      // Find ALL lobbies where this user is a player
      const lobbiesSnapshot = await getDocs(collection(this.db, 'poker_lobbies'));
      const userLobbies = [];

      lobbiesSnapshot.forEach(lobbyDoc => {
        const data = lobbyDoc.data();
        if (this._isPlayerInList(data.players, this.currentUser.uid)) {
          userLobbies.push({ id: lobbyDoc.id, ...data });
        }
      });

      console.log(`Found ${userLobbies.length} lobbies for user, claimed: ${claimedLobbyId || 'none'}`);

      // If user is in multiple lobbies, clean up all except the claimed one (or most recent if no claim)
      if (userLobbies.length > 1) {
        userLobbies.sort((a, b) => {
          // Prioritize claimed lobby
          if (a.id === claimedLobbyId) return -1;
          if (b.id === claimedLobbyId) return 1;
          // Otherwise sort by join time (most recent first)
          const aPlayer = this._getPlayerFromList(a.players, this.currentUser.uid);
          const bPlayer = this._getPlayerFromList(b.players, this.currentUser.uid);
          return (bPlayer?.joinedAt || 0) - (aPlayer?.joinedAt || 0);
        });

        // Remove user from all but the first
        for (let i = 1; i < userLobbies.length; i++) {
          await this._removePlayerFromLobbyAtomic(userLobbies[i].id, this.currentUser.uid);
          console.log(`🧹 Cleaned up duplicate lobby: ${userLobbies[i].id}`);
        }
        
        // Update userLobbies to only contain the kept one
        userLobbies.length = 1;
      }

      // If user claims a lobby but isn't actually in it, clear the claim
      if (claimedLobbyId && !userLobbies.find(l => l.id === claimedLobbyId)) {
        await updateDoc(userDocRef, { currentPokerLobby: null });
        console.log('🧹 Cleared stale lobby claim');
      }

      // If user has a claimed lobby and is in exactly one lobby that matches, restore state
      // DON'T restore if there's no claim - user might have just left
      if (userLobbies.length === 1 && claimedLobbyId === userLobbies[0].id) {
        const lobby = userLobbies[0];
        this.currentLobbyId = lobby.id;
        this.currentLobby = lobby;
        this.startLobbyListener(lobby.id);
        console.log(`📍 Restored to lobby: ${lobby.id}`);
      } else if (userLobbies.length === 1 && !claimedLobbyId) {
        // User is in a lobby but has no claim - remove them from it (stale state)
        console.log('🧹 User has no lobby claim but found in lobby - cleaning up');
        await this._removePlayerFromLobbyAtomic(userLobbies[0].id, this.currentUser.uid);
      } else if (userLobbies.length === 0 && claimedLobbyId) {
        // User claims a lobby but isn't in any - clear the claim
        await updateDoc(userDocRef, { currentPokerLobby: null });
        console.log('🧹 Cleared orphaned lobby claim');
      }

    } catch (error) {
      this._emitError(error, '_cleanupUserLobbies');
    }
  }

  // Atomic remove player - used for cleanup and leaving
  async _removePlayerFromLobbyAtomic(lobbyId, playerId) {
    const lobbyRef = doc(this.db, 'poker_lobbies', lobbyId);
    
    try {
      await runTransaction(this.db, async (transaction) => {
        const lobbyDoc = await transaction.get(lobbyRef);
        if (!lobbyDoc.exists()) return;

        const data = lobbyDoc.data();
        if (!this._isPlayerInList(data.players, playerId)) return;

        const remainingPlayers = this._removePlayerFromList(data.players, playerId);

        if (remainingPlayers.length === 0) {
          transaction.delete(lobbyRef);
          return;
        }

        // Build update
        const updateData = {
          players: remainingPlayers,
          updatedAt: serverTimestamp()
        };

        // Transfer host if needed
        if (data.hostId === playerId) {
          const newPlayers = this._transferHostInList(data.players, playerId);
          const newHostData = this._getNewHostData(newPlayers);
          if (newHostData) {
            Object.assign(updateData, newHostData);
            updateData.players = newPlayers;
          }
        }

        // Update status
        updateData.status = this._calculateStatus(
          remainingPlayers.length, 
          data.maxPlayers, 
          data.status
        );

        transaction.update(lobbyRef, updateData);
      });
    } catch (error) {
      console.error('Error in _removePlayerFromLobbyAtomic:', error);
      throw error;
    }
  }

  // ========================================
  // LOBBY CREATION (with transaction)
  // ========================================

  async createLobby(buyIn, isPublic = true, maxPlayers = 6) {
    if (!this.currentUser) {
      return { success: false, error: 'Not signed in' };
    }

    // Prevent creating lobby immediately after leaving (debounce)
    if (this._recentlyLeft) {
      console.log('⏳ Recently left a lobby, waiting...');
      return { success: false, error: 'Please wait a moment before creating a new lobby' };
    }

    // Prevent double operations
    if (this._createLock) {
      return { success: false, error: 'Operation in progress' };
    }
    this._createLock = true;

    try {
      // Queue this operation
      return await this._queueOperation(async () => {
        // STEP 1: Check if already in a lobby (local state)
        if (this.currentLobbyId) {
          console.log('Already in lobby:', this.currentLobbyId);
          return { success: false, error: 'Already in a lobby', lobbyId: this.currentLobbyId };
        }

        // STEP 2: Verify user isn't in any lobby in Firebase (double-check)
        const lobbiesSnapshot = await getDocs(collection(this.db, 'poker_lobbies'));
        let existingLobbyId = null;
        
        for (const lobbyDoc of lobbiesSnapshot.docs) {
          const data = lobbyDoc.data();
          if (this._isPlayerInList(data.players, this.currentUser.uid)) {
            // Found user in a lobby - restore state instead of creating new
            existingLobbyId = lobbyDoc.id;
            console.log('🔍 Found existing lobby for user:', existingLobbyId);
            
            // Update local state to match
            this.currentLobbyId = lobbyDoc.id;
            this.currentLobby = { id: lobbyDoc.id, ...data };
            this.startLobbyListener(lobbyDoc.id);
            
            // Update user document
            await updateDoc(doc(this.db, 'mulon_users', this.currentUser.uid), {
              currentPokerLobby: lobbyDoc.id
            });
            
            return { success: true, lobbyId: lobbyDoc.id, restored: true };
          }
        }

        // STEP 3: Check balance
        const userData = window.CasinoAuth?.userData;
        if (userData && userData.balance < buyIn) {
          return { success: false, error: 'Insufficient balance for buy-in' };
        }

        // STEP 4: Create lobby document
        const lobbyRef = doc(collection(this.db, 'poker_lobbies'));
        const lobbyId = lobbyRef.id;
        const userRef = doc(this.db, 'mulon_users', this.currentUser.uid);

        const hostPlayer = this._buildPlayer(this.currentUser, 0, {
          isHost: true,
          isReady: false,
          chips: buyIn
        });

        const lobbyData = {
          hostId: this.currentUser.uid,
          hostName: this.currentUser.displayName || 'Host',
          hostPhotoURL: this.currentUser.photoURL || null,
          buyIn: buyIn,
          maxPlayers: maxPlayers,
          isPublic: isPublic,
          status: LOBBY_STATUS.OPEN,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          players: [hostPlayer],
          gameState: null,
          gamePhase: null,
          playAgainVotes: [],
          version: 1 // For conflict detection
        };

        // Use batch write for atomicity
        const batch = writeBatch(this.db);
        batch.set(lobbyRef, lobbyData);
        batch.update(userRef, { currentPokerLobby: lobbyId });
        await batch.commit();

        // STEP 5: Update local state
        this.currentLobbyId = lobbyId;
        this.currentLobby = { id: lobbyId, ...lobbyData };

        // STEP 6: Start listener
        this.startLobbyListener(lobbyId);

        console.log(`✅ Created lobby: ${lobbyId}`);
        return { success: true, lobbyId };
      });

    } catch (error) {
      this._emitError(error, 'createLobby');
      return { success: false, error: error.message };
    } finally {
      this._createLock = false;
    }
  }

  // ========================================
  // LOBBY JOINING (with transaction)
  // ========================================

  async joinLobby(lobbyId) {
    if (!this.currentUser) {
      return { success: false, error: 'Not signed in' };
    }

    if (this.currentLobbyId === lobbyId) {
      // Already in this lobby - just ensure listener is running
      if (!this.lobbyUnsubscribe) {
        this.startLobbyListener(lobbyId);
      }
      return { success: true, message: 'Already in this lobby' };
    }

    // Prevent double operations
    if (this._joinLock) {
      return { success: false, error: 'Join operation in progress' };
    }
    this._joinLock = true;

    try {
      return await this._queueOperation(async () => {
        // STEP 1: Leave current lobby if in one
        if (this.currentLobbyId) {
          await this._leaveLobbyInternal();
          // Small delay to ensure leave completes
          await new Promise(r => setTimeout(r, 150));
        }

        // STEP 2: Use transaction to join atomically
        const lobbyRef = doc(this.db, 'poker_lobbies', lobbyId);
        const userRef = doc(this.db, 'mulon_users', this.currentUser.uid);
        
        const result = await runTransaction(this.db, async (transaction) => {
          const lobbyDoc = await transaction.get(lobbyRef);
          
          if (!lobbyDoc.exists()) {
            throw new Error('Lobby not found');
          }

          const lobbyData = lobbyDoc.data();

          // Check if already in lobby
          if (this._isPlayerInList(lobbyData.players, this.currentUser.uid)) {
            const existingPlayer = this._getPlayerFromList(lobbyData.players, this.currentUser.uid);
            return { alreadyIn: true, seatIndex: existingPlayer.seatIndex };
          }

          // Check lobby status
          if (lobbyData.status === LOBBY_STATUS.CLOSED) {
            throw new Error('Lobby is closed');
          }

          // Check if full
          if (lobbyData.players.length >= lobbyData.maxPlayers) {
            throw new Error('Lobby is full');
          }

          // Check balance
          const userData = window.CasinoAuth?.userData;
          if (userData && userData.balance < lobbyData.buyIn) {
            throw new Error('Insufficient balance for buy-in');
          }

          // Find empty seat
          const seatIndex = this._findAvailableSeat(lobbyData.players, lobbyData.maxPlayers);
          if (seatIndex === -1) {
            throw new Error('No available seats');
          }

          // Create player object using helper
          const newPlayer = this._buildPlayer(this.currentUser, seatIndex, {
            isReady: false,
            isHost: false,
            chips: lobbyData.buyIn,
            waitingForNextHand: lobbyData.status === LOBBY_STATUS.IN_GAME
          });

          // Build new players array
          const newPlayers = [...lobbyData.players, newPlayer];

          // Determine status
          const newStatus = this._calculateStatus(
            newPlayers.length, 
            lobbyData.maxPlayers, 
            lobbyData.status
          );

          // Write updates
          transaction.update(lobbyRef, {
            players: newPlayers,
            status: newStatus,
            updatedAt: serverTimestamp(),
            version: increment(1)
          });

          transaction.update(userRef, {
            currentPokerLobby: lobbyId
          });

          return { success: true, seatIndex, buyIn: lobbyData.buyIn };
        });

        if (result.alreadyIn) {
          // User was already in lobby, just update local state
          this.currentLobbyId = lobbyId;
          this.startLobbyListener(lobbyId);
          return { success: true, seatIndex: result.seatIndex };
        }

        // STEP 3: Update local state
        this.currentLobbyId = lobbyId;
        this.startLobbyListener(lobbyId);

        console.log(`✅ Joined lobby: ${lobbyId} at seat ${result.seatIndex}`);
        return { success: true, lobbyId, seatIndex: result.seatIndex };
      });

    } catch (error) {
      this._emitError(error, 'joinLobby');
      return { success: false, error: error.message };
    } finally {
      this._joinLock = false;
    }
  }

  // Internal leave (doesn't check locks - used by other operations)
  async _leaveLobbyInternal() {
    const lobbyIdToLeave = this.currentLobbyId;
    if (!lobbyIdToLeave || !this.currentUser) {
      this.currentLobbyId = null;
      this.currentLobby = null;
      return { success: true };
    }

    // Set recently left flag to prevent immediate re-creation
    this._recentlyLeft = true;
    if (this._recentlyLeftTimeout) clearTimeout(this._recentlyLeftTimeout);
    this._recentlyLeftTimeout = setTimeout(() => {
      this._recentlyLeft = false;
    }, 1500); // 1.5 second cooldown

    // Stop listener first
    if (this.lobbyUnsubscribe) {
      this.lobbyUnsubscribe();
      this.lobbyUnsubscribe = null;
    }

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', lobbyIdToLeave);
      const userRef = doc(this.db, 'mulon_users', this.currentUser.uid);

      await runTransaction(this.db, async (transaction) => {
        const lobbyDoc = await transaction.get(lobbyRef);

        // Always clear user's lobby reference
        transaction.update(userRef, { currentPokerLobby: null });

        if (!lobbyDoc.exists()) {
          return;
        }

        const lobbyData = lobbyDoc.data();
        
        // Check if player is actually in lobby
        if (!this._isPlayerInList(lobbyData.players, this.currentUser.uid)) {
          return;
        }

        const remainingPlayers = this._removePlayerFromList(lobbyData.players, this.currentUser.uid);

        if (remainingPlayers.length === 0) {
          // Delete the empty lobby
          transaction.delete(lobbyRef);
          console.log('🗑️ Deleted empty lobby:', lobbyIdToLeave);
          return { deleted: true };
        }

        const updateData = {
          updatedAt: serverTimestamp(),
          version: increment(1)
        };

        // Transfer host if needed
        if (lobbyData.hostId === this.currentUser.uid) {
          const newPlayers = this._transferHostInList(lobbyData.players, this.currentUser.uid);
          const newHostData = this._getNewHostData(newPlayers);
          if (newHostData) {
            Object.assign(updateData, newHostData);
            updateData.players = newPlayers;
            console.log('👑 Host transferred to:', newHostData.hostName);
          }
        } else {
          updateData.players = remainingPlayers;
        }

        // Update status
        updateData.status = this._calculateStatus(
          (updateData.players || remainingPlayers).length,
          lobbyData.maxPlayers,
          lobbyData.status
        );

        // Handle in-game leave
        if (lobbyData.status === LOBBY_STATUS.IN_GAME && lobbyData.gameState) {
          updateData.gameState = this._handlePlayerLeaveInGame(
            lobbyData.gameState, 
            this.currentUser.uid
          );
        }

        transaction.update(lobbyRef, updateData);
      });

      // Clear local state
      const previousLobbyId = this.currentLobbyId;
      this.currentLobbyId = null;
      this.currentLobby = null;

      console.log(`✅ Left lobby: ${previousLobbyId}`);
      return { success: true };

    } catch (error) {
      // Clear state anyway to prevent stuck
      this.currentLobbyId = null;
      this.currentLobby = null;
      throw error;
    }
  }

  // Handle player leaving during active game
  _handlePlayerLeaveInGame(gameState, playerId) {
    if (!gameState?.players) return gameState;

    const gameStatePlayers = [...gameState.players];
    const leavingIdx = gameStatePlayers.findIndex(p => p && p.id === playerId);
    
    if (leavingIdx === -1) return gameState;

    // Mark player slot as empty
    gameStatePlayers[leavingIdx] = null;
    
    const updatedGameState = {
      ...gameState,
      players: gameStatePlayers
    };

    // Advance turn if it was this player's turn
    if (gameState.currentPlayerIndex === leavingIdx) {
      updatedGameState.currentPlayerIndex = this._findNextActivePlayer(
        gameStatePlayers, 
        leavingIdx
      );
    }

    return updatedGameState;
  }

  // Find next active player index
  _findNextActivePlayer(players, fromIndex) {
    const len = players.length;
    let nextIdx = (fromIndex + 1) % len;
    let attempts = 0;
    
    while (attempts < len) {
      const player = players[nextIdx];
      if (player && !player.isFolded && player.chips > 0) {
        return nextIdx;
      }
      nextIdx = (nextIdx + 1) % len;
      attempts++;
    }
    
    return fromIndex; // No valid next player
  }

  // Request to join (for approval flow)
  async requestJoinLobby(lobbyId) {
    if (!this.currentUser) {
      return { success: false, error: 'Not signed in' };
    }

    try {
      // Get lobby to check status
      const lobbyDoc = await getDoc(doc(this.db, 'poker_lobbies', lobbyId));
      if (!lobbyDoc.exists()) {
        return { success: false, error: 'Lobby not found' };
      }

      const lobbyData = lobbyDoc.data();

      // Check if full
      if (lobbyData.players.length >= lobbyData.maxPlayers) {
        return { success: false, error: 'Lobby is full' };
      }

      // Check if already in lobby
      if (this._isPlayerInList(lobbyData.players, this.currentUser.uid)) {
        return { success: false, error: 'Already in this lobby' };
      }

      // Check balance
      const userData = window.CasinoAuth?.userData;
      if (userData && userData.balance < lobbyData.buyIn) {
        return { success: false, error: 'Insufficient balance for buy-in' };
      }

      // Check for existing pending request
      const existingRequests = await getDocs(
        query(
          collection(this.db, 'poker_join_requests'),
          where('lobbyId', '==', lobbyId),
          where('requesterId', '==', this.currentUser.uid),
          where('status', '==', REQUEST_STATUS.PENDING)
        )
      );

      if (!existingRequests.empty) {
        return { success: true, pending: true, message: 'Request already pending' };
      }

      // Create join request
      await addDoc(collection(this.db, 'poker_join_requests'), {
        lobbyId: lobbyId,
        hostId: lobbyData.hostId,
        requesterId: this.currentUser.uid,
        requesterName: this.currentUser.displayName || 'Player',
        requesterPhotoURL: this.currentUser.photoURL || null,
        status: REQUEST_STATUS.PENDING,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 30000)
      });

      return { success: true, pending: true, message: 'Request sent' };
    } catch (error) {
      this._emitError(error, 'requestJoinLobby');
      return { success: false, error: error.message };
    }
  }

  // Handle join request (accept/reject)
  async handleJoinRequest(requestId, accept) {
    try {
      const requestRef = doc(this.db, 'poker_join_requests', requestId);
      const requestDoc = await getDoc(requestRef);

      if (!requestDoc.exists()) {
        return { success: false, error: 'Request not found' };
      }

      const requestData = requestDoc.data();

      // Only host can handle
      if (requestData.hostId !== this.currentUser?.uid) {
        return { success: false, error: 'Not authorized' };
      }

      if (accept) {
        // Use transaction to add player
        const lobbyRef = doc(this.db, 'poker_lobbies', requestData.lobbyId);
        const userRef = doc(this.db, 'mulon_users', requestData.requesterId);

        await runTransaction(this.db, async (transaction) => {
          const lobbyDoc = await transaction.get(lobbyRef);
          if (!lobbyDoc.exists()) {
            throw new Error('Lobby not found');
          }

          const lobbyData = lobbyDoc.data();

          // Check if already in
          if (this._isPlayerInList(lobbyData.players, requestData.requesterId)) {
            transaction.update(requestRef, { status: REQUEST_STATUS.ACCEPTED });
            return;
          }

          // Check if full
          if (lobbyData.players.length >= lobbyData.maxPlayers) {
            throw new Error('Lobby is full');
          }

          // Find seat using helper
          const seatIndex = this._findAvailableSeat(lobbyData.players, lobbyData.maxPlayers);
          if (seatIndex === -1) {
            throw new Error('No available seats');
          }

          // Build player using helper
          const newPlayer = this._buildPlayer(
            { 
              uid: requestData.requesterId, 
              displayName: requestData.requesterName, 
              photoURL: requestData.requesterPhotoURL 
            }, 
            seatIndex, 
            { chips: lobbyData.buyIn }
          );

          const newPlayers = [...lobbyData.players, newPlayer];
          const newStatus = this._calculateStatus(
            newPlayers.length, 
            lobbyData.maxPlayers, 
            lobbyData.status
          );

          transaction.update(lobbyRef, {
            players: newPlayers,
            status: newStatus,
            updatedAt: serverTimestamp(),
            version: increment(1)
          });

          transaction.update(userRef, {
            currentPokerLobby: requestData.lobbyId
          });

          transaction.update(requestRef, {
            status: REQUEST_STATUS.ACCEPTED
          });
        });

        return { success: true };
      } else {
        // Reject
        await updateDoc(requestRef, { status: REQUEST_STATUS.REJECTED });
        return { success: true };
      }
    } catch (error) {
      this._emitError(error, 'handleJoinRequest');
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // LOBBY LEAVING (public method)
  // ========================================

  async leaveLobby() {
    if (!this.currentLobbyId || !this.currentUser) {
      this.currentLobbyId = null;
      this.currentLobby = null;
      return { success: true };
    }

    // Prevent double operations
    if (this._leaveLock) {
      return { success: false, error: 'Leave operation in progress' };
    }
    this._leaveLock = true;

    try {
      const result = await this._queueOperation(() => this._leaveLobbyInternal());
      
      if (this.onPlayerLeave) {
        this.onPlayerLeave(this.currentUser.uid);
      }

      return result;
    } catch (error) {
      this._emitError(error, 'leaveLobby');
      // Clear state anyway to prevent stuck
      this.currentLobbyId = null;
      this.currentLobby = null;
      return { success: false, error: error.message };
    } finally {
      this._leaveLock = false;
    }
  }

  // Delete lobby (host only) - forces all players out
  async deleteLobby() {
    if (!this.currentLobbyId || !this.currentUser) {
      return { success: false, error: 'Not in a lobby' };
    }

    if (!this.isHost()) {
      return { success: false, error: 'Only the host can delete the lobby' };
    }

    const lobbyId = this.currentLobbyId;
    
    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', lobbyId);
      const lobbyDoc = await getDoc(lobbyRef);
      
      if (!lobbyDoc.exists()) {
        this.currentLobbyId = null;
        this.currentLobby = null;
        return { success: true };
      }

      const lobbyData = lobbyDoc.data();
      const batch = writeBatch(this.db);

      // Clear all players' lobby references
      for (const player of (lobbyData.players || [])) {
        const playerRef = doc(this.db, 'mulon_users', player.id);
        batch.update(playerRef, { currentPokerLobby: null });
      }

      // Delete the lobby
      batch.delete(lobbyRef);
      await batch.commit();

      // Clear local state
      if (this.lobbyUnsubscribe) {
        this.lobbyUnsubscribe();
        this.lobbyUnsubscribe = null;
      }
      this.currentLobbyId = null;
      this.currentLobby = null;

      console.log('🗑️ Host deleted lobby:', lobbyId);
      return { success: true };
    } catch (error) {
      this._emitError(error, 'deleteLobby');
      return { success: false, error: error.message };
    }
  }

  // Kick a player (host only)
  async kickPlayer(playerId) {
    if (!this.currentLobbyId || !this.currentUser) {
      return { success: false, error: 'Not in a lobby' };
    }

    if (!this.isHost()) {
      return { success: false, error: 'Only the host can kick players' };
    }

    if (playerId === this.currentUser.uid) {
      return { success: false, error: 'Cannot kick yourself' };
    }

    try {
      await this._removePlayerFromLobbyAtomic(this.currentLobbyId, playerId);

      // Clear kicked player's lobby reference
      await updateDoc(doc(this.db, 'mulon_users', playerId), {
        currentPokerLobby: null
      });

      console.log(`🚫 Kicked player: ${playerId}`);
      return { success: true };
    } catch (error) {
      this._emitError(error, 'kickPlayer');
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // READY STATUS & GAME START
  // ========================================

  async setReady(isReady) {
    if (!this.currentLobbyId || !this.currentUser) {
      return { success: false, error: 'Not in a lobby' };
    }

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);

      await runTransaction(this.db, async (transaction) => {
        const lobbyDoc = await transaction.get(lobbyRef);
        if (!lobbyDoc.exists()) {
          throw new Error('Lobby not found');
        }

        const lobbyData = lobbyDoc.data();
        
        // Can't change ready status during game
        if (lobbyData.status === LOBBY_STATUS.IN_GAME) {
          throw new Error('Cannot change ready status during game');
        }

        const updatedPlayers = this._updatePlayerInList(
          lobbyData.players, 
          this.currentUser.uid, 
          { isReady }
        );

        transaction.update(lobbyRef, {
          players: updatedPlayers,
          updatedAt: serverTimestamp(),
          version: increment(1)
        });
      });

      return { success: true };
    } catch (error) {
      this._emitError(error, 'setReady');
      return { success: false, error: error.message };
    }
  }

  // Toggle ready status
  async toggleReady() {
    const currentPlayer = this._getPlayerFromList(
      this.currentLobby?.players, 
      this.currentUser?.uid
    );
    return this.setReady(!currentPlayer?.isReady);
  }

  async startGameByHost() {
    if (!this.currentLobbyId || !this.currentUser) {
      return { success: false, error: 'Not in a lobby' };
    }

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);
      
      const result = await runTransaction(this.db, async (transaction) => {
        const lobbyDoc = await transaction.get(lobbyRef);

        if (!lobbyDoc.exists()) {
          throw new Error('Lobby not found');
        }

        const lobbyData = lobbyDoc.data();

        if (lobbyData.hostId !== this.currentUser.uid) {
          throw new Error('Only the host can start the game');
        }

        if (!lobbyData.players || lobbyData.players.length < 2) {
          throw new Error('Need at least 2 players');
        }

        if (lobbyData.status === LOBBY_STATUS.IN_GAME) {
          throw new Error('Game already in progress');
        }

        // Check all players ready (excluding host)
        const allReady = lobbyData.players.every(p => p.isHost || p.isReady);
        if (!allReady) {
          throw new Error('All players must be ready');
        }

        // Check all players have enough balance for buy-in
        const buyIn = lobbyData.buyIn;
        const playersWithInsufficientBalance = [];
        
        for (const player of lobbyData.players) {
          const userDoc = await transaction.get(doc(this.db, 'mulon_users', player.id));
          if (userDoc.exists()) {
            const balance = userDoc.data().balance ?? 0;
            if (balance < buyIn) {
              playersWithInsufficientBalance.push({
                name: player.displayName,
                balance: balance,
                needed: buyIn
              });
            }
          } else {
            // User doesn't exist in DB - can't afford buy-in
            playersWithInsufficientBalance.push({
              name: player.displayName,
              balance: 0,
              needed: buyIn
            });
          }
        }
        
        if (playersWithInsufficientBalance.length > 0) {
          const names = playersWithInsufficientBalance.map(p => 
            `${p.name} ($${p.balance.toFixed(2)})`
          ).join(', ');
          throw new Error(`Players don't have enough for buy-in ($${buyIn}): ${names}`);
        }

        // Prepare players for game
        const gamePlayers = lobbyData.players.map(p => ({
          ...p,
          chips: lobbyData.buyIn,
          isFolded: false,
          currentBet: 0,
          waitingForNextHand: false
        }));

        transaction.update(lobbyRef, {
          status: LOBBY_STATUS.IN_GAME,
          players: gamePlayers,
          gameStartedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          version: increment(1),
          playAgainVotes: []
        });

        return { playerCount: gamePlayers.length };
      });

      console.log(`🎮 Game started with ${result.playerCount} players`);

      if (this.onGameStart) {
        this.onGameStart(this.currentLobbyId);
      }

      return { success: true };
    } catch (error) {
      this._emitError(error, 'startGameByHost');
      return { success: false, error: error.message };
    }
  }

  canStartGame() {
    if (!this.currentLobby) return false;
    const players = this.currentLobby.players || [];
    if (players.length < 2) return false;
    if (this.currentLobby.status === LOBBY_STATUS.IN_GAME) return false;
    // All non-host players must be ready
    return players.every(p => p.isHost || p.isReady);
  }

  getReadyCount() {
    const players = this.currentLobby?.players || [];
    return players.filter(p => p.isReady || p.isHost).length;
  }

  getPlayerCount() {
    return this.currentLobby?.players?.length || 0;
  }

  isHost() {
    return this.currentLobby?.hostId === this.currentUser?.uid;
  }

  getCurrentPlayer() {
    return this._getPlayerFromList(this.currentLobby?.players, this.currentUser?.uid);
  }

  isInLobby() {
    return !!this.currentLobbyId && !!this.currentLobby;
  }

  getLobbyStatus() {
    return this.currentLobby?.status || null;
  }

  // ========================================
  // BUY-IN UPDATE
  // ========================================

  async updateBuyIn(newBuyIn) {
    if (!this.currentUser || !this.currentLobbyId) {
      return { success: false, error: 'Not in a lobby' };
    }

    if (newBuyIn < 10) {
      return { success: false, error: 'Minimum buy-in is $10' };
    }

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);
      
      await runTransaction(this.db, async (transaction) => {
        const lobbyDoc = await transaction.get(lobbyRef);

        if (!lobbyDoc.exists()) {
          throw new Error('Lobby not found');
        }

        const lobbyData = lobbyDoc.data();

        if (lobbyData.hostId !== this.currentUser.uid) {
          throw new Error('Only the host can change buy-in');
        }

        if (lobbyData.status === LOBBY_STATUS.IN_GAME) {
          throw new Error('Cannot change buy-in during game');
        }

        // Update all players' chips to new buy-in
        const updatedPlayers = lobbyData.players.map(p => ({
          ...p,
          chips: newBuyIn
        }));

        transaction.update(lobbyRef, {
          buyIn: newBuyIn,
          players: updatedPlayers,
          updatedAt: serverTimestamp(),
          version: increment(1)
        });
      });

      return { success: true };
    } catch (error) {
      this._emitError(error, 'updateBuyIn');
      return { success: false, error: error.message };
    }
  }

  // Update lobby visibility
  async setLobbyPublic(isPublic) {
    if (!this.currentUser || !this.currentLobbyId) {
      return { success: false, error: 'Not in a lobby' };
    }

    if (!this.isHost()) {
      return { success: false, error: 'Only the host can change visibility' };
    }

    try {
      await updateDoc(doc(this.db, 'poker_lobbies', this.currentLobbyId), {
        isPublic: isPublic,
        updatedAt: serverTimestamp(),
        version: increment(1)
      });
      return { success: true };
    } catch (error) {
      this._emitError(error, 'setLobbyPublic');
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // GAME STATE MANAGEMENT
  // ========================================

  async updateGameState(gameState, options = {}) {
    if (!this.currentLobbyId) {
      console.warn('Cannot update game state: not in lobby');
      return { success: false, error: 'Not in a lobby' };
    }

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);
      
      await runTransaction(this.db, async (transaction) => {
        const lobbyDoc = await transaction.get(lobbyRef);
        if (!lobbyDoc.exists()) {
          throw new Error('Lobby not found');
        }

        const updateData = {
          gameState: gameState,
          status: LOBBY_STATUS.IN_GAME,
          gamePhase: gameState?.phase || null,
          pot: gameState?.pot || 0,
          currentBet: gameState?.currentBet || 0,
          currentPlayerIndex: gameState?.currentPlayerIndex ?? null,
          updatedAt: serverTimestamp(),
          version: increment(1)
        };

        // Clear votes when starting new hand
        if (options.clearVotes) {
          updateData.playAgainVotes = [];
        }

        transaction.update(lobbyRef, updateData);
      });

      return { success: true };
    } catch (error) {
      this._emitError(error, 'updateGameState');
      return { success: false, error: error.message };
    }
  }

  // Sync specific player state (for chip updates, fold status, etc.)
  async syncPlayerState(playerId, updates) {
    if (!this.currentLobbyId) return { success: false };

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);

      await runTransaction(this.db, async (transaction) => {
        const lobbyDoc = await transaction.get(lobbyRef);
        if (!lobbyDoc.exists()) return;

        const lobbyData = lobbyDoc.data();
        const updatedPlayers = this._updatePlayerInList(
          lobbyData.players, 
          playerId, 
          updates
        );

        transaction.update(lobbyRef, {
          players: updatedPlayers,
          updatedAt: serverTimestamp(),
          version: increment(1)
        });
      });

      return { success: true };
    } catch (error) {
      this._emitError(error, 'syncPlayerState');
      return { success: false, error: error.message };
    }
  }

  async votePlayAgain() {
    if (!this.currentLobbyId || !this.currentUser) {
      return { success: false };
    }

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);
      
      await runTransaction(this.db, async (transaction) => {
        const lobbyDoc = await transaction.get(lobbyRef);
        if (!lobbyDoc.exists()) return;

        const votes = lobbyDoc.data().playAgainVotes || [];
        if (!votes.includes(this.currentUser.uid)) {
          transaction.update(lobbyRef, {
            playAgainVotes: [...votes, this.currentUser.uid],
            updatedAt: serverTimestamp(),
            version: increment(1)
          });
        }
      });

      // Note: The lobby listener will detect when all have voted and the host will start the new hand
      // We don't call resetGameState here to avoid race conditions

      return { success: true };
    } catch (error) {
      this._emitError(error, 'votePlayAgain');
      return { success: false, error: error.message };
    }
  }

  getPlayAgainVotes() {
    return this.currentLobby?.playAgainVotes || [];
  }

  hasVotedPlayAgain(playerId = null) {
    const id = playerId || this.currentUser?.uid;
    return this.getPlayAgainVotes().includes(id);
  }

  allPlayersVoted() {
    const votes = this.getPlayAgainVotes();
    const players = this.currentLobby?.players || [];
    return votes.length >= players.length && players.length >= 2;
  }

  async resetGameState() {
    if (!this.currentLobbyId) return { success: false };

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);
      
      await runTransaction(this.db, async (transaction) => {
        const lobbyDoc = await transaction.get(lobbyRef);
        
        if (!lobbyDoc.exists()) return;
        
        const lobbyData = lobbyDoc.data();
        const playerCount = lobbyData.players?.length || 0;
        
        // Reset all players to lobby state
        const resetPlayers = (lobbyData.players || []).map(p => ({
          ...p,
          isReady: false,
          isFolded: false,
          chips: lobbyData.buyIn || 0,
          currentBet: 0,
          waitingForNextHand: false
        }));
        
        const newStatus = this._calculateStatus(playerCount, lobbyData.maxPlayers, LOBBY_STATUS.OPEN);
        
        transaction.update(lobbyRef, {
          gameState: null,
          gamePhase: null,
          pot: null,
          currentBet: null,
          currentPlayerIndex: null,
          playAgainVotes: [],
          status: newStatus,
          players: resetPlayers,
          updatedAt: serverTimestamp(),
          version: increment(1)
        });
      });
      
      console.log('🔄 Game state reset');
      return { success: true };
    } catch (error) {
      this._emitError(error, 'resetGameState');
      return { success: false, error: error.message };
    }
  }

  async awardWinnings(playerId, amount) {
    if (!playerId || amount <= 0) {
      return { success: false, error: 'Invalid params' };
    }
    
    // EXPLOIT PREVENTION: Validate this player is in the current lobby
    if (!this.currentLobby?.players?.some(p => p.id === playerId)) {
      console.error(`🚨 EXPLOIT BLOCKED: Player ${playerId} not in current lobby`);
      return { success: false, error: 'Player not in lobby' };
    }
    
    // EXPLOIT PREVENTION: Validate amount doesn't exceed max possible pot
    const buyIn = this.currentLobby?.buyIn || 50;
    const playerCount = this.currentLobby?.players?.length || 2;
    const maxPot = buyIn * playerCount;
    
    if (amount > maxPot) {
      console.error(`🚨 EXPLOIT BLOCKED: Award amount $${amount} exceeds max pot $${maxPot}`);
      return { success: false, error: 'Award amount exceeds max pot' };
    }
    
    try {
      await updateDoc(doc(this.db, 'mulon_users', playerId), {
        balance: increment(amount)
      });
      console.log(`💰 Awarded $${amount} to ${playerId}`);
      return { success: true };
    } catch (error) {
      this._emitError(error, 'awardWinnings');
      return { success: false, error: error.message };
    }
  }

  // Deduct buy-in from player balance
  async deductBuyIn(playerId, amount) {
    if (!playerId || amount <= 0) {
      return { success: false, error: 'Invalid params' };
    }
    
    try {
      await updateDoc(doc(this.db, 'mulon_users', playerId), {
        balance: increment(-amount)
      });
      console.log(`💸 Deducted $${amount} from ${playerId}`);
      return { success: true };
    } catch (error) {
      this._emitError(error, 'deductBuyIn');
      return { success: false, error: error.message };
    }
  }

  // Check which players can afford the buy-in for another round
  // Returns { canAfford: [], cantAfford: [] }
  async checkPlayerBalances() {
    if (!this.currentLobby?.players) {
      return { canAfford: [], cantAfford: [] };
    }
    
    const buyIn = this.currentLobby.buyIn;
    const canAfford = [];
    const cantAfford = [];
    
    try {
      for (const player of this.currentLobby.players) {
        const userDoc = await getDoc(doc(this.db, 'mulon_users', player.id));
        if (userDoc.exists()) {
          const balance = userDoc.data().balance ?? 0;
          if (balance >= buyIn) {
            canAfford.push({ ...player, balance });
          } else {
            cantAfford.push({ ...player, balance });
          }
        } else {
          cantAfford.push({ ...player, balance: 0 });
        }
      }
    } catch (error) {
      console.error('Error checking player balances:', error);
    }
    
    return { canAfford, cantAfford };
  }

  // Remove broke players from lobby (players who can't afford buy-in)
  async removeBrokePlayers() {
    if (!this.currentLobbyId || !this.currentUser) {
      return { success: false, error: 'Not in a lobby' };
    }
    
    try {
      const { cantAfford } = await this.checkPlayerBalances();
      
      if (cantAfford.length === 0) {
        return { success: true, removed: [] };
      }
      
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);
      const brokePlayerIds = cantAfford.map(p => p.id);
      
      await runTransaction(this.db, async (transaction) => {
        const lobbyDoc = await transaction.get(lobbyRef);
        if (!lobbyDoc.exists()) return;
        
        const lobbyData = lobbyDoc.data();
        const remainingPlayers = (lobbyData.players || []).filter(
          p => !brokePlayerIds.includes(p.id)
        );
        
        // If only 1 or 0 players left, reset to lobby state
        if (remainingPlayers.length < 2) {
          transaction.update(lobbyRef, {
            players: remainingPlayers,
            status: remainingPlayers.length > 0 ? LOBBY_STATUS.OPEN : LOBBY_STATUS.CLOSED,
            gameState: null,
            playAgainVotes: [],
            updatedAt: serverTimestamp(),
            version: increment(1)
          });
        } else {
          transaction.update(lobbyRef, {
            players: remainingPlayers,
            updatedAt: serverTimestamp(),
            version: increment(1)
          });
        }
      });
      
      console.log(`💸 Removed ${cantAfford.length} broke players:`, cantAfford.map(p => p.displayName));
      return { success: true, removed: cantAfford };
    } catch (error) {
      this._emitError(error, 'removeBrokePlayers');
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // ONLINE STATUS
  // ========================================

  async setOnlineStatus(isOnPoker) {
    if (!this.currentUser) return;

    try {
      const userRef = doc(this.db, 'mulon_users', this.currentUser.uid);
      await updateDoc(userRef, {
        isOnPoker: isOnPoker,
        pokerLastSeen: serverTimestamp(),
        currentPokerLobby: isOnPoker ? (this.currentLobbyId || null) : null
      });
    } catch (error) {
      // Don't emit error for status updates - they're non-critical
      console.warn('Error setting online status:', error);
    }
  }

  // ========================================
  // LISTENERS (Real-time Updates)
  // ========================================

  startLobbiesListener() {
    if (this.lobbiesUnsubscribe) {
      this.lobbiesUnsubscribe();
    }

    const lobbiesRef = collection(this.db, 'poker_lobbies');
    const q = query(
      lobbiesRef, 
      where('isPublic', '==', true), 
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    this.lobbiesUnsubscribe = onSnapshot(q, (snapshot) => {
      const lobbies = [];
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.status !== LOBBY_STATUS.CLOSED) {
          lobbies.push({
            id: docSnap.id,
            ...data,
            // Normalize fields
            gamePhase: data.gamePhase || data.gameState?.phase || null,
            currentPlayerIndex: data.currentPlayerIndex ?? data.gameState?.currentPlayerIndex ?? null,
            pot: data.pot ?? data.gameState?.pot ?? 0,
            playerCount: data.players?.length || 0,
            isFull: (data.players?.length || 0) >= data.maxPlayers
          });
        }
      });

      if (this.onLobbiesUpdate) {
        this.onLobbiesUpdate(lobbies);
      }
    }, (error) => {
      this._emitError(error, 'lobbiesListener');
    });
  }

  startLobbyListener(lobbyId) {
    // Stop previous listener
    if (this.lobbyUnsubscribe) {
      this.lobbyUnsubscribe();
      this.lobbyUnsubscribe = null;
    }

    if (!lobbyId) {
      console.warn('startLobbyListener called without lobbyId');
      return;
    }

    console.log(`🔔 Starting lobby listener for: ${lobbyId}`);
    const lobbyRef = doc(this.db, 'poker_lobbies', lobbyId);
    
    let previousPlayerIds = new Set();
    let previousStatus = null;
    let previousHostId = null;

    this.lobbyUnsubscribe = onSnapshot(lobbyRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log('📡 Lobby no longer exists');
        // Clear user's lobby claim
        if (this.currentUser) {
          updateDoc(doc(this.db, 'mulon_users', this.currentUser.uid), {
            currentPokerLobby: null
          }).catch(e => console.warn('Error clearing lobby claim:', e));
        }
        this.currentLobby = null;
        this.currentLobbyId = null;
        if (this.lobbyUnsubscribe) {
          this.lobbyUnsubscribe();
          this.lobbyUnsubscribe = null;
        }
        if (this.onLobbyUpdate) {
          this.onLobbyUpdate(null);
        }
        return;
      }

      const newData = { id: snapshot.id, ...snapshot.data() };
      const currentPlayerIds = new Set(newData.players?.map(p => p.id) || []);

      // Check if current user was removed from lobby (kicked)
      if (this.currentUser && !currentPlayerIds.has(this.currentUser.uid) && previousPlayerIds.has(this.currentUser.uid)) {
        console.log('📡 Current user was removed from lobby');
        // Clear user's lobby claim
        updateDoc(doc(this.db, 'mulon_users', this.currentUser.uid), {
          currentPokerLobby: null
        }).catch(e => console.warn('Error clearing lobby claim:', e));
        this.currentLobby = null;
        this.currentLobbyId = null;
        if (this.lobbyUnsubscribe) {
          this.lobbyUnsubscribe();
          this.lobbyUnsubscribe = null;
        }
        if (this.onLobbyUpdate) {
          this.onLobbyUpdate(null);
        }
        if (this.onError) {
          this.onError({ message: 'You were removed from the lobby', context: 'kicked' });
        }
        return;
      }

      // Detect player changes
      if (previousPlayerIds.size > 0) {
        // Players who left
        for (const oldId of previousPlayerIds) {
          if (!currentPlayerIds.has(oldId) && oldId !== this.currentUser?.uid) {
            const leftPlayer = this.currentLobby?.players?.find(p => p.id === oldId);
            console.log(`👋 Player left: ${leftPlayer?.displayName || oldId}`);
            if (this.onPlayerLeave) {
              this.onPlayerLeave(oldId, leftPlayer?.displayName);
            }
          }
        }
        
        // Players who joined
        for (const newId of currentPlayerIds) {
          if (!previousPlayerIds.has(newId) && newId !== this.currentUser?.uid) {
            const joinedPlayer = newData.players?.find(p => p.id === newId);
            console.log(`🎉 Player joined: ${joinedPlayer?.displayName || newId}`);
            if (this.onPlayerJoin) {
              this.onPlayerJoin(newId, joinedPlayer?.displayName);
            }
          }
        }
      }

      // Detect host change
      if (previousHostId && newData.hostId !== previousHostId) {
        console.log(`👑 Host changed to: ${newData.hostName}`);
        if (this.onHostChange) {
          this.onHostChange(newData.hostId, newData.hostName);
        }
      }

      // Detect status change
      if (previousStatus && newData.status !== previousStatus) {
        console.log(`📊 Status changed: ${previousStatus} → ${newData.status}`);
        if (this.onStatusChange) {
          this.onStatusChange(newData.status, previousStatus);
        }
        // Auto-trigger game start callback
        if (newData.status === LOBBY_STATUS.IN_GAME && previousStatus !== LOBBY_STATUS.IN_GAME) {
          if (this.onGameStart) {
            this.onGameStart(lobbyId);
          }
        }
      }
      
      // Update tracking
      previousPlayerIds = currentPlayerIds;
      previousStatus = newData.status;
      previousHostId = newData.hostId;
      
      // Update local state
      this.currentLobby = newData;

      console.log(`📡 Lobby update - ${newData.players?.length || 0} players:`, 
        newData.players?.map(p => `${p.displayName}${p.isReady ? '✓' : ''}`).join(', ') || 'none'
      );

      // Emit updates
      if (this.onLobbyUpdate) {
        this.onLobbyUpdate(this.currentLobby);
      }

      if (this.currentLobby.gameState && this.onGameStateUpdate) {
        this.onGameStateUpdate(this.currentLobby.gameState);
      }
    }, (error) => {
      this._emitError(error, 'lobbyListener');
    });
  }

  startOnlinePlayersListener() {
    if (this.onlineUnsubscribe) {
      this.onlineUnsubscribe();
    }

    const usersRef = collection(this.db, 'mulon_users');
    const q = query(usersRef, where('isOnPoker', '==', true));

    this.onlineUnsubscribe = onSnapshot(q, (snapshot) => {
      const players = [];
      const now = Date.now();
      const staleThreshold = 2 * 60 * 1000; // 2 minutes

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        // Exclude self and stale users
        if (docSnap.id !== this.currentUser?.uid) {
          const lastSeen = data.pokerLastSeen?.toMillis?.() || 0;
          if (now - lastSeen < staleThreshold) {
            players.push({
              id: docSnap.id,
              displayName: data.displayName || data.email?.split('@')[0] || 'Player',
              photoURL: data.photoURL || null,
              balance: data.balance || 0,
              lobbyId: data.currentPokerLobby || null,
              isInGame: !!data.currentPokerLobby
            });
          }
        }
      });

      if (this.onOnlinePlayersUpdate) {
        this.onOnlinePlayersUpdate(players);
      }
    }, (error) => {
      this._emitError(error, 'onlinePlayersListener');
    });
  }

  startJoinRequestsListener() {
    if (!this.currentUser) return;
    
    if (this.requestsUnsubscribe) {
      this.requestsUnsubscribe();
    }

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
          
          // Check expiry
          const expiresAt = request.expiresAt?.toDate?.() || request.expiresAt;
          if (expiresAt && expiresAt < new Date()) {
            updateDoc(doc(this.db, 'poker_join_requests', request.id), {
              status: REQUEST_STATUS.EXPIRED
            }).catch(err => console.warn('Failed to expire request:', err));
            return;
          }

          if (this.onJoinRequest) {
            this.onJoinRequest(request);
          }
        }
      });
    }, (error) => {
      this._emitError(error, 'joinRequestsListener');
    });
  }

  // Refresh lobby data manually (useful after reconnection)
  async refreshLobbyData() {
    if (!this.currentLobbyId) return null;

    try {
      const lobbyDoc = await getDoc(doc(this.db, 'poker_lobbies', this.currentLobbyId));
      if (lobbyDoc.exists()) {
        this.currentLobby = { id: lobbyDoc.id, ...lobbyDoc.data() };
        if (this.onLobbyUpdate) {
          this.onLobbyUpdate(this.currentLobby);
        }
        return this.currentLobby;
      } else {
        // Lobby was deleted
        this.currentLobbyId = null;
        this.currentLobby = null;
        if (this.onLobbyUpdate) {
          this.onLobbyUpdate(null);
        }
        return null;
      }
    } catch (error) {
      this._emitError(error, 'refreshLobbyData');
      return null;
    }
  }

  // ========================================
  // PERIODIC TASKS
  // ========================================

  _startPeriodicTasks() {
    // Heartbeat every 30 seconds
    this.refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.setOnlineStatus(true);
      }
    }, 30000);

    // Cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this._cleanupInactiveLobbies();
    }, 2 * 60 * 1000);

    // Initial cleanup (delayed)
    setTimeout(() => this._cleanupInactiveLobbies(), 5000);
  }

  async _cleanupInactiveLobbies() {
    // Only run cleanup if we're the lobby host or not in any lobby
    if (this.currentLobbyId && !this.isHost()) {
      return;
    }

    try {
      const lobbiesSnapshot = await getDocs(collection(this.db, 'poker_lobbies'));
      const now = Date.now();
      const threshold = 5 * 60 * 1000; // 5 minutes
      
      const batch = writeBatch(this.db);
      let deleteCount = 0;

      lobbiesSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const updatedAt = data.updatedAt?.toMillis?.() || data.createdAt?.toMillis?.() || 0;
        const isEmpty = !data.players || data.players.length === 0;
        const isStale = (now - updatedAt) > threshold && data.status !== LOBBY_STATUS.IN_GAME;
        
        // Don't delete our own lobby
        if (docSnap.id === this.currentLobbyId) return;
        
        if (isEmpty || isStale) {
          batch.delete(docSnap.ref);
          deleteCount++;
        }
      });

      if (deleteCount > 0) {
        await batch.commit();
        console.log(`🧹 Cleaned up ${deleteCount} stale lobbies`);
      }
    } catch (error) {
      // Non-critical, just log
      console.warn('Error cleaning up lobbies:', error);
    }
  }

  // ========================================
  // VISIBILITY & RECONNECTION
  // ========================================

  handleVisibilityChange() {
    if (document.hidden) {
      // Page hidden - mark as potentially inactive
      console.log('📴 Page hidden');
    } else {
      // Page visible - refresh status and data
      console.log('📱 Page visible - refreshing');
      this.setOnlineStatus(true);
      
      // Refresh lobby data if in one
      if (this.currentLobbyId) {
        this.refreshLobbyData();
      }
    }
  }

  // Handle page unload (best effort cleanup)
  async handleBeforeUnload() {
    // Can't await here, just fire and forget
    if (this.currentUser) {
      navigator.sendBeacon && navigator.sendBeacon('/api/poker-offline', JSON.stringify({
        userId: this.currentUser.uid
      }));
    }
  }

  // ========================================
  // CLEANUP
  // ========================================

  async cleanup() {
    console.log('🧹 Cleaning up PokerLobbyManager...');
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    // Clear intervals
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Unsubscribe from all listeners
    const unsubscribers = [
      this.lobbyUnsubscribe,
      this.lobbiesUnsubscribe,
      this.requestsUnsubscribe,
      this.onlineUnsubscribe
    ];

    unsubscribers.forEach(unsub => {
      if (unsub) {
        try { unsub(); } catch (e) { /* ignore */ }
      }
    });

    this.lobbyUnsubscribe = null;
    this.lobbiesUnsubscribe = null;
    this.requestsUnsubscribe = null;
    this.onlineUnsubscribe = null;

    // Leave lobby if in one
    if (this.currentLobbyId) {
      try {
        await this._leaveLobbyInternal();
      } catch (error) {
        console.warn('Error leaving lobby during cleanup:', error);
      }
    }

    // Set offline status
    try {
      await this.setOnlineStatus(false);
    } catch (error) {
      console.warn('Error setting offline status:', error);
    }

    // Reset state
    this.isInitialized = false;
    this._joinLock = false;
    this._leaveLock = false;
    this._createLock = false;
    this._operationQueue = Promise.resolve();
    this._recentlyLeft = false;
    if (this._recentlyLeftTimeout) clearTimeout(this._recentlyLeftTimeout);
    this.currentLobby = null;
    this.currentLobbyId = null;

    console.log('✅ PokerLobbyManager cleaned up');
  }

  // Force cleanup (for emergency situations)
  forceCleanup() {
    this.isInitialized = false;
    this._joinLock = false;
    this._leaveLock = false;
    this._createLock = false;
    this._recentlyLeft = false;
    if (this._recentlyLeftTimeout) clearTimeout(this._recentlyLeftTimeout);
    this.currentLobby = null;
    this.currentLobbyId = null;
    
    [this.lobbyUnsubscribe, this.lobbiesUnsubscribe, this.requestsUnsubscribe, this.onlineUnsubscribe]
      .forEach(fn => fn && fn());
    
    this.lobbyUnsubscribe = null;
    this.lobbiesUnsubscribe = null;
    this.requestsUnsubscribe = null;
    this.onlineUnsubscribe = null;
    
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    
    console.log('⚡ Force cleanup complete');
  }

  // Clear current user's lobby state completely (useful for recovery)
  async clearUserLobbyState() {
    if (!this.currentUser || !this.db) {
      console.warn('Cannot clear: no user or db');
      return { success: false };
    }

    try {
      // Stop listeners
      if (this.lobbyUnsubscribe) {
        this.lobbyUnsubscribe();
        this.lobbyUnsubscribe = null;
      }

      // Find and leave any lobbies user is in
      const lobbiesSnapshot = await getDocs(collection(this.db, 'poker_lobbies'));
      const batch = writeBatch(this.db);
      let foundLobbies = 0;

      lobbiesSnapshot.forEach(lobbyDoc => {
        const data = lobbyDoc.data();
        if (this._isPlayerInList(data.players, this.currentUser.uid)) {
          foundLobbies++;
          const remainingPlayers = this._removePlayerFromList(data.players, this.currentUser.uid);
          
          if (remainingPlayers.length === 0) {
            batch.delete(lobbyDoc.ref);
          } else {
            let updateData = { players: remainingPlayers, updatedAt: serverTimestamp() };
            // Transfer host if needed
            if (data.hostId === this.currentUser.uid) {
              const newPlayers = this._transferHostInList(data.players, this.currentUser.uid);
              const newHostData = this._getNewHostData(newPlayers);
              if (newHostData) {
                Object.assign(updateData, newHostData);
                updateData.players = newPlayers;
              }
            }
            batch.update(lobbyDoc.ref, updateData);
          }
        }
      });

      // Clear user's lobby claim
      const userRef = doc(this.db, 'mulon_users', this.currentUser.uid);
      batch.update(userRef, { currentPokerLobby: null });

      await batch.commit();

      // Clear local state
      this.currentLobbyId = null;
      this.currentLobby = null;
      this._recentlyLeft = false;

      console.log(`🧹 Cleared user lobby state. Found in ${foundLobbies} lobbies.`);
      return { success: true, lobbiesCleared: foundLobbies };
    } catch (error) {
      this._emitError(error, 'clearUserLobbyState');
      return { success: false, error: error.message };
    }
  }

  // Debug: Delete all lobbies (use with caution!)
  async deleteAllLobbies() {
    if (!this.db) return { success: false, error: 'No database connection' };

    try {
      const lobbiesSnapshot = await getDocs(collection(this.db, 'poker_lobbies'));
      const batch = writeBatch(this.db);
      let count = 0;

      lobbiesSnapshot.forEach(lobbyDoc => {
        batch.delete(lobbyDoc.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }

      // Clear local state
      this.currentLobbyId = null;
      this.currentLobby = null;

      console.log(`🗑️ Deleted ${count} lobbies`);
      return { success: true, deleted: count };
    } catch (error) {
      console.error('Error deleting all lobbies:', error);
      return { success: false, error: error.message };
    }
  }
}

// ========================================
// SINGLETON & EXPORTS
// ========================================

let lobbyManagerInstance = null;

export function getPokerLobbyManager() {
  if (!lobbyManagerInstance) {
    lobbyManagerInstance = new PokerLobbyManager();
  }
  return lobbyManagerInstance;
}

// Reset singleton (for testing or recovery)
export function resetPokerLobbyManager() {
  if (lobbyManagerInstance) {
    lobbyManagerInstance.forceCleanup();
    lobbyManagerInstance = null;
  }
  return getPokerLobbyManager();
}

// Global access
window.PokerLobby = {
  LOBBY_STATUS,
  REQUEST_STATUS,
  PokerLobbyManager,
  getPokerLobbyManager,
  resetPokerLobbyManager,
  // Debug utilities
  clearUserLobbyState: () => getPokerLobbyManager().clearUserLobbyState(),
  deleteAllLobbies: () => getPokerLobbyManager().deleteAllLobbies()
};

export default { 
  LOBBY_STATUS, 
  REQUEST_STATUS, 
  PokerLobbyManager, 
  getPokerLobbyManager,
  resetPokerLobbyManager 
};
