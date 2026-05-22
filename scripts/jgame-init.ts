import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_paths } from './jgame-paths.ts'

const SPAWN_OPTIONS = { stdio: 'inherit' as const }
const TSCONFIG_FILE_NAME = 'tsconfig.json'
// npm strips `.npmrc` from published packages regardless of the `files` field,
// so the template is shipped under a non-dotfile name and renamed on copy.
const NPMRC_SRC_NAME = 'npmrc'
const NPMRC_DEST_NAME = '.npmrc'

const USER_TSCONFIG = {
	extends: ['./.svelte-kit/tsconfig.json'],
	compilerOptions: {
		strict: true,
		allowJs: true,
		checkJs: true,
		esModuleInterop: true,
		forceConsistentCasingInFileNames: true,
		resolveJsonModule: true,
		skipLibCheck: true,
		sourceMap: true,
		moduleResolution: 'bundler',
		noEmitOnError: false,
	},
}

const REQUIRED_DEV_DEPS = [
	'@joshuafolkken/kit',
	'@sveltejs/adapter-cloudflare',
	'@sveltejs/kit',
	'@sveltejs/vite-plugin-svelte',
	'@tailwindcss/forms',
	'@tailwindcss/typography',
	'@tailwindcss/vite',
	'@threlte/core',
	'@threlte/extras',
	'@types/node',
	'@types/three',
	'@vite-pwa/sveltekit',
	'svelte',
	'svelte-check',
	'tailwindcss',
	'three',
	'typescript',
	'vite',
	'vite-plugin-pwa',
	'workbox-build',
	'workbox-window',
	'wrangler',
] as const

type GameKitPkg = {
	version: string
	devDependencies: Record<string, string>
	devEngines: unknown
	pnpm: { overrides: Record<string, string> }
}

type GameNames = {
	kebab: string
	display: string
	upper: string
	description: string
	app_label: string
}

function to_kebab(raw: string): string {
	return raw
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/^-+|-+$/g, '')
}

function build_done_msg(kebab: string): string {
	return [
		'\n✅ Done.',
		'',
		'Next steps:',
		`  cd ${kebab}`,
		`  gh repo create ${kebab} --private --source=. --push`,
		'  pnpm dev',
		'',
	].join('\n')
}

function to_display(kebab: string): string {
	return kebab
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

function derive_names(raw: string): GameNames {
	const kebab = to_kebab(raw)
	const display = to_display(kebab)
	const upper = display.toUpperCase()
	return { kebab, display, upper, description: `A ${display} game`, app_label: `${display} game` }
}

function read_game_kit_pkg(): GameKitPkg {
	const raw = readFileSync(path.join(jgame_paths.PACKAGE_DIR, 'package.json'), 'utf8')
	return JSON.parse(raw) as GameKitPkg
}

function pick_deps(all: Record<string, string>, keys: readonly string[]): Record<string, string> {
	return Object.fromEntries(keys.map((k) => [k, all[k] ?? '*']))
}

function build_scripts(): Record<string, string> {
	return {
		preinstall: 'pnpm dlx @aikidosec/safe-chain setup-ci',
		dev: 'vite dev',
		build: 'vite build',
		preview: 'vite preview',
		postinstall:
			'lefthook install && tsx node_modules/@joshuafolkken/kit/scripts/fix-gh-packages.ts',
		jgame: 'jgame',
		josh: 'josh',
	}
}

function build_package_json(pkg: GameKitPkg, game_name: string): object {
	return {
		name: game_name,
		version: '0.1.0',
		private: true,
		type: 'module',
		scripts: build_scripts(),
		dependencies: { '@joshuafolkken/game-kit': `^${pkg.version}` },
		devDependencies: pick_deps(pkg.devDependencies, REQUIRED_DEV_DEPS),
		devEngines: pkg.devEngines,
		pnpm: { overrides: pkg.pnpm.overrides },
	}
}

function generate_package_json(game_name: string): string {
	return JSON.stringify(build_package_json(read_game_kit_pkg(), game_name), null, '\t')
}

function generate_tsconfig(): string {
	return JSON.stringify(USER_TSCONFIG, null, '\t')
}

function generate_game_config(names: GameNames): string {
	return [
		`const GAME_NAME = '${names.kebab}'`,
		`const GAME_NAME_DISPLAY = '${names.display}'`,
		`const GAME_NAME_UPPER = '${names.upper}'`,
		`const GAME_DESCRIPTION = '${names.description}'`,
		`const GAME_APP_LABEL = '${names.app_label}'`,
		'',
		'const game_config = { GAME_NAME, GAME_NAME_DISPLAY, GAME_NAME_UPPER, GAME_DESCRIPTION, GAME_APP_LABEL }',
		'export { game_config }',
		'',
	].join('\n')
}

function write_package_json(game_name: string, project_dir: string): void {
	writeFileSync(path.join(project_dir, 'package.json'), generate_package_json(game_name))
	console.info('  ✔ wrote    package.json')
}

function write_tsconfig(project_dir: string): void {
	writeFileSync(path.join(project_dir, TSCONFIG_FILE_NAME), generate_tsconfig())
	console.info('  ✔ wrote    tsconfig.json')
}

function write_game_config(names: GameNames, project_dir: string): void {
	const dest = path.join(project_dir, 'src', 'lib', 'game-config.ts')
	writeFileSync(dest, generate_game_config(names))
	console.info('  ✔ wrote    src/lib/game-config.ts')
}

function should_copy_template(src: string): boolean {
	const name = path.basename(src)
	return name !== TSCONFIG_FILE_NAME && name !== NPMRC_SRC_NAME
}

function copy_templates(project_dir: string): void {
	cpSync(jgame_paths.TEMPLATES_DIR, project_dir, {
		recursive: true,
		filter: should_copy_template,
	})
	console.info('  ✔ copied   templates')
}

function write_npmrc(project_dir: string): void {
	const src = path.join(jgame_paths.TEMPLATES_DIR, NPMRC_SRC_NAME)
	const dest = path.join(project_dir, NPMRC_DEST_NAME)
	cpSync(src, dest)
	console.info(`  ✔ wrote    ${NPMRC_DEST_NAME}`)
}

function run(game_name_raw?: string): void {
	if (!game_name_raw) {
		console.error('Error: game name is required.\nUsage: jgame init <name>')
		process.exit(1)
	}
	const names = derive_names(game_name_raw)
	if (!names.kebab) {
		console.error(
			`Error: "${game_name_raw}" is not a valid game name. Use letters, numbers, and hyphens only (e.g. tic-tac-toe).`,
		)
		process.exit(1)
	}
	const project_dir = path.join(jgame_paths.PROJECT_ROOT, names.kebab)
	const opts = { ...SPAWN_OPTIONS, cwd: project_dir }
	console.info('\n🎮 jgame init — Scaffolding new game project\n')
	mkdirSync(project_dir, { recursive: true })
	write_package_json(names.kebab, project_dir)
	copy_templates(project_dir)
	write_npmrc(project_dir)
	write_game_config(names, project_dir)
	write_tsconfig(project_dir)
	execSync('git init', opts)
	execSync('pnpm install', opts)
	execSync('pnpm josh sync', opts)
	console.info(build_done_msg(names.kebab))
}

const jgame_init = {
	run,
	generate_package_json,
	generate_tsconfig,
	derive_names,
	generate_game_config,
}
export { jgame_init }
