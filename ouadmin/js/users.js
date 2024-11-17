import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

// Get the select element and users container
const filterSelect = document.getElementById('filter');
const usersDiv = document.querySelector('.users-cont');

// Fetch users from Firestore
async function fetchUsers() {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    querySnapshot.forEach((docI) => {
        users.push(docI.data());
    });
    return users;
}

// Render users to the DOM
function renderUsers(users) {
    usersDiv.innerHTML = ''; // Clear current users

    users.forEach((data) => {
        const userDiv = document.createElement('div');
        userDiv.classList.add('user');
        userDiv.dataset.uid = data.uid;

        userDiv.innerHTML = `
            <span class="user-name">${data.username}</span> - <span class="user-realname">${data.name}</span>
            <button class="toggle-edit">Toggle Edit</button>
            <div class="sepa"></div>
            <div class="info" style="display: none;">
                <div class="info-hold">
                    <span>Username : </span>
                    <input type="text" class="config-1" placeholder="${data.username}">
                    <button class="change-username">Change</button>
                </div>
                <div class="info-hold">
                    <span>Balance Adder : </span>
                    <input type="text" class="config-1" placeholder="${data.balanceAdder || ''}">
                    <button class="change-balance">Change</button>
                </div>
                <div class="info-hold">
                    <span>Email : </span>
                    <span>${data.email}</span>
                </div>
            </div>
        `;

        usersDiv.appendChild(userDiv);

        // Toggle button for showing/hiding edit info
        const toggleEditButton = userDiv.querySelector('.toggle-edit');
        const infoDiv = userDiv.querySelector('.info');
        toggleEditButton.addEventListener('click', () => {
            infoDiv.style.display = infoDiv.style.display === 'none' ? 'block' : 'none';
        });

        // Change username functionality
        const changeUsernameButton = userDiv.querySelector('.change-username');
        const usernameInputField = userDiv.querySelector('.info-hold input');

        changeUsernameButton.addEventListener('click', async () => {
            const newUsername = usernameInputField.value;
            if (newUsername) {
                const userDocRef = doc(db, 'users', data.uid);
                await setDoc(userDocRef, { username: newUsername }, { merge: true });
                userDiv.querySelector('.user-name').textContent = newUsername;
            }
        });

        // Change balance functionality
        const changeBalanceButton = userDiv.querySelector('.change-balance');
        const balanceInputField = userDiv.querySelector('.info-hold:nth-child(2) input');

        changeBalanceButton.addEventListener('click', async () => {
            const newBalance = parseFloat(balanceInputField.value);
            if (!isNaN(newBalance)) {
                const userDocRef = doc(db, 'users', data.uid);
                await setDoc(userDocRef, { balanceAdder: newBalance }, { merge: true });
                userDiv.querySelector('.user-realname').textContent = newBalance;
            }
        });
    });
}
const searchInput = document.getElementById('searchInput');

// Function to filter users by search term and render them
function filterAndRenderUsers(users) {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredUsers = users.filter((user) => {
        const username = user.username ? user.username.toLowerCase() : "";
        return username.includes(searchTerm);
    });
    renderUsers(filteredUsers); // Render only filtered users
}

// Modified applyFilter function to include search
async function applyFilter() {
    let users = await fetchUsers(); // Fetch users data

    // Sort users based on the filter
    const filterValue = filterSelect.value;
    if (filterValue === 'ABC') {
        users.sort((a, b) => {
            const nameA = a.username || "";
            const nameB = b.username || "";
            return nameA.localeCompare(nameB);
        });
    } else if (filterValue === 'Balance') {
        users.sort((a, b) => (b.balanceAdder || 0) - (a.balanceAdder || 0));
    }

    filterAndRenderUsers(users); // Render users based on search
}

// Listen for filter select changes and search input changes
filterSelect.addEventListener('change', applyFilter);
searchInput.addEventListener('input', applyFilter); // Reapply filter on search input change

// Initial load of users
applyFilter();