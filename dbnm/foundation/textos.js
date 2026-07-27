const PKG = {
    name: 'textos',
    version: '1.0.0',
    desc: 'session messaging across devices · see-through AES-256',
    license: 'MIT',
    tags: ['textos', 'tx'],
    asciiPath: 'foundation/assets/textos/ascii.txt',
    stylePath: 'foundation/assets/textos/textos.css',
    collection: 'textos_sessions',
    historyLimit: 20
};

const TX_CRYPTO = {
    saltLen: 16,
    ivLen: 12,
    iterations: 310000,
    keyLen: 256
};

const TX_ALPHA =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

(function loadTextosStyles() {
    if (document.getElementById('textos-style')) return;
    const link = document.createElement('link');
    link.id = 'textos-style';
    link.rel = 'stylesheet';
    link.href = PKG.stylePath + '?v=' + Date.now();
    document.head.appendChild(link);
})();

const registerPkg = typeof registerPkgContents === 'function'
    ? registerPkgContents
    : window.registerPkgContents;

if (typeof registerPkg === 'function') {
    const manifest = {
        version: PKG.version,
        desc: PKG.desc,
        files: [
            { path: 'textos.js', type: 'module' },
            { path: 'assets/textos/ascii.txt', type: 'asset' },
            { path: 'assets/textos/textos.css', type: 'style' }
        ]
    };
    PKG.tags.forEach((tag) => registerPkg(tag, manifest));
}

window.gloabal_vars = window.gloabal_vars || {};
window.gloabal_vars['textos commands'] = PKG.tags;

let txFb = null;
let txDb = null;
let txApp = null;
let txUnsub = null;
let txSession = null;
let txChatBar = null;
let txChatOnKey = null;
let txLive = {
    roomId: null,
    roomName: null,
    sealed: false,
    seen: new Set()
};

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function txBanner(subtitle) {
    print('<br><span class="muted-teal b">textos</span> <span class="tx-dim">messenger</span>');
    if (subtitle) print(`<span class="tx-dim">${subtitle}</span>`);
    print('<span class="tx-dim">────────────────────────────────</span>');
}

function txBox(lines) {
    const rows = lines.map((l) => `<div>${l}</div>`).join('');
    print(`<div class="tx-panel">${rows}</div>`);
}

function txRaw(html) {
    if (typeof appendOutput === 'function') {
        appendOutput(`<div class="g-3">${html}</div>`);
    } else if (db_ui.output) {
        db_ui.output.innerHTML += `<div class="g-3">${html}</div>`;
        if (typeof scrollOutputToBottom === 'function') scrollOutputToBottom();
    }
    return html;
}

function txHelp() {
    txBanner('commands · aes-256 sealed rooms');
    print('<span class="tx-dim">in textos shell — omit prefix on commands · use <span class="light-blue">cd textos</span> to enter</span>');
    print('<span class="tx-dim">home</span>');
    print('  <span class="light-blue">textos</span>                    saved rooms · status');
    print('<span class="tx-dim">setup</span>');
    print('  <span class="light-blue">textos setup</span>              bind a saved database');
    print('  <span class="light-blue">textos status</span>             binding · room · key');
    print('<span class="tx-dim">rooms</span>');
    print('  <span class="light-blue">textos create [name]</span>      open a room');
    print('  <span class="light-blue">textos join [id]</span>         enter a room');
    print('  <span class="light-blue">textos save [id]</span>         save room to home');
    print('  <span class="light-blue">textos unsave [id|name]</span>  remove saved room');
    print('  <span class="light-blue">textos ls</span>                 list remote rooms');
    print('  <span class="light-blue">textos leave</span>              disconnect');
    print('<span class="tx-dim">chat</span>');
    print('  <span class="light-blue">textos send &lt;msg&gt;</span>         post (or type in room › bar)');
    print('  <span class="light-blue">tx &lt;msg&gt;</span>                   shorthand send');
    print('  <span class="tx-dim">in-room:</span> Enter sends · Esc|/leave exits · /key · /status');
    print('<span class="tx-dim">see-through</span>');
    print('  <span class="light-blue">textos key</span>                 set / clear local key');
    print('  <span class="light-blue">textos key &lt;secret|var&gt;</span>   set from text or global var');
    tip_print('sealed rooms store ciphertext only — both sides need the same key');
    tip_print('aliases: tx · cd.. exits textos shell');
}

function ensureTextosShape() {
    if (!window.userData) window.userData = {};
    if (!userData.textos || typeof userData.textos !== 'object') {
        userData.textos = {};
    }
    const t = userData.textos;
    if (!t.deviceId) {
        t.deviceId = 'd' + Math.random().toString(36).slice(2, 10);
    }
    const uname = (userData.username || '').trim();
    if (uname) t.deviceName = uname;
    else if (!t.deviceName) t.deviceName = 'anon';
    if (typeof t.setupShown !== 'boolean') t.setupShown = false;
    if (!t.boundDbId) t.boundDbId = null;
    if (t.seeThroughKey === undefined) t.seeThroughKey = null;
    if (!t.activeRoomId) t.activeRoomId = null;
    if ('inShell' in t) delete t.inShell;
    if (!Array.isArray(t.savedRooms)) t.savedRooms = [];
    if (!t.nameColor) t.nameColor = 'light-blue';
    return t;
}

const TX_NAME_COLORS = [
    { id: 'light-blue', name: 'light blue' },
    { id: 'green', name: 'green' },
    { id: 'yellow', name: 'yellow' },
    { id: 'coral', name: 'coral' },
    { id: 'pink', name: 'pink' },
    { id: 'muted-teal', name: 'muted teal' },
    { id: 'muted-purple', name: 'muted purple' },
    { id: 'muted-rose', name: 'muted rose' },
    { id: 'muted-orange', name: 'muted orange' },
    { id: 'red', name: 'red' }
];

function getTxNameColor(t) {
    const key = (t || ensureTextosShape()).nameColor || 'light-blue';
    return TX_NAME_COLORS.some((c) => c.id === key) ? key : 'light-blue';
}

function txNameColorLabel(colorId) {
    return TX_NAME_COLORS.find((c) => c.id === colorId)?.name || colorId;
}

function buildTxHomeContent(t, entry, saved) {
    let html = `<span class="tx-dim">${escapeHtml(PKG.version)}</span>`;
    html += `<span class="tx-home-sep"> · </span><span class="${escapeHtml(getTxNameColor(t))}">${escapeHtml(t.deviceName)}</span>`;
    html += entry
        ? `<span class="tx-home-sep"> · </span><span class="muted-teal">${escapeHtml(entry.name)}</span>`
        : '<span class="red"> · unbound</span>';
    html += '<br><span class="tx-dim">────────────────────────────────────────────</span>';

    if (saved.length) {
        html += '<br><span class="tx-dim tx-home-section">saved rooms</span>';
        saved.forEach((r, i) => {
            const isLast = i === saved.length - 1;
            const branch = isLast ? '└─' : '├─';
            const sealBadge = r.sealed ? ' <span class="tx-badge-sealed">sealed</span>' : '';
            const last = r.lastVisited ? relTime(r.lastVisited) : '';
            const lastSpan = last ? ` <span class="tx-dim tx-home-time">${escapeHtml(last)}</span>` : '';
            html += `<div class="tx-home-row">
                <span class="tx-tree">${branch}</span>
                <span class="tx-home-room">${escapeHtml(r.name)}</span>
                <span class="tx-dim tx-home-id">${escapeHtml(r.id)}</span>
                ${sealBadge}${lastSpan}
            </div>`;
        });
    } else {
        html += '<br><span class="tx-dim">  no saved rooms</span>';
    }
    html += '<br><span class="tx-dim">────────────────────────────────────────────</span>';
    return html;
}

function saveTextos() {
    ensureTextosShape();
    if (typeof saveData === 'function') saveData();
}

function getTextosUtil() {
    return (userData.cmdUtil || []).find((u) =>
        (u.linkClass === 'f' || u.linkClass === 'foundation' || u.linkClass === 'reg' || u.linkClass === '**' || u.linkClass === 'base')
        && String(u.link || '').toLowerCase() === 'textos'
    );
}

function markSetupShown() {
    const util = getTextosUtil();
    if (util) {
        util.installShown = true;
        saveData();
    }
    const t = ensureTextosShape();
    t.setupShown = true;
    saveTextos();
}

function shouldShowSetup() {
    const t = ensureTextosShape();
    if (t.setupShown) return false;
    const util = getTextosUtil();
    if (util?.installShown) return false;
    return true;
}

function listSavedDatabases() {
    if (typeof listDatabaseEntries === 'function') return listDatabaseEntries();
    const items = window.databases?.items || userData.databases?.items || {};
    return Object.values(items).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function resolveBoundDatabase() {
    const t = ensureTextosShape();
    if (!t.boundDbId) return null;
    const list = listSavedDatabases();
    return list.find((d) => d.id === t.boundDbId) || null;
}

function resolveFirebaseConfig(entry) {
    if (!entry) return null;
    const vars = entry.vars || {};
    if (vars.firebaseConfig && typeof vars.firebaseConfig === 'object') {
        return vars.firebaseConfig;
    }
    if (entry.server?.type === 'foundation') {
        const fs = window.foundationServer;
        if (fs?.server?.vars?.firebaseConfig) return fs.server.vars.firebaseConfig;
        if (vars.source && !window.foundationServer) {
            return null;
        }
    }
    if (entry.server?.type === 'global_vars' && vars.varKey) {
        const linked = (window.dbnm_vars || {})[vars.varKey];
        if (linked && typeof linked === 'object' && !Array.isArray(linked) && linked.apiKey) {
            return linked;
        }
    }
    if (entry.server?.type === 'firebase' && vars.firebaseConfig) {
        return vars.firebaseConfig;
    }
    return null;
}

async function ensureFoundationServerLoaded() {
    if (window.foundationServer) return window.foundationServer;
    return new Promise((resolve) => {
        const tag = document.createElement('script');
        tag.src = 'foundation/foundationServer.js?v=' + Date.now();
        tag.onload = () => resolve(window.foundationServer || null);
        tag.onerror = () => resolve(null);
        document.body.appendChild(tag);
    });
}

function getDbnmVars() {
    if (window.dbnm_vars && typeof window.dbnm_vars === 'object') return window.dbnm_vars;
    try {
        return JSON.parse(localStorage.getItem('dbnm_vars') || '{}');
    } catch {
        return {};
    }
}

function listVarChoices() {
    const vars = getDbnmVars();
    return Object.keys(vars)
        .filter((k) => {
            const v = vars[k];
            return typeof v === 'string' || typeof v === 'number';
        })
        .map((k) => ({
            id: k,
            name: k,
            flavor: String(vars[k]).length > 28
                ? String(vars[k]).slice(0, 28) + '…'
                : String(vars[k]),
            color: 'muted-teal',
            secret: String(vars[k])
        }));
}

function resolveSeeThroughKey(token) {
    const raw = String(token || '').trim();
    if (!raw) return null;
    const vars = getDbnmVars();
    if (raw in vars && (typeof vars[raw] === 'string' || typeof vars[raw] === 'number')) {
        return { key: String(vars[raw]), source: 'var', label: raw };
    }
    const t = ensureTextosShape();
    if (raw === 'local' || raw === 'saved') {
        if (t.seeThroughKey) return { key: t.seeThroughKey, source: 'local', label: 'local' };
    }
    return { key: raw, source: 'manual', label: 'manual' };
}

function requireSubtle() {
    const subtle = globalThis.crypto && globalThis.crypto.subtle;
    if (!subtle) throw new Error('Web Crypto unavailable — use https or localhost');
    return subtle;
}

function utf8Bytes(str) {
    return new TextEncoder().encode(str);
}

function utf8String(buf) {
    return new TextDecoder().decode(buf);
}

function bytesToAlpha(bytes) {
    let out = '';
    let i = 0;
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (; i + 2 < b.length; i += 3) {
        const n = (b[i] << 16) | (b[i + 1] << 8) | b[i + 2];
        out += TX_ALPHA[(n >> 18) & 63]
            + TX_ALPHA[(n >> 12) & 63]
            + TX_ALPHA[(n >> 6) & 63]
            + TX_ALPHA[n & 63];
    }
    const rem = b.length - i;
    if (rem === 1) {
        const n = b[i] << 16;
        out += TX_ALPHA[(n >> 18) & 63] + TX_ALPHA[(n >> 12) & 63];
    } else if (rem === 2) {
        const n = (b[i] << 16) | (b[i + 1] << 8);
        out += TX_ALPHA[(n >> 18) & 63]
            + TX_ALPHA[(n >> 12) & 63]
            + TX_ALPHA[(n >> 6) & 63];
    }
    return out;
}

function alphaToBytes(text) {
    const s = String(text || '');
    const vals = [];
    for (let i = 0; i < s.length; i++) {
        const idx = TX_ALPHA.indexOf(s[i]);
        if (idx < 0) throw new Error('invalid ciphertext');
        vals.push(idx);
    }
    const bytes = [];
    let i = 0;
    for (; i + 3 < vals.length; i += 4) {
        const n = (vals[i] << 18) | (vals[i + 1] << 12) | (vals[i + 2] << 6) | vals[i + 3];
        bytes.push((n >> 16) & 255, (n >> 8) & 255, n & 255);
    }
    const rem = vals.length - i;
    if (rem === 2) {
        const n = (vals[i] << 18) | (vals[i + 1] << 12);
        bytes.push((n >> 16) & 255);
    } else if (rem === 3) {
        const n = (vals[i] << 18) | (vals[i + 1] << 12) | (vals[i + 2] << 6);
        bytes.push((n >> 16) & 255, (n >> 8) & 255);
    } else if (rem === 1) {
        throw new Error('truncated ciphertext');
    }
    return Uint8Array.from(bytes);
}

async function deriveAesKey(passphrase, salt) {
    const subtle = requireSubtle();
    const baseKey = await subtle.importKey(
        'raw',
        utf8Bytes(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: TX_CRYPTO.iterations,
            hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: TX_CRYPTO.keyLen },
        false,
        ['encrypt', 'decrypt']
    );
}

async function sealText(text, key) {
    const subtle = requireSubtle();
    const salt = crypto.getRandomValues(new Uint8Array(TX_CRYPTO.saltLen));
    const iv = crypto.getRandomValues(new Uint8Array(TX_CRYPTO.ivLen));
    const aesKey = await deriveAesKey(key, salt);
    const cipherBuf = await subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        utf8Bytes(text)
    );
    const ct = new Uint8Array(cipherBuf);
    const packed = new Uint8Array(salt.length + iv.length + ct.length);
    packed.set(salt, 0);
    packed.set(iv, salt.length);
    packed.set(ct, salt.length + iv.length);
    return bytesToAlpha(packed);
}

async function openText(cipher, key) {
    const subtle = requireSubtle();
    const packed = alphaToBytes(cipher);
    const min = TX_CRYPTO.saltLen + TX_CRYPTO.ivLen + 16;
    if (packed.length < min) throw new Error('ciphertext too short');
    const salt = packed.slice(0, TX_CRYPTO.saltLen);
    const iv = packed.slice(TX_CRYPTO.saltLen, TX_CRYPTO.saltLen + TX_CRYPTO.ivLen);
    const ct = packed.slice(TX_CRYPTO.saltLen + TX_CRYPTO.ivLen);
    const aesKey = await deriveAesKey(key, salt);
    const plainBuf = await subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct);
    return utf8String(plainBuf);
}

function endTxDialogue(reason) {
    if (txSession?.onKey) {
        db_ui.input.removeEventListener('keydown', txSession.onKey);
    }
    if (txSession?.onChoice) {
        document.removeEventListener('keydown', txSession.onChoice);
    }
    txSession = null;
    c_placeholder('');
    unawait();
    if (reason) y_print(reason);
}

function cleanupTextosOnCdUp() {
    endTxDialogue();
    if (txLive.roomId) {
        stopLive();
    }
    const t = ensureTextosShape();
    t.activeRoomId = null;
    saveTextos();
}

window.cleanupTextosOnCdUp = cleanupTextosOnCdUp;

function askTx(label, placeholder) {
    qestion(label);
    c_placeholder(placeholder || '');
    if (db_ui.input) db_ui.input.focus();
}

function txBackspaceExit(e) {
    if (e.key !== 'Backspace') return false;
    if (!db_ui.input || db_ui.input.value.length > 0) return false;
    e.preventDefault();
    endTxDialogue('backspace — cancelled');
    return true;
}

function renderTxChoices(choices) {
    const listId = `tx-choices-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const html = choices.map((c, i) => {
        return `<div class="choice ${c.color || 'muted-teal'}" data-tx-choice="${i}"> &gt; ${escapeHtml(c.name)} <span class="tx-dim">${escapeHtml(c.flavor || '')}</span></div>`;
    }).join('');
    db_ui.output.innerHTML += `<div class="choices tx-choices" id="${listId}">${html}</div>`;
    if (typeof scrollOutputToBottom === 'function') scrollOutputToBottom();

    let selected = 0;
    let armed = false;
    const root = () => document.getElementById(listId);
    const paint = () => {
        const el = root();
        if (!el) return;
        el.querySelectorAll('.choice').forEach((node, i) => {
            node.classList.toggle('selected', i === selected);
        });
    };
    paint();

    return new Promise((resolve) => {
        const finish = (value) => {
            document.removeEventListener('keydown', onChoice);
            if (txSession) txSession.onChoice = null;
            resolve(value);
        };
        const onChoice = (e) => {
            const el = root();
            if (!el) return;
            const els = el.querySelectorAll('.choice');
            if (!els.length) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                selected = (selected + 1) % els.length;
                paint();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                selected = (selected - 1 + els.length) % els.length;
                paint();
            } else if (e.key === 'Enter') {
                if (!armed) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                finish(choices[selected]);
            } else if (e.key === 'Escape' || e.key === 'Backspace') {
                e.preventDefault();
                e.stopPropagation();
                finish(null);
            }
        };
        if (txSession) txSession.onChoice = onChoice;
        warning('↑↓ move · Enter pick · Backspace/Esc bail');
        if (db_ui.input) db_ui.input.blur();
        // Defer attach + arm so the prior Enter (room name) cannot auto-pick.
        setTimeout(() => {
            document.addEventListener('keydown', onChoice);
            setTimeout(() => { armed = true; }, 80);
        }, 0);
    });
}

function waitTxInput(label, placeholder) {
    return new Promise((resolve) => {
        askTx(label, placeholder);
        const onKey = (e) => {
            if (txBackspaceExit(e)) {
                resolve(null);
                return;
            }
            if (e.key !== 'Enter') return;
            e.preventDefault();
            e.stopPropagation();
            const value = (db_ui.input?.value || '').trim();
            db_ui.input.value = '';
            db_ui.input.removeEventListener('keydown', onKey);
            if (txSession) txSession.onKey = null;
            resolve(value);
        };
        if (txSession) txSession.onKey = onKey;
        db_ui.input.addEventListener('keydown', onKey);
    });
}

async function fetchAscii() {
    try {
        const res = await fetch(PKG.asciiPath);
        if (!res.ok) return null;
        return (await res.text()).trimEnd();
    } catch {
        return null;
    }
}

function showAscii(ascii) {
    const body = ascii
        ? `<pre class="tx-ascii">${escapeHtml(ascii)}</pre>`
        : `<span class="red">asset not found: ${PKG.asciiPath}</span>`;
    if (db_ui.output) {
        db_ui.output.innerHTML += `<div class="tx-banner g-3">${body}</div>`;
        if (typeof scrollOutputToBottom === 'function') scrollOutputToBottom();
    }
}

async function ensureTxFirebase(forceReload) {
    const entry = resolveBoundDatabase();
    if (!entry) {
        throw new Error('no database bound — run textos setup');
    }
    if (entry.server?.type === 'foundation') {
        await ensureFoundationServerLoaded();
    }
    const config = resolveFirebaseConfig(entry);
    if (!config || !config.apiKey || !config.projectId) {
        throw new Error(`database "${entry.name}" has no firebaseConfig — use foundation or firebase server`);
    }

    const appName = 'textos-' + entry.id;
    if (txFb && txApp && !forceReload && txApp.name === appName) return txFb;

    stopLive();

    const [
        { initializeApp, getApps, deleteApp },
        {
            getFirestore,
            doc,
            getDoc,
            setDoc,
            addDoc,
            collection,
            query,
            orderBy,
            limit,
            onSnapshot,
            serverTimestamp,
            getDocs
        }
    ] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js')
    ]);

    txFb = {
        initializeApp,
        getApps,
        deleteApp,
        getFirestore,
        doc,
        getDoc,
        setDoc,
        addDoc,
        collection,
        query,
        orderBy,
        limit,
        onSnapshot,
        serverTimestamp,
        getDocs
    };

    const existing = txFb.getApps().find((a) => a.name === appName);
    if (existing) {
        try { await txFb.deleteApp(existing); } catch (_) { /* ok */ }
    }
    txApp = txFb.initializeApp(config, appName);
    txDb = txFb.getFirestore(txApp);
    return txFb;
}

function roomRef(roomId) {
    return txFb.doc(txDb, PKG.collection, roomId);
}

function messagesCol(roomId) {
    return txFb.collection(txDb, PKG.collection, roomId, 'messages');
}

function roomIdBase(name) {
    return String(name || 'room')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'room';
}

async function allocateRoomId(name) {
    const base = roomIdBase(name);
    for (let n = 1; n < 10000; n++) {
        const roomId = `${base}-${n}`;
        const snap = await txFb.getDoc(roomRef(roomId));
        if (!snap.exists()) return roomId;
    }
    const tag = Math.random().toString(36).slice(2, 6);
    return `${base}-${tag}`;
}

function stopLive() {
    tearDownChatBar();
    if (txUnsub) {
        txUnsub();
        txUnsub = null;
    }
    txLive.roomId = null;
    txLive.roomName = null;
    txLive.sealed = false;
    txLive.seen = new Set();
}

// ─── saved rooms ────────────────────────────────────────────────────────────

function getSavedRooms() {
    return ensureTextosShape().savedRooms || [];
}

function saveRoom(roomId, meta) {
    const t = ensureTextosShape();
    if (!Array.isArray(t.savedRooms)) t.savedRooms = [];
    const existing = t.savedRooms.findIndex((r) => r.id === roomId);
    const entry = {
        id: roomId,
        name: meta.name || roomId,
        sealed: !!meta.sealed,
        savedAt: Date.now(),
        lastVisited: Date.now()
    };
    if (existing >= 0) t.savedRooms[existing] = { ...t.savedRooms[existing], ...entry };
    else t.savedRooms.unshift(entry);
    // Keep max 20
    if (t.savedRooms.length > 20) t.savedRooms = t.savedRooms.slice(0, 20);
    saveTextos();
}

function unsaveRoom(roomId) {
    const t = ensureTextosShape();
    t.savedRooms = (t.savedRooms || []).filter((r) => r.id !== roomId);
    saveTextos();
}

function touchSavedRoom(roomId) {
    const t = ensureTextosShape();
    const entry = (t.savedRooms || []).find((r) => r.id === roomId);
    if (entry) {
        entry.lastVisited = Date.now();
        saveTextos();
    }
}

async function promptSaveRoom(roomId, meta) {
    const t = ensureTextosShape();
    const alreadySaved = (t.savedRooms || []).some((r) => r.id === roomId);
    if (alreadySaved) {
        touchSavedRoom(roomId);
        return;
    }
    const name = meta.name || roomId;
    const shell = getShellCont();
    const barHidden = shell && shell.style.display === 'none';

    // Temporarily show shell input for the y/n prompt if chat bar is up.
    if (barHidden) {
        if (txChatBar?.el) txChatBar.el.style.display = 'none';
        if (shell) shell.style.display = '';
    }
    _await('textos-save');
    qestion(`save <span class="light-blue">${escapeHtml(name)}</span> to rooms? <span class="tx-dim">y · n · ne (never ask)</span>`);
    c_placeholder('y / n / ne');

    await new Promise((resolve) => {
        const onKey = (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            e.stopPropagation();
            const val = (db_ui.input?.value || '').trim().toLowerCase();
            if (db_ui.input) db_ui.input.value = '';
            db_ui.input.removeEventListener('keydown', onKey);
            unawait();
            c_placeholder('');
            if (val === 'y' || val === 'yes') {
                saveRoom(roomId, meta);
                g_print(`<span class="tx-dim">saved</span> <span class="light-blue">${escapeHtml(name)}</span>`);
            } else if (val === 'ne' || val === 'never') {
                t.neverAskSave = true;
                saveTextos();
                y_print('<span class="tx-dim">never ask again — use textos save to save manually</span>');
            }
            resolve();
        };
        db_ui.input.addEventListener('keydown', onKey);
        if (db_ui.input) db_ui.input.focus();
    });

    if (barHidden && txLive.roomId) {
        if (shell) shell.style.display = 'none';
        if (txChatBar?.el) {
            txChatBar.el.style.display = '';
            txChatBar.input.focus();
        } else {
            showChatBar();
        }
    }
}

// ─── textos home screen ──────────────────────────────────────────────────────

async function txHome(initialTab) {
    if (typeof renderCliTabs !== 'function') {
        e_print('cli tabs unavailable — reload dbnm');
        return;
    }

    const t = ensureTextosShape();
    const entry = resolveBoundDatabase();
    const saved = getSavedRooms();
    const nameColor = getTxNameColor(t);

    const tabs = [
        {
            id: 'home',
            label: 'home',
            content: buildTxHomeContent(t, entry, saved),
            items: saved.map((r) => ({
                id: r.id,
                name: r.name,
                flavor: r.id + (r.sealed ? ' · sealed' : ''),
                color: r.sealed ? 'yellow' : 'light-blue',
                room: r
            }))
        },
        {
            id: 'settings',
            label: 'settings',
            content: '<span class="tx-dim">pick a setting to change</span>',
            items: [
                {
                    id: 'nameColor',
                    name: 'username color',
                    flavor: txNameColorLabel(nameColor),
                    color: nameColor
                }
            ]
        },
        {
            id: 'name-color',
            label: 'username color',
            content: `<span class="tx-dim">current</span>  <span class="${escapeHtml(nameColor)}">${escapeHtml(t.deviceName)}</span> <span class="tx-dim">· ${escapeHtml(txNameColorLabel(nameColor))}</span>`,
            items: TX_NAME_COLORS.map((c) => ({
                id: c.id,
                name: c.name,
                flavor: c.id === nameColor ? 'active' : 'set color',
                color: c.id
            }))
        }
    ];

    const pick = await renderCliTabs(tabs, {
        title: 'textos',
        initial: initialTab || 'home'
    });

    if (!pick) return;

    if (pick.tab.id === 'home' && pick.item?.id) {
        await joinDialogue(pick.item.id);
        return;
    }

    if (pick.tab.id === 'settings' && pick.item?.id === 'nameColor') {
        await txHome('name-color');
        return;
    }

    if (pick.tab.id === 'name-color' && pick.item?.id) {
        t.nameColor = pick.item.id;
        saveTextos();
        g_print(`username color <span class="${escapeHtml(pick.item.id)}">${escapeHtml(txNameColorLabel(pick.item.id))}</span>`);
    }
}

function relTime(ts) {
    const diff = Date.now() - ts;
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

function printMessage(msg, opts) {
    const t = ensureTextosShape();
    const from = msg.from || t.deviceName || (userData.username || '').trim() || 'anon';
    const isSelf = msg.fromId === t.deviceId;
    const fromColor = isSelf ? getTxNameColor(t) : 'light-blue';
    const time = msg.ts
        ? new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '--:--:--';
    let body = msg.body || '';
    let cls = 'tx-msg';
    if (msg.sealed) {
        if (opts?.plain) {
            body = opts.plain;
            cls += ' sealed';
        } else {
            body = body.length > 48 ? body.slice(0, 48) + '…' : body;
            cls += ' locked';
        }
    }
    txRaw(`<div class="${cls}"><span class="tx-time">${escapeHtml(time)}</span> <span class="tx-from ${escapeHtml(fromColor)}">${escapeHtml(from)}</span> <span class="tx-body">${escapeHtml(body)}</span></div>`);
}

async function decodeMessageBody(msg) {
    if (!msg.sealed) return { plain: msg.body, ok: true };
    const t = ensureTextosShape();
    if (!t.seeThroughKey) return { plain: null, ok: false };
    try {
        const plain = await openText(msg.body, t.seeThroughKey);
        return { plain, ok: true };
    } catch {
        return { plain: null, ok: false };
    }
}

function docToMessage(doc) {
    const data = doc.data() || {};
    return {
        id: doc.id,
        from: data.from || 'anon',
        fromId: data.fromId || '',
        body: data.body || '',
        sealed: !!data.sealed,
        ts: data.createdAt?.toMillis?.() || data.createdAt?.seconds * 1000 || Date.now()
    };
}

async function loadRoomHistory(roomId) {
    const q = txFb.query(
        messagesCol(roomId),
        txFb.orderBy('createdAt', 'desc'),
        txFb.limit(PKG.historyLimit)
    );
    const snap = await txFb.getDocs(q);
    return snap.docs.slice().reverse().map(docToMessage);
}

async function printRoomMessage(msg) {
    const decoded = await decodeMessageBody(msg);
    printMessage(msg, decoded.ok ? { plain: decoded.plain } : null);
}

async function startLive(roomId, roomMeta) {
    await ensureTxFirebase();
    // Tear subscription/chat without clearing the room we're about to enter.
    tearDownChatBar();
    if (txUnsub) {
        txUnsub();
        txUnsub = null;
    }
    txLive.seen = new Set();
    txLive.roomId = roomId;
    txLive.roomName = roomMeta?.name || roomId;
    txLive.sealed = !!roomMeta?.sealed;

    const t = ensureTextosShape();
    t.activeRoomId = roomId;
    saveTextos();

    const history = await loadRoomHistory(roomId);
    if (history.length) {
        txRaw('<span class="tx-dim">recent messages</span>');
        for (const msg of history) {
            txLive.seen.add(msg.id);
            await printRoomMessage(msg);
        }
        txRaw('<span class="tx-dim">— live —</span>');
    }

    txUnsub = txFb.onSnapshot(
        txFb.query(messagesCol(roomId), txFb.orderBy('createdAt', 'asc')),
        async (snap) => {
            for (const change of snap.docChanges()) {
                if (change.type !== 'added') continue;
                const id = change.doc.id;
                if (txLive.seen.has(id)) continue;
                txLive.seen.add(id);
                const msg = docToMessage(change.doc);
                if (msg.fromId === t.deviceId) continue;
                await printRoomMessage(msg);
            }
        },
        (err) => {
            e_print(`live feed error: ${err.message}`);
        }
    );

    g_print(`joined <span class="light-blue">${escapeHtml(txLive.roomName)}</span> <span class="tx-dim">${escapeHtml(roomId)}</span>`);
    if (txLive.sealed) {
        if (t.seeThroughKey) tip_print('see-through key loaded — sealed messages will decrypt');
        else tip_print('room is sealed — set key with /key');
    }
    tip_print('type to chat · /leave exits');
    showChatBar();

    // After chat bar is live, prompt to save (non-blocking).
    if (!t.neverAskSave) {
        setTimeout(() => {
            promptSaveRoom(roomId, { name: txLive.roomName, sealed: txLive.sealed });
        }, 600);
    } else {
        touchSavedRoom(roomId);
    }
}

async function createRoom(name, keyInfo) {
    await ensureTxFirebase();
    const t = ensureTextosShape();
    const roomId = await allocateRoomId(name);
    const sealed = !!(keyInfo && keyInfo.key);
    if (sealed) {
        t.seeThroughKey = keyInfo.key;
        saveTextos();
    }
    await txFb.setDoc(roomRef(roomId), {
        name: name || roomId,
        sealed,
        hostId: t.deviceId,
        hostName: t.deviceName,
        createdAt: txFb.serverTimestamp(),
        lastActive: txFb.serverTimestamp()
    });
    await txFb.addDoc(messagesCol(roomId), {
        from: t.deviceName,
        fromId: t.deviceId,
        body: sealed ? await sealText(`opened ${name || roomId}`, keyInfo.key) : `opened ${name || roomId}`,
        sealed,
        kind: 'system',
        createdAt: txFb.serverTimestamp()
    });
    txBox([
        `<span class="tx-dim">room</span>    <span class="green b">${escapeHtml(name || roomId)}</span>`,
        `<span class="tx-dim">id</span>      <span class="light-blue">${escapeHtml(roomId)}</span>`,
        `<span class="tx-dim">sealed</span>  <span class="${sealed ? 'yellow' : 'tx-dim'}">${sealed ? 'yes · aes-256-gcm' : 'no'}</span>`,
        sealed
            ? `<span class="tx-dim">key</span>     <span class="muted-teal">${escapeHtml(keyInfo.source)}</span>`
            : `<span class="tx-dim">key</span>     <span class="tx-dim">—</span>`
    ]);
    await startLive(roomId, { name: name || roomId, sealed });
    return roomId;
}

async function joinRoom(roomId, keyToken) {
    await ensureTxFirebase();
    const snap = await txFb.getDoc(roomRef(roomId));
    if (!snap.exists()) {
        e_print(`room not found: ${roomId}`);
        return;
    }
    const meta = snap.data() || {};
    const t = ensureTextosShape();
    if (meta.sealed) {
        let keyInfo = null;
        if (keyToken) keyInfo = resolveSeeThroughKey(keyToken);
        else if (t.seeThroughKey) keyInfo = { key: t.seeThroughKey, source: 'local', label: 'local' };
        if (!keyInfo?.key) {
            e_print('room is sealed — need see-through key');
            tip_print('textos join ' + roomId + ' &lt;key|var&gt;');
            tip_print('or: textos key');
            return;
        }
        t.seeThroughKey = keyInfo.key;
        saveTextos();
    }
    await txFb.setDoc(roomRef(roomId), { lastActive: txFb.serverTimestamp() }, { merge: true });
    await startLive(roomId, { name: meta.name || roomId, sealed: !!meta.sealed });
}

async function listRooms() {
    await ensureTxFirebase();
    const snap = await txFb.getDocs(txFb.query(txFb.collection(txDb, PKG.collection), txFb.orderBy('createdAt', 'desc'), txFb.limit(24)));
    if (snap.empty) {
        print('<span class="tx-dim">no rooms</span>');
        tip_print('textos create');
        return [];
    }
    txBanner('rooms');
    const rooms = [];
    snap.docs.forEach((d, i) => {
        const data = d.data() || {};
        rooms.push({ id: d.id, ...data });
        const branch = i === snap.docs.length - 1 ? '└─' : '├─';
        const seal = data.sealed ? ' <span class="yellow">sealed</span>' : '';
        print(`<span class="tx-tree">${branch}</span> <span class="light-blue">${escapeHtml(d.id)}</span>  <span class="muted-teal">${escapeHtml(data.name || '')}</span>${seal}`);
    });
    tip_print('textos join &lt;id&gt;');
    return rooms;
}

async function sendMessage(text) {
    const msg = String(text || '').trim();
    if (!msg) {
        e_print('Usage: textos send &lt;msg&gt;');
        return;
    }
    if (!txLive.roomId) {
        e_print('not in a room');
        tip_print('textos create · textos join');
        return;
    }
    await ensureTxFirebase();
    const t = ensureTextosShape();
    let body = msg;
    let sealed = false;
    if (txLive.sealed) {
        if (!t.seeThroughKey) {
            e_print('room sealed — set key first: /key');
            return;
        }
        body = await sealText(msg, t.seeThroughKey);
        sealed = true;
    }
    const ref = await txFb.addDoc(messagesCol(txLive.roomId), {
        from: t.deviceName,
        fromId: t.deviceId,
        body,
        sealed,
        kind: 'chat',
        createdAt: txFb.serverTimestamp()
    });
    txLive.seen.add(ref.id);
    await txFb.setDoc(roomRef(txLive.roomId), { lastActive: txFb.serverTimestamp() }, { merge: true });
    printMessage({
        from: t.deviceName,
        fromId: t.deviceId,
        body,
        sealed,
        ts: Date.now()
    }, sealed ? { plain: msg } : null);
}

function leaveRoom() {
    if (!txLive.roomId) {
        print('<span class="tx-dim">not in a room</span>');
        return;
    }
    const name = txLive.roomName || txLive.roomId;
    stopLive();
    const t = ensureTextosShape();
    t.activeRoomId = null;
    saveTextos();
    y_print(`left <span class="light-blue">${escapeHtml(name)}</span>`);
}

function getShellCont() {
    return document.querySelector('.js_cont');
}

function tearDownChatBar() {
    if (txChatOnKey && txChatBar?.input) {
        txChatBar.input.removeEventListener('keydown', txChatOnKey);
    }
    txChatOnKey = null;
    if (txChatBar?.el && txChatBar.el.parentNode) {
        txChatBar.el.parentNode.removeChild(txChatBar.el);
    }
    txChatBar = null;
    const shell = getShellCont();
    if (shell) shell.style.display = '';
    if (db_ui.input) db_ui.input.focus();
    if (typeof updatePromptDisplay === 'function') updatePromptDisplay();
}

async function handleChatSlash(raw) {
    const parts = raw.slice(1).trim().split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();
    if (cmd === 'leave' || cmd === 'exit' || cmd === 'q') {
        leaveRoom();
        return;
    }
    if (cmd === 'status' || cmd === 'info') {
        showStatus();
        return;
    }
    if (cmd === 'key' || cmd === 'seal') {
        const rest = parts.slice(1).join(' ').trim() || null;
        const shell = getShellCont();
        if (shell) shell.style.display = '';
        if (txChatBar?.el) txChatBar.el.style.display = 'none';
        await keyCommand(rest);
        if (txLive.roomId) {
            if (shell) shell.style.display = 'none';
            if (txChatBar?.el) {
                txChatBar.el.style.display = '';
                txChatBar.input.focus();
            } else {
                showChatBar();
            }
        }
        return;
    }
    tip_print('/leave · /status · /key');
}

function showChatBar() {
    tearDownChatBar();
    const shell = getShellCont();
    if (shell) shell.style.display = 'none';

    const roomLabel = txLive.roomName || txLive.roomId || 'room';
    const el = document.createElement('div');
    el.id = 'tx-chat-bar';
    el.className = 'tx-chat-bar';
    el.innerHTML = `
        <span class="tx-chat-prompt"><span class="tx-chat-room">${escapeHtml(roomLabel)}</span> <span class="tx-chat-gt">›</span></span>
        <input type="text" class="tx-chat-input" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="message · /leave" />
    `;
    document.body.appendChild(el);
    const input = el.querySelector('.tx-chat-input');
    txChatBar = { el, input };

    const onKey = async (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            leaveRoom();
            return;
        }
        if (e.key !== 'Enter') return;
        e.preventDefault();
        e.stopPropagation();
        const value = (input.value || '').trim();
        input.value = '';
        if (!value) return;
        if (value.startsWith('/')) {
            await handleChatSlash(value);
            return;
        }
        try {
            await sendMessage(value);
        } catch (err) {
            e_print(err.message || String(err));
        }
        if (txChatBar?.input) txChatBar.input.focus();
    };
    txChatOnKey = onKey;
    input.addEventListener('keydown', onKey);
    input.focus();
}

function showStatus() {
    const t = ensureTextosShape();
    const entry = resolveBoundDatabase();
    txBanner('status');
    txBox([
        `<span class="tx-dim">device</span>  <span class="${escapeHtml(getTxNameColor(t))}">${escapeHtml(t.deviceName)}</span> <span class="tx-dim">${escapeHtml(t.deviceId)}</span>`,
        `<span class="tx-dim">db</span>      ${entry ? `<span class="light-blue">${escapeHtml(entry.name)}</span> <span class="tx-dim">${escapeHtml(entry.server?.label || entry.server?.type || '')}</span>` : '<span class="red">unbound</span>'}`,
        `<span class="tx-dim">room</span>    ${txLive.roomId ? `<span class="green b">${escapeHtml(txLive.roomName || txLive.roomId)}</span>` : '<span class="tx-dim">—</span>'}`,
        `<span class="tx-dim">sealed</span>  <span class="${txLive.sealed ? 'yellow' : 'tx-dim'}">${txLive.sealed ? 'yes' : 'no'}</span>`,
        `<span class="tx-dim">key</span>     ${t.seeThroughKey ? '<span class="muted-teal">loaded (local only)</span>' : '<span class="tx-dim">—</span>'}`
    ]);
}

async function pickDatabase() {
    const list = listSavedDatabases();
    if (!list.length) {
        e_print('no saved databases');
        tip_print('database create &lt;name&gt;  ·  database server default');
        return null;
    }
    print('<span class="tx-dim">select database for textos</span>');
    const choices = list.map((d, i) => {
        const connected = d.server && d.server.type && d.server.type !== 'none';
        return {
            id: d.id,
            name: `${i}. ${d.name}`,
            flavor: connected ? (d.server.label || d.server.type) : 'not connected',
            color: connected ? 'light-blue' : 'red',
            entry: d
        };
    });
    const pick = await renderTxChoices(choices);
    if (!pick) return null;
    return pick.entry;
}

async function bindDatabase(entry) {
    if (!entry) return false;
    if (entry.server?.type === 'foundation') {
        await ensureFoundationServerLoaded();
    }
    const cfg = resolveFirebaseConfig(entry);
    if (!cfg) {
        e_print(`"${entry.name}" has no usable firebase config`);
        tip_print('database select ' + entry.name + '  ·  database server default|firebase');
        return false;
    }
    const t = ensureTextosShape();
    t.boundDbId = entry.id;
    saveTextos();
    txFb = null;
    txApp = null;
    txDb = null;
    g_print(`bound <span class="light-blue">${escapeHtml(entry.name)}</span> <span class="tx-dim">${escapeHtml(entry.server?.label || entry.server?.type || '')}</span>`);
    return true;
}

async function askSeeThroughKey(opts) {
    const required = !!(opts && opts.required);
    print('<span class="tx-dim">see-through key</span>');
    const choices = [];
    if (!required) {
        choices.push({ id: 'none', name: 'none', flavor: 'plaintext room', color: 'tx-dim' });
    }
    choices.push(
        { id: 'manual', name: 'enter key', flavor: 'type a secret', color: 'yellow' },
        { id: 'var', name: 'global var', flavor: 'pick from dbnm vars', color: 'muted-teal' }
    );
    const pick = await renderTxChoices(choices);
    if (!pick || pick.id === 'none') return null;

    if (pick.id === 'manual') {
        const secret = await waitTxInput('see-through key', 'secret…');
        if (!secret) return null;
        return { key: secret, source: 'manual', label: 'manual' };
    }

    const vars = listVarChoices();
    if (!vars.length) {
        e_print('no string vars found');
        tip_print('var &lt;name&gt; &lt;value&gt;  ·  or pak var &lt;id&gt;');
        const secret = await waitTxInput('fall back — type key', 'secret…');
        if (!secret) return null;
        return { key: secret, source: 'manual', label: 'manual' };
    }
    print('<span class="tx-dim">pick a global var</span>');
    const vPick = await renderTxChoices(vars);
    if (!vPick) return null;
    return { key: vPick.secret, source: 'var', label: vPick.name };
}

async function createDialogue(presetName) {
    _await('textos');
    txSession = { step: 'create', data: {} };
    try {
        await ensureTxFirebase();
        let name = presetName;
        if (!name) {
            name = await waitTxInput('room name', 'lounge…');
            if (name === null) return;
            if (!name) name = 'room';
        }
        const keyInfo = await askSeeThroughKey();
        if (txSession === null && keyInfo === null && !presetName) {
            /* cancelled via backspace during key pick — ok */
        }
        endTxDialogue();
        await createRoom(name, keyInfo);
    } catch (e) {
        endTxDialogue();
        e_print(e.message || String(e));
    }
}

async function joinDialogue(presetId, keyToken) {
    _await('textos');
    txSession = { step: 'join', data: {} };
    try {
        await ensureTxFirebase();
        let roomId = presetId;
        if (!roomId) {
            roomId = await waitTxInput('room id', 'room-1');
            if (!roomId) {
                endTxDialogue('cancelled');
                return;
            }
        }

        const snap = await txFb.getDoc(roomRef(roomId));
        if (!snap.exists()) {
            endTxDialogue();
            e_print(`room not found: ${roomId}`);
            return;
        }
        const meta = snap.data() || {};
        let key = keyToken;
        if (meta.sealed && !key && !ensureTextosShape().seeThroughKey) {
            const keyInfo = await askSeeThroughKey({ required: true });
            if (!keyInfo?.key) {
                endTxDialogue();
                e_print('sealed room requires a see-through key');
                return;
            }
            ensureTextosShape().seeThroughKey = keyInfo.key;
            saveTextos();
            key = keyInfo.key;
        }
        endTxDialogue();
        await joinRoom(roomId, key);
    } catch (e) {
        endTxDialogue();
        e_print(e.message || String(e));
    }
}

async function setupDialogue(opts) {
    const skipBanner = !!(opts && opts.skipBanner);
    endTxDialogue();
    _await('textos');
    txSession = { step: 'setup', data: {} };

    try {
        if (!skipBanner) {
            y_print(`<span class="tx-scope">+</span> <span class="b">${PKG.name}@${PKG.version}</span>`);
            c_print(`<span class="tx-dim">GET</span> foundation/${PKG.name}`, '·');
            await delay(280);
            makeLoader(0);
            const ascii = await fetchAscii();
            makeLoader('rm');
            showAscii(ascii);
            print(`<div class="tx-panel"><span class="tx-tree">└─</span> <span class="green b">${PKG.name}@${PKG.version}</span> <span class="tx-dim">${escapeHtml(PKG.desc)}</span></div>`);
        }

        const entry = await pickDatabase();
        if (!entry) {
            endTxDialogue('setup cancelled');
            return;
        }
        const ok = await bindDatabase(entry);
        if (!ok) {
            endTxDialogue();
            return;
        }

        print('<span class="tx-dim">next</span>');
        const next = await renderTxChoices([
            { id: 'create', name: 'create session', flavor: 'open a named room', color: 'green' },
            { id: 'join', name: 'join session', flavor: 'enter an existing room', color: 'light-blue' },
            { id: 'done', name: 'done', flavor: 'finish setup', color: 'tx-dim' }
        ]);

        endTxDialogue();

        if (!next || next.id === 'done') {
            tip_print('<span class="light-blue">cd textos</span> to enter · <span class="light-blue">textos</span> for saved rooms');
            return;
        }
        if (next.id === 'create') {
            await createDialogue();
            return;
        }
        if (next.id === 'join') {
            await joinDialogue();
        }
    } catch (e) {
        endTxDialogue();
        e_print(e.message || String(e));
    } finally {
        markSetupShown();
    }
}

async function keyCommand(token) {
    const t = ensureTextosShape();
    if (!token) {
        _await('textos');
        txSession = { step: 'key' };
        const choices = [
            { id: 'set', name: 'set key', flavor: 'manual or var', color: 'yellow' },
            { id: 'clear', name: 'clear', flavor: 'drop local key', color: 'red' },
            { id: 'show', name: 'status', flavor: t.seeThroughKey ? 'key loaded' : 'no key', color: 'muted-teal' }
        ];
        const pick = await renderTxChoices(choices);
        if (!pick || pick.id === 'show') {
            endTxDialogue();
            print(t.seeThroughKey
                ? '<span class="muted-teal">see-through key loaded (never sent to db)</span>'
                : '<span class="tx-dim">no local key</span>');
            return;
        }
        if (pick.id === 'clear') {
            t.seeThroughKey = null;
            saveTextos();
            endTxDialogue();
            y_print('key cleared');
            return;
        }
        const keyInfo = await askSeeThroughKey({ required: true });
        endTxDialogue();
        if (!keyInfo?.key) {
            y_print('no key set');
            return;
        }
        t.seeThroughKey = keyInfo.key;
        saveTextos();
        g_print(`key set <span class="tx-dim">via ${escapeHtml(keyInfo.source)}</span>`);
        return;
    }

    if (token === 'clear' || token === 'rm' || token === 'none') {
        t.seeThroughKey = null;
        saveTextos();
        y_print('key cleared');
        return;
    }

    const keyInfo = resolveSeeThroughKey(token);
    if (!keyInfo?.key) {
        e_print('empty key');
        return;
    }
    t.seeThroughKey = keyInfo.key;
    saveTextos();
    g_print(`key set <span class="tx-dim">via ${escapeHtml(keyInfo.source)}${keyInfo.source === 'var' ? ' · ' + escapeHtml(keyInfo.label) : ''}</span>`);
}

async function handleTextos(_, cmd_split) {
    ensureTextosShape();
    const action = (cmd_split[1] || '').toLowerCase();

    if (!action || action === 'home' || action === 'textos') {
        await txHome();
        return;
    }
    if (action === 'help' || action === 'h' || action === '?') {
        txHelp();
        return;
    }
    if (action === 'setup' || action === 'install' || action === 'bind') {
        await setupDialogue({ skipBanner: action === 'bind' });
        return;
    }
    if (action === 'status' || action === 'info') {
        showStatus();
        return;
    }
    if (action === 'create' || action === 'new' || action === 'open') {
        const name = cmd_split.slice(2).join(' ').trim();
        await createDialogue(name || null);
        return;
    }
    if (action === 'join' || action === 'enter') {
        const id = cmd_split[2];
        const keyToken = cmd_split.slice(3).join(' ').trim() || null;
        await joinDialogue(id || null, keyToken);
        return;
    }
    if (action === 'save') {
        const idArg = cmd_split.slice(2).join(' ').trim();
        const roomId = idArg || txLive.roomId;
        if (!roomId) {
            e_print('Usage: save [room-id]  — or be inside a room');
            return;
        }
        const name = txLive.roomId === roomId ? (txLive.roomName || roomId) : roomId;
        saveRoom(roomId, { name, sealed: txLive.roomId === roomId ? txLive.sealed : false });
        g_print(`<span class="tx-dim">saved</span> <span class="light-blue">${escapeHtml(name)}</span>`);
        return;
    }
    if (action === 'unsave' || action === 'forget') {
        const arg = cmd_split.slice(2).join(' ').trim();
        const t = ensureTextosShape();
        if (!arg) {
            const saved = getSavedRooms();
            if (!saved.length) { print('<span class="tx-dim">no saved rooms</span>'); return; }
            const choices = saved.map((r) => ({
                id: r.id, name: r.name, flavor: r.id, color: 'tx-dim'
            }));
            _await('textos');
            txSession = { step: 'unsave' };
            const pick = await renderTxChoices(choices);
            endTxDialogue();
            if (!pick) return;
            unsaveRoom(pick.id);
            y_print(`<span class="tx-dim">removed</span> <span class="light-blue">${escapeHtml(pick.name)}</span>`);
            return;
        }
        const match = (t.savedRooms || []).find((r) => r.id === arg || r.name.toLowerCase() === arg.toLowerCase());
        if (!match) { e_print(`not saved: ${arg}`); return; }
        unsaveRoom(match.id);
        y_print(`<span class="tx-dim">removed</span> <span class="light-blue">${escapeHtml(match.name)}</span>`);
        return;
    }
    if (action === 'ls' || action === 'list' || action === 'rooms') {
        try {
            await listRooms();
        } catch (e) {
            e_print(e.message || String(e));
        }
        return;
    }
    if (action === 'leave' || action === 'exit' || action === 'close') {
        leaveRoom();
        return;
    }
    if (action === 'key' || action === 'seal') {
        await keyCommand(cmd_split.slice(2).join(' ').trim() || null);
        return;
    }
    if (action === 'send' || action === 'say' || action === 'msg') {
        try {
            await sendMessage(cmd_split.slice(2).join(' '));
        } catch (e) {
            e_print(e.message || String(e));
        }
        return;
    }
    if (action === 'tx') {
        try {
            await sendMessage(cmd_split.slice(2).join(' '));
        } catch (e) {
            e_print(e.message || String(e));
        }
        return;
    }

    // bare message after textos: textos hello world
    try {
        await sendMessage(cmd_split.slice(1).join(' '));
    } catch (e) {
        e_print(e.message || String(e));
    }
}

async function handleTx(_, cmd_split) {
    ensureTextosShape();
    const action = (cmd_split[1] || '').toLowerCase();
    const known = ['setup', 'install', 'bind', 'status', 'info', 'create', 'new', 'open', 'join', 'enter', 'ls', 'list', 'rooms', 'leave', 'exit', 'close', 'key', 'seal', 'send', 'say', 'msg', 'help', 'h', '?', 'save', 'unsave', 'forget'];
    if (!action || known.includes(action)) {
        await handleTextos(_, cmd_split);
        return;
    }
    try {
        await sendMessage(cmd_split.slice(1).join(' '));
    } catch (e) {
        e_print(e.message || String(e));
    }
}

_reg('textos', handleTextos);
_reg('tx', handleTx);

(async function bootTextos() {
    ensureTextosShape();
    if (shouldShowSetup()) {
        await setupDialogue();
    }
})();
