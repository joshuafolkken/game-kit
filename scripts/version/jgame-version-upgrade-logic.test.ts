import { describe, expect, it } from 'vitest'
import { jgame_version_upgrade_logic } from './jgame-version-upgrade-logic.ts'

describe('jgame_version_upgrade_logic.parse_overrides_from_workspace', () => {
	it('returns empty record when no overrides block is present', () => {
		expect(
			jgame_version_upgrade_logic.parse_overrides_from_workspace('allowBuilds:\n  esbuild: true\n'),
		).toEqual({})
	})

	it('parses the overrides block into a key/value map', () => {
		const yaml = 'overrides:\n  cookie: ^0.7.0\n  ws: ">=8.20.1"\n'

		expect(jgame_version_upgrade_logic.parse_overrides_from_workspace(yaml)).toEqual({
			cookie: '^0.7.0',
			ws: '>=8.20.1',
		})
	})

	it('strips quotes from scoped keys and quoted version values', () => {
		const yaml = "overrides:\n  '@joshuafolkken/game-kit': '<1.0.0'\n"

		expect(jgame_version_upgrade_logic.parse_overrides_from_workspace(yaml)).toEqual({
			'@joshuafolkken/game-kit': '<1.0.0',
		})
	})

	it('matches an overrides header that carries a trailing inline comment', () => {
		const yaml = 'overrides: # pinned deps\n  cookie: ^0.7.0\n'

		expect(jgame_version_upgrade_logic.parse_overrides_from_workspace(yaml)).toEqual({
			cookie: '^0.7.0',
		})
	})

	it('drops a key with no value so a malformed entry cannot become a false cap', () => {
		const yaml = "overrides:\n  '@joshuafolkken/game-kit':\n  cookie: ^0.7.0\n"

		expect(jgame_version_upgrade_logic.parse_overrides_from_workspace(yaml)).toEqual({
			cookie: '^0.7.0',
		})
	})

	it('ignores trailing comments and stops at the next top-level block', () => {
		const yaml =
			'overrides:\n  cookie: ^0.7.0 # patched\n  # a comment line\n  ws: ">=8.20.1"\nallowBuilds:\n  esbuild: true\n'

		expect(jgame_version_upgrade_logic.parse_overrides_from_workspace(yaml)).toEqual({
			cookie: '^0.7.0',
			ws: '>=8.20.1',
		})
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
		expect(message).toContain('pnpm-workspace.yaml')
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

describe('jgame_version_upgrade_logic.build_global_upgrade_args', () => {
	it('returns pnpm add -g args for the requested version', () => {
		expect(jgame_version_upgrade_logic.build_global_upgrade_args('0.64.0')).toEqual([
			'add',
			'-g',
			'@joshuafolkken/game-kit@0.64.0',
		])
	})
})

describe('jgame_version_upgrade_logic.is_enoent_error', () => {
	it('returns true for an error-like object with code === "ENOENT"', () => {
		expect(jgame_version_upgrade_logic.is_enoent_error({ code: 'ENOENT' })).toBe(true)
	})

	it('returns true for an Error instance augmented with code === "ENOENT"', () => {
		const error = Object.assign(new Error('not found'), { code: 'ENOENT' })

		expect(jgame_version_upgrade_logic.is_enoent_error(error)).toBe(true)
	})

	it('returns false for other error codes (e.g. EACCES)', () => {
		expect(jgame_version_upgrade_logic.is_enoent_error({ code: 'EACCES' })).toBe(false)
	})

	it('returns false for an Error without a code property', () => {
		expect(jgame_version_upgrade_logic.is_enoent_error(new Error('boom'))).toBe(false)
	})

	it('returns false for primitives and null', () => {
		expect(jgame_version_upgrade_logic.is_enoent_error(null)).toBe(false)
		expect(jgame_version_upgrade_logic.is_enoent_error(undefined)).toBe(false)
		expect(jgame_version_upgrade_logic.is_enoent_error('ENOENT')).toBe(false)
		expect(jgame_version_upgrade_logic.is_enoent_error(42)).toBe(false)
	})
})
