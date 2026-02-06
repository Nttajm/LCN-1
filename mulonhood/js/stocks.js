// Stock data organized by category

// Real stocks API cache and state
const realStockCache = {};
let isLoadingRealStocks = false;
const defaultRealTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];

// School Index Data
const indexData = [
  {
    id: 'SCHL',
    name: 'Total School Index',
    description: 'All school stocks combined',
    icon: 'total',
    price: 1247.50,
    change: 3.2,
    stocks: 28,
    volume: 524600,
    marketCap: '12.4M'
  },
  {
    id: 'ACAD',
    name: 'Academics Index',
    description: 'Math, English, Science & more',
    icon: 'school',
    price: 425.75,
    change: 5.8,
    stocks: 12,
    volume: 189400,
    marketCap: '4.2M'
  },
  {
    id: 'SPRT',
    name: 'Sports Index',
    description: 'All athletic departments',
    icon: 'sports',
    price: 312.00,
    change: -1.2,
    stocks: 8,
    volume: 156800,
    marketCap: '3.1M'
  },
  {
    id: 'TECH',
    name: 'TechHigh Index',
    description: 'Technology & innovation clubs',
    icon: 'tech',
    price: 389.25,
    change: 7.4,
    stocks: 8,
    volume: 134200,
    marketCap: '3.9M'
  },
  {
    id: 'ARTS',
    name: 'Arts & Culture Index',
    description: 'Music, drama, art & more',
    icon: 'arts',
    price: 120.50,
    change: -2.8,
    stocks: 6,
    volume: 44200,
    marketCap: '1.2M'
  }
];

const stockData = {
  school: [
    { ticker: 'MATH', name: 'Math Department', price: 24.50, change: 12.5, volume: 45200, marketCap: '2.4M' },
    { ticker: 'ENGR', name: 'English Class', price: 18.25, change: -2.3, volume: 32100, marketCap: '1.8M' },
    { ticker: 'HIST', name: 'History Society', price: 15.00, change: 5.8, volume: 28500, marketCap: '1.5M' },
    { ticker: 'CHEM', name: 'Chemistry Lab', price: 32.75, change: -4.1, volume: 19800, marketCap: '3.3M' },
    { ticker: 'PHYS', name: 'Physics Club', price: 28.00, change: 3.2, volume: 22400, marketCap: '2.8M' },
    { ticker: 'ART', name: 'Art Studio', price: 12.50, change: 8.9, volume: 15600, marketCap: '1.3M' },
    { ticker: 'CAFE', name: 'Cafeteria Inc', price: 8.25, change: -15.3, volume: 67800, marketCap: '825K' },
    { ticker: 'LIBR', name: 'Library Co', price: 22.00, change: 1.5, volume: 12300, marketCap: '2.2M' },
    { ticker: 'BAND', name: 'Marching Band', price: 5.50, change: -7.4, volume: 8900, marketCap: '550K' },
    { ticker: 'DRAM', name: 'Drama Club', price: 14.75, change: 4.2, volume: 11200, marketCap: '1.5M' },
    { ticker: 'PROM', name: 'Prom Committee', price: 32.00, change: 25.0, volume: 89500, marketCap: '3.2M' },
    { ticker: 'GRAD', name: 'Graduation Fund', price: 55.00, change: 18.5, volume: 56700, marketCap: '5.5M' },
  ],
  sports: [
    { ticker: 'FOOT', name: 'Football Team', price: 45.00, change: 2.1, volume: 125400, marketCap: '4.5M' },
    { ticker: 'BASK', name: 'Basketball Squad', price: 38.50, change: -1.8, volume: 98200, marketCap: '3.9M' },
    { ticker: 'BALL', name: 'Baseball Club', price: 18.75, change: 8.2, volume: 45600, marketCap: '1.9M' },
    { ticker: 'SOCC', name: 'Soccer League', price: 28.25, change: 5.5, volume: 67800, marketCap: '2.8M' },
    { ticker: 'SWIM', name: 'Swim Team', price: 22.00, change: -3.2, volume: 23400, marketCap: '2.2M' },
    { ticker: 'TRAK', name: 'Track & Field', price: 16.50, change: 4.8, volume: 34500, marketCap: '1.7M' },
    { ticker: 'TENN', name: 'Tennis Club', price: 19.75, change: -0.5, volume: 18900, marketCap: '2.0M' },
    { ticker: 'GOLF', name: 'Golf Team', price: 35.00, change: 2.3, volume: 12100, marketCap: '3.5M' },
  ],
  tech: [
    { ticker: 'CODE', name: 'Coding Club', price: 45.00, change: 6.8, volume: 78900, marketCap: '4.5M' },
    { ticker: 'GAME', name: 'Game Dev Society', price: 32.50, change: -1.5, volume: 98200, marketCap: '3.3M' },
    { ticker: 'ROBO', name: 'Robotics Team', price: 52.00, change: 9.2, volume: 56700, marketCap: '5.2M' },
    { ticker: 'HACK', name: 'Hackathon Inc', price: 28.75, change: 15.3, volume: 45600, marketCap: '2.9M' },
    { ticker: 'WEBS', name: 'Web Design Club', price: 18.25, change: 3.1, volume: 34500, marketCap: '1.8M' },
    { ticker: 'DATA', name: 'Data Science Lab', price: 41.00, change: -2.8, volume: 23400, marketCap: '4.1M' },
    { ticker: 'CYBS', name: 'Cyber Security', price: 38.50, change: 7.5, volume: 67800, marketCap: '3.9M' },
    { ticker: 'APPS', name: 'App Developers', price: 25.00, change: 4.2, volume: 89100, marketCap: '2.5M' },
  ],
  real: [
    { ticker: 'AAPL', name: 'Apple Inc', price: 185.50, change: 1.2, volume: 5670000, marketCap: '2.8T' },
    { ticker: 'MSFT', name: 'Microsoft', price: 378.25, change: 0.8, volume: 3450000, marketCap: '2.9T' },
    { ticker: 'GOOGL', name: 'Alphabet', price: 142.75, change: -0.5, volume: 2340000, marketCap: '1.8T' },
    { ticker: 'AMZN', name: 'Amazon', price: 178.00, change: 2.1, volume: 4560000, marketCap: '1.9T' },
    { ticker: 'TSLA', name: 'Tesla', price: 248.50, change: -3.2, volume: 8900000, marketCap: '790B' },
    { ticker: 'META', name: 'Meta Platforms', price: 485.00, change: 1.5, volume: 2100000, marketCap: '1.2T' },
    { ticker: 'NVDA', name: 'NVIDIA', price: 722.50, change: 4.8, volume: 6780000, marketCap: '1.8T' },
    { ticker: 'NFLX', name: 'Netflix', price: 565.25, change: -1.1, volume: 1890000, marketCap: '245B' },
  ],
  meme: [
    { ticker: 'YOLO', name: 'YOLO Holdings', price: 4.20, change: 42.0, volume: 999999, marketCap: '420K' },
    { ticker: 'HODL', name: 'Diamond Hands Inc', price: 6.90, change: 69.0, volume: 888888, marketCap: '690K' },
    { ticker: 'MOON', name: 'To The Moon LLC', price: 1.00, change: -50.0, volume: 777777, marketCap: '100K' },
    { ticker: 'MEME', name: 'Meme Economy', price: 13.37, change: 13.37, volume: 666666, marketCap: '1.3M' },
    { ticker: 'DOGE', name: 'Much Wow Corp', price: 0.42, change: 8.5, volume: 5555555, marketCap: '42K' },
    { ticker: 'PEPE', name: 'Rare Pepe Ltd', price: 0.01, change: -25.0, volume: 444444, marketCap: '1K' },
    { ticker: 'WAGMI', name: 'We All Gonna Make It', price: 2.50, change: 100.0, volume: 333333, marketCap: '250K' },
    { ticker: 'NGMI', name: 'Not Gonna Make It', price: 0.05, change: -90.0, volume: 222222, marketCap: '5K' },
  ]
};

let currentCategory = 'school';
let currentStock = null;
let stockChart = null;
let showCharts = true;
let showOverview = true;
let compactView = false;

// Stock descriptions by ticker
const stockDescriptions = {
  MATH: 'The Math Department stock represents the academic performance and popularity of mathematics courses at the school. Price fluctuates based on test scores, enrollment numbers, and competition results.',
  ENGR: 'English Class stock tracks the interest and performance in language arts. Influenced by essay contest wins, book club participation, and literary magazine submissions.',
  HIST: 'History Society shares reflect historical awareness on campus. Major events include debate wins, museum trips, and historical documentary screenings.',
  CHEM: 'Chemistry Lab stock is driven by lab experiment success rates, science fair participation, and the annual chemistry olympiad performance.',
  PHYS: 'Physics Club represents enthusiasm for physical sciences. Stock rises with successful physics demonstrations and robotics crossover projects.',
  ART: 'Art Studio shares track creative output. Influenced by gallery shows, mural projects, and art supply budget allocations.',
  CAFE: 'Cafeteria Inc stock reflects food service satisfaction. Highly volatile based on menu changes, food quality, and lunch line wait times.',
  LIBR: 'Library Co shares represent knowledge seeking behavior. Book checkouts, study room reservations, and quiet hours compliance affect pricing.',
  BAND: 'Marching Band stock tracks musical performance. Half-time shows, parades, and competition placements drive value.',
  DRAM: 'Drama Club shares rise with theatrical productions. Ticket sales, standing ovations, and drama award wins influence the price.',
  PROM: 'Prom Committee stock is highly seasonal. Spikes during prom planning season based on theme reveals and ticket sales.',
  GRAD: 'Graduation Fund represents senior class activities. Value increases as graduation approaches.',
  FOOT: 'Football Team stock is the most watched school stock. Win streaks cause major rallies.',
  BASK: 'Basketball Squad shares track court performance. Tournament runs create volatility.',
  BALL: 'Baseball Club stock follows the season. Perfect games and championships spike the price.',
  SOCC: 'Soccer League shares represent global sport interest. International student enrollment affects valuation.',
  SWIM: 'Swim Team stock tracks aquatic athletics. Record-breaking times drive share prices.',
  TRAK: 'Track & Field shares follow athletic achievements. State championship qualifications boost value.',
  TENN: 'Tennis Club stock represents racket sports enthusiasm. Match wins and new equipment drive prices.',
  GOLF: 'Golf Team shares track the most gentlemanly sport. Course conditions and tournament wins affect value.',
  CODE: 'Coding Club stock leads the tech sector. Hackathon wins and app launches create major moves.',
  GAME: 'Game Dev Society shares track gaming culture. Game releases and esports events drive volatility.',
  ROBO: 'Robotics Team stock represents engineering excellence. Competition wins cause significant rallies.',
  HACK: 'Hackathon Inc shares spike during coding events. Project completions and prizes affect pricing.',
  WEBS: 'Web Design Club stock tracks digital creativity. Website launches and redesigns influence value.',
  DATA: 'Data Science Lab shares represent analytical skills. Data visualization projects and predictions drive prices.',
  CYBS: 'Cyber Security stock reflects digital safety awareness. Successful security audits boost confidence.',
  APPS: 'App Developers shares track mobile innovation. App store rankings and download counts affect value.',
  AAPL: 'Apple Inc. designs and manufactures consumer electronics, software, and services worldwide.',
  MSFT: 'Microsoft Corporation develops and licenses software, services, devices, and solutions worldwide.',
  GOOGL: 'Alphabet Inc. provides online advertising services and cloud computing solutions globally.',
  AMZN: 'Amazon.com Inc. engages in retail, cloud computing, and artificial intelligence services.',
  TSLA: 'Tesla Inc. designs, manufactures, and sells electric vehicles and energy storage systems.',
  META: 'Meta Platforms Inc. develops products enabling people to connect through mobile devices and computers.',
  NVDA: 'NVIDIA Corporation designs graphics processing units for gaming and professional markets.',
  NFLX: 'Netflix Inc. provides entertainment streaming services and produces original content.',
  YOLO: 'YOLO Holdings - You Only Live Once! The ultimate risk-on investment vehicle.',
  HODL: 'Diamond Hands Inc - For those who never sell. Hold on for dear life.',
  MOON: 'To The Moon LLC - Speculative investment with lunar ambitions.',
  MEME: 'Meme Economy - Trading on viral content and internet culture.',
  DOGE: 'Much Wow Corp - Very investment. Much return. So profit.',
  PEPE: 'Rare Pepe Ltd - Collecting the rarest of digital assets.',
  WAGMI: 'We All Gonna Make It - Optimism as a trading strategy.',
  NGMI: 'Not Gonna Make It - For the brave contrarian investor.',
  // Index descriptions
  SCHL: 'The Total School Index tracks the overall performance of all school-related stocks. A diversified investment in the entire school economy.',
  ACAD: 'The Academics Index focuses on educational departments. Perfect for those betting on scholastic excellence.',
  SPRT: 'The Sports Index captures athletic department performance. Game days and championships drive this index.',
  TECH: 'The TechHigh Index follows innovation and technology clubs. Hackathons and tech fairs create momentum.',
  ARTS: 'The Arts & Culture Index tracks creative departments. Performances and exhibitions influence this index.',
};

// Generate mini chart SVG path
function generateMiniChart(isPositive) {
  const points = [];
  let y = 50;
  
  for (let x = 0; x <= 100; x += 10) {
    y += (Math.random() - 0.5) * 20;
    y = Math.max(10, Math.min(90, y));
    points.push(`${x},${100 - y}`);
  }
  
  // End higher or lower based on positive/negative
  const finalY = isPositive ? Math.random() * 30 + 10 : Math.random() * 30 + 60;
  points.push(`100,${100 - finalY}`);
  
  const color = isPositive ? '#00e676' : '#ff5252';
  
  return `
    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline 
        points="${points.join(' ')}" 
        fill="none" 
        stroke="${color}" 
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  `;
}

// Create stock card HTML
function createStockCard(stock, isRealStock = false) {
  const isPositive = stock.change >= 0;
  const changeSign = isPositive ? '+' : '';
  const changeClass = isPositive ? 'positive' : 'negative';
  
  // Badge for real stocks
  let badge = '';
  let extraClass = '';
  if (isRealStock || stock.isReal) {
    extraClass = 'real-stock';
    badge = stock.isFallback 
      ? '<span class="stock-badge cached">Cached</span>' 
      : '<span class="stock-badge live">Live</span>';
  }
  
  return `
    <div class="stock-card ${extraClass} ${changeClass}" data-ticker="${stock.ticker}">
      <div class="stock-card-header">
        <div>
          <div class="stock-ticker">${stock.ticker}${badge}</div>
          <div class="stock-name">${stock.name}</div>
        </div>
        <div class="stock-logo">${stock.ticker.charAt(0)}</div>
      </div>
      <div class="stock-price-section">
        <div class="stock-price">$${stock.price.toFixed(2)}</div>
        <div class="stock-change ${changeClass}">${changeSign}${stock.change.toFixed(2)}%</div>
      </div>
      <div class="stock-mini-chart ${changeClass}">
        ${generateMiniChart(isPositive)}
      </div>
      <div class="stock-meta">
        <div class="meta-item">
          <span class="meta-label">Volume</span>
          <span class="meta-value">${formatVolume(stock.volume)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Mkt Cap</span>
          <span class="meta-value">${stock.marketCap || formatMarketCap(stock.volume * stock.price)}</span>
        </div>
      </div>
    </div>
  `;
}

// Format market cap
function formatMarketCap(value) {
  if (value >= 1000000000000) return '$' + (value / 1000000000000).toFixed(1) + 'T';
  if (value >= 1000000000) return '$' + (value / 1000000000).toFixed(1) + 'B';
  if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return '$' + (value / 1000).toFixed(1) + 'K';
  return '$' + value.toFixed(0);
}

// Create index card HTML
function createIndexCard(index) {
  const isPositive = index.change >= 0;
  const changeSign = isPositive ? '+' : '';
  const changeClass = isPositive ? 'positive' : 'negative';
  
  return `
    <div class="index-card" data-index="${index.id}">
      <div class="index-header">
        <div class="index-info">
          <h3>${index.name}</h3>
          <p>${index.description}</p>
        </div>
        <div class="index-icon ${index.icon}">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3v18h18"></path>
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
          </svg>
        </div>
      </div>
      <div class="index-price-section">
        <div class="index-price">$${index.price.toFixed(2)}</div>
        <div class="index-change ${changeClass}">
          <span class="index-change-value">${changeSign}${index.change.toFixed(2)}%</span>
          <span class="index-change-period">Today</span>
        </div>
      </div>
      <div class="index-chart ${changeClass}">
        ${generateMiniChart(isPositive)}
      </div>
      <div class="index-stats">
        <div class="index-stat">
          <div class="index-stat-value">${index.stocks}</div>
          <div class="index-stat-label">Stocks</div>
        </div>
        <div class="index-stat">
          <div class="index-stat-value">${formatVolume(index.volume)}</div>
          <div class="index-stat-label">Volume</div>
        </div>
        <div class="index-stat">
          <div class="index-stat-value">${index.marketCap}</div>
          <div class="index-stat-label">Mkt Cap</div>
        </div>
      </div>
    </div>
  `;
}

// Render indexes grid
function renderIndexes() {
  const grid = document.getElementById('stocksGrid');
  document.querySelector('.section-header h2').textContent = 'School Indexes';
  
  // Hide search container if visible
  const searchContainer = document.getElementById('realStockSearchContainer');
  if (searchContainer) {
    searchContainer.style.display = 'none';
  }
  
  grid.className = 'index-grid';
  grid.innerHTML = indexData.map(createIndexCard).join('');
  
  // Add click handlers
  document.querySelectorAll('.index-card').forEach(card => {
    card.addEventListener('click', () => {
      const indexId = card.dataset.index;
      openIndexDetail(indexId);
    });
  });
}

// Open index detail (placeholder)
function openIndexDetail(indexId) {
  const index = indexData.find(i => i.id === indexId);
  if (!index) return;
  
  // For now, show an alert - can be expanded to full detail view
  alert(`${index.name}\n\nPrice: $${index.price.toFixed(2)}\nChange: ${index.change >= 0 ? '+' : ''}${index.change.toFixed(2)}%\nStocks: ${index.stocks}\nVolume: ${formatVolume(index.volume)}\nMarket Cap: ${index.marketCap}`);
}

// Render stocks grid
function renderStocks(category) {
  const grid = document.getElementById('stocksGrid');
  const sectionHeader = document.querySelector('.section-header');
  
  // Reset grid class
  grid.className = 'stocks-grid';
  if (compactView) grid.classList.add('compact');
  
  // Handle indexes category
  if (category === 'indexes') {
    renderIndexes();
    return;
  }
  
  // Update section header
  const categoryNames = {
    indexes: 'School Indexes',
    school: 'School Stocks',
    sports: 'Sports Stocks',
    tech: 'TechHigh Stocks',
    real: 'Real Stocks',
    meme: 'Meme Stocks'
  };
  
  // Show/hide real stocks search bar
  let searchBar = document.getElementById('realStockSearch');
  if (category === 'real') {
    if (!searchBar) {
      // Create search bar for real stocks
      const searchContainer = document.createElement('div');
      searchContainer.className = 'real-stock-search';
      searchContainer.id = 'realStockSearchContainer';
      searchContainer.innerHTML = `
        <div class="search-input-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <input type="text" id="realStockSearch" placeholder="Search real stocks (e.g., AAPL, TSLA)...">
          <button id="searchRealBtn" class="search-btn">Search</button>
        </div>
        <div class="search-hint">Enter a stock ticker symbol to get live market data</div>
      `;
      sectionHeader.after(searchContainer);
      
      // Setup search handlers
      setupRealStockSearch();
    } else {
      document.getElementById('realStockSearchContainer').style.display = 'block';
    }
    
    // Load real stocks from API
    loadRealStocks();
    return;
  } else {
    // Hide search bar for other categories
    const searchContainer = document.getElementById('realStockSearchContainer');
    if (searchContainer) {
      searchContainer.style.display = 'none';
    }
  }
  
  const stocks = stockData[category] || [];
  grid.innerHTML = stocks.map(createStockCard).join('');
  
  document.querySelector('.section-header h2').textContent = categoryNames[category] || 'Stocks';
  
  // Add click handlers to cards
  document.querySelectorAll('.stock-card').forEach(card => {
    card.addEventListener('click', () => {
      const ticker = card.dataset.ticker;
      openStockDetail(ticker);
    });
  });
}

// Setup real stock search functionality
function setupRealStockSearch() {
  const searchInput = document.getElementById('realStockSearch');
  const searchBtn = document.getElementById('searchRealBtn');
  
  const doSearch = () => {
    const query = searchInput.value.trim().toUpperCase();
    if (query) {
      searchRealStock(query);
    }
  };
  
  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      doSearch();
    }
  });
}

// Search for a real stock by ticker
async function searchRealStock(ticker) {
  const grid = document.getElementById('stocksGrid');
  
  // Show loading state
  grid.innerHTML = `
    <div class="loading-stocks">
      <div class="loading-spinner"></div>
      <p>Searching for ${ticker}...</p>
    </div>
  `;
  
  try {
    const fetchedStock = await fetchRealStockData(ticker);
    if (fetchedStock) {
      // Add to cache and display
      realStockCache[ticker] = fetchedStock;
      
      // Update the real stocks array
      const existingIndex = stockData.real.findIndex(s => s.ticker === ticker);
      if (existingIndex >= 0) {
        stockData.real[existingIndex] = fetchedStock;
      } else {
        stockData.real.unshift(fetchedStock);
      }
      
      // Re-render
      renderRealStocksGrid();
    } else {
      grid.innerHTML = `
        <div class="no-results">
          <p>No results found for "${ticker}"</p>
          <p class="hint">Make sure you entered a valid stock ticker symbol</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error searching stock:', error);
    grid.innerHTML = `
      <div class="no-results error">
        <p>Error fetching stock data</p>
        <p class="hint">${error.message}</p>
      </div>
    `;
  }
}

// Load real stocks from API
async function loadRealStocks() {
  if (isLoadingRealStocks) return;
  
  const grid = document.getElementById('stocksGrid');
  document.querySelector('.section-header h2').textContent = 'Real Stocks';
  
  // Show cached data first if available
  if (Object.keys(realStockCache).length > 0) {
    renderRealStocksGrid();
    return;
  }
  
  isLoadingRealStocks = true;
  
  // Show loading state
  grid.innerHTML = `
    <div class="loading-stocks">
      <div class="loading-spinner"></div>
      <p>Loading real-time stock data...</p>
    </div>
  `;
  
  try {
    // Fetch all default tickers
    const promises = defaultRealTickers.map(ticker => fetchRealStockData(ticker));
    const results = await Promise.all(promises);
    
    // Update stockData.real with API results
    stockData.real = results.filter(r => r !== null);
    
    // Cache results
    stockData.real.forEach(stock => {
      realStockCache[stock.ticker] = stock;
    });
    
    renderRealStocksGrid();
  } catch (error) {
    console.error('Error loading real stocks:', error);
    // Fall back to static data
    renderRealStocksGrid();
  }
  
  isLoadingRealStocks = false;
}

// Fetch real stock data from API
async function fetchRealStockData(ticker) {
  try {
    // Using Yahoo Finance API via a proxy (RapidAPI or similar)
    // For demo purposes, we'll use a free alternative: Finnhub
    const apiKey = 'd61uu0pr01qgcobr0g40d61uu0pr01qgcobr0g4g'; // Replace with actual API key
    
    // Try Finnhub API
    const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`;
    const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`;
    
    const [quoteRes, profileRes] = await Promise.all([
      fetch(quoteUrl),
      fetch(profileUrl)
    ]);
    
    const quote = await quoteRes.json();
    const profile = await profileRes.json();
    
    // Check if we got valid data
    if (quote.c && quote.c > 0) {
      const price = quote.c; // Current price
      const prevClose = quote.pc; // Previous close
      const change = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      
      return {
        ticker: ticker,
        name: profile.name || ticker,
        price: price,
        change: change,
        volume: quote.v || 0,
        high: quote.h || price,
        low: quote.l || price,
        open: quote.o || prevClose,
        prevClose: prevClose,
        isReal: true
      };
    }
    
    // If Finnhub fails, return fallback data
    return getFallbackStockData(ticker);
    
  } catch (error) {
    console.error(`Error fetching ${ticker}:`, error);
    return getFallbackStockData(ticker);
  }
}

// Fallback stock data when API fails
function getFallbackStockData(ticker) {
  const fallbackData = {
    'AAPL': { name: 'Apple Inc', price: 185.50, change: 1.2, volume: 56700000 },
    'MSFT': { name: 'Microsoft', price: 378.25, change: 0.8, volume: 34500000 },
    'GOOGL': { name: 'Alphabet', price: 142.75, change: -0.5, volume: 23400000 },
    'AMZN': { name: 'Amazon', price: 178.00, change: 2.1, volume: 45600000 },
    'TSLA': { name: 'Tesla', price: 248.50, change: -3.2, volume: 89000000 },
    'META': { name: 'Meta Platforms', price: 485.00, change: 1.5, volume: 21000000 },
    'NVDA': { name: 'NVIDIA', price: 722.50, change: 4.8, volume: 67800000 },
    'NFLX': { name: 'Netflix', price: 565.25, change: -1.1, volume: 18900000 },
  };
  
  if (fallbackData[ticker]) {
    return {
      ticker: ticker,
      ...fallbackData[ticker],
      isReal: true,
      isFallback: true
    };
  }
  
  return null;
}

// Render real stocks grid
function renderRealStocksGrid() {
  const grid = document.getElementById('stocksGrid');
  const stocks = stockData.real || [];
  
  if (stocks.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <p>No stocks loaded</p>
        <p class="hint">Search for a stock ticker above</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = stocks.map(stock => createStockCard(stock, true)).join('');
  
  // Add click handlers
  document.querySelectorAll('.stock-card').forEach(card => {
    card.addEventListener('click', () => {
      const ticker = card.dataset.ticker;
      openStockDetail(ticker);
    });
  });
}

// Open stock detail view
function openStockDetail(ticker) {
  // Find the stock in current category
  let stock = null;
  for (const category of Object.keys(stockData)) {
    stock = stockData[category].find(s => s.ticker === ticker);
    if (stock) break;
  }
  
  if (!stock) return;
  
  currentStock = stock;
  const overlay = document.getElementById('stockDetailOverlay');
  const isPositive = stock.change >= 0;
  
  // Populate stock info
  document.getElementById('stockDetailLogo').textContent = stock.ticker.charAt(0);
  document.getElementById('stockDetailTicker').textContent = stock.ticker;
  document.getElementById('stockDetailName').textContent = stock.name;
  
  // Price and change
  const priceElement = document.getElementById('stockDetailPrice');
  priceElement.textContent = `$${stock.price.toFixed(2)}`;
  
  const changeElement = document.getElementById('stockDetailChange');
  const changeAmount = (stock.price * stock.change / 100).toFixed(2);
  changeElement.innerHTML = `
    <span class="change-amount">${isPositive ? '+' : ''}$${changeAmount}</span>
    <span class="change-percent">(${isPositive ? '+' : ''}${stock.change.toFixed(2)}%)</span>
    <span class="change-period">Today</span>
  `;
  changeElement.className = `stock-detail-change ${isPositive ? '' : 'negative'}`;
  
  // Stats
  const marketCap = formatVolume(stock.volume * stock.price);
  document.getElementById('statMarketCap').textContent = `$${marketCap}`;
  document.getElementById('statVolume').textContent = formatVolume(stock.volume);
  document.getElementById('statAvgVolume').textContent = formatVolume(Math.round(stock.volume * 0.85));
  
  const highToday = (stock.price * 1.05).toFixed(2);
  const lowToday = (stock.price * 0.92).toFixed(2);
  const openPrice = (stock.price / (1 + stock.change / 100)).toFixed(2);
  
  document.getElementById('statHigh').textContent = `$${highToday}`;
  document.getElementById('statLow').textContent = `$${lowToday}`;
  document.getElementById('statOpen').textContent = `$${openPrice}`;
  document.getElementById('stat52High').textContent = `$${(stock.price * 1.4).toFixed(2)}`;
  document.getElementById('stat52Low').textContent = `$${(stock.price * 0.5).toFixed(2)}`;
  
  // About text
  document.getElementById('stockAbout').textContent = stockDescriptions[stock.ticker] || 
    `${stock.name} is a tradable asset in the MulonHood school stock market simulation.`;
  
  // Show overlay
  overlay.classList.add('active');
  
  // Scroll overlay to top
  overlay.scrollTop = 0;
  
  // Initialize chart after overlay is visible and has dimensions
  setTimeout(() => {
    initStockDetailChart(stock);
  }, 100);
}

// Close stock detail view
function closeStockDetail() {
  const overlay = document.getElementById('stockDetailOverlay');
  overlay.classList.remove('active');
  currentStock = null;
  
  if (stockChart) {
    stockChart = null;
  }
}

// Initialize the stock detail chart
function initStockDetailChart(stock) {
  const canvas = document.getElementById('stockDetailChart');
  if (!canvas) {
    console.error('Stock detail chart canvas not found');
    return;
  }
  
  // Generate chart data based on stock - use stock ticker as seed for consistency
  const seed = stock.ticker.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  
  const chartData = {
    '1h': generateStockData(60, stock.price, stock.price * 0.005, stock.change > 0, seed),
    '1d': generateStockData(24, stock.price, stock.price * 0.02, stock.change > 0, seed + 1),
    '3d': generateStockData(72, stock.price, stock.price * 0.05, stock.change > 0, seed + 2),
    '1w': generateStockData(168, stock.price, stock.price * 0.08, stock.change > 0, seed + 3),
    '1m': generateStockData(720, stock.price, stock.price * 0.15, stock.change > 0, seed + 4)
  };
  
  // Create chart if StockChart class exists
  if (window.StockChart) {
    stockChart = new StockChart('stockDetailChart', '#stockDetailPrice', {
      data: chartData,
      skipGlobalListeners: true,
      digitHeight: 2.5
    });
    
    // Setup time period buttons for this specific overlay
    setupDetailChartControls();
  } else {
    console.error('StockChart class not found');
  }
}

// Generate stock data for chart with seeded randomness
function generateStockData(points, endPrice, volatility, isPositive, seed) {
  const data = [];
  const startMultiplier = isPositive ? 0.85 + (seed % 10) / 100 : 1.15 - (seed % 10) / 100;
  let value = endPrice * startMultiplier;
  const step = (endPrice - value) / points;
  
  // Simple seeded random
  let random = seed;
  const seededRandom = () => {
    random = (random * 9301 + 49297) % 233280;
    return random / 233280;
  };
  
  for (let i = 0; i < points; i++) {
    const noise = (seededRandom() - 0.5) * volatility;
    value += step + noise;
    data.push(Math.max(0.01, value));
  }
  
  // Ensure last value is the current price
  data[data.length - 1] = endPrice;
  
  return data;
}

// Setup chart time period controls
function setupDetailChartControls() {
  const overlay = document.getElementById('stockDetailOverlay');
  const buttons = overlay.querySelectorAll('.chart-controls .time-btn');
  
  // Reset all buttons and set first one active
  buttons.forEach((btn, index) => {
    btn.classList.toggle('active', index === 0);
    
    // Remove old listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });
  
  // Re-query after cloning
  const freshButtons = overlay.querySelectorAll('.chart-controls .time-btn');
  freshButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      freshButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (stockChart) {
        const period = btn.dataset.period;
        stockChart.switchPeriod(period);
      }
    });
  });
}

// Format volume numbers
function formatVolume(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Setup category tabs
function setupCategoryTabs() {
  const tabs = document.querySelectorAll('.cat-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all
      tabs.forEach(t => t.classList.remove('active'));
      
      // Add active to clicked
      tab.classList.add('active');
      
      // Update stocks
      currentCategory = tab.dataset.category;
      renderStocks(currentCategory);
    });
  });
}

// Setup sorting
function setupSorting() {
  const sortSelect = document.getElementById('sortBy');
  
  sortSelect.addEventListener('change', () => {
    const sortBy = sortSelect.value;
    const stocks = [...stockData[currentCategory]];
    
    switch (sortBy) {
      case 'name':
        stocks.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price':
        stocks.sort((a, b) => b.price - a.price);
        break;
      case 'change':
        stocks.sort((a, b) => b.change - a.change);
        break;
      case 'volume':
        stocks.sort((a, b) => b.volume - a.volume);
        break;
    }
    
    stockData[currentCategory] = stocks;
    renderStocks(currentCategory);
  });
}

// Populate scrolling market bar
function populateMarketBar() {
  const marketBar = document.getElementById('marketBarContent');
  if (!marketBar) return;
  
  // Collect all stocks from all categories
  const allStocks = [];
  Object.keys(stockData).forEach(category => {
    stockData[category].forEach(stock => {
      allStocks.push({ ...stock, category });
    });
  });
  
  // Shuffle for variety
  allStocks.sort(() => Math.random() - 0.5);
  
  // Take a subset for the bar
  const barStocks = allStocks.slice(0, 20);
  
  // Create HTML - duplicate for seamless loop
  const createItems = (stocks) => {
    return stocks.map(stock => {
      const isPositive = stock.change >= 0;
      const changeSign = isPositive ? '+' : '';
      const changeClass = isPositive ? 'positive' : 'negative';
      
      return `
        <div class="market-bar-item" data-ticker="${stock.ticker}" data-category="${stock.category}">
          <span class="ticker">${stock.ticker}</span>
          <span class="price">$${stock.price.toFixed(2)}</span>
          <span class="change ${changeClass}">${changeSign}${stock.change.toFixed(1)}%</span>
        </div>
      `;
    }).join('');
  };
  
  // Duplicate content for seamless scrolling
  marketBar.innerHTML = createItems(barStocks) + createItems(barStocks);
  
  // Add click handlers
  marketBar.querySelectorAll('.market-bar-item').forEach(item => {
    item.addEventListener('click', () => {
      const ticker = item.dataset.ticker;
      const category = item.dataset.category;
      
      // Switch to category if needed
      if (category !== currentCategory) {
        currentCategory = category;
        document.querySelectorAll('.cat-tab').forEach(tab => {
          tab.classList.toggle('active', tab.dataset.category === category);
        });
        renderStocks(category);
      }
      
      // Find and open the stock
      const stock = stockData[category].find(s => s.ticker === ticker);
      if (stock) {
        openStockDetail(stock);
      }
    });
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupCategoryTabs();
  setupSorting();
  setupToggles();
  renderStocks(currentCategory);
  populateMarketBar();
  updateMarketStats();
  
  // Setup back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', closeStockDetail);
  }
  
  // Update stats periodically
  setInterval(updateMarketStats, 30000);
});

// Setup toggle buttons
function setupToggles() {
  const toggleOverview = document.getElementById('toggleOverview');
  const toggleCharts = document.getElementById('toggleCharts');
  const toggleCompact = document.getElementById('toggleCompact');
  const viewer = document.querySelector('.stocks-view');
  const grid = document.getElementById('stocksGrid');
  
  if (toggleOverview) {
    toggleOverview.addEventListener('click', () => {
      toggleOverview.classList.toggle('active');
      showOverview = toggleOverview.classList.contains('active');
      viewer.classList.toggle('hide-overview', !showOverview);
    });
  }
  
  if (toggleCharts) {
    toggleCharts.addEventListener('click', () => {
      toggleCharts.classList.toggle('active');
      showCharts = toggleCharts.classList.contains('active');
      viewer.classList.toggle('hide-charts', !showCharts);
    });
  }
  
  if (toggleCompact) {
    toggleCompact.addEventListener('click', () => {
      toggleCompact.classList.toggle('active');
      compactView = toggleCompact.classList.contains('active');
      grid.classList.toggle('compact', compactView);
    });
  }
}

// Update market stats (simulated)
function updateMarketStats() {
  const playersEl = document.getElementById('playersOnline');
  const volumeEl = document.getElementById('totalVolume');
  
  if (playersEl) {
    // Random variation
    const basePlayers = 1247;
    const variation = Math.floor(Math.random() * 200) - 100;
    playersEl.textContent = (basePlayers + variation).toLocaleString();
  }
  
  if (volumeEl) {
    // Calculate total volume from all categories
    let total = 0;
    for (const category of Object.keys(stockData)) {
      total += stockData[category].reduce((sum, s) => sum + s.volume, 0);
    }
    volumeEl.textContent = formatVolume(total);
  }
}
