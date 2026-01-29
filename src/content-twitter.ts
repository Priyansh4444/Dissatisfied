// Rust-style TypeScript for Twitter content script

// ============================================================================
// Types
// ============================================================================

type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

interface TwitterState {
	enabled: boolean
}

interface StorageResult {
	[key: string]: unknown
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'twitter_state' as const
const TWITTER_WIDTH_KEY = 'twitter_width' as const
const DEFAULT_TWITTER_WIDTH = 80 as const
const STYLESHEET_ID = 'dissatisfied-twitter-styles' as const
const TOGGLE_BUTTON_ID = 'dissatisfied-toggle-btn' as const
const ACTIVE_CLASS = 'dissatisfied-active' as const

const TWITTER_HOSTS: ReadonlyArray<string> = [
	'twitter.com',
	'www.twitter.com',
	'x.com',
	'www.x.com',
] as const

// ============================================================================
// Result Helpers
// ============================================================================

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

// ============================================================================
// Pure Functions
// ============================================================================

const isTwitterHost = (hostname: string): boolean =>
	TWITTER_HOSTS.includes(hostname)

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

const getInjectionTarget = (): { element: HTMLElement; position: 'prepend' | 'append' } | null => {
	// Option 1: Tweet detail page - find the row with Reply button
	const replyButton = queryElement<HTMLElement>('[aria-label="Reply"]')
	if (replyButton?.parentElement) {
		return { element: replyButton.parentElement, position: 'prepend' }
	}

	// Option 2: Home timeline - find the tab navigation row
	const tabList = queryElement<HTMLElement>(
		"[data-testid='ScrollSnap-SwipeableList']",
	)
	if (tabList?.parentElement) {
		// Find the nav container with flex layout
		const nav = tabList.closest<HTMLElement>('nav')
		if (nav) {
			return { element: nav, position: 'append' }
		}
		return { element: tabList.parentElement, position: 'append' }
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
			return { element: flexRow, position: 'prepend' }
		}
	}

	return null
}

// ============================================================================
// Storage Operations (Result-based)
// ============================================================================

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

const getTwitterWidth = (): Promise<Result<number>> =>
	getStorageValue<number>(TWITTER_WIDTH_KEY, DEFAULT_TWITTER_WIDTH)

const getTwitterState = (): Promise<Result<TwitterState>> =>
	getStorageValue<TwitterState>(STORAGE_KEY, { enabled: false })

// ============================================================================
// Stylesheet Management
// ============================================================================

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
		document.head.appendChild(link)
		return ok(link)
	} catch (e) {
		return err(e instanceof Error ? e : new Error(String(e)))
	}
}

const removeStylesheet = (): void => {
	getStylesheet()?.remove()
}

// ============================================================================
// Width CSS Variable
// ============================================================================

const applyWidthVariable = async (): Promise<Result<void>> => {
	const widthResult = await getTwitterWidth()
	if (!widthResult.ok) return widthResult

	document.documentElement.style.setProperty(
		'--twitter-width',
		`${widthResult.value}%`,
	)
	return ok(undefined)
}

// ============================================================================
// Active State Management
// ============================================================================

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

	const widthResult = await applyWidthVariable()
	if (!widthResult.ok) return widthResult

	setActive(true)
	return ok(undefined)
}

const deactivate = (): void => {
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

// Simple focus/clean icon - a minimal square with rounded corners
const ICON_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<rect x="3" y="3" width="18" height="18" rx="3"/>
	<line x1="9" y1="3" x2="9" y2="21"/>
</svg>`

const createToggleButton = (): HTMLButtonElement => {
	const active = isActive()

	const button = document.createElement('button')
	button.id = TOGGLE_BUTTON_ID
	button.type = 'button'
	button.setAttribute('aria-pressed', String(active))
	button.setAttribute('aria-label', 'Toggle clean view')
	button.innerHTML = ICON_SVG

	// Minimal styling - matches Twitter's icon buttons
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

	// Set initial icon state
	const icon = button.querySelector('svg')
	if (icon) {
		;(icon as SVGElement).style.opacity = active ? '1' : '0.6'
		;(icon as SVGElement).style.transition = 'opacity 0.2s'
	}

	// Hover effect - subtle background like Twitter's buttons
	button.addEventListener('mouseenter', () => {
		button.style.backgroundColor = 'rgba(29, 155, 240, 0.1)'
		button.style.color = 'rgb(29, 155, 240)'
	})

	button.addEventListener('mouseleave', () => {
		button.style.backgroundColor = 'transparent'
		button.style.color = 'rgb(113, 118, 123)'
	})

	// Click handler
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

	if (target.position === 'prepend') {
		target.element.insertBefore(button, target.element.firstChild)
	} else {
		target.element.appendChild(button)
	}

	return ok(button)
}

// ============================================================================
// Initialization
// ============================================================================

const initialize = async (): Promise<void> => {
	if (!isTwitterPage()) return

	// Always inject stylesheet (needed for button to exist in CSS context)
	injectStylesheet()

	// Apply width variable
	await applyWidthVariable()

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

const channel = new BroadcastChannel('dissatisfied-twitter')

channel.onmessage = (event: MessageEvent<{ action: string }>) => {
	if (!isTwitterPage()) return

	const { action } = event.data
	if (action === 'enable') {
		activate()
	} else if (action === 'disable') {
		deactivate()
	}
}

chrome.storage.onChanged.addListener(
	async (
		changes: { [key: string]: chrome.storage.StorageChange },
		areaName: string,
	) => {
		if (areaName !== 'local') return
		if (!isTwitterPage()) return
		if (!isExtensionContextValid()) return

		if (changes[STORAGE_KEY]) {
			const newState = changes[STORAGE_KEY].newValue as
				| TwitterState
				| undefined
			if (newState?.enabled) {
				await activate()
				channel.postMessage({ action: 'enable' })
			} else {
				deactivate()
				channel.postMessage({ action: 'disable' })
			}
		}

		if (changes[TWITTER_WIDTH_KEY]) {
			await applyWidthVariable()
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

// ============================================================================
// SPA Navigation Observer
// ============================================================================

let currentUrl = location.href

const observerCallback = (): void => {
	// Re-inject button if it was removed (Twitter re-renders)
	if (!getToggleButton()) {
		injectToggleButton()
	}

	// Handle SPA navigation
	if (location.href !== currentUrl) {
		currentUrl = location.href
		initialize()
	}
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
