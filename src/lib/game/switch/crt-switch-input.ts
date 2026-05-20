import { crt } from '$lib/game/crt.svelte'
import { create_switch_input } from '$lib/game/switch/switch-input'

const { on_click } = create_switch_input({ action: () => crt.toggle() })

export const crt_switch_input = { on_click }
