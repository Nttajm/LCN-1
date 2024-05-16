function noneClass(className) {
    var elements = document.querySelectorAll(`.${className}`);
    console.log(className);
    for (var i = 0; i < elements.length; i++) {
        elements[i].classList.toggle('dn');
    }

}

const buttons = document.querySelectorAll('.js-actives button');

buttons.forEach(button => {
    button.addEventListener('click', function() {
        button.classList.toggle('active-b');
    });
});


const buttonsCl = document.querySelectorAll('.js-actives-only button');

buttonsCl.forEach(button => {
    button.addEventListener('click', function() {
        if (button.classList.contains('active-b', 'js-btn-selected')) {
            // If the clicked button already has the class, remove it
            button.classList.remove('active-b', 'js-btn-selected');
        } else {
            // Remove 'active-b' class from all buttons
            buttonsCl.forEach(btn => btn.classList.remove('active-b', 'js-btn-selected'));

            // Add 'active-b' class to the clicked button
            button.classList.add('active-b', 'js-btn-selected');

        }
    });
});

const cirBtn = document.getElementById("cir");
const aniCir = document.getElementById("ani-cir")
let cirBtnVal = cirBtn.innerHTML

const arrowUp = `<span class="material-symbols-outlined">
north
</span>`

const arrowDwn = `<span class="material-symbols-outlined">
south
</span>`

function changeText(text) {
    // Change the text
    cirBtn.innerHTML = text;

    const classesToR = [
        'js-c-yellow',
        'active-b'
    ]

    // Check the updated text and apply classes accordingly
    if (cirBtn.innerHTML === 'VOX') {
        cirBtn.classList.add('js-c-red');
        aniCir.classList.add('twps-ani');
        cirBtn.classList.remove('active-b');
        cirBtn.classList.remove('js-c-yellow');

    } else {
        cirBtn.classList.add('active-b');
        aniCir.classList.remove('twps-ani');
    }
}

function onOff() {
    if (cirBtn.innerHTML === arrowUp) {
        cirBtn.classList.toggle('js-c-yellow');
    }
}