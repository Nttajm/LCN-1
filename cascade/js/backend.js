// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import { CASCADE_HTMLS } from './htmls.js';
import { reapplyAllEventListeners } from './app.js';

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyDdV8dc3X5AKYMAkh6nQILYQUBpmJDGwf0",
  authDomain: "joelsnotesapp.firebaseapp.com",
  projectId: "joelsnotesapp",
  storageBucket: "joelsnotesapp.appspot.com",
  messagingSenderId: "1043222135072",
  appId: "1:1043222135072:web:b0ec2fe65119dc38c2d745",
  measurementId: "G-JVW0G994B5"
};

// --- Init Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Globals ---
let currentUser = null;
let currentBoardId = null;
const globalBoard = document.querySelector('.board-content');

// --- Auth ---
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "signin.html");
  currentUser = user;

  document.querySelectorAll('.js-auth-displayname').forEach(e => e.innerText = user.displayName || "User");
  const letter = document.querySelector('.js-auth-letter');
  if (letter) letter.innerText = (user.displayName?.[0] || "U").toUpperCase();

  await ensureBoardExists();
  await loadBoardsHtml();
  await loadMostRecentBoard();
});

// --- Ensure user has at least 1 board ---
async function ensureBoardExists() {
  const colRef = collection(db, "users", currentUser.uid, "boards");
  const snap = await getDocs(colRef);
  if (!snap.empty) return;

  const id = crypto.randomUUID().slice(0, 8);
  const newBoard = {
    owner: currentUser.uid,
    title: "New Board",
    content: CASCADE_HTMLS?.new || "<p>New board</p>",
    updatedAt: new Date()
  };
  await setDoc(doc(db, "boards", id), newBoard);
  await setDoc(doc(db, "users", currentUser.uid, "boards", id), {
    ...newBoard,
    boardId: id,
    linkedAt: new Date()
  });
  currentBoardId = id;
}

// --- Load and render boards ---
async function loadBoardsHtml() {
  if (!currentUser) return;
  const container = document.querySelector('.boards');
  if (!container) return;

  toggleLoadingState(container);
  container.innerHTML = "";

  const colRef = collection(db, "users", currentUser.uid, "boards");
  const snap = await getDocs(colRef);

  const boards = [];
  snap.forEach(d => boards.push({ id: d.id, ...d.data() }));

  boards.sort((a, b) => {
    const aTime = a.updatedAt?.toMillis?.() || new Date(a.linkedAt).getTime() || 0;
    const bTime = b.updatedAt?.toMillis?.() || new Date(b.linkedAt).getTime() || 0;
    return bTime - aTime;
  });

  for (const b of boards) {
    const title = (b.title || "Untitled").slice(0, 15);
    container.insertAdjacentHTML("beforeend", `
      <div class="conelem hover add-sel-1" data-board-id="${b.id}">
        <div class="icono gray"><img src="icons/dfr_1.png" class="icon"></div>
        <span class="discript fx-full">${title}</span>
        <div class="icono gray delete-board-btn" data-board-id="${b.id}">
          <img src="icons/delete.png" class="icon">
        </div>
      </div>
    `);
  }

  container.querySelectorAll('.add-sel-1').forEach(el => {
    el.addEventListener('click', () => {
      container.querySelectorAll('.add-sel-1').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      loadNote(el.dataset.boardId);
    });
  });

  container.querySelectorAll('.delete-board-btn').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      deleteBoard(el.dataset.boardId);
    });
  });

  toggleLoadingState(container);
}

// --- Auto refresh boards every 20s ---
setInterval(loadBoardsHtml, 20000);

// --- Load most recent board ---
async function loadMostRecentBoard() {
  const colRef = collection(db, "users", currentUser.uid, "boards");
  const snap = await getDocs(colRef);
  const boards = [];
  snap.forEach(d => boards.push({ id: d.id, ...d.data() }));
  if (boards.length === 0) return;

  boards.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
  currentBoardId = boards[0].id;
  await loadNote(currentBoardId);
}

// --- Create new board ---
async function createNewBoard() {
  if (!currentUser) return;
  const id = crypto.randomUUID().slice(0, 8);
  const data = {
    owner: currentUser.uid,
    title: "New Board",
    content: CASCADE_HTMLS?.new || "<p>New board</p>",
    updatedAt: new Date()
  };

  await setDoc(doc(db, "boards", id), data);
  await setDoc(doc(db, "users", currentUser.uid, "boards", id), {
    ...data,
    boardId: id,
    linkedAt: new Date()
  });

  currentBoardId = id;
  await loadBoardsHtml();
  await loadNote(id);
}

const newBoardBtn = document.querySelector('.js-new-board-btn');
if (newBoardBtn) newBoardBtn.addEventListener('click', createNewBoard);

// --- Load board content ---
export async function loadNote(boardId = currentBoardId) {
  if (!boardId || !currentUser) return;
  const boardEl = document.querySelector('.board-content');
  if (!boardEl) return;

  const snap = await getDoc(doc(db, "boards", boardId));
  if (!snap.exists()) {
    boardEl.innerHTML = "<p>Board not found.</p>";
    return;
  }

  const data = snap.data();
  boardEl.innerHTML = data.content || "<p>No content</p>";
  reapplyAllEventListeners();
  currentBoardId = boardId;
}

// --- Save notes ---
export async function saveNotes(boardId = currentBoardId) {
  if (!boardId || !currentUser) return;
  const boardEl = document.querySelector('.board-content');
  if (!boardEl) return;

  const title = document.querySelector('.title.item-element')?.dataset?.content || "Untitled";
  const htmlContent = boardEl.innerHTML;

  const payload = {
    owner: currentUser.uid,
    title,
    content: htmlContent,
    updatedAt: new Date()
  };

  await setDoc(doc(db, "boards", boardId), payload, { merge: true });
  await setDoc(doc(db, "users", currentUser.uid, "boards", boardId), {
    boardId,
    title,
    updatedAt: new Date(),
    linkedAt: new Date()
  }, { merge: true });
}

// --- Delete board ---
async function deleteBoard(boardId) {
  if (!boardId || !currentUser) return;
  await deleteDoc(doc(db, "users", currentUser.uid, "boards", boardId));
  await deleteDoc(doc(db, "boards", boardId));

  const colRef = collection(db, "users", currentUser.uid, "boards");
  const snap = await getDocs(colRef);
  if (snap.empty) {
    currentBoardId = null;
    if (globalBoard) globalBoard.innerHTML = "<p>All boards deleted.</p>";
    return;
  }

  const boards = [];
  snap.forEach(d => boards.push({ id: d.id, ...d.data() }));
  boards.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
  currentBoardId = boards[0].id;

  await loadBoardsHtml();
  await loadNote(currentBoardId);
}

// --- Auto-save ---
document.addEventListener('DOMContentLoaded', () => {
  const boardEl = document.querySelector('.board-content');
  if (!boardEl) return;

  let lastEdit = Date.now();
  setInterval(() => {
    if (Date.now() - lastEdit < 5000 && currentBoardId) saveNotes();
  }, 2000);

  ['input', 'keydown', 'mousedown', 'touchstart'].forEach(evt =>
    boardEl.addEventListener(evt, () => lastEdit = Date.now())
  );
});


function toggleLoadingState(element) {
  setTimeout(() => {
    element.classList.toggle('loading');
  }, 100);
}

export { db, auth };
