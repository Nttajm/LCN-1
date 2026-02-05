// ========================================
// CASINO LIVE CHAT MODULE
// Floating, draggable chat widget with Firebase
// ========================================

import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

import { 
  getFunctions, 
  httpsCallable 
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js';

// ========================================
// LIVE CHAT CLASS
// ========================================
class LiveChat {
  constructor() {
    this.db = null;
    this.functions = null;
    this.chatRef = null;
    this.unsubscribe = null;
    this.currentUser = null;
    this.isMinimized = false;
    this.isHidden = true;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.position = { x: null, y: null };
    this.warningCount = 0;
    this.cooldownEnd = 0;
    this.messageCount = 0;
    this.lastMessageTime = 0;
    this.unreadCount = 0;
    this.maxWarnings = 3;
    this.cooldownDuration = 30000; // 30 seconds cooldown after violation
    this.rateLimitMessages = 5; // Max messages per 10 seconds
    this.rateLimitWindow = 10000;
    
    this.init();
  }

  // ========================================
  // INITIALIZATION
  // ========================================
  async init() {
    // Wait for CasinoAuth and Firebase to be fully initialized
    await this.waitForFirebase();
    
    // Get Firebase instances from CasinoDB which has the initialized db
    if (window.CasinoDB && typeof window.CasinoDB.getDB === 'function') {
      try {
        this.db = window.CasinoDB.getDB();
        if (this.db) {
          this.chatRef = collection(this.db, 'casino_chat');
          
          // Try to get functions (may not be available)
          try {
            const { getFunctions } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js');
            const { getApp } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
            this.functions = getFunctions(getApp());
          } catch (e) {
            console.warn('LiveChat: Cloud Functions not available, using client-side filtering');
          }
        }
      } catch (e) {
        console.error('LiveChat: Failed to get Firestore from CasinoDB:', e);
        return;
      }
    } else {
      console.error('LiveChat: CasinoDB not available');
      return;
    }
    
    // Create UI
    this.createChatUI();
    this.setupEventListeners();
    
    // Load saved position
    this.loadPosition();
    
    // Load warning count from localStorage
    this.loadWarningCount();
    
    // Listen for auth changes
    if (window.CasinoAuth) {
      window.CasinoAuth.onAuthStateChange((user) => {
        this.currentUser = user;
        this.updateAuthState();
      });
    }
    
    // Start listening to messages
    this.startListening();
    
    console.log('LiveChat: Initialized');
  }

  waitForFirebase() {
    return new Promise((resolve) => {
      const check = () => {
        // Wait for CasinoDB to be available and have a getDB function
        if (window.CasinoDB && typeof window.CasinoDB.getDB === 'function') {
          try {
            const db = window.CasinoDB.getDB();
            if (db) {
              resolve();
              return;
            }
          } catch (e) {
            // DB not ready yet
          }
        }
        setTimeout(check, 100);
      };
      check();
    });
  }

  // ========================================
  // UI CREATION
  // ========================================
  createChatUI() {
    // Create toggle button (shown when chat is hidden)
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'livechat-toggle-btn';
    toggleBtn.id = 'livechatToggleBtn';
    toggleBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `;
    document.body.appendChild(toggleBtn);

    // Create main chat container
    const container = document.createElement('div');
    container.className = 'livechat-container';
    container.id = 'livechatContainer';
    container.innerHTML = `
      <div class="livechat-header" id="livechatHeader">
        <div class="livechat-header-left">
          <div class="livechat-status"></div>
          <span class="livechat-title">Live Chat</span>
          <span class="livechat-users" id="livechatUsers"></span>
        </div>
        <div class="livechat-header-actions">
          <button class="livechat-btn" id="livechatMinimizeBtn" title="Minimize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
            </svg>
          </button>
          <button class="livechat-btn" id="livechatCloseBtn" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="livechat-body" id="livechatBody">
        <!-- Messages will be inserted here -->
      </div>
      
      <div class="livechat-input-area" id="livechatInputArea">
        <div class="livechat-input-wrapper">
          <input type="text" class="livechat-input" id="livechatInput" placeholder="Type a message..." maxlength="200">
          <button class="livechat-send-btn" id="livechatSendBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="livechat-login-prompt" id="livechatLoginPrompt" style="display: none;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <p>Sign in to join the chat</p>
        <button class="livechat-login-btn" id="livechatLoginBtn">Sign In</button>
      </div>
    `;
    document.body.appendChild(container);

    // Cache elements
    this.elements = {
      container,
      toggleBtn,
      header: document.getElementById('livechatHeader'),
      body: document.getElementById('livechatBody'),
      input: document.getElementById('livechatInput'),
      sendBtn: document.getElementById('livechatSendBtn'),
      minimizeBtn: document.getElementById('livechatMinimizeBtn'),
      closeBtn: document.getElementById('livechatCloseBtn'),
      loginPrompt: document.getElementById('livechatLoginPrompt'),
      inputArea: document.getElementById('livechatInputArea'),
      usersCount: document.getElementById('livechatUsers'),
      loginBtn: document.getElementById('livechatLoginBtn')
    };

    // Initial state - show toggle button, hide chat
    this.hideChat();
    
    // Add welcome message
    this.addSystemMessage('Welcome to Casino Live Chat! Be respectful to others or be banned.', 'info');
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================
  setupEventListeners() {
    // Toggle button
    this.elements.toggleBtn.addEventListener('click', () => this.showChat());
    
    // Close button
    this.elements.closeBtn.addEventListener('click', () => this.hideChat());
    
    // Minimize button
    this.elements.minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    
    // Send button
    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
    
    // Enter key to send
    this.elements.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Login button
    this.elements.loginBtn.addEventListener('click', () => {
      if (window.CasinoAuth) {
        window.CasinoAuth.signIn();
      }
    });
    
    // Dragging
    this.elements.header.addEventListener('mousedown', (e) => this.startDrag(e));
    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.endDrag());
    
    // Touch dragging for mobile
    this.elements.header.addEventListener('touchstart', (e) => this.startDrag(e));
    document.addEventListener('touchmove', (e) => this.drag(e));
    document.addEventListener('touchend', () => this.endDrag());
  }

  // ========================================
  // DRAG & DROP
  // ========================================
  startDrag(e) {
    if (e.target.closest('.livechat-btn')) return; // Don't drag when clicking buttons
    
    this.isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = this.elements.container.getBoundingClientRect();
    
    this.dragOffset = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
    
    this.elements.container.style.transition = 'none';
  }

  drag(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const newX = clientX - this.dragOffset.x;
    const newY = clientY - this.dragOffset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - this.elements.container.offsetWidth;
    const maxY = window.innerHeight - this.elements.container.offsetHeight;
    
    this.position.x = Math.max(0, Math.min(newX, maxX));
    this.position.y = Math.max(0, Math.min(newY, maxY));
    
    this.elements.container.style.left = this.position.x + 'px';
    this.elements.container.style.top = this.position.y + 'px';
    this.elements.container.style.right = 'auto';
    this.elements.container.style.bottom = 'auto';
  }

  endDrag() {
    if (this.isDragging) {
      this.isDragging = false;
      this.elements.container.style.transition = '';
      this.savePosition();
    }
  }

  savePosition() {
    if (this.position.x !== null) {
      localStorage.setItem('livechat_position', JSON.stringify(this.position));
    }
  }

  loadPosition() {
    const saved = localStorage.getItem('livechat_position');
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        this.position = pos;
        this.elements.container.style.left = pos.x + 'px';
        this.elements.container.style.top = pos.y + 'px';
        this.elements.container.style.right = 'auto';
        this.elements.container.style.bottom = 'auto';
      } catch (e) {}
    }
  }

  // ========================================
  // VISIBILITY CONTROLS
  // ========================================
  showChat() {
    this.elements.container.style.display = 'flex';
    this.elements.toggleBtn.style.display = 'none';
    this.isHidden = false;
    this.unreadCount = 0;
    this.elements.toggleBtn.classList.remove('has-unread');
    this.scrollToBottom();
  }

  hideChat() {
    this.elements.container.style.display = 'none';
    this.elements.toggleBtn.style.display = 'flex';
    this.isHidden = true;
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.elements.container.classList.toggle('minimized', this.isMinimized);
    
    // Update minimize button icon
    this.elements.minimizeBtn.innerHTML = this.isMinimized 
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>`;
  }

  // ========================================
  // AUTH STATE
  // ========================================
  updateAuthState() {
    if (this.currentUser) {
      this.elements.loginPrompt.style.display = 'none';
      this.elements.body.style.display = 'flex';
      this.elements.inputArea.style.display = 'block';
    } else {
      this.elements.loginPrompt.style.display = 'flex';
      this.elements.body.style.display = 'none';
      this.elements.inputArea.style.display = 'none';
    }
  }

  // ========================================
  // MESSAGING
  // ========================================
  async sendMessage() {
    if (!this.currentUser) {
      this.addSystemMessage('Please sign in to chat', 'warning');
      return;
    }
    
    const text = this.elements.input.value.trim();
    if (!text) return;
    
    // Check cooldown
    if (Date.now() < this.cooldownEnd) {
      const remaining = Math.ceil((this.cooldownEnd - Date.now()) / 1000);
      this.showCooldown(remaining);
      return;
    }
    
    // Rate limiting
    const now = Date.now();
    if (now - this.lastMessageTime < this.rateLimitWindow) {
      this.messageCount++;
      if (this.messageCount > this.rateLimitMessages) {
        this.addSystemMessage('Slow down! Too many messages.', 'warning');
        this.cooldownEnd = now + 5000;
        return;
      }
    } else {
      this.messageCount = 1;
    }
    this.lastMessageTime = now;
    
    // Disable input while sending
    this.elements.input.disabled = true;
    this.elements.sendBtn.disabled = true;
    
    try {
      // Check for bad words using Cloud Function
      const filterResult = await this.checkBadWords(text);
      
      if (filterResult.hasBadWords) {
        // Increment warning count
        this.warningCount++;
        this.saveWarningCount();
        
        // Show warning
        const warningsLeft = this.maxWarnings - this.warningCount;
        if (warningsLeft > 0) {
          this.addSystemMessage(
            `⚠️ Your message contained inappropriate content. Warning ${this.warningCount}/${this.maxWarnings}. You can be banned!`,
            'warning'
          );
        } else {
          // User has exceeded warnings - could trigger ban here
          this.addSystemMessage(
            '🚫 You have exceeded the warning limit. Your account may be banned.',
            'system'
          );
          // Could trigger actual ban here via Cloud Function
          await this.reportUser();
        }
        
        // Apply cooldown
        this.cooldownEnd = Date.now() + this.cooldownDuration;
        this.showCooldown(this.cooldownDuration / 1000);
        
        this.elements.input.value = '';
        return;
      }
      
      // Send clean message to Firestore
      await addDoc(this.chatRef, {
        text: filterResult.cleanText || text,
        userId: this.currentUser.uid,
        userName: this.currentUser.displayName || 'Anonymous',
        userPhoto: this.currentUser.photoURL || null,
        timestamp: serverTimestamp(),
        game: this.getCurrentGame()
      });
      
      this.elements.input.value = '';
      
    } catch (error) {
      console.error('LiveChat: Failed to send message:', error);
      this.addSystemMessage('Failed to send message. Try again.', 'system');
    } finally {
      this.elements.input.disabled = false;
      this.elements.sendBtn.disabled = false;
      this.elements.input.focus();
    }
  }

  // ========================================
  // GAME SHARE - Auto-share big wins
  // ========================================
  async gameShare(game, message, multiplier = null, amount = null) {
    if (!this.currentUser || !this.chatRef) {
      console.warn('LiveChat: Cannot share - not signed in or chat not ready');
      return false;
    }
    
    try {
      // Create game share message document
      await addDoc(this.chatRef, {
        type: 'game_share',
        game: game.toLowerCase(),
        text: message,
        multiplier: multiplier,
        amount: amount,
        userId: this.currentUser.uid,
        userName: this.currentUser.displayName || 'Anonymous',
        userPhoto: this.currentUser.photoURL || null,
        timestamp: serverTimestamp()
      });
      
      console.log('LiveChat: Game share sent -', game, message);
      return true;
    } catch (error) {
      console.error('LiveChat: Failed to share game result:', error);
      return false;
    }
  }

  // Helper to format win shares from games
  static shareWin(game, userName, multiplier, amount = null) {
    if (!window.LiveChat || !window.LiveChat.gameShare) {
      console.warn('LiveChat not ready for sharing');
      return;
    }
    
    const formattedAmount = amount ? ` ($${amount.toFixed(2)})` : '';
    const message = `just won ${multiplier}x${formattedAmount}! 🎉`;
    
    window.LiveChat.gameShare(game, message, multiplier, amount);
  }

  // Check bad words using PurgoMalum API
  async checkBadWords(text) {
    try {
      // Use PurgoMalum API to check for profanity
      const encodedText = encodeURIComponent(text);
      
      // First check if text contains profanity
      const containsResponse = await fetch(
        `https://www.purgomalum.com/service/containsprofanity?text=${encodedText}`
      );
      const containsProfanity = await containsResponse.text();
      
      if (containsProfanity === 'true') {
        // Get the cleaned version
        const cleanResponse = await fetch(
          `https://www.purgomalum.com/service/plain?text=${encodedText}&fill_char=*`
        );
        const cleanText = await cleanResponse.text();
        
        return { hasBadWords: true, cleanText };
      }
      
      return { hasBadWords: false, cleanText: text };
    } catch (error) {
      console.warn('LiveChat: PurgoMalum API error, using client-side filter:', error);
      // Fallback to client-side filtering if API fails
      return this.clientSideFilter(text);
    }
  }

  // Basic client-side filter as fallback
  clientSideFilter(text) {
    const badPatterns = [
      /\b(f+u+c+k+|sh+i+t+|a+s+s+h+o+l+e+|b+i+t+c+h+|d+a+m+n+|c+u+n+t+|d+i+c+k+|p+u+s+s+y+|c+o+c+k+|r+a+p+e|n+i+g+g+)/gi,
      /\b(retard|faggot|nazi|kill\s*yourself|kys)\b/gi
    ];
    
    let hasBadWords = false;
    let cleanText = text;
    
    for (const pattern of badPatterns) {
      if (pattern.test(text)) {
        hasBadWords = true;
        cleanText = cleanText.replace(pattern, '***');
      }
    }
    
    return { hasBadWords, cleanText };
  }

  // Report user for exceeding warnings
  async reportUser() {
    if (!this.currentUser || !this.db) return;
    
    try {
      const reportRef = doc(this.db, 'chat_reports', this.currentUser.uid);
      await setDoc(reportRef, {
        userId: this.currentUser.uid,
        userName: this.currentUser.displayName,
        email: this.currentUser.email,
        warningCount: this.warningCount,
        reportedAt: serverTimestamp(),
        status: 'pending'
      }, { merge: true });
    } catch (error) {
      console.error('LiveChat: Failed to report user:', error);
    }
  }

  // ========================================
  // MESSAGE DISPLAY
  // ========================================
  addMessage(data, id) {
    const isOwn = this.currentUser && data.userId === this.currentUser.uid;
    const time = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now';
    
    const messageEl = document.createElement('div');
    
    // Check if this is a game share message
    if (data.type === 'game_share') {
      messageEl.className = `chat-message game-share-message game-${data.game}`;
      messageEl.dataset.id = id;
      
      const gameIcon = this.getGameIcon(data.game);
      const gameColor = this.getGameColor(data.game);
      const multiplierClass = data.multiplier >= 10 ? 'mega-win' : (data.multiplier >= 5 ? 'big-win' : 'win');
      
      messageEl.innerHTML = `
        <div class="game-share-header">
          <span class="game-share-icon" style="background: ${gameColor}">${gameIcon}</span>
          <span class="game-share-game">${this.escapeHtml(data.game.toUpperCase())}</span>
          <span class="chat-timestamp">${time}</span>
        </div>
        <div class="game-share-content">
          <span class="game-share-user">${this.escapeHtml(data.userName || 'Anonymous')}</span>
          <span class="game-share-text">${this.escapeHtml(data.text)}</span>
        </div>
        ${data.multiplier ? `<div class="game-share-multiplier ${multiplierClass}">${data.multiplier}x</div>` : ''}
      `;
    } else {
      // Regular message
      messageEl.className = `chat-message ${isOwn ? 'own-message' : ''}`;
      messageEl.dataset.id = id;
      messageEl.innerHTML = `
        <div class="chat-message-header">
          <span class="chat-username">${this.escapeHtml(data.userName || 'Anonymous')}</span>
          <span class="chat-timestamp">${time}</span>
        </div>
        <div class="chat-text">${this.escapeHtml(data.text)}</div>
      `;
    }
    
    this.elements.body.appendChild(messageEl);
    this.scrollToBottom();
    
    // Update unread count if chat is hidden
    if (this.isHidden && !isOwn) {
      this.unreadCount++;
      this.elements.toggleBtn.classList.add('has-unread');
    }
  }

  addSystemMessage(text, type = 'system') {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${type}-message`;
    messageEl.innerHTML = `<div class="chat-text">${text}</div>`;
    this.elements.body.appendChild(messageEl);
    this.scrollToBottom();
  }

  showCooldown(seconds) {
    // Remove existing cooldown display
    const existing = this.elements.container.querySelector('.livechat-cooldown');
    if (existing) existing.remove();
    
    const cooldownEl = document.createElement('div');
    cooldownEl.className = 'livechat-cooldown';
    cooldownEl.textContent = `Please wait ${seconds} seconds before sending another message`;
    this.elements.container.appendChild(cooldownEl);
    
    setTimeout(() => cooldownEl.remove(), 3000);
  }

  scrollToBottom() {
    this.elements.body.scrollTop = this.elements.body.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Get game icon emoji
  getGameIcon(game) {
    const icons = {
      'plinko': '🔵',
      'gems': '💎',
      'mines': '💎',
      'roulette': '🎰',
      'blackjack': '🃏',
      'dice': '🎲',
      'crash': '📈',
      'wheel': '🎡',
      'horses': '🏇',
      'poker': '♠️',
      'rps': '✊',
      'dragon-tower': '🐉',
      'dragon': '🐉'
    };
    return icons[game.toLowerCase()] || '🎮';
  }

  // Get game theme color
  getGameColor(game) {
    const colors = {
      'plinko': 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      'gems': 'linear-gradient(135deg, #ec4899, #f472b6)',
      'mines': 'linear-gradient(135deg, #ec4899, #f472b6)',
      'roulette': 'linear-gradient(135deg, #ef4444, #dc2626)',
      'blackjack': 'linear-gradient(135deg, #10b981, #059669)',
      'dice': 'linear-gradient(135deg, #f59e0b, #d97706)',
      'crash': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'wheel': 'linear-gradient(135deg, #06b6d4, #0891b2)',
      'horses': 'linear-gradient(135deg, #84cc16, #65a30d)',
      'poker': 'linear-gradient(135deg, #1e293b, #334155)',
      'rps': 'linear-gradient(135deg, #f97316, #ea580c)',
      'dragon-tower': 'linear-gradient(135deg, #dc2626, #b91c1c)',
      'dragon': 'linear-gradient(135deg, #dc2626, #b91c1c)'
    };
    return colors[game.toLowerCase()] || 'linear-gradient(135deg, #6366f1, #8b5cf6)';
  }

  // ========================================
  // REALTIME LISTENERS
  // ========================================
  startListening() {
    if (!this.chatRef) return;
    
    // Listen to last 50 messages
    const q = query(
      this.chatRef,
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      // Clear existing messages (except system)
      const systemMessages = this.elements.body.querySelectorAll('.system-message, .warning-message, .info-message');
      this.elements.body.innerHTML = '';
      systemMessages.forEach(msg => this.elements.body.appendChild(msg));
      
      // Add messages in reverse order (oldest first)
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      
      messages.reverse().forEach((msg) => {
        this.addMessage(msg, msg.id);
      });
    }, (error) => {
      console.error('LiveChat: Listener error:', error);
      this.addSystemMessage('Connection lost. Reconnecting...', 'warning');
    });
  }

  // ========================================
  // WARNING PERSISTENCE
  // ========================================
  loadWarningCount() {
    const saved = localStorage.getItem('livechat_warnings');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Reset warnings after 24 hours
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          this.warningCount = data.count;
        }
      } catch (e) {}
    }
  }

  saveWarningCount() {
    localStorage.setItem('livechat_warnings', JSON.stringify({
      count: this.warningCount,
      timestamp: Date.now()
    }));
  }

  // ========================================
  // UTILITY
  // ========================================
  getCurrentGame() {
    // Extract game name from URL
    const path = window.location.pathname;
    const match = path.match(/\/([^\/]+)\.html$/);
    return match ? match[1] : 'casino';
  }

  // Cleanup on page unload
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// ========================================
// AUTO-INITIALIZE
// ========================================
let liveChatInstance = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    liveChatInstance = new LiveChat();
    window.LiveChat = liveChatInstance;
  });
} else {
  liveChatInstance = new LiveChat();
  window.LiveChat = liveChatInstance;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (liveChatInstance) {
    liveChatInstance.destroy();
  }
});

// Global helper function for easy game sharing from any game
window.shareCasinoWin = function(game, multiplier, amount = null) {
  if (!liveChatInstance || !liveChatInstance.currentUser) {
    console.warn('LiveChat: Cannot share - not ready or not signed in');
    return false;
  }
  
  const formattedAmount = amount ? ` (+$${amount.toFixed(2)})` : '';
  const message = `just won ${multiplier}x${formattedAmount}! 🎉`;
  
  return liveChatInstance.gameShare(game, message, multiplier, amount);
};

// Export for external access
export { LiveChat };
