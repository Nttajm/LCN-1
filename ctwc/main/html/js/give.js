import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { toggleClass } from "./service.js";
import { retriggerShuffleOnShow } from "./shuffle.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkPsE0uD-1_V5_QfM-RhtaIviQlINW2DA",
  authDomain: "lcntests.firebaseapp.com",
  projectId: "lcntests",
  storageBucket: "jmblanks.appspot.com",
  messagingSenderId: "665856876392",
  appId: "1:665856876392:web:c6274b52a9e90c3d6400dd"
}; 


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

