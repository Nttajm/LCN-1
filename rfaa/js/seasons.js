import { seasons, getTeamById } from './acl-index.js';
import { players } from './players.js';
import { rankPlayers } from './ratings.js';

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

// ─── Main render ─────────────────────────────────────────────────────────────
let yearList = [];
let currentIndex = 0;

function render(year) {
    // --- Banner ---
    document.getElementById('bannerYear').textContent = year;
    const seasonTeamsCount = (getSeasonData(year)?.teams || []).length;
    document.getElementById('tourneySectionYear').textContent = year;

    // Disable/enable arrows
    document.getElementById('prevSeasonBtn').disabled = currentIndex >= yearList.length - 1;
    document.getElementById('nextSeasonBtn').disabled = currentIndex <= 0;

    // --- Finals / completion ---
    const finalResult    = getFinalResult(year);
    const isComplete     = finalResult !== null;
    const banner         = document.getElementById('seasonBanner');
    const finalCardWrap  = document.getElementById('finalCardWrap');
    const winnerLogoEl   = document.getElementById('bannerWinnerLogo');
    const bannerSubEl    = document.getElementById('bannerSub');

    // Season sub-label
    bannerSubEl.textContent = seasonTeamsCount ? `${seasonTeamsCount} clubs` : '';

    if (isComplete) {
        banner.classList.add('is-complete');
        winnerLogoEl.src = finalResult.winner.img;
        winnerLogoEl.alt = finalResult.winner.name;
        finalCardWrap.style.display = '';

        // Build final card teams rows
        const winTeam  = finalResult.winner;
        const losTeam  = finalResult.loser;
        const winScore = finalResult.winScore;
        const losScore = finalResult.losScore;

        document.getElementById('finalTeams').innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:0">
                <div class="final-teams" style="flex:1;gap:0.6rem">
                    <div class="final-team-row">
                        <img class="final-team-logo" src="${winTeam.img}" alt="${winTeam.name}">
                        <span class="final-team-name is-winner">${winTeam.name}</span>
                        <span class="final-winner-crown">&#9733;</span>
                    </div>
                    <div class="final-vs-sep"></div>
                    <div class="final-team-row">
                        <img class="final-team-logo" src="${losTeam.img}" alt="${losTeam.name}">
                        <span class="final-team-name">${losTeam.name}</span>
                    </div>
                </div>
                <div class="final-score-col">
                    <div class="final-score is-winner-score">${winScore}</div>
                    <div class="final-score">${losScore}</div>
                </div>
            </div>
        `;

        // Clickable to match viewer
        const finalCard = document.getElementById('finalCard');
        finalCard.onclick = () => {
            if (finalResult.id) {
                window.location.href = `match-info.html?match=${finalResult.id}`;
            }
        };
    } else {
        banner.classList.remove('is-complete');
        winnerLogoEl.src = '';
        finalCardWrap.style.display = 'none';
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
}

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    yearList = getSeasonYears();

    if (!yearList.length) {
        document.getElementById('bannerYear').textContent = 'No seasons';
        document.getElementById('awardsGrid').innerHTML  = '<div class="no-data">No season data available.</div>';
        return;
    }

    currentIndex = getLatestSeasonIndex();
    render(yearList[currentIndex]);

    document.getElementById('prevSeasonBtn').addEventListener('click', () => {
        if (currentIndex < yearList.length - 1) {
            currentIndex++;
            render(yearList[currentIndex]);
        }
    });

    document.getElementById('nextSeasonBtn').addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            render(yearList[currentIndex]);
        }
    });
});
