import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, where, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDNXZ1Xnm3FrE4Ofo8ClzJ8sph7NoVSgnk",
    authDomain: "square-lcn.firebaseapp.com",
    projectId: "square-lcn",
    storageBucket: "square-lcn.firebasestorage.app",
    messagingSenderId: "496286011021",
    appId: "1:496286011021:web:776047bb56aa3c427d5cc4",
    measurementId: "G-C7CHHFMHTR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, where, orderBy, Timestamp };
