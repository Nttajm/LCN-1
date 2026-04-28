(function () {
    const _src = document.currentScript;

    function resolveBase() {
        if (_src && _src.src) {
            const m = _src.src.match(/^(.*\/)js\/nav\.js/);
            if (m) return m[1];
        }
        return './';
    }

    const BASE = resolveBase();

    const GAMES = [
        {
            name: 'Nerdle',
            desc: 'Guess the 5-letter word in 6 tries.',
            href: BASE + 'nerdle/index.html',
            bg: '#D6E4F5',
            available: true,
            icon: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="9" height="9" rx="1" fill="#3a7ec4"/><rect x="16" y="8" width="9" height="9" rx="1" fill="#c9b458"/><rect x="28" y="8" width="9" height="9" rx="1" fill="#3a7ec4"/><rect x="4" y="20" width="9" height="9" rx="1" fill="#818384"/><rect x="16" y="20" width="9" height="9" rx="1" fill="#3a7ec4"/><rect x="28" y="20" width="9" height="9" rx="1" fill="#818384"/><rect x="4" y="32" width="9" height="9" rx="1" fill="#c9b458"/><rect x="16" y="32" width="9" height="9" rx="1" fill="#818384"/><rect x="28" y="32" width="9" height="9" rx="1" fill="#3a7ec4"/></svg>'
        },
        // {
        //     name: 'The Crossword',
        //     desc: 'A challenging daily crossword puzzle.',
        //     href: BASE + 'crossword.html',
        //     bg: '#C2D0E8',
        //     available: true,
        //     icon: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="44" height="44" rx="5" fill="white"/><rect x="2" y="2" width="44" height="44" rx="5" stroke="#ccc" stroke-width="1"/><rect x="7" y="7" width="7" height="7" fill="#121212"/><rect x="17" y="7" width="7" height="7" fill="#121212"/><rect x="27" y="7" width="7" height="7" fill="white"/><rect x="34" y="7" width="7" height="7" fill="#121212"/><rect x="7" y="17" width="7" height="7" fill="white"/><rect x="17" y="17" width="7" height="7" fill="#121212"/><rect x="27" y="17" width="7" height="7" fill="#121212"/><rect x="34" y="17" width="7" height="7" fill="white"/><rect x="7" y="27" width="7" height="7" fill="#121212"/><rect x="17" y="27" width="7" height="7" fill="white"/><rect x="27" y="27" width="7" height="7" fill="white"/><rect x="34" y="27" width="7" height="7" fill="#121212"/><rect x="7" y="34" width="7" height="7" fill="white"/><rect x="17" y="34" width="7" height="7" fill="#121212"/><rect x="27" y="34" width="7" height="7" fill="#121212"/><rect x="34" y="34" width="7" height="7" fill="white"/></svg>'
        // },
        {
            name: 'Relations',
            desc: 'Find four groups of items that share something.',
            href: '#',
            bg: '#C5B4E3',
            available: true,
            icon: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="10" height="10" rx="1.5" fill="#6A4C93"/><rect x="18" y="4" width="10" height="10" rx="1.5" fill="#6A4C93"/><rect x="32" y="4" width="10" height="10" rx="1.5" fill="#C77DBA"/><rect x="4" y="18" width="10" height="10" rx="1.5" fill="#C77DBA"/><rect x="18" y="18" width="10" height="10" rx="1.5" fill="#6A4C93"/><rect x="32" y="18" width="10" height="10" rx="1.5" fill="#6A4C93"/><rect x="4" y="32" width="10" height="10" rx="1.5" fill="#6A4C93"/><rect x="18" y="32" width="10" height="10" rx="1.5" fill="#C77DBA"/><rect x="32" y="32" width="10" height="10" rx="1.5" fill="#C77DBA"/></svg>'
        }
    ];

    const CSS = `
        .tt-nav-overlay {
            position: fixed;
            inset: 0;
            z-index: 99999;
            visibility: hidden;
            pointer-events: none;
        }
        .tt-nav-overlay.open {
            visibility: visible;
            pointer-events: all;
        }
        .tt-nav-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .tt-nav-overlay.open .tt-nav-backdrop {
            opacity: 1;
        }
        .tt-nav-panel {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 22rem;
            max-width: 100vw;
            background: #ffffff;
            transform: translateX(100%);
            transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            overscroll-behavior: contain;
        }
        .tt-nav-overlay.open .tt-nav-panel {
            transform: translateX(0);
        }
        .tt-nav-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.125rem;
            border-bottom: 1px solid #e8e8e8;
            flex-shrink: 0;
        }
        .tt-nav-brand {
            display: flex;
            align-items: center;
            gap: 0.625rem;
            text-decoration: none;
            color: #121212;
        }
        .tt-nav-brand-icon {
            width: 2.125rem;
            height: 2.125rem;
            flex-shrink: 0;
        }
        .tt-nav-brand-text {
            display: flex;
            flex-direction: column;
            gap: 0.05rem;
            line-height: 1;
        }
        .tt-nav-brand-name {
            font-family: 'Noto Serif', Georgia, serif;
            font-weight: 700;
            font-size: 1rem;
            color: #121212;
            letter-spacing: -0.01em;
        }
        .tt-nav-brand-sub {
            font-family: 'Libre Franklin', Arial, sans-serif;
            font-size: 0.625rem;
            font-weight: 600;
            color: #6a6a6a;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }
        .tt-nav-close {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.375rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #121212;
            border-radius: 50%;
            transition: background 0.15s;
        }
        .tt-nav-close:hover {
            background: #f0f0f0;
        }
        .tt-nav-close svg {
            width: 1.25rem;
            height: 1.25rem;
        }
        .tt-nav-section-label {
            font-family: 'Libre Franklin', Arial, sans-serif;
            font-size: 0.6875rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #6a6a6a;
            padding: 1.25rem 1.25rem 0.625rem;
            margin: 0;
        }
        .tt-nav-list {
            list-style: none;
            margin: 0;
            padding: 0;
            flex: 1;
        }
        .tt-nav-item a {
            display: flex;
            align-items: center;
            gap: 0.875rem;
            padding: 0.875rem 1.25rem;
            text-decoration: none;
            border-bottom: 1px solid #f0f0f0;
            transition: background 0.15s;
        }
        .tt-nav-item a:hover {
            background: #fafafa;
        }
        .tt-nav-item.unavailable a {
            opacity: 0.55;
            pointer-events: none;
            cursor: default;
        }
        .tt-nav-thumb {
            width: 3.25rem;
            height: 3.25rem;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .tt-nav-thumb svg {
            width: 2.375rem;
            height: 2.375rem;
        }
        .tt-nav-item-info {
            flex: 1;
            min-width: 0;
        }
        .tt-nav-item-name {
            font-family: 'Noto Serif', Georgia, serif;
            font-weight: 700;
            font-size: 0.9375rem;
            color: #121212;
            display: block;
            line-height: 1.2;
        }
        .tt-nav-item-desc {
            font-family: 'Libre Franklin', Arial, sans-serif;
            font-size: 0.75rem;
            color: #6a6a6a;
            display: block;
            margin-top: 0.2rem;
            line-height: 1.35;
        }
        .tt-nav-item-badge {
            font-family: 'Libre Franklin', Arial, sans-serif;
            font-size: 0.5625rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 0.2rem 0.45rem;
            border-radius: 0.25rem;
            background: #6a6a6a;
            color: white;
            flex-shrink: 0;
        }
        .tt-nav-arrow {
            color: #b0b0b0;
            flex-shrink: 0;
        }
        .tt-nav-arrow svg {
            width: 1rem;
            height: 1rem;
            display: block;
        }
        .tt-nav-footer {
            padding: 1.25rem;
            border-top: 1px solid #e8e8e8;
            flex-shrink: 0;
        }
        .tt-nav-footer-link {
            display: block;
            text-align: center;
            font-family: 'Libre Franklin', Arial, sans-serif;
            font-size: 0.8125rem;
            font-weight: 600;
            color: #121212;
            text-decoration: none;
            padding: 0.75rem;
            border: 1px solid #d0d0d0;
            border-radius: 2rem;
            transition: background 0.15s;
        }
        .tt-nav-footer-link:hover {
            background: #f5f5f5;
        }
        @media (max-width: 30rem) {
            .tt-nav-panel {
                width: 100vw;
            }
        }
    `;

    function injectStyles() {
        if (document.getElementById('tt-nav-styles')) return;
        const style = document.createElement('style');
        style.id = 'tt-nav-styles';
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    function buildGameItems() {
        return GAMES.map(function (g) {
            const right = g.available
                ? '<span class="tt-nav-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></span>'
                : '<span class="tt-nav-item-badge">Soon</span>';
            return `<li class="tt-nav-item${g.available ? '' : ' unavailable'}">
                <a href="${g.href}">
                    <div class="tt-nav-thumb" style="background:${g.bg}">${g.icon}</div>
                    <div class="tt-nav-item-info">
                        <span class="tt-nav-item-name">${g.name}</span>
                        <span class="tt-nav-item-desc">${g.desc}</span>
                    </div>
                    ${right}
                </a>
            </li>`;
        }).join('');
    }

    function buildPanel() {
        const div = document.createElement('div');
        div.className = 'tt-nav-overlay';
        div.id = 'ttNavOverlay';
        div.innerHTML = `
            <div class="tt-nav-backdrop" id="ttNavBackdrop"></div>
            <div class="tt-nav-panel" role="dialog" aria-modal="true" aria-label="Games navigation">
                <div class="tt-nav-header">
                    <a href="${BASE}index.html" class="tt-nav-brand">
                        <svg class="tt-nav-brand-icon" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="34" height="34" rx="5" fill="#121212"/>
                            <text x="7" y="25" font-family="Georgia, serif" font-weight="700" font-size="22" fill="white">T</text>
                        </svg>
                        <div class="tt-nav-brand-text">
                            <span class="tt-nav-brand-name">Titan Times</span>
                            <span class="tt-nav-brand-sub">Games</span>
                        </div>
                    </a>
                    <button class="tt-nav-close" id="ttNavClose" aria-label="Close menu">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <p class="tt-nav-section-label">All Games</p>
                <ul class="tt-nav-list">${buildGameItems()}</ul>
                <div class="tt-nav-footer">
                    <a href="${BASE}index.html" class="tt-nav-footer-link">See all games</a>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        return div;
    }

    function open(overlay) {
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function close(overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    function init() {
        injectStyles();
        const overlay = buildPanel();

        document.querySelectorAll('.nav-trigger').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                open(overlay);
            });
        });

        document.getElementById('ttNavClose').addEventListener('click', function () {
            close(overlay);
        });

        document.getElementById('ttNavBackdrop').addEventListener('click', function () {
            close(overlay);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.classList.contains('open')) {
                close(overlay);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
