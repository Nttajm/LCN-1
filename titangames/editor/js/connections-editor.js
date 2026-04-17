import { db, collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, orderBy, Timestamp } from './firebase-config.js';

var currentDocId = null;
var categories = [
    { name: '', color: 'yellow', words: ['', '', '', ''] },
    { name: '', color: 'green', words: ['', '', '', ''] },
    { name: '', color: 'blue', words: ['', '', '', ''] },
    { name: '', color: 'purple', words: ['', '', '', ''] }
];

function init() {
    setupDate();
    setupButtons();
    setupInputListeners();
    loadExistingReleases();
    checkUrlParams();
    updatePreview();
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

function setupInputListeners() {
    // Category name inputs
    document.querySelectorAll('.conn-category-name').forEach(function(input) {
        input.addEventListener('input', function() {
            var idx = parseInt(this.dataset.index);
            categories[idx].name = this.value;
            updatePreview();
        });
    });
    
    // Word inputs
    document.querySelectorAll('.conn-word-input').forEach(function(input) {
        input.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
            var catIdx = parseInt(this.dataset.index);
            var wordIdx = parseInt(this.dataset.word);
            categories[catIdx].words[wordIdx] = this.value;
            updatePreview();
        });
    });
}

function updatePreview() {
    var previewGrid = document.getElementById('previewGrid');
    var allWords = [];
    
    categories.forEach(function(cat) {
        cat.words.forEach(function(word) {
            allWords.push({ word: word || '?', color: cat.color });
        });
    });
    
    // Shuffle preview words
    var shuffled = allWords.slice();
    shuffle(shuffled);
    
    var tiles = previewGrid.querySelectorAll('.conn-preview-word');
    shuffled.forEach(function(item, i) {
        if (tiles[i]) {
            tiles[i].textContent = item.word;
            tiles[i].className = 'conn-preview-word';
            if (item.word && item.word !== '?') {
                tiles[i].classList.add('conn-preview-word--filled');
            }
        }
    });
}

function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
}

function setupButtons() {
    document.getElementById('btnShufflePreview').addEventListener('click', updatePreview);
    document.getElementById('btnExportJson').addEventListener('click', exportFullJson);
    document.getElementById('btnImportJson').addEventListener('click', importFullJson);
    document.getElementById('btnSaveDraft').addEventListener('click', function() { savePuzzle('draft'); });
    document.getElementById('btnPublish').addEventListener('click', function() { savePuzzle('published'); });
}

function collectCategories() {
    return categories.map(function(cat) {
        return {
            name: cat.name,
            color: cat.color,
            words: cat.words.filter(function(w) { return w.trim() !== ''; })
        };
    });
}

function validatePuzzle() {
    for (var i = 0; i < 4; i++) {
        if (!categories[i].name.trim()) {
            showToast('Category ' + (i + 1) + ' needs a name');
            return false;
        }
        var filledWords = categories[i].words.filter(function(w) { return w.trim() !== ''; });
        if (filledWords.length !== 4) {
            showToast('Category "' + categories[i].name + '" needs exactly 4 words');
            return false;
        }
    }
    
    // Check for duplicate words
    var allWords = [];
    categories.forEach(function(cat) {
        cat.words.forEach(function(w) {
            if (w.trim()) allWords.push(w.trim().toUpperCase());
        });
    });
    var uniqueWords = new Set(allWords);
    if (uniqueWords.size !== 16) {
        showToast('All 16 words must be unique');
        return false;
    }
    
    return true;
}

function buildPuzzleData() {
    return {
        categories: collectCategories(),
        author: document.getElementById('authorName').value,
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
        if (data.categories && Array.isArray(data.categories)) {
            var colors = ['yellow', 'green', 'blue', 'purple'];
            data.categories.forEach(function(cat, i) {
                if (i < 4) {
                    categories[i].name = cat.name || '';
                    categories[i].color = colors[i];
                    for (var j = 0; j < 4; j++) {
                        categories[i].words[j] = (cat.words && cat.words[j]) ? cat.words[j].toUpperCase() : '';
                    }
                }
            });
            populateFormFromCategories();
            updatePreview();
        }
        if (data.author) {
            document.getElementById('authorName').value = data.author;
        }
        if (data.releaseDate) {
            document.getElementById('releaseDate').value = data.releaseDate;
        }
        showToast('Imported from JSON');
    } catch (err) {
        showToast('Invalid JSON');
    }
}

function populateFormFromCategories() {
    categories.forEach(function(cat, i) {
        var nameInput = document.querySelector('.conn-category-name[data-index="' + i + '"]');
        if (nameInput) nameInput.value = cat.name;
        
        cat.words.forEach(function(word, j) {
            var wordInput = document.querySelector('.conn-word-input[data-index="' + i + '"][data-word="' + j + '"]');
            if (wordInput) wordInput.value = word;
        });
    });
}

async function savePuzzle(status) {
    if (!validatePuzzle()) {
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
        await setDoc(doc(db, 'connections', docId), puzzleData);
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
        var q = query(collection(db, 'connections'), orderBy('releaseDate', 'desc'));
        var snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<span class="conn-release-chip conn-release-chip--empty">No releases yet</span>';
            return;
        }
        
        var html = '';
        snapshot.forEach(function(docSnap) {
            var data = docSnap.data();
            var isActive = docSnap.id === currentDocId;
            var statusClass = data.status === 'published' ? 'conn-release-chip--published' : '';
            var activeClass = isActive ? 'conn-release-chip--active' : '';
            html += '<a href="?date=' + encodeURIComponent(docSnap.id) + '" class="conn-release-chip ' + statusClass + ' ' + activeClass + '">';
            html += data.releaseDate || docSnap.id;
            html += '</a>';
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<span class="conn-release-chip conn-release-chip--error">Error loading</span>';
    }
}

async function loadPuzzle(docId) {
    try {
        var docSnap = await getDoc(doc(db, 'connections', docId));
        if (docSnap.exists()) {
            var data = docSnap.data();
            currentDocId = docId;
            
            if (data.categories && Array.isArray(data.categories)) {
                var colors = ['yellow', 'green', 'blue', 'purple'];
                data.categories.forEach(function(cat, i) {
                    if (i < 4) {
                        categories[i].name = cat.name || '';
                        categories[i].color = colors[i];
                        for (var j = 0; j < 4; j++) {
                            categories[i].words[j] = (cat.words && cat.words[j]) ? cat.words[j].toUpperCase() : '';
                        }
                    }
                });
                populateFormFromCategories();
            }
            
            if (data.author) {
                document.getElementById('authorName').value = data.author;
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
    toast.classList.add('conn-toast--visible');
    setTimeout(function() {
        toast.classList.remove('conn-toast--visible');
    }, 2500);
}

init();
