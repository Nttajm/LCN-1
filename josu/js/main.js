    import { getAllPlayableSongs } from '../data/songs.js';

    // Get all songs the user can play (built-in + local library + their published songs)
    const songs = await getAllPlayableSongs();

    // Resolve 'indexeddb' audio references to blob URLs
    // Cache resolved URLs so we don't re-create them
    const resolvedAudioCache = {};

    async function resolveAudioPath(song) {
        const raw = song.audio || song.audioUrl || null;
        if (!raw || raw !== 'indexeddb') return raw;
        const projectId = song._storeId || song.localProjectId;
        if (!projectId) return null;
        if (resolvedAudioCache[projectId]) return resolvedAudioCache[projectId];
        try {
            const url = await JosuAudioStore.getAudioURL(projectId);
            if (url) resolvedAudioCache[projectId] = url;
            return url;
        } catch (e) {
            console.error('Failed to resolve audio from IndexedDB:', e);
            return null;
        }
    }

    // Developer mode - skip all menus and go straight to game
    const isdevForGame = false;

    // Store currently selected song info
    let currentSelectedSong = {
        bgImage: 'songs/ttto/main.png',
        title: '',
        artist: '',
        songId: null
    };

    // Keyboard navigation state
    let kbFocusIndex = 0;

    // Helper function to get difficulty level (1-6) from star rating
    function getDiffLevel(stars) {
        if (stars < 1) return 1;      // Beginner
        if (stars < 2) return 2;      // Easy
        if (stars < 3) return 3;      // Normal
        if (stars < 4) return 4;      // Hard
        if (stars < 5) return 5;      // Expert
        return 6;                      // Expert+
    }

    // Generate star dots HTML based on star rating
    function generateStarDots(stars) {
        const fullStars = Math.floor(stars);
        const hasHalf = stars % 1 >= 0.5;
        let html = '';
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                html += '<span class="star-dot filled"></span>';
            } else if (i === fullStars && hasHalf) {
                html += '<span class="star-dot half"></span>';
            } else {
                html += '<span class="star-dot"></span>';
            }
        }
        return html;
    }

    // Generate mode dots HTML showing unique difficulty levels + mode icons
    function generateModeDots(difficulties) {
        const levels = [...new Set(difficulties.map(d => getDiffLevel(d.stars)))].sort((a, b) => a - b);
        const hasArrow = difficulties.some(d => d.mode === 'updown');
        const hasTaiko = difficulties.some(d => !d.mode || d.mode === 'taiko');
        let icons = '';
        if (hasTaiko) {
            icons += `<span class="mode-icon" title="Taiko"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="white"/></svg></span>`;
        }
        if (hasArrow) {
            icons += `<span class="mode-icon" title="Arrow"><svg viewBox="0 0 24 24" fill="white"><polygon points="12,4 4,14 9,14 9,20 15,20 15,14 20,14"/></svg></span>`;
        }
        return icons + levels.map(level => `<span class="mode-dot active diff-${level}"></span>`).join('');
    }

    // Generate song HTML
    function getDifficultyNoteData(diff) {
        if (!diff) return [];
        if (Array.isArray(diff.songData)) return diff.songData;
        if (Array.isArray(diff.notes)) return diff.notes;
        return [];
    }

    function getDefaultDifficultyIndex(song) {
        const playableIdx = song.difficulties.findIndex(diff => getDifficultyNoteData(diff).length > 0);
        return playableIdx >= 0 ? playableIdx : 0;
    }

    function getSongById(songId) {
        if (songId == null) return null;
        return songs.find(song => String(song.id || song.storeId) === String(songId)) || null;
    }

    function getSelectedSongItem() {
        return document.querySelector('.song-item.selected');
    }

    function generateSongHTML(song, isSelected = false) {
        const defaultDiffIdx = getDefaultDifficultyIndex(song);
        const difficultiesHTML = song.difficulties.map((diff, idx) => {
            const mode = diff.mode || 'taiko';
            const noteData = getDifficultyNoteData(diff);
            const hasData = noteData.length > 0;
            const noDataClass = hasData ? '' : ' no-data';
            const modeIcon = mode === 'updown'
                ? `<span class="pill-mode-icon arrow-mode-icon" title="Arrow"><svg viewBox="0 0 24 24" fill="white"><polygon points="12,2 18,10 14,10 14,14 18,14 12,22 6,14 10,14 10,10 6,10"/></svg></span>`
                : `<span class="pill-mode-icon taiko-mode-icon" title="Taiko"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5" fill="white"/></svg></span>`;
            const noDataBadge = hasData ? '' : '<span class="no-data-badge">NO DATA</span>';
            return `
            <div class="song-difficulty-pill diff-${getDiffLevel(diff.stars)}${idx === defaultDiffIdx ? ' selected' : ''}${noDataClass}" data-diff-index="${idx}" data-mode="${mode}" data-has-data="${hasData}">
                ${modeIcon}
                <div class="diff-header">
                    <span class="difficulty-name">${diff.name}</span>
                    <span class="difficulty-mapper">mapped by ${diff.mapper}</span>
                    ${noDataBadge}
                </div>
                <div class="diff-stars">
                    <span class="difficulty-star">★ ${diff.stars.toFixed(2)}</span>
                    <div class="star-dots">
                        ${generateStarDots(diff.stars)}
                    </div>
                </div>
            </div>`;
        }).join('');

        return `
            <div class="song-item${isSelected ? ' selected' : ''}" data-song-id="${song.id || song.storeId}">
                <div class="song-pill" style="background-image: url(${song.image || song.coverImage});">
                    <div class="selected-item">
                        <span class="selected-icon">›</span>
                    </div>
                    <div class="song-i-info">
                        <h2 class="song-title">${song.title}</h2>
                        <p class="song-artist">${song.artist}</p>
                        <div class="song-meta">
                            <span class="song-ranked-badge${song.isLocal ? ' local-badge' : ''}">${song.isLocal ? 'LOCAL' : (song.ranked ? 'RANKED' : 'UNRANKED')}</span>
                            <div class="mode-dots">
                                ${generateModeDots(song.difficulties)}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="song-difficulties">
                    ${difficultiesHTML}
                </div>
            </div>
        `;
    }

    function getLastPlayed(songId) {
        return parseInt(localStorage.getItem(`josu_last_played_${songId}`) || '0', 10);
    }

    function recordLastPlayed(songId) {
        if (songId == null) return;
        localStorage.setItem(`josu_last_played_${songId}`, Date.now().toString());
    }

    function getSortedSongs() {
        return [...songs].sort((a, b) => {
            const tA = getLastPlayed(a.id ?? a.storeId);
            const tB = getLastPlayed(b.id ?? b.storeId);
            return tB - tA;
        });
    }

    // Render all songs
    function renderSongs() {
        const container = document.getElementById('songsContainer');
        const sorted = getSortedSongs();
        container.innerHTML = sorted.map((song, idx) => generateSongHTML(song, idx === 0)).join('');
    }

    // Initialize songs
    renderSongs();

    const playBtn = document.querySelectorAll('.js-play');
    const startScreen = document.querySelector('.screen.start');
    const startWrapper = document.getElementById('startWrapper');
    const gameScreenWrapper = document.getElementById('gameScreenWrapper');
    const startBg = document.getElementById('startBg');
    const middlebarWrap = document.getElementById('middlebarWrap');

    const START_WALLPAPERS = [
        'assets/wallpapers/asap.jpg',
        'assets/wallpapers/nirvana.jpg',
        'assets/wallpapers/spiderman.webp',
        'assets/wallpapers/The Neighbourhood.webp',
        'assets/wallpapers/drake.jpg',
        'assets/wallpapers/drake2.jpg',
        'assets/wallpapers/drake_3.jpg',
        'assets/wallpapers/0x1900-000000-80-0-0.jpg',
        'assets/wallpapers/oil_1.jpg',
        'assets/wallpapers/frank_1.jpg',
        'assets/wallpapers/tame_1.jpeg',
        'assets/wallpapers/La-La-Land.jpg',
        'assets/wallpapers/micheal.jpg',
        'assets/wallpapers/death_note.jpg',
        'assets/wallpapers/Your-Name-Review.jpg',
        'assets/wallpapers/kanye_1.png',
        'assets/wallpapers/kanye_2.jpg',
        'assets/wallpapers/playboi_2.png',
        'assets/wallpapers/playboi_3.webp',
        'assets/wallpapers/kendrick_1.webp',
    ];

    function setRandomStartWallpaper() {
        if (!startBg) return;
        const wallpaper = START_WALLPAPERS[Math.floor(Math.random() * START_WALLPAPERS.length)];
        startBg.style.backgroundImage = `url("${wallpaper}")`;
    }

    setRandomStartWallpaper();

    playBtn.forEach(btn => {
        btn.addEventListener('click', () => {
            previewAudioUnlocked = true;
            // Add fade-out class to all menu bar items (staggered via CSS)
            const mbarItems = document.querySelectorAll('.mbar-item');
            mbarItems.forEach(item => item.classList.add('fade-out'));
            
            // Add exiting class to start screen (scale + fade + translate)
            startScreen.classList.add('exiting');
            
            // Get game screen elements (already have fade classes from HTML)
            const songsEl = document.querySelector('.songs');
            const filterEl = document.querySelector('.filter-panel');
            const explainerEl = document.querySelector('.explainer');
            const recordsEl = document.querySelector('.records-panel');
            
            // Set background entrance offset (will slide from right)
            entranceOffsetX = 150;
            
            // After animation completes, hide the start screen and show game screen
            setTimeout(() => {
                startWrapper.classList.add('dn');
                gameScreenWrapper.classList.remove('dn');
                // Reset classes for potential return
                startScreen.classList.remove('exiting');
                mbarItems.forEach(item => item.classList.remove('fade-out'));
                
                // Animate game screen elements in (remove fade classes after a brief moment)
                setTimeout(() => {
                    songsEl.classList.remove('fade-right');
                    filterEl.classList.remove('fade-right');
                    explainerEl.classList.remove('fade-left');
                    if (recordsEl) recordsEl.classList.remove('fade-left');
                    // Animate back button in from left
                    const backBtn = document.getElementById('songSelectBackBtn');
                    if (backBtn) backBtn.classList.remove('fade-left');
                    syncSongPreview();
                }, 50);
            }, 550);
        });
    });

    // Edit button - navigate to editor
    const editBtn = document.querySelector('.mbar-item.edit');
    editBtn.addEventListener('click', () => {
        window.location.href = 'editor.html';
    });

    // Edit button → go to dashboard page
    document.querySelector('.mbar-item.edit').addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });

    // Browse button → go to browse page
    document.querySelector('.mbar-item.browse').addEventListener('click', () => {
        window.location.href = 'browse.html';
    });

    // Exit button → navigate back (or close if opened directly)
    document.querySelector('.mbar-item.exit').addEventListener('click', () => {
        stopSongPreview();
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    });

    // Background image handling
    const img1 = document.getElementById('img1');
    const img2 = document.getElementById('img2');
    const songPreviewLauncher = document.getElementById('songPreviewLauncher');
    let currentActiveImg = 'img1'; // Track which image is currently visible

    // Song-select preview audio
    let previewAudio = null;
    let previewAudioContext = null;
    let previewAnalyser = null;
    let previewSource = null;
    let previewDataArray = null;
    let previewAnimationId = null;
    let previewCurrentSongId = null;
    let previewScale = 1;
    let previewAudioUnlocked = false;

    // Spectral-flux beat detection state
    let prevFluxData = null;
    let fluxHistory = [];
    let beatPulse = 0;
    let lastBeatTime = 0;
    const FLUX_HISTORY_SIZE = 30; // ~0.5 s rolling window at 60 fps

    function isSongSelectVisible() {
        return startWrapper.classList.contains('dn') && !document.getElementById('gameWrapper').classList.contains('in-game');
    }

    function cleanupPreviewAudioGraph() {
        if (previewSource) {
            try {
                previewSource.disconnect();
            } catch (e) {}
            previewSource = null;
        }
        previewAnalyser = null;
        previewDataArray = null;
    }

    function updatePreviewLauncherScale() {
        let targetScale;

        if (previewAnalyser && previewDataArray && previewAudio && !previewAudio.paused) {
            previewAnalyser.getByteFrequencyData(previewDataArray);

            // Spectral flux onset detection:
            // Compare current frame to previous frame – a sudden energy increase
            // in the bass/kick range (lower 30 % of bins) signals a beat onset.
            const beatBins = Math.max(1, Math.floor(previewDataArray.length * 0.3));
            let flux = 0;
            if (prevFluxData && prevFluxData.length === previewDataArray.length) {
                for (let i = 0; i < beatBins; i++) {
                    const diff = previewDataArray[i] - prevFluxData[i];
                    if (diff > 0) flux += diff; // only count rises, not falls
                }
            }
            flux /= (beatBins * 255); // normalise 0–1

            // Snapshot this frame for the next comparison
            if (!prevFluxData || prevFluxData.length !== previewDataArray.length) {
                prevFluxData = new Uint8Array(previewDataArray.length);
            }
            prevFluxData.set(previewDataArray);

            // Rolling history for an adaptive threshold (mean + σ-based)
            fluxHistory.push(flux);
            if (fluxHistory.length > FLUX_HISTORY_SIZE) fluxHistory.shift();
            const mean = fluxHistory.reduce((s, v) => s + v, 0) / fluxHistory.length;
            const variance = fluxHistory.reduce((s, v) => s + (v - mean) ** 2, 0) / fluxHistory.length;
            const threshold = mean + 1.3 * Math.sqrt(variance);

            // Fire a beat pulse when flux crosses the adaptive threshold
            // (minimum 170 ms between pulses to avoid double-triggers)
            const now = performance.now();
            if (flux > threshold && flux > 0.015 && now - lastBeatTime > 170) {
                beatPulse = 1.0;
                lastBeatTime = now;
            }

            // Smooth exponential decay – snappy attack, clean release
            beatPulse *= 0.82;

            targetScale = 0.92 + beatPulse * 0.38;
        } else {
            // Idle: gentle sine-wave breathe while paused / no audio
            prevFluxData = null;
            fluxHistory = [];
            beatPulse = 0;
            targetScale = 0.985 + Math.sin(performance.now() / 380) * 0.018;
        }

        targetScale = Math.max(0.5, Math.min(1.7, targetScale));
        previewScale += (targetScale - previewScale) * 0.8;
        songPreviewLauncher.style.setProperty('--preview-scale', previewScale.toFixed(4));
        previewAnimationId = requestAnimationFrame(updatePreviewLauncherScale);
    }

    function ensurePreviewAnimation() {
        if (previewAnimationId) return;
        previewAnimationId = requestAnimationFrame(updatePreviewLauncherScale);
    }

    function stopSongPreview(resetScale = true) {
        if (previewAnimationId) {
            cancelAnimationFrame(previewAnimationId);
            previewAnimationId = null;
        }
        if (previewAudio) {
            previewAudio.pause();
            previewAudio.currentTime = 0;
            previewAudio.src = '';
            previewAudio.load();
            previewAudio = null;
        }
        cleanupPreviewAudioGraph();
        previewCurrentSongId = null;
        // Reset beat detection state
        prevFluxData = null;
        fluxHistory = [];
        beatPulse = 0;
        if (resetScale) {
            previewScale = 1;
            songPreviewLauncher.style.setProperty('--preview-scale', '1');
        }
    }

    async function startSongPreview(songId) {
        if (!previewAudioUnlocked || !isSongSelectVisible()) return;

        const song = getSongById(songId);
        if (!song) {
            stopSongPreview(false);
            ensurePreviewAnimation();
            return;
        }

        const audioPath = await resolveAudioPath(song);

        if (!audioPath) {
            stopSongPreview(false);
            ensurePreviewAnimation();
            return;
        }

        if (previewCurrentSongId === songId && previewAudio && !previewAudio.paused) {
            ensurePreviewAnimation();
            return;
        }

        stopSongPreview(false);
        previewCurrentSongId = songId;

        previewAudio = new Audio();
        previewAudio.crossOrigin = 'anonymous';
        previewAudio.preload = 'auto';
        previewAudio.loop = true;
        previewAudio.volume = 0.32;
        previewAudio.src = audioPath;

        try {
            if (!previewAudioContext) {
                previewAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (previewAudioContext.state === 'suspended') {
                await previewAudioContext.resume();
            }

            previewAnalyser = previewAudioContext.createAnalyser();
            previewAnalyser.fftSize = 256; // more bins → better frequency resolution for flux
            previewAnalyser.smoothingTimeConstant = 0.4; // lower smoothing → transients survive
            previewDataArray = new Uint8Array(previewAnalyser.frequencyBinCount);
            previewSource = previewAudioContext.createMediaElementSource(previewAudio);
            previewSource.connect(previewAnalyser);
            previewAnalyser.connect(previewAudioContext.destination);
        } catch (e) {
            cleanupPreviewAudioGraph();
        }

        try {
            await previewAudio.play();
        } catch (e) {
            stopSongPreview(false);
        }

        ensurePreviewAnimation();
    }

    function syncSongPreview() {
        if (!isSongSelectVisible()) {
            stopSongPreview();
            return;
        }

        if (!previewAudioUnlocked) {
            ensurePreviewAnimation();
            return;
        }

        if (currentSelectedSong.songId) {
            startSongPreview(currentSelectedSong.songId);
        } else {
            stopSongPreview(false);
            ensurePreviewAnimation();
        }
    }

    function flashPreviewLauncherAndStart() {
        const songItem = getSelectedSongItem();
        if (!songItem || isLoading) return;

        const selectedDiff = songItem.querySelector('.song-difficulty-pill.selected');
        if (!selectedDiff || selectedDiff.dataset.hasData === 'false') {
            showNoDataError();
            return;
        }

        previewAudioUnlocked = true;
        songPreviewLauncher.classList.remove('launching');
        void songPreviewLauncher.offsetWidth;
        songPreviewLauncher.classList.add('launching');

        // Launch animation: scale down and move to top 30%
        songPreviewLauncher.classList.remove('returning', 'reset-instant');
        void songPreviewLauncher.offsetWidth;
        songPreviewLauncher.classList.add('launched');

        setTimeout(() => {
            songPreviewLauncher.classList.remove('launching');
        }, 1000);

        setTimeout(() => {
            if (!isLoading) {
                startLoadingSequence(songItem);
            }
        }, 160);
    }

    songPreviewLauncher.addEventListener('click', flashPreviewLauncherAndStart);

    // ══════════════════════════════════════════════════════════════
    // PARALLAX MOUSE EFFECT
    // ══════════════════════════════════════════════════════════════
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let entranceOffsetX = 0; // Extra offset for entrance animation (slides from right)
    const parallaxStrength = 20; // Max pixels of movement (song-select background)
    const START_BG_PARALLAX = 0.8; // % max — opposite cursor
    const START_BAR_PARALLAX = 0.2; // % max — middle bar

    document.addEventListener('mousemove', (e) => {
        // Calculate mouse position relative to center of screen (0 to 1, centered at 0.5)
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Normalize to -1 to 1 range
        targetX = (e.clientX - centerX) / centerX;
        targetY = (e.clientY - centerY) / centerY;
    });

    function updateParallax() {
        // Smooth interpolation
        mouseX += (targetX - mouseX) * 0.08;
        mouseY += (targetY - mouseY) * 0.08;
        
        // Smoothly reduce entrance offset to 0
        entranceOffsetX *= 0.92;
        if (Math.abs(entranceOffsetX) < 0.5) entranceOffsetX = 0;
        
        // Apply transform to both background images (with entrance offset)
        const translateX = mouseX * parallaxStrength + entranceOffsetX;
        const translateY = mouseY * parallaxStrength;
        
        img1.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px))`;
        img2.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px))`;

        // Start menu: wallpaper + middle bar (opposite cursor, percentage-based)
        const onStartScreen = startWrapper && !startWrapper.classList.contains('dn');
        if (onStartScreen && startBg) {
            const bgX = (-mouseX * START_BG_PARALLAX).toFixed(3);
            const bgY = (-mouseY * START_BG_PARALLAX).toFixed(3);
            startBg.style.transform = `translate(${bgX}%, ${bgY}%)`;

            if (middlebarWrap && !startScreen.classList.contains('exiting')) {
                const barX = (-mouseX * START_BAR_PARALLAX).toFixed(3);
                const barY = (-mouseY * START_BAR_PARALLAX).toFixed(3);
                middlebarWrap.style.transform = `translate(${barX}%, ${barY}%)`;
            }
        } else if (middlebarWrap) {
            middlebarWrap.style.transform = '';
        }
        
        requestAnimationFrame(updateParallax);
    }
    
    // Start parallax animation loop
    updateParallax();
    ensurePreviewAnimation();

    function changeBackground(imageSrc) {
        const activeImg = currentActiveImg === 'img1' ? img1 : img2;
        const inactiveImg = currentActiveImg === 'img1' ? img2 : img1;
        
        // Set the new image source on the inactive image
        inactiveImg.src = imageSrc;
        
        // Crossfade: show inactive, hide active
        inactiveImg.style.opacity = '1';
        activeImg.style.opacity = '0';
        
        // Switch which image is considered active
        currentActiveImg = currentActiveImg === 'img1' ? 'img2' : 'img1';
    }

    // Update explainer div with selected song information
    function updateExplainer(songItem) {
        // Get song info
        const titleEl = songItem.querySelector('.song-title');
        const artistEl = songItem.querySelector('.song-artist');
        const selectedDifficultyPill = songItem.querySelector('.song-difficulty-pill.selected');
        
        if (!titleEl || !artistEl || !selectedDifficultyPill) return;
        
        const title = titleEl.textContent;
        const artist = artistEl.textContent;
        const diffName = selectedDifficultyPill.querySelector('.difficulty-name')?.textContent || '';
        const diffStar = selectedDifficultyPill.querySelector('.difficulty-star')?.textContent || '';
        const diffMapper = selectedDifficultyPill.querySelector('.difficulty-mapper')?.textContent || '';

        // Look up full song data
        const songId = songItem.dataset.songId;
        const diffIdx = parseInt(selectedDifficultyPill.dataset.diffIndex);
        const songData = getSongById(songId);
        const diffData = songData?.difficulties[diffIdx];

        const mode = diffData?.mode === 'updown' ? 'Arrow' : 'Taiko';
        const modeIcon = diffData?.mode === 'updown' ? '↕' : '🥁';
        let length = songData?.time || '';
        if (!length && diffData) {
            const noteData = getDifficultyNoteData(diffData);
            if (noteData.length > 0) {
                const maxMs = Math.max(...noteData.map(n => typeof n.time === 'number' ? n.time : 0));
                if (maxMs > 0) {
                    const s = Math.floor(maxMs / 1000);
                    length = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
                }
            }
        }
        if (!length) length = '--:--';
        const speed = diffData?.speed != null ? diffData.speed + '×' : '1.0×';
        const ranked = songData?.ranked ? 'Ranked' : 'Unranked';

        // Update explainer title and artist
        document.querySelector('.explainer-title').textContent = title;
        document.querySelector('.explainer-artist').textContent = artist;

        // Ranked badge
        const badge = document.getElementById('explainerRankedBadge');
        if (badge) {
            badge.textContent = ranked.toUpperCase();
            badge.style.background = songData?.ranked
                ? 'linear-gradient(135deg, #00ff00, #00cc00)'
                : 'linear-gradient(135deg, #888, #555)';
        }

        // Stats row
        document.getElementById('explainerLength').textContent = length;
        document.getElementById('explainerModeIcon').textContent = modeIcon;
        document.getElementById('explainerModeName').textContent = mode;
        const speedStat = document.getElementById('explainerSpeedStat');
        if (speedStat) speedStat.style.display = diffData?.speed != null ? '' : 'none';
        document.getElementById('explainerSpeed').textContent = speed;

        // Details grid
        document.getElementById('explainerDetailMode').textContent = mode;
        document.getElementById('explainerDetailLength').textContent = length;
        document.getElementById('explainerDetailSpeed').textContent = speed;
        document.getElementById('explainerDetailRanked').textContent = ranked;
        
        // Update difficulty info in explainer
        document.querySelector('.explainer .difficulty-star').textContent = diffStar;
        document.querySelector('.explainer .difficulty-name').textContent = diffName;
        document.querySelector('.explainer .difficulty-mapper').textContent = diffMapper;
    }

    // Set initial background from selected song
    function setInitialBackground() {
        const selectedSong = document.querySelector('.song-item.selected .song-pill');
        if (selectedSong) {
            const bgImage = selectedSong.style.backgroundImage;
            const imageUrl = bgImage.replace(/url\(["']?([^"']*)["']?\)/, '$1');
            if (imageUrl) {
                img1.src = imageUrl;
                // Store initial selected song background
                currentSelectedSong.bgImage = imageUrl;
            }
        }
        
        // Initialize explainer with selected song
        const selectedSongItem = document.querySelector('.song-item.selected');
        if (selectedSongItem) {
            updateExplainer(selectedSongItem);
            // Store initial selected song info
            const titleEl = selectedSongItem.querySelector('.song-title');
            const artistEl = selectedSongItem.querySelector('.song-artist');
            currentSelectedSong.songId = selectedSongItem.dataset.songId || null;
            if (titleEl) currentSelectedSong.title = titleEl.textContent;
            if (artistEl) currentSelectedSong.artist = artistEl.textContent;
        }

        syncSongPreview();
    }

    // Scroll-based width animation for song items
    const songsContainer = document.querySelector('.songs');
    
    function getSongItems() {
        return document.querySelectorAll('.song-item');
    }

    function updateSongWidths() {
        const viewportCenter = window.innerHeight / 2;
        const songItems = getSongItems();

        songItems.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.top + itemRect.height / 2;
            
            // Calculate distance from viewport center (0 = at center, 1 = at edge)
            const distanceFromCenter = Math.abs(itemCenter - viewportCenter);
            const maxDistance = window.innerHeight / 2;
            const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1);
            
            // Map to width: 90% at center, 60% at edges
            const minWidth = 60;
            const maxWidth = 83;
            const width = maxWidth - (normalizedDistance * (maxWidth - minWidth));
            
            item.style.setProperty('--item-width', `${width}%`);
        });
    }

    // Update on scroll
    songsContainer.addEventListener('scroll', updateSongWidths);
    
    // Initial updates
    updateSongWidths();
    setInitialBackground();
    loadRecords(); // Load saved records on startup
    
    // Update on resize
    window.addEventListener('resize', updateSongWidths);

    // Shared song-selection logic (used by click and keyboard navigation)
    function selectSongItem(songItem) {
        const songItems = getSongItems();
        songItems.forEach(s => s.classList.remove('selected'));
        songItem.classList.add('selected');

        // Sync keyboard focus index
        kbFocusIndex = Array.from(songItems).indexOf(songItem);

        // Get background image from selected song
        const songPill = songItem.querySelector('.song-pill');
        if (songPill && songPill.style.backgroundImage) {
            const bgImage = songPill.style.backgroundImage;
            const imageUrl = bgImage.replace(/url\(["']?([^"']*)["']?\)/, '$1');
            if (imageUrl) {
                changeBackground(imageUrl);
                currentSelectedSong.bgImage = imageUrl;
            }
        }

        const titleEl = songItem.querySelector('.song-title');
        const artistEl = songItem.querySelector('.song-artist');
        if (titleEl) currentSelectedSong.title = titleEl.textContent;
        if (artistEl) currentSelectedSong.artist = artistEl.textContent;
        currentSelectedSong.songId = songItem.dataset.songId || null;

        updateExplainer(songItem);
        previewAudioUnlocked = true;
        syncSongPreview();
        setTimeout(updateSongWidths, 50);
    }

    // Apply / remove keyboard-focus brightness highlight and center the item in the list
    function setKbFocus(items, idx) {
        items.forEach(s => s.classList.remove('keyboard-focus'));
        if (idx < 0 || idx >= items.length) return;

        const item = items[idx];
        item.classList.add('keyboard-focus');

        // Center the item inside the scrollable songs container
        const container = songsContainer;
        const itemTop = item.offsetTop;
        const itemHeight = item.offsetHeight;
        const containerHeight = container.clientHeight;
        container.scrollTo({
            top: itemTop - containerHeight / 2 + itemHeight / 2,
            behavior: 'smooth'
        });
    }

    // Click to select song with background change (using event delegation)
    songsContainer.addEventListener('click', (e) => {
        // Ignore clicks on difficulty pills (handled separately for loading)
        if (e.target.closest('.song-difficulty-pill')) return;

        const songItem = e.target.closest('.song-item');
        if (!songItem) return;

        selectSongItem(songItem);
    });

    // Arrow-key + Enter navigation for song select screen
    document.addEventListener('keydown', (e) => {
        if (!isSongSelectVisible()) return;
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Enter') return;

        const items = Array.from(getSongItems());
        if (!items.length) return;

        e.preventDefault();

        if (e.key === 'ArrowDown') {
            kbFocusIndex = Math.min(kbFocusIndex + 1, items.length - 1);
            setKbFocus(items, kbFocusIndex);
            selectSongItem(items[kbFocusIndex]);
        } else if (e.key === 'ArrowUp') {
            kbFocusIndex = Math.max(kbFocusIndex - 1, 0);
            setKbFocus(items, kbFocusIndex);
            selectSongItem(items[kbFocusIndex]);
        } else if (e.key === 'Enter') {
            flashPreviewLauncherAndStart();
        }
    });

    // ══════════════════════════════════════════════════════════════
    // STAR RATING SLIDER
    // ══════════════════════════════════════════════════════════════
    const starMinSlider = document.getElementById('starMinSlider');
    const starMaxSlider = document.getElementById('starMaxSlider');
    const starMinValue = document.getElementById('starMinValue');
    const starMaxValue = document.getElementById('starMaxValue');
    const starSliderFill = document.getElementById('starSliderFill');
    const matchCount = document.getElementById('matchCount');
    const searchInput = document.getElementById('searchInput');

    function getSongStarRating(songItem) {
        // Get the highest star rating from the song's difficulties
        const starElements = songItem.querySelectorAll('.song-difficulty-pill .difficulty-star');
        let maxRating = 0;
        starElements.forEach(el => {
            const text = el.textContent.replace('★', '').trim();
            const rating = parseFloat(text);
            if (!isNaN(rating) && rating > maxRating) {
                maxRating = rating;
            }
        });
        return maxRating;
    }

    function updateSliderTrack() {
        const minVal = parseFloat(starMinSlider.value);
        const maxVal = parseFloat(starMaxSlider.value);
        const minPercent = (minVal / 10) * 100;
        const maxPercent = (maxVal / 10) * 100;
        
        // Update overlays: left side (min) and right side (max)
        starSliderFill.style.width = minPercent + '%';
        document.querySelector('.star-slider-track').style.setProperty('--max-overlay', (100 - maxPercent) + '%');
    }

    function filterSongs() {
        const minVal = parseFloat(starMinSlider.value);
        const maxVal = parseFloat(starMaxSlider.value);
        const searchText = searchInput.value.toLowerCase().trim();
        const songItems = getSongItems();
        
        let visibleCount = 0;
        
        songItems.forEach(item => {
            const starRating = getSongStarRating(item);
            const titleEl = item.querySelector('.song-title');
            const artistEl = item.querySelector('.song-artist');
            const title = titleEl ? titleEl.textContent.toLowerCase() : '';
            const artist = artistEl ? artistEl.textContent.toLowerCase() : '';
            
            // Check star rating filter
            const passesStarFilter = starRating >= minVal && (maxVal >= 10 || starRating <= maxVal);
            
            // Check search filter
            const passesSearchFilter = searchText === '' || 
                title.includes(searchText) || 
                artist.includes(searchText);
            
            if (passesStarFilter && passesSearchFilter) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
        
        matchCount.textContent = visibleCount;
        updateSongWidths();
    }

    function updateStarSliders() {
        let minVal = parseFloat(starMinSlider.value);
        let maxVal = parseFloat(starMaxSlider.value);
        
        // Ensure min doesn't exceed max
        if (minVal > maxVal) {
            if (this === starMinSlider) {
                starMinSlider.value = maxVal;
                minVal = maxVal;
            } else {
                starMaxSlider.value = minVal;
                maxVal = minVal;
            }
        }
        
        // Update display values
        starMinValue.textContent = minVal.toFixed(1);
        starMaxValue.textContent = maxVal >= 10 ? '∞' : maxVal.toFixed(1);
        
        updateSliderTrack();
        filterSongs();
    }

    starMinSlider.addEventListener('input', updateStarSliders);
    starMaxSlider.addEventListener('input', updateStarSliders);
    searchInput.addEventListener('input', filterSongs);
    
    // Initialize
    updateSliderTrack();
    filterSongs();

    // ══════════════════════════════════════════════════════════════
    // LOADING SEQUENCE
    // ══════════════════════════════════════════════════════════════
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingTitle = document.getElementById('loadingTitle');
    const loadingArtist = document.getElementById('loadingArtist');
    const loadingImageBar = document.getElementById('loadingImageBar');
    const loadingBarFill = document.getElementById('loadingBarFill');
    const gameWrapper = document.getElementById('gameWrapper');
    const background = document.querySelector('.background');
    const explainer = document.querySelector('.explainer');
    const filterPanel = document.querySelector('.filter-panel');
    let loadingInterval = null;
    let loadingTimeout = null;
    let isLoading = false;
    let ingame = false;
    let isPaused = false;
    let pauseStartTime = 0; // Track when pause began (for clock correction)
    let countdownIntervalId = null;
    let pendingAudioStartTimeout = null;
    let audioFadeInterval = null;
    let pendingRestartTimeout = null;
    let gameSessionToken = 0;
    const pauseMenu = document.getElementById('pauseMenu');
    const pauseContinue = document.getElementById('pauseContinue');
    const pauseRetry = document.getElementById('pauseRetry');
    const pauseQuit = document.getElementById('pauseQuit');

    function startLoadingSequence(songItem) {
        if (isLoading) return;
        isLoading = true;
        stopSongPreview();

        // Get song info
        const title = songItem.querySelector('.song-title')?.textContent || '';
        const artist = songItem.querySelector('.song-artist')?.textContent || '';
        const songPill = songItem.querySelector('.song-pill');
        const bgImage = songPill?.style.backgroundImage?.replace(/url\(["']?([^"']*)["']?\)/, '$1') || '';
        
        // Store song ID for accessing full song data later
        currentSelectedSong.songId = songItem.dataset.songId || null;
        
        // Get selected difficulty info
        const selectedDiff = songItem.querySelector('.song-difficulty-pill.selected');
        const mapper = selectedDiff?.querySelector('.difficulty-mapper')?.textContent || '';
        const stars = selectedDiff?.querySelector('.difficulty-star')?.textContent || '';

        // Set loading screen content
        loadingTitle.textContent = title;
        loadingArtist.textContent = artist;
        loadingImageBar.querySelector('.loading-image-inner').style.backgroundImage = `url(${bgImage})`;
        
        // Update more-info section
        const moreInfo = loadingScreen.querySelector('.more-info');
        if (moreInfo) {
            moreInfo.innerHTML = `
                <span>${mapper}</span>
                <span>rating: ${stars}</span>
                <span>click (esc) to cancel</span>
            `;
        }
        
        loadingBarFill.style.width = '0%';

        // Slide UI elements out
        songsContainer.classList.add('fade-right');
        filterPanel.classList.add('fade-right');
        explainer.classList.add('fade-left');
        
        // Hide records panel with fade-left animation
        const recordsPanel = document.querySelector('.records-panel');
        if (recordsPanel) recordsPanel.classList.add('fade-left');

        // Blur background
        background.classList.add('blurred');

        // Show loading screen
        loadingScreen.classList.add('active');

        // Animate loading bar
        let progress = 0;
        loadingInterval = setInterval(() => {
            progress += Math.random() * 8 + 2;
            if (progress >= 100) {
                progress = 100;
                clearInterval(loadingInterval);
                loadingInterval = null;

                // After bar fills, transition to game
                loadingTimeout = setTimeout(() => {
                    // Hide loading screen
                    loadingScreen.classList.remove('active');
                    
                    // Set lefwrito background to current song's background (dimmed)
                    // Use GIF if available, otherwise use static image
                    const lefwrito = document.querySelector('.lefwrito');
                    if (lefwrito && currentSelectedSong.songId !== null) {
                        const songData = getSongById(currentSelectedSong.songId);
                        const bgToUse = songData?.inGameGif || songData?.coverImage || currentSelectedSong.bgImage;
                        const isGif = bgToUse && bgToUse.toLowerCase().endsWith('.gif');
                        lefwrito.style.backgroundImage = '';
                        void lefwrito.offsetWidth;
                        lefwrito.style.backgroundImage = `url(${isGif ? bgToUse + '?t=' + Date.now() : bgToUse})`;
                    } else if (lefwrito && currentSelectedSong.bgImage) {
                        lefwrito.style.backgroundImage = `url(${currentSelectedSong.bgImage})`;
                    }
                    
                    // Show game wrapper
                    gameWrapper.classList.remove('dn');
                    gameWrapper.classList.add('in-game');
                    
                    // Instantly reset launcher and hide it during gameplay
                    songPreviewLauncher.classList.add('reset-instant');
                    songPreviewLauncher.classList.remove('launched', 'returning');
                    void songPreviewLauncher.offsetWidth;
                    songPreviewLauncher.classList.remove('reset-instant');
                    songPreviewLauncher.style.display = 'none';
                    
                    // Set ingame to true
                    ingame = true;

                    // Record this song as recently played
                    recordLastPlayed(currentSelectedSong.songId);
                    
                    // Start the taiko game
                    startTaikoGame();
                }, 400);
            }
            loadingBarFill.style.width = progress + '%';
        }, 200);
    }

    function cancelLoadingSequence() {
        isLoading = false;

        // Stop loading animation
        if (loadingInterval) {
            clearInterval(loadingInterval);
            loadingInterval = null;
        }
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
        }

        // Show and smoothly return the launcher to its corner position
        songPreviewLauncher.style.display = '';
        songPreviewLauncher.classList.remove('launched');
        songPreviewLauncher.classList.add('returning');
        songPreviewLauncher.addEventListener('transitionend', function onReturn() {
            songPreviewLauncher.classList.remove('returning');
            songPreviewLauncher.removeEventListener('transitionend', onReturn);
        });

        // Hide game wrapper
        gameWrapper.classList.add('dn');
        gameWrapper.classList.remove('in-game');

        // Hide loading screen
        loadingScreen.classList.remove('active');

        // Slide UI elements back
        songsContainer.classList.remove('fade-right');
        filterPanel.classList.remove('fade-right');
        explainer.classList.remove('fade-left');
        
        // Show records panel again
        const recordsPanel = document.querySelector('.records-panel');
        if (recordsPanel) recordsPanel.classList.remove('fade-left');

        // Unblur background
        background.classList.remove('blurred');

        // Reset loading bar
        loadingBarFill.style.width = '0%';
        syncSongPreview();
    }

    // Click on difficulty pill to start loading
    songsContainer.addEventListener('click', (e) => {
        const diffPill = e.target.closest('.song-difficulty-pill');
        if (!diffPill || isLoading) return;
        previewAudioUnlocked = true;

        const songItem = diffPill.closest('.song-item');
        if (!songItem) return;

        const alreadySelected = diffPill.classList.contains('selected');

        // Mark this difficulty as selected
        songItem.querySelectorAll('.song-difficulty-pill').forEach(p => p.classList.remove('selected'));
        diffPill.classList.add('selected');
        updateExplainer(songItem);
        syncSongPreview();

        // Only start loading if pill was already selected (second click)
        if (alreadySelected) {
            // Check if this difficulty has data before loading
            if (diffPill.dataset.hasData === 'false') {
                showNoDataError();
                return;
            }
            // Trigger the same launcher animation as clicking the logo
            songPreviewLauncher.classList.remove('launching');
            void songPreviewLauncher.offsetWidth;
            songPreviewLauncher.classList.add('launching');
            songPreviewLauncher.classList.remove('returning', 'reset-instant');
            void songPreviewLauncher.offsetWidth;
            songPreviewLauncher.classList.add('launched');
            setTimeout(() => {
                songPreviewLauncher.classList.remove('launching');
            }, 1000);
            setTimeout(() => {
                if (!isLoading) startLoadingSequence(songItem);
            }, 160);
        }
    });

    // Show error when trying to play a song with no data
    function showNoDataError() {
        // Create a temporary error toast
        const toast = document.createElement('div');
        toast.className = 'no-data-toast';
        toast.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>No beatmap data for this difficulty</span>
        `;
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => toast.classList.add('show'));
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Song select back button – quits game if in-game, cancels loading if loading, otherwise returns to start screen
    const songSelectBackBtn = document.getElementById('songSelectBackBtn');
    songSelectBackBtn.addEventListener('click', () => {
        if (ingame) {
            quitGame();
            return;
        }

        if (isLoading) {
            cancelLoadingSequence();
            return;
        }

        stopSongPreview();

        const songsEl = document.querySelector('.songs');
        const filterEl = document.querySelector('.filter-panel');
        const explainerEl = document.querySelector('.explainer');
        const recordsEl = document.querySelector('.records-panel');

        // Slide all song-select elements out
        songsEl.classList.add('fade-right');
        filterEl.classList.add('fade-right');
        explainerEl.classList.add('fade-left');
        if (recordsEl) recordsEl.classList.add('fade-left');

        // Fade the back button out to the left
        songSelectBackBtn.classList.add('fade-left');

        // Prepare start screen in its exit position, then show + animate it back in
        startScreen.classList.add('exiting');
        const mbarItems = document.querySelectorAll('.mbar-item');
        mbarItems.forEach(item => item.classList.add('fade-out'));
        startWrapper.classList.remove('dn');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                startScreen.classList.remove('exiting');
                mbarItems.forEach(item => item.classList.remove('fade-out'));
                setRandomStartWallpaper();
            });
        });
    });

    // Escape key cancels loading, toggles pause menu, or goes back to start screen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (ingame) {
                togglePauseMenu();
            } else if (!startWrapper.classList.contains('dn')) {
                // on start screen, do nothing
            } else {
                songSelectBackBtn.click();
            }
        }
    });

    // ══════════════════════════════════════════════════════════════
    // PAUSE MENU
    // ══════════════════════════════════════════════════════════════
    function togglePauseMenu() {
        isPaused = !isPaused;
        if (isPaused) {
            pauseStartTime = performance.now();
            pauseMenu.classList.add('active');
            if (gameAudio) gameAudio.pause();
        } else {
            // Shift game clocks forward by paused duration so elapsed time is accurate
            const pausedDuration = performance.now() - pauseStartTime;
            gameStartTime += pausedDuration;
            arrowStartTime += pausedDuration;
            pauseMenu.classList.remove('active');
            if (gameAudio) gameAudio.play();
        }
    }

    function resumeGame() {
        const pausedDuration = performance.now() - pauseStartTime;
        gameStartTime += pausedDuration;
        arrowStartTime += pausedDuration;
        isPaused = false;
        pauseMenu.classList.remove('active');
        if (gameAudio) gameAudio.play();
    }

    function clearPendingGameTimers() {
        if (countdownIntervalId) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
        }
        if (pendingAudioStartTimeout) {
            clearTimeout(pendingAudioStartTimeout);
            pendingAudioStartTimeout = null;
        }
        if (audioFadeInterval) {
            clearInterval(audioFadeInterval);
            audioFadeInterval = null;
        }
        if (pendingRestartTimeout) {
            clearTimeout(pendingRestartTimeout);
            pendingRestartTimeout = null;
        }

        countdownOverlay.classList.remove('active');
        countdownNumber.classList.remove('animate');
    }

    function quitGame() {
        gameSessionToken++;
        ingame = false;
        isPaused = false;
        
        // Clear all pending timers first
        clearPendingGameTimers();

        // Stop the game and audio - stopTaikoGame handles all cleanup including audio
        stopTaikoGame();
        stopArrowGame();
        currentGameMode = 'taiko';

        pauseMenu.classList.remove('active');
        resultsScreen.classList.remove('active');
        songProgressFill.style.width = '0%';
        resetHitErrorBar();
        
        // Hide game wrapper and clear leftover DOM
        gameWrapper.classList.add('dn');
        gameWrapper.classList.remove('in-game');
        
        // Show UI elements again
        songsContainer.classList.remove('fade-right');
        filterPanel.classList.remove('fade-right');
        explainer.classList.remove('fade-left');
        background.classList.remove('blurred');
        
        // Show records panel again
        const recordsPanel = document.querySelector('.records-panel');
        if (recordsPanel) recordsPanel.classList.remove('fade-left');
        
        // Reset loading bar
        loadingBarFill.style.width = '0%';
        isLoading = false;

        // Show launcher again and reset its state
        songPreviewLauncher.style.display = '';
        songPreviewLauncher.classList.remove('launched', 'launching', 'returning');

        syncSongPreview();
    }

    // Quiter overlay — click anywhere on it to quit immediately
    document.querySelector('.quiter').addEventListener('click', quitGame);

    pauseContinue.addEventListener('click', resumeGame);
    pauseRetry.addEventListener('click', () => {
        // Stop current game and restart
        isPaused = false;
        pauseMenu.classList.remove('active');
        stopTaikoGame();
        // Small delay before restarting to ensure cleanup
        pendingRestartTimeout = setTimeout(() => {
            pendingRestartTimeout = null;
            startTaikoGame();
        }, 100);
    });
    pauseQuit.addEventListener('click', quitGame);

    // ══════════════════════════════════════════════════════════════
    // TAIKO GAME ENGINE
    // ══════════════════════════════════════════════════════════════
    const noteTrack = document.getElementById('noteTrack');
    const takioBarEl = document.querySelector('.takio-bar');
    const hitZone = document.querySelector('.hit');
    const drumOuter = document.getElementById('key-d');
    const drumInner = document.getElementById('key-f');
    const hitCircle = document.querySelector('.hit .circle');

    const BASE_TRAVEL_TIME = 2000; // base ms for note to travel (at speed 1.0)
    const HIT_WINDOW = 150;  // ms tolerance for hit detection (~90% accuracy)
    const NOTE_SIZE = 80;

    let travelTime = BASE_TRAVEL_TIME; // actual travel time (modified by speed)
    let gameNotes = [];
    let songNoteData = [];
    let gameStartTime = 0;
    let gameRunning = false;
    let taikoLoopToken = 0; // Token to identify this loop instance
    let nextNoteIdx = 0;

    // Timing lines
    let timingLines = [];
    let nextTimingLineSec = 0;
    const TIMING_LINE_INTERVAL = 1000; // ms between timing lines (1 second)

    // Score tracking
    let stats = {
        great: 0,
        ok: 0,
        miss: 0,
        combo: 0,
        maxCombo: 0,
        score: 0,
        totalNotes: 0
    };
    let songDuration = 0; // ms
    let currentSongTitle = '';
    let currentSongArtist = '';
    let currentDiffName = '';
    let currentStars = 0;
    let currentMapper = '';
    const GREAT_WINDOW = 50; // ms - perfect timing
    const GAME_START_DELAY = 3000; // 3 second countdown before game starts
    const TRACK_START_BUFFER = 3000; // 3 second buffer before notes start (gives player time to prepare)

    // Audio elements
    let gameAudio = null;
    let currentAudioPath = null;
    let audioContext = null;
    let analyser = null;
    let audioSource = null;
    let equalizerAnimationId = null;
    let dataArray = null;
    const countdownOverlay = document.getElementById('countdownOverlay');
    const countdownNumber = document.getElementById('countdownNumber');
    const audioEqualizer = document.getElementById('audioEqualizer');
    const eqBars = audioEqualizer.querySelectorAll('.eq-bar');

    // UI elements for accuracy
    const accuracyFill = document.getElementById('accuracyFill');
    const accuracyPercent = document.getElementById('accuracyPercent');
    const comboDisplay = document.getElementById('comboDisplay');
    const resultsScreen = document.getElementById('resultsScreen');

    // Hit Error Bar (osu!-style unstable rate meter)
    const hitErrorBar = document.getElementById('hitErrorBar');
    const hitErrorTicks = document.getElementById('hitErrorTicks');
    const hitErrorAvg = document.getElementById('hitErrorAvg');
    const HIT_ERROR_MAX_TICKS = 40;
    const HIT_ERROR_FADE_MS = 3000;
    let hitErrorOffsets = [];

    function resetHitErrorBar() {
        hitErrorOffsets = [];
        hitErrorTicks.innerHTML = '';
        hitErrorAvg.style.left = '50%';
        hitErrorBar.classList.remove('active');
    }

    function addHitErrorTick(signedOffset, hitWindow) {
        hitErrorBar.classList.add('active');

        hitErrorOffsets.push(signedOffset);
        if (hitErrorOffsets.length > HIT_ERROR_MAX_TICKS) hitErrorOffsets.shift();

        const clamped = Math.max(-hitWindow, Math.min(hitWindow, signedOffset));
        const pct = 50 + (clamped / hitWindow) * 50;

        let color;
        const absRatio = Math.abs(clamped) / hitWindow;
        if (absRatio <= 0.25) color = 'rgba(60, 255, 120, 0.95)';
        else if (absRatio <= 0.55) color = clamped < 0 ? 'rgba(80, 160, 255, 0.9)' : 'rgba(255, 180, 50, 0.9)';
        else color = clamped < 0 ? 'rgba(50, 120, 255, 0.85)' : 'rgba(255, 140, 30, 0.85)';

        const tick = document.createElement('div');
        tick.className = 'hit-error-tick';
        tick.style.left = pct + '%';
        tick.style.background = color;
        tick.style.boxShadow = `0 0 4px ${color}`;
        hitErrorTicks.appendChild(tick);

        setTimeout(() => tick.classList.add('fading'), 50);
        setTimeout(() => tick.remove(), HIT_ERROR_FADE_MS + 200);

        while (hitErrorTicks.children.length > HIT_ERROR_MAX_TICKS) {
            hitErrorTicks.firstChild.remove();
        }

        const avg = hitErrorOffsets.reduce((s, v) => s + v, 0) / hitErrorOffsets.length;
        const avgPct = 50 + (Math.max(-hitWindow, Math.min(hitWindow, avg)) / hitWindow) * 50;
        hitErrorAvg.style.left = avgPct + '%';
    }

    async function getCurrentSongInfo() {
        const selectedSongItem = document.querySelector('.song-item.selected');
        if (!selectedSongItem) return null;
        const songId = selectedSongItem.dataset.songId;
        const song = getSongById(songId);
        if (!song || !Array.isArray(song.difficulties) || song.difficulties.length === 0) return null;

        let selectedDiffPill = selectedSongItem.querySelector('.song-difficulty-pill.selected');
        let diffIdx = selectedDiffPill ? parseInt(selectedDiffPill.dataset.diffIndex) : -1;
        let diff = Number.isInteger(diffIdx) ? song.difficulties[diffIdx] : null;

        if (!diff || getDifficultyNoteData(diff).length === 0) {
            diffIdx = getDefaultDifficultyIndex(song);
            diff = song.difficulties[diffIdx] || null;

            if (selectedDiffPill) selectedDiffPill.classList.remove('selected');

            const fallbackPill = selectedSongItem.querySelector(`.song-difficulty-pill[data-diff-index="${diffIdx}"]`);
            if (fallbackPill) {
                fallbackPill.classList.add('selected');
                selectedDiffPill = fallbackPill;
            }
        }

        if (!diff) return null;
        const resolvedAudio = await resolveAudioPath(song);
        return {
            songData: getDifficultyNoteData(diff),
            speed: diff.speed || 1.0,
            time: song.time || '0:00',
            title: song.title,
            artist: song.artist,
            diffName: diff.name,
            stars: diff.stars,
            mapper: diff.mapper,
            audio: resolvedAudio,
            audioCorrection: diff.audioCorrection ?? song.audioCorrection ?? 0,
            mode: diff.mode || 'taiko'
        };
    }

    // Convert time string "3:22" to milliseconds
    function timeStringToMs(timeStr) {
        const parts = timeStr.split(':');
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;
        return (minutes * 60 + seconds) * 1000;
    }

    // ══════════════════════════════════════════════════════════════
    // ARROW GAME ENGINE
    // ══════════════════════════════════════════════════════════════
    let currentGameMode = 'taiko'; // 'taiko' or 'updown'
    const arrowGame = document.getElementById('arrowGame');
    const arrowLanes = document.getElementById('arrowLanes');
    const arrowJudgment = document.getElementById('arrowJudgment');
    const arrowComboNumber = document.getElementById('arrowComboNumber');
    const arrowAccuracyFill = document.getElementById('arrowAccuracyFill');
    const arrowAccuracyPercent = document.getElementById('arrowAccuracyPercent');
    const arrowComboDisplay = document.getElementById('arrowComboDisplay');

    const ARROW_FALL_TIME = 1500; // ms for arrow to fall from top to receptor
    const ARROW_HIT_WINDOW = 180; // ms tolerance
    const ARROW_PERFECT_WINDOW = 35; // ms for PERFECT
    const ARROW_GREAT_WINDOW = 80; // ms for GREAT
    // OK is anything within HIT_WINDOW but outside GREAT_WINDOW

    const ARROW_KEY_MAP = {
        'd': 'left',
        'f': 'down',
        'j': 'up',
        'k': 'right'
    };

    const ARROW_DIR_INDEX = { 'left': 0, 'down': 1, 'up': 2, 'right': 3 };

    let arrowNotes = [];
    let arrowSongData = [];
    let arrowNextIdx = 0;
    let arrowGameRunning = false;
    let arrowStartTime = 0;
    let arrowFallTime = ARROW_FALL_TIME;
    let arrowLoopToken = 0; // Token to identify this loop instance

    let arrowStats = {
        perfect: 0,
        great: 0,
        ok: 0,
        miss: 0,
        combo: 0,
        maxCombo: 0,
        score: 0,
        totalNotes: 0
    };

    // Get receptor Y position (bottom of receptor row)
    function getReceptorY() {
        const lane = arrowLanes.querySelector('.arrow-lane');
        const receptor = lane.querySelector('.arrow-receptor');
        const laneRect = arrowLanes.getBoundingClientRect();
        const recRect = receptor.getBoundingClientRect();
        return recRect.top + recRect.height / 2 - laneRect.top;
    }

    function createArrowSVG(dir) {
        const svgs = {
            'left': '<svg viewBox="0 0 64 64"><polygon class="arrow-border" points="4,32 28,6 28,20 60,20 60,44 28,44 28,58"/><polygon class="arrow-fill" points="8,32 30,10 30,22 56,22 56,42 30,42 30,54"/></svg>',
            'down': '<svg viewBox="0 0 64 64"><polygon class="arrow-border" points="32,60 6,36 20,36 20,4 44,4 44,36 58,36"/><polygon class="arrow-fill" points="32,56 10,34 22,34 22,8 42,8 42,34 54,34"/></svg>',
            'up': '<svg viewBox="0 0 64 64"><polygon class="arrow-border" points="32,4 58,28 44,28 44,60 20,60 20,28 6,28"/><polygon class="arrow-fill" points="32,8 54,30 42,30 42,56 22,56 22,30 10,30"/></svg>',
            'right': '<svg viewBox="0 0 64 64"><polygon class="arrow-border" points="60,32 36,6 36,20 4,20 4,44 36,44 36,58"/><polygon class="arrow-fill" points="56,32 34,10 34,22 8,22 8,42 34,42 34,54"/></svg>'
        };
        return svgs[dir] || svgs['up'];
    }

    function spawnArrowNote(noteData) {
        const dir = noteData.key; // 'left', 'down', 'up', 'right'
        const laneIdx = ARROW_DIR_INDEX[dir];
        const lane = arrowLanes.querySelectorAll('.arrow-lane')[laneIdx];
        if (!lane) return null;

        const el = document.createElement('div');
        el.className = `arrow-note arrow-${dir}`;
        el.innerHTML = createArrowSVG(dir);
        lane.appendChild(el);
        return el;
    }

    function updateArrowAccuracy() {
        const totalHits = arrowStats.perfect + arrowStats.great + arrowStats.ok + arrowStats.miss;
        let accuracy = 100;
        if (totalHits > 0) {
            accuracy = ((arrowStats.perfect * 100 + arrowStats.great * 80 + arrowStats.ok * 50) / (totalHits * 100)) * 100;
        }
        arrowAccuracyFill.style.width = accuracy + '%';
        arrowAccuracyPercent.textContent = accuracy.toFixed(1) + '%';
        arrowComboDisplay.textContent = arrowStats.combo + 'x';
        arrowComboNumber.textContent = arrowStats.combo;

        // Also update the main accuracy UI so results screen works
        stats.great = arrowStats.perfect + arrowStats.great;
        stats.ok = arrowStats.ok;
        stats.miss = arrowStats.miss;
        stats.combo = arrowStats.combo;
        stats.maxCombo = arrowStats.maxCombo;
        stats.score = arrowStats.score;
        stats.totalNotes = arrowStats.totalNotes;
    }

    function showArrowJudgment(type) {
        arrowJudgment.innerHTML = '';
        const el = document.createElement('div');
        el.className = `arrow-judgment ${type}`;
        el.textContent = type.toUpperCase();
        arrowJudgment.appendChild(el);
        setTimeout(() => el.remove(), 600);
    }

    function arrowTriggerHit(note, timingDiff, signedOffset) {
        note.state = 'hit';
        note.element.classList.add('note-hit');

        let type;
        if (timingDiff <= ARROW_PERFECT_WINDOW) {
            type = 'perfect';
            arrowStats.perfect++;
            arrowStats.score += 500 * (1 + arrowStats.combo * 0.1);
        } else if (timingDiff <= ARROW_GREAT_WINDOW) {
            type = 'great';
            arrowStats.great++;
            arrowStats.score += 300 * (1 + arrowStats.combo * 0.08);
        } else {
            type = 'ok';
            arrowStats.ok++;
            arrowStats.score += 100 * (1 + arrowStats.combo * 0.05);
        }
        arrowStats.combo++;
        if (arrowStats.combo > arrowStats.maxCombo) arrowStats.maxCombo = arrowStats.combo;
        arrowStats.score = Math.floor(arrowStats.score);

        showArrowJudgment(type);
        updateArrowAccuracy();

        addHitErrorTick(signedOffset, ARROW_HIT_WINDOW);

        // Combo bump animation
        arrowComboNumber.classList.remove('bump');
        void arrowComboNumber.offsetWidth;
        arrowComboNumber.classList.add('bump');

        // Receptor flash
        const laneIdx = ARROW_DIR_INDEX[note.dir];
        const lane = arrowLanes.querySelectorAll('.arrow-lane')[laneIdx];
        const flash = lane.querySelector('.receptor-flash');
        flash.classList.remove('flash');
        void flash.offsetWidth;
        flash.classList.add('flash');

        setTimeout(() => {
            note.element.remove();
            note.state = 'removed';
        }, 300);
    }

    function arrowTriggerMiss(note) {
        note.state = 'miss';
        note.element.classList.add('note-miss');
        arrowStats.miss++;
        arrowStats.combo = 0;
        showArrowJudgment('miss');
        updateArrowAccuracy();

        setTimeout(() => {
            note.element.remove();
            note.state = 'removed';
        }, 500);
    }

    function arrowGameLoop(timestamp, loopToken) {
        // Check both running flag and loop token to prevent stale loops from continuing
        if (!arrowGameRunning || loopToken !== arrowLoopToken) return;
        if (isPaused) {
            requestAnimationFrame((ts) => arrowGameLoop(ts, loopToken));
            return;
        }

        const elapsed = timestamp - arrowStartTime;
        const receptorY = getReceptorY();
        const lanesHeight = arrowLanes.getBoundingClientRect().height;

        // Spawn notes that should now be visible (spawn above viewport)
        while (arrowNextIdx < arrowSongData.length) {
            const nd = arrowSongData[arrowNextIdx];
            if (nd.time - elapsed <= arrowFallTime) {
                const el = spawnArrowNote(nd);
                if (el) {
                    arrowNotes.push({
                        dir: nd.key,
                        time: nd.time,
                        element: el,
                        state: 'active'
                    });
                }
                arrowNextIdx++;
            } else {
                break;
            }
        }

        // Update positions (fall from top to receptor)
        for (const note of arrowNotes) {
            if (note.state !== 'active') continue;
            const timeUntilHit = note.time - elapsed;
            const progress = timeUntilHit / arrowFallTime; // 1 = top, 0 = at receptor
            const y = receptorY - (progress * receptorY) - 27; // center the 54px arrow
            note.element.style.top = y + 'px';

            // Miss if passed receptor by too much
            if (timeUntilHit < -ARROW_HIT_WINDOW) {
                arrowTriggerMiss(note);
            }
        }

        // Clean up
        arrowNotes = arrowNotes.filter(n => n.state !== 'removed');

        // Check if song is over
        const allDone = arrowNextIdx >= arrowSongData.length;
        const noActive = arrowNotes.every(n => n.state !== 'active');
        // End 3 seconds after last note or when song duration elapses
        const lastNoteTime = arrowSongData.length > 0 ? arrowSongData[arrowSongData.length - 1].time : 0;
        const songOver = elapsed >= Math.min(songDuration + 1000, lastNoteTime + 3000);

        if (allDone && noActive && songOver) {
            showResults();
            return;
        }

        requestAnimationFrame((ts) => arrowGameLoop(ts, loopToken));
    }

    // Arrow key handler
    document.addEventListener('keydown', (e) => {
        if (!arrowGameRunning || isPaused) return;
        const dir = ARROW_KEY_MAP[e.key.toLowerCase()];
        if (!dir) return;
        e.preventDefault();

        // Visual feedback on receptor
        const laneIdx = ARROW_DIR_INDEX[dir];
        const lane = arrowLanes.querySelectorAll('.arrow-lane')[laneIdx];
        const receptor = lane.querySelector('.arrow-receptor');
        receptor.classList.add('pressed');
        setTimeout(() => receptor.classList.remove('pressed'), 100);

        const elapsed = performance.now() - arrowStartTime;

        // Find closest matching note
        let best = null;
        let bestDiff = Infinity;
        let bestSigned = 0;
        for (const note of arrowNotes) {
            if (note.state !== 'active' || note.dir !== dir) continue;
            const diff = Math.abs(note.time - elapsed);
            if (diff < bestDiff && diff <= ARROW_HIT_WINDOW) {
                bestDiff = diff;
                bestSigned = elapsed - note.time;
                best = note;
            }
        }

        if (best) {
            arrowTriggerHit(best, bestDiff, bestSigned);
        }
    });

    function startArrowGame(sd, spd, sTime, audioPath, audioOffset) {
        const sessionToken = ++gameSessionToken;
        arrowFallTime = ARROW_FALL_TIME / spd;
        arrowStats = {
            perfect: 0, great: 0, ok: 0, miss: 0,
            combo: 0, maxCombo: 0, score: 0,
            totalNotes: sd.length
        };

        arrowSongData = sd.map(note => ({
            ...note,
            time: note.time + TRACK_START_BUFFER
        }));
        arrowNotes = [];
        arrowNextIdx = 0;

        // Clear lane notes
        arrowLanes.querySelectorAll('.arrow-note').forEach(n => n.remove());

        // Show arrow game, hide taiko
        const lefwrito = document.querySelector('.lefwrito');
        lefwrito.classList.add('arrow-mode');
        arrowGame.classList.add('active');

        // Reset accuracy display
        arrowComboNumber.textContent = '0';
        updateArrowAccuracy();
        resetHitErrorBar();

        // Setup song duration
        songDuration = timeStringToMs(sTime) + TRACK_START_BUFFER;

        // Setup audio
        const totalAudioOffset = audioOffset + TRACK_START_BUFFER;
        currentAudioPath = audioPath;
        setupAudio(audioPath, totalAudioOffset);

        // Countdown then start
        startCountdown(() => {
            if (sessionToken !== gameSessionToken) return;
            arrowStartTime = performance.now();
            arrowGameRunning = true;
            gameRunning = true; // For pause detection
            const loopToken = ++arrowLoopToken; // Capture token for this loop

            resetInGameGif();
            playAudioWithFadeIn(totalAudioOffset);
            audioEqualizer.classList.add('active');

            requestAnimationFrame((ts) => arrowGameLoop(ts, loopToken));
        });
    }

    function stopArrowGame() {
        arrowGameRunning = false;
        arrowLoopToken++; // Invalidate any running loops
        arrowNotes = [];
        arrowLanes.querySelectorAll('.arrow-note').forEach(n => n.remove());
        const lefwrito = document.querySelector('.lefwrito');
        lefwrito.classList.remove('arrow-mode');
        arrowGame.classList.remove('active');
        stopAudio();
    }

    async function startTaikoGame(data, speed = 1.0, songTime = '0:30', songInfo = null) {
        let sd = data;
        let spd = speed;
        let sTime = songTime;
        let audioPath = null;
        let audioOffset = 0; // Audio correction in ms (negative = audio starts earlier)
        let gameMode = 'taiko';
        const sessionToken = ++gameSessionToken;
        
        // If no data passed, get from current selection
        if (!sd) {
            const info = await getCurrentSongInfo();
            // Guard: if the user quit while we were awaiting song info, bail out
            if (sessionToken !== gameSessionToken) return;
            if (info) {
                sd = info.songData;
                spd = info.speed;
                sTime = info.time;
                currentSongTitle = info.title;
                currentSongArtist = info.artist;
                currentDiffName = info.diffName;
                currentStars = info.stars;
                currentMapper = info.mapper;
                audioPath = info.audio;
                audioOffset = info.audioCorrection || 0;
                gameMode = info.mode || 'taiko';
            }
        } else if (songInfo) {
            currentSongTitle = songInfo.title;
            currentSongArtist = songInfo.artist;
            currentDiffName = songInfo.diffName;
            currentStars = songInfo.stars;
            currentMapper = songInfo.mapper;
            audioPath = songInfo.audio;
            audioOffset = songInfo.audioCorrection || 0;
            gameMode = songInfo.mode || 'taiko';
        }

        currentGameMode = gameMode;

        // If arrow mode, delegate to arrow game engine
        if (currentGameMode === 'updown') {
            if (!sd || sd.length === 0) {
                console.warn('No song data for arrow mode');
                showNoDataError();
                quitGame();
                return;
            }
            startArrowGame(sd, spd, sTime, audioPath, audioOffset);
            return;
        }
        
        if (!sd || sd.length === 0) {
            console.warn('No song data available for this difficulty');
            showNoDataError();
            quitGame();
            return;
        }
        
        // Calculate travel time based on speed
        travelTime = BASE_TRAVEL_TIME / spd;
        songDuration = timeStringToMs(sTime);
        
        // Reset stats
        stats = {
            great: 0,
            ok: 0,
            miss: 0,
            combo: 0,
            maxCombo: 0,
            score: 0,
            totalNotes: sd.length
        };
        updateAccuracyUI();
        resetHitErrorBar();
        
        songNoteData = sd.map(note => ({
            ...note,
            time: note.time + TRACK_START_BUFFER // Add buffer so notes don't start immediately
        }));
        gameNotes = [];
        timingLines = [];
        nextNoteIdx = 0;
        nextTimingLineSec = Math.floor(TRACK_START_BUFFER / 1000); // Start timing lines after buffer
        noteTrack.innerHTML = '';
        
        // Adjust song duration to account for buffer
        songDuration = timeStringToMs(sTime) + TRACK_START_BUFFER;
        
        // Setup audio if available (audio will be delayed by the buffer)
        currentAudioPath = audioPath;
        const totalAudioOffset = audioOffset + TRACK_START_BUFFER;
        setupAudio(audioPath, totalAudioOffset);
        
        // Show countdown and start after delay
        startCountdown(() => {
            if (sessionToken !== gameSessionToken) return;
            gameStartTime = performance.now();
            gameRunning = true;
            const loopToken = ++taikoLoopToken; // Capture token for this loop

            resetInGameGif();
            
            // Start audio with fade-in (apply total offset including buffer)
            playAudioWithFadeIn(totalAudioOffset);
            
            // Start equalizer animation
            audioEqualizer.classList.add('active');
            
            requestAnimationFrame((ts) => taikoGameLoop(ts, loopToken));
        });
    }
    
    // Restarts the in-game GIF background so it plays from frame 1
    function resetInGameGif() {
        const lefwrito = document.querySelector('.lefwrito');
        if (!lefwrito) return;
        const songData = currentSelectedSong.songId !== null ? getSongById(currentSelectedSong.songId) : null;
        const bgToUse = songData?.inGameGif || songData?.coverImage || currentSelectedSong.bgImage;
        if (!bgToUse) return;
        const isGif = bgToUse.toLowerCase().endsWith('.gif');
        if (!isGif) return;
        lefwrito.style.backgroundImage = '';
        void lefwrito.offsetWidth; // Force reflow so browser re-fetches the GIF
        lefwrito.style.backgroundImage = `url(${bgToUse}?t=${Date.now()})`;
    }

    // Setup audio element with Web Audio API for visualization
    let currentAudioOffset = 0; // Store audio offset for playback
    
    function setupAudio(audioPath, audioOffset = 0) {
        // Stop any existing audio and cleanup
        stopAudio();
        
        // Store the audio offset
        currentAudioOffset = audioOffset;
        
        if (!audioPath) {
            gameAudio = null;
            return;
        }
        
        // Create Audio element and set crossOrigin BEFORE setting src
        // This is required for Web Audio API visualization to work
        gameAudio = new Audio();
        gameAudio.crossOrigin = 'anonymous'; // Must be set before src
        gameAudio.preload = 'auto';
        gameAudio.volume = 0; // Start at 0 for fade-in
        gameAudio.src = audioPath;
        
        // Handle CORS errors - retry without crossOrigin for audio-only playback
        gameAudio.addEventListener('error', (e) => {
            console.warn('Audio load error, retrying without CORS:', e);
            // Create new audio without crossOrigin for fallback
            const fallbackAudio = new Audio();
            fallbackAudio.preload = 'auto';
            fallbackAudio.volume = 0;
            fallbackAudio.src = audioPath;
            gameAudio = fallbackAudio;
            // Visualization won't work but audio will play
            analyser = null;
            audioSource = null;
            // Re-trigger playback on the fallback audio
            playAudioWithFadeIn(currentAudioOffset);
        }, { once: true });
        
        // Setup Web Audio API for visualization
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Create analyser node
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 128; // Results in 64 frequency bins
            analyser.smoothingTimeConstant = 0.8;
            
            // Create data array for frequency data
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            // Connect audio to analyser (do this when audio plays)
            gameAudio.addEventListener('play', () => {
                if (!audioSource) {
                    try {
                        audioSource = audioContext.createMediaElementSource(gameAudio);
                        audioSource.connect(analyser);
                        analyser.connect(audioContext.destination);
                    } catch (e) {
                        console.warn('Could not connect audio to visualizer (CORS?):', e);
                        analyser = null;
                    }
                }
            }, { once: true });
            
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }
    
    // Animate equalizer based on real audio frequencies
    function updateEqualizer() {
        if (!analyser || !dataArray || !gameRunning) {
            return;
        }
        
        // If paused, keep animation loop running but don't update bars
        if (isPaused) {
            equalizerAnimationId = requestAnimationFrame(updateEqualizer);
            return;
        }
        
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);
        
        // Map frequency data to equalizer bars
        const barCount = eqBars.length;
        const step = Math.floor(dataArray.length / barCount);
        
        for (let i = 0; i < barCount; i++) {
            // Get average of a range of frequencies for this bar
            let sum = 0;
            const startIdx = i * step;
            const endIdx = Math.min(startIdx + step, dataArray.length);
            for (let j = startIdx; j < endIdx; j++) {
                sum += dataArray[j];
            }
            const average = sum / (endIdx - startIdx);
            
            // Convert to height (0-255 to 4-70px)
            const minHeight = 4;
            const maxHeight = 70;
            const height = minHeight + (average / 255) * (maxHeight - minHeight);
            
            eqBars[i].style.height = height + 'px';
        }
        
        equalizerAnimationId = requestAnimationFrame(updateEqualizer);
    }
    
    // Play audio with fade-in effect
    // audioOffset: negative = audio starts earlier (notes delayed relative to audio)
    //              positive = audio starts later (notes come before audio)
    function playAudioWithFadeIn(audioOffset = 0) {
        if (!gameAudio) return;
        if (audioFadeInterval) {
            clearInterval(audioFadeInterval);
            audioFadeInterval = null;
        }
        if (pendingAudioStartTimeout) {
            clearTimeout(pendingAudioStartTimeout);
            pendingAudioStartTimeout = null;
        }
        
        // Resume audio context if suspended (required for some browsers)
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Calculate start time based on offset
        // Negative offset: skip ahead in the audio (audio was meant to start earlier)
        // Positive offset: delay the audio start
        const startTimeMs = Math.max(0, -audioOffset); // Convert to positive ms to skip
        const delayMs = Math.max(0, audioOffset); // Delay if positive offset
        
        const startAudio = () => {
            pendingAudioStartTimeout = null;
            if (!gameRunning && !arrowGameRunning) return;
            gameAudio.currentTime = startTimeMs / 1000; // Convert ms to seconds
            gameAudio.volume = 0;
            gameAudio.play().catch(e => console.warn('Audio playback failed:', e));
            
            // Fade in over 1 second
            const fadeInDuration = 1000;
            const fadeInSteps = 20;
            const fadeInInterval = fadeInDuration / fadeInSteps;
            const volumeStep = 1 / fadeInSteps;
            let currentStep = 0;
            
            audioFadeInterval = setInterval(() => {
                if (!gameAudio || (!gameRunning && !arrowGameRunning)) {
                    clearInterval(audioFadeInterval);
                    audioFadeInterval = null;
                    return;
                }
                currentStep++;
                if (currentStep >= fadeInSteps) {
                    gameAudio.volume = 1;
                    clearInterval(audioFadeInterval);
                    audioFadeInterval = null;
                } else {
                    gameAudio.volume = Math.min(1, volumeStep * currentStep);
                }
            }, fadeInInterval);
            
            // Start equalizer visualization
            updateEqualizer();
        };
        
        // If positive offset, delay the audio start
        if (delayMs > 0) {
            pendingAudioStartTimeout = setTimeout(startAudio, delayMs);
        } else {
            startAudio();
        }
    }
    
    // Stop audio
    function stopAudio() {
        if (pendingAudioStartTimeout) {
            clearTimeout(pendingAudioStartTimeout);
            pendingAudioStartTimeout = null;
        }
        if (audioFadeInterval) {
            clearInterval(audioFadeInterval);
            audioFadeInterval = null;
        }

        // Stop equalizer animation
        if (equalizerAnimationId) {
            cancelAnimationFrame(equalizerAnimationId);
            equalizerAnimationId = null;
        }
        
        // Reset equalizer bars
        eqBars.forEach(bar => {
            bar.style.height = '4px';
        });
        
        if (gameAudio) {
            gameAudio.pause();
            gameAudio.currentTime = 0;
            gameAudio.src = '';
            gameAudio.load();
            gameAudio = null;
        }
        
        // Disconnect audio source for next song
        if (audioSource) {
            try {
                audioSource.disconnect();
            } catch (e) {}
            audioSource = null;
        }
        
        audioEqualizer.classList.remove('active');
    }
    
    // Countdown before game starts
    function startCountdown(callback) {
        clearPendingGameTimers();
        countdownOverlay.classList.add('active');
        let count = 3;
        countdownNumber.textContent = count;
        countdownNumber.classList.add('animate');
        
        countdownIntervalId = setInterval(() => {
            if (isPaused) return; // Freeze countdown while paused
            count--;
            if (count <= 0) {
                clearInterval(countdownIntervalId);
                countdownIntervalId = null;
                countdownOverlay.classList.remove('active');
                countdownNumber.classList.remove('animate');
                callback();
            } else {
                countdownNumber.textContent = count;
                // Re-trigger animation
                countdownNumber.classList.remove('animate');
                void countdownNumber.offsetWidth; // Force reflow
                countdownNumber.classList.add('animate');
            }
        }, 1000);
    }

    function stopTaikoGame() {
        clearPendingGameTimers();
        gameRunning = false;
        arrowGameRunning = false;
        taikoLoopToken++; // Invalidate any running taiko loops
        // Always clean up both game modes
        stopArrowGame();
        if (noteTrack) noteTrack.innerHTML = '';
        gameNotes = [];
        timingLines = [];
        songNoteData = [];
        arrowSongData = [];
        nextNoteIdx = 0;
        arrowNextIdx = 0;
        stopAudio();
    }

    // Update accuracy UI
    function updateAccuracyUI() {
        const totalHits = stats.great + stats.ok + stats.miss;
        let accuracy = 100;
        if (totalHits > 0) {
            accuracy = ((stats.great * 100 + stats.ok * 50) / (totalHits * 100)) * 100;
        }
        
        accuracyFill.style.width = accuracy + '%';
        accuracyPercent.textContent = accuracy.toFixed(1) + '%';
        
        // Update fill color class
        accuracyFill.classList.remove('low', 'medium', 'high');
        if (accuracy >= 80) accuracyFill.classList.add('high');
        else if (accuracy >= 50) accuracyFill.classList.add('medium');
        else accuracyFill.classList.add('low');
        
        // Update combo display
        comboDisplay.textContent = stats.combo + 'x';
        comboDisplay.classList.toggle('high-combo', stats.combo >= 20);
    }

    // Calculate grade based on accuracy
    function calculateGrade(accuracy) {
        if (accuracy >= 100) return 'SS';
        if (accuracy >= 95) return 'S';
        if (accuracy >= 90) return 'A';
        if (accuracy >= 80) return 'B';
        if (accuracy >= 70) return 'C';
        return 'D';
    }

    // Show results screen
    function showResults() {
        gameRunning = false;
        arrowGameRunning = false;
        stopAudio();
        
        let totalHits, accuracy;
        const perfectBox = document.getElementById('resultsPerfectBox');
        
        if (currentGameMode === 'updown') {
            totalHits = arrowStats.perfect + arrowStats.great + arrowStats.ok + arrowStats.miss;
            accuracy = totalHits > 0 ? ((arrowStats.perfect * 100 + arrowStats.great * 80 + arrowStats.ok * 50) / (totalHits * 100)) * 100 : 0;
            perfectBox.style.display = '';
            document.getElementById('resultsPerfect').textContent = arrowStats.perfect;
            document.getElementById('resultsGreat').textContent = arrowStats.great;
            document.getElementById('resultsOk').textContent = arrowStats.ok;
            document.getElementById('resultsMiss').textContent = arrowStats.miss;
            // Sync stats for record saving
            stats.great = arrowStats.perfect + arrowStats.great;
            stats.ok = arrowStats.ok;
            stats.miss = arrowStats.miss;
            stats.combo = arrowStats.combo;
            stats.maxCombo = arrowStats.maxCombo;
            stats.score = arrowStats.score;
            stats.totalNotes = arrowStats.totalNotes;
        } else {
            totalHits = stats.great + stats.ok + stats.miss;
            accuracy = totalHits > 0 ? ((stats.great * 100 + stats.ok * 50) / (totalHits * 100)) * 100 : 0;
            perfectBox.style.display = 'none';
            document.getElementById('resultsGreat').textContent = stats.great;
            document.getElementById('resultsOk').textContent = stats.ok;
            document.getElementById('resultsMiss').textContent = stats.miss;
        }
        
        const grade = calculateGrade(accuracy);
        
        // Update results UI
        document.getElementById('resultsSongTitle').textContent = currentSongTitle;
        document.getElementById('resultsSongArtist').textContent = currentSongArtist;
        document.getElementById('resultsScore').textContent = stats.score.toLocaleString();
        document.getElementById('resultsStars').textContent = '★ ' + currentStars.toFixed(2);
        document.getElementById('resultsDiffName').textContent = currentDiffName;
        document.getElementById('resultsMapper').textContent = 'mapped by ' + currentMapper;
        document.getElementById('resultsAccuracy').textContent = accuracy.toFixed(2) + '%';
        document.getElementById('resultsMaxCombo').innerHTML = stats.maxCombo + '<span class="stat-sub">/' + stats.totalNotes + '</span>';
        document.getElementById('resultsPP').textContent = Math.floor(accuracy * 2);
        
        // Update grade display
        const gradeLetter = document.getElementById('gradeLetter');
        const gradeRingColor = document.getElementById('gradeRingColor');
        const gradeRingProgress = document.getElementById('gradeRingProgress');
        
        gradeLetter.textContent = grade;
        gradeLetter.className = 'grade-letter grade-' + grade.toLowerCase();
        gradeRingColor.setAttribute('class', 'grade-ring-color grade-' + grade.toLowerCase());
        
        // Animate the ring (circumference = 2 * PI * r)
        const colorCircumference = 2 * Math.PI * 75; // r=75
        const progressCircumference = 2 * Math.PI * 90; // r=90
        const offset = colorCircumference * (1 - accuracy / 100);
        const progressOffset = progressCircumference * (1 - accuracy / 100);
        
        setTimeout(() => {
            gradeRingColor.style.strokeDashoffset = offset;
            gradeRingProgress.style.strokeDashoffset = progressOffset;
        }, 100);
        
        // Save the record
        saveRecord({
            song: currentSongTitle,
            artist: currentSongArtist,
            diff: currentDiffName,
            stars: currentStars,
            score: stats.score,
            accuracy: accuracy,
            grade: grade,
            maxCombo: stats.maxCombo,
            date: Date.now()
        });
        
        // Refresh records display
        loadRecords();
        
        // Show results screen
        resultsScreen.classList.add('active');
    }

    // Save a game record to localStorage
    function saveRecord(record) {
        let records = JSON.parse(localStorage.getItem('josuRecords') || '[]');
        records.unshift(record); // Add to beginning (most recent first)
        records = records.slice(0, 50); // Keep max 50 records
        localStorage.setItem('josuRecords', JSON.stringify(records));
    }

    // Load and display records in the records panel
    function loadRecords() {
        const recordsList = document.getElementById('recordsList');
        if (!recordsList) return;
        
        const records = JSON.parse(localStorage.getItem('josuRecords') || '[]');
        
        if (records.length === 0) {
            recordsList.innerHTML = '<div class="records-empty">No records yet</div>';
            return;
        }
        
        // Show up to 6 records
        const displayRecords = records.slice(0, 6);
        
        recordsList.innerHTML = displayRecords.map(r => `
            <div class="record-item">
                <div class="record-grade grade-${r.grade.toLowerCase()}">${r.grade}</div>
                <div class="record-info">
                    <div class="record-song">${r.song}</div>
                    <div class="record-diff">${r.diff}</div>
                </div>
                <div style="text-align: right;">
                    <div class="record-score">${r.score.toLocaleString()}</div>
                    <div class="record-accuracy">${r.accuracy.toFixed(2)}%</div>
                </div>
            </div>
        `).join('');
    }

    // Hide results and go back to song select
    function hideResults() {
        resultsScreen.classList.remove('active');
        
        // Reset ring animations
        document.getElementById('gradeRingColor').style.strokeDashoffset = 471.24;
        document.getElementById('gradeRingProgress').style.strokeDashoffset = 565.48;
    }

    function getHitZoneX() {
        const barRect = takioBarEl.getBoundingClientRect();
        const hitRect = hitZone.getBoundingClientRect();
        return hitRect.left - barRect.left;
    }

    function createNoteEl(noteData) {
        const el = document.createElement('div');
        el.className = `taiko-note note-${noteData.key}`;
        el.innerHTML = `
            <div class="note-inner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
            </div>
        `;
        noteTrack.appendChild(el);
        return el;
    }

    function createTimingLine(seconds) {
        const el = document.createElement('div');
        el.className = 'timing-line';
        el.innerHTML = `<span class="timing-label">${seconds}s</span>`;
        noteTrack.appendChild(el);
        return el;
    }

    const songProgressFill = document.getElementById('songProgressFill');

    function taikoGameLoop(timestamp, loopToken) {
        // Check both running flag and loop token to prevent stale loops from continuing
        if (!gameRunning || loopToken !== taikoLoopToken) return;
        if (isPaused) {
            requestAnimationFrame((ts) => taikoGameLoop(ts, loopToken));
            return;
        }

        const elapsed = timestamp - gameStartTime;

        // Update progress bar
        if (songDuration > 0) {
            const pct = Math.min(100, (elapsed / songDuration) * 100);
            songProgressFill.style.width = pct + '%';
        }
        const hitX = getHitZoneX();
        const barWidth = takioBarEl.getBoundingClientRect().width;
        const travelDistance = barWidth - hitX;

        // Spawn timing lines
        while (nextTimingLineSec * TIMING_LINE_INTERVAL - elapsed <= travelTime) {
            const lineTime = nextTimingLineSec * TIMING_LINE_INTERVAL;
            const el = createTimingLine(nextTimingLineSec);
            timingLines.push({ time: lineTime, element: el });
            nextTimingLineSec++;
        }

        // Update timing line positions
        for (let i = timingLines.length - 1; i >= 0; i--) {
            const line = timingLines[i];
            const timeUntilHit = line.time - elapsed;
            const progress = timeUntilHit / travelTime;
            const x = hitX + progress * travelDistance;
            line.element.style.left = x + 'px';

            // Remove lines that have passed off screen
            if (timeUntilHit < -500) {
                line.element.remove();
                timingLines.splice(i, 1);
            }
        }

        // Spawn notes that should now be visible
        while (nextNoteIdx < songNoteData.length) {
            const nd = songNoteData[nextNoteIdx];
            if (nd.time - elapsed <= travelTime) {
                const el = createNoteEl(nd);
                gameNotes.push({
                    key: nd.key,
                    time: nd.time,
                    element: el,
                    state: 'active'
                });
                nextNoteIdx++;
            } else {
                break;
            }
        }

        // Update positions & check misses
        for (const note of gameNotes) {
            if (note.state !== 'active') continue;
            const timeUntilHit = note.time - elapsed;
            const progress = timeUntilHit / travelTime;
            const x = hitX + progress * travelDistance - NOTE_SIZE / 2;
            note.element.style.left = x + 'px';

            if (timeUntilHit < -HIT_WINDOW) {
                triggerMiss(note);
            }
        }

        // Clean up finished notes
        gameNotes = gameNotes.filter(n => n.state !== 'removed');

        // Check if song is over (all notes processed and none active)
        const allNotesProcessed = nextNoteIdx >= songNoteData.length;
        const noActiveNotes = gameNotes.every(n => n.state !== 'active');
        const songTimeElapsed = elapsed >= songDuration + 1000; // Add 1 second buffer
        
        if (allNotesProcessed && noActiveNotes && songTimeElapsed) {
            showResults();
            return;
        }

        requestAnimationFrame((ts) => taikoGameLoop(ts, loopToken));
    }

    function triggerHit(note, timingDiff, signedOffset) {
        note.state = 'animating';
        note.element.classList.add('note-hit');

        // Determine if GREAT or OK based on timing
        const isGreat = timingDiff <= GREAT_WINDOW;
        
        // Update stats
        if (isGreat) {
            stats.great++;
            stats.score += 300 * (1 + stats.combo * 0.1);
        } else {
            stats.ok++;
            stats.score += 100 * (1 + stats.combo * 0.05);
        }
        stats.combo++;
        if (stats.combo > stats.maxCombo) stats.maxCombo = stats.combo;
        stats.score = Math.floor(stats.score);
        updateAccuracyUI();

        addHitErrorTick(signedOffset, HIT_WINDOW);

        // Add hit label (GREAT or OK)
        const label = document.createElement('div');
        label.className = isGreat ? 'great-label' : 'ok-label';
        label.textContent = isGreat ? 'GREAT' : 'OK';
        note.element.appendChild(label);

        // Flash the hit circle
        hitCircle.classList.add('hit-flash');
        setTimeout(() => hitCircle.classList.remove('hit-flash'), 200);

        // Light up the corresponding drum
        const drum = note.key === 'd' ? drumOuter : drumInner;
        drum.classList.add('drum-hit');
        setTimeout(() => drum.classList.remove('drum-hit'), 200);

        setTimeout(() => {
            note.element.remove();
            note.state = 'removed';
        }, 600);
    }

    function triggerMiss(note) {
        note.state = 'animating';
        note.element.classList.add('note-miss');

        // Update stats
        stats.miss++;
        stats.combo = 0;
        updateAccuracyUI();

        // Add MISS label on the note
        const label = document.createElement('div');
        label.className = 'miss-label';
        label.textContent = 'MISS';
        note.element.appendChild(label);

        setTimeout(() => {
            note.element.remove();
            note.state = 'removed';
        }, 600);
    }

    // Key press handler for taiko hits
    document.addEventListener('keydown', (e) => {
        if (!gameRunning || isPaused || currentGameMode === 'updown') return;
        if (e.key !== 'd' && e.key !== 'f') return;
        e.preventDefault();

        const elapsed = performance.now() - gameStartTime;

        // Animate drum press
        const drum = e.key === 'd' ? drumOuter : drumInner;
        drum.classList.add('drum-press');
        setTimeout(() => drum.classList.remove('drum-press'), 100);

        // Find closest matching active note within hit window
        let best = null;
        let bestDiff = Infinity;
        let bestSigned = 0;
        for (const note of gameNotes) {
            if (note.state !== 'active' || note.key !== e.key) continue;
            const diff = Math.abs(note.time - elapsed);
            if (diff < bestDiff && diff <= HIT_WINDOW) {
                bestDiff = diff;
                bestSigned = elapsed - note.time;
                best = note;
            }
        }

        if (best) {
            triggerHit(best, bestDiff, bestSigned);
        }
    });

    // Results screen button handlers
    document.getElementById('resultsRetry').addEventListener('click', () => {
        hideResults();
        // Small delay before restarting to ensure cleanup
        pendingRestartTimeout = setTimeout(() => {
            pendingRestartTimeout = null;
            startTaikoGame();
        }, 100);
    });

    document.getElementById('resultsBack').addEventListener('click', () => {
        hideResults();
        quitGame();
    });

    // ══════════════════════════════════════════════════════════════
    // DEV MODE: SKIP STRAIGHT TO GAME
    // ══════════════════════════════════════════════════════════════
    if (isdevForGame) {
        // Hide start screen
        startScreen.classList.add('dn');
        
        // Set lefwrito background
        const lefwrito = document.querySelector('.lefwrito');
        if (lefwrito && currentSelectedSong.bgImage) {
            lefwrito.style.backgroundImage = `url(${currentSelectedSong.bgImage})`;
        }
        
        // Show game wrapper immediately
        gameWrapper.classList.remove('dn');
        gameWrapper.classList.add('in-game');
        
        // Hide song selection UI
        songsContainer.classList.add('fade-right');
        filterPanel.classList.add('fade-right');
        explainer.classList.add('fade-left');
        background.classList.add('blurred');
        
        // Hide records panel with fade-left animation
        const recordsPanel = document.querySelector('.records-panel');
        if (recordsPanel) recordsPanel.classList.add('fade-left');
        
        // Set game state
        ingame = true;

        // Start game with first available song data and speed
        const devSong = songs[0];
        const devDiff = devSong?.difficulties[0];
        const devSongData = devDiff?.songData;
        const devSpeed = devDiff?.speed || 1.0;
        const devTime = devSong?.time || '0:30';
        const devSongInfo = {
            title: devSong?.title || 'Unknown',
            artist: devSong?.artist || 'Unknown',
            diffName: devDiff?.name || 'Normal',
            stars: devDiff?.stars || 1.0,
            mapper: devDiff?.mapper || 'Unknown'
        };
        startTaikoGame(devSongData, devSpeed, devTime, devSongInfo);
    }

