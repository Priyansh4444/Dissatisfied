chrome.runtime.onInstalled.addListener(async ({ reason }) => {
	if (reason !== 'install') {
		return
	}

	await chrome.runtime.openOptionsPage()
	await chrome.action.setBadgeText({ text: 'OFF' })
})

chrome.action.onClicked.addListener(async () => {
	await chrome.runtime.openOptionsPage()
})

const isYouTubeUrl = (url: string) => {
	const u = new URL(url)
	const host = u.hostname
	return (
		host === 'www.youtube.com' ||
		host === 'm.youtube.com' ||
		host === 'youtu.be'
	)
}

// --- Fix for theater mode state tracking ---
// Map to track if WE enabled theater mode for each tab
const sessions = new Map<number, boolean>()

chrome.commands.onCommand.addListener(async (command) => {
	if (command !== 'toggle-youtube-style') {
		return
	}

	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

	if (!tab || typeof tab.id !== 'number' || typeof tab.url !== 'string') {
		return
	}

	if (!isYouTubeUrl(tab.url)) {
		return
	}

	const prevState = await chrome.action.getBadgeText({ tabId: tab.id })
	const nextState = prevState === 'ON' ? 'OFF' : 'ON'

	if (nextState === 'ON') {
		// Turn ON: Insert CSS and enable theater mode if not already enabled
		await chrome.scripting.insertCSS({
			target: { tabId: tab.id },
			files: ['styles/youtube.css'],
		})

		// Execute script and return whether we actually performed a click
		const results = await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: () => {
				const playerPage = document.querySelector(
					'ytd-watch-flexy, ytd-watch-grid',
				)
				if (playerPage && !playerPage.hasAttribute('theater')) {
					;(
						document.querySelector('.ytp-size-button') as HTMLButtonElement
					)?.click()
					return true // We toggled it ON
				}
				return false // It was already theater
			},
		})

		// Save if we were the ones who turned theater on
		sessions.set(tab.id, results[0]!.result!)
	} else {
		// Turn OFF: Remove CSS and only revert theater mode if WE enabled it
		await chrome.scripting.removeCSS({
			target: { tabId: tab.id },
			files: ['styles/youtube.css'],
		})

		const didWeToggle = sessions.get(tab.id)
		if (didWeToggle) {
			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: () => {
					const playerPage = document.querySelector(
						'ytd-watch-flexy, ytd-watch-grid',
					)
					if (playerPage && playerPage.hasAttribute('theater')) {
						;(
							document.querySelector('.ytp-size-button') as HTMLButtonElement
						)?.click()
					}
				},
			})
		}
		sessions.delete(tab.id)
	}

	await chrome.action.setBadgeText({ tabId: tab.id, text: nextState })
})

// Minimal Twitter toggle: inject/remove styles/twitter.css, no extra logic
chrome.commands.onCommand.addListener(async (command) => {
	if (command !== 'toggle-twitter-style') {
		return
	}

	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
	if (!tab || typeof tab.id !== 'number' || typeof tab.url !== 'string') {
		return
	}

	const u = new URL(tab.url)
	const host = u.hostname
	const isTwitter =
		host === 'twitter.com' ||
		host === 'www.twitter.com' ||
		host === 'x.com' ||
		host === 'www.x.com'

	if (!isTwitter) {
		return
	}

	const prevState = await chrome.action.getBadgeText({ tabId: tab.id })
	const nextState = prevState === 'ON' ? 'OFF' : 'ON'

	if (nextState === 'ON') {
		await chrome.scripting.insertCSS({
			target: { tabId: tab.id },
			files: ['styles/twitter.css'],
		})
	} else {
		await chrome.scripting.removeCSS({
			target: { tabId: tab.id },
			files: ['styles/twitter.css'],
		})
	}

	await chrome.action.setBadgeText({ tabId: tab.id, text: nextState })
})
