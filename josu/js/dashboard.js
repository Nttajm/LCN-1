// ══════════════════════════════════════════════════════════════
// JOSU – Dashboard logic
// ══════════════════════════════════════════════════════════════

(() => {
    // ── DOM refs ─────────────────────────────────────────────
    const grid        = document.getElementById('songsGrid');
    const modal       = document.getElementById('newSongModal');
    const titleInput  = document.getElementById('newSongTitle');
    const artistInput = document.getElementById('newSongArtist');
    const imageInput  = document.getElementById('newSongImage');
    const gifInput    = document.getElementById('newSongGif');
    const audioFileInput = document.getElementById('newSongAudioFile');
    const chooseNewAudioBtn = document.getElementById('chooseNewAudioBtn');
    const newAudioFileName = document.getElementById('newAudioFileName');
    const audioCorrectionInput = document.getElementById('newSongAudioCorrection');
    const createBtn   = document.getElementById('createSongBtn');
    const cancelBtn   = document.getElementById('cancelSongBtn');

    let pendingAudioFile = null;

    // ── Run migration once ───────────────────────────────────
    JosuStore.migrateOldProject();

    // ── Render ───────────────────────────────────────────────
    function render() {
        const songs = JosuStore.getSongs();

        let html = '';

        // "New Song" card always first
        html += `
        <div class="card new-card" id="newSongCard">
            <div class="plus-icon">+</div>
            <span>New Song Project</span>
        </div>`;

        songs.forEach(song => {
            const diffs = JosuStore.getDifficulties(song.id);
            const totalNotes = diffs.reduce((sum, d) => sum + ((d.songData || d.notes) ? (d.songData || d.notes).length : 0), 0);
            const updated = new Date(song.updatedAt).toLocaleDateString();
            const bgImage = song.coverImage ? `style="background-image: url('${escapeHtml(song.coverImage)}');"` : '';

            html += `
            <div class="card song-card" data-id="${song.id}" ${bgImage}>
                <div class="card-actions">
                    <button class="delete-song-btn" data-id="${song.id}" title="Delete song">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
                <div class="card-title">${escapeHtml(song.title)}</div>
                <div class="card-subtitle">${escapeHtml(song.artist || 'No artist')}</div>
                <div class="card-meta">
                    <span class="tag">${diffs.length} difficult${diffs.length !== 1 ? 'ies' : 'y'}</span>
                    <span>${totalNotes} notes</span>
                    <span>Updated ${updated}</span>
                </div>
            </div>`;
        });

        grid.innerHTML = html;
        bindCardEvents();
    }

    // ── Events ───────────────────────────────────────────────
    function bindCardEvents() {
        // New Song card
        const newCard = document.getElementById('newSongCard');
        if (newCard) newCard.addEventListener('click', openModal);

        // Song cards → navigate to song page
        document.querySelectorAll('.song-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.delete-song-btn')) return;
                window.location.href = `song.html?id=${card.dataset.id}`;
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-song-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const song = JosuStore.getSong(id);
                if (song && confirm(`Delete "${song.title}" and all its difficulties?`)) {
                    JosuStore.deleteSong(id);
                    render();
                }
            });
        });
    }

    // ── Modal ────────────────────────────────────────────────
    function openModal() {
        titleInput.value = '';
        artistInput.value = '';
        imageInput.value = '';
        gifInput.value = '';
        audioFileInput.value = '';
        newAudioFileName.textContent = 'No file chosen';
        pendingAudioFile = null;
        audioCorrectionInput.value = '0';
        modal.classList.add('active');
        setTimeout(() => titleInput.focus(), 100);
    }

    function closeModal() {
        modal.classList.remove('active');
    }

    createBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        if (!title) {
            titleInput.style.borderColor = '#e94560';
            titleInput.focus();
            return;
        }
        const song = JosuStore.createSong({
            title,
            artist: artistInput.value.trim(),
            coverImage: imageInput.value.trim(),
            inGameGif: gifInput.value.trim(),
            audio: pendingAudioFile ? 'indexeddb' : '',
            audioCorrection: parseInt(audioCorrectionInput.value) || 0
        });
        // Store audio blob in IndexedDB if a file was selected
        if (pendingAudioFile) {
            try {
                await JosuAudioStore.saveAudio(song.id, pendingAudioFile);
            } catch (e) {
                console.error('Error saving audio to IndexedDB:', e);
            }
        }
        closeModal();
        // Navigate directly to the song page
        window.location.href = `song.html?id=${song.id}`;
    });

    cancelBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Allow Enter to submit
    titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createBtn.click();
    });
    artistInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createBtn.click();
    });
    imageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createBtn.click();
    });
    gifInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createBtn.click();
    });
    audioCorrectionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createBtn.click();
    });

    // Audio file chooser
    chooseNewAudioBtn.addEventListener('click', () => audioFileInput.click());
    audioFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            pendingAudioFile = file;
            newAudioFileName.textContent = file.name;
        }
    });

    // ── Utilities ────────────────────────────────────────────
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Init ─────────────────────────────────────────────────
    render();
})();
