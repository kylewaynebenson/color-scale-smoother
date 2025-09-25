## Automatic Deployment

The included GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically deploy your changes whenever you push to the main branch.

## Testing Locally

```bash
# Clone and test locally
git clone https://github.com/yourusername/color-scale-smoother.git
cd color-scale-smoother
python3 -m http.server 8080
# Visit http://localhost:8080
```

The application is fully ready for GitHub Pages deployment!