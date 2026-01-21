// ========================================
// MULON - Admin Panel JavaScript
// ========================================

import { MulonData, Auth } from './data.js';

// Admin email whitelist
const ADMIN_EMAILS = ['joelmulonde81@gmail.com'];

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
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
  
  // Setup form
  setupForm();
  
  // Setup category form
  setupCategoryForm();
  
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
  
  // Scroll to form
  document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
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
