import { describe, expect, it } from 'vitest'
import {
	BARREL_FUNCTIONS_GLSL,
	BARREL_STRENGTH,
	BARREL_UNIFORMS_GLSL,
	CHANNEL_OFFSET_PIXELS,
	crt_barrel,
	CRT_CONTRAST,
	CRT_SATURATION,
	type BarrelUv,
} from './crt-barrel'

const NEUTRAL_CONTRAST = 1
const NEUTRAL_SATURATION = 1
const MID_GREY = 0.5
const FULL_WIDTH = 1000

const CENTER_X = 0.5
const CENTER_Y = 0.5
const SQUARE_ASPECT = 1
const WIDE_ASPECT = 16 / 9

function distance_from_center(x: number, y: number): number {
	const dx = x - CENTER_X
	const dy = y - CENTER_Y

	return Math.hypot(dx, dy)
}

describe('crt-barrel constants', () => {
	it('exposes BARREL_STRENGTH as a positive finite number (real CRT-class curvature)', () => {
		expect(Number.isFinite(BARREL_STRENGTH)).toBe(true)
		expect(BARREL_STRENGTH).toBeGreaterThan(0)
	})

	it('BARREL_STRENGTH stays within a sane CRT range (<=1) so corners do not collapse', () => {
		// At strength > 1 the warp factor 1 + s * r2 grows fast enough that the corner UV
		// samples land deep outside [0,1] and the entire screen edge clips to black.
		expect(BARREL_STRENGTH).toBeLessThanOrEqual(1)
	})

	it('BARREL_STRENGTH is pinned to 0.1 — toned-down curvature for sharper on-screen text', () => {
		// Reason: the range tests above only catch obviously broken values; pin the
		// literal so future drift back toward the original 0.15 (more visible curve)
		// is surfaced as a regression.
		expect(BARREL_STRENGTH).toBe(0.1)
	})
})

describe('crt_barrel.apply_barrel_uv', () => {
	it('leaves the center UV (0.5, 0.5) unchanged for every strength and aspect', () => {
		for (const strength of [0, 0.1, BARREL_STRENGTH, 0.5]) {
			for (const aspect of [SQUARE_ASPECT, WIDE_ASPECT, 9 / 16]) {
				const out = crt_barrel.apply_barrel_uv({ x: CENTER_X, y: CENTER_Y }, strength, aspect)

				expect(out.x).toBeCloseTo(CENTER_X, 10)
				expect(out.y).toBeCloseTo(CENTER_Y, 10)
			}
		}
	})

	it('is the identity transform when strength = 0 (no curvature)', () => {
		const samples: ReadonlyArray<BarrelUv> = [
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			{ x: 0.25, y: 0.75 },
			{ x: 0.1, y: 0.9 },
		]

		for (const uv of samples) {
			const out = crt_barrel.apply_barrel_uv(uv, 0, SQUARE_ASPECT)

			expect(out.x).toBeCloseTo(uv.x, 10)
			expect(out.y).toBeCloseTo(uv.y, 10)
		}
	})

	it('pushes off-center UVs OUTWARD (distance from center grows) when strength > 0', () => {
		const off_center_samples: ReadonlyArray<BarrelUv> = [
			{ x: 0, y: 0.5 },
			{ x: 1, y: 0.5 },
			{ x: 0.5, y: 0 },
			{ x: 0.5, y: 1 },
			{ x: 0.2, y: 0.2 },
			{ x: 0.8, y: 0.8 },
		]

		for (const uv of off_center_samples) {
			const before = distance_from_center(uv.x, uv.y)
			const after_uv = crt_barrel.apply_barrel_uv(uv, BARREL_STRENGTH, SQUARE_ASPECT)
			const after = distance_from_center(after_uv.x, after_uv.y)

			expect(after).toBeGreaterThan(before)
		}
	})

	it('is symmetric about the center: warp(uv) and warp(1-uv) mirror across (0.5, 0.5)', () => {
		const samples: ReadonlyArray<BarrelUv> = [
			{ x: 0.2, y: 0.3 },
			{ x: 0.1, y: 0.4 },
			{ x: 0.25, y: 0.6 },
		]

		for (const uv of samples) {
			const forward = crt_barrel.apply_barrel_uv(uv, BARREL_STRENGTH, SQUARE_ASPECT)
			const opposite = crt_barrel.apply_barrel_uv(
				{ x: 1 - uv.x, y: 1 - uv.y },
				BARREL_STRENGTH,
				SQUARE_ASPECT,
			)

			expect(opposite.x).toBeCloseTo(1 - forward.x, 10)
			expect(opposite.y).toBeCloseTo(1 - forward.y, 10)
		}
	})

	it('preserves radial direction: warped vector is parallel to the original (square viewport)', () => {
		// On a square viewport (aspect=1) the warp is purely radial — the angular component
		// of the centered UV must not rotate. We check cross-product magnitude ~ 0.
		const samples: ReadonlyArray<BarrelUv> = [
			{ x: 0.2, y: 0.3 },
			{ x: 0.8, y: 0.1 },
			{ x: 0.6, y: 0.9 },
		]

		for (const uv of samples) {
			const out = crt_barrel.apply_barrel_uv(uv, BARREL_STRENGTH, SQUARE_ASPECT)
			const in_dx = uv.x - CENTER_X
			const in_dy = uv.y - CENTER_Y
			const out_dx = out.x - CENTER_X
			const out_dy = out.y - CENTER_Y
			const cross = in_dx * out_dy - in_dy * out_dx

			expect(Math.abs(cross)).toBeLessThan(1e-10)
		}
	})

	it('warps more aggressively at wider aspects (horizontal corners on a 16:9 screen)', () => {
		// At aspect=1.78 the centered_x is multiplied by 1.78 before r2 is computed, so the
		// effective r2 at horizontal corners grows ~aspect² — the warp factor should be larger.
		const corner: BarrelUv = { x: 0, y: CENTER_Y }
		const square_out = crt_barrel.apply_barrel_uv(corner, BARREL_STRENGTH, SQUARE_ASPECT)
		const wide_out = crt_barrel.apply_barrel_uv(corner, BARREL_STRENGTH, WIDE_ASPECT)
		const square_dx = Math.abs(square_out.x - corner.x)
		const wide_dx = Math.abs(wide_out.x - corner.x)

		expect(wide_dx).toBeGreaterThan(square_dx)
	})
})

describe('BARREL GLSL chunks', () => {
	it('declares the uniforms the warp and the grading read', () => {
		for (const uniform of [
			'u_strength',
			'u_aspect',
			'u_channel_offset',
			'u_contrast',
			'u_saturation',
		]) {
			expect(BARREL_UNIFORMS_GLSL).toContain(uniform)
		}
	})

	// tDiffuse and u_resolution belong to the consumer since #421: the merged stage-2 shader owns
	// the sampler and the resolution, and this chunk only contributes functions over them.
	it('leaves the sampler and the resolution to the shader that composes it', () => {
		expect(BARREL_UNIFORMS_GLSL).not.toContain('tDiffuse')
		expect(BARREL_UNIFORMS_GLSL).not.toContain('u_resolution')
	})

	it('exposes warp, mask and grade as separate functions rather than a finished pass', () => {
		expect(BARREL_FUNCTIONS_GLSL).toMatch(/vec2\s+warp_uv\(vec2 uv\)/u)
		expect(BARREL_FUNCTIONS_GLSL).toMatch(/float\s+in_bounds\(vec2 sample_uv\)/u)
		expect(BARREL_FUNCTIONS_GLSL).toMatch(/vec3\s+grade\(vec3 color\)/u)
		expect(BARREL_FUNCTIONS_GLSL).not.toContain('void main')
	})

	it('uses the Filter Effects luminance weights for saturation', () => {
		expect(BARREL_FUNCTIONS_GLSL).toMatch(/dot\(contrasted, vec3\(0\.213, 0\.715, 0\.072\)\)/u)
	})

	it('applies aspect correction (centered.x *= u_aspect ... centered.x /= u_aspect)', () => {
		expect(BARREL_FUNCTIONS_GLSL).toMatch(/centered\.x\s*\*=\s*u_aspect/u)
		expect(BARREL_FUNCTIONS_GLSL).toMatch(/centered\.x\s*\/=\s*u_aspect/u)
	})

	it('masks out-of-bounds samples to black (visible-mask multiply, branchless)', () => {
		// Out-of-bounds CLAMP_TO_EDGE sampling would smear the edge color across the rectangle
		// background — the consumer multiplies those texels by 0 so the frame stays clean.
		expect(BARREL_FUNCTIONS_GLSL).toContain('step(vec2(0.0), sample_uv)')
		expect(BARREL_FUNCTIONS_GLSL).toContain('step(sample_uv, vec2(1.0))')
	})

	it('applies a quadratic warp (1.0 + u_strength * r2)', () => {
		expect(BARREL_FUNCTIONS_GLSL).toMatch(/1\.0\s*\+\s*u_strength\s*\*\s*r2/u)
	})
})

describe('crt-barrel grading constants', () => {
	it('pins the grading that moved out of the CSS filter chain (#419)', () => {
		// These were `contrast(0.95) saturate(1.2)` on the canvas. The chain's `brightness(1)` was
		// a no-op and has no shader counterpart. Pinned so silent drift is caught here now that
		// GameScene no longer carries the values.
		expect(CRT_CONTRAST).toBe(0.95)
		expect(CRT_SATURATION).toBe(1.2)
	})

	it('pins the channel offset to the 3 CSS px the SVG feOffset used', () => {
		expect(CHANNEL_OFFSET_PIXELS).toBe(3)
	})
})

describe('crt_barrel.apply_grade', () => {
	it('is the identity at neutral contrast and saturation', () => {
		const color = { r: 0.2, g: 0.6, b: 0.9 }
		const out = crt_barrel.apply_grade(color, NEUTRAL_CONTRAST, NEUTRAL_SATURATION)

		expect(out.r).toBeCloseTo(color.r, 10)
		expect(out.g).toBeCloseTo(color.g, 10)
		expect(out.b).toBeCloseTo(color.b, 10)
	})

	it('leaves mid-grey untouched — contrast pivots around 0.5', () => {
		const out = crt_barrel.apply_grade(
			{ r: MID_GREY, g: MID_GREY, b: MID_GREY },
			CRT_CONTRAST,
			CRT_SATURATION,
		)

		expect(out.r).toBeCloseTo(MID_GREY, 10)
		expect(out.g).toBeCloseTo(MID_GREY, 10)
		expect(out.b).toBeCloseTo(MID_GREY, 10)
	})

	it('lifts pure black exactly as the CSS contrast() function did', () => {
		// (0 - 0.5) * 0.95 + 0.5 = 0.025. This is why grading has to run after the barrel mask:
		// the browser graded the finished canvas, so the masked frame was never pure black.
		const out = crt_barrel.apply_grade({ r: 0, g: 0, b: 0 }, CRT_CONTRAST, NEUTRAL_SATURATION)

		expect(out.r).toBeCloseTo(0.025, 10)
		expect(out.g).toBeCloseTo(0.025, 10)
		expect(out.b).toBeCloseTo(0.025, 10)
	})

	it('collapses every channel to the same luminance at saturation 0', () => {
		const out = crt_barrel.apply_grade({ r: 0.9, g: 0.2, b: 0.4 }, NEUTRAL_CONTRAST, 0)

		expect(out.g).toBeCloseTo(out.r, 10)
		expect(out.b).toBeCloseTo(out.r, 10)
	})

	it('uses the Filter Effects luminance weights, so green dominates the grey it collapses to', () => {
		const from_green = crt_barrel.apply_grade({ r: 0, g: 1, b: 0 }, NEUTRAL_CONTRAST, 0)
		const from_red = crt_barrel.apply_grade({ r: 1, g: 0, b: 0 }, NEUTRAL_CONTRAST, 0)
		const from_blue = crt_barrel.apply_grade({ r: 0, g: 0, b: 1 }, NEUTRAL_CONTRAST, 0)

		expect(from_green.r).toBeCloseTo(0.715, 10)
		expect(from_red.r).toBeCloseTo(0.213, 10)
		expect(from_blue.r).toBeCloseTo(0.072, 10)
	})

	it('pushes saturation above 1 away from grey without moving the grey point', () => {
		const color = { r: 0.6, g: 0.5, b: 0.4 }
		const out = crt_barrel.apply_grade(color, NEUTRAL_CONTRAST, CRT_SATURATION)

		expect(out.r).toBeGreaterThan(color.r)
		expect(out.b).toBeLessThan(color.b)
	})
})

describe('crt_barrel.offset_channel_uvs', () => {
	it('separates R and B by one offset each, in opposite directions, leaving G centred', () => {
		const [red, green, blue] = crt_barrel.offset_channel_uvs(
			{ x: 0.5, y: 0.5 },
			CHANNEL_OFFSET_PIXELS,
			FULL_WIDTH,
		)
		const offset = CHANNEL_OFFSET_PIXELS / FULL_WIDTH

		expect(red?.x).toBeCloseTo(0.5 - offset, 10)
		expect(green?.x).toBeCloseTo(0.5, 10)
		expect(blue?.x).toBeCloseTo(0.5 + offset, 10)
	})

	it('never moves the vertical coordinate — the aberration is horizontal only', () => {
		const uvs = crt_barrel.offset_channel_uvs({ x: 0.3, y: 0.7 }, CHANNEL_OFFSET_PIXELS, FULL_WIDTH)

		for (const uv of uvs) {
			expect(uv.y).toBeCloseTo(0.7, 10)
		}
	})

	it('collapses to a single point at zero offset — the identity case', () => {
		const uvs = crt_barrel.offset_channel_uvs({ x: 0.42, y: 0.24 }, 0, FULL_WIDTH)

		for (const uv of uvs) {
			expect(uv.x).toBeCloseTo(0.42, 10)
		}
	})

	it('treats a zero width as no offset rather than dividing by zero', () => {
		const uvs = crt_barrel.offset_channel_uvs({ x: 0.5, y: 0.5 }, CHANNEL_OFFSET_PIXELS, 0)

		for (const uv of uvs) {
			expect(Number.isFinite(uv.x)).toBe(true)
			expect(uv.x).toBeCloseTo(0.5, 10)
		}
	})

	it('narrows the fringe as the buffer widens — the offset is a fixed pixel count', () => {
		const [narrow_red] = crt_barrel.offset_channel_uvs(
			{ x: 0.5, y: 0.5 },
			CHANNEL_OFFSET_PIXELS,
			FULL_WIDTH * 2,
		)
		const [wide_red] = crt_barrel.offset_channel_uvs(
			{ x: 0.5, y: 0.5 },
			CHANNEL_OFFSET_PIXELS,
			FULL_WIDTH,
		)

		expect(0.5 - (narrow_red?.x ?? 0)).toBeLessThan(0.5 - (wide_red?.x ?? 0))
	})
})
