// Storage keys
const STORAGE_KEYS = {
	YOUTUBE_PERSISTENCE_MODE: 'youtube_persistence_mode',
	TWITTER_PERSISTENCE_MODE: 'twitter_persistence_mode',
	TWITTER_WIDTH: 'twitter_width',
}

// Default values
const DEFAULTS = {
	YOUTUBE_PERSISTENCE_MODE: 'tab',
	TWITTER_PERSISTENCE_MODE: 'tab',
	TWITTER_WIDTH: 80,
}

// DOM elements
let saveStatus
let youtubePersistenceModeInputs
let twitterPersistenceModeInputs
let twitterWidthSlider
let twitterWidthValue

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
	// Get DOM references
	saveStatus = document.getElementById('save-status')
	youtubePersistenceModeInputs = document.querySelectorAll(
		'input[name="youtubePersistenceMode"]',
	)
	twitterPersistenceModeInputs = document.querySelectorAll(
		'input[name="twitterPersistenceMode"]',
	)
	twitterWidthSlider = document.getElementById('twitter-width-slider')
	twitterWidthValue = document.getElementById('twitter-width-value')

	// Load saved settings
	await loadSettings()

	// Initialize shortcuts section
	await initializeShortcutsSection()

	// Add event listeners
	youtubePersistenceModeInputs.forEach((input) => {
		input.addEventListener('change', handleYoutubePersistenceModeChange)
	})

	twitterPersistenceModeInputs.forEach((input) => {
		input.addEventListener('change', handleTwitterPersistenceModeChange)
	})

	twitterWidthSlider.addEventListener('input', handleTwitterWidthInput)
	twitterWidthSlider.addEventListener('change', handleTwitterWidthChange)
})

// Load settings from storage
async function loadSettings() {
	try {
		const result = await chrome.storage.local.get([
			STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE,
			STORAGE_KEYS.TWITTER_PERSISTENCE_MODE,
			STORAGE_KEYS.TWITTER_WIDTH,
		])

		// Load YouTube persistence mode
		const youtubePersistenceMode =
			result[STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE] ||
			DEFAULTS.YOUTUBE_PERSISTENCE_MODE
		const youtubeModeInput = document.getElementById(
			`youtube-mode-${youtubePersistenceMode}`,
		)
		if (youtubeModeInput) {
			youtubeModeInput.checked = true
		}

		// Load Twitter persistence mode
		const twitterPersistenceMode =
			result[STORAGE_KEYS.TWITTER_PERSISTENCE_MODE] ||
			DEFAULTS.TWITTER_PERSISTENCE_MODE
		const twitterModeInput = document.getElementById(
			`twitter-mode-${twitterPersistenceMode}`,
		)
		if (twitterModeInput) {
			twitterModeInput.checked = true
		}

		// Load Twitter width
		const twitterWidth =
			result[STORAGE_KEYS.TWITTER_WIDTH] || DEFAULTS.TWITTER_WIDTH
		if (twitterWidthSlider) {
			twitterWidthSlider.value = twitterWidth
			updateTwitterWidthDisplay(twitterWidth)
		}

		// Update CSS variable for Twitter width
		updateTwitterWidthCSS(twitterWidth)
	} catch (error) {
		console.error('Error loading settings:', error)
		showStatus('Error loading settings', 'error')
	}
}

// Handle YouTube persistence mode change
async function handleYoutubePersistenceModeChange(event) {
	const mode = event.target.value

	try {
		// Save to storage
		await chrome.storage.local.set({
			[STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE]: mode,
		})

		// Show success message
		showStatus('Saved!', 'success')

		console.log(`YouTube persistence mode changed to: ${mode}`)
	} catch (error) {
		console.error('Error saving YouTube persistence mode:', error)
		showStatus('Error saving settings', 'error')
	}
}

// Handle Twitter persistence mode change
async function handleTwitterPersistenceModeChange(event) {
	const mode = event.target.value

	try {
		// Save to storage
		await chrome.storage.local.set({
			[STORAGE_KEYS.TWITTER_PERSISTENCE_MODE]: mode,
		})

		// Show success message
		showStatus('Saved!', 'success')

		console.log(`Twitter persistence mode changed to: ${mode}`)
	} catch (error) {
		console.error('Error saving Twitter persistence mode:', error)
		showStatus('Error saving settings', 'error')
	}
}

// Handle Twitter width slider input (live preview)
function handleTwitterWidthInput(event) {
	const width = parseInt(event.target.value)
	updateTwitterWidthDisplay(width)
	updateTwitterWidthCSS(width)
}

// Handle Twitter width slider change (save)
async function handleTwitterWidthChange(event) {
	const width = parseInt(event.target.value)

	try {
		// Save to storage
		await chrome.storage.local.set({
			[STORAGE_KEYS.TWITTER_WIDTH]: width,
		})

		// Update CSS variable
		updateTwitterWidthCSS(width)

		// Show success message
		showStatus('Saved!', 'success')

		console.log(`Twitter width changed to: ${width}%`)
	} catch (error) {
		console.error('Error saving Twitter width:', error)
		showStatus('Error saving settings', 'error')
	}
}

// Update Twitter width display value
function updateTwitterWidthDisplay(width) {
	if (twitterWidthValue) {
		twitterWidthValue.textContent = `${width}%`
	}
}

// Update CSS variable for Twitter width (for live preview)
function updateTwitterWidthCSS(width) {
	document.documentElement.style.setProperty('--twitter-width', `${width}%`)
}

// Show status message
function showStatus(message, type = 'success') {
	if (!saveStatus) return

	// Clear any existing timeout
	if (saveStatus.timeoutId) {
		clearTimeout(saveStatus.timeoutId)
	}

	// Set message and class
	saveStatus.textContent = message
	saveStatus.className = `status-message ${type}`
	saveStatus.style.opacity = '1'

	// Hide after 2 seconds
	saveStatus.timeoutId = setTimeout(() => {
		saveStatus.style.opacity = '0'
		setTimeout(() => {
			saveStatus.textContent = ''
			saveStatus.className = 'status-message'
		}, 300)
	}, 2000)
}

// Listen for storage changes from other tabs/windows
chrome.storage.onChanged.addListener((changes, areaName) => {
	if (areaName !== 'local') return

	// Update YouTube persistence mode if changed
	if (changes[STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE]) {
		const newMode = changes[STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE].newValue
		const modeInput = document.getElementById(`youtube-mode-${newMode}`)
		if (modeInput && !modeInput.checked) {
			modeInput.checked = true
		}
	}

	// Update Twitter persistence mode if changed
	if (changes[STORAGE_KEYS.TWITTER_PERSISTENCE_MODE]) {
		const newMode = changes[STORAGE_KEYS.TWITTER_PERSISTENCE_MODE].newValue
		const modeInput = document.getElementById(`twitter-mode-${newMode}`)
		if (modeInput && !modeInput.checked) {
			modeInput.checked = true
		}
	}

	// Update Twitter width if changed
	if (changes[STORAGE_KEYS.TWITTER_WIDTH]) {
		const newWidth = changes[STORAGE_KEYS.TWITTER_WIDTH].newValue
		if (
			twitterWidthSlider &&
			twitterWidthSlider.value !== newWidth.toString()
		) {
			twitterWidthSlider.value = newWidth
			updateTwitterWidthDisplay(newWidth)
			updateTwitterWidthCSS(newWidth)
		}
	}
})

// Browser detection for shortcuts configuration
async function detectBrowser() {
	try {
		// Prefer the standardized `browser` namespace if available and supports getBrowserInfo
		if (
			typeof browser !== 'undefined' &&
			browser.runtime &&
			typeof browser.runtime.getBrowserInfo === 'function'
		) {
			const info = await browser.runtime.getBrowserInfo()
			return info.name.toLowerCase()
		}

		// Only call chrome.runtime.getBrowserInfo if it exists and is callable
		if (
			typeof chrome !== 'undefined' &&
			chrome.runtime &&
			typeof chrome.runtime.getBrowserInfo === 'function'
		) {
			const info = await chrome.runtime.getBrowserInfo()
			return info.name.toLowerCase()
		}

		// Fallback: basic userAgent sniffing (best-effort)
		const ua = navigator.userAgent || ''
		const lowerUa = ua.toLowerCase()
		if (lowerUa.includes('edg/')) return 'edge'
		if (lowerUa.includes('firefox')) return 'firefox'
		// Safari has "Safari/" but not "Chrome/"
		if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'safari'
		if (ua.includes('Chrome/') || lowerUa.includes('chromium')) return 'chrome'
	} catch (error) {
		console.warn('Could not detect browser:', error)
	}
	return 'unknown'
}

function getShortcutsConfig(browser) {
	const configs = {
		chrome: {
			url: 'chrome://extensions/shortcuts',
			title: 'Chrome',
			disclaimer:
				'Browser security prevents extensions from directly opening internal settings pages.',
		},
		edge: {
			url: 'edge://extensions/shortcuts',
			title: 'Microsoft Edge',
			disclaimer:
				'Browser security prevents extensions from directly opening internal settings pages.',
		},
		firefox: {
			url: 'about:addons',
			title: 'Firefox',
			disclaimer:
				'Firefox manages shortcuts through the Add-ons Manager. Navigate to the extension settings after opening.',
		},
		safari: {
			url: null,
			title: 'Safari',
			disclaimer:
				'Safari does not support keyboard shortcuts for extensions. You can still use the extension toolbar icon.',
		},
	}

	return configs[browser] || configs.chrome
}

function renderShortcutsSection(browser) {
	const config = getShortcutsConfig(browser)
	const container = document.getElementById('shortcuts-config-container')

	if (!container) return

	let html = ''

	// Show disclaimer
	html += `<p class="muted disclaimer">${config.disclaimer}</p>`

	// If URL is available (Chrome, Edge, Firefox)
	if (config.url) {
		html += `
			<div class="url-container">
				<input
					type="text"
					class="url-input"
					value="${config.url}"
					readonly
					id="shortcuts-url-input"
				/>
				<button class="btn btn-sm" id="copy-url-btn">Copy URL</button>
			</div>
			<p class="muted">
				<strong>Step 1:</strong> Copy the URL above<br>
				<strong>Step 2:</strong> Open a new tab<br>
				<strong>Step 3:</strong> Paste the URL to access keyboard shortcut settings
			</p>
		`
	} else {
		// Safari or no URL available
		html += `
			<p class="muted">
				${config.title} does not support extension keyboard shortcuts.
				You can still toggle the extension using the toolbar icon.
			</p>
		`
	}

	container.innerHTML = html

	// Add event listener for copy button
	const copyBtn = document.getElementById('copy-url-btn')
	if (copyBtn) {
		copyBtn.addEventListener('click', copyShortcutsUrl)
	}
}

function copyShortcutsUrl() {
	const input = document.getElementById('shortcuts-url-input')
	if (!input) return

	input.select()
	input.setSelectionRange(0, 99999)

	navigator.clipboard
		.writeText(input.value)
		.then(() => {
			showStatus('URL copied!', 'success')
		})
		.catch(() => {
			showStatus('Failed to copy URL', 'error')
		})
}

// Initialize shortcuts section on page load
async function initializeShortcutsSection() {
	const browser = await detectBrowser()
	renderShortcutsSection(browser)
}
