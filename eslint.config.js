import { create_sveltekit_config } from '@joshuafolkken/kit/eslint/sveltekit'
import tseslint from 'typescript-eslint'
import svelteConfig from './svelte.config.js'

// Size-cap tiers. SOURCE_* are the whole-codebase defaults (set just above the bulk of source
// units so nothing splits now, but tight enough to catch regressions). TEST_* are the higher
// budget test files get back (see TEST_SIZE_CAPS). Genuine source outliers carry an inline
// eslint-disable rather than dragging the SOURCE_* caps up to their size. Re-measured #250.
const SOURCE_FN_LINES = 50
const SOURCE_FN_STATEMENTS = 20
const SOURCE_FILE_LINES = 400
const TEST_FN_LINES = 130
const TEST_FN_STATEMENTS = 25
const TEST_FILE_LINES = 600

// Game-loop / rendering / input units are cohesive and have 6–7 decision points without being
// logically separable, so the game dirs raise the kit's default complexity cap of 5 to this.
const GAME_COMPLEXITY = 7

// Both max-lines-per-function and max-lines take the same options object; build it once so the
// SOURCE/TEST tiers differ only by their max and stay visually comparable.
function lines_cap(max) {
	return ['error', { max, skipBlankLines: true, skipComments: true }]
}

const PERMANENT_OVERRIDES = {
	// Kept off deliberately: most nullable state here wraps Three.js / Web Audio / DOM null
	// contracts, so `null` is the consistent idiom. Switching to `undefined` would add `?? null`
	// boundary conversions at every Three.js/Web-Audio handoff and mix two idioms (see #232).
	'unicorn/no-null': 'off',
	// Kept off deliberately: the project favours `export const X = value` at the definition site
	// (constants/config declared next to their context) over hoisting every export to the file
	// bottom. Re-enabling would force unrelated reorders for a pure style change (see #248).
	'import/exports-last': 'off',
	// Re-enabled as numeric caps instead of 'off' (was off #248/#188; re-measured #250).
	// SOURCE-tier caps — see the SOURCE_*/TEST_* constants above for the tier rationale.
	'max-lines-per-function': lines_cap(SOURCE_FN_LINES),
	'max-statements': ['error', SOURCE_FN_STATEMENTS],
	'max-lines': lines_cap(SOURCE_FILE_LINES),
}

// Cap raised for game dirs only (see GAME_COMPLEXITY above for the rationale).
const GAME_COMPLEXITY_OVERRIDES = {
	files: ['src/lib/game-kit/**', 'src/lib/game/**', 'templates/src/lib/game/**'],
	rules: {
		complexity: ['error', GAME_COMPLEXITY],
		'sonarjs/cognitive-complexity': ['error', GAME_COMPLEXITY],
	},
}

// Test files run long by nature: integration-style it() bodies, table-driven case lists, and
// mock setup that doesn't factor out. They get a higher size budget than source so the source
// caps in PERMANENT_OVERRIDES stay meaningful. Caps set just above today's largest test units
// (function 128 lines, 23 statements, file 571 lines) so existing tests pass and worse ones flag (#250).
const TEST_SIZE_CAPS = {
	files: ['**/*.test.ts', '**/*.spec.ts', '**/*.e2e.ts'],
	rules: {
		'max-lines-per-function': lines_cap(TEST_FN_LINES),
		'max-statements': ['error', TEST_FN_STATEMENTS],
		'max-lines': lines_cap(TEST_FILE_LINES),
	},
}

// templates/ tooling config stays ignored (vite/svelte config — kit owns those rules).
const FILE_IGNORES = ['templates/**/*.config.*', 'scripts/__fixtures__/**']

// scripts/ (CLI tools) live outside the SvelteKit tsconfig program, so the base config's
// `project: './tsconfig.json'` cannot type-check them. Point ESLint at a dedicated
// scripts/tsconfig.json so type-aware rules (no-floating-promises, no-unsafe-*, etc.) apply.
// sonarjs/no-duplicate-string stays off here: duplicated path/fixture strings in one-off
// scripts and their tests aren't a real smell. (no-os-command-from-path and unbound-method
// used to live here too, but kit 0.199.0 moved them into its shared scripts block — #442.)
const SCRIPTS_TYPED = {
	files: ['scripts/**/*.ts'],
	languageOptions: {
		parserOptions: {
			project: './scripts/tsconfig.json',
			tsconfigRootDir: import.meta.dirname,
		},
	},
	rules: {
		'sonarjs/no-duplicate-string': 'off',
		// Node built-in imports (readFileSync, spawnSync, …), the `package_` reserved-word
		// workaround, and external object keys (package names, 'version:upgrade') are inherently
		// non-snake_case — this rule governs first-party identifiers, not third-party glue.
		'@typescript-eslint/naming-convention': 'off',
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
	// Spread disableTypeChecked once for its rule set; re-spread its languageOptions so we keep
	// its parser settings while pinning parserOptions fully off (no project / projectService).
	// (The previous explicit `rules: { ...disableTypeChecked.rules }` just re-copied what the
	// top-level spread already provides, so it was redundant and has been dropped.)
	...tseslint.configs.disableTypeChecked,
	languageOptions: {
		...tseslint.configs.disableTypeChecked.languageOptions,
		parserOptions: { project: false, projectService: false },
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
	// Must come after PERMANENT_OVERRIDES (the source-tier caps apply globally, including to test
	// files) so test files get their higher size budget back.
	TEST_SIZE_CAPS,
	// Must come last: templates/src/lib/game/** also matches TEMPLATES_NON_TYPED, so placing
	// GAME_COMPLEXITY_OVERRIDES after the NON_TYPED blocks guarantees the cap always wins
	// regardless of what future non-typed blocks do with the complexity family. (#244)
	GAME_COMPLEXITY_OVERRIDES,
)
