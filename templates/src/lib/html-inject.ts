import { game_config } from '$lib/game-config'

const APP_VERSION_PLACEHOLDER = '__APP_VERSION__'
const GAME_NAME_DISPLAY_PLACEHOLDER = '__GAME_NAME_DISPLAY__'
const GAME_NAME_UPPER_PLACEHOLDER = '__GAME_NAME_UPPER__'

function html_escape(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;')
}

// Function-replacer form so a `$` in the value (e.g. a `1.0.0-$beta` version) is
// inserted verbatim instead of being read as a String.prototype.replace pattern.
function inject_placeholder(html: string, placeholder: string, value: string): string {
	return html.replaceAll(placeholder, () => value)
}

function inject_version(html: string, version: string): string {
	return inject_placeholder(html, APP_VERSION_PLACEHOLDER, version)
}

function inject_game_name(html: string): string {
	const with_display = inject_placeholder(
		html,
		GAME_NAME_DISPLAY_PLACEHOLDER,
		html_escape(game_config.GAME_NAME_DISPLAY),
	)

	return inject_placeholder(
		with_display,
		GAME_NAME_UPPER_PLACEHOLDER,
		html_escape(game_config.GAME_NAME_UPPER),
	)
}

const html_inject = { html_escape, inject_placeholder, inject_version, inject_game_name }
export { html_inject }
