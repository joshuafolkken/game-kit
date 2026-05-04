import { game_state } from '$lib/game/state.svelte'
import { create_switch_input } from '$lib/game/switch-input'

const { on_click } = create_switch_input({ action: () => game_state.toggle_alt() })

export const alt_switch_input = { on_click }
