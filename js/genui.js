(function () {
    var firebaseConfig = {
        apiKey: "AIzaSyBh8O0qR9FjRz30Si3-xxToRaPe2vsK9wg",
        authDomain: "lcnfoundation-registry.firebaseapp.com",
        projectId: "lcnfoundation-registry",
        storageBucket: "lcnfoundation-registry.firebasestorage.app",
        messagingSenderId: "472081807534",
        appId: "1:472081807534:web:eed62912dd832743e4553f",
        measurementId: "G-FJB125MV97"
    };

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();

    var arrowSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H9M17 7v8"/></svg>';

    function getDocImage(doc) {
        if (doc.images && doc.images.length > 0) return doc.images[0];
        return 'a_home_assets/gradients/g_2_gray.jpg';
    }

    function formatDate(ts) {
        if (!ts) return '';
        var d = ts.toDate ? ts.toDate() : new Date(ts);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function getReadTime(doc) {
        if (!doc.content) return '1 min read';
        var tmp = document.createElement('div');
        tmp.innerHTML = doc.content;
        var text = tmp.textContent || '';
        var words = text.trim().split(/\s+/).filter(function (w) { return w.length > 0; });
        return Math.max(1, Math.ceil(words.length / 200)) + ' min read';
    }

    function buildFeaturedCont(featuredIds, sideIds, docsMap) {
        var cont = document.createElement('div');
        cont.className = 'cont main-infos';

        var fDoc = featuredIds[0] ? docsMap[featuredIds[0]] : null;
        var featured = document.createElement('div');
        featured.className = 'mi-featured';

        if (fDoc) {
            var fLink = document.createElement('a');
            fLink.href = 'index/doc.html?v=' + encodeURIComponent(featuredIds[0]);
            fLink.className = 'mi-featured-link';
            fLink.innerHTML =
                '<div class="mi-featured-img cge"><img src="' + getDocImage(fDoc) + '" alt=""></div>' +
                '<div class="mi-featured-body">' +
                    '<h2 class="mi-featured-title">' + (fDoc.title || 'Untitled') + '</h2>' +
                    (fDoc.subDesc ? '<p class="mi-subdesc">' + fDoc.subDesc + '</p>' : '') +
                    '<div class="mi-meta">' +
                        '<span class="mi-cat">' + (fDoc.category || '') + '</span>' +
                        (fDoc.date ? '<span class="mi-date">' + fDoc.date + '</span>' : '') +
                        '<span class="mi-read">' + getReadTime(fDoc) + '</span>' +
                    '</div>' +
                '</div>';
            featured.appendChild(fLink);
        }

        var side = document.createElement('div');
        side.className = 'mi-side';

        sideIds.forEach(function (id) {
            var sDoc = id ? docsMap[id] : null;
            if (!sDoc) return;
            var el = document.createElement('a');
            el.href = 'index/doc.html?v=' + encodeURIComponent(id);
            el.className = 'mi-sitem';
            el.innerHTML =
                '<div class="mi-sitem-img cge"><img src="' + getDocImage(sDoc) + '" alt=""></div>' +
                '<div class="mi-sitem-body">' +
                    '<h3 class="mi-sitem-title">' + (sDoc.title || 'Untitled') + '</h3>' +
                    (sDoc.subDesc ? '<p class="mi-subdesc">' + sDoc.subDesc + '</p>' : '') +
                    '<div class="mi-meta">' +
                        '<span class="mi-cat">' + (sDoc.category || '') + '</span>' +
                        (sDoc.date ? '<span class="mi-date">' + sDoc.date + '</span>' : '') +
                        '<span class="mi-read">' + getReadTime(sDoc) + '</span>' +
                    '</div>' +
                '</div>';
            side.appendChild(el);
        });

        cont.appendChild(featured);
        cont.appendChild(side);
        return cont;
    }

    function buildRecentsCont(recentIds, docsMap) {
        var cont = document.createElement('div');
        cont.className = 'cont';

        var header = document.createElement('div');
        header.className = 'recents-header';
        header.innerHTML = '<span class="recents-label">Recents</span><a href="#" class="recents-viewmore">View all</a>';

        var grid = document.createElement('div');
        grid.className = 'recents-grid';

        recentIds.forEach(function (id) {
            var rDoc = id ? docsMap[id] : null;
            if (!rDoc) return;
            var el = document.createElement('a');
            el.href = 'index/doc.html?v=' + encodeURIComponent(id);
            el.className = 'ritem';
            el.innerHTML =
                '<div class="cge medium"><img src="' + getDocImage(rDoc) + '" alt=""></div>' +
                '<div class="ritem-info">' +
                    '<h3 class="ritem-title">' + (rDoc.title || 'Untitled') + '</h3>' +
                    (rDoc.subDesc ? '<p class="ritem-subdesc">' + rDoc.subDesc + '</p>' : '') +
                    '<div class="ritem-meta">' +
                        '<span class="ritem-cat">' + (rDoc.category || '') + '</span>' +
                        '<span class="ritem-date">' + (rDoc.date || formatDate(rDoc.updatedAt)) + '</span>' +
                    '</div>' +
                '</div>';
            grid.appendChild(el);
        });

        cont.appendChild(header);
        cont.appendChild(grid);
        return cont;
    }

    db.collection('home_layout').doc('current').get().then(function (snap) {
        if (!snap.exists) return;
        var layout = snap.data();

        var allIds = [];
        ['featured', 'side', 'recent'].forEach(function (key) {
            if (layout[key]) {
                layout[key].forEach(function (id) {
                    if (id && allIds.indexOf(id) === -1) allIds.push(id);
                });
            }
        });

        if (allIds.length === 0) return;

        var docsMap = {};
        var fetches = allIds.map(function (id) {
            return db.collection('editor_docs').doc(id).get().then(function (docSnap) {
                if (docSnap.exists) docsMap[id] = docSnap.data();
            });
        });

        Promise.all(fetches).then(function () {
            var mainCont = document.getElementById('main-cont');
            if (!mainCont) return;

            if (layout.featured || layout.side) {
                mainCont.appendChild(buildFeaturedCont(layout.featured || [], layout.side || [], docsMap));
            }

            if (layout.recent) {
                mainCont.appendChild(buildRecentsCont(layout.recent, docsMap));
            }
        });
    });
})();
