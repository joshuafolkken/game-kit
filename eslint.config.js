import { create_sveltekit_config } from '@joshuafolkken/kit/eslint/sveltekit'
import svelteConfig from './svelte.config.js'

// Permanent rule disables — each conflicts with this project's tooling or domain.
const PERMANENT_DISABLES = {
	// Codebase uses `null` to mirror the DOM / Three.js / Web APIs it wraps.
	'unicorn/no-null': 'off',
	// Test it() bodies and async game-loop source are legitimately long / complex by domain.
	'max-lines-per-function': 'off',
	'max-statements': 'off',
	'sonarjs/cognitive-complexity': 'off',
	complexity: 'off',
	'max-lines': 'off',
	// Inline `export const X = value` at the definition site reads better than file-bottom exports.
	'import/exports-last': 'off',
}

// scripts/ (CLI tools, outside the tsconfig project) and templates/ (scaffolding linted by the
// consumer project after `jgame init`) are not type-checked here.
const FILE_IGNORES = ['scripts/**', 'templates/**']

export default create_sveltekit_config({
	gitignore_path: new URL('./.gitignore', import.meta.url),
	tsconfig_root_dir: import.meta.dirname,
	svelte_config: svelteConfig,
}).concat({ ignores: FILE_IGNORES }, { rules: PERMANENT_DISABLES })
