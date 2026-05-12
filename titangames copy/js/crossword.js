import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

var firebaseConfig = {
    apiKey: "AIzaSyDNXZ1Xnm3FrE4Ofo8ClzJ8sph7NoVSgnk",
    authDomain: "square-lcn.firebaseapp.com",
    projectId: "square-lcn",
    storageBucket: "square-lcn.firebasestorage.app",
    messagingSenderId: "496286011021",
    appId: "1:496286011021:web:776047bb56aa3c427d5cc4",
    measurementId: "G-C7CHHFMHTR"
};

var fbApp = initializeApp(firebaseConfig);
var fbDb = getFirestore(fbApp);

var FALLBACK_PUZZLE = {
    date: "Tuesday, October 5, 2021",
    author: "Joel Mulonde",
    size: 5,
    grid: [
        ['.', '.', '.', '.', '#'],
        ['.', '.', '.', '.', '#'],
        ['.', '.', '.', '.', '.'],
        ['#', '.', '.', '.', '.'],
        ['#', '.', '.', '.', '.']
    ],
    answers: [
        ['R', 'I', 'S', 'K', ''],
        ['E', 'L', 'M', 'O', ''],
        ['C', 'L', 'A', 'R', 'K'],
        ['', 'G', 'L', 'E', 'E'],
        ['', 'O', 'L', 'A', 'Y']
    ],
    numbers: {
        '0,0': 1, '0,1': 2, '0,2': 3, '0,3': 4,
        '1,0': 5,
        '2,0': 6, '2,4': 7,
        '3,1': 8,
        '4,1': 9
    },
    clues: {
        across: [
            { number: 1, row: 0, col: 0, length: 4, text: "Board game of global conquest" },
            { number: 5, row: 1, col: 0, length: 4, text: "Muppet host of HBO Max\u2019s \u201CThe Not-Too-Late Show\u201D" },
            { number: 6, row: 2, col: 0, length: 5, text: "Lewis\u2019s expedition partner" },
            { number: 8, row: 3, col: 1, length: 4, text: "Great delight" },
            { number: 9, row: 4, col: 1, length: 4, text: "Procter & Gamble skin care brand" }
        ],
        down: [
            { number: 1, row: 0, col: 0, length: 3, text: "\u201CParks and ___\u201D (TV sitcom, familiarly)" },
            { number: 2, row: 0, col: 1, length: 5, text: "Volunteer\u2019s offer" },
            { number: 3, row: 0, col: 2, length: 5, text: "S, on a shirt tag" },
            { number: 4, row: 0, col: 3, length: 5, text: "It follows \u201CNorth\u201D or \u201CSouth\u201D to make a country name" },
            { number: 7, row: 2, col: 4, length: 3, text: "Door opener" }
        ]
    }
};

function unflattenPuzzle(data) {
    if (!data || !data.size) return data;
    var size = data.size;
    if (data.grid && data.grid.length > 0 && !Array.isArray(data.grid[0])) {
        var g = [];
        for (var r = 0; r < size; r++) {
            g[r] = [];
            for (var c = 0; c < size; c++) {
                g[r][c] = data.grid[r * size + c] || '.';
            }
        }
        data.grid = g;
    }
    if (data.answers && data.answers.length > 0 && !Array.isArray(data.answers[0])) {
        var a = [];
        for (var r = 0; r < size; r++) {
            a[r] = [];
            for (var c = 0; c < size; c++) {
                a[r][c] = data.answers[r * size + c] || '';
            }
        }
        data.answers = a;
    }
    return data;
}

async function fetchTodaysPuzzle() {
    try {
        var now = new Date();
        var dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        var docId = 'crossword-' + dateStr;
        var docSnap = await getDoc(doc(fbDb, 'crosswords', docId));
        if (docSnap.exists()) {
            var data = docSnap.data();
            if (data.status === 'published') return unflattenPuzzle(data);
        }
        var q = query(collection(fbDb, 'crosswords'), where('status', '==', 'published'), orderBy('releaseDate', 'desc'));
        var snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return unflattenPuzzle(snapshot.docs[0].data());
        }
    } catch (e) {}
    return null;
}

var puzzle;
var userGrid = [];
var cellFlags = [];
var selectedRow = 0;
var selectedCol = 0;
var direction = 'across';
var timerSeconds = 0;
var timerInterval = null;
var timerRunning = false;
var solved = false;
var autocheck = false;

function init() {
    fetchTodaysPuzzle().then(function(fbPuzzle) {
        puzzle = fbPuzzle || FALLBACK_PUZZLE;
        startPuzzle();
    });
}

function startPuzzle() {
    userGrid = [];
    cellFlags = [];
    for (var r = 0; r < puzzle.size; r++) {
        userGrid[r] = [];
        cellFlags[r] = [];
        for (var c = 0; c < puzzle.size; c++) {
            userGrid[r][c] = '';
            cellFlags[r][c] = 'none';
        }
    }
    document.getElementById('puzzleDate').textContent = puzzle.date;
    document.getElementById('puzzleAuthor').textContent = 'By ' + puzzle.author;
    selectedRow = 0;
    selectedCol = 0;
    direction = 'across';
    solved = false;
    autocheck = false;
    timerSeconds = 0;
    updateTimerDisplay();
    buildGrid();
    buildClues();
    selectCell(0, 0);
    startTimer();
    setupToolbar();
}

function buildGrid() {
    var gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = 'repeat(' + puzzle.size + ', var(--cell-size))';
    document.documentElement.style.setProperty('--grid-cols', puzzle.size);
    for (var r = 0; r < puzzle.size; r++) {
        for (var c = 0; c < puzzle.size; c++) {
            var cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            if (puzzle.grid[r][c] === '#') {
                cell.classList.add('cell--black');
            } else {
                var numKey = r + ',' + c;
                if (puzzle.numbers[numKey]) {
                    var num = document.createElement('span');
                    num.className = 'cell-number';
                    num.textContent = puzzle.numbers[numKey];
                    cell.appendChild(num);
                }
                var letter = document.createElement('span');
                letter.className = 'cell-letter';
                cell.appendChild(letter);
                (function(row, col) {
                    cell.addEventListener('click', function() {
                        if (row === selectedRow && col === selectedCol) {
                            direction = direction === 'across' ? 'down' : 'across';
                        }
                        selectCell(row, col);
                    });
                })(r, c);
            }
            gridEl.appendChild(cell);
        }
    }
}

function buildClues() {
    var acrossEl = document.getElementById('acrossClues');
    var downEl = document.getElementById('downClues');
    acrossEl.innerHTML = '';
    downEl.innerHTML = '';
    puzzle.clues.across.forEach(function(clue) {
        var li = document.createElement('li');
        li.dataset.direction = 'across';
        li.dataset.number = clue.number;
        li.innerHTML = '<span class="clue-num">' + clue.number + '</span><span>' + clue.text + '</span>';
        li.addEventListener('click', function() {
            direction = 'across';
            selectFirstEmptyInClue(clue);
        });
        acrossEl.appendChild(li);
    });
    puzzle.clues.down.forEach(function(clue) {
        var li = document.createElement('li');
        li.dataset.direction = 'down';
        li.dataset.number = clue.number;
        li.innerHTML = '<span class="clue-num">' + clue.number + '</span><span>' + clue.text + '</span>';
        li.addEventListener('click', function() {
            direction = 'down';
            selectFirstEmptyInClue(clue);
        });
        downEl.appendChild(li);
    });
}

function getActiveClue() {
    var clues = puzzle.clues[direction];
    for (var i = clues.length - 1; i >= 0; i--) {
        var clue = clues[i];
        if (direction === 'across') {
            if (selectedRow === clue.row && selectedCol >= clue.col && selectedCol < clue.col + clue.length) {
                return clue;
            }
        } else {
            if (selectedCol === clue.col && selectedRow >= clue.row && selectedRow < clue.row + clue.length) {
                return clue;
            }
        }
    }
    var alt = direction === 'across' ? 'down' : 'across';
    var altClues = puzzle.clues[alt];
    for (var i = altClues.length - 1; i >= 0; i--) {
        var clue = altClues[i];
        if (alt === 'across') {
            if (selectedRow === clue.row && selectedCol >= clue.col && selectedCol < clue.col + clue.length) {
                direction = alt;
                return clue;
            }
        } else {
            if (selectedCol === clue.col && selectedRow >= clue.row && selectedRow < clue.row + clue.length) {
                direction = alt;
                return clue;
            }
        }
    }
    return null;
}

function selectCell(r, c) {
    if (r < 0 || r >= puzzle.size || c < 0 || c >= puzzle.size) return;
    if (puzzle.grid[r][c] === '#') return;
    selectedRow = r;
    selectedCol = c;
    var activeClue = getActiveClue();
    highlightGrid(activeClue);
    highlightClueList(activeClue);
    updateActiveBar(activeClue);
}

function highlightGrid(activeClue) {
    var cells = document.querySelectorAll('#grid .cell');
    cells.forEach(function(cell) {
        cell.classList.remove('cell--selected', 'cell--highlighted');
    });
    if (activeClue) {
        for (var i = 0; i < activeClue.length; i++) {
            var r, c;
            if (direction === 'across') {
                r = activeClue.row;
                c = activeClue.col + i;
            } else {
                r = activeClue.row + i;
                c = activeClue.col;
            }
            var el = document.querySelector('#grid .cell[data-row="' + r + '"][data-col="' + c + '"]');
            if (el) el.classList.add('cell--highlighted');
        }
    }
    var sel = document.querySelector('#grid .cell[data-row="' + selectedRow + '"][data-col="' + selectedCol + '"]');
    if (sel) sel.classList.add('cell--selected');
}

function highlightClueList(activeClue) {
    document.querySelectorAll('.clue-list li').forEach(function(li) {
        li.classList.remove('active');
    });
    if (activeClue) {
        var li = document.querySelector('.clue-list li[data-direction="' + direction + '"][data-number="' + activeClue.number + '"]');
        if (li) li.classList.add('active');
    }
}

function updateActiveBar(activeClue) {
    var numEl = document.getElementById('activeClueNum');
    var textEl = document.getElementById('activeClueText');
    if (activeClue) {
        numEl.textContent = activeClue.number + (direction === 'across' ? 'A' : 'D');
        textEl.textContent = activeClue.text;
    }
}

function setLetter(r, c, letter) {
    userGrid[r][c] = letter;
    var cell = document.querySelector('#grid .cell[data-row="' + r + '"][data-col="' + c + '"]');
    if (cell) {
        var letterEl = cell.querySelector('.cell-letter');
        if (letterEl) letterEl.textContent = letter;
    }
    clearCellFlag(r, c);
    if (autocheck && letter !== '') {
        if (letter.toUpperCase() !== puzzle.answers[r][c].toUpperCase()) {
            setCellFlag(r, c, 'incorrect');
        }
    }
}

function setCellFlag(r, c, flag) {
    cellFlags[r][c] = flag;
    var cell = document.querySelector('#grid .cell[data-row="' + r + '"][data-col="' + c + '"]');
    if (cell) {
        cell.classList.remove('cell--incorrect');
        if (flag === 'incorrect') cell.classList.add('cell--incorrect');
    }
}

function clearCellFlag(r, c) {
    cellFlags[r][c] = 'none';
    var cell = document.querySelector('#grid .cell[data-row="' + r + '"][data-col="' + c + '"]');
    if (cell) {
        cell.classList.remove('cell--incorrect');
    }
}

function selectFirstEmptyInClue(clue) {
    for (var i = 0; i < clue.length; i++) {
        var r, c;
        if (direction === 'across') {
            r = clue.row;
            c = clue.col + i;
        } else {
            r = clue.row + i;
            c = clue.col;
        }
        if (userGrid[r][c] === '') {
            selectCell(r, c);
            return;
        }
    }
    selectCell(clue.row, clue.col);
}

function checkSquare() {
    var r = selectedRow, c = selectedCol;
    if (puzzle.grid[r][c] === '#' || userGrid[r][c] === '') return;
    if (userGrid[r][c].toUpperCase() !== puzzle.answers[r][c].toUpperCase()) {
        setCellFlag(r, c, 'incorrect');
    }
}

function checkWord() {
    var clue = getActiveClue();
    if (!clue) return;
    for (var i = 0; i < clue.length; i++) {
        var r, c;
        if (direction === 'across') {
            r = clue.row;
            c = clue.col + i;
        } else {
            r = clue.row + i;
            c = clue.col;
        }
        if (userGrid[r][c] !== '' && userGrid[r][c].toUpperCase() !== puzzle.answers[r][c].toUpperCase()) {
            setCellFlag(r, c, 'incorrect');
        }
    }
}

function checkPuzzle() {
    for (var r = 0; r < puzzle.size; r++) {
        for (var c = 0; c < puzzle.size; c++) {
            if (puzzle.grid[r][c] === '#') continue;
            if (userGrid[r][c] !== '' && userGrid[r][c].toUpperCase() !== puzzle.answers[r][c].toUpperCase()) {
                setCellFlag(r, c, 'incorrect');
            }
        }
    }
}

function toggleAutocheck() {
    autocheck = !autocheck;
    var btn = document.getElementById('autocheckBtn');
    if (btn) btn.classList.toggle('active', autocheck);
    if (autocheck) {
        checkPuzzle();
    } else {
        for (var r = 0; r < puzzle.size; r++) {
            for (var c = 0; c < puzzle.size; c++) {
                if (cellFlags[r][c] === 'incorrect') {
                    clearCellFlag(r, c);
                }
            }
        }
    }
}



function clearSquare() {
    var r = selectedRow, c = selectedCol;
    if (puzzle.grid[r][c] === '#') return;
    setLetter(r, c, '');
    clearCellFlag(r, c);
}

function clearWord() {
    var clue = getActiveClue();
    if (!clue) return;
    for (var i = 0; i < clue.length; i++) {
        var r, c;
        if (direction === 'across') {
            r = clue.row;
            c = clue.col + i;
        } else {
            r = clue.row + i;
            c = clue.col;
        }
        setLetter(r, c, '');
        clearCellFlag(r, c);
    }
}

function clearPuzzle() {
    for (var r = 0; r < puzzle.size; r++) {
        for (var c = 0; c < puzzle.size; c++) {
            if (puzzle.grid[r][c] === '#') continue;
            setLetter(r, c, '');
            clearCellFlag(r, c);
        }
    }
}

function resetPuzzle() {
    if (!confirm('This will reset the entire puzzle and timer. Continue?')) return;
    for (var r = 0; r < puzzle.size; r++) {
        for (var c = 0; c < puzzle.size; c++) {
            if (puzzle.grid[r][c] === '#') continue;
            userGrid[r][c] = '';
            cellFlags[r][c] = 'none';
            var cell = document.querySelector('#grid .cell[data-row="' + r + '"][data-col="' + c + '"]');
            if (cell) {
                cell.classList.remove('cell--incorrect');
                var letterEl = cell.querySelector('.cell-letter');
                if (letterEl) letterEl.textContent = '';
            }
        }
    }
    autocheck = false;
    var btn = document.getElementById('autocheckBtn');
    if (btn) btn.classList.remove('active');
    solved = false;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerSeconds = 0;
    updateTimerDisplay();
    startTimer();
    selectCell(0, 0);
}

function moveToNext() {
    var clue = getActiveClue();
    if (!clue) return;
    if (direction === 'across') {
        var nc = selectedCol + 1;
        if (nc < clue.col + clue.length) {
            selectCell(selectedRow, nc);
        }
    } else {
        var nr = selectedRow + 1;
        if (nr < clue.row + clue.length) {
            selectCell(nr, selectedCol);
        }
    }
}

function moveToPrev() {
    var clue = getActiveClue();
    if (!clue) return;
    if (direction === 'across') {
        var nc = selectedCol - 1;
        if (nc >= clue.col) {
            selectCell(selectedRow, nc);
        }
    } else {
        var nr = selectedRow - 1;
        if (nr >= clue.row) {
            selectCell(nr, selectedCol);
        }
    }
}

function moveToNextClue() {
    var clues = puzzle.clues[direction];
    var activeClue = getActiveClue();
    if (!activeClue) return;
    var idx = clues.indexOf(activeClue);
    idx++;
    if (idx >= clues.length) {
        if (direction === 'across') {
            direction = 'down';
            selectFirstEmptyInClue(puzzle.clues.down[0]);
        } else {
            direction = 'across';
            selectFirstEmptyInClue(puzzle.clues.across[0]);
        }
    } else {
        selectFirstEmptyInClue(clues[idx]);
    }
}

function moveToPrevClue() {
    var clues = puzzle.clues[direction];
    var activeClue = getActiveClue();
    if (!activeClue) return;
    var idx = clues.indexOf(activeClue);
    idx--;
    if (idx < 0) {
        if (direction === 'across') {
            direction = 'down';
            var last = puzzle.clues.down[puzzle.clues.down.length - 1];
            selectFirstEmptyInClue(last);
        } else {
            direction = 'across';
            var last = puzzle.clues.across[puzzle.clues.across.length - 1];
            selectFirstEmptyInClue(last);
        }
    } else {
        selectFirstEmptyInClue(clues[idx]);
    }
}

function advanceToNextIncompleteClue() {
    var allClues = [];
    puzzle.clues.across.forEach(function(c) { allClues.push({ clue: c, dir: 'across' }); });
    puzzle.clues.down.forEach(function(c) { allClues.push({ clue: c, dir: 'down' }); });
    var currentClue = getActiveClue();
    if (!currentClue) return;
    var startIdx = -1;
    for (var i = 0; i < allClues.length; i++) {
        if (allClues[i].clue.number === currentClue.number && allClues[i].dir === direction) {
            startIdx = i;
            break;
        }
    }
    if (startIdx === -1) return;
    for (var offset = 1; offset <= allClues.length; offset++) {
        var idx = (startIdx + offset) % allClues.length;
        var entry = allClues[idx];
        for (var j = 0; j < entry.clue.length; j++) {
            var r, c;
            if (entry.dir === 'across') {
                r = entry.clue.row;
                c = entry.clue.col + j;
            } else {
                r = entry.clue.row + j;
                c = entry.clue.col;
            }
            if (userGrid[r][c] === '') {
                direction = entry.dir;
                selectCell(r, c);
                return;
            }
        }
    }
}

function checkWin() {
    for (var r = 0; r < puzzle.size; r++) {
        for (var c = 0; c < puzzle.size; c++) {
            if (puzzle.grid[r][c] === '#') continue;
            if (userGrid[r][c].toUpperCase() !== puzzle.answers[r][c].toUpperCase()) return false;
        }
    }
    return true;
}

function handleWin() {
    solved = true;
    stopTimer();
    document.getElementById('pauseOverlay').classList.remove('show');
    document.getElementById('winTime').textContent = 'Your time: ' + formatTime(timerSeconds);
    document.getElementById('winOverlay').classList.add('show');
}

function startTimer() {
    document.getElementById('pauseOverlay').classList.remove('show');
    if (timerInterval) clearInterval(timerInterval);
    timerRunning = true;
    timerInterval = setInterval(function() {
        timerSeconds++;
        updateTimerDisplay();
    }, 1000);
    showPauseIcon(true);
}

function stopTimer() {
    timerRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    showPauseIcon(false);
    if (!solved) {
        document.getElementById('pauseOverlay').classList.add('show');
    }
}

function updateTimerDisplay() {
    document.getElementById('timerDisplay').textContent = formatTime(timerSeconds);
}

function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
}

function showPauseIcon(running) {
    document.getElementById('pauseIcon1').style.display = running ? '' : 'none';
    document.getElementById('pauseIcon2').style.display = running ? '' : 'none';
    document.getElementById('playIcon').style.display = running ? 'none' : '';
}

function setupToolbar() {
    document.getElementById('timerBtn').addEventListener('click', function() {
        if (solved) return;
        if (timerRunning) {
            stopTimer();
        } else {
            startTimer();
        }
    });

    document.getElementById('resumeBtn').addEventListener('click', function() {
        if (!solved) startTimer();
    });

    document.querySelectorAll('.toolbar-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var menu = this.nextElementSibling;
            var wasOpen = menu.classList.contains('open');
            closeAllDropdowns();
            if (!wasOpen) menu.classList.add('open');
        });
    });

    document.addEventListener('click', closeAllDropdowns);

    document.querySelectorAll('.dropdown-menu button').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var action = this.dataset.action;
            if (solved && action !== 'reset') {
                closeAllDropdowns();
                return;
            }
            switch (action) {
                case 'check-square': checkSquare(); break;
                case 'check-word': checkWord(); break;
                case 'check-puzzle': checkPuzzle(); break;
                case 'autocheck': toggleAutocheck(); break;
                case 'clear-square': clearSquare(); break;
                case 'clear-word': clearWord(); break;
                case 'clear-puzzle': clearPuzzle(); break;
                case 'reset': resetPuzzle(); break;
            }
            closeAllDropdowns();
        });
    });
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(function(m) {
        m.classList.remove('open');
    });
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAllDropdowns();
        return;
    }
    if (solved) return;
    if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (direction !== 'across') {
            direction = 'across';
            selectCell(selectedRow, selectedCol);
        } else {
            var nc = selectedCol + 1;
            while (nc < puzzle.size && puzzle.grid[selectedRow][nc] === '#') nc++;
            if (nc < puzzle.size) selectCell(selectedRow, nc);
        }
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (direction !== 'across') {
            direction = 'across';
            selectCell(selectedRow, selectedCol);
        } else {
            var nc = selectedCol - 1;
            while (nc >= 0 && puzzle.grid[selectedRow][nc] === '#') nc--;
            if (nc >= 0) selectCell(selectedRow, nc);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (direction !== 'down') {
            direction = 'down';
            selectCell(selectedRow, selectedCol);
        } else {
            var nr = selectedRow + 1;
            while (nr < puzzle.size && puzzle.grid[nr][selectedCol] === '#') nr++;
            if (nr < puzzle.size) selectCell(nr, selectedCol);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (direction !== 'down') {
            direction = 'down';
            selectCell(selectedRow, selectedCol);
        } else {
            var nr = selectedRow - 1;
            while (nr >= 0 && puzzle.grid[nr][selectedCol] === '#') nr--;
            if (nr >= 0) selectCell(nr, selectedCol);
        }
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (userGrid[selectedRow][selectedCol] !== '') {
            setLetter(selectedRow, selectedCol, '');
        } else {
            moveToPrev();
            setLetter(selectedRow, selectedCol, '');
        }
    } else if (e.key === 'Delete') {
        e.preventDefault();
        setLetter(selectedRow, selectedCol, '');
    } else if (e.key === ' ') {
        e.preventDefault();
        direction = direction === 'across' ? 'down' : 'across';
        selectCell(selectedRow, selectedCol);
    } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
            moveToPrevClue();
        } else {
            moveToNextClue();
        }
    } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        setLetter(selectedRow, selectedCol, e.key.toUpperCase());
        var clue = getActiveClue();
        if (clue) {
            var nextEmpty = null;
            for (var i = 0; i < clue.length; i++) {
                var r, c;
                if (direction === 'across') {
                    r = clue.row;
                    c = clue.col + i;
                } else {
                    r = clue.row + i;
                    c = clue.col;
                }
                if ((r !== selectedRow || c !== selectedCol) && userGrid[r][c] === '') {
                    if (direction === 'across' ? c > selectedCol : r > selectedRow) {
                        nextEmpty = { r: r, c: c };
                        break;
                    }
                }
            }
            if (nextEmpty) {
                selectCell(nextEmpty.r, nextEmpty.c);
            } else {
                var wordComplete = true;
                for (var i = 0; i < clue.length; i++) {
                    var r, c;
                    if (direction === 'across') {
                        r = clue.row;
                        c = clue.col + i;
                    } else {
                        r = clue.row + i;
                        c = clue.col;
                    }
                    if (userGrid[r][c] === '') {
                        wordComplete = false;
                        break;
                    }
                }
                if (wordComplete) {
                    advanceToNextIncompleteClue();
                } else {
                    moveToNext();
                }
            }
        }
        if (checkWin()) handleWin();
    }
});

init();
