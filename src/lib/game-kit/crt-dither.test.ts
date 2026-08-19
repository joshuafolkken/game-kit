import { ShaderMaterial, Vector2 } from 'three'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { describe, expect, it } from 'vitest'
import {
	BAYER_MATRIX,
	BAYER_SIZE,
	BLACK_FLOOR,
	COLOR_LEVELS,
	crt_dither,
	DITHER_FRAGMENT_SHADER,
	DITHER_VERTEX_SHADER,
	DOT_BLEND,
	DOT_BLEND_FRAGMENT_SHADER,
	DOTS_PER_SCANLINE,
	SCANLINE_BLEED,
	SCANLINE_BLEED_FULL_PERIOD,
	SCANLINE_DARK,
	SCANLINE_FRAGMENT_SHADER,
	SCANLINE_SHARPNESS,
	UPSCALE_FRAGMENT_SHADER,
} from './crt-dither'

const SQUARED_BAYER_SIZE = BAYER_SIZE * BAYER_SIZE
const MAX_BAYER_VALUE = SQUARED_BAYER_SIZE - 1

describe('crt-dither constants', () => {
	it('exposes BAYER_SIZE = 4 (4×4 ordered dither matrix)', () => {
		expect(BAYER_SIZE).toBe(4)
	})

	it('exposes COLOR_LEVELS = { r: 8, g: 8, b: 4 } (8×8×4 = 256 unique colors, VGA 3-3-2)', () => {
		const VGA_332_TOTAL_COLORS = 256

		expect(COLOR_LEVELS).toEqual({ r: 8, g: 8, b: 4 })
		expect(COLOR_LEVELS.r * COLOR_LEVELS.g * COLOR_LEVELS.b).toBe(VGA_332_TOTAL_COLORS)
	})

	it('exposes BLACK_FLOOR = 0.06 so dark pixels never collapse to pure black', () => {
		expect(BLACK_FLOOR).toBe(0.06)
	})

	it('exposes SCANLINE_DARK >= 0 (0 = fully black dark bands; glow comes from SCANLINE_BLEED)', () => {
		expect(SCANLINE_DARK).toBeGreaterThanOrEqual(0)
		expect(SCANLINE_DARK).toBeLessThan(1)
	})

	it('exposes SCANLINE_BLEED as a non-negative finite number (phosphor glow amount)', () => {
		expect(Number.isFinite(SCANLINE_BLEED)).toBe(true)
		expect(SCANLINE_BLEED).toBeGreaterThanOrEqual(0)
	})

	it('exposes SCANLINE_BLEED_FULL_PERIOD as a positive integer above the minimum period', () => {
		expect(Number.isSafeInteger(SCANLINE_BLEED_FULL_PERIOD)).toBe(true)
		// Must exceed the minimum possible period (DOTS_PER_SCANLINE * 2 = 2) so that
		// proportional scaling has a meaningful effect on small-viewport screens.
		expect(SCANLINE_BLEED_FULL_PERIOD).toBeGreaterThan(DOTS_PER_SCANLINE * 2)
	})

	it('exposes DOT_BLEND in [0, 1] (0 = sharp pixels, 1 = full neighbour blend)', () => {
		expect(Number.isFinite(DOT_BLEND)).toBe(true)
		expect(DOT_BLEND).toBeGreaterThanOrEqual(0)
		expect(DOT_BLEND).toBeLessThanOrEqual(1)
	})

	it('DOT_BLEND is pinned to 0.2 — toned-down dot bleed for sharper on-screen text', () => {
		// Reason: the range test above only catches obviously broken values; pin the
		// literal so future drift back toward the original 0.4 (more pronounced
		// phosphor smear) is surfaced as a regression.
		expect(DOT_BLEND).toBe(0.2)
	})

	it('exposes DOTS_PER_SCANLINE as a positive integer', () => {
		expect(Number.isSafeInteger(DOTS_PER_SCANLINE)).toBe(true)
		expect(DOTS_PER_SCANLINE).toBeGreaterThan(0)
	})

	it('exposes SCANLINE_SHARPNESS in the thin-scanline range (0.35–0.60 → ~15–25% dark duty cycle)', () => {
		// 0.45 ≈ 20% dark zone. Clamp catches accidental revert to 1.0 (50% thick bands)
		// or too-extreme values that make scanlines invisible.
		expect(SCANLINE_SHARPNESS).toBeGreaterThanOrEqual(0.35)
		expect(SCANLINE_SHARPNESS).toBeLessThanOrEqual(0.6)
	})
})

describe('crt_dither.compute_scanline_factor (cosine profile)', () => {
	const PERIOD = 2
	const HALF_PERIOD = PERIOD / 2
	const QUARTER_PERIOD = PERIOD / 4

	it('returns SCANLINE_DARK at the dark-band centre (phase = 0)', () => {
		// Cosine: wave = 0.5*(1-cos(0)) = 0 → factor = dark + 0*(1-dark) = dark
		expect(crt_dither.compute_scanline_factor(0, PERIOD, SCANLINE_DARK)).toBeCloseTo(
			SCANLINE_DARK,
			10,
		)
	})

	it('returns 1.0 at the light-band centre (phase = period/2)', () => {
		// Cosine: wave = 0.5*(1-cos(π)) = 1 → factor = dark + 1*(1-dark) = 1
		expect(crt_dither.compute_scanline_factor(HALF_PERIOD, PERIOD, SCANLINE_DARK)).toBeCloseTo(
			1,
			10,
		)
	})

	it('returns a smooth intermediate value at phase = period/4 (no hard step)', () => {
		// Hard-step would return SCANLINE_DARK here; cosine (sharpness=1) returns mid-value.
		const mid = SCANLINE_DARK + 0.5 * (1 - SCANLINE_DARK)

		expect(
			crt_dither.compute_scanline_factor(QUARTER_PERIOD, PERIOD, SCANLINE_DARK, 1),
		).toBeCloseTo(mid, 6)
	})

	it('sharpness < 1 makes mid-phase brighter than sharpness = 1 (thinner dark bands)', () => {
		const sharpness_1 = crt_dither.compute_scanline_factor(QUARTER_PERIOD, PERIOD, SCANLINE_DARK, 1)
		const sharpness_thin = crt_dither.compute_scanline_factor(
			QUARTER_PERIOD,
			PERIOD,
			SCANLINE_DARK,
			SCANLINE_SHARPNESS,
		)

		expect(sharpness_thin).toBeGreaterThan(sharpness_1)
	})

	it('sharpness = 1 produces the same result as no sharpness argument (backward-compatible)', () => {
		for (let coord = 0; coord <= PERIOD; coord += PERIOD / 8) {
			expect(crt_dither.compute_scanline_factor(coord, PERIOD, SCANLINE_DARK, 1)).toBeCloseTo(
				crt_dither.compute_scanline_factor(coord, PERIOD, SCANLINE_DARK),
				10,
			)
		}
	})

	it('always stays within [SCANLINE_DARK, 1.0] for all phases', () => {
		for (let t = 0; t <= PERIOD; t += PERIOD / 20) {
			const scanline_factor = crt_dither.compute_scanline_factor(t, PERIOD, SCANLINE_DARK)

			expect(scanline_factor).toBeGreaterThanOrEqual(SCANLINE_DARK - 1e-10)
			expect(scanline_factor).toBeLessThanOrEqual(1 + 1e-10)
		}
	})

	it('repeats every period units', () => {
		for (let index = 0; index < 5; index++) {
			const base = index * PERIOD

			expect(crt_dither.compute_scanline_factor(base, PERIOD, SCANLINE_DARK)).toBeCloseTo(
				SCANLINE_DARK,
				10,
			)
			expect(
				crt_dither.compute_scanline_factor(base + HALF_PERIOD, PERIOD, SCANLINE_DARK),
			).toBeCloseTo(1, 10)
		}
	})

	it('handles negative coordinates (positive-biased mod)', () => {
		expect(crt_dither.compute_scanline_factor(-PERIOD, PERIOD, SCANLINE_DARK)).toBeCloseTo(
			SCANLINE_DARK,
			10,
		)
		expect(
			crt_dither.compute_scanline_factor(-PERIOD + HALF_PERIOD, PERIOD, SCANLINE_DARK),
		).toBeCloseTo(1, 10)
	})
})

describe('BAYER_MATRIX', () => {
	it(`is a ${String(BAYER_SIZE)}×${String(BAYER_SIZE)} matrix`, () => {
		expect(BAYER_MATRIX).toHaveLength(BAYER_SIZE)

		for (const row of BAYER_MATRIX) {
			expect(row).toHaveLength(BAYER_SIZE)
		}
	})

	it(`contains every integer 0..${String(MAX_BAYER_VALUE)} exactly once (proper Bayer ordering)`, () => {
		const seen = new Set<number>()

		for (const row of BAYER_MATRIX) {
			for (const value of row) {
				expect(Number.isSafeInteger(value)).toBe(true)
				expect(value).toBeGreaterThanOrEqual(0)
				expect(value).toBeLessThan(SQUARED_BAYER_SIZE)
				seen.add(value)
			}
		}

		expect(seen.size).toBe(SQUARED_BAYER_SIZE)
	})
})

describe('crt_dither.quantize_with_dither_2d', () => {
	const MID_GREY = 0.5
	const VERY_DARK = 0
	// Low end of the normalized Bayer range (0 / SQUARED_BAYER_SIZE), mirroring BAYER_HIGH.
	const BAYER_LOW = 0
	const BAYER_HIGH = MAX_BAYER_VALUE / SQUARED_BAYER_SIZE

	it('always returns a value ≥ BLACK_FLOOR for every channel (never collapses to pure black)', () => {
		for (const levels of [COLOR_LEVELS.r, COLOR_LEVELS.g, COLOR_LEVELS.b]) {
			for (let bi = 0; bi < SQUARED_BAYER_SIZE; bi++) {
				const bayer = bi / SQUARED_BAYER_SIZE
				const out = crt_dither.quantize_with_dither_2d(VERY_DARK, bayer, levels, BLACK_FLOOR)

				expect(out).toBeGreaterThanOrEqual(BLACK_FLOOR)
			}
		}
	})

	it('never exceeds 1.0 on any channel', () => {
		for (const levels of [COLOR_LEVELS.r, COLOR_LEVELS.g, COLOR_LEVELS.b]) {
			for (let bi = 0; bi < SQUARED_BAYER_SIZE; bi++) {
				const bayer = bi / SQUARED_BAYER_SIZE
				const out = crt_dither.quantize_with_dither_2d(1, bayer, levels, BLACK_FLOOR)

				expect(out).toBeLessThanOrEqual(1)
			}
		}
	})

	it('produces DIFFERENT quantized outputs for the same channel value across the bayer range', () => {
		// This proves dithering is actually shifting pixels across quantization boundaries.
		const low = crt_dither.quantize_with_dither_2d(MID_GREY, BAYER_LOW, COLOR_LEVELS.r, BLACK_FLOOR)
		const high = crt_dither.quantize_with_dither_2d(
			MID_GREY,
			BAYER_HIGH,
			COLOR_LEVELS.r,
			BLACK_FLOOR,
		)

		expect(low).not.toBe(high)
	})

	it('lands on one of N quantization steps for bright inputs (above the black floor)', () => {
		const BRIGHT_INPUT = 0.7

		for (const levels of [COLOR_LEVELS.r, COLOR_LEVELS.g, COLOR_LEVELS.b]) {
			const out = crt_dither.quantize_with_dither_2d(BRIGHT_INPUT, BAYER_HIGH, levels, BLACK_FLOOR)
			const step = 1 / (levels - 1)
			const nearest_step = Math.round(out / step) * step

			expect(Math.abs(out - nearest_step)).toBeLessThan(1e-6)
		}
	})

	it('R and G produce equal cardinality and B produces fewer (VGA 3-3-2 asymmetric quantization)', () => {
		// VGA 3-3-2 gives blue half the levels of red/green (8/8/4). Lock in that asymmetry
		// here so any accidental return to uniform per-channel levels (e.g. { r: 16, g: 16, b: 16 })
		// fails this guard at the COLOR_LEVELS change point.
		// eslint-disable-next-line unicorn/consistent-function-scoping -- test helper scoped to this assertion block for clarity
		function distinct_outputs(levels: number): number {
			const seen = new Set<number>()

			for (let level = 0; level <= 100; level++) {
				const channel = level / 100
				const out = crt_dither.quantize_with_dither_2d(channel, BAYER_HIGH, levels, BLACK_FLOOR)

				seen.add(Math.round(out * 1000))
			}

			return seen.size
		}

		const red = distinct_outputs(COLOR_LEVELS.r)
		const green = distinct_outputs(COLOR_LEVELS.g)
		const blue = distinct_outputs(COLOR_LEVELS.b)

		expect(green).toBe(red)
		expect(blue).toBeLessThan(red)
	})
})

describe('crt_dither.create_bayer_texture', () => {
	it(`returns a DataTexture sized ${String(BAYER_SIZE)}×${String(BAYER_SIZE)} with non-zero data`, () => {
		const tex = crt_dither.create_bayer_texture()

		expect(tex.image.width).toBe(BAYER_SIZE)
		expect(tex.image.height).toBe(BAYER_SIZE)
		const data = tex.image.data as Float32Array

		expect(data).toHaveLength(SQUARED_BAYER_SIZE)
		expect(data.some((value) => value > 0)).toBe(true)
		tex.dispose()
	})

	it(`stores normalized values in [0, 1) matching BAYER_MATRIX / ${String(SQUARED_BAYER_SIZE)}`, () => {
		const tex = crt_dither.create_bayer_texture()
		const data = tex.image.data as Float32Array

		for (const [y, row] of BAYER_MATRIX.entries()) {
			for (const [x, source] of row.entries()) {
				const expected = source / SQUARED_BAYER_SIZE

				expect(data[y * BAYER_SIZE + x]).toBeCloseTo(expected, 6)
			}
		}

		tex.dispose()
	})
})

describe('DITHER shader sources', () => {
	it('vertex shader exposes v_uv and computes gl_Position', () => {
		expect(DITHER_VERTEX_SHADER).toMatch(/varying\s+vec2\s+v_uv/u)
		expect(DITHER_VERTEX_SHADER).toMatch(/gl_Position\s*=/u)
	})

	it('fragment shader declares every required uniform', () => {
		for (const uniform of [
			'tDiffuse',
			'u_bayer',
			'u_resolution',
			'u_color_levels',
			'u_black_floor',
			'u_bayer_size',
		]) {
			expect(DITHER_FRAGMENT_SHADER).toContain(uniform)
		}
	})

	it('dither shader does NOT contain scanline uniforms (moved to SCANLINE_FRAGMENT_SHADER)', () => {
		// Scanlines now run at high resolution in their own pass so they appear as
		// smooth curves rather than chunky pixel blocks.
		expect(DITHER_FRAGMENT_SHADER).not.toContain('u_scanline_period')
		expect(DITHER_FRAGMENT_SHADER).not.toContain('u_scanline_axis')
		expect(DITHER_FRAGMENT_SHADER).not.toContain('u_scanline_dark')
	})

	it('fragment shader applies the dither offset BEFORE quantization', () => {
		const fragment = DITHER_FRAGMENT_SHADER
		const dither_offset_index = fragment.indexOf('vec3(threshold) * dither_step')
		const quantize_index = fragment.indexOf('floor(color * u_color_levels)')

		expect(dither_offset_index).toBeGreaterThan(-1)
		expect(quantize_index).toBeGreaterThan(-1)
		expect(dither_offset_index).toBeLessThan(quantize_index)
	})

	it('fragment shader enforces the black floor with max(..., u_black_floor)', () => {
		expect(DITHER_FRAGMENT_SHADER).toMatch(/max\(\s*quantized\s*,\s*vec3\(u_black_floor\)\s*\)/u)
	})

	it('fragment shader declares u_color_levels as vec3 (per-channel quantization)', () => {
		expect(DITHER_FRAGMENT_SHADER).toMatch(/uniform\s+vec3\s+u_color_levels/u)
	})
})

describe('crt_dither.blend_dot_neighbors (JS mirror of the dot-blend)', () => {
	// Fixture values are exact in binary floating point, so the expectations below are
	// hand-computable and free of rounding slack.
	const PIXELS = [
		[0, 0.5, 1],
		[0.25, 0.75, 0.5],
		[1, 0, 0.25],
	]
	const CENTER_X = 1
	const CENTER_Y = 1
	const CENTER_VALUE = 0.75
	// (2,1)=0.5 + (0,1)=0.25 + (1,2)=0 + (1,0)=0.5 = 1.25, averaged over 4 neighbours.
	const NEIGHBOR_AVERAGE = 0.3125

	function blend_center(blend: number): number {
		return crt_dither.blend_dot_neighbors({
			sample: crt_dither.create_clamped_sampler(PIXELS),
			x: CENTER_X,
			y: CENTER_Y,
			blend,
		})
	}

	it('averages the 4 axis-aligned neighbours (not the diagonals, not the centre)', () => {
		expect(blend_center(1)).toBeCloseTo(NEIGHBOR_AVERAGE, 10)
	})

	it('blend = 0 is the identity — the centre texel passes through untouched', () => {
		expect(blend_center(0)).toBeCloseTo(CENTER_VALUE, 10)
	})

	it('blend = 1 is a full 4-tap box blur — the centre is replaced by the neighbour average', () => {
		expect(blend_center(1)).toBeCloseTo(NEIGHBOR_AVERAGE, 10)
		expect(blend_center(1)).not.toBeCloseTo(CENTER_VALUE, 3)
	})

	it('weights the mix linearly, matching GLSL mix(center, neighbors, blend)', () => {
		for (const blend of [0.2, 0.25, 0.5, 0.8]) {
			const expected = CENTER_VALUE + (NEIGHBOR_AVERAGE - CENTER_VALUE) * blend

			expect(blend_center(blend)).toBeCloseTo(expected, 10)
		}
	})

	it(`leaves a flat image untouched at DOT_BLEND = ${String(DOT_BLEND)} (blending cannot invent contrast)`, () => {
		const FLAT_VALUE = 0.4
		const flat = [
			[FLAT_VALUE, FLAT_VALUE, FLAT_VALUE],
			[FLAT_VALUE, FLAT_VALUE, FLAT_VALUE],
			[FLAT_VALUE, FLAT_VALUE, FLAT_VALUE],
		]
		const out = crt_dither.blend_dot_neighbors({
			sample: crt_dither.create_clamped_sampler(flat),
			x: CENTER_X,
			y: CENTER_Y,
			blend: DOT_BLEND,
		})

		expect(out).toBeCloseTo(FLAT_VALUE, 10)
	})

	it('saturates at the border like GL_CLAMP_TO_EDGE (off-image taps re-read the edge texel)', () => {
		// Corner (0,0): the left and top taps fall outside and clamp back onto (0,0)=0,
		// so the neighbour average is (0.5 + 0 + 0.25 + 0) / 4.
		const CORNER_NEIGHBOR_AVERAGE = 0.1875
		const out = crt_dither.blend_dot_neighbors({
			sample: crt_dither.create_clamped_sampler(PIXELS),
			x: 0,
			y: 0,
			blend: 1,
		})

		expect(out).toBeCloseTo(CORNER_NEIGHBOR_AVERAGE, 10)
	})
})

describe('DOT_BLEND shader source', () => {
	it('reads tDiffuse — it runs inside the low-res composer chain, not as an injection', () => {
		expect(DOT_BLEND_FRAGMENT_SHADER).toContain('tDiffuse')
		expect(DOT_BLEND_FRAGMENT_SHADER).not.toContain('u_lo_tex')
	})

	it('declares u_lo_resolution and u_dot_blend for the dot-blend effect', () => {
		expect(DOT_BLEND_FRAGMENT_SHADER).toContain('u_lo_resolution')
		expect(DOT_BLEND_FRAGMENT_SHADER).toContain('u_dot_blend')
	})

	it('samples all 4 axis-aligned neighbours for the dot-blend', () => {
		// 1 center + 4 neighbours = at least 5 texture2D calls
		const sample_count = (DOT_BLEND_FRAGMENT_SHADER.match(/texture2D\(\s*tDiffuse/gu) ?? []).length

		expect(sample_count).toBeGreaterThanOrEqual(5)
	})

	it('offsets the taps by exactly one low-res texel', () => {
		expect(DOT_BLEND_FRAGMENT_SHADER).toMatch(/vec2\s+texel\s*=\s*1\.0\s*\/\s*u_lo_resolution/u)
	})

	it('mixes center with neighbour average using u_dot_blend', () => {
		expect(DOT_BLEND_FRAGMENT_SHADER).toMatch(
			/mix\(\s*center\s*,\s*neighbors\s*,\s*u_dot_blend\s*\)/u,
		)
	})
})

describe('UPSCALE shader source', () => {
	it('uses u_lo_tex (not tDiffuse) so ShaderPass does not override the injection', () => {
		expect(UPSCALE_FRAGMENT_SHADER).toContain('u_lo_tex')
		expect(UPSCALE_FRAGMENT_SHADER).not.toContain('tDiffuse')
	})

	it('is a single tap — the 4 neighbour taps moved to the low-res stage (#420)', () => {
		const sample_count = (UPSCALE_FRAGMENT_SHADER.match(/texture2D\(/gu) ?? []).length

		expect(sample_count).toBe(1)
	})

	it('no longer declares the dot-blend uniforms', () => {
		expect(UPSCALE_FRAGMENT_SHADER).not.toContain('u_dot_blend')
		expect(UPSCALE_FRAGMENT_SHADER).not.toContain('u_lo_resolution')
	})
})

describe('SCANLINE shader source', () => {
	it('declares every required uniform', () => {
		for (const uniform of [
			'tDiffuse',
			'u_resolution',
			'u_scanline_period',
			'u_scanline_axis',
			'u_scanline_dark',
		]) {
			expect(SCANLINE_FRAGMENT_SHADER).toContain(uniform)
		}
	})

	it('projects pixel coordinate onto u_scanline_axis (portrait/landscape flip)', () => {
		expect(SCANLINE_FRAGMENT_SHADER).toMatch(/dot\(\s*pixel\s*,\s*u_scanline_axis\s*\)/u)
	})

	it('applies smooth cosine profile (no hard step — eliminates moiré with pixel-art grid)', () => {
		expect(SCANLINE_FRAGMENT_SHADER).toContain('cos(')
		expect(SCANLINE_FRAGMENT_SHADER).not.toContain('step(')
		expect(SCANLINE_FRAGMENT_SHADER).toMatch(/mix\(\s*u_scanline_dark\s*,\s*1\.0\s*,\s*wave\s*\)/u)
	})

	it('declares u_scanline_sharpness uniform and applies pow() to the cosine wave', () => {
		expect(SCANLINE_FRAGMENT_SHADER).toContain('u_scanline_sharpness')
		expect(SCANLINE_FRAGMENT_SHADER).toMatch(/pow\(\s*wave_cos\s*,\s*u_scanline_sharpness\s*\)/u)
	})

	it('declares u_bleed and samples neighbors at ±half_period for phosphor glow', () => {
		expect(SCANLINE_FRAGMENT_SHADER).toContain('u_bleed')
		// Two neighbor samples offset along the scanline axis
		const samples = (SCANLINE_FRAGMENT_SHADER.match(/texture2D\(\s*tDiffuse/gu) ?? []).length

		expect(samples).toBeGreaterThanOrEqual(3)
		// Bleed attenuates with (1 - wave) so dark bands get max glow, bright bands get none
		expect(SCANLINE_FRAGMENT_SHADER).toMatch(/\(\s*1\.0\s*-\s*wave\s*\)/u)
		expect(SCANLINE_FRAGMENT_SHADER).toContain('half_period_uv')
	})
})

// Regression: locks in the ShaderPass uniform-binding behavior that
// <CrtDitherPass /> relies on. Passing a plain shader object to ShaderPass deep-clones
// the uniforms (Vector2/Vector3/Texture .clone()), which previously stranded
// u_resolution at its (1,1) seed — the bayer texture only ever sampled cell (0,0),
// hiding the dither pattern AND crushing dark pixels toward BLACK_FLOOR. Wrapping the
// uniforms in a ShaderMaterial keeps the reference live.
describe('ShaderPass uniform binding (CrtDitherPass regression)', () => {
	const TRIVIAL_VERTEX_SHADER = 'void main(){ gl_Position = vec4(position, 1.0); }'
	const TRIVIAL_FRAGMENT_SHADER = 'void main(){ gl_FragColor = vec4(1.0); }'

	// eslint-disable-next-line unicorn/consistent-function-scoping -- test helper scoped to the ShaderPass describe block
	function get_uniform_slot(pass: ShaderPass): { value: unknown } | undefined {
		// Three.js `uniforms` is an index signature; TS4111 (noPropertyAccessFromIndexSignature)
		// requires bracket access, which conflicts with the `dot-notation` lint rule.
		// eslint-disable-next-line dot-notation -- index-signature access mandated by TS4111
		return pass.uniforms['u_res']
	}

	function get_uniform_vec2(pass: ShaderPass): Vector2 {
		const slot = get_uniform_slot(pass)
		if (!slot) throw new Error('u_res uniform missing on pass')

		return slot.value as Vector2
	}

	it('plain-object form deep-clones uniforms — the bug pattern', () => {
		const local = { u_res: { value: new Vector2(1, 1) } }
		const pass = new ShaderPass({
			uniforms: local,
			vertexShader: TRIVIAL_VERTEX_SHADER,
			fragmentShader: TRIVIAL_FRAGMENT_SHADER,
		})

		expect(get_uniform_slot(pass)).not.toBe(local.u_res)
		expect(get_uniform_vec2(pass)).not.toBe(local.u_res.value)
		const NEW_WIDTH = 320
		const NEW_HEIGHT = 240

		local.u_res.value.set(NEW_WIDTH, NEW_HEIGHT)
		const cloned = get_uniform_vec2(pass)

		expect(cloned.x).toBe(1)
		expect(cloned.y).toBe(1)
	})

	it('ShaderMaterial form keeps uniform references live — the fix pattern', () => {
		const local = { u_res: { value: new Vector2(1, 1) } }
		const material = new ShaderMaterial({
			uniforms: local,
			vertexShader: TRIVIAL_VERTEX_SHADER,
			fragmentShader: TRIVIAL_FRAGMENT_SHADER,
		})
		const pass = new ShaderPass(material)

		expect(get_uniform_slot(pass)).toBe(local.u_res)
		expect(get_uniform_vec2(pass)).toBe(local.u_res.value)
		const NEW_WIDTH = 320
		const NEW_HEIGHT = 240

		local.u_res.value.set(NEW_WIDTH, NEW_HEIGHT)
		const live = get_uniform_vec2(pass)

		expect(live.x).toBe(NEW_WIDTH)
		expect(live.y).toBe(NEW_HEIGHT)
	})
})
