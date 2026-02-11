// button toggling main menu, start screen - done by ai - chatgbt

import { startGame_Anim } from "./animation.js";

function initStartMenuNavigation() {
  const menu = document.querySelector('.start-game .actions');
  const buttons = menu ? Array.from(menu.querySelectorAll('button')) : [];
  if (!buttons.length) return;

  let currentIndex = 0;
  let caret =
    menu.querySelector('.caret') ||
    Object.assign(document.createElement('span'), {
      className: 'caret',
      textContent: '>>',
    });

  const select = newIndex => {
    currentIndex = newIndex;
    const activeButton = buttons[currentIndex];
    activeButton.prepend(caret);
    buttons.forEach(button =>
      button.classList.toggle('selected', button === activeButton)
    );
    activeButton.focus();
  };

  select(0);

  // when a menu option is activated (click or Enter), start the game animation
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      startGame_Anim();
    });
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      select((currentIndex + 1) % buttons.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      select((currentIndex - 1 + buttons.length) % buttons.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      buttons[currentIndex].click();
    }
  });
}

initStartMenuNavigation();

// end 