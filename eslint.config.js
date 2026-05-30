import { create_sveltekit_config } from '@joshuafolkken/kit/eslint/sveltekit'
import tseslint from 'typescript-eslint'
import svelteConfig from './svelte.config.js'

const PERMANENT_OVERRIDES = {
	// Kept off deliberately: most nullable state here wraps Three.js / Web Audio / DOM null
	// contracts, so `null` is the consistent idiom. Switching to `undefined` would add `?? null`
	// boundary conversions at every Three.js/Web-Audio handoff and mix two idioms (see #232).
	'unicorn/no-null': 'off',
	'max-lines-per-function': 'off',
	'max-statements': 'off',
	'max-lines': 'off',
	'import/exports-last': 'off',
}

// Game-loop, rendering, and input functions are cohesive units that fragment poorly under
// the kit's default cap of 5: a physics step or audio scheduler naturally has 6–7 decision
// points without being logically separable. Cap raised to 7 for game dirs only.
const GAME_COMPLEXITY_OVERRIDES = {
	files: ['src/lib/game-kit/**', 'src/lib/game/**', 'templates/src/lib/game/**'],
	rules: {
		complexity: ['error', 7],
		'sonarjs/cognitive-complexity': ['error', 7],
	},
}

// templates/ tooling config stays ignored (vite/svelte config — kit owns those rules).
const FILE_IGNORES = ['templates/**/*.config.*', 'scripts/__fixtures__/**']

// scripts/ (CLI tools) live outside the SvelteKit tsconfig program, so the base config's
// `project: './tsconfig.json'` cannot type-check them. Point ESLint at a dedicated
// scripts/tsconfig.json so type-aware rules (no-floating-promises, no-unsafe-*, etc.) apply.
// The two sonarjs rules stay off: invoking pnpm/git/node via PATH is these CLI tools' job,
// and duplicated path/fixture strings in one-off scripts and their tests aren't a real smell.
const SCRIPTS_TYPED = {
	files: ['scripts/**/*.ts'],
	languageOptions: {
		parserOptions: {
			project: './scripts/tsconfig.json',
			tsconfigRootDir: import.meta.dirname,
		},
	},
	rules: {
		'sonarjs/no-os-command-from-path': 'off',
		'sonarjs/no-duplicate-string': 'off',
		// Node built-in imports (readFileSync, spawnSync, …), the `package_` reserved-word
		// workaround, and external object keys (package names, 'version:upgrade') are inherently
		// non-snake_case — this rule governs first-party identifiers, not third-party glue.
		'@typescript-eslint/naming-convention': 'off',
		// The project's mandatory `export { module }` namespace-object pattern means these
		// functions never use `this`, so referencing them unbound (e.g. in test spies) is safe.
		'@typescript-eslint/unbound-method': 'off',
	},
}

// scripts/ test files inspect vi.mock calls and JSON.parse untyped fixtures, which are
// inherently `any`-typed. The type-safety rules stay fully enforced on scripts SOURCE —
// only the mock-inspection noise in tests is relaxed here.
const SCRIPTS_TESTS_UNTYPED_MOCKS = {
	files: ['scripts/**/*.test.ts'],
	rules: {
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-base-to-string': 'off',
	},
}

// templates/ is verbatim scaffolding: it imports @joshuafolkken/game-kit and SvelteKit
// $app/$lib aliases that don't resolve in game-kit's own tsconfig project (type-aware
// parse error). Lint with type-checking disabled so structure/style rules still apply —
// the same approach as scripts/. Type-aware coverage happens in the destination project.
const TEMPLATES_NON_TYPED = {
	files: ['templates/**/*.ts', 'templates/**/*.svelte'],
	...tseslint.configs.disableTypeChecked,
	languageOptions: {
		...tseslint.configs.disableTypeChecked.languageOptions,
		parserOptions: { project: false, projectService: false },
	},
	rules: {
		...tseslint.configs.disableTypeChecked.rules,
	},
}

export default create_sveltekit_config({
	gitignore_path: new URL('./.gitignore', import.meta.url),
	tsconfig_root_dir: import.meta.dirname,
	svelte_config: svelteConfig,
}).concat(
	{ ignores: FILE_IGNORES },
	{ rules: PERMANENT_OVERRIDES },
	SCRIPTS_TYPED,
	SCRIPTS_TESTS_UNTYPED_MOCKS,
	TEMPLATES_NON_TYPED,
	// Must come last: templates/src/lib/game/** also matches TEMPLATES_NON_TYPED, so placing
	// GAME_COMPLEXITY_OVERRIDES after the NON_TYPED blocks guarantees the cap always wins
	// regardless of what future non-typed blocks do with the complexity family. (#244)
	GAME_COMPLEXITY_OVERRIDES,
)
