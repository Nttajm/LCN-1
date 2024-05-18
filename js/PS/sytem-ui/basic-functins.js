


function toggleDisplay(div) {
  const targetDiv = document.querySelector(`.` + div)
  targetDiv.classList.toggle('dbk')
}

function toggleDisplayWdbe(div) {
  const targetDiv = document.querySelector(`.` + div)
  targetDiv.classList.toggle('dbe');
}

function optionToggle(div, className) {
  const targetDiv = document.querySelector(`.` + div)
  targetDiv.classList.toggle(className)
}

let block = document.querySelector(".explorer"),
  slider = document.querySelector(".slidebar");

slider.onmousedown = function dragMouseDown(e) {
  // get position of mouse
  let dragX = e.clientX;
  // register a mouse move listener if mouse is down
  document.onmousemove = function dragMouseMove(e) {
    // e.clientX will be the position of the mouse as it has moved a bit now
    // offsetWidth is the width of the block-1
    block.style.width = block.offsetWidth - (e.clientX - dragX) + "px"; // Subtract instead of add
    // update variable - till this pos, mouse movement has been handled
    dragX = e.clientX;
  }
  // remove mouse-move listener on mouse-up (drag is finished now)
  document.onmouseup = () => document.onmousemove = document.onmouseup = null;
}

function startLoading(duration, int) {
  const cont = document.querySelector('.load');
  const loadingBar = document.getElementById('loading-bar');
  const interval = int; // Interval in milliseconds
  const steps = duration / interval;
  let width = 0;

  const stepWidth = 10 / steps;

  const animate = setInterval(() => {
    cont.style.display = 'block';
    width += stepWidth;
    loadingBar.style.width = `${width}%`;

    if (width >= 20) { // Slow down when reaching 70%
      clearInterval(animate);
      const slowInterval = setInterval(() => {
        width += stepWidth / 2; // Slow down by half
        loadingBar.style.width = `${width}%`;

        if (width >= 110) { // Finish loading when reaching 100%
          clearInterval(slowInterval);
          setTimeout(() => {
            cont.style.display = 'none'; // Hide the container after animation is over
          }, interval * 170 ); // Set the delay to be the same as the interval
        }
      }, interval * 2);
    }
  }, interval);
}



function openTab1(tabName) {
  // Hide all tab contents
  const tabContents = document.getElementsByClassName("tab-content");
  for (var i = 0; i < tabContents.length; i++) {
    tabContents[i].style.display = "none";
  }

  // Remove 'selected' class from all buttons
  var tabButtons = document.getElementsByClassName("tab");
  for (var i = 0; i < tabButtons.length; i++) {
    tabButtons[i].classList.remove("selected");
  }

  // Show the select ed tab content
  document.getElementById(tabName).style.display = "block";

  // Add 'selected' class to the clicked button

  localStorage.setItem("lastTab", tabName);
}

var lastTab = localStorage.getItem("lastTab");
openTab1(lastTab);

let countE = 0;
let countW = 0;
let countM = 0;

function outputCounts(option) {
  // Get all elements with the specified classes
  const errors = document.getElementsByClassName('js-errorCount');
  const warnings = document.getElementsByClassName('js-warningCount');
  const messages = document.getElementsByClassName('js-messagesCount');

  if (option === 'e') {
    // Loop through each element and update its content
    for (let i = 0; i < errors.length; i++) {
      errors[i].innerHTML = ++countE;
    }
  } else if (option === 'w') {
    // Loop through each element and update its content
    for (let i = 0; i < warnings.length; i++) {
      warnings[i].innerHTML = ++countW;
    }
  } else if (option === 'm') {
    // Loop through each element and update its content
    for (let i = 0; i < messages.length; i++) {
      messages[i].innerHTML = ++countM;
    }
  }
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}


function sysMessage(text, option, phraser) {
  phraser = phraser || 'bm/main/array/user/ ~';
  const sysTime = getCurrentTime();
  const cont = document.getElementById('js-sys-out');
  let spanClass = `s-o-d`;

  if (option) {
    if (option === 'e') {
      outputCounts('e')  
      spanClass += `
       stat-error
      `
    } else if (option === 'w') {
      outputCounts('w')
      spanClass += `
       highlight
      `
    } else if (option === 'm') {
      outputCounts('m')
      spanClass += `
       skyblue
      `
    }
  } else {
    cont.innerHTML += `
    ${phraser}<span id="outtext"><span class="stat">[${sysTime}]</span> > ${text}</span>
    `
  }

  cont.innerHTML += `
    ${phraser}<span id="outtext"><span class="stat">[${sysTime}]</span> <span class="${spanClass}">> ${text}</span>
    `
};

sysMessage('200.pass', 'm' );

function print(text) {
  sysMessage(text, 'm');
}

document.addEventListener('DOMContentLoaded', function() {
  let buttonsApps = document.querySelectorAll('.js-app-btn');

  buttonsApps.forEach(button => {
    const installed = localStorage.getItem(button.id);
    if (installed) {
      button.innerText = 'Run';
    }
  });
});

let availFuns = [];


function download(program) {
  const installed = localStorage.getItem(`js-btn-v-${program}`) || '';
  let button = document.getElementById(`js-btn-v-${program}`)

  if (installed) {
    button.innerHTML = `Run`
    runProgram(program);
    sysMessage(`program '${program}' is now running in the output display.`, 'm')
  } else {
    availFuns.push(program);
    startLoading(110, 9);

    button.classList.add('temporary-class');
    button.innerHTML = `installing...`

    setTimeout(() => {
        button.classList.remove('temporary-class');
        sysMessage('program built in', 'w');
        button.innerHTML = `Run`
    }, 4000);

    console.log(availFuns);
    localStorage.setItem(`js-btn-v-${program}`, true);
  }
}

function disable() {
  const display = document.getElementById('tab3');
  display.innerHTML = ``;
}

const codexHtml = [
  `<div class="block"></div>
  <div class="top">
   <div>
      <div class="logo">
          <img src="/images/ps-logo.png" alt="logo">
    </div>
    <div class="name"> Powershell</div>
   </div>
   <div class="buttons">
    <button>_</button>
    <button>X</button>
   </div>
  </div>`
]

function copy(sourceDivId, type) {
  let sourceDiv = '';
  if (type === 'id') {
    sourceDiv = document.getElementById(sourceDivId);
  } else if (type === 'class') {
    sourceDiv = document.getElementsByClassName(sourceDivId)[0];
  }

  if (sourceDiv !== '') {
    return sourceDiv.innerHTML;
  } else {
    return 'what';
  }
}

const sysHtml = copy('sys-output', 'class');

function createDraggableWindow(ope, img, name, app, fun) {
  if (ope === 0) {
    if (ope === 'ps') {
      img = '/images/ps-logo.png';
      name = 'Powershell';
      app = '';
    }
  } else {
    img
    name
    app
  }

  // Create a new div element
  var newDiv = document.createElement('div');
  newDiv.className = `draggableDiv app-count-num-${fun}`;
  newDiv.innerHTML = `
    <div class="block"></div>
    <div class="top">
      <div>
        <div class="logo">
          <img src="${img}" alt="logo">
        </div>
        <div class="name">${name}</div>
      </div>
      <div class="buttons">
        <button>_</button>
        <button onclick="optionToggle('app-count-num-${fun}', 'dni');">X</button>
      </div>
    </div>
    <div class="window-area">
      ${app}
    </div>
  `;
  

  // Create a draggable area within the top-left corner
  var draggableArea = newDiv.querySelector('.block');

  // Set initial position randomly
  newDiv.style.left = Math.random() * (window.innerWidth - 200) + 'px';
  newDiv.style.top = Math.random() * (window.innerHeight - 200) + 'px';

  // Append the new div to the body
  document.body.appendChild(newDiv);

  // Variables to store mouse offset
  var offsetX, offsetY;

  // Event listener for mouse down on the new div to enable dragging
  draggableArea.addEventListener('mousedown', function(event) {
    // Calculate the offset between cursor position and div position
    offsetX = event.clientX - newDiv.offsetLeft;
    offsetY = event.clientY - newDiv.offsetTop;

    document.addEventListener('mousemove', moveDiv);

    function moveDiv(event) {
      var newX = event.clientX - offsetX;
      var newY = event.clientY - offsetY;

      newDiv.style.left = newX + 'px';
      newDiv.style.top = newY + 'px';
    }

    document.addEventListener('mouseup', function() {
      document.removeEventListener('mousemove', moveDiv);
    });
  });
}

let windapp = {
  notes: {
   html: `
   <div id="notesContainer">
   <h1>Notes App</h1>
   <div id="notes"></div>
   <button id="addNoteBtn" class="btn-js-wind-app" onclick="notesWWl()">Add Note</button>
   <style> 
   #notesContainer {
    max-width: 600px;
    margin: 0 auto;
  }

  .note {
    border: 1px solid #ccc;
    border-radius: 5px;
    padding: 10px;
    margin-bottom: 10px;
    background-color: #f9f9f9;
  }

  .note textarea {
    width: 100%;
    height: 100px;
    resize: vertical;
  }

  .btn-js-wind-app {
    padding: 5px 10px;
    background-color: #007bff;
    color: #fff;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }

  .btn:hover {
    background-color: #0056b3;
  }
   `,
  
},
ps: `<div class="window-area amc-ani-ps">
  <div class="system-ani">
      Powershell
  </div>
</div>`,
}



function notesWWl()  {
  var notes = JSON.parse(localStorage.getItem('notes')) || [];

  // Function to render notes
  function renderNotes() {
    var notesHtml = '';
    notes.forEach(function(note, index) {
      notesHtml += `
        <div class="note">
          <textarea id="note_${index}" onchange="updateNote(${index})">${note}</textarea>
          <button class="btn" onclick="deleteNote(${index})">Delete</button>
        </div>
      `;
    });
    document.getElementById('notes').innerHTML = notesHtml;
  }

  // Function to add a new note
  function addNote() {
    notes.push('');
    saveNotes();
    renderNotes();
  }

  // Function to delete a note
  function deleteNote(index) {
    notes.splice(index, 1);
    saveNotes();
    renderNotes();
  }

  // Function to update a note
  function updateNote(index) {
    notes[index] = document.getElementById(`note_${index}`).value;
    saveNotes();
  }

  // Function to save notes to local storage
  function saveNotes() {
    localStorage.setItem('notes', JSON.stringify(notes));
  }

  // Event listener for add note button
  document.getElementById('addNoteBtn').addEventListener('click', addNote);

  // Event listener for storage event to sync notes across tabs
  window.addEventListener('storage', function(event) {
    if (event.key === 'notes') {
      notes = JSON.parse(event.newValue);
      renderNotes();
    }
  });

  // Initial render
  renderNotes();
}

function windowApp(app) {
  if (app === 'notes') {
    const object1 = {
       img: 'js/ps/assets/notesicon.webp', 
       name: 'notes',
       app:  'hi',
      };
    windows.push(object1)
    windows.push(object1)
    console.log(object1)
  }
  if (app === 'ps') {
    createDraggableWindow(0, '/images/ps-logo.png', 'Powershell window', windapp.ps, 'green');
  }
  if (app === 'sysm') {
    createDraggableWindow(0, '/images/ps-logo.png', 'System output', copy('sys-output', 'class'), 'Dota');
  }
  if (app === 'display') {
    createDraggableWindow(0, '/images/ps-logo.png', 'System display', copy('tab3', 'id'), 'lmk');
  }
}

const windows = [
  
]

windows.forEach(( window, i )=> {
  createDraggableWindow(0, window.img, window.name, window.app, i+1);
});

// windowApp('ps');
// windowApp('sysm');


document.getElementById('readClipboardBtn').addEventListener('click', async () => {
  try {
      const text = await navigator.clipboard.readText();
      document.getElementById('key').value = text;
  } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
  }
});





