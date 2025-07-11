

const menuBtn = document.querySelector('.menu');
const closeBtn1 = document.querySelector('#close-1');
const navContDiv = document.querySelector('.nav-cont');

if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        if (navContDiv) {
            navContDiv.classList.toggle('show-other-links');
        }
    });
}

if (closeBtn1) {
    closeBtn1.addEventListener('click', () => {
        if (navContDiv) {
            navContDiv.classList.remove('show-other-links');
        }
    });
}

//scroll feture
document.addEventListener('DOMContentLoaded', () => {
    const elemRevels = document.querySelectorAll('.elem-revel');

    const observerOptions = {
        root: null, // Default is the viewport
        rootMargin: '0px 0px -20% 0px', // Adjusts the viewport trigger
        threshold: 0.2, // Fires when at least 10% of the element is visible
    };

    const observerCallback = (entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveled');
                observer.unobserve(entry.target); // Stop observing once revealed
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    elemRevels.forEach((el) => observer.observe(el));
});


//genral js

document.querySelectorAll('[data-animation-delay]').forEach(element => {
    const delay = element.getAttribute('data-animation-delay');
    element.style.setProperty('animation-delay', delay, 'important');
});


const readMoreBtn = document.querySelector('.readmore');
if (readMoreBtn) {
    readMoreBtn.addEventListener('click', function() {
        const target = this.getAttribute('data-rm-target');
        const p = document.querySelector(`p[data-rm="${target}"]`);
        if (p) {
            p.classList.toggle('read-more-text');
            this.textContent = p.classList.contains('read-more-text') ? 'read less ▲' : 'read more ▼';
        }
    });
}

const extraLink = document.querySelectorAll('.dd-selects');

extraLink.forEach(element => {
    const accorDropdown = element.querySelector('.js-drop-1');
    if (accorDropdown) {
        accorDropdown.classList.toggle('dn');
    }
});

