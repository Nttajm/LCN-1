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


    statsCont.innerHTML = `
        <div class="stat-table" id="ps-goals">
            <div class="header">
                <h3>All-Time Goal Scorers</h3>
                 ${renderStatList(goalScorers, getPlayerTeams, true)}
            </div>
            ${renderStatList(goalScorers, getPlayerTeams)}
        </div>
        <div class="stat-table" id="ps-assists">
            <div class="header">
                <h3>All-Time Assists</h3>
                ${renderStatList(assistLeaders, getPlayerTeams, true)}
            </div>
            ${renderStatList(assistLeaders, getPlayerTeams)}
        </div>
        <div class="stat-table" id="ps-potm">
            <div class="header">
                <h3>All-Time Player of the Match</h3>
                ${renderStatList(potmLeaders, getPlayerTeams, true)}
            </div>
            ${renderStatList(potmLeaders, getPlayerTeams)}
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

function getTopGoalScorers(m) {
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

function getTopAssistProviders(m) {
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

function getTopPOTM(m) {
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

function getPlayerTeams(playerName) {
    // Find the player in the players array
    const player = players.find(p => p.name === playerName);
    if (!player.name) return [];
    if (!player) return [];
    if (!player || !player.teams) return [];
    
    // Get the team IDs for this player
    return Object.keys(player.teams);
}

// Call this function when your page loads or when needed
document.addEventListener('DOMContentLoaded', () => {
    displayStatistics();
});