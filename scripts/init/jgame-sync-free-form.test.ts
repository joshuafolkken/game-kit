import { beforeEach, describe, expect, it, vi } from 'vitest'

// Isolated node:fs mock (existsSync + readFileSync controlled per-test) so the free-form
// protection logic can be exercised without touching the real filesystem. Kept separate from
// jgame-sync.test.ts, which relies on the REAL existsSync for its template-source guards.
vi.mock('node:fs', () => ({
	cpSync: vi.fn(),
	mkdirSync: vi.fn(),
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
}))
vi.mock('node:child_process', () => ({ execSync: vi.fn() }))
vi.mock('./jgame-paths.ts', () => ({
	jgame_paths: {
		PACKAGE_DIR: '/pkg',
		TEMPLATES_DIR: '/pkg/templates',
		PROJECT_ROOT: '/project',
	},
}))

const FREE_FORM_ENTRY = { dest: 'src/routes/layout.css', free_form: true } as const
const SOURCE_PATH = '/pkg/templates/src/routes/layout.css'
const DEST_PATH = '/project/src/routes/layout.css'

describe('jgame_sync.sync_free_form_file — never silently overwrite consumer edits (game-kit#375)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
	})

	it('seeds the file from the baseline when it does not exist yet', async () => {
		const { existsSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(false)
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.sync_free_form_file(FREE_FORM_ENTRY, false)
		expect(cpSync).toHaveBeenCalledWith(SOURCE_PATH, DEST_PATH)
	})

	it('is a no-op when the local file already matches the baseline', async () => {
		const { existsSync, readFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue('identical')
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.sync_free_form_file(FREE_FORM_ENTRY, false)
		expect(cpSync).not.toHaveBeenCalled()
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('up-to-date'))
	})

	it('treats a CRLF working copy of an LF baseline as up-to-date (no spurious skip)', async () => {
		const { existsSync, readFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file) =>
			file === DEST_PATH ? 'line-a\r\nline-b\r\n' : 'line-a\nline-b\n',
		)
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.sync_free_form_file(FREE_FORM_ENTRY, false)
		expect(cpSync).not.toHaveBeenCalled()
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('up-to-date'))
		expect(console.info).not.toHaveBeenCalledWith(expect.stringContaining('skipped'))
	})

	it('skips with a visible notice when the file has local changes and --force is absent', async () => {
		const { existsSync, readFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file) =>
			file === DEST_PATH ? 'local edits' : 'baseline',
		)
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.sync_free_form_file(FREE_FORM_ENTRY, false)
		expect(cpSync).not.toHaveBeenCalled()
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('skipped'))
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('--force'))
	})

	it('overwrites the locally-modified file when --force is passed', async () => {
		const { existsSync, readFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file) =>
			file === DEST_PATH ? 'local edits' : 'baseline',
		)
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.sync_free_form_file(FREE_FORM_ENTRY, true)
		expect(cpSync).toHaveBeenCalledWith(SOURCE_PATH, DEST_PATH)
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('forced'))
	})
})
