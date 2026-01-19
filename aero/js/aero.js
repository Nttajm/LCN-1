

// ============================================
// AERO Creative Production Studio
// Modern Award-Winning Interactions
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================
    // CUSTOM CURSOR
    // ============================================
    
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    
    let mouseX = 0, mouseY = 0;
    let outlineX = 0, outlineY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        if (cursorDot) {
            cursorDot.style.left = mouseX + 'px';
            cursorDot.style.top = mouseY + 'px';
        }
    });
    
    // Smooth cursor outline follow
    function animateCursor() {
        outlineX += (mouseX - outlineX) * 0.15;
        outlineY += (mouseY - outlineY) * 0.15;
        
        if (cursorOutline) {
            cursorOutline.style.left = outlineX + 'px';
            cursorOutline.style.top = outlineY + 'px';
        }
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
    
    // Cursor hover effects
    const hoverElements = document.querySelectorAll('a, button, .work, .menu-toggle, li');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            document.body.classList.add('cursor-hover');
        });
        el.addEventListener('mouseleave', () => {
            document.body.classList.remove('cursor-hover');
        });
    });
    
    // ============================================
    // VIDEO PLAYER
    // ============================================
    
    const videoPlayer = document.getElementById('videoPlayer');
    const videoList = document.getElementById('video-list')?.getElementsByTagName('li');
    const videos = [
        { src: '../images/aero/seq-aero-6-t.mp4', title: 'Nike Football' },
        { src: '../images/aero/seq-aero-football.mp4', title: 'AERO Fitness' },
        { src: '../images/aero/seq-aero-2.mp4', title: 'Reebok' },
        { src: '../images/aero/seq-aero-3.mp4', title: 'New Balance' },
        { src: '../images/aero/seq-aero-7-t.mp4', title: 'OLD SPICE' },
        { src: '../images/aero/seq-aero-4.mp4', title: 'Nissan' },
        { src: '../images/aero/seq-aero-5.mp4', title: 'Volvo' },
    ]; 
    
    let currentVideoIndex = 0;
    
    function loadVideo(index) {
        if (!videoPlayer) return;
        videoPlayer.src = videos[index].src;
        highlightCurrentVideo(index);
        videoPlayer.load();
        videoPlayer.play();
    }
    
    function highlightCurrentVideo(index) {
        if (!videoList) return;
        for (let i = 0; i < videoList.length; i++) {
            videoList[i].classList.remove('highlight');
        }
        if (videoList[index]) {
            videoList[index].classList.add('highlight');
        }
    }
    
    if (videoPlayer) {
        videoPlayer.addEventListener('ended', function() {
            currentVideoIndex++;
            if (currentVideoIndex < videos.length) {
                loadVideo(currentVideoIndex);
            } else {
                currentVideoIndex = 0;
                loadVideo(currentVideoIndex);
            }
        });
    }
    
    if (videoList) {
        for (let i = 0; i < videoList.length; i++) {
            videoList[i].addEventListener('click', function() {
                currentVideoIndex = i;
                loadVideo(currentVideoIndex);
            });
        }
        loadVideo(currentVideoIndex);
    }
    
    // ============================================
    // MENU TOGGLE
    // ============================================
    
    const menuToggle = document.querySelector('.menu-toggle');
    const fullscreenMenu = document.querySelector('.fullscreen-menu');
    
    if (menuToggle && fullscreenMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            fullscreenMenu.classList.toggle('active');
            document.body.style.overflow = fullscreenMenu.classList.contains('active') ? 'hidden' : '';
        });
        
        // Close menu on link click
        const menuLinks = fullscreenMenu.querySelectorAll('.menu-link');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                fullscreenMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
    
    // ============================================
    // SMOOTH SCROLL WITH LOCOMOTIVE
    // ============================================
    
    const scrollContainer = document.querySelector('[data-scroll-container]');
    let scroll;
    
    if (scrollContainer && typeof LocomotiveScroll !== 'undefined') {
        scroll = new LocomotiveScroll({
            el: scrollContainer,
            smooth: true,
            multiplier: 0.8,
            lerp: 0.05,
            smartphone: {
                smooth: true
            },
            tablet: {
                smooth: true
            }
        });
        
        // Update scroll on resize
        window.addEventListener('resize', () => {
            scroll.update();
        });
    }
    
    // ============================================
    // WORK ITEMS - PAGE TRANSITIONS
    // ============================================
    
    const allWorkLinklers = document.querySelectorAll('.work-linkler');

    allWorkLinklers.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            wipeRL();
            setTimeout(() => {
                const linkLocation = link.dataset.linkLocation;
                const temp = 'work/' + linkLocation + '.html';
                window.location.href = temp;
            }, 500);
        });
    });
    
    // ============================================
    // REVEAL ANIMATIONS
    // ============================================
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.work, .info-column, .agency-content, .contact-content').forEach(el => {
        el.classList.add('reveal-element');
        revealObserver.observe(el);
    });
    
    // ============================================
    // FOOTER TIME
    // ============================================
    
    function updateTime() {
        const timeEl = document.getElementById('current-time');
        if (timeEl) {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            timeEl.textContent = `${hours}:${minutes}:${seconds}`;
        }
    }
    
    updateTime();
    setInterval(updateTime, 1000);
    
    // ============================================
    // SMOOTH ANCHOR SCROLL
    // ============================================
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetEl = document.querySelector(targetId);
            
            if (targetEl && scroll) {
                scroll.scrollTo(targetEl);
            } else if (targetEl) {
                targetEl.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // ============================================
    // PARALLAX VIDEO ON SCROLL
    // ============================================
    
    if (scroll && videoPlayer) {
        scroll.on('scroll', (args) => {
            const scrollY = args.scroll.y;
            if (scrollY < window.innerHeight) {
                const parallaxAmount = scrollY * 0.3;
                videoPlayer.style.transform = `translateY(${parallaxAmount}px) scale(${1 + scrollY * 0.0002})`;
            }
        });
    }
    
});

// ============================================
// PAGE TRANSITION FUNCTIONS
// ============================================

function wipeRL() {
    const wipe = document.querySelector('.wipe');
    if (wipe) {
        wipe.classList.remove('dn');
        wipe.classList.add('wipe-rl');
    }
}

function wipeLR() {
    const wipe = document.querySelector('.wipe');
    if (wipe) {
        wipe.classList.remove('dn');
        wipe.classList.add('wipe-lr');
    }
}

// ============================================
// CSS FOR REVEAL ANIMATIONS (added via JS)
// ============================================

const style = document.createElement('style');
style.textContent = `
    .reveal-element {
        opacity: 0;
        transform: translateY(60px);
        transition: opacity 0.8s cubic-bezier(0.19, 1, 0.22, 1), 
                    transform 0.8s cubic-bezier(0.19, 1, 0.22, 1);
    }
    
    .reveal-element.revealed {
        opacity: 1;
        transform: translateY(0);
    }
    
    .cursor-hover .cursor-dot {
        width: 60px;
        height: 60px;
        background: #ff4d00;
        mix-blend-mode: difference;
    }
    
    .cursor-hover .cursor-outline {
        width: 80px;
        height: 80px;
        border-color: #ff4d00;
        opacity: 0.5;
    }
    
    /* Magnetic button effect preparation */
    .magnetic {
        transition: transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
    }
`;
document.head.appendChild(style);

