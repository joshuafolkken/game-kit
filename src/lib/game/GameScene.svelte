<script lang="ts">
	import { Canvas } from '@threlte/core'
	import { Suspense } from '@threlte/extras'
	import { audio } from '$lib/game/audio'
	import ControlsScene from '$lib/game/controls/ControlsScene.svelte'
	import VirtualJoystick from '$lib/game/controls/VirtualJoystick.svelte'
	import CrtChromaticFilter from '$lib/game/CrtChromaticFilter.svelte'
	import CrtDitherPass from '$lib/game/CrtDitherPass.svelte'
	import { device } from '$lib/game/device.svelte'
	import { fullscreen } from '$lib/game/fullscreen.svelte'
	import { input } from '$lib/game/input/input.svelte'
	import { loading } from '$lib/game/loading.svelte'
	import { compute_pixel_dpr } from '$lib/game/pixel-dpr'
	import { session } from '$lib/game/session.svelte'
	import { game_state } from '$lib/game/state.svelte'
	import { fullscreen_switch_input } from '$lib/game/switch/fullscreen-switch-input'
	import type { Snippet } from 'svelte'
	import { onMount } from 'svelte'
	import { WebGLRenderer } from 'three'

	// DPR is calibrated so the shorter buffer edge targets TARGET_SHORT_EDGE_PIXELS for
	// consistent dot density across landscape / portrait / narrow viewports.
	// MIN_SHORT_EDGE_PIXELS acts as a hard floor that can override MAX_DPR when the viewport
	// is extremely small, ensuring the buffer never drops below a usable resolution.
	const TARGET_SHORT_EDGE_PIXELS = 256
	const MIN_SHORT_EDGE_PIXELS = 128
	const MAX_DPR = 1
	const FALLBACK_DPR = 1 / 3

	// CRT scanlines: one scanline every N rendered dots. 1 pairs with a 256-pixel short
	// edge to produce ~256 visible scanlines — same density as the X68000's 256-line CRT
	// modes and close to NTSC 240p (240 visible) for that "real CRT" look.
	const DOTS_PER_SCANLINE = 1

	function create_renderer_no_aa(canvas: HTMLCanvasElement): WebGLRenderer {
		return new WebGLRenderer({
			canvas,
			powerPreference: 'high-performance',
			antialias: false,
			alpha: true,
		})
	}

	interface Props {
		children?: Snippet
		hint_text?: string
		on_start?: () => void
		label_jump: string
		label_game: string
		label_game_started: string
		label_pause: string
	}

	let {
		children,
		hint_text = '',
		on_start,
		label_jump,
		label_game,
		label_game_started,
		label_pause,
	}: Props = $props()

	let container: HTMLElement
	let container_width = $state(0)
	let container_height = $state(0)
	let pixel_dpr = $derived(
		compute_pixel_dpr(
			container_width,
			container_height,
			TARGET_SHORT_EDGE_PIXELS,
			MIN_SHORT_EDGE_PIXELS,
			MAX_DPR,
			FALLBACK_DPR,
		),
	)
	let device_pixel_ratio = $state(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
	// Snap scanline period to an integer number of device pixels so every cycle samples the
	// same fractional offset of the gradient — eliminates the moiré that fractional CSS-pixel
	// periods cause when adjacent cycles land on different device-pixel phases.
	let scanline_period_css = $derived.by(() => {
		const raw_css = DOTS_PER_SCANLINE / pixel_dpr
		const dpr = device_pixel_ratio || 1
		const snapped_device_px = Math.max(1, Math.round(raw_css * dpr))
		return snapped_device_px / dpr
	})
	let is_dragging_look = $derived(input.is_dragging_look)
	let drag_start_x = $derived(input.drag_start_x)
	let drag_start_y = $derived(input.drag_start_y)
	let is_pseudo_fullscreen = $derived(fullscreen.is_pseudo_fullscreen)
	let is_started = $derived(session.is_session_started)
	let is_touch = $derived(device.is_touch_primary)
	let game_status = $derived(is_started ? label_game_started : '')
	let is_alt = $derived(game_state.is_alt)

	function start_game(): void {
		if (session.is_session_started) return
		audio.init_audio()
		if (container && device.is_touch_primary) void fullscreen.request(container)
		session.start_session()
		on_start?.()
	}

	function on_pause_click(event: MouseEvent): void {
		event.stopPropagation()
		session.reset_session()
	}

	function on_key_down(event: KeyboardEvent): void {
		if (event.key === 'Escape' || event.key === 'z' || event.key === 'Z') {
			if (session.is_session_started) {
				event.preventDefault()
				session.reset_session()
			}
			return
		}
		if (event.key !== 'Enter') return
		event.preventDefault()
		start_game()
	}

	function on_scene_loaded(): void {
		loading.set_step('ready')
		loading.mark_ready()
	}

	$effect(() => {
		function update_dpr(): void {
			device_pixel_ratio = window.devicePixelRatio || 1
		}
		update_dpr()
		window.addEventListener('resize', update_dpr)
		return function cleanup(): void {
			window.removeEventListener('resize', update_dpr)
		}
	})

	onMount(() => {
		loading.set_step('loading_assets')
		fullscreen_switch_input.set_container(container)
		const canvas_el = container.querySelector<HTMLCanvasElement>('canvas')
		if (!canvas_el)
			console.warn('[GameScene] No <canvas> found at mount — synthetic pointer events disabled')
		const cleanup_input = input.setup_listeners(canvas_el)
		const cleanup_fullscreen = fullscreen.setup_listeners()
		return function cleanup(): void {
			cleanup_input()
			cleanup_fullscreen()
			fullscreen_switch_input.set_container(null)
		}
	})
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="game-container"
	class:pseudo-fullscreen={is_pseudo_fullscreen}
	class:is-dragging-look={is_dragging_look}
	bind:this={container}
	bind:clientWidth={container_width}
	bind:clientHeight={container_height}
	role="application"
	tabindex="0"
	aria-label={label_game}
	onclick={start_game}
	onkeydown={on_key_down}
	data-testid="game-scene"
>
	<div role="status" class="sr-only">{game_status}</div>
	{#if is_started && is_touch}
		<button
			class="pause-btn"
			data-testid="pause-btn"
			aria-label={label_pause}
			onclick={on_pause_click}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				width="20"
				height="20"
				fill="currentColor"
				aria-hidden="true"
			>
				<rect x="5" y="4" width="4" height="16" rx="1"></rect>
				<rect x="15" y="4" width="4" height="16" rx="1"></rect>
			</svg>
		</button>
	{/if}
	{#if is_alt}
		<div class="cyber-glow" data-testid="cyber-glow" aria-hidden="true"></div>
	{/if}
	<div
		class="crt-overlay"
		data-testid="crt-overlay"
		aria-hidden="true"
		style:--scanline-period="{scanline_period_css}px"
	></div>
	<CrtChromaticFilter />
	<Canvas dpr={pixel_dpr} createRenderer={create_renderer_no_aa}>
		<Suspense onload={on_scene_loaded}>
			{@render children?.()}
			{#if !is_started}
				<ControlsScene {hint_text} {is_touch} />
			{/if}
		</Suspense>
		<CrtDitherPass />
	</Canvas>
	<VirtualJoystick {label_jump} show_jump={is_started} />
	{#if is_dragging_look}
		<svg
			class="fake-cursor"
			data-testid="fake-cursor"
			aria-hidden="true"
			width="20"
			height="20"
			viewBox="0 0 20 20"
			style:left="{drag_start_x}px"
			style:top="{drag_start_y}px"
		>
			<path
				d="M2 2 L2 16 L6 12 L9 18 L11 17 L8 11 L13 11 Z"
				fill="white"
				stroke="black"
				stroke-width="1"
				stroke-linejoin="round"
			></path>
		</svg>
	{/if}
</div>

<style>
	.game-container {
		position: relative;
		width: 100%;
		height: 100vh;
		height: 100dvh;
		background: #0d0d12;
	}

	.game-container :global(canvas) {
		image-rendering: pixelated;
		/* Color quantization + 4×4 Bayer ordered dithering is done GPU-side in <CrtDitherPass />
		   (see crt-dither.ts). CSS handles the subtle vibrance boost and chromatic aberration —
		   the latter runs on the upscaled, native-device-pixel bitmap so sub-pixel R/B offsets
		   actually resolve instead of snapping to dot-grid integers. */
		filter: contrast(0.9) saturate(1.8) brightness(1.1) url(#crt-chromatic);
		border-radius: clamp(12px, 3vmin, 28px);
	}

	.game-container.pseudo-fullscreen {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		height: 100dvh;
		z-index: 9999;
	}

	.game-container.is-dragging-look {
		cursor: none;
	}

	.fake-cursor {
		position: fixed;
		pointer-events: none;
		z-index: 100;
		transform: translate(-2px, -2px);
	}

	.pause-btn {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		z-index: 20;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.15);
		border: 1.5px solid rgba(255, 255, 255, 0.4);
		color: rgba(255, 255, 255, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: all;
		touch-action: manipulation;
		cursor: pointer;
	}

	.cyber-glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 5;
		background: radial-gradient(
			ellipse at center,
			rgba(255, 0, 255, 0.12) 0%,
			rgba(100, 0, 255, 0.06) 50%,
			transparent 70%
		);
		mix-blend-mode: screen;
		animation: cyber-pulse 2s ease-in-out infinite;
	}

	.crt-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 6;
		/* Match the canvas border-radius so scanlines and corner-darkening clip on the same curve. */
		border-radius: clamp(12px, 3vmin, 28px);
		/* Stack (top to bottom): glass-dome highlight → 4 corner darkening (curvature illusion) →
		   scanlines → center vignette. The 4 corners + center vignette together fake the
		   bulge of a CRT face without distorting actual canvas pixels. */
		background:
			radial-gradient(ellipse 65% 45% at 28% 22%, rgba(255, 255, 255, 0.06) 0%, transparent 60%),
			radial-gradient(circle at top left, rgba(0, 0, 0, 0.4) 0%, transparent 38%),
			radial-gradient(circle at top right, rgba(0, 0, 0, 0.4) 0%, transparent 38%),
			radial-gradient(circle at bottom left, rgba(0, 0, 0, 0.4) 0%, transparent 38%),
			radial-gradient(circle at bottom right, rgba(0, 0, 0, 0.4) 0%, transparent 38%),
			repeating-linear-gradient(
				0deg,
				rgba(0, 0, 0, 0.7),
				rgba(0, 0, 0, 0.7) calc(var(--scanline-period, 3px) / 2),
				transparent calc(var(--scanline-period, 3px) / 2),
				transparent var(--scanline-period, 3px)
			),
			radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.3) 100%);
	}

	@keyframes cyber-pulse {
		0%,
		100% {
			opacity: 0.7;
		}
		50% {
			opacity: 1;
		}
	}
</style>
