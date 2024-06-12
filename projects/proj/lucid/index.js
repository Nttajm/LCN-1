

const xHtml = {
    main : `
    <nav>
    <div class="n-top">
        <div class="settings">
          <button class="arr">
            <span class="material-symbols-outlined">
              menu
            </span>
          </button>
        </div>
        <div class="name">
          <span id="user">Joel Mulonde</span>'s Lucid Air
        </div>
        <div class="profile">
          <img src="assets/unnamed.gif" alt="" class="pfp">
        </div>
      </div>
      <div class="n-mid dn">
        <span class="mile">
          185
        </span>
        <span>mi</span>
      </div>
      <div class="n-mid">
        <span id="indicator">Parked</span>
      </div>
    </nav>
    <div class="blob">
    </div>
    <div class="content load-up-ani">
      <img class="car" src="assets/2bf03486-cbcf-4d2c-b15a-bc91da630f72.webp" alt="car">
      <div class="icons">
        <button class="icon" id="park">
          <span class="material-symbols-outlined">
            local_parking
          </span>
        </button>
        <button class="icon" id="fan" onclick="ch('fan', icons.fanOff, icons.fanOn)">
          <span class="material-symbols-outlined" id="rot">
            toys_fan
          </span>
        </button>
        <button class="icon" id="lock" onclick="ch('lock', icons.lock, icons.locked)">
          <span class="material-symbols-outlined">
            lock
          </span>
        </button>
        <button class="icon"  onclick="ch('eco', icons.ecoOn, icons.eco)" id="eco">
          <span class="material-symbols-outlined">
            eco
          </span>
        </button>
      </div>
      <div class="other-settings">
        <div class="sett" id="js-clim-btn">
          <div class="s-icon">
            <span class="material-symbols-outlined">
              thermostat
            </span>
          </div>
          <div class="info">
            <div>Climate Controls</div>
            <div>interiror 71°F</div>
          </div>
          <button class="arrow arr" onclick="changeScreen(xHtml.clim)">
            <span class="material-symbols-outlined">
              arrow_forward_ios
            </span>
          </button>
        </div>
        <div class="sett" id="js-clim-btn">
          <div class="s-icon">
            <span class="material-symbols-outlined">
              settings
            </span>
          </div>
          <div class="info">
            <div>Controls</div>
            <div></div>
          </div>
          <button class="arrow arr" onclick="changeScreen(xHtml.locks)">
            <span class="material-symbols-outlined">
              arrow_forward_ios
            </span>
          </button>
        </div>
        <div class="sett">
          <div class="s-icon">
            <span class="material-symbols-outlined">
              bolt
            </span>
          </div>
          <div class="info">
            <div>Charging</div>
            <div>34%, last updated 11:42 AM</div>
          </div>
          <div class="arrow">
            <span class="material-symbols-outlined">
              arrow_forward_ios
            </span>
          </div>
        </div>
        <div class="sett">
          <div class="s-icon">
            <span class="material-symbols-outlined">
              location_on
            </span>
          </div>
          <div class="info">
            <div>Location</div>
            <div>On today</div>
          </div>
          <div class="arrow">
            <span class="material-symbols-outlined">
              arrow_forward_ios
            </span>
          </div>
        </div>
      </div>
    </div>
    `,
    clim: `
    <nav>
      <div class="n-top">
        <div class="settings">
          <button class="arr" onclick="changeScreen(xHtml.main)">
            <span class="material-symbols-outlined">
              arrow_back_ios
            </span>
          </button>
        </div>
        <div class="name">
          <span id="user">Joel Mulonde</span>'s Lucid Air
        </div>
        <div class="profile">
          <img src="assets/unnamed.gif" alt="" class="pfp">
        </div>
      </div>
      <div class="n-mid dn">
        <span class="mile">
          185
        </span>
        <span>mi</span>
      </div>
      <div class="n-mid">
        <span id="indicator">Parked</span>
      </div>
    </nav>
    <div class="climate">
    <div class="car-top load-up-ani">
      <img src="assets/lucid-topview.png" alt="">
      <div class="controls">
        <div class="air"></div>
        <div class="buttons">
          <button class="icon clim-fn" id="fan" onclick="ch('fan', icons.fanOff, icons.fanOn)">
          <span class="material-symbols-outlined" id="rot">
            toys_fan
          </span>
        </button>
        <button class="appleIco-lvl sudo" id="windsheild" onclick="tg('windsheild')">
          <img src="assets/windsheild.png" alt="" class="apple-icono-img">
        </button>
        <button class="appleIco-lvl sudo" id="windsheild-rear" onclick="tg('windsheild-rear')">
          <img src="assets/wind-rear.png" alt="" class="apple-icono-img">
        </button>
        <button class="appleIco-style2" id="recycle" onclick="ch('windsheild-rear', icons.fanOff, icons.fanOn)">
          <img src="assets/outside.png" alt="" class="apple-icono-img">
        </button>
        <button class="icon heat" id="h-1" onclick="ch('h-1', icons.hOn, icons.hOff)">
          <span class="material-symbols-outlined" id="">
            heat
          </span>
        </button>
        <button class="icon heat" id="h-2" onclick="ch('h-2', icons.hOn, icons.hOff)">
          <span class="material-symbols-outlined" id="">
            heat
          </span>
        </button>
        <button class="icon heat" id="h-3" onclick="ch('h-3', icons.hOn, icons.hOff)">
          <span class="material-symbols-outlined" id="">
            heat
          </span>
        </button>
        <button class="icon heat" id="h-4" onclick="ch('h-4', icons.hOn, icons.hOff)">
          <span class="material-symbols-outlined" id="">
            heat
          </span>
        </button>
        </div>
      </div>
    </div>
    <div class="change">
    <button class="left-t arr" onclick="incr()">
      <span class="material-symbols-outlined">
        arrow_forward_ios
        </span>
    </button>
    <div class="status">
      <span id="degree">--:--</span>°F
    </div>
    <button class="right-t arr" onclick="decr()">
      <span class="material-symbols-outlined">
        arrow_back_ios
        </span>
    </button>
  </div>
  </div>
  `,
  locks: `
  <nav>
      <div class="n-top">
        <div class="settings">
          <button class="arr" onclick="changeScreen(xHtml.main)">
            <span class="material-symbols-outlined">
              arrow_back_ios
            </span>
          </button>
        </div>
        <div class="name">
          <span id="user">Joel Mulonde</span>'s Lucid Air
        </div>
        <div class="profile">
          <img src="assets/unnamed.gif" alt="" class="pfp">
        </div>
      </div>
      <div class="n-mid dn">
        <span class="mile">
          185
        </span>
        <span>mi</span>
      </div>
      <div class="n-mid">
        <span id="indicator">Parked</span>
      </div>
    </nav>
    <div class="climate">
    <div class="car-top load-up-ani">
      <img src="assets/lucid-topview.png" alt="">
      <div class="controls">
        <button class="lock-icon" id="lock-1" onclick="ch('lock-1', icons.lock, icons.locked)">
          <span class="material-symbols-outlined">
            lock
          </span>
        </button>
        <button class="appleIco" id="icon-apple-1" onclick="tg('icon-apple-1')">
          <img class="apple-icono-img" src="assets/overhead.png" alt="">
        </button>
        <button class="appleIco" id="icon-apple-2" onclick="tg('icon-apple-2')">
          <img class="apple-icono-img" src="assets/overhead.png" alt="">
        </button>
        <button class="appleIco" id="icon-apple-3" onclick="tg('icon-apple-3')">
          <img class="apple-icono-img" src="assets/headlight.png" alt="">
        </button>
        <button class="appleIco" id="icon-apple-frunk" onclick="tg('icon-apple-frunk')">
          <img class="apple-icono-img" src="assets/frucnk.png" alt="">
        </button>
        <button class="appleIco" id="icon-apple-trunk" onclick="tg('icon-apple-trunk')">
          <img class="apple-icono-img" src="assets/trunkOpen.png" alt="">
        </button>
        <button class="appleIco" id="icon-apple-charge" onclick="tg('icon-apple-charge')">
          <img class="apple-icono-img" src="assets/charger-side.png" alt="">
        </button>
      </div>
    </div>
  </div>
  </div>
  `
}

const icons = {
    fanOn: `<span class="material-symbols-outlined" id="rot">
    toys_fan
  </span>`,
  fanOff: `<span class="material-symbols-outlined">
  mode_fan_off
  </span>`,
    lock: `<span class="material-symbols-outlined">
    lock_open_right
    </span>`,
    locked: `<span class="material-symbols-outlined">
    lock
    </span>`,
    ecoOn: `<span class="material-symbols-outlined green">
    eco
    </span>`,
    eco: `<span class="material-symbols-outlined">
    eco
    </span>`,
    hOn: `<span class="material-symbols-outlined red">
    heat
    </span>`,
    hOff: `<span class="material-symbols-outlined">
    heat
    </span>`,
    rec:`
    <button class="appleIco-style2" id="recycle" onclick="ch('windsheild-rear', icons.rec, icons.out)">
    <img src="assets/inAir.png" alt="" class="apple-icono-img">
  </button>
    `,
    out: `
    <button class="appleIco-style2" id="recycle" onclick="ch('windsheild-rear', icons.rec, icons.out)">
          <img src="assets/outside.png" alt="" class="apple-icono-img">
    </button>
    `
}

let state = localStorage.getItem('states') || {
    fan: true,
    lock: true,
}

function tg(divName){
    const div = document.getElementById(divName);
    const ind = document.getElementById('indicator');
    
    ind.innerHTML = 'connecting...'
    div.classList.add('dis')
    setTimeout(() => {
        ind.innerHTML = 'Parked'
        div.classList.remove('dis')
        document.getElementById(divName).classList.toggle('sudo')
    }, 950);

}

const climBtn = document.getElementById('js-clim-btn');

document.addEventListener('DOMContentLoaded', function() {
    if (climBtn) {
        climBtn.addEventListener('click', () => {
            changeScreen(xHtml.main);
        });
    }
  });

let outputDiv = document.getElementById('outdiv');
outputDiv.innerHTML = xHtml.main;

function changeScreen(html) {
    outputDiv.innerHTML = html;
}

function ch(iden, content1, content2) {
    const div = document.getElementById(iden);
    const ind = document.getElementById('indicator');
    
    ind.innerHTML = 'connecting...'
    div.classList.add('dis')
    setTimeout(() => {
        ind.innerHTML = 'Parked'
        div.classList.remove('dis')
        if (div.innerHTML === content1) {
            div.innerHTML = content2;
            state.fan = false
        } else {
            div.innerHTML = content1;
            state.fan = true
        }
        localStorage.setItem('states', state)
    }, 940);
}

function toggle(doc, className) {
    const div = document.getElementById(doc);
    div.classList.toggle(className)
}


let deg = localStorage.getItem('deg') || 63

function decr() {
    const air = document.querySelector('.air');
    const outputDeg = document.getElementById('degree')
    ch('fan', icons.fanOn, icons.fanOn)
    deg--
    outputDeg.innerHTML = deg;

if (deg >= 80) {
    air.style.backgroundColor = 'red';
} else if (deg <= 65) {
    air.style.backgroundColor = 'rgb(54, 54, 249)'
} else {
    air.style.backgroundColor = 'gray'
}

localStorage.setItem('deg', deg)
}

function incr() {
    const air = document.querySelector('.air');
    const outputDeg = document.getElementById('degree')
    ch('fan', icons.fanOn, icons.fanOn)
    deg++
    outputDeg.innerHTML = deg;

    if (deg >= 80) {
        air.style.backgroundColor = 'red';
    } else if (deg <= 65) {
        air.style.backgroundColor = 'rgb(54, 54, 249)'
    } else {
        air.style.backgroundColor = 'gray'
    }
    localStorage.setItem('deg', deg)

}



if (deg >= 80) {
    air.style.backgroundColor = 'red';
} else if (deg <= 65) {
    air.style.backgroundColor = 'rgb(54, 54, 249)'
} else {
    air.style.backgroundColor = 'gray'
}
