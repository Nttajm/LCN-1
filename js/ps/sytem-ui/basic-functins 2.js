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