import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_eslint_config } from './jgame-eslint-config.ts'
import { jgame_managed_dev_deps as jgame_managed_development_deps } from './jgame-managed-development-deps.ts'
import { jgame_managed_scripts } from './jgame-managed-scripts.ts'
import { jgame_paths } from './jgame-paths.ts'
import { jgame_root_files } from './jgame-root-files.ts'

const SPAWN_OPTIONS = { stdio: 'inherit' as const }

interface SyncEntry {
	dest: string
	src?: string
}

// Files copied from templates/ to the project root on every `jgame sync` run.
// Scope: framework / app-shell config that should evolve with game-kit. Scaffold
// files that projects own and customize (src/lib/<game>/, src/routes/+page.svelte,
// static/branding, src/lib/game-config.ts) remain init-only. tsconfig.json is
// intentionally excluded because jgame init writes it via write_tsconfig
// (USER_TSCONFIG) rather than copying templates/tsconfig.json — syncing the
// template here would silently override that generated form.
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
	devDependencies?: Record<string, string>
	[key: string]: unknown
}

function apply_managed_scripts(
	package_: ConsumerPackage,
	canonical: Record<string, string>,
): boolean {
	const scripts = package_.scripts ?? {}
	let did_change = false

	for (const key of jgame_managed_scripts.MANAGED_SCRIPT_KEYS) {
		if (scripts[key] !== canonical[key]) {
			scripts[key] = canonical[key]
			did_change = true
		}
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

// Preserves existing pins so consumers who upgraded individual packages are not
// silently downgraded — only fills in missing entries. Mutates `pkg`.
function apply_managed_development_deps(
	package_: ConsumerPackage,
	required: Record<string, string>,
): boolean {
	const existing = package_.devDependencies ?? {}
	const missing = Object.entries(required).filter(([key]) => !(key in existing))

	if (missing.length === 0) {
		package_.devDependencies = existing

		return false
	}

	package_.devDependencies = { ...existing, ...Object.fromEntries(missing) }

	return true
}

// Must run BEFORE pnpm so the preflight install picks up new devDeps (#184 self-heal).
function sync_managed_development_deps(): void {
	const package_path = path.join(jgame_paths.PROJECT_ROOT, 'package.json')
	const raw = readFileSync(package_path, 'utf8')
	const package_ = JSON.parse(raw) as ConsumerPackage
	const required = jgame_managed_development_deps.read_required_deps_from_kit()
	const did_change = apply_managed_development_deps(package_, required)

	if (!did_change) {
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

function run(): void {
	console.info('\n🔄 jgame sync\n')
	sync_managed_development_deps()
	pre_sync_pnpm_workspace_yaml()
	execSync('pnpm josh sync', SPAWN_OPTIONS)
	// `josh sync` early-returns for missing configs (#184); `josh init` is the
	// canonical scaffolder and is idempotent on existing files.
	execSync('pnpm josh init --type sveltekit', SPAWN_OPTIONS)
	// `josh sync`/`josh init` never overwrite an existing eslint.config.js, so projects
	// scaffolded before #260 keep a bare config that fails on the verbatim game templates.
	// Rewrite it here (framework-generated, like svelte.config.js/vite.config.ts) so existing
	// projects pick up the src/lib/game/** lint overrides on the next sync.
	jgame_eslint_config.write_eslint_config(jgame_paths.PROJECT_ROOT)
	console.info('\nGame-specific files:')
	for (const entry of SYNC_FILES) sync_file(entry)
	sync_managed_scripts()
	console.info('\n✅ Done.\n')
}

const jgame_sync = {
	run,
	apply_managed_scripts,
	apply_managed_dev_deps: apply_managed_development_deps,
}
export { jgame_sync }
