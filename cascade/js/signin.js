// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdV8dc3X5AKYMAkh6nQILYQUBpmJDGwf0",
  authDomain: "joelsnotesapp.firebaseapp.com",
  projectId: "joelsnotesapp",
  storageBucket: "joelsnotesapp.firebasestorage.app",
  messagingSenderId: "1043222135072",
  appId: "1:1043222135072:web:b0ec2fe65119dc38c2d745",
  measurementId: "G-JVW0G994B5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Sign-in button logic
const signinbtn = document.querySelector('.google-button');

if (signinbtn) {
  signinbtn.addEventListener('click', async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.displayName || "Unknown User",
          email: user.email || "",
          photoURL: user.photoURL || "",
          createdAt: new Date().toISOString()
        });
      }

      // Redirect to main page
      window.location.href = "index.html";
    } catch (error) {
      console.error("Sign-in failed:", error);
      alert("Sign-in failed. Please try again.");
    }
  });
}

// If user is already signed in, go to index.html
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.endsWith("signin.html")) {
    window.location.href = "index.html";
  }
});
