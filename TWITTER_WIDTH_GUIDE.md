# Twitter Width Implementation Guide

## Overview

The Twitter width feature allows users to customize the width of the Twitter/X timeline when focus mode is enabled. The width is adjustable from 50% to 100% in 5% increments, with a default of 80%.

---

## How It Works

### 1. Storage

The width value is stored in `chrome.storage.local`:

```javascript
{
  "twitter_width": 80  // Default: 80 (represents 80%)
}
```

### 2. CSS Variable

The width is applied via CSS custom property in `twitter.css`:

```css
[data-testid='primaryColumn'] {
  width: var(--twitter-width, 80%) !important;
  /* ... */
}
```

### 3. Three Points of Injection

The `--twitter-width` CSS variable is injected at **three different points** to ensure it works in all scenarios:

#### A. **Content Script** (Primary Method)
- File: `src/content-twitter.ts`
- When: On page load and when width changes
- How: `document.documentElement.style.setProperty('--twitter-width', '80%')`

#### B. **Background Script (Chrome/Firefox)**
- File: `src/background.ts`
- When: When applying styles via keyboard shortcut
- How: `chrome.scripting.executeScript()` to inject CSS variable

#### C. **Background Script (Safari)**
- File: `src/background.safari.ts`
- When: When applying styles via keyboard shortcut
- How: `browser.tabs.executeScript()` to inject CSS variable

---

## Implementation Details

### Content Script (`content-twitter.ts`)

```typescript
// Storage keys
const TWITTER_WIDTH_KEY = 'twitter_width'
const DEFAULT_TWITTER_WIDTH = 80

// Apply Twitter width CSS variable
async function applyTwitterWidth() {
  try {
    const result = await chrome.storage.local.get(TWITTER_WIDTH_KEY)
    const width = result[TWITTER_WIDTH_KEY] || DEFAULT_TWITTER_WIDTH
    document.documentElement.style.setProperty('--twitter-width', `${width}%`)
  } catch (error) {
    console.error('Error applying Twitter width:', error)
  }
}

// Apply when