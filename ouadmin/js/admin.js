import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
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
const ordersQuery = query(ordersRef, orderBy('date', 'desc'));
const querySnapshot = await getDocs(ordersQuery);

let showAll = false;
const viewAllButton = document.createElement('button');
viewAllButton.textContent = 'View All';
viewAllButton.addEventListener('click', () => {
        showAll = !showAll;
        renderOrders();
        viewAllButton.textContent = showAll ? 'View Less' : 'View All';
});
ordersDiv.appendChild(viewAllButton);

async function renderOrders() {
    ordersDiv.innerHTML = '';
    let count = 0;

    // Loop through the orders
    for (const docI of querySnapshot.docs) {
        if (!showAll && count >= 3) break;

        const data = docI.data();
        const orderId = docI.id;
        const uid = data.userId;

        try {
            // Fetch user data
            const userDoc = await getDoc(doc(db, 'users', uid));
            const username = userDoc.exists() ? userDoc.data().username : 'Unknown User';

            // Create order display
            const orderDiv = document.createElement('div');
            orderDiv.classList.add('order', 'fl-c');

            orderDiv.innerHTML = `
                <span class="order-name">${username}</span>
                <div class="sepa"></div>
                <div class="fl-c">
                    <div>
                        <span>Item name: </span><span class="order-item">${data.item}</span>
                    </div>
                    <div>
                        <span>Item description: </span><span class="order-disc">${data.disciption}</span>
                    </div>
                    <div>
                        <span>Item accepted status: </span><span class="order-disc">${data.orderStatus}</span>
                    </div>
                    <div>
                        <span>Order date: </span><span class="order-date">${data.date}</span>
                    </div>
                </div>
            `;

            // Add Accept and Decline buttons
            const acceptButton = document.createElement('button');
            acceptButton.textContent = 'Accept';
            acceptButton.addEventListener('click', async () => {
                await setDoc(doc(db, 'orders', orderId), { orderStatus: 'accepted' }, { merge: true });
                alert('Order accepted');
                renderOrders(); // Refresh orders after update
            });

            const declineButton = document.createElement('button');
            declineButton.textContent = 'Decline';
            declineButton.addEventListener('click', async () => {
                await setDoc(doc(db, 'orders', orderId), { orderStatus: 'declined' }, { merge: true });
                alert('Order declined');
                renderOrders(); // Refresh orders after update
            });

            // Add buttons to the orderDiv
            const buttonContainer = document.createElement('div');
            buttonContainer.appendChild(acceptButton);
            buttonContainer.appendChild(declineButton);
            orderDiv.appendChild(buttonContainer);

            ordersDiv.appendChild(orderDiv);
            count++;
        } catch (error) {
            console.error('Error fetching user document:', error);
        }
    }

    ordersDiv.appendChild(viewAllButton);
}


renderOrders();
