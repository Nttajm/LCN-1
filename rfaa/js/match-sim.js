import { seasons, teams, getTeamById } from './acl-index.js';
import { rankPlayers } from './ratings.js';
import { getTopGoalScorers, getTopAssistProviders } from './aot-stats.js';
import { generateMatchStats, seededRandom, seededRandomInRange } from './stats-gen.js';

const ELO_START = 1500;

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function pickWeighted(items, weights, rand) {
    const total = weights.reduce((a, b) => a + b, 0);
    if (!items.length || total <= 0) return items[0] || null;
    let roll = rand() * total;
    for (let i = 0; i < items.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
}

function poissonSample(lambda, rand) {
    const L = Math.exp(-Math.max(0, lambda));
    let k = 0;
    let p = 1;
    do {
        k++;
        p *= rand();
    } while (p > L && k < 12);
    return k - 1;
}

function collectAllGames() {
    const games = [];
    seasons.forEach((season) => {
        (season.matchdays || []).forEach((md) => {
            (md.games || []).forEach((game) => {
                if (game.standby) return;
                if (game.score1 == null || game.score2 == null) return;
                games.push(game);
            });
        });
    });
    return games;
}

function teamScoringTendency(teamId) {
    let gf = 0;
    let ga = 0;
    let played = 0;
    collectAllGames().forEach((game) => {
        if (game.team1 !== teamId && game.team2 !== teamId) return;
        played++;
        if (game.team1 === teamId) {
            gf += Number(game.score1) || 0;
            ga += Number(game.score2) || 0;
        } else {
            gf += Number(game.score2) || 0;
            ga += Number(game.score1) || 0;
        }
    });
    if (!played) return { gfPerGame: 1.35, gaPerGame: 1.35, played: 0 };
    return {
        gfPerGame: gf / played,
        gaPerGame: ga / played,
        played
    };
}

async function getTeamElo(teamId) {
    try {
        const { getTeamRanking, computeEloRankings } = await import('./rankings.js');
        computeEloRankings();
        const row = getTeamRanking(teamId);
        return row ? row.elo : ELO_START;
    } catch (_) {
        return ELO_START;
    }
}

function buildPlayerWeights(teamId, ratingsMap, goalsMap, assistsMap) {
    const roster = getTeamById(teamId)?.player || [];
    return roster.map((name) => {
        const rating = ratingsMap.get(name) || 5;
        const goals = goalsMap.get(name) || 0;
        const assists = assistsMap.get(name) || 0;
        const scoreWeight = Math.max(0.35, (rating / 10) * 2.2 + Math.sqrt(goals + 1) * 1.4);
        const assistWeight = Math.max(0.25, (rating / 10) * 1.4 + Math.sqrt(assists + 1) * 1.6);
        return { name, rating, goals, assists, scoreWeight, assistWeight };
    });
}

function expectedGoals(elo1, elo2, tend1, tend2, squad1, squad2, rand) {
    const eloGap = (elo1 - elo2) / 400;
    const attack1 = (tend1.gfPerGame * 0.55 + (2.7 - tend2.gaPerGame) * 0.2 + squad1 * 0.35);
    const attack2 = (tend2.gfPerGame * 0.55 + (2.7 - tend1.gaPerGame) * 0.2 + squad2 * 0.35);
    const base1 = clamp(1.15 + attack1 * 0.35 + eloGap * 0.55 + (rand() - 0.5) * 0.25, 0.35, 3.4);
    const base2 = clamp(1.15 + attack2 * 0.35 - eloGap * 0.55 + (rand() - 0.5) * 0.25, 0.35, 3.4);
    return { xg1: base1, xg2: base2 };
}

function generateMinute(used, maxMinute, rand, stoppage) {
    const hardCap = stoppage > 0 ? 90 + stoppage : 90;
    let minute;
    let tries = 0;
    do {
        const roll = rand();
        if (roll < 0.08 && stoppage > 0) {
            minute = 90 + 1 + Math.floor(rand() * stoppage);
        } else if (roll < 0.18) {
            minute = 1 + Math.floor(rand() * 15);
        } else if (roll < 0.42) {
            minute = 16 + Math.floor(rand() * 30);
        } else if (roll < 0.72) {
            minute = 46 + Math.floor(rand() * 30);
        } else {
            minute = 76 + Math.floor(rand() * 15);
        }
        minute = clamp(minute, 1, hardCap);
        tries++;
    } while (used.has(minute) && tries < 40);
    used.add(minute);
    return minute;
}

function chooseScorer(weights, rand) {
    if (!weights.length) return null;
    return pickWeighted(
        weights,
        weights.map((w) => w.scoreWeight),
        rand
    );
}

function chooseAssist(weights, scorerName, rand) {
    const pool = weights.filter((w) => w.name !== scorerName);
    if (!pool.length || rand() < 0.22) return false;
    const pick = pickWeighted(
        pool,
        pool.map((w) => w.assistWeight),
        rand
    );
    return pick ? pick.name : false;
}

function chooseGoalType(rand) {
    const roll = rand();
    if (roll < 0.06) return 'penalty';
    if (roll < 0.11) return 'free kick';
    return false;
}

function choosePotm(goals, weights1, weights2, score1, score2) {
    const scorers = {};
    goals.forEach((g) => {
        scorers[g.player] = (scorers[g.player] || 0) + 1;
        if (g.assist) scorers[g.assist] = (scorers[g.assist] || 0) + 0.6;
    });
    const winnerWeights = score1 === score2
        ? [...weights1, ...weights2]
        : score1 > score2 ? weights1 : weights2;
    const ranked = winnerWeights
        .map((w) => ({
            name: w.name,
            score: (scorers[w.name] || 0) * 3 + w.rating + Math.random()
        }))
        .sort((a, b) => b.score - a.score);
    return ranked[0]?.name || 'none';
}

function lightCards(weights, teamId, usedMinutes, rand, countHint) {
    const yellow = [];
    const red = [];
    const nYellow = Math.max(0, Math.round(countHint + (rand() - 0.5) * 2));
    for (let i = 0; i < nYellow && weights.length; i++) {
        const player = pickWeighted(weights, weights.map(() => 1), rand);
        const minute = generateMinute(usedMinutes, 90, rand, 0);
        yellow.push({ player: player.name, minute, team: teamId });
    }
    if (rand() < 0.08 && weights.length) {
        const player = pickWeighted(weights, weights.map(() => 1), rand);
        const minute = generateMinute(usedMinutes, 90, rand, 0);
        red.push({ player: player.name, minute, team: teamId });
    }
    return { yellow, red };
}

export async function simulateMatchResult(team1Id, team2Id, opts = {}) {
    const seed = Number.isFinite(opts.seed) ? opts.seed : Math.floor(Math.random() * 100000);
    let cursor = seed;
    const rand = () => {
        cursor += 1;
        return seededRandom(cursor);
    };

    const team1 = getTeamById(team1Id);
    const team2 = getTeamById(team2Id);
    if (!team1?.player?.length || !team2?.player?.length) {
        return { error: 'Both teams need squads to simulate.' };
    }

    const [elo1, elo2] = await Promise.all([getTeamElo(team1Id), getTeamElo(team2Id)]);
    const tend1 = teamScoringTendency(team1Id);
    const tend2 = teamScoringTendency(team2Id);

    const allGames = collectAllGames();
    const ratings = rankPlayers(allGames);
    const ratingsMap = new Map(ratings.map((r) => [r.name, r.rating]));
    const goalsMap = new Map(getTopGoalScorers().map((r) => [r.name, r.count]));
    const assistsMap = new Map(getTopAssistProviders().map((r) => [r.name, r.count]));

    const weights1 = buildPlayerWeights(team1Id, ratingsMap, goalsMap, assistsMap);
    const weights2 = buildPlayerWeights(team2Id, ratingsMap, goalsMap, assistsMap);

    const squadStrength = (weights) => {
        if (!weights.length) return 5;
        const top = [...weights].sort((a, b) => b.rating - a.rating).slice(0, 7);
        return top.reduce((s, w) => s + w.rating, 0) / top.length;
    };

    const s1 = squadStrength(weights1);
    const s2 = squadStrength(weights2);
    const { xg1, xg2 } = expectedGoals(elo1, elo2, tend1, tend2, s1 / 10, s2 / 10, rand);

    let score1 = poissonSample(xg1, rand);
    let score2 = poissonSample(xg2, rand);

    if (score1 + score2 > 8) {
        score1 = Math.min(score1, 5);
        score2 = Math.min(score2, 5);
    }

    const stoppageChance = 0.14 + Math.min(0.08, (score1 + score2) * 0.015);
    const stoppage = rand() < stoppageChance ? 1 + Math.floor(rand() * 5) : 0;
    const maxMinute = 90 + stoppage;

    const usedMinutes = new Set();
    const goals = [];

    for (let i = 0; i < score1; i++) {
        const scorer = chooseScorer(weights1, rand);
        if (!scorer) continue;
        const minute = generateMinute(usedMinutes, maxMinute, rand, stoppage);
        const type = chooseGoalType(rand);
        goals.push({
            player: scorer.name,
            minute,
            team: team1Id,
            assist: type === 'penalty' ? false : chooseAssist(weights1, scorer.name, rand),
            type
        });
    }

    for (let i = 0; i < score2; i++) {
        const scorer = chooseScorer(weights2, rand);
        if (!scorer) continue;
        const minute = generateMinute(usedMinutes, maxMinute, rand, stoppage);
        const type = chooseGoalType(rand);
        goals.push({
            player: scorer.name,
            minute,
            team: team2Id,
            assist: type === 'penalty' ? false : chooseAssist(weights2, scorer.name, rand),
            type
        });
    }

    goals.sort((a, b) => a.minute - b.minute);
    score1 = goals.filter((g) => g.team === team1Id).length;
    score2 = goals.filter((g) => g.team === team2Id).length;

    const cards1 = lightCards(weights1, team1Id, usedMinutes, rand, 1.2 + (s2 - s1) * 0.08);
    const cards2 = lightCards(weights2, team2Id, usedMinutes, rand, 1.2 + (s1 - s2) * 0.08);

    const yellowCards = [...cards1.yellow, ...cards2.yellow].sort((a, b) => a.minute - b.minute);
    const redCards = [...cards1.red, ...cards2.red].sort((a, b) => a.minute - b.minute);

    const potm = choosePotm(goals, weights1, weights2, score1, score2);

    const statsBundle = generateMatchStats({
        score1,
        score2,
        seed,
        elo1,
        elo2
    });
    const { _meta, ...stats } = statsBundle;

    return {
        team1: team1Id,
        team2: team2Id,
        score1,
        score2,
        goals,
        yellowCards,
        redCards,
        potm,
        seed,
        stats,
        stoppage,
        maxMinute,
        meta: {
            elo1: Number(elo1.toFixed(2)),
            elo2: Number(elo2.toFixed(2)),
            xg1: Number(xg1.toFixed(2)),
            xg2: Number(xg2.toFixed(2)),
            squad1: Number(s1.toFixed(1)),
            squad2: Number(s2.toFixed(1))
        }
    };
}

function formatClock(minute, stoppage) {
    if (minute <= 90) return `${minute}'`;
    if (stoppage > 0 && minute > 90) return `90+${minute - 90}'`;
    return `${minute}'`;
}

export function playMatchSimulation(result, mountEl, options = {}) {
    const durationMs = clamp(options.durationMs ?? 8000, 4500, 9000);
    const team1 = getTeamById(result.team1);
    const team2 = getTeamById(result.team2);
    const maxMinute = result.maxMinute || 90;
    const stoppage = result.stoppage || 0;

    const overlay = document.createElement('div');
    overlay.className = 'sim-overlay';
    overlay.innerHTML = `
        <div class="sim-card">
            <div class="sim-header">
                <span class="sim-live">LIVE</span>
                <span class="sim-phase" id="sim-phase">Kick-off</span>
            </div>
            <div class="sim-scoreboard">
                <div class="sim-side">
                    <img src="${team1.img}" alt="">
                    <span>${team1.sub || team1.name}</span>
                </div>
                <div class="sim-score-block">
                    <div class="sim-clock" id="sim-clock">0'</div>
                    <div class="sim-scoreline">
                        <span id="sim-score1">0</span>
                        <span class="sim-dash">-</span>
                        <span id="sim-score2">0</span>
                    </div>
                </div>
                <div class="sim-side sim-side--right">
                    <span>${team2.sub || team2.name}</span>
                    <img src="${team2.img}" alt="">
                </div>
            </div>
            <div class="sim-progress">
                <div class="sim-progress-fill" id="sim-progress-fill"></div>
            </div>
            <div class="sim-feed" id="sim-feed"></div>
            <div class="sim-meta">
                Elo ${result.meta.elo1} vs ${result.meta.elo2}
                · xG ${result.meta.xg1}-${result.meta.xg2}
            </div>
        </div>
    `;

    const host = mountEl || document.body;
    host.appendChild(overlay);

    const clockEl = overlay.querySelector('#sim-clock');
    const score1El = overlay.querySelector('#sim-score1');
    const score2El = overlay.querySelector('#sim-score2');
    const fillEl = overlay.querySelector('#sim-progress-fill');
    const feedEl = overlay.querySelector('#sim-feed');
    const phaseEl = overlay.querySelector('#sim-phase');

    let score1 = 0;
    let score2 = 0;
    let goalIndex = 0;
    let cardY = 0;
    let cardR = 0;
    const start = performance.now();

    const events = [
        ...result.goals.map((g) => ({ ...g, kind: 'goal' })),
        ...result.yellowCards.map((c) => ({ ...c, kind: 'yellow' })),
        ...result.redCards.map((c) => ({ ...c, kind: 'red' }))
    ].sort((a, b) => a.minute - b.minute);

    return new Promise((resolve) => {
        function tick(now) {
            const t = Math.min(1, (now - start) / durationMs);
            const minute = Math.max(1, Math.round(t * maxMinute));
            clockEl.textContent = formatClock(minute, stoppage);
            fillEl.style.width = `${t * 100}%`;

            if (minute <= 45) phaseEl.textContent = '1st Half';
            else if (minute < 90) phaseEl.textContent = '2nd Half';
            else if (stoppage > 0 && minute > 90) phaseEl.textContent = `Stoppage 90+${stoppage}`;
            else phaseEl.textContent = 'Full Time';

            while (goalIndex < events.length && events[goalIndex].minute <= minute) {
                const ev = events[goalIndex++];
                const side = getTeamById(ev.team);
                if (ev.kind === 'goal') {
                    if (ev.team === result.team1) score1++;
                    else score2++;
                    score1El.textContent = String(score1);
                    score2El.textContent = String(score2);
                    score1El.classList.remove('sim-pulse');
                    score2El.classList.remove('sim-pulse');
                    void score1El.offsetWidth;
                    if (ev.team === result.team1) score1El.classList.add('sim-pulse');
                    else score2El.classList.add('sim-pulse');

                    const assistTxt = ev.assist ? ` · assist ${ev.assist}` : '';
                    const typeTxt = ev.type ? ` (${ev.type})` : '';
                    feedEl.insertAdjacentHTML(
                        'afterbegin',
                        `<div class="sim-event sim-event--goal"><span class="sim-event-min">${formatClock(ev.minute, stoppage)}</span><span>GOAL ${side.sub || side.name} — ${ev.player}${typeTxt}${assistTxt}</span></div>`
                    );
                } else if (ev.kind === 'yellow') {
                    cardY++;
                    feedEl.insertAdjacentHTML(
                        'afterbegin',
                        `<div class="sim-event sim-event--yellow"><span class="sim-event-min">${formatClock(ev.minute, stoppage)}</span><span>Yellow · ${ev.player}</span></div>`
                    );
                } else if (ev.kind === 'red') {
                    cardR++;
                    feedEl.insertAdjacentHTML(
                        'afterbegin',
                        `<div class="sim-event sim-event--red"><span class="sim-event-min">${formatClock(ev.minute, stoppage)}</span><span>Red · ${ev.player}</span></div>`
                    );
                }
            }

            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                clockEl.textContent = stoppage > 0 ? `90+${stoppage}' FT` : `90' FT`;
                phaseEl.textContent = 'Full Time';
                score1El.textContent = String(result.score1);
                score2El.textContent = String(result.score2);
                setTimeout(() => {
                    overlay.classList.add('sim-overlay--done');
                    setTimeout(() => {
                        overlay.remove();
                        resolve(result);
                    }, 420);
                }, 650);
            }
        }

        requestAnimationFrame(tick);
    });
}

export async function simulateAndAnimate(team1Id, team2Id, mountEl, options = {}) {
    const result = await simulateMatchResult(team1Id, team2Id, options);
    if (result.error) return result;
    await playMatchSimulation(result, mountEl, options);
    return result;
}

if (typeof window !== 'undefined') {
    window.simulateMatchResult = simulateMatchResult;
    window.simulateAndAnimate = simulateAndAnimate;
    window.playMatchSimulation = playMatchSimulation;
}
