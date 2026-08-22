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

describe('josh_game_merge.merge_three_way — 3-way merge via git merge-file (#384)', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

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
	it('detects the marker the guard keys on', () => {
		const result = merge_or_fail({
			ours: 'body {\n\tmargin: 4px;\n}\n',
			base: BASE,
			theirs: 'body {\n\tmargin: 8px;\n}\n',
		})

		expect(josh_game_merge.has_conflict_markers(result.content)).toBe(true)
		expect(josh_game_merge.has_conflict_markers(BASE)).toBe(false)
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

describe('josh_game_merge.merge_three_way — an all-empty merge is legitimate', () => {
	it('returns empty content rather than reporting git as unavailable', () => {
		expect(josh_game_merge.merge_three_way({ ours: '', base: '', theirs: '' })).toEqual({
			content: '',
			has_conflicts: false,
		})
	})
})
