let userData = JSON.parse(localStorage.getItem('userData')) || {};
let keys = 3;
let keyAdder = localStorage.getItem('keyAdder') || 0;
const userBets = JSON.parse(localStorage.getItem('userBets')) || [];

save();

import { soccerBets } from './bets.js';
import { basketballBets } from './bets.js';
import { volleyballBets } from './bets.js';
import { schoolBets } from "./bets.js";
let allBets = [...soccerBets, ...basketballBets, ...volleyballBets, ...schoolBets];


userData.keys = keys + keyAdder;
    save();



if (!userData.bets) {
    userData.bets = userBets;
    save();
}

function getWinLossRation() {
    let wins = 0;
    let losses = 0;
    userBets.forEach(userBet => {
      const matchingBet = allBets.find(bet => bet.id === userBet.matchingBet);
      if (matchingBet) {
        // Check if the user's option matches the bet result
        if (matchingBet.result === userBet.option) {
          wins++;
          userData.keys++;
          save();
        } else if (matchingBet.result !== userBet.option && (matchingBet.result === 'over' || matchingBet.result === 'under')) {
          losses++;
        }
        // No need to check for an empty result because it doesn't change the balance
      }
    });

    const ratio = (wins / (wins + losses)).toFixed(2);
    return ratio;
    // Update the UI with the new balance
  }


  console.log(getWinLossRation());
  function ranker() {
    let ratio = getWinLossRation();
    let rank = 0;
    const rankThresholds = [
      { threshold: 3, rank: 10000 },
      { threshold: 2, rank: 5000 },
      { threshold: 1.9, rank: 3000 },
      { threshold: 1.6, rank: 2500 },
      { threshold: 0.9, rank: 1500 },
      { threshold: 0.7, rank: 1000 },
      { threshold: 0.5, rank: 800 },
      { threshold: 0.2, rank: 500 },
      { threshold: 0, rank: 0 }
    ];

    for (let i = 0; i < rankThresholds.length; i++) {
      if (ratio >= rankThresholds[i].threshold) {
        rank = rankThresholds[i].rank;
        break;
      }
    }

    userData.rank = rank;
    save();
  }

  ranker();

export function Initialize() {
    ranker();
    save();
    userData.keyAdder = 0;
if (!userData.bets) {
    userData.bets = userBets;
    save();
}
}

Initialize();


function save() {
    localStorage.setItem('userData', JSON.stringify(userData));
}