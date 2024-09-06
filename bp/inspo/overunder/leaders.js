import { soccerBets } from "./bets.js";
import { basketballBets } from "./bets.js";
import { volleyballBets } from "./bets.js";

const allBets = [...soccerBets, ...basketballBets, ...volleyballBets];
const userBets = JSON.parse(localStorage.getItem('userBets')) || [];

let balance = 0;

const balanceElem = document.querySelector('.balance');

function checkBetsAndUpdateBalance() {
    balance = 0;
    userBets.forEach(userBet => {
        const matchingBet = allBets.find(bet => bet.id === userBet.matchingBet);
        if (matchingBet) {
            if (matchingBet.result === userBet.option) {
                balance += matchingBet.price;
            } else if (matchingBet.result !== userBet.option && (matchingBet.result === 'over' || matchingBet.result === 'under')) {
                balance -= matchingBet.price;
            }
        }
    });
    balanceElem.innerHTML = `<span>$${balance}</span>`;
}

checkBetsAndUpdateBalance();

if (balance < 0) {
    balanceElem.classList.add('negative');
} else {
    balanceElem.classList.remove('negative');
}

function encryptNumbers(input) {
    const digitToCode = [
        'ILY', '1-MAG-1GU', 'WTG', 'AIG', 'ERX-82', 'IOITRN', '29-10', 'sigma', '13-14', 'JKSON',
        'ILY', '1-MAG-1GU', 'WTG', 'AIG', 'ERX-82', 'IOITRN', '29-10', 'sigma', '13-14', 'JKSON',
    ];

    let shift = Math.floor(Math.random() * 9) + 1;


    let encrypted = '';

    for (let i = 0; i < input.length; i++) {
        let char = input[i];
        let index = char.charCodeAt(0) - '0'.charCodeAt(0);

        if (char >= '0' && char <= '9') {
            // Encrypt the number using a Caesar cipher approach
            let shiftedIndex = (index + shift) % 10;
            encrypted += digitToCode[shiftedIndex];
        } else {
            encrypted += char; // Keep non-number characters unchanged
        }
    }
    
    // Reverse the encrypted string
    return encrypted.split('').reverse().join('') + '*' + shift;
}

function decryptNumbers(encrypted) {
    const digitToCode = [
        'ILY', '1-MAG-1GU', 'WTG', 'AIG', 'ERX-82', 'IOITRN', '29-10', 'sigma', '13-14', 'JKSON',
        'ILY', '1-MAG-1GU', 'WTG', 'AIG', 'ERX-82', 'IOITRN', '29-10', 'sigma', '13-14', 'JKSON',
    ];

    // Extract the shift value and encrypted string
    let [reversedEncrypted, shift] = encrypted.split('*');
    shift = parseInt(shift, 10);

    // Reverse the encrypted string
    let encryptedString = reversedEncrypted.split('').reverse().join('');

    let decrypted = '';

    let i = 0;
    while (i < encryptedString.length) {
        let matchFound = false;
        for (let j = 0; j < digitToCode.length; j++) {
            let code = digitToCode[j];
            if (encryptedString.startsWith(code, i)) {
                let index = j;
                // Decrypt the number using the reverse of the Caesar cipher approach
                let originalIndex = (index - shift + 10) % 10;
                decrypted += String.fromCharCode('0'.charCodeAt(0) + originalIndex);
                i += code.length;
                matchFound = true;
                break;
            }
        }
        if (!matchFound) {
            decrypted += encryptedString[i];
            i++;
        }
    }

    return decrypted;
}




const gameCodeElem = document.querySelector('.js-gameCode');
const encrypted = encryptNumbers(balance.toString(), 5);
const decrypted = decryptNumbers('01-92*6');
gameCodeElem.value = encrypted;

console.log("Encrypted:", encrypted);
console.log("Decrypted:", decrypted);
