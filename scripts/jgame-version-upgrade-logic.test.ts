import { describe, expect, it } from 'vitest'
import { jgame_version_upgrade_logic } from './jgame-version-upgrade-logic.ts'

describe('jgame_version_upgrade_logic.parse_overrides_from_package', () => {
	it('returns empty record when pnpm field is absent', () => {
		expect(jgame_version_upgrade_logic.parse_overrides_from_package('{"name":"x"}')).toEqual({})
	})

	it('returns empty record when pnpm.overrides is absent', () => {
		expect(jgame_version_upgrade_logic.parse_overrides_from_package('{"pnpm":{}}')).toEqual({})
	})

	it('returns overrides map when present', () => {
		expect(
			jgame_version_upgrade_logic.parse_overrides_from_package(
				'{"pnpm":{"overrides":{"foo":">=1.0.0","bar":"2.0.0"}}}',
			),
		).toEqual({ foo: '>=1.0.0', bar: '2.0.0' })
	})

	it('throws when overrides values are not all strings', () => {
		expect(() =>
			jgame_version_upgrade_logic.parse_overrides_from_package(
				'{"pnpm":{"overrides":{"foo":123}}}',
			),
		).toThrow(/unexpected/u)
	})
})

describe('jgame_version_upgrade_logic.extract_game_kit_override', () => {
	it('returns the override value when game-kit is pinned', () => {
		expect(
			jgame_version_upgrade_logic.extract_game_kit_override({
				'@joshuafolkken/game-kit': '~0.55.0',
				other: '1.0.0',
			}),
		).toBe('~0.55.0')
	})

	it('returns undefined when game-kit is not in overrides', () => {
		expect(
			jgame_version_upgrade_logic.extract_game_kit_override({ other: '1.0.0' }),
		).toBeUndefined()
	})

	it('returns undefined for empty overrides', () => {
		expect(jgame_version_upgrade_logic.extract_game_kit_override({})).toBeUndefined()
	})
})

describe('jgame_version_upgrade_logic.format_capped_message', () => {
	it('includes the override value and the canonical package name', () => {
		const message = jgame_version_upgrade_logic.format_capped_message('<1.0.0')
		expect(message).toContain('@joshuafolkken/game-kit')
		expect(message).toContain('<1.0.0')
		expect(message).toContain('pnpm.overrides')
	})
})

describe('jgame_version_upgrade_logic.build_upgrade_args', () => {
	it('produces pnpm add -D args targeting the requested version', () => {
		expect(jgame_version_upgrade_logic.build_upgrade_args('0.99.0')).toEqual([
			'add',
			'-D',
			'@joshuafolkken/game-kit@0.99.0',
		])
	})
})

describe('jgame_version_upgrade_logic.format_upgrade_command', () => {
	it('joins command and args for display', () => {
		expect(jgame_version_upgrade_logic.format_upgrade_command('0.99.0')).toBe(
			'pnpm add -D @joshuafolkken/game-kit@0.99.0',
		)
	})
})
