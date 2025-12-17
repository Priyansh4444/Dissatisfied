chrome.runtime.onInstalled.addListener(async ({ reason }) => {
	try {
		if (reason !== 'install') {
			return
		}

		await chrome.runtime.openOptionsPage()
		await chrome.action.setBadgeText({ text: 'OFF' })
	} catch (err) {
		// Do nothing
	}
})

const isYouTubeUrl = (url: string) => {
	try {
		const u = new URL(url)
		const host = u.hostname
		return (
			host === 'www.youtube.com' ||
			host === 'm.youtube.com' ||
			host === 'youtu.be'
		)
	} catch (e) {
		return false
	}
}

// Clicking the badge does nothing
chrome.action.onClicked.addListener(async (_tab) => {
	// Intentionally left blank
})

chrome.commands.onCommand.addListener(async (command) => {
	try {
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

		await chrome.action.setBadgeText({ tabId: tab.id, text: nextState })

		if (nextState === 'ON') {
			await chrome.scripting.insertCSS({
				target: { tabId: tab.id },
				files: ['styles/youtube.css'],
			})
			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: () => {
					const playerPage = document.querySelector(
						'ytd-watch-flexy, ytd-watch-grid',
					)
					const theaterButton = document.querySelector(
						'.ytp-size-button',
					) as HTMLButtonElement
					if (playerPage && !playerPage.hasAttribute('theater')) {
						theaterButton?.click()
					}
				},
			})
		} else {
			await chrome.scripting.removeCSS({
				target: { tabId: tab.id },
				files: ['styles/youtube.css'],
			})
			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: () => {
					const playerPage = document.querySelector(
						'ytd-watch-flexy, ytd-watch-grid',
					)
					const theaterButton = document.querySelector(
						'.ytp-size-button',
					) as HTMLButtonElement
					if (playerPage && playerPage.hasAttribute('theater')) {
						theaterButton?.click()
					}
				},
			})
		}
	} catch (err) {
		// Do nothing
	}
})
