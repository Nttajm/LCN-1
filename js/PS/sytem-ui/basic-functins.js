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


function openTab1(tabName, button) {
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

let count = 0;

function outputCounts(option) {
  const error = document.getElementById('js-errorCount');
  const warning = document.getElementById('js-waringCount');
  const messages = document.getElementById('js-messagesCount');

  if (option === 'e') {
    error.innerHTML = ++count;
  } else if (option === 'w') {
    warning.innerHTML = ++count;
  } else if (option === 'm') {
    messages.innerHTML = ++count;
  }
}




