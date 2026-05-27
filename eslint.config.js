import { create_sveltekit_config } from '@joshuafolkken/kit/eslint/sveltekit'
import svelteConfig from './svelte.config.js'

// Post-kit-0.188.0 baseline (absorbed kit #416-419). The disables below silence
// the remaining violations so CI stays green; each entry has a Layer C follow-up
// PR planned to remove it.
const LAYER_B_DISABLES = {
	// === Permanent (rule + tooling conflict, not a code-quality choice) ===
	// `prefer-arrow-callback` rewrites `function () {}` → `() => {}` which breaks
	// `new`-constructibility (Audio mock regression). Always disabled.
	'prefer-arrow-callback': 'off',
	// `unicorn/no-useless-undefined` strips required-by-signature undefined args
	// (broke vi.stubGlobal / mockResolvedValue calls). Always disabled.
	'unicorn/no-useless-undefined': 'off',
	// `dot-notation` converts bracket access to dot access, but TS index-signature
	// types REQUIRE bracket access. Always disabled.
	'dot-notation': 'off',

	// === Layer C follow-up (high-volume manual refactor) ===
	'id-length': 'off',
	'unicorn/no-null': 'off',
	'import/exports-last': 'off',
	'no-restricted-syntax': 'off',
	'@typescript-eslint/no-magic-numbers': 'off',
	'@typescript-eslint/no-confusing-void-expression': 'off',
	'max-lines-per-function': 'off',
	'@typescript-eslint/naming-convention': 'off',
	'max-statements': 'off',
	'@typescript-eslint/explicit-function-return-type': 'off',
	'@typescript-eslint/no-empty-function': 'off',
	'prefer-const': 'off',
	'padding-line-between-statements': 'off',
	'@stylistic/padding-line-between-statements': 'off',
	'sonarjs/no-duplicate-string': 'off',
	'@typescript-eslint/explicit-module-boundary-types': 'off',
	'@typescript-eslint/promise-function-async': 'off',
	'sonarjs/cognitive-complexity': 'off',
	'@typescript-eslint/array-type': 'off',
	'@typescript-eslint/restrict-template-expressions': 'off',
	'@typescript-eslint/no-unnecessary-condition': 'off',
	'no-bitwise': 'off',
	complexity: 'off',
	'@typescript-eslint/consistent-type-assertions': 'off',
	'prefer-destructuring': 'off',
	'no-duplicate-imports': 'off',
	'@typescript-eslint/no-unnecessary-type-assertion': 'off',
	'@typescript-eslint/consistent-type-definitions': 'off',
	'max-params': 'off',
	'sonarjs/pseudo-random': 'off',
	'@typescript-eslint/unbound-method': 'off',
	'no-multi-assign': 'off',
	'no-console': 'off',
	'max-lines': 'off',
	'unicorn/prefer-add-event-listener': 'off',
	'sonarjs/no-use-of-empty-return-value': 'off',
	'unicorn/consistent-function-scoping': 'off',
	'@typescript-eslint/no-unsafe-call': 'off',
	'unicorn/filename-case': 'off',
	'unicorn/numeric-separators-style': 'off',
	'unicorn/prefer-query-selector': 'off',
	'sonarjs/no-commented-code': 'off',
	'@typescript-eslint/no-restricted-imports': 'off',
	'require-atomic-updates': 'off',
	'promise/prefer-await-to-then': 'off',
	'consistent-return': 'off',
	'no-plusplus': 'off',
	'default-case': 'off',
	'unicorn/no-array-reverse': 'off',
	'unicorn/prevent-abbreviations': 'off',
	'import/no-default-export': 'off',
}

// `scripts/` and `templates/` are not in any tsconfig project here:
// - scripts/ runs as one-off CLI tools (jgame, version-check) and ships compiled
// - templates/ is scaffolding source copied verbatim by `jgame init`; the destination
//   project lints it under its own tsconfig
// Tracked as Layer C follow-up (add a scripts tsconfig; restructure templates).
const FILE_IGNORES = ['scripts/**', 'templates/**']

// kit#424 workaround: `.svelte.test.ts` files are matched by SVELTE_FILE_PATTERNS.svelte
// in kit 0.188.0, which adds `projectService: true`. Kit's base config also sets
// `project: './tsconfig.json'`, and ESLint flat-config merges parserOptions — so the
// combined options trip typescript-eslint's "Enabling 'project' does nothing when
// 'projectService' is enabled" guard, which surfaces as a Parsing error and blocks
// further lint output for those files. Until kit#424 lands, override the parserOptions
// to use a stand-alone `project` (matching kit's base) — drops projectService entirely.
const KIT_424_WORKAROUND = {
	files: ['**/*.svelte.test.ts', '**/*.svelte.spec.ts'],
	languageOptions: {
		parserOptions: {
			projectService: false,
			project: './tsconfig.json',
			extraFileExtensions: [],
		},
	},
}

export default create_sveltekit_config({
	gitignore_path: new URL('./.gitignore', import.meta.url),
	tsconfig_root_dir: import.meta.dirname,
	svelte_config: svelteConfig,
}).concat({ ignores: FILE_IGNORES }, KIT_424_WORKAROUND, { rules: LAYER_B_DISABLES })
