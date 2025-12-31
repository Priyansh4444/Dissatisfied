//@ts-ignore Safari-compatible background script using browser API
import browser from 'webextension-polyfill'

browser.runtime.onInstalled.addListener(
	async ({ reason }: { reason: string }) => {
		if (reason !== 'install') {
			return
		}

		await browser.runtime.openOptionsPage()
		await browser.browserAction.setBadgeText({ text: 'OFF' })
	},
)

browser.browserAction.onClicked.addListener(async () => {
	await browser.runtime.openOptionsPage()
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

// Map to track if WE enabled theater mode for each tab
const sessions = new Map<number, boolean>()

browser.commands.onCommand.addListener(async (command: string) => {
	if (command !== 'toggle-youtube-style') {
		return
	}

	const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

	if (!tab || typeof tab.id !== 'number' || typeof tab.url !== 'string') {
		return
	}

	if (!isYouTubeUrl(tab.url)) {
		return
	}

	const prevState = await browser.browserAction.getBadgeText({ tabId: tab.id })
	const nextState = prevState === 'ON' ? 'OFF' : 'ON'

	if (nextState === 'ON') {
		// Turn ON: Insert CSS and enable theater mode if not already enabled
		await browser.tabs.insertCSS(tab.id, {
			file: 'styles/youtube.css',
		})

		// Execute script and return whether we actually performed a click
		const results = await browser.tabs.executeScript(tab.id, {
			code: `
				(function() {
					const playerPage = document.querySelector('ytd-watch-flexy, ytd-watch-grid');
					if (playerPage && !playerPage.hasAttribute('theater')) {
						const btn = document.querySelector('.ytp-size-button');
						if (btn) btn.click();
						return true;
					}
					return false;
				})();
			`,
		})

		// Save if we were the ones who turned theater on
		sessions.set(tab.id, results[0] as boolean)
	} else {
		// Turn OFF: Remove CSS and only revert theater mode if WE enabled it
		await browser.tabs.removeCSS(tab.id, {
			file: 'styles/youtube.css',
		})

		const didWeToggle = sessions.get(tab.id)
		if (didWeToggle) {
			await browser.tabs.executeScript(tab.id, {
				code: `
					(function() {
						const playerPage = document.querySelector('ytd-watch-flexy, ytd-watch-grid');
						if (playerPage && playerPage.hasAttribute('theater')) {
							const btn = document.querySelector('.ytp-size-button');
							if (btn) btn.click();
						}
					})();
				`,
			})
		}
		sessions.delete(tab.id)
	}

	await browser.browserAction.setBadgeText({ tabId: tab.id, text: nextState })
})

// Twitter toggle
browser.commands.onCommand.addListener(async (command: string) => {
	if (command !== 'toggle-twitter-style') {
		return
	}

	const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
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

	const prevState = await browser.browserAction.getBadgeText({ tabId: tab.id })
	const nextState = prevState === 'ON' ? 'OFF' : 'ON'

	if (nextState === 'ON') {
		await browser.tabs.insertCSS(tab.id, {
			file: 'styles/twitter.css',
		})
	} else {
		await browser.tabs.removeCSS(tab.id, {
			file: 'styles/twitter.css',
		})
	}

	await browser.browserAction.setBadgeText({ tabId: tab.id, text: nextState })
})
