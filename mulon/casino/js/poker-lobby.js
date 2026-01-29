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
    
    // Bind handlers
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
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
    console.log('✅ PokerLobbyManager initialized');
    return true;
  }

  // Clean up any orphaned lobby references for this user
  async _cleanupUserLobbies() {
    if (!this.currentUser) return;

    try {
      // Get user's claimed lobby
      const userDoc = await getDoc(doc(this.db, 'mulon_users', this.currentUser.uid));
      const claimedLobbyId = userDoc.exists() ? userDoc.data().currentPokerLobby : null;

      // Find ALL lobbies where this user is a player
      const lobbiesSnapshot = await getDocs(collection(this.db, 'poker_lobbies'));
      const userLobbies = [];

      lobbiesSnapshot.forEach(lobbyDoc => {
        const data = lobbyDoc.data();
        const isInLobby = data.players?.some(p => p.id === this.currentUser.uid);
        if (isInLobby) {
          userLobbies.push({ id: lobbyDoc.id, ...data });
        }
      });

      console.log(`Found ${userLobbies.length} lobbies for user`);

      // If user is in multiple lobbies, clean up all except the most recent
      if (userLobbies.length > 1) {
        // Sort by joinedAt, keep the most recent
        userLobbies.sort((a, b) => {
          const aPlayer = a.players.find(p => p.id === this.currentUser.uid);
          const bPlayer = b.players.find(p => p.id === this.currentUser.uid);
          return (bPlayer?.joinedAt || 0) - (aPlayer?.joinedAt || 0);
        });

        // Remove user from all but the first (most recent)
        for (let i = 1; i < userLobbies.length; i++) {
          await this._removePlayerFromLobby(userLobbies[i].id, this.currentUser.uid);
          console.log(`🧹 Cleaned up duplicate lobby: ${userLobbies[i].id}`);
        }
      }

      // If user claims a lobby but isn't actually in it, clear the claim
      if (claimedLobbyId && !userLobbies.find(l => l.id === claimedLobbyId)) {
        await updateDoc(doc(this.db, 'mulon_users', this.currentUser.uid), {
          currentPokerLobby: null
        });
        console.log('🧹 Cleared stale lobby claim');
      }

      // If user is in exactly one lobby, make sure we're tracking it
      if (userLobbies.length === 1) {
        this.currentLobbyId = userLobbies[0].id;
        this.currentLobby = userLobbies[0];
        this.startLobbyListener(userLobbies[0].id);
        
        // Ensure user document matches
        if (claimedLobbyId !== userLobbies[0].id) {
          await updateDoc(doc(this.db, 'mulon_users', this.currentUser.uid), {
            currentPokerLobby: userLobbies[0].id
          });
        }
        console.log(`📍 Restored to lobby: ${userLobbies[0].id}`);
      }

    } catch (error) {
      console.error('Error cleaning up user lobbies:', error);
    }
  }

  // Remove a player from a lobby (helper)
  async _removePlayerFromLobby(lobbyId, playerId) {
    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', lobbyId);
      const lobbyDoc = await getDoc(lobbyRef);

      if (!lobbyDoc.exists()) return;

      const data = lobbyDoc.data();
      const remainingPlayers = (data.players || []).filter(p => p.id !== playerId);

      if (remainingPlayers.length === 0) {
        // Delete empty lobby
        await deleteDoc(lobbyRef);
      } else {
        // Update lobby with remaining players
        const updateData = {
          players: remainingPlayers,
          updatedAt: serverTimestamp()
        };

        // Transfer host if needed
        if (data.hostId === playerId) {
          const newHost = remainingPlayers[0];
          updateData.hostId = newHost.id;
          updateData.hostName = newHost.displayName;
          updateData.hostPhotoURL = newHost.photoURL;
          updateData.players = remainingPlayers.map((p, i) => ({
            ...p,
            isHost: i === 0
          }));
        }

        // Update status
        if (data.status !== LOBBY_STATUS.IN_GAME) {
          updateData.status = remainingPlayers.length >= data.maxPlayers ? 
            LOBBY_STATUS.FULL : LOBBY_STATUS.OPEN;
        }

        await updateDoc(lobbyRef, updateData);
      }
    } catch (error) {
      console.error('Error removing player from lobby:', error);
    }
  }

  // ========================================
  // LOBBY CREATION (with transaction)
  // ========================================

  async createLobby(buyIn, isPublic = true, maxPlayers = 6) {
    if (!this.currentUser) {
      return { success: false, error: 'Not signed in' };
    }

    // Prevent double operations
    if (this._createLock) {
      return { success: false, error: 'Operation in progress' };
    }
    this._createLock = true;

    try {
      // STEP 1: Leave any existing lobby first
      if (this.currentLobbyId) {
        await this.leaveLobby();
      }

      // STEP 2: Verify user isn't in any lobby
      const lobbiesSnapshot = await getDocs(collection(this.db, 'poker_lobbies'));
      for (const lobbyDoc of lobbiesSnapshot.docs) {
        const data = lobbyDoc.data();
        if (data.players?.some(p => p.id === this.currentUser.uid)) {
          // Remove from this lobby
          await this._removePlayerFromLobby(lobbyDoc.id, this.currentUser.uid);
        }
      }

      // STEP 3: Check balance
      const userData = window.CasinoAuth?.userData;
      if (userData && userData.balance < buyIn) {
        return { success: false, error: 'Insufficient balance for buy-in' };
      }

      // STEP 4: Create lobby with unique ID first, then write
      const lobbyRef = doc(collection(this.db, 'poker_lobbies'));
      const lobbyId = lobbyRef.id;
      const now = Date.now();

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
        players: [{
          id: this.currentUser.uid,
          displayName: this.currentUser.displayName || 'Host',
          photoURL: this.currentUser.photoURL || null,
          seatIndex: 0,
          isReady: false,
          isHost: true,
          joinedAt: now
        }],
        gameState: null,
        playAgainVotes: []
      };

      // Use batch write for atomicity
      const batch = writeBatch(this.db);
      batch.set(lobbyRef, lobbyData);
      batch.update(doc(this.db, 'mulon_users', this.currentUser.uid), {
        currentPokerLobby: lobbyId
      });
      await batch.commit();

      // STEP 5: Update local state
      this.currentLobbyId = lobbyId;
      this.currentLobby = { id: lobbyId, ...lobbyData };

      // STEP 6: Start listener
      this.startLobbyListener(lobbyId);

      console.log(`✅ Created lobby: ${lobbyId}`);
      return { success: true, lobbyId };

    } catch (error) {
      console.error('Error creating lobby:', error);
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
      return { success: true, message: 'Already in this lobby' };
    }

    // Prevent double operations
    if (this._joinLock) {
      return { success: false, error: 'Join operation in progress' };
    }
    this._joinLock = true;

    try {
      // STEP 1: Leave current lobby if in one
      if (this.currentLobbyId) {
        await this.leaveLobby();
        // Small delay to ensure leave completes
        await new Promise(r => setTimeout(r, 100));
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
        if (lobbyData.players?.some(p => p.id === this.currentUser.uid)) {
          return { alreadyIn: true, seatIndex: lobbyData.players.find(p => p.id === this.currentUser.uid).seatIndex };
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
        const takenSeats = new Set(lobbyData.players.map(p => p.seatIndex));
        let seatIndex = 0;
        while (takenSeats.has(seatIndex) && seatIndex < lobbyData.maxPlayers) {
          seatIndex++;
        }

        // Create player object
        const newPlayer = {
          id: this.currentUser.uid,
          displayName: this.currentUser.displayName || 'Player',
          photoURL: this.currentUser.photoURL || null,
          seatIndex: seatIndex,
          isReady: false,
          isHost: false,
          joinedAt: Date.now(),
          waitingForNextHand: lobbyData.status === LOBBY_STATUS.IN_GAME
        };

        // Build new players array (don't use arrayUnion)
        const newPlayers = [...lobbyData.players, newPlayer];

        // Determine status
        let newStatus = lobbyData.status;
        if (lobbyData.status !== LOBBY_STATUS.IN_GAME) {
          newStatus = newPlayers.length >= lobbyData.maxPlayers ? 
            LOBBY_STATUS.FULL : LOBBY_STATUS.OPEN;
        }

        // Write updates
        transaction.update(lobbyRef, {
          players: newPlayers,
          status: newStatus,
          updatedAt: serverTimestamp()
        });

        transaction.update(userRef, {
          currentPokerLobby: lobbyId
        });

        return { success: true, seatIndex };
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

      console.log(`✅ Joined lobby: ${lobbyId}`);
      return { success: true, lobbyId, seatIndex: result.seatIndex };

    } catch (error) {
      console.error('Error joining lobby:', error);
      return { success: false, error: error.message };
    } finally {
      this._joinLock = false;
    }
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
      if (lobbyData.players.some(p => p.id === this.currentUser.uid)) {
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
      console.error('Error requesting join:', error);
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
          if (lobbyData.players.some(p => p.id === requestData.requesterId)) {
            return; // Already in, just update request
          }

          // Check if full
          if (lobbyData.players.length >= lobbyData.maxPlayers) {
            throw new Error('Lobby is full');
          }

          // Find seat
          const takenSeats = new Set(lobbyData.players.map(p => p.seatIndex));
          let seatIndex = 0;
          while (takenSeats.has(seatIndex)) seatIndex++;

          const newPlayer = {
            id: requestData.requesterId,
            displayName: requestData.requesterName,
            photoURL: requestData.requesterPhotoURL,
            seatIndex: seatIndex,
            isReady: false,
            isHost: false,
            joinedAt: Date.now()
          };

          const newPlayers = [...lobbyData.players, newPlayer];
          let newStatus = lobbyData.status;
          if (lobbyData.status !== LOBBY_STATUS.IN_GAME) {
            newStatus = newPlayers.length >= lobbyData.maxPlayers ? 
              LOBBY_STATUS.FULL : LOBBY_STATUS.OPEN;
          }

          transaction.update(lobbyRef, {
            players: newPlayers,
            status: newStatus,
            updatedAt: serverTimestamp()
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
      console.error('Error handling request:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // LOBBY LEAVING (with transaction)
  // ========================================

  async leaveLobby() {
    const lobbyIdToLeave = this.currentLobbyId;
    
    if (!lobbyIdToLeave || !this.currentUser) {
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
      // Stop listener first
      if (this.lobbyUnsubscribe) {
        this.lobbyUnsubscribe();
        this.lobbyUnsubscribe = null;
      }

      const lobbyRef = doc(this.db, 'poker_lobbies', lobbyIdToLeave);
      const userRef = doc(this.db, 'mulon_users', this.currentUser.uid);

      await runTransaction(this.db, async (transaction) => {
        const lobbyDoc = await transaction.get(lobbyRef);

        // Always clear user's lobby reference
        transaction.update(userRef, { currentPokerLobby: null });

        if (!lobbyDoc.exists()) {
          return; // Lobby already gone
        }

        const lobbyData = lobbyDoc.data();
        const remainingPlayers = (lobbyData.players || []).filter(
          p => p.id !== this.currentUser.uid
        );

        if (remainingPlayers.length === 0) {
          // Delete empty lobby
          transaction.delete(lobbyRef);
          console.log('🗑️ Deleted empty lobby');
        } else {
          const updateData = {
            players: remainingPlayers,
            updatedAt: serverTimestamp()
          };

          // Transfer host if needed
          if (lobbyData.hostId === this.currentUser.uid) {
            const newHost = remainingPlayers[0];
            updateData.hostId = newHost.id;
            updateData.hostName = newHost.displayName;
            updateData.hostPhotoURL = newHost.photoURL;
            updateData.players = remainingPlayers.map((p, i) => ({
              ...p,
              isHost: i === 0
            }));
            console.log('👑 Host transferred to:', newHost.displayName);
          }

          // Update status
          if (lobbyData.status !== LOBBY_STATUS.IN_GAME) {
            updateData.status = remainingPlayers.length >= lobbyData.maxPlayers ?
              LOBBY_STATUS.FULL : LOBBY_STATUS.OPEN;
          }

          // Handle in-game leave
          if (lobbyData.status === LOBBY_STATUS.IN_GAME && lobbyData.gameState) {
            const gameStatePlayers = lobbyData.gameState.players || [];
            const leavingIdx = gameStatePlayers.findIndex(
              p => p && p.id === this.currentUser.uid
            );
            
            if (leavingIdx !== -1) {
              const updatedGamePlayers = [...gameStatePlayers];
              updatedGamePlayers[leavingIdx] = null;
              
              updateData.gameState = {
                ...lobbyData.gameState,
                players: updatedGamePlayers
              };

              // Advance turn if it was this player's turn
              if (lobbyData.gameState.currentPlayerIndex === leavingIdx) {
                let nextIdx = (leavingIdx + 1) % updatedGamePlayers.length;
                let attempts = 0;
                while (attempts < updatedGamePlayers.length) {
                  const next = updatedGamePlayers[nextIdx];
                  if (next && !next.isFolded && next.chips > 0) break;
                  nextIdx = (nextIdx + 1) % updatedGamePlayers.length;
                  attempts++;
                }
                updateData.gameState.currentPlayerIndex = nextIdx;
              }
            }
          }

          transaction.update(lobbyRef, updateData);
        }
      });

      // Clear local state
      this.currentLobbyId = null;
      this.currentLobby = null;

      console.log(`✅ Left lobby: ${lobbyIdToLeave}`);

      if (this.onPlayerLeave) {
        this.onPlayerLeave(this.currentUser.uid);
      }

      return { success: true };

    } catch (error) {
      console.error('Error leaving lobby:', error);
      // Clear state anyway to prevent stuck
      this.currentLobbyId = null;
      this.currentLobby = null;
      return { success: false, error: error.message };
    } finally {
      this._leaveLock = false;
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
        const updatedPlayers = lobbyData.players.map(p => 
          p.id === this.currentUser.uid ? { ...p, isReady } : p
        );

        transaction.update(lobbyRef, {
          players: updatedPlayers,
          updatedAt: serverTimestamp()
        });
      });

      return { success: true };
    } catch (error) {
      console.error('Error setting ready:', error);
      return { success: false, error: error.message };
    }
  }

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

      if (lobbyData.hostId !== this.currentUser.uid) {
        return { success: false, error: 'Only the host can start the game' };
      }

      if (!lobbyData.players || lobbyData.players.length < 2) {
        return { success: false, error: 'Need at least 2 players' };
      }

      await updateDoc(lobbyRef, {
        status: LOBBY_STATUS.IN_GAME,
        gameStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('🎮 Host started the game');

      if (this.onGameStart) {
        this.onGameStart(this.currentLobbyId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error starting game:', error);
      return { success: false, error: error.message };
    }
  }

  canStartGame() {
    if (!this.currentLobby) return false;
    const players = this.currentLobby.players || [];
    return players.length >= 2 && players.every(p => p.isReady);
  }

  getPlayerCount() {
    return this.currentLobby?.players?.length || 0;
  }

  isHost() {
    return this.currentLobby?.hostId === this.currentUser?.uid;
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
      const lobbyDoc = await getDoc(lobbyRef);

      if (!lobbyDoc.exists()) {
        return { success: false, error: 'Lobby not found' };
      }

      const lobbyData = lobbyDoc.data();

      if (lobbyData.hostId !== this.currentUser.uid) {
        return { success: false, error: 'Only the host can change buy-in' };
      }

      if (lobbyData.status === LOBBY_STATUS.IN_GAME) {
        return { success: false, error: 'Cannot change buy-in during game' };
      }

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

  // ========================================
  // GAME STATE MANAGEMENT
  // ========================================

  async updateGameState(gameState) {
    if (!this.currentLobbyId) return;

    try {
      await updateDoc(doc(this.db, 'poker_lobbies', this.currentLobbyId), {
        gameState: gameState,
        status: LOBBY_STATUS.IN_GAME,
        gamePhase: gameState?.phase || null,
        pot: gameState?.pot || 0,
        currentBet: gameState?.currentBet || 0,
        currentPlayerIndex: gameState?.currentPlayerIndex,
        playAgainVotes: [],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating game state:', error);
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
            updatedAt: serverTimestamp()
          });
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error voting play again:', error);
      return { success: false, error: error.message };
    }
  }

  getPlayAgainVotes() {
    return this.currentLobby?.playAgainVotes || [];
  }

  allPlayersVoted() {
    const votes = this.getPlayAgainVotes();
    const players = this.currentLobby?.players || [];
    return votes.length >= players.length && players.length >= 2;
  }

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
        playAgainVotes: [],
        status: playerCount >= lobbyData.maxPlayers ? LOBBY_STATUS.FULL : LOBBY_STATUS.OPEN,
        players: (lobbyData.players || []).map(p => ({
          ...p,
          isReady: false,
          isFolded: false,
          chips: lobbyData.buyIn || 0
        })),
        updatedAt: serverTimestamp()
      });
      
      console.log('🔄 Game state reset');
    } catch (error) {
      console.error('Error resetting game state:', error);
    }
  }

  async awardWinnings(playerId, amount) {
    if (!playerId || amount <= 0) {
      return { success: false, error: 'Invalid params' };
    }
    
    try {
      await updateDoc(doc(this.db, 'mulon_users', playerId), {
        balance: increment(amount)
      });
      console.log(`💰 Awarded $${amount} to ${playerId}`);
      return { success: true };
    } catch (error) {
      console.error('Error awarding winnings:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // ONLINE STATUS
  // ========================================

  async setOnlineStatus(isOnPoker) {
    if (!this.currentUser) return;

    try {
      await updateDoc(doc(this.db, 'mulon_users', this.currentUser.uid), {
        isOnPoker: isOnPoker,
        pokerLastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Error setting online status:', error);
    }
  }

  // ========================================
  // LISTENERS
  // ========================================

  startLobbiesListener() {
    if (this.lobbiesUnsubscribe) {
      this.lobbiesUnsubscribe();
    }

    const lobbiesRef = collection(this.db, 'poker_lobbies');
    const q = query(lobbiesRef, where('isPublic', '==', true), limit(50));

    this.lobbiesUnsubscribe = onSnapshot(q, (snapshot) => {
      const lobbies = [];
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.status !== LOBBY_STATUS.CLOSED) {
          lobbies.push({
            id: docSnap.id,
            ...data,
            gamePhase: data.gamePhase || data.gameState?.phase || null,
            currentPlayerIndex: data.currentPlayerIndex ?? data.gameState?.currentPlayerIndex,
            pot: data.pot || data.gameState?.pot || 0
          });
        }
      });

      // Sort by creation time
      lobbies.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      if (this.onLobbiesUpdate) {
        this.onLobbiesUpdate(lobbies);
      }
    }, (error) => {
      console.error('Lobbies listener error:', error);
    });
  }

  startLobbyListener(lobbyId) {
    if (this.lobbyUnsubscribe) {
      this.lobbyUnsubscribe();
    }

    console.log(`🔔 Starting lobby listener for: ${lobbyId}`);
    const lobbyRef = doc(this.db, 'poker_lobbies', lobbyId);

    this.lobbyUnsubscribe = onSnapshot(lobbyRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log('Lobby no longer exists');
        this.currentLobby = null;
        this.currentLobbyId = null;
        if (this.onLobbyUpdate) {
          this.onLobbyUpdate(null);
        }
        return;
      }

      const newData = { id: snapshot.id, ...snapshot.data() };
      
      // Detect player changes
      if (this.currentLobby?.players && newData.players) {
        const oldIds = new Set(this.currentLobby.players.map(p => p.id));
        const newIds = new Set(newData.players.map(p => p.id));
        
        // Players who left
        for (const oldId of oldIds) {
          if (!newIds.has(oldId) && oldId !== this.currentUser?.uid) {
            const left = this.currentLobby.players.find(p => p.id === oldId);
            if (this.onPlayerLeave) {
              this.onPlayerLeave(oldId, left?.displayName);
            }
          }
        }
        
        // Players who joined
        for (const newId of newIds) {
          if (!oldIds.has(newId) && newId !== this.currentUser?.uid) {
            const joined = newData.players.find(p => p.id === newId);
            if (this.onPlayerJoin) {
              this.onPlayerJoin(newId, joined?.displayName);
            }
          }
        }
      }
      
      this.currentLobby = newData;

      console.log(`📡 Lobby snapshot update - ${newData.players?.length || 0} players:`, 
        newData.players?.map(p => p.displayName) || []);

      if (this.onLobbyUpdate) {
        this.onLobbyUpdate(this.currentLobby);
      } else {
        console.warn('⚠️ onLobbyUpdate callback not set!');
      }

      if (this.currentLobby.gameState && this.onGameStateUpdate) {
        this.onGameStateUpdate(this.currentLobby.gameState);
      }
    }, (error) => {
      console.error('Lobby listener error:', error);
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
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (docSnap.id !== this.currentUser?.uid) {
          players.push({
            id: docSnap.id,
            displayName: data.displayName || data.email?.split('@')[0] || 'Player',
            photoURL: data.photoURL || null,
            balance: data.balance || 0,
            lobbyId: data.currentPokerLobby || null
          });
        }
      });

      if (this.onOnlinePlayersUpdate) {
        this.onOnlinePlayersUpdate(players);
      }
    }, (error) => {
      console.error('Online players listener error:', error);
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
          if (request.expiresAt?.toDate?.() < new Date()) {
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
    }, (error) => {
      console.error('Join requests listener error:', error);
    });
  }

  // ========================================
  // PERIODIC TASKS
  // ========================================

  _startPeriodicTasks() {
    // Heartbeat every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.setOnlineStatus(true);
    }, 30000);

    // Cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this._cleanupInactiveLobbies();
    }, 2 * 60 * 1000);

    // Initial cleanup
    this._cleanupInactiveLobbies();
  }

  async _cleanupInactiveLobbies() {
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
        const isStale = (now - updatedAt) > threshold;
        
        if (isEmpty || isStale) {
          batch.delete(docSnap.ref);
          deleteCount++;
        }
      });

      if (deleteCount > 0) {
        await batch.commit();
        console.log(`🧹 Cleaned up ${deleteCount} lobbies`);
      }
    } catch (error) {
      console.error('Error cleaning up lobbies:', error);
    }
  }

  // ========================================
  // VISIBILITY HANDLER
  // ========================================

  handleVisibilityChange() {
    if (document.hidden) {
      // Page hidden - could pause some listeners if needed
    } else {
      // Page visible - refresh status
      this.setOnlineStatus(true);
    }
  }

  // ========================================
  // CLEANUP
  // ========================================

  async cleanup() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

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

    if (this.currentLobbyId) {
      await this.leaveLobby();
    }

    await this.setOnlineStatus(false);

    this.isInitialized = false;
    this._joinLock = false;
    this._leaveLock = false;
    this._createLock = false;

    console.log('✅ PokerLobbyManager cleaned up');
  }
}

// ========================================
// SINGLETON
// ========================================

let lobbyManagerInstance = null;

export function getPokerLobbyManager() {
  if (!lobbyManagerInstance) {
    lobbyManagerInstance = new PokerLobbyManager();
  }
  return lobbyManagerInstance;
}

// Global access
window.PokerLobby = {
  LOBBY_STATUS,
  REQUEST_STATUS,
  PokerLobbyManager,
  getPokerLobbyManager
};

export default { LOBBY_STATUS, REQUEST_STATUS, PokerLobbyManager, getPokerLobbyManager };
