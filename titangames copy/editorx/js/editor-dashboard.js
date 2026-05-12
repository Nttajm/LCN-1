import { db, collection, doc, getDocs, getDoc, query, orderBy } from './firebase-config.js';

const GAME_COLLECTIONS = {
    crossword: { collection: 'crosswords', name: 'Crossword', statusId: 'crosswordStatus' },
    nerdle:    { collection: 'nerdles',    name: 'Nerdle',    statusId: 'nerdleStatus' },
    relations: { collection: 'relations',  name: 'Relations', statusId: 'relationsStatus' }
};

function getTodayDateStr() {
    var d = new Date();
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

async function loadGameStats(gameKey) {
    var game = GAME_COLLECTIONS[gameKey];
    var statusEl = document.getElementById(game.statusId);
    if (!statusEl) return { published: 0, drafts: 0, releases: [] };

    var todayStr = getTodayDateStr();

    try {
        // Fetch today's specific doc AND the full collection list in parallel
        var results = await Promise.all([
            getDoc(doc(db, game.collection, todayStr)),
            getDocs(query(collection(db, game.collection), orderBy('releaseDate', 'desc')))
        ]);
        var todaySnap   = results[0];
        var allSnapshot = results[1];

        // Today’s puzzle status
        var todayStatus = todaySnap.exists() ? (todaySnap.data().status || 'draft') : null;

        // Aggregate counts across all docs
        var publishedCount = 0;
        var releases = [];
        allSnapshot.forEach(function (docSnap) {
            var data = docSnap.data();
            if (data.status === 'published') publishedCount++;
            releases.push(Object.assign({ id: docSnap.id, gameType: gameKey, gameName: game.name }, data));
        });

        // Today badge
        var todayBadge;
        if (todayStatus === 'published') {
            todayBadge = '<span class="eds-today eds-today--published">Today: Published</span>';
        } else if (todayStatus === 'draft') {
            todayBadge = '<span class="eds-today eds-today--draft">Today: Draft</span>';
        } else {
            todayBadge = '<span class="eds-today eds-today--missing">No puzzle today</span>';
        }

        // Totals line
        var totalsLine = allSnapshot.empty
            ? ''
            : '<span class="eds-totals">' + publishedCount + ' published &middot; ' +
              (allSnapshot.size - publishedCount) + ' drafts</span>';

        statusEl.innerHTML = todayBadge + totalsLine;

        return { published: publishedCount, drafts: allSnapshot.size - publishedCount, releases: releases };
    } catch (err) {
        statusEl.textContent = 'Error loading';
        return { published: 0, drafts: 0, releases: [] };
    }
}

async function loadAllGamesAndReleases() {
    var container = document.getElementById('recentReleases');
    
    try {
        // Load all games in parallel
        var [crosswordStats, nerdleStats, relationsStats] = await Promise.all([
            loadGameStats('crossword'),
            loadGameStats('nerdle'),
            loadGameStats('relations')
        ]);
        
        // Combine all releases and sort by date
        var allReleases = [
            ...crosswordStats.releases,
            ...nerdleStats.releases,
            ...relationsStats.releases
        ];
        
        allReleases.sort(function(a, b) {
            var dateA = a.releaseDate || a.id || '';
            var dateB = b.releaseDate || b.id || '';
            return dateB.localeCompare(dateA);
        });
        
        // Take the most recent 20
        allReleases = allReleases.slice(0, 20);
        
        if (allReleases.length === 0) {
            container.innerHTML = '<div class="editor-empty">No releases yet. Create your first puzzle.</div>';
            return;
        }
        
        var html = '';
        allReleases.forEach(function(release) {
            var dateStr = release.releaseDate || release.id;
            var editorPage = release.gameType + '.html';
            var sizeInfo = '';
            
            if (release.gameType === 'crossword') {
                sizeInfo = ' &middot; ' + (release.size || 5) + '&times;' + (release.size || 5);
            } else if (release.gameType === 'nerdle') {
                sizeInfo = ' &middot; 5 letters';
            } else if (release.gameType === 'relations') {
                sizeInfo = ' &middot; 4 groups';
            }
            
            html += '<a href="' + editorPage + '?date=' + encodeURIComponent(release.id) + '" class="editor-release-row">';
            html += '<span class="editor-release-date">' + escapeHtml(dateStr) + '</span>';
            html += '<span class="editor-release-game">' + release.gameName + sizeInfo + '</span>';
            html += '<span class="editor-release-status" data-status="' + (release.status || 'draft') + '">' + (release.status || 'draft') + '</span>';
            html += '</a>';
        });
        
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<div class="editor-empty">Could not load releases. Check your connection.</div>';
    }
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

loadAllGamesAndReleases();
