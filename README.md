# Color Band Smoother

A clean, professional web application for creating and smoothing color gradients with interactive controls and real-time visualization.

## Features

- **Interactive Color Editing**: Click any color band to modify individual colors
- **Lock System**: Lock specific colors to preserve them during smoothing operations
- **Multiple Smoothing Algorithms**:
  - HSL interpolation for perceptually uniform transitions
  - LAB interpolation for scientifically accurate color mixing
  - RGB interpolation for traditional linear blending
  - Bezier interpolation for custom curve-based smoothing
- **Real-time Graph**: Visual representation of color lightness progression
- **Auto-apply Smoothing**: Automatically applies smoothing as you adjust parameters
- **Export Functionality**: Download your color bands as JSON or individual hex values

## Usage

1. **Adjust Band Count**: Use the slider to set how many color bands you want (3-20)
2. **Choose Algorithm**: Select from HSL, LAB, RGB, or Bezier smoothing methods
3. **Set Intensity**: Control how much smoothing is applied (0-100%)
4. **Edit Colors**: Click any color band to open the color picker
5. **Lock Colors**: Click the lock icon to preserve specific colors during smoothing
6. **Export**: Use the export buttons to save your color palette

## Live Demo

Visit the live application: [Color Band Smoother](https://kylewaynebenson.github.io/color-scale-smoother/)

## Local Development

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/color-scale-smoother.git
   cd color-scale-smoother
   ```

2. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```

3. Open your browser to `http://localhost:8000`

## Files

- `index.html` - Main application structure
- `styles.css` - Clean, professional styling with neutral greys
- `app.js` - Core application logic and UI interactions
- `colorUtils.js` - Color space conversion utilities
- `smoothingAlgorithms.js` - Color interpolation algorithms

## Browser Support

Works in all modern browsers that support ES6+ JavaScript features.

## License

MIT License - feel free to use this in your own projects.
