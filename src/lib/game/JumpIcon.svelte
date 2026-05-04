<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 40 40"
	width="20"
	height="20"
	aria-hidden="true"
	fill="none"
>
	<polyline
		points="8,27 20,15 32,27"
		stroke="currentColor"
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<polyline
		class="chevron-top"
		points="8,19 20,7 32,19"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.55"
	/>
</svg>

<style>
	.chevron-top {
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
</style>
