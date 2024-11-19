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

import { antiC, checkIfisBanned } from "./firebaseconfig.js";

checkIfisBanned();
const usrnamediv = document.getElementById('username');
usrnamediv.innerHTML = userData.username || '???';
const balanceElem = document.querySelector('.balance.money');
balanceElem.textContent = `$${checkBetsAndUpdateBalance().toFixed(2)}`;
const marketplace = [
    {
        name: 'Arizona',
        price: 3800,
        left: '1',
        img: 'mk-arizona.jpg'
    },
    {
        name: 'Overunder starter pack: $800 + Free style + 40 free shares',
        price: 5,
        left: 'out',
        img: 'ou-logo-white.png',
        customShowForm: 'meet joel or any moderator.'
    },
    {
        name: 'Glow in the dark',
        price: 1000,
        left: 'infinit',
        img: 'glow.png',
        customShowForm: 'url or describe image, color other'
    },
    {
        name: 'Leader Board style',
        price: 700,
        left: 'infinit',
        img: 'leaderstyle.png',
        customShowForm: 'url or describe image, color other'
    },
    {
        name: 'Any custom Leader Board style',
        price: 3600,
        left: 'infinit',
        img: 'leaderstyle.png',
        customShowForm: 'url or describe image, color other'
    },
    {
        name: 'Leader Board style 3d',
        price: 1500,
        left: 'infinit',
        img: '3d.png',
        customShowForm: 'url or describe image, color other'
    },
    {
        name: 'Leader Board style spin',
        price: 5100,
        left: 'infinit',
        img: 'spinning.png',
        customShowForm: 'url or describe image, color other'
    },
    {
        name: 'Leader Board Gif',
        price: 1200,
        left: 'infinit',
        img: 'lebrongif.gif',
        customShowForm: 'url or describe image, color other'
    },
    {
        name: '$25 gift card',
        price: 70000,
        left: '1',
        img: 'mk-25.avif'
    },
    {
        name: 'Pumpkin Spice Latte',
        price: 12000,
        left: '2',
        img: 'mk-starbucks.jpg'
    },
    {
        name: 'Smoken Bowls',
        price: 16500,
        left: '2',
        img: 'smoken.jpg'
    },
    {
        name: 'Make your own coin',
        price: 25000,
        left: '1',
        img: 'coin-own.png'
    },
];

function renderItems() {
    const marketplaceDiv = document.querySelector('.market-sec');
    marketplaceDiv.innerHTML = '';

    if (marketplace.length === 0) {
        marketplaceDiv.innerHTML = '<h3>There are no items in the marketplace.</h3>';
    }

    marketplace.forEach((item) => {
        let soldOutHtml = ``;
        let realHtml = ``;

        if (item.left === 'out') {
            soldOutHtml = `<span class="sold-out">${item.name} is all sold out :(</span>`;
        }

        if (item.real) {
            realHtml = `<span class="real">Real Money</span>`;
        }
        marketplaceDiv.innerHTML += `
            <div class="card market-item ${soldOutHtml ? 'sold-out-item' : ''}${realHtml ? 'sold-out-item real-item' : ''} " data-item-price="${item.price}" data-id="${item.name}">
                ${soldOutHtml}
                ${realHtml}
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
            antiC(`purchase`, `${name} for $${price}`);
            itemSelected = name;
            itemPrice = price;
            const balance = checkBetsAndUpdateBalance();
            if (balance >= itemPrice) {
                const selectedItem = marketplace.find(i => i.name === name);
                let formPlaceholder = selectedItem.customShowForm || 'when is the best time to deliver? (during school)';
                showForm(name, formPlaceholder);
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

        // Close the form after submission
        document.querySelector('.buyForm').classList.add('dn');
        
        // Reload the page
        location.reload();

    } else {
        alert("Insufficient balance to purchase this item.");
    }

    form.reset();
});
const cancelBtn = document.getElementById('cancel');
cancelBtn.addEventListener('click', () => {
    document.querySelector('.buyForm').classList.add('dn');
    antiC(`cancel`, `cancel`);
});




    async function showMyOrders() {
        const userData = JSON.parse(localStorage.getItem('userData'));
        const userId = userData.uid;
        const ordersRef = collection(db, 'orders');
        const ordersSnapshot = await getDocs(ordersRef);
        const orders = ordersSnapshot.docs
            .filter(doc => doc.data().userId === userId)
            .sort((a, b) => b.data().date - a.data().date) // Sort by date descending
            .slice(0, 5); // Limit to 5 latest orders

        const ordersDiv = document.querySelector('.orders-sec');
        ordersDiv.innerHTML = '';

        if (orders.length === 0) {
            ordersDiv.innerHTML = '<h3>You have no orders</h3>';
        } else {
            orders.forEach(orderDoc => {
                const order = orderDoc.data();
                ordersDiv.innerHTML += `
                    <div class="order-item ${order.orderStatus || 'pending'}">
                    <img src="/bp/EE/assets/ouths/${getMatchingImg(order.item)}" alt="${getMatchingImg(order.item)}">
                    <span>${order.orderStatus || 'Pending'}</span>
                    </div>
                `;
            });
        }
    }

    function getMatchingImg(item) {
        const matchedItem = marketplace.find(i => i.name === item);
        if (matchedItem) {
            return matchedItem.img; // Return the image file name
        }
        return ''; // Return an empty string if no match is found
    }

    showMyOrders();
