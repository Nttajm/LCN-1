function generateRandomNumber() {
    return Math.floor(Math.random() * 9000) + 1000;
}

// Update the HTML element with the generated number
document.getElementById('randomNumber4digit').textContent = generateRandomNumber()