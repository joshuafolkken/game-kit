<script lang="ts">
	import { T } from '@threlte/core'
	import { Text } from '@threlte/extras'
	import { resolve_switch_colors, type SwitchColors } from '$lib/game-kit/switch/switch-colors'
	import {
		DEFAULT_SWITCH_GEOMETRY,
		FPS_BAR_1_H,
		FPS_BAR_2_H,
		FPS_BAR_3_H,
		FPS_BAR_BASE_Y,
		FPS_BAR_X_STEP,
		type SwitchGeometry,
		type SwitchIconType,
	} from '$lib/game-kit/switch/switch-config'
	import { onDestroy } from 'svelte'
	import { MeshStandardMaterial } from 'three'

	const CRT_LINES: ReadonlyArray<number> = [-1, 0, 1]

	type CornerSign = -1 | 1
	type BarAxis = 'h' | 'v'
	interface CornerBar {
		key: string
		px: number
		py: number
		w: number
		h: number
	}
	interface CornerGeom {
		arm: number
		thickness: number
		pos: number
		arm_center: number
	}

	function make_bar(sx: CornerSign, sy: CornerSign, axis: BarAxis, g: CornerGeom): CornerBar {
		const is_h = axis === 'h'

		return {
			key: `${axis}${sx}${sy}`,
			px: sx * (is_h ? g.arm_center : g.pos),
			py: sy * (is_h ? g.pos : g.arm_center),
			w: is_h ? g.arm : g.thickness,
			h: is_h ? g.thickness : g.arm,
		}
	}

	interface FpsBar {
		key: number
		x: number
		h: number
	}

	const CORNER_SIGNS: ReadonlyArray<CornerSign> = [-1, 1]
	const HIT_AREA_PADDING = 0.12
	const FPS_BARS: ReadonlyArray<FpsBar> = [
		{ key: 0, x: -FPS_BAR_X_STEP, h: FPS_BAR_1_H },
		{ key: 1, x: 0, h: FPS_BAR_2_H },
		{ key: 2, x: FPS_BAR_X_STEP, h: FPS_BAR_3_H },
	]

	interface Props {
		position_x: number
		is_active: boolean
		icon_type: SwitchIconType
		label: string
		font: string
		font_size_multiplier: number
		onclick: () => void
		colors: SwitchColors
		geometry?: SwitchGeometry
		panel_text?: string | undefined
	}

	const {
		position_x,
		is_active,
		icon_type,
		label,
		font,
		font_size_multiplier,
		onclick,
		colors,
		geometry = {},
		panel_text,
	}: Props = $props()

	const geom: Required<SwitchGeometry> = $derived({ ...DEFAULT_SWITCH_GEOMETRY, ...geometry })
	const border_pos = $derived(geom.panel_size / 2 - geom.border_thickness / 2)
	const corner_geom: CornerGeom = $derived({
		arm: geom.corner_arm,
		thickness: geom.corner_thickness,
		pos: geom.corner_pos,
		arm_center: geom.corner_pos - geom.corner_arm / 2,
	})
	const corner_bars = $derived(
		CORNER_SIGNS.flatMap(function (sx) {
			return CORNER_SIGNS.flatMap(function (sy) {
				return [make_bar(sx, sy, 'h', corner_geom), make_bar(sx, sy, 'v', corner_geom)]
			})
		}),
	)
	const hit_area_w = $derived(geom.panel_size + HIT_AREA_PADDING)
	const hit_area_h = $derived(geom.panel_size + HIT_AREA_PADDING)

	const resolved = $derived(resolve_switch_colors(colors, is_active))
	const panel_opacity = $derived(
		is_active ? geom.panel_opacity_active : geom.panel_opacity_inactive,
	)
	const current_font_size = $derived(geom.label_font_size * font_size_multiplier)
	const current_panel_text_font_size = $derived(geom.panel_text_font_size * font_size_multiplier)

	// MeshStandardMaterial for panel_text so the digits emit light at the same color and
	// intensity as the border frame ("枠"). Troika Text's default MeshBasicMaterial has
	// no emissive, leaving the value digits visually flat against the slightly-emissive
	// translucent panel face — hard to read. Matching the border's ring_emissive (=4 when
	// active) makes the text glow like the frame and pop off the background.
	const panel_text_material = new MeshStandardMaterial()
	$effect(() => {
		panel_text_material.color.set(resolved.current_color)
		panel_text_material.emissive.set(resolved.current_color)
		panel_text_material.emissiveIntensity = resolved.ring_emissive
	})
	onDestroy(() => {
		panel_text_material.dispose()
	})
</script>

<T.Group position={[position_x, geom.switch_y, geom.switch_z]}>
	<!-- Translucent holographic panel face -->
	<T.Mesh>
		<T.BoxGeometry args={[geom.panel_size, geom.panel_size, geom.panel_depth]} />
		<T.MeshStandardMaterial
			color={resolved.current_color}
			emissive={resolved.current_color}
			emissiveIntensity={resolved.housing_emissive}
			transparent={true}
			opacity={panel_opacity}
		/>
	</T.Mesh>

	<!-- Glowing border frame (top, bottom, left, right bars) -->
	{#each [-1, 1] as side (side)}
		<T.Mesh position={[0, side * border_pos, 0]}>
			<T.BoxGeometry args={[geom.panel_size, geom.border_thickness, geom.border_depth]} />
			<T.MeshStandardMaterial
				color={resolved.current_color}
				emissive={resolved.current_color}
				emissiveIntensity={resolved.ring_emissive}
			/>
		</T.Mesh>
		<T.Mesh position={[side * border_pos, 0, 0]}>
			<T.BoxGeometry args={[geom.border_thickness, geom.panel_size, geom.border_depth]} />
			<T.MeshStandardMaterial
				color={resolved.current_color}
				emissive={resolved.current_color}
				emissiveIntensity={resolved.ring_emissive}
			/>
		</T.Mesh>
	{/each}

	{#if icon_type === 'cyber'}
		<!-- Outer hexagonal ring -->
		<T.Mesh position.z={geom.cyber_icon_z}>
			<T.TorusGeometry
				args={[
					geom.cyber_outer_ring_r,
					geom.cyber_outer_ring_tube,
					geom.cyber_ring_radial,
					geom.cyber_ring_tubular,
				]}
			/>
			<T.MeshStandardMaterial
				color={resolved.current_color}
				emissive={resolved.current_color}
				emissiveIntensity={resolved.ring_emissive}
			/>
		</T.Mesh>
		<!-- Inner hexagonal ring rotated 30° -->
		<T.Mesh position.z={geom.cyber_icon_z} rotation.z={geom.cyber_inner_ring_rotation}>
			<T.TorusGeometry
				args={[
					geom.cyber_inner_ring_r,
					geom.cyber_inner_ring_tube,
					geom.cyber_ring_radial,
					geom.cyber_ring_tubular,
				]}
			/>
			<T.MeshStandardMaterial
				color={resolved.current_color}
				emissive={resolved.current_color}
				emissiveIntensity={resolved.orb_emissive}
			/>
		</T.Mesh>
		<!-- Center orb -->
		<T.Mesh position.z={geom.cyber_icon_z}>
			<T.SphereGeometry
				args={[geom.cyber_orb_r, geom.cyber_orb_segments, geom.cyber_orb_segments]}
			/>
			<T.MeshStandardMaterial
				color={resolved.current_color}
				emissive={resolved.current_color}
				emissiveIntensity={resolved.orb_emissive}
			/>
		</T.Mesh>
	{:else if icon_type === 'fps'}
		<!-- FPS icon: 3 ascending performance bars -->
		{#each FPS_BARS as bar (bar.key)}
			<T.Mesh position={[bar.x, FPS_BAR_BASE_Y + bar.h / 2, geom.fps_icon_z]}>
				<T.BoxGeometry args={[geom.fps_bar_width, bar.h, geom.fps_bar_depth]} />
				<T.MeshStandardMaterial
					color={resolved.current_color}
					emissive={resolved.current_color}
					emissiveIntensity={resolved.ring_emissive}
				/>
			</T.Mesh>
		{/each}
	{:else if icon_type === 'crt'}
		<!-- CRT icon: 3 horizontal scanlines -->
		{#each CRT_LINES as line (line)}
			<T.Mesh position={[0, line * geom.crt_line_y_step, geom.crt_icon_z]}>
				<T.BoxGeometry args={[geom.crt_line_w, geom.crt_line_h, geom.crt_line_d]} />
				<T.MeshStandardMaterial
					color={resolved.current_color}
					emissive={resolved.current_color}
					emissiveIntensity={resolved.ring_emissive}
				/>
			</T.Mesh>
		{/each}
	{:else if icon_type === 'fullscreen'}
		<!-- Fullscreen icon: 4 corner L-brackets -->
		{#each corner_bars as bar (bar.key)}
			<T.Mesh position={[bar.px, bar.py, geom.fullscreen_icon_z]}>
				<T.BoxGeometry args={[bar.w, bar.h, geom.corner_depth]} />
				<T.MeshStandardMaterial
					color={resolved.current_color}
					emissive={resolved.current_color}
					emissiveIntensity={resolved.orb_emissive}
				/>
			</T.Mesh>
		{/each}
	{/if}

	<!-- Optional text inside panel (e.g. FPS value) -->
	{#if panel_text !== undefined}
		<T.Group position={[0, geom.panel_text_y, geom.panel_text_z]}>
			<Text
				text={panel_text}
				{font}
				fontSize={current_panel_text_font_size}
				material={panel_text_material}
				anchorX="center"
				anchorY="middle"
			/>
		</T.Group>
	{/if}

	<!-- Point light for active glow -->
	{#if is_active}
		<T.PointLight
			position.z={geom.active_light_z}
			color={resolved.current_color}
			intensity={geom.active_light_intensity}
			distance={geom.active_light_distance}
		/>
	{/if}

	<!-- Invisible hit area for click detection -->
	<T.Mesh position.z={geom.hit_area_z} {onclick}>
		<T.BoxGeometry args={[hit_area_w, hit_area_h, geom.hit_area_depth]} />
		<T.MeshBasicMaterial transparent={true} opacity={0} depthWrite={false} />
	</T.Mesh>

	<!-- Label below panel -->
	<T.Group position={[0, -geom.label_y_offset, geom.label_z]}>
		<Text
			text={label}
			{font}
			fontSize={current_font_size}
			color="#ffffff"
			anchorX="center"
			anchorY="middle"
		/>
	</T.Group>
</T.Group>
