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

        renderImages(doc.images || []);
        updateTopbar(doc);
        updateWordCount();
        renderDocList(els.filterInput.value);
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
            content: els.editor.innerHTML,
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

    function insertImageInEditor(url) {
        els.editor.focus();
        var sel = window.getSelection();
        if (!sel.rangeCount) return;
        var range = sel.getRangeAt(0);
        range.deleteContents();
        var img = document.createElement('img');
        img.src = url;
        img.alt = '';
        range.insertNode(img);
        range.setStartAfter(img);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        scheduleAutoSave();
    }

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

    document.getElementById('ed-insert-image-btn').addEventListener('click', function () {
        openModal('ed-img-modal');
        document.getElementById('ed-img-url').value = '';
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
        closeModal('ed-img-modal');
        if (!val) return;
        var src = currentImgType === 'local' ? '../a_home_assets/' + val : val;
        insertImageInEditor(src);
    });

    document.getElementById('ed-img-cancel').addEventListener('click', function () {
        closeModal('ed-img-modal');
    });

    document.getElementById('ed-img-modal').addEventListener('click', function (e) {
        if (e.target === this) closeModal('ed-img-modal');
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
    
    } // End initEditor function
})();
