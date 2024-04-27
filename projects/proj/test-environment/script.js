const ball = document.getElementById('ball');
const paddleLeft = document.getElementById('paddleLeft');
const paddleRight = document.getElementById('paddleRight');
const gameArea = document.getElementById('gameArea');

let ballX = 390;
let ballY = 190;
let ballSpeedX = getRandomSpeed();
let ballSpeedY = getRandomSpeed();

let paddleLeftY = 150;
let paddleRightY = 150;

function getRandomSpeed() {
  return (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 2 + 1);
}

function update() {
  // Update ball position
  ballX += ballSpeedX;
  ballY += ballSpeedY;

  // Check collision with top and bottom walls
  if (ballY <= 0 || ballY >= 380) {
    ballSpeedY = -ballSpeedY;
  }

  // Check collision with left paddle
  if (ballX <= 20 && ballY + 20 >= paddleLeftY && ballY <= paddleLeftY + 100) {
    ballSpeedX = -ballSpeedX;
  }

  // Check collision with right paddle
  if (ballX >= 760 && ballY + 20 >= paddleRightY && ballY <= paddleRightY + 100) {
    ballSpeedX = -ballSpeedX;
  }

  // Check if ball goes out of bounds
  if (ballX <= 0 || ballX >= 780) {
    // Reset ball position and speed
    ballX = 390;
    ballY = 190;
    ballSpeedX = getRandomSpeed();
    ballSpeedY = getRandomSpeed();
  }

  // Move paddles with mouse
  gameArea.addEventListener('mousemove', function(event) {
    let mouseY = event.clientY - gameArea.offsetTop;
    paddleLeftY = mouseY - 50;
  });

  // Update paddleRightY to track the ball
  paddleRightY = ballY - 50;

  // Render elements
  ball.style.left = ballX + 'px';
  ball.style.top = ballY + 'px';
  paddleLeft.style.top = paddleLeftY + 'px';
  paddleRight.style.top = paddleRightY + 'px';
}

// Game loop
setInterval(update, 1000 / 200);
