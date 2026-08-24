import { create_sveltekit_config } from '@joshuafolkken/app-kit/eslint/sveltekit'
import tseslint from 'typescript-eslint'
import { eslint_game_overrides } from './eslint/game.js'
import svelteConfig from './svelte.config.js'

// The game-dir relaxation profile (null idiom #232, definition-site exports #248,
// size caps #250, complexity #244) lives in the distributable preset eslint/game.js
// (`@joshuafolkken/game-kit/eslint/game`). Both this config and the scaffold generator
// (scripts/init/josh-game-eslint-config.ts) source it from there so they cannot drift (#261, #368).
const { GAME_DIR_CAPS, lines_cap, game_idiom_rules, game_complexity_rules } = eslint_game_overrides

// Test files run long by nature (integration it() bodies, table-driven cases) — higher budget than the
// source game-dir caps (#250). This tier is game-kit-specific and not part of the shared profile.
const TEST_CAPS = { fn_lines: 130, fn_statements: 25, file_lines: 600 }

function size_cap_rules(caps) {
	return {
		'max-lines-per-function': lines_cap(caps.fn_lines),
		'max-statements': ['error', caps.fn_statements],
		'max-lines': lines_cap(caps.file_lines),
	}
}

// Source-tier idiom + size relaxations, applied globally (#250).
const PERMANENT_OVERRIDES = game_idiom_rules(GAME_DIR_CAPS)

// Game dirs raise the complexity cap above the kit default of 5 (#244).
const GAME_COMPLEXITY_OVERRIDES = {
	files: ['src/lib/game-kit/**', 'src/lib/game/**', 'templates/src/lib/game/**'],
	rules: game_complexity_rules(GAME_DIR_CAPS),
}

const TEST_SIZE_CAPS = {
	files: ['**/*.test.ts', '**/*.spec.ts', '**/*.e2e.ts'],
	rules: size_cap_rules(TEST_CAPS),
}

// templates/ tooling config (vite/svelte) — kit owns those rules. The shared
// game-dir profile is config-adjacent (like eslint.config.js itself, which kit
// already ignores via *.config.*) so it is not linted either (#261).
const FILE_IGNORES = ['templates/**/*.config.*', 'scripts/__fixtures__/**', 'eslint/game.js']

// scripts/ (CLI) sit outside the SvelteKit tsconfig, so point ESLint at scripts/tsconfig.json for
// type-aware rules. Rule relaxations live one tier down, on the test files that need them (#372).
const SCRIPTS_TYPED = {
	files: ['scripts/**/*.ts'],
	languageOptions: {
		parserOptions: {
			project: './scripts/tsconfig.json',
			tsconfigRootDir: import.meta.dirname,
		},
	},
}

// #240 relaxed these across all of scripts/ because path/fixture strings and Node/external names are
// inherent CLI glue. That reasoning holds, but the reports do not spread the way the glob assumed:
// 158 of 161 naming-convention reports and 68 of 69 duplicate-string reports come from test files,
// where `vi.mock` destructures Node's camelCase API (`readFileSync`, `execSync`), fixtures key objects
// by package specifier (`@sveltejs/kit`), and path literals repeat by the dozen. Applied to the whole
// tree the relaxation also stopped checking first-party names in the CLI source itself, so it is
// scoped to the tests that need it — the four source reports it had been hiding are fixed (#372).
const SCRIPTS_TESTS_EXTERNAL_NAMES = {
	files: ['scripts/**/*.test.ts'],
	rules: {
		'sonarjs/no-duplicate-string': 'off',
		'@typescript-eslint/naming-convention': 'off',
	},
}

// scripts/ tests inspect vi.mock / JSON.parse fixtures (inherently any-typed); source keeps full type-safety.
const SCRIPTS_TESTS_UNTYPED_MOCKS = {
	files: ['scripts/**/*.test.ts'],
	rules: {
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-base-to-string': 'off',
	},
}

// templates/ is verbatim scaffolding importing aliases that don't resolve in game-kit's tsconfig.
// Lint with type-checking disabled (like scripts/); type-aware coverage happens in the destination project.
const TEMPLATES_NON_TYPED = {
	files: ['templates/**/*.ts', 'templates/**/*.svelte'],
	...tseslint.configs.disableTypeChecked,
	languageOptions: {
		...tseslint.configs.disableTypeChecked.languageOptions,
		parserOptions: { project: false, projectService: false },
	},
}

// SvelteKit route files export page options as named consts (`export const ssr = false`). app-kit's
// preset scopes both `no-restricted-syntax` and `consistent-boolean-name` (the reserved ssr/csr/
// prerender names) for these — but only under live `src/routes/**`. The verbatim template mirrors
// live at templates/src/routes/** — outside that glob — so re-apply the same two relaxations here,
// letting the template drop its eslint-disable (which the scaffold, where the file lands at
// src/routes/, reports as an unused directive) (#286, #364). The ignore list mirrors app-kit's
// (unexported) SVELTEKIT_RESERVED_BOOLEAN_OPTIONS; exporting it from app-kit would single-source it.
const TEMPLATES_ROUTES = {
	files: ['templates/src/routes/**/+*.ts'],
	rules: {
		'no-restricted-syntax': 'off',
		'unicorn/consistent-boolean-name': ['error', { ignore: ['^ssr$', '^csr$', '^prerender$'] }],
	},
}

// app-kit 0.23.0 internalized the SvelteKit ESLint preset (app-kit#52), enabling unicorn/sonarjs
// rules that the #358 stop-gaps blanket-disabled. C2 (#364) removed those blanket disables: the
// consistent-boolean-name and no-top-level-assignment-in-function false positives were fixed at
// the source (boolean-name renames + closure-factory singletons, mirroring create_game_state),
// so only the genuinely-unfixable test-file relaxation below remains (#372 took the count from
// three to one).

// Test files assert exact, deterministic config constants via vitest matchers (`toBe(0.05)`), which
// `no-floating-point-equality` misreads as fragile float `===`; suppressing it any other way would
// force weaker assertions. It stays a config entry because it reports 49 times across 13 files — a
// generic vitest idiom rather than a game specific, so an app-kit preset uplift could absorb it and
// let this entry go (#372 phase 2).
//
// `no-trivial-assertions` (3 reports, 1 file) and `unicorn/no-global-object-property-assignment`
// (2 reports, 2 files) used to sit here too. At that volume a tree-wide `off` bought nothing a
// directive cannot, and it stopped either rule from catching a genuinely trivial assertion or an
// unintended global write anywhere else, so both moved to the call sites (#372).
const TEST_NEW_RULE_RELAXATIONS = {
	files: ['**/*.test.ts', '**/*.spec.ts', '**/*.e2e.ts', 'src/routes/e2e-helpers.ts'],
	rules: {
		'sonarjs/no-floating-point-equality': 'off',
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
	SCRIPTS_TESTS_EXTERNAL_NAMES,
	SCRIPTS_TESTS_UNTYPED_MOCKS,
	TEMPLATES_NON_TYPED,
	// After TEMPLATES_NON_TYPED so template route files keep the no-restricted-syntax relaxation.
	TEMPLATES_ROUTES,
	// After PERMANENT_OVERRIDES so test files reclaim the higher size budget.
	TEST_SIZE_CAPS,
	// Last: templates/src/lib/game/** also matches TEMPLATES_NON_TYPED, so this wins the complexity cap (#244).
	GAME_COMPLEXITY_OVERRIDES,
	// Test-file relaxations for generic vitest / browser-mock idioms (#358 → #364).
	TEST_NEW_RULE_RELAXATIONS,
)
