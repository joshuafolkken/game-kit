import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({ readFileSync: vi.fn() }))
vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }))
vi.mock('./jgame-version-api.ts', () => ({
	jgame_version_api: { fetch_latest_version: vi.fn() },
}))
vi.mock('./jgame-version-targets.ts', () => ({
	jgame_version_targets: { read_global_version: vi.fn(), read_project_version: vi.fn() },
}))
vi.mock('./jgame-fix-gh-packages.ts', () => ({
	jgame_fix_gh_packages: { run: vi.fn().mockResolvedValue(undefined) },
}))

const LATEST = '0.64.0'
const OLD = '0.63.0'
const PKG = '@joshuafolkken/game-kit'

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

async function setup(options: {
	global_version: string | undefined
	project_version: string | undefined
	latest?: string | undefined
	workspace_yaml?: string
}): Promise<void> {
	const { readFileSync } = await import('node:fs')
	const { spawnSync } = await import('node:child_process')
	const { jgame_version_api } = await import('./jgame-version-api.ts')
	const { jgame_version_targets } = await import('./jgame-version-targets.ts')

	vi.mocked(jgame_version_targets.read_global_version).mockReturnValue(options.global_version)
	vi.mocked(jgame_version_targets.read_project_version).mockReturnValue(options.project_version)
	vi.mocked(jgame_version_api.fetch_latest_version).mockReturnValue(
		'latest' in options ? options.latest : LATEST,
	)
	vi.mocked(readFileSync).mockReturnValue(options.workspace_yaml ?? 'packages:\n')
	vi.mocked(spawnSync).mockReturnValue(mock_spawn_result(0))
}

function expect_pnpm_add(flag: string): [string, Array<string>, unknown] {
	return ['pnpm', ['add', flag, `${PKG}@${LATEST}`], expect.anything()]
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

	it('exposes run / read_project_overrides / exec_global_upgrade / exec_project_upgrade', async () => {
		await setup({ global_version: LATEST, project_version: LATEST })
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		expect(typeof jgame_version_upgrade.run).toBe('function')
		expect(typeof jgame_version_upgrade.read_project_overrides).toBe('function')
		expect(typeof jgame_version_upgrade.exec_global_upgrade).toBe('function')
		expect(typeof jgame_version_upgrade.exec_project_upgrade).toBe('function')
	})

	it('upgrades the stale project install with pnpm add -D and repairs the lockfile', async () => {
		const { spawnSync } = await import('node:child_process')
		const { jgame_fix_gh_packages } = await import('./jgame-fix-gh-packages.ts')

		await setup({ global_version: LATEST, project_version: OLD })
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		await jgame_version_upgrade.run()

		expect(spawnSync).toHaveBeenCalledWith(...expect_pnpm_add('-D'))
		expect(jgame_fix_gh_packages.run).toHaveBeenCalledTimes(1)
	})

	it('upgrades the stale global install with pnpm add -g (no lockfile repair)', async () => {
		const { spawnSync } = await import('node:child_process')
		const { jgame_fix_gh_packages } = await import('./jgame-fix-gh-packages.ts')

		await setup({ global_version: OLD, project_version: LATEST })
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		await jgame_version_upgrade.run()

		expect(spawnSync).toHaveBeenCalledWith(...expect_pnpm_add('-g'))
		expect(jgame_fix_gh_packages.run).not.toHaveBeenCalled()
	})

	it('upgrades both targets when both are stale', async () => {
		const { spawnSync } = await import('node:child_process')

		await setup({ global_version: OLD, project_version: OLD })
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		await jgame_version_upgrade.run()

		expect(spawnSync).toHaveBeenCalledWith(...expect_pnpm_add('-g'))
		expect(spawnSync).toHaveBeenCalledWith(...expect_pnpm_add('-D'))
	})

	it('reports up to date and runs no upgrade when neither target is stale', async () => {
		const { spawnSync } = await import('node:child_process')

		await setup({ global_version: LATEST, project_version: LATEST })
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		await jgame_version_upgrade.run()

		expect(spawnSync).not.toHaveBeenCalled()
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Up to date'))
	})

	it('skips the stale project upgrade when game-kit is pinned in pnpm-workspace.yaml overrides', async () => {
		const { spawnSync } = await import('node:child_process')
		const { jgame_fix_gh_packages } = await import('./jgame-fix-gh-packages.ts')

		await setup({
			global_version: LATEST,
			project_version: OLD,
			workspace_yaml: `overrides:\n  '${PKG}': '<1.0.0'\n`,
		})
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		await jgame_version_upgrade.run()

		expect(spawnSync).not.toHaveBeenCalled()
		expect(jgame_fix_gh_packages.run).not.toHaveBeenCalled()
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Skipping upgrade'))
	})

	it('still upgrades a stale global install even when the project upgrade is capped', async () => {
		const { spawnSync } = await import('node:child_process')

		await setup({
			global_version: OLD,
			project_version: OLD,
			workspace_yaml: `overrides:\n  '${PKG}': '<1.0.0'\n`,
		})
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		await jgame_version_upgrade.run()

		expect(spawnSync).toHaveBeenCalledWith(...expect_pnpm_add('-g'))
		expect(spawnSync).not.toHaveBeenCalledWith(...expect_pnpm_add('-D'))
	})

	it('warns and skips spawn when fetch_latest_version returns undefined', async () => {
		const { spawnSync } = await import('node:child_process')

		await setup({ global_version: OLD, project_version: OLD, latest: undefined })
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		await jgame_version_upgrade.run()

		expect(spawnSync).not.toHaveBeenCalled()
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch latest'))
	})

	it('exits with the spawn status when an upgrade fails', async () => {
		const { spawnSync } = await import('node:child_process')

		await setup({ global_version: OLD, project_version: LATEST })
		vi.mocked(spawnSync).mockReturnValue(mock_spawn_result(1))
		const { jgame_version_upgrade } = await import('./jgame-version-upgrade.ts')

		await expect(jgame_version_upgrade.run()).rejects.toThrow(/process.exit called/u)
	})
})
