# Persistence Mode Documentation

## Overview

The Dissatisfied extension now features two persistence modes that control how focus mode state is managed across tabs and sessions. This setting is synchronized between the background scripts and the options page using `chrome.storage.local`.

---

## Persistence Modes

### 1. Per-Tab Mode (Default)

**Behavior:**
- Each tab maintains its own independent focus state
- State is stored in memory (in the background script's `tabStates` Map)
- State is **lost** when:
  - You navigate away from the page
  - You close the tab
  - You refresh the page (unless in Global Mode)
  - Browser restarts

**Use Case:**
- You want quick, temporary focus mode
- You want different tabs to have different states
- You don't want focus mode to persist everywhere

**Example:**
```
Tab 1 (YouTube): Focus ON  → Navigate → Focus OFF
Tab 2 (YouTube): Focus OFF → Stays OFF
Tab 3 (Twitter): Focus ON  → Close tab → State lost
```

### 2. Global Mode

**Behavior:**
- Focus state is shared across **all tabs** of the same platform
- State is stored in `chrome.storage.local` (persists across sessions)
- State **persists** when:
  - You navigate to other pages
  - You close and reopen tabs
  - You restart the browser
  - You open new tabs

**Use Case:**
- You want focus mode enabled everywhere, always
- You want to toggle once and have it apply to all tabs
- You want state to persist across browser sessions

**Example:**
```
Tab 1 (YouTube): Toggle ON → All YouTube tabs turn ON
Tab 2 (YouTube): Auto-applies focus mode
New tabs: Auto-apply focus mode on load
Browser restart: State restored from storage
```

---

## Storage Schema

### Storage Keys

All keys are shared between `background.ts`, `background.safari.ts`, and `options.js`:

```javascript
const STORAGE_KEYS = {
  PERSISTENCE_MODE: 'persistence_mode',  // 'tab' | 'global'
  YOUTUBE_STATE: 'youtube_state',        // { enabled: boolean }
  TWITTER_STATE: 'twitter_state',        // { enabled: boolean }
  YOUTUBE_SESSIONS: 'youtube_sessions',  // { [tabId]: boolean }
  TWITTER_WIDTH: 'twitter_width',        // number (50-100)
}
```

### Storage Values

```javascript
// chrome.storage.local structure
{
  // User preference set in options page
  "persistence_mode": "tab" | "global",
  
  // Global state (only used in Global Mode)
  "youtube_state": {
    "enabled": false
  },
  "twitter_state": {
    "enabled": false
  },
  
  // Theater mode tracking (per-tab, persisted)
  "youtube_sessions": {
    "123": true,  // tab ID 123 had theater mode enabled by us
    "456": true
  },
  
  // Twitter width customization
  "twitter_width": 80  // percentage
}
```

---

## How It Works

### Per-Tab Mode Flow

```
1. User presses Ctrl+Shift+Y on Tab 1 (YouTube)
   ↓
2. Background script checks persistence mode → "tab"
   ↓
3. Look up tabStates Map for Tab 1
   ↓
4. Toggle: tabStates.set(tabId, { youtube: true, twitter: false })
   ↓
5. Apply styles to ONLY Tab 1
   ↓
6. Update badge to "ON" for Tab 1
   ↓
7. Other tabs remain unchanged
```

**On Page Load (Per-Tab Mode):**
```
1. Tab loads YouTube
   ↓
2. onUpdated listener fires
   ↓
3. Check persistence mode → "tab"
   ↓
4. Check tabStates Map for this tab
   ↓
5. If tabStates.youtube === true:
     Apply styles
   Else:
     Do nothing (tab starts fresh)
```

### Global Mode Flow

```
1. User presses Ctrl+Shift+Y on Tab 1 (YouTube)
   ↓
2. Background script checks persistence mode → "global"
   ↓
3. Read current state from chrome.storage.local
   ↓
4. Toggle: youtube_state.enabled = !youtube_state.enabled
   ↓
5. Save new state to chrome.storage.local
   ↓
6. Query ALL tabs
   ↓
7. For each YouTube tab:
     if (enabled) applyYouTubeStyles(tabId)
     else removeYouTubeStyles(tabId)
   ↓
8. Update badges for all YouTube tabs
   ↓
9. Content scripts receive storage.onChanged event
   ↓
10. Content scripts apply/remove styles via BroadcastChannel
```

**On Page Load (Global Mode):**
```
1. Tab loads YouTube
   ↓
2. onUpdated listener fires
   ↓
3. Check persistence mode → "global"
   ↓
4. Read youtube_state from chrome.storage.local
   ↓
5. If youtube_state.enabled === true:
     Apply styles immediately
   Else:
     Set badge to "OFF"
```

---

## Implementation Details

### Background Script (background.ts / background.safari.ts)

**Data Structures:**

```typescript
// Per-tab state (in-memory, cleared on tab close)
interface TabState {
  youtube: boolean
  twitter: boolean
}
const tabStates = new Map<number, TabState>()

// Theater mode tracking (persisted to storage)
const theaterSessions = new Map<number, boolean>()
```

**Key Functions:**

```typescript
// Check which mode we're in
async function getPersistenceMode(): Promise<'tab' | 'global'> {
  const mode = await getStoredState(STORAGE_KEYS.PERSISTENCE_MODE)
  return mode || 'tab'
}

// Get or create tab state
function getTabState(tabId: number): TabState {
  if (!tabStates.has(tabId)) {
    tabStates.set(tabId, { youtube: false, twitter: false })
  }
  return tabStates.get(tabId)!
}
```

**Command Handling:**

```typescript
// YouTube toggle
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-youtube-style') return
  
  const mode = await getPersistenceMode()
  
  if (mode === 'global') {
    // Toggle global state and apply to ALL tabs
    const state = await getStoredState(STORAGE_KEYS.YOUTUBE_STATE)
    const nextState = !state?.enabled
    await setStoredState(STORAGE_KEYS.YOUTUBE_STATE, { enabled: nextState })
    
    // Apply to all YouTube tabs
    const allTabs = await chrome.tabs.query({})
    for (const tab of allTabs) {
      if (isYouTubeUrl(tab.url)) {
        if (nextState) await applyYouTubeStyles(tab.id)
        else await removeYouTubeStyles(tab.id)
      }
    }
  } else {
    // Toggle only current tab
    const tabState = getTabState(tab.id)
    tabState.youtube = !tabState.youtube
    
    if (tabState.youtube) await applyYouTubeStyles(tab.id)
    else await removeYouTubeStyles(tab.id)
  }
})
```

### Options Page (options.js)

**Auto-Save on Change:**

```javascript
// When user selects a different mode
async function handlePersistenceModeChange(event) {
  const mode = event.target.value  // 'tab' or 'global'
  
  await chrome.storage.local.set({
    [STORAGE_KEYS.PERSISTENCE_MODE]: mode
  })
  
  showStatus('Saved!', 'success')
}
```

**Cross-Tab Sync:**

```javascript
// Listen for changes from other tabs/windows
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return
  
  if (changes[STORAGE_KEYS.PERSISTENCE_MODE]) {
    const newMode = changes[STORAGE_KEYS.PERSISTENCE_MODE].newValue
    const modeInput = document.getElementById(`mode-${newMode}`)
    if (modeInput) modeInput.checked = true
  }
})
```

### Content Scripts (content-youtube.ts / content-twitter.ts)

Content scripts work **independently** of persistence mode. They:
1. Listen for `chrome.storage.onChanged` events
2. Apply/remove styles when state changes
3. Use BroadcastChannel for instant cross-tab sync

The background script is responsible for deciding **when** to change the state based on persistence mode.

---

## User Experience

### Switching Between Modes

**From Per-Tab to Global:**
```
1. Open options page
2. Select "Global Mode"
3. Setting saved immediately
4. Next toggle applies to all tabs
5. State persists across sessions
```

**From Global to Per-Tab:**
```
1. Open options page
2. Select "Per-Tab Mode"
3. Setting saved immediately
4. Current state in storage is ignored
5. Each tab starts fresh
6. Next toggle applies only to current tab
```

### Expected Behavior

| Action | Per-Tab Mode | Global Mode |
|--------|--------------|-------------|
| Press Ctrl+Shift+Y | Toggle current tab only | Toggle ALL YouTube tabs |
| Navigate away | State lost | State persists |
| Close tab | State lost | State persists |
| Open new tab | Starts fresh (OFF) | Auto-applies if ON |
| Browser restart | All tabs start fresh | State restored |

---

## Debugging

### Check Current Mode

```javascript
chrome.storage.local.get('persistence_mode', (result) => {
  console.log('Current mode:', result.persistence_mode || 'tab')
})
```

### Check Global State

```javascript
chrome.storage.local.get(['youtube_state', 'twitter_state'], (result) => {
  console.log('YouTube global state:', result.youtube_state)
  console.log('Twitter global state:', result.twitter_state)
})
```

### Check Per-Tab State (from background script)

```javascript
// In background.ts console
console.log('Tab states:', Array.from(tabStates.entries()))
```

### Verify Sync

1. Open options page in Tab 1
2. Open options page in Tab 2
3. Change persistence mode in Tab 1
4. Tab 2 should update automatically

---

## Migration Notes

### For Existing Users

When updating from previous versions:
- Existing users will default to **Per-Tab Mode**
- No global state exists yet (starts with `enabled: false`)
- Theater sessions are preserved if they exist

### Clean Install

On fresh install:
- `persistence_mode` set to `'tab'` (default)
- All states set to `{ enabled: false }`
- No theater sessions exist

---

## Best Practices

### For Users

**Use Per-Tab Mode if:**
- ✅ You want quick, temporary focus mode
- ✅ You want different behavior in different tabs
- ✅ You don't mind re-enabling focus mode after navigation

**Use Global Mode if:**
- ✅ You want focus mode always enabled
- ✅ You want consistent behavior everywhere
- ✅ You want state to persist across browser sessions
- ✅ You rarely want to turn focus mode off

### For Developers

**When adding new platforms:**
1. Add state key to `STORAGE_KEYS`
2. Add default value to `DEFAULTS`
3. Handle in both command listeners (per-tab and global)
4. Handle in `onUpdated` listener (check mode)
5. Update options page if needed

**When debugging:**
- Check console for "Error applying..." messages
- Verify storage state in DevTools
- Check if persistence mode matches expected behavior
- Verify tab IDs are correct

---

## Troubleshooting

### Issue: Focus mode doesn't persist after navigation

**Cause:** In Per-Tab Mode, state is lost on navigation (by design)

**Solution:** Switch to Global Mode in options page

### Issue: All tabs toggle when I press the shortcut

**Cause:** You're in Global Mode

**Solution:** Switch to Per-Tab Mode if you want per-tab behavior

### Issue: Options page doesn't save

**Cause:** Storage permission issue or console error

**Solution:** 
1. Check browser console for errors
2. Verify `storage` permission in manifest
3. Check `chrome.storage.local` is available

### Issue: State doesn't sync across tabs

**Cause:** 
- Storage event not firing
- Content scripts not loaded
- BroadcastChannel not working

**Solution:**
1. Check content scripts are injected
2. Verify storage.onChanged listener is registered
3. Check BroadcastChannel is supported

---

## Future Enhancements

Possible improvements:
- [ ] Per-platform persistence mode (YouTube global, Twitter per-tab)
- [ ] Whitelist/blacklist for specific URLs
- [ ] Time-based auto-enable (e.g., always on during work hours)
- [ ] Profile-based settings (work profile vs personal profile)
- [ ] Import/export settings

---

## Summary

The persistence mode system provides flexible state management:
- **Per-Tab Mode**: Simple, temporary, tab-specific
- **Global Mode**: Persistent, cross-tab, cross-session
- **Synced**: Options page and background scripts use shared storage
- **User-friendly**: Auto-save, instant feedback, clear behavior

The architecture cleanly separates concerns:
- Background scripts handle mode logic
- Content scripts handle DOM manipulation
- Options page handles user preferences
- Storage API keeps everything in sync