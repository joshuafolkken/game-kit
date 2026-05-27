import { fullscreen } from '$lib/game-kit/fullscreen.svelte'
import { create_switch_input } from '$lib/game-kit/switch/switch-input'

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

export const fullscreen_switch_input = { set_container, on_click }
