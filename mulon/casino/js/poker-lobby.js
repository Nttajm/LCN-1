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
    
    // Callbacks
    this.onLobbyUpdate = null;
    this.onLobbiesUpdate = null;
    this.onJoinRequest = null;
    this.onGameStart = null;
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.onOnlinePlayersUpdate = null;
    this.onError = null;
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

    this.isInitialized = true;
    console.log('PokerLobbyManager initialized');
    return true;
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

      // Leave any previous lobby
      if (this.currentLobbyId && this.currentLobbyId !== lobbyId) {
        await this.leaveLobby();
      }

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
    if (!this.currentLobbyId || !this.currentUser) {
      return { success: false, error: 'Not in a lobby' };
    }

    try {
      const lobbyRef = doc(this.db, 'poker_lobbies', this.currentLobbyId);
      const lobbyDoc = await getDoc(lobbyRef);

      if (!lobbyDoc.exists()) {
        this.currentLobbyId = null;
        return { success: true };
      }

      const lobbyData = lobbyDoc.data();
      const player = lobbyData.players.find(p => p.id === this.currentUser.uid);

      if (!player) {
        this.currentLobbyId = null;
        return { success: true };
      }

      // Remove player from lobby
      await updateDoc(lobbyRef, {
        players: arrayRemove(player),
        updatedAt: serverTimestamp()
      });

      // If host leaves, transfer or close lobby
      if (lobbyData.hostId === this.currentUser.uid) {
        const remainingPlayers = lobbyData.players.filter(p => p.id !== this.currentUser.uid);
        
        if (remainingPlayers.length > 0) {
          // Transfer host to next player
          const newHost = remainingPlayers[0];
          await updateDoc(lobbyRef, {
            hostId: newHost.id,
            hostName: newHost.displayName,
            hostPhotoURL: newHost.photoURL,
            players: remainingPlayers.map((p, i) => ({
              ...p,
              isHost: i === 0
            }))
          });
        } else {
          // Close lobby if no players left
          await deleteDoc(lobbyRef);
        }
      }

      // Update user status
      await updateDoc(doc(this.db, 'mulon_users', this.currentUser.uid), {
        currentPokerLobby: null
      });

      // Stop listening
      if (this.lobbyUnsubscribe) {
        this.lobbyUnsubscribe();
        this.lobbyUnsubscribe = null;
      }

      this.currentLobbyId = null;
      this.currentLobby = null;

      return { success: true };
    } catch (error) {
      console.error('Error leaving lobby:', error);
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
        // Filter to only open/full lobbies (not in_game or closed)
        if (data.status === LOBBY_STATUS.OPEN || data.status === LOBBY_STATUS.FULL) {
          lobbies.push({ id: docSnap.id, ...data });
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

      this.currentLobby = { id: snapshot.id, ...snapshot.data() };

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
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating game state:', error);
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
    // Stop periodic refresh
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    // Unsubscribe from all listeners
    if (this.lobbyUnsubscribe) {
      this.lobbyUnsubscribe();
    }
    if (this.lobbiesUnsubscribe) {
      this.lobbiesUnsubscribe();
    }
    if (this.requestsUnsubscribe) {
      this.requestsUnsubscribe();
    }
    if (this.onlineUnsubscribe) {
      this.onlineUnsubscribe();
    }

    // Leave current lobby
    if (this.currentLobbyId) {
      await this.leaveLobby();
    }

    // Set offline status
    await this.setOnlineStatus(false);

    this.isInitialized = false;
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
