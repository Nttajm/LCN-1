export const ARTICLES_JSON_PATH = 'articles.json';

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
    await restoreArticlesFileHandle();
    if (articlesFileHandle) {
        try {
            if (await ensureWritePermission(articlesFileHandle)) {
                setArticles(await readArticlesFromHandle(articlesFileHandle));
                return getArticles();
            }
        } catch {}
    }
    try {
        const res = await fetch(`${ARTICLES_JSON_PATH}?t=${Date.now()}`);
        if (res.ok) {
            setArticles(normalizeArticles(await res.json()));
            return getArticles();
        }
    } catch {}
    if (!articlesCache) setArticles([]);
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
    void syncJsonIfLinked();
    return articles[idx !== -1 ? idx : articles.length - 1];
}

export function deleteArticle(id) {
    setArticles(getArticles().filter(a => a.id !== id));
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
