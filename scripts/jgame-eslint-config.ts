import { writeFileSync } from 'node:fs'
import path from 'node:path'

// Single source of truth for the scaffold's eslint.config.js. Both `jgame init` (new projects)
// and `jgame sync` (existing projects self-heal) write this so they cannot drift (#260).
//
// `josh init` writes a bare create_sveltekit_config() into a scaffold. Game / Three.js / Web-Audio
// code legitimately uses null contracts, definition-site exports, and runs longer / more-branchy
// than UI glue, so the verbatim game templates trip the strict defaults. We relax those rules for
// src/lib/game/** only — the rest of the app keeps the strict caps.
const SCAFFOLD_ESLINT_CONFIG = `import { create_sveltekit_config } from '@joshuafolkken/kit/eslint/sveltekit'
import svelteConfig from './svelte.config.js'

const GAME_COMPLEXITY = 7
const GAME_FN_LINES = 50
const GAME_FN_STATEMENTS = 20
const GAME_FILE_LINES = 400

function lines_cap(max) {
	return ['error', { max, skipBlankLines: true, skipComments: true }]
}

// Game/Three.js/Web-Audio code uses null contracts and definition-site exports, and runs longer and
// more-branchy than UI glue. Relax these for src/lib/game/** only; the rest of the app stays strict.
const game_overrides = {
	files: ['src/lib/game/**'],
	rules: {
		'unicorn/no-null': 'off',
		'import/exports-last': 'off',
		'max-lines-per-function': lines_cap(GAME_FN_LINES),
		'max-statements': ['error', GAME_FN_STATEMENTS],
		'max-lines': lines_cap(GAME_FILE_LINES),
		complexity: ['error', GAME_COMPLEXITY],
		'sonarjs/cognitive-complexity': ['error', GAME_COMPLEXITY],
	},
}

export default create_sveltekit_config({
	gitignore_path: new URL('./.gitignore', import.meta.url),
	tsconfig_root_dir: import.meta.dirname,
	svelte_config: svelteConfig,
}).concat(game_overrides)
`

function generate_eslint_config(): string {
	return SCAFFOLD_ESLINT_CONFIG
}

function write_eslint_config(project_directory: string): void {
	writeFileSync(path.join(project_directory, 'eslint.config.js'), generate_eslint_config())
	console.info('  ✔ wrote    eslint.config.js (game-dir lint overrides)')
}

const jgame_eslint_config = { generate_eslint_config, write_eslint_config }
export { jgame_eslint_config }
