// UCLA Admission Decision Script
// Handles reveal animation, confetti, and screen transitions

const decisionScreen = document.getElementById('decisionScreen');
const boundScreen = document.getElementById('boundScreen');
const letterScreen = document.getElementById('letterScreen');
const revealBtn = document.getElementById('revealBtn');
const continueBtn = document.getElementById('continueBtn');
const confettiCanvas = document.getElementById('confettiCanvas');

// Confetti configuration
const confettiColors = ['#2774AE', '#FFD100', '#FFFFFF', '#005587', '#8BB8E8'];
let confettiPieces = [];
let animationId;

// Initialize confetti canvas
function initConfetti() {
  const ctx = confettiCanvas.getContext('2d');
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  
  // Create confetti pieces
  for (let i = 0; i < 200; i++) {
    confettiPieces.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      size: Math.random() * 10 + 5,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      speed: Math.random() * 3 + 2,
      angle: Math.random() * Math.PI * 2,
      spin: Math.random() * 0.2 - 0.1,
      shape: Math.random() > 0.5 ? 'rect' : 'circle'
    });
  }
  
  animateConfetti(ctx);
}

// Animate confetti falling
function animateConfetti(ctx) {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  
  confettiPieces.forEach((piece, index) => {
    piece.y += piece.speed;
    piece.x += Math.sin(piece.angle) * 2;
    piece.angle += piece.spin;
    
    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.angle);
    ctx.fillStyle = piece.color;
    
    if (piece.shape === 'rect') {
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, piece.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
    
    // Reset piece if it falls off screen
    if (piece.y > confettiCanvas.height + 20) {
      piece.y = -20;
      piece.x = Math.random() * confettiCanvas.width;
    }
  });
  
  animationId = requestAnimationFrame(() => animateConfetti(ctx));
}

// Stop confetti animation
function stopConfetti() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  if (confettiCanvas) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
});

// Reveal button click - transition to bound screen
revealBtn.addEventListener('click', () => {
  // Add exit animation to decision screen
  decisionScreen.style.animation = 'fadeOut 0.5s ease-out forwards';
  
  setTimeout(() => {
    decisionScreen.classList.add('hidden');
    boundScreen.classList.remove('hidden');
    
    // Start confetti
    initConfetti();
    
    // Play celebration sound (optional - you can add audio later)
    // const audio = new Audio('unis/ucla/audio/celebration.mp3');
    // audio.play();
    
    // Stop confetti after 10 seconds
    setTimeout(stopConfetti, 10000);
  }, 500);
});

// Continue button click - transition to letter screen
continueBtn.addEventListener('click', () => {
  boundScreen.style.animation = 'fadeOut 0.5s ease-out forwards';
  stopConfetti();
  
  setTimeout(() => {
    boundScreen.classList.add('hidden');
    letterScreen.classList.remove('hidden');
    letterScreen.style.animation = 'fadeIn 0.8s ease-out';
  }, 500);
});

// Add fadeOut and fadeIn keyframes dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;
document.head.appendChild(style);

// Easter egg: Konami code for extra confetti burst
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
  konamiCode.push(e.key);
  konamiCode = konamiCode.slice(-10);
  
  if (konamiCode.join('') === konamiSequence.join('')) {
    // Extra confetti burst!
    if (!boundScreen.classList.contains('hidden')) {
      for (let i = 0; i < 100; i++) {
        confettiPieces.push({
          x: confettiCanvas.width / 2,
          y: confettiCanvas.height / 2,
          size: Math.random() * 15 + 5,
          color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
          speed: Math.random() * 5 + 3,
          angle: Math.random() * Math.PI * 2,
          spin: Math.random() * 0.3 - 0.15,
          shape: Math.random() > 0.5 ? 'rect' : 'circle'
        });
      }
    }
  }
});

// Console welcome message
console.log('%c🐻 Go Bruins! 💙💛', 'font-size: 24px; font-weight: bold; color: #2774AE;');
console.log('%cWelcome to UCLA!', 'font-size: 16px; color: #FFD100;');
