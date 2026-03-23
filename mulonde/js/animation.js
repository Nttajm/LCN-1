function initDailUp() {
  document.querySelectorAll('[data-dailup="true"]').forEach(el => {
    const text = el.textContent.trim();
    el.innerHTML = "";  // clear

    const wrapper = document.createElement("div");
    wrapper.className = "dail-up";

    [...text].forEach((char, index) => {
      const col = document.createElement("div");
      col.className = "column";
      col.id = `column-${index + 1}`;

      const top = document.createElement("span");
      top.className = "top";
      top.textContent = char;

      const bottom = document.createElement("span");
      bottom.className = "bottom";
      bottom.textContent = char;

      // animation delay: 0.125 * index
      bottom.style.animationDelay = `${0.057 * index}s`;

      col.appendChild(top);
      col.appendChild(bottom);
      wrapper.appendChild(col);
    });

    el.removeAttribute("data-dailup");
    el.appendChild(wrapper);
  });
}

setTimeout(initDailUp, 800);



function transformSingleWords() {
  const targets = document.querySelectorAll('[data-transform-single="true"]');

  targets.forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    const parent = el.parentNode;
    const className = el.className;

    // Insert new spans before removing original
    words.forEach(word => {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = word;
      parent.insertBefore(span, el);
    });

    // Remove original element
    parent.removeChild(el);
  });
}

transformSingleWords();

// Circular loader animation for item-0 only
function initCircularLoader() {
  const item = document.getElementById('item-0');
  const loaderText = item.querySelector(".loader-text");
  const loaderProgress = item.querySelector(".loader-progress");
  
  const duration = 2000; // 2 seconds
  const interval = 30; // Update every 30ms
  const increment = 100 / (duration / interval);
  
  let progress = 0;
  
  const timer = setInterval(() => {
    progress += increment;
    
    if (progress >= 100) {
      progress = 100;
      clearInterval(timer);
      
      // Update to 100%
      loaderText.textContent = "100%";
      const offset = 283 - (283 * (progress / 100));
      loaderProgress.style.strokeDashoffset = offset;
      
      // Trigger CSS flip animation after loader completes
      setTimeout(() => {
        const grid = document.querySelector(".grid");
        grid.classList.add("flip-on");
      }, 300);
    } else {
      // Update progress
      loaderText.textContent = Math.floor(progress) + "%";
      const offset = 283 - (283 * (progress / 100));
      loaderProgress.style.strokeDashoffset = offset;
    }
  }, interval);
}

// Initialize loader when page loads
window.addEventListener("load", () => {
  setTimeout(initCircularLoader, 500);
});


function initSlideshows() {
  const slideshows = document.querySelectorAll('[data-slideshow="true"]');

  slideshows.forEach((container, idx) => {
    const slides = container.querySelectorAll('.slide-item');
    if (slides.length < 2) return; // need at least 2 to cycle

    let current = 0;
    const interval = parseInt(container.dataset.interval) || 3500;

    // Ensure the first slide is visible from the start
    slides[0].classList.add('active');

    // Stagger start so tiles don't all flip at once
    const staggerDelay = idx * 3000;

    setTimeout(() => {
      setInterval(() => {
        const currentSlide = slides[current];
        const next = (current + 1) % slides.length;
        const nextSlide = slides[next];

        // Current slide exits (drops down and out)
        currentSlide.classList.remove('active');
        currentSlide.classList.add('exit');

        // Next slide enters (drops in from top)
        nextSlide.classList.remove('exit');
        nextSlide.classList.add('active');

        // After the exit animation finishes, snap the slide back to the top
        // WITHOUT animating — so the next cycle always comes from above, not below
        setTimeout(() => {
          currentSlide.style.transition = 'none';
          currentSlide.classList.remove('exit');
          // Force reflow so the browser registers the class change before re-enabling transitions
          void currentSlide.offsetHeight;
          currentSlide.style.transition = '';
        }, 700); // slightly longer than the 0.6s CSS transition

        current = next;
      }, interval);
    }, staggerDelay);
  });
}

// Start slideshows after the card flip finishes
window.addEventListener("load", () => {
  // Wait for loader (2s) + flip trigger delay (300ms) + flip anim (800ms) + buffer
  setTimeout(initSlideshows, 3600);
});


// Windows 10 Fluent Reveal border highlight
function initRevealBorder() {
  const grid = document.querySelector('.grid');
  const items = grid.querySelectorAll('.grid-item');

  grid.addEventListener('mousemove', (e) => {
    items.forEach(item => {
      const rect = item.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      item.style.setProperty('--mouse-x', x + 'px');
      item.style.setProperty('--mouse-y', y + 'px');
      item.classList.add('reveal-active');
    });
  });

  grid.addEventListener('mouseleave', () => {
    items.forEach(item => {
      item.classList.remove('reveal-active');
    });
  });
}

window.addEventListener('load', () => {
  setTimeout(initRevealBorder, 3600);
});


// Windows 8 tile press — 3D tilt toward click point
function initTilePress() {
  const MAX_TILT = 12;

  document.querySelectorAll('.grid-item').forEach(item => {
    item.addEventListener('pointerdown', (e) => {
      const rect = item.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Normalize -1..1 from center
      const nx = (x - rect.width  / 2) / (rect.width  / 2);
      const ny = (y - rect.height / 2) / (rect.height / 2);

      // Clicked edge sinks in: right → positive rotateY, top → negative rotateX
      const rotY =  nx * MAX_TILT;
      const rotX = -ny * MAX_TILT;

      item.style.transition = 'transform 0.08s ease-out';
      item.style.transform  = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(0.95)`;
    });

    const release = () => {
      item.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      item.style.transform  = '';
    };

    item.addEventListener('pointerup',     release);
    item.addEventListener('pointercancel', release);
    item.addEventListener('pointerleave',  release);
  });
}

window.addEventListener('load', initTilePress);

