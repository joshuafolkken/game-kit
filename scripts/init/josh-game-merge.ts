import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// `git merge-file` reports the conflict count as its exit status, truncated to 127. Anything at or
// above this is git itself failing (bad usage, missing binary shim) rather than a conflicted merge.
const GIT_FAILURE_STATUS = 128
const TEMP_PREFIX = 'josh-game-merge-'

// Section labels written into the conflict markers. Ordered the way `git merge-file` takes them:
// current, base, other — so `-L` positions line up with the file arguments.
const MERGE_LABELS = ['ours (your edits)', 'base (last synced)', 'theirs (game-kit baseline)']

const INPUT_FILE_NAMES = ['ours', 'base', 'theirs'] as const

const CONFLICT_MARKER = '<<<<<<< '
const CRLF = '\r\n'

interface MergeInputs {
	// The consumer's current file content.
	ours: string
	// The baseline persisted at the previous sync — the merge base.
	base: string
	// The baseline shipped by the current game-kit version.
	theirs: string
}

interface MergeResult {
	content: string
	has_conflicts: boolean
}

// Normalizes CRLF so a Windows working copy of an LF baseline does not conflict on every line.
function normalize_eol(text: string): string {
	return text.replaceAll(CRLF, '\n')
}

function has_conflict_markers(text: string): boolean {
	return text.includes(CONFLICT_MARKER)
}

// True only when CRLF is the file's line ending throughout. A file with even one bare LF is mixed,
// and rewriting all of it to CRLF would produce the whole-file diff this exists to avoid. Such a
// file is written back as LF — a merge cannot reproduce a per-line ending the inputs no longer
// carry, and normalizing the minority is the smaller diff of the two.
function is_crlf_file(text: string): boolean {
	if (!text.includes(CRLF)) return false

	return !text.replaceAll(CRLF, '').includes('\n')
}

// Merge output is always LF because the inputs are normalized. Writing that straight back would
// convert a CRLF working copy wholesale and bury the merged hunk in a whole-file diff, so the
// original line ending is restored.
function restore_eol(merged: string, original: string): string {
	if (!is_crlf_file(original)) return merged

	// Literal replacement: `$&`-style sequences in a non-literal value are reinterpreted by replaceAll.
	return merged.replaceAll('\n', '\r\n')
}

function write_merge_inputs(directory: string, inputs: MergeInputs): ReadonlyArray<string> {
	const contents = [inputs.ours, inputs.base, inputs.theirs]

	return INPUT_FILE_NAMES.map((name, index) => {
		const file = path.join(directory, name)

		writeFileSync(file, normalize_eol(contents[index] ?? ''), 'utf8')

		return file
	})
}

function build_merge_arguments(files: ReadonlyArray<string>): ReadonlyArray<string> {
	const labels = MERGE_LABELS.flatMap((label) => ['-L', label])

	return ['merge-file', '-p', '--diff3', ...labels, ...files]
}

// A conflict count is only believable when the output actually carries markers, and empty output is
// only legitimate when every input was empty too. Either shape means git did not do what its exit
// status claims — a wrapper on PATH exiting 1..127 reads as "one conflict" — so the result is
// discarded rather than written over the consumer's file.
function did_git_produce_merge(
	stdout: string,
	has_conflicts: boolean,
	inputs: MergeInputs,
): boolean {
	if (has_conflicts) return has_conflict_markers(stdout)
	if (stdout.length > 0) return true

	return inputs.ours.length === 0 && inputs.base.length === 0 && inputs.theirs.length === 0
}

function run_git_merge(files: ReadonlyArray<string>, inputs: MergeInputs): MergeResult | null {
	const result = spawnSync('git', build_merge_arguments(files), { encoding: 'utf8' })

	if (result.error || result.status === null || result.status >= GIT_FAILURE_STATUS) return null

	const has_conflicts = result.status > 0

	if (!did_git_produce_merge(result.stdout, has_conflicts, inputs)) return null

	return { content: result.stdout, has_conflicts }
}

// Three-way merges the consumer's edits with an upstream baseline change, delegating to
// `git merge-file` so the conflict markers are the ones every developer already reads (#384).
// Returns null when git is unavailable or refuses the merge, letting the caller fall back to
// the skip-with-notice behaviour from #375.
function merge_three_way(inputs: MergeInputs): MergeResult | null {
	const directory = mkdtempSync(path.join(tmpdir(), TEMP_PREFIX))

	try {
		return run_git_merge(write_merge_inputs(directory, inputs), inputs)
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
}

const josh_game_merge = { merge_three_way, normalize_eol, has_conflict_markers, restore_eol }

export { josh_game_merge }
export type { MergeInputs, MergeResult }
