const HALF_DIVISOR = 2
const STRAIGHT_ANGLE_DEG = 180
const LANDSCAPE_ASPECT = 1
// Upper bound on the widened vertical FOV. Preserving the horizontal FOV exactly would
// push the vertical FOV toward 180° as the viewport gets extremely tall, which produces
// heavy perspective distortion and diverges numerically as aspect → 0. Realistic portrait
// phones sit near aspect 0.46 (~118° here), so the cap only engages for pathological aspects.
const MAX_VERTICAL_FOV_DEG = 120
const DEG_PER_RAD = STRAIGHT_ANGLE_DEG / Math.PI

// A fixed vertical FOV lets the *horizontal* FOV shrink with the aspect ratio, so on a
// portrait viewport wide content (the title, side room content) is clipped at the frustum
// edges. Following the Three.js convention we hold the horizontal FOV constant at its
// landscape (aspect = 1) value by deriving a wider vertical FOV from the aspect. Landscape
// (aspect >= 1) is returned unchanged, so existing framing is regression-safe.
function compute_vertical_fov(base_fov_deg: number, aspect: number): number {
	// Guard non-finite aspect (not just `aspect >= 1`): at initial mount the canvas size can be
	// 0×0, making aspect NaN — widening on NaN would yield a NaN FOV and a broken projection.
	// Landscape (aspect >= 1) is likewise returned unchanged.
	if (!Number.isFinite(aspect) || aspect >= LANDSCAPE_ASPECT) return base_fov_deg

	const horizontal_half_tan = Math.tan(base_fov_deg / HALF_DIVISOR / DEG_PER_RAD)
	const vertical_fov_deg = Math.atan(horizontal_half_tan / aspect) * HALF_DIVISOR * DEG_PER_RAD

	return Math.min(vertical_fov_deg, MAX_VERTICAL_FOV_DEG)
}

export const camera_fov = { compute_vertical_fov, MAX_VERTICAL_FOV_DEG }
