// ══════════════════════auth════════════════════════════════════════
// JOSU – Beat Map Editor logic
// Requires: store.js loaded first
// URL params: ?songId=xxx&diffId=yyy
// ══════════════════════════════════════════════════════════════

(() => {
    // ── Resolve project context from URL ─────────────────────
    const params = new URLSearchParams(window.location.search);
    const songId = params.get('songId');
    const diffId = params.get('diffId');

    const _authHideStyle = document.createElement('style');
    document.head.appendChild(_authHideStyle);

    let projectSong = null;
    let projectDiff = null;

    if (songId && diffId) {
        projectSong = JosuStore.getSong(songId);
        projectDiff = projectSong ? JosuStore.getDifficulty(songId, diffId) : null;
    }

    // ── Populate breadcrumb ──────────────────────────────────
    const bcSong = document.getElementById('bcSongName');
    const bcDiff = document.getElementById('bcDiffName');
    const bcSongLink = document.getElementById('bcSongLink');
    if (projectSong && bcSong) {
        bcSong.textContent = projectSong.title;
        if (bcSongLink) bcSongLink.href = `song.html?id=${songId}`;
    }
    if (projectDiff && bcDiff) {
        bcDiff.textContent = projectDiff.name;
    }

    // ── Set background image ─────────────────────────────────
    if (projectSong && projectSong.coverImage) {
        const bgOverlay = document.createElement('div');
        bgOverlay.className = 'editor-background';
        bgOverlay.style.backgroundImage = `url(${projectSong.coverImage})`;
        document.body.insertBefore(bgOverlay, document.body.firstChild);
    }

    // ══════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ══════════════════════════════════════════════════════════════
    const state = {
        songData: [],
        selectedNotes: new Set(),
        isPlaying: false,
        isRecording: false,
        waitingForStart: false,
        currentTime: 0,
        duration: 0,
        zoom: 50,
        bpm: 120,
        snapToGrid: true,
        audioLoaded: false,
        mode: 'taiko',
        rangeStart: 0,
        rangeEnd: 90000,
        isPreviewing: false
    };

    // ══════════════════════════════════════════════════════════════
    // HISTORY SYSTEM (Undo/Redo)
    // ══════════════════════════════════════════════════════════════
    const MAX_HISTORY = 100;
    const history = {
        undoStack: [],
        redoStack: []
    };

    function pushHistory(actionName = 'edit') {
        history.undoStack.push({
            action: actionName,
            songData: JSON.parse(JSON.stringify(state.songData)),
            selectedNotes: new Set(state.selectedNotes)
        });
        if (history.undoStack.length > MAX_HISTORY) {
            history.undoStack.shift();
        }
        history.redoStack = [];
    }

    function undo() {
        if (history.undoStack.length === 0) {
            updateStatus('Nothing to undo');
            return;
        }
        const current = {
            action: 'current',
            songData: JSON.parse(JSON.stringify(state.songData)),
            selectedNotes: new Set(state.selectedNotes)
        };
        history.redoStack.push(current);
        const prev = history.undoStack.pop();
        state.songData = prev.songData;
        state.selectedNotes = prev.selectedNotes;
        renderNotes();
        updateStatus(`Undo: ${prev.action}`);
    }

    function redo() {
        if (history.redoStack.length === 0) {
            updateStatus('Nothing to redo');
            return;
        }
        const current = {
            action: 'current',
            songData: JSON.parse(JSON.stringify(state.songData)),
            selectedNotes: new Set(state.selectedNotes)
        };
        history.undoStack.push(current);
        const next = history.redoStack.pop();
        state.songData = next.songData;
        state.selectedNotes = next.selectedNotes;
        renderNotes();
        updateStatus('Redo');
    }

    // ══════════════════════════════════════════════════════════════
    // CLIPBOARD SYSTEM
    // ══════════════════════════════════════════════════════════════
    let clipboard = [];
    let clipboardBaseTime = 0;

    function copySelectedNotes() {
        if (state.selectedNotes.size === 0) {
            updateStatus('No notes selected to copy');
            return;
        }
        const selectedIndices = Array.from(state.selectedNotes).sort((a, b) => a - b);
        clipboard = selectedIndices.map(i => ({ ...state.songData[i] }));
        clipboardBaseTime = Math.min(...clipboard.map(n => n.time));
        updateStatus(`Copied ${clipboard.length} note(s)`);
    }

    function cutSelectedNotes() {
        if (state.selectedNotes.size === 0) {
            updateStatus('No notes selected to cut');
            return;
        }
        pushHistory('cut');
        copySelectedNotes();
        const indices = Array.from(state.selectedNotes).sort((a, b) => b - a);
        indices.forEach(i => state.songData.splice(i, 1));
        state.selectedNotes.clear();
        renderNotes();
        updateStatus(`Cut ${clipboard.length} note(s)`);
    }

    function pasteNotes() {
        if (clipboard.length === 0) {
            updateStatus('Clipboard is empty');
            return;
        }
        pushHistory('paste');
        const pasteTime = state.currentTime;
        const newNotes = clipboard.map(n => ({
            key: n.key,
            time: Math.round(pasteTime + (n.time - clipboardBaseTime))
        }));
        state.songData.push(...newNotes);
        state.songData.sort((a, b) => a.time - b.time);
        state.selectedNotes.clear();
        const startIdx = state.songData.findIndex(n => n.time === newNotes[0].time && n.key === newNotes[0].key);
        newNotes.forEach((_, i) => {
            const idx = state.songData.findIndex((n, j) => j >= startIdx && n.time === newNotes[i].time && n.key === newNotes[i].key);
            if (idx !== -1) state.selectedNotes.add(idx);
        });
        renderNotes();
        updateStatus(`Pasted ${newNotes.length} note(s) at ${msToTimeString(pasteTime)}`);
    }

    // ══════════════════════════════════════════════════════════════
    // BOX SELECTION STATE
    // ══════════════════════════════════════════════════════════════
    let isBoxSelecting = false;
    let boxSelectStart = { x: 0, y: 0 };
    let boxSelectElement = null;

    // ══════════════════════════════════════════════════════════════
    // DOM ELEMENTS
    // ══════════════════════════════════════════════════════════════
    const elements = {
        playBtn: document.getElementById('playBtn'),
        stopBtn: document.getElementById('stopBtn'),
        recordBtn: document.getElementById('recordBtn'),
        loadAudioBtn: document.getElementById('loadAudioBtn'),
        saveBtn: document.getElementById('saveBtn'),
        saveProjectBtn: document.getElementById('saveProjectBtn'),
        uploadLocalBtn: document.getElementById('uploadLocalBtn'),
        clearBtn: document.getElementById('clearBtn'),
        importBtn: document.getElementById('importBtn'),
        audioFileInput: document.getElementById('audioFileInput'),
        songTitle: document.getElementById('songTitle'),
        songArtist: document.getElementById('songArtist'),
        difficultyName: document.getElementById('difficultyName'),
        bpmInput: document.getElementById('bpmInput'),
        durationInput: document.getElementById('durationInput'),
        zoomSlider: document.getElementById('zoomSlider'),
        volumeSlider: document.getElementById('volumeSlider'),
        snapToggle: document.getElementById('snapToggle'),
        playIcon: document.getElementById('playIcon'),
        currentTime: document.getElementById('currentTime'),
        noteCount: document.getElementById('noteCount'),
        durationDisplay: document.getElementById('durationDisplay'),
        zoomValue: document.getElementById('zoomValue'),
        statusText: document.getElementById('statusText'),
        recordingIndicator: document.getElementById('recordingIndicator'),
        tracksArea: document.getElementById('tracksArea'),
        tracksScroll: document.getElementById('tracksScroll'),
        trackD: document.getElementById('trackD'),
        trackF: document.getElementById('trackF'),
        trackLeft: document.getElementById('trackLeft'),
        trackDown: document.getElementById('trackDown'),
        trackUp: document.getElementById('trackUp'),
        trackRight: document.getElementById('trackRight'),
        tracksPlayhead: document.getElementById('tracksPlayhead'),
        modeTaikoBtn: document.getElementById('modeTaikoBtn'),
        modeArrowBtn: document.getElementById('modeArrowBtn'),
        waveformArea: document.getElementById('waveformArea'),
        waveformCanvas: document.getElementById('waveformCanvas'),
        waveformPlayhead: document.getElementById('waveformPlayhead'),
        waveformPlaceholder: document.getElementById('waveformPlaceholder'),
        timeRulerCanvas: document.getElementById('timeRulerCanvas'),
        saveModal: document.getElementById('saveModal'),
        importModal: document.getElementById('importModal'),
        exportCode: document.getElementById('exportCode'),
        importTextarea: document.getElementById('importTextarea'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        closeImportModalBtn: document.getElementById('closeImportModalBtn'),
        copyCodeBtn: document.getElementById('copyCodeBtn'),
        doImportBtn: document.getElementById('doImportBtn'),
        startPromptBtn: document.getElementById('startPromptBtn'),
        contextMenu: document.getElementById('contextMenu'),
        contextDelete: document.getElementById('contextDelete'),
        contextDuplicate: document.getElementById('contextDuplicate'),
        contextToggleType: document.getElementById('contextToggleType'),
        rangeStartInput: document.getElementById('rangeStartInput'),
        rangeEndInput: document.getElementById('rangeEndInput'),
        rangeBarWrap: document.getElementById('rangeBarWrap'),
        rangeBarFill: document.getElementById('rangeBarFill'),
        rangeHandleStart: document.getElementById('rangeHandleStart'),
        rangeHandleEnd: document.getElementById('rangeHandleEnd'),
        rangePreviewBtn: document.getElementById('rangePreviewBtn'),
        rangePreviewIcon: document.getElementById('rangePreviewIcon')
    };

    // Audio
    let audioContext = null;
    let audioBuffer = null;
    let audioSource = null;
    let audioElement = new Audio();
    let animationFrame = null;
    let playStartTime = 0;
    let playStartOffset = 0;

    // Dragging
    let isDragging = false;
    let draggedNote = null;
    let dragStartX = 0;
    let dragStartTime = 0;
    let isDraggingMultiple = false;
    let multiDragStartTimes = new Map();

    // Context menu
    let contextNoteIndex = null;

    // Create box selection element
    function createBoxSelectElement() {
        const el = document.createElement('div');
        el.id = 'boxSelectRect';
        el.style.cssText = `
            position: absolute;
            border: 2px dashed #4ecdc4;
            background: rgba(78, 205, 196, 0.15);
            pointer-events: none;
            z-index: 100;
            display: none;
        `;
        elements.tracksScroll.appendChild(el);
        return el;
    }

    const TRACK_OFFSET = 60;

    // ══════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ══════════════════════════════════════════════════════════════
    function msToTimeString(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    function timeStringToMs(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 180000;
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;
        return (minutes * 60 + seconds) * 1000;
    }

    function timeToX(time) {
        return TRACK_OFFSET + ((time - state.rangeStart) / 1000) * state.zoom;
    }

    function xToTime(x) {
        return Math.max(state.rangeStart, ((x - TRACK_OFFSET) / state.zoom) * 1000 + state.rangeStart);
    }

    function snapTime(time) {
        if (!state.snapToGrid) return time;
        const beatInterval = (60000 / state.bpm) / 4;
        return Math.round(time / beatInterval) * beatInterval;
    }

    function updateStatus(text) {
        elements.statusText.textContent = text;
    }

    // ══════════════════════════════════════════════════════════════
    // AUDIO HANDLING
    // ══════════════════════════════════════════════════════════════
    elements.loadAudioBtn.addEventListener('click', () => {
        elements.audioFileInput.click();
    });

    elements.audioFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        updateStatus('Loading audio...');
        try {
            const url = URL.createObjectURL(file);
            audioElement.src = url;
            await new Promise((resolve, reject) => {
                audioElement.onloadedmetadata = resolve;
                audioElement.onerror = reject;
            });
            state.duration = audioElement.duration * 1000;
            state.audioLoaded = true;
            if (state.rangeEnd > state.duration || state.rangeEnd <= 0) {
                state.rangeEnd = state.duration;
            }
            if (state.rangeStart >= state.rangeEnd) {
                state.rangeStart = 0;
            }
            elements.durationInput.value = msToTimeString(state.duration);
            elements.waveformPlaceholder.style.display = 'none';
            await drawWaveform(file);
            updateTrackWidth();
            drawTimeRuler();
            updateRangeUI();
            updateStatus(`Loaded: ${file.name}`);
        } catch (err) {
            console.error('Error loading audio:', err);
            updateStatus('Error loading audio file');
        }
    });

    async function drawWaveform(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            renderWaveformRange();
        } catch (err) {
            console.error('Error drawing waveform:', err);
        }
    }

    function renderWaveformRange() {
        if (!audioBuffer) return;
        const canvas = elements.waveformCanvas;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        const data = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const startSample = Math.floor((state.rangeStart / 1000) * sampleRate);
        const endSample = Math.min(data.length, Math.floor((state.rangeEnd / 1000) * sampleRate));
        const rangeSamples = Math.max(1, endSample - startSample);
        const step = Math.max(1, Math.ceil(rangeSamples / (w * 2)));
        const amp = h / 4;
        const centerY = h / 2;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        for (let i = 0; i < w; i++) {
            let min = 1.0, max = -1.0;
            const base = startSample + Math.floor((i / w) * rangeSamples);
            for (let j = 0; j < step; j++) {
                const idx = base + j;
                if (idx >= data.length) break;
                const datum = data[idx];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.lineTo(i, centerY + min * amp);
            ctx.lineTo(i, centerY + max * amp);
        }
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // ══════════════════════════════════════════════════════════════
    // TIME RULER
    // ══════════════════════════════════════════════════════════════
    function drawTimeRuler() {
        const canvas = elements.timeRulerCanvas;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#16213e';
        ctx.fillRect(0, 0, width, height);
        const scrollLeft = elements.tracksArea.scrollLeft;
        const visibleStart = xToTime(scrollLeft);
        const visibleEnd = xToTime(scrollLeft + width);
        const secondInterval = Math.max(1, Math.floor(100 / state.zoom));
        const startSecond = Math.floor(visibleStart / 1000);
        const endSecond = Math.ceil(visibleEnd / 1000);
        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        for (let s = startSecond; s <= endSecond; s += secondInterval) {
            const x = timeToX(s * 1000) - scrollLeft;
            ctx.fillStyle = '#0f3460';
            ctx.fillRect(x, height - 15, 1, 15);
            ctx.fillStyle = '#888';
            ctx.fillText(msToTimeString(s * 1000), x, 12);
        }
        const beatInterval = 60000 / state.bpm;
        const startBeat = Math.floor(visibleStart / beatInterval);
        const endBeat = Math.ceil(visibleEnd / beatInterval);
        ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
        for (let b = startBeat; b <= endBeat; b++) {
            const x = timeToX(b * beatInterval) - scrollLeft;
            ctx.fillRect(x, height - 8, 1, 8);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // TRACK RENDERING
    // ══════════════════════════════════════════════════════════════
    function updateTrackWidth() {
        const rangeDur = state.rangeEnd - state.rangeStart;
        const width = timeToX(state.rangeStart + Math.max(rangeDur, 10000)) + 200;
        elements.tracksScroll.style.width = `${width}px`;
    }

    function renderNotes() {
        elements.trackD.innerHTML = '';
        elements.trackF.innerHTML = '';
        elements.trackLeft.innerHTML = '';
        elements.trackDown.innerHTML = '';
        elements.trackUp.innerHTML = '';
        elements.trackRight.innerHTML = '';
        drawGridLines();
        state.songData.forEach((note, index) => {
            if (note.time < state.rangeStart || note.time > state.rangeEnd) return;
            const noteEl = document.createElement('div');
            noteEl.className = `note note-${note.key}${state.selectedNotes.has(index) ? ' selected' : ''}`;
            noteEl.style.left = `${timeToX(note.time) - TRACK_OFFSET - 18}px`;
            const labelMap = {
                'd': 'D', 'f': 'F',
                'left': '←', 'down': '↓', 'up': '↑', 'right': '→'
            };
            noteEl.textContent = labelMap[note.key] || note.key.toUpperCase();
            noteEl.dataset.index = index;
            const trackMap = {
                'd': elements.trackD, 'f': elements.trackF,
                'left': elements.trackLeft, 'down': elements.trackDown,
                'up': elements.trackUp, 'right': elements.trackRight
            };
            const track = trackMap[note.key];
            if (track) track.appendChild(noteEl);
        });
        elements.noteCount.textContent = state.songData.length;
    }

    function drawGridLines() {
        const beatInterval = 60000 / state.bpm;
        const measureInterval = beatInterval * 4;
        let gridHTML = '';
        const gridStart = Math.floor(state.rangeStart / (beatInterval / 4)) * (beatInterval / 4);
        for (let t = gridStart; t <= state.rangeEnd; t += beatInterval / 4) {
            const x = ((t - state.rangeStart) / 1000) * state.zoom;
            let cls = 'grid-line';
            if (t % measureInterval < 1) cls += ' measure';
            else if (t % beatInterval < 1) cls += ' beat';
            gridHTML += `<div class="${cls}" style="left: ${x}px;"></div>`;
        }
        const allTracks = [
            elements.trackD, elements.trackF,
            elements.trackLeft, elements.trackDown, elements.trackUp, elements.trackRight
        ];
        allTracks.forEach(track => {
            if (!track.querySelector('.grid-container')) {
                const gridContainer = document.createElement('div');
                gridContainer.className = 'grid-container';
                gridContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;';
                gridContainer.innerHTML = gridHTML;
                track.appendChild(gridContainer);
            }
        });
    }

    // ══════════════════════════════════════════════════════════════
    // MODE SWITCHING
    // ══════════════════════════════════════════════════════════════
    function setMode(mode) {
        state.mode = mode;
        elements.modeTaikoBtn.classList.toggle('active', mode === 'taiko');
        elements.modeArrowBtn.classList.toggle('active', mode === 'arrow');
        elements.tracksScroll.classList.remove('mode-taiko', 'mode-arrow');
        elements.tracksScroll.classList.add(`mode-${mode}`);
        document.querySelectorAll('.taiko-hint').forEach(el => {
            el.style.display = mode === 'taiko' ? '' : 'none';
        });
        document.querySelectorAll('.arrow-hint').forEach(el => {
            el.style.display = mode === 'arrow' ? '' : 'none';
        });
        updateStatus(`Switched to ${mode === 'taiko' ? 'Taiko' : 'Arrow'} mode`);
        renderNotes();
    }

    elements.modeTaikoBtn.addEventListener('click', () => setMode('taiko'));
    elements.modeArrowBtn.addEventListener('click', () => setMode('arrow'));

    // ══════════════════════════════════════════════════════════════
    // PLAYBACK
    // ══════════════════════════════════════════════════════════════
    function play() {
        if (state.currentTime < state.rangeStart || state.currentTime >= state.rangeEnd) {
            state.currentTime = state.rangeStart;
        }
        if (!state.audioLoaded) {
            state.isPlaying = true;
            playStartTime = performance.now();
            playStartOffset = state.currentTime;
            updatePlayIcon();
            animationFrame = requestAnimationFrame(updatePlayhead);
            return;
        }
        state.isPlaying = true;
        audioElement.currentTime = state.currentTime / 1000;
        audioElement.volume = elements.volumeSlider.value / 100;
        audioElement.play();
        playStartTime = performance.now();
        playStartOffset = state.currentTime;
        updatePlayIcon();
        animationFrame = requestAnimationFrame(updatePlayhead);
    }

    function pause() {
        state.isPlaying = false;
        if (state.isPreviewing) {
            state.isPreviewing = false;
            elements.rangePreviewBtn.classList.remove('previewing');
            elements.rangePreviewIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
        }
        audioElement.pause();
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        updatePlayIcon();
    }

    function stop() {
        pause();
        state.currentTime = state.rangeStart;
        updatePlayheadPosition();
        updateTimeDisplay();
    }

    function updatePlayhead() {
        if (!state.isPlaying) return;
        if (state.audioLoaded) {
            state.currentTime = audioElement.currentTime * 1000;
        } else {
            state.currentTime = playStartOffset + (performance.now() - playStartTime);
        }
        if (state.currentTime >= state.rangeEnd) {
            if (state.isPreviewing) stopPreview();
            else stop();
            return;
        }
        updatePlayheadPosition();
        updateTimeDisplay();
        const playheadX = timeToX(state.currentTime);
        const viewLeft = elements.tracksArea.scrollLeft;
        const viewRight = viewLeft + elements.tracksArea.clientWidth;
        if (playheadX > viewRight - 100) {
            elements.tracksArea.scrollLeft = playheadX - 200;
        }
        animationFrame = requestAnimationFrame(updatePlayhead);
    }

    function updatePlayheadPosition() {
        const x = timeToX(state.currentTime);
        elements.tracksPlayhead.style.left = `${x}px`;
        const rangeDuration = state.rangeEnd - state.rangeStart;
        if (rangeDuration > 0) {
            const waveformW = elements.waveformArea.offsetWidth;
            const waveformX = ((state.currentTime - state.rangeStart) / rangeDuration) * waveformW;
            elements.waveformPlayhead.style.left = `${waveformX}px`;
        } else {
            elements.waveformPlayhead.style.left = '0px';
        }
    }

    function updateTimeDisplay() {
        elements.currentTime.textContent = msToTimeString(state.currentTime);
    }

    function updatePlayIcon() {
        if (state.isPlaying) {
            elements.playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
        } else {
            elements.playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
        }
    }

    // ══════════════════════════════════════════════════════════════
    // RANGE SELECTOR
    // ══════════════════════════════════════════════════════════════
    function updateRangeUI() {
        const dur = state.duration || 90000;
        const startPct = Math.min(state.rangeStart / dur, 1);
        const endPct = Math.min(state.rangeEnd / dur, 1);
        const barW = elements.rangeBarWrap.offsetWidth || 110;

        elements.rangeHandleStart.style.left = `${startPct * barW}px`;
        elements.rangeHandleEnd.style.left = `${endPct * barW}px`;
        elements.rangeBarFill.style.left = `${startPct * barW}px`;
        elements.rangeBarFill.style.width = `${(endPct - startPct) * barW}px`;
        elements.rangeStartInput.value = msToTimeString(state.rangeStart);
        elements.rangeEndInput.value = msToTimeString(state.rangeEnd);
    }

    function applyRange() {
        if (state.currentTime < state.rangeStart || state.currentTime > state.rangeEnd) {
            state.currentTime = state.rangeStart;
            if (state.audioLoaded) audioElement.currentTime = state.currentTime / 1000;
            updateTimeDisplay();
        }
        renderWaveformRange();
        updateTrackWidth();
        renderNotes();
        drawTimeRuler();
        updatePlayheadPosition();
    }

    // Range drag
    let rangeDragTarget = null;

    function onRangeMouseDown(e, target) {
        e.preventDefault();
        e.stopPropagation();
        rangeDragTarget = target;
        document.addEventListener('mousemove', onRangeMouseMove);
        document.addEventListener('mouseup', onRangeMouseUp);
    }

    function onRangeMouseMove(e) {
        if (!rangeDragTarget) return;
        const rect = elements.rangeBarWrap.getBoundingClientRect();
        const barW = rect.width || 110;
        let pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / barW));
        const dur = state.duration || 90000;
        const newTime = Math.round(pct * dur);

        if (rangeDragTarget === 'start') {
            state.rangeStart = Math.min(newTime, state.rangeEnd - 500);
        } else {
            state.rangeEnd = Math.max(newTime, state.rangeStart + 500);
        }
        updateRangeUI();
    }

    function onRangeMouseUp() {
        rangeDragTarget = null;
        document.removeEventListener('mousemove', onRangeMouseMove);
        document.removeEventListener('mouseup', onRangeMouseUp);
        applyRange();
    }

    elements.rangeHandleStart.addEventListener('mousedown', (e) => onRangeMouseDown(e, 'start'));
    elements.rangeHandleEnd.addEventListener('mousedown', (e) => onRangeMouseDown(e, 'end'));

    // Click on bar background to move nearest handle
    elements.rangeBarWrap.addEventListener('mousedown', (e) => {
        if (e.target === elements.rangeHandleStart || e.target === elements.rangeHandleEnd) return;
        const rect = elements.rangeBarWrap.getBoundingClientRect();
        const barW = rect.width || 110;
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / barW));
        const dur = state.duration || 90000;
        const clickTime = pct * dur;
        const distToStart = Math.abs(clickTime - state.rangeStart);
        const distToEnd = Math.abs(clickTime - state.rangeEnd);
        rangeDragTarget = distToStart < distToEnd ? 'start' : 'end';
        onRangeMouseMove(e);
        document.addEventListener('mousemove', onRangeMouseMove);
        document.addEventListener('mouseup', onRangeMouseUp);
    });

    // Time input editing
    function parseRangeInput(inputEl, which) {
        const val = inputEl.value.trim();
        const ms = timeStringToMs(val);
        if (isNaN(ms)) { updateRangeUI(); return; }
        const dur = state.duration || 90000;
        const clamped = Math.max(0, Math.min(ms, dur));
        if (which === 'start') {
            state.rangeStart = Math.min(clamped, state.rangeEnd - 500);
        } else {
            state.rangeEnd = Math.max(clamped, state.rangeStart + 500);
        }
        updateRangeUI();
        applyRange();
    }

    elements.rangeStartInput.addEventListener('blur', () => parseRangeInput(elements.rangeStartInput, 'start'));
    elements.rangeStartInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') parseRangeInput(elements.rangeStartInput, 'start'); });
    elements.rangeEndInput.addEventListener('blur', () => parseRangeInput(elements.rangeEndInput, 'end'));
    elements.rangeEndInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') parseRangeInput(elements.rangeEndInput, 'end'); });

    // Preview playback
    function stopPreview() {
        if (!state.isPreviewing) return;
        state.isPreviewing = false;
        pause();
        elements.rangePreviewBtn.classList.remove('previewing');
        elements.rangePreviewIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
        updateStatus('Preview stopped');
    }

    function startPreview() {
        if (state.isPreviewing) { stopPreview(); return; }
        state.isPreviewing = true;
        elements.rangePreviewBtn.classList.add('previewing');
        elements.rangePreviewIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
        state.currentTime = state.rangeStart;
        updatePlayheadPosition();
        updateTimeDisplay();
        play();
        updateStatus(`Previewing ${msToTimeString(state.rangeStart)} → ${msToTimeString(state.rangeEnd)}`);
    }

    elements.rangePreviewBtn.addEventListener('click', () => {
        if (state.isPreviewing) stopPreview();
        else startPreview();
    });

    // ══════════════════════════════════════════════════════════════
    // NOTE MANIPULATION
    // ══════════════════════════════════════════════════════════════
    function addNote(key, time, skipHistory = false) {
        if (!skipHistory) pushHistory('add note');
        const snappedTime = snapTime(time);
        state.songData.push({ key, time: Math.round(snappedTime) });
        state.songData.sort((a, b) => a.time - b.time);
        renderNotes();
        updateStatus(`Added ${key.toUpperCase()} note at ${msToTimeString(snappedTime)}`);
    }

    function removeNote(index, skipHistory = false) {
        if (index < 0 || index >= state.songData.length) return;
        if (!skipHistory) pushHistory('delete note');
        state.songData.splice(index, 1);
        state.selectedNotes.delete(index);
        const newSelected = new Set();
        state.selectedNotes.forEach(i => {
            if (i > index) newSelected.add(i - 1);
            else if (i < index) newSelected.add(i);
        });
        state.selectedNotes = newSelected;
        renderNotes();
        updateStatus('Note removed');
    }

    function removeSelectedNotes() {
        if (state.selectedNotes.size === 0) return;
        pushHistory('delete notes');
        const indices = Array.from(state.selectedNotes).sort((a, b) => b - a);
        indices.forEach(i => state.songData.splice(i, 1));
        state.selectedNotes.clear();
        renderNotes();
        updateStatus(`Removed ${indices.length} note(s)`);
    }

    function clearAllNotes() {
        if (state.songData.length === 0) return;
        if (!confirm('Clear all notes?')) return;
        pushHistory('clear all');
        state.songData = [];
        state.selectedNotes.clear();
        renderNotes();
        updateStatus('All notes cleared');
    }

    function duplicateNote(index, skipHistory = false) {
        if (index < 0 || index >= state.songData.length) return;
        if (!skipHistory) pushHistory('duplicate note');
        const note = state.songData[index];
        const beatInterval = 60000 / state.bpm;
        addNote(note.key, note.time + beatInterval, true);
    }

    function duplicateSelectedNotes() {
        if (state.selectedNotes.size === 0) {
            updateStatus('No notes selected to duplicate');
            return;
        }
        pushHistory('duplicate notes');
        const beatInterval = 60000 / state.bpm;
        const selectedIndices = Array.from(state.selectedNotes).sort((a, b) => a - b);
        const newNotes = selectedIndices.map(i => ({
            key: state.songData[i].key,
            time: Math.round(state.songData[i].time + beatInterval)
        }));
        state.songData.push(...newNotes);
        state.songData.sort((a, b) => a.time - b.time);
        state.selectedNotes.clear();
        newNotes.forEach(newNote => {
            const idx = state.songData.findIndex(n => n.time === newNote.time && n.key === newNote.key);
            if (idx !== -1) state.selectedNotes.add(idx);
        });
        renderNotes();
        updateStatus(`Duplicated ${newNotes.length} note(s)`);
    }

    function toggleNoteType(index, skipHistory = false) {
        if (index < 0 || index >= state.songData.length) return;
        if (!skipHistory) pushHistory('toggle type');
        const note = state.songData[index];
        const taikoKeys = ['d', 'f'];
        const arrowKeys = ['left', 'down', 'up', 'right'];
        if (taikoKeys.includes(note.key)) {
            const currentIdx = taikoKeys.indexOf(note.key);
            note.key = taikoKeys[(currentIdx + 1) % taikoKeys.length];
        } else if (arrowKeys.includes(note.key)) {
            const currentIdx = arrowKeys.indexOf(note.key);
            note.key = arrowKeys[(currentIdx + 1) % arrowKeys.length];
        }
        renderNotes();
        updateStatus('Note type toggled');
    }

    function mirrorSelectedNotes() {
        if (state.selectedNotes.size === 0) {
            updateStatus('No notes selected to mirror');
            return;
        }
        pushHistory('mirror notes');
        const taikoKeys = ['d', 'f'];
        const arrowKeys = ['left', 'down', 'up', 'right'];
        const arrowMirror = { 'left': 'right', 'right': 'left', 'down': 'up', 'up': 'down' };
        state.selectedNotes.forEach(i => {
            const note = state.songData[i];
            if (taikoKeys.includes(note.key)) {
                note.key = note.key === 'd' ? 'f' : 'd';
            } else if (arrowKeys.includes(note.key)) {
                note.key = arrowMirror[note.key];
            }
        });
        renderNotes();
        updateStatus(`Mirrored ${state.selectedNotes.size} note(s)`);
    }

    function quantizeSelectedNotes() {
        if (state.selectedNotes.size === 0) {
            updateStatus('No notes selected to quantize');
            return;
        }
        pushHistory('quantize notes');
        state.selectedNotes.forEach(i => {
            state.songData[i].time = Math.round(snapTime(state.songData[i].time));
        });
        state.songData.sort((a, b) => a.time - b.time);
        renderNotes();
        updateStatus(`Quantized ${state.selectedNotes.size} note(s) to grid`);
    }

    function nudgeSelectedNotes(deltaMs) {
        if (state.selectedNotes.size === 0) return;
        pushHistory('nudge notes');
        state.selectedNotes.forEach(i => {
            state.songData[i].time = Math.max(0, state.songData[i].time + deltaMs);
        });
        state.songData.sort((a, b) => a.time - b.time);
        renderNotes();
        const direction = deltaMs > 0 ? 'forward' : 'backward';
        updateStatus(`Nudged ${state.selectedNotes.size} note(s) ${direction}`);
    }

    function selectNotesInTimeRange(startTime, endTime) {
        state.selectedNotes.clear();
        state.songData.forEach((note, i) => {
            if (note.time >= startTime && note.time <= endTime) {
                state.selectedNotes.add(i);
            }
        });
        renderNotes();
        updateStatus(`Selected ${state.selectedNotes.size} note(s) in range`);
    }

    function selectAllNotesInVisibleRange() {
        selectNotesInTimeRange(state.rangeStart, state.rangeEnd);
    }

    function invertSelection() {
        const newSelected = new Set();
        state.songData.forEach((_, i) => {
            if (!state.selectedNotes.has(i)) {
                newSelected.add(i);
            }
        });
        state.selectedNotes = newSelected;
        renderNotes();
        updateStatus(`Inverted selection: ${state.selectedNotes.size} note(s)`);
    }

    // ══════════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ══════════════════════════════════════════════════════════════

    elements.playBtn.addEventListener('click', () => {
        if (state.isPlaying) pause(); else play();
    });

    elements.stopBtn.addEventListener('click', stop);

    elements.recordBtn.addEventListener('click', () => {
        state.isRecording = !state.isRecording;
        elements.recordBtn.classList.toggle('recording', state.isRecording);
        elements.recordingIndicator.classList.toggle('active', state.isRecording);
        if (state.isRecording && !state.isPlaying) play();
        updateStatus(state.isRecording ? 'Recording mode ON' : 'Recording mode OFF');
    });

    elements.volumeSlider.addEventListener('input', () => {
        audioElement.volume = elements.volumeSlider.value / 100;
    });

    elements.bpmInput.addEventListener('change', () => {
        state.bpm = parseInt(elements.bpmInput.value) || 120;
        renderNotes();
        drawTimeRuler();
    });

    elements.durationInput.addEventListener('change', () => {
        const newDuration = timeStringToMs(elements.durationInput.value);
        if (newDuration > 0) {
            state.duration = newDuration;
            if (state.rangeEnd > state.duration) state.rangeEnd = state.duration;
            if (state.rangeStart >= state.rangeEnd) state.rangeStart = 0;
            updateRangeUI();
            applyRange();
            updateStatus(`Duration set to ${msToTimeString(state.duration)}`);
        } else {
            elements.durationInput.value = msToTimeString(state.duration);
        }
    });

    elements.durationInput.addEventListener('focus', () => {
        elements.durationInput.style.borderColor = '#e94560';
    });
    elements.durationInput.addEventListener('blur', () => {
        elements.durationInput.style.borderColor = '#0f3460';
    });

    elements.zoomSlider.addEventListener('input', () => {
        state.zoom = parseInt(elements.zoomSlider.value);
        elements.zoomValue.textContent = `${state.zoom}%`;
        updateTrackWidth();
        renderNotes();
        drawTimeRuler();
        updatePlayheadPosition();
    });

    elements.snapToggle.addEventListener('click', () => {
        state.snapToGrid = !state.snapToGrid;
        elements.snapToggle.classList.toggle('active', state.snapToGrid);
    });

    elements.clearBtn.addEventListener('click', clearAllNotes);

    elements.startPromptBtn.addEventListener('click', () => {
        state.waitingForStart = !state.waitingForStart;
        elements.startPromptBtn.classList.toggle('waiting', state.waitingForStart);
        elements.startPromptBtn.innerHTML = state.waitingForStart
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg> Waiting... Press D or F'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Click D or F to Start';
        updateStatus(state.waitingForStart ? 'Press D or F to begin playback & recording' : 'Ready');
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const key = e.key.toLowerCase();

        // Ctrl/Cmd shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (key) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }
                    return;
                case 'y':
                    e.preventDefault();
                    redo();
                    return;
                case 'c':
                    e.preventDefault();
                    copySelectedNotes();
                    return;
                case 'x':
                    e.preventDefault();
                    cutSelectedNotes();
                    return;
                case 'v':
                    e.preventDefault();
                    pasteNotes();
                    return;
                case 'd':
                    e.preventDefault();
                    duplicateSelectedNotes();
                    return;
                case 'm':
                    e.preventDefault();
                    mirrorSelectedNotes();
                    return;
                case 'a':
                    e.preventDefault();
                    if (e.shiftKey) {
                        selectAllNotesInVisibleRange();
                    } else {
                        state.songData.forEach((_, i) => state.selectedNotes.add(i));
                        renderNotes();
                        updateStatus(`Selected all ${state.songData.length} note(s)`);
                    }
                    return;
                case 'i':
                    e.preventDefault();
                    invertSelection();
                    return;
            }
        }

        // Non-modifier shortcuts
        switch (key) {
            case ' ':
                e.preventDefault();
                if (state.isPlaying) pause(); else play();
                break;
            case 'd':
            case 'f': {
                if (state.waitingForStart) {
                    state.waitingForStart = false;
                    elements.startPromptBtn.classList.remove('waiting');
                    elements.startPromptBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Click D or F to Start';
                    state.isRecording = true;
                    elements.recordBtn.classList.add('recording');
                    elements.recordingIndicator.classList.add('active');
                    play();
                    addNote(e.key.toLowerCase(), state.currentTime);
                    updateStatus('Recording started');
                    break;
                }
                if (state.isRecording || !state.isPlaying) {
                    if (state.mode === 'taiko') {
                        addNote(key, state.currentTime);
                    } else {
                        const arrowKey = key === 'd' ? 'left' : 'down';
                        addNote(arrowKey, state.currentTime);
                    }
                }
                break;
            }
            case 'j':
            case 'k':
                if (state.mode === 'arrow' && (state.isRecording || !state.isPlaying)) {
                    const arrowKey = key === 'j' ? 'up' : 'right';
                    addNote(arrowKey, state.currentTime);
                }
                break;
            case 'r':
                elements.recordBtn.click();
                break;
            case 'q':
                quantizeSelectedNotes();
                break;
            case 'delete':
            case 'backspace':
                e.preventDefault();
                removeSelectedNotes();
                break;
            case 'home':
                stop();
                break;
            case 'escape':
                state.selectedNotes.clear();
                renderNotes();
                hideContextMenu();
                if (isBoxSelecting) {
                    isBoxSelecting = false;
                    if (boxSelectElement) boxSelectElement.style.display = 'none';
                }
                break;
            case 'arrowleft':
                if (state.selectedNotes.size > 0) {
                    e.preventDefault();
                    const nudgeAmount = e.shiftKey ? -100 : -(60000 / state.bpm / 4);
                    nudgeSelectedNotes(nudgeAmount);
                }
                break;
            case 'arrowright':
                if (state.selectedNotes.size > 0) {
                    e.preventDefault();
                    const nudgeAmount = e.shiftKey ? 100 : (60000 / state.bpm / 4);
                    nudgeSelectedNotes(nudgeAmount);
                }
                break;
            case 'arrowup':
            case 'arrowdown':
                if (state.selectedNotes.size > 0) {
                    e.preventDefault();
                    mirrorSelectedNotes();
                }
                break;
        }
    });

    // Track click
    elements.tracksArea.addEventListener('click', (e) => {
        if (isDragging || isBoxSelecting) return;
        const note = e.target.closest('.note');
        if (note) {
            const index = parseInt(note.dataset.index);
            if (e.ctrlKey || e.metaKey) {
                if (state.selectedNotes.has(index)) state.selectedNotes.delete(index);
                else state.selectedNotes.add(index);
            } else if (e.shiftKey && state.selectedNotes.size > 0) {
                const lastSelected = Math.max(...state.selectedNotes);
                const start = Math.min(lastSelected, index);
                const end = Math.max(lastSelected, index);
                for (let i = start; i <= end; i++) state.selectedNotes.add(i);
            } else {
                state.selectedNotes.clear();
                state.selectedNotes.add(index);
            }
            renderNotes();
        } else {
            const trackContent = e.target.closest('.track-content');
            if (trackContent && !e.shiftKey) {
                const rect = trackContent.getBoundingClientRect();
                const x = e.clientX - rect.left + elements.tracksArea.scrollLeft;
                state.currentTime = Math.max(0, xToTime(x + TRACK_OFFSET));
                if (state.snapToGrid) state.currentTime = snapTime(state.currentTime);
                updatePlayheadPosition();
                updateTimeDisplay();
                if (!e.ctrlKey && !e.metaKey) {
                    state.selectedNotes.clear();
                    renderNotes();
                }
            }
        }
    });

    // Double click – add note
    elements.tracksArea.addEventListener('dblclick', (e) => {
        const trackLane = e.target.closest('.track-lane');
        if (!trackLane) return;
        const key = trackLane.dataset.key;
        const trackContent = trackLane.querySelector('.track-content');
        const rect = trackContent.getBoundingClientRect();
        const x = e.clientX - rect.left + elements.tracksArea.scrollLeft;
        const time = xToTime(x + TRACK_OFFSET);
        addNote(key, time);
    });

    // Note dragging and box selection
    elements.tracksArea.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        
        const note = e.target.closest('.note');
        
        if (note) {
            // Note dragging
            e.preventDefault();
            const index = parseInt(note.dataset.index);
            
            // If clicking on an unselected note without modifier, select only this note
            if (!state.selectedNotes.has(index) && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                state.selectedNotes.clear();
                state.selectedNotes.add(index);
                renderNotes();
            }
            
            // Multi-note dragging if multiple notes are selected
            if (state.selectedNotes.size > 1 && state.selectedNotes.has(index)) {
                isDraggingMultiple = true;
                multiDragStartTimes.clear();
                state.selectedNotes.forEach(i => {
                    multiDragStartTimes.set(i, state.songData[i].time);
                });
                pushHistory('move notes');
            } else {
                isDraggingMultiple = false;
                pushHistory('move note');
            }
            
            isDragging = true;
            draggedNote = note;
            dragStartX = e.clientX;
            dragStartTime = state.songData[index].time;
            note.classList.add('dragging');
            document.body.style.cursor = 'grabbing';
        } else {
            // Box selection - start on empty track area
            const trackContent = e.target.closest('.track-content');
            if (trackContent && e.shiftKey) {
                e.preventDefault();
                isBoxSelecting = true;
                if (!boxSelectElement) {
                    boxSelectElement = createBoxSelectElement();
                }
                const scrollRect = elements.tracksScroll.getBoundingClientRect();
                boxSelectStart = {
                    x: e.clientX - scrollRect.left + elements.tracksArea.scrollLeft,
                    y: e.clientY - scrollRect.top
                };
                boxSelectElement.style.left = `${boxSelectStart.x}px`;
                boxSelectElement.style.top = `${boxSelectStart.y}px`;
                boxSelectElement.style.width = '0px';
                boxSelectElement.style.height = '0px';
                boxSelectElement.style.display = 'block';
            }
        }
    });

    document.addEventListener('mousemove', (e) => {
        // Box selection
        if (isBoxSelecting && boxSelectElement) {
            const scrollRect = elements.tracksScroll.getBoundingClientRect();
            const currentX = e.clientX - scrollRect.left + elements.tracksArea.scrollLeft;
            const currentY = e.clientY - scrollRect.top;
            
            const left = Math.min(boxSelectStart.x, currentX);
            const top = Math.min(boxSelectStart.y, currentY);
            const width = Math.abs(currentX - boxSelectStart.x);
            const height = Math.abs(currentY - boxSelectStart.y);
            
            boxSelectElement.style.left = `${left}px`;
            boxSelectElement.style.top = `${top}px`;
            boxSelectElement.style.width = `${width}px`;
            boxSelectElement.style.height = `${height}px`;
            
            // Live preview selection
            const boxLeft = left;
            const boxRight = left + width;
            const boxTop = top;
            const boxBottom = top + height;
            
            if (!e.ctrlKey && !e.metaKey) {
                state.selectedNotes.clear();
            }
            
            document.querySelectorAll('.note').forEach(noteEl => {
                const noteRect = noteEl.getBoundingClientRect();
                const noteScrollRect = elements.tracksScroll.getBoundingClientRect();
                const noteX = noteRect.left - noteScrollRect.left + elements.tracksArea.scrollLeft + noteRect.width / 2;
                const noteY = noteRect.top - noteScrollRect.top + noteRect.height / 2;
                
                if (noteX >= boxLeft && noteX <= boxRight && noteY >= boxTop && noteY <= boxBottom) {
                    state.selectedNotes.add(parseInt(noteEl.dataset.index));
                }
            });
            renderNotes();
            return;
        }
        
        // Note dragging
        if (!isDragging || !draggedNote) return;
        
        const deltaX = e.clientX - dragStartX;
        const deltaTime = (deltaX / state.zoom) * 1000;
        
        if (isDraggingMultiple) {
            // Move all selected notes
            multiDragStartTimes.forEach((startTime, index) => {
                let newTime = Math.max(0, startTime + deltaTime);
                if (state.snapToGrid) newTime = snapTime(newTime);
                state.songData[index].time = Math.round(newTime);
            });
            renderNotes();
        } else {
            // Move single note
            let newTime = Math.max(0, dragStartTime + deltaTime);
            if (state.snapToGrid) newTime = snapTime(newTime);
            const index = parseInt(draggedNote.dataset.index);
            state.songData[index].time = Math.round(newTime);
            draggedNote.style.left = `${timeToX(newTime) - TRACK_OFFSET - 18}px`;
        }
    });

    document.addEventListener('mouseup', (e) => {
        // Box selection end
        if (isBoxSelecting) {
            isBoxSelecting = false;
            if (boxSelectElement) {
                boxSelectElement.style.display = 'none';
            }
            updateStatus(`Selected ${state.selectedNotes.size} note(s)`);
            return;
        }
        
        // Note dragging end
        if (!isDragging) return;
        isDragging = false;
        isDraggingMultiple = false;
        multiDragStartTimes.clear();
        if (draggedNote) draggedNote.classList.remove('dragging');
        draggedNote = null;
        document.body.style.cursor = '';
        state.songData.sort((a, b) => a.time - b.time);
        
        // Recalculate selected indices after sort
        const selectedTimes = new Set();
        state.selectedNotes.forEach(i => {
            if (state.songData[i]) {
                selectedTimes.add(`${state.songData[i].key}_${state.songData[i].time}`);
            }
        });
        state.selectedNotes.clear();
        state.songData.forEach((note, i) => {
            if (selectedTimes.has(`${note.key}_${note.time}`)) {
                state.selectedNotes.add(i);
            }
        });
        
        renderNotes();
    });

    // Context menu
    elements.tracksArea.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const note = e.target.closest('.note');
        if (note) {
            contextNoteIndex = parseInt(note.dataset.index);
            // If right-clicking on unselected note, select it
            if (!state.selectedNotes.has(contextNoteIndex)) {
                state.selectedNotes.clear();
                state.selectedNotes.add(contextNoteIndex);
                renderNotes();
            }
            elements.contextMenu.style.left = `${e.clientX}px`;
            elements.contextMenu.style.top = `${e.clientY}px`;
            // Update context menu text based on selection
            const count = state.selectedNotes.size;
            const deleteEl = document.getElementById('contextDelete');
            const dupEl = document.getElementById('contextDuplicate');
            const mirrorEl = document.getElementById('contextMirror');
            const quantizeEl = document.getElementById('contextQuantize');
            if (deleteEl) deleteEl.textContent = count > 1 ? `Delete ${count} Notes` : 'Delete Note';
            if (dupEl) dupEl.textContent = count > 1 ? `Duplicate ${count} Notes` : 'Duplicate Note';
            if (mirrorEl) mirrorEl.textContent = count > 1 ? `Mirror ${count} Notes` : 'Mirror Note';
            if (quantizeEl) quantizeEl.textContent = count > 1 ? `Quantize ${count} Notes` : 'Quantize Note';
            elements.contextMenu.classList.add('active');
        }
    });

    function hideContextMenu() {
        elements.contextMenu.classList.remove('active');
        contextNoteIndex = null;
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu')) hideContextMenu();
    });

    elements.contextDelete.addEventListener('click', () => {
        if (state.selectedNotes.size > 0) {
            removeSelectedNotes();
        } else if (contextNoteIndex !== null) {
            removeNote(contextNoteIndex);
        }
        hideContextMenu();
    });

    elements.contextDuplicate.addEventListener('click', () => {
        if (state.selectedNotes.size > 1) {
            duplicateSelectedNotes();
        } else if (contextNoteIndex !== null) {
            duplicateNote(contextNoteIndex);
        }
        hideContextMenu();
    });

    elements.contextToggleType.addEventListener('click', () => {
        if (state.selectedNotes.size > 1) {
            mirrorSelectedNotes();
        } else if (contextNoteIndex !== null) {
            toggleNoteType(contextNoteIndex);
        }
        hideContextMenu();
    });

    // Additional context menu handlers
    const contextMirror = document.getElementById('contextMirror');
    const contextQuantize = document.getElementById('contextQuantize');
    const contextCopy = document.getElementById('contextCopy');
    const contextCut = document.getElementById('contextCut');
    const contextSelectAll = document.getElementById('contextSelectAll');

    if (contextMirror) {
        contextMirror.addEventListener('click', () => {
            mirrorSelectedNotes();
            hideContextMenu();
        });
    }

    if (contextQuantize) {
        contextQuantize.addEventListener('click', () => {
            quantizeSelectedNotes();
            hideContextMenu();
        });
    }

    if (contextCopy) {
        contextCopy.addEventListener('click', () => {
            copySelectedNotes();
            hideContextMenu();
        });
    }

    if (contextCut) {
        contextCut.addEventListener('click', () => {
            cutSelectedNotes();
            hideContextMenu();
        });
    }

    if (contextSelectAll) {
        contextSelectAll.addEventListener('click', () => {
            state.songData.forEach((_, i) => state.selectedNotes.add(i));
            renderNotes();
            hideContextMenu();
        });
    }

    // Waveform click – seek (proportional to range since waveform shows only the range)
    elements.waveformArea.addEventListener('click', (e) => {
        const rect = elements.waveformArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        const rangeDuration = state.rangeEnd - state.rangeStart;
        state.currentTime = Math.max(state.rangeStart, Math.min(state.rangeStart + pct * rangeDuration, state.rangeEnd));
        if (state.audioLoaded) audioElement.currentTime = state.currentTime / 1000;
        updatePlayheadPosition();
        updateTimeDisplay();
    });

    elements.tracksArea.addEventListener('scroll', () => {
        drawTimeRuler();
    });

    // ══════════════════════════════════════════════════════════════
    // SAVE / EXPORT
    // ══════════════════════════════════════════════════════════════
    elements.saveBtn.addEventListener('click', () => {
        const code = generateExportCode();
        elements.exportCode.textContent = code;
        elements.saveModal.classList.add('active');
    });

    elements.closeModalBtn.addEventListener('click', () => {
        elements.saveModal.classList.remove('active');
    });

    elements.copyCodeBtn.addEventListener('click', () => {
        const code = generateExportCode();
        navigator.clipboard.writeText(code).then(() => {
            elements.copyCodeBtn.textContent = 'Copied!';
            setTimeout(() => { elements.copyCodeBtn.textContent = 'Copy to Clipboard'; }, 2000);
        });
    });

    function generateExportCode() {
        const title = elements.songTitle.value || 'Untitled';
        const artist = elements.songArtist.value || 'Unknown';
        const difficulty = elements.difficultyName.value || 'Normal';
        const modeLabel = state.mode === 'taiko' ? 'Taiko' : 'Arrow (updown)';
        const notesStr = state.songData.map(n =>
            `    { key: '${n.key}', time: ${n.time} }`
        ).join(',\n');
        return `// ${title} - ${artist} [${difficulty}]\n// Mode: ${modeLabel}\n// Total notes: ${state.songData.length}\n// Duration: ${msToTimeString(state.duration)}\n\n[\n${notesStr}\n]`;
    }

    // ══════════════════════════════════════════════════════════════
    // IMPORT
    // ══════════════════════════════════════════════════════════════
    elements.importBtn.addEventListener('click', () => {
        elements.importModal.classList.add('active');
    });

    elements.closeImportModalBtn.addEventListener('click', () => {
        elements.importModal.classList.remove('active');
    });

    elements.doImportBtn.addEventListener('click', () => {
        const text = elements.importTextarea.value.trim();
        try {
            let parsed;
            if (text.startsWith('[')) {
                parsed = eval(text);
            } else if (text.includes('=')) {
                const match = text.match(/=\s*(\[[\s\S]*\])/);
                if (match) parsed = eval(match[1]);
            }
            if (Array.isArray(parsed) && parsed.length > 0) {
                state.songData = parsed.map(n => ({ key: n.key, time: n.time }));
                state.songData.sort((a, b) => a.time - b.time);
                const maxTime = Math.max(...state.songData.map(n => n.time));
                if (maxTime > state.duration) {
                    state.duration = maxTime + 5000;
                    elements.durationInput.value = msToTimeString(state.duration);
                }
                updateTrackWidth();
                renderNotes();
                drawTimeRuler();
                elements.importModal.classList.remove('active');
                updateStatus(`Imported ${state.songData.length} notes`);
            } else { throw new Error('Invalid format'); }
        } catch (err) {
            alert('Could not parse the note data. Please check the format.');
        }
    });

    // ══════════════════════════════════════════════════════════════
    // WINDOW RESIZE
    // ══════════════════════════════════════════════════════════════
    window.addEventListener('resize', () => {
        drawTimeRuler();
        if (state.audioLoaded && audioBuffer) {
            renderWaveformRange();
        }
    });

    elements.saveModal.addEventListener('click', (e) => {
        if (e.target === elements.saveModal) elements.saveModal.classList.remove('active');
    });

    elements.importModal.addEventListener('click', (e) => {
        if (e.target === elements.importModal) elements.importModal.classList.remove('active');
    });

    // ══════════════════════════════════════════════════════════════
    // PROJECT SAVE / LOAD  (uses JosuStore when songId+diffId present)
    // ══════════════════════════════════════════════════════════════
    function _requireAuth(action) {
        if (typeof JosuAuth !== 'undefined' && !JosuAuth.isSignedIn()) {
            _showSignInPrompt(action);
            return false;
        }
        return true;
    }

    function _showSignInPrompt(action) {
        // Reuse existing modal overlay if present, else build one inline
        let overlay = document.getElementById('editorAuthPrompt');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'editorAuthPrompt';
            overlay.style.cssText = `
                position:fixed;inset:0;background:rgba(0,0,0,.72);
                display:flex;align-items:center;justify-content:center;
                z-index:99999;font-family:'Segoe UI',system-ui,sans-serif;
            `;
            overlay.innerHTML = `
                <div style="background:#1a1a2e;border:1px solid #0f3460;border-radius:12px;
                            padding:32px 36px;max-width:380px;width:90%;text-align:center;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                         stroke="#e94560" stroke-width="2" style="margin-bottom:12px">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <h2 style="color:#fff;margin:0 0 8px;font-size:18px">Sign in required</h2>
                    <p id="editorAuthMsg" style="color:#aaa;font-size:14px;margin:0 0 24px"></p>
                    <div style="display:flex;gap:10px;justify-content:center">
                        <button id="editorAuthCancel"
                            style="background:#2d2d35;border:1px solid #3a3a44;color:#ccc;
                                   padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px">
                            Cancel
                        </button>
                        <button id="editorAuthSignIn"
                            style="background:#e94560;border:none;color:#fff;
                                   padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
                            Sign in with Google
                        </button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            document.getElementById('editorAuthCancel').addEventListener('click', () => {
                overlay.style.display = 'none';
            });
            overlay.addEventListener('click', e => {
                if (e.target === overlay) overlay.style.display = 'none';
            });
            document.getElementById('editorAuthSignIn').addEventListener('click', async () => {
                const btn = document.getElementById('editorAuthSignIn');
                btn.textContent = 'Signing in…';
                btn.disabled = true;
                try {
                    await JosuAuth.signInWithGoogle();
                    overlay.style.display = 'none';
                } catch (e) {
                    btn.textContent = 'Sign in with Google';
                    btn.disabled = false;
                }
            });
        }
        document.getElementById('editorAuthMsg').textContent =
            `You need to be signed in to ${action}. Sign in to save your work to the cloud.`;
        overlay.style.display = 'flex';
    }

    function saveProject() {
        if (!_requireAuth('save your project')) return;
        if (songId && diffId) {
            // Save back to the store
            JosuStore.updateDifficulty(songId, diffId, {
                songData: state.songData,
                mode: state.mode,
                bpm: state.bpm,
                duration: state.duration,
                name: elements.difficultyName.value,
                rangeStart: state.rangeStart,
                rangeEnd: state.rangeEnd
            });
            // Also update song-level meta
            JosuStore.updateSong(songId, {
                title: elements.songTitle.value,
                artist: elements.songArtist.value
            });
            updateStatus(`Saved! (${state.songData.length} notes)`);
        } else {
            // Fallback: old-style single-project save
            const projectData = {
                songData: state.songData,
                mode: state.mode,
                bpm: state.bpm,
                duration: state.duration,
                songTitle: elements.songTitle.value,
                songArtist: elements.songArtist.value,
                difficultyName: elements.difficultyName.value,
                rangeStart: state.rangeStart,
                rangeEnd: state.rangeEnd,
                savedAt: new Date().toISOString()
            };
            try {
                localStorage.setItem('josu_editor_project', JSON.stringify(projectData));
                updateStatus(`Project saved! (${state.songData.length} notes)`);
            } catch (err) {
                console.error('Error saving project:', err);
                updateStatus('Error saving project');
            }
        }
    }

    function loadFromStore() {
        if (!projectSong || !projectDiff) return false;

        // Populate fields from store data
        elements.songTitle.value = projectSong.title || 'Untitled';
        elements.songArtist.value = projectSong.artist || '';
        elements.difficultyName.value = projectDiff.name || 'Normal';

        state.songData = projectDiff.songData || projectDiff.notes || [];
        state.mode = projectDiff.mode || 'taiko';
        state.bpm = projectDiff.bpm || 120;
        state.duration = projectDiff.duration || 60000;
        state.rangeStart = projectDiff.rangeStart || 0;
        state.rangeEnd = projectDiff.rangeEnd || state.duration;

        elements.bpmInput.value = state.bpm;
        elements.durationInput.value = msToTimeString(state.duration);

        setMode(state.mode);
        updateTrackWidth();
        renderNotes();
        drawTimeRuler();
        updateRangeUI();
        updateStatus(`Editing: ${projectSong.title} – ${projectDiff.name}`);

        // Auto-load audio from IndexedDB or URL
        autoLoadAudio();

        return true;
    }

    async function autoLoadAudio() {
        if (!projectSong) return;
        const audioRef = projectSong.audio;
        if (!audioRef) return;

        try {
            let blob = null;
            let audioUrl = null;

            if (audioRef === 'indexeddb') {
                blob = await JosuAudioStore.getAudio(songId);
                if (!blob) {
                    updateStatus('Audio file not found in storage');
                    return;
                }
                audioUrl = URL.createObjectURL(blob);
            } else {
                // Treat as a URL (e.g. R2 published URL)
                audioUrl = audioRef;
            }

            updateStatus('Loading audio...');
            audioElement.src = audioUrl;
            await new Promise((resolve, reject) => {
                audioElement.onloadedmetadata = resolve;
                audioElement.onerror = reject;
            });
            state.duration = audioElement.duration * 1000;
            state.audioLoaded = true;
            if (state.rangeEnd > state.duration || state.rangeEnd <= 0) {
                state.rangeEnd = state.duration;
            }
            if (state.rangeStart >= state.rangeEnd) {
                state.rangeStart = 0;
            }
            elements.durationInput.value = msToTimeString(state.duration);
            elements.waveformPlaceholder.style.display = 'none';

            // Draw waveform from blob if available, otherwise fetch the URL
            const waveformBlob = blob || await fetch(audioUrl).then(r => r.blob());
            await drawWaveform(waveformBlob);
            updateTrackWidth();
            drawTimeRuler();
            updateRangeUI();
            updateStatus(`Editing: ${projectSong.title} – ${projectDiff.name} (audio loaded)`);
        } catch (err) {
            console.error('Error auto-loading audio:', err);
            updateStatus(`Editing: ${projectSong.title} – ${projectDiff.name} (audio failed to load)`);
        }
    }

    function loadLegacyProject() {
        try {
            const saved = localStorage.getItem('josu_editor_project');
            if (!saved) return false;
            const projectData = JSON.parse(saved);
            state.songData = projectData.songData || projectData.notes || [];
            state.mode = projectData.mode || 'taiko';
            state.bpm = projectData.bpm || 120;
            state.duration = projectData.duration || 60000;
            state.rangeStart = projectData.rangeStart || 0;
            state.rangeEnd = projectData.rangeEnd || state.duration;
            if (projectData.songTitle) elements.songTitle.value = projectData.songTitle;
            if (projectData.songArtist) elements.songArtist.value = projectData.songArtist;
            if (projectData.difficultyName) elements.difficultyName.value = projectData.difficultyName;
            elements.bpmInput.value = state.bpm;
            elements.durationInput.value = msToTimeString(state.duration);
            setMode(state.mode);
            updateTrackWidth();
            renderNotes();
            drawTimeRuler();
            updateRangeUI();
            const savedDate = projectData.savedAt ? new Date(projectData.savedAt).toLocaleString() : 'unknown';
            updateStatus(`Legacy project loaded (${state.songData.length} notes, saved ${savedDate})`);
            return true;
        } catch (err) {
            console.error('Error loading project:', err);
            return false;
        }
    }

    // Save project button
    elements.saveProjectBtn.addEventListener('click', saveProject);

    // ══════════════════════════════════════════════════════════════
    // UPLOAD TO LOCAL GAME LIBRARY
    // ══════════════════════════════════════════════════════════════
    const LOCAL_SONGS_KEY = 'josu_local_songs';

    function uploadToLocal() {
        if (!_requireAuth('upload to game')) return;
        // First save the project
        saveProject();

        // Get current song and difficulty data
        let songData, diffData;
        if (projectSong && projectDiff) {
            // Refresh from store to get latest
            songData = JosuStore.getSong(songId);
            diffData = JosuStore.getDifficulty(songId, diffId);
            console.log('Upload: Song data from store:', songData);
        } else {
            // Create from editor fields if no project context
            songData = {
                id: 'local_' + Date.now(),
                title: elements.songTitle.value || 'Untitled',
                artist: elements.songArtist.value || 'Unknown',
                coverImage: '',
                inGameGif: '',
                audio: ''
            };
            diffData = {
                name: elements.difficultyName.value || 'Normal',
                mode: state.mode,
                bpm: state.bpm,
                stars: 1.0,
                speed: 1.0,
                songData: state.songData
            };
            console.log('Upload: Using fallback song data');
        }

        // Ensure audio is always defined (for songs created before this feature)
        if (songData.audio === undefined) {
            songData.audio = '';
        }

        // Filter and offset notes to the selected range for game playback
        const rangedNotes = (diffData.songData || [])
            .filter(n => n.time >= state.rangeStart && n.time <= state.rangeEnd)
            .map(n => ({ ...n, time: n.time - state.rangeStart }));

        if (rangedNotes.length === 0) {
            alert('No notes in the selected range! Add some notes or adjust the range.');
            return;
        }

        // Load existing local songs
        let localSongs = [];
        try {
            const saved = localStorage.getItem(LOCAL_SONGS_KEY);
            if (saved) localSongs = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading local songs:', e);
        }

        // Create unique ID for local song (use existing project ID or generate)
        const localSongId = 'local_' + (songId || Date.now().toString(36));
        const localDiffId = diffId || 'diff_' + Date.now().toString(36);

        // Find if this song already exists in local songs
        let existingSong = localSongs.find(s => s.localProjectId === songId);

        const rangeDuration = state.rangeEnd - state.rangeStart;
        const audioCorr = state.rangeStart > 0 ? -state.rangeStart : 0;

        if (existingSong) {
            existingSong.title = songData.title;
            existingSong.artist = songData.artist;
            existingSong.image = songData.coverImage || '';
            existingSong.inGameGif = songData.inGameGif || '';
            existingSong.audio = songData.audio || '';
            existingSong.time = msToTimeString(rangeDuration);
            existingSong.audioCorrection = audioCorr;

            const existingDiffIdx = existingSong.difficulties.findIndex(d => d.localDiffId === diffId);
            const diffEntry = {
                localDiffId: diffId,
                name: diffData.name,
                mapper: 'You',
                stars: diffData.stars || 1.0,
                speed: diffData.speed || 1.0,
                mode: diffData.mode === 'arrow' ? 'updown' : 'taiko',
                songData: rangedNotes
            };

            if (existingDiffIdx >= 0) {
                existingSong.difficulties[existingDiffIdx] = diffEntry;
            } else {
                existingSong.difficulties.push(diffEntry);
            }
        } else {
            const newSong = {
                id: Date.now() + Math.floor(Math.random() * 10000),
                localProjectId: songId,
                title: songData.title,
                artist: songData.artist,
                time: msToTimeString(rangeDuration),
                image: songData.coverImage || '',
                audio: songData.audio || '',
                inGameGif: songData.inGameGif || '',
                audioCorrection: audioCorr,
                ranked: false,
                isLocal: true,
                difficulties: [{
                    localDiffId: diffId,
                    name: diffData.name,
                    mapper: 'You',
                    stars: diffData.stars || 1.0,
                    speed: diffData.speed || 1.0,
                    mode: diffData.mode === 'arrow' ? 'updown' : 'taiko',
                    songData: rangedNotes
                }]
            };
            localSongs.push(newSong);
        }

        // Save back to localStorage
        try {
            localStorage.setItem(LOCAL_SONGS_KEY, JSON.stringify(localSongs));
            console.log('Upload: Saved local songs with audio:', songData.audio || '(none)');
            updateStatus(`Uploaded to game library! Go to the game to test it.`);
            const audioInfo = songData.audio ? `\nAudio: ${songData.audio}` : '\n(No audio path set - edit song to add one)';
            alert(`"${songData.title} - ${diffData.name}" has been uploaded to your local game library!${audioInfo}\n\nGo to the game (index.html) to test it.`);
        } catch (e) {
            console.error('Error saving local songs:', e);
            alert('Error uploading to local library. The data might be too large.');
        }
    }

    elements.uploadLocalBtn.addEventListener('click', uploadToLocal);

    // Auto-save every 60s when inside a project
    if (songId && diffId) {
        setInterval(saveProject, 60000);
    }

    // ══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ══════════════════════════════════════════════════════════════
    function init() {
        const loaded = loadFromStore() || loadLegacyProject();
        if (!loaded) {
            state.duration = 60000;
            state.rangeStart = 0;
            state.rangeEnd = state.duration;
            elements.durationInput.value = msToTimeString(state.duration);
            updateTrackWidth();
            drawTimeRuler();
            renderNotes();
            updateStatus('Ready – Load audio or start placing notes');
        }
        if (!state.rangeEnd || state.rangeEnd <= 0) state.rangeEnd = state.duration;
        if (state.rangeStart >= state.rangeEnd) state.rangeStart = 0;
        state.currentTime = state.rangeStart;
        updateRangeUI();
        updatePlayheadPosition();
        updateTimeDisplay();
    }

    init();
})();
