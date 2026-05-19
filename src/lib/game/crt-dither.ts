import { DataTexture, FloatType, NearestFilter, RedFormat, RepeatWrapping } from 'three'

const BAYER_SIZE_VALUE = 4
const BLACK_FLOOR_VALUE = 0.06

export const BAYER_SIZE = BAYER_SIZE_VALUE
export const BLACK_FLOOR = BLACK_FLOOR_VALUE

// 16 × 16 × 16 = 4096 unique colors (12-bit RGB — PC-9821 / Amiga HAM / Atari STE /
// X68000 12-bit-mode class). Uniform per-channel quantization paired with 4×4 Bayer
// ordered dithering (below) keeps the retro halftone texture while leaving enough
// headroom that gradients remain mostly band-free.
export const COLOR_LEVELS = { r: 16, g: 16, b: 16 } as const

// 4×4 ordered (Bayer) dither matrix. Values 0..15 — every cell unique. The coarser
// 4×4 pattern (vs 8×8) gives a chunkier, more visible cross-hatch — closer to the
// Mega Drive / PC-98 era texture-dithering look.
export const BAYER_MATRIX: readonly (readonly number[])[] = [
	[0, 8, 2, 10],
	[12, 4, 14, 6],
	[3, 11, 1, 9],
	[15, 7, 13, 5],
] as const

function create_bayer_texture(): DataTexture {
	const cells = BAYER_SIZE_VALUE * BAYER_SIZE_VALUE
	const data = new Float32Array(cells)
	BAYER_MATRIX.forEach((row, y) => {
		row.forEach((value, x) => {
			data[y * BAYER_SIZE_VALUE + x] = value / cells
		})
	})
	const texture = new DataTexture(data, BAYER_SIZE_VALUE, BAYER_SIZE_VALUE, RedFormat, FloatType)
	texture.minFilter = NearestFilter
	texture.magFilter = NearestFilter
	texture.wrapS = RepeatWrapping
	texture.wrapT = RepeatWrapping
	texture.needsUpdate = true
	return texture
}

// JS mirror of the GLSL quantize+dither logic. Tested in isolation so the shader
// math is verified without spinning up WebGL.
function quantize_with_dither_2d(
	channel: number,
	bayer_norm: number,
	levels: number,
	floor_val: number,
): number {
	const HALF = 0.5
	const threshold = bayer_norm - HALF
	const dither_step = 1 / levels
	const dithered = channel + threshold * dither_step
	const quantized = Math.floor(dithered * levels) / (levels - 1)
	const clamped = Math.min(1, Math.max(0, quantized))
	return Math.max(clamped, floor_val)
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

export const crt_dither = {
	create_bayer_texture,
	quantize_with_dither_2d,
}
