// import { balanceAdder } from "./global";

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGcg43F94bWqUuyLH-AjghrAfduEVQ8ZM",
  authDomain: "overunder-ths.firebaseapp.com",
  projectId: "overunder-ths",
  storageBucket: "overunder-ths.firebasestorage.app",
  messagingSenderId: "690530120785",
  appId: "1:690530120785:web:36dc297cb517ac76cb7470",
  measurementId: "G-Q30T39R8VY"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);


import { checkBetsAndUpdateBalance, userData, saveData, updateBalanceUI, updateBalanceAdder } from "./global.js";

const usrnamediv = document.getElementById('username');
usrnamediv.innerHTML = userData.username || '???';

const balanceElem = document.querySelector('.balance.money');
balanceElem.textContent = `$${checkBetsAndUpdateBalance().toFixed(2)}`;

const marketplace = [
    {
        name: 'Arizona',
        price: 1,
        left: '5/6',
        img: 'mk-arizona.jpg'
    },
    {
        name: 'Leader Board style',
        price: 700,
        left: '3/3',
        img: 'leaderstyle.png'
    },
    {
        name: '$25 gift card',
        price: 50000,
        left: '1/1',
        img: 'mk-100.jpg'
    },
    {
        name: 'Pumpkin Spice Latte',
        price: 33120,
        left: '3/3',
        img: 'mk-starbucks.jpg'
    },
    {
        name: 'Smoken Bowls',
        price: 16500,
        left: '1/1',
        img: 'smoken.jpg'
    },
    {
        name: 'Make your own coin',
        price: 25000,
        left: '1/1',
        img: 'smoken.jpg'
    },
]
function renderItems() {
    const marketplaceDiv = document.querySelector('.market-sec');
    marketplaceDiv.innerHTML = '';
    marketplace.forEach((item) => {
        marketplaceDiv.innerHTML += `
            <div class="card market-item" data-item-price="${item.price}" data-id="${item.name}">
                <div class="is"></div>
                <div class="img-sec-i">
                    <img src="/bp/EE/assets/ouths/${item.img}" alt="logo">
                    <span class="img-title">${item.name}</span>
                </div>
                <span class="price">$${item.price.toLocaleString()}</span>
                <div class="sepa"></div>
                <span class="inst">
                    in stock <span class="bold">${item.left}</span>
                </span>
                <button>purchase</button>
            </div>
        `;
    });
}

let itemSelected = '';
let itemPrice = 0;

// Event listener for marketplace items
document.addEventListener('DOMContentLoaded', () => {
    renderItems();

    const marketplaceItems = document.querySelectorAll('.market-item');
    marketplaceItems.forEach((item) => {
        const price = parseInt(item.getAttribute('data-item-price'));
        const name = item.getAttribute('data-id');

        item.querySelector('button').addEventListener('click', () => {
            itemSelected = name;
            itemPrice = price;
            const balance = checkBetsAndUpdateBalance();
            if (balance >= itemPrice) {
                if (name === 'Leader Board style') {
                    showForm(name, 'url or describe image.');
                } else {
                    showForm(name, 'Enter your shipping address.');
                }
            } else {
                alert("Insufficient balance to purchase this item.");
            }
        });
    });
});

// Display the form and set item information
function showForm(item, info) {
    const formDiv = document.querySelector('.buyForm');
    formDiv.classList.remove('dn');

    const inputField = formDiv.querySelector('#discription');
    inputField.placeholder = info;
    formDiv.setAttribute('data-name', item);
}

// Handle form submission and finalize purchase
const form = document.querySelector('#firebasePush');
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const balance = checkBetsAndUpdateBalance();
    if (balance >= itemPrice) {
        const newBalance = balance - itemPrice;
        updateBalanceUI(newBalance);
        updateBalanceAdder(newBalance);

        // Get form data and submit to Firestore
        const formData = new FormData(form);
        const userId = auth.currentUser.uid;
        const ordersRef = collection(db, 'orders');
        const docData = {
            userId: userId,
            item: itemSelected,
            disciption: formData.get('dispcription'),
            date: new Date().toDateString(),
            name: formData.get('name'),
            acc: userData.name,
        };

        await addDoc(ordersRef, docData);

        // Update local user data and save it
        userData.orders.push({
            item: itemSelected,
            price: itemPrice,
            date: new Date().toDateString(),
            fBrefrence: docData.id,
        });
        
        saveData();

        // Hide the form after submission
        formDiv.classList.add('dn');
        alert(`Successfully purchased ${itemSelected}!`);
    } else {
        alert("Insufficient balance to purchase this item.");
    }

    form.reset();
    location.reload();
});

const cancelBtn = document.getElementById('cancel');
cancelBtn.addEventListener('click', () => {
    document.querySelector('.buyForm').classList.add('dn');
});