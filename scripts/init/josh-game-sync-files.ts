import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { josh_game_merge, type MergeResult } from './josh-game-merge.ts'
import { josh_game_paths } from './josh-game-paths.ts'
import { josh_game_root_files } from './josh-game-root-files.ts'

// Last-synced baselines live in the project and are COMMITTED: under node_modules every reinstall
// would erase them, and gitignored they would be missing after a fresh clone — leaving the 3-way
// merge without a base exactly where it matters most (#384).
const BASELINE_DIR = '.josh-game/baselines'
// A baseline is a verbatim byte record, so it must survive every tool that rewrites source in place.
// Stored under its own extension nothing claims a parser for: `prettier --write .` walks dot
// directories (see the explicit `.claude/` entry in .prettierignore) and reformatted a bare
// `.css` baseline, which would feed the next merge a base game-kit never shipped. Kit owns the
// consumer's .prettierignore, so an extension the formatters skip beats an ignore entry upstream.
const BASELINE_SUFFIX = '.baseline'

const MISSING_BASE_REASON = 'local changes, no merge base recorded yet'
const UNUSABLE_BASE_REASON = 'local changes, the recorded merge base is empty or unreadable'
const NO_GIT_REASON = 'local changes, `git merge-file` unavailable'

interface BaselineRead {
	content: string | null
	// Names which no-base case applies when content is null, so the notice can say which one.
	reason: string
}

interface SyncEntry {
	dest: string
	src?: string
	// Free-form files carry consumer additions (fonts, styling) alongside the baseline, so an edited
	// copy is 3-way merged against the last-synced baseline (game-kit#384), falling back to a skip
	// notice when no base is recorded (game-kit#375). Managed entries are overwritten outright.
	free_form?: boolean
}

// Files copied from templates/ to the project root on every `josh-game sync` run.
// Scope: framework / app-shell config that should evolve with game-kit. Scaffold
// files that projects own and customize (src/lib/<game>/, src/routes/+page.svelte,
// static/branding, src/lib/game-config.ts) remain init-only. tsconfig.json is
// intentionally excluded because `pnpm josh init` owns the consumer's tsconfig.json
// (extends-only, reaching the kit base) — templates/tsconfig.json only type-checks
// the templates/ directory inside game-kit and must never reach consumers (#326).
//
// Consumer tsconfig.json and src/app.d.ts are NOT synced here: app-kit's `josh-app sync`
// overlay owns them now (#357) — it reconciles tsconfig to app-kit's SvelteKit preset and
// seeds a Cloudflare-aware app.d.ts. Adding either here would shadow that overlay with a
// verbatim copy and clobber the app-kit-owned content. src/app.html stays because it is the
// game's rich shell (loading overlay, version/name placeholders), which intentionally
// overrides app-kit's generic seeded shell.
//
// `src` is used when the source filename inside templates/ must differ from the
// destination. .npmrc lives at templates/npmrc because npm always strips
// `.npmrc` from published packages regardless of the package.json `files` field.
// `svelte.config.js` is the one entry NOT in templates/: it is byte-identical to the repo-root
// file and carries no template-only import, so `josh_game_root_files.ROOT_COPY_FILES` lists it and
// sync_file routes it to PACKAGE_DIR. Everything else here, layout.css included, comes from
// templates/ (see template-source-logic.ts for why import-coupled copies stay there).
const SYNC_FILES: ReadonlyArray<SyncEntry> = [
	{ dest: '.npmrc', src: 'npmrc' },
	{ dest: 'src/app.html' },
	{ dest: 'src/hooks.server.ts' },
	{ dest: 'src/lib/html-inject.ts' },
	{ dest: 'src/routes/+layout.svelte' },
	// Free-form: consumers add game-specific @font-face / styling here, so it is protected from
	// silent overwrite (game-kit#375). CRT init moved to a GameScene prop, so +layout.svelte stays managed.
	{ dest: 'src/routes/layout.css', free_form: true },
	{ dest: 'svelte.config.js' },
	{ dest: 'vite.config.ts' },
]

function sync_source_path(entry: SyncEntry): string {
	if (josh_game_root_files.is_root_copy_file(entry.dest)) {
		return path.join(josh_game_paths.PACKAGE_DIR, entry.dest)
	}

	return path.join(josh_game_paths.TEMPLATES_DIR, entry.src ?? entry.dest)
}

function copy_synced_file(entry: SyncEntry, destination: string): void {
	mkdirSync(path.dirname(destination), { recursive: true })
	cpSync(sync_source_path(entry), destination)
}

function sync_file(entry: SyncEntry): void {
	const destination = path.join(josh_game_paths.PROJECT_ROOT, entry.dest)

	copy_synced_file(entry, destination)
	console.info(`  ✔ synced   ${entry.dest}`)
}

function baseline_path(entry: SyncEntry, project_directory: string): string {
	return path.join(project_directory, BASELINE_DIR, `${entry.dest}${BASELINE_SUFFIX}`)
}

// Announced on first write only: the directory is created silently by an otherwise unremarkable
// sync, and a consumer who leaves it uncommitted loses the merge base on the next clone — landing
// back on "no merge base recorded yet", whose only exit discards the edits this feature preserves.
// Never fatal. The baseline is a record for the NEXT sync, not part of delivering this one, and the
// file itself has already been written by the time this runs — so a read-only `.josh-game/` must
// not abort the loop and leave the entries after this one un-synced. Losing the record degrades to
// the documented no-base skip, which the read side already handles.
function seed_baseline(entry: SyncEntry, project_directory: string): void {
	const destination = baseline_path(entry, project_directory)
	const is_first_write = !existsSync(destination)

	try {
		mkdirSync(path.dirname(destination), { recursive: true })
		cpSync(sync_source_path(entry), destination)
	} catch {
		console.info(`  ⚠ skipped  ${BASELINE_DIR}/${entry.dest}${BASELINE_SUFFIX} (not writable)`)

		return
	}

	if (is_first_write) {
		console.info(`  ✔ recorded ${BASELINE_DIR}/${entry.dest}${BASELINE_SUFFIX} (commit it)`)
	}
}

// `josh-game init` scaffolds layout.css but never runs a sync, so without this a project customized
// before its first sync would report "no merge base recorded yet" forever — the one state only
// `--force` escapes, at the cost of the very edits the merge exists to preserve.
function seed_baselines(project_directory: string): void {
	for (const entry of SYNC_FILES) {
		if (entry.free_form) seed_baseline(entry, project_directory)
	}
}

function persist_baseline(entry: SyncEntry): void {
	seed_baseline(entry, josh_game_paths.PROJECT_ROOT)
}

function read_baseline_content(source: string): string | null {
	try {
		return readFileSync(source, 'utf8')
	} catch {
		return null
	}
}

// Only a record with content is a merge base. An empty one — a truncated write, or a botched merge
// of the baseline file itself — would make git read every line as added by both sides and write a
// whole-file conflict over a working file, and an unreadable one would throw out of the whole sync.
// Both degrade to skip-with-notice, but they are reported apart from a base that was never written:
// one is repaired by re-recording, the other by fixing the file, and the notice has to say which.
function read_baseline(entry: SyncEntry): BaselineRead {
	const source = baseline_path(entry, josh_game_paths.PROJECT_ROOT)

	if (!existsSync(source)) return { content: null, reason: MISSING_BASE_REASON }

	const content = read_baseline_content(source)

	if (content === null || content.length === 0) {
		return { content: null, reason: UNUSABLE_BASE_REASON }
	}

	return { content: josh_game_merge.normalize_eol(content), reason: '' }
}

// Only reached with no upstream change to apply, so `--force` is deliberately NOT suggested here:
// the difference is the consumer's own edit, and taking the pristine baseline would destroy it for
// nothing. This is the steady state of every customized project and is reported as such.
function report_free_form_up_to_date(entry: SyncEntry): void {
	console.info(`  ✔ checked  ${entry.dest} (local changes; baseline already applied)`)
}

// No `--force` hint: forcing writes to the same path and fails the same way, so it would mislead.
function report_free_form_write_failure(entry: SyncEntry): void {
	console.info(`  ⚠ skipped  ${entry.dest} (merged, but the file could not be written)`)
}

function report_free_form_skip(entry: SyncEntry, reason: string): void {
	console.info(
		`  ⚠ skipped  ${entry.dest} (${reason}; run \`josh-game sync --force\` to overwrite)`,
	)
}

interface FreeFormState {
	destination: string
	// The working copy as it sits on disk, used to write the merge back with its own line endings.
	raw: string
	// The working copy and the incoming baseline, both EOL-normalized for comparison and merging.
	current: string
	incoming: string
}

// The baseline advances on a conflicted merge too, because the file now carries `theirs` inside the
// markers and any resolution of them is a file derived from it. Holding the base back instead would
// re-merge and re-mark a resolution that kept the consumer's side on EVERY later sync — the common
// way to resolve a conflict — leaving `--force`, which discards that very edit, as the only exit.
// The cost is that `git checkout -- <file>` after a conflict discards a merge the base records as
// delivered; the notice below points at resolving the markers instead, and `--force` re-syncs both.
// The write is guarded for the same reason `seed_baseline` and `merge_three_way` are: a read-only
// file or a full disk is an environment problem, and letting it escape would abort the loop with a
// raw stack and leave the entries after this one un-synced. Nothing landed, so the base stays put.
function apply_merge(entry: SyncEntry, state: FreeFormState, result: MergeResult): boolean {
	try {
		writeFileSync(state.destination, josh_game_merge.restore_eol(result.content, state.raw), 'utf8')
	} catch {
		report_free_form_write_failure(entry)

		return false
	}

	persist_baseline(entry)

	if (result.has_conflicts) {
		console.info(`  ⚠ conflict ${entry.dest} (conflict markers written — resolve them in place)`)

		return true
	}

	console.info(`  ✔ merged   ${entry.dest} (baseline update applied; local changes kept)`)

	return false
}

// Three-way merges a baseline update into an edited free-form file (#384). Skip-with-notice (#375)
// remains the fallback for the two cases a merge cannot serve: no persisted base to merge from, and
// git unavailable. A base equal to the incoming baseline means the update is already in, so the
// difference is the consumer's own edit and there is nothing to merge.
function merge_free_form_file(entry: SyncEntry, state: FreeFormState): boolean {
	// Markers from an earlier conflicted run are still unresolved. Merging on top would fold a second
	// set into the first, so this refuses for the same reason git refuses a merge mid-conflict.
	if (josh_game_merge.has_conflict_markers(state.current)) {
		console.info(`  ⚠ conflict ${entry.dest} (unresolved conflict markers — resolve them first)`)

		return true
	}

	const base = read_baseline(entry)

	// An already-edited file from before #384, or a record that cannot serve as a base. Recording the
	// incoming baseline here would be a lie — the file is not derived from it — and the next merge
	// would read this run's skipped hunks as consumer deletions and drop them under a `✔ merged`. A
	// base is only ever recorded for content the file provably matches, so this stays frozen until
	// `--force` establishes one.
	if (base.content === null) {
		report_free_form_skip(entry, base.reason)

		return false
	}

	if (base.content === state.incoming) {
		report_free_form_up_to_date(entry)

		return false
	}

	const result = josh_game_merge.merge_three_way({
		ours: state.current,
		base: base.content,
		theirs: state.incoming,
	})

	if (result === null) {
		report_free_form_skip(entry, NO_GIT_REASON)

		return false
	}

	return apply_merge(entry, state, result)
}

// Free-form files (e.g. layout.css) may carry consumer additions, so they are never silently
// overwritten (game-kit#375): missing/pristine is refreshed; an edited copy is 3-way merged (#384).
// Returns true when the file was left with conflict markers, so `run` can refuse to report success.
function sync_free_form_file(entry: SyncEntry, is_force: boolean): boolean {
	const destination = path.join(josh_game_paths.PROJECT_ROOT, entry.dest)

	if (!existsSync(destination)) {
		copy_synced_file(entry, destination)
		persist_baseline(entry)
		console.info(`  ✔ synced   ${entry.dest}`)

		return false
	}

	// Normalize EOLs so a CRLF working copy of an LF baseline isn't misread as edited (#375).
	const raw = readFileSync(destination, 'utf8')
	const current = josh_game_merge.normalize_eol(raw)
	const incoming = josh_game_merge.normalize_eol(readFileSync(sync_source_path(entry), 'utf8'))

	if (current === incoming) {
		persist_baseline(entry)
		console.info(`  ✔ checked  ${entry.dest} (up-to-date)`)

		return false
	}

	if (is_force) {
		copy_synced_file(entry, destination)
		persist_baseline(entry)
		console.info(`  ✔ forced   ${entry.dest} (overwrote local changes)`)

		return false
	}

	return merge_free_form_file(entry, { destination, raw, current, incoming })
}

function did_conflict_on_entry(entry: SyncEntry, is_force: boolean): boolean {
	if (!entry.free_form) {
		sync_file(entry)

		return false
	}

	return sync_free_form_file(entry, is_force)
}

// Counts the files left with conflict markers rather than swallowing them: `run` turns a non-zero
// count into a non-zero exit so a scripted upgrade cannot report success over a broken build (#384).
function sync_managed_files(is_force: boolean): number {
	let conflict_count = 0

	for (const entry of SYNC_FILES) {
		if (did_conflict_on_entry(entry, is_force)) conflict_count += 1
	}

	return conflict_count
}

const josh_game_sync_files = {
	SYNC_FILES,
	seed_baselines,
	sync_file,
	sync_managed_files,
	sync_free_form_file,
}

export { josh_game_sync_files }
export type { SyncEntry }
