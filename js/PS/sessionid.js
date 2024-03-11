// Check if the random number is already stored in local storage
 const storedNumber = localStorage.getItem('randomNumber');

export const sessionId = storedNumber;

if (storedNumber) {
  // If the number is stored, display it
  document.getElementById('randomNumber').textContent = storedNumber;
} else {
  // If the number is not stored, generate a new one, save it, and display it
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  localStorage.setItem('randomNumber', randomNumber);
  document.getElementById('randomNumber').textContent = randomNumber;
}



console.log('203.pass')

function check() {
  document.getElementById('sessionid').textContent = '200.pass';
  console.log(value + 1);
}


const altSpecific2 = document.getElementById('js-get-sessionid');
altSpecific2.textContent = 'pass.200';
altSpecific2.classList.add('stat');