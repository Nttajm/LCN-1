import { getCurrentSeason, getTeamById, } from './acl-index.js';
import { seasons } from './acl-index.js';

// Get last N matches for a team's form
function getTeamForm(teamId, currentMatchId, limit = 5) {
    const form = [];
    const allMatches = [];
    
    // Collect all matches for this team across all seasons
    for (const seasonData of seasons) {
        const matchdays = seasonData.matchdays || [];
        for (const md of matchdays) {
            const games = md.games || [];
            for (const game of games) {
                if ((game.team1 === teamId || game.team2 === teamId) && game.id !== currentMatchId) {
                    allMatches.push(game);
                }
            }
        }
    }
    
    // Take last N matches and determine W/L/D
    const recentMatches = allMatches.slice(-limit);
    for (const game of recentMatches) {
        const isTeam1 = game.team1 === teamId;
        const teamScore = isTeam1 ? game.score1 : game.score2;
        const oppScore = isTeam1 ? game.score2 : game.score1;
        
        if (teamScore > oppScore) {
            form.push('W');
        } else if (teamScore < oppScore) {
            form.push('L');
        } else {
            form.push('D');
        }
    }
    
    return form;
}

// Calculate head-to-head stats between two teams
function getHeadToHead(team1Id, team2Id) {
    let team1Wins = 0;
    let team2Wins = 0;
    let draws = 0;
    let team1Goals = 0;
    let team2Goals = 0;
    
    for (const seasonData of seasons) {
        const matchdays = seasonData.matchdays || [];
        for (const md of matchdays) {
            const games = md.games || [];
            for (const game of games) {
                const isMatch = (game.team1 === team1Id && game.team2 === team2Id) ||
                               (game.team1 === team2Id && game.team2 === team1Id);
                if (isMatch) {
                    const t1Score = game.team1 === team1Id ? game.score1 : game.score2;
                    const t2Score = game.team1 === team1Id ? game.score2 : game.score1;
                    
                    team1Goals += t1Score;
                    team2Goals += t2Score;
                    
                    if (t1Score > t2Score) team1Wins++;
                    else if (t2Score > t1Score) team2Wins++;
                    else draws++;
                }
            }
        }
    }
    
    return { team1Wins, team2Wins, draws, team1Goals, team2Goals };
}

function displayMatchInfo() {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('match');
    const content = document.querySelector('.content-match-info');
    content.innerHTML = '';
    if (!matchId) return;

    let match = null;
    let matchSeasonData = null;
    let matchday = null; 
    let mdIndex = null;

    for (const seasonData of seasons) {
        const matchdays = seasonData.matchdays || [];
        const foundMatch = matchdays
            .map(matchday => matchday.games || [])
            .flat()
            .find(game => game.id === matchId);
        matchday = matchdays.find(matchday => matchday.games && matchday.games.some(game => game.id === matchId));
        mdIndex = matchdays.findIndex(md => md.games && md.games.some(game => game.id === matchId));
        if (foundMatch) {
            match = foundMatch;
            matchSeasonData = seasonData;
            break;
        }
    }

    if (!match) return;

    const team1 = getTeamById(match.team1);
    const team2 = getTeamById(match.team2);

    const groupGoalsByPlayer = (goals, teamId) => {
        const playerGoals = {};
        
        goals.filter(goal => goal.team === teamId)
            .forEach(goal => {
                if (!playerGoals[goal.player]) {
                    playerGoals[goal.player] = [];
                }
                const label = goal.minute != null ? `${goal.minute}'${goal.type === 'penalty' ? ' (p)' : ''}` : 'N/A';
                playerGoals[goal.player].push(label);
            });
        
        return Object.entries(playerGoals)
            .map(([player, minutes]) => {
                const formattedMinutes = minutes
                    .map(m => `<span class="minute-item">${m}</span>`)
                    .join(' ');
                return `<div class="score-group"><span class="player">${player}</span><span class="minute">${formattedMinutes}</span></div>`;
            })
            .join('');
    };

    const groupCardsByPlayer = (cards, teamId, type) => {
        if (!cards || !cards.length) return '';
        return cards
            .filter(c => c.team === teamId)
            .sort((a, b) => a.minute - b.minute)
            .map(c => `<div class="card-tile card-tile--${type}">
                <span class="card-tile-icon"></span>
                <span class="card-tile-name">${c.player}</span>
                <span class="card-tile-min">${c.minute}'</span>
            </div>`)
            .join('');
    };

    const renderCardsSection = (match) => {
        const yellows1 = groupCardsByPlayer(match.yellowCards, match.team1, 'yellow');
        const yellows2 = groupCardsByPlayer(match.yellowCards, match.team2, 'yellow');
        const reds1 = groupCardsByPlayer(match.redCards, match.team1, 'red');
        const reds2 = groupCardsByPlayer(match.redCards, match.team2, 'red');

        const hasCards = yellows1 || yellows2 || reds1 || reds2;
        if (!hasCards) return '';

        return `
            <div class="cards-section">
                <div class="cards-col cards-col--left">
                    ${yellows1}${reds1}
                </div>
                <div class="cards-col cards-col--right">
                    ${yellows2}${reds2}
                </div>
            </div>`;
    };

    const getTopScorer = (goals, teamId) => {
        const playerGoals = {};
        goals.filter(g => g.team === teamId).forEach(g => {
            playerGoals[g.player] = (playerGoals[g.player] || 0) + 1;
        });
        const entries = Object.entries(playerGoals);
        if (entries.length === 0) return null;
        entries.sort((a, b) => b[1] - a[1]);
        return { player: entries[0][0], goals: entries[0][1] };
    };

    // Get all players with hat-tricks (3+ goals)
    const getHatTricks = (goals) => {
        const playerGoals = {};
        goals.forEach(g => {
            const key = `${g.player}-${g.team}`;
            if (!playerGoals[key]) {
                playerGoals[key] = { player: g.player, team: g.team, goals: 0 };
            }
            playerGoals[key].goals++;
        });
        return Object.values(playerGoals).filter(p => p.goals >= 3);
    };

    // Generate contextual articles based on match scenarios
    const generateArticles = () => {
        const articles = [];
        const hatTricks = getHatTricks(match.goals);
        const isHighScoring = match.score1 + match.score2 >= 5;
        const isCloseGame = Math.abs(match.score1 - match.score2) <= 1;
        const isBlowout = Math.abs(match.score1 - match.score2) >= 4;

        // Always add podcast article
        articles.push({
            type: 'podcast',
            title: `${team1.name} vs ${team2.name}`,
            subtitle: 'MATCH REPORT',
            tag: 'ACL Podcast',
            link: '#',
            large: true
        });

        // Add hat-trick articles
        hatTricks.forEach(ht => {
            const htTeam = getTeamById(ht.team);
            articles.push({
                type: 'hattrick',
                player: ht.player,
                team: htTeam,
                goals: ht.goals,
                tag: 'Hat-trick Hero',
                link: '#'
            });
        });

        // Add Team of the Week article
        articles.push({
            type: 'totw',
            tag: 'Team of the Week',
            link: '#'
        });

        // Add match report article
        articles.push({
            type: 'report',
            team1: team1,
            team2: team2,
            score1: match.score1,
            score2: match.score2,
            tag: 'Match Report',
            title: isBlowout 
                ? `${match.score1 > match.score2 ? team1.name : team2.name} dominates in crushing victory`
                : isHighScoring 
                    ? `Goals galore as ${team1.name} and ${team2.name} produce thriller`
                    : isCloseGame 
                        ? `Tight contest between ${team1.name} and ${team2.name}`
                        : `Full match report: ${team1.name} vs ${team2.name}`,
            link: '#'
        });

        return articles;
    };

    const renderArticleCard = (article) => {
        switch (article.type) {
            case 'podcast':
                return `
                    <div class="article-card article-card--podcast ${article.large ? 'article-card--large' : ''}">
                        <div class="article-card-image">
                            <div class="podcast-content">
                                <div class="podcast-badge">
                                    <img src="images/leagues/acl.png" alt="ACL">
                                    <span class="podcast-label">ACL Podcast</span>
                                </div>
                                <div class="podcast-title">THE OFFICIAL <span>ACL</span></div>
                                <div class="podcast-subtitle">PODCAST</div>
                                <div class="listen-btn">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z"/>
                                    </svg>
                                    Listen Now
                                </div>
                            </div>
                            <img class="podcast-stars" src="graphics/acl-stars.png" alt="">
                        </div>
                        <div class="article-card-body">
                            <span class="article-card-tag article-card-tag--podcast">${article.tag}</span>
                            <a href="${article.link}" class="article-card-link">
                                ${article.title} - ${article.subtitle} | Listen on the ACL Podcast
                            </a>
                            <div class="article-card-meta">Matchday ${mdIndex + 1} • ${matchSeasonData.year} Season</div>
                        </div>
                    </div>`;
            
            case 'hattrick':
                return `
                    <div class="article-card article-card--hattrick">
                        <div class="article-card-image">
                            <div class="hattrick-content">
                                <div class="hattrick-balls">
                                    <div class="hattrick-ball"></div>
                                    <div class="hattrick-ball"></div>
                                    <div class="hattrick-ball"></div>
                                </div>
                                <div class="hattrick-player">${article.player}</div>
                                <div class="hattrick-label">Hat-trick Hero</div>
                                <div class="hattrick-team">
                                    <img src="${article.team.img}" alt="${article.team.name}">
                                    <span>${article.team.name}</span>
                                </div>
                            </div>
                        </div>
                        <div class="article-card-body">
                            <span class="article-card-tag article-card-tag--hattrick">${article.tag}</span>
                            <a href="${article.link}" class="article-card-link">
                                ${article.player} scores ${article.goals} goals as ${article.team.name} ${match.score1 > match.score2 ? (article.team.id === match.team1 ? 'wins' : 'loses') : (article.team.id === match.team2 ? 'wins' : 'loses')}
                            </a>
                            <div class="article-card-meta">${article.goals} Goals • Player Spotlight</div>
                        </div>
                    </div>`;
            
            case 'totw':
                return `
                    <div class="article-card article-card--totw">
                        <div class="article-card-image">
                            <div class="totw-content">
                                <div class="totw-badge">
                                    <img src="images/leagues/acl.png" alt="ACL">
                                </div>
                                <div class="totw-text">TEAM OF THE WEEK</div>
                            </div>
                            <div class="totw-swoosh"></div>
                        </div>
                        <div class="article-card-body">
                            <span class="article-card-tag article-card-tag--totw">${article.tag}</span>
                            <a href="${article.link}" class="article-card-link">
                                Matchday ${mdIndex + 1} Team of the Week revealed
                            </a>
                            <div class="article-card-meta">ACL ${matchSeasonData.year} • Best XI</div>
                        </div>
                    </div>`;
            
            case 'report':
                return `
                    <div class="article-card article-card--report">
                        <div class="article-card-image">
                            <div class="report-content">
                                <div class="report-team">
                                    <img src="${article.team1.img}" alt="${article.team1.name}">
                                    <span>${article.team1.name}</span>
                                </div>
                                <div class="report-score">
                                    ${article.score1}<span class="report-vs">-</span>${article.score2}
                                </div>
                                <div class="report-team">
                                    <img src="${article.team2.img}" alt="${article.team2.name}">
                                    <span>${article.team2.name}</span>
                                </div>
                            </div>
                        </div>
                        <div class="article-card-body">
                            <span class="article-card-tag article-card-tag--report">${article.tag}</span>
                            <a href="${article.link}" class="article-card-link">${article.title}</a>
                            <div class="article-card-meta">Full Report • Matchday ${mdIndex + 1}</div>
                        </div>
                    </div>`;
            
            default:
                return '';
        }
    };

    const winnerTeamId = match.score1 > match.score2 ? match.team1 : match.score2 > match.score1 ? match.team2 : null;
    const topScorer = winnerTeamId ? getTopScorer(match.goals, winnerTeamId) : getTopScorer(match.goals, match.team1);
    const potmTeam = winnerTeamId ? getTeamById(winnerTeamId) : team1;

    const renderPotmCard = () => {
        if (!topScorer) return '';
        return `
            <div class="potm-card">
                <div class="potm-header">Player of the Match</div>
                <div class="potm-player">
                    <div class="potm-avatar">
                        <img src="${potmTeam.img}" alt="${topScorer.player}">
                    </div>
                    <div class="potm-name">${topScorer.player}</div>
                    <div class="potm-team">${potmTeam.name}</div>
                </div>
                <div class="potm-stats">
                    <div class="potm-stat">
                        <span class="potm-stat-label">Minutes played</span>
                        <span class="potm-stat-value">90'</span>
                    </div>
                    <div class="potm-stat">
                        <span class="potm-stat-label">Goals</span>
                        <span class="potm-stat-value">${topScorer.goals}</span>
                    </div>
                    <div class="potm-stat">
                        <span class="potm-stat-label">Total attempts</span>
                        <span class="potm-stat-value">${Math.floor(Math.random() * 5) + topScorer.goals}</span>
                    </div>
                    <div class="potm-stat">
                        <span class="potm-stat-label">Assists</span>
                        <span class="potm-stat-value">0</span>
                    </div>
                </div>
            </div>`;
    };

    const matchInfoHtml = `
        <div class="match-info">
            <div class="match-info-context">
                <div class="info-text">
                    <span>${matchday.details || 'MATCHDAY'} - ${'Matchday ' + (mdIndex + 1 + ',') || ''}</span>
                    <span>${matchSeasonData.year} Season </span>
                </div>
                <div class="team-score">
                    <a href="team-info.html?team=${team1.id}" class="team1 cur">
                        <img src="${team1.img}" alt="${team1.name}">
                        <span>${team1.name}</span>
                    </a>
                    <div class="final-score">
                        ${match.score1}-${match.score2}
                    </div>
                    <a href="team-info.html?team=${team2.id}" class="team2 cur">
                        <img src="${team2.img}" alt="${team2.name}">
                        <span>${team2.name}</span>
                    </a>
                </div>
                <div class="player-goals">
                    <div class="team1">
                        ${groupGoalsByPlayer(match.goals, match.team1)}
                    </div>
                    <div class="team2">
                        ${groupGoalsByPlayer(match.goals, match.team2)}
                    </div>
                </div>
                ${renderCardsSection(match)}
            </div>
        </div>
        <div class="match-tabs">
            <button class="match-tab match-tab--active" data-tab="overview">Overview</button>
            <button class="match-tab" data-tab="stats">Stats</button>
        </div>
    `;

    content.innerHTML = matchInfoHtml;

    // Generate dynamic articles based on match scenarios
    const articles = generateArticles();

    const contentSection = document.createElement('div');
    contentSection.className = 'match-content-section';
    contentSection.innerHTML = `
        <div class="match-content-grid">
            <div class="match-content-main">
                <div class="articles-grid">
                    ${articles.map(article => renderArticleCard(article)).join('')}
                </div>
            </div>
            <div class="match-content-sidebar">
                ${renderPotmCard()}
                <div class="team-info-card">
                    <div class="team-info-header">Team information</div>
                    <div class="form-guide">
                        <div class="form-guide-title">Form guide</div>
                        <div class="form-guide-teams">
                            <div class="form-team">
                                <div class="form-team-badge">
                                    <img src="${team1.img}" alt="${team1.name}">
                                </div>
                                <span class="form-team-name">${team1.name}</span>
                            </div>
                            <div class="form-team form-team--right">
                                <span class="form-team-name">${team2.name}</span>
                                <div class="form-team-badge">
                                    <img src="${team2.img}" alt="${team2.name}">
                                </div>
                            </div>
                        </div>
                        <div class="form-results">
                            <div class="form-result-row">
                                <div class="form-badges form-badges--left">
                                    ${getTeamForm(match.team1, matchId).map(r => 
                                        `<span class="form-badge form-badge--${r === 'W' ? 'win' : r === 'L' ? 'loss' : 'draw'}">${r}</span>`
                                    ).join('')}
                                </div>
                                <div class="form-badges form-badges--right">
                                    ${getTeamForm(match.team2, matchId).map(r => 
                                        `<span class="form-badge form-badge--${r === 'W' ? 'win' : r === 'L' ? 'loss' : 'draw'}">${r}</span>`
                                    ).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="h2h-section">
                        <div class="h2h-title">Head-to-head</div>
                        <div class="h2h-teams">
                            <div class="h2h-team">
                                <div class="h2h-badge">
                                    <img src="${team1.img}" alt="${team1.name}">
                                </div>
                                <span class="h2h-name">${team1.name}</span>
                            </div>
                            <div class="h2h-team h2h-team--right">
                                <span class="h2h-name">${team2.name}</span>
                                <div class="h2h-badge">
                                    <img src="${team2.img}" alt="${team2.name}">
                                </div>
                            </div>
                        </div>
                        <div class="h2h-stats">
                            ${(() => {
                                const h2h = getHeadToHead(match.team1, match.team2);
                                return `
                                    <div class="h2h-stat-row">
                                        <span class="h2h-value">${h2h.team1Wins}</span>
                                        <span class="h2h-label">Wins</span>
                                        <span class="h2h-value">${h2h.draws}</span>
                                        <span class="h2h-label">Draws</span>
                                        <span class="h2h-value">${h2h.team2Wins}</span>
                                        <span class="h2h-label">Losses</span>
                                    </div>
                                    <div class="h2h-stat-row h2h-stat-row--goals">
                                        <span class="h2h-value h2h-value--large">${h2h.team1Goals}</span>
                                        <span class="h2h-label">Goals</span>
                                        <span class="h2h-value h2h-value--large">${h2h.team2Goals}</span>
                                    </div>
                                `;
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    content.after(contentSection);

    // Create stats section
    const statsSection = document.createElement('div');
    statsSection.className = 'match-content-section stats-section';
    statsSection.innerHTML = renderStatsSection(match, team1, team2);
    contentSection.after(statsSection);

    const tabs = document.querySelectorAll('.match-tab');
    const overviewSection = contentSection;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('match-tab--active'));
            tab.classList.add('match-tab--active');
            
            const tabName = tab.getAttribute('data-tab');
            if (tabName === 'stats') {
                overviewSection.classList.add('hidden');
                overviewSection.style.display = 'none';
                statsSection.classList.add('active');
                statsSection.style.display = 'block';
            } else {
                overviewSection.classList.remove('hidden');
                overviewSection.style.display = 'block';
                statsSection.classList.remove('active');
                statsSection.style.display = 'none';
            }
        });
    });

    // Toggle key stats collapse
    const toggleBtn = statsSection.querySelector('.key-stats-toggle');
    const statsList = statsSection.querySelector('.key-stats-list');
    if (toggleBtn && statsList) {
        toggleBtn.addEventListener('click', () => {
            toggleBtn.classList.toggle('collapsed');
            statsList.style.display = statsList.style.display === 'none' ? 'flex' : 'none';
        });
    }
}

function renderStatsSection(match, team1, team2) {
    const stats = match.stats || {};
    
    // Get saved stats or generate defaults
    const possession1 = stats.possession?.team1 ?? 50;
    const possession2 = stats.possession?.team2 ?? 50;
    const passAccuracy1 = stats.passAccuracy?.team1 ?? 85;
    const passAccuracy2 = stats.passAccuracy?.team2 ?? 85;
    const corners1 = stats.corners?.team1 ?? 0;
    const corners2 = stats.corners?.team2 ?? 0;
    const offsides1 = stats.offsides?.team1 ?? 0;
    const offsides2 = stats.offsides?.team2 ?? 0;
    const shotsOnTarget1 = stats.shotsOnTarget?.team1 ?? match.score1;
    const shotsOnTarget2 = stats.shotsOnTarget?.team2 ?? match.score2;
    
    // Generate additional stats based on saved data or defaults
    const seed = match.seed || Math.floor(Math.random() * 10000);
    const seededRandom = (min, max, offset = 0) => {
        const x = Math.sin(seed + offset) * 10000;
        return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
    };
    
    const totalAttempts1 = Math.max(shotsOnTarget1 + seededRandom(5, 12, 1), match.score1 + 2);
    const totalAttempts2 = Math.max(shotsOnTarget2 + seededRandom(5, 12, 2), match.score2 + 2);
    const attacks1 = seededRandom(45, 65, 3);
    const attacks2 = seededRandom(45, 65, 4);
    const passesCompleted1 = Math.round((passAccuracy1 / 100) * seededRandom(420, 500, 5));
    const passesCompleted2 = Math.round((passAccuracy2 / 100) * seededRandom(420, 500, 6));
    const passesAttempted1 = Math.round(passesCompleted1 / (passAccuracy1 / 100));
    const passesAttempted2 = Math.round(passesCompleted2 / (passAccuracy2 / 100));
    const ballsRecovered1 = seededRandom(25, 35, 7);
    const ballsRecovered2 = seededRandom(25, 35, 8);
    const saves1 = Math.max(shotsOnTarget2 - match.score2, seededRandom(3, 8, 9));
    const saves2 = Math.max(shotsOnTarget1 - match.score1, seededRandom(3, 8, 10));
    const distance1 = (seededRandom(98, 115, 11) + seededRandom(0, 9, 12) / 10).toFixed(1);
    const distance2 = (seededRandom(98, 115, 13) + seededRandom(0, 9, 14) / 10).toFixed(1);
    
    // Count cards from match data
    const yellowCards1 = (match.yellowCards || []).filter(c => c.team === match.team1).length;
    const yellowCards2 = (match.yellowCards || []).filter(c => c.team === match.team2).length;
    const redCards1 = (match.redCards || []).filter(c => c.team === match.team1).length;
    const redCards2 = (match.redCards || []).filter(c => c.team === match.team2).length;

    const renderStatRow = (value1, label, value2, isCircular = false) => {
        const max = Math.max(value1, value2, 1);
        const percent1 = (value1 / max) * 100;
        const percent2 = (value2 / max) * 100;
        
        if (isCircular) {
            return `
                <div class="stat-row stat-row--circular">
                    <div class="stat-value stat-value--left">
                        <div class="stat-circle stat-circle--team1" style="--progress: ${value1}">
                            <span>${value1}</span>
                        </div>
                    </div>
                    <div class="stat-bar-container">
                        <div class="stat-bar stat-bar--left" style="width: ${percent1}%"></div>
                    </div>
                    <div class="stat-label">${label}</div>
                    <div class="stat-bar-container">
                        <div class="stat-bar stat-bar--right" style="width: ${percent2}%"></div>
                    </div>
                    <div class="stat-value stat-value--right">
                        <div class="stat-circle stat-circle--team2" style="--progress: ${value2}">
                            <span>${value2}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="stat-row">
                <div class="stat-value stat-value--left">${value1}</div>
                <div class="stat-bar-container">
                    <div class="stat-bar stat-bar--left" style="width: ${percent1}%"></div>
                </div>
                <div class="stat-label">${label}</div>
                <div class="stat-bar-container">
                    <div class="stat-bar stat-bar--right" style="width: ${percent2}%"></div>
                </div>
                <div class="stat-value stat-value--right">${value2}</div>
            </div>
        `;
    };

    return `
        <div class="match-content-grid">
            <div class="match-content-main">
                <div class="key-stats-card">
                    <div class="key-stats-header">
                        <h2 class="key-stats-title">Key stats</h2>
                        <button class="key-stats-toggle" aria-label="Toggle stats">∧</button>
                    </div>
                    <div class="key-stats-list">
                        ${renderStatRow(possession1, 'Possession (%)', possession2, true)}
                        ${renderStatRow(totalAttempts1, 'Total attempts', totalAttempts2)}
                        ${renderStatRow(attacks1, 'Attacks', attacks2)}
                        ${renderStatRow(corners1, 'Corners taken', corners2)}
                        ${renderStatRow(passAccuracy1, 'Passing accuracy (%)', passAccuracy2, true)}
                        ${renderStatRow(passesCompleted1, 'Passes completed', passesCompleted2)}
                        ${renderStatRow(passesAttempted1, 'Passes attempted', passesAttempted2)}
                        ${renderStatRow(ballsRecovered1, 'Balls recovered', ballsRecovered2)}
                        ${renderStatRow(offsides1, 'Offsides', offsides2)}
                        ${renderStatRow(saves1, 'Saves', saves2)}
                        ${renderStatRow(distance1, 'Distance covered (km)', distance2)}
                        ${renderStatRow(yellowCards1, 'Yellow cards', yellowCards2)}
                        ${renderStatRow(redCards1, 'Red cards', redCards2)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', displayMatchInfo);