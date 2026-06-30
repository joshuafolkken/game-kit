interface Crt {
	readonly is_crt_enabled: boolean
	toggle: () => void
	set_enabled: (is_enabled: boolean) => void
}

function create_crt(): Crt {
	let is_crt_enabled = $state(true)

	function toggle(): void {
		is_crt_enabled = !is_crt_enabled
	}

	// Set the CRT/RETRO state directly. Lets consumers pick the initial mode through
	// game-kit API (e.g. GameScene's crt_initial prop) instead of hand-toggling it in the
	// synced app shell, which jgame sync would clobber on the next bump (game-kit#375).
	function set_enabled(is_enabled: boolean): void {
		is_crt_enabled = is_enabled
	}

	return {
		get is_crt_enabled(): boolean {
			return is_crt_enabled
		},
		toggle,
		set_enabled,
	}
}

export type CrtInstance = ReturnType<typeof create_crt>

const crt = create_crt()

export { create_crt, crt }
