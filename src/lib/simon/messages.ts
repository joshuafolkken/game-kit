import { GAME_NAME, GAME_NAME_DISPLAY } from '$lib/game/game-name'
import { base_messages } from '$lib/messages/en'

// Mirrors the structure of templates/src/lib/messages.ts so the in-package Simon
// demo and any scaffolded game project follow the same recipe: import base_messages,
// declare game-specific labels, compose with spread. The only intentional difference
// is the import path of base_messages — internal here, '@joshuafolkken/game-kit'
// in scaffolded projects.
export const simon_messages = {
	game_title: GAME_NAME,
	simon_start: 'START',
	simon_round: 'ROUND',
	simon_gameover: 'GAME OVER',
	game_application_label: GAME_NAME_DISPLAY,
} as const

export const messages = { ...base_messages, ...simon_messages } as const
