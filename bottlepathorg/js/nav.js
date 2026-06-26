(function () {
    var nav = document.querySelector('.nav-mobile');
    if (!nav) return;

    var lastScroll = 0;
    var threshold = 8;

    window.addEventListener('scroll', function () {
        var current = window.scrollY || window.pageYOffset;

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
