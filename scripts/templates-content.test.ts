import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES_GAME_DIR = path.join(HERE, '..', 'templates', 'src', 'lib', 'game')

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
	})
})
