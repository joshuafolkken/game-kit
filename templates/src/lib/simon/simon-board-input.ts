import { pointer_button, session } from '@joshuafolkken/game-kit'
import type { ButtonColor } from './types'

type BoardCallbacks = {
	on_press: (color: ButtonColor) => void
	on_release: () => void
	on_start: () => void
}

let board_callbacks: BoardCallbacks = {
	on_press: () => {},
	on_release: () => {},
	on_start: () => {},
}

function configure(cbs: BoardCallbacks): void {
	board_callbacks = cbs
}

function on_button_pointer_down(e: { nativeEvent: { button: number } }, color: ButtonColor): void {
	if (!session.is_session_started) return
	if (!pointer_button.is_left_click(e)) return
	board_callbacks.on_press(color)
}

function on_button_release(): void {
	if (!session.is_session_started) return
	board_callbacks.on_release()
}

function on_center_click(): void {
	if (!session.is_session_started) return
	board_callbacks.on_start()
}

export const simon_board_input = {
	configure,
	on_button_pointer_down,
	on_button_release,
	on_center_click,
}
