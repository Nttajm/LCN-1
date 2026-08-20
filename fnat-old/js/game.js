// fnat (fnaf) game recreation.


import { CLOCK_SET } from "./clock.js";

const elemems = {
  clock: document.querySelector('.clock'),
  night: document.querySelector('.door1'),
  door1: document.querySelector('.door2'),
  door2: document.querySelector('.light1'),
  light1: document.querySelector('.light2'),
  cameras: document.querySelector('.cameras'),
}

export let game = {
  isNew : true, // if it is a new game itll show like thw newspaper animation, if not itll show the normal start screen
  gameStarted : false, // like if the game has started or not
  loop: false,
  time: 0,
  night: 1,
  aiLevel: 1,
  gamespeed: 1000, // in milliseconds
}

export let scene = {
  door1: false,
  door2: false, // false means open, true means closed
  light1: false, // false means off, true means on
  light2: false,
  cameras: false,
  power: 100,
  powerOn: true,
  CheckingCameras: false,
}


export function startGame() {
  // set the clock to show 12:00 AM with a custom date text and keep it static
  CLOCK_SET('12:00', 'AM', 'NIGHT 1', true);
  // game.loop = true; 
  // initGameLoop();
}



function initGameLoop() {
  while (game.loop) {
    setInterval(() => {
      GameLoop();
    }, game.gamespeed);
  }
}

function GameLoop() {
  game.time += 1;

  updateTronics();
  powerCheckers();
  events();
  updateTime();
}

function updateTronics() {
  const random = Math.floor(Math.random() * 20) + 1;
  while (random < game.aiLevel) {
  }
} 


function powerCheckers() {
  if (scene.door1 || scene.door2) {
    scene.power -= 0.5; // if the door is closed it uses 0.5% power per second, if its open it uses 0% power per second
  }

  if ( scene.door1 && scene.door2) {
    scene.power -= 1; // if both doors are closed it uses 1% power per second, if one is open and the other is closed it uses 0.5% power per second, if both are open it uses 0% power per second
  }

  if (scene.light1 || scene.light2) {
    scene.power -= 0.5; // if the light is on it uses 0.5% power per second, if its off it uses 0% power per second
  }

  if (scene.cameras) {
    scene.power -= 0.2;
  }
}

function updateTime() {
  if (game.night == 1) {
    HELPER_updateTime(30);
  } else if (game.night == 2) {
    HELPER_updateTime(25);
  }
}

function HELPER_updateTime(divby) {
  const hours = Math.floor(game.time / divby) + 12;
    const displayHour = hours > 12 ? hours - 12 : hours;
    CLOCK_SET(`${displayHour}:00`, 'AM', `NIGHT ${game.night}`);
}

function events() {
}