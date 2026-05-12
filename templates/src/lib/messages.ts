import { base_messages } from '@joshuafolkken/game-kit'
import { game_config } from './game-config'

export const simon_messages = {
	game_title: game_config.GAME_NAME_UPPER,
	simon_start: 'START',
	simon_round: 'ROUND',
	simon_gameover: 'GAME OVER',
	game_application_label: game_config.GAME_APP_LABEL,
} as const

export const messages = { ...base_messages, ...simon_messages } as const
