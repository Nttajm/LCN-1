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
giveBtn.addEventListener("click", async () => {
  const amount = selectedAmount || parseFloat(customInput.value);
  const isRecurring = recurringBtn.classList.contains("active");

  if (!amount || amount <= 0) {
    alert("Please select or enter a valid donation amount.");
    return;
  }

  try {
    const res = await fetch("https://backend2-b76r.onrender.com/create-donation-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        recurring: isRecurring
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create donation session");
    }

    const { url } = await res.json();
    window.location = url;

  } catch (err) {
    console.error("Donation checkout error:", err.message);
    alert("Something went wrong. Please try again.");
  }
});

