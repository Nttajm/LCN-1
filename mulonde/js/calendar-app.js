import { showBackBtn } from './render.js';

const STORAGE_KEY = 'mulonde-calendar-events';
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];
const MONTHS_TITLE = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];

  for (let i = first.getDay() - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), outside: true });
  }

  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: new Date(year, month, d), outside: false });
  }

  let nextDay = 1;
  while (days.length < 42) {
    days.push({ date: new Date(year, month + 1, nextDay++), outside: true });
  }

  return days;
}

function formatAgendaDate(d) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatTime(t) {
  if (!t) return 'All day';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function createState() {
  const now = today();
  return {
    view: 'month',
    year: now.getFullYear(),
    month: now.getMonth(),
    selected: new Date(now)
  };
}

function buildMonthStrip(state) {
  return MONTHS.map((name, i) => {
    const active = i === state.month;
    return `<button type="button" class="cal-month-pill${active ? ' active' : ''}" data-month="${i}">${name}</button>`;
  }).join('');
}

function buildYearStrip(state) {
  const years = [state.year - 1, state.year, state.year + 1, state.year + 2];
  return years.map((y) => {
    const active = y === state.year;
    return `<button type="button" class="cal-year-pill${active ? ' active' : ''}" data-year="${y}">${y}</button>`;
  }).join('');
}

function dayCell(day, state, events) {
  const key = dateKey(day.date);
  const evts = events[key] || [];
  const isToday = sameDay(day.date, today());
  const isSelected = sameDay(day.date, state.selected);
  const inViewMonth = day.date.getMonth() === state.month && day.date.getFullYear() === state.year;

  let cls = 'cal-day';
  if (!inViewMonth || day.outside) cls += ' outside';
  if (isToday) cls += ' today';
  if (isSelected) cls += ' selected';
  if (evts.length) cls += ' has-events';

  const bars = evts.slice(0, 3).map((_, i) =>
    `<span class="cal-event-bar" style="--bar-hue:${(i * 47 + 160) % 360}"></span>`
  ).join('');

  return `<button type="button" class="${cls}" data-date="${key}" aria-label="${day.date.toDateString()}">
    <span class="cal-day-num">${day.date.getDate()}</span>
    ${bars ? `<span class="cal-event-bars">${bars}</span>` : ''}
  </button>`;
}

function buildMonthView(state, events) {
  const days = getMonthDays(state.year, state.month);
  const weekdays = WEEKDAYS.map((d) => `<span class="cal-weekday">${d}</span>`).join('');

  return `
    <div class="cal-month-view">
      <div class="cal-weekdays">${weekdays}</div>
      <div class="cal-grid">${days.map((d) => dayCell(d, state, events)).join('')}</div>
    </div>`;
}

function miniMonth(year, month, state, events) {
  const days = getMonthDays(year, month);
  const isCurrentMonth = year === state.year && month === state.month;
  const miniDays = days.slice(0, 42).map((day) => {
    const key = dateKey(day.date);
    const evts = events[key] || [];
    const isToday = sameDay(day.date, today());
    const inMonth = day.date.getMonth() === month;
    let cls = 'cal-mini-day';
    if (!inMonth) cls += ' outside';
    if (isToday) cls += ' today';
    if (evts.length) cls += ' has-events';
    return `<span class="${cls}">${inMonth ? day.date.getDate() : ''}</span>`;
  }).join('');

  return `
    <button type="button" class="cal-mini-month${isCurrentMonth ? ' active' : ''}" data-month="${month}" data-year="${year}">
      <span class="cal-mini-month-name">${MONTHS_TITLE[month]}</span>
      <div class="cal-mini-grid">${miniDays}</div>
    </button>`;
}

function buildYearView(state, events) {
  const months = Array.from({ length: 12 }, (_, i) => miniMonth(state.year, i, state, events));
  return `<div class="cal-year-grid">${months.join('')}</div>`;
}

function buildAgenda(state, events) {
  const key = dateKey(state.selected);
  const evts = (events[key] || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const isToday = sameDay(state.selected, today());

  const list = evts.length
    ? evts.map((e) => `
        <div class="cal-event" data-id="${e.id}">
          <div class="cal-event-time">${formatTime(e.time)}</div>
          <div class="cal-event-body">
            <div class="cal-event-title">${escapeHtml(e.title)}</div>
            ${e.note ? `<div class="cal-event-note">${escapeHtml(e.note)}</div>` : ''}
          </div>
          <button type="button" class="cal-event-delete" data-delete="${e.id}" aria-label="Delete event">×</button>
        </div>`).join('')
    : `<p class="cal-no-events">${isToday ? 'No events today.' : 'No events for this day.'}</p>`;

  return `
    <div class="cal-agenda">
      <div class="cal-agenda-head">
        <span class="cal-agenda-label">${isToday ? 'Today' : 'Selected'}</span>
        <button type="button" class="cal-agenda-add" data-action="add-event" aria-label="Add event">+</button>
      </div>
      <div class="cal-agenda-date">${formatAgendaDate(state.selected)}</div>
      <div class="cal-event-list">${list}</div>
    </div>`;
}

function buildEventForm(state) {
  const key = dateKey(state.selected);
  return `
    <div class="cal-modal-overlay" data-action="close-modal">
      <form class="cal-modal" data-form="event">
        <h2 class="cal-modal-title">New event</h2>
        <p class="cal-modal-date">${formatAgendaDate(state.selected)}</p>
        <label class="cal-field">
          <span>Title</span>
          <input type="text" name="title" required maxlength="120" placeholder="Event title" autofocus>
        </label>
        <label class="cal-field">
          <span>Time</span>
          <input type="time" name="time" value="09:00">
        </label>
        <label class="cal-field">
          <span>Notes</span>
          <textarea name="note" rows="3" maxlength="500" placeholder="Optional notes"></textarea>
        </label>
        <input type="hidden" name="date" value="${key}">
        <div class="cal-modal-actions">
          <button type="button" class="cal-modal-cancel" data-action="close-modal">Cancel</button>
          <button type="submit" class="cal-modal-save">Save</button>
        </div>
      </form>
    </div>`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCalendarHTML(state, events) {
  const now = today();

  const header = state.view === 'year'
    ? `<div class="cal-strip cal-year-strip" data-strip="year">${buildYearStrip(state)}</div>`
    : `<div class="cal-strip cal-month-strip" data-strip="month">${buildMonthStrip(state)}</div>`;

  const body = state.view === 'year'
    ? buildYearView(state, events)
    : buildMonthView(state, events);

  return `
    <div class="cal-app" data-view="${state.view}">
      <header class="cal-header">
        <span class="cal-view-label">${state.view === 'year' ? 'YEAR' : 'MONTH'}</span>
        ${header}
      </header>
      <div class="cal-body">
        <main class="cal-main">${body}</main>
        ${buildAgenda(state, events)}
      </div>
      <footer class="cal-bar">
        <button type="button" class="cal-bar-btn cal-bar-today" data-action="today" title="Go to today">
          <span class="cal-bar-today-num">${now.getDate()}</span>
          <span class="cal-bar-today-mon">${MONTHS_TITLE[now.getMonth()].slice(0, 3)}</span>
        </button>
        <button type="button" class="cal-bar-btn cal-bar-add" data-action="add-event" title="Add event">+</button>
        <button type="button" class="cal-bar-btn cal-bar-switch" data-action="toggle-view" title="Switch view">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            ${state.view === 'year'
              ? '<rect x="3" y="4" width="18" height="17"/><line x1="3" y1="9" x2="21" y2="9"/>'
              : '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'}
          </svg>
        </button>
      </footer>
    </div>`;
}

function scrollActiveStrip(root) {
  requestAnimationFrame(() => {
    const active = root.querySelector('.cal-month-pill.active, .cal-year-pill.active');
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  });
}

function mountCalendar(catView) {
  let state = createState();
  let events = loadEvents();
  let showModal = false;

  function render() {
    catView.innerHTML = buildCalendarHTML(state, events) + (showModal ? buildEventForm(state) : '');
    const root = catView.querySelector('.cal-app');
    if (!root) return;
    bind(root);
    scrollActiveStrip(root);
  }

  function bind(root) {
    root.querySelector('[data-strip="month"]')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-month]');
      if (!btn) return;
      state.month = Number(btn.dataset.month);
      state.year = state.year;
      render();
    });

    root.querySelector('[data-strip="year"]')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-year]');
      if (!btn) return;
      state.year = Number(btn.dataset.year);
      render();
    });

    root.querySelector('.cal-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-date]');
      if (!btn) return;
      const [y, m, d] = btn.dataset.date.split('-').map(Number);
      state.selected = new Date(y, m - 1, d);
      if (m - 1 !== state.month || y !== state.year) {
        state.month = m - 1;
        state.year = y;
      }
      render();
    });

    root.querySelector('.cal-year-grid')?.addEventListener('click', (e) => {
      const mini = e.target.closest('.cal-mini-month');
      if (!mini) return;
      state.year = Number(mini.dataset.year);
      state.month = Number(mini.dataset.month);
      state.view = 'month';
      render();
    });

    root.querySelectorAll('[data-action="today"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const now = today();
        state.year = now.getFullYear();
        state.month = now.getMonth();
        state.selected = new Date(now);
        state.view = 'month';
        render();
      });
    });

    root.querySelectorAll('[data-action="toggle-view"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.view = state.view === 'month' ? 'year' : 'month';
        render();
      });
    });

    root.querySelectorAll('[data-action="add-event"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        showModal = true;
        render();
      });
    });

    root.querySelectorAll('[data-action="close-modal"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (e.target.classList.contains('cal-modal-overlay') || e.target.closest('[data-action="close-modal"]')) {
          showModal = false;
          render();
        }
      });
    });

    root.querySelector('[data-form="event"]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const key = fd.get('date');
      const title = String(fd.get('title') || '').trim();
      if (!title) return;
      const event = {
        id: uid(),
        title,
        time: String(fd.get('time') || ''),
        note: String(fd.get('note') || '').trim()
      };
      if (!events[key]) events[key] = [];
      events[key].push(event);
      saveEvents(events);
      showModal = false;
      render();
    });

    root.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delete;
        const key = dateKey(state.selected);
        events[key] = (events[key] || []).filter((ev) => ev.id !== id);
        if (!events[key].length) delete events[key];
        saveEvents(events);
        render();
      });
    });

    root.querySelector('.cal-modal')?.addEventListener('click', (e) => e.stopPropagation());
  }

  render();
}

export function openCalendarView() {
  const catView = document.querySelector('.cat-view');
  const hero = document.querySelector('.hero');
  if (!catView || !hero) return;

  catView.style.setProperty('--cat-color', '#0078d7');
  catView.classList.add('calendar-mode');
  showBackBtn('#0078d7', null, null);
  hero.classList.add('cv-open');
  catView.classList.add('open');
  catView.scrollTop = 0;
  mountCalendar(catView);
}

function bindCalendarCard() {
  const card = document.querySelector('#item-date .card-back');
  if (!card || card.dataset.calBound) return;
  card.dataset.calBound = 'true';
  card.addEventListener('click', (e) => {
    e.stopPropagation();
    openCalendarView();
  });
}

function initCalendarApp() {
  Promise.resolve(window.__homeReady)
    .catch(() => {})
    .finally(bindCalendarCard);
}

document.addEventListener('DOMContentLoaded', initCalendarApp);

export { bindCalendarCard };
