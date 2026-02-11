import { CLOCK_SET } from "./clock.js";
import { startGame } from "./game.js";
let game = {
  isNew : true, // if it is a new game itll show like thw newspaper animation, if not itll show the normal start screen
  gameStarted : false, // like if the game has started or not
}


// start the fnaf news thingy
export function startGame_Anim() {
  const startScreen = document.querySelector('.start-game');
  const gameContainer = document.querySelector('.game');
  const newspaper = document.querySelector('.newspaper');
  if (!startScreen) return;

  gameContainer.classList.remove('dn');
  gameContainer.classList.add('opening-game');

  // remove after seconds is what it does, timeot for 3 seconds before it removes the newspaper and shows the game
  setTimeout(() => {
    startScreen.classList.add('dn');
    newspaper.classList.add('closing-news');
  }, 6000);

  setTimeout(() => {
    startGame();
    showClock_Anim(true);
  }, 9000);

  setTimeout(() => {
    showClock_Anim(false);
  }, 14000);

}

function showClock_Anim(t) {
  const clock = document.querySelector('.clock-show');
  if (t) {
    clock.classList.remove('dn');
  } else {
    clock.classList.add('dn');
  }
}