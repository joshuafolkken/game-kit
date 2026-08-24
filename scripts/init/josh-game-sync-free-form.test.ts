import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Isolated node:fs mock (existsSync + readFileSync controlled per-test) so the free-form
// protection logic can be exercised without touching the real filesystem. Kept separate from
// josh-game-sync.test.ts, which relies on the REAL existsSync for its template-source guards.
vi.mock('node:fs', () => ({
	cpSync: vi.fn(),
	mkdirSync: vi.fn(),
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
}))
vi.mock('node:child_process', () => ({ execSync: vi.fn() }))
// The git-backed engine has its own real-binary suite (josh-game-merge.test.ts), so only that one
// call is stubbed here; the pure helpers come from the real module. Hand-written copies drifted from
// the implementation once already — a `has_conflict_markers` stub that only knew the opening marker
// kept passing while the real guard was still missing partially-resolved files.
const merge_three_way_mock = vi.hoisted(() => vi.fn())

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- vi.importActual generic needs an inline import type
type MergeModule = typeof import('./josh-game-merge.ts')

vi.mock('./josh-game-merge.ts', async () => {
	const actual = await vi.importActual<MergeModule>('./josh-game-merge.ts')

	return {
		josh_game_merge: { ...actual.josh_game_merge, merge_three_way: merge_three_way_mock },
	}
})
vi.mock('./josh-game-paths.ts', () => ({
	josh_game_paths: {
		PACKAGE_DIR: '/pkg',
		TEMPLATES_DIR: '/pkg/templates',
		PROJECT_ROOT: '/project',
	},
}))

const FREE_FORM_ENTRY = { dest: 'src/routes/layout.css', free_form: true } as const
const SOURCE_PATH = '/pkg/templates/src/routes/layout.css'
const DEST_PATH = '/project/src/routes/layout.css'
const BASELINE_PATH = '/project/.josh-game/baselines/src/routes/layout.css.baseline'

describe('josh_game_sync.sync_free_form_file — never silently overwrite consumer edits (game-kit#375)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
	})

	it('seeds the file from the baseline when it does not exist yet', async () => {
		const { existsSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(false)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)
		expect(cpSync).toHaveBeenCalledWith(SOURCE_PATH, DEST_PATH)
	})

	it('is a no-op when the local file already matches the baseline', async () => {
		const { existsSync, readFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue('identical')
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)
		expect(cpSync).not.toHaveBeenCalledWith(SOURCE_PATH, DEST_PATH)
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('up-to-date'))
	})

	it('treats a CRLF working copy of an LF baseline as up-to-date (no spurious skip)', async () => {
		const { existsSync, readFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file) =>
			file === DEST_PATH ? 'line-a\r\nline-b\r\n' : 'line-a\nline-b\n',
		)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)
		expect(cpSync).not.toHaveBeenCalledWith(SOURCE_PATH, DEST_PATH)
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('up-to-date'))
		expect(console.info).not.toHaveBeenCalledWith(expect.stringContaining('skipped'))
	})

	it('skips with a visible notice when the file has local changes and --force is absent', async () => {
		const { existsSync, readFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file) =>
			file === DEST_PATH ? 'local edits' : 'baseline',
		)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)
		// The #375 guarantee is that the edit survives and the run says so. #384 kept the guarantee and
		// sharpened the wording: with the baseline already applied there is nothing upstream to take,
		// so the notice no longer points at `--force`, which here would only destroy the edit.
		expect(cpSync).not.toHaveBeenCalled()
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('local changes'))
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('baseline already applied'))
	})

	it('overwrites the locally-modified file when --force is passed', async () => {
		const { existsSync, readFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file) =>
			file === DEST_PATH ? 'local edits' : 'baseline',
		)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, true)
		expect(cpSync).toHaveBeenCalledWith(SOURCE_PATH, DEST_PATH)
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('forced'))
	})
})

// The consumer file diverges from BOTH the persisted base and the incoming baseline, which is the
// only shape that has something to merge: an upstream change to fold into a locally-edited file.
const MERGEABLE_READS = (file: unknown): string => {
	if (file === DEST_PATH) return 'base\nlocal edit\n'
	if (file === BASELINE_PATH) return 'base\n'

	return 'base\nupstream edit\n'
}

describe('josh_game_sync.sync_free_form_file — 3-way merge of baseline updates (game-kit#384)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// clearAllMocks keeps implementations, so a return value would leak into the next case.
		merge_three_way_mock.mockReset()
		vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
	})

	it('persists the last-synced baseline when it seeds a missing file', async () => {
		const { existsSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(false)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)
		expect(cpSync).toHaveBeenCalledWith(SOURCE_PATH, BASELINE_PATH)
	})

	it('applies a clean merge to the file and advances the baseline', async () => {
		const { existsSync, readFileSync, writeFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation(MERGEABLE_READS)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		merge_three_way_mock.mockReturnValue({ content: 'merged output\n', has_conflicts: false })
		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)

		expect(merge_three_way_mock).toHaveBeenCalledWith({
			ours: 'base\nlocal edit\n',
			base: 'base\n',
			theirs: 'base\nupstream edit\n',
		})
		expect(writeFileSync).toHaveBeenCalledWith(DEST_PATH, 'merged output\n', 'utf8')
		expect(cpSync).toHaveBeenCalledWith(SOURCE_PATH, BASELINE_PATH)
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('merged'))
	})

	it('writes the conflict markers and reports them instead of skipping or overwriting', async () => {
		const { existsSync, readFileSync, writeFileSync } = await import('node:fs')
		const conflicted = '<<<<<<< ours\nlocal edit\n=======\nupstream edit\n>>>>>>> theirs\n'

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation(MERGEABLE_READS)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		merge_three_way_mock.mockReturnValue({ content: conflicted, has_conflicts: true })
		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)

		expect(writeFileSync).toHaveBeenCalledWith(DEST_PATH, conflicted, 'utf8')
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('conflict'))
		expect(console.info).not.toHaveBeenCalledWith(expect.stringContaining('skipped'))
	})

	it('survives a destination it cannot write instead of aborting the rest of the sync', async () => {
		const { existsSync, readFileSync, writeFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation(MERGEABLE_READS)
		vi.mocked(writeFileSync).mockImplementationOnce(() => {
			throw new Error('EACCES: permission denied')
		})
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		merge_three_way_mock.mockReturnValue({ content: 'merged\n', has_conflicts: false })

		expect(josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)).toBe(false)
		// Nothing landed, so the base must stay put or the next sync would read the update as applied.
		expect(cpSync).not.toHaveBeenCalledWith(SOURCE_PATH, BASELINE_PATH)
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('could not be written'))
	})

	it('advances the baseline on a conflicted merge, so resolving in the consumer favour ends it', async () => {
		const { existsSync, readFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation(MERGEABLE_READS)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		merge_three_way_mock.mockReturnValue({ content: '<<<<<<< ours\n', has_conflicts: true })
		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)

		// Without this the next sync re-merges the same base and re-marks a file the consumer already
		// resolved, on every run, with `--force` (which discards the edit) as the only way out.
		expect(cpSync).toHaveBeenCalledWith(SOURCE_PATH, BASELINE_PATH)
	})

	it('refuses to merge a partially-resolved file that still carries a trailing marker', async () => {
		const { existsSync, readFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file) =>
			file === DEST_PATH ? 'base\nmine\n>>>>>>> theirs (game-kit baseline)\n' : 'base\n',
		)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		expect(josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)).toBe(true)
		expect(merge_three_way_mock).not.toHaveBeenCalled()
		expect(console.info).toHaveBeenCalledWith(
			expect.stringContaining('unresolved conflict markers'),
		)
	})

	it('refuses to merge on top of markers left by an earlier conflicted run', async () => {
		const { existsSync, readFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file) =>
			file === DEST_PATH ? 'base\n<<<<<<< ours (your edits)\nmine\n' : 'base\n',
		)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		expect(josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)).toBe(true)
		expect(merge_three_way_mock).not.toHaveBeenCalled()
		expect(console.info).toHaveBeenCalledWith(
			expect.stringContaining('unresolved conflict markers'),
		)
	})

	it('writes the merge back with the working copy line endings instead of forcing LF', async () => {
		const { existsSync, readFileSync, writeFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file) => {
			if (file === DEST_PATH) return 'base\r\nlocal edit\r\n'
			if (file === BASELINE_PATH) return 'base\n'

			return 'base\nupstream edit\n'
		})
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		merge_three_way_mock.mockReturnValue({ content: 'a\nb\n', has_conflicts: false })
		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)

		expect(writeFileSync).toHaveBeenCalledWith(DEST_PATH, 'a\r\nb\r\n', 'utf8')
	})
})

describe('josh_game_sync.sync_free_form_file — merge fallbacks and escape hatches (game-kit#384)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		merge_three_way_mock.mockReset()
		vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
	})

	it('skips without recording a base when none exists, since the file is not derived from the incoming one', async () => {
		const { existsSync, readFileSync, writeFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockImplementation((file) => file !== BASELINE_PATH)
		vi.mocked(readFileSync).mockImplementation(MERGEABLE_READS)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)

		expect(merge_three_way_mock).not.toHaveBeenCalled()
		expect(writeFileSync).not.toHaveBeenCalledWith(DEST_PATH, expect.anything(), expect.anything())
		expect(cpSync).not.toHaveBeenCalled()
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('no merge base recorded yet'))
	})

	it('treats a truncated (zero-byte) baseline as no base rather than merging against nothing', async () => {
		// An empty base makes git read every line as added by both sides, writing a whole-file
		// conflict over a working file — worse than the skip the missing-base case already takes.
		const { existsSync, readFileSync, writeFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file) => {
			if (file === DEST_PATH) return 'base\nlocal edit\n'
			if (file === BASELINE_PATH) return ''

			return 'base\nupstream edit\n'
		})
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)

		expect(merge_three_way_mock).not.toHaveBeenCalled()
		expect(writeFileSync).not.toHaveBeenCalledWith(DEST_PATH, expect.anything(), expect.anything())
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('empty or unreadable'))
	})

	it('survives an unreadable baseline instead of throwing out of the whole sync', async () => {
		const { existsSync, readFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file) => {
			if (file === DEST_PATH) return 'base\nlocal edit\n'
			if (file === BASELINE_PATH) throw new Error('EACCES: permission denied')

			return 'base\nupstream edit\n'
		})
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		expect(josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)).toBe(false)
		// Reported apart from a base that was never written: one is repaired by re-recording, the
		// other by fixing the file.
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('empty or unreadable'))
	})

	it('reports the git-unavailable skip distinctly from the missing-base skip', async () => {
		const { existsSync, readFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation(MERGEABLE_READS)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		merge_three_way_mock.mockReturnValue(null)
		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)

		expect(console.info).toHaveBeenCalledWith(
			expect.stringContaining('`git merge-file` unavailable'),
		)
	})

	it('signals a conflict to the caller so the sync can refuse to report success', async () => {
		const { existsSync, readFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation(MERGEABLE_READS)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		merge_three_way_mock.mockReturnValue({ content: '<<<<<<< ours\n', has_conflicts: true })

		expect(josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)).toBe(true)

		merge_three_way_mock.mockReturnValue({ content: 'merged\n', has_conflicts: false })

		expect(josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)).toBe(false)
	})

	it('never advises --force when the baseline is already applied and only the edit differs', async () => {
		// This is the steady state of every customized project, so it fires on every sync. There is no
		// upstream change to take, and following a `--force` hint here would destroy the edit for
		// nothing.
		const { existsSync, readFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file) =>
			file === DEST_PATH ? 'baseline\nlocal edit\n' : 'baseline\n',
		)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, false)

		expect(merge_three_way_mock).not.toHaveBeenCalled()
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('baseline already applied'))
		expect(console.info).not.toHaveBeenCalledWith(expect.stringContaining('--force'))
	})

	it('still overwrites with the pristine baseline under --force, resetting the merge base', async () => {
		const { existsSync, readFileSync, cpSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation(MERGEABLE_READS)
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.sync_free_form_file(FREE_FORM_ENTRY, true)

		expect(merge_three_way_mock).not.toHaveBeenCalled()
		expect(cpSync).toHaveBeenCalledWith(SOURCE_PATH, DEST_PATH)
		expect(cpSync).toHaveBeenCalledWith(SOURCE_PATH, BASELINE_PATH)
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('forced'))
	})
})

describe('josh_game_sync — a conflicted merge must not report success (game-kit#384)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		merge_three_way_mock.mockReset()
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

	it('counts the files left with conflict markers', async () => {
		// This count is the only thing connecting the merge result to the process exit code, so a
		// regression here ships `✅ Done.` and exit 0 over a file the app cannot build with.
		const { existsSync, readFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation(MERGEABLE_READS)
		const { josh_game_sync_files } = await import('./josh-game-sync-files.ts')

		merge_three_way_mock.mockReturnValue({ content: '<<<<<<< ours\n', has_conflicts: true })

		expect(josh_game_sync_files.sync_managed_files(false)).toBe(1)
	})

	it('reports zero when every managed file synced cleanly', async () => {
		const { existsSync, readFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue('identical')
		const { josh_game_sync_files } = await import('./josh-game-sync-files.ts')

		expect(josh_game_sync_files.sync_managed_files(false)).toBe(0)
	})
})
