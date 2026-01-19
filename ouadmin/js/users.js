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

// Get a reference to filter select and users container
const filterSelect = document.getElementById('filter');
const usersDiv = document.querySelector('.users-cont');
const searchInput = document.getElementById('searchInput');

// Fetch users from Firestore
async function fetchUsers() {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    querySnapshot.forEach((docI) => {
        users.push({ uid: docI.id, ...docI.data() });
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

        // Set initial button text based on ban status
        const fbBanStatus = data.FBban ? 'Unban' : 'Ban';
        const localBanStatus = data.ban ? 'Unban local' : 'Ban local';

        userDiv.innerHTML = `
            <span class="user-name">${data.username}</span> - <span class="user-realname">${data.name}</span>
            <button class="toggle-edit">Toggle Edit</button>
            <button class="toggle-FBban">${fbBanStatus}</button>
            <button class="toggle-localBan">${localBanStatus}</button>
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
                    <span>Leader Style : </span>
                    <input type="text" class="config-1" placeholder="${data.leaderStyle || ''}">
                    <button class="change-leaderStyle">Change</button>
                </div>
                <div class="info-hold">
                    <span>Email : </span>
                    <span>${data.email}</span>
                </div>
                <div class="info-hold antic-data">
                    <!-- AntiC document data will be displayed here -->
                </div>
            </div>
        `;

        usersDiv.appendChild(userDiv);

        // Toggle edit info with antiC data fetching
        const toggleEditButton = userDiv.querySelector('.toggle-edit');
        const infoDiv = userDiv.querySelector('.info');
        const antiCHold = userDiv.querySelector('.antic-data');

        toggleEditButton.addEventListener('click', async () => {
            infoDiv.style.display = infoDiv.style.display === 'none' ? 'block' : 'none';
            if (infoDiv.style.display === 'block') {
                const antiCRef = collection(db, 'users', data.uid, 'antiC');
                const antiCDocs = await getDocs(antiCRef);

                // Clear previous antiC data
                antiCHold.innerHTML = `<p>AntiC Documents Count: ${antiCDocs.size}</p>`;
            }
        });

        // Toggle FBban
        const toggleFBbanButton = userDiv.querySelector('.toggle-FBban');
        toggleFBbanButton.addEventListener('click', async () => {
            const newFBbanStatus = !data.FBban;
            const userDocRef = doc(db, 'users', data.uid);
            await setDoc(userDocRef, { FBban: newFBbanStatus }, { merge: true });
            toggleFBbanButton.textContent = newFBbanStatus ? 'Unban' : 'Ban';
        });

        // Toggle local ban
        const toggleLocalBanButton = userDiv.querySelector('.toggle-localBan');
        toggleLocalBanButton.addEventListener('click', async () => {
            const newLocalBanStatus = !data.ban;
            const userDocRef = doc(db, 'users', data.uid);
            await setDoc(userDocRef, { ban: newLocalBanStatus }, { merge: true });
            toggleLocalBanButton.textContent = newLocalBanStatus ? 'Unban local' : 'Ban local';
        });

        // Change username
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

        // Change balance
        const changeBalanceButton = userDiv.querySelector('.change-balance');
        const balanceInputField = userDiv.querySelector('.info-hold:nth-child(2) input');

        changeBalanceButton.addEventListener('click', async () => {
            const newBalance = parseFloat(balanceInputField.value);
            if (!isNaN(newBalance)) {
                const userDocRef = doc(db, 'users', data.uid);
                await setDoc(userDocRef, { balanceAdder: newBalance }, { merge: true });
                balanceInputField.placeholder = newBalance;
            }
        });

        // Change leader style
        const changeLeaderStyleButton = userDiv.querySelector('.change-leaderStyle');
        const leaderStyleInputField = userDiv.querySelector('.info-hold:nth-child(3) input');

        changeLeaderStyleButton.addEventListener('click', async () => {
            const newLeaderStyle = leaderStyleInputField.value;
            if (newLeaderStyle) {
                const userDocRef = doc(db, 'users', data.uid);
                await setDoc(userDocRef, { leaderStyle: newLeaderStyle }, { merge: true });
                leaderStyleInputField.placeholder = newLeaderStyle;
            }
        });
    });
}

// Function to filter users by search term and render them
function filterAndRenderUsers(users) {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredUsers = users.filter((user) => {
        const username = user.username ? user.username.toLowerCase() : "";
        const realname = user.name ? user.name.toLowerCase() : "";
        const email = user.email ? user.email.toLowerCase() : "";
        return username.includes(searchTerm) || realname.includes(searchTerm) || email.includes(searchTerm);
    });
    renderUsers(filteredUsers);
}

// Apply filter and load users
async function applyFilter() {
    let users = await fetchUsers();
    const filterValue = filterSelect.value;

    if (filterValue === 'ABC') {
        users.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
    } else if (filterValue === 'Balance') {
        users.sort((a, b) => (b.balanceAdder || 0) - (a.balanceAdder || 0));
    }
    filterAndRenderUsers(users);
}

// Listen for filter and search changes
filterSelect.addEventListener('change', applyFilter);
searchInput.addEventListener('input', applyFilter);

// Initial load of users
applyFilter();
