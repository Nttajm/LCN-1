// document.addEventListener('DOMContentLoaded', function () {
//     const scroll = new LocomotiveScroll({
//       el: document.querySelector('[data-scroll-container]'),
//       smooth: true,
//       direction: 'horizontal'
//     });
//   });


const scrollContainer = document.querySelector('.d-cont-1');

scrollContainer.addEventListener('wheel', (event) => {
    event.preventDefault();
    scrollContainer.scrollLeft += event.deltaY;
});

const videos = document.querySelectorAll('video');
videos.forEach(video => video.play());

const scrollUp = document.querySelector('.watch');

scrollContainer.addEventListener('scroll', () => {
  const maxScroll = (scrollContainer.scrollWidth - scrollContainer.clientWidth) / 7;
  const scrollPercentage = Math.min(scrollContainer.scrollLeft / maxScroll, 1);
  const translateY = scrollPercentage * 80; // Max 30%
  scrollUp.style.transform = `translateY(-${translateY}%)`;
});
