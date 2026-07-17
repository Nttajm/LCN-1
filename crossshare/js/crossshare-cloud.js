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
    var PRESENCE_COLLECTION = 'crossshare_presence';
    var LOCAL_STORAGE_KEY = 'crossshare_streams';
    var DEFAULT_PROJECT_CACHE_TTL_MS = 5 * 60 * 1000;
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
    var clockOffsetMs = 0;
    var clockSyncedAt = 0;
    var clockSyncPromise = null;

    function nowIso() {
        return new Date().toISOString();
    }

    function clone(value) {
        if (value == null) return value;
        return JSON.parse(JSON.stringify(value));
    }

    var projectCache = Object.create(null);

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

    function readLocalProjects() {
        try {
            var raw = global.localStorage.getItem(LOCAL_STORAGE_KEY);
            var list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (_) {
            return [];
        }
    }

    function writeLocalProjects(list) {
        try {
            global.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list || []));
        } catch (_) {}
    }

    function upsertLocalProject(project) {
        if (!project) return;
        var list = readLocalProjects();
        var found = false;
        for (var i = 0; i < list.length; i++) {
            if (
                (project.id && list[i] && list[i].id === project.id) ||
                (project.name && list[i] && list[i].name === project.name)
            ) {
                list[i] = project;
                found = true;
                break;
            }
        }
        if (!found) list.push(project);
        writeLocalProjects(list);
    }

    function cacheProject(project) {
        if (!project || !project.id) return project || null;
        projectCache[project.id] = {
            value: clone(project),
            cachedAt: Date.now()
        };
        upsertLocalProject(project);
        return project;
    }

    function cachedProject(projectId, maxAgeMs) {
        if (!projectId) return null;
        var now = Date.now();
        var ttl = typeof maxAgeMs === 'number' ? maxAgeMs : DEFAULT_PROJECT_CACHE_TTL_MS;
        var cached = projectCache[projectId];
        if (cached && (ttl < 0 || now - cached.cachedAt <= ttl)) {
            return clone(cached.value);
        }
        var local = readLocalProjects();
        for (var i = local.length - 1; i >= 0; i--) {
            if (local[i] && local[i].id === projectId) {
                projectCache[projectId] = {
                    value: clone(local[i]),
                    cachedAt: now
                };
                return clone(local[i]);
            }
        }
        return null;
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
            return snap.docs.map(projectFromFirestore).filter(Boolean).map(cacheProject);
        } catch (err) {
            // Fallback if composite index is not ready yet.
            var q2 = query(projectsRef(), where('ownerId', '==', user.uid));
            var snap2 = await getDocs(q2);
            var list = snap2.docs.map(projectFromFirestore).filter(Boolean).map(cacheProject);
            list.sort(function (a, b) {
                return String(b.updatedAt || b.created || '').localeCompare(String(a.updatedAt || a.created || ''));
            });
            return list;
        }
    }

    async function getProject(projectId, options) {
        if (!projectId) return null;
        options = options || {};
        if (options.preferCache) {
            var cached = cachedProject(projectId, options.maxAgeMs);
            if (cached) return cached;
        }
        var snap = await getDoc(projectDoc(projectId));
        return cacheProject(projectFromFirestore(snap));
    }

    async function queryFirstProject(field, value) {
        try {
            var snap = await getDocs(query(projectsRef(), where(field, '==', value), queryLimit(1)));
            if (snap.empty) return null;
            return cacheProject(projectFromFirestore(snap.docs[0]));
        } catch (err) {
            console.warn('Project lookup failed', field, err);
            return null;
        }
    }

    async function findProjectByCode(code) {
        var needle = String(code || '').trim().toUpperCase();
        if (!needle) return null;
        if (needle.length === 4) {
            var byTempFirst = await queryFirstProject('tempCode', needle);
            if (byTempFirst) {
                if (byTempFirst.tempCodeExpiresAt && byTempFirst.tempCodeExpiresAt > Date.now()) {
                    return byTempFirst;
                }
            }
        }
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
            return cacheProject(projectFromFirestore(snap.docs[snap.docs.length - 1]));
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
        return cacheProject(project);
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
            handler(cacheProject(projectFromFirestore(snap)));
        }, function (err) {
            handler(null, err);
        });
    }

    function getLocalProjects() {
        return readLocalProjects();
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

    function serverNow() {
        return Date.now() + clockOffsetMs;
    }

    function syncClock(force) {
        config = mergeConfig();
        if (!config.workerUrl) return Promise.resolve(clockOffsetMs);
        if (!force && clockSyncedAt && Date.now() - clockSyncedAt < 60000) {
            return Promise.resolve(clockOffsetMs);
        }
        if (clockSyncPromise) return clockSyncPromise;

        function sample() {
            var sentAt = Date.now();
            return fetch(config.workerUrl + '/time', { cache: 'no-store' }).then(function (response) {
                var receivedAt = Date.now();
                if (!response.ok) throw new Error('Clock sync failed');
                return response.json().then(function (body) {
                    return {
                        rtt: receivedAt - sentAt,
                        offset: Number(body.nowMs) - ((sentAt + receivedAt) / 2)
                    };
                });
            });
        }

        clockSyncPromise = Promise.all([sample(), sample(), sample()]).then(function (samples) {
            samples.sort(function (a, b) { return a.rtt - b.rtt; });
            if (samples[0] && isFinite(samples[0].offset)) {
                clockOffsetMs = samples[0].offset;
                clockSyncedAt = Date.now();
            }
            return clockOffsetMs;
        }).catch(function () {
            return clockOffsetMs;
        }).then(function (offset) {
            clockSyncPromise = null;
            return offset;
        });
        return clockSyncPromise;
    }

    // Files larger than this are uploaded in chunks via the worker's
    // /multipart endpoints. Chunked uploads survive connection hiccups
    // (each chunk retries independently) and avoid the Workers per-request
    // body size limit (~100 MB) that made big single-POST uploads fail/stall.
    var MULTIPART_THRESHOLD_BYTES = 24 * 1024 * 1024;
    var MULTIPART_CHUNK_BYTES = 8 * 1024 * 1024; // R2 minimum part size is 5 MiB
    var MULTIPART_PART_CONCURRENCY = 3;
    var UPLOAD_MAX_ATTEMPTS = 4;

    function xhrRequest(opts) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(opts.method, opts.url, true);
            Object.keys(opts.headers || {}).forEach(function (name) {
                xhr.setRequestHeader(name, opts.headers[name]);
            });

            if (opts.onUploadProgress && xhr.upload) {
                xhr.upload.addEventListener('progress', function (event) {
                    if (!event.lengthComputable) return;
                    opts.onUploadProgress(event.loaded, event.total);
                });
            }

            xhr.onload = function () {
                var body = null;
                try {
                    body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
                } catch (_) {
                    body = null;
                }
                resolve({ status: xhr.status, body: body });
            };
            xhr.onerror = function () {
                var err = new Error('Upload failed (network error)');
                err.code = 'upload/network';
                err.retryable = true;
                reject(err);
            };
            xhr.onabort = function () {
                var err = new Error('Upload cancelled');
                err.code = 'upload/aborted';
                reject(err);
            };
            xhr.send(opts.body != null ? opts.body : null);
        });
    }

    function throwUploadError(result) {
        var msg = (result.body && (result.body.error || result.body.message)) || ('Upload failed (' + result.status + ')');
        var err = new Error(msg);
        err.code = 'upload/failed';
        err.status = result.status;
        // Server errors and expired-token 401s are worth retrying; other 4xx are not.
        err.retryable = result.status >= 500 || result.status === 401 || result.status === 429;
        throw err;
    }

    function backoffDelay(attempt) {
        return new Promise(function (resolve) {
            setTimeout(resolve, Math.min(15000, 1000 * Math.pow(2, attempt)));
        });
    }

    function finalizeUploadResult(body, file, mime) {
        var objectKey = body.objectKey || body.key || null;
        var url = body.url || body.publicUrl || null;
        if (!url && objectKey && config.publicMediaBaseUrl) {
            url = config.publicMediaBaseUrl + '/' + objectKey.replace(/^\//, '');
        }
        return {
            url: url,
            objectKey: objectKey,
            mime: body.mime || mime,
            size: body.size != null && body.size ? body.size : (file.size || 0),
            name: body.name || file.name || 'upload'
        };
    }

    async function workerJson(user, method, path, body) {
        var lastErr = null;
        for (var attempt = 0; attempt < UPLOAD_MAX_ATTEMPTS; attempt++) {
            if (attempt > 0) await backoffDelay(attempt - 1);
            var token = await user.getIdToken(attempt > 0);
            try {
                var headers = { Authorization: 'Bearer ' + token };
                if (body != null) headers['Content-Type'] = 'application/json';
                var result = await xhrRequest({
                    method: method,
                    url: config.workerUrl + path,
                    headers: headers,
                    body: body != null ? JSON.stringify(body) : null
                });
                if (result.status >= 200 && result.status < 300) return result.body || {};
                throwUploadError(result);
            } catch (err) {
                lastErr = err;
                if (!err.retryable) throw err;
            }
        }
        throw lastErr;
    }

    async function uploadMediaMultipart(file, options, user, onProgress) {
        var mime = file.type || 'application/octet-stream';
        var createParams = new URLSearchParams();
        createParams.set('projectId', options.projectId);
        createParams.set('name', file.name || 'upload.bin');
        createParams.set('mime', mime);
        if (options.mediaId) createParams.set('mediaId', options.mediaId);
        if (options.kind) createParams.set('kind', options.kind);

        var created = await workerJson(user, 'POST', '/multipart/create?' + createParams.toString());
        var key = created.key;
        var uploadId = created.uploadId;
        if (!key || !uploadId) throw new Error('Multipart upload could not be started');

        var totalParts = Math.max(1, Math.ceil(file.size / MULTIPART_CHUNK_BYTES));
        var parts = new Array(totalParts);
        var partLoaded = new Array(totalParts);
        for (var i = 0; i < totalParts; i++) partLoaded[i] = 0;

        function emitProgress() {
            if (!onProgress) return;
            var loaded = 0;
            for (var j = 0; j < totalParts; j++) loaded += partLoaded[j];
            loaded = Math.min(loaded, file.size);
            onProgress({
                loaded: loaded,
                total: file.size,
                percent: file.size ? Math.round((loaded / file.size) * 100) : 0
            });
        }

        async function uploadPart(partIndex) {
            var partNumber = partIndex + 1;
            var start = partIndex * MULTIPART_CHUNK_BYTES;
            var chunk = file.slice(start, Math.min(file.size, start + MULTIPART_CHUNK_BYTES));
            var partUrl = config.workerUrl + '/multipart/part'
                + '?key=' + encodeURIComponent(key)
                + '&uploadId=' + encodeURIComponent(uploadId)
                + '&partNumber=' + partNumber;

            var lastErr = null;
            for (var attempt = 0; attempt < UPLOAD_MAX_ATTEMPTS; attempt++) {
                if (attempt > 0) {
                    partLoaded[partIndex] = 0;
                    emitProgress();
                    await backoffDelay(attempt - 1);
                }
                var token = await user.getIdToken(attempt > 0);
                try {
                    var result = await xhrRequest({
                        method: 'PUT',
                        url: partUrl,
                        headers: {
                            Authorization: 'Bearer ' + token,
                            'Content-Type': 'application/octet-stream'
                        },
                        body: chunk,
                        onUploadProgress: function (loaded) {
                            partLoaded[partIndex] = Math.min(loaded, chunk.size);
                            emitProgress();
                        }
                    });
                    if (result.status >= 200 && result.status < 300 && result.body && result.body.etag) {
                        parts[partIndex] = { partNumber: partNumber, etag: result.body.etag };
                        partLoaded[partIndex] = chunk.size;
                        emitProgress();
                        return;
                    }
                    throwUploadError(result);
                } catch (err) {
                    lastErr = err;
                    if (!err.retryable) throw err;
                }
            }
            throw lastErr;
        }

        var nextPart = 0;
        async function lane() {
            while (nextPart < totalParts) {
                var idx = nextPart++;
                await uploadPart(idx);
            }
        }

        try {
            var lanes = [];
            var laneCount = Math.min(MULTIPART_PART_CONCURRENCY, totalParts);
            for (var l = 0; l < laneCount; l++) lanes.push(lane());
            await Promise.all(lanes);
        } catch (err) {
            try {
                await workerJson(user, 'POST', '/multipart/abort?key=' + encodeURIComponent(key) + '&uploadId=' + encodeURIComponent(uploadId));
            } catch (_) {}
            throw err;
        }

        var completeParams = new URLSearchParams();
        completeParams.set('key', key);
        completeParams.set('uploadId', uploadId);
        completeParams.set('name', file.name || 'upload.bin');
        completeParams.set('mime', mime);
        var completed = await workerJson(user, 'POST', '/multipart/complete?' + completeParams.toString(), {
            parts: parts
        });
        return finalizeUploadResult(completed || {}, file, mime);
    }

    async function uploadMediaSingle(file, options, user, onProgress) {
        var params = new URLSearchParams();
        params.set('projectId', options.projectId);
        params.set('name', file.name || 'upload.bin');
        if (options.mediaId) params.set('mediaId', options.mediaId);
        if (options.kind) params.set('kind', options.kind);

        var uploadUrl = config.workerUrl + '/upload?' + params.toString();
        var mime = file.type || 'application/octet-stream';

        var lastErr = null;
        for (var attempt = 0; attempt < UPLOAD_MAX_ATTEMPTS; attempt++) {
            if (attempt > 0) {
                if (onProgress) onProgress({ loaded: 0, total: file.size || 0, percent: 0 });
                await backoffDelay(attempt - 1);
            }
            var token = await user.getIdToken(attempt > 0);
            try {
                var result = await xhrRequest({
                    method: 'POST',
                    url: uploadUrl,
                    headers: {
                        Authorization: 'Bearer ' + token,
                        'Content-Type': mime
                    },
                    body: file,
                    onUploadProgress: function (loaded, total) {
                        if (!onProgress) return;
                        onProgress({
                            loaded: loaded,
                            total: total,
                            percent: total ? Math.round((loaded / total) * 100) : 0
                        });
                    }
                });
                if (result.status >= 200 && result.status < 300) {
                    return finalizeUploadResult(result.body || {}, file, mime);
                }
                throwUploadError(result);
            } catch (err) {
                lastErr = err;
                if (!err.retryable) throw err;
            }
        }
        throw lastErr;
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
        if (!options.projectId) throw new Error('projectId required for upload');

        var onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

        if ((file.size || 0) > MULTIPART_THRESHOLD_BYTES) {
            return uploadMediaMultipart(file, options, user, onProgress);
        }
        return uploadMediaSingle(file, options, user, onProgress);
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

    /* ---------------- Viewer presence ---------------- */

    function describeDevice() {
        var ua = String((global.navigator && global.navigator.userAgent) || '');
        var device = 'Computer';
        if (/roku/i.test(ua)) device = 'Roku';
        else if (/apple\s?tv|tvos/i.test(ua)) device = 'Apple TV';
        else if (/smart-?tv|hbbtv|netcast|tizen|webos/i.test(ua)) device = 'Smart TV';
        else if (/ipad/i.test(ua) || (/macintosh/i.test(ua) && global.navigator && global.navigator.maxTouchPoints > 1)) device = 'iPad';
        else if (/iphone/i.test(ua)) device = 'iPhone';
        else if (/android/i.test(ua) && /mobile/i.test(ua)) device = 'Android phone';
        else if (/android/i.test(ua)) device = 'Android tablet';
        else if (/windows/i.test(ua)) device = 'Windows PC';
        else if (/macintosh|mac os/i.test(ua)) device = 'Mac';
        else if (/linux/i.test(ua)) device = 'Linux PC';

        var browser = '';
        if (/edg\//i.test(ua)) browser = 'Edge';
        else if (/opr\//i.test(ua)) browser = 'Opera';
        else if (/chrome\//i.test(ua)) browser = 'Chrome';
        else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
        else if (/firefox\//i.test(ua)) browser = 'Firefox';

        return browser ? device + ' · ' + browser : device;
    }

    function presenceDoc(projectId, instanceId) {
        return doc(db, PRESENCE_COLLECTION, String(projectId) + '__' + String(instanceId));
    }

    async function publishPresence(entry) {
        entry = entry || {};
        if (!entry.projectId || !entry.instanceId) return;
        var payload = {
            projectId: String(entry.projectId),
            instanceId: String(entry.instanceId),
            device: entry.device || describeDevice(),
            mode: entry.mode || 'viewer',
            streamId: entry.streamId || null,
            streamViewId: entry.streamViewId || null,
            streamName: entry.streamName || null,
            joinedAt: entry.joinedAt || Date.now(),
            lastSeen: Date.now()
        };
        await setDoc(presenceDoc(entry.projectId, entry.instanceId), payload, { merge: true });
        return payload;
    }

    async function removePresence(projectId, instanceId) {
        if (!projectId || !instanceId) return;
        try {
            await deleteDoc(presenceDoc(projectId, instanceId));
        } catch (_) {}
    }

    function subscribePresence(projectId, handler) {
        if (!projectId || typeof handler !== 'function') {
            return function () {};
        }
        var q = query(collection(db, PRESENCE_COLLECTION), where('projectId', '==', String(projectId)));
        return onSnapshot(q, function (snap) {
            var list = [];
            snap.forEach(function (docSnap) {
                var data = docSnap.data();
                if (data) list.push(data);
            });
            handler(list);
        }, function (err) {
            handler(null, err);
        });
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
        now: serverNow,
        syncClock: syncClock,
        uploadMedia: uploadMedia,
        deleteMediaObject: deleteMediaObject,
        mediaPlaybackUrl: mediaPlaybackUrl,
        describeDevice: describeDevice,
        publishPresence: publishPresence,
        removePresence: removePresence,
        subscribePresence: subscribePresence
    };

    global.CrossshareCloud = api;
})(window);
