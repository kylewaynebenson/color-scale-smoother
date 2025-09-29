class ColorBandEditor {
    constructor() {
        this.bandCount = 10;
        this.colors = [];
        this.lockedColors = new Set();
        this.originalColors = [];
        
        // Algorithm descriptions
        this.algorithmDescriptions = {
            'hsl': 'Interpolates between colors maintaining hue relationships for natural gradients.',
            'lab': 'Uses perceptually uniform LAB color space for smooth visual transitions.',
            'rgb': 'Simple linear blending between red, green, and blue values.',
            'bezier': 'Creates smooth curves through color space using control points.'
        };
        
        this.initializeDefaultColors();
        this.setupEventListeners();
        this.loadFromURL(); // Load state from URL if present
        this.renderEditor();
        this.updatePreview();
        this.drawColorSpaceGraph();
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
        
        // Band count slider
        const bandCountSlider = document.getElementById('bandCount');
        const bandCountValue = document.getElementById('bandCountValue');
        
        bandCountSlider.addEventListener('input', (e) => {
            this.bandCount = parseInt(e.target.value);
            bandCountValue.textContent = this.bandCount;
            this.adjustBandCount();
            this.updateURL(); // Update URL when band count changes
        });
        
        // Smoothing strength slider - auto apply
        const strengthSlider = document.getElementById('smoothingStrength');
        const strengthValue = document.getElementById('strengthValue');
        
        strengthSlider.addEventListener('input', (e) => {
            strengthValue.textContent = parseFloat(e.target.value).toFixed(1);
            this.applySmoothing();
            this.updateURL(); // Update URL when strength changes
        });
        
        // Smoothing algorithm dropdown - auto apply
        const algorithmSelect = document.getElementById('smoothingAlgorithm');
        algorithmSelect.addEventListener('change', (e) => {
            this.updateAlgorithmDescription(e.target.value);
            this.applySmoothing();
            this.updateURL(); // Update URL when algorithm changes
        });
        
        // Initialize algorithm description
        this.updateAlgorithmDescription(algorithmSelect.value);
        
        // Copy URL button
        document.getElementById('copyUrlBtn').addEventListener('click', () => {
            this.copyShareableURL();
        });
        
        // Import from clipboard button
        document.getElementById('importClipboardBtn').addEventListener('click', () => {
            this.importFromClipboard();
        });
        
        // Refresh/reapply algorithm button
        document.getElementById('reapplyAlgorithmBtn').addEventListener('click', () => {
            this.applySmoothing();
        });
        
        // Copy buttons
        document.getElementById('copyFigma').addEventListener('click', () => {
            this.copyForFigma();
        });
        
        document.getElementById('copyList').addEventListener('click', () => {
            this.copyCommaList();
        });
        
        document.getElementById('copyGraphFigma').addEventListener('click', () => {
            this.copyGraphForFigma();
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
        this.updateURL();
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
        if (this.lockedColors.has(index)) {
            this.lockedColors.delete(index);
        } else {
            this.lockedColors.add(index);
        }
        this.renderEditor();
        this.drawColorSpaceGraph();
        this.updateURL(); // Update URL when lock state changes
    }
    
    updateColor(index, hex) {
        this.colors[index] = hex;
        this.updatePreview();
        this.drawColorSpaceGraph();
        this.updateURL(); // Update URL when color changes
    }
    
    updateAlgorithmDescription(algorithm) {
        const descriptionElement = document.getElementById('algorithmDescription');
        descriptionElement.textContent = this.algorithmDescriptions[algorithm];
    }
    
    updatePreview() {
        const previewContainer = document.getElementById('colorBandPreview');
        previewContainer.innerHTML = '';
        
        this.colors.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-preview-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = `${index}: ${color}${this.lockedColors.has(index) ? ' (locked)' : ''}`;
            
            // Add lock overlay if locked
            if (this.lockedColors.has(index)) {
                const lockOverlay = document.createElement('div');
                lockOverlay.className = 'lock-overlay';
                lockOverlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z" /></svg>';
                swatch.appendChild(lockOverlay);
            }
            
            previewContainer.appendChild(swatch);
        });
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
        this.updateURL(); // Update URL when smoothing is applied
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
    
    resetColors() {
        this.colors = [...this.originalColors];
        this.lockedColors.clear();
        this.renderEditor();
        this.updatePreview();
        this.drawColorSpaceGraph();
        this.updateURL(); // Update URL when resetting
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
                    const bandCountSlider = document.getElementById('bandCount');
                    const bandCountValue = document.getElementById('bandCountValue');
                    if (bandCountSlider) bandCountSlider.value = this.bandCount;
                    if (bandCountValue) bandCountValue.textContent = this.bandCount;
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
            document.getElementById('bandCountValue').textContent = this.bandCount;
            
            this.renderEditor();
            this.updatePreview();
            this.drawColorSpaceGraph();
            this.updateURL();
            
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ColorBandEditor();
});