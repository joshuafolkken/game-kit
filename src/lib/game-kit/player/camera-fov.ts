const HALF_DIVISOR = 2
const STRAIGHT_ANGLE_DEG = 180
const LANDSCAPE_ASPECT = 1
// Upper bound on the widened vertical FOV. Preserving the horizontal FOV exactly would
// push the vertical FOV toward 180° as the viewport gets extremely tall, which produces
// heavy perspective distortion and diverges numerically as aspect → 0. Realistic portrait
// phones sit near aspect 0.46 (~118° here), so the cap only engages for pathological aspects.
const MAX_VERTICAL_FOV_DEG = 120
const DEG_PER_RAD = STRAIGHT_ANGLE_DEG / Math.PI
const BASE_FOV_DEG_VALUE = 75

// The camera's vertical FOV in landscape, and the reference every derived framing number is
// measured against. It lives here rather than in Player.svelte because the controls scene needs
// the same value to work out how wide the camera's view is at its own plane (game-kit#412) —
// a second copy of the literal would be a second thing to keep in step with the portrait rule.
const BASE_FOV_DEG = BASE_FOV_DEG_VALUE

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

function half_tan(fov_deg: number): number {
	return Math.tan(fov_deg / HALF_DIVISOR / DEG_PER_RAD)
}

// How wide the camera's view is at a plane, given how tall that view is when the camera is at its
// base FOV. Everything at a fixed distance scales with tan(fov / 2), so the height at the live FOV
// is the base height times the ratio of the two tangents, and the width is that times the aspect.
//
// Consumers must not shortcut this as `base_height * aspect` (game-kit#412). That shortcut assumes
// the vertical FOV never moves, which stopped being true in game-kit#276: on portrait the vertical
// FOV widens to hold the horizontal FOV constant, so the view width stays PUT below aspect 1
// instead of shrinking with it — until MAX_VERTICAL_FOV_DEG caps the widening and it shrinks again.
// Reading the FOV back through compute_vertical_fov gets all three regimes for free.
//
// Landscape is unchanged by construction: compute_vertical_fov returns the base FOV at aspect >= 1,
// so the ratio is 1 and this is exactly `base_height * aspect`.
function compute_view_width_at_plane(base_view_height: number, aspect: number): number {
	const vertical_fov = compute_vertical_fov(BASE_FOV_DEG_VALUE, aspect)
	const height_scale = half_tan(vertical_fov) / half_tan(BASE_FOV_DEG_VALUE)

	return base_view_height * height_scale * aspect
}

export const camera_fov = {
	compute_vertical_fov,
	compute_view_width_at_plane,
	MAX_VERTICAL_FOV_DEG,
	BASE_FOV_DEG,
}
