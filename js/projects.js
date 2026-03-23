(function () {
    var firebaseConfig = {
        apiKey: 'AIzaSyBh8O0qR9FjRz30Si3-xxToRaPe2vsK9wg',
        authDomain: 'lcnfoundation-registry.firebaseapp.com',
        projectId: 'lcnfoundation-registry',
        storageBucket: 'lcnfoundation-registry.firebasestorage.app',
        messagingSenderId: '472081807534',
        appId: '1:472081807534:web:eed62912dd832743e4553f',
        measurementId: 'G-FJB125MV97'
    };

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();

    var list = document.getElementById('proj-list');
    var tabsEl = document.getElementById('proj-tabs');
    var viewBtns = document.querySelectorAll('.pg-view-btn');
    var activeFilter = 'all';

    function getDocImage(doc) {
        if (doc.images && doc.images.length > 0) {
            var img = doc.images[0];
            return img.startsWith('a_home_assets/') ? '../' + img : img;
        }
        return '../a_home_assets/gradients/g_2_gray.jpg';
    }

    function formatDate(ts) {
        if (!ts) return '';
        var d = ts.toDate ? ts.toDate() : new Date(ts);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function buildItem(id, doc) {
        var cat = doc.subCategory ? doc.subCategory.toLowerCase() : 'active';
        var dateStr = '';
        if (doc.date) {
            var d = new Date(doc.date);
            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            dateStr = months[d.getMonth()] + ' ' + (d.getDate() + 1) + ', ' + d.getFullYear();
        } else if (doc.updatedAt) {
            dateStr = formatDate(doc.updatedAt);
        }
        var item = document.createElement('a');
        item.className = 'proj-item';
        item.dataset.cat = cat;
        item.href = 'doc.html?v=' + encodeURIComponent(id);
        item.innerHTML =
            '<div class="proj-item-img"><img src="' + getDocImage(doc) + '" alt="' + (doc.title || '') + '"></div>' +
            '<div class="proj-item-body">' +
                '<div class="proj-item-meta">' +
                    '<span class="pg-item-cat">' + (doc.subCategory || 'Active') + '</span>' +
                    (dateStr ? '<span class="pg-item-date">' + dateStr + '</span>' : '') +
                '</div>' +
                '<h2 class="proj-item-title">' + (doc.title || 'Untitled') + '</h2>' +
                (doc.subDesc ? '<p class="pg-item-desc">' + doc.subDesc + '</p>' : '') +
            '</div>';
        return item;
    }

    function applyFilter() {
        list.querySelectorAll('.proj-item').forEach(function (item) {
            item.style.display = (activeFilter === 'all' || item.dataset.cat === activeFilter) ? '' : 'none';
        });
    }

    function buildTabs(cats) {
        tabsEl.innerHTML = '';
        var allBtn = document.createElement('button');
        allBtn.className = 'pg-tab active';
        allBtn.dataset.filter = 'all';
        allBtn.textContent = 'All';
        tabsEl.appendChild(allBtn);
        cats.forEach(function (cat) {
            var btn = document.createElement('button');
            btn.className = 'pg-tab';
            btn.dataset.filter = cat.toLowerCase();
            btn.textContent = cat;
            tabsEl.appendChild(btn);
        });
        tabsEl.querySelectorAll('.pg-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabsEl.querySelectorAll('.pg-tab').forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
                activeFilter = tab.dataset.filter;
                applyFilter();
            });
        });
    }

    viewBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            viewBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            list.classList.toggle('card-view', btn.dataset.view === 'card');
        });
    });

    db.collection('editor_docs')
        .where('category', '==', 'projects')
        .where('published', '==', true)
        .orderBy('updatedAt', 'desc')
        .get()
        .then(function (snap) {
            list.innerHTML = '';
            if (snap.empty) {
                list.innerHTML = '<p style="padding:3rem;text-align:center;color:#71717a;">No projects found.</p>';
                buildTabs([]);
                return;
            }
            var seen = [];
            snap.forEach(function (docSnap) {
                var data = docSnap.data();
                var cat = data.subCategory || 'Active';
                if (seen.indexOf(cat) === -1) seen.push(cat);
                list.appendChild(buildItem(docSnap.id, data));
            });
            buildTabs(seen);
        })
        .catch(function (err) {
            list.innerHTML = '<p style="padding:3rem;text-align:center;color:#71717a;">Failed to load projects.</p>';
            console.error(err);
        });
})();
