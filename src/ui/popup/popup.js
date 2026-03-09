import {
	DEFAULTS,
	STORAGE_KEYS,
	UI_KEYS,
	detectSiteNameFromUrl,
	openOptionsPage,
	sanitizeNumber,
	sanitizeTwitterControls,
} from '../shared/settings-shared.js'

const dom = {
	siteTitle: null,
	status: null,
	viewButtons: [],
	viewPanels: [],
	sitePanels: [],

	youtubeModeInputs: [],

	twitterModeInputs: [],
	twitterWidthSlider: null,
	twitterWidthValue: null,
	twitterFontSizeSlider: null,
	twitterFontSizeValue: null,
	twitterFontSizeRow: null,
	twitterUseDefaultFont: null,
	twitterControlInputs: [],
}

document.addEventListener('DOMContentLoaded', async () => {
	cacheDom()
	bindUi()
	await init()
})

function cacheDom() {
	dom.siteTitle = document.getElementById('site-title')
	dom.status = document.getElementById('save-status')

	dom.viewButtons = Array.from(document.querySelectorAll('[data-view]'))
	dom.viewPanels = Array.from(document.querySelectorAll('[data-view-panel]'))

	dom.sitePanels = Array.from(document.querySelectorAll('[data-site-panel]'))

	dom.youtubeModeInputs = Array.from(
		document.querySelectorAll('input[name="youtubePersistenceMode"]'),
	)

	dom.twitterModeInputs = Array.from(
		document.querySelectorAll('input[name="twitterPersistenceMode"]'),
	)
	dom.twitterWidthSlider = document.getElementById('twitter-width-slider')
	dom.twitterWidthValue = document.getElementById('twitter-width-value')
	dom.twitterFontSizeSlider = document.getElementById('twitter-font-size-slider')
	dom.twitterFontSizeValue = document.getElementById('twitter-font-size-value')
	dom.twitterFontSizeRow = document.getElementById('twitter-font-size-row')
	dom.twitterUseDefaultFont = document.getElementById('twitter-use-default-font')
	dom.twitterControlInputs = Array.from(
		document.querySelectorAll('input[data-control-key]'),
	)
}

function bindUi() {
	for (const btn of dom.viewButtons) {
		btn.addEventListener('click', async () => {
			const view = btn.dataset.view
			if (view === 'settings') {
				await openSettingsFromPopup()
				return
			}
			setActiveView(view)
		})
	}

	for (const input of dom.youtubeModeInputs) {
		input.addEventListener('change', (e) =>
			saveSetting(
				STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE,
				e.target.value,
				'Saved',
			),
		)
	}

	for (const input of dom.twitterModeInputs) {
		input.addEventListener('change', (e) =>
			saveSetting(
				STORAGE_KEYS.TWITTER_PERSISTENCE_MODE,
				e.target.value,
				'Saved',
			),
		)
	}

	if (dom.twitterWidthSlider) {
		dom.twitterWidthSlider.addEventListener('input', (e) => {
			const width = sanitizeNumber(e.target.value, DEFAULTS.TWITTER_WIDTH)
			applyTwitterWidth(width)
		})
		dom.twitterWidthSlider.addEventListener('change', async (e) => {
			const width = sanitizeNumber(e.target.value, DEFAULTS.TWITTER_WIDTH)
			applyTwitterWidth(width)
			await saveSetting(STORAGE_KEYS.TWITTER_WIDTH, width, 'Saved')
		})
	}

	if (dom.twitterFontSizeSlider) {
		dom.twitterFontSizeSlider.addEventListener('input', (e) => {
			const fontSize = sanitizeNumber(e.target.value, DEFAULTS.TWITTER_FONT_SIZE)
			applyTwitterFontSize(fontSize)
		})
		dom.twitterFontSizeSlider.addEventListener('change', async (e) => {
			const fontSize = sanitizeNumber(e.target.value, DEFAULTS.TWITTER_FONT_SIZE)
			applyTwitterFontSize(fontSize)
			await saveSetting(STORAGE_KEYS.TWITTER_FONT_SIZE, fontSize, 'Saved')
		})
	}

	if (dom.twitterUseDefaultFont) {
		dom.twitterUseDefaultFont.addEventListener('change', async (e) => {
			const useDefault = e.target.checked
			applyTwitterUseDefaultFont(useDefault)
			await saveSetting(STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT, useDefault, 'Saved')
		})
	}

	for (const input of dom.twitterControlInputs) {
		input.addEventListener('change', async () => {
			const controls = getTwitterControlsFromForm()
			await saveSetting(STORAGE_KEYS.TWITTER_FOCUS_CONTROLS, controls, 'Saved')
		})
	}
}

async function init() {
	const { siteName } = await getActiveTabSite()

	setVisibleSitePanel(siteName)
	setTitleForSite(siteName)

	await loadSiteSettings(siteName)
}

function setActiveView(viewName) {
	if (!viewName) return

	for (const btn of dom.viewButtons) {
		const isActive = btn.dataset.view === viewName
		btn.classList.toggle('is-active', isActive)
		btn.setAttribute('aria-selected', String(isActive))
	}

	for (const panel of dom.viewPanels) {
		panel.classList.toggle('is-active', panel.dataset.viewPanel === viewName)
	}
}

function setVisibleSitePanel(siteName) {
	for (const panel of dom.sitePanels) {
		panel.classList.toggle('is-hidden', panel.dataset.sitePanel !== siteName)
	}
}

function setTitleForSite(siteName) {
	if (!dom.siteTitle) return

	const label =
		siteName === 'youtube'
			? 'YouTube'
			: siteName === 'twitter'
				? 'Twitter/X'
				: siteName === 'excalidraw'
					? 'Excalidraw'
					: 'Quick settings'

	dom.siteTitle.textContent = label
}

async function getActiveTabSite() {
	try {
		if (!chrome.tabs || !chrome.tabs.query) {
			return { siteName: 'unknown', url: null }
		}

		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		const url = tab && tab.url ? tab.url : null

		if (!url) return { siteName: 'unknown', url: null }
		return { siteName: detectSiteNameFromUrl(url), url }
	} catch {
		return { siteName: 'unknown', url: null }
	}
}

async function loadSiteSettings(siteName) {
	try {
		if (siteName === 'youtube') {
			const result = await chrome.storage.local.get([
				STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE,
			])
			const mode =
				result[STORAGE_KEYS.YOUTUBE_PERSISTENCE_MODE] ||
				DEFAULTS.YOUTUBE_PERSISTENCE_MODE
			applyRadioSelection('youtube-mode', mode)
			return
		}

		if (siteName === 'twitter') {
			const result = await chrome.storage.local.get([
				STORAGE_KEYS.TWITTER_PERSISTENCE_MODE,
				STORAGE_KEYS.TWITTER_WIDTH,
				STORAGE_KEYS.TWITTER_FONT_SIZE,
				STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT,
				STORAGE_KEYS.TWITTER_FOCUS_CONTROLS,
			])

			const mode =
				result[STORAGE_KEYS.TWITTER_PERSISTENCE_MODE] ||
				DEFAULTS.TWITTER_PERSISTENCE_MODE
			const width = sanitizeNumber(
				result[STORAGE_KEYS.TWITTER_WIDTH],
				DEFAULTS.TWITTER_WIDTH,
			)
			const fontSize = sanitizeNumber(
				result[STORAGE_KEYS.TWITTER_FONT_SIZE],
				DEFAULTS.TWITTER_FONT_SIZE,
			)
			const useDefaultFont = result[STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT] !== false
			const controls = sanitizeTwitterControls(
				result[STORAGE_KEYS.TWITTER_FOCUS_CONTROLS],
			)

			applyRadioSelection('twitter-mode', mode)
			applyTwitterWidth(width)
			applyTwitterFontSize(fontSize)
			applyTwitterUseDefaultFont(useDefaultFont)
			applyTwitterControls(controls)
		}
	} catch (error) {
		console.error('Error loading popup settings:', error)
		showStatus('Could not load settings', 'error')
	}
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
}

function applyTwitterFontSize(fontSize) {
	const safeFontSize = Math.min(22, Math.max(13, fontSize))
	if (dom.twitterFontSizeSlider) {
		dom.twitterFontSizeSlider.value = String(safeFontSize)
	}
	if (dom.twitterFontSizeValue) {
		dom.twitterFontSizeValue.textContent = `${safeFontSize}px`
	}
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
	const controls = { ...DEFAULTS.TWITTER_FOCUS_CONTROLS }
	for (const input of dom.twitterControlInputs) {
		const controlKey = input.dataset.controlKey
		if (!controlKey || !(controlKey in controls)) continue
		controls[controlKey] = input.checked
	}
	controls.hideHeader = controls.centerTimeline
	return controls
}

async function saveSetting(storageKey, value, successMessage = 'Saved') {
	try {
		await chrome.storage.local.set({ [storageKey]: value })
		showStatus(successMessage, 'success')
	} catch (error) {
		console.error(`Error saving setting ${storageKey}:`, error)
		showStatus('Could not save', 'error')
	}
}

function showStatus(message, type) {
	if (!dom.status) return
	dom.status.textContent = message
	dom.status.classList.toggle('is-success', type === 'success')
	dom.status.classList.toggle('is-error', type === 'error')
	clearTimeout(dom.status._timeoutId)
	dom.status._timeoutId = setTimeout(() => {
		dom.status.textContent = ''
		dom.status.classList.remove('is-success', 'is-error')
	}, 1500)
}

async function openSettingsFromPopup() {
	try {
		const { siteName } = await getActiveTabSite()
		const at = Date.now()
		if (chrome.storage?.local?.set) {
			await chrome.storage.local.set({
				[UI_KEYS.LAST_OPEN_SITE]: siteName,
				[UI_KEYS.LAST_OPEN_SITE_AT]: at,
			})
		}
	} catch {
		// ignore
	}

	await openOptionsPage()

	// close the popup for a snappier UX
	try {
		window.close()
	} catch {
		// ignore
	}
}
