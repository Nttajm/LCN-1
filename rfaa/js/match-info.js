import { getCurrentSeason, getTeamById } from './acl-index.js';
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

    const matchInfoHtml = `
        <div class="match-info">
            <div class="match-info-context">
                <div class="info-text">
                    <span>${matchday.details || 'MATCHDAY'} - ${'Matchday ' + (mdIndex + 1 + ',') || ''}</span>
                    <span>${matchSeasonData.year} Season </span>
                </div>
                <div class="team-score">
                    <div class="team1">
                        <img src="${team1.img}" alt="${team1.name}">
                        <span>${team1.name}</span>
                    </div>
                    <div class="final-score">
                        ${match.score1}-${match.score2}
                    </div>
                    <div class="team2">
                        <img src="${team2.img}" alt="${team2.name}">
                        <span>${team2.name}</span>
                    </div>
                </div>
                <div class="player-goals">
                    <div class="team1">
                        ${match.goals
                            .filter(goal => goal.team === match.team1)
                            .sort((a, b) => parseInt(a.minute) - parseInt(b.minute))
                            .map(goal => `<span>${goal.player} ${goal.minute || 'N/A'}'</span>`)
                            .join('')}
                    </div>
                    <div class="team2">
                        ${match.goals
                            .filter(goal => goal.team === match.team2)
                            .sort((a, b) => parseInt(a.minute) - parseInt(b.minute))
                            .map(goal => `<span>${goal.player} ${goal.minute || 'N/A'}'</span>`)
                            .join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    content.innerHTML = matchInfoHtml;
}


// Call the function when the page loads
document.addEventListener('DOMContentLoaded', displayMatchInfo);