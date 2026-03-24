import { songKeys } from './keys.js';

 const songsI = [
    {
        id: 1,
        title: "Blinding Lights",
        artist: "The Weeknd",
        time: '00:07',
        image: 'songs/theweeknd/main.png',
        audio: 'songs/theweeknd/audio.mp3',
        inGameGif: 'songs/theweeknd/gif.gif',
        ranked: true,
        difficulties: [
            { name: "Easy", speed: 1, mapper: "joelM", stars: 0.79,
                songData: songKeys.blindingLights.easy
            },
            { name: "Normal", mapper: "joelM", stars: 1.20 },
            { name: "Hard", mapper: "joelM", stars: 1.54 },
        ]
    },
    { 
        id: 6,
        title: "Disparate Youth",
        artist: "Santigold",
        time: '3:44',
        image: 'songs/disparate_youth/main.png',
        ranked: true,
        difficulties: [
            { name: "Normal", mapper: "joelM", stars: 1.75 },
        ]
    },
    {
        id: 2,
        title: "iloveyou",
        artist: "wiv.",
        time: '2:04',
        image: 'songs/iloveu/main.png',
        ranked: true,
        audio: 'songs/iloveu/audio.mp3',
        audioCorrection: 500,
        difficulties: [
            { name: "hard", mapper: "joelM", stars: 2.83, speed: 1, songData: songKeys.iloveu.hard },
            { name: "harderr", mapper: "joelM", stars: 3.13, speed: 1.8, songData: songKeys.iloveu.hard },
        ]
    },
    {
        id: 7,
        title: "dothatshit",
        artist: "Playboi Carti",
        time: '3:04',
        image: 'songs/dothatshit/main.png',
        audio: 'songs/dothatshit/audio.mp3',
        inGameGif: 'songs/dothatshit/gif.gif',
        ranked: true,
        difficulties: [
            { name: "Normal", mapper: "Jordan H.", stars: 2.10, mode: "taiko" },
            {name: "Hard", mapper: "Jordan H.", stars: 2.50, mode: "updown", speed: 1, songData: songKeys.dothatshit.hard },
        ]
    },
    {
        id: 67,
        title: "Flashing Lights",
        artist: "Kanye West",
        time: '3:58',
        image: 'songs/flashing_lights/main.png',
        audio: 'songs/flashing_lights/audio.mp3',
        ranked: true,
        difficulties: [
            { name: "medium", mapper: "joelM", stars: 4.67, songData: songKeys.flashingLights.medium, speed: 1.4 },
        ]
    },
    {
        id: 11,
        title: "nya arigato",
        artist: "Leat'eq",
        time: '4:15',
        image: 'songs/nya_arigato/main.png',
        ranked: true,
        difficulties: [
            { name: "timas", mapper: "joelM", stars: 4.33 },
        ]
    },
    {
        id: 3,
        title: "School Rooftop",
        artist: "hisohkah",
        time: '2:48',
        image: 'songs/school_rooftop/main.png',
        audio: 'songs/school_rooftop/audio.mp3',
        ranked: true,
        audioCorrection: 400,
        difficulties: [
            { name: "nooby", mapper: "joelM", stars: 4.10, songData: songKeys.school_rooftop.medium },
        ]
    },
    {
        id: 4,
        title: "Moment",
        artist: "MIMI",
        time: '3:20',
        image: 'songs/ttto/main.png',
        ranked: true,
        difficulties: [
            { name: "Easy", mapper: "joelM", stars: 1.03 },
        ]
    },
    {
        id: 5,
        title: "Dreaming",
        artist: "Artist Name",
        time: '4:02',
        image: 'songs/ttto/main.png',
        ranked: true,
        difficulties: [
            { name: "Hard", mapper: "joelM", stars: 3.50 },
        ]
    }
];

// ══════════════════════════════════════════════════════════════
// STORAGE KEYS
// ══════════════════════════════════════════════════════════════
const PUBLISHED_SONGS_KEY = 'josu_published_songs';  // Public database (visible in browse)
const LOCAL_SONGS_KEY = 'josu_local_songs';          // User's personal unpublished songs
const DOWNLOADED_KEY = 'josu_downloaded_songs';      // IDs of songs downloaded from browse

// ══════════════════════════════════════════════════════════════
// PUBLISHED SONGS (for browse page - simulated public database)
// ══════════════════════════════════════════════════════════════
function getPublishedSongs() {
    try {
        const saved = localStorage.getItem(PUBLISHED_SONGS_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.error('Error loading published songs:', e);
    }
    return [];
}

// ══════════════════════════════════════════════════════════════
// LOCAL LIBRARY (user's personal unpublished songs)
// ══════════════════════════════════════════════════════════════
function getLocalSongs() {
    try {
        const saved = localStorage.getItem(LOCAL_SONGS_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.error('Error loading local songs:', e);
    }
    return [];
}

// ══════════════════════════════════════════════════════════════
// DOWNLOADED SONGS (IDs referencing the published database)
// ══════════════════════════════════════════════════════════════
function getDownloadedSongIds() {
    try {
        const saved = localStorage.getItem(DOWNLOADED_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.error('Error loading downloaded song IDs:', e);
    }
    return [];
}

// Resolve downloaded IDs to actual song objects from Firebase
async function getDownloadedSongs() {
    const ids = getDownloadedSongIds();
    if (ids.length === 0) return [];

    // Try fetching from Firebase first
    if (typeof JosuFirebase !== 'undefined') {
        try {
            const results = await Promise.all(
                ids.map(id => JosuFirebase.getPublishedSongById(String(id)))
            );
            const songs = results.filter(Boolean);
            if (songs.length > 0) return songs;
        } catch (e) {
            console.warn('Failed to load downloaded songs from Firebase:', e.message);
        }
    }

    // Fallback to localStorage published songs
    const published = getPublishedSongs();
    return ids.map(id => published.find(s => (s.id || s.storeId) === id)).filter(Boolean);
}

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════

// songs: Published songs only (for browse page)
export const songs = getPublishedSongs();

// builtInSongs: Hardcoded official songs (for reference/fallback)
export const builtInSongs = songsI;

// localLibrary: User's personal unpublished library
export const localLibrary = getLocalSongs();

// allPlayableSongs: Everything the user can actually play
// (built-in + local unpublished + downloaded from browse)
export async function getAllPlayableSongs() {
    const local = getLocalSongs();
    const downloaded = await getDownloadedSongs();
    
    // Track IDs to avoid duplicates (use id or storeId)
    const seen = new Set();
    const result = [];
    
    function songKey(song) { return String(song.id || song.storeId); }
    
    // Add built-in songs first
    for (const song of songsI) {
        const key = songKey(song);
        if (!seen.has(key)) {
            seen.add(key);
            result.push(song);
        }
    }
    
    // Add local unpublished songs
    for (const song of local) {
        const key = songKey(song);
        if (!seen.has(key)) {
            seen.add(key);
            result.push(song);
        }
    }
    
    // Add downloaded songs from browse
    for (const song of downloaded) {
        const key = songKey(song);
        if (!seen.has(key)) {
            seen.add(key);
            result.push(song);
        }
    }
    
    return result;
}