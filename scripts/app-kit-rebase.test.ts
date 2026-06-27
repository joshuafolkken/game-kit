import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Contract guard for #355 (acceptance criterion #3): game-kit's own SvelteKit config
// surface consumes `@joshuafolkken/app-kit/*/sveltekit` — no `@joshuafolkken/kit/*/sveltekit`
// import may remain in game-kit's own config files. The base `@joshuafolkken/kit/prettier`
// and `@joshuafolkken/kit/scripts/*` references are intentionally untouched (app-kit owns only
// the SvelteKit layer and peer-depends on kit), so the guard matches the `/sveltekit` subpath
// specifically rather than any kit reference.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const KIT_SVELTEKIT_IMPORT = /@joshuafolkken\/kit\/(?:eslint|tsconfig|cspell)\/sveltekit/u

function read_repo_file(relative_path: string): string {
	return readFileSync(path.join(REPO_ROOT, relative_path), 'utf8')
}

describe("game-kit's own config consumes app-kit, not kit, for the SvelteKit layer (#355)", () => {
	it.each([
		['eslint.config.js', '@joshuafolkken/app-kit/eslint/sveltekit'],
		['tsconfig.json', '@joshuafolkken/app-kit/tsconfig/sveltekit.jsonc'],
		['cspell/game.yaml', '@joshuafolkken/app-kit/cspell/sveltekit'],
	])('%s references the app-kit SvelteKit preset', (file, app_kit_reference) => {
		expect(read_repo_file(file)).toContain(app_kit_reference)
	})

	it.each(['eslint.config.js', 'tsconfig.json', 'cspell/game.yaml'])(
		'%s carries no @joshuafolkken/kit/*/sveltekit import',
		(file) => {
			expect(read_repo_file(file)).not.toMatch(KIT_SVELTEKIT_IMPORT)
		},
	)
})
