import { create_switch_input } from '$lib/game/switch-input';
import { fps } from '$lib/game/fps.svelte';

const { on_click } = create_switch_input({ action: () => fps.toggle() });

export const fps_switch_input = { on_click };
