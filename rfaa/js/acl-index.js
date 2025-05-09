// Define global variables
export let goals = localStorage.getItem('goals') ? JSON.parse(localStorage.getItem('goals')) : [];
export let teams = [
    {
        id: 'tex',
        name: 'Cerius Texico',
        sub: `Cer'x`,
        originC: 'Texico',
        originL: 'TS',
        img: 'images/teams/cerx.png',
        player: [
            'Juventus juve',
            'Jota Eme',
            'Countino',
            'Isco',
            'Macherano',
            'Nolito',
            'Mou',
            'Alanso',
            'countino',
            'Jesko',
            'isco',
        ]
    },
    {
        id: 'BVB',
        name: 'Borussia Dortmund',
        sub: `BVB`,
        originC: 'Germany',
        originL: 'DE',
        img: 'images/teams/Borussia.png',
        player: [
            'Marco Reus',
            'Erling Haaland',
            'Jadon Sancho'
        ]
    },
    {
        id: 'deg',
        name: 'Degato',
        sub: `Degato`,
        originC: 'Bolive',
        originL: 'BKS',
        img: 'images/teams/degato.png',
        player: [
            'MeekMel',
            'Jota Eme',
            'Countino',
            'Isco',
            'Macherano',
            'Nolito',
            'Mou',
            'Alanso'
        ]
    },
    {
        id: 'penn',
        name: 'Penn FC',
        sub: `Penn`,
        originC: 'Denvor',
        originL: 'Quiser',
        img: 'images/teams/penn.png',
        player: [
            'MeekMel',
            'Jota Eme',
            'Countino',
            'Isco',
            'Macherano',
            'Nolito',
            'Mou',
            'Alanso'
        ]
    },
    {
        id: 'dj',
        name: 'Dijel FC',
        sub: `Dijel`,
        originC: 'Denvor',
        originL: 'Quiser',
        img: 'images/teams/dijel.png',
        player: [
            'MeekMel',
            'Jota Eme',
            'Countino',
            'Isco',
            'Macherano',
            'Nolito',
            'Mou',
            'Alanso'
        ]
    },
    {
        id: 'ATM',
        name: 'Atletico Madrid',
        sub: `ATM`,
        originC: 'Spain',
        originL: 'ES',
        img: 'images/teams/atleti.png',
        player: [
            'Antoine Griezmann',
            'Jan Oblak',
            'João Félix'
        ]
    },
    {
        id: 'CHE',
        name: 'Chelsea FC',
        sub: `CHE`,
        originC: 'England',
        originL: 'EN',
        img: 'images/teams/chelsea.png',
        player: [
            'Mason Mount',
            `N'Golo Kanté`,
            'Reece James'
        ]
    },
    {
        id: 'BAY',
        name: 'Bayern Munich',
        sub: `BAY`,
        originC: 'Germany',
        originL: 'DE',
        img: 'images/teams/bayern.png',
        player: [
            'Robert Lewandowski',
            'Thomas Müller',
            'Manuel Neuer'
        ]
    },


];

console.log(getTeamById('tex')); 

export let seasons = localStorage.getItem('seasons') ? JSON.parse(localStorage.getItem('seasons')) : [];
// localStorage.clear()

// DOM Elements
const content = document.querySelector('.pad-cont');

// Helper Functions
export function getTeamById(id) {
    return teams.find(team => team.id === id) || {
        name: 'Unknown Team',
        img: 'images/teams/default.png'
    };
}

function renderCreateButton(matchdays) {
    if (!matchdays || matchdays.length === 0) {
        return `
        <div class='matchdays'>
            <h1>No matchdays available</h1>
            <div class="create-matchday">
                <div class="dotted-btn fl-jsp-b" id="create-matchday-btn">
                    <span>CREATE MATCHDAY</span>
                </div>
            </div>
        </div>
        `;
    } else {
        return `
        <div class='matchdays'>
           <div class='matchday'>
           </div>
            <div class="create-matchday fl-r">
                <div class="dotted-btn" id="create-matchday-btn">
                    <span>CREATE MATCHDAY</span>
                </div>
                <div class="dotted-btn" id="create-bracket-btn">
                    <span>CREATE BRAKET</span>
                </div>
            </div>
        </div>
        `;
    }
}

function renderMatches(matchdays, passdownIndex) {
    if (!matchdays || !Array.isArray(matchdays)) return '';
    
    return matchdays.map((matchday, index) => {
        if (!matchday.games || !Array.isArray(matchday.games)) return '';
        
        const matchesHtml = matchday.games.map(game => {
            const team1 = getTeamById(game.team1);
            const team2 = getTeamById(game.team2);

            if (!game.standby) {
                return `
                <div class="md-match" data-match-id="${game.id}">
                    <div class="team-1 team">
                        <div class="team-info">
                            <img src="${team1.img}" alt="${team1.name}">
                            <span>${team1.name}</span>
                        </div>
                        <span class="score">
                            ${game.score1}
                        </span>
                    </div>
                    <div class="team-2 team">
                        <div class="team-info">
                            <img src="${team2.img}" alt="${team2.name}">
                            <span>${team2.name}</span>
                        </div>
                        <span class="score">
                            ${game.score2}
                        </span>
                    </div>
                </div>
            `;
            } else if (game.standby) {
                return `
                <div class="md-match" data-match-id="${game.id}">
                    <div class="team-1 team">
                        <div class="team-info">
                            <img src="${team1.img}" alt="${team1.name}">
                            <span>${team1.name}</span>
                        </div>
                        <span class="score">
                            ${game.score1}
                        </span>
                    </div>
                    <div class="team-2 team">
                        <div class="team-info">
                            <img src="${team2.img}" alt="${team2.name}">
                            <span>${team2.name}</span>
                        </div>
                        <span class="score">
                            ${game.score2}
                        </span>
                    </div>
                    <button class="start-match-btn js-mdi-index-${passdownIndex}" id="start-match-btn-${game.id}">
                        Start
                    </button>
                </div>`;
            }
        }).join('');

        return `
            <div class="matchday">
                ${matchesHtml}
                <div class="dotted-btn add-match-btn" id="add-match-btn-${index}">
                    <span>ADD MATCH</span>
                </div>
            </div>
        `;
    }).join('');

}
function bindMatchClickEvents() {
    document.querySelectorAll('.md-match').forEach(match => {
        match.addEventListener('click', (event) => {
            if (!event.target.classList.contains('start-match-btn')) {
                const matchId = match.getAttribute('data-match-id');
                if (matchId) {
                    window.location.href = `match-info.html?match=${matchId}`;
                }
            } else {
                const mdiIndex = Array.from(document.querySelectorAll('.start-match-btn')).indexOf(event.target);
                addMatchDialog(true, mdiIndex);
            }
        });
    });
}


function bindAddMatchButtons() {
    document.querySelectorAll('.add-match-btn').forEach(btn => {
        btn.addEventListener('click',addMatchDialog());
    });
}


let matchdayIndex = null; // Declare matchdayIndex globally to use it in addMatchDialog

function addMatchDialog(startMatch, mdiIndex) {

    const currentSeason = getCurrentSeason();
    if (startMatch) {
        matchdayIndex = mdiIndex
    } else {
        matchdayIndex = Array.from(document.querySelectorAll('.add-match-btn')).indexOf(event.target);
    }
    const matchday = seasons.find(season => season.year === currentSeason)?.matchdays[matchdayIndex];

    const notifEd = document.querySelector('.notifEd');
    const notifEdText = document.querySelector('.notifEd-context');
    notifEd.classList.toggle('dn');

    const team1Goals = [];
    const team2Goals = [];

    console.log(matchdayIndex, 'matchday');


    notifEdText.innerHTML = `
        <h1>Create Match</h1>
        <div class="score-manager fl-r">
            <div class="team-man" id="team1">
                <div class="score-display" id="team1-score">0</div>
                <select id="team1-select">
                ${startMatch ? seasons.find(season => season.year === currentSeason).teams
                    .filter(teamId => {
                        const matchdayTeams = matchday.games.flatMap(game => [game.team1, game.team2]);
                        return !matchdayTeams.includes(teamId);
                    })
                    .map(teamId => {
                        const team = getTeamById(teamId);
                        return `<option value="${teamId}">${team.name}</option>`;
                    }).join('') 
                    : matchday.games.flatMap(game => [game.team1, game.team2])
                    .filter((teamId, index, self) => self.indexOf(teamId) === index) // Ensure unique teams
                    .map(teamId => {
                        const team = getTeamById(teamId);
                        return `<option value="${teamId}">${team.name}</option>`;
                    }).join('')
                }
                </select>
                <div class="add-goal">
                    <div class="fl-r fl-ai" id="team1-add-goal">
                        <img src="icons/add.png" alt="add-goal"> Add Goal
                    </div>
                    <select id="team1-player-select">
                        ${teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                    <input type="number" id="team1-goal-minute" placeholder="Minute" min="1" max="120">
                </div>
                <ul class="goal-list" id="team1-goal-list"></ul>
            </div>

            <div class="team-man" id="team2">
                <div class="score-display" id="team2-score">0</div>
                <select id="team2-select">
                ${startMatch ? seasons.find(season => season.year === currentSeason).teams
                    .filter(teamId => {
                        const matchdayTeams = matchday.games.flatMap(game => [game.team1, game.team2]);
                        return !matchdayTeams.includes(teamId);
                    })
                    .map(teamId => {
                        const team = getTeamById(teamId);
                        return `<option value="${teamId}">${team.name}</option>`;
                    }).join('') 
                    : matchday.games.flatMap(game => [game.team1, game.team2])
                    .filter((teamId, index, self) => self.indexOf(teamId) === index) // Ensure unique teams
                    .map(teamId => {
                        const team = getTeamById(teamId);
                        return `<option value="${teamId}">${team.name}</option>`;
                    }).join('')
                }
                </select>
                <div class="add-goal">
                    <div class="fl-r fl-ai" id="team2-add-goal">
                        <img src="icons/add.png" alt="add-goal"> Add Goal
                    </div>
                    <select id="team2-player-select">
                        ${teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                    <input type="number" id="team2-goal-minute" placeholder="Minute" min="1" max="120">
                </div>
                <ul class="goal-list" id="team2-goal-list"></ul>
            </div>
        </div>
        <div class="full-btn btn" id="create-match-btn"><span>CREATE MATCH</span></div>
        <div class="btn-secondary" id="cancel-match-btn"><span>CANCEL</span></div>
    `;

    const team1Select = document.querySelector('#team1-select');
    const team2Select = document.querySelector('#team2-select');
    const team1PlayerSelect = document.querySelector('#team1-player-select');
    const team2PlayerSelect = document.querySelector('#team2-player-select');
    const team1GoalList = document.querySelector('#team1-goal-list');
    const team2GoalList = document.querySelector('#team2-goal-list');
    const playerMinute1 = document.querySelector('#team1-goal-minute');
    const playerMinute2 = document.querySelector('#team2-goal-minute');

    team1Select.addEventListener('change', () => {
        const team = getTeamById(team1Select.value);
        team1PlayerSelect.innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
    });

    team2Select.addEventListener('change', () => {
        const team = getTeamById(team2Select.value);
        team2PlayerSelect.innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
    });

    const cancelMatchBtn = document.querySelector('#cancel-match-btn');
    if (cancelMatchBtn) {
        cancelMatchBtn.addEventListener('click', () => {
            notifEd.classList.toggle('dn');
            notifEdText.innerHTML = '';
        });
    }

    // Add goal for team 1
    document.querySelector('#team1-add-goal').addEventListener('click', () => {
        const player = team1PlayerSelect.value;
        let minute = parseInt(playerMinute1.value);
        if (!player) return;
        if (isNaN(minute) || minute < 1 || minute > 120) {
            minute = Math.floor(Math.random() * 91); // Generate a random number between 0 and 90
        }

        if (!minute) {
            minute = Math.floor(Math.random() * 91);
        }

        team1Goals.push({ player, minute });
        renderGoals(team1GoalList, team1Goals);
        updateScores();
    });

    // Add goal for team 2
    document.querySelector('#team2-add-goal').addEventListener('click', () => {
        const player = team2PlayerSelect.value;
        let minute = parseInt(playerMinute2.value);
        if (!player) return;
        if (isNaN(minute) || minute < 1 || minute > 120) {
            minute = Math.floor(Math.random() * 91); // Generate a random number between 0 and 90
        }

        if (!minute) {
            minute = Math.floor(Math.random() * 91);
        }

        team2Goals.push({ player, minute });
        renderGoals(team2GoalList, team2Goals);
        updateScores();
    });

    // Create match
    document.querySelector('#create-match-btn').addEventListener('click', () => {
        const team1 = team1Select.value;
        const team2 = team2Select.value;

        if (!team1 || !team2 || team1 === team2) {
            alert('Please select two different teams.');
            return;
        }

        notifEd.classList.toggle('dn');
        notifEdText.innerHTML = '';

        const seasonData = seasons.find(season => season.year === currentSeason);
        if (!seasonData || !seasonData.matchdays[matchdayIndex]) {
            console.error('Invalid matchday index or season data.');
            return;
        }
        const matchdayGames = seasonData.matchdays[matchdayIndex].games || [];
        seasonData.matchdays[matchdayIndex].games = matchdayGames;

        if (!startMatch) {
            seasons.find(season => season.year === currentSeason).matchday.games.push({
                id: `match-${Math.random().toString(36).substr(2, 9)}`,
                team1: team1,
                team2: team2,
                score1: team1Goals.length,
                score2: team2Goals.length,
                seed: Math.floor(Math.random() * 10000),
                goals: team1Goals.map(g => ({ player: g.player, minute: g.minute, team: team1 }))
                    .concat(team2Goals.map(g => ({ player: g.player, minute: g.minute, team: team2 })))
            });
        } else {
            const thisStandbyMatch = matchdayGames.find(m => m.id === event.target.id.replace('start-match-btn-', ''));
            const index = matchdayGames.indexOf(thisStandbyMatch);
            if (index > -1) {
                matchdayGames.splice(index, 1);
            }
            seasons.find(season => season.year === currentSeason).matchdays[matchdayIndex].games.push({
                id: `match-${Math.random().toString(36).substr(2, 9)}`,
                team1: team1,
                team2: team2,
                score1: team1Goals.length,
                score2: team2Goals.length,
                seed: Math.floor(Math.random() * 10000),
                goals: team1Goals.map(g => ({ player: g.player, minute: g.minute, team: team1 }))
                    .concat(team2Goals.map(g => ({ player: g.player, minute: g.minute, team: team2 }))),
                standby: false
            });
        }

        saveSeason();
        saveGoals();
        loadSeason(currentSeason);
    });

    function updateScores() {
        document.getElementById('team1-score').textContent = team1Goals.length;
        document.getElementById('team2-score').textContent = team2Goals.length;
    }

    function renderGoals(container, goals) {
        container.innerHTML = goals.map((goal, index) => {
            let displayMinute = goal.minute;
            if (goal.minute >= 91 && goal.minute <= 98) {
                displayMinute = `90+${goal.minute - 90}`;
            } else if (goal.minute >= 121 && goal.minute <= 129) {
                displayMinute = `120+${goal.minute - 120}`;
            }
            return `
                <li>
                    ${goal.player} - ${displayMinute}' 
                    <button class="remove-goal-btn" data-index="${index}">❌</button>
                </li>
            `;
        }).join('');
    
        container.querySelectorAll('.remove-goal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.getAttribute('data-index'));
                goals.splice(i, 1);
                renderGoals(container, goals);
                updateScores();
            });
        });
    }
    
}


setInterval(() => console.log(seasons, goals), 1000);


// Main Functions
function loadSeason(snum) {
    if (!snum) {
        snum = new Date().getFullYear().toString();
    }

    if (seasons.length === 0) {
        initializeEmptyState();
        return;
    }

    if (!content) return;

    const seasonData = seasons.find(s => s.year === snum);
    
    if (seasonData) {
        const seasonMatchdays = seasonData.matchdays || [];

        content.innerHTML = `
            ${seasonMatchdays.map((matchday, index) => `
                <div class="matchday-cont" id="matchday-${index}">
                    <h1>Matchday ${index + 1}</h1>
                    <p>${matchday.details || 'No details available'}</p>
                    ${renderMatches([matchday], index)}
                </div>
            `).join('')}
            ${renderCreateButton(seasonMatchdays)}
        `;
        bindMatchClickEvents();
        // Attach event listeners
        const createMatchdayBtn = document.querySelector('#create-matchday-btn');
        if (createMatchdayBtn) {
            createMatchdayBtn.addEventListener('click', createMatchdayFunc);
        }
        const createBracketBtn = document.querySelector('#create-bracket-btn');
        if (createBracketBtn) {
            actionElem('#create-bracket-btn', startBracket);
        }
    } else {
        initializeEmptyState();
    }
}

function initializeEmptyState() {
    content.innerHTML = `
        <div class="create-matchday">
            <div class="dotted-btn" id="create-season-btn">
                <span>CREATE SEASON</span>
            </div>
        </div>
    `;
    
    // Attach event listeners
    const createSeasonBtn = document.querySelector('#create-season-btn');
    if (createSeasonBtn) {
        createSeasonBtn.addEventListener('click', createSeasonDialog);
    }
} 

function createMatchdayFunc() {
    const currentSeason = getCurrentSeason();
    const seasonData = seasons.find(s => s.year === currentSeason);
    
    if (seasonData) {
        const seasonMatchdays = seasonData.matchdays || [];
        seasonMatchdays.push({
            details: `League Phase`,
            games: [],
            id: `matchday-${seasonMatchdays.length + 1}`
        });
        seasonData.matchdays = seasonMatchdays;
        loadSeason(currentSeason);
    }
}

function createSeasonDialog() {
    const notifEd = document.querySelector('.notifEd');
    const notifEdText = document.querySelector('.notifEd-context');
    
    if (!notifEd || !notifEdText) return;
    
    notifEd.classList.remove('dn');

    notifEdText.innerHTML = `
        <h1>Create Season</h1>
        <span class="medtx">
            teams selected: 0/20
        </span>
        <select name="years" id="year-select">
            ${Array.from({ length: 60 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return `<option value="${year}">${year}</option>`;
            }).join('')}
        </select>

        <div class="teams-select">
            ${teams.map((team) => `
                <div class="s-team">
                    <input type="checkbox" id="team-${team.id}" class="team-checkbox">
                    <img src="${team.img}" alt="${team.name}">
                    <span>${team.name}</span>
                </div>
            `).join('')}
        </div>
        <div class='fl-r'>
            <div class="btn" id="create-season">
                <span>CREATE SEASON</span>
            </div>
            <div class="btn-secondary" id="cancel-create-season">
                <span>CANCEL</span>
            </div>
        </div>
    `;

    // Add event listeners for checkboxes to update team count
    const checkboxes = document.querySelectorAll('.team-checkbox');
    const teamCountDisplay = document.querySelector('.medtx');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const selectedCount = document.querySelectorAll('.team-checkbox:checked').length;
            teamCountDisplay.textContent = `teams selected: ${selectedCount}/20`;
        });
    });

    // Attach event listeners
    const createSeasonBtn = document.querySelector('#create-season');
    if (createSeasonBtn) {
        createSeasonBtn.addEventListener('click', createSeasonFunc);
    }
    
    const cancelBtn = document.querySelector('#cancel-create-season');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelCreateSeasonFunc);
    }
}

function createSeasonFunc() {
    const yearSelect = document.querySelector('#year-select');
    if (!yearSelect) return;
    
    const selectedYear = yearSelect.value;
    const selectedTeams = Array.from(document.querySelectorAll('.team-checkbox:checked')).map(checkbox => {
        return checkbox.id.replace('team-', '');
    });
    
    if (selectedTeams.length === 0) {
        alert('Please select at least one team');
        return;
    }
    
    const season = {
        year: selectedYear,
        teams: selectedTeams,
        id: `season-${selectedYear}`,
        matchdays: []
    };
    
    // Check if the season already exists
    const existingSeasonIndex = seasons.findIndex(s => s.year === selectedYear);
    if (existingSeasonIndex !== -1) {
        seasons[existingSeasonIndex] = season;
    } else {
        seasons.push(season);
        saveSeason()
    }
    
    // Close dialog and load the season
    closeDialog();
    loadSeason(selectedYear);
}

function cancelCreateSeasonFunc() {
    closeDialog();
}

function closeDialog() {
    const notifEd = document.querySelector('.notifEd');
    if (notifEd) {
        notifEd.classList.add('dn');
    }
    
    const notifEdText = document.querySelector('.notifEd-context');
    if (notifEdText) {
        notifEdText.innerHTML = '';
    }
}

export function getCurrentSeason() {
    const params = new URLSearchParams(window.location.search);
    return params.get('season') || new Date().getFullYear().toString();
}

// Initialize the application
function initialize() {
    // Set up global event listeners
    document.addEventListener('click', (event) => {
        if (event.target && event.target.id === 'cancel-create-season') {
            cancelCreateSeasonFunc();
        } else if (event.target && event.target.id === 'create-season-btn') {
            createSeasonDialog();
        } else if (event.target && event.target.classList.contains('add-match-btn')) {
            addMatchDialog();
        }

    });

    // Load the current season or show the empty state
    const currentSeason = getCurrentSeason();
    loadSeason(currentSeason);
}

// Start the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initialize);


function saveSeason() {
    localStorage.setItem('seasons', JSON.stringify(seasons));
}

function saveGoals() {
    localStorage.setItem('goals', JSON.stringify(goals));
}


// localStorage.clear()

function startBracket() {
    const currentSeason = getCurrentSeason();
    const seasonData = seasons.find(s => s.year === currentSeason);

    if (seasonData) {
        const round16 = !seasonData.matchdays.some(matchday => matchday.bracketType);
        const semiFinals = seasonData.matchdays.some(matchday => matchday.bracketType === 'semiFinals');
        const quarterFinals = seasonData.matchdays.some(matchday => matchday.bracketType === 'quarterFinals');
        const finals = seasonData.matchdays.some(matchday => matchday.bracketType === 'finals');

        if (round16 ) {
            const seasonMatchdays = seasonData.matchdays || [];
            seasonMatchdays.push({
                details: `Knockout Phase`,
                games: getFirstFixtures(),
                id: `matchday-${seasonMatchdays.length + 1}`,
                bracketType: 'round16'
            });
            seasonData.matchdays = seasonMatchdays;
            loadSeason(currentSeason);
        }
    }
}

function getFirstFixtures() {
    const currentSeason = getCurrentSeason();
    const seasonData = seasons.find(s => s.year === currentSeason);
    const teams = getRankOfTeam().slice(0, 16).map(team => team.team);
    const fixtures = [];

    for (let i = 0; i < teams.length; i += 2) {
        fixtures.push({
            id: `match-${Math.random().toString(36).substr(2, 9)}`,
            team1: teams[i],
            team2: teams[i + 1],
            score1: 0,
            score2: 0,
            seed: Math.floor(Math.random() * 10000),
            goals: [],
            standby: true
        });
    }

    return fixtures;
}

console.log(getFirstFixtures(), 'getFirstFixtures()');

actionElem('#create-bracket-btn', startBracket());


function getRankOfTeam() {
    const currentSeason = getCurrentSeason();
    const seasonData = seasons.find(s => s.year === currentSeason);

    if (!seasonData || !seasonData.matchdays) return [];

    const teamPoints = {};

    // Initialize all teams with 0 points
    seasonData.teams.forEach(teamId => {
        teamPoints[teamId] = 0;
    });

    // Calculate points for each team
    seasonData.matchdays.forEach(matchday => {
        if (!matchday.games) return;

        matchday.games.forEach(game => {
            if (game.score1 > game.score2) {
                teamPoints[game.team1] += 3; // Team 1 wins
            } else if (game.score1 < game.score2) {
                teamPoints[game.team2] += 3; // Team 2 wins
            } else {
                teamPoints[game.team1] += 1; // Tie
                teamPoints[game.team2] += 1;
            }
        });
    });

    // Convert to array and sort by points
    const rankedTeams = Object.entries(teamPoints)
        .map(([team, points]) => ({ team, points }))
        .sort((a, b) => b.points - a.points);

    return rankedTeams;
}

console.log(getRankOfTeam()); 


function actionElem(elem, action) {
    const actionElem = document.querySelector(elem);
    if (actionElem && typeof action === 'function') {
        actionElem.addEventListener('click', action);
    }
}

function toggleNotifEd() {
    const notifEd = document.querySelector('.notifEd');
    if (notifEd) {
        notifEd.classList.toggle('dn');
    }
}



function genStats(seed) {
    let comentary = '';

    let comentarys = [
        'The match was intense with both teams showing great skill.',
        'A thrilling encounter that kept fans on the edge of their seats.',
        'An unexpected twist in the final minutes changed the game completely.',
        'The players displayed exceptional teamwork and strategy.',
        'A hard-fought battle that showcased the best of both teams.'
    ];
    let randomIndex = Math.floor(Math.random() * comentarys.length);  

}