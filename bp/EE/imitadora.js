

document.addEventListener('DOMContentLoaded', function () {
    var buttons = document.querySelectorAll('button[data-jslink]');

    buttons.forEach(function (button) {
        button.addEventListener('click', function () {
            var url = button.getAttribute('data-jslink');
            window.location.href = url;
        });
    });
});

function changeDataStyle() {
    const elements = document.querySelectorAll('.wr');
    elements.forEach(element => {
        const randomStyle = Math.floor(Math.random() * 4) + 1; // Generates a random number between 1 and 3
        element.setAttribute('data-style', randomStyle);
    });
}

// Set an interval to call the function every 2 seconds (2000 milliseconds)
setInterval(changeDataStyle, 2000);

window.addEventListener('scroll', function() {
    const myDiv = document.querySelector('.yeller');
    if (window.scrollY >= 600) {
        myDiv.classList.add('scrolled');
    } else {
        myDiv.classList.remove('scrolled');
    }
});

const yeller = document.querySelector('.yeller')

yeller.addEventListener('click', () => {
    yeller.classList.toggle('clicked')
})

function changeDataStyle2() {
    const elements = document.getElementById('js-elem-select-sticky');
    const randomStyle = Math.floor(Math.random() * 4) + 1; // Generates a random number between 1 and 3
    elements.setAttribute('data-setconfigure', randomStyle);
}

// Set an interval to call the function every 2 seconds (2000 milliseconds)
const intervalID = setInterval(changeDataStyle2, 2000);

function stopChangingStyles() {
    clearInterval(intervalID);
    console.log('Interval cleared');
}

document.addEventListener('DOMContentLoaded', () => {
    customAni(0.95, 'animated-element', 'active');
    customAni(0.75, 'js-bluredEle', 'js-bluredEle-active');
  });

  function customAni(min, className, config) {
    const elements = document.querySelectorAll(`.${className}`);
  
    function checkScroll() {
      elements.forEach((element) => {
        const elementPosition = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        if (elementPosition < windowHeight * min) {
          element.classList.add(config);
        } else {
          element.classList.remove(config);
        }
      });
    }
  
    window.addEventListener('scroll', checkScroll);
    checkScroll(); 
  }


  const projectHTml = [
    {
        id: 'lana',
        background: 'rgb(123, 0, 0)',
        textColor: 'rgb(220, 207, 140)',
         projName: "Archery and apple",
         projNameSub: "Lana Del Rey",
         info: "Valentine’s Day collection & L.D.R - magazine",
         writer: "JM",
         img: "images/ldreme.webp", // Replace with the actual path to the image
         date:"6.30.24", // Replace with the actual date
         text:" A feature with Lana Del Rey and Skims. Magazine features albums and documentaion. More can be seen at /Magazine",
         extra: [
            {
                extraText: `
                    The ”ROPE QUEEN” — and the new face of skims. 
                    The face of OQS and skims talk about Normal F**king Rockwell in her own words
                `,
                img: 'images/mag-lana-1.jpg',
                changer: 'rgb(123, 0, 0)',
                textColor: 'rgb(220, 207, 140)',
            },
            {
                extraText: `
                Did You Know That There's a Tunnel Under Ocean 
    Blvd is the ninth studio album by American singer-
    songwriter and record producer Lana Del Rey. 
    Released on March 24, 2023, by Interscope 
    and Polydor Records, the album features production
     by Del Rey, Mike Hermosa, Jack Antonoff,
     Drew Erickson, Zach Dawes, and Benji.
                `,
                img: 'images/mag-3.jpg',
                changer: 'black',
                textColor: 'white',
            },
            {
                extraText: `
                Born to Die is the second and debut major-label studio album by American singer-songwriter, and record producer Lana Del Rey. It was released on January 27, 2012, through Interscope Records and Polydor Records. 
                `,
                img: 'images/lana-mag-4.jpg',
                changer: 'orange',
                textColor: 'purple',
            }
         ],
        },
    {
        id: 'ana',
        background: 'rgb(121, 121, 121)',
        textColor: 'white',
         projName: "B&W x OQS",
         projNameSub: "Ana De Armas",
         info: "B&W Collection featuring Ana De Armas",
         writer: "JM",
         img: "images/ada-imitador.jpg_large", // Replace with the actual path to the image
         date:"7.2.23", // Replace with the actual date
         text:" A feature with Lana Del Rey and Skims. Magazine features albums and documentaion. More can be seen at /Gallary",
         extra: [
            {
                extraText: `
                    The ”ROPE QUEEN” — and the new face of skims. 
                    The face of OQS and skims talk about Normal F**king Rockwell in her own words
                `,
                img: 'images/mag-ana-2.jpg',
                changer: 'rgb(121, 121, 121)',
                textColor: 'white',
            },
            {
                extraText: `
                Did You Know That There's a Tunnel Under Ocean 
    Blvd is the ninth studio album by American singer-
    songwriter and record producer Lana Del Rey. 
    Released on March 24, 2023, by Interscope 
    and Polydor Records, the album features production
     by Del Rey, Mike Hermosa, Jack Antonoff,
     Drew Erickson, Zach Dawes, and Benji.
                `,
                img: 'images/mag-3.jpg',
                changer: 'black',
                textColor: 'white',
            }
         ],
        }
];

const blobs = document.querySelectorAll('.blob')
const viewer = document.getElementById('js-elem-select-viewer');

viewer.innerHTML = ''
projectHTml.forEach(proj => {
    let extraHtml = '';
    if (proj.extra) {
        proj.extra.forEach(ex => {
            extraHtml += `
            <div class="cont js-ch" id="show-case" data-bg="${ex.changer}" data-tx="${ex.textColor}">
            <div class="v-info v-item">        
                <div class="v-info-sec">
                    <span>
                        Project Info:
                    </span>
                    <span>
                        Gallery / magazine - NBA SERIES (WR.JM)
                    </span>
                    <span>
                        dev:
                    </span>
                    <span>
                        JOELM
                    </span>
                </div>
            </div>
            <div class="v-mag v-item">
                <img src="${ex.img}" alt="">
            </div>
            <div class="v-nav v-item">
                <div class="v-top"></div>
                <div class="v-mid">
                    <div class="v-info-sec2">
                        <span>
                        ${ex.extraText}
                        </span>
                    </div>
                </div>
                <div class="v-bottom"></div>
            </div>
        </div>
            `
        })
    }
    viewer.innerHTML += 
    `
<div class="cont js-ch" id="${proj.id}" data-bg="${proj.background}" data-tx="${proj.textColor}" data-id="${proj.id}">
<div class="v-info v-item">
    <div class="name">
        <span>${proj.projName}</span>
        <div class="sub-name">
            <span>${proj.projNameSub}</span>
        </div>
    </div>
    <div class="v-info-sec">
        <span>Project Info:</span>
        <span>${proj.info} (WR.${proj.writer})</span>
        <span>dev:</span>
        <span>JOELM</span>
    </div>
</div>
<div class="v-mag v-item">
    <img src="${proj.img}" alt="">
</div>
<div class="v-nav v-item">
    <div class="v-top"></div>
    <div class="v-mid">
        <div class="date ov">
            <span>/${proj.date}</span>
        </div>
        <div class="v-info-sec2">
            <span>${proj.text}</span>
        </div>
    </div>
    <div class="v-bottom"></div>
</div>
</div>
${extraHtml}
`
});
    

    const changers = document.querySelectorAll('.js-ch');
    console.log(changers)
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const changerColor = entry.target.dataset.bg;
                    const textColor = entry.target.dataset.tx;
                    viewer.style.backgroundColor = changerColor;
                    viewer.style.color = textColor;
                }
            });
        }, {
            threshold: 0.45
        });

        changers.forEach(element => {
            observer.observe(element);

        });




        // blobs.forEach(elem => {
        //     elem.addEventListener('click', () => {
        //         elem.classList.add('selected');
        //         const background = elem.dataset.bg;
        //         const textColor = elem.dataset.tx;
        //         const idScoller = elem.dataset.id;
        
        //         scrollToSection(idScoller);  // Use the correct function to scroll
        //         stopChangingStyles();
        
        //         if (background) {
        //             setTimeout(() => {
        //                 viewer.classList.add('v-on');
        //                 viewer.style.color = textColor;
        //                 viewer.style.backgroundColor = background;
        //             }, 700);
        //         }
        //     });
        // });
        
        // // Function to scroll to a specific section within the viewer
        // function scrollToSection(sectionId) {
        //     const section = document.getElementById(sectionId);  // Find the section by id
        //     if (section) {
        //         section.scrollIntoView({ behavior: 'smooth' });
        //     }
        // }

        blobs.forEach(elem => {
            elem.addEventListener('click', () => {
                elem.classList.add('selected');
                const background = elem.dataset.bg;
                const textColor = elem.dataset.tx;
                const idScroller = elem.dataset.id;

                scrollToSection(idScroller);  // Use the correct function to scroll
                stopChangingStyles();

                if (background) {
                    setTimeout(() => {
                        viewer.classList.add('v-on');
                        viewer.style.color = textColor;
                        viewer.style.backgroundColor = background;
                    }, 700);
                }
            });
        });

        // Function to scroll to a specific section within the viewer
        function scrollToSection(sectionId) {
            const section = document.getElementById(sectionId);  // Find the section by id
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        }

function datalevel(className) {
    document.querySelectorAll(`.${className}`).forEach(function(element) {
        var bgColor = element.getAttribute('data-bg');
        var txc = element.getAttribute('data-tc');
        if (bgColor) {
            element.style.backgroundColor = bgColor;
            element.style.color = txc;
        }
    });
}

datalevel('blob');