// Storage keys
const STORAGE_KEYS = {
	PERSISTENCE_MODE: 'persistence_mode',
	TWITTER_WIDTH: 'twitter_width',
}

// Default values
const DEFAULTS = {
	PERSISTENCE_MODE: 'tab',
	TWITTER_WIDTH: 80,
}

// DOM elements
let saveStatus
let persistenceModeInputs
let twitterWidthSlider
let twitterWidthValue

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
	// Get DOM references
	saveStatus = document.getElementById('save-status')
	persistenceModeInputs = document.querySelectorAll(
		'input[name="persistenceMode"]',
	)
	twitterWidthSlider = document.getElementById('twitter-width-slider')
	twitterWidthValue = document.getElementById('twitter-width-value')

	// Load saved settings
	await loadSettings()

	// Add event listeners
	persistenceModeInputs.forEach((input) => {
		input.addEventListener('change', handlePersistenceModeChange)
	})

	twitterWidthSlider.addEventListener('input', handleTwitterWidthInput)
	twitterWidthSlider.addEventListener('change', handleTwitterWidthChange)
})

// Load settings from storage
async function loadSettings() {
	try {
		const result = await chrome.storage.local.get([
			STORAGE_KEYS.PERSISTENCE_MODE,
			STORAGE_KEYS.TWITTER_WIDTH,
		])

		// Load persistence mode
		const persistenceMode =
			result[STORAGE_KEYS.PERSISTENCE_MODE] || DEFAULTS.PERSISTENCE_MODE
		const modeInput = document.getElementById(`mode-${persistenceMode}`)
		if (modeInput) {
			modeInput.checked = true
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

// Handle persistence mode change
async function handlePersistenceModeChange(event) {
	const mode = event.target.value

	try {
		// Save to storage
		await chrome.storage.local.set({
			[STORAGE_KEYS.PERSISTENCE_MODE]: mode,
		})

		// Show success message
		showStatus('Saved!', 'success')

		console.log(`Persistence mode changed to: ${mode}`)
	} catch (error) {
		console.error('Error saving persistence mode:', error)
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

	// Update persistence mode if changed
	if (changes[STORAGE_KEYS.PERSISTENCE_MODE]) {
		const newMode = changes[STORAGE_KEYS.PERSISTENCE_MODE].newValue
		const modeInput = document.getElementById(`mode-${newMode}`)
		if (modeInput && !modeInput.checked) {
			modeInput.checked = true
		}
	}

	// Update Twitter width if changed
	if (changes[STORAGE_KEYS.TWITTER_WIDTH]) {
		const newWidth = changes[STORAGE_KEYS.TWITTER_WIDTH].newValue
		if (twitterWidthSlider && twitterWidthSlider.value !== newWidth.toString()) {
			twitterWidthSlider.value = newWidth
			updateTwitterWidthDisplay(newWidth)
			updateTwitterWidthCSS(newWidth)
		}
	}
})
