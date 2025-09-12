const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{};:\\"/,.<>?';
const letterShuffleSpeed = 3;  // ms between random char changes
const letterSettleDelay = 8;   // ms pause before next letter locks
const shuffleFramesPerLetter = 1;
const shuffleWindowSize = 3;

function randChar() {
  return chars.charAt(Math.floor(Math.random() * chars.length));
}

export function shuffleElement(el) {
  const finalStr = el.textContent;
  let result = Array(finalStr.length).fill(' ');
  let currentIndex = 0;

  el.textContent = result.join('');

  function shuffleStep() {
    if (currentIndex >= finalStr.length) {
      el.textContent = finalStr;
      return;
    }

    let shuffleCount = 0;
    const shuffleInterval = setInterval(() => {
      // randomize current + window ahead
      result[currentIndex] = randChar();
      for (let i = currentIndex + 1; i < currentIndex + 1 + shuffleWindowSize && i < finalStr.length; i++) {
        result[i] = randChar();
      }

      el.textContent = result.join('');

      shuffleCount++;
      if (shuffleCount >= shuffleFramesPerLetter) {
        clearInterval(shuffleInterval);
        result[currentIndex] = finalStr[currentIndex]; // lock letter
        el.textContent = result.join('');
        currentIndex++;
        setTimeout(shuffleStep, letterSettleDelay);
      }
    }, letterShuffleSpeed);
  }

  shuffleStep();
}

// run on DOM load
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.js-shuffle').forEach(el => shuffleElement(el));
});

// optional: re-trigger shuffle when element is revealed
export function retriggerShuffleOnShow() {
    const allElements = document.querySelectorAll('.js-shuffle');
    allElements.forEach(el => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    shuffleElement(el);
                }
            });
        });
        observer.observe(el);
    });
}

// example: watch all shuffle elements for re-show
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.js-shuffle').forEach(el => retriggerShuffleOnShow(el));
});
