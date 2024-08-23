const userBets  = []

const bets = [
  {
    name: 'joel vs dan',
    id: '1s'
  },
  {
    name: 'joel vs loren',
    id: '2s',
    status: 'ongoing'
  }
]

const container = document.querySelector('.sec')

container.innerHTML = '';

bets.forEach(bet => {
  container.innerHTML += `
    <div class="bet">
      <span>${bet.name}</span>
      <div class="button-sec" id="btn-${bet.id}">
        <button class="over">over</button>
        <button class="under">under</button>
      </div>
    </div>
  `

  const overBtn = document.querySelector(`.button-sec #btn-${bet.id}`)
  const underBtn = document.querySelector(`.button-sec #btn-${bet.id}`)


});