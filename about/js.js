document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.getElementById('loader');
    const percentageText = document.getElementById('percent');
    let percentage = 91;

    const interval = setInterval(() => {
        if (percentage >= 99) {
            clearInterval(interval);
        } else {
            percentage++;
            progressBar.style.width = percentage + '%';
            percentageText.textContent = percentage + '%';
        }
    }, 160);
});

document.addEventListener('DOMContentLoaded', () => {

    const words = ["CREATING", "VISIONING", "SUPPORTING", 'INSPIRING'];
    const wordElement = document.querySelector('.word');
    let index = 0;

    setInterval(() => {
        wordElement.style.opacity = 0;
        setTimeout(() => {
            index = (index + 1) % words.length;
            wordElement.textContent = words[index];
            wordElement.style.opacity = 1;
        }, 100); // match this duration with the CSS transition duration
    }, 900); // adjust the interval to control how often words change
});


function animationSeq_remove(time, div, classToRemove) {
    setTimeout(() => {
        div.classList.remove(classToRemove);
    }, time);
}

function animationSeq_add(time, divE, classToAdd) {
    setTimeout(() => {
        let divs = document.querySelectorAll(`.${divE}`);
        if (divs.length > 0) {
            divs[0].classList.add(classToAdd);
        } else {
            console.log(`No element found with class name: ${divE}`);
        }
    }, time);
}

const firtsAni = 1450

let elems = document.querySelectorAll('.grid-item');
elems.forEach(element => {
    setTimeout(() => {
        element.style.opacity = '1'
        element.style.transform = 'scale(1)'
    }, firtsAni);
})

let itemFills = document.querySelectorAll('.filler');
itemFills.forEach(element => {
    setTimeout(() => {
        element.classList.remove('orgin')
    }, firtsAni);
})


setTimeout(() => {
    document.body.style.overflowY = 'auto'
}, firtsAni);


animationSeq_add(firtsAni, 'grid-item', 'fadeIn');
animationSeq_add(firtsAni, 'js-ani-1_semi', 'fadeOut');
animationSeq_add(firtsAni, 'js-ani-1', 'fadeOut');
animationSeq_add(firtsAni, 'js-ani-2', 'fadeOut');


; 


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