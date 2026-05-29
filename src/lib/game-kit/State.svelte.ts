const is_alt_default = false

interface GameStateApi {
	readonly is_alt: boolean
	reset_mode: () => void
	toggle_alt: () => void
	set_alt: (value: boolean) => void
}

function create_game_state(): GameStateApi {
	let is_alt = $state(is_alt_default)

	function reset_mode(): void {
		is_alt = is_alt_default
	}

	function toggle_alt(): void {
		is_alt = !is_alt
	}

	function set_alt(value: boolean): void {
		is_alt = value
	}

	return {
		get is_alt() {
			return is_alt
		},
		reset_mode,
		toggle_alt,
		set_alt,
	}
}

export type GameStateInstance = ReturnType<typeof create_game_state>

const game_state = create_game_state()

export { create_game_state, game_state }
