document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (event) {
      event.preventDefault(); // Prevent the default link behavior

      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  document.addEventListener('DOMContentLoaded', () => {
    const spans = document.querySelectorAll('.animated-span');

    spans.forEach(span => {
        const originalText = span.textContent;
        let revealedIndices = [];
        let interval;

        function getRandomIndices(length) {
            let indices = [];
            while (indices.length < 1 && revealedIndices.length < length) {
                let index = Math.floor(Math.random() * length);
                if (!revealedIndices.includes(index)) {
                    indices.push(index);
                    revealedIndices.push(index);
                }
            }
            return indices;
        }

        const chars = originalText.split('');
        const length = chars.length;
        const replacementChar = '*';
        const replacementRatio = 0.5; // 50% of the characters will be replaced with '*'
        const speed = Math.max(6, Math.floor(600 / length)); // proportional speed calculation

        revealedIndices = [];
        let initialText = chars.map((char, index) => Math.random() < replacementRatio ? replacementChar : char);
        span.textContent = initialText.join('');

        interval = setInterval(() => {
            if (revealedIndices.length >= length) {
                clearInterval(interval);
                return;
            }

            const indices = getRandomIndices(length);
            indices.forEach(index => {
                initialText[index] = chars[index];
            });

            span.textContent = initialText.join('');
        }, speed);
    });
});

document.addEventListener('DOMContentLoaded', () => {
  const targetDivs = document.querySelectorAll('.target-div');
  const highlightClass = 'selected';

  function toggleClass(event) {
      targetDivs.forEach(div => {
          if (div === event.target) {
              div.classList.toggle(highlightClass);
          } else {
              div.classList.remove(highlightClass);
          }
      });
  }

  document.addEventListener('click', toggleClass);
});

  // -- jm logo that expands like buena suerte 

//   function addClassOnScroll(element, className, pix) {
//     window.addEventListener('scroll', function() {
//         if (window.scrollY >= pix) {
//             element.classList.add(className);
//         } else {
//             element.classList.remove(className);
//         }
//     });
// }

// // Usage example
// document.addEventListener('DOMContentLoaded', function() {
//     var targetElement = document.querySelector('.your-element-selector');
//     addClassOnScroll(targetElement, 'your-class-name');
// });


//       document.addEventListener('mousemove', (event) => {
//     document.querySelectorAll('.item').forEach(span => {
//         const rect = span.getBoundingClientRect();
//         const y = event.clientY - rect.top;
//         const x = event.clientX - rect.left;

//         if (y < rect.height / 2 && x < rect.width / 2) {
//             span.style.transform = 'rotate(-45deg)';
//         } else if (y < rect.height / 2 && x >= rect.width / 2) {
//             span.style.transform = 'rotate(45deg)';
//         } else if (y >= rect.height / 2 && x < rect.width / 2) {
//             span.style.transform = 'rotate(225deg)';
//         } else if (y >= rect.height / 2 && x >= rect.width / 2) {
//             span.style.transform = 'rotate(-225deg)';
//         } else if (y < rect.height / 2 && Math.abs(x - rect.width / 2) < rect.width / 4) {
//             span.style.transform = 'rotate(0deg)';
//         } else if (y >= rect.height / 2 && Math.abs(x - rect.width / 2) < rect.width / 4) {
//             span.style.transform = 'rotate(180deg)';
//         } else if (x < rect.width / 2 && Math.abs(y - rect.height / 2) < rect.height / 4) {
//             span.style.transform = 'rotate(-90deg)';
//         } else if (x >= rect.width / 2 && Math.abs(y - rect.height / 2) < rect.height / 4) {
//             span.style.transform = 'rotate(90deg)';
//         } else {
//             span.innerHTML = '●'; // Default to ● when directly hovering
//             span.style.transform = 'none';
//         }
//     });
// });
  

// const followDiv = document.getElementById('followDiv');

//     document.addEventListener('mousemove', (e) => {
//       followDiv.style.left = `${e.pageX + 20}px`;
//       followDiv.style.top = `${e.pageY + 20}px`;
//     });

