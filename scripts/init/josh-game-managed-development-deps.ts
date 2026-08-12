import { readFileSync } from 'node:fs'
import path from 'node:path'
import { josh_game_paths } from './josh-game-paths.ts'

// devDependency keys that game-kit owns in every scaffolded project. Both
// `josh-game init` (scaffolder) and `josh-game sync` (updater) derive their canonical
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
	'@joshuafolkken/app-kit',
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

type RequiredDevelopmentDependency = (typeof REQUIRED_DEV_DEPS)[number]

interface KitPackage {
	devDependencies?: Record<string, string>
	peerDependencies?: Record<string, string>
}

const WILDCARD_VERSION = '*'

// game-kit exact-pins some of its own devDeps (e.g. @joshuafolkken/kit, @playwright/test)
// for its internal toolchain, but consumers must receive caret ranges — an exact pin in a
// scaffolded package.json blocks patch/minor updates until a manual bump (#326). Exact
// versions start with a digit; anything else (^, ~, >=, *) is already a range and passes
// through untouched.
function to_caret_range(version: string): string {
	return /^\d/u.test(version) ? `^${version}` : version
}

function pick_required_deps(source: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		REQUIRED_DEV_DEPS.map((k) => [k, to_caret_range(source[k] ?? WILDCARD_VERSION)]),
	)
}

function read_kit_package(): KitPackage {
	const raw = readFileSync(path.join(josh_game_paths.PACKAGE_DIR, 'package.json'), 'utf8')

	return JSON.parse(raw) as KitPackage
}

function read_required_deps_from_kit(): Record<string, string> {
	return pick_required_deps(read_kit_package().devDependencies ?? {})
}

// game-kit's own `peerDependencies`, which state the minimum a consumer's install must satisfy for
// the SYNCED templates to work — `templates/src/hooks.server.ts` imports
// `@joshuafolkken/app-kit/security`, so a consumer below that floor gets a template their app-kit
// cannot resolve. `josh-game sync` raises a pin below one of these; every other managed dep keeps
// whatever the consumer set. Kept next to REQUIRED_DEV_DEPS because the two are read together.
function read_peer_floors_from_kit(): Record<string, string> {
	return read_kit_package().peerDependencies ?? {}
}

const josh_game_managed_development_deps = {
	REQUIRED_DEV_DEPS,
	pick_required_deps,
	read_required_deps_from_kit,
	read_peer_floors_from_kit,
}

export { josh_game_managed_development_deps as josh_game_managed_dev_deps }
export type { RequiredDevelopmentDependency as RequiredDevDep }
