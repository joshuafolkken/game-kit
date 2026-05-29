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

const GAME_COMPLEXITY_OVERRIDES = {
	files: ['src/lib/game-kit/**', 'src/lib/game/**'],
	rules: {
		complexity: ['error', 7],
		'sonarjs/cognitive-complexity': ['error', 7],
	},
}

const FILE_IGNORES = ['templates/**']

// scripts/ (CLI tools) are not in the SvelteKit tsconfig project, so type-aware parsing
// would error. Lint them with type-checking disabled — structure/style rules still apply.
const SCRIPTS_NON_TYPED = {
	files: ['scripts/**/*.ts'],
	...tseslint.configs.disableTypeChecked,
	languageOptions: {
		...tseslint.configs.disableTypeChecked.languageOptions,
		parserOptions: { project: false, projectService: false },
	},
	rules: {
		...tseslint.configs.disableTypeChecked.rules,
		// These are dev-time CLI tools: invoking pnpm/git/node via PATH is their job, and
		// duplicated path/fixture strings in one-off scripts and their tests aren't a real smell.
		'sonarjs/no-os-command-from-path': 'off',
		'sonarjs/no-duplicate-string': 'off',
	},
}

export default create_sveltekit_config({
	gitignore_path: new URL('./.gitignore', import.meta.url),
	tsconfig_root_dir: import.meta.dirname,
	svelte_config: svelteConfig,
}).concat(
	{ ignores: FILE_IGNORES },
	{ rules: PERMANENT_OVERRIDES },
	GAME_COMPLEXITY_OVERRIDES,
	SCRIPTS_NON_TYPED,
)
