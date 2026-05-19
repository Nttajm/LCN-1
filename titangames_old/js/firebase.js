import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBCaGiPCM-PrrA4zwnahDYyayltI2QVOdA",
    authDomain: "overunder-ths.firebaseapp.com",
    projectId: "overunder-ths",
    storageBucket: "overunder-ths.firebasestorage.app",
    messagingSenderId: "690530120785",
    appId: "1:690530120785:web:27ccc340d6f96942cb7470",
    measurementId: "G-HBBJ707GG9"
};

const puzzleFirebaseConfig = {
    apiKey: "AIzaSyDNXZ1Xnm3FrE4Ofo8ClzJ8sph7NoVSgnk",
    authDomain: "square-lcn.firebaseapp.com",
    projectId: "square-lcn",
    storageBucket: "square-lcn.firebasestorage.app",
    messagingSenderId: "496286011021",
    appId: "1:496286011021:web:776047bb56aa3c427d5cc4",
    measurementId: "G-C7CHHFMHTR"
};

const app = initializeApp(firebaseConfig);
const puzzleApp = initializeApp(puzzleFirebaseConfig, 'puzzles');

const auth = getAuth(app);
const db = getFirestore(app);
const puzzleDb = getFirestore(puzzleApp);
const googleProvider = new GoogleAuthProvider();

export { auth, db, puzzleDb, googleProvider };
