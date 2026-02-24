//@ts-ignore Safari-compatible background script using browser API
import browser from 'webextension-polyfill'

import {
	DEFAULTS,
	STORAGE_KEYS,
	isTwitterUrl,
	isYouTubeUrl,
	type TwitterFocusControls,
} from './shared/extension-settings.ts'

// Per-tab state tracking (for per-tab mode)
interface TabState {
	youtube: boolean
	twitter: boolean
}

const tabStates = new Map<number, TabState>()

// Theater mode sessions (track which tabs we enabled theater mode on)
const theaterSessions = new Map<number, boolean>()

// Initialize extension on install
browser.runtime.onInstalled.addListener(
	async ({ reason }: { reason: string }) => {
		if (reason === 'install') {
			// Set default values
			await browser.storage.local.set({
				[STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE]:
					DEFAULTS.YOUTUBE_PERSISTENCE_MODE,
				[STORAGE_KEYS.TWITTER_PERSISTENCE_MODE]:
					DEFAULTS.TWITTER_PERSISTENCE_MODE,
				[STORAGE_KEYS.TWITTER_WIDTH]: DEFAULTS.TWITTER_WIDTH,
				[STORAGE_KEYS.TWITTER_FONT_SIZE]: DEFAULTS.TWITTER_FONT_SIZE,
				[STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT]:
					DEFAULTS.TWITTER_USE_DEFAULT_FONT,
				[STORAGE_KEYS.TWITTER_FOCUS_CONTROLS]: DEFAULTS.TWITTER_FOCUS_CONTROLS,
				[STORAGE_KEYS.YOUTUBE_STATE]: DEFAULTS.YOUTUBE_STATE,
				[STORAGE_KEYS.TWITTER_STATE]: DEFAULTS.TWITTER_STATE,
			})

			await browser.runtime.openOptionsPage()
		}

		// Always set initial badge
		await browser.browserAction.setBadgeText({ text: 'OFF' })
	},
)

// Open options page on icon click
browser.browserAction.onClicked.addListener(async () => {
	await browser.runtime.openOptionsPage()
})

// Load theater sessions on startup
browser.runtime.onStartup.addListener(async () => {
	const stored = await getStoredState(STORAGE_KEYS.YOUTUBE_SESSIONS)
	if (stored) {
		Object.entries(stored).forEach(([tabId, value]) => {
			theaterSessions.set(Number(tabId), value as boolean)
		})
	}
})

async function getStoredState(key: string): Promise<any> {
	const result = await browser.storage.local.get(key)
	return result[key]
}

async function setStoredState(key: string, value: any): Promise<void> {
	await browser.storage.local.set({ [key]: value })
}

async function getYoutubePersistenceMode(): Promise<'tab' | 'global'> {
	const mode = await getStoredState(STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE)
	return mode || DEFAULTS.YOUTUBE_PERSISTENCE_MODE
}

async function getTwitterPersistenceMode(): Promise<'tab' | 'global'> {
	const mode = await getStoredState(STORAGE_KEYS.TWITTER_PERSISTENCE_MODE)
	return mode || DEFAULTS.TWITTER_PERSISTENCE_MODE
}

async function saveTheaterSessions() {
	const obj: Record<number, boolean> = {}
	theaterSessions.forEach((value, key) => {
		obj[key] = value
	})
	await setStoredState(STORAGE_KEYS.YOUTUBE_SESSIONS, obj)
}

// Get or initialize tab state
function getTabState(tabId: number): TabState {
	if (!tabStates.has(tabId)) {
		tabStates.set(tabId, { youtube: false, twitter: false })
	}
	return tabStates.get(tabId)!
}

// Apply YouTube styles to a tab
async function applyYouTubeStyles(tabId: number): Promise<void> {
	try {
		await browser.tabs.insertCSS(tabId, {
			file: 'styles/youtube.css',
		})

		// Enable theater mode if not already enabled
		const results = await browser.tabs.executeScript(tabId, {
			code: `
				(function() {
					const playerPage = document.querySelector('ytd-watch-flexy, ytd-watch-grid');
					if (playerPage && !playerPage.hasAttribute('theater')) {
						const btn = document.querySelector('.ytp-size-button');
						if (btn) {
							btn.click();
							return true;
						}
					}
					return false;
				})();
			`,
		})

		if (results && results[0]) {
			theaterSessions.set(tabId, true)
			await saveTheaterSessions()
		}

		await browser.browserAction.setBadgeText({ tabId, text: 'ON' })
	} catch (error) {
		console.error('Error applying YouTube styles:', error)
	}
}

// Remove YouTube styles from a tab
async function removeYouTubeStyles(tabId: number): Promise<void> {
	try {
		await browser.tabs.removeCSS(tabId, {
			file: 'styles/youtube.css',
		})

		// Revert theater mode only if we enabled it
		const didWeToggle = theaterSessions.get(tabId)
		if (didWeToggle) {
			await browser.tabs.executeScript(tabId, {
				code: `
					(function() {
						const playerPage = document.querySelector('ytd-watch-flexy, ytd-watch-grid');
						if (playerPage && playerPage.hasAttribute('theater')) {
							const btn = document.querySelector('.ytp-size-button');
							if (btn) btn.click();
						}
					})();
				`,
			})
			theaterSessions.delete(tabId)
			await saveTheaterSessions()
		}

		await browser.browserAction.setBadgeText({ tabId, text: 'OFF' })
	} catch (error) {
		console.error('Error removing YouTube styles:', error)
	}
}

async function sendTwitterContentAction(
	tabId: number,
	action: 'apply-twitter-styles' | 'remove-twitter-styles',
): Promise<boolean> {
	try {
		await browser.tabs.sendMessage(tabId, { action })
		return true
	} catch {
		return false
	}
}

// Apply Twitter styles to a tab
async function applyTwitterStyles(tabId: number): Promise<void> {
	try {
		const didContentScriptHandleIt = await sendTwitterContentAction(
			tabId,
			'apply-twitter-styles',
		)

		if (!didContentScriptHandleIt) {
			const storedWidth = await getStoredState(STORAGE_KEYS.TWITTER_WIDTH)
			const twitterWidth = storedWidth || DEFAULTS.TWITTER_WIDTH
			const storedFontSize = await getStoredState(
				STORAGE_KEYS.TWITTER_FONT_SIZE,
			)
			const twitterFontSize = storedFontSize || DEFAULTS.TWITTER_FONT_SIZE
			const useDefaultFont =
				(await getStoredState(STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT)) !== false
			const storedControls = await getStoredState(
				STORAGE_KEYS.TWITTER_FOCUS_CONTROLS,
			)
			const rawControls = storedControls || DEFAULTS.TWITTER_FOCUS_CONTROLS
			const centerTimeline = Boolean(rawControls.centerTimeline)
			const twitterControls = {
				...rawControls,
				hideHeader: centerTimeline,
				centerTimeline,
			}
			const controlsJson = JSON.stringify(twitterControls)

			await browser.tabs.executeScript(tabId, {
				code: `
					(function() {
						const controls = ${controlsJson};
						const useDefault = ${useDefaultFont};
						const root = document.documentElement;
						root.classList.add('dissatisfied-active');
						root.style.setProperty('--twitter-width', '${twitterWidth}%');
						if (!useDefault) {
							root.classList.add('dissatisfied-twitter-custom-font');
							root.style.setProperty('--twitter-font-size', '${twitterFontSize}px');
							root.style.setProperty('--twitter-icon-scale', '${1 + (twitterFontSize / 15 - 1) * 0.5}');
						} else {
							root.classList.remove('dissatisfied-twitter-custom-font');
							root.style.removeProperty('--twitter-font-size');
							root.style.removeProperty('--twitter-icon-scale');
						}
						root.classList.toggle('dissatisfied-twitter-hide-sidebar', Boolean(controls.hideSidebarColumn));
						root.classList.toggle('dissatisfied-twitter-hide-chat', Boolean(controls.hideChatDrawer));
						root.classList.toggle('dissatisfied-twitter-hide-grok', Boolean(controls.hideGrokDrawer));
						root.classList.toggle('dissatisfied-twitter-hide-header', Boolean(controls.hideHeader));
						root.classList.toggle('dissatisfied-twitter-center-timeline', Boolean(controls.centerTimeline));
					})();
				`,
			})

			await browser.tabs.insertCSS(tabId, {
				file: 'styles/twitter.css',
			})
		}

		await browser.browserAction.setBadgeText({ tabId, text: 'ON' })
	} catch (error) {
		console.error('Error applying Twitter styles:', error)
	}
}

// Remove Twitter styles from a tab
async function removeTwitterStyles(tabId: number): Promise<void> {
	try {
		const didContentScriptHandleIt = await sendTwitterContentAction(
			tabId,
			'remove-twitter-styles',
		)

		if (!didContentScriptHandleIt) {
			await browser.tabs.removeCSS(tabId, {
				file: 'styles/twitter.css',
			})
			await browser.tabs.executeScript(tabId, {
				code: `
					(function() {
						const root = document.documentElement;
						root.classList.remove(
							'dissatisfied-active',
							'dissatisfied-twitter-custom-font',
							'dissatisfied-twitter-hide-sidebar',
							'dissatisfied-twitter-hide-chat',
							'dissatisfied-twitter-hide-grok',
							'dissatisfied-twitter-hide-header',
							'dissatisfied-twitter-center-timeline'
						);
						root.style.removeProperty('--twitter-width');
						root.style.removeProperty('--twitter-font-size');
						root.style.removeProperty('--twitter-icon-scale');
					})();
				`,
			})
		}

		await browser.browserAction.setBadgeText({ tabId, text: 'OFF' })
	} catch (error) {
		console.error('Error removing Twitter styles:', error)
	}
}

// Handle tab updates - apply state based on persistence mode
browser.tabs.onUpdated.addListener(
	async (
		tabId: number,
		changeInfo: browser.Tabs.OnUpdatedChangeInfoType,
		tab: browser.Tabs.Tab,
	) => {
		if (changeInfo.status !== 'complete' || !tab.url) {
			return
		}

		// Check YouTube
		if (isYouTubeUrl(tab.url)) {
			const mode = await getYoutubePersistenceMode()
			if (mode === 'global') {
				const state = await getStoredState(STORAGE_KEYS.YOUTUBE_STATE)
				if (state?.enabled) {
					await applyYouTubeStyles(tabId)
				} else {
					await browser.browserAction.setBadgeText({ tabId, text: 'OFF' })
				}
			} else {
				// Per-tab mode: check tab-specific state
				const tabState = getTabState(tabId)
				if (tabState.youtube) {
					await applyYouTubeStyles(tabId)
				}
			}
		}

		// Check Twitter
		if (isTwitterUrl(tab.url)) {
			const mode = await getTwitterPersistenceMode()
			if (mode === 'global') {
				const state = await getStoredState(STORAGE_KEYS.TWITTER_STATE)
				if (state?.enabled) {
					await applyTwitterStyles(tabId)
				} else {
					await browser.browserAction.setBadgeText({ tabId, text: 'OFF' })
				}
			} else {
				// Per-tab mode: check tab-specific state
				const tabState = getTabState(tabId)
				if (tabState.twitter) {
					await applyTwitterStyles(tabId)
				}
			}
		}
	},
)

// YouTube toggle command
browser.commands.onCommand.addListener(async (command: string) => {
	if (command !== 'toggle-youtube-style') {
		return
	}

	const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

	if (!tab || typeof tab.id !== 'number' || typeof tab.url !== 'string') {
		return
	}

	if (!isYouTubeUrl(tab.url)) {
		return
	}

	const mode = await getYoutubePersistenceMode()

	if (mode === 'global') {
		// Global mode: toggle for all tabs
		const currentState = await getStoredState(STORAGE_KEYS.YOUTUBE_STATE)
		const isEnabled = currentState?.enabled || false
		const nextState = !isEnabled

		await setStoredState(STORAGE_KEYS.YOUTUBE_STATE, { enabled: nextState })

		// Apply/remove to all YouTube tabs
		const allTabs = await browser.tabs.query({})
		for (const t of allTabs) {
			if (typeof t.id === 'number' && t.url && isYouTubeUrl(t.url)) {
				if (nextState) {
					await applyYouTubeStyles(t.id)
				} else {
					await removeYouTubeStyles(t.id)
				}
			}
		}
	} else {
		// Per-tab mode: toggle only current tab
		const tabState = getTabState(tab.id)
		const nextState = !tabState.youtube

		tabState.youtube = nextState

		if (nextState) {
			await applyYouTubeStyles(tab.id)
		} else {
			await removeYouTubeStyles(tab.id)
		}
	}
})

// Twitter toggle command
browser.commands.onCommand.addListener(async (command: string) => {
	if (command !== 'toggle-twitter-style') {
		return
	}

	const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

	if (!tab || typeof tab.id !== 'number' || typeof tab.url !== 'string') {
		return
	}

	if (!isTwitterUrl(tab.url)) {
		return
	}

	const mode = await getTwitterPersistenceMode()

	if (mode === 'global') {
		// Global mode: toggle for all tabs
		const currentState = await getStoredState(STORAGE_KEYS.TWITTER_STATE)
		const isEnabled = currentState?.enabled || false
		const nextState = !isEnabled

		await setStoredState(STORAGE_KEYS.TWITTER_STATE, { enabled: nextState })

		// Apply/remove to all Twitter tabs
		const allTabs = await browser.tabs.query({})
		for (const t of allTabs) {
			if (typeof t.id === 'number' && t.url && isTwitterUrl(t.url)) {
				if (nextState) {
					await applyTwitterStyles(t.id)
				} else {
					await removeTwitterStyles(t.id)
				}
			}
		}
	} else {
		// Per-tab mode: toggle only current tab
		const tabState = getTabState(tab.id)
		const nextState = !tabState.twitter

		tabState.twitter = nextState

		if (nextState) {
			await applyTwitterStyles(tab.id)
		} else {
			await removeTwitterStyles(tab.id)
		}
	}
})

// Clean up when tabs are closed
browser.tabs.onRemoved.addListener(async (tabId: number) => {
	// Clean up per-tab state
	tabStates.delete(tabId)

	// Clean up theater sessions
	if (theaterSessions.has(tabId)) {
		theaterSessions.delete(tabId)
		await saveTheaterSessions()
	}
})

// Update badge when tab becomes active
browser.tabs.onActivated.addListener(async ({ tabId }: { tabId: number }) => {
	try {
		const tab = await browser.tabs.get(tabId)
		if (!tab.url) {
			return
		}

		// Check YouTube
		if (isYouTubeUrl(tab.url)) {
			const mode = await getYoutubePersistenceMode()
			if (mode === 'global') {
				const state = await getStoredState(STORAGE_KEYS.YOUTUBE_STATE)
				const badgeText = state?.enabled ? 'ON' : 'OFF'
				await browser.browserAction.setBadgeText({ tabId, text: badgeText })
			} else {
				const tabState = getTabState(tabId)
				const badgeText = tabState.youtube ? 'ON' : 'OFF'
				await browser.browserAction.setBadgeText({ tabId, text: badgeText })
			}
		}

		// Check Twitter
		if (isTwitterUrl(tab.url)) {
			const mode = await getTwitterPersistenceMode()
			if (mode === 'global') {
				const state = await getStoredState(STORAGE_KEYS.TWITTER_STATE)
				const badgeText = state?.enabled ? 'ON' : 'OFF'
				await browser.browserAction.setBadgeText({ tabId, text: badgeText })
			} else {
				const tabState = getTabState(tabId)
				const badgeText = tabState.twitter ? 'ON' : 'OFF'
				await browser.browserAction.setBadgeText({ tabId, text: badgeText })
			}
		}
	} catch (error) {
		// Tab might have been closed
	}
})
