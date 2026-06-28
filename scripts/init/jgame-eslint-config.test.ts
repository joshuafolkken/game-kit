import { describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- the shared profile lives at the repo root (eslint/game.js) so eslint.config.js (a .js) can import it too (#261, #368)
import { eslint_game_overrides } from '../../eslint/game.js'

vi.mock('node:fs', () => ({ writeFileSync: vi.fn() }))

describe('jgame_eslint_config.generate_eslint_config', () => {
	it('delegates to game-kit create_game_config, scoping happens in the preset (#368)', async () => {
		const { jgame_eslint_config } = await import('./jgame-eslint-config.ts')
		const result = jgame_eslint_config.generate_eslint_config()

		expect(result).toContain(
			"import { create_game_config } from '@joshuafolkken/game-kit/eslint/game'",
		)
		expect(result).toContain('export default create_game_config({')
	})

	it('forwards the SvelteKit config options to create_game_config (#368)', async () => {
		const { jgame_eslint_config } = await import('./jgame-eslint-config.ts')
		const result = jgame_eslint_config.generate_eslint_config()

		expect(result).toContain("gitignore_path: new URL('./.gitignore', import.meta.url)")
		expect(result).toContain('tsconfig_root_dir: import.meta.dirname')
		expect(result).toContain('svelte_config: svelteConfig')
	})

	it('no longer carries the rule literals or cap constants inline (they live in the preset) (#368)', async () => {
		const { jgame_eslint_config } = await import('./jgame-eslint-config.ts')
		const result = jgame_eslint_config.generate_eslint_config()

		expect(result).not.toContain("'unicorn/no-null'")
		expect(result).not.toContain("'sonarjs/cognitive-complexity'")
		expect(result).not.toContain('GAME_COMPLEXITY')
		expect(result).not.toContain('create_sveltekit_config')
	})
})

describe('jgame_eslint_config single-sources the game-dir profile via the preset (#261, #368)', () => {
	const { game_override_rules } = eslint_game_overrides

	it('does not duplicate any shared rule name into the generated config', async () => {
		const { jgame_eslint_config } = await import('./jgame-eslint-config.ts')
		const result = jgame_eslint_config.generate_eslint_config()

		// The generated config delegates to the preset, so none of the rule names appear inline.
		for (const rule_name of Object.keys(game_override_rules())) {
			expect(result).not.toContain(rule_name)
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
			expect.stringContaining('create_game_config'),
		)
	})
})
