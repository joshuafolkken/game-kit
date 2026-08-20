import { describe, expect, it } from 'vitest'
import { BARREL_STRENGTH, CHANNEL_OFFSET_PIXELS, type BarrelRgb } from './crt-barrel'
import { COMPOSITE_FRAGMENT_SHADER, crt_composite, type CrtCompositeConfig } from './crt-composite'

const WIDTH = 1440
const HEIGHT = 900

const BASE: CrtCompositeConfig = {
	strength: BARREL_STRENGTH,
	aspect: WIDTH / HEIGHT,
	channel_offset: CHANNEL_OFFSET_PIXELS,
	contrast: 1,
	saturation: 1,
	width: WIDTH,
	height: HEIGHT,
	scanline: { period: 4, axis: { x: 0, y: 1 }, dark: 1, sharpness: 1, bleed: 0 },
}

function config(overrides: Partial<CrtCompositeConfig>): CrtCompositeConfig {
	return { ...BASE, ...overrides }
}

function flat_sampler(value: number): (uv: { x: number; y: number }) => BarrelRgb {
	return function sample(): BarrelRgb {
		return { r: value, g: value, b: value }
	}
}

const CENTRE = { x: 0.5, y: 0.5 }

// Lit only to the left of the screen centre, so a tap shifted left of centre reads 1 and any tap
// at or right of it reads 0 — which is what makes the chromatic separation observable.
function left_half_sampler(uv: { x: number; y: number }): BarrelRgb {
	const value = uv.x < CENTRE.x ? 1 : 0

	return { r: value, g: value, b: value }
}

describe('crt_composite.compose_crt_pixel', () => {
	// dark=1, bleed=0, contrast=1, saturation=1 makes every stage an identity, so whatever the
	// sampler returns has to survive the whole chain untouched.
	it('is an identity when the scanline, the bleed and the grading are all neutral', () => {
		const GREY = 0.4
		const out = crt_composite.compose_crt_pixel({
			sample: flat_sampler(GREY),
			uv: CENTRE,
			config: BASE,
		})

		expect(out.r).toBeCloseTo(GREY)
		expect(out.g).toBeCloseTo(GREY)
		expect(out.b).toBeCloseTo(GREY)
	})

	it('masks a sample the warp pushes outside [0, 1] to black before grading', () => {
		// A strong warp throws the corner out of bounds; contrast != 1 would lift pure black off
		// zero if the grading ran first, so the mask has to come first to keep the frame clean.
		const STRONG = 4
		const out = crt_composite.compose_crt_pixel({
			sample: flat_sampler(1),
			uv: { x: 0, y: 0 },
			config: config({ strength: STRONG, channel_offset: 0 }),
		})

		expect(out.r).toBeCloseTo(0)
		expect(out.g).toBeCloseTo(0)
		expect(out.b).toBeCloseTo(0)
	})

	it('grades AFTER the mask, so contrast lifts the masked frame exactly as the CSS filter did', () => {
		const STRONG = 4
		const CONTRAST = 0.5
		const out = crt_composite.compose_crt_pixel({
			sample: flat_sampler(1),
			uv: { x: 0, y: 0 },
			config: config({ strength: STRONG, channel_offset: 0, contrast: CONTRAST }),
		})

		// grade(0) = (0 - 0.5) * 0.5 + 0.5 = 0.25. Masking a graded sample would have given 0.
		expect(out.g).toBeCloseTo(0.25)
	})

	// The screen centre is the warp's fixed point, so v = 0.5 maps to pixel row 450. A period of 5
	// divides it exactly, putting the centre at phase 0 — the dark-band centre, where the scanline
	// factor equals dark.
	const DARK_BAND_PERIOD = 5

	it('darkens by the scanline factor at the dark-band centre', () => {
		const DARK = 0.2
		const GREY = 0.5
		const out = crt_composite.compose_crt_pixel({
			sample: flat_sampler(GREY),
			uv: CENTRE,
			config: config({
				scanline: { ...BASE.scanline, dark: DARK, period: DARK_BAND_PERIOD },
			}),
		})

		expect(out.g).toBeCloseTo(GREY * DARK)
	})

	it('bleeds the neighbouring bright bands into the dark gap', () => {
		const DARK = 0
		const BLEED = 0.5
		const out = crt_composite.compose_crt_pixel({
			sample: flat_sampler(1),
			uv: CENTRE,
			config: config({
				scanline: { ...BASE.scanline, dark: DARK, bleed: BLEED, period: DARK_BAND_PERIOD },
			}),
		})

		// dark=0 zeroes the direct sample; the two neighbours average to 1 and are scaled by bleed.
		expect(out.g).toBeCloseTo(BLEED)
	})

	it('takes each channel from its own horizontally shifted tap', () => {
		// With the R tap shifted left it sees the bright half while G and B, further right, do not.
		const out = crt_composite.compose_crt_pixel({
			sample: left_half_sampler,
			uv: CENTRE,
			config: BASE,
		})

		expect(out.r).toBeCloseTo(1)
		expect(out.g).toBeCloseTo(0)
		expect(out.b).toBeCloseTo(0)
	})

	it('applies no separation when the channel offset is zero', () => {
		const out = crt_composite.compose_crt_pixel({
			sample: left_half_sampler,
			uv: CENTRE,
			config: config({ channel_offset: 0 }),
		})

		expect(out.r).toBeCloseTo(0)
		expect(out.g).toBeCloseTo(0)
		expect(out.b).toBeCloseTo(0)
	})
})

describe('COMPOSITE_FRAGMENT_SHADER source', () => {
	it('is a single pass — one main(), no intermediate sampler', () => {
		const mains = (COMPOSITE_FRAGMENT_SHADER.match(/void main\(\)/gu) ?? []).length

		expect(mains).toBe(1)
		expect(COMPOSITE_FRAGMENT_SHADER).not.toContain('tDiffuse')
	})

	it('reads only the low-resolution texture, nine taps in total', () => {
		// 3 chromatic channels x (centre + two bleed neighbours). Every one of them samples the
		// stage-1 output directly; before #421 six of the seven taps read a full-resolution target.
		const CHANNELS = 3
		const TAPS_PER_CHANNEL = 3
		const channel_taps = (COMPOSITE_FRAGMENT_SHADER.match(/sample_channel\(/gu) ?? []).length

		expect(COMPOSITE_FRAGMENT_SHADER).toContain('uniform sampler2D u_lo_tex')
		expect(COMPOSITE_FRAGMENT_SHADER).toContain('scanline_color(u_lo_tex, sample_uv)')
		// One declaration plus one call per channel.
		expect(channel_taps).toBe(CHANNELS + 1)
		expect(COMPOSITE_FRAGMENT_SHADER.match(/texture2D\(\s*tex/gu) ?? []).toHaveLength(
			TAPS_PER_CHANNEL,
		)
	})

	it('composes warp -> mask -> scanline -> grade in that order', () => {
		expect(COMPOSITE_FRAGMENT_SHADER).toMatch(
			/vec2 sample_uv = warp_uv\(uv\);\s*float visible = in_bounds\(sample_uv\);/u,
		)
		expect(COMPOSITE_FRAGMENT_SHADER).toMatch(
			/grade\(scanline_color\(u_lo_tex, sample_uv\) \* visible\)/u,
		)
	})

	it('offsets the channel taps on the output coordinate, before the warp', () => {
		expect(COMPOSITE_FRAGMENT_SHADER).toMatch(/u_channel_offset\s*\/\s*max\(u_resolution\.x/u)
		expect(COMPOSITE_FRAGMENT_SHADER).toMatch(/sample_channel\(v_uv - vec2\(offset, 0\.0\)\)/u)
		expect(COMPOSITE_FRAGMENT_SHADER).toMatch(/sample_channel\(v_uv \+ vec2\(offset, 0\.0\)\)/u)
		expect(COMPOSITE_FRAGMENT_SHADER).toMatch(
			/gl_FragColor = vec4\(shifted_r\.r, centered_rgb\.g, shifted_b\.b, 1\.0\)/u,
		)
	})

	it('declares u_resolution once, shared by the scanline and the channel offset', () => {
		const declarations = (COMPOSITE_FRAGMENT_SHADER.match(/uniform vec2 u_resolution/gu) ?? [])
			.length

		expect(declarations).toBe(1)
	})
})
