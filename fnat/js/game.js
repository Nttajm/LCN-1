// fnat (fnaf) game recreation.


import { CLOCK_SET } from "./clock.js";
import { initCameraPanning } from "./util.js";

const elemems = {
  clock: document.querySelector('.clock'),
  doorLeft: document.querySelector('[data-door="left"]'),
  doorRight: document.querySelector('[data-door="right"]'),
  cameras: document.querySelector('.cameras'),
  studentCenter: document.querySelector('.student-center'),
  buttonOverlayLeft: document.querySelector('[data-overlay="left"]'),
  buttonOverlayRight: document.querySelector('[data-overlay="right"]'),
}

export let game = {
  isNew : true, // if it is a new game itll show like thw newspaper animation, if not itll show the normal start screen
  gameStarted : false, // like if the game has started or not
  loop: false,
  time: 0,
  night: 1,
  aiLevel: 1,
  gamespeed: 1000, // in milliseconds
    power: 100,
  powerOn: true,
  usage: 0,
}

export let scene = {
  door1: false,
  door2: false, // false means open, true means closed
  light1: false, // false means off, true means on
  light2: false,
  cameras: false,

  CheckingCameras: false,
}

const movements = {
  weaver: [
    'c2',
    'c3',
    'wkshp',
    'd3',
    'Elab',
    'rdoor',
  ]
}

export function startGame() {
  // set the clock to show 12:00 AM with a custom date text and keep it static
  CLOCK_SET('12:00', 'AM', 'NIGHT 1', true);
  // Initialize camera panning system
  initCameraPanning();
  game.loop = true; 
  initGameLoop();
}



function initGameLoop() {
  const intervalId = setInterval(() => {
    if (!game.loop) {
      clearInterval(intervalId);
      return;
    }
    GameLoop();
  }, game.gamespeed);
}

function GameLoop() {
  game.time += 1;

  updateTronics();
  powerCheckers();
  events();
  updateTime();
  UpdateDevBox();

  updateUsageUI();
}

function UpdateDevBox() {
  const devTime = document.getElementById('dev-time');
  const devPower = document.getElementById('dev-power');
  const devDoorLeft = document.getElementById('dev-door-left');
  const devDoorRight = document.getElementById('dev-door-right');
  const devUsage = document.getElementById('dev-usage');

  if (devTime) devTime.textContent = `time (s): ${game.time}`;
  if (devPower) devPower.textContent = `power: ${game.power.toFixed(1)}%`;
  if (devDoorLeft) devDoorLeft.textContent = `door Left: ${scene.door1 ? 'closed' : 'open'}`;
  if (devDoorRight) devDoorRight.textContent = `door Right: ${scene.door2 ? 'closed' : 'open'}`;
  if (devUsage) devUsage.textContent = `usage: ${game.usage.toFixed(3)}%`;
}


function updateTronics() {
  const random = Math.floor(Math.random() * 20) + 1;
  if (random < game.aiLevel) {
  }
} 


function powerCheckers() {

  let usage = 0;

  if (scene.door1) usage += 0.1;
  if (scene.door2) usage += 0.1;
  if (scene.light1) usage += 0.05;
  if (scene.light2) usage += 0.05;
  if (scene.cameras) usage += 0.15;

  game.power -= usage;
  game.usage = usage;
}

function updateUsageUI() {
  const usage1 = document.getElementById('u1');
  const usage2 = document.getElementById('u2');
  const usage3 = document.getElementById('u3');
  const usage4 = document.getElementById('u4');

  usage1.classList.toggle('dn', !(game.usage > 0));
  usage2.classList.toggle('dn', !(game.usage > 0.1));
  usage3.classList.toggle('dn', !(game.usage > 0.2));
  usage4.classList.toggle('dn', !(game.usage > 0.3));
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

function updateButtonOverlays() {
  if (elemems.buttonOverlayLeft) {
    elemems.buttonOverlayLeft.src = scene.door1
      ? 'assets/buttons/doorclosed_btn_l.png'
      : 'assets/buttons/dooropen_btn_l.png';
  }

  if (elemems.buttonOverlayRight) {
    elemems.buttonOverlayRight.src = scene.door2
      ? 'assets/buttons/doorclosed_btn_r.png'
      : 'assets/buttons/dooropen_btn_r.png';
  }
}

// Update student center background based on door states
function updateStudentCenter() {
  // door1 = left door, door2 = right door
  // false = open, true = closed
  let imageName;
  
  if (!scene.door1 && !scene.door2) {
    imageName = 'LORO'; // Left Open, Right Open
  } else if (!scene.door1 && scene.door2) {
    imageName = 'LORC'; // Left Open, Right Closed
  } else if (scene.door1 && !scene.door2) {
    imageName = 'LCRO'; // Left Closed, Right Open
  } else {
    imageName = 'LCRC'; // Left Closed, Right Closed
  }
  
  elemems.studentCenter.style.backgroundImage = `url('assets/studentcenter/format/${imageName}.png')`;
}

updateButtonOverlays();

// Initialize camera panning when DOM is loaded (fallback)
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for other scripts to load, then check if game view is visible
  setTimeout(() => {
    const gameView = document.querySelector('.game-view');
    if (gameView && !gameView.classList.contains('dn')) {
      initCameraPanning();
    }
  }, 100);
});


// Door & light button toggles

elemems.doorLeft.addEventListener('click', () => {
  scene.door1 = !scene.door1;
  elemems.doorLeft.classList.toggle('active', scene.door1);
  updateButtonOverlays();
  updateStudentCenter();
});

elemems.doorRight.addEventListener('click', () => {
  scene.door2 = !scene.door2;
  elemems.doorRight.classList.toggle('active', scene.door2);
  updateButtonOverlays();
  updateStudentCenter();
});

