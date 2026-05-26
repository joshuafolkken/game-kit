import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = path.join(HERE, '..', 'templates')
const TEMPLATES_GAME_DIR = path.join(TEMPLATES_DIR, 'src', 'lib', 'game')

describe('templates/src/lib/game content shape (regression for #178)', () => {
	it('does not ship a placeholder game-name.ts (game identity must flow from the generated game-config.ts)', () => {
		const game_name_path = path.join(TEMPLATES_GAME_DIR, 'game-name.ts')
		expect(existsSync(game_name_path)).toBe(false)
	})

	it('credits.ts imports game identity from $lib/game-config, not from ./game-name', () => {
		const credits_source = readFileSync(path.join(TEMPLATES_GAME_DIR, 'credits.ts'), 'utf8')
		expect(credits_source).toContain("import { game_config } from '$lib/game-config'")
		expect(credits_source).not.toMatch(/from\s+['"]\.\/game-name['"]/)
	})

	it('credits.ts references game_config fields instead of the bare GAME_NAME / GAME_NAME_DISPLAY identifiers', () => {
		const credits_source = readFileSync(path.join(TEMPLATES_GAME_DIR, 'credits.ts'), 'utf8')
		expect(credits_source).toContain('game_config.GAME_NAME_UPPER')
		expect(credits_source).toContain('game_config.GAME_NAME_DISPLAY')
		// Reject any bare GAME_NAME / GAME_NAME_DISPLAY / GAME_NAME_UPPER token
		// that is not qualified by `game_config.` — catches mixed usage that the
		// positive assertions above cannot detect on their own.
		expect(credits_source).not.toMatch(/(?<!game_config\.)\bGAME_NAME(_DISPLAY|_UPPER)?\b/)
	})
})

describe('templates/pnpm-workspace.yaml minimumReleaseAgeExclude (regression for #180)', () => {
	it('includes @joshuafolkken/game-kit as a bare-name entry (without @version pin)', () => {
		const yaml_source = readFileSync(path.join(TEMPLATES_DIR, 'pnpm-workspace.yaml'), 'utf8')
		// pnpm honors bare-name entries for lockfile verification; version-pinned
		// entries written by loose-mode resolution do NOT bypass the verify step.
		expect(yaml_source).toMatch(/^\s*-\s*['"]?@joshuafolkken\/game-kit['"]?\s*$/m)
		// Guard against accidental @version-pinned form sneaking in instead.
		expect(yaml_source).not.toMatch(/^\s*-\s*['"]?@joshuafolkken\/game-kit@\d/m)
	})
})
