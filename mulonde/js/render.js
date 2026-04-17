import { select } from './util.js';

// ─── Data ────────────────────────────────────────────────────────────────────

export const work = {
  demos: {
    label: 'Demos',
    items: [
      {
        id: 'lacosta',
        name: 'La Costa Taqueria',
        thumb: 'data/work/lacosta/main-image.png',
        chips: [
          { label: 'Created 2024' },
          { label: 'Web Demo', tag: true },
        ],
        body: [
          { type: 'text', content: 'An interactive prototype built for La Costa Taqueria — a local restaurant brand. The demo showcases a digital menu and ordering experience.' },
          { type: 'text', content: 'Focused on clean layout, fast interaction, and mobile-first design principles.' },
        ],
      },
      {
        id: 'trafficsim',
        name: 'Traffic Sim',
        thumb: 'data/work/games/overunderThs.png',
        chips: [
          { label: 'Created 2024' },
          { label: 'Simulation', tag: true },
        ],
        body: [
          { type: 'text', content: 'A canvas-based traffic simulation demo experimenting with autonomous vehicle pathfinding and intersection logic.' },
          { type: 'text', content: 'Built iteratively across multiple versions, exploring different approaches to lane-changing and collision avoidance.' },
        ],
      },
    ],
  },
  games: {
    label: 'Games',
    items: [
      {
        id: 'overunderths',
        name: 'OverUnderThs',
        thumb: 'data/work/games/overunderThs.png',
        chips: [
          { label: 'Created Aug 2024' },
          { label: '207 played' },
          { label: 'Revenue: $50' },
          { label: 'Game', tag: true },
        ],
        body: [
          { type: 'text', content: 'OverUnderThs is an interactive game that challenges players to predict outcomes based on given scenarios.' },
          { type: 'text', content: 'Players must analyze the information provided and make educated guesses to succeed in the game.' },
          { type: 'image', src: '../bp/EE/assets/ouths/proof-4.JPG', caption: 'Screenshot of OverUnderThs gameplay' },
          { type: 'text', content: 'The game is designed to be engaging and thought-provoking, encouraging players to think critically and strategically.' },
        ],
      },
      {
        id: 'mulon',
        name: 'Mulon',
        thumb: 'data/work/games/mulon.png',
        chips: [
          { label: 'Created Feb 2026' },
          { label: 'Active' },
          { label: 'Game', tag: true },
        ],
        body: [
          { type: 'text', content: 'Mulon is a fast-paced strategy game built around resource management and real-time decision making.' },
          { type: 'text', content: 'Players compete to build and expand their network while managing limited resources under pressure.' },
          { type: 'text', content: 'The game features a leaderboard system and seasonal updates to keep gameplay fresh and competitive.' },
        ],
      },
      {
        id: 'square',
        name: 'Square',
        thumb: 'data/work/games/square.png',
        chips: [
          { label: 'Created 2025' },
          { label: 'Multiplayer' },
          { label: 'Game', tag: true },
        ],
        body: [
          { type: 'text', content: 'Square is a collaborative pixel canvas game where players place colored squares on a shared grid.' },
          { type: 'text', content: 'Inspired by r/place, users can claim coordinates and contribute to a growing digital artwork.' },
          { type: 'text', content: 'Features real-time updates and a color palette for creative expression.' },
        ],
      },
      {
        id: 'josu',
        name: 'Josu',
        thumb: 'data/work/games/josu.png',
        chips: [
          { label: 'Created 2025' },
          { label: 'Rhythm Game', tag: true },
        ],
        body: [
          { type: 'text', content: 'Josu is a rhythm game inspired by osu! where players hit notes in sync with music.' },
          { type: 'text', content: 'Features a song browser, custom beatmap editor, and integration with Firebase for community songs.' },
          { type: 'text', content: 'Built with precision timing mechanics and arrow-based gameplay.' },
        ],
      },
      {
        id: 'imposter',
        name: 'Imposter',
        thumb: 'data/work/games/imposter.png',
        chips: [
          { label: 'Created 2025' },
          { label: 'Multiplayer' },
          { label: 'Game', tag: true },
        ],
        body: [
          { type: 'text', content: 'Imposter is an online social deduction game where players identify the hidden imposter among them.' },
          { type: 'text', content: 'Features lobby creation, singleplayer mode, and multiplayer sessions with friends.' },
          { type: 'text', content: 'Inspired by games like Among Us with a browser-based experience.' },
        ],
      },
      {
        id: 'titangames',
        name: 'Titan Games',
        thumb: 'data/work/games/titangames.png',
        chips: [
          { label: 'Created 2025' },
          { label: 'Game Hub', tag: true },
        ],
        body: [
          { type: 'text', content: 'Titan Games is a collection of word and puzzle games in one hub.' },
          { type: 'text', content: 'Includes crosswords, Nerdle, and other brain-teasing games inspired by popular daily puzzles.' },
          { type: 'text', content: 'Features a clean NYT-inspired interface with multiple game modes.' },
        ],
      },
    ],
  },
  projects: {
    label: 'Projects',
    items: [
      {
        id: 'rfaa',
        name: 'RFAA',
        thumb: 'data/work/projects/rfaa.png',
        chips: [
          { label: 'Created 2024' },
          { label: 'Sports Platform', tag: true },
        ],
        body: [
          { type: 'text', content: 'RFAA is a sports league management platform tracking matches, tables, and player statistics.' },
          { type: 'text', content: 'Features multiple league support including ACL, with detailed team and player info pages.' },
          { type: 'text', content: 'Built to follow real-time match data and historical records.' },
        ],
      },
      {
        id: 'manifest',
        name: 'Manifest',
        thumb: 'data/work/projects/manifest.png',
        chips: [
          { label: 'Created 2025' },
          { label: 'Education', tag: true },
        ],
        body: [
          { type: 'text', content: 'College Manifest is a university tracking and planning tool for students.' },
          { type: 'text', content: 'Helps users organize college applications, track deadlines, and compare universities.' },
          { type: 'text', content: 'Features profile setup with graduation year and personalized recommendations.' },
        ],
      },
      {
        id: 'cascade',
        name: 'Cascade',
        thumb: 'data/work/projects/cascade.png',
        chips: [
          { label: 'Created 2025' },
          { label: 'Collaboration', tag: true },
        ],
        body: [
          { type: 'text', content: 'Cascade is a collaborative workspace platform for teams and individuals.' },
          { type: 'text', content: 'Features user profiles, shared workspaces, and a clean sidebar-based navigation.' },
          { type: 'text', content: 'Built for seamless collaboration with authentication and real-time updates.' },
        ],
      },
    ],
  },
};

// ─── Renderers ───────────────────────────────────────────────────────────────

function renderChips(chips) {
  return chips
    .map(c => `<span class="chip${c.tag ? ' chip-tag' : ''}">${c.label}</span>`)
    .join('');
}

function renderBody(body) {
  return body
    .map(block => {
      if (block.type === 'text') {
        return `<span>${block.content}</span>`;
      }
      if (block.type === 'image') {
        return `
          <div class="v-image">
            <div class="image"><img src="${block.src}" alt="${block.caption}"></div>
            <div class="img-text">${block.caption}</div>
          </div>`;
      }
      return '';
    })
    .join('');
}

function renderDetail(category, id) {
  const item = category.items.find(i => i.id === id);
  if (!item) return;
  document.querySelector('.about-sel-content').innerHTML = `
    <div class="header-block">
      <div class="header">${item.name}</div>
      <div class="meta-chips">${renderChips(item.chips)}</div>
    </div>
    <div class="text-item">${renderBody(item.body)}</div>
  `;
}

function renderSidebar(category, defaultId) {
  const container = document.querySelector('.rel-content');
  container.innerHTML = '';

  category.items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'v-item' + (item.id === defaultId ? ' selected' : '');
    el.dataset.id = item.id;
    el.innerHTML = `
      <img src="${item.thumb}" alt="${item.name}">
      <div class="item-name">${item.name}</div>
    `;
    container.appendChild(el);
  });

  const allItems = container.querySelectorAll('.v-item');
  allItems.forEach(el => {
    el.addEventListener('click', () => {
      select(allItems, el.dataset.id, id => renderDetail(category, id));
    });
  });
}

// ─── Viewer open/close ───────────────────────────────────────────────────────

function openViewer(categoryKey) {
  const category = work[categoryKey];
  if (!category) return;

  const viewer = document.querySelector('.viewer');
  const hero   = document.querySelector('.hero');

  // Swap category background class
  viewer.className = `viewer ${categoryKey} open`;

  // Render content
  const defaultId = category.items[0].id;
  document.querySelector('.v-title').textContent = category.label;
  renderSidebar(category, defaultId);
  renderDetail(category, defaultId);

  hero.classList.add('viewer-open');
}

function closeViewer() {
  const viewer = document.querySelector('.viewer');
  const hero   = document.querySelector('.hero');

  viewer.classList.add('closing');
  hero.classList.remove('viewer-open');

  viewer.addEventListener('animationend', () => {
    viewer.classList.remove('open', 'closing');
    // clear category class so background doesn't bleed through
    viewer.className = 'viewer';
  }, { once: true });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function initViewer() {
  // Close button
  document.querySelector('.viewer-close-btn').addEventListener('click', closeViewer);

  // Card backs with data-showCat open the viewer on click
  document.querySelectorAll('.card-back[data-showCat]').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.showcat ?? card.getAttribute('data-showCat');
      openViewer(cat);
    });
  });
}

document.addEventListener('DOMContentLoaded', initViewer);
