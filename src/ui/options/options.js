const STORAGE_KEYS = {
	YOUTUBE_PERSISTENCE_MODE: 'youtube_persistence_mode',
	TWITTER_PERSISTENCE_MODE: 'twitter_persistence_mode',
	TWITTER_WIDTH: 'twitter_width',
	TWITTER_FONT_SIZE: 'twitter_font_size',
	TWITTER_USE_DEFAULT_FONT: 'twitter_use_default_font',
	TWITTER_FOCUS_CONTROLS: 'twitter_focus_controls',
}

const DEFAULT_TWITTER_CONTROLS = Object.freeze({
	hideSidebarColumn: true,
	hideChatDrawer: true,
	hideGrokDrawer: true,
	hideHeader: true,
	centerTimeline: true,
})

const DEFAULTS = Object.freeze({
	YOUTUBE_PERSISTENCE_MODE: 'tab',
	TWITTER_PERSISTENCE_MODE: 'tab',
	TWITTER_WIDTH: 80,
	TWITTER_FONT_SIZE: 15,
	TWITTER_USE_DEFAULT_FONT: true,
	TWITTER_FOCUS_CONTROLS: DEFAULT_TWITTER_CONTROLS,
})

const TWITTER_CONTROL_KEYS = Object.keys(DEFAULT_TWITTER_CONTROLS)
const sliderSaveTimeouts = new Map()

const dom = {
	saveStatus: null,
	youtubePersistenceModeInputs: [],
	twitterPersistenceModeInputs: [],
	twitterWidthSlider: null,
	twitterWidthValue: null,
	twitterFontSizeSlider: null,
	twitterFontSizeValue: null,
	twitterFontSizeRow: null,
	twitterUseDefaultFont: null,
	twitterControlInputs: [],
	siteTabButtons: [],
	sitePanels: [],
}

document.addEventListener('DOMContentLoaded', async () => {
	cacheDom()
	bindSettingsEvents()
	await loadSettings()
	await initializeShortcutsSection()
})

function cacheDom() {
	dom.saveStatus = document.getElementById('save-status')
	dom.youtubePersistenceModeInputs = Array.from(
		document.querySelectorAll('input[name="youtubePersistenceMode"]'),
	)
	dom.twitterPersistenceModeInputs = Array.from(
		document.querySelectorAll('input[name="twitterPersistenceMode"]'),
	)
	dom.twitterWidthSlider = document.getElementById('twitter-width-slider')
	dom.twitterWidthValue = document.getElementById('twitter-width-value')
	dom.twitterFontSizeSlider = document.getElementById(
		'twitter-font-size-slider',
	)
	dom.twitterFontSizeValue = document.getElementById('twitter-font-size-value')
	dom.twitterFontSizeRow = document.getElementById('twitter-font-size-row')
	dom.twitterUseDefaultFont = document.getElementById(
		'twitter-use-default-font',
	)
	dom.twitterControlInputs = Array.from(
		document.querySelectorAll('input[data-control-key]'),
	)
	dom.siteTabButtons = Array.from(document.querySelectorAll('.site-tab'))
	dom.sitePanels = Array.from(document.querySelectorAll('.website-panel'))
}

function bindSettingsEvents() {
	initializeSiteTabs()

	for (const input of dom.youtubePersistenceModeInputs) {
		input.addEventListener('change', handleYoutubePersistenceModeChange)
	}

	for (const input of dom.twitterPersistenceModeInputs) {
		input.addEventListener('change', handleTwitterPersistenceModeChange)
	}

	for (const input of dom.twitterControlInputs) {
		input.addEventListener('change', handleTwitterControlChange)
	}

	if (dom.twitterWidthSlider) {
		dom.twitterWidthSlider.addEventListener('input', handleTwitterWidthInput)
		dom.twitterWidthSlider.addEventListener('change', handleTwitterWidthChange)
	}

	if (dom.twitterFontSizeSlider) {
		dom.twitterFontSizeSlider.addEventListener(
			'input',
			handleTwitterFontSizeInput,
		)
		dom.twitterFontSizeSlider.addEventListener(
			'change',
			handleTwitterFontSizeChange,
		)
	}

	if (dom.twitterUseDefaultFont) {
		dom.twitterUseDefaultFont.addEventListener(
			'change',
			handleTwitterUseDefaultFontChange,
		)
	}

}

function initializeSiteTabs() {
	if (dom.siteTabButtons.length === 0 || dom.sitePanels.length === 0) return

	for (const button of dom.siteTabButtons) {
		button.addEventListener('click', () => {
			const siteName = button.dataset.siteTab
			if (!siteName) return
			setActiveSite(siteName)
		})
	}
}

function setActiveSite(siteName) {
	for (const button of dom.siteTabButtons) {
		const isActive = button.dataset.siteTab === siteName
		button.classList.toggle('is-active', isActive)
		button.setAttribute('aria-selected', String(isActive))
	}

	for (const panel of dom.sitePanels) {
		const isActive = panel.dataset.sitePanel === siteName
		panel.classList.toggle('is-active', isActive)
	}
}

async function loadSettings() {
	try {
		const result = await chrome.storage.local.get([
			STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE,
			STORAGE_KEYS.TWITTER_PERSISTENCE_MODE,
			STORAGE_KEYS.TWITTER_WIDTH,
			STORAGE_KEYS.TWITTER_FONT_SIZE,
			STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT,
			STORAGE_KEYS.TWITTER_FOCUS_CONTROLS,
		])

		const youtubePersistenceMode =
			result[STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE] ||
			DEFAULTS.YOUTUBE_PERSISTENCE_MODE
		const twitterPersistenceMode =
			result[STORAGE_KEYS.TWITTER_PERSISTENCE_MODE] ||
			DEFAULTS.TWITTER_PERSISTENCE_MODE
		const twitterWidth = sanitizeNumber(
			result[STORAGE_KEYS.TWITTER_WIDTH],
			DEFAULTS.TWITTER_WIDTH,
		)
		const twitterFontSize = sanitizeNumber(
			result[STORAGE_KEYS.TWITTER_FONT_SIZE],
			DEFAULTS.TWITTER_FONT_SIZE,
		)
		const twitterUseDefaultFont =
			result[STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT] !== false
		const twitterControls = sanitizeTwitterControls(
			result[STORAGE_KEYS.TWITTER_FOCUS_CONTROLS],
		)

		applyRadioSelection('youtube-mode', youtubePersistenceMode)
		applyRadioSelection('twitter-mode', twitterPersistenceMode)
		applyTwitterWidth(twitterWidth)
		applyTwitterFontSize(twitterFontSize)
		applyTwitterUseDefaultFont(twitterUseDefaultFont)
		applyTwitterControls(twitterControls)
	} catch (error) {
		console.error('Error loading settings:', error)
		showStatus('Error loading settings', 'error')
	}
}

function sanitizeNumber(value, fallback) {
	const numericValue = Number(value)
	return Number.isFinite(numericValue) ? numericValue : fallback
}

function sanitizeTwitterControls(rawValue) {
	const normalized = { ...DEFAULT_TWITTER_CONTROLS }
	if (!rawValue || typeof rawValue !== 'object') {
		return normalized
	}

	for (const key of TWITTER_CONTROL_KEYS) {
		if (typeof rawValue[key] === 'boolean') {
			normalized[key] = rawValue[key]
		}
	}

	return normalized
}

function applyRadioSelection(prefix, value) {
	const modeInput = document.getElementById(`${prefix}-${value}`)
	if (modeInput) {
		modeInput.checked = true
	}
}

function applyTwitterWidth(width) {
	const safeWidth = Math.min(100, Math.max(30, width))
	if (dom.twitterWidthSlider) {
		dom.twitterWidthSlider.value = String(safeWidth)
	}
	if (dom.twitterWidthValue) {
		dom.twitterWidthValue.textContent = `${safeWidth}%`
	}
	document.documentElement.style.setProperty('--twitter-width', `${safeWidth}%`)
}

function applyTwitterFontSize(fontSize) {
	const safeFontSize = Math.min(22, Math.max(13, fontSize))
	if (dom.twitterFontSizeSlider) {
		dom.twitterFontSizeSlider.value = String(safeFontSize)
	}
	if (dom.twitterFontSizeValue) {
		dom.twitterFontSizeValue.textContent = `${safeFontSize}px`
	}
	document.documentElement.style.setProperty(
		'--twitter-font-size',
		`${safeFontSize}px`,
	)
}

function applyTwitterUseDefaultFont(useDefault) {
	if (dom.twitterUseDefaultFont) dom.twitterUseDefaultFont.checked = useDefault
	if (dom.twitterFontSizeRow) {
		dom.twitterFontSizeRow.hidden = useDefault
	}
}


function applyTwitterControls(controls) {
	for (const input of dom.twitterControlInputs) {
		const controlKey = input.dataset.controlKey
		if (!controlKey) continue
		input.checked = Boolean(controls[controlKey])
	}
}

function getTwitterControlsFromForm() {
	const controls = { ...DEFAULT_TWITTER_CONTROLS }
	for (const input of dom.twitterControlInputs) {
		const controlKey = input.dataset.controlKey
		if (!controlKey || !(controlKey in controls)) continue
		controls[controlKey] = input.checked
	}
	controls.hideHeader = controls.centerTimeline
	return controls
}

async function handleYoutubePersistenceModeChange(event) {
	const mode = event.target.value
	await saveSetting(
		STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE,
		mode,
		'YouTube preference saved',
	)
}

async function handleTwitterPersistenceModeChange(event) {
	const mode = event.target.value
	await saveSetting(
		STORAGE_KEYS.TWITTER_PERSISTENCE_MODE,
		mode,
		'Twitter/X preference saved',
	)
}

async function handleTwitterControlChange() {
	const controls = getTwitterControlsFromForm()
	await saveSetting(
		STORAGE_KEYS.TWITTER_FOCUS_CONTROLS,
		controls,
		'Twitter/X controls saved',
	)
}

function handleTwitterWidthInput(event) {
	const width = sanitizeNumber(event.target.value, DEFAULTS.TWITTER_WIDTH)
	applyTwitterWidth(width)
	queueSliderSave({
		storageKey: STORAGE_KEYS.TWITTER_WIDTH,
		value: width,
		successMessage: 'Twitter/X width saved',
	})
}

async function handleTwitterWidthChange(event) {
	const width = sanitizeNumber(event.target.value, DEFAULTS.TWITTER_WIDTH)
	applyTwitterWidth(width)
	cancelQueuedSliderSave(STORAGE_KEYS.TWITTER_WIDTH)
	await saveSetting(STORAGE_KEYS.TWITTER_WIDTH, width, 'Twitter/X width saved')
}

function handleTwitterFontSizeInput(event) {
	const fontSize = sanitizeNumber(
		event.target.value,
		DEFAULTS.TWITTER_FONT_SIZE,
	)
	applyTwitterFontSize(fontSize)
	queueSliderSave({
		storageKey: STORAGE_KEYS.TWITTER_FONT_SIZE,
		value: fontSize,
		successMessage: 'Twitter/X font size saved',
	})
}

async function handleTwitterFontSizeChange(event) {
	const fontSize = sanitizeNumber(
		event.target.value,
		DEFAULTS.TWITTER_FONT_SIZE,
	)
	applyTwitterFontSize(fontSize)
	cancelQueuedSliderSave(STORAGE_KEYS.TWITTER_FONT_SIZE)
	await saveSetting(
		STORAGE_KEYS.TWITTER_FONT_SIZE,
		fontSize,
		'Twitter/X font size saved',
	)
}

async function handleTwitterUseDefaultFontChange(event) {
	const useDefault = event.target.checked
	applyTwitterUseDefaultFont(useDefault)
	await saveSetting(STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT, useDefault, 'Saved')
}


function queueSliderSave({ storageKey, value, successMessage }) {
	cancelQueuedSliderSave(storageKey)
	const timeoutId = setTimeout(() => {
		saveSetting(storageKey, value, successMessage)
		sliderSaveTimeouts.delete(storageKey)
	}, 150)
	sliderSaveTimeouts.set(storageKey, timeoutId)
}

function cancelQueuedSliderSave(storageKey) {
	const timeoutId = sliderSaveTimeouts.get(storageKey)
	if (timeoutId) {
		clearTimeout(timeoutId)
		sliderSaveTimeouts.delete(storageKey)
	}
}

async function saveSetting(storageKey, value, successMessage = 'Saved!') {
	try {
		await chrome.storage.local.set({ [storageKey]: value })
		showStatus(successMessage, 'success')
	} catch (error) {
		console.error(`Error saving setting ${storageKey}:`, error)
		showStatus('Error saving settings', 'error')
	}
}

function showStatus(message, type = 'success') {
	if (!dom.saveStatus) return

	if (dom.saveStatus.timeoutId) {
		clearTimeout(dom.saveStatus.timeoutId)
	}

	dom.saveStatus.textContent = message
	dom.saveStatus.className = `status-message ${type}`
	dom.saveStatus.style.opacity = '1'

	dom.saveStatus.timeoutId = setTimeout(() => {
		dom.saveStatus.style.opacity = '0'
		setTimeout(() => {
			dom.saveStatus.textContent = ''
			dom.saveStatus.className = 'status-message'
		}, 300)
	}, 2000)
}

chrome.storage.onChanged.addListener((changes, areaName) => {
	if (areaName !== 'local') return

	if (changes[STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE]) {
		const nextMode = changes[STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE].newValue
		applyRadioSelection('youtube-mode', nextMode)
	}

	if (changes[STORAGE_KEYS.TWITTER_PERSISTENCE_MODE]) {
		const nextMode = changes[STORAGE_KEYS.TWITTER_PERSISTENCE_MODE].newValue
		applyRadioSelection('twitter-mode', nextMode)
	}

	if (changes[STORAGE_KEYS.TWITTER_WIDTH]) {
		applyTwitterWidth(
			sanitizeNumber(
				changes[STORAGE_KEYS.TWITTER_WIDTH].newValue,
				DEFAULTS.TWITTER_WIDTH,
			),
		)
	}

	if (changes[STORAGE_KEYS.TWITTER_FONT_SIZE]) {
		applyTwitterFontSize(
			sanitizeNumber(
				changes[STORAGE_KEYS.TWITTER_FONT_SIZE].newValue,
				DEFAULTS.TWITTER_FONT_SIZE,
			),
		)
	}

	if (changes[STORAGE_KEYS.TWITTER_FOCUS_CONTROLS]) {
		applyTwitterControls(
			sanitizeTwitterControls(
				changes[STORAGE_KEYS.TWITTER_FOCUS_CONTROLS].newValue,
			),
		)
	}

	if (changes[STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT]) {
		applyTwitterUseDefaultFont(
			changes[STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT].newValue !== false,
		)
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
				'Firefox manages shortcuts through the Add-ons Manager. Navigate to the extension settings after opening. In the Settings Icon, click `Manage Extension Shortcuts` to change the shortcut!',
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

function getDefaultShortcuts(browser) {
	const shortcuts = {
		chrome: {
			youtube: 'Ctrl + Shift + Y (mac: Command + Shift + Y)',
			twitter: 'Ctrl + Shift + X (mac: Command + Shift + X)',
		},
		edge: {
			youtube: 'Ctrl + Shift + Y (mac: Command + Shift + Y)',
			twitter: 'Ctrl + Shift + X (mac: Command + Shift + X)',
		},
		firefox: {
			youtube: 'Alt + Shift + Y',
			twitter: 'Alt + Shift + X',
		},
		safari: {
			youtube: 'Not supported',
			twitter: 'Not supported',
		},
	}

	return shortcuts[browser] || shortcuts.chrome
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

function renderDefaultShortcutsSection(browser) {
	const shortcuts = getDefaultShortcuts(browser)
	const container = document.getElementById('default-shortcuts-container')

	if (!container) return

	let html = '<ul class="list" role="list">'

	if (browser === 'safari') {
		html += `
			<li>
				<span class="label">Shortcuts</span>
				<span class="shortcut">Not supported in Safari</span>
			</li>
		`
	} else {
		html += `
			<li>
				<span class="label">YouTube focus</span>
				<span class="shortcut">${shortcuts.youtube}</span>
			</li>
			<li>
				<span class="label">Twitter/X focus</span>
				<span class="shortcut">${shortcuts.twitter}</span>
			</li>
		`
	}

	html += '</ul>'
	container.innerHTML = html
}

// Initialize shortcuts section on page load
async function initializeShortcutsSection() {
	const browser = await detectBrowser()
	renderShortcutsSection(browser)
	renderDefaultShortcutsSection(browser)
}
