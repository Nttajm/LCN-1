import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    getDocs,
    collection,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore references
const stocksRef = collection(db, 'stocks', 'DWqS1ePzNP7QhulUdyxl', 'stocks');

async function renderStocks() {
    const querySnapshot = await getDocs(stocksRef);
    const stocksContainer = document.querySelector('.stocks');
    if (!stocksContainer) return;

    // Clear current DOM
    stocksContainer.innerHTML = '';

    querySnapshot.forEach((doc) => {
        const stock = doc.data();
        const stockElement = document.createElement('div');
        stockElement.classList.add('stock', 'multi-tag-2');
        stockElement.setAttribute('data-id', doc.id);

        stockElement.innerHTML = `
            <span class="stock-name">${stock.name}</span>
            <div class="sepa"></div>
            <div class="fl-c">
                <div>
                    <span>Price: </span><span class="stock-price">$${stock.price}</span>
                </div>
                <div class="numbers">${(stock.data || []).join(', ')}</div>
                <div class="buttons">
                    <input type="number" class="input-number" placeholder="Add number">
                    <button class="add-btn">Add Number</button>
                    <button class="update-btn">Update Stocks</button>
                    <button class="remove-btn">Remove Last</button>
                </div>
            </div>
        `;
        stocksContainer.appendChild(stockElement);
    });

    attachEventListeners();
}

// Attach event listeners
function attachEventListeners() {
    document.querySelectorAll('.add-btn').forEach((button) => {
        button.addEventListener('click', async (e) => {
            const stockId = e.target.closest('.stock').getAttribute('data-id');
            const stockElement = e.target.closest('.stock');
            const input = stockElement.querySelector('.input-number');
            const numberToAdd = parseFloat(input.value);

            if (isNaN(numberToAdd)) {
                alert('Please enter a valid number.');
                return;
            }

            await addNumber(stockId, numberToAdd);
            input.value = ''; // Clear input
        });
    });

    document.querySelectorAll('.remove-btn').forEach((button) => {
        button.addEventListener('click', async (e) => {
            const stockId = e.target.closest('.stock').getAttribute('data-id');
            await removeLastNumber(stockId);
        });
    });

    // Add event listener for the "Update Stocks" button
    document.querySelectorAll('.update-btn').forEach((button) => {
        button.addEventListener('click', async (e) => {
            const stockId = e.target.closest('.stock').getAttribute('data-id');
            await updateStockDisplay(stockId);
        });
    });

    document.querySelectorAll('.input-number').forEach((input) => {
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const stockElement = input.closest('.stock');
                const stockId = stockElement.getAttribute('data-id');
                const numberToAdd = parseFloat(input.value);

                if (isNaN(numberToAdd)) {
                    alert('Please enter a valid number.');
                    return;
                }

                await addNumber(stockId, numberToAdd);
                input.value = ''; // Clear input
            }
        });
    });
}

// Add a number to a stock's data array
async function addNumber(stockId, numberToAdd) {
    const stockRef = doc(stocksRef, stockId);

    try {
        // Fetch current data
        const stockDoc = await getDoc(stockRef);
        const stockData = stockDoc.exists() ? stockDoc.data() : {};
        const currentData = stockData.data || [];

        // Add the new number, allowing duplicates
        const updatedData = [...currentData, numberToAdd];

        // Update Firestore
        await updateDoc(stockRef, { data: updatedData });

        // Update DOM
        await updateStockDisplay(stockId);
        console.log("Added number:", numberToAdd, "to stock:", stockId);
    } catch (error) {
        console.error("Error adding number:", error);
    }
}


// Remove the last number from a stock's data array
async function removeLastNumber(stockId) {
    const stockRef = doc(stocksRef, stockId);
    const stockDoc = await getDoc(stockRef);

    if (!stockDoc.exists()) return;

    const stockData = stockDoc.data();
    const updatedData = (stockData.data || []).slice(0, -1);

    await updateDoc(stockRef, { data: updatedData });

    // Update DOM immediately
    const stockElement = document.querySelector(`.stock[data-id="${stockId}"]`);
    const numbersElement = stockElement.querySelector('.numbers');
    numbersElement.textContent = updatedData.join(', ');
}

// Update stock display
async function updateStockDisplay(stockId) {
    const stockRef = doc(stocksRef, stockId);
    const stockDoc = await getDoc(stockRef);

    if (!stockDoc.exists()) return;

    const stockData = stockDoc.data();
    const stockElement = document.querySelector(`.stock[data-id="${stockId}"]`);
    const numbersElement = stockElement.querySelector('.numbers');
    numbersElement.textContent = (stockData.data || []).join(', ');
}

// Fetch stocks data for debugging and export
async function getStocksData() {
    try {
        const querySnapshot = await getDocs(stocksRef);
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            data: (doc.data().data || []).slice(-17), // Get the latest 7 items
        }));
    } catch (error) {
        console.error("Error fetching stocks --getstocks:", error);
        return [];
    }
}

// Export stocks data
export const mstock = await getStocksData();

// Fetch and display stocks on load
window.onload = renderStocks;
renderStocks();
