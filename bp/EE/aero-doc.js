document.addEventListener('DOMContentLoaded', function () {
    const scroll = new LocomotiveScroll({
      el: document.querySelector('[data-scroll-container]'),
      smooth: true,
      direction: 'horizontal'
    });
  });
const scrollContainer = document.querySelector('.d-cont-1');

scrollContainer.addEventListener('wheel', (event) => {
    event.preventDefault();
    scrollContainer.scrollLeft += event.deltaY;
});

// var element = document.querySelector('.d-cont-1');

// element.addEventListener('wheel', function(event) {
//     let scrollAmount = 0;
//     if (event.deltaMode === event.DOM_DELTA_PIXEL) {
//         scrollAmount = event.deltaY * 20; // Increase scroll speed by multiplying the deltaY value
//     } else if (event.deltaMode === event.DOM_DELTA_LINE) {
//         scrollAmount = event.deltaY * 80; // Increase scroll speed by multiplying the deltaY value
//     } else if (event.deltaMode === event.DOM_DELTA_PAGE) {
//         scrollAmount = event.delta2 * element.clientHeight;
//     }

//     element.scrollTop += scrollAmount;

//     event.preventDefault();
// }, { passive: false });