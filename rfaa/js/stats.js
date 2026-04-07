
import { seasons } from './acl-index.js';
import { getTopGoalScorers, getTopAssistProviders, getTopPOTM, getWinners, getPlayerTeams } from './aot-stats.js';
import { getTeamById } from './acl-index.js';


// Current selection state
let currentSeason = 'all';
let currentStatType = 'goals';

// Populate season selectors dynamically from seasons array
function populateSeasonSelectors() {
    const seasonTypesContainer = document.querySelector('.type-selectors .types-cont:first-child .types');
    if (!seasonTypesContainer) return;

    // Clear existing selectors
    seasonTypesContainer.innerHTML = '';

    // Add "All Seasons" option
    const allSeasonsOption = document.createElement('div');
    allSeasonsOption.className = 'type selected';
    allSeasonsOption.textContent = 'All Seasons';
    allSeasonsOption.dataset.season = 'all';
    seasonTypesContainer.appendChild(allSeasonsOption);

    // Add options for each season in the seasons array
    seasons.forEach(season => {
        const seasonOption = document.createElement('div');
        seasonOption.className = 'type';
        seasonOption.textContent = season.year;
        seasonOption.dataset.season = season.year;
        seasonTypesContainer.appendChild(seasonOption);
    });

    // Add event listeners for season selection
    seasonTypesContainer.querySelectorAll('.type').forEach(type => {
        type.addEventListener('click', () => {
            // Remove selected class from all season selectors
            seasonTypesContainer.querySelectorAll('.type').forEach(t => t.classList.remove('selected'));
            // Add selected class to clicked selector
            type.classList.add('selected');
            
            currentSeason = type.dataset.season;
            updateStatsTable();
        });
    });
}

// Add event listeners for stat type selectors
function setupStatTypeSelectors() {
    const statTypesContainer = document.querySelector('.type-selectors .types-cont:last-child .types');
    if (!statTypesContainer) return;

    // Set initial selected state for "Goals" option
    const goalsOption = Array.from(statTypesContainer.querySelectorAll('.type')).find(type => 
        type.textContent.trim() === 'Goals'
    );
    if (goalsOption) {
        goalsOption.classList.add('selected');
        currentStatType = 'goals';
    }

    statTypesContainer.querySelectorAll('.type').forEach(type => {
        type.addEventListener('click', () => {
            // Remove selected class from all stat type selectors
            statTypesContainer.querySelectorAll('.type').forEach(t => t.classList.remove('selected'));
            // Add selected class to clicked selector
            type.classList.add('selected');
            
            currentStatType = getStatTypeFromText(type.textContent.trim());
            updateStatsTable();
        });
    });
}

// Convert stat type text to internal identifier
function getStatTypeFromText(text) {
    const typeMap = {
        'G+A': 'goals_assists',
        'Goals': 'goals',
        'Assists': 'assists',
        'Apperences': 'appearances',
        'G/MP ratio': 'goals_per_game_ratio',
        'Free Kicks': 'free_kicks',
        'Penalties': 'penalties',
        'Finals Apps': 'finals_apps',
        'Finals Goals': 'finals_goals'
    };
    return typeMap[text] || 'goals';
}

// Get stats based on type and season
function getStatsForType(statType, season) {
    const seasonFilter = season === 'all' ? undefined : season;
    
    switch (statType) {
        case 'goals':
            return getTopGoalScorers(seasonFilter);
        case 'assists':
            return getTopAssistProviders(seasonFilter);
        case 'finals_apps':
            return getWinners(seasonFilter);
        case 'goals_assists':
            return getCombinedGoalsAssists(seasonFilter);
        case 'appearances':
            return getPlayerAppearances(seasonFilter);
        case 'goals_per_game_ratio':
            return goals_per_game_ratio(seasonFilter);
        case 'free_kicks':
            return getGoalsByType('free kick', seasonFilter);
        case 'penalties':
            return getGoalsByType('penalty', seasonFilter);
        case 'finals_goals':
            return getFinalsGoals(seasonFilter);
        default:
            return getTopGoalScorers(seasonFilter);
    }
}

function getGoalsByType(goalType, season) {
    const playerCount = {};

    seasons.forEach(seasonData => {
        if (!seasonData || !seasonData.matchdays) return;
        if (season && seasonData.year !== season) return;

        seasonData.matchdays.forEach(matchday => {
            if (!matchday.games) return;

            matchday.games.forEach(game => {
                if (!game.goals) return;

                game.goals.forEach(goal => {
                    if (!goal.player || goal.type !== goalType) return;
                    if (!playerCount[goal.player]) playerCount[goal.player] = 0;
                    playerCount[goal.player]++;
                });
            });
        });
    });

    return Object.entries(playerCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

function goals_per_game_ratio(season) {
    const goalScorers = getTopGoalScorers(season);
    const appearances = getPlayerAppearances(season);

    // Map player names to goals
    const goalsMap = new Map();
    goalScorers.forEach(player => {
        goalsMap.set(player.name, player.count);
    });

    // Calculate goals per match ratio for each player with at least one appearance
    const ratios = appearances
        .filter(player => player.count > 0 && goalsMap.has(player.name))
        .map(player => ({
            name: player.name,
            count: +(goalsMap.get(player.name) / player.count).toFixed(2)
        }))
        .sort((a, b) => b.count - a.count);

        console.log(ratios);
    return ratios;
}

// Get combined goals + assists stats
function getCombinedGoalsAssists(season) {
    const goalScorers = getTopGoalScorers(season);
    const assistProviders = getTopAssistProviders(season);
    
    // Create a map to combine stats
    const combinedMap = new Map();
    
    // Add goals
    goalScorers.forEach(player => {
        combinedMap.set(player.name, (combinedMap.get(player.name) || 0) + player.count);
    });
    
    // Add assists
    assistProviders.forEach(player => {
        combinedMap.set(player.name, (combinedMap.get(player.name) || 0) + player.count);
    });
    
    // Convert back to array and sort
    return Array.from(combinedMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}



// Get player appearances from game-level appearances arrays and goal/potm data
function getPlayerAppearances(season) {
    const appearancesMap = new Map();

    seasons.forEach(seasonObj => {
        if (season && seasonObj.year !== season) return;
        if (!seasonObj.matchdays) return;

        seasonObj.matchdays.forEach(matchday => {
            if (!matchday.games) return;

            matchday.games.forEach(game => {
                const playersInGame = new Set();

                // Use appearances array if available
                if (Array.isArray(game.appearances)) {
                    game.appearances.forEach(p => {
                        if (typeof p === 'string') playersInGame.add(p);
                        else if (p && p.name) playersInGame.add(p.name);
                    });
                }

                // Also count players from goals/assists/potm
                if (game.goals && Array.isArray(game.goals)) {
                    game.goals.forEach(goal => {
                        if (goal.player) playersInGame.add(goal.player);
                        if (goal.assist && goal.assist !== 'none' && goal.assist !== false) playersInGame.add(goal.assist);
                    });
                }
                if (game.potm && game.potm !== 'none') playersInGame.add(game.potm);

                playersInGame.forEach(name => {
                    appearancesMap.set(name, (appearancesMap.get(name) || 0) + 1);
                });
            });
        });
    });

    return Array.from(appearancesMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

// Get goals scored in finals (last matchday of each season)
function getFinalsGoals(season) {
    const playerGoals = new Map();

    seasons.forEach(seasonObj => {
        if (season && seasonObj.year !== season) return;
        if (!seasonObj.matchdays) return;

        // Final = last matchday with games
        const lastMatchday = [...seasonObj.matchdays].reverse().find(md => md.games && md.games.length > 0);
        if (!lastMatchday) return;

        lastMatchday.games.forEach(game => {
            if (!game.goals) return;
            game.goals.forEach(goal => {
                if (!goal.player) return;
                playerGoals.set(goal.player, (playerGoals.get(goal.player) || 0) + 1);
            });
        });
    });

    return Array.from(playerGoals.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

// Update the stats table based on current selections
function updateStatsTable() {
    const board = document.querySelector('.board');
    if (!board) return;

    // Get current stats
    const stats = getStatsForType(currentStatType, currentSeason);
    
    // Update table header
    const statLabel = getStatLabel(currentStatType);
    board.innerHTML = `
        <div class="title-row">
            <div class="title-item fill"></div>
            <div class="title-item">
                <span>${statLabel}</span>
            </div>
        </div>
    `;

    // Populate the table with stats
    stats.slice(0, 50).forEach((player, index) => {
        const statRow = document.createElement('div');
        statRow.className = 'stat-row';

        const playerTeams = getPlayerTeams(player.name) || [];
        const teamImages = playerTeams.slice(0, 3).map(teamId => {
            const team = getTeamById(teamId);
            return team && team.img ? `<img src="/rfaa/${team.img}" alt="${team.name}" />` : '';
        }).filter(img => img).join('');

        statRow.innerHTML = `
            <div class="title-item player">
                <div class="rank">${String(index + 1).padStart(2, '0')}</div>
                <div class="p-t-name">
                    <span>${player.name}</span>
                    <div class="p-clubs">
                        ${teamImages}
                    </div>
                </div>
            </div>
            <div class="title-item stat">${player.count}</div>
        `;

        board.appendChild(statRow);
    });

    // Show message if no data
    if (stats.length === 0) {
        const noDataRow = document.createElement('div');
        noDataRow.className = 'stat-row';
        noDataRow.innerHTML = `
            <div class="title-item" style="text-align: center; padding: 2rem; color: #666;">
                No data available for the selected criteria
            </div>
        `;
        board.appendChild(noDataRow);
    }
}

// Get display label for stat type
function getStatLabel(statType) {
    const labelMap = {
        'goals': 'Goals',
        'assists': 'Assists', 
        'finals_apps': 'Finals Apps',
        'goals_assists': 'Goals + Assists',
        'appearances': 'Appearances',
        'goals_per_game_ratio': 'Goals/Match Ratio',
        'free_kicks': 'Free Kicks',
        'penalties': 'Penalties',
        'finals_goals': 'Finals Goals'
    };
    return labelMap[statType] || 'Goals';
}

// Initialize the stats page
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the alltime.html page
    if (!document.querySelector('.stats-cont')) {
        return;
    }

    // Fix any relative image paths to absolute paths
    document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('/rfaa/') && !src.startsWith('http')) {
            img.src = '/rfaa/' + src;
        }
    });
    
    // Setup functionality
    populateSeasonSelectors();
    setupStatTypeSelectors();
    updateStatsTable();
});

