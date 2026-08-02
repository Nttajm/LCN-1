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
          { type: 'image', src: 'data/work/ou/proof-3.JPG', caption: 'Screenshot of OverUnderThs gameplay' },
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
  games: {
    color: '#38c219',
    cover: 'data/banners/games.jpg',
    title: 'Games',
    description: 'Browser-based games built for real engagement. From casual prediction to competitive multiplayer.',
    tiers: [
      {
        id: 'arcade',
        label: 'Over/under Series',
        cards: [
          {
            title: 'OverUnderThs',
            description: 'An interactive prediction game challenging players to analyze scenarios and make educated guesses to win. 207 players out of 330 studnets $50 revenue. more info on LCN.',
            gridImages: {
              mobile: [
                {
                  type: 'image',
                  src: 'data/work/ou/ou (1).png',
                  col: '1/2',
                  row: '1/3'
                },
                {
                  type: 'text',
                  content: 'Over under was a pretend betting/stock market game on school sports to help students be encouraged to be more excited about games and talk about school sports more as Tech High is in smallest High School Division.',
                  col: '2/4',
                  row: '1/3',
                  textStyle: 'body',
                  textSize: 'md',
                  textAlign: 'left',
                  verticalAlign: 'top'
                },
                {
                  type: 'image',
                  src: 'data/work/ou/ou (1).jpg',
                  col: '2/4',
                  row: '3/5'
                },
                {
                  type: 'text',
                  content: 'Picture of Harrison M. winning item shop prize.',
                  col: '1/2',
                  row: '3/4',
                  textStyle: 'body',
                  textSize: 'md',
                  textAlign: 'right',
                  verticalAlign: 'mid'
                },
                {
                  type: 'image',
                  src: 'data\\work\\ou\\ou (2).PNG',
                  col: '1/2',
                  row: '4/6'
                },
                {
                  type: 'text',
                  content: 'The game also featured a school stock market, where students can invest in teachers based on their characteristic like \'Yapping\' or \'when assignment is graded.\'',
                  col: '1/3',
                  row: '6/7',
                  textStyle: 'body',
                  textSize: 'md',
                  textAlign: 'left',
                  verticalAlign: 'mid'
                },
                {
                  type: 'image',
                  src: 'data/work/ou/ou (4).png',
                  col: '1/4',
                  row: '7/8'
                },
                {
                  type: 'image',
                  src: 'data/work/ou/ou (2).jpg',
                  col: '2/4',
                  row: '5/6'
                },
                {
                  type: 'text',
                  content: 'Picture above was taken when 93 active players were online during passing period.',
                  col: '3/4',
                  row: '6/7',
                  textStyle: 'body',
                  textSize: 'sm',
                  textAlign: 'left',
                  verticalAlign: 'top'
                },
                {
                  type: 'text',
                  content: 'Biggest challenge for this project was dealing with hackers and figuring out how to get the female population of the school to play.',
                  col: '1/4',
                  row: '8/9',
                  textStyle: 'body',
                  textSize: 'md',
                  textAlign: 'center',
                  verticalAlign: 'mid'
                }
              ],
              desktop: [
                {
                  type: 'image',
                  src: 'data/work/ou/ou (1).png',
                  col: '3/4',
                  row: '1/4'
                },
                {
                  type: 'text',
                  content: 'Over under was a pretend betting/stock market game on school sports to help students be encouraged to be more excited about games and talk about school sports more as Tech High is in smallest High School Division.',
                  col: '1/3',
                  row: '1/4',
                  textStyle: 'head',
                  textSize: 'xl',
                  textAlign: 'left',
                  verticalAlign: 'top'
                },
                {
                  type: 'image',
                  src: 'data/work/ou/ou (1).jpg',
                  col: '4/6',
                  row: '2/5'
                },
                {
                  type: 'text',
                  content: 'Picture of Harrison M. winning item shop prize.',
                  col: '5/6',
                  row: '5/6',
                  textStyle: 'body',
                  textSize: 'lg',
                  textAlign: 'center',
                  verticalAlign: 'mid'
                },
                {
                  type: 'image',
                  src: 'data\\work\\ou\\ou (2).PNG',
                  col: '1/3',
                  row: '7/14'
                },
                {
                  type: 'text',
                  content: 'The game also featured a school stock market, where students can invest in teachers based on their characteristic like \'Yapping\' or \'when assignment is graded.\'',
                  col: '1/3',
                  row: '4/5',
                  textStyle: 'head',
                  textSize: 'lg',
                  textAlign: 'left',
                  verticalAlign: 'mid'
                },
                {
                  type: 'image',
                  src: 'data/work/ou/ou (4).png',
                  col: '1/3',
                  row: '5/7'
                },
                {
                  type: 'image',
                  src: 'data/work/ou/ou (2).jpg',
                  col: '3/6',
                  row: '6/9'
                },
                {
                  type: 'text',
                  content: 'Picture above was taken when 93 active players were online during passing period.',
                  col: '4/6',
                  row: '9/10',
                  textStyle: 'body',
                  textSize: 'lg',
                  textAlign: 'left',
                  verticalAlign: 'top'
                },
                {
                  type: 'text',
                  content: 'Biggest challenge for this project was dealing with hackers and figuring out how to get the female population of the school to play.',
                  col: '3/6',
                  row: '12/14',
                  textStyle: 'head',
                  textSize: 'xl',
                  textAlign: 'center',
                  verticalAlign: 'mid'
                }
              ]
            },
            gridRows: {
              desktop: 14,
              mobile: 8
            }
          },
          {
            title: 'Mulon',
            description: 'A fast-paced strategy game built around resource management and real-time decision making, with a seasonal leaderboard system.',
            isInLcn: 'projects/josu',
            gridImages: {
              mobile: [
                {
                  src: 'data/work/games/mulon.png',
                  col: '1/3',
                  row: '1/3'
                }
              ],
              desktop: [
                {
                  src: 'data/work/mulon/mulon.png',
                  col: '1/3',
                  row: '1/3',
                  type: 'image'
                }
              ]
            }
          },
          {
            title: 'Josu',
            description: 'Card description.',
            gridImages: {
              mobile: [],
              desktop: [
                {
                  type: 'image',
                  src: 'data/work/josu/ss-5.jpg',
                  col: '4/6',
                  row: '6/8'
                },
                {
                  type: 'text',
                  col: '1/3',
                  row: '1/3',
                  content: 'Josu is a rhythm game, where you use your keyboard to tap to teh rythym, inpsired by osu.\n\n the game is web adapted version allowing players to play adaptiaon with also any song they want, by either making it or finding it in the explore page.',
                  textStyle: 'head',
                  textSize: 'xl',
                  textAlign: 'left',
                  verticalAlign: 'mid'
                },
                {
                  type: 'image',
                  src: 'data/work/josu/ss-1.png',
                  col: '3/6',
                  row: '1/4'
                },
                {
                  type: 'image',
                  src: 'data/work/josu/ss-2.png',
                  col: '1/3',
                  row: '4/6'
                },
                {
                  type: 'text',
                  content: 'screenshot of talkio, two button rythm mode, gameplay.',
                  col: '3/4',
                  row: '4/5',
                  textStyle: 'body',
                  textSize: 'lg',
                  textAlign: 'left',
                  verticalAlign: 'mid'
                }
              ]
            },
            gridRows: {
              desktop: 7,
              mobile: 5
            }
          }
        ],
        infoBlock: {
          Players: '200+',
          Revenue: '$50',
          Status: 'Active'
        }
      }
    ]
  },
  projects: {
    color: '#ff0000',
    cover: null,
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
                {
                  src: 'data/work/rfaa/main-image.png',
                  col: '1/3',
                  row: '1/3'
                }
              ],
              desktop: [
                {
                  src: 'data/work/rfaa/main-image.png',
                  col: '1/3',
                  row: '1/3'
                }
              ]
            }
          }
        ],
        infoBlock: {
          Type: 'Web App',
          Stack: 'Full-Stack',
          Status: 'Active'
        }
      },
      {
        id: 'experiments',
        label: 'Experiments',
        cards: [
          {
            title: 'Traffic Sim',
            description: 'A canvas-based traffic simulation exploring autonomous vehicle pathfinding and intersection logic, built iteratively.',
            gridImages: {
              mobile: [
                {
                  src: 'data/work/games/overunderThs.png',
                  col: '1/3',
                  row: '1/3'
                }
              ],
              desktop: [
                {
                  src: 'data/work/games/overunderThs.png',
                  col: '1/3',
                  row: '1/3'
                }
              ]
            }
          },
          {
            title: 'JM Bins',
            description: 'A clothing brand concept exploring product presentation, branding identity, and e-commerce layout for a local streetwear label.',
            gridImages: {
              mobile: [
                {
                  src: 'data/work/jmbins/jmbins.png',
                  col: '1/2',
                  row: '1/3'
                },
                {
                  src: 'data/work/jmbins/slides/hoodie.png',
                  col: '2/3',
                  row: '1/3'
                }
              ],
              desktop: [
                {
                  src: 'data/work/jmbins/jmbins.png',
                  col: '1/2',
                  row: '1/3'
                },
                {
                  src: 'data/work/jmbins/slides/hoodie.png',
                  col: '2/4',
                  row: '1/3'
                },
                {
                  src: 'data/work/jmbins/slides/shirt.png',
                  col: '4/6',
                  row: '2/4'
                }
              ]
            }
          }
        ],
        infoBlock: {
          Type: 'Experiment',
          Status: 'Archived'
        }
      }
    ]
  },
  demos: {
    color: '#E8590C',
    cover: null,
    title: 'Demos',
    description: 'Interactive prototypes and creative experiments.',
    tiers: [
      {
        id: 'simple',
        label: 'Simple',
        cards: [
          {
            title: 'La Costa Taqueria',
            description: 'A modern Mexican grill site with bold food photography, digital menu highlights, and a built-in loyalty system where guests earn and redeem store points.',
            gridImages: {
              mobile: [
                {
                  type: 'image',
                  src: 'data/work/lacosta/main-image.png',
                  col: '1/4',
                  row: '1/3'
                },
                {
                  type: 'text',
                  content: 'La Costa is a colorful modern Mexican grill experience — fresh plates, loud brand energy, and a site built to feel as alive as the kitchen.',
                  col: '1/4',
                  row: '3/4',
                  textStyle: 'body',
                  textSize: 'md',
                  textAlign: 'left',
                  verticalAlign: 'mid'
                },
                {
                  type: 'image',
                  src: 'data/work/lacosta/s-1.png',
                  col: '1/3',
                  row: '4/6'
                },
                {
                  type: 'text',
                  content: 'Home navigation for Menú, Order, Galería, and Redeem Points — with live points balance in the header.',
                  col: '3/4',
                  row: '4/6',
                  textStyle: 'body',
                  textSize: 'sm',
                  textAlign: 'left',
                  verticalAlign: 'mid'
                },
                {
                  type: 'image',
                  src: 'data/work/lacosta/poinst.png',
                  col: '2/4',
                  row: '6/8'
                },
                {
                  type: 'text',
                  content: 'Guests collect store points on every visit — earn per dollar, birthday bonuses, and referrals — then redeem at the counter.',
                  col: '1/2',
                  row: '6/8',
                  textStyle: 'body',
                  textSize: 'sm',
                  textAlign: 'left',
                  verticalAlign: 'top'
                },
                {
                  type: 'image',
                  src: 'data/work/lacosta/s-3.png',
                  col: '1/4',
                  row: '8/10'
                },
                {
                  type: 'text',
                  content: 'Featured specials like Birria Trio and Steak Quesadilla with one-tap Order Now CTAs.',
                  col: '1/4',
                  row: '10/11',
                  textStyle: 'body',
                  textSize: 'md',
                  textAlign: 'center',
                  verticalAlign: 'mid'
                }
              ],
              desktop: [
                {
                  type: 'text',
                  content: 'Modern Mexican grill website with loyalty points built in — guests browse, order, and redeem rewards from one colorful experience.',
                  col: '1/3',
                  row: '1/3',
                  textStyle: 'head',
                  textSize: 'xl',
                  textAlign: 'left',
                  verticalAlign: 'top'
                },
                {
                  type: 'image',
                  src: 'data/work/lacosta/main-image.png',
                  col: '3/6',
                  row: '1/3'
                },
                {
                  type: 'image',
                  src: 'data/work/lacosta/s-1.png',
                  col: '1/3',
                  row: '3/5'
                },
                {
                  type: 'text',
                  content: 'Desktop home with Menú, Order, Galería, and Redeem Points panels. Points balance stays pinned in the top bar so loyalty is always visible.',
                  col: '3/5',
                  row: '3/5',
                  textStyle: 'body',
                  textSize: 'lg',
                  textAlign: 'left',
                  verticalAlign: 'mid'
                },
                {
                  type: 'image',
                  src: 'data/work/lacosta/bar.png',
                  col: '1/6',
                  row: '5/6'
                },
                {
                  type: 'image',
                  src: 'data/work/lacosta/poinst.png',
                  col: '1/3',
                  row: '6/10'
                },
                {
                  type: 'text',
                  content: 'Store points system: +10 per $1 in-store, birthday bonuses, and referral rewards. Guests track balance and redeem codes at the counter.',
                  col: '3/6',
                  row: '6/8',
                  textStyle: 'head',
                  textSize: 'lg',
                  textAlign: 'left',
                  verticalAlign: 'mid'
                },
                {
                  type: 'image',
                  src: 'data/work/lacosta/s-3.png',
                  col: '3/6',
                  row: '8/11'
                },
                {
                  type: 'text',
                  content: 'Menu highlights section — seasonal specials with Order Now actions for PC and mobile.',
                  col: '1/3',
                  row: '10/11',
                  textStyle: 'body',
                  textSize: 'md',
                  textAlign: 'left',
                  verticalAlign: 'bot'
                }
              ]
            },
            gridRows: {
              desktop: 10,
              mobile: 10
            }
          }
        ],
        infoBlock: {
          Price: '$100–150',
          Pages: '1–4',
          Turnaround: '3–4 days'
        }
      }
    ]
  }
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

export function getLcnHref(path) {
  if (!path) return '#';
  const trimmed = String(path).trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('/')) return trimmed;
  const firstSegment = trimmed.split('/')[0];
  if (firstSegment.includes('.') && !firstSegment.startsWith('.')) {
    return `https://${trimmed.replace(/^\.?\//, '')}`;
  }
  return `../${trimmed.replace(/^\.?\//, '')}`;
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

export function showBackBtn(color, tagText, tagCatKey) {
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
  const useTopLayout = Boolean(catTitle);
  const group = document.querySelector('.cv-back-group');
  if (group) group.classList.toggle('lcn-above', useTopLayout);
  showBackBtn(color, catTitle, result.foundInKey);
  if (result.lcnPath) showLcnLink(result.lcnPath, { above: useTopLayout });

  hero.classList.add('cv-open');
  catView.classList.add('open');
}

function closeCatView() {
  const catView = document.querySelector('.cat-view');
  const hero = document.querySelector('.hero');
  const group = document.querySelector('.cv-back-group');

  clearCategoryLcnTracking();
  hideLcnLink();
  hideBackBtn();
  if (group) group.classList.remove('lcn-above');
  hero.classList.remove('cv-open');

  catView.classList.add('closing');
  catView.classList.remove('weather-mode', 'calendar-mode');
  catView.style.removeProperty('--wx-avg-color');
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
    window.location.href = getLcnHref(route.value);
  }
}

document.addEventListener('DOMContentLoaded', initCatView);
