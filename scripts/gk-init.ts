import { execSync } from 'node:child_process'
import { cpSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { gk_paths } from './gk-paths.ts'

const SPAWN_OPTIONS = { stdio: 'inherit' as const }
const INIT_DONE_MSG = '\n✅ Done. Edit src/routes/+page.svelte to start building your game.\n'
const TSCONFIG_FILE_NAME = 'tsconfig.json'

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

function build_package_json(pkg: GameKitPkg): object {
	return {
		name: 'my-game',
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

function generate_package_json(): string {
	return JSON.stringify(build_package_json(read_game_kit_pkg()), null, '\t')
}

function generate_tsconfig(): string {
	return JSON.stringify(USER_TSCONFIG, null, '\t')
}

function write_package_json(): void {
	writeFileSync(path.join(gk_paths.PROJECT_ROOT, 'package.json'), generate_package_json())
	console.info('  ✔ wrote    package.json')
}

function write_tsconfig(): void {
	writeFileSync(path.join(gk_paths.PROJECT_ROOT, TSCONFIG_FILE_NAME), generate_tsconfig())
	console.info('  ✔ wrote    tsconfig.json')
}

function copy_templates(): void {
	cpSync(gk_paths.TEMPLATES_DIR, gk_paths.PROJECT_ROOT, {
		recursive: true,
		filter: (src: string) => !src.endsWith(TSCONFIG_FILE_NAME),
	})
	console.info('  ✔ copied   templates')
}

function run(): void {
	console.info('\n🎮 gk init — Scaffolding new game project\n')
	write_package_json()
	copy_templates()
	write_tsconfig()
	execSync('git init', SPAWN_OPTIONS)
	execSync('pnpm install', SPAWN_OPTIONS)
	execSync('pnpm josh sync', SPAWN_OPTIONS)
	console.info(INIT_DONE_MSG)
}

const gk_init = { run, generate_package_json, generate_tsconfig }
export { gk_init }
