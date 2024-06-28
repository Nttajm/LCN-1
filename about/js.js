

const messages = document.querySelectorAll('.message');

messages.forEach(message => {
    const showTime = parseInt(message.dataset.showTime);
    const hideTime = parseInt(message.dataset.hideTime);

    function showMessage() {
        message.classList.toggle('hidden');
    }

    // Function to get a random interval between 8000 and 16000 milliseconds
    function getRandomInterval() {
        return Math.floor(Math.random() * (16000 - 6000 + 1)) + 8000;
    }

    // Set an initial timeout to start showing the message at a random interval
    setTimeout(function repeat() {
        showMessage();
        
        // Set the next interval with a random time
        setTimeout(repeat, getRandomInterval());
    }, getRandomInterval());
});

const animatedText = document.getElementById('animatedText');
        const text = animatedText.innerText;
        animatedText.innerHTML = ''; // Clear the existing text
        const blank = 9
        for (let i = 0; i < blank; i++) {
            let wan = document.createElement('span');
            wan.innerText = " "
            animatedText.appendChild(wan)
        }


        text.split('').forEach(char => {
            const span = document.createElement('span');
            span.classList.add('hidden');
            span.innerText = char;
            animatedText.appendChild(span);
        });
    

        const textSpans = document.querySelectorAll('#animatedText span');
        let lastScrollTop = 0;

        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop + 900;
            const scrolled = Math.floor(scrollTop / 20);
            
            textSpans.forEach((span, index) => {
                if (index <= scrolled) {
                    span.classList.remove('hidden');
                    span.classList.add('visible');
                } else {
                    span.classList.remove('visible');
                    span.classList.add('hidden');
                }
            });

            lastScrollTop = scrollTop;
        })

document.addEventListener('DOMContentLoaded', function() {
  window.addEventListener('scroll', function() {
    let scrollTop = window.scrollY;

    // Adjust speeds for each section here
    document.getElementById('not').style.transform = 'translateY(' + scrollTop * -0.3 + 'px)';
    document.getElementById('words').style.transform = 'translateY(' + scrollTop * -0.8 + 'px)';
  });
});


const hoverIDives = document.querySelectorAll('.porj-word span');
console.log(hoverIDives);

const wordsInfo = [
    {
        dataName: 'bwi',
        color: 'green',
        background: 'black',
    },
    {
        dataName: 'cata',
        color: 'red',
        background: 'orange',
    },
    {
        dataName: 'italy',
        color: 'red',
        background: 'green',
    },
    {
        dataName: 'anthon',
        color: 'blue',
        background: 'orange',
    },
    {
        dataName: 'cupertino',
        color: 'orange',
        background: 'blue',
    },
];


const bgDivWords = document.getElementById('words');
let defaultBackgroundColor = window.getComputedStyle(bgDivWords).backgroundColor;
let defaultColor = window.getComputedStyle(bgDivWords).color;

hoverIDives.forEach(element => {

    let definer = element.dataset.pre;

    element.addEventListener("mouseover", (event) => {
        // Blur all other spans
        hoverIDives.forEach(span => {
            if (span !== element) {
                span.style.filter = "blur(4px)";
            }
        });

        // Find and apply styles to bgDivWords
        const foundWord = wordsInfo.find(word => word.dataName === definer);
        if (foundWord) {
            bgDivWords.style.backgroundColor = foundWord.background;
            bgDivWords.style.color = foundWord.color;
        } else {
            console.log(`Word with dataName '${definer}' not found.`);
        }
    });

    element.addEventListener("mouseout", (event) => {
        // Remove blur from all spans
        hoverIDives.forEach(span => {
            span.style.filter = "none";
        });

        // Reset bgDivWords styles to default
        bgDivWords.style.backgroundColor = defaultBackgroundColor;
        bgDivWords.style.color = defaultColor;
    });
});

document.addEventListener('DOMContentLoaded', () => {
    customAni(0.95, 'animated-element', 'active');
    customAni(0.65, 'js-bluredEle', 'active');
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

  const jsArrs = document.querySelector('.js-arrs');
      jsArrs.innerHTML = `
      <span class="hmu-0">HMU</span>
      `;
      let numberOffArr = 430;
      for (let index = 0; index < numberOffArr; index++) {
        jsArrs.innerHTML += `
          <span class="item">&uarr;</span
        `
      }



      document.addEventListener('mousemove', (event) => {
    document.querySelectorAll('.item').forEach(span => {
        const rect = span.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const x = event.clientX - rect.left;

        if (y < rect.height / 2 && x < rect.width / 2) {
            span.style.transform = 'rotate(-45deg)';
        } else if (y < rect.height / 2 && x >= rect.width / 2) {
            span.style.transform = 'rotate(45deg)';
        } else if (y >= rect.height / 2 && x < rect.width / 2) {
            span.style.transform = 'rotate(225deg)';
        } else if (y >= rect.height / 2 && x >= rect.width / 2) {
            span.style.transform = 'rotate(-225deg)';
        } else if (y < rect.height / 2 && Math.abs(x - rect.width / 2) < rect.width / 4) {
            span.style.transform = 'rotate(0deg)';
        } else if (y >= rect.height / 2 && Math.abs(x - rect.width / 2) < rect.width / 4) {
            span.style.transform = 'rotate(180deg)';
        } else if (x < rect.width / 2 && Math.abs(y - rect.height / 2) < rect.height / 4) {
            span.style.transform = 'rotate(-90deg)';
        } else if (x >= rect.width / 2 && Math.abs(y - rect.height / 2) < rect.height / 4) {
            span.style.transform = 'rotate(90deg)';
        } else {
            span.innerHTML = '●'; // Default to ● when directly hovering
            span.style.transform = 'none';
        }
    });
});
  