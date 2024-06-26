document.addEventListener('DOMContentLoaded', function () {
  const stickyDiv = document.querySelector('.sticky-div');
  const container = document.querySelector('.sticky-container');
  const secondContent = container.nextElementSibling;
  
  function onScroll() {
      const containerRect = container.getBoundingClientRect();
      const secondContentRect = secondContent.getBoundingClientRect();

      if (containerRect.bottom <= secondContentRect.top) {
          stickyDiv.style.position = 'absolute';
          stickyDiv.style.top = 'auto';
          stickyDiv.style.bottom = '0';
      } else {
          stickyDiv.style.position = '-webkit-sticky';
          stickyDiv.style.position = 'sticky';
          stickyDiv.style.top = '10px';
          stickyDiv.style.bottom = 'auto';
      }
  }

  window.addEventListener('scroll', onScroll);
});
