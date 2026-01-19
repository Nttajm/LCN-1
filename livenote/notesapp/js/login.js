import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc,getDocs, addDoc, collection, getCountFromServer, query , where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyBoMh1L1bbPm-DzsB8DU1fWc1_z8MsFfj4",
    authDomain: "lcntests.firebaseapp.com",
    databaseURL: "https://lcntests-default-rtdb.firebaseio.com",
    projectId: "lcntests",
    storageBucket: "lcntests.firebasestorage.app",
    messagingSenderId: "665856876392",
    appId: "1:665856876392:web:23fe74667972a8db6400dd",
    measurementId: "G-JJM3816RHH"
  };

  // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    const auth = getAuth();
    const db = getFirestore(app);


    const loginBtn = document.querySelector('.google-btn');

 onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "index.html";
    }  
 });

if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Reference user's Firestore document
      const userRef = doc(db, 'noteUsers', user.uid);
      const docSnap = await getDoc(userRef);

      // If the user doesn't exist, create a new Firestore document
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          createdAt: serverTimestamp(),
          displayName: user.displayName,
          notes: [],
        });
      }

      window.location.href = "index.html";
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  });
}

// Redirect to index page if already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "index.html";
  }
});
  