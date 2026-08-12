import { readFileSync } from 'node:fs'
import { security_headers } from '@joshuafolkken/app-kit/security'
import type { RequestEvent, ResolveOptions } from '@sveltejs/kit'
import { describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line import/extensions -- `hooks.server` is a SvelteKit-mandated multi-part filename, not an extension
import { handle } from './hooks.server'

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

describe('handle', () => {
	// Asserted against app-kit's exported baseline rather than a restated literal list: the point of
	// #416 was to stop game-kit keeping its own copy of these values, and a hardcoded expectation
	// here would reintroduce exactly that drift one layer down. `composed_headers()` rather than
	// SECURITY_HEADERS because it is what the hook actually applies — the two differ the moment an
	// `extra` array is passed.
	it.each(security_headers.composed_headers())(
		'serves the app-kit baseline %s',
		async (name, value) => {
			const response = await handle({ event: MOCK_EVENT, resolve: make_resolve() })

			expect(response.headers.get(name.toLowerCase())).toBe(value)
		},
	)

	it('leaves Content-Security-Policy to kit.csp so the per-request nonce is the only policy', async () => {
		// Two delivered policies are enforced as their intersection, so a flat header set here would
		// block the scripts svelte.config.js's nonce exists to allow.
		const response = await handle({ event: MOCK_EVENT, resolve: make_resolve() })

		expect(response.headers.get('content-security-policy')).toBeNull()
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
