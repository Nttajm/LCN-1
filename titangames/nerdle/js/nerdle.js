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

let currentRow = 0;
let currentTile = 0;
let gameOver = false;
let validating = false;
let targetWord = "";
let wordList = [];

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
        document.getElementById("splashOverlay").classList.add("hidden");
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

    revealRow(guess).then(function () {
        if (guess === targetWord) {
            gameOver = true;
            const messages = ["Genius", "Magnificent", "Impressive", "Splendid", "Great", "Phew"];
            showToast(messages[row], 2000);
            setTimeout(function () {
                bounceRow(row);
            }, 200);
            return;
        }

        if (row === MAX_GUESSES - 1) {
            gameOver = true;
            showToast(targetWord, Infinity);
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

async function init() {
    initSplash();
    createBoard();
    initKeyboard();
    wordList = await fetchWordList();
    targetWord = wordList[getDayOffset() % wordList.length].toUpperCase();
}

init();
