let gameScore = parseInt(localStorage.getItem('gameScore')) || 0;
let pointsPerKeyPress = parseInt(localStorage.getItem('ppkp')) || 0;
let output = document.getElementById('score');

const button = document.querySelector('.rwd-btn')

function increaseScore() {
  const dN = document.getElementById('notif-start')
  dN.style.display = 'none';

  if (pointsPerKeyPress === 0) {
    gameScore++;
  } else {
    gameScore += pointsPerKeyPress;
  }
  output.textContent = gameScore;
  localStorage.setItem('gameScore', gameScore);
}

function claimReward(at, reward, id) {
  if (gameScore >= at) {
    pointsPerKeyPress = reward;

    localStorage.setItem('gameScore', gameScore);
    localStorage.setItem('ppkp', pointsPerKeyPress);
    localStorage.setItem(`${id}`, 'true')
  } else 
}

function showReward(id) {
  const buttonClaim = document.getElementById(`${id}`);
  buttonClaim.style.display = 'block';
}

window.addEventListener('load', function() {
  output.textContent = gameScore;
})

document.addEventListener('keydown', increaseScore);

