# Dissatisfied

### NOTE: Safari version is not tested due to lack of access to Mac device.

Get rid of parts of UI when focusing on content.

A browser extension that provides keyboard shortcuts to toggle focus mode on YouTube and Twitter/X for a more immersive experience.

**🔒 Privacy First:** Zero data collection. Everything runs locally on your device.

## Features

### Focus Modes

- **YouTube Focus Mode** (Ctrl+Shift+Y / Cmd+Shift+Y on Mac)
  - Automatically enables theater mode
  - Hides distracting sidebars and recommendations
  - Full-width video player
  - Scrollable page to access comments

- **Twitter/X Focus Mode** (Ctrl+Shift+X / Cmd+Shift+X on Mac)
  - Hides sidebars and trending topics
  - Centers and widens the main timeline
  - Removes header distractions

### Persistence Modes

- **Per-Tab Mode (Default)**: Each tab has its own state. Focus mode resets when you navigate away or close the tab. Perfect for fine-grained control.
- **Global Mode**: Settings persist across all tabs and sessions. Once enabled, the state is shared across all tabs.

### Customization

- **Twitter/X Width Control**: Adjust the timeline width (50-100%) in the options page to find your perfect viewing experience.

Configure your preferences in the extension options page.

## Installation

### From Store
- **Chrome Web Store**: Coming Soon
- **Firefox Add-ons**: Coming Soon
- **Safari Extensions**: Coming Soon

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

## Configuration

### Options Page

Access the options page to:
- Choose between Per-Tab and Global persistence modes
- View keyboard shortcuts
- Access your browser's shortcut editor

Open the options page by clicking the extension icon or right-clicking it and selecting "Options".

### Customizing Shortcuts

**Chrome/Edge/Opera**
1. Go to `chrome://extensions/shortcuts`
2. Find "Dissatisfied"
3. Click the pencil icon to customize

**Firefox**
1. Go to `about:addons`
2. Click the gear icon → "Manage Extension Shortcuts"
3. Find "Dissatisfied" and customize

**Safari**
1. Open Safari → Settings → Extensions
2. Select "Dissatisfied"
3. Configure shortcuts in the extension settings

## Privacy & Permissions

**Dissatisfied collects ZERO data.** No analytics, no tracking, no telemetry.

### Permissions Explained

- **`storage`**: Save your preference settings locally on your device
- **`activeTab`**: Access the current tab to inject focus mode styles
- **`scripting`**: Inject CSS and toggle YouTube's theater mode
- **`host_permissions`**: Only YouTube and Twitter/X domains

All data stays on your device. No external requests are made.

📄 Read our full [Privacy Policy](PRIVACY.md) for detailed information.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute.

## License

See [LICENSE](LICENSE) for license information.

## Documentation

- [User Guide](USER_GUIDE.md) - Comprehensive guide to using the extension
- [Privacy Policy](PRIVACY.md) - Detailed privacy and permissions information
- [Changelog](CHANGELOG.md) - Version history and updates
- [Contributing](CONTRIBUTING.md) - How to contribute to the project

## Roadmap

- [ ] Additional site support (Reddit, Medium, etc.)
- [ ] Customizable styling options
- [ ] Export/import settings
- [ ] More granular UI controls
- [ ] Per-site configuration options

## Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Visit the extension's homepage

---

## FAQ

**Q: How does Global Mode work?**  
A: Global Mode saves your preference across all tabs and sessions. When you toggle focus mode on/off, that state is remembered and applies to all tabs. You still use the keybind on each tab, but the state is shared globally.

**Q: Can I adjust the Twitter timeline width?**  
A: Yes! Go to the options page and use the slider to adjust the width from 50% to 100%. Your preference is saved automatically.

**Q: Does this work on mobile?**  
A: Currently desktop only. Mobile browser extension support is limited.

**Q: Is my data safe?**  
A: We don't collect any data. Everything runs locally on your device. See our [Privacy Policy](PRIVACY.md).

---

Made with 💖 for distraction-free browsing

**Note**: This is open-source software. You can review the entire codebase to verify our privacy claims.