const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{};:\\"/,.<>?';
const letterShuffleSpeed = 3; // ms between random char changes
const letterSettleDelay = 8;  // ms pause before next letter locks
const shuffleFramesPerLetter = 1; // frames before a letter locks
const shuffleWindowSize = 3; // how many letters ahead to shuffle

function randChar() {
  return chars.charAt(Math.floor(Math.random() * chars.length));
}

function shuffleSpanOrdered(span) {
  const finalStr = span.textContent;
  let result = Array(finalStr.length).fill(' ');
  let currentIndex = 0;

  span.textContent = result.join('');

  function shuffleStep() {
    if (currentIndex >= finalStr.length) {
      span.textContent = finalStr;
      return;
    }

    let shuffleCount = 0;
    const shuffleInterval = setInterval(() => {
      // Keep already-locked letters correct
      result[currentIndex] = randChar();

      // Shuffle only a small window ahead of the current letter
      for (let i = currentIndex + 1; i < currentIndex + 1 + shuffleWindowSize && i < finalStr.length; i++) {
        result[i] = randChar();
      }

      span.textContent = result.join('');

      shuffleCount++;
      if (shuffleCount >= shuffleFramesPerLetter) {
        clearInterval(shuffleInterval);
        result[currentIndex] = finalStr[currentIndex]; // lock letter
        span.textContent = result.join('');
        currentIndex++;
        setTimeout(shuffleStep, letterSettleDelay);
      }
    }, letterShuffleSpeed);
  }

  shuffleStep();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.js-shuffle').forEach(span => {
    shuffleSpanOrdered(span);
  });
});
