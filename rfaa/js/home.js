import { getThisSeason, getCurrentSeason, getTeamById, getMatchById, bindMatchClickEventsGlobal, seasons } from './acl-index.js';
import { calculateStandings, renderStandingsTable } from './table.js';
import { getArticles, loadArticlesFromJson } from './articles.js';

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

    const recent = allPlayed.slice(-recentCount(allPlayed.length));
    container.innerHTML = recent.map(renderPreviewMatchCard).join('');
}

function renderGamesArticle(season) {
    const section = document.querySelector('.games-article');
    if (!section) return;

    const linkedArticle = getArticles().find(a => a.matchId) || null;
    if (linkedArticle?.matchId) {
        const game = getMatchById(linkedArticle.matchId);
        if (game) {
            const team1 = getTeamById(game.team1);
            const team2 = getTeamById(game.team2);

            section.style.display = '';
            section.innerHTML = `
                <div class="info">
                    <span>${linkedArticle.title}</span>
                </div>
                <div class="display-teams-article">
                    <img src="${team1.img}" alt="${team1.name}">
                    <img src="${team2.img}" alt="${team2.name}">
                </div>`;
            section.classList.add('link-match');
            section.removeAttribute('data-match-id');
            section.dataset.articleId = linkedArticle.id;
            return;
        }
    }

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
    const articleItems = getArticles().slice(-4).reverse().map(renderHeadlineArticle);
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

function renderHighlightCard(meta) {
    const { game } = meta;
    const team1 = getTeamById(game.team1);
    const team2 = getTeamById(game.team2);
    return `
        <div class="hl-game link-match" data-match-id="${game.id}">
            <div class="cover">
                <div class="score-hero">
                    <div class="hl-team-1 hl-team">
                        <span class="score">${game.score1}</span>
                        <img src="${team1.img}" alt="${team1.name}">
                    </div>
                    <div class="hl-team-2 hl-team">
                        <img src="${team2.img}" alt="${team2.name}">
                        <span class="score">${game.score2}</span>
                    </div>
                </div>
            </div>
            <div class="info">
                <span>${team1.name} ${game.score1}-${game.score2} ${team2.name}</span>
                <span>${formatPhase(meta)} · ${meta.seasonYear}</span>
            </div>
        </div>`;
}

function renderArticleCard(article) {
    const cover = article.cover
        ? `<img class="img-art" src="${article.cover}" onerror="this.style.display='none'" alt="">`
        : `<img class="img-art" src="articles/images/ball-pitch.png" alt="">`;

    const meta = [
        article.season ? `Season ${article.season}` : null,
        article.featuredPlayer || null
    ].filter(Boolean).join(' · ') || 'Articles';

    return `
        <div class="hl-game hl-article" data-article-id="${article.id}">
            <div class="cover">${cover}</div>
            <div class="info">
                <span>${article.title}</span>
                <span>${meta}</span>
            </div>
        </div>`;
}

function renderRecentHighlights() {
    const container = document.querySelector('.hl-games');
    if (!container) return;

    const allPlayed = getAllPlayedMatches();
    const count = recentCount(allPlayed.length);
    const highlights = allPlayed.slice(-count).reverse();

    const articles = getArticles().slice(-3).reverse();

    const articleCards = articles.length
        ? articles.map(renderArticleCard).join('')
        : `<div class="hl-game">
            <div class="cover">
                <img class="img-art" src="articles/images/ball-pitch.png" alt="">
            </div>
            <div class="info">
                <span>What to expect this season</span>
                <span>Articles</span>
            </div>
        </div>`;

    container.innerHTML = highlights.map(renderHighlightCard).join('') + articleCards;

    container.querySelectorAll('.hl-article').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
            const id = el.dataset.articleId;
            window.location.href = `article-view.html?article=${id}`;
        });
    });
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

function initHome() {
    const season = getHomeSeason();

    renderPreviewMatches();
    renderGamesArticle(season);
    renderFeatureHeadlines();
    renderRecentHighlights();
    renderHomeStandings(season);
    bindMatchClickEventsGlobal();
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadArticlesFromJson();
    initHome();
});
