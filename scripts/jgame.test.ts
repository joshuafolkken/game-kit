import { mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jgame } from './jgame.ts'

vi.mock('./init/jgame-init.ts', () => ({
	jgame_init: {
		run: vi.fn(),
		generate_package_json: vi.fn(),
		derive_names: vi.fn(),
		generate_game_config: vi.fn(),
	},
}))
vi.mock('./init/jgame-sync.ts', () => ({ jgame_sync: { run: vi.fn() } }))
vi.mock('./version/jgame-version-check.ts', () => ({
	jgame_version_check: { run: vi.fn(), parse_version: vi.fn() },
}))
vi.mock('./version/jgame-version-upgrade.ts', () => ({
	jgame_version_upgrade: {
		run: vi.fn(),
		read_project_overrides: vi.fn(),
		exec_pnpm_add: vi.fn(),
	},
}))

describe('route_command', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called')
		})
		vi.spyOn(console, 'error').mockImplementation(() => {
			/* no-op */
		})
	})

	it('routes init to jgame_init.run without name', async () => {
		const { jgame_init } = await import('./init/jgame-init.ts')

		jgame.route_command('init')
		expect(jgame_init.run).toHaveBeenCalledWith(undefined)
	})

	it('routes init to jgame_init.run with game name', async () => {
		const { jgame_init } = await import('./init/jgame-init.ts')

		jgame.route_command('init', 'tic-tac-toe')
		expect(jgame_init.run).toHaveBeenCalledWith('tic-tac-toe')
	})

	it('routes sync to jgame_sync.run', async () => {
		const { jgame_sync } = await import('./init/jgame-sync.ts')

		jgame.route_command('sync')
		expect(jgame_sync.run).toHaveBeenCalledOnce()
	})

	it('treats install as unknown command', () => {
		expect(() => {
			jgame.route_command('install')
		}).toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown command: install'))
	})

	it('routes version to jgame_version_check.run', async () => {
		const { jgame_version_check } = await import('./version/jgame-version-check.ts')

		jgame.route_command('version')
		expect(jgame_version_check.run).toHaveBeenCalledOnce()
	})

	it('routes v as alias for version', async () => {
		const { jgame_version_check } = await import('./version/jgame-version-check.ts')

		jgame.route_command('v')
		expect(jgame_version_check.run).toHaveBeenCalledOnce()
	})

	it('routes version:upgrade to jgame_version_upgrade.run', async () => {
		const { jgame_version_upgrade } = await import('./version/jgame-version-upgrade.ts')

		jgame.route_command('version:upgrade')
		expect(jgame_version_upgrade.run).toHaveBeenCalledOnce()
	})

	it('routes vu as alias for version:upgrade', async () => {
		const { jgame_version_upgrade } = await import('./version/jgame-version-upgrade.ts')

		jgame.route_command('vu')
		expect(jgame_version_upgrade.run).toHaveBeenCalledOnce()
	})

	it('exits with code 1 for unknown command and prints jgame usage', () => {
		expect(() => {
			jgame.route_command('unknown')
		}).toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('jgame'))
	})

	it('exits with code 1 when no command given', () => {
		expect(() => {
			jgame.route_command(undefined)
		}).toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
	})
})

describe('is_invoked_directly', () => {
	/* eslint-disable init-declarations -- assigned in beforeEach */
	let temporary_directory: string
	let real_file: string
	let symlink_path: string
	/* eslint-enable init-declarations */

	beforeEach(() => {
		temporary_directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'jgame-test-')))
		real_file = path.join(temporary_directory, 'jgame.js')
		symlink_path = path.join(temporary_directory, 'jgame-link')
		writeFileSync(real_file, '')
		symlinkSync(real_file, symlink_path)
	})

	afterEach(() => {
		rmSync(temporary_directory, { recursive: true, force: true })
	})

	it('returns true when argv_path equals module_path directly', () => {
		expect(jgame.is_invoked_directly(real_file, real_file)).toBe(true)
	})

	it('returns true when argv_path is a symlink resolving to module_path', () => {
		expect(jgame.is_invoked_directly(symlink_path, real_file)).toBe(true)
	})

	it('returns false when paths are unrelated', () => {
		const other = path.join(temporary_directory, 'other.js')

		writeFileSync(other, '')
		expect(jgame.is_invoked_directly(real_file, other)).toBe(false)
	})

	it('returns false when argv_path does not exist (realpath throws)', () => {
		expect(
			jgame.is_invoked_directly(path.join(temporary_directory, 'nonexistent'), real_file),
		).toBe(false)
	})
})
