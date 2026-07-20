import { describe, expect, it } from 'vitest'
import { camera_fov } from './camera-fov'

const BASE_FOV = 75
const HALF_DIVISOR = 2
const DEG_PER_RAD = 180 / Math.PI

// Horizontal FOV (degrees) for a given vertical FOV and aspect, per the Three.js frustum:
// hfov = 2 * atan(tan(vfov / 2) * aspect).
function horizontal_fov_deg(vertical_fov_deg: number, aspect: number): number {
	const vertical_half_tan = Math.tan(vertical_fov_deg / HALF_DIVISOR / DEG_PER_RAD)

	return Math.atan(vertical_half_tan * aspect) * HALF_DIVISOR * DEG_PER_RAD
}

describe('camera_fov.compute_vertical_fov', () => {
	it('returns the base FOV unchanged in landscape (aspect > 1)', () => {
		const WIDE_ASPECT = 16 / 9

		expect(camera_fov.compute_vertical_fov(BASE_FOV, WIDE_ASPECT)).toBe(BASE_FOV)
	})

	it('returns the base FOV unchanged at the square boundary (aspect = 1)', () => {
		expect(camera_fov.compute_vertical_fov(BASE_FOV, 1)).toBe(BASE_FOV)
	})

	it('widens the vertical FOV on portrait (aspect < 1)', () => {
		const PORTRAIT_ASPECT = 390 / 844

		expect(camera_fov.compute_vertical_fov(BASE_FOV, PORTRAIT_ASPECT)).toBeGreaterThan(BASE_FOV)
	})

	it('preserves the landscape horizontal FOV on a portrait viewport', () => {
		const PORTRAIT_ASPECT = 3 / 4
		// The design horizontal FOV equals the base FOV at aspect = 1 (hfov = vfov there).
		const design_horizontal_fov = horizontal_fov_deg(BASE_FOV, 1)
		const vertical_fov = camera_fov.compute_vertical_fov(BASE_FOV, PORTRAIT_ASPECT)

		expect(horizontal_fov_deg(vertical_fov, PORTRAIT_ASPECT)).toBeCloseTo(design_horizontal_fov, 6)
	})

	it('clamps the widened vertical FOV to the safe maximum for extreme portraits', () => {
		const EXTREME_ASPECT = 0.1

		expect(camera_fov.compute_vertical_fov(BASE_FOV, EXTREME_ASPECT)).toBe(
			camera_fov.MAX_VERTICAL_FOV_DEG,
		)
	})

	it('stays finite (never NaN) for a degenerate zero-width aspect', () => {
		const result = camera_fov.compute_vertical_fov(BASE_FOV, 0)

		expect(Number.isFinite(result)).toBe(true)
		expect(result).toBe(camera_fov.MAX_VERTICAL_FOV_DEG)
	})

	it('returns the base FOV for a NaN aspect (0x0 canvas at initial mount)', () => {
		expect(camera_fov.compute_vertical_fov(BASE_FOV, NaN)).toBe(BASE_FOV)
	})
})
