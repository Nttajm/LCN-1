// ========================================
// POKER - Main Game Controller
// Integrates cards, game logic, lobby, and UI
// ========================================

// Import dependencies
import { Card, Deck, HandEvaluator, HAND_NAMES, createCardElement } from './poker-cards.js';
import { PokerGame, GAME_PHASES, PLAYER_ACTIONS, CHIP_VALUES, Player, createChipStackHTML, createChipTowerHTML, calculateChipTowers } from './poker-game.js';
// Player class is imported above for direct player creation in startGame
import { getPokerLobbyManager, LOBBY_STATUS, REQUEST_STATUS } from './poker-lobby.js';
import { CasinoAuth, CasinoDB } from './casino-auth.js';

// ========================================
// POKER CONTROLLER
// ========================================
class PokerController {
  constructor() {
    // Core systems
    this.lobbyManager = null;
    this.game = null;
    this.currentUser = null;
    this.userData = null;

    // State
    this.isHost = false;
    this.isInGame = false;
    this.isLeaving = false; // Prevent double leave clicks
    this.isStartingGame = false; // Prevent double start clicks
    this.buyInDeducted = false; // Track if buy-in was deducted for current game
    this.selectedBuyIn = 25;
    this.lastPhase = null; // Track phase for chip animations
    this.showdownModalShown = false;
    this._startingNewHand = false; // Flag to prevent duplicate startNewHand calls
    this._startingNewHandInProgress = false; // Flag to prevent concurrent startNewHand execution
    this._buyInDeducted = false; // Flag to prevent double buy-in deduction
    this._currentGameId = null; // Track current game to prevent duplicate deductions across games

    // DOM elements cache
    this.elements = {};

    // Bind methods
    this.handleLobbyUpdate = this.handleLobbyUpdate.bind(this);
    this.handleLobbiesUpdate = this.handleLobbiesUpdate.bind(this);
    this.handleJoinRequest = this.handleJoinRequest.bind(this);
    this.handleOnlinePlayersUpdate = this.handleOnlinePlayersUpdate.bind(this);
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  async init() {
    console.log('Initializing Poker Controller...');

    // Wait for auth
    await this.waitForAuth();

    // Initialize auth with maintenance check
    const hasAccess = await CasinoAuth.initWithMaintenanceCheck();
    if (!hasAccess) return;

    // Cache DOM elements
    this.cacheElements();

    // Setup event listeners
    this.setupEventListeners();

    // Setup auth UI
    this.setupAuthUI();

    // Initialize lobby manager
    await this.initLobbyManager();

    // Update UI
    this.updateBalanceDisplay();
    this.updateUIState();

    console.log('Poker Controller initialized!');
  }

  // Wait for CasinoAuth to be ready
  waitForAuth() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.CasinoAuth) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  // Cache DOM elements
  cacheElements() {
    this.elements = {
      // Sidebar
      sidebar: document.querySelector('.online-players-sidebar'),
      playersList: document.querySelector('.players-list'),
      onlineCount: document.querySelector('.online-count'),

      // Notifications
      joinNotifications: document.getElementById('joinNotifications'),

      // Game area
      gameArea: document.querySelector('.game-area'),
      table: document.querySelector('.table'),
      partyCircle: document.querySelector('.party-circle'),
      communityCards: document.querySelector('.community-cards'),
      potChips: document.getElementById('potChips'),
      potAmount: document.getElementById('potAmount'),
      callAmount: document.getElementById('callAmount'),
      callAmountDisplay: document.getElementById('callAmountDisplay'),

      // Player slots
      playerSlots: document.querySelectorAll('.player-slot'),
      yourSlot: document.getElementById('yourSlot'),
      yourChipsAmount: document.getElementById('yourChipsAmount'),
      yourChipStack: document.getElementById('yourChipStack'),
      yourBet: document.getElementById('yourBet'),
      
      // Table bets
      tableBets: document.querySelector('.table-bets'),

      // Config panel
      partyConfig: document.querySelector('.party-config'),
      buyinBtns: document.querySelectorAll('.buyin-btn'),
      buyinInput: document.querySelector('.buyin-input'),
      setBuyInBtn: document.getElementById('setBuyInBtn'),
      buyinDisplay: document.getElementById('buyinDisplay'),
      buyinValue: document.getElementById('buyinValue'),
      readyBtn: document.querySelector('.ready-btn'),
      startGameBtn: document.getElementById('startGameBtn'),
      readyCount: document.querySelector('.ready-count'),
      waitingText: document.querySelector('.waiting-text'),
      
      // Leave game button
      leaveGameBtn: document.getElementById('leaveGameBtn'),

      // Poker actions
      pokerActions: document.getElementById('pokerActions'),
      yourCards: document.querySelector('.your-cards'),
      foldBtn: document.querySelector('.action-btn.fold'),
      checkBtn: document.querySelector('.action-btn.check'),
      callBtn: document.querySelector('.action-btn.call'),
      raiseBtn: document.querySelector('.action-btn.raise'),
      raiseInput: document.querySelector('.raise-input'),
      allinBtn: document.querySelector('.action-btn.allin'),
      turnTimer: document.querySelector('.turn-timer'),
      timerBar: document.querySelector('.timer-bar'),
      timerText: document.querySelector('.timer-text'),

      // Hand guide modal
      handGuideBtn: document.getElementById('handGuideBtn'),
      handGuideModal: document.getElementById('handGuideModal'),
      closeGuideBtn: document.getElementById('closeGuideBtn'),
      
      // Showdown modal
      showdownModal: document.getElementById('showdownModal'),
      showdownPlayers: document.getElementById('showdownPlayers'),
      showdownWinner: document.getElementById('showdownWinner'),
      playAgainBtn: document.getElementById('playAgainBtn'),
      stayLobbyBtn: document.getElementById('stayLobbyBtn'),

      // Header
      userBalance: document.getElementById('userBalance'),
      userKeys: document.getElementById('userKeys'),
      userXPs: document.getElementById('userXPs'),
      signInBtn: document.getElementById('signInBtn'),
      userInfo: document.getElementById('userInfo'),
      userName: document.getElementById('userName'),
      signOutBtn: document.getElementById('signOutBtn'),

      // Your avatar and name
      yourAvatar: document.getElementById('yourAvatar'),
      yourName: document.getElementById('yourName')
    };
  }

  // Setup event listeners
  setupEventListeners() {
    // Buy-in selection (only sets local value, host must click Set to update lobby)
    this.elements.buyinBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.buyinBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedBuyIn = parseInt(btn.dataset.amount);
        this.elements.buyinInput.value = '';
        // Show Set button if host and in a lobby
        this.showSetBuyInButton();
      });
    });

    // Custom buy-in (minimum $10)
    this.elements.buyinInput?.addEventListener('input', () => {
      const value = parseInt(this.elements.buyinInput.value);
      if (value >= 10) {
        this.elements.buyinBtns.forEach(b => b.classList.remove('active'));
        this.selectedBuyIn = value;
        this.showSetBuyInButton();
      } else if (value > 0 && value < 10) {
        this.showToast('Minimum buy-in is $10', 'error');
      }
    });

    // Set Buy-In button (host only - commits to Firebase)
    this.elements.setBuyInBtn?.addEventListener('click', () => this.handleSetBuyIn());

    // Ready button
    this.elements.readyBtn?.addEventListener('click', () => this.toggleReady());

    // Start Game button (host only)
    this.elements.startGameBtn?.addEventListener('click', () => this.handleStartGame());
    
    // Leave Game button
    this.elements.leaveGameBtn?.addEventListener('click', () => this.handleLeaveGame());

    // Poker action buttons
    this.elements.foldBtn?.addEventListener('click', () => this.handleAction('fold'));
    this.elements.checkBtn?.addEventListener('click', () => this.handleAction('check'));
    this.elements.callBtn?.addEventListener('click', () => this.handleAction('call'));
    this.elements.raiseBtn?.addEventListener('click', () => this.handleAction('raise'));
    this.elements.allinBtn?.addEventListener('click', () => this.handleAction('all_in'));
    
    // Hand guide modal
    this.elements.handGuideBtn?.addEventListener('click', () => {
      this.elements.handGuideModal?.classList.add('show');
    });
    this.elements.closeGuideBtn?.addEventListener('click', () => {
      this.elements.handGuideModal?.classList.remove('show');
    });
    this.elements.handGuideModal?.addEventListener('click', (e) => {
      if (e.target === this.elements.handGuideModal) {
        this.elements.handGuideModal.classList.remove('show');
      }
    });
    
    // Showdown modal buttons
    this.elements.playAgainBtn?.addEventListener('click', () => this.handlePlayAgain());
    this.elements.stayLobbyBtn?.addEventListener('click', () => this.handleReturnToLobby());

    // Cleanup on page leave
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  // Setup auth UI
  setupAuthUI() {
    this.elements.signInBtn?.addEventListener('click', async () => {
      const result = await CasinoAuth.signIn();
      if (result.success) {
        await this.initLobbyManager();
      }
    });

    this.elements.signOutBtn?.addEventListener('click', async () => {
      await this.cleanup();
      await CasinoAuth.signOut();
    });

    // Listen for auth changes
    CasinoAuth.onAuthStateChange(async (user, userData) => {
      this.currentUser = user;
      this.userData = userData;
      this.updateBalanceDisplay();
      this.updateUIState();
      
      // Initialize lobby manager when user signs in
      if (user && !this.lobbyManager) {
        await this.initLobbyManager();
      }
    });
  }

  // ========================================
  // LOBBY MANAGER INTEGRATION
  // ========================================

  async initLobbyManager() {
    if (!CasinoAuth.isSignedIn()) {
      console.log('Not signed in, skipping lobby init');
      return;
    }

    this.lobbyManager = getPokerLobbyManager();
    
    // Get Firestore instance from CasinoDB
    const db = CasinoDB.getDB();
    if (!db) {
      console.error('❌ Database not available');
      return;
    }
    
    console.log('🎲 Initializing lobby manager for user:', CasinoAuth.currentUser?.displayName);
    
    // IMPORTANT: Set up callbacks BEFORE init() to catch early updates
    this.lobbyManager.onLobbyUpdate = this.handleLobbyUpdate;
    this.lobbyManager.onLobbiesUpdate = this.handleLobbiesUpdate;
    this.lobbyManager.onJoinRequest = this.handleJoinRequest;
    this.lobbyManager.onOnlinePlayersUpdate = this.handleOnlinePlayersUpdate;
    // Note: onGameStart is no longer used - host calls startGame() directly in handleStartGame()
    this.lobbyManager.onGameStart = null;
    this.lobbyManager.onGameStateUpdate = this.handleGameStateUpdate.bind(this);
    
    // Player join/leave notifications with immediate UI refresh
    this.lobbyManager.onPlayerJoin = (playerId, playerName) => {
      if (playerId !== this.currentUser?.uid) {
        this.showToast(`${playerName || 'A player'} joined the lobby`, 'success');
        // Force immediate sidebar update
        if (this.lobbyManager.currentLobby) {
          this.updatePlayerSlots(this.lobbyManager.currentLobby.players);
        }
      }
    };
    
    this.lobbyManager.onPlayerLeave = (playerId, playerName) => {
      if (playerId !== this.currentUser?.uid) {
        this.showToast(`${playerName || 'A player'} left the lobby`, 'info');
        // Force immediate sidebar update
        if (this.lobbyManager.currentLobby) {
          this.updatePlayerSlots(this.lobbyManager.currentLobby.players);
        }
      }
    };
    
    // Host change notification
    this.lobbyManager.onHostChange = (newHostId, newHostName) => {
      if (newHostId === this.currentUser?.uid) {
        this.showToast('You are now the host!', 'success');
        this.isHost = true;
      } else {
        this.showToast(`${newHostName || 'Another player'} is now the host`, 'info');
        this.isHost = false;
      }
      // Refresh UI for host controls
      if (this.lobbyManager.currentLobby) {
        this.handleLobbyUpdate(this.lobbyManager.currentLobby);
      }
    };
    
    // Status change notification
    this.lobbyManager.onStatusChange = (newStatus, oldStatus) => {
      console.log(`📊 Lobby status: ${oldStatus} → ${newStatus}`);
      if (newStatus === LOBBY_STATUS.IN_GAME && oldStatus !== LOBBY_STATUS.IN_GAME) {
        this.showToast('Game starting!', 'success');
      }
    };
    
    // Error handling
    this.lobbyManager.onError = (error) => {
      console.error('Lobby error:', error);
      
      // Special handling for being kicked
      if (error.context === 'kicked') {
        this.showToast('You were removed from the lobby', 'error');
        this.resetLobbyUI();
        return;
      }
      
      this.showToast(error.message || 'An error occurred', 'error');
    };
    
    // Initialize AFTER callbacks are set up
    const initResult = await this.lobbyManager.init(db, CasinoAuth.currentUser);
    console.log('🎲 Lobby manager initialized:', initResult);
  }

  // ========================================
  // CALLBACK HANDLERS
  // ========================================

  // Handle game state updates from Firebase (for all players)
  handleGameStateUpdate(gameState) {
    if (!gameState) return;
    
    console.log('📡 Game state update from Firebase:', gameState.phase);
    
    // Ensure we're marked as in-game when receiving game state
    if (!this.isInGame) {
      console.log('🎮 Entering game from game state update');
      this.isInGame = true;
      document.body.classList.add('game-started');
      
      // Hide config panel
      if (this.elements.partyConfig) {
        this.elements.partyConfig.style.display = 'none';
      }
    }
    
    // Reset card animation state when a new hand starts (PRE_FLOP)
    if (gameState.phase === GAME_PHASES.PRE_FLOP && this.lastPhase !== GAME_PHASES.PRE_FLOP) {
      this.resetCardAnimationState();
      // Hide showdown modal when new hand starts
      this.hideShowdownModal();
      this.showdownModalShown = false;
    }
    
    // Track phase changes for animations
    this.lastPhase = gameState.phase;
    
    // Always deserialize game state so all players have the latest game instance
    // This ensures non-host players can take actions
    this.game = PokerGame.deserialize(gameState);
    
    // Update UI with user-filtered view (hide other players' cards)
    // Re-serialize with current user to filter cards for display
    const displayState = this.game.serialize(this.currentUser?.uid);
    this.updateGameUI(displayState);
    
    // Check for game end - show winners and refresh balance
    if (gameState.phase === GAME_PHASES.ENDED || gameState.phase === GAME_PHASES.SHOWDOWN) {
      // Show winner toast and modal for all players
      if (gameState.lastWinners && gameState.lastWinners.length > 0) {
        const myWin = gameState.lastWinners.find(w => w.playerId === this.currentUser?.uid);
        if (myWin) {
          this.showToast(`You won $${myWin.winnings}!`, 'success');
        } else {
          const winnerNames = gameState.lastWinners.map(w => w.displayName).join(', ');
          this.showToast(`${winnerNames} won the pot!`, 'info');
        }
        
        // Show showdown modal for all players (flag prevents duplicates for the player who took the last action)
        if (!this.showdownModalShown) {
          this.showdownModalShown = true;
          
          // Build result object from game state
          const result = {
            winners: gameState.lastWinners.map(w => ({
              player: this.game.players.find(p => p?.id === w.playerId) || { id: w.playerId, displayName: w.displayName },
              winnings: w.winnings,
              handName: w.handName
            }))
          };
          
          this.showShowdownModal(result);
          // Modal stays visible until player clicks Play Again or Leave
        }
      }
      
      // Refresh balance from Firebase (in case winnings were awarded)
      if (this.currentUser) {
        CasinoAuth.loadUserData(this.currentUser.uid).then(() => {
          this.updateBalanceDisplay();
        });
      }
    } else {
      // Reset showdown modal tracking when not in showdown phase
      this.showdownModalShown = false;
    }
  }

  // Handle lobby updates - real-time sync for current lobby
  handleLobbyUpdate(lobby) {
    console.log('📡 Lobby update:', lobby?.id, lobby?.players?.length, 'players');
    
    if (!lobby) {
      console.log('📡 Lobby was deleted or left');
      this.resetLobbyUI();
      // Also refresh the lobbies list in sidebar
      if (this.allLobbies) {
        this.renderLobbiesList(this.allLobbies.filter(l => l.id !== this.lobbyManager?.currentLobbyId));
      }
      return;
    }

    const isHost = lobby.hostId === this.currentUser?.uid;
    const previousHost = this.isHost;

    // Update buy-in display to match lobby's buy-in (real-time sync for all players)
    if (lobby.buyIn) {
      // Always sync to lobby's buy-in
      this.selectedBuyIn = lobby.buyIn;
      
      // Update buy-in buttons to reflect the lobby's buy-in
      this.elements.buyinBtns?.forEach(btn => {
        const amount = parseInt(btn.dataset.amount);
        btn.classList.toggle('active', amount === lobby.buyIn);
      });
      
      // Clear custom input if a preset is active
      if (this.elements.buyinInput) {
        const isPreset = [10, 25, 50, 100].includes(lobby.buyIn);
        this.elements.buyinInput.value = isPreset ? '' : lobby.buyIn;
      }
      
      // Update buy-in display for non-host players
      if (this.elements.buyinDisplay && this.elements.buyinValue) {
        this.elements.buyinDisplay.style.display = !isHost ? 'flex' : 'none';
        this.elements.buyinValue.textContent = `$${lobby.buyIn}`;
      }
      
      // Hide set button since we're synced
      if (this.elements.setBuyInBtn) {
        this.elements.setBuyInBtn.style.display = 'none';
      }
    }
    
    // Disable buy-in selection if not host (can't change lobby's buy-in)
    this.elements.buyinBtns?.forEach(btn => {
      btn.disabled = !isHost;
      btn.style.pointerEvents = isHost ? 'auto' : 'none';
      btn.style.opacity = isHost ? '1' : '0.7';
    });
    if (this.elements.buyinInput) {
      this.elements.buyinInput.disabled = !isHost;
      this.elements.buyinInput.style.opacity = isHost ? '1' : '0.7';
    }

    // Update player slots
    this.updatePlayerSlots(lobby.players);

    // Update ready count
    const readyCount = lobby.players.filter(p => p.isReady).length;
    const playerCount = lobby.players.length;
    const allReady = readyCount === playerCount;
    const canStart = allReady && playerCount >= 2;
    
    if (this.elements.readyCount) {
      this.elements.readyCount.textContent = `${readyCount}/${playerCount} Players Ready`;
    }

    // Update waiting text
    if (this.elements.waitingText) {
      if (playerCount < 2) {
        this.elements.waitingText.textContent = 'Waiting for more players...';
      } else if (!allReady) {
        this.elements.waitingText.textContent = 'Waiting for all players to ready up...';
      } else {
        this.elements.waitingText.textContent = 'All players ready! Starting game...';
      }
    }

    // Update ready button state
    const myPlayer = lobby.players.find(p => p.id === this.currentUser?.uid);
    if (myPlayer && this.elements.readyBtn) {
      this.elements.readyBtn.classList.toggle('ready', myPlayer.isReady);
      this.elements.readyBtn.innerHTML = myPlayer.isReady ? `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Ready!
      ` : `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Ready Up
      `;
    }

    // Check if game started
    if (lobby.status === LOBBY_STATUS.IN_GAME) {
      // Mark as in game and update UI
      const wasInGame = this.isInGame;
      
      // Hide config panel, show game UI
      if (this.elements.partyConfig) {
        this.elements.partyConfig.style.display = 'none';
      }
      
      // Initialize game from lobby state for ALL players (host and non-host)
      if (lobby.gameState) {
        // Deduct buy-in for non-host players ONLY when we receive actual game state
        // This ensures we don't deduct if the game never starts properly
        if (!this.isInGame && !isHost && !this.buyInDeducted) {
          this.buyInDeducted = true; // Prevent double deduction
          const buyIn = lobby.buyIn;
          CasinoDB.updateBalance(-buyIn).then(result => {
            if (result !== null) {
              this.updateBalanceDisplay();
              this.showToast(`$${buyIn} buy-in deducted. Good luck!`, 'success');
            } else {
              this.buyInDeducted = false; // Reset flag on failure
            }
          }).catch(() => {
            this.buyInDeducted = false;
          });
        }
        
        this.isInGame = true;
        document.body.classList.add('game-started');
        
        // Check for new hand starting (phase changed to PRE_FLOP) - hide showdown modal
        if (lobby.gameState.phase === GAME_PHASES.PRE_FLOP && this.lastPhase !== GAME_PHASES.PRE_FLOP) {
          console.log('🎲 New hand detected in lobby update, hiding showdown modal');
          this.resetCardAnimationState();
          this.hideShowdownModal();
          this.showdownModalShown = false;
        }
        
        // Track phase changes
        this.lastPhase = lobby.gameState.phase;
        
        // Deserialize full game state (with all cards)
        this.game = PokerGame.deserialize(lobby.gameState);
        // Update UI with filtered view (hide other players' cards)
        const displayState = this.game.serialize(this.currentUser?.uid);
        this.updateGameUI(displayState);
        
        // Log for debugging
        if (!wasInGame) {
          console.log('🎮 Game initialized from lobby update, phase:', lobby.gameState.phase);
        }
        
        // Check for play again votes and update UI
        const votes = lobby.playAgainVotes || [];
        const totalPlayers = lobby.players?.length || 0;
        
        // Update vote display if showdown modal is visible
        if (this.elements.showdownModal?.classList.contains('active')) {
          this.updatePlayAgainVotes(votes, totalPlayers);
        }
        
        // If all players voted and host, start new hand (only once)
        if (this.isHost && votes.length >= totalPlayers && totalPlayers >= 2 && !this._startingNewHand) {
          console.log('🎉 All players voted! Starting new hand...');
          this._startingNewHand = true; // Prevent duplicate calls
          // Small delay to ensure all clients see the votes
          setTimeout(() => {
            this.startNewHand();
            // Reset flag after a longer delay to allow state to propagate
            setTimeout(() => { this._startingNewHand = false; }, 2000);
          }, 500);
        }
      } else if (!wasInGame) {
        // Game just started but no gameState yet - show waiting message
        console.log('⏳ Waiting for game state from host...');
        // Show a loading indicator for non-host players
        if (!isHost && this.elements.waitingText) {
          this.elements.waitingText.textContent = 'Game starting, please wait...';
        }
      }
    } else {
      // Not in game - reset state and show lobby UI
      if (this.isInGame) {
        console.log('🔄 Game ended, returning to lobby');
        this.isInGame = false;
        this.gameState = null;
        this.buyInDeducted = false; // Reset for next game
        
        // Hide game UI elements
        this.elements.pokerActions?.classList.remove('visible');
        this.elements.tableContainer?.classList.add('hidden');
        
        // Hide showdown modal if visible
        this.hideShowdownModal();
      }
      
      // Show config panel when not in game
      if (this.elements.partyConfig) {
        this.elements.partyConfig.style.display = 'flex';
        this.elements.partyConfig.classList.add('visible');
      }
      document.body.classList.remove('game-started');
    }

    // Update host status
    this.isHost = isHost;

    // Show/hide Start Game button (host only, 2+ players)
    if (this.elements.startGameBtn) {
      const showStartBtn = this.isHost && playerCount >= 2;
      this.elements.startGameBtn.style.display = showStartBtn ? 'flex' : 'none';
    }
    
    // Real-time refresh: Update the sidebar lobbies list with current lobby data
    // This ensures your lobby section in sidebar stays in sync
    this.refreshSidebarWithLobby(lobby);
  }
  
  // Refresh sidebar to reflect current lobby state
  refreshSidebarWithLobby(currentLobby) {
    if (!this.allLobbies) return;
    
    // Update or add current lobby in the lobbies list
    const lobbyIndex = this.allLobbies.findIndex(l => l.id === currentLobby.id);
    if (lobbyIndex >= 0) {
      this.allLobbies[lobbyIndex] = currentLobby;
    } else {
      this.allLobbies.unshift(currentLobby);
    }
    
    // Re-render lobbies list
    this.renderLobbiesList(this.allLobbies);
  }

  // Handle Start Game button click (host only)
  async handleStartGame() {
    if (!this.lobbyManager || !this.isHost) {
      console.log('Not host or no lobby manager');
      return;
    }

    // Prevent double-clicks
    if (this.isStartingGame) {
      console.log('Game start already in progress');
      return;
    }
    this.isStartingGame = true;

    // Disable button during start
    if (this.elements.startGameBtn) {
      this.elements.startGameBtn.disabled = true;
      this.elements.startGameBtn.textContent = 'Starting...';
    }

    try {
      console.log('🎮 Host starting game...');
      
      // First update status to IN_GAME
      const result = await this.lobbyManager.startGameByHost();
      
      if (!result.success) {
        this.showToast(result.error || 'Failed to start game', 'error');
        return;
      }

      // Now create the game and sync state (host only)
      await this.startGame();
      
    } catch (error) {
      console.error('Error starting game:', error);
      this.showToast('Failed to start game', 'error');
    } finally {
      this.isStartingGame = false;
      if (this.elements.startGameBtn) {
        this.elements.startGameBtn.disabled = false;
        this.elements.startGameBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Start Game
        `;
      }
    }
  }

  // Show Set Buy-In button if host has changed buy-in locally
  showSetBuyInButton() {
    if (!this.isHost || !this.lobbyManager?.currentLobby) return;
    
    const currentLobbyBuyIn = this.lobbyManager.currentLobby.buyIn;
    const hasChanged = this.selectedBuyIn !== currentLobbyBuyIn;
    
    if (this.elements.setBuyInBtn) {
      this.elements.setBuyInBtn.style.display = hasChanged ? 'flex' : 'none';
    }
  }

  // Handle Set Buy-In button click (host only - updates Firebase)
  async handleSetBuyIn() {
    if (!this.lobbyManager || !this.isHost) {
      console.log('Not host or no lobby manager');
      return;
    }

    if (this.selectedBuyIn < 10) {
      this.showToast('Minimum buy-in is $10', 'error');
      return;
    }

    console.log('💰 Host setting buy-in to $' + this.selectedBuyIn);
    const result = await this.lobbyManager.updateBuyIn(this.selectedBuyIn);
    
    if (result.success) {
      this.showToast(`Buy-in set to $${this.selectedBuyIn}`, 'success');
      if (this.elements.setBuyInBtn) {
        this.elements.setBuyInBtn.style.display = 'none';
      }
    } else {
      this.showToast(result.error || 'Failed to update buy-in', 'error');
    }
  }

  // Handle lobbies list update - called in real-time when any lobby changes
  handleLobbiesUpdate(lobbies) {
    console.log('📡 Lobbies update:', lobbies.length, 'lobbies');
    
    // Store for reference
    this.allLobbies = lobbies;
    
    // Render with animation class for smooth updates
    this.renderLobbiesList(lobbies);
    
    // Update lobby count in UI if we have an element for it
    const lobbyCountEl = document.querySelector('.lobby-count');
    if (lobbyCountEl) {
      lobbyCountEl.textContent = `${lobbies.length} Active`;
    }
  }

  // Handle join request
  handleJoinRequest(request) {
    console.log('Join request:', request);
    this.showJoinNotification(request);
  }

  // Handle online players update - render the online players list in real-time
  handleOnlinePlayersUpdate(players) {
    console.log('📡 Online players update:', players.length);
    
    // Store for reference
    this.onlinePlayers = players;
    
    // Update count (+1 for self)
    if (this.elements.onlineCount) {
      this.elements.onlineCount.textContent = `${players.length + 1} Online`;
    }
    
    // Update the online players section in sidebar
    this.renderOnlinePlayersList(players);
  }
  
  // Render online players in sidebar
  renderOnlinePlayersList(players) {
    // Find or create the online players container
    let onlineSection = document.querySelector('.online-players-section');
    
    if (!onlineSection) {
      // Create section if it doesn't exist (insert before lobbies)
      onlineSection = document.createElement('div');
      onlineSection.className = 'online-players-section';
      
      // Insert at the top of the sidebar content
      const sidebarContent = this.elements.sidebar?.querySelector('.sidebar-content') || this.elements.playersList?.parentElement;
      if (sidebarContent && this.elements.playersList) {
        sidebarContent.insertBefore(onlineSection, this.elements.playersList);
      }
    }
    
    if (!onlineSection) return;
    
    // Filter players not in any lobby (available to invite)
    const availablePlayers = players.filter(p => !p.lobbyId && p.id !== this.currentUser?.uid);
    const inLobbyPlayers = players.filter(p => p.lobbyId && p.id !== this.currentUser?.uid);
    
    onlineSection.innerHTML = `
      <div class="section-header">
        <span class="section-title">🟢 Online Players</span>
        <span class="section-count">${players.length}</span>
      </div>
      <div class="online-players-list">
        ${players.length === 0 ? `
          <div class="no-players-msg">No other players online</div>
        ` : players.map(p => `
          <div class="online-player-item ${p.lobbyId ? 'in-lobby' : 'available'}" data-player-id="${p.id}">
            <div class="player-avatar-small">
              <img src="${p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`}" alt="">
              <span class="online-dot"></span>
            </div>
            <div class="player-info-col">
              <span class="player-name-small">${p.displayName || 'Player'}</span>
              <span class="player-status-small">${p.lobbyId ? 'In Lobby' : 'Available'}</span>
            </div>
            ${!p.lobbyId && this.lobbyManager?.currentLobbyId ? `
              <button class="invite-btn" data-player-id="${p.id}" title="Invite to lobby">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
    
    // Add invite button handlers
    onlineSection.querySelectorAll('.invite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const playerId = btn.dataset.playerId;
        this.invitePlayer(playerId);
      });
    });
  }
  
  // Invite a player to current lobby
  async invitePlayer(playerId) {
    if (!this.lobbyManager?.currentLobbyId) {
      this.showToast('You must be in a lobby to invite players', 'error');
      return;
    }
    
    // For now, show a toast - full invite system would need more Firebase work
    const player = this.onlinePlayers?.find(p => p.id === playerId);
    this.showToast(`Invite sent to ${player?.displayName || 'player'}!`, 'success');
    
    // TODO: Implement actual invite system via Firebase
    // await this.lobbyManager.sendInvite(playerId);
  }

  // ========================================
  // UI UPDATES
  // ========================================

  updateBalanceDisplay() {
    if (this.elements.userBalance) {
      this.elements.userBalance.textContent = '$' + CasinoAuth.getBalance().toFixed(2);
    }
    if (this.elements.userKeys) {
      this.elements.userKeys.innerHTML = `<img src="/bp/EE/assets/ouths/key.png" alt="" class="key-icon"> ${CasinoAuth.getKeys()}`;
    }
    if (this.elements.userXPs) {
      this.elements.userXPs.textContent = '⚡ ' + (CasinoAuth.getXPs ? CasinoAuth.getXPs() : 0);
    }
  }

  updateUIState() {
    const isSignedIn = CasinoAuth.isSignedIn();

    if (this.elements.signInBtn) {
      this.elements.signInBtn.style.display = isSignedIn ? 'none' : 'flex';
    }
    if (this.elements.userInfo) {
      this.elements.userInfo.style.display = isSignedIn ? 'flex' : 'none';
      if (this.elements.userName && CasinoAuth.currentUser) {
        this.elements.userName.textContent = CasinoAuth.currentUser.displayName || 'Player';
      }
    }

    // Update your slot with real user photo
    if (CasinoAuth.currentUser) {
      if (this.elements.yourAvatar) {
        this.elements.yourAvatar.src = CasinoAuth.currentUser.photoURL || 
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${CasinoAuth.currentUser.uid}`;
      }
      if (this.elements.yourName) {
        this.elements.yourName.textContent = CasinoAuth.currentUser.displayName?.split(' ')[0] || 'You';
      }
    }
  }

  // Visual seat positions on the table (data-seat values in HTML)
  // Position 4 = bottom-left (always current user)
  // Position 5 = bottom-right
  // Position 0 = left
  // Position 3 = right  
  // Position 1 = top-left
  // Position 2 = top-right
  
  // Maps a player's position in the sorted player list to a visual seat
  // This ensures all players see themselves at the bottom and others in consistent relative positions
  getVisualSeatForIndex(playerIndex, totalPlayers) {
    // Map index to visual seats based on player count
    // Index 0 is always the current user at visual seat 4 (bottom-left)
    // Other players fill remaining seats in a consistent order
    
    // Priority: 4 (me), 5 (bottom-right), 0 (left), 3 (right), 1 (top-left), 2 (top-right)
    const visualMapping = {
      1: [4],               // 1 player: just me
      2: [4, 5],            // 2 players: me at 4, other at 5
      3: [4, 5, 0],         // 3 players: me, bottom-right, left
      4: [4, 5, 0, 3],      // 4 players: me, bottom-right, left, right
      5: [4, 5, 0, 3, 1],   // 5 players
      6: [4, 5, 0, 3, 1, 2] // 6 players
    };
    
    const mapping = visualMapping[totalPlayers] || visualMapping[6];
    return mapping[playerIndex] !== undefined ? mapping[playerIndex] : -1;
  }

  // Update player slots from lobby data (or game state)
  updatePlayerSlots(players) {
    // Find current user in players
    const myPlayer = players.find(p => p.id === this.currentUser?.uid);
    
    // Sort players by seatIndex to get consistent ordering
    const sortedPlayers = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
    
    // Find my position in the sorted list
    const myIndexInList = sortedPlayers.findIndex(p => p.id === this.currentUser?.uid);
    
    // Reorder players so current user is first (index 0)
    // This makes the visual mapping relative to current user
    const reorderedPlayers = [];
    if (myIndexInList !== -1) {
      for (let i = 0; i < sortedPlayers.length; i++) {
        const idx = (myIndexInList + i) % sortedPlayers.length;
        reorderedPlayers.push(sortedPlayers[idx]);
      }
    } else {
      // Current user not in players list (shouldn't happen during game)
      reorderedPlayers.push(...sortedPlayers);
    }
    
    const totalPlayers = reorderedPlayers.length;
    
    // Update current user's chip display
    if (myPlayer && this.elements.yourChipsAmount) {
      const chips = myPlayer.chips !== undefined ? myPlayer.chips : (this.lobbyManager?.currentLobby?.buyIn || 0);
      this.elements.yourChipsAmount.textContent = `$${chips}`;
    }
    
    // Create a map of visual seat -> player
    const visualSeatMap = {};
    reorderedPlayers.forEach((p, index) => {
      if (p.id === this.currentUser?.uid) return; // Skip current user (handled separately by yourSlot)
      const visualSeat = this.getVisualSeatForIndex(index, totalPlayers);
      if (visualSeat !== -1 && visualSeat !== 4) {
        visualSeatMap[visualSeat] = p;
      }
    });
    
    // Update all slots
    this.elements.playerSlots.forEach((slot) => {
      if (slot.id === 'yourSlot') return; // Skip your slot (bottom-left, seat 4)
      
      const visualSeat = parseInt(slot.dataset.seat);
      const player = visualSeatMap[visualSeat] || null;
      
      if (player) {
        slot.classList.remove('empty', 'hidden-slot');
        slot.classList.add('filled');
        
        // Store the player's actual game seat index for reference
        slot.dataset.playerSeatIndex = player.seatIndex;
        slot.dataset.playerId = player.id;
        
        // Use real photoURL if available, fallback to Dicebear
        const avatarUrl = player.photoURL || 
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.id}`;
        
        // Get chips - use game chips if in game, otherwise use buy-in
        const chips = player.chips !== undefined ? player.chips : (this.lobbyManager?.currentLobby?.buyIn || 0);
        
        // Show folded state
        const isFolded = player.isFolded || false;
        const isCurrentTurn = player.isCurrentTurn || false;
        
        slot.classList.toggle('folded', isFolded);
        slot.classList.toggle('current-turn', isCurrentTurn);
        
        // Generate chip stack HTML for this player
        const chipStackHTML = this.isInGame ? createChipStackHTML(chips) : '';
        
        slot.innerHTML = `
          <div class="slot-avatar">
            <img src="${avatarUrl}" alt="">
          </div>
          <span class="slot-name">${player.displayName}</span>
          <span class="slot-chips">$${chips}</span>
          <div class="player-chip-stack ${chipStackHTML ? 'has-chips' : ''}">${chipStackHTML}</div>
          ${!this.isInGame && player.isReady ? '<span class="ready-indicator">✓</span>' : ''}
          ${isCurrentTurn ? '<span class="turn-indicator">⏱</span>' : ''}
        `;
      } else {
        slot.classList.add('empty');
        slot.classList.remove('filled');
        
        // During game, hide empty slots completely or show as minimal circle
        if (this.isInGame) {
          slot.classList.add('hidden-slot');
          slot.innerHTML = `<div class="slot-avatar minimal"></div>`;
        } else {
          slot.classList.remove('hidden-slot');
          slot.innerHTML = `
            <div class="slot-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <span class="slot-name">Empty</span>
          `;
        }
      }
    });
  }

  // Render lobbies in sidebar - optimized for real-time updates
  renderLobbiesList(lobbies) {
    if (!this.elements.playersList) return;
    
    // Store timestamp to detect stale renders
    const renderTime = Date.now();
    this._lastLobbyRender = renderTime;

    // IMPORTANT: Clear the list first to prevent duplication
    this.elements.playersList.innerHTML = '';

    // Find your own lobby if you're in one
    const myLobby = lobbies.find(lobby => 
      lobby.hostId === this.currentUser?.uid || 
      lobby.players?.some(p => p.id === this.currentUser?.uid)
    );
    
    // Build all HTML first, then update DOM once (more efficient)
    const fragments = [];

    // Render your lobby first if you have one
    if (myLobby) {
      const isInGame = myLobby.status === LOBBY_STATUS.IN_GAME;
      const myLobbyPlayers = myLobby.players || [];
      const gamePhase = myLobby.gamePhase;
      const currentPlayerIdx = myLobby.currentPlayerIndex;
      const gameStatePlayers = myLobby.gameState?.players || [];
      
      // Create a map of game state player data by id for quick lookup
      const gameStatePlayerMap = {};
      gameStatePlayers.forEach(p => {
        if (p) gameStatePlayerMap[p.id] = p;
      });
      
      // Get phase display text
      const getPhaseText = (phase) => {
        const phases = {
          'waiting': 'Waiting',
          'ready_check': 'Ready Check',
          'pre_flop': 'Pre-Flop',
          'flop': 'Flop',
          'turn': 'Turn',
          'river': 'River',
          'showdown': 'Showdown',
          'ended': 'Hand Ended'
        };
        return phases[phase] || phase || '';
      };
      
      const myLobbyEl = document.createElement('div');
      myLobbyEl.className = `player-lobby your-lobby ${isInGame ? 'in-game' : ''}`;
      myLobbyEl.dataset.lobbyId = myLobby.id;
      myLobbyEl.innerHTML = `
        <div class="lobby-status">
          <span class="status-dot ${isInGame ? 'playing' : 'your'}"></span>
          <span class="status-text">${isInGame ? 'In Game' : 'Your Lobby'}</span>
          ${isInGame && gamePhase ? `<span class="game-phase-tag">${getPhaseText(gamePhase)}</span>` : ''}
        </div>
        ${isInGame && myLobby.pot ? `<div class="lobby-pot">Pot: $${myLobby.pot}</div>` : ''}
        <div class="lobby-players-detail">
          ${myLobbyPlayers.map((p, idx) => {
            // Get game state data for this player if in game
            const gamePlayer = gameStatePlayerMap[p.id];
            const isPlaying = isInGame && !p.waitingForNextHand;
            const isWaiting = isInGame && p.waitingForNextHand;
            const isYou = p.id === this.currentUser?.uid;
            const isCurrentTurn = isInGame && gamePlayer?.seatIndex === currentPlayerIdx;
            // Get folded status from game state if in game
            const isFolded = isInGame && gamePlayer ? (gamePlayer.isFolded || false) : false;
            return `
            <div class="player-row ${isPlaying ? 'in-game' : ''} ${isWaiting ? 'waiting' : ''} ${p.isReady ? 'ready' : ''} ${isYou ? 'you' : ''} ${isCurrentTurn ? 'current-turn' : ''} ${isFolded ? 'folded' : ''}">
              <div class="player-avatar-small">
                <img src="${p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`}" alt="">
                ${isCurrentTurn ? '<span class="turn-indicator-dot"></span>' : ''}
                ${isPlaying && !isFolded ? '<span class="playing-indicator"></span>' : ''}
              </div>
              <span class="player-name-small">${isYou ? 'You' : (p.displayName || 'Player')}</span>
              ${isFolded ? '<span class="player-status-tag folded">Folded</span>' :
                isCurrentTurn ? '<span class="player-status-tag turn">Their Turn</span>' :
                isPlaying ? '<span class="player-status-tag">Playing</span>' : 
                isWaiting ? '<span class="player-status-tag waiting">Waiting</span>' :
                p.isReady ? '<span class="player-status-tag ready">Ready</span>' : ''}
            </div>
          `}).join('')}
          ${myLobbyPlayers.length < myLobby.maxPlayers ? `
            <div class="player-row empty-slot">
              <div class="player-avatar-small empty">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
              <span class="player-name-small">Open Slot</span>
            </div>
          ` : ''}
        </div>
        <div class="lobby-info">
          <span class="lobby-owner">${myLobbyPlayers.length}/${myLobby.maxPlayers} Players</span>
          <span class="lobby-game">$${myLobby.buyIn} Buy-in</span>
        </div>
        <button class="leave-lobby-btn">Leave</button>
      `;
      
      // Add leave handler with debouncing
      const leaveBtn = myLobbyEl.querySelector('.leave-lobby-btn');
      leaveBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        if (this.isLeaving) return;
        
        // If in game, use the game leave handler
        if (this.isInGame) {
          this.handleLeaveGame();
        } else {
          // Just leaving lobby (not in game)
          this.isLeaving = true;
          leaveBtn.disabled = true;
          leaveBtn.textContent = 'Leaving...';
          
          try {
            await this.leaveLobby();
            this.showToast('Left the lobby');
          } catch (error) {
            console.error('Error leaving:', error);
          } finally {
            this.isLeaving = false;
          }
        }
      });
      
      this.elements.playersList.appendChild(myLobbyEl);
    }

    // Filter out your own lobby and lobbies you're already in
    const filteredLobbies = lobbies.filter(lobby => {
      // Skip if you're the host
      if (lobby.hostId === this.currentUser?.uid) return false;
      // Skip if you're already a player in this lobby
      if (lobby.players?.some(p => p.id === this.currentUser?.uid)) return false;
      return true;
    });

    // Show message if no other lobbies
    if (filteredLobbies.length === 0 && !myLobby) {
      this.elements.playersList.innerHTML = `
        <div class="no-lobbies">
          <p>No active lobbies</p>
          <p class="hint">Click "Ready Up" to create one!</p>
        </div>
      `;
      return;
    }

    // Add a separator if we have both your lobby and other lobbies
    if (myLobby && filteredLobbies.length > 0) {
      const separator = document.createElement('div');
      separator.className = 'lobby-separator';
      separator.innerHTML = '<span>Other Lobbies</span>';
      this.elements.playersList.appendChild(separator);
    }

    filteredLobbies.forEach(lobby => {
      const lobbyEl = document.createElement('div');
      lobbyEl.className = 'player-lobby';
      lobbyEl.dataset.lobbyId = lobby.id;

      // Ensure players array exists
      const lobbyPlayers = lobby.players || [];
      const gamePhase = lobby.gamePhase;
      const currentPlayerIdx = lobby.currentPlayerIndex;
      const gameStatePlayers = lobby.gameState?.players || [];
      
      // Create a map of game state player data by id for quick lookup
      const gameStatePlayerMap = {};
      gameStatePlayers.forEach(p => {
        if (p) gameStatePlayerMap[p.id] = p;
      });

      // Get phase display text
      const getPhaseText = (phase) => {
        const phases = {
          'waiting': 'Waiting',
          'ready_check': 'Ready Check',
          'pre_flop': 'Pre-Flop',
          'flop': 'Flop',
          'turn': 'Turn',
          'river': 'River',
          'showdown': 'Showdown',
          'ended': 'Hand Ended'
        };
        return phases[phase] || phase || '';
      };

      // Determine status class
      const isInGame = lobby.status === LOBBY_STATUS.IN_GAME;
      const isFull = lobbyPlayers.length >= lobby.maxPlayers;
      const statusClass = isInGame ? 'in-game' : isFull ? 'full' : 'open';
      
      // Can join if not full (even if in-game, they can wait for next hand)
      const canJoin = !isFull;

      lobbyEl.className = `player-lobby ${statusClass}`;
      lobbyEl.innerHTML = `
        <div class="lobby-status">
          <span class="status-dot ${statusClass === 'in-game' ? 'playing' : statusClass}"></span>
          <span class="status-text">${
            statusClass === 'in-game' ? 'In Game' : 
            statusClass === 'full' ? 'Full' : 'Open Lobby'
          }</span>
          ${isInGame && gamePhase ? `<span class="game-phase-tag">${getPhaseText(gamePhase)}</span>` : ''}
        </div>
        ${isInGame && lobby.pot ? `<div class="lobby-pot">Pot: $${lobby.pot}</div>` : ''}
        <div class="lobby-players-detail">
          ${lobbyPlayers.map((p, idx) => {
            // Get game state data for this player if in game
            const gamePlayer = gameStatePlayerMap[p.id];
            const isPlaying = isInGame && !p.waitingForNextHand;
            const isWaiting = isInGame && p.waitingForNextHand;
            const isCurrentTurn = isInGame && gamePlayer?.seatIndex === currentPlayerIdx;
            // Get folded status from game state if in game
            const isFolded = isInGame && gamePlayer ? (gamePlayer.isFolded || false) : false;
            return `
            <div class="player-row ${isPlaying ? 'in-game' : ''} ${isWaiting ? 'waiting' : ''} ${p.isReady ? 'ready' : ''} ${isCurrentTurn ? 'current-turn' : ''} ${isFolded ? 'folded' : ''}">
              <div class="player-avatar-small">
                <img src="${p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`}" alt="">
                ${isCurrentTurn ? '<span class="turn-indicator-dot"></span>' : ''}
                ${isPlaying && !isFolded ? '<span class="playing-indicator"></span>' : ''}
              </div>
              <span class="player-name-small">${p.displayName || 'Player'}</span>
              ${isFolded ? '<span class="player-status-tag folded">Folded</span>' :
                isCurrentTurn ? '<span class="player-status-tag turn">Turn</span>' :
                isPlaying ? '<span class="player-status-tag">Playing</span>' : 
                isWaiting ? '<span class="player-status-tag waiting">Waiting</span>' :
                p.isReady ? '<span class="player-status-tag ready">Ready</span>' : ''}
            </div>
          `}).join('')}
          ${lobbyPlayers.length < lobby.maxPlayers ? `
            <div class="player-row empty-slot">
              <div class="player-avatar-small empty">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
              <span class="player-name-small">Open Slot</span>
            </div>
          ` : ''}
        </div>
        <div class="lobby-info">
          <span class="lobby-owner">${lobby.hostName}'s Party</span>
          <span class="lobby-game">$${lobby.buyIn} Buy-in • ${lobbyPlayers.length}/${lobby.maxPlayers}</span>
        </div>
        <button class="ask-join-btn" ${!canJoin ? 'disabled' : ''}>
          ${!canJoin ? 'Full' : isInGame ? 'Join (Wait for Next Hand)' : 'Join'}
        </button>
      `;

      // Add click handler
      const joinBtn = lobbyEl.querySelector('.ask-join-btn');
      if (joinBtn && canJoin) {
        joinBtn.addEventListener('click', () => this.requestJoinLobby(lobby.id));
      }

      this.elements.playersList.appendChild(lobbyEl);
    });
  }

  // Show join notification
  showJoinNotification(request) {
    if (!this.elements.joinNotifications) return;

    const avatarUrl = request.requesterPhotoURL || 
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.requesterId}`;

    const notification = document.createElement('div');
    notification.className = 'join-notification';
    notification.dataset.requestId = request.id;
    notification.innerHTML = `
      <div class="notif-timer">
        <div class="notif-timer-bar"></div>
      </div>
      <div class="notif-content">
        <div class="notif-avatar">
          <img src="${avatarUrl}" alt="">
        </div>
        <div class="notif-info">
          <span class="notif-player">${request.requesterName}</span>
          <span class="notif-message">wants to join your party</span>
        </div>
      </div>
      <div class="notif-actions">
        <button class="notif-btn accept">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
        <button class="notif-btn reject">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;

    // Add handlers
    notification.querySelector('.notif-btn.accept').addEventListener('click', () => {
      this.handleJoinRequestAction(request.id, true);
      this.removeNotification(notification);
    });

    notification.querySelector('.notif-btn.reject').addEventListener('click', () => {
      this.handleJoinRequestAction(request.id, false);
      this.removeNotification(notification);
    });

    this.elements.joinNotifications.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => notification.classList.add('show'));

    // Auto-remove after 30s
    setTimeout(() => this.removeNotification(notification), 30000);
  }

  removeNotification(notification) {
    notification.classList.remove('show');
    notification.classList.add('hide');
    setTimeout(() => notification.remove(), 300);
  }

  resetLobbyUI() {
    console.log('🔄 Resetting lobby UI');
    
    // Reset game state
    this.isInGame = false;
    this.isHost = false;
    this.game = null;
    
    // Reset player slots to empty
    this.elements.playerSlots.forEach((slot, index) => {
      if (slot.id === 'yourSlot') return;
      
      slot.classList.add('empty');
      slot.classList.remove('filled', 'folded', 'current-turn', 'hidden-slot');
      slot.innerHTML = `
        <div class="slot-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
        <span class="slot-name">Empty</span>
      `;
    });

    // Reset ready count
    if (this.elements.readyCount) {
      this.elements.readyCount.textContent = '0/1 Players Ready';
    }
    
    // Reset ready button
    if (this.elements.readyBtn) {
      this.elements.readyBtn.classList.remove('ready');
      this.elements.readyBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Ready Up
      `;
    }
    
    // Show config panel
    if (this.elements.partyConfig) {
      this.elements.partyConfig.style.display = 'flex';
    }
    
    // Remove game-started class
    document.body.classList.remove('game-started');
    
    // Hide game elements
    this.elements.pokerActions?.classList.remove('visible');
    this.hideShowdownModal();
    
    // Refresh sidebar
    if (this.allLobbies) {
      this.renderLobbiesList(this.allLobbies);
    }
  }

  // ========================================
  // GAME UI
  // ========================================

  updateGameUI(gameState) {
    if (!gameState) return;

    // Show/hide game UI
    document.body.classList.add('game-started');

    // Check if phase changed (for pushing chips to pot)
    const phaseChanged = this.lastPhase && this.lastPhase !== gameState.phase;
    const isNewRound = phaseChanged && 
      ['flop', 'turn', 'river', 'showdown'].includes(gameState.phase);
    
    // If new betting round, animate chips to pot then clear
    if (isNewRound) {
      this.animateChipsToPot();
    }
    
    this.lastPhase = gameState.phase;

    // Update pot with chips
    this.updatePotDisplay(gameState.pot);

    // Update community cards
    this.updateCommunityCards(gameState.communityCards);

    // Get all active players from game state
    const activePlayers = gameState.players.filter(p => p !== null);
    
    // Update player slots with proper positioning
    this.updatePlayerSlots(activePlayers);
    
    // Update player bets on the table
    this.updateTableBets(activePlayers);
    
    // Update current user's cards if they have hole cards
    const myPlayer = activePlayers.find(p => p.id === this.currentUser?.uid);
    if (myPlayer && myPlayer.holeCards && myPlayer.holeCards.length > 0) {
      this.updateHoleCards(myPlayer.holeCards);
      // Also update current user's slot for fold/turn status
      if (this.elements.yourSlot) {
        this.elements.yourSlot.classList.toggle('folded', myPlayer.isFolded || false);
        this.elements.yourSlot.classList.toggle('current-turn', myPlayer.isCurrentTurn || false);
        
        // Update your chip stack
        this.updatePlayerChipStack(this.elements.yourSlot, myPlayer.chips);
      }
    }
    
    // Update call amount display
    if (this.elements.callAmount && myPlayer) {
      const toCall = gameState.currentBet - (myPlayer.currentBet || 0);
      this.elements.callAmount.textContent = this.formatMoney(Math.max(0, toCall));
      if (this.elements.callAmountDisplay) {
        this.elements.callAmountDisplay.style.display = toCall > 0 ? 'flex' : 'none';
      }
    }

    // Update current player turn and show/hide actions
    if (gameState.phase !== GAME_PHASES.WAITING && gameState.phase !== GAME_PHASES.ENDED) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer && currentPlayer.id === this.currentUser?.uid) {
        this.showActionsPanel(gameState);
      } else {
        this.hideActionsPanel();
      }
    } else if (gameState.phase === GAME_PHASES.SHOWDOWN) {
      // During showdown, hide actions and show winner info
      this.hideActionsPanel();
    } else {
      this.hideActionsPanel();
    }
  }

  updateCommunityCards(cards) {
    if (!this.elements.communityCards) return;

    const cardEls = this.elements.communityCards.querySelectorAll('.community-card');
    const previousCardCount = this.lastCommunityCardCount || 0;
    
    cards.forEach((card, index) => {
      if (cardEls[index]) {
        const cardObj = Card.deserialize(card);
        cardEls[index].className = `community-card ${cardObj.color}`;
        cardEls[index].innerHTML = `
          <span class="card-value">${cardObj.display}</span>
          <span class="card-suit ${cardObj.suit}">${cardObj.symbol}</span>
        `;
        
        // Add dealing animation for new cards only
        if (index >= previousCardCount) {
          cardEls[index].classList.add('dealing');
          cardEls[index].style.animationDelay = `${(index - previousCardCount) * 0.15}s`;
          
          // Remove animation class after it completes
          setTimeout(() => {
            cardEls[index].classList.remove('dealing');
            cardEls[index].style.animationDelay = '';
          }, 600 + (index - previousCardCount) * 150);
        }
      }
    });

    // Update the tracked count
    this.lastCommunityCardCount = cards.length;

    // Empty remaining slots
    for (let i = cards.length; i < 5; i++) {
      if (cardEls[i]) {
        cardEls[i].className = 'community-card';
        cardEls[i].innerHTML = '';
      }
    }
  }

  // Update pot display with chip stacks
  updatePotDisplay(potAmount) {
    if (this.elements.potAmount) {
      this.elements.potAmount.textContent = this.formatMoney(potAmount);
    }
    
    if (this.elements.potChips) {
      const previousPot = this.lastPotAmount || 0;
      const isNewChips = potAmount > previousPot;
      
      if (potAmount > 0) {
        this.elements.potChips.innerHTML = createChipStackHTML(potAmount);
        this.elements.potChips.classList.add('has-chips');
        
        // Add chip animation when pot increases
        if (isNewChips) {
          const chips = this.elements.potChips.querySelectorAll('.poker-chip');
          chips.forEach((chip, i) => {
            chip.classList.add('stacking');
            chip.style.animationDelay = `${i * 0.03}s`;
            setTimeout(() => {
              chip.classList.remove('stacking');
              chip.style.animationDelay = '';
            }, 400 + i * 30);
          });
        }
      } else {
        this.elements.potChips.innerHTML = '';
        this.elements.potChips.classList.remove('has-chips');
      }
      
      this.lastPotAmount = potAmount;
    }
  }

  // Update a player's chip stack display
  updatePlayerChipStack(slotElement, chipAmount) {
    if (!slotElement) return;
    
    const stackEl = slotElement.querySelector('.player-chip-stack');
    if (stackEl) {
      if (chipAmount > 0) {
        stackEl.innerHTML = createChipStackHTML(chipAmount);
        stackEl.classList.add('has-chips');
      } else {
        stackEl.innerHTML = '';
        stackEl.classList.remove('has-chips');
      }
    }
  }

  // Update player bets displayed on the table
  updateTableBets(players) {
    if (!this.elements.tableBets) return;
    
    // Initialize bet tracking if needed
    if (!this.lastPlayerBets) this.lastPlayerBets = {};
    
    // Get the visual seat mapping for players
    const myPlayer = players.find(p => p.id === this.currentUser?.uid);
    const sortedPlayers = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
    const myIndexInList = sortedPlayers.findIndex(p => p.id === this.currentUser?.uid);
    
    // Reorder players so current user is first
    const reorderedPlayers = [];
    if (myIndexInList !== -1) {
      for (let i = 0; i < sortedPlayers.length; i++) {
        const idx = (myIndexInList + i) % sortedPlayers.length;
        reorderedPlayers.push(sortedPlayers[idx]);
      }
    } else {
      reorderedPlayers.push(...sortedPlayers);
    }
    
    const totalPlayers = reorderedPlayers.length;
    
    // Create map of visual seat -> player
    const visualSeatMap = {};
    reorderedPlayers.forEach((p, index) => {
      const visualSeat = this.getVisualSeatForIndex(index, totalPlayers);
      if (visualSeat !== -1) {
        visualSeatMap[visualSeat] = p;
      }
    });
    
    // Update each bet position
    for (let seat = 0; seat < 6; seat++) {
      const betEl = this.elements.tableBets.querySelector(`[data-bet-seat="${seat}"]`);
      if (!betEl) continue;
      
      const player = visualSeatMap[seat];
      const betAmount = player?.currentBet || 0;
      const playerId = player?.id || `seat_${seat}`;
      const previousBet = this.lastPlayerBets[playerId] || 0;
      const isNewBet = betAmount > previousBet;
      
      if (betAmount > 0) {
        betEl.classList.add('has-bet');
        const chipsEl = betEl.querySelector('.bet-chips');
        const amountEl = betEl.querySelector('.bet-amount');
        
        if (chipsEl) {
          chipsEl.innerHTML = createChipStackHTML(betAmount);
          
          // Add chip animation when bet increases
          if (isNewBet) {
            const chips = chipsEl.querySelectorAll('.poker-chip');
            chips.forEach((chip, i) => {
              chip.classList.add('stacking');
              chip.style.animationDelay = `${i * 0.02}s`;
              setTimeout(() => {
                chip.classList.remove('stacking');
                chip.style.animationDelay = '';
              }, 300 + i * 20);
            });
          }
        }
        if (amountEl) {
          amountEl.textContent = this.formatMoney(betAmount);
        }
      } else {
        betEl.classList.remove('has-bet');
        const chipsEl = betEl.querySelector('.bet-chips');
        const amountEl = betEl.querySelector('.bet-amount');
        if (chipsEl) chipsEl.innerHTML = '';
        if (amountEl) amountEl.textContent = '';
      }
      
      // Track this bet amount
      this.lastPlayerBets[playerId] = betAmount;
    }
  }

  // Animate chips moving to the pot
  animateChipsToPot() {
    if (!this.elements.tableBets) return;
    
    const betEls = this.elements.tableBets.querySelectorAll('.player-bet.has-bet');
    
    betEls.forEach(betEl => {
      betEl.classList.add('moving-to-pot');
    });
    
    // After animation, clear the bets
    setTimeout(() => {
      this.clearAllBets();
    }, 600);
  }

  // Clear all bet displays
  clearAllBets() {
    if (!this.elements.tableBets) return;
    
    const betEls = this.elements.tableBets.querySelectorAll('.player-bet');
    betEls.forEach(betEl => {
      betEl.classList.remove('has-bet', 'moving-to-pot');
      const chipsEl = betEl.querySelector('.bet-chips');
      const amountEl = betEl.querySelector('.bet-amount');
      if (chipsEl) chipsEl.innerHTML = '';
      if (amountEl) amountEl.textContent = '';
    });
  }

  updateHoleCards(cards) {
    if (!this.elements.yourCards) return;

    const cardEls = this.elements.yourCards.querySelectorAll('.hand-card');
    const hadCards = this.lastHoleCardCount > 0;
    
    cards.forEach((card, index) => {
      if (cardEls[index]) {
        const cardObj = Card.deserialize(card);
        cardEls[index].className = `hand-card ${cardObj.color}`;
        cardEls[index].innerHTML = `
          <span class="card-value">${cardObj.display}</span>
          <span class="card-suit ${cardObj.suit}">${cardObj.symbol}</span>
        `;
        
        // Add dealing animation for new cards (when cards weren't there before)
        if (!hadCards) {
          cardEls[index].classList.add('dealing');
          cardEls[index].style.animationDelay = `${index * 0.2}s`;
          
          // Remove animation class after it completes
          setTimeout(() => {
            cardEls[index].classList.remove('dealing');
            cardEls[index].style.animationDelay = '';
          }, 600 + index * 200);
        }
      }
    });
    
    this.lastHoleCardCount = cards.length;
  }

  showActionsPanel(gameState) {
    document.body.classList.add('your-turn');
    
    // Update call button
    const toCall = gameState.currentBet - (this.getMyCurrentBet(gameState) || 0);
    if (this.elements.callBtn) {
      this.elements.callBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Call ${this.formatMoney(toCall)}
      `;
      this.elements.callBtn.disabled = toCall <= 0;
    }

    // Show/hide check vs call
    if (this.elements.checkBtn) {
      this.elements.checkBtn.style.display = toCall === 0 ? 'flex' : 'none';
    }
    if (this.elements.callBtn) {
      this.elements.callBtn.style.display = toCall > 0 ? 'flex' : 'none';
    }

    // Start turn timer
    this.startTurnTimer(45);
  }

  hideActionsPanel() {
    document.body.classList.remove('your-turn');
    this.stopTurnTimer();
  }

  getMyCurrentBet(gameState) {
    const myPlayer = gameState.players.find(p => p && p.id === this.currentUser?.uid);
    return myPlayer?.currentBet || 0;
  }

  startTurnTimer(seconds) {
    this.stopTurnTimer();
    
    let remaining = seconds;
    
    if (this.elements.timerText) {
      this.elements.timerText.textContent = `Your Turn - ${remaining}s`;
    }
    
    if (this.elements.timerBar) {
      this.elements.timerBar.style.width = '100%';
      this.elements.timerBar.style.transition = `width ${seconds}s linear`;
      requestAnimationFrame(() => {
        this.elements.timerBar.style.width = '0%';
      });
    }

    this.turnTimerInterval = setInterval(() => {
      remaining--;
      if (this.elements.timerText) {
        this.elements.timerText.textContent = `Your Turn - ${remaining}s`;
      }
      
      if (remaining <= 0) {
        this.stopTurnTimer();
        this.handleAction('fold'); // Auto-fold on timeout
      }
    }, 1000);
  }

  stopTurnTimer() {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = null;
    }
  }

  // ========================================
  // ACTIONS
  // ========================================

  async toggleReady() {
    if (!CasinoAuth.isSignedIn()) {
      alert('Please sign in to play poker');
      return;
    }

    // Validate buy-in amount (minimum $10)
    if (this.selectedBuyIn < 10) {
      this.showToast('Minimum buy-in is $10', 'error');
      return;
    }

    // Check if user has enough balance
    const currentBalance = CasinoAuth.getBalance();
    if (currentBalance < this.selectedBuyIn) {
      this.showToast(`Insufficient balance. You need $${this.selectedBuyIn} but have $${currentBalance.toFixed(2)}`, 'error');
      return;
    }

    // If already in a lobby, just toggle ready state
    if (this.lobbyManager?.currentLobbyId) {
      const myPlayer = this.lobbyManager?.currentLobby?.players.find(
        p => p.id === this.currentUser?.uid
      );
      
      const isCurrentlyReady = myPlayer?.isReady || false;
      
      // Toggle ready state (money is deducted when game starts, not when ready)
      const result = await this.lobbyManager?.setReady(!isCurrentlyReady);
      
      if (result?.success && !isCurrentlyReady) {
        this.showToast('Ready! Waiting for other players...', 'success');
      }
      return;
    }

    // Not in a lobby - create one
    console.log('Not in a lobby, creating one...');
    const result = await this.lobbyManager?.createLobby(this.selectedBuyIn, true);
    
    if (!result?.success) {
      console.error('Failed to create lobby:', result?.error);
      this.showToast(result?.error || 'Failed to create lobby', 'error');
      return;
    }
    
    if (result.restored) {
      // Was already in a lobby, state was restored
      this.showToast('Restored to your existing lobby', 'success');
    } else {
      console.log('Created lobby:', result.lobbyId);
      this.showToast('Lobby created! Click Ready again when others join.', 'success');
    }
  }

  async requestJoinLobby(lobbyId) {
    if (!CasinoAuth.isSignedIn()) {
      alert('Please sign in to join a game');
      return;
    }

    // Ensure lobby manager is initialized
    if (!this.lobbyManager || !this.lobbyManager.isInitialized) {
      console.log('Lobby manager not ready, initializing...');
      await this.initLobbyManager();
    }

    if (!this.lobbyManager || !this.lobbyManager.isInitialized) {
      this.showToast('Lobby system not ready. Please wait...', 'error');
      return;
    }

    // Disable the button temporarily
    const btn = document.querySelector(`[data-lobby-id="${lobbyId}"] .ask-join-btn`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Joining...';
    }

    try {
      // Try direct join first (works for public lobbies)
      console.log('Attempting to join lobby:', lobbyId);
      const joinResult = await this.lobbyManager.joinLobby(lobbyId);
      
      console.log('Join result:', joinResult);
    
      if (joinResult?.success) {
        // Direct join succeeded
        if (btn) {
          btn.textContent = 'Joined!';
          btn.classList.add('joined');
        }
        this.showToast('Joined the lobby!', 'success');
        return;
      }
      
      // If direct join failed with a specific error, show it
      if (joinResult?.error) {
        console.error('Direct join failed:', joinResult.error);
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Join';
        }
        this.showToast(joinResult.error, 'error');
        return;
      }
      
      // If direct join failed without specific error, fall back to request system
      if (btn) {
        btn.textContent = 'Requesting...';
      }
      
      const result = await this.lobbyManager.requestJoinLobby(lobbyId);
      
      if (result?.success) {
        // Show pending state
        if (btn) {
          btn.textContent = 'Request Sent!';
          btn.classList.add('pending');
        }
        this.showToast('Join request sent! Waiting for host approval...');
      } else {
        console.error('Failed to join:', result?.error);
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Join';
        }
        this.showToast(result?.error || 'Failed to join lobby', 'error');
      }
    } catch (error) {
      console.error('Error joining lobby:', error);
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Join';
      }
      this.showToast('Failed to join lobby: ' + error.message, 'error');
    }
  }

  // Show a toast notification
  showToast(message, typeOrDuration = 3000) {
    // Remove existing toast
    const existing = document.querySelector('.poker-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'poker-toast';
    
    // Handle type or duration
    let duration = 3000;
    if (typeof typeOrDuration === 'string') {
      toast.classList.add(`toast-${typeOrDuration}`);
    } else {
      duration = typeOrDuration;
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  async leaveLobby() {
    if (!this.lobbyManager) return { success: false };
    
    try {
      const result = await this.lobbyManager.leaveLobby();
      if (result?.success) {
        this.resetLobbyUI();
        return { success: true };
      } else {
        console.error('Failed to leave lobby:', result?.error);
        return { success: false, error: result?.error };
      }
    } catch (error) {
      console.error('Error in leaveLobby:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle leaving the game mid-game
  async handleLeaveGame() {
    if (!this.isInGame || this.isLeaving) return;
    
    // Confirm leave
    if (!confirm('Are you sure you want to leave the game? You will lose your current bet.')) {
      return;
    }
    
    // Prevent double-clicks
    this.isLeaving = true;
    
    // Disable leave button during process
    if (this.elements.leaveGameBtn) {
      this.elements.leaveGameBtn.disabled = true;
      this.elements.leaveGameBtn.textContent = 'Leaving...';
    }
    
    try {
      // Full reset before leaving
      await this.fullGameReset();
      
      // Leave the current lobby
      await this.leaveLobby();
      
      this.showToast('You left the game');
    } catch (error) {
      console.error('Error leaving game:', error);
      this.showToast('Error leaving game', 'error');
    } finally {
      // Re-enable button and reset flag
      this.isLeaving = false;
      if (this.elements.leaveGameBtn) {
        this.elements.leaveGameBtn.disabled = false;
        this.elements.leaveGameBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Leave Game
        `;
      }
    }
  }
  
  // Full game state reset
  async fullGameReset() {
    // Stop any running timers
    this.stopTurnTimer();
    
    // Reset game state
    this.isInGame = false;
    this.game = null;
    this.lastPhase = null;
    this.isHost = false;
    this.buyInDeducted = false; // Reset buy-in flag for next game
    this.isStartingGame = false;
    
    // Reset animation tracking
    this.resetCardAnimationState();
    
    // Remove game-started class
    document.body.classList.remove('game-started');
    
    // Hide showdown modal if visible
    this.hideShowdownModal();
    
    // Clear all bet displays
    this.clearAllBets();
    
    // Reset community cards
    this.resetCommunityCards();
    
    // Reset hole cards
    this.resetHoleCards();
    
    // Reset pot display
    this.resetPotDisplay();
    
    // Reset player slots
    this.resetLobbyUI();
    
    // Show config panel
    if (this.elements.partyConfig) {
      this.elements.partyConfig.style.display = 'flex';
    }
    
    // Reset ready button
    if (this.elements.readyBtn) {
      this.elements.readyBtn.classList.remove('ready');
      this.elements.readyBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Ready Up
      `;
    }
    
    // Hide start button
    if (this.elements.startGameBtn) {
      this.elements.startGameBtn.style.display = 'none';
    }
  }
  
  // Reset community cards to empty state
  resetCommunityCards() {
    if (!this.elements.communityCards) return;
    
    const cards = this.elements.communityCards.querySelectorAll('.community-card');
    cards.forEach(card => {
      card.className = 'community-card';
      card.innerHTML = '';
    });
  }
  
  // Reset hole cards to empty state
  resetHoleCards() {
    if (!this.elements.yourCards) return;
    
    const cards = this.elements.yourCards.querySelectorAll('.hand-card');
    cards.forEach(card => {
      card.className = 'hand-card';
      card.innerHTML = `
        <span class="card-value">?</span>
        <span class="card-suit">?</span>
      `;
    });
  }
  
  // Reset pot display
  resetPotDisplay() {
    if (this.elements.potChips) {
      this.elements.potChips.innerHTML = '';
    }
    if (this.elements.potAmount) {
      this.elements.potAmount.textContent = '$0';
    }
    // Also reset your chip stack display
    if (this.elements.yourChipStack) {
      this.elements.yourChipStack.innerHTML = '';
    }
    if (this.elements.yourChipsAmount) {
      this.elements.yourChipsAmount.textContent = '$0';
    }
  }

  async handleJoinRequestAction(requestId, accept) {
    const result = await this.lobbyManager?.handleJoinRequest(requestId, accept);
    if (!result?.success) {
      console.error('Failed to handle request:', result?.error);
      this.showToast(result?.error || 'Failed to handle request', 'error');
    } else {
      if (accept) {
        this.showToast('Player accepted! They are joining your lobby.', 'success');
      } else {
        this.showToast('Join request declined.', 'info');
      }
      // The lobby listener will automatically update the UI when the player is added
    }
  }

  async handleAction(action) {
    if (!this.game) {
      console.log('❌ No game instance for action');
      this.showToast('Game not ready', 'error');
      return;
    }
    
    if (!this.currentUser) {
      console.log('❌ No current user for action');
      this.showToast('Not signed in', 'error');
      return;
    }

    // Check if it's actually this user's turn
    const myPlayer = this.game.players.find(p => p && p.id === this.currentUser.uid);
    if (!myPlayer) {
      console.log('❌ Player not found in game');
      this.showToast('You are not in this game', 'error');
      return;
    }
    
    if (!myPlayer.isCurrentTurn) {
      console.log('❌ Not your turn');
      this.showToast('Not your turn', 'error');
      return;
    }

    let amount = 0;
    if (action === 'raise') {
      amount = parseInt(this.elements.raiseInput?.value) || 0;
      // Allow any raise amount >= $1 (player might not have enough for min raise)
      if (amount < 1) {
        this.showToast('Raise must be at least $1', 'error');
        return;
      }
      // If player can afford min raise, enforce it; otherwise allow what they have
      const toCall = this.game.currentBet - (myPlayer.currentBet || 0);
      const canAffordMinRaise = myPlayer.chips >= toCall + this.game.minRaise;
      if (canAffordMinRaise && amount < this.game.minRaise) {
        this.showToast(`Minimum raise is $${this.game.minRaise}`, 'error');
        return;
      }
    }

    console.log(`🎯 Player action: ${action}`, amount > 0 ? `$${amount}` : '');
    
    const result = this.game.handleAction(this.currentUser.uid, action, amount);
    
    if (result.success) {
      // Hide actions panel after taking action
      this.hideActionsPanel();
      
      // Sync game state to Firebase (include all cards - null means don't filter)
      await this.lobbyManager?.updateGameState(this.game.serialize(null));
      
      // Update UI immediately (filter for current user to hide other players' cards)
      this.updateGameUI(this.game.serialize(this.currentUser.uid));
      
      // Check if game/round ended
      if (result.roundEnded) {
        console.log('Round ended, moving to next phase');
      }
      if (result.gameEnded) {
        console.log('Game ended!');
        await this.handleGameEnd(result);
      }
    } else {
      console.error('Action failed:', result.error);
      this.showToast(result.error || 'Invalid action', 'error');
    }
  }

  // Handle game end (showdown or winner)
  async handleGameEnd(result) {
    console.log('🏆 Game ended, result:', result);
    
    // Only the host should persist winnings to Firebase to avoid duplicate updates
    if (this.isHost && result.winners && result.winners.length > 0) {
      // EXPLOIT PREVENTION: Calculate max possible pot
      const buyIn = this.lobbyManager?.currentLobby?.buyIn || 50;
      const playerCount = this.game?.players?.filter(p => p !== null).length || 2;
      const maxPot = buyIn * playerCount;
      
      // Calculate total claimed winnings
      const totalClaimedWinnings = result.winners.reduce((sum, w) => sum + (w.winnings || 0), 0);
      
      // EXPLOIT PREVENTION: Don't award if winnings exceed max pot
      if (totalClaimedWinnings > maxPot) {
        console.error(`🚨 EXPLOIT BLOCKED: Claimed winnings ($${totalClaimedWinnings}) exceed max pot ($${maxPot})`);
        this.showToast('Error: Invalid winnings amount detected', 'error');
        return;
      }
      
      for (const winnerInfo of result.winners) {
        const winnerId = winnerInfo.player.id;
        const winnings = winnerInfo.winnings;
        
        // EXPLOIT PREVENTION: Validate winner is actually in the game
        const winnerInGame = this.game?.players?.some(p => p?.id === winnerId);
        if (!winnerInGame) {
          console.error(`🚨 EXPLOIT BLOCKED: Winner ${winnerId} not found in game players`);
          continue;
        }
        
        // EXPLOIT PREVENTION: Winnings must be positive and reasonable
        if (winnings <= 0 || winnings > maxPot) {
          console.error(`🚨 EXPLOIT BLOCKED: Invalid winnings amount $${winnings}`);
          continue;
        }
        
        console.log(`🎉 Winner: ${winnerInfo.player.displayName} won $${winnings}`);
        
        // Award winnings via lobby manager (works for all players)
        await this.lobbyManager?.awardWinnings(winnerId, winnings);
      }
    }
    
    // Show toast for current user
    if (result.winners && result.winners.length > 0) {
      const myWin = result.winners.find(w => w.player.id === this.currentUser?.uid);
      if (myWin) {
        this.updateBalanceDisplay();
        this.showToast(`You won $${myWin.winnings}!`, 'success');
      } else {
        const winnerNames = result.winners.map(w => w.player.displayName).join(', ');
        this.showToast(`${winnerNames} won the pot!`, 'info');
      }
    }
    
    // Show showdown modal with hand comparisons (includes play again button)
    this.showShowdownModal(result);
  }
  
  // Show the showdown modal with hand comparisons
  showShowdownModal(result) {
    if (!this.elements.showdownModal || !result) return;
    
    const resultsContainer = this.elements.showdownModal.querySelector('.showdown-players');
    if (!resultsContainer) return;
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Get winner IDs for highlighting
    const winnerIds = result.winners ? result.winners.map(w => w.player.id) : [];
    
    // Get all active players and their hands
    const players = this.game?.players || [];
    const communityCards = this.game?.communityCards || [];
    
    // Get players who haven't folded and have cards
    const activePlayers = players.filter(p => p && !p.folded && p.holeCards && p.holeCards.length >= 2);
    
    activePlayers.forEach(player => {
      // Check if this player is in the winners result (which has pre-evaluated hand names)
      const winnerInfo = result.winners?.find(w => w.player.id === player.id);
      
      let handName = 'Unknown';
      
      // Use handName from winner info if available
      if (winnerInfo && winnerInfo.handName) {
        handName = winnerInfo.handName;
      } else {
        // Evaluate the hand
        const allCards = [...player.holeCards, ...communityCards];
        if (allCards.length >= 5) {
          try {
            const bestHand = HandEvaluator.getBestHand(allCards);
            handName = HAND_NAMES[bestHand.rank] || HandEvaluator.getHandName(bestHand.score) || 'Unknown';
          } catch (e) {
            console.error('Error evaluating hand:', e);
          }
        }
      }
      
      const isWinner = winnerIds.includes(player.id);
      const winAmount = winnerInfo?.winnings || 0;
      
      const playerDiv = document.createElement('div');
      playerDiv.className = `showdown-player ${isWinner ? 'winner' : 'loser'}`;
      
      // Create cards display using existing CSS classes
      const cardsHtml = player.holeCards.map(card => {
        const suitSymbol = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[card.suit] || '';
        const suitClass = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
        return `<div class="showdown-card ${suitClass}"><span>${card.value}</span><span>${suitSymbol}</span></div>`;
      }).join('');
      
      playerDiv.innerHTML = `
        <div class="showdown-player-info">
          <div class="showdown-player-name">${player.displayName}</div>
          <div class="showdown-player-hand">${handName}</div>
        </div>
        <div class="showdown-player-cards">${cardsHtml}</div>
        ${isWinner ? `<div class="showdown-winnings" style="color: #22c55e; font-weight: 700; margin-left: auto;">+$${winAmount}</div>` : ''}
      `;
      
      resultsContainer.appendChild(playerDiv);
    });
    
    // Add voting UI if not already present
    let votingSection = this.elements.showdownModal.querySelector('.play-again-voting');
    if (!votingSection) {
      votingSection = document.createElement('div');
      votingSection.className = 'play-again-voting';
      votingSection.innerHTML = `
        <div class="vote-progress">
          <div class="vote-progress-fill"></div>
        </div>
        <div class="vote-count">0/0 voted to play again</div>
      `;
      // Insert before the buttons
      const actionsDiv = this.elements.showdownModal.querySelector('.showdown-actions');
      if (actionsDiv) {
        actionsDiv.parentNode.insertBefore(votingSection, actionsDiv);
      }
    }
    
    // Initialize vote display
    const votes = this.lobbyManager?.getPlayAgainVotes() || [];
    const totalPlayers = this.game?.getPlayerCount() || 0;
    this.updatePlayAgainVotes(votes, totalPlayers);
    
    // Show the modal (clear any inline style that might have been set)
    this.elements.showdownModal.style.display = '';
    this.elements.showdownModal.classList.add('active');
  }
  
  // Hide the showdown modal
  hideShowdownModal() {
    if (this.elements.showdownModal) {
      this.elements.showdownModal.classList.remove('active');
      this.elements.showdownModal.style.display = 'none'; // Force hide
      
      // Reset play again button state
      if (this.elements.playAgainBtn) {
        this.elements.playAgainBtn.classList.remove('voted');
        this.elements.playAgainBtn.disabled = false;
        this.elements.playAgainBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          Play Again
        `;
      }
      
      // Reset voting UI
      const progressFill = this.elements.showdownModal.querySelector('.vote-progress-fill');
      const voteCount = this.elements.showdownModal.querySelector('.vote-count');
      if (progressFill) progressFill.style.width = '0%';
      if (voteCount) voteCount.textContent = '0/0 voted to play again';
    }
    
    // Also reset the flag
    this.showdownModalShown = false;
  }
  
  // Reset card animation tracking for new hand
  resetCardAnimationState() {
    this.lastCommunityCardCount = 0;
    this.lastHoleCardCount = 0;
    this.lastPotAmount = 0;
    this.lastPlayerBets = {};
  }
  
  // Handle play again button click - now uses voting system
  async handlePlayAgain() {
    if (!this.game || this.game.getPlayerCount() < 2) {
      // Not enough players, return to lobby
      this.isInGame = false;
      document.body.classList.remove('game-started');
      this.hideShowdownModal();
      if (this.elements.partyConfig) {
        this.elements.partyConfig.style.display = 'flex';
      }
      return;
    }

    // Check if current player has enough balance for another buy-in
    const buyIn = this.lobbyManager?.currentLobby?.buyIn || 50;
    const currentBalance = CasinoAuth.getBalance();
    
    if (currentBalance < buyIn) {
      // Player is broke - auto return to lobby
      this.showToast(`Insufficient balance ($${currentBalance.toFixed(2)}) for buy-in ($${buyIn})`, 'error');
      await this.handleReturnToLobby();
      return;
    }

    // Vote for play again
    await this.lobbyManager?.votePlayAgain();
    
    // Update button to show voted state
    if (this.elements.playAgainBtn) {
      this.elements.playAgainBtn.classList.add('voted');
      this.elements.playAgainBtn.disabled = true;
    }
    
    this.showToast('Vote recorded! Waiting for others...', 'success');
  }

  // Start new hand (called when all players vote or by host)
  async startNewHand() {
    if (!this.game || !this.isHost) return;
    
    // Prevent being called while already starting
    if (this._startingNewHandInProgress) {
      console.log('⏳ startNewHand already in progress, skipping');
      return;
    }
    this._startingNewHandInProgress = true;
    
    console.log('🎰 Starting new hand...');
    
    try {
      const buyIn = this.lobbyManager?.currentLobby?.buyIn || 50;
      
      // Check for broke players and remove them
      const { cantAfford } = await this.lobbyManager?.checkPlayerBalances() || { cantAfford: [] };
      
      if (cantAfford.length > 0) {
        // Remove broke players from lobby
        const removeResult = await this.lobbyManager?.removeBrokePlayers();
        
        if (removeResult?.removed?.length > 0) {
          const names = removeResult.removed.map(p => p.displayName).join(', ');
          this.showToast(`${names} removed (insufficient balance)`, 'info');
        }
        
        // Check if enough players remain
        const remainingPlayers = (this.lobbyManager?.currentLobby?.players || []).length - cantAfford.length;
        
        if (remainingPlayers < 2) {
          this.showToast('Not enough players with funds. Returning to lobby.', 'error');
          await this.handleReturnToLobby();
          return;
        }
        
        // Update local game state to remove broke players
        for (const brokePlayer of cantAfford) {
          const playerIndex = this.game.players.findIndex(p => p?.id === brokePlayer.id);
          if (playerIndex !== -1) {
            this.game.players[playerIndex] = null;
          }
        }
      }
      
      // Hide modal first
      this.hideShowdownModal();
      this.showdownModalShown = false;
      this.resetCardAnimationState();
      
      // Reset player chips to buy-in for new hand
      this.game.players.forEach(p => {
        if (p) {
          p.chips = buyIn;
          p.currentBet = 0;
          p.isFolded = false;
          p.isAllIn = false;
        }
      });
      
      // Start new hand
      this.game.startHand();
      
      // Sync to Firebase with full game state and clear votes
      // Using updateGameState which will handle the Firebase update
      const gameState = this.game.serialize(null);
      gameState.playAgainVotes = []; // Clear votes in game state
      await this.lobbyManager?.updateGameState(gameState, { clearVotes: true });
      
      // Update UI
      this.updateGameUI(this.game.serialize(this.currentUser?.uid));
    } catch (error) {
      console.error('Error starting new hand:', error);
    } finally {
      this._startingNewHandInProgress = false;
    }
  }

  // Update play again vote display
  updatePlayAgainVotes(votes, totalPlayers) {
    const voteCountEl = this.elements.showdownModal?.querySelector('.vote-count');
    const progressEl = this.elements.showdownModal?.querySelector('.vote-progress-fill');
    
    if (voteCountEl) {
      voteCountEl.textContent = `${votes.length}/${totalPlayers} voted to play again`;
    }
    
    if (progressEl) {
      const percent = totalPlayers > 0 ? (votes.length / totalPlayers) * 100 : 0;
      progressEl.style.width = `${percent}%`;
    }
    
    // Update button state if current user has voted
    const hasVoted = votes.includes(this.currentUser?.uid);
    if (this.elements.playAgainBtn) {
      this.elements.playAgainBtn.classList.toggle('voted', hasVoted);
      this.elements.playAgainBtn.disabled = hasVoted;
      this.elements.playAgainBtn.innerHTML = hasVoted ? `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Voted!
      ` : `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        Play Again
      `;
    }
  }
  
  // Handle return to lobby from showdown modal (keeps players in lobby)
  async handleReturnToLobby() {
    if (this.isLeaving) return;
    
    this.isLeaving = true;
    
    try {
      // Reset game state and return lobby to pre-game status
      await this.lobbyManager.resetGameState();
      
      // Close the showdown modal
      this.hideShowdownModal();
      
      // Reset local game state
      this.gameState = null;
      this.isInGame = false;
      
      // Reset buy-in tracking for next game
      this._buyInDeducted = false;
      this._currentGameId = null;
      
      // Hide game UI elements
      this.elements.pokerActions?.classList.remove('visible');
      this.elements.tableContainer?.classList.add('hidden');
      
      // Show the party config (pre-game lobby state)
      if (this.elements.partyConfig) {
        this.elements.partyConfig.style.display = 'flex';
        this.elements.partyConfig.classList.add('visible');
      }
      document.body.classList.remove('game-started');
      
      // Re-render party (will show players with reset ready status)
      if (this.lobbyManager?.currentLobby) {
        this.renderParty(this.lobbyManager.currentLobby);
      }
      
      this.showToast('Returned to lobby', 'success');
    } catch (error) {
      console.error('Error returning to lobby:', error);
      this.showToast('Error returning to lobby', 'error');
    } finally {
      this.isLeaving = false;
    }
  }
  async startGame() {
    if (!this.lobbyManager?.currentLobby) return;

    const lobby = this.lobbyManager.currentLobby;
    
    // Prevent double buy-in deduction for host
    if (this._buyInDeducted) {
      console.warn('Buy-in already deducted for this game session');
      return;
    }
    
    // Deduct buy-in from current player when game starts
    const buyIn = lobby.buyIn;
    const deductResult = await CasinoDB.updateBalance(-buyIn);
    if (deductResult === null) {
      this.showToast('Failed to deduct buy-in', 'error');
      return;
    }
    
    // Mark buy-in as deducted
    this._buyInDeducted = true;
    this._currentGameId = lobby.gameStartedAt?.seconds || lobby.id;
    
    this.updateBalanceDisplay();
    this.showToast(`$${buyIn} buy-in deducted. Good luck!`, 'success');
    
    // Create game instance with max capacity matching the number of seat slots
    // This ensures proper seat index handling
    const maxPlayers = 6; // Fixed table size
    
    this.game = new PokerGame(
      this.lobbyManager.currentLobbyId,
      lobby.hostId,
      lobby.buyIn,
      maxPlayers
    );

    // Add players from lobby, preserving their seat indexes from the lobby
    // Sort by seatIndex to ensure consistent ordering
    const sortedPlayers = [...lobby.players].sort((a, b) => a.seatIndex - b.seatIndex);
    
    for (const lobbyPlayer of sortedPlayers) {
      // Directly create player at the correct seat index
      const player = new Player(
        lobbyPlayer.id, 
        lobbyPlayer.displayName, 
        lobbyPlayer.photoURL, 
        lobbyPlayer.seatIndex  // Use lobby seat index!
      );
      player.chips = lobby.buyIn;
      player.isReady = true;
      this.game.players[lobbyPlayer.seatIndex] = player;
    }

    // Start the hand
    this.game.startHand();

    // Sync to Firebase (send without user-specific filtering for host)
    await this.lobbyManager.updateGameState(this.game.serialize(null));

    // Update UI
    this.isInGame = true;
    document.body.classList.add('game-started');
    
    // Hide config panel
    if (this.elements.partyConfig) {
      this.elements.partyConfig.style.display = 'none';
    }
    
    // Update player slots from game state
    const gamePlayers = this.game.players.filter(p => p !== null);
    this.updatePlayerSlots(gamePlayers);
    
    console.log('🎰 Game started with', gamePlayers.length, 'players!');
  }

  // ========================================
  // UTILITIES
  // ========================================

  formatMoney(amount) {
    return '$' + (amount || 0).toLocaleString();
  }

  async cleanup() {
    this.stopTurnTimer();
    
    if (this.lobbyManager) {
      await this.lobbyManager.cleanup();
    }
  }
}

// ========================================
// INITIALIZE
// ========================================

const pokerController = new PokerController();

document.addEventListener('DOMContentLoaded', () => {
  pokerController.init();
});

// Make available globally for debugging
window.PokerController = pokerController;

export default pokerController;
