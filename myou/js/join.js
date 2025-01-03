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

onAuthStateChanged(auth, (user) => {
    const joinInp = document.getElementById('joinInp');

    const joinBtn = document.getElementById('joinBtn');

    joinBtn.addEventListener('click', async () => {
        const joinCode = joinInp.value;
        const userUid = user.uid;
        const userCategories = collection(db, 'myou', 'data', 'users', userUid, 'categories');
        const categories = collection(db, 'myou', 'data', 'categories');
        const categoryQuery = query(categories, where('catid', '==', joinCode));
        const categorySnapshot = await getDocs(categoryQuery);

        if (categorySnapshot.empty) {
            console.log(joinCode);

        } else {
            const category = categorySnapshot.docs[0];

            await setDoc(category.ref, {
                members: category.data().membersCount + 1,
            }, { merge: true
            })

            const categoryName = category.data().name;
            await addDoc(userCategories, {
                name: categoryName,
                catid: joinCode,
                joinedAt: serverTimestamp(),
            });



            const categoryMembers = collection(category.ref, 'members');
            await addDoc(categoryMembers, {
                catid: joinCode,
                userUid: user.uid,
                name: user.displayName,
                pfp: user.photoURL,
                joinedAt: serverTimestamp(),
            }) ;

            window.location.href = 'index.html';
        }
    });
});