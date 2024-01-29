// Check if the random number is already stored in local storage
const storedNumber = localStorage.getItem('randomNumber');

if (storedNumber) {
  // If the number is stored, display it
  document.getElementById('randomNumber').textContent = storedNumber;
} else {
  // If the number is not stored, generate a new one, save it, and display it
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  localStorage.setItem('randomNumber', randomNumber);
  document.getElementById('randomNumber').textContent = randomNumber;
}