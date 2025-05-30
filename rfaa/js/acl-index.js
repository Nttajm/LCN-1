// Define global variables
export let goals = localStorage.getItem('goals') ? JSON.parse(localStorage.getItem('goals')) : [];

import { players } from './players.js';
export let teams = [
    {
    id: 'tex',
    name: 'Cerius Texico',
    sub: `Cer'x`,
    originC: 'Texico',
    originL: 'TS',
    img: 'images/teams/cerx.png',
    player: getPlayersByTeam('tex')
},
{
    id: 'DELU',
    name: 'DelU',
    sub: `DelU`,
    originC: 'Denvor',
    originL: 'Quiser',
    img: 'images/teams/delU.png',
    player: getPlayersByTeam('DELU')
},
{
    id: 'DELM',
    name: 'Del Mer',
    sub: `DelM`,
    originC: 'Denvor',
    originL: 'Quiser',
    img: 'images/teams/DelMer.png',
    player: getPlayersByTeam('DELM')
},
{
    id: 'Dom',
    name: 'Domania',
    sub: `Dom`,
    originC: 'Texico',
    originL: 'TS',
    img: 'images/teams/Donamia.png',
    player: getPlayersByTeam('Dom')
},
{
    id: 'fill',
    name: 'Fillham United',
    sub: `Fillham`,
    originC: 'Denvor',
    originL: 'Quiser',
    img: 'images/teams/fillham.png',
    player: getPlayersByTeam('fill')
},
{
    id: 'esg',
    name: 'Esgual CF',
    sub: `Esgual`,
    originC: 'Texico',
    originL: 'TS',
    img: 'images/teams/fcesgual.png',
    player: getPlayersByTeam('esg')
},
{
    id: 'hewi',
    name: 'Hewi FC',
    sub: `Hewi`,
    originC: 'Pali',
    originL: 'quiser',
    img: 'images/teams/Hewifc.png',
    player: getPlayersByTeam('hewi')
},
{
    id: 'lenico',
    name: 'Lenico',
    sub: `Lenico`,
    originC: 'Pali',
    originL: 'quiser',
    img: 'images/teams/lenico.png',
    player: getPlayersByTeam('lenico')
},
{
    id: 'nb',
    name: 'New Bern',
    sub: `Bern`,
    originC: 'Qui',
    originL: 'quiser',
    img: 'images/teams/newbern.png',
    player: getPlayersByTeam('nb')
},
{
    id: 'pali',
    name: 'Pali',
    sub: `Pali`,
    originC: 'Pali',
    originL: 'quiser',
    img: 'images/teams/pali.png',
    player: getPlayersByTeam('pali')
},
{
    id: 'Sprta',
    name: 'Sporta CF',
    sub: `Sporta`,
    originC: 'Pali',
    originL: 'quiser',
    img: 'images/teams/Sporta.png',
    player: getPlayersByTeam('Sprta')
},
{
    id: 'Uly',
    name: 'Ulimy',
    sub: `Ulimy`,
    originC: 'jeski',
    originL: 'quiser',
    img: 'images/teams/Ulimy.png',
    player: getPlayersByTeam('Uly')
},
{
    id: 'RS',
    name: 'Real Sol',
    sub: `Real Sol`,
    originC: 'Texico',
    originL: 'TS',
    img: 'images/teams/real-sol.png',
    player: getPlayersByTeam('RS')
},
{
    id: 'BCCR',
    name: 'BC Central',
    sub: `BCCR`,
    originC: 'Quiser',
    originL: 'QUI',
    img: 'images/teams/bc-central.png',
    player: getPlayersByTeam('BCCR')
},
{
    id: 'serpo',
    name: 'Serpogol',
    sub: `Serpo`,
    originC: 'Quiser',
    originL: 'QUI',
    img: 'images/teams/serpogol.png',
    player: getPlayersByTeam('serpo')
},
{
    id: 'DelUnited',
    name: 'Del United',
    sub: `Del UTD`,
    originC: 'Denvor',
    originL: 'Quiser',
    img: 'images/teams/del-united.png',
    player: getPlayersByTeam('DelUnited')
},
{
    id: 'PSL',
    name: 'Pacific Saint leon',
    sub: `PSL`,
    originC: 'QUI',
    originL: 'Quiser',
    img: 'images/teams/psl.png',
    player: getPlayersByTeam('PSL')
},
{
    id: 'NDIJON',
    name: 'North Dijon',
    sub: `N. Dijon`,
    originC: 'Ijo',
    originL: 'TS',
    img: 'images/teams/north-dijon.png',
    player: getPlayersByTeam('NDIJON')
},
{
    id: 'ocio',
    name: 'Ocio',
    sub: `N. Dijon`,
    originC: 'Texico',
    originL: 'TS',
    img: 'images/teams/ocio.png',
    player: getPlayersByTeam('ocio')
},
{
    id: 'riofc',
    name: 'Rio FC',
    sub: `Rio`,
    originC: 'Texico',
    originL: 'TS',
    img: 'images/teams/riofc.png',
    player: getPlayersByTeam('riofc')
},
{
    id: 'Sentago',
    name: 'Sentago',
    sub: `Sentago`,
    originC: 'Texico',
    originL: 'TS',
    img: 'images/teams/Sentago.png',
    player: getPlayersByTeam('Sentago')
},
{
    id: 'pacer',
    name: 'Pacer FC',
    sub: `Pacer`,
    originC: 'QUI',
    originL: 'Quiser',
    img: 'images/teams/pacer.png',
    player: getPlayersByTeam('pacer')
},
{
    id: 'gks',
    name: 'GKS',
    sub: `GKS`,
    originC: 'Bolive',
    originL: 'BFF',
    img: 'images/teams/gks.png',
    player: getPlayersByTeam('gks')
},
{
    id: 'BVB',
    name: 'Borussia Dortmund',
    sub: `BVB`,
    originC: 'Bolive',
    originL: 'BFF',
    img: 'images/teams/Borussia.png',
    player: getPlayersByTeam('BVB')
},
{
    id: 'deg',
    name: 'Degato',
    sub: `Degato`,
    originC: 'Bolive',
    originL: 'BKS',
    img: 'images/teams/degato.png',
    player: getPlayersByTeam('deg')
},
{
    id: 'astH',
    name: 'Astana Hotspurs',
    sub: `Astana`,
    originC: 'Bolive',
    originL: 'BKS',
    img: 'images/teams/AST-Hotspur.png',
    player: getPlayersByTeam('astH')
},
{
    id: 'bsti',
    name: 'Bistana FC',
    sub: `Bistana`,
    originC: 'Ijo',
    originL: 'TS',
    img: 'images/teams/Bistana.png',
    player: getPlayersByTeam('bsti')
},
{
    id: 'hogn',
    name: 'Hougon FC',
    sub: `Hogna`,
    originC: 'Bolive',
    originL: 'BKS',
    img: 'images/teams/CastelHogan.png',
    player: getPlayersByTeam('hogn')
},
{
    id: 'penn',
    name: 'Penn FC',
    sub: `Penn`,
    originC: 'Denvor',
    originL: 'Quiser',
    img: 'images/teams/penn.png',
    player: getPlayersByTeam('penn')
},
{
    id: 'dj',
    name: 'Dijel FC',
    sub: `Dijel`,
    originC: 'Denvor',
    originL: 'Quiser',
    img: 'images/teams/dijel.png',
    player: getPlayersByTeam('dj')
},
{
    id: 'athmak',
    name: 'Athmak FC',
    sub: `Athmak`,
    originC: 'Bolive',
    originL: 'BKS',
    img: 'images/teams/athmak.png',
    player: getPlayersByTeam('athmak')
},
{
    id: 'V',
    name: 'Visto FC',
    sub: `Visto`,
    originC: 'Denvor',
    originL: 'Quiser',
    img: 'images/teams/VistoFc.png',
    player: getPlayersByTeam('V')
},

];


console.log(teams);


// Helper function to get players by team ID
export function getPlayersByTeam(teamId, extraPlayers = []) {
    if (!teamId) return [];
    
    // Get current season from the application state
    const currentSeason = getCurrentSeason();
    const currentYear = parseInt(currentSeason);
    
    // Filter players who have the specified team in their teams object
    // and are playing in the current year/season
    const filteredPlayers = players.filter(player => {
        return player.teams && 
               player.teams[teamId] && 
               player.teams[teamId].years && 
               player.teams[teamId].years.includes(currentYear);
    });
    
    // Return just the names of the players
    return filteredPlayers.map(player => player.name).concat(extraPlayers);
}

// Helper function to generate array of years from ranges
export function playerYears(ranges) {
    const years = [];
    
    // For each range [start, end], add all years between start and end (inclusive)
    for (const [start, end] of ranges) {
        for (let year = start; year <= end; year++) {
            years.push(year);
        }
    }
    
    return years;
}

console.log(playerYears([[2002, 2011], [1991, 1995]]) , 'eeee'); // Example usage

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
                    <span>CREATE KNOCK OUT DAY</span>
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

            // Set default images if team images aren't available or fail to load
            const team1Img = team1.img || 'images/teams/default.png';
            const team2Img = team2.img || 'images/teams/default.png';
            
            // Replace img src in the HTML with error

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
                const mdIndex = Array.from(document.querySelectorAll('.matchday-cont')).indexOf(match.closest('.matchday-cont'));
                addMatchDialog(true, mdIndex);
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

function addMatchDialog(startMatch, mdIndex) {

    const currentSeason = getCurrentSeason();
    let thisMatchIdex = null;

    if (startMatch) {
        matchdayIndex = mdIndex
        thisMatchIdex = Array.from(document.querySelectorAll('.start-match-btn')).indexOf(event.target);
    } else {
        matchdayIndex = Array.from(document.querySelectorAll('.add-match-btn')).indexOf(event.target);
    }
    const matchday = seasons.find(season => season.year === currentSeason)?.matchdays[matchdayIndex];

    const notifEd = document.querySelector('.notifEd');
    const notifEdText = document.querySelector('.notifEd-context');
    notifEd.classList.toggle('dn');

    let selectedTeams = [];

    const team1Goals = [];
    const team2Goals = [];
    const assist1 = [];

    console.log(matchdayIndex, 'matchday');

    const t1 = getTeamById(matchday?.games[thisMatchIdex]?.team1);
    const t2 = getTeamById(matchday?.games[thisMatchIdex]?.team2);



    notifEdText.innerHTML = `
        <h1>Create Match</h1>
            <select name="potm" id="potm">
                <option value="none">Player of the Match</option>
                ${
                !startMatch ? 
                    (teams[0]?.player?.map(p => `<option value="${p}">${p}</option>`).join('') || '') +
                    (teams[1]?.player?.map(p => `<option value="${p}">${p}</option>`).join('') || '')
                : 
                    (t1?.player?.map(p => `<option value="${p}">${p}</option>`).join('') || '') +
                    (t2?.player?.map(p => `<option value="${p}">${p}</option>`).join('') || '')
                }
            </select>
        <div class="score-manager fl-r">
            <div class="team-man" id="team1">
                <div class="score-display" id="team1-score">0</div>
                <select id="team1-select">
                ${!startMatch ? seasons.find(season => season.year === currentSeason).teams
                    .filter(teamId => {
                        const matchdayTeams = matchday.games.flatMap(game => [game.team1, game.team2]);
                        return !matchdayTeams.includes(teamId);
                    })
                    .map(teamId => {
                        const team = getTeamById(teamId);
                        // Format each team option for the dropdown list
                        return `<option value="${teamId}" ${teamId === matchday.games[0]?.team1 ? 'selected' : ''}>${team.name}</option>`;
                    }).join('') 
                    : 
                    `<option value="${matchday.games[thisMatchIdex].team1}">${getTeamById(matchday.games[thisMatchIdex].team1).name}</option>`

                }
                </select>
                <div class="add-goal">
                    <div class="fl-r fl-ai" id="team1-add-goal">
                        <img src="icons/add.png" alt="add-goal"> Add Goal
                    </div>
                    <select id="team1-player-select">
                    ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                        : t1.player.map(p => `<option value="${p}">${p}</option>`).join('')
                    }
                    </select>
                    <span class="assist">Assist * optional</span>
                    <select id="team1-player-select-assist" label="Assist">
                        <option value="none">none</option>
                    ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                        : t1.player.map(p => `<option value="${p}">${p}</option>`).join('')
                    }
                    </select>
                    <input type="number" id="team1-goal-minute" placeholder="Minute" min="1" max="120">
                </div>
                <ul class="goal-list" id="team1-goal-list"></ul>
            </div>

            <div class="team-man" id="team2">
                <div class="score-display" id="team2-score">0</div>
                <select id="team2-select">
                ${!startMatch ? seasons.find(season => season.year === currentSeason).teams
                    .filter(teamId => {
                        const matchdayTeams = matchday.games.flatMap(game => [game.team1, game.team2]);
                        return !matchdayTeams.includes(teamId);
                    })
                    .map(teamId => {
                        const team = getTeamById(teamId);
                        return `<option value="${teamId}">${team.name}</option>`;
                    }).join('') 
                    : 
                     `<option value="${matchday.games[thisMatchIdex].team2}">${getTeamById(matchday.games[thisMatchIdex].team2).name}</option>`
                }
                </select> 
                <div class="add-goal">
                    <div class="fl-r fl-ai" id="team2-add-goal">
                        <img src="icons/add.png" alt="add-goal"> Add Goal
                    </div>
                    <select id="team2-player-select">
                        ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                            : t2.player.map(p => `<option value="${p}">${p}</option>`).join('')
                        }
                    </select>
                    <span class="assist">Assist * optional</span>
                    <select id="team2-player-select-assist" label="Assist">
                        <option value="none">none</option>
                        ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                            : t2.player.map(p => `<option value="${p}">${p}</option>`).join('')
                        }
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
    const playerAssist1 = document.querySelector('#team1-player-select-assist');
    const playerAssist2 = document.querySelector('#team2-player-select-assist');
    const potm = document.querySelector('#potm');

    team1Select.addEventListener('change', () => {
        const team = getTeamById(team1Select.value);
        team1PlayerSelect.innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
    });

    team2Select.addEventListener('change', () => {
        const team = getTeamById(team2Select.value);
        team2PlayerSelect.innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
    });

    team1Select.addEventListener('change', () => {
        const team = getTeamById(team1Select.value);
        playerAssist1.innerHTML = `<option value="none">none</option>` + team.player.map(p => `<option value="${p}">${p}</option>`).join('');
    });

    team2Select.addEventListener('change', () => {
        const team = getTeamById(team2Select.value);
        playerAssist2.innerHTML = `<option value="none">none</option>` + team.player.map(p => `<option value="${p}">${p}</option>`).join('');
    });
    // Update POTM dropdown when team1 changes
    team1Select.addEventListener('change', () => {
        const team1 = getTeamById(team1Select.value);
        const team2 = getTeamById(team2Select.value);
        
        potm.innerHTML = '<option value="none">Player of the Match</option>';
        
        // Add players from both selected teams
        if (!startMatch) {
            if (team1 && team1.player) {
                potm.innerHTML += team1.player.map(p => `<option value="${p}">${p}</option>`).join('');
            }
            if (team2 && team2.player) {
                potm.innerHTML += team2.player.map(p => `<option value="${p}">${p}</option>`).join('');
            }
        } else {
            if (t1 && t1.player) {
                potm.innerHTML += t1.player.map(p => `<option value="${p}">${p}</option>`).join('');
            }
            if (t2 && t2.player) {
                potm.innerHTML += t2.player.map(p => `<option value="${p}">${p}</option>`).join('');
            }
        }
    });
    
    // Update POTM dropdown when team2 changes
    team2Select.addEventListener('change', () => {
        const team1 = getTeamById(team1Select.value);
        const team2 = getTeamById(team2Select.value);
        
        potm.innerHTML = '<option value="none">Player of the Match</option>';
        
        // Add players from both selected teams
        if (!startMatch) {
            if (team1 && team1.player) {
                potm.innerHTML += team1.player.map(p => `<option value="${p}">${p}</option>`).join('');
            }
            if (team2 && team2.player) {
                potm.innerHTML += team2.player.map(p => `<option value="${p}">${p}</option>`).join('');
            }
        } else {
            if (t1 && t1.player) {
                potm.innerHTML += t1.player.map(p => `<option value="${p}">${p}</option>`).join('');
            }
            if (t2 && t2.player) {
                potm.innerHTML += t2.player.map(p => `<option value="${p}">${p}</option>`).join('');
            }
        }
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
        let assit = playerAssist1.value === 'none' ? false : playerAssist1.value;

        if (!player) return;
        if (isNaN(minute) || minute < 1 || minute > 120) {
            minute = Math.floor(Math.random() * 91); // Generate a random number between 0 and 90
        }

        if (!minute) {
            minute = Math.floor(Math.random() * 91);
        }

        team1Goals.push({ player, minute, assit });
        renderGoals(team1GoalList, team1Goals);
        updateScores();
    });

    // Add goal for team 2
    document.querySelector('#team2-add-goal').addEventListener('click', () => {
        const player = team2PlayerSelect.value;
        let minute = parseInt(playerMinute2.value);
        let assit = playerAssist2.value === 'none' ? false : playerAssist2.value;

        if (!player) return;
        if (isNaN(minute) || minute < 1 || minute > 120) {
            minute = Math.floor(Math.random() * 91); // Generate a random number between 0 and 90
        }

        if (!minute) {
            minute = Math.floor(Math.random() * 91);
        }

        team2Goals.push({ player, minute, assit});
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
            seasons.find(season => season.year === currentSeason).matchdays[matchdayIndex].games.
            push({
            id: `match-${Math.random().toString(36).substr(2, 9)}`,
            potm: potm.value,
            team1: team1,
            team2: team2,
            score1: team1Goals.length,
            score2: team2Goals.length,
            seed: Math.floor(Math.random() * 10000),
            goals: team1Goals.map(g => ({ player: g.player, minute: g.minute, team: team1, assist: g.assit }))
                .concat(team2Goals.map(g => ({ player: g.player, minute: g.minute, team: team2, assist: g.assit })))
            });
        } else {
            const thisStandbyMatch = matchday.games[thisMatchIdex]
            const index = matchdayGames.findIndex(game => game.id === thisStandbyMatch.id);            
            
            matchdayGames.splice(index, 1);

            seasons.find(season => season.year === currentSeason).matchdays[matchdayIndex].games
            .push({
            id: `match-${Math.random().toString(36).substr(2, 9)}`,
            potm: potm.value,
            team1: team1,
            team2: team2,
            score1: team1Goals.length,
            score2: team2Goals.length,
            seed: Math.floor(Math.random() * 10000),
            goals: team1Goals.map(g => ({ player: g.player, minute: g.minute, team: team1, assist: g.assit }))
                .concat(team2Goals.map(g => ({ player: g.player, minute: g.minute, team: team2, assist: g.assit }))),
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
            ${Array.from({ length: 103 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                const currentSeason = getCurrentSeason();
                return `<option value="${year}" ${year.toString() === currentSeason ? 'selected' : ''}>${year}</option>`;
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

// localStorage.clear()


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
    return params.get('season') || 1998 ;
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
        // Find out what's the next bracket stage to create
        const bracketTypes = seasonData.matchdays
            .filter(matchday => matchday.bracketType)
            .map(matchday => matchday.bracketType);
        
        const round16 = !bracketTypes.includes('round16');
        const quarterFinals = bracketTypes.includes('round16') && !bracketTypes.includes('quarterFinals');
        const semiFinals = bracketTypes.includes('quarterFinals') && !bracketTypes.includes('semiFinals');
        const finals = bracketTypes.includes('semiFinals') && !bracketTypes.includes('finals');

        const seasonMatchdays = seasonData.matchdays || [];
        if (round16) {
            seasonMatchdays.push({
                details: `Knockout Phase - Round of 16`,
                games: getFirstFixtures(1),
                id: `matchday-${seasonMatchdays.length + 1}`,
                bracketType: 'round16'
            });
            seasonData.matchdays = seasonMatchdays;
            loadSeason(currentSeason);
        } else if (quarterFinals) {
            seasonMatchdays.push({
                details: `Quarter Finals`,
                games: getFirstFixtures(2),
                id: `matchday-${seasonMatchdays.length + 1}`,
                bracketType: 'quarterFinals'
            });
            loadSeason(currentSeason);
        } else if (semiFinals) {
            seasonMatchdays.push({
                details: `Semi Finals`,
                games: getFirstFixtures(3),
                id: `matchday-${seasonMatchdays.length + 1}`,
                bracketType: 'semiFinals'
            });
            loadSeason(currentSeason);
        }
        else if (finals) {
            seasonMatchdays.push({
                details: `Final`,
                games: getFirstFixtures(4),
                id: `matchday-${seasonMatchdays.length + 1}`,
                bracketType: 'finals'
            });
            loadSeason(currentSeason); 
        } else {
            console.log('All brackets already created!');
            return;
        }
    }
}
 
// localStorage.clear()

function getFirstFixtures(order) {
    const currentSeason = getCurrentSeason();
    if (order == 1) {
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
    } else if (order == 2) {
        const seasonData = seasons.find(s => s.year === currentSeason);
        // Find the round of 16 matchday
        const round16Matchday = seasonData.matchdays.find(md => md.bracketType === 'round16');

        if (!round16Matchday || !round16Matchday.games) {
            console.error('Round of 16 matchday not found or has no games');
            return [];
        }

        // Get winners from round of 16
        const winners = round16Matchday.games.map(game => {
            // Determine the winner
            if (game.score1 > game.score2) {
                return game.team1;
            } else if (game.score2 > game.score1) {
                return game.team2;
            } else {
                // In case of a tie, randomly select a winner for this example
                // In a real tournament, this would be handled differently (e.g., penalties, away goals, etc.)
                return Math.random() > 0.5 ? game.team1 : game.team2;
            }
        }).filter(winner => winner); // Filter out any undefined winners

        // Create quarter-final fixtures
        const fixtures = [];
        for (let i = 0; i < winners.length; i += 2) {
            if (i + 1 < winners.length) {  // Ensure we have a pair
                fixtures.push({
                    id: `match-${Math.random().toString(36).substr(2, 9)}`,
                    team1: winners[i],
                    team2: winners[i + 1],
                    score1: 0,
                    score2: 0,
                    seed: Math.floor(Math.random() * 10000),
                    goals: [],
                    standby: true
                });
            }
        }

        return fixtures;
    } else if (order == 3) {
        const seasonData = seasons.find(s => s.year === currentSeason);
        // Find the quarter finals matchday
        const quarterFinalsMatchday = seasonData.matchdays.find(md => md.bracketType === 'quarterFinals');

        if (!quarterFinalsMatchday || !quarterFinalsMatchday.games) {
            console.error('Quarter Finals matchday not found or has no games');
            return [];
        }

        // Get winners from quarter finals
        const winners = quarterFinalsMatchday.games.map(game => {
            // Determine the winner
            if (game.score1 > game.score2) {
                return game.team1;
            } else if (game.score2 > game.score1) {
                return game.team2;
            } else {
                // In case of a tie, randomly select a winner
                return Math.random() > 0.5 ? game.team1 : game.team2;
            }
        }).filter(winner => winner);

        // Create semi-final fixtures
        const fixtures = [];
        for (let i = 0; i < winners.length; i += 2) {
            if (i + 1 < winners.length) {  // Ensure we have a pair
                fixtures.push({
                    id: `match-${Math.random().toString(36).substr(2, 9)}`,
                    team1: winners[i],
                    team2: winners[i + 1],
                    score1: 0,
                    score2: 0,
                    seed: Math.floor(Math.random() * 10000),
                    goals: [],
                    standby: true
                });
            }
        }

        return fixtures;
        } else if (order == 4) {
        const seasonData = seasons.find(s => s.year === currentSeason);
        // Find the semi finals matchday
        const semiFinalsMatchday = seasonData.matchdays.find(md => md.bracketType === 'semiFinals');

        if (!semiFinalsMatchday || !semiFinalsMatchday.games) {
            console.error('Semi Finals matchday not found or has no games');
            return [];
        }

        // Get winners from semi finals
        const winners = semiFinalsMatchday.games.map(game => {
            // Determine the winner
            if (game.score1 > game.score2) {
            return game.team1;
            } else if (game.score2 > game.score1) {
            return game.team2;
            } else {
            // In case of a tie, randomly select a winner
            return Math.random() > 0.5 ? game.team1 : game.team2;
            }
        }).filter(winner => winner);

        // Create final fixture
        const fixtures = [];
        if (winners.length >= 2) {
            fixtures.push({
            id: `match-${Math.random().toString(36).substr(2, 9)}`,
            team1: winners[0],
            team2: winners[1],
            score1: 0,
            score2: 0,
            seed: Math.floor(Math.random() * 10000),
            goals: [],
            standby: true
            });
        }

        return fixtures;
        }
}


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


// function displayStatistics() {
//     const statsCont = document.querySelector('.stats');
//     if (!statsCont) return;

//     // Get the current season
    const currentSeason = getCurrentSeason();

    // Generate top goal scorers
//     const goalScorers = getTopGoalScorers(currentSeason);
    
//     // Generate assists leaderboard
//     const assistLeaders = getTopAssistProviders(currentSeason);

//     // Get players with most player of the match awards
//     const potmLeaders = getTopPOTM(currentSeason);

//     statsCont.innerHTML = `
//         <div class="stat-table" id="ps-goals">
//             <div class="header">
//                 <h3>Goal Scorers</h3>
//             </div>
//             ${renderStatList(goalScorers, getPlayerTeams)}
//         </div>
//         <div class="stat-table" id="ps-assists">
//             <div class="header">
//                 <h3>Assists</h3>
//             </div>
//             ${renderStatList(assistLeaders, getPlayerTeams)}
//         </div>
//         <div class="stat-table" id="ps-potm">
//             <div class="header">
//                 <h3>Player of the Match</h3>
//             </div>
//             ${renderStatList(potmLeaders, getPlayerTeams)}
//         </div>
//     `;
// }

// function renderStatList(stats, teamsFn) {
//     if (!stats || stats.length === 0) {
//         return `<div class="p-t">No data available</div>`;
//     }
    
//     return stats.slice(0, 10).map((stat, index) => {
//         const playerTeams = teamsFn(stat.name);
        
//         return `
//             <div class="p-t">
//                 <div class="rank">${index + 1}</div>
//                 <div class="p-t-name">
//                     <span>${stat.name}</span>
//                     <div class="p-clubs">
//                         ${playerTeams.map(teamId => {
//                             const team = getTeamById(teamId);
//                             return `<img src="${team.img}" alt="${team.name}">`;
//                         }).join('')}
//                     </div>
//                 </div>
//                 <div class="p-t-quant">
//                     ${stat.count}
//                 </div>
//             </div>
//         `;
//     }).join('');
// }

// function getTopGoalScorers() {
//     // Create a map to count goals per player across all seasons
//     const playerGoals = {};
    
//     // Iterate through all seasons
//     seasons.forEach(seasonData => {
//         if (!seasonData || !seasonData.matchdays) return;
        
//         // Count goals across all matches in each season
//         seasonData.matchdays.forEach(matchday => {
//             if (!matchday.games) return;
            
//             matchday.games.forEach(game => {
//                 if (!game.goals) return;
                
//                 game.goals.forEach(goal => {
//                     if (!goal.player) return;
                    
//                     if (!playerGoals[goal.player]) {
//                         playerGoals[goal.player] = 0;
//                     }
                    
//                     playerGoals[goal.player]++;
//                 });
//             });
//         });
//     });
    
//     // Convert to array and sort by goal count
//     return Object.entries(playerGoals)
//         .map(([name, count]) => ({ name, count }))
//         .sort((a, b) => b.count - a.count);
// }

// function getTopAssistProviders() {
//     // Create a map to count assists per player across all seasons
//     const playerAssists = {};
    
//     // Iterate through all seasons
//     seasons.forEach(seasonData => {
//         if (!seasonData || !seasonData.matchdays) return;
        
//         // Count assists across all matches in each season
//         seasonData.matchdays.forEach(matchday => {
//             if (!matchday.games) return;
            
//             matchday.games.forEach(game => {
//                 if (!game.goals) return;
                
//                 game.goals.forEach(goal => {
//                     if (!goal.assist) return;
                    
//                     if (!playerAssists[goal.assist]) {
//                         playerAssists[goal.assist] = 0;
//                     }
                    
//                     playerAssists[goal.assist]++;
//                 });
//             });
//         });
//     });
    
//     // Convert to array and sort by assist count
//     return Object.entries(playerAssists)
//         .map(([name, count]) => ({ name, count }))
//         .sort((a, b) => b.count - a.count);
// }

// function getTopPOTM() {
//     // Create a map to count POTM awards per player across all seasons
//     const playerPOTM = {};
    
//     // Iterate through all seasons
//     seasons.forEach(seasonData => {
//         if (!seasonData || !seasonData.matchdays) return;
        
//         // Count POTM across all matches in each season
//         seasonData.matchdays.forEach(matchday => {
//             if (!matchday.games) return;
            
//             matchday.games.forEach(game => {
//                 if (!game.potm || game.potm === "none") return;
                
//                 if (!playerPOTM[game.potm]) {
//                     playerPOTM[game.potm] = 0;
//                 }
                
//                 playerPOTM[game.potm]++;
//             });
//         });
//     });
    
//     // Convert to array and sort by POTM count
//     return Object.entries(playerPOTM)
//         .map(([name, count]) => ({ name, count }))
//         .sort((a, b) => b.count - a.count);
// }

// function getPlayerTeams(playerName) {
//     // Find the player in the players array
//     const player = players.find(p => p.name === playerName);
//     if (!player || !player.teams) return [];
    
//     // Get the team IDs for this player
//     return Object.keys(player.teams);
// }

// // Call this function when your page loads or when needed
// document.addEventListener('DOMContentLoaded', () => {
//     displayStatistics();
// });