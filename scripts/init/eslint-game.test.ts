import { describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- the shared preset lives at the repo root (eslint/game.js) so eslint.config.js (a .js) can import it too (#261, #368)
import { create_game_config, eslint_game_overrides } from '../../eslint/game.js'

// app-kit's SvelteKit preset pulls in kit's full flat-config machinery; mock it so these unit
// tests exercise only game-kit's wrapper and the pure game-dir building blocks (#368). vi.hoisted
// keeps the stub available to the hoisted vi.mock factory without a TDZ error.
const { create_sveltekit_config, base_config } = vi.hoisted(() => {
	const base = [{ name: 'app-kit-base' }]

	return { base_config: base, create_sveltekit_config: vi.fn(() => base) }
})

vi.mock('@joshuafolkken/app-kit/eslint/sveltekit', () => ({ create_sveltekit_config }))

const { GAME_DIR_CAPS, game_override_rules } = eslint_game_overrides

const config_options = {
	gitignore_path: new URL('https://example.test/.gitignore'),
	tsconfig_root_dir: '/project',
}

describe('game_override_rules (the shared game-dir profile)', () => {
	it('relaxes the idiom rules and raises the caps from GAME_DIR_CAPS (#368)', () => {
		const rules = game_override_rules()

		expect(rules['unicorn/no-null']).toBe('off')
		expect(rules['import/exports-last']).toBe('off')
		expect(rules.complexity).toEqual(['error', GAME_DIR_CAPS.complexity])
		expect(rules['max-statements']).toEqual(['error', GAME_DIR_CAPS.fn_statements])
		expect(rules['sonarjs/cognitive-complexity']).toEqual(['error', GAME_DIR_CAPS.complexity])
	})
})

describe('create_game_config', () => {
	it('appends a src/lib/game/** block built from game_override_rules() after the app-kit base (#368)', () => {
		const config = create_game_config(config_options)

		expect(create_sveltekit_config).toHaveBeenCalledWith(config_options)
		expect(config).toEqual([
			...base_config,
			{ files: ['src/lib/game/**'], rules: game_override_rules() },
		])
	})
})
