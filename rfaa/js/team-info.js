import { getCurrentSeason, getTeamById, getTeamMacthes, getFinalsAndWins  } from './acl-index.js';
import { seasons } from './acl-index.js';

const team = getTeambyLink();

const topContent = document.querySelector('.content-team-info');

function getTeambyLink() {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('team');
    if (!teamId) return null;
    return getTeamById(teamId);
}

console.log(team);

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



import { seasons } from './acl-index.js';
import { getTeamById } from './acl-index.js';

export function calculatePlayerRatings() {
    const playerStats = {};
    
    // Collect detailed stats from all seasons
    seasons.forEach(season => {
        if (!season.matchdays) return;
        
        season.matchdays.forEach(matchday => {
            if (!matchday.games) return;
            
            // Determine match importance multiplier
            let importanceMultiplier = 1.0;
            if (matchday.bracketType === 'finals') importanceMultiplier = 2.0;
            else if (matchday.bracketType === 'semiFinals') importanceMultiplier = 1.8;
            else if (matchday.bracketType === 'quarterFinals') importanceMultiplier = 1.6;
            else if (matchday.bracketType === 'round16') importanceMultiplier = 1.4;
            else if (matchday.details?.includes('Final')) importanceMultiplier = 1.3;
            
            matchday.games.forEach(game => {
                const totalGoals = (game.score1 || 0) + (game.score2 || 0);
                const gameQuality = Math.min(1.2, 1 + (totalGoals * 0.05)); // Bonus for high-scoring games
                
                // Initialize players who appeared in the match
                [game.team1, game.team2].forEach(teamId => {
                    const team = getTeamById(teamId);
                    if (team && team.player) {
                        team.player.forEach(playerName => {
                            if (!playerStats[playerName]) {
                                playerStats[playerName] = {
                                    goals: 0,
                                    assists: 0,
                                    potm: 0,
                                    appearances: 0,
                                    weightedGoals: 0,
                                    weightedAssists: 0,
                                    weightedPOTM: 0,
                                    bigGameGoals: 0,
                                    consistency: 0,
                                    matchTypes: []
                                };
                            }
                            playerStats[playerName].appearances++;
                            playerStats[playerName].matchTypes.push({
                                importance: importanceMultiplier,
                                quality: gameQuality
                            });
                        });
                    }
                });
                
                // Count POTM awards with weighted scoring
                if (game.potm && game.potm !== 'none') {
                    if (!playerStats[game.potm]) {
                        playerStats[game.potm] = {
                            goals: 0, assists: 0, potm: 0, appearances: 0,
                            weightedGoals: 0, weightedAssists: 0, weightedPOTM: 0,
                            bigGameGoals: 0, consistency: 0, matchTypes: []
                        };
                    }
                    playerStats[game.potm].potm++;
                    playerStats[game.potm].weightedPOTM += (importanceMultiplier * gameQuality);
                }
                
                // Count goals and assists with weighted scoring
                if (game.goals && Array.isArray(game.goals)) {
                    game.goals.forEach(goal => {
                        // Count goal
                        if (!playerStats[goal.player]) {
                            playerStats[goal.player] = {
                                goals: 0, assists: 0, potm: 0, appearances: 0,
                                weightedGoals: 0, weightedAssists: 0, weightedPOTM: 0,
                                bigGameGoals: 0, consistency: 0, matchTypes: []
                            };
                        }
                        
                        playerStats[goal.player].goals++;
                        
                        // Calculate weighted goal value
                        let goalValue = importanceMultiplier * gameQuality;
                        
                        // Bonus for goal types
                        if (goal.type === 'free kick') goalValue *= 1.2;
                        else if (goal.type === 'penalty') goalValue *= 0.9; // Penalties are easier
                        
                        // Bonus for late goals (if minute data exists)
                        if (goal.minute && goal.minute >= 85) goalValue *= 1.15;
                        
                        playerStats[goal.player].weightedGoals += goalValue;
                        
                        // Track big game goals
                        if (importanceMultiplier >= 1.6) {
                            playerStats[goal.player].bigGameGoals++;
                        }
                        
                        // Count assist
                        if (goal.assist && goal.assist !== 'none' && goal.assist !== false) {
                            if (!playerStats[goal.assist]) {
                                playerStats[goal.assist] = {
                                    goals: 0, assists: 0, potm: 0, appearances: 0,
                                    weightedGoals: 0, weightedAssists: 0, weightedPOTM: 0,
                                    bigGameGoals: 0, consistency: 0, matchTypes: []
                                };
                            }
                            playerStats[goal.assist].assists++;
                            playerStats[goal.assist].weightedAssists += (goalValue * 0.7); // Assists worth 70% of goals
                        }
                    });
                }
            });
        });
    });
    
    // Calculate consistency and final ratings
    const players = Object.entries(playerStats).map(([name, stats]) => {
        // Calculate consistency (how regularly player contributes)
        const totalContributions = stats.goals + stats.assists + stats.potm;
        stats.consistency = stats.appearances > 0 ? 
            Math.min(1, (totalContributions / stats.appearances) * 2) : 0;
        
        // Calculate average match importance
        const avgImportance = stats.matchTypes.length > 0 ?
            stats.matchTypes.reduce((sum, match) => sum + match.importance, 0) / stats.matchTypes.length : 1;
        
        return { name, ...stats, avgImportance };
    });
    
    if (players.length === 0) return [];
    
    // Find max values for normalization
    const maxWeightedGoals = Math.max(...players.map(p => p.weightedGoals), 1);
    const maxWeightedAssists = Math.max(...players.map(p => p.weightedAssists), 1);
    const maxWeightedPOTM = Math.max(...players.map(p => p.weightedPOTM), 1);
    const maxAppearances = Math.max(...players.map(p => p.appearances), 1);
    const maxBigGameGoals = Math.max(...players.map(p => p.bigGameGoals), 1);
    
    // Calculate final ratings with Fotmob-inspired algorithm
    return players.map(player => {
        // Normalize each component (0-1)
        const goalsScore = player.weightedGoals / maxWeightedGoals;
        const assistsScore = player.weightedAssists / maxWeightedAssists;
        const potmScore = player.weightedPOTM / maxWeightedPOTM;
        const consistencyScore = player.consistency;
        const bigGameScore = player.bigGameGoals / maxBigGameGoals;
        const experienceScore = Math.min(1, player.appearances / maxAppearances);
        
        // Fotmob-inspired weighted calculation
        const rawRating = (
            goalsScore * 0.35 +           // Goals (35%)
            assistsScore * 0.25 +         // Assists (25%)
            potmScore * 0.20 +            // POTM awards (20%)
            consistencyScore * 0.10 +     // Consistency (10%)
            bigGameScore * 0.07 +         // Big game performance (7%)
            experienceScore * 0.03        // Experience/appearances (3%)
        );
        
        // Apply match importance bonus
        const importanceBonus = Math.min(0.5, (player.avgImportance - 1) * 0.3);
        
        // Scale to 1-10 range with minimum floor
        let rating = Math.max(1, (rawRating + importanceBonus) * 9 + 1);
        
        // Apply final adjustments
        if (player.goals === 0 && player.assists === 0 && player.potm === 0) {
            rating = Math.min(rating, 3.0); // Cap rating for players with no contributions
        }
        
        // Round to 1 decimal place
        rating = Math.round(rating * 10) / 10;
        
        return {
            name: player.name,
            goals: player.goals,
            assists: player.assists,
            potm: player.potm,
            appearances: player.appearances,
            bigGameGoals: player.bigGameGoals,
            rating,
            // Additional metrics for analysis
            goalsPerGame: player.appearances > 0 ? (player.goals / player.appearances).toFixed(2) : '0.00',
            assistsPerGame: player.appearances > 0 ? (player.assists / player.appearances).toFixed(2) : '0.00',
            contributionsPerGame: player.appearances > 0 ? 
                ((player.goals + player.assists) / player.appearances).toFixed(2) : '0.00',
            consistency: Math.round(player.consistency * 100),
            avgImportance: player.avgImportance.toFixed(2)
        };
    }).sort((a, b) => b.rating - a.rating);
}

// Get top rated players for a specific season
export function getTopRatedPlayersBySeason(seasonYear = null, limit = 10) {
    // Modify the function to filter by season if needed
    const allRatings = calculatePlayerRatings();
    return allRatings.slice(0, limit);
}

// Get player rating by name
export function getPlayerRating(playerName) {
    const ratings = calculatePlayerRatings();
    const player = ratings.find(p => p.name === playerName);
    return player ? player.rating : 1.0;
}

// Console log function for testing
console.log('Player Ratings:', calculatePlayerRatings().slice(0, 10));