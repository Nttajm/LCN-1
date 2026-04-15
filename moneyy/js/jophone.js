/* ── JoPhone 1 — GTA Cheap Phone Logic ── */
const JoPhone = (() => {
    let phoneEl, screenBody, toastContainer;
    let currentView = "home";
    let prevView = "home";
    let dialerValue = "";
    let notifCounts = { unread: 0 };
    let clockInterval;
    let messages = [];      // { id, from, body, time, read }
    let activeThread = null; // sender name for thread view
    let composeTarget = "";  // who we're composing to

    const contacts = [
        { name: "Lester", number: "555-0143", emoji: "🤓" },
        { name: "Big T", number: "555-0177", emoji: "💪" },
        { name: "Mama", number: "555-0101", emoji: "👩" },
        { name: "DeShawn", number: "555-0199", emoji: "🧢" },
        { name: "Hustler Mike", number: "555-0234", emoji: "💰" },
        { name: "Junkyard Dave", number: "555-0088", emoji: "🔧" },
        { name: "Corner Store", number: "555-0050", emoji: "🏪" },
    ];

    function init() {
        buildHTML();
        bindEvents();
        startClock();
    }

    function buildHTML() {
        // Toggle button
        const toggle = document.createElement("button");
        toggle.className = "jophone-toggle";
        toggle.id = "jophone-toggle";
        toggle.innerHTML = "📱";
        toggle.title = "JoPhone 1";
        document.body.appendChild(toggle);

        // Phone wrap
        phoneEl = document.createElement("div");
        phoneEl.className = "jophone-wrap";
        phoneEl.id = "jophone-wrap";
        phoneEl.innerHTML = `
        <div class="jophone">
            <!-- Top bezel -->
            <div class="jophone-top-bezel">
                <span class="jophone-brand">JoPhone 1</span>
            </div>

            <!-- Screen -->
            <div class="jophone-screen">
                <!-- Status bar -->
                <div class="jophone-statusbar">
                    <span class="jophone-carrier">Los Santos</span>
                    <div class="jophone-status-right">
                        <div class="jophone-signal">
                            <div class="jophone-signal-bar" style="height:3px"></div>
                            <div class="jophone-signal-bar" style="height:5px"></div>
                            <div class="jophone-signal-bar" style="height:7px"></div>
                            <div class="jophone-signal-bar" style="height:10px"></div>
                        </div>
                        <div class="jophone-battery"><div class="jophone-battery-fill"></div></div>
                    </div>
                </div>

                <!-- Notif badges -->
                <div class="jophone-notif-badges">
                    <span>💬 <span id="jo-msg-count">0</span> new</span>
                </div>

                <!-- Body (views) -->
                <div class="jophone-body" id="jophone-body">
                    ${buildHomeView()}
                    ${buildPhoneView()}
                    ${buildContactsView()}
                    ${buildSettingsView()}
                    ${buildMessagesView()}
                    ${buildThreadView()}
                    ${buildComposeView()}
                </div>

                <!-- Toast container -->
                <div id="jophone-toast-container"></div>
            </div>

            <!-- Action row -->
            <div class="jophone-action-row">
                <button class="jophone-act-btn jophone-act-green" id="jo-act-add" title="New">＋</button>
                <button class="jophone-act-btn jophone-act-red" id="jo-act-end" title="End / Close">📞</button>
            </div>

            <!-- Bottom bezel (hw buttons) -->
            <div class="jophone-bottom-bezel">
                <span class="jophone-hw-btn" id="jo-hw-menu" title="Menu">☰</span>
                <span class="jophone-hw-btn" id="jo-hw-home" title="Home">○</span>
                <span class="jophone-hw-btn" id="jo-hw-back" title="Back">←</span>
            </div>
        </div>`;
        document.body.appendChild(phoneEl);

        screenBody = document.getElementById("jophone-body");
        toastContainer = document.getElementById("jophone-toast-container");
    }

    /* ── View builders ── */

    function buildHomeView() {
        return `
        <div class="jophone-view active" id="jo-view-home">
            <div class="jophone-home-time">
                <div class="time" id="jo-clock">12:00</div>
                <div class="date" id="jo-date">Mon, Jan 1</div>
            </div>
            <div class="jophone-app-grid">
                <div class="jophone-app-icon" data-app="phone">
                    <div class="ico ico-phone">📞</div>
                    <span class="lbl">Phone</span>
                </div>
                <div class="jophone-app-icon" data-app="contacts">
                    <div class="ico ico-contacts">👤</div>
                    <span class="lbl">Contacts</span>
                </div>
                <div class="jophone-app-icon" data-app="settings">
                    <div class="ico ico-settings">🔧</div>
                    <span class="lbl">Settings</span>
                </div>
                <div class="jophone-app-icon" data-app="messages">
                    <div class="ico ico-messages">💬</div>
                    <span class="lbl">Messages</span>
                </div>
                <div class="jophone-app-icon" data-app="camera">
                    <div class="ico ico-camera">📷</div>
                    <span class="lbl">Camera</span>
                </div>
                <div class="jophone-app-icon" data-app="internet">
                    <div class="ico ico-inet">🌐</div>
                    <span class="lbl">Internet</span>
                </div>
            </div>
        </div>`;
    }

    function buildPhoneView() {
        const keys = [
            ["1", ""], ["2", "ABC"], ["3", "DEF"],
            ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
            ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
            ["*", ""], ["0", "+"], ["#", ""],
        ];
        const pads = keys.map(([k, sub]) =>
            `<button class="jophone-dialpad-btn" data-key="${k}">${k}${sub ? `<span class="sub">${sub}</span>` : ""}</button>`
        ).join("");
        return `
        <div class="jophone-view" id="jo-view-phone">
            <div class="jophone-dialer-display">
                <span class="jophone-dialer-number" id="jo-dialer-num"></span>
            </div>
            <div class="jophone-dialpad">${pads}</div>
            <div class="jophone-dial-actions">
                <button class="jophone-call-btn green" id="jo-dial-call" title="Call">📞</button>
                <button class="jophone-call-btn del" id="jo-dial-del" title="Delete">⌫</button>
                <button class="jophone-call-btn red" id="jo-dial-end" title="End">✕</button>
            </div>
        </div>`;
    }

    function buildContactsView() {
        const rows = contacts.map((c, i) => `
            <div class="jophone-contact-item" data-cidx="${i}">
                <div class="jophone-contact-avatar">${c.emoji}</div>
                <div class="jophone-contact-info">
                    <div class="jophone-contact-name">${c.name}</div>
                    <div class="jophone-contact-num">${c.number}</div>
                </div>
            </div>`).join("");
        return `
        <div class="jophone-view" id="jo-view-contacts">
            <div class="jophone-contacts-title">Contacts</div>
            ${rows}
        </div>`;
    }

    function buildMessagesView() {
        return `
        <div class="jophone-view" id="jo-view-messages">
            <div class="jophone-msg-header">
                <span class="jophone-msg-title">Messages</span>
                <button class="jophone-msg-compose-btn" id="jo-msg-new" title="New message">✏️</button>
            </div>
            <div class="jophone-msg-list" id="jo-msg-list">
                <div class="jophone-msg-empty">No messages yet</div>
            </div>
        </div>`;
    }

    function buildThreadView() {
        return `
        <div class="jophone-view" id="jo-view-thread">
            <div class="jophone-thread-header">
                <button class="jophone-thread-back" id="jo-thread-back">←</button>
                <span class="jophone-thread-name" id="jo-thread-name">...</span>
            </div>
            <div class="jophone-thread-messages" id="jo-thread-msgs"></div>
            <div class="jophone-thread-input-wrap">
                <input class="jophone-thread-input" id="jo-thread-input" placeholder="Type a message..." maxlength="120">
                <button class="jophone-thread-send" id="jo-thread-send">➤</button>
            </div>
        </div>`;
    }

    function buildComposeView() {
        return `
        <div class="jophone-view" id="jo-view-compose">
            <div class="jophone-compose-header">
                <button class="jophone-thread-back" id="jo-compose-back">←</button>
                <span class="jophone-msg-title">New Message</span>
            </div>
            <div class="jophone-compose-contacts" id="jo-compose-contacts"></div>
        </div>`;
    }

    function buildSettingsView() {
        return `
        <div class="jophone-view" id="jo-view-settings">
            <div class="jophone-settings-title">Settings</div>
            <div class="jophone-setting-row">
                <span class="jophone-setting-label">Sound</span>
                <span class="jophone-setting-val">Coming soon</span>
            </div>
            <div class="jophone-setting-row">
                <span class="jophone-setting-label">Vibration</span>
                <span class="jophone-setting-val">Coming soon</span>
            </div>
            <div class="jophone-setting-row">
                <span class="jophone-setting-label">Difficulty</span>
                <span class="jophone-setting-val">Coming soon</span>
            </div>
            <div class="jophone-setting-row">
                <span class="jophone-setting-label">Auto-save</span>
                <span class="jophone-setting-val">Coming soon</span>
            </div>
            <div class="jophone-setting-row">
                <span class="jophone-setting-label">Reset game</span>
                <span class="jophone-setting-val">Coming soon</span>
            </div>
            <div class="jophone-setting-row">
                <span class="jophone-setting-label">About JoPhone 1</span>
                <span class="jophone-setting-val">v1.0</span>
            </div>
        </div>`;
    }

    /* ── Event binding ── */

    function bindEvents() {
        // Toggle phone
        document.getElementById("jophone-toggle").addEventListener("click", togglePhone);

        // App icons
        phoneEl.querySelectorAll(".jophone-app-icon").forEach(icon => {
            icon.addEventListener("click", () => {
                const app = icon.dataset.app;
                if (app === "phone" || app === "contacts" || app === "settings" || app === "messages") {
                    if (app === "messages") renderInbox();
                    switchView(app);
                }
            });
        });

        // Hardware buttons
        document.getElementById("jo-hw-home").addEventListener("click", () => switchView("home"));
        document.getElementById("jo-hw-back").addEventListener("click", goBack);
        document.getElementById("jo-hw-menu").addEventListener("click", () => switchView("home"));

        // Action row
        document.getElementById("jo-act-end").addEventListener("click", () => {
            phoneEl.classList.remove("visible");
            document.getElementById("jophone-toggle").classList.add("visible");
        });

        // Dialer keys
        phoneEl.querySelectorAll(".jophone-dialpad-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                if (dialerValue.length < 15) {
                    dialerValue += btn.dataset.key;
                    updateDialerDisplay();
                }
            });
        });

        // Dialer actions
        document.getElementById("jo-dial-del").addEventListener("click", () => {
            dialerValue = dialerValue.slice(0, -1);
            updateDialerDisplay();
        });
        document.getElementById("jo-dial-call").addEventListener("click", () => {
            if (dialerValue.length > 0) {
                MakeNotif({ title: "Calling...", body: dialerValue, duration: 2000 });
            }
        });
        document.getElementById("jo-dial-end").addEventListener("click", () => {
            dialerValue = "";
            updateDialerDisplay();
            switchView("home");
        });

        // Contact tap → open dialer with their number
        phoneEl.querySelectorAll(".jophone-contact-item").forEach(item => {
            item.addEventListener("click", () => {
                const c = contacts[parseInt(item.dataset.cidx)];
                dialerValue = c.number.replace(/-/g, "");
                updateDialerDisplay();
                switchView("phone");
            });
        });

        // Messages: new message button
        document.getElementById("jo-msg-new").addEventListener("click", () => {
            renderComposeContacts();
            switchView("compose");
        });

        // Compose: back
        document.getElementById("jo-compose-back").addEventListener("click", () => {
            renderInbox();
            switchView("messages");
        });

        // Thread: back
        document.getElementById("jo-thread-back").addEventListener("click", () => {
            renderInbox();
            switchView("messages");
        });

        // Thread: send
        document.getElementById("jo-thread-send").addEventListener("click", sendThreadMessage);
        document.getElementById("jo-thread-input").addEventListener("keydown", (e) => {
            if (e.key === "Enter") sendThreadMessage();
        });
    }

    /* ── Navigation ── */

    function switchView(name) {
        phoneEl.querySelectorAll(".jophone-view").forEach(v => v.classList.remove("active"));
        const target = document.getElementById("jo-view-" + name);
        if (target) {
            target.classList.add("active");
            currentView = name;
        }
    }

    function goBack() {
        if (currentView === "thread" || currentView === "compose") {
            renderInbox();
            switchView("messages");
        } else if (currentView !== "home") {
            switchView("home");
        }
    }

    /* ── Phone toggle ── */

    function togglePhone() {
        const isOpen = phoneEl.classList.contains("visible");
        if (isOpen) {
            phoneEl.classList.remove("visible");
        } else {
            phoneEl.classList.add("visible");
            document.getElementById("jophone-toggle").classList.remove("visible");
        }
    }

    /* ── Clock ── */

    function startClock() {
        function tick() {
            const now = new Date();
            const h = now.getHours().toString().padStart(2, "0");
            const m = now.getMinutes().toString().padStart(2, "0");
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const clockEl = document.getElementById("jo-clock");
            const dateEl = document.getElementById("jo-date");
            if (clockEl) clockEl.textContent = h + ":" + m;
            if (dateEl) dateEl.textContent = days[now.getDay()] + ", " + months[now.getMonth()] + " " + now.getDate();
        }
        tick();
        clockInterval = setInterval(tick, 10000);
    }

    /* ── Dialer display ── */

    function updateDialerDisplay() {
        const el = document.getElementById("jo-dialer-num");
        if (el) el.textContent = formatPhoneNumber(dialerValue);
    }

    function formatPhoneNumber(raw) {
        if (raw.length <= 3) return raw;
        if (raw.length <= 6) return raw.slice(0, 3) + "-" + raw.slice(3);
        return raw.slice(0, 3) + "-" + raw.slice(3, 6) + "-" + raw.slice(6);
    }

    /* ── Notification badge update ── */

    function updateBadges() {
        notifCounts.unread = messages.filter(m => !m.read).length;
        const msgEl = document.getElementById("jo-msg-count");
        if (msgEl) msgEl.textContent = notifCounts.unread;
    }

    /* ── Messages: inbox rendering ── */

    function getThreads() {
        const map = {};
        messages.forEach(m => {
            const key = m.from;
            if (!map[key]) map[key] = { name: key, lastMsg: m, unread: 0, msgs: [] };
            map[key].msgs.push(m);
            map[key].lastMsg = m;
            if (!m.read) map[key].unread++;
        });
        return Object.values(map).sort((a, b) => b.lastMsg.time - a.lastMsg.time);
    }

    function renderInbox() {
        const list = document.getElementById("jo-msg-list");
        if (!list) return;
        const threads = getThreads();
        if (threads.length === 0) {
            list.innerHTML = '<div class="jophone-msg-empty">No messages yet</div>';
            return;
        }
        list.innerHTML = threads.map(t => {
            const preview = t.lastMsg.body.length > 30 ? t.lastMsg.body.slice(0, 30) + "…" : t.lastMsg.body;
            const timeStr = formatMsgTime(t.lastMsg.time);
            const unreadDot = t.unread > 0 ? '<span class="jophone-msg-unread-dot"></span>' : '';
            return `<div class="jophone-msg-row" data-thread="${escapeHTML(t.name)}">
                ${unreadDot}
                <div class="jophone-msg-row-info">
                    <div class="jophone-msg-row-name">${escapeHTML(t.name)}</div>
                    <div class="jophone-msg-row-preview">${escapeHTML(preview)}</div>
                </div>
                <div class="jophone-msg-row-time">${timeStr}</div>
            </div>`;
        }).join("");

        // Bind thread taps
        list.querySelectorAll(".jophone-msg-row").forEach(row => {
            row.addEventListener("click", () => {
                openThread(row.dataset.thread);
            });
        });
    }

    function openThread(name) {
        activeThread = name;
        // Mark messages read
        messages.forEach(m => { if (m.from === name) m.read = true; });
        updateBadges();
        renderThread();
        switchView("thread");
    }

    function renderThread() {
        const nameEl = document.getElementById("jo-thread-name");
        const msgsEl = document.getElementById("jo-thread-msgs");
        if (!nameEl || !msgsEl) return;
        nameEl.textContent = activeThread;
        const threadMsgs = messages.filter(m => m.from === activeThread || m.to === activeThread);
        threadMsgs.sort((a, b) => a.time - b.time);
        msgsEl.innerHTML = threadMsgs.map(m => {
            const isMe = m.from === "You";
            return `<div class="jophone-bubble ${isMe ? 'jophone-bubble-me' : 'jophone-bubble-them'}">
                <div class="jophone-bubble-body">${escapeHTML(m.body)}</div>
                <div class="jophone-bubble-time">${formatMsgTime(m.time)}</div>
            </div>`;
        }).join("");
        msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    function sendThreadMessage() {
        const input = document.getElementById("jo-thread-input");
        const text = input.value.trim();
        if (!text || !activeThread) return;
        messages.push({ id: Date.now(), from: "You", to: activeThread, body: text, time: Date.now(), read: true });
        input.value = "";
        renderThread();
        updateBadges();
    }

    /* ── Compose: pick contact to start a thread ── */

    function renderComposeContacts() {
        const el = document.getElementById("jo-compose-contacts");
        if (!el) return;
        el.innerHTML = contacts.map((c, i) => `
            <div class="jophone-contact-item jophone-compose-pick" data-cname="${escapeHTML(c.name)}">
                <div class="jophone-contact-avatar">${c.emoji}</div>
                <div class="jophone-contact-info">
                    <div class="jophone-contact-name">${escapeHTML(c.name)}</div>
                    <div class="jophone-contact-num">${escapeHTML(c.number)}</div>
                </div>
            </div>`).join("");
        el.querySelectorAll(".jophone-compose-pick").forEach(row => {
            row.addEventListener("click", () => {
                openThread(row.dataset.cname);
            });
        });
    }

    function formatMsgTime(ts) {
        const d = new Date(ts);
        const h = d.getHours().toString().padStart(2, "0");
        const m = d.getMinutes().toString().padStart(2, "0");
        return h + ":" + m;
    }

    /* ── Show / hide phone externally ── */

    function show() {
        document.getElementById("jophone-toggle").classList.add("visible");
    }

    function hide() {
        phoneEl.classList.remove("visible");
        document.getElementById("jophone-toggle").classList.remove("visible");
    }

    /* ── MakeNotif — exported notification creator ── */
    // Every notification is saved as a message in the Messages app

    function MakeNotif(data) {
        // data: { title, body, duration?, from? }
        // from: sender name (defaults to title), stored as a message
        if (!toastContainer) return;

        const sender = data.from || data.title || "System";
        const body = data.body || "";

        // Store as a message
        messages.push({
            id: Date.now() + Math.random(),
            from: sender,
            to: "You",
            body: body,
            time: Date.now(),
            read: false,
        });
        updateBadges();

        // Show toast
        const toast = document.createElement("div");
        toast.className = "jophone-toast";
        toast.innerHTML = `
            <span class="jophone-toast-title">💬 ${escapeHTML(sender)}</span>
            <span class="jophone-toast-body">${escapeHTML(body)}</span>`;
        toastContainer.appendChild(toast);

        // Tap toast to open thread
        toast.style.cursor = "pointer";
        toast.addEventListener("click", () => {
            toast.remove();
            openThread(sender);
        });

        const dur = data.duration || 3000;
        setTimeout(() => {
            toast.classList.add("hiding");
            toast.addEventListener("animationend", () => toast.remove());
        }, dur);

        // Auto-open phone if closed
        if (!phoneEl.classList.contains("visible")) {
            phoneEl.classList.add("visible");
            document.getElementById("jophone-toggle").classList.remove("visible");
        }
    }

    function escapeHTML(str) {
        const d = document.createElement("div");
        d.textContent = str;
        return d.innerHTML;
    }

    /* ── Public API ── */
    return { init, show, hide, MakeNotif, switchView };
})();
