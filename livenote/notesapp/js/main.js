const newBtn = document.querySelector('.options button:nth-child(1)');
const deleteBtn = document.querySelector('.options button:nth-child(2)');
const noteContent = document.querySelector('.note-content');
const tabs = document.querySelector('.tabs');
const titleEl = noteContent.querySelector('h1');
const contentEl = noteContent.querySelector('.note-body');

const now = new Date().toLocaleString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true
});



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
    return dateB - dateA; // Sort by last typed or created date (descending)
  });

  sortedNotes.forEach(([id, note]) => {
      const today = []
      const yesterday = []
      const lastWeek = []
      const thritydays = []

      // const tab = document.createElement('div');
      // tab.className = 'tab';
      // tab.dataset = id
      // const lastType = note.lastType || note.createdAt;
      // const title = note.title.length > 17 ? note.title.slice(0, 17) + '...' : note.title;
      // const content = note.content.length > 30 ? note.content.slice(0, 30) + '...' : note.content;
      // tab.innerHTML = `<h5>${title}</h5><div class="info"><span class="date">${formatNowDate(lastType)}</span><span>${content}</span></div>`;
      // tab.onclick = () => loadNote(id);
      // tabs.appendChild(tab);
  });
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
