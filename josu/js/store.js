// ══════════════════════════════════════════════════════════════
// JOSU PROJECT STORE
// Shared data layer for dashboard, song, and editor pages.
// All data persists in localStorage.
// ══════════════════════════════════════════════════════════════

const JosuStore = (() => {
    const STORAGE_KEY = 'josu_projects_v2';

    // ── helpers ──────────────────────────────────────────────
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function now() {
        return new Date().toISOString();
    }

    // ── read / write root store ─────────────────────────────
    function _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { console.error('JosuStore: load error', e); }
        return { songs: {} };
    }

    function _save(store) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        } catch (e) { console.error('JosuStore: save error', e); }
        _syncToCloud(store);
    }

    let _cloudSyncTimeout = null;
    function _syncToCloud(store) {
        if (typeof JosuAuth === 'undefined' || !JosuAuth.isSignedIn()) return;
        clearTimeout(_cloudSyncTimeout);
        _cloudSyncTimeout = setTimeout(() => {
            JosuAuth.saveProjectsToCloud(store.songs).catch(e =>
                console.warn('JosuStore: cloud sync error', e)
            );
        }, 2000);
    }

    // ── Song CRUD ───────────────────────────────────────────
    function getSongs() {
        const store = _load();
        return Object.values(store.songs).sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );
    }

    function getSong(songId) {
        const store = _load();
        return store.songs[songId] || null;
    }

    function createSong({ title, artist, coverImage, inGameGif, audio, audioCorrection }) {
        const store = _load();
        const id = generateId();
        store.songs[id] = {
            id,
            title: title || 'Untitled Song',
            artist: artist || '',
            coverImage: coverImage || '',
            inGameGif: inGameGif || '',
            audio: audio || '',
            audioCorrection: audioCorrection || 0,
            createdAt: now(),
            updatedAt: now(),
            difficulties: {}
        };
        _save(store);
        return store.songs[id];
    }

    function updateSong(songId, updates) {
        const store = _load();
        const song = store.songs[songId];
        if (!song) return null;
        Object.assign(song, updates, { updatedAt: now() });
        _save(store);
        return song;
    }

    function deleteSong(songId) {
        const store = _load();
        delete store.songs[songId];
        _save(store);
    }

    // ── Difficulty CRUD ─────────────────────────────────────
    function getDifficulties(songId) {
        const song = getSong(songId);
        if (!song) return [];
        return Object.values(song.difficulties).sort((a, b) =>
            new Date(a.createdAt) - new Date(b.createdAt)
        );
    }

    function getDifficulty(songId, diffId) {
        const song = getSong(songId);
        if (!song) return null;
        return song.difficulties[diffId] || null;
    }

    function createDifficulty(songId, { name, mode, bpm, duration, stars, speed }) {
        const store = _load();
        const song = store.songs[songId];
        if (!song) return null;

        const id = generateId();
        song.difficulties[id] = {
            id,
            name: name || 'Normal',
            mode: mode || 'taiko',
            bpm: bpm || 120,
            duration: duration || 60000,
            stars: stars != null ? stars : 1.0,
            speed: speed != null ? speed : 1.0,
            songData: [],
            createdAt: now(),
            updatedAt: now()
        };
        song.updatedAt = now();
        _save(store);
        return song.difficulties[id];
    }

    function updateDifficulty(songId, diffId, updates) {
        const store = _load();
        const song = store.songs[songId];
        if (!song || !song.difficulties[diffId]) return null;
        Object.assign(song.difficulties[diffId], updates, { updatedAt: now() });
        song.updatedAt = now();
        _save(store);
        return song.difficulties[diffId];
    }

    function deleteDifficulty(songId, diffId) {
        const store = _load();
        const song = store.songs[songId];
        if (!song) return;
        delete song.difficulties[diffId];
        song.updatedAt = now();
        _save(store);
    }

    // ══════════════════════════════════════════════════════════
    // LOCAL LIBRARY (songs uploaded to play locally)
    // These are the user's personal game library - not visible to others
    // ══════════════════════════════════════════════════════════
    const LOCAL_SONGS_KEY = 'josu_local_songs';

    function _loadLocalSongs() {
        try {
            const raw = localStorage.getItem(LOCAL_SONGS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { console.error('JosuStore: load local songs error', e); }
        return [];
    }

    function _saveLocalSongs(arr) {
        try {
            localStorage.setItem(LOCAL_SONGS_KEY, JSON.stringify(arr));
        } catch (e) { console.error('JosuStore: save local songs error', e); }
    }

    function getLocalSongs() {
        return _loadLocalSongs();
    }

    function isInLocalLibrary(songId) {
        return _loadLocalSongs().some(s => s._storeId === songId || s.localProjectId === songId);
    }

    function _msToTimeStr(ms) {
        const s = Math.floor(ms / 1000);
        return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }

    function uploadToLocalLibrary(songId) {
        const song = getSong(songId);
        if (!song) return false;
        const diffs = getDifficulties(songId);

        // Convert mode for game compatibility ('arrow' -> 'updown')
        function convertMode(mode) {
            if (mode === 'arrow') return 'updown';
            return mode || 'taiko';
        }

        const maxDuration = diffs.length > 0 ? Math.max(...diffs.map(d => d.duration || 0)) : 0;

        const localEntry = {
            _storeId: songId,
            localProjectId: songId, // Also set for compatibility with editor uploads
            id: 'local_' + songId,
            title: song.title,
            artist: song.artist || '',
            image: song.coverImage || '',
            audio: song.audio || '',
            inGameGif: song.inGameGif || '',
            audioCorrection: song.audioCorrection || 0,
            time: maxDuration > 0 ? _msToTimeStr(maxDuration) : '',
            ranked: false,
            isLocal: true,
            difficulties: diffs.map(d => {
                // Get songData - ensure we get the actual array (with fallback for old 'notes' property)
                const data = Array.isArray(d.songData) ? [...d.songData] : 
                             Array.isArray(d.notes) ? [...d.notes] : [];
                
                // Apply range filtering - only include notes within the selected range
                // and offset their times so the range starts at 0
                const rangeStart = d.rangeStart || 0;
                const rangeEnd = d.rangeEnd || d.duration || Infinity;
                const rangedNotes = data
                    .filter(n => n.time >= rangeStart && n.time <= rangeEnd)
                    .map(n => ({ ...n, time: n.time - rangeStart }));
                
                // Calculate audio correction for this difficulty's range
                const diffAudioCorrection = rangeStart > 0 ? -rangeStart : 0;
                
                return {
                    name: d.name,
                    mapper: 'You',
                    stars: d.stars || 1.0,
                    mode: convertMode(d.mode),
                    speed: d.speed || 1.0,
                    songData: rangedNotes,
                    audioCorrection: diffAudioCorrection
                };
            })
        };

        // Remove any existing entry with same songId (check both _storeId and localProjectId)
        const locals = _loadLocalSongs().filter(s => s._storeId !== songId && s.localProjectId !== songId);
        locals.push(localEntry);
        _saveLocalSongs(locals);
        return true;
    }

    function removeFromLocalLibrary(songId) {
        // Remove entries with matching _storeId or localProjectId
        const locals = _loadLocalSongs().filter(s => s._storeId !== songId && s.localProjectId !== songId);
        _saveLocalSongs(locals);
    }

    // ══════════════════════════════════════════════════════════
    // PUBLISHED SONGS DATABASE (simulated - visible in browse)
    // This simulates a public database where published songs are
    // visible to all users in the browse listing
    // ══════════════════════════════════════════════════════════
    const PUBLISHED_SONGS_KEY = 'josu_published_songs';

    function _loadPublishedSongs() {
        try {
            const raw = localStorage.getItem(PUBLISHED_SONGS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { console.error('JosuStore: load published songs error', e); }
        return [];
    }

    function _savePublishedSongs(arr) {
        try {
            localStorage.setItem(PUBLISHED_SONGS_KEY, JSON.stringify(arr));
        } catch (e) { console.error('JosuStore: save published songs error', e); }
    }

    function getPublishedSongs() {
        return _loadPublishedSongs();
    }

    function isPublished(songId) {
        return _loadPublishedSongs().some(s => s._storeId === songId);
    }

    function publishToBrowse(songId) {
        const song = getSong(songId);
        if (!song) return false;
        const diffs = getDifficulties(songId);

        function convertMode(mode) {
            if (mode === 'arrow') return 'updown';
            return mode || 'taiko';
        }

        const dbId = 'pub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const existing = _loadPublishedSongs().find(s => s._storeId === songId);
        const finalId = existing ? existing.id : dbId;

        const maxDuration = diffs.length > 0 ? Math.max(...diffs.map(d => d.duration || 0)) : 0;

        const user = typeof JosuAuth !== 'undefined' ? JosuAuth.getUser() : null;
        const mapperName = user ? (user.displayName || user.email.split('@')[0]) : 'You';

        const publishedEntry = {
            _storeId: songId,
            id: finalId,
            title: song.title,
            artist: song.artist || '',
            image: song.coverImage || '',
            audio: song.audio || '',
            inGameGif: song.inGameGif || '',
            audioCorrection: song.audioCorrection || 0,
            time: maxDuration > 0 ? _msToTimeStr(maxDuration) : '',
            ranked: false,
            isPublished: true,
            publisherUid: user ? user.uid : null,
            publisherName: mapperName,
            publishedAt: existing ? existing.publishedAt : now(),
            updatedAt: now(),
            difficulties: diffs.map(d => {
                const data = Array.isArray(d.songData) ? [...d.songData] : 
                             Array.isArray(d.notes) ? [...d.notes] : [];
                
                // Apply range filtering - only include notes within the selected range
                // and offset their times so the range starts at 0
                const rangeStart = d.rangeStart || 0;
                const rangeEnd = d.rangeEnd || d.duration || Infinity;
                const rangedNotes = data
                    .filter(n => n.time >= rangeStart && n.time <= rangeEnd)
                    .map(n => ({ ...n, time: n.time - rangeStart }));
                
                // Calculate audio correction for this difficulty's range
                const diffAudioCorrection = rangeStart > 0 ? -rangeStart : 0;
                
                return {
                    name: d.name,
                    mapper: mapperName,
                    stars: d.stars || 1.0,
                    mode: convertMode(d.mode),
                    speed: d.speed || 1.0,
                    songData: rangedNotes,
                    audioCorrection: diffAudioCorrection
                };
            })
        };

        const published = _loadPublishedSongs().filter(s => s._storeId !== songId);
        published.push(publishedEntry);
        _savePublishedSongs(published);
        return true;
    }

    function unpublishFromBrowse(songId) {
        const published = _loadPublishedSongs().filter(s => s._storeId !== songId);
        _savePublishedSongs(published);
    }

    // Get a published song by its database ID
    function getPublishedSongById(dbId) {
        return _loadPublishedSongs().find(s => s.id === dbId) || null;
    }

    // ══════════════════════════════════════════════════════════
    // DOWNLOADED SONGS (user's library from browse)
    // Just stores database IDs - actual song data lives in published DB
    // ══════════════════════════════════════════════════════════
    const DOWNLOADED_KEY = 'josu_downloaded_songs';

    function _loadDownloadedIds() {
        try {
            const raw = localStorage.getItem(DOWNLOADED_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { console.error('JosuStore: load downloaded ids error', e); }
        return [];
    }

    function _saveDownloadedIds(arr) {
        try {
            localStorage.setItem(DOWNLOADED_KEY, JSON.stringify(arr));
        } catch (e) { console.error('JosuStore: save downloaded ids error', e); }
        _syncDownloadedToCloud();
    }

    function getDownloadedSongIds() {
        return _loadDownloadedIds();
    }

    function isDownloaded(dbId) {
        return _loadDownloadedIds().includes(dbId);
    }

    function downloadSong(dbId) {
        const ids = _loadDownloadedIds();
        if (!ids.includes(dbId)) {
            ids.push(dbId);
            _saveDownloadedIds(ids);
        }
        return true;
    }

    function removeDownload(dbId) {
        const ids = _loadDownloadedIds().filter(id => id !== dbId);
        _saveDownloadedIds(ids);
    }

    // Get all downloaded songs (resolved from published database)
    function getDownloadedSongs() {
        const ids = _loadDownloadedIds();
        const published = _loadPublishedSongs();
        return ids.map(id => published.find(s => s.id === id)).filter(Boolean);
    }

    // Legacy compatibility aliases
    function publishToLocalLibrary(songId) {
        return uploadToLocalLibrary(songId);
    }

    // ── Migration helper (import old single-project data) ───
    function migrateOldProject() {
        const OLD_KEY = 'josu_editor_project';
        try {
            const raw = localStorage.getItem(OLD_KEY);
            if (!raw) return false;
            const old = JSON.parse(raw);

            const song = createSong({
                title: old.songTitle || 'Migrated Song',
                artist: old.songArtist || ''
            });

            createDifficulty(song.id, {
                name: old.difficultyName || 'Normal',
                mode: old.mode || 'taiko',
                bpm: old.bpm || 120,
                duration: old.duration || 60000
            });

            // Put songData into the difficulty we just created
            const diffs = getDifficulties(song.id);
            if (diffs.length > 0) {
                updateDifficulty(song.id, diffs[0].id, { songData: old.songData || old.notes || [] });
            }

            // Remove old key so migration only runs once
            localStorage.removeItem(OLD_KEY);
            return true;
        } catch (e) {
            console.error('JosuStore: migration error', e);
            return false;
        }
    }

    // ── Cloud sync on auth change ─────────────────────────
    function _initAuthSync() {
        if (typeof JosuAuth === 'undefined') return;
        JosuAuth.onAuthChange(async (user) => {
            if (!user) return;
            try {
                const cloudProjects = await JosuAuth.loadProjectsFromCloud();
                if (!cloudProjects || Object.keys(cloudProjects).length === 0) return;
                const local = _load();
                let changed = false;
                for (const [id, song] of Object.entries(cloudProjects)) {
                    if (!local.songs[id]) {
                        local.songs[id] = song;
                        changed = true;
                    } else {
                        const lt = new Date(local.songs[id].updatedAt || 0).getTime();
                        const rt = new Date(song.updatedAt || 0).getTime();
                        if (rt > lt) { local.songs[id] = song; changed = true; }
                    }
                }
                if (changed) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
                }
            } catch (e) { console.warn('JosuStore: auth sync error', e); }
        });
    }
    _initAuthSync();

    // ── Downloaded songs cloud sync ─────────────────────────
    function _syncDownloadedToCloud() {
        if (typeof JosuAuth === 'undefined' || !JosuAuth.isSignedIn()) return;
        const ids = _loadDownloadedIds();
        JosuAuth.saveDownloadedToCloud(ids).catch(() => {});
    }

    // ── public API ──────────────────────────────────────────
    return {
        getSongs,
        getSong,
        createSong,
        updateSong,
        deleteSong,
        getDifficulties,
        getDifficulty,
        createDifficulty,
        updateDifficulty,
        deleteDifficulty,
        migrateOldProject,
        // Local library (user's personal game library - unpublished)
        getLocalSongs,
        isInLocalLibrary,
        uploadToLocalLibrary,
        removeFromLocalLibrary,
        // Published songs database (visible in browse)
        getPublishedSongs,
        getPublishedSongById,
        isPublished,
        publishToBrowse,
        unpublishFromBrowse,
        // Downloaded songs (user's library from browse - just IDs)
        getDownloadedSongIds,
        getDownloadedSongs,
        isDownloaded,
        downloadSong,
        removeDownload
    };
})();
