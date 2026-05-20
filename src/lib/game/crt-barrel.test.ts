import { describe, expect, it } from 'vitest'
import {
	BARREL_FRAGMENT_SHADER,
	BARREL_STRENGTH,
	BARREL_VERTEX_SHADER,
	crt_barrel,
	type BarrelUv,
} from './crt-barrel'

const CENTER_X = 0.5
const CENTER_Y = 0.5
const SQUARE_ASPECT = 1
const WIDE_ASPECT = 16 / 9

function distance_from_center(x: number, y: number): number {
	const dx = x - CENTER_X
	const dy = y - CENTER_Y
	return Math.sqrt(dx * dx + dy * dy)
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
			{ x: 0.0, y: 0.5 },
			{ x: 1.0, y: 0.5 },
			{ x: 0.5, y: 0.0 },
			{ x: 0.5, y: 1.0 },
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

describe('BARREL shader sources', () => {
	it('vertex shader exposes v_uv and computes gl_Position', () => {
		expect(BARREL_VERTEX_SHADER).toMatch(/varying\s+vec2\s+v_uv/)
		expect(BARREL_VERTEX_SHADER).toMatch(/gl_Position\s*=/)
	})

	it('fragment shader declares every required uniform', () => {
		for (const uniform of ['tDiffuse', 'u_strength', 'u_aspect']) {
			expect(BARREL_FRAGMENT_SHADER).toContain(uniform)
		}
	})

	it('fragment shader does NOT declare u_resolution (unused — would be dead per-frame work)', () => {
		// Regression: an earlier draft declared u_resolution and copied drawing-buffer
		// size into it every frame, but the shader's main() never read it. Removed to
		// avoid stranding a dead uniform and a wasted Vector2 copy per render.
		expect(BARREL_FRAGMENT_SHADER).not.toContain('u_resolution')
	})

	it('fragment shader applies aspect correction (centered.x *= u_aspect ... centered.x /= u_aspect)', () => {
		expect(BARREL_FRAGMENT_SHADER).toMatch(/centered\.x\s*\*=\s*u_aspect/)
		expect(BARREL_FRAGMENT_SHADER).toMatch(/centered\.x\s*\/=\s*u_aspect/)
	})

	it('fragment shader masks out-of-bounds samples to black (visible-mask multiply, branchless)', () => {
		// Out-of-bounds CLAMP_TO_EDGE sampling would smear the edge color across the rectangle
		// background — the visible mask multiplies those texels by 0 so the frame stays clean.
		expect(BARREL_FRAGMENT_SHADER).toContain('step(vec2(0.0), sample_uv)')
		expect(BARREL_FRAGMENT_SHADER).toContain('step(sample_uv, vec2(1.0))')
		expect(BARREL_FRAGMENT_SHADER).toMatch(/sampled\s*\*\s*visible/)
	})

	it('fragment shader applies a quadratic warp (1.0 + u_strength * r2)', () => {
		expect(BARREL_FRAGMENT_SHADER).toMatch(/1\.0\s*\+\s*u_strength\s*\*\s*r2/)
	})
})
