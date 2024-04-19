const codes = ['gwqznc--'];

// '12--p939w--i1%&*', '88--we3919w--mkz'

function renderCodes() {
    // Clear the content of the container
    const createBox = document.querySelector('.js-codes');
    createBox.innerHTML = '';

    // Render each code
    for (let i = 0; i < codes.length; i++) {
        const eachCode = codes[i];
        createCrad(eachCode);
        // Create code element
    }

    function createCrad(code) {
        const cardSec = document.createElement('div');
        cardSec.classList.add('card-sec');
        cardSec.classList.add('hoverI');

        const card = document.createElement('div');
        card.classList.add('card');

        const myCodeLogo = document.createElement('div');
        myCodeLogo.classList.add('my-code-logo');
        myCodeLogo.innerHTML = `<span>Mycode_</span><span class="code"></span>`;

        const cInfo = document.createElement('div');
        cInfo.classList.add('c-info');

        const codeElement = document.createElement('div');
        codeElement.classList.add('code');
        codeElement.textContent = code;

        const cExpire = document.createElement('div');
        cExpire.classList.add('c-expire');
        cExpire.innerHTML = `<span>EXPIRES</span><span class="expire">NEVER</span>`;

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

function createCode(min, max, date) {
    if (codes.length < 4) {
        const randomLetters = generateRandomLetters(min, max);
        var expDate = exipery(date)

        function generateRandomLetters(minLength, maxLength) {
            const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
            let result = '';
        
            for (let i = 0; i < length; i++) {
                const ascii = Math.floor(Math.random() * 26) + 97; // Generates a random ASCII code for lowercase letters (97-122)
                const letter = String.fromCharCode(ascii); // Converts ASCII code to letter
                result += letter;
            }
        
            return result;
        }

        const encryptedShift = randomNumber19(21);
        const encryptedShiftnull = randomNumber19(3);
        
        const encrypted = encryptedText('myc', encryptedShift, 'show');
        const encrypted2 = encryptedText('x', encryptedShiftnull);
        const encrypted3 = encryptedText('j', encryptedShift);
        const encrypted4 = encryptedText('h', encryptedShiftnull);
        const encrypted5 = encryptedText('m', encryptedShift);



        const code = randomLetters + '--' + encrypted + encrypted2 + encrypted3 + encrypted4 + encrypted5;
        codes.push(code);
        renderCodes();
    }
}

function exipery(dayesAfter) {
    const currentDate = new Date();
    const twoDaysAfterDate = new Date(currentDate);

    twoDaysAfterDate.setDate(twoDaysAfterDate.getDate() + dayesAfter);
    const formattedDate = `${String(twoDaysAfterDate.getMonth() + 1).padStart(2, '0')}/${String(twoDaysAfterDate.getDate()).padStart(2, '0')}/${String(twoDaysAfterDate.getFullYear()).slice(-2)}`;
    
    return formattedDate;
}

function randomNumber19(span) {
    const randomNumber = Math.floor(Math.random() * span);
    const randomNumberInRange = randomNumber + 1;
    return randomNumberInRange;
  }

function encryptedText (text, shift, show) {

    const show = show || '

    let encryptedCode = ``;

    if (show === 'show') {
        encryptedCode += shift;
    }

    for (let i = 0; i < text.length; i++) {
        let charCode = text.charCodeAt(i);
        if (charCode >= 65 && charCode <= 90) { // Uppercase letters
            encryptedCode += String.fromCharCode((charCode - 65 + shift) % 26 + 65);
        } else if (charCode >= 97 && charCode <= 122) { // Lowercase letters
            encryptedCode += String.fromCharCode((charCode - 97 + shift) % 26 + 97);
        } else { // Non-alphabetic characters remain unchanged
            encryptedCode += text.charAt(i);
        }
    }
    return encryptedCode;
}

console.log(exipery(3))

// Example usage:



/*

make the shift random also

const randomLettersExp = generateRandomLetters(5, 10);
console.log(randomLettersExp);
// Example usage
const originalText = "EXP--";
const shift = 7; // Caesar cipher shift
const encryptedCode = generateRandomEncryptedCode(originalText, shift);
console.log("Original text:", originalText);
console.log("Encrypted code:", encryptedCode);
*/