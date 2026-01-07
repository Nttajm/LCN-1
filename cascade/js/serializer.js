/**
 * ==========================================================================
 * CASCADE - Block Serializer
 * ==========================================================================
 * Converts DOM blocks to/from a structured JSON format for storage.
 * This preserves all block data while allowing event listeners to be
 * reattached on load.
 * 
 * Format: Each block is stored as an object with type, id, content, and props
 * Example:
 * {
 *   type: 'text',
 *   id: 'block-abc123',
 *   content: 'Hello world',
 *   props: { variant: 'title', color: 'default', size: 'full' }
 * }
 */

// ==========================================================================
// SERIALIZATION (DOM → JSON)
// ==========================================================================

/**
 * Serialize the entire board to a structured format
 * @returns {Object} Board data object
 */
export function serializeBoard() {
  const boardItems = document.getElementById('boardItems');
  if (!boardItems) return { rows: [], cover: null, icon: null, boardBackground: null };
  
  // Get cover and icon data
  const cover = serializeCover();
  const icon = serializeIcon();
  const boardBackground = serializeBoardBackground();
  
  // Serialize all rows
  const rows = [];
  boardItems.querySelectorAll(':scope > .item-row').forEach(row => {
    const rowData = serializeRow(row);
    if (rowData.blocks.length > 0) {
      rows.push(rowData);
    }
  });
  
  return { rows, cover, icon, boardBackground };
}

/**
 * Serialize cover data
 */
function serializeCover() {
  const cover = document.getElementById('boardCover');
  if (!cover) return null;
  
  const bgImage = cover.style.backgroundImage;
  if (!bgImage || bgImage === 'none') return null;
  
  // Extract URL from url('...')
  const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
  return match ? match[1] : null;
}

/**
 * Serialize icon data
 */
function serializeIcon() {
  const iconDisplay = document.getElementById('iconDisplay');
  if (!iconDisplay) return null;
  
  const text = iconDisplay.textContent?.trim();
  const bgImage = iconDisplay.style.backgroundImage;
  
  if (text) {
    return { type: 'emoji', value: text };
  } else if (bgImage && bgImage !== 'none') {
    const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
    return match ? { type: 'image', value: match[1] } : null;
  }
  
  return null;
}

/**
 * Serialize board background data
 */
function serializeBoardBackground() {
  const board = document.getElementById('board');
  if (!board) return null;
  
  const bgClasses = [
    'board-bg--gray', 'board-bg--brown', 'board-bg--orange', 'board-bg--yellow',
    'board-bg--green', 'board-bg--blue', 'board-bg--purple', 'board-bg--pink', 'board-bg--red'
  ];
  
  for (const cls of bgClasses) {
    if (board.classList.contains(cls)) {
      return cls;
    }
  }
  
  return null;
}

/**
 * Serialize a row
 */
function serializeRow(row) {
  const rowId = row.dataset.rowId || row.id;
  const blocks = [];
  
  row.querySelectorAll(':scope > .item').forEach(block => {
    const blockData = serializeBlock(block);
    if (blockData) {
      blocks.push(blockData);
    }
  });
  
  return { id: rowId, blocks };
}

/**
 * Serialize a single block
 */
function serializeBlock(block) {
  const type = block.dataset.blockType;
  const id = block.dataset.blockId;
  
  if (!type) return null;
  
  const serializers = {
    text: serializeTextBlock,
    checklist: serializeChecklistBlock,
    callout: serializeCalloutBlock,
    quote: serializeQuoteBlock,
    separator: serializeSeparatorBlock,
    link: serializeLinkBlock,
    dropdown: serializeDropdownBlock,
    group: serializeGroupBlock,
    gallery: serializeGalleryBlock,
    gcal: serializeGCalBlock
  };
  
  const serializer = serializers[type];
  if (!serializer) {
    console.warn(`Unknown block type: ${type}`);
    return null;
  }
  
  return serializer(block, id);
}

// --- Styling helper functions ---

function getTextAlignFromClasses(element) {
  if (!element) return null;
  if (element.classList.contains('text-left')) return 'left';
  if (element.classList.contains('text-center')) return 'center';
  if (element.classList.contains('text-right')) return 'right';
  return null;
}

function getFontWeightFromClasses(element) {
  if (!element) return null;
  if (element.classList.contains('font-light')) return 'light';
  if (element.classList.contains('font-normal')) return 'normal';
  if (element.classList.contains('font-medium')) return 'medium';
  if (element.classList.contains('font-semibold')) return 'semibold';
  if (element.classList.contains('font-bold')) return 'bold';
  return null;
}

function getTextDecorationFromClasses(element) {
  if (!element) return null;
  if (element.classList.contains('underline')) return 'underline';
  if (element.classList.contains('line-through')) return 'line-through';
  if (element.classList.contains('no-underline')) return 'none';
  return null;
}

function getInlineStyles(element) {
  if (!element || !element.style) return null;
  
  const styles = {};
  const relevantStyles = [
    'color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight', 
    'fontStyle', 'textDecoration', 'textAlign', 'lineHeight', 'letterSpacing',
    'textTransform', 'textShadow', 'wordSpacing'
  ];
  
  relevantStyles.forEach(property => {
    if (element.style[property]) {
      styles[property] = element.style[property];
    }
  });
  
  return Object.keys(styles).length > 0 ? styles : null;
}

// Only these `text-*` classes represent alignment in this codebase.
// (Other `text-*` classes like `text-red` are color and must be preserved.)
const TEXT_ALIGN_CLASSES = new Set(['text-left', 'text-center', 'text-right']);

function filterRestorableClasses(saved = [], { exclude = [], excludePrefixes = [] } = {}) {
  if (!Array.isArray(saved) || saved.length === 0) return [];
  return saved.filter(cls => {
    if (!cls) return false;
    if (exclude.includes(cls)) return false;
    if (excludePrefixes.some(p => cls.startsWith(p))) return false;
    return true;
  });
}

function applyInlineStylesToElement(element, inlineStyles) {
  if (!element || !inlineStyles) return;
  Object.keys(inlineStyles).forEach(property => {
    element.style[property] = inlineStyles[property];
  });
}

function restoreEditableContent(element, { htmlContent, content, fallback = '' } = {}) {
  if (!element) return;
  if (htmlContent && typeof htmlContent === 'string' && htmlContent.trim() && htmlContent !== content) {
    element.innerHTML = htmlContent;
  } else {
    element.textContent = (content ?? fallback);
  }
}

// --- Individual block serializers ---

function serializeTextBlock(block, id) {
  const content = block.querySelector('[contenteditable]');
  const contentEl = block.querySelector('.item__content');
  
  // Determine variant from class
  let variant = 'text';
  if (contentEl?.classList.contains('item__content--title')) variant = 'title';
  else if (contentEl?.classList.contains('item__content--h2')) variant = 'h2';
  else if (contentEl?.classList.contains('item__content--h3')) variant = 'h3';
  else if (contentEl?.classList.contains('item__content--text')) variant = 'text';
  
  // Get size and color classes from block
  const sizeMatch = block.className.match(/size--(half|third|quarter|full)/);
  const colorMatch = block.className.match(/color--(yellow|blue|green|red|purple|gray)/);
  const alignMatch = block.className.match(/align--(left|center|right)/);
  
  // Get text formatting classes from content element
  const textAlign = getTextAlignFromClasses(contentEl);
  const fontWeight = getFontWeightFromClasses(contentEl);
  const textDecoration = getTextDecorationFromClasses(contentEl);
  
  // Get inline styles from content element
  const inlineStyles = getInlineStyles(contentEl);
  
  return {
    type: 'text',
    id,
    content: content?.textContent || '',
    htmlContent: content?.innerHTML || '', // Preserve rich text content
    props: {
      variant,
      size: sizeMatch ? sizeMatch[1] : 'full',
      color: colorMatch ? colorMatch[1] : null,
      align: alignMatch ? alignMatch[1] : null,
      placeholder: content?.dataset.placeholder || 'Type something...',
      // Text formatting from CSS classes
      textAlign: textAlign,
      fontWeight: fontWeight,
      textDecoration: textDecoration,
      // Inline styles
      inlineStyles: inlineStyles,
      // All CSS classes for comprehensive restoration
      cssClasses: {
        block: Array.from(block.classList),
        content: Array.from(contentEl?.classList || [])
      }
    }
  };
}

function serializeChecklistBlock(block, id) {
  const content = block.querySelector('[contenteditable]');
  const checkbox = block.querySelector('input[type="checkbox"]');
  const checklist = block.querySelector('.checklist');
  
  // Get text formatting classes from content element
  const textAlign = getTextAlignFromClasses(content);
  const fontWeight = getFontWeightFromClasses(content);
  const textDecoration = getTextDecorationFromClasses(content);
  
  // Get inline styles from content element
  const inlineStyles = getInlineStyles(content);
  
  return {
    type: 'checklist',
    id,
    content: content?.textContent || '',
    htmlContent: content?.innerHTML || '',
    props: {
      checked: checkbox?.checked || checklist?.classList.contains('is-checked') || false,
      textAlign: textAlign,
      fontWeight: fontWeight,
      textDecoration: textDecoration,
      inlineStyles: inlineStyles,
      cssClasses: {
        block: Array.from(block.classList),
        content: Array.from(content?.classList || [])
      }
    }
  };
}

function serializeCalloutBlock(block, id) {
  const content = block.querySelector('[contenteditable]');
  const icon = block.querySelector('.callout__icon');
  const callout = block.querySelector('.callout');
  
  // Get color from class
  const colorMatch = callout?.className.match(/callout--(yellow|blue|green|red|purple|gray)/);
  
  // Get text formatting classes from content element
  const textAlign = getTextAlignFromClasses(content);
  const fontWeight = getFontWeightFromClasses(content);
  const textDecoration = getTextDecorationFromClasses(content);
  
  // Get inline styles from content element
  const inlineStyles = getInlineStyles(content);
  
  return {
    type: 'callout',
    id,
    content: content?.textContent || '',
    htmlContent: content?.innerHTML || '',
    props: {
      icon: icon?.textContent || '💡',
      color: colorMatch ? colorMatch[1] : 'yellow',
      textAlign: textAlign,
      fontWeight: fontWeight,
      textDecoration: textDecoration,
      inlineStyles: inlineStyles,
      cssClasses: {
        block: Array.from(block.classList),
        content: Array.from(content?.classList || [])
      }
    }
  };
}

function serializeQuoteBlock(block, id) {
  const content = block.querySelector('[contenteditable]');
  
  // Get text formatting classes from content element
  const textAlign = getTextAlignFromClasses(content);
  const fontWeight = getFontWeightFromClasses(content);
  const textDecoration = getTextDecorationFromClasses(content);
  
  // Get inline styles from content element
  const inlineStyles = getInlineStyles(content);
  
  return {
    type: 'quote',
    id,
    content: content?.textContent || '',
    htmlContent: content?.innerHTML || '',
    props: {
      textAlign: textAlign,
      fontWeight: fontWeight,
      textDecoration: textDecoration,
      inlineStyles: inlineStyles,
      cssClasses: {
        block: Array.from(block.classList),
        content: Array.from(content?.classList || [])
      }
    }
  };
}

function serializeSeparatorBlock(block, id) {
  return {
    type: 'separator',
    id,
    props: {
      cssClasses: {
        block: Array.from(block.classList)
      }
    }
  };
}

function serializeLinkBlock(block, id) {
  // Link blocks are NOT contenteditable, so we need to find the content div differently
  const content = block.querySelector('.item__content--link');
  
  // Get text formatting classes from content element
  const textAlign = getTextAlignFromClasses(content);
  const fontWeight = getFontWeightFromClasses(content);
  const textDecoration = getTextDecorationFromClasses(content);
  
  // Get inline styles from content element
  const inlineStyles = getInlineStyles(content);
  
  return {
    type: 'link',
    id,
    content: content?.textContent || '',
    htmlContent: content?.innerHTML || '',
    props: {
      url: block.dataset.url || content?.dataset.url || '',
      textAlign: textAlign,
      fontWeight: fontWeight,
      textDecoration: textDecoration,
      inlineStyles: inlineStyles,
      cssClasses: {
        block: Array.from(block.classList),
        content: Array.from(content?.classList || [])
      }
    }
  };
}

function serializeDropdownBlock(block, id) {
  const title = block.querySelector('.dropdown-block__header [contenteditable]');
  const isOpen = block.classList.contains('is-open');
  const contentEl = block.querySelector('.dropdown-block__content');
  
  // Get text formatting classes from title element
  const textAlign = getTextAlignFromClasses(title);
  const fontWeight = getFontWeightFromClasses(title);
  const textDecoration = getTextDecorationFromClasses(title);
  
  // Get inline styles from title element
  const inlineStyles = getInlineStyles(title);
  
  // Serialize nested blocks
  const children = [];
  contentEl?.querySelectorAll(':scope > .item').forEach(childBlock => {
    const childData = serializeBlock(childBlock);
    if (childData) children.push(childData);
  });
  
  return {
    type: 'dropdown',
    id,
    content: title?.textContent || '',
    htmlContent: title?.innerHTML || '',
    props: {
      isOpen,
      contentId: block.dataset.contentId,
      textAlign: textAlign,
      fontWeight: fontWeight,
      textDecoration: textDecoration,
      inlineStyles: inlineStyles,
      cssClasses: {
        block: Array.from(block.classList),
        content: Array.from(title?.classList || [])
      }
    },
    children
  };
}

function serializeGroupBlock(block, id) {
  const contentEl = block.querySelector('.group-block__content');
  
  // Get size class
  const sizeMatch = block.className.match(/size--(half|third|quarter|full)/);
  const colorMatch = block.className.match(/color--(yellow|blue|green|red|purple|gray)/);
  
  // Serialize nested blocks
  const children = [];
  contentEl?.querySelectorAll(':scope > .item').forEach(childBlock => {
    const childData = serializeBlock(childBlock);
    if (childData) children.push(childData);
  });
  
  return {
    type: 'group',
    id,
    props: {
      size: sizeMatch ? sizeMatch[1] : 'full',
      color: colorMatch ? colorMatch[1] : null,
      contentId: block.dataset.contentId,
      cssClasses: {
        block: Array.from(block.classList)
      }
    },
    children
  };
}

function serializeGalleryBlock(block, id) {
  const tabs = [];
  const sizeMatch = block.className.match(/size--(half|third|quarter|full)/);
  
  block.querySelectorAll('.gallery-block__tab').forEach(tab => {
    const tabId = tab.dataset.tabId;
    const labelEl = tab.querySelector('.gallery-block__tab-label');
    const label = labelEl?.textContent || '';
    const isActive = tab.classList.contains('is-active');
    
    // Get text formatting from label element
    const textAlign = getTextAlignFromClasses(labelEl);
    const fontWeight = getFontWeightFromClasses(labelEl);
    const textDecoration = getTextDecorationFromClasses(labelEl);
    const inlineStyles = getInlineStyles(labelEl);
    
    // Find corresponding panel
    const panel = block.querySelector(`#${tabId}`);
    const children = [];
    
    panel?.querySelectorAll(':scope > .item').forEach(childBlock => {
      const childData = serializeBlock(childBlock);
      if (childData) children.push(childData);
    });
    
    tabs.push({ 
      id: tabId, 
      label, 
      htmlLabel: labelEl?.innerHTML || '',
      isActive, 
      children,
      labelStyle: {
        textAlign: textAlign,
        fontWeight: fontWeight,
        textDecoration: textDecoration,
        inlineStyles: inlineStyles,
        cssClasses: Array.from(labelEl?.classList || [])
      }
    });
  });
  
  return {
    type: 'gallery',
    id,
    props: {
      size: sizeMatch ? sizeMatch[1] : 'full',
      tabs,
      cssClasses: {
        block: Array.from(block.classList)
      }
    }
  };
}

function serializeGCalBlock(block, id) {
  const calendarId = block.dataset.calendarId || '';
  const titleEl = block.querySelector('.gcal-block__title');
  const wrapperEl = block.querySelector('.gcal-block__wrapper');
  const title = titleEl?.textContent || '';
  
  // Try to detect current mode from iframe src
  const iframe = block.querySelector('.gcal-block__iframe');
  let mode = 'MONTH';
  if (iframe?.src) {
    const modeMatch = iframe.src.match(/mode=(\w+)/i);
    if (modeMatch) mode = modeMatch[1];
  }
  
  // Get text formatting from title element
  const textAlign = getTextAlignFromClasses(titleEl);
  const fontWeight = getFontWeightFromClasses(titleEl);
  const textDecoration = getTextDecorationFromClasses(titleEl);
  const inlineStyles = getInlineStyles(titleEl);
  
  return {
    type: 'gcal',
    id,
    props: {
      calendarId,
      title,
      htmlTitle: titleEl?.innerHTML || '',
      mode,
      titleStyle: {
        textAlign,
        fontWeight,
        textDecoration,
        inlineStyles,
        cssClasses: Array.from(titleEl?.classList || [])
      },
      cssClasses: {
        block: Array.from(block.classList),
        wrapper: Array.from(wrapperEl?.classList || [])
      }
    }
  };
}

// ==========================================================================
// DESERIALIZATION (JSON → DOM)
// ==========================================================================
import { generateId, createElement } from './utils.js';

/**
 * Deserialize board data and render to DOM
 * @param {Object} data - The serialized board data
 */
export function deserializeBoard(data) {
  if (!data || typeof data !== 'object') {
    console.warn('Invalid board data for deserialization');
    return;
  }

  // Let the app suppress auto-save while we rebuild the DOM
  document.dispatchEvent(new CustomEvent('cascade-deserialize-start'));
  
  const boardItems = document.getElementById('boardItems');
  if (!boardItems) return;
  
  // Clear existing content
  boardItems.innerHTML = '';
  
  // Clear and restore cover (clear first to prevent persistence)
  deserializeCover(data.cover || null);
  
  // Clear and restore icon (clear first to prevent persistence)
  deserializeIcon(data.icon || null);
  
  // Clear and restore board background
  deserializeBoardBackground(data.boardBackground || null);
  
  // Render rows and blocks
  if (data.rows && Array.isArray(data.rows)) {
    const fragment = document.createDocumentFragment();
    data.rows.forEach(rowData => {
      deserializeRow(rowData, fragment);
    });
    boardItems.appendChild(fragment);
  }

  document.dispatchEvent(new CustomEvent('cascade-deserialize-end'));
}

/**
 * Deserialize and set cover image
 */
function deserializeCover(coverUrl) {
  const cover = document.getElementById('boardCover');
  const btn = document.querySelector('.js-add-cover');
  
  if (!cover) return;
  
  if (coverUrl) {
    cover.style.backgroundImage = `url('${coverUrl}')`;
    cover.classList.add('cover--has-image');
    if (btn) btn.textContent = 'Change cover';
  } else {
    // Clear cover when null
    cover.style.backgroundImage = '';
    cover.classList.remove('cover--has-image');
    if (btn) btn.textContent = 'Add cover';
  }
}

/**
 * Deserialize and set icon
 */
function deserializeIcon(iconData) {
  const iconDisplay = document.getElementById('iconDisplay');
  if (!iconDisplay) return;
  
  if (!iconData) {
    // Clear icon when null
    iconDisplay.textContent = '';
    iconDisplay.style.backgroundImage = '';
    return;
  }
  
  if (iconData.type === 'emoji') {
    iconDisplay.textContent = iconData.value;
    iconDisplay.style.backgroundImage = '';
  } else if (iconData.type === 'image') {
    iconDisplay.textContent = '';
    iconDisplay.style.backgroundImage = `url('${iconData.value}')`;
    iconDisplay.style.backgroundSize = 'cover';
    iconDisplay.style.backgroundPosition = 'center';
  }
}

/**
 * Deserialize and set board background
 */
function deserializeBoardBackground(bgClass) {
  const board = document.getElementById('board');
  if (!board) return;
  
  const bgClasses = [
    'board-bg--gray', 'board-bg--brown', 'board-bg--orange', 'board-bg--yellow',
    'board-bg--green', 'board-bg--blue', 'board-bg--purple', 'board-bg--pink', 'board-bg--red'
  ];
  
  // Remove all existing background classes
  bgClasses.forEach(cls => board.classList.remove(cls));
  
  // Add new background class if provided
  if (bgClass) {
    board.classList.add(bgClass);
  }
}

/**
 * Deserialize a row
 */
function deserializeRow(rowData, container) {
  const row = createElement('div', {
    className: 'item-row',
    id: rowData.id,
    data: { rowId: rowData.id }
  });
  
  // Add row floaty
  const floaty = createElement('div', {
    className: 'floaty',
    html: `
      <button class="floaty__btn js-add-block-row" data-row-id="${rowData.id}" type="button">
        <img src="icons/add.png" alt="Add">
      </button>
    `
  });
  row.appendChild(floaty);
  
  // Deserialize each block in the row
  rowData.blocks.forEach(blockData => {
    const block = deserializeBlock(blockData);
    if (block) {
      row.appendChild(block);
    }
  });
  
  container.appendChild(row);
}

/**
 * Deserialize a single block
 */
function deserializeBlock(blockData) {
  const deserializers = {
    text: deserializeTextBlock,
    checklist: deserializeChecklistBlock,
    callout: deserializeCalloutBlock,
    quote: deserializeQuoteBlock,
    separator: deserializeSeparatorBlock,
    link: deserializeLinkBlock,
    dropdown: deserializeDropdownBlock,
    group: deserializeGroupBlock,
    gallery: deserializeGalleryBlock,
    gcal: deserializeGCalBlock
  };
  
  const deserializer = deserializers[blockData.type];
  if (!deserializer) {
    console.warn(`Unknown block type: ${blockData.type}`);
    return null;
  }
  
  return deserializer(blockData);
}

// --- Individual block deserializers ---

function deserializeTextBlock(data) {
  const { id, content, htmlContent, props = {} } = data;
  const { 
    variant = 'text', 
    size, 
    color, 
    align, 
    placeholder = 'Type something...',
    textAlign,
    fontWeight,
    textDecoration,
    inlineStyles,
    cssClasses
  } = props;
  
  // Build block classes
  let blockClasses = 'item';
  if (size) blockClasses += ` size--${size}`;
  if (color) blockClasses += ` color--${color}`;
  if (align) blockClasses += ` align--${align}`;
  
  // Use saved CSS classes if available (for comprehensive restoration)
  if (cssClasses?.block) {
    const savedClasses = cssClasses.block.filter(cls => 
      !cls.startsWith('item') && 
      !cls.startsWith('size--') && 
      !cls.startsWith('color--') && 
      !cls.startsWith('align--')
    );
    if (savedClasses.length > 0) {
      blockClasses += ' ' + savedClasses.join(' ');
    }
  }
  
  const block = createElement('div', {
    className: blockClasses,
    data: { blockId: id, blockType: 'text' }
  });
  
  // Floaty
  const floaty = createElement('div', {
    className: 'floaty',
    html: `
      <button class="floaty__btn js-block-menu" data-block-id="${id}" data-block-type="text" type="button">
        <img src="icons/edit.png" alt="Edit">
      </button>
    `
  });
  
  // Build content classes
  let contentClasses = `item__content item__content--${variant}`;
  if (textAlign) contentClasses += ` text-${textAlign}`;
  if (fontWeight) contentClasses += ` font-${fontWeight}`;
  if (textDecoration && textDecoration !== 'none') contentClasses += ` ${textDecoration}`;
  
  // Use saved CSS classes if available
  if (cssClasses?.content) {
    const savedContentClasses = filterRestorableClasses(cssClasses.content, {
      exclude: ['underline', 'line-through', 'no-underline', ...TEXT_ALIGN_CLASSES],
      excludePrefixes: ['item__content', 'font-']
    });
    if (savedContentClasses.length > 0) {
      contentClasses += ' ' + savedContentClasses.join(' ');
    }
  }
  
  // Content
  const contentDiv = createElement('div', {
    className: contentClasses,
    attrs: {
      contenteditable: 'true',
      'data-placeholder': placeholder
    },
    data: { blockId: id }
  });
  
  // Restore content (prefer HTML content if available for rich text)
  restoreEditableContent(contentDiv, { htmlContent, content });
  applyInlineStylesToElement(contentDiv, inlineStyles);
  
  block.appendChild(floaty);
  block.appendChild(contentDiv);
  
  return block;
}

function deserializeChecklistBlock(data) {
  const { id, content, htmlContent, props = {} } = data;
  const { 
    checked = false, 
    textAlign,
    fontWeight,
    textDecoration,
    inlineStyles,
    cssClasses
  } = props;
  
  // Build block classes
  let blockClasses = 'item';
  if (cssClasses?.block) {
    const savedClasses = cssClasses.block.filter(cls => cls !== 'item');
    if (savedClasses.length > 0) {
      blockClasses += ' ' + savedClasses.join(' ');
    }
  }
  
  const block = createElement('div', {
    className: blockClasses,
    data: { blockId: id, blockType: 'checklist' }
  });
  
  const floaty = createElement('div', {
    className: 'floaty',
    html: `
      <button class="floaty__btn js-block-menu" data-block-id="${id}" data-block-type="checklist" type="button">
        <img src="icons/edit.png" alt="Edit">
      </button>
    `
  });
  
  const checklist = createElement('div', {
    className: `checklist ${checked ? 'is-checked' : ''}`
  });
  
  const checkbox = createElement('input', {
    className: 'checklist__checkbox',
    attrs: { type: 'checkbox' }
  });
  checkbox.checked = checked;
  
  // Build content classes
  let contentClasses = 'item__content checklist__text';
  if (textAlign) contentClasses += ` text-${textAlign}`;
  if (fontWeight) contentClasses += ` font-${fontWeight}`;
  if (textDecoration && textDecoration !== 'none') contentClasses += ` ${textDecoration}`;
  
  // Use saved CSS classes if available
  if (cssClasses?.content) {
    const savedContentClasses = filterRestorableClasses(cssClasses.content, {
      exclude: ['underline', 'line-through', 'no-underline', ...TEXT_ALIGN_CLASSES],
      excludePrefixes: ['item__content', 'checklist__', 'font-']
    });
    if (savedContentClasses.length > 0) {
      contentClasses += ' ' + savedContentClasses.join(' ');
    }
  }
  
  const contentDiv = createElement('div', {
    className: contentClasses,
    attrs: {
      contenteditable: 'true',
      'data-placeholder': 'To-do...'
    },
    data: { blockId: id }
  });
  
  // Restore content (prefer HTML content if available)
  restoreEditableContent(contentDiv, { htmlContent, content });
  applyInlineStylesToElement(contentDiv, inlineStyles);
  
  // Event listener for checkbox
  checkbox.addEventListener('change', () => {
    checklist.classList.toggle('is-checked', checkbox.checked);
  });
  
  checklist.appendChild(checkbox);
  checklist.appendChild(contentDiv);
  block.appendChild(floaty);
  block.appendChild(checklist);
  
  return block;
}

function deserializeCalloutBlock(data) {
  const { id, content, htmlContent, props = {} } = data;
  const { 
    icon = '💡', 
    color = 'yellow',
    textAlign,
    fontWeight,
    textDecoration,
    inlineStyles,
    cssClasses
  } = props;
  
  // Build block classes
  let blockClasses = 'item';
  if (cssClasses?.block) {
    const savedClasses = cssClasses.block.filter(cls => cls !== 'item');
    if (savedClasses.length > 0) {
      blockClasses += ' ' + savedClasses.join(' ');
    }
  }
  
  const block = createElement('div', {
    className: blockClasses,
    data: { blockId: id, blockType: 'callout' }
  });
  
  const floaty = createElement('div', {
    className: 'floaty',
    html: `
      <button class="floaty__btn js-block-menu" data-block-id="${id}" data-block-type="callout" type="button">
        <img src="icons/edit.png" alt="Edit">
      </button>
    `
  });
  
  const callout = createElement('div', {
    className: `callout callout--${color}`
  });
  
  const iconEl = createElement('div', {
    className: 'callout__icon',
    text: icon
  });
  
  // Build content classes
  let contentClasses = 'item__content callout__content';
  if (textAlign) contentClasses += ` text-${textAlign}`;
  if (fontWeight) contentClasses += ` font-${fontWeight}`;
  if (textDecoration && textDecoration !== 'none') contentClasses += ` ${textDecoration}`;
  
  // Use saved CSS classes if available
  if (cssClasses?.content) {
    const savedContentClasses = filterRestorableClasses(cssClasses.content, {
      exclude: ['underline', 'line-through', 'no-underline', ...TEXT_ALIGN_CLASSES],
      excludePrefixes: ['item__content', 'callout__', 'font-']
    });
    if (savedContentClasses.length > 0) {
      contentClasses += ' ' + savedContentClasses.join(' ');
    }
  }
  
  const contentDiv = createElement('div', {
    className: contentClasses,
    attrs: {
      contenteditable: 'true',
      'data-placeholder': 'Type something...'
    },
    data: { blockId: id }
  });
  
  // Restore content (prefer HTML content if available)
  restoreEditableContent(contentDiv, { htmlContent, content });
  applyInlineStylesToElement(contentDiv, inlineStyles);
  
  callout.appendChild(iconEl);
  callout.appendChild(contentDiv);
  block.appendChild(floaty);
  block.appendChild(callout);
  
  return block;
}

function deserializeQuoteBlock(data) {
  const { id, content, htmlContent, props = {} } = data;
  const {
    textAlign,
    fontWeight,
    textDecoration,
    inlineStyles,
    cssClasses
  } = props;
  
  // Build block classes
  let blockClasses = 'item';
  if (cssClasses?.block) {
    const savedClasses = cssClasses.block.filter(cls => cls !== 'item');
    if (savedClasses.length > 0) {
      blockClasses += ' ' + savedClasses.join(' ');
    }
  }
  
  const block = createElement('div', {
    className: blockClasses,
    data: { blockId: id, blockType: 'quote' }
  });
  
  const floaty = createElement('div', {
    className: 'floaty',
    html: `
      <button class="floaty__btn js-block-menu" data-block-id="${id}" data-block-type="quote" type="button">
        <img src="icons/edit.png" alt="Edit">
      </button>
    `
  });
  
  const quote = createElement('div', { className: 'quote-block' });
  const border = createElement('div', { className: 'quote-block__border' });
  
  // Build content classes
  let contentClasses = 'item__content quote-block__content';
  if (textAlign) contentClasses += ` text-${textAlign}`;
  if (fontWeight) contentClasses += ` font-${fontWeight}`;
  if (textDecoration && textDecoration !== 'none') contentClasses += ` ${textDecoration}`;
  
  // Use saved CSS classes if available
  if (cssClasses?.content) {
    const savedContentClasses = filterRestorableClasses(cssClasses.content, {
      exclude: ['underline', 'line-through', 'no-underline', ...TEXT_ALIGN_CLASSES],
      excludePrefixes: ['item__content', 'quote-block__', 'font-']
    });
    if (savedContentClasses.length > 0) {
      contentClasses += ' ' + savedContentClasses.join(' ');
    }
  }
  
  const contentDiv = createElement('div', {
    className: contentClasses,
    attrs: {
      contenteditable: 'true',
      'data-placeholder': 'Empty quote'
    },
    data: { blockId: id }
  });
  
  // Restore content (prefer HTML content if available)
  restoreEditableContent(contentDiv, { htmlContent, content });
  applyInlineStylesToElement(contentDiv, inlineStyles);
  
  quote.appendChild(border);
  quote.appendChild(contentDiv);
  block.appendChild(floaty);
  block.appendChild(quote);
  
  return block;
}

function deserializeSeparatorBlock(data) {
  const { id, props = {} } = data;
  const { cssClasses } = props;
  
  // Build block classes
  let blockClasses = 'item';
  if (cssClasses?.block) {
    const savedClasses = cssClasses.block.filter(cls => cls !== 'item');
    if (savedClasses.length > 0) {
      blockClasses += ' ' + savedClasses.join(' ');
    }
  }
  
  const block = createElement('div', {
    className: blockClasses,
    data: { blockId: id, blockType: 'separator' }
  });
  
  const floaty = createElement('div', {
    className: 'floaty',
    html: `
      <button class="floaty__btn js-block-menu" data-block-id="${id}" data-block-type="separator" type="button">
        <img src="icons/edit.png" alt="Edit">
      </button>
    `
  });
  
  const separator = createElement('div', { className: 'separator' });
  
  block.appendChild(floaty);
  block.appendChild(separator);
  
  return block;
}

function deserializeLinkBlock(data) {
  const { id, content, htmlContent, props = {} } = data;
  const { 
    url = '',
    textAlign,
    fontWeight,
    textDecoration,
    inlineStyles,
    cssClasses
  } = props;
  
  // Build block classes
  let blockClasses = 'item';
  if (cssClasses?.block) {
    const savedClasses = cssClasses.block.filter(cls => cls !== 'item');
    if (savedClasses.length > 0) {
      blockClasses += ' ' + savedClasses.join(' ');
    }
  }
  
  const block = createElement('div', {
    className: blockClasses,
    data: { blockId: id, blockType: 'link', url }
  });
  
  const floaty = createElement('div', {
    className: 'floaty',
    html: `
      <button class="floaty__btn js-block-menu" data-block-id="${id}" data-block-type="link" type="button">
        <img src="icons/edit.png" alt="Edit">
      </button>
    `
  });
  
  // Build content classes - now using item__content--link instead of link-block
  let contentClasses = 'item__content item__content--link';
  if (textAlign) contentClasses += ` text-${textAlign}`;
  if (fontWeight) contentClasses += ` font-${fontWeight}`;
  if (textDecoration && textDecoration !== 'none') contentClasses += ` ${textDecoration}`;
  
  // Use saved CSS classes if available (includes background colors like bg-red, bg-blue, etc.)
  if (cssClasses?.content) {
    const savedContentClasses = filterRestorableClasses(cssClasses.content, {
      exclude: ['underline', 'line-through', 'no-underline', ...TEXT_ALIGN_CLASSES],
      excludePrefixes: ['item__content', 'font-']
    });
    if (savedContentClasses.length > 0) {
      contentClasses += ' ' + savedContentClasses.join(' ');
    }
  }
  
  // NOT contenteditable - links are only editable via the edit menu
  const contentDiv = createElement('div', {
    className: contentClasses,
    attrs: {
      'data-placeholder': 'Link text...',
      'data-url': url
    },
    data: { blockId: id }
  });
  
  // Restore content (prefer HTML content if available, otherwise use content or URL)
  restoreEditableContent(contentDiv, { htmlContent, content, fallback: url });
  applyInlineStylesToElement(contentDiv, inlineStyles);
  
  // Event listener for link click - always opens since not editable
  contentDiv.addEventListener('click', (e) => {
    if (block.dataset.url) {
      e.preventDefault();
      window.open(block.dataset.url, '_blank');
    }
  });
  
  block.appendChild(floaty);
  block.appendChild(contentDiv);
  
  return block;
}

function deserializeDropdownBlock(data) {
  const { id, content, htmlContent, props = {}, children = [] } = data;
  const { 
    isOpen = true, 
    contentId,
    textAlign,
    fontWeight,
    textDecoration,
    inlineStyles,
    cssClasses
  } = props;
  const actualContentId = contentId || generateId('content');
  
  // Build block classes
  let blockClasses = `item dropdown-block ${isOpen ? 'is-open' : ''}`;
  if (cssClasses?.block) {
    const savedClasses = cssClasses.block.filter(cls => 
      cls !== 'item' &&
      cls !== 'dropdown-block' &&
      cls !== 'is-open'
    );
    if (savedClasses.length > 0) {
      blockClasses += ' ' + savedClasses.join(' ');
    }
  }
  
  const block = createElement('div', {
    className: blockClasses,
    data: { blockId: id, blockType: 'dropdown', contentId: actualContentId }
  });
  
  // Header
  const header = createElement('div', {
    className: 'dropdown-block__header',
    html: `<span class="dropdown-block__toggle">▶</span>`
  });
  
  // Build title classes
  let titleClasses = 'item__content';
  if (textAlign) titleClasses += ` text-${textAlign}`;
  if (fontWeight) titleClasses += ` font-${fontWeight}`;
  if (textDecoration && textDecoration !== 'none') titleClasses += ` ${textDecoration}`;
  
  // Use saved CSS classes if available
  if (cssClasses?.content) {
    const savedContentClasses = filterRestorableClasses(cssClasses.content, {
      exclude: ['underline', 'line-through', 'no-underline', ...TEXT_ALIGN_CLASSES],
      excludePrefixes: ['item__content', 'font-']
    });
    if (savedContentClasses.length > 0) {
      titleClasses += ' ' + savedContentClasses.join(' ');
    }
  }
  
  const titleDiv = createElement('div', {
    className: titleClasses,
    attrs: {
      contenteditable: 'true',
      'data-placeholder': 'Toggle title...'
    },
    data: { blockId: id }
  });
  
  // Restore title content (prefer HTML content if available)
  restoreEditableContent(titleDiv, { htmlContent, content });
  applyInlineStylesToElement(titleDiv, inlineStyles);
  
  header.appendChild(titleDiv);
  
  // Toggle event
  header.querySelector('.dropdown-block__toggle').addEventListener('click', () => {
    block.classList.toggle('is-open');
  });
  
  // Content container
  const contentEl = createElement('div', {
    className: 'dropdown-block__content',
    id: actualContentId,
    data: { parentId: id }
  });
  
  // Deserialize children
  children.forEach(childData => {
    const childBlock = deserializeBlock(childData);
    if (childBlock) contentEl.appendChild(childBlock);
  });
  
  // Add block button
  const addBtn = createElement('div', {
    className: 'add-block js-add-block-nested',
    data: { parentId: actualContentId },
    html: `<img src="icons/add.png" alt="Add" class="add-block__icon icon--muted">`
  });
  contentEl.appendChild(addBtn);
  
  block.appendChild(header);
  block.appendChild(contentEl);
  
  return block;
}

function deserializeGroupBlock(data) {
  const { id, props = {}, children = [] } = data;
  const { size, color, contentId, cssClasses } = props;
  const actualContentId = contentId || generateId('content');
  
  // Build block classes
  let blockClasses = `item group-block ${size ? `size--${size}` : ''} ${color ? `color--${color}` : ''}`.trim();
  if (cssClasses?.block) {
    const savedClasses = cssClasses.block.filter(cls => 
      cls !== 'item' &&
      cls !== 'group-block' &&
      !cls.startsWith('size--') &&
      !cls.startsWith('color--')
    );
    if (savedClasses.length > 0) {
      blockClasses += ' ' + savedClasses.join(' ');
    }
  }
  
  const block = createElement('div', {
    className: blockClasses,
    data: { blockId: id, blockType: 'group', contentId: actualContentId }
  });
  
  // Header with menu
  const header = createElement('div', { className: 'group-block__header' });
  const menuBtn = createElement('button', {
    className: 'group-block__menu-btn js-size-menu',
    attrs: { type: 'button', 'data-block-id': id },
    html: '⋯'
  });
  header.appendChild(menuBtn);
  
  // Content
  const contentEl = createElement('div', {
    className: 'group-block__content',
    id: actualContentId,
    data: { parentId: id }
  });
  
  // Deserialize children
  children.forEach(childData => {
    const childBlock = deserializeBlock(childData);
    if (childBlock) contentEl.appendChild(childBlock);
  });
  
  block.appendChild(header);
  block.appendChild(contentEl);
  
  return block;
}

function deserializeGalleryBlock(data) {
  const { id, props = {} } = data;
  const { size, tabs = [], cssClasses } = props;
  
  // Build block classes
  let blockClasses = `item gallery-block ${size ? `size--${size}` : ''}`.trim();
  if (cssClasses?.block) {
    const savedClasses = cssClasses.block.filter(cls => 
      cls !== 'item' &&
      cls !== 'gallery-block' &&
      !cls.startsWith('size--')
    );
    if (savedClasses.length > 0) {
      blockClasses += ' ' + savedClasses.join(' ');
    }
  }
  
  const block = createElement('div', {
    className: blockClasses,
    data: { blockId: id, blockType: 'gallery' }
  });
  
  // Tab bar
  const tabBar = createElement('div', { className: 'gallery-block__tabs' });
  
  // Content container
  const contentContainer = createElement('div', { className: 'gallery-block__content' });
  
  tabs.forEach((tabData, index) => {
    const tabId = tabData.id || generateId('tab');
    
    // Create tab
    const tab = createElement('div', {
      className: `gallery-block__tab ${tabData.isActive ? 'is-active' : ''}`,
      data: { tabId }
    });
    
    // Build label classes
    const labelStyle = tabData.labelStyle || {};
    let labelClasses = 'gallery-block__tab-label';
    if (labelStyle.textAlign) labelClasses += ` text-${labelStyle.textAlign}`;
    if (labelStyle.fontWeight) labelClasses += ` font-${labelStyle.fontWeight}`;
    if (labelStyle.textDecoration && labelStyle.textDecoration !== 'none') labelClasses += ` ${labelStyle.textDecoration}`;
    
    // Use saved CSS classes if available
    if (labelStyle.cssClasses) {
      const savedLabelClasses = filterRestorableClasses(labelStyle.cssClasses, {
        exclude: ['underline', 'line-through', 'no-underline', ...TEXT_ALIGN_CLASSES],
        excludePrefixes: ['gallery-block__tab-label', 'font-']
      });
      if (savedLabelClasses.length > 0) {
        labelClasses += ' ' + savedLabelClasses.join(' ');
      }
    }
    
    const label = createElement('span', {
      className: labelClasses,
      attrs: {
        contenteditable: 'true',
        'data-placeholder': `Category ${index + 1}`
      }
    });
    
    // Restore label content (prefer HTML content if available)
    restoreEditableContent(label, { htmlContent: tabData.htmlLabel, content: tabData.label });
    applyInlineStylesToElement(label, labelStyle.inlineStyles);
    
    tab.appendChild(label);
    tabBar.appendChild(tab);
    
    // Create panel
    const panel = createElement('div', {
      className: `gallery-block__panel ${tabData.isActive ? 'is-active' : ''}`,
      id: tabId,
      data: { tabId, parentId: id }
    });
    
    // Deserialize children
    (tabData.children || []).forEach(childData => {
      const childBlock = deserializeBlock(childData);
      if (childBlock) panel.appendChild(childBlock);
    });
    
    // Add block button
    const addBtn = createElement('div', {
      className: 'add-block js-add-block-nested',
      data: { parentId: tabId },
      html: `
        <img src="icons/add.png" alt="Add" class="add-block__icon icon--muted">
        <span>Add a block</span>
      `
    });
    panel.appendChild(addBtn);
    
    contentContainer.appendChild(panel);
  });
  
  // Add tab button
  const addTabBtn = createElement('button', {
    className: 'gallery-block__add-tab',
    attrs: { type: 'button', 'aria-label': 'Add category' },
    html: '<span>+</span>'
  });
  tabBar.appendChild(addTabBtn);
  
  // Menu button
  const menuBtn = createElement('button', {
    className: 'gallery-block__menu-btn js-size-menu',
    attrs: { type: 'button', 'data-block-id': id },
    html: '⋯'
  });
  tabBar.appendChild(menuBtn);
  
  block.appendChild(tabBar);
  block.appendChild(contentContainer);
  
  // --- Event handlers ---
  
  // Tab switching
  tabBar.addEventListener('click', (e) => {
    const tab = e.target.closest('.gallery-block__tab');
    if (!tab || e.target.closest('.gallery-block__tab-label')) return;
    
    const tabId = tab.dataset.tabId;
    
    block.querySelectorAll('.gallery-block__tab').forEach(t => t.classList.remove('is-active'));
    block.querySelectorAll('.gallery-block__panel').forEach(p => p.classList.remove('is-active'));
    
    tab.classList.add('is-active');
    const panel = block.querySelector(`#${tabId}`);
    if (panel) panel.classList.add('is-active');
  });
  
  // Add new tab
  addTabBtn.addEventListener('click', () => {
    const newTabId = generateId('tab');
    const tabCount = block.querySelectorAll('.gallery-block__tab').length + 1;
    
    const newTab = createElement('div', {
      className: 'gallery-block__tab',
      data: { tabId: newTabId },
      html: `<span class="gallery-block__tab-label" contenteditable="true" data-placeholder="Category ${tabCount}">Category ${tabCount}</span>`
    });
    tabBar.insertBefore(newTab, addTabBtn);
    
    const newPanel = createElement('div', {
      className: 'gallery-block__panel',
      id: newTabId,
      data: { tabId: newTabId, parentId: id }
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
    
    block.querySelectorAll('.gallery-block__tab').forEach(t => t.classList.remove('is-active'));
    block.querySelectorAll('.gallery-block__panel').forEach(p => p.classList.remove('is-active'));
    newTab.classList.add('is-active');
    newPanel.classList.add('is-active');
    
    const label = newTab.querySelector('.gallery-block__tab-label');
    if (label) {
      label.focus();
      const range = document.createRange();
      range.selectNodeContents(label);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });
  
  return block;
}

function deserializeGCalBlock(data) {
  const { id, props = {} } = data;
  const { 
    calendarId = '', 
    title = 'Google Calendar', 
    htmlTitle = '',
    mode = 'MONTH',
    titleStyle = {},
    cssClasses 
  } = props;
  
  // Build block classes
  let blockClasses = 'item gcal-block';
  if (cssClasses?.block) {
    const savedClasses = cssClasses.block.filter(cls => 
      cls !== 'item' &&
      cls !== 'gcal-block'
    );
    if (savedClasses.length > 0) {
      blockClasses += ' ' + savedClasses.join(' ');
    }
  }
  
  const block = createElement('div', {
    className: blockClasses,
    data: { blockId: id, blockType: 'gcal', calendarId }
  });
  
  // Block floaty
  const floaty = createElement('div', {
    className: 'floaty',
    html: `
      <button class="floaty__btn js-block-menu" data-block-id="${id}" data-block-type="gcal" type="button">
        <img src="icons/edit.png" alt="Edit">
      </button>
    `
  });
  
  // Calendar wrapper - restore wrapper classes (including background)
  let wrapperClasses = 'gcal-block__wrapper';
  if (cssClasses?.wrapper) {
    const savedWrapperClasses = cssClasses.wrapper.filter(cls => 
      cls !== 'gcal-block__wrapper'
    );
    if (savedWrapperClasses.length > 0) {
      wrapperClasses += ' ' + savedWrapperClasses.join(' ');
    }
  }
  
  const wrapper = createElement('div', {
    className: wrapperClasses
  });
  
  // Header with title
  const header = createElement('div', {
    className: 'gcal-block__header'
  });
  
  const iconEl = createElement('span', {
    className: 'gcal-block__icon',
    html: '<img src="appicons/gcal.png" alt="Google Calendar" class="icon icon--sm">'
  });
  
  // Build title classes
  let titleClasses = 'gcal-block__title';
  if (titleStyle.textAlign) titleClasses += ` text-${titleStyle.textAlign}`;
  if (titleStyle.fontWeight) titleClasses += ` font-${titleStyle.fontWeight}`;
  if (titleStyle.textDecoration && titleStyle.textDecoration !== 'none') titleClasses += ` ${titleStyle.textDecoration}`;
  
  if (titleStyle.cssClasses) {
    const savedTitleClasses = filterRestorableClasses(titleStyle.cssClasses, {
      exclude: ['gcal-block__title', 'underline', 'line-through', 'no-underline', ...TEXT_ALIGN_CLASSES],
      excludePrefixes: ['font-']
    });
    if (savedTitleClasses.length > 0) {
      titleClasses += ' ' + savedTitleClasses.join(' ');
    }
  }
  
  const titleEl = createElement('div', {
    className: titleClasses,
    attrs: {
      contenteditable: 'true',
      'data-placeholder': 'Calendar title...'
    },
    data: { blockId: id }
  });
  
  restoreEditableContent(titleEl, { htmlContent: htmlTitle, content: title, fallback: 'Google Calendar' });
  applyInlineStylesToElement(titleEl, titleStyle.inlineStyles);
  
  const menuBtn = createElement('button', {
    className: 'gcal-block__menu-btn js-block-menu',
    attrs: { type: 'button', 'data-block-id': id, 'data-block-type': 'gcal' },
    html: '⋯'
  });
  
  header.appendChild(iconEl);
  header.appendChild(titleEl);
  header.appendChild(menuBtn);
  
  // Calendar content
  const content = createElement('div', {
    className: 'gcal-block__content'
  });
  
  if (calendarId) {
    // Render the calendar iframe
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
    content.appendChild(iframe);
    
    // Mode switcher
    const switcher = createElement('div', {
      className: 'gcal-block__mode-switcher'
    });
    
    const modes = [
      { value: 'MONTH', label: 'Month' },
      { value: 'WEEK', label: 'Week' },
      { value: 'AGENDA', label: 'Agenda' }
    ];
    
    modes.forEach(m => {
      const btn = createElement('button', {
        className: `gcal-block__mode-btn ${m.value === mode ? 'is-active' : ''}`,
        text: m.label,
        attrs: { type: 'button', 'data-mode': m.value }
      });
      
      btn.addEventListener('click', () => {
        switcher.querySelectorAll('.gcal-block__mode-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        
        const oldIframe = content.querySelector('.gcal-block__iframe');
        if (oldIframe && calendarId) {
          const newEncodedId = encodeURIComponent(calendarId);
          const newUrl = `https://calendar.google.com/calendar/embed?src=${newEncodedId}&mode=${m.value}&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=1`;
          const newIframe = createElement('iframe', {
            className: 'gcal-block__iframe',
            attrs: {
              src: newUrl,
              frameborder: '0',
              scrolling: 'no',
              loading: 'lazy'
            }
          });
          oldIframe.replaceWith(newIframe);
        }
      });
      
      switcher.appendChild(btn);
    });
    
    content.appendChild(switcher);
  } else {
    // Show setup prompt (similar to block creation)
    const setup = createElement('div', {
      className: 'gcal-block__setup',
      html: `
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
      `
    });
    
    const connectBtn = setup.querySelector('.gcal-connect-btn');
    const input = setup.querySelector('.gcal-block__input');
    const modeSelect = setup.querySelector('.gcal-block__mode-select');
    
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
        content.innerHTML = '';
        
        const newEncodedId = encodeURIComponent(parsedId);
        const newUrl = `https://calendar.google.com/calendar/embed?src=${newEncodedId}&mode=${selectedMode}&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=1`;
        
        const iframe = createElement('iframe', {
          className: 'gcal-block__iframe',
          attrs: { src: newUrl, frameborder: '0', scrolling: 'no', loading: 'lazy' }
        });
        content.appendChild(iframe);
        
        // Mode switcher
        const switcher = createElement('div', { className: 'gcal-block__mode-switcher' });
        const modes = [
          { value: 'MONTH', label: 'Month' },
          { value: 'WEEK', label: 'Week' },
          { value: 'AGENDA', label: 'Agenda' }
        ];
        
        modes.forEach(m => {
          const btn = createElement('button', {
            className: `gcal-block__mode-btn ${m.value === selectedMode ? 'is-active' : ''}`,
            text: m.label,
            attrs: { type: 'button', 'data-mode': m.value }
          });
          btn.addEventListener('click', () => {
            switcher.querySelectorAll('.gcal-block__mode-btn').forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            const oldIframe = content.querySelector('.gcal-block__iframe');
            if (oldIframe) {
              const updatedUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(parsedId)}&mode=${m.value}&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=1`;
              const newIframe = createElement('iframe', {
                className: 'gcal-block__iframe',
                attrs: { src: updatedUrl, frameborder: '0', scrolling: 'no', loading: 'lazy' }
              });
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
    
    content.appendChild(setup);
  }
  
  wrapper.appendChild(header);
  wrapper.appendChild(content);
  
  block.appendChild(floaty);
  block.appendChild(wrapper);
  
  return block;
}

// ==========================================================================
// UTILITY EXPORTS
// ==========================================================================

/**
 * Convert board data to JSON string for storage
 */
export function boardToJson() {
  const data = serializeBoard();
  return JSON.stringify(data);
}

/**
 * Parse JSON string and render board
 */
export function jsonToBoard(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    deserializeBoard(data);
    return true;
  } catch (e) {
    console.error('Failed to parse board JSON:', e);
    return false;
  }
}
