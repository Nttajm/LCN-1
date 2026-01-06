/**
 * ==========================================================================
 * CASCADE - Block Creators
 * ==========================================================================
 * Functions to create different block types (text, checklist, callout, etc.)
 * Uses contenteditable divs instead of inputs for better flexibility.
 */

import { generateId, createElement, focusAtEnd, normalizeUrl } from './utils.js';
import { state } from './app.js';

// ==========================================================================
// BLOCK FACTORY
// ==========================================================================

/**
 * Create a row container for blocks
 */
export function createRow(blockId) {
  const rowId = generateId('row');
  
  const row = createElement('div', {
    className: 'item-row',
    id: rowId,
    data: { rowId }
  });
  
  // Add row floaty (add button)
  const floaty = createRowFloaty(rowId);
  row.appendChild(floaty);
  
  return row;
}

/**
 * Create row floaty (add button on left)
 */
function createRowFloaty(rowId) {
  const floaty = createElement('div', {
    className: 'floaty',
    html: `
      <button class="floaty__btn js-add-block-row" data-row-id="${rowId}" type="button">
        <img src="icons/add.png" alt="Add">
      </button>
    `
  });
  return floaty;
}

/**
 * Create block floaty (edit button)
 */
function createBlockFloaty(blockId, type = 'text') {
  const floaty = createElement('div', {
    className: 'floaty',
    html: `
      <button class="floaty__btn js-block-menu" data-block-id="${blockId}" data-block-type="${type}" type="button">
        <img src="icons/edit.png" alt="Edit">
      </button>
    `
  });
  return floaty;
}

// ==========================================================================
// TEXT BLOCK
// ==========================================================================

/**
 * Create a text block
 */
export function createTextBlock(options = {}) {
  const {
    type = 'text',
    content = '',
    placeholder = 'Type something...',
    classes = []
  } = options;
  
  const blockId = generateId('block');
  
  // Block container
  const block = createElement('div', {
    className: 'item',
    data: { blockId, blockType: 'text' }
  });
  
  // Floaty edit button
  const floaty = createBlockFloaty(blockId, 'text');
  
  // Content (contenteditable div)
  const contentDiv = createElement('div', {
    className: `item__content item__content--${type} ${classes.join(' ')}`.trim(),
    attrs: {
      contenteditable: 'true',
      'data-placeholder': placeholder
    },
    data: { blockId }
  });
  contentDiv.textContent = content;
  
  block.appendChild(floaty);
  block.appendChild(contentDiv);
  
  // Check if we should add to an existing row or create a new one
  if (state.targetRow) {
    // Add to existing row
    const targetRow = document.getElementById(state.targetRow);
    if (targetRow) {
      targetRow.appendChild(block);
      state.targetRow = null; // Reset after use
    } else {
      // Fallback: create new row
      const row = state.printMode === 'board' ? createRow(blockId) : null;
      if (row) {
        row.appendChild(block);
        appendToBoard(row);
      } else {
        appendToBoard(block);
      }
    }
  } else {
    // Normal behavior: create new row or append directly
    const row = state.printMode === 'board' ? createRow(blockId) : null;
    if (row) {
      row.appendChild(block);
      appendToBoard(row);
    } else {
      appendToBoard(block);
    }
  }
  
  // Focus the new block
  setTimeout(() => focusAtEnd(contentDiv), 10);
  
  return block;
}

// ==========================================================================
// CHECKLIST BLOCK
// ==========================================================================

/**
 * Create a checklist block
 */
export function createChecklistBlock(options = {}) {
  const { content = '', checked = false } = options;
  
  const blockId = generateId('block');
  
  // Block container
  const block = createElement('div', {
    className: 'item',
    data: { blockId, blockType: 'checklist' }
  });
  
  // Floaty
  const floaty = createBlockFloaty(blockId, 'checklist');
  
  // Checklist wrapper
  const checklist = createElement('div', {
    className: `checklist ${checked ? 'is-checked' : ''}`
  });
  
  // Checkbox
  const checkbox = createElement('input', {
    className: 'checklist__checkbox',
    attrs: { type: 'checkbox' }
  });
  checkbox.checked = checked;
  
  // Content
  const contentDiv = createElement('div', {
    className: 'item__content checklist__text',
    attrs: {
      contenteditable: 'true',
      'data-placeholder': 'To-do...'
    },
    data: { blockId }
  });
  contentDiv.textContent = content;
  
  // Toggle strike on check
  checkbox.addEventListener('change', () => {
    checklist.classList.toggle('is-checked', checkbox.checked);
  });
  
  checklist.appendChild(checkbox);
  checklist.appendChild(contentDiv);
  
  block.appendChild(floaty);
  block.appendChild(checklist);
  
  // Check if we should add to an existing row or create a new one
  if (state.targetRow) {
    const targetRow = document.getElementById(state.targetRow);
    if (targetRow) {
      targetRow.appendChild(block);
      state.targetRow = null;
    } else {
      const row = state.printMode === 'board' ? createRow(blockId) : null;
      if (row) {
        row.appendChild(block);
        appendToBoard(row);
      } else {
        appendToBoard(block);
      }
    }
  } else {
    const row = state.printMode === 'board' ? createRow(blockId) : null;
    if (row) {
      row.appendChild(block);
      appendToBoard(row);
    } else {
      appendToBoard(block);
    }
  }
  
  setTimeout(() => focusAtEnd(contentDiv), 10);
  
  return block;
}

// ==========================================================================
// CALLOUT BLOCK
// ==========================================================================

/**
 * Create a callout block
 */
export function createCalloutBlock(options = {}) {
  const { content = '', icon = '💡', color = 'yellow' } = options;
  
  const blockId = generateId('block');
  const row = state.printMode === 'board' ? createRow(blockId) : null;
  
  // Block container
  const block = createElement('div', {
    className: 'item',
    data: { blockId, blockType: 'callout' }
  });
  
  // Floaty
  const floaty = createBlockFloaty(blockId, 'callout');
  
  // Callout wrapper
  const callout = createElement('div', {
    className: `callout callout--${color}`
  });
  
  // Icon
  const iconEl = createElement('div', {
    className: 'callout__icon',
    text: icon
  });
  
  // Content
  const contentDiv = createElement('div', {
    className: 'item__content callout__content',
    attrs: {
      contenteditable: 'true',
      'data-placeholder': 'Type something...'
    },
    data: { blockId }
  });
  contentDiv.textContent = content;
  
  callout.appendChild(iconEl);
  callout.appendChild(contentDiv);
  
  block.appendChild(floaty);
  block.appendChild(callout);
  
  // Check if we should add to an existing row or create a new one
  if (state.targetRow) {
    const targetRow = document.getElementById(state.targetRow);
    if (targetRow) {
      targetRow.appendChild(block);
      state.targetRow = null;
    } else {
      const row = state.printMode === 'board' ? createRow(blockId) : null;
      if (row) {
        row.appendChild(block);
        appendToBoard(row);
      } else {
        appendToBoard(block);
      }
    }
  } else {
    const row = state.printMode === 'board' ? createRow(blockId) : null;
    if (row) {
      row.appendChild(block);
      appendToBoard(row);
    } else {
      appendToBoard(block);
    }
  }
  
  setTimeout(() => focusAtEnd(contentDiv), 10);
  
  return block;
}

// ==========================================================================
// QUOTE BLOCK
// ==========================================================================

/**
 * Create a quote block
 */
export function createQuoteBlock(options = {}) {
  const { content = '' } = options;
  
  const blockId = generateId('block');
  
  // Block container
  const block = createElement('div', {
    className: 'item',
    data: { blockId, blockType: 'quote' }
  });
  
  // Floaty
  const floaty = createBlockFloaty(blockId, 'quote');
  
  // Quote wrapper
  const quote = createElement('div', {
    className: 'quote-block'
  });
  
  // Border accent
  const border = createElement('div', {
    className: 'quote-block__border'
  });
  
  // Content
  const contentDiv = createElement('div', {
    className: 'item__content quote-block__content',
    attrs: {
      contenteditable: 'true',
      'data-placeholder': 'Empty quote'
    },
    data: { blockId }
  });
  contentDiv.textContent = content;
  
  quote.appendChild(border);
  quote.appendChild(contentDiv);
  
  block.appendChild(floaty);
  block.appendChild(quote);
  
  // Check if we should add to an existing row or create a new one
  if (state.targetRow) {
    const targetRow = document.getElementById(state.targetRow);
    if (targetRow) {
      targetRow.appendChild(block);
      state.targetRow = null;
    } else {
      const row = state.printMode === 'board' ? createRow(blockId) : null;
      if (row) {
        row.appendChild(block);
        appendToBoard(row);
      } else {
        appendToBoard(block);
      }
    }
  } else {
    const row = state.printMode === 'board' ? createRow(blockId) : null;
    if (row) {
      row.appendChild(block);
      appendToBoard(row);
    } else {
      appendToBoard(block);
    }
  }
  
  setTimeout(() => focusAtEnd(contentDiv), 10);
  
  return block;
}

// ==========================================================================
// SEPARATOR BLOCK
// ==========================================================================

/**
 * Create a separator/divider block
 */
export function createSeparatorBlock() {
  const blockId = generateId('block');
  const row = state.printMode === 'board' ? createRow(blockId) : null;
  
  const block = createElement('div', {
    className: 'item',
    data: { blockId, blockType: 'separator' }
  });
  
  const floaty = createBlockFloaty(blockId, 'separator');
  const separator = createElement('div', { className: 'separator' });
  
  block.appendChild(floaty);
  block.appendChild(separator);
  
  // Check if we should add to an existing row or create a new one
  if (state.targetRow) {
    const targetRow = document.getElementById(state.targetRow);
    if (targetRow) {
      targetRow.appendChild(block);
      state.targetRow = null;
    } else {
      const row = state.printMode === 'board' ? createRow(blockId) : null;
      if (row) {
        row.appendChild(block);
        appendToBoard(row);
      } else {
        appendToBoard(block);
      }
    }
  } else {
    const row = state.printMode === 'board' ? createRow(blockId) : null;
    if (row) {
      row.appendChild(block);
      appendToBoard(row);
    } else {
      appendToBoard(block);
    }
  }
  
  return block;
}

// ==========================================================================
// GOOGLE CALENDAR BLOCK
// ==========================================================================

/**
 * Create a Google Calendar embed block
 * Users can embed their public Google Calendar using the calendar ID or embed URL
 */
export function createGCalBlock(options = {}) {
  const { calendarId = '', title = 'Google Calendar', mode = 'MONTH' } = options;
  
  const blockId = generateId('block');
  const row = state.printMode === 'board' ? createRow(blockId) : null;
  
  const block = createElement('div', {
    className: 'item gcal-block',
    data: { blockId, blockType: 'gcal', calendarId }
  });
  
  // Block floaty
  const floaty = createBlockFloaty(blockId, 'gcal');
  
  // Calendar wrapper
  const wrapper = createElement('div', {
    className: 'gcal-block__wrapper'
  });
  
  // Header with title
  const header = createElement('div', {
    className: 'gcal-block__header'
  });
  
  const iconEl = createElement('span', {
    className: 'gcal-block__icon',
    html: '<img src="appicons/gcal.png" alt="Google Calendar" class="icon icon--sm">'
  });
  
  const titleEl = createElement('div', {
    className: 'gcal-block__title',
    attrs: {
      contenteditable: 'true',
      'data-placeholder': 'Calendar title...'
    },
    data: { blockId }
  });
  titleEl.textContent = title;
  
  const menuBtn = createElement('button', {
    className: 'gcal-block__menu-btn js-block-menu',
    attrs: { type: 'button', 'data-block-id': blockId, 'data-block-type': 'gcal' },
    html: '⋯'
  });
  
  header.appendChild(iconEl);
  header.appendChild(titleEl);
  header.appendChild(menuBtn);
  
  // Calendar content (iframe or setup prompt)
  const content = createElement('div', {
    className: 'gcal-block__content'
  });
  
  if (calendarId) {
    // Render the calendar iframe
    const iframe = createGCalIframe(calendarId, mode);
    content.appendChild(iframe);
    
    // Add mode switcher below the calendar
    const modeSwitcher = createModeSwitcher(block, calendarId, mode);
    content.appendChild(modeSwitcher);
  } else {
    // Show setup prompt
    const setup = createElement('div', {
      className: 'gcal-block__setup'
    });
    
    const instructions = createElement('div', {
      className: 'gcal-block__instructions',
      html: `
        <p><strong>Connect your Google Calendar</strong></p>
        <p class="text-secondary text-sm">Enter your calendar ID or the full embed URL from Google Calendar settings.</p>
      `
    });
    
    const inputWrapper = createElement('div', {
      className: 'gcal-block__input-wrapper'
    });
    
    const input = createElement('input', {
      className: 'gcal-block__input input',
      attrs: {
        type: 'text',
        placeholder: 'Calendar ID or embed URL (e.g., your@email.com or full iframe URL)'
      }
    });
    
    const connectBtn = createElement('button', {
      className: 'btn btn--primary',
      text: 'Connect',
      attrs: { type: 'button' }
    });
    
    // Mode selector
    const modeWrapper = createElement('div', {
      className: 'gcal-block__mode-wrapper'
    });
    
    const modeLabel = createElement('span', {
      className: 'text-sm text-secondary',
      text: 'View: '
    });
    
    const modeSelect = createElement('select', {
      className: 'gcal-block__mode-select input',
      html: `
        <option value="MONTH">Month</option>
        <option value="WEEK">Week</option>
        <option value="AGENDA">Agenda</option>
      `
    });
    
    modeWrapper.appendChild(modeLabel);
    modeWrapper.appendChild(modeSelect);
    
    // Connect button handler
    connectBtn.addEventListener('click', () => {
      const value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }
      
      const parsedId = parseGCalInput(value);
      if (parsedId) {
        block.dataset.calendarId = parsedId;
        const selectedMode = modeSelect.value;
        content.innerHTML = '';
        const iframe = createGCalIframe(parsedId, selectedMode);
        content.appendChild(iframe);
        
        // Add mode switcher below the calendar
        const modeSwitcher = createModeSwitcher(block, parsedId, selectedMode);
        content.appendChild(modeSwitcher);
      } else {
        alert('Invalid calendar ID or URL. Please check your input.');
      }
    });
    
    // Enter key to connect
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        connectBtn.click();
      }
    });
    
    inputWrapper.appendChild(input);
    inputWrapper.appendChild(modeWrapper);
    inputWrapper.appendChild(connectBtn);
    
    setup.appendChild(instructions);
    setup.appendChild(inputWrapper);
    content.appendChild(setup);
  }
  
  wrapper.appendChild(header);
  wrapper.appendChild(content);
  
  block.appendChild(floaty);
  block.appendChild(wrapper);
  
  // Append to board
  if (state.targetRow) {
    const targetRow = document.getElementById(state.targetRow);
    if (targetRow) {
      targetRow.appendChild(block);
      state.targetRow = null;
    } else {
      if (row) {
        row.appendChild(block);
        appendToBoard(row);
      } else {
        appendToBoard(block);
      }
    }
  } else {
    if (row) {
      row.appendChild(block);
      appendToBoard(row);
    } else {
      appendToBoard(block);
    }
  }
  
  // Focus input if no calendar connected yet
  if (!calendarId) {
    setTimeout(() => {
      const inputEl = content.querySelector('.gcal-block__input');
      if (inputEl) inputEl.focus();
    }, 10);
  }
  
  return block;
}

/**
 * Parse user input to extract calendar ID
 * Handles:
 * - Direct calendar ID (email format)
 * - Full embed URL from Google Calendar
 * - iframe src attribute
 */
function parseGCalInput(input) {
  if (!input) return null;
  
  // Check if it's already a simple calendar ID (email-like)
  if (/^[\w.-]+@[\w.-]+$/.test(input)) {
    return input;
  }
  
  // Check for encoded calendar ID in URL
  const srcMatch = input.match(/src=([^&]+)/i);
  if (srcMatch) {
    try {
      return decodeURIComponent(srcMatch[1]);
    } catch {
      return srcMatch[1];
    }
  }
  
  // Check for calendar.google.com URL patterns
  const calIdMatch = input.match(/calendar\/embed\?.*?src=([^&\s"]+)/i);
  if (calIdMatch) {
    try {
      return decodeURIComponent(calIdMatch[1]);
    } catch {
      return calIdMatch[1];
    }
  }
  
  // If it looks like a URL but we couldn't parse it, try extracting any email-like pattern
  const emailMatch = input.match(/([\w.-]+@[\w.-]+\.[a-z]{2,})/i);
  if (emailMatch) {
    return emailMatch[1];
  }
  
  // If nothing matched but it's not empty, assume it's a calendar ID
  if (input.includes('@') || input.includes('.')) {
    return input;
  }
  
  return null;
}

/**
 * Create the Google Calendar iframe
 */
function createGCalIframe(calendarId, mode = 'MONTH') {
  const encodedId = encodeURIComponent(calendarId);
  const embedUrl = `https://calendar.google.com/calendar/embed?src=${encodedId}&mode=${mode}&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=1`;
  
  const iframe = createElement('iframe', {
    className: 'gcal-block__iframe',
    attrs: {
      src: embedUrl,
      frameborder: '0',
      scrolling: 'no',
      loading: 'lazy'
    }
  });
  
  return iframe;
}

/**
 * Create mode switcher for changing calendar view
 */
function createModeSwitcher(block, calendarId, currentMode) {
  const switcher = createElement('div', {
    className: 'gcal-block__mode-switcher'
  });
  
  const modes = [
    { value: 'MONTH', label: 'Month' },
    { value: 'WEEK', label: 'Week' },
    { value: 'AGENDA', label: 'Agenda' }
  ];
  
  modes.forEach(mode => {
    const btn = createElement('button', {
      className: `gcal-block__mode-btn ${mode.value === currentMode ? 'is-active' : ''}`,
      text: mode.label,
      attrs: { type: 'button', 'data-mode': mode.value }
    });
    
    btn.addEventListener('click', () => {
      // Update active state
      switcher.querySelectorAll('.gcal-block__mode-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      
      // Update iframe
      const content = block.querySelector('.gcal-block__content');
      const oldIframe = content.querySelector('.gcal-block__iframe');
      if (oldIframe) {
        const newIframe = createGCalIframe(calendarId, mode.value);
        oldIframe.replaceWith(newIframe);
      }
    });
    
    switcher.appendChild(btn);
  });
  
  return switcher;
}

// ==========================================================================
// LINK FORM & LINK TEXT BLOCK
// ==========================================================================

/**
 * Show a floating form for creating a link
 * Creates a text block that acts as a clickable link
 */
export function showLinkForm() {
  // Capture the current printMode BEFORE showing the form
  // This is crucial for nested containers like toggles
  const capturedPrintMode = state.printMode;
  const capturedTargetRow = state.targetRow;
  
  // Remove any existing form
  const existing = document.querySelector('.link-form-overlay');
  if (existing) existing.remove();
  
  // Create overlay
  const overlay = createElement('div', {
    className: 'link-form-overlay'
  });
  
  // Create form
  const form = createElement('div', {
    className: 'link-form',
    html: `
      <div class="link-form__header">Add Link</div>
      <input type="text" class="link-form__input" id="linkTitle" placeholder="Link title..." autofocus>
      <input type="text" class="link-form__input" id="linkUrl" placeholder="URL (e.g., https://example.com)">
      <div class="link-form__actions">
        <button type="button" class="link-form__btn link-form__btn--cancel">Cancel</button>
        <button type="button" class="link-form__btn link-form__btn--done">Done</button>
      </div>
    `
  });
  
  overlay.appendChild(form);
  document.body.appendChild(overlay);
  
  const titleInput = form.querySelector('#linkTitle');
  const urlInput = form.querySelector('#linkUrl');
  const doneBtn = form.querySelector('.link-form__btn--done');
  const cancelBtn = form.querySelector('.link-form__btn--cancel');
  
  const cleanup = () => overlay.remove();
  
  const createLink = () => {
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!title || !url) {
      if (!title) titleInput.focus();
      else urlInput.focus();
      return;
    }
    
    cleanup();
    
    // Restore the captured state before creating the block
    state.printMode = capturedPrintMode;
    state.targetRow = capturedTargetRow;
    
    createLinkTextBlock({ text: title, url: normalizeUrl(url) });
  };
  
  // Event listeners
  doneBtn.addEventListener('click', createLink);
  cancelBtn.addEventListener('click', cleanup);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup();
  });
  
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      urlInput.focus();
    } else if (e.key === 'Escape') {
      cleanup();
    }
  });
  
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createLink();
    } else if (e.key === 'Escape') {
      cleanup();
    }
  });
  
  titleInput.focus();
}

/**
 * Create a text block that acts as a clickable link
 * Similar to createTextBlock but opens URL when clicked
 */
export function createLinkTextBlock(options = {}) {
  const { text = '', url = '' } = options;
  
  const blockId = generateId('block');
  
  // Block container
  const block = createElement('div', {
    className: 'item',
    data: { blockId, blockType: 'link', url }
  });
  
  // Floaty edit button
  const floaty = createBlockFloaty(blockId, 'link');
  
  // Content (NOT contenteditable - links are only editable via the edit menu)
  const contentDiv = createElement('div', {
    className: 'item__content item__content--link',
    attrs: {
      'data-placeholder': 'Link text...',
      'data-url': url
    },
    data: { blockId }
  });
  contentDiv.textContent = text;
  
  // Click handler - always open link since not editable
  contentDiv.addEventListener('click', (e) => {
    if (url) {
      e.preventDefault();
      window.open(url, '_blank');
    }
  });
  
  block.appendChild(floaty);
  block.appendChild(contentDiv);
  
  // Check if we should add to an existing row or create a new one
  if (state.targetRow) {
    const targetRow = document.getElementById(state.targetRow);
    if (targetRow) {
      targetRow.appendChild(block);
      state.targetRow = null;
    } else {
      const row = state.printMode === 'board' ? createRow(blockId) : null;
      if (row) {
        row.appendChild(block);
        appendToBoard(row);
      } else {
        appendToBoard(block);
      }
    }
  } else {
    const row = state.printMode === 'board' ? createRow(blockId) : null;
    if (row) {
      row.appendChild(block);
      appendToBoard(row);
    } else {
      appendToBoard(block);
    }
  }
  
  return block;
}

// ==========================================================================
// DROPDOWN/TOGGLE BLOCK
// ==========================================================================

/**
 * Create a dropdown/toggle block
 */
export function createDropdownBlock(options = {}) {
  const { title = '', isOpen = true } = options;
  
  const blockId = generateId('block');
  const contentId = generateId('content');
  const row = state.printMode === 'board' ? createRow(blockId) : null;
  
  const block = createElement('div', {
    className: `item dropdown-block ${isOpen ? 'is-open' : ''}`,
    data: { blockId, blockType: 'dropdown', contentId }
  });
  
  // Header
  const header = createElement('div', {
    className: 'dropdown-block__header',
    html: `
      <span class="dropdown-block__toggle">▶</span>
    `
  });
  
  const titleDiv = createElement('div', {
    className: 'item__content',
    attrs: {
      contenteditable: 'true',
      'data-placeholder': 'Toggle title...'
    },
    data: { blockId }
  });
  titleDiv.textContent = title;
  header.appendChild(titleDiv);
  
  // Toggle on click
  header.querySelector('.dropdown-block__toggle').addEventListener('click', () => {
    block.classList.toggle('is-open');
  });
  
  // Content container
  const content = createElement('div', {
    className: 'dropdown-block__content',
    id: contentId,
    data: { parentId: blockId }
  });
  
  // Add block button inside dropdown
  const addBtn = createElement('div', {
    className: 'add-block js-add-block-nested',
    data: { parentId: contentId },
    html: `
      <img src="icons/add.png" alt="Add" class="add-block__icon icon--muted">
    `
  });
  content.appendChild(addBtn);
  
  block.appendChild(header);
  block.appendChild(content);
  
  // Check if we should add to an existing row or create a new one
  if (state.targetRow) {
    const targetRow = document.getElementById(state.targetRow);
    if (targetRow) {
      targetRow.appendChild(block);
      state.targetRow = null;
    } else {
      const row = state.printMode === 'board' ? createRow(blockId) : null;
      if (row) {
        row.appendChild(block);
        appendToBoard(row);
      } else {
        appendToBoard(block);
      }
    }
  } else {
    const row = state.printMode === 'board' ? createRow(blockId) : null;
    if (row) {
      row.appendChild(block);
      appendToBoard(row);
    } else {
      appendToBoard(block);
    }
  }
  
  setTimeout(() => focusAtEnd(titleDiv), 10);
  
  return block;
}

// ==========================================================================
// GROUP BLOCK
// ==========================================================================

/**
 * Create a group block (container for other blocks)
 */
export function createGroupBlock() {
  const blockId = generateId('block');
  const contentId = generateId('content');
  const row = state.printMode === 'board' ? createRow(blockId) : null;
  
  const block = createElement('div', {
    className: 'item group-block',
    data: { blockId, blockType: 'group', contentId }
  });
  
  // Group header with menu
  const header = createElement('div', {
    className: 'group-block__header'
  });
  
  const menuBtn = createElement('button', {
    className: 'group-block__menu-btn js-size-menu',
    attrs: { type: 'button', 'data-block-id': blockId },
    html: '⋯'
  });
  header.appendChild(menuBtn);
  
  // Group content
  const content = createElement('div', {
    className: 'group-block__content',
    id: contentId,
    data: { parentId: blockId }
  });
  
  block.appendChild(header);
  block.appendChild(content);
  
  // Check if we should add to an existing row or create a new one
  if (state.targetRow) {
    const targetRow = document.getElementById(state.targetRow);
    if (targetRow) {
      targetRow.appendChild(block);
      state.targetRow = null;
    } else {
      const row = state.printMode === 'board' ? createRow(blockId) : null;
      if (row) {
        row.appendChild(block);
        appendToBoard(row);
      } else {
        appendToBoard(block);
      }
    }
  } else {
    const row = state.printMode === 'board' ? createRow(blockId) : null;
    if (row) {
      row.appendChild(block);
      appendToBoard(row);
    } else {
      appendToBoard(block);
    }
  }
  
  // Create initial text block inside group
  const oldPrintMode = state.printMode;
  state.printMode = contentId;
  createTextBlock();
  state.printMode = oldPrintMode;
  
  return block;
}



// ==========================================================================
// HELPERS
// ==========================================================================

/**
 * Append block/row to the correct container
 */
function appendToBoard(element) {
  let container;
  
  if (state.printMode === 'board') {
    container = document.getElementById('boardItems');
  } else {
    container = document.getElementById(state.printMode);
    if (!container) {
      container = document.querySelector(`[data-content-id="${state.printMode}"]`);
    }
  }
  
  if (!container) {
    container = document.getElementById('boardItems');
  }
  
  // Insert before the add-block button if it exists
  const addBlockBtn = container.querySelector('.add-block');
  if (addBlockBtn) {
    container.insertBefore(element, addBlockBtn);
  } else {
    container.appendChild(element);
  }
  
  // Cleanup empty rows
  cleanupEmptyRows();
}

/**
 * Remove empty rows
 */
function cleanupEmptyRows() {
  document.querySelectorAll('.item-row').forEach(row => {
    const items = row.querySelectorAll('.item');
    if (items.length === 0) {
      row.remove();
    }
  });
}

/**
 * Delete a block by ID
 */
export function deleteBlock(blockId) {
  const block = document.querySelector(`[data-block-id="${blockId}"]`);
  if (!block) return;
  
  const row = block.closest('.item-row');
  block.remove();
  
  // Remove row if empty
  if (row && row.querySelectorAll('.item').length === 0) {
    row.remove();
  }
}

/**
 * Convert text block to checklist
 */
export function convertToChecklist(blockId) {
  const block = document.querySelector(`[data-block-id="${blockId}"]`);
  if (!block) return;
  
  const content = block.querySelector('[contenteditable]');
  const text = content ? content.textContent : '';
  
  // Get parent and position
  const parent = block.parentElement;
  const nextSibling = block.nextSibling;
  
  // Remove old block
  block.remove();
  
  // Create new checklist at same position
  const newBlock = createChecklistBlock({ content: text });
  
  // This is simplified - in a real app you'd insert at the exact position
}

// ==========================================================================
// GALLERY BLOCK (Tabbed Categories)
// ==========================================================================

/**
 * Create a gallery block with tabbed categories
 */
export function createGalleryBlock() {
  const blockId = generateId('block');
  const initialTabId = generateId('tab');
  
  const block = createElement('div', {
    className: 'item gallery-block',
    data: { blockId, blockType: 'gallery' }
  });
  
  // Tab bar
  const tabBar = createElement('div', { className: 'gallery-block__tabs' });
  
  // Initial tab
  const initialTab = createElement('div', {
    className: 'gallery-block__tab is-active',
    data: { tabId: initialTabId },
    html: `
      <span class="gallery-block__tab-label" contenteditable="true" data-placeholder="Category 1">Category 1</span>
    `
  });
  tabBar.appendChild(initialTab);
  
  // Add tab button
  const addTabBtn = createElement('button', {
    className: 'gallery-block__add-tab',
    attrs: { type: 'button', 'aria-label': 'Add category' },
    html: `<span>+</span>`
  });
  tabBar.appendChild(addTabBtn);
  
  // Size menu button
  const menuBtn = createElement('button', {
    className: 'gallery-block__menu-btn js-size-menu',
    attrs: { type: 'button', 'data-block-id': blockId },
    html: '⋯'
  });
  tabBar.appendChild(menuBtn);
  
  // Tab content container
  const contentContainer = createElement('div', { className: 'gallery-block__content' });
  
  // Initial tab content
  const initialContent = createElement('div', {
    className: 'gallery-block__panel is-active',
    id: initialTabId,
    data: { tabId: initialTabId, parentId: blockId }
  });
  
  // Add block button inside tab content
  const addBlockBtn = createElement('div', {
    className: 'add-block js-add-block-nested',
    data: { parentId: initialTabId },
    html: `
      <img src="icons/add.png" alt="Add" class="add-block__icon icon--muted">
=    `
  });
  initialContent.appendChild(addBlockBtn);
  contentContainer.appendChild(initialContent);
  
  block.appendChild(tabBar);
  block.appendChild(contentContainer);
  
  // --- Event handlers ---
  
  // Tab switching
  tabBar.addEventListener('click', (e) => {
    const tab = e.target.closest('.gallery-block__tab');
    if (!tab || e.target.closest('.gallery-block__tab-label')) return;
    
    const tabId = tab.dataset.tabId;
    
    // Deactivate all
    block.querySelectorAll('.gallery-block__tab').forEach(t => t.classList.remove('is-active'));
    block.querySelectorAll('.gallery-block__panel').forEach(p => p.classList.remove('is-active'));
    
    // Activate clicked
    tab.classList.add('is-active');
    const panel = block.querySelector(`#${tabId}`);
    if (panel) panel.classList.add('is-active');
  });
  
  // Add new tab
  addTabBtn.addEventListener('click', () => {
    const newTabId = generateId('tab');
    const tabCount = block.querySelectorAll('.gallery-block__tab').length + 1;
    
    // Create new tab
    const newTab = createElement('div', {
      className: 'gallery-block__tab',
      data: { tabId: newTabId },
      html: `
        <span class="gallery-block__tab-label" contenteditable="true" data-placeholder="Category ${tabCount}">Category ${tabCount}</span>
      `
    });
    tabBar.insertBefore(newTab, addTabBtn);
    
    // Create new panel
    const newPanel = createElement('div', {
      className: 'gallery-block__panel',
      id: newTabId,
      data: { tabId: newTabId, parentId: blockId }
    });
    
    const newAddBtn = createElement('div', {
      className: 'add-block js-add-block-nested',
      data: { parentId: newTabId },
      html: `
        <img src="icons/add.png" alt="Add" class="add-block__icon icon--muted">
        <span>Add a block</span>
      `
    });
    newPanel.appendChild(newAddBtn);
    contentContainer.appendChild(newPanel);
    
    // Switch to new tab
    block.querySelectorAll('.gallery-block__tab').forEach(t => t.classList.remove('is-active'));
    block.querySelectorAll('.gallery-block__panel').forEach(p => p.classList.remove('is-active'));
    newTab.classList.add('is-active');
    newPanel.classList.add('is-active');
    
    // Focus the label for editing
    const label = newTab.querySelector('.gallery-block__tab-label');
    if (label) {
      label.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(label);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });
  
  // Append to board
  if (state.targetRow) {
    const targetRow = document.getElementById(state.targetRow);
    if (targetRow) {
      targetRow.appendChild(block);
      state.targetRow = null;
    } else {
      const row = state.printMode === 'board' ? createRow(blockId) : null;
      if (row) {
        row.appendChild(block);
        appendToBoard(row);
      } else {
        appendToBoard(block);
      }
    }
  } else {
    const row = state.printMode === 'board' ? createRow(blockId) : null;
    if (row) {
      row.appendChild(block);
      appendToBoard(row);
    } else {
      appendToBoard(block);
    }
  }
  
  return block;
}
