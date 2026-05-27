<script lang="ts">
	import { T, useThrelte } from '@threlte/core'
	import { Text } from '@threlte/extras'
	import { compute_fit_scale } from '$lib/game-kit/controls/controls-fit'
	import { crt } from '$lib/game-kit/crt.svelte'
	import { fonts } from '$lib/game-kit/fonts'
	import { onMount } from 'svelte'
	import { BackSide, CanvasTexture, DoubleSide, FrontSide, NearestFilter } from 'three'

	const BACKDROP_X = 0
	const BACKDROP_Y = 1.6
	const BACKDROP_Z = 1.35
	const BACKDROP_W = 6
	const BACKDROP_H = 3.6
	const BACKDROP_COLOR = '#000000'
	const BACKDROP_OPACITY = 0.9

	const HINT_X = 0
	const HINT_Y = 2.3
	const HINT_Z = 1.55
	const HINT_FONT_SIZE = 0.13
	const HINT_COLOR = '#ffffff'

	const PC_GROUP_Y = 1.3
	const PC_GROUP_Z = 1.55

	const KEYBOARD_X = -0.35
	const KEYBOARD_W = 1.1
	const KEYBOARD_H = 1.3

	const MOUSE_X = 0.63
	// Shift the mouse plane down so the mouse body bottom aligns with the keyboard Z-key bottom.
	// Z-key bottom (keyboard plane y) ≈ -0.635; mouse body bottom offset (mouse plane y) ≈ -0.39;
	// MOUSE_Y = -0.635 - (-0.39) ≈ -0.245.
	const MOUSE_Y = -0.245
	const MOUSE_W = 0.555
	const MOUSE_H = 1.04

	const HALF_DIVISOR = 2
	const KEYBOARD_HALF_W = KEYBOARD_W / HALF_DIVISOR
	const MOUSE_HALF_W = MOUSE_W / HALF_DIVISOR
	const PC_NATURAL_HALF_SPAN = Math.max(
		Math.abs(KEYBOARD_X) + KEYBOARD_HALF_W,
		Math.abs(MOUSE_X) + MOUSE_HALF_W,
	)
	const PC_NATURAL_SPAN = PC_NATURAL_HALF_SPAN * HALF_DIVISOR
	// Minimum world-unit side padding so the keyboard never sticks to the screen edge on narrow viewports.
	const PC_MIN_SIDE_PADDING = 0.138

	const TOUCH_Y = 1.6
	const TOUCH_Z = 1.55
	const TOUCH_WIDTH_RATIO = 0.85
	const TOUCH_VIEW_HEIGHT_AT_PLANE = 2.45
	const TOUCH_SVG_ASPECT = 240 / 90

	const KEYBOARD_TEX_W = 512
	const KEYBOARD_TEX_H = 608
	const MOUSE_TEX_W = 256
	const MOUSE_TEX_H = 480
	const TOUCH_TEX_W = 1024
	const TOUCH_TEX_H = 384

	// Three.js sorts transparent objects by camera distance, not by Z position.
	// We split the backdrop into two single-sided panels and sandwich the icons
	// between them so the backdrop dims the icons from whichever side the camera faces.
	// All values are >0 so the controls layer renders after default-renderOrder
	// transparent scene content (e.g. Troika Text credits on the floor).
	const BACKDROP_RENDER_ORDER = 1
	const FOREGROUND_RENDER_ORDER = 2
	const BACKDROP_BACK_RENDER_ORDER = 3

	interface Props {
		hint_text: string
		is_touch: boolean
	}

	const { hint_text, is_touch }: Props = $props()

	const { size } = useThrelte()

	// Font is driven by CRT state — CRT ON pairs the retro pixel font with the scanline
	// aesthetic; CRT OFF switches to the modern Orbitron font.
	const should_use_alt_font = $derived(!crt.is_crt_enabled)
	const current_font = $derived(fonts.get_font(should_use_alt_font))
	const current_font_size_mul = $derived(fonts.get_font_size_multiplier(should_use_alt_font))
	const viewport_aspect = $derived($size.width / $size.height)
	const view_width_at_plane = $derived(TOUCH_VIEW_HEIGHT_AT_PLANE * viewport_aspect)
	const touch_world_width = $derived(view_width_at_plane * TOUCH_WIDTH_RATIO)
	const touch_world_height = $derived(touch_world_width / TOUCH_SVG_ASPECT)
	const pc_scale = $derived(
		compute_fit_scale(view_width_at_plane, PC_NATURAL_SPAN, PC_MIN_SIDE_PADDING),
	)

	const KEYBOARD_VIEWBOX_W = 148
	const KEYBOARD_VIEWBOX_H = 176
	const KEYBOARD_LETTER_Z = 0.001

	const KEYBOARD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 176" fill="none">
<rect x="54" y="22" width="40" height="32" rx="5" fill="rgba(120,80,255,0.15)" stroke="rgba(160,120,255,0.8)" stroke-width="1.5"/>
<rect x="2" y="66" width="40" height="32" rx="5" fill="rgba(120,80,255,0.15)" stroke="rgba(160,120,255,0.8)" stroke-width="1.5"/>
<rect x="54" y="66" width="40" height="32" rx="5" fill="rgba(120,80,255,0.15)" stroke="rgba(160,120,255,0.8)" stroke-width="1.5"/>
<rect x="106" y="66" width="40" height="32" rx="5" fill="rgba(120,80,255,0.15)" stroke="rgba(160,120,255,0.8)" stroke-width="1.5"/>
<g><rect x="2" y="110" width="144" height="28" rx="5" fill="rgba(120,80,255,0.15)" stroke="rgba(160,120,255,0.8)" stroke-width="1.5"/><polyline points="67,130 74,123 81,130" stroke="rgba(200,180,255,0.9)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="67,125 74,118 81,125" stroke="rgba(200,180,255,0.9)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.55"/></g>
<rect x="2" y="150" width="56" height="24" rx="5" fill="rgba(80,60,160,0.1)" stroke="rgba(120,100,200,0.5)" stroke-width="1.5"/>
<rect x="90" y="150" width="56" height="24" rx="5" fill="rgba(80,60,160,0.1)" stroke="rgba(120,100,200,0.5)" stroke-width="1.5"/>
</svg>`

	interface KeyboardLetter {
		text: string
		vx: number
		vy: number
		vsize: number
		color: string
		opacity: number
	}

	const KEYBOARD_LETTERS: ReadonlyArray<KeyboardLetter> = [
		{ text: 'W', vx: 74, vy: 38, vsize: 16, color: '#c8b4ff', opacity: 0.95 },
		{ text: 'A', vx: 22, vy: 82, vsize: 16, color: '#c8b4ff', opacity: 0.95 },
		{ text: 'S', vx: 74, vy: 82, vsize: 16, color: '#c8b4ff', opacity: 0.95 },
		{ text: 'D', vx: 126, vy: 82, vsize: 16, color: '#c8b4ff', opacity: 0.95 },
		{ text: 'ESC', vx: 30, vy: 162, vsize: 12, color: '#a08cdc', opacity: 0.7 },
		{ text: '/', vx: 74, vy: 162, vsize: 11, color: '#7864c8', opacity: 0.5 },
		{ text: 'Z', vx: 118, vy: 162, vsize: 13, color: '#a08cdc', opacity: 0.7 },
	]

	function viewbox_x_to_plane(vx: number): number {
		return ((vx - KEYBOARD_VIEWBOX_W / HALF_DIVISOR) / KEYBOARD_VIEWBOX_W) * KEYBOARD_W
	}

	function viewbox_y_to_plane(vy: number): number {
		return -((vy - KEYBOARD_VIEWBOX_H / HALF_DIVISOR) / KEYBOARD_VIEWBOX_H) * KEYBOARD_H
	}

	function viewbox_size_to_world(vsize: number, size_mul: number): number {
		return (vsize / KEYBOARD_VIEWBOX_H) * KEYBOARD_H * size_mul
	}

	const MOUSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="13 -7 64 120" fill="none">
<rect x="15" y="8" width="60" height="90" rx="30" fill="rgba(80,60,180,0.12)" stroke="rgba(140,110,255,0.7)" stroke-width="1"/>
<line x1="45" y1="8" x2="45" y2="44" stroke="rgba(140,110,255,0.5)" stroke-width="1"/>
<path d="M18 44 Q15 44 15 44 L75 44 Q75 44 75 44" stroke="rgba(140,110,255,0.5)" stroke-width="1"/>
<g><circle cx="30" cy="28" r="7" fill="rgba(140,100,255,0.2)" stroke="rgba(160,130,255,0.7)" stroke-width="1"/><circle cx="30" cy="28" r="2.5" fill="rgba(200,180,255,0.9)"/></g>
<g><circle cx="60" cy="28" r="7" fill="rgba(140,100,255,0.2)" stroke="rgba(160,130,255,0.7)" stroke-width="1"/><circle cx="57" cy="28" r="1.5" fill="rgba(200,180,255,0.9)"/><circle cx="60" cy="28" r="1.5" fill="rgba(200,180,255,0.9)"/><circle cx="63" cy="28" r="1.5" fill="rgba(200,180,255,0.9)"/></g>
</svg>`

	const TOUCH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 90" fill="none">
<rect x="2" y="2" width="236" height="86" rx="6" fill="rgba(120,80,255,0.05)" stroke="rgba(160,120,255,0.5)" stroke-width="1.5"/>
<line x1="120" y1="2" x2="120" y2="88" stroke="rgba(140,110,255,0.5)" stroke-width="0.8" stroke-dasharray="3 3"/>
<g transform="translate(5,4)">
<path d="M38 56 A22 22 0 1 1 72 56" stroke="rgba(160,130,255,0.7)" stroke-width="2" stroke-linecap="round" fill="none"/>
<polyline points="72,50 72,57 79,57" stroke="rgba(160,130,255,0.7)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<circle cx="55" cy="56" r="6" fill="rgba(140,100,255,0.2)" stroke="rgba(160,130,255,0.7)" stroke-width="1.5"/>
<circle cx="55" cy="56" r="2" fill="rgba(200,180,255,0.9)"/>
</g>
<g transform="translate(125,4)">
<path d="M38 56 A22 22 0 1 1 72 56" stroke="rgba(160,130,255,0.7)" stroke-width="2" stroke-linecap="round" fill="none"/>
<polyline points="72,50 72,57 79,57" stroke="rgba(160,130,255,0.7)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<circle cx="55" cy="56" r="6" fill="rgba(140,100,255,0.2)" stroke="rgba(160,130,255,0.7)" stroke-width="1.5"/>
<circle cx="55" cy="56" r="2" fill="rgba(200,180,255,0.9)"/>
</g>
</svg>`

	let keyboard_tex = $state<CanvasTexture | null>(null)
	let mouse_tex = $state<CanvasTexture | null>(null)
	let touch_tex = $state<CanvasTexture | null>(null)

	async function svg_to_texture(svg: string, tex_w: number, tex_h: number): Promise<CanvasTexture> {
		const blob = new Blob([svg], { type: 'image/svg+xml' })
		const url = URL.createObjectURL(blob)

		try {
			const img = new Image()

			img.src = url
			await new Promise<void>(function wait(resolve, reject): void {
				img.onload = (): void => resolve()
				img.onerror = (): void => reject(new Error('svg load failed'))
			})
			const canvas = document.createElement('canvas')

			canvas.width = tex_w
			canvas.height = tex_h
			const context_2d = canvas.getContext('2d')
			if (!context_2d) throw new Error('canvas 2d context unavailable')
			context_2d.clearRect(0, 0, tex_w, tex_h)
			context_2d.drawImage(img, 0, 0, tex_w, tex_h)
			const tex = new CanvasTexture(canvas)

			tex.minFilter = NearestFilter
			tex.magFilter = NearestFilter

			return tex
		} finally {
			URL.revokeObjectURL(url)
		}
	}

	onMount(function setup(): () => void {
		let alive = true

		void (async function load_textures(): Promise<void> {
			try {
				const [kb, ms, tc] = await Promise.all([
					svg_to_texture(KEYBOARD_SVG, KEYBOARD_TEX_W, KEYBOARD_TEX_H),
					svg_to_texture(MOUSE_SVG, MOUSE_TEX_W, MOUSE_TEX_H),
					svg_to_texture(TOUCH_SVG, TOUCH_TEX_W, TOUCH_TEX_H),
				])

				if (!alive) {
					kb.dispose()
					ms.dispose()
					tc.dispose()

					return
				}

				keyboard_tex = kb
				mouse_tex = ms
				touch_tex = tc
			} catch (error) {
				console.warn('[ControlsScene] failed to load control hint textures', error)
			}
		})()

		return function cleanup(): void {
			alive = false
			keyboard_tex?.dispose()
			mouse_tex?.dispose()
			touch_tex?.dispose()
			keyboard_tex = null
			mouse_tex = null
			touch_tex = null
		}
	})
</script>

<T.Mesh position={[BACKDROP_X, BACKDROP_Y, BACKDROP_Z]} renderOrder={BACKDROP_RENDER_ORDER}>
	<T.PlaneGeometry args={[BACKDROP_W, BACKDROP_H]} />
	<T.MeshBasicMaterial
		color={BACKDROP_COLOR}
		transparent
		opacity={BACKDROP_OPACITY}
		side={FrontSide}
		toneMapped={false}
		depthWrite={false}
	/>
</T.Mesh>

<T.Mesh position={[BACKDROP_X, BACKDROP_Y, BACKDROP_Z]} renderOrder={BACKDROP_BACK_RENDER_ORDER}>
	<T.PlaneGeometry args={[BACKDROP_W, BACKDROP_H]} />
	<T.MeshBasicMaterial
		color={BACKDROP_COLOR}
		transparent
		opacity={BACKDROP_OPACITY}
		side={BackSide}
		toneMapped={false}
		depthWrite={false}
	/>
</T.Mesh>

<T.Group position={[HINT_X, HINT_Y, HINT_Z]} scale={pc_scale}>
	<Text
		text={hint_text}
		font={current_font}
		fontSize={HINT_FONT_SIZE}
		color={HINT_COLOR}
		anchorX="center"
		anchorY="middle"
	/>
</T.Group>

{#if is_touch}
	{#if touch_tex}
		<T.Mesh position={[0, TOUCH_Y, TOUCH_Z]} renderOrder={FOREGROUND_RENDER_ORDER}>
			<T.PlaneGeometry args={[touch_world_width, touch_world_height]} />
			<T.MeshBasicMaterial
				map={touch_tex}
				transparent
				side={DoubleSide}
				toneMapped={false}
				depthWrite={false}
			/>
		</T.Mesh>
	{/if}
{:else}
	<T.Group position={[0, PC_GROUP_Y, PC_GROUP_Z]} scale={pc_scale}>
		{#if keyboard_tex}
			<T.Mesh position={[KEYBOARD_X, 0, 0]} renderOrder={FOREGROUND_RENDER_ORDER}>
				<T.PlaneGeometry args={[KEYBOARD_W, KEYBOARD_H]} />
				<T.MeshBasicMaterial
					map={keyboard_tex}
					transparent
					side={DoubleSide}
					toneMapped={false}
					depthWrite={false}
				/>
			</T.Mesh>
			{#each KEYBOARD_LETTERS as letter (letter.text)}
				<Text
					text={letter.text}
					font={current_font}
					fontSize={viewbox_size_to_world(letter.vsize, current_font_size_mul)}
					color={letter.color}
					fillOpacity={letter.opacity}
					position={[
						KEYBOARD_X + viewbox_x_to_plane(letter.vx),
						viewbox_y_to_plane(letter.vy),
						KEYBOARD_LETTER_Z,
					]}
					anchorX="center"
					anchorY="middle"
					renderOrder={FOREGROUND_RENDER_ORDER}
				/>
			{/each}
		{/if}
		{#if mouse_tex}
			<T.Mesh position={[MOUSE_X, MOUSE_Y, 0]} renderOrder={FOREGROUND_RENDER_ORDER}>
				<T.PlaneGeometry args={[MOUSE_W, MOUSE_H]} />
				<T.MeshBasicMaterial
					map={mouse_tex}
					transparent
					side={DoubleSide}
					toneMapped={false}
					depthWrite={false}
				/>
			</T.Mesh>
		{/if}
	</T.Group>
{/if}
