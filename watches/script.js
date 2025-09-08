import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  update,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let allTimers = {};

window.signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
  } catch (error) {
    console.error('Sign in failed:', error);
  }
};

window.logout = async () => {
  try {
    await signOut(auth);
    currentUser = null;
    showAuthSection();
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    showUserInterface(user);
    checkUserTimer(user);
    listenToAllTimers();
  } else {
    currentUser = null;
    showAuthSection();
  }
});

function showAuthSection() {
  document.getElementById('authSection').classList.remove('hidden');
  document.getElementById('setupSection').classList.add('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('resetBtn').classList.add('hidden');
  document.getElementById('userInfo').classList.add('hidden');
}

function showUserInterface(user) {
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('userInfo').classList.remove('hidden');
  document.getElementById('userEmail').textContent = user.email;
}

function checkUserTimer(user) {
  const userRef = ref(database, `timers/${user.uid}`);
  onValue(
    userRef,
    (snapshot) => {
      const userData = snapshot.val();
      if (userData && userData.startTime) {
        showDashboard();
      } else {
        showSetupSection();
      }
    },
    (err) => {
      console.error('checkUserTimer read failed:', err);
      showSetupSection(); // fallback to setup section so UI doesn't stay blank
    }
  );
}

function showSetupSection() {
  document.getElementById('setupSection').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('resetBtn').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('setupSection').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('resetBtn').classList.remove('hidden');
}

window.startTimer = async () => {
  if (!currentUser) return;

  const days = parseInt(document.getElementById('days').value) || 0;
  const hours = parseInt(document.getElementById('hours').value) || 0;
  const minutes = parseInt(document.getElementById('minutes').value) || 0;

  const initialTime =
    days * 24 * 60 * 60 * 1000 +
    hours * 60 * 60 * 1000 +
    minutes * 60 * 1000;

  const startTime = Date.now() - initialTime;

  try {
    await set(ref(database, `timers/${currentUser.uid}`), {
      email: currentUser.email,
      startTime: startTime, // could use serverTimestamp() if you want server time
      isConfigured: true
    });
    showDashboard();
  } catch (error) {
    console.error('Failed to start timer:', error);
    alert('Failed to start timer. Check database rules.');
  }
};

window.resetTimer = async () => {
  if (!currentUser) return;

  if (confirm('Are you sure you want to reset your timer to zero?')) {
    try {
      await update(ref(database, `timers/${currentUser.uid}`), {
        startTime: Date.now() // or serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to reset timer:', error);
      alert('Failed to reset timer. Check database rules.');
    }
  }
};

function listenToAllTimers() {
  const timersRef = ref(database, 'timers');
  onValue(
    timersRef,
    (snapshot) => {
      const data = snapshot.val();
      allTimers = data || {};
      updateTimersDisplay();
    },
    (err) => console.error('listenToAllTimers read failed:', err)
  );
}

function updateTimersDisplay() {
  const grid = document.getElementById('timersGrid');
  grid.innerHTML = '';

  Object.values(allTimers).forEach((timer) => {
    if (timer.startTime) {
      const card = createTimerCard(timer);
      grid.appendChild(card);
    }
  });
}

function createTimerCard(timer) {
  const card = document.createElement('div');
  card.className = 'timer-card';

  const email = document.createElement('div');
  email.className = 'user-email';
  email.textContent = timer.email;

  const display = document.createElement('div');
  display.className = 'timer-display';

  card.appendChild(email);
  card.appendChild(display);

  function updateDisplay() {
    const elapsed = Date.now() - timer.startTime;
    display.textContent = formatTime(elapsed);
  }

  updateDisplay();
  setInterval(updateDisplay, 1000);

  return card;
}

function formatTime(ms) {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  return `${days}d ${hours}h ${minutes}m`;
}

setInterval(() => {
  if (!document.getElementById('dashboard').classList.contains('hidden')) {
    updateTimersDisplay();
  }
}, 1000);
