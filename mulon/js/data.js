// ========================================
// MULON - Firebase Data Management with Order Book
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    collection,
    updateDoc,
    query,
    where,
    orderBy,
    arrayUnion,
    increment
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
    getAuth,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAGcg43F94bWqUuyLH-AjghrAfduEVQ8ZM",
    authDomain: "overunder-ths.firebaseapp.com",
    projectId: "overunder-ths",
    storageBucket: "overunder-ths.firebasestorage.app",
    messagingSenderId: "690530120785",
    appId: "1:690530120785:web:36dc297cb517ac76cb7470",
    measurementId: "G-Q30T39R8VY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Firestore references
const marketsRef = collection(db, 'mulon');
const ordersRef = collection(db, 'mulon_orders');
const tradesRef = collection(db, 'mulon_trades');
const usersRef = collection(db, 'mulon_users');
const categoriesRef = collection(db, 'mulon_categories');
const suggestionsRef = collection(db, 'mulon_suggestions');
const ouUsersRef = collection(db, 'users'); // Over Under users collection

// ========================================
// OVER UNDER ACCOUNT SYNC
// ========================================
const OverUnderSync = {
  // Check if user has an Over Under account by email
  async checkForOverUnderAccount(email) {
    if (!email) return null;
    
    try {
      const q = query(ouUsersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        return {
          found: true,
          uid: userDoc.id,
          username: userData.username || null,
          name: userData.name || null,
          email: userData.email
        };
      }
      return { found: false };
    } catch (error) {
      console.error('Error checking Over Under account:', error);
      return { found: false, error: error.message };
    }
  },
  
  // Sync username from Over Under to Mulon
  async syncUsername(mulonUserId, overUnderUsername) {
    try {
      await updateDoc(doc(usersRef, mulonUserId), {
        displayName: overUnderUsername,
        overUnderSynced: true
      });
      return { success: true };
    } catch (error) {
      console.error('Error syncing username:', error);
      return { success: false, error: error.message };
    }
  }
};

// Make available globally
window.OverUnderSync = OverUnderSync;

// ========================================
// AUTHENTICATION
// ========================================
const Auth = {
  currentUser: null,
  authStateListeners: [],
  
  // Initialize auth state listener
  init() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isGuest: false
        };
        
        // Load or create user data from Firestore (pass user info for profile)
        await UserData.loadFromFirebase(user.uid, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
        
        console.log('User signed in:', user.displayName);
      } else {
        this.currentUser = null;
        UserData.data = null;
        UserData.userId = null;
        console.log('User signed out');
      }
      
      // Notify all listeners
      this.authStateListeners.forEach(listener => listener(this.currentUser));
    });
  },
  
  // Sign in with Google
  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Sign out
  async signOut() {
    try {
      await signOut(auth);
      this.currentUser = null;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Check if user is signed in
  isSignedIn() {
    return this.currentUser !== null && !this.currentUser.isGuest;
  },
  
  // Get current user
  getUser() {
    return this.currentUser;
  },
  
  // Add auth state change listener
  onAuthStateChange(listener) {
    this.authStateListeners.push(listener);
    // Immediately call with current state
    if (this.currentUser !== undefined) {
      listener(this.currentUser);
    }
  },
  
  // Continue as guest (for browsing only)
  setGuestMode() {
    this.currentUser = {
      uid: 'guest_' + Date.now(),
      displayName: 'Guest',
      isGuest: true
    };
    this.authStateListeners.forEach(listener => listener(this.currentUser));
  }
};

// Make Auth globally available
window.Auth = Auth;

// ========================================
// USER DATA (Firebase-backed)
// ========================================
const UserData = {
  data: null,
  userId: null,
  
  getDefault(userProfile = {}) {
    return {
      // User profile info
      email: userProfile.email || null,
      displayName: userProfile.displayName || null,
      photoURL: userProfile.photoURL || null,
      // Trading data
      balance: 500.00,
      positions: [],
      watchlist: [],
      transactions: [],
      cashOuts: [],
      // Metadata
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
  },
  
  // Load user data from Firebase
  async loadFromFirebase(userId, userProfile = {}) {
    this.userId = userId;
    try {
      const userDoc = await getDoc(doc(usersRef, userId));
      if (userDoc.exists()) {
        this.data = userDoc.data();
        // Update profile info and last login on each sign in
        this.data.email = userProfile.email || this.data.email;
        this.data.displayName = userProfile.displayName || this.data.displayName;
        this.data.photoURL = userProfile.photoURL || this.data.photoURL;
        this.data.lastLoginAt = new Date().toISOString();
        await this.save();
      } else {
        // Create new user document with profile info
        this.data = this.getDefault(userProfile);
        await setDoc(doc(usersRef, userId), this.data);
        console.log('Created new user document for:', userId);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.data = this.getDefault(userProfile);
    }
    return this.data;
  },
  
  // Save user data to Firebase
  async save() {
    if (!this.userId || !this.data) return;
    try {
      await setDoc(doc(usersRef, this.userId), this.data);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  },
  
  get() {
    return this.data || this.getDefault();
  },
  
  getBalance() {
    return this.get().balance;
  },
  
  // Update user profile (displayName, avatarStyle)
  async updateProfile(displayName, avatarStyle) {
    if (!this.data) return { success: false, error: 'Not signed in' };
    
    try {
      if (displayName !== undefined && displayName.trim() !== '') {
        this.data.displayName = displayName.trim();
      }
      if (avatarStyle !== undefined) {
        this.data.avatarStyle = avatarStyle;
      }
      await this.save();
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  },
  
  getAvatarStyle() {
    return this.get().avatarStyle || 'default';
  },
  
  getDisplayName() {
    return this.get().displayName || 'Anonymous';
  },

  async updateBalance(amount) {
    if (!this.data) return 0;
    this.data.balance = Math.round((this.data.balance + amount) * 100) / 100;
    await this.save();
    return this.data.balance;
  },
  
  async addPosition(marketId, marketTitle, choice, shares, costBasis, price) {
    if (!this.data) return [];
    
    const existingIndex = this.data.positions.findIndex(
      p => p.marketId === marketId && p.choice === choice
    );
    
    if (existingIndex !== -1) {
      const existing = this.data.positions[existingIndex];
      existing.shares += shares;
      existing.costBasis += costBasis;
      existing.avgPrice = Math.round((existing.costBasis / existing.shares) * 100) / 100;
    } else {
      this.data.positions.push({
        marketId,
        marketTitle,
        choice,
        shares,
        costBasis,
        avgPrice: price,
        purchaseDate: new Date().toISOString()
      });
    }
    
    // Add transaction record
    this.data.transactions = this.data.transactions || [];
    this.data.transactions.unshift({
      type: 'buy',
      marketId,
      choice,
      shares,
      price,
      cost: costBasis,
      timestamp: new Date().toISOString()
    });
    
    await this.save();
    return this.data.positions;
  },
  
  getPositions() {
    return this.get().positions || [];
  },
  
  // Reduce or remove a position when selling
  async sellPosition(marketId, choice, sharesToSell, saleAmount) {
    if (!this.data) return null;
    
    const positionIndex = this.data.positions.findIndex(
      p => p.marketId === marketId && p.choice === choice
    );
    
    if (positionIndex === -1) return null;
    
    const position = this.data.positions[positionIndex];
    
    // Calculate proportional cost basis for the sold shares
    const costBasisPerShare = position.costBasis / position.shares;
    const soldCostBasis = costBasisPerShare * sharesToSell;
    
    if (sharesToSell >= position.shares) {
      // Selling entire position - remove it
      this.data.positions.splice(positionIndex, 1);
    } else {
      // Partial sell - reduce shares and cost basis
      position.shares -= sharesToSell;
      position.costBasis -= soldCostBasis;
    }
    
    // Add transaction record
    this.data.transactions = this.data.transactions || [];
    this.data.transactions.unshift({
      type: 'sell',
      marketId,
      choice,
      shares: sharesToSell,
      price: Math.round((saleAmount / sharesToSell) * 100),
      proceeds: saleAmount,
      profit: saleAmount - soldCostBasis,
      timestamp: new Date().toISOString()
    });
    
    await this.save();
    return { soldCostBasis, profit: saleAmount - soldCostBasis };
  },
  
  // Get a specific position
  getPosition(marketId) {
    return this.getPositions().find(p => p.marketId === marketId) || null;
  },

  getWatchlist() {
    return this.get().watchlist || [];
  },
  
  getCashOuts() {
    return this.get().cashOuts || [];
  },

  async addToWatchlist(marketId) {
    if (!this.data) return [];
    if (!this.data.watchlist.includes(marketId)) {
      this.data.watchlist.push(marketId);
      await this.save();
    }
    return this.data.watchlist;
  },
  
  async removeFromWatchlist(marketId) {
    if (!this.data) return [];
    this.data.watchlist = this.data.watchlist.filter(id => id !== marketId);
    await this.save();
    return this.data.watchlist;
  },
  
  isWatchlisted(marketId) {
    return (this.get().watchlist || []).includes(marketId);
  },
  
  async reset() {
    this.data = this.getDefault();
    await this.save();
  }
};

// Make UserData globally available
window.UserData = UserData;

// ========================================
// ONBOARDING STATE
// ========================================
const OnboardingState = {
  STORAGE_KEY: 'mulon_onboarding',
  
  hasCompletedOnboarding() {
    return localStorage.getItem(this.STORAGE_KEY) === 'completed';
  },
  
  setCompleted() {
    localStorage.setItem(this.STORAGE_KEY, 'completed');
  },
  
  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};

// Make OnboardingState globally available
window.OnboardingState = OnboardingState;

// ========================================
// ORDER BOOK ENGINE
// ========================================
const OrderBook = {
  // Order book cache per market: { marketId: { yes: { bids: [], asks: [] }, no: { bids: [], asks: [] } } }
  books: {},
  
  // Initialize order book for a market from Firebase or create new
  async initBook(marketId) {
    if (!this.books[marketId]) {
      // Try to load from Firebase
      try {
        const orderBookDoc = await getDoc(doc(db, 'mulon_orderbooks', marketId));
        if (orderBookDoc.exists()) {
          this.books[marketId] = orderBookDoc.data();
        } else {
          this.books[marketId] = this.createEmptyBook();
          await this.saveOrderBook(marketId);
        }
      } catch (error) {
        console.warn('Could not load order book from Firebase:', error);
        this.books[marketId] = this.createEmptyBook();
      }
    }
    return this.books[marketId];
  },
  
  // Create empty order book structure
  createEmptyBook() {
    return {
      yes: { 
        bids: [],  // Buy orders: [{ price, quantity, timestamp, oderId }]
        asks: []   // Sell orders
      },
      no: { 
        bids: [], 
        asks: [] 
      },
      lastUpdated: new Date().toISOString(),
      totalOrders: 0,
      matchedOrders: 0
    };
  },
  
  // Save order book to Firebase
  async saveOrderBook(marketId) {
    try {
      const book = this.books[marketId];
      if (book) {
        book.lastUpdated = new Date().toISOString();
        await setDoc(doc(db, 'mulon_orderbooks', marketId), book);
      }
    } catch (error) {
      console.warn('Could not save order book to Firebase:', error);
    }
  },
  
  // Add a limit order to the book
  async addLimitOrder(marketId, side, choice, price, quantity, userId = 'anonymous') {
    const book = await this.initBook(marketId);
    
    const order = {
      orderId: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      price: Math.round(price),
      quantity: Math.round(quantity * 100) / 100,
      side,
      choice,
      userId,
      timestamp: new Date().toISOString(),
      status: 'open',
      filled: 0
    };
    
    // Add to appropriate side of the book
    const bookSide = book[choice];
    if (side === 'buy') {
      bookSide.bids.push(order);
      // Sort bids descending (highest first)
      bookSide.bids.sort((a, b) => b.price - a.price);
    } else {
      bookSide.asks.push(order);
      // Sort asks ascending (lowest first)
      bookSide.asks.sort((a, b) => a.price - b.price);
    }
    
    book.totalOrders++;
    
    // Save order to orders collection
    await this.saveOrder(order);
    
    // Save updated order book
    await this.saveOrderBook(marketId);
    
    // Try to match orders
    await this.matchOrders(marketId, choice);
    
    return order;
  },
  
  // Save individual order to orders collection
  async saveOrder(order) {
    try {
      await setDoc(doc(ordersRef, order.orderId), order);
    } catch (error) {
      console.warn('Could not save order to Firebase:', error);
    }
  },
  
  // Update order status
  async updateOrderStatus(orderId, updates) {
    try {
      await updateDoc(doc(ordersRef, orderId), updates);
    } catch (error) {
      console.warn('Could not update order:', error);
    }
  },
  
  // Match orders in the book
  async matchOrders(marketId, choice) {
    const book = await this.initBook(marketId);
    const bookSide = book[choice];
    
    // Match bids with asks
    while (bookSide.bids.length > 0 && bookSide.asks.length > 0) {
      const bestBid = bookSide.bids[0];
      const bestAsk = bookSide.asks[0];
      
      // Check if there's a match (bid >= ask)
      if (bestBid.price >= bestAsk.price) {
        const matchPrice = Math.round((bestBid.price + bestAsk.price) / 2);
        const matchQuantity = Math.min(
          bestBid.quantity - bestBid.filled,
          bestAsk.quantity - bestAsk.filled
        );
        
        // Record the matched trade
        const trade = {
          id: 'trade_' + Date.now(),
          marketId,
          choice,
          buyOrderId: bestBid.orderId,
          sellOrderId: bestAsk.orderId,
          price: matchPrice,
          quantity: matchQuantity,
          timestamp: new Date().toISOString()
        };
        
        await this.saveTrade(trade);
        
        // Update filled amounts
        bestBid.filled += matchQuantity;
        bestAsk.filled += matchQuantity;
        
        // Remove fully filled orders
        if (bestBid.filled >= bestBid.quantity) {
          bestBid.status = 'filled';
          bookSide.bids.shift();
          await this.updateOrderStatus(bestBid.orderId, { status: 'filled', filled: bestBid.filled });
        }
        if (bestAsk.filled >= bestAsk.quantity) {
          bestAsk.status = 'filled';
          bookSide.asks.shift();
          await this.updateOrderStatus(bestAsk.orderId, { status: 'filled', filled: bestAsk.filled });
        }
        
        book.matchedOrders++;
        
        // Update market price based on last trade
        await this.updateMarketPrice(marketId, choice, matchPrice);
      } else {
        break; // No more matches possible
      }
    }
    
    await this.saveOrderBook(marketId);
  },
  
  // Update market price after a trade
  async updateMarketPrice(marketId, choice, newPrice) {
    const market = MulonData.getMarket(marketId);
    if (!market) return;
    
    let updates;
    if (choice === 'yes') {
      updates = {
        yesPrice: newPrice,
        noPrice: 100 - newPrice
      };
    } else {
      updates = {
        noPrice: newPrice,
        yesPrice: 100 - newPrice
      };
    }
    
    await MulonData.updateMarket(marketId, updates);
  },
  
  // Execute a market order (immediate execution at best available price)
  // Returns: { filled: boolean, avgPrice: number, shares: number, cost: number }
  async executeMarketOrder(marketId, side, choice, dollarAmount, userId = 'anonymous') {
    await this.initBook(marketId);
    const market = MulonData.getMarket(marketId);
    if (!market) return { filled: false, error: 'Market not found' };
    
    // For prediction markets: buying YES is like selling NO and vice versa
    // Price of YES + Price of NO = 100 (always)
    
    const currentPrice = choice === 'yes' ? market.yesPrice : market.noPrice;
    const pricePerShare = currentPrice / 100; // Convert cents to dollars
    const shares = dollarAmount / pricePerShare;
    
    // Calculate price impact based on order size relative to liquidity
    // Larger orders move the price more
    const liquidity = market.volume || 1000;
    const impactFactor = Math.min(dollarAmount / liquidity, 0.15); // Max 15% impact per trade
    
    let newYesPrice, newNoPrice;
    
    if (side === 'buy') {
      if (choice === 'yes') {
        // Buying YES pushes YES price up
        newYesPrice = Math.min(99, Math.round(market.yesPrice + (impactFactor * 100)));
        newNoPrice = 100 - newYesPrice;
      } else {
        // Buying NO pushes NO price up (YES price down)
        newNoPrice = Math.min(99, Math.round(market.noPrice + (impactFactor * 100)));
        newYesPrice = 100 - newNoPrice;
      }
    } else {
      // Selling
      if (choice === 'yes') {
        // Selling YES pushes YES price down
        newYesPrice = Math.max(1, Math.round(market.yesPrice - (impactFactor * 100)));
        newNoPrice = 100 - newYesPrice;
      } else {
        // Selling NO pushes NO price down (YES price up)
        newNoPrice = Math.max(1, Math.round(market.noPrice - (impactFactor * 100)));
        newYesPrice = 100 - newNoPrice;
      }
    }
    
    // Update market with new prices and volume
    const updates = {
      yesPrice: newYesPrice,
      noPrice: newNoPrice,
      volume: (market.volume || 0) + Math.round(dollarAmount)
    };
    
    await MulonData.updateMarket(marketId, updates);
    
    // Record the trade
    const trade = {
      id: 'trade_' + Date.now(),
      marketId,
      side,
      choice,
      shares: Math.round(shares * 100) / 100,
      price: currentPrice,
      cost: dollarAmount,
      priceAfter: choice === 'yes' ? newYesPrice : newNoPrice,
      userId,
      orderType: 'market',
      timestamp: new Date().toISOString()
    };
    
    // Save trade and update order book
    await this.saveTrade(trade);
    await this.updateOrderBookFromTrade(marketId, trade);
    
    return {
      filled: true,
      shares: trade.shares,
      avgPrice: currentPrice,
      cost: dollarAmount,
      newPrice: choice === 'yes' ? newYesPrice : newNoPrice,
      priceChange: (choice === 'yes' ? newYesPrice : newNoPrice) - currentPrice
    };
  },
  
  // Update order book with trade info (for display purposes)
  async updateOrderBookFromTrade(marketId, trade) {
    const book = await this.initBook(marketId);
    
    // Add to recent trades in book
    if (!book.recentTrades) book.recentTrades = [];
    book.recentTrades.unshift({
      price: trade.price,
      shares: trade.shares,
      side: trade.side,
      timestamp: trade.timestamp
    });
    
    // Keep only last 50 trades in book
    if (book.recentTrades.length > 50) {
      book.recentTrades = book.recentTrades.slice(0, 50);
    }
    
    await this.saveOrderBook(marketId);
  },
  
  // Save trade to Firebase
  async saveTrade(trade) {
    try {
      await setDoc(doc(tradesRef, trade.id), trade);
    } catch (error) {
      console.warn('Could not save trade to Firebase:', error);
    }
  },
  
  // Get recent trades for a market
  async getRecentTrades(marketId, limit = 20) {
    try {
      const querySnapshot = await getDocs(tradesRef);
      const trades = [];
      querySnapshot.forEach((doc) => {
        const trade = doc.data();
        if (trade.marketId === marketId) {
          trades.push(trade);
        }
      });
      // Sort by timestamp descending
      trades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return trades.slice(0, limit);
    } catch (error) {
      console.warn('Could not fetch trades:', error);
      return [];
    }
  },
  
  // Get order book for a market
  async getOrderBook(marketId) {
    return await this.initBook(marketId);
  },
  
  // Get all open orders for a market
  async getOpenOrders(marketId) {
    const book = await this.initBook(marketId);
    return {
      yes: {
        bids: book.yes.bids.filter(o => o.status === 'open'),
        asks: book.yes.asks.filter(o => o.status === 'open')
      },
      no: {
        bids: book.no.bids.filter(o => o.status === 'open'),
        asks: book.no.asks.filter(o => o.status === 'open')
      }
    };
  },
  
  // Cancel an order
  async cancelOrder(marketId, orderId) {
    const book = await this.initBook(marketId);
    
    // Find and remove order from all sides
    for (const choice of ['yes', 'no']) {
      for (const side of ['bids', 'asks']) {
        const index = book[choice][side].findIndex(o => o.orderId === orderId);
        if (index !== -1) {
          book[choice][side][index].status = 'cancelled';
          book[choice][side].splice(index, 1);
          await this.updateOrderStatus(orderId, { status: 'cancelled' });
          await this.saveOrderBook(marketId);
          return true;
        }
      }
    }
    return false;
  },
  
  // Calculate implied probability from price
  getProbability(price) {
    return price; // Price in cents = probability in %
  },
  
  // Get best bid/ask spread
  async getSpread(marketId, choice) {
    const book = await this.initBook(marketId);
    const market = MulonData.getMarket(marketId);
    if (!market) return null;
    
    const bookSide = book[choice];
    const bestBid = bookSide.bids[0];
    const bestAsk = bookSide.asks[0];
    
    const currentPrice = choice === 'yes' ? market.yesPrice : market.noPrice;
    
    return {
      bid: bestBid ? bestBid.price : Math.max(1, currentPrice - 1),
      ask: bestAsk ? bestAsk.price : Math.min(99, currentPrice + 1),
      mid: currentPrice,
      bidQuantity: bestBid ? bestBid.quantity - bestBid.filled : 0,
      askQuantity: bestAsk ? bestAsk.quantity - bestAsk.filled : 0
    };
  },
  
  // Get order book depth (for visualization)
  async getDepth(marketId, choice, levels = 5) {
    const book = await this.initBook(marketId);
    const bookSide = book[choice];
    
    // Aggregate orders at each price level
    const aggregateLevels = (orders) => {
      const levels = {};
      orders.forEach(order => {
        if (!levels[order.price]) {
          levels[order.price] = 0;
        }
        levels[order.price] += order.quantity - order.filled;
      });
      return Object.entries(levels).map(([price, quantity]) => ({
        price: parseInt(price),
        quantity
      }));
    };
    
    return {
      bids: aggregateLevels(bookSide.bids).slice(0, levels),
      asks: aggregateLevels(bookSide.asks).slice(0, levels)
    };
  }
};

// Make OrderBook globally available
window.OrderBook = OrderBook;

const MulonData = {
  STORAGE_KEY: 'mulon_markets',
  isInitialized: false,
  cachedMarkets: [],
  
  // Default markets to populate on first load
  defaultMarkets: [
    {
      id: 'market_1',
      title: 'When will Torre grade the next exam?',
      subtitle: 'Will Mr. Torre post grades before February 1st?',
      category: 'grading',
      categoryIcon: '📝',
      categoryLabel: 'Grading',
      yesPrice: 69,
      noPrice: 31,
      volume: 2400,
      startDate: '2026-01-15',
      endDate: '2026-02-01',
      status: 'active',
      featured: true,
      createdAt: '2026-01-15T10:00:00Z',
      totalShares: { yes: 2400, no: 1100 },
      orderBookId: 'market_1'  // Reference to order book collection
    },
    {
      id: 'market_2',
      title: 'Will the basketball team win Friday\'s game?',
      subtitle: 'Tech High vs Central High',
      category: 'sports',
      categoryIcon: '⚽',
      categoryLabel: 'Sports',
      yesPrice: 45,
      noPrice: 55,
      volume: 1200,
      startDate: '2026-01-20',
      endDate: '2026-01-24',
      status: 'active',
      featured: false,
      createdAt: '2026-01-20T09:00:00Z',
      totalShares: { yes: 540, no: 660 },
      orderBookId: 'market_2'
    },
    {
      id: 'market_3',
      title: 'Will the cafeteria serve pizza on Monday?',
      subtitle: 'Weekly menu prediction',
      category: 'school',
      categoryIcon: '🎓',
      categoryLabel: 'Tech High',
      yesPrice: 82,
      noPrice: 18,
      volume: 850,
      startDate: '2026-01-21',
      endDate: '2026-01-27',
      status: 'active',
      featured: false,
      createdAt: '2026-01-21T08:00:00Z',
      totalShares: { yes: 697, no: 153 },
      orderBookId: 'market_3'
    },
    {
      id: 'market_4',
      title: 'Will student council approve the new club?',
      subtitle: 'Gaming Club proposal vote',
      category: 'politics',
      categoryIcon: '🏛️',
      categoryLabel: 'Politics',
      yesPrice: 58,
      noPrice: 42,
      volume: 640,
      startDate: '2026-01-18',
      endDate: '2026-02-01',
      status: 'active',
      featured: false,
      createdAt: '2026-01-18T14:00:00Z',
      totalShares: { yes: 371, no: 269 },
      orderBookId: 'market_4'
    },
    {
      id: 'market_5',
      title: 'Will class average exceed 85% on final?',
      subtitle: 'AP Chemistry final exam',
      category: 'grading',
      categoryIcon: '📝',
      categoryLabel: 'Grading',
      yesPrice: 34,
      noPrice: 66,
      volume: 920,
      startDate: '2026-01-10',
      endDate: '2026-02-15',
      status: 'active',
      featured: false,
      createdAt: '2026-01-10T11:00:00Z',
      totalShares: { yes: 313, no: 607 },
      orderBookId: 'market_5'
    }
  ],

  // Category configuration (loaded from Firebase)
  categories: {},
  
  // Default categories (used if Firebase is empty)
  defaultCategories: {
    school: { icon: '🎓', label: 'Tech High', color: 'school' },
    sports: { icon: '⚽', label: 'Sports', color: 'sports' },
    politics: { icon: '🏛️', label: 'Politics', color: 'politics' },
    grading: { icon: '📝', label: 'Grading', color: 'grading' }
  },
  
  // Fetch categories from Firebase
  async fetchCategories() {
    try {
      const querySnapshot = await getDocs(categoriesRef);
      const categories = {};
      querySnapshot.forEach((doc) => {
        categories[doc.id] = doc.data();
      });
      
      // If no categories in Firebase, initialize with defaults
      if (Object.keys(categories).length === 0) {
        console.log('No categories in Firebase, initializing with defaults...');
        await this.initializeCategoriesWithDefaults();
        this.categories = { ...this.defaultCategories };
      } else {
        this.categories = categories;
      }
      
      return this.categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      this.categories = { ...this.defaultCategories };
      return this.categories;
    }
  },
  
  // Initialize Firebase with default categories
  async initializeCategoriesWithDefaults() {
    try {
      for (const [id, category] of Object.entries(this.defaultCategories)) {
        await setDoc(doc(categoriesRef, id), category);
      }
      console.log('Categories initialized in Firebase');
    } catch (error) {
      console.error('Error initializing categories:', error);
    }
  },
  
  // Add a new category
  async addCategory(id, icon, label, color) {
    try {
      const categoryData = { icon, label, color: color || id };
      await setDoc(doc(categoriesRef, id), categoryData);
      this.categories[id] = categoryData;
      console.log('Category added:', id);
      return { success: true, category: categoryData };
    } catch (error) {
      console.error('Error adding category:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Update a category
  async updateCategory(id, updates) {
    try {
      await updateDoc(doc(categoriesRef, id), updates);
      this.categories[id] = { ...this.categories[id], ...updates };
      console.log('Category updated:', id);
      return { success: true };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Delete a category
  async deleteCategory(id) {
    try {
      await deleteDoc(doc(categoriesRef, id));
      delete this.categories[id];
      console.log('Category deleted:', id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get all categories
  getCategories() {
    return this.categories;
  },
  
  // Get a single category
  getCategory(id) {
    return this.categories[id] || { icon: '📊', label: 'Other', color: 'other' };
  },
  
  // ========================================
  // SUGGESTIONS
  // ========================================
  
  // Submit a market suggestion
  async submitSuggestion(title, category, reason, userId, userEmail, userName) {
    try {
      const suggestionId = 'sug_' + Date.now();
      const suggestion = {
        id: suggestionId,
        title: title,
        category: category || null,
        reason: reason || '',
        userId: userId || null,
        userEmail: userEmail || 'Anonymous',
        userName: userName || 'Anonymous',
        status: 'pending', // pending, approved, rejected
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(suggestionsRef, suggestionId), suggestion);
      console.log('Suggestion submitted:', suggestionId);
      return { success: true, id: suggestionId };
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get all suggestions (for admin)
  async getSuggestions() {
    try {
      const querySnapshot = await getDocs(suggestionsRef);
      const suggestions = [];
      querySnapshot.forEach((doc) => {
        suggestions.push({ id: doc.id, ...doc.data() });
      });
      // Sort by date, newest first
      suggestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return suggestions;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  },
  
  // Update suggestion status
  async updateSuggestionStatus(suggestionId, status) {
    try {
      await updateDoc(doc(suggestionsRef, suggestionId), { status });
      return { success: true };
    } catch (error) {
      console.error('Error updating suggestion:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Delete a suggestion
  async deleteSuggestion(suggestionId) {
    try {
      await deleteDoc(doc(suggestionsRef, suggestionId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      return { success: false, error: error.message };
    }
  },

  // Initialize data - load from Firebase
  async init() {
    if (this.isInitialized) {
      return this.cachedMarkets;
    }
    
    try {
      // Load categories first
      await this.fetchCategories();
      
      const markets = await this.fetchMarketsFromFirebase();
      
      // If no markets in Firebase, initialize with defaults
      if (markets.length === 0) {
        console.log('No markets in Firebase, initializing with defaults...');
        await this.initializeFirebaseWithDefaults();
        this.cachedMarkets = this.defaultMarkets;
      } else {
        this.cachedMarkets = markets;
      }
      
      this.isInitialized = true;
      return this.cachedMarkets;
    } catch (error) {
      console.error('Error initializing MulonData:', error);
      // Fallback to defaults if Firebase fails
      this.cachedMarkets = this.defaultMarkets;
      return this.cachedMarkets;
    }
  },

  // Fetch all markets from Firebase
  async fetchMarketsFromFirebase() {
    try {
      const querySnapshot = await getDocs(marketsRef);
      const markets = [];
      querySnapshot.forEach((doc) => {
        markets.push({ id: doc.id, ...doc.data() });
      });
      return markets;
    } catch (error) {
      console.error('Error fetching markets from Firebase:', error);
      return [];
    }
  },

  // Initialize Firebase with default markets
  async initializeFirebaseWithDefaults() {
    try {
      for (const market of this.defaultMarkets) {
        await setDoc(doc(marketsRef, market.id), market);
      }
      console.log('Firebase initialized with default markets');
    } catch (error) {
      console.error('Error initializing Firebase with defaults:', error);
    }
  },

  // Transfer localStorage data to Firebase (one-time migration)
  async transferFromLocalStorage() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      console.log('No localStorage data to transfer');
      return false;
    }
    
    try {
      const markets = JSON.parse(stored);
      console.log(`Transferring ${markets.length} markets to Firebase...`);
      
      for (const market of markets) {
        await setDoc(doc(marketsRef, market.id), market);
        console.log(`Transferred: ${market.title}`);
      }
      
      console.log('Transfer complete!');
      // Clear localStorage after successful transfer
      // localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error transferring to Firebase:', error);
      return false;
    }
  },

  // Get all markets (from cache, refreshes from Firebase)
  async getMarkets() {
    if (!this.isInitialized) {
      await this.init();
    }
    return this.cachedMarkets;
  },

  // Get markets synchronously (uses cache)
  getMarketsSync() {
    return this.cachedMarkets;
  },

  // Refresh cache from Firebase
  async refreshMarkets() {
    this.cachedMarkets = await this.fetchMarketsFromFirebase();
    return this.cachedMarkets;
  },

  // Add a new market
  async addMarket(market) {
    const newMarket = {
      id: 'market_' + Date.now(),
      ...market,
      createdAt: new Date().toISOString(),
      status: 'active',
      totalShares: { yes: 0, no: 0 },
      orderBookId: 'market_' + Date.now()
    };
    
    try {
      await setDoc(doc(marketsRef, newMarket.id), newMarket);
      
      // Initialize empty order book for this market
      await OrderBook.initBook(newMarket.id);
      
      this.cachedMarkets.push(newMarket);
      console.log('Market added:', newMarket.title);
      return newMarket;
    } catch (error) {
      console.error('Error adding market:', error);
      return null;
    }
  },

  // Update a market
  async updateMarket(id, updates) {
    try {
      const marketRef = doc(marketsRef, id);
      await updateDoc(marketRef, updates);
      
      // Update cache
      const index = this.cachedMarkets.findIndex(m => m.id === id);
      if (index !== -1) {
        this.cachedMarkets[index] = { ...this.cachedMarkets[index], ...updates };
      }
      
      console.log('Market updated:', id);
      return this.cachedMarkets[index];
    } catch (error) {
      console.error('Error updating market:', error);
      return null;
    }
  },

  // Resolve a market and pay out winners
  async resolveMarket(marketId, outcome) {
    try {
      const market = this.getMarket(marketId);
      if (!market) {
        return { success: false, error: 'Market not found' };
      }
      
      if (market.resolved) {
        return { success: false, error: 'Market already resolved' };
      }
      
      // Get all users and find positions in this market
      const usersSnapshot = await getDocs(usersRef);
      let payoutCount = 0;
      const cashOuts = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const positions = userData.positions || [];
        
        // Find positions for this market
        const marketPositions = positions.filter(p => p.marketId === marketId);
        
        if (marketPositions.length > 0) {
          let totalPayout = 0;
          const newPositions = positions.filter(p => p.marketId !== marketId);
          const resolvedPositions = [];
          
          for (const pos of marketPositions) {
            const won = pos.choice === outcome;
            const payout = won ? pos.shares : 0; // Each share pays $1 if correct
            
            resolvedPositions.push({
              marketId: marketId,
              marketTitle: market.title,
              position: pos.choice,
              shares: pos.shares,
              avgPrice: pos.avgPrice || Math.round((pos.costBasis / pos.shares) * 100) / 100,
              cost: pos.costBasis,
              outcome: outcome,
              won: won,
              payout: payout,
              timestamp: new Date().toISOString()
            });
            
            if (won) {
              totalPayout += payout;
              payoutCount++;
            }
          }
          
          // Update user: remove positions, add payout to balance, add to cashOuts
          const userCashOuts = userData.cashOuts || [];
          const newBalance = (userData.balance || 0) + totalPayout;
          
          await updateDoc(doc(usersRef, userDoc.id), {
            positions: newPositions,
            balance: Math.round(newBalance * 100) / 100,
            cashOuts: [...userCashOuts, ...resolvedPositions]
          });
          
          cashOuts.push(...resolvedPositions);
        }
      }
      
      // Mark market as resolved
      await this.updateMarket(marketId, {
        resolved: true,
        resolvedOutcome: outcome,
        resolvedAt: new Date().toISOString()
      });
      
      console.log(`Market ${marketId} resolved as ${outcome}. ${payoutCount} winning positions paid out.`);
      
      return { 
        success: true, 
        payoutCount: payoutCount,
        cashOuts: cashOuts
      };
    } catch (error) {
      console.error('Error resolving market:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete a market
  async deleteMarket(id) {
    try {
      await deleteDoc(doc(marketsRef, id));
      this.cachedMarkets = this.cachedMarkets.filter(m => m.id !== id);
      console.log('Market deleted:', id);
      return this.cachedMarkets;
    } catch (error) {
      console.error('Error deleting market:', error);
      return this.cachedMarkets;
    }
  },

  // Get market by ID
  getMarket(id) {
    return this.cachedMarkets.find(m => m.id === id);
  },

  // Get market by ID from Firebase
  async getMarketFromFirebase(id) {
    try {
      const marketDoc = await getDoc(doc(marketsRef, id));
      if (marketDoc.exists()) {
        return { id: marketDoc.id, ...marketDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching market:', error);
      return null;
    }
  },

  // Get markets by category
  getMarketsByCategory(category) {
    if (category === 'all') return this.cachedMarkets;
    return this.cachedMarkets.filter(m => m.category === category);
  },

  // Get featured markets
  getFeaturedMarkets() {
    return this.cachedMarkets.filter(m => m.featured);
  },

  // Get active markets
  getActiveMarkets() {
    return this.cachedMarkets.filter(m => m.status === 'active');
  },

  // Format volume for display
  formatVolume(volume) {
    if (volume >= 1000) {
      return '$' + (volume / 1000).toFixed(1) + 'k Vol.';
    }
    return '$' + volume + ' Vol.';
  },

  // Format date for display
  formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  },

  // Calculate days until end
  getDaysUntil(endDate) {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Ended';
    if (diff === 1) return 'Ends tomorrow';
    return `Ends in ${diff} days`;
  },

  // Reset to default markets in Firebase
  async resetToDefaults() {
    try {
      // Delete all existing markets
      const querySnapshot = await getDocs(marketsRef);
      const deletePromises = [];
      querySnapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(marketsRef, document.id)));
      });
      await Promise.all(deletePromises);
      
      // Add default markets
      await this.initializeFirebaseWithDefaults();
      this.cachedMarkets = [...this.defaultMarkets];
      
      console.log('Reset to defaults complete');
      return this.cachedMarkets;
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      return this.cachedMarkets;
    }
  },

  // Get all trades for a market with user information (for admin)
  async getMarketTradesWithUsers(marketId) {
    try {
      // Get all trades for this market
      const tradesSnapshot = await getDocs(tradesRef);
      const trades = [];
      const userIds = new Set();
      
      tradesSnapshot.forEach((document) => {
        const trade = document.data();
        if (trade.marketId === marketId) {
          trades.push(trade);
          if (trade.userId) {
            userIds.add(trade.userId);
          }
        }
      });
      
      // Sort by timestamp descending
      trades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Fetch user info for all unique users
      const usersMap = {};
      for (const userId of userIds) {
        try {
          const userDoc = await getDoc(doc(usersRef, userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            usersMap[userId] = {
              displayName: userData.displayName || 'Anonymous',
              email: userData.email || 'Unknown',
              photoURL: userData.photoURL || null
            };
          } else {
            usersMap[userId] = {
              displayName: 'Unknown User',
              email: 'N/A',
              photoURL: null
            };
          }
        } catch (err) {
          usersMap[userId] = {
            displayName: 'Unknown User',
            email: 'N/A',
            photoURL: null
          };
        }
      }
      
      // Attach user info to each trade
      const tradesWithUsers = trades.map(trade => ({
        ...trade,
        user: usersMap[trade.userId] || { displayName: 'Guest', email: 'N/A', photoURL: null }
      }));
      
      return tradesWithUsers;
    } catch (error) {
      console.error('Error fetching market trades with users:', error);
      return [];
    }
  },

  // Get all positions for a market (who currently holds what)
  async getMarketPositions(marketId) {
    try {
      const usersSnapshot = await getDocs(usersRef);
      const positions = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userPositions = userData.positions || [];
        
        const marketPos = userPositions.find(p => p.marketId === marketId);
        if (marketPos) {
          positions.push({
            userId: userDoc.id,
            displayName: userData.displayName || 'Anonymous',
            email: userData.email || 'Unknown',
            photoURL: userData.photoURL || null,
            ...marketPos
          });
        }
      }
      
      // Sort by shares descending
      positions.sort((a, b) => b.shares - a.shares);
      return positions;
    } catch (error) {
      console.error('Error fetching market positions:', error);
      return [];
    }
  }
};

// Make MulonData globally available
window.MulonData = MulonData;

// Export for ES modules
export { MulonData, OrderBook, Auth, UserData, OnboardingState, OverUnderSync, db, auth, marketsRef, categoriesRef, suggestionsRef };
