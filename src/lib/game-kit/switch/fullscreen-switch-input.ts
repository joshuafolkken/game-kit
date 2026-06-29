import { fullscreen } from '$lib/game-kit/Fullscreen.svelte'
import { create_switch_input } from '$lib/game-kit/switch/switch-input'

interface FullscreenSwitchInputApi {
	set_container: (element: HTMLElement | null) => void
	on_click: () => void
}

// `container` is encapsulated in the factory closure (not a module-level binding) so its
// assignment from set_container lives inside the returned object — the same pattern as
// create_game_state in State.svelte.ts. The element is supplied lazily by the mounting
// component, so it is not known at module load.
function create_fullscreen_switch_input(): FullscreenSwitchInputApi {
	let container: HTMLElement | null = null

	function set_container(element: HTMLElement | null): void {
		container = element
	}

	const { on_click } = create_switch_input({
		guard: () => container !== null,
		action: () => {
			if (!container) return
			if (fullscreen.is_active) void fullscreen.exit()
			else void fullscreen.request(container)
		},
	})

	return { set_container, on_click }
}

const fullscreen_switch_input = create_fullscreen_switch_input()

export { create_fullscreen_switch_input, fullscreen_switch_input }
