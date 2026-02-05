class DialUpAnimator {
  constructor(element, options = {}) {
    this.element = element;
    this.duration = options.duration || 1500;
    this.prefix = options.prefix || '';
    this.suffix = options.suffix || '';
    this.decimals = options.decimals || 2;
    this.currentValue = 0;
    this.digitHeight = options.digitHeight || 3; // rem - configurable
    
    this.element.classList.add('odometer');
  }
  
  formatNumber(value) {
    return value.toFixed(this.decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  
  // Pad number string to ensure consistent digit count
  getDigitsArray(value, targetLength = null) {
    const formatted = this.formatNumber(value);
    const fullStr = this.prefix + formatted + this.suffix;
    const digits = [];
    
    for (let i = 0; i < fullStr.length; i++) {
      const char = fullStr[i];
      if (/\d/.test(char)) {
        digits.push(parseInt(char));
      }
    }
    
    // Pad with leading zeros if needed
    if (targetLength && digits.length < targetLength) {
      const padding = new Array(targetLength - digits.length).fill(0);
      return [...padding, ...digits];
    }
    
    return digits;
  }
  
  animate(fromValue, toValue) {
    // Get digit arrays
    const startDigits = this.getDigitsArray(fromValue);
    const endDigits = this.getDigitsArray(toValue);
    const isPositive = toValue > fromValue;
    
    // Always create odometer with target value format
    this.createOdometer(toValue);
    
    const columns = this.element.querySelectorAll('.digit-column');
    const startTime = performance.now();
    
    // For digits that exist in end but not start, animate from 0
    // For digits that exist in both, animate normally
    const numEndDigits = endDigits.length;
    const numStartDigits = startDigits.length;
    
    // Build animation pairs - align from right (least significant digit)
    const animPairs = [];
    for (let i = 0; i < numEndDigits; i++) {
      const endIdx = numEndDigits - 1 - i;
      const startIdx = numStartDigits - 1 - i;
      const endDigit = endDigits[endIdx];
      const startDigit = startIdx >= 0 ? startDigits[startIdx] : 0;
      animPairs.unshift({ startDigit, endDigit, column: columns[endIdx] });
    }
    
    // Set initial positions
    animPairs.forEach(pair => {
      if (pair.column) {
        this.updateDigitPosition(pair.column, pair.startDigit);
      }
    });
    
    // Apply color to changing digits based on positive/negative change
    const changeColor = isPositive ? '#00e676' : '#ff5252';
    animPairs.forEach(pair => {
      if (pair.startDigit !== pair.endDigit && pair.column) {
        pair.column.querySelectorAll('.digit').forEach(d => d.style.color = changeColor);
      }
    });
    
    const tick = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      
      // Animate each digit
      animPairs.forEach(pair => {
        if (pair.column) {
          const currentDigitValue = pair.startDigit + (pair.endDigit - pair.startDigit) * progress;
          const offset = -currentDigitValue * this.digitHeight;
          pair.column.style.transform = `translateY(${offset}rem)`;
        }
      });
      
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        // Snap to final positions and reset colors
        this.currentValue = toValue;
        animPairs.forEach(pair => {
          if (pair.column) {
            const offset = -pair.endDigit * this.digitHeight;
            pair.column.style.transform = `translateY(${offset}rem)`;
            pair.column.querySelectorAll('.digit').forEach(d => d.style.color = '');
          }
        });
      }
    };
    
    requestAnimationFrame(tick);
    this.currentValue = toValue;
  }
  
  createOdometer(value) {
    const formatted = this.formatNumber(value);
    const chars = (this.prefix + formatted + this.suffix).split('');
    
    this.element.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'odometer-container';
    
    chars.forEach((char, index) => {
      if (/\d/.test(char)) {
        // It's a digit - create rolling column
        const wrapper = document.createElement('div');
        wrapper.className = 'digit-wrapper';
        
        const column = document.createElement('div');
        column.className = 'digit-column';
        column.dataset.index = index;
        
        // Create digits 0-9
        for (let j = 0; j <= 9; j++) {
          const digit = document.createElement('div');
          digit.className = 'digit';
          digit.textContent = j;
          column.appendChild(digit);
        }
        
        wrapper.appendChild(column);
        container.appendChild(wrapper);
        
        // Set initial position
        this.updateDigitPosition(column, parseInt(char));
      } else {
        // It's a separator (comma, period, $)
        const separator = document.createElement('span');
        separator.className = 'odometer-separator';
        separator.textContent = char;
        container.appendChild(separator);
      }
    });
    
    this.element.appendChild(container);
  }
  
  updateDigitPosition(column, value) {
    const offset = -value * this.digitHeight;
    column.style.transform = `translateY(${offset}rem)`;
  }
  
  animateTo(newValue) {
    this.animate(this.currentValue, newValue);
  }
}

// DialUpAnimator is now initialized by StockChart
// Make it globally available
window.DialUpAnimator = DialUpAnimator;