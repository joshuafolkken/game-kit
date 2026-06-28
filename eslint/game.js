// Distributable game-app ESLint preset: `@joshuafolkken/game-kit/eslint/game`.
//
// Single source of truth for the game-dir relaxation profile. Consumed by:
//   - game-kit's own eslint.config.js (relative import; applies the idiom/size
//     parts repo-wide because the whole repo is game code),
//   - the scaffold generator (scripts/init/jgame-eslint-config.ts), which emits a
//     consumer eslint.config.js that imports `create_game_config` from here, and
//   - downstream scaffolds (waneccha / mnemecha) via that generated config.
//
// Mirrors the app-kit ← kit ESLint inheritance one layer down: this wraps
// app-kit's `create_sveltekit_config` and appends the game-dir overrides
// (later-wins flat-config ordering), exactly as app-kit wraps kit's preset.
//
// Game / Three.js / Web-Audio code legitimately uses `null` contracts and
// definition-site exports, and runs longer / more-branchy than UI glue, so it
// trips the strict SvelteKit defaults — hence these relaxations. The temporary
// stop-gaps and repo-specific blocks (#358, templates/, scripts/, test caps) are
// NOT part of this shared profile; they stay in game-kit's own eslint.config.js.
import { create_sveltekit_config } from '@joshuafolkken/app-kit/eslint/sveltekit'

/** @typedef {{ complexity: number, fn_lines: number, fn_statements: number, file_lines: number }} GameDirCaps */

/** @type {GameDirCaps} */
const GAME_DIR_CAPS = { complexity: 7, fn_lines: 50, fn_statements: 20, file_lines: 400 }

/** @param {number} max */
function lines_cap(max) {
	return ['error', { max, skipBlankLines: true, skipComments: true }]
}

// null contracts + definition-site exports + a relaxed size budget.
/** @param {GameDirCaps} caps */
function game_idiom_rules(caps) {
	return {
		'unicorn/no-null': 'off',
		'import/exports-last': 'off',
		'max-lines-per-function': lines_cap(caps.fn_lines),
		'max-statements': ['error', caps.fn_statements],
		'max-lines': lines_cap(caps.file_lines),
	}
}

// raised complexity for cohesive game-loop / render / input units.
/** @param {GameDirCaps} caps */
function game_complexity_rules(caps) {
	return {
		complexity: ['error', caps.complexity],
		'sonarjs/cognitive-complexity': ['error', caps.complexity],
	}
}

// the full game-dir profile (idiom + complexity), for a single glob.
/** @param {GameDirCaps} [caps] */
function game_override_rules(caps = GAME_DIR_CAPS) {
	return { ...game_idiom_rules(caps), ...game_complexity_rules(caps) }
}

// The flat-config block that scopes the full game-dir profile to `src/lib/game/**`
// (only game code is relaxed; the rest stays strict). Module-internal — consumers reach
// it through create_game_config, not directly, so it is not exported.
const game_directory_overrides = { files: ['src/lib/game/**'], rules: game_override_rules() }

/**
 * Game-app ESLint config: app-kit's SvelteKit preset plus the game-dir relaxations
 * scoped to `src/lib/game/**`. The convenience entry point for scaffolded projects.
 * @param {Parameters<typeof create_sveltekit_config>[0]} options
 * @returns {import('eslint').Linter.Config[]}
 */
function create_game_config(options) {
	return create_sveltekit_config(options).concat(game_directory_overrides)
}

// Building blocks, kept for game-kit's own eslint.config.js (which applies the
// idiom/size parts repo-wide rather than via the `src/lib/game/**`-scoped block).
const eslint_game_overrides = {
	GAME_DIR_CAPS,
	lines_cap,
	game_idiom_rules,
	game_complexity_rules,
	game_override_rules,
}

export { create_game_config, eslint_game_overrides }
