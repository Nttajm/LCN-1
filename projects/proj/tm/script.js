const players= [{
    number: 9,
    first: 'Juve',
    last: 'Juventus',
    team: 'barca',
    teamName: 'Barcelona',
    img: true,
    ucl: 7,
    ballon: 9,
    worth: 430,
    goals: 1207,
    league: 'esp',
    join: 'Jan 2, 2002',
    exp: 'Jun 2, 2017',
}];

function renderPlayer() {
    const output = document.getElementById('output')
    output.innerHTML = ''; 
    
    players.forEach((player) => {
        let playerUcl = ''
        let playerBallon = ''
        if (player.ucl) {
            for (let i = 0; i < player.ucl; i++) {
                playerUcl += `<img src="asseets/trophies/ucl.png" alt="ucl" class="tr">`
            }
        }
        if (player.ballon) {
            for (let i = 0; i < player.ballon; i++) {
                playerBallon += `<img src="asseets/trophies/ballon.png" alt="ucl" class="tr">`
            }
        }

        let league = 'ACL'

        if (player.league = 'esp') {
            league = 'LaLiga'
        }
        output.innerHTML = `
        <section>
            <div class="banner banner-spe">
                <span id="playerNum">#${player.number}</span>
                <span id="firstName">${player.first}</span>
                <span id="lastName">${player.last}</span>
                <div class="cap">
                    <img src="asseets/captin.png" alt="cap">
                </div>
            </div>
            <div class="info">
                <div class="sec-1 vb">
                    <div class="Imgdiv vr dn">
                        <img src="asseets/test.webp" alt="" class="playerImg">
                        <span class="mjs">Major Luege Soccer</span>
                    </div>
                    <div class="val">&euro;${player.worth}.00m</div>
                </div>
                <div class="sec-2 vr">
                    <div class="team">
                        <img src="asseets/teams/${player.team}.png" alt="">
                        <div class="team-info">
                            <span class="team-name hig-b">
                            ${player.teamName}
                            </span>
                            <div class="sepa">
                                <span class="league hig">
                                ${league}
                                </span>
                                <div class="stat">
                                    <span>Joined:</span>
                                    <span class="bold">${player.join}</span>
                                </div>
                                <div class="stat">
                                    <span>Contract expire:</span>
                                    <span class="bold">${player.exp}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <hr>
                    <div class="team-info">
                            <div class="stat">
                                <span>Date of birth/Age:</span>
                                <span class="bold">Jun 24, 1987 (36)</span>
                            </div>
                            <div class="stat">
                                <span>Contract expires:</span>
                                <span class="bold"> Dec 31, 2025</span>
                            </div>
                            <div class="stat">
                                <span>Place of birth:</span>
                                <span class="bold">Rosario</span>
                            </div>
                            <div class="stat">
                                <span>height</span>
                                <span class="bold">1,70 m</span>
                            </div>
                    </div>
                    <hr>
                    <div class="team-info">
                        <div class="stat">
                            <span>Most goal in a year:</span>
                            <span class="bold">91</span>
                            <span>(wr)</span>
                        </div>
                        <div class="stat">
                            <span>Arr:</span>
                            <span class="bold">56-34</span>
                        </div>
                        <div class="stat">
                            <span>Goals (L): </span>
                            <span class="bold">474</span>
                        </div>
                        <div class="stat">
                            <span>Goals: </span>
                            <span class="bold">${player.goals}</span>
                        </div>
                        <div class="stat">
                            <span>height</span>
                            <span class="bold">1,70 m</span>
                        </div>
                </div>
                </div>
            </div>
        </section>
        <section>
            <div class="banner banner-head">
                <span>${player.ucl}X CHAMPIONS LEAGUE WINNER</span>
            </div>
            <hr>
            ${playerUcl}
        </section>
        <section class="">
            <div class="banner banner-head">
                <span>${player.ballon}X WINNER BALLON D'OR</span>
            </div>
            <hr>
            ${playerBallon}
        </section>
        `;
    });
}

renderPlayer()