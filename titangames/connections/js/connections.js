// Firebase imports for database and auth
import { db, auth, puzzleDb } from "../../js/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Points system
import { 
    submitGameCompletion, 
    checkGameCompletion, 
    getTodayStats 
} from "../../js/points.js";

let currentUser = null;
let todayPoints = 0;
let alreadyCompleted = false;
let completedGameData = null;

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
    if (user) {
        const completion = await checkGameCompletion('connections');
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
        
        const docSnap = await getDoc(doc(puzzleDb, 'connections', dateStr));
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

// Connections Game Logic

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

class ConnectionsGame {
    constructor() {
        this.puzzle = null;
        this.selected = [];
        this.solved = [];
        this.mistakes = 0;
        this.maxMistakes = 4;
        this.guessHistory = [];
        this.gameOver = false;
        this.remainingWords = [];
        
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
        document.getElementById('playBtn').addEventListener('click', () => this.startGame());
        document.getElementById('shuffleBtn').addEventListener('click', () => this.shuffleGrid());
        document.getElementById('deselectBtn').addEventListener('click', () => this.deselectAll());
        document.getElementById('submitBtn').addEventListener('click', () => this.submitGuess());
        
        // Set date
        document.getElementById('splashDate').textContent = this.puzzle.date;
        document.getElementById('puzzleDate').textContent = this.puzzle.date;
        
        this.renderGrid();
        this.updateButtons();
        this.renderMistakes();
        
        if (alreadyCompleted && completedGameData) {
            this.restoreCompletedGame();
        }
    }
    
    restoreCompletedGame() {
        if (!completedGameData) return;
        
        document.getElementById('splashOverlay').classList.add('hidden');
        this.gameOver = true;
        this.mistakes = completedGameData.mistakes || 0;
        this.guessHistory = completedGameData.guessHistory || [];
        
        this.puzzle.categories.forEach(cat => {
            this.solved.push(cat);
        });
        
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
        if (this.gameOver) return;
        
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
    }
    
    updateButtons() {
        document.getElementById('deselectBtn').disabled = this.selected.length === 0;
        document.getElementById('submitBtn').disabled = this.selected.length !== 4;
    }
    
    deselectAll() {
        this.selected.forEach(index => {
            const tile = document.querySelector(`.tile[data-index="${index}"]`);
            if (tile) tile.classList.remove('selected');
        });
        this.selected = [];
        this.updateButtons();
    }
    
    shuffleGrid() {
        this.shuffle(this.remainingWords);
        this.deselectAll();
        this.renderGrid();
    }
    
    async submitGuess() {
        if (this.selected.length !== 4 || this.gameOver) return;
        
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
        const score = this.calculateScore();
        
        if (currentUser && !alreadyCompleted) {
            const result = await submitGameCompletion('connections', score, {
                mistakes: this.mistakes,
                won: true,
                date: this.puzzle.date,
                guessHistory: this.guessHistory,
                solvedOrder: this.solved.map(cat => cat.name)
            });
            if (result.success) {
                alreadyCompleted = true;
                await updatePointsDisplay();
            }
        }
        
        this.showToast(`+${score} pts`);
        
        setTimeout(() => {
            this.showModal(true);
        }, 800);
    }
    
    async handleLose() {
        this.gameOver = true;
        
        if (currentUser && !alreadyCompleted) {
            const result = await submitGameCompletion('connections', 0, {
                mistakes: this.mistakes,
                won: false,
                date: this.puzzle.date,
                guessHistory: this.guessHistory,
                solvedOrder: this.solved.map(cat => cat.name)
            });
            if (result.success) {
                alreadyCompleted = true;
                await updatePointsDisplay();
            }
        }
        
        this.showToast("Better luck next time!");
        
        // Reveal remaining categories
        setTimeout(() => {
            const remaining = this.puzzle.categories.filter(cat => !this.solved.includes(cat));
            remaining.forEach((cat, i) => {
                setTimeout(() => {
                    this.solved.push(cat);
                    this.renderSolved();
                }, i * 500);
            });
            
            // Clear grid
            setTimeout(() => {
                document.getElementById('gameGrid').innerHTML = '';
                this.showModal(false);
            }, remaining.length * 500 + 500);
        }, 500);
    }
    
    showModal(won) {
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
        
        // Show color results
        resultsGrid.innerHTML = '';
        this.puzzle.categories.forEach(cat => {
            const dot = document.createElement('div');
            dot.className = `dot ${cat.color}`;
            resultsGrid.appendChild(dot);
        });
        
        // Update modal actions based on auth state
        if (currentUser) {
            // User is signed in - show only close button
            modalActions.innerHTML = '<button class="btn btn-primary" id="closeModalAuth">Close</button>';
            document.getElementById('closeModalAuth').addEventListener('click', () => this.closeModal());
        } else {
            // User not signed in - show close and login buttons
            modalActions.innerHTML = `
                <button class="btn btn-outline" id="closeModalNoAuth">Close</button>
                <button class="btn btn-primary" id="loginBtn">Log In</button>
            `;
            document.getElementById('closeModalNoAuth').addEventListener('click', () => this.closeModal());
            document.getElementById('loginBtn').addEventListener('click', () => {
                window.location.href = '../../signin.html';
            });
        }
        
        overlay.classList.add('show');
    }
    
    closeModal() {
        document.getElementById('modalOverlay').classList.remove('show');
    }
    
    copyResults() {
        const colorEmojis = {
            yellow: '🟨',
            green: '🟩',
            blue: '🟦',
            purple: '🟪'
        };
        
        const score = this.calculateScore();
        let text = `Connections
${this.puzzle.date}
Score: ${score} pts

`;
        
        // Show guess order with colors
        this.guessHistory.forEach(color => {
            text += colorEmojis[color] + colorEmojis[color] + colorEmojis[color] + colorEmojis[color] + '\n';
        });
        
        navigator.clipboard.writeText(text).then(() => {
            this.showToast("Copied to clipboard!");
        });
    }
}

// Initialize game
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new ConnectionsGame();
});
