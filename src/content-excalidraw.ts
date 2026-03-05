import { isEditableTarget } from './shared/shortcut-utils.ts'

const STYLESHEET_ID = 'dissatisfied-excalidraw-styles' as const
const ACTIVE_CLASS = 'dissatisfied-excalidraw-active' as const

const isExcalidrawPage = (): boolean => {
	const host = window.location.hostname
	return host === 'excalidraw.com'
}

const applyStyles = (): void => {
	if (document.getElementById(STYLESHEET_ID)) return

	const link = document.createElement('link')
	link.id = STYLESHEET_ID
	link.rel = 'stylesheet'
	link.href = chrome.runtime.getURL('styles/excalidraw.css')
	document.head.appendChild(link)

	document.documentElement.classList.add(ACTIVE_CLASS)
}

const removeStyles = (): void => {
	document.getElementById(STYLESHEET_ID)?.remove()
	document.documentElement.classList.remove(ACTIVE_CLASS)
}

const toggle = (): void => {
	const isEnabled = document.documentElement.classList.contains(ACTIVE_CLASS)
	if (isEnabled) {
		removeStyles()
		return
	}

	applyStyles()
}

const isControlB = (event: KeyboardEvent): boolean => {
	const normalizedKey = event.key.toLowerCase()
	const isKeyB = event.code === 'KeyB' || normalizedKey === 'b'
	return isKeyB && event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey
}

document.addEventListener(
	'keydown',
	(event) => {
		if (!isExcalidrawPage()) return
		if (isEditableTarget(event.target)) return
		if (!isControlB(event)) return

		event.preventDefault()
		event.stopPropagation()
		toggle()
	},
	true,
)

