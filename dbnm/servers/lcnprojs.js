import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, orderBy, setDoc, getDoc,getDocs, addDoc, collection, getCountFromServer, query, serverTimestamp, where, onSnapshot  } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


const serverMainConfig = {
    firebaseConfig: {
        apiKey: "AIzaSyDdV8dc3X5AKYMAkh6nQILYQUBpmJDGwf0",
        authDomain: "joelsnotesapp.firebaseapp.com",
        projectId: "joelsnotesapp",
        storageBucket: "joelsnotesapp.firebasestorage.app",
        messagingSenderId: "1043222135072",
        appId: "1:1043222135072:web:32115e8e8768bf26c2d745",
        measurementId: "G-F13TDHJBWR"
      },
    info: {
        name: 'lcnjoelprojects',
        desc: 'servers',
        use: 'any'
    }
};

const firebaseConfig = serverMainConfig.firebaseConfig;
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// lcn joel projects supports:
// chatchat 
// chatbot
// logger 
// passgen
// firebaseConfig

// - joel mulonde 2025

let username = localStorage.getItem('username') || 'user';
let reRender = false;
_reg('logger',(_, cmd_split) => {
    const logRef = collection(db, 'logs');
    const logData = {
        username,
        log: cmd_split[1],
        timestamp: serverTimestamp()
    };

    if (cmd_split[1] === 'repeat') {
        reRender = true;
    }

    addDoc(logRef, logData)
        .then(() => {
            print('Log added successfully.');
            if (reRender) {
                handleCommand('logs');
            }
        })
        .catch((error) => {
            print(`Error adding log: ${error}`);
        });
});

_reg('logs', () => {
    const logsRef = collection(db, 'logs');
    const logsQuery = query(logsRef, orderBy('timestamp', 'desc'));
    getDocs(logsQuery)
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const logData = doc.data().log;
                const username = doc.data().username;
                const shortLog = logData.length > 24 ? logData.substring(0, 23) + '...' : logData;
                print(`${doc.id} [ ${username || 'Not reg'} ] => ${shortLog}`);
            });
        })
        .catch((error) => {
            print(`Error getting logs: ${error}`);
        });
});

_reg('logElive', () => {
    const logsRef = collection(db, 'logs');
    onSnapshot(logsRef, (querySnapshot) => {
        querySnapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                print(`New log: ${change.doc.data().log}`);
            }
        });
    });
});

let send = false;

_reg('send_true', (_, cmd_split) => {
    send = true;
    print('Send allowed. Be careful...');
    setInterval(checkSend, 2000);
});

function checkSend() {
    if (!send) {
        return;
    }
    const sendCol = collection(db, 'send');
    const fourSecondsAgo = new Date(Date.now() - 4000);
    const sendColq = query(sendCol, where('timestamp', '>=', fourSecondsAgo));
    getDocs(sendColq)
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                if (send) {
                    handleCommand(doc.data().message);
                }
            });
        })
        .catch((error) => {
            print(`Error checking send: ${error}`);
        });
}

_reg('send', (_, cmd_split) => {
    const sendCol = collection(db, 'send');
    const message = cmd_split.slice(2).join(' ');
    const sendDoc = {
        username: cmd_split[1],
        message: message,
        timestamp: serverTimestamp(),
    };

    addDoc(sendCol, sendDoc)
        .then(() => {
            print('Message sent.');
        })
        .catch((error) => {
            print(`Error sending message: ${error}`);
        });
});


