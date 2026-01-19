// Define global variables
export let goals = localStorage.getItem('goals') ? JSON.parse(localStorage.getItem('goals')) : [];

import { players } from './players.js';
import { seasonTopush } from './achive/1998-2.js';
import { reapplyTeamLinkListeners } from './ui.js';
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


export let seasons = localStorage.getItem('seasons') ? JSON.parse(localStorage.getItem('seasons')) : [];
// seasons = seasonTopush; 

// saveSeason();
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

export function bindMatchClickEventsGlobal() {
    document.querySelectorAll('.link-match').forEach(match => {
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
    // create match, add match, make match, create game, gameday, add game, create game.

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

        // Build appearances as array of objects: { team: team name, name: player name }
        const teams1 = getTeamById(team1);
        const teams2 = getTeamById(team2);
        const appearances = [
            ...teams1.player.map(p => ({ team: teams1.name, name: p })),
            ...teams2.player.map(p => ({ team: teams2.name, name: p }))
        ];
        
        if (!startMatch) {
            seasons.find(season => season.year === currentSeason).matchdays[matchdayIndex].games.
            push({
            id: `match-${Math.random().toString(36).substr(2, 9)}`,
            potm: potm.value,
            team1: team1,
            team2: team2,
            score1: team1Goals.length,
            score2: team2Goals.length,
            appearances: appearances,
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
            appearances: appearances,
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
    reapplyTeamLinkListeners();

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

// deleteMatchById('match-kpj76hsck'); 

// deleteMatchday(1998, 10); 


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


export function getRankOfTeam() {
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

export function getMatchById(matchId) {
    for (let season of seasons) {
        for (let matchday of season.matchdays || []) {
            for (let game of matchday.games || []) {
                if (game.id === matchId) {
                    return game;
                }
            }
        }
    }
    return null;
}

export function getMatchDayIndexById(matchId) {
    for (let season of seasons) {
        for (let matchdayIndex = 0; matchdayIndex < (season.matchdays || []).length; matchdayIndex++) {
            for (let game of season.matchdays[matchdayIndex].games || []) {
                if (game.id === matchId) {
                    return matchdayIndex;
                }
            }
        }
    }
    return -1; // Return -1 if match not found
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

export function getSeasonOfMatch(matchId) {
    for (let season of seasons) {
        for (let matchday of season.matchdays || []) {
            for (let game of matchday.games || []) {
                if (game.id === matchId) {
                    return season.year;
                }
            }
        }
    }
    return null; // Return null if match not found
}


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
    let lastTeam = null;
    let lastMatchTime = -1;

    for (let season of seasons) {
        for (let matchday of season.matchdays || []) {
            for (let game of matchday.games || []) {
                if (Array.isArray(game.appearances) && game.appearances.includes(playerName)) {
                    // Check which team the player played for in this game
                    lastMatchTime = game
                }
            }
        }
    }

    return lastTeam;
}

    console.log(seasons)


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

export function getMatchArticleRelevence(match_id) {
    const match = getMatchById(match_id);
    const team1 = getTeamById(match.team1);
    const team2 = getTeamById(match.team2);
    const matchday = `m${getMatchDayIndexById(match_id) + 1}`;
    const playerst1 = team1.player;
    const playerst2 = team2.player;
    const players = [...playerst1, ...playerst2];
    const season = getSeasonOfMatch(match_id);

    const Matchdata = {
        match: match,
        team1: team1,
        team2: team2,
        matchday: matchday,
        players: players,
        season: season,
        goals: match.goals,
        score1: match.score1,
        score2: match.score2,
        potm: match.potm,
        seed: match.seed
    }

    
}



// document.addEventListener('DOMContentLoaded', () => {
//     importSeason(seasonTopush);
// });