import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCy4lEzurGBcYqc8Pex1SUysXo-KbGBlu0",
  authDomain: "lcn-apps.firebaseapp.com",
  projectId: "lcn-apps",
  storageBucket: "lcn-apps.firebasestorage.app",
  messagingSenderId: "663679231736",
  appId: "1:663679231736:web:265696ffa0b785c9c8fd0d",
  measurementId: "G-CCXH29FHLD",
  databaseURL: "https://lcn-apps-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
