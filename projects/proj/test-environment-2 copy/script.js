document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('scroll', function() {
      let scrollTop = window.scrollY;
  
      // Adjust speeds for each section here
      document.getElementById('section1').style.transform = 'translateY(' + scrollTop * .73 + 'px)';
      document.getElementById('section2').style.transform = 'translateY(' + scrollTop * .33 + 'px)';
      document.getElementById('section3').style.transform = 'translateY(' + scrollTop * .1 + 'px)';
    });
  });
  