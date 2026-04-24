const burger = document.querySelector('.nav-burger');
const navLinks = document.querySelector('.nav-links');

burger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    burger.classList.toggle('is-open', isOpen);
    burger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
});

navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
        navLinks.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    });
});

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            entry.target.style.transitionDelay = (i * 0.12) + 's';
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const reviewsWrap = document.querySelector('.reviews-track-wrap');
const reviewsTrack = document.querySelector('.reviews-track');

if (reviewsWrap && reviewsTrack) {
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;

    reviewsWrap.addEventListener('mousedown', e => {
        isDragging = true;
        startX = e.pageX - reviewsWrap.offsetLeft;
        scrollLeft = reviewsWrap.scrollLeft;
    });

    reviewsWrap.addEventListener('mouseleave', () => { isDragging = false; });
    reviewsWrap.addEventListener('mouseup', () => { isDragging = false; });

    reviewsWrap.addEventListener('mousemove', e => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - reviewsWrap.offsetLeft;
        reviewsWrap.scrollLeft = scrollLeft - (x - startX);
    });

    reviewsWrap.addEventListener('touchstart', e => {
        startX = e.touches[0].pageX;
        scrollLeft = reviewsWrap.scrollLeft;
    }, { passive: true });

    reviewsWrap.addEventListener('touchmove', e => {
        const x = e.touches[0].pageX;
        reviewsWrap.scrollLeft = scrollLeft - (x - startX);
    }, { passive: true });
}

document.querySelectorAll('.nav-links a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
