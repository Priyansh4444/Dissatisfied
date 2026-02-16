// BroadcastChannel for cross-tab communication
const channel = new BroadcastChannel('dissatisfied-youtube')

// Storage key
const STORAGE_KEY = 'youtube_state'

// Check if we're on a YouTube video page (watch/embed or youtu.be links). Excludes home and shorts
const isYouTubePage = () => {
	const host = window.location.hostname
	const path = window.location.pathname

	// youtu.be short links -> path like '/<videoId>'
	if (host === 'youtu.be') {
		return path && path !== '/' && path.length > 1
	}

	// Only run on www.youtube.com and m.youtube.com
	if (host === 'www.youtube.com' || host === 'm.youtube.com') {
		// Watch page with v= param
		if (path === '/watch') {
			const params = new URLSearchParams(window.location.search)
			return params.has('v')
		}

		// Embedded player pages (e.g., /embed/<id>)
		if (path.startsWith('/embed/')) {
			return true
		}

		// Exclude shorts, home, and other non-watch pages
		return false
	}

	return false
}

// Track if we enabled theater mode
let weEnabledTheater = false

const isEditableTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) {
		return false
	}

	return (
		target.isContentEditable ||
		target.tagName === 'INPUT' ||
		target.tagName === 'TEXTAREA' ||
		target.tagName === 'SELECT'
	)
}

// Apply YouTube styles
function applyStyles() {
	if (document.getElementById('dissatisfied-youtube-styles')) {
		return // Already applied
	}

	const link = document.createElement('link')
	link.id = 'dissatisfied-youtube-styles'
	link.rel = 'stylesheet'
	link.href = chrome.runtime.getURL('styles/youtube.css')
	document.head.appendChild(link)

	// Enable theater mode if not already enabled
	setTimeout(() => {
		const playerPage = document.querySelector('ytd-watch-flexy, ytd-watch-grid')
		if (playerPage && !playerPage.hasAttribute('theater')) {
			const btn = document.querySelector(
				'.ytp-size-button',
			) as HTMLButtonElement
			if (btn) {
				btn.click()
				weEnabledTheater = true
			}
		}
	}, 100)
}

// Remove YouTube styles
function removeStyles() {
	const link = document.getElementById('dissatisfied-youtube-styles')
	if (link) {
		link.remove()
	}

	// Revert theater mode only if we enabled it
	if (weEnabledTheater) {
		setTimeout(() => {
			const playerPage = document.querySelector(
				'ytd-watch-flexy, ytd-watch-grid',
			)
			if (playerPage && playerPage.hasAttribute('theater')) {
				const btn = document.querySelector(
					'.ytp-size-button',
				) as HTMLButtonElement
				if (btn) {
					btn.click()
				}
			}
			weEnabledTheater = false
		}, 100)
	}
}

function toggleStyles() {
	const isEnabled = !!document.getElementById('dissatisfied-youtube-styles')
	if (isEnabled) {
		removeStyles()
		return
	}

	applyStyles()
}

// Check and apply initial state
async function checkInitialState() {
	if (!isYouTubePage()) {
		return
	}

	try {
		const result = await chrome.storage.local.get(STORAGE_KEY)
		const state = result[STORAGE_KEY]

		if (state?.enabled) {
			applyStyles()
		}
	} catch (error) {
		console.error('Error checking initial state:', error)
	}
}

// Listen for messages from BroadcastChannel (other tabs)
channel.onmessage = (event) => {
	if (!isYouTubePage()) {
		return
	}

	const { action } = event.data

	if (action === 'enable') {
		applyStyles()
	} else if (action === 'disable') {
		removeStyles()
	}
}

// Listen for storage changes (from background script or options page)
chrome.storage.onChanged.addListener((changes, areaName) => {
	if (areaName !== 'local' || !changes[STORAGE_KEY]) {
		return
	}

	if (!isYouTubePage()) {
		return
	}

	const newState = changes[STORAGE_KEY].newValue

	if (newState?.enabled) {
		applyStyles()
		// Notify other tabs via BroadcastChannel
		channel.postMessage({ action: 'enable' })
	} else {
		removeStyles()
		// Notify other tabs via BroadcastChannel
		channel.postMessage({ action: 'disable' })
	}
})

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (!isYouTubePage()) {
		return
	}

	if (message.action === 'apply-youtube-styles') {
		applyStyles()
		sendResponse({ success: true })
	} else if (message.action === 'remove-youtube-styles') {
		removeStyles()
		sendResponse({ success: true })
	}
})

document.addEventListener(
	'keydown',
	(event) => {
		if (!isYouTubePage()) {
			return
		}

		if (isEditableTarget(event.target)) {
			return
		}

		const isBackquote =
			(event.key === '`' || event.code === 'Backquote') && !event.shiftKey
		if (!isBackquote) {
			return
		}

		event.preventDefault()
		event.stopPropagation()
		toggleStyles()
	},
	true,
)

// Initialize on page load
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', checkInitialState)
} else {
	checkInitialState()
}

// Re-check state on navigation (YouTube is a SPA)
let lastUrl = location.href
new MutationObserver(() => {
	const url = location.href
	if (url !== lastUrl) {
		lastUrl = url
		checkInitialState()
	}
}).observe(document.body, { subtree: true, childList: true })
