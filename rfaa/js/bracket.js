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

function renderMatch(game) {
    if (!game) {
        return `
            <div class="bracket-match standby">
                <div class="bracket-match-status"><span class="match-state">TBD</span></div>
                ${renderTeamRow(null, 0, false, true)}
                ${renderTeamRow(null, 0, false, true)}
            </div>`;
    }

    const winner = getWinner(game);
    const isStandby = !!game.standby;
    const statusText = isStandby ? 'Upcoming' : 'Full time';
    const standbyCls = isStandby ? ' standby' : '';

    return `
        <div class="bracket-match${standbyCls}" data-match-id="${game.id}">
            <div class="bracket-match-status">
                <span class="match-state">${statusText}</span>
            </div>
            ${renderTeamRow(game.team1, game.score1, winner === game.team1, isStandby)}
            ${renderTeamRow(game.team2, game.score2, winner === game.team2, isStandby)}
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
    const finalsMatchday = seasonData.matchdays.find(md => md.bracketType === 'finals');
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
                <svg viewBox="0 0 24 24"><path d="M5 3h14c.6 0 1 .4 1 1v2c0 3.3-2.7 6-6 6h-.3c-.5 1.8-1.8 3.2-3.7 3.8V19h3v2H7v-2h3v-3.2c-1.9-.6-3.2-2-3.7-3.8H6c-3.3 0-6-2.7-6-6V4c0-.6.4-1 1-1h4zm1 3H2v1c0 2.2 1.8 4 4 4V6zm12 0v5c2.2 0 4-1.8 4-4V6h-4z"/></svg>
            </div>
            ${winnerHTML}
        </div>`;
}

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

    if (bracketMatchdays.length === 0) {
        content.innerHTML = `<div class="bracket-container"><div class="bracket-empty"><div class="bracket-empty-icon">⊘</div><p>No knockout rounds have been created yet</p></div></div>`;
        return;
    }

    const sortedRounds = bracketMatchdays.sort((a, b) => BRACKET_ORDER.indexOf(a.bracketType) - BRACKET_ORDER.indexOf(b.bracketType));
    const roundElements = [];

    for (let i = 0; i < sortedRounds.length; i++) {
        const round = sortedRounds[i];
        const games = round.games || [];
        const label = BRACKET_LABELS[round.bracketType] || round.details;

        let matchupsHTML = games.map(game => `<div class="bracket-matchup">${renderMatch(game)}</div>`).join('');

        roundElements.push(`
            <div class="bracket-round" data-round="${round.bracketType}">
                <div class="bracket-round-label">${label}</div>
                ${matchupsHTML}
            </div>`);

        if (i < sortedRounds.length - 1) {
            roundElements.push(renderConnectorSVG(games.length));
        }
    }

    const hasFinals = sortedRounds.some(r => r.bracketType === 'finals');
    const trophyHTML = hasFinals ? renderTrophy(seasonData) : '';

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
