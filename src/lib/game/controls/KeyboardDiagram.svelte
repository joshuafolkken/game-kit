<script lang="ts">
	interface Props {
		label_move: string
		label_jump: string
		label_return: string
	}

	let { label_move, label_jump, label_return }: Props = $props()

	type LetterKey = {
		class_name: string
		rect_x: number
		rect_y: number
		text_x: number
		text_y: number
		label: string
	}

	const LETTER_KEY_WIDTH = 40
	const LETTER_KEY_HEIGHT = 32

	const LETTER_KEYS: readonly LetterKey[] = [
		{ class_name: 'key-w', rect_x: 54, rect_y: 2, text_x: 74, text_y: 18, label: 'W' },
		{ class_name: 'key-a', rect_x: 2, rect_y: 46, text_x: 22, text_y: 62, label: 'A' },
		{ class_name: 'key-s', rect_x: 54, rect_y: 46, text_x: 74, text_y: 62, label: 'S' },
		{ class_name: 'key-d', rect_x: 106, rect_y: 46, text_x: 126, text_y: 62, label: 'D' },
	] as const

	type ReturnKey = {
		class_name: string
		rect_x: number
		text_x: number
		text_font_size: number
		label: string
	}

	const RETURN_KEY_RECT_Y = 150
	const RETURN_KEY_WIDTH = 56
	const RETURN_KEY_HEIGHT = 24
	const RETURN_KEY_TEXT_Y = 162

	const RETURN_KEYS: readonly ReturnKey[] = [
		{ class_name: 'key-esc', rect_x: 2, text_x: 30, text_font_size: 9, label: 'ESC' },
		{ class_name: 'key-z', rect_x: 90, text_x: 118, text_font_size: 13, label: 'Z' },
	] as const
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 148 176"
	aria-label="{label_move}. {label_jump}. {label_return}"
	role="img"
	class="keyboard-diagram"
	fill="none"
>
	{#each LETTER_KEYS as key (key.class_name)}
		<g class="key {key.class_name}" aria-hidden="true">
			<rect
				x={key.rect_x}
				y={key.rect_y}
				width={LETTER_KEY_WIDTH}
				height={LETTER_KEY_HEIGHT}
				rx="5"
				fill="rgba(120,80,255,0.15)"
				stroke="rgba(160,120,255,0.8)"
				stroke-width="1.5"
			></rect>
			<text
				x={key.text_x}
				y={key.text_y}
				text-anchor="middle"
				dominant-baseline="central"
				fill="rgba(200,180,255,0.95)"
				font-size="13"
				font-family="Orbitron, monospace"
				font-weight="bold">{key.label}</text
			>
		</g>
	{/each}
	<!-- Space bar -->
	<g class="key key-space" aria-hidden="true">
		<rect
			x="2"
			y="110"
			width="144"
			height="28"
			rx="5"
			fill="rgba(120,80,255,0.15)"
			stroke="rgba(160,120,255,0.8)"
			stroke-width="1.5"
		></rect>
		<!-- Double chevron in space bar (matches Jump C, scaled 0.6 to text size) -->
		<polyline
			points="67,130 74,123 81,130"
			stroke="rgba(200,180,255,0.9)"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		></polyline>
		<polyline
			class="space-chevron-top"
			points="67,125 74,118 81,125"
			stroke="rgba(200,180,255,0.9)"
			stroke-width="1.2"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
			opacity="0.55"
		></polyline>
	</g>
	{#each RETURN_KEYS as key (key.class_name)}
		<g class="key {key.class_name}" aria-hidden="true">
			<rect
				x={key.rect_x}
				y={RETURN_KEY_RECT_Y}
				width={RETURN_KEY_WIDTH}
				height={RETURN_KEY_HEIGHT}
				rx="5"
				fill="rgba(80,60,160,0.1)"
				stroke="rgba(120,100,200,0.5)"
				stroke-width="1.5"
			></rect>
			<text
				x={key.text_x}
				y={RETURN_KEY_TEXT_Y}
				text-anchor="middle"
				dominant-baseline="central"
				fill="rgba(160,140,220,0.7)"
				font-size={key.text_font_size}
				font-family="Orbitron, monospace"
				font-weight="bold">{key.label}</text
			>
		</g>
	{/each}
	<!-- slash separator between ESC and Z -->
	<text
		x="74"
		y={RETURN_KEY_TEXT_Y}
		text-anchor="middle"
		dominant-baseline="central"
		fill="rgba(120,100,200,0.5)"
		font-size="11"
		font-family="Orbitron, monospace">/</text
	>
</svg>

<style>
	.keyboard-diagram {
		height: min(40vh, 440px, 56vw);
		width: auto;
	}

	.key-w {
		animation: key-press 3.2s 0s ease-in-out infinite;
	}
	.key-a {
		animation: key-press 3.2s 0.8s ease-in-out infinite;
	}
	.key-s {
		animation: key-press 3.2s 1.6s ease-in-out infinite;
	}
	.key-d {
		animation: key-press 3.2s 2.4s ease-in-out infinite;
	}
	.key-space {
		animation: key-pulse 2.8s 0.4s ease-in-out infinite;
	}

	.space-chevron-top {
		animation: chevron-rise 1.6s ease-in-out infinite;
	}

	@keyframes chevron-rise {
		0%,
		100% {
			opacity: 0.55;
			transform: translateY(0);
		}
		50% {
			opacity: 0.9;
			transform: translateY(-2px);
		}
	}

	@keyframes key-press {
		0%,
		15%,
		40%,
		100% {
			opacity: 0.7;
		}
		25% {
			opacity: 1;
			filter: drop-shadow(0 0 5px rgba(160, 120, 255, 0.8));
		}
	}

	@keyframes key-pulse {
		0%,
		100% {
			opacity: 0.7;
		}
		50% {
			opacity: 1;
			filter: drop-shadow(0 0 4px rgba(160, 120, 255, 0.6));
		}
	}
</style>
