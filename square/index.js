import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc,getDocs, addDoc, collection, getCountFromServer, query  } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyDtto_Unnm75LvHTCiC3NwL2rhuLszJPUs",
    authDomain: "square-lcn.firebaseapp.com",
    projectId: "square-lcn",
    storageBucket: "square-lcn.firebasestorage.app",
    messagingSenderId: "496286011021",
    appId: "1:496286011021:web:b155b1ea2b7897877d5cc4",
    measurementId: "G-HLG1LW5XVP"
  };

  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const auth = getAuth();
  const db = getFirestore(app);


  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'signin.html';
    }
  });

  // auth.signOut().then(() => {
  //   console.log('User signed out.');
  // }).catch((error) => {
  //   console.error('Sign out error:', error);
  // });


const gridContainer = document.getElementById('grid-container');
const viewport = document.getElementById('viewport');
let scale = 1;
let mapX = 0;
let mapY = 0;
let isDragging = false;
let lastMouseX, lastMouseY;
const gridData = [
   
];

// Generate the grid
for (let y = 1; y <= 100; y++) {
  for (let x = 1; x <= 100; x++) {
    const gridCell = document.createElement('div');
    gridCell.classList.add('grid-cell');
    gridCell.setAttribute('data-x', x);
    gridCell.setAttribute('data-y', y);
    gridContainer.appendChild(gridCell);
  }
}

const loadDiv = document.querySelector('.loadboxes');

function renderColorData() {
  const gridRef = collection(db, 'grid', 'data', 'cells'); // Reference to your Firestore collection
  onSnapshot(gridRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      const gridCell = gridContainer.querySelector(`[data-x="${data.x}"][data-y="${data.y}"]`);
      if (gridCell) {
        gridCell.style.backgroundColor = data.color; // Set the cell's background color
      }
    });

    // Once all cells are rendered, add the 'loaded' class to the loadDiv
    loadDiv.classList.add('loaded');
    closeBoxesWithDelay();
  });
}


renderColorData();

// Update the map transformation
function updateTransform() {
  gridContainer.style.transform = `translate(${mapX}px, ${mapY}px) scale(${scale})`;
}

// Get the grid square at the center of the screen
function getCenterGridCell() {
  // Get the center of the viewport
  const centerX = viewport.offsetWidth / 2;
  const centerY = viewport.offsetHeight / 2;

  // Get the position of the grid relative to the viewport
  const rect = gridContainer.getBoundingClientRect();
  const gridX = (centerX - rect.left) / scale;
  const gridY = (centerY - rect.top) / scale;

  // Calculate the closest grid cell based on the scale
  const cellX = Math.floor(gridX / 10) ;  // Assuming 10px per cell in the unscaled state
  const cellY = Math.floor(gridY / 10) ;

  // Get the grid cell element at the calculated coordinates
  const selectedCell = gridContainer.querySelector(`[data-x="${cellX}"][data-y="${cellY}"]`);

  return selectedCell;
}

// Add the "hovering" class to the center grid cell
function updateCenterHover() {
  const centerCell = getCenterGridCell();
  // Remove previous "hovering" class from all cells
  gridContainer.querySelectorAll('.grid-cell').forEach(cell => {
    cell.classList.remove('hovering');
  });
  // Add "hovering" class to the center cell
  if (centerCell) {
    centerCell.classList.add('hovering');
  }
}

// Handle WASD movement
document.addEventListener('keydown', (e) => {
  const speed = 10 / scale;
  if (e.key === 'w') mapY += speed;
  if (e.key === 'a') mapX += speed;
  if (e.key === 's') mapY -= speed;
  if (e.key === 'd') mapX -= speed;
  updateTransform();
  updateCenterHover(); // Update hovering when movement happens
});

// Handle dragging with mouse
viewport.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

viewport.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  mapX += dx;
  mapY += dy;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  updateTransform();
  updateCenterHover(); // Update hovering when dragging happens
  updateCoordView();
});

viewport.addEventListener('mouseup', () => {
  isDragging = false;
});

viewport.addEventListener('mouseleave', () => {
  isDragging = false;
});
viewport.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) { // Single touch only
    isDragging = true;
    lastMouseX = e.touches[0].clientX;
    lastMouseY = e.touches[0].clientY;
  }
});

viewport.addEventListener('touchmove', (e) => {
  if (!isDragging || e.touches.length !== 1) return; // Ignore multi-touch
  const dx = e.touches[0].clientX - lastMouseX;
  const dy = e.touches[0].clientY - lastMouseY;
  mapX += dx;
  mapY += dy;
  lastMouseX = e.touches[0].clientX;
  lastMouseY = e.touches[0].clientY;
  updateTransform();
  updateCenterHover();
  updateCoordView();
});

viewport.addEventListener('touchend', () => {
  isDragging = false;
});

// Handle zoom with mouse wheel (desktop) and pinch gesture (mobile)
viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomSpeed = 0.1;
  const prevScale = scale;
  scale += e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
  scale = Math.min(Math.max(0.5, scale), 2); // Limit zoom levels

  const rect = viewport.getBoundingClientRect();
  const cursorX = (e.clientX - rect.left) - (viewport.offsetWidth / 2);
  const cursorY = (e.clientY - rect.top) - (viewport.offsetHeight / 2);

  const scaleDelta = scale / prevScale;
  mapX = cursorX - (cursorX - mapX) * scaleDelta;
  mapY = cursorY - (cursorY - mapY) * scaleDelta;

  updateTransform();
  updateCenterHover();
  updateCoordView();
});

// Pinch-to-zoom (mobile)
let initialPinchDistance = null;
let initialScale = scale;

viewport.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) { // Multi-touch for pinch-to-zoom
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (initialPinchDistance === null) {
      initialPinchDistance = distance;
      initialScale = scale;
    } else {
      const scaleFactor = distance / initialPinchDistance;
      scale = Math.min(Math.max(0.5, initialScale * scaleFactor), 2);

      updateTransform();
      updateCenterHover();
      updateCoordView();
    }
  }
});

viewport.addEventListener('touchend', () => {
  if (e.touches.length < 2) {
    initialPinchDistance = null;
    initialScale = scale;
  }
});

// Initialize transformation and center hovering
updateTransform();
updateCenterHover();

// Handle click to select the centered grid cell




// ui 

function updateCoordView() {
    const currentHoverDiv = document.querySelector('.grid-cell.hovering');
    const coordOutput = document.getElementById('js_coordinates');
    const cHy = currentHoverDiv.getAttribute('data-y');
    const cHx = currentHoverDiv.getAttribute('data-x');

    coordOutput.innerHTML = `(${cHx}, ${cHy})`;
}

updateCoordView();


const selectPlace = document.getElementById('select-place');
const cancelBtn = document.getElementById('cancel-btn');
const placediv = document.getElementById('js_place');
selectPlace.addEventListener('click', () => {
    placediv.classList.toggle('on');
});
cancelBtn.addEventListener('click', () => {
    placediv.classList.toggle('on');
});

const colors = document.querySelectorAll('.color');
colors.forEach(color => {
    color.addEventListener('click', () => {
        colors.forEach(c => c.classList.remove('selected'));
        color.classList.add('selected');
    });
});

async function placeSqare() {
    const currentHoverDiv = document.querySelector('.grid-cell.hovering');
    const cHy = currentHoverDiv.getAttribute('data-y');
    const cHx = currentHoverDiv.getAttribute('data-x');

    const selectedColor = document.querySelector('.color.selected');
    const color = selectedColor.dataset.color;

    const gridRef = collection(db, 'grid', 'data', 'cells');
    await addDoc(gridRef, {
        x: cHx,
        y: cHy,
        color: color,
    });


    renderColorData();
    console.log(gridData);
}

const placeBtn = document.getElementById('place-btn');
placeBtn.addEventListener('click', placeSqare);



function loadBoxes() {
    const nbBoxes = Math.ceil((window.innerWidth / (window.innerWidth / 12)) * (window.innerHeight / (window.innerWidth / 12)));
    for (let i = 0; i < nbBoxes; i++) {
        const box = document.createElement('div');
        box.classList.add('box');
        loadDiv.appendChild(box);
    }
}

function closeBoxesWithDelay() {
    if (loadDiv.classList.contains('loaded')) {
        const boxes = document.querySelectorAll('.box');
        boxes.forEach(box => {
            const delay = Math.random(); // Random delay between 0 and 1 second
            setTimeout(() => {
                box.classList.add('closed');
            }, delay * 1000); // Convert seconds to milliseconds
        });
    }
}

// Adjust box size on window resize
window.addEventListener('resize', () => {
    loadDiv.innerHTML = ''; // Clear existing boxes
    loadBoxes(); // Recreate boxes to fit the new viewport size
    closeBoxesWithDelay(); // Close the boxes again
});

// Call the functions
loadBoxes();

