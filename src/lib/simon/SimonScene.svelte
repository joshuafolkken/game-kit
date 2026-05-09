<script lang="ts">
	import { make_credits_scroll_bounds } from '$lib/game/credits-config'
	import { HALF_D } from '$lib/game/room-config'
	import type { SceneObjectsMessages } from '$lib/game/scene-objects-messages'
	import SceneObjects from '$lib/game/SceneObjects.svelte'
	import { game_state } from '$lib/game/state.svelte'
	import { messages } from '$lib/messages/en'
	import { SCORE_DISPLAY_Z } from '$lib/simon/board-config'
	import { CREDITS_LINE_COUNT, CREDITS_TEXT } from '$lib/simon/credits'
	import { score } from '$lib/simon/score.svelte'
	import { simon } from '$lib/simon/simon.svelte'
	import SimonBoard from '$lib/simon/SimonBoard.svelte'

	const { start_z: CREDITS_SCROLL_START_Z, end_z: CREDITS_SCROLL_END_Z } =
		make_credits_scroll_bounds(CREDITS_LINE_COUNT, HALF_D)

	let score_data = $derived({
		high_score: score.high_score,
		current_score: score.current_score,
		is_new_high_score: score.is_new_high_score,
		high_score_round: score.high_score_round,
		last_cleared_round: score.last_cleared_round,
		format_score: score.format_score,
	})
	let simon_data = $derived({
		active_color: simon.active_color,
		pressed_color: simon.pressed_color,
		phase: simon.phase,
		round: simon.round,
		flash_colors: simon.flash_colors,
		flash_intensity: simon.flash_intensity,
	})

	let is_alt = $derived(game_state.is_alt)
	const scene_messages: SceneObjectsMessages = {
		game_title: messages.game_title,
		alt_switch_label: messages.cyber_switch_label,
		fullscreen_switch_label: messages.fullscreen_switch_label,
		fps_switch_label: messages.fps_switch_label,
		score_high_score: messages.score_high_score,
		score_round: messages.score_round,
		score_current: messages.score_current,
	}
</script>

<SceneObjects
	{score_data}
	messages={scene_messages}
	score_display_z={SCORE_DISPLAY_Z}
	is_gameover={simon.phase === 'gameover'}
	credits_text={CREDITS_TEXT}
	credits_start_z={CREDITS_SCROLL_START_Z}
	credits_end_z={CREDITS_SCROLL_END_Z}
>
	{#snippet game_board()}
		<SimonBoard
			{simon_data}
			{is_alt}
			text_gameover={messages.simon_gameover}
			text_round={messages.simon_round}
			text_start={messages.simon_start}
		/>
	{/snippet}
</SceneObjects>
