import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc,getDocs, addDoc, collection, getCountFromServer, query  } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyDtto_Unnm75LvHTCiC3NwL2rhuLszJPUs",
    authDomain: "square-lcn.firebaseapp.com",
    projectId: "square-lcn",
    storageBucket: "square-lcn.firebasestorage.app",
    messagingSenderId: "496286011021",
    appId: "1:496286011021:web:b155b1ea2b7897877d5cc4",
    measurementId: "G-HLG1LW5XVP"
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
      localStorage.setItem('hasLoggedIn', true);

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

