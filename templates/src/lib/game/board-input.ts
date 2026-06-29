import { pointer_button, session } from '@joshuafolkken/game-kit'
import type { ButtonColor } from './types'

interface BoardCallbacks {
	on_press: (color: ButtonColor) => void
	on_release: () => void
	on_start: () => void
}

interface PointerDownEvent {
	nativeEvent: { button: number }
}

interface GameBoardInputApi {
	configure: (cbs: BoardCallbacks) => void
	on_button_pointer_down: (e: PointerDownEvent, color: ButtonColor) => void
	on_button_release: () => void
	on_center_click: () => void
}

// `board_callbacks` is encapsulated in the factory closure (not a module-level binding) so its
// reassignment from configure lives inside the returned object — the same pattern as
// create_game_state in State.svelte.ts. Callbacks are wired up lazily by the mounting component.
function create_game_board_input(): GameBoardInputApi {
	let board_callbacks: BoardCallbacks = {
		on_press: () => {
			/* no-op */
		},
		on_release: () => {
			/* no-op */
		},
		on_start: () => {
			/* no-op */
		},
	}

	function configure(cbs: BoardCallbacks): void {
		board_callbacks = cbs
	}

	function on_button_pointer_down(e: PointerDownEvent, color: ButtonColor): void {
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

	return { configure, on_button_pointer_down, on_button_release, on_center_click }
}

const game_board_input = create_game_board_input()

export { create_game_board_input, game_board_input }
