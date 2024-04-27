const appCont = document.querySelector('.app-cont');
let appHtml = ''; // Initialize appHtml outside the loop

const apps = [
    {
        name: 'Snake Game',
        dis: 'play snake game. eat as many apples as you can!',
        type: 'Javascript',
        gameID: 391,
    },
    {
        name: 'Pong',
        dis: 'play pong game. Get as many points as you can!',
        type: 'Javascript',
        gameID: 191,
    },
    {
        name: 'minesweeper',
        dis: 'play minesweeper!',
        type: 'Javascript',
        gameID: 291,
    }
];


apps.forEach((app) => {
    // Append the HTML for each app to appHtml
    appHtml += `
    <div class="app file react" id="e-file">
        <div>
            <span>${app.name}</span>
            <span>${app.dis}</span>
            <span id="Javascript"> &lt;&sol;&gt; ${app.type}</span>
        </div>
        <div>
            <button class="ps-btn-mini js-app-btn" id="js-btn-v-${app.gameID}" onclick="download(${app.gameID})">
                Install
            </button>
            <button class="ps-btn-mini" onclick="disable();">
                Disable
            </button>
        </div>
    </div>
    `;
});

// After the loop, update the innerHTML of appCont with the concatenated appHtml
appCont.innerHTML = appHtml;
