import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAGcg43F94bWqUuyLH-AjghrAfduEVQ8ZM",
    authDomain: "overunder-ths.firebaseapp.com",
    projectId: "overunder-ths",
    storageBucket: "overunder-ths.firebasestorage.app",
    messagingSenderId: "690530120785",
    appId: "1:690530120785:web:36dc297cb517ac76cb7470",
    measurementId: "G-Q30T39R8VY"
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
        } else {
            return;
        }
  
        // Set login state in localStorage
        localStorage.setItem('hasLoggedIn', true);
  
        // Reload the page or update UI accordingly
        // window.location.reload();
      } catch (error) {
        console.error("Error signing in with Google:", error);
      }
    });
  }

// Redirect to index page if already logged in
// onAuthStateChanged(auth, (user) => {
//   if (user) {
//     window.location.href = "index.html";
//   }
// });
