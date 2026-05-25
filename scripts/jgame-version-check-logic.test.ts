import { describe, expect, it } from 'vitest'
import { jgame_version_check_logic } from './jgame-version-check-logic.ts'

describe('jgame_version_check_logic.format_version_status', () => {
	it('returns up-to-date marker when current equals latest', () => {
		expect(jgame_version_check_logic.format_version_status('0.55.0', '0.55.0')).toBe('✓ Up to date')
	})

	it('returns update marker with arrow when current differs from latest', () => {
		expect(jgame_version_check_logic.format_version_status('0.55.0', '0.56.0')).toBe(
			'⚠ Update available: 0.55.0 → 0.56.0',
		)
	})
})

describe('jgame_version_check_logic.format_update_command', () => {
	it('formats pnpm add command targeting @joshuafolkken/game-kit', () => {
		expect(jgame_version_check_logic.format_update_command('1.2.3')).toBe(
			'pnpm add -D @joshuafolkken/game-kit@1.2.3',
		)
	})
})

describe('jgame_version_check_logic.format_version_output', () => {
	it('omits update hint when current matches latest', () => {
		const output = jgame_version_check_logic.format_version_output('0.55.0', '0.55.0')
		expect(output).toBe(['Current: 0.55.0', 'Latest:  0.55.0', '✓ Up to date'].join('\n'))
	})

	it('includes update command when current is behind latest', () => {
		const output = jgame_version_check_logic.format_version_output('0.55.0', '0.56.0')
		expect(output).toBe(
			[
				'Current: 0.55.0',
				'Latest:  0.56.0',
				'⚠ Update available: 0.55.0 → 0.56.0',
				'',
				'Run: pnpm add -D @joshuafolkken/game-kit@0.56.0',
			].join('\n'),
		)
	})

	it('exposes the canonical package name', () => {
		expect(jgame_version_check_logic.PACKAGE_NAME).toBe('@joshuafolkken/game-kit')
	})
})
