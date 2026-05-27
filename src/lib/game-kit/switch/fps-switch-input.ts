import { fps } from '$lib/game-kit/display/Fps.svelte'
import { create_switch_input } from '$lib/game-kit/switch/switch-input'

const { on_click } = create_switch_input({ action: () => fps.toggle() })

export const fps_switch_input = { on_click }
