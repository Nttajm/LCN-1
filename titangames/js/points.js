/**
 * Titan Games Points System
 * 
 * Database Structure:
 * - titangames_submissions (collection)
 *   - {date} (daily collection, e.g., "2026-04-16")
 *     - {userId} (document)
 *       - games: { nerdle: {...}, relations: {...} }
 *       - totalPoints: number
 *       - gamesPlayed: number
 *       - completedAt: timestamp
 * 
 * - titan_users (collection)
 *   - {userId} (document)
 *     - submissions (subcollection)
 *       - {date} (reference to daily submission)
 *     - stats: { totalPoints, gamesPlayed, ... }
 * 
 * - titan_leaderboard (collection)
 *   - daily_{date} (document)
 *     - entries: [{ uid, displayName, points, gamesPlayed }]
 */

import { db, auth } from "./firebase.js";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    increment,
    arrayUnion,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Current user state
let currentUser = null;
let _prevUserId = null;

// ── Pending game sync (guest → logged-in) ──────────────────────────────────
const PENDING_GAMES_KEY = 'titan_pending_games';

function savePendingGame(gameName, points, metadata, dateStr) {
    try {
        const raw = localStorage.getItem(PENDING_GAMES_KEY);
        const pending = raw ? JSON.parse(raw) : [];
        // One entry per game per date
        const filtered = pending.filter(p => !(p.gameName === gameName && p.dateStr === dateStr));
        filtered.push({ gameName, points, metadata, dateStr });
        localStorage.setItem(PENDING_GAMES_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error('Error saving pending game:', e);
    }
}

export async function syncPendingGames() {
    if (!currentUser || currentUser.isAnonymous) return;
    try {
        const raw = localStorage.getItem(PENDING_GAMES_KEY);
        if (!raw) return;
        const pending = JSON.parse(raw);
        if (!pending.length) return;
        const todayStr = getTodayDateStr();
        for (const entry of pending) {
            if (entry.dateStr !== todayStr) continue;
            await submitGameCompletion(entry.gameName, entry.points, entry.metadata || {});
        }
        localStorage.removeItem(PENDING_GAMES_KEY);
    } catch (e) {
        console.error('Error syncing pending games:', e);
    }
}
// ────────────────────────────────────────────────────────────────────────────

onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayDateStr() {
    const today = new Date();
    return today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');
}

/**
 * Get current user
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Check if user has completed a specific game today
 * @param {string} gameName - Name of the game (e.g., 'nerdle', 'relations')
 * @returns {Promise<{completed: boolean, data: object|null}>}
 */
export async function checkGameCompletion(gameName) {
    if (!currentUser) {
        return { completed: false, data: null };
    }

    const dateStr = getTodayDateStr();
    const submissionRef = doc(db, 'titangames_submissions', dateStr, 'users', currentUser.uid);

    try {
        const snap = await getDoc(submissionRef);
        if (snap.exists()) {
            const data = snap.data();
            if (data.games && data.games[gameName]) {
                return {
                    completed: true,
                    data: data.games[gameName]
                };
            }
        }
        return { completed: false, data: null };
    } catch (err) {
        console.error('Error checking game completion:', err);
        return { completed: false, data: null };
    }
}

/**
 * Submit game completion with points
 * @param {string} gameName - Name of the game
 * @param {number} points - Points earned
 * @param {object} metadata - Additional game data (attempts, won, etc.)
 * @returns {Promise<{success: boolean, totalPoints: number}>}
 */
async function claimGameBonus(dateStr, gameName) {
    const leaderboardRef = doc(db, 'titan_leaderboard', `daily_${dateStr}`);
    let position = null;
    let multiplier = 1;
    try {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(leaderboardRef);
            const counts = snap.exists() ? (snap.data().gameFinishCounts || {}) : {};
            const n = counts[gameName] || 0;
            if (n === 0) { position = 1; multiplier = 3; }
            else if (n === 1) { position = 2; multiplier = 2; }
            else if (n === 2) { position = 3; multiplier = 1.5; }
            if (snap.exists()) {
                tx.update(leaderboardRef, { [`gameFinishCounts.${gameName}`]: n + 1 });
            } else {
                tx.set(leaderboardRef, {
                    date: dateStr,
                    entries: [],
                    gameFinishCounts: { [gameName]: 1 },
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp()
                });
            }
        });
    } catch (err) {
        console.error('Error claiming game bonus:', err);
    }
    return { position, multiplier };
}

export async function submitGameCompletion(gameName, points, metadata = {}) {
    if (!currentUser || currentUser.isAnonymous) {
        const dateStr = getTodayDateStr();
        savePendingGame(gameName, points, metadata, dateStr);
        return { success: false, pendingSaved: true, error: 'not_logged_in' };
    }

    const dateStr = getTodayDateStr();
    const userId = currentUser.uid;

    // Daily submission document path
    const dailySubmissionRef = doc(db, 'titangames_submissions', dateStr, 'users', userId);
    
    // User's submission history reference
    const userSubmissionRef = doc(db, 'titan_users', userId, 'submissions', dateStr);
    
    // Leaderboard reference
    const leaderboardRef = doc(db, 'titan_leaderboard', `daily_${dateStr}`);

    try {
        // Check if already submitted today
        const existingSnap = await getDoc(dailySubmissionRef);
        let existingData = existingSnap.exists() ? existingSnap.data() : null;

        // Check if this specific game was already completed
        if (existingData?.games?.[gameName]?.isCompleted) {
            return {
                success: false,
                totalPoints: existingData.totalPoints || 0,
                error: 'already_completed'
            };
        }

        const { position: bonusPosition, multiplier: bonusMultiplier } = await claimGameBonus(dateStr, gameName);
        const finalPoints = points > 0 ? Math.round(points * bonusMultiplier) : 0;

        const gameSubmission = {
            points: finalPoints,
            basePoints: points,
            bonusMultiplier,
            bonusPosition,
            isCompleted: true,
            completedAt: serverTimestamp(),
            ...metadata
        };

        // Calculate new totals
        const previousTotal = existingData?.totalPoints || 0;
        const previousGamesPlayed = existingData?.gamesPlayed || 0;
        const newTotal = previousTotal + finalPoints;
        const newGamesPlayed = previousGamesPlayed + 1;

        // Update daily submission
        if (existingData) {
            await updateDoc(dailySubmissionRef, {
                [`games.${gameName}`]: gameSubmission,
                totalPoints: newTotal,
                gamesPlayed: newGamesPlayed,
                lastUpdated: serverTimestamp()
            });
        } else {
            await setDoc(dailySubmissionRef, {
                uid: userId,
                displayName: currentUser.displayName || 'Player',
                email: currentUser.email,
                date: dateStr,
                games: {
                    [gameName]: gameSubmission
                },
                totalPoints: finalPoints,
                gamesPlayed: 1,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });
        }

        // Update user's submission reference
        await setDoc(userSubmissionRef, {
            date: dateStr,
            totalPoints: newTotal,
            gamesPlayed: newGamesPlayed,
            games: existingData?.games 
                ? { ...existingData.games, [gameName]: { points: finalPoints, isCompleted: true } }
                : { [gameName]: { points: finalPoints, isCompleted: true } },
            lastUpdated: serverTimestamp()
        }, { merge: true });

        // Update global leaderboard
        await updateLeaderboard(dateStr, userId, currentUser.displayName || 'Player', newTotal, newGamesPlayed);

        // Update user's all-time stats
        await updateUserStats(userId, finalPoints, gameName);

        return { success: true, totalPoints: newTotal, finalPoints, bonusMultiplier, bonusPosition };
    } catch (err) {
        console.error('Error submitting game completion:', err);
        return { success: false, totalPoints: 0, error: err.message };
    }
}

/**
 * Update the daily leaderboard
 */
async function updateLeaderboard(dateStr, userId, displayName, totalPoints, gamesPlayed) {
    const leaderboardRef = doc(db, 'titan_leaderboard', `daily_${dateStr}`);

    try {
        const snap = await getDoc(leaderboardRef);

        if (snap.exists()) {
            let entries = snap.data().entries || [];

            // Remove existing entry for this user if any
            entries = entries.filter(e => e.uid !== userId);

            // Add updated entry
            entries.push({
                uid: userId,
                displayName,
                points: totalPoints,
                gamesPlayed,
                lastUpdated: new Date().toISOString()
            });

            // Sort by points descending
            entries.sort((a, b) => b.points - a.points);

            // Keep top 100
            entries = entries.slice(0, 100);

            await updateDoc(leaderboardRef, {
                entries,
                lastUpdated: serverTimestamp()
            });
        } else {
            await setDoc(leaderboardRef, {
                date: dateStr,
                entries: [{
                    uid: userId,
                    displayName,
                    points: totalPoints,
                    gamesPlayed,
                    lastUpdated: new Date().toISOString()
                }],
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });
        }
    } catch (err) {
        console.error('Error updating leaderboard:', err);
    }
}

/**
 * Update user's all-time stats
 */
async function updateUserStats(userId, pointsEarned, gameName) {
    const userRef = doc(db, 'titan_users', userId);

    try {
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            const updateData = {
                totalPointsAllTime: increment(pointsEarned),
                totalGamesPlayedAllTime: increment(1),
                [`gameStats.${gameName}.played`]: increment(1),
                [`gameStats.${gameName}.totalPoints`]: increment(pointsEarned),
                lastPlayed: serverTimestamp()
            };

            await updateDoc(userRef, updateData);
        } else {
            await setDoc(userRef, {
                uid: userId,
                totalPointsAllTime: pointsEarned,
                totalGamesPlayedAllTime: 1,
                gameStats: {
                    [gameName]: {
                        played: 1,
                        totalPoints: pointsEarned
                    }
                },
                lastPlayed: serverTimestamp()
            }, { merge: true });
        }
    } catch (err) {
        console.error('Error updating user stats:', err);
    }
}

/**
 * Get user's today points and games
 * @returns {Promise<{totalPoints: number, gamesPlayed: number, games: object}>}
 */
export async function getTodayStats() {
    if (!currentUser) {
        return { totalPoints: 0, gamesPlayed: 0, games: {} };
    }

    const dateStr = getTodayDateStr();
    const submissionRef = doc(db, 'titangames_submissions', dateStr, 'users', currentUser.uid);

    try {
        const snap = await getDoc(submissionRef);
        if (snap.exists()) {
            const data = snap.data();
            return {
                totalPoints: data.totalPoints || 0,
                gamesPlayed: data.gamesPlayed || 0,
                games: data.games || {}
            };
        }
        return { totalPoints: 0, gamesPlayed: 0, games: {} };
    } catch (err) {
        console.error('Error getting today stats:', err);
        return { totalPoints: 0, gamesPlayed: 0, games: {} };
    }
}

/**
 * Get user's all-time stats
 * @returns {Promise<{totalPoints: number, gamesPlayed: number, gameStats: object}>}
 */
export async function getAllTimeStats() {
    if (!currentUser) {
        return { totalPoints: 0, gamesPlayed: 0, gameStats: {} };
    }

    const userRef = doc(db, 'titan_users', currentUser.uid);

    try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            const data = snap.data();
            return {
                totalPoints: data.totalPointsAllTime || 0,
                gamesPlayed: data.totalGamesPlayedAllTime || 0,
                gameStats: data.gameStats || {}
            };
        }
        return { totalPoints: 0, gamesPlayed: 0, gameStats: {} };
    } catch (err) {
        console.error('Error getting all-time stats:', err);
        return { totalPoints: 0, gamesPlayed: 0, gameStats: {} };
    }
}

/**
 * Get today's leaderboard
 * @param {number} topN - Number of entries to fetch
 * @returns {Promise<Array>}
 */
export async function getTodayLeaderboard(topN = 10) {
    const dateStr = getTodayDateStr();
    const leaderboardRef = doc(db, 'titan_leaderboard', `daily_${dateStr}`);

    try {
        const snap = await getDoc(leaderboardRef);
        if (snap.exists()) {
            const entries = snap.data().entries || [];
            return entries.slice(0, topN);
        }
        return [];
    } catch (err) {
        console.error('Error getting leaderboard:', err);
        return [];
    }
}

/**
 * Get this week's leaderboard aggregated Mon–today (capped at Fri)
 * Returns { pointsRanking: [{uid, displayName, points}], winsRanking: [{uid, displayName, wins}], days: string[] }
 */
export async function getWeekLeaderboard() {
    const today = new Date();
    const dow = today.getDay(); // 0=Sun … 6=Sat
    // Monday of this week
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dow === 0 ? 7 : dow) - 1));
    monday.setHours(0, 0, 0, 0);

    // Build list of Mon–today (max Fri)
    const days = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        if (d > today) break;
        const str = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
        days.push(str);
    }

    // Fetch all available daily leaderboard docs in parallel
    const snaps = await Promise.all(
        days.map(d => getDoc(doc(db, 'titan_leaderboard', `daily_${d}`)))
    );

    // Aggregate: uid → { displayName, totalPoints, wins }
    const agg = {};
    snaps.forEach((snap, idx) => {
        if (!snap.exists()) return;
        const entries = snap.data().entries || [];
        if (entries.length === 0) return;
        // "win" = #1 on that day
        const winner = entries[0]?.uid;
        entries.forEach(e => {
            if (!e.uid) return;
            if (!agg[e.uid]) agg[e.uid] = { displayName: e.displayName || 'Player', totalPoints: 0, wins: 0 };
            agg[e.uid].totalPoints += (e.points || 0);
            if (e.uid === winner) agg[e.uid].wins += 1;
        });
    });

    const all = Object.entries(agg).map(([uid, v]) => ({ uid, ...v }));
    const pointsRanking = [...all].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5);
    const winsRanking = [...all].sort((a, b) => b.wins - a.wins || b.totalPoints - a.totalPoints).slice(0, 5);

    return { pointsRanking, winsRanking, days };
}

/**
 * Listen for auth state changes to update UI
 * @param {Function} callback - Called with user object or null
 */
export function onAuthChange(callback) {
    onAuthStateChanged(auth, callback);
}

// Export for debugging
export { getTodayDateStr };
