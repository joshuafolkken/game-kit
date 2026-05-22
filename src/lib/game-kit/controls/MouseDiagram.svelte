<script lang="ts">
	interface Props {
		label_action: string
		label_look: string
	}

	let { label_action, label_look }: Props = $props()
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 -7 90 120"
	aria-label="{label_action} / {label_look}"
	role="img"
	class="mouse-diagram"
	fill="none"
>
	<!-- Mouse body -->
	<rect
		x="15"
		y="8"
		width="60"
		height="90"
		rx="30"
		fill="rgba(80,60,180,0.12)"
		stroke="rgba(140,110,255,0.7)"
		stroke-width="1"
	></rect>
	<!-- Button divider line -->
	<line x1="45" y1="8" x2="45" y2="44" stroke="rgba(140,110,255,0.5)" stroke-width="1"></line>
	<!-- Top cut-off line (top of button area) -->
	<path d="M18 44 Q15 44 15 44 L75 44 Q75 44 75 44" stroke="rgba(140,110,255,0.5)" stroke-width="1"
	></path>
	<!-- Left click indicator (action) -->
	<g class="left-click" aria-hidden="true">
		<circle
			cx="30"
			cy="28"
			r="7"
			fill="rgba(140,100,255,0.2)"
			stroke="rgba(160,130,255,0.7)"
			stroke-width="1"
		></circle>
		<!-- tap/click dot -->
		<circle cx="30" cy="28" r="2.5" fill="rgba(200,180,255,0.9)"></circle>
	</g>

	<!-- Right click indicator (look/camera) -->
	<g class="right-click" aria-hidden="true">
		<circle
			cx="60"
			cy="28"
			r="7"
			fill="rgba(140,100,255,0.2)"
			stroke="rgba(160,130,255,0.7)"
			stroke-width="1"
		></circle>
		<!-- hold dots -->
		<circle cx="57" cy="28" r="1.5" fill="rgba(200,180,255,0.9)"></circle>
		<circle cx="60" cy="28" r="1.5" fill="rgba(200,180,255,0.9)"></circle>
		<circle cx="63" cy="28" r="1.5" fill="rgba(200,180,255,0.9)"></circle>
	</g>
</svg>

<style>
	.mouse-diagram {
		height: min(40vh, 440px, 56vw);
		width: auto;
	}

	.left-click {
		animation: click-flash 2.4s 0.6s ease-in-out infinite;
	}

	.right-click {
		animation: hold-glow 2.8s 0s ease-in-out infinite;
	}

	@keyframes click-flash {
		0%,
		100% {
			opacity: 0.6;
		}
		30% {
			opacity: 1;
			filter: drop-shadow(0 0 5px rgba(160, 130, 255, 0.8));
		}
		50% {
			opacity: 0.6;
		}
	}

	@keyframes hold-glow {
		0%,
		100% {
			opacity: 0.5;
		}
		40% {
			opacity: 1;
			filter: drop-shadow(0 0 6px rgba(160, 130, 255, 0.7));
		}
		70% {
			opacity: 0.8;
		}
	}
</style>
