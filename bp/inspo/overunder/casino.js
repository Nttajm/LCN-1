import { displayUserInfo } from "./global.js";

const game = localStorage.getItem('game') || {};

game.spins = game.spins || 0;

for (let i = 0; i < userData.keys; i++) {
    game.spins++;
    saveGame();
}

const wheel = document.querySelector('.wheel');
const button = document.getElementById('spin-button');
const resultDiv = document.getElementById('result');

function saveGame() {
    localStorage.setItem('game', JSON.stringify(game));
    localStorage.setItem('userData', JSON.stringify(userData));
  }


button.addEventListener('click', () => {
    // Resetting the result and animation
    // resultDiv.textContent = '';
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(0deg)';
    game.spins++;
    saveGame();

    if (game.spins <= 3) {
        setTimeout(() => {
            // Setting the actual spinning
            const randomSpin = Math.floor(Math.random() * 3600) + 1480; // Random angle
            wheel.style.transition = 'transform 15s cubic-bezier(0.1, 0.1, 0.1, 1)'; // Slow down effect
            wheel.style.transform = `rotate(${randomSpin}deg)`;
      
            // When the spinning finishes, check the angle
            setTimeout(() => {
              const finalRotation = randomSpin % 360; // Normalize the angle to a range of 0-359 degrees
            //   determineOutcome(finalRotation); // Determine win/loss based on the final angle
            }, 15000); // This timeout matches the spin duration
          }, 100);
    } else {
        userData.keysAdder -= 1;
        displayUserInfo();
    }
  });

//   function determineOutcome(angle) {
//     // Check each range for win or lose condition with individual if statements
//     if (angle >= 0 && angle <= 45) {
//       resultDiv.textContent = 'You WIN!';
//       resultDiv.style.color = 'green';
//     } 
    
//     if (angle >= 46 && angle <= 90) {
//       resultDiv.textContent = 'You LOSE!';
//       resultDiv.style.color = 'red';
//     } 
    
//     if (angle >= 91 && angle <= 135) {
//       resultDiv.textContent = 'You WIN!';
//       resultDiv.style.color = 'green';
//     } 
    
//     if (angle >= 136 && angle <= 180) {
//       resultDiv.textContent = 'You LOSE!';
//       resultDiv.style.color = 'red';
//     } 
    
//     if (angle >= 181 && angle <= 225) {
//       resultDiv.textContent = 'You WIN!';
//       resultDiv.style.color = 'green';
//     } 
    
//     if (angle >= 226 && angle <= 270) {
//       resultDiv.textContent = 'You LOSE!';
//       resultDiv.style.color = 'red';
//     } 
    
//     if (angle >= 271 && angle <= 315) {
//       resultDiv.textContent = 'You WIN!';
//       resultDiv.style.color = 'green';
//     } 
    
//     if (angle >= 316 && angle <= 359) {
//       resultDiv.textContent = 'You LOSE!';
//       resultDiv.style.color = 'red';
//     }
//   }