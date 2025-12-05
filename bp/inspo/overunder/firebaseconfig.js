
// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc,getDocs, addDoc, collection, getCountFromServer, query  } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { openSite, saveData, updateBalanceAdder, uiAndBalance, updateStatsUI } from "./global.js";

openSite();

// Firebase configuration
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




calculateRankOnAntiC();

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
       updateFb();
       getFb();

      saveData();

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
          hasUpdated: true,
          version: 'FB: 1.9.8',
          userStocks: user.userStocks || [],  // Set to empty array if undefined
          username: user.username || null,   // Set to null if undefined
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

export let rank;

export async function getRank() {
  const user = userData;
  if (!user) {
    console.error("User not signed in -- getRank");
    return;
  }

  const userRankRef = doc(db, 'users', user.uid, 'altData', 'userRank');
  const docSnap = await getDoc(userRankRef);

  if (docSnap.exists()) {
    return docSnap.data().rank + docSnap.data().rankAdder;
  } else {
    console.log("No such document! -- getRank");
  }
}
 
async function initRank() {
  if (userData.uid) {
    const userRankRef = doc(db, 'users', userData.uid, 'altData', 'userRank');
    const docSnap = await getDoc(userRankRef);
  
    if (!docSnap.exists()) {
      await setDoc(userRankRef, { 
        rank: 0,     
        rankAdder: 0, 
      });
      rank = 0;
    } else {
      rank = Math.round(docSnap.data().rankAdder) + Math.round(docSnap.data().rank); 
    }
    updateStatsUI();

  }
}

initRank();

export let fKeysAdder = 0;

export async function initKeys() {
  if (userData.uid) {
    const userKeysRef = doc(db, 'users', userData.uid, 'altData', 'userKeys');
    const docSnap = await getDoc(userKeysRef);
  
    if (!docSnap.exists()) {
      await setDoc(userKeysRef, {
        keys: 0,
      });
      fKeysAdder = 0;
    } else {
      fKeysAdder = Math.round(docSnap.data().keys); 
    }
    updateStatsUI();

  }
}

export async function getFirebaseKeys() {
  if (userData.uid) {
    const userKeysRef = doc(db, 'users', userData.uid, 'altData', 'userKeys');
    const docSnap = await getDoc(userKeysRef);
  
    if (!docSnap.exists()) {
      return 0;
    } else {
      return Math.round(docSnap.data().keys); 
    }
  }
}

initKeys();

export async function addKeys(keys) {
  const user = userData;
  if (!user) {
    console.error("User not signed in -- addKeys");
    return;
  }

  const keysSpan = document.getElementById('js-keys');
  if (keysSpan) keysSpan.textContent = keys;

  const userKeysRef = doc(db, 'users', userData.uid, 'altData', 'userKeys');
  try {
    await setDoc(userKeysRef, { keys: keys }, { merge: true });
    console.log("--- addKeys");
  } catch (error) {
    console.error("Error updating user keys:", error);
  }
}


export async function addRank(rank) { 
  const user = userData;
  if (!user) {
    console.error("User not signed in -- addRank");
    return;
  }

  const userRankRef = doc(db, 'users', user.uid, 'altData', 'userRank');
  try {
    await setDoc(userRankRef, { rankAdder: rank }, { merge: true });
    console.log("---");
  } catch (error) {
    console.error("Error updating user rank:", error);
  }
}


export async function rankUi(rank) { 
  const user = userData;
  if (!user) {
    console.error("User not signed in -- addRank");  
    return;
  }  
 
  const userRankRef = doc(db, 'users', user.uid, 'altData', 'userRank');
  const docSnap = await getDoc(userRankRef);
  const newRank = (docSnap.data().rankAnti || 0) + (rank || 0);   
  try {
    await setDoc(userRankRef, { rankAnti: newRank }, { merge: true });   
    console.log("--- rankUi");
  } catch (error) {
    console.error("Error updating user rank:", error);     
  }
} 

async function calculateRankOnAntiC() {  
  const userid = userData.uid;

  if (!userid) {
    console.error(" -- calculateRankOnAntiC");
    return;
  }
  const userAntiCRefCount = doc(db, 'users', userid, 'altData', 'userRank');
  const docSnap = await getDoc(userAntiCRefCount);


  try {
    // Use Firestore's count() function
    const antiCDataLength = docSnap.data().rankAnti || 0;  

    // Define thresholds and corresponding ranks
    const rankThresholds = [
      { threshold: 5500, rank: 4500 },
      { threshold: 5100, rank: 4000 },
      { threshold: 4800, rank: 3500 },
      { threshold: 4200, rank: 3000 },
      { threshold: 3900, rank: 2500 },
      { threshold: 3300, rank: 2000 },
      { threshold: 3000, rank: 1500 },
      { threshold: 2700, rank: 1200 },
      { threshold: 2000, rank: 800 },
      { threshold: 1400, rank: 700 },
      { threshold: 1000, rank: 600 },
      { threshold: 700, rank: 500 },
      { threshold: 400, rank: 400 },
      { threshold: 200, rank: 300 },
      { threshold: 100, rank: 200 },
      { threshold: 50, rank: 100 },
      { threshold: 30, rank: 50 },
      { threshold: 10, rank: 10 },
      { threshold: 0, rank: 0 },
    ];

    // Find the two thresholds that the data length falls between
    let lower = rankThresholds.find(rt => antiCDataLength >= rt.threshold);
    let upper = rankThresholds.find(rt => antiCDataLength < rt.threshold);

    if (!upper) {
      upper = { threshold: lower.threshold + 1, rank: lower.rank };
    }

    const interpolatedRank = lower.rank + 
      ((antiCDataLength - lower.threshold) / (upper.threshold - lower.threshold)) * (upper.rank - lower.rank);

    addRank(interpolatedRank);
  } catch (error) {
    console.error("Error calculating rank:", error);
  }
}


// Check if the user is already logged in
auth.onAuthStateChanged(async (user) => {
  const googleDiv = document.querySelector('#google-auth-div');
  if (googleDiv && user) {
    googleDiv.style.display = 'none';  // Hide sign-in button if user is signed in
    // Fetch user data from Firestore
    const userRef = doc(db, 'users', user.uid);
    try {
      getFb();
      calculateRankOnAntiC();
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
  } else if (googleDiv) {
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
      const googleDiv = document.querySelector('#google-auth-div');
      if (googleDiv) googleDiv.style.display = 'block';
      localStorage.removeItem('userData');
      localStorage.removeItem('balanceAdder');
      localStorage.removeItem('userBets');
      localStorage.removeItem('gameData');

    } catch (error) {
      console.error("Error signing out:", error);
    }
    window.location.reload();
  });
}

const profileDiv = document.querySelector('.profile');

// Helper function to update user data in Firestore and localStorage
export async function getFb() {
  onAuthStateChanged(auth, async (user) => {

  if (!user) {
    console.error("User not signed in -- getFb");
    return;
  }   

  updateStatsUI();
  const userRef = doc(db, 'users', user.uid);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const userData = docSnap.data();
      // Do not save fbban into localStorage
      const { FBban, ...userDataWithoutFbban } = userData;

      localStorage.setItem('userData', JSON.stringify(userDataWithoutFbban));
      localStorage.setItem('balanceAdder', userData.balanceAdder);
      localStorage.setItem('userBets', JSON.stringify(userData.tripleABets || []));
      localStorage.setItem('gameData', JSON.stringify(userData.gameData || {}));
      console.log("--- pll");
    } else {
      console.log("No such document! -- getFb");
    }
  } catch (error) {
    console.error("Error updating user data --getFb:", error);
  }
  });
}



const dailyDiv = document.getElementById('daily-reward')
// different handling for auth state change
onAuthStateChanged(auth, () => {
  const user = auth.currentUser;
  const googleDiv = document.querySelector('#google-auth-div');
  if (profileDiv && googleDiv) {
    if (user) {
      profileDiv.style.display = 'flex';
      googleDiv.style.display = 'none';
      dailyDiv.style.display = 'flex'
    } else {
      console.error("No user is signed in");
      profileDiv.style.display = 'none';
      googleDiv.style.display = 'block';
      dailyDiv.style.display = 'none'
    }
  }
});



export async function updateFb() {
  onAuthStateChanged(auth, async (user) => { 
  if (!user) {
    console.error("User not signed in -- updateFb");
    return;
  }

  const latestUserData = JSON.parse(localStorage.getItem('userData') || '{}');
  const latestBalanceAdder = parseFloat(localStorage.getItem('balanceAdder') || '0');
  const latestUserBets = JSON.parse(localStorage.getItem('userBets') || '[]');
  
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
        dailyTime: latestUserData.dailyTime ?? null,  // Set to null if undefined
        tripleABets: latestUserBets,
        userBets: latestUserData.userBets ?? null,  // Set to null if undefined
        username: latestUserData.username ?? null,   // Set to null if undefined
        hasUpdated: true,
        version: 'FB: 1.9.8',
        userStocks: latestUserData.userStocks ?? [],  // Set to null if undefined
        gameData: latestUserData.gameData ?? null,  // Set to null if undefined
        orders: latestUserData.orders ?? [],  // Set to null if undefined
        ban: latestUserData.ban ?? false,
      },
      { merge: true }
    );  // Use merge to update fields without overwriting the whole document
    console.log("---phs");

  } catch (error) {
    console.error("Error updating user data in Firestore --updateFb:", error);
  }
   });
}

// Call getFb to initialize




/// without local storage

export function addBalance(amount) {
  const user = auth.currentUser;
  if (!user) {
    console.error("User not signed in");
    return;
  }
  const userRef = doc(db, 'users', user.uid);
  try {
    setDoc(
      userRef,
      { balanceAdder: balanceAdder + amount },
      { merge: true }
    );
    console.log("Balance updated successfully");
  } catch (error) {
    console.error("Error updating balance:", error);
  }
}

export function updateBalanceAdderFB(newBalance) {
  const user = auth.currentUser;
  if (!user) {
    console.error("User not signed in");
    return;
  }
  const userRef = doc(db, 'users', user.uid);
  try {
    setDoc(
      userRef,
      { balanceAdder: newBalance },
      { merge: true }
    );
    console.log("Balance updated successfully");
  } catch (error) {
    console.error("Error updating balance:", error);
  }
}

function isUserSignedIn() {
  return !!auth.currentUser;
}

export async function checkIfisBanned() {


setInterval(await checkLoans, 6000);
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  // const betatesters = [
  //   'joelmulonde81@gmail.com',
  //   'nlfjoelalt@gmail.com',
  //   `ironiclly.vf@gmail.com`,
  //   `joel.mulonde@crpusd.org`,
  //   'jordan.herrera@crpusd.org',
  //   'harrison.matticola@crpusd.org',
  //   'acebrodhunludke@gmail.com',
  //   'dagan.prusky@crpusd.org',
  //   'lucca.chen@crpusd.org',    
  //   `d.angeleshernandez@crpusd.org`,
  // ]
  // const currentUserEmail =  userData.email;

  // if (!betatesters.includes(currentUserEmail)) {
  //   window.location.href = 'https://lcnjoel.com/ouths/info.html';
  // }

  onAuthStateChanged(auth, async (user) => {
  if (!user.uid) {
      console.error("Invalid user data from local storage. -- is banned");
      return;
  }

  if (userData.balanceAdder > 12000000) {
      const userRef = doc(db, 'users', userData.uid);
      try {
          await setDoc(userRef, {
              balanceAdder: 'omg',
              dailyTime: null,
              tripleABets: [],
              userBets: null,
              username: null,
              hasUpdated: false,
              version: '',
              userStocks: [],
              gameData: null,
              orders: [],
              ban: true,
          }, { merge: true });

          window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
      } catch (error) {
          console.error("Error updating user data:", error);
      }
  }

  
      if (user) {
          const userRef = doc(db, 'users', user.uid);
          try {
              const docSnap = await getDoc(userRef);
              if (docSnap.exists()) {
                  const userDataI = docSnap.data();
                  if (userDataI.FBban) {
                      await setDoc(userRef, {
                          balanceAdder: 0,
                          dailyTime: null,
                          tripleABets: [],
                          userBets: null,
                          username: null,
                          hasUpdated: false,
                          version: '',
                          userStocks: [],
                          gameData: null,
                          orders: [],
                          ban: true,
                      }, { merge: true }); 

                      window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
                  }
              } else {
                  console.log("No such document!");
              }
          } catch (error) {
              console.error("Error retrieving user data:", error);
          }
      }
  });
}



checkIfisBanned()

if (userData.FBban) {
localStorage.removeItem('userData');
const { FBban, email } = userData;
localStorage.setItem('userData', JSON.stringify({ FBban, email }));
  window.location.href = 'https://parismou.org/PMoU-Procedures/Library/banning';
}

export function antiC(name, description) {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const userUid = userData.uid; 

  if (!userUid) {
    console.error("Invalid user data from local storage. -- antiC");
    return;
  }

  // Set default values if parameters are not provided
  const currentUrl = window.location.href;
  const finalName = name !== undefined ? name : `URL: ${currentUrl}`;
  const finalDescription = description !== undefined ? description : `Time: ${new Date().toISOString()}`;

  // Reference to the 'antiC' collection within the user's document
  const userAntiCRef = collection(db, 'users', userUid, 'antiC');

  try {
    // Add a new document with unique ID in the 'antiC' collection
    addDoc(userAntiCRef, {
      name: finalName,
      description: finalDescription,
      date : new Date().toISOString(),
    });
    rankUi(1);   
    console.log("New AntiC entry added successfully");
  } catch (error) {
    console.error("Error adding new AntiC entry:", error);
  }
}


export async function checkLoans() {
  const loansRef = collection(db, 'users', userData.uid, 'loans');
  const snapshot = await getDocs(loansRef);

  snapshot.forEach(async (docSnap) => {
      const data = docSnap.data();
      if (data.status === 'active' && data.payby.toDate() < new Date()) {
          setDoc(doc(db, 'users', userData.uid, 'loans', docSnap.id), { status: 'overdue' }, { merge: true });
          uiAndBalance(-data.amount);
          await myloans();
          saveData();
      }
  });
}

