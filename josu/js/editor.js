// ══════════════════════════════════════════════════════════════
// JOSU – Beat Map Editor logic
// Requires: store.js loaded first
// URL params: ?songId=xxx&diffId=yyy
// ══════════════════════════════════════════════════════════════

(() => {
    // ── Resolve project context from URL ─────────────────────
    const params = new URLSearchParams(window.location.search);
    const songId = params.get('songId');
    const diffId = params.get('diffId');

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
        notes: [],
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
        mode: 'taiko'
    };

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
        contextToggleType: document.getElementById('contextToggleType')
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

    // Context menu
    let contextNoteIndex = null;

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
        return TRACK_OFFSET + (time / 1000) * state.zoom;
    }

    function xToTime(x) {
        return Math.max(0, ((x - TRACK_OFFSET) / state.zoom) * 1000);
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
            elements.durationInput.value = msToTimeString(state.duration);
            elements.waveformPlaceholder.style.display = 'none';
            await drawWaveform(file);
            updateTrackWidth();
            drawTimeRuler();
            updateStatus(`Loaded: ${file.name}`);
        } catch (err) {
            console.error('Error loading audio:', err);
            updateStatus('Error loading audio file');
        }
    });

    async function drawWaveform(file) {
        const canvas = elements.waveformCanvas;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        try {
            const arrayBuffer = await file.arrayBuffer();
            audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const data = audioBuffer.getChannelData(0);
            const step = Math.ceil(data.length / (canvas.offsetWidth * 2));
            const amp = canvas.offsetHeight / 4;
            const centerY = canvas.offsetHeight / 2;
            ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            for (let i = 0; i < canvas.offsetWidth; i++) {
                let min = 1.0, max = -1.0;
                for (let j = 0; j < step; j++) {
                    const datum = data[(i * step) + j];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }
                ctx.lineTo(i, centerY + min * amp);
                ctx.lineTo(i, centerY + max * amp);
            }
            ctx.strokeStyle = '#4ecdc4';
            ctx.lineWidth = 1;
            ctx.stroke();
        } catch (err) {
            console.error('Error drawing waveform:', err);
        }
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
        const width = timeToX(Math.max(state.duration, 60000)) + 200;
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
        state.notes.forEach((note, index) => {
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
        elements.noteCount.textContent = state.notes.length;
    }

    function drawGridLines() {
        const duration = Math.max(state.duration, 60000);
        const beatInterval = 60000 / state.bpm;
        const measureInterval = beatInterval * 4;
        let gridHTML = '';
        for (let t = 0; t <= duration; t += beatInterval / 4) {
            const x = (t / 1000) * state.zoom;
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
        audioElement.pause();
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        updatePlayIcon();
    }

    function stop() {
        pause();
        state.currentTime = 0;
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
        if (state.currentTime >= state.duration) { stop(); return; }
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
        elements.waveformPlayhead.style.left = `${x}px`;
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
    // NOTE MANIPULATION
    // ══════════════════════════════════════════════════════════════
    function addNote(key, time) {
        const snappedTime = snapTime(time);
        state.notes.push({ key, time: Math.round(snappedTime) });
        state.notes.sort((a, b) => a.time - b.time);
        renderNotes();
        updateStatus(`Added ${key.toUpperCase()} note at ${msToTimeString(snappedTime)}`);
    }

    function removeNote(index) {
        if (index < 0 || index >= state.notes.length) return;
        state.notes.splice(index, 1);
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
        const indices = Array.from(state.selectedNotes).sort((a, b) => b - a);
        indices.forEach(i => state.notes.splice(i, 1));
        state.selectedNotes.clear();
        renderNotes();
        updateStatus(`Removed ${indices.length} note(s)`);
    }

    function clearAllNotes() {
        if (state.notes.length === 0) return;
        if (!confirm('Clear all notes?')) return;
        state.notes = [];
        state.selectedNotes.clear();
        renderNotes();
        updateStatus('All notes cleared');
    }

    function duplicateNote(index) {
        if (index < 0 || index >= state.notes.length) return;
        const note = state.notes[index];
        const beatInterval = 60000 / state.bpm;
        addNote(note.key, note.time + beatInterval);
    }

    function toggleNoteType(index) {
        if (index < 0 || index >= state.notes.length) return;
        const note = state.notes[index];
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
            updateTrackWidth();
            renderNotes();
            drawTimeRuler();
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
                break;
            case 'a':
                if (e.ctrlKey) {
                    e.preventDefault();
                    state.notes.forEach((_, i) => state.selectedNotes.add(i));
                    renderNotes();
                }
                break;
        }
    });

    // Track click
    elements.tracksArea.addEventListener('click', (e) => {
        if (isDragging) return;
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
            if (trackContent) {
                const rect = trackContent.getBoundingClientRect();
                const x = e.clientX - rect.left + elements.tracksArea.scrollLeft;
                state.currentTime = Math.max(0, xToTime(x + TRACK_OFFSET));
                if (state.snapToGrid) state.currentTime = snapTime(state.currentTime);
                updatePlayheadPosition();
                updateTimeDisplay();
                state.selectedNotes.clear();
                renderNotes();
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

    // Note dragging
    elements.tracksArea.addEventListener('mousedown', (e) => {
        const note = e.target.closest('.note');
        if (!note || e.button !== 0) return;
        e.preventDefault();
        isDragging = true;
        draggedNote = note;
        dragStartX = e.clientX;
        const index = parseInt(note.dataset.index);
        dragStartTime = state.notes[index].time;
        note.classList.add('dragging');
        document.body.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !draggedNote) return;
        const deltaX = e.clientX - dragStartX;
        const deltaTime = (deltaX / state.zoom) * 1000;
        let newTime = Math.max(0, dragStartTime + deltaTime);
        if (state.snapToGrid) newTime = snapTime(newTime);
        const index = parseInt(draggedNote.dataset.index);
        state.notes[index].time = Math.round(newTime);
        draggedNote.style.left = `${timeToX(newTime) - TRACK_OFFSET - 18}px`;
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        if (draggedNote) draggedNote.classList.remove('dragging');
        draggedNote = null;
        document.body.style.cursor = '';
        state.notes.sort((a, b) => a.time - b.time);
        renderNotes();
    });

    // Context menu
    elements.tracksArea.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const note = e.target.closest('.note');
        if (note) {
            contextNoteIndex = parseInt(note.dataset.index);
            elements.contextMenu.style.left = `${e.clientX}px`;
            elements.contextMenu.style.top = `${e.clientY}px`;
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
        if (contextNoteIndex !== null) removeNote(contextNoteIndex);
        hideContextMenu();
    });

    elements.contextDuplicate.addEventListener('click', () => {
        if (contextNoteIndex !== null) duplicateNote(contextNoteIndex);
        hideContextMenu();
    });

    elements.contextToggleType.addEventListener('click', () => {
        if (contextNoteIndex !== null) toggleNoteType(contextNoteIndex);
        hideContextMenu();
    });

    // Waveform click – seek
    elements.waveformArea.addEventListener('click', (e) => {
        const rect = elements.waveformArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = xToTime(x + elements.tracksArea.scrollLeft);
        state.currentTime = Math.max(0, Math.min(time, state.duration));
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
        const notesStr = state.notes.map(n =>
            `    { key: '${n.key}', time: ${n.time} }`
        ).join(',\n');
        return `// ${title} - ${artist} [${difficulty}]\n// Mode: ${modeLabel}\n// Total notes: ${state.notes.length}\n// Duration: ${msToTimeString(state.duration)}\n\n[\n${notesStr}\n]`;
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
                state.notes = parsed.map(n => ({ key: n.key, time: n.time }));
                state.notes.sort((a, b) => a.time - b.time);
                const maxTime = Math.max(...state.notes.map(n => n.time));
                if (maxTime > state.duration) {
                    state.duration = maxTime + 5000;
                    elements.durationInput.value = msToTimeString(state.duration);
                }
                updateTrackWidth();
                renderNotes();
                drawTimeRuler();
                elements.importModal.classList.remove('active');
                updateStatus(`Imported ${state.notes.length} notes`);
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
            const canvas = elements.waveformCanvas;
            canvas.width = canvas.offsetWidth * 2;
            canvas.height = canvas.offsetHeight * 2;
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
    function saveProject() {
        if (songId && diffId) {
            // Save back to the store
            JosuStore.updateDifficulty(songId, diffId, {
                notes: state.notes,
                mode: state.mode,
                bpm: state.bpm,
                duration: state.duration,
                name: elements.difficultyName.value
            });
            // Also update song-level meta
            JosuStore.updateSong(songId, {
                title: elements.songTitle.value,
                artist: elements.songArtist.value
            });
            updateStatus(`Saved! (${state.notes.length} notes)`);
        } else {
            // Fallback: old-style single-project save
            const projectData = {
                notes: state.notes,
                mode: state.mode,
                bpm: state.bpm,
                duration: state.duration,
                songTitle: elements.songTitle.value,
                songArtist: elements.songArtist.value,
                difficultyName: elements.difficultyName.value,
                savedAt: new Date().toISOString()
            };
            try {
                localStorage.setItem('josu_editor_project', JSON.stringify(projectData));
                updateStatus(`Project saved! (${state.notes.length} notes)`);
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

        state.notes = projectDiff.notes || [];
        state.mode = projectDiff.mode || 'taiko';
        state.bpm = projectDiff.bpm || 120;
        state.duration = projectDiff.duration || 60000;

        elements.bpmInput.value = state.bpm;
        elements.durationInput.value = msToTimeString(state.duration);

        setMode(state.mode);
        updateTrackWidth();
        renderNotes();
        drawTimeRuler();
        updateStatus(`Editing: ${projectSong.title} – ${projectDiff.name}`);
        return true;
    }

    function loadLegacyProject() {
        try {
            const saved = localStorage.getItem('josu_editor_project');
            if (!saved) return false;
            const projectData = JSON.parse(saved);
            state.notes = projectData.notes || [];
            state.mode = projectData.mode || 'taiko';
            state.bpm = projectData.bpm || 120;
            state.duration = projectData.duration || 60000;
            if (projectData.songTitle) elements.songTitle.value = projectData.songTitle;
            if (projectData.songArtist) elements.songArtist.value = projectData.songArtist;
            if (projectData.difficultyName) elements.difficultyName.value = projectData.difficultyName;
            elements.bpmInput.value = state.bpm;
            elements.durationInput.value = msToTimeString(state.duration);
            setMode(state.mode);
            updateTrackWidth();
            renderNotes();
            drawTimeRuler();
            const savedDate = projectData.savedAt ? new Date(projectData.savedAt).toLocaleString() : 'unknown';
            updateStatus(`Legacy project loaded (${state.notes.length} notes, saved ${savedDate})`);
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
                notes: state.notes
            };
            console.log('Upload: Using fallback song data');
        }

        // Ensure audio is always defined (for songs created before this feature)
        if (songData.audio === undefined) {
            songData.audio = '';
        }

        if (!diffData.notes || diffData.notes.length === 0) {
            alert('No notes to upload! Add some notes first.');
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

        if (existingSong) {
            // Update existing song
            existingSong.title = songData.title;
            existingSong.artist = songData.artist;
            existingSong.image = songData.coverImage || '';
            existingSong.inGameGif = songData.inGameGif || '';
            existingSong.audio = songData.audio || '';

            // Find or add difficulty
            const existingDiffIdx = existingSong.difficulties.findIndex(d => d.localDiffId === diffId);
            const diffEntry = {
                localDiffId: diffId,
                name: diffData.name,
                mapper: 'You',
                stars: diffData.stars || 1.0,
                speed: diffData.speed || 1.0,
                mode: diffData.mode === 'arrow' ? 'updown' : 'taiko',
                songData: diffData.notes
            };

            if (existingDiffIdx >= 0) {
                existingSong.difficulties[existingDiffIdx] = diffEntry;
            } else {
                existingSong.difficulties.push(diffEntry);
            }
        } else {
            // Create new local song entry
            const newSong = {
                id: Date.now() + Math.floor(Math.random() * 10000),
                localProjectId: songId,
                title: songData.title,
                artist: songData.artist,
                time: msToTimeString(state.duration),
                image: songData.coverImage || '',
                audio: songData.audio || '',
                inGameGif: songData.inGameGif || '',
                ranked: false,
                isLocal: true,
                difficulties: [{
                    localDiffId: diffId,
                    name: diffData.name,
                    mapper: 'You',
                    stars: diffData.stars || 1.0,
                    speed: diffData.speed || 1.0,
                    mode: diffData.mode === 'arrow' ? 'updown' : 'taiko',
                    songData: diffData.notes
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
        // Try store-based load first, then legacy
        const loaded = loadFromStore() || loadLegacyProject();
        if (!loaded) {
            state.duration = 60000;
            elements.durationInput.value = msToTimeString(state.duration);
            updateTrackWidth();
            drawTimeRuler();
            renderNotes();
            updateStatus('Ready – Load audio or start placing notes');
        }
    }

    init();
})();
