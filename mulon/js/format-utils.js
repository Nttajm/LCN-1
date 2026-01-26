// ========================================
// FORMAT UTILITIES - Shared across Mulon
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

// Format profit/loss display (for session profits etc)
function formatProfit(amount) {
  const value = parseFloat(amount) || 0;
  const [whole, decimal] = Math.abs(value).toFixed(2).split('.');
  const formatted = formatWithCommas(whole) + '.' + decimal;
  return (value >= 0 ? '+' : '-') + '$' + formatted;
}

// Export to window for global access
window.FormatUtils = {
  formatWithCommas,
  formatBalance,
  formatCurrency,
  formatProfit
};
