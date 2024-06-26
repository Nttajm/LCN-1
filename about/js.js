document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.getElementById('loader');
    const percentageText = document.getElementById('percent');
    let percentage = 89;

    const interval = setInterval(() => {
        if (percentage >= 99) {
            clearInterval(interval);
        } else {
            percentage++;
            progressBar.style.width = percentage + '%';
            percentageText.textContent = percentage + '%';
        }
    }, 260);
});

document.addEventListener('DOMContentLoaded', () => {

    const words = ["CREATING", "VISIONING", "SUPPORTING"];
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

let elems = document.querySelectorAll('.grid-item');
elems.forEach(element => {
    setTimeout(() => {
        element.style.opacity = '1'
        element.style.transform = 'scale(1)'
    }, 3680);
})

let itemFills = document.querySelectorAll('.filler');
itemFills.forEach(element => {
    setTimeout(() => {
        element.classList.remove('orgin')
    }, 3680);
})


setTimeout(() => {
    document.body.style.overflowY = 'auto'
}, 3680);

animationSeq_add(3100, 'grid-item', 'fadeIn');
animationSeq_add(3100, 'js-ani-1_semi', 'fadeOut');
animationSeq_add(3100, 'js-ani-1', 'fadeOut');
animationSeq_add(3100, 'js-ani-2', 'fadeOut');


function showMessage() {
    messageDiv.classList.remove('hidden');
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 2000);
}

setInterval(() => {
    showMessage();
}, 5000); 


const messages = document.querySelectorAll('.message');

messages.forEach(message => {
    const showTime = parseInt(message.dataset.showTime);
    const hideTime = parseInt(message.dataset.hideTime);

    function showMessage() {
        setTimeout(() => {
            message.classList.remove('hidden');
        }, hideTime);
        setTimeout(() => {
            message.classList.add('hidden');
        }, showTime);
    }

    setInterval(() => {
        showMessage();
    }, showTime + hideTime); // Show message every showTime + hideTime milliseconds
});

