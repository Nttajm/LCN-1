const airtel = document.getElementById('js-reval-credit');
const amountBtns = airtel.querySelectorAll('.dontype.js-sel');
const customInput = airtel.querySelector('.custom input');
const recurringBtn = airtel.querySelector('.reaccuring-btn');
const giveBtn = airtel.querySelector('.give-btn button');

let selectedAmount = null;
let isRecurring = false;

// Handle amount button selection
amountBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    amountBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedAmount = parseFloat(btn.dataset.amount);
    customInput.value = '';
  });
});

// Custom input focus clears selected buttons
customInput.addEventListener('focus', () => {
  amountBtns.forEach(b => b.classList.remove('active'));
  selectedAmount = null;
});

// Recurring toggle
recurringBtn.addEventListener('click', () => {
  recurringBtn.classList.toggle('active');
  isRecurring = recurringBtn.classList.contains('active');
});

// Return final object
giveBtn.addEventListener('click', () => {
  const amount = selectedAmount || parseFloat(customInput.value) || 0;
  const result = {
    amount: amount,
    recurring: isRecurring
  };
  console.log(result);
});


