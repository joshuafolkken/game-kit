import { create_sveltekit_config } from '@joshuafolkken/kit/eslint/sveltekit'
import svelteConfig from './svelte.config.js'

const PERMANENT_OVERRIDES = {
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

const FILE_IGNORES = ['scripts/**', 'templates/**']

export default create_sveltekit_config({
	gitignore_path: new URL('./.gitignore', import.meta.url),
	tsconfig_root_dir: import.meta.dirname,
	svelte_config: svelteConfig,
}).concat({ ignores: FILE_IGNORES }, { rules: PERMANENT_OVERRIDES }, GAME_COMPLEXITY_OVERRIDES)
