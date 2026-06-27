const TOUCH_PRIMARY_QUERY = '(hover: none) and (pointer: coarse)'

interface Device {
	readonly is_touch_primary: boolean
}

function create_device(): Device {
	// `typeof === 'function'` (not optional chaining) so TS sees the genuine
	// `MediaQueryList | null` union — matchMedia is absent under SSR / Node test envs,
	// even though lib.dom types it as always present. Covers both "missing" and
	// "present but undefined" (e.g. vi.stubGlobal('matchMedia', undefined)).
	const mql = typeof matchMedia === 'function' ? matchMedia(TOUCH_PRIMARY_QUERY) : null
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

const device = create_device()

export { create_device, device }
