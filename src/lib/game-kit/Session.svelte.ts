interface Session {
	readonly is_session_started: boolean
	start_session: () => void
	reset_session: () => void
}

export function create_session(): Session {
	let is_session_started = $state(false)

	function start_session(): void {
		is_session_started = true
	}

	function reset_session(): void {
		is_session_started = false
	}

	return {
		get is_session_started() {
			return is_session_started
		},
		start_session,
		reset_session,
	}
}

export type SessionInstance = ReturnType<typeof create_session>

export const session = create_session()
