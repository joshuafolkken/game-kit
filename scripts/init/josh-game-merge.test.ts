import { afterEach, describe, expect, it, vi } from 'vitest'
import { josh_game_merge, type MergeInputs, type MergeResult } from './josh-game-merge.ts'

// Exercised against the real `git merge-file` binary rather than a mock: the whole point of #384's
// engine is that the conflict markers and the clean-merge semantics are git's, so a stubbed spawn
// would only assert our own argument list back at us.

const BASE = 'body {\n\tmargin: 0;\n}\n'
const OURS = 'body {\n\tmargin: 0;\n}\n\n@font-face {\n\tfont-family: game;\n}\n'
const THEIRS = ':root {\n\t--gap: 1rem;\n}\n\nbody {\n\tmargin: 0;\n}\n'

// Unwraps the null-on-failure result once, so the assertions below read as plain property access
// instead of optional chaining — every `?.` would otherwise count as a branch against `complexity`.
function merge_or_fail(inputs: MergeInputs): MergeResult {
	const result = josh_game_merge.merge_three_way(inputs)

	if (result === null) throw new Error('git merge-file was expected to produce a result')

	return result
}

// Module-scoped so an env stub cannot leak past the describe that set it: a stray TMPDIR made every
// later merge fail to create its scratch directory and report git as unavailable.
afterEach(() => {
	vi.unstubAllEnvs()
})

describe('josh_game_merge.merge_three_way — 3-way merge via git merge-file (#384)', () => {
	it('applies the baseline update while keeping the consumer edit', () => {
		const result = merge_or_fail({ ours: OURS, base: BASE, theirs: THEIRS })

		expect(result.has_conflicts).toBe(false)
		expect(result.content).toContain('--gap: 1rem;')
		expect(result.content).toContain('font-family: game;')
		expect(result.content).not.toContain('<<<<<<<')
	})

	it('surfaces a conflict with git-style markers when both sides changed the same lines', () => {
		const result = merge_or_fail({
			ours: 'body {\n\tmargin: 4px;\n}\n',
			base: BASE,
			theirs: 'body {\n\tmargin: 8px;\n}\n',
		})

		expect(result.has_conflicts).toBe(true)
		expect(result.content).toContain('<<<<<<< ours (your edits)')
		expect(result.content).toContain('||||||| base (last synced)')
		expect(result.content).toContain('>>>>>>> theirs (game-kit baseline)')
		expect(result.content).toContain('margin: 4px;')
		expect(result.content).toContain('margin: 8px;')
	})

	it('does not conflict when the working copy is a CRLF version of an LF baseline', () => {
		const result = merge_or_fail({
			ours: OURS.replaceAll('\n', '\r\n'),
			base: BASE,
			theirs: THEIRS,
		})

		expect(result.has_conflicts).toBe(false)
		expect(result.content).toContain('--gap: 1rem;')
		expect(result.content).toContain('font-family: game;')
	})

	it('reports a clean no-op merge when the consumer never edited the file', () => {
		const result = merge_or_fail({ ours: BASE, base: BASE, theirs: THEIRS })

		expect(result.has_conflicts).toBe(false)
		expect(result.content).toBe(THEIRS)
	})

	it('returns null when git cannot be executed, so the caller can fall back to skip-with-notice', () => {
		vi.stubEnv('PATH', '')

		expect(josh_game_merge.merge_three_way({ ours: OURS, base: BASE, theirs: THEIRS })).toBeNull()
	})
})

describe('josh_game_merge.normalize_eol', () => {
	it('collapses CRLF to LF and leaves LF untouched', () => {
		expect(josh_game_merge.normalize_eol('a\r\nb\r\n')).toBe('a\nb\n')
		expect(josh_game_merge.normalize_eol('a\nb\n')).toBe('a\nb\n')
	})
})

describe('josh_game_merge.merge_three_way — output sanity guards (#384 review)', () => {
	it('rejects a clean status whose output carries markers', () => {
		// The caller refuses marker-laden input before it reaches here, so markers coming back out of a
		// merge reported clean mean whatever ran on PATH is not `git merge-file`.
		const result = josh_game_merge.merge_three_way({
			ours: 'a\n<<<<<<< ours (your edits)\nb\n',
			base: 'a\nb\n',
			theirs: 'a\nb\n',
		})

		expect(result).toBeNull()
	})

	it('detects the marker the guard keys on', () => {
		const result = merge_or_fail({
			ours: 'body {\n\tmargin: 4px;\n}\n',
			base: BASE,
			theirs: 'body {\n\tmargin: 8px;\n}\n',
		})

		expect(josh_game_merge.has_conflict_markers(result.content)).toBe(true)
		expect(josh_game_merge.has_conflict_markers(BASE)).toBe(false)
	})

	it('detects a partially-resolved file, where only a trailing marker was left behind', () => {
		// Deleting the opening marker and forgetting the closing one is the common way a resolution
		// goes wrong. The leftover line is ordinary content to git, so a guard that keyed only on
		// `<<<<<<<` would merge clean, report success and ship a stylesheet that cannot parse.
		expect(
			josh_game_merge.has_conflict_markers('body {\n}\n>>>>>>> theirs (game-kit baseline)\n'),
		).toBe(true)
		expect(josh_game_merge.has_conflict_markers('a\n||||||| base (last synced)\nb\n')).toBe(true)
	})

	it('does not mistake a decorative rule, a banner or quoted text for a marker', () => {
		// A bare `=======` line is plausible inside a CSS banner comment and carries no label to tell
		// it apart, so matching it would refuse every sync with only `--force` — which destroys the
		// consumer's edits — as the escape.
		expect(josh_game_merge.has_conflict_markers('/* ========== layout ========== */\n')).toBe(false)
		expect(josh_game_merge.has_conflict_markers('/*\n=======\nLayout\n=======\n*/\n')).toBe(false)
		expect(josh_game_merge.has_conflict_markers('content: ">>>>>>> not a marker";\n')).toBe(false)
	})

	it('returns null instead of throwing when the temp directory cannot be created', () => {
		// A read-only or full temp directory must not abort josh-game sync mid-loop and leave the
		// remaining managed files un-synced; it takes the same route as a missing git.
		vi.stubEnv('TMPDIR', '/proc/josh-game-nonexistent-and-read-only')

		expect(josh_game_merge.merge_three_way({ ours: OURS, base: BASE, theirs: THEIRS })).toBeNull()
	})
})

describe('josh_game_merge.restore_eol', () => {
	it('re-applies CRLF only when the original used it', () => {
		expect(josh_game_merge.restore_eol('a\nb\n', 'x\r\ny\r\n')).toBe('a\r\nb\r\n')
		expect(josh_game_merge.restore_eol('a\nb\n', 'x\ny\n')).toBe('a\nb\n')
	})
})

describe('josh_game_merge.restore_eol — mixed line endings', () => {
	it('leaves a file with even one bare LF on LF rather than rewriting every line', () => {
		expect(josh_game_merge.restore_eol('a\nb\n', 'x\r\ny\nz\r\n')).toBe('a\nb\n')
	})
})

describe('josh_game_merge.merge_three_way — an empty clean merge is legitimate', () => {
	it('returns empty content rather than reporting git as unavailable', () => {
		expect(josh_game_merge.merge_three_way({ ours: '', base: '', theirs: '' })).toEqual({
			content: '',
			has_conflicts: false,
		})
	})

	it('accepts the empty result when the baseline update emptied the file', () => {
		// Rejecting this as implausible output would report git as unavailable and freeze the file on
		// the one update that legitimately produces nothing.
		expect(josh_game_merge.merge_three_way({ ours: BASE, base: BASE, theirs: '' })).toEqual({
			content: '',
			has_conflicts: false,
		})
	})
})
