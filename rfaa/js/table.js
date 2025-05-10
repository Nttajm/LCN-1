import { seasons } from './acl-index.js'
import { goals } from './acl-index.js'
import { teams } from './acl-index.js';
import { getTeamById } from './acl-index.js';
import { getCurrentSeason } from './acl-index.js';

function calculateStandings(seasonData) {
    if (!seasonData || !seasonData.matchdays) return [];
    
    // Initialize standings object to track team statistics
    const standings = {};
    
    // Initialize each team in the standings
    seasonData.teams.forEach(teamId => {
        standings[teamId] = {
            id: teamId,
            name: getTeamById(teamId).name,
            img: getTeamById(teamId).img,
            gamesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
        };
    });
    
    // Process all matches in the season
    seasonData.matchdays.forEach(matchday => {
        if (!matchday.games) return;
        if (matchday.bracketType) return;
        
        matchday.games.forEach(game => {
            const team1 = game.team1;
            const team2 = game.team2;
            const score1 = parseInt(game.score1);
            const score2 = parseInt(game.score2);
            
            if (!standings[team1] || !standings[team2]) return;
            
            // Update games played
            standings[team1].gamesPlayed++;
            standings[team2].gamesPlayed++;
            
            // Update goals
            standings[team1].goalsFor += score1;
            standings[team1].goalsAgainst += score2;
            standings[team2].goalsFor += score2;
            standings[team2].goalsAgainst += score1;
            
            // Update wins, draws, losses, and points
            if (score1 > score2) {
                // Team 1 wins
                standings[team1].wins++;
                standings[team1].points += 3;
                standings[team2].losses++;
            } else if (score1 < score2) {
                // Team 2 wins
                standings[team2].wins++;
                standings[team2].points += 3;
                standings[team1].losses++;
            } else {
                // Draw
                standings[team1].draws++;
                standings[team1].points += 1;
                standings[team2].draws++;
                standings[team2].points += 1;
            }
        });
    });
    
    // Calculate goal difference
    Object.keys(standings).forEach(teamId => {
        standings[teamId].goalDifference = standings[teamId].goalsFor - standings[teamId].goalsAgainst;
    });
    
    // Convert to array and sort
    const standingsArray = Object.values(standings);
    standingsArray.sort((a, b) => {
        // Sort by points (descending)
        if (b.points !== a.points) return b.points - a.points;
        
        // If points are equal, sort by goal difference
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        
        // If goal difference is equal, sort by goals scored
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        
        // If everything is equal, sort alphabetically by team name
        return a.name.localeCompare(b.name);
    });
    
    return standingsArray;
}

// Function to render the standings table
function renderStandingsTable(standingsData) {
    if (!standingsData || standingsData.length === 0) {
        return `
        <div class="ptable">
            <h1 class="headin">Standings</h1>
            <p>No standings data available for this season.</p>
        </div>
        `;
    }
    
    const tableRows = standingsData.map((team, index) => {
        // Determine row class based on position
        let rowClass = "pos";
        if (index < 12) rowClass = "wpos"; // Top 4 teams
        
        return `
        <tr class="${rowClass}">
            <td>${index + 1}</td>
            <td>
                <div class="team-name-cell">
                    <img src="${team.img}" alt="${team.name}" class="team-icon">
                    ${team.name}
                </div> 
            </td>
            <td>${team.gamesPlayed}</td>
            <td>${team.wins}</td>
            <td>${team.draws}</td>
            <td>${team.losses}</td>
            <td>${team.goalDifference > 0 ? '+' + team.goalDifference : team.goalDifference}</td>
            <td>${team.points}</td>
        </tr>
        `;
    }).join('');
    
    return `
    <div class="ptable">
        <h1 class="headin">League Phase standings</h1>
        <table>
            <tr class="col">
                <th>#</th>
                <th>Team</th>
                <th>GP</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GD</th>
                <th>PTS</th>
            </tr>
            ${tableRows}
        </table>
    </div>
    `;
}

const outputHTml = document.getElementById('output');

function renderTable() {
    const outputHTml = document.getElementById('output');
    outputHTml.innerHTML = ''; // Clear previous content

    outputHTml.innerHTML += `
    ${renderStandingsTable(calculateStandings(seasons[0]))}
    `;
}

renderTable();

