const gridContainer = document.getElementById('grid-container');
const viewport = document.getElementById('viewport');
let scale = 1;
let mapX = 0;
let mapY = 0;
let isDragging = false;
let lastMouseX, lastMouseY;
const gridData = [
    {
        x: 2,
        y: 1,
        color: 'red'
    }
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

// Apply initial grid data
function renderColorData() {
    gridData.forEach(cell => {
        const gridCell = gridContainer.querySelector(`[data-x="${cell.x}"][data-y="${cell.y}"]`);
        if (gridCell) {
            gridCell.style.backgroundColor = cell.color;
        }
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

// Handle zoom with mouse wheel (zoom from the center of the screen)
viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomSpeed = 0.1;
  const prevScale = scale;

  // Change scale based on the wheel direction
  scale += e.deltaY > 0 ? -zoomSpeed : zoomSpeed;

  // Clamp the scale to a minimum and maximum value
  scale = Math.min(Math.max(0.5, scale), 2);

  // Get the center of the viewport
  const centerX = viewport.offsetWidth / 2;
  const centerY = viewport.offsetHeight / 2;

  // Calculate scale delta
  const scaleDelta = scale / prevScale;

  // Adjust map position to zoom in/out from the center
  mapX = centerX - (centerX - mapX) * scaleDelta;
  mapY = centerY - (centerY - mapY) * scaleDelta;

  updateTransform();
  updateCenterHover(); // Update hovering after zoom
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

function placeSqare() {
    const currentHoverDiv = document.querySelector('.grid-cell.hovering');
    const cHy = currentHoverDiv.getAttribute('data-y');
    const cHx = currentHoverDiv.getAttribute('data-x');

    const selectedColor = document.querySelector('.color.selected');
    const color = selectedColor.dataset.color;

    gridData.push({
        x: cHx,
        y: cHy,
        color: color
    });

    renderColorData();
    console.log(gridData);
}

const placeBtn = document.getElementById('place-btn');
placeBtn.addEventListener('click', placeSqare);