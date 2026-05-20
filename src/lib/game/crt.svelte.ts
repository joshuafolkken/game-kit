export function create_crt() {
	let is_crt_enabled = $state(true)

	function toggle(): void {
		is_crt_enabled = !is_crt_enabled
	}

	return {
		get is_crt_enabled(): boolean {
			return is_crt_enabled
		},
		toggle,
	}
}

export type CrtInstance = ReturnType<typeof create_crt>

export const crt = create_crt()
