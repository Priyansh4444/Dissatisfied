# Dissatisfied

Get rid of parts of UI when focusing on content.

A browser extension that provides keyboard shortcuts to toggle focus mode on YouTube and Twitter/X for a more immersive experience.

## Features

- **YouTube Focus Mode** (Ctrl+Shift+Y / Cmd+Shift+Y on Mac)
  - Enables theater mode
  - Hides distracting UI elements
  - Focus on the video content

- **Twitter/X Focus Mode** (Ctrl+Shift+X / Cmd+Shift+X on Mac)
  - Hides sidebars and recommendations
  - Focus on the timeline

## Installation

### From Store (Coming Soon)
- Chrome Web Store
- Firefox Add-ons
- Safari Extensions

### Manual Installation

#### Chrome
1. Build the extension: `bun run build:chrome`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/` folder

#### Firefox
1. Build the extension: `bun run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select any file in the `dist-firefox/` folder

#### Safari
1. Build the extension: `bun run build:safari`
2. The `dist-safari/` folder contains the web extension
3. For Safari, you'll need to create an Xcode project wrapper:
   - Open Xcode
   - Create a new Safari Extension project
   - Replace the extension folder with `dist-safari/` contents
   - Build and run from Xcode

## Development

### Prerequisites
- [Bun](https://bun.sh/) installed

### Setup
```bash
# Install dependencies
bun install

# Development mode (Chrome only, with hot reload)
bun run dev

# Build for specific browser
bun run build:chrome   # Build for Chrome (output: dist/)
bun run build:firefox  # Build for Firefox (output: dist-firefox/)
bun run build:safari   # Build for Safari (output: dist-safari/)

# Build for all browsers
bun run build:all
```

## Project Structure

```
.
├── public/
│   ├── manifest.json          # Chrome manifest (MV3)
│   ├── manifest.firefox.json  # Firefox manifest (MV3)
│   ├── manifest.safari.json   # Safari manifest (MV2)
│   └── icon*.png             # Extension icons
├── src/
│   ├── background.ts         # Chrome/Firefox background script
│   ├── background.safari.ts  # Safari background script (MV2)
│   ├── styles/
│   │   ├── youtube.css       # YouTube styling
│   │   └── twitter.css       # Twitter/X styling
│   └── ui/
│       ├── global.css        # Global UI styles
│       └── options/
│           ├── index.html    # Options page
│           └── options.css   # Options page styles
├── dist/                     # Chrome build output
├── dist-firefox/             # Firefox build output
├── dist-safari/              # Safari build output
└── build.ts                  # Build script
```

## Browser Compatibility

| Browser | Manifest Version | Status |
|---------|-----------------|--------|
| Chrome  | V3 | ✅ Supported |
| Firefox | V3 | ✅ Supported |
| Safari  | V2 | ✅ Supported |
| Edge    | V3 | ✅ (Use Chrome build) |
| Opera   | V3 | ✅ (Use Chrome build) |

## Customizing Shortcuts

### Chrome/Edge/Opera
1. Go to `chrome://extensions/shortcuts`
2. Find "Dissatisfied"
3. Click the pencil icon to customize

### Firefox
1. Go to `about:addons`
2. Click the gear icon
3. Select "Manage Extension Shortcuts"
4. Find "Dissatisfied" and customize

### Safari
1. Open Safari → Settings → Extensions
2. Select "Dissatisfied"
3. Use the built-in shortcut editor

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute.

## License

See [LICENSE](LICENSE) for license information.

## Roadmap if UI bugs me more in the future (unlikely)

- [ ] Additional site support (Reddit, Medium, etc.)
- [ ] Customizable styling options
- [ ] Per-site toggle persistence (do not reset on page reload)
- [ ] More granular UI controls -> hide specific elements by hovering and pressing `q`: might be good for devtools-like experience

## Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Visit the extension's homepage

---

**Note**: This extension requires appropriate permissions to inject CSS into YouTube and Twitter/X pages. All code runs locally in your browser - no data is collected or sent to external servers.