import { CasinoAuth, CasinoDB } from './casino/js/casino-auth.js';
    import { initChestOpener, openChest } from './casino/js/chest-opener.js';
    
    // User menu dropdown toggle
    const userMenu = document.getElementById('userMenu');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenu && userDropdown) {
      userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });
      
      document.addEventListener('click', () => {
        userDropdown.classList.remove('show');
      });
    }
    
    // Initialize auth and update balance display
    async function initCasinoAuth() {
      await CasinoAuth.init();
      
      // Check for abandoned sessions
      if (CasinoAuth.currentUser) {
        await CasinoDB.checkAbandonedSessions();
      }
      
      // Update sign in button
      const signInBtn = document.getElementById('headerSignInBtn');
      if (signInBtn) {
        signInBtn.addEventListener('click', async () => {
          const result = await CasinoAuth.signIn();
          if (result.success) {
            updateUI();
          }
        });
      }
      
      CasinoAuth.onAuthStateChange((user, userData) => {
        updateUI();
      });
    }
    
    // ========================================
    // LEVEL TIERS CONFIGURATION
    // ========================================
    // Each tier defines: minLevel, name, colors, and optional effects
    // Colors: badge (gradient), progress (gradient), text, glow
    // Effects: animation class names to apply
    export const LEVEL_TIERS = [
      {
        minLevel: 1,
        name: 'Grass toucher',
        colors: {
          badge: 'linear-gradient(135deg, #6b7280, #4b5563)',
          progress: 'linear-gradient(90deg, #6b7280, #9ca3af)',
          text: '#6b7280',
          glow: 'none'
        },
        effects: []
      },
      {
        minLevel: 3,
        name: 'Rookie',
        colors: {
          badge: 'linear-gradient(135deg, #22c55e, #16a34a)',
          progress: 'linear-gradient(90deg, #22c55e, #4ade80)',
          text: '#22c55e',
          glow: 'none'
        },
        effects: []
      },
      {
        minLevel: 5,
        name: 'pocket aces',
        colors: {
          badge: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          progress: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
          text: '#3b82f6',
          glow: 'none'
        },
        effects: []
      },
      {
        minLevel: 10,
        name: 'Veteran',
        colors: {
          badge: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          progress: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
          text: '#8b5cf6',
          glow: '0 0 10px rgba(139, 92, 246, 0.3)'
        },
        effects: ['glow-pulse']
      },
      {
        minLevel: 15,
        name: 'Elite',
        colors: {
          badge: 'linear-gradient(135deg, #f59e0b, #d97706)',
          progress: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
          text: '#f59e0b',
          glow: '0 0 15px rgba(245, 158, 11, 0.4)'
        },
        effects: ['glow-pulse']
      },
      {
        minLevel: 20,
        name: 'lil sigma',
        colors: {
          badge: 'linear-gradient(135deg, #ef4444, #dc2626)',
          progress: 'linear-gradient(90deg, #ef4444, #f87171)',
          text: '#ef4444',
          glow: '0 0 20px rgba(239, 68, 68, 0.5)'
        },
        effects: ['glow-pulse', 'fire-glow']
      },
      {
        minLevel: 30,
        name: 'Cronic Addict',
        colors: {
          badge: 'linear-gradient(135deg, #ec4899, #db2777)',
          progress: 'linear-gradient(90deg, #ec4899, #f472b6)',
          text: '#ec4899',
          glow: '0 0 25px rgba(236, 72, 153, 0.5)'
        },
        effects: ['glow-pulse', 'shimmer']
      },
      {
        minLevel: 50,
        name: 'GRANDMASTER',
        colors: {
          badge: 'linear-gradient(135deg, #14b8a6, #0d9488, #06b6d4)',
          progress: 'linear-gradient(90deg, #14b8a6, #2dd4bf, #06b6d4)',
          text: '#14b8a6',
          glow: '0 0 30px rgba(20, 184, 166, 0.6)'
        },
        effects: ['glow-pulse', 'shimmer', 'rainbow-border']
      },
      {
        minLevel: 100,
        name: 'on joels watch-list',
        colors: {
          badge: 'linear-gradient(135deg, #fbbf24, #f59e0b, #ef4444, #ec4899)',
          progress: 'linear-gradient(90deg, #fbbf24, #f59e0b, #ef4444, #ec4899)',
          text: '#fbbf24',
          glow: '0 0 40px rgba(251, 191, 36, 0.7)'
        },
        effects: ['glow-pulse', 'shimmer', 'rainbow-border', 'legendary']
      },

      {
        minLevel: 200,
        name: 'master gambler',
        colors: {
          badge: 'linear-gradient(135deg, #00ff87, #60efff, #ff00ea, #7b2dff)',
          progress: 'linear-gradient(90deg, #00ff87, #60efff, #ff00ea, #7b2dff)',
          text: '#60efff',
          glow: '0 0 50px rgba(96, 239, 255, 0.8)'
        },
        effects: ['glow-pulse', 'shimmer', 'rainbow-border', 'legendary']
      }
    ];
    
    // Get tier for a given level
    function getTierForLevel(level) {
      let tier = LEVEL_TIERS[0];
      for (const t of LEVEL_TIERS) {
        if (level >= t.minLevel) {
          tier = t;
        } else {
          break;
        }
      }
      return tier;
    }
    
    // Level calculation - each level is 200 XP
    function calculateLevel(totalXP) {
      const xpPerLevel = 200;
      const level = Math.floor(totalXP / xpPerLevel) + 1;
      const currentLevelXP = totalXP % xpPerLevel;
      const progressPercent = (currentLevelXP / xpPerLevel) * 100;
      
      return {
        level,
        currentXP: currentLevelXP,
        xpNeeded: xpPerLevel,
        progressPercent,
        totalXP,
        tier: getTierForLevel(level)
      };
    }
    
    function updateLevelBar(totalXP) {
      const levelData = calculateLevel(totalXP);
      const tier = levelData.tier;
      
      // Get elements
      const container = document.getElementById('levelBarContainer');
      const levelBadge = document.getElementById('levelBadge');
      const levelNumber = document.getElementById('levelNumber');
      const levelRankName = document.getElementById('levelRankName');
      const levelXP = document.getElementById('levelXP');
      const levelProgressFill = document.getElementById('levelProgressFill');
      const levelProgressBar = document.getElementById('levelProgressBar');
      const nextLevel = document.getElementById('nextLevel');
      const levelNextBox = document.getElementById('levelNextBox');
      
      // Update text content
      if (levelNumber) levelNumber.textContent = levelData.level;
      if (levelRankName) {
        levelRankName.textContent = tier.name;
        levelRankName.style.color = tier.colors.text;
      }
      if (levelXP) levelXP.textContent = `${levelData.currentXP} / ${levelData.xpNeeded} XP`;
      if (levelProgressFill) {
        levelProgressFill.style.width = `${levelData.progressPercent}%`;
        levelProgressFill.style.background = tier.colors.progress;
      }
      if (nextLevel) nextLevel.textContent = levelData.level + 1;
      
      // Apply tier colors
      if (levelBadge) {
        levelBadge.style.background = tier.colors.badge;
        levelBadge.style.boxShadow = tier.colors.glow;
      }
      
      // Remove all effect classes and apply new ones
      if (container) {
        container.classList.remove('glow-pulse', 'fire-glow', 'shimmer', 'rainbow-border', 'legendary');
        tier.effects.forEach(effect => container.classList.add(effect));
      }
    }
    
    function updateUI() {
      const user = CasinoAuth.currentUser;
      const balance = CasinoAuth.getBalance();
      const xps = CasinoAuth.getCharges ? CasinoAuth.getCharges() : (CasinoAuth.getXPs ? CasinoAuth.getXPs() : 0);
      
      // Update balance display
      const balanceEl = document.getElementById('userBalance');
      if (balanceEl) {
        balanceEl.textContent = '$' + balance.toFixed(2);
      }
      
      // Update xps display
      const xpsEl = document.getElementById('userXPs');
      if (xpsEl) {
        xpsEl.textContent = '⚡ ' + xps;
      }
      
      // Update level bar
      updateLevelBar(xps);
      
      // Update user info
      const userName = document.getElementById('userName');
      const userEmail = document.getElementById('userEmail');
      const userInitials = document.getElementById('userInitials');
      const signInBtn = document.getElementById('headerSignInBtn');
      
      if (user) {
        if (userName) userName.textContent = user.displayName || 'User';
        if (userEmail) userEmail.textContent = user.email || '';
        if (userInitials) userInitials.textContent = (user.displayName || user.email || '?')[0].toUpperCase();
        if (signInBtn) signInBtn.textContent = 'Sign Out';
        if (signInBtn) {
          signInBtn.onclick = async () => {
            await CasinoAuth.signOut();
            location.reload();
          };
        }
      } else {
        if (userName) userName.textContent = 'Guest';
        if (userEmail) userEmail.textContent = 'Not signed in';
        if (userInitials) userInitials.textContent = '?';
        if (signInBtn) signInBtn.textContent = 'Sign In';
      }
      
      // Update chest progress
      updateChestFromDB();
    }
    
    initCasinoAuth();
    
    // ========================================
    // ONLINE USERS COUNTER
    // ========================================
    async function updateOnlineUsersCount() {
      const countEl = document.getElementById('onlineCount');
      if (!countEl) return;
      
      try {
        const count = await CasinoDB.getOnlineUsersCount(15); // Active in last 15 mins
        countEl.textContent = count;
      } catch (e) {
        // Fallback to random plausible number
        countEl.textContent = Math.floor(Math.random() * 30) + 15;
      }
    }
    
    // Update count on load and every 30 seconds
    setTimeout(updateOnlineUsersCount, 1000);
    setInterval(updateOnlineUsersCount, 30000);
    
    // Update user's last activity when they're on the page
    async function updateUserActivity() {
      if (CasinoAuth.currentUser && CasinoDB.updateLastActivity) {
        await CasinoDB.updateLastActivity();
      }
    }
    
    // Update activity on load and every 5 minutes
    setTimeout(updateUserActivity, 2000);
    setInterval(updateUserActivity, 5 * 60 * 1000);
    
    // ========================================
    // CHEST FUNCTIONALITY
    // ========================================
    const XP_PER_CHEST = 100;
    
    function updateXpChestProgress(totalXP, chestsClaimed = 0) {
      // Calculate how many chests are available based on total XP
      const totalChestsEarned = Math.floor(totalXP / XP_PER_CHEST);
      const availableChests = totalChestsEarned - chestsClaimed;
      
      // Progress towards next chest
      const xpIntoCurrentChest = totalXP % XP_PER_CHEST;
      const progress = (xpIntoCurrentChest / XP_PER_CHEST) * 100;
      
      const progressFill = document.getElementById('xpChestProgress');
      const progressText = document.getElementById('xpChestProgressText');
      const chestBtn = document.getElementById('xpChestBtn');
      const chestInfo = document.querySelector('.xp-chest .chest-info p');
      
      if (progressFill) progressFill.style.width = `${progress}%`;
      if (progressText) progressText.textContent = `${xpIntoCurrentChest} / ${XP_PER_CHEST} XP`;
      
      if (chestBtn) {
        if (availableChests > 0) {
          chestBtn.disabled = false;
          chestBtn.querySelector('.btn-text').textContent = `Open (${availableChests} available)`;
          chestBtn.querySelector('.btn-icon').textContent = '🎁';
          if (chestInfo) chestInfo.textContent = `${availableChests} chest${availableChests > 1 ? 's' : ''} ready to open!`;
        } else {
          chestBtn.disabled = true;
          chestBtn.querySelector('.btn-text').textContent = 'Locked';
          chestBtn.querySelector('.btn-icon').textContent = '🔒';
          if (chestInfo) chestInfo.textContent = `Earn ${XP_PER_CHEST - xpIntoCurrentChest} more XP to unlock`;
        }
      }
    }
    
    // Initialize chest buttons
    function initChests() {
      // Initialize the chest opener overlay
      initChestOpener();
      
      const xpChestBtn = document.getElementById('xpChestBtn');
      const uncommonChestBtn = document.getElementById('uncommonChestBtn');
      const epicChestBtn = document.getElementById('epicChestBtn');
      
      // XP Chest click handler
      if (xpChestBtn) {
        xpChestBtn.addEventListener('click', async () => {
          if (xpChestBtn.disabled) return;
          const result = await openChest('xp');
          if (result.success) {
            // Refresh UI after chest opens
            setTimeout(() => updateUI(), 500);
          }
        });
      }
      
      // Uncommon Chest ($250) click handler
      if (uncommonChestBtn) {
        uncommonChestBtn.addEventListener('click', async () => {
          const result = await openChest('uncommon');
          if (result.success) {
            // Refresh UI after chest opens to show new balance
            setTimeout(() => updateUI(), 500);
          }
        });
      }
      
      // Epic Chest ($1,000) click handler
      if (epicChestBtn) {
        epicChestBtn.addEventListener('click', async () => {
          const result = await openChest('epic');
          if (result.success) {
            // Refresh UI after chest opens to show new balance
            setTimeout(() => updateUI(), 500);
          }
        });
      }
      
      // Update XP chest progress based on current XP and chests claimed
      updateChestFromDB();
    }
    
    async function updateChestFromDB() {
      const user = CasinoAuth.currentUser;
      const xps = CasinoAuth.getCharges ? CasinoAuth.getCharges() : (CasinoAuth.getXPs ? CasinoAuth.getXPs() : 0);
      
      // Get number of XP chests claimed from database (or localStorage as fallback)
      let chestsClaimed = 0;
      try {
        if (user && CasinoDB && CasinoDB.getUser) {
          const userData = await CasinoDB.getUser(user.uid);
          if (userData && typeof userData.xpChestsClaimed === 'number') {
            chestsClaimed = userData.xpChestsClaimed;
          }
        } else {
          // For guests, use localStorage
          chestsClaimed = parseInt(localStorage.getItem('xpChestsClaimed') || '0');
        }
      } catch (e) {
        console.error('Error getting chest data:', e);
        chestsClaimed = parseInt(localStorage.getItem('xpChestsClaimed') || '0');
      }
      
      console.log('XP Chest Debug:', { xps, chestsClaimed, totalEarned: Math.floor(xps / XP_PER_CHEST), available: Math.floor(xps / XP_PER_CHEST) - chestsClaimed });
      updateXpChestProgress(xps, chestsClaimed);
    }
    
    // Initialize chests when DOM is ready
    setTimeout(initChests, 500);
    
    // ========================================
    // SESSION CLEANUP ON PAGE UNLOAD
    // ========================================
    window.addEventListener('beforeunload', async (e) => {
      // End any active session when leaving the casino page
      if (CasinoDB.activeSessionId) {
        // Use sendBeacon for reliable async request on page unload
        navigator.sendBeacon && console.log('Ending session on page unload');
        // Note: endGameSession will be called, but may not complete
        // That's why we have the checkAbandonedSessions on page load
      }
    });
    
    // Session activity keepalive (every 2 minutes)
    setInterval(async () => {
      if (CasinoDB.activeSessionId) {
        await CasinoDB.updateSessionActivity();
      }
    }, 2 * 60 * 1000);