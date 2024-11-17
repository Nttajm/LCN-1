import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
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

        // Reference to the stocks collection (sub-collection under DWqS1ePzNP7QhulUdyxl)
        const stocksDocRef = doc(db, 'stocks', 'DWqS1ePzNP7QhulUdyxl');
        const stocksSubCollectionRef = collection(stocksDocRef, 'stocks');

        async function renderStocks() {
            const querySnapshot = await getDocs(stocksSubCollectionRef);
            const stocksContainer = document.querySelector('.stocks');
            stocksContainer.innerHTML = ''; // Clear existing stock data

            querySnapshot.forEach((doc) => {
                const stock = doc.data();
                const stockElement = document.createElement('div');
                stockElement.classList.add('stock', 'multi-tag-2');
                stockElement.setAttribute('data-id', doc.id);  // Add stock document ID as a custom attribute
                stockElement.innerHTML = `
                    <span class="stock-name">${stock.name}</span>
                    <div class="sepa"></div>
                    <div class="fl-c">
                        <div>
                            <span>Price: </span><span class="stock-price">$${stock.price}</span>
                        </div>
                        <div class="numbers">${stock.data.join(', ')}</div>
                        <div class="buttons">
                            <input type="number" class="input-number" placeholder="Add number">
                            <button class="add-btn">Add Number</button>
                            <button class="remove-btn">Remove</button>
                        </div>
                    </div>
                `;
                stocksContainer.appendChild(stockElement);
            });

            // Attach event listeners after rendering the stocks
            document.querySelectorAll('.add-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const stockId = e.target.closest('.stock').getAttribute('data-id');
                    addNumber(stockId);
                });
            });

            document.querySelectorAll('.remove-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const stockId = e.target.closest('.stock').getAttribute('data-id');
                    removeStock(stockId);
                });
            });
        }

        // Add a number to a stock's data array
        async function addNumber(stockId) {
            const stockElement = document.querySelector(`.stock[data-id="${stockId}"]`);
            const stockInput = stockElement.querySelector('.input-number');
            const numberToAdd = parseFloat(stockInput.value);
            if (isNaN(numberToAdd)) return; // Ignore if the input is not a valid number

            const stockRef = doc(stocksSubCollectionRef, stockId);
            await updateDoc(stockRef, {
                data: arrayUnion(numberToAdd) // Adds the number to the stock's 'data' array
            });
            renderStocks(); // Re-render to reflect the new data
        }

        // Remove a stock from the database
        async function removeStock(stockId) {
            const stockRef = doc(stocksSubCollectionRef, stockId);
        
            // Fetch the current stock data
            const stockDoc = await getDoc(stockRef);
            const stockData = stockDoc.data();
        
            if (stockData && stockData.data.length > 0) {
                // Remove the last number from the stock's data array
                const updatedData = stockData.data.slice(0, -1);  // Remove the last element
        
                // Update the stock's data array in Firestore
                await updateDoc(stockRef, {
                    data: updatedData
                });
        
                // Re-render the stocks to reflect the updated data
                renderStocks();
            }
        }

        // Fetch and display stocks when the page loads
        window.onload = renderStocks;


        async function getStocksData() {
            const stocksRef = collection(db, 'stocks', 'DWqS1ePzNP7QhulUdyxl', 'stocks');
            const querySnapshot = await getDocs(stocksRef);
        
            // Map the fetched documents into a simplified array format
            const stocksArray = querySnapshot.docs.map(doc => {
                const stock = doc.data();
                return {
                    id: doc.id,
                    sub: stock.sub,
                    name: stock.name,
                    basedOn: stock.basedOn,
                    data: (stock.data || []).slice(-13) // Ensure data field exists, if not, return empty array and get the latest 13 items
                };
            });
        
            return stocksArray;
        }

        console.log(await getStocksData());

        export const mstock = await getStocksData();