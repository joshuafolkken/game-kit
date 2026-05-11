import { fps } from '$lib/game/display/fps.svelte'
import { create_switch_input } from '$lib/game/switch/switch-input'

const { on_click } = create_switch_input({ action: () => fps.toggle() })

export const fps_switch_input = { on_click }
