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
            'Alanso'
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

export let seasons = localStorage.getItem('seasons') ? JSON.parse(localStorage.getItem('seasons')) : [];

// DOM Elements
const content = document.querySelector('.pad-cont');

// Helper Functions
export function getTeamById(id) {
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
        match.addEventListener('click', () => {
            const matchId = match.getAttribute('data-match-id');
            if (matchId) {
                window.location.href = `match-info.html?match=${matchId}`;
            }
        });
    });
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

    const team1Goals = [];
    const team2Goals = [];

    matchdayIndex = Array.from(document.querySelectorAll('.add-match-btn')).indexOf(event.target);

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
                    ${seasons.find(season => season.year === currentSeason).teams.map(teamId => {
                        const team = getTeamById(teamId);
                        return `<option value="${teamId}">${team.name}</option>`;
                    }).join('')}
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

        const matchdayGames = seasons.find(season => season.year === currentSeason).matchdays[matchdayIndex].games;
        if (!matchdayGames) {
            seasons.find(season => season.year === currentSeason).matchdays[matchdayIndex].games = [];
        }

        seasons.find(season => season.year === currentSeason).matchdays[matchdayIndex].games.push({
            id: `match-${Math.random().toString(36).substr(2, 9)}`,
            team1: team1,
            team2: team2,
            score1: team1Goals.length,
            score2: team2Goals.length,
            seed: Math.floor(Math.random() * 10000),
            goals: team1Goals.map(g => ({ player: g.player, minute: g.minute, team: team1 }))
                .concat(team2Goals.map(g => ({ player: g.player, minute: g.minute, team: team2 })))
        });

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
        bindMatchClickEvents();
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

function startBraket() {
    const currentSeason = getCurrentSeason();
    const seasonData = seasons.find(season => season.year === currentSeason);
    
    if (seasonData) {
        const matchdays = seasonData.matchdays || [];
        const matches = matchdays.map(matchday => matchday.games || []).flat();
        // Process matches for the bracket
        console.log(matches);
    } else {
        console.log('No season data found');
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