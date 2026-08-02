const tacoImages = document.querySelectorAll('.firetaco img');
let tacoFrame = 0;
let tacoIntervalId = null;

function setTimeGreeting() {
    const greetingEl = document.getElementById('user-greeting');
    if (!greetingEl) return;

    const hour = new Date().getHours();
    let greeting = 'Good evening';

    if (hour < 12) {
        greeting = 'Good morning';
    } else if (hour < 17) {
        greeting = 'Good afternoon';
    }

    greetingEl.textContent = greeting;
}

function animateTaco() {
    tacoImages.forEach(img => {
        img.style.display = 'none';
    });

    tacoImages[tacoFrame].style.display = 'block';
    tacoFrame = (tacoFrame + 1) % tacoImages.length;
}

function startTacoAnimation() {
    if (tacoImages.length === 0 || tacoIntervalId) return;

    tacoImages.forEach((img, index) => {
        img.style.display = index === 0 ? 'block' : 'none';
    });

    tacoIntervalId = setInterval(animateTaco, 1000 / 12);
}

// Opening screen sequence
const openingContainer = document.querySelector('.opening-screen');
const openingScreens = document.querySelectorAll('.opening-screen .screen');
const SKIP_OPENING_KEY = 'lacosta-skip-opening';

function startHeroAnimations() {
    document.body.classList.add('opening-complete');
    startTacoAnimation();
}

function setActiveOpeningScreen(index) {
    openingScreens.forEach((screen, i) => {
        const isVisible = i === index;
        screen.classList.toggle('is-visible', isVisible);
        screen.style.display = isVisible ? 'flex' : 'none';
    });
}

function skipOpeningSequence() {
    if (!openingContainer) {
        startHeroAnimations();
        return;
    }

    openingScreens.forEach(screen => {
        screen.classList.remove('is-visible');
        screen.style.display = 'none';
    });
    openingContainer.style.display = 'none';
    startHeroAnimations();
}

function runOpeningSequence() {
    setTimeGreeting();

    if (sessionStorage.getItem(SKIP_OPENING_KEY) === 'true') {
        sessionStorage.removeItem(SKIP_OPENING_KEY);
        skipOpeningSequence();
        return;
    }

    if (!openingContainer || openingScreens.length === 0) {
        startHeroAnimations();
        return;
    }

    openingScreens.forEach(screen => {
        screen.classList.remove('is-visible');
        screen.style.display = 'none';
    });

    const screenDuration = 500;

    function showScreen(index) {
        if (index >= openingScreens.length) {
            openingContainer.classList.add('slide-up');
            openingContainer.addEventListener('animationend', () => {
                openingContainer.style.display = 'none';
                startHeroAnimations();
            }, { once: true });
            return;
        }

        setActiveOpeningScreen(index);
        setTimeout(() => showScreen(index + 1), screenDuration);
    }

    requestAnimationFrame(() => showScreen(0));
}

document.querySelectorAll('a[href="menu.html"], a[href="points.html"]').forEach(link => {
    link.addEventListener('click', () => {
        sessionStorage.setItem(SKIP_OPENING_KEY, 'true');
    });
});

function syncTopBarPoints() {
    const pointsEl = document.querySelector('.user-top-bar__points-value');
    if (!pointsEl) return;

    const stored = localStorage.getItem('lacosta-points');
    if (stored !== null) {
        const value = parseInt(stored, 10);
        if (Number.isFinite(value)) pointsEl.textContent = String(value);
    }
}

syncTopBarPoints();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runOpeningSequence);
} else {
    runOpeningSequence();
}

// ============================================
// MIRES SPIN ON CLICK
// ============================================
const mires = document.querySelector('.mires');

if (mires) {
    let isAnimating = false;

    mires.addEventListener('click', (e) => {
        e.preventDefault();

        if (isAnimating) return;
        isAnimating = true;

        mires.classList.add('spin');

        mires.addEventListener('animationend', () => {
            mires.classList.remove('spin');
            isAnimating = false;
        }, { once: true });
    });
}

// ============================================
// USER TOP BAR — hide on scroll down, show on scroll up
// ============================================
const userTopBar = document.querySelector('.user-top-bar');

if (userTopBar) {
    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateTopBarVisibility() {
        const currentScrollY = window.scrollY;

        if (currentScrollY <= 12) {
            userTopBar.classList.remove('user-top-bar--hidden');
        } else if (currentScrollY > lastScrollY + 4) {
            userTopBar.classList.add('user-top-bar--hidden');
        } else if (currentScrollY < lastScrollY - 4) {
            userTopBar.classList.remove('user-top-bar--hidden');
        }

        lastScrollY = currentScrollY;
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateTopBarVisibility);
            ticking = true;
        }
    }, { passive: true });
}
