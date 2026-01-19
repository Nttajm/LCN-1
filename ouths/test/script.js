const dropButton = document.getElementById('drop-btn');
const resultDisplay = document.getElementById('result');
const slots = document.querySelectorAll('.slot');

function dropBall() {
    const ball = document.createElement('div');
    ball.className = 'ball';
    ball.style.position = 'absolute';
    ball.style.width = '15px';
    ball.style.height = '15px';
    ball.style.borderRadius = '50%';
    ball.style.backgroundColor = 'red';
    ball.style.top = '0px';
    ball.style.left = Math.random() * (280 - 15) + 'px'; // Random starting position
    document.getElementById('plinko-board').appendChild(ball);

    let interval = setInterval(() => {
        let top = parseInt(ball.style.top);
        if (top < 400) {
            ball.style.top = (top + 5) + 'px'; // Fall speed
            ball.style.left = (Math.random() < 0.5 ? parseInt(ball.style.left) - 5 : parseInt(ball.style.left) + 5) + 'px'; // Random left-right movement
        } else {
            clearInterval(interval);
            checkSlot(ball);
            ball.remove();
        }
    }, 100);
}

function checkSlot(ball) {
    const ballRect = ball.getBoundingClientRect();
    const slotsArray = Array.from(slots);
    const landedSlot = slotsArray.find(slot => {
        const slotRect = slot.getBoundingClientRect();
        return ballRect.right > slotRect.left && ballRect.left < slotRect.right && ballRect.bottom > slotRect.top;
    });

    if (landedSlot) {
        const value = landedSlot.getAttribute('data-value');
        resultDisplay.textContent = `You landed in a slot worth $${value}!`;
    } else {
        resultDisplay.textContent = "Missed all slots!";
    }
}

dropButton.addEventListener('click', dropBall);
