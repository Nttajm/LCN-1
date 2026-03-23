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
    var auth = firebase.auth();
    
    // Create auth check overlay
    var authOverlay = document.createElement('div');
    authOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; background: #0a0a0a; color: #e4e4e7; display: flex; align-items: center; justify-content: center; font-family: system-ui, sans-serif;';
    authOverlay.innerHTML = '<div style="text-align: center;"><h2>Authentication Required</h2><p>You need to sign in to access the home editor.</p><button id="auth-signin-btn" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">Sign In</button><button onclick="window.location.href=\'../index.html\'" style="padding: 8px 16px; background: transparent; color: #a1a1aa; border: 1px solid #3f3f46; border-radius: 4px; cursor: pointer;">Back to Home</button></div>';
    document.body.appendChild(authOverlay);
    
    // Wait for auth state
    auth.onAuthStateChanged(function(user) {
        if (user) {
            authOverlay.remove();
            initHomeEditor();
        } else {
            document.getElementById('auth-signin-btn').onclick = function() {
                var provider = new firebase.auth.GoogleAuthProvider();
                auth.signInWithPopup(provider).catch(function(err) {
                    alert('Sign in failed: ' + err.message);
                });
            };
        }
    });
    
    function initHomeEditor() {
        var db = firebase.firestore();
        var docsCol = db.collection('editor_docs');
        var layoutDoc = db.collection('home_layout').doc('current');

    var allDocs = {};
    var layout = {
        featured: [null],
        side: [null, null],
        recent: [null, null, null, null, null, null]
    };
    var activeSlot = null;

    var els = {
        publishBtn: document.getElementById('he-publish'),
        saveStatus: document.getElementById('he-save-status'),
        pickerOverlay: document.getElementById('he-picker-overlay'),
        pickerClose: document.getElementById('he-picker-close'),
        pickerSearch: document.getElementById('he-picker-search'),
        pickerCat: document.getElementById('he-picker-cat'),
        pickerList: document.getElementById('he-picker-list'),
        pickerClear: document.getElementById('he-picker-clear'),
        toast: document.getElementById('he-toast')
    };

    function showToast(msg, type) {
        els.toast.textContent = msg;
        els.toast.className = 'he-toast visible' + (type ? ' he-toast--' + type : '');
        clearTimeout(els.toast._t);
        els.toast._t = setTimeout(function () {
            els.toast.classList.remove('visible');
        }, 2600);
    }

    function formatDate(ts) {
        if (!ts) return '';
        var d = ts.toDate ? ts.toDate() : new Date(ts);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function getReadTime(html) {
        if (!html) return '1 min read';
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        var text = tmp.textContent || '';
        var words = text.trim().split(/\s+/).filter(function (w) { return w.length > 0; });
        var mins = Math.max(1, Math.ceil(words.length / 200));
        return mins + ' min read';
    }

    function parseSlotKey(slotAttr) {
        var parts = slotAttr.split('-');
        var idx = parseInt(parts.pop(), 10);
        var group = parts.join('-');
        return { group: group, index: idx };
    }

    function getDocImage(doc) {
        if (doc.images && doc.images.length > 0) {
            var src = doc.images[0];
            return src.startsWith('a_home_assets/') ? '../' + src : src;
        }
        return '';
    }

    function renderAllSlots() {
        document.querySelectorAll('.he-slot').forEach(function (slotEl) {
            var key = parseSlotKey(slotEl.getAttribute('data-slot'));
            var arr = layout[key.group];
            if (!arr) return;
            var docId = arr[key.index];
            var doc = docId ? allDocs[docId] : null;
            renderSlot(slotEl, doc, key);
        });
    }

    function renderSlot(slotEl, doc, key) {
        slotEl.innerHTML = '';
        var isRecent = key.group === 'recent';

        if (!doc) {
            var empty = document.createElement('div');
            empty.className = 'he-slot-empty';

            var plus = document.createElement('span');
            plus.className = 'he-slot-plus';
            plus.textContent = '+';

            var hint = document.createElement('span');
            hint.className = 'he-slot-hint';
            var labels = {
                hero: 'Hero Card',
                featured: 'Main Featured',
                side: 'Side Item',
                recent: 'Recent'
            };
            hint.textContent = (labels[key.group] || key.group) + ' ' + (key.index + 1);

            empty.appendChild(plus);
            empty.appendChild(hint);
            slotEl.appendChild(empty);
            return;
        }

        var filled = document.createElement('div');
        filled.className = 'he-slot-filled';

        var imgSrc = getDocImage(doc);
        if (imgSrc || !isRecent) {
            var imgWrap = document.createElement('div');
            imgWrap.className = 'he-slot-img';
            if (imgSrc) {
                var img = document.createElement('img');
                img.src = imgSrc;
                img.alt = '';
                imgWrap.appendChild(img);
            }
            filled.appendChild(imgWrap);
        }

        if (isRecent && imgSrc) {
            var thumbWrap = document.createElement('div');
            thumbWrap.className = 'he-slot-img';
            var thumbImg = document.createElement('img');
            thumbImg.src = imgSrc;
            thumbImg.alt = '';
            thumbWrap.appendChild(thumbImg);
            filled.innerHTML = '';
            filled.appendChild(thumbWrap);
        }

        var info = document.createElement('div');
        info.className = 'he-slot-info';

        var title = document.createElement('div');
        title.className = 'he-slot-info-title';
        title.textContent = doc.title || 'Untitled';
        info.appendChild(title);

        if (doc.category) {
            var cat = document.createElement('div');
            cat.className = 'he-slot-info-cat';
            cat.textContent = doc.category;
            info.appendChild(cat);
        }

        if (isRecent) {
            var date = document.createElement('div');
            date.className = 'he-slot-info-date';
            date.textContent = formatDate(doc.updatedAt);
            info.appendChild(date);
        }

        filled.appendChild(info);

        var removeBtn = document.createElement('button');
        removeBtn.className = 'he-slot-remove';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var k = parseSlotKey(slotEl.getAttribute('data-slot'));
            layout[k.group][k.index] = null;
            renderSlot(slotEl, null, k);
            saveLayout();
        });

        slotEl.appendChild(filled);
        slotEl.appendChild(removeBtn);
    }

    function openPicker(slotAttr) {
        activeSlot = slotAttr;
        els.pickerOverlay.classList.add('open');
        els.pickerSearch.value = '';
        els.pickerCat.value = '';
        renderPicker();
        setTimeout(function () { els.pickerSearch.focus(); }, 100);
    }

    function closePicker() {
        activeSlot = null;
        els.pickerOverlay.classList.remove('open');
    }

    function renderPicker() {
        var filter = (els.pickerSearch.value || '').toLowerCase();
        var catFilter = els.pickerCat.value;

        els.pickerList.innerHTML = '';

        var ids = Object.keys(allDocs).sort(function (a, b) {
            var da = allDocs[a].updatedAt || 0;
            var db = allDocs[b].updatedAt || 0;
            if (da && da.seconds) da = da.seconds;
            if (db && db.seconds) db = db.seconds;
            return db - da;
        });

        ids.forEach(function (id) {
            var doc = allDocs[id];
            if (!doc.published) return;
            if (catFilter && doc.category !== catFilter) return;
            if (filter && (doc.title || '').toLowerCase().indexOf(filter) === -1 &&
                (doc.category || '').toLowerCase().indexOf(filter) === -1) return;

            var item = document.createElement('div');
            item.className = 'he-picker-item';

            var imgSrc = getDocImage(doc);
            if (imgSrc) {
                var thumb = document.createElement('div');
                thumb.className = 'he-picker-item-thumb';
                var img = document.createElement('img');
                img.src = imgSrc;
                img.alt = '';
                thumb.appendChild(img);
                item.appendChild(thumb);
            } else {
                var noThumb = document.createElement('div');
                noThumb.className = 'he-picker-item-nothumb';
                noThumb.innerHTML = '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
                item.appendChild(noThumb);
            }

            var body = document.createElement('div');
            body.className = 'he-picker-item-body';

            var titleEl = document.createElement('div');
            titleEl.className = 'he-picker-item-title';
            titleEl.textContent = doc.title || 'Untitled';
            body.appendChild(titleEl);

            var meta = document.createElement('div');
            meta.className = 'he-picker-item-meta';
            if (doc.category) {
                var catSpan = document.createElement('span');
                catSpan.className = 'he-picker-item-meta-cat';
                catSpan.textContent = doc.category;
                meta.appendChild(catSpan);
            }
            var dateSpan = document.createElement('span');
            dateSpan.textContent = formatDate(doc.updatedAt);
            meta.appendChild(dateSpan);
            body.appendChild(meta);

            item.appendChild(body);

            item.addEventListener('click', function () {
                if (!activeSlot) return;
                var k = parseSlotKey(activeSlot);
                layout[k.group][k.index] = id;
                renderAllSlots();
                saveLayout();
                closePicker();
            });

            els.pickerList.appendChild(item);
        });

        if (els.pickerList.children.length === 0) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding:2rem;text-align:center;color:rgba(255,255,255,0.18);font-size:0.82rem;';
            empty.textContent = 'No published documents found';
            els.pickerList.appendChild(empty);
        }
    }

    function rebuildCatFilter() {
        var cats = {};
        Object.keys(allDocs).forEach(function (id) {
            if (allDocs[id].category) cats[allDocs[id].category] = true;
        });
        var current = els.pickerCat.value;
        els.pickerCat.innerHTML = '<option value="">All Categories</option>';
        Object.keys(cats).sort().forEach(function (c) {
            var opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            els.pickerCat.appendChild(opt);
        });
        if (current) els.pickerCat.value = current;
    }

    function saveLayout() {
        els.saveStatus.textContent = 'Saving...';
        var data = {
            featured: layout.featured,
            side: layout.side,
            recent: layout.recent,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        layoutDoc.set(data, { merge: true }).then(function () {
            els.saveStatus.textContent = 'Saved';
            setTimeout(function () { els.saveStatus.textContent = ''; }, 2000);
        }).catch(function () {
            els.saveStatus.textContent = '';
            showToast('Save failed', 'error');
        });
    }

    function loadLayout() {
        layoutDoc.get().then(function (snap) {
            if (snap.exists) {
                var d = snap.data();
                if (d.featured) layout.featured = d.featured;
                if (d.side) layout.side = d.side;
                if (d.recent) layout.recent = d.recent;
            }
            renderAllSlots();
        });
    }

    docsCol.onSnapshot(function (snap) {
        allDocs = {};
        snap.forEach(function (s) {
            allDocs[s.id] = s.data();
        });
        rebuildCatFilter();
        renderAllSlots();
    });

    document.querySelectorAll('.he-slot').forEach(function (slotEl) {
        slotEl.addEventListener('click', function (e) {
            if (e.target.closest('.he-slot-remove')) return;
            openPicker(slotEl.getAttribute('data-slot'));
        });
    });

    els.pickerClose.addEventListener('click', closePicker);
    els.pickerOverlay.addEventListener('click', function (e) {
        if (e.target === els.pickerOverlay) closePicker();
    });

    els.pickerSearch.addEventListener('input', renderPicker);
    els.pickerCat.addEventListener('change', renderPicker);

    els.pickerClear.addEventListener('click', function () {
        if (!activeSlot) return;
        var k = parseSlotKey(activeSlot);
        layout[k.group][k.index] = null;
        renderAllSlots();
        saveLayout();
        closePicker();
    });

    els.publishBtn.addEventListener('click', function () {
        saveLayout();
        showToast('Layout published', 'success');
    });

    loadLayout();
    
    } // End initHomeEditor function
})();
