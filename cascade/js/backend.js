import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";
import { addEventListenerGroup } from './app.js';
import { 
  getAuth, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdV8dc3X5AKYMAkh6nQILYQUBpmJDGwf0",
  authDomain: "joelsnotesapp.firebaseapp.com",
  projectId: "joelsnotesapp",
  storageBucket: "joelsnotesapp.firebasestorage.app",
  messagingSenderId: "1043222135072",
  appId: "1:1043222135072:web:b0ec2fe65119dc38c2d745",
  measurementId: "G-JVW0G994B5"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let isSignedIn = false;

// Check authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    isSignedIn = true;
    currentUser = user;
    document.body.style.color = 'red';
  } else {
    isSignedIn = false;
    currentUser = null;

    // Redirect only if not already on signin page
    if (!window.location.pathname.endsWith("signin.html")) {
      window.location.href = "signin.html";
    }
  }
});

const htmls = {
  home: 'home page',
};


const globalBoard = document.querySelector('.board-content');
let globaluserId = null;



onAuthStateChanged(auth, (usr) => {
  if (!usr) return;
  globaluserId = usr.uid;
  const letter = document.querySelector('.js-auth-letter');
  const displayNameElems = document.querySelectorAll('.js-auth-displayname');
  if (letter) letter.innerText = usr.displayName.charAt(0).toUpperCase();

  displayNameElems.forEach(elem => {
    elem.innerText = usr.displayName || "Unknown User";
  });



  
});


// UI interactions
function createNewBoard() {
  if (!isSignedIn || !currentUser) return;
  const boardId = Math.random().toString(36).substring(2, 10);


  saveNotes(boardId);
  loadNote(boardId);
}

const newBoardBtn = document.querySelector('.js-new-board-btn');
if (newBoardBtn) newBoardBtn.addEventListener('click', createNewBoard);

async function checkUserNotes(userId = globaluserId) {
  if (!isSignedIn) return false;
  try {
    const userBoardsCol = collection(db, "users", userId, "boards");
    const q = query(userBoardsCol, limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.error("checkUserNotes error:", err);
    return false;
  }
}


const allAddSelones = document.querySelectorAll('.add-sel-1');
allAddSelones.forEach(el => el.addEventListener('click', () => {
  const evt = window.event;
  const clicked = (evt && (evt.currentTarget || evt.target)) || document.activeElement;
  if (!clicked || !clicked.classList) return;
  allAddSelones.forEach(el => el.classList.remove('selected'));
  clicked.classList.add('selected');
}));

const homeBtn = document.querySelector('.js-content-home');
if (homeBtn) homeBtn.addEventListener('click', loadHome);

function loadHome() {
  if (globalBoard) globalBoard.innerHTML = htmls.home;
}

export async function saveNotes(boardId) {
  const boardContent = document.querySelector('.board-content');
  if (!isSignedIn || !currentUser || !boardContent) return;

  const lastTitle = document.querySelector('.title.item-element')?.innerText || "Untitled";
  const htmlContent = boardContent.innerHTML;

  try {
    const boardDoc = doc(db, "boards", boardId);
    await setDoc(boardDoc, {
      owner: currentUser.uid,
      title: lastTitle,
      content: htmlContent,
      updatedAt: new Date()
    }, { merge: true });

    const userBoardRef = doc(db, "users", currentUser.uid, "boards", boardId);
    await setDoc(userBoardRef, {
      boardId,
      linkedAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving notes:", error);
  }
}

export function loadNote(boardId) {
  const boardContent = document.querySelector('.board-content');
  if (!isSignedIn || !boardContent) return;

  const boardDoc = doc(db, "boards", boardId);
  getDoc(boardDoc).then((docSnap) => {
    if (docSnap.exists()) {
      boardContent.innerHTML = docSnap.data().content || "";
    } else {
      console.log("No such document!");
    }
  }).catch((error) => {
    console.error("Error loading notes:", error);
  });
}
