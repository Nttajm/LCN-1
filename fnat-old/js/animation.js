import { CLOCK_SET } from "./clock.js";
import { startGame } from "./game.js";


  const startScreen = document.querySelector('.start-game');
  const gameContainer = document.querySelector('.game');
  const newspaper = document.querySelector('.newspaper');
  const clockShow = document.querySelector('.clock-show');

    const gameView = document.querySelector('.game-view');


const devMode = true; // if true, itll skip the newspaper animation and go straight to the game

if (devMode) {
  startScreen.classList.add('dn');
  newspaper.classList.add('dn');
  clockShow.classList.add('dn');
  gameContainer.classList.remove('dn');
  gameContainer.classList.add('opening-game');
  gameView.classList.add('opening-game');
  startGame();
}


// start the fnaf news thingy
export function startGame_Anim() {

  if (!startScreen) return;
 
  gameContainer.classList.remove('dn');
  gameContainer.classList.add('opening-game');

  // After 5 seconds, fade out newspaper to black over 2.5 seconds
  setTimeout(() => {
    newspaper.classList.add('closing-news');
  }, 5000);

  setTimeout(() => {
    startScreen.classList.add('dn');
  }, 4000);

  // After 7.5 seconds (5s + 2.5s fade), show black screen with clock
  setTimeout(() => {
    showClock_Anim(true);
    startGame();
  }, 7500);

  // After 10.5 seconds (clock shows for 3 seconds), hide clock and start game
  setTimeout(() => {
    showClock_Anim(false);
  }, 12500);

  setTimeout(() => { 
    gameView.classList.add("opening-game");
  }, 13000);


}

function showClock_Anim(t) {
  const clock = document.querySelector('.clock-show');
  if (t) {
    clock.classList.remove('dn');
  } else {
    clock.classList.add('dn');
  }
}