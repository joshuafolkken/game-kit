<script lang="ts">
	import { device } from '$lib/game-kit/device.svelte'
	import GameScene from '$lib/game-kit/GameScene.svelte'
	import { game_board_input } from '$lib/game/board-input'
	import { game } from '$lib/game/game.svelte'
	import { messages } from '$lib/game/messages'
	import Scene from '$lib/game/Scene.svelte'

	game_board_input.configure({
		on_press: (color) => game.press(color),
		on_release: () => game.release(),
		on_start: () => game.start(),
	})

	const hint_text = $derived(
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
	<Scene />
</GameScene>
