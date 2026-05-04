<script lang="ts">
	import KeyboardDiagram from './KeyboardDiagram.svelte'
	import MouseDiagram from './MouseDiagram.svelte'
	import TouchDiagram from './TouchDiagram.svelte'

	interface Props {
		hint_text: string
		is_touch: boolean
		label_move: string
		label_look: string
		label_action: string
		label_jump: string
		label_return: string
	}

	let {
		hint_text,
		is_touch,
		label_move,
		label_look,
		label_action,
		label_jump,
		label_return,
	}: Props = $props()
</script>

<div class="controls-overlay" data-testid="controls-overlay">
	<div class="overlay-backdrop" data-testid="overlay-backdrop"></div>
	<div class="start-hint" data-testid="start-hint">{hint_text}</div>

	{#if is_touch}
		<div class="controls-touch" data-testid="controls-touch">
			<TouchDiagram {label_move} {label_look} {label_action} />
		</div>
	{:else}
		<div class="controls-pc" data-testid="controls-pc">
			<div class="diagram-group">
				<KeyboardDiagram {label_move} {label_jump} {label_return} />
			</div>
			<div class="diagram-group">
				<MouseDiagram {label_action} {label_look} />
			</div>
		</div>
	{/if}
</div>

<style>
	.controls-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 10;
	}

	.overlay-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
	}

	.start-hint {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: rgba(255, 255, 255, 0.6);
		font-family: 'Orbitron', monospace;
		font-size: clamp(0.9rem, 2vw, 1.4rem);
		letter-spacing: 0.2em;
		white-space: nowrap;
		animation: hint-pulse 2s ease-in-out infinite;
	}

	.controls-pc {
		position: absolute;
		top: 55%;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: row;
		gap: clamp(2rem, 5vw, 5rem);
		align-items: center;
		justify-content: center;
		flex-wrap: nowrap;
	}

	.controls-touch {
		position: absolute;
		top: 55%;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.diagram-group {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	@keyframes hint-pulse {
		0%,
		100% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
	}
</style>
