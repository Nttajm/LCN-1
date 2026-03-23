(function () {
    const root = document.currentScript ? document.currentScript.getAttribute('data-root') || '' : '';

    const nav = document.createElement('nav');
    nav.innerHTML = `
    <div class="nav-inner">
    <div class="logo">
      <a href="${root}index.html"><h1>LCN</h1></a>
    </div>
    <ul class="nav-links">
      <li><a href="${root}#">Projects</a></li>
      <li><a href="${root}#">DBNM</a></li>
      <li><a href="${root}#">Games</a></li>
      <li><a href="${root}#">Team</a></li>
    </ul>
    <div class="search" id="search-trigger">
      <div class="search-bar">
        <input type="text" placeholder="Search..." readonly id="nav-search-input">
        <button class="search-arrow" id="search-open-btn" aria-label="Open search">
          <span class="icon-arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 17L17 7M17 7H9M17 7v8"/>
            </svg>
          </span>
          <span class="icon-close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </span>
        </button>
      </div>
    </div>
    </div>`;

    const dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    dropdown.id = 'search-dropdown';
    dropdown.innerHTML = `
    <div class="search-overlay" id="search-overlay"></div>
    <div class="search-dropdown-panel">
      <div class="search-dropdown-inner">
        <div class="search-full-bar">
          <input type="text" placeholder="Search..." id="search-full-input" autocomplete="off">
          <button class="search-submit" id="search-submit-btn" aria-label="Submit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 17L17 7M17 7H9M17 7v8"/>
            </svg>
          </button>
        </div>
        <div class="search-divider"></div>
        <div class="search-hints">
          <span class="hint-label">Quick links</span>
          <div class="hint-chips">
            <a href="${root}#" class="hint-chip">Projects</a>
            <a href="${root}#" class="hint-chip">About</a>
          </div>
        </div>
        <div class="search-results" id="search-results"></div>
      </div>
    </div>`;

    const favicon = document.createElement('link');
    favicon.rel = 'shortcut icon';
    favicon.href = root + 'images/tealcircle.png';
    document.head.appendChild(favicon);

    document.body.insertAdjacentElement('afterbegin', dropdown);
    document.body.insertAdjacentElement('afterbegin', nav);

    document.addEventListener('DOMContentLoaded', () => {
        const footer = document.createElement('footer');
        footer.className = 'site-footer';
        footer.innerHTML = `<span class="site-footer-copy">&copy; LCN 2022&ndash;2026</span>`;
        document.body.insertAdjacentElement('beforeend', footer);
    });

    const mainCont = document.getElementById('main-cont');
    const fullInput = document.getElementById('search-full-input');
    const openBtn = document.getElementById('search-open-btn');
    const overlay = document.getElementById('search-overlay');
    const searchBar = document.querySelector('.search-bar');
    const searchResults = document.getElementById('search-results');

    let allDocs = [];
    let searchDebounce = null;

    function initFirebaseSearch() {
        if (typeof firebase === 'undefined') return;
        if (!firebase.apps.length) {
            firebase.initializeApp({
                apiKey: "AIzaSyBh8O0qR9FjRz30Si3-xxToRaPe2vsK9wg",
                authDomain: "lcnfoundation-registry.firebaseapp.com",
                projectId: "lcnfoundation-registry",
                storageBucket: "lcnfoundation-registry.firebasestorage.app",
                messagingSenderId: "472081807534",
                appId: "1:472081807534:web:eed62912dd832743e4553f",
                measurementId: "G-FJB125MV97"
            });
        }
        const db = firebase.firestore();
        db.collection('editor_docs')
            .where('published', '==', true)
            .onSnapshot(function (snap) {
                allDocs = [];
                snap.forEach(function (doc) {
                    allDocs.push(Object.assign({ id: doc.id }, doc.data()));
                });
            });
    }

    function resolveImageSrc(url) {
        if (!url) return '';
        if (url.startsWith('a_home_assets/')) return root + url;
        return url;
    }

    function formatSearchDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function renderSearchResults(query) {
        searchResults.innerHTML = '';
        if (!query) {
            searchResults.classList.remove('has-results');
            return;
        }

        const q = query.toLowerCase();
        const matches = allDocs.filter(function (doc) {
            const title = (doc.title || '').toLowerCase();
            const sub = (doc.subDesc || '').toLowerCase();
            const cat = (doc.category || '').toLowerCase();
            const subCat = (doc.subCategory || '').toLowerCase();
            return title.includes(q) || sub.includes(q) || cat.includes(q) || subCat.includes(q);
        }).slice(0, 8);

        if (!matches.length) {
            searchResults.classList.remove('has-results');
            const empty = document.createElement('div');
            empty.className = 'search-results-empty';
            empty.textContent = 'No results found';
            searchResults.appendChild(empty);
            searchResults.classList.add('has-results');
            return;
        }

        searchResults.classList.add('has-results');

        matches.forEach(function (doc, i) {
            const item = document.createElement('a');
            item.className = 'search-result-item';
            item.href = root + 'index/article.html?id=' + doc.id;
            item.style.animationDelay = (i * 60) + 'ms';

            const imgSrc = doc.images && doc.images.length ? resolveImageSrc(doc.images[0]) : '';

            const leftHtml = imgSrc
                ? '<div class="sr-img"><img src="' + imgSrc + '" alt=""></div>'
                : '<div class="sr-img sr-img-empty"></div>';

            const dateHtml = doc.date
                ? '<span class="sr-date">' + formatSearchDate(doc.date) + '</span>'
                : '';

            item.innerHTML =
                '<div class="sr-left">' +
                    leftHtml +
                    dateHtml +
                '</div>' +
                '<div class="sr-right">' +
                    '<span class="sr-title">' + (doc.title || 'Untitled') + '</span>' +
                    '<span class="sr-sub">' + (doc.subDesc || '') + '</span>' +
                '</div>';

            searchResults.appendChild(item);
        });
    }

    function openSearch() {
        dropdown.classList.add('open');
        if (mainCont) mainCont.classList.add('blurred');
        openBtn.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        setTimeout(() => fullInput.focus(), 300);
    }

    function closeSearch() {
        dropdown.classList.remove('open');
        if (mainCont) mainCont.classList.remove('blurred');
        openBtn.classList.remove('is-open');
        document.body.style.overflow = '';
        fullInput.value = '';
        searchResults.innerHTML = '';
        searchResults.classList.remove('has-results');
    }

    searchBar.addEventListener('click', openSearch);
    overlay.addEventListener('click', closeSearch);

    openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.contains('open') ? closeSearch() : openSearch();
    });

    fullInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            renderSearchResults(fullInput.value.trim());
        }, 220);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSearch();
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            openSearch();
        }
    });

    document.getElementById('search-submit-btn').addEventListener('click', () => {
        if (fullInput.value.trim()) closeSearch();
    });

    initFirebaseSearch();
})();
