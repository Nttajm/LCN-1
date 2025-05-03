const newBtn = document.querySelector('.options button:nth-child(1)');
const deleteBtn = document.querySelector('.options button:nth-child(2)');
const noteContent = document.querySelector('.note-content');
const tabs = document.querySelector('.tabs');
const titleEl = noteContent.querySelector('h1');
const contentEl = noteContent.querySelector('.note-body');
const userData = localStorage.getItem('livenote-UD') ? JSON.parse(localStorage.getItem('livenote-UD')) : {
  folders: [],
};



const now = new Date().toLocaleString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true
});

const folderCreator = document.querySelector('.folder-creator');
folderCreator.addEventListener('click', () => {
  const folderInput = document.querySelector('#js-new-folder');

  folderInput.classList.toggle('hidden');

  if (folderInput.classList.contains('hidden')) {
    folderCreator.innerHTML = 'New Folder';
  } else {
    folderCreator.innerHTML = 'Close';
  }

  folderInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      folderCreator.innerHTML = 'New Folder';
      folderInput.classList.toggle('hidden');

      const folderName = folderInput.value.trim();
      userData.folders.push(folderName);
      saveNotes();
    }
  }
  );
});

localStorage.clear();
function formatNowDate(timestamp) {
  const now = new Date();
  const date = new Date(Number(timestamp));

  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);

  if (date > oneWeekAgo) {
    let str = date.toLocaleString('en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase().replace(',', '');

    return str.charAt(0).toUpperCase() + str.slice(1); // Capitalize first letter
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    });
  }
}






let notes = JSON.parse(localStorage.getItem('notes')) || {};
let currentNoteId = null;

// Save all notes
function saveNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
  localStorage.setItem('livenote-UD', JSON.stringify(userData));
}

// Create new note and switch to it
function createNote() {
  const id = Date.now().toString();
  notes[id] = {
    title: 'New Note',
    content: 'Start typing...',
    createdAt: id,
  };
  currentNoteId = id;
  saveNotes();
  renderTabs();
  loadNote(id);
}


// Update note content in memory and save
function updateNote() {
  if (!currentNoteId) return;
  notes[currentNoteId] = {
    title: titleEl.innerText,
    content: contentEl.innerText,
    lastType: Date.now().toString(),
  };
  saveNotes();
  renderTabs(); // update tab title too
  updateDate();
}


// Load note into content area
function loadNote(id) {
  const note = notes[id];
  if (!note) return;
  titleEl.contentEditable = true;
  contentEl.contentEditable = true;
  titleEl.innerText = note.title;
  contentEl.innerText = note.content;
  currentNoteId = id;
  updateDate();
}

// Render all tabs
function renderTabs() {
  tabs.innerHTML = '';

  const sortedNotes = Object.entries(notes).sort(([, a], [, b]) => {
    const dateA = a.lastType || a.createdAt;
    const dateB = b.lastType || b.createdAt;
    return dateB - dateA; // descending
  });

  // Group arrays outside the loop
  const today = [];
  const yesterday = [];
  const lastWeek = [];
  const thirtyDays = [];

  const todayDate = new Date();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(todayDate.getDate() - 1);
  const lastWeekDate = new Date();
  lastWeekDate.setDate(todayDate.getDate() - 7);
  const thirtyDaysDate = new Date();
  thirtyDaysDate.setDate(todayDate.getDate() - 30);

  // Categorize each note
  sortedNotes.forEach(([id, note]) => {
    const lastType = note.lastType || note.createdAt;
    const noteDate = new Date(Number(lastType));

    if (noteDate.toDateString() === todayDate.toDateString()) {
      today.push([id, note]);
    } else if (noteDate.toDateString() === yesterdayDate.toDateString()) {
      yesterday.push([id, note]);
    } else if (noteDate >= lastWeekDate) {
      lastWeek.push([id, note]);
    } else if (noteDate >= thirtyDaysDate) {
      thirtyDays.push([id, note]);
    }
  });

  // Helper to render a section
  function renderSection(title, group) {
    if (group.length === 0) return;

    const section = document.createElement('div');
    section.className = 'tab-group';
    section.innerHTML = `<h2 class='tab-time'>${title}</h2>`;

    group.forEach(([id, note]) => {
      const tab = document.createElement('div');
      tab.className = 'tab';
      tab.dataset.id = id;

      const shortTitle = note.title.length > 17 ? note.title.slice(0, 17) + '...' : note.title;
      const shortContent = note.content.length > 30 ? note.content.slice(0, 30) + '...' : note.content;

      const lastType = note.lastType || note.createdAt;

      tab.innerHTML = `
        <h4>${shortTitle}</h4>
        <div class="info">
        <span >${shortContent}</span>
          <span class="date">${formatNowDate(lastType)}</span>
        </div>
        ${renderFolders()}
      `;

      tab.onclick = () => loadNote(id);
      section.appendChild(tab);
    });

    tabs.appendChild(section);
  }
  // Render all grouped sections
  renderSection('Today', today);
  renderSection('Yesterday', yesterday);
  renderSection('Last week', lastWeek);
  renderSection('30 Days', thirtyDays);
}



function renderFolders(id) {
  if (!Array.isArray(userData.folders)) {
    console.error('userData.folders is not an array');
    return `<select data-select-id='${id}'><option value="default">Notes</option></select>`;
  }

  const defultselect = `<option value="notes" }>notes</option>`
  const folderNames = userData.folders.map(folder => {
    return defultselect + `<option value="${folder}" ${folder === 'notes' ? 'selected' : ''}>${folder}</option>`;
  }).join('');

  return `<select data-select-id='${id}'>${folderNames}</select>`;
}

// Delete current note
function deleteNote() {
  if (!currentNoteId) return;
  delete notes[currentNoteId];
  saveNotes();
  const remainingIds = Object.keys(notes);
  if (remainingIds.length > 0) {
    loadNote(remainingIds[0]);
  } else {
    titleEl.innerText = '';
    contentEl.innerText = '';
    currentNoteId = null;
  }
  renderTabs();
}

function updateDate() {
  const dateEl = noteContent.querySelector('.date');
  const lastType = notes[currentNoteId]?.lastType || notes[currentNoteId]?.createdAt || now;
  dateEl.innerText = `Last saved: ${formatNowDate(lastType)}`;
}

// Event listeners
titleEl.addEventListener('input', updateNote);
contentEl.addEventListener('input', updateNote);
newBtn.addEventListener('click', createNote);
deleteBtn.addEventListener('click', deleteNote);

// Load first note or create one
if (Object.keys(notes).length > 0) {
  const firstId = Object.keys(notes)[0];
  renderTabs();
  loadNote(firstId);
} else {
  createNote();
}

contentEl.addEventListener('keydown', (e) => {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  updateNote();

  const range = sel.getRangeAt(0);
  const container = range.startContainer;

  if (e.key === ' ' && container.nodeType === 3) {
    const text = container.textContent.trim();

    // If user types "- " and hits space
    if (text === '-') {
      e.preventDefault();
      container.textContent = '• ';
      placeCaretAtEnd(container);
    }

    // If line is just "•", and they hit space again -> exit bullet mode
    if (text === '•') {
      e.preventDefault();
      const parent = container.parentElement;
      container.textContent = ''; // clear the bullet
      placeCaretAtEnd(container);
    }
  }

  // On enter: add new bullet if line starts with bullet
  if (e.key === 'Enter') {
    const text = container.textContent.trim();
    if (text.startsWith('•')) {
      e.preventDefault();
      const newLine = document.createElement('div');
      newLine.innerHTML = '• ';
      newLine.contentEditable = true;

      if (container.nodeType === 3) {
        const parent = container;
        parent.insertAdjacentElement('afterend', newLine);
        placeCaretAtEnd(newLine);
      } else {
        container.insertAdjacentElement('afterend', newLine);
        placeCaretAtEnd(newLine);
      }
    }
  }
});

// Helper to place cursor at the end
function placeCaretAtEnd(el) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}
