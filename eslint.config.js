import { create_sveltekit_config } from '@joshuafolkken/kit/eslint/sveltekit'
import svelteConfig from './svelte.config.js'

// Permanent rule overrides — each conflicts with this project's tooling or domain.
const PERMANENT_OVERRIDES = {
	// Codebase uses `null` to mirror the DOM / Three.js / Web APIs it wraps.
	'unicorn/no-null': 'off',
	// Test it() bodies and async game-loop source are legitimately long by domain.
	'max-lines-per-function': 'off',
	'max-statements': 'off',
	'max-lines': 'off',
	// Inline `export const X = value` at the definition site reads better than file-bottom exports.
	'import/exports-last': 'off',
}

// The game engine (game-kit/) and the demo game (game/) have branchy game-loop / input /
// render / validation functions. Relax complexity ceilings above kit's defaults (5 / 4) for
// just those directories — the rest of the app keeps kit's stricter limits. 7 still catches
// genuinely tangled logic.
const GAME_COMPLEXITY_OVERRIDES = {
	files: ['src/lib/game-kit/**', 'src/lib/game/**'],
	rules: {
		complexity: ['error', 7],
		'sonarjs/cognitive-complexity': ['error', 7],
	},
}

// scripts/ (CLI tools, outside the tsconfig project) and templates/ (scaffolding linted by the
// consumer project after `jgame init`) are not type-checked here.
const FILE_IGNORES = ['scripts/**', 'templates/**']

export default create_sveltekit_config({
	gitignore_path: new URL('./.gitignore', import.meta.url),
	tsconfig_root_dir: import.meta.dirname,
	svelte_config: svelteConfig,
}).concat({ ignores: FILE_IGNORES }, { rules: PERMANENT_OVERRIDES }, GAME_COMPLEXITY_OVERRIDES)
