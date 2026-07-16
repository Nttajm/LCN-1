export const ARTICLES_JSON_PATH = 'articles.json';
const HOME_FEATURED_KEY = 'rfaa-home-featured-id';

const HANDLE_DB = 'rfaa-article-editor';
const HANDLE_STORE = 'handles';
const HANDLE_KEY = 'articles';

let articlesCache = null;
let articlesFileHandle = null;

function normalizeArticles(json) {
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.articles)) return json.articles;
    return [];
}

function serializePayload(articles) {
    return JSON.stringify(articles, null, 2);
}

function supportsFileSave() {
    return typeof window.showOpenFilePicker === 'function';
}

function openHandleDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(HANDLE_DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(HANDLE_STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function storeFileHandle(key, handle) {
    const db = await openHandleDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE, 'readwrite');
        tx.objectStore(HANDLE_STORE).put(handle, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function loadStoredFileHandle(key) {
    const db = await openHandleDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE, 'readonly');
        const req = tx.objectStore(HANDLE_STORE).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
    });
}

async function clearStoredFileHandle(key) {
    const db = await openHandleDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE, 'readwrite');
        tx.objectStore(HANDLE_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function ensureWritePermission(handle) {
    if (await handle.queryPermission({ mode: 'readwrite' }) === 'granted') return true;
    return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
}

async function readArticlesFromHandle(handle) {
    const file = await handle.getFile();
    return normalizeArticles(JSON.parse(await file.text()));
}

export function getArticles() {
    if (articlesCache) return articlesCache;
    return [];
}

export function getArticleByMatchId(matchId) {
    if (!matchId) return null;
    return getArticles().find(a => String(a.matchId) === String(matchId)) || null;
}

function articleTimestamp(article) {
    return new Date(article?.updatedAt || article?.createdAt || 0).getTime();
}

export function isArticleFeatured(article) {
    return article?.featured === true || article?.featured === 'true';
}

function mergeArticleLists(...lists) {
    const byId = new Map();
    for (const list of lists) {
        for (const article of list) {
            if (!article?.id) continue;
            const existing = byId.get(article.id);
            if (!existing || articleTimestamp(article) >= articleTimestamp(existing)) {
                byId.set(article.id, article);
            }
        }
    }
    return Array.from(byId.values());
}

function syncHomeFeaturedId(articles) {
    const featured = articles
        .filter(isArticleFeatured)
        .sort((a, b) => articleTimestamp(b) - articleTimestamp(a))[0];
    if (featured?.id) {
        try { localStorage.setItem(HOME_FEATURED_KEY, featured.id); } catch {}
    }
}

/** Latest home-featureable article (`featured: true`), by updatedAt then createdAt. */
export function getLatestFeaturedArticle() {
    const flagged = getArticles()
        .filter(isArticleFeatured)
        .sort((a, b) => articleTimestamp(b) - articleTimestamp(a));

    if (flagged[0]) return flagged[0];

    try {
        const storedId = localStorage.getItem(HOME_FEATURED_KEY);
        if (storedId) {
            const stored = getArticles().find(a => a.id === storedId);
            if (stored) return stored;
        }
    } catch {}

    return null;
}

/** All articles newest-first, any season. */
export function getArticlesSortedNewest() {
    return [...getArticles()].sort((a, b) => articleTimestamp(b) - articleTimestamp(a));
}

/** Articles for headlines — never includes home-featured articles. */
export function getArticlesForHomeFeed(limit) {
    const featuredIds = new Set(
        getArticles().filter(isArticleFeatured).map(a => a.id)
    );
    const seenTitles = new Set();
    const result = [];

    for (const article of getArticlesSortedNewest()) {
        if (featuredIds.has(article.id)) continue;

        const titleKey = (article.title || '').trim().toLowerCase();
        if (titleKey) {
            if (seenTitles.has(titleKey)) continue;
            seenTitles.add(titleKey);
        }

        result.push(article);
        if (limit && result.length >= limit) break;
    }

    return result;
}

export function setArticles(articles) {
    articlesCache = Array.isArray(articles) ? articles : [];
    return articlesCache;
}

export function hasLinkedArticlesFile() {
    return !!articlesFileHandle;
}

export function getLinkedArticlesFileName() {
    return articlesFileHandle?.name || null;
}

export async function restoreArticlesFileHandle() {
    if (!supportsFileSave()) return null;
    try {
        const handle = await loadStoredFileHandle(HANDLE_KEY);
        if (handle) {
            articlesFileHandle = handle;
            return handle;
        }
    } catch {}
    return null;
}

export async function loadArticlesFromJson() {
    let fetched = [];
    try {
        const res = await fetch(`${ARTICLES_JSON_PATH}?t=${Date.now()}`);
        if (res.ok) fetched = normalizeArticles(await res.json());
    } catch {}

    let fromFile = [];
    await restoreArticlesFileHandle();
    if (articlesFileHandle) {
        try {
            if (await ensureWritePermission(articlesFileHandle)) {
                fromFile = await readArticlesFromHandle(articlesFileHandle);
            }
        } catch {}
    }

    const merged = mergeArticleLists(fromFile, fetched);
    setArticles(merged.length ? merged : (fetched.length ? fetched : []));
    syncHomeFeaturedId(getArticles());
    return getArticles();
}

export async function reloadArticles() {
    if (articlesFileHandle) {
        try {
            if (await ensureWritePermission(articlesFileHandle)) {
                setArticles(await readArticlesFromHandle(articlesFileHandle));
                return { source: 'file', name: articlesFileHandle.name };
            }
        } catch {}
    }
    await loadArticlesFromJson();
    return { source: 'fetch', name: ARTICLES_JSON_PATH };
}

export async function pickArticlesFile() {
    if (!supportsFileSave()) {
        throw new Error('Direct file save is not supported in this browser');
    }
    const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        multiple: false
    });
    articlesFileHandle = handle;
    await storeFileHandle(HANDLE_KEY, handle);
    try {
        const fromFile = await readArticlesFromHandle(handle);
        if (fromFile.length || !getArticles().length) {
            setArticles(fromFile);
        } else {
            await writeToLinkedFile();
        }
    } catch {
        if (getArticles().length) await writeToLinkedFile();
    }
    return handle;
}

async function writeToLinkedFile() {
    const writable = await articlesFileHandle.createWritable();
    await writable.write(serializePayload(getArticles()));
    await writable.close();
}

export async function saveArticlesToFile() {
    if (!supportsFileSave()) {
        throw new Error('Direct file save is not supported in this browser');
    }
    try {
        if (!articlesFileHandle) {
            await pickArticlesFile();
        }
        if (!(await ensureWritePermission(articlesFileHandle))) {
            throw new Error('File permission needed');
        }
        await writeToLinkedFile();
        return articlesFileHandle.name;
    } catch (err) {
        if (err?.name === 'AbortError') throw err;
        articlesFileHandle = null;
        await clearStoredFileHandle(HANDLE_KEY).catch(() => {});
        throw err;
    }
}

async function syncJsonIfLinked() {
    if (!articlesFileHandle) return;
    try {
        if (await ensureWritePermission(articlesFileHandle)) {
            await writeToLinkedFile();
        }
    } catch {}
}

export function saveArticle(article) {
    const articles = [...getArticles()];
    let idx = articles.findIndex(a => a.id === article.id);
    if (idx === -1 && article.matchId) {
        idx = articles.findIndex(a => String(a.matchId) === String(article.matchId));
    }
    if (idx !== -1) {
        const existing = articles[idx];
        articles[idx] = {
            ...article,
            id: existing.id,
            createdAt: existing.createdAt || article.createdAt
        };
    } else {
        articles.push(article);
    }
    setArticles(articles);
    syncHomeFeaturedId(articles);
    void syncJsonIfLinked();
    return articles[idx !== -1 ? idx : articles.length - 1];
}

export function deleteArticle(id) {
    setArticles(getArticles().filter(a => a.id !== id));
    syncHomeFeaturedId(getArticles());
    void syncJsonIfLinked();
}

export function exportArticlesJSON() {
    const blob = new Blob([serializePayload(getArticles())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'articles.json';
    a.click();
    URL.revokeObjectURL(url);
}

export function importArticlesFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const imported = normalizeArticles(JSON.parse(e.target.result));
                const existing = getArticles();
                const existingIds = new Set(existing.map(a => a.id));
                let added = 0;
                imported.forEach(art => {
                    if (!existingIds.has(art.id)) {
                        existing.push(art);
                        added++;
                    }
                });
                setArticles(existing);
                resolve({ total: imported.length, added });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

export const loadArticles = loadArticlesFromJson;
