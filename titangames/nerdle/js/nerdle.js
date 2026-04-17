// Firebase imports for database
import { db, auth, puzzleDb } from "../../js/firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Points system
import { 
    submitGameCompletion, 
    checkGameCompletion, 
    getTodayStats,
    onAuthChange 
} from "../../js/points.js";

let currentUser = null;
let todayPoints = 0;
let alreadyCompleted = false;
let completedGameData = null;
let boardReady = false;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    await updatePointsDisplay();
    if (user) {
        const completion = await checkGameCompletion('nerdle');
        if (completion.completed) {
            alreadyCompleted = true;
            completedGameData = completion.data;
            if (boardReady && targetWord) {
                restoreCompletedGame();
            }
        }
    }
});

async function restoreCompletedGame() {
    if (!completedGameData || !completedGameData.boardState) return;
    if (gameOver) return;
    
    const boardState = completedGameData.boardState;
    gameOver = true;
    gameScore = completedGameData.points || 0;
    
    document.getElementById("splashOverlay").classList.add("hidden");
    
    for (let r = 0; r < boardState.length; r++) {
        const guess = boardState[r];
        for (let c = 0; c < guess.length; c++) {
            const tile = getTile(r, c);
            if (tile) {
                tile.textContent = guess[c];
            }
        }
        currentRow = r;
        await revealRowInstant(guess);
        currentRow++;
    }
    
    setTimeout(function() {
        openStatsModal(completedGameData.won, completedGameData.guesses);
    }, 500);
}

function revealRowInstant(guess) {
    const tiles = [];
    for (let c = 0; c < WORD_LENGTH; c++) {
        tiles.push(getTile(currentRow, c));
    }
    const target = targetWord.split("");
    const guessArr = guess.split("");
    const states = new Array(WORD_LENGTH).fill("absent");
    const targetCopy = target.slice();

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] === target[i]) {
            states[i] = "correct";
            targetCopy[i] = null;
        }
    }

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (states[i] === "correct") continue;
        const idx = targetCopy.indexOf(guessArr[i]);
        if (idx !== -1) {
            states[i] = "present";
            targetCopy[idx] = null;
        }
    }

    tiles.forEach(function (tile, i) {
        tile.setAttribute("data-state", states[i]);
        updateKeyboard(guessArr[i], states[i]);
    });
    
    return Promise.resolve();
}

// word checkers
const FALLBACK_WORDS = [
    "about","after","again","agent","alarm","alone","among","angel","apple","arena",
    "basic","beach","begin","black","blade","blank","blast","blind","block","blood",
    "bloom","board","brain","brand","brave","bread","break","bring","broad","build",
    "carry","catch","cause","chain","chair","chaos","charm","chart","check","chess",
    "chest","child","claim","class","clean","clear","clock","close","cloud","coast",
    "color","count","court","cover","craft","crash","crazy","cream","crime","cross",
    "crowd","crush","curve","cycle","dance","death","depth","doubt","draft","drain",
    "drama","dream","dress","drift","drink","drive","early","earth","eight","elite",
    "empty","enemy","enjoy","enter","equal","error","event","every","exist","extra",
    "faith","false","fancy","fatal","fault","feast","fence","fever","field","fifth",
    "fifty","fight","final","first","fixed","flame","flash","float","flood","floor",
    "flour","fluid","focus","force","found","frame","fresh","front","frost","fruit",
    "fully","funny","ghost","giant","given","glass","globe","glory","going","grace",
    "grade","grain","grand","grant","grape","graph","grass","grave","great","green",
    "greet","grief","gross","group","grown","guard","guess","guest","guide","guild",
    "habit","happy","harsh","heart","heavy","honor","horse","hotel","house","human",
    "humor","ideal","image","input","jewel","joint","judge","juice","knife","knock",
    "known","label","labor","large","laser","later","laugh","layer","learn","leave",
    "legal","level","light","limit","logic","loose","lover","lower","loyal","lucky",
    "magic","major","match","maybe","mayor","media","mercy","merge","metal","might",
    "minor","mixed","model","money","month","moral","motor","mount","mouse","mouth",
    "movie","music","naval","nerve","never","night","noble","noise","north","novel",
    "nurse","occur","ocean","offer","often","order","other","outer","owner","panic",
    "paper","party","pasta","patch","pause","peace","peach","pearl","penny","phase",
    "phone","photo","piano","piece","pilot","pitch","pixel","pizza","place","plain",
    "plane","plant","plate","point","polar","pound","power","press","price","pride",
    "prime","print","prior","prize","proof","proud","prove","pulse","punch","queen",
    "query","quest","quiet","quite","quote","radar","radio","raise","range","rapid",
    "ratio","reach","react","ready","realm","rebel","refer","reign","relax","reply",
    "rider","right","rigid","risky","rival","river","robot","rouge","rough","round",
    "route","royal","ruler","rural","saint","salad","sauce","scale","scene","score",
    "scout","sense","serve","setup","seven","shade","shake","shame","shape","share",
    "shark","sharp","sheep","sheet","shelf","shell","shine","shirt","shock","shoot",
    "shore","short","shout","sight","skill","skull","slate","sleep","slice","slide",
    "slope","smart","smell","smile","smoke","snake","solar","solid","solve","sorry",
    "sound","south","space","spare","spark","speak","speed","spend","spine","spoon",
    "sport","spray","squad","stack","staff","stage","stand","stare","start","state",
    "steal","steam","steel","steer","stick","still","stock","stone","store","storm",
    "story","strap","straw","strip","stuck","study","stuff","style","sugar","surge",
    "swamp","swear","sweat","sweep","sweet","swift","swing","sword","taste","teach",
    "teeth","theme","thick","thing","think","third","thorn","three","throw","thumb",
    "tiger","tight","title","today","token","topic","torch","total","touch","tough",
    "tower","toxic","trace","track","trade","trail","train","trait","trash","treat",
    "trend","trial","tribe","trick","troop","truck","truly","trunk","trust","truth",
    "twice","twist","ultra","uncle","under","union","unite","until","upper","upset",
    "urban","usage","usual","valid","value","vapor","vault","verse","video","vigor",
    "viral","virus","visit","vital","vivid","vocal","voice","voter","wagon","watch",
    "water","weary","weave","weird","whale","wheat","wheel","white","whole","whose",
    "witch","woman","world","worry","worse","worst","worth","would","wound","wrath",
    "write","wrong","yacht","yield","young","youth","zebra"
];

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;
const STATS_KEY = "nerdle_stats";
const GAME_STATE_KEY = "nerdle_game_state";

// Scoring constants
const POINTS_CORRECT = 15;  // Points for letter in correct position
const POINTS_PRESENT = 5;   // Points for letter present but wrong position

/**
 * Update the points display in the header
 */
async function updatePointsDisplay() {
    const pointsEl = document.getElementById('headerPoints');
    if (!pointsEl) return;
    
    if (currentUser) {
        try {
            const stats = await getTodayStats();
            todayPoints = stats.totalPoints;
            pointsEl.textContent = `${todayPoints} pts`;
            pointsEl.style.display = 'flex';
        } catch (err) {
            pointsEl.textContent = '0 pts';
            pointsEl.style.display = 'flex';
        }
    } else {
        pointsEl.style.display = 'none';
    }
}

let currentRow = 0;
let currentTile = 0;
let gameOver = false;
let validating = false;
let targetWord = "";
let wordList = [];
let lastWinRow = -1;
let gameScore = 0;          // Total score for current game
let guessScores = [];       // Score for each guess

function getDefaultStats() {
    return {
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
        guessDistribution: [0, 0, 0, 0, 0, 0],
        lastPlayedDay: null
    };
}

function loadStats() {
    try {
        const data = localStorage.getItem(STATS_KEY);
        if (data) return JSON.parse(data);
    } catch (e) {}
    return getDefaultStats();
}

function saveStats(stats) {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {}
}

/**
 * Load stats from Firebase for logged-in user
 */
async function loadStatsFromDb() {
    if (!currentUser) return loadStats();
    
    try {
        const userDoc = await getDoc(doc(db, 'titan_users', currentUser.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            const nerdleStats = data.gameStats?.nerdle;
            if (nerdleStats?.stats) {
                // Merge with local stats (prefer DB)
                const dbStats = nerdleStats.stats;
                saveStats(dbStats);  // Sync to localStorage
                return dbStats;
            }
        }
    } catch (e) {
        console.error('Error loading stats from DB:', e);
    }
    return loadStats();
}

/**
 * Save Nerdle stats to Firebase
 */
async function saveStatsToDb(stats) {
    saveStats(stats);  // Always save locally too
    
    if (!currentUser) return;
    
    try {
        const userRef = doc(db, 'titan_users', currentUser.uid);
        await setDoc(userRef, {
            gameStats: {
                nerdle: {
                    stats: stats,
                    lastUpdated: serverTimestamp()
                }
            }
        }, { merge: true });
    } catch (e) {
        console.error('Error saving stats to DB:', e);
    }
}

async function recordWin(guessNum) {
    const stats = await loadStatsFromDb();
    const today = getDayOffset();
    
    if (stats.lastPlayedDay === today) return stats;
    
    stats.gamesPlayed++;
    stats.gamesWon++;
    stats.guessDistribution[guessNum - 1]++;
    
    if (stats.lastPlayedDay === today - 1 || stats.lastPlayedDay === null) {
        stats.currentStreak++;
    } else {
        stats.currentStreak = 1;
    }
    
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.lastPlayedDay = today;
    
    await saveStatsToDb(stats);
    return stats;
}

async function recordLoss() {
    const stats = await loadStatsFromDb();
    const today = getDayOffset();
    
    if (stats.lastPlayedDay === today) return stats;
    
    stats.gamesPlayed++;
    stats.currentStreak = 0;
    stats.lastPlayedDay = today;
    
    await saveStatsToDb(stats);
    return stats;
}

function createStatsModal() {
    const overlay = document.createElement("div");
    overlay.className = "stats-overlay";
    overlay.id = "statsOverlay";
    overlay.innerHTML = `
        <div class="stats-modal">
            <div class="stats-header">
                <button class="stats-close" id="statsClose" aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="stats-body">
                <div class="stats-icon">
                    <svg viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                </div>
                <h2 class="stats-title" id="statsTitle">Congratulations!</h2>
                <p class="stats-section-title">Statistics</p>
                <div class="stats-numbers">
                    <div class="stats-stat">
                        <span class="stats-stat-value" id="statPlayed">0</span>
                        <span class="stats-stat-label">Played</span>
                    </div>
                    <div class="stats-stat">
                        <span class="stats-stat-value" id="statWinPct">0</span>
                        <span class="stats-stat-label">Win %</span>
                    </div>
                    <div class="stats-stat">
                        <span class="stats-stat-value" id="statCurrentStreak">0</span>
                        <span class="stats-stat-label">Current<br>Streak</span>
                    </div>
                    <div class="stats-stat">
                        <span class="stats-stat-value" id="statMaxStreak">0</span>
                        <span class="stats-stat-label">Max<br>Streak</span>
                    </div>
                </div>
                <p class="stats-section-title">Guess Distribution</p>
                <div class="stats-distribution" id="statsDistribution"></div>
                <button class="stats-share-btn" id="statsShareBtn">
                    Share
                    <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                </button>
                <div class="stats-games-row">
                    <a href="../connections/index.html" class="stats-game-card">
                        <div class="stats-game-card-icon" style="background:#C5B4E3">
                            <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" fill="#6A4C93"/><rect x="14" y="3" width="7" height="7" rx="1" fill="#C77DBA"/><rect x="3" y="14" width="7" height="7" rx="1" fill="#C77DBA"/><rect x="14" y="14" width="7" height="7" rx="1" fill="#6A4C93"/></svg>
                        </div>
                        <span class="stats-game-card-name">Connections</span>
                    </a>
                    <a href="../crossword.html" class="stats-game-card">
                        <div class="stats-game-card-icon" style="background:#C2D0E8">
                            <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="white" stroke="#ccc" stroke-width="1"/><rect x="5" y="5" width="5" height="5" fill="#121212"/><rect x="14" y="5" width="5" height="5" fill="#121212"/><rect x="5" y="14" width="5" height="5" fill="#121212"/><rect x="14" y="14" width="5" height="5" fill="white"/></svg>
                        </div>
                        <span class="stats-game-card-name">The Mini</span>
                    </a>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById("statsClose").addEventListener("click", closeStatsModal);
    overlay.addEventListener("click", function(e) {
        if (e.target === overlay) closeStatsModal();
    });
    document.getElementById("statsShareBtn").addEventListener("click", shareResults);
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && overlay.classList.contains("open")) {
            closeStatsModal();
        }
    });
}

async function openStatsModal(won, guessNum) {
    const stats = await loadStatsFromDb();
    const overlay = document.getElementById("statsOverlay");
    
    let title = "Statistics";
    if (won === true) title = "Congratulations!";
    else if (won === false) title = "Better luck next time";
    
    document.getElementById("statsTitle").textContent = title;
    document.getElementById("statPlayed").textContent = stats.gamesPlayed;
    document.getElementById("statWinPct").textContent = stats.gamesPlayed > 0 
        ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
        : 0;
    document.getElementById("statCurrentStreak").textContent = stats.currentStreak;
    document.getElementById("statMaxStreak").textContent = stats.maxStreak;
    
    const distContainer = document.getElementById("statsDistribution");
    distContainer.innerHTML = "";
    
    // If game was just played, show points per guess in distribution
    if (won !== null && guessScores.length > 0) {
        const maxScore = Math.max(...guessScores, 1);
        
        for (let i = 0; i < MAX_GUESSES; i++) {
            const row = document.createElement("div");
            row.className = "stats-bar-row";
            const score = guessScores[i] || 0;
            const width = score > 0 ? Math.max((score / maxScore) * 100, 12) : 8;
            const isHighlight = i < guessScores.length;
            row.innerHTML = `
                <span class="stats-bar-num">${i + 1}</span>
                <div class="stats-bar${isHighlight ? " highlight" : ""}" style="width:${width}%">${score > 0 ? score : 0}</div>
            `;
            distContainer.appendChild(row);
        }
        
        // Add total row
        const totalRow = document.createElement("div");
        totalRow.className = "stats-bar-row stats-total-row";
        totalRow.innerHTML = `
            <span class="stats-bar-num" style="font-weight:700">Σ</span>
            <div class="stats-bar highlight" style="width:100%;background:#3a7ec4">${gameScore} pts</div>
        `;
        distContainer.appendChild(totalRow);
    } else {
        // Show normal guess distribution when viewing stats without playing
        const maxGuesses = Math.max(...stats.guessDistribution, 1);
        
        stats.guessDistribution.forEach(function(count, i) {
            const row = document.createElement("div");
            row.className = "stats-bar-row";
            const width = count > 0 ? Math.max((count / maxGuesses) * 100, 8) : 8;
            row.innerHTML = `
                <span class="stats-bar-num">${i + 1}</span>
                <div class="stats-bar" style="width:${width}%">${count}</div>
            `;
            distContainer.appendChild(row);
        });
    }
    
    lastWinRow = won ? guessNum : -1;
    overlay.classList.add("open");
}

function closeStatsModal() {
    document.getElementById("statsOverlay").classList.remove("open");
}

function shareResults() {
    const stats = loadStats();
    const puzzleNum = getPuzzleNumber();
    const guessCount = lastWinRow > 0 ? lastWinRow : "X";
    
    let grid = "";
    for (let r = 0; r < (lastWinRow > 0 ? lastWinRow : MAX_GUESSES); r++) {
        for (let c = 0; c < WORD_LENGTH; c++) {
            const tile = getTile(r, c);
            const state = tile.getAttribute("data-state");
            if (state === "correct") grid += "🟦";
            else if (state === "present") grid += "🟨";
            else grid += "⬛";
        }
        grid += "\n";
    }
    
    const text = `Nerdle ${puzzleNum} ${guessCount}/${MAX_GUESSES}\n\n${grid}`;
    
    if (navigator.share) {
        navigator.share({ text: text }).catch(function() {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
            showToast("Copied to clipboard!");
        });
    }
}

async function fetchWordList() {
    try {
        const res = await fetch("https://api.datamuse.com/words?sp=?????&max=1000");
        if (!res.ok) throw new Error();
        const data = await res.json();
        const words = data
            .map(function (w) { return w.word.toLowerCase(); })
            .filter(function (w) { return /^[a-z]{5}$/.test(w); });
        words.sort();
        return words.length >= 100 ? words : FALLBACK_WORDS;
    } catch {
        return FALLBACK_WORDS;
    }
}

async function isValidWord(word) {
    try {
        const res = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + word.toLowerCase());
        return res.ok;
    } catch {
        return wordList.includes(word.toLowerCase());
    }
}

function getDayOffset() {
    const start = new Date(2024, 0, 1);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getPuzzleNumber() {
    return getDayOffset() + 1;
}

function formatDate() {
    const now = new Date();
    return now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function initSplash() {
    document.getElementById("splashDate").textContent = formatDate();
    document.getElementById("splashNumber").textContent = "No. " + getPuzzleNumber();

    document.getElementById("playBtn").addEventListener("click", function () {
        if (alreadyCompleted && completedGameData) {
            restoreCompletedGame();
        } else {
            document.getElementById("splashOverlay").classList.add("hidden");
        }
    });
}

function createBoard() {
    const board = document.getElementById("board");
    for (let r = 0; r < MAX_GUESSES; r++) {
        const row = document.createElement("div");
        row.classList.add("board-row");
        for (let c = 0; c < WORD_LENGTH; c++) {
            const tile = document.createElement("div");
            tile.classList.add("tile");
            tile.setAttribute("data-row", r);
            tile.setAttribute("data-col", c);
            row.appendChild(tile);
        }
        board.appendChild(row);
    }
}

function getTile(row, col) {
    return document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
}

function getCurrentRowTiles() {
    const tiles = [];
    for (let c = 0; c < WORD_LENGTH; c++) {
        tiles.push(getTile(currentRow, c));
    }
    return tiles;
}

function addLetter(letter) {
    if (currentTile >= WORD_LENGTH || gameOver || validating) return;
    const tile = getTile(currentRow, currentTile);
    tile.textContent = letter;
    tile.setAttribute("data-state", "tbd");
    tile.classList.add("pop");
    tile.addEventListener("animationend", function () {
        tile.classList.remove("pop");
    }, { once: true });
    currentTile++;
}

function removeLetter() {
    if (currentTile <= 0 || gameOver || validating) return;
    currentTile--;
    const tile = getTile(currentRow, currentTile);
    tile.textContent = "";
    tile.removeAttribute("data-state");
}

function shakeRow() {
    const tiles = getCurrentRowTiles();
    tiles.forEach(function (tile) {
        tile.classList.add("shake-row");
        tile.addEventListener("animationend", function () {
            tile.classList.remove("shake-row");
        }, { once: true });
    });
}

function showToast(message, duration) {
    duration = duration === undefined ? 1500 : duration;
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.classList.add("toast");
    toast.textContent = message;
    container.appendChild(toast);
    if (duration !== Infinity) {
        setTimeout(function () {
            toast.classList.add("fade-out");
            toast.addEventListener("animationend", function () {
                toast.remove();
            });
        }, duration);
    }
    return toast;
}

function updateKeyboard(letter, state) {
    const key = document.querySelector(`.key[data-key="${letter}"]`);
    if (!key) return;
    const current = key.getAttribute("data-state");
    if (current === "correct") return;
    if (current === "present" && state !== "correct") return;
    key.setAttribute("data-state", state);
}

function calculateGuessScore(guess) {
    const target = targetWord.split("");
    const guessArr = guess.split("");
    const targetCopy = target.slice();
    let score = 0;
    let correctCount = 0;
    let presentCount = 0;

    // First pass: check for correct positions
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] === target[i]) {
            score += POINTS_CORRECT;
            correctCount++;
            targetCopy[i] = null;
        }
    }

    // Second pass: check for present letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] === target[i]) continue;
        const idx = targetCopy.indexOf(guessArr[i]);
        if (idx !== -1) {
            score += POINTS_PRESENT;
            presentCount++;
            targetCopy[idx] = null;
        }
    }

    return { score, correctCount, presentCount };
}

function getBoardState(numRows) {
    const boardState = [];
    for (let r = 0; r < numRows; r++) {
        let rowWord = "";
        for (let c = 0; c < WORD_LENGTH; c++) {
            const tile = getTile(r, c);
            if (tile && tile.textContent) {
                rowWord += tile.textContent;
            }
        }
        if (rowWord.length === WORD_LENGTH) {
            boardState.push(rowWord);
        }
    }
    return boardState;
}

function revealRow(guess) {
    const tiles = getCurrentRowTiles();
    const target = targetWord.split("");
    const guessArr = guess.split("");
    const states = new Array(WORD_LENGTH).fill("absent");
    const targetCopy = target.slice();

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] === target[i]) {
            states[i] = "correct";
            targetCopy[i] = null;
        }
    }

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (states[i] === "correct") continue;
        const idx = targetCopy.indexOf(guessArr[i]);
        if (idx !== -1) {
            states[i] = "present";
            targetCopy[idx] = null;
        }
    }

    return new Promise(function (resolve) {
        tiles.forEach(function (tile, i) {
            setTimeout(function () {
                tile.classList.add("flip");
                setTimeout(function () {
                    tile.setAttribute("data-state", states[i]);
                    updateKeyboard(guessArr[i], states[i]);
                }, 250);
                if (i === WORD_LENGTH - 1) {
                    tile.addEventListener("animationend", function () {
                        resolve();
                    }, { once: true });
                }
            }, i * 300);
        });
    });
}

function bounceRow(row) {
    for (let c = 0; c < WORD_LENGTH; c++) {
        const tile = getTile(row, c);
        setTimeout(function () {
            tile.classList.add("bounce");
        }, c * 100);
    }
}

async function submitGuess() {
    if (gameOver || validating) return;
    if (currentTile < WORD_LENGTH) {
        shakeRow();
        showToast("Not enough letters");
        return;
    }

    let guess = "";
    for (let c = 0; c < WORD_LENGTH; c++) {
        guess += getTile(currentRow, c).textContent;
    }

    validating = true;
    const checkingToast = showToast("Checking...", Infinity);
    const valid = await isValidWord(guess);
    checkingToast.remove();
    validating = false;

    if (!valid) {
        shakeRow();
        showToast("Not in word list");
        return;
    }

    const row = currentRow;

    // Calculate score for this guess
    const scoreResult = calculateGuessScore(guess);
    guessScores.push(scoreResult.score);
    gameScore += scoreResult.score;

    revealRow(guess).then(async function () {
        const scoreMsg = `+${scoreResult.score} pts (${scoreResult.correctCount}🟦 ${scoreResult.presentCount}🟨)`;
        showToast(scoreMsg, 2000);

        if (guess === targetWord) {
            gameOver = true;
            const guessNum = row + 1;
            const stats = await recordWin(guessNum);
            
            if (currentUser && !alreadyCompleted) {
                const boardState = getBoardState(guessNum);
                const result = await submitGameCompletion('nerdle', gameScore, {
                    guesses: guessNum,
                    won: true,
                    word: targetWord,
                    boardState: boardState,
                    stats: stats
                });
                if (result.success) {
                    alreadyCompleted = true;
                    await updatePointsDisplay();
                }
            }
            
            const messages = ["Genius", "Magnificent", "Impressive", "Splendid", "Great", "Phew"];
            setTimeout(function () {
                showToast(messages[row] + " — Total: " + gameScore + " pts", 2500);
            }, 2200);
            setTimeout(function () {
                bounceRow(row);
            }, 200);
            setTimeout(function () {
                openStatsModal(true, guessNum);
            }, 4800);
            return;
        }

        if (row === MAX_GUESSES - 1) {
            gameOver = true;
            const stats = await recordLoss();
            
            if (currentUser && !alreadyCompleted) {
                const boardState = getBoardState(MAX_GUESSES);
                const result = await submitGameCompletion('nerdle', gameScore, {
                    guesses: MAX_GUESSES,
                    won: false,
                    word: targetWord,
                    boardState: boardState,
                    stats: stats
                });
                if (result.success) {
                    alreadyCompleted = true;
                    await updatePointsDisplay();
                }
            }
            
            setTimeout(function () {
                showToast(targetWord + " — Total: " + gameScore + " pts", 3500);
            }, 2200);
            setTimeout(function () {
                openStatsModal(false, 0);
            }, 5800);
            return;
        }

        currentRow++;
        currentTile = 0;
    });
}

function handleKeyInput(key) {
    if (gameOver || validating) return;
    if (key === "ENTER") {
        submitGuess();
    } else if (key === "BACKSPACE") {
        removeLetter();
    } else if (/^[A-Z]$/.test(key)) {
        addLetter(key);
    }
}

function initKeyboard() {
    document.getElementById("keyboard").addEventListener("click", function (e) {
        const keyEl = e.target.closest(".key");
        if (!keyEl) return;
        const key = keyEl.getAttribute("data-key");
        handleKeyInput(key);
    });

    document.addEventListener("keydown", function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === "Enter") {
            handleKeyInput("ENTER");
        } else if (e.key === "Backspace") {
            handleKeyInput("BACKSPACE");
        } else {
            const letter = e.key.toUpperCase();
            if (/^[A-Z]$/.test(letter)) {
                handleKeyInput(letter);
            }
        }
    });
}

async function fetchTodaysPuzzle() {
    try {
        const today = new Date();
        const dateStr = today.getFullYear() + '-' + 
            String(today.getMonth() + 1).padStart(2, '0') + '-' + 
            String(today.getDate()).padStart(2, '0');
        
        const docSnap = await getDoc(doc(puzzleDb, 'nerdles', dateStr));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === 'published' && data.word) {
                return { word: data.word.toUpperCase(), hints: data.hints || [] };
            }
        }
    } catch (err) {
        console.log('Could not fetch from database, using fallback');
    }
    return null;
}

async function init() {
    initSplash();
    createBoard();
    initKeyboard();
    createStatsModal();
    
    document.getElementById("statsBtn").addEventListener("click", function() {
        openStatsModal(null, 0);
    });
    
    // Try to get today's puzzle from database first
    const dbPuzzle = await fetchTodaysPuzzle();
    if (dbPuzzle) {
        targetWord = dbPuzzle.word;
        // Store hints for later use if needed
        window.puzzleHints = dbPuzzle.hints;
    } else {
        // Fallback to word list
        wordList = await fetchWordList();
        targetWord = wordList[getDayOffset() % wordList.length].toUpperCase();
    }
    
    // Mark board as ready and restore if already completed
    boardReady = true;
    if (alreadyCompleted && completedGameData) {
        restoreCompletedGame();
    }
}

init();
