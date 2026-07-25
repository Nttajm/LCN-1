import { seasons, teams, getTeamById } from './acl-index.js';
import { getRfaaBase, reapplyTeamLinkListeners } from './ui.js';

const ELO_START = 1500;
const ELO_SCALE = 400;
const K_DEFAULT = 32;
const K_BY_BRACKET = {
    round16: 40,
    quarterFinals: 44,
    semiFinals: 48,
    finals: 60
};

const rfaaBase = getRfaaBase();
let cachedRankings = null;

function isPlayedGame(game) {
    if (!game || game.standby) return false;
    if (game.score1 == null || game.score2 == null) return false;
    const s1 = Number(game.score1);
    const s2 = Number(game.score2);
    if (Number.isNaN(s1) || Number.isNaN(s2)) return false;
    return true;
}

function getKFactor(matchday) {
    if (!matchday) return K_DEFAULT;
    if (matchday.bracketType && K_BY_BRACKET[matchday.bracketType]) {
        return K_BY_BRACKET[matchday.bracketType];
    }
    const details = String(matchday.details || '').toLowerCase();
    if (details.includes('final') && !details.includes('semi') && !details.includes('quarter')) {
        return K_BY_BRACKET.finals;
    }
    if (details.includes('knockout') || details.includes('round of 16')) return K_BY_BRACKET.round16;
    return K_DEFAULT;
}

function expectedScore(eloA, eloB) {
    return 1 / (1 + Math.pow(10, (eloB - eloA) / ELO_SCALE));
}

function goalDiffMultiplier(scoreA, scoreB) {
    const diff = Math.abs(scoreA - scoreB);
    if (diff <= 1) return 1;
    if (diff === 2) return 1.5;
    return (11 + diff) / 8;
}

function resultForTeam(scoreFor, scoreAgainst) {
    if (scoreFor > scoreAgainst) return 'W';
    if (scoreFor < scoreAgainst) return 'L';
    return 'D';
}

function actualScore(result) {
    if (result === 'W') return 1;
    if (result === 'L') return 0;
    return 0.5;
}

function ensureTeamState(map, teamId) {
    if (!map[teamId]) {
        const team = getTeamById(teamId);
        map[teamId] = {
            id: teamId,
            name: team.name,
            img: team.img,
            elo: ELO_START,
            wins: 0,
            draws: 0,
            losses: 0,
            gamesPlayed: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            form: [],
            lastResult: null,
            lastEloChange: 0,
            previousElo: ELO_START
        };
    }
    return map[teamId];
}

function collectChronologicalMatches() {
    const sortedSeasons = [...seasons].sort((a, b) => Number(a.year) - Number(b.year));
    const matches = [];

    sortedSeasons.forEach((season) => {
        (season.matchdays || []).forEach((matchday, matchdayIndex) => {
            (matchday.games || []).forEach((game, gameIndex) => {
                if (!isPlayedGame(game)) return;
                matches.push({
                    season: season.year,
                    matchdayIndex,
                    gameIndex,
                    matchday,
                    game
                });
            });
        });
    });

    return matches;
}

function applyMatch(stateMap, entry) {
    const { game, matchday, season } = entry;
    const team1 = ensureTeamState(stateMap, game.team1);
    const team2 = ensureTeamState(stateMap, game.team2);

    const score1 = Number(game.score1);
    const score2 = Number(game.score2);
    const k = getKFactor(matchday);
    const mult = goalDiffMultiplier(score1, score2);

    const elo1Before = team1.elo;
    const elo2Before = team2.elo;

    const exp1 = expectedScore(elo1Before, elo2Before);
    const exp2 = 1 - exp1;

    const res1 = resultForTeam(score1, score2);
    const res2 = resultForTeam(score2, score1);

    const delta1 = k * mult * (actualScore(res1) - exp1);
    const delta2 = k * mult * (actualScore(res2) - exp2);

    team1.previousElo = elo1Before;
    team2.previousElo = elo2Before;
    team1.elo = elo1Before + delta1;
    team2.elo = elo2Before + delta2;
    team1.lastEloChange = delta1;
    team2.lastEloChange = delta2;

    team1.gamesPlayed++;
    team2.gamesPlayed++;
    team1.goalsFor += score1;
    team1.goalsAgainst += score2;
    team2.goalsFor += score2;
    team2.goalsAgainst += score1;

    if (res1 === 'W') team1.wins++;
    else if (res1 === 'D') team1.draws++;
    else team1.losses++;

    if (res2 === 'W') team2.wins++;
    else if (res2 === 'D') team2.draws++;
    else team2.losses++;

    const lastShared = {
        id: game.id,
        season,
        matchday: matchday.details || '',
        bracketType: matchday.bracketType || null,
        team1: game.team1,
        team2: game.team2,
        score1,
        score2
    };

    team1.form.push(res1);
    team2.form.push(res2);
    team1.lastResult = { ...lastShared, result: res1, eloChange: delta1 };
    team2.lastResult = { ...lastShared, result: res2, eloChange: delta2 };
}

function matchSortKey(entry) {
    return [Number(entry.season), entry.matchdayIndex, entry.gameIndex];
}

function compareSortKeys(a, b) {
    for (let i = 0; i < 3; i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
}

function findMatchEntry(matchId) {
    return collectChronologicalMatches().find((entry) => entry.game.id === matchId) || null;
}

function resolveCutoff(input) {
    if (input == null) return null;

    if (typeof input === 'object' && !Array.isArray(input)) {
        if (input.matchId) {
            const entry = findMatchEntry(input.matchId);
            if (!entry) return { error: `Match not found: ${input.matchId}` };
            return { type: 'key', key: matchSortKey(entry), label: input.matchId };
        }
        if (input.index != null) {
            const matches = collectChronologicalMatches();
            const idx = Number(input.index);
            if (!Number.isFinite(idx) || idx < 0 || idx >= matches.length) {
                return { error: `Match index out of range: ${input.index}` };
            }
            const entry = matches[idx];
            return {
                type: 'key',
                key: matchSortKey(entry),
                label: `index:${idx}`,
                matchIndex: idx,
                entry
            };
        }
        if (input.beforeSeason != null) {
            const year = Number(input.beforeSeason);
            return { type: 'beforeSeason', year, label: `before:${year}` };
        }
        if (input.season != null) {
            const year = Number(input.season);
            const matchdayIndex = input.matchdayIndex != null ? Number(input.matchdayIndex) : null;
            const gameIndex = input.gameIndex != null ? Number(input.gameIndex) : null;
            if (matchdayIndex == null) {
                return { type: 'endOfSeason', year, label: `season:${year}` };
            }
            if (gameIndex == null) {
                return {
                    type: 'key',
                    key: [year, matchdayIndex, Number.MAX_SAFE_INTEGER],
                    label: `season:${year},md:${matchdayIndex}`
                };
            }
            return {
                type: 'key',
                key: [year, matchdayIndex, gameIndex],
                label: `season:${year},md:${matchdayIndex},g:${gameIndex}`
            };
        }
        return { error: 'Invalid cutoff object' };
    }

    const args = Array.isArray(input) ? input : [input];
    const season = Number(args[0]);
    if (!Number.isFinite(season)) return { error: 'Invalid season year' };

    if (args.length === 1) {
        return { type: 'endOfSeason', year: season, label: `season:${season}` };
    }

    const matchdayIndex = Number(args[1]);
    if (args.length === 2) {
        return {
            type: 'key',
            key: [season, matchdayIndex, Number.MAX_SAFE_INTEGER],
            label: `season:${season},md:${matchdayIndex}`
        };
    }

    const gameIndex = Number(args[2]);
    return {
        type: 'key',
        key: [season, matchdayIndex, gameIndex],
        label: `season:${season},md:${matchdayIndex},g:${gameIndex}`
    };
}

function matchWithinCutoff(entry, cutoff) {
    if (!cutoff) return true;
    if (cutoff.error) return false;

    if (cutoff.type === 'beforeSeason') {
        return Number(entry.season) < cutoff.year;
    }

    if (cutoff.type === 'endOfSeason') {
        return Number(entry.season) <= cutoff.year;
    }

    if (cutoff.type === 'key') {
        return compareSortKeys(matchSortKey(entry), cutoff.key) <= 0;
    }

    return false;
}

function buildRankingsFromState(stateMap, includeUnplayed = false) {
    const pool = includeUnplayed
        ? Object.values(stateMap)
        : Object.values(stateMap).filter((team) => team.gamesPlayed > 0);

    const sortRankRows = (a, b) =>
        b.elo - a.elo || b.wins - a.wins || a.name.localeCompare(b.name);

    return pool
        .map((team) => ({
            id: team.id,
            name: team.name,
            img: team.img,
            elo: Number(team.elo.toFixed(2)),
            wins: team.wins,
            draws: team.draws,
            losses: team.losses,
            gamesPlayed: team.gamesPlayed,
            goalsFor: team.goalsFor,
            goalsAgainst: team.goalsAgainst,
            goalDifference: team.goalsFor - team.goalsAgainst,
            form: team.form.slice(-5),
            lastResult: team.lastResult
                ? {
                    ...team.lastResult,
                    eloChange: Number(team.lastResult.eloChange.toFixed(2))
                }
                : null,
            lastEloChange: Number(team.lastEloChange.toFixed(2))
        }))
        .sort(sortRankRows)
        .map((team, index) => ({ ...team, rank: index + 1 }));
}

function simulateEloUpTo(cutoffInput) {
    const cutoff = resolveCutoff(cutoffInput);
    if (cutoff?.error) return { error: cutoff.error };

    const stateMap = {};
    const matches = collectChronologicalMatches();
    let applied = 0;
    let lastEntry = null;

    matches.forEach((entry) => {
        if (!matchWithinCutoff(entry, cutoff)) return;
        applyMatch(stateMap, entry);
        applied++;
        lastEntry = entry;
    });

    teams.forEach((team) => ensureTeamState(stateMap, team.id));

    const rankings = buildRankingsFromState(stateMap);
    const previousEloMap = {};
    Object.values(stateMap).forEach((team) => {
        if (team.gamesPlayed > 0) {
            previousEloMap[team.id] = team.lastResult ? team.previousElo : team.elo;
        }
    });

    const previousRanks = Object.entries(previousEloMap)
        .map(([id, elo]) => {
            const team = stateMap[id];
            return { id, elo, wins: team.wins, name: team.name };
        })
        .sort((a, b) => b.elo - a.elo || b.wins - a.wins || a.name.localeCompare(b.name))
        .reduce((acc, row, index) => {
            acc[row.id] = index + 1;
            return acc;
        }, {});

    const rankingsWithChange = rankings.map((team) => ({
        ...team,
        previousRank: previousRanks[team.id] || team.rank,
        rankChange: (previousRanks[team.id] || team.rank) - team.rank
    }));

    return {
        cutoff: cutoff?.label || 'all',
        cutoffDetail: cutoff,
        matchesApplied: applied,
        lastMatch: lastEntry
            ? {
                id: lastEntry.game.id,
                season: lastEntry.season,
                matchdayIndex: lastEntry.matchdayIndex,
                gameIndex: lastEntry.gameIndex,
                matchday: lastEntry.matchday.details || '',
                team1: lastEntry.game.team1,
                team2: lastEntry.game.team2,
                score1: Number(lastEntry.game.score1),
                score2: Number(lastEntry.game.score2)
            }
            : null,
        rankings: rankingsWithChange
    };
}

export function getEloAt(...args) {
    const result = simulateEloUpTo(args.length === 1 && typeof args[0] === 'object' ? args[0] : args);
    if (result.error) return result;
    return result.rankings;
}

export function getEloSnapshot(...args) {
    return simulateEloUpTo(args.length === 1 && typeof args[0] === 'object' ? args[0] : args);
}

export function getEloAtGame(matchId) {
    return getEloAt({ matchId });
}

/** Pre-match ELO for both sides of a game (post-match ratings minus the applied delta). */
export function getPreMatchEloPair(matchId) {
    const entry = findMatchEntry(matchId);
    if (!entry) return { error: `Match not found: ${matchId}`, elo1: ELO_START, elo2: ELO_START };

    const snapshot = simulateEloUpTo({ matchId });
    if (snapshot.error) return { error: snapshot.error, elo1: ELO_START, elo2: ELO_START };

    const byId = Object.fromEntries(snapshot.rankings.map((row) => [row.id, row]));
    const t1 = byId[entry.game.team1];
    const t2 = byId[entry.game.team2];

    const elo1 =
        t1 && t1.lastResult?.id === matchId
            ? Number((t1.elo - t1.lastEloChange).toFixed(2))
            : t1?.elo ?? ELO_START;
    const elo2 =
        t2 && t2.lastResult?.id === matchId
            ? Number((t2.elo - t2.lastEloChange).toFixed(2))
            : t2?.elo ?? ELO_START;

    return {
        matchId,
        team1: entry.game.team1,
        team2: entry.game.team2,
        elo1,
        elo2,
        expected1: Number(expectedScore(elo1, elo2).toFixed(4)),
        expected2: Number(expectedScore(elo2, elo1).toFixed(4))
    };
}

export function getEloAtMatchIndex(index) {
    return getEloAt({ index });
}

export function getEloRange(fromSeason, toSeason, limit) {
    const fromYear = Number(fromSeason);
    const toYear = Number(toSeason);
    if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) {
        return { error: 'Season years must be numbers' };
    }

    const startSnapshot = simulateEloUpTo({ beforeSeason: fromYear });
    const endSnapshot = simulateEloUpTo(toYear);

    if (startSnapshot.error) return startSnapshot;
    if (endSnapshot.error) return endSnapshot;

    const startMap = Object.fromEntries(startSnapshot.rankings.map((row) => [row.id, row]));
    const endMap = Object.fromEntries(endSnapshot.rankings.map((row) => [row.id, row]));
    const allIds = new Set([...Object.keys(startMap), ...Object.keys(endMap)]);

    const changes = [...allIds].map((id) => {
        const start = startMap[id] || {
            rank: null,
            elo: ELO_START,
            wins: 0,
            draws: 0,
            losses: 0,
            gamesPlayed: 0,
            name: getTeamById(id).name
        };
        const end = endMap[id] || {
            rank: null,
            elo: ELO_START,
            wins: 0,
            draws: 0,
            losses: 0,
            gamesPlayed: 0,
            name: getTeamById(id).name
        };

        return {
            id,
            name: end.name || start.name,
            img: getTeamById(id).img,
            startRank: start.rank,
            endRank: end.rank,
            rankChange: start.rank != null && end.rank != null ? start.rank - end.rank : null,
            startElo: start.elo,
            endElo: end.elo,
            eloChange: Number((end.elo - start.elo).toFixed(2)),
            winsAdded: end.wins - start.wins,
            drawsAdded: end.draws - start.draws,
            lossesAdded: end.losses - start.losses,
            gamesAdded: end.gamesPlayed - start.gamesPlayed
        };
    }).sort((a, b) => b.eloChange - a.eloChange || (a.endRank || 999) - (b.endRank || 999));

    const payload = {
        fromSeason: String(fromSeason),
        toSeason: String(toSeason),
        atStart: startSnapshot,
        atEnd: endSnapshot,
        changes
    };

    if (limit != null) {
        const n = Number(limit);
        if (Number.isFinite(n) && n > 0) {
            payload.atStart.rankings = startSnapshot.rankings.slice(0, n);
            payload.atEnd.rankings = endSnapshot.rankings.slice(0, n);
            payload.changes = changes.slice(0, n);
        }
    }

    return payload;
}

export function computeEloRankings() {
    const result = simulateEloUpTo(null);
    const rankings = result.rankings;
    cachedRankings = rankings;
    return rankings;
}

export function getRankings(limit) {
    const rankings = cachedRankings || computeEloRankings();
    if (limit == null || limit === undefined) return rankings;
    const n = Number(limit);
    if (!Number.isFinite(n) || n <= 0) return rankings;
    return rankings.slice(0, n).map((row) => ({
        rank: row.rank,
        id: row.id,
        name: row.name,
        img: row.img,
        elo: row.elo,
        wins: row.wins,
        draws: row.draws,
        losses: row.losses,
        gamesPlayed: row.gamesPlayed,
        form: row.form,
        lastResult: row.lastResult,
        lastEloChange: row.lastEloChange,
        rankChange: row.rankChange
    }));
}

export function getTeamRanking(teamId) {
    const rankings = cachedRankings || computeEloRankings();
    return rankings.find((row) => row.id.toLowerCase() === String(teamId).toLowerCase()) || null;
}

export function getLast5Games(teamId) {
    const matches = collectChronologicalMatches()
        .filter((entry) => entry.game.team1 === teamId || entry.game.team2 === teamId)
        .slice(-5);

    return matches.map((entry) => {
        const { game, season, matchday } = entry;
        const isHome = game.team1 === teamId;
        const scoreFor = Number(isHome ? game.score1 : game.score2);
        const scoreAgainst = Number(isHome ? game.score2 : game.score1);
        const opponentId = isHome ? game.team2 : game.team1;
        const opponent = getTeamById(opponentId);
        const result = resultForTeam(scoreFor, scoreAgainst);

        return {
            id: game.id,
            season,
            matchday: matchday.details || '',
            result,
            scoreFor,
            scoreAgainst,
            opponentId,
            opponentName: opponent.name,
            opponentImg: opponent.img,
            team1: game.team1,
            team2: game.team2,
            score1: Number(game.score1),
            score2: Number(game.score2)
        };
    });
}

export function getLast5Form(teamId) {
    return getLast5Games(teamId).map((game) => game.result);
}

export function getTeamRecord(teamId) {
    const row = getTeamRanking(teamId);
    if (!row) {
        return { wins: 0, draws: 0, losses: 0, gamesPlayed: 0, elo: ELO_START };
    }
    return {
        wins: row.wins,
        draws: row.draws,
        losses: row.losses,
        gamesPlayed: row.gamesPlayed,
        elo: row.elo
    };
}

export function refreshRankings() {
    cachedRankings = null;
    return computeEloRankings();
}

function formIcon(result) {
    if (result === 'W') return '<span class="rk-form-pill rk-form-pill--w" title="Win">W</span>';
    if (result === 'L') return '<span class="rk-form-pill rk-form-pill--l" title="Loss">L</span>';
    if (result === 'D') return '<span class="rk-form-pill rk-form-pill--d" title="Draw">D</span>';
    return '<span class="rk-form-pill rk-form-pill--empty">-</span>';
}

function rankChangeHtml(change) {
    if (change > 0) {
        return `<span class="rk-move rk-move--up"><span class="rk-move-arrow">&#9650;</span> ${change}</span>`;
    }
    if (change < 0) {
        return `<span class="rk-move rk-move--down"><span class="rk-move-arrow">&#9660;</span> ${Math.abs(change)}</span>`;
    }
    return `<span class="rk-move rk-move--same"><span class="rk-move-arrow">&#9644;</span></span>`;
}

function eloChangeHtml(delta) {
    const value = Number(delta) || 0;
    const cls = value > 0 ? 'rk-elo-delta--up' : value < 0 ? 'rk-elo-delta--down' : 'rk-elo-delta--flat';
    const sign = value > 0 ? '+' : '';
    const mark = value > 0 ? '&#10003;' : value < 0 ? '&#10005;' : '&#8211;';
    return `<span class="rk-elo-delta ${cls}"><span class="rk-elo-delta-icon">${mark}</span> ${sign}${value.toFixed(2)}</span>`;
}

function lastResultHtml(row) {
    const lr = row.lastResult;
    if (!lr) return '<span class="rk-muted">No matches</span>';

    const t1 = getTeamById(lr.team1);
    const t2 = getTeamById(lr.team2);

    return `
        <div class="rk-last">
            <div class="rk-last-team">
                <img src="${rfaaBase}${t1.img}" alt="">
                <span>${t1.sub || t1.name}</span>
            </div>
            <div class="rk-last-score">
                <span class="rk-ft">FT</span>
                <span class="rk-score-box">${lr.score1}</span>
                <span class="rk-score-sep">-</span>
                <span class="rk-score-box">${lr.score2}</span>
            </div>
            <div class="rk-last-team rk-last-team--right">
                <span>${t2.sub || t2.name}</span>
                <img src="${rfaaBase}${t2.img}" alt="">
            </div>
        </div>
    `;
}

function padForm(form) {
    const items = [...(form || [])];
    while (items.length < 5) items.unshift(null);
    return items.slice(-5);
}

function renderRankingsTable(rankings) {
    const body = document.getElementById('rankings-body');
    if (!body) return;

    if (!rankings.length) {
        body.innerHTML = `<tr><td colspan="7" class="rk-empty">No match data available for rankings.</td></tr>`;
        return;
    }

    body.innerHTML = rankings.map((row) => {
        const formHtml = padForm(row.form).map(formIcon).join('');
        return `
            <tr class="rk-row" data-team-id="${row.id}">
                <td class="rk-col-rank">
                    <div class="rk-rank-wrap">
                        <span class="rk-rank-num">${row.rank}</span>
                        ${rankChangeHtml(row.rankChange)}
                    </div>
                </td>
                <td class="rk-col-team">
                    <a class="rk-team js-team-link" href="${rfaaBase}team-info.html?team=${row.id}" data-team-id="${row.id}">
                        <img src="${rfaaBase}${row.img}" alt="">
                        <span>${row.name}</span>
                    </a>
                </td>
                <td class="rk-col-form">
                    <div class="rk-form">${formHtml}</div>
                </td>
                <td class="rk-col-last">${lastResultHtml(row)}</td>
                <td class="rk-col-delta">${eloChangeHtml(row.lastEloChange)}</td>
                <td class="rk-col-points"><span class="rk-points">${row.elo.toFixed(2)}</span></td>
                <td class="rk-col-more">
                    <button type="button" class="rk-more-btn" aria-expanded="false" aria-label="Show more for ${row.name}">
                        <span class="rk-chevron">&#9662;</span>
                    </button>
                </td>
            </tr>
            <tr class="rk-detail" data-detail-for="${row.id}" hidden>
                <td colspan="7">
                    <div class="rk-detail-inner">
                        <div class="rk-stat"><span class="rk-stat-label">Played</span><span class="rk-stat-value">${row.gamesPlayed}</span></div>
                        <div class="rk-stat"><span class="rk-stat-label">Wins</span><span class="rk-stat-value">${row.wins}</span></div>
                        <div class="rk-stat"><span class="rk-stat-label">Draws</span><span class="rk-stat-value">${row.draws}</span></div>
                        <div class="rk-stat"><span class="rk-stat-label">Losses</span><span class="rk-stat-value">${row.losses}</span></div>
                        <div class="rk-stat"><span class="rk-stat-label">GF</span><span class="rk-stat-value">${row.goalsFor}</span></div>
                        <div class="rk-stat"><span class="rk-stat-label">GA</span><span class="rk-stat-value">${row.goalsAgainst}</span></div>
                        <div class="rk-stat"><span class="rk-stat-label">GD</span><span class="rk-stat-value">${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}</span></div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    body.querySelectorAll('.rk-more-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const row = btn.closest('tr');
            const teamId = row?.dataset.teamId;
            const detail = body.querySelector(`.rk-detail[data-detail-for="${teamId}"]`);
            if (!detail) return;
            const open = detail.hasAttribute('hidden');
            detail.toggleAttribute('hidden', !open);
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.classList.toggle('rk-more-btn--open', open);
            row.classList.toggle('rk-row--open', open);
        });
    });

    reapplyTeamLinkListeners();
}

function setupSorting(rankings) {
    const headers = document.querySelectorAll('.rk-table th[data-sort]');
    let sortKey = 'rank';
    let sortDir = 'asc';

    const getValue = (row, key) => {
        if (key === 'rank') return row.rank;
        if (key === 'team') return row.name.toLowerCase();
        if (key === 'form') {
            const score = { W: 3, D: 1, L: 0 };
            return (row.form || []).reduce((sum, r) => sum + (score[r] || 0), 0);
        }
        if (key === 'last') return row.lastEloChange;
        if (key === 'delta') return row.lastEloChange;
        if (key === 'points') return row.elo;
        return 0;
    };

    const apply = () => {
        const sorted = [...rankings].sort((a, b) => {
            const av = getValue(a, sortKey);
            const bv = getValue(b, sortKey);
            if (typeof av === 'string') {
                return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            return sortDir === 'asc' ? av - bv : bv - av;
        });
        renderRankingsTable(sorted);
    };

    headers.forEach((th) => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (sortKey === key) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortKey = key;
                sortDir = key === 'team' ? 'asc' : (key === 'rank' ? 'asc' : 'desc');
            }
            headers.forEach((h) => h.classList.remove('rk-sort-asc', 'rk-sort-desc'));
            th.classList.add(sortDir === 'asc' ? 'rk-sort-asc' : 'rk-sort-desc');
            apply();
        });
    });
}

function initRankingsPage() {
    const rankings = computeEloRankings();
    const countEl = document.getElementById('rk-count');
    if (countEl) countEl.textContent = String(rankings.length);

    const topEl = document.getElementById('rk-top-elo');
    if (topEl && rankings[0]) topEl.textContent = rankings[0].elo.toFixed(2);

    renderRankingsTable(rankings);
    setupSorting(rankings);
}

window.getRankings = getRankings;
window.getTeamRanking = getTeamRanking;
window.getLast5Games = getLast5Games;
window.getLast5Form = getLast5Form;
window.getTeamRecord = getTeamRecord;
window.getEloAt = getEloAt;
window.getEloSnapshot = getEloSnapshot;
window.getEloAtGame = getEloAtGame;
window.getPreMatchEloPair = getPreMatchEloPair;
window.getEloAtMatchIndex = getEloAtMatchIndex;
window.getEloRange = getEloRange;
window.computeEloRankings = computeEloRankings;
window.refreshRankings = refreshRankings;

if (document.getElementById('rankings-body')) {
    initRankingsPage();
}
