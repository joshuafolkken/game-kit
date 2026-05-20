const HALF = 0.5
const BARREL_STRENGTH_VALUE = 0.15

// Quadratic barrel-distortion strength. 0.0 = identity (flat). Real-world CRT
// face curvature reads as ~0.15–0.25 in this formulation; 0.2 matches the visual
// weight of the existing .crt-overlay corner darkening without bulging so far
// that the dot grid distorts unrecognizably at the edges.
export const BARREL_STRENGTH = BARREL_STRENGTH_VALUE

export interface BarrelUv {
	x: number
	y: number
}

// JS mirror of the GLSL UV-warp math. Lets the math be verified in isolation
// without spinning up WebGL — same pattern as crt_dither.quantize_with_dither_2d.
// `aspect` should be width / height of the render target so the warp is radially
// symmetric in screen pixels (a square viewport with aspect=1 warps in a circle;
// a 16:9 viewport with aspect=1.78 warps in a horizontal ellipse, matching how a
// real CRT face curves more at the wider horizontal corners).
function apply_barrel_uv(uv: BarrelUv, strength: number, aspect: number): BarrelUv {
	const centered_x = (uv.x - HALF) * aspect
	const centered_y = uv.y - HALF
	const r2 = centered_x * centered_x + centered_y * centered_y
	const warp = 1 + strength * r2
	const warped_x = (centered_x * warp) / aspect
	const warped_y = centered_y * warp
	return { x: warped_x + HALF, y: warped_y + HALF }
}

export const BARREL_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
	v_uv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// Fragment shader applies quadratic barrel distortion in screen-aspect space, then
// samples tDiffuse at the warped UV. Out-of-bounds samples are masked to black via
// a step-product (branchless) so the rectangular frame stays clean while the inner
// content bulges. Sampling out-of-[0,1] would otherwise smear the edge color due
// to CLAMP_TO_EDGE wrapping — the visible mask multiply zeroes those texels.
export const BARREL_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float u_strength;
uniform float u_aspect;

varying vec2 v_uv;

void main() {
	vec2 centered = v_uv - 0.5;
	centered.x *= u_aspect;
	float r2 = dot(centered, centered);
	float warp = 1.0 + u_strength * r2;
	centered *= warp;
	centered.x /= u_aspect;
	vec2 sample_uv = centered + 0.5;
	vec2 in_bounds = step(vec2(0.0), sample_uv) * step(sample_uv, vec2(1.0));
	float visible = in_bounds.x * in_bounds.y;
	vec3 sampled = texture2D(tDiffuse, sample_uv).rgb;
	gl_FragColor = vec4(sampled * visible, 1.0);
}
`

export const crt_barrel = {
	apply_barrel_uv,
}
