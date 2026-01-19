import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc,getDocs, addDoc, collection, getCountFromServer, query  } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyDdV8dc3X5AKYMAkh6nQILYQUBpmJDGwf0",
    authDomain: "joelsnotesapp.firebaseapp.com",
    projectId: "joelsnotesapp",
    storageBucket: "joelsnotesapp.firebasestorage.app",
    messagingSenderId: "1043222135072",
    appId: "1:1043222135072:web:32115e8e8768bf26c2d745",
    measurementId: "G-F13TDHJBWR"
  };

  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const auth = getAuth();
  const db = getFirestore(app);

  const loginBtn = document.querySelector('.googleButton');

if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Reference user's Firestore document
      const userRef = doc(db, 'users', user.uid);
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

      // Redirect to index page
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

