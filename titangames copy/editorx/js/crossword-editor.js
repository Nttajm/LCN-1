import { db, collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, orderBy, Timestamp } from './firebase-config.js';

var gridSize = 5;
var grid = [];
var answers = [];
var cluesData = { across: {}, down: {} };
var selectedCell = null;
var mirrorMode = false;
var currentDocId = null;

function init() {
    setupDate();
    setupTabs();
    setupGridSize();
    setupButtons();
    createEmptyGrid(gridSize);
    buildEditorGrid();
    loadExistingReleases();
    checkUrlParams();
}

function setupDate() {
    var today = new Date();
    var dateInput = document.getElementById('releaseDate');
    dateInput.value = formatDateInput(today);
}

function formatDateInput(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function formatDateDisplay(dateStr) {
    var parts = dateStr.split('-');
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function setupTabs() {
    document.querySelectorAll('.cw-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.cw-tab').forEach(function(t) { t.classList.remove('cw-tab--active'); });
            document.querySelectorAll('.cw-tab-panel').forEach(function(p) { p.classList.remove('cw-tab-panel--active'); });
            tab.classList.add('cw-tab--active');
            document.querySelector('[data-panel="' + tab.dataset.tab + '"]').classList.add('cw-tab-panel--active');
        });
    });
}

function setupGridSize() {
    document.getElementById('gridSize').addEventListener('change', function() {
        var newSize = parseInt(this.value);
        if (newSize !== gridSize) {
            gridSize = newSize;
            createEmptyGrid(gridSize);
            buildEditorGrid();
        }
    });
}

function setupButtons() {
    document.getElementById('btnClearGrid').addEventListener('click', function() {
        createEmptyGrid(gridSize);
        buildEditorGrid();
        showToast('Grid cleared');
    });

    document.getElementById('btnMirror').addEventListener('click', function() {
        mirrorMode = !mirrorMode;
        this.textContent = 'Mirror Mode: ' + (mirrorMode ? 'On' : 'Off');
    });

    document.getElementById('btnApplyJson').addEventListener('click', applyJsonAnswers);
    document.getElementById('btnExportJson').addEventListener('click', exportFullJson);
    document.getElementById('btnImportJson').addEventListener('click', importFullJson);
    document.getElementById('btnSaveDraft').addEventListener('click', function() { savePuzzle('draft'); });
    document.getElementById('btnPublish').addEventListener('click', function() { savePuzzle('published'); });
}

function createEmptyGrid(size) {
    grid = [];
    answers = [];
    for (var r = 0; r < size; r++) {
        grid[r] = [];
        answers[r] = [];
        for (var c = 0; c < size; c++) {
            grid[r][c] = '.';
            answers[r][c] = '';
        }
    }
    cluesData = { across: {}, down: {} };
}

function buildEditorGrid() {
    var gridEl = document.getElementById('editorGrid');
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = 'repeat(' + gridSize + ', 3.25rem)';

    var numbers = computeNumbers();

    for (var r = 0; r < gridSize; r++) {
        for (var c = 0; c < gridSize; c++) {
            var cell = document.createElement('div');
            cell.className = 'cw-cell';
            cell.dataset.row = r;
            cell.dataset.col = c;

            if (grid[r][c] === '#') {
                cell.classList.add('cw-cell--black');
            }

            var numKey = r + ',' + c;
            if (numbers[numKey]) {
                var numSpan = document.createElement('span');
                numSpan.className = 'cw-cell-number';
                numSpan.textContent = numbers[numKey];
                cell.appendChild(numSpan);
            }

            var letterSpan = document.createElement('span');
            letterSpan.className = 'cw-cell-letter';
            if (grid[r][c] !== '#') {
                letterSpan.textContent = answers[r][c] || '';
            }
            cell.appendChild(letterSpan);

            (function(row, col) {
                cell.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    toggleBlack(row, col);
                });
                cell.addEventListener('click', function(e) {
                    if (e.shiftKey) {
                        toggleBlack(row, col);
                    } else {
                        selectEditorCell(row, col);
                    }
                });
            })(r, c);

            gridEl.appendChild(cell);
        }
    }

    buildClueInputs(numbers);
}

function toggleBlack(r, c) {
    if (grid[r][c] === '#') {
        grid[r][c] = '.';
        answers[r][c] = '';
    } else {
        grid[r][c] = '#';
        answers[r][c] = '';
    }

    if (mirrorMode) {
        var mr = gridSize - 1 - r;
        var mc = gridSize - 1 - c;
        if (mr !== r || mc !== c) {
            grid[mr][mc] = grid[r][c];
            if (grid[mr][mc] === '#') {
                answers[mr][mc] = '';
            }
        }
    }

    selectedCell = null;
    buildEditorGrid();
}

function selectEditorCell(r, c) {
    if (grid[r][c] === '#') return;

    document.querySelectorAll('.cw-cell--selected').forEach(function(el) {
        el.classList.remove('cw-cell--selected');
    });

    selectedCell = { r: r, c: c };
    var cell = document.querySelector('.cw-cell[data-row="' + r + '"][data-col="' + c + '"]');
    if (cell) cell.classList.add('cw-cell--selected');
}

function computeNumbers() {
    var numbers = {};
    var num = 1;
    for (var r = 0; r < gridSize; r++) {
        for (var c = 0; c < gridSize; c++) {
            if (grid[r][c] === '#') continue;
            var isAcrossStart = (c === 0 || grid[r][c - 1] === '#') && c + 1 < gridSize && grid[r][c + 1] !== '#';
            var isDownStart = (r === 0 || grid[r - 1][c] === '#') && r + 1 < gridSize && grid[r + 1][c] !== '#';
            if (isAcrossStart || isDownStart) {
                numbers[r + ',' + c] = num;
                num++;
            }
        }
    }
    return numbers;
}

function buildClueInputs(numbers) {
    var acrossEl = document.getElementById('acrossClueInputs');
    var downEl = document.getElementById('downClueInputs');
    acrossEl.innerHTML = '';
    downEl.innerHTML = '';

    for (var r = 0; r < gridSize; r++) {
        for (var c = 0; c < gridSize; c++) {
            if (grid[r][c] === '#') continue;
            var numKey = r + ',' + c;
            var num = numbers[numKey];
            if (!num) continue;

            var isAcrossStart = (c === 0 || grid[r][c - 1] === '#') && c + 1 < gridSize && grid[r][c + 1] !== '#';
            var isDownStart = (r === 0 || grid[r - 1][c] === '#') && r + 1 < gridSize && grid[r + 1][c] !== '#';

            if (isAcrossStart) {
                var len = 0;
                for (var cc = c; cc < gridSize && grid[r][cc] !== '#'; cc++) len++;
                var row = createClueInput(num, 'across', r, c, len);
                acrossEl.appendChild(row);
            }
            if (isDownStart) {
                var len = 0;
                for (var rr = r; rr < gridSize && grid[rr][c] !== '#'; rr++) len++;
                var row = createClueInput(num, 'down', r, c, len);
                downEl.appendChild(row);
            }
        }
    }
}

function createClueInput(num, dir, row, col, length) {
    var div = document.createElement('div');
    div.className = 'cw-clue-row';

    var numSpan = document.createElement('span');
    numSpan.className = 'cw-clue-num';
    numSpan.textContent = num;

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'cw-clue-input';
    input.placeholder = 'Clue for ' + num + (dir === 'across' ? 'A' : 'D') + ' (' + length + ' letters)';
    input.dataset.num = num;
    input.dataset.dir = dir;
    input.dataset.row = row;
    input.dataset.col = col;
    input.dataset.length = length;

    var key = dir + '-' + num;
    if (cluesData[dir][num]) {
        input.value = cluesData[dir][num];
    }

    input.addEventListener('input', function() {
        cluesData[dir][num] = this.value;
    });

    div.appendChild(numSpan);
    div.appendChild(input);
    return div;
}

document.addEventListener('keydown', function(e) {
    if (!selectedCell) return;
    if (document.activeElement && document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT') return;

    var r = selectedCell.r;
    var c = selectedCell.c;

    if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        answers[r][c] = e.key.toUpperCase();
        updateCellDisplay(r, c);
        moveToNextWhiteCell(r, c);
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (answers[r][c] !== '') {
            answers[r][c] = '';
            updateCellDisplay(r, c);
        } else {
            var prev = findPrevWhiteCell(r, c);
            if (prev) {
                answers[prev.r][prev.c] = '';
                updateCellDisplay(prev.r, prev.c);
                selectEditorCell(prev.r, prev.c);
            }
        }
    } else if (e.key === 'Delete') {
        e.preventDefault();
        answers[r][c] = '';
        updateCellDisplay(r, c);
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        var nc = c + 1;
        while (nc < gridSize && grid[r][nc] === '#') nc++;
        if (nc < gridSize) selectEditorCell(r, nc);
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        var nc = c - 1;
        while (nc >= 0 && grid[r][nc] === '#') nc--;
        if (nc >= 0) selectEditorCell(r, nc);
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        var nr = r + 1;
        while (nr < gridSize && grid[nr][c] === '#') nr++;
        if (nr < gridSize) selectEditorCell(nr, c);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        var nr = r - 1;
        while (nr >= 0 && grid[nr][c] === '#') nr--;
        if (nr >= 0) selectEditorCell(nr, c);
    }
});

function updateCellDisplay(r, c) {
    var cell = document.querySelector('.cw-cell[data-row="' + r + '"][data-col="' + c + '"]');
    if (cell) {
        var letterEl = cell.querySelector('.cw-cell-letter');
        if (letterEl) letterEl.textContent = answers[r][c] || '';
    }
}

function moveToNextWhiteCell(r, c) {
    var nc = c + 1;
    while (nc < gridSize) {
        if (grid[r][nc] !== '#') {
            selectEditorCell(r, nc);
            return;
        }
        nc++;
    }
    for (var nr = r + 1; nr < gridSize; nr++) {
        for (var nc2 = 0; nc2 < gridSize; nc2++) {
            if (grid[nr][nc2] !== '#') {
                selectEditorCell(nr, nc2);
                return;
            }
        }
    }
}

function findPrevWhiteCell(r, c) {
    var nc = c - 1;
    while (nc >= 0) {
        if (grid[r][nc] !== '#') return { r: r, c: nc };
        nc--;
    }
    for (var nr = r - 1; nr >= 0; nr--) {
        for (var nc2 = gridSize - 1; nc2 >= 0; nc2--) {
            if (grid[nr][nc2] !== '#') return { r: nr, c: nc2 };
        }
    }
    return null;
}

function applyJsonAnswers() {
    var textarea = document.getElementById('answersJson');
    var raw = textarea.value.trim();
    if (!raw) {
        showToast('Paste an answers array first', 'error');
        return;
    }
    try {
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Not an array');

        var size = parsed.length;
        gridSize = size;
        document.getElementById('gridSize').value = String(size);

        createEmptyGrid(size);
        for (var r = 0; r < size; r++) {
            if (!Array.isArray(parsed[r])) continue;
            for (var c = 0; c < size; c++) {
                var val = (parsed[r][c] || '').toString().trim();
                if (val === '' || val === '#') {
                    grid[r][c] = '#';
                    answers[r][c] = '';
                } else {
                    grid[r][c] = '.';
                    answers[r][c] = val.toUpperCase();
                }
            }
        }

        buildEditorGrid();
        showToast('Answers applied to grid', 'success');
    } catch (err) {
        showToast('Invalid JSON: ' + err.message, 'error');
    }
}

function collectPuzzleData() {
    var numbers = computeNumbers();
    var numbersObj = {};
    Object.keys(numbers).forEach(function(key) {
        numbersObj[key] = numbers[key];
    });

    var acrossClues = [];
    var downClues = [];

    document.querySelectorAll('.cw-clue-input').forEach(function(input) {
        var num = parseInt(input.dataset.num);
        var dir = input.dataset.dir;
        var row = parseInt(input.dataset.row);
        var col = parseInt(input.dataset.col);
        var length = parseInt(input.dataset.length);
        var text = input.value.trim();

        var clueObj = { number: num, row: row, col: col, length: length, text: text };
        if (dir === 'across') {
            acrossClues.push(clueObj);
        } else {
            downClues.push(clueObj);
        }
    });

    var dateStr = document.getElementById('releaseDate').value;
    var author = document.getElementById('authorName').value.trim() || 'Unknown';

    var flatGrid = [];
    var flatAnswers = [];
    for (var r = 0; r < gridSize; r++) {
        for (var c = 0; c < gridSize; c++) {
            flatGrid.push(grid[r][c]);
            flatAnswers.push(answers[r][c]);
        }
    }

    return {
        date: formatDateDisplay(dateStr),
        releaseDate: dateStr,
        author: author,
        size: gridSize,
        grid: flatGrid,
        answers: flatAnswers,
        numbers: numbersObj,
        clues: {
            across: acrossClues,
            down: downClues
        }
    };
}

function exportFullJson() {
    var data = collectPuzzleData();
    document.getElementById('fullJson').value = JSON.stringify(data, null, 2);
    showToast('Exported to JSON', 'success');
}

function importFullJson() {
    var raw = document.getElementById('fullJson').value.trim();
    if (!raw) {
        showToast('Paste puzzle JSON first', 'error');
        return;
    }
    try {
        var data = JSON.parse(raw);
        loadPuzzleData(data);
        showToast('Puzzle imported', 'success');
    } catch (err) {
        showToast('Invalid JSON: ' + err.message, 'error');
    }
}

function loadPuzzleData(data) {
    gridSize = data.size || 5;
    document.getElementById('gridSize').value = String(gridSize);

    if (data.releaseDate) {
        document.getElementById('releaseDate').value = data.releaseDate;
    }
    if (data.author) {
        document.getElementById('authorName').value = data.author;
    }

    createEmptyGrid(gridSize);

    if (data.grid) {
        var isFlat = data.grid.length > 0 && !Array.isArray(data.grid[0]);
        for (var r = 0; r < gridSize; r++) {
            for (var c = 0; c < gridSize; c++) {
                if (isFlat) {
                    grid[r][c] = data.grid[r * gridSize + c] || '.';
                } else {
                    grid[r][c] = data.grid[r] && data.grid[r][c] ? data.grid[r][c] : '.';
                }
            }
        }
    }

    if (data.answers) {
        var isFlat = data.answers.length > 0 && !Array.isArray(data.answers[0]);
        for (var r = 0; r < gridSize; r++) {
            for (var c = 0; c < gridSize; c++) {
                if (isFlat) {
                    answers[r][c] = data.answers[r * gridSize + c] || '';
                } else {
                    answers[r][c] = data.answers[r] && data.answers[r][c] ? data.answers[r][c] : '';
                }
            }
        }
    }

    cluesData = { across: {}, down: {} };
    if (data.clues) {
        if (data.clues.across) {
            data.clues.across.forEach(function(cl) {
                cluesData.across[cl.number] = cl.text || '';
            });
        }
        if (data.clues.down) {
            data.clues.down.forEach(function(cl) {
                cluesData.down[cl.number] = cl.text || '';
            });
        }
    }

    buildEditorGrid();
}

async function savePuzzle(status) {
    var data = collectPuzzleData();
    data.status = status;
    data.updatedAt = new Date().toISOString();

    var dateStr = document.getElementById('releaseDate').value;
    if (!dateStr) {
        showToast('Select a release date', 'error');
        return;
    }

    var docId = 'crossword-' + dateStr;
    currentDocId = docId;

    document.getElementById('saveIndicator').textContent = 'Saving...';

    try {
        await setDoc(doc(db, 'crosswords', docId), data);
        document.getElementById('saveIndicator').textContent = 'Saved';
        showToast(status === 'published' ? 'Published!' : 'Draft saved', 'success');
        loadExistingReleases();
        setTimeout(function() {
            document.getElementById('saveIndicator').textContent = '';
        }, 3000);
    } catch (err) {
        document.getElementById('saveIndicator').textContent = 'Error saving';
        showToast('Save failed: ' + err.message, 'error');
    }
}

async function loadExistingReleases() {
    var container = document.getElementById('releasesList');
    try {
        var q = query(collection(db, 'crosswords'), orderBy('releaseDate', 'desc'));
        var snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '<span style="font-size:0.75rem;color:#999;">No releases yet</span>';
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(function(docSnap) {
            var data = docSnap.data();
            var chip = document.createElement('a');
            chip.className = 'cw-release-chip';
            chip.href = 'crossword.html?date=' + encodeURIComponent(docSnap.id);
            if (data.status === 'published') {
                chip.classList.add('cw-release-chip--published');
            }
            if (currentDocId === docSnap.id) {
                chip.classList.add('cw-release-chip--active');
            }
            chip.textContent = data.releaseDate || docSnap.id;
            container.appendChild(chip);
        });
    } catch (err) {
        container.innerHTML = '<span style="font-size:0.75rem;color:#999;">Could not load releases</span>';
    }
}

async function checkUrlParams() {
    var params = new URLSearchParams(window.location.search);
    var dateParam = params.get('date');
    if (dateParam) {
        currentDocId = dateParam;
        try {
            var docSnap = await getDoc(doc(db, 'crosswords', dateParam));
            if (docSnap.exists()) {
                var data = docSnap.data();
                loadPuzzleData(data);
                showToast('Loaded: ' + (data.releaseDate || dateParam));
            }
        } catch (err) {
            showToast('Could not load puzzle', 'error');
        }
    }
}

function showToast(message, type) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'cw-toast cw-toast--visible';
    if (type === 'success') toast.classList.add('cw-toast--success');
    if (type === 'error') toast.classList.add('cw-toast--error');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function() {
        toast.classList.remove('cw-toast--visible');
    }, 2500);
}

init();
