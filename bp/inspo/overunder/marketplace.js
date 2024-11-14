// import { balanceAdder } from "./global";

import { checkBetsAndUpdateBalance, userData, saveData } from "./global.js";

const marketplace = [
    {
        name: 'Arizona',
        price: 3500,
        left: '6/6',
        img: 'mk-arizona.jpg'
    },
    {
        name: '$100 gift card',
        price: 40000,
        left: '1/1',
        img: 'mk-100.jpg'
    },
    {
        name: 'Pumpkin Spice Latte',
        price: 8000,
        left: '3/3',
        img: 'mk-starbucks.jpg'
    },
    {
        name: 'Smoken Bowls',
        price: 6500,
        left: '3/3',
        img: 'mk-starbucks.jpg'
    },
    {
        name: 'Leader Board style',
        price: 600,
        left: '3/3',
        img: 'mk-starbucks.jpg'
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


const marketplaceItems = document.querySelectorAll('.market-item');
marketplaceItems.forEach((item) => {
    const price = parseInt(item.getAttribute('data-item-price'));
    item.querySelector('button').addEventListener('click', () => {
        const balance = checkBetsAndUpdateBalance();
        if (balance >= price) {
            // const newBalance = balance - price;
            // updateBalanceUI(newBalance);
            // updateBalanceAdder(newBalance);
            showForm();
            userData.orders.push({
                item: item.getAttribute('data-id'),
                price: price,
                date: new Date().toDateString(),
            });
            saveData();
        } else {
            alert("Insufficient balance to purchase this item.");
        }
    });
});

renderItems();