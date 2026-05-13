import { readFileSync } from 'node:fs'
import type { RequestEvent, ResolveOptions } from '@sveltejs/kit'
import { describe, expect, it, vi } from 'vitest'
import { handle, inject_version } from './hooks.server'

const { version } = JSON.parse(
	readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
) as { version: string }

type ResolveFn = (event: RequestEvent, opts?: ResolveOptions) => Promise<Response>

function make_resolve(): ResolveFn {
	return vi.fn<ResolveFn>().mockResolvedValue(new Response(null, { status: 200 }))
}

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
		const response = await handle({ event: {} as RequestEvent, resolve: make_resolve() })
		expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN')
	})

	it('adds X-Content-Type-Options: nosniff', async () => {
		const response = await handle({ event: {} as RequestEvent, resolve: make_resolve() })
		expect(response.headers.get('x-content-type-options')).toBe('nosniff')
	})

	it('adds Referrer-Policy: strict-origin-when-cross-origin', async () => {
		const response = await handle({ event: {} as RequestEvent, resolve: make_resolve() })
		expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
	})

	it('adds Permissions-Policy restricting camera, microphone, geolocation, payment', async () => {
		const response = await handle({ event: {} as RequestEvent, resolve: make_resolve() })
		const policy = response.headers.get('permissions-policy')
		expect(policy).toContain('camera=()')
		expect(policy).toContain('microphone=()')
		expect(policy).toContain('geolocation=()')
		expect(policy).toContain('payment=()')
	})

	it("adds Content-Security-Policy with default-src 'self'", async () => {
		const response = await handle({ event: {} as RequestEvent, resolve: make_resolve() })
		const csp = response.headers.get('content-security-policy')
		expect(csp).toContain("default-src 'self'")
		expect(csp).toContain("object-src 'none'")
		expect(csp).toContain("frame-ancestors 'self'")
	})

	it('still injects app version via transformPageChunk', async () => {
		let captured_transform: ResolveOptions['transformPageChunk'] | undefined
		const resolve = vi.fn<ResolveFn>().mockImplementation((_event, opts) => {
			captured_transform = opts?.transformPageChunk
			return Promise.resolve(new Response(null, { status: 200 }))
		})
		await handle({ event: {} as RequestEvent, resolve })
		const result = await captured_transform?.({ html: 'v__APP_VERSION__', done: true })
		expect(result).toBe(`v${version}`)
	})
})
