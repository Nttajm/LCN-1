/**
 * Mulonhood - Main Application JavaScript
 * Handles number animations (dial/speedometer effect) and UI interactions
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
  // Add slight delay for better visual effect
  setTimeout(() => {
    animateAllValues();
  }, 300);
  
  // Initialize navigation
  initNavigation();
  
  // Initialize timeframe buttons
  initTimeframeButtons();
  
  // Initialize watchlist interactions
  initWatchlistInteractions();
}

/**
 * Animate all values with dial/speedometer effect
 */
function animateAllValues() {
  // Animate market bar values
  animateMarketValues();
  
  // Animate portfolio amount
  animatePortfolioValue();
  
  // Animate stock prices in watchlist
  animateStockPrices();
}

/**
 * Animate market bar values with rolling number effect
 */
function animateMarketValues() {
  const marketValues = document.querySelectorAll('.market-value');
  const marketPercents = document.querySelectorAll('.market-percent');
  
  marketValues.forEach((element) => {
    const target = parseFloat(element.dataset.target);
    animateNumber(element, 0, target, 1500, true, false);
  });
  
  marketPercents.forEach((element) => {
    const target = parseFloat(element.dataset.target);
    const isNegative = target < 0;
    const prefix = isNegative ? '' : '+';
    animateNumber(element, 0, Math.abs(target), 1500, false, true, prefix, isNegative ? '-' : '');
  });
}

/**
 * Animate portfolio value with dramatic dial effect
 */
function animatePortfolioValue() {
  const portfolioAmount = document.querySelector('.portfolio-amount');
  if (portfolioAmount) {
    const target = parseFloat(portfolioAmount.dataset.target);
    animateNumber(portfolioAmount, 0, target, 2000, true, false, '', '', true);
  }
}

/**
 * Animate stock prices in the watchlist
 */
function animateStockPrices() {
  const stockPrices = document.querySelectorAll('.stock-price');
  
  stockPrices.forEach((element, index) => {
    const target = parseFloat(element.dataset.target);
    // Stagger the animations
    setTimeout(() => {
      animateNumber(element, 0, target, 1200, true, false, '$');
    }, index * 100);
  });
}

/**
 * Animate a number with dial/speedometer effect
 * @param {HTMLElement} element - The DOM element to animate
 * @param {number} start - Starting value
 * @param {number} end - Target value
 * @param {number} duration - Animation duration in ms
 * @param {boolean} formatCurrency - Whether to format as currency
 * @param {boolean} isPercent - Whether to add % suffix
 * @param {string} prefix - Prefix to add (e.g., '$', '+')
 * @param {string} negPrefix - Negative prefix
 * @param {boolean} dramatic - Use more dramatic animation
 */
function animateNumber(element, start, end, duration, formatCurrency = false, isPercent = false, prefix = '', negPrefix = '', dramatic = false) {
  const startTime = performance.now();
  const range = end - start;
  
  // Add updating class for visual feedback
  element.classList.add('value-updating');
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    let progress = Math.min(elapsed / duration, 1);
    
    // Use easing function for dial effect
    if (dramatic) {
      // More dramatic ease with overshoot
      progress = easeOutElastic(progress);
    } else {
      // Standard ease out with slight bounce
      progress = easeOutQuart(progress);
    }
    
    // Add oscillation effect for speedometer feel
    let oscillation = 0;
    if (progress < 1 && dramatic) {
      oscillation = Math.sin(progress * Math.PI * 8) * (1 - progress) * range * 0.02;
    }
    
    const current = start + (range * progress) + oscillation;
    
    // Format the number
    let displayValue = formatValue(current, formatCurrency, isPercent);
    element.textContent = negPrefix + prefix + displayValue;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      // Final value without oscillation
      element.textContent = negPrefix + prefix + formatValue(end, formatCurrency, isPercent);
      element.classList.remove('value-updating');
      
      // Add completed animation effect
      element.style.transform = 'scale(1.02)';
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 100);
    }
  }
  
  requestAnimationFrame(update);
}

/**
 * Format value based on type
 */
function formatValue(value, formatCurrency, isPercent) {
  if (formatCurrency) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } else if (isPercent) {
    return value.toFixed(2) + '%';
  }
  return value.toFixed(2);
}

/**
 * Easing function - ease out quart for smooth deceleration
 */
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Easing function - elastic for bouncy dial effect
 */
function easeOutElastic(t) {
  const c4 = (2 * Math.PI) / 3;
  
  if (t === 0) return 0;
  if (t === 1) return 1;
  
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/**
 * Initialize navigation interactions
 */
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all items
      navItems.forEach(nav => nav.classList.remove('active'));
      
      // Add active class to clicked item
      item.classList.add('active');
      
      // Update content header based on selection
      const contentHeader = document.querySelector('.content-header h1');
      const selection = item.textContent.trim();
      
      switch(selection) {
        case 'portfolio':
          contentHeader.textContent = 'stock/ portfolio viewer';
          break;
        case 'markets':
          contentHeader.textContent = 'stock/ markets overview';
          break;
        case 'activity':
          contentHeader.textContent = 'stock/ recent activity';
          break;
      }
    });
  });
}

/**
 * Initialize timeframe button interactions
 */
function initTimeframeButtons() {
  const timeframeBtns = document.querySelectorAll('.timeframe-btn');
  
  timeframeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      timeframeBtns.forEach(b => b.classList.remove('active'));
      
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Trigger chart reload with new timeframe
      const timeframe = btn.textContent.trim();
      updateChartTimeframe(timeframe);
    });
  });
}

/**
 * Update chart based on selected timeframe
 * @param {string} timeframe - Selected timeframe (1D, 1W, 1M, etc.)
 */
function updateChartTimeframe(timeframe) {
  // Map timeframe to TradingView interval
  const intervalMap = {
    '1D': 'D',
    '1W': 'W',
    '1M': 'M',
    '3M': '3M',
    '1Y': '12M',
    'ALL': 'ALL'
  };
  
  // Dispatch custom event for graph.js to handle
  const event = new CustomEvent('timeframeChange', {
    detail: { timeframe: intervalMap[timeframe] || 'D' }
  });
  document.dispatchEvent(event);
}

/**
 * Initialize watchlist interactions
 */
function initWatchlistInteractions() {
  const stockItems = document.querySelectorAll('.stock-item');
  
  stockItems.forEach(item => {
    item.addEventListener('click', () => {
      // Get stock symbol
      const symbol = item.querySelector('.stock-symbol').textContent;
      
      // Update chart to show selected stock
      selectStock(symbol);
      
      // Visual feedback
      stockItems.forEach(s => s.classList.remove('selected'));
      item.classList.add('selected');
    });
  });
  
  // Initialize control buttons
  const collapseBtn = document.querySelector('.collapse-btn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      const stockList = document.querySelector('.stock-list');
      stockList.classList.toggle('collapsed');
      collapseBtn.textContent = stockList.classList.contains('collapsed') ? '∨' : '∧';
    });
  }
}

/**
 * Select a stock and update the chart
 * @param {string} symbol - Stock symbol to display
 */
function selectStock(symbol) {
  // Dispatch custom event for graph.js to handle
  const event = new CustomEvent('stockSelect', {
    detail: { symbol: symbol }
  });
  document.dispatchEvent(event);
  
  // Update content header
  const contentHeader = document.querySelector('.content-header h1');
  contentHeader.textContent = `stock/ ${symbol}`;
}

/**
 * Utility: Refresh all price animations (for live updates)
 */
function refreshPrices() {
  // This would be called when receiving new price data
  animateAllValues();
}

/**
 * Utility: Format large numbers with abbreviations
 */
function formatLargeNumber(num) {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

// Export functions for external use
window.MulonhoodApp = {
  refreshPrices,
  selectStock,
  updateChartTimeframe,
  animateNumber
};
