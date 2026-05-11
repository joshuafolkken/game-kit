import { base_messages } from '@joshuafolkken/game-kit'

export const simon_messages = {
	game_title: 'SIMON',
	simon_start: 'START',
	simon_round: 'ROUND',
	simon_gameover: 'GAME OVER',
	game_application_label: 'Simon game',
} as const

export const messages = { ...base_messages, ...simon_messages } as const
