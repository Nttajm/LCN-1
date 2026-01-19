// Function to encrypt a number string
function encryptNumbers(input, shift) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let encrypted = '';

    for (let i = 0; i < input.length; i++) {
        let num = parseInt(input[i]);

        if (num >= 1 && num <= 9) {
            // Encrypt the number using a Caesar cipher approach
            let encryptedChar = alphabet[(num + shift - 1) % 26];
            encrypted += encryptedChar;
        } else {
            encrypted += input[i]; // Keep non-number characters unchanged
        }
    }
    
    // Reverse the encrypted string
    return encrypted.split('').reverse().join('');
}

// Function to decrypt a number string
function decryptNumbers(encrypted, shift) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    // Reverse the string to undo the original reversal
    let reversed = encrypted.split('').reverse().join('');

    let decrypted = '';

    for (let i = 0; i < reversed.length; i++) {
        let char = reversed[i];
        let index = alphabet.indexOf(char);
        
        if (index !== -1) {
            // Decrypt the character using a Caesar cipher approach
            let num = (index - shift + 26) % 26 + 1;
            decrypted += num.toString();
        } else {
            decrypted += char; // Keep non-alphabet characters unchanged
        }
    }

    return decrypted;
}

// Example usage:
let shift = 5; // Change this number to apply a different shift
let input = "123456789"; // Your input numbers

let encryptedAndReversed = encryptNumbers(input, shift);
console.log("Encrypted:", encryptedAndReversed);

let decrypted = decryptNumbers(encryptedAndReversed, shift);
console.log("Decrypted:", decrypted);
