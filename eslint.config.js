import { create_sveltekit_config } from '@joshuafolkken/kit/eslint/sveltekit'
import svelteConfig from './svelte.config.js'

// Permanent rule disables — each rule conflicts with this project's tooling or domain
// patterns in a way that cannot be resolved by code changes alone. All Layer C follow-up
// PRs (#191-#217) have been shipped; these are the entries that survived the migration.
// See issue #188 for the full migration history.
//
// Note: `prefer-arrow-callback`, `unicorn/no-useless-undefined`,
// `sonarjs/no-use-of-empty-return-value`, and the project-wide
// `unicorn/prevent-abbreviations` allowList previously lived here but were moved
// into kit (issues #432-435, kit 0.196.0) and removed from this file.
const PERMANENT_DISABLES = {
	// `dot-notation` converts bracket access to dot access, but TS index-signature
	// types REQUIRE bracket access. Always disabled.
	'dot-notation': 'off',
	// `unicorn/no-null` prefers `undefined`, but this codebase deliberately uses `null`
	// to mirror the DOM / Three.js / Web APIs it wraps (Element | null, AudioContext |
	// null, CanvasTexture | null, Three.js texture uniforms `{ value: null }`, Response
	// body, document.fullscreenElement / pointerLockElement). Forcing `undefined` would
	// add boundary-conversion noise plus ~15 external-API inline disables for a pure
	// style change. Always disabled.
	'unicorn/no-null': 'off',

	// `max-lines-per-function`, `max-statements`, `sonarjs/cognitive-complexity`, `complexity`,
	// and `max-lines` all fight this codebase's patterns:
	// - Test `it()` bodies legitimately span 20-40 lines (setup → act → multiple assertions);
	//   splitting them into smaller functions hurts readability without a quality gain.
	// - Async game-loop source (VirtualJoystick touch handling, flash sequences, Player.svelte
	//   coroutines) is naturally high-statement and cognitively complex by domain — not a sign
	//   of poor design.
	// - Whole-file size limits conflict with large test suites that must live in one file for
	//   shared setup (GameScene, Input, VirtualJoystick, crt-dither).
	// Always disabled.
	'max-lines-per-function': 'off',
	'max-statements': 'off',
	'sonarjs/cognitive-complexity': 'off',
	complexity: 'off',
	'max-lines': 'off',

	// `import/exports-last` requires all exports to be at the bottom of the file.
	// This fights the project's readable pattern of `export const X = value` near the
	// definition site (e.g., exported constants at the top of config files alongside
	// their context). Forcing 58+ exports to the file bottom would harm readability
	// without a correctness gain. Always disabled.
	'import/exports-last': 'off',
}

// `scripts/` and `templates/` are not in any tsconfig project here:
// - scripts/ runs as one-off CLI tools (jgame, version-check) and ships compiled
// - templates/ is scaffolding source copied verbatim by `jgame init`; the destination
//   project lints it under its own tsconfig
// Tracked as Layer C follow-up (add a scripts tsconfig; restructure templates).
const FILE_IGNORES = ['scripts/**', 'templates/**']

export default create_sveltekit_config({
	gitignore_path: new URL('./.gitignore', import.meta.url),
	tsconfig_root_dir: import.meta.dirname,
	svelte_config: svelteConfig,
}).concat({ ignores: FILE_IGNORES }, { rules: PERMANENT_DISABLES })
