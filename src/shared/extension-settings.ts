export interface ToggleState {
	enabled: boolean
}

export interface TwitterFocusControls {
	hideSidebarColumn: boolean
	hideChatDrawer: boolean
	hideGrokDrawer: boolean
	hideHeader: boolean
	centerTimeline: boolean
}

export const STORAGE_KEYS = Object.freeze({
	YOUTUBE_PERSISTENCE_MODE: 'youtube_persistence_mode',
	TWITTER_PERSISTENCE_MODE: 'twitter_persistence_mode',
	YOUTUBE_STATE: 'youtube_state',
	TWITTER_STATE: 'twitter_state',
	YOUTUBE_SESSIONS: 'youtube_sessions',
	TWITTER_WIDTH: 'twitter_width',
	TWITTER_FONT_SIZE: 'twitter_font_size',
	TWITTER_USE_DEFAULT_FONT: 'twitter_use_default_font',
	TWITTER_FOCUS_CONTROLS: 'twitter_focus_controls',
})

export const DEFAULT_TWITTER_FOCUS_CONTROLS: Readonly<TwitterFocusControls> =
	Object.freeze({
		hideSidebarColumn: true,
		hideChatDrawer: true,
		hideGrokDrawer: true,
		hideHeader: true,
		centerTimeline: true,
	})

export const DEFAULTS = Object.freeze({
	YOUTUBE_PERSISTENCE_MODE: 'tab' as const,
	TWITTER_PERSISTENCE_MODE: 'tab' as const,
	YOUTUBE_STATE: Object.freeze({ enabled: false } as ToggleState),
	TWITTER_STATE: Object.freeze({ enabled: false } as ToggleState),
	TWITTER_WIDTH: 80,
	TWITTER_FONT_SIZE: 15,
	TWITTER_USE_DEFAULT_FONT: true,
	TWITTER_FOCUS_CONTROLS: DEFAULT_TWITTER_FOCUS_CONTROLS,
})

const YOUTUBE_HOSTS = new Set(['www.youtube.com', 'm.youtube.com', 'youtu.be'])
const TWITTER_HOSTS = new Set([
	'twitter.com',
	'www.twitter.com',
	'x.com',
	'www.x.com',
])

export const isYouTubeHost = (host: string): boolean => YOUTUBE_HOSTS.has(host)

export const isTwitterHost = (host: string): boolean => TWITTER_HOSTS.has(host)

export const isYouTubeUrl = (url: string): boolean => {
	try {
		const parsed = new URL(url)
		return isYouTubeHost(parsed.hostname)
	} catch {
		return false
	}
}

export const isTwitterUrl = (url: string): boolean => {
	try {
		const parsed = new URL(url)
		return isTwitterHost(parsed.hostname)
	} catch {
		return false
	}
}
