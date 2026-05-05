<script lang="ts">
	import { T } from '@threlte/core'
	import { Text } from '@threlte/extras'
	import { fonts } from '$lib/game/fonts'
	import { BOARD_LABEL_Z, BOARD_Y, BOARD_Z } from './board-config'
	import { simon_board_input } from './simon-board-input'
	import type { ButtonColor, SimonBoardData } from './types'

	const INNER_RADIUS = 0.3
	const OUTER_RADIUS = 0.7
	const THETA_SEGMENTS = 32
	const CIRCLE_SEGMENTS = 32
	const BACKING_SEGMENTS = 64
	const BUTTON_GAP = Math.PI / 36
	const THETA_START = BUTTON_GAP
	const THETA_LENGTH = Math.PI / 2 - BUTTON_GAP * 2
	const BACKING_RADIUS = 0.85
	const CENTER_RADIUS = 0.22
	const BACKING_Z = -0.01
	const FONT_SIZE = 0.08
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
		simon_data: SimonBoardData
		is_alt: boolean
		text_gameover: string
		text_round: string
		text_start: string
	}

	const BUTTON_CONFIGS = [
		{
			color: 'green' as ButtonColor,
			rotation: 0,
			lit_color: '#00ff00',
			dim_color: '#003300',
			cyber_lit_color: '#00ffaa',
			cyber_dim_color: '#005533',
		},
		{
			color: 'red' as ButtonColor,
			rotation: Math.PI / 2,
			lit_color: '#ff2222',
			dim_color: '#330000',
			cyber_lit_color: '#ff0088',
			cyber_dim_color: '#550022',
		},
		{
			color: 'yellow' as ButtonColor,
			rotation: Math.PI,
			lit_color: '#ffff00',
			dim_color: '#333300',
			cyber_lit_color: '#ffff00',
			cyber_dim_color: '#555500',
		},
		{
			color: 'blue' as ButtonColor,
			rotation: -Math.PI / 2,
			lit_color: '#2266ff',
			dim_color: '#001133',
			cyber_lit_color: '#00ccff',
			cyber_dim_color: '#003355',
		},
	] as const satisfies readonly ButtonConfig[]

	let { simon_data, is_alt, text_gameover, text_round, text_start }: Props = $props()

	function is_lit(color: ButtonColor): boolean {
		return (
			simon_data.active_color === color ||
			simon_data.pressed_color === color ||
			simon_data.flash_colors.includes(color)
		)
	}

	function btn_lit(btn: ButtonConfig): string {
		return is_alt ? btn.cyber_lit_color : btn.lit_color
	}

	function btn_dim(btn: ButtonConfig): string {
		return is_alt ? btn.cyber_dim_color : btn.dim_color
	}

	function get_center_text(): string {
		if (simon_data.phase === 'gameover') return text_gameover
		if (simon_data.round > 0) return `${text_round} ${simon_data.round}`
		return text_start
	}

	let center_text = $derived(get_center_text())
	let emissive_intensity = $derived(
		(is_alt ? CYBER_EMISSIVE_INTENSITY : EMISSIVE_INTENSITY) * simon_data.flash_intensity,
	)
	let current_font = $derived(fonts.get_font(is_alt))
	let current_font_size = $derived(FONT_SIZE * fonts.get_font_size_multiplier(is_alt))
</script>

<T.Group position={[0, BOARD_Y, BOARD_Z]}>
	<T.Mesh position.z={BACKING_Z}>
		<T.CircleGeometry args={[BACKING_RADIUS, BACKING_SEGMENTS]} />
		<T.MeshStandardMaterial color="#111111" roughness={0.8} />
	</T.Mesh>

	{#each BUTTON_CONFIGS as btn (btn.color)}
		<T.Group rotation.z={btn.rotation}>
			<T.Mesh
				onpointerdown={(e: { nativeEvent: { button: number } }) =>
					simon_board_input.on_button_pointer_down(e, btn.color)}
				onpointerup={() => simon_board_input.on_button_release()}
				onpointerleave={() => simon_board_input.on_button_release()}
			>
				<T.RingGeometry
					args={[INNER_RADIUS, OUTER_RADIUS, THETA_SEGMENTS, 1, THETA_START, THETA_LENGTH]}
				/>
				{@const lit = btn_lit(btn)}
				{@const dim = btn_dim(btn)}
				{@const active = is_lit(btn.color)}
				<T.MeshStandardMaterial
					color={active ? lit : dim}
					emissive={active ? lit : '#000000'}
					emissiveIntensity={emissive_intensity}
				/>
			</T.Mesh>
		</T.Group>
	{/each}

	<T.Mesh onclick={() => simon_board_input.on_center_click()}>
		<T.CircleGeometry args={[CENTER_RADIUS, CIRCLE_SEGMENTS]} />
		<T.MeshStandardMaterial color="#222222" roughness={0.5} />
	</T.Mesh>

	<T.Group position={[0, 0, BOARD_LABEL_Z]}>
		<Text
			text={center_text}
			font={current_font}
			fontSize={current_font_size}
			color="#ffffff"
			anchorX="center"
			anchorY="middle"
		/>
	</T.Group>
</T.Group>
