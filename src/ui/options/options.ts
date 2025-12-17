const popupButton = document.getElementById('popup-button')

if (popupButton) {
	popupButton.addEventListener('click', async () => {
		await browser.action.openPopup()
	})
} else {
	console.warn('[options] #popup-button not found; skipping event binding.')
}
