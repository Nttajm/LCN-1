const PKG = {
    name: 'registry',
    version: '1.0.0',
    desc: 'foundation asset registry for dbnm',
    license: 'MIT',
    asciiPath: 'foundation/assets/registry/ascii.txt'
};

const REG_FIREBASE = {
    apiKey: 'AIzaSyDS2IY0dLqq5ClToEg3DwIc493GC2v9epE',
    authDomain: 'dbnm-lcn.firebaseapp.com',
    projectId: 'dbnm-lcn',
    storageBucket: 'dbnm-lcn.firebasestorage.app',
    messagingSenderId: '106102379329',
    appId: '1:106102379329:web:58a1edefdfab66481007c0',
    measurementId: 'G-110K9JF2N0'
};

let regFb = null;
let regAuth = null;
let regDb = null;
let regStorage = null;
let regUserDoc = null;

function loadStylesheets(stylesheets) {
    stylesheets.forEach(href => {
        document.head.appendChild(Object.assign(document.createElement('link'), {
            rel: 'stylesheet',
            href
        }));
    });
}

loadStylesheets(['foundation/assets/registry/registry.css']);

registerPkgContents('registry', {
    version: PKG.version,
    desc: PKG.desc,
    files: [
        { path: 'registry.js', type: 'module' },
        { path: 'assets/registry/ascii.txt', type: 'asset' },
        { path: 'assets/registry/registry.css', type: 'style' }
    ]
});

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function npmTag() {
    return '<span class="reg-npm"></span>';
}

function getRegistryUtil() {
    return userData.cmdUtil.find(u =>
        (u.linkClass === 'f' || u.linkClass === 'foundation') && u.link === 'registry'
    );
}

function markInstallShown() {
    const util = getRegistryUtil();
    if (util) {
        util.installShown = true;
        saveData();
    }
}

function shouldShowInstall() {
    const util = getRegistryUtil();
    return !util || !util.installShown;
}

async function maybeFirstInstall() {
    if (!shouldShowInstall()) return;
    await runInstall();
    markInstallShown();
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        ? `<pre class="reg-ascii">${escapeHtml(ascii)}</pre>`
        : `<span class="red">asset not found: ${PKG.asciiPath}</span>`;
    if (db_ui.output) {
        db_ui.output.innerHTML += `<div class="reg-banner g-3">${body}</div>`;
    }
}

async function runInstall() {
    const elapsed = (Math.random() * 0.9 + 0.7).toFixed(1);
    y_print(`<span class="reg-scope">+</span> <span class="b">${PKG.name}@${PKG.version}</span>`);
    c_print(`<span class="reg-dim">GET</span> foundation/${PKG.name}`, npmTag());
    await delay(420);
    c_print('<span class="reg-dim">200</span> registry manifest', npmTag());
    await delay(380);
    g_print('reify:registry');
    makeLoader(0);
    await delay(520);
    g_print('fetch assets/registry/ascii.txt');
    await delay(640);

    const ascii = await fetchAscii();
    makeLoader('rm');
    await delay(280);

    showAscii(ascii);

    print(`<div class="reg-panel"><span class="reg-tree">└─</span> <span class="green b">${PKG.name}@${PKG.version}</span> <span class="reg-dim">foundation module</span></div>`);
    g_print(`added 1 package in ${elapsed}s`);
    print(`<div class="reg-meta"><span class="green b">${PKG.name}@${PKG.version}</span>`);
    print('<div class="reg-dim">registry login · registry publish · reg i &lt;name&gt;</div>');
}

function pkgIdFromFileName(name) {
    const base = String(name || '').trim().replace(/\.js$/i, '');
    return base.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function ensureRegFirebase() {
    if (regFb) return regFb;

    const [
        { initializeApp, getApps },
        { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged },
        { getFirestore, doc, getDoc, setDoc, serverTimestamp },
        { getStorage, ref, uploadBytes, getDownloadURL }
    ] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js'),
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js')
    ]);

    regFb = {
        initializeApp,
        getApps,
        getAuth,
        GoogleAuthProvider,
        signInWithPopup,
        signOut,
        onAuthStateChanged,
        getFirestore,
        doc,
        getDoc,
        setDoc,
        serverTimestamp,
        getStorage,
        ref,
        uploadBytes,
        getDownloadURL
    };

    const app = regFb.getApps().length
        ? regFb.getApps()[0]
        : regFb.initializeApp(REG_FIREBASE);
    regAuth = regFb.getAuth(app);
    regDb = regFb.getFirestore(app);
    regStorage = regFb.getStorage(app);
    return regFb;
}

async function refreshUserDoc() {
    await ensureRegFirebase();
    const user = regAuth.currentUser;
    if (!user) {
        regUserDoc = null;
        return null;
    }
    const snap = await regFb.getDoc(regFb.doc(regDb, 'users', user.uid));
    regUserDoc = snap.exists() ? snap.data() : null;
    return regUserDoc;
}

async function upsertUserRequest(user) {
    await ensureRegFirebase();
    const refUser = regFb.doc(regDb, 'users', user.uid);
    const snap = await regFb.getDoc(refUser);
    const isAdminEmail = user.email === 'joelmulonde81@gmail.com';
    if (!snap.exists()) {
        await regFb.setDoc(refUser, {
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            verified: isAdminEmail,
            requestedAt: regFb.serverTimestamp()
        });
    } else if (isAdminEmail && !snap.data().verified) {
        await regFb.setDoc(refUser, {
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            verified: true,
            requestedAt: regFb.serverTimestamp()
        }, { merge: true });
    } else {
        await regFb.setDoc(refUser, {
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            requestedAt: regFb.serverTimestamp()
        }, { merge: true });
    }
    return refreshUserDoc();
}

async function registryLogin() {
    await ensureRegFirebase();
    y_print('Opening Google sign-in…');
    try {
        const provider = new regFb.GoogleAuthProvider();
        const result = await regFb.signInWithPopup(regAuth, provider);
        await upsertUserRequest(result.user);
        const docData = await refreshUserDoc();
        g_print(`Signed in as ${result.user.email}`);
        if (docData?.verified) {
            g_print('Publisher status: verified — you can run registry publish');
        } else {
            y_print('Publisher status: pending — wait for admin approval (man/xcx.html)');
        }
    } catch (e) {
        e_print(`Login failed: ${e.message}`);
    }
}

async function registryLogout() {
    await ensureRegFirebase();
    await regFb.signOut(regAuth);
    regUserDoc = null;
    print('Signed out of registry.');
}

async function registryStatus() {
    await ensureRegFirebase();
    const user = regAuth.currentUser;
    if (!user) {
        print('Not signed in. Run <span class="light-blue">registry login</span>');
        return;
    }
    const docData = await refreshUserDoc();
    print(`<br><span class="green b">${user.email}</span>`);
    print(`uid: ${user.uid}`);
    print(`verified: ${docData?.verified ? '<span class="green">yes</span>' : '<span class="yellow">pending</span>'}`);
    if (!docData?.verified) {
        print('<span class="reg-dim">Admin must approve you at man/xcx.html before publishing.</span>');
    }
}

function pickJsFile() {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.js,application/javascript,text/javascript';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.addEventListener('change', () => {
            const file = input.files && input.files[0] ? input.files[0] : null;
            document.body.removeChild(input);
            resolve(file);
        }, { once: true });
        input.click();
    });
}

async function pickAndValidateJsFile() {
    const file = await pickJsFile();
    if (!file) return null;

    if (!/\.js$/i.test(file.name)) {
        e_print('Only .js files are allowed.');
        return null;
    }

    const pkgId = pkgIdFromFileName(file.name);
    if (!pkgId) {
        e_print('Invalid file name. Use letters, numbers, - or _.');
        return null;
    }

    if (file.size > 512 * 1024) {
        e_print('File too large (max 512KB).');
        return null;
    }

    return { file, pkgId, storageFileName: `${pkgId}.js`, storagePath: `packages/${pkgId}.js` };
}

async function uploadPackageFile(user, file, pkgId, storagePath, storageFileName, existing) {
    const storageRef = regFb.ref(regStorage, storagePath);
    await regFb.uploadBytes(storageRef, file, {
        contentType: 'application/javascript',
        customMetadata: {
            ownerUid: user.uid,
            ownerEmail: user.email || ''
        }
    });
    const downloadUrl = await regFb.getDownloadURL(storageRef);
    const payload = {
        name: pkgId,
        fileName: storageFileName,
        ownerUid: existing?.ownerUid || user.uid,
        ownerEmail: existing?.ownerEmail || user.email || '',
        downloadUrl,
        storagePath,
        size: file.size,
        updatedAt: regFb.serverTimestamp()
    };
    if (!existing) {
        payload.createdAt = regFb.serverTimestamp();
        await regFb.setDoc(regFb.doc(regDb, 'packages', pkgId), payload);
    } else {
        await regFb.setDoc(regFb.doc(regDb, 'packages', pkgId), payload, { merge: true });
    }
    return downloadUrl;
}

function withCacheBust(url, version) {
    if (!url) return url;
    const v = version || Date.now();
    return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(String(v));
}

async function requirePublisher() {
    await ensureRegFirebase();
    const user = regAuth.currentUser;
    if (!user) {
        e_print('Sign in first: registry login');
        return null;
    }
    const docData = await refreshUserDoc();
    if (!docData?.verified && user.email !== 'joelmulonde81@gmail.com') {
        e_print('Account not verified. Ask admin to approve you at man/xcx.html');
        return null;
    }
    return user;
}

async function registryPublish() {
    const user = await requirePublisher();
    if (!user) return;

    y_print('Select a .js file — the file name is the public package id.');
    print('<span class="reg-dim">Example: funny.js → downloaders run: reg i funny</span>');
    print('<span class="reg-dim">Names must be unique. To replace an existing package: registry update</span>');

    const picked = await pickAndValidateJsFile();
    if (!picked) {
        print('Publish cancelled.');
        return;
    }

    const { file, pkgId, storageFileName, storagePath } = picked;
    y_print(`Publishing <span class="b">${pkgId}</span>…`);
    makeLoader(0);

    try {
        const snap = await regFb.getDoc(regFb.doc(regDb, 'packages', pkgId));
        if (snap.exists()) {
            makeLoader('rm');
            e_print(`Name <span class="b">${pkgId}</span> is already taken.`);
            print(`Use <span class="light-blue">registry update</span> to replace your package (owner only).`);
            return;
        }

        await uploadPackageFile(user, file, pkgId, storagePath, storageFileName, null);
        makeLoader('rm');
        g_print(`Published ${pkgId}`);
        print(`<div class="reg-panel"><span class="reg-tree">└─</span> <span class="green b">${pkgId}</span> <span class="reg-dim">${storageFileName}</span></div>`);
        print(`Others install with: <span class="light-blue">reg i ${pkgId}</span>`);
        registerPkgContents(pkgId, {
            version: 'remote',
            desc: `Published by ${user.email}`,
            files: [{ path: storageFileName, type: 'module' }]
        });
    } catch (e) {
        makeLoader('rm');
        e_print(`Publish failed: ${e.message}`);
    }
}

async function registryUpdate() {
    const user = await requirePublisher();
    if (!user) return;

    y_print('Select the .js file to update — name must match an existing package you own.');
    print('<span class="reg-dim">Example: update funny.js → overwrites the published funny package</span>');

    const picked = await pickAndValidateJsFile();
    if (!picked) {
        print('Update cancelled.');
        return;
    }

    const { file, pkgId, storageFileName, storagePath } = picked;
    y_print(`Updating <span class="b">${pkgId}</span>…`);
    makeLoader(0);

    try {
        const snap = await regFb.getDoc(regFb.doc(regDb, 'packages', pkgId));
        if (!snap.exists()) {
            makeLoader('rm');
            e_print(`Package <span class="b">${pkgId}</span> does not exist.`);
            print(`Use <span class="light-blue">registry publish</span> to create it first.`);
            return;
        }

        const existing = snap.data();
        const isAdmin = user.email === 'joelmulonde81@gmail.com';
        if (existing.ownerUid !== user.uid && !isAdmin) {
            makeLoader('rm');
            e_print(`You do not own <span class="b">${pkgId}</span>. Names cannot be taken over.`);
            return;
        }

        const downloadUrl = await uploadPackageFile(user, file, pkgId, storagePath, storageFileName, existing);
        makeLoader('rm');
        g_print(`Updated ${pkgId}`);
        print(`<div class="reg-panel"><span class="reg-tree">└─</span> <span class="green b">${pkgId}</span> <span class="reg-dim">${storageFileName}</span></div>`);
        print(`Others get the new file with: <span class="light-blue">reg i ${pkgId}</span>`);

        const local = userData.cmdUtil.find(u => u.linkClass === 'reg' && u.link === pkgId);
        if (local) {
            local.downloadUrl = downloadUrl;
            local.storagePath = storagePath;
            saveData();
        }
        registerPkgContents(pkgId, {
            version: 'remote',
            desc: `Updated by ${user.email}`,
            files: [{ path: storageFileName, type: 'module' }]
        });
    } catch (e) {
        makeLoader('rm');
        e_print(`Update failed: ${e.message}`);
    }
}

async function installRemotePackage(name) {
    const pkgId = pkgIdFromFileName(name);
    if (!pkgId) {
        e_print('Usage: reg i &lt;file-name&gt;');
        return;
    }

    await ensureRegFirebase();
    y_print(`Looking up <span class="b">${pkgId}</span>…`);
    makeLoader(0);

    try {
        const snap = await regFb.getDoc(regFb.doc(regDb, 'packages', pkgId));
        makeLoader('rm');
        if (!snap.exists()) {
            e_print(`Package not found: ${pkgId}`);
            return;
        }
        const pkg = snap.data();
        if (!pkg.downloadUrl) {
            e_print(`Package ${pkgId} has no download URL.`);
            return;
        }

        const bust = pkg.updatedAt?.toMillis?.() || pkg.updatedAt?.seconds || Date.now();
        const loadUrl = withCacheBust(pkg.downloadUrl, bust);

        const already = userData.cmdUtil.find(u =>
            u.linkClass === 'reg' && u.link.toLowerCase() === pkgId
        );
        if (already) {
            already.downloadUrl = pkg.downloadUrl;
            already.storagePath = pkg.storagePath;
            saveData();
            y_print(`${pkgId} already listed — reloading…`);
        } else {
            userData.cmdUtil.push({
                linkClass: 'reg',
                link: pkgId,
                index: nextUtilIndex(),
                downloadUrl: pkg.downloadUrl,
                storagePath: pkg.storagePath
            });
            saveData();
        }

        registerPkgContents(pkgId, {
            version: 'remote',
            desc: `by ${pkg.ownerEmail || 'unknown'}`,
            files: [{ path: pkg.fileName || `${pkgId}.js`, type: 'module' }]
        });

        await loadRemoteUtil(pkgId, loadUrl);
        g_print(`Installed ${pkgId}`);
        print(`<span class="reg-dim">run / dir info ${already ? already.index : userData.cmdUtil[userData.cmdUtil.length - 1].index}</span>`);
    } catch (e) {
        makeLoader('rm');
        e_print(`Install failed: ${e.message}`);
    }
}

async function loadRemoteUtil(pkgId, downloadUrl) {
    return new Promise((resolve, reject) => {
        const scriptTag = document.createElement('script');
        scriptTag.src = withCacheBust(downloadUrl);
        scriptTag.async = true;
        scriptTag.onload = () => {
            const util = userData.cmdUtil.find(u => u.linkClass === 'reg' && u.link === pkgId);
            if (util) {
                util.loaded = true;
                saveData();
            }
            resolve(true);
        };
        scriptTag.onerror = () => {
            const util = userData.cmdUtil.find(u => u.linkClass === 'reg' && u.link === pkgId);
            if (util) {
                util.loaded = false;
                saveData();
            }
            reject(new Error(`Failed to execute ${pkgId}`));
        };
        document.body.appendChild(scriptTag);
    });
}

window.__dbnmLoadRemoteUtil = loadRemoteUtil;

_reg('registry', async (_, cmd_split) => {
    const action = (cmd_split[1] || '').toLowerCase();

    if (action === 'info') {
        print('<br><span class="green b">registry@' + PKG.version + '</span>');
        print('<span class="reg-dim">root:</span> foundation/');
        print('<span class="reg-dim">cloud:</span> dbnm-lcn');
        print('<span class="reg-dim">commands:</span> login · logout · status · publish · update');
        print('<span class="reg-dim">install:</span> reg i &lt;name&gt;');
        return;
    }
    if (action === 'login') {
        await registryLogin();
        return;
    }
    if (action === 'logout') {
        await registryLogout();
        return;
    }
    if (action === 'status') {
        await registryStatus();
        return;
    }
    if (action === 'publish' || action === 'p') {
        await registryPublish();
        return;
    }
    if (action === 'update' || action === 'u') {
        await registryUpdate();
        return;
    }
    if (shouldShowInstall()) {
        maybeFirstInstall();
    } else {
        g_print(`${PKG.name}@${PKG.version} ready`);
        print('<span class="reg-dim">registry login · registry publish · registry update · reg i &lt;name&gt;</span>');
    }
});

_reg('reg', async (_, cmd_split) => {
    const action = (cmd_split[1] || '').toLowerCase();
    if (action === 'i' || action === 'install') {
        await installRemotePackage(cmd_split[2]);
        return;
    }
    if (action === 'login') {
        await registryLogin();
        return;
    }
    if (action === 'logout') {
        await registryLogout();
        return;
    }
    if (action === 'status') {
        await registryStatus();
        return;
    }
    if (action === 'publish' || action === 'p') {
        await registryPublish();
        return;
    }
    if (action === 'update' || action === 'u') {
        await registryUpdate();
        return;
    }
    print('Usage:');
    print('  reg login');
    print('  reg status');
    print('  reg publish');
    print('  reg update');
    print('  reg i &lt;file-name&gt;');
});

maybeFirstInstall();
