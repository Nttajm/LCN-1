import { getArticles, getArticleByMatchId, loadArticlesFromJson } from './articles.js';

function getArticleFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('article');
    if (id) return getArticles().find(a => String(a.id) === String(id)) || null;
    const matchId = params.get('match');
    if (matchId) return getArticleByMatchId(matchId);
    return null;
}

function formatDate(value) {
    if (!value) return 'No publish date';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return 'No publish date';
    return dt.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function renderBody(body) {
    const chunks = (body || '')
        .split(/\n{2,}/)
        .map(t => t.trim())
        .filter(Boolean);
    if (!chunks.length) return '<p>No article body yet.</p>';
    return chunks.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

function renderArticle(article) {
    const host = document.getElementById('articleMain');
    const tags = article.tags || [];
    const cover = article.cover || 'articles/images/ball-pitch.png';

    host.innerHTML = `
        <h1>${article.title || 'Untitled article'}</h1>
        <div class="article-date">${formatDate(article.updatedAt || article.createdAt)}</div>
        ${article.subtitle ? `<div class="article-sub">${article.subtitle}</div>` : ''}
        <div class="article-cover">
            <img src="${cover}" alt="${article.title || 'Article'}" onerror="this.src='articles/images/ball-pitch.png'">
        </div>
        <div class="article-meta">
            ${article.season ? `<span class="article-tag">Season ${article.season}</span>` : ''}
            ${article.featuredPlayer ? `<span class="article-tag">${article.featuredPlayer}</span>` : ''}
            ${tags.map(t => `<span class="article-tag">${t}</span>`).join('')}
        </div>
        <section class="article-content">${renderBody(article.body)}</section>
    `;
}

function renderMissing() {
    document.getElementById('articleMain').innerHTML = `
        <div class="article-empty">Article not found. Go back to the home page and open a headline again.</div>
    `;
}

function renderRelated(currentId) {
    const container = document.getElementById('relatedArticles');
    const list = getArticles().filter(a => a.id !== currentId).slice(-8).reverse();

    if (!list.length) {
        container.innerHTML = '<div class="article-headline-meta">No other headlines yet.</div>';
        return;
    }

    container.innerHTML = list.map(article => `
        <a class="article-headline" href="article-view.html?article=${article.id}">
            <img src="${article.cover || 'articles/images/ball-pitch.png'}" alt="${article.title || 'Article'}" onerror="this.src='articles/images/ball-pitch.png'">
            <div>
                <div class="article-headline-title">${article.title || 'Untitled article'}</div>
                <div class="article-headline-meta">${article.season ? `Season ${article.season}` : 'Article'}</div>
            </div>
        </a>
    `).join('');
}

async function initArticleView() {
    await loadArticlesFromJson();
    const article = getArticleFromUrl();
    if (!article) {
        renderMissing();
        renderRelated(null);
        return;
    }

    renderArticle(article);
    renderRelated(article.id);
    if (article.title) document.title = `${article.title} | RFAA`;
}

document.addEventListener('DOMContentLoaded', initArticleView);
