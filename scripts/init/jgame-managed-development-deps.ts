import { readFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_paths } from './jgame-paths.ts'

// devDependency keys that game-kit owns in every scaffolded project. Both
// `jgame init` (scaffolder) and `jgame sync` (updater) derive their canonical
// values from this list and from game-kit's own package.json so the two paths
// cannot drift. `eslint` / `prettier` / the prettier plugins are kit's own
// devDeps — they are NOT installed transitively for consumers, so they must be
// direct devDeps of the scaffolded project for the binaries / plugin resolution
// to work. See #184. `lefthook` / `tsx` are required by the generated `prepare`
// script (`command -v lefthook ... && lefthook install`, `tsx fix-gh-packages.ts`);
// they are not installed transitively for consumers, so without them as direct
// devDeps the guards skip silently — losing git hooks and the GH Packages lockfile
// fix. See #272. The vitest browser-mode toolchain (`vitest`,
// `@vitest/browser-playwright`, `vitest-browser-svelte`, `@playwright/test`,
// `playwright`) backs the `test` block in the synced vite.config.ts — without
// these as direct devDeps `josh test:unit` cannot run in scaffolded projects.
// See #322.
const REQUIRED_DEV_DEPS = [
	'@ianvs/prettier-plugin-sort-imports',
	'@joshuafolkken/kit',
	'@playwright/test',
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
	'@vitest/browser-playwright',
	'cspell',
	'eslint',
	'lefthook',
	'playwright',
	'prettier',
	'prettier-plugin-svelte',
	'prettier-plugin-tailwindcss',
	'svelte',
	'svelte-check',
	'tailwindcss',
	'three',
	'tsx',
	'typescript',
	'vite',
	'vite-plugin-pwa',
	'vitest',
	'vitest-browser-svelte',
	'workbox-build',
	'workbox-window',
	'wrangler',
] as const

type RequiredDevelopmentDep = (typeof REQUIRED_DEV_DEPS)[number]

const WILDCARD_VERSION = '*'

function pick_required_deps(source: Record<string, string>): Record<string, string> {
	return Object.fromEntries(REQUIRED_DEV_DEPS.map((k) => [k, source[k] ?? WILDCARD_VERSION]))
}

function read_required_deps_from_kit(): Record<string, string> {
	const raw = readFileSync(path.join(jgame_paths.PACKAGE_DIR, 'package.json'), 'utf8')
	const package_ = JSON.parse(raw) as { devDependencies?: Record<string, string> }

	return pick_required_deps(package_.devDependencies ?? {})
}

const jgame_managed_development_deps = {
	REQUIRED_DEV_DEPS,
	pick_required_deps,
	read_required_deps_from_kit,
}

export { jgame_managed_development_deps as jgame_managed_dev_deps }
export type { RequiredDevelopmentDep as RequiredDevDep }
