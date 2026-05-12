import { auth, db, googleProvider } from "./firebase.js";
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const MODAL_HTML = `
<div class="auth-overlay" id="authOverlay">
    <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authHeading">
        <div class="auth-modal-top">
            <button class="auth-modal-close" id="authModalClose" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
            <div class="auth-modal-logo">
                <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="28" height="28" rx="4" fill="rgba(255,255,255,0.15)"/>
                    <text x="6" y="20.5" font-family="Georgia,serif" font-weight="700" font-size="18" fill="white">T</text>
                </svg>
                <span class="auth-modal-logo-name">Titan Games</span>
            </div>
            <h2 class="auth-modal-heading" id="authHeading">Welcome back.</h2>
            <p class="auth-modal-sub">Sign in to save streaks and track your scores.</p>
        </div>
        <div class="auth-modal-body">
            <button class="auth-google-btn" id="authGoogleBtn">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
            </button>
            <div class="auth-divider"><span>or</span></div>
            <div class="auth-error" id="authError"></div>
            <form class="auth-form" id="authForm" novalidate>
                <div class="auth-field" id="authNameField" style="display:none">
                    <label for="authName">Full Name</label>
                    <input type="text" id="authName" placeholder="Your name" autocomplete="name"/>
                </div>
                <div class="auth-field">
                    <label for="authEmail">Email</label>
                    <input type="email" id="authEmail" placeholder="you@example.com" autocomplete="email" required/>
                </div>
                <div class="auth-field">
                    <label for="authPassword">Password</label>
                    <input type="password" id="authPassword" placeholder="••••••••" autocomplete="current-password" required/>
                </div>
                <button class="auth-submit-btn" type="submit" id="authSubmitBtn">Sign In</button>
            </form>
            <div class="auth-toggle" id="authToggle">
                No account? <button type="button" id="authModeSwitch">Create one</button>
            </div>
        </div>
    </div>
</div>
`;

async function saveNewUser(user) {
    const ref = doc(db, "titan_users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return;
    await setDoc(ref, {
        uid: user.uid,
        displayName: user.displayName || null,
        email: user.email,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp()
    });
}

function getInitials(name) {
    if (!name) return "?";
    return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function buildHeaderUser(user) {
    const existing = document.getElementById("authHeaderUser");
    if (existing) existing.remove();

    const loginBtn = document.getElementById("authLoginBtn");
    if (loginBtn) loginBtn.style.display = "none";

    const wrapper = document.createElement("div");
    wrapper.id = "authHeaderUser";
    wrapper.style.position = "relative";

    const btn = document.createElement("button");
    btn.className = "auth-header-user";
    btn.setAttribute("aria-label", "Account menu");

    const avatar = document.createElement("div");
    avatar.className = "auth-avatar";

    if (user.photoURL) {
        const img = document.createElement("img");
        img.src = user.photoURL;
        img.alt = user.displayName || "User";
        avatar.appendChild(img);
    } else {
        avatar.textContent = getInitials(user.displayName || user.email);
    }

    btn.appendChild(avatar);

    const dropdown = document.createElement("div");
    dropdown.className = "auth-user-dropdown";
    dropdown.id = "authDropdown";
    dropdown.innerHTML = `
        <div class="auth-user-dropdown-name">
            <strong>${user.displayName || "Player"}</strong>
            <span>${user.email}</span>
        </div>
        <button class="auth-user-dropdown-signout" id="authSignOutBtn">Sign Out</button>
    `;

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdown);

    const headerRight = document.querySelector(".header-right");
    if (headerRight) headerRight.prepend(wrapper);

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("open");
    });

    document.addEventListener("click", () => dropdown.classList.remove("open"), { passive: true });

    document.getElementById("authSignOutBtn").addEventListener("click", () => {
        signOut(auth);
        dropdown.classList.remove("open");
    });
}

function restoreLoginBtn() {
    const userEl = document.getElementById("authHeaderUser");
    if (userEl) userEl.remove();
    const loginBtn = document.getElementById("authLoginBtn");
    if (loginBtn) loginBtn.style.display = "";
}

function showError(msg) {
    const el = document.getElementById("authError");
    el.textContent = msg;
    el.classList.add("visible");
}

function clearError() {
    const el = document.getElementById("authError");
    el.textContent = "";
    el.classList.remove("visible");
}

function setLoading(loading) {
    const btn = document.getElementById("authSubmitBtn");
    const googleBtn = document.getElementById("authGoogleBtn");
    if (!btn) return;
    btn.disabled = loading;
    googleBtn.disabled = loading;
    if (loading) {
        btn.innerHTML = `<span class="auth-loading-spinner"></span>`;
    } else {
        const isCreate = document.getElementById("authNameField").style.display !== "none";
        btn.textContent = isCreate ? "Create Account" : "Sign In";
    }
}

function parseFirebaseError(code) {
    const map = {
        "auth/user-not-found": "No account found with that email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/popup-closed-by-user": "",
        "auth/cancelled-popup-request": "",
        "auth/invalid-credential": "Incorrect email or password."
    };
    return map[code] || "Something went wrong. Please try again.";
}

function initAuth() {
    if (document.getElementById("authOverlay")) return;

    document.body.insertAdjacentHTML("beforeend", MODAL_HTML);

    const overlay = document.getElementById("authOverlay");
    let isCreateMode = false;

    function openModal() {
        overlay.classList.add("open");
        document.body.style.overflow = "hidden";
        setTimeout(() => document.getElementById("authEmail").focus(), 100);
    }

    function closeModal() {
        overlay.classList.remove("open");
        document.body.style.overflow = "";
        clearError();
        document.getElementById("authForm").reset();
    }

    const loginBtn = document.getElementById("authLoginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", openModal);
    }

    document.getElementById("authModalClose").addEventListener("click", closeModal);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
    });

    document.getElementById("authModeSwitch").addEventListener("click", () => {
        isCreateMode = !isCreateMode;
        const heading = document.getElementById("authHeading");
        const nameField = document.getElementById("authNameField");
        const submitBtn = document.getElementById("authSubmitBtn");
        const toggleText = document.getElementById("authToggle");
        const passwordInput = document.getElementById("authPassword");

        if (isCreateMode) {
            heading.textContent = "Create account.";
            nameField.style.display = "flex";
            submitBtn.textContent = "Create Account";
            toggleText.innerHTML = `Already have one? <button type="button" id="authModeSwitch">Sign in</button>`;
            passwordInput.setAttribute("autocomplete", "new-password");
        } else {
            heading.textContent = "Welcome back.";
            nameField.style.display = "none";
            submitBtn.textContent = "Sign In";
            toggleText.innerHTML = `No account? <button type="button" id="authModeSwitch">Create one</button>`;
            passwordInput.setAttribute("autocomplete", "current-password");
        }

        clearError();
        document.getElementById("authModeSwitch").addEventListener("click", arguments.callee);
    });

    document.getElementById("authGoogleBtn").addEventListener("click", async () => {
        clearError();
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await saveNewUser(result.user);
            closeModal();
        } catch (err) {
            const msg = parseFirebaseError(err.code);
            if (msg) showError(msg);
        } finally {
            setLoading(false);
        }
    });

    document.getElementById("authForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        clearError();

        const email = document.getElementById("authEmail").value.trim();
        const password = document.getElementById("authPassword").value;
        const name = document.getElementById("authName").value.trim();

        if (!email || !password) return;

        setLoading(true);
        try {
            if (isCreateMode) {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                if (name) {
                    await updateProfile(cred.user, { displayName: name });
                }
                await saveNewUser({ ...cred.user, displayName: name || null });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            closeModal();
        } catch (err) {
            showError(parseFirebaseError(err.code));
        } finally {
            setLoading(false);
        }
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            buildHeaderUser(user);
        } else {
            restoreLoginBtn();
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
} else {
    initAuth();
}

window.openAuthModal = () => {
    const overlay = document.getElementById("authOverlay");
    if (overlay) {
        overlay.classList.add("open");
        document.body.style.overflow = "hidden";
    }
};
