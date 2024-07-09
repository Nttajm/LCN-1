

document.addEventListener('DOMContentLoaded', function() {
    const videoPlayer = document.getElementById('videoPlayer');
    const videoList = document.getElementById('video-list').getElementsByTagName('li');
    const videos = [
        { src: 'images/aero/seq-aero-6-t.mp4', title: 'Example Video 2' },
        { src: 'images/aero/seq-aero-football.mp4', title: 'Nike x AERO Fitness' },
        { src: 'images/aero/seq-aero-2.mp4', title: 'Example Video 2' },
        { src: 'images/aero/seq-aero-3.mp4', title: 'Example Video 3' },
        { src: 'images/aero/seq-aero-4.mp4', title: 'Example Video 3' },
        { src: 'images/aero/seq-aero-5.mp4', title: 'Example Video 3' },

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

let linksEle = document.querySelectorAll('a')
linksEle.forEach(element => {
    element.classList.add('delayed-link')
});

document.addEventListener('DOMContentLoaded', function () {
    const links = document.querySelectorAll('.delayed-link');
    const messageDiv = document.getElementById('redirect-message');
    const delay = 2000; // Delay in milliseconds (2000ms = 2 seconds)

    links.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent the default link behavior
            const url = link.getAttribute('href');

            // Show the message div
            messageDiv.style.display = 'block';

            // Wait for the specified delay, then redirect
            setTimeout(() => {
                window.location.href = url;
            }, delay);
        });
    });
}, 1900);