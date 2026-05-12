// Firebase imports for database and auth
import { db, auth, puzzleDb } from "../../js/firebase.js";
import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Points system
import { 
    submitGameCompletion, 
    checkGameCompletion, 
    getTodayStats,
    syncPendingGames,
    checkIfGameSolvedToday
} from "../../js/points.js";

// ── Gate check ── Must be loaded by ch.js after the daily window opens.
// If the gate flag is missing, not open, or marked as tampered (overlay was
// removed before unlock), abort the entire module so the game never starts.
if (!window.__relationsGate_v1 || !window.__relationsGate_v1.open || window.__relationsGate_v1.tampered) {
    throw new Error('Relations is not yet available. Come back later.');
}

// ── Per-tab identifier for cross-device sync / anti-cheat ───────────────────
const TAB_ID = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : (Math.random().toString(36).slice(2) + Date.now().toString(36));
const ACTIVE_TAB_LEASE_MS = 15000;
const ACTIVE_TAB_HEARTBEAT_MS = 4000;

let currentUser = null;
let todayPoints = 0;
let alreadyCompleted = false;
let completedGameData = null;
let isActiveTab = true;
let tabConflictShown = false;

function getCurrentUserProfile() {
    if (!currentUser || currentUser.isAnonymous) return null;

    const rawDisplayName = typeof currentUser.displayName === 'string' ? currentUser.displayName.trim() : '';
    const email = typeof currentUser.email === 'string' ? currentUser.email.trim() : null;
    const displayName = rawDisplayName || (email ? email.split('@')[0] : 'Player');

    return {
        uid: currentUser.uid,
        displayName,
        name: displayName,
        email
    };
}

function showLoginNudge() {
    const nudge = document.getElementById("loginNudge");
    if (!nudge) return;
    nudge.classList.add("visible");
    const closeBtn = document.getElementById("loginNudgeClose");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => nudge.classList.remove("visible"), { once: true });
    }
    // Auto-dismiss after 6 seconds
    setTimeout(() => nudge.classList.remove("visible"), 6000);
}

function showTabConflictWarning() {
    if (tabConflictShown) return;
    tabConflictShown = true;
    isActiveTab = false;
    
    const overlay = document.getElementById('tabConflictOverlay');
    if (!overlay) return;
    
    overlay.style.display = 'flex';
    
    const reloadBtn = document.getElementById('tabConflictReload');
    if (reloadBtn) {
        reloadBtn.onclick = () => window.location.reload();
    }
    
    // Disable all game interactions
    const grid = document.getElementById('gameGrid');
    if (grid) {
        grid.style.pointerEvents = 'none';
        grid.style.opacity = '0.5';
    }
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('shuffleBtn').disabled = true;
    document.getElementById('deselectBtn').disabled = true;
}

function hideTabConflictWarning() {
    const overlay = document.getElementById('tabConflictOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    const grid = document.getElementById('gameGrid');
    if (grid) {
        grid.style.pointerEvents = '';
        grid.style.opacity = '';
    }
    
    isActiveTab = true;
    tabConflictShown = false;
}

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

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    await updatePointsDisplay();
    if (user && !user.isAnonymous) {
        await syncPendingGames();
        const completion = await checkGameCompletion('relations');
        if (completion.completed) {
            alreadyCompleted = true;
            completedGameData = completion.data;
            if (game) {
                game.restoreCompletedGame();
            }
        }
    }
});

async function fetchTodaysPuzzle() {
    try {
        const today = new Date();
        const dateStr = today.getFullYear() + '-' + 
            String(today.getMonth() + 1).padStart(2, '0') + '-' + 
            String(today.getDate()).padStart(2, '0');
        
        const docSnap = await getDoc(doc(puzzleDb, 'relations', dateStr));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === 'published' && data.categories) {
                return {
                    date: data.releaseDateDisplay || dateStr,
                    categories: data.categories
                };
            }
        }
    } catch (err) {
        console.log('Could not fetch from database, using fallback');
    }
    return null;
}

// Relations Game Logic

// Daily puzzles - fallback indexed by day of year
const PUZZLES = [
    {
        date: "April 16, 2026",
        categories: [
            { name: "Planets", color: "yellow", words: ["MARS", "VENUS", "SATURN", "JUPITER"] },
            { name: "Card Games", color: "green", words: ["POKER", "BRIDGE", "HEARTS", "SPADES"] },
            { name: "Types of Music", color: "blue", words: ["JAZZ", "ROCK", "BLUES", "SOUL"] },
            { name: "Parts of a Ship", color: "purple", words: ["DECK", "HULL", "MAST", "BOW"] }
        ]
    },
    {
        date: "April 17, 2026",
        categories: [
            { name: "Coffee Drinks", color: "yellow", words: ["LATTE", "MOCHA", "ESPRESSO", "AMERICANO"] },
            { name: "Chess Pieces", color: "green", words: ["KING", "QUEEN", "KNIGHT", "BISHOP"] },
            { name: "Types of Clouds", color: "blue", words: ["CIRRUS", "STRATUS", "CUMULUS", "NIMBUS"] },
            { name: "Shoe Parts", color: "purple", words: ["SOLE", "HEEL", "TOE", "TONGUE"] }
        ]
    },
    {
        date: "April 18, 2026",
        categories: [
            { name: "Citrus Fruits", color: "yellow", words: ["LEMON", "LIME", "ORANGE", "GRAPEFRUIT"] },
            { name: "US Presidents", color: "green", words: ["LINCOLN", "WASHINGTON", "JEFFERSON", "ADAMS"] },
            { name: "Dog Breeds", color: "blue", words: ["BEAGLE", "POODLE", "BOXER", "COLLIE"] },
            { name: "____ Bear", color: "purple", words: ["POLAR", "TEDDY", "GRIZZLY", "KOALA"] }
        ]
    },
    {
        date: "April 19, 2026",
        categories: [
            { name: "Breakfast Items", color: "yellow", words: ["WAFFLE", "PANCAKE", "BACON", "TOAST"] },
            { name: "Gemstones", color: "green", words: ["RUBY", "EMERALD", "DIAMOND", "SAPPHIRE"] },
            { name: "Dance Styles", color: "blue", words: ["SALSA", "BALLET", "TANGO", "WALTZ"] },
            { name: "_____ King", color: "purple", words: ["LION", "BURGER", "HOMECOMING", "DRAG"] }
        ]
    },
    {
        date: "April 20, 2026",
        categories: [
            { name: "Olympic Sports", color: "yellow", words: ["SWIMMING", "FENCING", "ARCHERY", "DIVING"] },
            { name: "Pasta Types", color: "green", words: ["PENNE", "LINGUINE", "RAVIOLI", "RIGATONI"] },
            { name: "Elements", color: "blue", words: ["GOLD", "SILVER", "IRON", "COPPER"] },
            { name: "Things That Are Blue", color: "purple", words: ["SKY", "OCEAN", "JEANS", "SMURF"] }
        ]
    }
];

class RelationsGame {
    constructor() {
        this.puzzle = null;
        this.selected = [];
        this.solved = [];
        this.mistakes = 0;
        this.maxMistakes = 4;
        this.guessHistory = [];
        this.gameOver = false;
        this.remainingWords = [];
        this._leaseHeartbeatInterval = null;
        
        // Scoring: 30 points per remaining try (120 max with 0 mistakes)
        this.pointsPerTry = 30;
        
        this.loadAndInit();
    }
    
    async loadAndInit() {
        // Try to get today's puzzle from database first
        const dbPuzzle = await fetchTodaysPuzzle();
        if (dbPuzzle) {
            this.puzzle = dbPuzzle;
        } else {
            // Fallback to hardcoded puzzles
            this.puzzle = this.getFallbackPuzzle();
        }
        this.init();
    }
    
    getFallbackPuzzle() {
        // Use a simple day-based index for demo
        const dayOfYear = Math.floor((Date.now() - new Date(Date.now()).setMonth(0, 0)) / 86400000);
        return PUZZLES[dayOfYear % PUZZLES.length];
    }
    
    init() {
        // Set up all remaining words
        this.remainingWords = this.puzzle.categories.flatMap(cat => 
            cat.words.map(word => ({ word, category: cat }))
        );
        this.shuffle(this.remainingWords);
        
        // Set up event listeners
        const playBtn = document.getElementById('playBtn');
        
        // Update play button based on authentication
        const updatePlayButton = () => {
            if (!currentUser || currentUser.isAnonymous) {
                playBtn.textContent = "Sign in to play";
                playBtn.classList.add("auth-required");
            } else {
                playBtn.textContent = "Play";
                playBtn.classList.remove("auth-required");
            }
        };
        
        updatePlayButton();
        
        // Update button when auth state changes
        onAuthStateChanged(auth, function() {
            updatePlayButton();
        });
        
        playBtn.addEventListener('click', () => {
            // If not authenticated, redirect to sign in page
            if (!currentUser || currentUser.isAnonymous) {
                window.location.href = "../signin.html";
                return;
            }
            
            // If authenticated, start the game
            this.startGame();
        });
        
        document.getElementById('shuffleBtn').addEventListener('click', () => this.shuffleGrid());
        document.getElementById('deselectBtn').addEventListener('click', () => this.deselectAll());
        document.getElementById('submitBtn').addEventListener('click', () => this.submitGuess());
        
        // Set date
        document.getElementById('splashDate').textContent = this.puzzle.date;
        document.getElementById('puzzleDate').textContent = this.puzzle.date;
        
        this.renderGrid();
        this.updateButtons();
        this.renderMistakes();
        
        // Initialize stats modal
        this.initStatsModal();
        
        if (alreadyCompleted && completedGameData) {
            this.restoreCompletedGame();
        }

        // Keep an active-tab lease in Firestore so only one tab can submit guesses.
        this.startTabLeaseHeartbeat();

        // Start polling for updates from other devices/tabs
        this.startRemoteUpdatePoller();
    }
    
    restoreCompletedGame() {
        if (!completedGameData) return;
        
        document.getElementById('splashOverlay').classList.add('hidden');
        this.gameOver = true;
        this.mistakes = completedGameData.mistakes || 0;
        this.guessHistory = completedGameData.guessHistory || [];
        
        if (completedGameData.won) {
            // Won: show all categories
            this.puzzle.categories.forEach(cat => {
                this.solved.push(cat);
            });
        } else {
            // Lost: only show categories the player actually solved
            const solvedNames = completedGameData.solvedOrder || [];
            this.puzzle.categories.forEach(cat => {
                if (solvedNames.includes(cat.name)) {
                    this.solved.push(cat);
                }
            });
        }
        
        this.remainingWords = [];
        this.renderSolved();
        document.getElementById('gameGrid').innerHTML = '';
        this.renderMistakes();
        
        setTimeout(() => {
            this.showModal(completedGameData.won);
        }, 300);
    }
    
    startGame() {
        if (alreadyCompleted) {
            this.restoreCompletedGame();
            return;
        }
        document.getElementById('splashOverlay').classList.add('hidden');
        // Show login nudge for guests / anonymous users
        if (!currentUser || currentUser.isAnonymous) {
            showLoginNudge();
        }
    }
    
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    renderGrid() {
        const grid = document.getElementById('gameGrid');
        grid.innerHTML = '';
        
        this.remainingWords.forEach((item, index) => {
            const tile = document.createElement('button');
            tile.className = 'tile';
            tile.textContent = item.word;
            tile.dataset.index = index;
            tile.addEventListener('click', () => this.toggleTile(index));
            grid.appendChild(tile);
        });
    }
    
    toggleTile(index) {
        if (this.gameOver || !isActiveTab) return;
        
        const tile = document.querySelector(`.tile[data-index="${index}"]`);
        
        if (this.selected.includes(index)) {
            this.selected = this.selected.filter(i => i !== index);
            tile.classList.remove('selected');
        } else if (this.selected.length < 4) {
            this.selected.push(index);
            tile.classList.add('selected');
            tile.classList.add('bounce');
            setTimeout(() => tile.classList.remove('bounce'), 300);
        }
        
        this.updateButtons();
        
        // Update active tab timestamp on interaction
        if (currentUser && !currentUser.isAnonymous) {
            this.saveRelationsDraftToDb();
        }
    }
    
    updateButtons() {
        document.getElementById('deselectBtn').disabled = this.selected.length === 0;
        document.getElementById('submitBtn').disabled = this.selected.length !== 4;
    }
    
    deselectAll() {
        if (!isActiveTab) return;
        this.selected.forEach(index => {
            const tile = document.querySelector(`.tile[data-index="${index}"]`);
            if (tile) tile.classList.remove('selected');
        });
        this.selected = [];
        this.updateButtons();
    }
    
    shuffleGrid() {
        if (!isActiveTab) return;
        this.shuffle(this.remainingWords);
        this.deselectAll();
        this.renderGrid();
    }
    
    async submitGuess() {
        if (this.selected.length !== 4 || this.gameOver || !isActiveTab) return;
        if (!(await this.claimActiveTabLease())) return;
        
        const selectedWords = this.selected.map(i => this.remainingWords[i]);
        const categories = selectedWords.map(item => item.category);
        
        // Check if all same category
        const allSame = categories.every(cat => cat === categories[0]);
        
        if (allSame) {
            await this.handleCorrectGuess(categories[0]);
        } else {
            await this.handleIncorrectGuess(selectedWords);
        }
    }
    
    async handleCorrectGuess(category) {
        // Record guess
        this.guessHistory.push(category.color);
        
        // Remove solved words
        const solvedWords = this.selected.map(i => this.remainingWords[i].word);
        this.remainingWords = this.remainingWords.filter((_, i) => !this.selected.includes(i));
        this.selected = [];
        
        // Add to solved
        this.solved.push(category);
        this.renderSolved();
        this.renderGrid();
        this.updateButtons();
        
        // Save progress to DB so other devices can sync
        await this.saveRelationsDraftToDb();

        // Check win
        if (this.solved.length === 4) {
            await this.handleWin();
        }
    }
    
    async handleIncorrectGuess(selectedWords) {
        // Check if "one away"
        const categoryCounts = {};
        selectedWords.forEach(item => {
            const catName = item.category.name;
            categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
        });
        
        const maxCount = Math.max(...Object.values(categoryCounts));
        
        if (maxCount === 3) {
            this.showToast("One away...");
        }
        
        // Shake animation
        this.selected.forEach(index => {
            const tile = document.querySelector(`.tile[data-index="${index}"]`);
            if (tile) {
                tile.classList.add('shake');
                setTimeout(() => tile.classList.remove('shake'), 500);
            }
        });
        
        // Add mistake
        this.mistakes++;
        this.renderMistakes();
        
        // Save progress to DB so other devices can sync
        this.saveRelationsDraftToDb();

        // Deselect after animation
        setTimeout(() => this.deselectAll(), 600);
        
        // Check lose
        if (this.mistakes >= this.maxMistakes) {
            await this.handleLose();
        }
    }
    
    renderMistakes() {
        const dots = document.querySelectorAll('.mistake-dot');
        dots.forEach((dot, i) => {
            if (i < this.mistakes) {
                dot.classList.add('used');
            } else {
                dot.classList.remove('used');
            }
        });
    }
    
    renderSolved() {
        const container = document.getElementById('solvedContainer');
        container.innerHTML = '';
        
        this.solved.forEach(category => {
            const div = document.createElement('div');
            div.className = `solved-category ${category.color}`;
            div.innerHTML = `
                <div class="category-name">${category.name}</div>
                <div class="category-words">${category.words.join(', ')}</div>
            `;
            container.appendChild(div);
        });
    }
    
    showToast(message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('out');
            setTimeout(() => toast.remove(), 300);
        }, 1500);
    }
    
    calculateScore() {
        const triesLeft = this.maxMistakes - this.mistakes;
        return triesLeft * this.pointsPerTry;
    }
    
    async handleWin() {
        this.gameOver = true;
        this.stopRemoteUpdatePoller();
        this.stopTabLeaseHeartbeat();
        const score = this.calculateScore();
        
        this.updateLocalStats(true);
        
        let finalScore = score;
        let bonusPosition = null;
        if (!alreadyCompleted) {
            const result = await submitGameCompletion('relations', score, {
                mistakes: this.mistakes,
                won: true,
                date: this.puzzle.date,
                guessHistory: this.guessHistory,
                solvedOrder: this.solved.map(cat => cat.name),
                categoryColors: this.solved.map(cat => cat.color)
            });
            if (result.success) {
                finalScore = result.finalPoints;
                bonusPosition = result.bonusPosition;
                this.bonusPosition = bonusPosition;
                alreadyCompleted = true;
                await updatePointsDisplay();
            }
        }
        
        const bonusLabels = ['', '1st — 3× bonus!', '2nd — 2× bonus!', '3rd — 1.5× bonus!'];
        const bonusLabel = bonusPosition ? ` · ${bonusLabels[bonusPosition]}` : '';
        this.showToast(`+${finalScore} pts${bonusLabel}`);
        
        setTimeout(() => {
            this.showModal(true);
        }, 800);
    }
    
    async handleLose() {
        this.gameOver = true;
        this.stopRemoteUpdatePoller();
        this.stopTabLeaseHeartbeat();
        
        // Update local stats
        this.updateLocalStats(false);
        
        if (!alreadyCompleted) {
            const result = await submitGameCompletion('relations', 0, {
                mistakes: this.mistakes,
                won: false,
                date: this.puzzle.date,
                guessHistory: this.guessHistory,
                solvedOrder: this.solved.map(cat => cat.name),
                categoryColors: this.solved.map(cat => cat.color)
            });
            if (result.success) {
                alreadyCompleted = true;
                await updatePointsDisplay();
            }
        }
        
        this.showToast("Better luck next time!");
        
        // Clear grid and show modal without revealing unsolved category answers
        setTimeout(() => {
            document.getElementById('gameGrid').innerHTML = '';
            this.showModal(false);
        }, 800);
    }
    
    async showModal(won) {
        const overlay = document.getElementById('modalOverlay');
        const title = overlay.querySelector('h2');
        const message = overlay.querySelector('p');
        const resultsGrid = overlay.querySelector('.results-grid');
        const modalActions = overlay.querySelector('.modal-actions');
        
        const score = this.calculateScore();
        const triesLeft = this.maxMistakes - this.mistakes;
        
        title.textContent = won ? "Perfect!" : "Next time!";
        
        if (won) {
            message.innerHTML = `You solved today's puzzle!<br><span class="score-display">${score} pts</span><br><span class="score-detail">${triesLeft} tries remaining × ${this.pointsPerTry} pts</span>`;
        } else {
            message.innerHTML = `You ran out of guesses.<br><span class="score-display">0 pts</span>`;
        }
        
        // Show solve order as colored rows (like NYT Relations)
        resultsGrid.innerHTML = '';
        resultsGrid.className = 'results-grid results-grid-rows';
        
        // Show each solved category as a row of 4 dots
        this.solved.forEach(cat => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'results-row';
            for (let i = 0; i < 4; i++) {
                const dot = document.createElement('div');
                dot.className = `dot ${cat.color}`;
                rowDiv.appendChild(dot);
            }
            resultsGrid.appendChild(rowDiv);
        });

        // Answer reveal section — only show unsolved categories after game ends
        const existingReveal = overlay.querySelector('.answer-reveal-section');
        if (existingReveal) existingReveal.remove();

        if (!won) {
            const unsolvedCats = this.puzzle.categories.filter(
                cat => !this.solved.some(s => s.name === cat.name)
            );
            if (unsolvedCats.length > 0) {
                const revealSection = document.createElement('div');
                revealSection.className = 'answer-reveal-section';

                let firstSolverDone = false;
                try {
                    firstSolverDone = await checkIfGameSolvedToday('relations');
                } catch (e) {}

                if (firstSolverDone) {
                    const heading = document.createElement('p');
                    heading.className = 'answer-reveal-heading';
                    heading.textContent = 'The answers were:';
                    revealSection.appendChild(heading);

                    unsolvedCats.forEach(cat => {
                        const catDiv = document.createElement('div');
                        catDiv.className = `answer-reveal-category ${cat.color}`;
                        catDiv.innerHTML = `<span class="answer-reveal-name">${cat.name}</span><span class="answer-reveal-words">${cat.words.join(', ')}</span>`;
                        revealSection.appendChild(catDiv);
                    });
                } else {
                    const msg = document.createElement('p');
                    msg.className = 'answer-reveal-pending';
                    msg.textContent = "No one has solved today's puzzle yet — answers will appear once the first player solves it.";
                    revealSection.appendChild(msg);
                }

                resultsGrid.after(revealSection);
            }
        }

        // Update modal actions based on auth state
        if (currentUser) {
            // User is signed in - show share and close buttons
            modalActions.innerHTML = `
                <button class="btn btn-outline" id="shareResultsBtn">Share</button>
                <button class="btn btn-primary" id="closeModalAuth">Close</button>
            `;
            document.getElementById('closeModalAuth').addEventListener('click', () => this.closeModal());
            document.getElementById('shareResultsBtn').addEventListener('click', () => this.copyResults());
        } else {
            // User not signed in - show close and login buttons
            modalActions.innerHTML = `
                <button class="btn btn-outline" id="closeModalNoAuth">Close</button>
                <button class="btn btn-primary" id="loginBtn">Log In to Save</button>
            `;
            document.getElementById('closeModalNoAuth').addEventListener('click', () => this.closeModal());
            document.getElementById('loginBtn').addEventListener('click', () => {
                window.location.href = '../signin.html';
            });
        }
        
        overlay.classList.add('show');
    }
    
    closeModal() {
        document.getElementById('modalOverlay').classList.remove('show');
    }
    
    openStatsModal() {
        const overlay = document.getElementById('statsOverlay');
        const previewContainer = document.getElementById('statsGamePreview');
        const grid = document.getElementById('statsRelationsGrid');
        const scoreSummary = document.getElementById('statsScoreSummary');
        
        // Calculate stats from local storage or completedGameData
        let gamesPlayed = 0;
        let gamesWon = 0;
        let currentStreak = 0;
        let maxStreak = 0;
        
        try {
            const stored = localStorage.getItem('relations_stats');
            if (stored) {
                const stats = JSON.parse(stored);
                gamesPlayed = stats.gamesPlayed || 0;
                gamesWon = stats.gamesWon || 0;
                currentStreak = stats.currentStreak || 0;
                maxStreak = stats.maxStreak || 0;
            }
        } catch(e) {}
        
        document.getElementById('statPlayed').textContent = gamesPlayed;
        document.getElementById('statWinPct').textContent = gamesPlayed > 0 
            ? Math.round((gamesWon / gamesPlayed) * 100) 
            : 0;
        document.getElementById('statCurrentStreak').textContent = currentStreak;
        document.getElementById('statMaxStreak').textContent = maxStreak;
        
        // Show game preview if completed today
        if (this.gameOver || (alreadyCompleted && completedGameData)) {
            previewContainer.style.display = 'block';
            grid.innerHTML = '';
            
            // Render only actually solved categories (never reveal unsolved ones)
            const won = this.gameOver ? (this.mistakes < this.maxMistakes && this.solved.length === 4) : completedGameData?.won;
            const solvedCats = this.gameOver ? this.solved : 
                              (completedGameData?.categoryColors?.length
                               ? this.puzzle.categories.filter(c => completedGameData.categoryColors.includes(c.color))
                               : (completedGameData?.solvedOrder?.length
                                  ? this.puzzle.categories.filter(c => completedGameData.solvedOrder.includes(c.name))
                                  : (won ? this.puzzle.categories : [])));
            
            solvedCats.forEach(cat => {
                const rowDiv = document.createElement('div');
                rowDiv.className = 'stats-relations-row';
                
                // Create 4 colored squares for this category
                for (let i = 0; i < 4; i++) {
                    const square = document.createElement('div');
                    square.className = `stats-relations-tile ${cat.color}`;
                    rowDiv.appendChild(square);
                }
                
                // Add category name
                const nameSpan = document.createElement('span');
                nameSpan.className = 'stats-relations-name';
                nameSpan.textContent = cat.name;
                rowDiv.appendChild(nameSpan);
                
                grid.appendChild(rowDiv);
            });
            
            const score = this.calculateScore();
            const mistakes = this.gameOver ? this.mistakes : (completedGameData?.mistakes || 0);
            
            scoreSummary.innerHTML = `
                <div class="stats-score-result">${won ? 'Solved' : 'Not solved'} — ${mistakes} mistake${mistakes !== 1 ? 's' : ''}</div>
                <div class="stats-score-total">${score} pts</div>
            `;
        } else {
            previewContainer.style.display = 'none';
        }
        
        // Show login prompt only if user is not logged in
        const loginPrompt = document.getElementById('statsLoginPrompt');
        if (loginPrompt) {
            loginPrompt.style.display = currentUser ? 'none' : 'block';
        }
        
        overlay.classList.add('open');
    }
    
    closeStatsModal() {
        document.getElementById('statsOverlay').classList.remove('open');
    }
    
    copyResults() {
        const colorEmojis = {
            yellow: '🟨',
            green: '🟩',
            blue: '🟦',
            purple: '🟪'
        };
        
        const score = this.calculateScore();
        let text = `Relations
${this.puzzle.date}
Score: ${score} pts

`;
        
        // Show solve order with colors (each category as a row)
        this.solved.forEach(cat => {
            const emoji = colorEmojis[cat.color] || '⬜';
            text += emoji + emoji + emoji + emoji + '\n';
        });
        
        navigator.clipboard.writeText(text).then(() => {
            this.showToast("Copied to clipboard!");
        });
    }
        // ── Remote sync / anti-cheat helpers ──────────────────────────────────────

    getTodayDateKey() {
        const today = new Date();
        return today.getFullYear() + '-' +
            String(today.getMonth() + 1).padStart(2, '0') + '-' +
            String(today.getDate()).padStart(2, '0');
    }

    getUserRef() {
        if (!currentUser || currentUser.isAnonymous) return null;
        return doc(db, 'titan_users', currentUser.uid);
    }

    async claimActiveTabLease() {
        const userRef = this.getUserRef();
        if (!userRef) return true;

        const todayKey = this.getTodayDateKey();
        const now = Date.now();
        const userProfile = getCurrentUserProfile();

        try {
            const claimed = await runTransaction(db, async (tx) => {
                const snap = await tx.get(userRef);
                const root = snap.exists() ? snap.data() : {};
                const relationsStats = root?.gameStats?.relations || {};
                const lock = relationsStats.activeTabLock || {};
                const lockTabId = lock.tabId || null;
                const lockDate = lock.date || null;
                const lockExpiresAt = Number(lock.expiresAt || 0);

                const lockAvailable =
                    !lockTabId ||
                    lockDate !== todayKey ||
                    lockExpiresAt <= now ||
                    lockTabId === TAB_ID;

                if (!lockAvailable) {
                    return false;
                }

                const nextDailyState = {
                    ...(relationsStats.dailyState || {}),
                    date: todayKey,
                    tabId: TAB_ID,
                    activeTabId: TAB_ID,
                    lastActiveTimestamp: now
                };

                tx.set(userRef, {
                    ...(userProfile || {}),
                    gameStats: {
                        relations: {
                            activeTabLock: {
                                tabId: TAB_ID,
                                date: todayKey,
                                expiresAt: now + ACTIVE_TAB_LEASE_MS,
                                lastSeenAt: serverTimestamp()
                            },
                            dailyState: nextDailyState,
                            lastUpdated: serverTimestamp()
                        }
                    }
                }, { merge: true });

                return true;
            });

            if (!claimed) {
                showTabConflictWarning();
                return false;
            }

            if (!isActiveTab || tabConflictShown) {
                hideTabConflictWarning();
            }
            return true;
        } catch (e) {
            console.error('Error claiming relations tab lease:', e);
            return false;
        }
    }

    startTabLeaseHeartbeat() {
        this.stopTabLeaseHeartbeat();
        this._leaseHeartbeatInterval = setInterval(async () => {
            if (this.gameOver || alreadyCompleted || !isActiveTab || document.hidden) return;
            await this.claimActiveTabLease();
        }, ACTIVE_TAB_HEARTBEAT_MS);
    }

    stopTabLeaseHeartbeat() {
        if (this._leaseHeartbeatInterval) {
            clearInterval(this._leaseHeartbeatInterval);
            this._leaseHeartbeatInterval = null;
        }
    }

    async saveRelationsDraftToDb() {
        if (!currentUser || currentUser.isAnonymous || !this.puzzle) return;
        if (!isActiveTab) return; // Don't save if this tab lost control
        
        try {
            const now = Date.now();
            const state = {
                date: this.getTodayDateKey(),
                tabId: TAB_ID,
                activeTabId: TAB_ID,
                lastActiveTimestamp: now,
                mistakes: this.mistakes,
                solvedNames: this.solved.map(cat => cat.name),
                gameOver: this.gameOver,
                won: this.gameOver ? (this.mistakes < this.maxMistakes && this.solved.length === 4) : null
            };
            const userRef = doc(db, 'titan_users', currentUser.uid);
            const userProfile = getCurrentUserProfile();
            await setDoc(userRef, {
                ...(userProfile || {}),
                gameStats: {
                    relations: {
                        activeTabLock: {
                            tabId: TAB_ID,
                            date: state.date,
                            expiresAt: now + ACTIVE_TAB_LEASE_MS,
                            lastSeenAt: serverTimestamp()
                        },
                        dailyState: state,
                        lastUpdated: serverTimestamp()
                    }
                }
            }, { merge: true });
        } catch (e) {
            console.error('Error saving relations draft:', e);
        }
    }

    async getRelationsDbDraft() {
        if (!currentUser || currentUser.isAnonymous) return null;
        try {
            const userDoc = await getDoc(doc(db, 'titan_users', currentUser.uid));
            if (!userDoc.exists()) return null;
            return userDoc.data()?.gameStats?.relations?.dailyState || null;
        } catch (e) {
            return null;
        }
    }

    startRemoteUpdatePoller() {
        this.stopRemoteUpdatePoller();
        this._remotePollInterval = setInterval(async () => {
            if (this.gameOver || alreadyCompleted || !currentUser || currentUser.isAnonymous) return;
            try {
                const remoteState = await this.getRelationsDbDraft();
                if (!remoteState || !remoteState.tabId || remoteState.tabId === TAB_ID) return;
                if (remoteState.date !== this.getTodayDateKey()) return;
                if (!Array.isArray(remoteState.solvedNames)) return;
                
                // Check for tab conflict - if another tab is active
                if (remoteState.activeTabId && remoteState.activeTabId !== TAB_ID) {
                    const timeSinceLastActive = Date.now() - (remoteState.lastActiveTimestamp || 0);
                    // If another tab was active within last 5 seconds, show warning
                    if (timeSinceLastActive < 5000) {
                        showTabConflictWarning();
                        this.stopRemoteUpdatePoller();
                        return;
                    }
                }
                
                // Only sync if remote has more total progress (solves + mistakes)
                const localProgress = this.solved.length + this.mistakes;
                const remoteProgress = remoteState.solvedNames.length + (remoteState.mistakes || 0);
                if (remoteProgress <= localProgress && !remoteState.gameOver) return;
                await this.applyRemoteRelationsState(remoteState);
            } catch (e) { /* silently ignore poll errors */ }
        }, 500); // More frequent polling for real-time sync
    }

    stopRemoteUpdatePoller() {
        if (this._remotePollInterval) {
            clearInterval(this._remotePollInterval);
            this._remotePollInterval = null;
        }
    }

    async applyRemoteRelationsState(remoteState) {
        this.stopRemoteUpdatePoller();

        // Hide tab conflict warning if it was shown
        hideTabConflictWarning();

        this.mistakes = remoteState.mistakes || 0;

        // Rebuild solved list from category names
        this.solved = [];
        remoteState.solvedNames.forEach(name => {
            const cat = this.puzzle.categories.find(c => c.name === name);
            if (cat) this.solved.push(cat);
        });

        // Rebuild remaining words (exclude solved)
        const solvedWords = new Set(this.solved.flatMap(cat => cat.words));
        this.remainingWords = this.puzzle.categories
            .flatMap(cat => cat.words.map(word => ({ word, category: cat })))
            .filter(item => !solvedWords.has(item.word));
        this.shuffle(this.remainingWords);

        this.selected = [];
        this.renderSolved();
        this.renderGrid();
        this.renderMistakes();
        this.updateButtons();

        if (remoteState.gameOver) {
            this.gameOver = true;
            this.showToast("Game synced from another tab", 2500);
            const won = remoteState.won === true;
            setTimeout(() => this.showModal(won), 1200);
        } else {
            this.showToast("Guess synced from another tab", 2500);
            // After syncing, claim this tab as active and resume polling
            await this.saveRelationsDraftToDb();
            this.startRemoteUpdatePoller();
        }
    }
    initStatsModal() {
        document.getElementById('statsClose')?.addEventListener('click', () => this.closeStatsModal());
        document.getElementById('statsLoginBtn')?.addEventListener('click', () => {
            window.location.href = '../signin.html';
        });
        
        const overlay = document.getElementById('statsOverlay');
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeStatsModal();
        });
    }
    
    updateLocalStats(won) {
        try {
            const stored = localStorage.getItem('relations_stats');
            let stats = stored ? JSON.parse(stored) : {
                gamesPlayed: 0,
                gamesWon: 0,
                currentStreak: 0,
                maxStreak: 0,
                lastPlayedDay: null
            };
            
            const today = new Date().toDateString();
            if (stats.lastPlayedDay === today) return;
            
            stats.gamesPlayed++;
            if (won) {
                stats.gamesWon++;
                stats.currentStreak++;
                stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
            } else {
                stats.currentStreak = 0;
            }
            stats.lastPlayedDay = today;
            
            localStorage.setItem('relations_stats', JSON.stringify(stats));
        } catch(e) {}
    }
}

// Initialize game
// relations.js is loaded dynamically by ch.js after DOMContentLoaded has
// already fired, so we initialise immediately instead of waiting for it.
let game;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { game = new RelationsGame(); });
} else {
    game = new RelationsGame();
}

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
