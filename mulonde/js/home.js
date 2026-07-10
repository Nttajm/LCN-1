import { openCatView, openAppView } from './render.js';
import { bindWeatherCard } from './weather-app.js';
import { bindCalendarCard } from './calendar-app.js';

// ─── Home grid renderer ──────────────────────────────────────────────────────
// Reads data/home.json and rebuilds the .grid so the layout editor (layout.html)
// can drive the home page. If the file is missing or malformed, the static
// markup already in index.html is left untouched.

const BREAKPOINTS = ['desktop', 'tablet', 'mobile'];

let appsCache = null;

async function loadApps() {
  if (appsCache) return appsCache;
  try {
    const res = await fetch('data/apps.json');
    if (res.ok) {
      const json = await res.json();
      appsCache = Array.isArray(json?.apps) ? json.apps : [];
      return appsCache;
    }
  } catch {}
  appsCache = [];
  return appsCache;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Allow a tiny set of inline tags (e.g. <br>) in text slides / explainer lines.
function richText(s) {
  return esc(s).replace(/&lt;br\s*\/?&gt;/gi, '<br>');
}

// ─── Slide markup ─────────────────────────────────────────────────────────────
function renderSlide(slide, isFirst) {
  const active = isFirst ? ' active' : '';
  const route = routeAttr(slide.route);
  switch (slide.type) {
    case 'explainer': {
      const wImg = slide.icon ? ' wImg' : '';
      const color = slide.color || '#E8590C';
      let inner = `<h3 class="explainer-heading">${richText(slide.heading || '')}</h3>`;
      if (slide.icon) {
        inner += `<img class="spicon" src="${esc(slide.icon)}" alt="">`;
      } else if (Array.isArray(slide.list) && slide.list.length) {
        inner += `<ul class="explainer-list">${slide.list.map(li => `<li>${richText(li)}</li>`).join('')}</ul>`;
      }
      if (slide.brand) inner += `<span class="explainer-brand">${esc(slide.brand)}</span>`;
      return `<div class="slide-item slide-explainer${wImg}${active}"${route} style="--card-color: ${esc(color)};"><div class="explainer-card">${inner}</div></div>`;
    }
    case 'text':
      return `<div class="slide-item${active}"${route}><div class="slide-text">${richText(slide.content || '')}</div></div>`;
    case 'html':
      return `<div class="slide-item${active}"${route}>${slide.html || ''}</div>`;
    case 'aboutLogo':
      return `<div class="slide-item about-i-slide${active}"${route}><span class="about-i">${esc(slide.content || 'i')}</span></div>`;
    case 'aboutBio':
      return `<div class="slide-item about-bio-slide${active}"${route}><div class="about-bio-text"><span class="bio-role">${richText(slide.content || '')}</span></div></div>`;
    case 'image':
    default: {
      const title = slide.title
        ? `<div class="title"><span>${richText(slide.title)}</span></div>`
        : '';
      return `<div class="slide-item${active}"${route}><img src="${esc(slide.src || '')}" alt="">${title}</div>`;
    }
  }
}

function renderSlides(item) {
  const slides = item.slides || [];
  if (!slides.length) return '';
  const multi = slides.length > 1;
  const attrs = multi
    ? ` data-slideshow="true" data-interval="${item.interval || 3500}"`
    : '';
  return `<div class="slides"${attrs}>${slides.map((s, i) => renderSlide(s, i === 0)).join('')}</div>`;
}

// ─── Widget markup (weather / date) ─────────────────────────────────────────────
function renderWeather() {
  return `<div class="weather-holder">
    <div class="temp">67°</div>
    <div class="info">
      <div class="place">Rohnert Park, CA</div>
      <div class="desc">Partly Cloudy</div>
      <div class="hi-low">64° / 52°</div>
    </div>
    <div class="app">Weather</div>
  </div>`;
}

function renderDate() {
  return `<div class="date-holder">
    <div class="date"></div>
    <div class="info">
      <div class="month"></div>
      <div class="day"></div>
    </div>
    <div class="app">Calender</div>
  </div>`;
}

function renderLoaderFront() {
  return `<svg class="loader" viewBox="0 0 100 100">
      <circle class="loader-bg" cx="50" cy="50" r="45"></circle>
      <circle class="loader-progress" cx="50" cy="50" r="45"></circle>
    </svg>
    <span class="loader-text">0%</span>`;
}

// ─── Item markup ────────────────────────────────────────────────────────────────
function routeAttr(route) {
  if (!route || route.type === 'none' || !route.value) return '';
  if (route.type === 'category') return ` data-showCat="${esc(route.value)}"`;
  if (route.type === 'app') return ` data-showApp="${esc(route.value)}"`;
  if (route.type === 'link') return ` data-showLink="${esc(route.value)}"`;
  return '';
}

function renderBackContent(item) {
  if (String(item.backHtml || '').trim()) return item.backHtml;

  switch (item.kind) {
    case 'weather': return renderWeather();
    case 'date': return renderDate();
    default: return renderSlides(item);
  }
}

function renderItem(item) {
  const small = item.small ? ' item-small' : '';
  const front = item.kind === 'loader' ? renderLoaderFront() : '';
  return `<div id="${esc(item.id)}" class="grid-item${small}">
    <div class="cards">
      <div class="card card-front">${front}</div>
      <div class="card card-back"${routeAttr(item.route)}>${renderBackContent(item)}</div>
    </div>
  </div>`;
}

// ─── Layout CSS generation ──────────────────────────────────────────────────────
function gridTemplate(g) {
  return `grid-template-columns: repeat(${g.cols}, 1fr); grid-template-rows: repeat(${g.rows}, 1fr);`;
}

function itemPosRules(items, bp) {
  return items
    .filter(it => it.pos?.[bp])
    .map(it => {
      const p = it.pos[bp];
      return `#${it.id}{grid-column:${p.col};grid-row:${p.row};}`;
    })
    .join('');
}

function buildLayoutCSS(data) {
  const { grid, items } = data;
  const colorRules = items
    .filter(it => it.color)
    .map(it => `#${it.id} .card-back{background-color:${it.color};}`)
    .join('');

  let css = `.grid{${gridTemplate(grid.desktop)}}`;
  css += itemPosRules(items, 'desktop');
  css += colorRules;
  css += `@media (min-width:769px) and (max-width:1100px){.grid{${gridTemplate(grid.tablet)}}${itemPosRules(items, 'tablet')}}`;
  css += `@media (max-width:768px){.grid{${gridTemplate(grid.mobile)}}${itemPosRules(items, 'mobile')}}`;
  return css;
}

function injectLayoutCSS(css) {
  let style = document.getElementById('home-layout-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'home-layout-style';
    document.head.appendChild(style);
  }
  style.textContent = css;
}

// ─── Routing ────────────────────────────────────────────────────────────────────
async function wireRouting() {
  const apps = await loadApps();

  document.querySelectorAll('.grid .card-back').forEach(card => {
    if (!cardHasRoute(card)) return;
    card.addEventListener('click', () => {
      openRoute(resolveActiveRoute(card), apps);
    });
  });
}

function readRoute(el) {
  if (!el) return null;
  const category = el.getAttribute('data-showCat');
  if (category) return { type: 'category', value: category };
  const app = el.getAttribute('data-showApp');
  if (app) return { type: 'app', value: app };
  const link = el.getAttribute('data-showLink');
  if (link) return { type: 'link', value: link };
  return null;
}

function cardHasRoute(card) {
  return Boolean(readRoute(card) || card.querySelector('.slide-item[data-showCat], .slide-item[data-showApp], .slide-item[data-showLink]'));
}

function resolveActiveRoute(card) {
  const activeSlide = card.querySelector('.slide-item.active');
  return readRoute(activeSlide) || readRoute(card);
}

function openRoute(route, apps) {
  if (!route) return;
  if (route.type === 'category') {
    openCatView(route.value);
    return;
  }
  if (route.type === 'app') {
    const app = apps.find(a => a.id === route.value);
    if (app) openAppView(app);
    return;
  }
  if (route.type === 'link') {
    window.location.href = route.value;
  }
}

// ─── Build ──────────────────────────────────────────────────────────────────────
async function buildHome() {
  let data;
  try {
    const res = await fetch('data/home.json');
    if (!res.ok) return; // keep static markup
    data = await res.json();
  } catch {
    return;
  }
  if (!data || !Array.isArray(data.items) || !data.items.length) return;

  const grid = document.querySelector('.grid');
  if (!grid) return;

  grid.innerHTML = data.items.map(renderItem).join('');
  injectLayoutCSS(buildLayoutCSS(data));
  window.__homeDynamic = true;
  await wireRouting();
  bindWeatherCard();
  bindCalendarCard();
}

// Expose a readiness promise so animation.js can wait for the dynamic grid
// before starting the loader / flip / slideshows.
window.__homeReady = buildHome();

export { BREAKPOINTS };
