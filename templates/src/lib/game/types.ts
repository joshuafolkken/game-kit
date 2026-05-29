export type ButtonColor = 'green' | 'red' | 'yellow' | 'blue'

export interface GameBoardData {
	active_color: ButtonColor | undefined
	pressed_color: ButtonColor | undefined
	phase: string
	round: number
	flash_colors: readonly ButtonColor[]
	flash_intensity: number
}

export type GamePhase = 'idle' | 'showing' | 'player_input' | 'round_complete' | 'gameover'
