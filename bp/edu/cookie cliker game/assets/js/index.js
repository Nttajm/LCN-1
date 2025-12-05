let gameScore = parseInt(localStorage.getItem('gameScore')) || 0;
let pointsPerKeyPress = 0;
const output = document.getElementById('score');
const r100 = document.querySelector('.r100');

function increaseScore() {
  const dN = document.getElementById('notif-start');
  dN.style.display = 'none';

  if (pointsPerKeyPress === 0) {
    gameScore++;
  } else {
    gameScore += pointsPerKeyPress;
  }
  output.textContent = gameScore;
  localStorage.setItem('gameScore', gameScore);
}

function claimReward(option, num) {
  if (!r100.classList.contains('disabled')) {
    gameScore += option;
    output.textContent = gameScore;
    localStorage.setItem('gameScore', gameScore);
    r100.classList.add('disabled');
    r100.disabled = true; // Disable the button after it's clicked
    localStorage.setItem('rewardClaimed', 'true'); // Store that the reward is claimed
    pointsPerKeyPress = option; // Increase points per key press to 10 after claiming reward
  }
}

document.addEventListener('keydown', increaseScore);
r100.addEventListener('click', function() {
  claimReward(10, 100); // Assuming the option is 100 and the number for showReward is 10
});

// Load saved score and reward status when the page loads
window.addEventListener('load', function() {
  output.textContent = gameScore;
 // Assuming the number for showReward is 10
});

document.addEventListener("DOMContentLoaded", function() {
  showReward(100 );
});

function showReward(atNumber) {
  if (gameScore >= atNumber) {
    r100.style.display = 'block';
    if (localStorage.getItem('rewardClaimed') === 'true') {
      r100.classList.add('disabled');
      r100.disabled = true;
    }
  }
}

const ClicksPerOutput = document.getElementById('js-Output-clicks');
ClicksPerOutput.innerHTML = pointsPerKeyPress + 10;

console.log(pointsPerKeyPress);
