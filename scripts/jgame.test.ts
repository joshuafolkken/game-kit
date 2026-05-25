import { beforeEach, describe, expect, it, vi } from 'vitest'
import { route_command } from './jgame.ts'

vi.mock('./jgame-init.ts', () => ({
	jgame_init: {
		run: vi.fn(),
		generate_package_json: vi.fn(),
		derive_names: vi.fn(),
		generate_game_config: vi.fn(),
	},
}))
vi.mock('./jgame-sync.ts', () => ({ jgame_sync: { run: vi.fn() } }))
vi.mock('./jgame-install-bin.ts', () => ({ jgame_install_bin: { run: vi.fn() } }))
vi.mock('./jgame-version-check.ts', () => ({
	jgame_version_check: { run: vi.fn(), parse_version: vi.fn() },
}))

describe('route_command', () => {
	beforeEach(() => {
		vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called')
		})
		vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	it('routes init to jgame_init.run without name', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		route_command('init')
		expect(jgame_init.run).toHaveBeenCalledWith(undefined)
	})

	it('routes init to jgame_init.run with game name', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		route_command('init', 'tic-tac-toe')
		expect(jgame_init.run).toHaveBeenCalledWith('tic-tac-toe')
	})

	it('routes sync to jgame_sync.run', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		route_command('sync')
		expect(jgame_sync.run).toHaveBeenCalledOnce()
	})

	it('routes install to jgame_install_bin.run without force', async () => {
		const { jgame_install_bin } = await import('./jgame-install-bin.ts')
		route_command('install')
		expect(jgame_install_bin.run).toHaveBeenCalledWith({ force: false })
	})

	it('routes install --force to jgame_install_bin.run with force=true', async () => {
		const { jgame_install_bin } = await import('./jgame-install-bin.ts')
		route_command('install', '--force')
		expect(jgame_install_bin.run).toHaveBeenCalledWith({ force: true })
	})

	it('routes version to jgame_version_check.run', async () => {
		const { jgame_version_check } = await import('./jgame-version-check.ts')
		route_command('version')
		expect(jgame_version_check.run).toHaveBeenCalledOnce()
	})

	it('exits with code 1 for unknown command and prints jgame usage', () => {
		expect(() => route_command('unknown')).toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('jgame'))
	})

	it('exits with code 1 when no command given', () => {
		expect(() => route_command(undefined)).toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
	})
})
