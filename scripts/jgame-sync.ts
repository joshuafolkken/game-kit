import { execSync } from 'node:child_process'
import { cpSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { jgame_paths } from './jgame-paths.ts'

const SPAWN_OPTIONS = { stdio: 'inherit' as const }

const SYNC_FILES = ['src/routes/+layout.svelte', 'src/routes/layout.css'] as const

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
