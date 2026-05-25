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

describe('jgame_version_upgrade_logic.is_consumer_project_context', () => {
	it('returns true when game-kit is in dependencies', () => {
		const raw = JSON.stringify({ dependencies: { '@joshuafolkken/game-kit': '^0.1.0' } })
		expect(jgame_version_upgrade_logic.is_consumer_project_context(raw)).toBe(true)
	})

	it('returns true when game-kit is in devDependencies', () => {
		const raw = JSON.stringify({ devDependencies: { '@joshuafolkken/game-kit': '^0.1.0' } })
		expect(jgame_version_upgrade_logic.is_consumer_project_context(raw)).toBe(true)
	})

	it('returns true when game-kit is in peerDependencies', () => {
		const raw = JSON.stringify({ peerDependencies: { '@joshuafolkken/game-kit': '^0.1.0' } })
		expect(jgame_version_upgrade_logic.is_consumer_project_context(raw)).toBe(true)
	})

	it('returns false when game-kit is not in any dependency field', () => {
		const raw = JSON.stringify({ dependencies: { 'other-pkg': '^1.0.0' } })
		expect(jgame_version_upgrade_logic.is_consumer_project_context(raw)).toBe(false)
	})

	it('returns false when raw is undefined (file missing)', () => {
		expect(jgame_version_upgrade_logic.is_consumer_project_context(undefined)).toBe(false)
	})

	it('returns false when raw is malformed JSON', () => {
		expect(jgame_version_upgrade_logic.is_consumer_project_context('not valid {{{')).toBe(false)
	})

	it('returns false when raw parses to a non-object', () => {
		expect(jgame_version_upgrade_logic.is_consumer_project_context('"plain-string"')).toBe(false)
		expect(jgame_version_upgrade_logic.is_consumer_project_context('42')).toBe(false)
		expect(jgame_version_upgrade_logic.is_consumer_project_context('null')).toBe(false)
	})
})

describe('jgame_version_upgrade_logic.build_global_upgrade_args', () => {
	it('returns pnpm add -g args with the safe-chain bypass flag for the requested version', () => {
		expect(jgame_version_upgrade_logic.build_global_upgrade_args('0.64.0')).toEqual([
			'add',
			'-g',
			'@joshuafolkken/game-kit@0.64.0',
			'--safe-chain-skip-minimum-package-age',
		])
	})
})

describe('jgame_version_upgrade_logic.format_global_upgrade_command', () => {
	it('joins command and global args for display', () => {
		expect(jgame_version_upgrade_logic.format_global_upgrade_command('0.64.0')).toBe(
			'pnpm add -g @joshuafolkken/game-kit@0.64.0 --safe-chain-skip-minimum-package-age',
		)
	})
})
