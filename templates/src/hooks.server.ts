import { security_headers } from '@joshuafolkken/app-kit/security'
import type { Handle } from '@sveltejs/kit'
import { html_inject } from '$lib/html-inject'
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- reading own package.json version is the standard SvelteKit pattern for app-version injection
import { version } from '../package.json'

// The baseline headers come from app-kit rather than a local list, so a header added upstream
// reaches this app on the next update instead of drifting behind a copy.
//
// Two values deliberately CHANGED when this replaced the hand-rolled block (#416): X-Frame-Options
// moved SAMEORIGIN -> DENY (stricter; nothing embeds this app in a frame) and Permissions-Policy
// dropped `payment=()` (the baseline denies camera, microphone and geolocation but not payment).
// Neither is load-bearing here — there is no payment code and no iframe — and matching the baseline
// exactly is what keeps a consumer's expectations derivable from app-kit rather than restated. To
// re-add a value, pass it as the `extra` argument below and hoist that array into a module
// `src/routes/security-headers.e2e.ts` imports too, so the header and its assertion stay in step.
//
// Content-Security-Policy is deliberately absent from that baseline and is NOT set here either:
// `kit.csp` in svelte.config.js emits it with a per-request nonce, which a flat header cannot
// reproduce. Setting one here too would deliver two policies, and a browser enforces every
// delivered policy at once — the nonce-less one would block the very scripts the nonce allows.
const handle: Handle = async function handle({ event, resolve }) {
	const response = await resolve(event, {
		transformPageChunk({ html }) {
			return html_inject.inject_game_name(html_inject.inject_version(html, version))
		},
	})

	return security_headers.apply_security_headers(response)
}

export { handle }
