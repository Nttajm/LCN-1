let gameScore = parseInt(localStorage.getItem('gameScore')) || 0;
    let pointsPerKeyPress = 1;
    const output = document.getElementById('score');
    const r100 = document.getElementById('r100');

     function increaseScore() {
        const dN = document.getElementById('notif-start')
        dN.style.display = 'none';
      gameScore += pointsPerKeyPress;
      output.textContent = gameScore;
      localStorage.setItem('gameScore', gameScore);
    }

    function claimReward() {
      if (!r100.classList.contains('disabled')) {
        gameScore += 10;
        output.textContent = gameScore;
        localStorage.setItem('gameScore', gameScore);
        r100.classList.add('disabled');
        r100.disabled = true; // Disable the button after it's clicked
        localStorage.setItem('rewardClaimed', 'true'); // Store that the reward is claimed
        pointsPerKeyPress = 10; // Increase points per key press to 10 after claiming reward
      }
    }

    document.addEventListener('keydown', increaseScore);
    r100.addEventListener('click', claimReward);

    // Load saved score and reward status when the page loads
    window.addEventListener('load', function() {
      output.textContent = gameScore;
      if (gameScore >= 100) {
        r100.style.display = 'block';
        if (localStorage.getItem('rewardClaimed') === 'true') {
          r100.classList.add('disabled');
          r100.disabled = true;
          pointsPerKeyPress = 10; // Set points per key press to 10 if reward is claimed
        }
      }
    })