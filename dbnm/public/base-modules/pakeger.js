const PKG = {
    name: 'paKeger',
    version: '1.6.0',
    desc: 'complex key vault · DeScript + GenCode',
    license: 'MIT',
    tags: ['pak', 'pakeger', 'paKeger'],
    varPrefix: 'PAKK.',
    storeKey: 'dbnm_pakeger_keys',
    clipPrefKey: 'dbnm_pakeger_clip_pref',
    ciphers: [
        {
            id: 'descript',
            name: 'DeScript',
            flavor: 'AES-256-GCM',
            color: 'muted-teal',
            desc: 'PBKDF2 + AES-256-GCM · A–Z a–z 0–9 - _'
        }
    ],
    tools: [
        {
            id: 'gencode',
            name: 'GenCode',
            flavor: 'key forge',
            color: 'yellow',
            desc: 'forge AES-256 secrets or SkCode API keys'
        }
    ],
    codeKinds: [
        {
            id: 'aes',
            name: 'AES Code',
            flavor: '256-bit · decrypt',
            color: 'muted-teal',
            desc: 'cryptographically strong secret for DeScript / AES-256'
        },
        {
            id: 'sk',
            name: 'SkCode',
            flavor: 'api key',
            color: 'light-blue',
            desc: 'regular sk_… style API key'
        }
    ]
};

/** Printable alphabet for ciphertext (no weird glyphs). */
const DESCRIPT_ALPHA =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const DESCRIPT = {
    saltLen: 16,
    ivLen: 12,
    iterations: 310000,
    keyLen: 256
};

function requireCryptoRandom() {
    if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
        throw new Error('secure random unavailable');
    }
    return globalThis.crypto;
}

/** 256-bit secret — best for DeScript / AES-256 decrypt keys. */
function generateAesCode() {
    const bytes = requireCryptoRandom().getRandomValues(new Uint8Array(32));
    return 'aes_' + bytesToAlpha(bytes);
}

/** API-style key: sk_… + hex. */
function generateSkCode() {
    const bytes = requireCryptoRandom().getRandomValues(new Uint8Array(24));
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return 'sk_' + hex;
}

function generatePakCode(kindId) {
    const kind = String(kindId || '').toLowerCase();
    if (kind === 'aes' || kind === 'aes256' || kind === 'decrypt' || kind === 'descript') {
        return { kind: 'aes', secret: generateAesCode(), cipher: 'descript', label: 'AES Code' };
    }
    if (kind === 'sk' || kind === 'skcode' || kind === 'api') {
        return { kind: 'sk', secret: generateSkCode(), cipher: 'skcode', label: 'SkCode' };
    }
    return null;
}

function normalizeCodeKind(raw) {
    const v = String(raw || '').trim().toLowerCase();
    if (!v) return null;
    if (v === 'aes' || v === 'aes256' || v === 'a' || v === 'decrypt' || v === 'descript' || v === 'd') return 'aes';
    if (v === 'sk' || v === 'skcode' || v === 's' || v === 'api' || v === 'key') return 'sk';
    return null;
}

window.gloabal_vars = window.gloabal_vars || {};
window.gloabal_vars['pakeger commands'] = PKG.tags;

(function loadPakStyles() {
    if (document.getElementById('pakeger-style')) return;
    const style = document.createElement('style');
    style.id = 'pakeger-style';
    style.textContent = `
        .pak-dim { color: #7a7a7a; }
        .pak-panel {
            border: 1px solid #333;
            border-radius: 2px;
            padding: 0.5rem 0.65rem;
            margin: 0.35rem 0;
            background: rgba(255,255,255,0.02);
        }
        .pak-choices .choice { cursor: pointer; }
    `;
    document.head.appendChild(style);
})();

let pakSession = null;

function pakTag() {
    return `<span class="muted-teal b">${PKG.tags[0]}</span>`;
}

function pakLine(left, right) {
    c_print(`<span class="muted-teal">${right}</span>`, left);
}

function pakBanner(subtitle) {
    print(`<br><span class="muted-teal b">${PKG.name}</span> <span class="pak-dim">v${PKG.version}</span>`);
    if (subtitle) print(`<span class="pak-dim">${subtitle}</span>`);
    print('<span class="pak-dim">────────────────────────────────</span>');
}

function pakBox(rows) {
    const body = rows.map(r => `<div><span class="muted-teal">│</span> ${r}</div>`).join('');
    print(`<div class="pak-panel"><div><span class="muted-teal">┌</span> vault</div>${body}<div><span class="muted-teal">└</span></div></div>`);
}

function loadPakKeys() {
    if (window.userData?.pakeger?.keys) {
        return Array.isArray(window.userData.pakeger.keys) ? window.userData.pakeger.keys : [];
    }
    try {
        const raw = JSON.parse(localStorage.getItem(PKG.storeKey) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
}

function savePakKeys(keys) {
    if (window.userData) {
        if (!window.userData.pakeger) window.userData.pakeger = { keys: [], clipPref: 'ask' };
        window.userData.pakeger.keys = keys;
        if (typeof window.saveData === 'function') window.saveData();
        return;
    }
    localStorage.setItem(PKG.storeKey, JSON.stringify(keys));
}

function getDbnmVars() {
    if (window.dbnm_vars && typeof window.dbnm_vars === 'object') return window.dbnm_vars;
    if (window.userData?.vars && typeof window.userData.vars === 'object') return window.userData.vars;
    try {
        return JSON.parse(localStorage.getItem('dbnm_vars') || '{}');
    } catch {
        return {};
    }
}

function saveDbnmVars(vars) {
    window.dbnm_vars = vars;
    if (window.userData) window.userData.vars = vars;
    if (typeof window.saveData === 'function') window.saveData();
    else localStorage.setItem('dbnm_vars', JSON.stringify(vars));
}

function pakVarName(vaultId) {
    return PKG.varPrefix + String(vaultId || '').trim();
}

function pakVarId(varName) {
    const name = String(varName || '').trim();
    if (name.startsWith(PKG.varPrefix)) return name.slice(PKG.varPrefix.length);
    return null;
}

function resolvePakVarName(token) {
    const raw = String(token || '').trim();
    if (raw.startsWith(PKG.varPrefix)) return raw;
    return pakVarName(raw);
}

function exportPakKeyToVar(id) {
    const entry = findPakKey(id);
    if (!entry) return { ok: false, error: `no vault key named ${id}` };
    const vars = getDbnmVars();
    const varName = pakVarName(entry.id);
    vars[varName] = entry.secret;
    saveDbnmVars(vars);
    return { ok: true, name: varName, vaultId: entry.id, secret: entry.secret };
}

function exportAllPakKeysToVars() {
    const keys = loadPakKeys();
    if (!keys.length) return { ok: false, error: 'vault empty' };
    const vars = getDbnmVars();
    const names = [];
    keys.forEach((k) => {
        const varName = pakVarName(k.id);
        vars[varName] = k.secret;
        names.push(varName);
    });
    saveDbnmVars(vars);
    return { ok: true, count: keys.length, names };
}

function importVarToPakKey(varNameOrId, vaultId) {
    const vars = getDbnmVars();
    let varName = String(varNameOrId || '').trim();
    if (!varName.startsWith(PKG.varPrefix)) {
        varName = pakVarName(varNameOrId);
    }
    const fromPrefix = pakVarId(varName);
    const idRaw = vaultId || fromPrefix || String(varNameOrId || '').trim();
    const id = idRaw.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-|-$/g, '');
    if (!varName) return { ok: false, error: 'var name required' };
    if (!id) return { ok: false, error: 'invalid vault id' };
    if (!(varName in vars)) return { ok: false, error: `var not found: ${varName}` };
    const secret = vars[varName];
    upsertPakKey({
        id,
        label: id,
        cipher: 'descript',
        secret,
        attrs: {
            flavor: 'AES-256-GCM',
            kind: 'aes-gcm',
            fromVar: varName,
            strength: String(secret).length >= 16 ? 'solid' : 'light'
        },
        createdAt: Date.now()
    });
    return { ok: true, id, varName };
}

function findPakKey(idOrSecret) {
    const id = String(idOrSecret || '').trim().toLowerCase();
    const keys = loadPakKeys();
    return keys.find(k => k.id.toLowerCase() === id) || null;
}

function upsertPakKey(entry) {
    const keys = loadPakKeys();
    const idx = keys.findIndex(k => k.id.toLowerCase() === entry.id.toLowerCase());
    if (idx >= 0) keys[idx] = { ...keys[idx], ...entry };
    else keys.push(entry);
    savePakKeys(keys);
}

function removePakKey(id) {
    const next = loadPakKeys().filter(k => k.id.toLowerCase() !== id.toLowerCase());
    savePakKeys(next);
    return next.length;
}

function resolveSecret(token) {
    const raw = String(token || '').trim();
    const vaultId = pakVarId(raw) || raw;
    const saved = findPakKey(vaultId);
    if (saved) {
        return {
            secret: saved.secret,
            keyMeta: saved,
            fromVault: true,
            fromVar: false,
            varName: pakVarName(saved.id)
        };
    }
    const vars = getDbnmVars();
    const varName = resolvePakVarName(raw);
    if (varName in vars) {
        return {
            secret: vars[varName],
            keyMeta: { id: pakVarId(varName) || vaultId, label: pakVarId(varName) || vaultId, cipher: 'descript', varName },
            fromVault: false,
            fromVar: true
        };
    }
    if (raw in vars) {
        return {
            secret: vars[raw],
            keyMeta: { id: vaultId, label: vaultId, cipher: 'descript', varName: raw },
            fromVault: false,
            fromVar: true
        };
    }
    return { secret: token, keyMeta: null, fromVault: false, fromVar: false };
}

function keySourceLabel(secretInfo) {
    if (secretInfo.fromVault) {
        return `<span class="green b">${escapeHtml(secretInfo.keyMeta.id)}</span> <span class="pak-dim">vault</span>`;
    }
    if (secretInfo.fromVar) {
        const label = secretInfo.keyMeta.varName || pakVarName(secretInfo.keyMeta.id);
        return `<span class="green b">${escapeHtml(label)}</span> <span class="pak-dim">var</span>`;
    }
    return `<span class="yellow">ephemeral</span>`;
}

function requireSubtle() {
    const subtle = globalThis.crypto && globalThis.crypto.subtle;
    if (!subtle) {
        throw new Error('Web Crypto unavailable — use https or localhost');
    }
    return subtle;
}

function utf8Bytes(str) {
    return new TextEncoder().encode(String(str));
}

function utf8String(bytes) {
    return new TextDecoder().decode(bytes);
}

/** Pack bytes into DESCRIPT_ALPHA (base64url-style, no padding). */
function bytesToAlpha(bytes) {
    const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
    let out = '';
    let i = 0;
    while (i + 2 < arr.length) {
        const n = (arr[i] << 16) | (arr[i + 1] << 8) | arr[i + 2];
        out += DESCRIPT_ALPHA[(n >> 18) & 63];
        out += DESCRIPT_ALPHA[(n >> 12) & 63];
        out += DESCRIPT_ALPHA[(n >> 6) & 63];
        out += DESCRIPT_ALPHA[n & 63];
        i += 3;
    }
    const rem = arr.length - i;
    if (rem === 1) {
        const n = arr[i] << 16;
        out += DESCRIPT_ALPHA[(n >> 18) & 63];
        out += DESCRIPT_ALPHA[(n >> 12) & 63];
    } else if (rem === 2) {
        const n = (arr[i] << 16) | (arr[i + 1] << 8);
        out += DESCRIPT_ALPHA[(n >> 18) & 63];
        out += DESCRIPT_ALPHA[(n >> 12) & 63];
        out += DESCRIPT_ALPHA[(n >> 6) & 63];
    }
    return out;
}

function alphaToBytes(text) {
    const s = String(text || '').replace(/\s+/g, '');
    if (!s.length) return new Uint8Array(0);
    const map = Object.create(null);
    for (let i = 0; i < DESCRIPT_ALPHA.length; i++) map[DESCRIPT_ALPHA[i]] = i;
    const vals = [];
    for (let i = 0; i < s.length; i++) {
        const v = map[s[i]];
        if (v === undefined) {
            throw new Error(`bad ciphertext char: ${s[i]} (use A–Z a–z 0–9 - _)`);
        }
        vals.push(v);
    }
    const bytes = [];
    let i = 0;
    while (i + 3 < vals.length) {
        const n = (vals[i] << 18) | (vals[i + 1] << 12) | (vals[i + 2] << 6) | vals[i + 3];
        bytes.push((n >> 16) & 255, (n >> 8) & 255, n & 255);
        i += 4;
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
            iterations: DESCRIPT.iterations,
            hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: DESCRIPT.keyLen },
        false,
        ['encrypt', 'decrypt']
    );
}

async function descriptEncrypt(text, key) {
    const subtle = requireSubtle();
    const salt = crypto.getRandomValues(new Uint8Array(DESCRIPT.saltLen));
    const iv = crypto.getRandomValues(new Uint8Array(DESCRIPT.ivLen));
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

async function descriptDecrypt(text, key) {
    const subtle = requireSubtle();
    const packed = alphaToBytes(text);
    const min = DESCRIPT.saltLen + DESCRIPT.ivLen + 16;
    if (packed.length < min) throw new Error('ciphertext too short / corrupt');
    const salt = packed.slice(0, DESCRIPT.saltLen);
    const iv = packed.slice(DESCRIPT.saltLen, DESCRIPT.saltLen + DESCRIPT.ivLen);
    const ct = packed.slice(DESCRIPT.saltLen + DESCRIPT.ivLen);
    const aesKey = await deriveAesKey(key, salt);
    try {
        const plainBuf = await subtle.decrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            ct
        );
        return utf8String(plainBuf);
    } catch {
        throw new Error('decrypt failed — wrong key or tampered ciphertext');
    }
}

function normalizePakMode(raw) {
    const v = String(raw || '').trim().toLowerCase();
    if (v === 'e' || v === 'encrypt' || v === 'seal' || v === 'enc') return 'encrypt';
    if (v === 'd' || v === 'decrypt' || v === 'open' || v === 'dec') return 'decrypt';
    return null;
}

async function runCipher(mode, text, secret, cipherId) {
    const cipher = cipherId || 'descript';
    if (cipher !== 'descript' && cipher !== 'skcode') {
        throw new Error(`Unknown cipher: ${cipher}`);
    }
    if (!secret) throw new Error('Empty key');
    const m = normalizePakMode(mode) || mode;
    if (m === 'encrypt') return descriptEncrypt(text, secret);
    if (m === 'decrypt') return descriptDecrypt(text, secret);
    throw new Error(`Unknown mode: ${mode}`);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function previewText(text, max) {
    const s = String(text);
    if (s.length <= (max || 72)) return s;
    return s.slice(0, max || 72) + '…';
}

function parseBracketText(raw) {
    const s = String(raw || '').trim();
    const patterns = [
        /^\['([\s\S]*)'\]$/,
        /^\["([\s\S]*)"\]$/,
        /^\[([\s\S]*)\]$/,
        /^'([\s\S]*)'$/,
        /^"([\s\S]*)"$/
    ];
    for (const re of patterns) {
        const m = s.match(re);
        if (m) return m[1];
    }
    return s;
}

function extractQuotedArg(cmd_split, startIndex) {
    const rest = cmd_split.slice(startIndex).join(' ');
    if (!rest) return { text: null, keyToken: null, raw: '' };

    const bracket = rest.match(/^\s*(\[[\s\S]*?\])\s+(.+)$/);
    if (bracket) {
        return {
            text: parseBracketText(bracket[1]),
            keyToken: bracket[2].trim(),
            raw: rest
        };
    }

    const single = rest.match(/^\s*'([\s\S]*?)'\s+(.+)$/);
    if (single) {
        return { text: single[1], keyToken: single[2].trim(), raw: rest };
    }

    const dbl = rest.match(/^\s*"([\s\S]*?)"\s+(.+)$/);
    if (dbl) {
        return { text: dbl[1], keyToken: dbl[2].trim(), raw: rest };
    }

    if (cmd_split.length > startIndex + 1) {
        return {
            text: parseBracketText(cmd_split[startIndex]),
            keyToken: cmd_split.slice(startIndex + 1).join(' ').trim(),
            raw: rest
        };
    }

    return { text: parseBracketText(cmd_split[startIndex] || ''), keyToken: null, raw: rest };
}

function showCipherResult(mode, text, secretInfo, out) {
    const norm = normalizePakMode(mode) || mode;
    const action = norm === 'encrypt' ? 'sealed' : 'opened';
    const glyph = action === 'sealed' ? '+' : '·';
    pakBox([
        `<span class="pak-dim">cipher</span>  <span class="b muted-teal">DeScript</span> <span class="pak-dim">(AES-256-GCM)</span>`,
        `<span class="pak-dim">key</span>     ${keySourceLabel(secretInfo)}`,
        `<span class="pak-dim">in</span>      ${escapeHtml(previewText(text, 56))}`,
        `<span class="green b">${glyph} ${action}</span>`,
        `<span class="light-blue">${escapeHtml(out)}</span>`
    ]);
}

function listKeys() {
    const keys = loadPakKeys();
    pakBanner('saved keys');
    if (!keys.length) {
        print('<span class="pak-dim">vault empty — run <span class="light-blue">pak new</span> or <span class="light-blue">pak key add</span></span>');
        return;
    }
    const vars = getDbnmVars();
    keys.forEach((k, i) => {
        const branch = i === keys.length - 1 ? '└─' : '├─';
        const varName = pakVarName(k.id);
        const inVar = varName in vars ? ` <span class="pak-dim">· ${escapeHtml(PKG.varPrefix)}</span>` : '';
        print(`<span class="yellow">${branch}</span> <span class="green b">${escapeHtml(k.id)}</span>  <span class="muted-teal">${escapeHtml(k.cipher)}</span>  <span class="pak-dim">${escapeHtml(k.label || '')}</span>${inVar}`);
        if (k.attrs && Object.keys(k.attrs).length) {
            const attrs = Object.entries(k.attrs).map(([a, v]) => `${a}:${v}`).join(' · ');
            print(`   <span class="pak-dim">${escapeHtml(attrs)}</span>`);
        }
    });
}

function pakHelp() {
    pakBanner('key vault · DeScript AES-256-GCM');
    print('  <span class="light-blue">pak new</span>          guided seal / open');
    print('  <span class="light-blue">pak keys</span>         list vault');
    print('  <span class="light-blue">pak e</span> · <span class="light-blue">pak d</span>      seal / open');
    print('  <span class="light-blue">pak var &lt;id&gt;</span>     export as PAKK.&lt;id&gt;');
    print('  <span class="light-blue">pak gencode</span>        forge aes or sk key');
    tip_print('pak key add · rm · var import · export all · encrypt/decrypt text + key');
    tip_print('PAKK.&lt;id&gt; vars · backspace exits dialogue');
}

function endPakSession() {
    if (pakSession?.onKey) {
        db_ui.input.removeEventListener('keydown', pakSession.onKey);
    }
    if (pakSession?.onChoice) {
        document.removeEventListener('keydown', pakSession.onChoice);
    }
    pakSession = null;
    c_placeholder('');
    unawait();
}

function getClipPref() {
    return window.userData?.pakeger?.clipPref || localStorage.getItem(PKG.clipPrefKey) || 'ask';
}

function setClipPref(value) {
    if (window.userData) {
        if (!window.userData.pakeger) window.userData.pakeger = { keys: [], clipPref: 'ask' };
        window.userData.pakeger.clipPref = value;
        if (typeof window.saveData === 'function') window.saveData();
        return;
    }
    localStorage.setItem(PKG.clipPrefKey, value);
}

async function copyPakText(text) {
    try {
        await navigator.clipboard.writeText(String(text));
        g_print('copied to clipboard');
        return true;
    } catch {
        e_print('clipboard unavailable in this browser');
        return false;
    }
}

function cancelPakDialogue(reason) {
    y_print(reason || 'cancelled');
    endPakSession();
}

function pakBackspaceExit(e) {
    if (e.key !== 'Backspace') return false;
    if (!db_ui.input || db_ui.input.value.length > 0) return false;
    e.preventDefault();
    cancelPakDialogue('backspace — dialogue closed');
    return true;
}

function askPakClipboard(outputText) {
    if (getClipPref() === 'never') {
        endPakSession();
        return;
    }
    pakSession.step = 'clip';
    pakSession.clipOutput = outputText;
    askPak('copy result to clipboard? (y/n/ne)', 'y');
}

function askPak(label, placeholder) {
    qestion(label);
    c_placeholder(placeholder || '');
    if (db_ui.input) db_ui.input.focus();
}

function renderPakChoices(choices) {
    const listId = `pak-choices-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const html = choices.map((c, i) => {
        return `<div class="choice ${c.color || 'muted-teal'}" data-pak-choice="${i}"> &gt; ${escapeHtml(c.name)} <span class="pak-dim">${escapeHtml(c.flavor || '')}</span></div>`;
    }).join('');
    db_ui.output.innerHTML += `<div class="choices pak-choices" id="${listId}">${html}</div>`;

    let selected = 0;
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
        const onChoice = (e) => {
            const el = root();
            if (!el) return;
            const els = el.querySelectorAll('.choice');
            if (!els.length) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selected = (selected + 1) % els.length;
                paint();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selected = (selected - 1 + els.length) % els.length;
                paint();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                document.removeEventListener('keydown', onChoice);
                if (pakSession) pakSession.onChoice = null;
                resolve(choices[selected]);
            } else if (e.key === 'Escape' || e.key === 'Backspace') {
                e.preventDefault();
                document.removeEventListener('keydown', onChoice);
                if (pakSession) pakSession.onChoice = null;
                resolve(null);
            }
        };
        if (pakSession) pakSession.onChoice = onChoice;
        document.addEventListener('keydown', onChoice);
        if (db_ui.input) db_ui.input.blur();
        warning('↑↓ move · Enter pick · Backspace/Esc bail');
    });
}

async function pakNewDialogue() {
    endPakSession();
    _await('pak');
    pakSession = { step: 'pick', data: {} };

    pakBanner('new vault run');
    pakLine('>', 'workshop online…');
    print('<span class="pak-dim">pick DeScript or GenCode</span>');

    const pick = await renderPakChoices([
        ...PKG.ciphers.map(c => ({ ...c, tool: 'cipher' })),
        ...PKG.tools.map(t => ({ ...t, tool: 'tool' }))
    ]);

    if (!pick) {
        y_print('cancelled');
        endPakSession();
        return;
    }

    c_print(`<span class="green b">${pick.name}</span> <span class="pak-dim">${pick.flavor}</span>`, '✓');

    if (pick.id === 'gencode') {
        await pakGenCodeFlow();
        return;
    }

    pakSession.data.cipher = pick.id;
    startDescriptKeyFlow();
}

async function pakGenCodeFlow(presetKind) {
    if (!pakSession) {
        endPakSession();
        _await('pak');
        pakSession = { step: 'kind', data: {} };
        pakBanner('gencode · key forge');
    }

    let kindId = normalizeCodeKind(presetKind);
    if (!kindId) {
        print('<span class="pak-dim">select code type</span>');
        const kind = await renderPakChoices(PKG.codeKinds.map(c => ({ ...c })));
        if (!kind) {
            y_print('cancelled');
            endPakSession();
            return;
        }
        kindId = kind.id;
        c_print(`<span class="green b">${kind.name}</span> <span class="pak-dim">${kind.flavor}</span>`, '✓');
    }

    let forged;
    try {
        forged = generatePakCode(kindId);
    } catch (err) {
        e_print(err.message);
        endPakSession();
        return;
    }
    if (!forged) {
        e_print('unknown code kind');
        endPakSession();
        return;
    }

    pakSession.data = {
        ...pakSession.data,
        cipher: forged.cipher === 'skcode' ? 'descript' : forged.cipher,
        codeKind: forged.kind,
        secret: forged.secret,
        label: forged.label
    };

    pakBox([
        `<span class="pak-dim">forge</span>   <span class="b yellow">GenCode</span> <span class="pak-dim">· ${escapeHtml(forged.label)}</span>`,
        `<span class="pak-dim">kind</span>    <span class="muted-teal">${forged.kind === 'aes' ? 'AES-256 decrypt secret' : 'SkCode api key'}</span>`,
        `<span class="green b">+ code</span>`,
        `<span class="light-blue">${escapeHtml(forged.secret)}</span>`
    ]);
    g_print('code forged');

    pakSession.step = 'id';
    askPak('name this key in vault? (or x to skip save)', forged.kind === 'aes' ? 'aes-main' : 'api-sk');

    const onKey = async (e) => {
        if (pakBackspaceExit(e)) return;
        if (e.key !== 'Enter') return;
        if (pakSession?.onChoice) return;
        const value = db_ui.input.value.trim();
        db_ui.input.value = '';
        if (value.toLowerCase() === 'x') {
            askPakClipboard(pakSession.data.secret);
            return;
        }

        const step = pakSession.step;
        const data = pakSession.data;

        if (step === 'clip') {
            const v = value.toLowerCase();
            if (v === 'ne' || v === 'never') {
                setClipPref('never');
                print('<span class="pak-dim">clipboard prompt disabled — use pak clip reset to re-enable</span>');
                endPakSession();
                return;
            }
            if (v.startsWith('y')) {
                await copyPakText(pakSession.clipOutput);
            } else if (v !== 'n' && v !== 'no') {
                e_print('type y, n, or ne');
                askPak('copy result to clipboard? (y/n/ne)', 'y');
                return;
            }
            endPakSession();
            return;
        }

        if (step === 'id') {
            const id = value.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-|-$/g, '');
            if (!id) {
                e_print('need a usable id (letters, numbers, - _)');
                askPak('name this key in vault? (or x to skip save)', data.codeKind === 'aes' ? 'aes-main' : 'api-sk');
                return;
            }
            if (findPakKey(id)) {
                y_print(`id <span class="b">${id}</span> exists — will overwrite`);
            }
            data.id = id;
            upsertPakKey({
                id,
                label: data.label || id,
                cipher: data.codeKind === 'aes' ? 'descript' : 'skcode',
                secret: data.secret,
                attrs: {
                    flavor: data.codeKind === 'aes' ? 'AES-256-GCM' : 'SkCode',
                    kind: data.codeKind === 'aes' ? 'aes-gcm' : 'skcode',
                    forged: 'gencode',
                    strength: 'solid'
                },
                createdAt: Date.now()
            });
            g_print(`vault + ${id}`);
            const exported = exportPakKeyToVar(id);
            if (exported.ok) {
                print(`<span class="light-blue">${exported.name}</span><span class="pak-dim"> = </span><span class="muted-teal">(secret)</span> <span class="pak-dim">→ dbnm var</span>`);
            }
            if (data.codeKind === 'aes') {
                print('<span class="pak-dim">use with <span class="light-blue">pak e [\'text\'] ' + escapeHtml(id) + '</span></span>');
            }
            askPakClipboard(data.secret);
        }
    };

    pakSession.onKey = onKey;
    db_ui.input.addEventListener('keydown', onKey);
}

function startDescriptKeyFlow() {
    const onKey = async (e) => {
        if (pakBackspaceExit(e)) return;
        if (e.key !== 'Enter') return;
        if (pakSession?.onChoice) return;
        const value = db_ui.input.value.trim();
        db_ui.input.value = '';
        if (value.toLowerCase() === 'x') {
            cancelPakDialogue('cancelled');
            return;
        }

        const step = pakSession.step;
        const data = pakSession.data;

        if (step === 'clip') {
            const v = value.toLowerCase();
            if (v === 'ne' || v === 'never') {
                setClipPref('never');
                print('<span class="pak-dim">clipboard prompt disabled — use pak clip reset to re-enable</span>');
                endPakSession();
                return;
            }
            if (v.startsWith('y')) {
                await copyPakText(pakSession.clipOutput);
            } else if (v !== 'n' && v !== 'no') {
                e_print('type y, n, or ne');
                askPak('copy result to clipboard? (y/n/ne)', 'y');
                return;
            }
            endPakSession();
            return;
        }

        if (step === 'id') {
            const id = value.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-|-$/g, '');
            if (!id) {
                e_print('need a usable id (letters, numbers, - _)');
                askPak('name this key', 'home-lock');
                return;
            }
            if (findPakKey(id)) {
                y_print(`id <span class="b">${id}</span> exists — will reuse / overwrite on save`);
            }
            data.id = id;
            pakSession.step = 'label';
            askPak('short label? (or Enter to skip)', 'kitchen door');
            return;
        }

        if (step === 'label') {
            data.label = value || data.id;
            pakSession.step = 'secret';
            askPak('secret material for this key (or type gen for GenCode)', 'type a passphrase…');
            return;
        }

        if (step === 'secret') {
            if (!value) {
                e_print('secret cannot be empty');
                askPak('secret material for this key (or type gen for GenCode)', 'type a passphrase…');
                return;
            }
            if (value.toLowerCase() === 'gen' || value.toLowerCase() === 'gencode') {
                try {
                    data.secret = generateAesCode();
                    print(`<span class="pak-dim">forged AES Code · </span><span class="light-blue">${escapeHtml(data.secret)}</span>`);
                } catch (err) {
                    e_print(err.message);
                    return;
                }
            } else {
                data.secret = value;
            }
            pakSession.step = 'save';
            askPak('save this key to vault? (y/n)', 'y');
            return;
        }

        if (step === 'save') {
            const yes = !value || value.toLowerCase().startsWith('y');
            if (yes) {
                upsertPakKey({
                    id: data.id,
                    label: data.label,
                    cipher: data.cipher,
                    secret: data.secret,
                    attrs: {
                        flavor: 'AES-256-GCM',
                        kind: 'aes-gcm',
                        strength: data.secret.length >= 16 ? 'solid' : 'light'
                    },
                    createdAt: Date.now()
                });
                g_print(`vault + ${data.id}`);
                const exported = exportPakKeyToVar(data.id);
                if (exported.ok) {
                    print(`<span class="light-blue">${exported.name}</span><span class="pak-dim"> = </span><span class="muted-teal">(secret)</span> <span class="pak-dim">→ dbnm var</span>`);
                }
            } else {
                print('<span class="pak-dim">ephemeral key — not written to vault</span>');
            }
            pakSession.step = 'mode';
            askPak('seal or open? (e / d)', 'e');
            return;
        }

        if (step === 'mode') {
            const mode = normalizePakMode(value);
            if (!mode) {
                e_print('type e (encrypt) or d (decrypt)');
                askPak('seal or open? (e / d)', 'e');
                return;
            }
            data.mode = mode;
            pakSession.step = 'text';
            askPak(`text to ${mode === 'encrypt' ? 'seal' : 'open'}`, 'type anything…');
            return;
        }

        if (step === 'text') {
            if (!value) {
                e_print('need some text');
                askPak(`text to ${data.mode === 'encrypt' ? 'seal' : 'open'}`, 'type anything…');
                return;
            }
            let out;
            try {
                out = await runCipher(data.mode, value, data.secret, data.cipher);
                showCipherResult(data.mode, value, {
                    fromVault: !!findPakKey(data.id),
                    keyMeta: findPakKey(data.id) || { id: data.id },
                    secret: data.secret
                }, out);
                g_print('run complete');
            } catch (err) {
                e_print(err.message);
                endPakSession();
                return;
            }
            askPakClipboard(out);
        }
    };

    pakSession.onKey = onKey;
    db_ui.input.addEventListener('keydown', onKey);
    pakSession.step = 'id';
    askPak('name this key', 'home-lock');
}

async function oneshotCipher(mode, cmd_split) {
    const parsed = extractQuotedArg(cmd_split, 2);
    if (!parsed.text || !parsed.keyToken) {
        pakQuickCipher(normalizePakMode(mode) || mode);
        return;
    }
    const secretInfo = resolveSecret(parsed.keyToken);
    try {
        const norm = normalizePakMode(mode) || mode;
        const out = await runCipher(norm, parsed.text, secretInfo.secret, secretInfo.keyMeta?.cipher || 'descript');
        pakBanner(norm === 'encrypt' ? 'seal' : 'open');
        showCipherResult(norm, parsed.text, secretInfo, out);
        if (getClipPref() !== 'never') {
            endPakSession();
            _await('pak');
            pakSession = { step: 'clip', clipOutput: out };
            askPak('copy result to clipboard? (y/n/ne)', 'y');
            pakSession.onKey = buildClipOnKey(() => endPakSession());
            db_ui.input.addEventListener('keydown', pakSession.onKey);
        }
    } catch (err) {
        e_print(err.message);
    }
}

function buildClipOnKey(done) {
    return async (e) => {
        if (pakBackspaceExit(e)) return;
        if (e.key !== 'Enter') return;
        const value = db_ui.input.value.trim();
        db_ui.input.value = '';
        const v = value.toLowerCase();
        if (v === 'ne' || v === 'never') {
            setClipPref('never');
            print('<span class="pak-dim">clipboard prompt disabled — pak clip reset to re-enable</span>');
            done();
            return;
        }
        if (v.startsWith('y')) {
            await copyPakText(pakSession.clipOutput);
        } else if (v !== 'n' && v !== 'no') {
            e_print('type y, n, or ne');
            askPak('copy result to clipboard? (y/n/ne)', 'y');
            return;
        }
        done();
    };
}

function pakQuickCipher(mode) {
    endPakSession();
    _await('pak');
    const norm = normalizePakMode(mode) || mode;
    pakSession = { step: 'key', data: { mode: norm, cipher: 'descript' } };
    pakBanner(norm === 'encrypt' ? 'seal · e' : 'open · d');
    askPak('key (vault id, PAKK.id, or secret)', 'home-lock');

    const onKey = async (e) => {
        if (pakBackspaceExit(e)) return;
        if (e.key !== 'Enter') return;
        const value = db_ui.input.value.trim();
        db_ui.input.value = '';
        if (value.toLowerCase() === 'x') {
            cancelPakDialogue('cancelled');
            return;
        }

        if (pakSession.step === 'key') {
            if (!value) {
                e_print('need a key');
                askPak('key (vault id, PAKK.id, or secret)', 'home-lock');
                return;
            }
            pakSession.data.keyToken = value;
            pakSession.step = 'text';
            askPak(`text to ${norm === 'encrypt' ? 'seal' : 'open'}`, 'type anything…');
            return;
        }

        if (pakSession.step === 'text') {
            if (!value) {
                e_print('need some text');
                askPak(`text to ${norm === 'encrypt' ? 'seal' : 'open'}`, 'type anything…');
                return;
            }
            try {
                const secretInfo = resolveSecret(pakSession.data.keyToken);
                const out = await runCipher(norm, value, secretInfo.secret, 'descript');
                showCipherResult(norm, value, secretInfo, out);
                g_print('run complete');
                askPakClipboard(out);
            } catch (err) {
                e_print(err.message);
                endPakSession();
            }
        }
    };

    pakSession.onKey = onKey;
    db_ui.input.addEventListener('keydown', onKey);
}

function keyAddFlow(cmd_split) {
    const idRaw = (cmd_split[3] || '').trim();
    if (!idRaw) {
        e_print('Usage: pak key add &lt;id&gt;');
        return;
    }
    const id = idRaw.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    endPakSession();
    _await('pak-key');
    pakSession = { step: 'secret', data: { id } };
    pakBanner(`key add · ${id}`);
    askPak('secret for this key', 'passphrase…');

    const onKey = async (e) => {
        if (pakBackspaceExit(e)) return;
        if (e.key !== 'Enter') return;
        const value = db_ui.input.value.trim();
        db_ui.input.value = '';
        if (value.toLowerCase() === 'x') {
            cancelPakDialogue('cancelled');
            return;
        }
        if (pakSession.step === 'secret') {
            if (!value) {
                e_print('secret cannot be empty');
                return;
            }
            pakSession.data.secret = value;
            pakSession.step = 'label';
            askPak('label (optional)', id);
            return;
        }
        if (pakSession.step === 'label') {
            upsertPakKey({
                id,
                label: value || id,
                cipher: 'descript',
                secret: pakSession.data.secret,
                attrs: {
                    flavor: 'AES-256-GCM',
                    kind: 'aes-gcm',
                    strength: pakSession.data.secret.length >= 16 ? 'solid' : 'light'
                },
                createdAt: Date.now()
            });
            g_print(`vault + ${id}`);
            const exported = exportPakKeyToVar(id);
            if (exported.ok) {
                print(`<span class="light-blue">${exported.name}</span><span class="pak-dim"> = </span><span class="muted-teal">(secret)</span> <span class="pak-dim">→ dbnm var</span>`);
            }
            endPakSession();
        }
    };
    pakSession.onKey = onKey;
    db_ui.input.addEventListener('keydown', onKey);
}

function handlePak(_, cmd_split) {
    const action = (cmd_split[1] || '').toLowerCase();

    if (!action || action === 'help' || action === 'h') {
        pakHelp();
        return;
    }
    if (action === 'new' || action === 'init') {
        pakNewDialogue();
        return;
    }
    if (action === 'gencode' || action === 'gen' || action === 'forge') {
        const kindArg = (cmd_split[2] || '').trim();
        pakGenCodeFlow(kindArg || null);
        return;
    }
    if (action === 'clip' && (cmd_split[2] || '').toLowerCase() === 'reset') {
        setClipPref('ask');
        g_print('clipboard prompt re-enabled');
        return;
    }
    if (action === 'keys' || action === 'ls' || action === 'list') {
        listKeys();
        return;
    }
    if (action === 'key') {
        const sub = (cmd_split[2] || '').toLowerCase();
        if (sub === 'add' || sub === 'set') {
            keyAddFlow(cmd_split);
            return;
        }
        if (sub === 'rm' || sub === 'remove' || sub === 'del') {
            const id = (cmd_split[3] || '').trim();
            if (!id) {
                e_print('Usage: pak key rm &lt;id&gt;');
                return;
            }
            if (!findPakKey(id)) {
                e_print(`no key named ${id}`);
                return;
            }
            removePakKey(id);
            y_print(`vault − ${id}`);
            return;
        }
        e_print('Usage: pak key add|rm &lt;id&gt;');
        return;
    }
    if (action === 'var' || action === 'vars') {
        const sub = (cmd_split[2] || '').toLowerCase();
        const arg = (cmd_split[3] || '').trim();

        if (sub === 'export' || sub === 'push' || sub === 'to') {
            if (!arg || arg === 'all') {
                const res = exportAllPakKeysToVars();
                if (!res.ok) {
                    e_print(res.error);
                    return;
                }
                g_print(`exported ${res.count} key${res.count === 1 ? '' : 's'} to dbnm vars`);
                res.names.forEach((name) => {
                    print(`<span class="light-blue">${escapeHtml(name)}</span><span class="pak-dim"> = </span><span class="muted-teal">(secret)</span>`);
                });
                print('<span class="pak-dim">view with <span class="light-blue">var vars</span></span>');
                return;
            }
            const res = exportPakKeyToVar(arg);
            if (!res.ok) {
                e_print(res.error);
                return;
            }
            g_print(`<span class="light-blue">${res.name}</span><span class="pak-dim"> = </span><span class="muted-teal">(secret)</span>`);
            print('<span class="pak-dim">stored as <span class="light-blue">PAKK.&lt;id&gt;</span> — use <span class="light-blue">var vars</span> or <span class="light-blue">pak encrypt … home-lock</span></span>');
            return;
        }

        if (sub === 'import' || sub === 'pull' || sub === 'from') {
            const varName = arg;
            const vaultId = (cmd_split[4] || '').trim();
            const res = importVarToPakKey(varName, vaultId || varName);
            if (!res.ok) {
                e_print(res.error);
                return;
            }
            g_print(`vault + ${res.id} <span class="pak-dim">from var</span> <span class="light-blue">${escapeHtml(res.varName)}</span>`);
            return;
        }

        if (sub && sub !== 'help') {
            const res = exportPakKeyToVar(sub);
            if (!res.ok) {
                e_print(res.error);
                return;
            }
            g_print(`<span class="light-blue">${res.name}</span><span class="pak-dim"> = </span><span class="muted-teal">(secret)</span>`);
            print('<span class="pak-dim">→ dbnm global var as <span class="light-blue">PAKK.&lt;id&gt;</span></span>');
            return;
        }

        e_print('Usage: pak var export &lt;id&gt; | pak var export all | pak var import &lt;name&gt; [id]');
        return;
    }
    if (action === 'encrypt' || action === 'e' || action === 'seal') {
        oneshotCipher('encrypt', cmd_split);
        return;
    }
    if (action === 'decrypt' || action === 'd' || action === 'open') {
        oneshotCipher('decrypt', cmd_split);
        return;
    }

    e_print(`unknown pak command: ${action}`);
    print('<span class="pak-dim">try <span class="light-blue">pak help</span></span>');
}

_reg('pak', handlePak);
_reg('pakeger', handlePak);
_reg('paKeger', handlePak);

const registerPkg = typeof registerPkgContents === 'function'
    ? registerPkgContents
    : window.registerPkgContents;

if (typeof registerPkg === 'function') {
    const manifest = {
        version: PKG.version,
        desc: PKG.desc,
        files: [
            { path: 'pakeger.js', type: 'module' }
        ]
    };
    PKG.tags.forEach((tag) => registerPkg(tag, manifest));
}
