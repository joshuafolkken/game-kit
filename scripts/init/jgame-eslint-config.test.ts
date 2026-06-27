import { describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- the shared profile lives at the repo root so eslint.config.js (a .js) can import it too (#261)
import { eslint_game_overrides } from '../../eslint-game-overrides.js'

vi.mock('node:fs', () => ({ writeFileSync: vi.fn() }))

describe('jgame_eslint_config.generate_eslint_config', () => {
	it('scopes the relaxed rules to src/lib/game/** (#260)', async () => {
		const { jgame_eslint_config } = await import('./jgame-eslint-config.ts')
		const result = jgame_eslint_config.generate_eslint_config()

		expect(result).toContain("files: ['src/lib/game/**']")
		expect(result).toContain('.concat(game_overrides)')
	})

	it('imports create_sveltekit_config from app-kit, not kit (#355)', async () => {
		const { jgame_eslint_config } = await import('./jgame-eslint-config.ts')
		const result = jgame_eslint_config.generate_eslint_config()

		expect(result).toContain("from '@joshuafolkken/app-kit/eslint/sveltekit'")
		expect(result).not.toContain("from '@joshuafolkken/kit/eslint/sveltekit'")
	})

	it('relaxes the strict defaults the verbatim game templates rely on (#260)', async () => {
		const { jgame_eslint_config } = await import('./jgame-eslint-config.ts')
		const result = jgame_eslint_config.generate_eslint_config()

		expect(result).toContain("'unicorn/no-null': 'off'")
		expect(result).toContain("'import/exports-last': 'off'")
		expect(result).toContain("'max-statements': ['error', GAME_FN_STATEMENTS]")
		expect(result).toContain('max-lines-per-function')
		expect(result).toContain("complexity: ['error', GAME_COMPLEXITY]")
		expect(result).toContain("'sonarjs/cognitive-complexity': ['error', GAME_COMPLEXITY]")
	})
})

describe('jgame_eslint_config single-sources the game-dir profile (#261)', () => {
	const { GAME_DIR_CAPS, game_override_rules } = eslint_game_overrides

	it('emits the shared GAME_DIR_CAPS values, not hardcoded duplicates', async () => {
		const { jgame_eslint_config } = await import('./jgame-eslint-config.ts')
		const result = jgame_eslint_config.generate_eslint_config()

		expect(result).toContain(`const GAME_COMPLEXITY = ${String(GAME_DIR_CAPS.complexity)}`)
		expect(result).toContain(`const GAME_FN_LINES = ${String(GAME_DIR_CAPS.fn_lines)}`)
		expect(result).toContain(`const GAME_FN_STATEMENTS = ${String(GAME_DIR_CAPS.fn_statements)}`)
		expect(result).toContain(`const GAME_FILE_LINES = ${String(GAME_DIR_CAPS.file_lines)}`)
	})

	it('covers every rule name in the shared game_override_rules profile (no drift)', async () => {
		const { jgame_eslint_config } = await import('./jgame-eslint-config.ts')
		const result = jgame_eslint_config.generate_eslint_config()

		for (const rule_name of Object.keys(game_override_rules())) {
			expect(result).toContain(rule_name)
		}
	})
})

describe('jgame_eslint_config.write_eslint_config', () => {
	it('writes eslint.config.js into the given project directory (#260)', async () => {
		const { writeFileSync } = await import('node:fs')
		const { jgame_eslint_config } = await import('./jgame-eslint-config.ts')

		jgame_eslint_config.write_eslint_config('/project')
		expect(writeFileSync).toHaveBeenCalledWith(
			'/project/eslint.config.js',
			expect.stringContaining("files: ['src/lib/game/**']"),
		)
	})
})
