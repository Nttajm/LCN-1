const MPS_WINDOW = 1000;
const MAX_OCCUPATIONS = 2;

const levels = [
    { level: 1, cap: 20,  bonus: 25,  status: "HOMELESS/BEGGER",  avatar: "assets/homelessguy.png" },
    { level: 2, cap: 45,  bonus: 50,  status: "KINDA HOMELESS",   avatar: "assets/kindahomeless.png" },
    { level: 3, cap: 90,  bonus: 80,  status: "SHELTER REGULAR",  avatar: "assets/shelterregular.png" },
    { level: 4, cap: 150, bonus: 120, status: "COUCH SURFER",     avatar: "assets/couchsurfer.png" },
    { level: 5, cap: 240, bonus: 180, status: "MINIMUM WAGE",     avatar: "assets/minimumwage.png" },
    { level: 6, cap: 360, bonus: 250, status: "BARELY MAKING IT", avatar: "assets/barelymakingit.png" },
    { level: 7, cap: 500, bonus: 350, status: "WORKING CLASS",    avatar: "assets/workingclass.png" },
];

const occupations = [
    {
        id: "begger",
        name: "Begger",
        baseIncrement: 0.15,
        baseHealthLoss: 0.2,
        color: "#92400e",
        icon: `<svg class="occ-icon" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="8" r="5" fill="#92400e"/><path d="M8 28 Q8 18 16 18 Q24 18 24 28Z" fill="#92400e" opacity="0.7"/><rect x="4" y="26" width="24" height="3" rx="1" fill="#78350f" opacity="0.4"/></svg>`,
        unlockLevel: 1,
        locked: false,
        lockReason: "",
        upgrades: ["better-spot", "cardboard-sign", "sad-story-sign", "clean-clothes", "bicycle"],
    },
    {
        id: "doordash",
        name: "DoorDash Driver",
        baseIncrement: 0.45,
        baseHealthLoss: 0.15,
        color: "#ef4444",
        icon: `<svg class="occ-icon" viewBox="0 0 32 32" fill="none"><rect x="4" y="6" width="24" height="18" rx="3" fill="#ef4444" opacity="0.85"/><rect x="8" y="10" width="16" height="3" rx="1" fill="#fff" opacity="0.4"/><rect x="8" y="15" width="10" height="2" rx="1" fill="#fff" opacity="0.3"/><circle cx="10" cy="26" r="3" fill="#333"/><circle cx="22" cy="26" r="3" fill="#333"/></svg>`,
        unlockLevel: 3,
        locked: true,
        lockReason: "Reach LVL 3 & download the DoorDash app",
        upgrades: [],
    },
];

const upgrades = [
    {
        id: "rank-in-life",
        name: "Ability to rank in life",
        desc: "Unlocks the level progress bar",
        revealAt: 3,
        cost: 8,
        color: "#3b82f6",
        type: "ui",
        occupation: null,
        slotIndex: 0,
        art: `<svg class="slot-art" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="24" width="7" height="12" rx="1.5" fill="#3b82f6"/>
            <rect x="16" y="16" width="7" height="20" rx="1.5" fill="#3b82f6" opacity="0.75"/>
            <rect x="28" y="6" width="7" height="30" rx="1.5" fill="#3b82f6" opacity="0.5"/>
            <polyline points="7.5,23 19.5,15 31.5,5" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="31.5" cy="5" r="2" fill="#3b82f6"/>
        </svg>`,
        effect(state) {
            state.ui.levelBar = true;
        },
    },
    {
        id: "better-spot",
        name: "Better Spot",
        desc: "Buy a spot from a local store at the town square — +$0.10/click",
        revealAt: 5,
        cost: 10,
        color: "#16a34a",
        type: "money",
        occupation: "begger",
        slotIndex: 1,
        incrementBonus: 0.10,
        art: `<svg class="slot-art" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6 C13 6 8 11.5 8 17.5 C8 25 20 36 20 36 C20 36 32 25 32 17.5 C32 11.5 27 6 20 6Z" fill="#16a34a" opacity="0.85"/>
            <circle cx="20" cy="18" r="4.5" fill="#fff" opacity="0.6"/>
            <rect x="4" y="34" width="32" height="2" rx="1" fill="#16a34a" opacity="0.3"/>
        </svg>`,
        effect(state) {},
    },
    {
        id: "cardboard-sign",
        name: "Cardboard Sign",
        desc: "+$0.15 per click",
        revealAt: 8,
        cost: 8,
        color: "#b45309",
        type: "money",
        occupation: "begger",
        slotIndex: 1,
        incrementBonus: 0.15,
        art: `<svg class="slot-art" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="6" width="24" height="22" rx="2" fill="#b45309" opacity="0.85"/>
            <rect x="11" y="9" width="18" height="3" rx="1" fill="#fef3c7" opacity="0.7"/>
            <rect x="11" y="15" width="18" height="2" rx="1" fill="#fef3c7" opacity="0.5"/>
            <rect x="11" y="20" width="12" height="2" rx="1" fill="#fef3c7" opacity="0.4"/>
            <rect x="18" y="28" width="4" height="8" rx="1" fill="#92400e"/>
        </svg>`,
        effect(state) {
        },
    },
    {
        id: "sad-story-sign",
        name: "Sad Story Sign",
        desc: "A tear-jerker that opens wallets — +$0.08/click",
        revealAt: 18,
        cost: 40,
        color: "#7c3aed",
        type: "money",
        occupation: "begger",
        slotIndex: 1,
        incrementBonus: 0.08,
        art: `<svg class="slot-art" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="7" y="5" width="26" height="22" rx="2" fill="#7c3aed" opacity="0.85"/>
            <rect x="10" y="9" width="20" height="2.5" rx="1" fill="#ede9fe" opacity="0.7"/>
            <rect x="10" y="14" width="20" height="2" rx="1" fill="#ede9fe" opacity="0.5"/>
            <rect x="10" y="19" width="13" height="2" rx="1" fill="#ede9fe" opacity="0.4"/>
            <circle cx="28" cy="19" r="2" fill="#a5f3fc" opacity="0.8"/>
            <path d="M28 21 Q27.5 24 28 26" stroke="#a5f3fc" stroke-width="1.2" stroke-linecap="round"/>
            <rect x="18" y="27" width="4" height="8" rx="1" fill="#5b21b6"/>
        </svg>`,
        effect(state) {},
    },
    {
        id: "clean-clothes",
        name: "Clean Clothes",
        desc: "+$0.25 per click",
        revealAt: 10,
        cost: 25,
        color: "#0891b2",
        type: "money",
        occupation: "begger",
        slotIndex: 1,
        incrementBonus: 0.25,
        art: `<svg class="slot-art" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 14 L12 10 L16 8 L20 10 L24 8 L28 10 L28 14 L26 14 L26 32 L14 32 L14 14 Z" fill="#0891b2" opacity="0.9"/>
            <path d="M16 8 L20 10 L24 8 L24 14 L16 14 Z" fill="#06b6d4" opacity="0.4"/>
            <rect x="14" y="14" width="12" height="3" fill="#0e7490" opacity="0.5"/>
            <line x1="20" y1="17" x2="20" y2="32" stroke="#67e8f9" stroke-width="0.5" opacity="0.5"/>
            <rect x="17" y="20" width="6" height="1" rx="0.5" fill="#67e8f9" opacity="0.3"/>
            <rect x="17" y="24" width="6" height="1" rx="0.5" fill="#67e8f9" opacity="0.3"/>
        </svg>`,
        effect(state) {
        },
    },
    {
        id: "bicycle",
        name: "Bicycle",
        desc: "Cover more ground, reach better spots — +$0.20/click",
        revealAt: 50,
        cost: 120,
        color: "#0284c7",
        type: "money",
        occupation: "begger",
        slotIndex: 1,
        incrementBonus: 0.20,
        art: `<svg class="slot-art" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="27" r="7" stroke="#0284c7" stroke-width="2.2" fill="none"/>
            <circle cx="29" cy="27" r="7" stroke="#0284c7" stroke-width="2.2" fill="none"/>
            <circle cx="11" cy="27" r="1.5" fill="#0284c7"/>
            <circle cx="29" cy="27" r="1.5" fill="#0284c7"/>
            <path d="M11 27 L20 14 L29 27" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M17 14 L23 14" stroke="#0284c7" stroke-width="2" stroke-linecap="round"/>
            <path d="M20 14 L20 10" stroke="#0284c7" stroke-width="2" stroke-linecap="round"/>
            <path d="M17 10 L23 10" stroke="#0284c7" stroke-width="2" stroke-linecap="round"/>
        </svg>`,
        effect(state) {},
    },
    {
        id: "cheap-phone",
        name: "Cheap Phone",
        desc: "Reduces health loss per click to 0.1",
        revealAt: 25,
        cost: 50,
        color: "#ca8a04",
        type: "life",
        occupation: null,
        slotIndex: 2,
        art: `<svg class="slot-art" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="13" y="4" width="14" height="32" rx="3" fill="#ca8a04" opacity="0.9"/>
            <rect x="15" y="8" width="10" height="20" rx="1" fill="#1e293b"/>
            <circle cx="20" cy="32" r="1.5" fill="#fef9c3" opacity="0.6"/>
            <rect x="17" y="5.5" width="6" height="1" rx="0.5" fill="#fef9c3" opacity="0.4"/>
        </svg>`,
        effect(state) {
            state.baseHealthLossOverride = 0.1;
            JoPhone.init();
            JoPhone.show();
            JoPhone.MakeNotif({ title: "JoPhone 1", body: "Your new phone is ready.", duration: 3000 });
        },
    },
];

const storeItems = [
    { id: "dr-pepper", name: "Dr Pepper", cost: 3, heal: 3, color: "#991b1b",
      art: `<svg class="store-art" viewBox="0 0 40 40"><rect x="14" y="6" width="12" height="28" rx="3" fill="#991b1b"/><rect x="16" y="10" width="8" height="6" rx="1" fill="#fff" opacity="0.3"/><circle cx="20" cy="32" r="1.5" fill="#fff" opacity="0.2"/></svg>` },
    { id: "granola-bar", name: "Granola Bar", cost: 2, heal: 4, color: "#92400e",
      art: `<svg class="store-art" viewBox="0 0 40 40"><rect x="6" y="14" width="28" height="12" rx="3" fill="#92400e"/><rect x="10" y="17" width="20" height="6" rx="1" fill="#fbbf24" opacity="0.4"/><line x1="16" y1="14" x2="16" y2="26" stroke="#78350f" stroke-width="0.8"/><line x1="24" y1="14" x2="24" y2="26" stroke="#78350f" stroke-width="0.8"/></svg>` },
    { id: "burger", name: "Burger", cost: 8, heal: 15, color: "#ea580c",
      art: `<svg class="store-art" viewBox="0 0 40 40"><path d="M8 20 Q8 12 20 12 Q32 12 32 20Z" fill="#ea580c"/><rect x="8" y="20" width="24" height="4" rx="1" fill="#22c55e"/><rect x="8" y="24" width="24" height="3" rx="1" fill="#92400e"/><path d="M8 27 Q8 32 20 32 Q32 32 32 27Z" fill="#ea580c"/></svg>` },
];

const uiElems = [
    { id: "store", label: "STORE", unlockLevel: 2 },
];

const state = {
    money: 0,
    totalEarned: 0,
    clicks: 0,
    moneyPerSecond: 0,
    increment: 0.15,
    health: 100,
    healthLoss: 0.2,
    baseHealthLossOverride: null,
    clickLog: [],
    purchased: [],
    collectedBonuses: [],
    activeOccupations: ["begger"],
    ui: {
        levelBar: false,
        occOpen: false,
    },
};

const moneyDisplay = document.getElementById("money-display");
const mpsDisplay = document.getElementById("mps-display");
const levelBarWrap = document.getElementById("level-bar-wrap");
const levelBarFill = document.getElementById("level-bar-fill");
const levelLabel = document.getElementById("level-label");
const levelBonusWrap = document.getElementById("level-bonus-wrap");
const levelBonusBtn = document.getElementById("level-bonus-btn");
const healthFill = document.getElementById("health-fill");
const healthVal = document.getElementById("health-val");
const healthTrack = document.querySelector(".health-track");
const clickBtn = document.getElementById("click-btn");
const occToggle = document.getElementById("occ-toggle");
const occPanel = document.getElementById("occ-panel");
const occArrow = document.getElementById("occ-arrow");
const occCount = document.getElementById("occ-count");

function calcIncrement() {
    let total = 0;
    state.activeOccupations.forEach(occId => {
        const occ = occupations.find(o => o.id === occId);
        if (!occ) return;
        total += occ.baseIncrement;
        occ.upgrades.forEach(upgId => {
            if (state.purchased.includes(upgId)) {
                const upg = upgrades.find(u => u.id === upgId);
                if (upg && upg.incrementBonus) total += upg.incrementBonus;
            }
        });
    });
    return total;
}

function calcHealthLoss() {
    if (state.baseHealthLossOverride !== null) return state.baseHealthLossOverride;
    let total = 0;
    state.activeOccupations.forEach(occId => {
        const occ = occupations.find(o => o.id === occId);
        if (occ) total += occ.baseHealthLoss;
    });
    return total;
}

occToggle.addEventListener("click", () => {
    state.ui.occOpen = !state.ui.occOpen;
    occPanel.classList.toggle("open", state.ui.occOpen);
    occArrow.textContent = state.ui.occOpen ? "▴" : "▾";
});

function renderOccupations() {
    const { lvl } = getCurrentLevel();
    const activeCount = state.activeOccupations.length;
    occCount.textContent = activeCount + "/" + MAX_OCCUPATIONS;

    let html = "";
    occupations.forEach(occ => {
        const isActive = state.activeOccupations.includes(occ.id);
        const isLocked = occ.locked || lvl < occ.unlockLevel;

        const occUpgrades = upgrades.filter(u => u.occupation === occ.id);
        const currentIncrement = occ.baseIncrement + occUpgrades.reduce((sum, u) => {
            return sum + (state.purchased.includes(u.id) && u.incrementBonus ? u.incrementBonus : 0);
        }, 0);

        const ownedUpgrades = occUpgrades.filter(u => state.purchased.includes(u.id));
        let upgradeHtml = "";
        if (ownedUpgrades.length) {
            ownedUpgrades.forEach(u => {
                upgradeHtml += `<div class="occ-upgrade-chip" style="--chip-color:${u.color}">${u.name}</div>`;
            });
        } else {
            upgradeHtml = `<div class="occ-upgrade-none">No upgrades</div>`;
        }

        html += `<div class="occ-card ${isActive ? "occ-active" : ""} ${isLocked ? "occ-locked" : ""}" style="--occ-color:${occ.color}">
            <div class="occ-card-header">
                <div class="occ-card-icon">${occ.icon}</div>
                <div class="occ-card-info">
                    <span class="occ-card-name">${occ.name}</span>
                    ${isLocked
                        ? `<span class="occ-card-lock">${occ.lockReason}</span>`
                        : `<span class="occ-card-stats">$${currentIncrement.toFixed(2)}/click · -${occ.baseHealthLoss} HP</span>`
                    }
                </div>
                ${isActive ? `<span class="occ-badge">ACTIVE</span>` : ""}
                ${isLocked ? `<span class="occ-badge occ-badge-lock">🔒</span>` : ""}
            </div>
            ${!isLocked ? `<div class="occ-upgrades">${upgradeHtml}</div>` : ""}
        </div>`;
    });

    occPanel.innerHTML = html;
}

levelBonusBtn.addEventListener("click", () => {
    const pending = levels.find(
        l => state.totalEarned >= l.cap && !state.collectedBonuses.includes(l.level)
    );
    if (!pending) return;
    state.money += pending.bonus;
    state.collectedBonuses.push(pending.level);
    updateDisplay();
});

function updateHealth() {
    const pct = Math.max(state.health, 0);
    healthFill.style.width = pct + "%";
    healthFill.style.background = pct > 50 ? "#22c55e" : pct > 25 ? "#f59e0b" : "#ef4444";
    healthVal.textContent = Math.max(Math.ceil(state.health), 0);
}

function spawnMoneyFloat(amount) {
    const el = document.createElement("span");
    el.className = "health-float money-float";
    el.textContent = "+" + formatMoney(amount);
    clickBtn.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
}

function spawnHealthFloat(amount) {
    const el = document.createElement("span");
    el.className = "health-float";
    el.textContent = "-" + amount;
    healthTrack.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
}

function formatMoney(val) {
    return "$" + val.toFixed(2);
}

function calcMPS() {
    const now = Date.now();
    state.clickLog = state.clickLog.filter(t => now - t.time <= MPS_WINDOW);
    const earned = state.clickLog.reduce((sum, e) => sum + e.amount, 0);
    const w = Math.min(now - (state.clickLog[0]?.time ?? now), MPS_WINDOW) / 1000;
    return w > 0 ? earned / w : 0;
}

function getCurrentLevel() {
    const units = Math.floor(state.totalEarned);
    for (let i = 0; i < levels.length; i++) {
        if (units < levels[i].cap) {
            const prev = i > 0 ? levels[i - 1].cap : 0;
            return { lvl: levels[i].level, units, prev, cap: levels[i].cap };
        }
    }
    const last = levels[levels.length - 1];
    const prev = levels.length > 1 ? levels[levels.length - 2].cap : 0;
    return { lvl: last.level, units, prev, cap: last.cap };
}

function updateLevelBar() {
    const { lvl, units, prev, cap } = getCurrentLevel();
    const levelDef = levels.find(l => l.level === lvl) || levels[levels.length - 1];
    document.getElementById("status-text").textContent = levelDef.status;
    document.querySelector(".status-avatar").src = levelDef.avatar;

    if (!state.ui.levelBar) {
        levelBarWrap.classList.remove("visible");
        levelBonusWrap.style.display = "none";
        return;
    }
    levelBarWrap.classList.add("visible");
    const pct = Math.min(((units - prev) / (cap - prev)) * 100, 100);
    levelBarFill.style.width = pct + "%";
    levelLabel.textContent = "LVL " + lvl + " — $" + units + " / $" + cap;

    const pending = levels.find(
        l => state.totalEarned >= l.cap && !state.collectedBonuses.includes(l.level)
    );
    if (pending) {
        levelBonusBtn.textContent = "COLLECT LVL " + pending.level + " BONUS — $" + pending.bonus;
        levelBonusWrap.style.display = "";
    } else {
        levelBonusWrap.style.display = "none";
    }
}

function renderSlots() {
    const container = document.getElementById("slots");
    const visible = upgrades.filter(
        upg => !state.purchased.includes(upg.id) && state.totalEarned >= upg.revealAt
    );

    // sync DOM: remove stale, add missing
    const existing = new Set([...container.children].map(el => el.dataset.id));
    const needed = new Set(visible.map(upg => upg.id));

    [...container.children].forEach(el => {
        if (!needed.has(el.dataset.id)) el.remove();
    });

    visible.forEach((upg, i) => {
        let slot = container.querySelector(`[data-id="${upg.id}"]`);
        const isNew = !slot;
        if (!slot) {
            slot = document.createElement("div");
            slot.dataset.id = upg.id;
            container.appendChild(slot);
        }

        const canBuy = state.money >= upg.cost;
        const typeClass = upg.type ? " type-" + upg.type : "";
        slot.className = "slot revealed" + typeClass + (canBuy ? " buyable" : " grayed");
        slot.style.setProperty("--slot-color", upg.color);
        if (isNew) {
            slot.style.animation = "slot-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both";
        }
        slot.innerHTML = (upg.art || "") + `<div class="slot-tip">${upg.name} — $${upg.cost}${upg.desc ? "<br><span class='slot-tip-desc'>" + upg.desc + "</span>" : ""}</div>`;

        slot.onclick = () => {
            if (state.money < upg.cost) return;
            state.money -= upg.cost;
            state.purchased.push(upg.id);
            upg.effect(state);
            slot.style.animation = "slot-out 0.25s ease forwards";
            slot.onclick = null;
            slot.addEventListener("animationend", () => {
                slot.remove();
                updateDisplay();
            }, { once: true });
        };
    });
}

function renderStore() {
    const tab = document.getElementById("tab-store");
    const body = document.getElementById("store-body");
    const tip = document.getElementById("store-lock-tip");

    if (!state.purchased.includes("rank-in-life")) {
        tab.style.display = "none";
        return;
    }
    tab.style.display = "";
    const { lvl } = getCurrentLevel();
    const storeDef = uiElems.find(u => u.id === "store");
    const unlocked = lvl >= storeDef.unlockLevel;

    tab.classList.toggle("locked", !unlocked);
    tip.style.display = unlocked ? "none" : "";

    if (!body.children.length) {
        storeItems.forEach(item => {
            const el = document.createElement("div");
            el.className = "store-slot";
            el.id = "store-" + item.id;
            el.style.setProperty("--slot-color", item.color);
            el.innerHTML = (item.art || "") +
                `<div class="slot-tip">${item.name} — $${item.cost} (+${item.heal} HP)</div>`;
            el.onclick = () => buyStoreItem(item);
            body.appendChild(el);
        });
    }

    storeItems.forEach(item => {
        const el = document.getElementById("store-" + item.id);
        if (!el) return;
        const canBuy = unlocked && state.money >= item.cost;
        el.classList.toggle("buyable", canBuy);
        el.classList.toggle("grayed", !canBuy);
    });
}

function buyStoreItem(item) {
    if (state.money < item.cost) return;
    const { lvl } = getCurrentLevel();
    const storeDef = uiElems.find(u => u.id === "store");
    if (lvl < storeDef.unlockLevel) return;
    state.money -= item.cost;
    state.health = Math.min(state.health + item.heal, 100);
    updateDisplay();
}

function updateDisplay() {
    state.increment = calcIncrement();
    state.healthLoss = calcHealthLoss();
    moneyDisplay.textContent = formatMoney(state.money);
    state.moneyPerSecond = calcMPS();
    mpsDisplay.textContent = formatMoney(state.moneyPerSecond) + " / sec";
    updateLevelBar();
    renderSlots();
    updateHealth();
    renderStore();
    renderOccupations();
}

function click() {
    const inc = calcIncrement();
    const loss = calcHealthLoss();
    state.money += inc;
    state.totalEarned += inc;
    state.clicks++;
    state.clickLog.push({ time: Date.now(), amount: inc });
    state.health = Math.max(state.health - loss, 0);
    spawnHealthFloat(loss);
    spawnMoneyFloat(inc);
    updateDisplay();
}

document.getElementById("click-btn").addEventListener("click", click);

setInterval(updateDisplay, 250);

