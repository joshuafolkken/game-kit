import { writeFileSync } from 'node:fs'
import path from 'node:path'

// Single source of truth for the scaffold's cspell.config.yaml. Both `jgame init` (new
// projects) and `jgame sync` (existing projects self-heal) write this so they cannot drift.
//
// `josh init` writes a bare cspell.config.yaml that imports only `@joshuafolkken/kit/cspell/sveltekit`,
// so every game-template word (gameover, threlte, COEFF, …) and the credits proper nouns trip
// `josh cspell:dot` in the generated project. We override it to import
// `@joshuafolkken/game-kit/cspell/game` (the scaffold already depends on game-kit), which carries
// the game-common words and the credits ignore — they then flow on a dependency bump (#286). The
// user's own project-specific names stay in the empty `words` list for them to fill.
const SCAFFOLD_CSPELL_CONFIG = `version: '0.2'
import:
  - '@joshuafolkken/game-kit/cspell/game'
words: []
ignorePaths: []
`

function generate_cspell_config(): string {
	return SCAFFOLD_CSPELL_CONFIG
}

function write_cspell_config(project_directory: string): void {
	writeFileSync(path.join(project_directory, 'cspell.config.yaml'), generate_cspell_config())
	console.info('  ✔ wrote    cspell.config.yaml (game-aware words via @joshuafolkken/game-kit)')
}

const jgame_cspell_config = { generate_cspell_config, write_cspell_config }
export { jgame_cspell_config }
