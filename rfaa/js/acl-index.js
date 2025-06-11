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
    id: 'teso',
    name: 'Teso FC',
    sub: `Teso`,
    originC: 'Denvor',
    originL: 'Quiser',
    img: 'images/teams/teso.png',
    player: getPlayersByTeam('teso')
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
{
    id: 'BB',
    name: 'Bardon FC',
    sub: `Visto`,
    originC: 'Denvor',
    originL: 'Quiser',
    img: 'images/teams/Bardon.png',
    player: getPlayersByTeam('BB')
},

];




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

export function getTeamByplayer(playerName) {
        if (!playerName) return null;
        
        const player = getPlayersByName(playerName);
        if (!player || !player.teams) return null;

        // remeber to make get last team played for by season..



    }

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

export let seasons = localStorage.getItem('seasons') ? JSON.parse(localStorage.getItem('seasons')) : [];
const content = document.querySelector('.pad-cont');

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
                <div class="dotted-btn" id="create-select-btn">
                    <span>CREATE SELECT DAY</span>
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
                    <div class="fl-r fl-ai add-options">
                        <div class="fl-r fl-ai" id="team1-add-goal">
                            <img src="icons/add.png" alt="add-goal"> Add Goal
                        </div>
                        <select id="team1-player-select">
                        ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                            : t1.player.map(p => `<option value="${p}">${p}</option>`).join('')
                        }
                        </select>
                    </div>
                    <div class="fl-r fl-ai add-options">
                        <span class="type">type * optional</span>
                        <select id="team1-goal-type" label="Type">
                            <option value="none">none</option>
                            <option value="free kick">free kick</option>
                            <option value="penalty">penalty</option>
                        </select>
                    </div>
                    <div class="fl-r fl-ai add-options">
                        <span class="assist">Assist * optional</span>
                        <select id="team1-player-select-assist" label="Assist">
                            <option value="none">none</option>
                        ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                            : t1.player.map(p => `<option value="${p}">${p}</option>`).join('')
                        }
                        </select>
                    </div>
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
                    <div class="fl-r fl-ai add-options">
                            <div class="fl-r fl-ai" id="team2-add-goal">
                            <img src="icons/add.png" alt="add-goal"> Add Goal
                        </div>
                        <select id="team2-player-select">
                            ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                                : t2.player.map(p => `<option value="${p}">${p}</option>`).join('')
                            }
                        </select>
                    </div>
                    <div class="fl-r fl-ai add-options">
                        <span class="type">type * optional</span>
                        <select id="team2-goal-type" label="Type">
                            <option value="none">none</option>
                            <option value="free kick">free kick</option>
                            <option value="penalty">penalty</option>
                        </select>
                    </div>
                    <div class="fl-r fl-ai add-options">
                            <span class="assist">Assist * optional</span>
                        <select id="team2-player-select-assist" label="Assist">
                            <option value="none">none</option>
                            ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                                : t2.player.map(p => `<option value="${p}">${p}</option>`).join('')
                            }
                        </select>
                    </div>
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
    let type1 = document.querySelector('#team1-goal-type').value;
    let type2 = document.querySelector('#team2-goal-type').value;
    const potm = document.querySelector('#potm');

    // On load, populate player selects and assists for both teams
    function updateTeam1Inputs() {
        const team = getTeamById(team1Select.value);
        team1PlayerSelect.innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
        playerAssist1.innerHTML = `<option value="none">none</option>` + team.player.map(p => `<option value="${p}">${p}</option>`).join('');
    }
    function updateTeam2Inputs() {
        const team = getTeamById(team2Select.value);
        team2PlayerSelect.innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
        playerAssist2.innerHTML = `<option value="none">none</option>` + team.player.map(p => `<option value="${p}">${p}</option>`).join('');
    }
    updateTeam1Inputs();
    updateTeam2Inputs();

    // On load, populate POTM dropdown
    function updatePOTM() {
        const team1 = getTeamById(team1Select.value);
        const team2 = getTeamById(team2Select.value);
        potm.innerHTML = '<option value="none">Player of the Match</option>';
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
    }
    updatePOTM();

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
        let gaolType = type1 === 'none' ? false : type1;

        

        if (!player) return;
        if (isNaN(minute) || minute < 1 || minute > 120) {
            minute = Math.floor(Math.random() * 91); // Generate a random number between 0 and 90
        }

        if (!minute) {
            minute = Math.floor(Math.random() * 91);
        }

        team1Goals.push({ player, minute, assit,  type: gaolType });
        renderGoals(team1GoalList, team1Goals);
        updateScores();
    });

    // Add goal for team 2
    document.querySelector('#team2-add-goal').addEventListener('click', () => {
        const player = team2PlayerSelect.value;
        let minute = parseInt(playerMinute2.value);
        let assit = playerAssist2.value === 'none' ? false : playerAssist2.value;
        let gaolType = type2 === 'none' ? false : type2;

        if (!player) return;
        if (isNaN(minute) || minute < 1 || minute > 120) {
            minute = Math.floor(Math.random() * 91); // Generate a random number between 0 and 90
        }

        if (!minute) {
            minute = Math.floor(Math.random() * 91);
        }

        team2Goals.push({ player, minute, assit, type: gaolType });
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

// setInterval(() => console.log(seasons, goals), 1000);
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
                    <p class="md-details">${matchday.details || 'No details available'}</p>
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
        const createSelectBtn = document.querySelector('#create-select-btn');
        if (createSelectBtn) {
            actionElem('#create-select-btn', createSelectDay);
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
    return params.get('season') || 2025 ;
}


const latestSeason = seasons.reduce((latest, season) => {
    const year = parseInt(season.year);
    return year > latest ? year : latest;
}, 0);
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

function createSelectDay() {
    const currentSeason = getCurrentSeason();
    const seasonData = seasons.find(s => s.year === currentSeason);

    if (!seasonData) {
        console.error('No season data found for the current season.');
        return;
    }

    const rankedTeams = getRankOfTeam();
    if (rankedTeams.length < 2) {
        console.error('Not enough teams to create matches.');
        return;
    }

    const fixtures = [];
    for (let i = 0; i < rankedTeams.length; i += 2) {
        if (i + 1 < rankedTeams.length) {
            fixtures.push({
                id: `match-${Math.random().toString(36).substr(2, 9)}`,
                team1: rankedTeams[i].team,
                team2: rankedTeams[i + 1].team,
                score1: 0,
                score2: 0,
                seed: Math.floor(Math.random() * 10000),
                goals: [],
                standby: true
            });
        }
    }

    const seasonMatchdays = seasonData.matchdays || [];
    seasonMatchdays.push({
        details: `Leaderboard Matchups`,
        games: fixtures,
        id: `matchday-${seasonMatchdays.length + 1}`
    });
    seasonData.matchdays = seasonMatchdays;

    saveSeason();
    loadSeason(currentSeason);
}
 
// localStorage.clear()


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




const seasonDisplay = document.querySelector('.m-seasons');    

function renderSeasonButtons() {
    if (!seasonDisplay) return;

    const currentSeason = getCurrentSeason();
    // Get unique years from the seasons array
    const seasonYears = [...new Set(seasons.map(season => season.year))];
    
    // Create buttons for each season
    const seasonButtons = seasonYears.map(year => {
        const isSelected = year === currentSeason;
        return `
            <div class="season ${isSelected ? 'selected' : ''}">
                <a href="?season=${year}"><span>${year}</span></a>
            </div>
        `;
    }).join('');
    
    // If no seasons are available, show a message
    seasonDisplay.innerHTML = seasonYears.length > 0 
        ? `<div class="m-seasons">${seasonButtons}</div>`
        : `<div class="m-seasons"><div class="no-seasons">No seasons available</div></div>`;

}

renderSeasonButtons();

function renderMatchesTable() {
    const maindiv = document.querySelector('.matches-table-select');
    if (!maindiv) return;

    const currentSeason = getCurrentSeason();
    const latestSeasonYear = seasons.reduce((latest, season) => {
        const year = parseInt(season.year);
        return year > latest ? year : latest;
    }, 0);

    if (currentSeason === latestSeasonYear.toString()) {
        maindiv.style.display = 'none';
    } else {
        maindiv.style.display = 'flex';
    }
}

renderMatchesTable();

import { calculateStandings, renderStandingsTable } from './table.js';

function showTable() {
    const content = document.querySelector('.pad-cont');
    if (!content) return;

    const currentSeason = getCurrentSeason();
    const seasonData = seasons.find(season => season.year === currentSeason);

    if (!seasonData) {
        content.innerHTML = `
            <div class="ptable">
                <h1 class="headin">Standings</h1>
                <p>No standings data available for the current season.</p>
            </div>
        `;
        return;
    }

    const standingsData = calculateStandings(seasonData);
    content.innerHTML = renderStandingsTable(standingsData);
}

// Add event listener for the "Show Table" button
document.addEventListener('DOMContentLoaded', () => {
    const showTableButton = document.querySelector('#show-table-btn');
    if (showTableButton) {
        showTableButton.addEventListener('click', showTable);
    }
});

const tableBtn = document.querySelector('#show-table-btn');
if (tableBtn) {
    tableBtn.addEventListener('click', () => {
        const currentSeason = getCurrentSeason();
        loadSeason(currentSeason);
    });
}

const matchesBtn = document.querySelector('#show-matches-btn');
if (matchesBtn) {
    matchesBtn.addEventListener('click', () => {
        const currentSeason = getCurrentSeason();
        const seasonData = seasons.find(season => season.year === currentSeason);
        
        if (seasonData) {
            loadSeason(currentSeason);
            bindMatchClickEvents();
        } else {
            content.innerHTML = '<p>No matches available for this season.</p>';
        }
    });
}

function removeSeason(year) {
    const seasonIndex = seasons.findIndex(season => season.year === year.toString());
    if (seasonIndex !== -1) {
        seasons.splice(seasonIndex, 1);
        saveSeason();
        console.log(`Season ${year} has been removed.`);
    } else {
        console.log(`Season ${year} not found.`);
    }
}

// Example usage:
// removeSeason(1997);

function deleteMatchday(seasonYear, matchdayIndex) {
    const seasonData = seasons.find(season => season.year === seasonYear.toString());
    if (seasonData && seasonData.matchdays && seasonData.matchdays[matchdayIndex]) {
        seasonData.matchdays.splice(matchdayIndex, 1);
        saveSeason();
        console.log(`Matchday ${matchdayIndex + 1} from season ${seasonYear} has been deleted.`);
    } else {
        console.log(`Matchday ${matchdayIndex + 1} not found in season ${seasonYear}.`);
    }
}

function deleteMatchById(matchId) {
    for (let season of seasons) {
        for (let matchday of season.matchdays || []) {
            const idx = (matchday.games || []).findIndex(game => game.id === matchId);
            if (idx !== -1) {
                matchday.games.splice(idx, 1);
                saveSeason();
                return true;
            }
        }
    }
    return false;
}


// deleteMatchday(1998, 3); // Example usage: delete the first matchday of the 2025 season

// deleteMatchday(1998, 4); // Example usage: delete the first matchday of the 2025 season

// deleteMatchday(1998, 5); // Example usage: delete the first matchday of the 2025 season
function importSeason(seasonsArray) {
    // Replace all existing seasons with the provided array
    seasons.length = 0;
    seasons.push(...seasonsArray);

    // Save to localStorage
    saveSeason();
    loadSeason(seasonsArray[0].year); // Load the first season in the array

    // Load the latest imported season
    if (seasonsArray.length > 0) {
        loadSeason(seasonsArray[seasonsArray.length - 1].year);
    }
    console.log(`Seasons have been imported and replaced successfully.`);
}

// To import, call importSeason([...]) from the browser console or a button click handler.



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

    function getPlayercoifficient(playerName) {
        if (!playerName) return 0;
        
        let coefficient = 0;
        
        // Iterate through all seasons
        for (let season of seasons) {
            // Iterate through all matchdays
            for (let matchday of season.matchdays || []) {
                // Iterate through all games
                for (let game of matchday.games || []) {
                    // Check if player was the Player of the Match (POTM)
                    if (game.potm === playerName) {
                        coefficient += 2;
                    }
                    
                    // Check if player scored any goals
                    if (game.goals && Array.isArray(game.goals)) {
                        for (let goal of game.goals) {
                            // Add 2 points for each goal
                            if (goal.player === playerName) {
                                coefficient += 2;
                            }
                            
                            // Add 1 point for each assist
                            if (goal.assist === playerName) {
                                coefficient += 1;
                            }
                        }
                    }
                }
            }
        }
        
        return coefficient;
    }


    export function getTeamMacthes(teamid) {
        const matches = [];

        // Iterate through all seasons
        for (let season of seasons) {
            // Iterate through all matchdays
            for (let matchday of season.matchdays || []) {
                // Iterate through all games
                for (let game of matchday.games || []) {
                    // Check if the team is involved in the match
                    if (game.team1 === teamid || game.team2 === teamid) {
                        matches.push({
                            season: season.year,
                            matchday: matchday.id,
                            game
                        });
                    }
                }
            }
        }

        return matches;
    }

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

    const teamStats = {};

    // Initialize all teams with 0 points and 0 goal difference
    seasonData.teams.forEach(teamId => {
        teamStats[teamId] = { points: 0, goalDifference: 0 };
    });

    // Calculate points and goal difference for each team
    seasonData.matchdays.forEach(matchday => {
        if (!matchday.games) return;

        matchday.games.forEach(game => {
            const goalDiff = game.score1 - game.score2;

            if (goalDiff > 0) {
                // Team 1 wins
                teamStats[game.team1].points += 3;
            } else if (goalDiff < 0) {
                // Team 2 wins
                teamStats[game.team2].points += 3;
            } else {
                // Tie
                teamStats[game.team1].points += 1;
                teamStats[game.team2].points += 1;
            }

            // Update goal difference
            teamStats[game.team1].goalDifference += goalDiff;
            teamStats[game.team2].goalDifference -= goalDiff;
        });
    });

    // Convert to array and sort by points, then by goal difference
    const rankedTeams = Object.entries(teamStats)
        .map(([team, stats]) => ({ team, ...stats }))
        .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);

    return rankedTeams;
}

export function getTeamById(id) {
    if (!id) return {
        name: 'Unknown Team',
        img: 'images/teams/default.png'
    };
    const team = teams.find(team => team.id.toLowerCase() === id.toLowerCase());
    return team || {
        name: 'Unknown Team',
        img: 'images/teams/default.png'
    };
}

export function getPlayerByName(pName) {
    const player = players.find(p => p && p.name === pName);
    if (!player) {
        return {
            name: pName,
            img: 'images/players/default.png',
            team: 'Unknown Team',
            position: 'Unknown Position'
        };
    } else {
        return player;
    }

}

export function getFinalsAndWins(teamId) {
    let finals = 0;
    let wins = 0;
    seasons.forEach(season => {
        if (!season.matchdays) return;
        // Find the last matchday with games
        const lastMatchday = [...season.matchdays].reverse().find(md => md.games && md.games.length > 0);
        if (!lastMatchday) return;
        const finalGame = lastMatchday.games[0];
        if (!finalGame) return;
        if (finalGame.team1 === teamId || finalGame.team2 === teamId) {
            finals++;
            const isTeam1 = finalGame.team1 === teamId;
            const teamScore = isTeam1 ? finalGame.score1 : finalGame.score2;
            const opponentScore = isTeam1 ? finalGame.score2 : finalGame.score1;
            if (teamScore > opponentScore) {
                wins++;
            }
        }
    });
    return { finals, wins };
}

const seasonTopush =    [
    {
        "year": "1998",
        "teams": [
            "tex",
            "DELU",
            "DELM",
            "Dom",
            "fill",
            "esg",
            "hewi",
            "lenico",
            "nb",
            "pali",
            "Sprta",
            "Uly",
            "RS",
            "BCCR",
            "serpo",
            "DelUnited",
            "PSL",
            "NDIJON",
            "ocio",
            "riofc",
            "Sentago",
            "pacer",
            "gks",
            "BVB",
            "deg",
            "astH",
            "bsti",
            "hogn",
            "penn",
            "dj",
            "athmak",
            "V"
        ],
        "id": "season-1998",
        "matchdays": [
            {
                "details": "League Phase",
                "games": [
                    {
                        "id": "match-fp3zkypqs",
                        "potm": "none",
                        "team1": "hewi",
                        "team2": "esg",
                        "score1": 2,
                        "score2": 3,
                        "seed": 9688,
                        "goals": [
                            {
                                "player": "Mio Lusler",
                                "minute": 39,
                                "team": "hewi",
                                "assist": false
                            },
                            {
                                "player": "Mio Lusler",
                                "minute": 7,
                                "team": "hewi",
                                "assist": false
                            },
                            {
                                "player": "Finz Poala",
                                "minute": 17,
                                "team": "esg",
                                "assist": false
                            },
                            {
                                "player": "Egnini Lafano",
                                "minute": 37,
                                "team": "esg",
                                "assist": "Antonio García Vega"
                            },
                            {
                                "player": "Egnini Lafano",
                                "minute": 68,
                                "team": "esg",
                                "assist": "Finz Poala"
                            }
                        ]
                    },
                    {
                        "id": "match-86eu25mof",
                        "potm": "none",
                        "team1": "RS",
                        "team2": "ocio",
                        "score1": 3,
                        "score2": 2,
                        "seed": 2693,
                        "goals": [
                            {
                                "player": "James Falcao",
                                "minute": 10,
                                "team": "RS",
                                "assist": "Antonio Rodriguez"
                            },
                            {
                                "player": "Antonio Rodriguez",
                                "minute": 73,
                                "team": "RS",
                                "assist": "James Falcao"
                            },
                            {
                                "player": "Antonio Rodriguez",
                                "minute": 42,
                                "team": "RS",
                                "assist": "James Falcao"
                            },
                            {
                                "player": "Perco Di'lano",
                                "minute": 46,
                                "team": "ocio",
                                "assist": false
                            },
                            {
                                "player": "Perco Di'lano",
                                "minute": 4,
                                "team": "ocio",
                                "assist": "Riri Ruco"
                            }
                        ]
                    },
                    {
                        "id": "match-f9ml69m0j",
                        "potm": "none",
                        "team1": "tex",
                        "team2": "pali",
                        "score1": 2,
                        "score2": 0,
                        "seed": 5847,
                        "goals": [
                            {
                                "player": "Otto Nesta",
                                "minute": 74,
                                "team": "tex",
                                "assist": "Diego Sánchez Ortega"
                            },
                            {
                                "player": "Otto Nesta",
                                "minute": 38,
                                "team": "tex",
                                "assist": "Carlos Mendoza"
                            }
                        ]
                    },
                    {
                        "id": "match-y2ku5jd6j",
                        "potm": "Docey E'cani",
                        "team1": "Uly",
                        "team2": "riofc",
                        "score1": 3,
                        "score2": 0,
                        "seed": 2838,
                        "goals": [
                            {
                                "player": "Marzo Dibla",
                                "minute": 77,
                                "team": "Uly",
                                "assist": "Thomas Worthington"
                            },
                            {
                                "player": "Docey E'cani",
                                "minute": 3,
                                "team": "Uly",
                                "assist": "Docey E'cani"
                            },
                            {
                                "player": "Docey E'cani",
                                "minute": 75,
                                "team": "Uly",
                                "assist": "Docey E'cani"
                            }
                        ]
                    },
                    {
                        "id": "match-nri6p2ibl",
                        "potm": "none",
                        "team1": "DELU",
                        "team2": "serpo",
                        "score1": 2,
                        "score2": 0,
                        "seed": 6450,
                        "goals": [
                            {
                                "player": "Warn Foden",
                                "minute": 62,
                                "team": "DELU",
                                "assist": "Fern Vardy"
                            },
                            {
                                "player": "Fern Vardy",
                                "minute": 80,
                                "team": "DELU",
                                "assist": "Bebi Fanton"
                            }
                        ]
                    },
                    {
                        "id": "match-jeljq4pje",
                        "potm": "none",
                        "team1": "Sprta",
                        "team2": "DELM",
                        "score1": 2,
                        "score2": 3,
                        "seed": 178,
                        "goals": [
                            {
                                "player": "Heberto Vezas",
                                "minute": 22,
                                "team": "Sprta",
                                "assist": "Anthony Winchester"
                            },
                            {
                                "player": "Stephen de Vere",
                                "minute": 49,
                                "team": "Sprta",
                                "assist": "Anthony Winchester"
                            },
                            {
                                "player": "João Maní",
                                "minute": 82,
                                "team": "DELM",
                                "assist": false
                            },
                            {
                                "player": "Yanim Yali",
                                "minute": 66,
                                "team": "DELM",
                                "assist": "Stenfano Mirc"
                            },
                            {
                                "player": "Jason Covington",
                                "minute": 80,
                                "team": "DELM",
                                "assist": "Pedro Fernandez"
                            }
                        ]
                    },
                    {
                        "id": "match-qbqiboasw",
                        "potm": "none",
                        "team1": "Dom",
                        "team2": "bsti",
                        "score1": 2,
                        "score2": 0,
                        "seed": 1510,
                        "goals": [
                            {
                                "player": "Yohan Blake",
                                "minute": 80,
                                "team": "Dom",
                                "assist": "Miguel Navarro"
                            },
                            {
                                "player": "Alejandro Vidal",
                                "minute": 61,
                                "team": "Dom",
                                "assist": "Miguel Navarro"
                            }
                        ]
                    },
                    {
                        "id": "match-v3no2ynr5",
                        "potm": "none",
                        "team1": "pacer",
                        "team2": "fill",
                        "score1": 3,
                        "score2": 1,
                        "seed": 3967,
                        "goals": [
                            {
                                "player": "Van Silva",
                                "minute": 77,
                                "team": "pacer",
                                "assist": "Mans Icao"
                            },
                            {
                                "player": "San Guia",
                                "minute": 79,
                                "team": "pacer",
                                "assist": "Mans Icao"
                            },
                            {
                                "player": "Mans Icao",
                                "minute": 22,
                                "team": "pacer",
                                "assist": "Mans Icao"
                            },
                            {
                                "player": "Jose Lautaro",
                                "minute": 79,
                                "team": "fill",
                                "assist": "James Walker"
                            }
                        ]
                    },
                    {
                        "id": "match-kgpik8pcb",
                        "potm": "none",
                        "team1": "nb",
                        "team2": "gks",
                        "score1": 2,
                        "score2": 4,
                        "seed": 9719,
                        "goals": [
                            {
                                "player": "Andre Picao",
                                "minute": 76,
                                "team": "nb",
                                "assist": "Edward Fletcher"
                            },
                            {
                                "player": "Fan Grue",
                                "minute": 44,
                                "team": "nb",
                                "assist": "Edward Fletcher"
                            },
                            {
                                "player": "Elin Foster",
                                "minute": 18,
                                "team": "gks",
                                "assist": "Giona Nogio"
                            },
                            {
                                "player": "Frederick Thornton",
                                "minute": 67,
                                "team": "gks",
                                "assist": "Giona Nogio"
                            },
                            {
                                "player": "Elin Foster",
                                "minute": 32,
                                "team": "gks",
                                "assist": "Bradley Chadwick"
                            },
                            {
                                "player": "Elin Foster",
                                "minute": 63,
                                "team": "gks",
                                "assist": "Bradley Chadwick"
                            }
                        ]
                    },
                    {
                        "id": "match-9chbpsc0c",
                        "potm": "Rafi Pulla",
                        "team1": "V",
                        "team2": "Sentago",
                        "score1": 1,
                        "score2": 3,
                        "seed": 9998,
                        "goals": [
                            {
                                "player": "Mañalito Gafatos",
                                "minute": 47,
                                "team": "V",
                                "assist": "Follano Curto"
                            },
                            {
                                "player": "Rafi Pulla",
                                "minute": 18,
                                "team": "Sentago",
                                "assist": "Apuma Hedona'to"
                            },
                            {
                                "player": "Resto Elli",
                                "minute": 58,
                                "team": "Sentago",
                                "assist": "Apuma Hedona'to"
                            },
                            {
                                "player": "Roberto Vargas",
                                "minute": 66,
                                "team": "Sentago",
                                "assist": "Rafi Pulla"
                            }
                        ]
                    },
                    {
                        "id": "match-4i4hls2mp",
                        "potm": "Gavin Blackstone",
                        "team1": "astH",
                        "team2": "penn",
                        "score1": 2,
                        "score2": 0,
                        "seed": 8059,
                        "goals": [
                            {
                                "player": "Gavin Blackstone",
                                "minute": 90,
                                "team": "astH",
                                "assist": "Evan Hollingworth"
                            },
                            {
                                "player": "Gavin Blackstone",
                                "minute": 69,
                                "team": "astH",
                                "assist": "Evan Hollingworth"
                            }
                        ]
                    },
                    {
                        "id": "match-ex55n5tkw",
                        "potm": "none",
                        "team1": "dj",
                        "team2": "BVB",
                        "score1": 2,
                        "score2": 2,
                        "seed": 5034,
                        "goals": [
                            {
                                "player": "Elliott Lox",
                                "minute": 4,
                                "team": "dj",
                                "assist": "Skelly Klose"
                            },
                            {
                                "player": "Meso Alvarez",
                                "minute": 6,
                                "team": "dj",
                                "assist": "Luis Casado"
                            },
                            {
                                "player": "Denzel Opel",
                                "minute": 45,
                                "team": "BVB",
                                "assist": "David Huberto"
                            },
                            {
                                "player": "David Huberto",
                                "minute": 7,
                                "team": "BVB",
                                "assist": "Zachary Westmoreland"
                            }
                        ]
                    },
                    {
                        "id": "match-xwjk74k5p",
                        "potm": "none",
                        "team1": "deg",
                        "team2": "lenico",
                        "score1": 2,
                        "score2": 1,
                        "seed": 3503,
                        "goals": [
                            {
                                "player": "Denz Fenzo",
                                "minute": 34,
                                "team": "deg",
                                "assist": "Reso Miko"
                            },
                            {
                                "player": "Denz Fenzo",
                                "minute": 82,
                                "team": "deg",
                                "assist": "Tyler Farnsworth"
                            },
                            {
                                "player": "Diego Ortema",
                                "minute": 67,
                                "team": "lenico",
                                "assist": "Carlos Mendoza"
                            }
                        ]
                    },
                    {
                        "id": "match-23xprpkb6",
                        "potm": "none",
                        "team1": "NDIJON",
                        "team2": "BCCR",
                        "score1": 2,
                        "score2": 0,
                        "seed": 5150,
                        "goals": [
                            {
                                "player": "Nigel Estafano",
                                "minute": 54,
                                "team": "NDIJON",
                                "assist": "Nigel Estafano"
                            },
                            {
                                "player": "Andrés Moreno Pascual",
                                "minute": 27,
                                "team": "NDIJON",
                                "assist": "Jorge Navarro Fuentes"
                            }
                        ]
                    },
                    {
                        "id": "match-my9gu505y",
                        "potm": "Ethan Bale",
                        "team1": "PSL",
                        "team2": "hogn",
                        "score1": 2,
                        "score2": 1,
                        "seed": 4202,
                        "goals": [
                            {
                                "player": "Fisca Lapierre",
                                "minute": 15,
                                "team": "PSL",
                                "assist": "Fern Martinez"
                            },
                            {
                                "player": "Ethan Bale",
                                "minute": 72,
                                "team": "PSL",
                                "assist": "Fern Martinez"
                            },
                            {
                                "player": "Xan De Bar",
                                "minute": 71,
                                "team": "hogn",
                                "assist": "Denjo Perco"
                            }
                        ]
                    },
                    {
                        "id": "match-y52nu8mm5",
                        "potm": "none",
                        "team1": "athmak",
                        "team2": "DelUnited",
                        "score1": 0,
                        "score2": 2,
                        "seed": 5205,
                        "goals": [
                            {
                                "player": "Alvro Casmiero",
                                "minute": 9,
                                "team": "DelUnited",
                                "assist": "Tom Canos"
                            },
                            {
                                "player": "Bruno Diaz",
                                "minute": 80,
                                "team": "DelUnited",
                                "assist": "Alvro Casmiero"
                            }
                        ]
                    }
                ],
                "id": "matchday-1"
            },
            {
                "details": "League Phase",
                "games": [
                    {
                        "id": "match-p6iok14ds",
                        "potm": "none",
                        "team1": "fill",
                        "team2": "tex",
                        "score1": 4,
                        "score2": 3,
                        "seed": 8836,
                        "goals": [
                            {
                                "player": "Jose Lautaro",
                                "minute": 14,
                                "team": "fill",
                                "assist": "Lamar Greenson"
                            },
                            {
                                "player": "Jose Lautaro",
                                "minute": 51,
                                "team": "fill",
                                "assist": "Alexander Pennington"
                            },
                            {
                                "player": "James Walker",
                                "minute": 47,
                                "team": "fill",
                                "assist": "Diego Torres"
                            },
                            {
                                "player": "Diego Torres",
                                "minute": 71,
                                "team": "fill",
                                "assist": "Jose Lautaro"
                            },
                            {
                                "player": "Otto Nesta",
                                "minute": 18,
                                "team": "tex",
                                "assist": "Jota Eme"
                            },
                            {
                                "player": "Otto Nesta",
                                "minute": 33,
                                "team": "tex",
                                "assist": "Jota Eme"
                            },
                            {
                                "player": "Jota Eme",
                                "minute": 62,
                                "team": "tex",
                                "assist": "Raúl Blanco"
                            }
                        ]
                    },
                    {
                        "id": "match-j48nu1fe7",
                        "potm": "none",
                        "team1": "Sentago",
                        "team2": "PSL",
                        "score1": 0,
                        "score2": 4,
                        "seed": 379,
                        "goals": [
                            {
                                "player": "Maylo Suarez",
                                "minute": 65,
                                "team": "PSL",
                                "assist": "Henry Pemberton"
                            },
                            {
                                "player": "Maylo Suarez",
                                "minute": 59,
                                "team": "PSL",
                                "assist": "Mali Bale"
                            },
                            {
                                "player": "Juventus juve",
                                "minute": 51,
                                "team": "PSL",
                                "assist": "Mali Bale"
                            },
                            {
                                "player": "Luke Bartho",
                                "minute": 47,
                                "team": "PSL",
                                "assist": "Fern Martinez"
                            }
                        ]
                    },
                    {
                        "id": "match-kzpxv6edz",
                        "potm": "Fern Vardy",
                        "team1": "pali",
                        "team2": "DELU",
                        "score1": 2,
                        "score2": 4,
                        "seed": 5611,
                        "goals": [
                            {
                                "player": "Javier Hernandez",
                                "minute": 57,
                                "team": "pali",
                                "assist": "Peter Huntington"
                            },
                            {
                                "player": "Alejandro Reyes",
                                "minute": 21,
                                "team": "pali",
                                "assist": "Timothy Blackthorn"
                            },
                            {
                                "player": "Fern Vardy",
                                "minute": 23,
                                "team": "DELU",
                                "assist": "Warn Foden"
                            },
                            {
                                "player": "Fern Vardy",
                                "minute": 58,
                                "team": "DELU",
                                "assist": "Paul Stockbridge"
                            },
                            {
                                "player": "Oswin Glanstoné",
                                "minute": 75,
                                "team": "DELU",
                                "assist": "Bebi Fanton"
                            },
                            {
                                "player": "Fern Vardy",
                                "minute": 85,
                                "team": "DELU",
                                "assist": "Oliver Barrington"
                            }
                        ]
                    },
                    {
                        "id": "match-uhf5w4u75",
                        "potm": "none",
                        "team1": "DELM",
                        "team2": "athmak",
                        "score1": 3,
                        "score2": 1,
                        "seed": 8292,
                        "goals": [
                            {
                                "player": "João Maní",
                                "minute": 50,
                                "team": "DELM",
                                "assist": "Eji"
                            },
                            {
                                "player": "Jason Covington",
                                "minute": 17,
                                "team": "DELM",
                                "assist": "Eji"
                            },
                            {
                                "player": "Yanim Yali",
                                "minute": 20,
                                "team": "DELM",
                                "assist": "Brian Marlino"
                            },
                            {
                                "player": "Frank Mar",
                                "minute": 16,
                                "team": "athmak",
                                "assist": "Darren Rothschild"
                            }
                        ]
                    },
                    {
                        "id": "match-ef0oamkwo",
                        "potm": "none",
                        "team1": "astH",
                        "team2": "NDIJON",
                        "score1": 1,
                        "score2": 1,
                        "seed": 5225,
                        "goals": [
                            {
                                "player": "Fosa Bole",
                                "minute": 88,
                                "team": "astH",
                                "assist": "Evan Hollingworth"
                            },
                            {
                                "player": "Elliot Fons",
                                "minute": 65,
                                "team": "NDIJON",
                                "assist": "Jorge Navarro Fuentes"
                            }
                        ]
                    },
                    {
                        "id": "match-07iorzjpg",
                        "potm": "none",
                        "team1": "RS",
                        "team2": "pacer",
                        "score1": 3,
                        "score2": 3,
                        "seed": 7348,
                        "goals": [
                            {
                                "player": "James Falcao",
                                "minute": 26,
                                "team": "RS",
                                "assist": "Fezto Maradini"
                            },
                            {
                                "player": "James Falcao",
                                "minute": 21,
                                "team": "RS",
                                "assist": "Daniel Vargas"
                            },
                            {
                                "player": "Ricardo Ortiz",
                                "minute": 84,
                                "team": "RS",
                                "assist": "Daniel Vargas"
                            },
                            {
                                "player": "Van Silva",
                                "minute": 85,
                                "team": "pacer",
                                "assist": "Scott Thornberry"
                            },
                            {
                                "player": "Van Silva",
                                "minute": 17,
                                "team": "pacer",
                                "assist": "Mans Icao"
                            },
                            {
                                "player": "Mans Icao",
                                "minute": 86,
                                "team": "pacer",
                                "assist": "Scott Thornberry"
                            }
                        ]
                    },
                    {
                        "id": "match-culm7xbp6",
                        "potm": "none",
                        "team1": "nb",
                        "team2": "Dom",
                        "score1": 3,
                        "score2": 1,
                        "seed": 2534,
                        "goals": [
                            {
                                "player": "Andre Picao",
                                "minute": 21,
                                "team": "nb",
                                "assist": "Nicholas Harrington"
                            },
                            {
                                "player": "Fan Grue",
                                "minute": 22,
                                "team": "nb",
                                "assist": "Andre Picao"
                            },
                            {
                                "player": "Fan Grue",
                                "minute": 78,
                                "team": "nb",
                                "assist": "Nicholas Harrington"
                            },
                            {
                                "player": "Yohan Blake",
                                "minute": 54,
                                "team": "Dom",
                                "assist": false
                            }
                        ]
                    },
                    {
                        "id": "match-ng38jido5",
                        "potm": "Bruno Diaz",
                        "team1": "deg",
                        "team2": "DelUnited",
                        "score1": 0,
                        "score2": 1,
                        "seed": 2937,
                        "goals": [
                            {
                                "player": "Alvro Casmiero",
                                "minute": 53,
                                "team": "DelUnited",
                                "assist": "Bruno Diaz"
                            }
                        ]
                    },
                    {
                        "id": "match-2dp95c9ql",
                        "potm": "none",
                        "team1": "Uly",
                        "team2": "V",
                        "score1": 5,
                        "score2": 1,
                        "seed": 303,
                        "goals": [
                            {
                                "player": "Marzo Dibla",
                                "minute": 60,
                                "team": "Uly",
                                "assist": "James Holister"
                            },
                            {
                                "player": "Marzo Dibla",
                                "minute": 20,
                                "team": "Uly",
                                "assist": "Kevin Lockhart"
                            },
                            {
                                "player": "Marzo Dibla",
                                "minute": 15,
                                "team": "Uly",
                                "assist": "Docey E'cani"
                            },
                            {
                                "player": "Docey E'cani",
                                "minute": 54,
                                "team": "Uly",
                                "assist": "Kevin Lockhart"
                            },
                            {
                                "player": "Kevin Lockhart",
                                "minute": 83,
                                "team": "Uly",
                                "assist": "Marzo Dibla"
                            },
                            {
                                "player": "Follano Curto",
                                "minute": 78,
                                "team": "V",
                                "assist": "Follano Curto"
                            }
                        ]
                    },
                    {
                        "id": "match-r9ymrgfzz",
                        "potm": "none",
                        "team1": "serpo",
                        "team2": "riofc",
                        "score1": 1,
                        "score2": 2,
                        "seed": 6872,
                        "goals": [
                            {
                                "player": "Aiden brown",
                                "minute": 73,
                                "team": "serpo",
                                "assist": "Sergio Lopez"
                            },
                            {
                                "player": "Sudo Mane",
                                "minute": 36,
                                "team": "riofc",
                                "assist": "Jason Blu"
                            },
                            {
                                "player": "Sans Pedri",
                                "minute": 59,
                                "team": "riofc",
                                "assist": "Jason Blu"
                            }
                        ]
                    },
                    {
                        "id": "match-d9rpt0x96",
                        "potm": "none",
                        "team1": "gks",
                        "team2": "esg",
                        "score1": 2,
                        "score2": 3,
                        "seed": 6155,
                        "goals": [
                            {
                                "player": "Elin Foster",
                                "minute": 78,
                                "team": "gks",
                                "assist": "Derick Gru"
                            },
                            {
                                "player": "Elin Foster",
                                "minute": 44,
                                "team": "gks",
                                "assist": "Jesse Kenworth"
                            },
                            {
                                "player": "Finz Poala",
                                "minute": 1,
                                "team": "esg",
                                "assist": "Carlos Moreno"
                            },
                            {
                                "player": "Finz Poala",
                                "minute": 19,
                                "team": "esg",
                                "assist": "Carlos Moreno"
                            },
                            {
                                "player": "Antonio García",
                                "minute": 25,
                                "team": "esg",
                                "assist": "Javier Muñoz"
                            }
                        ]
                    },
                    {
                        "id": "match-9idvd3eq3",
                        "potm": "Perco Di'lano",
                        "team1": "bsti",
                        "team2": "ocio",
                        "score1": 0,
                        "score2": 3,
                        "seed": 2474,
                        "goals": [
                            {
                                "player": "Perco Di'lano",
                                "minute": 85,
                                "team": "ocio",
                                "assist": "James Garcia"
                            },
                            {
                                "player": "Perco Di'lano",
                                "minute": 87,
                                "team": "ocio",
                                "assist": "Enrique Díaz"
                            },
                            {
                                "player": "James Garcia",
                                "minute": 70,
                                "team": "ocio",
                                "assist": "Perco Di'lano"
                            }
                        ]
                    },
                    {
                        "id": "match-8qw0kite4",
                        "potm": "none",
                        "team1": "penn",
                        "team2": "hogn",
                        "score1": 1,
                        "score2": 2,
                        "seed": 1216,
                        "goals": [
                            {
                                "player": "Enderson Ronaldo",
                                "minute": 29,
                                "team": "penn",
                                "assist": "Michael Holloway"
                            },
                            {
                                "player": "Xan De Bar",
                                "minute": 72,
                                "team": "hogn",
                                "assist": "Charles Westbrook"
                            },
                            {
                                "player": "Yao Termicia",
                                "minute": 56,
                                "team": "hogn",
                                "assist": "Xan De Bar"
                            }
                        ]
                    },
                    {
                        "id": "match-ivye8yt6n",
                        "potm": "Luis Casado",
                        "team1": "dj",
                        "team2": "BCCR",
                        "score1": 3,
                        "score2": 0,
                        "seed": 6554,
                        "goals": [
                            {
                                "player": "Meso Alvarez",
                                "minute": 7,
                                "team": "dj",
                                "assist": "Luis Casado"
                            },
                            {
                                "player": "Skelly Klose",
                                "minute": 39,
                                "team": "dj",
                                "assist": "Luis Casado"
                            },
                            {
                                "player": "Elliott Lox",
                                "minute": 31,
                                "team": "dj",
                                "assist": "Luis Casado"
                            }
                        ]
                    },
                    {
                        "id": "match-lzh3jxvpg",
                        "potm": "none",
                        "team1": "BVB",
                        "team2": "Sprta",
                        "score1": 2,
                        "score2": 3,
                        "seed": 2955,
                        "goals": [
                            {
                                "player": "Denzel Opel",
                                "minute": 18,
                                "team": "BVB",
                                "assist": false
                            },
                            {
                                "player": "Denzel Opel",
                                "minute": 46,
                                "team": "BVB",
                                "assist": "James Attenborough"
                            },
                            {
                                "player": "Heberto Vezas",
                                "minute": 82,
                                "team": "Sprta",
                                "assist": "Stephen de Vere"
                            },
                            {
                                "player": "Eduardo Jimenez",
                                "minute": 33,
                                "team": "Sprta",
                                "assist": "Heberto Vezas"
                            },
                            {
                                "player": "Eduardo Jimenez",
                                "minute": 82,
                                "team": "Sprta",
                                "assist": "George Harrison"
                            }
                        ]
                    },
                    {
                        "id": "match-v7x6lrgt7",
                        "potm": "none",
                        "team1": "lenico",
                        "team2": "hewi",
                        "score1": 3,
                        "score2": 2,
                        "seed": 1895,
                        "goals": [
                            {
                                "player": "Famete Saihno",
                                "minute": 90,
                                "team": "lenico",
                                "assist": "Fermin Lopez"
                            },
                            {
                                "player": "Famete Saihno",
                                "minute": 55,
                                "team": "lenico",
                                "assist": "Dan Fons"
                            },
                            {
                                "player": "Luis Morales",
                                "minute": 84,
                                "team": "lenico",
                                "assist": "Dan Fons"
                            },
                            {
                                "player": "Mio Lusler",
                                "minute": 16,
                                "team": "hewi",
                                "assist": "William Blackwell"
                            },
                            {
                                "player": "Ash Tito",
                                "minute": 77,
                                "team": "hewi",
                                "assist": "Daniel Fairchi"
                            }
                        ]
                    }
                ],
                "id": "matchday-2"
            },
            {
                "details": "League Phase",
                "games": [
                    {
                        "id": "match-rby4xpucf",
                        "potm": "none",
                        "team1": "DELU",
                        "team2": "ocio",
                        "score1": 2,
                        "score2": 1,
                        "seed": 6489,
                        "goals": [
                            {
                                "player": "Warn Foden",
                                "minute": 75,
                                "team": "DELU",
                                "assist": "Oswin Glanstoné"
                            },
                            {
                                "player": "Oswin Glanstoné",
                                "minute": 71,
                                "team": "DELU",
                                "assist": "Mark Westfield"
                            },
                            {
                                "player": "Perco Di'lano",
                                "minute": 29,
                                "team": "ocio",
                                "assist": "Francisco Torres"
                            }
                        ]
                    },
                    {
                        "id": "match-wftchmi6y",
                        "potm": "none",
                        "team1": "DELM",
                        "team2": "tex",
                        "score1": 3,
                        "score2": 3,
                        "seed": 9741,
                        "goals": [
                            {
                                "player": "João Maní",
                                "minute": 75,
                                "team": "DELM",
                                "assist": "Eji"
                            },
                            {
                                "player": "Stenfano Mirc",
                                "minute": 17,
                                "team": "DELM",
                                "assist": "João Maní"
                            },
                            {
                                "player": "Stenfano Mirc",
                                "minute": 90,
                                "team": "DELM",
                                "assist": "Jason Covington"
                            },
                            {
                                "player": "Otto Nesta",
                                "minute": 57,
                                "team": "tex",
                                "assist": "Jota Eme"
                            },
                            {
                                "player": "Fojan Grick",
                                "minute": 22,
                                "team": "tex",
                                "assist": "Jota Eme"
                            },
                            {
                                "player": "Jota Eme",
                                "minute": 80,
                                "team": "tex",
                                "assist": "Otto Nesta"
                            }
                        ]
                    },
                    {
                        "id": "match-liotpwxai",
                        "potm": "none",
                        "team1": "nb",
                        "team2": "pacer",
                        "score1": 2,
                        "score2": 3,
                        "seed": 8705,
                        "goals": [
                            {
                                "player": "Andre Picao",
                                "minute": 61,
                                "team": "nb",
                                "assist": "Edward Fletcher"
                            },
                            {
                                "player": "Andre Picao",
                                "minute": 25,
                                "team": "nb",
                                "assist": "Fan Grue"
                            },
                            {
                                "player": "Van Silva",
                                "minute": 66,
                                "team": "pacer",
                                "assist": "San Guia"
                            },
                            {
                                "player": "Connor Fullerton",
                                "minute": 22,
                                "team": "pacer",
                                "assist": "Connor Fullerton"
                            },
                            {
                                "player": "Connor Fullerton",
                                "minute": 40,
                                "team": "pacer",
                                "assist": "Connor Fullerton"
                            }
                        ]
                    },
                    {
                        "id": "match-ctu0sshf0",
                        "potm": "none",
                        "team1": "PSL",
                        "team2": "penn",
                        "score1": 2,
                        "score2": 1,
                        "seed": 2057,
                        "goals": [
                            {
                                "player": "Juventus juve",
                                "minute": 59,
                                "team": "PSL",
                                "assist": "Ethan Bale"
                            },
                            {
                                "player": "Diaz Chesma",
                                "minute": 71,
                                "team": "PSL",
                                "assist": "Juventus juve"
                            },
                            {
                                "player": "Enderson Ronaldo",
                                "minute": 4,
                                "team": "penn",
                                "assist": "Neil Hargreaves"
                            }
                        ]
                    },
                    {
                        "id": "match-3xtohu05s",
                        "potm": "none",
                        "team1": "RS",
                        "team2": "BCCR",
                        "score1": 3,
                        "score2": 1,
                        "seed": 8856,
                        "goals": [
                            {
                                "player": "Fezto Maradini",
                                "minute": 12,
                                "team": "RS",
                                "assist": "James Falcao"
                            },
                            {
                                "player": "Ricardo Ortiz",
                                "minute": 53,
                                "team": "RS",
                                "assist": "James Falcao"
                            },
                            {
                                "player": "James Falcao",
                                "minute": 34,
                                "team": "RS",
                                "assist": "Fezto Maradini"
                            },
                            {
                                "player": "Hius Ruo",
                                "minute": 52,
                                "team": "BCCR",
                                "assist": "James tackfo"
                            }
                        ]
                    },
                    {
                        "id": "match-xavmhnmk9",
                        "potm": "none",
                        "team1": "Sentago",
                        "team2": "dj",
                        "score1": 3,
                        "score2": 4,
                        "seed": 4595,
                        "goals": [
                            {
                                "player": "Resto Elli",
                                "minute": 45,
                                "team": "Sentago",
                                "assist": "Rafi Pulla"
                            },
                            {
                                "player": "Rafi Pulla",
                                "minute": 10,
                                "team": "Sentago",
                                "assist": "Ricardo Iglesias"
                            },
                            {
                                "player": "Apuma Hedona'to",
                                "minute": 56,
                                "team": "Sentago",
                                "assist": "Ricardo Iglesias"
                            },
                            {
                                "player": "Skelly Klose",
                                "minute": 73,
                                "team": "dj",
                                "assist": "Luis Casado"
                            },
                            {
                                "player": "Elliott Lox",
                                "minute": 35,
                                "team": "dj",
                                "assist": "Luis Casado"
                            },
                            {
                                "player": "Doeu Jon",
                                "minute": 33,
                                "team": "dj",
                                "assist": "Skelly Klose"
                            },
                            {
                                "player": "Meso Alvarez",
                                "minute": 87,
                                "team": "dj",
                                "assist": "Skelly Klose"
                            }
                        ]
                    },
                    {
                        "id": "match-oxv0r40hd",
                        "potm": "none",
                        "team1": "esg",
                        "team2": "Dom",
                        "score1": 5,
                        "score2": 0,
                        "seed": 1221,
                        "goals": [
                            {
                                "player": "Javier Muñoz",
                                "minute": 37,
                                "team": "esg",
                                "assist": "Egnini Lafano"
                            },
                            {
                                "player": "Javier Muñoz",
                                "minute": 42,
                                "team": "esg",
                                "assist": "Egnini Lafano"
                            },
                            {
                                "player": "Jerly Enock",
                                "minute": 68,
                                "team": "esg",
                                "assist": "Finz Poala"
                            },
                            {
                                "player": "Antonio García",
                                "minute": 58,
                                "team": "esg",
                                "assist": "Jerly Enock"
                            },
                            {
                                "player": "Finz Poala",
                                "minute": 15,
                                "team": "esg",
                                "assist": "Jerly Enock"
                            }
                        ]
                    },
                    {
                        "id": "match-6lcnr8zrr",
                        "potm": "Jose Lautaro",
                        "team1": "fill",
                        "team2": "Uly",
                        "score1": 3,
                        "score2": 3,
                        "seed": 7643,
                        "goals": [
                            {
                                "player": "Jose Lautaro",
                                "minute": 36,
                                "team": "fill",
                                "assist": "James Walker"
                            },
                            {
                                "player": "Jose Lautaro",
                                "minute": 72,
                                "team": "fill",
                                "assist": "Jonathan Bradshaw"
                            },
                            {
                                "player": "Diego Torres",
                                "minute": 60,
                                "team": "fill",
                                "assist": "Jose Lautaro"
                            },
                            {
                                "player": "James Holister",
                                "minute": 46,
                                "team": "Uly",
                                "assist": "Docey E'cani"
                            },
                            {
                                "player": "Docey E'cani",
                                "minute": 78,
                                "team": "Uly",
                                "assist": "Kevin Lockhart"
                            },
                            {
                                "player": "Marzo Dibla",
                                "minute": 80,
                                "team": "Uly",
                                "assist": "Docey E'cani"
                            }
                        ]
                    },
                    {
                        "id": "match-ll6a483ay",
                        "potm": "none",
                        "team1": "athmak",
                        "team2": "riofc",
                        "score1": 1,
                        "score2": 2,
                        "seed": 6714,
                        "goals": [
                            {
                                "player": "Frank Mar",
                                "minute": 20,
                                "team": "athmak",
                                "assist": "Richard Kensington"
                            },
                            {
                                "player": "Jason Blu",
                                "minute": 67,
                                "team": "riofc",
                                "assist": "Sudo Mane"
                            },
                            {
                                "player": "Nisel bastoni",
                                "minute": 73,
                                "team": "riofc",
                                "assist": "Jason Blu"
                            }
                        ]
                    },
                    {
                        "id": "match-2sswwyljh",
                        "potm": "none",
                        "team1": "deg",
                        "team2": "V",
                        "score1": 1,
                        "score2": 2,
                        "seed": 820,
                        "goals": [
                            {
                                "player": "Denz Fenzo",
                                "minute": 18,
                                "team": "deg",
                                "assist": "Gramz Belfort"
                            },
                            {
                                "player": "Mañalito Gafatos",
                                "minute": 56,
                                "team": "V",
                                "assist": false
                            },
                            {
                                "player": "Mañalito Gafatos",
                                "minute": 32,
                                "team": "V",
                                "assist": false
                            }
                        ]
                    },
                    {
                        "id": "match-ugvgqxwhq",
                        "potm": "none",
                        "team1": "hewi",
                        "team2": "lenico",
                        "score1": 1,
                        "score2": 1,
                        "seed": 4663,
                        "goals": [
                            {
                                "player": "William Blackwell",
                                "minute": 14,
                                "team": "hewi",
                                "assist": "Olice Alze"
                            },
                            {
                                "player": "Dan Fons",
                                "minute": 78,
                                "team": "lenico",
                                "assist": "Flamiz Huberto"
                            }
                        ]
                    },
                    {
                        "id": "match-t561q7jmm",
                        "potm": "Hona Piroka",
                        "team1": "pali",
                        "team2": "serpo",
                        "score1": 0,
                        "score2": 1,
                        "seed": 5365,
                        "goals": [
                            {
                                "player": "Den Torch",
                                "minute": 49,
                                "team": "serpo",
                                "assist": "Hona Piroka"
                            }
                        ]
                    },
                    {
                        "id": "match-9fai07vqu",
                        "potm": "none",
                        "team1": "NDIJON",
                        "team2": "BVB",
                        "score1": 2,
                        "score2": 2,
                        "seed": 3744,
                        "goals": [
                            {
                                "player": "Elliot Fons",
                                "minute": 36,
                                "team": "NDIJON",
                                "assist": "Harvey Delapos"
                            },
                            {
                                "player": "Nigel Estafano",
                                "minute": 34,
                                "team": "NDIJON",
                                "assist": "Jorge Navarro Fuentes"
                            },
                            {
                                "player": "Denzel Opel",
                                "minute": 8,
                                "team": "BVB",
                                "assist": false
                            },
                            {
                                "player": "David Huberto",
                                "minute": 77,
                                "team": "BVB",
                                "assist": "Jordan Harwood"
                            }
                        ]
                    },
                    {
                        "id": "match-gmr3sksqx",
                        "potm": "none",
                        "team1": "bsti",
                        "team2": "hogn",
                        "score1": 1,
                        "score2": 3,
                        "seed": 6766,
                        "goals": [
                            {
                                "player": "João Marcos",
                                "minute": 31,
                                "team": "bsti",
                                "assist": "Tomás García Mendoza"
                            },
                            {
                                "player": "Xan De Bar",
                                "minute": 74,
                                "team": "hogn",
                                "assist": "Yao Termicia"
                            },
                            {
                                "player": "Xan De Bar",
                                "minute": 31,
                                "team": "hogn",
                                "assist": false
                            },
                            {
                                "player": "Seth Cresswell",
                                "minute": 69,
                                "team": "hogn",
                                "assist": "Xan De Bar"
                            }
                        ]
                    },
                    {
                        "id": "match-a95f2boqu",
                        "potm": "none",
                        "team1": "gks",
                        "team2": "astH",
                        "score1": 2,
                        "score2": 0,
                        "seed": 3179,
                        "goals": [
                            {
                                "player": "Elin Foster",
                                "minute": 68,
                                "team": "gks",
                                "assist": "Derick Gru"
                            },
                            {
                                "player": "Bradley Chadwick",
                                "minute": 78,
                                "team": "gks",
                                "assist": "Derick Gru"
                            }
                        ]
                    },
                    {
                        "id": "match-eq67nbn9s",
                        "potm": "none",
                        "team1": "DelUnited",
                        "team2": "Sprta",
                        "score1": 2,
                        "score2": 1,
                        "seed": 4938,
                        "goals": [
                            {
                                "player": "Thiago Burns",
                                "minute": 72,
                                "team": "DelUnited",
                                "assist": "Alvro Casmiero"
                            },
                            {
                                "player": "Ethan ColWil",
                                "minute": 75,
                                "team": "DelUnited",
                                "assist": false
                            },
                            {
                                "player": "Hoza Milta",
                                "minute": 21,
                                "team": "Sprta",
                                "assist": "Stephen de Vere"
                            }
                        ]
                    }
                ],
                "id": "matchday-3"
            },
            {
                "details": "Leaderboard Matchups",
                "games": [
                    {
                        "id": "match-fs3nv18rq",
                        "potm": "none",
                        "team1": "esg",
                        "team2": "PSL",
                        "score1": 2,
                        "score2": 7,
                        "seed": 1960,
                        "goals": [
                            {
                                "player": "Finz Poala",
                                "minute": 6,
                                "team": "esg",
                                "assist": "Egnini Lafano"
                            },
                            {
                                "player": "Finz Poala",
                                "minute": 19,
                                "team": "esg",
                                "assist": "Egnini Lafano"
                            },
                            {
                                "player": "Ethan Bale",
                                "minute": 24,
                                "team": "PSL",
                                "assist": false
                            },
                            {
                                "player": "Ethan Bale",
                                "minute": 32,
                                "team": "PSL",
                                "assist": "Juventus juve"
                            },
                            {
                                "player": "Fisca Lapierre",
                                "minute": 36,
                                "team": "PSL",
                                "assist": "Fern Martinez"
                            },
                            {
                                "player": "Nathan Brimley",
                                "minute": 41,
                                "team": "PSL",
                                "assist": "Denis Dapali"
                            },
                            {
                                "player": "Dante Paulo",
                                "minute": 44,
                                "team": "PSL",
                                "assist": "Marco Gutierrez"
                            },
                            {
                                "player": "Diaz Chesma",
                                "minute": 50,
                                "team": "PSL",
                                "assist": "Marco Gutierrez"
                            },
                            {
                                "player": "Ethan Bale",
                                "minute": 96,
                                "team": "PSL",
                                "assist": "Luke Bartho"
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-7fkedr0dr",
                        "potm": "none",
                        "team1": "DELU",
                        "team2": "DelUnited",
                        "score1": 4,
                        "score2": 3,
                        "seed": 4040,
                        "goals": [
                            {
                                "player": "Fern Vardy",
                                "minute": 77,
                                "team": "DELU",
                                "assist": "Paul Stockbridge"
                            },
                            {
                                "player": "Mark Westfield",
                                "minute": 62,
                                "team": "DELU",
                                "assist": "Warn Foden"
                            },
                            {
                                "player": "Warn Foden",
                                "minute": 48,
                                "team": "DELU",
                                "assist": "Oswin Glanstoné"
                            },
                            {
                                "player": "Mark Westfield",
                                "minute": 79,
                                "team": "DELU",
                                "assist": "Oswin Glanstoné"
                            },
                            {
                                "player": "Alvro Casmiero",
                                "minute": 84,
                                "team": "DelUnited",
                                "assist": "Hela Slepton"
                            },
                            {
                                "player": "Alvro Casmiero",
                                "minute": 53,
                                "team": "DelUnited",
                                "assist": "Bruno Diaz"
                            },
                            {
                                "player": "Bruno Diaz",
                                "minute": 30,
                                "team": "DelUnited",
                                "assist": "Jacob Cox"
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-zczkufi0d",
                        "potm": "none",
                        "team1": "Sentago",
                        "team2": "Dom",
                        "score1": 0,
                        "score2": 1,
                        "seed": 4278,
                        "goals": [
                            {
                                "player": "Miguel Sanchez",
                                "minute": 49,
                                "team": "Dom",
                                "assist": "Alejandro Vidal"
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-y4tzthhdw",
                        "potm": "Olice Alze",
                        "team1": "hewi",
                        "team2": "penn",
                        "score1": 2,
                        "score2": 1,
                        "seed": 6615,
                        "goals": [
                            {
                                "player": "Daniel Fairchi",
                                "minute": 4,
                                "team": "hewi",
                                "assist": "Olice Alze"
                            },
                            {
                                "player": "Olice Alze",
                                "minute": 2,
                                "team": "hewi",
                                "assist": "Mio Lusler"
                            },
                            {
                                "player": "Enderson Ronaldo",
                                "minute": 64,
                                "team": "penn",
                                "assist": "Neil Hargreaves"
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-qdnxicl1p",
                        "potm": "none",
                        "team1": "pali",
                        "team2": "athmak",
                        "score1": 0,
                        "score2": 0,
                        "seed": 6788,
                        "goals": [],
                        "standby": false
                    },
                    {
                        "id": "match-cvmn65l8s",
                        "potm": "none",
                        "team1": "BCCR",
                        "team2": "bsti",
                        "score1": 0,
                        "score2": 1,
                        "seed": 3566,
                        "goals": [
                            {
                                "player": "João Marcos",
                                "minute": 71,
                                "team": "bsti",
                                "assist": false
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-vmpu1vdhx",
                        "potm": "none",
                        "team1": "V",
                        "team2": "BVB",
                        "score1": 2,
                        "score2": 3,
                        "seed": 3180,
                        "goals": [
                            {
                                "player": "Mañalito Gafatos",
                                "minute": 18,
                                "team": "V",
                                "assist": false
                            },
                            {
                                "player": "Mañalito Gafatos",
                                "minute": 35,
                                "team": "V",
                                "assist": false
                            },
                            {
                                "player": "Denzel Opel",
                                "minute": 87,
                                "team": "BVB",
                                "assist": "David Huberto"
                            },
                            {
                                "player": "Denzel Opel",
                                "minute": 69,
                                "team": "BVB",
                                "assist": "James Attenborough"
                            },
                            {
                                "player": "Jordan Harwood",
                                "minute": 80,
                                "team": "BVB",
                                "assist": false
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-v2k4de7a9",
                        "potm": "none",
                        "team1": "nb",
                        "team2": "Sprta",
                        "score1": 1,
                        "score2": 0,
                        "seed": 779,
                        "goals": [
                            {
                                "player": "Andre Picao",
                                "minute": 40,
                                "team": "nb",
                                "assist": "Fan Grue"
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-26qhg0oja",
                        "potm": "none",
                        "team1": "fill",
                        "team2": "ocio",
                        "score1": 3,
                        "score2": 4,
                        "seed": 2218,
                        "goals": [
                            {
                                "player": "Jose Lautaro",
                                "minute": 49,
                                "team": "fill",
                                "assist": "Jonathan Bradshaw"
                            },
                            {
                                "player": "Diego Torres",
                                "minute": 41,
                                "team": "fill",
                                "assist": "Jose Lautaro"
                            },
                            {
                                "player": "Diego Torres",
                                "minute": 30,
                                "team": "fill",
                                "assist": "Lamar Greenson"
                            },
                            {
                                "player": "Perco Di'lano",
                                "minute": 9,
                                "team": "ocio",
                                "assist": "Elliot Granar"
                            },
                            {
                                "player": "Perco Di'lano",
                                "minute": 43,
                                "team": "ocio",
                                "assist": "Enrique Díaz"
                            },
                            {
                                "player": "Dellin Isco",
                                "minute": 89,
                                "team": "ocio",
                                "assist": "Raul Hernandez"
                            },
                            {
                                "player": "Riri Ruco",
                                "minute": 3,
                                "team": "ocio",
                                "assist": "Perco Di'lano"
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-xs66mhfix",
                        "potm": "João Maní",
                        "team1": "DELM",
                        "team2": "RS",
                        "score1": 5,
                        "score2": 4,
                        "seed": 3763,
                        "goals": [
                            {
                                "player": "João Maní",
                                "minute": 37,
                                "team": "DELM",
                                "assist": "Pedro Fernandez"
                            },
                            {
                                "player": "João Maní",
                                "minute": 53,
                                "team": "DELM",
                                "assist": "Pedro Fernandez"
                            },
                            {
                                "player": "Brian Marlino",
                                "minute": 77,
                                "team": "DELM",
                                "assist": "João Maní"
                            },
                            {
                                "player": "João Maní",
                                "minute": 85,
                                "team": "DELM",
                                "assist": false
                            },
                            {
                                "player": "Brian Marlino",
                                "minute": 99,
                                "team": "DELM",
                                "assist": false
                            },
                            {
                                "player": "James Falcao",
                                "minute": 7,
                                "team": "RS",
                                "assist": "Fezto Maradini"
                            },
                            {
                                "player": "Antonio Rodriguez",
                                "minute": 19,
                                "team": "RS",
                                "assist": "Emilio Gallego"
                            },
                            {
                                "player": "James Falcao",
                                "minute": 41,
                                "team": "RS",
                                "assist": "Ricardo Ortiz"
                            },
                            {
                                "player": "Daniel Vargas",
                                "minute": 61,
                                "team": "RS",
                                "assist": "Rafael Torres Espinosa"
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-qhkvbo0st",
                        "potm": "Aiden brown",
                        "team1": "deg",
                        "team2": "serpo",
                        "score1": 0,
                        "score2": 1,
                        "seed": 6539,
                        "goals": [
                            {
                                "player": "Aiden brown",
                                "minute": 51,
                                "team": "serpo",
                                "assist": "Hona Piroka"
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-f3v7uc0az",
                        "potm": "Van Silva",
                        "team1": "pacer",
                        "team2": "gks",
                        "score1": 3,
                        "score2": 1,
                        "seed": 7261,
                        "goals": [
                            {
                                "player": "Patrick Whitehall",
                                "minute": 12,
                                "team": "pacer",
                                "assist": "Van Silva"
                            },
                            {
                                "player": "Scott Thornberry",
                                "minute": 12,
                                "team": "pacer",
                                "assist": "Van Silva"
                            },
                            {
                                "player": "San Guia",
                                "minute": 59,
                                "team": "pacer",
                                "assist": "Van Silva"
                            },
                            {
                                "player": "Elin Foster",
                                "minute": 47,
                                "team": "gks",
                                "assist": "Derick Gru"
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-89hy6h10r",
                        "potm": "none",
                        "team1": "lenico",
                        "team2": "astH",
                        "score1": 1,
                        "score2": 0,
                        "seed": 6429,
                        "goals": [
                            {
                                "player": "Dan Fons",
                                "minute": 7,
                                "team": "lenico",
                                "assist": false
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-sb0fpjwuq",
                        "potm": "none",
                        "team1": "NDIJON",
                        "team2": "tex",
                        "score1": 2,
                        "score2": 3,
                        "seed": 2850,
                        "goals": [
                            {
                                "player": "Nigel Estafano",
                                "minute": 90,
                                "team": "NDIJON",
                                "assist": "Harvey Delapos"
                            },
                            {
                                "player": "Elliot Fons",
                                "minute": 72,
                                "team": "NDIJON",
                                "assist": "Harvey Delapos"
                            },
                            {
                                "player": "Jota Eme",
                                "minute": 78,
                                "team": "tex",
                                "assist": "Raúl Blanco"
                            },
                            {
                                "player": "Carlos Mendoza",
                                "minute": 45,
                                "team": "tex",
                                "assist": "Otto Nesta"
                            },
                            {
                                "player": "Jota Eme",
                                "minute": 67,
                                "team": "tex",
                                "assist": "Fojan Grick"
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-vsycyp7u0",
                        "potm": "none",
                        "team1": "Uly",
                        "team2": "dj",
                        "score1": 2,
                        "score2": 3,
                        "seed": 6119,
                        "goals": [
                            {
                                "player": "Thomas Worthington",
                                "minute": 19,
                                "team": "Uly",
                                "assist": "Kevin Lockhart"
                            },
                            {
                                "player": "Thomas Worthington",
                                "minute": 46,
                                "team": "Uly",
                                "assist": "Kevin Lockhart"
                            },
                            {
                                "player": "Trevor Blackburn",
                                "minute": 38,
                                "team": "dj",
                                "assist": "Meso Alvarez"
                            },
                            {
                                "player": "Trevor Blackburn",
                                "minute": 66,
                                "team": "dj",
                                "assist": "Meso Alvarez"
                            },
                            {
                                "player": "Elliott Lox",
                                "minute": 54,
                                "team": "dj",
                                "assist": "Skelly Klose"
                            }
                        ],
                        "standby": false
                    },
                    {
                        "id": "match-salnn6fci",
                        "potm": "none",
                        "team1": "hogn",
                        "team2": "riofc",
                        "score1": 3,
                        "score2": 2,
                        "seed": 9033,
                        "goals": [
                            {
                                "player": "Xan De Bar",
                                "minute": 8,
                                "team": "hogn",
                                "assist": "Denjo Perco"
                            },
                            {
                                "player": "Xan De Bar",
                                "minute": 89,
                                "team": "hogn",
                                "assist": "Isaac Wellington"
                            },
                            {
                                "player": "Jeremy Pickering",
                                "minute": 32,
                                "team": "hogn",
                                "assist": "Francisco Diaz"
                            },
                            {
                                "player": "Jason Blu",
                                "minute": 21,
                                "team": "riofc",
                                "assist": "Sudo Mane"
                            },
                            {
                                "player": "Sans Pedri",
                                "minute": 40,
                                "team": "riofc",
                                "assist": "Gas Luidado"
                            }
                        ],
                        "standby": false
                    }
                ],
                "id": "matchday-4"
            },
            {
                "details": "League Phase",
                "games": [
                    {
                        "id": "match-jfg095bhn",
                        "potm": "Fezto Maradini",
                        "team1": "RS",
                        "team2": "pali",
                        "score1": 4,
                        "score2": 1,
                        "seed": 350,
                        "goals": [
                            {
                                "player": "James Falcao",
                                "minute": 38,
                                "team": "RS",
                                "assist": "Rafael Torres Espinosa"
                            },
                            {
                                "player": "Fezto Maradini",
                                "minute": 34,
                                "team": "RS",
                                "assist": "Emilio Gallego"
                            },
                            {
                                "player": "Daniel Vargas",
                                "minute": 37,
                                "team": "RS",
                                "assist": "Fezto Maradini"
                            },
                            {
                                "player": "Daniel Vargas",
                                "minute": 6,
                                "team": "RS",
                                "assist": "James Falcao"
                            },
                            {
                                "player": "Timothy Blackthorn",
                                "minute": 58,
                                "team": "pali",
                                "assist": false
                            }
                        ]
                    },
                    {
                        "id": "match-mmug73vwe",
                        "potm": "none",
                        "team1": "lenico",
                        "team2": "tex",
                        "score1": 0,
                        "score2": 2,
                        "seed": 9251,
                        "goals": [
                            {
                                "player": "Fojan Grick",
                                "minute": 68,
                                "team": "tex",
                                "assist": "Raúl Blanco"
                            },
                            {
                                "player": "Jota Eme",
                                "minute": 50,
                                "team": "tex",
                                "assist": false
                            }
                        ]
                    },
                    {
                        "id": "match-plx0ibll4",
                        "potm": "none",
                        "team1": "hewi",
                        "team2": "Uly",
                        "score1": 1,
                        "score2": 3,
                        "seed": 9388,
                        "goals": [
                            {
                                "player": "Mio Lusler",
                                "minute": 45,
                                "team": "hewi",
                                "assist": "Olice Alze"
                            },
                            {
                                "player": "Marzo Dibla",
                                "minute": 31,
                                "team": "Uly",
                                "assist": "James Holister"
                            },
                            {
                                "player": "Marzo Dibla",
                                "minute": 25,
                                "team": "Uly",
                                "assist": false
                            },
                            {
                                "player": "Docey E'cani",
                                "minute": 58,
                                "team": "Uly",
                                "assist": "Marzo Dibla"
                            }
                        ]
                    },
                    {
                        "id": "match-a8oze9jw8",
                        "potm": "none",
                        "team1": "astH",
                        "team2": "Sentago",
                        "score1": 0,
                        "score2": 2,
                        "seed": 8931,
                        "goals": [
                            {
                                "player": "Resto Elli",
                                "minute": 28,
                                "team": "Sentago",
                                "assist": "Rafi Pulla"
                            },
                            {
                                "player": "Resto Elli",
                                "minute": 27,
                                "team": "Sentago",
                                "assist": "Roberto Vargas"
                            }
                        ]
                    },
                    {
                        "id": "match-d3q4f2d1r",
                        "potm": "Fern Vardy",
                        "team1": "DELU",
                        "team2": "DELM",
                        "score1": 2,
                        "score2": 0,
                        "seed": 8700,
                        "goals": [
                            {
                                "player": "Fern Vardy",
                                "minute": 85,
                                "team": "DELU",
                                "assist": "Oswin Glanstoné"
                            },
                            {
                                "player": "Fern Vardy",
                                "minute": 12,
                                "team": "DELU",
                                "assist": "Ian Bridgewater"
                            }
                        ]
                    },
                    {
                        "id": "match-nrv8c8hdx",
                        "potm": "none",
                        "team1": "serpo",
                        "team2": "BVB",
                        "score1": 2,
                        "score2": 3,
                        "seed": 9695,
                        "goals": [
                            {
                                "player": "Aiden brown",
                                "minute": 64,
                                "team": "serpo",
                                "assist": "Den Torch"
                            },
                            {
                                "player": "Mystio jelen",
                                "minute": 12,
                                "team": "serpo",
                                "assist": "Sergio Lopez"
                            },
                            {
                                "player": "Denzel Opel",
                                "minute": 40,
                                "team": "BVB",
                                "assist": "Jordan Harwood"
                            },
                            {
                                "player": "Arthur Wellington",
                                "minute": 79,
                                "team": "BVB",
                                "assist": false
                            },
                            {
                                "player": "Arthur Wellington",
                                "minute": 86,
                                "team": "BVB",
                                "assist": "David Huberto"
                            }
                        ]
                    },
                    {
                        "id": "match-gyostk7en",
                        "potm": "none",
                        "team1": "Dom",
                        "team2": "pacer",
                        "score1": 0,
                        "score2": 2,
                        "seed": 5204,
                        "goals": [
                            {
                                "player": "Van Silva",
                                "minute": 24,
                                "team": "pacer",
                                "assist": "San Guia"
                            },
                            {
                                "player": "Mans Icao",
                                "minute": 86,
                                "team": "pacer",
                                "assist": "Patrick Whitehall"
                            }
                        ]
                    },
                    {
                        "id": "match-zdk0zr5oc",
                        "potm": "none",
                        "team1": "DelUnited",
                        "team2": "deg",
                        "score1": 2,
                        "score2": 1,
                        "seed": 8643,
                        "goals": [
                            {
                                "player": "Alvro Casmiero",
                                "minute": 78,
                                "team": "DelUnited",
                                "assist": "Thiago Burns"
                            },
                            {
                                "player": "Alvro Casmiero",
                                "minute": 77,
                                "team": "DelUnited",
                                "assist": "Ethan ColWil"
                            },
                            {
                                "player": "Liam Rothwell",
                                "minute": 53,
                                "team": "deg",
                                "assist": false
                            }
                        ]
                    },
                    {
                        "id": "match-qkopyhr30",
                        "potm": "none",
                        "team1": "fill",
                        "team2": "PSL",
                        "score1": 0,
                        "score2": 2,
                        "seed": 2956,
                        "goals": [
                            {
                                "player": "Fisca Lapierre",
                                "minute": 43,
                                "team": "PSL",
                                "assist": "Ryan Cunningham"
                            },
                            {
                                "player": "Dante Paulo",
                                "minute": 40,
                                "team": "PSL",
                                "assist": "Marco Gutierrez"
                            }
                        ]
                    },
                    {
                        "id": "match-f9monoqvv",
                        "potm": "none",
                        "team1": "esg",
                        "team2": "NDIJON",
                        "score1": 3,
                        "score2": 1,
                        "seed": 1389,
                        "goals": [
                            {
                                "player": "Antonio García",
                                "minute": 44,
                                "team": "esg",
                                "assist": "Javier Muñoz"
                            },
                            {
                                "player": "Antonio García",
                                "minute": 76,
                                "team": "esg",
                                "assist": "Jerly Enock"
                            },
                            {
                                "player": "Finz Poala",
                                "minute": 23,
                                "team": "esg",
                                "assist": "Egnini Lafano"
                            },
                            {
                                "player": "Nigel Estafano",
                                "minute": 6,
                                "team": "NDIJON",
                                "assist": "Guillermo Sanz Romero"
                            }
                        ]
                    },
                    {
                        "id": "match-19oclrt50",
                        "potm": "none",
                        "team1": "nb",
                        "team2": "BCCR",
                        "score1": 2,
                        "score2": 1,
                        "seed": 9918,
                        "goals": [
                            {
                                "player": "Andre Picao",
                                "minute": 44,
                                "team": "nb",
                                "assist": false
                            },
                            {
                                "player": "Andre Picao",
                                "minute": 96,
                                "team": "nb",
                                "assist": false
                            },
                            {
                                "player": "Hius Ruo",
                                "minute": 74,
                                "team": "BCCR",
                                "assist": "James tackfo"
                            }
                        ]
                    },
                    {
                        "id": "match-afkngjpj0",
                        "potm": "none",
                        "team1": "athmak",
                        "team2": "riofc",
                        "score1": 0,
                        "score2": 3,
                        "seed": 6320,
                        "goals": [
                            {
                                "player": "Sudo Mane",
                                "minute": 79,
                                "team": "riofc",
                                "assist": "Nisel bastoni"
                            },
                            {
                                "player": "Jason Blu",
                                "minute": 72,
                                "team": "riofc",
                                "assist": "Nisel bastoni"
                            },
                            {
                                "player": "Jason Blu",
                                "minute": 78,
                                "team": "riofc",
                                "assist": "Gas Luidado"
                            }
                        ]
                    },
                    {
                        "id": "match-ui7xaxqku",
                        "potm": "none",
                        "team1": "Sprta",
                        "team2": "ocio",
                        "score1": 0,
                        "score2": 2,
                        "seed": 1308,
                        "goals": [
                            {
                                "player": "Perco Di'lano",
                                "minute": 89,
                                "team": "ocio",
                                "assist": "Elliot Granar"
                            },
                            {
                                "player": "Enrique Díaz",
                                "minute": 91,
                                "team": "ocio",
                                "assist": "James Garcia"
                            }
                        ]
                    },
                    {
                        "id": "match-omhgamr1a",
                        "potm": "none",
                        "team1": "dj",
                        "team2": "gks",
                        "score1": 0,
                        "score2": 0,
                        "seed": 2174,
                        "goals": []
                    },
                    {
                        "id": "match-3t5jdhx7u",
                        "potm": "none",
                        "team1": "penn",
                        "team2": "bsti",
                        "score1": 3,
                        "score2": 1,
                        "seed": 3547,
                        "goals": [
                            {
                                "player": "David Rodriguez",
                                "minute": 75,
                                "team": "penn",
                                "assist": "Enderson Ronaldo"
                            },
                            {
                                "player": "Neil Hargreaves",
                                "minute": 58,
                                "team": "penn",
                                "assist": "Enderson Ronaldo"
                            },
                            {
                                "player": "Sean lawernce",
                                "minute": 73,
                                "team": "penn",
                                "assist": "Enderson Ronaldo"
                            },
                            {
                                "player": "Tomás García Mendoza",
                                "minute": 13,
                                "team": "bsti",
                                "assist": false
                            }
                        ]
                    },
                    {
                        "id": "match-wb1rl45kg",
                        "potm": "none",
                        "team1": "hogn",
                        "team2": "V",
                        "score1": 2,
                        "score2": 0,
                        "seed": 9718,
                        "goals": [
                            {
                                "player": "Xan De Bar",
                                "minute": 74,
                                "team": "hogn",
                                "assist": "Denjo Perco"
                            },
                            {
                                "player": "Isaac Wellington",
                                "minute": 60,
                                "team": "hogn",
                                "assist": "Xan De Bar"
                            }
                        ]
                    }
                ],
                "id": "matchday-5"
            },
            {
                "details": "League Phase",
                "games": [
                    {
                        "id": "match-4fcar1wq9",
                        "potm": "none",
                        "team1": "DELU",
                        "team2": "DELM",
                        "score1": 2,
                        "score2": 4,
                        "seed": 1619,
                        "goals": [
                            {
                                "player": "Fern Vardy",
                                "minute": 34,
                                "team": "DELU",
                                "assist": "Bebi Fanton"
                            },
                            {
                                "player": "Paul Stockbridge",
                                "minute": 42,
                                "team": "DELU",
                                "assist": "Mark Westfield"
                            },
                            {
                                "player": "João Maní",
                                "minute": 14,
                                "team": "DELM",
                                "assist": false
                            },
                            {
                                "player": "João Maní",
                                "minute": 24,
                                "team": "DELM",
                                "assist": "Yanim Yali"
                            },
                            {
                                "player": "Pedro Fernandez",
                                "minute": 55,
                                "team": "DELM",
                                "assist": "Eji"
                            },
                            {
                                "player": "João Maní",
                                "minute": 95,
                                "team": "DELM",
                                "assist": "Stenfano Mirc"
                            }
                        ]
                    },
                    {
                        "id": "match-t7ag217mz",
                        "potm": "none",
                        "team1": "ocio",
                        "team2": "tex",
                        "score1": 1,
                        "score2": 0,
                        "seed": 9615,
                        "goals": [
                            {
                                "player": "Perco Di'lano",
                                "minute": 43,
                                "team": "ocio",
                                "assist": "Riri Ruco"
                            }
                        ]
                    }
                ],
                "id": "matchday-6"
            }
        ]
    },
    {
        "year": "2025",
        "teams": [
            "tex",
            "DELU",
            "DELM",
            "Dom",
            "fill",
            "esg",
            "hewi",
            "lenico",
            "nb",
            "pali",
            "Sprta",
            "Uly",
            "RS",
            "BCCR",
            "serpo",
            "DelUnited",
            "PSL",
            "NDIJON",
            "ocio",
            "riofc",
            "Sentago",
            "pacer",
            "gks",
            "BVB",
            "deg",
            "astH",
            "bsti",
            "hogn",
            "penn",
            "dj",
            "athmak",
            "V"
        ],
        "id": "season-2025",
        "matchdays": []
    }
]



// document.addEventListener('DOMContentLoaded', () => {
//     importSeason(seasonTopush);
// });