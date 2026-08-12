import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { josh_game_cspell_config } from './josh-game-cspell-config.ts'
import { josh_game_eslint_config } from './josh-game-eslint-config.ts'
import { josh_game_managed_dev_deps as josh_game_managed_development_deps } from './josh-game-managed-development-deps.ts'
import { josh_game_paths } from './josh-game-paths.ts'
import { josh_game_root_files } from './josh-game-root-files.ts'
import { version_range } from './version-range.ts'

const SPAWN_OPTIONS = { stdio: 'inherit' as const }
// Resolvability probe: `josh help` exits 0 when kit's bin is reachable. josh-app delegates to
// that same `josh` base, so a resolvable `josh` confirms the toolchain install completed (app-kit
// is a sibling devDep installed alongside kit). `ignore` keeps the probe silent.
const JOSH_PROBE_OPTIONS = { stdio: 'ignore' as const }

const JOSH_MISSING_MESSAGE =
	'\n❌ josh-game sync: the `josh-app` command (@joshuafolkken/app-kit) and its `josh` base\n' +
	'   (@joshuafolkken/kit) are not resolvable. Run `pnpm install`, then re-run `josh-game sync`.\n'

const FORCE_FLAG = '--force'

interface SyncEntry {
	dest: string
	src?: string
	// Free-form files carry consumer additions (fonts, styling) alongside the baseline, so an
	// edited copy is skipped (notice) unless `josh-game sync --force` (game-kit#375). Managed: overwrite.
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
// Byte-identical files (svelte.config.js, src/routes/layout.css) are NOT in templates/:
// they are sourced directly from the package root via josh_game_root_files — sync_file routes
// those to PACKAGE_DIR.
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

// Free-form files (e.g. layout.css) may carry consumer additions, so they are never silently
// overwritten (game-kit#375): missing/pristine is refreshed; a locally-edited copy is skipped.
function sync_free_form_file(entry: SyncEntry, is_force: boolean): void {
	const destination = path.join(josh_game_paths.PROJECT_ROOT, entry.dest)

	if (!existsSync(destination)) {
		copy_synced_file(entry, destination)
		console.info(`  ✔ synced   ${entry.dest}`)

		return
	}

	// Normalize EOLs so a CRLF working copy of an LF baseline isn't misread as edited (#375).
	const current = readFileSync(destination, 'utf8').replaceAll('\r\n', '\n')
	const incoming = readFileSync(sync_source_path(entry), 'utf8').replaceAll('\r\n', '\n')

	if (current === incoming) {
		console.info(`  ✔ checked  ${entry.dest} (up-to-date)`)

		return
	}

	if (is_force) {
		copy_synced_file(entry, destination)
		console.info(`  ✔ forced   ${entry.dest} (overwrote local changes)`)

		return
	}

	console.info(
		`  ⚠ skipped  ${entry.dest} (local changes; run \`josh-game sync --force\` to overwrite)`,
	)
}

function sync_managed_files(is_force: boolean): void {
	for (const entry of SYNC_FILES) {
		if (entry.free_form) sync_free_form_file(entry, is_force)
		else sync_file(entry)
	}
}

// `src/app.html` is a managed (unconditionally overwritten) entry and carries
// `%sveltekit.nonce%`, which SvelteKit refuses to render on a PRERENDERED page — a nonce has to
// change per request, so it hard-fails the build with "Cannot use prerendering if page template
// contains %sveltekit.nonce%". A consumer who prerenders a route therefore finds their build broken
// by a sync that touched no file of theirs, with nothing in the output pointing at the cause.
// Detecting it here turns that into a warning naming the file and the fix (#416).
// `true` AND `'auto'`: SvelteKit prerenders a route under either, so matching only `true` would let
// the `'auto'` half through silently — the failure mode this guard exists to prevent.
const PRERENDER_ENABLED_REGEX = /\bprerender\s*[=:]\s*(?:true\b|['"]auto['"])/u
const ROUTE_EXTENSIONS = new Set(['.ts', '.js', '.svelte'])

function is_route_source(name: string): boolean {
	return ROUTE_EXTENSIONS.has(path.extname(name))
}

// `project_root` is a parameter so the guard can be pointed at a fixture tree; production callers
// take the default.
function find_prerendering_routes(
	project_root: string = josh_game_paths.PROJECT_ROOT,
): ReadonlyArray<string> {
	const routes_directory = path.join(project_root, 'src', 'routes')
	if (!existsSync(routes_directory)) return []

	return readdirSync(routes_directory, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && is_route_source(entry.name))
		.map((entry) => path.join(entry.parentPath, entry.name))
		.filter((file) => PRERENDER_ENABLED_REGEX.test(readFileSync(file, 'utf8')))
		.map((file) => path.relative(project_root, file))
		.toSorted((left, right) => left.localeCompare(right))
}

function warn_prerender_nonce_conflict(): void {
	const routes = find_prerendering_routes()
	if (routes.length === 0) return

	const listed = routes.map((route) => `      ${route}`).join('\n')

	console.info(
		'\n  ⚠ src/app.html uses %sveltekit.nonce%, which cannot be prerendered, but these routes\n' +
			`      opt into prerendering:\n${listed}\n` +
			'      Your build will fail with "Cannot use prerendering if page template contains\n' +
			'      %sveltekit.nonce%". Drop prerendering on those routes to unblock it.\n' +
			'      Editing src/app.html is NOT a fix: it is a managed file this command overwrites on\n' +
			'      every run, so the change would be reverted on the next sync. If your project needs\n' +
			'      prerendering, open a game-kit issue — the shell has to change there, not here.',
	)
}

interface ConsumerPackage {
	scripts?: Record<string, string>
	dependencies?: Record<string, string>
	devDependencies?: Record<string, string>
	pnpm?: unknown
	[key: string]: unknown
}

// The Cloudflare managed-scripts (preview / prepare / prepare:* / gen / gen:pre) are no
// longer owned here: app-kit's `josh-app sync` overlay syncs them into the consumer's
// package.json (#357, app-kit#27). josh-game only manages the game-specific devDependencies
// below.

// A consumer that listed a managed dep under runtime `dependencies` (e.g. mnemecha with
// @threlte/core / three) must end up with it ONLY in devDependencies — never the same
// package in both sections with independently drifting ranges (#323). Split the runtime
// deps into the managed ones to relocate and the unrelated ones the consumer keeps.
function partition_runtime_required_deps(
	dependencies: Record<string, string>,
	required: Record<string, string>,
): { moved: Record<string, string>; remaining: Record<string, string> } {
	const moved: Record<string, string> = {}
	const remaining: Record<string, string> = {}

	for (const [key, value] of Object.entries(dependencies)) {
		if (Object.hasOwn(required, key)) moved[key] = value
		else remaining[key] = value
	}

	return { moved, remaining }
}

// Whether sync should write game-kit's canonical range over what the consumer has.
//
// Missing entries are filled, as they always were. An EXISTING pin is raised only when it sits
// below the floor game-kit declares in `peerDependencies` for that package — the synced templates
// are written against that floor, so a pin under it is not a preference to respect but a build
// break waiting for the next sync. Everything else is left exactly as the consumer set it: a pin
// at or above the floor still wins, so someone who upgraded a package ahead of game-kit is never
// downgraded, and a range we cannot read is never rewritten (see `version_range.is_below`).
function should_adopt_canonical_range(
	current: string | undefined,
	canonical: string,
	floor: string | undefined,
): boolean {
	if (current === undefined) return true
	if (floor === undefined) return false
	// Never trade a real pin for one we cannot read: `pick_required_deps` falls back to `*` for a
	// package game-kit does not itself depend on, and writing that over `^0.36.0` loses information.
	if (version_range.floor_of(canonical) === undefined) return false
	// Never adopt a canonical range that does not itself clear the floor. If a peerDependencies entry
	// is ever raised ahead of the matching devDependency, adopting would DOWNGRADE a consumer sitting
	// between the two and still leave them under the floor — rewriting package.json on every sync
	// without ever converging. Leaving the pin alone is the safe direction; the fix belongs in
	// game-kit's own manifest.
	if (version_range.is_below(canonical, floor)) return false

	return version_range.is_below(current, floor)
}

// Applies game-kit's canonical ranges per `should_adopt_canonical_range`. `floors` is game-kit's
// own `peerDependencies`: only a managed dep that also appears there carries a stated floor, which
// is exactly the set whose API the synced templates call into.
function did_apply_required_dependency_ranges(
	development_deps: Record<string, string>,
	required: Record<string, string>,
	floors: Record<string, string>,
): boolean {
	const adopted = Object.entries(required).filter(([key, canonical]) =>
		should_adopt_canonical_range(development_deps[key], canonical, floors[key]),
	)

	for (const [key, value] of adopted) development_deps[key] = value

	return adopted.length > 0
}

// Writes the reconciled `dependencies` back, dropping the field entirely when it has
// emptied out (so a move never leaves a bare `"dependencies": {}`). Mutates `package_`.
function reconcile_dependencies_field(
	package_: ConsumerPackage,
	dependencies: Record<string, string>,
): void {
	if (Object.keys(dependencies).length > 0) {
		package_.dependencies = dependencies

		return
	}

	delete package_.dependencies
}

// Mutates `package_` so every managed dep lives only in devDependencies. A managed dep
// already pinned under devDependencies keeps that range (it wins over the runtime copy).
function did_apply_managed_development_deps(
	package_: ConsumerPackage,
	required: Record<string, string>,
): boolean {
	const dependencies = package_.dependencies ?? {}
	const { moved, remaining } = partition_runtime_required_deps(dependencies, required)
	const development_deps = { ...moved, ...package_.devDependencies }
	const is_applied = did_apply_required_dependency_ranges(
		development_deps,
		required,
		josh_game_managed_development_deps.read_peer_floors_from_kit(),
	)

	package_.devDependencies = development_deps
	reconcile_dependencies_field(package_, remaining)

	return Object.keys(moved).length > 0 || is_applied
}

// pnpm >= 11 no longer reads the package.json `pnpm` field (settings live in
// pnpm-workspace.yaml) and WARNs on every command while it lingers. Once sync has
// written the workspace yaml, the legacy field is dead weight — remove it (#323).
function did_remove_legacy_pnpm_field(package_: ConsumerPackage): boolean {
	if (!('pnpm' in package_)) return false

	delete package_.pnpm

	return true
}

// Must run BEFORE pnpm so the preflight install picks up new devDeps (#184 self-heal).
function sync_managed_development_deps(): void {
	const package_path = path.join(josh_game_paths.PROJECT_ROOT, 'package.json')
	const raw = readFileSync(package_path, 'utf8')
	const package_ = JSON.parse(raw) as ConsumerPackage
	const required = josh_game_managed_development_deps.read_required_deps_from_kit()
	const is_dependencies_changed = did_apply_managed_development_deps(package_, required)
	const is_pnpm_removed = did_remove_legacy_pnpm_field(package_)

	if (!is_dependencies_changed && !is_pnpm_removed) {
		console.info('  ✔ checked  package.json devDependencies (up-to-date)')

		return
	}

	writeFileSync(package_path, `${JSON.stringify(package_, null, '\t')}\n`)
	console.info('  ✔ synced   package.json devDependencies')
}

// pnpm 11 runs an automatic deps-status check (= `pnpm install`) before any
// `pnpm <script>` invocation. If the consumer project's pnpm-workspace.yaml is
// outdated (e.g. missing the bare-name `@joshuafolkken/game-kit` entry in
// `minimumReleaseAgeExclude`), that pre-flight install fails the supply-chain
// policy and `pnpm josh sync` never executes — so the canonical sync that would
// have fixed the yaml never runs. Pre-syncing pnpm-workspace.yaml here breaks
// the chicken-and-egg by updating the file before pnpm is invoked.
function pre_sync_pnpm_workspace_yaml(): void {
	sync_file({ dest: 'pnpm-workspace.yaml' })
}

function is_josh_resolvable(): boolean {
	try {
		execSync('pnpm josh help', JOSH_PROBE_OPTIONS)

		return true
	} catch {
		return false
	}
}

// Delegate the framework + Cloudflare portion of the sync to app-kit's `josh-app sync`
// (= kit's `josh sync` base + the SvelteKit/CF overlay: managed scripts, app-shell seeds,
// cspell/tsconfig reconciliation). Guard first so a missing toolchain yields an actionable
// message and a non-zero exit, rather than an opaque pnpm error or a silent skip (#357).
function delegate_to_josh_app(): void {
	if (!is_josh_resolvable()) {
		console.error(JOSH_MISSING_MESSAGE)
		process.exit(1)
	}

	execSync('pnpm josh-app sync', SPAWN_OPTIONS)
}

function run(argument?: string): void {
	const is_force = argument === FORCE_FLAG

	console.info('\n🔄 josh-game sync\n')
	sync_managed_development_deps()
	pre_sync_pnpm_workspace_yaml()
	delegate_to_josh_app()
	// `josh sync` (run by josh-app) early-returns for missing configs (#184); `josh-app init`
	// is the canonical scaffolder + overlay and is idempotent on existing files, so it self-heals
	// a project scaffolded before this layer existed.
	execSync('pnpm josh-app init', SPAWN_OPTIONS)
	// josh-app never overwrites an existing eslint.config.js, so projects scaffolded before #260
	// keep a bare config that fails on the verbatim game templates. Rewrite it here so existing
	// projects pick up the src/lib/game/** lint overrides on the next sync.
	josh_game_eslint_config.write_eslint_config(josh_game_paths.PROJECT_ROOT)
	// Same self-heal for the bare cspell.config.yaml: rewrite it to pull the game-aware word set
	// from `@joshuafolkken/game-kit/cspell/game` so existing projects pass `josh cspell:dot` (#286).
	josh_game_cspell_config.write_cspell_config(josh_game_paths.PROJECT_ROOT)
	console.info('\nGame-specific files:')
	sync_managed_files(is_force)
	warn_prerender_nonce_conflict()
	console.info('\n✅ Done.\n')
}

const josh_game_sync = {
	run,
	apply_managed_dev_deps: did_apply_managed_development_deps,
	remove_legacy_pnpm_field: did_remove_legacy_pnpm_field,
	is_josh_resolvable,
	sync_free_form_file,
	find_prerendering_routes,
	// Exposed so the tsconfig-normalization contract test can assert tsconfig.json / app.d.ts are
	// never managed here (their reconciliation is delegated to the josh-app overlay, #357).
	SYNC_FILES,
}
export { josh_game_sync }
