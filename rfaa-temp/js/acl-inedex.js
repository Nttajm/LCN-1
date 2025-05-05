// texico seria is ts
let goals = [
    {
        'season': '2025',
        'fgoals': [
            {
                by: 'Juventus juve',
                gameId: 129,
                team: 'tex',
                goals: 1,
            }
        ]
    }
]

let teams = [
    {
        id: 'tex',
        name: 'Cerius Texico',
        sub: `Cer'x`,
        originC: 'Texico',
        originL: 'TS',
        img: 'images/teams/degato.png',
        player: [
            'Juventus juve',
            'Jota Eme',
            'countino'
        ]
    },
    {
        id: 'BVB',
        name: 'Borussia Dortmund',
        sub: `BVB`,
        originC: 'Germany',
        originL: 'DE',
        img: 'images/teams/Borussia.png',
        player: [
            'Marco Reus',
            'Erling Haaland',
            'Jadon Sancho'
        ]
    }
    ,
    {
        id: 'RM',
        name: 'Real Madrid',
        sub: `RM`,
        originC: 'Spain',
        originL: 'ES',
        img: 'images/teams/real-madrid.png',
        player: [
            'Karim Benzema',
            'Luka Modric',
            'Vinicius Jr'
        ]
    },
    {
        id: 'BAR',
        name: 'FC Barcelona',
        sub: `BAR`,
        originC: 'Spain',
        originL: 'ES',
        img: 'images/teams/barcelona.png',
        player: [
            'Lionel Messi',
            'Pedri',
            'Ansu Fati'
        ]
    },
    {
        id: 'MCI',
        name: 'Manchester City',
        sub: `MCI`,
        originC: 'England',
        originL: 'EN',
        img: 'images/teams/manchester-city.png',
        player: [
            'Kevin De Bruyne',
            'Phil Foden',
            'Erling Haaland'
        ]
    }
    ,
    {
        id: 'PSG',
        name: 'Paris Saint-Germain',
        sub: `PSG`,
        originC: 'France',
        originL: 'FR',
        img: 'images/teams/psg.png',
        player: [
            'Kylian Mbappé',
            'Neymar Jr',
            'Lionel Messi'
        ]
    },
    {
        id: 'LIV',
        name: 'Liverpool FC',
        sub: `LIV`,
        originC: 'England',
        originL: 'EN',
        img: 'images/teams/liverpool.png',
        player: [
            'Mohamed Salah',
            'Virgil van Dijk',
            'Trent Alexander-Arnold'
        ]
    },
    {
        id: 'ATM',
        name: 'Atletico Madrid',
        sub: `ATM`,
        originC: 'Spain',
        originL: 'ES',
        img: 'images/teams/atletico-madrid.png',
        player: [
            'Antoine Griezmann',
            'Jan Oblak',
            'João Félix'
        ]
    },
    {
        id: 'CHE',
        name: 'Chelsea FC',
        sub: `CHE`,
        originC: 'England',
        originL: 'EN',
        img: 'images/teams/chelsea.png',
        player: [
            'Mason Mount',
            `N'Golo Kanté`,
            'Reece James'
        ]
    },
    {
        id: 'BAY',
        name: 'Bayern Munich',
        sub: `BAY`,
        originC: 'Germany',
        originL: 'DE',
        img: 'images/teams/bayern-munich.png',
        player: [
            'Robert Lewandowski',
            'Thomas Müller',
            'Manuel Neuer'
        ]
    },
    {
        id: 'INT',
        name: 'Inter Milan',
        sub: `INT`,
        originC: 'Italy',
        originL: 'IT',
        img: 'images/teams/inter-milan.png',
        player: [
            'Lautaro Martínez',
            'Romelu Lukaku',
            'Milan Škriniar'
        ]
    }
];
seasons = []


const params = new URLSearchParams(window.location.search);
const season = params.get('season')
if (!season) {
    loadSeason()
} else {
    loadSeason(season)
}



const content = document.querySelector('.pad-cont')
content.innerHTML = ``

function intinailize() {
    if (seasons.length == 0) {
        content.innerHTML = `
        <div class="create-matchday">
            <div class="dotted-btn" id="create-season-btn">
                <span>CREATE SEASON</span>
            </div>
        </div>
        `
    }
}

intinailize()

function loadSeason(season) {
    if (!season) {
        season = '2025'
    }
    if (seasons.length == 0) {
        return
    }

    const seasonData = seasons.find(s => s.year == season)
    content.innerHTML = 
    `

    `

}

const createSeasonBtn = document.querySelector('#create-season-btn')
createSeasonBtn.addEventListener('click', createSeasonbtn)

function createSeasonbtn(season) {
    const notifEd = document.querySelector('.notifEd')
    const notifEdText = document.querySelector('.notifEd-context')
    notifEd.classList.toggle('dn')

    notifEdText.innerHTML = `
        <h1>Create Season</h1>
        <span class="medtx">
            teams selected: 0/20
        </span>
        <select name="years" id="year-select">
            ${Array.from({ length: 60 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return `<option value="${year}">${year}</option>`;
            }).join('')}
        </select>

        <div class="teams-select">
            ${teams.map((team, index) => `
                <div class="s-team">
                    <input type="checkbox" id="team-${team.id}" class="team-checkbox">
                    <img src="${team.img}" alt="">
                    <span>${team.name}</span>
                </div>
            `).join('')}
        </div>
        <div class='fl-c'>
        <div class="btn" id="create-season">
            <span>CREATE SEASON</span>
        </div>
        <div class="btn-secondary" id="cancel-create-season">
            <span>CANCEL</span>
        </div>
        </div>
        
    `;
}

const createSeason = document.querySelector('#create-season')
createSeason.addEventListener('click', createSeasonFunc)

function createSeasonFunc() {
    const yearSelect = document.querySelector('#year-select')
    const selectedYear = yearSelect.value
    const selectedTeams = Array.from(document.querySelectorAll('.team-checkbox:checked')).map(checkbox => {
        return checkbox.id.replace('team-', '')
    })
    if (selectedTeams.length == 0) {
        alert('Please select at least one team')
        return
    }
    const season = {
        year: selectedYear,
        teams: selectedTeams,
        id: `season-${selectedYear}`
    }
    seasons.push(season)
    console.log(season)
    loadSeason(selectedYear)
}


const cancelCreateSeason = document.querySelector('#cancel-create-season')
cancelCreateSeason.addEventListener('click', cancelCreateSeasonFunc)

function cancelCreateSeasonFunc() {
    const notifEd = document.querySelector('.notifEd')
    const notifEdText = document.querySelector('.notifEd-context')
    notifEd.classList.toggle('dn')
    notifEdText.innerHTML = ``
}




