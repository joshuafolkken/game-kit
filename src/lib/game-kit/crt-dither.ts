import { DataTexture, FloatType, NearestFilter, RedFormat, RepeatWrapping } from 'three'

const BAYER_SIZE_VALUE = 4
const BLACK_FLOOR_VALUE = 0.06
const SCANLINE_DARK_VALUE = 0
const DOTS_PER_SCANLINE_VALUE = 1
const SCANLINE_SHARPNESS_VALUE = 0.35
const SCANLINE_BLEED_VALUE = 0.35
const DOT_BLEND_VALUE = 0.2

export const BAYER_SIZE = BAYER_SIZE_VALUE
export const BLACK_FLOOR = BLACK_FLOOR_VALUE

// Brightness multiplier for the dark phase of each scanline cycle (0.3 means the
// dark phase retains 30% of original luminance, matching the previous CSS overlay's
// rgba(0,0,0,0.7) — 70% darkening).
export const SCANLINE_DARK = SCANLINE_DARK_VALUE

// Drawing-buffer pixels per scanline phase (dark or light). 1 = the densest
// alternation expressible: 1 dark pixel then 1 light pixel. Paired with
// TARGET_SHORT_EDGE_PIXELS=256 this puts ~128 dark/light pairs across the short
// edge, in the X68000 256-line CRT / NTSC 240p ballpark.
export const DOTS_PER_SCANLINE = DOTS_PER_SCANLINE_VALUE

// Power exponent applied to the cosine wave to control the apparent width of the
// dark scanline band. 1.0 = symmetric 50/50 duty cycle. < 1 = narrower dark bands
// (thin scanlines, most of the period appears bright — typical real-CRT phosphor
// look). > 1 = wider dark bands. 0.35 gives roughly 20% dark / 80% bright.
export const SCANLINE_SHARPNESS = SCANLINE_SHARPNESS_VALUE

// Fraction of a neighboring bright band's luminance that bleeds into the adjacent
// dark band, simulating CRT phosphor glow. 0 = hard black scanlines, no bleed.
// 0.25 gives a subtle halo — authentic for consumer CRTs where bright phosphors
// scatter light into the dark gap between scanlines.
export const SCANLINE_BLEED = SCANLINE_BLEED_VALUE

// Scanline period (in hi-res pixels) at which SCANLINE_BLEED is applied at full
// strength. Below this threshold the bleed scales proportionally with the period,
// preventing the phosphor glow from washing out the narrow dark band on small
// viewports (e.g. mobile, where the period may be as few as 3 pixels).
export const SCANLINE_BLEED_FULL_PERIOD = 8

// Fraction of the 4-neighbor average (up/down/left/right) mixed into each pixel
// when upscaling from the low-res dithered game image. 0 = sharp pixel art,
// 1 = fully box-blurred. 0.4 gives the soft "melting dots" look of real CRT
// phosphors where adjacent colored dots bled into each other.
export const DOT_BLEND = DOT_BLEND_VALUE

// 8 × 8 × 4 = 256 unique colors (VGA 3-3-2: 3-bit R, 3-bit G, 2-bit B — VGA Mode 13h /
// MCGA class, a fixed 8-bit palette with no per-frame palette selection). Human
// luminance perception is roughly 30% R / 59% G / 11% B, so giving blue half the
// resolution of red and green wastes the fewest perceptually-distinct steps. Paired
// with 4×4 Bayer ordered dithering (below) to hide the coarse banding — especially
// in blue gradients, which only have 4 quantization levels.
export const COLOR_LEVELS = { r: 8, g: 8, b: 4 } as const

// 4×4 ordered (Bayer) dither matrix. Values 0..15 — every cell unique. The coarser
// 4×4 pattern (vs 8×8) gives a chunkier, more visible cross-hatch — closer to the
// Mega Drive / PC-98 era texture-dithering look.
/* eslint-disable @typescript-eslint/no-magic-numbers -- canonical 4×4 Bayer dither matrix; the 0–15 cells are intrinsic data and named constants would add no clarity */
export const BAYER_MATRIX: ReadonlyArray<ReadonlyArray<number>> = [
	[0, 8, 2, 10],
	[12, 4, 14, 6],
	[3, 11, 1, 9],
	[15, 7, 13, 5],
] as const
/* eslint-enable @typescript-eslint/no-magic-numbers */

function create_bayer_texture(): DataTexture {
	const cells = BAYER_SIZE_VALUE * BAYER_SIZE_VALUE
	const data = new Float32Array(cells)

	for (const [y, row] of BAYER_MATRIX.entries()) {
		for (const [x, value] of row.entries()) {
			data[y * BAYER_SIZE_VALUE + x] = value / cells
		}
	}

	const texture = new DataTexture(data, BAYER_SIZE_VALUE, BAYER_SIZE_VALUE, RedFormat, FloatType)

	texture.minFilter = NearestFilter
	texture.magFilter = NearestFilter
	texture.wrapS = RepeatWrapping
	texture.wrapT = RepeatWrapping
	texture.needsUpdate = true

	return texture
}

// JS mirror of the GLSL scanline cosine-profile math. `coord` is the pixel
// coordinate along the scanline axis; `period` is one full cycle in the same
// unit. Returns dark_factor at the dark-band center (phase=0), 1.0 at the
// light-band center (phase=period/2), and smooth cosine values in between.
// Using a cosine profile instead of a hard step eliminates moiré that the
// binary dark/light boundary causes when the scanline grid drifts fractionally
// against the upscaled pixel-art grid.
function compute_scanline_factor(
	coord: number,
	period: number,
	dark_factor: number,
	sharpness = 1,
): number {
	const HALF = 0.5
	const TWO_PI = Math.PI / HALF
	const phase = ((coord % period) + period) % period
	const wave_cos = HALF * (1 - Math.cos((TWO_PI * phase) / period))
	const wave = wave_cos ** sharpness

	return dark_factor + wave * (1 - dark_factor)
}

// JS mirror of the GLSL quantize+dither logic. Tested in isolation so the shader
// math is verified without spinning up WebGL.
function quantize_with_dither_2d(
	channel: number,
	bayer_norm: number,
	levels: number,
	floor_value: number,
): number {
	const HALF = 0.5
	const threshold = bayer_norm - HALF
	const dither_step = 1 / levels
	const dithered = channel + threshold * dither_step
	const quantized = Math.floor(dithered * levels) / (levels - 1)
	const clamped = Math.min(1, Math.max(0, quantized))

	return Math.max(clamped, floor_value)
}

export const DITHER_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
	v_uv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const DITHER_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D u_bayer;
uniform vec2 u_resolution;
uniform vec3 u_color_levels;
uniform float u_black_floor;
uniform float u_bayer_size;

varying vec2 v_uv;

void main() {
	vec3 color = texture2D(tDiffuse, v_uv).rgb;
	vec2 pixel = v_uv * u_resolution;
	float bayer = texture2D(u_bayer, pixel / u_bayer_size).r;
	float threshold = bayer - 0.5;
	vec3 dither_step = 1.0 / u_color_levels;
	color += vec3(threshold) * dither_step;
	vec3 quantized = floor(color * u_color_levels) / (u_color_levels - vec3(1.0));
	quantized = clamp(quantized, vec3(0.0), vec3(1.0));
	quantized = max(quantized, vec3(u_black_floor));
	gl_FragColor = vec4(quantized, 1.0);
}
`

// Nearest-neighbour upscale pass with optional dot-blend. Samples the low-res
// dithered game texture via u_lo_tex (NOT tDiffuse) so ShaderPass does not
// override it with the hi-res composer's readBuffer.
// u_dot_blend mixes each pixel with the average of its 4 low-res neighbours,
// reproducing the colour bleeding between adjacent CRT phosphor dots.
export const UPSCALE_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_lo_tex;
uniform vec2 u_lo_resolution;
uniform float u_dot_blend;

varying vec2 v_uv;

void main() {
	vec2 texel = 1.0 / u_lo_resolution;
	vec3 center = texture2D(u_lo_tex, v_uv).rgb;
	vec3 neighbors = (
		texture2D(u_lo_tex, v_uv + vec2( texel.x, 0.0)).rgb +
		texture2D(u_lo_tex, v_uv + vec2(-texel.x, 0.0)).rgb +
		texture2D(u_lo_tex, v_uv + vec2(0.0,  texel.y)).rgb +
		texture2D(u_lo_tex, v_uv + vec2(0.0, -texel.y)).rgb
	) * 0.25;
	gl_FragColor = vec4(mix(center, neighbors, u_dot_blend), 1.0);
}
`

// High-resolution scanline pass. Runs at device/CSS resolution so lines are
// smooth curves (not chunky pixel blocks). Applied BEFORE the barrel pass so
// the scanline pattern warps with the screen curvature.
// Cosine profile avoids the hard step → moiré interaction that occurs when the
// scanline period drifts fractionally against the upscaled pixel-art grid.
// At phase=0 the factor equals u_scanline_dark (dark-band centre);
// at phase=period/2 it equals 1.0 (bright-band centre) — same extremes as the
// previous step function, but the transition is smooth, not a hard edge.
export const SCANLINE_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 u_resolution;
uniform float u_scanline_period;
uniform vec2 u_scanline_axis;
uniform float u_scanline_dark;
uniform float u_scanline_sharpness;
uniform float u_bleed;

varying vec2 v_uv;

#define TWO_PI 6.28318530718

void main() {
	vec3 color = texture2D(tDiffuse, v_uv).rgb;
	vec2 pixel = v_uv * u_resolution;
	float scanline_coord = dot(pixel, u_scanline_axis);
	float scanline_phase = mod(scanline_coord, u_scanline_period);
	float wave_cos = 0.5 * (1.0 - cos(TWO_PI * scanline_phase / u_scanline_period));
	float wave = pow(wave_cos, u_scanline_sharpness);

	// Phosphor glow: sample the nearest bright bands (half a period away on each
	// side) and let their luminance bleed into the dark gap between scanlines.
	// Converts period from pixel-space to UV-space, then offsets along the scanline
	// axis so we always land at the center of the adjacent bright bands.
	float axis_res = dot(u_resolution, abs(u_scanline_axis));
	vec2 half_period_uv = u_scanline_axis * (u_scanline_period * 0.5 / axis_res);
	vec3 neighbor_a = texture2D(tDiffuse, v_uv - half_period_uv).rgb;
	vec3 neighbor_b = texture2D(tDiffuse, v_uv + half_period_uv).rgb;
	vec3 bleed_color = (neighbor_a + neighbor_b) * 0.5 * u_bleed * (1.0 - wave);

	gl_FragColor = vec4(color * mix(u_scanline_dark, 1.0, wave) + bleed_color, 1.0);
}
`

export const crt_dither = {
	create_bayer_texture,
	quantize_with_dither_2d,
	compute_scanline_factor,
}
