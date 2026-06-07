import { beforeEach, describe, expect, it, vi } from 'vitest'
import { jgame_version_upgrade_logic } from './jgame-version-upgrade-logic.ts'

vi.mock('node:fs', () => ({ readFileSync: vi.fn() }))
vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }))
vi.mock('./jgame-version-api.ts', () => ({
	jgame_version_api: { fetch_latest_version: vi.fn() },
}))

const LATEST_VERSION = '0.64.0'

function mock_spawn_result(status: number): {
	status: number
	signal: null
	output: Array<null>
	pid: number
	stdout: Buffer
	stderr: Buffer
} {
	return {
		status,
		signal: null,
		output: [],
		pid: 1,
		stdout: Buffer.from(''),
		stderr: Buffer.from(''),
	}
}

describe('jgame_version_upgrade', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
		vi.spyOn(console, 'warn').mockImplementation(() => {
			/* no-op */
		})
		vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called')
		})
	})

	it('exposes run / read_project_overrides / exec_pnpm_add / exec_pnpm_global_add', async () => {
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		expect(typeof jgame_version_upgrade.run).toBe('function')
		expect(typeof jgame_version_upgrade.read_project_overrides).toBe('function')
		expect(typeof jgame_version_upgrade.exec_pnpm_add).toBe('function')
		expect(typeof jgame_version_upgrade.exec_pnpm_global_add).toBe('function')
	})

	it('uses pnpm add -D when the running binary is a local install', async () => {
		const { readFileSync } = await import('node:fs')
		const { spawnSync } = await import('node:child_process')
		const { jgame_version_api } = await import('./jgame-version-api.ts')

		vi.spyOn(jgame_version_upgrade_logic, 'is_local_install').mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ name: 'consumer' }))
		vi.mocked(jgame_version_api.fetch_latest_version).mockReturnValue(LATEST_VERSION)
		vi.mocked(spawnSync).mockReturnValue(mock_spawn_result(0))
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		jgame_version_upgrade.run()

		expect(spawnSync).toHaveBeenCalledWith(
			'pnpm',
			['add', '-D', `@joshuafolkken/game-kit@${LATEST_VERSION}`],
			expect.anything(),
		)
	})

	it('respects the pnpm.overrides cap on the local path (no spawn)', async () => {
		const { readFileSync } = await import('node:fs')
		const { spawnSync } = await import('node:child_process')

		vi.spyOn(jgame_version_upgrade_logic, 'is_local_install').mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({ pnpm: { overrides: { '@joshuafolkken/game-kit': '<1.0.0' } } }),
		)
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		jgame_version_upgrade.run()

		expect(spawnSync).not.toHaveBeenCalled()
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Skipping upgrade'))
	})

	it('proceeds with pnpm add -D on the local path when package.json is missing', async () => {
		const { readFileSync } = await import('node:fs')
		const { spawnSync } = await import('node:child_process')
		const { jgame_version_api } = await import('./jgame-version-api.ts')

		vi.spyOn(jgame_version_upgrade_logic, 'is_local_install').mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation(() => {
			throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
		})
		vi.mocked(jgame_version_api.fetch_latest_version).mockReturnValue(LATEST_VERSION)
		vi.mocked(spawnSync).mockReturnValue(mock_spawn_result(0))
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		jgame_version_upgrade.run()

		expect(spawnSync).toHaveBeenCalledWith(
			'pnpm',
			['add', '-D', `@joshuafolkken/game-kit@${LATEST_VERSION}`],
			expect.anything(),
		)
	})

	it('uses pnpm add -g when the running binary is a global install', async () => {
		const { spawnSync } = await import('node:child_process')
		const { jgame_version_api } = await import('./jgame-version-api.ts')

		vi.spyOn(jgame_version_upgrade_logic, 'is_local_install').mockReturnValue(false)
		vi.mocked(jgame_version_api.fetch_latest_version).mockReturnValue(LATEST_VERSION)
		vi.mocked(spawnSync).mockReturnValue(mock_spawn_result(0))
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		jgame_version_upgrade.run()

		expect(spawnSync).toHaveBeenCalledWith(
			'pnpm',
			['add', '-g', `@joshuafolkken/game-kit@${LATEST_VERSION}`],
			expect.anything(),
		)
	})

	it('does not read package.json on the global path', async () => {
		const { readFileSync } = await import('node:fs')
		const { spawnSync } = await import('node:child_process')
		const { jgame_version_api } = await import('./jgame-version-api.ts')

		vi.spyOn(jgame_version_upgrade_logic, 'is_local_install').mockReturnValue(false)
		vi.mocked(jgame_version_api.fetch_latest_version).mockReturnValue(LATEST_VERSION)
		vi.mocked(spawnSync).mockReturnValue(mock_spawn_result(0))
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		jgame_version_upgrade.run()

		expect(readFileSync).not.toHaveBeenCalled()
	})

	it('rethrows non-ENOENT errors from readFileSync on the local path', async () => {
		const { readFileSync } = await import('node:fs')

		vi.spyOn(jgame_version_upgrade_logic, 'is_local_install').mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation(() => {
			throw Object.assign(new Error('permission denied'), { code: 'EACCES' })
		})
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		expect(() => {
			jgame_version_upgrade.run()
		}).toThrow(/permission denied/u)
	})

	it('warns and skips spawn when fetch_latest_version returns undefined', async () => {
		const { spawnSync } = await import('node:child_process')
		const { jgame_version_api } = await import('./jgame-version-api.ts')

		vi.spyOn(jgame_version_upgrade_logic, 'is_local_install').mockReturnValue(false)
		vi.mocked(jgame_version_api.fetch_latest_version).mockReturnValue(undefined)
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		jgame_version_upgrade.run()

		expect(spawnSync).not.toHaveBeenCalled()
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch latest'))
	})
})
