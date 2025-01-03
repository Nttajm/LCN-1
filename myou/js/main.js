// Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc,getDocs, addDoc, collection, getCountFromServer, query, serverTimestamp, where  } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

const loginBtn = document.querySelector('.googleButton');
let lastId = null;
const logoutBtn = document.querySelector('#logout');

let currentId = null;
let currentDocId = null;

if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Reference user's Firestore document
      const userRef = doc(db, 'myou', 'data', 'users', user.uid);
      const docSnap = await getDoc(userRef);

      // If the user doesn't exist, create a new Firestore document
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          createdAt: serverTimestamp(),
          displayName: user.displayName,
        });
        console.log("New user created in Firestore");
      }

      // Set login state in localStorage
      localStorage.setItem('hasLoggedIn', true);

      // Reload the page or update UI accordingly
      window.location.reload();
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  });
}

logoutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
    localStorage.setItem('hasLoggedIn', false);
    window.location.reload();
  } catch (error) {
    console.error("Error signing out:", error);
  }
});


const authDiv = document.querySelector('#google-auth-div');
const logState = localStorage.getItem('hasLoggedIn') === "true";
if (logState) {
    authDiv.classList.add('dn');
} else {
    authDiv.classList.remove('dn');
}






onAuthStateChanged(auth, async (user) => {


    async function renderCategories() {

        if (!user) return;
    
        const loadingSpinner = document.querySelector('.ls1');
        const catsection = document.querySelector('#categories');
    
        try {
            loadingSpinner.style.display = 'flex';
    
            const profileName = document.querySelector('.username');
            const profileName2 = document.querySelector('#username2');

            const profileImage = document.querySelector('#google-auth-pfp');
            profileName.textContent = user.displayName.split(' ')[0];
            profileName2.textContent = user.displayName.split(' ')[0];
            profileImage.src = user.photoURL;
    
            const userUid = user.uid;
            const userRef = doc(db, 'myou', 'data', 'users', userUid);
            const docSnap = await getDoc(userRef);
    
            if (!docSnap.exists()) {
                console.log("No such document!");
                catsection.innerHTML = "<p>No user data found.</p>";
                return;
            }
    
            const userCategoriesRef = collection(db, 'myou', 'data', 'users', userUid, 'categories');
            const categoryDocs = await getDocs(userCategoriesRef);
    
            catsection.innerHTML = "";
    
            if (categoryDocs.empty) {
                catsection.innerHTML = `
                    <div class="category gray">
                        <span class="cat-name">You have no categories</span>
                        <span class="cat-members">Join or create a category to get started.</span>
                    </div>`;
                return;
            }
    
            
        const categories = [];
        for (const doc of categoryDocs.docs) {
            const catData = doc.data();
            const matchingCat = query(
                collection(db, 'myou', 'data', 'categories'),
                where('catid', '==', catData.catid)
            );
            const catDocSnapshots = await getDocs(matchingCat);

            for (const catDoc of catDocSnapshots.docs) {
                const catData = catDoc.data();
                // Get member count using Firestore count aggregation
                const membersRef = collection(db, 'myou', 'data', 'categories', catDoc.id, 'members');
                const memberCountSnap = await getCountFromServer(membersRef);
                const membersCount = memberCountSnap.data().count;

                catsection.innerHTML += `
                    <div class="category ${catData.theme}" data-catid="${catDoc.id}">
                        <span class="cat-name">${catData.name}</span>
                        <span class="cat-members">members: ${membersCount}</span>
                    </div>`;
            }
        }
        } catch (error) {
            console.error("Error loading categories:", error);
            catsection.innerHTML = "<p>Error loading categories. Please try again later.</p>";
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }
    

    await renderCategories();

    async function createCategory() {
        onAuthStateChanged(auth, async (user) => {
            const categoryInput = document.querySelector('#cat-name');
            const categoryName = categoryInput.value.trim();
            
            if (!categoryName) {
                alert("Please enter a category name.");
            }

            const systemSelect = document.querySelector('#system-selecters .freq.selected');
            if (!systemSelect) {
                alert("Please select a system.");
            }
    
            const catid = Math.random().toString(36).substring(2, 11);
    
            const theme = document.querySelector('.theme-selected').getAttribute('data-theme');
            const system = document.querySelector('#system-selecters .freq.selected').getAttribute('data-system');
    
            const userUid = user.uid;
    
            const userCategories = collection(db, 'myou', 'data', 'users', userUid, 'categories');
            const categories = collection(db, 'myou', 'data', 'categories');
            
            // Add the category under the user's categories
            await addDoc(userCategories, {
                name: categoryName,
                catid,
                joinedAt: serverTimestamp(),
            });
    
            // Add the category and retrieve the created category reference
            const newCategoryRef = await addDoc(categories, {
                name: categoryName,
                catid,
                theme,
                system,
                membersCount: 1, // Initial members count
                createdAt: serverTimestamp(),
                owner: userUid,
            });
    
            // Add the member to the 'members' sub-collection under the created category
            const categoryMembers = collection(newCategoryRef, 'members');
            await addDoc(categoryMembers, {
                catid,
                userUid,
                name: user.displayName,
                pfp: user.photoURL,
                joinedAt: serverTimestamp(),
                role: 'owner',
            });
    
            categoryInput.value = ""; 
    
            // Call renderCategories to update the UI
            await renderCategories();
            const allcats = document.querySelectorAll('.category');
            allcats.forEach(cat => {
                cat.addEventListener('click', () => {
                    const docid = cat.getAttribute('data-catid');
                    openCategory(docid);
                });
            });
        });

        const createDiv = document.querySelector('#catCreate');
        createDiv.classList.add('dn');
    }
    

    
    const createCatBtn = document.querySelector('#create-btn-cat');
    createCatBtn.addEventListener('click', createCategory);

    async function openCategory(docId) {
        const categoryRef = doc(db, 'myou', 'data', 'categories', docId);
        const categoryDoc = await getDoc(categoryRef);
        const category = categoryDoc.data();


        if (category.system === 'money') {
            document.querySelector('.balance').classList.add('money');
            document.querySelector('.balance').classList.remove('rankk');
        } else if (category.system === 'points') {
            document.querySelector('.balance').classList.add('rankk');
            document.querySelector('.balance').classList.remove('money');
        }

        

        CalculateBalance(docId);

        currentId = category;
        currentDocId = docId;

        const catid = category.catid;
    
        // Manage the category div state
        const catDiv = document.querySelector('.incat-div');
        catDiv.classList.remove('close-cat');
        catDiv.classList.add('open-cat');
    
        // Handle theme classes
        const banner = document.querySelector('.banner');
        const incatDiv = document.querySelector('.incat-div');
        const allMulitags = document.querySelectorAll('.multi-tag');
    
        // Clear previous theme classes
        clearThemeClasses([banner, incatDiv, ...allMulitags]);
    
        // Apply the new theme
        if (category.theme) {
            banner.classList.add(category.theme);
            incatDiv.classList.add(category.theme);
            allMulitags.forEach(tag => tag.classList.add(category.theme));
        }
    
        // Update the banner name
        const bannerName = document.querySelector('.js_catName');
        bannerName.textContent = category.name;

        const memebersDiv = document.querySelector('#members');
        const membersDiv2 = document.querySelector('.members-div');
        const memebrs = [];

        const membersRef = collection(db, 'myou', 'data', 'categories', docId, 'members');
        const membersDocs = await getDocs(membersRef);
        
        membersDiv2.innerHTML = "";
        memebersDiv.innerHTML = "";
        if (membersDocs.empty) {
            memebersDiv.innerHTML = "<p>No members found.</p>";
            return;
        }

        let count = 0;
        for (const doc of membersDocs.docs) {
            if (count >= 3) break;
            const memberData = doc.data();
            memebersDiv.innerHTML += `
                <img src="${memberData.pfp}" alt="profile picture" class="pfp">
            `;
            count++;
        }

        let count2 = 0;
        for (const doc of membersDocs.docs) {
            if (count2 >= 3) break;
            const memberData = doc.data();
            membersDiv2.innerHTML += `
                <div class="member">
            <span>
                ${memberData.name}
            </span>
            <img src="${memberData.pfp}" alt="" class="icon pfp">
            </div>
            `;
            count++;
        }
        
        await renderBets();
        
    }


    async function renderBets() {
        // if (currentDocId === lastId) {
        //     return;
        // }

        checkOwner();
        lastId = currentDocId;
        const betsDiv = document.querySelector('.sec');
        betsDiv.innerHTML = "";

        const loadingSpinner = document.querySelector('.ls2');


    
        try {
            loadingSpinner.style.display = 'flex';

            const betsRef = collection(db, 'myou', 'data', 'categories', currentDocId, 'bets');
            const betsQuery = query(betsRef, where('deleted', '==', false));
            const betsDocs = await getDocs(betsQuery);
    
            if (betsDocs.empty) {
                betsDiv.innerHTML = `
                    <div class="category-i mt-10 gray">
                        <span class="cat-name">No bets yet</span>
                        <span class="cat-members">
                            New bets will appear soon.
                        </span>
                    </div>
                `;
                return;
            }
    
            // Accumulate HTML
            let betsHTML = '';
            betsDocs.forEach((doc) => {
                const bet = doc.data();
                if (!bet.option) {
                    updateButtons(doc.id);
                }

                if (bet.deleted === true) {
                    return;
                }
                
                let fullDate = `${bet.date} ${bet.time}`;
                let dateHtml = formatDateTime(fullDate);

                let dateBool = isDatePassed(fullDate);
                if (isDatePassed(fullDate) && !bet.option) {
                    dateHtml = `<span class="red">Pending results...</span>`;
                }
                if (bet.hasCustomButtons === false) {
                    bet.btn1 = 'over';
                    bet.btn2 = 'under';
                }

                let titleHtml = ``
                 if (bet.betType === 'vs') {
                    titleHtml = `
                        <div class="game">
                                <div class="name">
                                    <span>${bet.team1}</span>
                                    <span class="span-vs">Vs</span>
                                    <span>${bet.team2}</span>
                                </div>
                            </div>
                            <div class="for">
                                <span>${bet.condition}</span>
                            </div>
                    `
                }

                if (bet.betType === 'title') {
                    titleHtml = `
                        <div class="game title-bet">
                                <div class="name">
                                    <span>${bet.title}</span>
                                </div>
                            </div>
                    `
                }

                let ButtonHtml = `
                <button class="over" data-betid="${doc.id}">${bet.btn1}</button>
                <button class="under" data-betid="${doc.id}">${bet.btn2}</button>
                `;

                if (bet.option) {
                    if (bet.option === 'btn1') {
                         ButtonHtml = `
                        <button class="over" data-betid="${doc.id}"> Was ${bet.btn1}</button>
                        <button class="under collapse" data-betid="${doc.id}">${bet.btn2}</button>
                        `;
                    } else if (bet.option === 'btn2') {
                            ButtonHtml = `
                            <button class="over collapse" data-betid="${doc.id}">${bet.btn1}</button>
                            <button class="under" data-betid="${doc.id}"> Was ${bet.btn2}</button>
                            `;
                        }
                }

                    betsHTML += `
                        <div class="bet card vs ${dateBool || bet.option ? 'ended' : ''}" data-betid="${doc.id}">
                            <span class="multi it money">$${bet.systemPoints}</span>
                            <div class="team-stats fl-ai g-5 dn">
                                <img src="/bp/EE/assets/ouths/person.png" alt="" class="icon op-5 stand_er-invert">
                                5
                            </div>
                            ${titleHtml}
                            <div class="bottom">
                                <div class="button-sec" id="btn-10s">
                                    ${ButtonHtml}
                                </div>
                                <span class="date">${dateHtml}</span>
                                <span class="bold"></span>
                            </div>
                        </div>
                    `;
                
            });
    
            // Update the DOM once
            betsDiv.innerHTML = betsHTML;
    
            // Add event listeners to buttons
            const overButtons = betsDiv.querySelectorAll('.over');
            const underButtons = betsDiv.querySelectorAll('.under');
    
            overButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    const betid = button.getAttribute('data-betid');
                    addUserBet('over', betid);

                    const relitiveUnderBtn = document.querySelector(`.under[data-betid="${betid}"]`);
                    relitiveUnderBtn.classList.add('collapse');
                });
            });
    
            underButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    const betid = button.getAttribute('data-betid');
                    addUserBet('under', betid);
                    
                    const relitiveOverBtn = document.querySelector(`.over[data-betid="${betid}"]`);
                    relitiveOverBtn.classList.add('collapse');
                });
            });
  
        } catch (error) {
            console.error("Error fetching bets:", error);
            betsDiv.innerHTML = `
                <div class="category-i mt-10 red">
                    <span class="cat-name">Error</span>
                    <span class="cat-members">
                        Unable to load bets. Please try again later.
                    </span>
                </div>
            `;
        }
        finally {
            loadingSpinner.style.display = 'none';
        }
    }

    async function CalculateBalance(id) {
        const balanceElement = document.querySelector('.balance');
        let balance = 0;
    
        try {
            // Fetch category document
            const catRef = doc(db, 'myou', 'data', 'categories', id);
            const catDocSnap = await getDoc(catRef);
            const catDoc = catDocSnap.data();
            if (!catDoc) throw new Error("Category not found.");
    
            const hasDollar = catDoc.system === 'money'; // Check if system is 'money'
    
            // Fetch user category and bets
            const userBetsRef = collection(db, 'myou', 'data', 'users', user.uid, 'categories');
            const betsRef = query(userBetsRef, where('catid', '==', catDoc.catid));
            const userCategoryDocs = await getDocs(betsRef);
    
            if (userCategoryDocs.empty) {
                balanceElement.textContent = hasDollar ? '$0' : '0';
                console.log("No user category found.");
                return 0;
            }
    
            const userCategoryDoc = userCategoryDocs.docs[0];
            const userBetsCatDocs = collection(db, 'myou', 'data', 'users', user.uid, 'categories', userCategoryDoc.id, 'bets');
            const userBetsDocs = await getDocs(userBetsCatDocs);
    
            if (userBetsDocs.empty) {
                balanceElement.textContent = hasDollar ? '$0' : '0';
                console.log("No user bets found.");
                return 0;
            }
    
            // Fetch category bets and map them for quick lookup
            const CatbetsRef = collection(db, 'myou', 'data', 'categories', id, 'bets');
            const CatbetsDocs = await getDocs(CatbetsRef);
            const catBetsMap = new Map();
            CatbetsDocs.forEach(doc => catBetsMap.set(doc.id, doc.data()));
    
            // Calculate balance
            userBetsDocs.forEach(userDoc => {
                const userBet = userDoc.data();
                const matchingBet = catBetsMap.get(userBet.betid);
    
                if (!matchingBet || matchingBet.deleted) return; // Skip invalid or deleted bets
    
                const systemPoints = parseFloat(matchingBet.systemPoints) || 0; // Convert systemPoints to a number
    
                if (
                    (matchingBet.option === "btn1" && userBet.option === "over") ||
                    (matchingBet.option === "btn2" && userBet.option === "under")
                ) {
                    balance += systemPoints;
                } else {
                    balance -= systemPoints;
                }
            });
    
            // Update balance element
            const finalBalance = hasDollar ? `$${balance.toFixed(2)}` : balance.toFixed(2);
            balanceElement.textContent = finalBalance;
            return finalBalance;
    
        } catch (error) {
            console.error("Error calculating balance:", error);
            balanceElement.textContent = hasDollar ? '$0' : '0';
            return 0;
        }
    }
    
    
    
    

    async function showEdit() {
        const editDiv = document.querySelector('#editCat');
        editDiv.classList.toggle('dn');

        const editBetsDiv = document.querySelector('.editBets-sec');
        editBetsDiv.innerHTML = "";

        const betsRef = collection(db, 'myou', 'data', 'categories', currentDocId, 'bets');
        const betsDocs = await getDocs(betsRef);
        const titleInp = document.querySelector('#cat-name-edit');

        titleInp.value = currentId.name;

        if (betsDocs.empty) {
            editBetsDiv.innerHTML = `
                <div class="category-i mt-10 gray">
                    <span class="cat-name">No bets yet</span>
                    <span class="cat-members">
                        Add Bets to edit.
                    </span>
                </div>
            `;
            return;
        } else {
            for (const doc of betsDocs.docs) {
                const bet = doc.data();

                if (bet.deleted === true) {
                    continue;
                }
                const name = bet.betType === 'vs' ? `${bet.team1} vs ${bet.team2}` : bet.title;
            
                const button1 = bet.hasCustomButtons ? bet.btn1 : 'over';
                const button2 = bet.hasCustomButtons ? bet.btn2 : 'under';
            
                editBetsDiv.innerHTML += `
                    <div class="bet-to-edit" data-betid="${doc.id}">
                    <span>${name}</span>
                    <div class="button-sec">
                        <button class="edit-btn over">${button1}</button>
                        <button class="edit-btn under">${button2}</button>
                        <button class="delete-btn edit-btn">Delete</button>
                    </div>
                    </div>
                `;
            }
            
            editBetsDiv.addEventListener('click', function (e) {
                if (e.target.classList.contains('edit-btn')) {
                    const btn = e.target;
                    const betid = btn.closest('.bet-to-edit').dataset.betid;
            
                    const overBtn = btn.parentElement.querySelector('.edit-btn.over');
                    const underBtn = btn.parentElement.querySelector('.edit-btn.under');
                    const deleteBtn = btn.parentElement.querySelector('.edit-btn.delete-btn');
            
                    if (btn.classList.contains('over')) {
                        setBet('over', betid);
                        underBtn.classList.add('collapse');
                        deleteBtn.classList.add('collapse');
                    } else if (btn.classList.contains('under')) {
                        setBet('under', betid);
                        overBtn.classList.add('collapse');
                        deleteBtn.classList.add('collapse');
                    } else if (btn.classList.contains('delete-btn')) {
                        deleteBet(betid);
                        overBtn.classList.add('collapse');
                        underBtn.classList.add('collapse');
                    }
                }
            });
            
        }

    }

    function editCat() {
        const titleInp = document.querySelector('#cat-name-edit');

        if (titleInp) {
            const catRef = doc(db, 'myou', 'data', 'categories', currentDocId);
            setDoc(catRef, { name: titleInp.value }, { merge: true });
        }

        closeEdit();
        closecat();

        setTimeout(() => {
            openCategory(currentDocId);
            renderBets();
        }, 100);

    }

    const editCatBtn = document.querySelector('#editBtn');
    editCatBtn.addEventListener('click', editCat);

    function setBet(condition, betid) {
        const betRef = doc(db, 'myou', 'data', 'categories', currentDocId, 'bets', betid);
        if (condition === 'over') {
            setDoc(betRef, { option: 'btn1' }, { merge: true });
        } else if (condition === 'under') {
            setDoc(betRef, { option: 'btn2' }, { merge: true });
        } else {
            console.error("Invalid condition:", condition);
        }

    }

    function deleteBet(betid) {
        const betRef = doc(db, 'myou', 'data', 'categories', currentDocId, 'bets', betid);
        setDoc(betRef, { deleted: true }, { merge: true });
    }

    const showEditBtn = document.querySelector('.edit');
    showEditBtn.addEventListener('click', showEdit);
    
    function addUserBet(option, betid) {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                console.error("No user is logged in");
                return;
            }

            const userCatId = collection(db, 'myou', 'data', 'users', user.uid, 'categories');
            const userCategoriesQuery = query(
                userCatId,
                where('catid', '==', currentId.catid)
            );
            const userCategoriesSnapshot = await getDocs(userCategoriesQuery);
            if (userCategoriesSnapshot.empty) {
                console.error("No matching categories found for the user.");
                return;
            }
    
            const userBetsRef = collection(
                db,
                'myou',
                'data',
                'users',
                user.uid,
                'categories',
                userCategoriesSnapshot.docs[0].id,
                'bets'
            );
    
            try {
                await addDoc(userBetsRef, {
                    betid,
                    option,
                    createdAt: serverTimestamp(),
                    catid: currentId.catid,
                });
                console.log(`Bet ${option} added for bet ID ${betid}`);
            } catch (error) {
                console.error("Error adding bet:", error);
            }
        });
    }
    
    async function updateButtons(betid) {
        const userCatId = collection(db, 'myou', 'data', 'users', user.uid, 'categories');
        const userCategoriesQuery = query(
            userCatId,
            where('catid', '==', currentId.catid)
        );
        const userCategoriesSnapshot = await getDocs(userCategoriesQuery);
        if (userCategoriesSnapshot.empty) {
            console.error("No matching categories found for the user.");
            return;
        }

        const matchingUserBets = collection(
            db,
            'myou',
            'data',
            'users',
            user.uid,
            'categories',
            userCategoriesSnapshot.docs[0].id,
            'bets',
        );

        const matchingUserBet = query(matchingUserBets, where('betid', '==', betid));
        
        const userBetDocs = await getDocs(matchingUserBet);

        userBetDocs.forEach((doc) => {
            const userBetData = doc.data();

            const overBtn = document.querySelector(`.over[data-betid="${betid}"]`);
            const underBtn = document.querySelector(`.under[data-betid="${betid}"]`);

            if (overBtn && underBtn) {
                if (userBetData.option === 'over') {
                    overBtn.disabled = true;
                    underBtn.classList.add('collapse');
                } else if (userBetData.option === 'under') {
                    underBtn.disabled = true;
                    overBtn.classList.add('collapse');
                }
            }
        });
    }

    

    function addabetDiv() {
        const addabetDiv = document.querySelector('.add-a-bet');
        addabetDiv.classList.toggle('dn');
        changeTitle();
    }

    const addabetBtn = document.querySelector('.addabet');
    addabetBtn.addEventListener('click', addabetDiv);

     function checkOwner() {
        onAuthStateChanged(auth, async (user) => {
            let isOwner = false;

            if (currentId && user) {
                if (currentId.owner === user.uid) {
                    isOwner = true;
                } else {
                    isOwner = false;
                }
            }

            const addabetBtn = document.querySelector('.addabet');
            const editBtn = document.querySelector('.edit');
            if (isOwner) {
                addabetBtn.style.display = 'block';
                editBtn.style.display = 'flex';

                addabetBtn.disabled = false;
                editBtn.disabled = false;

                addabetBtn.addEventListener('click', addabetDiv);
            } else {
                addabetBtn.style.display = 'none';
                editBtn.style.display = 'none';

                addabetBtn.disabled = true;
                editBtn.disabled = true;
                addabetBtn.removeEventListener('click', addabetDiv);
            }

            if (isOwner) {
                return true;
            } else {
                return false;
            }


        });
    }


    let vstitle = document.getElementById('js-vsTitle');
    vstitle.innerHTML = `
        <span>Team 12</span>
        <input type="text" class="input" id="team1">
        <span>Team 2</span>
        <input type="text" class="input" id="team2">
    `;

    const allBetsselects = document.querySelectorAll('#bet-selecters .freq');
    allBetsselects.forEach(select => {
        select.addEventListener('click', changeTitle);
    });

    function changeTitle() {
        const selected = document.querySelector('#bet-selecters .freq.selected');
        const bettype = selected.getAttribute('data-bettype');
        const sub2 = document.querySelector('.sub2');

        if (bettype === 'vs') {
            vstitle.innerHTML = `
                <span>Team 1</span>
                <input type="text" class="input" id="team1" placeholder="Warriors">
                <span>Team 2</span>
                <input type="text" class="input" id="team2" placeholder="Cavs">
                <span>condition</span>
                <input type="text" class="input" id="condition" placeholder="Who will win, point spread, etc.">
            `;
            sub2.innerHTML = `"Warriors vs Cavs"`
        } else {
            vstitle.innerHTML = `
                <span>Title/Condition</span>
                <input type="text" class="input" id="title" placeholder="John Doe's points">
            `;
            sub2.innerHTML = `"Who will win the NBA finals?"`
        }
        
    }

    async function addBet(currentIdi) {
        const betType = document.querySelector('#bet-selecters .freq.selected').getAttribute('data-bettype');
    
        if (betType === 'vs') {
            let bet = {};
            const team1 = document.querySelector('#team1').value;
            const team2 = document.querySelector('#team2').value;
            const condition = document.querySelector('#condition').value;
            const systemPoints = document.querySelector('#bet-value').value;
            const time = document.querySelector('#game-time').value;
            const date = document.querySelector('#game-date').value;
            const btn1 = document.querySelector('.input.over').value;
            const btn2 = document.querySelector('.input.under').value;
            let hasCustomButtons = false;

            if (btn1 && btn2) {
                hasCustomButtons = true;
            } else if (btn1 || btn2) {
                alert("Please fill in all fields.");
                return;
            }
        
            if (!team1 || !team2 || !condition || !systemPoints || !time || !date) {
                alert("Please fill in all fields.");
                return;
            }

            bet = {
                betType,
                team1,
                team2,
                condition,
                systemPoints,
                time,
                date,
                hasCustomButtons,
                btn1,
                btn2,
                deleted: false,
            };

            const betsRef = collection(db, 'myou', 'data', 'categories', currentIdi, 'bets');
            await addDoc(betsRef, bet);
        } else if (betType === 'title') {
            let bet = {};
            const title = document.querySelector('#title').value;
            const systemPoints = document.querySelector('#bet-value').value;
            const time = document.querySelector('#game-time').value;
            const date = document.querySelector('#game-date').value;
            const btn1 = document.querySelector('.input.over').value;
            const btn2 = document.querySelector('.input.under').value;
            let hasCustomButtons = false;

            if (btn1 && btn2) {
                hasCustomButtons = true;
            } else if (btn1 || btn2) {
                alert("Please fill in all fields.");
                return;

            }
        
            if (!systemPoints || !time || !date) {
                alert("Please fill in all fields.");
                return;

            }

            bet = {
                betType,
                title,
                systemPoints,
                time,
                date,
                hasCustomButtons,
                btn1,
                btn2,
                deleted: false,
            };

            const betsRef = collection(db, 'myou', 'data', 'categories', currentIdi, 'bets');
            await addDoc(betsRef, bet);
        }
        const addabetDiv = document.querySelector('.add-a-bet');
        renderBets();
        addabetDiv.classList.toggle('dn');
        openCategory(currentIdi);
    }

    const addBetBtn = document.querySelector('#add-a-bet-btn');
    addBetBtn.addEventListener('click', () => {
        addBet(currentDocId);
    });


    
    // Utility function to clear theme classes
    function clearThemeClasses(elements) {
        const themeClasses = ['red', 'orange', 'yellow', 'green', 
            'blue', 'purple', 'pink', 'gray', 'black', 'white', 'brown',
        ]; // Add all possible themes here
        elements.forEach(el => {
            el.classList.remove(...themeClasses);
        });
    }

    const allcats = document.querySelectorAll('.category');
    allcats.forEach(cat => {
        cat.addEventListener('click', () => {
            const docid = cat.getAttribute('data-catid');
            openCategory(docid);
        });
    });
});








// end 

function closeEdit() {
    const editDiv = document.querySelector('#editCat');
    editDiv.classList.add('dn');
}

function closecat() {
    const catDiv = document.querySelector('.incat-div');
    catDiv.classList.remove('open-cat');
    catDiv.classList.add('close-cat');
}

function openMembers() {
    const membersCont = document.querySelector('.members-cont');
    membersCont.classList.toggle('dn');
}

const membersBtn = document.querySelector('.members-btn');
membersBtn.addEventListener('click', openMembers);



// Example usage
function share () {
    
    const shareDiv = document.querySelector('.joinsec');
    const joinCodeSpan = document.querySelector('#join-code');
    
    shareDiv.classList.toggle('dn'); 

    const joinCode = currentId.catid;
    joinCodeSpan.textContent = joinCode;

}

const copyBtn = document.querySelector('.copy-btn');

function copyCode() {
    const code = document.querySelector('#join-code');
    const codeText = code.textContent;
    navigator.clipboard.writeText(codeText);

    copyBtn.textContent = "Copied!";
}

copyBtn.addEventListener('click', copyCode);
const shareBtn = document.querySelector('.share-btn');
shareBtn.addEventListener('click', share);

function shareCode() {
    const code = document.querySelector('#join-code');
    const codeText = code.textContent;
    navigator.share({ title: 'My overunder Join code!', text: `Join code: ${codeText}`, url: 'https://lcnjoel.com/myou' });
}

const shareNativeBtn = document.querySelector('.share-native-btn');
shareNativeBtn.addEventListener('click', shareCode);


const backBtn = document.querySelector('#backBtn');
backBtn.addEventListener('click', () => {
    const catDiv = document.querySelector('.incat-div');
    catDiv.classList.remove('open-cat');
    catDiv.classList.add('close-cat');
});


const allClosers = document.querySelectorAll('.js_closer'); 
allClosers.forEach(closer => {
  const target = closer.getAttribute('data-close');
  closer.addEventListener('click', () => {
    document.querySelector(target).classList.toggle('dn');
  });
});

const themeSelects = document.querySelectorAll('.theme');

themeSelects.forEach(select => {
    select.addEventListener('click', () => {
        themeSelects.forEach(s => s.classList.remove('theme-selected'));

        select.classList.add('theme-selected');
    });
});

const freqSelects = document.querySelectorAll('.freq');

freqSelects.forEach(select => {
    select.addEventListener('click', () => {
        freqSelects.forEach(s => s.classList.remove('selected'));

        select.classList.add('selected');
    });
});


const allTargets = document.querySelectorAll('.js_cl');

allTargets.forEach(target => {
    const elem = document.querySelector(target.getAttribute('data-cl_target'));
    const classToToggle = target.getAttribute('data-cl_toggle');

    target.addEventListener('click', () => {
        elem.classList.toggle(classToToggle);
    });
});

function formatDateTime(input) {
    // Split the input into time and date parts
    const [time, date] = input.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    // Convert hours to 12-hour format and determine am/pm
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12; // Adjust for 12-hour format

    // Parse the date and extract parts
    const [year, month, day] = date.split("-").map(Number);
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const formattedMonth = monthNames[month - 1]; // Convert month number to name

    // Format the date and time into the desired output
    return `${hours}:${minutes + 1} ${ampm} ${formattedMonth} ${day}`;
}

function isDatePassed(inputDateTime) {
    // Parse the input in the format "HH:mm YYYY-MM-DD"
    const [time, date] = inputDateTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    
    // Create a Date object for the input
    const inputDate = new Date(year, month - 1, day, hours, minutes);
    
    // Get the current date and time
    const now = new Date();
    
    // Compare the input date with the current date
    return inputDate < now;
}
