const slider = document.querySelector('.slider');
if (slider) {
    const afterImg = slider.querySelector('.slider__img--after');
    const divider = slider.querySelector('.slider__divider');
    const handle = slider.querySelector('.slider__handle');
    let dragging = false;

    function setPosition(x) {
        const rect = slider.getBoundingClientRect();
        let pct = (x - rect.left) / rect.width;
        pct = Math.min(Math.max(pct, 0.02), 0.98);
        const pctPx = pct * 100;
        afterImg.style.clipPath = `inset(0 ${100 - pctPx}% 0 0)`;
        divider.style.left = pctPx + '%';
        handle.style.left = pctPx + '%';
    }

    slider.addEventListener('mousedown', e => {
        dragging = true;
        setPosition(e.clientX);
    });

    window.addEventListener('mousemove', e => {
        if (dragging) setPosition(e.clientX);
    });

    window.addEventListener('mouseup', () => { dragging = false; });

    slider.addEventListener('touchstart', e => {
        dragging = true;
        setPosition(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchmove', e => {
        if (dragging) setPosition(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchend', () => { dragging = false; });
}
