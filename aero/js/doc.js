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
  const infoTitle = document.getElementById('infoTitle');
  const infoSubtitle = document.getElementById('infoSubtitle');
  const nextProject = document.getElementById('nextProject');
  
  const newSrc = video.dataset.next;
  const originalSrc = video.dataset.src || video.src;
  const originalTitle = video.dataset.title || 'Musiala';
  const originalSubtitle = video.dataset.subtitle || 'NIKE Football | turning your defenders into spectators';
  const nextTitle = video.dataset.nextTitle || 'Adidas';
  const nextSubtitle = video.dataset.nextSubtitle || 'Adidas Football | There Will Be Haters ft. Messi';

  if (!trigger || !video || !scrollContainer) {
    console.warn('Missing element(s): trigger, video, or scroll container');
    return;
  }

  let isNewSrcActive = false;

  // Function to update title with animation
  function updateInfo(title, subtitle) {
    if (infoTitle && infoSubtitle) {
      infoTitle.classList.add('changing');
      infoSubtitle.classList.add('changing');
      
      setTimeout(() => {
        infoTitle.textContent = title;
        infoSubtitle.textContent = subtitle;
        infoTitle.classList.remove('changing');
        infoSubtitle.classList.remove('changing');
      }, 300);
    }
  }

  // Show next project button at the end
  function checkNextProjectVisibility() {
    if (!nextProject) return;
    
    const scrollPercentage = scrollContainer.scrollLeft / (scrollContainer.scrollWidth - scrollContainer.clientWidth);
    
    if (scrollPercentage > 0.85) {
      nextProject.classList.add('visible');
    } else {
      nextProject.classList.remove('visible');
    }
  }

  scrollContainer.addEventListener('scroll', () => {
    const triggerRect = trigger.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();

    const isPast = triggerRect.right < containerRect.left;
    const isBack = triggerRect.left > containerRect.right;

    if (isPast && !isNewSrcActive) {
      video.src = newSrc;
      video.load();
      video.play();
      updateInfo(nextTitle, nextSubtitle);
      isNewSrcActive = true;
    }

    if (!isPast && isNewSrcActive) {
      video.src = originalSrc;
      video.load();
      video.play();
      updateInfo(originalTitle, originalSubtitle);
      isNewSrcActive = false;
    }

    checkNextProjectVisibility();
  });
});



