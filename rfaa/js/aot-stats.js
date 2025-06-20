import { getCurrentSeason } from "./acl-index.js";
import { seasons } from "./acl-index.js";
import { players } from "./players.js";
import { getTeamById } from "./acl-index.js";

function displayStatistics() {
    const statsCont = document.querySelector('.stats');
    if (!statsCont) return;

    // Generate top goal scorers of all time
    const goalScorers = getTopGoalScorers();
    
    // Generate assists leaderboard of all time
    const assistLeaders = getTopAssistProviders();

    // Get players with most player of the match awards of all time
    const potmLeaders = getTopPOTM();

    const finalWinners = getWinners();


    statsCont.innerHTML = `
        <div class="stat-table" id="ps-goals">
            <div class="header">
                <h3>All-Time Goal Scorers</h3>
                 ${renderStatList(goalScorers, getPlayerTeams, true)}
            </div>
            ${renderStatList(goalScorers, getPlayerTeams)}
            <div class="full-rankings">
                <a href="/rfaa/acl/stats/alltime.html?type=goals" class="link">View All</a>
            </div>
        </div>
        <div class="stat-table" id="ps-assists">
            <div class="header">
                <h3>All-Time Assists</h3>
                ${renderStatList(assistLeaders, getPlayerTeams, true)}
            </div>
            ${renderStatList(assistLeaders, getPlayerTeams)}
            <div class="full-rankings">
                <a href="/rfaa/acl/stats/alltime.html?type=assists" class="link">View All</a>
            </div>
        </div>
        <div class="stat-table" id="ps-potm">
            <div class="header">
                <h3>All-Time Player of the Match</h3>
                ${renderStatList(potmLeaders, getPlayerTeams, true)}
            </div>
            ${renderStatList(potmLeaders, getPlayerTeams)}
            <div class="full-rankings">
                <a href="/rfaa/acl/stats/alltime.html?type=potm" class="link">View All</a>
            </div>
        </div>

        <div class="stat-table" id="ps-potm">
            <div class="header">
                <h3>All-Time Finalists</h3>
                ${renderStatList(finalWinners, getPlayerTeams, true)}
            </div>
            ${renderStatList(finalWinners, getPlayerTeams)}
            <div class="full-rankings">
                <a href="/rfaa/acl/stats/alltime.html?type=potm" class="link">View All</a>
            </div>
        </div>
        
    `;
}

function renderStatList(stats, teamsFn, m) {
    if (!stats || stats.length === 0) {
        return `<div class="p-t">No data available</div>`;
    }
    
    if (!m) {
        return stats.slice(1, 6).map((stat, index) => {
        const playerTeams = teamsFn(stat.name, m);
        
        return `
            <div class="p-t">
                <div class="rank">${index + 2}</div>
                <div class="p-t-name">
                    <span>${stat.name}</span>
                    <div class="p-clubs">
                        ${playerTeams.map(teamId => {
                            const team = getTeamById(teamId, m);
                            return `<img src="${team.img}" alt="${team.name}">`;
                        }).join('')}
                    </div>
                </div>
                <div class="p-t-quant">
                    ${stat.count}
                </div>
            </div>
        `;
    }).join('');
    } else {
        return stats.slice(0, 1).map((stat, index) => {
        const playerTeams = teamsFn(stat.name, m);
        
        return `
            <div class="p-t">
                <div class="rank">${index + 1}</div>
                <div class="p-t-name">
                    <span>${stat.name}</span>
                    <div class="p-clubs">
                        ${playerTeams.map(teamId => {
                            const team = getTeamById(teamId, m);
                            return `<img src="${team.img}" alt="${team.name}">`;
                        }).join('')}
                    </div>
                </div>
                <div class="p-t-quant">
                    ${stat.count}
                </div>
            </div>
        `;
    }).join('');
    }
}

export function getTopGoalScorers(m) {
    // Create a map to count goals per player across all seasons
    const playerGoals = {};
    
    // Iterate through all seasons
    seasons.forEach(seasonData => {
        if (!seasonData || !seasonData.matchdays) return;
        
        // Count goals across all matches in each season
        seasonData.matchdays.forEach(matchday => {
            if (!matchday.games) return;
            
            matchday.games.forEach(game => {
                if (!game.goals) return;
                
                game.goals.forEach(goal => {
                    if (!goal.player) return;
                    
                    if (!playerGoals[goal.player]) {
                        playerGoals[goal.player] = 0;
                    }
                    
                    playerGoals[goal.player]++;
                });
            });
        });
    });
    
    // Convert to array and sort by goal count
    return Object.entries(playerGoals)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

export function getTopAssistProviders(m) {
    // Create a map to count assists per player across all seasons
    const playerAssists = {};
    
    // Iterate through all seasons
    seasons.forEach(seasonData => {
        if (!seasonData || !seasonData.matchdays) return;
        
        // Count assists across all matches in each season
        seasonData.matchdays.forEach(matchday => {
            if (!matchday.games) return;
            
            matchday.games.forEach(game => {
                if (!game.goals) return;
                
                game.goals.forEach(goal => {
                    if (!goal.assist) return;
                    
                    if (!playerAssists[goal.assist]) {
                        playerAssists[goal.assist] = 0;
                    }
                    
                    playerAssists[goal.assist]++;
                });
            });
        });
    });
    
    // Convert to array and sort by assist count
    return Object.entries(playerAssists)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

export function getTopPOTM(m) {
    // Create a map to count POTM awards per player across all seasons
    const playerPOTM = {};
    
    // Iterate through all seasons
    seasons.forEach(seasonData => {
        if (!seasonData || !seasonData.matchdays) return;
        
        // Count POTM across all matches in each season
        seasonData.matchdays.forEach(matchday => {
            if (!matchday.games) return;
            
            matchday.games.forEach(game => {
                if (!game.potm || game.potm === "none") return;
                
                if (!playerPOTM[game.potm]) {
                    playerPOTM[game.potm] = 0;
                }
                
                playerPOTM[game.potm]++;
            });
        });
    });
    
    // Convert to array and sort by POTM count
    return Object.entries(playerPOTM)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

export function getPlayerTeams(playerName) {
    // Find the player in the players array
    const player = players.find(p => p && p.name === playerName);
    if (!player) return [];
    if (!player.name) return [];
    if (!player) return [];
    if (!player || !player.teams) return [];
    
    // Get the team IDs for this player
    return Object.keys(player.teams);
}

export function getWinners() {
    // Create a map to count finals appearances for players
    const playerFinals = {};
    
    // Iterate through all seasons
    seasons.forEach(seasonData => {
        if (!seasonData || !seasonData.matchdays) return;
        
        // Find the finals matchday in this season
        const finalsMatchday = seasonData.matchdays.find(md => md.bracketType === 'finals');
        if (!finalsMatchday || !finalsMatchday.games || finalsMatchday.games.length === 0) return;
        
        // Get the year of this season
        const seasonYear = parseInt(seasonData.year);
        
        // Get the teams that reached the finals
        const finalsTeams = finalsMatchday.games.flatMap(game => [game.team1, game.team2]);
        
        // For each team that reached the finals, find all players who were on that team that season
        finalsTeams.forEach(teamId => {
            // Find players who were on this team during this season
            const teamPlayers = players.filter(player => {
                return player.teams && 
                       player.teams[teamId] && 
                       player.teams[teamId].years && 
                       (Array.isArray(player.teams[teamId].years) ? 
                           player.teams[teamId].years.includes(seasonYear) : 
                           player.teams[teamId].years.some(yearRange => 
                               (Array.isArray(yearRange) && 
                                yearRange[0] <= seasonYear && 
                                yearRange[1] >= seasonYear)
                           )
                       );
            });
            
            // Increment finals count for each player
            teamPlayers.forEach(player => {
                if (!playerFinals[player.name]) {
                    playerFinals[player.name] = 0;
                }
                playerFinals[player.name]++;
            });
        });
    });
    
    // Convert to array and sort by finals appearances count
    return Object.entries(playerFinals)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

// Call this function when your page loads or when needed
document.addEventListener('DOMContentLoaded', () => {
    displayStatistics();
});


const viewport = document.querySelector('.stats-cont');
const content = document.querySelector('.stats');

if (viewport && content) {
    const sb = new ScrollBooster({
        viewport: viewport,
        content: content,
        scrollMode: 'transform',
        direction: 'horizontal',
    });
}
 