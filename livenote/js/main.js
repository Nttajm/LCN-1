import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-analytics.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  collection,
  query,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdV8dc3X5AKYMAkh6nQILYQUBpmJDGwf0",
  authDomain: "joelsnotesapp.firebaseapp.com",
  projectId: "joelsnotesapp",
  storageBucket: "joelsnotesapp.firebasestorage.app",
  messagingSenderId: "1043222135072",
  appId: "1:1043222135072:web:32115e8e8768bf26c2d745",
  measurementId: "G-F13TDHJBWR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app); // Initialize the Auth instance

// Check user authentication state
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "signin.html"; // Redirect to sign-in page if not authenticated
    return;
  }

  // Function to add a note
  async function addNote() {
    const note = {
      title: document.querySelector("#title").value, // Assuming you have input fields with these IDs
      content: document.querySelector("#content").value,
      fBDate: serverTimestamp(),
      date: new Date()
    };

    try {
      const userNotes = collection(db, "users", user.uid, "notes");
      await addDoc(userNotes, note); // Save the note to Firestore
      console.log("Note added:", note);
      renderNotes();
    } catch (error) {
      console.error("Error adding note:", error);
    }
  }

  // Function to render notes
  async function renderNotes() {
    try {
      const userNotes = collection(db, "users", user.uid, "notes");
      const notesSnapshot = await getDocs(userNotes);
      const notes = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(notes);

      // Display notes (update DOM here)
      const notesList = document.querySelector("#notes-list"); // Assuming an element with this ID
      notesList.innerHTML = notes.map(note => `<li>${note.title}: ${note.content}</li>`).join("");
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }

  // Attach event listener to add note button
  const addNoteBtn = document.querySelector("#newnote");
  if (addNoteBtn) {
    addNoteBtn.addEventListener("click", addNote);
  }

  // Initial rendering of notes
  renderNotes();
});


// Function to sign out
async function signOutUser() {
    try {
        await auth.signOut();
        window.location.href = "signin.html"; // Redirect to sign-in page after signing out
    } catch (error) {
        console.error("Error signing out:", error);
    }
}


signOutUser();