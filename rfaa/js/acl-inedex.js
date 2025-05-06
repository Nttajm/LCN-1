// Define global variables
let goals = [
    {
        'season': '2025',
        'fgoals': [
            {
                by: 'Juventus juve',
                gameId: 129,
                team: 'tex',
                goals: 1,
            }
        ]
    }
];

let teams = [
    {
        id: 'tex',
        name: 'Cerius Texico',
        sub: `Cer'x`,
        originC: 'Texico',
        originL: 'TS',
        img: 'images/teams/degato.png',
        player: [
            'Juventus juve',
            'Jota Eme',
            'countino'
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
        id: 'RM',
        name: 'Real Madrid',
        sub: `RM`,
        originC: 'Spain',
        originL: 'ES',
        img: 'images/teams/real-madrid.png',
        player: [
            'Karim Benzema',
            'Luka Modric',
            'Vinicius Jr'
        ]
    },
    {
        id: 'BAR',
        name: 'FC Barcelona',
        sub: `BAR`,
        originC: 'Spain',
        originL: 'ES',
        img: 'images/teams/barcelona.png',
        player: [
            'Lionel Messi',
            'Pedri',
            'Ansu Fati'
        ]
    },
    {
        id: 'MCI',
        name: 'Manchester City',
        sub: `MCI`,
        originC: 'England',
        originL: 'EN',
        img: 'images/teams/manchester-city.png',
        player: [
            'Kevin De Bruyne',
            'Phil Foden',
            'Erling Haaland'
        ]
    },
    {
        id: 'PSG',
        name: 'Paris Saint-Germain',
        sub: `PSG`,
        originC: 'France',
        originL: 'FR',
        img: 'images/teams/psg.png',
        player: [
            'Kylian Mbappé',
            'Neymar Jr',
            'Lionel Messi'
        ]
    },
    {
        id: 'LIV',
        name: 'Liverpool FC',
        sub: `LIV`,
        originC: 'England',
        originL: 'EN',
        img: 'images/teams/liverpool.png',
        player: [
            'Mohamed Salah',
            'Virgil van Dijk',
            'Trent Alexander-Arnold'
        ]
    },
    {
        id: 'ATM',
        name: 'Atletico Madrid',
        sub: `ATM`,
        originC: 'Spain',
        originL: 'ES',
        img: 'images/teams/atletico-madrid.png',
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
        img: 'images/teams/bayern-munich.png',
        player: [
            'Robert Lewandowski',
            'Thomas Müller',
            'Manuel Neuer'
        ]
    },
    {
        id: 'INT',
        name: 'Inter Milan',
        sub: `INT`,
        originC: 'Italy',
        originL: 'IT',
        img: 'images/teams/inter-milan.png',
        player: [
            'Lautaro Martínez',
            'Romelu Lukaku',
            'Milan Škriniar'
        ]
    }
];

let seasons = [];

// DOM Elements
const content = document.querySelector('.pad-cont');

// Helper Functions
function getTeamById(id) {
    return teams.find(team => team.id === id) || {
        name: 'Unknown Team',
        img: 'images/teams/default.png'
    };
}

function renderMatchdays(matchdays) {
    if (!matchdays || matchdays.length === 0) {
        return `
        <div class='matchdays'>
            <h1>No matchdays available</h1>
            <div class="create-matchday">
                <div class="dotted-btn" id="create-matchday-btn">
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
            <div class="create-matchday">
                <div class="dotted-btn" id="create-matchday-btn">
                    <span>CREATE MATCHDAY</span>
                </div>
            </div>
        </div>
        `;
    }
}

function renderMatches(matchdays) {
    if (!matchdays || !Array.isArray(matchdays)) return '';
    
    return matchdays.map((matchday, index) => {
        if (!matchday.games || !Array.isArray(matchday.games)) return '';
        
        const matchesHtml = matchday.games.map(game => {
            const team1 = getTeamById(game.team1);
            const team2 = getTeamById(game.team2);

            return `
                <div class="md-match">
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

function bindAddMatchButtons() {
    document.querySelectorAll('.add-match-btn').forEach(btn => {
        btn.addEventListener('click', addMatchDialog);
    });
}


let matchdayIndex = null; // Declare matchdayIndex globally to use it in addMatchDialog




function addMatchDialog() {
    const currentSeason = getCurrentSeason();
    const matchday = seasons.find(season => season.year === currentSeason)?.matchdays[matchdayIndex];

    const notifEd = document.querySelector('.notifEd');
    const notifEdText = document.querySelector('.notifEd-context');
    notifEd.classList.toggle('dn');

    // Track goals
    const team1Goals = [];
    const team2Goals = [];
    matchdayIndex = Array.from(document.querySelectorAll('.add-match-btn')).indexOf(event.target); // Find matchday index based on button position

    // Render UI 

    notifEdText.innerHTML = `
        <h1>Create Match</h1>
        <div class="score-manager fl-r">
            <div class="team-man" id="team1">
                        <div class="score-display" id="team1-score">0</div>
                <select id="team1-select">
                    ${seasons.find(season => season.year === currentSeason).teams.map(teamId => {
                        const team = getTeamById(teamId);
                        return `<option value="${teamId}">${team.name}</option>`;
                    }).join('')}
                </select>
                <div class="add-goal">
                    <div class="fl-r fl-ai" id="team1-add-goal">
                        <img src="icons/add.png" alt="add-goal">
                        Add Goal
                    </div>
                    <select id="team1-player-select">
                        ${teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                </div>
                <ul class="goal-list" id="team1-goal-list"></ul>
            </div>

            <div class="team-man" id="team2">
                <div class="score-display" id="team2-score">0</div>
                <select id="team2-select">
                    ${seasons.find(season => season.year === currentSeason).teams.map(teamId => {
                        const team = getTeamById(teamId);
                        return `<option value="${teamId}">${team.name}</option>`;
                    }).join('')}
                </select>
                <div class="add-goal">
                    <div class="fl-r fl-ai" id="team2-add-goal">
                        <img src="icons/add.png" alt="add-goal">
                        Add Goal
                    </div>
                    <select id="team2-player-select">
                        ${teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                </div>
                <ul class="goal-list" id="team2-goal-list"></ul>
            </div>
        </div>
        <div class="full-btn btn" id="create-match-btn">
            <span>CREATE MATCH</span>
        </div>
    `;

    // Element selectors
    const team1Select = document.querySelector('#team1-select');
    const team2Select = document.querySelector('#team2-select');
    const team1PlayerSelect = document.querySelector('#team1-player-select');
    const team2PlayerSelect = document.querySelector('#team2-player-select');
    const team1GoalList = document.querySelector('#team1-goal-list');
    const team2GoalList = document.querySelector('#team2-goal-list');

    // Team selection updates player list
    team1Select.addEventListener('change', () => {
        const team = getTeamById(team1Select.value);
        team1PlayerSelect.innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
    });

    team2Select.addEventListener('change', () => {
        const team = getTeamById(team2Select.value);
        team2PlayerSelect.innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
    });

    // Goal adding
    document.querySelector('#team1-add-goal').addEventListener('click', () => {
        const player = team1PlayerSelect.value;
        if (player) {
            team1Goals.push(player);
            renderGoals(team1GoalList, team1Goals);
            updateScores();
        }
    });

    document.querySelector('#team2-add-goal').addEventListener('click', () => {
        const player = team2PlayerSelect.value;
        if (player) {
            team2Goals.push(player);
            renderGoals(team2GoalList, team2Goals);
            updateScores();
        }
    });

    // Final match creation
    document.querySelector('#create-match-btn').addEventListener('click', () => {
        const team1 = team1Select.value;
        const team2 = team2Select.value;

        if (!team1 || !team2 || team1 === team2) {
            alert('Please select two different teams.');
            return;
        }
 // Reload the season to show the new match
        notifEd.classList.toggle('dn');
        notifEdText.innerHTML = '';

        goals.push(team1Goals.concat(team2Goals));
        const matchdayGames = seasons.find(season => season.year === currentSeason).matchdays[matchdayIndex].games;
        if (!matchdayGames) {
            seasons.find(season => season.year === currentSeason).matchdays[matchdayIndex].games = [];
        }
        seasons.find(season => season.year === currentSeason).matchdays[matchdayIndex].games.push({
            team1: team1,
            team2: team2,
            score1: team1Goals.length,
            score2: team2Goals.length,
            goals: team1Goals.map(player => ({ player, team: team1 })).concat(
            team2Goals.map(player => ({ player, team: team2 }))
            )
        });
        loadSeason(currentSeason);
        // Optional: Save match to backend/localStorage here
    });

    
    function updateScores() {
        document.getElementById('team1-score').textContent = team1Goals.length;
        document.getElementById('team2-score').textContent = team2Goals.length;
    }

    // Render goal list function
    function renderGoals(container, goals) {
        container.innerHTML = goals.map((player, index) => `
            <li>
                ${player}
                <button class="remove-goal-btn" data-index="${index}">❌</button>
            </li>
        `).join('');
    
        // Reattach event listeners for remove buttons
        container.querySelectorAll('.remove-goal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.getAttribute('data-index'));
                goals.splice(i, 1);
                renderGoals(container, goals); // re-render
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

    const seasonData = seasons.find(s => s.year === snum);
    
    if (seasonData) {
        const seasonMatchdays = seasonData.matchdays || [];

        content.innerHTML = `
            ${seasonMatchdays.map((matchday, index) => `
                <div class="matchday-cont" id="matchday-${index}">
                    <h1>Matchday ${index + 1}</h1>
                    <p>${matchday.details || 'No details available'}</p>
                    ${renderMatches([matchday])}
                </div>
            `).join('')}
            ${renderMatchdays(seasonMatchdays)}
        `;

        // Attach event listeners
        const createMatchdayBtn = document.querySelector('#create-matchday-btn');
        if (createMatchdayBtn) {
            createMatchdayBtn.addEventListener('click', createMatchdayFunc);
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
            details: `${new Date().toLocaleDateString()}`,
            games: [
                {
                    team1: 'BVB',
                    team2: 'tex',
                    score1: '0',
                    score2: '3',
                },
            ]
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

function getCurrentSeason() {
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

