const DEFAULT_IS_ALT = false;

export function create_game_state() {
	let is_alt = $state(DEFAULT_IS_ALT);

	function reset_mode(): void {
		is_alt = DEFAULT_IS_ALT;
	}

	function toggle_alt(): void {
		is_alt = !is_alt;
	}

	function set_alt(value: boolean): void {
		is_alt = value;
	}

	return {
		get is_alt() {
			return is_alt;
		},
		reset_mode,
		toggle_alt,
		set_alt
	};
}

export type GameStateInstance = ReturnType<typeof create_game_state>;

export const game_state = create_game_state();
