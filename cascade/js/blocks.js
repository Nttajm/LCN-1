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
// FORMATTED TABLE BLOCK
// ==========================================================================

/**
 * Column type definitions for the formatted table.
 * Each type has a render and editor function.
 */
const FTABLE_COLUMN_TYPES = [
  { id: 'text',        label: 'Text',        icon: 'Aa' },
  { id: 'number',      label: 'Number',      icon: '#'  },
  { id: 'date',        label: 'Date',        icon: '📅' },
  { id: 'tags',        label: 'Tags',        icon: '🏷️' },
  { id: 'status',      label: 'Status',      icon: '⏳' },
  { id: 'checkbox',    label: 'Checkbox',    icon: '☑️' },
  { id: 'description', label: 'Description', icon: '📝' },
  { id: 'select',      label: 'Select',      icon: '▾'  },
  { id: 'url',         label: 'URL',         icon: '🔗' }
];

const FTABLE_STATUS_OPTIONS = [
  { id: 'todo',        label: 'To Do',       color: '#0b6e99' },
  { id: 'in-progress', label: 'In Progress', color: '#d9730d' },
  { id: 'complete',    label: 'Complete',     color: '#0f7b6c' },
  { id: 'dnf',         label: 'DNF',         color: '#e03e3e' }
];

const FTABLE_TAG_COLORS = [
  '#0b6e99', '#0f7b6c', '#d9730d', '#e03e3e', '#6940a5',
  '#ad1a72', '#64473a', '#dfab01', '#5dade2', '#b084cc'
];

/**
 * Create a formatted table block
 */
export function createFormattedTableBlock(options = {}) {
  const {
    title = '',
    columns = [
      { id: generateId('col'), name: 'Task', type: 'text' },
      { id: generateId('col'), name: 'Status', type: 'status' },
      { id: generateId('col'), name: 'Due', type: 'date' }
    ],
    rows = []
  } = options;

  const blockId = generateId('block');

  // Block container
  const block = createElement('div', {
    className: 'item ftable-block',
    data: { blockId, blockType: 'ftable' }
  });

  const floaty = createBlockFloaty(blockId, 'ftable');

  // Wrapper
  const wrapper = createElement('div', { className: 'ftable-block__wrapper' });

  // Title row
  const headerBar = createElement('div', { className: 'ftable-block__header' });
  const titleEl = createElement('div', {
    className: 'ftable-block__title',
    attrs: { contenteditable: 'true', 'data-placeholder': 'Table title...' },
    data: { blockId }
  });
  titleEl.textContent = title;
  headerBar.appendChild(titleEl);

  // + Add row button
  const addRowBtn = createElement('button', {
    className: 'ftable-block__add-row-btn',
    attrs: { type: 'button', title: 'Add row' },
    html: '+'
  });
  headerBar.appendChild(addRowBtn);

  // ⋯ menu button (resize)
  const menuBtn = createElement('button', {
    className: 'ftable-block__menu-btn js-size-menu',
    attrs: { type: 'button', 'data-block-id': blockId },
    html: '⋯'
  });
  headerBar.appendChild(menuBtn);

  wrapper.appendChild(headerBar);

  // Scrollable table container
  const tableWrap = createElement('div', { className: 'ftable-block__table-wrap' });
  const table = createElement('table', { className: 'ftable' });

  // --- Build <thead> ---
  const thead = createElement('thead');
  const headRow = createElement('tr');

  columns.forEach(col => {
    const th = buildColumnHeader(col, block, table);
    headRow.appendChild(th);
  });

  // "Add column" header cell
  const addColTh = createElement('th', {
    className: 'ftable__add-col',
    html: '<button class="ftable__add-col-btn" type="button" title="Add column">+</button>'
  });
  addColTh.querySelector('button').addEventListener('click', () => {
    addTableColumn(block, table);
  });
  headRow.appendChild(addColTh);

  thead.appendChild(headRow);
  table.appendChild(thead);

  // --- Build <tbody> ---
  const tbody = createElement('tbody');

  if (rows.length > 0) {
    rows.forEach(rowData => {
      const tr = buildTableRow(columns, rowData, block);
      tbody.appendChild(tr);
    });
  } else {
    // One empty starter row
    const tr = buildTableRow(columns, {}, block);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrapper.appendChild(tableWrap);

  // Wire up add-row button (already in header bar)
  addRowBtn.addEventListener('click', () => {
    const currentCols = getColumnsFromTable(table);
    const tr = buildTableRow(currentCols, {}, block);
    tbody.insertBefore(tr, tbody.firstChild);
  });

  block.appendChild(floaty);
  block.appendChild(wrapper);

  // Append to board (standard pattern)
  if (state.targetRow) {
    const targetRow = document.getElementById(state.targetRow);
    if (targetRow) {
      targetRow.appendChild(block);
      state.targetRow = null;
    } else {
      const row = state.printMode === 'board' ? createRow(blockId) : null;
      if (row) { row.appendChild(block); appendToBoard(row); }
      else { appendToBoard(block); }
    }
  } else {
    const row = state.printMode === 'board' ? createRow(blockId) : null;
    if (row) { row.appendChild(block); appendToBoard(row); }
    else { appendToBoard(block); }
  }

  return block;
}

/* --- Helpers for the formatted table --- */

function getColumnsFromTable(table) {
  const cols = [];
  table.querySelectorAll('thead th[data-col-id]').forEach(th => {
    cols.push({
      id: th.dataset.colId,
      name: th.querySelector('.ftable__col-name')?.textContent || '',
      type: th.dataset.colType || 'text'
    });
  });
  return cols;
}

function buildColumnHeader(col, block, table) {
  const th = createElement('th', {
    className: 'ftable__th',
    data: { colId: col.id, colType: col.type }
  });
  if (col.width) th.style.width = col.width;

  const typeInfo = FTABLE_COLUMN_TYPES.find(t => t.id === col.type) || FTABLE_COLUMN_TYPES[0];

  // Type icon (clickable to change type)
  const typeBtn = createElement('button', {
    className: 'ftable__type-btn',
    attrs: { type: 'button', title: `Column type: ${typeInfo.label}` },
    text: typeInfo.icon
  });
  typeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openColumnTypePicker(th, col, block, table);
  });

  // Column name
  const nameSpan = createElement('span', {
    className: 'ftable__col-name',
    attrs: { contenteditable: 'true', 'data-placeholder': 'Column' },
    text: col.name || ''
  });

  th.appendChild(typeBtn);
  th.appendChild(nameSpan);

  // Resize handle
  const resizer = createElement('div', { className: 'ftable__col-resizer' });
  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = th.offsetWidth;
    const onMove = (ev) => {
      const newW = Math.max(60, startW + (ev.clientX - startX));
      th.style.width = newW + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  th.appendChild(resizer);

  return th;
}

function openColumnTypePicker(th, col, block, table) {
  // Remove existing picker
  document.querySelectorAll('.ftable__type-picker').forEach(p => p.remove());

  const picker = createElement('div', { className: 'ftable__type-picker' });

  FTABLE_COLUMN_TYPES.forEach(t => {
    const item = createElement('div', {
      className: `ftable__type-picker-item ${t.id === col.type ? 'is-active' : ''}`,
      html: `<span class="ftable__type-picker-icon">${t.icon}</span><span>${t.label}</span>`
    });
    item.addEventListener('click', () => {
      // Update column type
      th.dataset.colType = t.id;
      col.type = t.id;
      const btn = th.querySelector('.ftable__type-btn');
      if (btn) { btn.textContent = t.icon; btn.title = `Column type: ${t.label}`; }

      // Re-render all cells in this column
      const colIndex = Array.from(th.parentElement.children).indexOf(th);
      table.querySelectorAll('tbody tr').forEach(tr => {
        const td = tr.children[colIndex];
        if (td) {
          const oldValue = extractCellValue(td);
          td.innerHTML = '';
          td.className = 'ftable__td';
          td.dataset.colType = t.id;
          renderCell(td, t.id, oldValue);
        }
      });

      picker.remove();
    });
    picker.appendChild(item);
  });

  // Position
  const rect = th.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.left = `${rect.left}px`;
  picker.style.top = `${rect.bottom + 4}px`;
  picker.style.zIndex = '1100';
  document.body.appendChild(picker);

  // Close on outside click
  const close = (e) => {
    if (!picker.contains(e.target)) {
      picker.remove();
      document.removeEventListener('click', close, true);
    }
  };
  setTimeout(() => document.addEventListener('click', close, true), 0);
}

function extractCellValue(td) {
  const type = td.dataset.colType || 'text';
  switch (type) {
    case 'checkbox':
      return td.querySelector('input')?.checked ? 'true' : 'false';
    case 'date':
      return td.querySelector('.ftable__date-value')?.value || td.querySelector('input')?.value || '';
    case 'tags': {
      const tags = [];
      td.querySelectorAll('.ftable__tag').forEach(tag => tags.push(tag.textContent));
      return tags.join(',');
    }
    case 'status':
      return td.querySelector('.ftable__status')?.dataset.status || '';
    case 'select':
      return td.querySelector('select')?.value || '';
    case 'url': {
      const a = td.querySelector('a');
      return a ? a.href : (td.querySelector('input')?.value || td.textContent.trim());
    }
    default:
      return td.querySelector('[contenteditable]')?.textContent || td.textContent.trim();
  }
}

function buildTableRow(columns, rowData = {}, block) {
  const rowId = rowData.id || generateId('row');
  const tr = createElement('tr', { data: { rowId } });

  columns.forEach(col => {
    const td = createElement('td', {
      className: 'ftable__td',
      data: { colType: col.type, colId: col.id }
    });
    const value = rowData.cells?.[col.id] ?? '';
    renderCell(td, col.type, value);
    tr.appendChild(td);
  });

  // Empty cell to match the add-col column
  const emptyTd = createElement('td', { className: 'ftable__td ftable__td--empty' });
  tr.appendChild(emptyTd);

  return tr;
}

/* ── Date formatting helpers ───────────────────────────── */
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function ordinalSuffix(d) {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
}

/** Convert ISO date (YYYY-MM-DD) → "August 19th". Returns '' for empty/invalid. */
function formatDatePretty(iso) {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (!m || !d || m < 1 || m > 12) return iso;
  return `${MONTH_NAMES[m - 1]} ${d}${ordinalSuffix(d)}`;
}

/**
 * Set up a date cell: if a value exists show formatted text, otherwise show
 * the native date picker. Clicking the formatted text re-opens the picker.
 */
function setupDateCell(td, isoValue) {
  td.innerHTML = '';

  // Hidden input stores the ISO value for serialization
  const hidden = createElement('input', { attrs: { type: 'hidden', value: isoValue || '' } });
  hidden.className = 'ftable__date-value';
  td.appendChild(hidden);

  const pretty = formatDatePretty(isoValue);

  if (pretty) {
    // Show the formatted label
    const display = createElement('span', { className: 'ftable__date-display', text: pretty });
    td.appendChild(display);
    display.addEventListener('click', (e) => {
      e.stopPropagation();
      showDatePicker(td, hidden);
    });
  } else {
    // No value yet — show the native picker right away
    showDatePicker(td, hidden);
  }
}

/** Replace the display span with a native date picker; on change swap back to label. */
function showDatePicker(td, hidden) {
  const oldDisplay = td.querySelector('.ftable__date-display');
  if (oldDisplay) oldDisplay.remove();
  const oldInput = td.querySelector('.ftable__date-input');
  if (oldInput) oldInput.remove();

  const input = createElement('input', {
    className: 'ftable__date-input',
    attrs: { type: 'date', value: hidden.value || '' }
  });
  td.appendChild(input);
  input.focus();

  const commit = () => {
    if (input.value) hidden.value = input.value;
    setupDateCell(td, hidden.value);
  };

  input.addEventListener('change', commit);
  input.addEventListener('blur', () => {
    // Small delay so 'change' fires first when picking from calendar
    setTimeout(() => { if (td.contains(input)) commit(); }, 150);
  });
}

function renderCell(td, type, value) {
  switch (type) {

    case 'checkbox': {
      const cb = createElement('input', {
        className: 'ftable__checkbox',
        attrs: { type: 'checkbox' }
      });
      cb.checked = value === 'true' || value === true;
      td.appendChild(cb);
      break;
    }

    case 'date': {
      setupDateCell(td, value || '');
      break;
    }

    case 'tags': {
      const tagWrap = createElement('div', { className: 'ftable__tags-wrap' });
      const existing = value ? value.split(',').filter(Boolean) : [];
      existing.forEach(t => {
        const tag = createTagChip(t.trim(), tagWrap);
        tagWrap.appendChild(tag);
      });
      // Add tag input
      const addInput = createElement('input', {
        className: 'ftable__tag-input',
        attrs: { type: 'text', placeholder: '+' }
      });
      addInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && addInput.value.trim()) {
          e.preventDefault();
          const tag = createTagChip(addInput.value.trim(), tagWrap);
          tagWrap.insertBefore(tag, addInput);
          addInput.value = '';
        }
      });
      tagWrap.appendChild(addInput);
      td.appendChild(tagWrap);
      break;
    }

    case 'status': {
      const statusEl = createElement('div', { className: 'ftable__status-wrap' });
      const current = FTABLE_STATUS_OPTIONS.find(s => s.id === value) || null;
      const badge = createElement('button', {
        className: 'ftable__status',
        attrs: { type: 'button' },
        data: { status: current?.id || '' },
        text: current?.label || 'Set status'
      });
      if (current) {
        badge.style.backgroundColor = current.color;
        badge.style.color = '#fff';
      }
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        openStatusPicker(badge, statusEl);
      });
      statusEl.appendChild(badge);
      td.appendChild(statusEl);
      break;
    }

    case 'select': {
      const sel = createElement('select', { className: 'ftable__select' });
      const opts = ['', 'Option 1', 'Option 2', 'Option 3'];
      opts.forEach(o => {
        const opt = createElement('option', { text: o, attrs: { value: o } });
        if (o === value) opt.selected = true;
        sel.appendChild(opt);
      });
      td.appendChild(sel);
      break;
    }

    case 'url': {
      if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
        const a = createElement('a', {
          className: 'ftable__url-link',
          attrs: { href: value, target: '_blank', rel: 'noopener' },
          text: value
        });
        td.appendChild(a);
      } else {
        const input = createElement('input', {
          className: 'ftable__url-input',
          attrs: { type: 'url', placeholder: 'https://...', value: value || '' }
        });
        input.addEventListener('change', () => {
          const v = input.value.trim();
          if (v && (v.startsWith('http://') || v.startsWith('https://'))) {
            td.innerHTML = '';
            td.dataset.colType = 'url';
            const a = createElement('a', {
              className: 'ftable__url-link',
              attrs: { href: v, target: '_blank', rel: 'noopener' },
              text: v
            });
            td.appendChild(a);
          }
        });
        td.appendChild(input);
      }
      break;
    }

    case 'number': {
      const input = createElement('input', {
        className: 'ftable__number-input',
        attrs: { type: 'number', value: value || '', placeholder: '0' }
      });
      td.appendChild(input);
      break;
    }

    case 'description': {
      const div = createElement('div', {
        className: 'ftable__desc',
        attrs: { contenteditable: 'true', 'data-placeholder': 'Description...' }
      });
      div.textContent = value || '';
      td.appendChild(div);
      break;
    }

    default: { // 'text'
      const div = createElement('div', {
        className: 'ftable__text',
        attrs: { contenteditable: 'true', 'data-placeholder': 'Type...' }
      });
      div.textContent = value || '';
      td.appendChild(div);
      break;
    }
  }
}

function createTagChip(text, container) {
  const colorIndex = Math.abs(hashString(text)) % FTABLE_TAG_COLORS.length;
  const color = FTABLE_TAG_COLORS[colorIndex];

  const tag = createElement('span', {
    className: 'ftable__tag',
    text
  });
  tag.style.backgroundColor = color;
  tag.style.color = '#fff';

  // Remove on click
  tag.addEventListener('click', () => tag.remove());

  return tag;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function openStatusPicker(badge, container) {
  document.querySelectorAll('.ftable__status-picker').forEach(p => p.remove());

  const picker = createElement('div', { className: 'ftable__status-picker' });
  FTABLE_STATUS_OPTIONS.forEach(s => {
    const item = createElement('div', {
      className: 'ftable__status-picker-item',
      text: s.label
    });
    item.style.setProperty('--status-color', s.color);
    item.addEventListener('click', () => {
      badge.textContent = s.label;
      badge.dataset.status = s.id;
      badge.style.backgroundColor = s.color;
      badge.style.color = '#fff';
      picker.remove();
    });
    picker.appendChild(item);
  });

  // Clear option
  const clearItem = createElement('div', {
    className: 'ftable__status-picker-item ftable__status-picker-item--clear',
    text: 'Clear'
  });
  clearItem.addEventListener('click', () => {
    badge.textContent = 'Set status';
    badge.dataset.status = '';
    badge.style.backgroundColor = '';
    badge.style.color = '';
    picker.remove();
  });
  picker.appendChild(clearItem);

  const rect = badge.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.left = `${rect.left}px`;
  picker.style.top = `${rect.bottom + 4}px`;
  picker.style.zIndex = '1100';
  document.body.appendChild(picker);

  const close = (e) => {
    if (!picker.contains(e.target) && e.target !== badge) {
      picker.remove();
      document.removeEventListener('click', close, true);
    }
  };
  setTimeout(() => document.addEventListener('click', close, true), 0);
}

function addTableColumn(block, table) {
  const newCol = {
    id: generateId('col'),
    name: 'New Column',
    type: 'text'
  };

  const thead = table.querySelector('thead tr');
  const addColTh = thead.querySelector('.ftable__add-col');
  const th = buildColumnHeader(newCol, block, table);
  thead.insertBefore(th, addColTh);

  // Add a cell to every existing row
  table.querySelectorAll('tbody tr').forEach(tr => {
    const emptyTd = tr.querySelector('.ftable__td--empty');
    const td = createElement('td', {
      className: 'ftable__td',
      data: { colType: 'text', colId: newCol.id }
    });
    renderCell(td, 'text', '');
    tr.insertBefore(td, emptyTd);
  });
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
  
  // Check if block is inside a container (group, dropdown, or gallery panel)
  const groupContent = block.closest('.group-block__content');
  const dropdownContent = block.closest('.dropdown-block__content');
  const galleryPanel = block.closest('.gallery-block__panel');
  
  const containerElement = groupContent || dropdownContent || galleryPanel;
  
  block.remove();
  
  // Remove row if empty
  if (row && row.querySelectorAll('.item').length === 0) {
    row.remove();
  }
  
  // Check if container is now empty and delete it if so
  if (containerElement) {
    // Count remaining blocks (excluding add-block buttons)
    const remainingBlocks = containerElement.querySelectorAll('[data-block-id]');
    
    if (remainingBlocks.length === 0) {
      // Find the parent container block and delete it
      let parentBlock = null;
      
      if (groupContent) {
        parentBlock = groupContent.closest('.group-block');
      } else if (dropdownContent) {
        parentBlock = dropdownContent.closest('.dropdown-block');
      } else if (galleryPanel) {
        // For gallery panels, we need to check if this was the last tab
        const gallery = galleryPanel.closest('.gallery-block');
        if (gallery) {
          const remainingPanels = gallery.querySelectorAll('.gallery-block__panel');
          if (remainingPanels.length <= 1) {
            parentBlock = gallery;
          } else {
            // Remove the tab and panel, but keep the gallery
            const tabId = galleryPanel.id;
            const correspondingTab = gallery.querySelector(`[data-tab-id="${tabId}"]`);
            if (correspondingTab) {
              correspondingTab.remove();
            }
            galleryPanel.remove();
            
            // Activate the first remaining tab if current was active
            const firstTab = gallery.querySelector('.gallery-block__tab');
            const firstPanel = gallery.querySelector('.gallery-block__panel');
            if (firstTab && firstPanel) {
              firstTab.classList.add('is-active');
              firstPanel.classList.add('is-active');
            }
            return;
          }
        }
      }
      
      if (parentBlock && parentBlock.dataset.blockId) {
        // Recursively delete the parent container
        deleteBlock(parentBlock.dataset.blockId);
      }
    }
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
