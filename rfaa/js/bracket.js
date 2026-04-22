import { seasons, getTeamById, getCurrentSeason } from './acl-index.js';

const BRACKET_ORDER = ['round16', 'quarterFinals', 'semiFinals', 'finals'];
const BRACKET_LABELS = {
    round16: 'Round of 16',
    quarterFinals: 'Quarter-Finals',
    semiFinals: 'Semi-Finals',
    finals: 'Final'
};

function getBracketMatchdays(seasonData) {
    if (!seasonData || !seasonData.matchdays) return [];
    return seasonData.matchdays.filter(md => md.bracketType && BRACKET_ORDER.includes(md.bracketType));
}

function getWinner(game) {
    if (!game || game.standby) return null;
    if (game.score1 > game.score2) return game.team1;
    if (game.score2 > game.score1) return game.team2;
    return null;
}

function renderTeamRow(teamId, score, isWinner, isStandby) {
    if (!teamId) {
        return `
            <div class="bracket-team-row tbd">
                <span class="bracket-team-name">TBD</span>
                <span class="bracket-team-score">-</span>
            </div>`;
    }
    const team = getTeamById(teamId);
    const winnerCls = isWinner ? ' winner' : '';
    return `
        <div class="bracket-team-row${winnerCls}">
            <img class="bracket-team-img" src="${team.img}" alt="${team.name}">
            <span class="bracket-team-name">${team.sub || team.name}</span>
            <span class="bracket-team-score">${isStandby ? '-' : score}</span>
        </div>`;
}

function renderMatch(game, inferredTeam1, inferredTeam2) {
    if (!game) {
        return `
            <div class="bracket-match standby">
                <div class="bracket-match-status"><span class="match-state">TBD</span></div>
                ${renderTeamRow(inferredTeam1 || null, 0, false, true)}
                ${renderTeamRow(inferredTeam2 || null, 0, false, true)}
            </div>`;
    }

    const t1 = game.team1 || inferredTeam1 || null;
    const t2 = game.team2 || inferredTeam2 || null;
    const winner = getWinner(game);
    const isStandby = !!game.standby;
    const statusText = isStandby ? 'Upcoming' : 'Full time';
    const standbyCls = isStandby ? ' standby' : '';

    return `
        <div class="bracket-match${standbyCls}" data-match-id="${game.id}">
            <div class="bracket-match-status">
                <span class="match-state">${statusText}</span>
            </div>
            ${renderTeamRow(t1, game.score1, winner === game.team1, isStandby)}
            ${renderTeamRow(t2, game.score2, winner === game.team2, isStandby)}
        </div>`;
}

function renderConnectorSVG(matchCount) {
    if (matchCount <= 1) return '';
    const pairCount = Math.floor(matchCount / 2);
    const h = 100;
    let paths = '';
    for (let i = 0; i < pairCount; i++) {
        const topPct = ((i * 2 + 0.5) / matchCount) * h;
        const botPct = ((i * 2 + 1.5) / matchCount) * h;
        const midPct = (topPct + botPct) / 2;
        paths += `<line x1="0" y1="${topPct}%" x2="50%" y2="${topPct}%" />`;
        paths += `<line x1="0" y1="${botPct}%" x2="50%" y2="${botPct}%" />`;
        paths += `<line x1="50%" y1="${topPct}%" x2="50%" y2="${botPct}%" />`;
        paths += `<line x1="50%" y1="${midPct}%" x2="100%" y2="${midPct}%" />`;
    }
    return `<div class="bracket-connector"><svg preserveAspectRatio="none" viewBox="0 0 32 100">${paths}</svg></div>`;
}

function renderTrophy(seasonData) {
    const finalsMatchday = seasonData.matchdays ? seasonData.matchdays.find(md => md.bracketType === 'finals') : null;
    let winnerHTML = '';
    if (finalsMatchday && finalsMatchday.games && finalsMatchday.games.length > 0) {
        const finalGame = finalsMatchday.games[0];
        const winner = getWinner(finalGame);
        if (winner) {
            const team = getTeamById(winner);
            winnerHTML = `
                <div class="bracket-winner-card">
                    <div class="bracket-winner-label">Champion</div>
                    <div class="bracket-winner-team">
                        <img src="${team.img}" alt="${team.name}">
                        <span>${team.name}</span>
                    </div>
                </div>`;
        }
    }

    return `
        <div class="bracket-trophy">
            <div class="bracket-trophy-icon">
                <img src="images/icons/cl-image.png" alt="Championship Trophy" class="bracket-trophy-img">
            </div>
            ${winnerHTML}
        </div>`;
}

// Expected number of matches per round for a full bracket
const BRACKET_MATCH_COUNTS = {
    round16: 8,
    quarterFinals: 4,
    semiFinals: 2,
    finals: 1
};

export function renderBracketView() {
    const content = document.querySelector('.pad-cont');
    if (!content) return;

    const currentSeason = getCurrentSeason();
    const seasonData = seasons.find(s => s.year === currentSeason);

    if (!seasonData) {
        content.innerHTML = `<div class="bracket-container"><div class="bracket-empty"><div class="bracket-empty-icon">⊘</div><p>No season data available</p></div></div>`;
        return;
    }

    const bracketMatchdays = getBracketMatchdays(seasonData);

    // Build a map of existing rounds
    const roundsMap = {};
    bracketMatchdays.forEach(md => {
        roundsMap[md.bracketType] = md;
    });

    const roundElements = [];
    // Track winners per round to propagate forward
    let previousRoundWinners = [];

    // Render ALL rounds in order, showing placeholders for missing ones
    for (let i = 0; i < BRACKET_ORDER.length; i++) {
        const roundType = BRACKET_ORDER[i];
        const round = roundsMap[roundType];
        const games = round ? (round.games || []) : [];
        const label = BRACKET_LABELS[roundType];
        const expectedMatches = BRACKET_MATCH_COUNTS[roundType];

        const currentRoundWinners = [];

        // Build matchups - fill with actual games, pad with empty placeholders
        let matchupsHTML = '';
        for (let m = 0; m < expectedMatches; m++) {
            const game = games[m] || null;
            // Infer teams from previous round winners (pairs of winners feed into next match)
            const inferredTeam1 = previousRoundWinners[m * 2] || null;
            const inferredTeam2 = previousRoundWinners[m * 2 + 1] || null;
            matchupsHTML += `<div class="bracket-matchup">${renderMatch(game, inferredTeam1, inferredTeam2)}</div>`;

            // Track this round's winners for the next round
            if (game) {
                currentRoundWinners.push(getWinner(game));
            } else {
                currentRoundWinners.push(null);
            }
        }

        previousRoundWinners = currentRoundWinners;

        roundElements.push(`
            <div class="bracket-round" data-round="${roundType}">
                <div class="bracket-round-label">${label}</div>
                ${matchupsHTML}
            </div>`);

        if (i < BRACKET_ORDER.length - 1) {
            roundElements.push(renderConnectorSVG(expectedMatches));
        }
    }

    const trophyHTML = renderTrophy(seasonData);

    content.innerHTML = `
        <div class="bracket-container">
            <div class="bracket-header">
                <h2>Knockout Phase</h2>
            </div>
            <div class="bracket-tree">
                ${roundElements.join('')}
                ${trophyHTML}
            </div>
        </div>`;

    content.querySelectorAll('.bracket-match[data-match-id]').forEach(el => {
        el.addEventListener('click', () => {
            const matchId = el.getAttribute('data-match-id');
            if (matchId) window.location.href = `match-info.html?match=${matchId}`;
        });
    });
}
