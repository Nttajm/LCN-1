/**
 * Deterministic match advanced-stats generator.
 * Uses score + optional ELO + game seed so the same inputs always produce the same stats.
 */

const ELO_START = 1500;
const ELO_SCALE = 400;

export function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

export function seededRandomInRange(seed, min, max) {
    return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

export function seededRandomFloat(seed, min, max) {
    return seededRandom(seed) * (max - min) + min;
}

export function expectedScoreFromElo(eloA, eloB) {
    return 1 / (1 + Math.pow(10, (eloB - eloA) / ELO_SCALE));
}

/** True when stats are missing or still the untouched create-match defaults. */
export function statsNeedRegeneration(stats) {
    if (!stats) return true;

    return (
        stats.possession?.team1 === 50 &&
        stats.possession?.team2 === 50 &&
        stats.shotsOnTarget?.team1 === 0 &&
        stats.shotsOnTarget?.team2 === 0 &&
        stats.passAccuracy?.team1 === 0 &&
        stats.passAccuracy?.team2 === 0 &&
        stats.corners?.team1 === 0 &&
        stats.corners?.team2 === 0 &&
        stats.offsides?.team1 === 0 &&
        stats.offsides?.team2 === 0
    );
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function normalizeOptions(opts = {}) {
    const score1 = Number(opts.score1) || 0;
    const score2 = Number(opts.score2) || 0;
    const seed = Number.isFinite(Number(opts.seed)) ? Number(opts.seed) : 0;
    const elo1 = Number.isFinite(Number(opts.elo1)) ? Number(opts.elo1) : ELO_START;
    const elo2 = Number.isFinite(Number(opts.elo2)) ? Number(opts.elo2) : ELO_START;
    return { score1, score2, seed, elo1, elo2 };
}

/**
 * Core persisted advanced stats (possession, SoT, pass%, corners, offsides).
 *
 * @param {object} opts
 * @param {number} opts.score1
 * @param {number} opts.score2
 * @param {number} opts.seed
 * @param {number} [opts.elo1=1500]
 * @param {number} [opts.elo2=1500]
 */
export function generateMatchStats(opts = {}) {
    const { score1, score2, seed, elo1, elo2 } = normalizeOptions(opts);
    const totalGoals = score1 + score2;
    const goalDiff = score1 - score2;

    const eloExpected = expectedScoreFromElo(elo1, elo2); // 0–1 for team1
    const eloBias = (eloExpected - 0.5) * 2; // -1…1

    // Goal-based favor (50 = even)
    let goalFavor;
    if (totalGoals === 0) {
        goalFavor = 50 + seededRandomInRange(seed, -8, 8) + eloBias * 6;
    } else {
        const baseFavor = 50 + (goalDiff / Math.max(totalGoals, 1)) * 28;
        goalFavor = baseFavor + seededRandomInRange(seed + 1, -6, 6);
    }

    // Blend: result still dominates, but stronger side gets more of the ball/shots
    const favorPercent = clamp(
        goalFavor * 0.62 + (50 + eloBias * 22) * 0.38 + seededRandomInRange(seed + 2, -4, 4),
        18,
        82
    );
    const bias = (favorPercent - 50) / 50;

    // Possession
    const possSpread = seededRandomInRange(seed + 3, 14, 26);
    const possession1 = clamp(Math.round(50 + bias * possSpread), 22, 78);
    const possession2 = 100 - possession1;

    // Shots on target — at least goals, scaled by open play + ELO edge
    const openPlay1 = seededRandomInRange(seed + 4, 1, 4) + Math.round(Math.abs(eloBias) * seededRandomInRange(seed + 5, 0, 2));
    const openPlay2 = seededRandomInRange(seed + 6, 1, 4) + Math.round(Math.abs(eloBias) * seededRandomInRange(seed + 7, 0, 2));
    const shotsOnTarget1 = Math.max(
        score1,
        score1 + openPlay1 + Math.round(bias * seededRandomInRange(seed + 8, 0, 3))
    );
    const shotsOnTarget2 = Math.max(
        score2,
        score2 + openPlay2 - Math.round(bias * seededRandomInRange(seed + 9, 0, 3))
    );

    // Pass accuracy — favorite + winner lean higher
    const passAccuracy1 = clamp(
        Math.round(
            72 +
                bias * seededRandomInRange(seed + 10, 7, 14) +
                eloBias * seededRandomInRange(seed + 11, 2, 6) +
                seededRandomInRange(seed + 12, -4, 4)
        ),
        52,
        94
    );
    const passAccuracy2 = clamp(
        Math.round(
            72 -
                bias * seededRandomInRange(seed + 13, 7, 14) -
                eloBias * seededRandomInRange(seed + 14, 2, 6) +
                seededRandomInRange(seed + 15, -4, 4)
        ),
        52,
        94
    );

    // Corners / offsides — attack-heavy side gets more
    const corners1 = Math.max(
        0,
        Math.round(3 + bias * seededRandomInRange(seed + 16, 2, 5) + seededRandomInRange(seed + 17, 0, 3) + eloBias * 1.5)
    );
    const corners2 = Math.max(
        0,
        Math.round(3 - bias * seededRandomInRange(seed + 18, 2, 5) + seededRandomInRange(seed + 19, 0, 3) - eloBias * 1.5)
    );

    const offsides1 = Math.max(
        0,
        Math.round(1 + Math.max(0, bias) * seededRandomInRange(seed + 20, 1, 4) + seededRandomInRange(seed + 21, 0, 2))
    );
    const offsides2 = Math.max(
        0,
        Math.round(1 + Math.max(0, -bias) * seededRandomInRange(seed + 22, 1, 4) + seededRandomInRange(seed + 23, 0, 2))
    );

    return {
        possession: { team1: possession1, team2: possession2 },
        shotsOnTarget: { team1: shotsOnTarget1, team2: shotsOnTarget2 },
        passAccuracy: { team1: passAccuracy1, team2: passAccuracy2 },
        corners: { team1: corners1, team2: corners2 },
        offsides: { team1: offsides1, team2: offsides2 },
        _meta: {
            favorPercent: Math.round(favorPercent * 10) / 10,
            bias: Math.round(bias * 1000) / 1000,
            eloExpected: Math.round(eloExpected * 1000) / 1000,
            eloBias: Math.round(eloBias * 1000) / 1000,
            seed,
            score1,
            score2,
            elo1,
            elo2
        }
    };
}

/**
 * Display-only extras derived from core stats + seed (attempts, attacks, passes, etc.).
 */
export function generateDisplayExtras(stats, opts = {}) {
    const { score1, score2, seed } = normalizeOptions(opts);
    const sot1 = stats.shotsOnTarget?.team1 ?? score1;
    const sot2 = stats.shotsOnTarget?.team2 ?? score2;
    const pass1 = stats.passAccuracy?.team1 ?? 80;
    const pass2 = stats.passAccuracy?.team2 ?? 80;
    const bias = ((stats.possession?.team1 ?? 50) - 50) / 50;

    const rnd = (min, max, offset) => seededRandomInRange(seed + offset, min, max);

    const totalAttempts1 = Math.max(sot1 + rnd(5, 12, 30), score1 + 2);
    const totalAttempts2 = Math.max(sot2 + rnd(5, 12, 31), score2 + 2);

    const attacks1 = clamp(Math.round(50 + bias * 12 + rnd(-6, 6, 32)), 35, 75);
    const attacks2 = clamp(Math.round(50 - bias * 12 + rnd(-6, 6, 33)), 35, 75);

    const passPool1 = rnd(400, 520, 34);
    const passPool2 = rnd(400, 520, 35);
    const passesCompleted1 = Math.round((pass1 / 100) * passPool1);
    const passesCompleted2 = Math.round((pass2 / 100) * passPool2);
    const passesAttempted1 = Math.round(passesCompleted1 / (pass1 / 100));
    const passesAttempted2 = Math.round(passesCompleted2 / (pass2 / 100));

    const ballsRecovered1 = rnd(22, 38, 36);
    const ballsRecovered2 = rnd(22, 38, 37);
    const saves1 = Math.max(sot2 - score2, rnd(2, 8, 38));
    const saves2 = Math.max(sot1 - score1, rnd(2, 8, 39));
    const distance1 = (rnd(98, 115, 40) + rnd(0, 9, 41) / 10).toFixed(1);
    const distance2 = (rnd(98, 115, 42) + rnd(0, 9, 43) / 10).toFixed(1);

    return {
        totalAttempts: { team1: totalAttempts1, team2: totalAttempts2 },
        attacks: { team1: attacks1, team2: attacks2 },
        passesCompleted: { team1: passesCompleted1, team2: passesCompleted2 },
        passesAttempted: { team1: passesAttempted1, team2: passesAttempted2 },
        ballsRecovered: { team1: ballsRecovered1, team2: ballsRecovered2 },
        saves: { team1: saves1, team2: saves2 },
        distanceCovered: { team1: Number(distance1), team2: Number(distance2) }
    };
}

/**
 * Preview generated stats for any seed / score / elo combo.
 * Also supports sampling a seed range to see variance.
 *
 * Examples (console):
 *   previewGeneratedStats({ seed: 9688, score1: 2, score2: 1, elo1: 1620, elo2: 1480 })
 *   previewGeneratedStats({ score1: 3, score2: 0, elo1: 1700, elo2: 1400, seedMin: 0, seedMax: 20 })
 */
export function previewGeneratedStats(opts = {}) {
    const seedMin = opts.seedMin != null ? Number(opts.seedMin) : null;
    const seedMax = opts.seedMax != null ? Number(opts.seedMax) : null;
    const hasRange = Number.isFinite(seedMin) && Number.isFinite(seedMax) && seedMax >= seedMin;

    if (hasRange) {
        const samples = [];
        const step = Math.max(1, Number(opts.step) || 1);
        const limit = Math.min(500, Math.floor((seedMax - seedMin) / step) + 1);
        for (let i = 0; i < limit; i++) {
            const seed = seedMin + i * step;
            const generated = generateMatchStats({ ...opts, seed });
            const { _meta, ...stats } = generated;
            samples.push({
                seed,
                favorPercent: _meta.favorPercent,
                possession: stats.possession,
                shotsOnTarget: stats.shotsOnTarget,
                passAccuracy: stats.passAccuracy,
                corners: stats.corners,
                offsides: stats.offsides
            });
        }

        const avgPoss1 = samples.reduce((s, x) => s + x.possession.team1, 0) / samples.length;
        return {
            mode: 'range',
            inputs: normalizeOptions({ ...opts, seed: seedMin }),
            seedMin,
            seedMax,
            step,
            sampleCount: samples.length,
            averagePossessionTeam1: Math.round(avgPoss1 * 10) / 10,
            samples
        };
    }

    const generated = generateMatchStats(opts);
    const { _meta, ...stats } = generated;
    const display = generateDisplayExtras(stats, opts);

    return {
        mode: 'single',
        inputs: normalizeOptions(opts),
        meta: _meta,
        stats,
        display,
        // Flat view handy for console scanning
        summary: {
            favor: `${_meta.favorPercent}% team1`,
            eloEdge: `team1 expected ${( _meta.eloExpected * 100).toFixed(1)}%`,
            possession: `${stats.possession.team1}-${stats.possession.team2}`,
            shotsOnTarget: `${stats.shotsOnTarget.team1}-${stats.shotsOnTarget.team2}`,
            passAccuracy: `${stats.passAccuracy.team1}-${stats.passAccuracy.team2}`,
            corners: `${stats.corners.team1}-${stats.corners.team2}`,
            offsides: `${stats.offsides.team1}-${stats.offsides.team2}`
        }
    };
}

/**
 * Return stored stats if they look real; otherwise generate from score/seed/elo.
 * Strips _meta before returning so it is safe to persist.
 */
export function resolveGameStats(game, elo1, elo2) {
    if (!game) return null;
    if (!statsNeedRegeneration(game.stats)) {
        return { stats: game.stats, generated: false };
    }

    const seed = game.seed != null ? game.seed : 0;
    const generated = generateMatchStats({
        score1: game.score1 || 0,
        score2: game.score2 || 0,
        seed,
        elo1,
        elo2
    });
    const { _meta, ...stats } = generated;
    return { stats, generated: true, meta: _meta };
}

// Console helpers
if (typeof window !== 'undefined') {
    window.previewGeneratedStats = previewGeneratedStats;
    window.generateMatchStats = generateMatchStats;
    window.generateDisplayExtras = generateDisplayExtras;
    window.resolveGameStats = resolveGameStats;
}
