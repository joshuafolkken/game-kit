import { describe, expect, it } from 'vitest'
import {
	BAYER_MATRIX,
	BAYER_SIZE,
	BLACK_FLOOR,
	COLOR_LEVELS,
	crt_dither,
	DITHER_FRAGMENT_SHADER,
	DITHER_VERTEX_SHADER,
} from './crt-dither'

const SQUARED_BAYER_SIZE = BAYER_SIZE * BAYER_SIZE
const MAX_BAYER_VALUE = SQUARED_BAYER_SIZE - 1

describe('crt-dither constants', () => {
	it('exposes BAYER_SIZE = 4 (4×4 ordered dither matrix)', () => {
		expect(BAYER_SIZE).toBe(4)
	})

	it('exposes COLOR_LEVELS = { r: 8, g: 8, b: 4 } (8×8×4 = 256 unique colors)', () => {
		expect(COLOR_LEVELS).toEqual({ r: 8, g: 8, b: 4 })
	})

	it('exposes BLACK_FLOOR = 0.06 so dark pixels never collapse to pure black', () => {
		expect(BLACK_FLOOR).toBe(0.06)
	})
})

describe('BAYER_MATRIX', () => {
	it(`is a ${BAYER_SIZE}×${BAYER_SIZE} matrix`, () => {
		expect(BAYER_MATRIX).toHaveLength(BAYER_SIZE)
		for (const row of BAYER_MATRIX) {
			expect(row).toHaveLength(BAYER_SIZE)
		}
	})

	it(`contains every integer 0..${MAX_BAYER_VALUE} exactly once (proper Bayer ordering)`, () => {
		const seen = new Set<number>()
		for (const row of BAYER_MATRIX) {
			for (const value of row) {
				expect(Number.isInteger(value)).toBe(true)
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
	const VERY_DARK = 0.0
	const BAYER_LOW = 0 / SQUARED_BAYER_SIZE
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

	it('blue channel (4 levels) produces fewer distinct outputs than red/green (8 levels)', () => {
		// Sanity: prove the per-channel asymmetry actually flows through the math.
		function distinct_outputs(levels: number): number {
			const seen = new Set<number>()
			for (let v = 0; v <= 100; v++) {
				const channel = v / 100
				const out = crt_dither.quantize_with_dither_2d(channel, BAYER_HIGH, levels, BLACK_FLOOR)
				seen.add(Math.round(out * 1000))
			}
			return seen.size
		}
		expect(distinct_outputs(COLOR_LEVELS.b)).toBeLessThan(distinct_outputs(COLOR_LEVELS.r))
	})
})

describe('crt_dither.create_bayer_texture', () => {
	it('returns a DataTexture sized 8×8 with non-zero data', () => {
		const tex = crt_dither.create_bayer_texture()
		expect(tex.image.width).toBe(BAYER_SIZE)
		expect(tex.image.height).toBe(BAYER_SIZE)
		const data = tex.image.data as Float32Array
		expect(data).toHaveLength(SQUARED_BAYER_SIZE)
		expect(data.some((value) => value > 0)).toBe(true)
		tex.dispose()
	})

	it('stores normalized values in [0, 1) matching BAYER_MATRIX / 64', () => {
		const tex = crt_dither.create_bayer_texture()
		const data = tex.image.data as Float32Array
		BAYER_MATRIX.forEach((row, y) => {
			row.forEach((source, x) => {
				const expected = source / SQUARED_BAYER_SIZE
				expect(data[y * BAYER_SIZE + x]).toBeCloseTo(expected, 6)
			})
		})
		tex.dispose()
	})
})

describe('DITHER shader sources', () => {
	it('vertex shader exposes v_uv and computes gl_Position', () => {
		expect(DITHER_VERTEX_SHADER).toMatch(/varying\s+vec2\s+v_uv/)
		expect(DITHER_VERTEX_SHADER).toMatch(/gl_Position\s*=/)
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

	it('fragment shader applies the dither offset BEFORE quantization', () => {
		const fragment = DITHER_FRAGMENT_SHADER
		const dither_offset_index = fragment.indexOf('vec3(threshold) * dither_step')
		const quantize_index = fragment.indexOf('floor(color * u_color_levels)')
		expect(dither_offset_index).toBeGreaterThan(-1)
		expect(quantize_index).toBeGreaterThan(-1)
		expect(dither_offset_index).toBeLessThan(quantize_index)
	})

	it('fragment shader enforces the black floor with max(..., u_black_floor)', () => {
		expect(DITHER_FRAGMENT_SHADER).toMatch(/max\(\s*quantized\s*,\s*vec3\(u_black_floor\)\s*\)/)
	})

	it('fragment shader declares u_color_levels as vec3 (per-channel quantization)', () => {
		expect(DITHER_FRAGMENT_SHADER).toMatch(/uniform\s+vec3\s+u_color_levels/)
	})
})
