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

document.querySelectorAll('.nav-links a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

const galleryImages = [
    'assets/gallery/work1.png',
    'assets/gallery/work2.png',
    'assets/gallery/work3.png',
    'assets/gallery/work4.png',
    'assets/gallery/work5.png'
];

const galleryViewer = document.getElementById('gallery-viewer');
const galleryViewerImg = document.querySelector('.gallery-viewer-img');
const galleryViewerCounter = document.querySelector('.gallery-viewer-counter');
const galleryViewerClose = document.querySelector('.gallery-viewer-close');
const galleryViewerPrev = document.querySelector('.gallery-viewer-prev');
const galleryViewerNext = document.querySelector('.gallery-viewer-next');
const galleryViewAllBtn = document.querySelector('.gallery-view-all');

let currentImageIndex = 0;

function openGalleryViewer(index) {
    currentImageIndex = index;
    updateGalleryViewer();
    galleryViewer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
}

function closeGalleryViewer() {
    galleryViewer.classList.remove('is-open');
    document.body.style.overflow = '';
}

function updateGalleryViewer() {
    galleryViewerImg.src = galleryImages[currentImageIndex];
    galleryViewerCounter.textContent = `${currentImageIndex + 1} / ${galleryImages.length}`;
}

function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    updateGalleryViewer();
}

function showPrevImage() {
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    updateGalleryViewer();
}

document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-gallery-index'));
        openGalleryViewer(index);
    });
});

if (galleryViewAllBtn) {
    galleryViewAllBtn.addEventListener('click', () => {
        openGalleryViewer(0);
    });
}

galleryViewerClose.addEventListener('click', closeGalleryViewer);
galleryViewerNext.addEventListener('click', showNextImage);
galleryViewerPrev.addEventListener('click', showPrevImage);

galleryViewer.addEventListener('click', (e) => {
    if (e.target === galleryViewer) {
        closeGalleryViewer();
    }
});

document.addEventListener('keydown', (e) => {
    if (!galleryViewer.classList.contains('is-open')) return;
    
    if (e.key === 'Escape') {
        closeGalleryViewer();
    } else if (e.key === 'ArrowRight') {
        showNextImage();
    } else if (e.key === 'ArrowLeft') {
        showPrevImage();
    }
});
