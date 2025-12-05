import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { doc as docRef, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkPsE0uD-1_V5_QfM-RhtaIviQlINW2DA",
  authDomain: "lcntests.firebaseapp.com",
  projectId: "lcntests",
  storageBucket: "jmblanks.appspot.com",
  messagingSenderId: "665856876392",
  appId: "1:665856876392:web:c6274b52a9e90c3d6400dd"
}; 

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let userid;
let userName;

onAuthStateChanged(getAuth(), user => {
  userid = user.uid;
  userName = user ? user.displayName : 'Guest';
  console.log("User ID:", userid);
  console.log("User Name:", userName);
});

function getParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
}

const key = getParam("key");
console.log("Order Key:", key);
async function verifyOrder() { 
    if (!key || !userid) return;

    let productsToBeSold = [];
    const ordersRef = collection(db, "orders");
    const snapshot = await getDocs(ordersRef);

    let verified = false;

    for (const orderDoc of snapshot.docs) {
        const data = orderDoc.data();

        if (data.key === key && data.userId === userid) {
            // ✅ FIX: use doc()
            const orderRef = doc(db, "orders", orderDoc.id);
            await updateDoc(orderRef, { status: "verified" });
            verified = true;
            productsToBeSold = data.products || [];
            console.log("Products to be sold:", productsToBeSold);
            await markProductsAsSold(productsToBeSold);
        }

        if (data.status === "verified") continue;
        localStorage.removeItem("cart");
    }

    console.log(verified ? "Order verified." : "No matching order found.");
}

async function markProductsAsSold(productsArray) {
    // ✅ Extract just the IDs from the array of objects
    const productIds = productsArray.map(p => p.id);

    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);

    for (const productDoc of snapshot.docs) {
        const data = productDoc.data();
        if (productIds.includes(productDoc.id) && !data.sold) {
            // ✅ FIX: use doc()
            const productRef = doc(db, "products", productDoc.id);
            await updateDoc(productRef, { sold: true });
        }
    }
}

// Wait for auth to be ready before running
onAuthStateChanged(auth, user => {
    if (user) {
        userid = user.uid;
        verifyOrder();
    }
});
