import { work, openCatView, openAppView } from './render.js';

const DESKTOP_ORDER = [
  ['item-8', 'item-weather-rp'],
  ['item-date', 'item-6'],
  ['item-3', 'item-5', 'item-9', 'item-1'],
  ['item-4', 'item-2'],
  ['item-0'],
];

const MOBILE_ORDER = [
  ['item-8'],
  ['item-3', 'item-9', 'item-date'],
  ['item-1', 'item-4', 'item-2', 'item-5'],
  ['item-weather-rp', 'item-6', 'item-0'],
];

const LETTER_COLORS = [
  '#2D7D46', '#DA532C', '#00A4EF', '#7FBA00',
  '#E81123', '#FFB900', '#0078D7', '#8661C5',
];

let finderOpen = false;
let animating = false;
let cachedApps = null;

function getOrder() {
  return window.innerWidth <= 768 ? MOBILE_ORDER : DESKTOP_ORDER;
}

function exitDelays(count) {
  const d = [0];
  let gap = 220;
  for (let i = 1; i < count; i++) {
    d.push(d[i - 1] + gap);
    gap = Math.max(Math.floor(gap * 0.7), 55);
  }
  return d;
}

function enterDelays(count) {
  const d = [0];
  let gap = 65;
  for (let i = 1; i < count; i++) {
    d.push(d[i - 1] + gap);
    gap = Math.floor(gap * 1.45);
  }
  return d;
}

function getAllItemsFromWork() {
  const items = [];
  Object.values(work).forEach(cat => {
    cat.items.forEach(item => {
      items.push({
        id: item.id,
        name: item.name,
        nameSmall: item.name,
        logo: item.thumb,
        smallLogo: item.thumb,
        cover: item.thumb,
        category: cat.label,
      });
    });
  });
  return items;
}

function normalizeAppsPayload(payload) {
  const raw = Array.isArray(payload) ? payload : (Array.isArray(payload?.apps) ? payload.apps : []);
  return raw.map((item, i) => ({
    id: item.id ?? `app-${i + 1}`,
    name: item.name ?? 'Untitled',
    nameSmall: item.nameSmall ?? '',
    logo: item.logo ?? item.cover ?? item.smallLogo ?? '',
    smallLogo: item.smallLogo ?? item.logo ?? item.cover ?? '',
    cover: item.cover ?? item.logo ?? '',
    category: item.category ?? 'Apps',
    foundIn: item.foundIn ?? null,
    isInLcn: item.isInLcn ?? null,
    description: item.description ?? '',
  }));
}

async function loadAppsData() {
  if (cachedApps) return cachedApps;
  try {
    const res = await fetch('data/apps.json');
    if (res.ok) {
      const payload = await res.json();
      const apps = normalizeAppsPayload(payload);
      if (apps.length) {
        cachedApps = apps.sort((a, b) => a.name.localeCompare(b.name));
        return cachedApps;
      }
    }
  } catch {
    // fall back to work data
  }

  cachedApps = getAllItemsFromWork().sort((a, b) => a.name.localeCompare(b.name));
  return cachedApps;
}

function groupByLetter(items) {
  const groups = {};
  items.forEach(item => {
    const l = item.name[0].toUpperCase();
    if (!groups[l]) groups[l] = [];
    groups[l].push(item);
  });
  return groups;
}

async function renderFinderList() {
  const container = document.querySelector('.finder-list');
  const items = await loadAppsData();
  const grouped = groupByLetter(items);
  const letters = Object.keys(grouped).sort();
  let html = '';
  let colorIdx = 0;

  letters.forEach(letter => {
    const color = LETTER_COLORS[colorIdx % LETTER_COLORS.length];
    colorIdx++;
    html += `<div class="finder-section">`;
    html += `<div class="finder-letter" style="--letter-color: ${color}">${letter.toUpperCase()}</div>`;
    html += `<div class="finder-items">`;
    grouped[letter].forEach(item => {
      html += `<div class="finder-item" data-app-id="${item.id}">`;
      html += `<div class="finder-item-icon"><img src="${item.smallLogo || item.logo || item.cover}" alt="${item.name}"></div>`;
      html += `<div class="finder-item-main">`;
      html += `<span class="finder-item-name">${item.name}</span>`;
      if (item.nameSmall) html += `<span class="finder-item-sub">${item.nameSmall}</span>`;
      html += `</div>`;
      html += `</div>`;
    });
    html += `</div></div>`;
  });

  container.innerHTML = html;

  const allFinderItems = container.querySelectorAll('.finder-item');
  allFinderItems.forEach((el, i) => {
    el.style.setProperty('--item-delay', `${i * 60 + 120}ms`);
    el.addEventListener('click', () => handleFinderItemClick(el.dataset.appId));
  });
}

function handleFinderItemClick(appId) {
  const app = cachedApps?.find(a => a.id === appId);
  if (!app) return;

  // If no foundIn and category matches a cat-view key, open the regular cat-view
  const catKey = app.category.toLowerCase();
  if (!app.foundIn) {
    openCatView(catKey);
    return;
  }

  openAppView(app);
}

function openFinder() {
  if (animating) return;
  animating = true;

  const order = getOrder();
  const delays = exitDelays(order.length);
  const ctx = document.querySelector('.grid-context');
  const finder = document.querySelector('.finder');
  const btn = document.querySelector('.viewmore');

  ctx.style.setProperty('--finder-delay', '0ms');
  ctx.classList.add('finder-exit');

  order.forEach((group, i) => {
    group.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.setProperty('--finder-delay', `${delays[i]}ms`);
      el.classList.add('finder-exit');
    });
  });

  btn.classList.add('finder-active');

  const totalExit = delays[delays.length - 1] + 620;
  setTimeout(async () => {
    await renderFinderList();
    finder.classList.add('open');
    finderOpen = true;
    animating = false;
  }, totalExit);
}

function closeFinder() {
  if (animating) return;
  animating = true;

  const order = getOrder();
  const reversed = [...order].reverse();
  const delays = enterDelays(reversed.length);
  const ctx = document.querySelector('.grid-context');
  const finder = document.querySelector('.finder');
  const btn = document.querySelector('.viewmore');

  finder.classList.remove('open');
  finder.classList.add('closing');

  setTimeout(() => {
    finder.classList.remove('closing');

    reversed.forEach((group, i) => {
      group.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.setProperty('--finder-delay', `${delays[i]}ms`);
        el.classList.remove('finder-exit');
        el.classList.add('finder-enter');
      });
    });

    ctx.style.setProperty('--finder-delay', `${delays[reversed.length - 1]}ms`);
    ctx.classList.remove('finder-exit');
    ctx.classList.add('finder-enter');

    btn.classList.remove('finder-active');

    const totalEnter = delays[delays.length - 1] + 620;
    setTimeout(() => {
      document.querySelectorAll('.finder-exit, .finder-enter').forEach(el => {
        el.classList.remove('finder-exit', 'finder-enter');
        el.style.removeProperty('--finder-delay');
      });
      ctx.classList.remove('finder-enter');
      ctx.style.removeProperty('--finder-delay');
      finderOpen = false;
      animating = false;
    }, totalEnter);
  }, 380);
}

function initFinder() {
  void loadAppsData();
  document.querySelector('.viewmore').addEventListener('click', () => {
    if (finderOpen) closeFinder();
    else openFinder();
  });
}

document.addEventListener('DOMContentLoaded', initFinder);
