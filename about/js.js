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

