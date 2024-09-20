const canvas = document.getElementById("plinko-canvas");
const ctx = canvas.getContext("2d");
const dropBallBtn = document.getElementById("drop-ball-btn");

canvas.width = 400;
canvas.height = 600;

const pegs = [];
const balls = [];
const pegRadius = 5;
const ballRadius = 8;
const rows = 8;  // Increased rows for the triangle
const gravity = 0.1;
const ballSpeed = 2;

// Create pegs in a triangle shape
for (let row = 0; row < rows; row++) {
    const cols = row + 1;  // Number of pegs per row increases as we go down
    for (let col = 0; col < cols; col++) {
        const x = (canvas.width / 2) - (cols * 25) / 2 + col * 50; // Center the row
        const y = row * 70 + 50;
        pegs.push({ x, y });
    }
}

// Create the slots at the bottom
const slots = [];
const numSlots = 9;
for (let i = 0; i <= numSlots; i++) {
    slots.push({ x: i * 50, y: canvas.height - 20 });
}

function drawPegs() {
    ctx.fillStyle = "#e74c3c";
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, pegRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    });
}

function drawSlots() {
    ctx.fillStyle = "#34495e";
    slots.forEach(slot => {
        ctx.beginPath();
        ctx.rect(slot.x - 25, slot.y, 50, 20);
        ctx.fill();
        ctx.closePath();
    });
}

function drawBall(ball) {
    ctx.fillStyle = "#3498db";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
}

function updateBall(ball) {
    ball.vy += gravity;
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Check for collisions with pegs
    pegs.forEach(peg => {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < pegRadius + ballRadius) {
            ball.vy = -ball.vy * 0.5;
            ball.vx = (Math.random() * 2 - 1) * ballSpeed;
        }
    });

    // Check for edges of canvas
    if (ball.x - ballRadius < 0 || ball.x + ballRadius > canvas.width) {
        ball.vx = -ball.vx;
    }
    if (ball.y + ballRadius > canvas.height) {
        ball.vy = 0;
        ball.vx = 0;
        ball.y = canvas.height - ballRadius;
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPegs();
    drawSlots();

    balls.forEach(ball => {
        updateBall(ball);
        drawBall(ball);
    });

    requestAnimationFrame(gameLoop);
}

dropBallBtn.addEventListener("click", () => {
    const ball = {
        x: canvas.width / 2,
        y: ballRadius,
        vx: 0,
        vy: 0
    };
    balls.push(ball);
});

gameLoop();
