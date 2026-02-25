// Modal functionality for Duels app
let selectedGame = null;

// Create modal HTML dynamically
function createDuelModal() {
  if (document.getElementById('duelModal')) return; // Don't create if already exists
  
  const modalHTML = `
    <div class="modal-overlay" id="duelModal">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title" id="modalTitle">Challenge Player</h3>
          <button class="modal-close-btn" id="closeModalBtn">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="challenge-info">
            <div class="challenged-user">
              <div class="challenged-avatar" id="challengedAvatar"></div>
              <div class="challenged-details">
                <h4 class="challenged-name" id="challengedName">Player Name</h4>
                <p class="challenged-status" id="challengedStatus">Online</p>
              </div>
            </div>
          </div>
          
          <div class="game-selection">
            <h4 class="selection-title">Choose a game:</h4>
            <div class="game-options">
              <button class="game-option" data-game="tictactoe">
                <div class="game-option-icon" style="background: linear-gradient(135deg, #7c3aed, #5b21b6);">
                  <svg viewBox="0 0 100 100" width="40" height="40">
                    <line x1="35" y1="10" x2="35" y2="90" stroke="white" stroke-width="4"/>
                    <line x1="65" y1="10" x2="65" y2="90" stroke="white" stroke-width="4"/>
                    <line x1="10" y1="35" x2="90" y2="35" stroke="white" stroke-width="4"/>
                    <line x1="10" y1="65" x2="90" y2="65" stroke="white" stroke-width="4"/>
                  </svg>
                </div>
                <span>Tic Tac Toe</span>
              </button>
              
              <button class="game-option" data-game="coinflip">
                <div class="game-option-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                  <svg viewBox="0 0 100 100" width="40" height="40">
                    <ellipse cx="50" cy="50" rx="25" ry="25" fill="#fcd34d" stroke="#fbbf24" stroke-width="3"/>
                    <text x="50" y="60" font-size="24" font-weight="bold" fill="#b45309" text-anchor="middle">$</text>
                  </svg>
                </div>
                <span>Coin Flip</span>
              </button>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-btn" id="cancelChallengeBtn">Cancel</button>
          <button class="send-challenge-btn" id="sendChallengeBtn" disabled>Send Challenge</button>
        </div>
      </div>
    </div>
  `;
  
  // Inject modal into body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Setup event listeners
  setupModalListeners();
}

// Show duel modal
function showDuelModal(userElement) {
  const modal = document.getElementById('duelModal');
  const userName = userElement.querySelector('.user-name').textContent;
  const userStatus = userElement.querySelector('.user-status').textContent;
  const userAvatar = userElement.querySelector('.user-avatar');
  
  // Update modal content
  document.getElementById('challengedName').textContent = userName;
  document.getElementById('challengedStatus').textContent = userStatus;
  document.getElementById('challengedStatus').className = `challenged-status ${userStatus.toLowerCase() === 'online' ? 'online' : ''}`;
  
  // Copy avatar styles
  const modalAvatar = document.getElementById('challengedAvatar');
  modalAvatar.style.background = userAvatar.style.background;
  modalAvatar.textContent = userAvatar.textContent;
  
  // Reset game selection
  selectedGame = null;
  document.querySelectorAll('.game-option').forEach(option => {
    option.classList.remove('selected');
  });
  document.getElementById('sendChallengeBtn').disabled = true;
  
  // Show modal
  modal.classList.add('show');
}

// Hide duel modal
function hideDuelModal() {
  document.getElementById('duelModal').classList.remove('show');
}

// Select game
function selectGame(gameType) {
  selectedGame = gameType;
  document.querySelectorAll('.game-option').forEach(option => {
    option.classList.remove('selected');
  });
  document.querySelector(`[data-game="${gameType}"]`).classList.add('selected');
  document.getElementById('sendChallengeBtn').disabled = false;
}

// Setup modal event listeners
function setupModalListeners() {
  // Challenge button click handlers
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('challenge-btn')) {
      const userItem = e.target.closest('.user-item');
      showDuelModal(userItem);
    }
  });
  
  // Modal close handlers
  document.getElementById('closeModalBtn')?.addEventListener('click', hideDuelModal);
  document.getElementById('cancelChallengeBtn')?.addEventListener('click', hideDuelModal);
  
  // Game selection handlers
  document.querySelectorAll('.game-option').forEach(option => {
    option.addEventListener('click', function() {
      selectGame(this.dataset.game);
    });
  });
  
  // Send challenge handler
  document.getElementById('sendChallengeBtn')?.addEventListener('click', function() {
    if (selectedGame) {
      const challengedName = document.getElementById('challengedName').textContent;
      alert(`Challenge sent to ${challengedName} for ${selectedGame}!`);
      hideDuelModal();
    }
  });
  
  // Close modal when clicking outside
  document.getElementById('duelModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
      hideDuelModal();
    }
  });
}

// Initialize modal when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for main app to load
  setTimeout(createDuelModal, 1000);
});