import { describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({ writeFileSync: vi.fn() }))

describe('jgame_eslint_config.generate_eslint_config', () => {
	it('scopes the relaxed rules to src/lib/game/** (#260)', async () => {
		const { jgame_eslint_config } = await import('./jgame-eslint-config.ts')
		const result = jgame_eslint_config.generate_eslint_config()

		expect(result).toContain("files: ['src/lib/game/**']")
		expect(result).toContain('.concat(game_overrides)')
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
