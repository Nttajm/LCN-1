const codes = ['12--p939w--i1%&*', '88--we3919w--mkz'];

function renderCodes() {
    // Clear the content of the container
    const createBox = document.querySelector('.js-codes');
    createBox.innerHTML = '';

    // Render each code
    for (let i = 0; i < codes.length; i++) {
        const eachCode = codes[i];

        // Create code element
        const cardSec = document.createElement('div');
        cardSec.classList.add('card-sec');

        const card = document.createElement('div');
        card.classList.add('card');

        const myCodeLogo = document.createElement('div');
        myCodeLogo.classList.add('my-code-logo');
        myCodeLogo.innerHTML = '<span>Mycode_</span>';

        const cInfo = document.createElement('div');
        cInfo.classList.add('c-info');

        const codeElement = document.createElement('div');
        codeElement.classList.add('code');
        codeElement.textContent = eachCode;

        const cExpire = document.createElement('div');
        cExpire.classList.add('c-expire');
        cExpire.innerHTML = '<span>EXPIRES</span><span class="expire">TODAY, 3:45pm</span>';

        // Append elements to card
        cInfo.appendChild(codeElement);
        cInfo.appendChild(cExpire);

        card.appendChild(myCodeLogo);
        card.appendChild(cInfo);

        // Append card to cardSec
        cardSec.appendChild(card);

        // Create blob-cor and blob elements
        const blobCor = document.createElement('div');
        blobCor.classList.add('blob-cor');

        const blob1 = document.createElement('div');
        blob1.classList.add('blob');
        blob1.id = 't1';

        const blob2 = document.createElement('div');
        blob2.classList.add('blob');
        blob2.id = 't2';

        // Append blobs to blob-cor
        blobCor.appendChild(blob1);
        blobCor.appendChild(blob2);

        // Append blob-cor to cardSec
        cardSec.appendChild(blobCor);

        // Append cardSec to .create-box
        createBox.appendChild(cardSec);
    }
}

renderCodes();

function createCode() {
    if (codes.length < 4) {
        codes.push('hi');
        renderCodes();
    }
}
