const POINTS_KEY = 'lacosta-points';
const HISTORY_KEY = 'lacosta-points-history';
const NEXT_REWARD_COST = 300;
const DEFAULT_POINTS = 240;

function getPoints() {
    const stored = localStorage.getItem(POINTS_KEY);
    if (stored === null) return DEFAULT_POINTS;
    const value = parseInt(stored, 10);
    return Number.isFinite(value) ? value : DEFAULT_POINTS;
}

function setPoints(value) {
    localStorage.setItem(POINTS_KEY, String(value));
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
        return [];
    }
}

function addHistory(item, code) {
    const history = getHistory();
    history.unshift({
        item,
        code,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 5)));
}

function makeCode() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `LC-${num}`;
}

function updateUI(balance) {
    const balanceEl = document.getElementById('points-balance');
    const fillEl = document.getElementById('points-progress-fill');
    const nextLabel = document.getElementById('points-next-label');
    const nextTarget = document.getElementById('points-next-target');

    if (balanceEl) balanceEl.textContent = balance;

    const remaining = Math.max(0, NEXT_REWARD_COST - balance);
    const progress = Math.min(100, (balance / NEXT_REWARD_COST) * 100);

    if (fillEl) fillEl.style.width = `${progress}%`;
    if (nextTarget) nextTarget.textContent = String(NEXT_REWARD_COST);
    if (nextLabel) {
        nextLabel.textContent = remaining === 0
            ? 'Ready for Free Entrée'
            : `${remaining} pts to Free Entrée`;
    }

    document.querySelectorAll('.points-reward').forEach((card) => {
        const cost = parseInt(card.dataset.cost, 10);
        const btn = card.querySelector('[data-redeem]');
        const affordable = balance >= cost;

        card.classList.toggle('points-reward--locked', !affordable);
        if (btn) {
            btn.disabled = !affordable;
            btn.textContent = affordable ? 'Redeem' : `Need ${cost - balance} more`;
        }
    });
}

function showToast(message) {
    const toast = document.getElementById('points-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
        toast.hidden = true;
    }, 2800);
}

function showModal(item, code) {
    const modal = document.getElementById('points-modal');
    const codeEl = document.getElementById('points-modal-code');
    const itemEl = document.getElementById('points-modal-item');
    if (!modal || !codeEl || !itemEl) return;

    codeEl.textContent = code;
    itemEl.textContent = item;
    modal.showModal();
}

function renderHistory() {
    const history = getHistory();
    const section = document.getElementById('points-history');
    const list = document.getElementById('points-history-list');
    if (!section || !list) return;

    if (!history.length) {
        section.hidden = true;
        return;
    }

    section.hidden = false;
    list.innerHTML = history.map((entry) => `
        <li class="points-history__item">
            <span class="points-history__name">${entry.item}</span>
            <span class="points-history__meta">${entry.code} · ${entry.date}</span>
        </li>
    `).join('');
}

function initPointsPage() {
    let balance = getPoints();
    updateUI(balance);
    renderHistory();

    const modal = document.getElementById('points-modal');
    document.getElementById('points-modal-close')?.addEventListener('click', () => modal?.close());

    document.getElementById('points-rewards')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-redeem]');
        if (!btn || btn.disabled) return;

        const card = btn.closest('.points-reward');
        if (!card) return;

        const cost = parseInt(card.dataset.cost, 10);
        const name = card.dataset.name;
        if (balance < cost) return;

        balance -= cost;
        setPoints(balance);
        updateUI(balance);

        const code = makeCode();
        addHistory(name, code);
        renderHistory();
        showModal(name, code);
        showToast(`${name} redeemed — ${cost} pts`);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPointsPage);
} else {
    initPointsPage();
}
