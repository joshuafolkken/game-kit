<script lang="ts">
	import { make_credits_scroll_bounds } from '$lib/game-kit/scene/credits-config'
	import { HALF_D } from '$lib/game-kit/scene/room-config'
	import type { SceneObjectsMessages } from '$lib/game-kit/scene/scene-objects-messages'
	import SceneObjects from '$lib/game-kit/scene/SceneObjects.svelte'
	import { game_state } from '$lib/game-kit/state.svelte'
	import { SCORE_DISPLAY_Z } from '$lib/game/board-config'
	import Board from '$lib/game/Board.svelte'
	import { CREDITS_LINE_COUNT, CREDITS_TEXT } from '$lib/game/credits'
	import { game } from '$lib/game/game.svelte'
	import { messages } from '$lib/game/messages'
	import { score } from '$lib/game/score.svelte'

	const { start_z: CREDITS_SCROLL_START_Z, end_z: CREDITS_SCROLL_END_Z } =
		make_credits_scroll_bounds(CREDITS_LINE_COUNT, HALF_D)

	const score_data = $derived({
		high_score: score.high_score,
		current_score: score.current_score,
		is_new_high_score: score.is_new_high_score,
		high_score_round: score.high_score_round,
		last_cleared_round: score.last_cleared_round,
		format_score: score.format_score,
	})
	const game_data = $derived({
		active_color: game.active_color,
		pressed_color: game.pressed_color,
		phase: game.phase,
		round: game.round,
		flash_colors: game.flash_colors,
		flash_intensity: game.flash_intensity,
	})

	const is_alt = $derived(game_state.is_alt)
	const scene_messages: SceneObjectsMessages = {
		game_title: messages.game_title,
		alt_switch_label: messages.cyber_switch_label,
		score_high_score: messages.score_high_score,
		score_round: messages.score_round,
		score_current: messages.score_current,
	}
</script>

<SceneObjects
	{score_data}
	messages={scene_messages}
	score_display_z={SCORE_DISPLAY_Z}
	is_gameover={game.phase === 'gameover'}
	credits_text={CREDITS_TEXT}
	credits_start_z={CREDITS_SCROLL_START_Z}
	credits_end_z={CREDITS_SCROLL_END_Z}
>
	{#snippet game_board()}
		<Board
			{game_data}
			{is_alt}
			text_gameover={messages.game_gameover}
			text_start={messages.game_start}
		/>
	{/snippet}
</SceneObjects>
