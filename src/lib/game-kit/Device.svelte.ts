const TOUCH_PRIMARY_QUERY = '(hover: none) and (pointer: coarse)'
const PORTRAIT_QUERY = '(orientation: portrait)'

interface Device {
	readonly is_touch_primary: boolean
	readonly is_portrait: boolean
}

// `typeof === 'function'` (not optional chaining) so TS sees the genuine
// `MediaQueryList | null` union — matchMedia is absent under SSR / Node test envs,
// even though lib.dom types it as always present. Covers both "missing" and
// "present but undefined" (e.g. vi.stubGlobal('matchMedia', undefined)).
function match_query(query: string): MediaQueryList | null {
	return typeof matchMedia === 'function' ? matchMedia(query) : null
}

function create_device(): Device {
	const touch_mql = match_query(TOUCH_PRIMARY_QUERY)
	let is_touch = $state(touch_mql?.matches ?? false)

	touch_mql?.addEventListener('change', (e: MediaQueryListEvent) => {
		is_touch = e.matches
	})

	// Orientation signal so consuming games can lay out their own side content responsively
	// (e.g. reflow a multi-board layout for portrait) — the layout counterpart to the
	// camera's portrait-aware FOV.
	const portrait_mql = match_query(PORTRAIT_QUERY)
	let is_portrait = $state(portrait_mql?.matches ?? false)

	portrait_mql?.addEventListener('change', (e: MediaQueryListEvent) => {
		is_portrait = e.matches
	})

	return {
		get is_touch_primary(): boolean {
			return is_touch
		},
		get is_portrait(): boolean {
			return is_portrait
		},
	}
}

export type DeviceInstance = ReturnType<typeof create_device>

const device = create_device()

export { create_device, device }
