import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./jgame-version-api.ts', () => ({
	jgame_version_api: { fetch_latest_version: vi.fn() },
}))
vi.mock('./jgame-version-targets.ts', () => ({
	jgame_version_targets: { read_global_version: vi.fn(), read_project_version: vi.fn() },
}))
vi.mock('./jgame-running-binary.ts', () => ({
	jgame_running_binary: {
		read_running_version: vi.fn(),
		running_package_directory: vi.fn(),
	},
}))

const LATEST = '0.80.0'
const OLD = '0.79.0'

describe('jgame_version_check.run', () => {
	/* eslint-disable init-declarations -- assigned in beforeEach */
	let info_spy: ReturnType<typeof vi.spyOn>
	let warn_spy: ReturnType<typeof vi.spyOn>
	/* eslint-enable init-declarations */

	beforeEach(() => {
		vi.resetAllMocks()
		info_spy = vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
		warn_spy = vi.spyOn(console, 'warn').mockImplementation(() => {
			/* no-op */
		})
	})

	it('renders the dual-target report with global, project and running lines', async () => {
		const { jgame_version_api } = await import('./jgame-version-api.ts')
		const { jgame_version_targets } = await import('./jgame-version-targets.ts')
		const { jgame_running_binary } = await import('./jgame-running-binary.ts')

		vi.mocked(jgame_version_targets.read_global_version).mockReturnValue(LATEST)
		vi.mocked(jgame_version_targets.read_project_version).mockReturnValue(OLD)
		vi.mocked(jgame_running_binary.read_running_version).mockReturnValue(OLD)
		vi.mocked(jgame_running_binary.running_package_directory).mockReturnValue('/proj/node_modules')
		vi.mocked(jgame_version_api.fetch_latest_version).mockReturnValue(LATEST)

		const { jgame_version_check } = await import('./jgame-version-check.ts')

		jgame_version_check.run()

		const output = info_spy.mock.calls[0]?.[0] as string

		expect(output).toContain('Global:')
		expect(output).toContain('Project:')
		expect(output).toContain('Running:')
		expect(output).toContain('Run: pnpm add -D @joshuafolkken/game-kit@0.80.0')
	})

	it('omits the running line when the running version is unknown', async () => {
		const { jgame_version_api } = await import('./jgame-version-api.ts')
		const { jgame_version_targets } = await import('./jgame-version-targets.ts')
		const { jgame_running_binary } = await import('./jgame-running-binary.ts')

		vi.mocked(jgame_version_targets.read_global_version).mockReturnValue(LATEST)
		vi.mocked(jgame_version_targets.read_project_version).mockReturnValue(LATEST)
		vi.mocked(jgame_running_binary.read_running_version).mockReturnValue(undefined)
		vi.mocked(jgame_version_api.fetch_latest_version).mockReturnValue(LATEST)

		const { jgame_version_check } = await import('./jgame-version-check.ts')

		jgame_version_check.run()

		const output = info_spy.mock.calls[0]?.[0] as string

		expect(output).not.toContain('Running:')
	})

	it('warns and prints the offline report when the latest version is unavailable', async () => {
		const { jgame_version_api } = await import('./jgame-version-api.ts')
		const { jgame_version_targets } = await import('./jgame-version-targets.ts')
		const { jgame_running_binary } = await import('./jgame-running-binary.ts')

		vi.mocked(jgame_version_targets.read_global_version).mockReturnValue(undefined)
		vi.mocked(jgame_version_targets.read_project_version).mockReturnValue(OLD)
		vi.mocked(jgame_running_binary.read_running_version).mockReturnValue(undefined)
		vi.mocked(jgame_version_api.fetch_latest_version).mockReturnValue(undefined)

		const { jgame_version_check } = await import('./jgame-version-check.ts')

		jgame_version_check.run()

		expect(warn_spy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch latest'))
		const output = info_spy.mock.calls[0]?.[0] as string

		expect(output).toContain('Global:  not installed')
		expect(output).toContain(`Project: ${OLD}`)
		expect(output).not.toMatch(/Run:/u)
	})
})
