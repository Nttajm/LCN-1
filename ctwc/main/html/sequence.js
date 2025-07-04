const coverTags = [
    {
        title: 'CTWC Cover',
        desc: 'This is the cover image for the CTWC website.',
        img: '../images/w-4.jpg'
    },
    {
        title: 'Lunch Hour',
        desc: 'come and join us for our weekly lunch hour service every Friday at 12:30pm.',
        img: '../images/w-3.jpg'
    },
    {
        title: 'CTWC Cover Min',
        desc: 'This is the minimized cover image for the CTWC website.',
        img: '../images/w-5.jpg'
    }
]

const tag = document.querySelector('.tag');
const imgCover = document.getElementById('cover-large');
let currentIndex = 0;

function updateTag() {
    const currentTag = coverTags[currentIndex];
    tag.querySelector('.title').textContent = currentTag.title;
    tag.querySelector('.desc').textContent = currentTag.desc;
    imgCover.src = currentTag.img;

    currentIndex = (currentIndex + 1) % coverTags.length;
}

setInterval(updateTag, 5000); // Cycle every 3 seconds
updateTag(); // Initialize with the first tag

