const HALF = 0.5
const BARREL_STRENGTH_VALUE = 0.1
const CHANNEL_OFFSET_PIXELS_VALUE = 3
const CRT_CONTRAST_VALUE = 0.95
const CRT_SATURATION_VALUE = 1.2

// Filter Effects luminance coefficients, used by the CSS `saturate()` function this replaces.
// Keeping the spec's values (not Rec.709's 0.2126/0.7152/0.0722) is what makes the shader match
// the browser's output rather than merely look similar.
const LUMA_R = 0.213
const LUMA_G = 0.715
const LUMA_B = 0.072
// Same weights, spelled for GLSL. Built from the constants above so the shader and the JS mirror
// cannot drift apart.
const LUMA_GLSL = `vec3(${String(LUMA_R)}, ${String(LUMA_G)}, ${String(LUMA_B)})`

// Quadratic barrel-distortion strength. 0.0 = identity (flat). Real-world CRT
// face curvature reads as ~0.15–0.25 in this formulation; 0.2 matches the visual
// weight of the existing .crt-overlay corner darkening without bulging so far
// that the dot grid distorts unrecognizably at the edges.
export const BARREL_STRENGTH = BARREL_STRENGTH_VALUE

// Horizontal R/B separation, in texels of the full-resolution pass. Replaces the SVG filter's
// `feOffset dx="3"`, which was 3 CSS px: `primitiveUnits` defaulted to `userSpaceOnUse`, and the
// drawing buffer is at CSS resolution because <Canvas dpr={1}>, so 3 texels is the same fringe.
export const CHANNEL_OFFSET_PIXELS = CHANNEL_OFFSET_PIXELS_VALUE

// Grading that used to sit in the CSS filter chain as `contrast(0.95) saturate(1.2)`. The chain's
// `brightness(1)` was a no-op and is gone. Retuned in game-kit#389 when the renderer default became
// NoToneMapping — see the pin tests in crt-barrel.test.ts.
export const CRT_CONTRAST = CRT_CONTRAST_VALUE
export const CRT_SATURATION = CRT_SATURATION_VALUE

export interface BarrelRgb {
	r: number
	g: number
	b: number
}

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

// JS mirror of the GLSL grading. `contrast` pivots around mid-grey, so 0.5 is the fixed point and
// pure black lifts to (0 - 0.5) * c + 0.5 — which is why the grading has to run AFTER the barrel
// pass's out-of-bounds mask, exactly as the CSS filter did when it graded the finished canvas.
function apply_grade(color: BarrelRgb, contrast: number, saturation: number): BarrelRgb {
	const red = (color.r - HALF) * contrast + HALF
	const green = (color.g - HALF) * contrast + HALF
	const blue = (color.b - HALF) * contrast + HALF
	const luma = red * LUMA_R + green * LUMA_G + blue * LUMA_B

	return {
		r: luma + (red - luma) * saturation,
		g: luma + (green - luma) * saturation,
		b: luma + (blue - luma) * saturation,
	}
}

// The channel separation is applied to the OUTPUT coordinate, not to the already-warped sample
// coordinate: the CSS filter shifted the finished canvas, and the barrel warp is non-linear, so
// warping each shifted coordinate separately is what reproduces it. Returns the three output-space
// UVs whose warped, graded samples supply R, G and B.
function offset_channel_uvs(uv: BarrelUv, offset_pixels: number, width: number): Array<BarrelUv> {
	const offset = width > 0 ? offset_pixels / width : 0

	return [
		{ x: uv.x - offset, y: uv.y },
		{ x: uv.x, y: uv.y },
		{ x: uv.x + offset, y: uv.y },
	]
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
//
// Chromatic aberration and grading moved here from the CSS filter chain in game-kit#419: the SVG
// graph cost ~6 ms per frame on a Pixel 6 Pro because it ran over the compositor's 1440x3120
// surface with several full-screen intermediates, while this pass already runs over the CSS-
// resolution buffer — about a twelfth of the pixels, and no intermediate surfaces at all.
//
// The ordering reproduces what the browser did: warp -> mask -> grade happens per channel tap, and
// the taps are offsets of the OUTPUT coordinate, because the CSS filter shifted the finished canvas
// rather than the pre-warp image.
export const BARREL_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float u_strength;
uniform float u_aspect;
uniform float u_channel_offset;
uniform float u_contrast;
uniform float u_saturation;
uniform vec2 u_resolution;

varying vec2 v_uv;

vec3 grade(vec3 color) {
	vec3 contrasted = (color - 0.5) * u_contrast + 0.5;
	float luma = dot(contrasted, ${LUMA_GLSL});

	return mix(vec3(luma), contrasted, u_saturation);
}

vec3 sample_graded(vec2 uv) {
	vec2 centered = uv - 0.5;
	centered.x *= u_aspect;
	float r2 = dot(centered, centered);
	float warp = 1.0 + u_strength * r2;
	centered *= warp;
	centered.x /= u_aspect;
	vec2 sample_uv = centered + 0.5;
	vec2 in_bounds = step(vec2(0.0), sample_uv) * step(sample_uv, vec2(1.0));
	float visible = in_bounds.x * in_bounds.y;

	return grade(texture2D(tDiffuse, sample_uv).rgb * visible);
}

void main() {
	float offset = u_channel_offset / max(u_resolution.x, 1.0);
	vec3 shifted_r = sample_graded(v_uv - vec2(offset, 0.0));
	vec3 centered_rgb = sample_graded(v_uv);
	vec3 shifted_b = sample_graded(v_uv + vec2(offset, 0.0));

	gl_FragColor = vec4(shifted_r.r, centered_rgb.g, shifted_b.b, 1.0);
}
`

export const crt_barrel = {
	apply_barrel_uv,
	apply_grade,
	offset_channel_uvs,
}
