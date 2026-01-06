/**
 * ==========================================================================
 * CASCADE - Main Application
 * ==========================================================================
 * Main entry point and event handling for the Cascade notes app.
 */

import { $, $$, createElement, debounce, focusAtEnd, focusAdjacentBlock } from './utils.js';
import { TOOLS, BULLET_MARKERS, SIZE_CLASSES, COLOR_CLASSES, ALIGN_CLASSES, BG_CLASSES, RANDOM_ICONS, COVER_IMAGES } from './config.js';
import { 
  createTextBlock, 
  createChecklistBlock, 
  createCalloutBlock,
  createSeparatorBlock,
  showLinkForm,
  createDropdownBlock,
  createGroupBlock,
  createGalleryBlock,
  createQuoteBlock,
  createGCalBlock,
  deleteBlock 
} from './blocks.js';
import { loadBoard, saveNotes, debouncedSave, applyPendingRemoteUpdates } from './backend.js';
import { TEMPLATES } from './templates.js';

// ==========================================================================
// APPLICATION STATE
// ==========================================================================

export const state = {
  printMode: 'board',      // 'board' or a container ID for nested blocks
  listMode: '',            // '' | 'bullet' | 'checklist' | 'quote'
  currentBoardId: null,
  isLoading: false,
  lastEdit: Date.now(),
  targetRow: null          // Row ID to add blocks to (for row floaty button)
};

// Auto-save on UI-driven changes (e.g. size/color/align buttons) that don't fire an 'input' event
let suppressMutationSaves = true;
let mutationSaveObserver = null;

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  initializeApp();
});

document.addEventListener('board-loaded', () => {
  initializeBlocks();
  ensureInitialTitleBlock();
});

async function initializeApp() {
  // Load board content
  await loadBoard();
  
  // Initialize event listeners
  initEventListeners();
  
  // Initialize existing blocks
  initializeBlocks();

  // Ensure there's a title block on empty boards
  ensureInitialTitleBlock();
  
  console.log('Cascade initialized');
}

function ensureInitialTitleBlock() {
  const container = document.getElementById('boardItems');
  if (!container) return;

  const hasBlocks = !!container.querySelector('[data-block-id]');
  if (hasBlocks) return;

  state.printMode = 'board';
  state.targetRow = null;
  state.listMode = '';
  createTextBlock({ type: 'title', placeholder: 'Title', content: '' });
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================

function initEventListeners() {
  // Share panel is now handled by collaboration.js
  
  // Sidebar toggle
  $('#sidebarToggle')?.addEventListener('click', toggleSidebar);
  
  // Cover & Icon
  $('.js-add-cover')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openCoverPicker(e.currentTarget);
  });
  $('.js-add-icon')?.addEventListener('click', addRandomIcon);
  $('.js-cover-icon')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openIconPicker($('#iconDisplay'));
  });
  $('#iconDisplay')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openIconPicker($('#iconDisplay'));
  });
  
  // Add block buttons
  document.addEventListener('click', handleAddBlockClick);
  
  // Block menu (floaty buttons)
  document.addEventListener('click', handleBlockMenuClick);
  
  // Size menu (for groups/galleries)
  document.addEventListener('click', handleSizeMenuClick);
  
  // Tool menu actions
  document.addEventListener('click', handleToolAction);
  
  // Close menus when clicking outside
  document.addEventListener('click', handleOutsideClick);
  
  // Reset printMode when clicking on the main board area
  document.addEventListener('click', handleBoardClick);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeydown);
  
  // Content changes (for auto-save and real-time sync)
  document.addEventListener('input', handleInput);

  // Suppress mutation-based auto-saves while deserializing (load/remote updates)
  document.addEventListener('cascade-deserialize-start', () => {
    suppressMutationSaves = true;
  });
  document.addEventListener('cascade-deserialize-end', () => {
    // Let the DOM settle for a tick before enabling
    setTimeout(() => {
      suppressMutationSaves = false;
    }, 0);
  });

  // Fallback: start observing once listeners are attached
  setupMutationAutoSave();
  
  // Focus tracking for nested blocks
  document.addEventListener('focusin', handleFocusIn);
  
  // Apply pending remote updates when user stops editing
  document.addEventListener('focusout', handleFocusOut);
  
  // Auto-save interval (backup for debounced save)
  setInterval(() => {
    if (Date.now() - state.lastEdit < 500 && state.currentBoardId) {
      saveNotes();
    }
  }, 500);
}

function setupMutationAutoSave() {
  if (mutationSaveObserver) {
    mutationSaveObserver.disconnect();
    mutationSaveObserver = null;
  }

  const boardItems = document.getElementById('boardItems');
  const cover = document.getElementById('boardCover');
  const iconDisplay = document.getElementById('iconDisplay');

  const relevantAttributes = new Set([
    'class',
    'style',
    'data-url',
    'data-placeholder',
    'data-content-id',
    'data-tab-id',
    'data-row-id',
    'data-block-id',
    'data-block-type'
  ]);

  mutationSaveObserver = new MutationObserver((mutations) => {
    if (suppressMutationSaves) return;

    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        if (!relevantAttributes.has(mutation.attributeName)) continue;
      }

      // Any meaningful UI-driven change should mark as edited and save
      state.lastEdit = Date.now();
      debouncedSave();
      break;
    }
  });

  if (boardItems) {
    mutationSaveObserver.observe(boardItems, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: false
    });
  }

  // Cover/icon changes also need persistence (they typically don't emit 'input')
  if (cover) {
    mutationSaveObserver.observe(cover, {
      attributes: true,
      attributeOldValue: false
    });
  }
  if (iconDisplay) {
    mutationSaveObserver.observe(iconDisplay, {
      attributes: true,
      attributeOldValue: false,
      childList: true,
      subtree: true
    });
  }
}

// ==========================================================================
// SHARE PANEL (Legacy - now handled by collaboration.js)
// ==========================================================================

// Share panel functionality has been moved to collaboration.js
// which provides full Google Docs-like collaboration features

// ==========================================================================
// COVER & ICON
// ==========================================================================

function addRandomCover() {
  const cover = $('#boardCover');
  const btn = $('.js-add-cover');
  
  if (cover) {
    const randomCover = COVER_IMAGES[Math.floor(Math.random() * COVER_IMAGES.length)];
    cover.style.backgroundImage = `url('${randomCover}')`;
    cover.classList.add('cover--has-image');
    
    if (btn) {
      btn.textContent = 'Change cover';
    }
  }
}

function setBoardCoverImage(src) {
  const cover = $('#boardCover');
  const btn = $('.js-add-cover');
  if (!cover) return;
  cover.style.backgroundImage = src ? `url('${src}')` : '';
  cover.classList.toggle('cover--has-image', !!src);
  if (btn) btn.textContent = src ? 'Change cover' : 'Add cover';
}

function removeBoardCover() {
  setBoardCoverImage('');
}

function addRandomIcon() {
  const iconDisplay = $('#iconDisplay');
  const btn = $('.js-add-icon');
  
  if (iconDisplay) {
    const randomIcon = RANDOM_ICONS[Math.floor(Math.random() * RANDOM_ICONS.length)];
    iconDisplay.textContent = randomIcon;
    iconDisplay.contentEditable = 'true';
    
    if (btn) {
      btn.classList.add('hidden');
    }
  }
}

function handleIconClick() {
  const iconDisplay = $('#iconDisplay');
  if (iconDisplay && iconDisplay.contentEditable === 'true') {
    focusAtEnd(iconDisplay);
  }
}

// ==========================================================================
// ICON PICKER (Emoji | Icons | Upload | Remove)
// ==========================================================================

function openIconPicker(anchor) {
  if (!anchor) return;
  closeIconPicker();

  const picker = createElement('div', { className: 'icon-picker' });

  // Header tabs
  const header = createElement('div', { className: 'icon-picker__header' });
  const tabs = [
    { id: 'emoji', label: 'Emoji' },
    { id: 'icons', label: 'Icons' },
    { id: 'upload', label: 'Upload' },
    { id: 'remove', label: 'Remove' }
  ];
  const tabBtns = {};
  tabs.forEach((t, i) => {
    const btn = createElement('button', {
      className: `icon-picker__tab ${i === 0 ? 'is-active' : ''}`,
      text: t.label,
      attrs: { type: 'button', 'data-tab': t.id }
    });
    tabBtns[t.id] = btn;
    header.appendChild(btn);
  });
  picker.appendChild(header);

  // Toolbar
  const toolbar = createElement('div', { className: 'icon-picker__toolbar' });
  const shuffle = createElement('button', {
    className: 'icon-picker__shuffle',
    html: '&#x1F500;',
    attrs: { type: 'button', title: 'Shuffle' }
  });
  toolbar.appendChild(shuffle);
  picker.appendChild(toolbar);

  // Content areas
  const contentEmoji = createElement('div', { className: 'icon-picker__content is-active', attrs: { 'data-content': 'emoji' } });
  const contentIcons = createElement('div', { className: 'icon-picker__content', attrs: { 'data-content': 'icons' } });
  const contentUpload = createElement('div', { className: 'icon-picker__content', attrs: { 'data-content': 'upload' } });
  const contentRemove = createElement('div', { className: 'icon-picker__content', attrs: { 'data-content': 'remove' } });

  // Emoji grid
  let emojiList = [];
  const gridEmoji = createElement('div', { className: 'icon-picker__grid' });
  const emojiLoading = createElement('div', { className: 'text-sm text-secondary', text: 'Loading…' });
  contentEmoji.appendChild(emojiLoading);
  contentEmoji.appendChild(gridEmoji);

  // Icons grid
  let iconList = [];
  const gridIcons = createElement('div', { className: 'icon-picker__grid' });
  const iconLoading = createElement('div', { className: 'text-sm text-secondary', text: 'Loading…' });
  contentIcons.appendChild(iconLoading);
  contentIcons.appendChild(gridIcons);

  // Upload
  const uploadWrap = createElement('div', { className: 'icon-picker__upload' });
  const fileInput = createElement('input', { attrs: { type: 'file', accept: 'image/*' } });
  const uploadBtn = createElement('button', { className: 'btn btn--primary', text: 'Use Image', attrs: { type: 'button' } });
  uploadBtn.addEventListener('click', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBoardIconImage(reader.result);
    reader.readAsDataURL(file);
  });
  uploadWrap.appendChild(fileInput);
  uploadWrap.appendChild(uploadBtn);
  contentUpload.appendChild(uploadWrap);

  // Remove
  const removeBtn = createElement('button', { className: 'btn btn--danger', text: 'Remove Icon', attrs: { type: 'button' } });
  removeBtn.addEventListener('click', removeBoardIcon);
  contentRemove.appendChild(removeBtn);

  picker.appendChild(contentEmoji);
  picker.appendChild(contentIcons);
  picker.appendChild(contentUpload);
  picker.appendChild(contentRemove);

  // Interactions
  Object.values(tabBtns).forEach(btn => btn.addEventListener('click', () => switchIconTab(btn.dataset.tab)));
  shuffle.addEventListener('click', () => {
    if (!emojiList.length) return;
    const random = emojiList[Math.floor(Math.random() * emojiList.length)];
    setBoardEmoji(random);
  });

  // Helpers
  function switchIconTab(tab) {
    Object.values(tabBtns).forEach(b => b.classList.toggle('is-active', b.dataset.tab === tab));
    [contentEmoji, contentIcons, contentUpload, contentRemove].forEach(c => c.classList.toggle('is-active', c.dataset.content === tab));
  }

  function renderEmojiGrid() {
    gridEmoji.replaceChildren();
    emojiList.forEach(e => {
      const cell = createElement('button', { className: 'icon-picker__cell', text: e, attrs: { type: 'button' } });
      cell.addEventListener('click', () => setBoardEmoji(e));
      gridEmoji.appendChild(cell);
    });
  }

  function renderIconGrid() {
    gridIcons.replaceChildren();
    iconList.forEach(src => {
      const cell = createElement('button', { className: 'icon-picker__cell', attrs: { type: 'button' } });
      cell.innerHTML = `<img src="${src}" alt="icon" class="icon-picker__img">`;
      cell.addEventListener('click', () => setBoardIconImage(src));
      gridIcons.appendChild(cell);
    });
  }

  document.body.appendChild(picker);
  positionPopover(picker, anchor);

  // Load data (async)
  loadEmojis();
  loadIcons();

  async function loadEmojis() {
    emojiLoading.textContent = 'Loading…';
    try {
      const cacheKey = 'cascade_emoji_list_v1';
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) {
          emojiList = parsed;
          emojiLoading.remove();
          renderEmojiGrid();
          return;
        }
      }

      // External dataset (Unicode emojis)
      const res = await fetch('https://cdn.jsdelivr.net/npm/emoji.json@13.1.0/emoji.json', { cache: 'force-cache' });
      if (!res.ok) throw new Error(`emoji fetch failed: ${res.status}`);
      const data = await res.json();

      // emoji.json entries look like: { char: "😀", name: "grinning face", ... }
      const list = Array.isArray(data) ? data.map(x => x?.char).filter(Boolean) : [];
      emojiList = list.length ? list : ['😀','😃','😄'];
      try { localStorage.setItem(cacheKey, JSON.stringify(emojiList)); } catch {}
      emojiLoading.remove();
      renderEmojiGrid();
    } catch {
      emojiList = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇'];
      emojiLoading.textContent = 'Offline emoji list';
      renderEmojiGrid();
    }
  }

  async function loadIcons() {
    iconLoading.textContent = 'Loading…';
    try {
      const res = await fetch('./assets/icons-manifest.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`icon manifest fetch failed: ${res.status}`);
      const data = await res.json();
      iconList = Array.isArray(data) ? data.filter(Boolean) : [];
      iconLoading.remove();
      renderIconGrid();
    } catch {
      iconList = ['appicons/yt.png','appicons/gcal.png'];
      iconLoading.textContent = 'No icon manifest';
      renderIconGrid();
    }
  }
}

function positionPopover(pop, anchor) {
  const rect = anchor.getBoundingClientRect();
  pop.style.position = 'fixed';
  pop.style.left = `${rect.left}px`;
  pop.style.top = `${rect.bottom + 6}px`;
  pop.style.bottom = '';
  pop.style.zIndex = '1000';

  const vh = window.innerHeight;
  const h = pop.offsetHeight || 0;
  if (rect.bottom + 6 + h > vh - 8) {
    pop.style.top = '';
    pop.style.bottom = `${vh - rect.top + 6}px`;
  }
  const vw = window.innerWidth;
  const w = pop.offsetWidth || 0;
  if (rect.left + w > vw - 8) {
    pop.style.left = `${Math.max(8, vw - w - 8)}px`;
  }
}

function closeIconPicker() {
  $$('.icon-picker').forEach(p => p.remove());
}

// ==========================================================================
// COVER PICKER (Gallery | Unsplash | Upload | Remove)
// ==========================================================================

function openCoverPicker(anchor) {
  if (!anchor) return;
  closeCoverPicker();
  closeIconPicker();

  const picker = createElement('div', { className: 'icon-picker cover-picker' });

  const header = createElement('div', { className: 'icon-picker__header' });
  const tabs = [
    { id: 'gallery', label: 'Gallery' },
    { id: 'unsplash', label: 'Unsplash' },
    { id: 'upload', label: 'Upload' },
    { id: 'remove', label: 'Remove' }
  ];
  const tabBtns = {};
  tabs.forEach((t, i) => {
    const btn = createElement('button', {
      className: `icon-picker__tab ${i === 0 ? 'is-active' : ''}`,
      text: t.label,
      attrs: { type: 'button', 'data-tab': t.id }
    });
    tabBtns[t.id] = btn;
    header.appendChild(btn);
  });
  picker.appendChild(header);

  const contentGallery = createElement('div', { className: 'icon-picker__content is-active', attrs: { 'data-content': 'gallery' } });
  const contentUnsplash = createElement('div', { className: 'icon-picker__content', attrs: { 'data-content': 'unsplash' } });
  const contentUpload = createElement('div', { className: 'icon-picker__content', attrs: { 'data-content': 'upload' } });
  const contentRemove = createElement('div', { className: 'icon-picker__content', attrs: { 'data-content': 'remove' } });

  // Gallery grid (local covers)
  const gridGallery = createElement('div', { className: 'icon-picker__grid cover-picker__grid' });
  COVER_IMAGES.forEach((src) => {
    const cell = createElement('button', { className: 'icon-picker__cell cover-picker__cell', attrs: { type: 'button' } });
    cell.innerHTML = `<img src="${src}" alt="cover" class="cover-picker__img">`;
    cell.addEventListener('click', () => {
      setBoardCoverImage(src);
      closeCoverPicker();
    });
    gridGallery.appendChild(cell);
  });
  contentGallery.appendChild(gridGallery);

  // Unsplash grid (no-key via source.unsplash.com)
  const unsplashLoading = createElement('div', { className: 'text-sm text-secondary', text: 'Loading…' });
  const gridUnsplash = createElement('div', { className: 'icon-picker__grid cover-picker__grid' });
  contentUnsplash.appendChild(unsplashLoading);
  contentUnsplash.appendChild(gridUnsplash);
  let unsplashLoaded = false;

  // Upload
  const uploadWrap = createElement('div', { className: 'icon-picker__upload' });
  const fileInput = createElement('input', { attrs: { type: 'file', accept: 'image/*' } });
  const uploadBtn = createElement('button', { className: 'btn btn--primary', text: 'Use Image', attrs: { type: 'button' } });
  uploadBtn.addEventListener('click', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBoardCoverImage(String(reader.result || ''));
      closeCoverPicker();
    };
    reader.readAsDataURL(file);
  });
  uploadWrap.appendChild(fileInput);
  uploadWrap.appendChild(uploadBtn);
  contentUpload.appendChild(uploadWrap);

  // Remove
  const removeBtn = createElement('button', { className: 'btn btn--danger', text: 'Remove cover', attrs: { type: 'button' } });
  removeBtn.addEventListener('click', () => {
    removeBoardCover();
    closeCoverPicker();
  });
  contentRemove.appendChild(removeBtn);

  picker.appendChild(contentGallery);
  picker.appendChild(contentUnsplash);
  picker.appendChild(contentUpload);
  picker.appendChild(contentRemove);

  Object.values(tabBtns).forEach(btn => btn.addEventListener('click', () => switchCoverTab(btn.dataset.tab)));

  function switchCoverTab(tab) {
    Object.values(tabBtns).forEach(b => b.classList.toggle('is-active', b.dataset.tab === tab));
    [contentGallery, contentUnsplash, contentUpload, contentRemove].forEach(c => c.classList.toggle('is-active', c.dataset.content === tab));
    if (tab === 'unsplash' && !unsplashLoaded) loadUnsplash();
  }

  function loadUnsplash() {
    unsplashLoaded = true;
    unsplashLoading.textContent = 'Loading…';

    const topics = ['nature', 'space', 'abstract', 'gradient', 'texture'];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const count = 12;
    const urls = Array.from({ length: count }, (_, i) => `https://source.unsplash.com/random/800x400?${encodeURIComponent(topic)}&sig=${Date.now() + i}`);

    gridUnsplash.replaceChildren();
    urls.forEach((url) => {
      const cell = createElement('button', { className: 'icon-picker__cell cover-picker__cell', attrs: { type: 'button' } });
      const img = document.createElement('img');
      img.className = 'cover-picker__img';
      img.alt = 'Unsplash cover';
      img.loading = 'lazy';
      img.src = url;
      cell.appendChild(img);
      cell.addEventListener('click', () => {
        const chosen = img.currentSrc || img.src;
        if (chosen) setBoardCoverImage(chosen);
        closeCoverPicker();
      });
      gridUnsplash.appendChild(cell);
    });

    unsplashLoading.remove();
  }

  document.body.appendChild(picker);
  positionPopover(picker, anchor);
}

function closeCoverPicker() {
  $$('.cover-picker').forEach(p => p.remove());
}

function setBoardEmoji(emoji) {
  const iconDisplay = $('#iconDisplay');
  if (!iconDisplay) return;
  iconDisplay.textContent = emoji;
  iconDisplay.style.backgroundImage = '';
  closeIconPicker();
}

function setBoardIconImage(src) {
  const iconDisplay = $('#iconDisplay');
  if (!iconDisplay) return;
  iconDisplay.textContent = '';
  iconDisplay.style.backgroundImage = `url('${src}')`;
  iconDisplay.style.backgroundSize = 'cover';
  iconDisplay.style.backgroundPosition = 'center';
  closeIconPicker();
}

function removeBoardIcon() {
  const iconDisplay = $('#iconDisplay');
  if (!iconDisplay) return;
  iconDisplay.textContent = '';
  iconDisplay.style.backgroundImage = '';
  closeIconPicker();
}

// ==========================================================================
// ADD BLOCK HANDLING
// ==========================================================================

function handleAddBlockClick(e) {
  const addBtn = e.target.closest('.js-add-block, .js-add-block-row, .js-add-block-nested');
  if (!addBtn) return;
  
  e.stopPropagation();
  closeAllMenus();
  
  // Determine which menu to show
  const isNested = addBtn.classList.contains('js-add-block-nested');
  const isRowButton = addBtn.classList.contains('js-add-block-row');
  const tools = isNested ? TOOLS.ADD_BLOCKS_NESTED : TOOLS.ADD_BLOCKS;
  
  // Set print mode and target row
  if (isNested) {
    state.printMode = addBtn.dataset.parentId;
    state.targetRow = null;
  } else if (isRowButton && addBtn.dataset.rowId) {
    // Row button - add to this specific row
    state.printMode = 'board';
    state.targetRow = addBtn.dataset.rowId;
  } else {
    state.printMode = 'board';
    state.targetRow = null;
  }
  
  // Create and show menu
  const menu = createToolMenu(tools, null);
  positionMenu(menu, addBtn);
  document.body.appendChild(menu);
}

// ==========================================================================
// BLOCK MENU (EDIT)
// ==========================================================================

function handleBlockMenuClick(e) {
  const menuBtn = e.target.closest('.js-block-menu');
  if (!menuBtn) return;
  
  e.stopPropagation();
  closeAllMenus();
  
  const blockId = menuBtn.dataset.blockId;
  const blockType = menuBtn.dataset.blockType || 'text';
  
  // Get appropriate tools
  let tools;
  switch (blockType) {
    case 'link':
      tools = TOOLS.LINK;
      break;
    case 'separator':
      tools = TOOLS.DEFAULT;
      break;
    case 'gcal':
      tools = TOOLS.GCAL;
      break;
    default:
      tools = TOOLS.TEXT;
  }
  
  const menu = createToolMenu(tools, blockId);
  positionMenu(menu, menuBtn);
  document.body.appendChild(menu);
}

// ==========================================================================
// SIZE MENU (Groups/Galleries)
// ==========================================================================

function handleSizeMenuClick(e) {
  const menuBtn = e.target.closest('.js-size-menu');
  if (!menuBtn) return;
  
  e.stopPropagation();
  closeAllMenus();
  closeSizeMenus();
  
  const blockId = menuBtn.dataset.blockId;
  const menu = createSizeMenu(blockId);
  positionMenu(menu, menuBtn);
  document.body.appendChild(menu);
}

function createSizeMenu(blockId) {
  const menu = createElement('div', {
    className: 'size-menu',
    data: { blockId }
  });
  
  const sizes = [
    { id: 'quarter', label: '1/4', width: '25%' },
    { id: 'half', label: '1/2', width: '50%' },
    { id: 'three-quarter', label: '3/4', width: '75%' },
    { id: 'three-fifth', label: '3/5', width: '60%' }
  ];
  
  sizes.forEach(size => {
    const item = createElement('div', {
      className: 'size-menu__item',
      text: size.label,
      data: { blockId, width: size.width }
    });
    
    item.addEventListener('click', () => {
      const block = document.querySelector(`[data-block-id="${blockId}"]`);
      if (block) {
        block.style.width = size.width;
        block.style.flex = 'none';
      }
      closeSizeMenus();
    });
    
    menu.appendChild(item);
  });
  
  return menu;
}

function closeSizeMenus() {
  $$('.size-menu').forEach(menu => menu.remove());
}

// ==========================================================================
// TOOL MENU CREATION
// ==========================================================================

function createToolMenu(tools, blockId) {
  const menu = createElement('div', {
    className: 'tools-menu',
    data: { blockId: blockId || '' }
  });
  
  Object.entries(tools).forEach(([sectionName, items]) => {
    // Check if this section has tabs
    if (items && typeof items === 'object' && items.tabs) {
      const section = createElement('div', { className: 'tools-menu__section' });
      
      // Section label
      const label = createElement('div', {
        className: 'tools-menu__label',
        text: sectionName
      });
      section.appendChild(label);
      
      // Create tabs container
      const tabsContainer = createElement('div', { className: 'tools-menu__tabs' });
      
      Object.entries(items).forEach(([tabName, tabItems]) => {
        if (tabName === 'tabs') return; // Skip the tabs flag
        
        // Create tab button with popover
        const tabBtn = createElement('div', {
          className: 'tools-menu__tab',
          text: tabName
        });
        
        // Create popover
        const popover = createElement('div', {
          className: 'tools-menu__tab-popover'
        });
        
        // Add items to popover
        tabItems.forEach(item => {
          const itemEl = createElement('div', {
            className: `tools-menu__item ${item.colorClass || ''} ${item.action === 'delete' ? 'tools-menu__item--danger' : ''}`,
            data: {
              action: item.action,
              value: item.class || '',
              blockId: blockId || ''
            }
          });
          
          // Icon
          const iconEl = createElement('span', { className: 'tools-menu__icon' });
          if (item.img) {
            iconEl.innerHTML = `<img src="${item.img}" alt="${item.label}" class="icon icon--sm">`;
          } else {
            iconEl.textContent = item.icon;
          }
          
          // Label
          const labelEl = createElement('span', { text: item.label });
          
          itemEl.appendChild(iconEl);
          itemEl.appendChild(labelEl);
          popover.appendChild(itemEl);
        });
        
        // Position popover on hover with bottom clipping prevention
        tabBtn.addEventListener('mouseenter', () => {
          const rect = tabBtn.getBoundingClientRect();
          popover.style.left = `${rect.right + 4}px`;
          popover.style.top = `${rect.top}px`;
          popover.style.bottom = '';

          // Measure and adjust if clipping bottom
          const viewportHeight = window.innerHeight;
          const popHeight = popover.offsetHeight || 0;
          const popBottomY = rect.top + popHeight;
          if (popBottomY > viewportHeight - 8) {
            popover.style.top = '';
            popover.style.bottom = `${viewportHeight - rect.bottom + 4}px`;
          }
        });
        
        tabBtn.appendChild(popover);
        tabsContainer.appendChild(tabBtn);
      });
      
      section.appendChild(tabsContainer);
      menu.appendChild(section);
      
    } else {
      // Regular section (no tabs)
      const section = createElement('div', { className: 'tools-menu__section' });
      
      // Section label
      const label = createElement('div', {
        className: 'tools-menu__label',
        text: sectionName
      });
      section.appendChild(label);
      
      // Section items
      items.forEach(item => {
        const itemEl = createElement('div', {
          className: `tools-menu__item ${item.colorClass || ''} ${item.action === 'delete' ? 'tools-menu__item--danger' : ''}`,
          data: {
            action: item.action,
            value: item.class || '',
            blockId: blockId || ''
          }
        });
        
        // Icon
        const iconEl = createElement('span', { className: 'tools-menu__icon' });
        if (item.img) {
          iconEl.innerHTML = `<img src="${item.img}" alt="${item.label}" class="icon icon--sm">`;
        } else {
          iconEl.textContent = item.icon;
        }
        
        // Label
        const labelEl = createElement('span', { text: item.label });
        
        itemEl.appendChild(iconEl);
        itemEl.appendChild(labelEl);
        section.appendChild(itemEl);
      });
      
      menu.appendChild(section);
    }
  });
  
  return menu;
}

function positionMenu(menu, anchor) {
  const rect = anchor.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.bottom = '';
  menu.style.zIndex = '1000';

  // Ensure the element is in the DOM to measure height
  let appendedTemporarily = false;
  if (!menu.isConnected) {
    appendedTemporarily = true;
    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);
  }

  const viewportHeight = window.innerHeight;
  const menuHeight = menu.offsetHeight || 0;
  const bottomY = rect.bottom + 4 + menuHeight;

  // If the menu would clip past the bottom, anchor from bottom (open upward)
  if (bottomY > viewportHeight - 8) {
    menu.style.top = '';
    menu.style.bottom = `${viewportHeight - rect.top + 4}px`;
  }

  if (appendedTemporarily) {
    menu.style.visibility = '';
  }
}

// ==========================================================================
// TOOL ACTIONS
// ==========================================================================

function handleToolAction(e) {
  const item = e.target.closest('.tools-menu__item');
  if (!item) return;
  
  const action = item.dataset.action;
  const value = item.dataset.value;
  const blockId = item.dataset.blockId;
  
  closeAllMenus();
  
  // Add block actions
  if (action.startsWith('add-')) {
    handleAddAction(action);
    return;
  }
  
  // Block modification actions
  switch (action) {
    case 'delete':
      deleteBlock(blockId);
      break;
    case 'size':
      changeBlockSize(blockId, value);
      break;
    case 'color':
      changeBlockColor(blockId, value);
      break;
    case 'align':
      changeBlockAlign(blockId, value);
      break;
    case 'edit-link':
      editLinkBlock(blockId);
      break;
    case 'edit-icon':
      openIconPicker(document.getElementById('iconDisplay'));
      break;
    case 'remove-icon':
      removeBoardIcon();
      break;
    // Google Calendar block actions
    case 'gcal-size':
      changeGCalSize(blockId, value);
      break;
    case 'gcal-height':
      changeGCalHeight(blockId, value);
      break;
    case 'gcal-bg':
      changeGCalBackground(blockId, value);
      break;
    case 'gcal-reconnect':
      reconnectGCal(blockId);
      break;
  }
}

function handleAddAction(action) {
  switch (action) {
    case 'add-text':
      createTextBlock();
      break;
    case 'add-checklist':
      createChecklistBlock();
      break;
    case 'add-callout':
      createCalloutBlock();
      break;
    case 'add-quote':
      createQuoteBlock();
      break;
    case 'add-separator':
      createSeparatorBlock();
      break;
    case 'add-link':
      showLinkForm();
      break;
    case 'add-dropdown':
      createDropdownBlock();
      break;
    case 'add-group':
      createGroupBlock();
      break;
    case 'add-gallery':
      createGalleryBlock();
      break;
    case 'add-gcal':
      createGCalBlock();
      break;
    case 'add-image':
    case 'add-video':
    case 'add-youtube':
      alert(`${action.replace('add-', '').toUpperCase()} embed coming soon!`);
      break;
  }
}

// ==========================================================================
// BLOCK MODIFICATIONS
// ==========================================================================

function changeBlockSize(blockId, sizeClass) {
  const block = $(`[data-block-id="${blockId}"]`);
  if (!block) return;
  
  const content = block.querySelector('.item__content');
  if (!content) return;
  
  // Remove existing size classes
  SIZE_CLASSES.forEach(cls => content.classList.remove(cls));
  
  // Add new size class
  if (sizeClass) {
    content.classList.add(sizeClass);
  }
}

function changeBlockColor(blockId, colorClass) {
  const block = $(`[data-block-id="${blockId}"]`);
  if (!block) return;
  
  const content = block.querySelector('.item__content');
  if (!content) return;
  
  // Remove existing text color classes
  COLOR_CLASSES.forEach(cls => content.classList.remove(cls));
  
  // Remove existing background color classes
  BG_CLASSES.forEach(cls => content.classList.remove(cls));
  
  // Add new color class (can be text or background)
  if (colorClass) {
    content.classList.add(colorClass);
  }
}

function changeBlockAlign(blockId, alignClass) {
  const block = $(`[data-block-id="${blockId}"]`);
  if (!block) return;
  
  const content = block.querySelector('.item__content');
  if (!content) return;
  
  // Remove existing align classes
  ALIGN_CLASSES.forEach(cls => content.classList.remove(cls));
  
  // Add new align class
  if (alignClass) {
    content.classList.add(alignClass);
  }
}

function editLinkBlock(blockId) {
  const block = $(`[data-block-id="${blockId}"]`);
  if (!block) return;
  
  const contentDiv = block.querySelector('.item__content--link');
  if (!contentDiv) return;
  
  // Get current values
  const currentText = contentDiv.textContent || '';
  const currentUrl = block.dataset.url || contentDiv.dataset.url || '';
  
  // Create edit form using the same floating form style
  const existingOverlay = document.querySelector('.link-form-overlay');
  if (existingOverlay) existingOverlay.remove();
  
  const overlay = createElement('div', {
    className: 'link-form-overlay'
  });
  
  const form = createElement('div', {
    className: 'link-form',
    html: `
      <div class="link-form__header">Edit Link</div>
      <input type="text" class="link-form__input" id="editLinkTitle" placeholder="Link title..." value="${currentText}">
      <input type="text" class="link-form__input" id="editLinkUrl" placeholder="URL..." value="${currentUrl}">
      <div class="link-form__actions">
        <button type="button" class="link-form__btn link-form__btn--cancel">Cancel</button>
        <button type="button" class="link-form__btn link-form__btn--done">Save</button>
      </div>
    `
  });
  
  overlay.appendChild(form);
  document.body.appendChild(overlay);
  
  const titleInput = form.querySelector('#editLinkTitle');
  const urlInput = form.querySelector('#editLinkUrl');
  const saveBtn = form.querySelector('.link-form__btn--done');
  const cancelBtn = form.querySelector('.link-form__btn--cancel');
  
  const cleanup = () => overlay.remove();
  
  const save = () => {
    const newText = titleInput.value.trim();
    const newUrl = urlInput.value.trim();
    
    if (!newText || !newUrl) {
      if (!newText) titleInput.focus();
      else urlInput.focus();
      return;
    }
    
    // Update the block
    contentDiv.textContent = newText;
    const normalizedUrl = newUrl.startsWith('http') ? newUrl : `https://${newUrl}`;
    block.dataset.url = normalizedUrl;
    contentDiv.dataset.url = normalizedUrl;
    
    cleanup();
    debouncedSave();
  };
  
  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', cleanup);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup();
  });
  
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      urlInput.focus();
      urlInput.select();
    } else if (e.key === 'Escape') {
      cleanup();
    }
  });
  
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      cleanup();
    }
  });
  
  // Select the title input text
  titleInput.focus();
  titleInput.select();
}

// ==========================================================================
// GOOGLE CALENDAR BLOCK MODIFICATIONS
// ==========================================================================

const GCAL_SIZE_CLASSES = ['gcal--full', 'gcal--three-quarter', 'gcal--half', 'gcal--quarter'];
const GCAL_HEIGHT_CLASSES = ['gcal--tall', 'gcal--medium', 'gcal--short'];
const GCAL_BG_CLASSES = ['gcal-bg--gray', 'gcal-bg--blue', 'gcal-bg--green', 'gcal-bg--yellow', 'gcal-bg--red', 'gcal-bg--purple'];

function changeGCalSize(blockId, sizeClass) {
  const block = $(`[data-block-id="${blockId}"]`);
  if (!block) return;
  
  // Remove existing size classes
  GCAL_SIZE_CLASSES.forEach(cls => block.classList.remove(cls));
  
  // Add new size class
  if (sizeClass) {
    block.classList.add(sizeClass);
  }
}

function changeGCalHeight(blockId, heightClass) {
  const block = $(`[data-block-id="${blockId}"]`);
  if (!block) return;
  
  // Remove existing height classes
  GCAL_HEIGHT_CLASSES.forEach(cls => block.classList.remove(cls));
  
  // Add new height class
  if (heightClass) {
    block.classList.add(heightClass);
  }
}

function changeGCalBackground(blockId, bgClass) {
  const block = $(`[data-block-id="${blockId}"]`);
  if (!block) return;
  
  const wrapper = block.querySelector('.gcal-block__wrapper');
  if (!wrapper) return;
  
  // Remove existing background classes
  GCAL_BG_CLASSES.forEach(cls => wrapper.classList.remove(cls));
  
  // Add new background class
  if (bgClass) {
    wrapper.classList.add(bgClass);
  }
}

function reconnectGCal(blockId) {
  const block = $(`[data-block-id="${blockId}"]`);
  if (!block) return;
  
  const content = block.querySelector('.gcal-block__content');
  if (!content) return;
  
  // Clear the calendar ID and show setup prompt again
  block.dataset.calendarId = '';
  
  content.innerHTML = `
    <div class="gcal-block__setup">
      <div class="gcal-block__instructions">
        <p><strong>Connect your Google Calendar</strong></p>
        <p class="text-secondary text-sm">Enter your calendar ID or the full embed URL from Google Calendar settings.</p>
      </div>
      <div class="gcal-block__input-wrapper">
        <input type="text" class="gcal-block__input input" placeholder="Calendar ID or embed URL (e.g., your@email.com or full iframe URL)">
        <div class="gcal-block__mode-wrapper">
          <span class="text-sm text-secondary">View: </span>
          <select class="gcal-block__mode-select input">
            <option value="MONTH">Month</option>
            <option value="WEEK">Week</option>
            <option value="AGENDA">Agenda</option>
          </select>
        </div>
        <button type="button" class="btn btn--primary gcal-connect-btn">Connect</button>
      </div>
    </div>
  `;
  
  // Re-attach event listeners
  const connectBtn = content.querySelector('.gcal-connect-btn');
  const input = content.querySelector('.gcal-block__input');
  const modeSelect = content.querySelector('.gcal-block__mode-select');
  
  connectBtn.addEventListener('click', () => {
    const value = input.value.trim();
    if (!value) {
      input.focus();
      return;
    }
    
    // Parse calendar ID
    let parsedId = null;
    if (/^[\w.-]+@[\w.-]+$/.test(value)) {
      parsedId = value;
    } else {
      const srcMatch = value.match(/src=([^&]+)/i);
      if (srcMatch) {
        try { parsedId = decodeURIComponent(srcMatch[1]); } catch { parsedId = srcMatch[1]; }
      } else {
        const emailMatch = value.match(/([\w.-]+@[\w.-]+\.[a-z]{2,})/i);
        if (emailMatch) parsedId = emailMatch[1];
      }
    }
    
    if (parsedId) {
      block.dataset.calendarId = parsedId;
      const selectedMode = modeSelect.value;
      
      const encodedId = encodeURIComponent(parsedId);
      const embedUrl = `https://calendar.google.com/calendar/embed?src=${encodedId}&mode=${selectedMode}&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=1`;
      
      content.innerHTML = '';
      
      const iframe = document.createElement('iframe');
      iframe.className = 'gcal-block__iframe';
      iframe.src = embedUrl;
      iframe.frameBorder = '0';
      iframe.scrolling = 'no';
      iframe.loading = 'lazy';
      content.appendChild(iframe);
      
      // Add mode switcher
      const switcher = document.createElement('div');
      switcher.className = 'gcal-block__mode-switcher';
      
      const modes = [
        { value: 'MONTH', label: 'Month' },
        { value: 'WEEK', label: 'Week' },
        { value: 'AGENDA', label: 'Agenda' }
      ];
      
      modes.forEach(mode => {
        const btn = document.createElement('button');
        btn.className = `gcal-block__mode-btn ${mode.value === selectedMode ? 'is-active' : ''}`;
        btn.textContent = mode.label;
        btn.type = 'button';
        btn.dataset.mode = mode.value;
        
        btn.addEventListener('click', () => {
          switcher.querySelectorAll('.gcal-block__mode-btn').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          
          const oldIframe = content.querySelector('.gcal-block__iframe');
          if (oldIframe) {
            const newUrl = `https://calendar.google.com/calendar/embed?src=${encodedId}&mode=${mode.value}&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=1`;
            const newIframe = document.createElement('iframe');
            newIframe.className = 'gcal-block__iframe';
            newIframe.src = newUrl;
            newIframe.frameBorder = '0';
            newIframe.scrolling = 'no';
            newIframe.loading = 'lazy';
            oldIframe.replaceWith(newIframe);
          }
        });
        
        switcher.appendChild(btn);
      });
      
      content.appendChild(switcher);
    } else {
      alert('Invalid calendar ID or URL. Please check your input.');
    }
  });
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      connectBtn.click();
    }
  });
  
  // Focus the input
  setTimeout(() => input.focus(), 10);
}

// ==========================================================================
// KEYBOARD HANDLING
// ==========================================================================

function handleKeydown(e) {
  const activeEl = document.activeElement;
  const isEditable = activeEl?.matches('[contenteditable="true"], input, textarea');

  // Shift + A: create a new text item (robust across browsers)
if (e.shiftKey && (
    (typeof e.code === 'string' && e.code.toLowerCase() === 'keya') ||
    (typeof e.key === 'string' && e.key.toLowerCase() === 'a')
)) {
    e.preventDefault();
    createTextBlock();
    return;
}
// COMMAND + B: create nested text item when focused on dropdown header
if (e.metaKey && typeof e.key === 'string' && e.key.toLowerCase() === 'b' && isEditable && activeEl?.isContentEditable) {
    const dropdownHeader = activeEl.closest('.dropdown-block__header');
    if (dropdownHeader) {
        e.preventDefault();

        const dropdownBlock = activeEl.closest('.dropdown-block');
        const dropdownContent = dropdownBlock?.querySelector('.dropdown-block__content');
        if (dropdownBlock && dropdownContent?.id) {
            dropdownBlock.classList.add('is-open');
            state.printMode = dropdownContent.id;
            state.targetRow = null;
            state.listMode = '';
            createTextBlock({ type: 'text', placeholder: 'Type something...', content: '' });
        }
        return;
    }
}
  // Save shortcut
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveNotes();
    return;
  }
  
  // Navigation between blocks
  if (isEditable && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    const content = activeEl.textContent || activeEl.value || '';
    const atEnd = activeEl.selectionStart === content.length;
    const atStart = activeEl.selectionStart === 0;
    
    if ((e.key === 'ArrowDown' && atEnd) || (e.key === 'ArrowUp' && atStart)) {
      e.preventDefault();
      focusAdjacentBlock(e.key === 'ArrowDown' ? 'next' : 'prev');
    }
    return;
  }
  
  // Enter to create new block
  if (e.key === 'Enter' && isEditable && !e.shiftKey) {
    const content = activeEl.textContent?.trim() || activeEl.value?.trim() || '';
    
    if (content) {
      e.preventDefault();
      
      // Validate printMode - ensure the target container exists
      if (state.printMode && state.printMode !== 'board') {
        const targetContainer = document.getElementById(state.printMode);
        if (!targetContainer) {
          // Container doesn't exist, reset to board
          state.printMode = 'board';
          state.targetRow = null;
        }
      }
      
      // Check if we're in a dropdown header - if so, create block inside the dropdown
      const dropdownHeader = activeEl.closest('.dropdown-block__header');
      if (dropdownHeader) {
        const dropdownBlock = activeEl.closest('.dropdown-block');
        const dropdownContent = dropdownBlock?.querySelector('.dropdown-block__content');
        if (dropdownBlock && dropdownContent?.id) {
          dropdownBlock.classList.add('is-open');
          state.printMode = dropdownContent.id;
          state.targetRow = null;
        }
      }
      
      // Determine block type based on listMode
      if (state.listMode === 'checklist') {
        createChecklistBlock();
      } else {
        createTextBlock();
      }
      
      // Focus the new block (handled by createTextBlock/createChecklistBlock)
    } else if (content === '') {
      // Show add block menu on empty enter
      e.preventDefault();
      const block = activeEl.closest('.item');
      if (block) {
        const menu = createToolMenu(TOOLS.ADD_BLOCKS, null);
        positionMenu(menu, activeEl);
        document.body.appendChild(menu);
      }
    }
    return;
  }
  
  // Backspace to delete empty block
  if (e.key === 'Backspace' && isEditable) {
    const content = activeEl.textContent?.trim() || activeEl.value?.trim() || '';
    
    if (content === '') {
      e.preventDefault();
      
      const block = activeEl.closest('[data-block-id]');
      if (block) {
        focusAdjacentBlock('prev');
        deleteBlock(block.dataset.blockId);
      }
    }
    return;
  }
  
  // Space for bullet markers
  if (e.key === ' ' && isEditable) {
    const content = activeEl.textContent || activeEl.value || '';
    
    for (const marker of BULLET_MARKERS) {
      if (content.trim() === marker.trigger) {
        e.preventDefault();
        
        if (activeEl.isContentEditable) {
          activeEl.textContent = marker.replace;
        } else {
          activeEl.value = marker.replace;
        }
        
        state.listMode = marker.mode;
        focusAtEnd(activeEl);
        break;
      }
    }
    return;
  }
  
  // Escape to cancel bullet mode
  if (e.key === 'Escape') {
    state.listMode = '';
    closeAllMenus();
  }
}

// ==========================================================================
// INPUT & FOCUS HANDLING
// ==========================================================================

function handleInput(e) {
  state.lastEdit = Date.now();
  
  // Handle empty state styling
  const el = e.target;
  if (el.matches('[contenteditable="true"]')) {
    if (el.textContent.trim() === '') {
      el.classList.add('is-empty');
    } else {
      el.classList.remove('is-empty');
    }
  }
  
  // Trigger debounced save for real-time collaboration
  debouncedSave();
}

function handleFocusIn(e) {
  const target = e.target;
  
  // Check if we're inside a nested container (dropdown content, group content, gallery panel)
  // These containers have IDs and data-parent-id attributes
  const dropdownContent = target.closest('.dropdown-block__content');
  const groupContent = target.closest('.group-block__content');
  const galleryPanel = target.closest('.gallery-block__panel');
  
  const nestedContainer = dropdownContent || groupContent || galleryPanel;
  
  if (nestedContainer && nestedContainer.id) {
    // We're inside a nested container - set printMode to its ID
    state.printMode = nestedContainer.id;
    state.targetRow = null; // Nested blocks don't use rows
  } else if (target.closest('.item-row')) {
    // We're in a row on the main board
    const row = target.closest('.item-row');
    const items = row.querySelectorAll('.item');
    // If row has multiple items, set targetRow so new blocks append to same row
    if (items.length > 1) {
      state.printMode = 'board';
      state.targetRow = row.id;
    } else {
      state.printMode = 'board';
      state.targetRow = null;
    }
  } else {
    // Top-level or unknown - default to board
    state.printMode = 'board';
    state.targetRow = null;
  }
}

/**
 * Handle when user stops editing (loses focus)
 * This is where we apply any pending remote updates
 */
function handleFocusOut(e) {
  const target = e.target;
  
  // Only care about contenteditable elements
  if (!target.matches('[contenteditable="true"]')) return;
  
  // Small delay to check if focus moved to another editable element
  setTimeout(() => {
    const activeEl = document.activeElement;
    const isStillEditing = activeEl?.matches('[contenteditable="true"]');
    
    if (!isStillEditing) {
      // User stopped editing - apply any pending remote updates
      applyPendingRemoteUpdates();
    }
  }, 100);
}

/**
 * Handle clicks on the main board area - reset printMode when clicking outside containers
 */
function handleBoardClick(e) {
  const target = e.target;
  
  // If clicking directly on the board container or empty space
  if (target.id === 'boardItems' || target.closest('.board-content')) {
    // Check if we're NOT inside any nested container
    const isInsideNested = target.closest('.dropdown-block__content') ||
                           target.closest('.group-block__content') ||
                           target.closest('.gallery-block__panel');
    
    // Check if we're NOT inside any block
    const isInsideBlock = target.closest('[data-block-id]');
    
    if (!isInsideNested && !isInsideBlock) {
      // Clicked on empty board space - reset to board mode
      state.printMode = 'board';
      state.targetRow = null;
      state.listMode = '';
    }
  }
}

function handleOutsideClick(e) {
  // Close menus when clicking outside
  if (
    !e.target.closest('.tools-menu') &&
    !e.target.closest('.size-menu') &&
    !e.target.closest('.js-block-menu') &&
    !e.target.closest('.js-size-menu') &&
    !e.target.closest('.js-add-block') &&
    !e.target.closest('.js-add-block-row') &&
    !e.target.closest('.js-add-block-nested') &&
    !e.target.closest('.icon-picker') &&
    !e.target.closest('.cover-picker') &&
    !e.target.closest('#iconDisplay') &&
    !e.target.closest('.js-cover-icon') &&
    !e.target.closest('.js-add-cover')
  ) {
    closeAllMenus();
    closeSizeMenus();
    closeIconPicker();
    closeCoverPicker();
  }
  
  // Close share panel
  if (!e.target.closest('.share-panel')) {
    closeSharePanel();
  }
}

// ==========================================================================
// HELPERS
// ==========================================================================

function closeAllMenus() {
  $$('.tools-menu').forEach(menu => menu.remove());
  closeIconPicker();
  closeCoverPicker();
}

function closeSharePanel() {
  const dropdown = document.getElementById('shareDropdown');
  if (dropdown) {
    dropdown.classList.remove('is-open');
  }
}

// ==========================================================================
// SIDEBAR TOGGLE
// ==========================================================================

function toggleSidebar() {
  const sidebar = $('#sidebar');
  if (!sidebar) return;
  
  const isCollapsed = sidebar.classList.toggle('is-collapsed');
  
  // Save preference to localStorage
  try {
    localStorage.setItem('cascade_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  } catch (e) {
    // localStorage not available
  }
}

// Restore sidebar state on load
function restoreSidebarState() {
  try {
    const isCollapsed = localStorage.getItem('cascade_sidebar_collapsed') === 'true';
    if (isCollapsed) {
      $('#sidebar')?.classList.add('is-collapsed');
    }
  } catch (e) {
    // localStorage not available
  }
}

// Call restore on script load
restoreSidebarState();

function initializeBlocks() {
  // Initialize empty placeholders
  $$('[contenteditable="true"]').forEach(el => {
    if (el.textContent.trim() === '') {
      el.classList.add('is-empty');
    }
  });
  
  // Initialize checkbox states
  $$('.checklist__checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const checklist = checkbox.closest('.checklist');
      if (checklist) {
        checklist.classList.toggle('is-checked', checkbox.checked);
      }
    });
  });
  
  // Initialize dropdown toggles
  $$('.dropdown-block__toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const block = toggle.closest('.dropdown-block');
      if (block) {
        block.classList.toggle('is-open');
      }
    });
  });
  
  // Initialize link clicks
  $$('[data-url]').forEach(link => {
    link.addEventListener('click', (e) => {
      if (document.activeElement !== link) {
        e.preventDefault();
        window.open(link.dataset.url, '_blank');
      }
    });
  });
}

// ==========================================================================
// EXPORTS
// ==========================================================================

export { closeAllMenus, initializeBlocks };
