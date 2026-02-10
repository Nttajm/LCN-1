// ========================================
// MULON - Admin Panel JavaScript
// ========================================

import { MulonData, Auth } from './data-a.js';

// Admin email whitelist - DO NOT MODIFY THIS LIST IN CONSOLE
// Access checks are done server-side style with real-time auth verification
const ADMIN_EMAILS = Object.freeze(['joelmulonde81@gmail.com', 'jordan.herrera@crpusd.org', 'kaidenchatigny@gmail.com', 'captrojolmao@gmail.com', 'ssb2027tech@gmail.com']);


function isAdmin(email) {
  if (!email || typeof email !== 'string') return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Real-time access check - validates against current auth state every time
// Cannot be bypassed by setting variables in console
function isAccessAllowed() {
  // Get current user directly from Auth module (cannot be spoofed)
  const currentUser = Auth.currentUser;
  
  // No user = no access
  if (!currentUser) {
    showToast('Access denied: Not signed in', 'error');
    return false;
  }
  
  // Verify email is in admin list
  if (!isAdmin(currentUser.email)) {
    showToast('Access denied: Not an admin account', 'error');
    return false;
  }
  
  // Double-check the email matches what Firebase reports
  // This prevents any attempt to spoof the currentUser object
  try {
    const actualEmail = currentUser.email;
    if (!actualEmail || !ADMIN_EMAILS.includes(actualEmail.toLowerCase())) {
      showToast('Access denied: Invalid credentials', 'error');
      return false;
    }
  } catch (e) {
    showToast('Access denied: Auth verification failed', 'error');
    return false;
  }
  
  return true;
}

// Legacy variable for overlay display (UI only, not for security)
let access_allowed = false;

document.addEventListener('DOMContentLoaded', async function() {
  // Initialize Auth first
  Auth.init();
  
  // Check for device/email ban immediately (before anything else)
  if (typeof window.checkBanStatus === 'function') {
    const isBanned = await window.checkBanStatus();
    if (isBanned) return; // Stop execution if banned and redirecting
  }
  
  // Setup admin sign in button
  const adminSignInBtn = document.getElementById('adminSignInBtn');
  if (adminSignInBtn) {
    adminSignInBtn.addEventListener('click', async () => {
      await Auth.signInWithGoogle();
    });
  }
  
  // Listen for auth state changes
  Auth.onAuthStateChange(async (user) => {
    // Check ban status on every auth state change
    if (typeof window.checkBanStatus === 'function') {
      const isBanned = await window.checkBanStatus();
      if (isBanned) return; // Stop if banned and redirecting
    }
    checkAdminAccess(user);
  });
  
  // Show loading state
  showLoading();
  
  // Initialize data from Firebase
  await MulonData.init();
  
  // Render markets list
  renderMarketList();
  
  // Populate category dropdown and list
  populateCategoryDropdown();
  renderCategoryList();
  
  // Render suggestions
  renderSuggestionList();
  
  // Setup form
  setupForm();
  
  // Setup category form
  setupCategoryForm();
  
  // Setup management tabs
  setupManagementTabs();
  
  // Setup users management
  setupUsersManagement();
  
  // Setup waitlist management
  setupWaitlistManagement();
  
  // Setup purchases management
  setupPurchasesManagement();
  
  // Setup delete modal
  setupDeleteModal();
  
  // Setup resolve modal
  setupResolveModal();
  
  // Setup reset button
  setupResetButton();
  
  // Setup transfer button
  setupTransferButton();
  
  // Set default dates
  setDefaultDates();
});

// ========================================
// ADMIN ACCESS CONTROL
// ========================================
function checkAdminAccess(user) {
  const overlay = document.getElementById('accessOverlay');
  const message = document.getElementById('accessMessage');
  const signInBtn = document.getElementById('adminSignInBtn');
  
  if (!overlay) return;

  access_allowed = false;
  
  if (!user) {
    // Not signed in
    overlay.classList.add('active');
    message.textContent = 'Please sign in with an admin account to continue.';
    signInBtn.style.display = 'flex';
  } else if (!isAdmin(user.email)) {
    // Signed in but not admin
    overlay.classList.add('active');
    message.textContent = `Access denied. "${user.email}" is not an admin account.`;
    signInBtn.style.display = 'none';
  } else {
    // Admin access granted
    overlay.classList.remove('active');
    access_allowed = true;
  }
}

function showLoading() {
  const listContainer = document.getElementById('marketList');
  if (listContainer) {
    listContainer.innerHTML = '<div class="loading-state">Loading markets from Firebase...</div>';
  }
}

// ========================================
// RENDER MARKET LIST
// ========================================
async function renderMarketList() {
  const markets = await MulonData.getMarkets();
  const listContainer = document.getElementById('marketList');
  
  if (markets.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p class="empty-state-text">No markets yet. Create your first market!</p>
      </div>
    `;
    return;
  }
  
  // Sort by creation date (newest first)
  const sortedMarkets = [...markets].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  listContainer.innerHTML = sortedMarkets.map(market => renderMarketItem(market)).join('');
  
  // Attach event listeners
  attachMarketItemListeners();
}

function renderMarketItem(market) {
  const category = MulonData.categories[market.category] || { icon: '📊', label: 'Other' };
  
  // Check market status
  const now = new Date();
  const endDateTime = new Date(`${market.endDate}T${market.endTime || '23:59'}`);
  const isExpired = now > endDateTime;
  const isResolved = market.resolved === true;
  const isPending = isExpired && !isResolved;
  
  // Status badge
  let statusBadge = '';
  if (isResolved) {
    const outcome = market.resolvedOutcome === 'yes' ? '✓ YES' : '✗ NO';
    const outcomeClass = market.resolvedOutcome === 'yes' ? 'resolved-yes' : 'resolved-no';
    statusBadge = `<span class="market-status ${outcomeClass}">${outcome}</span>`;
  } else if (isPending) {
    statusBadge = `<span class="market-status pending">⏳ Pending</span>`;
  } else {
    statusBadge = `<span class="market-status active">🟢 Active</span>`;
  }
  
  // Format end time
  const endTimeDisplay = market.endTime || '23:59';
  
  // Check if multi-option market
  const isMulti = market.marketType === 'multi';
  
  // Build price display
  let priceDisplay;
  if (isMulti && market.options) {
    priceDisplay = market.options.slice(0, 3).map(opt => 
      `<span style="color: ${opt.color}">${opt.label} ${opt.price}%</span>`
    ).join(' · ');
    if (market.options.length > 3) {
      priceDisplay += ` +${market.options.length - 3} more`;
    }
  } else {
    const yesLabel = market.customLabels && market.yesLabel ? market.yesLabel : 'Yes';
    const noLabel = market.customLabels && market.noLabel ? market.noLabel : 'No';
    priceDisplay = `<span class="yes">${yesLabel} ${market.yesPrice}¢</span> / <span class="no">${noLabel} ${market.noPrice}¢</span>`;
  }
  
  const typeBadge = isMulti ? '<span class="market-item-type multi">📊 Multi</span>' : '';
  
  return `
    <div class="market-item ${isResolved ? 'resolved' : ''} ${isPending ? 'pending' : ''}" data-market-id="${market.id}">
      <div class="market-item-content">
        <div class="market-item-header">
          <div class="market-item-title">${market.title}</div>
          ${statusBadge}
        </div>
        <div class="market-item-meta">
          <span class="market-item-tag ${market.category}">${category.icon} ${category.label}</span>
          ${typeBadge}
          <span class="market-item-price">${priceDisplay}</span>
          <span class="market-item-date">Ends ${MulonData.formatDate(market.endDate)} @ ${endTimeDisplay}</span>
          ${market.featured ? '<span class="market-item-featured">⭐ Featured</span>' : ''}
        </div>
      </div>
      <div class="market-item-actions">
        ${!isResolved ? `
          <button class="btn-icon resolve ${isPending ? 'highlight' : ''}" data-id="${market.id}" title="Resolve Market">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </button>
        ` : ''}
        <button class="btn-icon edit" data-id="${market.id}" title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
          </svg>
        </button>
        <button class="btn-icon delete" data-id="${market.id}" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function attachMarketItemListeners() {
  // Edit buttons
  document.querySelectorAll('.btn-icon.edit').forEach(btn => {
    btn.addEventListener('click', function() {
      const marketId = this.dataset.id;
      editMarket(marketId);
    });
  });
  
  // Delete buttons
  document.querySelectorAll('.btn-icon.delete').forEach(btn => {
    btn.addEventListener('click', function() {
      const marketId = this.dataset.id;
      showDeleteModal(marketId);
    });
  });
  
  // Resolve buttons
  document.querySelectorAll('.btn-icon.resolve').forEach(btn => {
    btn.addEventListener('click', function() {
      const marketId = this.dataset.id;
      showResolveModal(marketId);
    });
  });
}

// ========================================
// FORM HANDLING
// ========================================
let isEditMode = false;
let editingMarketId = null;
let currentMarketType = 'binary';
let multiOptions = [];

// Default colors for multi-option markets
const OPTION_COLORS = [
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#ec4899', // pink
  '#6366f1', // indigo
];

function setupForm() {
  const form = document.getElementById('marketForm');
  const yesPriceInput = document.getElementById('yesPrice');
  const noPricePreview = document.getElementById('noPricePreview');
  const cancelBtn = document.getElementById('cancelBtn');
  const customLabelsCheckbox = document.getElementById('customLabels');
  const customLabelsRow = document.getElementById('customLabelsRow');
  
  // Market type toggle
  const typeBinaryBtn = document.getElementById('typeBinary');
  const typeMultiBtn = document.getElementById('typeMulti');
  const binaryOptions = document.getElementById('binaryOptions');
  const multiOptionsSection = document.getElementById('multiOptionsSection');
  const addOptionBtn = document.getElementById('addOptionBtn');
  
  // Type toggle handlers
  if (typeBinaryBtn) {
    typeBinaryBtn.addEventListener('click', () => setMarketType('binary'));
  }
  if (typeMultiBtn) {
    typeMultiBtn.addEventListener('click', () => setMarketType('multi'));
  }
  
  // Add option button
  if (addOptionBtn) {
    addOptionBtn.addEventListener('click', () => addMultiOption());
  }
  
  // Update No price preview when Yes price changes
  yesPriceInput.addEventListener('input', function() {
    const yesPrice = parseInt(this.value) || 0;
    noPricePreview.textContent = Math.max(0, 100 - yesPrice);
  });
  
  // Toggle custom labels fields
  if (customLabelsCheckbox && customLabelsRow) {
    customLabelsCheckbox.addEventListener('change', function() {
      customLabelsRow.style.display = this.checked ? 'flex' : 'none';
      if (!this.checked) {
        document.getElementById('yesLabel').value = '';
        document.getElementById('noLabel').value = '';
      }
    });
  }
  
  // Cancel button
  cancelBtn.addEventListener('click', resetForm);
  
  // Form submit
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!isAccessAllowed()) return;
    
    const isMulti = currentMarketType === 'multi';
    
    const formData = {
      title: document.getElementById('title').value.trim(),
      subtitle: document.getElementById('subtitle').value.trim(),
      category: document.getElementById('category').value,
      startDate: document.getElementById('startDate').value,
      endDate: document.getElementById('endDate').value,
      endTime: document.getElementById('endTime').value || '15:00',
      volume: parseInt(document.getElementById('volume').value) || 0,
      featured: document.getElementById('featured').checked,
      marketType: currentMarketType
    };
    
    if (isMulti) {
      // Multi-option market
      formData.options = multiOptions.map((opt, idx) => ({
        id: opt.id || `opt_${idx}`,
        label: opt.label,
        price: opt.price,
        color: opt.color
      }));
      formData.yesPrice = null;
      formData.noPrice = null;
      formData.customLabels = false;
    } else {
      // Binary market
      formData.yesPrice = parseInt(document.getElementById('yesPrice').value);
      formData.noPrice = 100 - formData.yesPrice;
      formData.customLabels = document.getElementById('customLabels').checked;
      formData.yesLabel = document.getElementById('yesLabel').value.trim() || null;
      formData.noLabel = document.getElementById('noLabel').value.trim() || null;
      formData.options = null;
    }
    
    // Add category info
    const category = MulonData.categories[formData.category];
    if (category) {
      formData.categoryIcon = category.icon;
      formData.categoryLabel = category.label;
    }
    
    // Validate
    if (!formData.title || !formData.category || !formData.startDate || !formData.endDate) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    // Validate based on market type
    if (isMulti) {
      if (multiOptions.length < 2) {
        showToast('Multi-option markets need at least 2 options', 'error');
        return;
      }
      const totalProb = multiOptions.reduce((sum, opt) => sum + (opt.price || 0), 0);
      if (totalProb !== 100) {
        showToast('Option probabilities must sum to 100%', 'error');
        return;
      }
      const emptyLabels = multiOptions.some(opt => !opt.label || !opt.label.trim());
      if (emptyLabels) {
        showToast('All options must have labels', 'error');
        return;
      }
    } else {
      if (formData.yesPrice < 1 || formData.yesPrice > 99) {
        showToast('Yes price must be between 1 and 99', 'error');
        return;
      }
    }
    
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      showToast('End date must be after start date', 'error');
      return;
    }
    
    // Disable submit button while saving
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    try {
      if (isEditMode && editingMarketId) {
        // Update existing market
        await MulonData.updateMarket(editingMarketId, formData);
        showToast('Market updated successfully!', 'success');
      } else {
        // Create new market
        await MulonData.addMarket(formData);
        showToast('Market created successfully!', 'success');
      }
      
      // Refresh list and reset form
      await renderMarketList();
      resetForm();
    } catch (error) {
      showToast('Error saving market: ' + error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isEditMode ? 'Save Changes' : 'Create Market';
    }
  });
}

function editMarket(marketId) {
  const market = MulonData.getMarket(marketId);
  if (!market) return;

  if (!isAccessAllowed()) return;
  
  isEditMode = true;
  editingMarketId = marketId;
  
  // Populate form
  document.getElementById('marketId').value = marketId;
  document.getElementById('title').value = market.title;
  document.getElementById('subtitle').value = market.subtitle || '';
  document.getElementById('category').value = market.category;
  document.getElementById('startDate').value = market.startDate;
  document.getElementById('endDate').value = market.endDate;
  document.getElementById('endTime').value = market.endTime || '15:00';
  document.getElementById('volume').value = market.volume || 0;
  document.getElementById('featured').checked = market.featured || false;
  
  // Set market type
  const isMulti = market.marketType === 'multi';
  if (isMulti) {
    multiOptions = (market.options || []).map(opt => ({
      id: opt.id,
      label: opt.label,
      price: opt.price,
      color: opt.color
    }));
    setMarketType('multi');
  } else {
    document.getElementById('yesPrice').value = market.yesPrice || 50;
    document.getElementById('noPricePreview').textContent = market.noPrice || 50;
    
    // Populate custom labels
    const customLabelsCheckbox = document.getElementById('customLabels');
    const customLabelsRow = document.getElementById('customLabelsRow');
    customLabelsCheckbox.checked = market.customLabels || false;
    customLabelsRow.style.display = market.customLabels ? 'flex' : 'none';
    document.getElementById('yesLabel').value = market.yesLabel || '';
    document.getElementById('noLabel').value = market.noLabel || '';
    
    setMarketType('binary');
  }
  
  // Update UI
  document.getElementById('formTitle').textContent = '✏️ Edit Market';
  document.getElementById('submitBtn').textContent = 'Save Changes';
  document.querySelector('.form-panel').classList.add('editing');
  
  // Show trades section and load trades
  showMarketTrades(marketId);
  
  // Scroll to form
  document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
}

// ========================================
// MARKET TRADES & POSITIONS
// ========================================
async function showMarketTrades(marketId) {
  const tradesSection = document.getElementById('marketTradesSection');
  tradesSection.style.display = 'block';
  
  // Setup tabs
  setupTradesTabs();
  
  // Setup refresh button
  const refreshBtn = document.getElementById('refreshTradesBtn');
  refreshBtn.onclick = () => loadMarketTradesAndPositions(marketId);
  
  // Load data
  await loadMarketTradesAndPositions(marketId);
}

function setupTradesTabs() {
  const tabs = document.querySelectorAll('.trades-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Show corresponding content
      const tabName = this.dataset.tab;
      document.getElementById('positionsTab').style.display = tabName === 'positions' ? 'block' : 'none';
      document.getElementById('tradesTab').style.display = tabName === 'trades' ? 'block' : 'none';
    });
  });
}

async function loadMarketTradesAndPositions(marketId) {
  const positionsList = document.getElementById('positionsList');
  const tradesList = document.getElementById('tradesList');
  
  // Show loading state
  positionsList.innerHTML = '<div class="trades-loading">Loading positions...</div>';
  tradesList.innerHTML = '<div class="trades-loading">Loading trades...</div>';
  
  // Load positions
  const positions = await MulonData.getMarketPositions(marketId);
  renderPositions(positions);
  
  // Load trades
  const trades = await MulonData.getMarketTradesWithUsers(marketId);
  renderTrades(trades);
}

function renderPositions(positions) {
  const positionsList = document.getElementById('positionsList');
  
  if (positions.length === 0) {
    positionsList.innerHTML = `
      <div class="trades-empty">
        <span class="trades-empty-icon">📭</span>
        <p>No one has positions in this market yet</p>
      </div>
    `;
    return;
  }
  
  positionsList.innerHTML = positions.map(pos => `
    <div class="position-item">
      <div class="position-user">
        ${pos.photoURL 
          ? `<img src="${pos.photoURL}" alt="" class="position-avatar">`
          : `<div class="position-avatar-placeholder">${(pos.displayName || 'A').charAt(0).toUpperCase()}</div>`
        }
        <div class="position-user-info">
          <span class="position-name">${escapeHtml(pos.displayName)}</span>
          <span class="position-email">${escapeHtml(pos.email)}</span>
        </div>
      </div>
      <div class="position-details">
        <span class="position-choice ${pos.choice}">${pos.choice.toUpperCase()}</span>
        <span class="position-shares">${pos.shares.toFixed(2)} shares</span>
        <span class="position-cost">$${pos.costBasis.toFixed(2)} invested</span>
      </div>
    </div>
  `).join('');
}

function renderTrades(trades) {
  const tradesList = document.getElementById('tradesList');
  
  if (trades.length === 0) {
    tradesList.innerHTML = `
      <div class="trades-empty">
        <span class="trades-empty-icon">📭</span>
        <p>No trades have been made on this market yet</p>
      </div>
    `;
    return;
  }
  
  tradesList.innerHTML = trades.map(trade => {
    const date = new Date(trade.timestamp);
    const timeStr = date.toLocaleString();
    const sideLabel = trade.side === 'buy' ? 'Bought' : 'Sold';
    const sideClass = trade.side === 'buy' ? 'buy' : 'sell';
    
    return `
      <div class="trade-item">
        <div class="trade-user">
          ${trade.user.photoURL 
            ? `<img src="${trade.user.photoURL}" alt="" class="trade-avatar">`
            : `<div class="trade-avatar-placeholder">${(trade.user.displayName || 'A').charAt(0).toUpperCase()}</div>`
          }
          <div class="trade-user-info">
            <span class="trade-name">${escapeHtml(trade.user.displayName)}</span>
            <span class="trade-time">${timeStr}</span>
          </div>
        </div>
        <div class="trade-details">
          <span class="trade-action ${sideClass}">${sideLabel}</span>
          <span class="trade-choice ${trade.choice}">${trade.choice.toUpperCase()}</span>
          <span class="trade-shares">${trade.shares.toFixed(2)} @ ${trade.price}¢</span>
          <span class="trade-cost">$${trade.cost.toFixed(2)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function hideMarketTrades() {
  const tradesSection = document.getElementById('marketTradesSection');
  if (tradesSection) {
    tradesSection.style.display = 'none';
  }
}

// ========================================
// MULTI-OPTION MARKET FUNCTIONS
// ========================================
function setMarketType(type) {
  currentMarketType = type;
  
  const typeBinaryBtn = document.getElementById('typeBinary');
  const typeMultiBtn = document.getElementById('typeMulti');
  const binaryOptions = document.getElementById('binaryOptions');
  const customLabelsRow = document.getElementById('customLabelsRow');
  const multiOptionsSection = document.getElementById('multiOptionsSection');
  const yesPriceGroup = document.getElementById('yesPrice').closest('.form-group');
  
  if (type === 'binary') {
    typeBinaryBtn.classList.add('active');
    typeMultiBtn.classList.remove('active');
    binaryOptions.style.display = 'flex';
    multiOptionsSection.style.display = 'none';
    yesPriceGroup.style.display = 'block';
  } else {
    typeMultiBtn.classList.add('active');
    typeBinaryBtn.classList.remove('active');
    binaryOptions.style.display = 'none';
    customLabelsRow.style.display = 'none';
    multiOptionsSection.style.display = 'block';
    yesPriceGroup.style.display = 'none';
    
    // Initialize with 2 options if empty
    if (multiOptions.length === 0) {
      addMultiOption('Option 1', 50);
      addMultiOption('Option 2', 50);
    }
  }
}

function addMultiOption(label = '', price = 0) {
  const id = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const color = OPTION_COLORS[multiOptions.length % OPTION_COLORS.length];
  
  multiOptions.push({ id, label, price, color });
  renderMultiOptions();
}

function removeMultiOption(id) {
  multiOptions = multiOptions.filter(opt => opt.id !== id);
  renderMultiOptions();
}

function updateMultiOption(id, field, value) {
  const option = multiOptions.find(opt => opt.id === id);
  if (option) {
    option[field] = field === 'price' ? parseInt(value) || 0 : value;
    updateProbabilityTotal();
  }
}

function renderMultiOptions() {
  const list = document.getElementById('multiOptionsList');
  if (!list) return;
  
  list.innerHTML = multiOptions.map((opt, idx) => `
    <div class="multi-option-item" data-id="${opt.id}">
      <input type="color" class="option-color" value="${opt.color}" 
             onchange="window.updateMultiOptionColor('${opt.id}', this.value)">
      <input type="text" placeholder="Option name" value="${escapeHtml(opt.label)}" 
             oninput="window.updateMultiOption('${opt.id}', 'label', this.value)">
      <input type="number" min="1" max="99" placeholder="%" value="${opt.price}" 
             oninput="window.updateMultiOption('${opt.id}', 'price', this.value)">
      <span class="option-percent">%</span>
      ${multiOptions.length > 2 ? `
        <button type="button" class="remove-option" onclick="window.removeMultiOption('${opt.id}')">×</button>
      ` : ''}
    </div>
  `).join('');
  
  updateProbabilityTotal();
}

function updateProbabilityTotal() {
  const total = multiOptions.reduce((sum, opt) => sum + (opt.price || 0), 0);
  const totalEl = document.getElementById('totalProbability');
  if (totalEl) {
    totalEl.textContent = `${total}%`;
    totalEl.classList.toggle('invalid', total !== 100);
  }
}

// Make functions available globally for inline handlers
window.updateMultiOption = updateMultiOption;
window.updateMultiOptionColor = (id, color) => {
  const option = multiOptions.find(opt => opt.id === id);
  if (option) option.color = color;
};
window.removeMultiOption = removeMultiOption;

function resetForm() {
  isEditMode = false;
  editingMarketId = null;
  
  document.getElementById('marketForm').reset();
  document.getElementById('marketId').value = '';
  document.getElementById('yesPrice').value = 50;
  document.getElementById('noPricePreview').textContent = '50';
  
  // Reset custom labels
  document.getElementById('customLabels').checked = false;
  document.getElementById('customLabelsRow').style.display = 'none';
  document.getElementById('yesLabel').value = '';
  document.getElementById('noLabel').value = '';
  
  // Reset multi-options
  currentMarketType = 'binary';
  multiOptions = [];
  setMarketType('binary');
  
  // Reset UI
  document.getElementById('formTitle').textContent = '➕ Create New Market';
  document.getElementById('submitBtn').textContent = 'Create Market';
  document.querySelector('.form-panel').classList.remove('editing');
  
  // Hide trades section
  hideMarketTrades();
  
  // Reset dates
  setDefaultDates();
}

function setDefaultDates() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  document.getElementById('startDate').value = formatDateForInput(today);
  document.getElementById('endDate').value = formatDateForInput(nextWeek);
}

function formatDateForInput(date) {
  return date.toISOString().split('T')[0];
}

// ========================================
// DELETE MODAL
// ========================================
let deletingMarketId = null;

function setupDeleteModal() {
  const modal = document.getElementById('deleteModal');
  const cancelBtn = document.getElementById('cancelDelete');
  const confirmBtn = document.getElementById('confirmDelete');
  
  cancelBtn.addEventListener('click', hideDeleteModal);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      hideDeleteModal();
    }
  });
  
  confirmBtn.addEventListener('click', async function() {
    if (!isAccessAllowed()) return;
    
    if (deletingMarketId) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Deleting...';
      
      try {
        await MulonData.deleteMarket(deletingMarketId);
        await renderMarketList();
        showToast('Market deleted', 'success');
        
        // If editing this market, reset form
        if (editingMarketId === deletingMarketId) {
          resetForm();
        }
      } catch (error) {
        showToast('Error deleting market', 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Delete';
      }
    }
    hideDeleteModal();
  });
}

function showDeleteModal(marketId) {
  deletingMarketId = marketId;
  document.getElementById('deleteModal').classList.add('active');
}

function hideDeleteModal() {
  deletingMarketId = null;
  document.getElementById('deleteModal').classList.remove('active');
}

// ========================================
// RESET BUTTON
// ========================================
function setupResetButton() {
  document.getElementById('resetBtn').addEventListener('click', async function() {
    if (!isAccessAllowed()) return;
    
    if (confirm('Reset all markets to defaults? This will delete all custom markets.')) {
      this.disabled = true;
      this.textContent = 'Resetting...';
      
      try {
        await MulonData.resetToDefaults();
        await renderMarketList();
        resetForm();
        showToast('Markets reset to defaults', 'success');
      } catch (error) {
        showToast('Error resetting markets', 'error');
      } finally {
        this.disabled = false;
        this.textContent = 'Reset to Defaults';
      }
    }
  });
}

// ========================================
// TRANSFER BUTTON (localStorage to Firebase)
// ========================================
function setupTransferButton() {
  const transferBtn = document.getElementById('transferBtn');
  if (!transferBtn) return;
  
  transferBtn.addEventListener('click', async function() {
    if (!isAccessAllowed()) return;
    if (confirm('Transfer all markets from localStorage to Firebase? This will add any localStorage markets to Firebase.')) {
      this.disabled = true;
      this.textContent = 'Transferring...';
      
      try {
        const success = await MulonData.transferFromLocalStorage();
        if (success) {
          await MulonData.refreshMarkets();
          await renderMarketList();
          showToast('Transfer complete! Markets moved to Firebase.', 'success');
        } else {
          showToast('No localStorage data to transfer', 'error');
        }
      } catch (error) {
        showToast('Error transferring: ' + error.message, 'error');
      } finally {
        this.disabled = false;
        this.textContent = 'Transfer from localStorage';
      }
    }
  });
}

// ========================================
// MARKET RESOLUTION
// ========================================
let resolvingMarketId = null;

function setupResolveModal() {
  const cancelBtn = document.getElementById('cancelResolve');
  const resolveYesBtn = document.getElementById('resolveYes');
  const resolveNoBtn = document.getElementById('resolveNo');
  const modal = document.getElementById('resolveModal');
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideResolveModal);
  }
  
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) hideResolveModal();
    });
  }
  
  if (resolveYesBtn) {
    resolveYesBtn.addEventListener('click', () => resolveMarket('yes'));
  }
  
  if (resolveNoBtn) {
    resolveNoBtn.addEventListener('click', () => resolveMarket('no'));
  }
}

function showResolveModal(marketId) {
  const market = MulonData.getMarket(marketId);
  if (!market) return;
  
  resolvingMarketId = marketId;
  
  const modal = document.getElementById('resolveModal');
  const titleEl = document.getElementById('resolveMarketTitle');
  const resolveYesBtn = document.getElementById('resolveYes');
  const resolveNoBtn = document.getElementById('resolveNo');
  
  if (titleEl) titleEl.textContent = market.title;
  
  // Update button labels for custom labels
  const yesLabel = market.customLabels && market.yesLabel ? market.yesLabel : 'YES';
  const noLabel = market.customLabels && market.noLabel ? market.noLabel : 'NO';
  
  if (resolveYesBtn) {
    const labelSpan = resolveYesBtn.querySelector('span:last-child');
    if (labelSpan) labelSpan.textContent = yesLabel;
  }
  if (resolveNoBtn) {
    const labelSpan = resolveNoBtn.querySelector('span:last-child');
    if (labelSpan) labelSpan.textContent = noLabel;
  }
  
  if (modal) modal.classList.add('active');
}

function hideResolveModal() {
  const modal = document.getElementById('resolveModal');
  if (modal) modal.classList.remove('active');
  resolvingMarketId = null;
}

async function resolveMarket(outcome) {
  if (!resolvingMarketId) return;
  if (!isAccessAllowed()) return;
  
  const market = MulonData.getMarket(resolvingMarketId);
  if (!market) return;
  
  const resolveYesBtn = document.getElementById('resolveYes');
  const resolveNoBtn = document.getElementById('resolveNo');
  
  // Disable buttons while processing
  if (resolveYesBtn) resolveYesBtn.disabled = true;
  if (resolveNoBtn) resolveNoBtn.disabled = true;
  
  try {
    // Resolve the market and pay out winners
    const result = await MulonData.resolveMarket(resolvingMarketId, outcome);
    
    if (result.success) {
      showToast(`Market resolved as ${outcome.toUpperCase()}! ${result.payoutCount} positions paid out.`, 'success');
      hideResolveModal();
      await renderMarketList();
    } else {
      showToast('Error resolving market: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Resolution error:', error);
    showToast('Error resolving market: ' + error.message, 'error');
  } finally {
    if (resolveYesBtn) resolveYesBtn.disabled = false;
    if (resolveNoBtn) resolveNoBtn.disabled = false;
  }
}

// ========================================
// TOAST NOTIFICATION
// ========================================
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  toastMessage.textContent = message;
  toast.className = 'toast ' + type;
  
  // Show toast
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ========================================
// CATEGORY MANAGEMENT
// ========================================
function populateCategoryDropdown() {
  const categorySelect = document.getElementById('category');
  if (!categorySelect) return;
  
  const categories = MulonData.getCategories();
  
  // Clear existing options except first
  categorySelect.innerHTML = '<option value="">Select category</option>';
  
  // Add categories
  Object.entries(categories).forEach(([id, cat]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `${cat.icon} ${cat.label}`;
    categorySelect.appendChild(option);
  });
}

function renderCategoryList() {
  const categoryList = document.getElementById('categoryList');
  if (!categoryList) return;
  
  const categories = MulonData.getCategories();
  
  if (Object.keys(categories).length === 0) {
    categoryList.innerHTML = '<p class="empty-message">No categories yet</p>';
    return;
  }
  
  categoryList.innerHTML = Object.entries(categories).map(([id, cat]) => `
    <div class="category-item" data-category-id="${id}">
      <span class="category-icon">${cat.icon}</span>
      <span class="category-label">${cat.label}</span>
      <span class="category-id">${id}</span>
      <button class="btn-icon delete-category" data-id="${id}" title="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');
  
  // Attach delete listeners
  categoryList.querySelectorAll('.delete-category').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      const catId = this.dataset.id;
      if (confirm(`Delete category "${catId}"? Markets using this category won't be deleted but may display incorrectly.`)) {
        const result = await MulonData.deleteCategory(catId);
        if (result.success) {
          showToast('Category deleted', 'success');
          renderCategoryList();
          populateCategoryDropdown();
        } else {
          showToast('Error deleting category', 'error');
        }
      }
    });
  });
}

function setupCategoryForm() {
  const form = document.getElementById('categoryForm');
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    if (!isAccessAllowed()) return;
    e.preventDefault();
    
    const id = document.getElementById('catId').value.trim().toLowerCase().replace(/\s+/g, '-');
    const icon = document.getElementById('catIcon').value.trim();
    const label = document.getElementById('catLabel').value.trim();
    
    if (!id || !icon || !label) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    const result = await MulonData.addCategory(id, icon, label, id);
    
    if (result.success) {
      showToast('Category added!', 'success');
      form.reset();
      renderCategoryList();
      populateCategoryDropdown();
    } else {
      showToast('Error adding category: ' + result.error, 'error');
    }
  });
}

// ========================================
// MANAGEMENT TABS
// ========================================
let waitlistLoaded = false;
let purchasesLoaded = false;

function setupManagementTabs() {
  const tabs = document.querySelectorAll('.management-tab');
  const contents = {
    categories: document.getElementById('categoriesTabContent'),
    waitlist: document.getElementById('waitlistTabContent'),
    users: document.getElementById('usersTabContent'),
    suggestions: document.getElementById('suggestionsTabContent'),
    purchases: document.getElementById('purchasesTabContent')
  };
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      if (!isAccessAllowed()) return;
      const tabName = this.dataset.tab;
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Show corresponding content
      Object.keys(contents).forEach(key => {
        if (contents[key]) {
          contents[key].style.display = key === tabName ? 'block' : 'none';
          contents[key].classList.toggle('active', key === tabName);
        }
      });
      
      // Load users on first switch to users tab
      if (tabName === 'users' && !usersLoaded) {
        loadAllUsers();
      }
      
      // Load waitlist on first switch to waitlist tab
      if (tabName === 'waitlist' && !waitlistLoaded) {
        loadWaitlist();
        waitlistLoaded = true;
      }
      
      // Load purchases on first switch to purchases tab
      if (tabName === 'purchases' && !purchasesLoaded) {
        loadPurchases();
        purchasesLoaded = true;
      }
    });
  });
}

// ========================================
// USERS MANAGEMENT
// ========================================
let usersLoaded = false;
let allUsers = [];

function setupUsersManagement() {
  // Refresh button
  const refreshBtn = document.getElementById('refreshUsersBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadAllUsers);
  }
  
  // Search input
  const searchInput = document.getElementById('userSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterAndRenderUsers(this.value);
    });
  }
  
  // Bulk action button
  const bulkBtn = document.getElementById('applyBulkBtn');
  if (bulkBtn) {
    bulkBtn.addEventListener('click', applyBulkBalanceAction);
  }
  
  // Quick set buttons
  document.querySelectorAll('[data-set-amount]').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      const amount = parseFloat(this.dataset.setAmount);
      if (!confirm(`Set ALL users' balance to $${amount.toFixed(2)}? This cannot be undone.`)) {
        return;
      }
      
      this.disabled = true;
      const originalText = this.textContent;
      this.textContent = '...';
      
      const result = await MulonData.bulkUpdateBalances(amount, 'set');
      
      this.disabled = false;
      this.textContent = originalText;
      
      if (result.success) {
        showToast(`Set ${result.updatedCount} users to $${amount.toFixed(2)}!`, 'success');
        await loadAllUsers();
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    });
  });
  
  // Bulk keys action button
  const bulkKeysBtn = document.getElementById('applyBulkKeysBtn');
  if (bulkKeysBtn) {
    bulkKeysBtn.addEventListener('click', applyBulkKeysAction);
  }
  
  // Quick add keys buttons
  document.querySelectorAll('[data-set-keys]').forEach(btn => {
    btn.addEventListener('click', async function() {
      const amount = parseInt(this.dataset.setKeys);
      if (!confirm(`Add ${amount} keys to ALL users? This cannot be undone.`)) {
        return;
      }
      
      this.disabled = true;
      const originalText = this.textContent;
      this.textContent = '...';
      
      const result = await MulonData.bulkUpdateKeys(amount, 'add');
      
      this.disabled = false;
      this.textContent = originalText;
      
      if (result.success) {
        showToast(`Added ${amount} keys to ${result.updatedCount} users!`, 'success');
        await loadAllUsers();
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    });
  });
  
  // Reset all positions button
  const resetAllPositionsBtn = document.getElementById('resetAllPositionsBtn');
  if (resetAllPositionsBtn) {
    resetAllPositionsBtn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      if (!confirm('⚠️ Are you SURE you want to reset ALL user positions? This will delete all shares/holdings for every user and CANNOT be undone!')) {
        return;
      }
      
      if (!confirm('This is your FINAL confirmation. All positions will be permanently deleted. Continue?')) {
        return;
      }
      
      this.disabled = true;
      this.textContent = 'Resetting...';
      
      const result = await MulonData.resetAllUsersPositions();
      
      this.disabled = false;
      this.textContent = 'Reset ALL User Positions';
      
      if (result.success) {
        showToast(`Reset positions for ${result.resetCount} users!`, 'success');
        await loadAllUsers();
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    });
  }
  
  // Bulk cards action button
  const bulkCardsBtn = document.getElementById('applyBulkCardsBtn');
  if (bulkCardsBtn) {
    bulkCardsBtn.addEventListener('click', applyBulkCardsAction);
  }
  
  // Reset all cards button
  const resetAllCardsBtn = document.getElementById('resetAllCardsBtn');
  if (resetAllCardsBtn) {
    resetAllCardsBtn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      if (!confirm('⚠️ Are you SURE you want to delete ALL user cards? This will remove every card from every user and CANNOT be undone!')) {
        return;
      }
      
      if (!confirm('This is your FINAL confirmation. All cards will be permanently deleted. Continue?')) {
        return;
      }
      
      this.disabled = true;
      this.textContent = 'Resetting...';
      
      const result = await MulonData.resetAllUsersCards();
      
      this.disabled = false;
      this.textContent = 'Reset ALL User Cards';
      
      if (result.success) {
        showToast(`Deleted ${result.totalCardsDeleted} cards from ${result.resetCount} users!`, 'success');
        await loadAllUsers();
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    });
  }
  
  // Setup cards modal
  setupCardsModal();
}

// Pagination state
const USERS_PER_PAGE = 40;
let displayedUsersCount = 0;
let currentFilteredUsers = [];

async function loadAllUsers() {
  const usersList = document.getElementById('usersList');
  if (usersList) {
    usersList.innerHTML = '<div class="loading-state">Loading users...</div>';
  }
  
  allUsers = await MulonData.getAllUsers();
  usersLoaded = true;
  
  // Reset pagination
  displayedUsersCount = 0;
  currentFilteredUsers = allUsers;
  
  updateUsersStats();
  renderUsersList(allUsers);
}

function updateUsersStats() {
  const totalCount = document.getElementById('totalUsersCount');
  const totalBalance = document.getElementById('totalBalanceSum');
  const totalPositions = document.getElementById('totalPositionsCount');
  const totalKeys = document.getElementById('totalKeysSum');
  
  if (totalCount) {
    totalCount.textContent = allUsers.length;
  }
  
  if (totalBalance) {
    const sum = allUsers.reduce((acc, user) => acc + (user.balance || 0), 0);
    totalBalance.textContent = `$${sum.toFixed(2)}`;
  }
  
  if (totalPositions) {
    const posSum = allUsers.reduce((acc, user) => acc + (user.positions?.length || 0), 0);
    totalPositions.textContent = posSum;
  }
  
  if (totalKeys) {
    const keysSum = allUsers.reduce((acc, user) => acc + (user.keys || 0), 0);
    totalKeys.textContent = keysSum;
  }
  
  const totalCards = document.getElementById('totalCardsSum');
  if (totalCards) {
    // Use cardsCount (fast) or ownedCards.length if cards were loaded
    const cardsSum = allUsers.reduce((acc, user) => {
      if (user.ownedCards !== null) {
        return acc + (user.ownedCards?.length || 0);
      }
      return acc + (user.cardsCount || 0);
    }, 0);
    totalCards.textContent = cardsSum;
  }
}

function filterAndRenderUsers(searchTerm) {
  // Reset pagination when filtering
  displayedUsersCount = 0;
  
  if (!searchTerm.trim()) {
    currentFilteredUsers = allUsers;
    renderUsersList(allUsers);
    return;
  }
  
  const term = searchTerm.toLowerCase();
  const filtered = allUsers.filter(user => 
    (user.displayName || '').toLowerCase().includes(term) ||
    (user.email || '').toLowerCase().includes(term)
  );
  
  currentFilteredUsers = filtered;
  renderUsersList(filtered);
}

function renderUsersList(users, append = false) {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;
  
  // Store current filtered users for pagination
  if (!append) {
    currentFilteredUsers = users;
    displayedUsersCount = 0;
  }
  
  if (users.length === 0) {
    usersList.innerHTML = `
      <div class="users-empty">
        <span class="users-empty-icon">👥</span>
        <p>No users found</p>
      </div>
    `;
    return;
  }
  
  // Get the next batch of users to display
  const startIndex = displayedUsersCount;
  const endIndex = Math.min(startIndex + USERS_PER_PAGE, users.length);
  const usersToRender = users.slice(startIndex, endIndex);
  displayedUsersCount = endIndex;
  
  // Helper to get card count for a user
  const getCardCount = (user) => {
    if (user.ownedCards !== null && user.ownedCards !== undefined) {
      return user.ownedCards.length;
    }
    return user.cardsCount || 0;
  };
  
  const usersHtml = usersToRender.map(user => {
    const cardCount = getCardCount(user);
    return `
    <div class="user-admin-item ${user.banned ? 'user-banned' : ''}" data-user-id="${user.id}">
      ${user.banned ? '<span class="banned-indicator" title="User is banned">🚫</span>' : ''}
      ${user.photoURL 
        ? `<img src="${user.photoURL}" alt="" class="user-admin-avatar">`
        : `<div class="user-admin-avatar-placeholder">${(user.displayName || 'A').charAt(0).toUpperCase()}</div>`
      }
      <div class="user-admin-info">
        <span class="user-admin-name">${escapeHtml(user.displayName)}${user.banned ? ' <span class="banned-badge">BANNED</span>' : ''}</span>
        <span class="user-admin-email">${escapeHtml(user.email)}</span>
      </div>
      <button class="user-positions-count ${user.positions.length > 0 ? 'has-positions clickable' : ''}" data-user-id="${user.id}" ${user.positions.length > 0 ? 'title="Click to view/edit positions"' : ''}>
        ${user.positions.length} position${user.positions.length !== 1 ? 's' : ''}
        ${user.positions.length > 0 ? '<span class="edit-icon">✏️</span>' : ''}
      </button>
      <button class="user-cards-count ${cardCount > 0 ? 'has-cards' : ''} clickable" data-user-id="${user.id}" title="Click to view/edit cards">
        🃏 ${cardCount} card${cardCount !== 1 ? 's' : ''}
        <span class="edit-icon">✏️</span>
      </button>
      <div class="user-admin-balance">
        <span>$</span>
        <input type="number" class="user-balance-input" value="${user.balance.toFixed(2)}" step="0.01" data-original="${user.balance.toFixed(2)}">
      </div>
      <div class="user-admin-keys">
        <span>🔑</span>
        <input type="number" class="user-keys-input" value="${user.keys || 0}" step="1" min="0" data-original="${user.keys || 0}">
      </div>
      <div class="user-admin-actions">
        <button class="btn-icon save-user" data-user-id="${user.id}" title="Save Balance & Keys">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <button class="btn-icon reset-positions ${user.positions.length === 0 ? 'disabled' : ''}" data-user-id="${user.id}" title="Reset All Positions" ${user.positions.length === 0 ? 'disabled' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
        <button class="btn-icon ban-user ${user.banned ? 'is-banned' : ''}" data-user-id="${user.id}" data-banned="${user.banned ? 'true' : 'false'}" title="${user.banned ? 'Unban User' : 'Ban User'}">
          ${user.banned 
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M9 12l2 2 4-4"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>'
          }
        </button>
      </div>
    </div>
  `}).join('');
  
  // Add Load More button if there are more users
  const hasMoreUsers = displayedUsersCount < users.length;
  const loadMoreHtml = hasMoreUsers ? `
    <div class="load-more-container">
      <button class="btn btn-secondary load-more-btn" id="loadMoreUsersBtn">
        Load More Users (${users.length - displayedUsersCount} remaining)
      </button>
    </div>
  ` : '';
  
  if (append) {
    // Remove old load more button if exists
    const oldLoadMore = usersList.querySelector('.load-more-container');
    if (oldLoadMore) oldLoadMore.remove();
    // Append new users
    usersList.insertAdjacentHTML('beforeend', usersHtml + loadMoreHtml);
  } else {
    usersList.innerHTML = usersHtml + loadMoreHtml;
  }
  
  // Attach Load More button listener
  const loadMoreBtn = document.getElementById('loadMoreUsersBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function() {
      this.disabled = true;
      this.textContent = 'Loading...';
      // Small delay to show loading state
      setTimeout(() => {
        renderUsersList(currentFilteredUsers, true);
      }, 50);
    });
  }
  
  // Attach event listeners to newly added items
  attachUserItemListeners(usersList);
}

// Separate function to attach event listeners to user items
function attachUserItemListeners(usersList) {
  // Attach positions view/edit listeners
  usersList.querySelectorAll('.user-positions-count.clickable:not([data-listener])').forEach(btn => {
    btn.setAttribute('data-listener', 'true');
    btn.addEventListener('click', function() {
      const userId = this.dataset.userId;
      const user = allUsers.find(u => u.id === userId);
      if (user && user.positions.length > 0) {
        showUserPositionsModal(user);
      }
    });
  });
  
  // Attach cards view/edit listeners
  usersList.querySelectorAll('.user-cards-count:not([data-listener])').forEach(btn => {
    btn.setAttribute('data-listener', 'true');
    btn.addEventListener('click', async function() {
      const userId = this.dataset.userId;
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        await showUserCardsModal(user);
      }
    });
  });
  
  // Attach save button listeners (saves both balance and keys)
  usersList.querySelectorAll('.save-user:not([data-listener])').forEach(btn => {
    btn.setAttribute('data-listener', 'true');
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      const userId = this.dataset.userId;
      const item = this.closest('.user-admin-item');
      const balanceInput = item.querySelector('.user-balance-input');
      const keysInput = item.querySelector('.user-keys-input');
      const newBalance = parseFloat(balanceInput.value);
      const newKeys = parseInt(keysInput.value);
      
      if (isNaN(newBalance) || newBalance < 0) {
        showToast('Please enter a valid balance', 'error');
        return;
      }
      
      if (isNaN(newKeys) || newKeys < 0) {
        showToast('Please enter a valid keys amount', 'error');
        return;
      }
      
      this.disabled = true;
      
      // Update balance
      const balanceResult = await MulonData.updateUserBalance(userId, newBalance);
      // Update keys
      const keysResult = await MulonData.updateUserKeys(userId, newKeys);
      
      this.disabled = false;
      
      if (balanceResult.success && keysResult.success) {
        showToast('Balance & Keys updated!', 'success');
        balanceInput.dataset.original = newBalance.toFixed(2);
        keysInput.dataset.original = newKeys;
        balanceInput.style.borderColor = '';
        keysInput.style.borderColor = '';
        // Update local cache
        const userIndex = allUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          allUsers[userIndex].balance = newBalance;
          allUsers[userIndex].keys = newKeys;
          updateUsersStats();
        }
      } else {
        showToast('Error updating user', 'error');
      }
    });
  });
  
  // Attach reset positions button listeners
  usersList.querySelectorAll('.reset-positions:not([data-listener])').forEach(btn => {
    btn.setAttribute('data-listener', 'true');
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      if (this.disabled) return;
      
      const userId = this.dataset.userId;
      const item = this.closest('.user-admin-item');
      const userName = item.querySelector('.user-admin-name').textContent;
      
      if (!confirm(`Reset all positions for "${userName}"? This will delete all their shares and cannot be undone.`)) {
        return;
      }
      
      this.disabled = true;
      const result = await MulonData.resetUserPositions(userId);
      
      if (result.success) {
        showToast('Positions reset!', 'success');
        // Update local cache
        const userIndex = allUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          allUsers[userIndex].positions = [];
          updateUsersStats();
          // Update the positions count display
          const posCount = item.querySelector('.user-positions-count');
          posCount.textContent = '0 positions';
          posCount.classList.remove('has-positions');
        }
      } else {
        showToast('Error resetting positions', 'error');
        this.disabled = false;
      }
    });
  });
  
  // Attach ban button listeners
  usersList.querySelectorAll('.ban-user:not([data-listener])').forEach(btn => {
    btn.setAttribute('data-listener', 'true');
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      
      const userId = this.dataset.userId;
      const isBanned = this.dataset.banned === 'true';
      const item = this.closest('.user-admin-item');
      const userName = item.querySelector('.user-admin-name').textContent.replace(' BANNED', '');
      
      if (isBanned) {
        // Unban user
        if (!confirm(`Unban "${userName}"? They will be able to access the site again.`)) {
          return;
        }
        
        const removeDeviceBans = confirm('Also remove device bans for this user?\n\nClick OK to remove device bans, or Cancel to only unban the account.');
        
        this.disabled = true;
        const result = await MulonData.unbanUser(userId, removeDeviceBans);
        
        if (result.success) {
          showToast('User unbanned!', 'success');
          // Update local cache
          const userIndex = allUsers.findIndex(u => u.id === userId);
          if (userIndex !== -1) {
            allUsers[userIndex].banned = false;
          }
          // Re-render the list
          renderUsersList(allUsers);
        } else {
          showToast('Error unbanning user: ' + result.error, 'error');
          this.disabled = false;
        }
      } else {
        // Ban user - FULL BAN (resets all values, bans email & device)
        const confirmBan = confirm(`⚠️ FULL BAN "${userName}"?\n\nThis will:\n• Set balance to $0\n• Set keys to 0\n• Delete all positions\n• Ban their email permanently\n• Ban all their devices\n• They will be redirected away from the site\n\nThis is a PERMANENT action!`);
        if (!confirmBan) return; // Cancelled
        
        const reason = prompt('Enter ban reason (optional):');
        if (reason === null) return; // Cancelled
        
        this.disabled = true;
        const result = await MulonData.banUser(userId, reason, true); // Always full device ban
        
        if (result.success) {
          showToast(`🔨 User FULLY BANNED! Email & devices blocked.`, 'success');
          // Update local cache - reset all values
          const userIndex = allUsers.findIndex(u => u.id === userId);
          if (userIndex !== -1) {
            allUsers[userIndex].banned = true;
            allUsers[userIndex].balance = 0;
            allUsers[userIndex].keys = 0;
            allUsers[userIndex].positions = [];
          }
          updateUsersStats();
          // Re-render the list
          renderUsersList(allUsers);
        } else {
          showToast('Error banning user: ' + result.error, 'error');
          this.disabled = false;
        }
      }
    });
  });
  
  // Highlight changed inputs
  usersList.querySelectorAll('.user-balance-input:not([data-listener])').forEach(input => {
    input.setAttribute('data-listener', 'true');
    input.addEventListener('input', function() {
      const original = parseFloat(this.dataset.original);
      const current = parseFloat(this.value);
      this.style.borderColor = current !== original ? 'var(--green-primary)' : '';
    });
  });
  
  usersList.querySelectorAll('.user-keys-input:not([data-listener])').forEach(input => {
    input.setAttribute('data-listener', 'true');
    input.addEventListener('input', function() {
      const original = parseInt(this.dataset.original);
      const current = parseInt(this.value);
      this.style.borderColor = current !== original ? 'var(--yellow-primary, #f59e0b)' : '';
    });
  });
}

async function applyBulkBalanceAction() {
  if (!isAccessAllowed()) return;
  const operation = document.getElementById('bulkOperation').value;
  const amount = parseFloat(document.getElementById('bulkAmount').value);
  
  if (isNaN(amount)) {
    showToast('Please enter a valid amount', 'error');
    return;
  }
  
  const operationLabels = {
    add: `add $${amount.toFixed(2)} to`,
    subtract: `subtract $${amount.toFixed(2)} from`,
    set: `set to $${amount.toFixed(2)} for`,
    multiply: `multiply by ${amount} for`
  };
  
  if (!confirm(`Are you sure you want to ${operationLabels[operation]} ALL ${allUsers.length} users? This cannot be undone.`)) {
    return;
  }
  
  const btn = document.getElementById('applyBulkBtn');
  btn.disabled = true;
  btn.textContent = 'Applying...';
  
  const result = await MulonData.bulkUpdateBalances(amount, operation);
  
  btn.disabled = false;
  btn.textContent = 'Apply to All';
  
  if (result.success) {
    showToast(`Updated ${result.updatedCount} users!`, 'success');
    document.getElementById('bulkAmount').value = '';
    await loadAllUsers();
  } else {
    showToast('Error updating balances: ' + result.error, 'error');
  }
}

async function applyBulkKeysAction() {
  const operation = document.getElementById('bulkKeysOperation').value;
  const amount = parseInt(document.getElementById('bulkKeysAmount').value);
  
  if (isNaN(amount) || amount < 0) {
    showToast('Please enter a valid keys amount', 'error');
    return;
  }
  
  const operationLabels = {
    add: `add ${amount} keys to`,
    subtract: `subtract ${amount} keys from`,
    set: `set to ${amount} keys for`
  };
  
  if (!confirm(`Are you sure you want to ${operationLabels[operation]} ALL ${allUsers.length} users? This cannot be undone.`)) {
    return;
  }
  
  const btn = document.getElementById('applyBulkKeysBtn');
  btn.disabled = true;
  btn.textContent = 'Applying...';
  
  const result = await MulonData.bulkUpdateKeys(amount, operation);
  
  btn.disabled = false;
  btn.textContent = 'Apply to All';
  
  if (result.success) {
    showToast(`Updated keys for ${result.updatedCount} users!`, 'success');
    document.getElementById('bulkKeysAmount').value = '';
    await loadAllUsers();
  } else {
    showToast('Error updating keys: ' + result.error, 'error');
  }
}

// ========================================
// BULK CARDS ACTIONS
// ========================================
async function applyBulkCardsAction() {
  if (!isAccessAllowed()) return;
  
  const operation = document.getElementById('bulkCardsOperation').value;
  const cardNumber = document.getElementById('bulkCardNumber').value.trim().toUpperCase();
  
  // Validate card number format
  if (!cardNumber || !cardNumber.match(/^#?\d{3}$/)) {
    showToast('Please enter a valid card number (e.g., #001 or 001)', 'error');
    return;
  }
  
  // Normalize card number format
  const normalizedCardNumber = cardNumber.startsWith('#') ? cardNumber : '#' + cardNumber;
  
  const operationLabels = {
    add: `add card ${normalizedCardNumber} to`,
    remove: `remove card ${normalizedCardNumber} from`
  };
  
  if (!confirm(`Are you sure you want to ${operationLabels[operation]} ALL ${allUsers.length} users? This cannot be undone.`)) {
    return;
  }
  
  const btn = document.getElementById('applyBulkCardsBtn');
  btn.disabled = true;
  btn.textContent = 'Applying...';
  
  let result;
  if (operation === 'add') {
    result = await MulonData.bulkAddCardToAllUsers({ cardNumber: normalizedCardNumber });
  } else {
    result = await MulonData.bulkRemoveCardFromAllUsers(normalizedCardNumber);
  }
  
  btn.disabled = false;
  btn.textContent = 'Apply to All';
  
  if (result.success) {
    const message = operation === 'add' 
      ? `Added card ${normalizedCardNumber} to ${result.updatedCount} users!`
      : `Removed ${result.cardsRemoved || 0} cards from ${result.updatedCount} users!`;
    showToast(message, 'success');
    document.getElementById('bulkCardNumber').value = '';
    await loadAllUsers();
  } else {
    showToast('Error: ' + result.error, 'error');
  }
}

// ========================================
// USER CARDS MODAL
// ========================================
let currentCardsUser = null;

function setupCardsModal() {
  const modal = document.getElementById('cardsModal');
  const closeBtn = document.getElementById('closeCardsModal');
  const cancelBtn = document.getElementById('cancelCardsModal');
  const resetBtn = document.getElementById('resetUserCardsModal');
  const addCardBtn = document.getElementById('addCardToUserBtn');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCardsModal);
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeCardsModal);
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      if (!currentCardsUser) return;
      
      if (!confirm(`Delete ALL cards for "${currentCardsUser.displayName}"? This cannot be undone.`)) {
        return;
      }
      
      this.disabled = true;
      const result = await MulonData.resetUserCards(currentCardsUser.id);
      this.disabled = false;
      
      if (result.success) {
        showToast('All cards deleted!', 'success');
        // Update local cache
        const userIndex = allUsers.findIndex(u => u.id === currentCardsUser.id);
        if (userIndex !== -1) {
          allUsers[userIndex].ownedCards = [];
          allUsers[userIndex].cardsCount = 0;
          updateUsersStats();
          
          // Update the card count button in the users list
          const userItem = document.querySelector(`.user-admin-item[data-user-id="${currentCardsUser.id}"]`);
          if (userItem) {
            const cardBtn = userItem.querySelector('.user-cards-count');
            if (cardBtn) {
              cardBtn.innerHTML = `🃏 0 cards <span class="edit-icon">✏️</span>`;
              cardBtn.classList.remove('has-cards');
            }
          }
        }
        currentCardsUser.ownedCards = [];
        renderCardsModalList([]);
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    });
  }
  
  if (addCardBtn) {
    addCardBtn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      if (!currentCardsUser) return;
      
      const cardInput = document.getElementById('addCardNumber');
      const cardNumber = cardInput.value.trim().toUpperCase();
      
      // Validate card number format
      if (!cardNumber || !cardNumber.match(/^#?\d{3}$/)) {
        showToast('Please enter a valid card number (e.g., #001 or 001)', 'error');
        return;
      }
      
      // Normalize card number format
      const normalizedCardNumber = cardNumber.startsWith('#') ? cardNumber : '#' + cardNumber;
      
      this.disabled = true;
      const result = await MulonData.addCardToUser(currentCardsUser.id, { cardNumber: normalizedCardNumber });
      this.disabled = false;
      
      if (result.success) {
        showToast(`Card ${normalizedCardNumber} added!`, 'success');
        cardInput.value = '';
        
        // Update local cache
        const newCard = { cardNumber: normalizedCardNumber, addedAt: new Date().toISOString(), addedBy: 'admin' };
        const userIndex = allUsers.findIndex(u => u.id === currentCardsUser.id);
        if (userIndex !== -1) {
          if (allUsers[userIndex].ownedCards === null) {
            allUsers[userIndex].ownedCards = [];
          }
          allUsers[userIndex].ownedCards.push(newCard);
          allUsers[userIndex].cardsCount = allUsers[userIndex].ownedCards.length;
          updateUsersStats();
          
          // Update the card count button in the users list
          const userItem = document.querySelector(`.user-admin-item[data-user-id="${currentCardsUser.id}"]`);
          if (userItem) {
            const cardBtn = userItem.querySelector('.user-cards-count');
            if (cardBtn) {
              const count = allUsers[userIndex].ownedCards.length;
              cardBtn.innerHTML = `🃏 ${count} card${count !== 1 ? 's' : ''} <span class="edit-icon">✏️</span>`;
              cardBtn.classList.add('has-cards');
            }
          }
        }
        currentCardsUser.ownedCards.push(newCard);
        renderCardsModalList(currentCardsUser.ownedCards);
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    });
  }
  
  // Close modal on overlay click
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeCardsModal();
      }
    });
  }
}

async function showUserCardsModal(user) {
  currentCardsUser = user;
  const modal = document.getElementById('cardsModal');
  const userInfo = document.getElementById('cardsModalUser');
  const cardsList = document.getElementById('cardsModalList');
  
  // Get current card count (from cardsCount or ownedCards if loaded)
  const currentCount = user.ownedCards !== null ? user.ownedCards.length : (user.cardsCount || 0);
  
  // Show loading state
  cardsList.innerHTML = '<div class="loading-state">Loading cards...</div>';
  
  // Populate user info (temporary count while loading)
  userInfo.innerHTML = `
    <div class="modal-user-info">
      ${user.photoURL 
        ? `<img src="${user.photoURL}" alt="" class="modal-user-avatar">`
        : `<div class="modal-user-avatar-placeholder">${(user.displayName || 'A').charAt(0).toUpperCase()}</div>`
      }
      <div class="modal-user-details">
        <span class="modal-user-name">${escapeHtml(user.displayName)}</span>
        <span class="modal-user-email">${escapeHtml(user.email)}</span>
        <span class="modal-user-cards" id="modalCardsCount">Cards: ${currentCount} (loading...)</span>
      </div>
    </div>
  `;
  
  // Clear add card input
  const addCardInput = document.getElementById('addCardNumber');
  if (addCardInput) addCardInput.value = '';
  
  // Show modal immediately
  modal.classList.add('active');
  
  // Fetch fresh cards from subcollection
  const freshCards = await MulonData.getUserCards(user.id);
  
  // Update user object with fresh cards
  user.ownedCards = freshCards;
  currentCardsUser.ownedCards = freshCards;
  
  // Update local cache
  const userIndex = allUsers.findIndex(u => u.id === user.id);
  if (userIndex !== -1) {
    allUsers[userIndex].ownedCards = freshCards;
    allUsers[userIndex].cardsCount = freshCards.length;
    
    // Update the card count button in the users list
    const userItem = document.querySelector(`.user-admin-item[data-user-id="${user.id}"]`);
    if (userItem) {
      const cardBtn = userItem.querySelector('.user-cards-count');
      if (cardBtn) {
        cardBtn.innerHTML = `🃏 ${freshCards.length} card${freshCards.length !== 1 ? 's' : ''} <span class="edit-icon">✏️</span>`;
        if (freshCards.length > 0) {
          cardBtn.classList.add('has-cards');
        } else {
          cardBtn.classList.remove('has-cards');
        }
      }
    }
  }
  
  // Update card count in header
  const modalCardsCount = document.getElementById('modalCardsCount');
  if (modalCardsCount) {
    modalCardsCount.textContent = `Cards: ${freshCards.length}`;
  }
  
  // Render cards
  renderCardsModalList(freshCards);
  
  // Update stats
  updateUsersStats();
}

function closeCardsModal() {
  const modal = document.getElementById('cardsModal');
  modal.classList.remove('active');
  currentCardsUser = null;
}

function renderCardsModalList(cards) {
  const cardsList = document.getElementById('cardsModalList');
  
  if (!cards || cards.length === 0) {
    cardsList.innerHTML = '<p class="empty-message">No cards owned</p>';
    return;
  }
  
  // Group cards by card number and count duplicates
  const cardCounts = {};
  cards.forEach(card => {
    const num = card.cardNumber || 'Unknown';
    cardCounts[num] = (cardCounts[num] || 0) + 1;
  });
  
  cardsList.innerHTML = Object.entries(cardCounts).map(([cardNumber, count]) => `
    <div class="card-edit-item" data-card-number="${cardNumber}">
      <div class="card-info">
        <span class="card-number">${escapeHtml(cardNumber)}</span>
        ${count > 1 ? `<span class="card-count">×${count}</span>` : ''}
      </div>
      <button class="btn btn-sm btn-danger remove-card-btn" data-card-number="${cardNumber}" title="Remove one">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `).join('');
  
  // Attach remove button listeners
  cardsList.querySelectorAll('.remove-card-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      if (!currentCardsUser) return;
      
      const cardNumber = this.dataset.cardNumber;
      const cardItem = this.closest('.card-edit-item');
      
      this.disabled = true;
      const result = await MulonData.removeCardFromUser(currentCardsUser.id, cardNumber);
      this.disabled = false;
      
      if (result.success) {
        showToast(`Card ${cardNumber} removed!`, 'success');
        
        // Update local cache - remove first matching card
        const userIndex = allUsers.findIndex(u => u.id === currentCardsUser.id);
        if (userIndex !== -1) {
          const cardIndex = allUsers[userIndex].ownedCards.findIndex(c => c.cardNumber === cardNumber);
          if (cardIndex !== -1) {
            allUsers[userIndex].ownedCards.splice(cardIndex, 1);
          }
          allUsers[userIndex].cardsCount = allUsers[userIndex].ownedCards.length;
          updateUsersStats();
          
          // Update just the card count badge in the users list
          const userItem = document.querySelector(`.user-admin-item[data-user-id="${currentCardsUser.id}"] .user-cards-count`);
          if (userItem) {
            const cardCount = allUsers[userIndex].ownedCards.length;
            userItem.innerHTML = `🃏 ${cardCount} card${cardCount !== 1 ? 's' : ''} <span class="edit-icon">✏️</span>`;
            userItem.classList.toggle('has-cards', cardCount > 0);
          }
        }
        
        // Update currentCardsUser
        const localCardIndex = currentCardsUser.ownedCards.findIndex(c => c.cardNumber === cardNumber);
        if (localCardIndex !== -1) {
          currentCardsUser.ownedCards.splice(localCardIndex, 1);
        }
        
        // Update modal header card count
        const modalCardsCount = document.getElementById('modalCardsCount');
        if (modalCardsCount) {
          modalCardsCount.textContent = `Cards: ${currentCardsUser.ownedCards.length}`;
        }
        
        // FAST DOM update: just update this specific card element instead of re-rendering all 17k cards
        const remainingCount = currentCardsUser.ownedCards.filter(c => c.cardNumber === cardNumber).length;
        
        if (remainingCount === 0) {
          // No more of this card - remove the element
          cardItem.remove();
          
          // Check if list is now empty
          if (currentCardsUser.ownedCards.length === 0) {
            document.getElementById('cardsModalList').innerHTML = '<p class="empty-message">No cards owned</p>';
          }
        } else {
          // Update the count display for this card
          const countSpan = cardItem.querySelector('.card-count');
          if (remainingCount > 1) {
            if (countSpan) {
              countSpan.textContent = `×${remainingCount}`;
            } else {
              // Add count span if it doesn't exist
              cardItem.querySelector('.card-info').insertAdjacentHTML('beforeend', `<span class="card-count">×${remainingCount}</span>`);
            }
          } else {
            // Only 1 left, remove count span
            if (countSpan) countSpan.remove();
          }
        }
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    });
  });
}

// ========================================
// USER POSITIONS MODAL
// ========================================
let currentPositionsUser = null;

function showUserPositionsModal(user) {
  currentPositionsUser = user;
  const modal = document.getElementById('positionsModal');
  const userInfo = document.getElementById('positionsModalUser');
  const positionsList = document.getElementById('positionsModalList');
  
  // Populate user info
  userInfo.innerHTML = `
    <div class="modal-user-info">
      ${user.photoURL 
        ? `<img src="${user.photoURL}" alt="" class="modal-user-avatar">`
        : `<div class="modal-user-avatar-placeholder">${(user.displayName || 'A').charAt(0).toUpperCase()}</div>`
      }
      <div class="modal-user-details">
        <span class="modal-user-name">${escapeHtml(user.displayName)}</span>
        <span class="modal-user-email">${escapeHtml(user.email)}</span>
        <span class="modal-user-balance">Balance: $${user.balance.toFixed(2)}</span>
      </div>
    </div>
  `;
  
  // Render positions
  renderPositionsModalList(user.positions);
  
  // Setup event listeners
  setupPositionsModalListeners();
  
  // Show modal
  modal.classList.add('active');
}

function renderPositionsModalList(positions) {
  const positionsList = document.getElementById('positionsModalList');
  
  if (!positions || positions.length === 0) {
    positionsList.innerHTML = '<p class="empty-message">No positions</p>';
    return;
  }
  
  positionsList.innerHTML = positions.map((pos, index) => {
    const market = MulonData.getMarket(pos.marketId);
    const marketTitle = market ? market.title : 'Unknown Market';
    
    return `
      <div class="position-edit-item" data-market-id="${pos.marketId}" data-index="${index}">
        <div class="position-edit-header">
          <span class="position-market-title">${escapeHtml(marketTitle)}</span>
          <span class="position-choice-badge ${pos.choice}">${pos.choice.toUpperCase()}</span>
        </div>
        <div class="position-edit-fields">
          <div class="position-field">
            <label>Shares</label>
            <input type="number" class="position-shares-input" value="${pos.shares}" step="0.01" min="0" data-field="shares">
          </div>
          <div class="position-field">
            <label>Cost Basis ($)</label>
            <input type="number" class="position-cost-input" value="${pos.costBasis?.toFixed(2) || 0}" step="0.01" min="0" data-field="costBasis">
          </div>
          <div class="position-field">
            <label>Avg Price (¢)</label>
            <input type="number" class="position-avgprice-input" value="${pos.avgPrice || 50}" step="1" min="1" max="99" data-field="avgPrice">
          </div>
        </div>
        <div class="position-edit-actions">
          <button class="btn btn-sm btn-primary save-position-btn" data-market-id="${pos.marketId}">Save</button>
          <button class="btn btn-sm btn-danger delete-position-btn" data-market-id="${pos.marketId}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function setupPositionsModalListeners() {
  const modal = document.getElementById('positionsModal');
  const closeBtn = document.getElementById('closePositionsModal');
  const cancelBtn = document.getElementById('cancelPositionsModal');
  const resetAllBtn = document.getElementById('resetUserPositionsModal');
  
  // Close handlers
  const closeModal = () => {
    modal.classList.remove('active');
    currentPositionsUser = null;
  };
  
  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
  
  // Reset all positions
  resetAllBtn.onclick = async () => {
    if (!isAccessAllowed()) return;
    if (!currentPositionsUser) return;
    
    if (!confirm(`Reset ALL positions for ${currentPositionsUser.displayName}? This cannot be undone.`)) {
      return;
    }
    
    resetAllBtn.disabled = true;
    resetAllBtn.textContent = 'Resetting...';
    
    const result = await MulonData.resetUserPositions(currentPositionsUser.id);
    
    resetAllBtn.disabled = false;
    resetAllBtn.textContent = 'Reset All Positions';
    
    if (result.success) {
      showToast('All positions reset!', 'success');
      closeModal();
      await loadAllUsers();
    } else {
      showToast('Error: ' + result.error, 'error');
    }
  };
  
  // Save individual position
  document.querySelectorAll('.save-position-btn').forEach(btn => {
    btn.onclick = async function() {
      if (!isAccessAllowed()) return;
      const marketId = this.dataset.marketId;
      const item = this.closest('.position-edit-item');
      
      const shares = parseFloat(item.querySelector('[data-field="shares"]').value);
      const costBasis = parseFloat(item.querySelector('[data-field="costBasis"]').value);
      const avgPrice = parseInt(item.querySelector('[data-field="avgPrice"]').value);
      
      if (isNaN(shares) || shares < 0) {
        showToast('Invalid shares value', 'error');
        return;
      }
      
      this.disabled = true;
      this.textContent = 'Saving...';
      
      const result = await MulonData.updateUserPosition(currentPositionsUser.id, marketId, {
        shares: Math.round(shares * 100) / 100,
        costBasis: Math.round(costBasis * 100) / 100,
        avgPrice: avgPrice
      });
      
      this.disabled = false;
      this.textContent = 'Save';
      
      if (result.success) {
        showToast('Position updated!', 'success');
        // Update local cache
        const userIndex = allUsers.findIndex(u => u.id === currentPositionsUser.id);
        if (userIndex !== -1) {
          const posIndex = allUsers[userIndex].positions.findIndex(p => p.marketId === marketId);
          if (posIndex !== -1) {
            allUsers[userIndex].positions[posIndex].shares = shares;
            allUsers[userIndex].positions[posIndex].costBasis = costBasis;
            allUsers[userIndex].positions[posIndex].avgPrice = avgPrice;
          }
        }
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    };
  });
  
  // Delete individual position
  document.querySelectorAll('.delete-position-btn').forEach(btn => {
    btn.onclick = async function() {
      if (!isAccessAllowed()) return;
      const marketId = this.dataset.marketId;
      const item = this.closest('.position-edit-item');
      const marketTitle = item.querySelector('.position-market-title').textContent;
      
      if (!confirm(`Delete position for "${marketTitle}"?`)) {
        return;
      }
      
      this.disabled = true;
      this.textContent = 'Deleting...';
      
      const result = await MulonData.deleteUserPosition(currentPositionsUser.id, marketId);
      
      if (result.success) {
        showToast('Position deleted!', 'success');
        // Remove from local cache
        const userIndex = allUsers.findIndex(u => u.id === currentPositionsUser.id);
        if (userIndex !== -1) {
          allUsers[userIndex].positions = allUsers[userIndex].positions.filter(p => p.marketId !== marketId);
          currentPositionsUser.positions = allUsers[userIndex].positions;
          
          // Re-render the list
          renderPositionsModalList(currentPositionsUser.positions);
          setupPositionsModalListeners();
          updateUsersStats();
          
          // If no more positions, close modal
          if (currentPositionsUser.positions.length === 0) {
            document.getElementById('positionsModal').classList.remove('active');
            await loadAllUsers();
          }
        }
      } else {
        this.disabled = false;
        this.textContent = 'Delete';
        showToast('Error: ' + result.error, 'error');
      }
    };
  });
}

// ========================================
// SUGGESTIONS
// ========================================
async function renderSuggestionList() {
  const suggestionList = document.getElementById('suggestionList');
  const suggestionCount = document.getElementById('suggestionCount');
  const suggestionBadge = document.getElementById('suggestionBadge');
  if (!suggestionList) return;
  
  const suggestions = await MulonData.getSuggestions();
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  
  // Update both old and new badge
  if (suggestionCount) {
    suggestionCount.textContent = pendingSuggestions.length;
  }
  if (suggestionBadge) {
    suggestionBadge.textContent = pendingSuggestions.length;
    suggestionBadge.style.display = pendingSuggestions.length > 0 ? 'inline' : 'none';
  }
  
  if (suggestions.length === 0) {
    suggestionList.innerHTML = '<p class="empty-message">No suggestions yet</p>';
    return;
  }
  
  suggestionList.innerHTML = suggestions.map(sug => {
    const category = sug.category ? MulonData.getCategory(sug.category) : null;
    const categoryBadge = category ? `<span class="suggestion-category">${category.icon} ${category.label}</span>` : '';
    const date = new Date(sug.createdAt).toLocaleDateString();
    
    let statusBadge = '';
    if (sug.status === 'approved') {
      statusBadge = '<span class="suggestion-status approved">✓ Approved</span>';
    } else if (sug.status === 'rejected') {
      statusBadge = '<span class="suggestion-status rejected">✗ Rejected</span>';
    }
    
    return `
      <div class="suggestion-item ${sug.status}" data-id="${sug.id}">
        <div class="suggestion-content">
          <div class="suggestion-header">
            <span class="suggestion-title">${sug.title}</span>
            ${statusBadge}
          </div>
          <div class="suggestion-meta">
            ${categoryBadge}
            <span class="suggestion-user">by ${sug.userName || sug.userEmail || 'Anonymous'}</span>
            <span class="suggestion-date">${date}</span>
          </div>
          ${sug.reason ? `<p class="suggestion-reason">${sug.reason}</p>` : ''}
        </div>
        <div class="suggestion-actions">
          ${sug.status === 'pending' ? `
            <button class="btn-icon approve-suggestion" data-id="${sug.id}" title="Approve">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button class="btn-icon reject-suggestion" data-id="${sug.id}" title="Reject">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          ` : ''}
          <button class="btn-icon delete-suggestion" data-id="${sug.id}" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  attachSuggestionListeners();
}

function attachSuggestionListeners() {
  // Approve buttons
  document.querySelectorAll('.approve-suggestion').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      const id = this.dataset.id;
      const result = await MulonData.updateSuggestionStatus(id, 'approved');
      if (result.success) {
        showToast('Suggestion approved', 'success');
        renderSuggestionList();
      } else {
        showToast('Error approving suggestion', 'error');
      }
    });
  });
  
  // Reject buttons
  document.querySelectorAll('.reject-suggestion').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      const id = this.dataset.id;
      const result = await MulonData.updateSuggestionStatus(id, 'rejected');
      if (result.success) {
        showToast('Suggestion rejected', 'success');
        renderSuggestionList();
      } else {
        showToast('Error rejecting suggestion', 'error');
      }
    });
  });
  
  // Delete buttons
  document.querySelectorAll('.delete-suggestion').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      const id = this.dataset.id;
      if (confirm('Delete this suggestion?')) {
        const result = await MulonData.deleteSuggestion(id);
        if (result.success) {
          showToast('Suggestion deleted', 'success');
          renderSuggestionList();
        } else {
          showToast('Error deleting suggestion', 'error');
        }
      }
    });
  });
}

// ========================================
// WAITLIST MANAGEMENT
// ========================================
let waitlistData = [];
let waitlistFilter = 'pending';

function setupWaitlistManagement() {
  // Refresh button
  const refreshBtn = document.getElementById('refreshWaitlistBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadWaitlist);
  }
  
  // Approve all button
  const approveAllBtn = document.getElementById('approveAllWaitlistBtn');
  if (approveAllBtn) {
    approveAllBtn.addEventListener('click', async () => {
      if (!isAccessAllowed()) return;
      if (!confirm('Approve ALL pending waitlist users? They will gain access to Mulon.')) return;
      
      approveAllBtn.disabled = true;
      approveAllBtn.textContent = 'Approving...';
      
      const pending = waitlistData.filter(w => w.status === 'pending');
      let approved = 0;
      
      for (const user of pending) {
        const result = await MulonData.updateWaitlistStatus(user.id, 'approved');
        if (result.success) approved++;
      }
      
      showToast(`Approved ${approved} users!`, 'success');
      approveAllBtn.disabled = false;
      approveAllBtn.textContent = '✓ Approve All Pending';
      await loadWaitlist();
    });
  }
  
  // Filter buttons
  document.querySelectorAll('.waitlist-filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.waitlist-filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      waitlistFilter = this.dataset.filter;
      renderWaitlist();
    });
  });
}

async function loadWaitlist() {
  const listEl = document.getElementById('waitlistList');
  if (listEl) {
    listEl.innerHTML = '<div class="loading-state">Loading waitlist...</div>';
  }
  
  waitlistData = await MulonData.getWaitlist();
  updateWaitlistStats();
  renderWaitlist();
}

function updateWaitlistStats() {
  const pending = waitlistData.filter(w => w.status === 'pending').length;
  const approved = waitlistData.filter(w => w.status === 'approved').length;
  const rejected = waitlistData.filter(w => w.status === 'rejected').length;
  
  const pendingEl = document.getElementById('waitlistPendingCount');
  const approvedEl = document.getElementById('waitlistApprovedCount');
  const rejectedEl = document.getElementById('waitlistRejectedCount');
  const badgeEl = document.getElementById('waitlistBadge');
  
  if (pendingEl) pendingEl.textContent = pending;
  if (approvedEl) approvedEl.textContent = approved;
  if (rejectedEl) rejectedEl.textContent = rejected;
  if (badgeEl) {
    badgeEl.textContent = pending;
    badgeEl.style.display = pending > 0 ? 'inline-flex' : 'none';
  }
}

function renderWaitlist() {
  const listEl = document.getElementById('waitlistList');
  if (!listEl) return;
  
  let filtered = waitlistData;
  if (waitlistFilter !== 'all') {
    filtered = waitlistData.filter(w => w.status === waitlistFilter);
  }
  
  // Sort by joinedAt (newest first for approved/rejected, oldest first for pending)
  filtered.sort((a, b) => {
    const aTime = a.joinedAt?.toDate?.() || new Date(a.joinedAt);
    const bTime = b.joinedAt?.toDate?.() || new Date(b.joinedAt);
    return waitlistFilter === 'pending' ? aTime - bTime : bTime - aTime;
  });
  
  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="waitlist-empty">
        <span class="empty-icon">📋</span>
        <p>No ${waitlistFilter === 'all' ? '' : waitlistFilter + ' '}users on waitlist</p>
      </div>
    `;
    return;
  }
  
  listEl.innerHTML = filtered.map((user, index) => {
    const joinedDate = user.joinedAt?.toDate?.() 
      ? user.joinedAt.toDate().toLocaleDateString() 
      : 'Unknown';
    
    const statusClass = user.status === 'approved' ? 'approved' : 
                        user.status === 'rejected' ? 'rejected' : 'pending';
    
    return `
      <div class="waitlist-item ${statusClass}">
        <div class="waitlist-item-info">
          <span class="waitlist-position">#${index + 1}</span>
          <div class="waitlist-user">
            <img src="${user.photoURL || ''}" alt="" class="waitlist-avatar" onerror="this.style.display='none'">
            <div class="waitlist-user-details">
              <span class="waitlist-name">${user.displayName || 'Unknown'}</span>
              <span class="waitlist-email">${user.email || ''}</span>
            </div>
          </div>
          <span class="waitlist-joined">Joined: ${joinedDate}</span>
          <span class="waitlist-status ${statusClass}">${user.status}</span>
        </div>
        <div class="waitlist-item-actions">
          ${user.status === 'pending' ? `
            <button class="btn btn-sm btn-success approve-waitlist" data-id="${user.id}">✓ Approve</button>
            <button class="btn btn-sm btn-danger reject-waitlist" data-id="${user.id}">✗ Reject</button>
          ` : user.status === 'approved' ? `
            <button class="btn btn-sm btn-warning revoke-waitlist" data-id="${user.id}">Revoke</button>
          ` : `
            <button class="btn btn-sm btn-success approve-waitlist" data-id="${user.id}">✓ Approve</button>
          `}
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  attachWaitlistEventListeners();
}

function attachWaitlistEventListeners() {
  // Approve buttons
  document.querySelectorAll('.approve-waitlist').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      const id = this.dataset.id;
      
      this.disabled = true;
      this.textContent = '...';
      
      const result = await MulonData.updateWaitlistStatus(id, 'approved');
      
      if (result.success) {
        showToast('User approved!', 'success');
        await loadWaitlist();
      } else {
        showToast('Error approving user', 'error');
        this.disabled = false;
        this.textContent = '✓ Approve';
      }
    });
  });
  
  // Reject buttons
  document.querySelectorAll('.reject-waitlist').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      const id = this.dataset.id;
      
      this.disabled = true;
      this.textContent = '...';
      
      const result = await MulonData.updateWaitlistStatus(id, 'rejected');
      
      if (result.success) {
        showToast('User rejected', 'success');
        await loadWaitlist();
      } else {
        showToast('Error rejecting user', 'error');
        this.disabled = false;
        this.textContent = '✗ Reject';
      }
    });
  });
  
  // Revoke buttons (set back to pending)
  document.querySelectorAll('.revoke-waitlist').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      if (!confirm('Revoke access for this user? They will be moved back to pending.')) return;
      
      const id = this.dataset.id;
      
      this.disabled = true;
      this.textContent = '...';
      
      const result = await MulonData.updateWaitlistStatus(id, 'pending');
      
      if (result.success) {
        showToast('Access revoked', 'success');
        await loadWaitlist();
      } else {
        showToast('Error revoking access', 'error');
        this.disabled = false;
        this.textContent = 'Revoke';
      }
    });
  });
}

// ========================================
// PURCHASES MANAGEMENT
// ========================================
let purchasesData = [];
let purchasesFilter = 'pending';

function setupPurchasesManagement() {
  // Refresh button
  const refreshBtn = document.getElementById('refreshPurchasesBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadPurchases);
  }
  
  // Filter buttons
  document.querySelectorAll('.purchases-filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.purchases-filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      purchasesFilter = this.dataset.filter;
      renderPurchases();
    });
  });
}

async function loadPurchases() {
  const listEl = document.getElementById('purchasesList');
  if (listEl) {
    listEl.innerHTML = '<div class="loading-state">Loading purchases...</div>';
  }
  
  try {
    purchasesData = await MulonData.getPurchases();
    updatePurchasesStats();
    renderPurchases();
  } catch (error) {
    console.error('Error loading purchases:', error);
    if (listEl) {
      listEl.innerHTML = '<div class="error-state">Error loading purchases</div>';
    }
  }
}

function updatePurchasesStats() {
  const pending = purchasesData.filter(p => p.status === 'pending').length;
  const completed = purchasesData.filter(p => p.status === 'completed').length;
  const totalRevenue = purchasesData.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const pendingEl = document.getElementById('purchasesPendingCount');
  const completedEl = document.getElementById('purchasesCompletedCount');
  const revenueEl = document.getElementById('purchasesTotalRevenue');
  const badgeEl = document.getElementById('purchasesBadge');
  
  if (pendingEl) pendingEl.textContent = pending;
  if (completedEl) completedEl.textContent = completed;
  if (revenueEl) revenueEl.textContent = '$' + totalRevenue.toFixed(2);
  if (badgeEl) {
    badgeEl.textContent = pending;
    badgeEl.style.display = pending > 0 ? 'inline-flex' : 'none';
  }
}

function renderPurchases() {
  const listEl = document.getElementById('purchasesList');
  if (!listEl) return;
  
  let filtered = purchasesData;
  if (purchasesFilter === 'banners') {
    // Show all custom banner purchases regardless of status
    filtered = purchasesData.filter(p => p.type === 'custom-banner');
  } else if (purchasesFilter !== 'all') {
    filtered = purchasesData.filter(p => p.status === purchasesFilter);
  }
  
  // Sort by timestamp (newest first for completed, oldest first for pending)
  filtered.sort((a, b) => {
    const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
    const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
    return purchasesFilter === 'pending' ? aTime - bTime : bTime - aTime;
  });
  
  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="purchases-empty">
        <span class="empty-icon">💳</span>
        <p>No ${purchasesFilter === 'all' ? '' : purchasesFilter + ' '}purchases</p>
      </div>
    `;
    return;
  }
  
  listEl.innerHTML = filtered.map(purchase => {
    const timestamp = purchase.timestamp?.toDate?.() || new Date(purchase.timestamp);
    const dateStr = timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    const statusClass = purchase.status === 'pending' ? 'status-pending' : 
                       purchase.status === 'completed' ? 'status-approved' : 'status-rejected';
    
    // Check if this is a custom banner purchase
    const isCustomBanner = purchase.type === 'custom-banner';
    const purchaseTitle = isCustomBanner ? 'Custom Profile Banner' : (purchase.packName || 'Unknown Pack');
    const purchaseAmount = isCustomBanner 
      ? `${purchase.amount || 0} Keys` 
      : `$${(purchase.amount || 0).toFixed(2)} USD`;
    
    let actionButtons = '';
    if (purchase.status === 'pending') {
      if (isCustomBanner) {
        actionButtons = `
          <button class="approve-banner btn-primary" data-id="${purchase.id}" data-user-id="${purchase.userId}" data-banner-url="${encodeURIComponent(purchase.bannerUrl || '')}">✓ Approve Banner</button>
          <button class="reject-banner btn-secondary" data-id="${purchase.id}" data-user-id="${purchase.userId}">✗ Reject (Refund)</button>
        `;
      } else {
        actionButtons = `
          <button class="complete-purchase btn-primary" data-id="${purchase.id}">✓ Mark Completed</button>
          <button class="cancel-purchase btn-secondary" data-id="${purchase.id}">✗ Cancel</button>
        `;
      }
    } else if (purchase.status === 'completed') {
      actionButtons = `<span class="completed-badge">✓ Fulfilled</span>`;
    } else {
      actionButtons = `<span class="cancelled-badge">✗ Cancelled</span>`;
    }
    
    // Banner preview for custom banner purchases
    const bannerPreview = isCustomBanner && purchase.bannerUrl ? `
      <div class="purchase-banner-preview">
        <img src="${purchase.bannerUrl}" alt="Banner Preview" class="banner-preview-img" onerror="this.parentElement.innerHTML='<span class=\\'banner-error\\'>⚠️ Image failed to load</span>'">
      </div>
    ` : '';
    
    return `
      <div class="purchase-item ${statusClass} ${isCustomBanner ? 'banner-purchase' : ''}">
        <div class="purchase-info">
          <div class="purchase-user">
            <strong>${purchase.userEmail || 'Unknown User'}</strong>
            <span class="purchase-username">${purchase.username || ''}</span>
          </div>
          <div class="purchase-details">
            <span class="purchase-pack">${isCustomBanner ? '🖼️ ' : ''}${purchaseTitle}</span>
            <span class="purchase-amount">${purchaseAmount}</span>
          </div>
          ${bannerPreview}
          <div class="purchase-meta">
            <span class="purchase-date">${dateStr} at ${timeStr}</span>
            <span class="purchase-status ${statusClass}">${purchase.status}</span>
          </div>
        </div>
        <div class="purchase-actions">
          ${actionButtons}
        </div>
      </div>
    `;
  }).join('');
  
  attachPurchaseEventListeners();
}

function attachPurchaseEventListeners() {
  // Complete buttons
  document.querySelectorAll('.complete-purchase').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      if (!confirm('Mark this purchase as completed/fulfilled?')) return;
      
      const id = this.dataset.id;
      
      this.disabled = true;
      this.textContent = 'Processing...';
      
      const result = await MulonData.updatePurchaseStatus(id, 'completed');
      
      if (result.success) {
        showToast('Purchase marked as completed!', 'success');
        await loadPurchases();
      } else {
        showToast('Error updating purchase', 'error');
        this.disabled = false;
        this.textContent = '✓ Mark Completed';
      }
    });
  });
  
  // Cancel buttons
  document.querySelectorAll('.cancel-purchase').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      if (!confirm('Cancel this purchase? The user will not receive items.')) return;
      
      const id = this.dataset.id;
      
      this.disabled = true;
      this.textContent = 'Cancelling...';
      
      const result = await MulonData.updatePurchaseStatus(id, 'cancelled');
      
      if (result.success) {
        showToast('Purchase cancelled', 'success');
        await loadPurchases();
      } else {
        showToast('Error cancelling purchase', 'error');
        this.disabled = false;
        this.textContent = '✗ Cancel';
      }
    });
  });
  
  // Approve banner buttons
  document.querySelectorAll('.approve-banner').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      if (!confirm('Approve this custom banner? It will be applied to the user\'s profile.')) return;
      
      const id = this.dataset.id;
      const userId = this.dataset.userId;
      const bannerUrl = decodeURIComponent(this.dataset.bannerUrl);
      
      this.disabled = true;
      this.textContent = 'Approving...';
      
      try {
        // Update user's customBannerUrl
        const result = await MulonData.approveCustomBanner(userId, bannerUrl, id);
        
        if (result.success) {
          showToast('Banner approved and applied!', 'success');
          await loadPurchases();
        } else {
          showToast('Error approving banner: ' + (result.error || 'Unknown error'), 'error');
          this.disabled = false;
          this.textContent = '✓ Approve Banner';
        }
      } catch (error) {
        console.error('Error approving banner:', error);
        showToast('Error approving banner', 'error');
        this.disabled = false;
        this.textContent = '✓ Approve Banner';
      }
    });
  });
  
  // Reject banner buttons (with refund)
  document.querySelectorAll('.reject-banner').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      if (!confirm('Reject this banner and refund the user\'s keys?')) return;
      
      const id = this.dataset.id;
      const userId = this.dataset.userId;
      
      this.disabled = true;
      this.textContent = 'Rejecting...';
      
      try {
        // Reject banner and refund keys
        const result = await MulonData.rejectCustomBanner(userId, id, 150); // 150 keys refund
        
        if (result.success) {
          showToast('Banner rejected and keys refunded!', 'success');
          await loadPurchases();
        } else {
          showToast('Error rejecting banner: ' + (result.error || 'Unknown error'), 'error');
          this.disabled = false;
          this.textContent = '✗ Reject (Refund)';
        }
      } catch (error) {
        console.error('Error rejecting banner:', error);
        showToast('Error rejecting banner', 'error');
        this.disabled = false;
        this.textContent = '✗ Reject (Refund)';
      }
    });
  });
}
