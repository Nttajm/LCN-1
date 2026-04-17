import { db, collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, orderBy, Timestamp } from './firebase-config.js';

var currentDocId = null;
var targetWord = '';
var hints = ['', '', ''];

function init() {
    setupDate();
    setupButtons();
    setupWordInput();
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

function setupWordInput() {
    var wordInput = document.getElementById('targetWord');
    
    wordInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase().replace(/[^A-Z]/g, '');
        targetWord = this.value;
        updatePreview();
    });
    
    wordInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            validateWord();
        }
    });
}

function updatePreview() {
    var tiles = document.querySelectorAll('.nerdle-preview-tile');
    for (var i = 0; i < 5; i++) {
        var letter = targetWord[i] || '';
        tiles[i].textContent = letter;
        tiles[i].className = 'nerdle-preview-tile';
        if (letter) {
            tiles[i].classList.add('nerdle-preview-tile--filled');
        }
    }
}

function validateWord() {
    var statusEl = document.getElementById('validationStatus');
    if (targetWord.length !== 5) {
        statusEl.textContent = 'Word must be exactly 5 letters';
        statusEl.className = 'nerdle-validation-status nerdle-validation-status--error';
        return false;
    }
    
    // Basic validation - in production, you'd check against a word list
    statusEl.textContent = '✓ Valid word';
    statusEl.className = 'nerdle-validation-status nerdle-validation-status--success';
    return true;
}

function setupButtons() {
    document.getElementById('btnValidateWord').addEventListener('click', validateWord);
    document.getElementById('btnExportJson').addEventListener('click', exportFullJson);
    document.getElementById('btnImportJson').addEventListener('click', importFullJson);
    document.getElementById('btnSaveDraft').addEventListener('click', function() { savePuzzle('draft'); });
    document.getElementById('btnPublish').addEventListener('click', function() { savePuzzle('published'); });
}

function collectHints() {
    hints[0] = document.getElementById('hint1').value.trim();
    hints[1] = document.getElementById('hint2').value.trim();
    hints[2] = document.getElementById('hint3').value.trim();
    return hints.filter(function(h) { return h !== ''; });
}

function buildPuzzleData() {
    return {
        word: targetWord,
        hints: collectHints(),
        author: document.getElementById('authorName').value,
        puzzleNumber: parseInt(document.getElementById('puzzleNumber').value) || null,
        releaseDate: document.getElementById('releaseDate').value,
        releaseDateDisplay: formatDateDisplay(document.getElementById('releaseDate').value)
    };
}

function exportFullJson() {
    var data = buildPuzzleData();
    document.getElementById('fullJson').value = JSON.stringify(data, null, 2);
    showToast('Exported to JSON');
}

function importFullJson() {
    try {
        var data = JSON.parse(document.getElementById('fullJson').value);
        if (data.word) {
            targetWord = data.word.toUpperCase();
            document.getElementById('targetWord').value = targetWord;
        }
        if (data.hints && Array.isArray(data.hints)) {
            for (var i = 0; i < 3; i++) {
                var hintInput = document.getElementById('hint' + (i + 1));
                hintInput.value = data.hints[i] || '';
            }
        }
        if (data.author) {
            document.getElementById('authorName').value = data.author;
        }
        if (data.puzzleNumber) {
            document.getElementById('puzzleNumber').value = data.puzzleNumber;
        }
        if (data.releaseDate) {
            document.getElementById('releaseDate').value = data.releaseDate;
        }
        updatePreview();
        showToast('Imported from JSON');
    } catch (err) {
        showToast('Invalid JSON');
    }
}

async function savePuzzle(status) {
    if (!validateWord()) {
        showToast('Please enter a valid 5-letter word');
        return;
    }
    
    var dateStr = document.getElementById('releaseDate').value;
    var docId = dateStr;
    
    var puzzleData = buildPuzzleData();
    puzzleData.status = status;
    puzzleData.updatedAt = Timestamp.now();
    
    if (!currentDocId) {
        puzzleData.createdAt = Timestamp.now();
    }
    
    try {
        await setDoc(doc(db, 'nerdles', docId), puzzleData);
        currentDocId = docId;
        updateSaveIndicator(status);
        showToast(status === 'published' ? 'Published!' : 'Draft saved');
        loadExistingReleases();
    } catch (err) {
        showToast('Error saving: ' + err.message);
    }
}

function updateSaveIndicator(status) {
    var indicator = document.getElementById('saveIndicator');
    indicator.textContent = status === 'published' ? 'Published' : 'Draft saved';
    setTimeout(function() { indicator.textContent = ''; }, 3000);
}

async function loadExistingReleases() {
    var container = document.getElementById('releasesList');
    try {
        var q = query(collection(db, 'nerdles'), orderBy('releaseDate', 'desc'));
        var snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<span class="nerdle-release-chip nerdle-release-chip--empty">No releases yet</span>';
            return;
        }
        
        var html = '';
        snapshot.forEach(function(docSnap) {
            var data = docSnap.data();
            var isActive = docSnap.id === currentDocId;
            var statusClass = data.status === 'published' ? 'nerdle-release-chip--published' : '';
            var activeClass = isActive ? 'nerdle-release-chip--active' : '';
            html += '<a href="?date=' + encodeURIComponent(docSnap.id) + '" class="nerdle-release-chip ' + statusClass + ' ' + activeClass + '">';
            html += data.releaseDate || docSnap.id;
            html += '</a>';
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<span class="nerdle-release-chip nerdle-release-chip--error">Error loading</span>';
    }
}

async function loadPuzzle(docId) {
    try {
        var docSnap = await getDoc(doc(db, 'nerdles', docId));
        if (docSnap.exists()) {
            var data = docSnap.data();
            currentDocId = docId;
            
            targetWord = data.word || '';
            document.getElementById('targetWord').value = targetWord;
            
            if (data.hints && Array.isArray(data.hints)) {
                for (var i = 0; i < 3; i++) {
                    var hintInput = document.getElementById('hint' + (i + 1));
                    hintInput.value = data.hints[i] || '';
                }
            }
            
            if (data.author) {
                document.getElementById('authorName').value = data.author;
            }
            if (data.puzzleNumber) {
                document.getElementById('puzzleNumber').value = data.puzzleNumber;
            }
            if (data.releaseDate) {
                document.getElementById('releaseDate').value = data.releaseDate;
            }
            
            updatePreview();
            loadExistingReleases();
            showToast('Loaded puzzle for ' + data.releaseDate);
        } else {
            showToast('Puzzle not found');
        }
    } catch (err) {
        showToast('Error loading puzzle');
    }
}

function checkUrlParams() {
    var params = new URLSearchParams(window.location.search);
    var dateParam = params.get('date');
    if (dateParam) {
        loadPuzzle(dateParam);
    }
}

function showToast(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('nerdle-toast--visible');
    setTimeout(function() {
        toast.classList.remove('nerdle-toast--visible');
    }, 2500);
}

init();
