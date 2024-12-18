import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc,getDocs, addDoc, collection, getCountFromServer, query , where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
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
for (let y = 1; y <= 150; y++) {
    for (let x = 1; x <= 250; x++) {
      const gridCell = document.createElement('div');
      gridCell.classList.add('grid-cell');
      gridCell.setAttribute('data-x', x);
      gridCell.setAttribute('data-y', y);
      gridContainer.appendChild(gridCell);
    }
  }

const loadDiv = document.querySelector('.loadboxes');

async function renderColorData() {
  const gridRef = collection(db, 'grid', 'data', 'cells'); // Reference to your Firestore collection
  const snapshot = await getDocs(gridRef); // One-time fetch instead of real-time updates
  snapshot.forEach((doc) => {
    const data = doc.data();
    const gridCell = gridContainer.querySelector(`[data-x="${data.x}"][data-y="${data.y}"]`);
    if (gridCell) {
      gridCell.style.backgroundColor = data.color;
    }
  });
  loadDiv.classList.add('loaded');
  closeBoxesWithDelay();

  const loadingText = document.querySelector('.loading');
    loadingText.classList.add('dn');
}

setInterval(renderColorData, 3000);

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
        colors.forEach(c => c.classList.remove('selected')); // Remove 'selected' class from all colors
        color.classList.add('selected'); // Add 'selected' class to the clicked color
    });
});


const allCells = document.querySelectorAll('.grid-cell');
allCells.forEach(async cell => {
    cell.addEventListener('click', () => {
        cell.classList.add('selected');
    });
} );

async function placeSquare() {
    const selectedCells = document.querySelectorAll('.grid-cell.selected');
    selectedCells.forEach( async cell => {
        console.log(cell);
        
    const cHy = cell.getAttribute('data-y');
    const cHx = cell.getAttribute('data-x');

    const selectedColorDiv = document.querySelector('.color.selected');
    const selectedColor = selectedColorDiv.getAttribute('data-color');

    const gridRef = collection(db, 'grid', 'data', 'cells');
    const cellQuery = query(gridRef, where("x", "==", cHx), where("y", "==", cHy));
    const querySnapshot = await getDocs(cellQuery);

    if (!querySnapshot.empty) {
        // If the cell already exists, update it
        querySnapshot.forEach(async (doc) => {
            await setDoc(doc.ref, { color: selectedColor  }, { merge: true });
        });
    } else {
        // If the cell does not exist, add a new document
        await addDoc(gridRef, {
            x: cHx,
            y: cHy,
            color: selectedColor,
        });
    }

    renderColorData();
    selectedCells.forEach(cell => cell.classList.remove('selected'));
    });
}

const placeBtn = document.getElementById('place-btn');
placeBtn.addEventListener('click', placeSquare);



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

