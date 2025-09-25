// Smoothing algorithms for color interpolation

class SmoothingAlgorithms {
    
    // HSL interpolation - good for maintaining hue relationships
    static hslInterpolate(colors, lockedIndices = []) {
        const smoothed = [...colors];
        
        // Convert all colors to HSL
        const hslColors = colors.map(color => ColorUtils.hexToHsl(color));
        
        // Find segments between locked points
        const segments = this.findSegments(lockedIndices, colors.length);
        
        segments.forEach(segment => {
            if (segment.length <= 2) return; // No interpolation needed
            
            const startHsl = hslColors[segment[0]];
            const endHsl = hslColors[segment[segment.length - 1]];
            
            // Handle hue interpolation (circular)
            let hueDiff = endHsl.h - startHsl.h;
            if (Math.abs(hueDiff) > 180) {
                if (hueDiff > 0) {
                    endHsl.h -= 360;
                } else {
                    endHsl.h += 360;
                }
                hueDiff = endHsl.h - startHsl.h;
            }
            
            // Interpolate middle points
            for (let i = 1; i < segment.length - 1; i++) {
                const factor = i / (segment.length - 1);
                const globalIndex = segment[i];
                
                const h = (startHsl.h + hueDiff * factor) % 360;
                const s = startHsl.s + (endHsl.s - startHsl.s) * factor;
                const l = startHsl.l + (endHsl.l - startHsl.l) * factor;
                
                smoothed[globalIndex] = ColorUtils.hslToHex(h < 0 ? h + 360 : h, s, l);
            }
        });
        
        return smoothed;
    }
    
    // LAB interpolation - perceptually uniform
    static labInterpolate(colors, lockedIndices = []) {
        const smoothed = [...colors];
        
        // Convert all colors to LAB
        const labColors = colors.map(color => {
            const rgb = ColorUtils.hexToRgb(color);
            return ColorUtils.rgbToLab(rgb.r, rgb.g, rgb.b);
        });
        
        // Find segments between locked points
        const segments = this.findSegments(lockedIndices, colors.length);
        
        segments.forEach(segment => {
            if (segment.length <= 2) return;
            
            const startLab = labColors[segment[0]];
            const endLab = labColors[segment[segment.length - 1]];
            
            // Interpolate middle points
            for (let i = 1; i < segment.length - 1; i++) {
                const factor = i / (segment.length - 1);
                const globalIndex = segment[i];
                
                const L = startLab.L + (endLab.L - startLab.L) * factor;
                const A = startLab.A + (endLab.A - startLab.A) * factor;
                const B = startLab.B + (endLab.B - startLab.B) * factor;
                
                const rgb = ColorUtils.labToRgb(L, A, B);
                smoothed[globalIndex] = ColorUtils.rgbToHex(rgb.r, rgb.g, rgb.b);
            }
        });
        
        return smoothed;
    }
    
    // RGB linear interpolation - simple but can look muddy
    static rgbLinearInterpolate(colors, lockedIndices = []) {
        const smoothed = [...colors];
        
        // Convert all colors to RGB
        const rgbColors = colors.map(color => ColorUtils.hexToRgb(color));
        
        // Find segments between locked points
        const segments = this.findSegments(lockedIndices, colors.length);
        
        segments.forEach(segment => {
            if (segment.length <= 2) return;
            
            const startRgb = rgbColors[segment[0]];
            const endRgb = rgbColors[segment[segment.length - 1]];
            
            // Interpolate middle points
            for (let i = 1; i < segment.length - 1; i++) {
                const factor = i / (segment.length - 1);
                const globalIndex = segment[i];
                
                const r = startRgb.r + (endRgb.r - startRgb.r) * factor;
                const g = startRgb.g + (endRgb.g - startRgb.g) * factor;
                const b = startRgb.b + (endRgb.b - startRgb.b) * factor;
                
                smoothed[globalIndex] = ColorUtils.rgbToHex(r, g, b);
            }
        });
        
        return smoothed;
    }
    
    // Bezier curve interpolation - smooth curves
    static bezierInterpolate(colors, lockedIndices = []) {
        const smoothed = [...colors];
        
        // Find segments between locked points
        const segments = this.findSegments(lockedIndices, colors.length);
        
        segments.forEach(segment => {
            if (segment.length <= 2) return;
            
            const startColor = colors[segment[0]];
            const endColor = colors[segment[segment.length - 1]];
            
            // Create control points for bezier curve
            const startRgb = ColorUtils.hexToRgb(startColor);
            const endRgb = ColorUtils.hexToRgb(endColor);
            
            // Simple bezier with automatic control points
            const controlPoint1 = {
                r: startRgb.r + (endRgb.r - startRgb.r) * 0.25,
                g: startRgb.g + (endRgb.g - startRgb.g) * 0.25,
                b: startRgb.b + (endRgb.b - startRgb.b) * 0.25
            };
            
            const controlPoint2 = {
                r: startRgb.r + (endRgb.r - startRgb.r) * 0.75,
                g: startRgb.g + (endRgb.g - startRgb.g) * 0.75,
                b: startRgb.b + (endRgb.b - startRgb.b) * 0.75
            };
            
            // Interpolate using cubic bezier
            for (let i = 1; i < segment.length - 1; i++) {
                const t = i / (segment.length - 1);
                const globalIndex = segment[i];
                
                const rgb = this.cubicBezier(startRgb, controlPoint1, controlPoint2, endRgb, t);
                smoothed[globalIndex] = ColorUtils.rgbToHex(rgb.r, rgb.g, rgb.b);
            }
        });
        
        return smoothed;
    }
    
    // Helper function to calculate cubic bezier point
    static cubicBezier(p0, p1, p2, p3, t) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;
        
        return {
            r: uuu * p0.r + 3 * uu * t * p1.r + 3 * u * tt * p2.r + ttt * p3.r,
            g: uuu * p0.g + 3 * uu * t * p1.g + 3 * u * tt * p2.g + ttt * p3.g,
            b: uuu * p0.b + 3 * uu * t * p1.b + 3 * u * tt * p2.b + ttt * p3.b
        };
    }
    
    // Find segments between locked indices
    static findSegments(lockedIndices, totalLength) {
        const segments = [];
        const sortedLocked = [...lockedIndices].sort((a, b) => a - b);
        
        // Ensure first and last indices are included
        if (sortedLocked[0] !== 0) {
            sortedLocked.unshift(0);
        }
        if (sortedLocked[sortedLocked.length - 1] !== totalLength - 1) {
            sortedLocked.push(totalLength - 1);
        }
        
        // Create segments between locked points
        for (let i = 0; i < sortedLocked.length - 1; i++) {
            const segment = [];
            for (let j = sortedLocked[i]; j <= sortedLocked[i + 1]; j++) {
                segment.push(j);
            }
            if (segment.length > 1) {
                segments.push(segment);
            }
        }
        
        return segments;
    }
    
    // Apply smoothing with strength factor
    static applyWithStrength(originalColors, smoothedColors, strength) {
        if (strength === 1) return smoothedColors;
        if (strength === 0) return originalColors;
        
        return originalColors.map((original, index) => {
            const smoothed = smoothedColors[index];
            
            const originalRgb = ColorUtils.hexToRgb(original);
            const smoothedRgb = ColorUtils.hexToRgb(smoothed);
            
            const r = originalRgb.r + (smoothedRgb.r - originalRgb.r) * strength;
            const g = originalRgb.g + (smoothedRgb.g - originalRgb.g) * strength;
            const b = originalRgb.b + (smoothedRgb.b - originalRgb.b) * strength;
            
            return ColorUtils.rgbToHex(r, g, b);
        });
    }
}