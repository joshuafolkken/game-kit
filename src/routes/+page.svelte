<script lang="ts">
	import { device } from '$lib/game-kit/device.svelte'
	import GameScene from '$lib/game-kit/GameScene.svelte'
	import { simon_board_input } from '$lib/game/simon-board-input'
	import { simon } from '$lib/game/simon.svelte'
	import SimonScene from '$lib/game/SimonScene.svelte'
	import { messages } from '$lib/simon/messages'

	simon_board_input.configure({
		on_press: (color) => simon.press(color),
		on_release: () => simon.release(),
		on_start: () => simon.start(),
	})

	let hint_text = $derived(
		device.is_touch_primary ? messages.tap_to_start : messages.click_to_start,
	)
</script>

<GameScene
	{hint_text}
	label_jump={messages.jump_button}
	label_game={messages.game_application_label}
	label_game_started={messages.game_started_announcement}
	label_pause={messages.pause_button}
>
	<SimonScene />
</GameScene>
