import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAGcg43F94bWqUuyLH-AjghrAfduEVQ8ZM",
  authDomain: "overunder-ths.firebaseapp.com",
  projectId: "overunder-ths",
  storageBucket: "overunder-ths.firebasestorage.app",
  messagingSenderId: "690530120785",
  appId: "1:690530120785:web:36dc297cb517ac76cb7470",
  measurementId: "G-Q30T39R8VY"
};

// Retrieve user data from localStorage or set default values
const userData = JSON.parse(localStorage.getItem('userData') || '{}');
const balanceAdder = parseFloat(localStorage.getItem('balanceAdder') || '0');
const userBets = JSON.parse(localStorage.getItem('userBets') || '[]');

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore(app);

const ordersDiv = document.getElementById('orders');
ordersDiv.innerHTML = ``;


const ordersRef = collection(db, 'orders');
const querySnapshot = await getDocs(ordersRef);

let showAll = false;
const viewAllButton = document.createElement('button');
viewAllButton.textContent = 'View All';
viewAllButton.addEventListener('click', () => {
    showAll = !showAll;
    renderOrders();
    viewAllButton.textContent = showAll ? 'View Less' : 'View All';
});
ordersDiv.appendChild(viewAllButton);

function renderOrders() {
    ordersDiv.innerHTML = '';
    let count = 0;
    querySnapshot.forEach((doc) => {
        if (!showAll && count >= 3) return;
        const data = doc.data();
        ordersDiv.innerHTML += `
            <div class="order fl-c">
                <span class="order-name">${data.acc}</span>
                <div class="sepa"></div>
                <div class="fl-c">
                    <div>
                        <span>Item name: </span><span class="order-item">${data.item}</span>
                    </div>
                    <div>
                        <span>Item description: </span><span class="order-disc">${data.disciption}</span>
                    </div>
                </div>
            </div>
        `;
        count++;
    });
    ordersDiv.appendChild(viewAllButton);
}

renderOrders();