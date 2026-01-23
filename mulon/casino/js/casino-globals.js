// ========================================
// CASINO GLOBALS - Shared utilities
// ========================================

// Profit/Loss Graph Component
const ProfitGraph = {
  canvas: null,
  ctx: null,
  data: [],
  maxPoints: 30,
  container: null,
  valueEl: null,
  _resizeRaf: 0,
  
  // Initialize the graph
  init() {
    this.container = document.getElementById('profitGraphContainer') || document.querySelector('.profit-graph-container');
    this.canvas = document.getElementById('profitGraphCanvas');
    this.valueEl = document.getElementById('profitGraphValue');

    if (!this.container || !this.canvas) return;

    this.ctx = this.canvas.getContext('2d');

    this.resizeCanvasToCssPixels();
    this.render();
    this.updateValue();

    window.addEventListener('resize', () => {
      if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
      this._resizeRaf = requestAnimationFrame(() => {
        this.resizeCanvasToCssPixels();
        this.render();
      });
    });
  },

  resizeCanvasToCssPixels() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const pxW = Math.round(cssW * dpr);
    const pxH = Math.round(cssH * dpr);
    if (this.canvas.width !== pxW) this.canvas.width = pxW;
    if (this.canvas.height !== pxH) this.canvas.height = pxH;
    if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },
  
  // Add a data point (profit/loss from a single game)
  addPoint(profit) {
    // Running total
    const lastTotal = this.data.length > 0 ? this.data[this.data.length - 1] : 0;
    this.data.push(lastTotal + profit);
    
    // Keep only last N points
    if (this.data.length > this.maxPoints) {
      this.data.shift();
    }
    
    this.render();
    this.updateValue();
  },
  
  // Update the displayed value
  updateValue() {
    const valueEl = this.valueEl || document.getElementById('profitGraphValue');
    if (valueEl && this.data.length > 0) {
      const current = this.data[this.data.length - 1];
      valueEl.textContent = (current >= 0 ? '+' : '') + '$' + current.toFixed(2);
      valueEl.className = 'profit-graph-value ' + (current >= 0 ? 'positive' : 'negative');
    }
  },
  
  // Render the graph
  render() {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;
    const w = Math.round(this.canvas.getBoundingClientRect().width);
    const h = Math.round(this.canvas.getBoundingClientRect().height);
    
    // Clear
    ctx.clearRect(0, 0, w, h);
    
    // Background
    ctx.fillStyle = '#0f1419';
    ctx.fillRect(0, 0, w, h);
    
    // Draw zero line (middle)
    const midY = h / 2;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // If no data, draw empty state
    if (this.data.length < 2) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Play to see graph', w / 2, h / 2 + 4);
      return;
    }
    
    // Find min/max for scaling
    const maxVal = Math.max(...this.data.map(Math.abs), 10);
    const scale = (h / 2 - 10) / maxVal;
    
    // Draw filled area
    const pointSpacing = w / (this.maxPoints - 1);
    
    // Positive fill (green)
    ctx.beginPath();
    ctx.moveTo(0, midY);
    this.data.forEach((val, i) => {
      const x = i * pointSpacing;
      const y = midY - Math.max(0, val) * scale;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo((this.data.length - 1) * pointSpacing, midY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.fill();
    
    // Negative fill (red)
    ctx.beginPath();
    ctx.moveTo(0, midY);
    this.data.forEach((val, i) => {
      const x = i * pointSpacing;
      const y = midY - Math.min(0, val) * scale;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo((this.data.length - 1) * pointSpacing, midY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.fill();
    
    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = this.data[this.data.length - 1] >= 0 ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    this.data.forEach((val, i) => {
      const x = i * pointSpacing;
      const y = midY - val * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Draw current point
    const lastX = (this.data.length - 1) * pointSpacing;
    const lastY = midY - this.data[this.data.length - 1] * scale;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = this.data[this.data.length - 1] >= 0 ? '#22c55e' : '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },
  
  // Reset the graph
  reset() {
    this.data = [];
    this.render();
    this.updateValue();
  }
};

// Export for use
window.ProfitGraph = ProfitGraph;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ProfitGraph.init());
} else {
  ProfitGraph.init();
}
