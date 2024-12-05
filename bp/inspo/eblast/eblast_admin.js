import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getFirestore, doc, setDoc, getDoc,getDocs, addDoc, collection } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDkPsE0uD-1_V5_QfM-RhtaIviQlINW2DA",
    authDomain: "lcntests.firebaseapp.com",
    databaseURL: "https://lcntests-default-rtdb.firebaseio.com",
    projectId: "lcntests",
    storageBucket: "lcntests.firebasestorage.app",
    messagingSenderId: "665856876392",
    appId: "1:665856876392:web:c6274b52a9e90c3d6400dd",
    measurementId: "G-1D5Z4GYNMT"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const db = getFirestore(app);
  const blasts = collection(db, 'eblast');

  const textarea = document.getElementById('textarea');
  const postBtn = document.getElementById('postBtn');

  function post() {
        const text = textarea.value;
        if (!text) {
            return;
        }
        addDoc(blasts, {
            text,
            createdAt: new Date(),
        }).then(() => {
            textarea.value = '';
        }).catch((error) => {
            console.error("Error adding document: ", error);
        });
  }

    postBtn.addEventListener('click', post);