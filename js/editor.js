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

    const ASK_AI_URL = 'https://us-central1-lcn-apps.cloudfunctions.net/editorAskAi';
    const OPENAI_KEY_STORAGE = 'ed-openai-key';
    const UPLOAD_FOLDER_STORAGE = 'ed-upload-folder';
    const IMAGE_UPLOAD_BASE = 'http://127.0.0.1:3927';

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
        const collectionsCol = db.collection('editor_doc_collections');
        const TS = function () { return firebase.firestore.FieldValue.serverTimestamp(); };
        const DL = window.DocListings;

    let currentDocId = null;
    let docs = {};
    let collections = {};
    let expandedCollections = {};
    let expandedSections = {};
    let openColMenu = null;
    let editingSectionRef = null;
    let categories = [];
    let subCategories = [];
    let autoSaveTimer = null;
    let lastSavedContent = '';
    let docListSort = localStorage.getItem('ed-doc-sort') || 'created-desc';
    if (docListSort.indexOf('category-') === 0) docListSort = 'created-desc';
    let activeCategoryFilter = localStorage.getItem('ed-doc-cat') || 'all';
    let lastRenderedSort = docListSort;

    try {
        expandedCollections = JSON.parse(localStorage.getItem('ed-col-expanded') || '{}') || {};
    } catch (e) { expandedCollections = {}; }
    try {
        expandedSections = JSON.parse(localStorage.getItem('ed-sec-expanded') || '{}') || {};
    } catch (e) { expandedSections = {}; }

    const els = {
        docList: document.getElementById('ed-doclist'),
        filterInput: document.getElementById('ed-filter'),
        catTabs: document.getElementById('ed-cat-tabs'),
        sortSelect: document.getElementById('ed-sort'),
        editor: document.getElementById('ed-editor'),
        titleInput: document.getElementById('ed-title'),
        navLabelInput: document.getElementById('ed-navlabel'),
        navLabelRow: document.getElementById('ed-navlabel-row'),
        subDescInput: document.getElementById('ed-subdesc'),
        goToUrlInput: document.getElementById('ed-goto-url'),
        publicUrlInput: document.getElementById('ed-public-url'),
        publicUrlRow: document.getElementById('ed-public-url-row'),
        copyUrlBtn: document.getElementById('ed-copy-url'),
        listOnBlock: document.getElementById('ed-liston-block'),
        listOnProjects: document.getElementById('ed-liston-projects'),
        listOnDevelopment: document.getElementById('ed-liston-development'),
        listOnUpdates: document.getElementById('ed-liston-updates'),
        collectionActions: document.getElementById('ed-collection-actions'),
        makeCollectionBtn: document.getElementById('ed-make-collection'),
        moveIntoCollectionBtn: document.getElementById('ed-move-into-collection'),
        dissolveCollectionBtn: document.getElementById('ed-dissolve-collection'),
        moveModal: document.getElementById('ed-move-modal'),
        moveTitle: document.getElementById('ed-move-title'),
        moveHelp: document.getElementById('ed-move-help'),
        moveDocField: document.getElementById('ed-move-doc-field'),
        moveDocSelect: document.getElementById('ed-move-doc'),
        moveCollectionField: document.getElementById('ed-move-collection-field'),
        moveCollectionSelect: document.getElementById('ed-move-collection'),
        movePlacementSelect: document.getElementById('ed-move-placement'),
        moveCancelBtn: document.getElementById('ed-move-cancel'),
        moveConfirmBtn: document.getElementById('ed-move-confirm'),
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
        toast: document.getElementById('ed-toast'),
        settingsBtn: document.getElementById('ed-settings-btn'),
        settingsModal: document.getElementById('ed-settings-modal'),
        openaiKeyInput: document.getElementById('ed-openai-key'),
        settingsSave: document.getElementById('ed-settings-save'),
        settingsCancel: document.getElementById('ed-settings-cancel'),
        settingsClear: document.getElementById('ed-settings-clear'),
        uploadFolderSelect: document.getElementById('ed-upload-folder'),
        uploadFolderNew: document.getElementById('ed-upload-folder-new'),
        imgUploadFolder: document.getElementById('ed-img-upload-folder'),
        imgUploadFolderNew: document.getElementById('ed-img-upload-folder-new'),
        imgUploadFile: document.getElementById('ed-img-upload-file'),
        imgUploadFileName: document.getElementById('ed-img-upload-file-name'),
        imgUploadHint: document.getElementById('ed-img-upload-hint'),
        imgUploadWidth: document.getElementById('ed-img-upload-width'),
        imgUrlFields: document.getElementById('ed-img-url-fields'),
        imgUploadFields: document.getElementById('ed-img-upload-fields'),
        uploadImageBtn: document.getElementById('ed-upload-image-btn'),
        uploadImageInput: document.getElementById('ed-upload-image-input'),
        aiPopup: document.getElementById('ed-ai-popup'),
        aiInput: document.getElementById('ed-ai-input'),
        aiSend: document.getElementById('ed-ai-send'),
        aiStatus: document.getElementById('ed-ai-status'),
        aiPreview: document.getElementById('ed-ai-preview'),
        aiAskBtn: document.getElementById('ed-ai-ask-btn'),
        aiPromptStage: document.getElementById('ed-ai-prompt-stage'),
        aiComposeStage: document.getElementById('ed-ai-compose-stage')
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

    function parseDateValue(value) {
        if (!value) return null;
        if (typeof value !== 'string' && value.toDate) return value.toDate();
        if (value.seconds != null) return new Date(value.seconds * 1000);

        var str = String(value).trim();
        if (!str) return null;

        var parts = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (parts) {
            return new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
        }

        var d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
    }

    function normalizeDateInput(value) {
        if (!value) return '';
        var d = parseDateValue(value);
        if (!d) return String(value).trim();
        var month = String(d.getMonth() + 1);
        var day = String(d.getDate());
        if (month.length === 1) month = '0' + month;
        if (day.length === 1) day = '0' + day;
        return d.getFullYear() + '-' + month + '-' + day;
    }

    function formatDisplayDate(value) {
        var d = parseDateValue(value);
        if (!d) return '';
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function formatDocDate(doc) {
        if (doc.date) {
            var fromDocDate = formatDisplayDate(doc.date);
            if (fromDocDate) return fromDocDate;
        }
        return formatDisplayDate(doc.updatedAt) || formatDisplayDate(doc.createdAt) || '';
    }

    function docDateValue(doc) {
        if (doc.date) {
            var fromDocDate = parseDateValue(doc.date);
            if (fromDocDate) return fromDocDate.getTime();
        }
        return tsValue(doc.updatedAt) || tsValue(doc.createdAt) || 0;
    }

    function getDocDateSearchText(doc) {
        var bits = [];
        if (doc.date) bits.push(doc.date);

        var d = doc.date ? parseDateValue(doc.date) : null;
        if (!d) d = parseDateValue(doc.updatedAt || doc.createdAt);

        if (d) {
            var monthNames = [
                'january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december'
            ];
            var month = monthNames[d.getMonth()];
            var day = d.getDate();
            var year = d.getFullYear();
            var padMonth = String(d.getMonth() + 1);
            var padDay = String(day);

            bits.push(
                String(year),
                padMonth,
                padDay,
                month,
                month.slice(0, 3),
                month + ' ' + day,
                month.slice(0, 3) + ' ' + day,
                formatDisplayDate(doc.date || doc.updatedAt || doc.createdAt),
                year + '-' + padMonth + '-' + padDay,
                year + '-' + (padMonth.length === 1 ? '0' + padMonth : padMonth) + '-' + (padDay.length === 1 ? '0' + padDay : padDay)
            );
        }

        return bits.join(' ').toLowerCase();
    }

    function tsValue(ts) {
        if (!ts) return 0;
        if (ts.toDate) return ts.toDate().getTime();
        if (ts.seconds) return ts.seconds * 1000;
        var d = new Date(ts);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    }

    function docMatchesFilter(doc, filterText) {
        if (!filterText) return true;
        var haystack = [
            doc.title,
            doc.subCategory,
            doc.subDesc,
            getDocDateSearchText(doc)
        ].join(' ').toLowerCase();
        var terms = filterText.toLowerCase().trim().split(/\s+/).filter(function (t) { return t.length > 0; });
        return terms.every(function (term) { return haystack.indexOf(term) !== -1; });
    }

    function docMatchesCategory(doc, categoryFilter) {
        if (!categoryFilter || categoryFilter === 'all') return true;
        if (categoryFilter === '__none__') return !doc.category;
        return doc.category === categoryFilter;
    }

    function compareDocIds(a, b, sortKey) {
        var docA = docs[a];
        var docB = docs[b];
        var cmp = 0;

        switch (sortKey) {
            case 'created-asc':
                cmp = tsValue(docA.createdAt) - tsValue(docB.createdAt);
                break;
            case 'modified-desc':
                cmp = tsValue(docB.updatedAt) - tsValue(docA.updatedAt);
                break;
            case 'modified-asc':
                cmp = tsValue(docA.updatedAt) - tsValue(docB.updatedAt);
                break;
            case 'date-desc':
                cmp = docDateValue(docB) - docDateValue(docA);
                break;
            case 'date-asc':
                cmp = docDateValue(docA) - docDateValue(docB);
                break;
            case 'title-asc':
                cmp = (docA.title || '').localeCompare(docB.title || '', undefined, { sensitivity: 'base' });
                break;
            case 'title-desc':
                cmp = (docB.title || '').localeCompare(docA.title || '', undefined, { sensitivity: 'base' });
                break;
            case 'created-desc':
            default:
                cmp = tsValue(docB.createdAt) - tsValue(docA.createdAt);
                break;
        }

        if (cmp !== 0) return cmp;
        return (docA.title || '').localeCompare(docB.title || '', undefined, { sensitivity: 'base' });
    }

    function getFilteredSortedIds(filterText, sortKey, categoryFilter) {
        var fl = (filterText || '').toLowerCase().trim();
        var cat = categoryFilter || activeCategoryFilter || 'all';
        return Object.keys(docs)
            .filter(function (id) {
                var doc = docs[id];
                if (doc.collectionId) return false;
                return docMatchesCategory(doc, cat) && docMatchesFilter(doc, fl);
            })
            .sort(function (a, b) { return compareDocIds(a, b, sortKey); });
    }

    function persistExpandedState() {
        localStorage.setItem('ed-col-expanded', JSON.stringify(expandedCollections));
        localStorage.setItem('ed-sec-expanded', JSON.stringify(expandedSections));
    }

    function closeOpenColMenu() {
        if (openColMenu) {
            openColMenu.classList.remove('open');
            if (openColMenu.parentNode) openColMenu.parentNode.removeChild(openColMenu);
            openColMenu = null;
        }
    }

    function collectionPageIds(col) {
        return DL.collectPageIdsFromTree((col && col.tree) || []);
    }

    function collectionMatchesFilter(colId, col, filterText, categoryFilter) {
        var cat = categoryFilter || activeCategoryFilter || 'all';
        var fl = (filterText || '').toLowerCase().trim();
        var pageIds = collectionPageIds(col);
        for (var i = 0; i < pageIds.length; i++) {
            var doc = docs[pageIds[i]];
            if (!doc) continue;
            if (docMatchesCategory(doc, cat) && docMatchesFilter(doc, fl)) return true;
        }
        if (fl && col && (col.title || '').toLowerCase().indexOf(fl) !== -1) {
            if (cat === 'all') return true;
            for (var j = 0; j < pageIds.length; j++) {
                if (docs[pageIds[j]] && docMatchesCategory(docs[pageIds[j]], cat)) return true;
            }
        }
        return pageIds.length === 0 && cat === 'all' && (!fl || (col.title || '').toLowerCase().indexOf(fl) !== -1);
    }

    function getSortedCollectionIds(filterText, sortKey, categoryFilter) {
        return Object.keys(collections)
            .filter(function (id) {
                return collectionMatchesFilter(id, collections[id], filterText, categoryFilter);
            })
            .sort(function (a, b) {
                var colA = collections[a];
                var colB = collections[b];
                var docA = docs[colA.overviewId] || { title: colA.title, createdAt: colA.createdAt, updatedAt: colA.updatedAt };
                var docB = docs[colB.overviewId] || { title: colB.title, createdAt: colB.createdAt, updatedAt: colB.updatedAt };
                var cmp = 0;
                switch (sortKey) {
                    case 'created-asc':
                        cmp = tsValue(docA.createdAt) - tsValue(docB.createdAt);
                        break;
                    case 'modified-desc':
                        cmp = tsValue(docB.updatedAt) - tsValue(docA.updatedAt);
                        break;
                    case 'modified-asc':
                        cmp = tsValue(docA.updatedAt) - tsValue(docB.updatedAt);
                        break;
                    case 'date-desc':
                        cmp = docDateValue(docB) - docDateValue(docA);
                        break;
                    case 'date-asc':
                        cmp = docDateValue(docA) - docDateValue(docB);
                        break;
                    case 'title-asc':
                        cmp = (colA.title || docA.title || '').localeCompare(colB.title || docB.title || '', undefined, { sensitivity: 'base' });
                        break;
                    case 'title-desc':
                        cmp = (colB.title || docB.title || '').localeCompare(colA.title || docA.title || '', undefined, { sensitivity: 'base' });
                        break;
                    case 'created-desc':
                    default:
                        cmp = tsValue(docB.createdAt) - tsValue(docA.createdAt);
                        break;
                }
                if (cmp !== 0) return cmp;
                return (colA.title || '').localeCompare(colB.title || '', undefined, { sensitivity: 'base' });
            });
    }

    function saveCollectionTree(colId, tree, extra) {
        var payload = Object.assign({ tree: tree, updatedAt: TS() }, extra || {});
        return collectionsCol.doc(colId).update(payload);
    }

    function ensureOverviewFirst(tree, overviewId) {
        var next = (tree || []).slice();
        var overviewNode = null;
        var rest = [];
        next.forEach(function (node) {
            if (node.type === 'page' && node.id === overviewId) overviewNode = node;
            else rest.push(node);
        });
        if (!overviewNode) overviewNode = { type: 'page', id: overviewId };
        return [overviewNode].concat(rest);
    }

    function createDocListItem(id) {
        var item = document.createElement('div');
        item.className = 'ed-doc-item';
        item.setAttribute('data-id', id);

        var titleDiv = document.createElement('div');
        titleDiv.className = 'ed-doc-item-title';
        item.appendChild(titleDiv);

        var metaDiv = document.createElement('div');
        metaDiv.className = 'ed-doc-item-meta';

        var catSpan = document.createElement('span');
        catSpan.className = 'ed-doc-item-cat';
        metaDiv.appendChild(catSpan);

        var dateSpan = document.createElement('span');
        dateSpan.className = 'ed-doc-item-date';
        metaDiv.appendChild(dateSpan);

        var statusSpan = document.createElement('span');
        statusSpan.className = 'ed-doc-item-status';
        metaDiv.appendChild(statusSpan);

        item.appendChild(metaDiv);

        item.addEventListener('click', function () {
            loadDoc(id);
            closeMobileSidebar();
        });

        return item;
    }

    function updateDocListItem(item, id) {
        var doc = docs[id];
        if (!doc) return;

        item.classList.toggle('ed-doc-item--active', id === currentDocId);

        var titleDiv = item.querySelector('.ed-doc-item-title');
        if (titleDiv) titleDiv.textContent = doc.title || 'Untitled';

        var catSpan = item.querySelector('.ed-doc-item-cat');
        if (catSpan) {
            if (doc.category) {
                catSpan.textContent = doc.category;
                catSpan.style.display = '';
            } else {
                catSpan.textContent = '';
                catSpan.style.display = 'none';
            }
        }

        var dateSpan = item.querySelector('.ed-doc-item-date');
        if (dateSpan) {
            dateSpan.textContent = formatDocDate(doc);
        }

        var statusSpan = item.querySelector('.ed-doc-item-status');
        if (statusSpan) {
            statusSpan.className = 'ed-doc-item-status ed-doc-item-status--' + (doc.published ? 'published' : 'draft');
            statusSpan.textContent = doc.published ? 'Published' : 'Draft';
        }
    }

    function setActiveDocInList(id) {
        els.docList.querySelectorAll('.ed-doc-item').forEach(function (el) {
            el.classList.toggle('ed-doc-item--active', el.getAttribute('data-id') === id);
        });
        els.docList.querySelectorAll('.ed-col-page-row').forEach(function (el) {
            el.classList.toggle('ed-col-page-row--active', el.getAttribute('data-page-id') === id);
        });
        els.docList.querySelectorAll('.ed-col-group').forEach(function (el) {
            var colId = el.getAttribute('data-col-id');
            var col = collections[colId];
            var member = !!(col && collectionPageIds(col).indexOf(id) !== -1);
            el.classList.toggle('ed-col-group--active', member);
        });
    }

    function makeMoveButtons(onUp, onDown) {
        var wrap = document.createElement('div');
        wrap.className = 'ed-col-move';
        var up = document.createElement('button');
        up.type = 'button';
        up.title = 'Move up';
        up.textContent = '▲';
        up.addEventListener('click', function (e) {
            e.stopPropagation();
            onUp();
        });
        var down = document.createElement('button');
        down.type = 'button';
        down.title = 'Move down';
        down.textContent = '▼';
        down.addEventListener('click', function (e) {
            e.stopPropagation();
            onDown();
        });
        wrap.appendChild(up);
        wrap.appendChild(down);
        return wrap;
    }

    function moveTreeNode(colId, locator, direction) {
        var col = collections[colId];
        if (!col) return;
        var tree = JSON.parse(JSON.stringify(col.tree || []));
        var arr;
        var index;
        if (locator.kind === 'root') {
            arr = tree;
            index = locator.index;
        } else if (locator.kind === 'section-child') {
            var section = DL.findSectionInTree(tree, locator.sectionId);
            if (!section) return;
            if (!section.children) section.children = [];
            arr = section.children;
            index = locator.index;
        } else return;

        var target = index + direction;
        if (target < 0 || target >= arr.length) return;

        if (locator.kind === 'root') {
            if (arr[index] && arr[index].type === 'page' && arr[index].id === col.overviewId) return;
            if (arr[target] && arr[target].type === 'page' && arr[target].id === col.overviewId) return;
        }

        var tmp = arr[index];
        arr[index] = arr[target];
        arr[target] = tmp;
        tree = ensureOverviewFirst(tree, col.overviewId);
        saveCollectionTree(colId, tree).then(function () {
            showToast('Order updated', 'success');
        });
    }

    function showAddMenu(anchorBtn, colId, sectionId) {
        closeOpenColMenu();
        var menu = document.createElement('div');
        menu.className = 'ed-col-menu open';
        var rect = anchorBtn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.left = Math.max(8, rect.right - 160) + 'px';

        var pageBtn = document.createElement('button');
        pageBtn.type = 'button';
        pageBtn.textContent = 'New Doc Page';
        pageBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            closeOpenColMenu();
            createCollectionPage(colId, sectionId || null);
        });
        menu.appendChild(pageBtn);

        var existingBtn = document.createElement('button');
        existingBtn.type = 'button';
        existingBtn.textContent = 'Add existing doc…';
        existingBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            closeOpenColMenu();
            openMoveModal({
                mode: 'pick-doc',
                targetColId: colId,
                targetSectionId: sectionId || null
            });
        });
        menu.appendChild(existingBtn);

        if (!sectionId) {
            var secBtn = document.createElement('button');
            secBtn.type = 'button';
            secBtn.textContent = 'New Section';
            secBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                closeOpenColMenu();
                createCollectionSection(colId);
            });
            menu.appendChild(secBtn);
        }

        document.body.appendChild(menu);
        openColMenu = menu;
    }

    function createPageRow(colId, pageId, locator) {
        var doc = docs[pageId] || {};
        var row = document.createElement('div');
        row.className = 'ed-col-page-row' + (pageId === currentDocId ? ' ed-col-page-row--active' : '');
        row.setAttribute('data-page-id', pageId);

        var label = document.createElement('span');
        label.className = 'ed-col-page-label';
        label.textContent = DL.navLabelFor(doc);
        row.appendChild(label);

        if (doc.role === 'overview' || (collections[colId] && collections[colId].overviewId === pageId)) {
            var role = document.createElement('span');
            role.className = 'ed-col-page-role';
            role.textContent = 'Overview';
            row.appendChild(role);
        }

        row.appendChild(makeMoveButtons(
            function () { moveTreeNode(colId, locator, -1); },
            function () { moveTreeNode(colId, locator, 1); }
        ));

        row.addEventListener('click', function () {
            loadDoc(pageId);
            closeMobileSidebar();
        });

        return row;
    }

    function createSectionBlock(colId, section, rootIndex) {
        var secKey = colId + ':' + section.id;
        var open = expandedSections[secKey] !== false;
        var block = document.createElement('div');
        block.className = 'ed-col-section' + (open ? ' ed-col-section--open' : '');
        block.setAttribute('data-section-id', section.id);

        var row = document.createElement('div');
        row.className = 'ed-col-section-row';

        var chevron = document.createElement('span');
        chevron.className = 'ed-col-chevron';
        chevron.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
        row.appendChild(chevron);

        var label = document.createElement('span');
        label.className = 'ed-col-page-label';
        label.textContent = section.title || 'Untitled section';
        row.appendChild(label);

        var addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'ed-col-add';
        addBtn.title = 'Add page';
        addBtn.textContent = '+';
        addBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            showAddMenu(addBtn, colId, section.id);
        });
        row.appendChild(addBtn);

        var gear = document.createElement('button');
        gear.type = 'button';
        gear.className = 'ed-col-add';
        gear.title = 'Section settings';
        gear.textContent = '⚙';
        gear.addEventListener('click', function (e) {
            e.stopPropagation();
            openSectionModal(colId, section.id);
        });
        row.appendChild(gear);

        row.appendChild(makeMoveButtons(
            function () { moveTreeNode(colId, { kind: 'root', index: rootIndex }, -1); },
            function () { moveTreeNode(colId, { kind: 'root', index: rootIndex }, 1); }
        ));

        row.addEventListener('click', function () {
            expandedSections[secKey] = !block.classList.contains('ed-col-section--open');
            persistExpandedState();
            block.classList.toggle('ed-col-section--open');
        });

        block.appendChild(row);

        var children = document.createElement('div');
        children.className = 'ed-col-section-children';
        (section.children || []).forEach(function (child, idx) {
            if (child.type === 'page') {
                children.appendChild(createPageRow(colId, child.id, {
                    kind: 'section-child',
                    sectionId: section.id,
                    index: idx
                }));
            }
        });
        block.appendChild(children);
        return block;
    }

    function createCollectionGroup(colId) {
        var col = collections[colId];
        if (!col) return null;
        var isOpen = expandedCollections[colId] !== false;
        var group = document.createElement('div');
        group.className = 'ed-col-group' + (isOpen ? ' ed-col-group--open' : '');
        group.setAttribute('data-col-id', colId);
        if (currentDocId && collectionPageIds(col).indexOf(currentDocId) !== -1) {
            group.classList.add('ed-col-group--active');
            group.classList.add('ed-col-group--open');
        }

        var header = document.createElement('div');
        header.className = 'ed-col-header';

        var chevron = document.createElement('span');
        chevron.className = 'ed-col-chevron';
        chevron.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
        header.appendChild(chevron);

        var title = document.createElement('span');
        title.className = 'ed-col-title';
        title.textContent = col.title || 'Untitled collection';
        title.title = 'Double-click to rename';
        title.addEventListener('dblclick', function (e) {
            e.stopPropagation();
            var next = prompt('Collection name', col.title || '');
            if (next === null) return;
            next = next.trim();
            if (!next) return;
            collectionsCol.doc(colId).update({ title: next, updatedAt: TS() }).then(function () {
                showToast('Collection renamed', 'success');
            });
        });
        header.appendChild(title);

        var badge = document.createElement('span');
        badge.className = 'ed-col-badge';
        badge.textContent = 'Docs';
        header.appendChild(badge);

        var addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'ed-col-add';
        addBtn.title = 'Add page or section';
        addBtn.textContent = '+';
        addBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            expandedCollections[colId] = true;
            persistExpandedState();
            showAddMenu(addBtn, colId, null);
        });
        header.appendChild(addBtn);

        header.addEventListener('click', function () {
            var open = !group.classList.contains('ed-col-group--open');
            expandedCollections[colId] = open;
            persistExpandedState();
            group.classList.toggle('ed-col-group--open', open);
        });

        group.appendChild(header);

        var body = document.createElement('div');
        body.className = 'ed-col-body';
        var tree = ensureOverviewFirst(col.tree || [], col.overviewId);
        tree.forEach(function (node, idx) {
            if (node.type === 'page') {
                body.appendChild(createPageRow(colId, node.id, { kind: 'root', index: idx }));
            } else if (node.type === 'section') {
                body.appendChild(createSectionBlock(colId, node, idx));
            }
        });
        group.appendChild(body);
        return group;
    }

    function renderDocList(filter) {
        lastRenderedSort = docListSort;
        var standaloneIds = getFilteredSortedIds(filter, docListSort);
        var collectionIds = getSortedCollectionIds(filter, docListSort);
        els.docList.innerHTML = '';
        collectionIds.forEach(function (colId) {
            var group = createCollectionGroup(colId);
            if (group) els.docList.appendChild(group);
        });
        standaloneIds.forEach(function (id) {
            var item = createDocListItem(id);
            updateDocListItem(item, id);
            els.docList.appendChild(item);
        });
    }

    function updateCollectionMetaUI(doc) {
        if (!doc || !currentDocId) {
            if (els.navLabelRow) els.navLabelRow.style.display = 'none';
            if (els.listOnBlock) els.listOnBlock.style.display = 'none';
            if (els.publicUrlRow) els.publicUrlRow.style.display = 'none';
            if (els.collectionActions) els.collectionActions.style.display = 'none';
            return;
        }

        var inCollection = !!doc.collectionId;
        var isStandalone = !doc.collectionId;

        if (els.navLabelRow) els.navLabelRow.style.display = inCollection ? 'flex' : 'none';
        if (els.listOnBlock) els.listOnBlock.style.display = inCollection ? '' : 'none';
        if (els.publicUrlRow) els.publicUrlRow.style.display = 'flex';
        if (els.collectionActions) els.collectionActions.style.display = '';

        if (els.makeCollectionBtn) {
            els.makeCollectionBtn.style.display = isStandalone ? '' : 'none';
        }
        if (els.moveIntoCollectionBtn) {
            var canMove = isStandalone || (inCollection && doc.role !== 'overview');
            els.moveIntoCollectionBtn.style.display = canMove ? '' : 'none';
            els.moveIntoCollectionBtn.textContent = isStandalone
                ? 'Move into collection…'
                : 'Move within / to collection…';
        }
        if (els.dissolveCollectionBtn) {
            els.dissolveCollectionBtn.style.display = (inCollection && doc.role === 'overview') ? '' : 'none';
        }

        if (els.navLabelInput) {
            els.navLabelInput.value = doc.navLabel || '';
        }
        if (els.publicUrlInput) {
            els.publicUrlInput.value = 'index/doc.html?v=' + currentDocId;
        }

        var listOn = DL.normalizeListOn(doc.listOn);
        if (els.listOnProjects) els.listOnProjects.checked = !!listOn.projects;
        if (els.listOnDevelopment) els.listOnDevelopment.checked = !!listOn.development;
        if (els.listOnUpdates) els.listOnUpdates.checked = !!listOn.updates;
    }

    function convertToCollection(name) {
        if (!currentDocId) return;
        var doc = docs[currentDocId];
        if (!doc || doc.collectionId) return;
        var colId = generateId();
        var overviewId = currentDocId;
        var title = (name || doc.title || 'Untitled').trim() || 'Untitled';
        var listOn = DL.listOnFromCategory(doc.category || '');

        var colData = {
            title: title,
            overviewId: overviewId,
            tree: [{ type: 'page', id: overviewId }],
            createdAt: TS(),
            updatedAt: TS()
        };

        collectionsCol.doc(colId).set(colData).then(function () {
            return docsCol.doc(overviewId).update({
                collectionId: colId,
                role: 'overview',
                navLabel: doc.navLabel || doc.title || 'Overview',
                listOn: listOn,
                updatedAt: TS()
            });
        }).then(function () {
            expandedCollections[colId] = true;
            persistExpandedState();
            closeModal('ed-collection-modal');
            showToast('Document collection created', 'success');
            loadDoc(overviewId);
        }).catch(function (err) {
            console.error(err);
            showToast('Failed to create collection', 'error');
        });
    }

    function createCollectionPage(colId, sectionId) {
        var col = collections[colId];
        if (!col) return;
        var pageId = generateId();
        var overview = docs[col.overviewId] || {};
        var data = {
            title: 'Untitled',
            navLabel: 'Untitled',
            subDesc: '',
            goToUrl: '',
            date: '',
            category: overview.category || '',
            subCategory: overview.subCategory || '',
            content: '',
            images: [],
            published: false,
            collectionId: colId,
            role: 'page',
            listOn: DL.emptyListOn(),
            createdAt: TS(),
            updatedAt: TS()
        };

        docsCol.doc(pageId).set(data).then(function () {
            var tree = JSON.parse(JSON.stringify(col.tree || []));
            tree = ensureOverviewFirst(tree, col.overviewId);
            var node = { type: 'page', id: pageId };
            if (sectionId) {
                var section = DL.findSectionInTree(tree, sectionId);
                if (!section) {
                    tree.push(node);
                } else {
                    if (!section.children) section.children = [];
                    section.children.push(node);
                    expandedSections[colId + ':' + sectionId] = true;
                    persistExpandedState();
                }
            } else {
                tree.push(node);
            }
            expandedCollections[colId] = true;
            persistExpandedState();
            return saveCollectionTree(colId, tree);
        }).then(function () {
            loadDoc(pageId);
            showToast('Doc page created', 'success');
        }).catch(function (err) {
            console.error(err);
            showToast('Failed to create page', 'error');
        });
    }

    function createCollectionSection(colId) {
        var col = collections[colId];
        if (!col) return;
        var title = prompt('Section name', 'New Section');
        if (title === null) return;
        title = title.trim() || 'New Section';
        var sectionId = 'sec_' + generateId();
        var tree = JSON.parse(JSON.stringify(col.tree || []));
        tree = ensureOverviewFirst(tree, col.overviewId);
        tree.push({
            type: 'section',
            id: sectionId,
            title: title,
            listOn: DL.emptyListOn(),
            children: []
        });
        expandedCollections[colId] = true;
        expandedSections[colId + ':' + sectionId] = true;
        persistExpandedState();
        saveCollectionTree(colId, tree).then(function () {
            showToast('Section created', 'success');
            openSectionModal(colId, sectionId);
        });
    }

    function openSectionModal(colId, sectionId) {
        var col = collections[colId];
        if (!col) return;
        var section = DL.findSectionInTree(col.tree || [], sectionId);
        if (!section) return;
        editingSectionRef = { colId: colId, sectionId: sectionId };
        document.getElementById('ed-section-title').value = section.title || '';
        var listOn = DL.normalizeListOn(section.listOn);
        document.getElementById('ed-sec-liston-projects').checked = !!listOn.projects;
        document.getElementById('ed-sec-liston-development').checked = !!listOn.development;
        document.getElementById('ed-sec-liston-updates').checked = !!listOn.updates;
        openModal('ed-section-modal');
    }

    function saveSectionModal() {
        if (!editingSectionRef) return;
        var colId = editingSectionRef.colId;
        var sectionId = editingSectionRef.sectionId;
        var col = collections[colId];
        if (!col) return;
        var tree = JSON.parse(JSON.stringify(col.tree || []));
        var section = DL.findSectionInTree(tree, sectionId);
        if (!section) return;
        section.title = document.getElementById('ed-section-title').value.trim() || 'Untitled section';
        section.listOn = {
            projects: document.getElementById('ed-sec-liston-projects').checked,
            development: document.getElementById('ed-sec-liston-development').checked,
            updates: document.getElementById('ed-sec-liston-updates').checked
        };
        saveCollectionTree(colId, tree).then(function () {
            closeModal('ed-section-modal');
            editingSectionRef = null;
            showToast('Section saved', 'success');
        });
    }

    function deleteSectionFromModal() {
        if (!editingSectionRef) return;
        if (!confirm('Delete this section? Pages inside will move to the collection root.')) return;
        var colId = editingSectionRef.colId;
        var sectionId = editingSectionRef.sectionId;
        var col = collections[colId];
        if (!col) return;
        var tree = JSON.parse(JSON.stringify(col.tree || []));
        var next = [];
        var orphaned = [];
        tree.forEach(function (node) {
            if (node.type === 'section' && node.id === sectionId) {
                orphaned = (node.children || []).slice();
            } else {
                next.push(node);
            }
        });
        next = next.concat(orphaned);
        next = ensureOverviewFirst(next, col.overviewId);
        saveCollectionTree(colId, next).then(function () {
            delete expandedSections[colId + ':' + sectionId];
            persistExpandedState();
            closeModal('ed-section-modal');
            editingSectionRef = null;
            showToast('Section deleted', 'success');
        });
    }

    function dissolveCurrentCollection() {
        if (!currentDocId) return;
        var doc = docs[currentDocId];
        if (!doc || !doc.collectionId) return;
        var colId = doc.collectionId;
        var col = collections[colId];
        if (!col) return;
        var pageIds = collectionPageIds(col);
        var batch = db.batch();
        pageIds.forEach(function (id) {
            batch.update(docsCol.doc(id), {
                collectionId: firebase.firestore.FieldValue.delete(),
                role: firebase.firestore.FieldValue.delete(),
                updatedAt: TS()
            });
        });
        batch.delete(collectionsCol.doc(colId));
        batch.commit().then(function () {
            closeModal('ed-dissolve-modal');
            delete expandedCollections[colId];
            persistExpandedState();
            showToast('Collection dissolved', 'success');
            loadDoc(col.overviewId || currentDocId);
        }).catch(function (err) {
            console.error(err);
            showToast('Failed to dissolve collection', 'error');
        });
    }

    function removePageFromCollectionTree(colId, pageId) {
        var col = collections[colId];
        if (!col) return Promise.resolve();
        var tree = JSON.parse(JSON.stringify(col.tree || []));
        var next = [];
        tree.forEach(function (node) {
            if (node.type === 'page' && node.id === pageId) return;
            if (node.type === 'section') {
                node.children = (node.children || []).filter(function (c) {
                    return !(c.type === 'page' && c.id === pageId);
                });
                next.push(node);
                return;
            }
            next.push(node);
        });
        return saveCollectionTree(colId, next);
    }

    function stripPageFromTree(tree, pageId) {
        var next = [];
        (tree || []).forEach(function (node) {
            if (node.type === 'page' && node.id === pageId) return;
            if (node.type === 'section') {
                var copy = Object.assign({}, node, {
                    children: (node.children || []).filter(function (c) {
                        return !(c.type === 'page' && c.id === pageId);
                    })
                });
                next.push(copy);
                return;
            }
            next.push(node);
        });
        return next;
    }

    function insertPageIntoTree(tree, overviewId, pageId, sectionId) {
        var next = ensureOverviewFirst(JSON.parse(JSON.stringify(tree || [])), overviewId);
        next = stripPageFromTree(next, pageId);
        var node = { type: 'page', id: pageId };
        if (sectionId) {
            var section = DL.findSectionInTree(next, sectionId);
            if (!section) {
                next.push(node);
            } else {
                if (!section.children) section.children = [];
                section.children.push(node);
            }
        } else {
            next.push(node);
        }
        return ensureOverviewFirst(next, overviewId);
    }

    function getMovableDocIds(excludeId) {
        return Object.keys(docs)
            .filter(function (id) {
                if (excludeId && id === excludeId) return false;
                var doc = docs[id];
                if (!doc) return false;
                if (!doc.collectionId) return true;
                if (doc.role === 'overview') return false;
                var col = collections[doc.collectionId];
                if (col && col.overviewId === id) return false;
                return true;
            })
            .sort(function (a, b) {
                var ta = (docs[a].title || '').toLowerCase();
                var tb = (docs[b].title || '').toLowerCase();
                return ta.localeCompare(tb);
            });
    }

    function getSortedCollectionsForPicker() {
        return Object.keys(collections).sort(function (a, b) {
            var ta = (collections[a].title || docs[collections[a].overviewId] && docs[collections[a].overviewId].title || '').toLowerCase();
            var tb = (collections[b].title || docs[collections[b].overviewId] && docs[collections[b].overviewId].title || '').toLowerCase();
            return ta.localeCompare(tb);
        });
    }

    function collectionDisplayTitle(colId) {
        var col = collections[colId];
        if (!col) return 'Untitled';
        return col.title || (docs[col.overviewId] && docs[col.overviewId].title) || 'Untitled';
    }

    var moveModalState = {
        mode: 'current-doc',
        lockedDocId: null,
        lockedColId: null,
        lockedSectionId: null
    };

    function fillMoveDocSelect(preferredId) {
        if (!els.moveDocSelect) return;
        var ids = getMovableDocIds();
        els.moveDocSelect.innerHTML = '';
        if (!ids.length) {
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = 'No movable documents';
            els.moveDocSelect.appendChild(empty);
            return;
        }
        ids.forEach(function (id) {
            var doc = docs[id];
            var opt = document.createElement('option');
            opt.value = id;
            var label = doc.title || 'Untitled';
            if (doc.collectionId) {
                label += ' · ' + collectionDisplayTitle(doc.collectionId);
            } else {
                label += ' · standalone';
            }
            opt.textContent = label;
            els.moveDocSelect.appendChild(opt);
        });
        if (preferredId && ids.indexOf(preferredId) !== -1) {
            els.moveDocSelect.value = preferredId;
        }
    }

    function fillMoveCollectionSelect(preferredId) {
        if (!els.moveCollectionSelect) return;
        var ids = getSortedCollectionsForPicker();
        els.moveCollectionSelect.innerHTML = '';
        if (!ids.length) {
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = 'No collections yet';
            els.moveCollectionSelect.appendChild(empty);
            return;
        }
        ids.forEach(function (id) {
            var opt = document.createElement('option');
            opt.value = id;
            opt.textContent = collectionDisplayTitle(id);
            els.moveCollectionSelect.appendChild(opt);
        });
        if (preferredId && ids.indexOf(preferredId) !== -1) {
            els.moveCollectionSelect.value = preferredId;
        }
    }

    function fillMovePlacementSelect(colId, preferredSectionId) {
        if (!els.movePlacementSelect) return;
        els.movePlacementSelect.innerHTML = '';
        var rootOpt = document.createElement('option');
        rootOpt.value = 'root';
        rootOpt.textContent = 'Collection root (with Overview)';
        els.movePlacementSelect.appendChild(rootOpt);

        var col = collections[colId];
        if (!col) return;

        (col.tree || []).forEach(function (node) {
            if (node.type !== 'section') return;
            var opt = document.createElement('option');
            opt.value = 'section:' + node.id;
            opt.textContent = 'Section · ' + (node.title || 'Untitled');
            els.movePlacementSelect.appendChild(opt);
        });

        if (preferredSectionId) {
            els.movePlacementSelect.value = 'section:' + preferredSectionId;
        } else {
            els.movePlacementSelect.value = 'root';
        }
    }

    function parseMovePlacement(value) {
        if (!value || value === 'root') return null;
        if (value.indexOf('section:') === 0) return value.slice('section:'.length);
        return null;
    }

    function openMoveModal(opts) {
        opts = opts || {};
        moveModalState.mode = opts.mode || 'current-doc';
        moveModalState.lockedDocId = opts.docId || null;
        moveModalState.lockedColId = opts.targetColId || null;
        moveModalState.lockedSectionId = opts.targetSectionId || null;

        var hasCollections = Object.keys(collections).length > 0;
        if (!hasCollections) {
            showToast('Create a collection first', 'error');
            return;
        }

        if (moveModalState.mode === 'pick-doc') {
            if (els.moveTitle) els.moveTitle.textContent = 'Add Existing Document';
            if (els.moveHelp) els.moveHelp.textContent = 'Pick a standalone doc (or a page from another collection) to place here.';
            if (els.moveDocField) els.moveDocField.style.display = '';
            if (els.moveCollectionField) els.moveCollectionField.style.display = 'none';
            if (els.moveConfirmBtn) els.moveConfirmBtn.textContent = 'Add';
            fillMoveDocSelect();
            fillMovePlacementSelect(moveModalState.lockedColId, moveModalState.lockedSectionId);
        } else {
            var docId = moveModalState.lockedDocId || currentDocId;
            var doc = docs[docId];
            if (!doc) return;
            if (doc.role === 'overview' || (doc.collectionId && collections[doc.collectionId] && collections[doc.collectionId].overviewId === docId)) {
                showToast('Overview pages stay with their collection', 'error');
                return;
            }
            if (els.moveTitle) els.moveTitle.textContent = 'Move into Collection';
            if (els.moveHelp) els.moveHelp.textContent = 'Place this document under a collection, or inside one of its sections.';
            if (els.moveDocField) els.moveDocField.style.display = 'none';
            if (els.moveCollectionField) els.moveCollectionField.style.display = '';
            if (els.moveConfirmBtn) els.moveConfirmBtn.textContent = 'Move';
            fillMoveCollectionSelect(doc.collectionId || null);
            var preferredSection = null;
            if (doc.collectionId && collections[doc.collectionId]) {
                var parent = DL.findPageParent(collections[doc.collectionId].tree || [], docId);
                if (parent && parent.sectionId) preferredSection = parent.sectionId;
            }
            var colId = els.moveCollectionSelect ? els.moveCollectionSelect.value : '';
            fillMovePlacementSelect(colId, preferredSection);
        }

        openModal('ed-move-modal');
    }

    function closeMoveModal() {
        closeModal('ed-move-modal');
    }

    function moveDocIntoCollection(docId, targetColId, sectionId) {
        var doc = docs[docId];
        var targetCol = collections[targetColId];
        if (!doc || !targetCol) {
            return Promise.reject(new Error('Missing doc or collection'));
        }
        if (doc.role === 'overview' || targetCol.overviewId === docId) {
            return Promise.reject(new Error('Cannot move overview'));
        }

        var sourceColId = doc.collectionId || null;
        var sourceCol = sourceColId ? collections[sourceColId] : null;

        if (sourceColId === targetColId) {
            var currentParent = DL.findPageParent(sourceCol.tree || [], docId);
            var currentSection = currentParent ? currentParent.sectionId : null;
            if ((currentSection || null) === (sectionId || null)) {
                return Promise.resolve({ unchanged: true });
            }
            var sameTree = insertPageIntoTree(sourceCol.tree || [], targetCol.overviewId, docId, sectionId);
            return saveCollectionTree(targetColId, sameTree).then(function () {
                return { unchanged: false };
            });
        }

        var writes = [];

        if (sourceColId && sourceCol) {
            var stripped = ensureOverviewFirst(
                stripPageFromTree(JSON.parse(JSON.stringify(sourceCol.tree || [])), docId),
                sourceCol.overviewId
            );
            writes.push(saveCollectionTree(sourceColId, stripped));
        }

        var targetTree = insertPageIntoTree(targetCol.tree || [], targetCol.overviewId, docId, sectionId);
        writes.push(saveCollectionTree(targetColId, targetTree));

        var docUpdate = {
            collectionId: targetColId,
            role: 'page',
            updatedAt: TS()
        };
        if (!doc.navLabel) {
            docUpdate.navLabel = doc.title || 'Untitled';
        }
        if (!doc.listOn) {
            docUpdate.listOn = DL.listOnFromCategory(doc.category || '');
        }
        writes.push(docsCol.doc(docId).update(docUpdate));

        return Promise.all(writes).then(function () {
            return { unchanged: false };
        });
    }

    function confirmMoveModal() {
        var docId;
        var colId;
        var sectionId;

        if (moveModalState.mode === 'pick-doc') {
            docId = els.moveDocSelect ? els.moveDocSelect.value : '';
            colId = moveModalState.lockedColId;
            sectionId = parseMovePlacement(els.movePlacementSelect ? els.movePlacementSelect.value : 'root');
        } else {
            docId = moveModalState.lockedDocId || currentDocId;
            colId = els.moveCollectionSelect ? els.moveCollectionSelect.value : '';
            sectionId = parseMovePlacement(els.movePlacementSelect ? els.movePlacementSelect.value : 'root');
        }

        if (!docId || !colId) {
            showToast('Pick a document and collection', 'error');
            return;
        }

        var moving = docs[docId];
        if (!moving) {
            showToast('Document not found', 'error');
            return;
        }
        if (moving.role === 'overview' || (moving.collectionId && collections[moving.collectionId] && collections[moving.collectionId].overviewId === docId)) {
            showToast('Overview pages stay with their collection', 'error');
            return;
        }

        if (els.moveConfirmBtn) els.moveConfirmBtn.disabled = true;

        moveDocIntoCollection(docId, colId, sectionId).then(function (result) {
            if (els.moveConfirmBtn) els.moveConfirmBtn.disabled = false;
            if (result && result.unchanged) {
                closeMoveModal();
                showToast('Already in that place', 'success');
                return;
            }
            expandedCollections[colId] = true;
            if (sectionId) {
                expandedSections[colId + ':' + sectionId] = true;
            }
            persistExpandedState();
            closeMoveModal();
            showToast(moveModalState.mode === 'pick-doc' ? 'Document added' : 'Document moved', 'success');
            loadDoc(docId);
        }).catch(function (err) {
            if (els.moveConfirmBtn) els.moveConfirmBtn.disabled = false;
            console.error(err);
            showToast('Failed to move document', 'error');
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
        els.dateInput.value = normalizeDateInput(doc.date || '');
        els.catSelect.value = doc.category || '';
        els.catCustom.style.display = 'none';
        els.catCustom.value = '';
        els.subCatSelect.value = doc.subCategory || '';
        els.subCatCustom.style.display = 'none';
        els.subCatCustom.value = '';
        var loadedContent = doc.content || '';
        if (window.LCN && LCN.rewriteContentHtml) {
            loadedContent = LCN.rewriteContentHtml(loadedContent, { root: '../' });
        }
        els.editor.innerHTML = loadedContent;
        lastSavedContent = loadedContent;
        deselectEditorImage();

        renderImages(doc.images || []);
        updateTopbar(doc);
        updateCollectionMetaUI(doc);
        updateWordCount();
        setActiveDocInList(id);
        if (doc.collectionId) {
            expandedCollections[doc.collectionId] = true;
            persistExpandedState();
        }
        rebindCharts();
        rebindMath();
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
        var data = {
            title: els.titleInput.value.trim() || 'Untitled',
            subDesc: els.subDescInput.value.trim(),
            goToUrl: resolveSiteUrl(els.goToUrlInput.value.trim()),
            date: normalizeDateInput(els.dateInput.value),
            category: cat,
            subCategory: subCat,
            content: getEditorHtmlForSave(),
            images: collectImages(),
            updatedAt: TS()
        };
        var existing = docs[currentDocId] || {};
        if (existing.collectionId) {
            data.collectionId = existing.collectionId;
            data.role = existing.role || 'page';
            data.navLabel = (els.navLabelInput && els.navLabelInput.value.trim()) || '';
            data.listOn = {
                projects: !!(els.listOnProjects && els.listOnProjects.checked),
                development: !!(els.listOnDevelopment && els.listOnDevelopment.checked),
                updates: !!(els.listOnUpdates && els.listOnUpdates.checked)
            };
        }
        return data;
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
        renderCategoryTabs();
    }

    function categoryFilterIsValid(filter) {
        if (!filter || filter === 'all') return true;
        if (filter === '__none__') {
            return Object.keys(docs).some(function (id) { return !docs[id].category; });
        }
        return categories.indexOf(filter) !== -1;
    }

    function setActiveCategoryFilter(filter) {
        activeCategoryFilter = filter;
        localStorage.setItem('ed-doc-cat', filter);
        if (els.catTabs) {
            els.catTabs.querySelectorAll('.ed-cat-tab').forEach(function (btn) {
                btn.classList.toggle('ed-cat-tab--active', btn.dataset.cat === filter);
            });
        }
        renderDocList(els.filterInput.value);
    }

    function renderCategoryTabs() {
        if (!els.catTabs) return;

        if (!categoryFilterIsValid(activeCategoryFilter)) {
            activeCategoryFilter = 'all';
            localStorage.setItem('ed-doc-cat', 'all');
        }

        var hasUncategorized = Object.keys(docs).some(function (id) { return !docs[id].category; });
        var signature = 'all|' + categories.join('|') + (hasUncategorized ? '|__none__' : '');

        if (els.catTabs.dataset.signature === signature) {
            els.catTabs.querySelectorAll('.ed-cat-tab').forEach(function (btn) {
                btn.classList.toggle('ed-cat-tab--active', btn.dataset.cat === activeCategoryFilter);
            });
            return;
        }

        els.catTabs.dataset.signature = signature;
        els.catTabs.innerHTML = '';

        function addTab(value, label) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ed-cat-tab' + (activeCategoryFilter === value ? ' ed-cat-tab--active' : '');
            btn.dataset.cat = value;
            btn.textContent = label;
            btn.addEventListener('click', function () {
                setActiveCategoryFilter(value);
            });
            els.catTabs.appendChild(btn);
        }

        addTab('all', 'All');
        categories.forEach(function (cat) {
            addTab(cat, cat);
        });
        if (hasUncategorized) {
            addTab('__none__', 'Uncategorized');
        }
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
        var doc = docs[id];
        if (doc && doc.collectionId) {
            var col = collections[doc.collectionId];
            if (col && col.overviewId === id) {
                showToast('Dissolve the collection or promote another page before deleting Overview', 'error');
                closeModal('ed-delete-modal');
                return;
            }
        }

        var afterDelete = function () {
            currentDocId = null;
            els.editorView.style.display = 'none';
            els.emptyView.style.display = 'flex';
            updateCollectionMetaUI(null);
            closeModal('ed-delete-modal');
            showToast('Document deleted', 'success');
        };

        if (doc && doc.collectionId) {
            removePageFromCollectionTree(doc.collectionId, id).then(function () {
                return docsCol.doc(id).delete();
            }).then(afterDelete).catch(function (err) {
                console.error(err);
                showToast('Delete failed', 'error');
            });
            return;
        }

        docsCol.doc(id).delete().then(afterDelete);
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

    function resolveSiteUrl(url) {
        if (!url) return url;
        var trimmed = String(url).trim();
        if (!trimmed) return trimmed;
        if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.charAt(0) === '/' || trimmed.charAt(0) === '#' || trimmed.indexOf('//') === 0) {
            return trimmed;
        }
        if (trimmed.indexOf('./') === 0) trimmed = trimmed.slice(2);
        return '/' + trimmed.replace(/^\/+/, '');
    }

    function insertLink(url, text, isGoto) {
        els.editor.focus();
        var sel = window.getSelection();
        if (!sel.rangeCount) return;

        var range = sel.getRangeAt(0);
        range.deleteContents();

        if (isGoto) {
            var a = document.createElement('a');
            a.setAttribute('href', resolveSiteUrl(url));
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

    // ─── Local asset upload helper ─────────────────────────────────────────────
    function getStoredUploadFolder() {
        try {
            return (localStorage.getItem(UPLOAD_FOLDER_STORAGE) || 'screenshots').trim() || 'screenshots';
        } catch (e) {
            return 'screenshots';
        }
    }

    function setStoredUploadFolder(folder) {
        var clean = String(folder || '').trim().replace(/\\/g, '/');
        if (!clean || clean.indexOf('..') !== -1 || clean.indexOf('/') !== -1) return;
        try {
            localStorage.setItem(UPLOAD_FOLDER_STORAGE, clean);
        } catch (e) { /* ignore */ }
    }

    function resolveUploadFolderFromInputs(selectEl, newEl) {
        var typed = (newEl && newEl.value || '').trim();
        if (typed) return typed.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        return (selectEl && selectEl.value || getStoredUploadFolder()).trim();
    }

    function fillFolderSelect(selectEl, folders, selected) {
        if (!selectEl) return;
        var list = (folders || []).slice();
        if (selected && list.indexOf(selected) === -1) list.push(selected);
        list.sort();
        if (!list.length) list = [selected || 'screenshots'];
        selectEl.innerHTML = list.map(function (f) {
            return '<option value="' + f + '"' + (f === selected ? ' selected' : '') + '>' + f + '</option>';
        }).join('');
    }

    function checkUploadHelper() {
        return fetch(IMAGE_UPLOAD_BASE + '/health')
            .then(function (res) {
                if (!res.ok) throw new Error('offline');
                return res.json();
            })
            .then(function () { return true; })
            .catch(function () { return false; });
    }

    function fetchUploadFolders() {
        return fetch(IMAGE_UPLOAD_BASE + '/folders')
            .then(function (res) {
                if (!res.ok) throw new Error('offline');
                return res.json();
            })
            .then(function (data) { return data.folders || []; })
            .catch(function () {
                return loadPicManifest(true).then(function (manifest) {
                    return (manifest && manifest.folders) || [];
                });
            });
    }

    function refreshUploadFolderUI() {
        var selected = getStoredUploadFolder();
        return fetchUploadFolders().then(function (folders) {
            fillFolderSelect(els.uploadFolderSelect, folders, selected);
            fillFolderSelect(els.imgUploadFolder, folders, selected);
            return folders;
        });
    }

    function updateUploadHint(online) {
        if (!els.imgUploadHint) return;
        if (online) {
            els.imgUploadHint.innerHTML = 'Helper online — files save to <code>a_home_assets/content/&lt;folder&gt;/</code>';
        } else {
            els.imgUploadHint.innerHTML = 'Requires local helper: <code>node scripts/image-upload-server.js</code>';
        }
    }

    function uploadImageToAssets(file, folderOverride) {
        if (!file) return Promise.reject(new Error('No file'));
        var folder = (folderOverride || getStoredUploadFolder() || 'screenshots').trim();
        if (!folder || folder.indexOf('..') !== -1 || folder.indexOf('/') !== -1) {
            return Promise.reject(new Error('Invalid folder name'));
        }

        var form = new FormData();
        form.append('folder', folder);
        form.append('file', file, file.name || 'paste.png');

        return fetch(IMAGE_UPLOAD_BASE + '/upload', {
            method: 'POST',
            headers: {
                'X-Upload-Folder': folder,
                'X-Upload-Filename': file.name || 'paste.png'
            },
            body: form
        }).then(function (res) {
            return res.json().then(function (data) {
                if (!res.ok || !data || !data.path) {
                    throw new Error((data && data.error) || 'Upload failed');
                }
                return data.path;
            });
        }).then(function (assetPath) {
            setStoredUploadFolder(folder);
            picManifest = null;
            return loadPicManifest(true).then(function () {
                return assetPath;
            });
        });
    }

    function handleUploadedImageFile(file, width) {
        var folder = resolveUploadFolderFromInputs(els.imgUploadFolder, els.imgUploadFolderNew)
            || resolveUploadFolderFromInputs(els.uploadFolderSelect, els.uploadFolderNew)
            || getStoredUploadFolder();

        showToast('Uploading image…');
        return uploadImageToAssets(file, folder).then(function (assetPath) {
            insertImageInEditor('../a_home_assets/' + assetPath, width >= 50 ? width : 0);
            showToast('Saved to a_home_assets/' + assetPath, 'success');
            if (els.imgUploadFolderNew) els.imgUploadFolderNew.value = '';
            if (els.uploadFolderNew) els.uploadFolderNew.value = '';
            refreshUploadFolderUI();
            return assetPath;
        }).catch(function (err) {
            var msg = (err && err.message) || 'Upload failed';
            if (msg === 'Failed to fetch' || msg.indexOf('NetworkError') !== -1) {
                msg = 'Start helper: node scripts/image-upload-server.js';
            }
            showToast(msg, 'error');
            return null;
        });
    }

    function getClipboardImageFile(clipboardData) {
        if (!clipboardData) return null;
        try {
            var files = clipboardData.files;
            if (files && files.length) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].type && files[i].type.indexOf('image/') === 0) {
                        return files[i];
                    }
                }
            }
            var items = clipboardData.items;
            if (items && items.length) {
                for (var j = 0; j < items.length; j++) {
                    if (items[j].kind === 'file' && items[j].type && items[j].type.indexOf('image/') === 0) {
                        var f = items[j].getAsFile();
                        if (f) return f;
                    }
                }
            }
        } catch (err) {
            return null;
        }
        return null;
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

    if (els.sortSelect) {
        els.sortSelect.value = docListSort;
        els.sortSelect.addEventListener('change', function () {
            docListSort = this.value;
            localStorage.setItem('ed-doc-sort', docListSort);
            renderDocList(els.filterInput.value);
        });
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
            updateCollectionMetaUI(docs[currentDocId]);
        }
    });

    collectionsCol.onSnapshot(function (snap) {
        collections = {};
        snap.forEach(function (colSnap) {
            collections[colSnap.id] = colSnap.data();
        });
        renderDocList(els.filterInput.value);
        if (currentDocId && docs[currentDocId]) {
            updateCollectionMetaUI(docs[currentDocId]);
        }
    });

    document.addEventListener('click', function () {
        closeOpenColMenu();
    });

    if (els.makeCollectionBtn) {
        els.makeCollectionBtn.addEventListener('click', function () {
            if (!currentDocId || !docs[currentDocId] || docs[currentDocId].collectionId) return;
            var nameInput = document.getElementById('ed-collection-name');
            nameInput.value = docs[currentDocId].title || '';
            openModal('ed-collection-modal');
            nameInput.focus();
        });
    }

    document.getElementById('ed-collection-cancel').addEventListener('click', function () {
        closeModal('ed-collection-modal');
    });
    document.getElementById('ed-collection-confirm').addEventListener('click', function () {
        var name = document.getElementById('ed-collection-name').value.trim();
        convertToCollection(name);
    });

    if (els.dissolveCollectionBtn) {
        els.dissolveCollectionBtn.addEventListener('click', function () {
            openModal('ed-dissolve-modal');
        });
    }
    document.getElementById('ed-dissolve-cancel').addEventListener('click', function () {
        closeModal('ed-dissolve-modal');
    });
    document.getElementById('ed-dissolve-confirm').addEventListener('click', dissolveCurrentCollection);

    if (els.moveIntoCollectionBtn) {
        els.moveIntoCollectionBtn.addEventListener('click', function () {
            if (!currentDocId || !docs[currentDocId]) return;
            openMoveModal({ mode: 'current-doc', docId: currentDocId });
        });
    }
    if (els.moveCancelBtn) {
        els.moveCancelBtn.addEventListener('click', closeMoveModal);
    }
    if (els.moveConfirmBtn) {
        els.moveConfirmBtn.addEventListener('click', confirmMoveModal);
    }
    if (els.moveModal) {
        els.moveModal.addEventListener('click', function (e) {
            if (e.target === this) closeMoveModal();
        });
    }
    if (els.moveCollectionSelect) {
        els.moveCollectionSelect.addEventListener('change', function () {
            fillMovePlacementSelect(this.value, null);
        });
    }

    document.getElementById('ed-section-cancel').addEventListener('click', function () {
        closeModal('ed-section-modal');
        editingSectionRef = null;
    });
    document.getElementById('ed-section-save').addEventListener('click', saveSectionModal);
    document.getElementById('ed-section-delete').addEventListener('click', deleteSectionFromModal);

    if (els.copyUrlBtn) {
        els.copyUrlBtn.addEventListener('click', function () {
            var val = els.publicUrlInput ? els.publicUrlInput.value : '';
            if (!val) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(val).then(function () {
                    showToast('URL copied', 'success');
                }).catch(function () {
                    showToast(val, 'success');
                });
            } else {
                els.publicUrlInput.select();
                document.execCommand('copy');
                showToast('URL copied', 'success');
            }
        });
    }

    if (els.navLabelInput) {
        els.navLabelInput.addEventListener('input', scheduleAutoSave);
    }
    [els.listOnProjects, els.listOnDevelopment, els.listOnUpdates].forEach(function (el) {
        if (el) el.addEventListener('change', scheduleAutoSave);
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

        try {
            var cd = e.clipboardData;
            if (!cd) return;

            var html = '';
            var text = '';
            try {
                html = cd.getData('text/html') || '';
                text = cd.getData('text/plain') || '';
            } catch (ignore) { /* some browsers restrict clipboard types */ }

            var imageFile = getClipboardImageFile(cd);
            var hasRemoteImg = !!(html && /<img[^>]+src\s*=\s*["']https?:\/\//i.test(html));
            var hasTextContent = !!(text && text.trim()) || !!(html && html.replace(/<[^>]+>/g, '').trim());

            // Only auto-upload pure image pastes (screenshots). Text/HTML pastes stay normal.
            // Avoid writing assets on every paste — that refreshes live-reload pages.
            if (imageFile && !hasRemoteImg && !hasTextContent) {
                handleUploadedImageFile(imageFile, 0);
                return;
            }

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
                        if (!el.parentNode) return;
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
        } catch (err) {
            console.error('Paste failed', err);
            showToast('Paste failed', 'error');
        }
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
        if (els.imgUploadFile) els.imgUploadFile.value = '';
        if (els.imgUploadFileName) els.imgUploadFileName.textContent = 'No file chosen';
        if (els.imgUploadWidth) els.imgUploadWidth.value = '';
        if (els.imgUploadFolderNew) els.imgUploadFolderNew.value = '';
        activateImgTab('url');
        setTimeout(function () { document.getElementById('ed-img-url').focus(); }, 50);
    });

    var imgTabs = document.querySelectorAll('#ed-img-modal [data-img-type]');
    var currentImgType = 'url';
    var pendingUploadFile = null;

    function activateImgTab(type) {
        currentImgType = type;
        imgTabs.forEach(function (tab) {
            tab.classList.toggle('ed-link-type-tab--active', tab.getAttribute('data-img-type') === type);
        });
        var label = document.getElementById('ed-img-label');
        var input = document.getElementById('ed-img-url');
        var isUpload = type === 'upload';
        if (els.imgUrlFields) els.imgUrlFields.style.display = isUpload ? 'none' : '';
        if (els.imgUploadFields) els.imgUploadFields.style.display = isUpload ? '' : 'none';
        var insertBtn = document.getElementById('ed-img-insert');
        if (insertBtn) insertBtn.textContent = isUpload ? 'Upload & Insert' : 'Insert';

        if (type === 'local') {
            label.textContent = 'Path from a_home_assets/';
            input.placeholder = 'content/img.png';
        } else if (!isUpload) {
            label.textContent = 'Image URL';
            input.placeholder = 'https://';
        }

        if (isUpload) {
            refreshUploadFolderUI();
            checkUploadHelper().then(updateUploadHint);
        }
    }

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

    if (els.imgUploadFile) {
        els.imgUploadFile.addEventListener('change', function () {
            pendingUploadFile = (this.files && this.files[0]) || null;
            if (els.imgUploadFileName) {
                els.imgUploadFileName.textContent = pendingUploadFile
                    ? pendingUploadFile.name
                    : 'No file chosen';
            }
        });
    }

    document.getElementById('ed-img-insert').addEventListener('click', function () {
        if (currentImgType === 'upload') {
            var file = pendingUploadFile || (els.imgUploadFile && els.imgUploadFile.files && els.imgUploadFile.files[0]);
            if (!file) {
                showToast('Choose an image file first', 'error');
                return;
            }
            var uploadWidth = parseInt(els.imgUploadWidth && els.imgUploadWidth.value, 10);
            closeModal('ed-img-modal');
            handleUploadedImageFile(file, uploadWidth);
            pendingUploadFile = null;
            return;
        }

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

    if (els.uploadImageBtn && els.uploadImageInput) {
        els.uploadImageBtn.addEventListener('mousedown', saveEditorSelection);
        els.uploadImageBtn.addEventListener('click', function () {
            els.uploadImageInput.value = '';
            els.uploadImageInput.click();
        });
        els.uploadImageInput.addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file) return;
            handleUploadedImageFile(file, 0);
            this.value = '';
        });
    }

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

    function loadPicManifest(force) {
        if (picManifest && !force) return Promise.resolve(picManifest);
        return fetch('../a_home_assets/manifest.json?t=' + Date.now())
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
            var selectedChart = document.querySelector('.ed-chart-container.ed-chart--selected');
            if (selectedChart && els.editor.contains(selectedChart)) {
                e.preventDefault();
                selectedChart.remove();
                scheduleAutoSave();
                showToast('Chart deleted', 'success');
                return;
            }
            var selectedMath = document.querySelector('.ed-math.ed-math--selected');
            if (selectedMath && els.editor.contains(selectedMath)) {
                e.preventDefault();
                selectedMath.remove();
                scheduleAutoSave();
                showToast('Math deleted', 'success');
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
        if (window.EdLatex) EdLatex.stripRendered(clone);
        var html = clone.innerHTML;
        if (window.LCN && LCN.canonicalizeContentHtmlForSave) {
            html = LCN.canonicalizeContentHtmlForSave(html);
        }
        return html;
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

    // ─── LaTeX / Math Feature ─────────────────────────────────────────────────
    var mathEls = {
        modal: document.getElementById('ed-math-modal'),
        source: document.getElementById('ed-math-source'),
        preview: document.getElementById('ed-math-preview'),
        insertBtn: document.getElementById('ed-math-insert'),
        cancelBtn: document.getElementById('ed-math-cancel'),
        modeTabs: document.getElementById('ed-math-mode-tabs')
    };
    var mathDisplayMode = false;
    var editingMathEl = null;

    function getMathMode() {
        return mathDisplayMode;
    }

    function setMathMode(display) {
        mathDisplayMode = !!display;
        if (!mathEls.modeTabs) return;
        mathEls.modeTabs.querySelectorAll('[data-math-mode]').forEach(function (tab) {
            var isActive = (tab.getAttribute('data-math-mode') === 'display') === mathDisplayMode;
            tab.classList.toggle('ed-link-type-tab--active', isActive);
        });
        updateMathPreview();
    }

    function updateMathPreview() {
        if (!mathEls.preview) return;
        var src = (mathEls.source && mathEls.source.value || '').trim();
        if (!src) {
            mathEls.preview.innerHTML = '<span class="ed-math-preview-placeholder">Type LaTeX to preview</span>';
            mathEls.preview.classList.toggle('ed-math-preview--display', mathDisplayMode);
            return;
        }
        mathEls.preview.innerHTML = '';
        mathEls.preview.classList.toggle('ed-math-preview--display', mathDisplayMode);
        if (!window.katex) {
            mathEls.preview.textContent = src;
            return;
        }
        try {
            katex.render(src, mathEls.preview, {
                displayMode: mathDisplayMode,
                throwOnError: false,
                strict: 'ignore'
            });
        } catch (err) {
            mathEls.preview.textContent = err && err.message ? err.message : 'Invalid LaTeX';
        }
    }

    function closeMathModal() {
        editingMathEl = null;
        if (mathEls.insertBtn) {
            mathEls.insertBtn.textContent = 'Insert';
            mathEls.insertBtn.onclick = insertMath;
        }
        closeModal('ed-math-modal');
    }

    function openMathModal(prefill) {
        editingMathEl = null;
        if (mathEls.source) {
            mathEls.source.value = prefill || '';
        }
        setMathMode(false);
        updateMathPreview();
        if (mathEls.insertBtn) {
            mathEls.insertBtn.textContent = 'Insert';
            mathEls.insertBtn.onclick = insertMath;
        }
        openModal('ed-math-modal');
        if (mathEls.source) {
            setTimeout(function () { mathEls.source.focus(); }, 30);
        }
    }

    function insertMath() {
        if (!window.EdLatex) {
            showToast('LaTeX engine not loaded', 'error');
            return;
        }
        var src = (mathEls.source && mathEls.source.value || '').trim();
        if (!src) {
            showToast('Enter LaTeX first', 'error');
            return;
        }

        var mathEl = EdLatex.createElement(src, getMathMode());
        var range = getEditorInsertionRange();
        els.editor.focus();
        range.deleteContents();
        range.insertNode(mathEl);

        if (!getMathMode()) {
            var spacer = document.createTextNode('\u00A0');
            range.setStartAfter(mathEl);
            range.insertNode(spacer);
            range.setStartAfter(spacer);
        } else {
            range.setStartAfter(mathEl);
        }
        range.collapse(true);
        setEditorSelection(range);

        bindMathEditorEvents(mathEl);
        closeMathModal();
        scheduleAutoSave();
        showToast('Math inserted', 'success');
    }

    function bindMathEditorEvents(mathEl) {
        if (!mathEl || mathEl._edMathBound) return;
        mathEl._edMathBound = true;

        mathEl.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('.ed-math.ed-math--selected').forEach(function (m) {
                m.classList.remove('ed-math--selected');
            });
            this.classList.add('ed-math--selected');
        });

        mathEl.addEventListener('dblclick', function (e) {
            e.preventDefault();
            e.stopPropagation();
            editMath(this);
        });
    }

    function editMath(mathEl) {
        if (!window.EdLatex || !mathEl) return;
        editingMathEl = mathEl;
        if (mathEls.source) mathEls.source.value = EdLatex.getSource(mathEl);
        setMathMode(EdLatex.isDisplay(mathEl));
        updateMathPreview();
        if (mathEls.insertBtn) {
            mathEls.insertBtn.textContent = 'Update';
            mathEls.insertBtn.onclick = function () {
                var src = (mathEls.source && mathEls.source.value || '').trim();
                if (!src) {
                    showToast('Enter LaTeX first', 'error');
                    return;
                }
                var display = getMathMode();
                var wasDisplay = EdLatex.isDisplay(mathEl);
                if (wasDisplay !== display) {
                    var replacement = EdLatex.createElement(src, display);
                    mathEl.parentNode.replaceChild(replacement, mathEl);
                    bindMathEditorEvents(replacement);
                } else {
                    EdLatex.render(mathEl, { source: src, display: display });
                    mathEl._edMathBound = false;
                    bindMathEditorEvents(mathEl);
                }
                closeMathModal();
                scheduleAutoSave();
                showToast('Math updated', 'success');
            };
        }
        openModal('ed-math-modal');
        if (mathEls.source) {
            setTimeout(function () { mathEls.source.focus(); }, 30);
        }
    }

    function rebindMath() {
        if (!window.EdLatex) return;
        EdLatex.renderAll(els.editor);
        els.editor.querySelectorAll('.ed-math').forEach(function (mathEl) {
            mathEl._edMathBound = false;
            bindMathEditorEvents(mathEl);
        });
    }

    els.editor.addEventListener('click', function (e) {
        if (!e.target.closest('.ed-math')) {
            document.querySelectorAll('.ed-math.ed-math--selected').forEach(function (m) {
                m.classList.remove('ed-math--selected');
            });
        }
    });

    if (mathEls.modeTabs) {
        mathEls.modeTabs.querySelectorAll('[data-math-mode]').forEach(function (tab) {
            tab.addEventListener('click', function () {
                setMathMode(this.getAttribute('data-math-mode') === 'display');
            });
        });
    }

    if (mathEls.source) {
        mathEls.source.addEventListener('input', updateMathPreview);
    }

    if (mathEls.insertBtn) {
        mathEls.insertBtn.addEventListener('click', insertMath);
    }

    if (mathEls.cancelBtn) {
        mathEls.cancelBtn.addEventListener('click', closeMathModal);
    }

    if (mathEls.modal) {
        mathEls.modal.addEventListener('click', function (e) {
            if (e.target === this) closeMathModal();
        });
    }

    var mathToolbarBtn = document.getElementById('ed-insert-math-btn');
    if (mathToolbarBtn) {
        mathToolbarBtn.addEventListener('mousedown', saveEditorSelection);
        mathToolbarBtn.addEventListener('click', function () {
            var sel = window.getSelection();
            var prefill = '';
            if (sel && sel.rangeCount && els.editor.contains(sel.anchorNode)) {
                prefill = sel.toString();
            }
            openMathModal(prefill);
        });
    }

    // ─── Settings (OpenAI BYOK) ───────────────────────────────────────────────
    function getStoredOpenAiKey() {
        try {
            return (localStorage.getItem(OPENAI_KEY_STORAGE) || '').trim();
        } catch (e) {
            return '';
        }
    }

    function setStoredOpenAiKey(key) {
        try {
            if (key) localStorage.setItem(OPENAI_KEY_STORAGE, key);
            else localStorage.removeItem(OPENAI_KEY_STORAGE);
        } catch (e) { /* ignore */ }
    }

    function openSettingsModal() {
        if (!els.settingsModal) return;
        if (els.openaiKeyInput) els.openaiKeyInput.value = getStoredOpenAiKey();
        if (els.uploadFolderNew) els.uploadFolderNew.value = '';
        refreshUploadFolderUI();
        els.settingsModal.classList.add('open');
        if (els.openaiKeyInput) {
            setTimeout(function () { els.openaiKeyInput.focus(); }, 30);
        }
    }

    function closeSettingsModal() {
        if (els.settingsModal) els.settingsModal.classList.remove('open');
    }

    if (els.settingsBtn) {
        els.settingsBtn.addEventListener('click', openSettingsModal);
    }
    if (els.settingsCancel) {
        els.settingsCancel.addEventListener('click', closeSettingsModal);
    }
    if (els.settingsSave) {
        els.settingsSave.addEventListener('click', function () {
            var key = (els.openaiKeyInput && els.openaiKeyInput.value || '').trim();
            setStoredOpenAiKey(key);
            var folder = resolveUploadFolderFromInputs(els.uploadFolderSelect, els.uploadFolderNew);
            if (folder) setStoredUploadFolder(folder);
            if (els.uploadFolderNew) els.uploadFolderNew.value = '';
            refreshUploadFolderUI();
            closeSettingsModal();
            showToast('Settings saved', 'success');
        });
    }
    if (els.settingsClear) {
        els.settingsClear.addEventListener('click', function () {
            if (els.openaiKeyInput) els.openaiKeyInput.value = '';
            setStoredOpenAiKey('');
            showToast('API key cleared', 'success');
        });
    }
    if (els.settingsModal) {
        els.settingsModal.addEventListener('click', function (e) {
            if (e.target === els.settingsModal) closeSettingsModal();
        });
    }

    refreshUploadFolderUI();

    // ─── Ask AI popup ─────────────────────────────────────────────────────────
    var aiSelectionRange = null;
    var aiSelectionText = '';
    var aiHighlightEl = null;
    var aiLoading = false;
    var aiHideTimer = null;
    // 'hidden' | 'chip' | 'compose'
    var aiMode = 'hidden';

    function isAiPopupTarget(node) {
        return !!(els.aiPopup && node && (node === els.aiPopup || els.aiPopup.contains(node)));
    }

    function setAiStatus(msg, isError) {
        if (!els.aiStatus) return;
        if (!msg) {
            els.aiStatus.hidden = true;
            els.aiStatus.textContent = '';
            els.aiStatus.classList.remove('ed-ai-popup-status--error');
            return;
        }
        els.aiStatus.hidden = false;
        els.aiStatus.textContent = msg;
        els.aiStatus.classList.toggle('ed-ai-popup-status--error', !!isError);
    }

    function setAiPreview(text) {
        if (!els.aiPreview) return;
        if (!text) {
            els.aiPreview.hidden = true;
            els.aiPreview.textContent = '';
            return;
        }
        var shown = text.length > 180 ? text.slice(0, 177) + '…' : text;
        els.aiPreview.hidden = false;
        els.aiPreview.textContent = shown;
        els.aiPreview.title = text;
    }

    function setAiStages(mode) {
        aiMode = mode;
        if (els.aiPopup) {
            els.aiPopup.classList.toggle('is-compose', mode === 'compose');
        }
        if (els.aiPromptStage) els.aiPromptStage.hidden = mode !== 'chip';
        if (els.aiComposeStage) els.aiComposeStage.hidden = mode !== 'compose';
    }

    function unwrapAiHighlight() {
        if (!aiHighlightEl || !aiHighlightEl.parentNode) {
            aiHighlightEl = null;
            return;
        }
        var parent = aiHighlightEl.parentNode;
        while (aiHighlightEl.firstChild) {
            parent.insertBefore(aiHighlightEl.firstChild, aiHighlightEl);
        }
        parent.removeChild(aiHighlightEl);
        parent.normalize();
        aiHighlightEl = null;
    }

    function wrapRangeInHighlight(range) {
        unwrapAiHighlight();
        var mark = document.createElement('mark');
        mark.className = 'ed-ai-highlight';
        try {
            range.surroundContents(mark);
        } catch (err) {
            var contents = range.extractContents();
            mark.appendChild(contents);
            range.insertNode(mark);
        }
        return mark;
    }

    function hideAiPopup() {
        if (aiLoading) return;
        if (!els.aiPopup) return;
        unwrapAiHighlight();
        els.aiPopup.hidden = true;
        setAiStages('hidden');
        if (els.aiInput) els.aiInput.value = '';
        setAiStatus('');
        setAiPreview('');
        aiSelectionRange = null;
        aiSelectionText = '';
    }

    function getEditorSelectionText() {
        var sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return '';
        var range = sel.getRangeAt(0);
        if (!isRangeInEditor(range)) return '';
        return (sel.toString() || '').replace(/\u00a0/g, ' ');
    }

    function positionAiPopupFromRect(rect) {
        if (!els.aiPopup || !rect) return;
        els.aiPopup.hidden = false;
        var popupW = els.aiPopup.offsetWidth || (aiMode === 'compose' ? 352 : 150);
        var popupH = els.aiPopup.offsetHeight || (aiMode === 'compose' ? 110 : 40);
        var gap = 10;
        var left = rect.left + rect.width / 2 - popupW / 2;
        var top = rect.top - popupH - gap;

        if (top < 8) top = rect.bottom + gap;
        left = Math.max(8, Math.min(left, window.innerWidth - popupW - 8));
        top = Math.max(8, Math.min(top, window.innerHeight - popupH - 8));

        els.aiPopup.style.left = left + 'px';
        els.aiPopup.style.top = top + 'px';
    }

    function positionAiPopup() {
        if (aiHighlightEl && aiHighlightEl.parentNode) {
            positionAiPopupFromRect(aiHighlightEl.getBoundingClientRect());
            return;
        }
        if (aiSelectionRange) {
            try {
                var rect = aiSelectionRange.getBoundingClientRect();
                if (rect && (rect.width || rect.height)) {
                    positionAiPopupFromRect(rect);
                    return;
                }
                var rects = aiSelectionRange.getClientRects();
                if (rects && rects.length) positionAiPopupFromRect(rects[0]);
            } catch (e) { /* stale range */ }
        }
    }

    // Stage 1: lightweight chip only — keeps native selection so delete/edit still work.
    function showAiChipFromSelection() {
        if (aiLoading) return;
        if (aiMode === 'compose') return;

        var sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
            hideAiPopup();
            return;
        }
        var range = sel.getRangeAt(0);
        if (!isRangeInEditor(range)) {
            hideAiPopup();
            return;
        }
        var text = (sel.toString() || '').replace(/\u00a0/g, ' ');
        if (!text.trim()) {
            hideAiPopup();
            return;
        }

        unwrapAiHighlight();
        aiSelectionRange = range.cloneRange();
        lastEditorRange = range.cloneRange();
        aiSelectionText = text;
        if (els.aiInput) els.aiInput.value = '';
        setAiStatus('');
        setAiPreview('');
        setAiStages('chip');
        positionAiPopup();
    }

    // Stage 2: lock selection + open input after explicit click.
    function openAiCompose() {
        if (aiLoading) return;

        var range = null;
        var text = '';
        var sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.rangeCount) {
            var live = sel.getRangeAt(0);
            if (isRangeInEditor(live)) {
                range = live.cloneRange();
                text = (sel.toString() || '').replace(/\u00a0/g, ' ');
            }
        }
        if ((!range || !text.trim()) && aiSelectionRange && isRangeInEditor(aiSelectionRange)) {
            range = aiSelectionRange.cloneRange();
            text = aiSelectionText || '';
        }
        if (!range || !String(text).trim()) {
            showToast('Select text first', 'error');
            hideAiPopup();
            return;
        }

        aiHighlightEl = wrapRangeInHighlight(range);
        aiSelectionText = (aiHighlightEl.textContent || text).replace(/\u00a0/g, ' ');
        var locked = document.createRange();
        locked.selectNodeContents(aiHighlightEl);
        aiSelectionRange = locked;
        lastEditorRange = locked.cloneRange();

        setAiStages('compose');
        setAiPreview(aiSelectionText.trim());
        setAiStatus('');
        if (els.aiInput) els.aiInput.value = '';
        positionAiPopup();

        if (sel) sel.removeAllRanges();
        if (els.aiInput) {
            setTimeout(function () {
                if (aiMode === 'compose' && !els.aiPopup.hidden) els.aiInput.focus();
            }, 0);
        }
    }

    function insertAiReplacement(text) {
        if (aiHighlightEl && aiHighlightEl.parentNode) {
            var parent = aiHighlightEl.parentNode;
            var frag = document.createDocumentFragment();
            var parts = String(text).split(/\n/);
            var lastNode = null;
            parts.forEach(function (part, idx) {
                if (idx > 0) {
                    lastNode = document.createElement('br');
                    frag.appendChild(lastNode);
                }
                if (part) {
                    lastNode = document.createTextNode(part);
                    frag.appendChild(lastNode);
                }
            });
            parent.insertBefore(frag, aiHighlightEl);
            parent.removeChild(aiHighlightEl);
            parent.normalize();
            aiHighlightEl = null;

            if (lastNode) {
                var after = document.createRange();
                after.setStartAfter(lastNode);
                after.collapse(true);
                els.editor.focus();
                setEditorSelection(after);
            }
            scheduleAutoSave();
            return true;
        }

        var range = aiSelectionRange;
        if (!range || !isRangeInEditor(range)) {
            range = lastEditorRange && isRangeInEditor(lastEditorRange) ? lastEditorRange.cloneRange() : null;
        }
        if (!range) return false;

        els.editor.focus();
        setEditorSelection(range);
        range = getEditorInsertionRange();
        range.deleteContents();

        var frag2 = document.createDocumentFragment();
        var parts2 = String(text).split(/\n/);
        parts2.forEach(function (part, idx) {
            if (idx > 0) frag2.appendChild(document.createElement('br'));
            if (part) frag2.appendChild(document.createTextNode(part));
        });
        var last = frag2.lastChild;
        range.insertNode(frag2);

        if (last) {
            var after2 = document.createRange();
            after2.setStartAfter(last);
            after2.collapse(true);
            setEditorSelection(after2);
        }

        scheduleAutoSave();
        return true;
    }

    function runAskAi() {
        if (aiLoading) return;
        var instruction = (els.aiInput && els.aiInput.value || '').trim();
        if (!instruction) {
            setAiStatus('Type what you want changed', true);
            if (els.aiInput) els.aiInput.focus();
            return;
        }

        if (aiHighlightEl && aiHighlightEl.parentNode) {
            aiSelectionText = (aiHighlightEl.textContent || '').replace(/\u00a0/g, ' ');
        }
        if (!aiSelectionText || !aiSelectionText.trim()) {
            setAiStatus('Select text first', true);
            return;
        }

        var apiKey = getStoredOpenAiKey();
        if (!apiKey) {
            hideAiPopup();
            openSettingsModal();
            showToast('Add your OpenAI API key', 'error');
            return;
        }

        var user = auth.currentUser;
        if (!user) {
            showToast('Sign in required', 'error');
            return;
        }

        aiLoading = true;
        if (els.aiPopup) els.aiPopup.classList.add('is-loading');
        if (els.aiSend) els.aiSend.disabled = true;
        if (els.aiInput) els.aiInput.disabled = true;
        if (els.aiAskBtn) els.aiAskBtn.disabled = true;
        setAiStatus('Thinking…');

        var selectionPayload = aiSelectionText;

        user.getIdToken().then(function (token) {
            return fetch(ASK_AI_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token
                },
                body: JSON.stringify({
                    apiKey: apiKey,
                    selection: selectionPayload,
                    instruction: instruction
                })
            });
        }).then(function (res) {
            return res.json().then(function (data) {
                return { ok: res.ok, status: res.status, data: data || {} };
            }).catch(function () {
                return { ok: false, status: res.status, data: { error: 'Invalid response' } };
            });
        }).then(function (result) {
            if (!result.ok || !result.data.text) {
                throw new Error((result.data && result.data.error) || 'Ask AI failed');
            }
            var ok = insertAiReplacement(result.data.text);
            aiLoading = false;
            if (els.aiPopup) els.aiPopup.classList.remove('is-loading');
            if (els.aiSend) els.aiSend.disabled = false;
            if (els.aiInput) els.aiInput.disabled = false;
            if (els.aiAskBtn) els.aiAskBtn.disabled = false;
            aiSelectionRange = null;
            aiSelectionText = '';
            if (els.aiPopup) els.aiPopup.hidden = true;
            setAiStages('hidden');
            if (els.aiInput) els.aiInput.value = '';
            setAiStatus('');
            setAiPreview('');
            if (ok) showToast('Updated selection', 'success');
            else showToast('Could not apply edit', 'error');
        }).catch(function (err) {
            aiLoading = false;
            if (els.aiPopup) els.aiPopup.classList.remove('is-loading');
            if (els.aiSend) els.aiSend.disabled = false;
            if (els.aiInput) els.aiInput.disabled = false;
            if (els.aiAskBtn) els.aiAskBtn.disabled = false;
            setAiStatus(err && err.message ? err.message : 'Ask AI failed', true);
        });
    }

    if (els.editor) {
        els.editor.addEventListener('mouseup', function (e) {
            if (isAiPopupTarget(e.target)) return;
            clearTimeout(aiHideTimer);
            aiHideTimer = setTimeout(function () {
                if (aiLoading) return;
                if (aiMode === 'compose') return;
                if (getEditorSelectionText().trim()) showAiChipFromSelection();
                else hideAiPopup();
            }, 10);
        });

        els.editor.addEventListener('contextmenu', function (e) {
            var text = getEditorSelectionText();
            if (!text.trim()) return;
            e.preventDefault();
            if (aiMode === 'compose') return;
            showAiChipFromSelection();
        });
    }

    if (els.aiAskBtn) {
        els.aiAskBtn.addEventListener('mousedown', function (e) {
            // Keep the native selection until compose locks it.
            e.preventDefault();
            e.stopPropagation();
        });
        els.aiAskBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openAiCompose();
        });
    }
    if (els.aiSend) {
        els.aiSend.addEventListener('click', function (e) {
            e.preventDefault();
            runAskAi();
        });
    }
    if (els.aiPopup) {
        els.aiPopup.addEventListener('mousedown', function (e) {
            e.stopPropagation();
        });
    }
    if (els.aiInput) {
        els.aiInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                runAskAi();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                if (!aiLoading) hideAiPopup();
            }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && els.aiPopup && !els.aiPopup.hidden && !aiLoading) {
            hideAiPopup();
            return;
        }
        // While only the chip is showing, typing/deleting should work normally.
        if (aiMode === 'chip' && !isAiPopupTarget(e.target)) {
            if (e.key === 'Backspace' || e.key === 'Delete' || (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)) {
                // Let the edit happen; hide chip shortly if selection collapses.
                clearTimeout(aiHideTimer);
                aiHideTimer = setTimeout(function () {
                    if (aiMode !== 'chip') return;
                    if (!getEditorSelectionText().trim()) hideAiPopup();
                    else showAiChipFromSelection();
                }, 30);
            }
        }
    });

    document.addEventListener('mousedown', function (e) {
        if (!els.aiPopup || els.aiPopup.hidden || aiLoading) return;
        if (isAiPopupTarget(e.target)) return;
        if (els.editor && els.editor.contains(e.target)) {
            if (aiMode === 'compose') {
                unwrapAiHighlight();
                setAiStages('hidden');
                els.aiPopup.hidden = true;
                if (els.aiInput) els.aiInput.value = '';
                setAiStatus('');
                setAiPreview('');
                aiSelectionRange = null;
                aiSelectionText = '';
            }
            return;
        }
        hideAiPopup();
    });

    document.addEventListener('selectionchange', function () {
        if (!els.aiPopup || els.aiPopup.hidden || aiLoading) return;
        if (aiMode === 'compose') return;
        if (isAiPopupTarget(document.activeElement)) return;
        clearTimeout(aiHideTimer);
        aiHideTimer = setTimeout(function () {
            if (aiLoading || aiMode === 'compose') return;
            if (isAiPopupTarget(document.activeElement)) return;
            if (!getEditorSelectionText().trim()) hideAiPopup();
        }, 80);
    });

    window.addEventListener('scroll', function () {
        if (!els.aiPopup || els.aiPopup.hidden) return;
        try {
            positionAiPopup();
        } catch (e) { /* range may be stale */ }
    }, true);
    
    } // End initEditor function
})();
