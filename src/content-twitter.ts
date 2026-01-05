// BroadcastChannel for cross-tab communication
const channel = new BroadcastChannel('dissatisfied-twitter')

// Storage keys
const STORAGE_KEY = 'twitter_state'
const TWITTER_WIDTH_KEY = 'twitter_width'
const DEFAULT_TWITTER_WIDTH = 80

// Check if we're on a Twitter/X page
const isTwitterPage = () => {
	const host = window.location.hostname
	return (
		host === 'twitter.com' ||
		host === 'www.twitter.com' ||
		host === 'x.com' ||
		host === 'www.x.com'
	)
}

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

// Apply Twitter styles
async function applyStyles() {
	// Apply custom width first (before CSS loads or if already loaded)
	await applyTwitterWidth()

	if (document.getElementById('dissatisfied-twitter-styles')) {
		// Already applied, width updated above
		return
	}

	const link = document.createElement('link')
	link.id = 'dissatisfied-twitter-styles'
	link.rel = 'stylesheet'
	link.href = chrome.runtime.getURL('styles/twitter.css')
	document.head.appendChild(link)
}

// Remove Twitter styles
function removeStyles() {
	const link = document.getElementById('dissatisfied-twitter-styles')
	if (link) {
		link.remove()
	}
}

// Check and apply initial state
async function checkInitialState() {
	if (!isTwitterPage()) {
		return
	}

	try {
		// Always set the width CSS variable on page load (even if styles not active)
		// This ensures the width is ready when styles are enabled later
		await applyTwitterWidth()

		const result = await chrome.storage.local.get(STORAGE_KEY)
		const state = result[STORAGE_KEY]

		if (state?.enabled) {
			await applyStyles()
		}
	} catch (error) {
		console.error('Error checking initial state:', error)
	}
}

// Listen for messages from BroadcastChannel (other tabs)
channel.onmessage = (event) => {
	if (!isTwitterPage()) {
		return
	}

	const { action } = event.data

	if (action === 'enable') {
		applyStyles() // Fire and forget, no await needed for BroadcastChannel
	} else if (action === 'disable') {
		removeStyles()
	}
}

// Listen for storage changes (from background script or options page)
chrome.storage.onChanged.addListener(async (changes, areaName) => {
	if (areaName !== 'local') {
		return
	}

	if (!isTwitterPage()) {
		return
	}

	// Handle state changes
	if (changes[STORAGE_KEY]) {
		const newState = changes[STORAGE_KEY].newValue

		if (newState?.enabled) {
			await applyStyles()
			// Notify other tabs via BroadcastChannel
			channel.postMessage({ action: 'enable' })
		} else {
			removeStyles()
			// Notify other tabs via BroadcastChannel
			channel.postMessage({ action: 'disable' })
		}
	}

	// Handle width changes - apply immediately even if styles aren't active yet
	if (changes[TWITTER_WIDTH_KEY]) {
		await applyTwitterWidth()
	}
})

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (!isTwitterPage()) {
		return
	}

	if (message.action === 'apply-twitter-styles') {
		applyStyles().then(() => sendResponse({ success: true }))
		return true // Keep message channel open for async response
	} else if (message.action === 'remove-twitter-styles') {
		removeStyles()
		sendResponse({ success: true })
	}
})

// Initialize on page load
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', checkInitialState)
} else {
	checkInitialState()
}

// Re-check state on navigation (Twitter/X is a SPA)
let lastUrl = location.href
new MutationObserver(() => {
	const url = location.href
	if (url !== lastUrl) {
		lastUrl = url
		checkInitialState()
	}
}).observe(document.body, { subtree: true, childList: true })
