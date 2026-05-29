import type { Handle } from '@sveltejs/kit'
import { game_config } from '$lib/game-config'
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- reading own package.json version is the standard SvelteKit pattern for app-version injection
import { version } from '../package.json'

const APP_VERSION_PLACEHOLDER = '__APP_VERSION__'
const GAME_NAME_DISPLAY_PLACEHOLDER = '__GAME_NAME_DISPLAY__'
const GAME_NAME_UPPER_PLACEHOLDER = '__GAME_NAME_UPPER__'
const CSP_POLICY = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' blob:",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"media-src 'self' blob:",
	"worker-src 'self' blob:",
	"connect-src 'self'",
	"font-src 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'self'",
].join('; ')
const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=()'

function html_escape(string_: string): string {
	return string_
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;')
}

function inject_version(html: string): string {
	return html.replaceAll(APP_VERSION_PLACEHOLDER, version)
}

function inject_game_name(html: string): string {
	return html
		.replaceAll(GAME_NAME_DISPLAY_PLACEHOLDER, html_escape(game_config.GAME_NAME_DISPLAY))
		.replaceAll(GAME_NAME_UPPER_PLACEHOLDER, html_escape(game_config.GAME_NAME_UPPER))
}

function inject_security_headers(response: Response): void {
	response.headers.set('X-Frame-Options', 'SAMEORIGIN')
	response.headers.set('X-Content-Type-Options', 'nosniff')
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
	response.headers.set('Permissions-Policy', PERMISSIONS_POLICY)
	response.headers.set('Content-Security-Policy', CSP_POLICY)
}

const handle: Handle = async function handle({ event, resolve }) {
	const response = await resolve(event, {
		transformPageChunk({ html }) {
			return inject_game_name(inject_version(html))
		},
	})

	inject_security_headers(response)

	return response
}

export { inject_version, inject_game_name, handle }
