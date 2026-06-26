// ─── Work Data (used by finder.js) ─────────────────────────────────────────

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
    cover: 'icons/games.png',
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
    ],
  },
  projects: {
    label: 'Projects',
    items: [
      {
        id: 'rfaa',
        name: 'RFAA',
        thumb: 'data/work/rfaa/main-image.png',
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
        thumb: 'data/work/rfaa/main-image.png',
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
    ],
  },
};

// ─── Cat-View Data ──────────────────────────────────────────────────────────

const catViews = {
  demos: {
    color: '#E8590C',
    title: 'Demos',
    description: 'Three tiers of web experiences. Each crafted with precision, tailored to different scales and ambitions.',
    tiers: [
      {
        id: 'simple',
        label: 'Simple',
        cards: [
          {
            title: 'La Costa del Sol',
            description: 'A refined 3–4 page presence. Clean layouts, essential information, timeless design. Perfect for restaurants, portfolios, and local businesses.',
            gridImages: {
              mobile: [
                { src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80', col: '1/3', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80', col: '2/3', row: '2/4' },
                { src: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80', col: '1/2', row: '3/4' },
              ],
              desktop: [
                { src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', col: '1/3', row: '1/3' },
                { src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80', col: '3/5', row: '2/4' },
                { src: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80', col: '5/6', row: '2/5' },
              ],
            },
          },
          {
            title: 'Atelier Noir',
            description: 'Minimal portfolio for creative professionals. Single-page flow with elegant typography and considered whitespace.',
            gridImages: {
              mobile: [
                { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80', col: '1/2', row: '1/3' },
                { src: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=400&q=80', col: '2/3', row: '2/4' },
                { src: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80', col: '2/3', row: '4/5' },
              ],
              desktop: [
                { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80', col: '1/4', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=400&q=80', col: '1/2', row: '2/4' },
                { src: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80', col: '2/4', row: '2/5' },
              ],
            },
          },
        ],
        infoBlock: { Price: '$100–150', Pages: '1–4', Turnaround: '3–4 days' },
      },
      {
        id: 'interactive',
        label: 'Interactive',
        cards: [
          {
            title: 'Kinetic Studio',
            description: 'Motion-driven portfolio with scroll animations, page transitions, and interactive galleries. For brands that demand attention.',
            gridImages: {
              mobile: [
                { src: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&q=80', col: '1/3', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80', col: '2/3', row: '2/3' },
                { src: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&q=80', col: '2/3', row: '3/5' },
              ],
              desktop: [
                { src: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&q=80', col: '3/5', row: '1/3' },
                { src: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80', col: '5/6', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&q=80', col: '1/3', row: '2/4' },
                { src: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=600&q=80', col: '1/3', row: '4/5' },
              ],
            },
          },
          {
            title: 'Meridian Commerce',
            description: 'E-commerce foundation with cart functionality, product filtering, and checkout flow. Stripe-ready, conversion-optimized.',
            gridImages: {
              mobile: [
                { src: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80', col: '1/2', row: '1/3' },
                { src: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&q=80', col: '2/3', row: '2/4' },
                { src: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80', col: '2/3', row: '4/5' },
              ],
              desktop: [
                { src: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80', col: '1/2', row: '1/3' },
                { src: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&q=80', col: '5/6', row: '1/3' },
                { src: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80', col: '2/4', row: '2/4' },
                { src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', col: '1/4', row: '4/5' },
              ],
            },
          },
        ],
        infoBlock: { Price: '$300–500', Pages: '5–10', Turnaround: '1–2 weeks' },
      },
      {
        id: 'app',
        label: 'App',
        cards: [
          {
            title: 'Nexus Dashboard',
            description: 'Full-featured web application with authentication, real-time data, and complex state management. SaaS-ready architecture.',
            gridImages: {
              mobile: [
                { src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80', col: '1/3', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80', col: '1/2', row: '2/4' },
                { src: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&q=80', col: '2/3', row: '3/5' },
              ],
              desktop: [
                { src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80', col: '1/4', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80', col: '1/2', row: '2/5' },
                { src: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=80', col: '2/4', row: '2/3' },
                { src: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&q=80', col: '2/4', row: '3/5' },
              ],
            },
          },
          {
            title: 'Pulse Analytics',
            description: 'Data visualization platform with charts, reports, and exportable insights. Built for teams that need clarity from complexity.',
            gridImages: {
              mobile: [
                { src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80', col: '2/3', row: '1/3' },
                { src: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=400&q=80', col: '1/2', row: '2/4' },
                { src: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=80', col: '1/3', row: '4/5' },
              ],
              desktop: [
                { src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80', col: '1/3', row: '1/3' },
                { src: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=400&q=80', col: '3/4', row: '2/4' },
                { src: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=80', col: '4/6', row: '2/3' },
                { src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80', col: '4/6', row: '3/5' },
              ],
            },
          },
        ],
        infoBlock: { Price: '$800–1500', Screens: '10+', Turnaround: '3–6 weeks' },
      },
    ],
  },

  games: {
    color: '#38c219',
    title: 'Games',
    description: 'Browser-based games built for real engagement. From casual prediction to competitive multiplayer.',
    tiers: [
      {
        id: 'arcade',
        label: 'Arcade',
        cards: [
          {
            title: 'OverUnderThs',
            description: 'An interactive prediction game challenging players to analyze scenarios and make educated guesses to win. 207 players, $50 revenue.',
            gridImages: {
              mobile: [
                { src: 'data/work/games/overunderThs.png', col: '1/3', row: '1/3' },
              ],
              desktop: [
                { src: 'data/work/games/overunderThs.png', col: '1/3', row: '1/3' },
              ],
            },
          },
          {
            title: 'Mulon',
            description: 'A fast-paced strategy game built around resource management and real-time decision making, with a seasonal leaderboard system.',
            gridImages: {
              mobile: [
                { src: 'data/work/games/mulon.png', col: '1/3', row: '1/3' },
              ],
              desktop: [
                { src: 'data/work/games/mulon.png', col: '1/3', row: '1/3' },
              ],
            },
          },
        ],
        infoBlock: { Players: '200+', Revenue: '$50', Status: 'Active' },
      },
      {
        id: 'multiplayer',
        label: 'Multiplayer',
        cards: [
          {
            title: 'Square',
            description: 'A collaborative pixel canvas where players place colored squares on a shared real-time grid. Inspired by r/place.',
            gridImages: {
              mobile: [
                { src: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80', col: '1/3', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&q=80', col: '1/2', row: '2/4' },
              ],
              desktop: [
                { src: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80', col: '1/4', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&q=80', col: '1/3', row: '2/4' },
              ],
            },
          },
          {
            title: 'Imposter',
            description: 'An online social deduction game with lobby creation, singleplayer mode, and multiplayer sessions. Inspired by Among Us.',
            gridImages: {
              mobile: [
                { src: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=600&q=80', col: '1/3', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&q=80', col: '2/3', row: '2/4' },
              ],
              desktop: [
                { src: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=800&q=80', col: '3/6', row: '1/3' },
                { src: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&q=80', col: '1/3', row: '2/4' },
              ],
            },
          },
        ],
        infoBlock: { Mode: 'Online', Players: '2–10', Status: 'Active' },
      },
      {
        id: 'puzzle',
        label: 'Puzzle',
        cards: [
          {
            title: 'Josu',
            description: 'A rhythm game inspired by osu! with a song browser, custom beatmap editor, and community song integration via Firebase.',
            gridImages: {
              mobile: [
                { src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80', col: '1/3', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80', col: '1/2', row: '2/4' },
              ],
              desktop: [
                { src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80', col: '1/4', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&q=80', col: '1/3', row: '2/4' },
              ],
            },
          },
          {
            title: 'Titan Games',
            description: 'A hub of word and puzzle games — crosswords, Nerdle, and other brain-teasing challenges with a clean NYT-inspired interface.',
            gridImages: {
              mobile: [
                { src: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&q=80', col: '1/3', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1580541832626-2a7131ee809f?w=400&q=80', col: '2/3', row: '2/4' },
              ],
              desktop: [
                { src: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800&q=80', col: '3/6', row: '1/3' },
                { src: 'https://images.unsplash.com/photo-1580541832626-2a7131ee809f?w=600&q=80', col: '1/3', row: '2/4' },
              ],
            },
          },
        ],
        infoBlock: { Mode: 'Solo', Games: '5+', Status: 'Growing' },
      },
    ],
  },

  projects: {
    color: '#2F9E44',
    title: 'Projects',
    description: 'Platforms, tools, and web applications built for real use cases and real people.',
    tiers: [
      {
        id: 'platforms',
        label: 'Platforms',
        cards: [
          {
            title: 'RFAA',
            description: 'A sports league management platform tracking matches, league tables, and player statistics across multiple competitions.',
            gridImages: {
              mobile: [
                { src: 'data/work/rfaa/main-image.png', col: '1/3', row: '1/3' },
              ],
              desktop: [
                { src: 'data/work/rfaa/main-image.png', col: '1/3', row: '1/3' },
                { src: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=600&q=80', col: '3/6', row: '2/4' },
              ],
            },
          },
          {
            title: 'Cascade',
            description: 'A collaborative workspace platform with user profiles, shared workspaces, sidebar-based navigation, and real-time updates.',
            gridImages: {
              mobile: [
                { src: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=80', col: '1/3', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80', col: '1/2', row: '2/4' },
              ],
              desktop: [
                { src: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80', col: '1/4', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80', col: '1/3', row: '2/4' },
                { src: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&q=80', col: '3/6', row: '3/5' },
              ],
            },
          },
        ],
        infoBlock: { Type: 'Web App', Stack: 'Full-Stack', Status: 'Active' },
      },
      {
        id: 'tools',
        label: 'Tools',
        cards: [
          {
            title: 'Manifest',
            description: 'A university tracking and planning tool helping students organize college applications, track deadlines, and compare schools.',
            gridImages: {
              mobile: [
                { src: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80', col: '1/3', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=80', col: '1/2', row: '2/4' },
              ],
              desktop: [
                { src: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80', col: '1/4', row: '1/2' },
                { src: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80', col: '1/3', row: '2/4' },
                { src: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80', col: '3/6', row: '3/5' },
              ],
            },
          },
        ],
        infoBlock: { Type: 'Tool', Users: 'Students', Status: 'Active' },
      },
      {
        id: 'experiments',
        label: 'Experiments',
        cards: [
          {
            title: 'Traffic Sim',
            description: 'A canvas-based traffic simulation exploring autonomous vehicle pathfinding and intersection logic, built iteratively across multiple versions.',
            gridImages: {
              mobile: [
                { src: 'data/work/games/overunderThs.png', col: '1/3', row: '1/3' },
              ],
              desktop: [
                { src: 'data/work/games/overunderThs.png', col: '1/3', row: '1/3' },
                { src: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&q=80', col: '3/6', row: '2/4' },
              ],
            },
          },
          {
            title: 'JM Bins',
            description: 'A clothing brand concept exploring product presentation, branding identity, and e-commerce layout for a local streetwear label.',
            gridImages: {
              mobile: [
                { src: 'data/work/jmbins/jmbins.png', col: '1/2', row: '1/3' },
                { src: 'data/work/jmbins/slides/hoodie.png', col: '2/3', row: '1/3' },
              ],
              desktop: [
                { src: 'data/work/jmbins/jmbins.png', col: '1/2', row: '1/3' },
                { src: 'data/work/jmbins/slides/hoodie.png', col: '2/4', row: '1/3' },
                { src: 'data/work/jmbins/slides/shirt.png', col: '4/6', row: '2/4' },
              ],
            },
          },
        ],
        infoBlock: { Type: 'Experiment', Status: 'Archived' },
      },
    ],
  },
};

// ─── Cat-View Renderers ────────────────────────────────────────────────────

function buildTextItemClasses(item) {
  const cls = ['cv-grid-item', 'text-item'];
  if (item.textSize && item.textSize !== 'md')     cls.push(`cv-ts-${item.textSize}`);
  if (item.textStyle && item.textStyle !== 'body') cls.push(`cv-tw-${item.textStyle}`);
  if (item.textAlign && item.textAlign !== 'center') cls.push(`cv-ta-${item.textAlign}`);
  if (item.verticalAlign && item.verticalAlign !== 'mid') cls.push(`cv-va-${item.verticalAlign}`);
  return cls.join(' ');
}

function renderGridItems(items) {
  return items.map(item => {
    const sty = `grid-column:${item.col};grid-row:${item.row}`;
    if (item.type === 'text') {
      const bg = item.bg ? `;background:${item.bg}` : '';
      const cls = buildTextItemClasses(item);
      return `<div class="${cls}" style="${sty}${bg}">${item.content || ''}</div>`;
    }
    return `<div class="cv-grid-item" style="${sty}"><img src="${item.src}" alt=""></div>`;
  }).join('');
}

function getGridRows(items = [], configuredRows, fallback) {
  const fromItems = items.reduce((max, item) => {
    const [, end = 2] = String(item.row ?? '1/2').split('/').map(Number);
    return Math.max(max, end - 1);
  }, 1);
  const configured = Number.isFinite(configuredRows) ? configuredRows : fallback;
  return Math.max(configured, fromItems);
}

function getCoverStyleAttr(cover) {
  return cover ? ` style="background-image: url('${cover}')"` : '';
}

function getDataAttr(name, value) {
  return value ? ` data-${name}="${String(value).replace(/"/g, '&quot;')}"` : '';
}

function getLcnHref(path) {
  if (!path) return '#';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
  return `../${path.replace(/^\.?\//, '')}`;
}

function renderCard(card) {
  const mobileItems = card.gridImages.mobile || [];
  const desktopItems = card.gridImages.desktop || [];
  const mobileRows = getGridRows(mobileItems, card.gridRows?.mobile, 5);
  const desktopRows = getGridRows(desktopItems, card.gridRows?.desktop, 4);
  return `
    <div class="cv-site-card"${getDataAttr('lcn', card.isInLcn)}>
      <h2 class="cv-card-title">${card.title}</h2>
      <p class="cv-card-desc">${card.description}</p>
      <div class="cv-screenshot-grid">
        <div class="cv-grid-mobile" style="--grid-rows:${mobileRows}">${renderGridItems(mobileItems)}</div>
        <div class="cv-grid-desktop" style="--grid-rows:${desktopRows}">${renderGridItems(desktopItems)}</div>
      </div>
    </div>`;
}

function renderInfoBlock(infoBlock) {
  const rows = Object.entries(infoBlock).map(([label, value]) =>
    `<div class="cv-info-row">
      <span class="cv-info-label">${label}</span>
      <span class="cv-info-value">${value}</span>
    </div>`
  ).join('');
  return `
    <div class="cv-info-block">
      <div class="cv-info-header">Info</div>
      ${rows}
    </div>`;
}

function renderSection(tier) {
  return `
    <section class="cv-section" id="cv-${tier.id}">
      ${tier.cards.map(renderCard).join('')}
      ${renderInfoBlock(tier.infoBlock)}
    </section>`;
}

// Cached views data loaded from single JSON file
let cachedViews = null;

async function loadViewsData() {
  if (cachedViews) return cachedViews;
  try {
    const res = await fetch('data/views.json');
    if (res.ok) cachedViews = await res.json();
  } catch {}
  return cachedViews || {};
}

async function buildCatView(categoryKey) {
  const allViews = await loadViewsData();
  let data = allViews[categoryKey] || catViews[categoryKey];

  if (!data) return false;

  const catView = document.querySelector('.cat-view');
  catView.style.setProperty('--cat-color', data.color);

  const cover = data.cover || null;

  const dailElems = data.tiers.map((tier, i) =>
    `<div class="cv-elem${i === 0 ? ' current' : ''}" data-target="cv-${tier.id}">${tier.label}</div>`
  ).join('');

  catView.innerHTML = `
    <div class="cv-explainer${cover ? ' has-cover' : ''}"${getCoverStyleAttr(cover)}>
      <div class="cv-explainer-inner">
        <h1>${data.title}</h1>
        <p>${data.description}</p>
      </div>
    </div>
    <div class="cv-dail">
      <div class="cv-elem-holder">${dailElems}</div>
    </div>
    <div class="cv-sections">
      ${data.tiers.map(renderSection).join('')}
    </div>`;

  initCatDail(catView);
  return true;
}

// ─── Cat-View Dail ─────────────────────────────────────────────────────────

function initCatDail(catView) {
  const elems = Array.from(catView.querySelectorAll('.cv-elem'));
  const elemHolder = catView.querySelector('.cv-elem-holder');
  const dail = catView.querySelector('.cv-dail');
  const sections = Array.from(catView.querySelectorAll('.cv-section'));

  let currentIndex = 0;
  let programmaticScroll = false;
  let dragStartY = null;
  let dragStartIndex = null;
  let isDragging = false;
  let wasDragging = false;

  const ITEM_HEIGHT = 25;
  const MIN_OFFSET = -(elems.length - 1) * ITEM_HEIGHT;
  const MAX_OFFSET = 0;

  function updatePosition() {
    elemHolder.style.transition = 'transform 0.3s ease';
    elemHolder.style.transform = `translateY(calc(-50% + ${-currentIndex * ITEM_HEIGHT}px))`;
  }

  function scrollToSection(index) {
    programmaticScroll = true;
    sections[index].scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => { programmaticScroll = false; }, 800);
  }

  function switchToIndex(index, doScroll = false) {
    if (index < 0 || index >= elems.length) return;
    elems[currentIndex].classList.remove('current');
    currentIndex = index;
    elems[currentIndex].classList.add('current');
    updatePosition();
    if (doScroll) scrollToSection(index);
  }

  updatePosition();

  elems.forEach((elem, index) => {
    elem.addEventListener('click', () => {
      if (!wasDragging) switchToIndex(index, true);
    });
  });

  function getDragIndex(deltaY) {
    return Math.max(0, Math.min(elems.length - 1, Math.round(dragStartIndex - deltaY / ITEM_HEIGHT)));
  }

  function applyDragTransform(deltaY) {
    let raw = -dragStartIndex * ITEM_HEIGHT + deltaY;
    if (raw > MAX_OFFSET) raw = MAX_OFFSET + (raw - MAX_OFFSET) * 0.25;
    if (raw < MIN_OFFSET) raw = MIN_OFFSET + (raw - MIN_OFFSET) * 0.25;
    elemHolder.style.transition = 'none';
    elemHolder.style.transform = `translateY(calc(-50% + ${raw}px))`;

    const tentative = getDragIndex(deltaY);
    if (tentative !== currentIndex) {
      elems[currentIndex].classList.remove('current');
      currentIndex = tentative;
      elems[currentIndex].classList.add('current');
    }
  }

  function endDrag(clientY) {
    if (!isDragging) return;
    isDragging = false;
    dail.classList.remove('dragging');
    const finalIndex = getDragIndex(clientY - dragStartY);
    elems[currentIndex].classList.remove('current');
    currentIndex = finalIndex;
    elems[currentIndex].classList.add('current');
    updatePosition();
    scrollToSection(finalIndex);
    setTimeout(() => { wasDragging = false; }, 0);
  }

  dail.addEventListener('mousedown', (e) => {
    dragStartY = e.clientY;
    dragStartIndex = currentIndex;
    isDragging = true;
    wasDragging = true;
    dail.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    applyDragTransform(e.clientY - dragStartY);
  });

  document.addEventListener('mouseup', (e) => {
    endDrag(e.clientY);
  });

  dail.addEventListener('touchstart', (e) => {
    dragStartY = e.touches[0].clientY;
    dragStartIndex = currentIndex;
    isDragging = true;
    wasDragging = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    applyDragTransform(e.touches[0].clientY - dragStartY);
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    endDrag(e.changedTouches[0].clientY);
  });

  catView.addEventListener('scroll', () => {
    if (programmaticScroll) return;
    const viewHeight = catView.clientHeight;
    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      if (rect.top < viewHeight * 0.4 && rect.top > -rect.height + viewHeight * 0.4) {
        if (index !== currentIndex) switchToIndex(index, false);
      }
    });
  }, { passive: true });
}

// ─── App-specific View Builder ─────────────────────────────────────────────

async function buildAppView(app) {
  const foundInKey = app.foundIn?.[0];
  if (!foundInKey) return false;

  // Load the category data from cached views or built-in catViews
  const allViews = await loadViewsData();
  let catData = allViews[foundInKey] || catViews[foundInKey];

  if (!catData) return false;

  const catView = document.querySelector('.cat-view');
  catView.style.setProperty('--cat-color', catData.color);
  
  // Set the app's logo/cover as background
  const appBackground = app.cover || app.logo;

  // Find the specific card that matches this app
  const allCards = catData.tiers.flatMap(t => t.cards);
  const appCard = allCards.find(card => 
    card.title.toLowerCase() === app.name.toLowerCase() ||
    card.title.toLowerCase().replace(/\s/g, '') === app.name.toLowerCase().replace(/\s/g, '')
  );

  // If we found a matching card, show only that one. Otherwise, show all cards as fallback.
  const cardsToShow = appCard ? [appCard] : allCards;
  const cardsHTML = cardsToShow.map(card => {
    const mobileItems = card.gridImages?.mobile || [];
    const desktopItems = card.gridImages?.desktop || [];
    const mobileRows = getGridRows(mobileItems, card.gridRows?.mobile, 5);
    const desktopRows = getGridRows(desktopItems, card.gridRows?.desktop, 4);
    return `
      <div class="cv-site-card"${getDataAttr('lcn', card.isInLcn)}>
        <div class="cv-screenshot-grid">
          <div class="cv-grid-mobile" style="--grid-rows:${mobileRows}">${renderGridItems(mobileItems)}</div>
          <div class="cv-grid-desktop" style="--grid-rows:${desktopRows}">${renderGridItems(desktopItems)}</div>
        </div>
      </div>`;
  }).join('');
  const lcnPath = app.isInLcn || appCard?.isInLcn || null;

  catView.innerHTML = `
    <div class="cv-explainer${appBackground ? ' has-cover' : ''}"${getCoverStyleAttr(appBackground)}>
      <div class="cv-explainer-inner">
        <h1>${app.name}</h1>
        <p>${app.description || ''}</p>
      </div>
    </div>
    <div class="cv-sections">
      <section class="cv-section" style="padding-top:2.5rem">
        ${cardsHTML}
      </section>
    </div>`;

  return { catData, foundInKey, lcnPath };
}

// ─── Cat-View Open / Close ─────────────────────────────────────────────────

let stopCategoryLcnTracking = null;
let lcnHideToken = 0;
let tagHideToken = 0;

function showBackBtn(color, tagText, tagCatKey) {
  const group = document.querySelector('.cv-back-group');
  const backBtn = document.querySelector('.cv-back-btn');
  const tag = document.querySelector('.cv-back-tag');

  group.style.setProperty('--cat-color', color);
  backBtn.classList.remove('hiding');
  backBtn.classList.add('visible');

  if (tagText && tag) {
    tagHideToken++;
    const label = tag.querySelector('.cv-back-tag-label');
    if (label) label.textContent = `Found in "${tagText}"`;
    tag.dataset.catKey = tagCatKey || '';
    tag.classList.remove('hiding');
    tag.classList.add('visible');
  } else if (tag) {
    tagHideToken++;
    const label = tag.querySelector('.cv-back-tag-label');
    if (label) label.textContent = '';
    tag.dataset.catKey = '';
    tag.classList.remove('visible', 'hiding');
  }
}

function showLcnLink(path, { above = false } = {}) {
  const group = document.querySelector('.cv-back-group');
  const link = document.querySelector('.cv-lcn-link');
  if (!group || !link || !path) return;

  lcnHideToken++;
  link.href = getLcnHref(path);
  group.classList.toggle('lcn-above', above);
  link.classList.remove('hiding');
  link.classList.add('visible');
}

function hideLcnLink({ clearAbove = true } = {}) {
  const group = document.querySelector('.cv-back-group');
  const link = document.querySelector('.cv-lcn-link');
  if (!group || !link) return;

  if (!link.classList.contains('visible')) {
    if (!link.classList.contains('hiding')) {
      link.removeAttribute('href');
      if (clearAbove) group.classList.remove('lcn-above');
    }
    return;
  }

  const token = ++lcnHideToken;
  link.classList.remove('visible');
  link.classList.add('hiding');
  link.addEventListener('animationend', () => {
    if (token !== lcnHideToken) return;
    link.classList.remove('hiding');
    link.removeAttribute('href');
    if (clearAbove) group.classList.remove('lcn-above');
  }, { once: true });
}

function clearCategoryLcnTracking() {
  if (!stopCategoryLcnTracking) return;
  stopCategoryLcnTracking();
  stopCategoryLcnTracking = null;
}

function initCategoryLcnTracking(catView) {
  clearCategoryLcnTracking();
  const cards = Array.from(catView.querySelectorAll('.cv-site-card[data-lcn]'));
  if (!cards.length) {
    hideLcnLink();
    return;
  }

  function updateLcnLink() {
    const viewportCenter = window.innerHeight * 0.52;
    let activeCard = null;
    let activeDistance = Infinity;

    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.bottom < window.innerHeight * 0.18 || rect.top > window.innerHeight * 0.82) return;
      const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportCenter);
      if (distance < activeDistance) {
        activeDistance = distance;
        activeCard = card;
      }
    });

    if (activeCard) {
      showLcnLink(activeCard.dataset.lcn);
    } else {
      hideLcnLink();
    }
  }

  catView.addEventListener('scroll', updateLcnLink, { passive: true });
  window.addEventListener('resize', updateLcnLink);
  requestAnimationFrame(updateLcnLink);

  stopCategoryLcnTracking = () => {
    catView.removeEventListener('scroll', updateLcnLink);
    window.removeEventListener('resize', updateLcnLink);
  };
}

function hideBackBtn() {
  const group = document.querySelector('.cv-back-group');
  const backBtn = document.querySelector('.cv-back-btn');
  const tag = document.querySelector('.cv-back-tag');

  backBtn.classList.remove('visible');
  backBtn.classList.add('hiding');
  if (tag && tag.classList.contains('visible')) {
    const token = ++tagHideToken;
    tag.classList.remove('visible');
    tag.classList.add('hiding');
    tag.addEventListener('animationend', () => {
      if (token !== tagHideToken) return;
      tag.classList.remove('hiding');
      const label = tag.querySelector('.cv-back-tag-label');
      if (label) label.textContent = '';
      tag.dataset.catKey = '';
    }, { once: true });
  }

  backBtn.addEventListener('animationend', () => {
    backBtn.classList.remove('hiding');
    group.style.removeProperty('--cat-color');
  }, { once: true });
}

export async function openCatView(categoryKey) {
  const catView = document.querySelector('.cat-view');
  const hero = document.querySelector('.hero');
  clearCategoryLcnTracking();
  hideLcnLink();

  const built = await buildCatView(categoryKey);
  if (!built) return;

  const color = catView.style.getPropertyValue('--cat-color');
  showBackBtn(color, null, null);
  initCategoryLcnTracking(catView);

  hero.classList.add('cv-open');
  catView.classList.add('open');
}

export async function openAppView(app) {
  const catView = document.querySelector('.cat-view');
  const hero = document.querySelector('.hero');
  clearCategoryLcnTracking();
  hideLcnLink();

  const result = await buildAppView(app);
  if (!result) {
    // Fallback: open regular cat-view for the category
    openCatView(app.category.toLowerCase());
    return;
  }

  const color = catView.style.getPropertyValue('--cat-color');
  const catTitle = result.catData.title || result.foundInKey;
  const lcnAbove = Boolean(result.lcnPath && catTitle);
  const group = document.querySelector('.cv-back-group');
  if (group) group.classList.toggle('lcn-above', lcnAbove);
  showBackBtn(color, catTitle, result.foundInKey);
  if (result.lcnPath) showLcnLink(result.lcnPath, { above: lcnAbove });

  hero.classList.add('cv-open');
  catView.classList.add('open');
}

function closeCatView() {
  const catView = document.querySelector('.cat-view');
  const hero = document.querySelector('.hero');

  clearCategoryLcnTracking();
  hideLcnLink();
  hideBackBtn();
  hero.classList.remove('cv-open');

  catView.classList.add('closing');
  catView.addEventListener('animationend', () => {
    catView.classList.remove('open', 'closing');
    catView.style.removeProperty('--cat-color');
    catView.style.removeProperty('--cat-cover');
    catView.innerHTML = '';
  }, { once: true });
}

// ─── Init ──────────────────────────────────────────────────────────────────

function initCatView() {
  document.querySelector('.cv-back-btn').addEventListener('click', closeCatView);

  // "Found in X" tag click → navigate to full cat-view
  const tag = document.querySelector('.cv-back-tag');
  if (tag) {
    tag.addEventListener('click', e => {
      e.stopPropagation();
      const catKey = tag.dataset.catKey;
      if (!catKey) return;
      closeCatView();
      setTimeout(() => openCatView(catKey), 400);
    });
  }

  // Wait for home.js to settle. If it took over the grid (dynamic layout from
  // data/home.json), it wires routing itself — so we skip to avoid double binds.
  Promise.resolve(window.__homeReady)
    .catch(() => {})
    .then(() => {
      if (window.__homeDynamic) return;
      bindStaticRouting();
    });
}

function bindStaticRouting() {
  fetch('data/apps.json')
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
      const apps = Array.isArray(json?.apps) ? json.apps : [];
      document.querySelectorAll('.card-back').forEach(card => {
        if (!homeCardHasRoute(card)) return;
        card.addEventListener('click', () => {
          openHomeRoute(resolveHomeRoute(card), apps);
        });
      });
    })
    .catch(() => {});
}

function readHomeRoute(el) {
  if (!el) return null;
  const category = el.getAttribute('data-showCat');
  if (category) return { type: 'category', value: category };
  const app = el.getAttribute('data-showApp');
  if (app) return { type: 'app', value: app };
  const link = el.getAttribute('data-showLink');
  if (link) return { type: 'link', value: link };
  return null;
}

function homeCardHasRoute(card) {
  return Boolean(readHomeRoute(card) || card.querySelector('.slide-item[data-showCat], .slide-item[data-showApp], .slide-item[data-showLink]'));
}

function resolveHomeRoute(card) {
  const activeSlide = card.querySelector('.slide-item.active');
  return readHomeRoute(activeSlide) || readHomeRoute(card);
}

function openHomeRoute(route, apps) {
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

document.addEventListener('DOMContentLoaded', initCatView);
