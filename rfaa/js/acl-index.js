// Define global variables
export let goals = localStorage.getItem('goals') ? JSON.parse(localStorage.getItem('goals')) : [];

import { players } from './players.js';
import { seasonTopush } from './achive/1999-1.js';
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
    sub: `Oc'a`,
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

function renderCardIndicators(cards, teamId) {
    if (!cards || cards.length === 0) return '';
    const teamCards = cards.filter(c => c.team === teamId);
    if (teamCards.length === 0) return '';
    return `<span class="card-count">${teamCards.length > 1 ? teamCards.length : ''}</span>`;
}

function renderMatches(matchdays, passdownIndex) {
    if (!matchdays || !Array.isArray(matchdays)) return '';
    
    return matchdays.map((matchday, index) => {
        if (!matchday.games || !Array.isArray(matchday.games)) return '';
        
        const matchesHtml = matchday.games.map(game => {
            const team1 = getTeamById(game.team1);
            const team2 = getTeamById(game.team2);

            const team1Img = team1.img || 'images/teams/default.png';
            const team2Img = team2.img || 'images/teams/default.png';
            
            const team1Yellows = game.yellowCards ? game.yellowCards.filter(c => c.team === game.team1).length : 0;
            const team1Reds = game.redCards ? game.redCards.filter(c => c.team === game.team1).length : 0;
            const team2Yellows = game.yellowCards ? game.yellowCards.filter(c => c.team === game.team2).length : 0;
            const team2Reds = game.redCards ? game.redCards.filter(c => c.team === game.team2).length : 0;

            const team1CardsHtml = `
                ${team1Yellows > 0 ? `<span class="card-indicator card-indicator--yellow">${team1Yellows > 1 ? team1Yellows : ''}</span>` : ''}
                ${team1Reds > 0 ? `<span class="card-indicator card-indicator--red">${team1Reds > 1 ? team1Reds : ''}</span>` : ''}
            `;
            const team2CardsHtml = `
                ${team2Yellows > 0 ? `<span class="card-indicator card-indicator--yellow">${team2Yellows > 1 ? team2Yellows : ''}</span>` : ''}
                ${team2Reds > 0 ? `<span class="card-indicator card-indicator--red">${team2Reds > 1 ? team2Reds : ''}</span>` : ''}
            `;

            if (!game.standby) {
                return `
                <div class="md-match" data-match-id="${game.id}">
                    <div class="team-1 team">
                        <div class="team-info">
                            <img src="${team1.img}" alt="${team1.name}">
                            <span>${team1.name}</span>
                            ${team1CardsHtml}
                        </div>
                        <span class="score">
                            ${game.score1}
                        </span>
                    </div>
                    <div class="team-2 team">
                        <div class="team-info">
                            <img src="${team2.img}" alt="${team2.name}">
                            <span>${team2.name}</span>
                            ${team2CardsHtml}
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
                            ${team1CardsHtml}
                        </div>
                        <span class="score">
                            ${game.score1}
                        </span>
                    </div>
                    <div class="team-2 team">
                        <div class="team-info">
                            <img src="${team2.img}" alt="${team2.name}">
                            <span>${team2.name}</span>
                            ${team2CardsHtml}
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
    const team1YellowCards = [];
    const team1RedCards = [];
    const team2YellowCards = [];
    const team2RedCards = [];

    console.log(matchdayIndex, 'matchday');

    const t1 = getTeamById(matchday?.games[thisMatchIdex]?.team1);
    const t2 = getTeamById(matchday?.games[thisMatchIdex]?.team2);



    notifEdText.innerHTML = `
        <div class="match-dialog-header">
            <h1>Create Match</h1>
            <div class="match-dialog-close" id="cancel-match-btn">&#x2715;</div>
        </div>

        <div class="scoreboard-area">
            <div class="scoreboard-team">
                <select id="team1-select">
                ${!startMatch ? seasons.find(season => season.year === currentSeason).teams
                    .filter(teamId => {
                        const matchdayTeams = matchday.games.flatMap(game => [game.team1, game.team2]);
                        return !matchdayTeams.includes(teamId);
                    })
                    .map(teamId => {
                        const team = getTeamById(teamId);
                        return `<option value="${teamId}" ${teamId === matchday.games[0]?.team1 ? 'selected' : ''}>${team.name}</option>`;
                    }).join('') 
                    : 
                    `<option value="${matchday.games[thisMatchIdex].team1}">${getTeamById(matchday.games[thisMatchIdex].team1).name}</option>`
                }
                </select>
            </div>

            <div class="scoreboard-vs">
                <div class="score-display" id="team1-score">0</div>
                <span class="score-divider">&ndash;</span>
                <div class="score-display" id="team2-score">0</div>
            </div>

            <div class="scoreboard-team">
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
            </div>
        </div>

        <div class="potm-bar">
            <label>POTM</label>
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
        </div>

        <div class="score-manager">
            <div class="team-man" id="team1">
                <div class="team-section-label">Goals</div>
                <div class="add-goal">
                    <div class="add-options">
                        <div class="add-goal-trigger" id="team1-add-goal">+ Goal</div>
                        <select id="team1-player-select">
                        ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                            : t1.player.map(p => `<option value="${p}">${p}</option>`).join('')
                        }
                        </select>
                    </div>
                    <div class="add-options">
                        <span class="type">Type</span>
                        <select id="team1-goal-type">
                            <option value="none">none</option>
                            <option value="free kick">free kick</option>
                            <option value="penalty">penalty</option>
                        </select>
                    </div>
                    <div class="add-options">
                        <span class="assist">Assist</span>
                        <select id="team1-player-select-assist">
                            <option value="none">none</option>
                        ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                            : t1.player.map(p => `<option value="${p}">${p}</option>`).join('')
                        }
                        </select>
                    </div>
                    <input type="number" id="team1-goal-minute" placeholder="Min" min="1" max="120">
                </div>
                <ul class="goal-list" id="team1-goal-list"></ul>

                <div class="team-section-label">Cards</div>
                <div class="add-card">
                    <div class="add-options">
                        <div class="add-card-trigger yellow-trigger" id="team1-add-yellow">&#x1F7E8; Yellow</div>
                        <select id="team1-yellow-player-select">
                        ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                            : t1.player.map(p => `<option value="${p}">${p}</option>`).join('')
                        }
                        </select>
                    </div>
                    <div class="add-options">
                        <div class="add-card-trigger red-trigger" id="team1-add-red">&#x1F7E5; Red</div>
                        <select id="team1-red-player-select">
                        ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                            : t1.player.map(p => `<option value="${p}">${p}</option>`).join('')
                        }
                        </select>
                    </div>
                    <input type="number" id="team1-card-minute" placeholder="Min" min="1" max="120">
                </div>
                <ul class="card-list" id="team1-card-list"></ul>
            </div>

            <div class="team-man" id="team2">
                <div class="team-section-label">Goals</div>
                <div class="add-goal">
                    <div class="add-options">
                        <div class="add-goal-trigger" id="team2-add-goal">+ Goal</div>
                        <select id="team2-player-select">
                            ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                                : t2.player.map(p => `<option value="${p}">${p}</option>`).join('')
                            }
                        </select>
                    </div>
                    <div class="add-options">
                        <span class="type">Type</span>
                        <select id="team2-goal-type">
                            <option value="none">none</option>
                            <option value="free kick">free kick</option>
                            <option value="penalty">penalty</option>
                        </select>
                    </div>
                    <div class="add-options">
                        <span class="assist">Assist</span>
                        <select id="team2-player-select-assist">
                            <option value="none">none</option>
                            ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                                : t2.player.map(p => `<option value="${p}">${p}</option>`).join('')
                            }
                        </select>
                    </div>
                    <input type="number" id="team2-goal-minute" placeholder="Min" min="1" max="120">
                </div>
                <ul class="goal-list" id="team2-goal-list"></ul>

                <div class="team-section-label">Cards</div>
                <div class="add-card">
                    <div class="add-options">
                        <div class="add-card-trigger yellow-trigger" id="team2-add-yellow">&#x1F7E8; Yellow</div>
                        <select id="team2-yellow-player-select">
                        ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                            : t2.player.map(p => `<option value="${p}">${p}</option>`).join('')
                        }
                        </select>
                    </div>
                    <div class="add-options">
                        <div class="add-card-trigger red-trigger" id="team2-add-red">&#x1F7E5; Red</div>
                        <select id="team2-red-player-select">
                        ${!startMatch ? teams[0].player.map(p => `<option value="${p}">${p}</option>`).join('')
                            : t2.player.map(p => `<option value="${p}">${p}</option>`).join('')
                        }
                        </select>
                    </div>
                    <input type="number" id="team2-card-minute" placeholder="Min" min="1" max="120">
                </div>
                <ul class="card-list" id="team2-card-list"></ul>
            </div>
        </div>

        <div class="adv-settings-toggle" id="adv-toggle">
            <span class="adv-toggle-icon">▸</span> Advanced Stats
        </div>
        <div class="adv-settings dn" id="adv-panel">
            <div class="adv-section">
                <div class="adv-section-label">Match Favor</div>
                <div class="adv-favor-bar">
                    <span class="adv-favor-team" id="adv-favor-t1">50%</span>
                    <div class="adv-favor-track">
                        <input type="range" min="0" max="100" value="50" id="adv-favor-slider">
                        <div class="adv-favor-fill" id="adv-favor-fill"></div>
                    </div>
                    <span class="adv-favor-team" id="adv-favor-t2">50%</span>
                </div>
            </div>
            <div class="adv-stats-grid">
                <div class="adv-stat-row">
                    <span class="adv-stat-val" id="adv-poss-t1">50</span>
                    <div class="adv-stat-mid">
                        <span class="adv-stat-label">Possession %</span>
                        <div class="adv-stat-track">
                            <input type="range" min="20" max="80" value="50" id="adv-poss-slider">
                            <div class="adv-stat-fill" id="adv-poss-fill"></div>
                        </div>
                    </div>
                    <span class="adv-stat-val" id="adv-poss-t2">50</span>
                </div>
                <div class="adv-stat-row">
                    <input type="number" class="adv-stat-input" id="adv-sot-t1" value="0" min="0" max="50">
                    <div class="adv-stat-mid">
                        <span class="adv-stat-label">Shots on Target</span>
                    </div>
                    <input type="number" class="adv-stat-input" id="adv-sot-t2" value="0" min="0" max="50">
                </div>
                <div class="adv-stat-row">
                    <input type="number" class="adv-stat-input" id="adv-pass-t1" value="0" min="0" max="100">
                    <div class="adv-stat-mid">
                        <span class="adv-stat-label">Pass Accuracy %</span>
                    </div>
                    <input type="number" class="adv-stat-input" id="adv-pass-t2" value="0" min="0" max="100">
                </div>
                <div class="adv-stat-row">
                    <input type="number" class="adv-stat-input" id="adv-corners-t1" value="0" min="0" max="30">
                    <div class="adv-stat-mid">
                        <span class="adv-stat-label">Corners</span>
                    </div>
                    <input type="number" class="adv-stat-input" id="adv-corners-t2" value="0" min="0" max="30">
                </div>
                <div class="adv-stat-row">
                    <input type="number" class="adv-stat-input" id="adv-offsides-t1" value="0" min="0" max="20">
                    <div class="adv-stat-mid">
                        <span class="adv-stat-label">Offsides</span>
                    </div>
                    <input type="number" class="adv-stat-input" id="adv-offsides-t2" value="0" min="0" max="20">
                </div>
            </div>
        </div>

        <div class="match-dialog-actions">
            <div class="match-cancel-btn" id="cancel-match-btn-2">CANCEL</div>
            <div class="match-create-btn" id="create-match-btn">CREATE MATCH</div>
        </div>
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
    const type1El = document.querySelector('#team1-goal-type');
    const type2El = document.querySelector('#team2-goal-type');
    const potm = document.querySelector('#potm');

    const advToggle = document.querySelector('#adv-toggle');
    const advPanel = document.querySelector('#adv-panel');
    const advFavorSlider = document.querySelector('#adv-favor-slider');
    const advFavorFill = document.querySelector('#adv-favor-fill');
    const advFavorT1 = document.querySelector('#adv-favor-t1');
    const advFavorT2 = document.querySelector('#adv-favor-t2');
    const advPossSlider = document.querySelector('#adv-poss-slider');
    const advPossFill = document.querySelector('#adv-poss-fill');
    const advPossT1 = document.querySelector('#adv-poss-t1');
    const advPossT2 = document.querySelector('#adv-poss-t2');

    advToggle.addEventListener('click', () => {
        advPanel.classList.toggle('dn');
        advToggle.querySelector('.adv-toggle-icon').textContent = advPanel.classList.contains('dn') ? '▸' : '▾';
    });

    function updatePossFill() {
        const v = parseInt(advPossSlider.value);
        advPossT1.textContent = v;
        advPossT2.textContent = 100 - v;
        advPossFill.style.width = v + '%';
    }

    function updateFavorFill() {
        const v = parseInt(advFavorSlider.value);
        advFavorT1.textContent = v + '%';
        advFavorT2.textContent = (100 - v) + '%';
        advFavorFill.style.width = v + '%';
    }

    function applyFavor() {
        const f = parseInt(advFavorSlider.value);
        const bias = (f - 50) / 50;
        const poss = Math.round(50 + bias * 25);
        advPossSlider.value = poss;
        updatePossFill();
        const sotBase = Math.round(3 + Math.abs(bias) * 7);
        const sotLow = Math.max(0, Math.round(sotBase * (1 - Math.abs(bias) * 0.6)));
        document.querySelector('#adv-sot-t1').value = bias >= 0 ? sotBase : sotLow;
        document.querySelector('#adv-sot-t2').value = bias >= 0 ? sotLow : sotBase;
        const passHigh = Math.round(75 + Math.abs(bias) * 15);
        const passLow = Math.round(75 - Math.abs(bias) * 20);
        document.querySelector('#adv-pass-t1').value = bias >= 0 ? passHigh : passLow;
        document.querySelector('#adv-pass-t2').value = bias >= 0 ? passLow : passHigh;
        const cornHigh = Math.round(4 + Math.abs(bias) * 6);
        const cornLow = Math.round(4 - Math.abs(bias) * 3);
        document.querySelector('#adv-corners-t1').value = bias >= 0 ? cornHigh : Math.max(0, cornLow);
        document.querySelector('#adv-corners-t2').value = bias >= 0 ? Math.max(0, cornLow) : cornHigh;
        const offHigh = Math.round(2 + Math.abs(bias) * 3);
        const offLow = Math.round(2 - Math.abs(bias) * 1);
        document.querySelector('#adv-offsides-t1').value = bias >= 0 ? offHigh : Math.max(0, offLow);
        document.querySelector('#adv-offsides-t2').value = bias >= 0 ? Math.max(0, offLow) : offHigh;
    }

    advFavorSlider.addEventListener('input', () => {
        updateFavorFill();
        applyFavor();
    });

    advPossSlider.addEventListener('input', updatePossFill);

    updateFavorFill();
    updatePossFill();

    function getAdvStats() {
        return {
            possession: { team1: parseInt(advPossT1.textContent), team2: parseInt(advPossT2.textContent) },
            shotsOnTarget: { team1: parseInt(document.querySelector('#adv-sot-t1').value) || 0, team2: parseInt(document.querySelector('#adv-sot-t2').value) || 0 },
            passAccuracy: { team1: parseInt(document.querySelector('#adv-pass-t1').value) || 0, team2: parseInt(document.querySelector('#adv-pass-t2').value) || 0 },
            corners: { team1: parseInt(document.querySelector('#adv-corners-t1').value) || 0, team2: parseInt(document.querySelector('#adv-corners-t2').value) || 0 },
            offsides: { team1: parseInt(document.querySelector('#adv-offsides-t1').value) || 0, team2: parseInt(document.querySelector('#adv-offsides-t2').value) || 0 }
        };
    }

    // On load, populate player selects and assists for both teams
    function updateTeam1Inputs() {
        const team = getTeamById(team1Select.value);
        team1PlayerSelect.innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
        playerAssist1.innerHTML = `<option value="none">none</option>` + team.player.map(p => `<option value="${p}">${p}</option>`).join('');
        document.querySelector('#team1-yellow-player-select').innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
        document.querySelector('#team1-red-player-select').innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
    }
    function updateTeam2Inputs() {
        const team = getTeamById(team2Select.value);
        team2PlayerSelect.innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
        playerAssist2.innerHTML = `<option value="none">none</option>` + team.player.map(p => `<option value="${p}">${p}</option>`).join('');
        document.querySelector('#team2-yellow-player-select').innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
        document.querySelector('#team2-red-player-select').innerHTML = team.player.map(p => `<option value="${p}">${p}</option>`).join('');
    }
    updateTeam1Inputs();
    updateTeam2Inputs();

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
    const cancelMatchBtn2 = document.querySelector('#cancel-match-btn-2');
    const closeHandler = () => {
        notifEd.classList.toggle('dn');
        notifEdText.innerHTML = '';
    };
    if (cancelMatchBtn) cancelMatchBtn.addEventListener('click', closeHandler);
    if (cancelMatchBtn2) cancelMatchBtn2.addEventListener('click', closeHandler);

    // Add goal for team 1
    document.querySelector('#team1-add-goal').addEventListener('click', () => {
        const player = team1PlayerSelect.value;
        let minute = parseInt(playerMinute1.value);
        let assit = playerAssist1.value === 'none' ? false : playerAssist1.value;
        let gaolType = type1El.value === 'none' ? false : type1El.value;

        

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

    // Add yellow card for team 1
    document.querySelector('#team1-add-yellow').addEventListener('click', () => {
        const player = document.querySelector('#team1-yellow-player-select').value;
        const minute = document.querySelector('#team1-card-minute').value;
        if (player && minute) {
            team1YellowCards.push({ player, minute: parseInt(minute), type: 'yellow' });
            renderCards(document.querySelector('#team1-card-list'), team1YellowCards, team1RedCards);
            document.querySelector('#team1-card-minute').value = '';
        }
    });

    // Add red card for team 1
    document.querySelector('#team1-add-red').addEventListener('click', () => {
        const player = document.querySelector('#team1-red-player-select').value;
        const minute = document.querySelector('#team1-card-minute').value;
        if (player && minute) {
            team1RedCards.push({ player, minute: parseInt(minute), type: 'red' });
            renderCards(document.querySelector('#team1-card-list'), team1YellowCards, team1RedCards);
            document.querySelector('#team1-card-minute').value = '';
        }
    });

    // Add goal for team 2
    document.querySelector('#team2-add-goal').addEventListener('click', () => {
        const player = team2PlayerSelect.value;
        let minute = parseInt(playerMinute2.value);
        let assit = playerAssist2.value === 'none' ? false : playerAssist2.value;
        let gaolType = type2El.value === 'none' ? false : type2El.value;

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

    // Add yellow card for team 2
    document.querySelector('#team2-add-yellow').addEventListener('click', () => {
        const player = document.querySelector('#team2-yellow-player-select').value;
        const minute = document.querySelector('#team2-card-minute').value;
        if (player && minute) {
            team2YellowCards.push({ player, minute: parseInt(minute), type: 'yellow' });
            renderCards(document.querySelector('#team2-card-list'), team2YellowCards, team2RedCards);
            document.querySelector('#team2-card-minute').value = '';
        }
    });

    // Add red card for team 2
    document.querySelector('#team2-add-red').addEventListener('click', () => {
        const player = document.querySelector('#team2-red-player-select').value;
        const minute = document.querySelector('#team2-card-minute').value;
        if (player && minute) {
            team2RedCards.push({ player, minute: parseInt(minute), type: 'red' });
            renderCards(document.querySelector('#team2-card-list'), team2YellowCards, team2RedCards);
            document.querySelector('#team2-card-minute').value = '';
        }
    });

    // Create match
    document.querySelector('#create-match-btn').addEventListener('click', () => {
        const team1 = team1Select.value;
        const team2 = team2Select.value;


        if (!team1 || !team2 || team1 === team2) {
            alert('Please select two different teams.');
            return;
        }

        const capturedStats = getAdvStats();

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
            goals: team1Goals.map(g => ({ player: g.player, minute: g.minute, team: team1, assist: g.assit, type: g.type || false }))
                .concat(team2Goals.map(g => ({ player: g.player, minute: g.minute, team: team2, assist: g.assit, type: g.type || false }))),
            yellowCards: team1YellowCards.map(c => ({ player: c.player, minute: c.minute, team: team1 }))
                .concat(team2YellowCards.map(c => ({ player: c.player, minute: c.minute, team: team2 }))),
            redCards: team1RedCards.map(c => ({ player: c.player, minute: c.minute, team: team1 }))
                .concat(team2RedCards.map(c => ({ player: c.player, minute: c.minute, team: team2 }))),
            stats: capturedStats
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
            goals: team1Goals.map(g => ({ player: g.player, minute: g.minute, team: team1, assist: g.assit, type: g.type || false }))
                .concat(team2Goals.map(g => ({ player: g.player, minute: g.minute, team: team2, assist: g.assit, type: g.type || false }))),
            yellowCards: team1YellowCards.map(c => ({ player: c.player, minute: c.minute, team: team1 }))
                .concat(team2YellowCards.map(c => ({ player: c.player, minute: c.minute, team: team2 }))),
            redCards: team1RedCards.map(c => ({ player: c.player, minute: c.minute, team: team1 }))
                .concat(team2RedCards.map(c => ({ player: c.player, minute: c.minute, team: team2 }))),
            standby: false,
            stats: capturedStats
            });
        }

        saveSeason();
        saveGoals();
        loadSeason(currentSeason);
    });

    function updateScores() {
        const el1 = document.getElementById('team1-score');
        const el2 = document.getElementById('team2-score');
        el1.textContent = team1Goals.length;
        el2.textContent = team2Goals.length;
        el1.classList.remove('score-animate');
        el2.classList.remove('score-animate');
        void el1.offsetWidth;
        void el2.offsetWidth;
        el1.classList.add('score-animate');
        el2.classList.add('score-animate');
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

    function renderCards(container, yellowCards, redCards) {
        const allCards = [
            ...yellowCards.map((card, index) => ({ ...card, index, isYellow: true })),
            ...redCards.map((card, index) => ({ ...card, index, isYellow: false }))
        ].sort((a, b) => a.minute - b.minute);

        container.innerHTML = allCards.map(card => {
            let displayMinute = card.minute;
            if (card.minute >= 91 && card.minute <= 98) {
                displayMinute = `90+${card.minute - 90}`;
            } else if (card.minute >= 121 && card.minute <= 129) {
                displayMinute = `120+${card.minute - 120}`;
            }
            const cardIcon = card.isYellow ? '🟨' : '🟥';
            return `
                <li>
                    ${cardIcon} ${card.player} - ${displayMinute}' 
                    <button class="remove-card-btn" data-index="${card.index}" data-yellow="${card.isYellow}">❌</button>
                </li>
            `;
        }).join('');

        container.querySelectorAll('.remove-card-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.getAttribute('data-index'));
                const isYellow = btn.getAttribute('data-yellow') === 'true';
                if (isYellow) {
                    yellowCards.splice(i, 1);
                } else {
                    redCards.splice(i, 1);
                }
                renderCards(container, yellowCards, redCards);
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
        // Scroll to bottom of pad-cont on initial load
        content.scrollTop = content.scrollHeight;
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
        <div class="match-dialog-header">
            <h1>Create Season</h1>
            <div class="match-dialog-close" id="cancel-create-season-x">&#x2715;</div>
        </div>
        <div style="padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.2rem; flex: 1; overflow-y: auto;">
            <span class="medtx" style="color: rgba(255,255,255,0.5);">
                teams selected: 0/36
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
        </div>
        <div class="match-dialog-actions">
            <div class="match-cancel-btn" id="cancel-create-season">CANCEL</div>
            <div class="match-create-btn" id="create-season">CREATE SEASON</div>
        </div>
    `;

    // Add event listeners for checkboxes to update team count
    const checkboxes = document.querySelectorAll('.team-checkbox');
    const teamCountDisplay = document.querySelector('.medtx');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const selectedCount = document.querySelectorAll('.team-checkbox:checked').length;
            teamCountDisplay.textContent = `teams selected: ${selectedCount}/36`;
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
    const cancelXBtn = document.querySelector('#cancel-create-season-x');
    if (cancelXBtn) {
        cancelXBtn.addEventListener('click', cancelCreateSeasonFunc);
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
    
    if (selectedTeams.length > 36) {
        alert('Please select a maximum of 36 teams');
        return;
    }
    
    if (selectedTeams.length > 36) {
        alert('Please select a maximum of 36 teams');
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

export function getThisSeason() {
    if (!seasons || seasons.length === 0) return null;
    const seasonsWithGames = seasons.filter(season =>
        season.matchdays && season.matchdays.some(md => md.games && md.games.length > 0)
    );
    if (seasonsWithGames.length === 0) return null;
    return seasonsWithGames.reduce((latest, season) => {
        return parseInt(season.year) > parseInt(latest.year) ? season : latest;
    });
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
    // Get unique years from the seasons array, sorted ascending
    const seasonYears = [...new Set(seasons.map(season => season.year))].sort((a, b) => Number(a) - Number(b));
    
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
    maindiv.style.display = 'flex';
}

renderMatchesTable();

import { calculateStandings, renderStandingsTable } from './table.js';
import { renderBracketView } from './bracket.js';

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
        document.querySelectorAll('.matches-table-select .iit').forEach(el => el.classList.remove('selected'));
        tableBtn.classList.add('selected');
        const currentSeason = getCurrentSeason();
        loadSeason(currentSeason);
    });
}

const matchesBtn = document.querySelector('#show-matches-btn');
if (matchesBtn) {
    matchesBtn.addEventListener('click', () => {
        document.querySelectorAll('.matches-table-select .iit').forEach(el => el.classList.remove('selected'));
        matchesBtn.classList.add('selected');
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

const bracketBtn = document.querySelector('#show-bracket-btn');
if (bracketBtn) {
    bracketBtn.addEventListener('click', () => {
        document.querySelectorAll('.matches-table-select .iit').forEach(el => el.classList.remove('selected'));
        bracketBtn.classList.add('selected');
        renderBracketView();
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
    const winYears = [];
    seasons.forEach(season => {
        if (!season.matchdays) return;
        const finalMatchday = season.matchdays.find(md => md.bracketType === 'finals' && md.games && md.games.length > 0);
        if (!finalMatchday) return;
        const finalGame = finalMatchday.games.find(g => !g.standby);
        if (!finalGame) return;
        if (finalGame.team1 === teamId || finalGame.team2 === teamId) {
            finals++;
            const isTeam1 = finalGame.team1 === teamId;
            const teamScore = parseInt(isTeam1 ? finalGame.score1 : finalGame.score2) || 0;
            const opponentScore = parseInt(isTeam1 ? finalGame.score2 : finalGame.score1) || 0;
            if (teamScore > opponentScore) {
                wins++;
                if (season.year) winYears.push(season.year);
            }
        }
    });
    return { finals, wins, winYears };
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
    // First try: check players.js data for team assignments
    const playerData = players.find(p => p.name === playerName);
    if (playerData && playerData.teams) {
        let latestTeam = null;
        let latestYear = -1;
        for (const [teamId, info] of Object.entries(playerData.teams)) {
            if (info.years && info.years.length > 0) {
                const maxYear = Math.max(...info.years);
                if (maxYear > latestYear) {
                    latestYear = maxYear;
                    latestTeam = teamId;
                }
            }
        }
        if (latestTeam) return latestTeam;
    }

    // Fallback: check goal data in games for team assignment
    let lastTeam = null;
    for (const season of seasons) {
        for (const matchday of season.matchdays || []) {
            for (const game of matchday.games || []) {
                if (game.goals && Array.isArray(game.goals)) {
                    for (const goal of game.goals) {
                        if (goal.player === playerName || goal.assist === playerName) {
                            lastTeam = goal.team;
                        }
                    }
                }
                if (game.potm === playerName) {
                    // Determine team from the player list on each team
                    const t1 = getTeamById(game.team1);
                    const t2 = getTeamById(game.team2);
                    if (t1 && t1.player && t1.player.includes(playerName)) {
                        lastTeam = game.team1;
                    } else if (t2 && t2.player && t2.player.includes(playerName)) {
                        lastTeam = game.team2;
                    }
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

// Seeded random number generator
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Generate random value within range using seed
function seededRandomInRange(seed, min, max) {
    return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

// Check if stats are missing or all zeros
function statsNeedRegeneration(stats) {
    if (!stats) return true;
    
    const allZero = 
        (stats.possession?.team1 === 50 && stats.possession?.team2 === 50) &&
        (stats.shotsOnTarget?.team1 === 0 && stats.shotsOnTarget?.team2 === 0) &&
        (stats.passAccuracy?.team1 === 0 && stats.passAccuracy?.team2 === 0) &&
        (stats.corners?.team1 === 0 && stats.corners?.team2 === 0) &&
        (stats.offsides?.team1 === 0 && stats.offsides?.team2 === 0);
    
    return allZero;
}

// Generate advanced stats based on score and seed
function generateStatsFromScore(score1, score2, seed) {
    const totalGoals = score1 + score2;
    const goalDiff = score1 - score2;
    
    // Calculate favor percentage (50% = draw, higher = team1 dominated)
    let favorPercent;
    if (totalGoals === 0) {
        // 0-0 draw, fairly balanced
        favorPercent = 50 + seededRandomInRange(seed, -10, 10);
    } else {
        // Base favor on goal difference
        const baseFavor = 50 + (goalDiff / Math.max(totalGoals, 1)) * 30;
        const variance = seededRandomInRange(seed + 1, -8, 8);
        favorPercent = Math.max(20, Math.min(80, baseFavor + variance));
    }
    
    const bias = (favorPercent - 50) / 50; // -1 to 1
    
    // Possession (more goals usually means more possession for winner)
    const possession1 = Math.round(50 + bias * seededRandomInRange(seed + 2, 15, 25));
    const possession2 = 100 - possession1;
    
    // Shots on target (correlate with goals scored + some randomness)
    const baseShots1 = score1 + seededRandomInRange(seed + 3, 1, 4);
    const baseShots2 = score2 + seededRandomInRange(seed + 4, 1, 4);
    const shotsOnTarget1 = Math.max(score1, baseShots1 + Math.round(bias * seededRandomInRange(seed + 5, 0, 3)));
    const shotsOnTarget2 = Math.max(score2, baseShots2 - Math.round(bias * seededRandomInRange(seed + 6, 0, 3)));
    
    // Pass accuracy (winner usually has better passing)
    const passAccuracy1 = Math.round(70 + bias * seededRandomInRange(seed + 7, 8, 15) + seededRandomInRange(seed + 8, -5, 5));
    const passAccuracy2 = Math.round(70 - bias * seededRandomInRange(seed + 9, 8, 15) + seededRandomInRange(seed + 10, -5, 5));
    
    // Corners (attacking team gets more)
    const corners1 = Math.round(3 + bias * seededRandomInRange(seed + 11, 2, 5) + seededRandomInRange(seed + 12, 0, 3));
    const corners2 = Math.round(3 - bias * seededRandomInRange(seed + 13, 2, 5) + seededRandomInRange(seed + 14, 0, 3));
    
    // Offsides (attacking team catches more offsides)
    const offsides1 = Math.round(2 + Math.abs(bias) * seededRandomInRange(seed + 15, 1, 3));
    const offsides2 = Math.round(2 + Math.abs(bias) * seededRandomInRange(seed + 16, 1, 3));
    
    return {
        possession: { 
            team1: Math.max(25, Math.min(75, possession1)), 
            team2: Math.max(25, Math.min(75, possession2)) 
        },
        shotsOnTarget: { 
            team1: Math.max(0, shotsOnTarget1), 
            team2: Math.max(0, shotsOnTarget2) 
        },
        passAccuracy: { 
            team1: Math.max(50, Math.min(95, passAccuracy1)), 
            team2: Math.max(50, Math.min(95, passAccuracy2)) 
        },
        corners: { 
            team1: Math.max(0, corners1), 
            team2: Math.max(0, corners2) 
        },
        offsides: { 
            team1: Math.max(0, offsides1), 
            team2: Math.max(0, offsides2) 
        }
    };
}

// Reinitialize all games with missing/zero stats
export function reinitial() {
    let updatedCount = 0;
    
    for (let season of seasons) {
        for (let matchday of season.matchdays || []) {
            for (let game of matchday.games || []) {
                // Skip standby games
                if (game.standby) continue;
                
                // Check if stats need regeneration
                if (statsNeedRegeneration(game.stats)) {
                    const seed = game.seed || Math.floor(Math.random() * 10000);
                    const score1 = game.score1 || 0;
                    const score2 = game.score2 || 0;
                    
                    // Generate new stats
                    game.stats = generateStatsFromScore(score1, score2, seed);
                    
                    // Ensure game has a seed for consistency
                    if (!game.seed) {
                        game.seed = seed;
                    }
                    
                    updatedCount++;
                }
            }
        }
    }
    
    // Save the updated seasons
    saveSeason();
    
    console.log(`Reinitial complete: Updated ${updatedCount} games with generated stats.`);
    alert(`Stats regenerated for ${updatedCount} games.`);
    
    // Reload current season to reflect changes
    const currentSeason = getCurrentSeason();
    loadSeason(currentSeason);
}

// Keyboard shortcut listener for Cmd/Ctrl + B
document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        reinitial();
    }
});


// document.addEventListener('DOMContentLoaded', () => {
//     importSeason(seasonTopush);
// });