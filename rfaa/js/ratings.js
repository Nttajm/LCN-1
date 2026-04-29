/**
 * ratings.js – Single source of truth for all player rating calculations.
 *
 * Exported API:
 *   RATING_WEIGHTS          – tune the formula without touching logic
 *   getPlayerTeamInGame()   – resolve a player's team from a game object
 *   collectPlayerStats()    – accumulate raw stats from a flat games array
 *   calcPlayerRating()      – score one player given stats + normalisation maxima
 *   rankPlayers()           – end-to-end: games → sorted ranked array
 *
 * Ranking factors (all-time, per-season, or per-matchday – same formula):
 *   • Goals scored
 *   • Assists
 *   • Player of the Match (POTM) awards
 *   • Hat-tricks (3+ goals in a single game)
 *   • Volume bonus (log-scale reward for consistent contributors)
 */

import { getTeamById } from './acl-index.js';

// ─── Weights (edit these to tune the ranking formula) ────────────────────────
export const RATING_WEIGHTS = {
    base:        4.8,   // every player starts here
    goals:       1.8,   // sqrt-normalised weight for goals
    assists:     1.3,   // sqrt-normalised weight for assists
    potm:        2.0,   // sqrt-normalised weight for POTM awards
    hatTricks:   1.5,   // bonus for hat-tricks (3+ goals in one game)
    volume:      0.8,   // log10 coefficient for overall contribution volume
    ceiling:     7.9,   // soft ceiling; scores above this are compressed
    compression: 0.5,   // multiplier applied to excess above ceiling (tighter = harder to hit 10)
    min:         1.0,
    max:        10.0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Determine which team a named player belonged to in a given game.
 * Checks goal records first (most reliable), then falls back to squad roster.
 *
 * @param {string}  playerName
 * @param {object}  game
 * @returns {string|null}  teamId or null if unknown
 */
export function getPlayerTeamInGame(playerName, game) {
    if (Array.isArray(game.goals)) {
        for (const g of game.goals) {
            if (g.player === playerName || g.assist === playerName) return g.team;
        }
    }
    const t1 = getTeamById(game.team1);
    const t2 = getTeamById(game.team2);
    if (t1?.player?.includes(playerName)) return game.team1;
    if (t2?.player?.includes(playerName)) return game.team2;
    return null;
}

// ─── Core stat collection ─────────────────────────────────────────────────────

/**
 * Collect per-player stats from a flat array of game objects.
 *
 * Accumulated stats per player-team key ("name::teamId"):
 *   goals      – total goals scored
 *   assists    – total assists
 *   potm       – Player of the Match awards
 *   hatTricks  – number of games where the player scored 3+ goals
 *   bestGame   – highest goals in a single game
 *
 * @param {object[]} games
 * @returns {Map<string, object>}  playerKey → stats object
 */
export function collectPlayerStats(games) {
    const statsMap = new Map();

    function key(name, teamId) { return `${name}::${teamId}`; }

    function ensure(k, name, teamId) {
        if (!statsMap.has(k)) {
            statsMap.set(k, { name, teamId, goals: 0, assists: 0, potm: 0, hatTricks: 0, bestGame: 0 });
        }
        return statsMap.get(k);
    }

    for (const game of games) {
        // Skip fixtures that haven't been played
        if (game.score1 == null || game.score2 == null) continue;

        // Per-game goal tally – used to detect hat-tricks and track best game
        const gameGoals = new Map(); // playerKey → goals in this specific game

        if (Array.isArray(game.goals)) {
            for (const g of game.goals) {
                if (!g.player || !g.team) continue;

                const gKey = key(g.player, g.team);
                ensure(gKey, g.player, g.team).goals++;
                gameGoals.set(gKey, (gameGoals.get(gKey) || 0) + 1);

                if (g.assist && g.assist !== 'none' && g.assist !== false) {
                    const aKey = key(g.assist, g.team);
                    ensure(aKey, g.assist, g.team).assists++;
                }
            }
        }

        // Resolve hat-tricks and best-game from this game's per-player tally
        for (const [pgKey, count] of gameGoals) {
            const s = statsMap.get(pgKey);
            if (!s) continue;
            if (count >= 3) s.hatTricks++;
            if (count > s.bestGame) s.bestGame = count;
        }

        // POTM award
        if (game.potm && game.potm !== 'none') {
            const potmTeam = getPlayerTeamInGame(game.potm, game);
            if (potmTeam) {
                const pKey = key(game.potm, potmTeam);
                ensure(pKey, game.potm, potmTeam).potm++;
            }
        }
    }

    return statsMap;
}

// ─── Rating formula ──────────────────────────────────────────────────────────

/**
 * Compute the numerical rating for one player.
 *
 * All continuous factors are sqrt-normalised against the best performer
 * in the pool (so being the top scorer always scores full weight regardless
 * of whether they scored 1 goal or 30).  A log-scale volume bonus rewards
 * consistent all-round contributors.  Ratings above the soft ceiling are
 * compressed so 10/10 remains exceptional.
 *
 * @param {{ goals, assists, potm, hatTricks }} stats
 * @param {{ maxGoals, maxAssists, maxPOTM, maxHatTricks }} maxima
 * @returns {number}  rating in [1.0, 10.0], rounded to 1 decimal
 */
export function calcPlayerRating(stats, maxima) {
    const W = RATING_WEIGHTS;
    let rating = W.base;

    rating += Math.sqrt(stats.goals     / maxima.maxGoals)     * W.goals;
    rating += Math.sqrt(stats.assists   / maxima.maxAssists)   * W.assists;
    rating += Math.sqrt(stats.potm      / maxima.maxPOTM)      * W.potm;
    rating += Math.sqrt(stats.hatTricks / maxima.maxHatTricks) * W.hatTricks;

    // Volume bonus: rewards players who contribute across all categories
    const total = stats.goals + stats.assists + stats.potm + stats.hatTricks;
    if (total > 0) {
        rating += Math.log10(1 + total / 8) * W.volume;
    }

    // Soft ceiling compression – keeps elite ratings feeling genuinely elite
    if (rating > W.ceiling) {
        rating = W.ceiling + (rating - W.ceiling) * W.compression;
    }

    rating = Math.max(W.min, Math.min(W.max, rating));
    return Math.round(rating * 10) / 10;
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Rank players from any flat array of game objects.
 *
 * This is the single entry point used by every page that needs player ratings:
 *   - potw.js   → pass matchday.games
 *   - seasons.js → pass all games in a season
 *   - team-info.js → pass all games across all seasons
 *
 * @param {object[]} games
 * @returns {object[]}  sorted descending by rating
 *   Each entry: { name, teamId, rating, goals, assists, potm, hatTricks, bestGame }
 */
export function rankPlayers(games) {
    const statsMap = collectPlayerStats(games);
    if (statsMap.size === 0) return [];

    const entries = Array.from(statsMap.values());
    const maxima = {
        maxGoals:     Math.max(...entries.map(p => p.goals),     1),
        maxAssists:   Math.max(...entries.map(p => p.assists),   1),
        maxPOTM:      Math.max(...entries.map(p => p.potm),      1),
        maxHatTricks: Math.max(...entries.map(p => p.hatTricks), 1),
    };

    return entries
        .map(s => ({ ...s, rating: calcPlayerRating(s, maxima) }))
        .sort((a, b) => b.rating - a.rating);
}
