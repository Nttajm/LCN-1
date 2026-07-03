import { seasons, getTeamById } from './acl-index.js';
import { players } from './players.js';
import { rankPlayers } from './ratings.js';

// ─── Articles data (for final headlines/images) ──────────────────────────────
let articlesData = [];

async function loadArticles() {
    try {
        const res = await fetch('articles.json');
        if (res.ok) {
            articlesData = await res.json();
        }
    } catch (e) {
        console.warn('Could not load articles:', e);
    }
}

function getFinalArticle(year) {
    return articlesData.find(a => 
        a.season === year && 
        (a.tags?.includes('final') || a.matchdayIndex === 13)
    ) || null;
}

// ─── Season Index ────────────────────────────────────────────────────────────
// Build a sorted list of available season years (newest first)
function getSeasonYears() {
    return seasons
        .map(s => s.year)
        .sort((a, b) => parseInt(b) - parseInt(a));
}

function getLatestSeasonIndex() {
    return 0; // years sorted newest-first
}

// ─── Player lookup helpers ───────────────────────────────────────────────────
function getPlayerClubs(playerName) {
    const p = players.find(pl => pl && pl.name === playerName);
    if (!p || !p.teams) return [];
    return Object.keys(p.teams);
}

function getPlayerDob(playerName) {
    const p = players.find(pl => pl && pl.name === playerName);
    return p ? p.dob : null;
}

function getAgeInYear(dob, seasonYear) {
    if (!dob) return null;
    const birth = new Date(dob);
    const age = parseInt(seasonYear) - birth.getFullYear();
    return age;
}

// ─── Per-season stat helpers ─────────────────────────────────────────────────
function getSeasonData(year) {
    return seasons.find(s => s.year === year) || null;
}

/** Return { name, count } sorted descending for goal scorers in a season */
function seasonTopScorers(year) {
    const data = getSeasonData(year);
    if (!data) return [];
    const map = {};
    (data.matchdays || []).forEach(md => {
        (md.games || []).forEach(game => {
            (game.goals || []).forEach(g => {
                if (!g.player) return;
                map[g.player] = (map[g.player] || 0) + 1;
            });
        });
    });
    return Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

/** Return { name, count } sorted descending for assists in a season */
function seasonTopAssists(year) {
    const data = getSeasonData(year);
    if (!data) return [];
    const map = {};
    (data.matchdays || []).forEach(md => {
        (md.games || []).forEach(game => {
            (game.goals || []).forEach(g => {
                if (!g.assist || g.assist === 'none' || g.assist === false) return;
                map[g.assist] = (map[g.assist] || 0) + 1;
            });
        });
    });
    return Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

/** Return { name, count } sorted descending for POTM in a season */
function seasonTopPOTM(year) {
    const data = getSeasonData(year);
    if (!data) return [];
    const map = {};
    (data.matchdays || []).forEach(md => {
        (md.games || []).forEach(game => {
            if (!game.potm || game.potm === 'none') return;
            map[game.potm] = (map[game.potm] || 0) + 1;
        });
    });
    return Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

/** 
 * Rank players scoped to a single season year using the unified rating system.
 */
function seasonPlayerRatings(year) {
    const data = getSeasonData(year);
    if (!data) return [];

    const games = (data.matchdays || []).flatMap(md => md.games || []);
    return rankPlayers(games);
}

/** Youngest top scorer in a season — sorted by age asc, then goals desc as tiebreaker */
function seasonYoungestScorer(year) {
    const scorers = seasonTopScorers(year); // already sorted by goals desc
    if (!scorers.length) return null;

    const withAges = scorers
        .map(({ name, count }) => {
            const dob = getPlayerDob(name);
            const age = getAgeInYear(dob, year);
            return age !== null ? { name, age, goals: count } : null;
        })
        .filter(Boolean);

    if (!withAges.length) return null;

    // Sort: youngest age first; on tie, most goals first
    withAges.sort((a, b) => a.age !== b.age ? a.age - b.age : b.goals - a.goals);
    return withAges[0];
}

/** Goals grouped by time period */
function seasonGoalsByPeriod(year) {
    const data = getSeasonData(year);
    const periods = [
        { label: '1–15',          min: 1,   max: 15  },
        { label: '16–30',         min: 16,  max: 30  },
        { label: '31–45',         min: 31,  max: 45  },
        { label: '45+',           min: 46,  max: 46  },
        { label: '46–60',         min: 47,  max: 60  },
        { label: '61–75',         min: 61,  max: 75  },
        { label: '76–90',         min: 76,  max: 90  },
        { label: '90+',           min: 91,  max: 98  },
        { label: 'ET (1st half)', min: 91,  max: 105 },
        { label: 'ET (2nd half)', min: 106, max: 120 },
    ];

    const counts = periods.map(p => ({ label: p.label, count: 0 }));

    if (!data) return counts;

    (data.matchdays || []).forEach(md => {
        (md.games || []).forEach(game => {
            (game.goals || []).forEach(g => {
                const m = parseInt(g.minute);
                if (isNaN(m)) return;
                for (let i = 0; i < periods.length; i++) {
                    if (m >= periods[i].min && m <= periods[i].max) {
                        counts[i].count++;
                        break;
                    }
                }
            });
        });
    });

    return counts;
}

/**
 * Return the finals game data for a season, or null if not played.
 * A season is considered "done" when there is a bracketType==='finals'
 * matchday with at least one non-standby completed game.
 */
function getFinalResult(year) {
    const data = getSeasonData(year);
    if (!data) return null;

    const finalsMd = (data.matchdays || []).find(md => md.bracketType === 'finals');
    if (!finalsMd) return null;

    const finalGame = (finalsMd.games || []).find(
        g => !g.standby && (g.score1 !== undefined && g.score2 !== undefined)
    );
    if (!finalGame) return null;

    const t1 = getTeamById(finalGame.team1);
    const t2 = getTeamById(finalGame.team2);
    if (!t1 || !t2) return null;

    const team1Won = finalGame.score1 > finalGame.score2;
    const winner   = team1Won ? t1 : t2;
    const loser    = team1Won ? t2 : t1;
    const winScore = team1Won ? finalGame.score1 : finalGame.score2;
    const losScore = team1Won ? finalGame.score2 : finalGame.score1;

    return {
        id:        finalGame.id,
        team1:     t1,
        team2:     t2,
        score1:    finalGame.score1,
        score2:    finalGame.score2,
        winner,
        loser,
        winScore,
        losScore,
        team1Won,
    };
}

/** Total match count in a season */
function seasonMatchCount(year) {
    const data = getSeasonData(year);
    if (!data) return 0;
    let count = 0;
    (data.matchdays || []).forEach(md => {
        (md.games || []).forEach(game => {
            if (!game.standby) count++;
        });
    });
    return count;
}

// ─── Rendering helpers ───────────────────────────────────────────────────────
function renderClubLogos(playerName) {
    const clubs = getPlayerClubs(playerName);
    return clubs.map(id => {
        const team = getTeamById(id);
        if (!team) return '';
        return `<img src="${team.img}" alt="${team.name}" title="${team.name}">`;
    }).join('');
}

const ROAD_ROUNDS = [
    { key: 'finals', label: 'Final', layout: 'full' },
    { key: 'semiFinals', label: 'Semi-finals', layout: 'pair' },
    { key: 'quarterFinals', label: 'Quarter-finals', layout: 'pair' },
    { key: 'round16', label: 'Round of 16', layout: 'pair' },
];

function getMatchWinnerNote(game) {
    if (!game || game.standby) return '';
    if (game.score1 === undefined || game.score2 === undefined) return '';
    if (game.score1 === game.score2) return '';

    const winner = game.score1 > game.score2 ? getTeamById(game.team1) : getTeamById(game.team2);
    return `${winner.sub || winner.name} win`;
}

function renderRoadMatchCard(game) {
    const t1 = getTeamById(game.team1);
    const t2 = getTeamById(game.team2);
    const isStandby = !!game.standby;
    const score = isStandby ? '–' : `${game.score1} – ${game.score2}`;
    const winnerNote = getMatchWinnerNote(game);
    const href = game.id && !isStandby ? `match-info.html?match=${game.id}` : null;

    const inner = `
        ${winnerNote ? `<div class="rtf-match-note">${winnerNote}</div>` : ''}
        <div class="rtf-match-teams">
            <div class="rtf-team">
                <img class="rtf-team-logo" src="${t1.img}" alt="${t1.name}">
                <span class="rtf-team-name">${t1.sub || t1.name}</span>
            </div>
            <div class="rtf-score">${score}</div>
            <div class="rtf-team rtf-team--away">
                <img class="rtf-team-logo" src="${t2.img}" alt="${t2.name}">
                <span class="rtf-team-name">${t2.sub || t2.name}</span>
            </div>
        </div>`;

    if (href) {
        return `<a class="rtf-match" href="${href}">${inner}</a>`;
    }
    return `<div class="rtf-match rtf-match--upcoming">${inner}</div>`;
}

function renderRoadToFinal(year) {
    const container = document.getElementById('roadToFinal');
    if (!container) return;

    const data = getSeasonData(year);
    if (!data) {
        container.innerHTML = '<div class="no-data">No knockout data for this season.</div>';
        return;
    }

    const sections = [];

    ROAD_ROUNDS.forEach(round => {
        const md = (data.matchdays || []).find(matchday => matchday.bracketType === round.key);
        if (!md || !(md.games || []).length) return;

        const games = md.games.filter(game => game.team1 && game.team2);
        if (!games.length) return;

        sections.push(`
            <div class="rtf-round">
                <h3 class="rtf-round-title">${round.label}</h3>
                <div class="rtf-matches rtf-matches--${round.layout}">
                    ${games.map(renderRoadMatchCard).join('')}
                </div>
            </div>
        `);
    });

    container.innerHTML = sections.length
        ? sections.join('')
        : '<div class="no-data">Knockout phase has not started yet.</div>';
}

const KO_PHASES = [
    { key: 'finals', label: 'Final' },
    { key: 'semiFinals', label: 'Semi-finals' },
    { key: 'quarterFinals', label: 'Quarter-finals' },
    { key: 'round16', label: 'Round of 16' },
];

function isPlayoffMatchday(md) {
    const details = (md.details || '').toLowerCase();
    return !md.bracketType && (details.includes('leaderboard') || details.includes('play-off') || details.includes('playoff'));
}

function isLeagueMatchday(md) {
    if (md.bracketType || isPlayoffMatchday(md)) return false;
    const details = (md.details || '').toLowerCase();
    return details.includes('league') || !details;
}

function getTeamsFromMatchday(md) {
    const ids = new Set();
    (md.games || []).forEach(game => {
        if (game.team1) ids.add(game.team1);
        if (game.team2) ids.add(game.team2);
    });
    return [...ids];
}

function getTeamOriginCode(team) {
    if (!team?.originC) return '';
    return team.originC.slice(0, 3).toUpperCase();
}

function getSeasonClubPhases(year) {
    const data = getSeasonData(year);
    if (!data) return [];

    const phases = [];

    KO_PHASES.forEach(phase => {
        const md = (data.matchdays || []).find(matchday => matchday.bracketType === phase.key);
        if (!md) return;
        const teamIds = getTeamsFromMatchday(md);
        if (teamIds.length) {
            phases.push({ label: phase.label, teamIds });
        }
    });

    const leagueIds = new Set();
    const playoffIds = new Set();
    (data.matchdays || []).forEach(md => {
        if (md.bracketType) return;
        if (isPlayoffMatchday(md)) {
            getTeamsFromMatchday(md).forEach(id => playoffIds.add(id));
            return;
        }
        if (isLeagueMatchday(md)) {
            getTeamsFromMatchday(md).forEach(id => leagueIds.add(id));
        }
    });

    if (playoffIds.size) {
        phases.push({ label: 'KO play-offs', teamIds: [...playoffIds] });
    }

    if (leagueIds.size) {
        phases.push({ label: 'League Phase', teamIds: [...leagueIds] });
    }

    return phases;
}

function renderClubCard(teamId) {
    const team = getTeamById(teamId);
    const origin = getTeamOriginCode(team);
    const name = team.sub || team.name;
    return `
        <div class="club-item">
            <img class="club-item-logo" src="${team.img}" alt="${team.name}">
            <span class="club-item-name">${name}</span>
            ${origin ? `<span class="club-item-origin">(${origin})</span>` : ''}
        </div>`;
}

function renderClubsView(year) {
    const clubsYearEl = document.getElementById('clubsSectionYear');
    const phasesEl = document.getElementById('clubsPhases');
    if (!phasesEl) return;

    if (clubsYearEl) clubsYearEl.textContent = year;

    const phases = getSeasonClubPhases(year);
    if (!phases.length) {
        phasesEl.innerHTML = '<div class="no-data">No club data for this season.</div>';
        return;
    }

    phasesEl.innerHTML = phases.map(phase => `
        <div class="club-phase">
            <h3 class="club-phase-title">${phase.label}</h3>
            <div class="club-phase-teams">
                ${phase.teamIds.map(renderClubCard).join('')}
            </div>
        </div>
    `).join('');
}

let activeHeroTab = 'overview';

function setHeroTab(tabName) {
    activeHeroTab = tabName;

    document.querySelectorAll('.hero-tab').forEach(tab => {
        tab.classList.toggle('hero-tab--active', tab.dataset.tab === tabName);
    });

    const overviewEl = document.getElementById('seasonOverviewContent');
    const clubsEl = document.getElementById('seasonClubsContent');
    const showClubs = tabName === 'clubs';

    if (overviewEl) overviewEl.hidden = showClubs;
    if (clubsEl) clubsEl.hidden = !showClubs;
}

// ─── Main render ─────────────────────────────────────────────────────────────
let yearList = [];
let currentIndex = 0;

function renderSeasonTabs() {
    const tabsEl = document.getElementById('seasonTabs');
    if (!tabsEl) return;

    tabsEl.innerHTML = yearList.map((year, idx) => {
        const finalResult = getFinalResult(year);
        const hasWinner = finalResult !== null;
        const winnerImg = hasWinner ? finalResult.winner.img : 'images/icons/cl-image.png';
        const isActive = idx === currentIndex;
        
        return `
            <div class="season-tab ${isActive ? 'is-active' : ''}" data-index="${idx}">
                <img class="season-tab-logo ${hasWinner ? 'has-winner' : ''}" 
                     src="${winnerImg}" alt="${hasWinner ? finalResult.winner.name : year}">
                <span class="season-tab-year">${year}</span>
            </div>
        `;
    }).join('');

    tabsEl.querySelectorAll('.season-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const idx = parseInt(tab.dataset.index);
            if (!isNaN(idx)) {
                currentIndex = idx;
                render(yearList[currentIndex]);
            }
        });
    });

    scrollActiveTabIntoView();
}

function scrollActiveTabIntoView() {
    const tabsEl = document.getElementById('seasonTabs');
    const activeTab = tabsEl?.querySelector('.season-tab.is-active');
    if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

function render(year) {
    document.getElementById('tourneySectionYear').textContent = year;

    // Update selector arrows
    const prevBtn = document.getElementById('selectorPrevBtn');
    const nextBtn = document.getElementById('selectorNextBtn');
    if (prevBtn) prevBtn.disabled = currentIndex >= yearList.length - 1;
    if (nextBtn) nextBtn.disabled = currentIndex <= 0;

    // Render season tabs
    renderSeasonTabs();

    // --- Finals / completion ---
    const finalResult = getFinalResult(year);
    const isComplete = finalResult !== null;
    const seasonHero = document.getElementById('seasonHero');
    const heroWinnerLogo = document.getElementById('heroWinnerLogo');
    const heroLabel = document.getElementById('heroLabel');
    const heroTeamName = document.getElementById('heroTeamName');
    const heroHeadline = document.getElementById('heroHeadline');
    const heroImage = document.getElementById('heroImage');

    const finalArticle = getFinalArticle(year);

    if (isComplete) {
        seasonHero.classList.remove('no-winner');
        heroWinnerLogo.src = finalResult.winner.img;
        heroWinnerLogo.alt = finalResult.winner.name;
        heroWinnerLogo.style.display = '';
        heroLabel.textContent = 'WINNERS';
        heroLabel.style.display = '';
        heroTeamName.textContent = finalResult.winner.name;

        if (finalArticle) {
            heroHeadline.textContent = finalArticle.title;
            if (finalArticle.cover) {
                heroImage.src = finalArticle.cover;
                heroImage.classList.remove('is-placeholder');
            } else {
                heroImage.src = 'images/icons/cl-image.png';
                heroImage.classList.add('is-placeholder');
            }
        } else {
            heroHeadline.textContent = `${finalResult.winner.name} ${finalResult.winScore}–${finalResult.losScore} ${finalResult.loser.name}`;
            heroImage.src = 'images/icons/cl-image.png';
            heroImage.classList.add('is-placeholder');
        }

        heroImage.onclick = () => {
            if (finalResult.id) {
                window.location.href = `match-info.html?match=${finalResult.id}`;
            }
        };
        heroImage.style.cursor = 'pointer';
    } else {
        seasonHero.classList.add('no-winner');
        heroWinnerLogo.style.display = 'none';
        heroLabel.style.display = 'none';
        heroTeamName.textContent = `Season ${year}`;
        heroHeadline.textContent = 'Season in progress';
        heroImage.src = 'images/icons/cl-image.png';
        heroImage.classList.add('is-placeholder');
        heroImage.onclick = null;
        heroImage.style.cursor = 'default';
    }

    // --- Awards ---
    const scorers  = seasonTopScorers(year);
    const assists  = seasonTopAssists(year);
    const ratings  = seasonPlayerRatings(year);
    const youngest = seasonYoungestScorer(year);

    // Top scorer
    const topScorer = scorers[0];
    document.getElementById('scorerName').textContent  = topScorer ? topScorer.name : '—';
    document.getElementById('scorerCount').textContent = topScorer ? topScorer.count : '—';
    document.getElementById('scorerClubs').innerHTML   = topScorer ? renderClubLogos(topScorer.name) : '';

    // Top assists
    const topAssist = assists[0];
    document.getElementById('assistName').textContent  = topAssist ? topAssist.name : '—';
    document.getElementById('assistCount').textContent = topAssist ? topAssist.count : '—';
    document.getElementById('assistClubs').innerHTML   = topAssist ? renderClubLogos(topAssist.name) : '';

    // Highest rated
    const topRated = ratings[0];
    document.getElementById('ratedName').textContent  = topRated ? topRated.name : '—';
    document.getElementById('ratedScore').textContent = topRated ? topRated.rating : '—';
    document.getElementById('ratedClubs').innerHTML   = topRated ? renderClubLogos(topRated.name) : '';

    // Youngest scorer
    document.getElementById('youngestName').textContent = youngest ? youngest.name : '—';
    document.getElementById('youngestAge').textContent  = youngest
        ? `Age ${youngest.age}${youngest.goals ? ` · ${youngest.goals} goal${youngest.goals !== 1 ? 's' : ''}` : ''}`
        : '—';
    document.getElementById('youngestClubs').innerHTML  = youngest ? renderClubLogos(youngest.name) : '';

    // --- MOTM ---
    const motmList = seasonTopPOTM(year);
    const motmEl   = document.getElementById('motmList');
    const top4     = motmList.slice(0, 4);

    if (!top4.length) {
        motmEl.innerHTML = '<div class="no-data">No MOTM data for this season.</div>';
    } else {
        motmEl.innerHTML = top4.map((p, i) => {
            const trophyHtml = Array.from({ length: Math.min(p.count, 8) },
                () => `<img src="images/icons/motm_trphy.png" alt="trophy">`
            ).join('');

            return `
            <div class="motm-item">
                <div class="motm-rank">${i + 1}</div>
                <div class="motm-info">
                    <div class="motm-name">${p.name}</div>
                    <div class="motm-clubs">${renderClubLogos(p.name)}</div>
                </div>
                <div class="motm-trophies">
                    ${trophyHtml}
                    <div class="motm-count">${p.count}x</div>
                </div>
            </div>`;
        }).join('');
    }

    // --- Tournament stats ---
    const totalGoals  = (scorers.reduce((s, p) => s + p.count, 0));
    const matchCount  = seasonMatchCount(year);
    const gpm         = matchCount ? (totalGoals / matchCount).toFixed(2) : '—';
    const mpg         = totalGoals ? Math.round((matchCount * 90) / totalGoals) : '—';

    document.getElementById('tcTotalGoals').textContent = totalGoals || '—';
    document.getElementById('tcGPM').textContent        = gpm;
    document.getElementById('tcMPG').textContent        = mpg !== '—' ? `${mpg}'` : '—';

    // Goals by period chart
    const periods = seasonGoalsByPeriod(year);
    const maxCount = Math.max(...periods.map(p => p.count), 1);
    const chartEl  = document.getElementById('goalsChart');

    chartEl.innerHTML = periods.map(p => {
        const heightPct = (p.count / maxCount) * 100;
        return `
        <div class="chart-bar-group">
            <div class="chart-bar-count">${p.count || ''}</div>
            <div class="chart-bar-wrap">
                <div class="chart-bar" style="height:${heightPct}%"></div>
            </div>
            <div class="chart-bar-label">${p.label}</div>
        </div>`;
    }).join('');

    renderRoadToFinal(year);
    renderClubsView(year);
    setHeroTab(activeHeroTab);
}

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadArticles();
    yearList = getSeasonYears();

    if (!yearList.length) {
        const heroTeamName = document.getElementById('heroTeamName');
        if (heroTeamName) heroTeamName.textContent = 'No seasons';
        document.getElementById('awardsGrid').innerHTML = '<div class="no-data">No season data available.</div>';
        return;
    }

    currentIndex = getLatestSeasonIndex();
    render(yearList[currentIndex]);

    // Selector bar navigation
    const selectorPrevBtn = document.getElementById('selectorPrevBtn');
    const selectorNextBtn = document.getElementById('selectorNextBtn');
    const seasonTabs = document.getElementById('seasonTabs');

    if (selectorPrevBtn) {
        selectorPrevBtn.addEventListener('click', () => {
            if (currentIndex < yearList.length - 1) {
                currentIndex++;
                render(yearList[currentIndex]);
            }
        });
    }

    if (selectorNextBtn) {
        selectorNextBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                render(yearList[currentIndex]);
            }
        });
    }

    // Scroll tabs with arrows
    if (seasonTabs) {
        selectorPrevBtn?.addEventListener('click', () => {
            seasonTabs.scrollBy({ left: -200, behavior: 'smooth' });
        });
        selectorNextBtn?.addEventListener('click', () => {
            seasonTabs.scrollBy({ left: 200, behavior: 'smooth' });
        });
    }

    document.querySelectorAll('.hero-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            if (tabName === 'overview' || tabName === 'clubs') {
                setHeroTab(tabName);
            }
        });
    });

    document.addEventListener('keydown', async (e) => {
        if (!e.ctrlKey || !e.shiftKey || e.key.toLowerCase() !== 's') return;
        e.preventDefault();
        try {
            await navigator.clipboard.writeText(JSON.stringify(seasons, null, 2));
            console.log('Seasons copied to clipboard');
        } catch (err) {
            console.error('Failed to copy seasons:', err);
        }
    });
});
