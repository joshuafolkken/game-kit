import { execSync } from 'node:child_process'
import { cpSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { gk_paths } from './gk-paths.ts'

const SPAWN_OPTIONS = { stdio: 'inherit' as const }
const INIT_DONE_MSG = '\n✅ Done. Edit src/routes/+page.svelte to start building your game.\n'
const TSCONFIG_FILE_NAME = 'tsconfig.json'
const DEFAULT_GAME_NAME = 'game-kit'

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
	return (
		raw
			.toLowerCase()
			.trim()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '')
			.replace(/^-+|-+$/g, '') || DEFAULT_GAME_NAME
	)
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
	const raw = readFileSync(path.join(gk_paths.PACKAGE_DIR, 'package.json'), 'utf8')
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
		gk: 'gk',
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

function write_package_json(game_name: string): void {
	writeFileSync(path.join(gk_paths.PROJECT_ROOT, 'package.json'), generate_package_json(game_name))
	console.info('  ✔ wrote    package.json')
}

function write_tsconfig(): void {
	writeFileSync(path.join(gk_paths.PROJECT_ROOT, TSCONFIG_FILE_NAME), generate_tsconfig())
	console.info('  ✔ wrote    tsconfig.json')
}

function write_game_config(names: GameNames): void {
	const dest = path.join(gk_paths.PROJECT_ROOT, 'src', 'lib', 'game-config.ts')
	writeFileSync(dest, generate_game_config(names))
	console.info('  ✔ wrote    src/lib/game-config.ts')
}

function copy_templates(): void {
	cpSync(gk_paths.TEMPLATES_DIR, gk_paths.PROJECT_ROOT, {
		recursive: true,
		filter: (src: string) => !src.endsWith(TSCONFIG_FILE_NAME),
	})
	console.info('  ✔ copied   templates')
}

function run(game_name_raw?: string): void {
	console.info('\n🎮 gk init — Scaffolding new game project\n')
	const names = derive_names(game_name_raw ?? DEFAULT_GAME_NAME)
	write_package_json(names.kebab)
	copy_templates()
	write_game_config(names)
	write_tsconfig()
	execSync('git init', SPAWN_OPTIONS)
	execSync('pnpm install', SPAWN_OPTIONS)
	execSync('pnpm josh sync', SPAWN_OPTIONS)
	console.info(INIT_DONE_MSG)
}

const gk_init = {
	run,
	generate_package_json,
	generate_tsconfig,
	derive_names,
	generate_game_config,
}
export { gk_init }
