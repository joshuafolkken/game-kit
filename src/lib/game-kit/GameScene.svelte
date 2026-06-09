<script lang="ts">
	import { Canvas } from '@threlte/core'
	import { Suspense } from '@threlte/extras'
	import { should_use_antialias } from '$lib/game-kit/antialias'
	import { audio } from '$lib/game-kit/audio'
	import ControlsScene from '$lib/game-kit/controls/ControlsScene.svelte'
	import VirtualJoystick from '$lib/game-kit/controls/VirtualJoystick.svelte'
	import { crt } from '$lib/game-kit/Crt.svelte'
	import CrtChromaticFilter from '$lib/game-kit/CrtChromaticFilter.svelte'
	import CrtDitherPass from '$lib/game-kit/CrtDitherPass.svelte'
	import { device } from '$lib/game-kit/Device.svelte'
	import { fullscreen } from '$lib/game-kit/Fullscreen.svelte'
	import { input } from '$lib/game-kit/input/Input.svelte'
	import { loading } from '$lib/game-kit/Loading.svelte'
	import { compute_pixel_dpr } from '$lib/game-kit/pixel-dpr'
	import { session } from '$lib/game-kit/Session.svelte'
	import { game_state } from '$lib/game-kit/State.svelte'
	import { fullscreen_switch_input } from '$lib/game-kit/switch/fullscreen-switch-input'
	import { onMount, type Snippet } from 'svelte'
	import { WebGLRenderer } from 'three'

	// DPR is calibrated so the shorter buffer edge targets TARGET_SHORT_EDGE_PIXELS for
	// consistent dot density across landscape / portrait / narrow viewports.
	// MIN_SHORT_EDGE_PIXELS acts as a hard floor that can override MAX_DPR when the viewport
	// is extremely small, ensuring the buffer never drops below a usable resolution.
	const TARGET_SHORT_EDGE_PIXELS = 256
	const MIN_SHORT_EDGE_PIXELS = 128
	const MAX_DPR = 1
	const FALLBACK_DPR_DIVISOR = 3
	const FALLBACK_DPR = 1 / FALLBACK_DPR_DIVISOR

	function create_renderer_factory(
		antialias: boolean,
	): (canvas: HTMLCanvasElement) => WebGLRenderer {
		return function create_renderer(canvas: HTMLCanvasElement): WebGLRenderer {
			return new WebGLRenderer({
				canvas,
				powerPreference: 'high-performance',
				antialias,
				alpha: true,
			})
		}
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

	const {
		children,
		hint_text = '',
		on_start,
		label_jump,
		label_game,
		label_game_started,
		label_pause,
	}: Props = $props()

	// eslint-disable-next-line init-declarations -- assigned by Svelte bind:this
	let container: HTMLElement
	let container_width = $state(0)
	let container_height = $state(0)
	const pixel_dpr = $derived(
		compute_pixel_dpr(
			container_width,
			container_height,
			TARGET_SHORT_EDGE_PIXELS,
			MIN_SHORT_EDGE_PIXELS,
			MAX_DPR,
			FALLBACK_DPR,
		),
	)
	// lo_dpr is the low-res rendering scale passed to CrtDitherPass for Stage 1
	// (game scene + dither). The canvas itself runs at dpr=1 so Stage 2 (scanlines
	// + barrel) can operate at full CSS resolution for smooth CRT curves.
	const lo_dpr = $derived(pixel_dpr)
	const is_dragging_look = $derived(input.is_dragging_look)
	const drag_start_x = $derived(input.drag_start_x)
	const drag_start_y = $derived(input.drag_start_y)
	const is_pseudo_fullscreen = $derived(fullscreen.is_pseudo_fullscreen)
	const is_fullscreen_active = $derived(fullscreen.is_active)
	const is_started = $derived(session.is_session_started)
	const is_touch = $derived(device.is_touch_primary)
	const game_status = $derived(is_started ? label_game_started : '')
	const is_alt = $derived(game_state.is_alt)
	const is_crt_enabled = $derived(crt.is_crt_enabled)
	// AA is intentionally derived from is_touch only — not is_crt_enabled. Toggling RETRO must
	// not change the WebGL antialias setting, because that requires remounting <Canvas>, which
	// resets the player position. When RETRO is on the CRT post-process (dither + barrel)
	// overwrites the framebuffer with low-res pixels, so always-on AA is visually transparent.
	const is_aa_enabled = $derived(should_use_antialias(is_touch))

	function start_game(): void {
		if (session.is_session_started) return
		audio.init_audio()
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- `container` is a bind:this ref, typed non-null but undefined before mount
		if (container && device.is_touch_primary) void fullscreen.request(container)
		session.start_session()
		on_start?.()
	}

	function on_pause_click(event: MouseEvent): void {
		event.stopPropagation()
		session.reset_session()
	}

	function on_key_down(event: KeyboardEvent): void {
		if (['Escape', 'z', 'Z'].includes(event.key)) {
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

	onMount(() => {
		loading.set_step('loading_assets')
		fullscreen_switch_input.set_container(container)
		const canvas_element = container.querySelector<HTMLCanvasElement>('canvas')

		if (!canvas_element) {
			// eslint-disable-next-line no-console -- console.warn is the standard diagnostic channel for missing-DOM warnings; not a candidate for a logger
			console.warn('[GameScene] No <canvas> found at mount — synthetic pointer events disabled')
		}

		const cleanup_input = input.setup_listeners(canvas_element)
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
	class:is-fullscreen={is_fullscreen_active}
	class:is-dragging-look={is_dragging_look}
	class:crt-active={is_crt_enabled}
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
	<div role="status" class="visually-hidden">{game_status}</div>
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
	<div class="crt-overlay" data-testid="crt-overlay" aria-hidden="true"></div>
	{#if is_crt_enabled}
		<CrtChromaticFilter />
	{/if}
	<Canvas dpr={1} createRenderer={create_renderer_factory(is_aa_enabled)}>
		<Suspense onload={on_scene_loaded}>
			{@render children?.()}
			{#if !is_started}
				<ControlsScene {hint_text} {is_touch} />
			{/if}
		</Suspense>
		<CrtDitherPass {lo_dpr} />
	</Canvas>
	<VirtualJoystick {label_jump} should_show_jump={is_started} />
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
		/* viewport-fit=cover makes 100dvh cover the full physical viewport on iOS,
		   so the dark background extends behind the status bar / home indicator.
		   Padding keeps the canvas and inner UI inside the safe area until fullscreen
		   is engaged — see .game-container.is-fullscreen below. */
		box-sizing: border-box;
		padding-top: env(safe-area-inset-top, 0px);
		padding-right: env(safe-area-inset-right, 0px);
		padding-bottom: env(safe-area-inset-bottom, 0px);
		padding-left: env(safe-area-inset-left, 0px);
	}

	.game-container.is-fullscreen {
		/* When fullscreen is active (native or pseudo), drop the safe-area padding so the
		   canvas and overlays draw edge-to-edge into the OS UI region. */
		padding: 0;
	}

	.game-container :global(canvas) {
		border-radius: clamp(12px, 3vmin, 28px);
	}

	.game-container.crt-active :global(canvas) {
		/* WebGL pipeline handles nearest-neighbour upscale in the upscale pass —
		   no CSS pixelated scaling needed. CSS handles vibrance boost and chromatic
		   aberration on the already-upscaled, native-resolution bitmap. */
		filter: contrast(0.9) saturate(1.8) brightness(1.1) url(#crt-chromatic);
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

	/* Self-contained visually-hidden style for the status announcement, so consumers do not
	   need to add Tailwind `@source` for `dist/` to pick up `sr-only`. Tailwind v4 ignores
	   node_modules by default, and a missing `sr-only` would let the live-region text render
	   as a visible band at the top of the viewport. */
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.pause-btn {
		position: absolute;
		/* Absolute children are anchored to the padding edge (= screen edge) regardless of
		   the container's safe-area padding, so the button must add env() itself to stay
		   clear of the home indicator / gesture bar in fullscreen as well as default state. */
		bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
		right: calc(1rem + env(safe-area-inset-right, 0px));
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
		/* Match the canvas border-radius so corner-darkening clips on the same curve. */
		border-radius: clamp(12px, 3vmin, 28px);
		/* Stack: glass-dome highlight → 4 corner darkening (curvature illusion) → center
		   vignette. Scanlines live in the WebGL dither shader so they curve with the
		   barrel-distortion pass; this overlay carries only static glass-face cues. */
		background:
			radial-gradient(ellipse 65% 45% at 28% 22%, rgba(255, 255, 255, 0.06) 0%, transparent 60%),
			radial-gradient(circle at top left, rgba(0, 0, 0, 0.4) 0%, transparent 38%),
			radial-gradient(circle at top right, rgba(0, 0, 0, 0.4) 0%, transparent 38%),
			radial-gradient(circle at bottom left, rgba(0, 0, 0, 0.4) 0%, transparent 38%),
			radial-gradient(circle at bottom right, rgba(0, 0, 0, 0.4) 0%, transparent 38%),
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
