import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_cspell_config } from './jgame-cspell-config.ts'
import { jgame_eslint_config } from './jgame-eslint-config.ts'
import { jgame_managed_dev_deps as jgame_managed_development_deps } from './jgame-managed-development-deps.ts'
import { jgame_managed_scripts } from './jgame-managed-scripts.ts'
import { jgame_paths } from './jgame-paths.ts'
import { jgame_root_files } from './jgame-root-files.ts'

const SPAWN_OPTIONS = { stdio: 'inherit' as const }
// Resolvability probe: `josh help` exits 0 when the bin is reachable and non-zero
// otherwise. `ignore` keeps the probe silent so it does not pollute sync output.
const JOSH_PROBE_OPTIONS = { stdio: 'ignore' as const }

const FORCE_FLAG = '--force'
const JOSH_MISSING_MESSAGE =
	'\n❌ jgame sync: the `josh` command from @joshuafolkken/kit is not resolvable.\n' +
	'   Ensure @joshuafolkken/kit is installed (run `pnpm install`), then re-run `jgame sync`.\n'

interface SyncEntry {
	dest: string
	src?: string
}

// Files copied from templates/ to the project root on every `jgame sync` run.
// Scope: framework / app-shell config that should evolve with game-kit. Scaffold
// files that projects own and customize (src/lib/<game>/, src/routes/+page.svelte,
// static/branding, src/lib/game-config.ts) remain init-only. tsconfig.json is
// intentionally excluded because `pnpm josh init` owns the consumer's tsconfig.json
// (extends-only, reaching the kit base) — templates/tsconfig.json only type-checks
// the templates/ directory inside game-kit and must never reach consumers (#326).
//
// Consumer tsconfig NORMALIZATION is delegated to the `pnpm josh sync` step
// (delegate_to_josh_sync below), whose `sync_tsconfig` runs kit's
// `strip_redundant_compiler_options` against the kit base preset that game-kit
// consumers extend directly — dropping compilerOptions keys whose value equals the
// base while preserving genuine overrides (e.g. `noEmitOnError: false`), project
// keys, and `include`/`exclude` (kit #560, game-kit #333). game-kit layers no
// preset of its own, so the kit base is the correct comparison target and no
// game-kit-side strip is needed. Adding tsconfig.json here would shadow that strip
// with a verbatim copy and clobber consumer overrides — so it must stay excluded.
//
// `src` is used when the source filename inside templates/ must differ from the
// destination. .npmrc lives at templates/npmrc because npm always strips
// `.npmrc` from published packages regardless of the package.json `files` field.
// Byte-identical files (svelte.config.js, src/app.d.ts, src/routes/layout.css)
// are NOT in templates/: they are sourced directly from the package root via
// jgame_root_files — sync_file routes those to PACKAGE_DIR.
const SYNC_FILES: ReadonlyArray<SyncEntry> = [
	{ dest: '.npmrc', src: 'npmrc' },
	{ dest: 'src/app.d.ts' },
	{ dest: 'src/app.html' },
	{ dest: 'src/hooks.server.ts' },
	{ dest: 'src/routes/+layout.svelte' },
	{ dest: 'src/routes/layout.css' },
	{ dest: 'svelte.config.js' },
	{ dest: 'vite.config.ts' },
]

function sync_source_path(entry: SyncEntry): string {
	if (jgame_root_files.is_root_copy_file(entry.dest)) {
		return path.join(jgame_paths.PACKAGE_DIR, entry.dest)
	}

	return path.join(jgame_paths.TEMPLATES_DIR, entry.src ?? entry.dest)
}

function sync_file(entry: SyncEntry): void {
	const destination = path.join(jgame_paths.PROJECT_ROOT, entry.dest)

	mkdirSync(path.dirname(destination), { recursive: true })
	cpSync(sync_source_path(entry), destination)
	console.info(`  ✔ synced   ${entry.dest}`)
}

interface ConsumerPackage {
	scripts?: Record<string, string>
	dependencies?: Record<string, string>
	devDependencies?: Record<string, string>
	pnpm?: unknown
	[key: string]: unknown
}

// The pre-#272 scaffolder emitted this unconditional postinstall. It is superseded
// by the guarded `prepare`, so sync removes it — otherwise an existing consumer keeps
// running both (double `lefthook install` + `fix-gh-packages`) and the unguarded form
// survives. Exact-match only, so a consumer's own custom postinstall is never touched.
const SUPERSEDED_POSTINSTALL =
	'lefthook install && tsx node_modules/@joshuafolkken/kit/scripts/fix-gh-packages.ts'

function remove_superseded_scripts(scripts: Record<string, string>): boolean {
	if (scripts.postinstall !== SUPERSEDED_POSTINSTALL) return false

	delete scripts.postinstall

	return true
}

function apply_managed_scripts(
	package_: ConsumerPackage,
	canonical: Record<string, string>,
): boolean {
	const scripts = package_.scripts ?? {}
	let did_change = remove_superseded_scripts(scripts)

	for (const key of jgame_managed_scripts.MANAGED_SCRIPT_KEYS) {
		if (scripts[key] === canonical[key]) {
			continue
		}

		scripts[key] = canonical[key]
		did_change = true
	}

	package_.scripts = scripts

	return did_change
}

function sync_managed_scripts(): void {
	const package_path = path.join(jgame_paths.PROJECT_ROOT, 'package.json')
	const raw = readFileSync(package_path, 'utf8')
	const package_ = JSON.parse(raw) as ConsumerPackage
	const canonical = jgame_managed_scripts.read_canonical_scripts()
	const did_change = apply_managed_scripts(package_, canonical)

	if (!did_change) {
		console.info('  ✔ checked  package.json scripts (up-to-date)')

		return
	}

	writeFileSync(package_path, `${JSON.stringify(package_, null, '\t')}\n`)
	console.info('  ✔ synced   package.json scripts')
}

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

// Fills in only the missing entries with game-kit's canonical ranges. Preserves
// existing pins so consumers who upgraded individual packages are not downgraded.
function add_missing_required_deps(
	development_deps: Record<string, string>,
	required: Record<string, string>,
): boolean {
	const missing = Object.entries(required).filter(([key]) => !Object.hasOwn(development_deps, key))

	for (const [key, value] of missing) development_deps[key] = value

	return missing.length > 0
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
function apply_managed_development_deps(
	package_: ConsumerPackage,
	required: Record<string, string>,
): boolean {
	const dependencies = package_.dependencies ?? {}
	const { moved, remaining } = partition_runtime_required_deps(dependencies, required)
	const development_deps = { ...moved, ...package_.devDependencies }
	const isAdded = add_missing_required_deps(development_deps, required)

	package_.devDependencies = development_deps
	reconcile_dependencies_field(package_, remaining)

	return Object.keys(moved).length > 0 || isAdded
}

// pnpm >= 11 no longer reads the package.json `pnpm` field (settings live in
// pnpm-workspace.yaml) and WARNs on every command while it lingers. Once sync has
// written the workspace yaml, the legacy field is dead weight — remove it (#323).
function remove_legacy_pnpm_field(package_: ConsumerPackage): boolean {
	if (!('pnpm' in package_)) return false

	delete package_.pnpm

	return true
}

// Must run BEFORE pnpm so the preflight install picks up new devDeps (#184 self-heal).
function sync_managed_development_deps(): void {
	const package_path = path.join(jgame_paths.PROJECT_ROOT, 'package.json')
	const raw = readFileSync(package_path, 'utf8')
	const package_ = JSON.parse(raw) as ConsumerPackage
	const required = jgame_managed_development_deps.read_required_deps_from_kit()
	const isDependencies_changed = apply_managed_development_deps(package_, required)
	const isPnpm_removed = remove_legacy_pnpm_field(package_)

	if (!isDependencies_changed && !isPnpm_removed) {
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

// Delegate the kit-owned portion of the sync to `josh sync`. Guard first so a
// missing/unresolvable `josh` bin yields an actionable message and a non-zero
// exit, rather than an opaque pnpm error or a silent skip of kit-managed files.
// `--force` is forwarded so kit-owned files are overwritten too; josh sync reads
// `process.argv.includes('--force')` itself.
function delegate_to_josh_sync(): void {
	if (!is_josh_resolvable()) {
		console.error(JOSH_MISSING_MESSAGE)
		process.exit(1)
	}

	if (process.argv.includes(FORCE_FLAG)) {
		execSync('pnpm josh sync --force', SPAWN_OPTIONS)

		return
	}

	execSync('pnpm josh sync', SPAWN_OPTIONS)
}

function run(): void {
	console.info('\n🔄 jgame sync\n')
	sync_managed_development_deps()
	pre_sync_pnpm_workspace_yaml()
	delegate_to_josh_sync()
	// `josh sync` early-returns for missing configs (#184); `josh init` is the
	// canonical scaffolder and is idempotent on existing files.
	execSync('pnpm josh init --type sveltekit', SPAWN_OPTIONS)
	// `josh sync`/`josh init` never overwrite an existing eslint.config.js, so projects
	// scaffolded before #260 keep a bare config that fails on the verbatim game templates.
	// Rewrite it here (framework-generated, like svelte.config.js/vite.config.ts) so existing
	// projects pick up the src/lib/game/** lint overrides on the next sync.
	jgame_eslint_config.write_eslint_config(jgame_paths.PROJECT_ROOT)
	// Same self-heal for the bare cspell.config.yaml: rewrite it to pull the game-aware word set
	// from `@joshuafolkken/game-kit/cspell/game` so existing projects pass `josh cspell:dot` (#286).
	jgame_cspell_config.write_cspell_config(jgame_paths.PROJECT_ROOT)
	console.info('\nGame-specific files:')
	for (const entry of SYNC_FILES) sync_file(entry)
	sync_managed_scripts()
	console.info('\n✅ Done.\n')
}

const jgame_sync = {
	run,
	apply_managed_scripts,
	apply_managed_dev_deps: apply_managed_development_deps,
	remove_legacy_pnpm_field,
	is_josh_resolvable,
	// Exposed so the tsconfig-normalization contract test can assert tsconfig.json is
	// never managed here (its normalization is delegated to the josh sync step, #333).
	SYNC_FILES,
}
export { jgame_sync }
