import { writeFileSync } from 'node:fs'
import path from 'node:path'

// Single source of truth for the scaffold's eslint.config.js. Both `jgame init` (new projects)
// and `jgame sync` (existing projects self-heal) write this so they cannot drift (#260).
//
// The generated config delegates to game-kit's distributable preset
// (`@joshuafolkken/game-kit/eslint/game` → `create_game_config`), which wraps app-kit's
// SvelteKit preset and appends the game-dir relaxations scoped to `src/lib/game/**`.
// Because the rules and caps now live entirely inside the shipped preset, the scaffold no
// longer carries them — game-kit's own lint and every scaffold share one source, so they
// cannot drift (#261, #368). Scaffolds already depend on `@joshuafolkken/game-kit` and carry
// `@joshuafolkken/app-kit` as a managed devDep, so both imports resolve downstream.
const SCAFFOLD_ESLINT_CONFIG = `import { create_game_config } from '@joshuafolkken/game-kit/eslint/game'
import svelteConfig from './svelte.config.js'

export default create_game_config({
	gitignore_path: new URL('./.gitignore', import.meta.url),
	tsconfig_root_dir: import.meta.dirname,
	svelte_config: svelteConfig,
})
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
