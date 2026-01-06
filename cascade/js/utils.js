/**
 * ==========================================================================
 * CASCADE - Utility Functions
 * ==========================================================================
 * Pure helper functions with no side effects.
 */

// ==========================================================================
// DOM UTILITIES
// ==========================================================================

/**
 * Query selector shorthand
 */
export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

/**
 * Create element with optional classes and attributes
 */
export function createElement(tag, options = {}) {
  const el = document.createElement(tag);
  
  if (options.className) el.className = options.className;
  if (options.id) el.id = options.id;
  if (options.html) el.innerHTML = options.html;
  if (options.text) el.textContent = options.text;
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, val]) => el.setAttribute(key, val));
  }
  if (options.data) {
    Object.entries(options.data).forEach(([key, val]) => el.dataset[key] = val);
  }
  if (options.children) {
    options.children.forEach(child => el.appendChild(child));
  }
  
  return el;
}

/**
 * Remove all children from an element
 */
export function clearElement(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * Check if element is visible in viewport
 */
export function isInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// ==========================================================================
// ID & INDEX UTILITIES
// ==========================================================================

let idCounter = 0;

/**
 * Generate unique ID
 */
export function generateId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

/**
 * Generate short random string
 */
export function randomString(length = 6) {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Get item count for indexing
 */
export function getItemCount() {
  return document.querySelectorAll('[data-block-id]').length;
}

// ==========================================================================
// CLASS MANIPULATION
// ==========================================================================

/**
 * Remove multiple classes matching a pattern
 */
export function removeClassesMatching(el, patterns) {
  if (!el) return;
  patterns.forEach(pattern => {
    el.classList.remove(pattern);
  });
}

/**
 * Toggle class and return new state
 */
export function toggleClass(el, className) {
  if (!el) return false;
  el.classList.toggle(className);
  return el.classList.contains(className);
}

// ==========================================================================
// URL UTILITIES
// ==========================================================================

/**
 * Normalize URL (add https if missing)
 */
export function normalizeUrl(url) {
  if (!url) return '';
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
    return 'https://' + url;
  }
  return url;
}

/**
 * Check if valid URL
 */
export function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// ==========================================================================
// STRING UTILITIES
// ==========================================================================

/**
 * Truncate string to length
 */
export function truncate(str, length = 20) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

/**
 * Escape HTML entities
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==========================================================================
// DEBOUNCE & THROTTLE
// ==========================================================================

/**
 * Debounce function calls
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function calls
 */
export function throttle(fn, limit = 100) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ==========================================================================
// ARRAY UTILITIES
// ==========================================================================

/**
 * Get random item from array
 */
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Move item in array
 */
export function moveInArray(arr, fromIndex, toIndex) {
  const item = arr.splice(fromIndex, 1)[0];
  arr.splice(toIndex, 0, item);
  return arr;
}

// ==========================================================================
// FOCUS UTILITIES
// ==========================================================================

/**
 * Focus element and place cursor at end
 */
export function focusAtEnd(el) {
  if (!el) return;
  el.focus();
  
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    el.selectionStart = el.selectionEnd = el.value.length;
  } else if (el.isContentEditable) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

/**
 * Get all focusable block elements
 */
export function getFocusableBlocks() {
  return $$('[data-block-id] [contenteditable="true"], [data-block-id] input');
}

/**
 * Focus previous/next block
 */
export function focusAdjacentBlock(direction = 'next') {
  const blocks = getFocusableBlocks();
  const currentIndex = blocks.indexOf(document.activeElement);
  
  if (currentIndex === -1) return;
  
  const targetIndex = direction === 'next' 
    ? Math.min(currentIndex + 1, blocks.length - 1)
    : Math.max(currentIndex - 1, 0);
    
  focusAtEnd(blocks[targetIndex]);
}

// ==========================================================================
// LOCAL STORAGE UTILITIES
// ==========================================================================

/**
 * Safe localStorage get
 */
export function storageGet(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safe localStorage set
 */
export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ==========================================================================
// EVENT UTILITIES
// ==========================================================================

/**
 * Create custom event
 */
export function emit(eventName, detail = {}) {
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/**
 * Listen for custom event
 */
export function on(eventName, handler) {
  document.addEventListener(eventName, handler);
  return () => document.removeEventListener(eventName, handler);
}
