import { execSync } from 'node:child_process'
import { cpSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { jgame_paths } from './jgame-paths.ts'

const SPAWN_OPTIONS = { stdio: 'inherit' as const }

// Files copied from templates/ to the project root on every `jgame sync` run.
// Scope: framework / app-shell config that should evolve with game-kit. Scaffold
// files that projects own and customize (src/lib/<game>/, src/routes/+page.svelte,
// static/branding, src/lib/game-config.ts) remain init-only. tsconfig.json is
// intentionally excluded because jgame init writes it via write_tsconfig
// (USER_TSCONFIG) rather than copying templates/tsconfig.json — syncing the
// template here would silently override that generated form.
const SYNC_FILES = [
	'.npmrc',
	'src/app.d.ts',
	'src/app.html',
	'src/hooks.server.ts',
	'src/routes/+layout.svelte',
	'src/routes/layout.css',
	'svelte.config.js',
	'vite.config.ts',
] as const

function sync_file(relative_path: string): void {
	const src = path.join(jgame_paths.TEMPLATES_DIR, relative_path)
	const dest = path.join(jgame_paths.PROJECT_ROOT, relative_path)
	mkdirSync(path.dirname(dest), { recursive: true })
	cpSync(src, dest)
	console.info(`  ✔ synced   ${relative_path}`)
}

function run(): void {
	console.info('\n🔄 jgame sync\n')
	execSync('pnpm josh sync', SPAWN_OPTIONS)
	console.info('\nGame-specific files:')
	for (const file of SYNC_FILES) sync_file(file)
	console.info('\n✅ Done.\n')
}

const jgame_sync = { run }
export { jgame_sync }
