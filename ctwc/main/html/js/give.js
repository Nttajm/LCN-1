import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkPsE0uD-1_V5_QfM-RhtaIviQlINW2DA",
  authDomain: "lcntests.firebaseapp.com",
  projectId: "lcntests",
  storageBucket: "jmblanks.appspot.com",
  messagingSenderId: "665856876392",
  appId: "1:665856876392:web:c6274b52a9e90c3d6400dd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const airtel = document.getElementById("js-reval-credit");
const amountBtns = airtel.querySelectorAll(".dontype.js-sel");
const customInput = airtel.querySelector(".custom input");
const recurringBtn = airtel.querySelector(".reaccuring-btn");
const giveBtn = airtel.querySelector(".give-btn button");
const cancelBtn = document.getElementById("cancel-recurring");
const banner = document.querySelector(".banner"); // 👈 banner element

let selectedAmount = null;

// ===== HANDLE AMOUNT SELECTION =====
amountBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    amountBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedAmount = parseFloat(btn.dataset.amount);
    customInput.value = "";
  });
});

// ===== CUSTOM INPUT CLEARS SELECTION =====
customInput.addEventListener("focus", () => {
  amountBtns.forEach(b => b.classList.remove("active"));
  selectedAmount = null;
});

// ===== RECURRING TOGGLE =====
recurringBtn.addEventListener("click", () => {
  recurringBtn.classList.toggle("active");
});

// ===== DONATE BUTTON =====

const signBtn = airtel.querySelector(".sign-btn button"); // new sign-in button (if present)

if (signBtn) {
  signBtn.addEventListener("click", async () => {
    banner.classList.remove("dn"); // show banner during sign-in
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const currentUser = result.user;

      await setDoc(
        doc(db, "cemi_donors", currentUser.uid),
        {
          uid: currentUser.uid,
          name: currentUser.displayName || "",
          email: currentUser.email || "",
          lastLogin: new Date().toISOString()
        },
        { merge: true }
      );

      alert("Signed in successfully.");
    } catch (err) {
      console.error("Sign-in failed:", err);
      alert("Sign-in failed. Please try again.");
    } finally {
      banner.classList.add("dn"); // hide banner when done
    }
  });
} else {
  console.warn("No .sign-btn button found. Add a sign button to separate sign and give actions.");
}


const isSignedIn = () => !!auth.currentUser;

// ===== Initial check =====
function updateGiveButtonState() {
  if (!giveBtn) {
    console.error("Give button not found!");
    return;
  }

  if (isSignedIn()) {
    giveBtn.disabled = false;
    giveBtn.classList.remove("dn");

    signBtn?.classList.add("dn");

  } else {
    giveBtn.disabled = true;
    giveBtn.classList.add("dn");

    signBtn?.classList.remove("dn");
  }
}

// ===== Run once on load =====
updateGiveButtonState();

// ===== React to sign-in changes =====
auth.onAuthStateChanged(user => {
  updateGiveButtonState();
});



giveBtn.addEventListener("click", async () => {
  const amount = selectedAmount || parseFloat(customInput.value);
  const recurring = recurringBtn.classList.contains("active");

  if (!amount || amount <= 0) {
    alert("Please select or enter a valid donation amount.");
    return;
  }

  let currentUser = auth.currentUser;
  if (!currentUser) {
    alert("Please sign in first using the Sign button before giving.");
    return;
  }

  banner.classList.remove("dn"); // show banner on load
  giveBtn.disabled = true;
  giveBtn.textContent = "Processing...";

  try {
    // Ensure donor record is updated
    await setDoc(
      doc(db, "cemi_donors", currentUser.uid),
      { lastLogin: new Date().toISOString() },
      { merge: true }
    );

    const email = currentUser.email || "unknown";
    const userId = currentUser.uid;

    const res = await fetch("https://backend2-b76r.onrender.com/create-donation-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, recurring, userId, email })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create donation session");
    }

    const { url } = await res.json();
    window.location.href = url;
  } catch (err) {
    console.error("Donation error:", err);
    alert("Something went wrong. Please try again later.");
    banner.classList.add("dn"); // hide if failed
  } finally {
    giveBtn.disabled = false;
    giveBtn.textContent = "Give";
  }
});

// ===== CANCEL RECURRING DONATION =====
cancelBtn.addEventListener("click", async () => {
  let currentUser = auth.currentUser;

  if (!currentUser) {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      currentUser = result.user;
    } catch (err) {
      console.error("Login failed:", err);
      alert("You must sign in with Google to manage your donations.");
      return;
    }
  }

  banner.classList.remove("dn"); // 🔥 show banner on cancel start
  cancelBtn.disabled = true;
  cancelBtn.textContent = "Canceling...";

  try {
    const res = await fetch("https://backend2-b76r.onrender.com/cancel-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.uid }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("✅ Recurring donation canceled successfully.");
    } else {
      alert(`⚠️ ${data.error || "Failed to cancel recurring donation."}`);
    }
  } catch (err) {
    console.error("Cancel error:", err);
    alert("❌ Something went wrong while canceling. Try again later.");
  }

  banner.classList.add("dn"); // 🔥 hide banner when done
  cancelBtn.disabled = false;
  cancelBtn.textContent = "Cancel Existing Recurring Donation?";
});


