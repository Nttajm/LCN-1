// ========================================
// MULON - Admin Panel JavaScript
// ========================================

import { MulonData, Auth } from './data.js';

// Admin email whitelist
const ADMIN_EMAILS = ['joelmulonde81@gmail.com', 'jordan.herrera@crpusd.org', 'captrojolmao@gmail.com'];

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}

let access_allowed = false;
function isAccessAllowed() {
  checkAdminAccess(Auth.currentUser);
  return access_allowed;
}

document.addEventListener('DOMContentLoaded', async function() {
  // Initialize Auth first
  Auth.init();
  
  // Setup admin sign in button
  const adminSignInBtn = document.getElementById('adminSignInBtn');
  if (adminSignInBtn) {
    adminSignInBtn.addEventListener('click', async () => {
      await Auth.signInWithGoogle();
    });
  }
  
  // Listen for auth state changes
  Auth.onAuthStateChange((user) => {
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
  
  return `
    <div class="market-item ${isResolved ? 'resolved' : ''} ${isPending ? 'pending' : ''}" data-market-id="${market.id}">
      <div class="market-item-content">
        <div class="market-item-header">
          <div class="market-item-title">${market.title}</div>
          ${statusBadge}
        </div>
        <div class="market-item-meta">
          <span class="market-item-tag ${market.category}">${category.icon} ${category.label}</span>
          <span class="market-item-price">
            <span class="yes">${market.yesPrice}¢</span> / 
            <span class="no">${market.noPrice}¢</span>
          </span>
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

function setupForm() {
  const form = document.getElementById('marketForm');
  const yesPriceInput = document.getElementById('yesPrice');
  const noPricePreview = document.getElementById('noPricePreview');
  const cancelBtn = document.getElementById('cancelBtn');
  
  // Update No price preview when Yes price changes
  yesPriceInput.addEventListener('input', function() {
    const yesPrice = parseInt(this.value) || 0;
    noPricePreview.textContent = Math.max(0, 100 - yesPrice);
  });
  
  // Cancel button
  cancelBtn.addEventListener('click', resetForm);
  
  // Form submit
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!isAccessAllowed()) return;
    
    const formData = {
      title: document.getElementById('title').value.trim(),
      subtitle: document.getElementById('subtitle').value.trim(),
      category: document.getElementById('category').value,
      yesPrice: parseInt(document.getElementById('yesPrice').value),
      noPrice: 100 - parseInt(document.getElementById('yesPrice').value),
      startDate: document.getElementById('startDate').value,
      endDate: document.getElementById('endDate').value,
      endTime: document.getElementById('endTime').value || '15:00',
      volume: parseInt(document.getElementById('volume').value) || 0,
      featured: document.getElementById('featured').checked
    };
    
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
    
    if (formData.yesPrice < 1 || formData.yesPrice > 99) {
      showToast('Yes price must be between 1 and 99', 'error');
      return;
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
  document.getElementById('yesPrice').value = market.yesPrice;
  document.getElementById('noPricePreview').textContent = market.noPrice;
  document.getElementById('startDate').value = market.startDate;
  document.getElementById('endDate').value = market.endDate;
  document.getElementById('endTime').value = market.endTime || '15:00';
  document.getElementById('volume').value = market.volume || 0;
  document.getElementById('featured').checked = market.featured || false;
  
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

function resetForm() {
  isEditMode = false;
  editingMarketId = null;
  
  document.getElementById('marketForm').reset();
  document.getElementById('marketId').value = '';
  document.getElementById('yesPrice').value = 50;
  document.getElementById('noPricePreview').textContent = '50';
  
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
  
  if (titleEl) titleEl.textContent = market.title;
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
function setupManagementTabs() {
  const tabs = document.querySelectorAll('.management-tab');
  const contents = {
    categories: document.getElementById('categoriesTabContent'),
    users: document.getElementById('usersTabContent'),
    suggestions: document.getElementById('suggestionsTabContent')
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
}

async function loadAllUsers() {
  const usersList = document.getElementById('usersList');
  if (usersList) {
    usersList.innerHTML = '<div class="loading-state">Loading users...</div>';
  }
  
  allUsers = await MulonData.getAllUsers();
  usersLoaded = true;
  
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
}

function filterAndRenderUsers(searchTerm) {
  if (!searchTerm.trim()) {
    renderUsersList(allUsers);
    return;
  }
  
  const term = searchTerm.toLowerCase();
  const filtered = allUsers.filter(user => 
    (user.displayName || '').toLowerCase().includes(term) ||
    (user.email || '').toLowerCase().includes(term)
  );
  
  renderUsersList(filtered);
}

function renderUsersList(users) {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;
  
  if (users.length === 0) {
    usersList.innerHTML = `
      <div class="users-empty">
        <span class="users-empty-icon">👥</span>
        <p>No users found</p>
      </div>
    `;
    return;
  }
  
  usersList.innerHTML = users.map(user => `
    <div class="user-admin-item" data-user-id="${user.id}">
      <button class="edit-user-info-button" data-user-id="${user.id}" title="Click to view/edit user data">
        <span class="edit-user-info-icon">📝</span>
      </button>
      ${user.photoURL 
        ? `<img src="${user.photoURL}" alt="" class="user-admin-avatar">`
        : `<div class="user-admin-avatar-placeholder">${(user.displayName || 'A').charAt(0).toUpperCase()}</div>`
      }
      <div class="user-admin-info">
        <span class="user-admin-name">${escapeHtml(user.displayName)}</span>
        <span class="user-admin-email">${escapeHtml(user.email)}</span>
      </div>
      <button class="user-positions-count ${user.positions.length > 0 ? 'has-positions clickable' : ''}" data-user-id="${user.id}" ${user.positions.length > 0 ? 'title="Click to view/edit positions"' : ''}>
        ${user.positions.length} position${user.positions.length !== 1 ? 's' : ''}
        ${user.positions.length > 0 ? '<span class="edit-icon">✏️</span>' : ''}
      </button>
      <button class=user-items has-positions clickable" data-user-id="${user.id}" title="Click to view/edit items">
        Edit items <span class="edit-icon">✏️</span>
      </button>
      <div class="user-admin-balance">
        <span>$</span>
        <input type="number" class="user-balance-input" value="${user.balance.toFixed(2)}" step="0.01" data-original="${user.balance.toFixed(2)}">
      </div>
      <div class="user-admin-keys">
        <span>🔑</span>
        <input type="number" class="user-keys-input" value="${user.keys || 0}" step="1" min="0" data-original="${user.keys || 0}">
      </div>
      <div class="user-admin-xp">
        <span>⚡</span>
        <input type="number" class="user-xp-input" value="${user.xps || 0}" step="1" min="0" data-original="${user.xps || 0}">
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
      </div>
    </div>
  `).join('');

  // Attach user info view/edit listeners
  usersList.querySelectorAll('.edit-user-info-button').forEach(btn => {
    btn.addEventListener('click', async function () {
      const userId = this.dataset.userId;
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        await showUserInfoModal(user);
      }
    });
  });
  
  // Attach positions view/edit listeners
  usersList.querySelectorAll('.user-positions-count.clickable').forEach(btn => {
    btn.addEventListener('click', function() {
      const userId = this.dataset.userId;
      const user = allUsers.find(u => u.id === userId);
      if (user && user.positions.length > 0) {
        showUserPositionsModal(user);
      }
    });
  });

  // Attach items view/edit listeners
  usersList.querySelectorAll('.user-items').forEach(btn => {
    btn.addEventListener('click', function () {
      const userId = this.dataset.userId;
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        showUserItemsModal(user);
      }
    });
  });
  
  // Attach save button listeners (saves both balance and keys)
  usersList.querySelectorAll('.save-user').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!isAccessAllowed()) return;
      const userId = this.dataset.userId;
      const item = this.closest('.user-admin-item');
      const balanceInput = item.querySelector('.user-balance-input');
      const keysInput = item.querySelector('.user-keys-input');
      const xpInput = item.querySelector('.user-xp-input');
      const newBalance = parseFloat(balanceInput.value);
      const newKeys = parseInt(keysInput.value);
      const newXP = parseInt(xpInput.value);
      
      if (isNaN(newBalance) || newBalance < 0) {
        showToast('Please enter a valid balance', 'error');
        return;
      }
      
      if (isNaN(newKeys) || newKeys < 0) {
        showToast('Please enter a valid keys amount', 'error');
        return;
      }

      if (isNaN(newXP) || newXP < 0) {
        showToast('Please enter a valid XP amount', 'error');
        return;
      }
      
      this.disabled = true;
      
      // Update balance
      const balanceResult = await MulonData.updateUserBalance(userId, newBalance);
      // Update keys
      const keysResult = await MulonData.updateUserKeys(userId, newKeys);
      // Update XP
      const xpResult = await MulonData.updateUserXP(userId, newXP);
      
      this.disabled = false;
      
      if (balanceResult.success && keysResult.success) {
        showToast('Balance, Keys, & XP updated!', 'success');
        balanceInput.dataset.original = newBalance.toFixed(2);
        keysInput.dataset.original = newKeys;
        xpInput.dataset.original = newXP;
        balanceInput.style.borderColor = '';
        keysInput.style.borderColor = '';
        xpInput.style.borderColor = '';
        // Update local cache
        const userIndex = allUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          allUsers[userIndex].balance = newBalance;
          allUsers[userIndex].keys = newKeys;
          allUsers[userIndex].xps = newXP;
          updateUsersStats();
        }
      } else {
        showToast('Error updating user', 'error');
      }
    });
  });
  
  // Attach reset positions button listeners
  usersList.querySelectorAll('.reset-positions').forEach(btn => {
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
  
  // Highlight changed inputs
  usersList.querySelectorAll('.user-balance-input').forEach(input => {
    input.addEventListener('input', function() {
      const original = parseFloat(this.dataset.original);
      const current = parseFloat(this.value);
      this.style.borderColor = current !== original ? 'var(--green-primary)' : '';
    });
  });
  
  usersList.querySelectorAll('.user-keys-input').forEach(input => {
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
// USER INFO MODAL
// ========================================
let currentInfoUser = null;

async function showUserInfoModal(user) {
  currentInfoUser = user;
  const modal = document.getElementById('infoModal');
  const userInfo = document.getElementById('infoModalUser');
  const infoList = document.getElementById('infoModalList');
  
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

  infoList.innerHTML = `
    <div class="info-ro-item">
      <span class="info-edit-name">Creation Date</span>
      <span class="info-rodata">${user.createdAt}</span>
    </div>
    <div class="info-ro-item">
      <span class="info-edit-name">Last Login</span>
      <span class="info-rodata">${user.lastLoginAt}</span>
    </div>
    <div class="info-ro-item">
      <span class="info-edit-name">OverUnder Synced</span>
      <span class="info-rodata">${user.overUnderSynced ? 'true' : 'false'}</span>
    </div>
    <div class="info-ro-item">
      <span class="info-edit-name">Daily Streak</span>
      <span class="info-rodata">${user.dailyStreak}</span>
    </div>
    <div class="info-ro-item">
      <span class="info-edit-name">Last Daily Claim</span>
      <span class="info-rodata">${user.lastDailyKeyClaim}</span>
    </div>
    <br>
    <div class="info-edit-item">
      <span class="info-edit-name">Username</span>
      <input class="info-edit-input" id="username" value="${escapeHtml(user.displayName)}">
      <button class="btn-icon save-user" id="saveUsername" title="Save">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
    </div>
    <div class="info-edit-item">
      <span class="info-edit-name">Avatar Style</span>
      <input class="info-edit-input" id="avatarStyle" value="${escapeHtml(user.avatarStyle)}">
      <button class="btn-icon save-user" id="saveAvatarStyle" title="Save">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
    </div>
    <div class="info-edit-item">
      <span class="info-edit-name">Leaderboard Style</span>
      <input class="info-edit-input" id="leaderStyle" value="${await MulonData.getLeaderboardStyle(user)}">
      <button class="btn-icon save-user" id="saveLeaderStyle" title="Save">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
    </div>
  `;
  
  // Setup event listeners
  setupInfoModalListeners();
  
  // Show modal
  modal.classList.add('active');
}

function setupInfoModalListeners() {
  const modal = document.getElementById('infoModal');
  const closeBtn = document.getElementById('closeInfoModal');
  const cancelBtn = document.getElementById('cancelInfoModal');

  const usernameField = document.getElementById('username');
  const avatarStyleField = document.getElementById('avatarStyle');
  const leaderStyleField = document.getElementById('leaderStyle');

  const usernameSaveBtn = document.getElementById('saveUsername');
  const avatarStyleSaveBtn = document.getElementById('saveAvatarStyle');
  const leaderStyleSaveBtn = document.getElementById('saveLeaderStyle');
  
  // Close handlers
  const closeModal = () => {
    modal.classList.remove('active');
    currentInfoUser = null;
  };
  
  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  usernameSaveBtn.onclick = async() => {
    const newUsername = usernameField.value;

    if (newUsername.length > 20 || newUsername.length == 0) {
      showToast('Please enter a valid username (20 chars max)');
      return;
    }

    const result = await MulonData.updateUserName(currentInfoUser.id, newUsername);

    if (result.success) {
      showToast('Username updated!', 'success');
      // Update local cache
      const userIndex = allUsers.findIndex(u => u.id === currentInfoUser.id);
      if (userIndex !== -1) {
        allUsers[userIndex].displayName = newUsername;
        updateUsersStats();
      }
    } else {
      showToast('Error updating username', 'error');
    }
  };

  avatarStyleSaveBtn.onclick = async() => {
    const newAvatarStyle = avatarStyleField.value;

    const result = await MulonData.updateAvatarStyle(currentInfoUser.id, newAvatarStyle);

    if (result.success) {
      showToast('Avatar style updated!', 'success');
      // Update local cache
      const userIndex = allUsers.findIndex(u => u.id === currentInfoUser.id);
      if (userIndex !== -1) {
        allUsers[userIndex].avatarStyle = newAvatarStyle;
        updateUsersStats();
      }
    } else {
      showToast('Error updating avatar style', 'error');
    }
  };

  leaderStyleSaveBtn.onclick = async() => {
    const newLeaderStyle = leaderStyleField.value;

    const result = await MulonData.updateLeaderStyle(currentInfoUser.id, newLeaderStyle);

    if (result.success) {
      showToast('Leaderboard style updated!', 'success');
      // Update local cache
      const userIndex = allUsers.findIndex(u => u.id === currentInfoUser.id);
      if (userIndex !== -1) {
        allUsers[userIndex].leaderStyle = newLeaderStyle;
        updateUsersStats();
      }
    } else {
      showToast('Error updating avatar style', 'error');
    }
  };
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
// USER ITEMS MODAL
// ========================================
let currentItemsUser = null;

function showUserItemsModal(user) {
  currentItemsUser = user;
  const modal = document.getElementById('itemsModal');
  const userInfo = document.getElementById('itemsModalUser');
  const userItems = document.getElementById('itemsModalList');
  
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

  // Populate user items
  userItems.innerHTML = `
    <div class="items-edit-item">
      <span class="items-edit-name">Plinko Balls</span>
      <input type="number" class="items-edit-input" id="plinkoBallsField" value="${currentItemsUser.plinkoBalls}" step="1" min="0" data-field="plinko-balls">
      <button class="btn-icon save-user" id="savePlinkoBalls" title="Save">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
    </div>
  `;

  if (user.cards) {
    userItems.innerHTML = userItems.innerHTML.concat(`
      <div class="items-card-list" id="itemsCardList">
        <div class="items-add-card">
          <span class="items-edit-name">Add Card</span>
          <input type="number" class="items-edit-input" id="newCardField" value="" step="1" min="0" data-field="new-card">
          <button class="btn-icon save-user" id="addNewCard" title="Add">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
      </div>
    `);
    itemsCardList = document.getElementById('itemsCardList');
    user.cards.forEach(function (card, index) {
      itemsCardList.innerHTML = itemsCardList.innerHTML.concat(`
        <div class="items-card-item">
          <span class="items-card-name">Card ${card}</span>
          <div class="card-edit-actions">
            <button class="btn btn-sm btn-danger delete-card-btn" data-index=${index}>Delete</button>
          </div>
        </div>
      `);
    });
  }
  
  // Setup event listeners
  setupItemsModalListeners();
  
  // Show modal
  modal.classList.add('active');
}

function setupItemsModalListeners() {
  const modal = document.getElementById('itemsModal');
  const closeBtn = document.getElementById('closeItemsModal');
  const cancelBtn = document.getElementById('cancelItemsModal');

  const plinkoBallsField = document.getElementById('plinkoBallsField');
  const newCardField = document.getElementById('newCardField');

  const savePlinkoBallsBtn = document.getElementById('savePlinkoBalls');
  const addNewCardBtn = document.getElementById('addNewCard');
  
  // Close handlers
  const closeModal = () => {
    modal.classList.remove('active');
    currentItemsUser = null;
  };
  
  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  savePlinkoBallsBtn.onclick = async () => {
    const newPlinkoBalls = parseInt(plinkoBallsField.value);

    if (isNaN(newPlinkoBalls) || newPlinkoBalls < 0) {
      showToast('Please enter a valid number of Plinko balls', 'error');
      return;
    }

    const result = await MulonData.updateUserPlinkoBalls(currentItemsUser.id, newPlinkoBalls);

    if (result.success) {
      showToast('Plinko balls updated!', 'success');
      // Update local cache
      const userIndex = allUsers.findIndex(u => u.id === currentItemsUser.id);
      if (userIndex !== -1) {
        allUsers[userIndex].plinkoBalls = newPlinkoBalls;
      }
    } else {
      showToast('Error updating user', 'error');
    }
  };

  addNewCardBtn.onclick = async () => {
    const newCard = "#".concat(parseInt(newCardField.value).toLocaleString('en-US', {'minimumIntegerDigits': 3, 'maximumFractionDigits': 0}));
    let newCards = currentItemsUser.cards;
    newCards.push(newCard);

    const result = await MulonData.updateUserCards(currentItemsUser.id, newCards);

    if (result.success) {
        showToast('Cards updated!', 'success');
        // Update local cache
        const userIndex = allUsers.findIndex(u => u.id === currentItemsUser.id);
        if (userIndex !== -1) {
          allUsers[userIndex].cards = newCards;
        }
      } else {
        showToast('Error updating cards', 'error');
      }

      showUserItemsModal(currentItemsUser);
  };

  document.querySelectorAll('.delete-card-btn').forEach(btn => {
    btn.onclick = async function () {
      const idx = this.dataset.index;
      let newCards = currentItemsUser.cards;
      newCards.splice(idx, 1);

      const result = await MulonData.updateUserCards(currentItemsUser.id, newCards);

      if (result.success) {
        showToast('Cards updated!', 'success');
        // Update local cache
        const userIndex = allUsers.findIndex(u => u.id === currentItemsUser.id);
        if (userIndex !== -1) {
          allUsers[userIndex].cards = newCards;
        }
      } else {
        showToast('Error updating cards', 'error');
      }

      showUserItemsModal(currentItemsUser);
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
