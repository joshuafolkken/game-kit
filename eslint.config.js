import { create_sveltekit_config } from '@joshuafolkken/kit/eslint/sveltekit'
import tseslint from 'typescript-eslint'
import { eslint_game_overrides } from './eslint-game-overrides.js'
import svelteConfig from './svelte.config.js'

// The game-dir relaxation profile (null idiom #232, definition-site exports #248,
// size caps #250, complexity #244) is single-sourced with the scaffold generator
// (scripts/init/jgame-eslint-config.ts) so the two cannot drift (#261).
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

// unicorn@65's recommended set enables `prefer-https`, which false-positives on the SVG
// namespace literal `xmlns="http://www.w3.org/2000/svg"` — a canonical XML namespace
// identifier, not a fetchable URL (rewriting it to https breaks SVG rendering). Inline SVG
// is pervasive across the game-kit components, so disable repo-wide. The kit should ideally
// disable this upstream (parallel to the unicorn@65 checkDirectories fix in kit #528).
const PREFER_HTTPS_OFF = { rules: { 'unicorn/prefer-https': 'off' } }

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
const FILE_IGNORES = [
	'templates/**/*.config.*',
	'scripts/__fixtures__/**',
	'eslint-game-overrides.js',
]

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

// SvelteKit route files export page options as named consts (`export const ssr = false`); kit allows
// this via its `src/routes/**/+*.ts` route exception. The verbatim template mirrors live at
// templates/src/routes/** — outside that glob — so the same no-restricted-syntax relaxation is applied
// here, letting the template drop its eslint-disable (which the scaffold, where the file lands at
// src/routes/, reports as an unused directive) (#286).
const TEMPLATES_ROUTES = {
	files: ['templates/src/routes/**/+*.ts'],
	rules: { 'no-restricted-syntax': 'off' },
}

export default create_sveltekit_config({
	gitignore_path: new URL('./.gitignore', import.meta.url),
	tsconfig_root_dir: import.meta.dirname,
	svelte_config: svelteConfig,
}).concat(
	{ ignores: FILE_IGNORES },
	{ rules: PERMANENT_OVERRIDES },
	PREFER_HTTPS_OFF,
	SCRIPTS_TYPED,
	SCRIPTS_TESTS_UNTYPED_MOCKS,
	TEMPLATES_NON_TYPED,
	// After TEMPLATES_NON_TYPED so template route files keep the no-restricted-syntax relaxation.
	TEMPLATES_ROUTES,
	// After PERMANENT_OVERRIDES so test files reclaim the higher size budget.
	TEST_SIZE_CAPS,
	// Last: templates/src/lib/game/** also matches TEMPLATES_NON_TYPED, so this wins the complexity cap (#244).
	GAME_COMPLEXITY_OVERRIDES,
)
