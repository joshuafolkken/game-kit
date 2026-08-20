import {
	BARREL_FUNCTIONS_GLSL,
	BARREL_UNIFORMS_GLSL,
	crt_barrel,
	type BarrelRgb,
	type BarrelUv,
} from '$lib/game-kit/crt-barrel'
import {
	crt_dither,
	SCANLINE_FUNCTIONS_GLSL,
	SCANLINE_UNIFORMS_GLSL,
} from '$lib/game-kit/crt-dither'

const HALF = 0.5
const NEIGHBOR_PAIR = 2

export interface CrtScanlineConfig {
	period: number
	axis: BarrelUv
	dark: number
	sharpness: number
	bleed: number
}

export interface CrtCompositeConfig {
	strength: number
	aspect: number
	channel_offset: number
	contrast: number
	saturation: number
	width: number
	height: number
	scanline: CrtScanlineConfig
}

// Reads the low-resolution dithered image. Nearest-neighbour magnification of that texture is what
// used to be a dedicated upscale pass, so the sampler stands in for the whole stage-1 output.
export type CrtCompositeSampler = (uv: BarrelUv) => BarrelRgb

export interface CrtCompositeInput {
	sample: CrtCompositeSampler
	uv: BarrelUv
	config: CrtCompositeConfig
}

function scale_rgb(color: BarrelRgb, factor: number): BarrelRgb {
	return { r: color.r * factor, g: color.g * factor, b: color.b * factor }
}

function scanline_axis_resolution(config: CrtCompositeConfig): number {
	const { axis } = config.scanline

	return Math.abs(axis.x) * config.width + Math.abs(axis.y) * config.height
}

// JS mirror of scanline_color(): the scanline profile plus the phosphor bleed, evaluated at the
// coordinate the caller passes — which is the barrel-warped one, so the pattern curves with the
// screen exactly as the pre-#421 pass order did.
function sample_scanlined(
	sample: CrtCompositeSampler,
	uv: BarrelUv,
	config: CrtCompositeConfig,
): BarrelRgb {
	const { period, axis, dark, sharpness, bleed } = config.scanline
	const coord = uv.x * config.width * axis.x + uv.y * config.height * axis.y
	const wave = crt_dither.compute_scanline_wave(coord, period, sharpness)
	const factor = dark + wave * (1 - dark)
	const half_period = (period * HALF) / scanline_axis_resolution(config)
	const before = sample({ x: uv.x - axis.x * half_period, y: uv.y - axis.y * half_period })
	const after = sample({ x: uv.x + axis.x * half_period, y: uv.y + axis.y * half_period })
	const glow = (bleed * (1 - wave)) / NEIGHBOR_PAIR
	const color = scale_rgb(sample(uv), factor)

	return {
		r: color.r + (before.r + after.r) * glow,
		g: color.g + (before.g + after.g) * glow,
		b: color.b + (before.b + after.b) * glow,
	}
}

function is_uv_in_bounds(uv: BarrelUv): boolean {
	return uv.x >= 0 && uv.x <= 1 && uv.y >= 0 && uv.y <= 1
}

// JS mirror of sample_channel(): warp -> out-of-bounds mask -> scanline -> grade, in that order.
// The mask has to precede the grading because contrast pivots around mid-grey, so grading a
// masked-to-black sample is not the same as masking a graded one.
function sample_channel(
	sample: CrtCompositeSampler,
	uv: BarrelUv,
	config: CrtCompositeConfig,
): BarrelRgb {
	const sample_uv = crt_barrel.apply_barrel_uv(uv, config.strength, config.aspect)
	const visible = is_uv_in_bounds(sample_uv) ? 1 : 0
	const scanlined = sample_scanlined(sample, sample_uv, config)

	return crt_barrel.apply_grade(scale_rgb(scanlined, visible), config.contrast, config.saturation)
}

// JS mirror of the merged stage-2 shader. The channel separation is applied to the OUTPUT
// coordinate before the warp, because the CSS filter this replaces shifted the finished canvas.
function compose_crt_pixel({ sample, uv, config }: CrtCompositeInput): BarrelRgb {
	const [red_uv, green_uv, blue_uv] = crt_barrel.offset_channel_uvs(
		uv,
		config.channel_offset,
		config.width,
	)

	return {
		r: sample_channel(sample, red_uv ?? uv, config).r,
		g: sample_channel(sample, green_uv ?? uv, config).g,
		b: sample_channel(sample, blue_uv ?? uv, config).b,
	}
}

// The whole of stage 2 in one pass (game-kit#421). It replaces an upscale pass, a scanline pass and
// a barrel pass driven by an EffectComposer, which allocated two full-resolution HalfFloatType
// targets and ping-ponged the frame through them. Nothing here reads an intermediate: every tap
// goes straight to the low-resolution dithered texture, and the result is written to the default
// framebuffer.
//
// Nine taps per pixel — three chromatic channels x (centre + two bleed neighbours) — against seven
// before, six of which read a full-resolution RGBA16F surface. The saving is bandwidth and memory,
// not arithmetic.
//
// One deliberate difference from the pre-#421 rendering: the barrel pass used to read the scanlined
// image back through a LinearFilter target, so warped samples were bilinearly resampled. Evaluating
// the scanline analytically at the warped coordinate skips that resampling, which leaves the
// pattern marginally crisper toward the edges where the warp displaces the sample. The screen
// centre, where the warp is identity, is unchanged.
export const COMPOSITE_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_lo_tex;
uniform vec2 u_resolution;
${BARREL_UNIFORMS_GLSL}${SCANLINE_UNIFORMS_GLSL}
varying vec2 v_uv;
${BARREL_FUNCTIONS_GLSL}${SCANLINE_FUNCTIONS_GLSL}
vec3 sample_channel(vec2 uv) {
	vec2 sample_uv = warp_uv(uv);
	float visible = in_bounds(sample_uv);

	return grade(scanline_color(u_lo_tex, sample_uv) * visible);
}

void main() {
	float offset = u_channel_offset / max(u_resolution.x, 1.0);
	vec3 shifted_r = sample_channel(v_uv - vec2(offset, 0.0));
	vec3 centered_rgb = sample_channel(v_uv);
	vec3 shifted_b = sample_channel(v_uv + vec2(offset, 0.0));

	gl_FragColor = vec4(shifted_r.r, centered_rgb.g, shifted_b.b, 1.0);
}
`

export const crt_composite = {
	compose_crt_pixel,
}
