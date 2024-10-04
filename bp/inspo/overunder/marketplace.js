const marketplace = [
    {
        name: 'Arizona',
        price: 1000,
        left: '6/6',
        img: 'mk-arizona.jpg'
    },
    {
        name: '$100 gift card',
        price: 20000,
        left: '1/1',
        img: 'mk-100.jpg'
    },
    {
        name: 'Pumpkin Spice Latte',
        price: 1500,
        left: '3/3',
        img: 'mk-starbucks.jpg'
    },
]

const marketplaceDiv = document.querySelector('.market-sec');
marketplaceDiv.innerHTML = '';
marketplace.forEach((item) => {
    marketplaceDiv.innerHTML += `
            <div class="card market-item">
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
