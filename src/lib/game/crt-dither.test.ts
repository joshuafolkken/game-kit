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
} from './crt-dither'

const SQUARED_BAYER_SIZE = BAYER_SIZE * BAYER_SIZE
const MAX_BAYER_VALUE = SQUARED_BAYER_SIZE - 1

describe('crt-dither constants', () => {
	it('exposes BAYER_SIZE = 4 (4×4 ordered dither matrix)', () => {
		expect(BAYER_SIZE).toBe(4)
	})

	it('exposes COLOR_LEVELS = { r: 16, g: 16, b: 16 } (16×16×16 = 4096 unique colors, 12-bit RGB)', () => {
		expect(COLOR_LEVELS).toEqual({ r: 16, g: 16, b: 16 })
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

	it('all three channels produce the same number of distinct outputs (uniform quantization)', () => {
		// COLOR_LEVELS is now uniform across R/G/B (was asymmetric 8/8/4). Sanity-check
		// that the dither math actually flows through with matching cardinality on every
		// channel — if we ever revert to asymmetric levels, this guards the change point.
		function distinct_outputs(levels: number): number {
			const seen = new Set<number>()
			for (let v = 0; v <= 100; v++) {
				const channel = v / 100
				const out = crt_dither.quantize_with_dither_2d(channel, BAYER_HIGH, levels, BLACK_FLOOR)
				seen.add(Math.round(out * 1000))
			}
			return seen.size
		}
		const red = distinct_outputs(COLOR_LEVELS.r)
		expect(distinct_outputs(COLOR_LEVELS.g)).toBe(red)
		expect(distinct_outputs(COLOR_LEVELS.b)).toBe(red)
	})
})

describe('crt_dither.create_bayer_texture', () => {
	it(`returns a DataTexture sized ${BAYER_SIZE}×${BAYER_SIZE} with non-zero data`, () => {
		const tex = crt_dither.create_bayer_texture()
		expect(tex.image.width).toBe(BAYER_SIZE)
		expect(tex.image.height).toBe(BAYER_SIZE)
		const data = tex.image.data as Float32Array
		expect(data).toHaveLength(SQUARED_BAYER_SIZE)
		expect(data.some((value) => value > 0)).toBe(true)
		tex.dispose()
	})

	it(`stores normalized values in [0, 1) matching BAYER_MATRIX / ${SQUARED_BAYER_SIZE}`, () => {
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

// Regression: locks in the ShaderPass uniform-binding behavior that
// <CrtDitherPass /> relies on. Passing a plain shader object to ShaderPass deep-clones
// the uniforms (Vector2/Vector3/Texture .clone()), which previously stranded
// u_resolution at its (1,1) seed — the bayer texture only ever sampled cell (0,0),
// hiding the dither pattern AND crushing dark pixels toward BLACK_FLOOR. Wrapping the
// uniforms in a ShaderMaterial keeps the reference live.
describe('ShaderPass uniform binding (CrtDitherPass regression)', () => {
	const TRIVIAL_VERTEX_SHADER = 'void main(){ gl_Position = vec4(position, 1.0); }'
	const TRIVIAL_FRAGMENT_SHADER = 'void main(){ gl_FragColor = vec4(1.0); }'

	function get_uniform_vec2(pass: ShaderPass): Vector2 {
		const slot = pass.uniforms['u_res']
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
		expect(pass.uniforms['u_res']).not.toBe(local.u_res)
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
		expect(pass.uniforms['u_res']).toBe(local.u_res)
		expect(get_uniform_vec2(pass)).toBe(local.u_res.value)
		const NEW_WIDTH = 320
		const NEW_HEIGHT = 240
		local.u_res.value.set(NEW_WIDTH, NEW_HEIGHT)
		const live = get_uniform_vec2(pass)
		expect(live.x).toBe(NEW_WIDTH)
		expect(live.y).toBe(NEW_HEIGHT)
	})
})
