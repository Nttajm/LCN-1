/**
 * pixel.js – Pixelation reveal effect for .mag covers.
 *
 * Flow (standard image):
 *   random noise → 12 → 20 → 32 → 50 → 75 → 110 → 160 → 240 → 350 → 500 → full
 *
 * Flow (cover_page_pixel):
 *   pixel placeholder image (coarsely sampled) →
 *   load real cover_page → same steps → full
 */

// Sampling resolutions (column count); rows are derived from aspect ratio.
// More steps + going up to 500 = smooth, gradual reveal.
const REVEAL_STEPS = [12, 20, 32, 50, 75, 110, 160, 240, 350];
const STEP_MS      = 90; // ms between de-pixelation steps

// A dark, moody palette for the "before load" random noise
const NOISE_PALETTE = [
  '#0d0d0d', '#1a1a1a', '#111827', '#1e3a5f',
  '#2d1b69', '#3b0764', '#450a0a', '#1c1917',
  '#0f172a', '#172554', '#1a0533', '#0c0a09',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** Load an Image, resolve on load, resolve null on error. */
function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Calculate source rect for "object-fit: cover" behavior.
 * Returns { sx, sy, sw, sh } to use in drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)
 */
function getCoverRect(srcW, srcH, destW, destH) {
  const srcRatio  = srcW / srcH;
  const destRatio = destW / destH;

  let sw, sh, sx, sy;

  if (srcRatio > destRatio) {
    // Source is wider — crop horizontally
    sh = srcH;
    sw = srcH * destRatio;
    sx = (srcW - sw) / 2;
    sy = 0;
  } else {
    // Source is taller — crop vertically
    sw = srcW;
    sh = srcW / destRatio;
    sx = 0;
    sy = (srcH - sh) / 2;
  }

  return { sx, sy, sw, sh };
}

/**
 * Draw `source` onto `ctx` at `cols × rows` resolution then scale back up
 * to fill `w × h` — producing a blocky / pixelated look.
 * Uses "cover" cropping to match the <img> object-fit behavior.
 */
function drawAtResolution(ctx, source, cols, rows, w, h) {
  const { sx, sy, sw, sh } = getCoverRect(source.width, source.height, w, h);

  const tmp = document.createElement('canvas');
  tmp.width  = cols;
  tmp.height = rows;
  const tc = tmp.getContext('2d');
  tc.imageSmoothingEnabled = false;
  // Draw from the cropped source region into the small temp canvas
  tc.drawImage(source, sx, sy, sw, sh, 0, 0, cols, rows);

  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, w, h);
}

/**
 * Draw source onto ctx with "cover" behavior at full resolution.
 */
function drawCover(ctx, source, w, h) {
  const { sx, sy, sw, sh } = getCoverRect(source.width, source.height, w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
}

/** Fill canvas with random-colored blocks (noise placeholder). */
function drawNoise(ctx, blockPx, w, h) {
  const cols = Math.ceil(w / blockPx);
  const rows = Math.ceil(h / blockPx);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = NOISE_PALETTE[Math.floor(Math.random() * NOISE_PALETTE.length)];
      ctx.fillRect(c * blockPx, r * blockPx, blockPx, blockPx);
    }
  }
}

/** Fade the canvas out then remove it. */
function fadeOutCanvas(canvas) {
  canvas.style.transition = 'opacity 0.5s ease';
  canvas.style.opacity    = '0';
  canvas.addEventListener('transitionend', () => canvas.remove(), { once: true });
}

// ─── Core reveal sequence ────────────────────────────────────────────────────

async function runReveal(canvas, imgElement) {
  const ctx = canvas.getContext('2d');
  const w   = canvas.width;
  const h   = canvas.height;

  for (const res of REVEAL_STEPS) {
    // Determine block count based on aspect; use res as the narrower dimension
    const aspect = h / w;
    const cols   = res;
    const rows   = Math.max(1, Math.round(res * aspect));
    drawAtResolution(ctx, imgElement, cols, rows, w, h);
    await delay(STEP_MS);
  }

  // Full-res render with cover behavior
  drawCover(ctx, imgElement, w, h);

  fadeOutCanvas(canvas);
}

// ─── Per-element setup ───────────────────────────────────────────────────────

function setupMag(magEl) {
  const imgEl = magEl.querySelector('img');
  if (!imgEl) return;

  const src         = imgEl.getAttribute('src') || '';
  const isPixelSrc  = /_pixel\b/.test(src) || src.includes('_pixel.');

  // Build canvas overlay
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position       : 'absolute',
    inset          : '0',
    width          : '100%',
    height         : '100%',
    imageRendering : 'pixelated',
    pointerEvents  : 'none',
    zIndex         : '2',
    opacity        : '1',
  });

  // Ensure the mag container is a positioning context
  const pos = getComputedStyle(magEl).position;
  if (pos === 'static') magEl.style.position = 'relative';
  magEl.appendChild(canvas);

  // Size canvas to the element's natural size
  function syncSize() {
    canvas.width  = magEl.offsetWidth  || 400;
    canvas.height = magEl.offsetHeight || 160;
  }
  syncSize();

  // Draw noise immediately so there's no blank flash
  const ctx = canvas.getContext('2d');
  drawNoise(ctx, 12, canvas.width, canvas.height);

  if (isPixelSrc) {
    // ── Pixel-placeholder path ──────────────────────────────────────────────
    // 1. Load the pixel image and sample it coarsely (makes it look intentional)
    // 2. Derive the real cover_page path
    // 3. When real image loads → run reveal from the pixel image as a base,
    //    swapping in the real image for the final steps

    loadImage(src).then(async pixelImg => {
      if (!pixelImg) return;

      syncSize();
      const w = canvas.width, h = canvas.height;
      // Show pixel image at lowest resolution first (very blocky)
      const aspect = h / w;
      drawAtResolution(ctx, pixelImg, REVEAL_STEPS[0], Math.max(1, Math.round(REVEAL_STEPS[0] * aspect)), w, h);

      // Derive real image path: strip "_pixel" from filename
      const realSrc = src
        .replace(/cover-?page_pixel(\.[^.]+)$/i, (_, ext) => `cover_page${ext === '.png' ? '.jpg' : ext}`)
        .replace(/_pixel(\.[^.]+)$/, '$1');

      // Update the <img> tag src to the real image so the browser also fetches it
      imgEl.src = realSrc;

      const realImg = await loadImage(realSrc);
      syncSize();
      await runReveal(canvas, realImg || pixelImg);
    });

  } else {
    // ── Standard image path ─────────────────────────────────────────────────
    loadImage(src).then(async img => {
      if (!img) { fadeOutCanvas(canvas); return; }
      syncSize();
      await runReveal(canvas, img);
    });
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────

function init() {
  document.querySelectorAll('.mag').forEach(setupMag);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
