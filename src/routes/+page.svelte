<script lang="ts">
	import { device } from '$lib/game/device.svelte'
	import GameScene from '$lib/game/GameScene.svelte'
	import { messages } from '$lib/messages/en'
	import { simon_board_input } from '$lib/simon/simon-board-input'
	import { simon } from '$lib/simon/simon.svelte'
	import SimonScene from '$lib/simon/SimonScene.svelte'

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
	label_move={messages.controls_move}
	label_look={messages.controls_look}
	label_action={messages.controls_action}
	label_return={messages.controls_return}
	label_game={messages.game_application_label}
	label_game_started={messages.game_started_announcement}
	label_pause={messages.pause_button}
>
	<SimonScene />
</GameScene>
