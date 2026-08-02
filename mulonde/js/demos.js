const elems = Array.from(document.querySelectorAll('.elem'));
const elemHolder = document.querySelector('.elem-holder');
const dail = document.querySelector('.dail');
const sections = document.querySelectorAll('.category-section');
const gridItems = document.querySelectorAll('.grid-item');

// Dial UI is optional (single-tier demos pages may omit it)
if (!elems.length || !elemHolder || !dail) {
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
} else {

let currentIndex = elems.findIndex(elem => elem.classList.contains('current'));
if (currentIndex < 0) currentIndex = 0;
let programmaticScroll = false;

function updatePosition() {
    elemHolder.style.transition = 'transform 0.3s ease';
    const offset = -currentIndex * 25;
    elemHolder.style.transform = `translateY(calc(-50% + ${offset}px))`;
}

function scrollToSection(index) {
    programmaticScroll = true;
    const targetSection = document.getElementById(elems[index].dataset.target);
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => { programmaticScroll = false; }, 800);
    }
}

function switchToIndex(index, doScroll = false) {
    if (index < 0 || index >= elems.length) return;
    elems[currentIndex].classList.remove('current');
    currentIndex = index;
    elems[currentIndex].classList.add('current');
    updatePosition();
    if (doScroll) scrollToSection(index);
}

updatePosition();

// Arrow key navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) switchToIndex(currentIndex - 1, true);
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < elems.length - 1) switchToIndex(currentIndex + 1, true);
    }
});

// Click navigation
elems.forEach((elem, index) => {
    elem.addEventListener('click', () => {
        if (!wasDragging) switchToIndex(index, true);
    });
});

// Drag / touch navigation
let dragStartY = null;
let dragStartIndex = null;
let isDragging = false;
let wasDragging = false;

const ITEM_HEIGHT = 25;
const MIN_OFFSET = -(elems.length - 1) * ITEM_HEIGHT;
const MAX_OFFSET = 0;

function getDragIndex(deltaY) {
    return Math.max(0, Math.min(elems.length - 1, Math.round(dragStartIndex - deltaY / ITEM_HEIGHT)));
}

function applyDragTransform(deltaY) {
    let raw = -dragStartIndex * ITEM_HEIGHT + deltaY;
    // Rubber-band at edges
    if (raw > MAX_OFFSET) raw = MAX_OFFSET + (raw - MAX_OFFSET) * 0.25;
    if (raw < MIN_OFFSET) raw = MIN_OFFSET + (raw - MIN_OFFSET) * 0.25;

    elemHolder.style.transition = 'none';
    elemHolder.style.transform = `translateY(calc(-50% + ${raw}px))`;

    const tentative = getDragIndex(deltaY);
    if (tentative !== currentIndex) {
        elems[currentIndex].classList.remove('current');
        currentIndex = tentative;
        elems[currentIndex].classList.add('current');
    }
}

function endDrag(clientY) {
    if (!isDragging) return;
    isDragging = false;
    dail.classList.remove('dragging');

    const finalIndex = getDragIndex(clientY - dragStartY);
    elems[currentIndex].classList.remove('current');
    currentIndex = finalIndex;
    elems[currentIndex].classList.add('current');
    updatePosition();
    scrollToSection(finalIndex);

    // Prevent the click that fires after mouseup/touchend
    setTimeout(() => { wasDragging = false; }, 0);
}

// Mouse
dail.addEventListener('mousedown', (e) => {
    dragStartY = e.clientY;
    dragStartIndex = currentIndex;
    isDragging = true;
    wasDragging = true;
    dail.classList.add('dragging');
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    applyDragTransform(e.clientY - dragStartY);
});

document.addEventListener('mouseup', (e) => {
    endDrag(e.clientY);
});

// Touch
dail.addEventListener('touchstart', (e) => {
    dragStartY = e.touches[0].clientY;
    dragStartIndex = currentIndex;
    isDragging = true;
    wasDragging = true;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    applyDragTransform(e.touches[0].clientY - dragStartY);
}, { passive: true });

document.addEventListener('touchend', (e) => {
    endDrag(e.changedTouches[0].clientY);
});

// Scroll-based dial sync
function handleScroll() {
    if (programmaticScroll) return;
    const windowHeight = window.innerHeight;
    sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < windowHeight * 0.4 && rect.top > -rect.height + windowHeight * 0.4) {
            if (index !== currentIndex) switchToIndex(index, false);
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

} // end dial-enabled branch
