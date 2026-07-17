import {
    auth,
    db,
    googleProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    limit as queryLimit,
    orderBy,
    onSnapshot,
    serverTimestamp
} from './firebase.js';

(function (global) {
    'use strict';

    var PROJECTS_COLLECTION = 'crossshare_projects';
    var LOCAL_STORAGE_KEY = 'crossshare_streams';
    var DEFAULT_CONFIG = {
        workerUrl: '',
        publicMediaBaseUrl: '',
        usePopupAuth: true
    };

    function mergeConfig() {
        var fromWindow = (global.CROSSSHARE_CONFIG && typeof global.CROSSSHARE_CONFIG === 'object')
            ? global.CROSSSHARE_CONFIG
            : {};
        return {
            workerUrl: String(fromWindow.workerUrl || DEFAULT_CONFIG.workerUrl || '').replace(/\/$/, ''),
            publicMediaBaseUrl: String(fromWindow.publicMediaBaseUrl || DEFAULT_CONFIG.publicMediaBaseUrl || '').replace(/\/$/, ''),
            usePopupAuth: fromWindow.usePopupAuth !== false
        };
    }

    var config = mergeConfig();
    var currentUser = null;
    var authReady = false;
    var authWaiters = [];
    var authListeners = [];

    function nowIso() {
        return new Date().toISOString();
    }

    function createId() {
        if (global.crypto && typeof global.crypto.randomUUID === 'function') {
            return global.crypto.randomUUID();
        }
        return 'cs_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }

    function stripUndefined(value) {
        if (value == null || typeof value !== 'object') return value;
        if (Array.isArray(value)) {
            return value.map(stripUndefined);
        }
        var out = {};
        Object.keys(value).forEach(function (key) {
            var v = value[key];
            if (v === undefined) return;
            out[key] = stripUndefined(v);
        });
        return out;
    }

    function projectToFirestore(project) {
        var copy = stripUndefined(JSON.parse(JSON.stringify(project || {})));
        delete copy._localOnly;
        copy.updatedAt = nowIso();
        return copy;
    }

    function projectFromFirestore(snapshot) {
        if (!snapshot || !snapshot.exists()) return null;
        var data = snapshot.data() || {};
        data.id = data.id || snapshot.id;
        return data;
    }

    function buildDefaultProject(options) {
        options = options || {};
        var id = options.id || createId();
        var name = options.name || 'Untitled Stream';
        var user = options.user || currentUser;
        return {
            id: id,
            name: name,
            pin: options.pin || null,
            created: options.created || nowIso(),
            createdAt: options.createdAt || nowIso(),
            updatedAt: nowIso(),
            ownerId: user ? user.uid : null,
            ownerEmail: user ? (user.email || null) : null,
            managerLink: 'manager.html?id=' + encodeURIComponent(id),
            customEmptyImage: !!options.customEmptyImage,
            emptyImageUrl: options.emptyImageUrl || null,
            emptyImageKey: options.emptyImageKey || null,
            emptyImageSize: Math.max(0, Number(options.emptyImageSize) || 0),
            cloudStorageBytes: Math.max(0, Number(options.cloudStorageBytes) || 0),
            cloudUploadCount: Math.max(0, Number(options.cloudUploadCount) || 0),
            projectCode: options.projectCode || null,
            projectCodeExpiryMode: options.projectCodeExpiryMode || 'never',
            projectCodeExpiresAt: options.projectCodeExpiresAt == null ? null : options.projectCodeExpiresAt,
            tempCode: options.tempCode || null,
            tempCodeExpiresAt: options.tempCodeExpiresAt == null ? null : options.tempCodeExpiresAt,
            instanceGroups: options.instanceGroups || [
                { id: 'default', name: 'Default', theme: 'blue' }
            ],
            projectStreams: options.projectStreams || [
                {
                    id: 'main',
                    name: 'Main Stream',
                    instanceGroup: 'Default',
                    aspectRatio: { preset: '16:9', width: 16, height: 9 },
                    requireCode: false,
                    content: false,
                    presentationId: null,
                    instances: 0
                }
            ],
            presentations: options.presentations || [],
            media: options.media || {
                folders: [],
                items: [],
                ui: { view: 'list', scale: 0.45, currentFolderId: null, filter: '' }
            }
        };
    }

    function notifyAuth() {
        authListeners.slice().forEach(function (fn) {
            try { fn(currentUser); } catch (_) {}
        });
    }

    function resolveAuthWaiters() {
        authReady = true;
        var waiters = authWaiters.slice();
        authWaiters = [];
        waiters.forEach(function (resolve) { resolve(currentUser); });
    }

    onAuthStateChanged(auth, function (user) {
        currentUser = user || null;
        resolveAuthWaiters();
        notifyAuth();
    });

    getRedirectResult(auth).catch(function () {});

    function waitForAuth() {
        if (authReady) return Promise.resolve(currentUser);
        return new Promise(function (resolve) {
            authWaiters.push(resolve);
        });
    }

    function requireUser() {
        return waitForAuth().then(function (user) {
            if (!user) {
                var err = new Error('Sign in required');
                err.code = 'auth/required';
                throw err;
            }
            return user;
        });
    }

    async function signInWithGoogle() {
        config = mergeConfig();
        try {
            if (config.usePopupAuth) {
                var result = await signInWithPopup(auth, googleProvider);
                return result.user;
            }
            await signInWithRedirect(auth, googleProvider);
            return null;
        } catch (err) {
            if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user')) {
                await signInWithRedirect(auth, googleProvider);
                return null;
            }
            throw err;
        }
    }

    function signOutUser() {
        return signOut(auth);
    }

    function getIdToken(forceRefresh) {
        return requireUser().then(function (user) {
            return user.getIdToken(!!forceRefresh);
        });
    }

    function projectsRef() {
        return collection(db, PROJECTS_COLLECTION);
    }

    function projectDoc(projectId) {
        return doc(db, PROJECTS_COLLECTION, projectId);
    }

    async function listOwnedProjects() {
        var user = await requireUser();
        var q = query(projectsRef(), where('ownerId', '==', user.uid), orderBy('updatedAt', 'desc'));
        try {
            var snap = await getDocs(q);
            return snap.docs.map(projectFromFirestore).filter(Boolean);
        } catch (err) {
            // Fallback if composite index is not ready yet.
            var q2 = query(projectsRef(), where('ownerId', '==', user.uid));
            var snap2 = await getDocs(q2);
            var list = snap2.docs.map(projectFromFirestore).filter(Boolean);
            list.sort(function (a, b) {
                return String(b.updatedAt || b.created || '').localeCompare(String(a.updatedAt || a.created || ''));
            });
            return list;
        }
    }

    async function getProject(projectId) {
        if (!projectId) return null;
        var snap = await getDoc(projectDoc(projectId));
        return projectFromFirestore(snap);
    }

    async function queryFirstProject(field, value) {
        try {
            var snap = await getDocs(query(projectsRef(), where(field, '==', value), queryLimit(1)));
            if (snap.empty) return null;
            return projectFromFirestore(snap.docs[0]);
        } catch (err) {
            console.warn('Project lookup failed', field, err);
            return null;
        }
    }

    async function findProjectByCode(code) {
        var needle = String(code || '').trim().toUpperCase();
        if (!needle) return null;
        var byCode = await queryFirstProject('projectCode', needle);
        if (!byCode) byCode = await queryFirstProject('projectCode', String(code || '').trim());
        if (byCode) return byCode;

        var byTemp = await queryFirstProject('tempCode', needle);
        if (byTemp) {
            if (!byTemp.tempCodeExpiresAt || byTemp.tempCodeExpiresAt <= Date.now()) return null;
            return byTemp;
        }
        return null;
    }

    async function findOwnedProjectByName(name) {
        var user = await requireUser();
        var needle = String(name || '').trim();
        if (!needle) return null;
        var q = query(projectsRef(), where('ownerId', '==', user.uid), where('name', '==', needle));
        try {
            var snap = await getDocs(q);
            if (snap.empty) return null;
            return projectFromFirestore(snap.docs[snap.docs.length - 1]);
        } catch (_) {
            var all = await listOwnedProjects();
            for (var i = all.length - 1; i >= 0; i--) {
                if (all[i] && all[i].name === needle) return all[i];
            }
            return null;
        }
    }

    async function resolveProjectIdentity(identity) {
        identity = identity || {};
        if (identity.projectId) {
            try {
                var byId = await getProject(identity.projectId);
                if (byId) return byId;
            } catch (err) {
                console.warn('Project id lookup failed', err);
            }
        }
        if (identity.projectCode) {
            try {
                var byCode = await findProjectByCode(identity.projectCode);
                if (byCode) return byCode;
            } catch (err) {
                console.warn('Project code lookup failed', err);
            }
        }
        if (identity.projectName && currentUser) {
            try {
                var byName = await findOwnedProjectByName(identity.projectName);
                if (byName) return byName;
            } catch (err) {
                console.warn('Project name lookup failed', err);
            }
        }
        return null;
    }

    async function saveProject(project) {
        var user = await requireUser();
        if (!project || !project.id) throw new Error('Project id required');
        if (!project.ownerId) project.ownerId = user.uid;
        if (!project.ownerEmail) project.ownerEmail = user.email || null;
        if (project.ownerId !== user.uid) {
            var err = new Error('Not project owner');
            err.code = 'permission-denied';
            throw err;
        }
        project.updatedAt = nowIso();
        if (!project.managerLink) {
            project.managerLink = 'manager.html?id=' + encodeURIComponent(project.id);
        }
        var payload = projectToFirestore(project);
        payload.serverUpdatedAt = serverTimestamp();
        await setDoc(projectDoc(project.id), payload, { merge: true });
        return project;
    }

    async function createProject(options) {
        var user = await requireUser();
        var project = buildDefaultProject(Object.assign({}, options || {}, { user: user }));
        await saveProject(project);
        return project;
    }

    async function deleteProject(projectId) {
        await requireUser();
        await deleteDoc(projectDoc(projectId));
    }

    function subscribeProject(projectId, handler) {
        if (!projectId || typeof handler !== 'function') {
            return function () {};
        }
        return onSnapshot(projectDoc(projectId), function (snap) {
            handler(projectFromFirestore(snap));
        }, function (err) {
            handler(null, err);
        });
    }

    function getLocalProjects() {
        try {
            var raw = global.localStorage.getItem(LOCAL_STORAGE_KEY);
            var list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (_) {
            return [];
        }
    }

    async function migrateLocalProjects(options) {
        options = options || {};
        var user = await requireUser();
        var local = getLocalProjects();
        if (!local.length) return { imported: 0, projects: [] };
        var imported = [];
        for (var i = 0; i < local.length; i++) {
            var src = local[i];
            if (!src) continue;
            var id = src.id || createId();
            var existing = await getProject(id);
            if (existing && existing.ownerId && existing.ownerId !== user.uid) {
                id = createId();
            }
            var project = buildDefaultProject({
                id: id,
                name: src.name || 'Imported Stream',
                pin: src.pin || null,
                created: src.created || nowIso(),
                user: user,
                customEmptyImage: !!src.customEmptyImage,
                emptyImageUrl: src.emptyImageUrl || null,
                emptyImageKey: src.emptyImageKey || null,
                emptyImageSize: src.emptyImageSize || 0,
                cloudStorageBytes: src.cloudStorageBytes || 0,
                cloudUploadCount: src.cloudUploadCount || 0,
                projectCode: src.projectCode || null,
                projectCodeExpiryMode: src.projectCodeExpiryMode || 'never',
                projectCodeExpiresAt: src.projectCodeExpiresAt == null ? null : src.projectCodeExpiresAt,
                tempCode: src.tempCode || null,
                tempCodeExpiresAt: src.tempCodeExpiresAt == null ? null : src.tempCodeExpiresAt,
                instanceGroups: src.instanceGroups,
                projectStreams: src.projectStreams,
                presentations: src.presentations,
                media: src.media
            });
            project.migratedFromLocal = true;
            await saveProject(project);
            imported.push(project);
        }
        if (options.clearLocal !== false) {
            try { global.localStorage.removeItem(LOCAL_STORAGE_KEY); } catch (_) {}
        }
        return { imported: imported.length, projects: imported };
    }

    function workerConfigured() {
        config = mergeConfig();
        return !!config.workerUrl;
    }

    async function uploadMedia(file, options) {
        options = options || {};
        if (!file) throw new Error('File required');
        config = mergeConfig();
        if (!config.workerUrl) {
            var cfgErr = new Error('Cloudflare Worker URL is not configured. Set window.CROSSSHARE_CONFIG.workerUrl.');
            cfgErr.code = 'config/missing-worker';
            throw cfgErr;
        }
        var user = await requireUser();
        var token = await user.getIdToken();
        var projectId = options.projectId;
        if (!projectId) throw new Error('projectId required for upload');

        var form = new FormData();
        form.append('file', file, file.name || 'upload.bin');
        form.append('projectId', projectId);
        if (options.mediaId) form.append('mediaId', options.mediaId);
        if (options.kind) form.append('kind', options.kind);

        var response = await fetch(config.workerUrl + '/upload', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + token
            },
            body: form
        });

        var body = null;
        try {
            body = await response.json();
        } catch (_) {
            body = null;
        }
        if (!response.ok) {
            var msg = (body && (body.error || body.message)) || ('Upload failed (' + response.status + ')');
            var upErr = new Error(msg);
            upErr.code = 'upload/failed';
            upErr.status = response.status;
            throw upErr;
        }

        var objectKey = body.objectKey || body.key || null;
        var url = body.url || body.publicUrl || null;
        if (!url && objectKey && config.publicMediaBaseUrl) {
            url = config.publicMediaBaseUrl + '/' + objectKey.replace(/^\//, '');
        }
        return {
            url: url,
            objectKey: objectKey,
            mime: body.mime || file.type || '',
            size: body.size != null ? body.size : (file.size || 0),
            name: body.name || file.name || 'upload'
        };
    }

    async function deleteMediaObject(objectKey) {
        if (!objectKey) return;
        config = mergeConfig();
        if (!config.workerUrl) {
            var cfgErr = new Error('Cloudflare Worker URL is not configured; cloud media was not deleted.');
            cfgErr.code = 'config/missing-worker';
            throw cfgErr;
        }
        var user = await requireUser();
        var token = await user.getIdToken();
        var response = await fetch(config.workerUrl + '/media/' + encodeURIComponent(objectKey), {
            method: 'DELETE',
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        if (!response.ok && response.status !== 404) {
            var text = await response.text();
            var err = new Error(text || 'Delete failed');
            err.code = 'upload/delete-failed';
            throw err;
        }
    }

    function mediaPlaybackUrl(item) {
        if (!item) return null;
        if (item.url) return item.url;
        if (item.objectKey) {
            config = mergeConfig();
            if (config.publicMediaBaseUrl) {
                return config.publicMediaBaseUrl + '/' + String(item.objectKey).replace(/^\//, '');
            }
        }
        return null;
    }

    var api = {
        PROJECTS_COLLECTION: PROJECTS_COLLECTION,
        LOCAL_STORAGE_KEY: LOCAL_STORAGE_KEY,
        get config() { return mergeConfig(); },
        setConfig: function (next) {
            global.CROSSSHARE_CONFIG = Object.assign({}, global.CROSSSHARE_CONFIG || {}, next || {});
            config = mergeConfig();
        },
        createId: createId,
        buildDefaultProject: buildDefaultProject,
        waitForAuth: waitForAuth,
        requireUser: requireUser,
        getUser: function () { return currentUser; },
        onAuthStateChanged: function (fn) {
            if (typeof fn !== 'function') return function () {};
            authListeners.push(fn);
            if (authReady) {
                try { fn(currentUser); } catch (_) {}
            }
            return function () {
                authListeners = authListeners.filter(function (x) { return x !== fn; });
            };
        },
        signInWithGoogle: signInWithGoogle,
        signOut: signOutUser,
        getIdToken: getIdToken,
        listOwnedProjects: listOwnedProjects,
        getProject: getProject,
        findProjectByCode: findProjectByCode,
        findOwnedProjectByName: findOwnedProjectByName,
        resolveProjectIdentity: resolveProjectIdentity,
        saveProject: saveProject,
        createProject: createProject,
        deleteProject: deleteProject,
        subscribeProject: subscribeProject,
        getLocalProjects: getLocalProjects,
        migrateLocalProjects: migrateLocalProjects,
        workerConfigured: workerConfigured,
        uploadMedia: uploadMedia,
        deleteMediaObject: deleteMediaObject,
        mediaPlaybackUrl: mediaPlaybackUrl
    };

    global.CrossshareCloud = api;
})(window);
