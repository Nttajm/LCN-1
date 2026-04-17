/**
 * Home Page Points Display
 * Shows user's today's points and game completion status on the home page
 */

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getTodayStats } from "./points.js";

let currentUser = null;

/**
 * Update all points displays on the home page
 */
async function updateHomePointsDisplay() {
    const headerPoints = document.getElementById('headerPoints');
    const pointsDashboard = document.getElementById('pointsDashboard');
    const dashboardPoints = document.getElementById('dashboardPoints');
    const dashboardGames = document.getElementById('dashboardGames');
    
    if (!currentUser) {
        // User not logged in - hide points displays
        if (headerPoints) headerPoints.classList.remove('visible');
        if (pointsDashboard) pointsDashboard.classList.remove('visible');
        hideAllGameBadges();
        return;
    }
    
    try {
        const stats = await getTodayStats();
        const { totalPoints, gamesPlayed, games } = stats;
        
        // Update header points
        if (headerPoints) {
            headerPoints.textContent = `${totalPoints} pts`;
            headerPoints.classList.add('visible');
        }
        
        // Update dashboard
        if (pointsDashboard && dashboardPoints && dashboardGames) {
            dashboardPoints.textContent = totalPoints;
            dashboardGames.textContent = `${gamesPlayed} game${gamesPlayed !== 1 ? 's' : ''} played today`;
            pointsDashboard.classList.add('visible');
        }
        
        // Update individual game badges
        updateGameBadges(games);
        
    } catch (err) {
        console.error('Error updating points display:', err);
        // Show 0 points on error
        if (headerPoints) {
            headerPoints.textContent = '0 pts';
            headerPoints.classList.add('visible');
        }
        if (pointsDashboard && dashboardPoints && dashboardGames) {
            dashboardPoints.textContent = '0';
            dashboardGames.textContent = '0 games played today';
            pointsDashboard.classList.add('visible');
        }
    }
}

/**
 * Update game card badges to show completion status and points
 */
function updateGameBadges(games) {
    const gameBadges = {
        nerdle: document.getElementById('nerdlePoints'),
        connections: document.getElementById('connectionsPoints'),
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

/**
 * Hide all game badges
 */
function hideAllGameBadges() {
    const badges = ['nerdlePoints', 'connectionsPoints', 'crosswordPoints'];
    badges.forEach(id => {
        const badge = document.getElementById(id);
        if (badge) {
            badge.classList.remove('visible', 'completed');
        }
    });
}

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    await updateHomePointsDisplay();
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    // Will be updated when auth state changes
});

// Export for potential external use
export { updateHomePointsDisplay };
