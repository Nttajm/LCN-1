const peopleImgs = document.querySelectorAll('.people img');

if (peopleImgs.length > 0) {
    const imgUrls = [
        '../imagesbynum/img (5).jpg',
        '../imagesbynum/img (6).jpg',
        '../imagesbynum/img (7).jpg',
        '../imagesbynum/img (8).jpg',
        '../imagesbynum/img (9).jpg',
        '../imagesbynum/img (10).jpg',
        '../imagesbynum/img (11).jpg',
        '../imagesbynum/img (12).jpg',
        '../imagesbynum/img (13).jpg',
        '../imagesbynum/img (14).jpg',
        '../imagesbynum/img (15).jpg',
        '../imagesbynum/img (16).jpg',
        '../imagesbynum/img (17).jpg',
        '../imagesbynum/img (18).jpg',
        '../imagesbynum/img (19).jpg',
        '../imagesbynum/img (20).jpg',
        '../imagesbynum/img (21).jpg',
        '../imagesbynum/img (22).jpg',
        '../imagesbynum/img (23).jpg',
        '../imagesbynum/img (24).jpg',
        '../imagesbynum/img (25).jpg',
        '../imagesbynum/img (26).jpg',
        '../imagesbynum/img (27).jpg',
        '../imagesbynum/img (28).jpg',
        '../imagesbynum/img (33).jpg',
        '../imagesbynum/img (34).jpg',
        '../imagesbynum/img (35).jpg',
        '../imagesbynum/img (36).jpg',
        '../imagesbynum/img (37).jpg',
        '../imagesbynum/img (38).jpg',
        '../imagesbynum/img (39).jpg',
        '../imagesbynum/img (40).jpg',
        '../imagesbynum/img (41).jpg',
        '../imagesbynum/img (42).jpg',
        '../imagesbynum/img (43).jpg',
        '../imagesbynum/img (44).jpg',
        '../imagesbynum/img (45).jpg',
        '../imagesbynum/img (46).jpg',
        '../imagesbynum/img (47).jpg',
        '../imagesbynum/img (48).jpg',
        '../imagesbynum/img (49).jpg',
        '../imagesbynum/img (50).jpg',
        '../imagesbynum/img (51).jpg',
        '../imagesbynum/img (52).jpg',
    ]

    peopleImgs.forEach((img) => {
        setInterval(() => {
            const random = Math.floor(Math.random() * 9) + 1;
            img.setAttribute('data-style', random);
        }, 1700);

        let usedIndexes = new Set();
        setInterval(() => {
            let randomIndex;
            do {
            randomIndex = Math.floor(Math.random() * imgUrls.length);
            } while (usedIndexes.has(randomIndex));
            
            usedIndexes.add(randomIndex);
            if (usedIndexes.size === imgUrls.length) {
            usedIndexes.clear();
            }
            
            img.setAttribute('src', imgUrls[randomIndex]);
        }, 2508);
    });
}

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