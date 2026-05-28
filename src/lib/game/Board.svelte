<script lang="ts">
	import { T } from '@threlte/core'
	import { Text } from '@threlte/extras'
	import { crt } from '$lib/game-kit/Crt.svelte'
	import { fonts } from '$lib/game-kit/fonts'
	import { BACKING_RADIUS, BOARD_LABEL_Z, BOARD_Y, BOARD_Z } from './board-config'
	import { game_board_input } from './board-input'
	import type { ButtonColor, GameBoardData } from './types'

	const HALF_DIVISOR = 2
	const QUARTER_TURN = Math.PI / HALF_DIVISOR
	const BUTTON_GAP_DIVISOR = 36
	const INNER_RADIUS = 0.3
	const OUTER_RADIUS = 0.7
	const THETA_SEGMENTS = 32
	const CIRCLE_SEGMENTS = 32
	const BACKING_SEGMENTS = 64
	const BACKING_ROUGHNESS = 0.8
	const CENTER_ROUGHNESS = 0.5
	const BUTTON_GAP = Math.PI / BUTTON_GAP_DIVISOR
	const THETA_START = BUTTON_GAP
	const THETA_LENGTH = QUARTER_TURN - BUTTON_GAP * HALF_DIVISOR
	const CENTER_RADIUS = 0.22
	const BACKING_Z = -0.01
	const FONT_SIZE = 0.13
	// Per-line size used by GAME OVER (the only multi-line center label).
	// Two short stacked lines have more horizontal room than the single-line layout, so the
	// per-line size can be bumped above the single-line FONT_SIZE without overflowing the board.
	const MULTILINE_FONT_SIZE = 0.16
	// Large size for the digit-only ROUND display: a single number reads well at high size
	// and is the focal information during play.
	const ROUND_DIGIT_FONT_SIZE = 0.2
	// Multiplier (relative to fontSize) used as Troika Text's lineHeight on GAME OVER so the
	// two stacked lines have a little breathing room rather than sitting flush together.
	const MULTILINE_LINE_HEIGHT = 1.4
	const SINGLE_LINE_HEIGHT = 1
	const EMISSIVE_INTENSITY = 0.8
	const CYBER_EMISSIVE_INTENSITY = 1.5

	interface ButtonConfig {
		color: ButtonColor
		rotation: number
		lit_color: string
		dim_color: string
		cyber_lit_color: string
		cyber_dim_color: string
	}

	interface Props {
		game_data: GameBoardData
		is_alt: boolean
		text_gameover: string
		text_start: string
	}

	const BUTTON_CONFIGS = [
		{
			color: 'green',
			rotation: 0,
			lit_color: '#00ff00',
			dim_color: '#003300',
			cyber_lit_color: '#00ffaa',
			cyber_dim_color: '#005533',
		},
		{
			color: 'red',
			rotation: QUARTER_TURN,
			lit_color: '#ff2222',
			dim_color: '#330000',
			cyber_lit_color: '#ff0088',
			cyber_dim_color: '#550022',
		},
		{
			color: 'yellow',
			rotation: Math.PI,
			lit_color: '#ffff00',
			dim_color: '#333300',
			cyber_lit_color: '#ffff00',
			cyber_dim_color: '#555500',
		},
		{
			color: 'blue',
			rotation: -QUARTER_TURN,
			lit_color: '#2266ff',
			dim_color: '#001133',
			cyber_lit_color: '#00ccff',
			cyber_dim_color: '#003355',
		},
	] as const satisfies ReadonlyArray<ButtonConfig>

	const { game_data, is_alt, text_gameover, text_start }: Props = $props()

	function is_lit(color: ButtonColor): boolean {
		return (
			game_data.active_color === color ||
			game_data.pressed_color === color ||
			game_data.flash_colors.includes(color)
		)
	}

	function button_lit(button: ButtonConfig): string {
		return is_alt ? button.cyber_lit_color : button.lit_color
	}

	function button_dim(button: ButtonConfig): string {
		return is_alt ? button.cyber_dim_color : button.dim_color
	}

	function get_center_text(): string {
		if (game_data.phase === 'gameover') return text_gameover.replace(' ', '\n')
		if (game_data.round > 0) return String(game_data.round)

		return text_start
	}

	function get_center_base_font_size(): number {
		if (game_data.phase === 'gameover') return MULTILINE_FONT_SIZE
		if (game_data.round > 0) return ROUND_DIGIT_FONT_SIZE

		return FONT_SIZE
	}

	const is_multiline_center = $derived(game_data.phase === 'gameover')
	const center_text = $derived(get_center_text())
	const emissive_intensity = $derived(
		(is_alt ? CYBER_EMISSIVE_INTENSITY : EMISSIVE_INTENSITY) * game_data.flash_intensity,
	)
	// Font is driven by CRT state, independent of is_alt (CYBER) palette.
	const should_use_alt_font = $derived(!crt.is_crt_enabled)
	const current_font = $derived(fonts.get_font(should_use_alt_font))
	const center_base_font_size = $derived(get_center_base_font_size())
	const current_font_size = $derived(
		center_base_font_size * fonts.get_font_size_multiplier(should_use_alt_font),
	)
	const current_line_height = $derived(
		is_multiline_center ? MULTILINE_LINE_HEIGHT : SINGLE_LINE_HEIGHT,
	)
</script>

<T.Group position={[0, BOARD_Y, BOARD_Z]}>
	<T.Mesh position.z={BACKING_Z}>
		<T.CircleGeometry args={[BACKING_RADIUS, BACKING_SEGMENTS]} />
		<T.MeshStandardMaterial color="#111111" roughness={BACKING_ROUGHNESS} />
	</T.Mesh>

	{#each BUTTON_CONFIGS as button (button.color)}
		<T.Group rotation.z={button.rotation}>
			<T.Mesh
				onpointerdown={(e: { nativeEvent: { button: number } }) => {
					game_board_input.on_button_pointer_down(e, button.color)
				}}
				onpointerup={() => {
					game_board_input.on_button_release()
				}}
				onpointerleave={() => {
					game_board_input.on_button_release()
				}}
			>
				<T.RingGeometry
					args={[INNER_RADIUS, OUTER_RADIUS, THETA_SEGMENTS, 1, THETA_START, THETA_LENGTH]}
				/>
				{@const lit = button_lit(button)}
				{@const dim = button_dim(button)}
				{@const active = is_lit(button.color)}
				<T.MeshStandardMaterial
					color={active ? lit : dim}
					emissive={active ? lit : '#000000'}
					emissiveIntensity={emissive_intensity}
				/>
			</T.Mesh>
		</T.Group>
	{/each}

	<T.Mesh
		onclick={() => {
			game_board_input.on_center_click()
		}}
	>
		<T.CircleGeometry args={[CENTER_RADIUS, CIRCLE_SEGMENTS]} />
		<T.MeshStandardMaterial color="#222222" roughness={CENTER_ROUGHNESS} />
	</T.Mesh>

	<T.Group position={[0, 0, BOARD_LABEL_Z]}>
		<Text
			text={center_text}
			font={current_font}
			fontSize={current_font_size}
			lineHeight={current_line_height}
			color="#ffffff"
			anchorX="center"
			anchorY="middle"
		/>
	</T.Group>
</T.Group>
