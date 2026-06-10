import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { jgame_root_files } from '#scripts/init/jgame-root-files.ts'
import { describe, expect, it } from 'vitest'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(HERE, '..', '..')
const TEMPLATES_DIR = path.join(REPO_ROOT, 'templates')
const TEMPLATES_GAME_DIR = path.join(TEMPLATES_DIR, 'src', 'lib', 'game')
const TEMPLATE_PAGE_PATH = path.join(TEMPLATES_DIR, 'src', 'routes', '+page.svelte')
const GAME_SCENE_PATH = path.join(REPO_ROOT, 'src', 'lib', 'game-kit', 'GameScene.svelte')

function extract_game_scene_tag(source: string): string {
	const match = /<GameScene\b([^>]*)>/u.exec(source)
	if (match === null) throw new Error('GameScene opening tag not found')

	return match[1]
}

function extract_properties_interface(source: string): string {
	const match = /interface Props \{([\s\S]*?)\}/u.exec(source)
	if (match === null) throw new Error('GameScene Props interface not found')

	return match[1]
}

function collect_label_properties(text: string): Array<string> {
	return [...text.matchAll(/\blabel_\w+/gu)].map((occurrence) => occurrence[0])
}

// Byte-identical, import-decoupled files single-sourced at the repo root (#266).
// They are copied directly from the package root by jgame init / sync and MUST
// NOT reappear as duplicates under templates/, or drift becomes possible again.
// Derived from the production list so a newly root-sourced file is auto-guarded.
// (Import-coupled byte copies like layout.css / Score.svelte.ts deliberately
// remain under templates/ as COPY_PAIRS until their importers leave templates.)
const ROOT_SOURCED_FILES = jgame_root_files.ROOT_COPY_FILES

describe('templates/ excludes root-single-sourced files (regression for #266)', () => {
	it.each(ROOT_SOURCED_FILES)('does not duplicate %s under templates/', (relative_path) => {
		expect(existsSync(path.join(TEMPLATES_DIR, relative_path))).toBe(false)
	})
})

describe('templates/src/lib/game/Board.svelte has the #137 readability behavior (regression for #267 drift)', () => {
	const board_source = readFileSync(path.join(TEMPLATES_GAME_DIR, 'Board.svelte'), 'utf8')

	it('wraps the multi-line GAME OVER label instead of showing it on one line', () => {
		expect(board_source).toContain(String.raw`text_gameover.replace(' ', '\n')`)
	})

	it('shows the round as a large bare digit (no ROUND prefix, larger focal font)', () => {
		expect(board_source).toContain('ROUND_DIGIT_FONT_SIZE')
		expect(board_source).toContain('return String(game_data.round)')
		// The stale pre-#137 form prefixed the digit with the ROUND label.
		expect(board_source).not.toContain('text_round')
	})

	it('passes a per-state line height to the centre Text (multi-line spacing)', () => {
		expect(board_source).toContain('lineHeight={current_line_height}')
		expect(board_source).toContain('MULTILINE_LINE_HEIGHT')
	})
})

describe('templates board-config scoreboard depth matches root (#267)', () => {
	const ROOT_GAME_DIR = path.join(HERE, '..', '..', 'src', 'lib', 'game')

	function read_z_offset(directory: string): string {
		const source = readFileSync(path.join(directory, 'board-config.ts'), 'utf8')
		const value = /SCORE_DISPLAY_Z_OFFSET\s*=\s*([\d.]+)/u.exec(source)?.[1]
		if (value === undefined) throw new Error('SCORE_DISPLAY_Z_OFFSET not found')

		return value
	}

	it('keeps the template SCORE_DISPLAY_Z_OFFSET aligned with the root value', () => {
		expect(read_z_offset(TEMPLATES_GAME_DIR)).toBe(read_z_offset(ROOT_GAME_DIR))
	})
})

describe('templates/src/lib/game content shape (regression for #178)', () => {
	it('does not ship a placeholder game-name.ts (game identity must flow from the generated game-config.ts)', () => {
		const game_name_path = path.join(TEMPLATES_GAME_DIR, 'game-name.ts')

		expect(existsSync(game_name_path)).toBe(false)
	})

	it('credits.ts imports game identity from $lib/game-config, not from ./game-name', () => {
		const credits_source = readFileSync(path.join(TEMPLATES_GAME_DIR, 'credits.ts'), 'utf8')

		expect(credits_source).toContain("import { game_config } from '$lib/game-config'")
		expect(credits_source).not.toMatch(/from\s+["']\.\/game-name["']/u)
	})

	it('credits.ts references game_config fields instead of the bare GAME_NAME / GAME_NAME_DISPLAY identifiers', () => {
		const credits_source = readFileSync(path.join(TEMPLATES_GAME_DIR, 'credits.ts'), 'utf8')

		expect(credits_source).toContain('game_config.GAME_NAME_UPPER')
		expect(credits_source).toContain('game_config.GAME_NAME_DISPLAY')
		// Reject any bare GAME_NAME / GAME_NAME_DISPLAY / GAME_NAME_UPPER token
		// that is not qualified by `game_config.` — catches mixed usage that the
		// positive assertions above cannot detect on their own.
		expect(credits_source).not.toMatch(/(?<!game_config\.)\bGAME_NAME(_DISPLAY|_UPPER)?\b/u)
	})
})

describe('templates/pnpm-workspace.yaml minimumReleaseAgeExclude (regression for #180)', () => {
	it('includes @joshuafolkken/game-kit as a bare-name entry (without @version pin)', () => {
		const yaml_source = readFileSync(path.join(TEMPLATES_DIR, 'pnpm-workspace.yaml'), 'utf8')

		// pnpm honors bare-name entries for lockfile verification; version-pinned
		// entries written by loose-mode resolution do NOT bypass the verify step.
		// eslint-disable-next-line sonarjs/slow-regex -- bounded input (a small workspace yaml); anchored line match is safe
		expect(yaml_source).toMatch(/^\s*-\s*["']?@joshuafolkken\/game-kit["']?\s*$/mu)
		// Guard against accidental @version-pinned form sneaking in instead.
		// eslint-disable-next-line sonarjs/slow-regex -- bounded input (a small workspace yaml); anchored line match is safe
		expect(yaml_source).not.toMatch(/^\s*-\s*["']?@joshuafolkken\/game-kit@\d/mu)
	})
})

describe('templates/src/routes/+page.svelte GameScene props track the GameScene API (regression for #294)', () => {
	const REMOVED_PROPS = ['label_move', 'label_look', 'label_action', 'label_return'] as const
	const template_page = readFileSync(TEMPLATE_PAGE_PATH, 'utf8')
	const game_scene = readFileSync(GAME_SCENE_PATH, 'utf8')

	it('only passes label_* props that GameScene declares in its Props interface', () => {
		const declared = new Set(collect_label_properties(extract_properties_interface(game_scene)))
		const passed = collect_label_properties(extract_game_scene_tag(template_page))
		const unknown = passed.filter((name) => !declared.has(name))

		expect(unknown).toEqual([])
	})

	it.each(REMOVED_PROPS)('does not pass the removed %s prop', (property) => {
		expect(extract_game_scene_tag(template_page)).not.toContain(property)
	})
})

describe('templates/vite.config.ts ships the vitest test config required by josh test:unit (regression for #322)', () => {
	const vite_config_source = readFileSync(path.join(TEMPLATES_DIR, 'vite.config.ts'), 'utf8')

	it('imports defineConfig from vitest/config and the playwright browser provider', () => {
		expect(vite_config_source).toContain("import { defineConfig } from 'vitest/config'")
		expect(vite_config_source).toContain("import { playwright } from '@vitest/browser-playwright'")
		// The pre-#322 form imported defineConfig from plain vite, which drops the
		// `test` typing and silently accepts a vitest run with no test config.
		expect(vite_config_source).not.toContain("import { defineConfig } from 'vite'")
	})

	it('requires assertions in every test', () => {
		expect(vite_config_source).toContain('expect: { requireAssertions: true }')
	})

	it('defines the client browser project running svelte specs in headless chromium', () => {
		expect(vite_config_source).toContain("name: 'client'")
		expect(vite_config_source).toContain('provider: playwright()')
		expect(vite_config_source).toContain("instances: [{ browser: 'chromium', headless: true }]")
		expect(vite_config_source).toContain("include: ['src/**/*.svelte.{test,spec}.{js,ts}']")
	})

	it('defines the server node project excluding the svelte specs', () => {
		expect(vite_config_source).toContain("name: 'server'")
		expect(vite_config_source).toContain("environment: 'node'")
		expect(vite_config_source).toContain("include: ['src/**/*.{test,spec}.{js,ts}']")
		expect(vite_config_source).toContain("exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']")
	})
})

describe('.gitignore ignores generated .svelte-kit at any depth (regression for #296)', () => {
	const gitignore_source = readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8')

	it('ignores .svelte-kit with an un-anchored pattern so templates/.svelte-kit is covered too', () => {
		// An un-anchored pattern (no leading slash) matches .svelte-kit at any depth,
		// including the generated templates/.svelte-kit that the npm tarball ships.
		expect(gitignore_source).toMatch(/^\.svelte-kit\/?$/mu)
	})

	it('does not keep the old root-anchored /.svelte-kit pattern that missed templates/', () => {
		// A leading slash anchors to the repo root and leaves templates/.svelte-kit tracked.
		expect(gitignore_source).not.toMatch(/^\/\.svelte-kit(\/|$)/mu)
	})
})
