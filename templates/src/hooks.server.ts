import type { Handle } from '@sveltejs/kit'
import { html_inject } from '$lib/html-inject'
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- reading own package.json version is the standard SvelteKit pattern for app-version injection
import { version } from '../package.json'

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
			return html_inject.inject_game_name(html_inject.inject_version(html, version))
		},
	})

	inject_security_headers(response)

	return response
}

export { handle }
