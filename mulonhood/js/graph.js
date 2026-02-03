/**
 * Mulonhood - Graph Rendering JavaScript
 * Handles TradingView chart integration and rendering
 */

// Chart configuration
const ChartConfig = {
  container: 'tradingview-chart',
  defaultSymbol: 'NASDAQ:AAPL',
  defaultInterval: 'D',
  theme: 'dark',
  height: 350,
  autosize: true,
  colorScheme: {
    background: '#141414',
    gridColor: '#2d2d2d',
    textColor: '#9ca3af',
    lineColor: '#00c853'
  }
};

// Current chart state
let currentChart = null;
let currentSymbol = ChartConfig.defaultSymbol;
let currentInterval = ChartConfig.defaultInterval;

/**
 * Initialize the TradingView chart
 */
function initChart() {
  // Check if TradingView library is loaded
  if (typeof TradingView === 'undefined') {
    console.warn('TradingView library not loaded. Showing fallback chart.');
    showFallbackChart();
    return;
  }
  
  createTradingViewWidget(currentSymbol, currentInterval);
}

/**
 * Create TradingView widget
 * @param {string} symbol - Stock symbol (e.g., 'NASDAQ:AAPL')
 * @param {string} interval - Chart interval (e.g., 'D', 'W', 'M')
 */
function createTradingViewWidget(symbol, interval) {
  const container = document.getElementById(ChartConfig.container);
  if (!container) return;
  
  // Clear previous chart
  container.innerHTML = '';
  
  // Create new TradingView widget
  currentChart = new TradingView.widget({
    "autosize": true,
    "symbol": symbol,
    "interval": interval,
    "timezone": "Etc/UTC",
    "theme": "dark",
    "style": "3", // Area chart style
    "locale": "en",
    "enable_publishing": false,
    "hide_top_toolbar": true,
    "hide_legend": true,
    "save_image": false,
    "container_id": ChartConfig.container,
    "hide_volume": true,
    "backgroundColor": ChartConfig.colorScheme.background,
    "gridColor": ChartConfig.colorScheme.gridColor,
    "hide_side_toolbar": true,
    "allow_symbol_change": false,
    "details": false,
    "hotlist": false,
    "calendar": false,
    "studies": [],
    "overrides": {
      "paneProperties.background": ChartConfig.colorScheme.background,
      "paneProperties.vertGridProperties.color": ChartConfig.colorScheme.gridColor,
      "paneProperties.horzGridProperties.color": ChartConfig.colorScheme.gridColor,
      "scalesProperties.textColor": ChartConfig.colorScheme.textColor,
      "scalesProperties.lineColor": ChartConfig.colorScheme.gridColor,
      "mainSeriesProperties.areaStyle.color1": "rgba(0, 200, 83, 0.3)",
      "mainSeriesProperties.areaStyle.color2": "rgba(0, 200, 83, 0.0)",
      "mainSeriesProperties.areaStyle.linecolor": ChartConfig.colorScheme.lineColor,
      "mainSeriesProperties.areaStyle.linewidth": 2
    }
  });
  
  currentSymbol = symbol;
  currentInterval = interval;
}

/**
 * Show fallback SVG chart when TradingView is unavailable
 */
function showFallbackChart() {
  const container = document.getElementById(ChartConfig.container);
  if (!container) return;
  
  container.innerHTML = `
    <svg viewBox="0 0 800 350" preserveAspectRatio="none" class="fallback-chart">
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0, 200, 83, 0.4);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(0, 200, 83, 0);stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Grid lines -->
      <g class="grid-lines" stroke="#2d2d2d" stroke-width="0.5">
        <line x1="0" y1="70" x2="800" y2="70" />
        <line x1="0" y1="140" x2="800" y2="140" />
        <line x1="0" y1="210" x2="800" y2="210" />
        <line x1="0" y1="280" x2="800" y2="280" />
      </g>
      
      <!-- Area fill -->
      <path d="M 0 280 
               L 40 250 
               L 80 260 
               L 120 220 
               L 160 240 
               L 200 180 
               L 240 200 
               L 280 160 
               L 320 170 
               L 360 130 
               L 400 150 
               L 440 120 
               L 480 140 
               L 520 100 
               L 560 110 
               L 600 80 
               L 640 95 
               L 680 70 
               L 720 85 
               L 760 65 
               L 800 75
               L 800 350 
               L 0 350 Z" 
            fill="url(#chartGradient)" />
      
      <!-- Main line -->
      <path d="M 0 280 
               L 40 250 
               L 80 260 
               L 120 220 
               L 160 240 
               L 200 180 
               L 240 200 
               L 280 160 
               L 320 170 
               L 360 130 
               L 400 150 
               L 440 120 
               L 480 140 
               L 520 100 
               L 560 110 
               L 600 80 
               L 640 95 
               L 680 70 
               L 720 85 
               L 760 65 
               L 800 75" 
            fill="none" 
            stroke="#00c853" 
            stroke-width="2" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            class="chart-line" />
      
      <!-- Current price line -->
      <line x1="0" y1="75" x2="800" y2="75" stroke="#00c853" stroke-width="1" stroke-dasharray="4,4" opacity="0.5" />
      
      <!-- Price labels -->
      <text x="10" y="85" fill="#6b7280" font-size="11" font-family="Inter, sans-serif">$269.96</text>
      <text x="10" y="155" fill="#6b7280" font-size="11" font-family="Inter, sans-serif">$260.00</text>
      <text x="10" y="225" fill="#6b7280" font-size="11" font-family="Inter, sans-serif">$250.00</text>
      <text x="10" y="295" fill="#6b7280" font-size="11" font-family="Inter, sans-serif">$240.00</text>
      
      <!-- Animated dot on current price -->
      <circle cx="800" cy="75" r="4" fill="#00c853" class="price-dot">
        <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
    
    <style>
      .fallback-chart {
        width: 100%;
        height: 100%;
        background-color: #141414;
        border-radius: 8px;
      }
      
      .chart-line {
        animation: drawLine 2s ease-out forwards;
        stroke-dasharray: 2000;
        stroke-dashoffset: 2000;
      }
      
      @keyframes drawLine {
        to {
          stroke-dashoffset: 0;
        }
      }
    </style>
  `;
  
  // Add interaction to fallback chart
  addFallbackChartInteraction(container);
}

/**
 * Add hover interaction to fallback chart
 */
function addFallbackChartInteraction(container) {
  const svg = container.querySelector('svg');
  if (!svg) return;
  
  // Add crosshair on hover
  svg.addEventListener('mousemove', (e) => {
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Remove existing crosshair
    const existingCrosshair = svg.querySelector('.crosshair');
    if (existingCrosshair) existingCrosshair.remove();
    
    // Create crosshair group
    const crosshair = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    crosshair.classList.add('crosshair');
    
    // Vertical line
    const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    vLine.setAttribute('x1', x);
    vLine.setAttribute('y1', 0);
    vLine.setAttribute('x2', x);
    vLine.setAttribute('y2', 350);
    vLine.setAttribute('stroke', '#4a4a4a');
    vLine.setAttribute('stroke-dasharray', '2,2');
    
    // Horizontal line
    const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hLine.setAttribute('x1', 0);
    hLine.setAttribute('y1', y);
    hLine.setAttribute('x2', 800);
    hLine.setAttribute('y2', y);
    hLine.setAttribute('stroke', '#4a4a4a');
    hLine.setAttribute('stroke-dasharray', '2,2');
    
    crosshair.appendChild(vLine);
    crosshair.appendChild(hLine);
    svg.appendChild(crosshair);
  });
  
  svg.addEventListener('mouseleave', () => {
    const crosshair = svg.querySelector('.crosshair');
    if (crosshair) crosshair.remove();
  });
}

/**
 * Update chart symbol
 * @param {string} symbol - Stock symbol to display
 */
function updateChartSymbol(symbol) {
  // Format symbol for TradingView
  const formattedSymbol = formatSymbol(symbol);
  
  if (currentChart && typeof TradingView !== 'undefined') {
    createTradingViewWidget(formattedSymbol, currentInterval);
  } else {
    // Update fallback chart title
    updateFallbackChartSymbol(symbol);
  }
}

/**
 * Update chart interval/timeframe
 * @param {string} interval - Chart interval
 */
function updateChartInterval(interval) {
  if (currentChart && typeof TradingView !== 'undefined') {
    createTradingViewWidget(currentSymbol, interval);
  }
  currentInterval = interval;
}

/**
 * Format symbol for TradingView
 * @param {string} symbol - Raw symbol
 * @returns {string} Formatted symbol with exchange prefix
 */
function formatSymbol(symbol) {
  // Common symbol mappings
  const exchangeMap = {
    'AAPL': 'NASDAQ:AAPL',
    'GOOGL': 'NASDAQ:GOOGL',
    'GOOG': 'NASDAQ:GOOG',
    'MSFT': 'NASDAQ:MSFT',
    'AMZN': 'NASDAQ:AMZN',
    'META': 'NASDAQ:META',
    'NVDA': 'NASDAQ:NVDA',
    'TSLA': 'NASDAQ:TSLA',
    'VIX': 'TVC:VIX',
    'IVV': 'AMEX:IVV',
    'MCD': 'NYSE:MCD'
  };
  
  return exchangeMap[symbol] || `NASDAQ:${symbol}`;
}

/**
 * Update fallback chart for symbol change
 */
function updateFallbackChartSymbol(symbol) {
  const priceLabel = document.querySelector('.fallback-chart text');
  if (priceLabel) {
    // Get price from watchlist if available
    const stockItem = document.querySelector(`.stock-symbol:contains('${symbol}')`);
    // Update would go here
  }
}

// Event Listeners for app.js communication
document.addEventListener('stockSelect', (e) => {
  const symbol = e.detail.symbol;
  updateChartSymbol(symbol);
});

document.addEventListener('timeframeChange', (e) => {
  const interval = e.detail.timeframe;
  updateChartInterval(interval);
});

// Initialize chart when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure container is ready
  setTimeout(() => {
    initChart();
  }, 500);
});

// Export functions for external use
window.MulonhoodGraph = {
  initChart,
  updateChartSymbol,
  updateChartInterval,
  showFallbackChart
};
