import { seasons, getTeamById, saveSeason } from './acl-index.js';
import { players } from './players.js';
import { rankPlayers } from './ratings.js';
import { getTopGoalScorers, getTopAssistProviders } from './aot-stats.js';
import {
    loadArticlesFromJson,
    getArticles,
    saveArticle,
    saveArticlesToFile,
    hasLinkedArticlesFile,
} from './articles.js';

const ACL_LOGO = 'images/leagues-small/acl-logo-small.png';
const FEATURED_ARTICLE_ID = 'art-mrhdwrhb';
const FEATURED_CONFIG_KEY = 'rfaa-featured-season';

// ─── Articles data (for final headlines/images) ──────────────────────────────
let articlesData = [];

async function loadArticles() {
    await loadArticlesFromJson();
    articlesData = getArticles();
}

function getFeaturedConfig() {
    try {
        const raw = localStorage.getItem(FEATURED_CONFIG_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('Could not read featured config:', e);
    }
    return { seasonYear: null, articleId: FEATURED_ARTICLE_ID };
}

function setFeaturedConfig(config) {
    localStorage.setItem(FEATURED_CONFIG_KEY, JSON.stringify(config));
}

function getLatestSeasonYear() {
    if (!seasons.length) return null;
    const latest = seasons.reduce((max, season) => {
        const year = parseInt(season.year, 10);
        return year > max ? year : max;
    }, 0);
    return latest ? String(latest) : null;
}

function updateFeaturedSeasonLabel() {
    const labelEl = document.getElementById('featuredSeasonLabel');
    if (!labelEl) return;

    const config = getFeaturedConfig();
    const latestYear = getLatestSeasonYear();
    const savedYear = config.seasonYear;

    if (savedYear) {
        labelEl.textContent = `Featured season: ${savedYear}${latestYear && savedYear !== latestYear ? ` (latest: ${latestYear})` : ''}`;
    } else if (latestYear) {
        labelEl.textContent = `Featured season: not set (latest: ${latestYear})`;
    } else {
        labelEl.textContent = 'Featured season: —';
    }
}

function showFeaturedSaveStatus(message, isError = false) {
    const statusEl = document.getElementById('featuredSaveStatus');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.hidden = !message;
    statusEl.classList.toggle('is-error', isError);
    if (message && !isError) {
        window.clearTimeout(showFeaturedSaveStatus._timer);
        showFeaturedSaveStatus._timer = window.setTimeout(() => {
            statusEl.hidden = true;
            statusEl.textContent = '';
        }, 3000);
    }
}

async function copySeasonsToClipboard() {
    await navigator.clipboard.writeText(JSON.stringify(seasons, null, 2));
}

async function saveFeaturedSeason() {
    const latestYear = getLatestSeasonYear();
    if (!latestYear) {
        showFeaturedSaveStatus('No season data to save.', true);
        return;
    }

    const saveBtn = document.getElementById('featuredSaveBtn');
    if (saveBtn) saveBtn.disabled = true;

    try {
        setFeaturedConfig({ seasonYear: latestYear, articleId: FEATURED_ARTICLE_ID });

        const article = getArticleById(FEATURED_ARTICLE_ID);
        if (article) {
            saveArticle({
                ...article,
                season: latestYear,
                updatedAt: new Date().toISOString(),
            });
        }

        saveSeason();
        articlesData = getArticles();

        if (hasLinkedArticlesFile()) {
            try {
                await saveArticlesToFile();
            } catch (err) {
                console.warn('Could not write articles file:', err);
            }
        }

        try {
            await copySeasonsToClipboard();
        } catch (err) {
            console.warn('Could not copy seasons to clipboard:', err);
        }

        updateFeaturedSeasonLabel();
        renderFeaturedView();
        showFeaturedSaveStatus(`Saved season ${latestYear} to Featured. Seasons copied to clipboard.`);
    } catch (err) {
        console.error('Failed to save featured season:', err);
        showFeaturedSaveStatus('Save failed.', true);
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

function getFinalArticle(year) {
    return articlesData.find(a => 
        a.season === year && 
        (a.tags?.includes('final') || a.matchdayIndex === 13)
    ) || null;
}

// ─── Season Index ────────────────────────────────────────────────────────────
// Build a sorted list of completed season years (newest first)
function getSeasonYears() {
    return seasons
        .map(s => s.year)
        .filter(year => getFinalResult(year) !== null)
        .sort((a, b) => parseInt(b) - parseInt(a));
}

const FEATURED_INDEX = -1;

function isFeaturedMode() {
    return currentIndex === FEATURED_INDEX;
}

/** Count titles won per team across all completed seasons */
function getMostTitles() {
    const counts = {};
    yearList.forEach(year => {
        const result = getFinalResult(year);
        if (!result) return;
        const id = result.winner.id;
        counts[id] = (counts[id] || 0) + 1;
    });
    return Object.entries(counts)
        .map(([id, count]) => ({ team: getTeamById(id), count }))
        .filter(entry => entry.team)
        .sort((a, b) => b.count - a.count);
}

function getArticleById(id) {
    return articlesData.find(a => a.id === id) || getArticles().find(a => a.id === id) || null;
}

function renderAlltimeStatRow({ rank, img, name, count }) {
    return `
        <li class="alltime-stat-row">
            <span class="alltime-stat-rank">${rank}</span>
            ${img ? `<img class="alltime-stat-img" src="${img}" alt="">` : ''}
            <span class="alltime-stat-name">${name}</span>
            <span class="alltime-stat-value">${count}</span>
        </li>`;
}

function renderFeaturedView() {
    setViewMode(true);

    const clubsEl = document.getElementById('seasonClubsContent');
    if (clubsEl) clubsEl.hidden = true;

    updateFeaturedSeasonLabel();

    const article = getArticleById(FEATURED_ARTICLE_ID);
    const coverEl = document.getElementById('featuredArticleCover');
    const titleEl = document.getElementById('featuredArticleTitle');
    const subtitleEl = document.getElementById('featuredArticleSubtitle');
    const cardEl = document.getElementById('featuredArticleCard');

    if (article) {
        if (coverEl) {
            coverEl.src = article.cover || ACL_LOGO;
            coverEl.alt = article.title;
        }
        if (titleEl) titleEl.textContent = article.title;
        if (subtitleEl) {
            subtitleEl.textContent = article.subtitle || '';
            subtitleEl.hidden = !article.subtitle;
        }
        if (cardEl) cardEl.dataset.articleId = article.id;
    }

    const titles = getMostTitles().slice(0, 3);
    const scorers = getTopGoalScorers().slice(0, 3);
    const assists = getTopAssistProviders().slice(0, 3);

    const titlesEl = document.getElementById('alltimeTitles');
    const scorersEl = document.getElementById('alltimeScorers');
    const assistsEl = document.getElementById('alltimeAssists');

    if (titlesEl) {
        titlesEl.innerHTML = titles.length
            ? titles.map((entry, i) => renderAlltimeStatRow({
                rank: i + 1,
                img: entry.team.img,
                name: entry.team.sub || entry.team.name,
                count: entry.count,
            })).join('')
            : '<li class="alltime-stat-empty">No titles yet</li>';
    }

    if (scorersEl) {
        scorersEl.innerHTML = scorers.length
            ? scorers.map((entry, i) => renderAlltimeStatRow({
                rank: i + 1,
                img: '',
                name: entry.name,
                count: entry.count,
            })).join('')
            : '<li class="alltime-stat-empty">No data yet</li>';
    }

    if (assistsEl) {
        assistsEl.innerHTML = assists.length
            ? assists.map((entry, i) => renderAlltimeStatRow({
                rank: i + 1,
                img: '',
                name: entry.name,
                count: entry.count,
            })).join('')
            : '<li class="alltime-stat-empty">No data yet</li>';
    }
}

function setViewMode(featured) {
    const heroEl = document.getElementById('seasonHero');
    const featuredEl = document.getElementById('featuredOverviewContent');
    const seasonEl = document.getElementById('seasonOverviewContent');

    if (heroEl) {
        heroEl.hidden = featured;
        heroEl.style.display = featured ? 'none' : '';
    }
    if (featuredEl) featuredEl.hidden = !featured;
    if (seasonEl) seasonEl.hidden = featured;
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

function renderSeasonMatches(year) {
    const container = document.getElementById('seasonMatchesList');
    if (!container) return;

    const data = getSeasonData(year);
    if (!data) {
        container.innerHTML = '<div class="no-data">No matches for this season.</div>';
        return;
    }

    const sections = (data.matchdays || []).map((matchday, index) => {
        const games = (matchday.games || []).filter(game => game.team1 && game.team2);
        if (!games.length) return '';

        return `
            <div class="season-matchday">
                <h3 class="season-matchday-title">Matchday ${index + 1}</h3>
                ${matchday.details ? `<p class="season-matchday-details">${matchday.details}</p>` : ''}
                <div class="season-matchday-games">
                    ${games.map(renderRoadMatchCard).join('')}
                </div>
            </div>
        `;
    }).filter(Boolean);

    container.innerHTML = sections.length
        ? sections.join('')
        : '<div class="no-data">No matches for this season.</div>';
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
    const roadPanel = document.getElementById('roadToFinalPanel');
    const matchesSection = document.getElementById('seasonMatchesSection');

    const showClubs = tabName === 'clubs';
    const showMatches = tabName === 'matches';

    if (overviewEl) overviewEl.hidden = showClubs;
    if (clubsEl) clubsEl.hidden = !showClubs;

    if (roadPanel) roadPanel.hidden = showMatches;
    if (matchesSection) matchesSection.hidden = showClubs;
}

// ─── Main render ─────────────────────────────────────────────────────────────
let yearList = [];
let currentIndex = 0;

function renderSeasonTabs() {
    const tabsEl = document.getElementById('seasonTabs');
    if (!tabsEl) return;

    const featuredTab = `
        <div class="season-tab season-tab--featured ${isFeaturedMode() ? 'is-active' : ''}" data-index="${FEATURED_INDEX}">
            <img class="season-tab-logo season-tab-logo--acl" src="${ACL_LOGO}" alt="Featured">
            <span class="season-tab-year">Featured</span>
        </div>`;

    const seasonTabs = yearList.map((year, idx) => {
        const finalResult = getFinalResult(year);
        const isActive = !isFeaturedMode() && idx === currentIndex;

        return `
            <div class="season-tab ${isActive ? 'is-active' : ''}" data-index="${idx}">
                <img class="season-tab-logo has-winner" 
                     src="${finalResult.winner.img}" alt="${finalResult.winner.name}">
                <span class="season-tab-year">${year}</span>
            </div>
        `;
    }).join('');

    tabsEl.innerHTML = featuredTab + seasonTabs;

    tabsEl.querySelectorAll('.season-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const idx = parseInt(tab.dataset.index);
            if (isNaN(idx)) return;
            currentIndex = idx;
            if (isFeaturedMode()) {
                renderFeatured();
            } else {
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
    setViewMode(false);

    document.getElementById('tourneySectionYear').textContent = year;

    // Update selector arrows
    const prevBtn = document.getElementById('selectorPrevBtn');
    const nextBtn = document.getElementById('selectorNextBtn');
    if (prevBtn) prevBtn.disabled = currentIndex >= yearList.length - 1;
    if (nextBtn) nextBtn.disabled = false;

    // Render season tabs
    renderSeasonTabs();

    // --- Finals / completion ---
    const finalResult = getFinalResult(year);
    const seasonHero = document.getElementById('seasonHero');
    const heroWinnerLogo = document.getElementById('heroWinnerLogo');
    const heroLabel = document.getElementById('heroLabel');
    const heroTeamName = document.getElementById('heroTeamName');
    const heroHeadline = document.getElementById('heroHeadline');
    const heroImage = document.getElementById('heroImage');

    const finalArticle = getFinalArticle(year);

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
    renderSeasonMatches(year);
    renderClubsView(year);
    setHeroTab(activeHeroTab);
}

function renderFeatured() {
    const prevBtn = document.getElementById('selectorPrevBtn');
    const nextBtn = document.getElementById('selectorNextBtn');
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = yearList.length === 0;

    renderSeasonTabs();
    renderFeaturedView();
}

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadArticles();
    yearList = getSeasonYears();

    if (!yearList.length) {
        currentIndex = FEATURED_INDEX;
        renderFeatured();
        return;
    }

    currentIndex = FEATURED_INDEX;
    renderFeatured();

    // Selector bar navigation
    const selectorPrevBtn = document.getElementById('selectorPrevBtn');
    const selectorNextBtn = document.getElementById('selectorNextBtn');
    const seasonTabs = document.getElementById('seasonTabs');

    if (selectorPrevBtn) {
        selectorPrevBtn.addEventListener('click', () => {
            if (isFeaturedMode()) return;
            if (currentIndex === 0) {
                currentIndex = FEATURED_INDEX;
                renderFeatured();
                return;
            }
            if (currentIndex < yearList.length - 1) {
                currentIndex++;
                render(yearList[currentIndex]);
            }
        });
    }

    if (selectorNextBtn) {
        selectorNextBtn.addEventListener('click', () => {
            if (isFeaturedMode()) {
                currentIndex = 0;
                render(yearList[currentIndex]);
                return;
            }
            if (currentIndex > 0) {
                currentIndex--;
                render(yearList[currentIndex]);
            } else {
                currentIndex = FEATURED_INDEX;
                renderFeatured();
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
            if (tabName === 'overview' || tabName === 'matches' || tabName === 'clubs') {
                setHeroTab(tabName);
            }
        });
    });

    const featuredArticleCard = document.getElementById('featuredArticleCard');
    if (featuredArticleCard) {
        featuredArticleCard.addEventListener('click', () => {
            const id = featuredArticleCard.dataset.articleId;
            if (id) window.location.href = `article-view.html?article=${id}`;
        });
    }

    const featuredSaveBtn = document.getElementById('featuredSaveBtn');
    if (featuredSaveBtn) {
        featuredSaveBtn.addEventListener('click', () => {
            if (!isFeaturedMode()) {
                currentIndex = FEATURED_INDEX;
                renderFeatured();
            }
            void saveFeaturedSeason();
        });
    }

    document.addEventListener('keydown', async (e) => {
        if (!e.ctrlKey || !e.shiftKey || e.key.toLowerCase() !== 's') return;
        e.preventDefault();
        try {
            await copySeasonsToClipboard();
            console.log('Seasons copied to clipboard');
        } catch (err) {
            console.error('Failed to copy seasons:', err);
        }
    });
});
