export type ButtonColor = 'green' | 'red' | 'yellow' | 'blue'

export interface GameBoardData {
	active_color: ButtonColor | null
	pressed_color: ButtonColor | null
	phase: string
	round: number
	flash_colors: ReadonlyArray<ButtonColor>
	flash_intensity: number
}

export type GamePhase = 'idle' | 'showing' | 'player_input' | 'round_complete' | 'gameover'
