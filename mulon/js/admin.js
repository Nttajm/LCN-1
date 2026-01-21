// ========================================
// MULON - Admin Panel JavaScript
// ========================================

import { MulonData } from './data.js';

document.addEventListener('DOMContentLoaded', async function() {
  // Show loading state
  showLoading();
  
  // Initialize data from Firebase
  await MulonData.init();
  
  // Render markets list
  renderMarketList();
  
  // Setup form
  setupForm();
  
  // Setup delete modal
  setupDeleteModal();
  
  // Setup reset button
  setupResetButton();
  
  // Setup transfer button
  setupTransferButton();
  
  // Set default dates
  setDefaultDates();
});

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
  
  return `
    <div class="market-item" data-market-id="${market.id}">
      <div class="market-item-content">
        <div class="market-item-title">${market.title}</div>
        <div class="market-item-meta">
          <span class="market-item-tag ${market.category}">${category.icon} ${category.label}</span>
          <span class="market-item-price">
            <span class="yes">${market.yesPrice}¢</span> / 
            <span class="no">${market.noPrice}¢</span>
          </span>
          <span class="market-item-date">Ends ${MulonData.formatDate(market.endDate)}</span>
          ${market.featured ? '<span class="market-item-featured">⭐ Featured</span>' : ''}
        </div>
      </div>
      <div class="market-item-actions">
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
