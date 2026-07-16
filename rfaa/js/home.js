import { getThisSeason, getCurrentSeason, getTeamById, getMatchById, bindMatchClickEventsGlobal, seasons } from './acl-index.js';
import { calculateStandings, renderStandingsTable } from './table.js';
import { getArticlesForHomeFeed, getLatestFeaturedArticle, loadArticlesFromJson } from './articles.js';

function isPlayedGame(game) {
    if (!game || game.standby) return false;
    return game.score1 != null && game.score2 != null;
}

function isUpcomingGame(game) {
    return game && !isPlayedGame(game);
}

export function collectSeasonMatches(season) {
    if (!season || !season.matchdays) return [];
    const matches = [];
    season.matchdays.forEach((md, mdIndex) => {
        (md.games || []).forEach(game => {
            matches.push({
                game,
                matchday: md,
                matchdayIndex: mdIndex,
                seasonYear: season.year
            });
        });
    });
    return matches;
}

export function getPlayedMatches(season) {
    return collectSeasonMatches(season).filter(m => isPlayedGame(m.game));
}

export function getAllPlayedMatches(limit) {
    const sortedSeasons = [...seasons].sort((a, b) => parseInt(a.year) - parseInt(b.year));
    const all = [];
    for (const season of sortedSeasons) {
        all.push(...getPlayedMatches(season));
    }
    if (!limit) return all;
    return all.slice(-limit);
}

export function getUpcomingMatches(season) {
    return collectSeasonMatches(season).filter(m => isUpcomingGame(m.game));
}

function getHomeSeason() {
    const current = seasons.find(s => String(s.year) === String(getCurrentSeason()));
    if (current?.matchdays?.some(md => md.games?.length)) return current;
    return getThisSeason();
}

function formatPhase(meta) {
    const day = meta.matchday.details || `Matchday ${meta.matchdayIndex + 1}`;
    return day;
}

function previewMatchLimit() {
    return window.matchMedia('(max-width: 768px)').matches ? 3 : 4;
}

function recentCount(total) {
    if (!total) return 0;
    return Math.min(4, Math.max(2, total));
}

function renderPreviewMatchCard(meta) {
    const { game } = meta;
    const team1 = getTeamById(game.team1);
    const team2 = getTeamById(game.team2);
    return `
        <div class="match link-match" data-match-id="${game.id}">
            <span class="phase">${formatPhase(meta)} · ${meta.seasonYear}</span>
            <div class="p-teams">
                <div class="p-team">
                    <img src="${team1.img}" alt="${team1.name}">
                    <span>${team1.name}</span>
                    <span class="p-score">${game.score1}</span>
                </div>
                <div class="p-team">
                    <img src="${team2.img}" alt="${team2.name}">
                    <span>${team2.name}</span>
                    <span class="p-score">${game.score2}</span>
                </div>
            </div>
        </div>`;
}

function renderPreviewMatches() {
    const container = document.querySelector('.preview-matches');
    if (!container) return;

    const allPlayed = getAllPlayedMatches();
    if (!allPlayed.length) {
        container.innerHTML = '<span class="preview-empty">No results yet.</span>';
        return;
    }

    const limit = previewMatchLimit();
    const recent = allPlayed.slice(-Math.min(limit, Math.max(2, allPlayed.length)));
    container.innerHTML = recent.map(renderPreviewMatchCard).join('');
}

function renderGamesArticle(season) {
    const section = document.querySelector('.games-article');
    if (!section) return;

    const featuredArticle = getLatestFeaturedArticle();
    if (featuredArticle) {
        const cover = featuredArticle.cover || '';

        section.style.display = '';
        section.style.backgroundImage = cover
            ? `linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.55)), url('${cover}')`
            : '';
        section.style.backgroundSize = cover ? 'cover' : '';
        section.style.backgroundPosition = cover ? 'center' : '';

        section.innerHTML = `
            <div class="info">
                <span>${featuredArticle.title}</span>
            </div>`;

        section.classList.add('link-match');
        section.removeAttribute('data-match-id');
        section.dataset.articleId = featuredArticle.id;
        return;
    }

    section.style.backgroundImage = '';
    section.style.backgroundSize = '';
    section.style.backgroundPosition = '';

    if (!season) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    const all = collectSeasonMatches(season);
    const upcoming = all.filter(m => isUpcomingGame(m.game));
    const played = all.filter(m => isPlayedGame(m.game));
    const featured = upcoming[0] || played[played.length - 1] || getAllPlayedMatches(1)[0];

    if (!featured) {
        section.style.display = 'none';
        return;
    }

    const { game } = featured;
    const team1 = getTeamById(game.team1);
    const team2 = getTeamById(game.team2);
    const playedMatch = isPlayedGame(game);

    let headline;
    if (playedMatch) {
        headline = `${team1.name} ${game.score1}-${game.score2} ${team2.name} — ${formatPhase(featured)}`;
    } else {
        headline = `${team1.name} vs ${team2.name} — ${formatPhase(featured)}, get ready for the match of the day!`;
    }

    section.innerHTML = `
        <div class="info">
            <span>${headline}</span>
        </div>
        <div class="display-teams-article">
            <img src="${team1.img}" alt="${team1.name}">
            <img src="${team2.img}" alt="${team2.name}">
        </div>`;

    section.classList.add('link-match');
    section.removeAttribute('data-article-id');
    section.setAttribute('data-match-id', game.id);
}

function renderHeadlineMatch(meta) {
    const { game } = meta;
    const team1 = getTeamById(game.team1);
    const team2 = getTeamById(game.team2);
    return `
        <article class="headline-item headline-match link-match" data-match-id="${game.id}">
            <div class="headline-thumb">
                <img src="${team1.img}" alt="${team1.name}">
                <img src="${team2.img}" alt="${team2.name}">
            </div>
            <div class="headline-text">
                <div class="headline-title">${team1.name} vs ${team2.name}</div>
                <div class="headline-meta">${game.score1}-${game.score2} · ${formatPhase(meta)} · ${meta.seasonYear}</div>
            </div>
        </article>`;
}

function renderHeadlineArticle(article) {
    const thumb = article.cover || 'articles/images/ball-pitch.png';
    const meta = article.season ? `Season ${article.season}` : 'Article';
    const matchAttr = article.matchId ? ` data-match-id="${article.matchId}"` : '';
    return `
        <article class="headline-item article" data-article-id="${article.id}"${matchAttr}>
            <img class="headline-thumb" src="${thumb}" onerror="this.src='articles/images/ball-pitch.png'" alt="${article.title}">
            <div class="headline-text">
                <div class="headline-title">${article.title}</div>
                <div class="headline-meta">${meta}</div>
            </div>
        </article>`;
}

function renderFeatureHeadlines() {
    const container = document.querySelector('.home-headlines-list');
    if (!container) return;

    const matchItems = getAllPlayedMatches(4).reverse().map(renderHeadlineMatch);
    const articleItems = getArticlesForHomeFeed(4).map(renderHeadlineArticle);
    const merged = [];
    const limit = Math.max(matchItems.length, articleItems.length);

    for (let i = 0; i < limit; i++) {
        if (articleItems[i]) merged.push(articleItems[i]);
        if (matchItems[i]) merged.push(matchItems[i]);
        if (merged.length >= 5) break;
    }

    container.innerHTML = merged.length
        ? merged.join('')
        : '<div class="headline-meta">No headlines yet.</div>';

    container.querySelectorAll('.headline-item.article').forEach(el => {
        el.addEventListener('click', () => {
            window.location.href = `article-view.html?article=${el.dataset.articleId}`;
        });
    });

    const featuredArticle = document.querySelector('.games-article[data-article-id]');
    if (featuredArticle) {
        featuredArticle.addEventListener('click', () => {
            window.location.href = `article-view.html?article=${featuredArticle.dataset.articleId}`;
        });
    }
}

function probeImage(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
}

let resultBackgroundsCache = null;

/** Discovers articles/images/r-1.png, r-2.png, … until the first missing file. */
async function discoverResultBackgrounds() {
    if (resultBackgroundsCache) return resultBackgroundsCache;

    const found = [];
    const maxProbe = 40;
    for (let i = 1; i <= maxProbe; i++) {
        const src = `articles/images/r-${i}.png`;
        if (await probeImage(src)) found.push(src);
        else break;
    }

    resultBackgroundsCache = found.length ? found : ['articles/images/ball-pitch.png'];
    return resultBackgroundsCache;
}

function formatResultHeadline(game, team1, team2) {
    const s1 = game.score1;
    const s2 = game.score2;
    if (s1 === s2) {
        return `${team1.name} and ${team2.name} draw ${s1}-${s2}`;
    }
    if (s1 > s2) {
        return `${team1.name} wins ${s1}-${s2} against ${team2.name}`;
    }
    return `${team2.name} wins ${s2}-${s1} against ${team1.name}`;
}

function renderHighlightCard(meta, backgroundSrc) {
    const { game } = meta;
    const team1 = getTeamById(game.team1);
    const team2 = getTeamById(game.team2);
    const title = formatResultHeadline(game, team1, team2);

    return `
        <a class="hl-card hl-card--score link-match" href="match-info.html?match=${game.id}" data-match-id="${game.id}" aria-label="${title}">
            <div class="hl-card__media">
                <img class="hl-card__bg" src="${backgroundSrc}" alt="" onerror="this.src='articles/images/ball-pitch.png'">
                <div class="hl-card__scorechip">
                    <img src="${team1.img}" alt="">
                    <span>${game.score1}-${game.score2}</span>
                    <img src="${team2.img}" alt="">
                </div>
            </div>
            <div class="hl-card__body">
                <h3 class="hl-card__title">${title}</h3>
                <span class="hl-card__meta">${formatPhase(meta)} · ${meta.seasonYear}</span>
            </div>
        </a>`;
}

function renderArticleCard(article, { large = false } = {}) {
    const cover = article.cover || 'articles/images/ball-pitch.png';
    const meta = [
        article.season ? `Season ${article.season}` : null,
        article.featuredPlayer || null
    ].filter(Boolean).join(' · ') || 'Article';
    const sizeClass = large ? 'hl-card--feature' : 'hl-card--score';

    return `
        <a class="hl-card ${sizeClass} hl-article" href="article-view.html?article=${article.id}" data-article-id="${article.id}">
            <div class="hl-card__media">
                <img class="img-art" src="${cover}" onerror="this.src='articles/images/ball-pitch.png'" alt="">
            </div>
            <div class="hl-card__body">
                <h3 class="hl-card__title">${article.title}</h3>
                <span class="hl-card__meta">${meta}</span>
            </div>
        </a>`;
}

async function renderRecentHighlights() {
    const container = document.querySelector('.hl-games');
    if (!container) return;

    const backgrounds = await discoverResultBackgrounds();
    const allPlayed = getAllPlayedMatches();
    const newsArticles = getArticlesForHomeFeed(2);
    const matchCount = newsArticles.length >= 2 ? 4 : newsArticles.length === 1 ? 4 : recentCount(allPlayed.length);
    const highlights = allPlayed.slice(-matchCount).reverse();

    const cards = [];
    if (newsArticles[0]) cards.push(renderArticleCard(newsArticles[0], { large: true }));
    cards.push(...highlights.map((meta, i) =>
        renderHighlightCard(meta, backgrounds[i % backgrounds.length])
    ));
    if (newsArticles[1]) cards.push(renderArticleCard(newsArticles[1], { large: true }));

    if (!cards.length) {
        container.innerHTML = `
            <div class="hl-card hl-card--feature">
                <div class="hl-card__media">
                    <img class="img-art" src="articles/images/ball-pitch.png" alt="">
                </div>
                <div class="hl-card__body">
                    <h3 class="hl-card__title">What to expect this season</h3>
                    <span class="hl-card__meta">Articles</span>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = cards.join('');
}

function renderHomeStandings(season) {
    const container = document.querySelector('.js-port-acltable');
    if (!container || !season) return;

    const standings = calculateStandings(season);
    container.innerHTML = renderStandingsTable(standings).replace(
        'League Phase standings',
        'Standings'
    );
}

async function initHome() {
    const season = getHomeSeason();

    renderPreviewMatches();
    renderGamesArticle(season);
    renderFeatureHeadlines();
    await renderRecentHighlights();
    renderHomeStandings(season);
    bindMatchClickEventsGlobal();
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadArticlesFromJson();
    await initHome();
});
