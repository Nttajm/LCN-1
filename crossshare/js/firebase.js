import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCsgjQd-PX3-VtqoV-jXexl1xYUnHh1aSs",
  authDomain: "crossapps-lcn.firebaseapp.com",
  projectId: "crossapps-lcn",
  storageBucket: "crossapps-lcn.firebasestorage.app",
  messagingSenderId: "21571761365",
  appId: "1:21571761365:web:b848402461a080d9621e5c",
  measurementId: "G-KX3Q1HLYPT"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
