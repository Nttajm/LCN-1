import { creditScore } from "./gameStat.js";

function setProgress(percent) {
    const circle = document.querySelector('.progress-container .circle');
    const radius = 15.9155;
    const circumference = Math.PI * radius; // Circumference of the semi-circle
    const offset = circumference - (percent / 100 * circumference);

    circle.style.strokeDasharray = `${circumference}, ${circumference}`;
    circle.style.strokeDashoffset = offset;
    
    const creditScore = (percent * 0.01 * 850).toFixed();


    document.querySelector('.percentage').textContent = `${creditScore}`; // Display the percentage

}

const creditText = document.querySelectorAll('#creditDefiner');

creditText.forEach(text => {
    text.textContent = `wth`;
});
// Example usage:
setProgress(creditScore); // Set progress to 75%