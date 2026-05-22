import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_managed_scripts } from './jgame-managed-scripts.ts'
import { jgame_paths } from './jgame-paths.ts'

const SPAWN_OPTIONS = { stdio: 'inherit' as const }

type SyncEntry = { dest: string; src?: string }

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
const SYNC_FILES: readonly SyncEntry[] = [
	{ dest: '.npmrc', src: 'npmrc' },
	{ dest: 'src/app.d.ts' },
	{ dest: 'src/app.html' },
	{ dest: 'src/hooks.server.ts' },
	{ dest: 'src/routes/+layout.svelte' },
	{ dest: 'src/routes/layout.css' },
	{ dest: 'svelte.config.js' },
	{ dest: 'vite.config.ts' },
]

function sync_file(entry: SyncEntry): void {
	const src = path.join(jgame_paths.TEMPLATES_DIR, entry.src ?? entry.dest)
	const dest = path.join(jgame_paths.PROJECT_ROOT, entry.dest)
	mkdirSync(path.dirname(dest), { recursive: true })
	cpSync(src, dest)
	console.info(`  ✔ synced   ${entry.dest}`)
}

type ConsumerPkg = { scripts?: Record<string, string>; [key: string]: unknown }

function apply_managed_scripts(pkg: ConsumerPkg, canonical: Record<string, string>): boolean {
	const scripts = pkg.scripts ?? {}
	let did_change = false
	for (const key of jgame_managed_scripts.MANAGED_SCRIPT_KEYS) {
		if (scripts[key] !== canonical[key]) {
			scripts[key] = canonical[key]
			did_change = true
		}
	}
	pkg.scripts = scripts
	return did_change
}

function sync_managed_scripts(): void {
	const pkg_path = path.join(jgame_paths.PROJECT_ROOT, 'package.json')
	const raw = readFileSync(pkg_path, 'utf8')
	const pkg = JSON.parse(raw) as ConsumerPkg
	const canonical = jgame_managed_scripts.read_canonical_scripts()
	const did_change = apply_managed_scripts(pkg, canonical)
	if (!did_change) {
		console.info('  ✔ checked  package.json scripts (up-to-date)')
		return
	}
	writeFileSync(pkg_path, `${JSON.stringify(pkg, null, '\t')}\n`)
	console.info('  ✔ synced   package.json scripts')
}

function run(): void {
	console.info('\n🔄 jgame sync\n')
	execSync('pnpm josh sync', SPAWN_OPTIONS)
	console.info('\nGame-specific files:')
	for (const entry of SYNC_FILES) sync_file(entry)
	sync_managed_scripts()
	console.info('\n✅ Done.\n')
}

const jgame_sync = { run, apply_managed_scripts }
export { jgame_sync }
