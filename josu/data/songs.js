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
        ranked: true,
        difficulties: [
            { name: "medium", mapper: "joelM", stars: 2.67 },
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
const LOCAL_SONGS_KEY = 'josu_local_songs';          // User's personal library

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
// LOCAL LIBRARY (user's personal game library)
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
// EXPORTS
// ══════════════════════════════════════════════════════════════

// songs: Published songs only (for browse page)
export const songs = getPublishedSongs();

// builtInSongs: Hardcoded official songs (for reference/fallback)
export const builtInSongs = songsI;

// localLibrary: User's personal library (uploaded to game)
export const localLibrary = getLocalSongs();

// allPlayableSongs: Everything the user can actually play
// (built-in + local library + published by them)
export function getAllPlayableSongs() {
    const published = getPublishedSongs();
    const local = getLocalSongs();
    
    // Combine: built-in songs + local library (avoiding duplicates)
    const localIds = new Set(local.map(s => s.id));
    const publishedIds = new Set(published.map(s => s.id));
    
    return [
        ...songsI,
        ...local.filter(s => !publishedIds.has(s.id)),  // Local not already published
        ...published.filter(s => !localIds.has(s.id))   // Published not already local
    ];
}