import { getCurrentSeason, getTeamById, getTeamMacthes, getFinalsAndWins , getTeamByplayer, getPlayersByTeam } from './acl-index.js';
import { seasons } from './acl-index.js';

const team = getTeambyLink();

const topContent = document.querySelector('.content-team-info');

function getTeambyLink() {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('team');
    if (!teamId) return null;
    return getTeamById(teamId);
}

function getTeamForm(teamId) {
    const results = [];
    
    seasons.forEach(season => {
        if (!season.matchdays) return;

        season.matchdays.forEach(matchday => {
            if (!matchday.games) return;

            matchday.games.forEach(game => {
                if (game.team1 === teamId || game.team2 === teamId) {
                    const isTeam1 = game.team1 === teamId;
                    const teamScore = isTeam1 ? game.score1 : game.score2;
                    const opponentScore = isTeam1 ? game.score2 : game.score1;

                    if (teamScore > opponentScore) {
                        results.push('W');
                    } else if (teamScore === opponentScore) {
                        results.push('D');
                    } else {
                        results.push('L');
                    }
                }
            });
        });
    });

    return results.slice(-5); // Return last 5 results
}

function rendertopcontent() {
    
    // Update team image
    const teamImage = document.querySelector('.team-image img');
    if (teamImage) {
        teamImage.src = `${team.img}`;
        teamImage.alt = team.name;
    }

    // Update team name
    const teamName = document.querySelector('.team-name span');
    if (teamName) {
        teamName.textContent = team.name;
    }

    // Update Champions League count
    const clCount = document.querySelector('.cl-count span');
    if (clCount) {
        clCount.textContent = team.clWins || 0;
    }

    // Update win years
    const winYearsContainer = document.querySelector('.win-years');
    if (winYearsContainer) {
        winYearsContainer.innerHTML = '';
        const wins = getFinalsAndWins(team.id)?.wins || [];
        wins.forEach(year => {
            const yearElement = document.createElement('span');
            yearElement.innerHTML = `<a href="/history?season=${year}">${year}</a>`;
            winYearsContainer.appendChild(yearElement);
        });
    }

    // Calculate finals appearances and wins
    const form = getTeamForm(team.id);
    const wlInfoContainer = document.querySelector('.wl-info');
    if (wlInfoContainer) {
        wlInfoContainer.innerHTML = '';
        form.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'item';
            resultElement.id = result.toLowerCase();
            resultElement.textContent = result;
            wlInfoContainer.appendChild(resultElement);
        });
    }
}

function renderTeamInfo() {
    rendertopcontent();

    if (!team) {
        document.querySelector('.content-team-info').innerHTML = ` 
        no team found`;
        return;
    }

    const matchesHTML = renderMatches_1();
    const matchesContainer = document.querySelector('.matches-cont');
    matchesContainer.innerHTML = matchesHTML; 
}


renderTeamInfo();

// ultils

function renderMatches_1() {
    if (!team) return '';

    const teamMatches = getTeamMacthes(team.id);
    let matchesHTML = '';

    teamMatches.forEach(match => {
        const team1 = getTeamById(match.game.team1);
        const team2 = getTeamById(match.game.team2);

        // console.log(match);
        matchesHTML += `
            <div class="mini-match">
                <div class="match-info">
                    <span>${match.matchday} ${match.season}</span>
                </div>
                <div class="match-scores">
                    <div class="team-1 team">
                        <div class="team-info">
                            <img src="${team1.img}" alt="${team1.name}" />
                            <span>${team1.name}</span>
                        </div>
                        <span class="score">${match.game.score1}</span>
                    </div>
                    <div class="team-2 team">
                        <div class="team-info">
                            <img src="${team2.img}" alt="${team2.name}" />
                            <span>${team2.name}</span>
                        </div>
                        <span class="score">${match.game.score2}</span>
                    </div>
                </div>
            </div>
        `;
    });

    return matchesHTML;
}

function renderTopPlayersOfTeam(team) {
    if (!team) {
        console.log('team that was not found: ', team);
    }

    const display = document.querySelector('.top-players-box');
    display.innerHTML = ''; // Clear previous content
    const players = calculatePlayerRatings()
        .filter(player => player.team === team.id)
        .slice(0, 6);

    players.forEach(player => {
        const playerDiv = document.createElement('div');

        let conditionalClass = '';
        if (player.rating >= 9.0) {
            conditionalClass = 'rank-9-10';
        } else if (player.rating >= 6.7) {
            conditionalClass = 'rank-7-8';
        } else if (player.rating >= 5.0) {
            conditionalClass = 'rank-5-6';
        } else if (player.rating >= 3.0) {
            conditionalClass = 'rank-3-4';
        } else {
            conditionalClass = 'rank-1-2';
        }
        playerDiv.className = 'player-rating';
        playerDiv.className += ` ${conditionalClass}`;

        let HasNumA4 = false;
        let HasNumG4 = false;

        if (player.assists <= 4) {
            HasNumA4 = true;
        }

        if (player.goals <= 4) {
            HasNumG4 = true;
        }

        // Generate assist SVGs
        const assistSvgs = player.assists > 0 && player.assists <= 4 ? 
            Array.from({length: player.assists}, () => `
                <svg class="svg-assits" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14">
                    <ellipse cx="7" cy="7" rx="7" ry="7" fill="transparent"></ellipse>
                    <g id="ic_assist" transform="translate(0 0)">
                        <path id="Path_88" fill="var(--MFFullscreenColorScheme-eventIconColor)" fill-rule="evenodd" d="M12.608 5.7c-.175.1-.377.209-.6.337-.156.09-.322.188-.493.3-.806.524-6.651 4.113-7.836 4.793s-3.035.929-3.565.016 1.029-1.952 1.948-3.055C3.11 6.833 4.48 5.461 4.48 5.461c-.088-.426.332-.712.494-.805a.607.607 0 0 1 .06-.03c-.117-.5.631-.929.631-.929l1.147-2.518a.231.231 0 0 1 .094-.105.236.236 0 0 1 .208-.013l1.024.424c.673.283-.769 1.89-.465 1.962a1.67 1.67 0 0 0 1.043-.273 2.826 2.826 0 0 0 .735-.614c.48-.56-.03-1.38.249-1.543.1-.054.287-.034.642.095 1.393.535 2.192 2.211 2.776 3.254.402.709.121.973-.51 1.334zm-8.018.693a.085.085 0 0 0-.075.022l-.631.62a.079.079 0 0 0 .04.135l3.227.669a.09.09 0 0 0 .058-.009l.981-.563a.081.081 0 0 0-.02-.15zm5.558-.418l-4.407-.844a.089.089 0 0 0-.075.023l-.628.618a.081.081 0 0 0 .041.137l3.99.807a.089.089 0 0 0 .058-.009l1.041-.581a.082.082 0 0 0-.02-.151zM3.807 12.1a.083.083 0 0 1-.039.1l-.734.422a.082.082 0 0 1-.1-.016l-.546-.579a.083.083 0 0 1-.016-.063 5.312 5.312 0 0 0 1.3-.462zm1.668-.92a.083.083 0 0 1-.039.1l-.736.42a.082.082 0 0 1-.1-.016l-.41-.484c.3-.177.693-.415 1.15-.691zm5.687-3.4a.084.084 0 0 1-.039.1l-.735.422a.082.082 0 0 1-.1-.016l-.488-.5c.441-.27.839-.516 1.158-.716zM12.5 6.132c.1-.052.184-.1.268-.154L12.9 5.9l.222.754a.084.084 0 0 1-.039.1l-.734.422a.082.082 0 0 1-.1-.016L11.7 6.6c.144-.093.294-.182.466-.281.118-.068.224-.129.334-.187z"></path>
                    </g>
                </svg>
            `).join('') : '';

        // Generate goal SVGs
        const goalSvgs = player.goals > 0 && player.goals <= 4 ? 
            Array.from({length: player.goals}, () => `
                <svg class="svg-goals" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clip-path="url(#clip0_1030_9128)">
                        <circle cx="7" cy="7" r="5.25" fill="transparent"></circle>
                        <path d="M8.88284 9.49699C8.72009 9.49699 8.55734 9.48591 8.39459 9.46958C8.34242 9.4595 8.29347 9.43694 8.25192 9.40382C8.21037 9.3707 8.17746 9.32802 8.156 9.27941C7.988 8.65524 7.82525 8.06374 7.66775 7.48858C7.6388 7.41343 7.63706 7.33052 7.66285 7.25423C7.68863 7.17794 7.74031 7.11308 7.80892 7.07091L9.17625 5.84591C9.2334 5.7961 9.30665 5.76865 9.38246 5.76865C9.45827 5.76865 9.53152 5.7961 9.58867 5.84591C10.0474 6.09633 10.4588 6.42503 10.8043 6.81716C10.8827 6.91412 10.9266 7.03436 10.9292 7.15899C10.932 7.84171 10.7287 8.50937 10.3458 9.07466C10.342 9.09048 10.3346 9.10523 10.3243 9.11782C10.253 9.2147 10.1577 9.29131 10.0478 9.34008C9.67045 9.44934 9.27911 9.50241 8.88634 9.49758L8.88284 9.49699Z" fill="var(--GlobalColorScheme-Text-textDefault)"></path>
                        <path d="M4.46584 8.17283C4.40038 8.17345 4.33693 8.15023 4.28734 8.10749C3.85925 7.84832 3.48656 7.50715 3.19067 7.10358C3.14231 7.03529 3.11586 6.95391 3.11484 6.87024C3.11458 6.23357 3.28305 5.60821 3.60309 5.05783C3.60723 5.03788 3.61894 5.02032 3.63575 5.00883C3.68407 4.96581 3.74151 4.93429 3.80375 4.91666C4.17914 4.77018 4.57855 4.69501 4.9815 4.69499C5.1061 4.68414 5.23141 4.68414 5.356 4.69499C5.42674 4.70258 5.49274 4.73415 5.54304 4.78445C5.59335 4.83475 5.62492 4.90076 5.6325 4.97149C5.72992 5.39499 5.83842 5.82899 5.94167 6.26299L6.02334 6.61299C6.03691 6.666 6.036 6.72167 6.02071 6.77421C6.00542 6.82674 5.97631 6.87421 5.93642 6.91166L4.67234 8.09699C4.64603 8.1233 4.61472 8.14409 4.58026 8.15811C4.5458 8.17214 4.50888 8.17912 4.47167 8.17866H4.46584V8.17283Z" fill="var(--GlobalColorScheme-Text-textDefault)"></path>
                        <path d="M6.99984 1.16699C5.84612 1.16699 4.7183 1.50911 3.75901 2.15009C2.79973 2.79106 2.05205 3.7021 1.61054 4.76801C1.16903 5.83391 1.05351 7.0068 1.27859 8.13835C1.50367 9.26991 2.05924 10.3093 2.87505 11.1251C3.69086 11.9409 4.73026 12.4965 5.86181 12.7216C6.99337 12.9467 8.16626 12.8311 9.23216 12.3896C10.2981 11.9481 11.2091 11.2004 11.8501 10.2412C12.4911 9.28186 12.8332 8.15405 12.8332 7.00033C12.8332 5.45323 12.2186 3.9695 11.1246 2.87554C10.0307 1.78157 8.54694 1.16699 6.99984 1.16699ZM7.07042 11.3304L7.03776 11.2137C7.02663 11.134 6.98701 11.0609 6.92622 11.008C6.86543 10.9552 6.78757 10.9261 6.70701 10.9262C6.03797 10.915 5.38769 10.7032 4.84034 10.3183C4.78464 10.2907 4.72343 10.2759 4.66126 10.2752C4.62301 10.2718 4.58447 10.2763 4.54804 10.2884C4.51162 10.3006 4.47808 10.3201 4.44951 10.3457L4.05342 10.7202C3.29755 10.1246 2.74097 9.31297 2.45775 8.39325C2.17453 7.47354 2.1781 6.48938 2.46798 5.57174C2.75785 4.6541 3.3203 3.84649 4.08047 3.25638C4.84063 2.66626 5.76248 2.32163 6.72334 2.26833L6.78167 2.47424C6.82056 2.58819 6.85303 2.70213 6.87909 2.81608C6.89714 2.869 6.92709 2.91708 6.96663 2.95662C7.00617 2.99616 7.05425 3.02611 7.10717 3.04416H7.15617C7.80616 3.14238 8.43738 3.33908 9.02809 3.62749C9.06957 3.65019 9.11697 3.65975 9.16401 3.65491C9.22873 3.65539 9.2924 3.63847 9.34834 3.60591L9.88034 3.23141C10.6579 3.82155 11.2341 4.63761 11.53 5.56787C11.826 6.49813 11.8271 7.49711 11.5333 8.42804C11.2396 9.35898 10.6652 10.1764 9.88898 10.7683C9.11273 11.3602 8.17249 11.6977 7.19701 11.7347L7.07042 11.3304Z" fill="var(--GlobalColorScheme-Text-textDefault)"></path>
                    </g>
                    <defs>
                        <clipPath id="clip0_1030_9128">
                            <rect width="14" height="14" fill="white"></rect>
                        </clipPath>
                    </defs>
                </svg>
            `).join('') : '';



        playerDiv.innerHTML = `
            <span class="name">${player.name}</span>
            <span class="rating">${player.rating}</span>
            ${player.assists > 0 ? `
            <div class="assists">
                ${assistSvgs}
                <span class="number ${HasNumA4 ? 'dn' : ''}">${player.assists}</span>
            </div>` : ''}
            ${player.goals > 0 ? `
            <div class="goals">
                ${goalSvgs}
                <span class="number ${HasNumG4 ? 'dn' : ''}">${player.goals}</span>
            </div>` : ''}
            <img src="images/icons/noise.png" alt="grain">
        `;
        display.appendChild(playerDiv);
    });
}

renderTopPlayersOfTeam(team);

export function calculatePlayerRatings() {
    const playerStats = {};

// Collect all player stats from all seasons
    seasons.forEach(season => {
        if (!season.matchdays) return;
        
        season.matchdays.forEach(matchday => {
            if (!matchday.games) return;
            
            matchday.games.forEach(game => {
                // Count POTM awards
                if (game.potm && game.potm !== 'none') {
                    if (!playerStats[game.potm]) {
                        playerStats[game.potm] = { goals: 0, assists: 0, potm: 0, appearances: 0 };
                    }
                    playerStats[game.potm].potm++;
                    playerStats[game.potm].appearances = (playerStats[game.potm].appearances || 0) + 1;
                }
                
                // Count goals and assists
                if (game.goals && Array.isArray(game.goals)) {
                    game.goals.forEach(goal => {
                        // Count goal
                        if (!playerStats[goal.player]) {
                            playerStats[goal.player] = { goals: 0, assists: 0, potm: 0, appearances: 0 };
                        }
                        playerStats[goal.player].goals++;
                        playerStats[goal.player].appearances = (playerStats[goal.player].appearances || 0) + 1;
                        
                        // Count assist
                        if (goal.assist && goal.assist !== 'none') {
                            if (!playerStats[goal.assist]) {
                                playerStats[goal.assist] = { goals: 0, assists: 0, potm: 0, appearances: 0 };
                            }
                            playerStats[goal.assist].assists++;
                            playerStats[goal.assist].appearances = (playerStats[goal.assist].appearances || 0) + 1;
                        }
                    });
                }
                
                // Add appearances for players from team1 and team2
                const team1 = getTeamById(game.team1);
                const team2 = getTeamById(game.team2);
                
                [team1, team2].forEach(team => {
                    if (team && team.player) {
                        team.player.forEach(playerName => {
                            if (!playerStats[playerName]) {
                                playerStats[playerName] = { goals: 0, assists: 0, potm: 0, appearances: 0 };
                            }
                            playerStats[playerName].appearances = (playerStats[playerName].appearances || 0) + 1;
                        });
                    }
                });
            });
        });
    });
    
    // Convert to array and calculate ratings
    const players = Object.entries(playerStats).map(([name, stats]) => {
        const maxGoals = Math.max(...Object.values(playerStats).map(p => p.goals), 1);
        const maxAssists = Math.max(...Object.values(playerStats).map(p => p.assists), 1);
        const maxPOTM = Math.max(...Object.values(playerStats).map(p => p.potm), 1);
        
        // Base rating starts at 5.0
        let rating = 5.0;
        
        // Add contributions with diminishing returns
        const goalsRatio = stats.goals / maxGoals;
        const assistsRatio = stats.assists / maxAssists;
        const potmRatio = stats.potm / maxPOTM;
        
        // Apply non-linear scaling (square root) to make it harder to reach higher values
        const goalsScore = Math.sqrt(goalsRatio) * 1.8;  // Reduced from 2.0
        const assistsScore = Math.sqrt(assistsRatio) * 1.3;  // Reduced from 1.5
        const potmScore = Math.sqrt(potmRatio) * 2.0;  // Reduced from 2.5
        
        rating += goalsScore + assistsScore + potmScore;
        
        // Bonus for overall contribution with diminishing returns
        const totalContributions = stats.goals + stats.assists + stats.potm;
        if (totalContributions > 0) {
            // Lower bonus and apply diminishing returns
            rating += Math.log10(1 + totalContributions / 8) * 0.8;
        }
        
        // Apply a sigmoid-like function to make 10 harder to reach
        if (rating > 8.5) {
            // Compress ratings between 8.5 and 10
            const excess = rating - 8.5;
            rating = 8.5 + (excess * 0.6);
        }
        
        // Minimum rating is 1.0
        rating = Math.max(1.0, rating);
        
        // Cap rating at 10
        rating = Math.min(10, rating);
        
        // Round to one decimal place
        rating = Math.round(rating * 10) / 10;
        
        return {
            name,
            goals: stats.goals,
            assists: stats.assists,
            potm: stats.potm,
            appearances: stats.appearances,
            rating,
            team: getTeamByplayer(name)
        };
    }).sort((a, b) => b.rating - a.rating);
    
    return players;
}

// To test it, just call:
console.log(calculatePlayerRatings());


