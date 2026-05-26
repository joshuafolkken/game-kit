import { readFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_paths } from './jgame-paths.ts'

// devDependency keys that game-kit owns in every scaffolded project. Both
// `jgame init` (scaffolder) and `jgame sync` (updater) derive their canonical
// values from this list and from game-kit's own package.json so the two paths
// cannot drift. `eslint` / `prettier` / the prettier plugins are kit's own
// devDeps — they are NOT installed transitively for consumers, so they must be
// direct devDeps of the scaffolded project for the binaries / plugin resolution
// to work. See #184.
const REQUIRED_DEV_DEPS = [
	'@ianvs/prettier-plugin-sort-imports',
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
	'cspell',
	'eslint',
	'prettier',
	'prettier-plugin-svelte',
	'prettier-plugin-tailwindcss',
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

type RequiredDevDep = (typeof REQUIRED_DEV_DEPS)[number]

const WILDCARD_VERSION = '*'

function pick_required_deps(source: Record<string, string>): Record<string, string> {
	return Object.fromEntries(REQUIRED_DEV_DEPS.map((k) => [k, source[k] ?? WILDCARD_VERSION]))
}

function read_required_deps_from_kit(): Record<string, string> {
	const raw = readFileSync(path.join(jgame_paths.PACKAGE_DIR, 'package.json'), 'utf8')
	const pkg = JSON.parse(raw) as { devDependencies?: Record<string, string> }
	return pick_required_deps(pkg.devDependencies ?? {})
}

const jgame_managed_dev_deps = {
	REQUIRED_DEV_DEPS,
	pick_required_deps,
	read_required_deps_from_kit,
}

export { jgame_managed_dev_deps }
export type { RequiredDevDep }
