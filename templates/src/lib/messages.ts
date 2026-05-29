import { base_messages } from '@joshuafolkken/game-kit'
import { game_config } from './game-config'

const game_messages = {
	game_title: game_config.GAME_NAME_UPPER,
	game_start: 'START',
	game_round: 'ROUND',
	game_gameover: 'GAME OVER',
	game_application_label: game_config.GAME_APP_LABEL,
} as const

const messages = { ...base_messages, ...game_messages } as const

export { game_messages, messages }
