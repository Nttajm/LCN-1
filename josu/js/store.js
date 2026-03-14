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
            notes: [],
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
        return _loadLocalSongs().some(s => s._storeId === songId);
    }

    function uploadToLocalLibrary(songId) {
        const song = getSong(songId);
        if (!song) return false;
        const diffs = getDifficulties(songId);

        const localEntry = {
            _storeId: songId,
            id: 'local_' + songId,
            title: song.title,
            artist: song.artist || '',
            image: song.coverImage || '',
            audio: song.audio || '',
            inGameGif: song.inGameGif || '',
            audioCorrection: song.audioCorrection || 0,
            ranked: false,
            isLocal: true,
            difficulties: diffs.map(d => ({
                name: d.name,
                mapper: 'You',
                stars: d.stars || 1.0,
                mode: d.mode || 'taiko',
                speed: d.speed || 1.0,
                songData: d.notes || []
            }))
        };

        const locals = _loadLocalSongs().filter(s => s._storeId !== songId);
        locals.push(localEntry);
        _saveLocalSongs(locals);
        return true;
    }

    function removeFromLocalLibrary(songId) {
        const locals = _loadLocalSongs().filter(s => s._storeId !== songId);
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

        const publishedEntry = {
            _storeId: songId,
            id: 'pub_' + songId,
            title: song.title,
            artist: song.artist || '',
            image: song.coverImage || '',
            audio: song.audio || '',
            inGameGif: song.inGameGif || '',
            audioCorrection: song.audioCorrection || 0,
            ranked: false,
            isPublished: true,
            publishedAt: now(),
            difficulties: diffs.map(d => ({
                name: d.name,
                mapper: 'You',
                stars: d.stars || 1.0,
                mode: d.mode || 'taiko',
                speed: d.speed || 1.0,
                songData: d.notes || []
            }))
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

            // Put notes into the difficulty we just created
            const diffs = getDifficulties(song.id);
            if (diffs.length > 0) {
                updateDifficulty(song.id, diffs[0].id, { notes: old.notes || [] });
            }

            // Remove old key so migration only runs once
            localStorage.removeItem(OLD_KEY);
            return true;
        } catch (e) {
            console.error('JosuStore: migration error', e);
            return false;
        }
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
        // Local library (user's personal game library)
        getLocalSongs,
        isInLocalLibrary,
        uploadToLocalLibrary,
        removeFromLocalLibrary,
        // Published songs database (visible in browse)
        getPublishedSongs,
        isPublished,
        publishToBrowse,
        unpublishFromBrowse
    };
})();
