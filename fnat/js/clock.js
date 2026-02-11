(function() {
    // 20 rows x 50 columns dot matrix
    const ROWS = 20;
    const COLS = 50;

    // Large 7x10 font for big time display
    const font7x10 = {
        '0': [
            [0,1,1,1,1,1,0],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [1,1,0,0,1,1,1],
            [1,1,0,1,0,1,1],
            [1,1,1,0,0,1,1],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [0,1,1,1,1,1,0]
        ],
        '1': [
            [0,0,0,1,1,0,0],
            [0,0,1,1,1,0,0],
            [0,1,1,1,1,0,0],
            [0,0,0,1,1,0,0],
            [0,0,0,1,1,0,0],
            [0,0,0,1,1,0,0],
            [0,0,0,1,1,0,0],
            [0,0,0,1,1,0,0],
            [0,0,0,1,1,0,0],
            [0,1,1,1,1,1,0]
        ],
        '2': [
            [0,1,1,1,1,1,0],
            [1,1,0,0,0,1,1],
            [0,0,0,0,0,1,1],
            [0,0,0,0,1,1,0],
            [0,0,0,1,1,0,0],
            [0,0,1,1,0,0,0],
            [0,1,1,0,0,0,0],
            [1,1,0,0,0,0,0],
            [1,1,0,0,0,1,1],
            [1,1,1,1,1,1,1]
        ],
        '3': [
            [0,1,1,1,1,1,0],
            [1,1,0,0,0,1,1],
            [0,0,0,0,0,1,1],
            [0,0,0,0,0,1,1],
            [0,0,1,1,1,1,0],
            [0,0,0,0,0,1,1],
            [0,0,0,0,0,1,1],
            [0,0,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [0,1,1,1,1,1,0]
        ],
        '4': [
            [0,0,0,0,1,1,0],
            [0,0,0,1,1,1,0],
            [0,0,1,1,1,1,0],
            [0,1,1,0,1,1,0],
            [1,1,0,0,1,1,0],
            [1,1,1,1,1,1,1],
            [0,0,0,0,1,1,0],
            [0,0,0,0,1,1,0],
            [0,0,0,0,1,1,0],
            [0,0,0,0,1,1,0]
        ],
        '5': [
            [1,1,1,1,1,1,1],
            [1,1,0,0,0,0,0],
            [1,1,0,0,0,0,0],
            [1,1,1,1,1,1,0],
            [0,0,0,0,0,1,1],
            [0,0,0,0,0,1,1],
            [0,0,0,0,0,1,1],
            [0,0,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [0,1,1,1,1,1,0]
        ],
        '6': [
            [0,1,1,1,1,1,0],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,0,0],
            [1,1,0,0,0,0,0],
            [1,1,1,1,1,1,0],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [0,1,1,1,1,1,0]
        ],
        '7': [
            [1,1,1,1,1,1,1],
            [1,1,0,0,0,1,1],
            [0,0,0,0,0,1,1],
            [0,0,0,0,1,1,0],
            [0,0,0,1,1,0,0],
            [0,0,0,1,1,0,0],
            [0,0,0,1,1,0,0],
            [0,0,0,1,1,0,0],
            [0,0,0,1,1,0,0],
            [0,0,0,1,1,0,0]
        ],
        '8': [
            [0,1,1,1,1,1,0],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [0,1,1,1,1,1,0],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [0,1,1,1,1,1,0]
        ],
        '9': [
            [0,1,1,1,1,1,0],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [0,1,1,1,1,1,1],
            [0,0,0,0,0,1,1],
            [0,0,0,0,0,1,1],
            [0,0,0,0,0,1,1],
            [1,1,0,0,0,1,1],
            [0,1,1,1,1,1,0]
        ],
        ':': [
            [0,0],
            [0,0],
            [1,1],
            [1,1],
            [0,0],
            [0,0],
            [1,1],
            [1,1],
            [0,0],
            [0,0]
        ]
    };

    // Small 3x5 font for seconds and smaller text
    const font3x5 = {
        '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
        '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
        '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
        '3': [[1,1,1],[0,0,1],[1,1,1],[0,0,1],[1,1,1]],
        '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
        '5': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
        '6': [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
        '7': [[1,1,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
        '8': [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
        '9': [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
        'A': [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
        'B': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
        'C': [[0,1,1],[1,0,0],[1,0,0],[1,0,0],[0,1,1]],
        'D': [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
        'E': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
        'F': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
        'G': [[0,1,1],[1,0,0],[1,0,1],[1,0,1],[0,1,1]],
        'H': [[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
        'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
        'J': [[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,0]],
        'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
        'M': [[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
        'N': [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
        'O': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
        'P': [[1,1,0],[1,0,1],[1,1,0],[1,0,0],[1,0,0]],
        'R': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
        'S': [[0,1,1],[1,0,0],[0,1,0],[0,0,1],[1,1,0]],
        'T': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
        'U': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
        'V': [[1,0,1],[1,0,1],[1,0,1],[0,1,0],[0,1,0]],
        'W': [[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,0,1]],
        'Y': [[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
        '.': [[0],[0],[0],[0],[1]],
        ' ': [[0,0],[0,0],[0,0],[0,0],[0,0]]
    };

    // Clock instance class
    class IPSWDClock {
        constructor(container) {
            this.container = container;
            this.dots = [];
            this.manualTime = null; // Stores manual time override
            this.buildDevice();
            this.initMatrix();
            this.updateDisplay();
            setInterval(() => this.updateDisplay(), 1000);
            
            // Store reference on container for later access
            container._clockInstance = this;
        }

        /**
         * Set a manual time override
         * @param {string} time - Time in "HH:MM" or "HH:MM:SS" format
         * @param {string} ampm - "AM" or "PM"
         * @param {number|string} dateParam - Days offset (number) OR custom text string to display in date area
         */
        setManualTime(time, ampm, dateParam = 0) {
            const parts = time.split(':');
            let hours = parseInt(parts[0], 10);
            const minutes = parseInt(parts[1], 10);
            const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
            
            // Convert to 24-hour format for storage
            const isPM = ampm.toUpperCase() === 'PM';
            if (isPM && hours !== 12) {
                hours += 12;
            } else if (!isPM && hours === 12) {
                hours = 0;
            }
            
            // Calculate the target date or store custom text
            const baseDate = new Date();
            let customDateText = null;
            
            if (typeof dateParam === 'string') {
                // Use custom text for the date display
                customDateText = dateParam.toUpperCase();
            } else {
                // Use as days offset
                baseDate.setDate(baseDate.getDate() + dateParam);
            }
            
            this.manualTime = {
                hours: hours,
                minutes: minutes,
                seconds: seconds,
                baseDate: baseDate,
                customDateText: customDateText,
                setAt: Date.now()
            };
            
            this.updateDisplay();
        }

        /**
         * Reset to showing real time
         */
        resetToRealTime() {
            this.manualTime = null;
            this.updateDisplay();
        }

        /**
         * Get the current time to display (manual or real)
         */
        getCurrentTime() {
            if (this.manualTime) {
                // Calculate elapsed seconds since manual time was set
                const elapsed = Math.floor((Date.now() - this.manualTime.setAt) / 1000);
                
                let totalSeconds = this.manualTime.hours * 3600 + 
                                   this.manualTime.minutes * 60 + 
                                   this.manualTime.seconds + elapsed;
                
                // Handle day overflow
                const daysElapsed = Math.floor(totalSeconds / 86400);
                totalSeconds = totalSeconds % 86400;
                if (totalSeconds < 0) totalSeconds += 86400;
                
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                
                // Create a date object with the adjusted date
                const date = new Date(this.manualTime.baseDate);
                date.setDate(date.getDate() + daysElapsed);
                date.setHours(hours, minutes, seconds);
                
                return date;
            }
            return new Date();
        }

        buildDevice() {
            // Create device frame
            const frame = document.createElement('div');
            frame.className = 'device-frame';
            
            // Screws
            const screwPositions = ['tl', 'tr', 'bl', 'br'];
            screwPositions.forEach(pos => {
                const screw = document.createElement('div');
                screw.className = `screw ${pos}`;
                frame.appendChild(screw);
            });
            
            // Speaker grille
            const grille = document.createElement('div');
            grille.className = 'speaker-grille';
            frame.appendChild(grille);
            
            // Status LEDs
            const statusLeds = document.createElement('div');
            statusLeds.className = 'status-leds';
            for (let i = 0; i < 3; i++) {
                const led = document.createElement('div');
                led.className = i === 1 ? 'status-led active' : 'status-led';
                statusLeds.appendChild(led);
            }
            frame.appendChild(statusLeds);
            
            // LED display
            const ledDisplay = document.createElement('div');
            ledDisplay.className = 'led-display';
            
            this.dotMatrix = document.createElement('div');
            this.dotMatrix.className = 'dot-matrix';
            ledDisplay.appendChild(this.dotMatrix);
            
            frame.appendChild(ledDisplay);
            
            // Brand label
            const brandLabel = document.createElement('div');
            brandLabel.className = 'brand-label';
            brandLabel.textContent = '⬥ ADVANCED NETWORK DEVICES';
            frame.appendChild(brandLabel);
            
            this.container.appendChild(frame);
        }

        initMatrix() {
            this.dotMatrix.innerHTML = '';
            this.dots = [];
            
            for (let row = 0; row < ROWS; row++) {
                this.dots[row] = [];
                for (let col = 0; col < COLS; col++) {
                    const dot = document.createElement('div');
                    dot.className = 'dot';
                    this.dotMatrix.appendChild(dot);
                    this.dots[row][col] = dot;
                }
            }
        }

        clearMatrix() {
            for (let row = 0; row < ROWS; row++) {
                for (let col = 0; col < COLS; col++) {
                    this.dots[row][col].className = 'dot';
                }
            }
        }

        drawChar7x10(char, startCol, startRow, colorClass) {
            const pattern = font7x10[char];
            if (!pattern) return 0;
            
            for (let row = 0; row < pattern.length; row++) {
                for (let col = 0; col < pattern[row].length; col++) {
                    const dotRow = startRow + row;
                    const dotCol = startCol + col;
                    if (dotRow >= 0 && dotRow < ROWS && dotCol >= 0 && dotCol < COLS) {
                        if (pattern[row][col]) {
                            this.dots[dotRow][dotCol].className = 'dot ' + colorClass;
                        }
                    }
                }
            }
            return pattern[0].length;
        }

        drawChar3x5(char, startCol, startRow, colorClass) {
            const pattern = font3x5[char];
            if (!pattern) return 0;
            
            for (let row = 0; row < pattern.length; row++) {
                for (let col = 0; col < pattern[row].length; col++) {
                    const dotRow = startRow + row;
                    const dotCol = startCol + col;
                    if (dotRow >= 0 && dotRow < ROWS && dotCol >= 0 && dotCol < COLS) {
                        if (pattern[row][col]) {
                            this.dots[dotRow][dotCol].className = 'dot ' + colorClass;
                        }
                    }
                }
            }
            return pattern[0].length;
        }

        drawText3x5(text, startCol, startRow, colorClass) {
            let col = startCol;
            for (let i = 0; i < text.length; i++) {
                const charWidth = this.drawChar3x5(text[i], col, startRow, colorClass);
                col += charWidth + 1;
            }
            return col - startCol;
        }

        getDayAbbr(day) {
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            return days[day];
        }

        getMonthAbbr(month) {
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                           'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            return months[month];
        }

        updateDisplay() {
            this.clearMatrix();
            
            const now = this.getCurrentTime();
            let hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            
            // Convert to 12-hour format
            hours = hours % 12;
            if (hours === 0) hours = 12;
            
            // Format time strings
            const hourStr = hours.toString().padStart(2, ' ');
            const minStr = minutes.toString().padStart(2, '0');
            const secStr = seconds.toString().padStart(2, '0');
            
            // Draw main time (hours:minutes) in yellow using large 7x10 font
            let col = 0;
            
            // Draw hours (large)
            for (let i = 0; i < hourStr.length; i++) {
                if (hourStr[i] !== ' ') {
                    col += this.drawChar7x10(hourStr[i], col, 0, 'on-yellow') + 1;
                } else {
                    col += 8;
                }
            }
            
            // Draw colon (blinking)
            if (seconds % 2 === 0) {
                this.drawChar7x10(':', col, 0, 'on-yellow');
            }
            col += 3;
            
            // Draw minutes (large)
            for (let i = 0; i < minStr.length; i++) {
                col += this.drawChar7x10(minStr[i], col, 0, 'on-yellow') + 1;
            }
            
            // Draw seconds in smaller font (green)
            col += 1;
            this.drawText3x5(secStr, col, 0, 'on-green');
            
            // Draw AM/PM in red below seconds
            this.drawText3x5(ampm[0], col, 5, 'on-red');
            this.drawText3x5(ampm[1], col + 4, 5, 'on-red');
            
            // Check if we have custom date text
            if (this.manualTime && this.manualTime.customDateText) {
                // Draw custom text in the date area
                col = 3;
                this.drawText3x5(this.manualTime.customDateText, col, 14, 'on-orange');
            } else {
                // Draw date line using small 3x5 font
                const dayAbbr = this.getDayAbbr(now.getDay());
                const monthAbbr = this.getMonthAbbr(now.getMonth());
                const date = now.getDate().toString();
                
                // Date line - row 14 (near bottom)
                col = 3;
                
                // Day in green (small)
                for (let i = 0; i < dayAbbr.length; i++) {
                    col += this.drawChar3x5(dayAbbr[i], col, 14, 'on-green') + 1;
                }
                
                // Period/dot
                col += 1;
                this.dots[18][col - 2].className = 'dot on-green';
                
                // Month in orange (small)
                for (let i = 0; i < monthAbbr.length; i++) {
                    col += this.drawChar3x5(monthAbbr[i], col, 14, 'on-orange') + 1;
                }
                
                col += 1;
                
                // Date in red (small)
                for (let i = 0; i < date.length; i++) {
                    col += this.drawChar3x5(date[i], col, 14, 'on-red') + 1;
                }
            }
        }
    }

    // Auto-initialize all clock containers when DOM is ready
    function initClocks() {
        const containers = document.querySelectorAll('.clock-js-import');
        containers.forEach(container => {
            if (!container.dataset.clockInitialized) {
                new IPSWDClock(container);
                container.dataset.clockInitialized = 'true';
            }
        });
    }

    // Store all clock instances for manual control
    let clockInstances = [];

    // Get all initialized clock instances
    function getClockInstances() {
        const containers = document.querySelectorAll('.clock-js-import[data-clock-initialized="true"]');
        clockInstances = [];
        containers.forEach(container => {
            if (container._clockInstance) {
                clockInstances.push(container._clockInstance);
            }
        });
        return clockInstances;
    }

    /**
     * Manually set the time on all clocks
     * @param {string} time - Time in "HH:MM" or "HH:MM:SS" format (e.g., "10:30" or "10:30:45")
     * @param {string} ampm - "AM" or "PM"
     * @param {number} daysOffset - Days to add to today's date (e.g., 1 = tomorrow, -1 = yesterday)
     */
     function CLOCK_SET(time, ampm, daysOffset = 0) {
        const instances = getClockInstances();
        instances.forEach(clock => {
            clock.setManualTime(time, ampm, daysOffset);
        });
    }

    /**
     * Reset all clocks to show real time
     */
    function CLOCK_RESET() {
        const instances = getClockInstances();
        instances.forEach(clock => {
            clock.resetToRealTime();
        });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClocks);
    } else {
        initClocks();
    }

    // Expose for manual initialization if needed (global access)
    window.IPSWDClock = IPSWDClock;
    window.initIPSWDClocks = initClocks;
    window.CLOCK_SET = CLOCK_SET;
    window.CLOCK_RESET = CLOCK_RESET;

    // ES Module exports
    if (typeof module !== 'undefined' && module.exports) {
        // CommonJS
        module.exports = { IPSWDClock, initIPSWDClocks: initClocks, CLOCK_SET, CLOCK_RESET };
    }
})();

// ES Module exports for import statements
export { };
export const CLOCK_SET = window.CLOCK_SET;
export const CLOCK_RESET = window.CLOCK_RESET;
export const IPSWDClock = window.IPSWDClock;
export const initIPSWDClocks = window.initIPSWDClocks;
