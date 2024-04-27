const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");

const gridSize = 20;
const tileCount = 20;
let snake, xVelocity, yVelocity, foodX, foodY, score, gameLoop;

function getRandomPosition() {
  return Math.floor(Math.random() * tileCount);
}

function draw() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw snake
  ctx.fillStyle = "#000";
  snake.forEach(segment => {
    ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
  });

  // Draw food
  ctx.fillStyle = "#f00";
  ctx.fillRect(foodX * gridSize, foodY * gridSize, gridSize, gridSize);

  // Draw score
  ctx.fillStyle = "#000";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 10, 30);
}

function update() {
  const head = { x: snake[0].x + xVelocity, y: snake[0].y + yVelocity };
  snake.unshift(head);

  // Check if snake eats food
  if (head.x === foodX && head.y === foodY) {
    score += 10;
    generateFood();
  } else {
    snake.pop();
  }

  // Check if snake hits wall or itself
  if (
    head.x < 0 ||
    head.x >= tileCount ||
    head.y < 0 ||
    head.y >= tileCount ||
    snake.some(segment => segment.x === head.x && segment.y === head.y && segment !== head)
  ) {
    clearInterval(gameLoop);
    alert("Game Over! Your Score: " + score);
  }
}

function generateFood() {
  foodX = getRandomPosition();
  foodY = getRandomPosition();
  if (snake.some(segment => segment.x === foodX && segment.y === foodY)) {
    generateFood();
  }
}

function keydownHandler(event) {
  switch (event.key) {
    case "ArrowUp":
      if (yVelocity === 0) {
        xVelocity = 0;
        yVelocity = -1;
      }
      break;
    case "ArrowDown":
      if (yVelocity === 0) {
        xVelocity = 0;
        yVelocity = 1;
      }
      break;
    case "ArrowLeft":
      if (xVelocity === 0) {
        xVelocity = -1;
        yVelocity = 0;
      }
      break;
    case "ArrowRight":
      if (xVelocity === 0) {
        xVelocity = 1;
        yVelocity = 0;
      }
      break;
  }
}

function startGame() {
  snake = [{ x: 10, y: 10 }];
  xVelocity = 0;
  yVelocity = 0;
  score = 0;
  generateFood();
  gameLoop = setInterval(() => {
    update();
    draw();
  }, 100);
  startButton.disabled = true;
}

startButton.addEventListener("click", startGame);
