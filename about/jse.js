
  const articles = [
    {
        ctc: 'white',
        bctc: 'black',
        img: '../assets/docs/italy(2).jpg',
        ftn: '/ by apple (10.11.17)',
        bftn: 'quo dolore unde atque similique earum',
        p: [
            'Lorem ipsum dolor sit amet consectetur adipisicing elit. Lorem ipsum dolor sit amet consectetur adipisicing elit. Culpa mollitia voluptates, illo velit, quas enim quasi alias ratione iure veritatis error! Recusandae quo dolore unde atque similique earum officia mollitia.',
            'Culpa mollitia voluptates, illo velit, quas enim quasi alias r Lorem ipsum dolor sit amet consectetur adipisicing elit. Culpa mollitia voluptates, illo velit, quas enim quasi alias ratione iure veritatis error! Recusandae quo dolore unde atque similique earum officia mollitia.'
        ]
    },
    {   
        ctc: 'orange',
        bctc: 'skyblue',
        img: '../assets/docs/italia_test.webp',
        ftn: '/ by apple (10.11.17)',
        bftn: 'quo dolore unde atque similique earum',
        p: [
            'Lorem ipsum dolor sit amet consectetur adipisicing elit. Lorem ipsum dolor sit amet consectetur adipisicing elit. Culpa mollitia voluptates, illo velit, quas enim quasi alias ratione iure veritatis error! Recusandae quo dolore unde atque similique earum officia mollitia.',
            'Culpa mollitia voluptates, illo velit, quas enim quasi alias r Lorem ipsum dolor sit amet consectetur adipisicing elit. Culpa mollitia voluptates, illo velit, quas enim quasi alias ratione iure veritatis error! Recusandae quo dolore unde atque similique earum officia mollitia.'
        ]
    },
  ]

  const title = {
    docName: 'Italy',
    des: 'Lorem ipsum dolor sit amet consectetur, adipisicing elit. Fuga recusandae tempora omnis. Voluptatum eius ipsum necessitatibus magnam vel, iure aspernatur qui architecto quidem similique voluptate numquam id consectetur culpa beatae?',
    section: 80,
    writer: 'JM',
    date: '6.25.24'
  }

  const opener = document.querySelector('.opener')
  opener.innerHTML = ''
    opener.innerHTML += `
        <div class="o-name">
        <span>${title.docName}</span>
        <span>${title.des}</span>
        </div>
        <div class="o-date">
            <span>/ ${title.date}</span>
        </div>
    </div>
    <span class="note" id="js-right">
        OF(${title.section}.)
    </span>
    <span class="note" id="js-right">
        WR(${title.writer})
    </span>
    `

    let notes = document.querySelector('.notes')
    notes.innerHTML = '';
    notes.innerHTML += `
    <span class="note" id="js-right">
        OF(${title.section}.)
    </span>
    <span class="note" id="js-right">
        WR(${title.writer})
    </span>
    `

  const container = document.querySelector('.cont')

  html = ''

  articles.forEach((a, i )=> {

    let paragraphs = ''

    a.p.forEach(e => {
        paragraphs += 
        `
        <p>
          ${e}
        </p>
        `
    });

    html += `
        <article class="js-bluredEle js-changer-${i + 1}" data-bg="${a.bctc}" data-tx="${a.ctc}">
        <div class="possible js-bluredEle">
            <img src="${a.img}" alt="">
            <span>${a.ftn}</span>
            <span>${a.bftn}</span>
        </div>
        <div class="document">
            ${paragraphs}
        </div>
      </article>
    `
  });

  const footer = `
<footer class="js-bluredEle">
        <div class="footerDiv">
            <span class="fhead">
                RELEVENCE
            </span>
        </div>
        <div class="footerDiv">
            <span class="footLen">
                contact: (909)-413-4708 mulonde@lcnjoel.com
            </span>
            <span class="footLen">
                <a href="/index.html">Lcn</a>
                <a href="/about/joel.html">Home</a>
                <a href="">CATALUNYA</a>
                <a href="">MONTERREY</a>
                <a href="">U/C</a>
            </span>
            <span class="footLen">
                <a href="">GitHub</a>
                <a href="">Awwwards</a>
            </span>
        </div>
    </footer>
  `
  container.innerHTML = html + footer;


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
        } else {
            document.body.style.backgroundColor = defaultColor;
            document.body.style.color = defaultTextColor
        }
      });
    }

    window.addEventListener('scroll', checkScroll);
    checkScroll(); 
  }


  const arts = document.querySelectorAll('article')

  /*
  arts.forEach((a, i) => {
    changeBackgroud(0.69, `js-changer-${i + 1}`);
  });
  */