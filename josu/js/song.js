// ══════════════════════════════════════════════════════════════
// JOSU – Song project page logic
// ══════════════════════════════════════════════════════════════

(() => {
    // ── Get song ID from URL ─────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const songId = params.get('id');

    if (!songId) {
        window.location.href = 'dashboard.html';
        return;
    }

    const song = JosuStore.getSong(songId);
    if (!song) {
        alert('Song not found.');
        window.location.href = 'dashboard.html';
        return;
    }

    // ── DOM refs ─────────────────────────────────────────────
    const titleEl       = document.getElementById('songTitle');
    const artistEl      = document.getElementById('songArtist');
    const metaEl        = document.getElementById('songMeta');
    const breadcrumbName = document.getElementById('breadcrumbSongName');
    const grid          = document.getElementById('diffsGrid');
    
    // New Difficulty Modal
    const newDiffModal      = document.getElementById('newDiffModal');
    const diffNameInput     = document.getElementById('newDiffName');
    const diffModeInput     = document.getElementById('newDiffMode');
    const diffBpmInput      = document.getElementById('newDiffBpm');
    const diffStarsInput    = document.getElementById('newDiffStars');
    const diffSpeedInput    = document.getElementById('newDiffSpeed');
    const createBtn         = document.getElementById('createDiffBtn');
    const cancelBtn         = document.getElementById('cancelDiffBtn');
    
    // Edit Difficulty Modal
    const editDiffModal     = document.getElementById('editDiffModal');
    const editDiffNameInput = document.getElementById('editDiffName');
    const editDiffModeInput = document.getElementById('editDiffMode');
    const editDiffBpmInput  = document.getElementById('editDiffBpm');
    const editDiffStarsInput = document.getElementById('editDiffStars');
    const editDiffSpeedInput = document.getElementById('editDiffSpeed');
    const saveDiffBtn       = document.getElementById('saveDiffBtn');
    const cancelEditDiffBtn = document.getElementById('cancelEditDiffBtn');
    
    // Edit Song Modal
    const editSongModal       = document.getElementById('editSongModal');
    const editSongTitleInput  = document.getElementById('editSongTitle');
    const editSongArtistInput = document.getElementById('editSongArtist');
    const editSongImageInput  = document.getElementById('editSongImage');
    const editSongGifInput    = document.getElementById('editSongGif');
    const editSongAudioInput  = document.getElementById('editSongAudio');
    const editSongAudioCorrectionInput = document.getElementById('editSongAudioCorrection');
    const saveSongBtn         = document.getElementById('saveSongBtn');
    const cancelEditSongBtn   = document.getElementById('cancelEditSongBtn');
    
    const editTitleBtn  = document.getElementById('editSongBtn');
    const deleteSongBtn = document.getElementById('deleteSongBtn');
    const publishBtn    = document.getElementById('publishBtn');
    const uploadLibraryBtn = document.getElementById('uploadLibraryBtn');
    
    let currentEditingDiffId = null;

    // ── Populate header ──────────────────────────────────────
    function renderHeader() {
        const s = JosuStore.getSong(songId);
        titleEl.textContent = s.title;
        artistEl.textContent = s.artist || 'No artist';
        
        // Set background image if available
        const songHeader = document.querySelector('.song-header');
        if (s.coverImage && songHeader) {
            songHeader.style.backgroundImage = `url('${s.coverImage}')`;
        }
        breadcrumbName.textContent = s.title;
        document.title = `${s.title} – Josu`;

        const diffs = JosuStore.getDifficulties(songId);
        const totalNotes = diffs.reduce((sum, d) => sum + (d.notes ? d.notes.length : 0), 0);
        const created = new Date(s.createdAt).toLocaleDateString();
        metaEl.innerHTML = `
            <span>${diffs.length} difficult${diffs.length !== 1 ? 'ies' : 'y'}</span>
            <span>${totalNotes} total notes</span>
            <span>Created ${created}</span>
        `;
    }

    // ── Render difficulties ──────────────────────────────────
    function renderDiffs() {
        const diffs = JosuStore.getDifficulties(songId);

        let html = '';

        // "New Difficulty" card
        html += `
        <div class="card new-card" id="newDiffCard">
            <div class="plus-icon">+</div>
            <span>New Difficulty</span>
        </div>`;

        diffs.forEach(diff => {
            const noteCount = diff.notes ? diff.notes.length : 0;
            const updated = new Date(diff.updatedAt).toLocaleDateString();
            const modeLabel = diff.mode === 'taiko' ? 'Taiko' : 'Arrow';
            const stars = diff.stars != null ? diff.stars.toFixed(2) + '★' : 'N/A';
            const speed = diff.speed != null ? diff.speed + '×' : '1.0×';

            html += `
            <div class="card diff-card" data-id="${diff.id}">
                <div class="card-actions">
                    <button class="edit-diff-btn" data-id="${diff.id}" title="Edit difficulty">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>
                        </svg>
                    </button>
                    <button class="delete-diff-btn" data-id="${diff.id}" title="Delete difficulty">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
                <div class="card-title">${escapeHtml(diff.name)}</div>
                <div class="card-meta">
                    <span class="tag">${modeLabel}</span>
                    <span>${diff.bpm} BPM</span>
                    <span>${stars}</span>
                    <span>${speed}</span>
                    <span>${noteCount} notes</span>
                    <span>Updated ${updated}</span>
                </div>
            </div>`;
        });

        grid.innerHTML = html;
        bindDiffEvents();
    }

    // ── Bind events ──────────────────────────────────────────
    function bindDiffEvents() {
        // New Difficulty card
        const newCard = document.getElementById('newDiffCard');
        if (newCard) newCard.addEventListener('click', openModal);

        // Diff cards → navigate to editor
        document.querySelectorAll('.diff-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.delete-diff-btn')) return;
                if (e.target.closest('.edit-diff-btn')) return;
                window.location.href = `editor.html?songId=${songId}&diffId=${card.dataset.id}`;
            });
        });

        // Edit buttons
        document.querySelectorAll('.edit-diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const diff = JosuStore.getDifficulty(songId, id);
                if (!diff) return;
                
                openEditDiffModal(id, diff);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const diff = JosuStore.getDifficulty(songId, id);
                if (diff && confirm(`Delete "${diff.name}" difficulty?`)) {
                    JosuStore.deleteDifficulty(songId, id);
                    renderDiffs();
                    renderHeader();
                }
            });
        });
    }

    // ── New Difficulty Modal ─────────────────────────────────
    function openModal() {
        diffNameInput.value = '';
        diffModeInput.value = 'taiko';
        diffBpmInput.value = '120';
        diffStarsInput.value = '1.0';
        diffSpeedInput.value = '1.0';
        newDiffModal.classList.add('active');
        setTimeout(() => diffNameInput.focus(), 100);
    }

    function closeModal() {
        newDiffModal.classList.remove('active');
    }
    
    // ── Edit Difficulty Modal ────────────────────────────────
    function openEditDiffModal(diffId, diff) {
        currentEditingDiffId = diffId;
        editDiffNameInput.value = diff.name;
        editDiffModeInput.value = diff.mode || 'taiko';
        editDiffBpmInput.value = diff.bpm || 120;
        editDiffStarsInput.value = diff.stars != null ? diff.stars : 1.0;
        editDiffSpeedInput.value = diff.speed != null ? diff.speed : 1.0;
        editDiffModal.classList.add('active');
        setTimeout(() => editDiffNameInput.focus(), 100);
    }
    
    function closeEditDiffModal() {
        editDiffModal.classList.remove('active');
        currentEditingDiffId = null;
    }
    
    // ── Edit Song Modal ──────────────────────────────────────
    function openEditSongModal() {
        const s = JosuStore.getSong(songId);
        editSongTitleInput.value  = s.title;
        editSongArtistInput.value = s.artist || '';
        editSongImageInput.value  = s.coverImage || '';
        editSongGifInput.value    = s.inGameGif || '';
        editSongAudioInput.value  = s.audio || '';
        editSongAudioCorrectionInput.value = s.audioCorrection || 0;
        editSongModal.classList.add('active');
        setTimeout(() => editSongTitleInput.focus(), 100);
    }
    
    function closeEditSongModal() {
        editSongModal.classList.remove('active');
    }

    createBtn.addEventListener('click', () => {
        const name = diffNameInput.value.trim();
        if (!name) {
            diffNameInput.style.borderColor = '#e94560';
            diffNameInput.focus();
            return;
        }
        const diff = JosuStore.createDifficulty(songId, {
            name,
            mode: diffModeInput.value,
            bpm: parseInt(diffBpmInput.value) || 120,
            stars: parseFloat(diffStarsInput.value) || 1.0,
            speed: parseFloat(diffSpeedInput.value) || 1.0
        });
        closeModal();
        // Open editor immediately
        window.location.href = `editor.html?songId=${songId}&diffId=${diff.id}`;
    });

    cancelBtn.addEventListener('click', closeModal);

    newDiffModal.addEventListener('click', (e) => {
        if (e.target === newDiffModal) closeModal();
    });

    diffNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createBtn.click();
    });
    
    // ── Edit Difficulty Modal Events ─────────────────────────
    saveDiffBtn.addEventListener('click', () => {
        const name = editDiffNameInput.value.trim();
        if (!name) {
            editDiffNameInput.style.borderColor = '#e94560';
            editDiffNameInput.focus();
            return;
        }
        
        JosuStore.updateDifficulty(songId, currentEditingDiffId, {
            name,
            mode: editDiffModeInput.value,
            bpm: parseFloat(editDiffBpmInput.value) || 120,
            stars: parseFloat(editDiffStarsInput.value) || 1.0,
            speed: parseFloat(editDiffSpeedInput.value) || 1.0
        });
        
        closeEditDiffModal();
        renderDiffs();
        renderHeader();
    });
    
    cancelEditDiffBtn.addEventListener('click', closeEditDiffModal);
    
    editDiffModal.addEventListener('click', (e) => {
        if (e.target === editDiffModal) closeEditDiffModal();
    });
    
    // ── Edit Song Modal Events ───────────────────────────────
    saveSongBtn.addEventListener('click', () => {
        const title = editSongTitleInput.value.trim();
        if (!title) {
            editSongTitleInput.style.borderColor = '#e94560';
            editSongTitleInput.focus();
            return;
        }
        
        JosuStore.updateSong(songId, {
            title,
            artist: editSongArtistInput.value.trim(),
            coverImage: editSongImageInput.value.trim(),
            inGameGif: editSongGifInput.value.trim(),
            audio: editSongAudioInput.value.trim(),
            audioCorrection: parseInt(editSongAudioCorrectionInput.value) || 0
        });
        
        closeEditSongModal();
        renderHeader();
    });
    
    cancelEditSongBtn.addEventListener('click', closeEditSongModal);
    
    editSongModal.addEventListener('click', (e) => {
        if (e.target === editSongModal) closeEditSongModal();
    });

    // ── Song actions ─────────────────────────────────────────
    editTitleBtn.addEventListener('click', openEditSongModal);

    deleteSongBtn.addEventListener('click', () => {
        const s = JosuStore.getSong(songId);
        if (confirm(`Delete "${s.title}" and all its difficulties? This cannot be undone.`)) {
            JosuStore.deleteSong(songId);
            JosuStore.unpublishFromBrowse(songId);
            JosuStore.removeFromLocalLibrary(songId);
            window.location.href = 'dashboard.html';
        }
    });

    // ── Upload to Library ────────────────────────────────────
    function updateUploadLibraryBtn() {
        const inLibrary = JosuStore.isInLocalLibrary(songId);
        if (inLibrary) {
            uploadLibraryBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                In Library`;
            uploadLibraryBtn.style.background = '#27ae60';
        } else {
            uploadLibraryBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload to Library`;
            uploadLibraryBtn.style.background = '#9b59b6';
        }
    }

    uploadLibraryBtn.addEventListener('click', () => {
        if (JosuStore.isInLocalLibrary(songId)) {
            if (confirm('Remove this song from your local library?')) {
                JosuStore.removeFromLocalLibrary(songId);
                updateUploadLibraryBtn();
            }
        } else {
            JosuStore.uploadToLocalLibrary(songId);
            updateUploadLibraryBtn();
        }
    });

    updateUploadLibraryBtn();

    // ── Publish / Unpublish ──────────────────────────────────
    function updatePublishBtn() {
        const published = JosuStore.isPublished(songId);
        if (published) {
            publishBtn.textContent = 'Unpublish';
            publishBtn.classList.remove('primary');
            publishBtn.classList.add('danger');
        } else {
            publishBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Publish to Browse`;
            publishBtn.classList.add('primary');
            publishBtn.classList.remove('danger');
        }
    }

    publishBtn.addEventListener('click', () => {
        if (JosuStore.isPublished(songId)) {
            JosuStore.unpublishFromBrowse(songId);
        } else {
            JosuStore.publishToBrowse(songId);
        }
        updatePublishBtn();
    });

    updatePublishBtn();
    
    // ── Escape key handler ───────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (editDiffModal.classList.contains('active')) {
                closeEditDiffModal();
            } else if (editSongModal.classList.contains('active')) {
                closeEditSongModal();
            } else if (newDiffModal.classList.contains('active')) {
                closeModal();
            }
        }
    });

    // ── Utilities ────────────────────────────────────────────
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Init ─────────────────────────────────────────────────
    renderHeader();
    renderDiffs();
})();
