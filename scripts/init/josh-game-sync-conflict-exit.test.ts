import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The headline safety guarantee of #384: a free-form file left carrying conflict markers does not
// build, so the sync must not report success over it. Isolated in its own file because asserting it
// means replacing `sync_managed_files` wholesale, which the SYNC_FILES contract tests next door
// deliberately exercise for real.
const sync_managed_files_mock = vi.hoisted(() => vi.fn())

vi.mock('node:fs', () => ({
	cpSync: vi.fn(),
	existsSync: vi.fn().mockReturnValue(false),
	mkdirSync: vi.fn(),
	readdirSync: vi.fn().mockReturnValue([]),
	readFileSync: vi.fn().mockReturnValue('{}'),
	writeFileSync: vi.fn(),
}))
vi.mock('node:child_process', () => ({ execSync: vi.fn() }))
vi.mock('./josh-game-paths.ts', () => ({
	josh_game_paths: {
		PACKAGE_DIR: '/pkg',
		TEMPLATES_DIR: '/pkg/templates',
		PROJECT_ROOT: '/project',
	},
}))
vi.mock('./josh-game-eslint-config.ts', () => ({
	josh_game_eslint_config: { write_eslint_config: vi.fn() },
}))
vi.mock('./josh-game-cspell-config.ts', () => ({
	josh_game_cspell_config: { write_cspell_config: vi.fn() },
}))
vi.mock('./josh-game-sync-files.ts', () => ({
	josh_game_sync_files: {
		SYNC_FILES: [],
		sync_file: vi.fn(),
		sync_managed_files: sync_managed_files_mock,
		sync_free_form_file: vi.fn(),
		seed_baselines: vi.fn(),
	},
}))

const DONE_MARKER = '✅ Done.'

describe('josh_game_sync.run — conflict markers must not be reported as success (game-kit#384)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		sync_managed_files_mock.mockReset()
		vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
		vi.spyOn(console, 'error').mockImplementation(() => {
			/* no-op */
		})
	})

	afterEach(() => {
		// A leaked non-zero code would fail the whole vitest process, not just this file.
		process.exitCode = 0
	})

	it('exits non-zero and withholds the success line when a file was left conflicted', async () => {
		sync_managed_files_mock.mockReturnValue(1)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.run()

		expect(process.exitCode).toBe(1)
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('<<<<<<<'))
		expect(console.info).not.toHaveBeenCalledWith(expect.stringContaining(DONE_MARKER))
	})

	it('leaves the exit code alone and reports success when nothing conflicted', async () => {
		sync_managed_files_mock.mockReturnValue(0)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.run()

		expect(process.exitCode).not.toBe(1)
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining(DONE_MARKER))
	})
})
