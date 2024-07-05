document.addEventListener('DOMContentLoaded', () => {
    const target = document.querySelector('.target');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.intersectionRatio >= 0.05) {
                document.body.style.backgroundColor = 'lightblue';
            } else {
                document.body.style.backgroundColor = '';
            }
        });
    }, { threshold: [0.55] });

    observer.observe(target);
});

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

  const blobs = document.querySelectorAll('.blob')
  const htmlTemplate = (projName, projNameSub, info, writer, img, date, text) => `
    <div class="v-info v-item">
        <div class="name">
            <span>${projName}</span>
            <div class="sub-name">
                <span>${projNameSub}</span>
            </div>
        </div>
        <div class="v-info-sec">
            <span>Project Info:</span>
            <span>${info} (WR.${writer})</span>
            <span>dev:</span>
            <span>JOELM</span>
        </div>
    </div>
    <div class="v-mag v-item">
        <img src="${img}" alt="">
    </div>
    <div class="v-nav v-item">
        <div class="v-top"></div>
        <div class="v-mid">
            <div class="date ov">
                <span>/${date}</span>
            </div>
            <div class="v-info-sec2">
                <span>${text}</span>
            </div>
        </div>
        <div class="v-bottom"></div>
    </div>
`;

const htmlIndex = {
    ldr: htmlTemplate(
        "Archery and apple",
        "Lana Del Rey",
        "Valentine’s Day collection - magazine",
        "JM",
        "images/ldreme.webp", // Replace with the actual path to the image
        "6.30.24", // Replace with the actual date
        " A feature with Lana Del Rey and Skims. Magazine features albums and documentaion. More can be seen at /documentaions"
    ),
    ana: htmlTemplate(
        "LOVELY",
        "Ana De Armas",
        "Valentine’s Day collection - magazine",
        "JM",
        "images/ada-imitador.jpg_large", // Replace with the actual path to the image
        "7.1.23", // Replace with the actual date
        " A feature with Lana Del Rey and Skims. Magazine features albums and documentaion. More can be seen at /documentaions"
    ),
};


blobs.forEach(elem => {
    const viewer = document.getElementById('js-elem-select-viewer');
    const conter = document.getElementById('js-elem-select-cont');
    elem.addEventListener('click', () => {
        elem.classList.add('selected');
        const background = elem.dataset.bg;
        const textColor = elem.dataset.tx;
        const elemHtml = elem.dataset.inner;
        conter.innerHTML = '';
        stopChangingStyles();
        if (background) {
            setTimeout(() => {
                viewer.classList.add('v-on');
                viewer.style.color = textColor;
                viewer.style.backgroundColor = background;
                if (elemHtml) {
                    conter.innerHTML = htmlIndex[elemHtml];
                }
            }, 700);
        }
    });
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

datalevel('blob');