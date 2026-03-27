import { db, collection, getDocs, query, orderBy } from './firebase-config.js';

async function loadRecentReleases() {
    var container = document.getElementById('recentReleases');
    try {
        var q = query(collection(db, 'crosswords'), orderBy('releaseDate', 'desc'));
        var snapshot = await getDocs(q);
        if (snapshot.empty) {
            container.innerHTML = '<div class="editor-empty">No releases yet. Create your first crossword puzzle.</div>';
            document.getElementById('crosswordStatus').textContent = 'No releases';
            return;
        }
        var publishedCount = 0;
        var html = '';
        snapshot.forEach(function(docSnap) {
            var data = docSnap.data();
            if (data.status === 'published') publishedCount++;
            var dateStr = data.releaseDate || docSnap.id;
            html += '<a href="crossword.html?date=' + encodeURIComponent(docSnap.id) + '" class="editor-release-row">';
            html += '<span class="editor-release-date">' + escapeHtml(dateStr) + '</span>';
            html += '<span class="editor-release-game">Crossword &middot; ' + (data.size || 5) + '&times;' + (data.size || 5) + '</span>';
            html += '<span class="editor-release-status" data-status="' + (data.status || 'draft') + '">' + (data.status || 'draft') + '</span>';
            html += '</a>';
        });
        container.innerHTML = html;
        document.getElementById('crosswordStatus').textContent = publishedCount + ' published, ' + (snapshot.size - publishedCount) + ' drafts';
    } catch (err) {
        container.innerHTML = '<div class="editor-empty">Could not load releases. Check your connection.</div>';
        document.getElementById('crosswordStatus').textContent = 'Error loading';
    }
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

loadRecentReleases();
