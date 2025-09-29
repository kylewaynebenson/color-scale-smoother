# Color Scale Smoother

<img width="1000" height="auto" alt="Screenshot of color scale smoother app" src="https://github.com/user-attachments/assets/6bce0055-5edc-44aa-b54d-2557302ec894" />

Create color scales, apply smoothing approaches, and visualize how your colors relate to each other in color space.

## Live Demo

Visit the live application: [Color Band Smoother](https://kylewaynebenson.github.io/color-scale-smoother/)

## Features

- **Real-time Graph**: Visual representation of color lightness, hue, and saturation progression
- **Auto-apply Smoothing**: Automatically applies smoothing to unlocked hex codes. Interpolate easily through various color spaces (HSL, LAB, RGB, or Bezier).
- **Adjust Band Count**: Use the slider to set how many color bands you want (3-20)
- **Edit Colors**: Click any color band to open the color picker, use the lock icon to preserve specific colors during smoothing.
- **Complete History**: Edit and still able to recall old versions.
- **Import and Export**: Copy as css from figma, then import. Or use the export buttons to show your work in Figma.

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

## License

MIT License - feel free to use this in your own projects.
