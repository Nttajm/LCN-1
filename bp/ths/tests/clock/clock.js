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
            this.buildDevice();
            this.initMatrix();
            this.updateDisplay();
            setInterval(() => this.updateDisplay(), 1000);
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
            
            const now = new Date();
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

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClocks);
    } else {
        initClocks();
    }

    // Expose for manual initialization if needed
    window.IPSWDClock = IPSWDClock;
    window.initIPSWDClocks = initClocks;
})();
