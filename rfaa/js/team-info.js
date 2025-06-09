import { getCurrentSeason, getTeamById, getTeamMacthes, getFinalsAndWins , getPlayersByTeam } from './acl-index.js';
import { seasons } from './acl-index.js';

const team = getTeambyLink();

const topContent = document.querySelector('.content-team-info');

function getTeambyLink() {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('team');
    if (!teamId) return null;
    return getTeamById(teamId);
}

function getTeamForm(teamId) {
    const results = [];
    
    seasons.forEach(season => {
        if (!season.matchdays) return;

        season.matchdays.forEach(matchday => {
            if (!matchday.games) return;

            matchday.games.forEach(game => {
                if (game.team1 === teamId || game.team2 === teamId) {
                    const isTeam1 = game.team1 === teamId;
                    const teamScore = isTeam1 ? game.score1 : game.score2;
                    const opponentScore = isTeam1 ? game.score2 : game.score1;

                    if (teamScore > opponentScore) {
                        results.push('W');
                    } else if (teamScore === opponentScore) {
                        results.push('D');
                    } else {
                        results.push('L');
                    }
                }
            });
        });
    });

    return results.slice(-5); // Return last 5 results
}

function rendertopcontent() {
    
    // Update team image
    const teamImage = document.querySelector('.team-image img');
    if (teamImage) {
        teamImage.src = `${team.img}`;
        teamImage.alt = team.name;
    }

    // Update team name
    const teamName = document.querySelector('.team-name span');
    if (teamName) {
        teamName.textContent = team.name;
    }

    // Update Champions League count
    const clCount = document.querySelector('.cl-count span');
    if (clCount) {
        clCount.textContent = team.clWins || 0;
    }

    // Update win years
    const winYearsContainer = document.querySelector('.win-years');
    if (winYearsContainer) {
        winYearsContainer.innerHTML = '';
        const wins = getFinalsAndWins(team.id)?.wins || [];
        wins.forEach(year => {
            const yearElement = document.createElement('span');
            yearElement.innerHTML = `<a href="/history?season=${year}">${year}</a>`;
            winYearsContainer.appendChild(yearElement);
        });
    }

    // Calculate finals appearances and wins
    const form = getTeamForm(team.id);
    const wlInfoContainer = document.querySelector('.wl-info');
    if (wlInfoContainer) {
        wlInfoContainer.innerHTML = '';
        form.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'item';
            resultElement.id = result.toLowerCase();
            resultElement.textContent = result;
            wlInfoContainer.appendChild(resultElement);
        });
    }
}

function renderTeamInfo() {
    rendertopcontent();

    if (!team) {
        document.querySelector('.content-team-info').innerHTML = ` 
        no team found`;
        return;
    }

    const matchesHTML = renderMatches_1();
    const matchesContainer = document.querySelector('.matches-cont');
    matchesContainer.innerHTML = matchesHTML; 
}


renderTeamInfo();



// ultils

function renderMatches_1() {
    if (!team) return '';

    const teamMatches = getTeamMacthes(team.id);
    let matchesHTML = '';

    teamMatches.forEach(match => {
        const team1 = getTeamById(match.game.team1);
        const team2 = getTeamById(match.game.team2);

        // console.log(match);
        matchesHTML += `
            <div class="mini-match">
                <div class="match-info">
                    <span>${match.matchday} ${match.season}</span>
                </div>
                <div class="match-scores">
                    <div class="team-1 team">
                        <div class="team-info">
                            <img src="${team1.img}" alt="${team1.name}" />
                            <span>${team1.name}</span>
                        </div>
                        <span class="score">${match.game.score1}</span>
                    </div>
                    <div class="team-2 team">
                        <div class="team-info">
                            <img src="${team2.img}" alt="${team2.name}" />
                            <span>${team2.name}</span>
                        </div>
                        <span class="score">${match.game.score2}</span>
                    </div>
                </div>
            </div>
        `;
    });

    return matchesHTML;
}




export function calculatePlayerRatings() {
    const playerStats = {};
    
    // Collect all player stats from all seasons
    seasons.forEach(season => {
        if (!season.matchdays) return;
        
        season.matchdays.forEach(matchday => {
            if (!matchday.games) return;
            
            matchday.games.forEach(game => {
                // Count POTM awards
                if (game.potm && game.potm !== 'none') {
                    if (!playerStats[game.potm]) {
                        playerStats[game.potm] = { goals: 0, assists: 0, potm: 0, appearances: 0 };
                    }
                    playerStats[game.potm].potm++;
                    playerStats[game.potm].appearances = (playerStats[game.potm].appearances || 0) + 1;
                }
                
                // Count goals and assists
                if (game.goals && Array.isArray(game.goals)) {
                    game.goals.forEach(goal => {
                        // Count goal
                        if (!playerStats[goal.player]) {
                            playerStats[goal.player] = { goals: 0, assists: 0, potm: 0, appearances: 0 };
                        }
                        playerStats[goal.player].goals++;
                        playerStats[goal.player].appearances = (playerStats[goal.player].appearances || 0) + 1;
                        
                        // Count assist
                        if (goal.assist && goal.assist !== 'none') {
                            if (!playerStats[goal.assist]) {
                                playerStats[goal.assist] = { goals: 0, assists: 0, potm: 0, appearances: 0 };
                            }
                            playerStats[goal.assist].assists++;
                            playerStats[goal.assist].appearances = (playerStats[goal.assist].appearances || 0) + 1;
                        }
                    });
                }
                
                // Add appearances for players from team1 and team2
                const team1 = getTeamById(game.team1);
                const team2 = getTeamById(game.team2);
                
                [team1, team2].forEach(team => {
                    if (team && team.player) {
                        team.player.forEach(playerName => {
                            if (!playerStats[playerName]) {
                                playerStats[playerName] = { goals: 0, assists: 0, potm: 0, appearances: 0 };
                            }
                            playerStats[playerName].appearances = (playerStats[playerName].appearances || 0) + 1;
                        });
                    }
                });
            });
        });
    });
    
    // Convert to array and calculate ratings
    const players = Object.entries(playerStats).map(([name, stats]) => {
        const maxGoals = Math.max(...Object.values(playerStats).map(p => p.goals), 1);
        const maxAssists = Math.max(...Object.values(playerStats).map(p => p.assists), 1);
        const maxPOTM = Math.max(...Object.values(playerStats).map(p => p.potm), 1);
        
        // Base rating starts at 5.0
        let rating = 5.0;
        
        // Add contributions with diminishing returns
        const goalsRatio = stats.goals / maxGoals;
        const assistsRatio = stats.assists / maxAssists;
        const potmRatio = stats.potm / maxPOTM;
        
        // Apply non-linear scaling (square root) to make it harder to reach higher values
        const goalsScore = Math.sqrt(goalsRatio) * 1.8;  // Reduced from 2.0
        const assistsScore = Math.sqrt(assistsRatio) * 1.3;  // Reduced from 1.5
        const potmScore = Math.sqrt(potmRatio) * 2.0;  // Reduced from 2.5
        
        rating += goalsScore + assistsScore + potmScore;
        
        // Bonus for overall contribution with diminishing returns
        const totalContributions = stats.goals + stats.assists + stats.potm;
        if (totalContributions > 0) {
            // Lower bonus and apply diminishing returns
            rating += Math.log10(1 + totalContributions / 8) * 0.8;
        }
        
        // Apply a sigmoid-like function to make 10 harder to reach
        if (rating > 8.5) {
            // Compress ratings between 8.5 and 10
            const excess = rating - 8.5;
            rating = 8.5 + (excess * 0.6);
        }
        
        // Minimum rating is 1.0
        rating = Math.max(1.0, rating);
        
        // Cap rating at 10
        rating = Math.min(10, rating);
        
        // Round to one decimal place
        rating = Math.round(rating * 10) / 10;
        
        return {
            name,
            goals: stats.goals,
            assists: stats.assists,
            potm: stats.potm,
            appearances: stats.appearances,
            rating,
            team: getPlayerTeam(name)
        };
    }).sort((a, b) => b.rating - a.rating);
    
    return players;
}

// To test it, just call:
console.log(calculatePlayerRatings());

export function playerStatsOfMatch(matchId) {
    // Find the match across all seasons
    let targetMatch = null;
    let matchTeams = [];

    for (let season of seasons) {
        for (let matchday of season.matchdays || []) {
            for (let game of matchday.games || []) {
                if (game.id === matchId) {
                    targetMatch = game;
                    matchTeams = [game.team1, game.team2];
                    break;
                }
            }
            if (targetMatch) break;
        }
        if (targetMatch) break;
    }

    if (!targetMatch) {
        console.error(`Match with ID ${matchId} not found`);
        return [];
    }

    const playerStats = {};

    // Get all players from both teams
    const team1 = getTeamById(matchTeams[0]);
    const team2 = getTeamById(matchTeams[1]);

    // Initialize all players from both teams
    [...(team1.player || []), ...(team2.player || [])].forEach(playerName => {
        playerStats[playerName] = {
            goals: 0,
            assists: 0,
            potm: 0,
            team: (team1.player || []).includes(playerName) ? team1.name : team2.name,
            teamId: (team1.player || []).includes(playerName) ? team1.id : team2.id,
            matchResult: 'draw' // Will be updated based on match result
        };
    });

    // Determine match result for each team
    const team1Won = targetMatch.score1 > targetMatch.score2;
    const team2Won = targetMatch.score2 > targetMatch.score1;
    const isDraw = targetMatch.score1 === targetMatch.score2;

    // Update match result for all players
    Object.keys(playerStats).forEach(playerName => {
        const isTeam1Player = (team1.player || []).includes(playerName);
        if (isDraw) {
            playerStats[playerName].matchResult = 'draw';
        } else if ((isTeam1Player && team1Won) || (!isTeam1Player && team2Won)) {
            playerStats[playerName].matchResult = 'win';
        } else {
            playerStats[playerName].matchResult = 'loss';
        }
    });

    // Count POTM award
    if (targetMatch.potm && targetMatch.potm !== 'none' && playerStats[targetMatch.potm]) {
        playerStats[targetMatch.potm].potm = 1;
    }

    // Count goals and assists
    if (targetMatch.goals && Array.isArray(targetMatch.goals)) {
        targetMatch.goals.forEach(goal => {
            if (playerStats[goal.player]) {
                playerStats[goal.player].goals++;
            }

            if (goal.assist && goal.assist !== 'none' && goal.assist !== false && playerStats[goal.assist]) {
                playerStats[goal.assist].assists++;
            }
        });
    }

    // Calculate ratings with match-specific algorithm
    const players = Object.entries(playerStats).map(([name, stats]) => {
        let rating = 5.0; // Base rating for all players who participated

        // Goal scoring bonus (much higher for single match)
        rating += stats.goals * 1.5; // +1.5 per goal

        // Assist bonus
        rating += stats.assists * 1.0; // +1.0 per assist

        // POTM bonus
        rating += stats.potm * 2.0; // +2.0 for POTM

        // Match result bonus/penalty
        if (stats.matchResult === 'win') {
            rating += 0.8; // +0.8 for being on winning team
        } else if (stats.matchResult === 'loss') {
            rating += 0.2; // +0.2 for participation even in loss
        } else {
            rating += 0.5; // +0.5 for draw
        }

        // Goal contribution bonus (goals + assists)
        const totalContributions = stats.goals + stats.assists;
        if (totalContributions >= 3) rating += 1.0; // Hat-trick or equivalent
        else if (totalContributions === 2) rating += 0.5; // Brace or goal+assist

        // Ensure rating stays within 1-10 range
        rating = Math.max(1.0, Math.min(10.0, rating));

        // Round to 1 decimal place
        rating = Math.round(rating * 10) / 10;

        return {
            name,
            goals: stats.goals,
            assists: stats.assists,
            potm: stats.potm,
            team: stats.team,
            teamId: stats.teamId,
            matchResult: stats.matchResult,
            totalContributions: totalContributions,
            rating
        };
    }).sort((a, b) => b.rating - a.rating);

    return players;
}

// Example usage
console.log(playerStatsOfMatch('match-fp3zkypqs'));
function renderFotmobStats() {
    const output = document.querySelector('.top-players-box');
    if (!output || !team) return;

    output.innerHTML = ''; // Clear previous content

    // Get all player rankings
    const allPlayerRankings = calculatePlayerRatings();

    // Filter players belonging to the current team
    const teamPlayers = getPlayersByTeam(team.id);
    const topPlayers = allPlayerRankings
        .filter(player => teamPlayers.includes(player.name))
        .slice(0, 5); // Limit to top 5 players

    if (topPlayers.length === 0) {
        output.innerHTML = '<p>No player data available</p>';
        return;
    }

    topPlayers.forEach(player => {
        // Determine rank class based on rating
        let rankClass = 'rank-5-6'; // Default
        if (player.rating >= 9.0) rankClass = 'rank-9-10';
        else if (player.rating >= 8.0) rankClass = 'rank-8-9';
        else if (player.rating >= 7.0) rankClass = 'rank-7-8';
        else if (player.rating >= 6.0) rankClass = 'rank-6-7';

        // Generate assists SVGs or number
        const assistsContent = player.assists > 4
            ? `<span class="number">${player.assists}</span>`
            : Array.from({ length: player.assists }, () => `
                <svg class="svg-assits" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14">
                    <ellipse cx="7" cy="7" rx="7" ry="7" fill="transparent"></ellipse>
                    <g id="ic_assist" transform="translate(0 0)">
                        <path id="Path_88" fill="var(--MFFullscreenColorScheme-eventIconColor)" fill-rule="evenodd" d="M12.608 5.7c-.175.1-.377.209-.6.337-.156.09-.322.188-.493.3-.806.524-6.651 4.113-7.836 4.793s-3.035.929-3.565.016 1.029-1.952 1.948-3.055C3.11 6.833 4.48 5.461 4.48 5.461c-.088-.426.332-.712.494-.805a.607.607 0 0 1 .06-.03c-.117-.5.631-.929.631-.929l1.147-2.518a.231.231 0 0 1 .094-.105.236.236 0 0 1 .208-.013l1.024.424c.673.283-.769 1.89-.465 1.962a1.67 1.67 0 0 0 1.043-.273 2.826 2.826 0 0 0 .735-.614c.48-.56-.03-1.38.249-1.543.1-.054.287-.034.642.095 1.393.535 2.192 2.211 2.776 3.254.402.709.121.973-.51 1.334zm-8.018.693a.085.085 0 0 0-.075.022l-.631.62a.079.079 0 0 0 .04.135l3.227.669a.09.09 0 0 0 .058-.009l.981-.563a.081.081 0 0 0-.02-.15zm5.558-.418l-4.407-.844a.089.089 0 0 0-.075.023l-.628.618a.081.081 0 0 0 .041.137l3.99.807a.089.089 0 0 0 .058-.009l1.041-.581a.082.082 0 0 0-.02-.151zM3.807 12.1a.083.083 0 0 1-.039.1l-.734.422a.082.082 0 0 1-.1-.016l-.546-.579a.083.083 0 0 1-.016-.063 5.312 5.312 0 0 0 1.3-.462zm1.668-.92a.083.083 0 0 1-.039.1l-.736.42a.082.082 0 0 1-.1-.016l-.41-.484c.3-.177.693-.415 1.15-.691zm5.687-3.4a.084.084 0 0 1-.039.1l-.735.422a.082.082 0 0 1-.1-.016l-.488-.5c.441-.27.839-.516 1.158-.716zM12.5 6.132c.1-.052.184-.1.268-.154L12.9 5.9l.222.754a.084.084 0 0 1-.039.1l-.734.422a.082.082 0 0 1-.1-.016L11.7 6.6c.144-.093.294-.182.466-.281.118-.068.224-.129.334-.187z"></path>
                    </g>
                </svg>
            `).join('');

        // Generate goals SVGs or number
        const goalsContent = player.goals > 4
            ? `<span class="number">${player.goals}</span>`
            : Array.from({ length: player.goals }, () => `
                <svg class="svg-goals" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="7" cy="7" r="5.25" fill="transparent"></circle>
                    <path d="M8.88284 9.49699C8.72009 9.49699 8.55734 9.48591 8.39459 9.46958C8.34242 9.4595 8.29347 9.43694 8.25192 9.40382C8.21037 9.3707 8.17746 9.32802 8.156 9.27941C7.988 8.65524 7.82525 8.06374 7.66775 7.48858C7.6388 7.41343 7.63706 7.33052 7.66285 7.25423C7.68863 7.17794 7.74031 7.11308 7.80892 7.07091L9.17625 5.84591C9.2334 5.7961 9.30665 5.76865 9.38246 5.76865C9.45827 5.76865 9.53152 5.7961 9.58867 5.84591C10.0474 6.09633 10.4588 6.42503 10.8043 6.81716C10.8827 6.91412 10.9266 7.03436 10.9292 7.15899C10.932 7.84171 10.7287 8.50937 10.3458 9.07466C10.342 9.09048 10.3346 9.10523 10.3243 9.11782C10.253 9.2147 10.1577 9.29131 10.0478 9.34008C9.67045 9.44934 9.27911 9.50241 8.88634 9.49758L8.88284 9.49699Z" fill="var(--GlobalColorScheme-Text-textDefault)"></path>
                </svg>
            `).join('');

        // Create player rating element
        const playerElement = `
            <div class="player-rating ${rankClass}">
                <span class="name">${player.name}</span>
                <span class="rating">${player.rating}</span>
                <div class="assists">
                    ${assistsContent}
                </div>
                <div class="goals">
                    ${goalsContent}
                </div>
                <img src="images/icons/noise.png" alt="grain">
            </div>
        `;

        output.innerHTML += playerElement;
    });
}

renderFotmobStats();