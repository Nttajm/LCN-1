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
// videos.forEach(video => video.play());

const scrollUp = document.querySelector('.watch');



scrollContainer.addEventListener('scroll', () => {
  const maxScroll = (scrollContainer.scrollWidth - scrollContainer.clientWidth) / 7;
  const scrollPercentage = Math.min(scrollContainer.scrollLeft / maxScroll, 1);
  const translateY = scrollPercentage * 80; // Max 30%
  scrollUp.style.transform = `translateY(-${translateY}%)`;
});


document.addEventListener('DOMContentLoaded', () => {
  const scrollContainer = document.querySelector('.d-cont-1');
  const trigger = document.querySelector('.js-trigger-scroll');
  const video = document.getElementById('videoPlayer');
  const newSrc = video.dataset.next;
  const originalSrc = video.dataset.src || video.src; // fallback to current src if no data-src

  if (!trigger || !video || !scrollContainer) {
    console.warn('Missing element(s): trigger, video, or scroll container');
    return;
  }

  let isNewSrcActive = false;

  scrollContainer.addEventListener('scroll', () => {
    const triggerRect = trigger.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();

    const isPast = triggerRect.right < containerRect.left;
    const isBack = triggerRect.left > containerRect.right;

    if (isPast && !isNewSrcActive) {
      video.src = newSrc;
      video.load();
      video.play();
      isNewSrcActive = true;
    }

    if (!isPast && isNewSrcActive) {
      video.src = originalSrc;
      video.load();
      video.play();
      isNewSrcActive = false;
    }
  });
});



