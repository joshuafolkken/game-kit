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

	it('leaves ignorePaths empty inline and imports the never-synced cspell.project.yaml', () => {
		// Consumer ignorePaths live in cspell.project.yaml (game-kit#385); the synced config keeps
		// `ignorePaths: []` and imports the consumer file so cspell unions the two.
		expect(config).toContain('ignorePaths: []')
		expect(config).toContain('- ./cspell.project.yaml')
	})
})

describe('jgame_cspell_config.extract_ignore_paths_from_config', () => {
	it('extracts a block ignorePaths list, skipping interior comments', () => {
		const config = [
			'ignorePaths:',
			'  # Generated base64 ROM tables — binary data, not natural-language text.',
			'  - src/lib/game/generated/hp1345a-rom.ts',
			'  - static/generated/**',
		].join('\n')

		expect(jgame_cspell_config.extract_ignore_paths_from_config(config)).toEqual([
			'src/lib/game/generated/hp1345a-rom.ts',
			'static/generated/**',
		])
	})

	it('extracts an inline ignorePaths sequence and returns [] for an empty one', () => {
		expect(
			jgame_cspell_config.extract_ignore_paths_from_config('ignorePaths: [a.ts, "b/**"]'),
		).toEqual(['a.ts', 'b/**'])
		expect(jgame_cspell_config.extract_ignore_paths_from_config('ignorePaths: []')).toEqual([])
	})

	it('keeps a brace-expansion glob intact (does not split on commas inside {…})', () => {
		expect(
			jgame_cspell_config.extract_ignore_paths_from_config(
				'ignorePaths: [src/**/*.{gen,d}.ts, x.ts]',
			),
		).toEqual(['src/**/*.{gen,d}.ts', 'x.ts'])
	})
})

describe('jgame_cspell_config.render_project_cspell_config', () => {
	it('renders an empty ignorePaths list when there is nothing to seed', () => {
		const rendered = jgame_cspell_config.render_project_cspell_config([])

		expect(rendered).toContain('ignorePaths: []')
		expect(rendered).toContain("version: '0.2'")
	})

	it('renders a block ignorePaths list (deduped, single-quoted) for migrated entries', () => {
		const rendered = jgame_cspell_config.render_project_cspell_config(['a.ts', 'b.ts', 'a.ts'])

		expect(rendered).toContain("ignorePaths:\n  - 'a.ts'\n  - 'b.ts'\n")
		expect(rendered).not.toContain("  - 'a.ts'\n  - 'b.ts'\n  - 'a.ts'")
	})

	it('single-quotes entries so glob ignorePaths (**/x) stay valid YAML (no alias parse error)', () => {
		// An unquoted leading `*` is a YAML alias indicator and fails to parse — quoting is required.
		const rendered = jgame_cspell_config.render_project_cspell_config(['**/*.gen.ts'])

		expect(rendered).toContain("  - '**/*.gen.ts'")
	})
})

describe('jgame_cspell_config.extract_words_from_config', () => {
	it('pulls plain and quoted words out of a legacy block words list', () => {
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

	it('pulls words out of an inline flow sequence (words: [a, b]), plain and quoted', () => {
		expect(jgame_cspell_config.extract_words_from_config('words: [waneccha, mnemecha]')).toEqual([
			'waneccha',
			'mnemecha',
		])
		expect(jgame_cspell_config.extract_words_from_config(`words: ['waneccha', "mygame"]`)).toEqual([
			'waneccha',
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

	it('migrates a legacy block words list into project-words.txt and relayers the config', () => {
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

	it('migrates a legacy inline words sequence (words: [a, b]) before rewriting the config', () => {
		const legacy = [
			"version: '0.2'",
			"import:\n  - '@joshuafolkken/game-kit/cspell/game'",
			'words: [waneccha, mnemecha]',
			'ignorePaths: []',
		].join('\n')

		writeFileSync(path.join(project_directory, 'cspell.config.yaml'), legacy)
		jgame_cspell_config.write_cspell_config(project_directory)

		const words = readFileSync(path.join(project_directory, 'project-words.txt'), 'utf8')
		const config = readFileSync(path.join(project_directory, 'cspell.config.yaml'), 'utf8')

		expect(words).toContain('waneccha')
		expect(words).toContain('mnemecha')
		expect(config).not.toContain('waneccha')
	})

	it('leaves an existing project-words.txt untouched on a re-sync with nothing to migrate', () => {
		const owned = '# my words\nmygame\n'

		writeFileSync(path.join(project_directory, 'project-words.txt'), owned)
		jgame_cspell_config.write_cspell_config(project_directory)

		expect(readFileSync(path.join(project_directory, 'project-words.txt'), 'utf8')).toBe(owned)
	})

	it('migrates a consumer ignorePaths entry into cspell.project.yaml and relayers the config (#385)', () => {
		const legacy = [
			"version: '0.2'",
			"import:\n  - '@joshuafolkken/game-kit/cspell/game'",
			'ignorePaths:',
			'  - src/lib/game/generated/hp1345a-rom.ts',
		].join('\n')

		writeFileSync(path.join(project_directory, 'cspell.config.yaml'), legacy)
		jgame_cspell_config.write_cspell_config(project_directory)

		const project_cspell = readFileSync(path.join(project_directory, 'cspell.project.yaml'), 'utf8')
		const config = readFileSync(path.join(project_directory, 'cspell.config.yaml'), 'utf8')

		expect(project_cspell).toContain('src/lib/game/generated/hp1345a-rom.ts')
		expect(config).toContain('- ./cspell.project.yaml')
		expect(config).not.toContain('hp1345a-rom')
	})

	it('seeds a cspell.project.yaml even when the project has no ignorePaths to migrate', () => {
		// The synced config imports cspell.project.yaml, so cspell errors if the file is absent —
		// it must always be seeded (empty ignorePaths) on a pristine project.
		jgame_cspell_config.write_cspell_config(project_directory)

		const project_cspell = readFileSync(path.join(project_directory, 'cspell.project.yaml'), 'utf8')

		expect(project_cspell).toContain('ignorePaths: []')
	})

	it('leaves an existing cspell.project.yaml untouched on a re-sync (consumer-owned)', () => {
		const owned = "version: '0.2'\nignorePaths:\n  - my/own/path.ts\n"

		writeFileSync(path.join(project_directory, 'cspell.project.yaml'), owned)
		jgame_cspell_config.write_cspell_config(project_directory)

		expect(readFileSync(path.join(project_directory, 'cspell.project.yaml'), 'utf8')).toBe(owned)
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
