import { GAME_NAME, GAME_NAME_DISPLAY } from '$lib/game/game-name'
import { base_messages } from '$lib/messages/en'

// Mirrors the structure of templates/src/lib/messages.ts so the in-package
// demo and any scaffolded game project follow the same recipe: import base_messages,
// declare game-specific labels, compose with spread. The only intentional difference
// is the import path of base_messages — internal here, '@joshuafolkken/game-kit'
// in scaffolded projects.
const game_messages = {
	game_title: GAME_NAME,
	game_start: 'START',
	game_round: 'ROUND',
	game_gameover: 'GAME OVER',
	game_application_label: GAME_NAME_DISPLAY,
} as const

const messages = { ...base_messages, ...game_messages } as const

export { game_messages, messages }
