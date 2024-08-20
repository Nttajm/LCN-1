import { bets } from './bets.js';

export let toCashout = localStorage.getItem('toCash') || 0;

export let userData = JSON.parse(localStorage.getItem('userDatas')) || [
    {
        name: 'balance',
        value: 100,
    },
]

export const userBets =  JSON.parse(localStorage.getItem('userBets')) || [ 
    {
        id : '1s',
        betStatus: 'over',
    },
]

userBets.forEach(bet => {
    // Find the bet with the corresponding id in the details
    const realBet = bets.find(b => 
        b.details.some(detail => detail.idl === bet.id)
    );

    if (realBet) {
        // Find the specific detail with the matching id
        const detail = realBet.details.find(d => d.idl === bet.id);
        
        // Check if both betStatus and detail.result are 'over'
        if (detail && bet.betStatus === 'over') {
            
            toCashout += detail.cash;
        }
    }
});
