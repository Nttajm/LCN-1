
const container = document.querySelector('.cont');
const scrollbar = document.getElementById('customScrollbar');
const thumb = document.getElementById('customScrollbarThumb');

// Update scrollbar thumb position based on scroll
container.addEventListener('scroll', () => {
    const scrollPercentage = (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100;
    const scrollbarHeight = scrollbar.offsetHeight;
    const thumbHeight = thumb.offsetHeight;

    const thumbPosition = (scrollPercentage * (scrollbarHeight - thumbHeight)) / 100;
    thumb.style.top = thumbPosition + 'px';
});

// Adjust container scroll based on thumb click and drag
let isDragging = false;
let startPosition = 0;

thumb.addEventListener('mousedown', (e) => {
    isDragging = true;
    startPosition = e.clientY - thumb.offsetTop;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    e.preventDefault();

    const y = e.clientY - startPosition;
    const maxScroll = scrollbar.offsetHeight - thumb.offsetHeight;

    // Limit thumb movement within scrollbar
    const position = Math.min(Math.max(0, y), maxScroll);
    const percentage = (position / maxScroll) * 100;

    thumb.style.top = position + 'px';
    container.scrollTop = (percentage / 100) * (container.scrollHeight - container.clientHeight);
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

function animationSeq_add(time, divE, classToAdd) {
    setTimeout(() => {
        let divs = document.querySelectorAll(`.${divE}`);
        divs.forEach(element => {
            if (divs.length > 0) {
                element.classList.add(classToAdd);
            } else {
                console.log(`No element found with class name: ${divE}`);
            }
        });
    }, time);
}

animationSeq_add(1900, 'js-bluredEle', '.js-active')