/*const imgArray = [
    {
        col: [
            {
                scr: 'images/fsg/f-t.png',
                title: `PLUG MAN`,
                sub: `PLUGMAN (OFFICIAL TRAILER)`,
                tx: 'white',
                bg: 'pink'
            },
            {
                scr: 'images/fsg/f-m(1).png',
                title: `The Silver Lining`,
                sub: `Get to know @thesilverlining_inthemidstofit , the up and coming band out of Sonoma County!`,
                tx: 'white',
                bg: 'darkblue'
            },
            {
                scr: 'images/fsg/f(3).jpg',
                title: `GOTTA BE ABOVE IT`,
                sub: `finally something good* production presents GOTTA BE ABOVE IT, a new short.`,
                tx: 'white',
                bg: 'gray'
            },
            {
                scr: 'images/fsg/f(3).png',
                title: `GOTTA BE ABOVE IT`,
                sub: `Check out the behind the scenes for @ausente_official debut music video Los Buenos Siempre Pierden!`,
                tx: 'white',
                bg: 'gray'
            },
            {
                scr: 'images/fsg/lindo(1).jpg',
                title: `LINDO`,
                sub: `LINDO MUSIC VIDEO OUT NOW
                    MORE COMING SOON
                    DIRECTED&EDITED BY FRANK ALONSO
                    ASSISTANT LIGHTING BY KELLEY EVART & ADONIS`,
                tx: 'white',
                bg: 'maroon'
            },
            {
                scr: 'images/fsg/lindo(1).jpg',
                title: `LINDO`,
                sub: `LINDO MUSIC VIDEO OUT NOW
                    MORE COMING SOON
                    DIRECTED&EDITED BY FRANK ALONSO
                    ASSISTANT LIGHTING BY KELLEY EVART & ADONIS`,
                tx: '',
                bg: ''
            },
            {
                scr: 'images/fsg/lindo(1).jpg',
                title: `LINDO`,
                sub: `LINDO MUSIC VIDEO OUT NOW
                    MORE COMING SOON
                    DIRECTED&EDITED BY FRANK ALONSO
                    ASSISTANT LIGHTING BY KELLEY EVART & ADONIS`,
                tx: '',
                bg: ''
            },
            {
                scr: 'images/fsg/above(2).jpg',
                title: `GOTTA BE ABOVE IT`,
                sub: `finally something good* production presents GOTTA BE ABOVE IT, a new short.`,
                tx: 'white',
                bg: 'gray'
            },
        ]
    },
]


const cont2 = document.getElementById('c-2');
cont2.innerHTML = '';

imgArray.forEach(proj => {
    let itemHtml = '';
    proj.col.forEach(img => {
        itemHtml += 
        `
            <div class="item" data-tx="${img.tx}" data-bg="${img.bg}">
                <video class="i-img" src="${img.scr}" alt="">
                <span class="i-title">
                ${img.title}
                </span>
                <span class="i-other">
                ${img.sub}
                </span>
            </div>
        `;
    });
    cont2.innerHTML += `
        <div class="col">
            ${itemHtml}
        </div>
    `;
});
*/

 
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                video.play();
            });

 
        function datalevel(className) {
            document.querySelectorAll(`.${className}`).forEach(function(element) {
                var bgColor = element.getAttribute('data-bg');
                var text = element.getAttribute('data-tc');
    
                if (bgColor) {
                    element.style.backgroundColor = bgColor;
                    element.style.color = text;
    
                }
            });
        }

        window.addEventListener('scroll', function() {
            const myDiv = document.querySelector('.yeller');
            if (window.scrollY >= 500) {
                myDiv.classList.add('scrolled');
            }/* else {
                myDiv.classList.remove('scrolled');
            } */
        });

        datalevel('sec');
        datalevel('item');

        const texts = [
            "Finally, Something Good",
            "ALBUM OUT NOW!!!!!!!!!!!!!!!!!!!",
            "LISTEN NOW ON ALL PLATFORMS!!!!!!!!!!!!"
        ];
        let count = 0;
        let index = 0;
        let currentText = '';
        let letter = '';
        let isDeleting = false;

        (function type() {
            if (count === texts.length) {
                count = 0;
            }
            currentText = texts[count];

            if (isDeleting) {
                letter = currentText.slice(0, --index);
            } else {
                letter = currentText.slice(0, ++index);
            }

            document.querySelector('.typing').textContent = letter;

            let typeSpeed = 100;
            if (isDeleting) {
                typeSpeed /= 2;
            }

            if (!isDeleting && letter.length === currentText.length) {
                typeSpeed = 2000;
                isDeleting = true;
            } else if (isDeleting && letter.length === 0) {
                isDeleting = false;
                count++;
                typeSpeed = 500;
            }

            setTimeout(type, typeSpeed);
        })();