import { describe, expect, it } from 'vitest'
import { jgame_version_check_logic } from './jgame-version-check-logic.ts'

const LATEST = '0.56.0'
const OLD = '0.55.0'

describe('jgame_version_check_logic.is_target_stale', () => {
	it('returns false when the target is not installed (undefined)', () => {
		expect(jgame_version_check_logic.is_target_stale(undefined, LATEST)).toBe(false)
	})

	it('returns false when the installed version equals latest', () => {
		expect(jgame_version_check_logic.is_target_stale(LATEST, LATEST)).toBe(false)
	})

	it('returns true when the installed version is behind latest', () => {
		expect(jgame_version_check_logic.is_target_stale(OLD, LATEST)).toBe(true)
	})
})

describe('jgame_version_check_logic.format_update_command', () => {
	it('uses -g for a global target', () => {
		expect(jgame_version_check_logic.format_update_command(LATEST, false)).toBe(
			'pnpm add -g @joshuafolkken/game-kit@0.56.0',
		)
	})

	it('uses -D for a project (local) target', () => {
		expect(jgame_version_check_logic.format_update_command(LATEST, true)).toBe(
			'pnpm add -D @joshuafolkken/game-kit@0.56.0',
		)
	})
})

describe('jgame_version_check_logic.format_target_status', () => {
	it('reports not installed when version is undefined', () => {
		expect(jgame_version_check_logic.format_target_status(undefined, LATEST)).toBe('not installed')
	})

	it('marks an up-to-date version with a check', () => {
		expect(jgame_version_check_logic.format_target_status(LATEST, LATEST)).toContain('✓')
	})

	it('marks a stale version with an arrow to latest', () => {
		expect(jgame_version_check_logic.format_target_status(OLD, LATEST)).toContain('⚠ → 0.56.0')
	})
})

describe('jgame_version_check_logic.build_dual_upgrade_commands', () => {
	it('returns no commands when both targets are current', () => {
		const commands = jgame_version_check_logic.build_dual_upgrade_commands(LATEST, LATEST, LATEST)

		expect(commands).toEqual([])
	})

	it('emits a -g command when only the global target is stale', () => {
		expect(jgame_version_check_logic.build_dual_upgrade_commands(OLD, LATEST, LATEST)).toEqual([
			'pnpm add -g @joshuafolkken/game-kit@0.56.0',
		])
	})

	it('emits a -D command when only the project target is stale', () => {
		expect(jgame_version_check_logic.build_dual_upgrade_commands(LATEST, OLD, LATEST)).toEqual([
			'pnpm add -D @joshuafolkken/game-kit@0.56.0',
		])
	})

	it('emits global then project commands when both are stale', () => {
		expect(jgame_version_check_logic.build_dual_upgrade_commands(OLD, OLD, LATEST)).toEqual([
			'pnpm add -g @joshuafolkken/game-kit@0.56.0',
			'pnpm add -D @joshuafolkken/game-kit@0.56.0',
		])
	})

	it('ignores a not-installed target', () => {
		expect(jgame_version_check_logic.build_dual_upgrade_commands(undefined, OLD, LATEST)).toEqual([
			'pnpm add -D @joshuafolkken/game-kit@0.56.0',
		])
	})
})

describe('jgame_version_check_logic.format_running_line', () => {
	it('returns an empty array when the running binary is unknown', () => {
		expect(jgame_version_check_logic.format_running_line(undefined)).toEqual([])
	})

	it('renders the running version and package path', () => {
		const [line] = jgame_version_check_logic.format_running_line({
			version: LATEST,
			path: '/proj/node_modules/@joshuafolkken/game-kit',
		})

		expect(line).toContain('Running:')
		expect(line).toContain(LATEST)
		expect(line).toContain('(/proj/node_modules/@joshuafolkken/game-kit)')
	})
})

describe('jgame_version_check_logic.format_dual_version_output', () => {
	it('lists global, project, latest and omits hints when both are current', () => {
		const output = jgame_version_check_logic.format_dual_version_output(LATEST, LATEST, LATEST)

		expect(output).toContain('@joshuafolkken/game-kit')
		expect(output).toContain('Global:')
		expect(output).toContain('Project:')
		expect(output).toContain('Latest:')
		expect(output).not.toMatch(/Run:/u)
	})

	it('appends a -g hint when the global target is stale', () => {
		const output = jgame_version_check_logic.format_dual_version_output(OLD, LATEST, LATEST)

		expect(output).toContain('Run: pnpm add -g @joshuafolkken/game-kit@0.56.0')
	})

	it('appends a -D hint when the project target is stale', () => {
		const output = jgame_version_check_logic.format_dual_version_output(LATEST, OLD, LATEST)

		expect(output).toContain('Run: pnpm add -D @joshuafolkken/game-kit@0.56.0')
	})

	it('includes the running line when a running binary is supplied', () => {
		const output = jgame_version_check_logic.format_dual_version_output(LATEST, LATEST, LATEST, {
			version: LATEST,
			path: '/global/store',
		})

		expect(output).toContain('Running:')
		expect(output).toContain('(/global/store)')
	})

	it('exposes the canonical package name', () => {
		expect(jgame_version_check_logic.PACKAGE_NAME).toBe('@joshuafolkken/game-kit')
	})
})

describe('jgame_version_check_logic.format_offline_output', () => {
	it('shows installed versions without staleness markers or hints', () => {
		const output = jgame_version_check_logic.format_offline_output(LATEST, OLD)

		expect(output).toContain('@joshuafolkken/game-kit')
		expect(output).toContain(`Global:  ${LATEST}`)
		expect(output).toContain(`Project: ${OLD}`)
		expect(output).not.toMatch(/Run:/u)
		expect(output).not.toMatch(/→/u)
	})

	it('reports not installed for an undefined target', () => {
		const output = jgame_version_check_logic.format_offline_output(undefined, undefined)

		expect(output).toContain('Global:  not installed')
		expect(output).toContain('Project: not installed')
	})

	it('exposes the fetch-failed warning string', () => {
		expect(jgame_version_check_logic.FETCH_FAILED_WARNING).toMatch(/Failed to fetch latest/u)
	})
})
