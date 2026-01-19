

document.addEventListener('DOMContentLoaded', function() {
    const videoPlayer = document.getElementById('videoPlayer');
    const videoList = document.getElementById('video-list').getElementsByTagName('li');
    const videos = [
        { src: 'images/aero/seq-aero-6-t.mp4', title: 'Example Video 2' },
        { src: 'images/aero/seq-aero-football.mp4', title: 'Nike x AERO Fitness' },
        { src: 'images/aero/seq-aero-2.mp4', title: 'Example Video 2' },
        { src: 'images/aero/seq-aero-3.mp4', title: 'Example Video 3' },
        { src: 'images/aero/seq-aero-7-t.mp4', title: 'Example Video 3' },
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

const allWorkLinklers = document.querySelectorAll('.work-linkler');

allWorkLinklers.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        wipeRL();
        setTimeout(() => {
            const linkLocation = link.dataset.linkLocation;
            const temp = 'aero/work/' + linkLocation + '.html';
            window.location.href = temp;
        }, 400);
    });
});

function wipeRL() {
    const wipe = document.querySelector('.wipe');
    wipe.classList.remove('dn');
    wipe.classList.add('wipe-rl');
}


document.addEventListener('DOMContentLoaded', function () {
    const scroll = new LocomotiveScroll({
        el: document.querySelector('[data-scroll-container]'),
        smooth: true
    });
});