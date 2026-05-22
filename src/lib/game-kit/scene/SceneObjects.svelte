<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core'
	import { interactivity, Text } from '@threlte/extras'
	import { crt } from '$lib/game-kit/crt.svelte'
	import { fps } from '$lib/game-kit/display/fps.svelte'
	import FpsDisplay from '$lib/game-kit/display/FpsDisplay.svelte'
	import type { ScoreData } from '$lib/game-kit/display/score-display-types'
	import ScoreDisplay from '$lib/game-kit/display/ScoreDisplay.svelte'
	import { fonts } from '$lib/game-kit/fonts'
	import { fullscreen } from '$lib/game-kit/fullscreen.svelte'
	import { make_pointer_compute } from '$lib/game-kit/input/pointer-compute.js'
	import Player from '$lib/game-kit/player/Player.svelte'
	import { lighting } from '$lib/game-kit/scene/lighting'
	import { ROOM_D, ROOM_H, ROOM_W } from '$lib/game-kit/scene/room-config'
	import {
		CEILING_COLOR,
		CYBER_BG,
		CYBER_CEILING_COLOR,
		CYBER_FLOOR_COLOR,
		CYBER_POINT_LIGHT_COLOR,
		CYBER_WALL_COLOR,
		FLOOR_COLOR,
		NORMAL_BG,
		NORMAL_POINT_LIGHT_COLOR,
		WALL_COLOR,
	} from '$lib/game-kit/scene/scene-colors'
	import {
		BOB_AMPLITUDE,
		BOB_SPEED,
		POINT_LIGHT_Y,
		TITLE_FONT_SIZE,
		TITLE_Y,
		TITLE_Z,
	} from '$lib/game-kit/scene/scene-objects-config'
	import type { SceneObjectsMessages } from '$lib/game-kit/scene/scene-objects-messages'
	import { game_state } from '$lib/game-kit/state.svelte'
	import { alt_switch_input } from '$lib/game-kit/switch/alt-switch-input'
	import { crt_switch_input } from '$lib/game-kit/switch/crt-switch-input'
	import { fps_switch_input } from '$lib/game-kit/switch/fps-switch-input'
	import { fullscreen_switch_input } from '$lib/game-kit/switch/fullscreen-switch-input'
	import {
		CRT_SWITCH_COLORS,
		CYBER_SWITCH_COLORS,
		FPS_SWITCH_COLORS,
		FULLSCREEN_SWITCH_COLORS,
	} from '$lib/game-kit/switch/switch-colors'
	import {
		CRT_SWITCH_LABEL,
		FPS_SWITCH_LABEL,
		FPS_SWITCH_Y,
		FULLSCREEN_SWITCH_LABEL,
		FULLSCREEN_SWITCH_X,
		LEFT_SWITCH_X,
	} from '$lib/game-kit/switch/switch-config'
	import Switch from '$lib/game-kit/switch/Switch.svelte'
	import type { Snippet } from 'svelte'
	import FloorCredits from './FloorCredits.svelte'
	import Room from './Room.svelte'

	interface Props {
		game_board: Snippet
		score_data: ScoreData
		is_gameover: boolean
		credits_text: string
		credits_start_z: number
		credits_end_z: number
		messages: SceneObjectsMessages
		score_display_z: number
	}

	let {
		game_board,
		score_data,
		is_gameover,
		credits_text,
		credits_start_z,
		credits_end_z,
		messages,
		score_display_z,
	}: Props = $props()

	const { camera } = useThrelte()
	interactivity({ compute: make_pointer_compute(camera) })

	let is_alt = $derived(game_state.is_alt)
	// Font is driven by CRT state — CRT ON pairs the retro pixel font with the scanline
	// aesthetic; CRT OFF switches to the modern Orbitron font. CYBER (is_alt) controls
	// palette and lighting only.
	let should_use_alt_font = $derived(!crt.is_crt_enabled)
	let bg_color = $derived(is_alt ? CYBER_BG : NORMAL_BG)
	let ambient_intensity = $derived(lighting.get_ambient_intensity(is_alt))
	let ambient_color = $derived(lighting.get_ambient_color(is_alt))
	let point_light_intensity = $derived(lighting.get_point_light_intensity(is_alt))
	let point_light_color = $derived(is_alt ? CYBER_POINT_LIGHT_COLOR : NORMAL_POINT_LIGHT_COLOR)
	let current_font = $derived(fonts.get_font(should_use_alt_font))
	let current_font_size_multiplier = $derived(fonts.get_font_size_multiplier(should_use_alt_font))
	let current_title_font_size = $derived(TITLE_FONT_SIZE * current_font_size_multiplier)
	let floor_color = $derived(is_alt ? CYBER_FLOOR_COLOR : FLOOR_COLOR)
	let wall_color = $derived(is_alt ? CYBER_WALL_COLOR : WALL_COLOR)
	let ceiling_color = $derived(is_alt ? CYBER_CEILING_COLOR : CEILING_COLOR)
	let title_y = $state(TITLE_Y)

	function tick(): void {
		title_y = TITLE_Y + Math.sin(Date.now() * BOB_SPEED) * BOB_AMPLITUDE
	}

	useTask(tick)
</script>

<T.Color attach="background" args={[bg_color]} />
<T.AmbientLight intensity={ambient_intensity} color={ambient_color} />
<T.PointLight
	position={[0, POINT_LIGHT_Y, 0]}
	intensity={point_light_intensity}
	color={point_light_color}
/>

<T.Group position={[0, title_y, TITLE_Z]}>
	<Text
		text={messages.game_title}
		font={current_font}
		fontSize={current_title_font_size}
		color="#ffffff"
		anchorX="center"
		anchorY="middle"
	/>
</T.Group>

<Room width={ROOM_W} depth={ROOM_D} height={ROOM_H} {floor_color} {wall_color} {ceiling_color} />
<FloorCredits
	{is_alt}
	credits={credits_text}
	scroll_start_z={credits_start_z}
	scroll_end_z={credits_end_z}
/>
<Player {is_gameover} />
{@render game_board()}
<ScoreDisplay
	{score_data}
	{is_alt}
	position_z={score_display_z}
	label_high_score={messages.score_high_score}
	label_round={messages.score_round}
	label_current={messages.score_current}
/>
<Switch
	position_x={LEFT_SWITCH_X}
	is_active={fps.is_fps_enabled}
	icon_type="fps"
	label={FPS_SWITCH_LABEL}
	font={current_font}
	font_size_multiplier={current_font_size_multiplier}
	onclick={fps_switch_input.on_click}
	colors={FPS_SWITCH_COLORS}
	geometry={{ switch_y: FPS_SWITCH_Y }}
	panel_text={fps.current_fps_text}
/>
<FpsDisplay />
<Switch
	position_x={LEFT_SWITCH_X}
	is_active={is_alt}
	icon_type="cyber"
	label={messages.alt_switch_label}
	font={current_font}
	font_size_multiplier={current_font_size_multiplier}
	onclick={alt_switch_input.on_click}
	colors={CYBER_SWITCH_COLORS}
/>
<Switch
	position_x={FULLSCREEN_SWITCH_X}
	is_active={fullscreen.is_active}
	icon_type="fullscreen"
	label={FULLSCREEN_SWITCH_LABEL}
	font={current_font}
	font_size_multiplier={current_font_size_multiplier}
	onclick={fullscreen_switch_input.on_click}
	colors={FULLSCREEN_SWITCH_COLORS}
	geometry={{ switch_y: FPS_SWITCH_Y }}
/>
<Switch
	position_x={FULLSCREEN_SWITCH_X}
	is_active={crt.is_crt_enabled}
	icon_type="crt"
	label={CRT_SWITCH_LABEL}
	font={current_font}
	font_size_multiplier={current_font_size_multiplier}
	onclick={crt_switch_input.on_click}
	colors={CRT_SWITCH_COLORS}
/>
