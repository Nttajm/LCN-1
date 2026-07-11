(function () {
    var nav = document.querySelector('.nav-mobile');
    var hamburger = document.querySelector('.hamburger-icon');
    var menu = document.querySelector('.nav-menu');

    if (!nav) return;

    var lastScroll = 0;
    var threshold = 8;
    var menuOpen = false;

    function setMenuOpen(open) {
        menuOpen = open;

        if (hamburger) {
            hamburger.classList.toggle('is-open', open);
            hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
            hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        }

        if (menu) {
            menu.classList.toggle('is-open', open);
            menu.setAttribute('aria-hidden', open ? 'false' : 'true');
        }

        document.body.classList.toggle('nav-menu-open', open);
    }

    if (hamburger && menu) {
        hamburger.addEventListener('click', function (event) {
            event.stopPropagation();
            setMenuOpen(!menuOpen);
        });
    }

    document.addEventListener('click', function (event) {
        if (!menuOpen) return;

        if (menu && !menu.contains(event.target) && hamburger && !hamburger.contains(event.target)) {
            setMenuOpen(false);
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            setMenuOpen(false);
        }
    });

    window.addEventListener('scroll', function () {
        var current = window.scrollY || window.pageYOffset;

        if (menuOpen) {
            nav.classList.remove('nav-mobile--hidden');
            lastScroll = current;
            return;
        }

        if (current <= 0) {
            nav.classList.remove('nav-mobile--hidden');
        } else if (current > lastScroll + threshold && current > nav.offsetHeight) {
            nav.classList.add('nav-mobile--hidden');
        } else if (current < lastScroll - threshold) {
            nav.classList.remove('nav-mobile--hidden');
        }

        lastScroll = current;
    }, { passive: true });
})();
