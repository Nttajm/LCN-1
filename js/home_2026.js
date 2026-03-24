const readMoreBtn = document.getElementById('readMoreButton');
const extended = document.getElementById('explainer-extended');

if (readMoreBtn && extended) {
    readMoreBtn.addEventListener('click', () => {
        const isOpen = extended.classList.contains('visible');
        extended.classList.toggle('visible', !isOpen);
        readMoreBtn.textContent = isOpen ? 'Read more' : 'Read less';
        readMoreBtn.classList.toggle('expanded', !isOpen);
    });
}