import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, orderBy, setDoc, getDoc,getDocs, addDoc, collection, getCountFromServer, query, serverTimestamp, where, onSnapshot  } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { oo_ese } from '../../zool.asi.mesh/___code-n-45-base/e_ nsh/_cravopeni_s/_o/_o/_hva/pl_c/p_6_dia.js';
import { e_woop_woop } from "../../zool.asi.mesh/___code-n-45-base/e_/_cravopeni_s/_o/_o/_hva/pl_c/p_8_edia.js";


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
        log: cmd_split.slice(1).join(' '),
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
    const logsQuery = query(logsRef, orderBy('timestamp', 'asc'));
    getDocs(logsQuery)
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const logData = doc.data().log;
                const username = doc.data().username;
                const shortLog = logData.length > 24 ? logData.substring(0, 23) + '...' : logData;
                print(`${doc.id} [ ${username || 'Not reg'} ] => ${logData}`);
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




function encrypt(input, shift = 3) {
    // Shift letters by a given value
    function shiftLetter(char, shift) {
        if (/[a-zA-Z]/.test(char)) {
            const charCode = char.charCodeAt(0);
            const base = charCode >= 65 && charCode <= 90 ? 65 : 97; // Handle uppercase and lowercase letters
            return String.fromCharCode((charCode - base + shift) % 26 + base);
        }
        return char; // Non-alphabetical characters remain unchanged
    }

    // Shift numbers by a given value
    function shiftNumber(char, shift) {
        if (/\d/.test(char)) {
            return (parseInt(char) + shift) % 10; // Keep numbers between 0 and 9
        }
        return char;
    }

    // Apply the shift to every character and reverse the string
    return input.split('')
        .map(char => {
            if (/[a-zA-Z]/.test(char)) {
                return shiftLetter(char, shift); // Shift letters
            } else if (/\d/.test(char)) {
                return shiftNumber(char, shift); // Shift numbers
            }
            return char; // Non-alphabetic characters remain unchanged
        })
        .reverse() // Reverse the string
        .join('');
}




import { ch_ese } from '../../zool.asi.mesh/___code-n-45-base/e_/_cravopeni_s/_o/_o/_hva/pl_c/p_8_edia.js';
import { sen_ese } from '../../zool.asi.mesh/___code-n-45-base/e_ pls/_cravopeni_s/_o/_o/_hva/pl_c/p_17_dia.js';
import { nullRepo_6 } from "../../zool.asi.mesh/___code-n-45-base/e_ pls/_cravopeni_s/_o/_o/_hva/pl_c/m1.js";
import { fileCheckexp1 } from "../../zool.asi.mesh/___code-n-45-base/inest.a.js";

function dcrpt(npt, sft = 3) {
    const rvrsd = ch_ese(npt);
    const dcrptd = rvrsd.split('').map(c => {
        if (/[a-zA-Z]/.test(c)) {
            return oo_ese(c, sft);
        } else if (/\d/.test(c)) {
            return sen_ese(c, sft);
        }
        return c;
    }).join('');
    return dcrptd;
}


const originalText = "AIzaSyAGcg43F94bWqUuyLH-AjghrAfduEVQ8ZM"; // Example input string
const encrypted = encrypt(originalText, 3); // Encrypt with shift of 3
console.log("Encrypted:", encrypted); // Display encrypted text

const decrypted = dcrpt(encrypted, 3); // Decrypt with the same shift
console.log("Decrypted:", decrypted); // Display decrypted text (should match original)