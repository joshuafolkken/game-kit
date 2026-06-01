// Single source of truth for the game-dir ESLint relaxations (#261). Consumed by
// both eslint.config.js (game-kit's own lint) and scripts/jgame-eslint-config.ts
// (the scaffold's generated eslint.config.js), so the two cannot drift. Like the
// other root config files it is not itself linted (see FILE_IGNORES).
//
// Game / Three.js / Web-Audio code uses `null` contracts and definition-site
// exports, and runs longer / more-branchy than UI glue — so these relaxations
// apply to game dirs (game-kit applies the idiom/size part globally because its
// whole repo is game code; a scaffold applies the full profile to src/lib/game/**).

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

const eslint_game_overrides = {
	GAME_DIR_CAPS,
	lines_cap,
	game_idiom_rules,
	game_complexity_rules,
	game_override_rules,
}
export { eslint_game_overrides }
