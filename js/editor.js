(function () {
    const firebaseConfig = {
        apiKey: "AIzaSyBh8O0qR9FjRz30Si3-xxToRaPe2vsK9wg",
        authDomain: "lcnfoundation-registry.firebaseapp.com",
        projectId: "lcnfoundation-registry",
        storageBucket: "lcnfoundation-registry.firebasestorage.app",
        messagingSenderId: "472081807534",
        appId: "1:472081807534:web:eed62912dd832743e4553f",
        measurementId: "G-FJB125MV97"
    };

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    
    // Create auth check overlay
    const authOverlay = document.createElement('div');
    authOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;
        background: #0a0a0a; color: #e4e4e7; display: flex; align-items: center; justify-content: center;
        font-family: system-ui, sans-serif;
    `;
    authOverlay.innerHTML = `
        <div style="text-align: center;">
            <h2>Authentication Required</h2>
            <p>You need to sign in to access the editor.</p>
            <button id="auth-signin-btn" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">Sign In</button>
            <button onclick="window.location.href='../index.html'" style="padding: 8px 16px; background: transparent; color: #a1a1aa; border: 1px solid #3f3f46; border-radius: 4px; cursor: pointer;">Back to Home</button>
        </div>
    `;
    document.body.appendChild(authOverlay);
    
    // Wait for auth state
    auth.onAuthStateChanged(function(user) {
        if (user) {
            authOverlay.remove();
            initEditor();
        } else {
            // Show sign-in when clicked
            document.getElementById('auth-signin-btn').onclick = function() {
                const provider = new firebase.auth.GoogleAuthProvider();
                auth.signInWithPopup(provider).catch(err => {
                    alert('Sign in failed: ' + err.message);
                });
            };
        }
    });
    
    function initEditor() {
        const db = firebase.firestore();
        const docsCol = db.collection('editor_docs');
        const TS = function () { return firebase.firestore.FieldValue.serverTimestamp(); };

    let currentDocId = null;
    let docs = {};
    let categories = [];
    let subCategories = [];
    let autoSaveTimer = null;
    let lastSavedContent = '';

    const els = {
        docList: document.getElementById('ed-doclist'),
        filterInput: document.getElementById('ed-filter'),
        editor: document.getElementById('ed-editor'),
        titleInput: document.getElementById('ed-title'),
        subDescInput: document.getElementById('ed-subdesc'),
        goToUrlInput: document.getElementById('ed-goto-url'),
        dateInput: document.getElementById('ed-date'),
        catSelect: document.getElementById('ed-category'),
        catCustom: document.getElementById('ed-cat-custom'),
        subCatSelect: document.getElementById('ed-subcategory'),
        subCatCustom: document.getElementById('ed-subcat-custom'),
        imagesList: document.getElementById('ed-images-list'),
        addImageBtn: document.getElementById('ed-add-image'),
        topbarTitle: document.getElementById('ed-topbar-title'),
        topbarStatus: document.getElementById('ed-topbar-status'),
        wordCount: document.getElementById('ed-wordcount'),
        newDocBtn: document.getElementById('ed-new-doc'),
        saveBtn: document.getElementById('ed-save'),
        publishBtn: document.getElementById('ed-publish'),
        deleteBtn: document.getElementById('ed-delete'),
        editorView: document.getElementById('ed-editor-view'),
        emptyView: document.getElementById('ed-empty-view'),
        linkModal: document.getElementById('ed-link-modal'),
        deleteModal: document.getElementById('ed-delete-modal'),
        sidebar: document.getElementById('ed-sidebar'),
        mobileToggle: document.getElementById('ed-mobile-toggle'),
        mobileOverlay: document.getElementById('ed-mobile-overlay'),
        toast: document.getElementById('ed-toast')
    };

    function showToast(msg, type) {
        els.toast.textContent = msg;
        els.toast.className = 'ed-toast visible' + (type ? ' ed-toast--' + type : '');
        clearTimeout(els.toast._t);
        els.toast._t = setTimeout(function () {
            els.toast.classList.remove('visible');
        }, 2600);
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    function formatDate(ts) {
        if (!ts) return '';
        var d = ts.toDate ? ts.toDate() : new Date(ts);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function getWordCount(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html || '';
        var text = tmp.textContent || tmp.innerText || '';
        var words = text.trim().split(/\s+/).filter(function (w) { return w.length > 0; });
        return words.length;
    }

    function rebuildCategories() {
        var catSet = {};
        var subCatSet = {};
        Object.keys(docs).forEach(function (id) {
            if (docs[id].category) catSet[docs[id].category] = true;
            if (docs[id].subCategory) subCatSet[docs[id].subCategory] = true;
        });
        categories = Object.keys(catSet).sort();
        subCategories = Object.keys(subCatSet).sort();
        renderCategorySelect();
        renderSubCategorySelect();
    }

    function renderCategorySelect() {
        var current = els.catSelect.value;
        els.catSelect.innerHTML = '<option value="">None</option>';
        categories.forEach(function (cat) {
            var opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            els.catSelect.appendChild(opt);
        });
        var optNew = document.createElement('option');
        optNew.value = '__new__';
        optNew.textContent = '+ New category';
        els.catSelect.appendChild(optNew);
        if (current) els.catSelect.value = current;
    }

    function renderSubCategorySelect() {
        var current = els.subCatSelect.value;
        els.subCatSelect.innerHTML = '<option value="">None</option>';
        subCategories.forEach(function (sc) {
            var opt = document.createElement('option');
            opt.value = sc;
            opt.textContent = sc;
            els.subCatSelect.appendChild(opt);
        });
        var optNew = document.createElement('option');
        optNew.value = '__new__';
        optNew.textContent = '+ New sub category';
        els.subCatSelect.appendChild(optNew);
        if (current) els.subCatSelect.value = current;
    }

    function renderDocList(filter) {
        var fl = (filter || '').toLowerCase();
        var sorted = Object.keys(docs).sort(function (a, b) {
            return (docs[b].updatedAt || 0) - (docs[a].updatedAt || 0);
        });

        els.docList.innerHTML = '';
        sorted.forEach(function (id) {
            var doc = docs[id];
            if (fl && (doc.title || '').toLowerCase().indexOf(fl) === -1 &&
                (doc.category || '').toLowerCase().indexOf(fl) === -1) return;

            var item = document.createElement('div');
            item.className = 'ed-doc-item' + (id === currentDocId ? ' ed-doc-item--active' : '');
            item.setAttribute('data-id', id);

            var titleDiv = document.createElement('div');
            titleDiv.className = 'ed-doc-item-title';
            titleDiv.textContent = doc.title || 'Untitled';

            var metaDiv = document.createElement('div');
            metaDiv.className = 'ed-doc-item-meta';

            if (doc.category) {
                var catSpan = document.createElement('span');
                catSpan.className = 'ed-doc-item-cat';
                catSpan.textContent = doc.category;
                metaDiv.appendChild(catSpan);
            }

            var dateSpan = document.createElement('span');
            dateSpan.className = 'ed-doc-item-date';
            dateSpan.textContent = formatDate(doc.updatedAt);
            metaDiv.appendChild(dateSpan);

            var statusSpan = document.createElement('span');
            statusSpan.className = 'ed-doc-item-status ed-doc-item-status--' + (doc.published ? 'published' : 'draft');
            statusSpan.textContent = doc.published ? 'Published' : 'Draft';
            metaDiv.appendChild(statusSpan);

            item.appendChild(titleDiv);
            item.appendChild(metaDiv);

            item.addEventListener('click', function () {
                loadDoc(id);
                closeMobileSidebar();
            });

            els.docList.appendChild(item);
        });
    }

    function loadDoc(id) {
        if (currentDocId && currentDocId !== id) {
            saveCurrentDoc(true);
        }

        currentDocId = id;
        var doc = docs[id];
        if (!doc) return;

        els.editorView.style.display = 'flex';
        els.emptyView.style.display = 'none';

        els.titleInput.value = doc.title || '';
        els.subDescInput.value = doc.subDesc || '';
        els.goToUrlInput.value = doc.goToUrl || '';
        els.dateInput.value = doc.date || '';
        els.catSelect.value = doc.category || '';
        els.catCustom.style.display = 'none';
        els.catCustom.value = '';
        els.subCatSelect.value = doc.subCategory || '';
        els.subCatCustom.style.display = 'none';
        els.subCatCustom.value = '';
        els.editor.innerHTML = doc.content || '';
        lastSavedContent = doc.content || '';
        deselectEditorImage();

        renderImages(doc.images || []);
        updateTopbar(doc);
        updateWordCount();
        renderDocList(els.filterInput.value);
        rebindCharts();
    }

    function renderImages(images) {
        els.imagesList.innerHTML = '';
        images.forEach(function (url, i) {
            addImageRow(url, i);
        });
    }

    function addImageRow(url, index) {
        var isLocal = !!(url && url.startsWith('a_home_assets/'));
        var displayVal = isLocal ? url.replace(/^a_home_assets\//, '') : (url || '');

        var row = document.createElement('div');
        row.className = 'ed-image-entry';

        var localBtn = document.createElement('button');
        localBtn.type = 'button';
        localBtn.className = 'ed-image-local-btn' + (isLocal ? ' ed-image-local-btn--active' : '');
        localBtn.title = 'Toggle local path (from a_home_assets/)';
        localBtn.textContent = 'local';

        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = isLocal ? 'content/img.png' : 'https://example.com/image.jpg';
        input.value = displayVal;
        input.setAttribute('data-index', index !== undefined ? index : -1);

        var preview = document.createElement('div');
        preview.className = 'ed-image-preview';

        function updatePreview(val) {
            preview.innerHTML = '';
            if (val) {
                var src = localBtn.classList.contains('ed-image-local-btn--active')
                    ? '../a_home_assets/' + val
                    : val;
                var img = document.createElement('img');
                img.src = src;
                img.alt = '';
                img.onerror = function () { this.style.display = 'none'; };
                preview.appendChild(img);
            }
        }
        updatePreview(displayVal);

        localBtn.addEventListener('click', function () {
            isLocal = !isLocal;
            this.classList.toggle('ed-image-local-btn--active', isLocal);
            input.placeholder = isLocal ? 'content/img.png' : 'https://example.com/image.jpg';
            updatePreview(input.value.trim());
            scheduleAutoSave();
        });

        var remove = document.createElement('button');
        remove.className = 'ed-image-remove';
        remove.innerHTML = '&times;';
        remove.type = 'button';

        input.addEventListener('input', function () {
            updatePreview(this.value.trim());
            scheduleAutoSave();
        });

        remove.addEventListener('click', function () {
            row.remove();
            scheduleAutoSave();
        });

        row.appendChild(localBtn);
        row.appendChild(input);
        row.appendChild(preview);
        row.appendChild(remove);
        els.imagesList.appendChild(row);
    }

    function collectImages() {
        var imgs = [];
        var entries = els.imagesList.querySelectorAll('.ed-image-entry');
        entries.forEach(function (entry) {
            var inp = entry.querySelector('input');
            var btn = entry.querySelector('.ed-image-local-btn');
            var v = inp ? inp.value.trim() : '';
            if (v) {
                imgs.push(btn && btn.classList.contains('ed-image-local-btn--active')
                    ? 'a_home_assets/' + v
                    : v);
            }
        });
        return imgs;
    }

    function getCurrentDocData() {
        var cat = els.catSelect.value;
        if (cat === '__new__') {
            cat = els.catCustom.value.trim();
        }
        var subCat = els.subCatSelect.value;
        if (subCat === '__new__') {
            subCat = els.subCatCustom.value.trim();
        }
        return {
            title: els.titleInput.value.trim() || 'Untitled',
            subDesc: els.subDescInput.value.trim(),
            goToUrl: els.goToUrlInput.value.trim(),
            date: els.dateInput.value,
            category: cat,
            subCategory: subCat,
            content: getEditorHtmlForSave(),
            images: collectImages(),
            updatedAt: TS()
        };
    }

    function saveCurrentDoc(silent) {
        if (!currentDocId) return;
        var data = getCurrentDocData();
        docsCol.doc(currentDocId).update(data).then(function () {
            lastSavedContent = data.content;
            setStatus('saved');
            if (!silent) showToast('Saved', 'success');
        }).catch(function () {
            setStatus('');
            if (!silent) showToast('Save failed', 'error');
        });
        setStatus('saving');
    }

    function scheduleAutoSave() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(function () {
            if (currentDocId) saveCurrentDoc(true);
        }, 1500);
    }

    function setStatus(state) {
        if (state === 'saving') {
            els.topbarStatus.textContent = 'Saving...';
            els.topbarStatus.className = 'ed-topbar-status ed-topbar-status--saving';
        } else if (state === 'saved') {
            els.topbarStatus.textContent = 'Saved';
            els.topbarStatus.className = 'ed-topbar-status ed-topbar-status--saved';
        } else {
            els.topbarStatus.textContent = '';
            els.topbarStatus.className = 'ed-topbar-status';
        }
    }

    function updateTopbar(doc) {
        els.topbarTitle.textContent = doc.title || 'Untitled';
    }

    function updateWordCount() {
        var count = getWordCount(els.editor.innerHTML);
        els.wordCount.textContent = count + ' word' + (count !== 1 ? 's' : '');
    }

    function newDoc() {
        var id = generateId();
        var data = {
            title: 'Untitled',
            subDesc: '',
            goToUrl: '',
            date: '',
            category: '',
            subCategory: '',
            content: '',
            images: [],
            published: false,
            createdAt: TS(),
            updatedAt: TS()
        };
        docsCol.doc(id).set(data).then(function () {
            loadDoc(id);
            showToast('New document created', 'success');
        });
    }

    function deleteCurrentDoc() {
        if (!currentDocId) return;
        var id = currentDocId;
        docsCol.doc(id).delete().then(function () {
            currentDocId = null;
            els.editorView.style.display = 'none';
            els.emptyView.style.display = 'flex';
            closeModal('ed-delete-modal');
            showToast('Document deleted', 'success');
        });
    }

    function publishCurrentDoc() {
        if (!currentDocId) return;
        var data = getCurrentDocData();
        data.published = true;
        docsCol.doc(currentDocId).update(data).then(function () {
            showToast('Published', 'success');
        });
    }

    function unpublishCurrentDoc() {
        if (!currentDocId) return;
        docsCol.doc(currentDocId).update({ published: false }).then(function () {
            showToast('Unpublished', 'success');
        });
    }

    function execCmd(cmd, value) {
        document.execCommand(cmd, false, value || null);
        els.editor.focus();
        scheduleAutoSave();
    }

    function insertLink(url, text, isGoto) {
        els.editor.focus();
        var sel = window.getSelection();
        if (!sel.rangeCount) return;

        var range = sel.getRangeAt(0);
        range.deleteContents();

        if (isGoto) {
            var a = document.createElement('a');
            a.href = url;
            a.className = 'ed-goto-link';
            a.target = '_blank';
            a.rel = 'noopener';
            a.contentEditable = 'false';
            a.innerHTML = (text || url) +
                ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M7 17L17 7M17 7H9M17 7v8"/></svg>';
            range.insertNode(a);
            var space = document.createTextNode('\u00A0');
            a.parentNode.insertBefore(space, a.nextSibling);
            range.setStartAfter(space);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        } else {
            var link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = text || url;
            range.insertNode(link);
            range.setStartAfter(link);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        scheduleAutoSave();
    }

    var lastEditorRange = null;

    function isRangeInEditor(range) {
        if (!range) return false;
        var node = range.commonAncestorContainer;
        return node === els.editor || els.editor.contains(node);
    }

    function saveEditorSelection() {
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;

        var range = sel.getRangeAt(0);
        if (isRangeInEditor(range)) {
            lastEditorRange = range.cloneRange();
        }
    }

    function getEditorInsertionRange() {
        var sel = window.getSelection();
        if (sel && sel.rangeCount) {
            var currentRange = sel.getRangeAt(0);
            if (isRangeInEditor(currentRange)) {
                lastEditorRange = currentRange.cloneRange();
                return currentRange.cloneRange();
            }
        }

        if (lastEditorRange && isRangeInEditor(lastEditorRange)) {
            return lastEditorRange.cloneRange();
        }

        var bottomRange = document.createRange();
        bottomRange.selectNodeContents(els.editor);
        bottomRange.collapse(false);
        return bottomRange;
    }

    function setEditorSelection(range) {
        if (!range) return;
        var sel = window.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(range);
        saveEditorSelection();
    }

    document.addEventListener('selectionchange', saveEditorSelection);

    function insertImageInEditor(url, width) {
        var range = getEditorInsertionRange();
        els.editor.focus();
        range.deleteContents();
        var img = document.createElement('img');
        img.src = url;
        img.alt = '';
        if (width && width >= 50) {
            img.style.width = width + 'px';
            img.style.height = 'auto';
        }
        range.insertNode(img);
        range.setStartAfter(img);
        range.collapse(true);
        setEditorSelection(range);
        selectEditorImage(img);
        scheduleAutoSave();
    }

    // ─── In-editor image resize ────────────────────────────────────────────────
    var selectedEditorImg = null;
    var imgResizeDragging = false;

    var imgResizeEls = {
        bar: document.getElementById('ed-toolbar-img-resize'),
        widthInput: document.getElementById('ed-img-resize-width'),
        resetBtn: document.getElementById('ed-img-resize-reset'),
        overlay: document.getElementById('ed-img-resize-overlay'),
        handle: document.getElementById('ed-img-resize-handle'),
        wrap: document.querySelector('.ed-editor-wrap')
    };

    function getEditorImageWidth(img) {
        if (!img) return '';
        var w = parseInt(img.style.width, 10);
        if (w) return w;
        return Math.round(img.getBoundingClientRect().width) || '';
    }

    function applyEditorImageWidth(img, width) {
        if (!img) return;
        if (width && width >= 50) {
            img.style.width = width + 'px';
            img.style.height = 'auto';
            img.style.maxWidth = '100%';
        } else {
            img.style.removeProperty('width');
            img.style.removeProperty('height');
        }
        positionImageResizeOverlay();
        if (imgResizeEls.widthInput) {
            imgResizeEls.widthInput.value = width && width >= 50 ? width : '';
        }
        scheduleAutoSave();
    }

    function positionImageResizeOverlay() {
        if (!selectedEditorImg || !imgResizeEls.overlay || !imgResizeEls.wrap) {
            if (imgResizeEls.overlay) imgResizeEls.overlay.hidden = true;
            return;
        }

        var wrapRect = imgResizeEls.wrap.getBoundingClientRect();
        var imgRect = selectedEditorImg.getBoundingClientRect();

        imgResizeEls.overlay.hidden = false;
        imgResizeEls.overlay.style.left = (imgRect.left - wrapRect.left + imgResizeEls.wrap.scrollLeft) + 'px';
        imgResizeEls.overlay.style.top = (imgRect.top - wrapRect.top + imgResizeEls.wrap.scrollTop) + 'px';
        imgResizeEls.overlay.style.width = imgRect.width + 'px';
        imgResizeEls.overlay.style.height = imgRect.height + 'px';
    }

    function selectEditorImage(img) {
        if (!img || img.tagName !== 'IMG') return;
        if (selectedEditorImg === img) return;

        deselectEditorImage(false);
        selectedEditorImg = img;
        img.classList.add('ed-editor-img--selected');

        if (imgResizeEls.bar) imgResizeEls.bar.hidden = false;
        if (imgResizeEls.widthInput) {
            imgResizeEls.widthInput.value = getEditorImageWidth(img);
        }
        positionImageResizeOverlay();
    }

    function deselectEditorImage(clearSelection) {
        if (selectedEditorImg) {
            selectedEditorImg.classList.remove('ed-editor-img--selected');
            selectedEditorImg = null;
        }
        if (imgResizeEls.bar) imgResizeEls.bar.hidden = true;
        if (imgResizeEls.overlay) imgResizeEls.overlay.hidden = true;
        if (clearSelection !== false) {
            var sel = window.getSelection();
            if (sel) sel.removeAllRanges();
        }
    }

    function applyEditorImagePercent(percent) {
        if (!selectedEditorImg) return;
        var natural = selectedEditorImg.naturalWidth;
        if (!natural) {
            selectedEditorImg.onload = function () {
                applyEditorImagePercent(percent);
            };
            return;
        }
        applyEditorImageWidth(selectedEditorImg, Math.round(natural * percent / 100));
    }

    els.editor.addEventListener('click', function (e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            selectEditorImage(e.target);
        } else if (selectedEditorImg) {
            deselectEditorImage(false);
            saveEditorSelection();
        } else {
            saveEditorSelection();
        }
    });

    els.editor.addEventListener('keyup', saveEditorSelection);
    els.editor.addEventListener('mouseup', saveEditorSelection);
    els.editor.addEventListener('focus', saveEditorSelection);

    document.addEventListener('click', function (e) {
        if (imgResizeDragging) return;
        if (selectedEditorImg && !els.editor.contains(e.target) &&
            !(imgResizeEls.bar && imgResizeEls.bar.contains(e.target)) &&
            !(imgResizeEls.overlay && imgResizeEls.overlay.contains(e.target))) {
            deselectEditorImage();
        }
    });

    if (imgResizeEls.widthInput) {
        imgResizeEls.widthInput.addEventListener('input', function () {
            if (!selectedEditorImg) return;
            var w = parseInt(this.value, 10);
            if (this.value === '') {
                applyEditorImageWidth(selectedEditorImg, 0);
            } else if (w >= 50) {
                applyEditorImageWidth(selectedEditorImg, w);
            }
        });
    }

    if (imgResizeEls.resetBtn) {
        imgResizeEls.resetBtn.addEventListener('click', function () {
            applyEditorImageWidth(selectedEditorImg, 0);
        });
    }

    document.querySelectorAll('.ed-toolbar-img-preset').forEach(function (btn) {
        btn.addEventListener('click', function () {
            applyEditorImagePercent(parseInt(this.getAttribute('data-preset'), 10));
        });
    });

    if (imgResizeEls.handle) {
        imgResizeEls.handle.addEventListener('mousedown', function (e) {
            if (!selectedEditorImg) return;
            e.preventDefault();
            e.stopPropagation();
            imgResizeDragging = true;
            var startX = e.clientX;
            var startW = selectedEditorImg.getBoundingClientRect().width;

            function onMove(ev) {
                var next = Math.max(50, Math.min(2000, Math.round(startW + (ev.clientX - startX))));
                applyEditorImageWidth(selectedEditorImg, next);
            }

            function onUp() {
                imgResizeDragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    window.addEventListener('resize', positionImageResizeOverlay);
    els.editor.addEventListener('scroll', positionImageResizeOverlay, true);

    function openModal(id) {
        document.getElementById(id).classList.add('open');
    }

    function closeModal(id) {
        document.getElementById(id).classList.remove('open');
    }

    function closeMobileSidebar() {
        els.sidebar.classList.remove('mobile-open');
        els.mobileOverlay.classList.remove('open');
    }

    docsCol.onSnapshot(function (snap) {
        docs = {};
        snap.forEach(function (docSnap) {
            docs[docSnap.id] = docSnap.data();
        });
        rebuildCategories();
        renderDocList(els.filterInput.value);
        if (currentDocId && docs[currentDocId]) {
            updateTopbar(docs[currentDocId]);
        }
    });

    els.filterInput.addEventListener('input', function () {
        renderDocList(this.value);
    });

    els.newDocBtn.addEventListener('click', newDoc);

    els.saveBtn.addEventListener('click', function () {
        saveCurrentDoc(false);
    });

    els.publishBtn.addEventListener('click', function () {
        if (!currentDocId) return;
        if (docs[currentDocId] && docs[currentDocId].published) {
            unpublishCurrentDoc();
        } else {
            publishCurrentDoc();
        }
    });

    els.deleteBtn.addEventListener('click', function () {
        if (!currentDocId) return;
        openModal('ed-delete-modal');
    });

    document.getElementById('ed-delete-confirm').addEventListener('click', deleteCurrentDoc);
    document.getElementById('ed-delete-cancel').addEventListener('click', function () {
        closeModal('ed-delete-modal');
    });

    els.catSelect.addEventListener('change', function () {
        if (this.value === '__new__') {
            els.catCustom.style.display = 'block';
            els.catCustom.focus();
        } else {
            els.catCustom.style.display = 'none';
        }
        scheduleAutoSave();
    });

    els.catCustom.addEventListener('input', function () {
        scheduleAutoSave();
    });

    els.subCatSelect.addEventListener('change', function () {
        if (this.value === '__new__') {
            els.subCatCustom.style.display = 'block';
            els.subCatCustom.focus();
        } else {
            els.subCatCustom.style.display = 'none';
        }
        scheduleAutoSave();
    });

    els.subCatCustom.addEventListener('input', function () {
        scheduleAutoSave();
    });

    els.titleInput.addEventListener('input', function () {
        scheduleAutoSave();
    });

    els.subDescInput.addEventListener('input', function () {
        scheduleAutoSave();
    });

    els.goToUrlInput.addEventListener('input', function () {
        scheduleAutoSave();
    });

    els.dateInput.addEventListener('change', function () {
        scheduleAutoSave();
    });

    els.addImageBtn.addEventListener('click', function () {
        addImageRow('');
    });

    els.editor.addEventListener('input', function () {
        updateWordCount();
        scheduleAutoSave();
    });

    els.editor.addEventListener('paste', function (e) {
        e.preventDefault();
        var html = e.clipboardData.getData('text/html');
        var text = e.clipboardData.getData('text/plain');

        if (html) {
            var tmp = document.createElement('div');
            tmp.innerHTML = html;

            tmp.querySelectorAll('script, style, meta, link').forEach(function (el) {
                el.remove();
            });

            tmp.querySelectorAll('*').forEach(function (el) {
                var tag = el.tagName.toLowerCase();
                var allowed = ['p','br','b','strong','i','em','u','a','h1','h2','h3',
                               'ul','ol','li','blockquote','pre','code','img','hr','span','div'];
                if (allowed.indexOf(tag) === -1) {
                    var frag = document.createDocumentFragment();
                    while (el.firstChild) frag.appendChild(el.firstChild);
                    el.parentNode.replaceChild(frag, el);
                }
            });

            tmp.querySelectorAll('*').forEach(function (el) {
                var tag = el.tagName.toLowerCase();
                if (tag === 'img') {
                    var w = el.style.width;
                    var h = el.style.height;
                    el.removeAttribute('style');
                    el.removeAttribute('class');
                    el.removeAttribute('id');
                    if (w) el.style.width = w;
                    if (h) el.style.height = h;
                    return;
                }
                el.removeAttribute('style');
                el.removeAttribute('class');
                el.removeAttribute('id');
            });

            tmp.querySelectorAll('a').forEach(function (a) {
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener');
            });

            document.execCommand('insertHTML', false, tmp.innerHTML);
        } else if (text) {
            document.execCommand('insertText', false, text);
        }
        scheduleAutoSave();
        saveEditorSelection();
    });

    document.querySelectorAll('.ed-toolbar-btn[data-cmd]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var cmd = this.getAttribute('data-cmd');
            var val = this.getAttribute('data-value') || null;
            execCmd(cmd, val);
        });
    });

    var headingDropdown = document.getElementById('ed-heading-dropdown');
    var headingToggle = document.getElementById('ed-heading-toggle');
    if (headingToggle && headingDropdown) {
        headingToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            headingDropdown.classList.toggle('open');
        });
        headingDropdown.querySelectorAll('.ed-toolbar-dropdown-item').forEach(function (item) {
            item.addEventListener('click', function () {
                var tag = this.getAttribute('data-tag');
                execCmd('formatBlock', tag);
                headingDropdown.classList.remove('open');
            });
        });
    }

    document.addEventListener('click', function () {
        document.querySelectorAll('.ed-toolbar-dropdown-menu.open').forEach(function (m) {
            m.classList.remove('open');
        });
    });

    document.getElementById('ed-insert-link-btn').addEventListener('click', function () {
        openModal('ed-link-modal');
        document.getElementById('ed-link-url').value = '';
        document.getElementById('ed-link-text').value = '';
        activateLinkTab('standard');
    });

    document.getElementById('ed-insert-image-btn').addEventListener('mousedown', saveEditorSelection);

    document.getElementById('ed-insert-image-btn').addEventListener('click', function () {
        openModal('ed-img-modal');
        document.getElementById('ed-img-url').value = '';
        document.getElementById('ed-img-insert-width').value = '';
        activateImgTab('url');
        setTimeout(function () { document.getElementById('ed-img-url').focus(); }, 50);
    });

    var imgTabs = document.querySelectorAll('[data-img-type]');
    var currentImgType = 'url';

    function activateImgTab(type) {
        currentImgType = type;
        imgTabs.forEach(function (tab) {
            tab.classList.toggle('ed-link-type-tab--active', tab.getAttribute('data-img-type') === type);
        });
        var label = document.getElementById('ed-img-label');
        var input = document.getElementById('ed-img-url');
        if (type === 'local') {
            label.textContent = 'Path from a_home_assets/';
            input.placeholder = 'content/img.png';
        } else {
            label.textContent = 'Image URL';
            input.placeholder = 'https://';
        }
    }

    imgTabs.forEach(function (tab) {
        tab.addEventListener('click', function () { activateImgTab(this.getAttribute('data-img-type')); });
    });

    document.getElementById('ed-img-insert').addEventListener('click', function () {
        var val = document.getElementById('ed-img-url').value.trim();
        var width = parseInt(document.getElementById('ed-img-insert-width').value, 10);
        closeModal('ed-img-modal');
        if (!val) return;
        var src = currentImgType === 'local' ? '../a_home_assets/' + val : val;
        insertImageInEditor(src, width >= 50 ? width : 0);
    });

    document.getElementById('ed-img-cancel').addEventListener('click', function () {
        closeModal('ed-img-modal');
    });

    document.getElementById('ed-img-modal').addEventListener('click', function (e) {
        if (e.target === this) closeModal('ed-img-modal');
    });

    // ─── Picture Browser ───────────────────────────────────────────────────────
    var picManifest = null;
    var picCurrentFolder = '';
    var picSelectedImage = null;
    var picInsertMode = 'editor'; // 'editor' or 'list'

    var picEls = {
        modal: document.getElementById('ed-pic-modal'),
        folders: document.getElementById('ed-pic-folders'),
        search: document.getElementById('ed-pic-search'),
        grid: document.getElementById('ed-pic-grid'),
        empty: document.getElementById('ed-pic-empty'),
        preview: document.getElementById('ed-pic-preview'),
        width: document.getElementById('ed-pic-width'),
        insertBtn: document.getElementById('ed-pic-insert'),
        cancelBtn: document.getElementById('ed-pic-cancel'),
        closeBtn: document.getElementById('ed-pic-close'),
        browseBtn: document.getElementById('ed-browse-images')
    };

    function loadPicManifest() {
        if (picManifest) return Promise.resolve(picManifest);
        return fetch('../a_home_assets/manifest.json')
            .then(function (res) {
                if (!res.ok) throw new Error('Manifest not found');
                return res.json();
            })
            .then(function (data) {
                picManifest = data;
                return data;
            })
            .catch(function () {
                picManifest = { folders: [], images: [] };
                return picManifest;
            });
    }

    function renderPicFolders() {
        var html = '<button class="ed-pic-folder-btn' + (picCurrentFolder === '' ? ' ed-pic-folder-btn--active' : '') + '" data-folder="">All</button>';
        (picManifest.folders || []).forEach(function (folder) {
            var isActive = picCurrentFolder === folder;
            html += '<button class="ed-pic-folder-btn' + (isActive ? ' ed-pic-folder-btn--active' : '') + '" data-folder="' + folder + '">' + folder + '</button>';
        });
        picEls.folders.innerHTML = html;

        picEls.folders.querySelectorAll('.ed-pic-folder-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                picCurrentFolder = this.getAttribute('data-folder');
                renderPicFolders();
                renderPicGrid();
            });
        });
    }

    function filterImages() {
        var images = picManifest.images || [];
        var query = (picEls.search.value || '').toLowerCase().trim();

        return images.filter(function (img) {
            if (picCurrentFolder && img.folder !== picCurrentFolder) return false;
            if (query && img.name.toLowerCase().indexOf(query) === -1) return false;
            return true;
        });
    }

    function renderPicGrid() {
        var images = filterImages();

        if (images.length === 0) {
            picEls.grid.innerHTML = '';
            picEls.empty.style.display = 'flex';
            return;
        }

        picEls.empty.style.display = 'none';
        var html = '';
        images.forEach(function (img) {
            var isSelected = picSelectedImage && picSelectedImage.path === img.path;
            html += '<div class="ed-pic-thumb' + (isSelected ? ' ed-pic-thumb--selected' : '') + '" data-path="' + img.path + '">';
            html += '<img src="../a_home_assets/' + img.path + '" alt="' + img.name + '" loading="lazy">';
            html += '<span class="ed-pic-thumb-name">' + img.name + '</span>';
            html += '</div>';
        });
        picEls.grid.innerHTML = html;

        picEls.grid.querySelectorAll('.ed-pic-thumb').forEach(function (thumb) {
            thumb.addEventListener('click', function () {
                var path = this.getAttribute('data-path');
                selectPicImage(path);
            });
        });
    }

    function selectPicImage(path) {
        var img = (picManifest.images || []).find(function (i) { return i.path === path; });
        if (!img) return;

        picSelectedImage = img;

        picEls.grid.querySelectorAll('.ed-pic-thumb').forEach(function (thumb) {
            thumb.classList.toggle('ed-pic-thumb--selected', thumb.getAttribute('data-path') === path);
        });

        picEls.preview.innerHTML = '<img src="../a_home_assets/' + img.path + '" alt="">' +
            '<div class="ed-pic-preview-info">' +
            '<span class="ed-pic-preview-name">' + img.name + '</span>' +
            '<span class="ed-pic-preview-path">' + img.path + '</span>' +
            '</div>';

        picEls.insertBtn.disabled = false;
    }

    function resetPicBrowser() {
        picSelectedImage = null;
        picCurrentFolder = '';
        picEls.search.value = '';
        picEls.width.value = '';
        picEls.insertBtn.disabled = true;
        picEls.preview.innerHTML = '<span class="ed-pic-preview-placeholder">Select an image</span>';
    }

    function openPicBrowser(mode) {
        picInsertMode = mode || 'editor';
        resetPicBrowser();
        openModal('ed-pic-modal');

        loadPicManifest().then(function () {
            renderPicFolders();
            renderPicGrid();
        });
    }

    function closePicBrowser() {
        closeModal('ed-pic-modal');
    }

    function insertPicImage() {
        if (!picSelectedImage) return;

        var src = '../a_home_assets/' + picSelectedImage.path;
        var width = parseInt(picEls.width.value, 10);

        if (picInsertMode === 'list') {
            var localPath = picSelectedImage.path;
            addImageRow('a_home_assets/' + localPath);
            scheduleAutoSave();
        } else {
            insertImageInEditor(src, width >= 50 ? width : 0);
        }

        closePicBrowser();
    }

    picEls.search.addEventListener('input', function () {
        renderPicGrid();
    });

    picEls.insertBtn.addEventListener('click', insertPicImage);
    picEls.cancelBtn.addEventListener('click', closePicBrowser);
    picEls.closeBtn.addEventListener('click', closePicBrowser);

    picEls.modal.addEventListener('click', function (e) {
        if (e.target === this) closePicBrowser();
    });

    if (picEls.browseBtn) {
        picEls.browseBtn.addEventListener('mousedown', saveEditorSelection);
        picEls.browseBtn.addEventListener('click', function () {
            openPicBrowser('list');
        });
    }

    // Update image tab to handle 'browse' type
    imgTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            var type = this.getAttribute('data-img-type');
            if (type === 'browse') {
                closeModal('ed-img-modal');
                openPicBrowser('editor');
            } else {
                activateImgTab(type);
            }
        });
    });

    document.getElementById('ed-insert-hr-btn').addEventListener('click', function () {
        execCmd('insertHorizontalRule');
    });

    var linkTabs = document.querySelectorAll('.ed-link-type-tab');
    var currentLinkType = 'standard';

    function activateLinkTab(type) {
        currentLinkType = type;
        linkTabs.forEach(function (tab) {
            tab.classList.toggle('ed-link-type-tab--active', tab.getAttribute('data-type') === type);
        });
    }

    linkTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            activateLinkTab(this.getAttribute('data-type'));
        });
    });

    document.getElementById('ed-link-insert').addEventListener('click', function () {
        var url = document.getElementById('ed-link-url').value.trim();
        var text = document.getElementById('ed-link-text').value.trim();
        if (!url) return;
        insertLink(url, text, currentLinkType === 'goto');
        closeModal('ed-link-modal');
    });

    document.getElementById('ed-link-cancel').addEventListener('click', function () {
        closeModal('ed-link-modal');
    });

    els.editor.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            execCmd('insertText', '    ');
        }
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') { e.preventDefault(); execCmd('bold'); }
            if (e.key === 'i') { e.preventDefault(); execCmd('italic'); }
            if (e.key === 'u') { e.preventDefault(); execCmd('underline'); }
            if (e.key === 's') { e.preventDefault(); saveCurrentDoc(false); }
            if (e.key === 'k') {
                e.preventDefault();
                openModal('ed-link-modal');
                document.getElementById('ed-link-url').value = '';
                document.getElementById('ed-link-text').value = '';
                activateLinkTab('standard');
            }
        }
    });

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveCurrentDoc(false);
        }
    });

    if (els.mobileToggle) {
        els.mobileToggle.addEventListener('click', function () {
            els.sidebar.classList.toggle('mobile-open');
            els.mobileOverlay.classList.toggle('open');
        });
    }

    if (els.mobileOverlay) {
        els.mobileOverlay.addEventListener('click', closeMobileSidebar);
    }

    document.getElementById('ed-code-btn').addEventListener('click', function () {
        var sel = window.getSelection();
        if (sel.rangeCount) {
            var range = sel.getRangeAt(0);
            var text = range.toString();
            if (text.indexOf('\n') !== -1 || text.length > 60) {
                var pre = document.createElement('pre');
                var code = document.createElement('code');
                code.textContent = text;
                pre.appendChild(code);
                range.deleteContents();
                range.insertNode(pre);
            } else {
                var codeEl = document.createElement('code');
                codeEl.textContent = text || '\u200B';
                range.deleteContents();
                range.insertNode(codeEl);
                range.setStartAfter(codeEl);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
        els.editor.focus();
        scheduleAutoSave();
    });

    document.getElementById('ed-quote-btn').addEventListener('click', function () {
        execCmd('formatBlock', 'blockquote');
    });

    // ─── Chart Feature ────────────────────────────────────────────────────────
    var chartEls = {
        modal: document.getElementById('ed-chart-modal'),
        title: document.getElementById('ed-chart-title'),
        type: document.getElementById('ed-chart-type'),
        yLabel: document.getElementById('ed-chart-y-label'),
        xLabel: document.getElementById('ed-chart-x-label'),
        colorList: document.getElementById('ed-chart-color-list'),
        addSeriesBtn: document.getElementById('ed-chart-add-series'),
        width: document.getElementById('ed-chart-width'),
        height: document.getElementById('ed-chart-height'),
        json: document.getElementById('ed-chart-json'),
        upload: document.getElementById('ed-chart-upload'),
        loadSample: document.getElementById('ed-chart-load-sample'),
        preview: document.getElementById('ed-chart-preview'),
        insertBtn: document.getElementById('ed-chart-insert'),
        cancelBtn: document.getElementById('ed-chart-cancel'),
        closeBtn: document.getElementById('ed-chart-close')
    };

    var chartSeriesColors = [
        { color: '#93c5fd', name: 'No oxidant' },
        { color: '#3b82f6', name: 'Optimized TEMPO' }
    ];

    function normalizeChartSeries(series) {
        return EdChart.normalizeSeries(series);
    }

    function renderChartColorList() {
        chartEls.colorList.innerHTML = '';
        chartSeriesColors.forEach(function (s, i) {
            var row = document.createElement('div');
            row.className = 'ed-chart-color-row';

            var colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.className = 'ed-chart-color';
            colorInput.value = s.color;
            colorInput.setAttribute('data-series', i);

            var nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'ed-chart-color-name';
            nameInput.placeholder = 'Series ' + (i + 1) + ' name';
            nameInput.value = s.name || '';
            nameInput.setAttribute('data-series', i);

            colorInput.addEventListener('input', function () {
                chartSeriesColors[i].color = this.value;
                updateChartPreview();
            });

            nameInput.addEventListener('input', function () {
                chartSeriesColors[i].name = this.value;
                updateChartPreview();
            });

            row.appendChild(colorInput);
            row.appendChild(nameInput);

            if (chartSeriesColors.length > 1) {
                var removeBtn = document.createElement('button');
                removeBtn.className = 'ed-chart-color-remove';
                removeBtn.innerHTML = '&times;';
                removeBtn.type = 'button';
                removeBtn.addEventListener('click', function () {
                    chartSeriesColors.splice(i, 1);
                    renderChartColorList();
                    updateChartPreview();
                });
                row.appendChild(removeBtn);
            }

            chartEls.colorList.appendChild(row);
        });
    }

    function addChartSeries() {
        var colors = ['#93c5fd', '#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#dbeafe', '#bfdbfe', '#1e40af'];
        var newColor = colors[chartSeriesColors.length % colors.length];
        chartSeriesColors.push({ color: newColor, name: '' });
        renderChartColorList();
        updateChartPreview();
    }

    function parseChartJson() {
        var jsonStr = chartEls.json.value.trim();
        if (!jsonStr) return null;
        try {
            var parsed = JSON.parse(jsonStr);

            if (Array.isArray(parsed)) {
                return { meta: null, series: null, data: parsed };
            }

            if (parsed && typeof parsed === 'object') {
                var data = parsed.data || parsed.points;
                if (!Array.isArray(data)) return null;
                return {
                    meta: {
                        title: parsed.title,
                        type: parsed.type,
                        xLabel: parsed.xLabel != null ? parsed.xLabel : parsed.xAxis,
                        yLabel: parsed.yLabel != null ? parsed.yLabel : parsed.yAxis,
                        width: parsed.width,
                        height: parsed.height
                    },
                    series: normalizeChartSeries(parsed.series || parsed.colors),
                    data: data
                };
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    function applyChartJsonToForm(parsed) {
        if (!parsed) return;

        if (parsed.meta) {
            if (parsed.meta.title != null) chartEls.title.value = parsed.meta.title;
            if (parsed.meta.type) chartEls.type.value = parsed.meta.type === 'bar' ? 'bar' : 'grouped';
            if (parsed.meta.yLabel != null) chartEls.yLabel.value = parsed.meta.yLabel;
            if (parsed.meta.xLabel != null) chartEls.xLabel.value = parsed.meta.xLabel;
            if (parsed.meta.width) chartEls.width.value = parsed.meta.width;
            if (parsed.meta.height) chartEls.height.value = parsed.meta.height;
        }

        if (parsed.series && parsed.series.length) {
            chartSeriesColors = parsed.series.slice();
            renderChartColorList();
        }
    }

    function getChartOptionsFromForm() {
        return {
            type: chartEls.type.value,
            width: parseInt(chartEls.width.value, 10) || 600,
            height: parseInt(chartEls.height.value, 10) || 350,
            yLabel: chartEls.yLabel.value,
            xLabel: chartEls.xLabel.value
        };
    }

    function buildChartConfigFromForm(data) {
        var options = getChartOptionsFromForm();
        return {
            title: chartEls.title.value,
            type: options.type,
            xLabel: options.xLabel,
            yLabel: options.yLabel,
            width: options.width,
            height: options.height,
            series: chartSeriesColors.map(function (s) {
                return { name: s.name, color: s.color };
            }),
            colors: chartSeriesColors,
            data: data
        };
    }

    function syncChartJsonToForm() {
        var parsed = parseChartJson();
        if (!parsed) return null;
        applyChartJsonToForm(parsed);
        return parsed;
    }

    function updateChartPreview() {
        var parsed = parseChartJson();
        if (!parsed || !parsed.data || parsed.data.length === 0) {
            chartEls.preview.innerHTML = '<span class="ed-chart-preview-placeholder">Enter valid JSON data to see preview</span>';
            chartEls.insertBtn.disabled = true;
            return;
        }

        var data = parsed.data;
        var config = buildChartConfigFromForm(data);

        chartEls.preview.innerHTML = EdChart.buildHtml(config);
        chartEls.insertBtn.disabled = false;
        EdChart.bindTooltips(chartEls.preview, config);
    }

    function openChartModal() {
        chartEls.title.value = '';
        chartEls.type.value = 'grouped';
        chartEls.yLabel.value = 'Mean yield (%)';
        chartEls.xLabel.value = 'Substrate ID';
        chartEls.width.value = '600';
        chartEls.height.value = '350';
        chartEls.json.value = '';

        chartSeriesColors = [
            { color: '#93c5fd', name: 'No oxidant' },
            { color: '#3b82f6', name: 'Optimized TEMPO' }
        ];
        renderChartColorList();
        updateChartPreview();

        openModal('ed-chart-modal');
    }

    function closeChartModal() {
        closeModal('ed-chart-modal');
        EdChart.hideTooltip();
    }

    function loadSampleData() {
        var sample = {
            title: 'TEMPO improves yields across sulfonamides',
            type: 'grouped',
            xLabel: 'Substrate ID',
            yLabel: 'Mean yield (%)',
            width: 600,
            height: 350,
            series: [
                { name: 'No oxidant', color: '#93c5fd' },
                { name: 'Optimized TEMPO', color: '#3b82f6' }
            ],
            data: [
                { label: '10', values: [31, 50], tooltip: { 'Substrate family': 'Sulfonamide', 'Substrate ID': 'S10' } },
                { label: '12', values: [24, 42], tooltip: { 'Substrate family': 'Sulfonamide', 'Substrate ID': 'S12' } },
                { label: '9', values: [22, 38], tooltip: { 'Substrate family': 'Sulfonamide', 'Substrate ID': 'S09' } },
                { label: '6', values: [20, 34], tooltip: { 'Substrate family': 'Sulfonamide', 'Substrate ID': 'S06' } },
                { label: '11', values: [21, 28], tooltip: { 'Substrate family': 'Sulfonamide', 'Substrate ID': 'S11' } },
                { label: '5', values: [15, 25], tooltip: { 'Substrate family': 'Sulfonamide', 'Substrate ID': 'S05' } },
                { label: '7', values: [18, 22], tooltip: { 'Substrate family': 'Sulfonamide', 'Substrate ID': 'S07' } },
                { label: '8', values: [14, 20], tooltip: { 'Substrate family': 'Sulfonamide', 'Substrate ID': 'S08' } },
                { label: '2', values: [13, 18], tooltip: { 'Substrate family': 'Sulfonamide', 'Substrate ID': 'S02' } },
                { label: '4', values: [11, 16], tooltip: { 'Substrate family': 'Sulfonamide', 'Substrate ID': 'S04' } },
                { label: '3', values: [10, 14], tooltip: { 'Substrate family': 'Sulfonamide', 'Substrate ID': 'S03' } },
                { label: '1', values: [8, 7.5], tooltip: { 'Substrate family': 'Sulfonamide', 'Substrate ID': 'S01' } }
            ]
        };

        chartEls.json.value = JSON.stringify(sample, null, 2);
        syncChartJsonToForm();
        updateChartPreview();
    }

    function insertChart() {
        var parsed = syncChartJsonToForm();
        if (!parsed || !parsed.data || parsed.data.length === 0) return;

        var chartEl = EdChart.createContainer(buildChartConfigFromForm(parsed.data));

        var range = getEditorInsertionRange();
        els.editor.focus();
        range.deleteContents();
        range.insertNode(chartEl);
        range.setStartAfter(chartEl);
        range.collapse(true);
        setEditorSelection(range);

        bindChartEditorEvents(chartEl);

        closeChartModal();
        scheduleAutoSave();
        showToast('Chart inserted', 'success');
    }

    function bindChartEditorEvents(chartEl) {
        if (chartEl._edChartBound) return;
        chartEl._edChartBound = true;

        chartEl.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            document.querySelectorAll('.ed-chart-container.ed-chart--selected').forEach(function (c) {
                c.classList.remove('ed-chart--selected');
            });
            this.classList.add('ed-chart--selected');
        });

        chartEl.addEventListener('dblclick', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var config = EdChart.parseConfig(this);
            if (config) editChart(this, config);
        });
    }

    function bindChartEvents(chartEl) {
        EdChart.render(chartEl);
        bindChartEditorEvents(chartEl);
    }

    function editChart(chartEl, config) {
        chartEls.title.value = config.title || '';
        chartEls.type.value = config.type || 'grouped';
        chartEls.yLabel.value = config.yLabel || '';
        chartEls.xLabel.value = config.xLabel || '';
        chartEls.width.value = config.width || 600;
        chartEls.height.value = config.height || 350;

        chartSeriesColors = normalizeChartSeries(config.series || config.colors) || [
            { color: '#93c5fd', name: 'No oxidant' },
            { color: '#3b82f6', name: 'Optimized TEMPO' }
        ];

        chartEls.json.value = JSON.stringify({
            title: config.title || '',
            type: config.type || 'grouped',
            xLabel: config.xLabel || '',
            yLabel: config.yLabel || '',
            width: config.width || 600,
            height: config.height || 350,
            series: chartSeriesColors.map(function (s) {
                return { name: s.name, color: s.color };
            }),
            data: config.data || []
        }, null, 2);

        renderChartColorList();
        updateChartPreview();

        openModal('ed-chart-modal');

        chartEls.insertBtn.onclick = function () {
            var parsed = syncChartJsonToForm();
            if (!parsed || !parsed.data || parsed.data.length === 0) return;

            EdChart.render(chartEl, { config: buildChartConfigFromForm(parsed.data) });
            bindChartEditorEvents(chartEl);

            closeChartModal();
            scheduleAutoSave();
            showToast('Chart updated', 'success');

            chartEls.insertBtn.onclick = insertChart;
        };
    }

    els.editor.addEventListener('click', function (e) {
        if (!e.target.closest('.ed-chart-container')) {
            document.querySelectorAll('.ed-chart-container.ed-chart--selected').forEach(function (c) {
                c.classList.remove('ed-chart--selected');
            });
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            var selected = document.querySelector('.ed-chart-container.ed-chart--selected');
            if (selected && els.editor.contains(selected)) {
                e.preventDefault();
                selected.remove();
                scheduleAutoSave();
                showToast('Chart deleted', 'success');
            }
        }
    });

    function rebindCharts() {
        EdChart.renderAll(els.editor);
        els.editor.querySelectorAll('.ed-chart-container').forEach(function (chartEl) {
            chartEl._edChartBound = false;
            bindChartEditorEvents(chartEl);
        });
    }

    function getEditorHtmlForSave() {
        var clone = els.editor.cloneNode(true);
        clone.querySelectorAll('.ed-chart-container').forEach(function (el) {
            el.innerHTML = '';
        });
        return clone.innerHTML;
    }

    if (chartEls.addSeriesBtn) {
        chartEls.addSeriesBtn.addEventListener('click', addChartSeries);
    }

    if (chartEls.json) {
        chartEls.json.addEventListener('input', function () {
            syncChartJsonToForm();
            updateChartPreview();
        });
    }

    if (chartEls.title) {
        chartEls.title.addEventListener('input', updateChartPreview);
    }

    if (chartEls.type) {
        chartEls.type.addEventListener('change', updateChartPreview);
    }

    if (chartEls.yLabel) {
        chartEls.yLabel.addEventListener('input', updateChartPreview);
    }

    if (chartEls.xLabel) {
        chartEls.xLabel.addEventListener('input', updateChartPreview);
    }

    if (chartEls.width) {
        chartEls.width.addEventListener('input', updateChartPreview);
    }

    if (chartEls.height) {
        chartEls.height.addEventListener('input', updateChartPreview);
    }

    if (chartEls.loadSample) {
        chartEls.loadSample.addEventListener('click', loadSampleData);
    }

    if (chartEls.upload) {
        chartEls.upload.addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function (ev) {
                try {
                    var data = JSON.parse(ev.target.result);
                    chartEls.json.value = JSON.stringify(data, null, 2);
                    syncChartJsonToForm();
                    updateChartPreview();
                    showToast('JSON loaded', 'success');
                } catch (err) {
                    showToast('Invalid JSON file', 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }

    if (chartEls.insertBtn) {
        chartEls.insertBtn.addEventListener('click', insertChart);
    }

    if (chartEls.cancelBtn) {
        chartEls.cancelBtn.addEventListener('click', closeChartModal);
    }

    if (chartEls.closeBtn) {
        chartEls.closeBtn.addEventListener('click', closeChartModal);
    }

    if (chartEls.modal) {
        chartEls.modal.addEventListener('click', function (e) {
            if (e.target === this) closeChartModal();
        });
    }

    document.getElementById('ed-insert-chart-btn').addEventListener('mousedown', saveEditorSelection);
    document.getElementById('ed-insert-chart-btn').addEventListener('click', openChartModal);
    
    } // End initEditor function
})();
