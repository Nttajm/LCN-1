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
const logoutBtn = document.querySelector('#logout');

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
    
        // Reference to the loading spinner element
        const loadingSpinner = document.querySelector('#loading-spinner');
        const catsection = document.querySelector('#categories');
    
        try {
            // Show the loading spinner
            loadingSpinner.style.display = 'block';
    
            const profileName = document.querySelector('.username');
            const profileImage = document.querySelector('#google-auth-pfp');
            profileName.textContent = user.displayName.split(' ')[0];
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
            categoryDocs.forEach(doc => {
                categories.push(doc.data());
            });
    
            for (const data of categories) {
                const matchingCat = query(
                    collection(db, 'myou', 'data', 'categories'), 
                    where('catid', '==', data.catid)
                );
                const catDocSnapshots = await getDocs(matchingCat);
    
                // Render categories by date joined
                const catDataArray = catDocSnapshots.docs.map(catDoc => catDoc.data());
                catDataArray.sort((a, b) => a.joinedAt - b.joinedAt);
    
                catDataArray.forEach(catData => {
                    catsection.innerHTML += `
                        <div class="category ${catData.theme}" data-catid="${catData.catid}">
                            <span class="cat-name">${catData.name}</span>
                            <span class="cat-members">members: ${catData.membersCount || 'N/A'}</span>
                        </div>`;
                });
            }
        } catch (error) {
            console.error("Error loading categories:", error);
            catsection.innerHTML = "<p>Error loading categories. Please try again later.</p>";
        } finally {
            // Hide the loading spinner after data fetching completes
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
                return;
            }

            const catid = Math.random().toString(36).substring(2, 11);
    
            const theme = document.querySelector('.theme-selected').getAttribute('data-theme');
            const system = document.querySelector('.freq.selected').getAttribute('data-system');
            
            const userUid = user.uid;
    
            const userCategories = collection(db, 'myou', 'data', 'users', userUid, 'categories');
            const categories = collection(db, 'myou', 'data', 'categories');
            const categoryMembers = collection(db, 'myou', 'data', 'categories', catid, 'members');
    
            
            await addDoc(userCategories, {
                name: categoryName,
                catid,
                joinedAt: serverTimestamp(),
            });
    
            const beforeMembers = await getDocs(categories);
            const membersCount = beforeMembers.size;
    
            await addDoc(categories, {
                name: categoryName,
                catid,
                theme,
                system,
                membersCount,
                createdAt: serverTimestamp(),
            });
    
            await addDoc(categoryMembers, {
                catid,
                userUid,
                name: user.displayName,
                pfp: user.photoURL,
                joinedAt: serverTimestamp(),
            });
    
            categoryInput.value = ""; 
    
            // Call renderCategories to update the UI
            await renderCategories();
        });
    
        const createDiv = document.querySelector('.create-div');
        createDiv.classList.add('dn');
    }

    
    const createCatBtn = document.querySelector('.create-btn');
    createCatBtn.addEventListener('click', createCategory);
});



// end 







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