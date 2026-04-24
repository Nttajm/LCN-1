const elems = Array.from(document.querySelectorAll('.elem'));
const elemHolder = document.querySelector('.elem-holder');
const sections = document.querySelectorAll('.category-section');
const gridItems = document.querySelectorAll('.grid-item');

let currentIndex = elems.findIndex(elem => elem.classList.contains('current'));
let programmaticScroll = false;

function updatePosition() {
    const offset = -currentIndex * 25; // Each elem is 25px tall
    elemHolder.style.transform = `translateY(calc(-50% + ${offset}px))`;
}

function switchToIndex(index, doScroll = false) {
    if (index < 0 || index >= elems.length || index === currentIndex) return;
    
    elems[currentIndex].classList.remove('current');
    currentIndex = index;
    elems[currentIndex].classList.add('current');
    updatePosition();

    if (doScroll) {
        programmaticScroll = true;
        const targetId = elems[index].dataset.target;
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => { programmaticScroll = false; }, 800);
        }
    }
}

// Initialize position
updatePosition();

// Arrow key navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
            switchToIndex(currentIndex - 1, true);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < elems.length - 1) {
            switchToIndex(currentIndex + 1, true);
        }
    }
});

// Click navigation
elems.forEach((elem, index) => {
    elem.addEventListener('click', () => {
        switchToIndex(index, true);
    });
});

// Scroll-based dial sync
function handleScroll() {
    if (programmaticScroll) return;
    const windowHeight = window.innerHeight;

    sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < windowHeight * 0.4 && rect.top > -rect.height + windowHeight * 0.4) {
            if (index !== currentIndex) {
                switchToIndex(index, false);
            }
        }
    });
}

// Reveal effect for grid items
function handleRevealEffect(elements) {
    elements.forEach(element => {
        element.addEventListener('mousemove', (e) => {
            const rect = element.getBoundingClientRect();
            element.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            element.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
        element.addEventListener('mouseenter', () => element.classList.add('reveal-active'));
        element.addEventListener('mouseleave', () => element.classList.remove('reveal-active'));
    });
}

handleRevealEffect(gridItems);
window.addEventListener('scroll', handleScroll, { passive: true });
