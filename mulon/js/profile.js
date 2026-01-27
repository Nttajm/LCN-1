// ========================================
// MULON USER PROFILE VIEWER
// Uses session data to show detailed user stats
// ========================================

import { CasinoAuth, CasinoDB } from '../casino/js/casino-auth.js';

// Game icons mapping
const GAME_ICONS = {
  'plinko': '🎯',
  'gems': '💎',
  'roulette': '🎰',
  'dragon-tower': '🐉',
  'default': '🎮'
};

// Level tier data (same as casino.html)
const LEVEL_TIERS = [
  { minLevel: 1, name: 'Grass toucher', colors: { text: '#6b7280' } },
  { minLevel: 3, name: 'Rookie', colors: { text: '#22c55e' } },
  { minLevel: 5, name: 'pocket aces', colors: { text: '#3b82f6' } },
  { minLevel: 10, name: 'Veteran', colors: { text: '#8b5cf6' } },
  { minLevel: 15, name: 'Elite', colors: { text: '#f59e0b' } },
  { minLevel: 20, name: 'lil sigma', colors: { text: '#ef4444' } },
  { minLevel: 30, name: 'Cronic Addict', colors: { text: '#ec4899' } },
  { minLevel: 50, name: 'GRANDMASTER', colors: { text: '#14b8a6' } },
  { minLevel: 100, name: 'on joels watch-list', colors: { text: '#fbbf24' } }
];

function getTierForLevel(level) {
  let tier = LEVEL_TIERS[0];
  for (const t of LEVEL_TIERS) {
    if (level >= t.minLevel) tier = t;
    else break;
  }
  return tier;
}

function calculateLevel(totalXP) {
  const xpPerLevel = 200;
  const level = Math.floor(totalXP / xpPerLevel) + 1;
  return { level, totalXP, tier: getTierForLevel(level) };
}

// Get user ID from URL
function getUserIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// Format functions
function formatBalance(amount) {
  return '$' + amount.toFixed(2);
}

function formatProfit(amount) {
  const prefix = amount >= 0 ? '+' : '';
  return prefix + '$' + amount.toFixed(2);
}

function formatDuration(milliseconds) {
  const minutes = Math.floor(milliseconds / 60000);
  if (minutes < 60) return minutes + 'm';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours + 'h ' + mins + 'm';
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return days + 'd ago';
  if (hours > 0) return hours + 'h ago';
  if (minutes > 0) return minutes + 'm ago';
  return 'Just now';
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Show/hide states
function showLoading() {
  document.getElementById('loadingState').style.display = 'flex';
  document.getElementById('errorState').style.display = 'none';
  document.getElementById('profileContainer').style.display = 'none';
}

function showError() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display = 'flex';
  document.getElementById('profileContainer').style.display = 'none';
}

function showProfile() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display = 'none';
  document.getElementById('profileContainer').style.display = 'block';
}

// Load and display profile
async function loadProfile() {
  const userId = getUserIdFromURL();
  
  if (!userId) {
    showError();
    return;
  }
  
  showLoading();
  
  try {
    // Load user data
    const userData = await CasinoDB.getUser(userId);
    if (!userData) {
      showError();
      return;
    }
    
    // Load session stats
    const sessionStats = await CasinoDB.getSessionStats(userId);
    
    // Load recent sessions
    const recentSessions = await CasinoDB.getGameSessions({ userId, limit: 10 });
    
    // Render profile
    renderProfile(userData, sessionStats, recentSessions);
    showProfile();
    
  } catch (error) {
    console.error('Error loading profile:', error);
    showError();
  }
}

// Render profile banner
function renderProfile(userData, sessionStats, recentSessions) {
  // Calculate level
  const levelData = calculateLevel(userData.xps || 0);
  
  // Profile banner
  const profileName = document.getElementById('profileName');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileInitials = document.getElementById('profileInitials');
  const profileLevelBadge = document.getElementById('profileLevelBadge');
  const profileLevelName = document.getElementById('profileLevelName');
  const profileLevelXP = document.getElementById('profileLevelXP');
  
  profileName.textContent = userData.displayName || 'Anonymous User';
  profileInitials.textContent = getInitials(userData.displayName);
  profileLevelBadge.textContent = levelData.level;
  profileLevelName.textContent = levelData.tier.name;
  profileLevelName.style.color = levelData.tier.colors.text;
  profileLevelXP.textContent = (userData.xps || 0) + ' XP';
  
  // Handle avatar
  if (userData.photoURL) {
    profileAvatar.innerHTML = `<img src="${userData.photoURL}" alt="${userData.displayName}"><div class="level-badge-large" id="profileLevelBadge">${levelData.level}</div>`;
  } else if (userData.avatarStyle && userData.avatarStyle.startsWith('gradient')) {
    const gradients = {
      'gradient1': 'linear-gradient(135deg, #667eea, #764ba2)',
      'gradient2': 'linear-gradient(135deg, #11998e, #38ef7d)',
      'gradient3': 'linear-gradient(135deg, #fc4a1a, #f7b733)',
      'gradient4': 'linear-gradient(135deg, #141e30, #243b55)',
      'gradient5': 'linear-gradient(135deg, #ff9a9e, #fecfef)',
      'gradient6': 'linear-gradient(135deg, #00c853, #00e676)',
      'gradient7': 'linear-gradient(135deg, #232526, #414345)'
    };
    profileAvatar.style.background = gradients[userData.avatarStyle] || gradients['gradient1'];
  }
  
  // Quick stats
  document.getElementById('profileBalance').textContent = formatBalance(userData.balance || 500);
  
  const profit = sessionStats ? sessionStats.netProfit : 0;
  const profitEl = document.getElementById('profileProfit');
  profitEl.textContent = formatProfit(profit);
  profitEl.className = 'quick-stat-value ' + (profit >= 0 ? 'profit' : 'loss');
  
  document.getElementById('profileGamesPlayed').textContent = sessionStats ? sessionStats.totalGamesPlayed : 0;
  
  // Session overview
  if (sessionStats) {
    document.getElementById('totalSessions').textContent = sessionStats.totalSessions;
    document.getElementById('activeSessions').textContent = sessionStats.activeSessions;
    document.getElementById('totalWagered').textContent = formatBalance(sessionStats.totalWagered);
    document.getElementById('totalWon').textContent = formatBalance(sessionStats.totalWon);
    
    const netProfitEl = document.getElementById('netProfit');
    netProfitEl.textContent = formatProfit(sessionStats.netProfit);
    netProfitEl.className = 'stat-value ' + (sessionStats.netProfit >= 0 ? 'profit' : 'loss');
    
    document.getElementById('winRate').textContent = sessionStats.winRate.toFixed(1) + '%';
  }
  
  // Best performances
  renderBestPerformances(sessionStats, recentSessions);
  
  // Favorite game
  renderFavoriteGame(sessionStats);
  
  // Games breakdown
  renderGamesBreakdown(sessionStats);
  
  // Recent sessions
  renderRecentSessions(recentSessions);
}

// Render best performances
function renderBestPerformances(sessionStats, recentSessions) {
  let biggestWin = 0;
  let biggestLoss = 0;
  let longestStreak = 0;
  let bestSessionProfit = 0;
  
  if (sessionStats && sessionStats.gameBreakdown) {
    Object.values(sessionStats.gameBreakdown).forEach(game => {
      if (game.netProfit > bestSessionProfit) {
        bestSessionProfit = game.netProfit;
      }
    });
  }
  
  if (recentSessions) {
    recentSessions.forEach(session => {
      if (session.biggestWin > biggestWin) biggestWin = session.biggestWin;
      if (session.biggestLoss > biggestLoss) biggestLoss = session.biggestLoss;
      if (session.longestWinStreak > longestStreak) longestStreak = session.longestWinStreak;
      if (session.netProfit > bestSessionProfit) bestSessionProfit = session.netProfit;
    });
  }
  
  document.getElementById('biggestWin').textContent = formatBalance(biggestWin);
  document.getElementById('biggestLoss').textContent = formatBalance(biggestLoss);
  document.getElementById('longestStreak').textContent = longestStreak;
  document.getElementById('bestSession').textContent = formatProfit(bestSessionProfit);
  
  const avgDuration = sessionStats && sessionStats.avgSessionDuration 
    ? formatDuration(sessionStats.avgSessionDuration)
    : '0m';
  document.getElementById('avgDuration').textContent = avgDuration;
}

// Render favorite game
function renderFavoriteGame(sessionStats) {
  const favoriteGameCard = document.getElementById('favoriteGameCard');
  const favoriteGameIcon = document.getElementById('favoriteGameIcon');
  const favoriteGameName = document.getElementById('favoriteGameName');
  const favoriteGameSessions = document.getElementById('favoriteGameSessions');
  const favoriteGameProfit = document.getElementById('favoriteGameProfit');
  
  if (!sessionStats || !sessionStats.favoriteGame) {
    favoriteGameName.textContent = 'No games played yet';
    favoriteGameSessions.textContent = '0 sessions';
    favoriteGameProfit.textContent = '$0';
    return;
  }
  
  const favGame = sessionStats.favoriteGame;
  const gameBreakdown = sessionStats.gameBreakdown[favGame];
  
  favoriteGameIcon.textContent = GAME_ICONS[favGame] || GAME_ICONS.default;
  favoriteGameName.textContent = favGame.charAt(0).toUpperCase() + favGame.slice(1);
  favoriteGameSessions.textContent = gameBreakdown.sessions + ' sessions';
  
  const profit = gameBreakdown.netProfit;
  favoriteGameProfit.textContent = formatProfit(profit);
  favoriteGameProfit.style.color = profit >= 0 ? '#22c55e' : '#ef4444';
}

// Render games breakdown
function renderGamesBreakdown(sessionStats) {
  const gamesBreakdown = document.getElementById('gamesBreakdown');
  
  if (!sessionStats || !sessionStats.gameBreakdown || Object.keys(sessionStats.gameBreakdown).length === 0) {
    gamesBreakdown.innerHTML = `
      <div class="empty-games">
        <div class="empty-games-icon">🎮</div>
        <p>No games played yet</p>
      </div>
    `;
    return;
  }
  
  const games = Object.entries(sessionStats.gameBreakdown);
  
  gamesBreakdown.innerHTML = games.map(([gameName, stats]) => {
    const icon = GAME_ICONS[gameName] || GAME_ICONS.default;
    const displayName = gameName.charAt(0).toUpperCase() + gameName.slice(1);
    const profit = stats.netProfit;
    const profitClass = profit >= 0 ? 'win' : 'loss';
    
    return `
      <div class="game-breakdown-card">
        <div class="game-breakdown-header">
          <div class="game-breakdown-icon">${icon}</div>
          <div class="game-breakdown-name">${displayName}</div>
        </div>
        <div class="game-breakdown-stats">
          <div class="game-stat-row">
            <span>Sessions</span>
            <span>${stats.sessions}</span>
          </div>
          <div class="game-stat-row">
            <span>Games</span>
            <span>${stats.gamesPlayed}</span>
          </div>
          <div class="game-stat-row">
            <span>Wagered</span>
            <span>${formatBalance(stats.totalWagered)}</span>
          </div>
          <div class="game-stat-row">
            <span>Won</span>
            <span>${formatBalance(stats.totalWon)}</span>
          </div>
          <div class="game-stat-row">
            <span>Net Profit</span>
            <span class="${profitClass}">${formatProfit(profit)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Render recent sessions
function renderRecentSessions(recentSessions) {
  const sessionsList = document.getElementById('recentSessions');
  
  if (!recentSessions || recentSessions.length === 0) {
    sessionsList.innerHTML = `
      <div class="empty-sessions">
        <div class="empty-sessions-icon">📊</div>
        <p>No sessions yet</p>
      </div>
    `;
    return;
  }
  
  sessionsList.innerHTML = recentSessions.map(session => {
    const icon = GAME_ICONS[session.gameName] || GAME_ICONS.default;
    const displayName = session.gameName.charAt(0).toUpperCase() + session.gameName.slice(1);
    const statusClass = session.status || 'ended';
    const statusText = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
    
    const profit = session.netProfit || 0;
    const profitClass = profit >= 0 ? 'profit' : 'loss';
    
    const duration = session.startedAt && session.endedAt
      ? formatDuration(session.endedAt.toMillis() - session.startedAt.toMillis())
      : 'Active';
    
    const timeAgo = formatTimeAgo(session.startedAt);
    
    return `
      <div class="session-item">
        <div class="session-game-icon">${icon}</div>
        <div class="session-info">
          <div class="session-details">
            <div class="session-game-name">${displayName}</div>
            <div class="session-meta">
              <span>${timeAgo}</span>
              <span>•</span>
              <span>${duration}</span>
              <span>•</span>
              <span class="session-status ${statusClass}">${statusText}</span>
            </div>
          </div>
          <div class="session-stats-grid">
            <div class="session-stat">
              <div class="session-stat-label">Games</div>
              <div class="session-stat-value">${session.gamesPlayed || 0}</div>
            </div>
            <div class="session-stat">
              <div class="session-stat-label">Wagered</div>
              <div class="session-stat-value">${formatBalance(session.totalWagered || 0)}</div>
            </div>
            <div class="session-stat">
              <div class="session-stat-label">Won</div>
              <div class="session-stat-value">${formatBalance(session.totalWon || 0)}</div>
            </div>
            <div class="session-stat">
              <div class="session-stat-label">Profit</div>
              <div class="session-stat-value ${profitClass}">${formatProfit(profit)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Auth UI
function setupAuth() {
  const userMenu = document.getElementById('userMenu');
  const userDropdown = document.getElementById('userDropdown');
  const userAvatar = document.getElementById('userAvatar');
  const userInitials = document.getElementById('userInitials');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const headerSignInBtn = document.getElementById('headerSignInBtn');
  
  userAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
  });
  
  document.addEventListener('click', () => {
    userDropdown.classList.remove('show');
  });
  
  headerSignInBtn.addEventListener('click', async () => {
    await CasinoAuth.signIn();
  });
  
  CasinoAuth.onAuthStateChange(async (user) => {
    // Check ban status on every auth state change
    if (typeof window.checkBanStatus === 'function') {
      const isBanned = await window.checkBanStatus();
      if (isBanned) return; // Stop if banned
    }
    
    if (user) {
      userName.textContent = user.displayName || 'User';
      userEmail.textContent = user.email || '';
      userInitials.textContent = getInitials(user.displayName);
      headerSignInBtn.textContent = 'Sign Out';
      headerSignInBtn.onclick = async () => {
        await CasinoAuth.signOut();
        location.reload();
      };
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Check ban status on page load
  if (typeof window.checkBanStatus === 'function') {
    const isBanned = await window.checkBanStatus();
    if (isBanned) return; // Stop if banned
  }
  
  await CasinoAuth.init();
  setupAuth();
  await loadProfile();
});
