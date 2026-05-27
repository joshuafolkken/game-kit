import { readFileSync } from 'node:fs'
import type { RequestEvent, ResolveOptions } from '@sveltejs/kit'
import { describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line import/extensions -- `hooks.server` is a SvelteKit-mandated multi-part filename, not an extension
import { handle, inject_game_name, inject_version } from './hooks.server'

const { version } = JSON.parse(
	readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string }

type ResolveFunction = (event: RequestEvent, options?: ResolveOptions) => Promise<Response>

function make_resolve(): ResolveFunction {
	return vi.fn<ResolveFunction>().mockResolvedValue(new Response(null, { status: 200 }))
}

// `handle()` does not read event fields in the header-injection tests; minimal empty mock with a single
// type-assertion is intentional. Avoids 6 inline disables at every test call site.
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- empty-mock pattern; `const x: RequestEvent = {}` won't type-check
const MOCK_EVENT = {} as RequestEvent

describe('inject_game_name', () => {
	it('replaces __GAME_NAME__ with the all-caps game name', () => {
		const html = '<p class="game-title">__GAME_NAME__</p>'

		expect(inject_game_name(html)).toBe('<p class="game-title">JOSHUA GAME</p>')
	})

	it('replaces __GAME_NAME_DISPLAY__ with the title-case game name', () => {
		const html = '<title>__GAME_NAME_DISPLAY__</title>'

		expect(inject_game_name(html)).toBe('<title>Joshua Game</title>')
	})

	it('replaces __GAME_NAME_DISPLAY__ before __GAME_NAME__ to avoid partial match', () => {
		const html = '__GAME_NAME_DISPLAY__ and __GAME_NAME__'

		expect(inject_game_name(html)).toBe('Joshua Game and JOSHUA GAME')
	})

	it('passes through html with no placeholders', () => {
		const html = '<p>no placeholder here</p>'

		expect(inject_game_name(html)).toBe(html)
	})
})

describe('inject_version', () => {
	it('replaces the placeholder with the package version', () => {
		const html = '<p class="game-version">v__APP_VERSION__</p>'

		expect(inject_version(html)).toBe(`<p class="game-version">v${version}</p>`)
	})

	it('replaces all occurrences of the placeholder', () => {
		const html = '__APP_VERSION__ and __APP_VERSION__'

		expect(inject_version(html)).toBe(`${version} and ${version}`)
	})

	it('passes through html that has no placeholder', () => {
		const html = '<p>no placeholder here</p>'

		expect(inject_version(html)).toBe(html)
	})
})

describe('handle', () => {
	it('adds X-Frame-Options: SAMEORIGIN', async () => {
		const response = await handle({ event: MOCK_EVENT, resolve: make_resolve() })

		expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN')
	})

	it('adds X-Content-Type-Options: nosniff', async () => {
		const response = await handle({ event: MOCK_EVENT, resolve: make_resolve() })

		expect(response.headers.get('x-content-type-options')).toBe('nosniff')
	})

	it('adds Referrer-Policy: strict-origin-when-cross-origin', async () => {
		const response = await handle({ event: MOCK_EVENT, resolve: make_resolve() })

		expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
	})

	it('adds Permissions-Policy restricting camera, microphone, geolocation, payment', async () => {
		const response = await handle({ event: MOCK_EVENT, resolve: make_resolve() })
		const policy = response.headers.get('permissions-policy')

		expect(policy).toContain('camera=()')
		expect(policy).toContain('microphone=()')
		expect(policy).toContain('geolocation=()')
		expect(policy).toContain('payment=()')
	})

	it("adds Content-Security-Policy with default-src 'self'", async () => {
		const response = await handle({ event: MOCK_EVENT, resolve: make_resolve() })
		const csp = response.headers.get('content-security-policy')

		expect(csp).toContain("default-src 'self'")
		expect(csp).toContain("object-src 'none'")
		expect(csp).toContain("frame-ancestors 'self'")
	})

	it('still injects app version via transformPageChunk', async () => {
		// eslint-disable-next-line init-declarations -- assigned inside `handle` mock by transformPageChunk capture
		let captured_transform: ResolveOptions['transformPageChunk'] | undefined
		// eslint-disable-next-line @typescript-eslint/promise-function-async -- thin synchronous Promise.resolve wrapper; async would add a needless microtask before the test inspection
		const resolve = vi.fn<ResolveFunction>().mockImplementation((_event, options) => {
			captured_transform = options?.transformPageChunk

			return Promise.resolve(new Response(null, { status: 200 }))
		})

		await handle({ event: MOCK_EVENT, resolve })
		const result = await captured_transform?.({ html: 'v__APP_VERSION__', done: true })

		expect(result).toBe(`v${version}`)
	})
})
