export const STORAGE_KEYS = {
  YOUTUBE_PERSISTENCE_MODE: "youtube_persistence_mode",
  TWITTER_PERSISTENCE_MODE: "twitter_persistence_mode",
  TWITTER_WIDTH: "twitter_width",
  TWITTER_FONT_SIZE: "twitter_font_size",
  TWITTER_USE_DEFAULT_FONT: "twitter_use_default_font",
  TWITTER_FOCUS_CONTROLS: "twitter_focus_controls",
};

export const UI_KEYS = {
  LAST_OPEN_SITE: "ui_last_open_site",
  LAST_OPEN_SITE_AT: "ui_last_open_site_at",
};

export const DEFAULT_TWITTER_CONTROLS = Object.freeze({
  hideSidebarColumn: true,
  hideChatDrawer: true,
  hideGrokDrawer: true,
  hideHeader: true,
  centerTimeline: true,
});

export const DEFAULTS = Object.freeze({
  YOUTUBE_PERSISTENCE_MODE: "tab",
  TWITTER_PERSISTENCE_MODE: "tab",
  TWITTER_WIDTH: 80,
  TWITTER_FONT_SIZE: 15,
  TWITTER_USE_DEFAULT_FONT: true,
  TWITTER_FOCUS_CONTROLS: DEFAULT_TWITTER_CONTROLS,
});

export const TWITTER_CONTROL_KEYS = Object.keys(DEFAULT_TWITTER_CONTROLS);

export function sanitizeNumber(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function sanitizeTwitterControls(rawValue) {
  const normalized = { ...DEFAULT_TWITTER_CONTROLS };
  if (!rawValue || typeof rawValue !== "object") {
    return normalized;
  }

  for (const key of TWITTER_CONTROL_KEYS) {
    if (typeof rawValue[key] === "boolean") {
      normalized[key] = rawValue[key];
    }
  }

  return normalized;
}

export function detectSiteNameFromUrl(url) {
  if (!url) return "unknown";
  const lower = String(url).toLowerCase();

  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "twitter";
  if (lower.includes("excalidraw.com")) return "excalidraw";

  return "unknown";
}

export async function openOptionsPage() {
  // Prefer the MV3+ API when available; fall back to "open options by URL"
  try {
    if (globalThis.chrome?.runtime?.openOptionsPage) {
      await globalThis.chrome.runtime.openOptionsPage();
      return;
    }
    if (globalThis.browser?.runtime?.openOptionsPage) {
      await globalThis.browser.runtime.openOptionsPage();
      return;
    }
  } catch {
    // ignore; we try URL open below
  }

  const url =
    globalThis.chrome?.runtime?.getURL?.("ui/options/index.html") ||
    globalThis.browser?.runtime?.getURL?.("ui/options/index.html");

  if (url && globalThis.chrome?.tabs?.create) {
    await globalThis.chrome.tabs.create({ url });
  }
}
