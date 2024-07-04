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
    const elements = document.querySelector('.stickyplace');
    const randomStyle = Math.floor(Math.random() * 4) + 1; // Generates a random number between 1 and 3
    elements.setAttribute('data-setconfigure', randomStyle);
}

// Set an interval to call the function every 2 seconds (2000 milliseconds)
setInterval(changeDataStyle2, 2000);

