import {
	DEFAULTS,
	STORAGE_KEYS,
	type TwitterFocusControls,
	isTwitterHost,
} from './shared/extension-settings.ts'
import {
	isEditableTarget,
	isTwitterControlBShortcut,
	isTwitterOptionShiftXShortcut,
	isTwitterToggleShortcut,
	requestBackgroundToggle,
	isFirefoxLike,
} from './shared/shortcut-utils.ts'

type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

interface TwitterState {
	enabled: boolean
}

interface StorageResult {
	[key: string]: unknown
}

interface TwitterSettings {
	width: number
	fontSize: number
	useDefaultFont: boolean
	controls: TwitterFocusControls
}

const STYLESHEET_ID = 'dissatisfied-twitter-styles' as const
const TOGGLE_BUTTON_ID = 'dissatisfied-toggle-btn' as const
const ACTIVE_CLASS = 'dissatisfied-active' as const
const TWITTER_CLASS_NAMES = [
	'dissatisfied-twitter-custom-font',
	'dissatisfied-twitter-hide-sidebar',
	'dissatisfied-twitter-hide-chat',
	'dissatisfied-twitter-hide-grok',
	'dissatisfied-twitter-hide-header',
	'dissatisfied-twitter-center-timeline',
] as const
const TWITTER_VARIABLE_NAMES = [
	'--twitter-width',
	'--twitter-font-size',
	'--twitter-icon-scale',
] as const

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

const isTwitterPage = (): boolean => isTwitterHost(window.location.hostname)

const isExtensionContextValid = (): boolean => {
	try {
		return typeof chrome !== 'undefined' && !!chrome.runtime?.id
	} catch {
		return false
	}
}

// ============================================================================
// DOM Queries (Option-like returns)
// ============================================================================

const queryElement = <T extends HTMLElement>(
	selector: string,
): T | null => document.querySelector<T>(selector)

const getElementById = <T extends HTMLElement>(
	id: string,
): T | null => document.getElementById(id) as T | null

const getStylesheet = (): HTMLLinkElement | null =>
	getElementById<HTMLLinkElement>(STYLESHEET_ID)

const getToggleButton = (): HTMLButtonElement | null =>
	getElementById<HTMLButtonElement>(TOGGLE_BUTTON_ID)

const getInjectionTarget = (): HTMLElement | null => {
	// Option 1: Tweet detail page - find the row with Reply button
	const replyButton = queryElement<HTMLElement>('[aria-label="Reply"]')
	if (replyButton?.parentElement) {
		return replyButton.parentElement
	}

	// Option 2: Home timeline - find the tab navigation row
	const tabList = queryElement<HTMLElement>(
		"[data-testid='ScrollSnap-SwipeableList']",
	)
	if (tabList?.parentElement) {
		// Find the nav container with flex layout
		const nav = tabList.closest<HTMLElement>('nav')
		if (nav) {
			return nav
		}
		return tabList.parentElement
	}

	// Option 3: Generic - find the sticky header's inner flex row
	const stickyHeader = queryElement<HTMLElement>(
		'.css-175oi2r.r-aqfbo4.r-gtdqiz.r-1gn8etr.r-4zbufd.r-1g40b8q',
	)
	if (stickyHeader) {
		// Look for a flex row inside
		const flexRow = stickyHeader.querySelector<HTMLElement>(
			'.css-175oi2r.r-1awozwy.r-18u37iz',
		)
		if (flexRow) {
			return flexRow
		}
	}

	return null
}

const getStorageValue = async <T>(
	key: string,
	defaultValue: T,
): Promise<Result<T>> => {
	if (!isExtensionContextValid()) {
		return err(new Error('Extension context invalidated'))
	}

	try {
		const result: StorageResult = await chrome.storage.local.get(key)
		const value = (result[key] as T) ?? defaultValue
		return ok(value)
	} catch (e) {
		return err(e instanceof Error ? e : new Error(String(e)))
	}
}

const getTwitterState = (): Promise<Result<TwitterState>> =>
	getStorageValue<TwitterState>(STORAGE_KEYS.TWITTER_STATE, { enabled: false })

const getNumberSetting = (rawValue: unknown, fallback: number): number => {
	const numericValue = Number(rawValue)
	return Number.isFinite(numericValue) ? numericValue : fallback
}

const getAllTwitterSettings = async (): Promise<TwitterSettings> => {
	const keys = [
		STORAGE_KEYS.TWITTER_WIDTH,
		STORAGE_KEYS.TWITTER_FONT_SIZE,
		STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT,
		STORAGE_KEYS.TWITTER_FOCUS_CONTROLS,
	]
	const raw = await chrome.storage.local.get(keys)
	const width = getNumberSetting(
		raw[STORAGE_KEYS.TWITTER_WIDTH],
		DEFAULTS.TWITTER_WIDTH,
	)
	const fontSize = getNumberSetting(
		raw[STORAGE_KEYS.TWITTER_FONT_SIZE],
		DEFAULTS.TWITTER_FONT_SIZE,
	)
	const useDefaultFont = raw[STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT] !== false
	const rawControls = raw[STORAGE_KEYS.TWITTER_FOCUS_CONTROLS] as
		| Partial<TwitterFocusControls>
		| undefined
	const controls: TwitterFocusControls = {
		...DEFAULTS.TWITTER_FOCUS_CONTROLS,
		...(rawControls && typeof rawControls === 'object' ? rawControls : {}),
	}
	controls.hideHeader = controls.centerTimeline
	return { width, fontSize, useDefaultFont, controls }
}

const clearTwitterStyleState = (root: HTMLElement): void => {
	root.classList.remove(...TWITTER_CLASS_NAMES)
	for (const variableName of TWITTER_VARIABLE_NAMES) {
		root.style.removeProperty(variableName)
	}
}

const applyTwitterSettingsToDocument = (settings: TwitterSettings): void => {
	const root = document.documentElement
	root.style.setProperty('--twitter-width', `${settings.width}%`)

	if (!settings.useDefaultFont) {
		root.classList.add('dissatisfied-twitter-custom-font')
		root.style.setProperty('--twitter-font-size', `${settings.fontSize}px`)
		root.style.setProperty(
			'--twitter-icon-scale',
			String(1 + (settings.fontSize / 15 - 1) * 0.5),
		)
	} else {
		root.classList.remove('dissatisfied-twitter-custom-font')
		root.style.removeProperty('--twitter-font-size')
		root.style.removeProperty('--twitter-icon-scale')
	}

	root.classList.toggle(
		'dissatisfied-twitter-hide-sidebar',
		Boolean(settings.controls.hideSidebarColumn),
	)
	root.classList.toggle(
		'dissatisfied-twitter-hide-chat',
		Boolean(settings.controls.hideChatDrawer),
	)
	root.classList.toggle(
		'dissatisfied-twitter-hide-grok',
		Boolean(settings.controls.hideGrokDrawer),
	)
	root.classList.toggle(
		'dissatisfied-twitter-hide-header',
		Boolean(settings.controls.hideHeader),
	)
	root.classList.toggle(
		'dissatisfied-twitter-center-timeline',
		Boolean(settings.controls.centerTimeline),
	)
}

const injectStylesheet = (): Result<HTMLLinkElement> => {
	if (!isExtensionContextValid()) {
		return err(new Error('Extension context invalidated'))
	}

	const existing = getStylesheet()
	if (existing) return ok(existing)

	try {
		const link = document.createElement('link')
		link.id = STYLESHEET_ID
		link.rel = 'stylesheet'
		link.href = chrome.runtime.getURL('styles/twitter.css')
		// Handle document_start when head might not exist yet
		const target = document.head || document.documentElement
		target.appendChild(link)
		return ok(link)
	} catch (e) {
		return err(e instanceof Error ? e : new Error(String(e)))
	}
}

const removeStylesheet = (): void => {
	getStylesheet()?.remove()
}

const isActive = (): boolean =>
	document.documentElement.classList.contains(ACTIVE_CLASS)

const setActive = (active: boolean): void => {
	document.documentElement.classList.toggle(ACTIVE_CLASS, active)
	const button = getToggleButton()
	if (button) {
		button.setAttribute('aria-pressed', String(active))
		// Update icon opacity to indicate state
		const icon = button.querySelector('svg')
		if (icon) {
			icon.style.opacity = active ? '1' : '0.6'
		}
	}
}

const activate = async (): Promise<Result<void>> => {
	const stylesheetResult = injectStylesheet()
	if (!stylesheetResult.ok) return stylesheetResult

	const settings = await getAllTwitterSettings()
	applyTwitterSettingsToDocument(settings)
	setActive(true)
	return ok(undefined)
}

const deactivate = (): void => {
	clearTwitterStyleState(document.documentElement)
	setActive(false)
	// Note: we keep the stylesheet loaded for transitions
}

const toggle = async (): Promise<Result<void>> => {
	if (isActive()) {
		deactivate()
		return ok(undefined)
	}
	return activate()
}

// ============================================================================
// Toggle Button Creation
// ============================================================================

const ICON_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<rect x="3" y="3" width="18" height="18" rx="3"/>
	<line x1="9" y1="3" x2="9" y2="21"/>
</svg>`

const alignButtonToRight = (button: HTMLButtonElement, target: HTMLElement) => {
	const style = window.getComputedStyle(target)
	const isFlexRow = style.display.includes('flex')
	if (isFlexRow) {
		button.style.marginLeft = 'auto'
		button.style.marginRight = '0'
	}
}

const createToggleButton = (): HTMLButtonElement => {
	const active = isActive()

	const button = document.createElement('button')
	button.id = TOGGLE_BUTTON_ID
	button.type = 'button'
	button.setAttribute('aria-pressed', String(active))
	button.setAttribute('aria-label', 'Toggle clean view')
	button.innerHTML = ICON_SVG

	Object.assign(button.style, {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: '34px',
		height: '34px',
		padding: '0',
		margin: '0 4px',
		color: 'rgb(113, 118, 123)',
		backgroundColor: 'transparent',
		border: 'none',
		borderRadius: '50%',
		cursor: 'pointer',
		transition: 'background-color 0.2s, color 0.2s',
	} as CSSStyleDeclaration)

	const icon = button.querySelector('svg')
	if (icon) {
		;(icon as SVGElement).style.opacity = active ? '1' : '0.6'
		;(icon as SVGElement).style.transition = 'opacity 0.2s'
	}

	button.addEventListener('mouseenter', () => {
		button.style.backgroundColor = 'rgba(29, 155, 240, 0.1)'
		button.style.color = 'rgb(29, 155, 240)'
	})

	button.addEventListener('mouseleave', () => {
		button.style.backgroundColor = 'transparent'
		button.style.color = 'rgb(113, 118, 123)'
	})

	button.addEventListener('click', (e) => {
		e.preventDefault()
		e.stopPropagation()
		toggle()
	})

	return button
}

const injectToggleButton = (): Result<HTMLButtonElement> => {
	const existing = getToggleButton()
	if (existing) return ok(existing)

	const target = getInjectionTarget()
	if (!target) {
		return err(new Error('No injection target found'))
	}

	const button = createToggleButton()
	alignButtonToRight(button, target)
	target.appendChild(button)

	return ok(button)
}

// ============================================================================
// Initialization
// ============================================================================

const initialize = async (): Promise<void> => {
	if (!isTwitterPage()) return

	injectStylesheet()

	// Check stored state and apply if enabled
	const stateResult = await getTwitterState()
	if (stateResult.ok && stateResult.value.enabled) {
		await activate()
	}

	// Inject the toggle button
	injectToggleButton()
}

// ============================================================================
// Event Listeners
// ============================================================================

const twitterLayoutSettingKeys = [
	STORAGE_KEYS.TWITTER_WIDTH,
	STORAGE_KEYS.TWITTER_FONT_SIZE,
	STORAGE_KEYS.TWITTER_USE_DEFAULT_FONT,
	STORAGE_KEYS.TWITTER_FOCUS_CONTROLS,
]

chrome.storage.onChanged.addListener(
	async (
		changes: { [key: string]: chrome.storage.StorageChange },
		areaName: string,
	) => {
		if (areaName !== 'local') return
		if (!isTwitterPage()) return
		if (!isExtensionContextValid()) return

		const stateChange = changes[STORAGE_KEYS.TWITTER_STATE]
		if (stateChange) {
			const newState = stateChange.newValue as TwitterState | undefined
			if (newState?.enabled) {
				await activate()
			} else {
				deactivate()
			}
			return
		}

		const layoutChanged = twitterLayoutSettingKeys.some((key) => changes[key])
		if (layoutChanged && isActive()) {
			const settings = await getAllTwitterSettings()
			applyTwitterSettingsToDocument(settings)
		}
	},
)

chrome.runtime.onMessage.addListener(
	(
		message: { action: string },
		_sender: chrome.runtime.MessageSender,
		sendResponse: (response: { success: boolean }) => void,
	) => {
		if (!isTwitterPage()) return false

		if (message.action === 'apply-twitter-styles') {
			activate().then(() => sendResponse({ success: true }))
			return true
		}

		if (message.action === 'remove-twitter-styles') {
			deactivate()
			sendResponse({ success: true })
			return false
		}

		return false
	},
)

document.addEventListener(
	'keydown',
	(event) => {
		if (!isTwitterPage()) return
		if (isEditableTarget(event.target)) return
		const isControlB = isTwitterControlBShortcut(event)
		const isOptionShiftX = isTwitterOptionShiftXShortcut(event)
		if (!isControlB && !isOptionShiftX) return

		// Always consume the shortcut so browser defaults don't fire.
		event.preventDefault()
		event.stopPropagation()

		void requestBackgroundToggle('toggle-twitter-style', () => {
			void toggle()
		})
	},
	true,
)

// ============================================================================
// SPA Navigation Observer
// ============================================================================

let currentUrl = location.href
let observerTickScheduled = false

const observerCallback = (): void => {
	if (observerTickScheduled) return
	observerTickScheduled = true
	requestAnimationFrame(() => {
		observerTickScheduled = false

		if (!getToggleButton()) {
			injectToggleButton()
		}

		if (location.href !== currentUrl) {
			currentUrl = location.href
			void initialize()
		}
	})
}

const startObserver = (): void => {
	const observer = new MutationObserver(observerCallback)
	observer.observe(document.body, { subtree: true, childList: true })
}

// ============================================================================
// Entry Point
// ============================================================================

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		initialize()
		startObserver()
	})
} else {
	initialize()
	startObserver()
}
