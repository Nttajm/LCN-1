import { bets } from './bets.js';

export let toCashout = Number(localStorage.getItem('toCash')) || 0;

export let userData = JSON.parse(localStorage.getItem('userDatas')) || [
    {
        name: 'balance',
        value: 100,
    },
];

export const userBets = JSON.parse(localStorage.getItem('userBets')) || [];

userBets.forEach(userBet => {
    const realBet = bets.find(bet => 
        bet.details.some(detail => detail.idl === userBet.id)
    );

    if (realBet) {
        const detail = realBet.details.find(d => d.idl === userBet.id);
        if (detail.result === userBet.betStatus && !detail.checked) {
            toCashout += detail.cash;
            detail.checked = true;
        }
    }
});

export function save() {
    localStorage.setItem('userDatas', JSON.stringify(userData));
    localStorage.setItem('userBets', JSON.stringify(userBets));
    localStorage.setItem('toCash', toCashout);
}

console.log(userBets);
console.log(bets);
