let openSite = `November 18, 2024 9:20:01 AM`; 

let targetDate = new Date(openSite);
let currentUrl = window.location.href;

if (new Date() >= targetDate) {
    window.location.href = '../overunderths.html';
} else if (!currentUrl.includes('allmost.html')) {
    window.location.href = 'https://lcnjoel.com/ouths/allmost.html';
}

const timeLeftelem = document.getElementById('timeLeft');
function updateTimeLeft() {
    let currentTime = new Date();
    let timeLeft = targetDate - currentTime;

    if (timeLeft > 0) {
        let hours = Math.floor(timeLeft / (1000 * 60 * 60));
        let minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        timeLeftelem.innerHTML = `${hours}h ${minutes}m ${seconds}s`;
    } else {
        timeLeftelem.innerHTML = `refresh`;
        clearInterval(intervalId);
    }
}

let intervalId = setInterval(updateTimeLeft, 1000);
updateTimeLeft(); // Initial call to display the time left immediately