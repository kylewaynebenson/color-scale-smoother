class ColorBandEditor {
    constructor() {
        this.bandCount = 10;
        this.colors = [];
        this.lockedColors = new Set();
        this.originalColors = [];
        
        // History system
        this.history = [];
        this.maxHistorySize = 50;
        this.isHistoryOpen = false;
        
        // Track if user manually selected Tailwind color
        this.tailwindColorManuallySelected = false;
        
        // Algorithm descriptions
        this.algorithmDescriptions = {
            'hsl': 'Interpolates between colors maintaining hue relationships for natural gradients.',
            'lab': 'Uses perceptually uniform LAB color space for smooth visual transitions.',
            'rgb': 'Simple linear blending between red, green, and blue values.',
            'bezier': 'Creates smooth curves through color space using control points.'
        };
        
        this.initializeDefaultColors();
        this.setupEventListeners();
        this.setupAuditToggles();
        this.setupHistorySystem();
        this.loadHistoryFromStorage();
        this.loadFromURL(); // Load state from URL if present
        this.renderEditor();
        this.updatePreview();
        this.drawColorSpaceGraph();
        this.drawHueSpaceGraph();
        this.drawSaturationSpaceGraph();
        
        // Only save initial state if history is empty (fresh start)
        if (this.history.length === 0) {
            this.saveToHistory('Initial colors');
        }
    }
    
    initializeDefaultColors() {
        // Generate default gradient from green to dark green
        const startColor = { r: 218, g: 251, b: 225 }; // Light green
        const endColor = { r: 10, g: 36, b: 27 };      // Dark green
        
        this.colors = [];
        this.originalColors = [];
        
        for (let i = 0; i < this.bandCount; i++) {
            const factor = i / (this.bandCount - 1);
            const r = Math.round(startColor.r + (endColor.r - startColor.r) * factor);
            const g = Math.round(startColor.g + (endColor.g - startColor.g) * factor);
            const b = Math.round(startColor.b + (endColor.b - startColor.b) * factor);
            
            const hex = ColorUtils.rgbToHex(r, g, b);
            this.colors.push(hex);
            this.originalColors.push(hex);
        }
    }
    
    setupEventListeners() {
        // Theme toggle
        this.setupThemeToggle();
        
        // Data view toggle
        this.setupDataToggle();
        
        // Band count input
        const bandCountInput = document.getElementById('bandCount');
        
        bandCountInput.addEventListener('input', (e) => {
            this.bandCount = parseInt(e.target.value);
            this.adjustBandCount();
            this.updateURL(); // Update URL when band count changes
        });
        
        // Smoothing strength input - auto apply
        const strengthInput = document.getElementById('smoothingStrength');
        
        strengthInput.addEventListener('input', (e) => {
            this.applySmoothing();
            this.updateURL(); // Update URL when strength changes
        });
        
        // Setup number input increment/decrement buttons
        this.setupNumberInputControls();
        
        // Smoothing algorithm dropdown - auto apply
        const algorithmSelect = document.getElementById('smoothingAlgorithm');
        algorithmSelect.addEventListener('change', (e) => {
            this.updateAlgorithmDescription(e.target.value);
            this.applySmoothing();
            this.updateURL(); // Update URL when algorithm changes
        });
        
        // Initialize algorithm description
        this.updateAlgorithmDescription(algorithmSelect.value);
        
        // Export JSON/YAML button
        document.getElementById('exportJsonBtn').addEventListener('click', () => {
            this.exportAsFile();
        });
        
        // Import from clipboard button
        document.getElementById('importClipboardBtn').addEventListener('click', () => {
            this.importFromClipboard();
        });
        
        // Import from file button
        document.getElementById('importFileBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        // File input change event
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.importFromFile(e.target.files[0]);
        });
        
        // Refresh/reapply algorithm button
        document.getElementById('reapplyAlgorithmBtn').addEventListener('click', () => {
            this.applySmoothing();
        });
        
        // Copy buttons for graphs
        document.getElementById('copyGraphFigma').addEventListener('click', () => {
            this.copyGraphForFigma();
        });
        
        document.getElementById('copyHueGraphFigma').addEventListener('click', () => {
            this.copyHueGraphForFigma();
        });
        
        document.getElementById('copySaturationGraphFigma').addEventListener('click', () => {
            this.copySaturationGraphForFigma();
        });
        
        document.getElementById('copyAllForFigma').addEventListener('click', () => {
            this.copyAllForFigma();
        });
    }
    
    setupThemeToggle() {
        // Initialize theme from localStorage or system preference
        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        let currentTheme = savedTheme || (systemDark ? 'dark' : 'light');
        this.applyTheme(currentTheme);
        
        // Theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        const sunIcon = themeToggle.querySelector('.sun-icon');
        const moonIcon = themeToggle.querySelector('.moon-icon');
        
        // Update icons based on current theme
        this.updateThemeIcons(currentTheme, sunIcon, moonIcon);
        
        themeToggle.addEventListener('click', () => {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.applyTheme(currentTheme);
            this.updateThemeIcons(currentTheme, sunIcon, moonIcon);
            localStorage.setItem('theme', currentTheme);
        });
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                currentTheme = e.matches ? 'dark' : 'light';
                this.applyTheme(currentTheme);
                this.updateThemeIcons(currentTheme, sunIcon, moonIcon);
            }
        });
    }
    
    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }
    
    updateThemeIcons(theme, sunIcon, moonIcon) {
        if (theme === 'dark') {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        } else {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
    }
    
    setupDataToggle() {
        const dataToggle = document.getElementById('dataToggle');
        const expandIcon = dataToggle.querySelector('.expand-icon');
        const collapseIcon = dataToggle.querySelector('.collapse-icon');
        
        const updateIcons = (isCompact) => {
            if (isCompact) {
                expandIcon.classList.add('hidden');
                collapseIcon.classList.remove('hidden');
            } else {
                expandIcon.classList.remove('hidden');
                collapseIcon.classList.add('hidden');
            }
        };
        
        dataToggle.addEventListener('click', () => {
            document.body.classList.toggle('compact-view');
            
            // Save preference to localStorage
            const isCompact = document.body.classList.contains('compact-view');
            localStorage.setItem('compactView', isCompact);
            updateIcons(isCompact);
            
            // Refresh preview to show/hide contrast indicators
            this.updatePreview();
        });
        
        // Load saved preference
        const savedCompactView = localStorage.getItem('compactView');
        if (savedCompactView === 'true') {
            document.body.classList.add('compact-view');
            updateIcons(true);
        }
    }
    
    setupNumberInputControls() {
        // Setup increment/decrement buttons for all number inputs
        document.querySelectorAll('button[data-target]').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetId = button.dataset.target;
                const input = document.getElementById(targetId);
                
                if (!input) return;
                
                const currentValue = parseFloat(input.value) || 0;
                const min = parseFloat(input.min) || 0;
                const max = parseFloat(input.max) || 100;
                const step = parseFloat(input.step) || 1;
                
                // Determine if this is increment or decrement based on the SVG content
                const svg = button.querySelector('svg path');
                const isIncrement = svg && svg.getAttribute('d').includes('V5H13V11H19V13Z'); // Plus icon
                const isDecrement = !isIncrement; // Minus icon
                
                let newValue = currentValue;
                
                if (isIncrement && currentValue < max) {
                    newValue = Math.min(currentValue + step, max);
                } else if (isDecrement && currentValue > min) {
                    newValue = Math.max(currentValue - step, min);
                }
                
                if (newValue !== currentValue) {
                    input.value = newValue;
                    
                    // Trigger input event to update the application
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                // Update button states
                this.updateNumberInputButtonStates(input);
            });
        });
        
        // Setup input validation and button state updates
        document.querySelectorAll('.input--number').forEach(input => {
            input.addEventListener('input', () => {
                this.updateNumberInputButtonStates(input);
            });
            
            // Initialize button states
            this.updateNumberInputButtonStates(input);
        });
    }
    
    updateNumberInputButtonStates(input) {
        const wrapper = input.closest('.number-input-wrapper');
        if (!wrapper) return;
        
        const buttons = wrapper.querySelectorAll('button[data-target]');
        if (buttons.length !== 2) return;
        
        const currentValue = parseFloat(input.value) || 0;
        const min = parseFloat(input.min) || 0;
        const max = parseFloat(input.max) || 100;
        
        buttons.forEach(button => {
            const svg = button.querySelector('svg path');
            const isIncrement = svg && svg.getAttribute('d').includes('V5H13V11H19V13Z'); // Plus icon
            
            if (isIncrement) {
                button.disabled = currentValue >= max;
            } else {
                button.disabled = currentValue <= min;
            }
        });
    }
    
    adjustBandCount() {
        const currentLength = this.colors.length;
        
        if (this.bandCount > currentLength) {
            // Add new colors by interpolating
            const newColors = [];
            const newOriginalColors = [];
            
            for (let i = 0; i < this.bandCount; i++) {
                const factor = i / (this.bandCount - 1);
                const sourceIndex = factor * (currentLength - 1);
                const lowerIndex = Math.floor(sourceIndex);
                const upperIndex = Math.min(lowerIndex + 1, currentLength - 1);
                const localFactor = sourceIndex - lowerIndex;
                
                if (lowerIndex === upperIndex) {
                    newColors.push(this.colors[lowerIndex]);
                    newOriginalColors.push(this.originalColors[lowerIndex]);
                } else {
                    const interpolated = this.interpolateColors(
                        this.colors[lowerIndex], 
                        this.colors[upperIndex], 
                        localFactor
                    );
                    newColors.push(interpolated);
                    
                    const originalInterpolated = this.interpolateColors(
                        this.originalColors[lowerIndex], 
                        this.originalColors[upperIndex], 
                        localFactor
                    );
                    newOriginalColors.push(originalInterpolated);
                }
            }
            
            this.colors = newColors;
            this.originalColors = newOriginalColors;
        } else if (this.bandCount < currentLength) {
            // Remove colors by sampling
            const newColors = [];
            const newOriginalColors = [];
            const newLockedColors = new Set();
            
            for (let i = 0; i < this.bandCount; i++) {
                const sourceIndex = Math.round(i * (currentLength - 1) / (this.bandCount - 1));
                newColors.push(this.colors[sourceIndex]);
                newOriginalColors.push(this.originalColors[sourceIndex]);
                
                if (this.lockedColors.has(sourceIndex)) {
                    newLockedColors.add(i);
                }
            }
            
            this.colors = newColors;
            this.originalColors = newOriginalColors;
            this.lockedColors = newLockedColors;
        }
        
        // Re-render everything after band count change
        this.renderEditor();
        this.updatePreview();
        this.drawColorSpaceGraph();
        this.drawHueSpaceGraph();
        this.drawSaturationSpaceGraph();
        this.updateURL();
        this.saveToHistory(`Changed to ${this.bandCount} colors`);
    }
    
    interpolateColors(color1, color2, factor) {
        const rgb1 = ColorUtils.hexToRgb(color1);
        const rgb2 = ColorUtils.hexToRgb(color2);
        
        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
        
        return ColorUtils.rgbToHex(r, g, b);
    }
    
    renderEditor() {
        const editorContainer = document.getElementById('colorBandEditor');
        editorContainer.innerHTML = '';
        
        this.colors.forEach((color, index) => {
            const group = document.createElement('div');
            group.className = 'color-input-group';
            
            // Header with index and lock button
            const header = document.createElement('div');
            header.className = 'color-input-header';
            
            const indexLabel = document.createElement('span');
            indexLabel.textContent = index;
            
            const lockBtn = document.createElement('button');
            lockBtn.className = `lock-btn ${this.lockedColors.has(index) ? 'locked' : ''}`;
            lockBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z" /></svg>';
            
            lockBtn.title = this.lockedColors.has(index) ? 'Click to unlock' : 'Click to lock';
            
            lockBtn.addEventListener('click', () => {
                this.toggleLock(index);
            });
            
            header.appendChild(indexLabel);
            header.appendChild(lockBtn);
            
            // Color input
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.className = 'color-input';
            colorInput.value = color;
            colorInput.addEventListener('change', (e) => {
                // Auto-lock the color when manually edited
                if (!this.lockedColors.has(index)) {
                    this.lockedColors.add(index);
                }
                this.updateColor(index, e.target.value);
                // Re-render to update lock button state
                this.renderEditor();
            });
            
            // Hex input
            const hexInput = document.createElement('input');
            hexInput.type = 'text';
            hexInput.className = 'hex-input';
            hexInput.value = color;
            hexInput.addEventListener('change', (e) => {
                const hex = this.validateHex(e.target.value);
                if (hex) {
                    // Auto-lock the color when manually edited
                    if (!this.lockedColors.has(index)) {
                        this.lockedColors.add(index);
                    }
                    this.updateColor(index, hex);
                    colorInput.value = hex;
                    // Re-render to update lock button state
                    this.renderEditor();
                } else {
                    e.target.value = color; // Reset to current value
                }
            });
            
            // Add arrow key support for incrementing/decrementing colors
            hexInput.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    
                    const currentHex = this.validateHex(e.target.value) || color;
                    const increment = e.key === 'ArrowUp' ? 5 : -5;
                    const newHex = this.incrementHexColor(currentHex, increment);
                    
                    if (newHex) {
                        // Auto-lock the color when using arrow keys
                        const wasLocked = this.lockedColors.has(index);
                        if (!wasLocked) {
                            this.lockedColors.add(index);
                        }
                        
                        e.target.value = newHex;
                        this.updateColor(index, newHex);
                        colorInput.value = newHex;
                        
                        // Only update lock button if state changed, maintain focus
                        if (!wasLocked) {
                            const lockButton = group.querySelector('.lock-btn');
                            if (lockButton) {
                                lockButton.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z" /></svg>';
                                lockButton.classList.add('locked');
                            }
                        }
                        
                        // Keep focus on the input
                        setTimeout(() => e.target.focus(), 0);
                    }
                }
            });
            
            group.appendChild(header);
            group.appendChild(colorInput);
            group.appendChild(hexInput);
            
            editorContainer.appendChild(group);
        });
    }
    
    validateHex(value) {
        // Remove # if present and validate
        let hex = value.replace('#', '');
        
        if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
            return null;
        }
        
        return '#' + hex.toLowerCase();
    }

    incrementHexColor(hex, increment) {
        // Convert hex to RGB
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        // Increment each channel by the specified amount
        const newR = Math.max(0, Math.min(255, r + increment));
        const newG = Math.max(0, Math.min(255, g + increment));
        const newB = Math.max(0, Math.min(255, b + increment));
        
        // Convert back to hex
        const rHex = newR.toString(16).padStart(2, '0');
        const gHex = newG.toString(16).padStart(2, '0');
        const bHex = newB.toString(16).padStart(2, '0');
        
        return `#${rHex}${gHex}${bHex}`;
    }

    toggleLock(index) {
        const wasLocked = this.lockedColors.has(index);
        if (wasLocked) {
            this.lockedColors.delete(index);
        } else {
            this.lockedColors.add(index);
        }
        this.renderEditor();
        this.drawColorSpaceGraph();
        this.updateURL(); // Update URL when lock state changes
        
        const action = wasLocked ? 'Unlocked' : 'Locked';
        this.saveToHistory(`${action} color ${index + 1}`, false); // Don't skip similar for lock changes
    }
    
    updateColor(index, hex) {
        this.colors[index] = hex;
        this.updatePreview();
        this.drawColorSpaceGraph();
        this.drawHueSpaceGraph();
        this.drawSaturationSpaceGraph();
        this.updateURL(); // Update URL when color changes
        this.saveToHistory(`Updated color ${index + 1}`);
    }
    
    updateAlgorithmDescription(algorithm) {
        const descriptionElement = document.getElementById('algorithmDescription');
        descriptionElement.textContent = this.algorithmDescriptions[algorithm];
    }
    
    // Contrast calculation utilities
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    getLuminance(r, g, b) {
        const toLinear = (c) => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }
    
    getContrastRatio(color1, color2) {
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        if (!rgb1 || !rgb2) return 0;
        
        const lum1 = this.getLuminance(rgb1.r, rgb1.g, rgb1.b);
        const lum2 = this.getLuminance(rgb2.r, rgb2.g, rgb2.b);
        
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        
        return (brightest + 0.05) / (darkest + 0.05);
    }
    
    createContrastIndicator(backgroundColor) {
        // Only create indicator if contrast ratio audit is enabled
        const contrastToggle = document.getElementById('contrastRatio');
        if (!contrastToggle || !contrastToggle.checked) return null;
        
        const blackContrast = this.getContrastRatio(backgroundColor, '#000000');
        const whiteContrast = this.getContrastRatio(backgroundColor, '#ffffff');
        
        const blackAA = blackContrast >= 4.5;
        const whiteAA = whiteContrast >= 4.5;
        
        // Only show if at least one passes AA
        if (!blackAA && !whiteAA) return null;
        
        const indicator = document.createElement('div');
        indicator.className = 'contrast-indicator';
        
        if (blackAA && whiteAA) {
            // Both pass - show both
            indicator.innerHTML = '<span style="color: #000">Aa</span> <span style="color: #fff">Aa</span>';
        } else if (blackAA) {
            // Only black passes
            indicator.innerHTML = '<span style="color: #000">Aa</span>';
        } else {
            // Only white passes
            indicator.innerHTML = '<span style="color: #fff">Aa</span>';
        }
        
        return indicator;
    }

    updatePreview() {
        const previewContainer = document.getElementById('colorBandPreview');
        previewContainer.innerHTML = '';
        
        this.colors.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-preview-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = `${index}: ${color}${this.lockedColors.has(index) ? ' (locked)' : ''}`;
            
            // Add contrast accessibility indicators (controlled by audit toggle)
            const contrastIndicator = this.createContrastIndicator(color);
            if (contrastIndicator) {
                swatch.appendChild(contrastIndicator);
            }
            
            // Add lock overlay if locked
            if (this.lockedColors.has(index)) {
                const lockOverlay = document.createElement('div');
                lockOverlay.className = 'lock-overlay';
                lockOverlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z" /></svg>';
                swatch.appendChild(lockOverlay);
            }
            
            previewContainer.appendChild(swatch);
        });
        
        // Update audit features when preview updates
        // Only auto-select Tailwind color if user hasn't manually selected one
        if (!this.tailwindColorManuallySelected) {
            this.autoSelectTailwindColor();
        }
        if (document.getElementById('tailwindComparison').checked) {
            this.updateTailwindComparison();
        }
    }
    
    applySmoothing() {
        const algorithm = document.getElementById('smoothingAlgorithm').value;
        const strength = parseFloat(document.getElementById('smoothingStrength').value);
        
        const lockedIndices = Array.from(this.lockedColors);
        let smoothedColors;
        
        switch (algorithm) {
            case 'hsl':
                smoothedColors = SmoothingAlgorithms.hslInterpolate(this.colors, lockedIndices);
                break;
            case 'lab':
                smoothedColors = SmoothingAlgorithms.labInterpolate(this.colors, lockedIndices);
                break;
            case 'rgb':
                smoothedColors = SmoothingAlgorithms.rgbLinearInterpolate(this.colors, lockedIndices);
                break;
            case 'bezier':
                smoothedColors = SmoothingAlgorithms.bezierInterpolate(this.colors, lockedIndices);
                break;
            default:
                smoothedColors = [...this.colors];
        }
        
        // Apply smoothing strength
        this.colors = SmoothingAlgorithms.applyWithStrength(this.colors, smoothedColors, strength);
        
        this.renderEditor();
        this.updatePreview();
        this.drawColorSpaceGraph();
        this.drawHueSpaceGraph();
        this.drawSaturationSpaceGraph();
        this.updateURL(); // Update URL when smoothing is applied
        
        const algorithmName = document.getElementById('smoothingAlgorithm').value;
        this.saveToHistory(`Applied ${algorithmName.toUpperCase()} smoothing`);
    }
    
    drawColorSpaceGraph() {
        const svg = document.querySelector('.graph-svg');
        const gridGroup = svg.querySelector('.graph-grid');
        const lineGroup = svg.querySelector('.graph-line');
        const pointsGroup = svg.querySelector('.graph-points');
        
        // Clear existing content
        gridGroup.innerHTML = '';
        lineGroup.innerHTML = '';
        pointsGroup.innerHTML = '';
        
        if (this.colors.length < 2) return;
        
        const width = 440;
        const height = 160;
        const margin = { top: 30, right: 30, bottom: 30, left: 40 };
        const graphWidth = width - margin.left - margin.right;
        const graphHeight = height - margin.top - margin.bottom;
        
        // Convert colors to lightness values
        const lightnessValues = this.colors.map(color => {
            const hsl = ColorUtils.hexToHsl(color);
            return hsl ? hsl.l : 0;
        });
        
        // Find min/max for scaling
        const minLightness = Math.min(...lightnessValues);
        const maxLightness = Math.max(...lightnessValues);
        const range = maxLightness - minLightness || 1;
        
        // Create grid lines
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = margin.top + (i / gridLines) * graphHeight;
            const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            gridLine.setAttribute('x1', margin.left);
            gridLine.setAttribute('y1', y);
            gridLine.setAttribute('x2', width - margin.right);
            gridLine.setAttribute('y2', y);
            gridGroup.appendChild(gridLine);
        }
        
        // Create path for the line
        let pathData = '';
        const points = [];
        
        for (let i = 0; i < this.colors.length; i++) {
            const x = margin.left + (i / (this.colors.length - 1)) * graphWidth;
            const normalizedValue = (lightnessValues[i] - minLightness) / range;
            const y = height - margin.bottom - normalizedValue * graphHeight;
            
            points.push({ x, y, index: i });
            
            if (i === 0) {
                pathData += `M ${x} ${y}`;
            } else {
                pathData += ` L ${x} ${y}`;
            }
        }
        
        // Create the line path
        const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        linePath.setAttribute('d', pathData);
        lineGroup.appendChild(linePath);
        
        // Create points
        points.forEach(point => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', 4);
            circle.setAttribute('class', this.lockedColors.has(point.index) ? 'locked' : 'unlocked');
            
            // Add tooltip
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `Index ${point.index}: ${this.colors[point.index]} (${Math.round(lightnessValues[point.index])}% lightness)`;
            circle.appendChild(title);
            
            // Add click handler to toggle lock
            circle.style.cursor = 'pointer';
            circle.addEventListener('click', () => {
                this.toggleLock(point.index);
            });
            
            pointsGroup.appendChild(circle);
        });
    }
    
    drawHueSpaceGraph() {
        if (this.colors.length < 2) return;
        
        const svg = document.querySelector('#hueSpaceGraph svg');
        const gridGroup = svg.querySelector('.graph-grid');
        const lineGroup = svg.querySelector('.hue-graph-line');
        const pointsGroup = svg.querySelector('.hue-graph-points');
        
        // Clear existing content
        gridGroup.innerHTML = '';
        lineGroup.innerHTML = '';
        pointsGroup.innerHTML = '';
        
        // Convert colors to hue values
        const hueValues = this.colors.map(color => {
            const hsl = ColorUtils.hexToHsl(color);
            return hsl ? hsl.h : 0; // Fallback to 0 if conversion fails
        });
        
        // Find min/max for scaling - handle hue wraparound
        let minHue = Math.min(...hueValues);
        let maxHue = Math.max(...hueValues);
        
        // Handle edge case where all hues are the same
        if (minHue === maxHue) {
            minHue = Math.max(0, maxHue - 30);
            maxHue = Math.min(360, maxHue + 30);
        }
        
        // If the range spans more than 180 degrees, we might have a wraparound
        if (maxHue - minHue > 180) {
            // Check if it would be better to show as a wraparound
            const adjustedHues = hueValues.map(h => h < 180 ? h + 360 : h);
            const adjustedMin = Math.min(...adjustedHues);
            const adjustedMax = Math.max(...adjustedHues);
            
            if (adjustedMax - adjustedMin < maxHue - minHue) {
                // Use adjusted values
                minHue = adjustedMin - 360;
                maxHue = adjustedMax - 360;
                hueValues.forEach((h, i) => {
                    if (h < 180) hueValues[i] = h + 360;
                });
            }
        }
        
        // Ensure we have some range to display
        const range = maxHue - minHue;
        if (range < 20) {
            const center = (minHue + maxHue) / 2;
            minHue = center - 10;
            maxHue = center + 10;
        }
        
        // Update axis labels with actual range
        const hueMaxLabel = svg.querySelector('.hue-max');
        const hueMidLabel = svg.querySelector('.hue-mid');
        const hueMinLabel = svg.querySelector('.hue-min');
        
        if (hueMaxLabel && hueMidLabel && hueMinLabel) {
            const midHue = (minHue + maxHue) / 2;
            hueMaxLabel.textContent = `${Math.round(maxHue)}°`;
            hueMidLabel.textContent = `${Math.round(midHue)}°`;
            hueMinLabel.textContent = `${Math.round(minHue)}°`;
        }
        
        // Graph dimensions
        const width = 440;
        const height = 160;
        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
        const graphWidth = width - margin.left - margin.right;
        const graphHeight = height - margin.top - margin.bottom;
        
        // Create grid lines
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = margin.top + (i / gridLines) * graphHeight;
            const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            gridLine.setAttribute('x1', margin.left);
            gridLine.setAttribute('y1', y);
            gridLine.setAttribute('x2', width - margin.right);
            gridLine.setAttribute('y2', y);
            gridGroup.appendChild(gridLine);
        }
        
        // Create points
        const points = hueValues.map((hue, index) => {
            const x = margin.left + (index / (this.colors.length - 1)) * graphWidth;
            const y = margin.top + graphHeight - ((hue - minHue) / (maxHue - minHue)) * graphHeight;
            return { x, y, hue, index };
        });
        
        // Create line path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let pathData = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 1; i < points.length; i++) {
            pathData += ` L ${points[i].x} ${points[i].y}`;
        }
        
        path.setAttribute('d', pathData);
        lineGroup.appendChild(path);
        
        // Create points
        points.forEach(point => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', 4);
            circle.setAttribute('class', this.lockedColors.has(point.index) ? 'locked' : 'unlocked');
            
            // Add tooltip
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `Color ${point.index}: ${Math.round(point.hue)}°`;
            circle.appendChild(title);
            
            circle.style.cursor = 'pointer';
            circle.addEventListener('click', () => {
                this.toggleLock(point.index);
            });
            
            pointsGroup.appendChild(circle);
        });
    }
    
    drawSaturationSpaceGraph() {
        if (this.colors.length < 2) return;
        
        const svg = document.querySelector('#saturationSpaceGraph svg');
        const gridGroup = svg.querySelector('.graph-grid');
        const lineGroup = svg.querySelector('.saturation-graph-line');
        const pointsGroup = svg.querySelector('.saturation-graph-points');
        
        // Clear existing content
        gridGroup.innerHTML = '';
        lineGroup.innerHTML = '';
        pointsGroup.innerHTML = '';
        
        // Convert colors to saturation values
        const saturationValues = this.colors.map(color => {
            const hsl = ColorUtils.hexToHsl(color);
            return hsl ? hsl.s : 0; // Fallback to 0 if conversion fails
        });
        
        // Find min/max for scaling
        let minSaturation = Math.min(...saturationValues);
        let maxSaturation = Math.max(...saturationValues);
        
        // Handle edge case where all saturations are the same
        if (minSaturation === maxSaturation) {
            minSaturation = Math.max(0, maxSaturation - 10);
            maxSaturation = Math.min(100, maxSaturation + 10);
        }
        
        // Ensure we have some range to display
        const range = maxSaturation - minSaturation;
        if (range < 10) {
            const center = (minSaturation + maxSaturation) / 2;
            minSaturation = Math.max(0, center - 5);
            maxSaturation = Math.min(100, center + 5);
        }
        
        // Update axis labels with actual range
        const saturationMaxLabel = svg.querySelector('.saturation-max');
        const saturationMidLabel = svg.querySelector('.saturation-mid');
        const saturationMinLabel = svg.querySelector('.saturation-min');
        
        if (saturationMaxLabel && saturationMidLabel && saturationMinLabel) {
            const midSaturation = (minSaturation + maxSaturation) / 2;
            saturationMaxLabel.textContent = `${Math.round(maxSaturation)}%`;
            saturationMidLabel.textContent = `${Math.round(midSaturation)}%`;
            saturationMinLabel.textContent = `${Math.round(minSaturation)}%`;
        }
        
        // Graph dimensions
        const width = 440;
        const height = 160;
        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
        const graphWidth = width - margin.left - margin.right;
        const graphHeight = height - margin.top - margin.bottom;
        
        // Create grid lines
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = margin.top + (i / gridLines) * graphHeight;
            const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            gridLine.setAttribute('x1', margin.left);
            gridLine.setAttribute('y1', y);
            gridLine.setAttribute('x2', width - margin.right);
            gridLine.setAttribute('y2', y);
            gridGroup.appendChild(gridLine);
        }
        
        // Create points
        const points = saturationValues.map((saturation, index) => {
            const x = margin.left + (index / (this.colors.length - 1)) * graphWidth;
            const y = margin.top + graphHeight - ((saturation - minSaturation) / (maxSaturation - minSaturation)) * graphHeight;
            return { x, y, saturation, index };
        });
        
        // Create line path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let pathData = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 1; i < points.length; i++) {
            pathData += ` L ${points[i].x} ${points[i].y}`;
        }
        
        path.setAttribute('d', pathData);
        lineGroup.appendChild(path);
        
        // Create points
        points.forEach(point => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', 4);
            circle.setAttribute('class', this.lockedColors.has(point.index) ? 'locked' : 'unlocked');
            
            // Add tooltip
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `Color ${point.index}: ${Math.round(point.saturation)}%`;
            circle.appendChild(title);
            
            circle.style.cursor = 'pointer';
            circle.addEventListener('click', () => {
                this.toggleLock(point.index);
            });
            
            pointsGroup.appendChild(circle);
        });
    }
    
    resetColors() {
        this.colors = [...this.originalColors];
        this.lockedColors.clear();
        this.renderEditor();
        this.updatePreview();
        this.drawColorSpaceGraph();
        this.drawHueSpaceGraph();
        this.drawSaturationSpaceGraph();
        this.updateURL(); // Update URL when resetting
        this.saveToHistory('Reset to original colors');
    }
    
    loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Load colors from URL
        const colorsParam = urlParams.get('colors');
        if (colorsParam) {
            try {
                const colors = colorsParam.split(',').map(c => c.startsWith('#') ? c : '#' + c);
                if (colors.length >= 3 && colors.every(c => this.validateHex(c))) {
                    this.colors = colors;
                    this.originalColors = [...colors];
                    this.bandCount = colors.length;
                    
                    // Update DOM elements if they exist
                    const bandCountInput = document.getElementById('bandCount');
                    if (bandCountInput) bandCountInput.value = this.bandCount;
                }
            } catch (e) {
                console.warn('Invalid colors in URL:', e);
            }
        }
        
        // Load locked colors from URL
        const lockedParam = urlParams.get('locked');
        if (lockedParam) {
            try {
                const lockedIndices = lockedParam.split(',').map(i => parseInt(i)).filter(i => !isNaN(i));
                this.lockedColors = new Set(lockedIndices);
            } catch (e) {
                console.warn('Invalid locked indices in URL:', e);
            }
        }
        
        // Load algorithm from URL
        const algorithmParam = urlParams.get('algorithm');
        if (algorithmParam && ['hsl', 'lab', 'rgb', 'bezier'].includes(algorithmParam)) {
            const algorithmSelect = document.getElementById('smoothingAlgorithm');
            if (algorithmSelect) {
                algorithmSelect.value = algorithmParam;
                this.updateAlgorithmDescription(algorithmParam);
            }
        }
        
        // Load strength from URL
        const strengthParam = urlParams.get('strength');
        if (strengthParam) {
            const strength = parseFloat(strengthParam);
            if (!isNaN(strength) && strength >= 0 && strength <= 1) {
                const strengthSlider = document.getElementById('smoothingStrength');
                const strengthValue = document.getElementById('smoothingStrengthValue');
                if (strengthSlider) strengthSlider.value = strength;
                if (strengthValue) strengthValue.textContent = strength.toFixed(1);
            }
        }
    }
    
    updateURL() {
        const urlParams = new URLSearchParams();
        
        // Add colors (remove # prefix for cleaner URLs)
        const colorsString = this.colors.map(c => c.replace('#', '')).join(',');
        urlParams.set('colors', colorsString);
        
        // Add locked colors if any
        if (this.lockedColors.size > 0) {
            const lockedString = Array.from(this.lockedColors).sort((a, b) => a - b).join(',');
            urlParams.set('locked', lockedString);
        }
        
        // Add algorithm if not default (hsl)
        const algorithm = document.getElementById('smoothingAlgorithm').value;
        if (algorithm !== 'hsl') {
            urlParams.set('algorithm', algorithm);
        }
        
        // Add strength if not default (0.5)
        const strength = parseFloat(document.getElementById('smoothingStrength').value);
        if (strength !== 0.5) {
            urlParams.set('strength', strength.toString());
        }
        
        // Update URL without page reload
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
    }
    
    async copyShareableURL() {
        const currentUrl = window.location.href;
        
        try {
            await navigator.clipboard.writeText(currentUrl);
            this.showCopyFeedback('copyUrlBtn', 'URL copied!');
        } catch (err) {
            console.error('Failed to copy URL: ', err);
            this.showCopyFeedback('copyUrlBtn', 'Copy failed');
        }
    }
    
    exportAsFile() {
        try {
            // Create export data
            const exportData = {
                metadata: {
                    title: "Color Scale Export",
                    exportDate: new Date().toISOString(),
                    totalColors: this.colors.length,
                    algorithm: document.getElementById('smoothingAlgorithm').value,
                    strength: parseFloat(document.getElementById('smoothingStrength').value)
                },
                colors: this.colors,
                originalColors: this.originalColors,
                lockedIndices: Array.from(this.lockedColors)
            };
            
            // Convert to JSON string
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // Create and trigger download
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `color-scale-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Show success feedback
            this.showCopyFeedback('exportJsonBtn', 'File downloaded!');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showCopyFeedback('exportJsonBtn', 'Export failed');
        }
    }
    
    async copyForFigma() {
        // Create SVG rectangles that Figma can interpret as editable shapes
        const width = 100; // Width per rectangle
        const height = 120; // Height to match preview
        const textHeight = 20; // Space for hex code text
        const totalWidth = this.colors.length * width;
        const totalHeight = height + textHeight;
        
        let svgContent = `<svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;
        
        this.colors.forEach((color, index) => {
            const x = index * width;
            // Add color rectangle
            svgContent += `<rect x="${x}" y="0" width="${width}" height="${height}" fill="${color}" />`;
            // Add hex code text below
            svgContent += `<text x="${x + width/2}" y="${height + 15}" fill="#4a5568" font-size="12" text-anchor="middle" font-family="system-ui">${color}</text>`;
        });
        
        svgContent += '</svg>';
        
        try {
            await navigator.clipboard.writeText(svgContent);
            this.showCopyFeedback('copyFigma', 'Copied for Figma!');
        } catch (err) {
            console.error('Failed to copy: ', err);
            this.showCopyFeedback('copyFigma', 'Copy failed');
        }
    }
    
    async copyCommaList() {
        const colorList = this.colors.join(', ');
        
        try {
            await navigator.clipboard.writeText(colorList);
            this.showCopyFeedback('copyList', 'Copied list!');
        } catch (err) {
            console.error('Failed to copy: ', err);
            this.showCopyFeedback('copyList', 'Copy failed');
        }
    }
    
    showCopyFeedback(buttonId, message) {
        const button = document.getElementById(buttonId);
        
        // Check if it's an icon button
        if (button.classList.contains('btn-icon')) {
            // For icon buttons, show a temporary tooltip-like feedback
            const originalTitle = button.title;
            const originalSvg = button.innerHTML;
            
            // Show checkmark icon for success or X for failure
            const isSuccess = !message.includes('failed') && !message.includes('Need colors');
            const feedbackIcon = isSuccess ? 
                '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>' :
                '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>';
            
            button.innerHTML = feedbackIcon;
            button.title = message;
            button.style.background = isSuccess ? '#d4edda' : '#f8d7da';
            button.style.color = isSuccess ? '#155724' : '#721c24';
            button.style.borderColor = isSuccess ? '#c3e6cb' : '#f5c6cb';
            
            setTimeout(() => {
                button.innerHTML = originalSvg;
                button.title = originalTitle;
                button.style.background = '';
                button.style.color = '';
                button.style.borderColor = '';
            }, 1500);
        } else {
            // For text buttons, use the original method
            const originalText = button.textContent;
            button.textContent = message;
            button.style.background = '#d4edda';
            button.style.color = '#155724';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
                button.style.color = '';
            }, 1000);
        }
    }
    
    async copyGraphForFigma() {
        if (this.colors.length < 2) {
            this.showCopyFeedback('copyGraphFigma', 'Need colors first');
            return;
        }
        
        const width = 440;
        const height = 160;
        const margin = { top: 30, right: 30, bottom: 30, left: 40 };
        const graphWidth = width - margin.left - margin.right;
        const graphHeight = height - margin.top - margin.bottom;
        
        // Convert colors to lightness values
        const lightnessValues = this.colors.map(color => {
            const hsl = ColorUtils.hexToHsl(color);
            return hsl ? hsl.l : 0;
        });
        
        // Find min/max for scaling
        const minLightness = Math.min(...lightnessValues);
        const maxLightness = Math.max(...lightnessValues);
        const range = maxLightness - minLightness || 1;
        
        let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Background
        svgContent += `<rect width="100%" height="100%" fill="#f8f9fa"/>`;
        
        // Grid lines
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = margin.top + (i / gridLines) * graphHeight;
            svgContent += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#cbd5e0" stroke-width="1" opacity="0.6"/>`;
        }
        
        // Axis labels
        svgContent += `<text x="25" y="25" fill="#718096" font-size="11" text-anchor="middle" font-family="system-ui">100%</text>`;
        svgContent += `<text x="25" y="140" fill="#718096" font-size="11" text-anchor="middle" font-family="system-ui">0%</text>`;
        svgContent += `<text x="12" y="82" fill="#4a5568" font-size="12" text-anchor="middle" font-family="system-ui">L*</text>`;
        svgContent += `<text x="220" y="155" fill="#4a5568" font-size="12" text-anchor="middle" font-family="system-ui">Color Index</text>`;
        
        // Create path data
        let pathData = '';
        const points = [];
        
        for (let i = 0; i < this.colors.length; i++) {
            const x = margin.left + (i / (this.colors.length - 1)) * graphWidth;
            const normalizedValue = (lightnessValues[i] - minLightness) / range;
            const y = height - margin.bottom - normalizedValue * graphHeight;
            
            points.push({ x, y, index: i });
            
            if (i === 0) {
                pathData += `M ${x} ${y}`;
            } else {
                pathData += ` L ${x} ${y}`;
            }
        }
        
        // Add the line
        svgContent += `<path d="${pathData}" fill="none" stroke="#4a5568" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
        
        // Add points
        points.forEach(point => {
            const fillColor = this.lockedColors.has(point.index) ? '#2d3748' : '#ffffff';
            const strokeColor = this.lockedColors.has(point.index) ? '#1a202c' : '#4a5568';
            svgContent += `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
        });
        
        svgContent += '</svg>';
        
        try {
            await navigator.clipboard.writeText(svgContent);
            this.showCopyFeedback('copyGraphFigma', 'Graph copied!');
        } catch (err) {
            console.error('Failed to copy graph: ', err);
            this.showCopyFeedback('copyGraphFigma', 'Copy failed');
        }
    }
    
    async copyHueGraphForFigma() {
        if (this.colors.length < 2) {
            this.showCopyFeedback('copyHueGraphFigma', 'Need colors first');
            return;
        }
        
        const width = 440;
        const height = 160;
        const margin = { top: 30, right: 30, bottom: 30, left: 40 };
        const graphWidth = width - margin.left - margin.right;
        const graphHeight = height - margin.top - margin.bottom;
        
        // Convert colors to hue values
        const hueValues = this.colors.map(color => {
            const hsl = ColorUtils.hexToHsl(color);
            return hsl ? hsl.h : 0;
        });
        
        // Find min/max for scaling
        let minHue = Math.min(...hueValues);
        let maxHue = Math.max(...hueValues);
        
        // Handle wraparound and ensure reasonable range
        if (minHue === maxHue) {
            minHue = Math.max(0, maxHue - 30);
            maxHue = Math.min(360, maxHue + 30);
        }
        
        const range = maxHue - minHue;
        if (range < 20) {
            const center = (minHue + maxHue) / 2;
            minHue = center - 10;
            maxHue = center + 10;
        }
        
        // Create SVG
        let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Background
        svgContent += `<rect width="100%" height="100%" fill="#f8f9fa"/>`;
        
        // Grid lines
        for (let i = 0; i <= 4; i++) {
            const y = margin.top + (i / 4) * graphHeight;
            svgContent += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
        }
        
        // Y-axis labels
        svgContent += `<text x="25" y="35" font-family="system-ui" font-size="11" fill="#64748b" text-anchor="middle">${Math.round(maxHue)}°</text>`;
        svgContent += `<text x="25" y="${height - 20}" font-family="system-ui" font-size="11" fill="#64748b" text-anchor="middle">${Math.round(minHue)}°</text>`;
        svgContent += `<text x="12" y="${height/2 + 5}" font-family="system-ui" font-size="12" fill="#475569" text-anchor="middle" font-weight="500">H°</text>`;
        
        // X-axis label
        svgContent += `<text x="${width/2}" y="${height - 5}" font-family="system-ui" font-size="12" fill="#475569" text-anchor="middle" font-weight="500">Color Index</text>`;
        
        // Create path data
        let pathData = '';
        const points = [];
        
        for (let i = 0; i < this.colors.length; i++) {
            const x = margin.left + (i / (this.colors.length - 1)) * graphWidth;
            const normalizedValue = (hueValues[i] - minHue) / (maxHue - minHue);
            const y = height - margin.bottom - normalizedValue * graphHeight;
            
            points.push({ x, y, index: i });
            
            if (i === 0) {
                pathData += `M ${x} ${y}`;
            } else {
                pathData += ` L ${x} ${y}`;
            }
        }
        
        // Add line
        svgContent += `<path d="${pathData}" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
        
        // Add points
        points.forEach(point => {
            const isLocked = this.lockedColors.has(point.index);
            const fillColor = isLocked ? '#d97706' : '#ffffff';
            const strokeColor = isLocked ? '#b45309' : '#d97706';
            
            svgContent += `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
        });
        
        svgContent += '</svg>';
        
        try {
            await navigator.clipboard.writeText(svgContent);
            this.showCopyFeedback('copyHueGraphFigma', 'Hue graph copied!');
        } catch (err) {
            console.error('Failed to copy hue graph: ', err);
            this.showCopyFeedback('copyHueGraphFigma', 'Copy failed');
        }
    }
    
    async copySaturationGraphForFigma() {
        if (this.colors.length < 2) {
            this.showCopyFeedback('copySaturationGraphFigma', 'Need colors first');
            return;
        }
        
        const width = 440;
        const height = 160;
        const margin = { top: 30, right: 30, bottom: 30, left: 40 };
        const graphWidth = width - margin.left - margin.right;
        const graphHeight = height - margin.top - margin.bottom;
        
        // Convert colors to saturation values
        const saturationValues = this.colors.map(color => {
            const hsl = ColorUtils.hexToHsl(color);
            return hsl ? hsl.s : 0;
        });
        
        // Find min/max for scaling
        let minSaturation = Math.min(...saturationValues);
        let maxSaturation = Math.max(...saturationValues);
        
        // Handle edge case where all saturations are the same
        if (minSaturation === maxSaturation) {
            minSaturation = Math.max(0, maxSaturation - 10);
            maxSaturation = Math.min(100, maxSaturation + 10);
        }
        
        // Ensure we have some range to display
        const range = maxSaturation - minSaturation;
        if (range < 10) {
            const center = (minSaturation + maxSaturation) / 2;
            minSaturation = Math.max(0, center - 5);
            maxSaturation = Math.min(100, center + 5);
        }
        
        // Create SVG
        let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Background
        svgContent += `<rect width="100%" height="100%" fill="#f8f9fa"/>`;
        
        // Grid lines
        for (let i = 0; i <= 4; i++) {
            const y = margin.top + (i / 4) * graphHeight;
            svgContent += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
        }
        
        // Y-axis labels
        svgContent += `<text x="25" y="35" font-family="system-ui" font-size="11" fill="#64748b" text-anchor="middle">${Math.round(maxSaturation)}%</text>`;
        svgContent += `<text x="25" y="${height - 20}" font-family="system-ui" font-size="11" fill="#64748b" text-anchor="middle">${Math.round(minSaturation)}%</text>`;
        svgContent += `<text x="12" y="${height/2 + 5}" font-family="system-ui" font-size="12" fill="#475569" text-anchor="middle" font-weight="500">S%</text>`;
        
        // X-axis label
        svgContent += `<text x="${width/2}" y="${height - 5}" font-family="system-ui" font-size="12" fill="#475569" text-anchor="middle" font-weight="500">Color Index</text>`;
        
        // Create path data
        let pathData = '';
        const points = [];
        
        for (let i = 0; i < this.colors.length; i++) {
            const x = margin.left + (i / (this.colors.length - 1)) * graphWidth;
            const normalizedValue = (saturationValues[i] - minSaturation) / (maxSaturation - minSaturation);
            const y = height - margin.bottom - normalizedValue * graphHeight;
            
            points.push({ x, y, index: i });
            
            if (i === 0) {
                pathData += `M ${x} ${y}`;
            } else {
                pathData += ` L ${x} ${y}`;
            }
        }
        
        // Add line (using green color for saturation)
        svgContent += `<path d="${pathData}" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
        
        // Add points
        points.forEach(point => {
            const isLocked = this.lockedColors.has(point.index);
            const fillColor = isLocked ? '#059669' : '#ffffff';
            const strokeColor = isLocked ? '#047857' : '#059669';
            
            svgContent += `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
        });
        
        svgContent += '</svg>';
        
        try {
            await navigator.clipboard.writeText(svgContent);
            this.showCopyFeedback('copySaturationGraphFigma', 'Saturation graph copied!');
        } catch (err) {
            console.error('Failed to copy saturation graph: ', err);
            this.showCopyFeedback('copySaturationGraphFigma', 'Copy failed');
        }
    }
    
    async copyAllForFigma() {
        if (this.colors.length < 2) {
            this.showCopyFeedback('copyAllForFigma', 'Need colors first');
            return;
        }
        
        // Create a comprehensive SVG that includes color bands and all three graphs
        const frameWidth = 1200;
        const frameHeight = 300;
        const margin = 40;
        const spacing = 20;
        
        // Calculate dimensions for each section
        const colorBandHeight = 80;
        const graphHeight = 160;
        const graphWidth = (frameWidth - margin * 2 - spacing * 2) / 3; // Three graphs side by side
        
        let svgContent = `<svg width="${frameWidth}" height="${frameHeight}" viewBox="0 0 ${frameWidth} ${frameHeight}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Background
        svgContent += `<rect width="100%" height="100%" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>`;
        
        // Title
        svgContent += `<text x="${frameWidth/2}" y="25" font-family="system-ui" font-size="14" font-weight="600" fill="#1e293b" text-anchor="middle">Color Scale Analysis</text>`;
        
        // Color bands section
        const colorBandY = 50;
        const bandWidth = (frameWidth - margin * 2) / this.colors.length;
        
        this.colors.forEach((color, index) => {
            const x = margin + index * bandWidth;
            svgContent += `<rect x="${x}" y="${colorBandY}" width="${bandWidth}" height="${colorBandHeight}" fill="${color}" stroke="none"/>`;
            
            // Add color labels
            svgContent += `<text x="${x + bandWidth/2}" y="${colorBandY + colorBandHeight + 15}" font-family="system-ui" font-size="10" fill="#64748b" text-anchor="middle">${color}</text>`;
        });
        
        // Graphs section
        const graphY = colorBandY + colorBandHeight + 40;
        
        // Helper function to create graph data
        const createGraphData = (values, minVal, maxVal, color, label, unit) => {
            const points = [];
            let pathData = '';
            
            for (let i = 0; i < values.length; i++) {
                const x = (i / (values.length - 1)) * (graphWidth - 80) + 40;
                const normalizedValue = (values[i] - minVal) / (maxVal - minVal);
                const y = graphHeight - 30 - normalizedValue * (graphHeight - 60);
                
                points.push({ x, y, index: i });
                
                if (i === 0) {
                    pathData += `M ${x} ${y}`;
                } else {
                    pathData += ` L ${x} ${y}`;
                }
            }
            
            return { points, pathData, minVal, maxVal, color, label, unit };
        };
        
        // Lightness graph
        const lightnessValues = this.colors.map(color => {
            const hsl = ColorUtils.hexToHsl(color);
            return hsl ? hsl.l : 0;
        });
        const minLightness = Math.min(...lightnessValues);
        const maxLightness = Math.max(...lightnessValues);
        const lightnessData = createGraphData(lightnessValues, minLightness, maxLightness, '#3b82f6', 'Lightness', '%');
        
        // Hue graph
        const hueValues = this.colors.map(color => {
            const hsl = ColorUtils.hexToHsl(color);
            return hsl ? hsl.h : 0;
        });
        let minHue = Math.min(...hueValues);
        let maxHue = Math.max(...hueValues);
        if (minHue === maxHue) {
            minHue = Math.max(0, maxHue - 30);
            maxHue = Math.min(360, maxHue + 30);
        }
        const hueData = createGraphData(hueValues, minHue, maxHue, '#d97706', 'Hue', '°');
        
        // Saturation graph
        const saturationValues = this.colors.map(color => {
            const hsl = ColorUtils.hexToHsl(color);
            return hsl ? hsl.s : 0;
        });
        let minSaturation = Math.min(...saturationValues);
        let maxSaturation = Math.max(...saturationValues);
        if (minSaturation === maxSaturation) {
            minSaturation = Math.max(0, maxSaturation - 10);
            maxSaturation = Math.min(100, maxSaturation + 10);
        }
        const saturationData = createGraphData(saturationValues, minSaturation, maxSaturation, '#059669', 'Saturation', '%');
        
        // Draw the three graphs
        const graphsData = [lightnessData, hueData, saturationData];
        
        graphsData.forEach((data, graphIndex) => {
            const graphX = margin + graphIndex * (graphWidth + spacing);
            
            // Graph background
            svgContent += `<rect x="${graphX}" y="${graphY}" width="${graphWidth}" height="${graphHeight}" fill="#f8f9fa" stroke="#e2e8f0" stroke-width="1"/>`;
            
            // Grid lines
            for (let i = 0; i <= 4; i++) {
                const y = graphY + 20 + (i / 4) * (graphHeight - 40);
                svgContent += `<line x1="${graphX + 30}" y1="${y}" x2="${graphX + graphWidth - 20}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
            }
            
            // Y-axis labels
            svgContent += `<text x="${graphX + 20}" y="${graphY + 25}" font-family="system-ui" font-size="10" fill="#64748b" text-anchor="middle">${Math.round(data.maxVal)}${data.unit}</text>`;
            svgContent += `<text x="${graphX + 20}" y="${graphY + graphHeight - 15}" font-family="system-ui" font-size="10" fill="#64748b" text-anchor="middle">${Math.round(data.minVal)}${data.unit}</text>`;
            
            // Graph title
            svgContent += `<text x="${graphX + graphWidth/2}" y="${graphY + 15}" font-family="system-ui" font-size="12" font-weight="500" fill="#475569" text-anchor="middle">${data.label}</text>`;
            
            // X-axis label
            svgContent += `<text x="${graphX + graphWidth/2}" y="${graphY + graphHeight - 5}" font-family="system-ui" font-size="10" fill="#64748b" text-anchor="middle">Color Index</text>`;
            
            // Translate path data to absolute coordinates
            const translatedPath = data.pathData.replace(/([ML])\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g, (match, command, x, y) => {
                return `${command} ${parseFloat(x) + graphX} ${parseFloat(y) + graphY}`;
            });
            
            // Draw line
            svgContent += `<path d="${translatedPath}" fill="none" stroke="${data.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
            
            // Draw points
            data.points.forEach(point => {
                const isLocked = this.lockedColors.has(point.index);
                const fillColor = isLocked ? data.color : '#ffffff';
                const strokeColor = data.color;
                
                svgContent += `<circle cx="${point.x + graphX}" cy="${point.y + graphY}" r="3" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
            });
        });
        
        svgContent += '</svg>';
        
        try {
            await navigator.clipboard.writeText(svgContent);
            this.showCopyFeedback('copyAllForFigma', 'All assets copied!');
        } catch (err) {
            console.error('Failed to copy all assets: ', err);
            this.showCopyFeedback('copyAllForFigma', 'Copy failed');
        }
    }
    
    async importFromClipboard() {
        try {
            // Check if clipboard API is available
            if (!navigator.clipboard || !navigator.clipboard.readText) {
                alert('Clipboard access is not available in your browser. Please use a modern browser and ensure the page is served over HTTPS.');
                return;
            }
            
            // Read clipboard content
            const clipboardText = await navigator.clipboard.readText();
            
            if (!clipboardText || clipboardText.trim() === '') {
                alert('Clipboard is empty. Please copy some Figma elements first.');
                return;
            }
            
            // Parse colors from clipboard data
            const colors = this.parseColorsFromClipboard(clipboardText);
            
            if (colors.length === 0) {
                alert('No valid colors found in clipboard data. Make sure you copied Figma rectangles or other elements with fill colors.');
                return;
            }
            
            if (colors.length > 20) {
                const proceed = confirm(`Found ${colors.length} colors. This will be limited to 20 colors (the maximum). Continue?`);
                if (!proceed) return;
                colors.splice(20); // Limit to 20 colors
            }
            
            // Update the application with imported colors
            this.bandCount = colors.length;
            this.colors = [...colors];
            this.originalColors = [...colors];
            this.lockedColors.clear(); // Clear all locks when importing
            
            // Update UI
            document.getElementById('bandCount').value = this.bandCount;
            
            this.renderEditor();
            this.updatePreview();
            this.drawColorSpaceGraph();
            this.drawHueSpaceGraph();
            this.drawSaturationSpaceGraph();
            this.updateURL();
            this.saveToHistory(`Imported ${colors.length} colors from clipboard`);
            
            // Show success feedback
            const button = document.getElementById('importClipboardBtn');
            const originalText = button.innerHTML;
            button.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px; margin-right: 8px;">
                <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
            </svg>Imported ${colors.length} colors!`;
            button.style.background = 'var(--color-success-600)';
            button.style.color = 'white';
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.background = '';
                button.style.color = '';
            }, 2000);
            
        } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import from clipboard. Make sure you have copied valid Figma data and granted clipboard permissions.');
        }
    }
    
    parseColorsFromClipboard(clipboardText) {
        const colors = [];
        const seenColors = new Set(); // Prevent duplicates
        
        // Common color patterns to match
        const patterns = [
            // Hex colors (#RRGGBB or #RGB)
            /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g,
            // RGB colors rgb(r, g, b)
            /rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
            // RGBA colors rgba(r, g, b, a)
            /rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/gi,
            // HSL colors hsl(h, s%, l%)
            /hsl\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/gi,
            // Common Figma patterns
            /fill:\s*#([0-9A-Fa-f]{6})/g,
            /color:\s*#([0-9A-Fa-f]{6})/g,
            /background:\s*#([0-9A-Fa-f]{6})/g,
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(clipboardText)) !== null) {
                let hexColor = null;
                
                if (match[0].startsWith('#')) {
                    // Direct hex color
                    hexColor = match[1].length === 3 ? 
                        `#${match[1][0]}${match[1][0]}${match[1][1]}${match[1][1]}${match[1][2]}${match[1][2]}` : 
                        `#${match[1]}`;
                } else if (match[0].toLowerCase().startsWith('rgb')) {
                    // RGB color - convert to hex
                    const r = parseInt(match[1]);
                    const g = parseInt(match[2]);
                    const b = parseInt(match[3]);
                    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
                        hexColor = ColorUtils.rgbToHex(r, g, b);
                    }
                } else if (match[0].toLowerCase().startsWith('hsl')) {
                    // HSL color - convert to hex
                    const h = parseFloat(match[1]);
                    const s = parseFloat(match[2]) / 100;
                    const l = parseFloat(match[3]) / 100;
                    const rgb = ColorUtils.hslToRgb(h, s, l);
                    if (rgb) {
                        hexColor = ColorUtils.rgbToHex(rgb.r, rgb.g, rgb.b);
                    }
                } else if (match[1]) {
                    // Pattern with captured hex group
                    hexColor = `#${match[1]}`;
                }
                
                // Validate and add color
                if (hexColor && this.isValidHexColor(hexColor) && !seenColors.has(hexColor.toLowerCase())) {
                    colors.push(hexColor.toUpperCase());
                    seenColors.add(hexColor.toLowerCase());
                }
            }
        });
        
        return colors;
    }
    
    isValidHexColor(hex) {
        return /^#[0-9A-Fa-f]{6}$/.test(hex);
    }
    
    async importFromFile(file) {
        if (!file) return;
        
        try {
            const fileText = await file.text();
            let colors = [];
            
            // Determine file type and parse accordingly
            const fileName = file.name.toLowerCase();
            const isYaml = fileName.endsWith('.yaml') || fileName.endsWith('.yml');
            
            if (isYaml) {
                colors = this.parseColorsFromYAML(fileText);
            } else {
                // Assume JSON
                colors = this.parseColorsFromJSON(fileText);
            }
            
            if (colors.length === 0) {
                alert('No valid colors found in the file. Please check the format.');
                return;
            }
            
            if (colors.length > 20) {
                const proceed = confirm(`Found ${colors.length} colors. This will be limited to 20 colors (the maximum). Continue?`);
                if (!proceed) return;
                colors.splice(20);
            }
            
            // Update the application with imported colors
            this.bandCount = colors.length;
            this.colors = [...colors];
            this.originalColors = [...colors];
            this.lockedColors.clear();
            
            // Update UI
            document.getElementById('bandCount').value = this.bandCount;
            
            this.renderEditor();
            this.updatePreview();
            this.drawColorSpaceGraph();
            this.drawHueSpaceGraph();
            this.drawSaturationSpaceGraph();
            this.updateURL();
            this.saveToHistory(`Imported ${colors.length} colors from ${file.name}`);
            
            // Show success feedback
            const button = document.getElementById('importFileBtn');
            const originalText = button.innerHTML;
            button.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px; margin-right: 8px;">
                <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
            </svg>Imported ${colors.length} colors!`;
            button.style.background = 'var(--color-success-600)';
            button.style.color = 'white';
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.background = '';
                button.style.color = '';
            }, 2000);
            
        } catch (error) {
            console.error('File import failed:', error);
            alert(`Failed to import from file: ${error.message}`);
        }
        
        // Clear the file input for next use
        document.getElementById('fileInput').value = '';
    }
    
    parseColorsFromJSON(jsonText) {
        try {
            const data = JSON.parse(jsonText);
            return this.extractColorsFromData(data);
        } catch (error) {
            throw new Error('Invalid JSON format');
        }
    }
    
    parseColorsFromYAML(yamlText) {
        try {
            // Simple YAML parser for colors (handles basic structures)
            const lines = yamlText.split('\n');
            const colors = [];
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('#') || trimmedLine === '') continue;
                
                // Look for color values in various YAML formats
                const colorMatch = trimmedLine.match(/(?:color|hex|value)?\s*:?\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})/i);
                if (colorMatch) {
                    const color = this.normalizeColor(colorMatch[1]);
                    if (color && this.isValidHexColor(color)) {
                        colors.push(color);
                    }
                }
            }
            
            return colors;
        } catch (error) {
            throw new Error('Failed to parse YAML format');
        }
    }
    
    extractColorsFromData(data) {
        const colors = [];
        const visited = new Set();
        
        const extractRecursive = (obj) => {
            if (typeof obj === 'string') {
                const color = this.normalizeColor(obj);
                if (color && this.isValidHexColor(color) && !visited.has(color.toLowerCase())) {
                    colors.push(color);
                    visited.add(color.toLowerCase());
                }
            } else if (Array.isArray(obj)) {
                obj.forEach(extractRecursive);
            } else if (obj && typeof obj === 'object') {
                Object.values(obj).forEach(extractRecursive);
            }
        };
        
        extractRecursive(data);
        return colors;
    }
    
    normalizeColor(colorString) {
        if (!colorString || typeof colorString !== 'string') return null;
        
        const trimmed = colorString.trim();
        
        // Handle hex colors
        if (trimmed.startsWith('#')) {
            if (trimmed.length === 4) {
                // Convert #RGB to #RRGGBB
                return '#' + trimmed[1] + trimmed[1] + trimmed[2] + trimmed[2] + trimmed[3] + trimmed[3];
            } else if (trimmed.length === 7) {
                return trimmed.toUpperCase();
            }
        }
        
        return null;
    }
    
    // History System Methods
    setupHistorySystem() {
        // History toggle button
        document.getElementById('historyToggle').addEventListener('click', () => {
            this.toggleHistory();
        });
        
        // History close button
        document.getElementById('historyClose').addEventListener('click', () => {
            this.closeHistory();
        });
        
        // History clear button
        document.getElementById('historyClear').addEventListener('click', () => {
            this.clearHistory();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            if (e.key === 'Escape' && this.isHistoryOpen) {
                this.closeHistory();
            }
        });
    }
    
    saveToHistory(action, skipSimilar = true) {
        const state = {
            colors: [...this.colors],
            lockedColors: new Set(this.lockedColors),
            bandCount: this.bandCount,
            timestamp: new Date(),
            action: action
        };
        
        // Skip if colors are identical to last entry (unless forced)
        if (skipSimilar && this.history.length > 0) {
            const lastState = this.history[this.history.length - 1];
            if (JSON.stringify(lastState.colors) === JSON.stringify(state.colors) &&
                lastState.bandCount === state.bandCount) {
                return;
            }
        }
        
        this.history.push(state);
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
        
        this.updateHistoryUI();
        this.saveHistoryToStorage();
    }
    
    undo() {
        if (this.history.length <= 1) return; // Keep at least the initial state
        
        // Remove current state and restore previous
        this.history.pop();
        const previousState = this.history[this.history.length - 1];
        
        this.restoreState(previousState);
        this.updateHistoryUI();
        this.saveHistoryToStorage();
    }
    
    restoreFromHistory(index) {
        if (index < 0 || index >= this.history.length) return;
        
        // Get the state we want to restore to
        const state = this.history[index];
        
        // Restore the state
        this.restoreState(state);
        
        // Extract the original action name, removing any existing "Restored to:" prefixes
        let originalAction = state.action;
        if (originalAction.startsWith('Restored to: ')) {
            originalAction = originalAction.replace(/^Restored to: /, '');
        }
        
        // Add this as a new current state to preserve history
        this.saveToHistory(`Restored to: ${originalAction}`);
    }
    
    restoreState(state) {
        this.colors = [...state.colors];
        this.lockedColors = new Set(state.lockedColors);
        this.bandCount = state.bandCount;
        
        // Update UI elements
        document.getElementById('bandCount').value = this.bandCount;
        
        // Re-render everything
        this.renderEditor();
        this.updatePreview();
        this.drawColorSpaceGraph();
        this.drawHueSpaceGraph();
        this.drawSaturationSpaceGraph();
        this.updateURL();
    }
    
    toggleHistory() {
        if (this.isHistoryOpen) {
            this.closeHistory();
        } else {
            this.openHistory();
        }
    }
    
    openHistory() {
        this.isHistoryOpen = true;
        document.body.classList.add('history-open');
        document.getElementById('historyPanel').classList.add('open');
        this.updateHistoryUI();
    }
    
    closeHistory() {
        this.isHistoryOpen = false;
        document.body.classList.remove('history-open');
        document.getElementById('historyPanel').classList.remove('open');
    }
    
    updateHistoryUI() {
        // Update current colors display
        const currentColorsContainer = document.getElementById('currentColors');
        currentColorsContainer.innerHTML = this.colors.map(color => 
            `<div class="history-color-swatch" style="background-color: ${color}"></div>`
        ).join('');
        
        // Update timeline
        const timeline = document.getElementById('historyTimeline');
        timeline.innerHTML = '';
        
        // Show history in reverse order (newest first)
        const reversedHistory = [...this.history].reverse();
        reversedHistory.forEach((state, reverseIndex) => {
            const actualIndex = this.history.length - 1 - reverseIndex;
            if (actualIndex === this.history.length - 1) return; // Skip current state
            
            const item = document.createElement('div');
            item.className = 'history-item';
            item.onclick = () => this.restoreFromHistory(actualIndex);
            
            const timeAgo = this.getTimeAgo(state.timestamp);
            
            item.innerHTML = `
                <div class="history-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
                    </svg>
                </div>
                <div class="history-info">
                    <div class="history-label">${state.action}</div>
                    <div class="history-timestamp">${timeAgo}</div>
                    <div class="history-colors">
                        ${state.colors.map(color => 
                            `<div class="history-color-swatch" style="background-color: ${color}"></div>`
                        ).join('')}
                    </div>
                </div>
            `;
            
            timeline.appendChild(item);
        });
    }
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const diffMs = now - timestamp;
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        // If within 24 hours, show HH:MM:SS format
        if (diffHours < 24) {
            const hours = timestamp.getHours().toString().padStart(2, '0');
            const minutes = timestamp.getMinutes().toString().padStart(2, '0');
            const seconds = timestamp.getSeconds().toString().padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }
        
        // For older entries, show relative time
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
        }
        if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months === 1 ? '' : 's'} ago`;
        }
        
        const years = Math.floor(diffDays / 365);
        return `${years} year${years === 1 ? '' : 's'} ago`;
    }
    
    // LocalStorage methods for history persistence
    loadHistoryFromStorage() {
        try {
            const saved = localStorage.getItem('colorBandHistory');
            if (saved) {
                const data = JSON.parse(saved);
                // Convert timestamp and lockedColors back to correct types
                this.history = data.map(item => ({
                    ...item,
                    timestamp: new Date(item.timestamp),
                    lockedColors: new Set(item.lockedColors)
                }));
                this.updateHistoryUI();
            }
        } catch (error) {
            console.warn('Failed to load history from localStorage:', error);
            this.history = [];
        }
    }
    
    saveHistoryToStorage() {
        try {
            // Convert Set to Array for JSON serialization
            const serializable = this.history.map(item => ({
                ...item,
                lockedColors: Array.from(item.lockedColors)
            }));
            localStorage.setItem('colorBandHistory', JSON.stringify(serializable));
        } catch (error) {
            console.warn('Failed to save history to localStorage:', error);
        }
    }
    
    clearHistory() {
        if (confirm('Are you sure you want to clear all edit history? This action cannot be undone.')) {
            this.history = [];
            this.updateHistoryUI();
            this.saveHistoryToStorage();
        }
    }
    
    // Audit functionality
    setupAuditToggles() {
        const contrastToggle = document.getElementById('contrastRatio');
        const tailwindToggle = document.getElementById('tailwindComparison');
        const tailwindControl = document.getElementById('tailwindControl');
        const tailwindSelect = document.getElementById('tailwindColorSelect');
        const tailwindContainer = document.getElementById('tailwindComparisonContainer');
        
        // Contrast ratio toggle
        contrastToggle.addEventListener('change', (e) => {
            // Update preview to show/hide contrast ratio indicators
            this.updatePreview();
        });
        
        // Tailwind toggle
        tailwindToggle.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            tailwindControl.style.display = isChecked ? 'flex' : 'none';
            tailwindContainer.style.display = isChecked ? 'block' : 'none';
            
            if (isChecked) {
                this.updateTailwindComparison();
            }
        });
        
        // Tailwind color selection
        tailwindSelect.addEventListener('change', () => {
            this.tailwindColorManuallySelected = true;
            if (tailwindToggle.checked) {
                this.updateTailwindComparison();
            }
        });
        
        // Auto-select Tailwind color based on hue
        this.autoSelectTailwindColor();
    }
    
    autoSelectTailwindColor() {
        if (this.colors.length === 0) return;
        
        // Get the dominant hue from the middle colors
        const middleIndex = Math.floor(this.colors.length / 2);
        const color = this.colors[middleIndex];
        const hsl = ColorUtils.hexToHsl(color);
        
        if (!hsl) return; // Exit if color conversion fails
        
        const hue = hsl.h * 360;
        
        // Map hue ranges to Tailwind colors (more accurate mapping)
        const hueMapping = [
            { range: [0, 12], color: 'red' },      // Pure red
            { range: [12, 25], color: 'orange' },   // Red-orange 
            { range: [25, 45], color: 'amber' },    // Orange-yellow
            { range: [45, 65], color: 'yellow' },   // Pure yellow
            { range: [65, 85], color: 'lime' },     // Yellow-green
            { range: [85, 140], color: 'green' },   // Green range (wider)
            { range: [140, 170], color: 'emerald' }, // Blue-green
            { range: [170, 185], color: 'teal' },   // Teal range
            { range: [185, 200], color: 'cyan' },   // Cyan range  
            { range: [200, 220], color: 'sky' },    // Light blue
            { range: [220, 245], color: 'blue' },   // Pure blue
            { range: [245, 265], color: 'indigo' }, // Blue-violet
            { range: [265, 290], color: 'violet' }, // Purple-violet
            { range: [290, 320], color: 'purple' }, // Purple range
            { range: [320, 340], color: 'fuchsia' }, // Magenta-purple
            { range: [340, 355], color: 'pink' },   // Pink-red
            { range: [355, 360], color: 'red' }     // Back to red
        ];
        
        const selectedColor = hueMapping.find(mapping => 
            hue >= mapping.range[0] && hue < mapping.range[1]
        )?.color || 'blue';
        
        document.getElementById('tailwindColorSelect').value = selectedColor;
    }
    
    updateTailwindComparison() {
        const selectedColor = document.getElementById('tailwindColorSelect').value;
        
        // Tailwind CSS color palette
        const tailwindColors = {
            red: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
            orange: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
            amber: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
            yellow: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'],
            lime: ['#f7fee7', '#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#365314', '#1a2e05'],
            green: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
            emerald: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
            teal: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'],
            cyan: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
            sky: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'],
            blue: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
            indigo: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],
            violet: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
            purple: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'],
            fuchsia: ['#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75'],
            pink: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
            rose: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'],
            slate: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
            gray: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'],
            zinc: ['#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b'],
            neutral: ['#fafafa', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717'],
            stone: ['#fafaf9', '#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c', '#292524', '#1c1917']
        };
        
        const colors = tailwindColors[selectedColor] || tailwindColors.blue;
        const preview = document.getElementById('tailwindBandPreview');
        
        preview.innerHTML = '';
        colors.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-preview-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = `${selectedColor}-${(index + 1) * 100}`;
            preview.appendChild(swatch);
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ColorBandEditor();
});