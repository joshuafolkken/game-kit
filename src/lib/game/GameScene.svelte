<script lang="ts">
	import { Canvas } from '@threlte/core'
	import { Suspense } from '@threlte/extras'
	import { audio } from '$lib/game/audio'
	import { device } from '$lib/game/device.svelte'
	import { fullscreen_switch_input } from '$lib/game/fullscreen-switch-input'
	import { fullscreen } from '$lib/game/fullscreen.svelte'
	import { input } from '$lib/game/input.svelte'
	import { loading } from '$lib/game/loading.svelte'
	import { session } from '$lib/game/session.svelte'
	import { game_state } from '$lib/game/state.svelte'
	import type { Snippet } from 'svelte'
	import { onMount } from 'svelte'
	import ControlsOverlay from './ControlsOverlay.svelte'
	import VirtualJoystick from './VirtualJoystick.svelte'

	interface Props {
		children?: Snippet
		hint_text?: string
		on_start?: () => void
		label_jump: string
		label_move: string
		label_look: string
		label_action: string
		label_return: string
		label_game: string
		label_game_started: string
		label_pause: string
	}

	let {
		children,
		hint_text = '',
		on_start,
		label_jump,
		label_move,
		label_look,
		label_action,
		label_return,
		label_game,
		label_game_started,
		label_pause,
	}: Props = $props()

	let container: HTMLElement
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
	role="application"
	tabindex="0"
	aria-label={label_game}
	onclick={start_game}
	onkeydown={on_key_down}
	data-testid="game-scene"
>
	<div role="status" class="sr-only">{game_status}</div>
	{#if !is_started}
		<ControlsOverlay
			{hint_text}
			{is_touch}
			{label_move}
			{label_look}
			{label_action}
			{label_jump}
			{label_return}
		/>
	{/if}
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
	<Canvas>
		<Suspense onload={on_scene_loaded}>
			{@render children?.()}
		</Suspense>
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
