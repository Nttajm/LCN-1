import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGcg43F94bWqUuyLH-AjghrAfduEVQ8ZM",
  authDomain: "overunder-ths.firebaseapp.com",
  projectId: "overunder-ths",
  storageBucket: "overunder-ths.firebasestorage.app",
  messagingSenderId: "690530120785",
  appId: "1:690530120785:web:36dc297cb517ac76cb7470",
  measurementId: "G-Q30T39R8VY"
};

// Retrieve user data from localStorage or set default values
const userData = JSON.parse(localStorage.getItem('userData') || '{}');
const balanceAdder = parseFloat(localStorage.getItem('balanceAdder') || '0');
const userBets = JSON.parse(localStorage.getItem('userBets') || '[]');

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore(app);

// Reference to the Google sign-in button
const loginBtn = document.querySelector('.googleButton');

// Handle Google sign-in
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
  
      // Reference the user's document in Firestore
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
  
      // If the user doesn't exist in Firestore, create a new document
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          profilePicture: user.photoURL,
          createdAt: new Date(),
          balanceAdder: balanceAdder,
          ...userData,   // Spread existing user data properties from localStorage
          tripleABets: userBets,
  
        });
        console.log("New user created in Firestore");
      } else {
        getFb();
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  
    window.location.reload();
  
  });
}

// Check if the user is already logged in
auth.onAuthStateChanged(async (user) => {
  const googleDiv = document.querySelector('#google-auth-div');

  if (user) {
    googleDiv.style.display = 'none';  // Hide sign-in button if user is signed in

    // Fetch user data from Firestore
    const userRef = doc(db, 'users', user.uid);
    try {
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const userData = docSnap.data();
        // Store user data in localStorage
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('userBets', JSON.stringify(userData.tripleABets) || '[]');
        localStorage.setItem('balanceAdder', userData.balanceAdder);
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.error("Error retrieving user data:", error);
    }
  } else {
    googleDiv.style.display = 'block';  // Show sign-in button if no user is signed in
  }
});

// Reference to the sign-out button
const signOutBtn = document.querySelector('.signOutButton');

// Handle sign-out event
if (signOutBtn) {
  signOutBtn.addEventListener('click', async () => {
    try {
      await auth.signOut();
      console.log("User signed out successfully");

      // Reset UI and clear localStorage
      document.querySelector('#google-auth-div').style.display = 'block';
      localStorage.removeItem('userData');
      localStorage.removeItem('balanceAdder');
      localStorage.removeItem('userBets');
    } catch (error) {
      console.error("Error signing out:", error);
    }

    window.location.reload();
  });
}

const profileDiv = document.querySelector('.profile');
// Helper function to update user data in Firestore and localStorage
export async function getFb() {
  const user = auth.currentUser;
  const profileImg = document.querySelector('#google-auth-pfp');  
  if (!user) {
    return;
  }

  const userRef = doc(db, 'users', user.uid);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const userData = docSnap.data();
      const profilePicture = userData.profilePicture || 'https://via.placeholder.com/150';
      
      console.log(profilePicture)
      
      if (profileImg) {
        console.log("Setting profile image source:", profilePicture);  // Debugging log
        profileImg.src = profilePicture;
      } else {
        console.error("Profile image element not found");  // Debugging log
      }

      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('balanceAdder', userData.balanceAdder);
      localStorage.setItem('userBets', JSON.stringify(userData.tripleABets || []));
    } else {
      console.log("No such document!");
    }
  } catch (error) {
    console.error("Error updating user data:", error);
  }
}

// different handling for auth state change

onAuthStateChanged(auth, (user) => {

  const googleDiv = document.querySelector('#google-auth-div');

  if (user) {
    profileDiv.style.display = 'flex';
    googleDiv.style.display = 'none'; 

  } else {
    console.error("No user is signed in");
    profileDiv.style.display = 'none';
    googleDiv.style.display = 'block';
  }
});


export async function updateFb() {
  const user = auth.currentUser;
  
  if (!user) {
    console.error("User not signed in");
    return;
  }

  // Retrieve the latest data from localStorage
  const latestUserData = JSON.parse(localStorage.getItem('userData') || '{}');
  const latestBalanceAdder = parseFloat(localStorage.getItem('balanceAdder') || '0');
  const latestUserBets = JSON.parse(localStorage.getItem('userBets') || '[]');
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const userRef = doc(db, 'users', user.uid);

  try {
    await setDoc(
      userRef,
      {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        profilePicture: user.photoURL,
        createdAt: new Date(),
        balanceAdder: latestBalanceAdder,
        dailyTime: userData.dailyTime ?? null,  // Set to null if undefined
        tripleABets: latestUserBets,
        userBets: userData.userBets ?? null,  // Set to null if undefined
        username: userData.username ?? null,   // Set to null if undefined
        hasUpdated: true,
      },
      { merge: true }
    );  // Use merge to update fields without overwriting the whole document

    console.log("User data updated in Firestore");
  } catch (error) {
    console.error("Error updating user data in Firestore:", error);
  }
}



getFb();

// Export the user's data collection
// export const usersCollection = db.collection('users');
