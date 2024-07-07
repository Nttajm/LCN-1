document.getElementById('pauseButton').addEventListener('click', function() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.pause();
    });
});

setTimeout(() => {
    document.getElementById('pauseButton').addEventListener('click', function() {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            video.play();
        });
    });
}, 1900);