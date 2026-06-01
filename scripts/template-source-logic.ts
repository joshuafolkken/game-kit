import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Maintainer-only guard. Resolves the repo root from this file's own location
// (scripts/ -> ..) so it works under `tsx` source execution and Vitest, where
// jgame_paths.PACKAGE_DIR (tuned for the compiled dist/ layout) would not point
// at the repo root.
const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function repo_path(relative_path: string): string {
	return path.join(REPO_ROOT, relative_path)
}

interface TemplateSourcePair {
	template: string
	source: string
}

// Copy pairs: the template is a byte-for-byte copy of the root source (no
// intentional divergence). `reconcile` regenerates the copy; the parity test
// asserts exact equality.
//
//   - npm strips a literal `.npmrc` from the package, so the dotless
//     `templates/npmrc` remains the distribution vehicle.
//   - layout.css / Score.svelte.ts are imported by template files that still
//     live under templates/ (+layout.svelte, Game.svelte.ts, Scene.svelte), so
//     the copy must stay there to keep the template import graph resolvable.
//     They become root-only direct copies once those importers are generated
//     from root in the import-rewrite phase.
const COPY_PAIRS: ReadonlyArray<TemplateSourcePair> = [
	{ template: 'templates/npmrc', source: '.npmrc' },
	{ template: 'templates/src/routes/layout.css', source: 'src/routes/layout.css' },
	{ template: 'templates/src/lib/game/Score.svelte.ts', source: 'src/lib/game/Score.svelte.ts' },
]

// Tripwire pairs: the template intentionally diverges from the root source
// (e.g. templates/vite.config.ts omits the in-repo Vitest config). A source
// edit trips the guard and forces a conscious re-check; propagation stays a
// human decision recorded by `reconcile`. When adding a pair to either list,
// also add its files to the template-source-parity glob in lefthook.yml.
const TRIPWIRE_PAIRS: ReadonlyArray<TemplateSourcePair> = [
	{ template: 'templates/vite.config.ts', source: 'vite.config.ts' },
]

// Internal maintainer guard state, kept at the repo root (not under templates/)
// so the allowlist `files` field never ships it to consumers. Holds tripwire
// source hashes only — copy pairs are checked by exact equality, not by hash.
const MANIFEST_PATH = '.template-source-manifest.json'

type SourceManifest = Record<string, string>

function parse_source_manifest(raw: string): SourceManifest {
	const parsed: unknown = JSON.parse(raw)

	if (typeof parsed !== 'object' || parsed === null) {
		throw new TypeError(`${MANIFEST_PATH}: expected a JSON object of source → hash`)
	}

	for (const value of Object.values(parsed)) {
		if (typeof value !== 'string') {
			throw new TypeError(`${MANIFEST_PATH}: every recorded hash must be a string`)
		}
	}

	return parsed as SourceManifest
}

function read_file(relative_path: string): string {
	return readFileSync(repo_path(relative_path), 'utf8')
}

function read_optional_file(relative_path: string): string {
	const full_path = repo_path(relative_path)

	return existsSync(full_path) ? readFileSync(full_path, 'utf8') : ''
}

function hash_text(text: string): string {
	return createHash('sha256').update(text).digest('hex')
}

function find_copy_drift(): Array<TemplateSourcePair> {
	return COPY_PAIRS.filter((pair) => read_optional_file(pair.template) !== read_file(pair.source))
}

function build_tripwire_manifest(): SourceManifest {
	const manifest: SourceManifest = {}

	for (const pair of TRIPWIRE_PAIRS) {
		manifest[pair.source] = hash_text(read_file(pair.source))
	}

	return manifest
}

function find_tripwire_drift(recorded: SourceManifest): Array<TemplateSourcePair> {
	return TRIPWIRE_PAIRS.filter(
		(pair) => recorded[pair.source] !== hash_text(read_file(pair.source)),
	)
}

function read_recorded_manifest(): SourceManifest {
	return parse_source_manifest(read_file(MANIFEST_PATH))
}

function format_drift_message(
	copy_drift: ReadonlyArray<TemplateSourcePair>,
	tripwire_drift: ReadonlyArray<TemplateSourcePair>,
): string {
	const lines = [
		...copy_drift.map((pair) => `  - ${pair.template} is out of date with ${pair.source}`),
		...tripwire_drift.map((pair) => `  - ${pair.source} changed → review ${pair.template}`),
	]

	return [
		'✖ Template source(s) need reconciling:',
		...lines,
		'  Review any tripwire template, then run `pnpm reconcile-templates`.',
	].join('\n')
}

function regenerate_copies(): void {
	for (const pair of COPY_PAIRS) {
		copyFileSync(repo_path(pair.source), repo_path(pair.template))
	}
}

function write_tripwire_manifest(): void {
	const serialized = `${JSON.stringify(build_tripwire_manifest(), undefined, '\t')}\n`

	writeFileSync(repo_path(MANIFEST_PATH), serialized)
}

function reconcile(): void {
	regenerate_copies()
	write_tripwire_manifest()
}

const template_source_logic = {
	MANIFEST_PATH,
	COPY_PAIRS,
	TRIPWIRE_PAIRS,
	hash_text,
	find_copy_drift,
	build_tripwire_manifest,
	find_tripwire_drift,
	read_recorded_manifest,
	format_drift_message,
	reconcile,
}

export { template_source_logic, parse_source_manifest }
export type { SourceManifest, TemplateSourcePair }
