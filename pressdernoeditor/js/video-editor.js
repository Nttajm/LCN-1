/* ── Press Derno · Reel Editor · video-editor.js ── */
'use strict';

// ── Canvas constants ──────────────────────────────────────────────────────────
const CANVAS_W = 1080;
const CANVAS_H = 1920;

// ── Caption animation constants ───────────────────────────────────────────────
const EXPAND_DUR    = 420;   // ms — time for one line to fully expand
const COLLAPSE_DUR  = 300;   // ms — time for one line to fully collapse
const CAPTION_PAD_X = 22;    // horizontal inner padding inside highlight box
const CAPTION_PAD_Y = 15;    // vertical inner padding inside highlight box
const CAPTION_LEFT  = 64;    // left edge of all caption boxes
const LINE_GAP      = 8;     // vertical gap between lines

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
    mode: 'photos',          // 'photos' | 'video'
    photos: [],              // [{ img: HTMLImageElement, name: string }]
    videoEl: null,           // HTMLVideoElement | null
    videoName: '',
    videoDuration: 0,
    audioEl: null,           // HTMLAudioElement | null
    audioName: '',
    audioVolume: 1,
    // captions: array of { text, title, lines, lineWidths, titleWidth, cycleDuration }
    captions: [{ text: '', title: '', lines: [], lineWidths: [], titleWidth: 0, cycleDuration: 0 }],
    totalCycleDuration: 0,   // sum of all caption cycle durations
    fontSize: 52,
    lineH: 0,                // total row height (box + gap)
    boxH: 0,                 // highlight rectangle height
    titleBoxH: 0,            // height of the title tag box
    captionPos: 45,          // top of block as % of CANVAS_H
    photoDuration: 2000,     // ms each photo is shown
    loopDuration: 15000,     // ms total reel loop (photos mode)
    stagger: 170,            // ms between lines starting their animation
    isPlaying: false,
    isRecording: false,
    playStartTime: null,     // performance.now() when preview started
    animFrameId: null,
};

// ── DOM references ────────────────────────────────────────────────────────────
const canvas      = document.getElementById('canvas');
const ctx         = canvas.getContext('2d');
const dropZone    = document.getElementById('drop-zone');
const canvasWrap  = document.getElementById('canvas-wrap');

const tabPhotos   = document.getElementById('tab-photos');
const tabVideo    = document.getElementById('tab-video');
const panelPhotos = document.getElementById('panel-photos');
const panelVideo  = document.getElementById('panel-video');

const photoUploadBtn = document.getElementById('photo-upload-btn');
const photoInput     = document.getElementById('photo-input');
const photoStrip     = document.getElementById('photo-strip');

const videoUploadBtn = document.getElementById('video-upload-btn');
const videoInput     = document.getElementById('video-input');
const videoInfo      = document.getElementById('video-info');

const audioUploadBtn  = document.getElementById('audio-upload-btn');
const audioInput      = document.getElementById('audio-input');
const audioInfo       = document.getElementById('audio-info');
const audioVolumeRow  = document.getElementById('audio-volume-row');
const audioVolumeRange= document.getElementById('audio-volume');
const audioVolumeVal  = document.getElementById('audio-volume-val');

const captionList   = document.getElementById('caption-list');
const addCaptionBtn = document.getElementById('add-caption-btn');

const fontSizeRange = document.getElementById('font-size');
const fontSizeVal   = document.getElementById('font-size-val');

const captionPosRange = document.getElementById('caption-pos');
const captionPosVal   = document.getElementById('caption-pos-val');

const staggerRange = document.getElementById('stagger-speed');
const staggerVal   = document.getElementById('stagger-val');

const photoDurRange = document.getElementById('photo-duration');
const photoDurVal   = document.getElementById('photo-dur-val');

const loopDurRange = document.getElementById('loop-duration');
const loopDurVal   = document.getElementById('loop-dur-val');

const previewBtn  = document.getElementById('preview-btn');
const previewFill = document.getElementById('preview-fill');
const previewTime = document.getElementById('preview-time');

const exportBtn      = document.getElementById('export-btn');
const exportProgress = document.getElementById('export-progress');
const exportBar      = document.getElementById('export-bar');
const exportStatus   = document.getElementById('export-status');

// ── Canvas setup ──────────────────────────────────────────────────────────────
canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;

// ── Logo ──────────────────────────────────────────────────────────────────────
let logoImg = null;
const logo = new Image();
logo.src = 'assets/logo.png';
logo.onload = () => { logoImg = logo; drawStaticFrame(); };
logo.onerror = () => drawStaticFrame();

// ── Helpers ───────────────────────────────────────────────────────────────────
function clamp01(t) { return Math.max(0, Math.min(1, t)); }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInCubic(t)  { return t * t * t; }

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function wrapText(context, text, maxWidth) {
    const paragraphs = text.split('\n');
    const lines = [];
    for (const para of paragraphs) {
        if (!para.trim()) { lines.push(''); continue; }
        const words = para.split(' ');
        let current = '';
        for (const word of words) {
            const test = current ? current + ' ' + word : word;
            if (context.measureText(test).width > maxWidth && current) {
                lines.push(current);
                current = word;
            } else {
                current = test;
            }
        }
        if (current) lines.push(current);
    }
    return lines;
}

// ── Caption processing ────────────────────────────────────────────────────────
const TITLE_FONT_SIZE = 36;
const TITLE_PAD_X     = 18;
const TITLE_PAD_Y     = 10;
const TITLE_GAP       = 6;

function makeCaption() {
    return { text: '', title: '', holdMs: 3000, lines: [], lineWidths: [], titleWidth: 0, cycleDuration: 0 };
}

function computeLineMetrics() {
    state.boxH      = state.fontSize + CAPTION_PAD_Y * 2;
    state.lineH     = state.boxH + LINE_GAP;
    state.titleBoxH = TITLE_FONT_SIZE + TITLE_PAD_Y * 2;
}

function processOneCaptionData(cap) {
    if (!cap.text.trim()) {
        cap.lines = []; cap.lineWidths = []; cap.titleWidth = 0; cap.cycleDuration = 0;
        return;
    }
    ctx.font = `700 ${state.fontSize}px 'Lato', sans-serif`;
    const maxTW = CANVAS_W - CAPTION_LEFT * 2 - CAPTION_PAD_X * 2;
    cap.lines      = wrapText(ctx, cap.text, maxTW);
    cap.lineWidths = cap.lines.map(l => ctx.measureText(l).width);

    if (cap.title.trim()) {
        ctx.font = `700 ${TITLE_FONT_SIZE}px 'Lato', sans-serif`;
        cap.titleWidth = ctx.measureText(cap.title).width;
    } else {
        cap.titleWidth = 0;
    }

    const n = cap.lines.length;
    const expandEnd   = (n - 1) * state.stagger + EXPAND_DUR;
    const collapseEnd = expandEnd + cap.holdMs + (n - 1) * state.stagger + COLLAPSE_DUR;
    cap.cycleDuration = collapseEnd + 400;
}

function processCaptions() {
    computeLineMetrics();
    state.captions.forEach(cap => processOneCaptionData(cap));
    state.totalCycleDuration = state.captions.reduce((s, c) => s + c.cycleDuration, 0);
}

function getCaptionTopY(cap) {
    const blockH  = cap.lines.length * state.lineH - LINE_GAP;
    const centerY = CANVAS_H * (state.captionPos / 100);
    return Math.max(0, Math.min(centerY - blockH / 2, CANVAS_H - blockH));
}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function drawPhotoToCanvas(img, zoom) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const canvasAR = CANVAS_W / CANVAS_H;
    const imgAR = iw / ih;
    let drawW, drawH;
    if (imgAR > canvasAR) { drawH = CANVAS_H; drawW = CANVAS_H * imgAR; }
    else                  { drawW = CANVAS_W; drawH = CANVAS_W / imgAR; }
    const scaledW = drawW * zoom;
    const scaledH = drawH * zoom;
    const dx = (CANVAS_W - scaledW) / 2;
    const dy = (CANVAS_H - scaledH) / 2;
    ctx.drawImage(img, dx, dy, scaledW, scaledH);
}

function drawVideoToCanvas() {
    if (!state.videoEl) return;
    const v = state.videoEl;
    const vw = v.videoWidth  || CANVAS_W;
    const vh = v.videoHeight || CANVAS_H;
    const canvasAR = CANVAS_W / CANVAS_H;
    const videoAR  = vw / vh;
    let sx, sy, sw, sh;
    if (videoAR > canvasAR) { sh = vh; sw = vh * canvasAR; sx = (vw - sw) / 2; sy = 0; }
    else                    { sw = vw; sh = vw / canvasAR; sx = 0; sy = (vh - sh) / 2; }
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H);
}

// Title tag: fully revealed (static)
function renderTitleStatic(cap, topY) {
    if (!cap.title.trim() || cap.titleWidth === 0) return;
    const baseY = topY + cap.lines.length * state.lineH - LINE_GAP + TITLE_GAP;
    const boxW  = cap.titleWidth + TITLE_PAD_X * 2;
    ctx.font = `700 ${TITLE_FONT_SIZE}px 'Lato', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillRect(CAPTION_LEFT, baseY, boxW, state.titleBoxH);
    ctx.fillStyle = '#fff';
    ctx.fillText(cap.title, CAPTION_LEFT + TITLE_PAD_X, baseY + state.titleBoxH / 2);
}

// Title tag: animated
function renderTitleAnimated(cap, elapsed, collapseStart, topY) {
    if (!cap.title.trim() || cap.titleWidth === 0) return;
    const baseY    = topY + cap.lines.length * state.lineH - LINE_GAP + TITLE_GAP;
    const fullBoxW = cap.titleWidth + TITLE_PAD_X * 2;
    const x        = CAPTION_LEFT;

    const titleExpandStart   = cap.lines.length * state.stagger + EXPAND_DUR * 0.5;
    const expandSc  = easeOutCubic(clamp01((elapsed - titleExpandStart) / EXPAND_DUR));
    const collapseSc = easeInCubic(clamp01((elapsed - (collapseStart - state.stagger)) / COLLAPSE_DUR));

    const currentW = fullBoxW * expandSc * (1 - collapseSc);
    if (currentW < 0.5) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, baseY, currentW, state.titleBoxH);
    ctx.clip();
    ctx.font = `700 ${TITLE_FONT_SIZE}px 'Lato', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillRect(x, baseY, fullBoxW, state.titleBoxH);
    ctx.fillStyle = '#fff';
    ctx.fillText(cap.title, x + TITLE_PAD_X, baseY + state.titleBoxH / 2);
    ctx.restore();
}

// One caption: fully revealed (static)
function renderOneCaptionStatic(cap) {
    const n = cap.lines.length;
    if (n === 0) return;
    const topY = getCaptionTopY(cap);
    ctx.font = `700 ${state.fontSize}px 'Lato', sans-serif`;
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
        const line = cap.lines[i];
        if (!line) continue;
        const boxW = cap.lineWidths[i] + CAPTION_PAD_X * 2;
        const y    = topY + i * state.lineH;
        ctx.fillStyle = '#fff';
        ctx.fillRect(CAPTION_LEFT, y, boxW, state.boxH);
        ctx.fillStyle = '#000';
        ctx.fillText(line, CAPTION_LEFT + CAPTION_PAD_X, y + state.boxH / 2);
    }
    renderTitleStatic(cap, topY);
}

// Show the first non-empty caption as a static preview
function renderCaptionStaticFirst() {
    const cap = state.captions.find(c => c.lines.length > 0);
    if (cap) renderOneCaptionStatic(cap);
}

// One caption: animated (expand → hold → collapse)
function renderOneCaptionAnimated(localElapsed, cap) {
    const n = cap.lines.length;
    if (n === 0) return;
    const topY = getCaptionTopY(cap);
    ctx.font = `700 ${state.fontSize}px 'Lato', sans-serif`;
    ctx.textBaseline = 'middle';

    const expandEnd    = (n - 1) * state.stagger + EXPAND_DUR;
    const collapseStart = expandEnd + cap.holdMs;

    for (let i = 0; i < n; i++) {
        const line = cap.lines[i];
        if (!line) continue;
        const fullBoxW = cap.lineWidths[i] + CAPTION_PAD_X * 2;
        const y        = topY + i * state.lineH;

        const expandScale  = easeOutCubic(clamp01((localElapsed - i * state.stagger) / EXPAND_DUR));
        const collapseScale = easeInCubic(clamp01((localElapsed - collapseStart - (n - 1 - i) * state.stagger) / COLLAPSE_DUR));
        const currentW = fullBoxW * expandScale * (1 - collapseScale);
        if (currentW < 0.5) continue;

        ctx.save();
        ctx.beginPath();
        ctx.rect(CAPTION_LEFT, y, currentW, state.boxH);
        ctx.clip();
        ctx.fillStyle = '#fff';
        ctx.fillRect(CAPTION_LEFT, y, fullBoxW, state.boxH);
        ctx.fillStyle = '#000';
        ctx.fillText(line, CAPTION_LEFT + CAPTION_PAD_X, y + state.boxH / 2);
        ctx.restore();
    }
    renderTitleAnimated(cap, localElapsed, collapseStart, topY);
}

// Cycle through all captions sequentially
function renderCaptionAnimated(elapsed) {
    if (state.totalCycleDuration === 0) return;
    const cycleElapsed = elapsed % state.totalCycleDuration;
    let offset = 0;
    for (const cap of state.captions) {
        if (cap.cycleDuration === 0) continue;
        if (cycleElapsed < offset + cap.cycleDuration) {
            renderOneCaptionAnimated(cycleElapsed - offset, cap);
            return;
        }
        offset += cap.cycleDuration;
    }
}

// Logo watermark
function drawLogo() {
    if (!logoImg) return;
    const lh = 52;
    const lw = (logoImg.naturalWidth / logoImg.naturalHeight) * lh;
    const margin = 48;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(logoImg, margin, margin, lw, lh);
    ctx.restore();
}

// ── Photo reel rendering ──────────────────────────────────────────────────────
function renderPhotoReel(elapsed) {
    const n = state.photos.length;
    if (n === 0) return;

    const FADE_ZONE = 0.18; // last 18% of photo duration = cross-fade
    const pd = state.photoDuration;

    const loopElapsed = elapsed % state.loopDuration;
    const photoElapsed = loopElapsed % (n * pd);
    const idx = Math.floor(photoElapsed / pd) % n;
    const progress = (photoElapsed % pd) / pd;

    // Ken Burns: slow zoom 1.0 → 1.08 over the photo's on-screen time
    const zoom = 1.0 + 0.08 * progress;
    drawPhotoToCanvas(state.photos[idx].img, zoom);

    // Cross-fade to next photo in the last FADE_ZONE of the duration
    if (progress >= 1 - FADE_ZONE) {
        const fadeT = (progress - (1 - FADE_ZONE)) / FADE_ZONE;
        const nextIdx = (idx + 1) % n;
        ctx.save();
        ctx.globalAlpha = fadeT;
        drawPhotoToCanvas(state.photos[nextIdx].img, 1.0);
        ctx.restore();
    }
}

// ── Static frame (before play) ────────────────────────────────────────────────
function drawStaticFrame() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (state.mode === 'photos' && state.photos.length > 0) {
        drawPhotoToCanvas(state.photos[0].img, 1.0);
    } else if (state.mode === 'video' && state.videoEl) {
        drawVideoToCanvas();
    }

    renderCaptionStaticFirst();
    drawLogo();
}

// ── Render loop ───────────────────────────────────────────────────────────────
function renderFrame(ts) {
    if (!state.isPlaying) return;

    const elapsed = ts - state.playStartTime;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (state.mode === 'photos') {
        renderPhotoReel(elapsed);
    } else if (state.mode === 'video' && state.videoEl) {
        drawVideoToCanvas();
    }

    // Caption cycles on its own timer (loops independently)
    if (state.totalCycleDuration > 0) {
        renderCaptionAnimated(elapsed);
    }

    drawLogo();

    // Update playback UI
    const totalDur = getPlayDuration();
    if (totalDur > 0) {
        const pct = Math.min((elapsed / totalDur) * 100, 100);
        previewFill.style.width = `${pct}%`;
        previewTime.textContent = formatTime(elapsed);
    }

    // Auto-stop when duration is reached (photos mode); video stops via 'ended'
    if (state.mode === 'photos' && elapsed >= state.loopDuration) {
        // Loop: restart
        state.playStartTime = ts;
    }

    state.animFrameId = requestAnimationFrame(renderFrame);
}

function getPlayDuration() {
    if (state.mode === 'photos') return state.loopDuration;
    if (state.mode === 'video' && state.videoEl) return state.videoDuration * 1000;
    return state.totalCycleDuration || 8000;
}

// ── Playback control ──────────────────────────────────────────────────────────
function startPlayback() {
    if (state.isPlaying) return;
    state.isPlaying = true;
    state.playStartTime = null; // set on first rAF call

    if (state.mode === 'video' && state.videoEl) {
        state.videoEl.currentTime = 0;
        state.videoEl.play().catch(() => {});
    }
    if (state.audioEl) {
        state.audioEl.currentTime = 0;
        state.audioEl.play().catch(() => {});
    }

    previewBtn.textContent = '■ Stop';
    previewBtn.classList.add('playback-bar__btn--playing');

    requestAnimationFrame(ts => {
        state.playStartTime = ts;
        state.animFrameId = requestAnimationFrame(renderFrame);
    });
}

function stopPlayback() {
    state.isPlaying = false;
    if (state.animFrameId) { cancelAnimationFrame(state.animFrameId); state.animFrameId = null; }
    if (state.mode === 'video' && state.videoEl) {
        state.videoEl.pause();
        state.videoEl.currentTime = 0;
    }
    if (state.audioEl) {
        state.audioEl.pause();
        state.audioEl.currentTime = 0;
    }
    previewBtn.textContent = '▶ Preview';
    previewBtn.classList.remove('playback-bar__btn--playing');
    previewFill.style.width = '0%';
    previewTime.textContent = '0:00';
    drawStaticFrame();
}

previewBtn.addEventListener('click', () => {
    if (state.isPlaying) stopPlayback();
    else startPlayback();
});

// ── Export / Recording ────────────────────────────────────────────────────────
let mediaRecorder   = null;
let recordedChunks  = [];
let exportTimers    = [];
let chosenMime      = '';

// Pick the best container the current browser supports.
// Priority: MP4 (plays everywhere incl. iOS) → WebM VP9 → WebM
function pickMimeType() {
    const candidates = [
        'video/mp4;codecs=avc1',   // Safari/iOS — H.264 in MP4
        'video/mp4',               // Safari generic
        'video/webm;codecs=vp9',   // Chrome / Android
        'video/webm;codecs=vp8',   // Firefox fallback
        'video/webm',              // last resort
    ];
    if (typeof MediaRecorder === 'undefined') return '';
    for (const t of candidates) {
        if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
}

function mimeToExt(mime) {
    if (mime.startsWith('video/mp4')) return 'mp4';
    return 'webm';
}

function startExport() {
    if (state.isRecording) return;

    // Guard: MediaRecorder / captureStream availability
    if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
        alert('Your browser doesn\'t support video export. Try Chrome or Safari on a desktop or Android device.');
        return;
    }

    const duration = getPlayDuration();
    if (duration <= 0 || (state.mode === 'photos' && state.photos.length === 0)) {
        alert('Add some photos or a video first.');
        return;
    }

    chosenMime = pickMimeType();
    if (!chosenMime) {
        alert('Your browser doesn\'t support any known video recording format. Please try Chrome.');
        return;
    }

    state.isRecording = true;
    recordedChunks = [];

    // Build stream: canvas video track
    const stream = canvas.captureStream(30);

    // Capture audio: video element audio + optional uploaded audio track
    try {
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        let hasAudioSource = false;

        if (state.mode === 'video' && state.videoEl) {
            const src = audioCtx.createMediaElementSource(state.videoEl);
            src.connect(dest);
            src.connect(audioCtx.destination);
            hasAudioSource = true;
        }

        if (state.audioEl) {
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = state.audioVolume;
            const src = audioCtx.createMediaElementSource(state.audioEl);
            src.connect(gainNode);
            gainNode.connect(dest);
            gainNode.connect(audioCtx.destination);
            hasAudioSource = true;
        }

        if (hasAudioSource) {
            dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
        }
    } catch (e) {
        console.warn('Audio capture skipped:', e);
    }

    try {
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: chosenMime,
            videoBitsPerSecond: 8_000_000,
        });
    } catch (e) {
        // Some browsers accept the type check but fail on construction — retry without codec hint
        const baseMime = chosenMime.split(';')[0];
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: baseMime,
            videoBitsPerSecond: 8_000_000,
        });
        chosenMime = baseMime;
    }

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = finaliseExport;
    mediaRecorder.start(100);

    // Start playback (drives the render loop the recorder captures)
    stopPlayback();
    startPlayback();

    const ext = mimeToExt(chosenMime).toUpperCase();
    exportBtn.disabled = true;
    exportBtn.textContent = `Recording…`;
    exportProgress.classList.add('visible');
    exportBar.style.width = '0%';
    exportStatus.textContent = `Recording ${ext}…`;

    const started = performance.now();
    const tick = setInterval(() => {
        const pct = Math.min((performance.now() - started) / duration, 1);
        exportBar.style.width = `${pct * 100}%`;
        exportStatus.textContent = `${Math.round(pct * 100)}% — ${ext}`;
    }, 100);

    const stopTimer = setTimeout(() => {
        clearInterval(tick);
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    }, duration + 300);

    exportTimers.push(tick, stopTimer);
}

function finaliseExport() {
    stopPlayback();
    const baseMime = chosenMime.split(';')[0];  // strip codec params for Blob
    const ext      = mimeToExt(chosenMime);
    const blob     = new Blob(recordedChunks, { type: baseMime });
    const url      = URL.createObjectURL(blob);

    // On iOS Safari, programmatic <a download> is blocked — open in new tab so
    // the user can long-press → Save to Files / Photos
    const isMobileSafari = /iP(hone|ad|od)/i.test(navigator.userAgent) &&
                           /Safari/i.test(navigator.userAgent) &&
                           !/CriOS|FxiOS/i.test(navigator.userAgent);

    if (isMobileSafari) {
        // Open the video in a new tab — iOS will let the user save it from there
        window.open(url, '_blank');
        exportStatus.textContent = 'Tap & hold the video → Save to Photos';
    } else {
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `press-derno-reel.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        exportStatus.textContent = `Done — saved as .${ext}`;
    }

    setTimeout(() => URL.revokeObjectURL(url), 30000);

    // Reset UI
    state.isRecording = false;
    exportBtn.disabled = false;
    const displayExt = mimeToExt(chosenMime).toUpperCase();
    exportBtn.textContent = `Export Reel (.${mimeToExt(chosenMime)})`;
    exportProgress.classList.remove('visible');
    exportBar.style.width = '0%';
    setTimeout(() => { exportStatus.textContent = ''; }, 6000);
}

// Update export button label on load to reflect what this browser will produce
(function updateExportLabel() {
    const mime = pickMimeType();
    const ext  = mime ? mimeToExt(mime) : 'video';
    exportBtn.textContent = `Export Reel (.${ext})`;
})();

exportBtn.addEventListener('click', startExport);

// ── Photo management ──────────────────────────────────────────────────────────
function addPhotos(files) {
    const toLoad = Array.from(files).filter(f => f.type.startsWith('image/'));
    let loaded = 0;
    if (toLoad.length === 0) return;

    toLoad.forEach(file => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            state.photos.push({ img, name: file.name, url });
            loaded++;
            if (loaded === toLoad.length) {
                renderPhotoStrip();
                hideDropZone();
                drawStaticFrame();
            }
        };
        img.src = url;
    });
}

function removePhoto(index) {
    URL.revokeObjectURL(state.photos[index].url);
    state.photos.splice(index, 1);
    renderPhotoStrip();
    if (state.photos.length === 0 && state.mode === 'photos') showDropZone();
    drawStaticFrame();
}

function renderPhotoStrip() {
    photoStrip.innerHTML = '';
    if (state.photos.length === 0) {
        photoStrip.innerHTML = '<p class="photo-strip__empty">No photos added yet</p>';
        return;
    }
    state.photos.forEach((p, i) => {
        const thumb = document.createElement('div');
        thumb.className = 'photo-thumb';
        const img = document.createElement('img');
        img.src = p.url;
        img.alt = p.name;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'photo-thumb__remove';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove';
        removeBtn.addEventListener('click', e => { e.stopPropagation(); removePhoto(i); });
        thumb.appendChild(img);
        thumb.appendChild(removeBtn);
        photoStrip.appendChild(thumb);
    });
}

// ── Video management ──────────────────────────────────────────────────────────
function loadVideo(file) {
    if (state.videoEl) {
        state.videoEl.pause();
        URL.revokeObjectURL(state.videoEl.src);
    }
    const url = URL.createObjectURL(file);
    const v   = document.createElement('video');
    v.preload  = 'auto';
    v.muted    = false;
    v.playsInline = true;
    v.src      = url;
    v.onloadeddata = () => {
        state.videoEl       = v;
        state.videoDuration = v.duration;
        state.videoName     = file.name;
        renderVideoInfo();
        hideDropZone();
        v.currentTime = 0;
        // Draw first frame after seeking
        v.onseeked = () => { drawStaticFrame(); v.onseeked = null; };
    };
    v.load();
}

function removeVideo() {
    if (!state.videoEl) return;
    state.videoEl.pause();
    URL.revokeObjectURL(state.videoEl.src);
    state.videoEl       = null;
    state.videoDuration = 0;
    state.videoName     = '';
    renderVideoInfo();
    showDropZone();
    drawStaticFrame();
}

function renderVideoInfo() {
    if (!state.videoEl) {
        videoInfo.innerHTML = '<p class="video-info__empty">No video uploaded</p>';
        return;
    }
    const dur = formatTime(state.videoDuration * 1000);
    videoInfo.innerHTML = `
        <div class="video-info__row">
            <span class="video-info__name" title="${state.videoName}">${state.videoName}</span>
            <span class="video-info__dur">${dur}</span>
            <button class="video-info__remove" id="video-remove-btn">Remove</button>
        </div>`;
    document.getElementById('video-remove-btn').addEventListener('click', removeVideo);
}

// ── Audio loading ─────────────────────────────────────────────────────────────
function loadAudio(file) {
    if (state.audioEl) {
        state.audioEl.pause();
        URL.revokeObjectURL(state.audioEl.src);
    }
    const url = URL.createObjectURL(file);
    const a   = new Audio(url);
    a.preload = 'auto';
    a.loop    = true;
    a.volume  = state.audioVolume;
    a.onloadedmetadata = () => {
        state.audioEl   = a;
        state.audioName = file.name;
        renderAudioInfo();
    };
    a.load();
}

function removeAudio() {
    if (!state.audioEl) return;
    state.audioEl.pause();
    URL.revokeObjectURL(state.audioEl.src);
    state.audioEl   = null;
    state.audioName = '';
    renderAudioInfo();
}

function renderAudioInfo() {
    if (!state.audioEl) {
        audioInfo.innerHTML = '<p class="audio-info__empty">No audio added</p>';
        audioVolumeRow.style.display = 'none';
        return;
    }
    audioInfo.innerHTML = `
        <div class="audio-info__row">
            <span class="audio-info__name" title="${state.audioName}">${state.audioName}</span>
            <button class="audio-info__remove" id="audio-remove-btn">Remove</button>
        </div>`;
    document.getElementById('audio-remove-btn').addEventListener('click', removeAudio);
    audioVolumeRow.style.display = '';
}

// ── Drop zone helpers ─────────────────────────────────────────────────────────
function showDropZone() { dropZone.classList.remove('drop-zone--hidden'); }
function hideDropZone() { dropZone.classList.add('drop-zone--hidden'); }

// ── Mode switching ────────────────────────────────────────────────────────────
function switchMode(mode) {
    state.mode = mode;
    if (mode === 'photos') {
        tabPhotos.classList.add('controls__tab--active');
        tabVideo.classList.remove('controls__tab--active');
        panelPhotos.classList.remove('mode-panel--hidden');
        panelVideo.classList.add('mode-panel--hidden');
        if (state.photos.length === 0) showDropZone(); else hideDropZone();
    } else {
        tabVideo.classList.add('controls__tab--active');
        tabPhotos.classList.remove('controls__tab--active');
        panelVideo.classList.remove('mode-panel--hidden');
        panelPhotos.classList.add('mode-panel--hidden');
        if (!state.videoEl) showDropZone(); else hideDropZone();
    }
    stopPlayback();
    drawStaticFrame();
}

tabPhotos.addEventListener('click', () => switchMode('photos'));
tabVideo.addEventListener('click',  () => switchMode('video'));

// ── File inputs ───────────────────────────────────────────────────────────────
photoUploadBtn.addEventListener('click', () => photoInput.click());
photoInput.addEventListener('change', e => { addPhotos(e.target.files); e.target.value = ''; });

videoUploadBtn.addEventListener('click', () => videoInput.click());
videoInput.addEventListener('change', e => { if (e.target.files[0]) loadVideo(e.target.files[0]); e.target.value = ''; });

audioUploadBtn.addEventListener('click', () => audioInput.click());
audioInput.addEventListener('change', e => { if (e.target.files[0]) loadAudio(e.target.files[0]); e.target.value = ''; });

audioVolumeRange.addEventListener('input', () => {
    state.audioVolume = parseFloat(audioVolumeRange.value);
    audioVolumeVal.textContent = Math.round(state.audioVolume * 100) + '%';
    if (state.audioEl) state.audioEl.volume = state.audioVolume;
});

// ── Global drag-and-drop on canvas area ──────────────────────────────────────
canvasWrap.addEventListener('click', () => {
    if (state.mode === 'photos') photoInput.click();
    else videoInput.click();
});

canvasWrap.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('active'); });
canvasWrap.addEventListener('dragleave', () => { dropZone.classList.remove('active'); });
canvasWrap.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('active');
    const files = e.dataTransfer.files;
    if (!files.length) return;
    const f = files[0];
    if (f.type.startsWith('image/')) {
        switchMode('photos');
        addPhotos(files);
    } else if (f.type.startsWith('video/')) {
        switchMode('video');
        loadVideo(f);
    }
});


// ── Caption list management ───────────────────────────────────────────────────
function renderCaptionList() {
    captionList.innerHTML = '';
    state.captions.forEach((cap, idx) => {
        const entry = document.createElement('div');
        entry.className = 'caption-entry';

        const header = document.createElement('div');
        header.className = 'caption-entry__header';

        const num = document.createElement('span');
        num.className = 'caption-entry__num';
        num.textContent = `Caption ${idx + 1}`;
        header.appendChild(num);

        if (state.captions.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'caption-entry__remove';
            removeBtn.title = 'Remove';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => removeCaptionEntry(idx));
            header.appendChild(removeBtn);
        }

        const textarea = document.createElement('textarea');
        textarea.className = 'controls__caption caption-entry__text';
        textarea.placeholder = 'Write caption…';
        textarea.rows = 3;
        textarea.value = cap.text;
        textarea.addEventListener('input', () => {
            state.captions[idx].text = textarea.value;
            processCaptions();
            if (!state.isPlaying) drawStaticFrame();
        });

        const titleInp = document.createElement('input');
        titleInp.type = 'text';
        titleInp.className = 'controls__title-input caption-entry__title';
        titleInp.placeholder = 'Title tag (location, name…)';
        titleInp.value = cap.title;
        titleInp.addEventListener('input', () => {
            state.captions[idx].title = titleInp.value;
            processCaptions();
            if (!state.isPlaying) drawStaticFrame();
        });

        // Hold duration row
        const holdRow = document.createElement('div');
        holdRow.className = 'caption-entry__hold-row';

        const holdLabel = document.createElement('label');
        holdLabel.className = 'caption-entry__hold-label';
        holdLabel.textContent = 'Hold';

        const holdRange = document.createElement('input');
        holdRange.type = 'range';
        holdRange.className = 'controls__range';
        holdRange.min = 500;
        holdRange.max = 12000;
        holdRange.step = 250;
        holdRange.value = cap.holdMs;

        const holdVal = document.createElement('span');
        holdVal.className = 'controls__range-val';
        holdVal.textContent = `${(cap.holdMs / 1000).toFixed(1)}s`;

        holdRange.addEventListener('input', () => {
            state.captions[idx].holdMs = parseInt(holdRange.value);
            holdVal.textContent = `${(state.captions[idx].holdMs / 1000).toFixed(1)}s`;
            processCaptions();
        });

        holdRow.appendChild(holdLabel);
        holdRow.appendChild(holdRange);
        holdRow.appendChild(holdVal);

        entry.appendChild(header);
        entry.appendChild(textarea);
        entry.appendChild(titleInp);
        entry.appendChild(holdRow);
        captionList.appendChild(entry);
    });
}

function addCaptionEntry() {
    state.captions.push(makeCaption());
    renderCaptionList();
    processCaptions();
    const entries = captionList.querySelectorAll('.caption-entry');
    if (entries.length) entries[entries.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function removeCaptionEntry(idx) {
    state.captions.splice(idx, 1);
    if (state.captions.length === 0) state.captions.push(makeCaption());
    renderCaptionList();
    processCaptions();
    if (!state.isPlaying) drawStaticFrame();
}

addCaptionBtn.addEventListener('click', addCaptionEntry);

fontSizeRange.addEventListener('input', () => {
    state.fontSize = parseInt(fontSizeRange.value);
    fontSizeVal.textContent = `${state.fontSize}px`;
    processCaptions();
    if (!state.isPlaying) drawStaticFrame();
});

captionPosRange.addEventListener('input', () => {
    state.captionPos = parseInt(captionPosRange.value);
    captionPosVal.textContent = `${state.captionPos}%`;
    if (!state.isPlaying) drawStaticFrame();
});

staggerRange.addEventListener('input', () => {
    state.stagger = parseInt(staggerRange.value);
    staggerVal.textContent = `${state.stagger}ms`;
    processCaptions();
});

// ── Photo timing controls ─────────────────────────────────────────────────────
photoDurRange.addEventListener('input', () => {
    state.photoDuration = parseFloat(photoDurRange.value) * 1000;
    photoDurVal.textContent = `${parseFloat(photoDurRange.value).toFixed(1)}s`;
});

loopDurRange.addEventListener('input', () => {
    state.loopDuration = parseInt(loopDurRange.value) * 1000;
    loopDurVal.textContent = `${loopDurRange.value}s`;
});

// ── Keyboard shortcut: Space to play/stop ─────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        if (state.isPlaying) stopPlayback(); else startPlayback();
    }
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.fonts.ready.then(() => {
    renderCaptionList();
    processCaptions();
    drawStaticFrame();
});
