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

  const postsDiv = document.getElementById('posts');
  postsDiv.innerHTML = '';
  const blasts = collection(db, 'eblast');
const blastsAnon = collection(db, 'eblast-anon');



  const anontextarea = document.getElementById('anontextarea');
  const sendanonBtn = document.getElementById('sendanon');

  sendanonBtn.addEventListener('click', async () => {
    const text = anontextarea.value;
    if (text) {
        sendanonBtn.disabled = true; // Disable button
        try {
            const docRef = await addDoc(blastsAnon, {
                text: text,
                createdAt: new Date(),
            });
            console.log("Document written with ID: ", docRef.id);
            anontextarea.value = '';
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to send. Please try again.");
        } finally {
            sendanonBtn.disabled = false; // Re-enable button
        }
    } else {
        alert("Please enter some text!");
    }
});



getDocs(blasts).then((querySnapshot) => {
    let index = 0;
    const sortedDocs = querySnapshot.docs.sort((a, b) => {
        const aDate = a.data().createdAt ? a.data().createdAt.seconds : 0;
        const bDate = b.data().createdAt ? b.data().createdAt.seconds : 0;
        return bDate - aDate;
    });
    sortedDocs.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString("en-US") : 'N/A';
        postsDiv.innerHTML += `
        <div class="post">
            <div class="post-top">
            <span class="name">${data.name || 'Anonymous'}</span>
            <span class="blastnum">E_blast #${sortedDocs.length - index}</span>
            <span class="date">${createdAt}</span>
            </div>
            <div class="text">
            ${data.text || ''}
            </div>
        </div>
        `;
        index++;
    });
}).catch((error) => {
    console.error("Error getting documents: ", error);
});