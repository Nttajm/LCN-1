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

document.addEventListener('DOMContentLoaded', function() {
    const videoPlayer = document.getElementById('videoPlayer');
    const videoList = document.getElementById('video-list').getElementsByTagName('li');

    const videos = [
        { src: 'video1.mp4', title: 'Example Video 1' },
        { src: 'video2.mp4', title: 'Example Video 2' },
        { src: 'video3.mp4', title: 'Example Video 3' }
    ];

    let currentVideoIndex = 0;

    function loadVideo(index) {
        videoPlayer.src = videos[index].src;
        highlightCurrentVideo(index);
        videoPlayer.load();
        videoPlayer.play();
    }

    function highlightCurrentVideo(index) {
        for (let i = 0; i < videoList.length; i++) {
            videoList[i].classList.remove('highlight');
        }
        videoList[index].classList.add('highlight');
    }

    videoPlayer.addEventListener('ended', function() {
        currentVideoIndex++;
        if (currentVideoIndex < videos.length) {
            loadVideo(currentVideoIndex);
        } else {
            // Optionally handle the end of the playlist
        }
    });

    for (let i = 0; i < videoList.length; i++) {
        videoList[i].addEventListener('click', function() {
            currentVideoIndex = i;
            loadVideo(currentVideoIndex);
        });
    }

    loadVideo(currentVideoIndex);
});