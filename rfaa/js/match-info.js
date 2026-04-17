import { getCurrentSeason, getTeamById, } from './acl-index.js';
import { seasons } from './acl-index.js';

function displayMatchInfo() {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('match');
    const content = document.querySelector('.content-match-info');
    content.innerHTML = ''; // Clear previous content
    if (!matchId) return;

    // Search through all seasons instead of just the current one
    let match = null;
    let matchSeasonData = null;
    let matchday = null; 
    let mdIndex = null;

    // Loop through all seasons to find the match
    for (const seasonData of seasons) {
        const matchdays = seasonData.matchdays || [];
        const foundMatch = matchdays
            .map(matchday => matchday.games || [])
            .flat()
            .find(game => game.id === matchId);
        matchday = matchdays.find(matchday => matchday.games && matchday.games.some(game => game.id === matchId));
        mdIndex = matchdays.findIndex(md => md.games && md.games.some(game => game.id === matchId));
        if (foundMatch) {
            match = foundMatch;
            matchSeasonData = seasonData;
            break;
        }
    }

    if (!match) return;

    const team1 = getTeamById(match.team1);
    const team2 = getTeamById(match.team2);

    // Group goals by player for each team
    const groupGoalsByPlayer = (goals, teamId) => {
        const playerGoals = {};
        
        goals.filter(goal => goal.team === teamId)
            .forEach(goal => {
                if (!playerGoals[goal.player]) {
                    playerGoals[goal.player] = [];
                }
                const label = goal.minute != null ? `${goal.minute}'${goal.type === 'penalty' ? ' (p)' : ''}` : 'N/A';
                playerGoals[goal.player].push(label);
            });
        
        return Object.entries(playerGoals)
            .map(([player, minutes]) => {
                const formattedMinutes = minutes
                    .map(m => `<span class="minute-item">${m}</span>`)
                    .join(' ');
                return `<div class="score-group"><span class="player">${player}</span><span class="minute">${formattedMinutes}</span></div>`;
            })
            .join('');
    };

    const groupCardsByPlayer = (cards, teamId, type) => {
        if (!cards || !cards.length) return '';
        return cards
            .filter(c => c.team === teamId)
            .sort((a, b) => a.minute - b.minute)
            .map(c => `<div class="card-tile card-tile--${type}">
                <span class="card-tile-icon"></span>
                <span class="card-tile-name">${c.player}</span>
                <span class="card-tile-min">${c.minute}'</span>
            </div>`)
            .join('');
    };

    const renderCardsSection = (match) => {
        const yellows1 = groupCardsByPlayer(match.yellowCards, match.team1, 'yellow');
        const yellows2 = groupCardsByPlayer(match.yellowCards, match.team2, 'yellow');
        const reds1 = groupCardsByPlayer(match.redCards, match.team1, 'red');
        const reds2 = groupCardsByPlayer(match.redCards, match.team2, 'red');

        const hasCards = yellows1 || yellows2 || reds1 || reds2;
        if (!hasCards) return '';

        return `
            <div class="cards-section">
                <div class="cards-col cards-col--left">
                    ${yellows1}${reds1}
                </div>
                <div class="cards-col cards-col--right">
                    ${yellows2}${reds2}
                </div>
            </div>`;
    };

    const matchInfoHtml = `
        <div class="match-info">
            <div class="match-info-context">
                <div class="info-text">
                    <span>${matchday.details || 'MATCHDAY'} - ${'Matchday ' + (mdIndex + 1 + ',') || ''}</span>
                    <span>${matchSeasonData.year} Season </span>
                </div>
                <div class="team-score">
                    <a href="team-info.html?team=${team1.id}" class="team1 cur">
                        <img src="${team1.img}" alt="${team1.name}">
                        <span>${team1.name}</span>
                    </a>
                    <div class="final-score">
                        ${match.score1}-${match.score2}
                    </div>
                    <a href="team-info.html?team=${team2.id}" class="team2 cur">
                        <img src="${team2.img}" alt="${team2.name}">
                        <span>${team2.name}</span>
                    </a>
                </div>
                <div class="player-goals">
                    <div class="team1">
                        ${groupGoalsByPlayer(match.goals, match.team1)}
                    </div>
                    <div class="team2">
                        ${groupGoalsByPlayer(match.goals, match.team2)}
                    </div>
                </div>
                ${renderCardsSection(match)}
            </div>
        </div>
    `;

    content.innerHTML = matchInfoHtml;
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', displayMatchInfo);