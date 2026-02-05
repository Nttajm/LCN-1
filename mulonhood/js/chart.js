class StockChart {
  constructor(canvasId, valueElementSelector, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error('Canvas not found:', canvasId);
      return;
    }
    this.ctx = this.canvas.getContext('2d');
    this.valueElement = document.querySelector(valueElementSelector);
    this.options = options;
    this.currentPeriod = '1h';
    this.points = [];
    this.lastHoveredValue = null;
    this.animator = null;
    this.skipGlobalListeners = options.skipGlobalListeners || false;
    
    // Colors
    this.positiveColor = '#00e676';
    this.negativeColor = '#ff5252';
    this.currentColor = this.positiveColor;
    
    // Set canvas size for crisp rendering
    this.setCanvasSize();
    
    // Sample data for different time periods
    this.data = options.data || {
      '1h': this.generateData(60, 12345.67, 0.5),
      '1d': this.generateData(24, 12345.67, 2),
      '3d': this.generateData(72, 12345.67, 5),
      '1w': this.generateData(168, 12345.67, 8),
      '1m': this.generateData(720, 12345.67, 15)
    };
    
    // Initialize animator for value element
    this.initAnimator();
    
    if (!this.skipGlobalListeners) {
      this.setupEventListeners();
    }
    this.setupHoverEvents();
    this.drawAnimated(); // Use animated draw on initial load
    
    // Set initial value to the last data point
    this.updateDisplayValue(this.getCurrentValue());
  }
  
  initAnimator() {
    if (this.valueElement && window.DialUpAnimator) {
      this.animator = new DialUpAnimator(this.valueElement, {
        prefix: '$',
        decimals: 2,
        duration: 150,
        digitHeight: this.options.digitHeight || 3
      });
      this.animator.currentValue = this.getCurrentValue();
      this.animator.createOdometer(this.getCurrentValue());
    }
  }
  
  isPositiveChange() {
    const data = this.data[this.currentPeriod];
    return data[data.length - 1] >= data[0];
  }
  
  getChartColor() {
    return this.isPositiveChange() ? this.positiveColor : this.negativeColor;
  }
  
  getCurrentValue() {
    const data = this.data[this.currentPeriod];
    return data[data.length - 1];
  }
  
  getStartValue() {
    const data = this.data[this.currentPeriod];
    return data[0];
  }
  
  updateDisplayValue(value) {
    if (this.animator && this.lastHoveredValue !== value) {
      this.animator.animateTo(value);
      this.lastHoveredValue = value;
    }
  }
  
  setCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * 2;
    this.canvas.height = rect.height * 2;
    this.ctx.scale(2, 2);
    this.width = rect.width;
    this.height = rect.height;
  }
  
  generateData(points, baseValue, volatility) {
    const data = [];
    let value = baseValue;
    
    for (let i = 0; i < points; i++) {
      // Add some random variation
      const change = (Math.random() - 0.5) * volatility;
      value += change;
      data.push(value);
    }
    
    return data;
  }
  
  setupHoverEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      this.handleHover(x, y);
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      // Reset to current (last) value when leaving chart
      this.updateDisplayValue(this.getCurrentValue());
      this.draw();
    });
  }
  
  handleHover(x, y) {
    const paddingLeft = 20;
    const paddingRight = 60;
    const chartWidth = this.width - paddingLeft - paddingRight;
    
    if (x >= paddingLeft && x <= this.width - paddingRight) {
      // Calculate which data point we're closest to
      const relativeX = x - paddingLeft;
      const dataIndex = Math.round((relativeX / chartWidth) * (this.points.length - 1));
      
      if (dataIndex >= 0 && dataIndex < this.points.length) {
        const point = this.points[dataIndex];
        const value = this.data[this.currentPeriod][dataIndex];
        
        // Update value with animation
        this.updateDisplayValue(value);
        
        // Redraw with hover indicator
        this.draw();
        this.drawHoverIndicator(point.x, point.y);
      }
    } else {
      this.updateDisplayValue(this.getCurrentValue());
      this.draw();
    }
  }
  
  drawHoverIndicator(x, y) {
    const paddingTop = 20;
    const paddingBottom = 40;
    const color = this.getChartColor();
    
    // Draw vertical line
    this.ctx.strokeStyle = '#555555';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(x, paddingTop);
    this.ctx.lineTo(x, this.height - paddingBottom);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    // Draw point indicator
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = '#0a0a0a';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
  }
  
  setupEventListeners() {
    const buttons = document.querySelectorAll('.time-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Remove active class from all buttons
        buttons.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        e.target.classList.add('active');
        
        // Update chart
        this.switchPeriod(e.target.dataset.period);
      });
    });
  }
  
  switchPeriod(period) {
    this.currentPeriod = period;
    this.drawAnimated(); // Animate when switching periods
    
    // Update value to new period's current value
    this.updateDisplayValue(this.getCurrentValue());
  }
  
  // Easing function - easeOutQuart for smooth deceleration
  easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }
  
  // Animated draw - reveals chart from left to right
  drawAnimated(duration = 700) {
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = this.easeOutQuart(progress);
      
      this.draw(easedProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  draw(revealProgress = 1) {
    const data = this.data[this.currentPeriod];
    const paddingLeft = 20;
    const paddingRight = 60;
    const paddingTop = 20;
    const paddingBottom = 40;
    const chartWidth = this.width - paddingLeft - paddingRight;
    const chartHeight = this.height - paddingTop - paddingBottom;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Find min and max values for scaling
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const valueRange = maxValue - minValue;
    
    // Draw Y-axis labels (money) - on the right
    this.ctx.fillStyle = '#666666';
    this.ctx.font = '0.75rem system-ui';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    
    const yIntervals = 5;
    for (let i = 0; i <= yIntervals; i++) {
      const value = maxValue - (valueRange * i / yIntervals);
      const y = paddingTop + (chartHeight * i / yIntervals);
      
      // Draw grid line
      this.ctx.strokeStyle = '#1a1a1a';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(paddingLeft, y);
      this.ctx.lineTo(this.width - paddingRight, y);
      this.ctx.stroke();
      
      // Draw label on right side
      this.ctx.fillStyle = '#666666';
      this.ctx.fillText('$' + value.toFixed(0), this.width - paddingRight + 8, y);
    }
    
    // Draw X-axis labels (time)
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    
    const timeLabels = this.getTimeLabels();
    const xIntervals = timeLabels.length - 1;
    for (let i = 0; i <= xIntervals; i++) {
      const x = paddingLeft + (chartWidth * i / xIntervals);
      
      // Draw grid line
      this.ctx.strokeStyle = '#1a1a1a';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(x, paddingTop);
      this.ctx.lineTo(x, paddingTop + chartHeight);
      this.ctx.stroke();
      
      // Draw label
      this.ctx.fillStyle = '#666666';
      this.ctx.fillText(timeLabels[i], x, paddingTop + chartHeight + 8);
    }
    
    // Create points
    const points = data.map((value, index) => {
      const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
      const y = paddingTop + ((maxValue - value) / valueRange) * chartHeight;
      return { x, y };
    });
    
    // Store points for hover detection
    this.points = points;
    
    // Calculate how many points to reveal based on progress
    const revealEndX = paddingLeft + (chartWidth * revealProgress);
    const visiblePointCount = Math.ceil(points.length * revealProgress);
    const visiblePoints = points.slice(0, visiblePointCount);
    
    // If we're mid-animation, interpolate the last visible point
    if (revealProgress < 1 && visiblePointCount > 0 && visiblePointCount < points.length) {
      const lastIdx = visiblePointCount - 1;
      const nextIdx = Math.min(visiblePointCount, points.length - 1);
      const segmentProgress = (revealProgress * points.length) % 1;
      
      if (segmentProgress > 0 && points[nextIdx]) {
        const interpX = points[lastIdx].x + (points[nextIdx].x - points[lastIdx].x) * segmentProgress;
        const interpY = points[lastIdx].y + (points[nextIdx].y - points[lastIdx].y) * segmentProgress;
        visiblePoints[visiblePoints.length - 1] = { x: interpX, y: interpY };
      }
    }
    
    // Determine color based on start vs end value
    const color = this.getChartColor();
    
    // Draw the line (only visible portion)
    if (visiblePoints.length > 0) {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      this.ctx.beginPath();
      this.ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
      
      for (let i = 1; i < visiblePoints.length; i++) {
        this.ctx.lineTo(visiblePoints[i].x, visiblePoints[i].y);
      }
      
      this.ctx.stroke();
      
      // Draw gradient fill under the line
      const gradient = this.ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
      if (this.isPositiveChange()) {
        gradient.addColorStop(0, 'rgba(0, 230, 118, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 230, 118, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(255, 82, 82, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 82, 82, 0)');
      }
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
      
      for (let i = 1; i < visiblePoints.length; i++) {
        this.ctx.lineTo(visiblePoints[i].x, visiblePoints[i].y);
      }
      
      this.ctx.lineTo(visiblePoints[visiblePoints.length - 1].x, paddingTop + chartHeight);
      this.ctx.lineTo(visiblePoints[0].x, paddingTop + chartHeight);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }
  
  getTimeLabels() {
    switch (this.currentPeriod) {
      case '1h':
        return ['60m', '45m', '30m', '15m', 'Now'];
      case '1d':
        return ['9AM', '12PM', '3PM', '6PM', 'Now'];
      case '3d':
        return ['3d ago', '2d ago', '1d ago', 'Today'];
      case '1w':
        return ['Mon', 'Wed', 'Fri', 'Sun', 'Now'];
      case '1m':
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Now'];
      default:
        return ['Start', 'End'];
    }
  }
}

// Make StockChart available globally
window.StockChart = StockChart;

// Initialize chart when DOM is loaded (only on portfolio page)
document.addEventListener('DOMContentLoaded', () => {
  // Only create portfolio chart if the canvas exists
  const portfolioCanvas = document.getElementById('portfolioChart');
  if (portfolioCanvas) {
    window.portfolioChart = new StockChart('portfolioChart', '.value-ffm');
  }
});