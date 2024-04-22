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
  
  