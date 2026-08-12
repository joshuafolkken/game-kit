import adapter from '@sveltejs/adapter-cloudflare'

// Content-Security-Policy lives here, not in `_headers` or `hooks.server.ts`.
//
// `_headers` decorates STATIC-ASSET responses only, which Worker-rendered pages bypass entirely,
// and a flat header cannot carry a per-request nonce. SvelteKit emits the policy itself from this
// block, stamping the nonce onto the scripts it injects; `src/app.html`'s two inline scripts opt
// into the same nonce with `nonce="%sveltekit.nonce%"`. Mode is left at the default `auto`
// (nonce for SSR, hashes when prerendered) — no route in this app is prerendered, and SvelteKit
// throws outright if a prerendered page template contains that placeholder.
//
// `style-src` KEEPS 'unsafe-inline' deliberately: `app.html` ships an inline <style> for the
// loading overlay and Svelte injects <style> at runtime for transitions. It is also what stops
// SvelteKit adding a nonce to style-src — a nonce would make browsers ignore 'unsafe-inline' and
// white-screen every animated page. Inline style cannot execute JS, so script-src stays locked to
// 'self' + nonce. The DAST triage in zap-baseline.conf records the same reasoning for rule 10055.
const CSP_DIRECTIVES = {
	'default-src': ['self'],
	// `blob:` is load-bearing, and `worker-src` below does NOT cover it. troika-three-text (pulled in
	// by @threlte/extras' <Text>) spawns its worker from a blob URL and then calls importScripts() on
	// further blob URLs from inside it; a blob worker inherits the DOCUMENT's script-src, so dropping
	// `blob:` here blocks that importScripts, the worker never rehydrates, and the scene never
	// reaches ready — the loading overlay sticks at "LOADING ASSETS..." forever. The loading-overlay
	// cases in src/routes/page.e2e.ts are the guard; note that the CSP-violation case in
	// security-headers.e2e.ts does NOT catch it, because the violation is reported inside the worker
	// and its listener is on `document`. 'unsafe-inline' stays out — the nonce covers inline scripts.
	//
	// `wasm-unsafe-eval` is the second documented widening, and it is narrow on purpose: it permits
	// WebAssembly compilation ONLY — `eval()` and `new Function()` stay blocked, which `unsafe-eval`
	// would have opened. three's meshopt decoder calls WebAssembly.instantiate() at module scope, and
	// @threlte/extras reaches it; without this the browser reports `script-src` / `blocked=wasm-eval`
	// on every dev page load. The production bundle tree-shakes meshopt away, but still ships three's
	// draco and basis decoders under _app/immutable/assets, so the same block is one DRACO-compressed
	// model or KTX2 texture away in production too — hence one policy for both, not a dev-only
	// relaxation that would let the difference surface first in production.
	'script-src': ['self', 'blob:', 'wasm-unsafe-eval'],
	'style-src': ['self', 'unsafe-inline'],
	'img-src': ['self', 'data:', 'blob:'],
	// three.js decodes textures and streams audio through object URLs.
	'media-src': ['self', 'blob:'],
	'worker-src': ['self', 'blob:'],
	'connect-src': ['self'],
	'font-src': ['self'],
	'object-src': ['none'],
	'base-uri': ['self'],
	'form-action': ['self'],
	// Pairs with the baseline `X-Frame-Options: DENY` that app-kit applies in hooks.server.ts.
	'frame-ancestors': ['none'],
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: true,
	},
	kit: {
		adapter: adapter(),
		csp: {
			directives: CSP_DIRECTIVES,
		},
	},
}

export default config
