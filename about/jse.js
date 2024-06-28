
document.addEventListener('DOMContentLoaded', () => {
    customAni(0.95, 'animated-element', 'active');
    customAni(0.75, 'js-bluredEle', 'js-bluredEle-active');
  });

  function customAni(min, className, config) {
    const elements = document.querySelectorAll(`.${className}`);
  
    function checkScroll() {
      elements.forEach((element) => {
        const elementPosition = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
  
        if (elementPosition < windowHeight * min) {
          element.classList.add(config);
        } else {
          element.classList.remove(config);
        }
      });
    }
  
    window.addEventListener('scroll', checkScroll);
    checkScroll(); 
  }

  function changeBackgroud(min, className) {
    const elements = document.querySelectorAll(`.${className}`);
    let defaultColor = window.getComputedStyle(document.body).backgroundColor;
    let defaultTextColor = window.getComputedStyle(document.body).color;

    function checkScroll() {
      elements.forEach((element) => {
        let color = element.dataset.bg
        let textColor = element.dataset.tx
        const elementPosition = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
  
        if (elementPosition < windowHeight * min) {
          document.body.style.backgroundColor = color
          document.body.style.color = textColor
          document.documentElement.style.setProperty('--main-color', textColor)
        } else {
            document.body.style.backgroundColor = defaultColor;
            document.body.style.color = defaultTextColor
        }
      });
    }

    window.addEventListener('scroll', checkScroll);
    checkScroll(); 
  }

  changeBackgroud(0.67, 'js-changer');
  changeBackgroud(0.69, 'js-changer-1');