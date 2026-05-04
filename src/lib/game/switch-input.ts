import { session } from '$lib/game/session.svelte';
import { switch_audio } from '$lib/game/switch-audio';

type SwitchInputConfig = { action: () => void; guard?: () => boolean };

export function create_switch_input(config: SwitchInputConfig): { on_click: () => void } {
	function on_click(): void {
		if (!session.is_session_started) return;
		if (config.guard && !config.guard()) return;
		switch_audio.play_switch_click();
		config.action();
	}
	return { on_click };
}
