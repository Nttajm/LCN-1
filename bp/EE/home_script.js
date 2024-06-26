
      const cursor = document.querySelector('.cursor');

      document.addEventListener('mousemove', (e) => {
        // Update the position of the cursor div based on mouse movement
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      });

      // Hide the default cursor
      document.body.style.cursor = 'none';

      document.addEventListener("DOMContentLoaded", function() {
        const spans = document.querySelectorAll(".typing-span");
        spans.forEach(span => {
          if (span.dataset.delay) {
            setTimeout(() => {
            const text = span.innerText;
            span.innerText = "";
            let index = 0;

            function type() {
                if (index < text.length) {
                    span.innerText += text.charAt(index);
                    index++;
                    setTimeout(type, 100);
                }
            }

            type();
            }, span.dataset.delay);
          } else {
            const text = span.innerText;
            span.innerText = "";
            let index = 0;

            function type() {
                if (index < text.length) {
                    span.innerText += text.charAt(index);
                    index++;
                    setTimeout(type, 100);
                }
            }

            type();
          }
            
        });
    });

    

    document.addEventListener('DOMContentLoaded', () => {
        const elements = document.querySelectorAll('.animated-element');
      
        function checkScroll() {
          elements.forEach((element) => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
      
            if (elementPosition < windowHeight * 0.95) {
              element.classList.add('active');
            } else {
              element.classList.remove('active');
            }
          });
        }
      
        window.addEventListener('scroll', checkScroll);
        checkScroll(); 
      });
  
/*
      let scrollAmount = 800;

window.addEventListener('wheel', function(event) {

    // Determine the direction of scrolling
    let scrollDirection = event.deltaY > 0 ? 1 : -1;

    // Calculate the target scroll position
    let currentScroll = window.scrollY;
    let targetScroll = currentScroll + scrollAmount * scrollDirection;

    // Smoothly scroll the page to the target position
    window.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
    });
});
*/
const sections = document.querySelectorAll('.cont section');
const upArr = document.getElementById('js-upArr');
let currentIndex = 1;





function slideB(num) {
  
  if (num) {
    currentIndex = num
  } else {
    currentIndex--
  }
  if (currentIndex === 1) {
    sections[currentIndex + 1].classList.remove('visible');
  } else {
    sections[currentIndex - 1].classList.remove('visible');
  }
  sections[currentIndex].classList.add('visible');
  console.log(`on layer ${currentIndex}`)
};

/* 
{
      img: 'bp/EE/assets/hq720 (3).webp',
      date: '6.25.24',
      dis: 'DB ps improvements and patches',
      textColor: 'white',
    },
    {
      date: '6.18.24',
      img: 'bp/EE/assets/hq720.webp',
      dis: 'UPLOAD CENTRE, a community photo sharing platform.',
      textColor: 'purple',
    },
    {
      date: '6.12.24',
      img: 'bp/EE/assets/hq720 (2).webp',
      dis: 'Sytax heiglter for made up programing languege',
      textColor: 'white',
    },
    {
      date: '5.19.24',
      img: 'bp/EE/assets/spot.webp',
      dis: 'redisging all of spotify bc why not, today is a bad day',
      textColor: 'yellow',
    },
    */

let sectionDiv = [{
  date: 'ESSENTIALS',
  projects: [
    {
      date: '11.14.23',
      img: '/images/ps-logo.jpg',
      dis: `Use commands to excute different function and more with "powershel.net". NOTE: Is ment to be ran locally*`,
      textColor: 'white',
      git: 'https://github.com/Nttajm/LCN-1/tree/main/js/PS',
      link: 'PowerShell.html',
      secondary: 'bp/EE/assets/auras/dark-blue.jpg',
      notes:'DB&M series, Patches and adjustments (6.17.24)',
      initial: '11.14.23',
      label: 'PS for LCN'
    },
    {
      date: '6.17.24',
      img: '/images/bwsearch.net.jpg',
      dis: `Use commands to excute different function and more with "powershel.net". NOTE: Is ment to be ran locally*`,
      textColor: 'white',
      link: 'searchnet.html',
      notes:'DB&M series, Patches and adjustments (6.17.24)',
      initial: '11.14.23',
      label: 'SEARCH LCN'

    },
    {
      date: '4.13.24',
      img: '/bp/edu/cs50a-mod-14/images/uss-b(1).jpg',
      dis: `Use commands to excute different function and more with "powershel.net". NOTE: Is ment to be ran locally*`,
      textColor: 'purple',
      link: 'bp/edu/cs50a-mod-16',
      secondary: 'bp/EE/assets/auras/pink-cream.webp',
      notes:'DB&M series, Patches and adjustments (6.17.24)',
      initial: '11.14.23',
      label: 'UPLAOD CENTER',
      side: ''
    },
    {
      date: '6.16.24',
      img: '/images/tescript.png',
      dis: `Use commands to excute different function and more with "powershel.net". NOTE: Is ment to be ran locally*`,
      textColor: 'orange',
      link: 'PowerShell.html',
      notes:'Not an IDE',
      initial: '6.12.24',
      label: 'TESCRIPT',
    },
    {
      date: '6.26.24',
      img: 'bp/EE/assets/watchP.png',
      dis: `Use commands to excute different function and more with "powershel.net". NOTE: Is ment to be ran locally*`,
      textColor: 'black',
      link: 'PowerShell.html',
      notes:'Not an IDE',
      initial: '6.26.24',
      secondary: 'bp/EE/assets/auras/orange.jpg',
      label: 'WRK',
    },
    {
      date: '6.10.24',
      img: 'bp/EE/assets/com_sat.jpg',
      dis: `Use commands to excute different function and more with "powershel.net". NOTE: Is ment to be ran locally*`,
      textColor: 'white',
      link: 'PowerShell.html',
      notes:'ran locally on PS server***',
      initial: '6.26.24',
      label: 'COMSAT',
    },
    
  ]
},
{
  date: '3.11.24 - 5.1.24',
  projects: [
    {
      img: 'bp/EE/assets/download',
      date: '6.25.24',
      dis: 'DB ps improvements and patches',
      textColor: 'white',
    },
    {
      date: '6.18.24',
      img: 'bp/EE/assets/hq720.webp',
      dis: 'UPLOAD CENTRE, a community photo sharing platform.',
      textColor: 'purple',
    },
    {
      date: '6.18.24',
      img: 'bp/EE/assets/hq720 (2).webp',
      dis: 'Sytax heiglter for made up programing languege',
      textColor: 'gray',
    },
  ]
}];

let outputDiv = document.getElementById('output');
outputDiv.innerHTML = `
<section class="typed animated-element">
    <div class="head">
      <span class="typing-span" contenteditable>
        My projects and more.
      </span>
      <span class="typing-span" data-delay="600" contenteditable>
        scroll.
      </span>
      <span class="blinking">|</span>
    </div>
  </section>
`;

sectionDiv.forEach(section => {

  let sectionsHtml = '';
  section.projects.forEach((project , index) => {

    if (!project.secondary) {
      project.secondary = project.img
    }

    let gitBtn = `
    
    `

    if (project.git) {
      gitBtn = `<button class="link-btn">
      <a href="${project.git}">Open with Github &nearr;</a>
    </button>`
    }
  
    sectionsHtml += `
      <div class="project animated-element .js-event-${index}" data-color="${project.textColor}" id="js_0">
        <div class="tooltag">
          <span>${project.date}</span>
        </div>
        <div class="img animated-element" id="placeholder-img">
          <img src="${project.img}" alt="${project.dis}" id="js-img-${index}">
          <img class="img-shadow" src="${project.secondary}">
        </div>
        <div class="text">
          <div class="label">
            ${project.label}
          </div>
          <span class="in-layer">${project.dis}</span>
          <button class="link-btn">
              <a href="${project.link}">Open &nearr;</a>
            </button> 
            ${gitBtn} 
        </div>
        <div class="pre-select">
                <span>
                Project Type/Collection: ${project.notes} 
                </span>
                <span>
                dev: Joel Mulonde 
                </span>
                <span>
                Date Created: ${project.initial}
                </span>
                <span>
                    &copy; Local Community Network 
                </span>
            </div>
      </div>
    `;
  });

  outputDiv.innerHTML += `
  <section class="show-case animated-element">
      <div class="date animated-element">${section.date}</div>
      <div class="sec-cont">
    ${sectionsHtml}
        </div>
  </section>
  `;
});

let projectDivs = document.querySelectorAll('.project');
let layer = document.querySelector('.js-selected-layer')
const projHtml = {
  open: `<div class="project">`,
  close:`</div> <button class="link-btn back" onclick="closeLayer()">&#8598; back</button>`
}

function closeLayer() {
  layer.classList.add('off')
  layer.innerHTML = '';
  document.body.style.overflowY = 'auto'
}

projectDivs.forEach(div => {
  div.addEventListener('click', () => {
    console.log('hello');
    layer.classList.remove('off')
    document.body.style.overflowY = 'hidden'

    let textColor = div.dataset.color
    document.documentElement.style.setProperty('--js-layer-textColor', textColor);

    layer.innerHTML = '';
    layer.innerHTML =  projHtml.open + div.innerHTML + projHtml.close
  });
});



console.log(averageColor(document.querySelectorAll('img')[0]))
function averageColor(imageElement) {
    // Create the canavs element
    var canvas = document.createElement('canvas'),

    // Get the 2D context of the canvas
    context
        = canvas.getContext &&
        canvas.getContext('2d'),
        imgData, width, height,
        length,
 
        // Define variables for storing
        // the individual red, blue and
        // green colors
        rgb = { r: 0, g: 0, b: 0 },

        // Define variable for the 
        // total number of colors
        count = 0;
 
    // Set the height and width equal
    // to that of the canvas and the image
    height = canvas.height =
        imageElement.naturalHeight ||
        imageElement.offsetHeight ||
        imageElement.height;
    width = canvas.width =
        imageElement.naturalWidth ||
        imageElement.offsetWidth ||
        imageElement.width;
 
    // Draw the image to the canvas
    context.drawImage(imageElement, 0, 0);
 
    // Get the data of the image
    imgData = context.getImageData(
            0, 0, width, height);

    // Get the length of image data object
    length = imgData.data.length;

    for (var i = 0; i < length; i += 4) {
        // Sum all values of red colour
        rgb.r += imgData.data[i];

        // Sum all values of green colour
        rgb.g += imgData.data[i + 1];

        // Sum all values of blue colour
        rgb.b += imgData.data[i + 2];

        // Increment the total number of
        // values of rgb colours
        count++;
    }

    // Find the average of red
    rgb.r = Math.floor(rgb.r / count);

    // Find the average of green
    rgb.g = Math.floor(rgb.g / count);

    // Find the average of blue
    rgb.b = Math.floor(rgb.b / count);

    return rgb;
}
// Function to set the background color of the second div as 
// calculated average color of image
var rgb;
var imgg = document.getElementsByClassName("cimg");
var blocks = document.getElementsByClassName("block");
var i;
for (i = 0; i < imgg.length; i++) {
    rgb = averageColor(imgg[I]);

    blocks[i].style.backgroundColor =
        'rgb(' + rgb.r + ','
        + rgb.g + ','
        + rgb.b + ')';
}