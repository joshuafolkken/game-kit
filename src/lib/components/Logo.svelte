<script module lang="ts">
	const FILTER_ID_PREFIX = 'logo-glow'
	let next_filter_id = 0

	function generate_filter_id(): string {
		next_filter_id += 1
		return `${FILTER_ID_PREFIX}-${next_filter_id}`
	}
</script>

<script lang="ts">
	const DEFAULT_SIZE = 96
	const DEFAULT_ARIA_LABEL = 'Geometric JF Fusion Logo'

	interface Props {
		size?: number
		aria_label?: string
	}

	let { size = DEFAULT_SIZE, aria_label = DEFAULT_ARIA_LABEL }: Props = $props()
	const filter_id = generate_filter_id()
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="20 18 45 59"
	width={size}
	aria-label={aria_label}
	role="img"
>
	<defs>
		<filter id={filter_id} x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur stdDeviation="1.2" result="blur"></feGaussianBlur>
			<feFlood flood-color="white" flood-opacity="0.3" result="glowColor"></feFlood>
			<feComposite in="glowColor" in2="blur" operator="in" result="softGlow"></feComposite>
			<feMerge>
				<feMergeNode in="softGlow"></feMergeNode>
				<feMergeNode in="SourceGraphic"></feMergeNode>
			</feMerge>
		</filter>
	</defs>
	<g filter="url(#{filter_id})">
		<rect x="20" y="20" width="8" height="50" fill="currentColor"></rect>
		<rect x="20" y="20" width="20" height="8" fill="currentColor"></rect>
		<rect x="20" y="62" width="12" height="8" fill="currentColor"></rect>
		<rect x="40" y="20" width="8" height="55" fill="currentColor"></rect>
		<rect x="40" y="20" width="25" height="8" fill="currentColor"></rect>
		<rect x="40" y="45" width="20" height="8" fill="currentColor"></rect>
	</g>
</svg>

<style>
	svg {
		color: white;
		display: block;
	}
</style>
