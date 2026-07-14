import { mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { josh_game } from './josh-game.ts'

vi.mock('./init/josh-game-init.ts', () => ({
	josh_game_init: {
		run: vi.fn(),
		generate_package_json: vi.fn(),
		derive_names: vi.fn(),
		generate_game_config: vi.fn(),
	},
}))
vi.mock('./init/josh-game-sync.ts', () => ({ josh_game_sync: { run: vi.fn() } }))
vi.mock('./version/josh-game-version.ts', () => ({
	josh_game_version: {
		run_check: vi.fn(),
		run_upgrade: vi.fn().mockReturnValue(0),
		build_config: vi.fn(),
		PACKAGE_NAME: '@joshuafolkken/game-kit',
		APP_KIT_PACKAGE_NAME: '@joshuafolkken/app-kit',
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

	it('routes init to josh_game_init.run without name', async () => {
		const { josh_game_init } = await import('./init/josh-game-init.ts')

		await josh_game.route_command('init')
		expect(josh_game_init.run).toHaveBeenCalledWith(undefined)
	})

	it('routes init to josh_game_init.run with game name', async () => {
		const { josh_game_init } = await import('./init/josh-game-init.ts')

		await josh_game.route_command('init', 'tic-tac-toe')
		expect(josh_game_init.run).toHaveBeenCalledWith('tic-tac-toe')
	})

	it('routes sync to josh_game_sync.run', async () => {
		const { josh_game_sync } = await import('./init/josh-game-sync.ts')

		await josh_game.route_command('sync')
		expect(josh_game_sync.run).toHaveBeenCalledOnce()
	})

	it('treats install as unknown command', async () => {
		await expect(josh_game.route_command('install')).rejects.toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown command: install'))
	})

	it('routes version to josh_game_version.run_check', async () => {
		const { josh_game_version } = await import('./version/josh-game-version.ts')

		await josh_game.route_command('version')
		expect(josh_game_version.run_check).toHaveBeenCalledOnce()
	})

	it('routes v as alias for version', async () => {
		const { josh_game_version } = await import('./version/josh-game-version.ts')

		await josh_game.route_command('v')
		expect(josh_game_version.run_check).toHaveBeenCalledOnce()
	})

	it('routes version:upgrade to josh_game_version.run_upgrade', async () => {
		const { josh_game_version } = await import('./version/josh-game-version.ts')

		await josh_game.route_command('version:upgrade')
		expect(josh_game_version.run_upgrade).toHaveBeenCalledOnce()
	})

	it('routes vu as alias for version:upgrade', async () => {
		const { josh_game_version } = await import('./version/josh-game-version.ts')

		await josh_game.route_command('vu')
		expect(josh_game_version.run_upgrade).toHaveBeenCalledOnce()
	})

	it('exits with the upgrade code when version:upgrade returns non-zero', async () => {
		const { josh_game_version } = await import('./version/josh-game-version.ts')

		vi.mocked(josh_game_version.run_upgrade).mockReturnValueOnce(2)

		await expect(josh_game.route_command('vu')).rejects.toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(2)
	})

	it('exits with code 1 for unknown command and prints josh-game usage', async () => {
		await expect(josh_game.route_command('unknown')).rejects.toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('josh-game'))
	})

	it('exits with code 1 when no command given', async () => {
		await expect(josh_game.route_command(undefined)).rejects.toThrow('process.exit called')
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
		const temporary_directory_prefix = path.join(os.tmpdir(), 'josh-game-test-')

		temporary_directory = realpathSync(mkdtempSync(temporary_directory_prefix))
		real_file = path.join(temporary_directory, 'josh-game.js')
		symlink_path = path.join(temporary_directory, 'josh-game-link')
		writeFileSync(real_file, '')
		symlinkSync(real_file, symlink_path)
	})

	afterEach(() => {
		rmSync(temporary_directory, { recursive: true, force: true })
	})

	it('returns true when argv_path equals module_path directly', () => {
		expect(josh_game.is_invoked_directly(real_file, real_file)).toBe(true)
	})

	it('returns true when argv_path is a symlink resolving to module_path', () => {
		expect(josh_game.is_invoked_directly(symlink_path, real_file)).toBe(true)
	})

	it('returns false when paths are unrelated', () => {
		const other = path.join(temporary_directory, 'other.js')

		writeFileSync(other, '')
		expect(josh_game.is_invoked_directly(real_file, other)).toBe(false)
	})

	it('returns false when argv_path does not exist (realpath throws)', () => {
		expect(
			josh_game.is_invoked_directly(path.join(temporary_directory, 'nonexistent'), real_file),
		).toBe(false)
	})
})
