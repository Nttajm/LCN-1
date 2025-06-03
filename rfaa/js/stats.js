document.querySelectorAll('img').forEach(img => {
    const originalSrc = img.getAttribute('src');
    img.src = '/rfaa/' + originalSrc;
});