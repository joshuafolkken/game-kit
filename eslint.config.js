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
	// `sonarjs/no-use-of-empty-return-value` fires on Svelte `{@render snippet()}` —
	// the rule treats the snippet call as a value-consuming expression, but `@render`
	// is a template directive. Per-line disables on every snippet site is noisier.
	'sonarjs/no-use-of-empty-return-value': 'off',

	// === Layer C follow-up (high-volume manual refactor) ===
	'id-length': 'off',
	'unicorn/no-null': 'off',
	'import/exports-last': 'off',
	'no-restricted-syntax': 'off',
	'max-lines-per-function': 'off',
	'@typescript-eslint/naming-convention': 'off',
	'max-statements': 'off',
	'sonarjs/cognitive-complexity': 'off',
	complexity: 'off',
	'max-lines': 'off',
}

// `scripts/` and `templates/` are not in any tsconfig project here:
// - scripts/ runs as one-off CLI tools (jgame, version-check) and ships compiled
// - templates/ is scaffolding source copied verbatim by `jgame init`; the destination
//   project lints it under its own tsconfig
// Tracked as Layer C follow-up (add a scripts tsconfig; restructure templates).
const FILE_IGNORES = ['scripts/**', 'templates/**']

// Kit 0.189 ships `unicorn/prevent-abbreviations` allowList inside SVELTE_FILE_PATTERNS.svelte,
// but plain `.ts` files (non-Svelte) don't inherit it. Re-apply the same allowList project-wide
// so idiomatic short names (e, el, ctx, btn, idx, etc.) don't fire in CLI helpers, hash utilities,
// or e2e tests. Also adds `e2e` so Playwright filename convention (page.e2e.ts) doesn't get
// expanded to absurd `page.error2error.ts`.
const PREVENT_ABBREVIATIONS_OVERRIDE = {
	'unicorn/prevent-abbreviations': [
		'error',
		{
			allowList: {
				Props: true,
				e: true,
				e2e: true,
				el: true,
				ctx: true,
				btn: true,
				idx: true,
				opts: true,
				params: true,
				args: true,
			},
		},
	],
}

export default create_sveltekit_config({
	gitignore_path: new URL('./.gitignore', import.meta.url),
	tsconfig_root_dir: import.meta.dirname,
	svelte_config: svelteConfig,
}).concat(
	{ ignores: FILE_IGNORES },
	{ rules: LAYER_B_DISABLES },
	{ rules: PREVENT_ABBREVIATIONS_OVERRIDE },
)
