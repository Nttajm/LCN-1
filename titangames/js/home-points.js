/**
 * Home Page Points Display & Leaderboard
 * Shows today's leaderboard and user's position
 */

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getTodayStats, getTodayLeaderboard, getCurrentUser, getTodayDateStr, syncPendingGames } from "./points.js";

let currentUser = null;

function getTodayDateFormatted() {
    const today = new Date();
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return today.toLocaleDateString('en-US', options).toUpperCase();
}

// ── Popup helpers ────────────────────────────────────────────────

const COLOR_MAP = { correct: 'correct', present: 'present', absent: 'absent' };

function computeNerdleColors(boardState, target) {
    if (!Array.isArray(boardState) || !target) return [];
    const rows = [];
    for (const guess of boardState) {
        if (typeof guess !== 'string') continue;
        const len = target.length;
        const colors = Array(len).fill('absent');
        const targetArr = target.split('');
        const guessArr = guess.split('');
        for (let i = 0; i < len; i++) {
            if (guessArr[i] === targetArr[i]) {
                colors[i] = 'correct';
                targetArr[i] = null;
            }
        }
        for (let i = 0; i < len; i++) {
            if (colors[i] === 'correct') continue;
            const idx = targetArr.indexOf(guessArr[i]);
            if (idx !== -1) { colors[i] = 'present'; targetArr[idx] = null; }
        }
        rows.push(colors);
    }
    return rows;
}

function buildNerdleMiniGrid(nerdleData) {
    const wrapper = document.createElement('div');
    wrapper.className = 'popup-game popup-nerdle';

    const label = document.createElement('div');
    label.className = 'popup-game-label';
    label.textContent = 'nerdle';
    wrapper.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'mini-grid';

    const ROWS = 6, COLS = 5;
    const colorRows = nerdleData
        ? computeNerdleColors(nerdleData.boardState || [], nerdleData.word || '')
        : [];

    for (let r = 0; r < ROWS; r++) {
        const rowEl = document.createElement('div');
        rowEl.className = 'mini-grid-row';
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'mini-cell';
            if (colorRows[r] && colorRows[r][c]) {
                cell.classList.add(colorRows[r][c]);
            }
            rowEl.appendChild(cell);
        }
        grid.appendChild(rowEl);
    }
    wrapper.appendChild(grid);
    return wrapper;
}

function buildRelationsDots(relationsData) {
    const wrapper = document.createElement('div');
    wrapper.className = 'popup-game popup-relations';

    const label = document.createElement('div');
    label.className = 'popup-game-label';
    label.textContent = 'relations';
    wrapper.appendChild(label);

    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'relations-dots';

    if (!relationsData) {
        const nd = document.createElement('span');
        nd.className = 'popup-no-data';
        nd.textContent = '—';
        dotsWrap.appendChild(nd);
        wrapper.appendChild(dotsWrap);
        return wrapper;
    }

    const mistakes = relationsData.mistakes || 0;
    const categoryColors = relationsData.categoryColors || [];
    const solved = categoryColors.length > 0 ? categoryColors.length : (relationsData.won ? 4 : 0);

    // Solved category row
    if (solved > 0) {
        const solvedRow = document.createElement('div');
        solvedRow.className = 'relations-dot-row';
        for (let i = 0; i < solved; i++) {
            const dot = document.createElement('div');
            dot.className = 'rdot solved';
            if (categoryColors[i]) dot.style.background = categoryColors[i];
            solvedRow.appendChild(dot);
        }
        dotsWrap.appendChild(solvedRow);
    }

    // Mistake row
    if (mistakes > 0) {
        const mistakeRow = document.createElement('div');
        mistakeRow.className = 'relations-dot-row';
        for (let i = 0; i < mistakes; i++) {
            const dot = document.createElement('div');
            dot.className = 'rdot mistake';
            mistakeRow.appendChild(dot);
        }
        dotsWrap.appendChild(mistakeRow);
    }

    if (solved === 0 && mistakes === 0) {
        const nd = document.createElement('span');
        nd.className = 'popup-no-data';
        nd.textContent = '—';
        dotsWrap.appendChild(nd);
    }

    wrapper.appendChild(dotsWrap);
    return wrapper;
}

function buildPlayerPopup() {
    const popup = document.createElement('div');
    popup.className = 'player-popup';
    return popup;
}

async function fetchPlayerGames(uid) {
    const dateStr = getTodayDateStr();
    try {
        const snap = await getDoc(doc(db, 'titangames_submissions', dateStr, 'users', uid));
        if (snap.exists()) return snap.data().games || {};
    } catch (e) { /* ignore */ }
    return {};
}

let activePopup = null;

async function togglePlayerPopup(wrapper, uid) {
    // Close any open popup
    if (activePopup && activePopup !== wrapper.querySelector('.player-popup')) {
        activePopup.classList.remove('open');
    }

    const popup = wrapper.querySelector('.player-popup');
    if (!popup) return;

    if (popup.classList.contains('open')) {
        popup.classList.remove('open');
        activePopup = null;
        return;
    }

    // Show loading state
    popup.innerHTML = '';
    popup.classList.add('open');
    activePopup = popup;

    const games = await fetchPlayerGames(uid);

    popup.innerHTML = '';
    popup.appendChild(buildNerdleMiniGrid(games.nerdle || null));
    popup.appendChild(buildRelationsDots(games.relations || null));
}

// ── Row creation ─────────────────────────────────────────────────

function createLeaderboardRow(entry, rank, isCurrentUser = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'leaderboard-row-wrapper';

    const row = document.createElement('div');
    row.className = `leaderboard-row leaderboard-row--data${isCurrentUser ? ' leaderboard-row--highlight' : ''}`;
    row.style.cursor = 'pointer';

    const rankClass = rank <= 3 ? ` rank-${rank}` : '';

    row.innerHTML = `
        <span class="leaderboard-col leaderboard-col--rank${rankClass}">${rank}</span>
        <span class="leaderboard-col leaderboard-col--name">${entry.displayName || 'Player'}</span>
        <span class="leaderboard-col leaderboard-col--pts">${entry.points}</span>
        <span class="leaderboard-col leaderboard-col--games">${entry.gamesPlayed}</span>
    `;

    const popup = buildPlayerPopup();
    wrapper.appendChild(row);
    wrapper.appendChild(popup);

    if (entry.uid) {
        row.addEventListener('click', () => togglePlayerPopup(wrapper, entry.uid));
    }

    return wrapper;
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
    
    const isGuest = !currentUser || currentUser.isAnonymous;

    if (isGuest) {
        if (headerPoints) headerPoints.classList.remove('visible');
        hideAllGameBadges();
    }
    
    try {
        const leaderboardPromise = getTodayLeaderboard(100);
        const userStatsPromise = !isGuest ? getTodayStats() : Promise.resolve(null);
        const [leaderboard, userStats] = await Promise.all([leaderboardPromise, userStatsPromise]);
        
        if (!isGuest && userStats) {
            if (headerPoints) {
                headerPoints.textContent = `${userStats.totalPoints} pts`;
                headerPoints.classList.add('visible');
            }
            updateGameBadges(userStats.games);
        }
        
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
        
        const userRank = !isGuest ? leaderboard.findIndex(e => e.uid === currentUser.uid) + 1 : 0;
        const top5 = leaderboard.slice(0, 5);
        
        top5.forEach((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = !isGuest && entry.uid === currentUser.uid;
            leaderboardBody.appendChild(createLeaderboardRow(entry, rank, isCurrentUser));
        });
        
        if (leaderboardUser) {
            if (!isGuest && userRank > 5) {
                leaderboardUser.classList.add('visible');
                leaderboardUser.innerHTML = '';
                leaderboardUser.appendChild(createDivider());
                
                const userEntry = leaderboard[userRank - 1];
                leaderboardUser.appendChild(createLeaderboardRow(userEntry, userRank, true));
            } else if (!isGuest && userRank === 0 && userStats && userStats.totalPoints > 0) {
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
    if (!user) {
        try { await signInAnonymously(auth); } catch (e) { /* ignore */ }
        return;
    }
    currentUser = user;
    if (!user.isAnonymous) {
        await syncPendingGames();
    }
    await updateLeaderboardDisplay();
});

document.addEventListener('DOMContentLoaded', () => {
    updateLeaderboardDisplay();
});

export { updateLeaderboardDisplay };
