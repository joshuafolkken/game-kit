import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { josh_game_root_files } from './init/josh-game-root-files.ts'
import { version_range } from './init/version-range.ts'

// Contract guard for #416. `templates/` is the code game-kit SHIPS INTO consumer projects, so an
// `@joshuafolkken/app-kit/<subpath>` imported there is a hard requirement on the consumer's
// installed app-kit — and the only thing that states that requirement is `peerDependencies`.
// That declaration is load-bearing rather than documentation: `josh-game sync` reads it and raises
// a consumer's pin that sits below it (see `should_adopt_canonical_range`). A floor left too low
// therefore ships a template importing a subpath the consumer's app-kit does not export, and their
// next build dies with ERR_PACKAGE_PATH_NOT_EXPORTED.
//
// The floor was `>=0.20.0` when `templates/src/hooks.server.ts` started importing
// `@joshuafolkken/app-kit/security`, which app-kit did not export until 0.38.0 — exactly that bug.
// These tests make the next such import impossible to add silently: a subpath missing from the map
// below fails, and the floor has to be raised to match the newest entry.

// Subpath -> the app-kit version whose `exports` map first carried it. Verified against the tags in
// joshuafolkken/app-kit: v0.37.0 has no `./security` entry, v0.38.0 has one resolving to a
// `security/index` that already exports `apply_security_headers`.
const SUBPATH_INTRODUCED_IN: Readonly<Record<string, string>> = {
	'@joshuafolkken/app-kit/security': '0.38.0',
}

// The floor has a second driver: a capability game-kit stopped providing on the grounds that app-kit
// provides it. That is the same class of hard requirement as an imported subpath — below the
// recorded version the consumer gets neither side of it — but it is invisible to the scan above,
// because nothing in the shipped surface names it.
//
// `dev` joined app-kit's MANAGED_SCRIPT_KEYS in 0.81.0 (app-kit#188), so `josh-app`'s overlay seeds
// the `PORT_SEED`-aware value. game-kit's scaffolder stopped emitting its own `dev` in #438 rather
// than keep a verbatim copy of that value in step by hand. On an older app-kit neither writes it,
// and a scaffolded game has no `dev` script at all.
const CAPABILITY_INTRODUCED_IN: Readonly<Record<string, string>> = {
	'managed `dev` script (app-kit#188)': '0.81.0',
}

const APP_KIT_SUBPATH_REGEX = /@joshuafolkken\/app-kit\/[a-z0-9/-]+/gu
const SCANNED_EXTENSIONS = new Set(['.ts', '.js', '.svelte', '.html'])

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TEMPLATES_DIRECTORY = path.join(REPO_ROOT, 'templates', 'src')
// `templates/src` is not the whole shipped surface: `josh_game_root_files.ROOT_COPY_FILES` is
// byte-copied into consumers straight from the repo root, so an app-kit subpath imported there
// reaches them the same way and has to clear the same floor. Scanning only templates/ would leave
// that half unguarded — the same blind spot that let the too-low floor ship in the first place.
const ROOT_SHIPPED_FILES = josh_game_root_files.ROOT_COPY_FILES.map((file) =>
	path.join(REPO_ROOT, file),
)

interface PackageJsonShape {
	devDependencies?: Record<string, string>
	peerDependencies?: Record<string, string>
}

function compare_alphabetically(left: string, right: string): number {
	return left.localeCompare(right)
}

function is_scanned_file(name: string): boolean {
	return SCANNED_EXTENSIONS.has(path.extname(name))
}

function read_template_file(entry: { parentPath: string; name: string }): string {
	return readFileSync(path.join(entry.parentPath, entry.name), 'utf8')
}

// Every app-kit subpath referenced anywhere in the shipped surface, deduplicated.
function collect_referenced_subpaths(): ReadonlyArray<string> {
	const entries = readdirSync(TEMPLATES_DIRECTORY, { recursive: true, withFileTypes: true })
	const contents = [
		...entries
			.filter((entry) => entry.isFile() && is_scanned_file(entry.name))
			.map((entry) => read_template_file(entry)),
		...ROOT_SHIPPED_FILES.map((file) => readFileSync(file, 'utf8')),
	]
	const found = contents.flatMap((content) =>
		content
			.matchAll(APP_KIT_SUBPATH_REGEX)
			.map((match) => match[0])
			.toArray(),
	)

	return new Set(found).values().toArray().toSorted(compare_alphabetically)
}

const package_json = JSON.parse(
	readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'),
) as PackageJsonShape

// The newest introduction version across every recorded requirement — the floor game-kit must
// declare. Exact equality is asserted below, so a floor above this is over-declaring and fails too.
const required_floor =
	[...Object.values(SUBPATH_INTRODUCED_IN), ...Object.values(CAPABILITY_INTRODUCED_IN)]
		.toSorted(version_range.compare)
		.at(-1) ?? ''

describe('app-kit peerDependencies floor covers what game-kit needs from app-kit (#416, #438)', () => {
	it('declares a floor no lower than the newest subpath requirement', () => {
		expect(package_json.peerDependencies?.['@joshuafolkken/app-kit']).toBe(`>=${required_floor}`)
	})

	it('satisfies its own floor with the range josh-game sync actually writes', () => {
		// `should_adopt_canonical_range` raises a consumer's pin to game-kit's OWN devDep range when
		// the pin is below the peer floor. If that devDep range were itself below the floor, the sync
		// would rewrite package.json on every run and still leave the consumer broken — a loop that
		// reports progress and fixes nothing.
		const canonical = package_json.devDependencies?.['@joshuafolkken/app-kit'] ?? ''

		expect(version_range.is_below(canonical, `>=${required_floor}`)).toBe(false)
	})

	it('has an introduction version recorded for every app-kit subpath the templates import', () => {
		// A new subpath lands here first, forcing whoever adds it to look up when app-kit started
		// exporting it — and the assertion above then fails until the floor moves to match.
		expect(collect_referenced_subpaths()).toStrictEqual(
			Object.keys(SUBPATH_INTRODUCED_IN).toSorted(compare_alphabetically),
		)
	})
})
