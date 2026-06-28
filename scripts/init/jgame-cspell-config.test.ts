import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { jgame_cspell_config } from './jgame-cspell-config.ts'

function read_repo_file(relative_path: string): string {
	return readFileSync(fileURLToPath(new URL(`../../${relative_path}`, import.meta.url)), 'utf8')
}

describe('jgame_cspell_config.generate_cspell_config', () => {
	const config = jgame_cspell_config.generate_cspell_config()

	it('imports the distributed game-aware dictionary instead of bare kit cspell', () => {
		expect(config).toContain("import:\n  - '@joshuafolkken/game-kit/cspell/game'")
	})

	it('leaves words empty for the user to fill with project-specific names', () => {
		expect(config).toContain('words: []')
	})

	it('leaves ignorePaths empty (the credits ignore comes from the imported dictionary)', () => {
		expect(config).toContain('ignorePaths: []')
	})
})

describe('distributed cspell/game.yaml', () => {
	const game_dictionary = read_repo_file('cspell/game.yaml')

	it('chains app-kit cspell so the scaffold inherits kit base + sveltekit words', () => {
		expect(game_dictionary).toContain("- '@joshuafolkken/app-kit/cspell/sveltekit'")
	})

	it.each(['gameover', 'threlte', 'COEFF', 'SAMEORIGIN', 'trycloudflare', 'Orbitron', 'viewbox'])(
		'carries the game-template word %s so non-ignored scaffold files pass cspell',
		(word) => {
			expect(game_dictionary).toContain(`- ${word}`)
		},
	)

	it('ignores the credits file whose proper nouns are inherently project-specific', () => {
		expect(game_dictionary).toContain("- '**/game/credits.ts'")
	})
})

describe('package.json distribution wiring', () => {
	const package_json = read_repo_file('package.json')

	it('exports the game dictionary subpath so scaffolds can import it', () => {
		expect(package_json).toContain('"./cspell/game": "./cspell/game.yaml"')
	})

	it('ships the cspell directory in the published tarball', () => {
		// Assert on the parsed files array specifically, so it cannot pass on the
		// unrelated "cspell" devDependency / script entries elsewhere in package.json.
		const parsed = JSON.parse(package_json)

		expect(parsed.files).toContain('cspell')
	})
})

describe('root cspell single-sourcing', () => {
	const root_config = read_repo_file('cspell.config.yaml')

	// Quote style is owned by app-kit's `josh-app sync` (it quotes the @-scoped base
	// import but leaves the relative path a plain scalar), so match the import
	// without pinning the quote — a hard-coded quote would break on every sync.
	it('imports the shared game dictionary so game-common words cannot drift', () => {
		expect(root_config).toMatch(/- ["']?\.\/cspell\/game\.yaml["']?/u)
	})

	it('no longer duplicates a game-common word the shared dictionary already provides', () => {
		expect(root_config).not.toContain('- gameover')
	})
})
