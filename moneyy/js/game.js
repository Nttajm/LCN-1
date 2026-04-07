const MPS_WINDOW = 1000;

const levels = [
    { level: 1, cap: 20 },
    { level: 2, cap: 45 },
];

const upgrades = [
    {
        id: "rank-in-life",
        name: "Ability to rank in life",
        revealAt: 5,
        cost: 10,
        color: "#3b82f6",
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
    clickLog: [],
    purchased: [],
    ui: {
        levelBar: false,
    },
};

const moneyDisplay = document.getElementById("money-display");
const mpsDisplay = document.getElementById("mps-display");
const levelBarWrap = document.getElementById("level-bar-wrap");
const levelBarFill = document.getElementById("level-bar-fill");
const levelLabel = document.getElementById("level-label");
const healthFill = document.getElementById("health-fill");
const healthVal = document.getElementById("health-val");
const healthTrack = document.querySelector(".health-track");
const clickBtn = document.getElementById("click-btn");

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
    if (!state.ui.levelBar) {
        levelBarWrap.classList.remove("visible");
        return;
    }
    levelBarWrap.classList.add("visible");
    const { lvl, units, prev, cap } = getCurrentLevel();
    const pct = Math.min(((units - prev) / (cap - prev)) * 100, 100);
    levelBarFill.style.width = pct + "%";
    levelLabel.textContent = "LVL " + lvl + " — $" + units + " / $" + cap;
}

function renderSlots() {
    upgrades.forEach(upg => {
        if (state.purchased.includes(upg.id)) return;
        const slot = document.getElementById("slot-" + upg.slotIndex);
        if (!slot) return;

        const reached = state.money >= upg.revealAt;
        const canBuy = state.money >= upg.cost;

        if (state.money < upg.revealAt) {
            slot.className = "slot";
            slot.innerHTML = "";
            slot.removeAttribute("title");
            slot.onclick = null;
            return;
        }

        slot.className = "slot revealed" + (canBuy ? " buyable" : " grayed");
        slot.style.setProperty("--slot-color", upg.color);
        slot.removeAttribute("title");
        slot.innerHTML = (upg.art || "") + `<div class="slot-tip">${upg.name} — $${upg.cost}</div>`;

        slot.onclick = () => {
            if (state.money < upg.cost) return;
            state.money -= upg.cost;
            state.purchased.push(upg.id);
            upg.effect(state);
            slot.className = "slot";
            slot.innerHTML = "";
            slot.onclick = null;
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
    moneyDisplay.textContent = formatMoney(state.money);
    state.moneyPerSecond = calcMPS();
    mpsDisplay.textContent = formatMoney(state.moneyPerSecond) + " / sec";
    updateLevelBar();
    renderSlots();
    updateHealth();
    renderStore();
}

function click() {
    state.money += state.increment;
    state.totalEarned += state.increment;
    state.clicks++;
    state.clickLog.push({ time: Date.now(), amount: state.increment });
    state.health = Math.max(state.health - state.healthLoss, 0);
    spawnHealthFloat(state.healthLoss);
    spawnMoneyFloat(state.increment);
    updateDisplay();
}

document.getElementById("click-btn").addEventListener("click", click);

setInterval(updateDisplay, 250);

