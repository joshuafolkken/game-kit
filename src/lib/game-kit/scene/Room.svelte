<script lang="ts">
	import { T } from '@threlte/core'

	const DEFAULT_W = 10
	const DEFAULT_D = 10
	const DEFAULT_H = 3
	const HALF_DIVISOR = 2
	const QUARTER_TURN = Math.PI / HALF_DIVISOR
	const FLOOR_CEILING_ROUGHNESS = 0.9
	const WALL_ROUGHNESS = 0.8

	interface Props {
		width?: number
		depth?: number
		height?: number
		floor_color: string
		wall_color: string
		ceiling_color: string
	}

	const {
		width = DEFAULT_W,
		depth = DEFAULT_D,
		height = DEFAULT_H,
		floor_color,
		wall_color,
		ceiling_color,
	}: Props = $props()
	const half_w = $derived(width / HALF_DIVISOR)
	const half_d = $derived(depth / HALF_DIVISOR)
	const half_h = $derived(height / HALF_DIVISOR)
</script>

<!-- Floor -->
<T.Mesh rotation.x={-QUARTER_TURN}>
	<T.PlaneGeometry args={[width, depth]} />
	<T.MeshStandardMaterial color={floor_color} roughness={FLOOR_CEILING_ROUGHNESS} />
</T.Mesh>

<!-- Ceiling -->
<T.Mesh position.y={height} rotation.x={QUARTER_TURN}>
	<T.PlaneGeometry args={[width, depth]} />
	<T.MeshStandardMaterial color={ceiling_color} roughness={FLOOR_CEILING_ROUGHNESS} />
</T.Mesh>

<!-- Left wall -->
<T.Mesh position={[-half_w, half_h, 0]} rotation.y={QUARTER_TURN}>
	<T.PlaneGeometry args={[depth, height]} />
	<T.MeshStandardMaterial color={wall_color} roughness={WALL_ROUGHNESS} />
</T.Mesh>

<!-- Right wall -->
<T.Mesh position={[half_w, half_h, 0]} rotation.y={-QUARTER_TURN}>
	<T.PlaneGeometry args={[depth, height]} />
	<T.MeshStandardMaterial color={wall_color} roughness={WALL_ROUGHNESS} />
</T.Mesh>

<!-- Back wall -->
<T.Mesh position={[0, half_h, -half_d]}>
	<T.PlaneGeometry args={[width, height]} />
	<T.MeshStandardMaterial color={wall_color} roughness={WALL_ROUGHNESS} />
</T.Mesh>

<!-- Front wall -->
<T.Mesh position={[0, half_h, half_d]} rotation.y={Math.PI}>
	<T.PlaneGeometry args={[width, height]} />
	<T.MeshStandardMaterial color={wall_color} roughness={WALL_ROUGHNESS} />
</T.Mesh>
