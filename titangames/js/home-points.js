/**
 * Home Page Points Display & Leaderboard
 * Shows today's leaderboard and user's position
 */

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getTodayStats, getTodayLeaderboard, getCurrentUser } from "./points.js";

let currentUser = null;

function getTodayDateFormatted() {
    const today = new Date();
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return today.toLocaleDateString('en-US', options).toUpperCase();
}

function createLeaderboardRow(entry, rank, isCurrentUser = false) {
    const row = document.createElement('div');
    row.className = `leaderboard-row leaderboard-row--data${isCurrentUser ? ' leaderboard-row--highlight' : ''}`;
    
    const rankClass = rank <= 3 ? ` rank-${rank}` : '';
    
    row.innerHTML = `
        <span class="leaderboard-col leaderboard-col--rank${rankClass}">${rank}</span>
        <span class="leaderboard-col leaderboard-col--name">${entry.displayName || 'Player'}</span>
        <span class="leaderboard-col leaderboard-col--pts">${entry.points}</span>
        <span class="leaderboard-col leaderboard-col--games">${entry.gamesPlayed}</span>
    `;
    
    return row;
}

function createDivider() {
    const divider = document.createElement('div');
    divider.className = 'leaderboard-divider';
    divider.innerHTML = '<span>• • •</span>';
    return divider;
}

async function updateLeaderboardDisplay() {
    const leaderboardBody = document.getElementById('leaderboardBody');
    const leaderboardDate = document.getElementById('leaderboardDate');
    const leaderboardUser = document.getElementById('leaderboardUser');
    const headerPoints = document.getElementById('headerPoints');
    
    if (leaderboardDate) {
        leaderboardDate.textContent = getTodayDateFormatted();
    }
    
    if (!currentUser) {
        if (leaderboardBody) {
            leaderboardBody.innerHTML = '<div class="leaderboard-empty">Sign in to see the leaderboard</div>';
        }
        if (leaderboardUser) {
            leaderboardUser.classList.remove('visible');
            leaderboardUser.innerHTML = '';
        }
        if (headerPoints) headerPoints.classList.remove('visible');
        hideAllGameBadges();
        return;
    }
    
    try {
        const [leaderboard, userStats] = await Promise.all([
            getTodayLeaderboard(100),
            getTodayStats()
        ]);
        
        if (headerPoints) {
            headerPoints.textContent = `${userStats.totalPoints} pts`;
            headerPoints.classList.add('visible');
        }
        
        updateGameBadges(userStats.games);
        
        if (!leaderboardBody) return;
        
        leaderboardBody.innerHTML = '';
        
        if (leaderboard.length === 0) {
            leaderboardBody.innerHTML = '<div class="leaderboard-empty">No submissions yet today</div>';
            if (leaderboardUser) {
                leaderboardUser.classList.remove('visible');
                leaderboardUser.innerHTML = '';
            }
            return;
        }
        
        const userRank = leaderboard.findIndex(e => e.uid === currentUser.uid) + 1;
        const top5 = leaderboard.slice(0, 5);
        const userInTop5 = userRank > 0 && userRank <= 5;
        
        top5.forEach((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.uid === currentUser.uid;
            leaderboardBody.appendChild(createLeaderboardRow(entry, rank, isCurrentUser));
        });
        
        if (leaderboardUser) {
            if (userRank > 5) {
                leaderboardUser.classList.add('visible');
                leaderboardUser.innerHTML = '';
                leaderboardUser.appendChild(createDivider());
                
                const userEntry = leaderboard[userRank - 1];
                leaderboardUser.appendChild(createLeaderboardRow(userEntry, userRank, true));
            } else if (userRank === 0 && userStats.totalPoints > 0) {
                leaderboardUser.classList.add('visible');
                leaderboardUser.innerHTML = '';
                leaderboardUser.appendChild(createDivider());
                
                const userEntry = {
                    displayName: currentUser.displayName || 'You',
                    points: userStats.totalPoints,
                    gamesPlayed: userStats.gamesPlayed
                };
                leaderboardUser.appendChild(createLeaderboardRow(userEntry, '—', true));
            } else {
                leaderboardUser.classList.remove('visible');
                leaderboardUser.innerHTML = '';
            }
        }
        
    } catch (err) {
        console.error('Error updating leaderboard:', err);
        if (leaderboardBody) {
            leaderboardBody.innerHTML = '<div class="leaderboard-empty">Unable to load leaderboard</div>';
        }
    }
}

function updateGameBadges(games) {
    const gameBadges = {
        nerdle: document.getElementById('nerdlePoints'),
        relations: document.getElementById('relationsPoints'),
        crossword: document.getElementById('crosswordPoints')
    };
    
    for (const [gameName, badge] of Object.entries(gameBadges)) {
        if (!badge) continue;
        
        if (games && games[gameName] && games[gameName].isCompleted) {
            const pts = games[gameName].points || 0;
            badge.textContent = `✓ ${pts} pts`;
            badge.classList.add('visible', 'completed');
        } else {
            badge.classList.remove('visible', 'completed');
        }
    }
}

function hideAllGameBadges() {
    const badges = ['nerdlePoints', 'relationsPoints', 'crosswordPoints'];
    badges.forEach(id => {
        const badge = document.getElementById(id);
        if (badge) {
            badge.classList.remove('visible', 'completed');
        }
    });
}

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    await updateLeaderboardDisplay();
});

document.addEventListener('DOMContentLoaded', () => {
    updateLeaderboardDisplay();
});

export { updateLeaderboardDisplay };
