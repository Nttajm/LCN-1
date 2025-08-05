const WORDS = [
    "CLASS", "SCHOOL", "TEACH", "STUDY", "GRADE", "BOOKS", "PAPER", "PENCI", "BOARD", "CHAIR",
    "DESKS", "MATHS", "NOTES", "RULES", "QUIZZ", "SPORT", "FIELD", "BELL", "PRINC", "GROUP"
];
let target = "";
let guesses = [];
let currentGuess = "";
let gameOver = false;

const grid = document.getElementById("grid");
const feedback = document.getElementById("feedback");
const keyboard = document.getElementById("keyboard");

function initGrid() {
    grid.innerHTML = "";
    for (let r = 0; r < 6; r++) {
        const row = document.createElement("div");
        row.className = "row";
        for (let c = 0; c < 5; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            row.appendChild(cell);
        }
        grid.appendChild(row);
    }
}

function newGame() {
    target = WORDS[Math.floor(Math.random()*WORDS.length)];
    guesses = [];
    currentGuess = "";
    gameOver = false;
    initGrid();
    feedback.textContent = "";
    document.querySelectorAll(".key").forEach(k=>k.className = k.dataset.key.length>1 ? "key wide" : "key");
}

async function validateWord(word) {
    try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
        return res.ok;
    } catch {
        return WORDS.includes(word);
    }
}

function handleInput(key) {
    if (gameOver) return;
    if (key === "Enter") {
        if (currentGuess.length !== 5) {
            feedback.textContent = "Word must be 5 letters.";
            return;
        }
        validateWord(currentGuess).then(valid=>{
            if (!valid) {
                feedback.textContent = "Not a valid word.";
                return;
            }
            feedback.textContent = "";
            guesses.push(currentGuess);
            currentGuess = "";
            updateGrid();
            updateKeys();

            if (currentGuess === target) {
                feedback.innerHTML = `🎉 You won! The word was ${target}.<br><button class="play-again" onclick="newGame()">Play Again</button>`;
                gameOver = true;
                return;
            }
            if (guesses.length === 6) {
                feedback.innerHTML = `😔 Game Over! The word was ${target}.<br><button class="play-again" onclick="newGame()">Play Again</button>`;
                gameOver = true;
                return;
            }
            currentGuess = "";
        });
    } else if (key === "Backspace") {
        currentGuess = currentGuess.slice(0,-1);
        updateGrid();
    } else if (/^[a-z]$/i.test(key) && currentGuess.length < 5) {
        currentGuess += key.toUpperCase();
        updateGrid();
    }
}

function updateGrid() {
    const rows = grid.querySelectorAll(".row");
    rows.forEach((row,r)=>{
        const cells = row.querySelectorAll(".cell");
        for (let c=0;c<5;c++) {
            cells[c].textContent = "";
            cells[c].className = "cell";
        }
        if (guesses[r]) {
            for (let c=0;c<5;c++) {
                const letter = guesses[r][c];
                cells[c].textContent = letter;
                if (letter === target[c]) {
                    cells[c].classList.add("correct");
                } else if (target.includes(letter)) {
                    cells[c].classList.add("present");
                } else {
                    cells[c].classList.add("absent");
                }
            }
        } else if (r === guesses.length) {
            for (let c=0;c<currentGuess.length;c++) {
                cells[c].textContent = currentGuess[c];
            }
        }
    });
}

function updateKeys() {
    guesses.forEach(guess=>{
        for (let i=0;i<5;i++) {
            const letter = guess[i];
            const keyBtn = keyboard.querySelector(`[data-key="${letter.toLowerCase()}"]`);
            if (letter === target[i]) {
                keyBtn.className = "key correct";
            } else if (target.includes(letter)) {
                if (!keyBtn.classList.contains("correct")) keyBtn.className = "key present";
            } else {
                if (!keyBtn.classList.contains("correct") && !keyBtn.classList.contains("present")) keyBtn.className = "key absent";
            }
        }
    });
}

keyboard.addEventListener("click", e=>{
    if (e.target.classList.contains("key")) {
        handleInput(e.target.dataset.key);
    }
});
document.addEventListener("keydown", e=>{
    if (e.key === "Enter" || e.key === "Backspace" || /^[a-z]$/i.test(e.key)) {
        handleInput(e.key);
    }
});

newGame();