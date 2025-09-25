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
        // Band count slider
        const bandCountSlider = document.getElementById('bandCount');
        const bandCountValue = document.getElementById('bandCountValue');
        
        bandCountSlider.addEventListener('input', (e) => {
            this.bandCount = parseInt(e.target.value);
            bandCountValue.textContent = this.bandCount;
            this.adjustBandCount();
            this.renderEditor();
            this.updatePreview();
            this.drawColorSpaceGraph();
        });
        
        // Smoothing strength slider - auto apply
        const strengthSlider = document.getElementById('smoothingStrength');
        const strengthValue = document.getElementById('strengthValue');
        
        strengthSlider.addEventListener('input', (e) => {
            strengthValue.textContent = parseFloat(e.target.value).toFixed(1);
            this.applySmoothing();
        });
        
        // Smoothing algorithm dropdown - auto apply
        const algorithmSelect = document.getElementById('smoothingAlgorithm');
        algorithmSelect.addEventListener('change', (e) => {
            this.updateAlgorithmDescription(e.target.value);
            this.applySmoothing();
        });
        
        // Initialize algorithm description
        this.updateAlgorithmDescription(algorithmSelect.value);
        
        // Reset colors button
        document.getElementById('resetColorsBtn').addEventListener('click', () => {
            this.resetColors();
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
            lockBtn.innerHTML = this.lockedColors.has(index) ? 
                '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z" /></svg>' :
                '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H15V6C15,3.24 12.76,1 10,1S5,3.24 5,6H7A3,3 0 0,1 10,3A3,3 0 0,1 13,6V8H6A2,2 0 0,0 4,10V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V10A2,2 0 0,0 18,8Z" /></svg>';
            
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
                this.updateColor(index, e.target.value);
            });
            
            // Hex input
            const hexInput = document.createElement('input');
            hexInput.type = 'text';
            hexInput.className = 'hex-input';
            hexInput.value = color;
            hexInput.addEventListener('change', (e) => {
                const hex = this.validateHex(e.target.value);
                if (hex) {
                    this.updateColor(index, hex);
                    colorInput.value = hex;
                } else {
                    e.target.value = color; // Reset to current value
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
    
    toggleLock(index) {
        if (this.lockedColors.has(index)) {
            this.lockedColors.delete(index);
        } else {
            this.lockedColors.add(index);
        }
        this.renderEditor();
        this.updatePreview();
        this.drawColorSpaceGraph();
    }
    
    updateColor(index, hex) {
        this.colors[index] = hex;
        this.updatePreview();
        this.drawColorSpaceGraph();
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
            circle.className = this.lockedColors.has(point.index) ? 'locked' : 'unlocked';
            
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
    }
    
    async copyForFigma() {
        // Create SVG rectangles that Figma can interpret as editable shapes
        const width = 100; // Width per rectangle
        const height = 120; // Height to match preview
        const totalWidth = this.colors.length * width;
        
        let svgContent = `<svg width="${totalWidth}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        this.colors.forEach((color, index) => {
            const x = index * width;
            svgContent += `<rect x="${x}" y="0" width="${width}" height="${height}" fill="${color}" />`;
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ColorBandEditor();
});