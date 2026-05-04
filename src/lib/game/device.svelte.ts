const TOUCH_PRIMARY_QUERY = '(hover: none) and (pointer: coarse)'

export function create_device() {
	const mql = globalThis.matchMedia?.(TOUCH_PRIMARY_QUERY) ?? null
	let is_touch = $state(mql?.matches ?? false)
	mql?.addEventListener('change', (e: MediaQueryListEvent) => {
		is_touch = e.matches
	})
	return {
		get is_touch_primary(): boolean {
			return is_touch
		},
	}
}

export type DeviceInstance = ReturnType<typeof create_device>

export const device = create_device()
