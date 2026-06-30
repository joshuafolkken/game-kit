import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { jgame_cspell_config } from './jgame-cspell-config.ts'

function read_repo_file(relative_path: string): string {
	return readFileSync(fileURLToPath(new URL(`../../${relative_path}`, import.meta.url)), 'utf8')
}

describe('jgame_cspell_config.generate_cspell_config', () => {
	const config = jgame_cspell_config.generate_cspell_config()

	it('imports the distributed game-aware dictionary instead of bare kit cspell', () => {
		expect(config).toContain("import:\n  - '@joshuafolkken/game-kit/cspell/game'")
	})

	it('references the never-synced project-words dictionary instead of an inline words list', () => {
		// The synced config holds NO consumer content (game-kit#375), so jgame sync can refresh
		// it every bump without deleting project words — those live in project-words.txt.
		expect(config).toContain('path: ./project-words.txt')
		expect(config).toContain('addWords: true')
		expect(config).toContain('dictionaries:\n  - project-words')
		expect(config).not.toContain('words:')
	})

	it('leaves ignorePaths empty (the credits ignore comes from the imported dictionary)', () => {
		expect(config).toContain('ignorePaths: []')
	})
})

describe('jgame_cspell_config.extract_words_from_config', () => {
	it('pulls plain and quoted words out of a legacy inline words list', () => {
		const config = [
			"version: '0.2'",
			'import:',
			"  - '@joshuafolkken/game-kit/cspell/game'",
			'words:',
			'  - waneccha',
			"  - 'mnemecha'",
			'  - "mygame"',
			'ignorePaths: []',
		].join('\n')

		expect(jgame_cspell_config.extract_words_from_config(config)).toEqual([
			'waneccha',
			'mnemecha',
			'mygame',
		])
	})

	it('returns no words for an already-layered config (words: [] or absent)', () => {
		expect(jgame_cspell_config.extract_words_from_config('words: []')).toEqual([])
		expect(jgame_cspell_config.extract_words_from_config('ignorePaths: []')).toEqual([])
	})
})

describe('jgame_cspell_config.build_project_words_file', () => {
	it('seeds a new file with a header and the migrated words', () => {
		const content = jgame_cspell_config.build_project_words_file(null, ['waneccha', 'mnemecha'])

		expect(content).toContain('# Project-specific cspell words')
		expect(content).toContain('\nwaneccha\nmnemecha\n')
	})

	it('appends only the words missing from an existing consumer file, preserving it verbatim', () => {
		const existing = '# my words\nwaneccha\n'
		const content = jgame_cspell_config.build_project_words_file(existing, ['waneccha', 'mnemecha'])

		expect(content).toBe('# my words\nwaneccha\nmnemecha\n')
	})

	it('returns null when an existing file already has every word (no rewrite)', () => {
		expect(jgame_cspell_config.build_project_words_file('waneccha\n', ['waneccha'])).toBeNull()
		expect(jgame_cspell_config.build_project_words_file('# only comments\n', [])).toBeNull()
	})
})

describe('jgame_cspell_config.write_cspell_config — migration (game-kit#375)', () => {
	// eslint-disable-next-line init-declarations -- assigned in beforeEach per-test temp dir
	let project_directory: string

	beforeEach(() => {
		project_directory = mkdtempSync(path.join(tmpdir(), 'jgame-cspell-'))
	})

	afterEach(() => {
		rmSync(project_directory, { recursive: true, force: true })
	})

	it('migrates a legacy inline words list into project-words.txt and relayers the config', () => {
		const legacy = [
			"version: '0.2'",
			'import:',
			"  - '@joshuafolkken/game-kit/cspell/game'",
			'words:',
			'  - waneccha',
			'  - mnemecha',
			'ignorePaths: []',
		].join('\n')

		writeFileSync(path.join(project_directory, 'cspell.config.yaml'), legacy)
		jgame_cspell_config.write_cspell_config(project_directory)

		const words = readFileSync(path.join(project_directory, 'project-words.txt'), 'utf8')
		const config = readFileSync(path.join(project_directory, 'cspell.config.yaml'), 'utf8')

		expect(words).toContain('waneccha')
		expect(words).toContain('mnemecha')
		expect(config).toContain('path: ./project-words.txt')
		expect(config).not.toContain('waneccha')
	})

	it('leaves an existing project-words.txt untouched on a re-sync with nothing to migrate', () => {
		const owned = '# my words\nmygame\n'

		writeFileSync(path.join(project_directory, 'project-words.txt'), owned)
		jgame_cspell_config.write_cspell_config(project_directory)

		expect(readFileSync(path.join(project_directory, 'project-words.txt'), 'utf8')).toBe(owned)
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
