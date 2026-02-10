// ========================================
// MULON - Global Money Formatting Utility
// ========================================

// Format number with commas (e.g., 1000 -> 1,000)
function formatWithCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format a balance with $ and commas (e.g., 1000.50 -> $1,000.50)
function formatBalance(amount) {
  const value = parseFloat(amount) || 0;
  const [whole, decimal] = value.toFixed(2).split('.');
  return `$${formatWithCommas(whole)}.${decimal}`;
}

// Format currency with +/- prefix (e.g., 100 -> +$100.00, -50 -> -$50.00)
function formatCurrency(amount) {
  const value = parseFloat(amount) || 0;
  const absValue = Math.abs(value);
  const [whole, decimal] = absValue.toFixed(2).split('.');
  const formatted = formatWithCommas(whole) + '.' + decimal;
  return value >= 0 ? `+$${formatted}` : `-$${formatted}`;
}

// Format profit/loss display
function formatProfit(amount) {
  const value = parseFloat(amount) || 0;
  const [whole, decimal] = Math.abs(value).toFixed(2).split('.');
  const formatted = formatWithCommas(whole) + '.' + decimal;
  return (value >= 0 ? '+' : '-') + '$' + formatted;
}

// Format money without prefix (e.g., 1000 -> 1,000.00)
function formatMoney(amount) {
  const value = parseFloat(amount) || 0;
  const [whole, decimal] = value.toFixed(2).split('.');
  return `${formatWithCommas(whole)}.${decimal}`;
}

// Format volume for display (for market volumes)
function formatVolume(volume) {
  if (volume >= 1000) {
    return '$' + (volume / 1000).toFixed(1) + 'k Vol.';
  }
  return '$' + formatMoney(volume) + ' Vol.';
}

// Update element content with formatted balance
function updateBalanceDisplay(elementId, amount) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = formatBalance(amount);
  }
}

// Update element content with formatted currency (+/-)
function updateCurrencyDisplay(elementId, amount) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = formatCurrency(amount);
  }
}

// Auto-format all elements with data-format attribute
function autoFormatElements() {
  // Format all elements with data-format="balance"
  const balanceElements = document.querySelectorAll('[data-format="balance"]');
  balanceElements.forEach(element => {
    const amount = parseFloat(element.dataset.amount) || 0;
    element.textContent = formatBalance(amount);
  });

  // Format all elements with data-format="currency"
  const currencyElements = document.querySelectorAll('[data-format="currency"]');
  currencyElements.forEach(element => {
    const amount = parseFloat(element.dataset.amount) || 0;
    element.textContent = formatCurrency(amount);
  });

  // Format all elements with data-format="profit"
  const profitElements = document.querySelectorAll('[data-format="profit"]');
  profitElements.forEach(element => {
    const amount = parseFloat(element.dataset.amount) || 0;
    element.textContent = formatProfit(amount);
  });

  // Format all elements with data-format="volume"
  const volumeElements = document.querySelectorAll('[data-format="volume"]');
  volumeElements.forEach(element => {
    const amount = parseFloat(element.dataset.amount) || 0;
    element.textContent = formatVolume(amount);
  });
}

// Global money formatting utility object
window.MoneyFormatter = {
  formatWithCommas,
  formatBalance,
  formatCurrency,
  formatProfit,
  formatMoney,
  formatVolume,
  updateBalanceDisplay,
  updateCurrencyDisplay,
  autoFormatElements
};

// Also export the individual functions for backward compatibility
window.formatWithCommas = formatWithCommas;
window.formatBalance = formatBalance;
window.formatCurrency = formatCurrency;
window.formatProfit = formatProfit;

// Auto-format elements when DOM is loaded
document.addEventListener('DOMContentLoaded', autoFormatElements);

// Auto-format elements when content is dynamically updated
const observer = new MutationObserver(() => {
  autoFormatElements();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('💰 Money Formatter loaded - All money values will be consistently formatted');