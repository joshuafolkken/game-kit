import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { josh_game_sync } from './josh-game-sync.ts'

// Regression guard for #416. `src/app.html` is a managed SYNC_FILES entry and now carries
// `%sveltekit.nonce%`, which SvelteKit refuses to render on a prerendered page. Without this
// detection a consumer who prerenders a route gets "Cannot use prerendering if page template
// contains %sveltekit.nonce%" on their next build, from a sync that touched no file of theirs.
// Real fixture trees rather than fs mocks: the guard's whole job is reading a directory, so mocking
// the read would leave the part that can actually be wrong untested.
describe('josh_game_sync.find_prerendering_routes (#416)', () => {
	const FIXTURES_ROOT = path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		'..',
		'__fixtures__',
	)

	it('reports every route that opts into prerendering, in both spellings', () => {
		expect(
			josh_game_sync.find_prerendering_routes(path.join(FIXTURES_ROOT, 'prerender-project')),
		).toStrictEqual([
			path.join('src', 'routes', '+layout.ts'),
			path.join('src', 'routes', 'about', '+page.ts'),
		])
	})

	it('reports nothing when no route prerenders, so the warning stays quiet', () => {
		// `prerender = false` must not match: a false positive here would train consumers to ignore
		// the warning, which is the only thing standing between them and a confusing build failure.
		expect(
			josh_game_sync.find_prerendering_routes(path.join(FIXTURES_ROOT, 'plain-project')),
		).toStrictEqual([])
	})

	it('reports nothing when the project has no routes directory', () => {
		expect(josh_game_sync.find_prerendering_routes('/nonexistent-project')).toStrictEqual([])
	})
})
