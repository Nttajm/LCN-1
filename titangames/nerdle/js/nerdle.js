// Firebase imports for database
import { db, auth, puzzleDb } from "../../js/firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Points system
import { 
    submitGameCompletion, 
    checkGameCompletion, 
    getTodayStats,
    getTodayLeaderboard,
    onAuthChange 
} from "../../js/points.js";

let currentUser = null;
let todayPoints = 0;
let alreadyCompleted = false;
let completedGameData = null;
let boardReady = false;
let draftRestored = false;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Sign in anonymously so guests can read Firestore (leaderboard)
        try { await signInAnonymously(auth); } catch (e) { /* ignore */ }
        return;
    }
    currentUser = user;
    await updatePointsDisplay();
    if (!user.isAnonymous) {
        const completion = await checkGameCompletion('nerdle');
        if (completion.completed) {
            alreadyCompleted = true;
            completedGameData = completion.data;
            if (boardReady && targetWord) {
                restoreCompletedGame();
            }
        } else if (boardReady && targetWord && !draftRestored) {
            await restoreSavedGameState();
        }
    } else if (boardReady && targetWord && !draftRestored && !alreadyCompleted) {
        await restoreSavedGameState();
    }
});

async function restoreCompletedGame() {
    if (!completedGameData || !completedGameData.boardState) return;
    if (gameOver) return;
    
    const boardState = completedGameData.boardState;
    gameOver = true;
    gameWon = !!completedGameData.won;
    gameScore = completedGameData.points || 0;
    guessScores = new Array(boardState.length).fill(0);
    if (gameWon && completedGameData.guesses > 0 && completedGameData.guesses <= boardState.length) {
        guessScores[completedGameData.guesses - 1] = gameScore;
        lastWinRow = completedGameData.guesses;
    }
    
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

// NYT Wordle-style scoring translated to points.
// Wordle itself is scored by attempt count (1-6), so we map fewer attempts to more points.
const NYT_WORDLE_POINTS_BY_GUESS = [100, 80, 60, 40, 20, 10];
const NYT_WORDLE_LOSS_POINTS = 0;

/**
 * Update the points display in the header
 */
async function updatePointsDisplay(storePrevious = false) {
    const pointsEl = document.getElementById('headerPoints');
    if (!pointsEl) return;
    
    if (currentUser && !currentUser.isAnonymous) {
        try {
            const stats = await getTodayStats();
            if (storePrevious) {
                previousTodayPoints = todayPoints;
            }
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
let gameWon = null;
let gameScore = 0;          // Total score for current game
let guessScores = [];       // Score for each guess
let statsRefreshInterval = null;

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
    if (!currentUser || currentUser.isAnonymous) return loadStats();
    
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
    
    if (!currentUser || currentUser.isAnonymous) return;
    
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
                
                <!-- Game Board Preview - shows your guesses -->
                <div class="stats-game-preview" id="statsGamePreview" style="display:none">
                    <p class="stats-section-title">Your Game</p>
                    <div class="stats-board-grid" id="statsBoardGrid"></div>
                    <div class="stats-score-summary" id="statsScoreSummary"></div>
                </div>
                
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
                <div class="stats-leaderboard" id="statsLeaderboard" style="display:none">
                    <p class="stats-section-title">Leaderboard</p>
                    <div class="stats-leaderboard-body" id="statsLeaderboardBody"></div>
                </div>
                
                <div class="stats-login-prompt" id="statsLoginPrompt" style="display:none">
                    <p class="stats-login-message">Sign in to save your score and compete on the leaderboard!</p>
                    <button class="stats-share-btn" id="statsLoginBtn">
                        Log In
                        <svg viewBox="0 0 24 24"><path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/></svg>
                    </button>
                </div>

                <div class="stats-games-row">
                    <a href="../relations/index.html" class="stats-game-card">
                        <div class="stats-game-card-icon" style="background:#C5B4E3">
                            <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" fill="#6A4C93"/><rect x="14" y="3" width="7" height="7" rx="1" fill="#C77DBA"/><rect x="3" y="14" width="7" height="7" rx="1" fill="#C77DBA"/><rect x="14" y="14" width="7" height="7" rx="1" fill="#6A4C93"/></svg>
                        </div>
                        <span class="stats-game-card-name">Relations</span>
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
    document.getElementById("statsLoginBtn").addEventListener("click", function() {
        window.location.href = '../signin.html';
    });
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && overlay.classList.contains("open")) {
            closeStatsModal();
        }
    });
}

function stopStatsAutoRefresh() {
    if (statsRefreshInterval) {
        clearInterval(statsRefreshInterval);
        statsRefreshInterval = null;
    }
}

function startStatsAutoRefresh(isLiveView) {
    stopStatsAutoRefresh();
    if (!isLiveView) return;

    statsRefreshInterval = setInterval(async function () {
        const overlay = document.getElementById("statsOverlay");
        if (!overlay || !overlay.classList.contains("open")) return;

        await updatePointsDisplay();
        await renderLeaderboard(false);
    }, 10000);
}

function formatPointsLabel(points) {
    if (!points || points <= 0) return "nada";
    return `${points} pts`;
}

function getTodayDateKey() {
    const today = new Date();
    return today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');
}

function buildDraftState() {
    const completeRows = getBoardState(Math.min(currentRow + 1, MAX_GUESSES));
    return {
        date: getTodayDateKey(),
        word: targetWord,
        boardState: completeRows,
        currentRow,
        guessScores,
        gameScore,
        gameOver,
        gameWon,
        lastWinRow
    };
}

function loadSessionDraftState() {
    try {
        const raw = sessionStorage.getItem(GAME_STATE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveSessionDraftState(state) {
    try {
        sessionStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
    } catch {}
}

function clearSessionDraftState() {
    try {
        sessionStorage.removeItem(GAME_STATE_KEY);
    } catch {}
}

function clearLegacyLocalDraftState() {
    try {
        localStorage.removeItem(GAME_STATE_KEY);
    } catch {}
}

async function saveDraftState() {
    if (!targetWord || gameOver || alreadyCompleted) return;

    const draft = buildDraftState();
    saveSessionDraftState(draft);

    if (!currentUser || currentUser.isAnonymous) return;
    try {
        const userRef = doc(db, 'titan_users', currentUser.uid);
        await setDoc(userRef, {
            gameStats: {
                nerdle: {
                    dailyState: draft,
                    lastUpdated: serverTimestamp()
                }
            }
        }, { merge: true });
    } catch (e) {
        console.error('Error saving draft state to DB:', e);
    }
}

async function clearDraftState() {
    clearSessionDraftState();
    clearLegacyLocalDraftState();
    if (!currentUser || currentUser.isAnonymous) return;
    try {
        const userRef = doc(db, 'titan_users', currentUser.uid);
        await setDoc(userRef, {
            gameStats: {
                nerdle: {
                    dailyState: null,
                    lastUpdated: serverTimestamp()
                }
            }
        }, { merge: true });
    } catch (e) {
        console.error('Error clearing draft state from DB:', e);
    }
}

async function getDbDraftState() {
    if (!currentUser || currentUser.isAnonymous) return null;
    try {
        const userDoc = await getDoc(doc(db, 'titan_users', currentUser.uid));
        if (!userDoc.exists()) return null;
        return userDoc.data()?.gameStats?.nerdle?.dailyState || null;
    } catch (e) {
        console.error('Error loading draft state from DB:', e);
        return null;
    }
}

async function restoreSavedGameState() {
    if (draftRestored || alreadyCompleted || gameOver || !boardReady || !targetWord) return;

    const todayKey = getTodayDateKey();
    const sessionDraft = loadSessionDraftState();
    const dbDraft = currentUser ? await getDbDraftState() : null;
    const draft = dbDraft || sessionDraft;

    if (!draft) return;
    if (draft.date !== todayKey || draft.word !== targetWord) {
        await clearDraftState();
        return;
    }
    if (!Array.isArray(draft.boardState)) return;

    draftRestored = true;
    guessScores = Array.isArray(draft.guessScores) ? draft.guessScores.slice() : [];
    gameScore = Number(draft.gameScore || 0);
    gameWon = draft.gameWon === true ? true : (draft.gameWon === false ? false : null);
    lastWinRow = Number(draft.lastWinRow || -1);

    for (let r = 0; r < draft.boardState.length; r++) {
        const guess = draft.boardState[r];
        if (!guess || guess.length !== WORD_LENGTH) continue;
        for (let c = 0; c < guess.length; c++) {
            const tile = getTile(r, c);
            if (tile) {
                tile.textContent = guess[c];
            }
        }
        currentRow = r;
        await revealRowInstant(guess);
    }

    currentRow = Math.min(draft.boardState.length, MAX_GUESSES - 1);
    currentTile = 0;
}

/**
 * Get the state of each tile from the actual game board
 */
function getGameBoardStates(numRows) {
    const boardStates = [];
    for (let r = 0; r < numRows; r++) {
        const rowStates = [];
        for (let c = 0; c < WORD_LENGTH; c++) {
            const tile = getTile(r, c);
            if (tile) {
                rowStates.push({
                    letter: tile.textContent || '',
                    state: tile.getAttribute("data-state") || 'empty'
                });
            }
        }
        if (rowStates.length === WORD_LENGTH && rowStates[0].letter) {
            boardStates.push(rowStates);
        }
    }
    return boardStates;
}

/**
 * Render the game board preview in the stats modal
 */
function renderGameBoardPreview(won, guessNum) {
    const previewContainer = document.getElementById("statsGamePreview");
    const boardGrid = document.getElementById("statsBoardGrid");
    const scoreSummary = document.getElementById("statsScoreSummary");
    const liveInProgress = won === null && !gameOver;
    
    if (!liveInProgress && (won === null || !gameScore)) {
        previewContainer.style.display = "none";
        return;
    }
    
    previewContainer.style.display = "block";
    boardGrid.innerHTML = "";
    
    // Get the board states from the actual game
    const numRows = liveInProgress
        ? Math.max(guessNum || currentRow, guessScores.length)
        : (won ? guessNum : MAX_GUESSES);
    const boardStates = getGameBoardStates(numRows);
    
    // Create mini board display
    boardStates.forEach((row, rowIndex) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "stats-board-row";
        
        row.forEach((cell) => {
            const tileDiv = document.createElement("div");
            tileDiv.className = "stats-board-tile";
            tileDiv.setAttribute("data-state", cell.state);
            tileDiv.textContent = cell.letter;
            rowDiv.appendChild(tileDiv);
        });
        
        // Add score for this row
        if (guessScores[rowIndex] !== undefined) {
            const scoreSpan = document.createElement("span");
            scoreSpan.className = "stats-row-score";
            scoreSpan.textContent = `+${guessScores[rowIndex]}`;
            rowDiv.appendChild(scoreSpan);
        }
        
        boardGrid.appendChild(rowDiv);
    });
    
    // Show score summary
    const resultText = liveInProgress ? "In progress" : (won ? "Solved" : "Not solved");
    const answerText = liveInProgress || won ? "" : ` — Answer: ${targetWord}`;
    const liveHint = liveInProgress
        ? `<div class="stats-score-live">If solved now: ${getNytStyleSolvePoints(currentRow + 1)} pts</div>`
        : "";
    scoreSummary.innerHTML = `
        <div class="stats-score-result">${resultText}${answerText}</div>
        <div class="stats-score-total">${formatPointsLabel(gameScore)} total</div>
        ${liveHint}
    `;
}

let previousTodayPoints = 0;

async function openStatsModal(won, guessNum, options = {}) {
    const stats = await loadStatsFromDb();
    const overlay = document.getElementById("statsOverlay");
    const liveView = !!options.liveView;
    
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
    
    renderGameBoardPreview(won, guessNum);
    
    lastWinRow = won ? guessNum : -1;
    overlay.classList.add("open");
    
    // Show login prompt only if user is not logged in
    const loginPrompt = document.getElementById("statsLoginPrompt");
    if (loginPrompt) {
        loginPrompt.style.display = currentUser ? "none" : "block";
    }
    
    const shouldAnimate = true;
    await renderLeaderboard(shouldAnimate);
    startStatsAutoRefresh(liveView);
}

function closeStatsModal() {
    document.getElementById("statsOverlay").classList.remove("open");
    stopStatsAutoRefresh();
}

async function renderLeaderboard(animateUserPoints = false) {
    const leaderboardContainer = document.getElementById("statsLeaderboard");
    const leaderboardBody = document.getElementById("statsLeaderboardBody");
    
    if (!leaderboardContainer || !leaderboardBody) {
        return;
    }
    
    try {
        const leaderboard = await getTodayLeaderboard(100);
        
        if (leaderboard.length === 0) {
            leaderboardContainer.style.display = "none";
            return;
        }
        
        leaderboardContainer.style.display = "block";
        leaderboardBody.innerHTML = "";
        
        const userRank = currentUser
            ? leaderboard.findIndex(e => e.uid === currentUser.uid) + 1
            : 0;
        const userRowStartRank = userRank > 0 ? Math.max(userRank + 4, leaderboard.length + 1) : null;
        const top5 = leaderboard.slice(0, 5);
        
        top5.forEach((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = !!currentUser && entry.uid === currentUser.uid;
            const row = createLeaderboardRow(
                entry,
                rank,
                isCurrentUser,
                animateUserPoints && isCurrentUser,
                userRowStartRank
            );
            leaderboardBody.appendChild(row);
        });
        
        if (userRank > 5) {
            const divider = document.createElement("div");
            divider.className = "stats-lb-divider";
            divider.innerHTML = "<span>• • •</span>";
            leaderboardBody.appendChild(divider);
            
            const userEntry = leaderboard[userRank - 1];
            const row = createLeaderboardRow(
                userEntry,
                userRank,
                true,
                animateUserPoints,
                userRowStartRank
            );
            leaderboardBody.appendChild(row);
        }
    } catch (err) {
        console.error("Error loading leaderboard:", err);
        leaderboardContainer.style.display = "none";
    }
}

function createLeaderboardRow(entry, rank, isCurrentUser, animate = false, rankFrom = null) {
    const row = document.createElement("div");
    row.className = `stats-lb-row${isCurrentUser ? " stats-lb-row--highlight" : ""}`;
    
    const rankClass = rank <= 3 ? ` stats-lb-rank--${rank}` : "";
    const pointsValue = Number(entry.points || 0);
    const hasPoints = pointsValue > 0;

    const rankSpan = document.createElement("span");
    rankSpan.className = `stats-lb-rank${rankClass}`;
    rankSpan.textContent = rank;

    const nameSpan = document.createElement("span");
    nameSpan.className = "stats-lb-name";
    nameSpan.textContent = entry.displayName || "Player";
    
    const ptsSpan = document.createElement("span");
    ptsSpan.className = "stats-lb-pts";
    
    if (animate && isCurrentUser && hasPoints) {
        ptsSpan.className += " stats-lb-pts--animate";
        const fromPoints = 0;
        ptsSpan.setAttribute("data-from", fromPoints);
        ptsSpan.setAttribute("data-to", pointsValue);
        ptsSpan.textContent = fromPoints;

        const startRank = rankFrom && rankFrom > rank ? rankFrom : Math.max(rank + 1, 2);
        rankSpan.textContent = startRank;
        
        setTimeout(() => {
            animatePointsCount(ptsSpan, fromPoints, pointsValue);
            animateRankCount(rankSpan, startRank, rank);
        }, 300);
    } else {
        ptsSpan.textContent = hasPoints ? pointsValue : "nada";
    }

    row.appendChild(rankSpan);
    row.appendChild(nameSpan);
    row.appendChild(ptsSpan);
    
    const gamesSpan = document.createElement("span");
    gamesSpan.className = "stats-lb-games";
    gamesSpan.textContent = entry.gamesPlayed;
    row.appendChild(gamesSpan);
    
    return row;
}

function animatePointsCount(element, from, to) {
    const duration = 800;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(from + (to - from) * easeOut);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = to;
            element.classList.add("stats-lb-pts--done");
        }
    }
    
    requestAnimationFrame(update);
}

function animateRankCount(element, from, to) {
    const duration = 900;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(from + (to - from) * easeOut);

        element.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = to;
        }
    }

    requestAnimationFrame(update);
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

function getNytStyleSolvePoints(guessNum) {
    if (guessNum < 1 || guessNum > MAX_GUESSES) return NYT_WORDLE_LOSS_POINTS;
    return NYT_WORDLE_POINTS_BY_GUESS[guessNum - 1] || NYT_WORDLE_LOSS_POINTS;
}

function calculateGuessFeedback(guess) {
    const target = targetWord.split("");
    const guessArr = guess.split("");
    const targetCopy = target.slice();
    let correctCount = 0;
    let presentCount = 0;

    // First pass: check for correct positions
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] === target[i]) {
            correctCount++;
            targetCopy[i] = null;
        }
    }

    // Second pass: check for present letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] === target[i]) continue;
        const idx = targetCopy.indexOf(guessArr[i]);
        if (idx !== -1) {
            presentCount++;
            targetCopy[idx] = null;
        }
    }

    return { correctCount, presentCount };
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

    // Keep per-row points for preview; points are only awarded on the solving row.
    const feedback = calculateGuessFeedback(guess);
    guessScores.push(0);

    revealRow(guess).then(async function () {
        const feedbackMsg = `${feedback.correctCount}🟦 ${feedback.presentCount}🟨`;
        showToast(feedbackMsg, 1800);

        if (guess === targetWord) {
            gameOver = true;
            gameWon = true;
            const guessNum = row + 1;
            const solvePoints = getNytStyleSolvePoints(guessNum);
            gameScore = solvePoints;
            guessScores[row] = solvePoints;
            const stats = await recordWin(guessNum);
            
            let bonusPosition = null;
            let bonusMultiplier = 1;
            if (currentUser && !currentUser.isAnonymous && !alreadyCompleted) {
                previousTodayPoints = todayPoints;
                const boardState = getBoardState(guessNum);
                const result = await submitGameCompletion('nerdle', gameScore, {
                    guesses: guessNum,
                    won: true,
                    word: targetWord,
                    boardState: boardState,
                    stats: stats
                });
                if (result.success) {
                    bonusPosition = result.bonusPosition;
                    bonusMultiplier = result.bonusMultiplier;
                    gameScore = result.finalPoints;
                    guessScores[row] = gameScore;
                    alreadyCompleted = true;
                    await updatePointsDisplay(true);
                }
            }
            
            const messages = ["Genius", "Magnificent", "Impressive", "Splendid", "Great", "Phew"];
            const bonusLabels = ['', '1st — 3× bonus!', '2nd — 2× bonus!', '3rd — 1.5× bonus!'];
            const bonusLabel = bonusPosition ? ' · ' + bonusLabels[bonusPosition] : '';
            setTimeout(function () {
                showToast(messages[row] + " — " + guessNum + "/" + MAX_GUESSES + " • " + formatPointsLabel(gameScore) + bonusLabel, 2500);
            }, 2200);
            setTimeout(function () {
                bounceRow(row);
            }, 200);
            setTimeout(function () {
                openStatsModal(true, guessNum);
            }, 4800);
            await clearDraftState();
            return;
        }

        if (row === MAX_GUESSES - 1) {
            gameOver = true;
            gameWon = false;
            gameScore = NYT_WORDLE_LOSS_POINTS;
            const stats = await recordLoss();
            
            if (currentUser && !currentUser.isAnonymous && !alreadyCompleted) {
                previousTodayPoints = todayPoints;
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
                    await updatePointsDisplay(true);
                }
            }
            
            setTimeout(function () {
                showToast(targetWord + " — " + formatPointsLabel(gameScore), 3500);
            }, 2200);
            setTimeout(function () {
                openStatsModal(false, 0);
            }, 5800);
            await clearDraftState();
            return;
        }

        currentRow++;
        currentTile = 0;
        await saveDraftState();
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
    clearLegacyLocalDraftState();
    initSplash();
    createBoard();
    initKeyboard();
    createStatsModal();
    
    document.getElementById("statsBtn").addEventListener("click", function() {
        if (gameOver && gameWon !== null) {
            const finishedGuessNum = gameWon ? lastWinRow : 0;
            openStatsModal(gameWon, finishedGuessNum, { liveView: false });
            return;
        }

        openStatsModal(null, currentRow, { liveView: true });
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
    } else {
        await restoreSavedGameState();
    }
}

init();

// Offline detection
(function() {
    const overlay = document.getElementById('offlineOverlay');
    if (!overlay) return;
    function handleOffline() { overlay.classList.add('show'); }
    function handleOnline() { overlay.classList.remove('show'); }
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    if (!navigator.onLine) handleOffline();
})();

(function() {
    if (localStorage.getItem('titan_bonus_seen')) return;
    const overlay = document.getElementById('bonusOverlay');
    if (!overlay) return;
    function dismiss() {
        overlay.classList.remove('show');
        localStorage.setItem('titan_bonus_seen', '1');
    }
    overlay.classList.add('show');
    document.getElementById('bonusDismiss').addEventListener('click', dismiss);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) dismiss();
    });
})();
