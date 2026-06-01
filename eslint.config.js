import { create_sveltekit_config } from '@joshuafolkken/kit/eslint/sveltekit'
import tseslint from 'typescript-eslint'
import svelteConfig from './svelte.config.js'

// Size-cap tiers (rationale + measurements in #250). Source caps apply globally; test files get a
// higher budget via TEST_SIZE_CAPS; genuine source outliers carry an inline eslint-disable instead.
const SIZE_CAPS = {
	source: { fn_lines: 50, fn_statements: 20, file_lines: 400 },
	test: { fn_lines: 130, fn_statements: 25, file_lines: 600 },
}

// Cohesive game-loop/render/input units run 6–7 decision points; game dirs raise the kit default of 5.
const GAME_COMPLEXITY = 7

function lines_cap(max) {
	return ['error', { max, skipBlankLines: true, skipComments: true }]
}

// Build the size-rule trio once so the source/test tiers differ only by their numbers.
function size_cap_rules(tier) {
	return {
		'max-lines-per-function': lines_cap(tier.fn_lines),
		'max-statements': ['error', tier.fn_statements],
		'max-lines': lines_cap(tier.file_lines),
	}
}

const PERMANENT_OVERRIDES = {
	// `null` is the consistent idiom for Three.js/Web-Audio/DOM contracts here (#232).
	'unicorn/no-null': 'off',
	// Project favours `export const X` at the definition site over bottom-hoisting (#248).
	'import/exports-last': 'off',
	// Source-tier size caps, applied globally (#250).
	...size_cap_rules(SIZE_CAPS.source),
}

// Game dirs raise the complexity cap (see GAME_COMPLEXITY).
const GAME_COMPLEXITY_OVERRIDES = {
	files: ['src/lib/game-kit/**', 'src/lib/game/**', 'templates/src/lib/game/**'],
	rules: {
		complexity: ['error', GAME_COMPLEXITY],
		'sonarjs/cognitive-complexity': ['error', GAME_COMPLEXITY],
	},
}

// Test files run long by nature (integration it() bodies, table-driven cases) — higher budget than source (#250).
const TEST_SIZE_CAPS = {
	files: ['**/*.test.ts', '**/*.spec.ts', '**/*.e2e.ts'],
	rules: size_cap_rules(SIZE_CAPS.test),
}

// templates/ tooling config (vite/svelte) — kit owns those rules.
const FILE_IGNORES = ['templates/**/*.config.*', 'scripts/__fixtures__/**']

// scripts/ (CLI) sit outside the SvelteKit tsconfig, so point ESLint at scripts/tsconfig.json for
// type-aware rules. no-duplicate-string + naming-convention off: path/fixture strings and Node/external
// names are inherent glue, not first-party smells (#240).
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

// templates/ is verbatim scaffolding. Type-aware-lint it against its own tsconfig (templates/tsconfig.json)
// so the same rules game-kit applies to its own src/ — including type-aware ones — catch the #260 class of
// destination-only bugs (no-unnecessary-type-assertion, no-unsafe-call, no-confusing-void-expression). The
// game-dir profile (null/exports-last/size/complexity) already reaches templates/src/lib/game/** via the
// PERMANENT_OVERRIDES and GAME_COMPLEXITY_OVERRIDES blocks — so no template-specific rules are needed here,
// only the project pointer. Resolution needs dist/ (the package self-import maps to dist/index.d.ts), CI builds
// before lint and local `josh lint` needs a prior `pnpm build`. Overriding only parserOptions keeps the
// kit's per-extension parsers (TS for .ts, svelte for .svelte) intact (#261).
const TEMPLATES_TYPED = {
	files: ['templates/**/*.ts', 'templates/**/*.svelte'],
	// hooks.server.ts reads ../package.json, which does not resolve in the templates project — keep it
	// non-type-aware below.
	ignores: ['templates/src/hooks.server.ts'],
	languageOptions: {
		parserOptions: {
			projectService: false,
			project: './templates/tsconfig.json',
			tsconfigRootDir: import.meta.dirname,
		},
	},
}

// hooks.server.ts stays non-type-aware: its `../package.json` import does not resolve here (#261).
const TEMPLATES_NON_TYPED = {
	files: ['templates/src/hooks.server.ts'],
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
	// Type-aware templates first, then carve hooks.server.ts back out as non-type-aware.
	TEMPLATES_TYPED,
	TEMPLATES_NON_TYPED,
	// After PERMANENT_OVERRIDES so test files reclaim the higher size budget.
	TEST_SIZE_CAPS,
	// Last: templates/src/lib/game/** also matches TEMPLATES_NON_TYPED, so this wins the complexity cap (#244).
	GAME_COMPLEXITY_OVERRIDES,
)
