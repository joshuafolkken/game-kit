import { fullscreen } from '$lib/game/fullscreen.svelte'
import { create_switch_input } from '$lib/game/switch-input'

let container: HTMLElement | null = null

function set_container(el: HTMLElement | null): void {
	container = el
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
