const cursor = document.querySelector('.cursor');

      document.addEventListener('mousemove', (e) => {
        // Update the position of the cursor div based on mouse movement
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      });

      // Hide the default cursor
      cursor.style.position = 'fixed';
