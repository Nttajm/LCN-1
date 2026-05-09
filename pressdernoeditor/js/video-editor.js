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
    caption: '',
    lines: [],               // wrapped lines of text
    lineWidths: [],          // canvas-measured pixel widths per line
    fontSize: 52,
    lineH: 0,                // total row height (box + gap)
    boxH: 0,                 // highlight rectangle height
    captionPos: 45,          // top of block as % of CANVAS_H
    photoDuration: 2000,     // ms each photo is shown
    loopDuration: 15000,     // ms total reel loop (photos mode)
    stagger: 170,            // ms between lines starting their animation
    isPlaying: false,
    isRecording: false,
    playStartTime: null,     // performance.now() when preview started
    captionCycleDuration: 0, // computed total ms for one caption cycle
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

const captionInput = document.getElementById('caption-input');

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
function computeLineMetrics() {
    state.boxH  = state.fontSize + CAPTION_PAD_Y * 2;
    state.lineH = state.boxH + LINE_GAP;
}

function processCaption() {
    computeLineMetrics();
    if (!state.caption.trim()) {
        state.lines = [];
        state.lineWidths = [];
        state.captionCycleDuration = 0;
        return;
    }
    ctx.font = `700 ${state.fontSize}px 'Lato', sans-serif`;
    const maxTW = CANVAS_W - CAPTION_LEFT * 2 - CAPTION_PAD_X * 2;
    state.lines = wrapText(ctx, state.caption, maxTW);
    state.lineWidths = state.lines.map(l => ctx.measureText(l).width);

    const n = state.lines.length;
    const words = state.caption.trim().split(/\s+/).length;
    // Time to read caption twice at ~200 wpm, minimum 2.5 s
    const readHold = Math.max((words / 200) * 60000 * 2, 2500);
    const expandEnd   = (n - 1) * state.stagger + EXPAND_DUR;
    // Collapse is staggered bottom-to-top, same window length
    const collapseEnd = expandEnd + readHold + (n - 1) * state.stagger + COLLAPSE_DUR;
    state.captionCycleDuration = collapseEnd + 600; // 600 ms gap before repeat
}

function getCaptionTopY() {
    const blockH  = state.lines.length * state.lineH - LINE_GAP;
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

// Caption: fully revealed (static preview)
function renderCaptionStatic() {
    const n = state.lines.length;
    if (n === 0) return;
    const topY = getCaptionTopY();
    ctx.font = `700 ${state.fontSize}px 'Lato', sans-serif`;
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
        const line = state.lines[i];
        if (!line) continue;
        const boxW = state.lineWidths[i] + CAPTION_PAD_X * 2;
        const x = CAPTION_LEFT;
        const y = topY + i * state.lineH;
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, boxW, state.boxH);
        ctx.fillStyle = '#000';
        ctx.fillText(line, x + CAPTION_PAD_X, y + state.boxH / 2);
    }
}

// Caption: animated (expand → hold → collapse per line, staggered)
function renderCaptionAnimated(elapsed) {
    const n = state.lines.length;
    if (n === 0) return;

    const topY = getCaptionTopY();
    ctx.font = `700 ${state.fontSize}px 'Lato', sans-serif`;
    ctx.textBaseline = 'middle';

    // When does collapse phase begin?
    const words = state.caption.trim().split(/\s+/).length;
    const readHold  = Math.max((words / 200) * 60000 * 2, 2500);
    const expandEnd = (n - 1) * state.stagger + EXPAND_DUR;
    const collapseStart = expandEnd + readHold;

    for (let i = 0; i < n; i++) {
        const line = state.lines[i];
        if (!line) continue;

        const fullBoxW = state.lineWidths[i] + CAPTION_PAD_X * 2;
        const x = CAPTION_LEFT;
        const y = topY + i * state.lineH;

        // Expand: top-to-bottom stagger
        const expandT = clamp01((elapsed - i * state.stagger) / EXPAND_DUR);
        const expandScale = easeOutCubic(expandT);

        // Collapse: bottom-to-top stagger (last line collapses first)
        const collapseOffset = (n - 1 - i) * state.stagger;
        const collapseT = clamp01((elapsed - collapseStart - collapseOffset) / COLLAPSE_DUR);
        const collapseScale = easeInCubic(collapseT);

        const currentW = fullBoxW * expandScale * (1 - collapseScale);
        if (currentW < 0.5) continue;

        ctx.save();
        // Clip to the growing/shrinking rectangle — box grows from left edge
        ctx.beginPath();
        ctx.rect(x, y, currentW, state.boxH);
        ctx.clip();

        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, fullBoxW, state.boxH);

        ctx.fillStyle = '#000';
        ctx.fillText(line, x + CAPTION_PAD_X, y + state.boxH / 2);

        ctx.restore();
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

    if (state.lines.length > 0) renderCaptionStatic();
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
    if (state.lines.length > 0 && state.captionCycleDuration > 0) {
        const cycleElapsed = elapsed % state.captionCycleDuration;
        renderCaptionAnimated(cycleElapsed);
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
    return state.captionCycleDuration || 8000;
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

function startExport() {
    if (state.isRecording) return;

    const duration = getPlayDuration();
    if (duration <= 0 || (state.mode === 'photos' && state.photos.length === 0)) {
        alert('Add some photos or a video first.');
        return;
    }

    state.isRecording = true;
    recordedChunks = [];

    // Build stream: canvas video track
    const stream = canvas.captureStream(30);

    // For video mode, attempt to capture audio
    if (state.mode === 'video' && state.videoEl) {
        try {
            const audioCtx = new AudioContext();
            const src  = audioCtx.createMediaElementSource(state.videoEl);
            const dest = audioCtx.createMediaStreamDestination();
            src.connect(dest);
            src.connect(audioCtx.destination); // also play through speakers
            dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
        } catch (e) {
            console.warn('Audio capture skipped:', e);
        }
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9' : 'video/webm';

    mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 10_000_000, // 10 Mbps
    });

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = finaliseExport;
    mediaRecorder.start(100);

    // Start playback (which drives the render loop that the recorder captures)
    stopPlayback();
    startPlayback();

    // UI feedback
    exportBtn.disabled = true;
    exportBtn.textContent = 'Recording…';
    exportProgress.classList.add('visible');
    exportBar.style.width = '0%';
    exportStatus.textContent = 'Recording…';

    const started = performance.now();
    const tick = setInterval(() => {
        const pct = Math.min((performance.now() - started) / duration, 1);
        exportBar.style.width = `${pct * 100}%`;
        exportStatus.textContent = `${Math.round(pct * 100)}%`;
    }, 100);

    const stopTimer = setTimeout(() => {
        clearInterval(tick);
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    }, duration + 200); // small buffer

    exportTimers.push(tick, stopTimer);
}

function finaliseExport() {
    stopPlayback();
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'press-derno-reel.webm';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    // Reset UI
    state.isRecording = false;
    exportBtn.disabled = false;
    exportBtn.textContent = 'Export Reel (.webm)';
    exportProgress.classList.remove('visible');
    exportBar.style.width = '0%';
    exportStatus.textContent = 'Done — check your downloads!';
    setTimeout(() => { exportStatus.textContent = ''; }, 4000);
}

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

// ── Caption controls ──────────────────────────────────────────────────────────
captionInput.addEventListener('input', () => {
    state.caption = captionInput.value;
    processCaption();
    if (!state.isPlaying) drawStaticFrame();
});

fontSizeRange.addEventListener('input', () => {
    state.fontSize = parseInt(fontSizeRange.value);
    fontSizeVal.textContent = `${state.fontSize}px`;
    processCaption();
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
    processCaption();
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
    processCaption();
    drawStaticFrame();
});
