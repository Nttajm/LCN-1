const inputElem = document.querySelector('.input');
const inputCont = document.querySelector('.input-sec');
const container = document.querySelector('.cont')
const inputIncorrect = document.getElementById('incorrect-cont');
const info = document.getElementById('info');
const password = 'admin';

const okBtn = document.getElementById('okBtn');
const enterBtn = document.getElementById('enterBtn');

const overlayCont = document.getElementById('overlay');

document.addEventListener('click', function(event) {
    container.classList.remove('dn');
    overlayCont.classList.add('dn')
});

document.addEventListener('keydown', function(event) {
    container.classList.remove('dn');
    overlayCont.classList.add('dn')
});

const currentDateElement = document.querySelector('.date');
const options = { weekday: 'long', month: 'long', day: 'numeric' };
const currentDate = new Date().toLocaleDateString('en-US', options);
currentDateElement.textContent = currentDate;


enterBtn.addEventListener('click', function(event) {
    EnterByButton();
});

inputElem.addEventListener('keydown', function(event) {
    const key = event.key; 
    if (key === 'Enter') {
        EnterByButton();
      } else if (key === 'Escape') {
        inputElem.value = '';
      }
});

function EnterByButton() {
    const inputValue = inputElem.value;
    if (inputValue === password) {
        info.innerHTML = "Good Job!";
    } else {
        inputCont.classList.add('dn');
        inputIncorrect.classList.remove('dn')
    }
}

document.addEventListener('keydown', function(event) {
    inputCont.classList.remove('dn');
    inputIncorrect.classList.add('dn') 
});

okBtn.addEventListener('click', function(event) {
    inputCont.classList.remove('dn');
    inputIncorrect.classList.add('dn') 
});

inputElem.addEventListener('keydown', function(event) {
    if (event.getModifierState('CapsLock')) {
        info.innerHTML = "Caps lock on";
        info.style.display = 'block'; // Show the info element
    } else {
        info.innerHTML = ''; // Hide the info element if Caps Lock is off
    }
});

function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0'); // Get hours and pad with leading zero if necessary
    const minutes = String(now.getMinutes()).padStart(2, '0'); // Get minutes and pad with leading zero if necessary
    const timeString = `${hours}:${minutes}`;
    
    // Update the HTML element with id "time" with the time string
    document.querySelector('.time').textContent = timeString;
}

setInterval(updateTime, 100);