import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
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


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore(app);

const userData = JSON.parse(localStorage.getItem('userData'));
const adminsEmails = ['joelmulonde81@gmail.com', 'nlfjoelalt@gmail.com'];

if (userData) {
    const userRef = doc(db, 'users', userData.uid);
if (!(userData.email && adminsEmails.includes(userData.email))) {
    window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
    setDoc(userRef, {
        FBban: true,
        email: userData.email
    },);
}   

} else {
    window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
}
