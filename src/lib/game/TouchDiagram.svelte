<script lang="ts">
	interface Props {
		label_move: string;
		label_look: string;
		label_action: string;
	}

	let { label_move, label_look, label_action }: Props = $props();
</script>

{#snippet swipe_gesture(animation_class: string)}
	<svg
		class="gesture {animation_class}"
		viewBox="27 14 58 54"
		aria-hidden="true"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M38 56 A22 22 0 1 1 72 56"
			stroke="rgba(160,130,255,0.7)"
			stroke-width="2"
			stroke-linecap="round"
		/>
		<polyline
			points="72,50 72,57 79,57"
			stroke="rgba(160,130,255,0.7)"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		/>
		<circle
			cx="55"
			cy="56"
			r="6"
			fill="rgba(140,100,255,0.2)"
			stroke="rgba(160,130,255,0.7)"
			stroke-width="1.5"
		/>
		<circle cx="55" cy="56" r="2" fill="rgba(200,180,255,0.9)" />
	</svg>
{/snippet}

<div
	class="touch-diagram"
	data-testid="touch-diagram"
	role="img"
	aria-label="{label_move} / {label_look} / {label_action}"
>
	<div class="frame" data-testid="touch-diagram-frame">
		<div class="half">
			{@render swipe_gesture('move-gesture')}
		</div>
		<div class="half">
			{@render swipe_gesture('look-gesture')}
		</div>
	</div>
</div>

<style>
	.touch-diagram {
		width: 94vw;
		height: min(56vw, 42vh);
	}

	.frame {
		width: 100%;
		height: 100%;
		border-radius: 10px;
		border: 1.5px solid rgba(160, 120, 255, 0.5);
		background: rgba(120, 80, 255, 0.05);
		display: flex;
		position: relative;
	}

	.frame::before {
		content: '';
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		border-left: 1px dashed rgba(140, 110, 255, 0.5);
	}

	.half {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
	}

	.gesture {
		width: min(15vh, 20vw, 90px);
		height: auto;
	}

	.move-gesture {
		animation: swipe-loop 2.4s 0s ease-in-out infinite;
	}

	.look-gesture {
		animation: swipe-loop 2.4s 0.8s ease-in-out infinite;
	}

	@keyframes swipe-loop {
		0%,
		100% {
			opacity: 0.6;
		}
		40% {
			opacity: 1;
			filter: drop-shadow(0 0 4px rgba(160, 130, 255, 0.5));
		}
		70% {
			opacity: 0.8;
		}
	}
</style>
