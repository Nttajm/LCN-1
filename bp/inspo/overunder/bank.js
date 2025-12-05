import { checkBetsAndUpdateBalance, getKeys, saveData, uiAndBalance } from "./global.js";
import { getRank } from "./firebaseconfig.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, addDoc, collection } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { openSite, userData } from "./global.js";
import { updateFb, getFb, checkLoans, checkIfisBanned } from "./firebaseconfig.js";
openSite();
let taken = false;
checkIfisBanned();

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAGcg43F94bWqUuyLH-AjghrAfduEVQ8ZM",
  authDomain: "overunder-ths.firebaseapp.com",
  projectId: "overunder-ths",
  storageBucket: "overunder-ths.firebasestorage.app",
  messagingSenderId: "690530120785",
  appId: "1:690530120785:web:36dc297cb517ac76cb7470",
  measurementId: "G-Q30T39R8VY"
};


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore(app);

const banks = [
    {
        name: `Joel's finacial aid`,
        id: `jfa`,
        img: "/bp/EE/assets/ouths/fi-aid.png",
        maxTerm: 72,
        maxLoan: 1200,
        fee: 30,
        selects: [
            1, 3, 12, 24, 48, 72
        ],
    },
    {
        name: `OU Bank`,
        id: `oub`,
        img: "/bp/EE/assets/ouths/oubank.png",
        maxTerm: 36,
        maxLoan: 4500,
        fee: 24,
        selects: [
            1, 2, 3, 12, 24, 36
        ],
    },
    {
        name: `Sapphire`,
        id: `saph`,
        img: "/bp/EE/assets/ouths/saphire.png",
        maxTerm: 20,
        fee: 24,
        maxLoan: 20_000,
        neededRank: 300,
        selects: [
            1, 2, 5, 10, 15, 20
        ],
    },
    {
        name: `Sapphire ++`,
        id: `saphp`,
        img: "/bp/EE/assets/ouths/saphire-plus.png",
        maxTerm: 20,
        maxLoan: 50_000,
        fee: 48,
        neededRank: 1000,
        selects: [
            1, 2, 5, 10, 15, 20
        ],
    },
]

 function renderBanks() {
    const bankCont = document.querySelector('.bank-cont');
    bankCont.innerHTML = '';

    let neededHtml = ``;

    banks.forEach(async bank => {


        let rank = await getRank();

        if (bank.neededRank && rank < bank.neededRank) {
            neededHtml = `<div class="needed">Rank ${bank.neededRank} needed</div>`;
        }
        if (taken) {
            neededHtml = `<div class="needed">1/1 loans </div>`;
        }

        bankCont.innerHTML += `
        <div class="bank" data-id="${bank.id}">
          <div class="bank-top fl-r-to-c g-10">
            <img src="${bank.img}" alt="${bank.name}">
            <span>${bank.name}</span>
          </div>
          <div class="sepa"></div>
          <div class="infos">
            <span>Max term:</span>
            <span class="box">${Math.floor(bank.maxTerm / 24) > 0 ? `${Math.floor(bank.maxTerm / 24)} day${Math.floor(bank.maxTerm / 24) > 1 ? 's' : ''}` : ''} ${bank.maxTerm % 24 > 0 ? `${bank.maxTerm % 24} hour${bank.maxTerm % 24 > 1 ? 's' : ''}` : ''}</span>
            <span>Max principal:</span>
            <span class="box">$${bank.maxLoan.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
            <span>Fee:</span>
            <span class="box">$${bank.fee.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
          </div>
          <div class="bank-button-sec ${neededHtml ? `R` : ``}">
            ${neededHtml}
            <input type="number" class="times">
            <select>
              ${bank.selects.map(select => `<option value="${select}">${select < 24 ? `${select} hour${select > 1 ? 's' : ''}` : `${Math.floor(select / 24) > 0 ? `${Math.floor(select / 24)} day${Math.floor(select / 24) > 1 ? 's' : ''}` : ''} ${select % 24 > 0 ? `${select % 24} hour${select % 24 > 1 ? 's' : ''}` : ''}`}</option>`).join('')}
            </select>
            <button ${neededHtml ? 'disabled' : ''}>Take loan</button>
          </div>
        </div>
        `;
        attachLoanEventListeners();
    });
}
function attachLoanEventListeners() {
    const banks = document.querySelectorAll('.bank');
    banks.forEach(bank => {
        const takeloan = bank.querySelector('button');
        const amount = bank.querySelector('.times');
        const term = bank.querySelector('select');
        const fee = bank.querySelector('.infos .box:nth-of-type(6)');

        takeloan.addEventListener('click', async () => {
            const loanAmount = Number(amount.value);
            const maxLoan = Number(bank.querySelector('.infos .box:nth-of-type(4)').innerText.replace(/[^\d]/g, ''));
            const feeAnount = Number(fee.innerText.replace(/[^\d]/g, ''));
            if (loanAmount > maxLoan) {
                alert(`Max loan is $${maxLoan}`);
                return;
            }

            fillForm(term.value, loanAmount + feeAnount, bank.dataset.id, feeAnount);
            
        });
    });
}

function generateFirebaseId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    const length = 20; // Typical Firebase ID length is 20 characters
    for (let i = 0; i < length; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

async function fillForm(term, amount, id, fee) {
    const fbData = {};

    const currentDate = new Date();
    const newDate = new Date(currentDate.getTime() + term * 60 * 60 * 1000);
    fbData.payby = newDate;
    fbData.amount = amount;
    fbData.id = id;
    fbData.lid = generateFirebaseId();
    fbData.status = 'active';

    const loansRef = collection(db, 'users', userData.uid, 'loans');
    const snapshot = await getDocs(loansRef);

    let existingLoan = false;
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.id === id && data.status !== 'paid' && data.status !== 'overdue') {
            existingLoan = true;
        }
    });

    if (existingLoan) {
        alert('You already have an active loan from this bank');
        return;
    } else {
        await addDoc(loansRef, fbData);
        uiAndBalance(amount - fee);
        saveData();
        await myloans();
    }
}


renderBanks();


async function myloans() {
    const myLoans = document.querySelector('#my-loans');
    myLoans.innerHTML = '';
    const loansRef = collection(db, 'users', userData.uid, 'loans');
    const snapshot = await getDocs(loansRef);

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const bank = banks.find(bank => bank.id === data.id);

        if (!bank) return;

        if (data.status === 'paid' || data.status === `overdue`) return;
        taken = true;


        // Add loan card
        myLoans.innerHTML += `
            <div class="loan">
              <div class="loan-info">
                <img src="${bank.img}" alt="${bank.name}">
                <div>
                  <span>Pay</span> <span class="bold">$${data.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span> 
                  by <span class="bold">${data.payby.toDate().toLocaleString()}</span>
                </div>
              </div>
              <div class="paynow">
                <button data-loan-id="${docSnap.id}" data-loan-amount="${data.amount}">Pay now</button>
              </div>
            </div>
        `;
    });

    // Attach event listeners for Pay now buttons
    const payNowButtons = myLoans.querySelectorAll('.paynow button');
    payNowButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const loanId = e.target.getAttribute('data-loan-id');
            const loanAmount = Number(e.target.getAttribute('data-loan-amount'));
            await payLoan(loanId, loanAmount);
        });
    });
}


myloans();

async function payLoan(loanId, loanAmount) {
    const loansRef = doc(db, 'users', userData.uid, 'loans', loanId);
    const loanSnap = await getDoc(loansRef);


    if (!loanSnap.exists()) {
        alert('Loan not found!');
        return;
    }
    const userBalance = checkBetsAndUpdateBalance();
    if (userBalance < loanAmount) {
        alert('Insufficient funds to pay the loan');
        return;
    }
    uiAndBalance(-loanAmount);
    await setDoc(loansRef, { status: 'paid' }, { merge: true });
    await myloans();
}

setInterval(await checkLoans, 1000);