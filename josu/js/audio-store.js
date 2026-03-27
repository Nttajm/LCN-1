// ══════════════════════════════════════════════════════════════
// JOSU – Audio Blob Store (IndexedDB)
// Stores uploaded audio files so they persist across page reloads.
// ══════════════════════════════════════════════════════════════

const JosuAudioStore = (() => {
    const DB_NAME = 'josu_audio';
    const DB_VERSION = 1;
    const STORE_NAME = 'blobs';

    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function saveAudio(songId, blob) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(blob, songId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function getAudio(songId) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(songId);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    async function deleteAudio(songId) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(songId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function getAudioURL(songId) {
        const blob = await getAudio(songId);
        if (!blob) return null;
        return URL.createObjectURL(blob);
    }

    return { saveAudio, getAudio, deleteAudio, getAudioURL };
})();
