// ══════════════════════════════════════════════════════════════
// JOSU – Firebase DB Layer
// Depends on: firebase-app-compat.js + firebase-firestore-compat.js
// loaded from CDN before this script
// ══════════════════════════════════════════════════════════════

const JosuFirebase = (() => {
    const firebaseConfig = {
        apiKey: "AIzaSyBCaGiPCM-PrrA4zwnahDYyayltI2QVOdA",
        authDomain: "overunder-ths.firebaseapp.com",
        projectId: "overunder-ths",
        storageBucket: "overunder-ths.firebasestorage.app",
        messagingSenderId: "690530120785",
        appId: "1:690530120785:web:bb1f65c6cb243132cb7470"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.firestore();
    const SONGS_COL = 'josu_songs';

    // ── Publish a song (create or update) ──────────────────
    async function publishSong(data) {
        const { storeId } = data;
        const ref = db.collection(SONGS_COL).doc(storeId);
        const existing = await ref.get();
        const publishedAt = existing.exists
            ? existing.data().publishedAt
            : new Date().toISOString();

        await ref.set({
            storeId,
            title: data.title || 'Untitled',
            artist: data.artist || '',
            audioUrl: data.audioUrl || '',
            coverImage: data.coverImage || '',
            inGameGif: data.inGameGif || '',
            audioCorrection: data.audioCorrection || 0,
            time: data.time || '',
            ranked: false,
            publishedAt,
            updatedAt: new Date().toISOString(),
            difficulties: (data.difficulties || []).map(d => ({
                name: d.name || 'Normal',
                mapper: d.mapper || 'Unknown',
                stars: d.stars || 1.0,
                mode: d.mode || 'taiko',
                speed: d.speed || 1.0,
                songData: Array.isArray(d.songData) ? d.songData : []
            }))
        });

        return storeId;
    }

    // ── Unpublish (delete) ──────────────────────────────────
    async function unpublishSong(storeId) {
        await db.collection(SONGS_COL).doc(storeId).delete();
    }

    // Rewrite legacy private R2 URLs to the public r2.dev URL
    function rewriteR2Url(url) {
        if (!url) return url;
        return url.replace(
            /^https:\/\/[a-f0-9]+\.r2\.cloudflarestorage\.com\/josu\//,
            'https://pub-fedf9f69b8554f7ba5a4cdb484d8d15c.r2.dev/'
        );
    }

    function rewriteSongUrls(data) {
        if (!data) return data;
        return { ...data, audioUrl: rewriteR2Url(data.audioUrl) };
    }

    // ── Get all published songs ─────────────────────────────
    async function getPublishedSongs() {
        const snap = await db.collection(SONGS_COL).orderBy('publishedAt', 'desc').get();
        return snap.docs.map(d => rewriteSongUrls(d.data()));
    }

    // ── Get one song ────────────────────────────────────────
    async function getPublishedSongById(storeId) {
        const snap = await db.collection(SONGS_COL).doc(storeId).get();
        return snap.exists ? rewriteSongUrls(snap.data()) : null;
    }

    // ── Check if published ──────────────────────────────────
    async function isSongPublished(storeId) {
        const snap = await db.collection(SONGS_COL).doc(storeId).get();
        return snap.exists;
    }

    return {
        publishSong,
        unpublishSong,
        getPublishedSongs,
        getPublishedSongById,
        isSongPublished
    };
})();
