<script lang="ts">
	import { T } from '@threlte/core';

	const DEFAULT_W = 10;
	const DEFAULT_D = 10;
	const DEFAULT_H = 3;
	const HALF_DIVISOR = 2;

	interface Props {
		width?: number;
		depth?: number;
		height?: number;
		floor_color: string;
		wall_color: string;
		ceiling_color: string;
	}

	let {
		width = DEFAULT_W,
		depth = DEFAULT_D,
		height = DEFAULT_H,
		floor_color,
		wall_color,
		ceiling_color
	}: Props = $props();
	let half_w = $derived(width / HALF_DIVISOR);
	let half_d = $derived(depth / HALF_DIVISOR);
	let half_h = $derived(height / HALF_DIVISOR);
</script>

<!-- Floor -->
<T.Mesh rotation.x={-Math.PI / 2}>
	<T.PlaneGeometry args={[width, depth]} />
	<T.MeshStandardMaterial color={floor_color} roughness={0.9} />
</T.Mesh>

<!-- Ceiling -->
<T.Mesh position.y={height} rotation.x={Math.PI / 2}>
	<T.PlaneGeometry args={[width, depth]} />
	<T.MeshStandardMaterial color={ceiling_color} roughness={0.9} />
</T.Mesh>

<!-- Left wall -->
<T.Mesh position={[-half_w, half_h, 0]} rotation.y={Math.PI / 2}>
	<T.PlaneGeometry args={[depth, height]} />
	<T.MeshStandardMaterial color={wall_color} roughness={0.8} />
</T.Mesh>

<!-- Right wall -->
<T.Mesh position={[half_w, half_h, 0]} rotation.y={-Math.PI / 2}>
	<T.PlaneGeometry args={[depth, height]} />
	<T.MeshStandardMaterial color={wall_color} roughness={0.8} />
</T.Mesh>

<!-- Back wall -->
<T.Mesh position={[0, half_h, -half_d]}>
	<T.PlaneGeometry args={[width, height]} />
	<T.MeshStandardMaterial color={wall_color} roughness={0.8} />
</T.Mesh>

<!-- Front wall -->
<T.Mesh position={[0, half_h, half_d]} rotation.y={Math.PI}>
	<T.PlaneGeometry args={[width, height]} />
	<T.MeshStandardMaterial color={wall_color} roughness={0.8} />
</T.Mesh>
