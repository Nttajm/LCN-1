// ══════════════════════════════════════════════════════════════
// JOSU – Auth Layer (Firebase Auth + Firestore user data)
// Depends on: firebase-app-compat, firebase-auth-compat,
//             firebase-firestore-compat, and firebase-db.js
// ══════════════════════════════════════════════════════════════

const JosuAuth = (() => {
    // Ensure Firebase is initialized (firebase-db.js does this already)
    if (!firebase.apps.length) {
        firebase.initializeApp({
            apiKey: "AIzaSyBCaGiPCM-PrrA4zwnahDYyayltI2QVOdA",
            authDomain: "overunder-ths.firebaseapp.com",
            projectId: "overunder-ths",
            storageBucket: "overunder-ths.firebasestorage.app",
            messagingSenderId: "690530120785",
            appId: "1:690530120785:web:bb1f65c6cb243132cb7470"
        });
    }

    const auth = firebase.auth();
    const db   = firebase.firestore();
    const USERS_COL = 'josu_users';

    let _currentUser = null;
    let _userData    = null;
    const _listeners = [];

    // ── Auth state listener ──────────────────────────────────
    auth.onAuthStateChanged(async (user) => {
        _currentUser = user;
        if (user) {
            _userData = await _loadOrCreateUserDoc(user);
            _syncLocalToCloud(user.uid);
        } else {
            _userData = null;
        }
        _listeners.forEach(fn => fn(user, _userData));
        _renderAuthBar();
    });

    function onAuthChange(fn) {
        _listeners.push(fn);
        if (_currentUser !== undefined) fn(_currentUser, _userData);
    }

    function getUser()     { return _currentUser; }
    function getUserData() { return _userData; }
    function isSignedIn()  { return !!_currentUser; }

    // ── Google sign-in / sign-out ────────────────────────────
    async function signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await auth.signInWithPopup(provider);
        return cred.user;
    }

    async function signOut() {
        await auth.signOut();
    }

    // ── Firestore user document ──────────────────────────────
    async function _loadOrCreateUserDoc(user) {
        const ref = db.collection(USERS_COL).doc(user.uid);
        const snap = await ref.get();
        if (snap.exists) return snap.data();

        const doc = {
            uid: user.uid,
            displayName: user.displayName || user.email.split('@')[0],
            email: user.email,
            createdAt: new Date().toISOString(),
            downloadedSongs: [],
            projects: {}
        };
        await ref.set(doc);
        return doc;
    }

    // ── Sync localStorage data → Firestore on sign-in ───────
    async function _syncLocalToCloud(uid) {
        const ref = db.collection(USERS_COL).doc(uid);

        // Migrate downloaded song IDs
        try {
            const dlRaw = localStorage.getItem('josu_downloaded_songs');
            if (dlRaw) {
                const localIds = JSON.parse(dlRaw);
                if (localIds.length > 0) {
                    await ref.update({
                        downloadedSongs: firebase.firestore.FieldValue.arrayUnion(...localIds)
                    });
                }
            }
        } catch (e) { console.warn('Auth sync: downloaded songs error', e); }

        // Migrate project store
        try {
            const projRaw = localStorage.getItem('josu_projects_v2');
            if (projRaw) {
                const projData = JSON.parse(projRaw);
                if (projData.songs && Object.keys(projData.songs).length > 0) {
                    const snap = await ref.get();
                    const existing = snap.exists ? (snap.data().projects || {}) : {};
                    const merged = { ...existing };
                    for (const [id, song] of Object.entries(projData.songs)) {
                        if (!merged[id]) {
                            merged[id] = song;
                        } else {
                            const local  = new Date(song.updatedAt || 0).getTime();
                            const remote = new Date(merged[id].updatedAt || 0).getTime();
                            if (local > remote) merged[id] = song;
                        }
                    }
                    await ref.update({ projects: merged });
                }
            }
        } catch (e) { console.warn('Auth sync: projects error', e); }

        // Reload user data after sync
        const snap = await ref.get();
        _userData = snap.exists ? snap.data() : _userData;
    }

    // ── Cloud data helpers (used by store.js) ────────────────
    async function saveProjectsToCloud(projectsObj) {
        if (!_currentUser) return;
        const ref = db.collection(USERS_COL).doc(_currentUser.uid);
        await ref.update({ projects: projectsObj });
    }

    async function loadProjectsFromCloud() {
        if (!_currentUser) return null;
        const ref = db.collection(USERS_COL).doc(_currentUser.uid);
        const snap = await ref.get();
        if (!snap.exists) return null;
        return snap.data().projects || {};
    }

    async function saveDownloadedToCloud(idsArray) {
        if (!_currentUser) return;
        const ref = db.collection(USERS_COL).doc(_currentUser.uid);
        await ref.update({ downloadedSongs: idsArray });
    }

    async function loadDownloadedFromCloud() {
        if (!_currentUser) return null;
        const ref = db.collection(USERS_COL).doc(_currentUser.uid);
        const snap = await ref.get();
        if (!snap.exists) return null;
        return snap.data().downloadedSongs || [];
    }

    // ══════════════════════════════════════════════════════════
    // AUTH BAR RENDERING
    // ══════════════════════════════════════════════════════════
    // SVG icons used in the bar
    const _ICON = {
        person: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#666"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`,
        settings: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z"/></svg>`,
    };

    function _injectAuthBarCSS() {
        if (document.getElementById('josu-auth-css')) return;
        const style = document.createElement('style');
        style.id = 'josu-auth-css';
        style.textContent = `
.josu-auth-bar {
    position: fixed; top: 0; left: 0; right: 0;
    height: 38px;
    background: #1a1a1e;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 12px;
    z-index: 100000;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 13px;
    color: #ccc;
    border-bottom: 1px solid #2a2a30;
    box-sizing: border-box;
}
.josu-auth-bar .auth-left {
    display: flex; align-items: center; gap: 10px;
}
.josu-auth-bar .auth-right {
    display: flex; align-items: center; gap: 10px;
}
/* squircle pfp */
.josu-auth-bar .auth-pfp {
    width: 26px; height: 26px;
    border-radius: 7px;
    object-fit: cover;
    background: #2a2a32;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; flex-shrink: 0;
    cursor: pointer;
}
.josu-auth-bar .auth-pfp img {
    width: 100%; height: 100%; object-fit: cover;
    border-radius: 7px;
}
.josu-auth-bar .auth-pfp-placeholder {
    width: 26px; height: 26px; border-radius: 7px;
    background: #2a2a32; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0; cursor: pointer;
}
.josu-auth-bar .auth-user-name {
    color: #e8e8e8; font-weight: 600; font-size: 12px;
}
.josu-auth-bar .auth-time {
    color: #999; font-size: 12px; font-variant-numeric: tabular-nums;
}
.josu-auth-bar .auth-icon-btn {
    background: none; border: none; color: #777; cursor: pointer;
    padding: 4px; border-radius: 4px; display: flex;
    align-items: center; justify-content: center;
    transition: color .15s, background .15s;
}
.josu-auth-bar .auth-icon-btn:hover { color: #ddd; background: #2a2a32; }
.josu-auth-bar .auth-btn {
    background: #2d2d35; color: #ddd; border: 1px solid #3a3a44;
    padding: 4px 14px; border-radius: 4px; cursor: pointer;
    font-size: 12px; font-family: inherit; transition: background .15s;
}
.josu-auth-bar .auth-btn:hover { background: #3a3a44; }
.josu-auth-bar .auth-btn.signout { background: transparent; border-color: #444; color: #999; font-size: 11px; }
.josu-auth-bar .auth-btn.signout:hover { color: #e94560; border-color: #e94560; }
.josu-auth-bar .auth-signin-link {
    display: flex; align-items: center; gap: 8px;
    cursor: pointer; color: #aaa; font-size: 12px;
    transition: color .15s;
}
.josu-auth-bar .auth-signin-link:hover { color: #fff; }
.josu-auth-bar .auth-signin-link:hover .auth-pfp-placeholder { background: #3a3a44; }

/* Push page content down so it's not hidden behind auth bar */
.josu-auth-spacer { height: 38px; }

/* Adjust sticky/fixed elements to sit below the auth bar */
body:has(.josu-auth-bar) .browse-header { top: 38px; }
body:has(.josu-auth-bar) .top-bar { margin-top: 0; }
`;
        document.head.appendChild(style);
    }

    function _renderAuthBar() {
        _injectAuthBarCSS();

        let bar = document.getElementById('josu-auth-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'josu-auth-bar';
            bar.className = 'josu-auth-bar';
            document.body.prepend(bar);

            if (!document.getElementById('josu-auth-spacer')) {
                const spacer = document.createElement('div');
                spacer.id = 'josu-auth-spacer';
                spacer.className = 'josu-auth-spacer';
                bar.after(spacer);
            }
        }

        if (_currentUser) {
            const name = _currentUser.displayName || _currentUser.email.split('@')[0];
            const photoUrl = _currentUser.photoURL || '';
            const pfpHtml = photoUrl
                ? `<div class="auth-pfp"><img src="${_esc(photoUrl)}" alt="" referrerpolicy="no-referrer"></div>`
                : `<div class="auth-pfp-placeholder">${_ICON.person}</div>`;

            bar.innerHTML = `
                <div class="auth-left">
                    ${pfpHtml}
                    <span class="auth-user-name">${_esc(name)}</span>
                    <span class="auth-time" id="josuAuthClock"></span>
                </div>
                <div class="auth-right">
                    <button class="auth-icon-btn" id="josuSettingsBtn" title="Settings">${_ICON.settings}</button>
                    <button class="auth-btn signout" id="josuSignOutBtn">Sign Out</button>
                </div>`;
            document.getElementById('josuSignOutBtn').addEventListener('click', () => signOut());
            _startClock();
        } else {
            bar.innerHTML = `
                <div class="auth-left">
                    <div class="auth-signin-link" id="josuSignInBtn">
                        <div class="auth-pfp-placeholder">${_ICON.person}</div>
                        <span>Sign in</span>
                    </div>
                </div>
                <div class="auth-right">
                    <button class="auth-icon-btn" id="josuSettingsBtn" title="Settings">${_ICON.settings}</button>
                    <span class="auth-time" id="josuAuthClock"></span>
                </div>`;
            document.getElementById('josuSignInBtn').addEventListener('click', async () => {
                const el = document.getElementById('josuSignInBtn');
                if (el) el.style.opacity = '0.5';
                try {
                    await signInWithGoogle();
                } catch (e) {
                    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
                        console.error('Google sign-in error:', e);
                    }
                    if (el) el.style.opacity = '';
                }
            });
            _startClock();
        }
    }

    // ── Clock ────────────────────────────────────────────────
    let _clockInterval = null;

    function _startClock() {
        _stopClock();
        _tickClock();
        _clockInterval = setInterval(_tickClock, 1000);
    }

    function _stopClock() {
        if (_clockInterval) { clearInterval(_clockInterval); _clockInterval = null; }
    }

    function _tickClock() {
        const el = document.getElementById('josuAuthClock');
        if (!el) return;
        const now = new Date();
        const h = now.getHours();
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        el.textContent = `${h12}:${m}:${s} ${ampm}`;
    }

    function _esc(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    return {
        onAuthChange,
        getUser,
        getUserData,
        isSignedIn,
        signInWithGoogle,
        signOut,
        saveProjectsToCloud,
        loadProjectsFromCloud,
        saveDownloadedToCloud,
        loadDownloadedFromCloud
    };
})();
