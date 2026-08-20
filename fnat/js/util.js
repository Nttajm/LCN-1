// button toggling main menu, start screen - done by ai - chatgbt

import { startGame_Anim } from "./animation.js"; 

function initCameraButtonToggle() {
  const cameraButton = document.querySelector('.cameras-button');
  const ipad = document.querySelector('.ipad');
  const staticVideo = document.querySelector('.static-video');
  const ipadScreenData = document.querySelector('.ipad-screen-data');

  if (!cameraButton || !ipad) return;

  cameraButton.addEventListener('click', () => {
    const isOn = ipad.classList.contains('screen-on');
    const currentRoomImg = document.querySelector('.current-room');

    if (!isOn) {
      // Opening iPad - play static
      if (staticVideo && currentRoomImg) {
        staticVideo.classList.remove('dn');
        currentRoomImg.classList.add('dn');
        staticVideo.currentTime = 0;
        staticVideo.play();
        
        setTimeout(() => {
          staticVideo.classList.add('dn');
          currentRoomImg.classList.remove('dn');
        }, 1000);
      }
    }

    ipad.classList.toggle('screen-on', !isOn);
    ipad.classList.toggle('screen-off', isOn);

    if (!isOn) {
      cameraSystem.isMovingLeft = false;
      cameraSystem.isMovingRight = false;
    }

    const studentCenterImg = document.querySelector('.student-center');
    if (studentCenterImg) {
      studentCenterImg.classList.toggle('unfoucsed', !isOn);
      studentCenterImg.classList.toggle('focused', isOn);
    }

  });
}

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

initCameraButtonToggle();

// Room switching functionality
function initRoomSwitching() {
  const rooms = document.querySelectorAll('.room');
  const currentRoomImg = document.querySelector('.current-room');
  const ipadScreen = document.querySelector('.ipad-screen');
  const staticVideo = document.querySelector('.static-video');
  const ipadScreenData = document.querySelector('.ipad-screen-data');

  if (!rooms.length || !currentRoomImg || !ipadScreen) return;

  rooms.forEach(room => {
    room.addEventListener('click', () => {
      const roomId = room.id.toLowerCase();
      
      // Play static video
      if (staticVideo && currentRoomImg) {
        staticVideo.classList.remove('dn');
        currentRoomImg.classList.add('dn');
        staticVideo.currentTime = 0;
        staticVideo.play();
        
        // After 1 second, change the room and hide static
        setTimeout(() => {
          // Update room image
          currentRoomImg.src = `game_rooms/${roomId}/${roomId}_empty.png`;
          currentRoomImg.dataset.currRoom = roomId.toUpperCase();
          
          staticVideo.classList.add('dn');
          currentRoomImg.classList.remove('dn');
        }, 1000);
      }
    });
  });
}

initRoomSwitching();

// end  



// Camera panning system
let cameraSystem = {
  currentPanX: 0, // current horizontal pan position in pixels (0 = center)
  maxPanX: 0, // set on init based on viewport width
  panSpeed: 8, // pixels per frame
  isMovingLeft: false,
  isMovingRight: false,
  studentCenterElement: null,
}



export function initCameraPanning() {
  if (cameraSystem.studentCenterElement) return;
  
  cameraSystem.studentCenterElement = document.querySelector('.student-center');
  
  if (!cameraSystem.studentCenterElement) return;
  
  cameraSystem.maxPanX = window.innerWidth * 0.25;
  cameraSystem.studentCenterElement.style.transform = 'translateX(0px)';
  
  document.addEventListener('mousemove', handleCameraPanning);
  
  // Start the camera panning animation loop
  requestAnimationFrame(updateCameraPosition);
}

function handleCameraPanning(event) {
  const ipad = document.querySelector('.ipad');
  const isIpadActive = ipad && ipad.classList.contains('screen-on');

  if (isIpadActive) {
    cameraSystem.isMovingLeft = false;
    cameraSystem.isMovingRight = false;
    return;
  }

  const screenWidth = window.innerWidth;
  const mouseX = event.clientX;
  const leftThreshold = screenWidth * 0.2; // 20% from left
  const rightThreshold = screenWidth * 0.8; // 20% from right
  
  cameraSystem.isMovingLeft = false;
  cameraSystem.isMovingRight = false;
  
  if (mouseX <= leftThreshold) {
    cameraSystem.isMovingLeft = true;
  }
  else if (mouseX >= rightThreshold) {
    cameraSystem.isMovingRight = true;
  }
}

function updateCameraPosition() {
  // Pan right (mouse on left → reveal left side → div shifts right)
  if (cameraSystem.isMovingLeft && cameraSystem.currentPanX < cameraSystem.maxPanX) {
    cameraSystem.currentPanX += cameraSystem.panSpeed;
    if (cameraSystem.currentPanX > cameraSystem.maxPanX) {
      cameraSystem.currentPanX = cameraSystem.maxPanX;
    }
  }
  
  // Pan left (mouse on right → reveal right side → div shifts left)
  if (cameraSystem.isMovingRight && cameraSystem.currentPanX > -cameraSystem.maxPanX) {
    cameraSystem.currentPanX -= cameraSystem.panSpeed;
    if (cameraSystem.currentPanX < -cameraSystem.maxPanX) {
      cameraSystem.currentPanX = -cameraSystem.maxPanX;
    }
  }
  
  // Apply the position
  if (cameraSystem.studentCenterElement) {
    cameraSystem.studentCenterElement.style.transform = `translateX(${cameraSystem.currentPanX}px)`;
  }
  
  // Continue the animation loop
  requestAnimationFrame(updateCameraPosition);
}

