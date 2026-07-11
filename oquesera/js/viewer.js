/**
 * viewer.js – Full-screen info viewer for magazine covers.
 *
 * The viewer itself fills the phone. The clicked photo is cloned at its exact
 * home-page rect, then moved into the first photo slot below the description.
 */

const DEMO_DATA = {
  inde_1: {
    title: 'Juan Gabriel Mezcla',
    desc: 'Opening para documental Serie Netflix – Juan Gabriel. Serie documental de Netflix sobre la vida y obra de Juan Gabriel, uno de los artistas más influyentes de la música latinoamericana. Se diseñó un lenguaje visual basado en animación y collage, apostando por una interpretación más sensorial y contemporánea, conectando con distintas generaciones.',
    media: [
      { type: 'image', src: 'data/inde_n/cover_page.jpg' },
    ],
  },
  lana_1: {
    title: 'Lana Del Rey',
    desc: 'A visual exploration of melancholy and americana, capturing the essence of cinematic nostalgia through vintage aesthetics and dreamlike imagery.',
    media: [
      { type: 'image', src: 'data/lana-1/lana-mag-4.jpg' },
    ],
  },
  'eyn-1': {
    title: 'EYN Issue One',
    desc: 'The debut issue exploring contemporary visual culture, featuring bold typography and experimental photography that pushes the boundaries of editorial design.',
    media: [
      { type: 'image', src: 'data/EYN1/cover_page.png' },
    ],
  },
  'marabella-1': {
    title: 'Marabella',
    desc: 'A celebration of timeless elegance and modern sensibility, weaving together fashion, art, and storytelling in a visually stunning narrative.',
    media: [
      { type: 'image', src: 'data/marabella-1/cover_page.webp' },
    ],
  },
};

const TRANSITION_MS = 640;

let viewerOpen = false;
let activeMag = null;
let infoViewer = null;
let photoClone = null;

// ─── Build DOM shell ────────────────────────────────────────────────────────

function createViewerShell() {
  infoViewer = document.createElement('div');
  infoViewer.className = 'info-viewer description-font';
  infoViewer.innerHTML = `
    <div class="iv-inner">
      <div class="iv-text-block">
        <h1 class="iv-title"></h1>
        <p class="iv-desc"></p>
      </div>
      <div class="iv-media"></div>
    </div>
    <button class="iv-x" type="button" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
           stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  infoViewer.querySelector('.iv-x').addEventListener('click', closeViewer);
  document.body.appendChild(infoViewer);
}

// ─── Populate content ───────────────────────────────────────────────────────

function getDisplaySrc(mag) {
  const img = mag.querySelector('img');
  return img?.currentSrc || img?.src || img?.getAttribute('src') || '';
}

function populateViewer(magKey, coverSrc) {
  const data = DEMO_DATA[magKey] || {
    title: 'Untitled',
    desc: 'Demo description.',
    media: [],
  };

  // Text block
  infoViewer.querySelector('.iv-title').textContent = data.title;
  infoViewer.querySelector('.iv-desc').textContent = data.desc;

  // Media: first item is a placeholder for the moving cloned cover.
  const mediaEl = infoViewer.querySelector('.iv-media');
  const extraItems = data.media.filter(item => item.src !== coverSrc).map(item => {
    if (item.type === 'video') {
      return `
        <div class="iv-media-item has-play">
          <video src="${item.src}" poster="${item.poster || ''}" controls playsinline></video>
        </div>`;
    }
    return `<div class="iv-media-item"><img src="${item.src}" alt=""></div>`;
  }).join('');

  mediaEl.innerHTML = `<div class="iv-media-item iv-cover-slot"></div>` + extraItems;
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

function applyCloneRect({ top, left, width, height }) {
  Object.assign(photoClone.style, {
    top:    `${top}px`,
    left:   `${left}px`,
    width:  `${width}px`,
    height: `${height}px`,
  });
}

function createPhotoClone(src, rect) {
  photoClone = document.createElement('div');
  photoClone.className = 'iv-photo-clone';
  photoClone.innerHTML = `<img src="${src}" alt="">`;
  document.body.appendChild(photoClone);
  applyCloneRect(rect);
}

function getCoverSlotRect() {
  return infoViewer.querySelector('.iv-cover-slot').getBoundingClientRect();
}

// ─── Open / Close ────────────────────────────────────────────────────────────

function openViewer(mag) {
  if (viewerOpen) return;
  viewerOpen = true;
  activeMag = mag;

  const startRect = mag.getBoundingClientRect();
  const coverSrc = getDisplaySrc(mag);
  populateViewer(mag.dataset.mag, coverSrc);

  // Reset content state
  infoViewer.classList.remove('open', 'revealed');
  infoViewer.querySelector('.iv-inner').scrollTop = 0;
  infoViewer.style.setProperty('--iv-cover-h', `${startRect.height}px`);

  // Prevent body scroll, hide page chrome
  document.body.classList.add('viewer-open');
  infoViewer.classList.add('open');

  createPhotoClone(coverSrc, startRect);
  activeMag.classList.add('viewer-source');

  // Move the cloned photo into the first media slot under the description.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      applyCloneRect(getCoverSlotRect());
    });
  });

  // Reveal the text after the photo has started aligning with the viewer.
  setTimeout(() => {
    infoViewer.classList.add('revealed');
  }, TRANSITION_MS * 0.55);
}

function closeViewer() {
  if (!viewerOpen || !activeMag) return;

  infoViewer.classList.remove('revealed');

  // Start from the current cover slot, then return to the home-page mag rect.
  setTimeout(() => {
    applyCloneRect(getCoverSlotRect());
    const endRect = activeMag.getBoundingClientRect();
    requestAnimationFrame(() => {
      applyCloneRect(endRect);
      infoViewer.classList.remove('open');
      document.body.classList.remove('viewer-open');
    });

    setTimeout(() => {
      activeMag.classList.remove('viewer-source');
      infoViewer.style.removeProperty('--iv-cover-h');
      photoClone?.remove();
      photoClone = null;
      viewerOpen = false;
      activeMag = null;
    }, TRANSITION_MS);
  }, 200);
}

// ─── Init ────────────────────────────────────────────────────────────────────

function init() {
  createViewerShell();

  document.querySelectorAll('.mag').forEach(mag => {
    mag.addEventListener('click', e => {
      e.stopPropagation();
      if (!viewerOpen) openViewer(mag);
    });
  });

  window.addEventListener('resize', () => {
    if (viewerOpen && photoClone) {
      applyCloneRect(getCoverSlotRect());
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
